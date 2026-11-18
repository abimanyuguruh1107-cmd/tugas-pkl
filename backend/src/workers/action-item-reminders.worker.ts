import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../queue/connection";
import {
  ACTION_ITEM_REMINDER_SCAN_JOB,
  ACTION_ITEM_REMINDERS_QUEUE_NAME,
  scheduleActionItemReminderScan,
  type ActionItemReminderJobData,
} from "../queue/action-item-reminders.queue";
import { logger } from "../lib/logger";
import { ActionItem } from "../models/action-item.model";
import { NotificationType } from "../models/notification.model";
import { createNotificationOnce } from "../services/notifications/notification.service";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

async function sendDueReminders(now: Date): Promise<void> {
  const actionItems = await ActionItem.find({
    status: { $nin: ["completed", "cancelled"] },
    dueAt: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
    dueReminderSentAt: { $exists: false },
  }).lean();

  for (const item of actionItems) {
    await createNotificationOnce({
      userId: item.ownerId,
      organizationId: item.organizationId,
      type: NotificationType.ACTION_ITEM_DUE,
      dedupeKey: reminderDedupeKey(item._id.toString(), "due", item.dueAt),
      payload: {
        title: "Action item due soon",
        body: `Action item "${item.title}" is due within 24 hours`,
        action: `/action-items/${item._id.toString()}`,
        actionLabel: "View Action Item",
        actionItemId: item._id.toString(),
      },
    });
    await ActionItem.updateOne(
      { _id: item._id, dueReminderSentAt: { $exists: false } },
      { $set: { dueReminderSentAt: now } },
    );
  }
}

async function sendOverdueReminders(now: Date): Promise<void> {
  const actionItems = await ActionItem.find({
    status: { $nin: ["completed", "cancelled"] },
    dueAt: { $lte: now },
    overdueReminderSentAt: { $exists: false },
  }).lean();

  for (const item of actionItems) {
    await createNotificationOnce({
      userId: item.ownerId,
      organizationId: item.organizationId,
      type: NotificationType.ACTION_ITEM_OVERDUE,
      dedupeKey: reminderDedupeKey(
        item._id.toString(),
        "overdue",
        item.dueAt,
      ),
      payload: {
        title: "Action item overdue",
        body: `Action item "${item.title}" is overdue`,
        action: `/action-items/${item._id.toString()}`,
        actionLabel: "View Action Item",
        actionItemId: item._id.toString(),
      },
    });
    await ActionItem.updateOne(
      { _id: item._id, overdueReminderSentAt: { $exists: false } },
      { $set: { overdueReminderSentAt: now } },
    );
  }
}

async function processReminderJob(
  job: Job<ActionItemReminderJobData>,
): Promise<void> {
  if (job.name !== ACTION_ITEM_REMINDER_SCAN_JOB) {
    throw new Error(`Unsupported action item reminder job: ${job.name}`);
  }
  const now = new Date();
  await sendDueReminders(now);
  await sendOverdueReminders(now);
}

export async function startActionItemReminderWorker(): Promise<
  Worker<ActionItemReminderJobData>
> {
  const worker = new Worker<ActionItemReminderJobData>(
    ACTION_ITEM_REMINDERS_QUEUE_NAME,
    processReminderJob,
    { connection: createRedisConnection(), concurrency: 1 },
  );
  worker.on("completed", (job) =>
    logger.info(`Action item reminder scan ${job.id} completed`),
  );
  worker.on("failed", (job, error) =>
    logger.error(`Action item reminder scan ${job?.id ?? "?"} failed`, error),
  );
  worker.on("error", (error) =>
    logger.error("Action item reminder worker error", error),
  );
  try {
    await scheduleActionItemReminderScan();
  } catch (error) {
    await worker.close();
    throw error;
  }
  logger.info("Action item reminder worker started");
  return worker;
}

function reminderDedupeKey(
  actionItemId: string,
  kind: "due" | "overdue",
  dueAt: Date,
): string {
  return `action-item:${actionItemId}:${kind}:${dueAt.getTime()}`;
}
