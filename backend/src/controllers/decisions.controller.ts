import type { Request, Response } from "express";
import { decisionService } from "../services/decisions/decisions.service";
import { ApiError } from "../lib/errors";
import type { PopulatedUser } from "../models/user.model";

export async function createDecision(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const { meetingId } = req.params;
  const organizationId = req.organizationId ?? user._id;

  const decision = await decisionService.createDecision({
    meetingId: meetingId as string,
    organizationId,
    text: req.body.text,
    context: req.body.context,
    createdBy: user._id,
  });

  res.status(201).json({ decision });
}

export async function listDecisions(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const { meetingId } = req.params;
  const organizationId = req.organizationId ?? user._id;

  const decisions = await decisionService.listDecisions(meetingId as string, organizationId);
  res.json({ decisions });
}

export async function updateDecisionStatus(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const { decisionId } = req.params;
  const organizationId = req.organizationId ?? user._id;

  // Validasi input status agar sesuai dengan tipe MeetingDecisionStatus
  const allowedStatuses = ["proposed", "confirmed", "rejected"];
  if (!allowedStatuses.includes(req.body.status)) {
    throw ApiError.badRequest("Invalid decision status. Must be proposed, confirmed, or rejected.");
  }

  const decision = await decisionService.updateDecisionStatus(
    decisionId as string,
    organizationId,
    req.body.status,
    user._id
  );

  res.json({ decision });
}