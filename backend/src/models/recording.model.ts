import mongoose, { Schema, type Model, type Types } from "mongoose";

export enum RecordingStatus {
  PENDING = "pending",
  RECORDING = "recording",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  DELETED = "deleted",
}

export enum RecordingProvider {
  LIVEKIT = "livekit",
  CUSTOM = "custom",
}

/**
 * Recording document interface
 */
export interface IRecording {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  meetingId: Types.ObjectId; // Reference to Meeting
  provider: RecordingProvider;
  providerRecordingId?: string; // External provider's recording ID
  objectKey: string; // S3/storage path (private)
  mimeType: string; // video/mp4, etc
  size: number; // bytes
  duration: number; // seconds
  status: RecordingStatus;
  startedAt: Date;
  stoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Retention & compliance
  retentionUntil: Date; // Auto-delete date
  consentRecorded: boolean; // Participants consented

  // Metadata
  participantCount?: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

const recordingSchema = new Schema<IRecording>(
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
      index: true,
      unique: true, // One recording per meeting
    },
    provider: {
      type: String,
      enum: Object.values(RecordingProvider),
      required: true,
      default: RecordingProvider.LIVEKIT,
    },
    providerRecordingId: String,
    objectKey: {
      type: String,
      required: true,
      // Format: s3://bucket/org-{orgId}/meeting-{meetingId}/recording-{timestamp}
      index: true,
    },
    mimeType: {
      type: String,
      default: "video/mp4",
    },
    size: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(RecordingStatus),
      default: RecordingStatus.PENDING,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    stoppedAt: Date,
    retentionUntil: {
      type: Date,
      required: true,
      // Set to now + retention days from env
      index: true,
    },
    consentRecorded: {
      type: Boolean,
      default: true,
    },
    participantCount: Number,
    hasAudio: {
      type: Boolean,
      default: true,
    },
    hasVideo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for queries
recordingSchema.index({ organizationId: 1, status: 1 });
recordingSchema.index({ meetingId: 1, createdAt: -1 });
recordingSchema.index({ organizationId: 1, retentionUntil: 1 }); // For cleanup jobs
recordingSchema.index({ organizationId: 1, createdAt: -1 }); // For listing

export const Recording: Model<IRecording> =
  mongoose.models.Recording ??
  mongoose.model<IRecording>("Recording", recordingSchema);