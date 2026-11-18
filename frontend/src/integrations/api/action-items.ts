/**
 * Action item endpoints.
 *
 * Action items always belong to a meeting and may be proposed by AI.
 * AI-proposed items stay unconfirmed until a user assigns an owner.
 */

import { api } from './client'

export type ActionItemPriority = 'low' | 'medium' | 'high'

export type ActionItemStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled'

export interface ActionItem {
  id: string
  meetingId: string
  title: string
  description?: string
  ownerId?: string
  ownerName?: string
  dueAt?: string
  priority: ActionItemPriority
  status: ActionItemStatus
  /** Transcript segment the item was derived from, when AI-proposed. */
  sourceSegment?: string
  /** True while the item is still an unreviewed AI proposal. */
  isAiProposal?: boolean
  createdAt: string
  updatedAt: string
}

export interface ListActionItemsParams {
  ownerId?: string
  status?: ActionItemStatus | ActionItemStatus[]
  dueBefore?: string
  dueAfter?: string
  meetingId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface UpdateActionItemInput {
  title?: string
  description?: string
  ownerId?: string
  dueAt?: string
  priority?: ActionItemPriority
  status?: ActionItemStatus
}

export function listActionItems(
  params: ListActionItemsParams = {},
): Promise<{ items: ActionItem[]; total: number }> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    query.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })
  const suffix = query.toString() ? `?${query}` : ''
  return api<{ items: ActionItem[]; total: number }>(`/api/v1/action-items${suffix}`)
}

export function getActionItem(actionItemId: string): Promise<ActionItem> {
  return api<ActionItem>(`/api/v1/action-items/${actionItemId}`)
}

export function createActionItem(
  meetingId: string,
  input: Omit<UpdateActionItemInput, 'status'> & { title: string },
): Promise<ActionItem> {
  return api<ActionItem>(`/api/v1/meetings/${meetingId}/action-items`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateActionItem(
  actionItemId: string,
  input: UpdateActionItemInput,
): Promise<ActionItem> {
  return api<ActionItem>(`/api/v1/action-items/${actionItemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
