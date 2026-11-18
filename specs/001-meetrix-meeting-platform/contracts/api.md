# API Contract: Meetrix Meeting Platform

**Created**: 2026-11-12
**Feature**: 001-meetrix-meeting-platform
**Base Path**: `/api/v1`

This document defines the interface contracts exposed by the Meetrix backend. Endpoint names are illustrative and must follow existing codebase conventions during implementation.

## Organizations

| Endpoint                         | Method | Description                             | Auth                 |
| -------------------------------- | ------ | --------------------------------------- | -------------------- |
| `/organizations`                 | GET    | List organizations for the current user | Required             |
| `/organizations/:organizationId` | GET    | Get organization details                | Required (member)    |
| `/organizations/:organizationId` | PATCH  | Update organization settings            | Required (org admin) |

## Members & Invitations

| Endpoint                                           | Method | Description                       | Auth                 |
| -------------------------------------------------- | ------ | --------------------------------- | -------------------- |
| `/organizations/:organizationId/members`           | GET    | List organization members         | Required (org admin) |
| `/organizations/:organizationId/invitations`       | POST   | Invite a user to the organization | Required (org admin) |
| `/organizations/:organizationId/members/:memberId` | PATCH  | Update member role or status      | Required (org admin) |
| `/organizations/:organizationId/members/:memberId` | DELETE | Remove/deactivate a member        | Required (org admin) |

## Meetings

| Endpoint               | Method | Description                                         | Auth                   |
| ---------------------- | ------ | --------------------------------------------------- | ---------------------- |
| `/meetings`            | GET    | List meetings (filtered by org, date, status, etc.) | Required               |
| `/meetings`            | POST   | Create a new meeting                                | Required               |
| `/meetings/:meetingId` | GET    | Get meeting details                                 | Required (participant) |
| `/meetings/:meetingId` | PATCH  | Update meeting details                              | Required (host/admin)  |
| `/meetings/:meetingId` | DELETE | Cancel/delete a meeting                             | Required (host/admin)  |

## Meeting Participants

| Endpoint                                           | Method | Description                      | Auth                   |
| -------------------------------------------------- | ------ | -------------------------------- | ---------------------- |
| `/meetings/:meetingId/participants`                | GET    | List meeting participants        | Required (participant) |
| `/meetings/:meetingId/participants`                | POST   | Invite participants to a meeting | Required (host/admin)  |
| `/meetings/:meetingId/participants/:participantId` | PATCH  | Update participant role/status   | Required (host/admin)  |

## Meeting Room

| Endpoint                          | Method | Description                             | Auth                            |
| --------------------------------- | ------ | --------------------------------------- | ------------------------------- |
| `/meetings/:meetingId/join-token` | POST   | Generate short-lived LiveKit room token | Required (eligible participant) |
| `/meetings/:meetingId/end`        | POST   | End the meeting for all participants    | Required (host)                 |

## Meeting Agenda

| Endpoint                      | Method | Description              | Auth                   |
| ----------------------------- | ------ | ------------------------ | ---------------------- |
| `/meetings/:meetingId/agenda` | GET    | Get meeting agenda items | Required (participant) |
| `/meetings/:meetingId/agenda` | PUT    | Replace entire agenda    | Required (host/admin)  |

## Meeting Notes

| Endpoint                     | Method | Description                    | Auth                   |
| ---------------------------- | ------ | ------------------------------ | ---------------------- |
| `/meetings/:meetingId/notes` | GET    | Get meeting notes              | Required (participant) |
| `/meetings/:meetingId/notes` | POST   | Create or update meeting notes | Required (participant) |

## Recordings

| Endpoint                                                | Method | Description             | Auth                                   |
| ------------------------------------------------------- | ------ | ----------------------- | -------------------------------------- |
| `/meetings/:meetingId/recordings`                       | GET    | List meeting recordings | Required (participant)                 |
| `/meetings/:meetingId/recordings/start`                 | POST   | Start recording         | Required (host, policy allows)         |
| `/meetings/:meetingId/recordings/stop`                  | POST   | Stop recording          | Required (host)                        |
| `/meetings/:meetingId/recordings/:recordingId/playback` | GET    | Get signed playback URL | Required (participant, access checked) |

## Transcripts

| Endpoint                                  | Method | Description                            | Auth                   |
| ----------------------------------------- | ------ | -------------------------------------- | ---------------------- |
| `/meetings/:meetingId/transcript`         | GET    | Get transcript with segments           | Required (participant) |
| `/meetings/:meetingId/transcript/correct` | PATCH  | Correct transcript text/speaker labels | Required (authorized)  |

## AI

| Endpoint                           | Method | Description                                  | Auth                              |
| ---------------------------------- | ------ | -------------------------------------------- | --------------------------------- |
| `/meetings/:meetingId/ai/generate` | POST   | Generate AI summary, decisions, action items | Required (host/admin, AI enabled) |
| `/meetings/:meetingId/ai/status`   | GET    | Get AI processing status                     | Required (participant)            |

## Minutes

| Endpoint                       | Method | Description                 | Auth                   |
| ------------------------------ | ------ | --------------------------- | ---------------------- |
| `/meetings/:meetingId/minutes` | GET    | Get minutes documents       | Required (participant) |
| `/minutes/:minutesId`          | PATCH  | Update draft minutes        | Required (host/admin)  |
| `/minutes/:minutesId/publish`  | POST   | Approve and publish minutes | Required (host/admin)  |

## Decisions

| Endpoint                         | Method | Description           | Auth                   |
| -------------------------------- | ------ | --------------------- | ---------------------- |
| `/meetings/:meetingId/decisions` | GET    | Get meeting decisions | Required (participant) |
| `/meetings/:meetingId/decisions` | POST   | Create a decision     | Required (participant) |

## Action Items

| Endpoint                            | Method | Description                                         | Auth                   |
| ----------------------------------- | ------ | --------------------------------------------------- | ---------------------- |
| `/action-items`                     | GET    | List action items (filtered by owner, status, etc.) | Required               |
| `/meetings/:meetingId/action-items` | POST   | Create an action item                               | Required (participant) |
| `/action-items/:actionItemId`       | PATCH  | Update action item status/details                   | Required (owner/admin) |

## Search

| Endpoint  | Method | Description                                         | Auth                     |
| --------- | ------ | --------------------------------------------------- | ------------------------ |
| `/search` | GET    | Search meetings, minutes, action items, transcripts | Required (tenant-scoped) |

## Notifications

| Endpoint                              | Method | Description               | Auth     |
| ------------------------------------- | ------ | ------------------------- | -------- |
| `/notifications`                      | GET    | List user notifications   | Required |
| `/notifications/:notificationId/read` | PATCH  | Mark notification as read | Required |

## Policies

| Endpoint                                          | Method | Description                          | Auth                 |
| ------------------------------------------------- | ------ | ------------------------------------ | -------------------- |
| `/organizations/:organizationId/meeting-policies` | GET    | Get organization meeting policies    | Required (org admin) |
| `/organizations/:organizationId/meeting-policies` | PATCH  | Update organization meeting policies | Required (org admin) |

## Audit Logs

| Endpoint                                    | Method | Description                   | Auth                 |
| ------------------------------------------- | ------ | ----------------------------- | -------------------- |
| `/organizations/:organizationId/audit-logs` | GET    | Get organization audit events | Required (org admin) |

## Webhooks

| Endpoint            | Method | Description                             | Auth               |
| ------------------- | ------ | --------------------------------------- | ------------------ |
| `/webhooks/livekit` | POST   | Receive LiveKit room/participant events | Signature-verified |

## Authentication & Error Conventions

- All endpoints require JWT authentication unless noted
- Errors return standard HTTP status codes with JSON error body
- Tenant context is derived from authenticated membership, not request body
- All responses enforce tenant and meeting-level authorization
