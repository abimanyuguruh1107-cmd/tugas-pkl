[1mdiff --git a/backend/src/models/recording.model.ts b/backend/src/models/recording.model.ts[m
[1mindex d30631f..b3e23bf 100644[m
[1m--- a/backend/src/models/recording.model.ts[m
[1m+++ b/backend/src/models/recording.model.ts[m
[36m@@ -20,23 +20,23 @@[m [mexport enum RecordingProvider {[m
 export interface IRecording {[m
   _id: Types.ObjectId;[m
   organizationId: Types.ObjectId; // Tenant[m
[31m-  meetingId: Types.ObjectId;      // Reference to Meeting[m
[32m+[m[32m  meetingId: Types.ObjectId; // Reference to Meeting[m
   provider: RecordingProvider;[m
[31m-  providerRecordingId?: string;   // External provider's recording ID[m
[31m-  objectKey: string;              // S3/storage path (private)[m
[31m-  mimeType: string;               // video/mp4, etc[m
[31m-  size: number;                   // bytes[m
[31m-  duration: number;               // seconds[m
[32m+[m[32m  providerRecordingId?: string; // External provider's recording ID[m
[32m+[m[32m  objectKey: string; // S3/storage path (private)[m
[32m+[m[32m  mimeType: string; // video/mp4, etc[m
[32m+[m[32m  size: number; // bytes[m
[32m+[m[32m  duration: number; // seconds[m
   status: RecordingStatus;[m
   startedAt: Date;[m
   stoppedAt?: Date;[m
   createdAt: Date;[m
   updatedAt: Date;[m
[31m-  [m
[32m+[m
   // Retention & compliance[m
[31m-  retentionUntil: Date;           // Auto-delete date[m
[31m-  consentRecorded: boolean;       // Participants consented[m
[31m-  [m
[32m+[m[32m  retentionUntil: Date; // Auto-delete date[m
[32m+[m[32m  consentRecorded: boolean; // Participants consented[m
[32m+[m
   // Metadata[m
   participantCount?: number;[m
   hasAudio: boolean;[m
[36m@@ -44,16 +44,6 @@[m [mexport interface IRecording {[m
 }[m
 [m
 const recordingSchema = new Schema<IRecording>([m
[31m-export interface IRecording {[m
[31m-  _id: Types.ObjectId;[m
[31m-  organizationId: Types.ObjectId;[m
[31m-  meetingId: Types.ObjectId;[m
[31m-  storageKey: string;[m
[31m-  status: "processing" | "ready" | "failed";[m
[31m-  createdAt: Date;[m
[31m-  updatedAt: Date;[m
[31m-}[m
[31m-const schema = new Schema<IRecording>([m
   {[m
     organizationId: {[m
       type: Schema.Types.ObjectId,[m
[36m@@ -138,19 +128,5 @@[m [mrecordingSchema.index({ organizationId: 1, retentionUntil: 1 }); // For cleanup[m
 recordingSchema.index({ organizationId: 1, createdAt: -1 }); // For listing[m
 [m
 export const Recording: Model<IRecording> =[m
[31m-  mongoose.models.Recording ?? mongoose.model<IRecording>("Recording", recordingSchema);[m
[31m-    },[m
[31m-    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },[m
[31m-    storageKey: { type: String, required: true, trim: true },[m
[31m-    status: {[m
[31m-      type: String,[m
[31m-      enum: ["processing", "ready", "failed"],[m
[31m-      required: true,[m
[31m-      default: "processing",[m
[31m-    },[m
[31m-  },[m
[31m-  { timestamps: true },[m
[31m-);[m
[31m-schema.index({ organizationId: 1, meetingId: 1 });[m
[31m-export const Recording: Model<IRecording> =[m
[31m-  mongoose.models.Recording ?? mongoose.model<IRecording>("Recording", schema);[m
[32m+[m[32m  mongoose.models.Recording ??[m
[32m+[m[32m  mongoose.model<IRecording>("Recording", recordingSchema);[m
\ No newline at end of file[m
