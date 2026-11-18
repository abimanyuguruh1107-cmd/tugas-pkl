import { Router } from "express";
import { recordingAccess } from "../middleware/recording-access.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import * as meetingRoomController from "../controllers/meeting-room.controller";
import * as controller from "../controllers/recordings.controller";
import type { RequestHandler } from "express";
export const recordingsRouter = Router();
recordingsRouter.get(
  "/meetings/:meetingId/recordings",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_RECORDINGS_READ) as RequestHandler,
  controller.list,
);
recordingsRouter.post(
  "/meetings/:meetingId/recordings/start",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_RECORDINGS_MANAGE) as RequestHandler,
  meetingRoomController.startRecording,
);
recordingsRouter.post(
  "/meetings/:meetingId/recordings/stop",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_RECORDINGS_MANAGE) as RequestHandler,
  meetingRoomController.stopRecording,
);
recordingsRouter.get(
  "/meetings/:meetingId/recordings/:recordingId/playback",
  authenticate,
  resolveTenant,
  recordingAccess,
  controller.playback,
);
recordingsRouter.get(
  "/meetings/:meetingId/recordings/:recordingId",
  authenticate,
  resolveTenant,
  recordingAccess,
  (_req, res) => {
    res.json({
      recordingId: res.locals.recordingId,
      message:
        "Recording metadata authorized; configure storage delivery separately.",
    });
  },
);
