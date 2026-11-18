import { WebhookReceiver } from "livekit-server-sdk";
import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { ApiError } from "../lib/errors";
import { logger } from "../lib/logger";
import { Meeting } from "../models/meeting.model";
import { MeetingParticipant } from "../models/meeting-participant.model";
import { MeetingSession } from "../models/meeting-session.model";
import { recordAttendanceJoin, recordAttendanceLeave } from "../services/attendance/attendance.service";
import { Recording } from "../models/recording.model";
import { getRecordingQueue } from "../queue/recording.queue";

const webhookEventSchema = z
  .object({
    event: z.string().min(1),
    room: z.object({ name: z.string().optional() }).passthrough().optional(),
    participant: z
      .object({ identity: z.string().optional() })
      .passthrough()
      .optional(),
    egressInfo: z
      .object({
        egressId: z.string().optional(),
        fileResults: z
          .array(
            z
              .object({
                filename: z.string().optional(),
                duration: z.number().optional(),
                size: z.number().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type LiveKitWebhookEvent = z.infer<typeof webhookEventSchema>;
export interface LiveKitWebhookVerifier {
  receive(body: string, authorization: string): unknown | Promise<unknown>;
}

let webhookVerifier: LiveKitWebhookVerifier = new WebhookReceiver(
  env.livekit.apiKey,
  env.livekit.apiSecret,
);

export function configureLiveKitWebhookVerifier(
  verifier: LiveKitWebhookVerifier,
): void {
  webhookVerifier = verifier;
}

export function parseLiveKitWebhookEvent(value: unknown): LiveKitWebhookEvent {
  return webhookEventSchema.parse(value);
}

function getMeetingId(roomName: string | undefined): string | undefined {
  const match = roomName?.match(/^meeting-([a-f\d]{24})$/i);
  return match?.[1];
}

async function findParticipant(
  meetingId: string,
  organizationId: string,
  identity: string,
) {
  return MeetingParticipant.findOne({
    meetingId,
    organizationId,
    $or: [
      ...( /^[a-f\d]{24}$/i.test(identity) ? [{ userId: identity }] : []),
      { guestEmail: identity.toLowerCase() },
    ],
  });
}

async function handleParticipantEvent(
  event: LiveKitWebhookEvent,
  meetingId: string,
  organizationId: string,
): Promise<void> {
  const identity = event.participant?.identity;
  if (!identity) {
    logger.warn("LiveKit participant webhook did not include an identity");
    return;
  }
  const participant = await findParticipant(meetingId, organizationId, identity);
  if (!participant) {
    logger.warn("LiveKit participant webhook did not match a meeting invite", {
      meetingId,
      identity,
    });
    return;
  }

  if (event.event === "participant_joined" || event.event === "participant_active") {
    if (participant.invitationStatus !== "accepted") {
      participant.invitationStatus = "accepted";
      await participant.save();
    }
    await recordAttendanceJoin({
      meetingId,
      participantId: participant._id.toString(),
    });
    return;
  }

  if (event.event === "participant_left") {
    const activeSession = await MeetingSession.findOne({
      meetingId,
      participantId: participant._id,
      leftAt: null,
    });
    if (activeSession) {
      await recordAttendanceLeave(activeSession._id.toString());
    }
  }
}

export async function receiveLiveKitWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const rawBody = req.rawBody;
  const authorization = req.get("Authorization");
  if (!rawBody || !authorization) {
    throw ApiError.unauthorized("LiveKit webhook signature is required");
  }

  let verifiedEvent: unknown;
  try {
    verifiedEvent = await webhookVerifier.receive(
      rawBody.toString("utf8"),
      authorization,
    );
  } catch (error) {
    logger.warn("LiveKit webhook signature verification failed", error);
    throw ApiError.unauthorized("Invalid LiveKit webhook signature");
  }

  const event = parseLiveKitWebhookEvent(verifiedEvent);
  const meetingId = getMeetingId(event.room?.name);
  if (!meetingId) {
    logger.info("Ignoring LiveKit webhook for an unrelated room", {
      event: event.event,
    });
    res.status(204).end();
    return;
  }

  const meeting = await Meeting.findById(meetingId).select("_id organizationId").lean();
  if (!meeting) {
    logger.warn("Ignoring LiveKit webhook for an unknown meeting", { meetingId });
    res.status(204).end();
    return;
  }

  if (
    event.event === "participant_joined" ||
    event.event === "participant_active" ||
    event.event === "participant_left"
  ) {
    await handleParticipantEvent(
      event,
      meetingId,
      meeting.organizationId.toString(),
    );
  }

  if (event.event === "egress_ended" && event.egressInfo?.egressId) {
    const recording = await Recording.findOne({
      organizationId: meeting.organizationId,
      providerRecordingId: event.egressInfo.egressId,
    })
      .select("_id")
      .lean();
    if (recording) {
      const fileResult = event.egressInfo.fileResults?.[0];
      await getRecordingQueue().add(
        "egress-ended",
        {
          recordingId: recording._id.toString(),
          succeeded: Boolean(fileResult),
          ...(fileResult?.filename ? { objectKey: fileResult.filename } : {}),
          ...(fileResult?.duration !== undefined
            ? { duration: fileResult.duration }
            : {}),
          ...(fileResult?.size !== undefined ? { size: fileResult.size } : {}),
        },
        { jobId: `egress-ended-${event.egressInfo.egressId}` },
      );
    } else {
      logger.warn("LiveKit egress webhook did not match a recording", {
        egressId: event.egressInfo.egressId,
      });
    }
  }

  res.status(204).end();
}
