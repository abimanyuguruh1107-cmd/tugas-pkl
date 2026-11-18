import { ApiError } from "../../lib/errors";
import { hasPermission } from "../../lib/permissions";
import { ActionItem } from "../../models/action-item.model";
import { MeetingFile } from "../../models/meeting-file.model";
import { Meeting } from "../../models/meeting.model";
import { MeetingNote } from "../../models/meeting-note.model";
import { MeetingParticipant } from "../../models/meeting-participant.model";
import { Membership } from "../../models/membership.model";
import { MinutesDocument } from "../../models/minutes-document.model";
import { Role } from "../../models/role.model";
import { Transcript } from "../../models/transcript.model";

export interface SearchResult {
  meetings: unknown[];
  notes: unknown[];
  actionItems: unknown[];
  files: unknown[];
  minutes: unknown[];
  transcripts: unknown[];
}

export async function searchOrganization(input: {
  organizationId: string;
  userId: string;
  query: string;
  limit?: number;
}): Promise<SearchResult> {
  const query = input.query.trim();
  if (query.length < 2 || query.length > 200) {
    throw ApiError.badRequest("Search query must be 2-200 characters");
  }
  const membership = await Membership.findOne({
    organizationId: input.organizationId,
    userId: input.userId,
    status: "active",
  }).lean();
  if (!membership)
    throw ApiError.forbidden("Active organization membership required");
  const role = await Role.findOne({
    _id: membership.roleId,
    organizationId: input.organizationId,
  })
    .select("permissions")
    .lean();
  const permissions = role?.permissions ?? [];
  if (!hasPermission(permissions, "meetings:search"))
    throw ApiError.forbidden("Search permission required");

  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(safe, "i");
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  let authorizedMeetingIds: string[];
  if (hasPermission(permissions, "meetings:read")) {
    const meetings = await Meeting.find({
      organizationId: input.organizationId,
    })
      .select("_id")
      .lean();
    authorizedMeetingIds = meetings.map((meeting) => meeting._id.toString());
  } else {
    const [hosted, participating] = await Promise.all([
      Meeting.find({
        organizationId: input.organizationId,
        hostId: input.userId,
      })
        .select("_id")
        .lean(),
      MeetingParticipant.find({
        organizationId: input.organizationId,
        userId: input.userId,
        status: { $in: ["invited", "joined"] },
      })
        .select("meetingId")
        .lean(),
    ]);
    authorizedMeetingIds = [
      ...new Set([
        ...hosted.map((meeting) => meeting._id.toString()),
        ...participating.map((participant) => participant.meetingId.toString()),
      ]),
    ];
  }
  if (authorizedMeetingIds.length === 0)
    return {
      meetings: [],
      notes: [],
      actionItems: [],
      files: [],
      minutes: [],
      transcripts: [],
    };
  const meetingScope = {
    organizationId: input.organizationId,
    _id: { $in: authorizedMeetingIds },
  };
  const matchedMeetings = await Meeting.find({
    ...meetingScope,
    $or: [{ title: regex }, { description: regex }],
  })
    .select("_id title startAt status hostId")
    .limit(limit)
    .lean();
  const meetingAccess = {
    organizationId: input.organizationId,
    meetingId: { $in: authorizedMeetingIds },
  };
  const [notes, actionItems, files, minutes, transcripts] = await Promise.all([
    MeetingNote.find({
      ...meetingAccess,
      content: regex,
      ...(hasPermission(permissions, "meetings:read")
        ? {}
        : { authorId: input.userId }),
    })
      .limit(limit)
      .lean(),
    hasPermission(permissions, "action_items:read")
      ? ActionItem.find({
          ...meetingAccess,
          $or: [{ title: regex }, { description: regex }],
        })
          .limit(limit)
          .lean()
      : Promise.resolve([]),
    hasPermission(permissions, "meeting_files:read")
      ? MeetingFile.find({
          ...meetingAccess,
          originalName: regex,
          deletedAt: { $exists: false },
        })
          .limit(limit)
          .select("_id meetingId originalName mimeType size createdAt")
          .lean()
      : Promise.resolve([]),
    hasPermission(permissions, "meeting_minutes:read")
      ? MinutesDocument.find({
          ...meetingAccess,
          content: regex,
          status: "published",
        })
          .limit(limit)
          .select("_id meetingId version createdAt")
          .lean()
      : Promise.resolve([]),
    hasPermission(permissions, "meeting_transcripts:read")
      ? Transcript.find({
          ...meetingAccess,
          content: regex,
          status: "completed",
        })
          .limit(limit)
          .select("_id meetingId language version createdAt")
          .lean()
      : Promise.resolve([]),
  ]);
  return {
    meetings: matchedMeetings,
    notes,
    actionItems,
    files,
    minutes,
    transcripts,
  };
}
