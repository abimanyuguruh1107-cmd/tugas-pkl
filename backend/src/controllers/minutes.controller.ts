import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import {
  approveMinutes,
  createMinutes,
  createMinutesRevision,
  listMinutes,
  publishMinutes,
  submitMinutesForReview,
  updateDraftMinutes,
} from "../services/minutes/minutes.service";

function requestContext(req: Request): {
  organizationId: string;
  userId: string;
} {
  if (!req.organizationId || !req.user) {
    throw ApiError.unauthorized("Organization membership is required");
  }
  return {
    organizationId: req.organizationId.toString(),
    userId: req.user._id.toString(),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const { organizationId } = requestContext(req);
  const minutes = await listMinutes(
    organizationId,
    String(req.params.meetingId),
  );
  res.json({ data: minutes });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await createMinutes({
    organizationId,
    meetingId: String(req.params.meetingId),
    userId,
    content: req.body.content as string,
  });
  res.status(201).json({ document });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await updateDraftMinutes({
    organizationId,
    minutesId: String(req.params.minutesId),
    userId,
    content: req.body.content as string,
  });
  res.json({ document });
}

export async function submitForReview(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await submitMinutesForReview({
    organizationId,
    minutesId: String(req.params.minutesId),
    userId,
  });
  res.json({ document });
}

export async function approve(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await approveMinutes({
    organizationId,
    minutesId: String(req.params.minutesId),
    userId,
  });
  res.json({ document });
}

export async function publish(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await publishMinutes({
    organizationId,
    minutesId: String(req.params.minutesId),
    userId,
  });
  res.json({ document });
}

export async function revise(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = requestContext(req);
  const document = await createMinutesRevision({
    organizationId,
    minutesId: String(req.params.minutesId),
    userId,
    content: req.body.content as string,
  });
  res.status(201).json({ document });
}
