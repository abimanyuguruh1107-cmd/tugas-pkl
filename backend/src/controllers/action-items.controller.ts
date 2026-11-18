import type { Request, Response } from "express";
import { Types } from "mongoose";
import { ApiError } from "../lib/errors";
import { actionItemsService } from "../services/action-items/action-items.service";
import type { PopulatedUser } from "../models/user.model";
import type { ActionItemStatus } from "../models/action-item.model";

function getOrganizationId(req: Request): Types.ObjectId {
  if (!req.organizationId) {
    throw ApiError.unauthorized("Organization context is required");
  }
  return req.organizationId;
}

// GET /action-items
export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = getOrganizationId(req);

  const { ownerId, status, dueBefore } = req.query;

  const options: {
    ownerId?: string;
    status?: ActionItemStatus;
    dueBefore?: Date;
    limit?: number;
    skip?: number;
  } = {
    limit: Number(req.query.limit) || 20,
    skip: Number(req.query.skip) || 0,
  };

  if (ownerId) options.ownerId = ownerId as string;
  if (status) options.status = status as ActionItemStatus;
  if (dueBefore) options.dueBefore = new Date(dueBefore as string);

  const result = await actionItemsService.listActionItems(
    organizationId,
    user._id,
    options,
  );

  res.json({
    actionItems: result.actionItems,
    total: result.total,
  });
}

// POST /meetings/:meetingId/action-items
export async function create(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = getOrganizationId(req);
  const { meetingId } = req.params;

  const actionItem = await actionItemsService.createActionItem(
    meetingId as string,
    {
      title: req.body.title,
      ...(req.body.description !== undefined ? { description: req.body.description } : {}),
      ownerId: new Types.ObjectId(req.body.ownerId as string),
      dueAt: new Date(req.body.dueAt),
      ...(req.body.priority !== undefined ? { priority: req.body.priority } : {}),
      ...(req.body.sourceSegmentId !== undefined ? { sourceSegmentId: req.body.sourceSegmentId } : {}),
      ...(req.body.decisionContext !== undefined ? { decisionContext: req.body.decisionContext } : {}),
    },
    user._id,
    organizationId
  );

  res.status(201).json({ actionItem });
}

// PATCH /action-items/:actionItemId
export async function update(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = getOrganizationId(req);
  const { actionItemId } = req.params;

  const actionItem = await actionItemsService.updateActionItem(
    actionItemId as string,
    {
      ...(req.body.title !== undefined ? { title: req.body.title } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description } : {}),
      ...(req.body.ownerId !== undefined
        ? { ownerId: new Types.ObjectId(req.body.ownerId as string) }
        : {}),
      ...(req.body.dueAt !== undefined ? { dueAt: new Date(req.body.dueAt) } : {}),
      ...(req.body.status !== undefined ? { status: req.body.status as ActionItemStatus } : {}),
      ...(req.body.priority !== undefined ? { priority: req.body.priority } : {}),
    },
    user._id,
    organizationId
  );

  res.json({ actionItem });
}

// T082: POST /action-items/:actionItemId/notes
export async function addProgressNote(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = getOrganizationId(req);
  const { actionItemId } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    throw new Error("Progress note text is required");
  }

  const actionItem = await actionItemsService.addProgressNote(
    actionItemId as string,
    organizationId,
    text,
    user._id
  );

  res.status(201).json({ actionItem });
}

// T082: PATCH /action-items/:actionItemId/status
export async function changeStatus(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = getOrganizationId(req);
  const { actionItemId } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new Error("Status is required");
  }

  const actionItem = await actionItemsService.changeStatus(
    actionItemId as string,
    organizationId,
    status as ActionItemStatus,
    user._id
  );

  res.json({ actionItem });
}