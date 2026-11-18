import { ApiError } from "../../lib/errors";
import { hasPermission } from "../../lib/permissions";
import { Membership } from "../../models/membership.model";
import { Meeting } from "../../models/meeting.model";
import { Recording, RecordingStatus } from "../../models/recording.model";
import { Role } from "../../models/role.model";

export async function getRecordingAccess(
  organizationId: string,
  meetingId: string,
  recordingId: string,
  userId: string,
) {
  const [meeting, membership, recording] = await Promise.all([
    Meeting.findOne({ _id: meetingId, organizationId }).select("hostId").lean(),
    Membership.findOne({ organizationId, userId, status: "active" }).lean(),
    Recording.findOne({
      _id: recordingId,
      meetingId,
      organizationId,
      status: RecordingStatus.COMPLETED,
    })
      .select("_id objectKey meetingId")
      .lean(),
  ]);

  if (!meeting || !recording) throw ApiError.notFound("Recording not found");
  if (!membership) {
    throw ApiError.forbidden("Active organization membership required");
  }

  const role = await Role.findOne({ _id: membership.roleId, organizationId })
    .select("permissions")
    .lean();

  const host = meeting.hostId.toString() === userId;
  if (
    !host &&
    (!role || !hasPermission(role.permissions, "meeting_recordings:read"))
  ) {
    throw ApiError.forbidden("Recording access denied");
  }

  return recording;
}