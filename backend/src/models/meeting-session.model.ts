import mongoose, { Schema, type Model, type Types } from "mongoose";

export type ConnectionStatus = "joined" | "left" | "reconnected";

/**
 * Optional connection metadata for WebRTC/media connectivity
 */
export interface ConnectionMetadata {
  iceType?: "host" | "srflx" | "relay"; // ICE candidate type
  connectionState?:
    | "new"
    | "connecting"
    | "connected"
    | "disconnected"
    | "failed"
    | "closed";
  transportType?: "udp" | "tcp";
  latencyMs?: number;
  packetLossPercent?: number;
  reconnects?: number;
  lastErrorCode?: string;
}

/**
 * Meeting session tracks a participant's join/leave during a meeting
 */
export interface IMeetingSession {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId; // Reference to Meeting
  participantId: Types.ObjectId; // Reference to User
  joinedAt: Date;
  leftAt?: Date | null; // null or unset while still in meeting
  connectionMetadata?: ConnectionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const connectionMetadataSchema = new Schema<ConnectionMetadata>(
  {
    iceType: {
      type: String,
      enum: ["host", "srflx", "relay"],
    },
    connectionState: {
      type: String,
      enum: [
        "new",
        "connecting",
        "connected",
        "disconnected",
        "failed",
        "closed",
      ],
    },
    transportType: {
      type: String,
      enum: ["udp", "tcp"],
    },
    latencyMs: Number,
    packetLossPercent: Number,
    reconnects: { type: Number, default: 0 },
    lastErrorCode: String,
  },
  { _id: false },
);

const meetingSessionSchema = new Schema<IMeetingSession>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "MeetingParticipant",
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    leftAt: {
      type: Date,
    },
    connectionMetadata: {
      type: connectionMetadataSchema,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
meetingSessionSchema.index({ meetingId: 1, participantId: 1 });
meetingSessionSchema.index(
  { meetingId: 1, participantId: 1 },
  { unique: true, partialFilterExpression: { leftAt: null } },
);
meetingSessionSchema.index({ meetingId: 1, joinedAt: -1 });
meetingSessionSchema.index({ participantId: 1, joinedAt: -1 });

export const MeetingSession: Model<IMeetingSession> =
  mongoose.models.MeetingSession ??
  mongoose.model<IMeetingSession>("MeetingSession", meetingSessionSchema);