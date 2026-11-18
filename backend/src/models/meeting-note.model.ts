import mongoose, { Schema, type Model, type Types } from "mongoose";
export interface IMeetingNote {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IMeetingNote>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 10000 },
  },
  { timestamps: true },
);
schema.index({ organizationId: 1, meetingId: 1, createdAt: 1 });
export const MeetingNote: Model<IMeetingNote> =
  mongoose.models.MeetingNote ??
  mongoose.model<IMeetingNote>("MeetingNote", schema);
