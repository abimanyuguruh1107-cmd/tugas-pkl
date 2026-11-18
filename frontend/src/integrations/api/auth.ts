/**
 * Authentication endpoints.
 *
 * The session store itself lives in `session.ts`; this module only performs
 * the calls and writes the resulting session.
 */

import { api, postJson, publicRequest } from './client'
import { clearAuth, getAuth, setAuth } from './session'
import type { AuthUser, LoginResult } from './session'

export async function login(email: string, password: string): Promise<LoginResult> {
  const { user, accessToken, refreshToken } = await postJson<LoginResult>(
    '/api/v1/auth/login',
    { email, password },
  )
  setAuth({ user, accessToken, refreshToken })
  return { user, accessToken, refreshToken }
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<LoginResult> {
  const { user, accessToken, refreshToken } = await postJson<LoginResult>(
    '/api/v1/auth/register',
    { name, email, password },
  )
  setAuth({ user, accessToken, refreshToken })
  return { user, accessToken, refreshToken }
}

export async function logout(): Promise<void> {
  const { refreshToken } = getAuth()
  if (refreshToken) {
    await publicRequest('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  clearAuth()
}

export async function fetchMe(): Promise<AuthUser> {
  const result = await api<{ user: AuthUser }>('/api/v1/auth/me')
  setAuth({ ...getAuth(), user: result.user })
  return result.user
}

// Re-exported so callers can import everything auth-related from one place.
export { ApiError } from './client'
export {
  clearAuth,
  getAccessToken,
  getAuth,
  getRefreshToken,
  setAuth,
  subscribeAuth,
} from './session'
export type { AuthState, AuthUser, LoginResult } from './session'
