import { RoomServiceClient } from "livekit-server-sdk";
import { env } from "../../config/env";
import { ApiError } from "../../lib/errors";
import { MeetingParticipant } from "../../models/meeting-participant.model";
import { Meeting } from "../../models/meeting.model";
import mongoose from "mongoose";
import { Membership } from "../../models/membership.model";
import { MeetingRoomState } from "../../models/meeting-room.model";
import { assertOrganizationPermission } from "../meetings/meeting-access.service";
import { Role } from "../../models/role.model";

const rooms = new RoomServiceClient(
  env.livekit.url,
  env.livekit.apiKey,
  env.livekit.apiSecret,
);
const roomName = (meetingId: string) => `meeting-${meetingId}`;
async function assertHostControlAccess(
  organizationId: string,
  meetingId: string,
  actorId: string,
): Promise<void> {
  if (
    !mongoose.isValidObjectId(organizationId) ||
    !mongoose.isValidObjectId(meetingId)
  )
    throw ApiError.badRequest("Invalid organization or meeting ID");
  const meeting = await Meeting.findOne({ _id: meetingId, organizationId })
    .select("hostId")
    .lean();
  if (!meeting) throw ApiError.notFound("Meeting not found");
  if (meeting.hostId.toString() === actorId) return;
  await assertOrganizationPermission(
    organizationId,
    actorId,
    "meeting_host:control",
  );
  const actorMembership = await Membership.findOne({
    organizationId,
    userId: actorId,
    status: "active",
  })
    .select("roleId")
    .lean();
  if (!actorMembership)
    throw ApiError.forbidden("Active organization membership required");
  const role = await Role.findOne({
    _id: actorMembership.roleId,
    organizationId,
  })
    .select("permissions")
    .lean();
  if (!role || !role.permissions.includes("meeting_host:control"))
    throw ApiError.forbidden("Meeting host control permission required");
}
export async function muteParticipantTrack(
  organizationId: string,
  meetingId: string,
  actorId: string,
  identity: string,
  trackSid: string,
  muted = true,
): Promise<void> {
  await assertHostControlAccess(organizationId, meetingId, actorId);
  if (!identity.trim() || !trackSid.trim())
    throw ApiError.badRequest("Participant identity and trackSid are required");
  const participant = await MeetingParticipant.findOne({
    organizationId,
    meetingId,
    identity,
    status: { $in: ["invited", "joined"] },
  })
    .select("_id")
    .lean();
  if (!participant) throw ApiError.notFound("Meeting participant not found");
  await rooms.mutePublishedTrack(
    roomName(meetingId),
    identity,
    trackSid,
    muted,
  );
}
export async function removeParticipant(
  organizationId: string,
  meetingId: string,
  actorId: string,
  identity: string,
): Promise<void> {
  await assertHostControlAccess(organizationId, meetingId, actorId);
  if (!identity.trim())
    throw ApiError.badRequest("Participant identity is required");
  const participant = await MeetingParticipant.findOne({
    organizationId,
    meetingId,
    identity,
    status: { $in: ["invited", "joined"] },
  })
    .select("_id")
    .lean();
  if (!participant) throw ApiError.notFound("Meeting participant not found");
  await rooms.removeParticipant(roomName(meetingId), identity);
  await MeetingParticipant.updateOne(
    { organizationId, meetingId, identity },
    { $set: { status: "removed", leftAt: new Date() } },
  );
}
export async function setRoomLocked(
  organizationId: string,
  meetingId: string,
  actorId: string,
  locked: boolean,
): Promise<void> {
  await assertHostControlAccess(organizationId, meetingId, actorId);
  const meeting = await Meeting.findOne({ _id: meetingId, organizationId })
    .select("hostId")
    .lean();
  if (!meeting) throw ApiError.notFound("Meeting not found");
  const meetingHostId = meeting.hostId.toString();
  await MeetingRoomState.findOneAndUpdate(
    { organizationId, meetingId },
    { $set: { locked, updatedBy: actorId } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  const [room] = await rooms.listRooms([roomName(meetingId)]);
  if (!room) return;
  const participants = await rooms.listParticipants(roomName(meetingId));
  for (const participant of participants) {
    const record = await MeetingParticipant.findOne({
      organizationId,
      meetingId,
      identity: participant.identity,
      status: { $in: ["invited", "joined"] },
    })
      .select("userId")
      .lean();
    const isHost = record?.userId?.toString() === meetingHostId;
    if (locked && !isHost) {
      await rooms.removeParticipant(roomName(meetingId), participant.identity, {
        revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
      });
      await MeetingParticipant.updateOne(
        { organizationId, meetingId, identity: participant.identity },
        { $set: { status: "removed", leftAt: new Date() } },
      );
      continue;
    }
    await rooms.updateParticipant(
      roomName(meetingId),
      participant.identity,
      undefined,
      {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    );
  }
}
