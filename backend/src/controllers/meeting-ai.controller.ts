import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import {
  configureMeetingAi,
  configureOrganizationAi,
  extractDecisions,
} from "../services/meeting-ai/ai-decisions.service";
import { aiMomService } from "../services/meeting-ai/ai-mom.service";
import { assertOrganizationPermission } from "../services/meetings/meeting-access.service";

function actor(req: Request): string {
  const userId = req.user?._id.toString();
  if (!userId) throw ApiError.unauthorized();
  return userId;
}

export async function decisions(req: Request, res: Response): Promise<void> {
  res.json({
    proposedDecisions: await extractDecisions(
      String(req.organizationId),
      String(req.params.meetingId),
      req.body.transcript as string,
    ),
  });
}

export async function generateMeetingAi(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.organizationId) {
    throw ApiError.unauthorized("Organization context is required");
  }
  const result = await aiMomService.generateMom(
    String(req.params.meetingId),
    req.organizationId,
    actor(req),
  );
  res.status(201).json(result);
}

export async function updateOrganizationSettings(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = String(req.organizationId);
  await assertOrganizationPermission(
    organizationId,
    actor(req),
    "meeting_ai:manage",
  );
  await configureOrganizationAi(
    organizationId,
    req.body.enabled as boolean,
    req.body.retentionDays as number | undefined,
  );
  res.json({
    enabled: req.body.enabled,
    retentionDays: req.body.retentionDays,
  });
}

export async function updateMeetingSettings(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = String(req.organizationId);
  await assertOrganizationPermission(
    organizationId,
    actor(req),
    "meeting_ai:manage",
  );
  await configureMeetingAi(
    organizationId,
    String(req.params.meetingId),
    req.body.enabled as boolean,
  );
  res.json({ meetingId: req.params.meetingId, enabled: req.body.enabled });
}
