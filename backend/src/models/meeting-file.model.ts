import mongoose, { Schema, type Model, type Types } from "mongoose";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export interface IMeetingFile {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  originalName: string;
  objectKey: string;
  mimeType: string;
  size: number;
  uploaderId: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMeetingFile>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    objectKey: { type: String, required: true, trim: true, maxlength: 1024 },
    mimeType: { type: String, required: true, trim: true, maxlength: 255 },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_FILE_SIZE_BYTES,
    },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

schema.index({ organizationId: 1, meetingId: 1, createdAt: -1 });

export const MeetingFile: Model<IMeetingFile> =
  mongoose.models.MeetingFile ??
  mongoose.model<IMeetingFile>("MeetingFile", schema);
