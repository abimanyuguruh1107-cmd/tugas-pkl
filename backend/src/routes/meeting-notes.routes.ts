import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import { noteCreateSchema } from "../validators/meeting.schemas";
import * as controller from "../controllers/notes.controller";
export const meetingNotesRouter = Router();
meetingNotesRouter.use(authenticate, resolveTenant);
meetingNotesRouter.get(
  "/meetings/:meetingId/notes",
  loadMeetingAccess(PERMISSIONS.MEETINGS_READ) as RequestHandler,
  controller.list,
);
meetingNotesRouter.post(
  "/meetings/:meetingId/notes",
  loadMeetingAccess(PERMISSIONS.MEETINGS_UPDATE) as RequestHandler,
  validateRequest(noteCreateSchema) as RequestHandler,
  controller.create,
);
