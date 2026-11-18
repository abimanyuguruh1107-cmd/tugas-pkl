import type { Request, Response } from "express";
import { auditLogsService } from "../services/audit-logs/audit-logs.service";
import { authenticate, requirePermissions } from "../middleware/auth.middleware";
import { PERMISSIONS } from "../lib/permissions";
import { Router } from "express";
import { z } from "zod";

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

const auditLogsQuery = z.object({
  action: z.string().optional(),
  actorId: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10) || 50)
    .optional(),
  skip: z
    .string()
    .transform((val) => parseInt(val, 10) || 0)
    .optional(),
});

const auditLogsQuerySchema = z.object({
  query: auditLogsQuery,
});

type AuditLogFilters = Parameters<typeof auditLogsService.getAuditLogs>[1];

export const auditLogsRouter = Router();

auditLogsRouter.use(authenticate);

auditLogsRouter.get(
  "/organizations/:organizationId/audit-logs",
  requirePermissions(PERMISSIONS.USERS_READ),
  validate(auditLogsQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = req.params;

    // Parse again to get transformed values (limit/skip as numbers).
    // validate() only checks; it does not replace req.query.
    const query = auditLogsQuery.parse(req.query);

    const filters: AuditLogFilters = {};
    if (query.action !== undefined) filters.action = query.action;
    if (query.actorId !== undefined) filters.actorId = query.actorId;
    if (query.targetType !== undefined) filters.targetType = query.targetType;
    if (query.targetId !== undefined) filters.targetId = query.targetId;
    if (query.startDate !== undefined) filters.startDate = new Date(query.startDate);
    if (query.endDate !== undefined) filters.endDate = new Date(query.endDate);
    if (query.limit !== undefined) filters.limit = query.limit;
    if (query.skip !== undefined) filters.skip = query.skip;

    const result = await auditLogsService.getAuditLogs(organizationId as string, filters);

    res.json(result);
  },
);

auditLogsRouter.get(
  "/organizations/:organizationId/audit-logs/trail/:targetType/:targetId",
  requirePermissions(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId, targetType, targetId } = req.params;

    const trail = await auditLogsService.getResourceAuditTrail(
      organizationId as string,
      targetType as string,
      targetId as string,
    );
    res.json({ trail });
  },
);

auditLogsRouter.get(
  "/organizations/:organizationId/audit-logs/user/:actorId",
  requirePermissions(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId, actorId } = req.params;

    const rawLimit = req.query.limit;
    const limit = typeof rawLimit === "string" ? parseInt(rawLimit, 10) || 100 : 100;

    const actions = await auditLogsService.getUserActions(
      organizationId as string,
      actorId as string,
      limit,
    );
    res.json({ actions });
  },
);