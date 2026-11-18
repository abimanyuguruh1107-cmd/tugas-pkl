import { Queue } from "bullmq";
import { createRedisConnection } from "./connection";

export const ACTION_ITEM_REMINDERS_QUEUE_NAME = "action-item-reminders";
export const ACTION_ITEM_REMINDER_SCAN_JOB = "scan";
export const ACTION_ITEM_REMINDER_INTERVAL_MS = 60 * 60 * 1000;

export type ActionItemReminderJobData = Record<string, never>;

let reminderQueue: Queue<ActionItemReminderJobData> | null = null;

export function getActionItemReminderQueue(): Queue<ActionItemReminderJobData> {
  if (!reminderQueue) {
    reminderQueue = new Queue<ActionItemReminderJobData>(
      ACTION_ITEM_REMINDERS_QUEUE_NAME,
      {
        connection: createRedisConnection(),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 3_000 },
          removeOnComplete: { age: 24 * 3600, count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      },
    );
  }
  return reminderQueue;
}

export async function scheduleActionItemReminderScan(): Promise<void> {
  await getActionItemReminderQueue().add(
    ACTION_ITEM_REMINDER_SCAN_JOB,
    {},
    {
      jobId: ACTION_ITEM_REMINDER_SCAN_JOB,
      repeat: { every: ACTION_ITEM_REMINDER_INTERVAL_MS },
    },
  );
}

export async function closeActionItemReminderQueue(): Promise<void> {
  await reminderQueue?.close();
  reminderQueue = null;
}
