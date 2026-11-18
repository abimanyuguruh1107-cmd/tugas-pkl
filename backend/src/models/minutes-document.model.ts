import mongoose, { Schema, type Model, type Types } from "mongoose";

export type MinutesStatus = "draft" | "review" | "approved" | "published";

export interface IMinutesDocument {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  meetingId: Types.ObjectId;
  content: string;
  status: MinutesStatus;
  version: number;
  approvedBy?: Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const minutesDocumentSchema = new Schema<IMinutesDocument>(
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
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "review", "approved", "published"],
      required: true,
      default: "draft",
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    publishedAt: Date,
  },
  { timestamps: true },
);

// One document per (tenant, meeting, version); version -1 gives latest-first lookups
minutesDocumentSchema.index(
  { organizationId: 1, meetingId: 1, version: -1 },
  { unique: true },
);

export const MinutesDocument: Model<IMinutesDocument> =
  mongoose.models.MinutesDocument ??
  mongoose.model<IMinutesDocument>("MinutesDocument", minutesDocumentSchema);