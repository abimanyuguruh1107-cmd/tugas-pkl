import { Types, type HydratedDocument } from "mongoose";
import { ApiError } from "../../lib/errors";
import { AuditAction } from "../../models/audit-log.model";
import { Meeting } from "../../models/meeting.model";
import {
  MinutesDocument,
  type IMinutesDocument,
} from "../../models/minutes-document.model";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { assertOrganizationPermission } from "../meetings/meeting-access.service";
import { createNotification } from "../notifications/notification.service";
import { NotificationType } from "../../models/notification.model";

async function getMinutesDocument(
  minutesId: string,
  organizationId: string,
): Promise<HydratedDocument<IMinutesDocument>> {
  if (!Types.ObjectId.isValid(minutesId)) {
    throw ApiError.badRequest("Invalid minutesId");
  }
  const document = await MinutesDocument.findOne({
    _id: minutesId,
    organizationId,
  });
  if (!document) throw ApiError.notFound("Minutes document not found");
  return document;
}

async function requirePermission(
  organizationId: string,
  userId: string,
  permission: "meeting_minutes:write" | "meeting_minutes:approve" | "meeting_minutes:publish",
): Promise<void> {
  await assertOrganizationPermission(organizationId, userId, permission);
}

export async function listMinutes(
  organizationId: string,
  meetingId: string,
): Promise<IMinutesDocument[]> {
  if (!Types.ObjectId.isValid(meetingId)) {
    throw ApiError.badRequest("Invalid meetingId");
  }
  const meeting = await Meeting.exists({ _id: meetingId, organizationId });
  if (!meeting) throw ApiError.notFound("Meeting not found");
  return MinutesDocument.find({ organizationId, meetingId })
    .sort({ version: -1 })
    .lean<IMinutesDocument[]>();
}

export async function createMinutes(input: {
  organizationId: string;
  meetingId: string;
  userId: string;
  content: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:write",
  );
  const meeting = await Meeting.findOne({
    _id: input.meetingId,
    organizationId: input.organizationId,
  })
    .select("_id")
    .lean();
  if (!meeting) throw ApiError.notFound("Meeting not found");
  const prior = await MinutesDocument.findOne({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
  })
    .sort({ version: -1 })
    .select("version")
    .lean<{ version: number }>();
  const document = await MinutesDocument.create({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
    content: input.content,
    version: (prior?.version ?? 0) + 1,
    status: "draft",
  });
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_DRAFT_CREATED,
    targetType: "MinutesDocument",
    targetId: document._id,
    status: "success",
    metadata: { meetingId: input.meetingId, version: document.version },
  });
  return document.toObject() as IMinutesDocument;
}

export async function updateDraftMinutes(input: {
  organizationId: string;
  minutesId: string;
  userId: string;
  content: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:write",
  );
  const document = await getMinutesDocument(
    input.minutesId,
    input.organizationId,
  );
  if (document.status !== "draft") {
    throw ApiError.conflict("Only draft minutes can be edited");
  }
  document.content = input.content;
  await document.save();
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_REVISED,
    targetType: "MinutesDocument",
    targetId: document._id,
    status: "success",
    metadata: { version: document.version },
  });
  return document.toObject() as IMinutesDocument;
}

export async function submitMinutesForReview(input: {
  organizationId: string;
  minutesId: string;
  userId: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:write",
  );
  const document = await getMinutesDocument(
    input.minutesId,
    input.organizationId,
  );
  if (document.status !== "draft") {
    throw ApiError.conflict("Only draft minutes can be submitted for review");
  }
  document.status = "review";
  await document.save();
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_REVIEW_STARTED,
    targetType: "MinutesDocument",
    targetId: document._id,
    status: "success",
    metadata: { version: document.version },
  });
  return document.toObject() as IMinutesDocument;
}

export async function approveMinutes(input: {
  organizationId: string;
  minutesId: string;
  userId: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:approve",
  );
  const document = await getMinutesDocument(
    input.minutesId,
    input.organizationId,
  );
  if (document.status !== "review") {
    throw ApiError.conflict("Only minutes in review can be approved");
  }
  document.status = "approved";
  document.approvedBy = new Types.ObjectId(input.userId);
  await document.save();
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_APPROVED,
    targetType: "MinutesDocument",
    targetId: document._id,
    status: "success",
    metadata: { version: document.version, meetingId: document.meetingId },
  });
  await createNotification({
    userId: document.approvedBy,
    organizationId: input.organizationId,
    type: NotificationType.MOM_APPROVED,
    payload: {
      title: "Minutes Approved",
      body: "Minutes have been approved",
      action: `/meetings/${document.meetingId.toString()}/minutes`,
      actionLabel: "View Minutes",
      meetingId: document.meetingId.toString(),
    },
  });
  return document.toObject() as IMinutesDocument;
}

export async function publishMinutes(input: {
  organizationId: string;
  minutesId: string;
  userId: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:publish",
  );
  const document = await getMinutesDocument(
    input.minutesId,
    input.organizationId,
  );
  if (document.status !== "review" && document.status !== "approved") {
    throw ApiError.conflict("Only minutes in review or approved can be published");
  }
  const approvalWasCombinedWithPublishing = document.status === "review";
  if (approvalWasCombinedWithPublishing) {
    document.approvedBy = new Types.ObjectId(input.userId);
  }
  document.status = "published";
  document.publishedAt = new Date();
  await document.save();
  if (approvalWasCombinedWithPublishing) {
    await auditLogsService.logAction({
      organizationId: input.organizationId,
      actorId: input.userId,
      action: AuditAction.MINUTES_APPROVED,
      targetType: "MinutesDocument",
      targetId: document._id,
      status: "success",
      metadata: { version: document.version, meetingId: document.meetingId },
    });
  }
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_PUBLISHED,
    targetType: "MinutesDocument",
    targetId: document._id,
    status: "success",
    metadata: { version: document.version, meetingId: document.meetingId },
  });
  await createNotification({
    userId: document.approvedBy ?? new Types.ObjectId(input.userId),
    organizationId: input.organizationId,
    type: NotificationType.MOM_PUBLISHED,
    payload: {
      title: "Minutes Published",
      body: "Official minutes have been published",
      action: `/meetings/${document.meetingId.toString()}/minutes`,
      actionLabel: "View Minutes",
      meetingId: document.meetingId.toString(),
    },
  });
  return document.toObject() as IMinutesDocument;
}

export async function createMinutesRevision(input: {
  organizationId: string;
  minutesId: string;
  userId: string;
  content: string;
}): Promise<IMinutesDocument> {
  await requirePermission(
    input.organizationId,
    input.userId,
    "meeting_minutes:write",
  );
  const previous = await getMinutesDocument(
    input.minutesId,
    input.organizationId,
  );
  const latest = await MinutesDocument.findOne({
    organizationId: input.organizationId,
    meetingId: previous.meetingId,
  })
    .sort({ version: -1 })
    .select("version")
    .lean<{ version: number }>();
  const revision = await MinutesDocument.create({
    organizationId: input.organizationId,
    meetingId: previous.meetingId,
    content: input.content,
    version: (latest?.version ?? previous.version) + 1,
    status: "draft",
  });
  await auditLogsService.logAction({
    organizationId: input.organizationId,
    actorId: input.userId,
    action: AuditAction.MINUTES_REVISED,
    targetType: "MinutesDocument",
    targetId: revision._id,
    status: "success",
    metadata: {
      previousVersion: previous.version,
      version: revision.version,
      meetingId: previous.meetingId,
    },
  });
  return revision.toObject() as IMinutesDocument;
}
