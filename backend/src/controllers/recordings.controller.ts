import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import type { IRecording } from "../models/recording.model";
import { createSignedFileUrl } from "../services/meetings/file-storage.adapter";
import { recordingService } from "../services/recordings/recording.service";

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.organizationId) {
    throw ApiError.unauthorized("Organization context required");
  }
  const recordings = await recordingService.listMeetingRecordings(
    req.organizationId,
    String(req.params.meetingId),
  );
  res.json({ recordings });
}

export async function playback(_req: Request, res: Response): Promise<void> {
  const recording = res.locals.recording as IRecording | undefined;
  if (!recording) throw ApiError.notFound("Recording not found");
  const playbackUrl = await createSignedFileUrl(recording.objectKey);
  res.json({ recordingId: recording._id, playbackUrl, expiresInSeconds: 120 });
}
