import type { Types } from "mongoose";
import { Transcript, TranscriptStatus, type ITranscript } from "../../models/transcript.model";
import { TranscriptSegment } from "../../models/transcript-segment.model";
import { Meeting } from "../../models/meeting.model";
import { ApiError } from "../../lib/errors";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../../models/audit-log.model";
import { Notification } from "../../models/notification.model";
import { NotificationType } from "../../models/notification.model";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

class TranscriptionService {
  async transcribeRecording(
    meetingId: string | Types.ObjectId,
    _recordingId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<ITranscript> {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    let transcript = await Transcript.findOne({ meetingId, organizationId });
    if (!transcript) {
      transcript = new Transcript({
        meetingId,
        organizationId,
        language: "en",
        provider: env.transcription.provider,
        status: TranscriptStatus.PENDING,
        version: 1,
      });
    }

    transcript.status = TranscriptStatus.PENDING;
    await transcript.save();

    try {
      // TODO: Call actual transcription provider (Deepgram, etc.)
      // For now, simulate transcription with placeholder data
      logger.info(`Transcribing meeting ${meetingId} with provider ${transcript.provider}`);

      await TranscriptSegment.deleteMany({
        organizationId,
        transcriptId: transcript._id,
      });
      transcript.status = TranscriptStatus.COMPLETED;
      await transcript.save();

      meeting.transcriptStatus = "completed";
      await meeting.save();

      await auditLogsService.logAction({
        organizationId,
        actorId: meeting.hostId,
        action: AuditAction.TRANSCRIPT_GENERATED,
        targetType: "Transcript",
        targetId: transcript._id,
        status: "success",
        metadata: { meetingId, provider: transcript.provider, segmentCount: 0 },
      });

      await Notification.create({
        userId: meeting.hostId,
        organizationId,
        type: NotificationType.TRANSCRIPT_READY,
        payload: {
          title: "Transcript ready",
          body: `Transcript for meeting "${meeting.title}" is ready`,
          action: `/meetings/${meetingId}`,
          actionLabel: "View Transcript",
          meetingId: meetingId.toString(),
        },
      });

      return transcript;
    } catch (err) {
      transcript.status = TranscriptStatus.FAILED;
      await transcript.save();

      await auditLogsService.logAction({
        organizationId,
        actorId: meeting.hostId,
        action: AuditAction.TRANSCRIPT_GENERATED,
        targetType: "Transcript",
        targetId: transcript._id,
        status: "failed",
        metadata: { meetingId, error: (err as Error).message },
      });

      throw err;
    }
  }

  async correctTranscript(
    transcriptId: string | Types.ObjectId,
    segmentId: string | Types.ObjectId,
    correctedText: string,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    speakerLabel?: string,
  ): Promise<ITranscript> {
    const transcript = await Transcript.findOne({ _id: transcriptId, organizationId });
    if (!transcript) throw ApiError.notFound("Transcript not found");

    const segment = await TranscriptSegment.findOne({
      _id: segmentId,
      transcriptId,
      organizationId,
    });
    if (!segment) throw ApiError.notFound("Transcript segment not found");

    const oldText = segment.text;
    segment.text = correctedText;
    if (speakerLabel !== undefined) segment.speakerLabel = speakerLabel;
    await segment.save();

    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.TRANSCRIPT_CORRECTED,
      targetType: "Transcript",
      targetId: transcript._id,
      status: "success",
      metadata: {
        segmentId: segment._id,
        oldText,
        newText: correctedText,
        ...(speakerLabel !== undefined ? { speakerLabel } : {}),
      },
    });

    return transcript;
  }

  async getTranscript(
    meetingId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<ITranscript> {
    const transcript = await Transcript.findOne({ meetingId, organizationId })
      .sort({ version: -1 })
      .lean<ITranscript>();
    if (!transcript) throw ApiError.notFound("Transcript not found");
    return transcript;
  }
}

export const transcriptionService = new TranscriptionService();