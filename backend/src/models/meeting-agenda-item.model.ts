import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IMeetingAgendaItem {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  title: string;
  description?: string;
  position: number;
  status: "pending" | "discussed" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const meetingAgendaItemSchema = new Schema<IMeetingAgendaItem>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Agenda item title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    position: {
      type: Number,
      required: [true, "Position is required"],
    },
    status: {
      type: String,
      enum: ["pending", "discussed", "completed"],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: position must be unique within a meeting
meetingAgendaItemSchema.index(
  { meetingId: 1, position: 1 },
  { unique: true },
);

export const MeetingAgendaItem: Model<IMeetingAgendaItem> =
  mongoose.models.MeetingAgendaItem ??
  mongoose.model<IMeetingAgendaItem>("MeetingAgendaItem", meetingAgendaItemSchema);