import type { Request, Response } from "express";
import { transcriptionService } from "../services/transcription/transcription.service";
import { authenticate } from "../middleware/auth.middleware";
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../lib/errors";

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

const correctTranscriptSchema = z.object({
  body: z.object({
    segmentId: z.string().regex(/^[a-f\d]{24}$/i),
    text: z.string().trim().min(1).max(10000),
    speakerLabel: z.string().trim().max(200).optional(),
  }),
});

export const transcriptsRouter = Router();

transcriptsRouter.use(authenticate);

transcriptsRouter.get(
  "/:meetingId/transcript",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    if (!req.organizationId) throw ApiError.unauthorized("Organization context required");
    const transcript = await transcriptionService.getTranscript(
      String(req.params.meetingId),
      req.organizationId,
    );
    res.json({ transcript });
  },
);

transcriptsRouter.patch(
  "/:meetingId/transcript/correct",
  authenticate,
  validate(correctTranscriptSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.organizationId || !req.user) {
      throw ApiError.unauthorized("Organization membership is required");
    }
    const transcript = await transcriptionService.getTranscript(
      String(req.params.meetingId),
      req.organizationId,
    );
    await transcriptionService.correctTranscript(
      transcript._id,
      req.body.segmentId as string,
      req.body.text as string,
      req.user._id,
      req.organizationId,
      req.body.speakerLabel as string | undefined,
    );

    res.json({ message: "Transcript segment corrected" });
  },
);