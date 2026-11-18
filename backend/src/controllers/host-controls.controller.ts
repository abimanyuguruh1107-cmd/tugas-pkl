import type { Request, Response } from "express";
import * as controls from "../services/rtc/host-controls.service";
import type { PopulatedUser } from "../models/user.model";

export async function mute(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser; // ✅ Casting aman

  await controls.muteParticipantTrack(
    String(req.organizationId),
    String(req.params.meetingId),
    user._id.toString(),
    req.body.identity,
    req.body.trackSid,
    req.body.muted ?? true,
  );
  res.status(204).send();
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser; // ✅ Casting aman

  await controls.removeParticipant(
    String(req.organizationId),
    String(req.params.meetingId),
    user._id.toString(),
    req.body.identity,
  );
  res.status(204).send();
}

export async function lock(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser; // ✅ Casting aman

  await controls.setRoomLocked(
    String(req.organizationId),
    String(req.params.meetingId),
    user._id.toString(),
    req.body.locked,
  );
  res.status(204).send();
}