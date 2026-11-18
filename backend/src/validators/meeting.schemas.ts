import { z } from "zod";
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
export const participantCreateSchema = z.object({
  body: z
    .object({
      userId: idSchema.optional(),
      guestEmail: z.string().trim().email().max(200).optional(),
      role: z.enum(["host", "co-host", "participant", "guest"]),
    })
    .strict()
    .refine(
      (body) => (body.userId !== undefined) !== (body.guestEmail !== undefined),
      "Exactly one of userId or guestEmail must be provided",
    ),
});
export const participantStatusSchema = z.object({
  body: z
    .object({
      invitationStatus: z.enum(["invited", "accepted", "declined", "waiting"]),
    })
    .strict(),
});
export const fileMetadataSchema = z.object({
  body: z
    .object({
      originalName: z.string().trim().min(1).max(255),
      objectKey: z.string().trim().min(1).max(1024),
      mimeType: z.string().trim().min(1).max(255),
      size: z
        .number()
        .int()
        .min(1)
        .max(50 * 1024 * 1024),
    })
    .strict(),
});
export const noteCreateSchema = z.object({
  body: z.object({ content: z.string().trim().min(1).max(10000) }).strict(),
});
export const actionItemCreateSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(500),
      description: z.string().max(10000).optional(),
      ownerId: idSchema,
      dueAt: z.coerce.date(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      sourceSegmentId: idSchema.optional(),
      decisionContext: z.string().max(4000).optional(),
    })
    .strict(),
});
export const actionItemUpdateSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(500).optional(),
      description: z.string().max(10000).optional(),
      ownerId: idSchema.optional(),
      dueAt: z.coerce.date().optional(),
      status: z
        .enum(["open", "in_progress", "blocked", "completed", "cancelled"])
        .optional(),
    })
    .strict()
    .refine(
      (value) => Object.keys(value).length > 0,
      "At least one field is required",
    ),
});
export const hostMuteSchema = z.object({
  body: z
    .object({
      identity: z.string().trim().min(1).max(128),
      trackSid: z.string().trim().min(1).max(128),
      muted: z.boolean().optional(),
    })
    .strict(),
});
export const hostRemoveSchema = z.object({
  body: z.object({ identity: z.string().trim().min(1).max(128) }).strict(),
});
export const roomLockSchema = z.object({
  body: z.object({ locked: z.boolean() }).strict(),
});
export const minutesCreateSchema = z.object({
  body: z.object({ content: z.string().trim().min(1).max(100000) }).strict(),
});
export const minutesUpdateSchema = minutesCreateSchema;
export const meetingCreateSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(500),
      description: z.string().max(10000).optional(),
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
      timezone: z.string().min(1).max(100),
      hostId: idSchema,
      status: z.enum(["draft", "scheduled"]).default("draft"),
      settings: z.record(z.string(), z.unknown()).default({}),
    })
    .strict(),
});
export const meetingUpdateSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(500).optional(),
      description: z.string().max(10000).optional(),
      startAt: z.coerce.date().optional(),
      endAt: z.coerce.date().optional(),
      timezone: z.string().min(1).max(100).optional(),
      hostId: idSchema.optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
});
export const meetingTransitionSchema = z.object({
  body: z
    .object({
      status: z.enum([
        "draft",
        "scheduled",
        "live",
        "ended",
        "processing",
        "completed",
        "cancelled",
      ]),
    })
    .strict(),
});
export const decisionExtractSchema = z.object({
  body: z.object({ transcript: z.string().trim().min(1).max(200000) }).strict(),
});
export const organizationAiSettingsSchema = z.object({
  body: z
    .object({
      enabled: z.boolean(),
      retentionDays: z.number().int().min(1).max(365).optional(),
    })
    .strict(),
});
export const meetingAiSettingsSchema = z.object({
  body: z.object({ enabled: z.boolean() }).strict(),
});
export const searchQuerySchema = z.object({
  query: z
    .object({
      q: z.string().trim().min(2).max(200),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    })
    .strict(),
});
export const transcriptCreateSchema = z.object({
  body: z
    .object({
      language: z.string().trim().min(2).max(32),
      provider: z.string().trim().min(1).max(100),
    })
    .strict(),
});
export const transcriptSegmentCorrectionSchema = z.object({
  body: z
    .object({
      segmentId: idSchema,
      text: z.string().trim().min(1).max(10000),
      speakerLabel: z.string().trim().max(200).optional(),
    })
    .strict(),
});
