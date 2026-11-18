/**
 * Canonical list of permissions used across the app.
 * Permissions follow the `resource:action` convention.
 */
export const PERMISSIONS = {
  // Organization management
  ORGANIZATIONS_READ: "organizations:read",
  ORGANIZATIONS_MANAGE: "organizations:manage",

  // Member management
  MEMBERS_READ: "members:read",
  MEMBERS_INVITE: "members:invite",
  MEMBERS_MANAGE: "members:manage",
  MEMBERS_REMOVE: "members:remove",

  // Role management
  ROLES_READ: "roles:read",
  ROLES_MANAGE: "roles:manage",

  // Meeting management
  MEETINGS_CREATE: "meetings:create",
  MEETINGS_READ: "meetings:read",
  MEETINGS_UPDATE: "meetings:update",
  MEETINGS_CANCEL: "meetings:cancel",
  MEETINGS_DELETE: "meetings:delete",
  MEETINGS_MANAGE_ALL: "meetings:manage_all",

  // Meeting participants
  MEETING_PARTICIPANTS_INVITE: "meeting_participants:invite",
  MEETING_PARTICIPANTS_MANAGE: "meeting_participants:manage",

  // Meeting host controls
  MEETING_HOST_CONTROL: "meeting_host:control",
  MEETING_NOTES_WRITE: "meeting_notes:write",
  ACTION_ITEMS_READ: "action_items:read",
  ACTION_ITEMS_WRITE: "action_items:write",
  MEETING_SEARCH: "meetings:search",

  // Meeting recordings
  MEETING_RECORDINGS_READ: "meeting_recordings:read",
  MEETING_RECORDINGS_MANAGE: "meeting_recordings:manage",

  // Meeting transcripts
  MEETING_TRANSCRIPTS_READ: "meeting_transcripts:read",
  MEETING_TRANSCRIPTS_MANAGE: "meeting_transcripts:manage",

  // Meeting minutes
  MEETING_MINUTES_READ: "meeting_minutes:read",
  MEETING_MINUTES_WRITE: "meeting_minutes:write",
  MEETING_MINUTES_APPROVE: "meeting_minutes:approve",
  MEETING_MINUTES_PUBLISH: "meeting_minutes:publish",

  // Meeting files
  MEETING_FILES_READ: "meeting_files:read",
  MEETING_FILES_UPLOAD: "meeting_files:upload",
  MEETING_FILES_DELETE: "meeting_files:delete",

  // Meeting AI
  MEETING_AI_USE: "meeting_ai:use",
  MEETING_AI_MANAGE: "meeting_ai:manage",

  // Audit logs
  AUDIT_LOGS_READ: "audit_logs:read",

  // Meeting policies
  MEETING_POLICIES_READ: "meeting_policies:read",
  MEETING_POLICIES_MANAGE: "meeting_policies:manage",

  // Legacy users permissions (kept for backward compatibility)
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Role names with special meaning. */
export const ROLES = {
  PLATFORM_SUPER_ADMIN: "platform_super_admin",
  ORGANIZATION_OWNER: "organization_owner",
  ORGANIZATION_ADMIN: "organization_admin",
  MEETING_ADMIN: "meeting_admin",
  MEETING_HOST: "meeting_host",
  MEMBER: "member",
  GUEST: "guest",
  // Backward compatibility aliases
  ADMIN: "admin",
  USER: "user",
} as const;

/**
 * Check if a permission string follows the resource:action convention.
 */
export function isValidPermission(permission: string): boolean {
  return /^[a-z_]+:[a-z_]+$/.test(permission);
}

/**
 * Extract the resource part from a permission string (e.g. "meetings:create" -> "meetings").
 */
export function getPermissionResource(permission: string): string {
  const parts = permission.split(":");
  return parts[0] ?? "";
}

/**
 * Extract the action part from a permission string (e.g. "meetings:create" -> "create").
 */
export function getPermissionAction(permission: string): string {
  const parts = permission.split(":");
  return parts[1] ?? "";
}

/**
 * Check if a user has a specific permission from their role permissions array.
 * Supports wildcard "*" which grants all actions on a resource.
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string,
): boolean {
  if (userPermissions.includes("*")) return true;
  if (userPermissions.includes(requiredPermission)) return true;

  const resource = getPermissionResource(requiredPermission);

  // Check for wildcard on this resource (e.g. "meetings:*")
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
}

/**
 * Check if a user has ALL of the required permissions.
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((p) => hasPermission(userPermissions, p));
}

/**
 * Check if a user has ANY of the required permissions.
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((p) => hasPermission(userPermissions, p));
}
