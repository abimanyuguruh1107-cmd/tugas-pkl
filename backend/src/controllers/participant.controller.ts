import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ApiError } from "../lib/errors";
import * as participantService from "../services/participants/participant.service";
import type {
  CreateMeetingParticipantInput,
  UpdateParticipantInput,
} from "../services/participants/participant.service";

const ROLES = ["host", "co-host", "participant", "guest"] as const;
const INVITATION_STATUSES = [
  "invited",
  "accepted",
  "declined",
  "waiting",
] as const;

const createParticipantBodySchema = z.object({
  userId: z.string().optional(),
  guestEmail: z.string().email().max(200).optional(),
  role: z.enum(ROLES),
});

const updateParticipantBodySchema = z
  .object({
    role: z.enum(ROLES).optional(),
    invitationStatus: z.enum(INVITATION_STATUSES).optional(),
  })
  .refine(
    (body) => body.role !== undefined || body.invitationStatus !== undefined,
    { message: "At least one of role or invitationStatus is required" },
  );

function objectIdParam(value: unknown, label: string): string {
  const id = String(value);
  if (!/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest(`Invalid ${label}`);
  }
  return id;
}

export async function listParticipants(
  req: Request,
  res: Response,
): Promise<void> {
  const meetingId = objectIdParam(req.params.meetingId, "meetingId");
  const participants = await participantService.getMeetingParticipants(meetingId);
  res.json({ data: participants });
}

export async function createParticipant(
  req: Request,
  res: Response,
): Promise<void> {
  const meetingId = objectIdParam(req.params.meetingId, "meetingId");
  const body = createParticipantBodySchema.parse(req.body);

  const input: CreateMeetingParticipantInput = { meetingId, role: body.role };
  if (body.userId !== undefined) {
    input.userId = objectIdParam(body.userId, "userId");
  }
  if (body.guestEmail !== undefined) input.guestEmail = body.guestEmail;

  const participant = await participantService.createMeetingParticipant(input);
  res.status(201).json({ participant });
}

export async function updateParticipant(
  req: Request,
  res: Response,
): Promise<void> {
  const meetingId = objectIdParam(req.params.meetingId, "meetingId");
  const participantId = objectIdParam(req.params.participantId, "participantId");
  const body = updateParticipantBodySchema.parse(req.body);

  // The service looks participants up by id only, so make sure the
  // participant really belongs to the meeting named in the URL.
  const existing = await participantService.getParticipantById(participantId);
  if (existing.meetingId.toString() !== meetingId) {
    throw ApiError.notFound("Participant not found");
  }

  const input: UpdateParticipantInput = {};
  if (body.role !== undefined) input.role = body.role;
  if (body.invitationStatus !== undefined) {
    input.invitationStatus = body.invitationStatus;
  }

  const participant = await participantService.updateParticipant(
    participantId,
    input,
  );
  res.json({ participant });
}
