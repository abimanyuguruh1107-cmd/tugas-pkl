import { Types } from "mongoose";
import { ApiError } from "../../lib/errors";
import {
  Notification,
  type INotification,
  type NotificationPayload,
  type NotificationType,
} from "../../models/notification.model";

export interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
  type: NotificationType;
  payload: NotificationPayload;
  dedupeKey?: string;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<INotification> {
  const notification = await Notification.create({
    userId: input.userId,
    organizationId: input.organizationId,
    type: input.type,
    payload: input.payload,
    ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
  });
  return notification.toObject() as INotification;
}

export async function createNotificationOnce(
  input: CreateNotificationInput & { dedupeKey: string },
): Promise<void> {
  await Notification.updateOne(
    { dedupeKey: input.dedupeKey },
    {
      $setOnInsert: {
        userId: input.userId,
        organizationId: input.organizationId,
        type: input.type,
        payload: input.payload,
        dedupeKey: input.dedupeKey,
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

export async function listNotifications(input: {
  userId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
  limit: number;
  skip: number;
}): Promise<{ notifications: INotification[]; total: number }> {
  const filter = {
    userId: input.userId,
    organizationId: input.organizationId,
    archivedAt: { $exists: false },
  };
  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .skip(input.skip)
      .lean<INotification[]>(),
    Notification.countDocuments(filter),
  ]);
  return { notifications, total };
}

export async function markNotificationRead(input: {
  notificationId: string;
  userId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
}): Promise<INotification> {
  if (!Types.ObjectId.isValid(input.notificationId)) {
    throw ApiError.badRequest("Invalid notificationId");
  }
  const notification = await Notification.findOneAndUpdate(
    {
      _id: input.notificationId,
      userId: input.userId,
      organizationId: input.organizationId,
      archivedAt: { $exists: false },
    },
    { $set: { readAt: new Date() } },
    { new: true, runValidators: true },
  ).lean<INotification>();
  if (!notification) throw ApiError.notFound("Notification not found");
  return notification;
}
