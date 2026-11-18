import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Status values. Declared as a const object + union type (instead of an enum)
 * so both `TranscriptStatus.COMPLETED` and the plain string "completed"
 * type-check. PENDING and QUEUED mean the same thing; both are kept only so
 * existing code keeps working. Pick one later and drop the other.
 */
export const TranscriptStatus = {
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type TranscriptStatus =
  (typeof TranscriptStatus)[keyof typeof TranscriptStatus];

export interface ITranscript {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  meetingId: Types.ObjectId;
  language: string;
  provider: string;
  status: TranscriptStatus;
  version: number;
  content?: string; // Plain-text transcript, if stored as a single block
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSchema = new Schema<ITranscript>(
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
    },
    language: { type: String, required: true, trim: true, default: "en" },
    provider: { type: String, required: true, trim: true, default: "deepgram" },
    status: {
      type: String,
      enum: Object.values(TranscriptStatus),
      required: true,
      default: TranscriptStatus.PENDING,
    },
    version: { type: Number, required: true, min: 1, default: 1 },
    content: { type: String },
  },
  { timestamps: true },
);

transcriptSchema.index(
  { organizationId: 1, meetingId: 1, version: -1 },
  { unique: true },
);
transcriptSchema.index({ organizationId: 1, status: 1 });

export const Transcript: Model<ITranscript> =
  mongoose.models.Transcript ??
  mongoose.model<ITranscript>("Transcript", transcriptSchema);  