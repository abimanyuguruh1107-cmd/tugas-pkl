import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import * as controller from "../controllers/participants.controller";
import {
  participantCreateSchema,
  participantStatusSchema,
} from "../validators/meeting.schemas";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
export const participantsRouter = Router();
participantsRouter.use(authenticate, resolveTenant);
participantsRouter.get(
  "/meetings/:meetingId/participants",
  loadMeetingAccess(PERMISSIONS.MEETINGS_READ),
  controller.list,
);
participantsRouter.post(
  "/meetings/:meetingId/participants",
  loadMeetingAccess(PERMISSIONS.MEETING_PARTICIPANTS_INVITE),
  validateRequest(participantCreateSchema) as RequestHandler,
  controller.add,
);
participantsRouter.patch(
  "/meetings/:meetingId/participants/:participantId",
  loadMeetingAccess(PERMISSIONS.MEETING_PARTICIPANTS_MANAGE),
  validateRequest(participantStatusSchema) as RequestHandler,
  controller.updateStatus,
);
participantsRouter.delete(
  "/meetings/:meetingId/participants/:participantId",
  loadMeetingAccess(PERMISSIONS.MEETING_PARTICIPANTS_MANAGE),
  controller.remove,
);
