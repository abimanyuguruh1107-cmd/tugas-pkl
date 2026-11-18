import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  timezone: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid organization slug"],
      index: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator(timezone: string) {
          try {
            new Intl.DateTimeFormat("en-US", { timeZone: timezone });
            return true;
          } catch {
            return false;
          }
        },
        message: "Timezone must be a valid IANA timezone",
      },
    },
    settings: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { timestamps: true },
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ??
  mongoose.model<IOrganization>("Organization", organizationSchema);
