import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import {
  decisionExtractSchema,
  meetingAiSettingsSchema,
  organizationAiSettingsSchema,
} from "../validators/meeting.schemas";
import {
  decisions,
  generateMeetingAi,
  updateMeetingSettings,
  updateOrganizationSettings,
} from "../controllers/meeting-ai.controller";
export const meetingAiRouter = Router();
meetingAiRouter.patch(
  "/organizations/ai/settings",
  authenticate,
  resolveTenant,
  validateRequest(organizationAiSettingsSchema) as RequestHandler,
  updateOrganizationSettings,
);
meetingAiRouter.patch(
  "/meetings/:meetingId/ai/settings",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_AI_MANAGE) as RequestHandler,
  validateRequest(meetingAiSettingsSchema) as RequestHandler,
  updateMeetingSettings,
);
meetingAiRouter.post(
  "/meetings/:meetingId/ai/generate",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_AI_USE) as RequestHandler,
  generateMeetingAi,
);
meetingAiRouter.post(
  "/meetings/:meetingId/ai/decisions",
  authenticate,
  resolveTenant,
  loadMeetingAccess(PERMISSIONS.MEETING_AI_USE) as RequestHandler,
  validateRequest(decisionExtractSchema) as RequestHandler,
  decisions,
);
