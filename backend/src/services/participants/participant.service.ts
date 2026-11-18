import { MeetingParticipant, type IMeetingParticipant } from "../../models/meeting-participant.model";
import { Meeting } from "../../models/meeting.model";
import { ApiError } from "../../lib/errors";

export interface CreateMeetingParticipantInput {
  meetingId: string;
  userId?: string;
  guestEmail?: string;
  role: "host" | "co-host" | "participant" | "guest";
}

export interface UpdateParticipantInput {
  role?: "host" | "co-host" | "participant" | "guest";
  invitationStatus?: "invited" | "accepted" | "declined" | "waiting";
}

export async function createMeetingParticipant(input: CreateMeetingParticipantInput): Promise<IMeetingParticipant> {
  const { meetingId, userId, guestEmail, role } = input;

  // Validate meeting exists
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");

  // Validate that either userId or guestEmail is provided (not both)
  if ((!userId && !guestEmail) || (userId && guestEmail)) {
    throw ApiError.badRequest("Either userId or guestEmail must be provided, but not both");
  }

  // Check for existing participant
  if (userId) {
    const existing = await MeetingParticipant.findOne({ meetingId, userId });
    if (existing) throw ApiError.conflict("User is already a participant in this meeting");
  }

  if (guestEmail) {
    const existing = await MeetingParticipant.findOne({ meetingId, guestEmail: guestEmail.toLowerCase() });
    if (existing) throw ApiError.conflict("Guest is already invited to this meeting");
  }

  const participant = await MeetingParticipant.create({
    meetingId,
    ...(userId !== undefined ? { userId } : {}),
    ...(guestEmail !== undefined ? { guestEmail: guestEmail.toLowerCase() } : {}),
    role,
    invitationStatus: "invited",
  });

  return participant;
}

export async function getMeetingParticipants(meetingId: string): Promise<IMeetingParticipant[]> {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");

  return MeetingParticipant.find({ meetingId }).sort({ createdAt: 1 });
}

export async function updateParticipant(participantId: string, input: UpdateParticipantInput): Promise<IMeetingParticipant> {
  const participant = await MeetingParticipant.findById(participantId);
  if (!participant) throw ApiError.notFound("Participant not found");

  if (input.role) participant.role = input.role;
  if (input.invitationStatus) participant.invitationStatus = input.invitationStatus;

  await participant.save();
  return participant;
}

export async function removeParticipant(participantId: string): Promise<void> {
  const participant = await MeetingParticipant.findById(participantId);
  if (!participant) throw ApiError.notFound("Participant not found");

  await participant.deleteOne();
}

export async function getParticipantById(participantId: string): Promise<IMeetingParticipant> {
  const participant = await MeetingParticipant.findById(participantId);
  if (!participant) throw ApiError.notFound("Participant not found");

  return participant;
}