import { Router, type RequestHandler } from "express";
import type { Types } from "mongoose";
import { ApiError } from "../lib/errors";
import { PERMISSIONS } from "../lib/permissions";
import { Meeting } from "../models/meeting.model";
import { Transcript, type ITranscript } from "../models/transcript.model";
import { TranscriptSegment } from "../models/transcript-segment.model";
import { transcriptionService } from "../services/transcription/transcription.service";
import { authenticate } from "../middleware/auth.middleware";
import { loadMeetingAccess } from "../middleware/meeting-access.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { validateRequest } from "../validators/validate";
import {
  transcriptCreateSchema,
  transcriptSegmentCorrectionSchema,
} from "../validators/meeting.schemas";

function getMeetingId(raw: string | string[] | undefined): string {
  const meetingId = Array.isArray(raw) ? raw[0] : raw;
  if (!meetingId || !/^[a-f\d]{24}$/i.test(meetingId))
    throw ApiError.badRequest("Valid meetingId required");
  return meetingId;
}
function getOrganizationId(
  organizationId: Types.ObjectId | undefined,
): Types.ObjectId {
  if (!organizationId)
    throw ApiError.unauthorized("Organization context required");
  return organizationId;
}

export const transcriptsRouter = Router();
transcriptsRouter.use(authenticate, resolveTenant);
transcriptsRouter.get(
  "/meetings/:meetingId/transcripts",
  loadMeetingAccess(PERMISSIONS.MEETING_TRANSCRIPTS_READ) as RequestHandler,
  async (req, res) => {
    const organizationId = getOrganizationId(req.organizationId);
    const meetingId = getMeetingId(req.params.meetingId);
    const data = await Transcript.find({ organizationId, meetingId })
      .sort({ version: -1 })
      .lean<ITranscript[]>();
    res.json({ data });
  },
);
transcriptsRouter.post(
  "/meetings/:meetingId/transcripts",
  loadMeetingAccess(PERMISSIONS.MEETING_TRANSCRIPTS_MANAGE) as RequestHandler,
  validateRequest(transcriptCreateSchema) as RequestHandler,
  async (req, res) => {
    const organizationId = getOrganizationId(req.organizationId);
    const meetingId = getMeetingId(req.params.meetingId);
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId })
      .select("_id")
      .lean<{ _id: Types.ObjectId }>();
    if (!meeting) throw ApiError.notFound("Meeting not found");
    const prior = await Transcript.findOne({
      organizationId,
      meetingId: meeting._id,
    })
      .sort({ version: -1 })
      .select("version")
      .lean<{ version: number }>();
    const transcript = await Transcript.create({
      organizationId,
      meetingId: meeting._id,
      language: req.body.language as string,
      provider: req.body.provider as string,
      status: "queued",
      version: (prior?.version ?? 0) + 1,
    });
    res.status(201).json({ transcript });
  },
);

transcriptsRouter.get(
  "/meetings/:meetingId/transcript",
  loadMeetingAccess(PERMISSIONS.MEETING_TRANSCRIPTS_READ) as RequestHandler,
  async (req, res) => {
    const organizationId = getOrganizationId(req.organizationId);
    const meetingId = getMeetingId(req.params.meetingId);
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const transcript = await transcriptionService.getTranscript(
      meetingId,
      organizationId,
    );
    const segments = await TranscriptSegment.find({
      organizationId,
      transcriptId: transcript._id,
    })
      .sort({ startMs: 1 })
      .lean();
    res.json({ transcript: { ...transcript, segments } });
  },
);

transcriptsRouter.patch(
  "/meetings/:meetingId/transcript/correct",
  loadMeetingAccess(PERMISSIONS.MEETING_TRANSCRIPTS_MANAGE) as RequestHandler,
  validateRequest(transcriptSegmentCorrectionSchema) as RequestHandler,
  async (req, res) => {
    const organizationId = getOrganizationId(req.organizationId);
    const meetingId = getMeetingId(req.params.meetingId);
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const transcript = await transcriptionService.getTranscript(
      meetingId,
      organizationId,
    );
    const corrected = await transcriptionService.correctTranscript(
      transcript._id,
      String(req.body.segmentId),
      req.body.text as string,
      req.user._id,
      organizationId,
      req.body.speakerLabel as string | undefined,
    );
    res.json({ transcript: corrected });
  },
);
