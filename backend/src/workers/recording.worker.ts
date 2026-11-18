import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../queue/connection";
import {
  RECORDING_QUEUE_NAME,
  type RecordingEgressJobData,
} from "../queue/recording.queue";
import { recordingService } from "../services/recordings/recording.service";
import { logger } from "../lib/logger";

async function processRecordingEgress(
  job: Job<RecordingEgressJobData>,
): Promise<void> {
  await recordingService.finishEgress(job.data.recordingId, {
    succeeded: job.data.succeeded,
    ...(job.data.objectKey ? { objectKey: job.data.objectKey } : {}),
    ...(job.data.duration !== undefined ? { duration: job.data.duration } : {}),
    ...(job.data.size !== undefined ? { size: job.data.size } : {}),
  });
}

export function startRecordingWorker(): Worker<RecordingEgressJobData> {
  const worker = new Worker<RecordingEgressJobData>(
    RECORDING_QUEUE_NAME,
    processRecordingEgress,
    { connection: createRedisConnection() },
  );
  worker.on("completed", (job) =>
    logger.info(`Recording post-processing job ${job.id} completed`),
  );
  worker.on("failed", (job, error) =>
    logger.error(`Recording post-processing job ${job?.id ?? "?"} failed`, error),
  );
  worker.on("error", (error) =>
    logger.error("Recording worker error", error),
  );
  logger.info("Recording worker started");
  return worker;
}
