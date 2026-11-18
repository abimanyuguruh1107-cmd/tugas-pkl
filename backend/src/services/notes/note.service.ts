import { ApiError } from "../../lib/errors";
import {
  MeetingNote,
  type IMeetingNote,
} from "../../models/meeting-note.model";
import { Meeting } from "../../models/meeting.model";
export async function listNotes(
  organizationId: string,
  meetingId: string,
): Promise<IMeetingNote[]> {
  await ensureMeeting(organizationId, meetingId);
  return MeetingNote.find({ organizationId, meetingId })
    .sort({ createdAt: 1 })
    .lean<IMeetingNote[]>();
}
export async function createNote(input: {
  organizationId: string;
  meetingId: string;
  authorId: string;
  content: string;
}): Promise<IMeetingNote> {
  await ensureMeeting(input.organizationId, input.meetingId);
  const note = await MeetingNote.create(input);
  return note.toObject() as IMeetingNote;
}
async function ensureMeeting(
  organizationId: string,
  meetingId: string,
): Promise<void> {
  if (!(await Meeting.exists({ _id: meetingId, organizationId })))
    throw ApiError.notFound("Meeting not found");
}
