/**
 * Meeting Lifecycle States
 * draft → scheduled → live → ended → processing → completed
 * cancelled is terminal from any pre-completed status
 */
export enum MeetingStatus {
  DRAFT = "draft",          // Not yet scheduled
  SCHEDULED = "scheduled",  // Scheduled, not started
  LIVE = "live",            // Currently happening
  ENDED = "ended",          // Meeting ended, awaiting processing
  PROCESSING = "processing", // Recording/transcription/AI in progress
  COMPLETED = "completed",  // All processing done
  CANCELLED = "cancelled",  // Terminal: can be from draft, scheduled, live
}

/**
 * Participant roles in meetings
 */
export enum ParticipantRole {
  HOST = "host",           // Can manage meeting, start recording, end
  MODERATOR = "moderator", // Can mute, remove participants
  GUEST = "guest",         // Standard participant
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  [MeetingStatus.DRAFT]: [MeetingStatus.SCHEDULED, MeetingStatus.CANCELLED],
  [MeetingStatus.SCHEDULED]: [MeetingStatus.LIVE, MeetingStatus.CANCELLED],
  [MeetingStatus.LIVE]: [MeetingStatus.ENDED, MeetingStatus.CANCELLED],
  [MeetingStatus.ENDED]: [MeetingStatus.PROCESSING, MeetingStatus.COMPLETED, MeetingStatus.CANCELLED],
  [MeetingStatus.PROCESSING]: [MeetingStatus.COMPLETED],
  [MeetingStatus.COMPLETED]: [], // Terminal
  [MeetingStatus.CANCELLED]: [], // Terminal
};

/**
 * Validate state transition
 * @throws Error if transition invalid
 */
export function validateMeetingTransition(
  fromStatus: MeetingStatus,
  toStatus: MeetingStatus,
): void {
  const validTransitions = VALID_TRANSITIONS[fromStatus];
  if (!validTransitions.includes(toStatus)) {
    throw new Error(
      `Invalid meeting state transition: ${fromStatus} → ${toStatus}`,
    );
  }
}

/**
 * Check if status is terminal
 */
export function isTerminalStatus(status: MeetingStatus): boolean {
  return status === MeetingStatus.COMPLETED || status === MeetingStatus.CANCELLED;
}

/**
 * Check if status allows processing
 */
export function canProcessMeeting(status: MeetingStatus): boolean {
  return status === MeetingStatus.ENDED;
}

/**
 * Check if meeting is currently live
 */
export function isLive(status: MeetingStatus): boolean {
  return status === MeetingStatus.LIVE;
}
