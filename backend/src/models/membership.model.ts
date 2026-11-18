import mongoose, { Schema, type Model, type Types } from "mongoose";

export type MembershipStatus = "active" | "invited" | "deactivated";

export interface IMembership {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "invited", "deactivated"],
      required: true,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const Membership: Model<IMembership> =
  mongoose.models.Membership ??
  mongoose.model<IMembership>("Membership", membershipSchema);
