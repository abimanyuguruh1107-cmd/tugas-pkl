import { createHash, timingSafeEqual } from "node:crypto";
import mongoose, { type HydratedDocument } from "mongoose";
import { ApiError } from "../../lib/errors";
import {
  MeetingParticipant,
  type IMeetingParticipant,
} from "../../models/meeting-participant.model";
import { Meeting, type IMeeting } from "../../models/meeting.model";
import { meetingSettingsSchema } from "../../validators/meeting-settings.schema";

export interface RequestJoinInput {
  meetingId: string;
  /** Authenticated user requesting to join. */
  userId?: string;
  /** External guest requesting to join. */
  guestEmail?: string;
  passcode?: string;
}

export type JoinDecision = "admitted" | "waiting";

export interface RequestJoinResult {
  decision: JoinDecision;
  participant: IMeetingParticipant;
}

const JOINABLE_STATUSES: IMeeting["status"][] = ["scheduled", "live"];
const HOST_ROLES: IMeetingParticipant["role"][] = ["host", "co-host"];

function assertObjectId(value: string, label: string): void {
  if (!/^[a-f\d]{24}$/i.test(value) || !mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${label}`);
  }
}

async function loadMeeting(meetingId: string): Promise<IMeeting> {
  assertObjectId(meetingId, "meetingId");
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");
  return meeting;
}

function readSettings(meeting: IMeeting) {
  const parsed = meetingSettingsSchema.safeParse(meeting.settings ?? {});
  if (!parsed.success) {
    throw new ApiError(500, "Meeting settings are malformed");
  }
  return parsed.data;
}

/** Constant-time passcode comparison (hashing equalizes the lengths). */
function passcodeMatches(expected: string, provided: string | undefined): boolean {
  if (provided === undefined) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}

async function assertCanManageWaitingRoom(
  meeting: IMeeting,
  actorId: string,
): Promise<void> {
  assertObjectId(actorId, "actorId");
  if (meeting.hostId.toString() === actorId) return;

  const actor = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId: actorId,
  });
  if (!actor || !HOST_ROLES.includes(actor.role)) {
    throw ApiError.forbidden("Only the host or a co-host can manage the waiting room");
  }
}

/**
 * Decide what happens when someone asks to join: admitted straight away,
 * or placed in the waiting room until the host admits them.
 *
 * - Guests (external emails) are refused unless guest access is enabled.
 * - Anyone other than the host/co-hosts must supply the passcode when set.
 * - With the waiting room on, non-host participants are held as "waiting".
 */
export async function requestJoin(input: RequestJoinInput): Promise<RequestJoinResult> {
  const { meetingId, userId, guestEmail, passcode } = input;

  if ((!userId && !guestEmail) || (userId && guestEmail)) {
    throw ApiError.badRequest("Either userId or guestEmail must be provided, but not both");
  }
  if (userId) assertObjectId(userId, "userId");

  const meeting = await loadMeeting(meetingId);
  if (!JOINABLE_STATUSES.includes(meeting.status)) {
    throw ApiError.badRequest("Meeting is not open for joining");
  }
  const settings = readSettings(meeting);

  const normalizedEmail = guestEmail?.toLowerCase();
  let participant: HydratedDocument<IMeetingParticipant> | null =
    await MeetingParticipant.findOne(
      userId !== undefined
        ? { meetingId: meeting._id, userId }
        : { meetingId: meeting._id, guestEmail: String(normalizedEmail) },
    );

  const isHostSide =
    (userId !== undefined && meeting.hostId.toString() === userId) ||
    (participant !== null && HOST_ROLES.includes(participant.role));

  if (!isHostSide) {
    const isGuest = normalizedEmail !== undefined || participant?.role === "guest";
    if (isGuest && !settings.guestAccess) {
      throw ApiError.forbidden("Guest access is disabled for this meeting");
    }
    if (settings.passcode && !passcodeMatches(settings.passcode, passcode)) {
      throw ApiError.forbidden("Invalid meeting passcode");
    }
    if (participant?.invitationStatus === "declined") {
      throw ApiError.forbidden("The host has declined your request to join");
    }
  }

  const holdInWaitingRoom = settings.waitingRoom && !isHostSide;
  const nextStatus = holdInWaitingRoom ? "waiting" : "accepted";

  if (participant) {
    // Someone already admitted keeps their access when they reconnect.
    if (participant.invitationStatus !== "accepted") {
      participant.invitationStatus = nextStatus;
      await participant.save();
    }
  } else {
    // Not invited: signed-in users join as regular participants and
    // external emails join as guests (guest access was checked above).
    participant = await MeetingParticipant.create(
      userId !== undefined
        ? {
            meetingId: meeting._id,
            userId,
            role: "participant",
            invitationStatus: nextStatus,
          }
        : {
            meetingId: meeting._id,
            guestEmail: String(normalizedEmail),
            role: "guest",
            invitationStatus: nextStatus,
          },
    );
  }

  return {
    decision: participant.invitationStatus === "accepted" ? "admitted" : "waiting",
    participant,
  };
}

export async function listWaitingParticipants(
  meetingId: string,
  actorId: string,
): Promise<IMeetingParticipant[]> {
  const meeting = await loadMeeting(meetingId);
  await assertCanManageWaitingRoom(meeting, actorId);
  return MeetingParticipant.find({
    meetingId: meeting._id,
    invitationStatus: "waiting",
  }).sort({ createdAt: 1 });
}

async function resolveWaitingParticipant(
  meetingId: string,
  participantId: string,
  actorId: string,
): Promise<HydratedDocument<IMeetingParticipant>> {
  const meeting = await loadMeeting(meetingId);
  await assertCanManageWaitingRoom(meeting, actorId);
  assertObjectId(participantId, "participantId");

  const participant = await MeetingParticipant.findOne({
    _id: participantId,
    meetingId: meeting._id,
  });
  if (!participant) throw ApiError.notFound("Participant not found");
  if (participant.invitationStatus !== "waiting") {
    throw ApiError.conflict("Participant is not in the waiting room");
  }
  return participant;
}

export async function admitParticipant(
  meetingId: string,
  participantId: string,
  actorId: string,
): Promise<IMeetingParticipant> {
  const participant = await resolveWaitingParticipant(meetingId, participantId, actorId);
  participant.invitationStatus = "accepted";
  await participant.save();
  return participant;
}

export async function denyParticipant(
  meetingId: string,
  participantId: string,
  actorId: string,
): Promise<IMeetingParticipant> {
  const participant = await resolveWaitingParticipant(meetingId, participantId, actorId);
  participant.invitationStatus = "declined";
  await participant.save();
  return participant;
}
