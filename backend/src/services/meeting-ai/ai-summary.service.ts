import { Meeting } from "../../models/meeting.model";
import { Transcript } from "../../models/transcript.model";
import { MeetingAgendaItem } from "../../models/meeting-agenda-item.model";
import { ApiError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { aiPolicyService } from "./ai-policy.service"; // 👈 Import service baru
import type { Types } from "mongoose";

export interface SummaryResult {
  executiveSummary: string;
  detailedSummary: Array<{
    agendaItemTitle: string;
    summary: string;
  }>;
}

class AISummaryService {
  async generateSummary(
    meetingId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId
  ): Promise<SummaryResult> {
    const meeting = await Meeting.findOne({
      _id: meetingId,
      organizationId,
    }).lean();
    if (!meeting) {
      throw ApiError.notFound("Meeting not found");
    }

    const transcript = await Transcript.findOne({ meetingId }).lean();
    if (!transcript || transcript.status !== "completed") {
      throw ApiError.badRequest("Transcript not available or not completed");
    }

    const agendaItems = await MeetingAgendaItem.find({ meetingId })
      .sort({ position: 1 })
      .lean();

    // 👇 CEK KEBIJAKAN AI TRAINING
    const isTrainingAllowed = await aiPolicyService.isTrainingAllowed(organizationId);
    
    logger.info(`Generating AI summary for meeting ${meetingId}. AI training allowed: ${isTrainingAllowed}`);

    // Di sinilah nanti Anda akan mengirim data ke API Provider (OpenAI/Deepgram).
    // Anda bisa menyertakan parameter `isTrainingAllowed` ke dalam payload provider
    // agar provider tidak menyimpan data tersebut untuk training mereka.
    
    // Mock data
    const mockExecutiveSummary = `This meeting titled "${meeting.title}" covered ${agendaItems.length} agenda items.`;
    const mockDetailedSummary = agendaItems.map((item) => ({
      agendaItemTitle: item.title,
      summary: `Discussed item: ${item.title}.`,
    }));

    if (mockDetailedSummary.length === 0) {
      mockDetailedSummary.push({
        agendaItemTitle: "General Discussion",
        summary: "The team engaged in general discussion.",
      });
    }

    return {
      executiveSummary: mockExecutiveSummary,
      detailedSummary: mockDetailedSummary,
    };
  }
}

export const aiSummaryService = new AISummaryService();