import mongoose, { Schema, type Model, type Types } from "mongoose";

export const PROCESSING_JOB_TYPES = [
  "recording",
  "transcription",
  "meeting-ai",
  "notifications",
] as const;

export const PROCESSING_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type ProcessingJobType = (typeof PROCESSING_JOB_TYPES)[number];
export type ProcessingJobStatus = (typeof PROCESSING_JOB_STATUSES)[number];

export interface IProcessingJob {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  jobType: ProcessingJobType;
  status: ProcessingJobStatus;
  attempts: number;
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const processingJobSchema = new Schema<IProcessingJob>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    jobType: {
      type: String,
      enum: PROCESSING_JOB_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: PROCESSING_JOB_STATUSES,
      default: "pending",
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      required: true,
    },
    // 👇 Hanya ini yang perlu ditambahkan dari kode awal Anda
    errorCode: {
      type: String,
    },
  },
  { timestamps: true },
);

processingJobSchema.index({ meetingId: 1, jobType: 1 });
processingJobSchema.index({ status: 1 });

export const ProcessingJob: Model<IProcessingJob> =
  mongoose.models.ProcessingJob ??
  mongoose.model<IProcessingJob>("ProcessingJob", processingJobSchema);