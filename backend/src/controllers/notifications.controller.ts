import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { listNotifications, markNotificationRead } from "../services/notifications/notification.service";

function requestContext(req: Request): {
  userId: string;
  organizationId: string;
} {
  if (!req.user || !req.organizationId) {
    throw ApiError.unauthorized("Organization membership is required");
  }
  return {
    userId: req.user._id.toString(),
    organizationId: req.organizationId.toString(),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const context = requestContext(req);
  const limit = Number(req.query.limit ?? 20);
  const skip = Number(req.query.skip ?? 0);
  const result = await listNotifications({
    ...context,
    limit,
    skip,
  });
  res.json(result);
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const context = requestContext(req);
  const notification = await markNotificationRead({
    ...context,
    notificationId: String(req.params.notificationId),
  });
  res.json({ notification });
}
