/**
 * HTTP transport for the Meetrix backend.
 *
 * - Attaches the stored access token to every request.
 * - On 401, refreshes the token once, then retries the request.
 * - In development requests go through the Vite proxy (/api -> localhost:3000).
 * - Throws `ApiError` for every non-2xx response so callers can branch on
 *   `status` instead of parsing response bodies.
 *
 * Depends only on `session.ts`, which has no imports of its own — this keeps
 * the module graph free of cycles.
 */

import { env } from '#/lib/env'
import { clearAuth, getAccessToken, getRefreshToken, setAuth } from './session'
import type { LoginResult } from './session'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function rawRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (response.status === 204) return undefined as T

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : response.statusText,
      data.details,
    )
  }

  return data as T
}

/**
 * Exchange the refresh token for a new access token.
 * Returns false when the session cannot be recovered.
 */
async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const { user, accessToken, refreshToken: nextRefreshToken } =
      await rawRequest<LoginResult>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
    setAuth({ user, accessToken, refreshToken: nextRefreshToken })
    return true
  } catch {
    clearAuth()
    return false
  }
}

/**
 * Perform an authenticated request.
 *
 * On a 401 the access token is refreshed once and the request is retried.
 * A second 401 clears the session and rethrows.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  try {
    return await rawRequest<T>(path, { ...options, token: getAccessToken() })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && retry) {
      const refreshed = await tryRefresh()
      if (refreshed) return api<T>(path, options, false)
      clearAuth()
    }
    throw error
  }
}

/** Perform an unauthenticated request (login, register, password reset). */
export function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return rawRequest<T>(path, options)
}

/** Convenience wrapper for JSON `POST` bodies. */
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return publicRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
