import mongoose, { Schema, type Model, type Types } from "mongoose";
export interface IMeetingRoomState {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  meetingId: Types.ObjectId;
  locked: boolean;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IMeetingRoomState>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    locked: { type: Boolean, required: true, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
schema.index({ organizationId: 1, meetingId: 1 }, { unique: true });
export const MeetingRoomState: Model<IMeetingRoomState> =
  mongoose.models.MeetingRoomState ??
  mongoose.model<IMeetingRoomState>("MeetingRoomState", schema);
