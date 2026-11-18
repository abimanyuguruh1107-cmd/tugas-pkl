/**
 * Frontend permission helpers.
 *
 * These mirror the backend RBAC convention (`resource:action`) so the UI can
 * hide controls a user cannot use. **Backend authorization remains
 * authoritative** — hiding a control is a usability feature, not a security
 * boundary.
 */

import type { AuthUser } from '#/integrations/api/auth'

/** Wildcard permission granting full access. */
export const ALL_PERMISSIONS = '*'

export type Permission = string

export function getPermissions(user: AuthUser | null): string[] {
  return user?.role.permissions ?? []
}

/** True when the user holds the wildcard permission. */
export function isAdmin(user: AuthUser | null): boolean {
  return getPermissions(user).includes(ALL_PERMISSIONS)
}

/**
 * Check a single `resource:action` permission.
 * Admins pass every check.
 */
export function can(
  user: AuthUser | null,
  permission: Permission,
): boolean {
  if (!user) return false
  const permissions = getPermissions(user)
  if (permissions.includes(ALL_PERMISSIONS)) return true
  return permissions.includes(permission)
}

/** Check several permissions at once — true when every one is granted. */
export function canAll(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(user, permission))
}

/** Check several permissions at once — true when at least one is granted. */
export function canAny(user: AuthUser | null, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(user, permission))
}

/**
 * Build a `resource:action` permission string.
 * `buildPermission('meetings', 'create')` → `'meetings:create'`
 */
export function buildPermission(resource: string, action: string): Permission {
  return `${resource}:${action}`
}

/**
 * Whether the user owns the resource. Resource-level ownership can further
 * restrict access beyond organization permissions.
 */
export function isOwner(user: AuthUser | null, ownerId?: string): boolean {
  return Boolean(user && ownerId && user.id === ownerId)
}
