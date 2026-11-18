import { Queue } from "bullmq";
import { createRedisConnection } from "./connection";

export const RECORDING_QUEUE_NAME = "recording-post-processing";

export interface RecordingEgressJobData {
  recordingId: string;
  succeeded: boolean;
  objectKey?: string;
  duration?: number;
  size?: number;
}

let recordingQueue: Queue<RecordingEgressJobData> | null = null;

export function getRecordingQueue(): Queue<RecordingEgressJobData> {
  if (!recordingQueue) {
    recordingQueue = new Queue<RecordingEgressJobData>(RECORDING_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 3_000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
  }
  return recordingQueue;
}

export async function closeRecordingQueue(): Promise<void> {
  await recordingQueue?.close();
  recordingQueue = null;
}
