import mongoose, { Schema, type Model, type Types } from "mongoose";

export const MEETING_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "ended",
  "processing",
  "completed",
  "cancelled",
] as const;

export type MeetingStatus = (typeof MEETING_STATUSES)[number];

/** Recording configuration */
export interface RecordingConfig {
  enabled: boolean;
  consentRequired: boolean;
  participants?: string[]; // Explicitly approved participants
}

/** AI processing configuration */
export interface AIConfig {
  enabled: boolean;
  generateSummary: boolean;
  extractDecisions: boolean;
  extractActionItems: boolean;
}

/** Live recording state stored on the meeting */
export interface MeetingRecordingState {
  isRecording: boolean;
  startedBy?: string;
  startedAt?: Date;
  stoppedBy?: string;
  stoppedAt?: Date;
}

/** Per-participant recording consent */
export interface RecordingConsentRecord {
  participantId: string;
  consented: boolean;
  consentedAt: Date;
}

export interface MeetingSettings {
  waitingRoomEnabled?: boolean;
  waitingRoom?: boolean;
  guestAccess?: boolean;
  passcode?: string;
  recordingEnabled?: boolean;
  aiEnabled?: boolean;
  participantsMuted?: boolean;
  allowRecording?: boolean;
  recording?: MeetingRecordingState;
  recordingConsent?: RecordingConsentRecord[];
}

export interface IMeeting {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  hostId: Types.ObjectId; // Reference to User
  title: string;
  description?: string;
  /** Date instants are stored as UTC timestamps and serialized as ISO UTC. */
  startAt: Date;
  endAt: Date;
  timezone: string; // IANA timezone
  status: MeetingStatus;

  // Recording and processing
  recordingConfig: RecordingConfig;
  aiConfig: AIConfig;

  // Transcription & AI processing status
  transcriptStatus?: "pending" | "completed" | "failed";
  aiStatus?: "pending" | "completed" | "failed";

  settings: MeetingSettings;

  createdAt: Date;
  updatedAt: Date;
}

const recordingConsentSchema = new Schema<RecordingConsentRecord>(
  {
    participantId: { type: String, required: true },
    consented: { type: Boolean, required: true },
    consentedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const meetingSchema = new Schema<IMeeting>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      minlength: 3,
      maxlength: 256,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    startAt: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endAt: {
      type: Date,
      required: [true, "End time is required"],
      validate: {
        validator(this: unknown, endAt: Date) {
          const startAt = (this as IMeeting).startAt;
          return (
            endAt instanceof Date &&
            !Number.isNaN(endAt.getTime()) &&
            startAt instanceof Date &&
            !Number.isNaN(startAt.getTime()) &&
            endAt.getTime() > startAt.getTime()
          );
        },
        message: "Meeting endAt must be after startAt",
      },
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: "UTC",
      validate: {
        validator(timezone: string) {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: timezone });
            return true;
          } catch {
            return false;
          }
        },
        message: "Timezone must be a valid IANA timezone",
      },
    },
    status: {
      type: String,
      enum: MEETING_STATUSES,
      required: true,
      default: "draft",
    },
    recordingConfig: {
      enabled: { type: Boolean, default: false },
      consentRequired: { type: Boolean, default: true },
      participants: { type: [String], default: [] },
    },
    aiConfig: {
      enabled: { type: Boolean, default: false },
      generateSummary: { type: Boolean, default: false },
      extractDecisions: { type: Boolean, default: false },
      extractActionItems: { type: Boolean, default: false },
    },
    transcriptStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
    },
    aiStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
    },
    settings: {
      waitingRoomEnabled: { type: Boolean, default: false },
      waitingRoom: { type: Boolean },
      guestAccess: { type: Boolean, default: false },
      passcode: { type: String },
      recordingEnabled: { type: Boolean, default: false },
      aiEnabled: { type: Boolean, default: false },
      participantsMuted: { type: Boolean, default: false },
      allowRecording: { type: Boolean, default: true },
      recording: {
        isRecording: { type: Boolean, default: false },
        startedBy: String,
        startedAt: Date,
        stoppedBy: String,
        stoppedAt: Date,
      },
      recordingConsent: { type: [recordingConsentSchema], default: [] },
    },
  },
  { timestamps: true },
);

// Compound indexes for tenant-scoped queries
meetingSchema.index({ organizationId: 1, status: 1 });
meetingSchema.index({ organizationId: 1, startAt: -1 });
meetingSchema.index({ organizationId: 1, hostId: 1 });
meetingSchema.index({ hostId: 1, status: 1 });

export const Meeting: Model<IMeeting> =
  mongoose.models.Meeting ?? mongoose.model<IMeeting>("Meeting", meetingSchema);