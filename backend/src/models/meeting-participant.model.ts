import mongoose, { Schema, type Model, type Types } from "mongoose";

export const MEETING_PARTICIPANT_ROLES = [
  "host",
  "co-host",
  "participant",
  "guest",
] as const;
export type MeetingParticipantRole = (typeof MEETING_PARTICIPANT_ROLES)[number];

export const PARTICIPATION_STATUSES = [
  "invited",
  "accepted",
  "declined",
  "waiting",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

/**
 * Meeting participant (invitee/attendee)
 */
export interface IMeetingParticipant {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId; // Tenant
  meetingId: Types.ObjectId;
  userId?: Types.ObjectId; // absent for guests
  guestEmail?: string; // set for guests
  role: MeetingParticipantRole;
  invitationStatus: ParticipationStatus;
  joinedAt?: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingParticipantSchema = new Schema<IMeetingParticipant>(
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    guestEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    role: {
      type: String,
      enum: MEETING_PARTICIPANT_ROLES,
      required: true,
    },
    invitationStatus: {
      type: String,
      enum: PARTICIPATION_STATUSES,
      required: true,
      default: "invited",
    },
    joinedAt: Date,
    leftAt: Date,
  },
  { timestamps: true },
);

meetingParticipantSchema.pre("validate", function () {
  const hasUserId = this.userId !== undefined;
  const hasGuestEmail = Boolean(this.guestEmail);
  if (hasUserId === hasGuestEmail) {
    this.invalidate(
      "userId",
      "Exactly one of userId or guestEmail must be provided",
    );
    this.invalidate(
      "guestEmail",
      "Exactly one of userId or guestEmail must be provided",
    );
  }
});

// Query indexes
meetingParticipantSchema.index({ organizationId: 1, meetingId: 1 });
meetingParticipantSchema.index({ organizationId: 1, userId: 1 });
meetingParticipantSchema.index({ meetingId: 1, invitationStatus: 1 });

// One participant (user or guest) per meeting.
// Partial indexes, because a plain sparse compound index would still index
// documents that lack userId/guestEmail (meetingId always exists) and make
// all guests collide on a null userId.
meetingParticipantSchema.index(
  { meetingId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } },
);
meetingParticipantSchema.index(
  { meetingId: 1, guestEmail: 1 },
  { unique: true, partialFilterExpression: { guestEmail: { $exists: true } } },
);

export const MeetingParticipant: Model<IMeetingParticipant> =
  mongoose.models.MeetingParticipant ??
  mongoose.model<IMeetingParticipant>(
    "MeetingParticipant",
    meetingParticipantSchema,
  );