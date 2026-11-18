import type { Types } from "mongoose";
import { ApiError } from "../../lib/errors";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { AuditAction } from "../../models/audit-log.model";
import { Meeting } from "../../models/meeting.model";
import { MeetingAgendaItem } from "../../models/meeting-agenda-item.model";
import { MeetingParticipant } from "../../models/meeting-participant.model";
import { MeetingSummary } from "../../models/meeting-summary.model";
import { MinutesDocument } from "../../models/minutes-document.model";
import { Notification, NotificationType } from "../../models/notification.model";
import { Transcript } from "../../models/transcript.model";
import { TranscriptSegment } from "../../models/transcript-segment.model";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { extractActionItems } from "./ai-decisions.service";

export interface DraftActionItemProposal {
  title: string;
  owner?: string;
  dueDate?: string;
  evidence: string;
  status: "draft";
}

export interface GenerateMomResult {
  minutesDocId: Types.ObjectId;
  summary: string;
  actionItems: DraftActionItemProposal[];
}

class AiMomService {
  async generateMom(
    meetingId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<GenerateMomResult> {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    const transcript = await Transcript.findOne({ organizationId, meetingId })
      .sort({ version: -1 })
      .lean();
    if (!transcript || transcript.status !== "completed") {
      throw ApiError.badRequest("Transcript not available or not completed");
    }

    const [segments, agendaItems, participants] = await Promise.all([
      TranscriptSegment.find({
        organizationId,
        transcriptId: transcript._id,
      })
        .sort({ startMs: 1 })
        .lean(),
      MeetingAgendaItem.find({ meetingId }).sort({ position: 1 }).lean(),
      MeetingParticipant.find({ organizationId, meetingId }).lean(),
    ]);
    const transcriptText =
      transcript.content ??
      segments
        .map(
          (segment) =>
            `[${segment.startMs}-${segment.endMs}] ${segment.speakerLabel ?? "Unknown"}: ${segment.text}`,
        )
        .join("\n");
    if (!transcriptText.trim()) {
      throw ApiError.badRequest("Transcript contains no text to analyze");
    }

    const proposals = await extractActionItems(
      organizationId.toString(),
      meetingId.toString(),
      transcriptText,
    );
    const actionItems: DraftActionItemProposal[] = proposals.map((proposal) => ({
      title: proposal.title,
      ...(proposal.owner ? { owner: proposal.owner } : {}),
      ...(proposal.dueDate ? { dueDate: proposal.dueDate } : {}),
      evidence: proposal.evidence,
      status: "draft",
    }));

    const summary = `AI-generated summary for meeting: ${meeting.title}`;
    const priorMinutes = await MinutesDocument.findOne({
      organizationId,
      meetingId,
    })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const minutes = await MinutesDocument.create({
      organizationId,
      meetingId,
      content: this.buildDraftContent({
        summary,
        agendaItems: agendaItems.map((item) => item.title),
        participantCount: participants.length,
        actionItems,
      }),
      version: (priorMinutes?.version ?? 0) + 1,
      status: "draft",
    });

    await MeetingSummary.create({
      organizationId,
      meetingId,
      provider: env.meetingAi.endpoint ? "configured-provider" : env.ai.provider,
      model: env.meetingAi.model || env.ai.model,
      promptVersion: "action-items-v1",
      status: "completed",
      content: {
        summary,
        actionItems,
        status: "draft",
        agendaItemTitles: agendaItems.map((item) => item.title),
        participantCount: participants.length,
      },
    });

    await Meeting.updateOne(
      { _id: meetingId, organizationId },
      { $set: { aiStatus: "completed" } },
    );
    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.MINUTES_DRAFT_CREATED,
      targetType: "MinutesDocument",
      targetId: minutes._id,
      status: "success",
      metadata: { meetingId, actionItemCount: actionItems.length },
    });
    await Notification.create({
      userId: meeting.hostId,
      organizationId,
      type: NotificationType.MOM_DRAFT_READY,
      payload: {
        title: "AI MoM Draft Ready",
        body: `AI-generated minutes draft is ready for review: ${meeting.title}`,
        action: `/meetings/${meetingId}/minutes`,
        actionLabel: "Review Minutes",
        meetingId: meetingId.toString(),
      },
    });

    logger.info("Generated draft meeting minutes", {
      meetingId: meetingId.toString(),
      actionItemCount: actionItems.length,
    });
    return {
      minutesDocId: minutes._id,
      summary,
      actionItems,
    };
  }

  private buildDraftContent(input: {
    summary: string;
    agendaItems: string[];
    participantCount: number;
    actionItems: DraftActionItemProposal[];
  }): string {
    return [
      input.summary,
      "",
      `Participants: ${input.participantCount}`,
      "",
      "Agenda:",
      ...input.agendaItems.map((title, index) => `${index + 1}. ${title}`),
      "",
      "Proposed action items (draft):",
      ...input.actionItems.map(
        (item) =>
          `- ${item.title}${item.owner ? ` (owner: ${item.owner})` : ""}${item.dueDate ? ` (due: ${item.dueDate})` : ""}\n  Evidence: ${item.evidence}`,
      ),
    ].join("\n");
  }
}

export const aiMomService = new AiMomService();
