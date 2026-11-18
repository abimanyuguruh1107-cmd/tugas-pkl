import { Router } from "express";
import { MeetingAgendaItem } from "../models/meeting-agenda-item.model";
import { Meeting } from "../models/meeting.model";
import { ApiError } from "../lib/errors";

export const agendaRouter = Router();

// Get all agenda items for a meeting
agendaRouter.get("/meetings/:meetingId/agenda", async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw ApiError.notFound("Meeting not found");

    const agendaItems = await MeetingAgendaItem.find({ meetingId }).sort({ position: 1 });
    res.json(agendaItems);
  } catch (err) {
    next(err);
  }
});

// Create a new agenda item
agendaRouter.post("/meetings/:meetingId/agenda", async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { title, description, position } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw ApiError.notFound("Meeting not found");

    const agendaItem = await MeetingAgendaItem.create({
      meetingId,
      title,
      description,
      position,
    });

    res.status(201).json(agendaItem);
  } catch (err) {
    next(err);
  }
});

// Update an agenda item
agendaRouter.patch("/agenda-items/:agendaItemId", async (req, res, next) => {
  try {
    const { agendaItemId } = req.params;
    const { title, description, position, status } = req.body;

    const agendaItem = await MeetingAgendaItem.findById(agendaItemId);
    if (!agendaItem) throw ApiError.notFound("Agenda item not found");

    if (title !== undefined) agendaItem.title = title;
    if (description !== undefined) agendaItem.description = description;
    if (position !== undefined) agendaItem.position = position;
    if (status !== undefined) agendaItem.status = status;

    await agendaItem.save();
    res.json(agendaItem);
  } catch (err) {
    next(err);
  }
});

// Delete an agenda item
agendaRouter.delete("/agenda-items/:agendaItemId", async (req, res, next) => {
  try {
    const { agendaItemId } = req.params;

    const agendaItem = await MeetingAgendaItem.findByIdAndDelete(agendaItemId);
    if (!agendaItem) throw ApiError.notFound("Agenda item not found");

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});