import type { Request, Response } from "express";
import type { PopulatedUser } from "../models/user.model";
import type { AIConfig, MeetingSettings, RecordingConfig } from "../models/meeting.model";
import type { Types } from "mongoose";
import { meetingService } from "../services/meetings/meeting.service";
import { ApiError } from "../lib/errors";
import {
  createJoinToken,
  endMeeting as endMeetingInRoom,
  startRecording as startLiveKitRecording,
  stopRecording as stopLiveKitRecording,
} from "./meeting-room.controller";

type CreateMeetingBody = {
  title: string;
  description?: string;
  startAt: string | Date;
  endAt?: string | Date;
  timezone?: string;
  recordingConfig?: RecordingConfig;
  aiConfig?: AIConfig;
  settings?: MeetingSettings;
};

type UpdateMeetingBody = {
  title?: string;
  description?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  timezone?: string;
  recordingConfig?: RecordingConfig;
  aiConfig?: AIConfig;
  settings?: MeetingSettings;
};

function resolveOrganizationId(req: Request, _user: PopulatedUser): Types.ObjectId {
  if (!req.organizationId) {
    throw ApiError.unauthorized("Organization context is required");
  }
  return req.organizationId;
}

/**
 * List meetings for authenticated user's organization
 */
export async function listMeetings(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const result = await meetingService.listMeetings(resolveOrganizationId(req, user), {
    limit: Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20)),
    skip: Math.max(0, Number(req.query.skip ?? 0) || 0),
  });
  res.json({ meetings: result.meetings, total: result.total });
}

/**
 * Create meeting (host only)
 */
export async function createMeeting(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const { title, description, startAt, endAt, timezone, recordingConfig, aiConfig, settings } =
    req.body as CreateMeetingBody;

  const meeting = await meetingService.createMeeting({
    organizationId: resolveOrganizationId(req, user),
    hostId: user._id,
    title,
    startAt: new Date(startAt),
    timezone: timezone || "UTC",
    ...(description !== undefined ? { description } : {}),
    ...(endAt ? { endAt: new Date(endAt) } : {}),
    ...(recordingConfig !== undefined ? { recordingConfig } : {}),
    ...(aiConfig !== undefined ? { aiConfig } : {}),
    ...(settings !== undefined ? { settings } : {}),
  });

  res.status(201).json({ meeting });
}

/**
 * Get meeting details
 */
export async function getMeeting(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const { meetingId } = req.params;
  const meeting = await meetingService.getMeeting(
    meetingId as string,
    resolveOrganizationId(req, user),
  );
  res.json({ meeting });
}

/**
 * Update meeting (host only, before live)
 */
export async function updateMeeting(req: Request, res: Response): Promise<void> {
  const { meetingId } = req.params;
  const user = req.user as PopulatedUser;
  const { title, description, startAt, endAt, timezone, recordingConfig, aiConfig, settings } =
    req.body as UpdateMeetingBody;

  const meeting = await meetingService.updateMeeting(
    meetingId as string,
    user._id,
    resolveOrganizationId(req, user),
    {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(recordingConfig !== undefined ? { recordingConfig } : {}),
      ...(aiConfig !== undefined ? { aiConfig } : {}),
      ...(settings !== undefined ? { settings } : {}),
    },
  );

  res.json({ meeting });
}

/**
 * Cancel meeting (terminal state)
 */
export async function cancelMeeting(req: Request, res: Response): Promise<void> {
  const { meetingId } = req.params;
  const user = req.user as PopulatedUser;

  await meetingService.cancelMeeting(meetingId as string, user._id, resolveOrganizationId(req, user));

  res.json({ message: "Meeting cancelled" });
}

/**
 * List participants in meeting
 */
export async function listParticipants(req: Request, res: Response): Promise<void> {
  const { meetingId } = req.params;
  const participants = await meetingService.listParticipants(meetingId as string);
  res.json({ participants });
}

/**
 * Add participant or invite
 */
export async function addParticipant(req: Request, res: Response): Promise<void> {
  const { meetingId } = req.params;
  const participant = await meetingService.addParticipant(meetingId as string, req.body);
  res.status(201).json({ participant });
}

/**
 * Update participant (role, invitation status)
 */
export async function updateParticipant(req: Request, res: Response): Promise<void> {
  const { meetingId, participantId } = req.params;
  const participant = await meetingService.updateParticipant(meetingId as string, participantId as string, req.body);
  res.json({ participant });
}

/**
 * Remove participant from meeting
 */
export async function removeParticipant(req: Request, res: Response): Promise<void> {
  const { meetingId, participantId } = req.params;
  await meetingService.removeParticipant(meetingId as string, participantId as string);
  res.status(204).send();
}

/**
 * Get LiveKit access token for joining meeting room
 */
export async function getJoinToken(req: Request, res: Response): Promise<void> {
  await createJoinToken(req, res);
}

/**
 * End meeting (host only)
 * Transitions meeting from LIVE to ENDED
 */
export async function endMeeting(req: Request, res: Response): Promise<void> {
  await endMeetingInRoom(req, res);
}

/**
 * Start recording (host only, meeting must be LIVE)
 */
export async function startRecording(req: Request, res: Response): Promise<void> {
  await startLiveKitRecording(req, res);
}

/**
 * Stop recording (host only)
 */
export async function stopRecording(req: Request, res: Response): Promise<void> {
  await stopLiveKitRecording(req, res);
}

/**
 * Get attendance report for meeting
 */
export async function getAttendance(req: Request, res: Response): Promise<void> {
  const { meetingId } = req.params;
  const attendance = await meetingService.getAttendance(meetingId as string);
  res.json({ attendance });
}