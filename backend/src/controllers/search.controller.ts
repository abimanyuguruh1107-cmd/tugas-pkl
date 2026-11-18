import type { Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { searchOrganization } from "../services/search/search.service";
export async function search(req: Request, res: Response): Promise<void> {
  const userId = req.user?._id.toString();
  if (!userId || !req.organizationId) throw ApiError.unauthorized();
  res.json(
    await searchOrganization({
      organizationId: req.organizationId.toString(),
      userId,
      query: String(req.query.q ?? ""),
      ...(typeof req.query.limit === "string"
        ? { limit: Number(req.query.limit) }
        : {}),
    }),
  );
}
