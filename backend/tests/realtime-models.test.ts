import { describe, expect, test } from "bun:test";
import { Types } from "mongoose";
import { ActionItem } from "../src/models/action-item.model";
import { MeetingParticipant } from "../src/models/meeting-participant.model";
import { MinutesDocument as canonicalMinutesModel } from "../src/models/minutes-document.model";
import { MinutesDocument as compatibilityMinutesModel } from "../src/models/minutes.model";
import { TranscriptSegment } from "../src/models/transcript-segment.model";
import { participantCreateSchema } from "../src/validators/meeting.schemas";

const organizationId = new Types.ObjectId();
const meetingId = new Types.ObjectId();

describe("realtime model validation", () => {
  test("participant creation requires exactly one user or guest identity", () => {
    const validUser = participantCreateSchema.safeParse({
      body: { userId: new Types.ObjectId().toString(), role: "participant" },
    });
    const validGuest = participantCreateSchema.safeParse({
      body: { guestEmail: "guest@example.com", role: "guest" },
    });
    const neither = participantCreateSchema.safeParse({
      body: { role: "guest" },
    });
    const both = participantCreateSchema.safeParse({
      body: {
        userId: new Types.ObjectId().toString(),
        guestEmail: "guest@example.com",
        role: "guest",
      },
    });

    expect(validUser.success).toBe(true);
    expect(validGuest.success).toBe(true);
    expect(neither.success).toBe(false);
    expect(both.success).toBe(false);
  });

  test("participant model rejects both identity fields and neither identity field", async () => {
    const common = {
      organizationId,
      meetingId,
      role: "guest",
      invitationStatus: "invited",
    };
    await expect(
      new MeetingParticipant({
        ...common,
        userId: new Types.ObjectId(),
        guestEmail: "guest@example.com",
      }).validate(),
    ).rejects.toThrow();
    await expect(new MeetingParticipant(common).validate()).rejects.toThrow();
  });

  test("action items require an owner and due date", async () => {
    await expect(
      new ActionItem({
        organizationId,
        meetingId,
        title: "Follow up",
      }).validate(),
    ).rejects.toThrow();
  });

  test("transcript segment endMs must be after startMs", async () => {
    await expect(
      new TranscriptSegment({
        organizationId,
        transcriptId: new Types.ObjectId(),
        startMs: 1200,
        endMs: 1200,
        text: "Agenda item",
      }).validate(),
    ).rejects.toThrow("endMs must be after startMs");
  });

  test("legacy Minutes import points to the canonical model", () => {
    expect(compatibilityMinutesModel).toBe(canonicalMinutesModel);
  });
});
