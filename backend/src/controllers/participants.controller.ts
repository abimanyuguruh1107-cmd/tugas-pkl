import type { Request, Response } from "express";
import * as service from "../services/meetings/participant.service";
import type { PopulatedUser } from "../models/user.model";
import { ApiError } from "../lib/errors";
import type { MeetingParticipantRole } from "../models/meeting-participant.model";

interface ParticipantCreateBody {
  userId?: string;
  guestEmail?: string;
  role: MeetingParticipantRole;
}

interface ParticipantStatusBody {
  invitationStatus: "invited" | "accepted" | "declined" | "waiting";
}

function requestContext(req: Request): {
  organizationId: string;
  actorId: string;
} {
  const user = req.user as PopulatedUser | undefined;
  if (!req.organizationId || !user) {
    throw ApiError.unauthorized("Organization membership is required");
  }
  return {
    organizationId: req.organizationId.toString(),
    actorId: user._id.toString(),
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const { organizationId, actorId } = requestContext(req);

  res.json({
    data: await service.listParticipants(
      organizationId,
      String(req.params.meetingId),
      actorId,
    ),
  });
}

export async function add(req: Request, res: Response): Promise<void> {
  const { organizationId, actorId } = requestContext(req);
  const body = req.body as ParticipantCreateBody;

  res.status(201).json({
    participant: await service.addParticipant({
      organizationId,
      meetingId: String(req.params.meetingId),
      actorId,
      ...(body.userId ? { userId: body.userId } : {}),
      ...(body.guestEmail ? { guestEmail: body.guestEmail } : {}),
      role: body.role,
    }),
  });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { organizationId, actorId } = requestContext(req);
  const body = req.body as ParticipantStatusBody;

  res.json({
    participant: await service.updateParticipantStatus(
      organizationId,
      String(req.params.meetingId),
      String(req.params.participantId),
      body.invitationStatus,
      actorId,
    ),
  });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { organizationId, actorId } = requestContext(req);
  await service.removeParticipant(
    organizationId,
    String(req.params.meetingId),
    String(req.params.participantId),
    actorId,
  );
  res.status(204).send();
}