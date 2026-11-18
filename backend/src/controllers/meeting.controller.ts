import type { Request, Response } from "express";
import { meetingService } from "../services/meetings/meeting.service";
import type { PopulatedUser } from "../models/user.model";
import type { MeetingStatus } from "../lib/meeting-status";
import type { Types } from "mongoose";

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = req.organizationId ?? user._id;

  const status =
    typeof req.query.status === "string"
      ? (req.query.status as MeetingStatus)
      : undefined;

  const result = await meetingService.listMeetings(organizationId, {
    ...(status ? { status } : {}),
    limit: Number(req.query.limit ?? 20),
    skip: Number(req.query.skip ?? 0),
  });

  res.json(result);
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = req.organizationId ?? user._id;

  const meeting = await meetingService.createMeeting({
    organizationId: organizationId as Types.ObjectId,
    hostId: user._id,
    title: req.body.title,
    ...(req.body.description !== undefined ? { description: req.body.description } : {}),
    startAt: new Date(req.body.startAt),
    ...(req.body.endAt !== undefined ? { endAt: new Date(req.body.endAt) } : {}),
    timezone: req.body.timezone,
    ...(req.body.recordingConfig !== undefined ? { recordingConfig: req.body.recordingConfig } : {}),
    ...(req.body.aiConfig !== undefined ? { aiConfig: req.body.aiConfig } : {}),
    ...(req.body.settings !== undefined ? { settings: req.body.settings } : {}),
  });

  res.status(201).json({ meeting });
}

export async function get(req: Request, res: Response): Promise<void> {
  const meeting = await meetingService.getMeeting(String(req.params.meetingId));
  res.json({ meeting });
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = req.organizationId ?? user._id;

  const meeting = await meetingService.updateMeeting(
    String(req.params.meetingId),
    user._id,
    organizationId,
    {
      ...(req.body.title !== undefined ? { title: req.body.title } : {}),
      ...(req.body.description !== undefined ? { description: req.body.description } : {}),
      ...(req.body.startAt !== undefined ? { startAt: new Date(req.body.startAt) } : {}),
      ...(req.body.endAt !== undefined ? { endAt: new Date(req.body.endAt) } : {}),
      ...(req.body.timezone !== undefined ? { timezone: req.body.timezone } : {}),
      ...(req.body.recordingConfig !== undefined ? { recordingConfig: req.body.recordingConfig } : {}),
      ...(req.body.aiConfig !== undefined ? { aiConfig: req.body.aiConfig } : {}),
      ...(req.body.settings !== undefined ? { settings: req.body.settings } : {}),
    }
  );

  res.json({ meeting });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = req.organizationId ?? user._id;

  await meetingService.cancelMeeting(
    String(req.params.meetingId),
    user._id,
    organizationId
  );

  res.status(204).send();
}

export async function transition(req: Request, res: Response): Promise<void> {
  const user = req.user as PopulatedUser;
  const organizationId = req.organizationId ?? user._id;

  // ✅ Panggil method transitionMeeting yang baru ditambahkan di service
  const meeting = await meetingService.transitionMeeting(
    organizationId,
    String(req.params.meetingId),
    user._id.toString(),
    req.body.status as MeetingStatus
  );

  res.json({ meeting });
}