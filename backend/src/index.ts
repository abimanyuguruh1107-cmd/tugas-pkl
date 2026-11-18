import { createApp } from "./app";
import { env, validateEnv } from "./config/env";
import { connectMongo, disconnectMongo } from "./config/mongo";
import { logger } from "./lib/logger";
import { seedDefaults } from "./seed";
import { startEmailWorker } from "./workers/email.worker";
import { startRecordingWorker } from "./workers/recording.worker";
import { startActionItemReminderWorker } from "./workers/action-item-reminders.worker";
import { closeQueues } from "./queue/connection";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

async function main(): Promise<void> {
  // Validate environment configuration at startup (fail fast on misconfiguration)
  try {
    validateEnv();
  } catch (err) {
    logger.error("Environment validation failed:", err);
    process.exit(1);
  }

  await connectMongo();

  if (env.seed.enabled) {
    await seedDefaults();
  }

  // Start the email worker in-process when RUN_INLINE_WORKER=true.
  // In Docker/production, prefer the dedicated `bun run worker` service.
  let worker: ReturnType<typeof startEmailWorker> | undefined;
  let recordingWorker: ReturnType<typeof startRecordingWorker> | undefined;
  let reminderWorker:
    | Awaited<ReturnType<typeof startActionItemReminderWorker>>
    | undefined;
  if (env.mail.runInlineWorker) {
    worker = startEmailWorker();
    recordingWorker = startRecordingWorker();
    reminderWorker = await startActionItemReminderWorker();
  }

  const app = createApp();
  // Bun's node:http compatibility layer runs the Express app natively.
  const server = app.listen(env.port, () => {
    logger.info(
      `API listening on http://localhost:${env.port} [${env.nodeEnv}]`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close();
    await worker?.close();
    await recordingWorker?.close();
    await reminderWorker?.close();
    await closeQueues();
    await disconnectMongo();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
