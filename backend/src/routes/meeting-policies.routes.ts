import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { validateRequest } from "../validators/validate";
import { meetingPolicyPatchRequestSchema } from "../validators/meeting-settings.schema";
import * as controller from "../controllers/meeting-policies.controller";

export const meetingPoliciesRouter = Router();
meetingPoliciesRouter.use(authenticate, resolveTenant);
meetingPoliciesRouter.get(
  "/organizations/:organizationId/meeting-policies",
  controller.getMeetingPolicies,
);
meetingPoliciesRouter.patch(
  "/organizations/:organizationId/meeting-policies",
  validateRequest(meetingPolicyPatchRequestSchema) as RequestHandler,
  controller.updateMeetingPolicies,
);
