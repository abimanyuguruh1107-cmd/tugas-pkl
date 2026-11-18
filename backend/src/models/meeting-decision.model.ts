import mongoose, { Schema, type Model, type Types } from "mongoose";

export type MeetingDecisionStatus = "proposed" | "confirmed" | "rejected";

export interface IMeetingDecision {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  text: string;
  context?: string;
  status: MeetingDecisionStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const meetingDecisionSchema = new Schema<IMeetingDecision>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["proposed", "confirmed", "rejected"],
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

meetingDecisionSchema.index({ meetingId: 1, createdAt: -1 });
meetingDecisionSchema.index({ organizationId: 1, status: 1 });

export const MeetingDecision: Model<IMeetingDecision> =
  mongoose.models.MeetingDecision ??
  mongoose.model<IMeetingDecision>("MeetingDecision", meetingDecisionSchema);