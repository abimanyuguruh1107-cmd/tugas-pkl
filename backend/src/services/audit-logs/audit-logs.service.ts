import type { Types } from "mongoose";
import { AuditLog, type AuditAction, type IAuditLog } from "../../models/audit-log.model";
import { logger } from "../../lib/logger";

/**
 * Input for logging audit events
 */
export interface AuditLogInput {
  organizationId: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  action: AuditAction;
  targetType: string;
  targetId?: Types.ObjectId | string;
  status: "success" | "failed";
  statusCode?: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit logging service
 * Logs all sensitive actions with immutable, append-only records
 */
class AuditLogsService {
  /**
   * Log an audit event
   * Always succeeds (errors logged but not thrown)
   */
  async logAction(input: AuditLogInput): Promise<IAuditLog | null> {
    try {
      const log = await AuditLog.create({
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        ...(input.targetId !== undefined ? { targetId: input.targetId } : {}),
        status: input.status,
        ...(input.statusCode !== undefined ? { statusCode: input.statusCode } : {}),
        metadata: input.metadata || {},
        ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
        timestamp: new Date(),
      });

      return log;
    } catch (err) {
      logger.error("Failed to log audit event:", {
        action: input.action,
        error: err instanceof Error ? err.message : String(err),
      });
      // Never throw - audit failures should not block user operations
      return null;
    }
  }

  /**
   * Get audit logs for organization
   * Supports filtering by action, actor, target
   */
  async getAuditLogs(
    organizationId: string | Types.ObjectId,
    options: {
      action?: string;
      actorId?: string;
      targetType?: string;
      targetId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    const filter: Record<string, unknown> = { organizationId };

    if (options.action) filter.action = options.action;
    if (options.actorId) filter.actorId = options.actorId;
    if (options.targetType) filter.targetType = options.targetType;
    if (options.targetId) filter.targetId = options.targetId;

    if (options.startDate || options.endDate) {
      const timestampFilter: { $gte?: Date; $lte?: Date } = {};
      if (options.startDate) timestampFilter.$gte = options.startDate;
      if (options.endDate) timestampFilter.$lte = options.endDate;
      filter.timestamp = timestampFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .populate("actorId", "name email")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return { logs: logs as IAuditLog[], total };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    organizationId: string | Types.ObjectId,
    targetType: string,
    targetId: string | Types.ObjectId,
  ): Promise<IAuditLog[]> {
    return AuditLog.find({
      organizationId,
      targetType,
      targetId,
    })
      .sort({ timestamp: -1 })
      .populate("actorId", "name email")
      .lean();
  }

  /**
   * Get user's recent actions
   */
  async getUserActions(
    organizationId: string | Types.ObjectId,
    actorId: string | Types.ObjectId,
    limit: number = 100,
  ): Promise<IAuditLog[]> {
    return AuditLog.find({
      organizationId,
      actorId,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }
}

export const auditLogsService = new AuditLogsService();