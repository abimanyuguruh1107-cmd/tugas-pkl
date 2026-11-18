import type { HydratedDocument, Types } from "mongoose";
import {
  EgressClient,
  EncodedFileOutput,
  S3Upload,
} from "livekit-server-sdk";
import {
  Recording,
  RecordingStatus,
  type IRecording,
} from "../../models/recording.model";
import { Meeting } from "../../models/meeting.model";
import { ApiError } from "../../lib/errors";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../../models/audit-log.model";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

const DEFAULT_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Which status changes are allowed; DELETED is terminal. */
const ALLOWED_TRANSITIONS: Record<RecordingStatus, RecordingStatus[]> = {
  [RecordingStatus.PENDING]: [
    RecordingStatus.RECORDING,
    RecordingStatus.FAILED,
    RecordingStatus.DELETED,
  ],
  [RecordingStatus.RECORDING]: [
    RecordingStatus.PROCESSING,
    RecordingStatus.FAILED,
    RecordingStatus.DELETED,
  ],
  [RecordingStatus.PROCESSING]: [
    RecordingStatus.COMPLETED,
    RecordingStatus.FAILED,
    RecordingStatus.DELETED,
  ],
  [RecordingStatus.COMPLETED]: [RecordingStatus.DELETED],
  [RecordingStatus.FAILED]: [RecordingStatus.DELETED],
  [RecordingStatus.DELETED]: [],
};

/** Metadata that can be stored on a recording after it has been created. */
export interface RecordingMetadataUpdate {
  mimeType?: string;
  size?: number; // bytes
  duration?: number; // seconds
  participantCount?: number;
  hasAudio?: boolean;
  hasVideo?: boolean;
}

export interface RecordingEgressClient {
  start(roomName: string, objectKey: string): Promise<{ egressId: string }>;
  stop(egressId: string): Promise<void>;
}

function createRecordingEgressClient(): RecordingEgressClient {
  const client = new EgressClient(
    env.livekit.url,
    env.livekit.apiKey,
    env.livekit.apiSecret,
  );
  return {
    async start(roomName, objectKey) {
      if (
        !env.storage.enabled ||
        !env.storage.accessKey ||
        !env.storage.secretKey ||
        !env.storage.bucket
      ) {
        throw new ApiError(503, "Recording object storage is not configured");
      }
      const output = new EncodedFileOutput({
        filepath: objectKey,
        output: {
          case: "s3",
          value: new S3Upload({
            accessKey: env.storage.accessKey,
            secret: env.storage.secretKey,
            bucket: env.storage.bucket,
            region: env.storage.region,
            ...(env.storage.endpoint ? { endpoint: env.storage.endpoint } : {}),
          }),
        },
      });
      const result = await client.startRoomCompositeEgress(roomName, output);
      return { egressId: result.egressId };
    },
    async stop(egressId) {
      await client.stopEgress(egressId);
    },
  };
}

let egressClient: RecordingEgressClient | undefined;

export function configureRecordingEgressClient(
  client: RecordingEgressClient | undefined,
): void {
  egressClient = client;
}

function getEgressClient(): RecordingEgressClient {
  return (egressClient ??= createRecordingEgressClient());
}

/**
 * Recording service
 * Manages recording lifecycle: start, stop, consent tracking, storage
 */
class RecordingService {
  /**
   * Start recording for a meeting
   * Validates consent config, creates Recording record, calls LiveKit API
   */
  async startRecording(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<IRecording> {
    const meeting = await Meeting.findOne({
      _id: meetingId,
      organizationId,
    });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    if (!meeting.recordingConfig.enabled) {
      throw ApiError.badRequest("Recording is not enabled for this meeting");
    }

    // Check for existing recording
    const existingRecording = await Recording.findOne({
      organizationId,
      meetingId,
      status: { $ne: RecordingStatus.DELETED },
    });

    if (existingRecording) {
      throw ApiError.conflict("Recording already exists for this meeting");
    }

    const recording = new Recording({
      organizationId,
      meetingId,
      provider: "livekit",
      objectKey: this.generateObjectKey(organizationId, meetingId),
      status: RecordingStatus.PENDING,
      startedAt: new Date(),
      consentRecorded: meeting.recordingConfig.consentRequired,
      hasAudio: true,
      hasVideo: true,
    });

    // Set retention date
    recording.retentionUntil = this.computeRetentionUntil();
    await recording.save();

    try {
      const egress = await getEgressClient().start(
        `meeting-${meetingId.toString()}`,
        recording.objectKey,
      );
      await this.attachProvider(recording._id, egress.egressId);
    } catch (error) {
      await this.failRecording(recording._id);
      logger.error("Could not start LiveKit egress", {
        meetingId: meetingId.toString(),
        recordingId: recording._id.toString(),
        error,
      });
      throw error;
    }

    // Log audit event
    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.RECORDING_STARTED,
      targetType: "Recording",
      targetId: recording._id,
      status: "success",
      metadata: { meetingId, consentRecorded: recording.consentRecorded },
    });

    return recording;
  }

  /**
   * Stop recording
   * Marks as processing, schedules post-processing
   */
  async stopRecording(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<IRecording> {
    const recording = await Recording.findOne({
      organizationId,
      meetingId,
      status: RecordingStatus.RECORDING,
    });

    if (!recording) {
      throw ApiError.badRequest("No active recording found");
    }

    if (!recording.providerRecordingId) {
      throw ApiError.conflict("Recording is missing its LiveKit egress ID");
    }
    await getEgressClient().stop(recording.providerRecordingId);

    recording.status = RecordingStatus.PROCESSING;
    recording.stoppedAt = new Date();
    recording.duration = Math.floor(
      (recording.stoppedAt.getTime() - recording.startedAt.getTime()) / 1000,
    );

    await recording.save();

    // Log audit event
    await auditLogsService.logAction({
      organizationId: recording.organizationId,
      actorId: userId,
      action: AuditAction.RECORDING_STOPPED,
      targetType: "Recording",
      targetId: recording._id,
      status: "success",
      metadata: { duration: recording.duration },
    });

    return recording;
  }

  /**
   * Delete recording (soft delete)
   */
  async deleteRecording(
    recordingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<void> {
    const recording = await Recording.findById(recordingId);
    if (!recording) throw ApiError.notFound("Recording not found");

    recording.status = RecordingStatus.DELETED;
    await recording.save();

    // TODO: Schedule actual deletion after retention period
    // AWS S3 lifecycle policies handle this

    // Log audit event
    await auditLogsService.logAction({
      organizationId: recording.organizationId,
      actorId: userId,
      action: AuditAction.RECORDING_DELETED,
      targetType: "Recording",
      targetId: recording._id,
      status: "success",
    });
  }

  /**
   * Get recording status
   */
  async getRecording(
    recordingId: string | Types.ObjectId,
  ): Promise<IRecording> {
    const recording = await Recording.findById(recordingId);
    if (!recording) throw ApiError.notFound("Recording not found");
    return recording;
  }

  /**
   * Get recording for meeting
   */
  async getRecordingForMeeting(
    meetingId: string | Types.ObjectId,
  ): Promise<IRecording | null> {
    return Recording.findOne({
      meetingId,
      status: { $ne: RecordingStatus.DELETED },
    });
  }

  async listMeetingRecordings(
    organizationId: string | Types.ObjectId,
    meetingId: string | Types.ObjectId,
  ): Promise<IRecording[]> {
    return Recording.find({
      organizationId,
      meetingId,
      status: { $ne: RecordingStatus.DELETED },
    })
      .sort({ createdAt: -1 })
      .lean<IRecording[]>();
  }

  /**
   * List recordings for organization
   */
  async listRecordings(
    organizationId: string | Types.ObjectId,
    options: { limit?: number; skip?: number; status?: RecordingStatus } = {},
  ): Promise<{ recordings: IRecording[]; total: number }> {
    const filter: Record<string, unknown> = {
      organizationId,
      status: { $ne: RecordingStatus.DELETED },
    };

    if (options.status) filter.status = options.status;

    const [recordings, total] = await Promise.all([
      Recording.find(filter)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .lean(),
      Recording.countDocuments(filter),
    ]);

    return { recordings: recordings as unknown as IRecording[], total };
  }

  /**
   * Store the provider's recording ID once the egress has started
   * and move the recording from PENDING to RECORDING.
   */
  async attachProvider(
    recordingId: string | Types.ObjectId,
    providerRecordingId: string,
  ): Promise<IRecording> {
    const recording = await this.loadRecording(recordingId);
    this.assertTransition(recording.status, RecordingStatus.RECORDING);

    recording.providerRecordingId = providerRecordingId;
    recording.status = RecordingStatus.RECORDING;
    await recording.save();
    return recording;
  }

  /**
   * Update recording metadata (size, duration, mime type, ...).
   * Does not change the status.
   */
  async updateMetadata(
    recordingId: string | Types.ObjectId,
    metadata: RecordingMetadataUpdate,
  ): Promise<IRecording> {
    const recording = await this.loadRecording(recordingId);
    if (recording.status === RecordingStatus.DELETED) {
      throw ApiError.conflict("Recording has been deleted");
    }

    this.applyMetadata(recording, metadata);
    await recording.save();
    return recording;
  }

  /**
   * Mark a recording as completed (PROCESSING -> COMPLETED) and store the
   * final metadata reported by the provider.
   */
  async completeRecording(
    recordingId: string | Types.ObjectId,
    metadata: RecordingMetadataUpdate & { objectKey?: string } = {},
  ): Promise<IRecording> {
    const recording = await this.loadRecording(recordingId);
    this.assertTransition(recording.status, RecordingStatus.COMPLETED);

    const { objectKey, ...rest } = metadata;
    if (objectKey !== undefined) {
      if (!objectKey.trim()) {
        throw ApiError.badRequest("objectKey must not be empty");
      }
      recording.objectKey = objectKey;
    }
    this.applyMetadata(recording, rest);

    recording.status = RecordingStatus.COMPLETED;
    await recording.save();
    return recording;
  }

  /**
   * Mark a recording as failed (recording or processing did not finish).
   */
  async failRecording(
    recordingId: string | Types.ObjectId,
  ): Promise<IRecording> {
    const recording = await this.loadRecording(recordingId);
    this.assertTransition(recording.status, RecordingStatus.FAILED);

    recording.status = RecordingStatus.FAILED;
    await recording.save();
    return recording;
  }

  async finishEgress(
    recordingId: string | Types.ObjectId,
    result: {
      succeeded: boolean;
      objectKey?: string;
      duration?: number;
      size?: number;
    },
  ): Promise<IRecording> {
    const recording = await this.loadRecording(recordingId);
    if (!result.succeeded) {
      return this.failRecording(recordingId);
    }
    if (recording.status === RecordingStatus.RECORDING) {
      recording.status = RecordingStatus.PROCESSING;
      recording.stoppedAt = new Date();
      await recording.save();
    }
    return this.completeRecording(recordingId, {
      ...(result.objectKey ? { objectKey: result.objectKey } : {}),
      ...(result.duration !== undefined ? { duration: result.duration } : {}),
      ...(result.size !== undefined ? { size: result.size } : {}),
    });
  }

  /**
   * Change the date after which the recording may be deleted.
   */
  async setRetention(
    recordingId: string | Types.ObjectId,
    retentionUntil: Date,
  ): Promise<IRecording> {
    if (
      !(retentionUntil instanceof Date) ||
      Number.isNaN(retentionUntil.getTime())
    ) {
      throw ApiError.badRequest("retentionUntil must be a valid date");
    }

    const recording = await this.loadRecording(recordingId);
    if (recording.status === RecordingStatus.DELETED) {
      throw ApiError.conflict("Recording has been deleted");
    }
    if (retentionUntil.getTime() <= recording.startedAt.getTime()) {
      throw ApiError.badRequest("retentionUntil must be after the recording start");
    }

    recording.retentionUntil = retentionUntil;
    await recording.save();
    return recording;
  }

  /**
   * Retention date for a recording created at `from`.
   * Days come from RECORDING_RETENTION_DAYS (default 90).
   */
  private computeRetentionUntil(from: Date = new Date()): Date {
    const parsed = Number(process.env.RECORDING_RETENTION_DAYS);
    const days =
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
    return new Date(from.getTime() + days * DAY_MS);
  }

  private async loadRecording(recordingId: string | Types.ObjectId) {
    const recording = await Recording.findById(recordingId);
    if (!recording) throw ApiError.notFound("Recording not found");
    return recording;
  }

  private assertTransition(from: RecordingStatus, to: RecordingStatus): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw ApiError.conflict(`Cannot change recording status from ${from} to ${to}`);
    }
  }

  private applyMetadata(
    recording: HydratedDocument<IRecording>,
    metadata: RecordingMetadataUpdate,
  ): void {
    const numeric = {
      size: metadata.size,
      duration: metadata.duration,
      participantCount: metadata.participantCount,
    };
    for (const [field, value] of Object.entries(numeric)) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw ApiError.badRequest(`${field} must be a non-negative number`);
      }
    }

    if (metadata.mimeType !== undefined) recording.mimeType = metadata.mimeType;
    if (metadata.size !== undefined) recording.size = metadata.size;
    if (metadata.duration !== undefined) {
      recording.duration = Math.floor(metadata.duration);
    }
    if (metadata.participantCount !== undefined) {
      recording.participantCount = metadata.participantCount;
    }
    if (metadata.hasAudio !== undefined) recording.hasAudio = metadata.hasAudio;
    if (metadata.hasVideo !== undefined) recording.hasVideo = metadata.hasVideo;
  }

  /**
   * Generate S3 object key for recording
   * Format: recordings/org-{orgId}/meeting-{meetingId}/recording-{timestamp}.mp4
   */
  private generateObjectKey(
    organizationId: string | Types.ObjectId,
    meetingId: string | Types.ObjectId,
  ): string {
    const timestamp = Date.now();
    return `recordings/org-${organizationId}/meeting-${meetingId}/recording-${timestamp}.mp4`;
  }
}

export const recordingService = new RecordingService();