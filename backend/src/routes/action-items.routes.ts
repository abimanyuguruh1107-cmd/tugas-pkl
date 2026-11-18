import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { validateRequest } from "../validators/validate";
import {
  actionItemCreateSchema,
  actionItemUpdateSchema,
} from "../validators/meeting.schemas";
import * as controller from "../controllers/action-items.controller";
export const actionItemsRouter = Router();
actionItemsRouter.use(authenticate, resolveTenant);
actionItemsRouter.get("/action-items", controller.list);
actionItemsRouter.post(
  "/meetings/:meetingId/action-items",
  loadMeetingAccess(PERMISSIONS.ACTION_ITEMS_WRITE) as RequestHandler,
  validateRequest(actionItemCreateSchema) as RequestHandler,
  controller.create,
);
actionItemsRouter.patch(
  "/action-items/:actionItemId",
  validateRequest(actionItemUpdateSchema) as RequestHandler,
  controller.update,
);
