import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import {
  hostMuteSchema,
  hostRemoveSchema,
  roomLockSchema,
} from "../validators/meeting.schemas";
import * as controller from "../controllers/host-controls.controller";
export const meetingHostRouter = Router();
meetingHostRouter.use(authenticate, resolveTenant);
meetingHostRouter.post(
  "/meetings/:meetingId/participants/mute",
  loadMeetingAccess(PERMISSIONS.MEETING_HOST_CONTROL) as RequestHandler,
  validateRequest(hostMuteSchema) as RequestHandler,
  controller.mute,
);
meetingHostRouter.post(
  "/meetings/:meetingId/participants/remove",
  loadMeetingAccess(PERMISSIONS.MEETING_HOST_CONTROL) as RequestHandler,
  validateRequest(hostRemoveSchema) as RequestHandler,
  controller.remove,
);
meetingHostRouter.patch(
  "/meetings/:meetingId/room-lock",
  loadMeetingAccess(PERMISSIONS.MEETING_HOST_CONTROL) as RequestHandler,
  validateRequest(roomLockSchema) as RequestHandler,
  controller.lock,
);
