import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ITranscriptSegment {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  transcriptId: Types.ObjectId;
  startMs: number;
  endMs: number;
  speakerLabel?: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    transcriptId: {
      type: Schema.Types.ObjectId,
      ref: "Transcript",
      required: true,
      index: true,
    },
    startMs: { type: Number, required: true, min: 0 },
    endMs: {
      type: Number,
      required: true,
      min: 0,
    },
    speakerLabel: { type: String, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

transcriptSegmentSchema.pre("validate", function () {
  if (this.endMs <= this.startMs) {
    this.invalidate("endMs", "endMs must be after startMs");
  }
});

transcriptSegmentSchema.index({ transcriptId: 1, startMs: 1 });
transcriptSegmentSchema.index({ organizationId: 1, transcriptId: 1, startMs: 1 });

export const TranscriptSegment: Model<ITranscriptSegment> =
  mongoose.models.TranscriptSegment ??
  mongoose.model<ITranscriptSegment>("TranscriptSegment", transcriptSegmentSchema);
