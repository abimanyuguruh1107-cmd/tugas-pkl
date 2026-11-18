/**
 * Shared types for the LiveKit meeting room integration.
 */

import type { ConnectionQuality } from 'livekit-client'

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'

export interface ConnectionState {
  status: ConnectionStatus
  quality: ConnectionQuality
  participantCount: number
}

export type ConnectionStateListener = (state: ConnectionState) => void

export interface MediaDeviceOption {
  deviceId: string
  label: string
}
