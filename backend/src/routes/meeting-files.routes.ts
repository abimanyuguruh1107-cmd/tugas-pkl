import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import { fileMetadataSchema } from "../validators/meeting.schemas";
import * as controller from "../controllers/file.controller";
export const meetingFilesRouter = Router();
meetingFilesRouter.use(authenticate, resolveTenant);
meetingFilesRouter.get(
  "/meetings/:meetingId/files",
  loadMeetingAccess(PERMISSIONS.MEETING_FILES_READ) as RequestHandler,
  controller.list,
);
meetingFilesRouter.post(
  "/meetings/:meetingId/files",
  loadMeetingAccess(PERMISSIONS.MEETING_FILES_UPLOAD) as RequestHandler,
  validateRequest(fileMetadataSchema) as RequestHandler,
  controller.registerMetadata,
);
meetingFilesRouter.post(
  "/meetings/:meetingId/files/metadata",
  loadMeetingAccess(PERMISSIONS.MEETING_FILES_UPLOAD) as RequestHandler,
  validateRequest(fileMetadataSchema) as RequestHandler,
  controller.registerMetadata,
);
meetingFilesRouter.get(
  "/meetings/:meetingId/files/:fileId",
  loadMeetingAccess(PERMISSIONS.MEETING_FILES_READ) as RequestHandler,
  controller.downloadMetadata,
);
meetingFilesRouter.delete(
  "/meetings/:meetingId/files/:fileId",
  loadMeetingAccess(PERMISSIONS.MEETING_FILES_DELETE) as RequestHandler,
  controller.deleteMetadata,
);
