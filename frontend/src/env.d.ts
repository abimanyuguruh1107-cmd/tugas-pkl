/// <reference types="vite/client" />

/**
 * Typed environment variables.
 *
 * Only variables prefixed with `VITE_` are exposed to the browser.
 * Secrets (LiveKit API secret, database credentials, JWT secrets) must never
 * be declared here — they belong to `backend/.env` only.
 */
interface ImportMetaEnv {
  /** Backend API base URL. Empty in development to use the Vite proxy. */
  readonly VITE_API_URL?: string
  /** LiveKit signaling URL. */
  readonly VITE_LIVEKIT_URL?: string
  /** LiveKit public API key. The secret key stays server-side. */
  readonly VITE_LIVEKIT_PUBLIC_KEY?: string
  /** PostHog analytics key. Empty disables analytics. */
  readonly VITE_POSTHOG_KEY?: string
  /** PostHog ingestion host. Empty falls back to the US cloud endpoint. */
  readonly VITE_POSTHOG_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
