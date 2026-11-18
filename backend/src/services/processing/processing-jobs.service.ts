import mongoose, { Schema, type Types, type Model } from "mongoose";

export type ProcessingJobType =
  | "recording"
  | "transcription"
  | "meeting-ai"
  | "notifications";

export type ProcessingJobStatus = "pending" | "processing" | "completed" | "failed";

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
      enum: ["recording", "transcription", "meeting-ai", "notifications"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      required: true,
    },
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

export async function createProcessingJob(input: {
  meetingId: string;
  jobType: ProcessingJobType;
}): Promise<IProcessingJob> {
  const job = await ProcessingJob.create({
    meetingId: input.meetingId,
    jobType: input.jobType,
    status: "pending",
    attempts: 0,
  });
  return job;
}

export async function getProcessingJobStatus(meetingId: string): Promise<IProcessingJob[]> {
  return ProcessingJob.find({ meetingId }).sort({ createdAt: -1 });
}

export async function updateProcessingJobStatus(
  jobId: string,
  status: ProcessingJobStatus,
  errorCode?: string,
): Promise<IProcessingJob> {
  const job = await ProcessingJob.findById(jobId);
  if (!job) throw new Error("Processing job not found");

  job.status = status;
  if (errorCode) job.errorCode = errorCode;
  if (status === "completed" || status === "failed") {
    job.attempts += 1;
  }

  await job.save();
  return job;
}