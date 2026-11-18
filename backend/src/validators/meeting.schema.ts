import { z } from "zod";

export const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(256),
    description: z.string().max(2000).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional(),
    timezone: z.string().default("UTC"),
    recordingConfig: z.object({
      enabled: z.boolean().default(false),
      consentRequired: z.boolean().default(true),
    }).optional(),
    aiConfig: z.object({
      enabled: z.boolean().default(false),
      generateSummary: z.boolean().optional(),
      extractDecisions: z.boolean().optional(),
      extractActionItems: z.boolean().optional(),
    }).optional(),
    settings: z.object({
      waitingRoomEnabled: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      guestAccess: z.boolean().optional(),
      passcode: z.string().regex(/^[A-Za-z0-9]{4,16}$/).optional(),
      recordingEnabled: z.boolean().optional(),
      aiEnabled: z.boolean().optional(),
      participantsMuted: z.boolean().optional(),
      allowRecording: z.boolean().optional(),
    }).optional(),
  }),
});

export const updateMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(256).optional(),
    description: z.string().max(2000).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    timezone: z.string().optional(),
    recordingConfig: z.object({
      enabled: z.boolean().optional(),
      consentRequired: z.boolean().optional(),
    }).optional(),
    aiConfig: z.object({
      enabled: z.boolean().optional(),
      generateSummary: z.boolean().optional(),
      extractDecisions: z.boolean().optional(),
      extractActionItems: z.boolean().optional(),
    }).optional(),
    settings: z.object({
      waitingRoomEnabled: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      guestAccess: z.boolean().optional(),
      passcode: z.string().regex(/^[A-Za-z0-9]{4,16}$/).optional(),
      recordingEnabled: z.boolean().optional(),
      aiEnabled: z.boolean().optional(),
      participantsMuted: z.boolean().optional(),
      allowRecording: z.boolean().optional(),
    }).optional(),
  }),
});

export const addParticipantSchema = z.object({
  body: z.object({
    userId: z.string().optional(), // ObjectId as string
    guestEmail: z.string().email().optional(),
    role: z.enum(["host", "moderator", "guest"]).default("guest"),
  }).refine(
    (data) => data.userId || data.guestEmail,
    "Either userId or guestEmail must be provided"
  ),
});

export const updateAgendaItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(256).optional(),
    description: z.string().max(1000).optional(),
    position: z.number().int().nonnegative().optional(),
    status: z.enum(["pending", "discussed", "completed"]).optional(),
  }),
});

export const agendaCreateSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(256),
    description: z.string().max(1000).optional(),
    position: z.number().int().nonnegative().optional(),
  }).strict(),
});

export const agendaReplaceSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        id: z.string().regex(/^[a-f\d]{24}$/i),
        position: z.number().int().nonnegative(),
      }).strict(),
    ),
  }).strict(),
});

export const agendaItemPatchSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(256).optional(),
    description: z.string().max(1000).optional(),
    position: z.number().int().nonnegative().optional(),
    status: z.enum(["pending", "discussed", "completed"]).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0),
});

export const endMeetingSchema = z.object({
  body: z.object({
    reason: z.string().optional(),  // Optional reason for ending (for audit log)
  }),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>["body"];
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>["body"];
export type AddParticipantInput = z.infer<typeof addParticipantSchema>["body"];
export type UpdateAgendaItemInput = z.infer<typeof updateAgendaItemSchema>["body"];
export type EndMeetingInput = z.infer<typeof endMeetingSchema>["body"];
