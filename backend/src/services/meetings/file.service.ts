import { ApiError } from "../../lib/errors";
import {
  MeetingFile,
  type IMeetingFile,
} from "../../models/meeting-file.model";
import { Meeting } from "../../models/meeting.model";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const SAFE_KEY = /^[a-zA-Z0-9/_\-.]+$/;
export interface RegisterMeetingFileInput {
  organizationId: string;
  meetingId: string;
  uploaderId: string;
  originalName: string;
  objectKey: string;
  mimeType: string;
  size: number;
}
export async function registerFile(
  input: RegisterMeetingFileInput,
): Promise<IMeetingFile> {
  if (
    !input.originalName.trim() ||
    !input.mimeType.trim() ||
    !SAFE_KEY.test(input.objectKey) ||
    input.objectKey.includes("..")
  )
    throw ApiError.badRequest("Invalid file metadata");
  if (
    !Number.isInteger(input.size) ||
    input.size < 1 ||
    input.size > MAX_FILE_SIZE_BYTES
  )
    throw ApiError.badRequest("File size must be between 1 byte and 50 MB");
  if (
    !(await Meeting.exists({
      _id: input.meetingId,
      organizationId: input.organizationId,
    }))
  )
    throw ApiError.notFound("Meeting not found");
  const file = await MeetingFile.create({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
    uploaderId: input.uploaderId,
    originalName: input.originalName,
    objectKey: input.objectKey,
    mimeType: input.mimeType,
    size: input.size,
  });
  return file.toObject() as IMeetingFile;
}
export async function deleteFile(
  organizationId: string,
  meetingId: string,
  fileId: string,
): Promise<void> {
  const result = await MeetingFile.updateOne(
    { _id: fileId, organizationId, meetingId, deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date() } },
  );
  if (!result.modifiedCount) throw ApiError.notFound("File metadata not found");
}
export async function getFile(
  organizationId: string,
  meetingId: string,
  fileId: string,
): Promise<IMeetingFile> {
  const file = await MeetingFile.findOne({
    _id: fileId,
    organizationId,
    meetingId,
    deletedAt: { $exists: false },
  }).lean<IMeetingFile>();
  if (!file) throw ApiError.notFound("File metadata not found");
  return file;
}
export async function listFiles(
  organizationId: string,
  meetingId: string,
): Promise<IMeetingFile[]> {
  if (!(await Meeting.exists({ _id: meetingId, organizationId })))
    throw ApiError.notFound("Meeting not found");
  return MeetingFile.find({
    organizationId,
    meetingId,
    deletedAt: { $exists: false },
  })
    .sort({ createdAt: -1 })
    .lean<IMeetingFile[]>();
}
