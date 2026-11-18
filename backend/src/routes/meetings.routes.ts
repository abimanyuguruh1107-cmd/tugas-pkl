import { Router } from "express";
import * as meetingController from "../controllers/meetings.controller";
import * as agendaController from "../controllers/agenda.controller";
import { authenticate } from "../middleware/auth.middleware";
import { resolveTenant } from "../middleware/tenant.middleware";
import { validateRequest } from "../validators/validate";
import {
  createMeetingSchema,
  updateMeetingSchema,
  agendaCreateSchema,
  agendaReplaceSchema,
  agendaItemPatchSchema,
} from "../validators/meeting.schema";

/** Validation middleware wrapper */
function validate(schema: { parse: (req: unknown) => unknown }) {
  return (req: unknown, _res: unknown, next: (err?: unknown) => void) => {
    try {
      schema.parse(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const meetingRouter = Router();

// All meeting routes require authentication
meetingRouter.use(authenticate);
meetingRouter.use(resolveTenant);

/**
 * Meetings CRUD
 */
meetingRouter.get(
  "/",
  meetingController.listMeetings,
);

meetingRouter.post(
  "/",
  validate(createMeetingSchema),
  meetingController.createMeeting,
);

meetingRouter.get(
  "/:meetingId",
  meetingController.getMeeting,
);

meetingRouter.patch(
  "/:meetingId",
  validate(updateMeetingSchema),
  meetingController.updateMeeting,
);

meetingRouter.delete(
  "/:meetingId",
  meetingController.cancelMeeting,
);

/**
 * Meeting Participants
 */
meetingRouter.get(
  "/:meetingId/participants",
  meetingController.listParticipants,
);

meetingRouter.post(
  "/:meetingId/participants",
  meetingController.addParticipant,
);

meetingRouter.patch(
  "/:meetingId/participants/:participantId",
  meetingController.updateParticipant,
);

meetingRouter.delete(
  "/:meetingId/participants/:participantId",
  meetingController.removeParticipant,
);

/**
 * Meeting Agenda
 */
meetingRouter.get(
  "/:meetingId/agenda",
  agendaController.getAgenda,
);

meetingRouter.put(
  "/:meetingId/agenda",
  validateRequest(agendaReplaceSchema),
  agendaController.updateAgenda,
);

meetingRouter.post(
  "/:meetingId/agenda",
  validateRequest(agendaCreateSchema),
  agendaController.createAgendaItem,
);

meetingRouter.patch(
  "/:meetingId/agenda/:agendaItemId",
  validateRequest(agendaItemPatchSchema),
  agendaController.updateAgendaItem,
);

meetingRouter.delete(
  "/:meetingId/agenda/:agendaItemId",
  agendaController.deleteAgendaItem,
);

/**
 * Meeting Room (Live/WebRTC)
 */
meetingRouter.post(
  "/:meetingId/join-token",
  meetingController.getJoinToken,
);

meetingRouter.post(
  "/:meetingId/end",
  meetingController.endMeeting,
);

meetingRouter.post(
  "/:meetingId/record/start",
  meetingController.startRecording,
);

meetingRouter.post(
  "/:meetingId/record/stop",
  meetingController.stopRecording,
);

/**
 * Meeting Attendance (post-meeting analytics)
 */
meetingRouter.get(
  "/:meetingId/attendance",
  meetingController.getAttendance,
);