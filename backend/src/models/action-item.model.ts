import mongoose, { Schema, type Model, type Types } from "mongoose";

export const ACTION_ITEM_STATUSES = [
  "open",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const;

export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

export interface IActionItemProgressNote {
  _id: Types.ObjectId;
  text: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IActionItem {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  title: string;
  description?: string;
  ownerId: Types.ObjectId;
  dueAt: Date;
  status: ActionItemStatus;
  priority: "low" | "medium" | "high";
  sourceSegment?: Types.ObjectId;
  decisionContext?: string;
  auditTrail: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    changedBy: Types.ObjectId;
    changedAt: Date;
  }>;
  progressNotes: IActionItemProgressNote[];
  dueReminderSentAt?: Date;
  overdueReminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const progressNoteSchema = new Schema<IActionItemProgressNote>(
  {
    text: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const actionItemSchema = new Schema<IActionItem>(
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
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ACTION_ITEM_STATUSES,
      default: "open",
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    sourceSegment: {
      type: Schema.Types.ObjectId,
      ref: "TranscriptSegment",
    },
    decisionContext: { type: String },
    auditTrail: [
      {
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        changedAt: { type: Date, required: true },
      },
    ],
    progressNotes: {
      type: [progressNoteSchema],
      default: [],
    },
    dueReminderSentAt: Date,
    overdueReminderSentAt: Date,
  },
  { timestamps: true },
);

actionItemSchema.index({ organizationId: 1, status: 1 });
actionItemSchema.index({ organizationId: 1, ownerId: 1 });
actionItemSchema.index({ meetingId: 1 });
actionItemSchema.index({ status: 1, dueAt: 1 });

export const ActionItem: Model<IActionItem> =
  mongoose.models.ActionItem ??
  mongoose.model<IActionItem>("ActionItem", actionItemSchema);