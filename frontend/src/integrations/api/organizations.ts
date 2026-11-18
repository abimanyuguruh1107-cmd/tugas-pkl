/**
 * Organization, membership, role, and policy endpoints.
 *
 * Every request is scoped to the active organization on the server side.
 */

import { api } from './client'

export interface Organization {
  id: string
  name: string
  slug: string
  timezone: string
  logoUrl?: string
  settings?: Record<string, unknown>
}

export interface Member {
  id: string
  userId: string
  email: string
  name: string
  roleId: string
  roleName: string
  status: 'active' | 'invited' | 'deactivated'
  joinedAt: string
}

export interface Role {
  id: string
  organizationId: string
  name: string
  permissions: string[]
  isSystem: boolean
}

export interface InviteMemberInput {
  email: string
  roleId: string
}

// --- organizations ---

export function listOrganizations(): Promise<Organization[]> {
  return api<Organization[]>('/api/v1/organizations')
}

export function getOrganization(organizationId: string): Promise<Organization> {
  return api<Organization>(`/api/v1/organizations/${organizationId}`)
}

export function updateOrganization(
  organizationId: string,
  input: Partial<Pick<Organization, 'name' | 'timezone' | 'logoUrl'>>,
): Promise<Organization> {
  return api<Organization>(`/api/v1/organizations/${organizationId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

// --- members ---

export function listMembers(organizationId: string): Promise<Member[]> {
  return api<Member[]>(`/api/v1/organizations/${organizationId}/members`)
}

export function inviteMember(
  organizationId: string,
  input: InviteMemberInput,
): Promise<Member> {
  return api<Member>(`/api/v1/organizations/${organizationId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deactivateMember(
  organizationId: string,
  memberId: string,
): Promise<void> {
  return api<void>(`/api/v1/organizations/${organizationId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

// --- roles ---

export function listRoles(organizationId: string): Promise<Role[]> {
  return api<Role[]>(`/api/v1/organizations/${organizationId}/roles`)
}

export function createRole(
  organizationId: string,
  input: { name: string; permissions: string[] },
): Promise<Role> {
  return api<Role>(`/api/v1/organizations/${organizationId}/roles`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateRole(
  organizationId: string,
  roleId: string,
  input: { name?: string; permissions?: string[] },
): Promise<Role> {
  return api<Role>(`/api/v1/organizations/${organizationId}/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteRole(organizationId: string, roleId: string): Promise<void> {
  return api<void>(`/api/v1/organizations/${organizationId}/roles/${roleId}`, {
    method: 'DELETE',
  })
}

// --- policies ---

export interface MeetingPolicies {
  recordingEnabled: boolean
  aiEnabled: boolean
  retentionDays: {
    recording: number
    transcript: number
    audit: number
  }
  guestDomains: string[]
}

export function getMeetingPolicies(organizationId: string): Promise<MeetingPolicies> {
  return api<MeetingPolicies>(`/api/v1/organizations/${organizationId}/meeting-policies`)
}

export function updateMeetingPolicies(
  organizationId: string,
  input: Partial<MeetingPolicies>,
): Promise<MeetingPolicies> {
  return api<MeetingPolicies>(`/api/v1/organizations/${organizationId}/meeting-policies`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
