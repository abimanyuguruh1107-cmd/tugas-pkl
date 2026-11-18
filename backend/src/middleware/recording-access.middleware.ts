import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ApiError } from "../lib/errors";
import { getRecordingAccess } from "../services/recordings/recording-access.service";

export async function recordingAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user || !req.organizationId)
      throw ApiError.unauthorized("Organization membership required");
    const rawMeetingId = req.params.meetingId;
    const rawRecordingId = req.params.recordingId;
    const meetingId = Array.isArray(rawMeetingId)
      ? rawMeetingId[0]
      : rawMeetingId;
    const recordingId = Array.isArray(rawRecordingId)
      ? rawRecordingId[0]
      : rawRecordingId;
    if (
      !meetingId ||
      !recordingId ||
      !Types.ObjectId.isValid(meetingId) ||
      !Types.ObjectId.isValid(recordingId)
    )
      throw ApiError.badRequest("Valid meeting and recording IDs are required");
    res.locals.recording = await getRecordingAccess(
      String(req.organizationId),
      meetingId,
      recordingId,
      req.user._id.toString(),
    );
    next();
  } catch (error) {
    next(error);
  }
}