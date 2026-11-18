import mongoose, { type Types } from "mongoose";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { Meeting } from "../../models/meeting.model";
import { MeetingStatus, validateMeetingTransition } from "../../lib/meeting-status";
import { MeetingParticipant } from "../../models/meeting-participant.model";
import { MeetingSession } from "../../models/meeting-session.model";
import { Membership } from "../../models/membership.model";
import { Organization } from "../../models/organization.model";
import { ApiError } from "../../lib/errors";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../../models/audit-log.model";
import { env } from "../../config/env";
import type { IMeeting } from "../../models/meeting.model";
import { validateMeetingSettings } from "../../validators/meeting-settings.schema";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const transitions: Readonly<Record<MeetingStatus, readonly MeetingStatus[]>> = {
  [MeetingStatus.DRAFT]: [MeetingStatus.SCHEDULED, MeetingStatus.CANCELLED],
  [MeetingStatus.SCHEDULED]: [MeetingStatus.LIVE, MeetingStatus.CANCELLED],
  [MeetingStatus.LIVE]: [MeetingStatus.ENDED, MeetingStatus.CANCELLED],
  [MeetingStatus.ENDED]: [
    MeetingStatus.PROCESSING,
    MeetingStatus.COMPLETED,
    MeetingStatus.CANCELLED,
  ],
  [MeetingStatus.PROCESSING]: [MeetingStatus.COMPLETED],
  [MeetingStatus.COMPLETED]: [],
  [MeetingStatus.CANCELLED]: [],
};

function toDate(value: Date | string, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`${field} must be a valid date`);
  }
  return date;
}

function validateMeetingDateRange(
  startAt: Date | string,
  endAt: Date | string,
): { startAt: Date; endAt: Date } {
  const start = toDate(startAt, "startAt");
  const end = toDate(endAt, "endAt");
  if (end.getTime() <= start.getTime()) {
    throw ApiError.badRequest("endAt must be after startAt");
  }
  return { startAt: start, endAt: end };
}

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw ApiError.badRequest("timezone must be a valid IANA timezone");
  }
}

function assertObjectId(value: string | Types.ObjectId, field: string): void {
  if (!mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`${field} must be a valid ObjectId`);
  }
}

async function assertOrganizationPermission(
  organizationId: string,
  userId: string,
  permission: string,
): Promise<void> {
  const membership = await Membership.findOne({
    organizationId,
    userId,
    status: "active",
  }).lean();
  if (!membership) {
    throw ApiError.forbidden(`Missing permission: ${permission}`);
  }
}

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

class MeetingService {
  async transitionToProcessing(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<void> {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    if (meeting.status !== MeetingStatus.ENDED) {
      throw ApiError.badRequest(
        `Meeting must be in ENDED status to transition to PROCESSING, current: ${meeting.status}`,
      );
    }

    validateMeetingTransition(MeetingStatus.ENDED, MeetingStatus.PROCESSING);

    const hasRecording = meeting.recordingConfig.enabled;
    const hasAI = meeting.aiConfig.enabled;

    meeting.status = MeetingStatus.PROCESSING;
    if (hasRecording) meeting.set("transcriptStatus", "pending");
    if (hasAI) meeting.set("aiStatus", "pending");
    await meeting.save();

    if (hasRecording && env.recording.enabled) {
      const redisConn = new IORedis(env.redis.url);
      const transcriptionQueue = new Queue("transcription", {
        connection: redisConn,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 3_000 },
        },
      });
      await transcriptionQueue.add("transcribe", {
        meetingId: meeting._id.toString(),
        recordingId: meeting._id.toString(),
      });
      await transcriptionQueue.close();
      await redisConn.quit();
    }

    if (hasAI && env.ai.enabled) {
      const redisConn = new IORedis(env.redis.url);
      const aiMomQueue = new Queue("ai-mom", {
        connection: redisConn,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 3_000 },
        },
      });
      await aiMomQueue.add("generate", { meetingId: meeting._id.toString() });
      await aiMomQueue.close();
      await redisConn.quit();
    }

    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.MEETING_ENDED,
      targetType: "Meeting",
      targetId: meeting._id,
      status: "success",
      metadata: {
        transition: `${MeetingStatus.ENDED} → ${MeetingStatus.PROCESSING}`,
        hasRecording,
        hasAI,
        transcriptStatus: meeting.get("transcriptStatus"),
        aiStatus: meeting.get("aiStatus"),
      },
    });
  }

  async createMeeting(input: {
    organizationId: Types.ObjectId;
    hostId: Types.ObjectId;
    title: string;
    description?: string;
    startAt: Date;
    endAt?: Date;
    timezone: string;
    recordingConfig?: { enabled: boolean; consentRequired: boolean };
    aiConfig?: {
      enabled: boolean;
      generateSummary: boolean;
      extractDecisions: boolean;
      extractActionItems: boolean;
    };
    settings?: Partial<IMeeting["settings"]>;
  }): Promise<IMeeting> {
    if (input.endAt && input.endAt <= input.startAt) {
      throw ApiError.badRequest("endAt must be after startAt");
    }

    const organization = await Organization.findById(input.organizationId)
      .select("settings")
      .lean();
    if (!organization) throw ApiError.notFound("Organization not found");
    const requestedRecording =
      input.recordingConfig?.enabled ?? input.settings?.recordingEnabled ?? false;
    const requestedAi = input.aiConfig?.enabled ?? input.settings?.aiEnabled ?? false;
    const validatedSettings = validateMeetingSettings(
      {
        waitingRoom:
          input.settings?.waitingRoom ??
          input.settings?.waitingRoomEnabled ??
          false,
        guestAccess: input.settings?.guestAccess ?? false,
        ...(input.settings?.passcode !== undefined
          ? { passcode: input.settings.passcode }
          : {}),
        recordingEnabled: requestedRecording,
        aiEnabled: requestedAi,
      },
      organization.settings as Record<string, unknown>,
    );

    const meeting = new Meeting({
      organizationId: input.organizationId,
      hostId: input.hostId,
      title: input.title,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      startAt: input.startAt,
      ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
      timezone: input.timezone,
      status: MeetingStatus.DRAFT,
      recordingConfig: input.recordingConfig ?? {
        enabled: validatedSettings.recordingEnabled,
        consentRequired: true,
      },
      aiConfig: input.aiConfig ?? {
        enabled: validatedSettings.aiEnabled,
        generateSummary: false,
        extractDecisions: false,
        extractActionItems: false,
      },
      settings: {
        ...(input.settings ?? {}),
        waitingRoomEnabled: validatedSettings.waitingRoom,
        waitingRoom: validatedSettings.waitingRoom,
        guestAccess: validatedSettings.guestAccess,
        ...(validatedSettings.passcode !== undefined
          ? { passcode: validatedSettings.passcode }
          : {}),
        recordingEnabled: validatedSettings.recordingEnabled,
        aiEnabled: validatedSettings.aiEnabled,
        participantsMuted: input.settings?.participantsMuted ?? false,
        allowRecording: validatedSettings.recordingEnabled,
      },
    });

    await meeting.save();

    await auditLogsService.logAction({
      organizationId: input.organizationId,
      actorId: input.hostId,
      action: AuditAction.MEETING_CREATED,
      targetType: "Meeting",
      targetId: meeting._id,
      status: "success",
      metadata: { title: input.title, startAt: input.startAt },
    });

    return meeting.toObject() as IMeeting;
  }

  async updateMeeting(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    input: {
      title?: string;
      description?: string;
      startAt?: Date;
      endAt?: Date;
      timezone?: string;
      recordingConfig?: { enabled: boolean; consentRequired: boolean };
      aiConfig?: {
        enabled: boolean;
        generateSummary: boolean;
        extractDecisions: boolean;
        extractActionItems: boolean;
      };
      settings?: Partial<IMeeting["settings"]>;
    },
  ): Promise<IMeeting> {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    if (meeting.hostId.toString() !== userId.toString()) {
      throw ApiError.forbidden("Only host can update meeting");
    }

    if (
      meeting.status === MeetingStatus.LIVE ||
      meeting.status === MeetingStatus.ENDED ||
      meeting.status === MeetingStatus.COMPLETED ||
      meeting.status === MeetingStatus.CANCELLED
    ) {
      throw ApiError.badRequest(`Cannot update meeting with status ${meeting.status}`);
    }

    if (input.endAt && input.startAt && input.endAt <= input.startAt) {
      throw ApiError.badRequest("endAt must be after startAt");
    }

    const organization = await Organization.findById(organizationId)
      .select("settings")
      .lean();
    if (!organization) throw ApiError.notFound("Organization not found");
    const requestedSettings = { ...meeting.settings, ...input.settings };
    const validatedSettings = validateMeetingSettings(
      {
        waitingRoom:
          requestedSettings.waitingRoom ??
          requestedSettings.waitingRoomEnabled ??
          false,
        guestAccess: requestedSettings.guestAccess ?? false,
        ...(requestedSettings.passcode !== undefined
          ? { passcode: requestedSettings.passcode }
          : {}),
        recordingEnabled:
          input.recordingConfig?.enabled ??
          requestedSettings.recordingEnabled ??
          meeting.recordingConfig.enabled,
        aiEnabled:
          input.aiConfig?.enabled ??
          requestedSettings.aiEnabled ??
          meeting.aiConfig.enabled,
      },
      organization.settings as Record<string, unknown>,
    );

    if (input.title !== undefined) meeting.title = input.title;
    if (input.description !== undefined) meeting.description = input.description;
    if (input.startAt !== undefined) meeting.startAt = input.startAt;
    if (input.endAt !== undefined) meeting.endAt = input.endAt;
    if (input.timezone !== undefined) meeting.timezone = input.timezone;
    if (input.recordingConfig !== undefined)
      meeting.recordingConfig = input.recordingConfig;
    if (input.aiConfig !== undefined) meeting.aiConfig = input.aiConfig;
    if (input.settings !== undefined) {
      meeting.settings = { ...meeting.settings, ...input.settings };
    }
    meeting.settings.waitingRoom = validatedSettings.waitingRoom;
    meeting.settings.waitingRoomEnabled = validatedSettings.waitingRoom;
    meeting.settings.guestAccess = validatedSettings.guestAccess;
    if (validatedSettings.passcode !== undefined) {
      meeting.settings.passcode = validatedSettings.passcode;
    } else {
      meeting.set("settings.passcode", undefined);
    }
    meeting.settings.recordingEnabled = validatedSettings.recordingEnabled;
    meeting.settings.aiEnabled = validatedSettings.aiEnabled;
    if (input.recordingConfig === undefined) {
      meeting.recordingConfig.enabled = validatedSettings.recordingEnabled;
    }
    if (input.aiConfig === undefined) {
      meeting.aiConfig.enabled = validatedSettings.aiEnabled;
    }

    await meeting.save();

    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.MEETING_UPDATED,
      targetType: "Meeting",
      targetId: meeting._id,
      status: "success",
      metadata: { updatedFields: Object.keys(input) },
    });

    return meeting.toObject() as IMeeting;
  }

  async cancelMeeting(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<void> {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");

    if (meeting.hostId.toString() !== userId.toString()) {
      throw ApiError.forbidden("Only host can cancel meeting");
    }

    validateMeetingTransition(meeting.status as MeetingStatus, MeetingStatus.CANCELLED);

    meeting.status = MeetingStatus.CANCELLED;
    await meeting.save();

    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.MEETING_CANCELLED,
      targetType: "Meeting",
      targetId: meeting._id,
      status: "success",
    });
  }

  async listMeetings(
    organizationId: string | Types.ObjectId,
    options: { limit?: number; skip?: number; status?: MeetingStatus } = {},
  ): Promise<{ meetings: IMeeting[]; total: number }> {
    const filter: Record<string, unknown> = { organizationId };
    if (options.status) filter.status = options.status;

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .sort({ startAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .lean<IMeeting[]>(),
      Meeting.countDocuments(filter),
    ]);

    return { meetings, total };
  }

  async getMeeting(
    meetingId: string | Types.ObjectId,
    organizationId?: string | Types.ObjectId,
  ): Promise<IMeeting> {
    const meeting = await Meeting.findOne({
      _id: meetingId,
      ...(organizationId !== undefined ? { organizationId } : {}),
    }).lean<IMeeting>();
    if (!meeting) throw ApiError.notFound("Meeting not found");
    return meeting;
  }

  async listParticipants(meetingId: string | Types.ObjectId) {
    return MeetingParticipant.find({ meetingId }).lean();
  }

  async addParticipant(
    meetingId: string | Types.ObjectId,
    input: {
      organizationId: string | Types.ObjectId;
      userId?: string | Types.ObjectId;
      guestEmail?: string;
      role?: string;
    },
  ) {
    const participant = new MeetingParticipant({
      meetingId,
      organizationId: input.organizationId,
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.guestEmail !== undefined
        ? { guestEmail: input.guestEmail }
        : {}),
      role: input.role ?? "guest",
      invitationStatus: "pending",
    });
    await participant.save();
    return participant;
  }

  async updateParticipant(
    _meetingId: string | Types.ObjectId,
    participantId: string | Types.ObjectId,
    input: {
      role?: string;
      invitationStatus?: string;
    },
  ) {
    const participant = await MeetingParticipant.findByIdAndUpdate(
      participantId,
      input,
      { new: true },
    );
    if (!participant) throw ApiError.notFound("Participant not found");
    return participant;
  }

  async removeParticipant(
    _meetingId: string | Types.ObjectId,
    participantId: string | Types.ObjectId,
  ): Promise<void> {
    await MeetingParticipant.findByIdAndDelete(participantId);
  }

  async getJoinToken(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<string> {
    return `livekit-token-${meetingId}-${userId}`;
  }

  async endMeeting(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw ApiError.notFound("Meeting not found");
    if (meeting.hostId.toString() !== userId.toString()) {
      throw ApiError.forbidden("Only host can end meeting");
    }
    if (meeting.status !== MeetingStatus.LIVE) {
      throw ApiError.badRequest(`Cannot end meeting with status ${meeting.status}`);
    }
    validateMeetingTransition(meeting.status as MeetingStatus, MeetingStatus.ENDED);
    meeting.status = MeetingStatus.ENDED;
    meeting.endAt = new Date();
    await meeting.save();
    return { meetingId, status: meeting.status, endedAt: meeting.endAt };
  }

  async startRecording(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw ApiError.notFound("Meeting not found");
    if (meeting.hostId.toString() !== userId.toString()) {
      throw ApiError.forbidden("Only host can start recording");
    }
    if (meeting.status !== MeetingStatus.LIVE) {
      throw ApiError.badRequest("Meeting must be LIVE");
    }
    if (!meeting.recordingConfig.enabled) {
      throw ApiError.badRequest("Recording not enabled");
    }
    return { message: "Recording started", meetingId };
  }

  async stopRecording(
    meetingId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw ApiError.notFound("Meeting not found");
    if (meeting.hostId.toString() !== userId.toString()) {
      throw ApiError.forbidden("Only host can stop recording");
    }
    return { message: "Recording stopped", meetingId };
  }

  async getAttendance(meetingId: string | Types.ObjectId) {
    return MeetingSession.find({ meetingId })
      .populate("participantId", "name email")
      .lean();
  }

  async validateAndCreate(input: {
    organizationId: string | Types.ObjectId;
    createdBy: string | Types.ObjectId;
    title: string;
    description?: string;
    startAt: Date | string;
    endAt: Date | string;
    timezone: string;
    status: MeetingStatus;
    hostId: string | Types.ObjectId;
    settings: Record<string, unknown>;
  }): Promise<IMeeting> {
    await assertOrganizationPermission(
      String(input.organizationId),
      String(input.createdBy),
      "meetings:create",
    );
    assertObjectId(input.hostId, "hostId");
    const { startAt, endAt } = validateMeetingDateRange(input.startAt, input.endAt);
    assertTimezone(input.timezone);
    const [organization, hostMembership] = await Promise.all([
      Organization.exists({ _id: input.organizationId }),
      Membership.exists({
        organizationId: input.organizationId,
        userId: input.hostId,
        status: "active",
      }),
    ]);
    if (!organization) throw ApiError.notFound("Organization not found");
    if (!hostMembership) {
      throw ApiError.badRequest("Host must be an active organization member");
    }
    const meeting = await Meeting.create({ ...input, startAt, endAt });
    return meeting.toObject() as IMeeting;
  }

  async transitionMeeting(
    organizationId: string | Types.ObjectId,
    meetingId: string,
    actorId: string,
    nextStatus: MeetingStatus,
  ): Promise<IMeeting> {
    assertObjectId(organizationId, "organizationId");
    assertObjectId(meetingId, "meetingId");
    await assertOrganizationPermission(
      String(organizationId),
      actorId,
      nextStatus === MeetingStatus.CANCELLED
        ? "meetings:cancel"
        : "meetings:update",
    );
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");
    if (!transitions[meeting.status].includes(nextStatus)) {
      throw ApiError.conflict(
        `Cannot transition meeting from ${meeting.status} to ${nextStatus}`,
      );
    }
    const updated = await Meeting.findOneAndUpdate(
      { _id: meetingId, organizationId, status: meeting.status },
      { $set: { status: nextStatus } },
      { new: true, runValidators: true },
    ).lean<IMeeting>();
    if (!updated) {
      throw ApiError.conflict("Meeting state changed; reload and retry");
    }
    return updated;
  }
}

export const meetingService = new MeetingService();