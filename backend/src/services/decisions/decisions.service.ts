import { MeetingDecision, type IMeetingDecision, type MeetingDecisionStatus } from "../../models/meeting-decision.model";
import { Meeting } from "../../models/meeting.model";
import { ApiError } from "../../lib/errors";
import type { Types } from "mongoose";

export interface CreateDecisionInput {
  meetingId: string | Types.ObjectId;
  organizationId: string | Types.ObjectId;
  text: string;
  context?: string;
  createdBy: string | Types.ObjectId;
}

class DecisionService {
  async createDecision(input: CreateDecisionInput): Promise<IMeetingDecision> {
    // Pastikan meeting ada dan milik organisasi yang benar
    const meeting = await Meeting.findOne({
      _id: input.meetingId,
      organizationId: input.organizationId,
    });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    const decision = await MeetingDecision.create({
      meetingId: input.meetingId,
      organizationId: input.organizationId,
      text: input.text,
      // Gunakan conditional spread untuk menghindari error exactOptionalPropertyTypes
      ...(input.context !== undefined ? { context: input.context } : {}),
      status: "proposed", // Default status
      createdBy: input.createdBy,
    });

    return decision;
  }

  async listDecisions(
    meetingId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId
  ): Promise<IMeetingDecision[]> {
    return MeetingDecision.find({ meetingId, organizationId })
      .sort({ createdAt: -1 }) // Sesuaikan dengan index di model Anda (-1)
      .lean<IMeetingDecision[]>();
  }

  async updateDecisionStatus(
    decisionId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    status: MeetingDecisionStatus,
    _actorId: string | Types.ObjectId // Disiapkan untuk audit log
  ): Promise<IMeetingDecision> {
    const decision = await MeetingDecision.findOneAndUpdate(
      { _id: decisionId, organizationId },
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean<IMeetingDecision>();

    if (!decision) throw ApiError.notFound("Decision not found");
    return decision;
  }
}

export const decisionService = new DecisionService();