import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Sensitive actions that trigger audit events
 */
export enum AuditAction {
  // Authentication
  USER_LOGIN = "user:login",
  USER_LOGOUT = "user:logout",
  USER_REGISTERED = "user:registered",
  PASSWORD_CHANGED = "password:changed",
  PASSWORD_RESET = "password:reset",

  // Organization & Members
  MEMBER_INVITED = "member:invited",
  MEMBER_ACCEPTED = "member:accepted",
  MEMBER_REMOVED = "member:removed",
  ROLE_CHANGED = "role:changed",
  ROLE_CREATED = "role:created",
  ROLE_DELETED = "role:deleted",
  POLICY_CHANGED = "policy:changed",

  // Meetings
  MEETING_CREATED = "meeting:created",
  MEETING_UPDATED = "meeting:updated",
  MEETING_CANCELLED = "meeting:cancelled",
  MEETING_STARTED = "meeting:started",
  MEETING_ENDED = "meeting:ended",

  // Recording
  RECORDING_STARTED = "recording:started",
  RECORDING_STOPPED = "recording:stopped",
  RECORDING_DELETED = "recording:deleted",

  // Minutes & Approval
  MINUTES_DRAFT_CREATED = "minutes:draft_created",
  MINUTES_REVIEW_STARTED = "minutes:review_started",
  MINUTES_APPROVED = "minutes:approved",
  MINUTES_PUBLISHED = "minutes:published",
  MINUTES_REVISED = "minutes:revised",

  // Action Items
  ACTION_ITEM_CREATED = "action_item:created",
  ACTION_ITEM_ASSIGNED = "action_item:assigned",
  ACTION_ITEM_DUE_DATE_CHANGED = "action_item:due_date_changed",
  ACTION_ITEM_STATUS_CHANGED = "action_item:status_changed",
  ACTION_ITEM_COMPLETED = "action_item:completed",

  // Notifications
  NOTIFICATION_SENT = "notification:sent",

  // Transcripts
  TRANSCRIPT_GENERATED = "transcript:generated",
  TRANSCRIPT_CORRECTED = "transcript:corrected",

  // Support Access
  ADMIN_SUPPORT_ACCESS = "admin:support_access",
  DATA_EXPORT = "data:export",
}

/**
 * Audit log document interface
 */
export interface IAuditLog {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  actorId: Types.ObjectId; // User who performed action
  action: AuditAction;
  targetType: string; // "Meeting", "Recording", "Minutes", etc
  targetId?: Types.ObjectId; // ID of affected resource
  status: "success" | "failed";
  statusCode?: number; // HTTP status or app status code
  metadata?: Record<string, unknown>; // Action-specific details
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    statusCode: Number,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound indexes for efficient querying
auditLogSchema.index({ organizationId: 1, timestamp: -1 }); // Timeline
auditLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 }); // Filter by action
auditLogSchema.index({ organizationId: 1, actorId: 1, timestamp: -1 }); // User's actions
auditLogSchema.index({ organizationId: 1, targetType: 1, targetId: 1 }); // Resource audit trail
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // TTL: 1 year

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);