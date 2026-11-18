import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IMeetingSummary {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  provider: string;
  model: string;
  promptVersion: string;
  status: "pending" | "completed" | "failed";
  content: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSummarySchema = new Schema<IMeetingSummary>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    promptVersion: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
);

meetingSummarySchema.index({ organizationId: 1, meetingId: 1, status: 1 });

export const MeetingSummary: Model<IMeetingSummary> =
  mongoose.models.MeetingSummary ??
  mongoose.model<IMeetingSummary>("MeetingSummary", meetingSummarySchema);