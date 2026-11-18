import type { Request, Response } from "express";
import * as service from "../services/notes/note.service";
export async function list(req: Request, res: Response): Promise<void> {
  res.json({
    data: await service.listNotes(
      String(req.organizationId),
      String(req.params.meetingId),
    ),
  });
}
export async function create(req: Request, res: Response): Promise<void> {
  const authorId = req.user?._id.toString();
  if (!authorId) throw new Error("Authenticated user missing from request");
  res.status(201).json({
    note: await service.createNote({
      organizationId: String(req.organizationId),
      meetingId: String(req.params.meetingId),
      authorId,
      content: req.body.content,
    }),
  });
}
