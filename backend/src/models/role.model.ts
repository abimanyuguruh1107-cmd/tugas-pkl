import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IRole {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  name: string;
  description?: string;
  /** Array of `resource:action` permission strings ("*" grants everything). */
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const Role: Model<IRole> =
  mongoose.models.Role ?? mongoose.model<IRole>("Role", roleSchema);
