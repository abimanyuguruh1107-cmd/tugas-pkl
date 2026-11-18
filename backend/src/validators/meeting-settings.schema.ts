import { z } from "zod";
import { ApiError } from "../lib/errors";

/** Settings a host can configure per meeting (FR-019, FR-048, FR-066). */
export const meetingSettingsSchema = z.strictObject({
  waitingRoom: z.boolean().default(false),
  guestAccess: z.boolean().default(false),
  passcode: z
    .string()
    .regex(/^[A-Za-z0-9]{4,16}$/, "Passcode must be 4-16 letters or digits")
    .optional(),
  recordingEnabled: z.boolean().default(false),
  aiEnabled: z.boolean().default(false),
});

export type MeetingSettings = z.infer<typeof meetingSettingsSchema>;

/**
 * Meeting policy an organization can set under
 * `organization.settings.meetingPolicy`. Missing keys fall back to the
 * defaults below: guest access is allowed, while recording and AI are opt-in.
 */
export const meetingPolicySchema = z.object({
  allowGuestAccess: z.boolean().default(true),
  allowRecording: z.boolean().default(false),
  allowAI: z.boolean().default(false),
  requireWaitingRoom: z.boolean().default(false),
  requirePasscode: z.boolean().default(false),
}).strict();

export const meetingPolicyPatchSchema = z
  .object({
    allowGuestAccess: z.boolean().optional(),
    allowRecording: z.boolean().optional(),
    allowAI: z.boolean().optional(),
    requireWaitingRoom: z.boolean().optional(),
    requirePasscode: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const meetingPolicyPatchRequestSchema = z.object({
  body: meetingPolicyPatchSchema,
});

export type MeetingPolicy = z.infer<typeof meetingPolicySchema>;

export function resolveMeetingPolicy(
  organizationSettings: Record<string, unknown>,
): MeetingPolicy {
  const parsed = meetingPolicySchema.safeParse(
    organizationSettings["meetingPolicy"] ?? {},
  );
  if (!parsed.success) {
    throw new ApiError(500, "Organization meeting policy is malformed");
  }
  return parsed.data;
}

/**
 * Validate meeting settings and check them against the organization's
 * policy. Throws 400 (schema errors via ZodError, policy violations via
 * ApiError) and returns the normalized settings otherwise.
 */
export function validateMeetingSettings(
  input: unknown,
  organizationSettings: Record<string, unknown>,
): MeetingSettings {
  const settings = meetingSettingsSchema.parse(input ?? {});
  const policy = resolveMeetingPolicy(organizationSettings);

  const violations: string[] = [];

  if (settings.guestAccess && !policy.allowGuestAccess) {
    violations.push("Guest access is not allowed by organization policy");
  }
  if (settings.recordingEnabled && !policy.allowRecording) {
    violations.push("Recording is not allowed by organization policy");
  }
  if (settings.aiEnabled && !policy.allowAI) {
    violations.push("AI features are not enabled by organization policy");
  }
  if (policy.requireWaitingRoom && !settings.waitingRoom) {
    violations.push("Organization policy requires the waiting room");
  }
  if (policy.requirePasscode && !settings.passcode) {
    violations.push("Organization policy requires a meeting passcode");
  }

  if (violations.length > 0) {
    throw ApiError.badRequest(
      "Meeting settings violate organization policy",
      violations,
    );
  }

  return settings;
}
