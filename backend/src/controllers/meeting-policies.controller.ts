import type { Request, Response } from "express";
import { Types } from "mongoose";
import { ApiError } from "../lib/errors";
import { AuditAction } from "../models/audit-log.model";
import { Organization } from "../models/organization.model";
import { auditLogsService } from "../services/audit-logs/audit-logs.service";
import { assertOrganizationPermission } from "../services/meetings/meeting-access.service";
import {
  meetingPolicyPatchSchema,
  resolveMeetingPolicy,
} from "../validators/meeting-settings.schema";

function context(req: Request): { organizationId: Types.ObjectId; userId: string } {
  if (!req.organizationId || !req.user) {
    throw ApiError.unauthorized("Organization membership is required");
  }
  return {
    organizationId: req.organizationId,
    userId: req.user._id.toString(),
  };
}

function validateOrganizationPath(
  req: Request,
  organizationId: Types.ObjectId,
): void {
  const pathId = String(req.params.organizationId);
  if (
    !Types.ObjectId.isValid(pathId) ||
    !new Types.ObjectId(pathId).equals(organizationId)
  ) {
    throw ApiError.forbidden("Organization path does not match tenant context");
  }
}

export async function getMeetingPolicies(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = context(req);
  validateOrganizationPath(req, organizationId);
  await assertOrganizationPermission(
    organizationId.toString(),
    userId,
    "meeting_policies:read",
  );
  const organization = await Organization.findById(organizationId)
    .select("settings")
    .lean();
  if (!organization) throw ApiError.notFound("Organization not found");
  res.json({
    policies: resolveMeetingPolicy(
      organization.settings as Record<string, unknown>,
    ),
  });
}

export async function updateMeetingPolicies(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = context(req);
  validateOrganizationPath(req, organizationId);
  await assertOrganizationPermission(
    organizationId.toString(),
    userId,
    "meeting_policies:manage",
  );
  const patch = meetingPolicyPatchSchema.parse(req.body);
  const organization = await Organization.findById(organizationId)
    .select("settings")
    .lean();
  if (!organization) throw ApiError.notFound("Organization not found");

  const settings = organization.settings as Record<string, unknown>;
  const current = resolveMeetingPolicy(settings);
  const policies = resolveMeetingPolicy({
    meetingPolicy: { ...current, ...patch },
  });
  await Organization.updateOne(
    { _id: organizationId },
    { $set: { "settings.meetingPolicy": policies } },
    { runValidators: true },
  );
  await auditLogsService.logAction({
    organizationId,
    actorId: new Types.ObjectId(userId),
    action: AuditAction.POLICY_CHANGED,
    targetType: "Organization",
    targetId: organizationId,
    status: "success",
    metadata: { changedFields: Object.keys(patch) },
  });
  res.json({ policies });
}
