import { Types } from "mongoose";
import { ApiError } from "../../lib/errors";
import { MeetingAgendaItem } from "../../models/meeting-agenda-item.model";
import { Meeting } from "../../models/meeting.model";
import { assertOrganizationPermission } from "../meetings/meeting-access.service";

export interface AgendaItemInput {
  title?: string;
  description?: string;
  position?: number;
  status?: "pending" | "discussed" | "completed";
}

export interface AgendaOrderItem {
  id: string;
  position: number;
}

async function ensureMeeting(
  organizationId: string,
  meetingId: string,
  userId: string,
  permission: "meetings:read" | "meetings:update",
): Promise<void> {
  await assertOrganizationPermission(organizationId, userId, permission);
  if (!Types.ObjectId.isValid(meetingId)) {
    throw ApiError.badRequest("Invalid meetingId");
  }
  const exists = await Meeting.exists({ _id: meetingId, organizationId });
  if (!exists) throw ApiError.notFound("Meeting not found");
}

export async function listAgenda(
  organizationId: string,
  meetingId: string,
  userId: string,
) {
  await ensureMeeting(organizationId, meetingId, userId, "meetings:read");
  return MeetingAgendaItem.find({ meetingId })
    .sort({ position: 1 })
    .lean();
}

export async function replaceAgenda(
  organizationId: string,
  meetingId: string,
  userId: string,
  items: AgendaOrderItem[],
) {
  await ensureMeeting(organizationId, meetingId, userId, "meetings:update");
  const ids = items.map(({ id }) => id);
  const positions = items.map(({ position }) => position);
  if (
    ids.some((id) => !Types.ObjectId.isValid(id)) ||
    new Set(ids).size !== ids.length ||
    new Set(positions).size !== positions.length
  ) {
    throw ApiError.badRequest("Agenda item IDs and positions must be unique and valid");
  }

  const existing = await MeetingAgendaItem.find({ meetingId }).select("_id").lean();
  if (
    existing.length !== items.length ||
    existing.some(({ _id }) => !ids.includes(_id.toString()))
  ) {
    throw ApiError.badRequest("Items must contain every agenda item in the meeting");
  }

  await MeetingAgendaItem.updateMany(
    { meetingId },
    [{ $set: { position: { $add: ["$position", 1_000_000_000] } } }],
  );
  await Promise.all(
    items.map(({ id, position }) =>
      MeetingAgendaItem.updateOne(
        { _id: id, meetingId },
        { $set: { position } },
      ),
    ),
  );
  return listAgenda(organizationId, meetingId, userId);
}

export async function createAgendaItem(
  organizationId: string,
  meetingId: string,
  userId: string,
  input: { title: string; description?: string; position?: number },
) {
  await ensureMeeting(organizationId, meetingId, userId, "meetings:update");
  const last = await MeetingAgendaItem.findOne({ meetingId })
    .sort({ position: -1 })
    .select("position")
    .lean();
  const position = input.position ?? (last?.position ?? -1) + 1;
  return MeetingAgendaItem.create({
    meetingId,
    title: input.title,
    ...(input.description !== undefined ? { description: input.description } : {}),
    position,
    status: "pending",
  });
}

export async function updateAgendaItem(
  organizationId: string,
  meetingId: string,
  agendaItemId: string,
  userId: string,
  input: AgendaItemInput,
) {
  await ensureMeeting(organizationId, meetingId, userId, "meetings:update");
  if (!Types.ObjectId.isValid(agendaItemId)) {
    throw ApiError.badRequest("Invalid agendaItemId");
  }
  const item = await MeetingAgendaItem.findOneAndUpdate(
    { _id: agendaItemId, meetingId },
    { $set: input },
    { new: true, runValidators: true },
  );
  if (!item) throw ApiError.notFound("Agenda item not found");
  return item;
}

export async function deleteAgendaItem(
  organizationId: string,
  meetingId: string,
  agendaItemId: string,
  userId: string,
): Promise<void> {
  await ensureMeeting(organizationId, meetingId, userId, "meetings:update");
  const result = await MeetingAgendaItem.deleteOne({
    _id: agendaItemId,
    meetingId,
  });
  if (result.deletedCount === 0) throw ApiError.notFound("Agenda item not found");
}
