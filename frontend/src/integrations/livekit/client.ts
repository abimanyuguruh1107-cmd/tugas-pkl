/**
 * LiveKit client wrapper for the Meetrix meeting room.
 *
 * Responsibilities:
 * - Exchange a meeting id for a short-lived room token via the backend.
 * - Manage a single `Room` instance (connect, reconnect, disconnect).
 * - Expose microphone / camera / screen-share toggles.
 * - Report connection quality so the UI can surface network problems.
 *
 * The LiveKit secret key never reaches the browser: the backend issues
 * short-lived tokens scoped to a single meeting.
 */

import { Room, RoomEvent } from 'livekit-client'
import type {
  LocalParticipant,
  LocalTrack,
  RoomConnectOptions,
} from 'livekit-client'
import { requestJoinToken } from '#/integrations/api/meetings'
import { env } from '#/lib/env'
import type {
  ConnectionState,
  ConnectionStateListener,
} from './types'

let room: Room | null = null
const listeners = new Set<ConnectionStateListener>()

function emit(patch: Partial<ConnectionState>): void {
  if (!room) return
  const state: ConnectionState = {
    status: 'disconnected',
    quality: room.localParticipant.connectionQuality,
    participantCount: room.remoteParticipants.size,
    ...patch,
  }
  listeners.forEach((listener) => listener(state))
}

/** Connect to a meeting room. Safe to call again to reconnect after a drop. */
export async function connectToMeeting(
  meetingId: string,
  displayName?: string,
): Promise<Room> {
  if (room) {
    await disconnectFromMeeting()
  }

  const { token, url } = await requestJoinToken(meetingId)

  const created = new Room({
    adaptiveStream: true,
    dynacast: true,
  })

  created
    .on(RoomEvent.ConnectionStateChanged, (state) => {
      emit({ status: state === 'connected' ? 'connected' : 'reconnecting' })
    })
    .on(RoomEvent.Reconnecting, () => emit({ status: 'reconnecting' }))
    .on(RoomEvent.Reconnected, () => emit({ status: 'connected' }))
    .on(RoomEvent.Disconnected, () => emit({ status: 'disconnected' }))
    .on(RoomEvent.ParticipantConnected, () => {
      emit({ participantCount: created.remoteParticipants.size })
    })
    .on(RoomEvent.ParticipantDisconnected, () => {
      emit({ participantCount: created.remoteParticipants.size })
    })
    .on(RoomEvent.LocalTrackPublished, () => {
      emit({ quality: created.localParticipant.connectionQuality })
    })
    .on(RoomEvent.ConnectionQualityChanged, (quality) => {
      emit({ quality })
    })

  const connectOptions: RoomConnectOptions = {
    autoSubscribe: true,
    ...(displayName ? { name: displayName } : {}),
  }

  await created.connect(url ?? env.livekitUrl, token, connectOptions)
  room = created
  emit({ status: 'connected' })

  return created
}

/** Leave the current room without ending the meeting for other participants. */
export async function disconnectFromMeeting(): Promise<void> {
  if (!room) return
  const current = room
  room = null
  await current.disconnect()
  emit({ status: 'disconnected', participantCount: 0 })
}

export function getRoom(): Room | null {
  return room
}

export function getLocalParticipant(): LocalParticipant | null {
  return room?.localParticipant ?? null
}

export async function setMicrophoneEnabled(enabled: boolean): Promise<void> {
  await room?.localParticipant.setMicrophoneEnabled(enabled)
}

export async function setCameraEnabled(enabled: boolean): Promise<void> {
  await room?.localParticipant.setCameraEnabled(enabled)
}

export async function setScreenShareEnabled(enabled: boolean): Promise<void> {
  await room?.localParticipant.setScreenShareEnabled(enabled)
}

/** Publish an externally created local track (e.g. a captured screen stream). */
export async function publishTrack(track: LocalTrack): Promise<void> {
  await room?.localParticipant.publishTrack(track)
}

export function subscribeToConnectionState(
  listener: ConnectionStateListener,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
