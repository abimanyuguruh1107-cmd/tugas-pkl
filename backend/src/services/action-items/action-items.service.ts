import mongoose, { type Types } from "mongoose";
import {
  ActionItem,
  ACTION_ITEM_STATUSES,
  type ActionItemStatus,
  type IActionItem,
} from "../../models/action-item.model";
import { Meeting } from "../../models/meeting.model";
import { Membership } from "../../models/membership.model";
import { ApiError } from "../../lib/errors";
import { auditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../../models/audit-log.model";
import { NotificationType } from "../../models/notification.model";
import { assertOrganizationPermission } from "../meetings/meeting-access.service";
import { createNotification } from "../notifications/notification.service";

class ActionItemService {
  async createActionItem(
    meetingId: string | Types.ObjectId,
    input: {
      title: string;
      description?: string;
      ownerId: Types.ObjectId;
      dueAt: Date;
      priority?: "low" | "medium" | "high";
      sourceSegmentId?: Types.ObjectId;
      decisionContext?: string;
    },
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<IActionItem> {
    await assertOrganizationPermission(
      String(organizationId),
      String(userId),
      "action_items:write",
    );
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId });
    if (!meeting) throw ApiError.notFound("Meeting not found");
    if (
      !(await Membership.exists({
        organizationId,
        userId: input.ownerId,
        status: "active",
      }))
    ) {
      throw ApiError.badRequest(
        "Action item owner must be an active organization member",
      );
    }

    const changedById =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    const actionItem = new ActionItem({
      meetingId,
      organizationId,
      title: input.title,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ownerId: input.ownerId,
      dueAt: input.dueAt,
      status: "open", // ✅ Gunakan string literal
      priority: input.priority ?? "medium",
      ...(input.sourceSegmentId !== undefined
        ? { sourceSegment: input.sourceSegmentId }
        : {}),
      ...(input.decisionContext !== undefined ? { decisionContext: input.decisionContext } : {}),
      auditTrail: [
        {
          field: "status",
          oldValue: undefined,
          newValue: "open", // ✅ Gunakan string literal
          changedBy: changedById,
          changedAt: new Date(),
        },
      ],
    });

    await actionItem.save();

    await auditLogsService.logAction({
      organizationId,
      actorId: userId,
      action: AuditAction.ACTION_ITEM_CREATED,
      targetType: "ActionItem",
      targetId: actionItem._id,
      status: "success",
      metadata: { meetingId, title: input.title },
    });

    if (input.ownerId) {
      await createNotification({
        userId: input.ownerId,
        organizationId,
        type: NotificationType.ACTION_ITEM_ASSIGNED,
        payload: {
          title: "Action Item Assigned",
          body: `You have been assigned a new action item: ${input.title}`,
          action: `/meetings/${meetingId}/action-items`,
          actionLabel: "View Action Items",
          meetingId: meetingId.toString(),
          actionItemId: actionItem._id.toString(),
        },
      });
    }

    return actionItem;
  }

  async updateActionItem(
    actionItemId: string | Types.ObjectId,
    input: {
      title?: string;
      description?: string;
      ownerId?: Types.ObjectId;
      dueAt?: Date;
      status?: ActionItemStatus;
      priority?: "low" | "medium" | "high";
    },
    userId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
  ): Promise<IActionItem> {
    await assertOrganizationPermission(
      String(organizationId),
      String(userId),
      "action_items:write",
    );
    const actionItem = await ActionItem.findOne({
      _id: actionItemId,
      organizationId,
    });
    if (!actionItem) throw ApiError.notFound("Action item not found");

    const changedById =
      typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    const auditEntries: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
      changedBy: Types.ObjectId;
      changedAt: Date;
    }> = [];

    if (input.title !== undefined && input.title !== actionItem.title) {
      auditEntries.push({
        field: "title",
        oldValue: actionItem.title,
        newValue: input.title,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.title = input.title;
    }

    if (
      input.description !== undefined &&
      input.description !== actionItem.description
    ) {
      auditEntries.push({
        field: "description",
        oldValue: actionItem.description,
        newValue: input.description,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.description = input.description;
    }

    if (
      input.ownerId !== undefined &&
      input.ownerId?.toString() !== actionItem.ownerId?.toString()
    ) {
      if (
        !(await Membership.exists({
          organizationId,
          userId: input.ownerId,
          status: "active",
        }))
      ) {
        throw ApiError.badRequest(
          "Action item owner must be an active organization member",
        );
      }
      auditEntries.push({
        field: "ownerId",
        oldValue: actionItem.ownerId,
        newValue: input.ownerId,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.ownerId = input.ownerId;
    }

    if (
      input.dueAt !== undefined &&
      input.dueAt.getTime() !== actionItem.dueAt?.getTime()
    ) {
      auditEntries.push({
        field: "dueAt",
        oldValue: actionItem.dueAt,
        newValue: input.dueAt,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.dueAt = input.dueAt;
      actionItem.set("dueReminderSentAt", undefined);
      actionItem.set("overdueReminderSentAt", undefined);
    }

    if (input.status !== undefined && input.status !== actionItem.status) {
      if (!allowedTransitions[actionItem.status].includes(input.status)) {
        throw ApiError.conflict(
          `Invalid action item transition: ${actionItem.status} to ${input.status}`,
        );
      }
      auditEntries.push({
        field: "status",
        oldValue: actionItem.status,
        newValue: input.status,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.status = input.status;
    }

    if (input.priority !== undefined && input.priority !== actionItem.priority) {
      auditEntries.push({
        field: "priority",
        oldValue: actionItem.priority,
        newValue: input.priority,
        changedBy: changedById,
        changedAt: new Date(),
      });
      actionItem.priority = input.priority;
    }

    if (auditEntries.length > 0) {
      actionItem.auditTrail.push(...auditEntries);
      await actionItem.save();

      for (const entry of auditEntries) {
        if (entry.field === "status") {
          await auditLogsService.logAction({
            organizationId,
            actorId: userId,
            action: AuditAction.ACTION_ITEM_STATUS_CHANGED,
            targetType: "ActionItem",
            targetId: actionItem._id,
            status: "success",
            metadata: {
              oldValue: entry.oldValue,
              newValue: entry.newValue,
              actionItemId: actionItem._id,
            },
          });
        } else if (entry.field === "ownerId") {
          await auditLogsService.logAction({
            organizationId,
            actorId: userId,
            action: AuditAction.ACTION_ITEM_ASSIGNED,
            targetType: "ActionItem",
            targetId: actionItem._id,
            status: "success",
            metadata: { oldOwner: entry.oldValue, newOwner: entry.newValue },
          });
        } else if (entry.field === "dueAt") {
          await auditLogsService.logAction({
            organizationId,
            actorId: userId,
            action: AuditAction.ACTION_ITEM_DUE_DATE_CHANGED,
            targetType: "ActionItem",
            targetId: actionItem._id,
            status: "success",
            metadata: { oldDueAt: entry.oldValue, newDueAt: entry.newValue },
          });
        }
      }

      if (auditEntries.some((entry) => entry.field === "ownerId")) {
        await createNotification({
          userId: actionItem.ownerId,
          organizationId,
          type: NotificationType.ACTION_ITEM_ASSIGNED,
          payload: {
            title: "Action Item Updated",
            body: `An action item has been updated and assigned to you`,
            action: `/action-items/${actionItemId}`,
            actionLabel: "View Action Item",
            actionItemId: actionItemId.toString(),
          },
        });
      }
    }

    return actionItem;
  }

  async addProgressNote(
    actionItemId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    noteText: string,
    userId: string | Types.ObjectId,
  ): Promise<IActionItem> {
    const actionItem = await ActionItem.findOne({ _id: actionItemId, organizationId });
    if (!actionItem) throw ApiError.notFound("Action item not found");

    actionItem.progressNotes.push({
      _id: new mongoose.Types.ObjectId(),
      text: noteText,
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    });

    await actionItem.save();
    return actionItem;
  }

  async changeStatus(
    actionItemId: string | Types.ObjectId,
    organizationId: string | Types.ObjectId,
    newStatus: ActionItemStatus,
    userId: string | Types.ObjectId,
  ): Promise<IActionItem> {
    const actionItem = await ActionItem.findOne({ _id: actionItemId, organizationId });
    if (!actionItem) throw ApiError.notFound("Action item not found");

    if (actionItem.status === newStatus) return actionItem;

    const oldStatus = actionItem.status;
    actionItem.status = newStatus;

    actionItem.progressNotes.push({
      _id: new mongoose.Types.ObjectId(),
      text: `Status changed from ${oldStatus} to ${newStatus}`,
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    });

    await actionItem.save();

    if (actionItem.ownerId) {
      await createNotification({
        userId: actionItem.ownerId,
        organizationId,
        type: NotificationType.ACTION_ITEM_ASSIGNED,
        payload: {
          title: "Action Item Status Updated",
          body: `Action item "${actionItem.title}" status changed to ${newStatus}`,
          action: `/action-items/${actionItemId}`,
          actionLabel: "View Action Item",
          actionItemId: actionItemId.toString(),
        },
      });
    }

    return actionItem;
  }

  async listActionItems(
    organizationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    options: {
      ownerId?: string | Types.ObjectId;
      status?: ActionItemStatus;
      dueBefore?: Date;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<{ actionItems: IActionItem[]; total: number }> {
    await assertOrganizationPermission(
      String(organizationId),
      String(userId),
      "action_items:read",
    );
    const filter: Record<string, unknown> = { organizationId };

    if (options.ownerId) filter.ownerId = options.ownerId;
    if (options.status) filter.status = options.status;
    if (options.dueBefore) filter.dueAt = { $lte: options.dueBefore };

    const [actionItems, total] = await Promise.all([
      ActionItem.find(filter)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .lean<IActionItem[]>(),
      ActionItem.countDocuments(filter),
    ]);

    return { actionItems, total };
  }

  async getActionItem(
    actionItemId: string | Types.ObjectId,
  ): Promise<IActionItem> {
    const actionItem = await ActionItem.findById(actionItemId);
    if (!actionItem) throw ApiError.notFound("Action item not found");
    return actionItem;
  }
}

export const actionItemsService = new ActionItemService();

/* ------------------------------------------------------------------ */
/* Blok Fungsi Modular (dari file asli Anda)                           */
/* ------------------------------------------------------------------ */

export interface ActionItemCreateInput {
  organizationId: string;
  meetingId: string;
  createdBy: string;
  title: string;
  ownerId: string;
  description?: string;
  dueAt: Date;
}

export const actionItemStatuses = ACTION_ITEM_STATUSES;

const allowedTransitions: Record<
  ActionItemStatus,
  readonly ActionItemStatus[]
> = {
  open: ["in_progress"],
  in_progress: ["blocked"],
  blocked: ["completed"],
  completed: ["cancelled"],
  cancelled: [],
};

export async function listActionItems(
  organizationId: string,
  userId: string,
  meetingId?: string,
  status?: ActionItemStatus,
): Promise<IActionItem[]> {
  await assertOrganizationPermission(organizationId, userId, "action_items:read");

  const filter: Record<string, unknown> = { organizationId };
  if (meetingId) {
    const meeting = await Meeting.findOne({ _id: meetingId, organizationId })
      .select("_id")
      .lean();
    if (!meeting) throw ApiError.notFound("Meeting not found");
    filter.meetingId = meeting._id;
  }
  if (status) filter.status = status;

  return ActionItem.find(filter)
    .sort({ dueAt: 1, createdAt: -1 })
    .lean<IActionItem[]>();
}

export async function createActionItem(
  input: ActionItemCreateInput,
): Promise<IActionItem> {
  await assertOrganizationPermission(
    input.organizationId,
    input.createdBy,
    "action_items:write",
  );

  const meeting = await Meeting.findOne({
    _id: input.meetingId,
    organizationId: input.organizationId,
  })
    .select("_id")
    .lean();
  if (!meeting) throw ApiError.notFound("Meeting not found");

  if (
    !(await Membership.exists({
      organizationId: input.organizationId,
      userId: input.ownerId,
      status: "active",
    }))
  ) {
    throw ApiError.badRequest(
      "Owner must be an active member of this organization",
    );
  }

  const item = await ActionItem.create({
    organizationId: input.organizationId,
    meetingId: input.meetingId,
    title: input.title,
    ownerId: input.ownerId,
    dueAt: input.dueAt,
    ...(input.description !== undefined ? { description: input.description } : {}),
  });
  return item.toObject() as IActionItem;
}

export async function updateActionItem(
  organizationId: string,
  actionItemId: string,
  actorId: string,
  patch: {
    title?: string;
    description?: string;
    ownerId?: string;
    dueAt?: Date;
    status?: ActionItemStatus;
  },
): Promise<IActionItem> {
  await assertOrganizationPermission(
    organizationId,
    actorId,
    "action_items:write",
  );

  const item = await ActionItem.findOne({ _id: actionItemId, organizationId });
  if (!item) throw ApiError.notFound("Action item not found");

  if (
    patch.status &&
    patch.status !== item.status &&
    !allowedTransitions[item.status].includes(patch.status)
  ) {
    throw ApiError.conflict(
      `Invalid action item transition: ${item.status} to ${patch.status}`,
    );
  }

  if (patch.title !== undefined) item.title = patch.title;
  if (patch.description !== undefined) item.description = patch.description;

  if (patch.ownerId !== undefined) {
    if (
      !(await Membership.exists({
        organizationId,
        userId: patch.ownerId,
        status: "active",
      }))
    ) {
      throw ApiError.badRequest(
        "Owner must be an active member of this organization",
      );
    }
    item.ownerId = new mongoose.Types.ObjectId(patch.ownerId);
  }

  if (patch.dueAt !== undefined) {
    item.dueAt = patch.dueAt;
    item.set("dueReminderSentAt", undefined);
    item.set("overdueReminderSentAt", undefined);
  }

  if (patch.status !== undefined && patch.status !== item.status) {
    const updated = await ActionItem.findOneAndUpdate(
      { _id: actionItemId, organizationId, status: item.status },
      {
        $set: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined
            ? { description: patch.description }
            : {}),
          status: patch.status,
        },
      },
      { new: true, runValidators: true },
    ).lean<IActionItem>();
    if (!updated) throw ApiError.conflict("Action item changed; reload and retry");
    return updated;
  }

  await item.save();
  return item.toObject() as IActionItem;
}

export interface ActionItemLinkInput {
  meetingId: string;
  actionItemId: string;
  sourceSegmentId?: string;
}

export async function linkActionItemToMeeting(
  input: ActionItemLinkInput,
): Promise<void> {
  const { meetingId, actionItemId } = input;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");
  const actionItem = await ActionItem.findOneAndUpdate(
    {
      _id: actionItemId,
      meetingId,
      organizationId: meeting.organizationId,
    },
    {
      $set: {
        ...(input.sourceSegmentId
          ? { sourceSegment: input.sourceSegmentId }
          : {}),
      },
    },
    { runValidators: true },
  );
  if (!actionItem) throw ApiError.notFound("Action item not found");
}

export async function getActionItemsByMeeting(
  meetingId: string,
): Promise<IActionItem[]> {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound("Meeting not found");

  return ActionItem.find({ meetingId, organizationId: meeting.organizationId })
    .sort({ createdAt: 1 })
    .lean<IActionItem[]>();
}