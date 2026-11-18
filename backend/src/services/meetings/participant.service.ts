import { ApiError } from "../../lib/errors";
import {
  MeetingParticipant,
  type IMeetingParticipant,
} from "../../models/meeting-participant.model";
import { Meeting } from "../../models/meeting.model";
import { assertOrganizationPermission } from "./meeting-access.service";

type MeetingParticipantStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "waiting";

export async function listParticipants(
  organizationId: string,
  meetingId: string,
  userId: string,
): Promise<IMeetingParticipant[]> {
  await assertOrganizationPermission(organizationId, userId, "meetings:read");
  await ensureMeeting(organizationId, meetingId);
  return MeetingParticipant.find({ organizationId, meetingId })
    .sort({ createdAt: 1 })
    .lean<IMeetingParticipant[]>();
}

export async function addParticipant(input: {
  organizationId: string;
  meetingId: string;
  actorId: string;
  userId?: string;
  guestEmail?: string;
  role: IMeetingParticipant["role"];
}): Promise<IMeetingParticipant> {
  await assertOrganizationPermission(
    input.organizationId,
    input.actorId,
    "meeting_participants:invite",
  );
  await ensureMeeting(input.organizationId, input.meetingId);

  const hasUserId = input.userId !== undefined;
  const hasGuestEmail = input.guestEmail !== undefined;
  if (hasUserId === hasGuestEmail) {
    throw ApiError.badRequest(
      "Exactly one of userId or guestEmail must be provided",
    );
  }

  const guestEmail = input.guestEmail?.trim().toLowerCase();
  if (!input.userId && !guestEmail) {
    throw ApiError.badRequest("A valid userId or guestEmail is required");
  }
  const identityFilter = input.userId
    ? { userId: input.userId }
    : { guestEmail: guestEmail as string };
  const existing = await MeetingParticipant.findOne({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
    ...identityFilter,
  }).lean();
  if (existing) {
    throw ApiError.conflict("Participant is already invited to this meeting");
  }

  const participant = await MeetingParticipant.create({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(guestEmail ? { guestEmail } : {}),
    role: input.role,
    invitationStatus: "invited",
  });
  return participant.toObject() as IMeetingParticipant;
}

export async function updateParticipantStatus(
  organizationId: string,
  meetingId: string,
  participantId: string,
  status: MeetingParticipantStatus,
  actorId: string,
): Promise<IMeetingParticipant> {
  await assertOrganizationPermission(
    organizationId,
    actorId,
    "meeting_participants:manage",
  );
  const participant = await MeetingParticipant.findOneAndUpdate(
    { _id: participantId, organizationId, meetingId },
    {
      $set: {
        invitationStatus: status,
      },
    },
    { new: true, runValidators: true },
  ).lean<IMeetingParticipant>();
  if (!participant) throw ApiError.notFound("Meeting participant not found");
  return participant;
}

export async function removeParticipant(
  organizationId: string,
  meetingId: string,
  participantId: string,
  actorId: string,
): Promise<void> {
  await assertOrganizationPermission(
    organizationId,
    actorId,
    "meeting_participants:manage",
  );
  const result = await MeetingParticipant.deleteOne({
    _id: participantId,
    organizationId,
    meetingId,
  });
  if (result.deletedCount === 0) {
    throw ApiError.notFound("Meeting participant not found");
  }
}

async function ensureMeeting(
  organizationId: string,
  meetingId: string,
): Promise<void> {
  if (!(await Meeting.exists({ _id: meetingId, organizationId })))
    throw ApiError.notFound("Meeting not found");
}