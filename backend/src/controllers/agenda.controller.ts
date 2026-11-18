import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import {
  createAgendaItem as createAgendaItemService,
  deleteAgendaItem as deleteAgendaItemService,
  listAgenda,
  replaceAgenda,
  updateAgendaItem as updateAgendaItemService,
  type AgendaItemInput,
  type AgendaOrderItem,
} from "../services/agenda/agenda.service";
import type { PopulatedUser } from "../models/user.model";

function context(req: Request): { organizationId: string; userId: string } {
  const user = req.user as PopulatedUser | undefined;
  if (!req.organizationId || !user) {
    throw ApiError.unauthorized("Organization membership is required");
  }
  return {
    organizationId: req.organizationId.toString(),
    userId: user._id.toString(),
  };
}

export async function getAgenda(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = context(req);
  const agendaItems = await listAgenda(
    organizationId,
    String(req.params.meetingId),
    userId,
  );
  res.json({ agenda: agendaItems });
}

export async function updateAgenda(req: Request, res: Response): Promise<void> {
  const { organizationId, userId } = context(req);
  const items = (req.body as { items: AgendaOrderItem[] }).items;
  const agenda = await replaceAgenda(
    organizationId,
    String(req.params.meetingId),
    userId,
    items,
  );
  res.json({ agenda });
}

export async function createAgendaItem(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = context(req);
  const body = req.body as {
    title: string;
    description?: string;
    position?: number;
  };
  const agendaItem = await createAgendaItemService(
    organizationId,
    String(req.params.meetingId),
    userId,
    body,
  );
  res.status(201).json({ agendaItem });
}

export async function updateAgendaItem(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = context(req);
  const agendaItem = await updateAgendaItemService(
    organizationId,
    String(req.params.meetingId),
    String(req.params.agendaItemId),
    userId,
    req.body as AgendaItemInput,
  );
  res.json({ agendaItem });
}

export async function deleteAgendaItem(
  req: Request,
  res: Response,
): Promise<void> {
  const { organizationId, userId } = context(req);
  await deleteAgendaItemService(
    organizationId,
    String(req.params.meetingId),
    String(req.params.agendaItemId),
    userId,
  );
  res.status(204).send();
}