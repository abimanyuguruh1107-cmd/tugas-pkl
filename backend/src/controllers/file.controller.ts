import type { Request, Response } from "express";
import * as service from "../services/meetings/file.service";
import { createSignedFileUrl } from "../services/meetings/file-storage.adapter";
import type { PopulatedUser } from "../models/user.model";

export async function list(req: Request, res: Response): Promise<void> {
  res.json({
    data: await service.listFiles(
      String(req.organizationId),
      String(req.params.meetingId),
    ),
  });
}

export async function registerMetadata(
  req: Request,
  res: Response,
): Promise<void> {
  const user = req.user as PopulatedUser; // ✅ Gunakan casting yang aman

  const file = await service.registerFile({
    organizationId: String(req.organizationId),
    meetingId: String(req.params.meetingId),
    uploaderId: user._id.toString(),
    ...req.body,
  });
  res.status(201).json({ file });
}

export async function deleteMetadata(
  req: Request,
  res: Response,
): Promise<void> {
  await service.deleteFile(
    String(req.organizationId),
    String(req.params.meetingId),
    String(req.params.fileId),
  );
  res.status(204).send();
}

export async function downloadMetadata(
  req: Request,
  res: Response,
): Promise<void> {
  const file = await service.getFile(
    String(req.organizationId),
    String(req.params.meetingId),
    String(req.params.fileId),
  );
  const downloadUrl = await createSignedFileUrl(file.objectKey);
  res.json({ file, downloadUrl });
}