import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { ApiError } from "../../lib/errors";
import {
  MeetingFile,
  type IMeetingFile,
} from "../../models/meeting-file.model";
import { Meeting, type IMeeting } from "../../models/meeting.model";

/** Lifetime of signed upload/download URLs, in seconds. */
export const SIGNED_URL_TTL_SECONDS = 300;

/** Upper bound for a single meeting file, in bytes (50 MB). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Adapter for the private object storage (MinIO/S3-compatible).
 * The concrete implementation is registered once at startup with
 * `configureObjectStorage`; this service never talks to a storage SDK itself.
 */
export interface ObjectStorageSigner {
  createUploadUrl(params: {
    objectKey: string;
    mimeType: string;
    expiresInSeconds: number;
  }): Promise<string>;
  createDownloadUrl(params: {
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<string>;
}

export interface CreateUploadTargetInput {
  meetingId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface UploadTarget {
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface RegisterMeetingFileInput {
  meetingId: string;
  uploadedBy: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SignedDownload {
  url: string;
  expiresInSeconds: number;
}

let signer: ObjectStorageSigner | null = null;

export function configureObjectStorage(
  storageSigner: ObjectStorageSigner | null,
): void {
  signer = storageSigner;
}

function requireSigner(): ObjectStorageSigner {
  if (!signer) {
    throw new ApiError(503, "Object storage is not configured");
  }
  return signer;
}

function assertObjectId(value: string, label: string): void {
  if (!/^[a-f\d]{24}$/i.test(value) || !mongoose.isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${label}`);
  }
}

function assertFileMetadata(mimeType: string, size: number): void {
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) {
    throw ApiError.badRequest("Invalid MIME type");
  }
  if (!Number.isInteger(size) || size <= 0) {
    throw ApiError.badRequest("File size must be a positive integer");
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest(
      `File size exceeds the ${MAX_FILE_SIZE_BYTES} byte limit`,
    );
  }
}

function objectKeyPrefix(meetingId: string): string {
  return `meetings/${meetingId}/files/`;
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100);
  return cleaned.length > 0 ? cleaned : "file";
}

async function loadMeeting(meetingId: string): Promise<IMeeting> {
  assertObjectId(meetingId, "meetingId");
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");
  return meeting;
}

/**
 * Step 1 of an upload: validate the file and hand back a generated object key
 * with a short-lived signed upload URL. No metadata is stored yet.
 */
export async function createUploadTarget(
  input: CreateUploadTargetInput,
): Promise<UploadTarget> {
  const { meetingId, fileName, mimeType, size } = input;
  await loadMeeting(meetingId);
  assertFileMetadata(mimeType, size);

  const storage = requireSigner();
  const storageKey = `${objectKeyPrefix(meetingId)}${randomUUID()}-${sanitizeFileName(fileName)}`;
  const uploadUrl = await storage.createUploadUrl({
    objectKey: storageKey,
    mimeType,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });

  return { storageKey, uploadUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
}

/** Step 2 of an upload: store the metadata once the object is in storage. */
export async function registerMeetingFile(
  input: RegisterMeetingFileInput,
): Promise<IMeetingFile> {
  const { meetingId, uploadedBy, originalName, storageKey, mimeType, sizeBytes } =
    input;
  const meeting = await loadMeeting(meetingId);
  assertObjectId(uploadedBy, "uploadedBy");
  assertFileMetadata(mimeType, sizeBytes);

  const name = originalName.trim();
  if (name.length === 0 || name.length > 255) {
    throw ApiError.badRequest("Invalid file name");
  }

  // Only accept keys issued for this meeting, so a client cannot attach
  // an object that belongs to another meeting.
  if (!storageKey.startsWith(objectKeyPrefix(meetingId))) {
    throw ApiError.badRequest("Storage key does not belong to this meeting");
  }

  const existing = await MeetingFile.findOne({
    meetingId,
    objectKey: storageKey,
  });
  if (existing) throw ApiError.conflict("File is already registered");

  return MeetingFile.create({
    organizationId: meeting.organizationId,
    meetingId,
    originalName: name,
    objectKey: storageKey,
    mimeType,
    size: sizeBytes,
    uploaderId: uploadedBy,
  });
}

export async function listMeetingFiles(
  meetingId: string,
): Promise<IMeetingFile[]> {
  await loadMeeting(meetingId);
  return MeetingFile.find({ meetingId, deletedAt: null }).sort({ createdAt: 1 });
}

export async function getMeetingFile(
  meetingId: string,
  fileId: string,
): Promise<IMeetingFile> {
  assertObjectId(meetingId, "meetingId");
  assertObjectId(fileId, "fileId");

  const file = await MeetingFile.findOne({ _id: fileId, meetingId, deletedAt: null });
  if (!file) throw ApiError.notFound("File not found");
  return file;
}

export async function getSignedDownload(
  meetingId: string,
  fileId: string,
): Promise<SignedDownload> {
  const file = await getMeetingFile(meetingId, fileId);
  const storage = requireSigner();
  const url = await storage.createDownloadUrl({
    objectKey: file.objectKey,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
  return { url, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
}
