import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import {
  minutesCreateSchema,
  minutesUpdateSchema,
} from "../validators/meeting.schemas";
import * as controller from "../controllers/minutes.controller";
export const minutesRouter = Router();
minutesRouter.use(authenticate, resolveTenant);
minutesRouter.get(
  "/meetings/:meetingId/minutes",
  loadMeetingAccess(PERMISSIONS.MEETING_MINUTES_READ) as RequestHandler,
  controller.list,
);
minutesRouter.post(
  "/meetings/:meetingId/minutes",
  loadMeetingAccess(PERMISSIONS.MEETING_MINUTES_WRITE) as RequestHandler,
  validateRequest(minutesCreateSchema) as RequestHandler,
  controller.create,
);
const minutesIdSchema = z.object({
  params: z.object({
    minutesId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
});
minutesRouter.patch(
  "/minutes/:minutesId",
  validateRequest(minutesIdSchema) as RequestHandler,
  validateRequest(minutesUpdateSchema) as RequestHandler,
  controller.update,
);
minutesRouter.post(
  "/minutes/:minutesId/review",
  validateRequest(minutesIdSchema) as RequestHandler,
  controller.submitForReview,
);
minutesRouter.post(
  "/minutes/:minutesId/approve",
  validateRequest(minutesIdSchema) as RequestHandler,
  controller.approve,
);
minutesRouter.post(
  "/minutes/:minutesId/publish",
  validateRequest(minutesIdSchema) as RequestHandler,
  controller.publish,
);
minutesRouter.post(
  "/minutes/:minutesId/revisions",
  validateRequest(minutesIdSchema) as RequestHandler,
  validateRequest(minutesUpdateSchema) as RequestHandler,
  controller.revise,
);
