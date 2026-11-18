/**
 * Session store.
 *
 * Holds the authenticated user and tokens, persists them to `localStorage`,
 * and exposes a tiny reactive subscription so React components can react to
 * login/logout without a global store library.
 *
 * This module deliberately has **no imports** so the transport layer can use
 * it without creating a circular dependency.
 */

const STORAGE_KEY = 'merb.auth'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: { id: string; name: string; permissions: string[] }
}

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
}

export interface LoginResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

// --- reactive store ---

const listeners = new Set<() => void>()

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

// --- persistence ---

function loadState(): AuthState {
  if (typeof localStorage === 'undefined') {
    return { user: null, accessToken: null, refreshToken: null }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AuthState
  } catch {
    // corrupted storage — reset
  }
  return { user: null, accessToken: null, refreshToken: null }
}

export function getAuth(): AuthState {
  return loadState()
}

export function getAccessToken(): string | null {
  return loadState().accessToken
}

export function getRefreshToken(): string | null {
  return loadState().refreshToken
}

export function setAuth(state: AuthState): void {
  if (typeof localStorage === 'undefined') return
  if (state.accessToken) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  notify()
}

export function clearAuth(): void {
  setAuth({ user: null, accessToken: null, refreshToken: null })
}
