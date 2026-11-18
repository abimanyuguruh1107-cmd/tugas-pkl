/**
 * Meeting endpoints.
 *
 * These types mirror the backend contract in `specs/001-meetrix-meeting-platform/contracts/api.md`
 * and the entities in `data-model.md`. Keep them in sync when the backend changes.
 */

import { api } from './client'

export type MeetingStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'processing'
  | 'completed'
  | 'cancelled'

export type ParticipantRole = 'host' | 'co_host' | 'member' | 'guest'

export type InvitationStatus = 'invited' | 'accepted' | 'declined' | 'waiting' | 'absent'

export interface MeetingSettings {
  waitingRoom: boolean
  guestAccess: boolean
  passcode?: string
  recordingEnabled: boolean
  aiEnabled: boolean
}

export interface Meeting {
  id: string
  organizationId: string
  title: string
  description?: string
  startAt: string
  endAt: string
  timezone: string
  status: MeetingStatus
  hostId: string
  settings: MeetingSettings
  createdAt: string
  updatedAt: string
}

export interface MeetingParticipant {
  id: string
  meetingId: string
  userId?: string
  guestEmail?: string
  displayName: string
  role: ParticipantRole
  invitationStatus: InvitationStatus
}

export interface AgendaItem {
  id: string
  meetingId: string
  title: string
  description?: string
  position: number
  status: 'pending' | 'discussed' | 'completed'
}

export interface CreateMeetingInput {
  title: string
  description?: string
  startAt: string
  endAt: string
  timezone: string
  hostId?: string
  participantEmails?: string[]
  agenda?: Array<{ title: string; description?: string }>
  settings?: Partial<MeetingSettings>
}

export interface ListMeetingsParams {
  status?: MeetingStatus
  from?: string
  to?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// --- meetings ---

export function listMeetings(params: ListMeetingsParams = {}): Promise<Paginated<Meeting>> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const suffix = query.toString() ? `?${query}` : ''
  return api<Paginated<Meeting>>(`/api/v1/meetings${suffix}`)
}

export function getMeeting(meetingId: string): Promise<Meeting> {
  return api<Meeting>(`/api/v1/meetings/${meetingId}`)
}

export function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  return api<Meeting>('/api/v1/meetings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateMeeting(
  meetingId: string,
  input: Partial<CreateMeetingInput>,
): Promise<Meeting> {
  return api<Meeting>(`/api/v1/meetings/${meetingId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function cancelMeeting(meetingId: string): Promise<void> {
  return api<void>(`/api/v1/meetings/${meetingId}`, { method: 'DELETE' })
}

// --- participants ---

export function listParticipants(meetingId: string): Promise<MeetingParticipant[]> {
  return api<MeetingParticipant[]>(`/api/v1/meetings/${meetingId}/participants`)
}

export function inviteParticipant(
  meetingId: string,
  input: { email: string; role: ParticipantRole },
): Promise<MeetingParticipant> {
  return api<MeetingParticipant>(`/api/v1/meetings/${meetingId}/participants`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// --- agenda ---

export function listAgenda(meetingId: string): Promise<AgendaItem[]> {
  return api<AgendaItem[]>(`/api/v1/meetings/${meetingId}/agenda`)
}

export function putAgenda(
  meetingId: string,
  items: Array<{ title: string; description?: string }>,
): Promise<AgendaItem[]> {
  return api<AgendaItem[]>(`/api/v1/meetings/${meetingId}/agenda`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

// --- meeting room ---

export interface JoinTokenResponse {
  token: string
  url?: string
  roomName?: string
}

export function requestJoinToken(meetingId: string): Promise<JoinTokenResponse> {
  return api<JoinTokenResponse>(`/api/v1/meetings/${meetingId}/join-token`, {
    method: 'POST',
  })
}

export function endMeeting(meetingId: string): Promise<void> {
  return api<void>(`/api/v1/meetings/${meetingId}/end`, { method: 'POST' })
}
