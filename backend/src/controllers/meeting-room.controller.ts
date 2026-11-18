import type { Request, Response } from "express";
import { isValidObjectId, Types } from "mongoose";
import type { PopulatedUser } from "../models/user.model";
import { Meeting } from "../models/meeting.model";
import {
  Recording,
  RecordingStatus,
} from "../models/recording.model";
import { MeetingSession } from "../models/meeting-session.model";
import { AuditAction } from "../models/audit-log.model";
import { MeetingParticipant } from "../models/meeting-participant.model";
import { MeetingRoomState } from "../models/meeting-room.model";
import { ApiError } from "../lib/errors";
import { createMediaToken } from "../lib/livekit";
import { validateMeetingTransition, MeetingStatus } from "../lib/meeting-status";
import { auditLogsService } from "../services/audit-logs/audit-logs.service";
import { recordingService } from "../services/recordings/recording.service";
import { assertOrganizationPermission } from "../services/meetings/meeting-access.service";

/**
 * Convert a route param to ObjectId.
 * Throws 400 if the value is missing, an array, or not a valid ObjectId.
 */
function parseMeetingId(value: unknown): Types.ObjectId {
  if (typeof value !== "string" || !isValidObjectId(value)) {
    throw ApiError.badRequest("Invalid meetingId");
  }
  return new Types.ObjectId(value);
}

/**
 * POST /api/v1/meeting-room/:meetingId/end
 */
export async function endMeeting(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const meetingId = parseMeetingId(req.params.meetingId);
  if (!req.organizationId) throw ApiError.unauthorized("Organization context required");

  const meeting = await Meeting.findOne({
    _id: meetingId,
    organizationId: req.organizationId,
  });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.hostId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Only host can end meeting");
  }

  const currentStatus = meeting.status as MeetingStatus;
  if (currentStatus !== MeetingStatus.LIVE) {
    throw ApiError.badRequest(`Cannot end meeting with status ${currentStatus}`);
  }

  validateMeetingTransition(currentStatus, MeetingStatus.ENDED);

  meeting.status = MeetingStatus.ENDED;
  meeting.endAt = new Date();
  await meeting.save();

  const activeSessions = await MeetingSession.find({
    meetingId,
    leftAt: null,
  });

  const now = new Date();
  await Promise.all(
    activeSessions.map((session) => {
      session.leftAt = now;
      return session.save();
    }),
  );

  const activeRecording = await Recording.findOne({
    meetingId,
    organizationId: req.organizationId,
    status: RecordingStatus.RECORDING,
  });

  if (activeRecording) {
    await recordingService.stopRecording(
      meetingId.toString(),
      user._id,
      meeting.organizationId,
    );
  }

  if (meeting.recordingConfig.enabled || meeting.aiConfig.enabled) {
    validateMeetingTransition(MeetingStatus.ENDED, MeetingStatus.PROCESSING);
    meeting.status = MeetingStatus.PROCESSING;
    await meeting.save();
  }

  await auditLogsService.logAction({
    organizationId: meeting.organizationId,
    actorId: user._id,
    action: AuditAction.MEETING_ENDED,
    targetType: "Meeting",
    targetId: meeting._id,
    status: "success",
    metadata: {
      participantCount: activeSessions.length,
      recordingActive: !!activeRecording,
    },
  });

  res.json({
    message: "Meeting ended",
    meeting: {
      id: meeting._id,
      status: meeting.status,
      endedAt: meeting.endAt,
    },
  });
}

/**
 * POST /api/v1/meeting-room/:meetingId/record/start
 */
export async function startRecording(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const meetingId = parseMeetingId(req.params.meetingId);
  if (!req.organizationId) throw ApiError.unauthorized("Organization context required");

  const meeting = await Meeting.findOne({
    _id: meetingId,
    organizationId: req.organizationId,
  });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.hostId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Only host can start recording");
  }

  if (meeting.status !== MeetingStatus.LIVE) {
    throw ApiError.badRequest("Meeting must be LIVE");
  }

  if (!meeting.recordingConfig.enabled) {
    throw ApiError.badRequest("Recording not enabled");
  }

  const recording = await recordingService.startRecording(
    meetingId,
    user._id,
    meeting.organizationId,
  );

  res.status(201).json({
    message: "Recording started",
    recording: { id: recording._id, status: recording.status },
  });
}

/**
 * POST /api/v1/meeting-room/:meetingId/record/stop
 */
export async function stopRecording(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const meetingId = parseMeetingId(req.params.meetingId);
  if (!req.organizationId) throw ApiError.unauthorized("Organization context required");

  const meeting = await Meeting.findOne({
    _id: meetingId,
    organizationId: req.organizationId,
  });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (meeting.hostId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Only host can stop recording");
  }

  const recording = await recordingService.stopRecording(
    meetingId,
    user._id,
    meeting.organizationId,
  );

  res.json({
    message: "Recording stopped",
    recording: { id: recording._id, duration: recording.duration },
  });
}

/**
 * GET /api/v1/meeting-room/:meetingId/participants
 */
export async function getLiveParticipants(
  req: Request,
  res: Response,
): Promise<void> {
  const meetingId = parseMeetingId(req.params.meetingId);
  if (!req.organizationId) throw ApiError.unauthorized("Organization context required");

  const meeting = await Meeting.findOne({
    _id: meetingId,
    organizationId: req.organizationId,
  });
  if (!meeting) throw ApiError.notFound("Meeting not found");

  const activeSessions = await MeetingSession.find({
    meetingId,
    leftAt: null,
  })
    .populate("participantId", "userId guestEmail role invitationStatus")
    .lean();

  res.json({ participants: activeSessions });
}

/**
 * POST /api/v1/meetings/:meetingId/join-token
 */
export async function createJoinToken(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user || !req.organizationId) throw ApiError.unauthorized();
  const meetingId = String(req.params.meetingId);
  const meeting = await Meeting.findOne({
    _id: meetingId,
    organizationId: req.organizationId,
  }).lean();
  if (!meeting) throw ApiError.notFound("Meeting not found");
  if (!["scheduled", "live"].includes(meeting.status))
    throw ApiError.conflict("Meeting is not joinable");
  const roomState = await MeetingRoomState.findOne({
    organizationId: req.organizationId,
    meetingId,
  }).lean();
  const participant = await MeetingParticipant.findOne({
    organizationId: req.organizationId,
    meetingId,
    userId: req.user._id,
    invitationStatus: { $in: ["invited", "accepted", "waiting"] },
  }).lean();
  const isHost = meeting.hostId.equals(req.user._id);
  if (!isHost && !participant)
    throw ApiError.forbidden(
      "Meeting invitation or participant record is required",
    );
  if (!isHost)
    await assertOrganizationPermission(
      String(req.organizationId),
      req.user._id.toString(),
      "meetings:read",
    );
  if (roomState?.locked && !isHost)
    throw ApiError.forbidden("Meeting room is locked");
  const identity = req.user._id.toString();
  const token = await createMediaToken({
    roomName: `meeting-${meetingId}`,
    identity,
    name: req.user.name,
    ttlSeconds: 300,
  });
  res.json({ token, roomName: `meeting-${meetingId}`, expiresInSeconds: 300 });
}