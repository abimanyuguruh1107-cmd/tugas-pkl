import { MeetingSession, type IMeetingSession } from "../../models/meeting-session.model";
import { MeetingParticipant } from "../../models/meeting-participant.model";
import { Meeting } from "../../models/meeting.model";
import { ApiError } from "../../lib/errors";

export interface JoinSessionInput {
  meetingId: string;
  participantId: string;
  connectionMetadata?: Record<string, unknown>;
}

export interface LeaveSessionInput {
  sessionId: string;
}

export interface AttendanceRecord {
  participantId: string;
  joinTime: Date;
  leaveTime?: Date;
  durationSeconds?: number;
}

export async function recordAttendanceJoin(input: JoinSessionInput): Promise<IMeetingSession> {
  const { meetingId, participantId, connectionMetadata } = input;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");

  const participant = await MeetingParticipant.findOne({
    _id: participantId,
    meetingId,
    organizationId: meeting.organizationId,
  });
  if (!participant) throw ApiError.notFound("Participant not found");

  const existingSession = await MeetingSession.findOne({
    meetingId,
    participantId,
    leftAt: null,
  });
  if (existingSession) {
    const metadata = existingSession.connectionMetadata ?? {};
    existingSession.connectionMetadata = {
      ...metadata,
      ...connectionMetadata,
      reconnects: (metadata.reconnects ?? 0) + 1,
    };
    await existingSession.save();
    return existingSession;
  }

  try {
    return await MeetingSession.create({
      meetingId,
      participantId,
      joinedAt: new Date(),
      ...(connectionMetadata !== undefined ? { connectionMetadata } : {}),
    });
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }

    const racedSession = await MeetingSession.findOne({
      meetingId,
      participantId,
      leftAt: null,
    });
    if (!racedSession) throw error;
    const metadata = racedSession.connectionMetadata ?? {};
    racedSession.connectionMetadata = {
      ...metadata,
      ...connectionMetadata,
      reconnects: (metadata.reconnects ?? 0) + 1,
    };
    await racedSession.save();
    return racedSession;
  }
}

export async function recordAttendanceLeave(sessionId: string): Promise<IMeetingSession> {
  const session = await MeetingSession.findById(sessionId);
  if (!session) throw ApiError.notFound("Session not found");

  if (session.leftAt) {
    throw ApiError.conflict("Session already ended");
  }

  session.leftAt = new Date();
  await session.save();

  return session;
}

export async function getMeetingAttendance(meetingId: string): Promise<IMeetingSession[]> {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");

  return MeetingSession.find({ meetingId }).sort({ joinedAt: 1 });
}

export async function getParticipantAttendance(participantId: string): Promise<IMeetingSession[]> {
  return MeetingSession.find({ participantId }).sort({ joinedAt: -1 });
}

export async function getAttendanceDuration(participantId: string, meetingId: string): Promise<number> {
  const sessions = await MeetingSession.find({
    meetingId,
    participantId,
    leftAt: { $exists: true, $ne: null },
  });

  let totalDuration = 0;
  for (const session of sessions) {
    if (session.leftAt && session.joinedAt) {
      totalDuration += session.leftAt.getTime() - session.joinedAt.getTime();
    }
  }

  return Math.floor(totalDuration / 1000);
}