import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongo.uri, {
    maxPoolSize: env.mongo.maxPoolSize,
    serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMS,
    socketTimeoutMS: env.mongo.socketTimeoutMS,
  });
}

mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
mongoose.connection.on("error", (err) => logger.error("MongoDB error:", err));
mongoose.connection.on("disconnected", () =>
  logger.info("MongoDB disconnected"),
);

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
