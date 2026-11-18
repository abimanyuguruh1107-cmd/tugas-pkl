import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Notification types system-wide
 */
export enum NotificationType {
  // Meeting events
  MEETING_INVITED = "meeting:invited",
  MEETING_STARTED = "meeting:started",
  MEETING_ENDED = "meeting:ended",
  MEETING_CANCELLED = "meeting:cancelled",
  MEETING_RECORDING_STARTED = "meeting:recording_started",
  
  // Processing events
  RECORDING_READY = "recording:ready",
  TRANSCRIPT_READY = "transcript:ready",
  MOM_DRAFT_READY = "mom:draft_ready",
  PROCESSING_FAILED = "processing:failed",
  
  // Minutes workflow
  MOM_NEEDS_REVIEW = "mom:needs_review",
  MOM_APPROVED = "mom:approved",
  MOM_PUBLISHED = "mom:published",
  
  // Action items
  ACTION_ITEM_ASSIGNED = "action_item:assigned",
  ACTION_ITEM_DUE = "action_item:due",
  ACTION_ITEM_OVERDUE = "action_item:overdue",
  
  // Organization
  MEMBER_INVITED = "member:invited",
  MEMBER_JOINED = "member:joined",
  MEMBER_REMOVED = "member:removed",
  ROLE_CHANGED = "role:changed",
  
  // Audit events
  AUDIT_SECURITY_ALERT = "audit:security_alert",
  AUDIT_POLICY_CHANGED = "audit:policy_changed",
}

/**
 * Notification payload structure (flexible JSON)
 */
export interface NotificationPayload {
  title: string;
  body: string;
  action?: string;        // e.g., /meetings/123, /minutes/456
  actionLabel?: string;   // e.g., "View Meeting", "Review Minutes"
  meetingId?: string;
  actionItemId?: string;
  minutesId?: string;
  icon?: string;          // URL for notification icon
  [key: string]: unknown;
}

/**
 * Notification document interface
 */
export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;             // Reference to User
  organizationId: Types.ObjectId;     // Tenant
  type: NotificationType;
  payload: NotificationPayload;
  readAt?: Date;                      // null = unread
  archivedAt?: Date;                  // soft delete
  dedupeKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPayloadSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    action: String,
    actionLabel: String,
    meetingId: String,
    actionItemId: String,
    minutesId: String,
    icon: String,
  },
  { _id: false },
);

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    payload: {
      type: notificationPayloadSchema,
      required: true,
    },
    readAt: {
      type: Date,
      index: true, // For unread queries
    },
    archivedAt: {
      type: Date,
    },
    dedupeKey: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
notificationSchema.index({ userId: 1, readAt: 1 }); // Unread notifications
notificationSchema.index({ userId: 1, createdAt: -1 }); // Timeline
notificationSchema.index({ organizationId: 1, type: 1 }); // Filter by type
notificationSchema.index({ userId: 1, archivedAt: 1 }); // Unarchived
notificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, sparse: true },
);

export const Notification: Model<INotification> =
  mongoose.models.Notification ?? mongoose.model<INotification>("Notification", notificationSchema);
