import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.routes";
import { userRouter } from "./routes/user.routes";
import { roleRouter } from "./routes/role.routes";
import { meetingRouter } from "./routes/meetings.routes";
import { meetingRoomRouter } from "./routes/meeting-room.routes";
import { transcriptsRouter } from "./routes/transcripts.routes";
import { auditLogsRouter } from "./controllers/audit-logs.controller";
import { healthRouter } from "./routes/health.routes";
import { participantsRouter } from "./routes/participants.routes";
import { meetingFilesRouter } from "./routes/meeting-files.routes";
import { meetingHostRouter } from "./routes/meeting-host.routes";
import { meetingNotesRouter } from "./routes/meeting-notes.routes";
import { actionItemsRouter } from "./routes/action-items.routes";
import { searchRouter } from "./routes/search.routes";
import { minutesRouter } from "./routes/minutes.routes";
import { recordingsRouter } from "./routes/recordings.routes";
import { meetingAiRouter } from "./routes/meeting-ai.routes";
import { webhooksRouter } from "./routes/webhooks.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { meetingPoliciesRouter } from "./routes/meeting-policies.routes";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        if (req.url?.startsWith("/api/v1/webhooks/livekit")) {
          Object.assign(req, { rawBody: Buffer.from(buffer) });
        }
      },
    }),
  );

  // Authentication routes
  app.use("/api/v1/auth", authRouter);
  
  // User management routes
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/roles", roleRouter);
  
  // Meeting routes (Phase 2)
  // Participant routes must precede the legacy participant handlers nested
  // in meetingRouter so the tenant/RBAC-protected implementation is used.
  app.use("/api/v1", participantsRouter);
  app.use("/api/v1/meetings", meetingRouter);
  
  // Meeting room / live meeting routes (Phase 3)
  app.use("/api/v1/meeting-room", meetingRoomRouter);

  // Transcript routes (Phase 4)
  app.use("/api/v1", transcriptsRouter);

  // Audit logs routes (Phase 5)
  app.use("/api/v1", auditLogsRouter);
  
  // Health check
  app.use("/api/v1", meetingFilesRouter);
  app.use("/api/v1", meetingHostRouter);
  app.use("/api/v1", meetingNotesRouter);
  app.use("/api/v1", actionItemsRouter);
  app.use("/api/v1", searchRouter);
  app.use("/api/v1", minutesRouter);
  app.use("/api/v1", recordingsRouter);
  app.use("/api/v1", meetingAiRouter);
  app.use("/api/v1/webhooks", webhooksRouter);
  app.use("/api/v1", notificationsRouter);
  app.use("/api/v1", meetingPoliciesRouter);
  app.use("/api", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}