import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { ApiError } from "../lib/errors";
import type { Permission } from "../lib/permissions";
import { Meeting } from "../models/meeting.model";
import { Role } from "../models/role.model";

export interface MeetingAccessRequest extends Request {
  meetingId?: Types.ObjectId;
  meetingPermissions?: string[];
  meetingHost?: boolean;
}

export function loadMeetingAccess(...required: Permission[]) {
  return async (
    req: MeetingAccessRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || !req.organizationId || !req.membership) {
        throw ApiError.unauthorized(
          "Authenticated organization membership is required",
        );
      }
      const rawMeetingId = req.params.meetingId ?? req.params.id;
      const meetingId = Array.isArray(rawMeetingId)
        ? rawMeetingId[0]
        : rawMeetingId;
      if (!meetingId || !Types.ObjectId.isValid(meetingId)) {
        throw ApiError.badRequest("A valid meetingId is required");
      }
      const meeting = await Meeting.findOne({
        _id: meetingId,
        organizationId: req.organizationId,
      })
        .select("_id hostId")
        .lean();
      if (!meeting) throw ApiError.notFound("Meeting not found");

      const role = await Role.findOne({
        _id: req.membership.roleId,
        organizationId: req.organizationId,
      })
        .select("permissions")
        .lean();
      const permissions = role?.permissions ?? [];
      const host = meeting.hostId.equals(req.user._id);
      const allowed = required.every(
        (permission) =>
          permissions.includes("*") ||
          permissions.includes(permission) ||
          permissions.includes(`${permission.split(":")[0]}:*`) ||
          (host &&
            [
              "meetings:read",
              "meeting_host:control",
              "meetings:update",
              "meetings:cancel",
              "meeting_ai:manage",
            ].includes(permission)),
      );
      if (!allowed)
        throw ApiError.forbidden("Insufficient meeting permissions");

      req.meetingId = meeting._id;
      req.meetingPermissions = permissions;
      req.meetingHost = host;
      next();
    } catch (error) {
      next(error);
    }
  };
}
