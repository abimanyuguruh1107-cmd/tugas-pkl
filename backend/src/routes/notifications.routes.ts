import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { validateRequest } from "../validators/validate";
import * as controller from "../controllers/notifications.controller";

const notificationListSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    skip: z.coerce.number().int().min(0).default(0),
  }),
});
const notificationReadSchema = z.object({
  params: z.object({
    notificationId: z.string().regex(/^[a-f\d]{24}$/i),
  }),
});

export const notificationsRouter = Router();
notificationsRouter.use(authenticate, resolveTenant);
notificationsRouter.get(
  "/notifications",
  validateRequest(notificationListSchema) as RequestHandler,
  controller.list,
);
notificationsRouter.patch(
  "/notifications/:notificationId/read",
  validateRequest(notificationReadSchema) as RequestHandler,
  controller.markRead,
);
