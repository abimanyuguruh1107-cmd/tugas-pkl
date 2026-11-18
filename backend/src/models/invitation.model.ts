import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IInvitation {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  roleId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).tokenHash;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

// Compound index: one pending invitation per email per organization
invitationSchema.index(
  { organizationId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

// TTL index: automatically delete expired invitations
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation: Model<IInvitation> =
  mongoose.models.Invitation ??
  mongoose.model<IInvitation>("Invitation", invitationSchema);
