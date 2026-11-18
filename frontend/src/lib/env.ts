/**
 * Single access point for runtime configuration.
 *
 * Import from here instead of reading `import.meta.env` directly so every
 * fallback lives in one place and stays consistent between dev and prod.
 */

export const env = {
  /** Backend API base URL. Empty in development to use the Vite proxy. */
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  /** LiveKit signaling URL used by the meeting room. */
  livekitUrl: import.meta.env.VITE_LIVEKIT_URL ?? 'ws://localhost:7880',
  /** LiveKit public key. The API secret must never reach the browser. */
  livekitPublicKey: import.meta.env.VITE_LIVEKIT_PUBLIC_KEY ?? '',
  /** PostHog analytics key. Empty means analytics is disabled. */
  posthogKey: import.meta.env.VITE_POSTHOG_KEY ?? '',
  /** PostHog ingestion host. Empty falls back to the US cloud endpoint. */
  posthogHost: import.meta.env.VITE_POSTHOG_HOST ?? '',
} as const

export const isDevelopment = import.meta.env.DEV
