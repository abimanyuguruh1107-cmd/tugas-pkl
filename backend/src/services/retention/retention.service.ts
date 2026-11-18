import { Meeting } from "../../models/meeting.model";

export interface RetentionPolicy {
  recordingRetentionDays: number;
  transcriptRetentionDays: number;
  auditLogRetentionDays: number;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  recordingRetentionDays: 90,
  transcriptRetentionDays: 180,
  auditLogRetentionDays: 365,
};

export async function applyRetentionPolicy(
  _organizationId: string,
  _policy: RetentionPolicy,
): Promise<{
  recordingsDeleted: number;
  transcriptsDeleted: number;
  auditLogsDeleted: number;
}> {
  // TODO: implementasi bergantung pada schema MeetingRecordingState yang sebenarnya.
  // Saat ini no-op agar tidak ada meeting yang terhapus tanpa kriteria yang jelas.
  return {
    recordingsDeleted: 0,
    transcriptsDeleted: 0,
    auditLogsDeleted: 0,
  };
}

export async function getRetentionStatus(_organizationId: string): Promise<{
  totalMeetings: number;
  meetingsWithRecordings: number;
  meetingsApproachingRetention: number;
  earliestRecordingDate?: Date;
}> {
  // TODO: sesuaikan filter setelah schema recording dikonfirmasi.
  const totalMeetings = await Meeting.countDocuments({ organizationId: _organizationId });

  return {
    totalMeetings,
    meetingsWithRecordings: 0,
    meetingsApproachingRetention: 0,
  };
}