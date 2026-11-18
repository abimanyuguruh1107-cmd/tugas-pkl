import { Router, type Request } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import * as meetingRoomController from "../controllers/meeting-room.controller";
import { endMeetingSchema } from "../validators/meeting.schema";

/** Validation middleware wrapper */
function validate(schema: { parse: (req: unknown) => unknown }) {
  return (req: unknown, _res: unknown, next: (err?: unknown) => void) => {
    try {
      schema.parse(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const meetingRoomRouter = Router();

// All room routes require authentication
meetingRoomRouter.use(authenticate);
meetingRoomRouter.use(resolveTenant);

// Join token rate limiter
const joinLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req: Request) => `${req.ip}:${req.params.meetingId}`,
});

/**
 * POST /api/v1/meeting-room/:meetingId/join-token
 * Generate LiveKit token
 */
meetingRoomRouter.post(
  "/meetings/:meetingId/join-token",
  joinLimit,
  meetingRoomController.createJoinToken,
);

/**
 * POST /api/v1/meeting-room/:meetingId/end
 * End meeting (host only)
 * Transitions: LIVE → ENDED → PROCESSING
 * Triggers: recording stop, transcription queue, state transition
 */
meetingRoomRouter.post(
  "/:meetingId/end",
  validate(endMeetingSchema),
  meetingRoomController.endMeeting,
);

/**
 * POST /api/v1/meeting-room/:meetingId/record/start
 * Start recording (host only)
 * Creates Recording record, queues transcription
 */
meetingRoomRouter.post(
  "/:meetingId/record/start",
  meetingRoomController.startRecording,
);

/**
 * POST /api/v1/meeting-room/:meetingId/record/stop
 * Stop recording (host only)
 * Updates Recording status, triggers post-processing
 */
meetingRoomRouter.post(
  "/:meetingId/record/stop",
  meetingRoomController.stopRecording,
);

/**
 * GET /api/v1/meeting-room/:meetingId/participants
 * Get live participant list
 */
meetingRoomRouter.get(
  "/:meetingId/participants",
  meetingRoomController.getLiveParticipants,
);