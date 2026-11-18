# Data Model: Meetrix Meeting Platform

**Created**: 2026-11-12
**Feature**: 001-meetrix-meeting-platform

Logical data model derived from PRD Section 8. Exact schemas, indexes, and embedding decisions should be finalized during technical design.

## Core Collections

### organizations

**Purpose**: Tenant records

| Field     | Type     | Required | Description                                                          |
| --------- | -------- | -------- | -------------------------------------------------------------------- |
| _id       | ObjectId | Yes      | Primary key                                                          |
| name      | String   | Yes      | Organization display name                                            |
| slug      | String   | Yes      | Unique URL-friendly identifier                                       |
| timezone  | String   | Yes      | IANA timezone (e.g., "Asia/Jakarta")                                 |
| settings  | Object   | Yes      | Organization-level configuration (recording, AI, retention policies) |
| createdAt | Date     | Yes      | Creation timestamp                                                   |
| updatedAt | Date     | Yes      | Last update timestamp                                                |

**Validation rules**:

- `slug` must be unique across all organizations
- `timezone` must be a valid IANA timezone string

### memberships

**Purpose**: User-to-organization relationship

| Field          | Type     | Required | Description                        |
| -------------- | -------- | -------- | ---------------------------------- |
| _id            | ObjectId | Yes      | Primary key                        |
| organizationId | ObjectId | Yes      | Reference to organizations         |
| userId         | ObjectId | Yes      | Reference to users                 |
| roleId         | ObjectId | Yes      | Reference to roles                 |
| status         | String   | Yes      | `active`, `invited`, `deactivated` |
| createdAt      | Date     | Yes      | Creation timestamp                 |
| updatedAt      | Date     | Yes      | Last update timestamp              |

**Validation rules**:

- Combination of `organizationId` + `userId` must be unique
- `roleId` must belong to the same `organizationId`

### roles

**Purpose**: Role definitions

| Field          | Type     | Required | Description                                            |
| -------------- | -------- | -------- | ------------------------------------------------------ |
| _id            | ObjectId | Yes      | Primary key                                            |
| organizationId | ObjectId | Yes      | Reference to organizations                             |
| name           | String   | Yes      | Role name (e.g., "Organization Admin", "Meeting Host") |
| permissions    | String[] | Yes      | Array of `resource:action` permission strings          |
| isSystem       | Boolean  | Yes      | Whether role is system-defined (non-deletable)         |

**Validation rules**:

- `name` must be unique within an organization
- Each permission must follow `resource:action` format

### users

**Purpose**: Global user identity

| Field  | Type     | Required | Description          |
| ------ | -------- | -------- | -------------------- |
| _id    | ObjectId | Yes      | Primary key          |
| email  | String   | Yes      | Unique email address |
| name   | String   | Yes      | Display name         |
| avatar | String   | No       | Avatar URL           |
| status | String   | Yes      | `active`, `inactive` |

**Validation rules**:

- `email` must be unique globally
- Email must be valid format

### invitations

**Purpose**: Organization invitations

| Field          | Type     | Required | Description                                  |
| -------------- | -------- | -------- | -------------------------------------------- |
| _id            | ObjectId | Yes      | Primary key                                  |
| organizationId | ObjectId | Yes      | Reference to organizations                   |
| email          | String   | Yes      | Invitee email                                |
| roleId         | ObjectId | Yes      | Reference to roles                           |
| tokenHash      | String   | Yes      | Hashed invitation token                      |
| expiresAt      | Date     | Yes      | Expiration timestamp                         |
| status         | String   | Yes      | `pending`, `accepted`, `declined`, `revoked` |

**Validation rules**:

- `tokenHash` must be unique
- `expiresAt` must be in the future when created

### meetings

**Purpose**: Meeting metadata and lifecycle

| Field          | Type     | Required | Description                                                                   |
| -------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| _id            | ObjectId | Yes      | Primary key                                                                   |
| organizationId | ObjectId | Yes      | Reference to organizations                                                    |
| title          | String   | Yes      | Meeting title                                                                 |
| description    | String   | No       | Meeting description                                                           |
| startAt        | Date     | Yes      | Scheduled start time (UTC)                                                    |
| endAt          | Date     | Yes      | Scheduled end time (UTC)                                                      |
| timezone       | String   | Yes      | IANA timezone for display                                                     |
| status         | String   | Yes      | `draft`, `scheduled`, `live`, `ended`, `processing`, `completed`, `cancelled` |
| hostId         | ObjectId | Yes      | Reference to users (meeting host)                                             |
| settings       | Object   | Yes      | Meeting settings (waiting room, recording, AI, passcode)                      |

**Validation rules**:

- `endAt` must be after `startAt`
- `status` transitions must follow valid lifecycle: `draft → scheduled → live → ended → processing → completed`, or `cancelled` at any point before `completed`

### meetingParticipants

**Purpose**: Invitees and participant access

| Field            | Type     | Required | Description                                  |
| ---------------- | -------- | -------- | -------------------------------------------- |
| _id              | ObjectId | Yes      | Primary key                                  |
| meetingId        | ObjectId | Yes      | Reference to meetings                        |
| userId           | ObjectId | No       | Reference to users (internal members)        |
| guestEmail       | String   | No       | Email for external guests                    |
| role             | String   | Yes      | `host`, `co-host`, `participant`, `guest`    |
| invitationStatus | String   | Yes      | `invited`, `accepted`, `declined`, `waiting` |

**Validation rules**:

- Either `userId` or `guestEmail` must be set (not both)
- Combination of `meetingId` + `userId` OR `meetingId` + `guestEmail` must be unique

### meetingSessions

**Purpose**: Participant connection sessions

| Field              | Type     | Required | Description                               |
| ------------------ | -------- | -------- | ----------------------------------------- |
| _id                | ObjectId | Yes      | Primary key                               |
| meetingId          | ObjectId | Yes      | Reference to meetings                     |
| participantId      | ObjectId | Yes      | Reference to meetingParticipants          |
| joinedAt           | Date     | Yes      | Join timestamp                            |
| leftAt             | Date     | No       | Leave timestamp (null if still connected) |
| connectionMetadata | Object   | No       | Device, network, client info              |

**Validation rules**:

- `leftAt` must be after `joinedAt` if set
- Reconnection updates existing session rather than creating duplicate

### meetingAgendaItems

**Purpose**: Ordered agenda items

| Field       | Type     | Required | Description                         |
| ----------- | -------- | -------- | ----------------------------------- |
| _id         | ObjectId | Yes      | Primary key                         |
| meetingId   | ObjectId | Yes      | Reference to meetings               |
| title       | String   | Yes      | Agenda item title                   |
| description | String   | No       | Agenda item description             |
| position    | Number   | Yes      | Order position                      |
| status      | String   | Yes      | `pending`, `discussed`, `completed` |

**Validation rules**:

- `position` must be unique within a meeting

### meetingNotes

**Purpose**: Notes and revisions

| Field        | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| _id          | ObjectId | Yes      | Primary key                     |
| meetingId    | ObjectId | Yes      | Reference to meetings           |
| authorId     | ObjectId | Yes      | Reference to users              |
| agendaItemId | ObjectId | No       | Reference to meetingAgendaItems |
| content      | String   | Yes      | Note content (rich text)        |
| version      | Number   | Yes      | Note version number             |

### meetingChatMessages

**Purpose**: Meeting chat

| Field     | Type     | Required | Description           |
| --------- | -------- | -------- | --------------------- |
| _id       | ObjectId | Yes      | Primary key           |
| meetingId | ObjectId | Yes      | Reference to meetings |
| senderId  | ObjectId | Yes      | Reference to users    |
| body      | String   | Yes      | Message body          |
| createdAt | Date     | Yes      | Message timestamp     |

### meetingFiles

**Purpose**: File metadata

| Field      | Type     | Required | Description           |
| ---------- | -------- | -------- | --------------------- |
| _id        | ObjectId | Yes      | Primary key           |
| meetingId  | ObjectId | Yes      | Reference to meetings |
| uploaderId | ObjectId | Yes      | Reference to users    |
| objectKey  | String   | Yes      | Object storage key    |
| mimeType   | String   | Yes      | File MIME type        |
| size       | Number   | Yes      | File size in bytes    |

### recordings

**Purpose**: Recording metadata

| Field          | Type     | Required | Description                                   |
| -------------- | -------- | -------- | --------------------------------------------- |
| _id            | ObjectId | Yes      | Primary key                                   |
| meetingId      | ObjectId | Yes      | Reference to meetings                         |
| provider       | String   | Yes      | Recording provider (e.g., "livekit-egress")   |
| objectKey      | String   | Yes      | Object storage key                            |
| status         | String   | Yes      | `pending`, `recording`, `completed`, `failed` |
| duration       | Number   | No       | Recording duration in seconds                 |
| retentionUntil | Date     | No       | Retention expiration date                     |

### transcripts

**Purpose**: Transcript metadata

| Field     | Type     | Required | Description                                    |
| --------- | -------- | -------- | ---------------------------------------------- |
| _id       | ObjectId | Yes      | Primary key                                    |
| meetingId | ObjectId | Yes      | Reference to meetings                          |
| language  | String   | Yes      | Transcript language code                       |
| provider  | String   | Yes      | Speech-to-text provider                        |
| status    | String   | Yes      | `pending`, `processing`, `completed`, `failed` |
| version   | Number   | Yes      | Transcript version                             |

### transcriptSegments

**Purpose**: Timestamped transcript chunks

| Field        | Type     | Required | Description                |
| ------------ | -------- | -------- | -------------------------- |
| _id          | ObjectId | Yes      | Primary key                |
| transcriptId | ObjectId | Yes      | Reference to transcripts   |
| startMs      | Number   | Yes      | Start time in milliseconds |
| endMs        | Number   | Yes      | End time in milliseconds   |
| speakerLabel | String   | No       | Estimated speaker label    |
| text         | String   | Yes      | Transcript text            |

**Validation rules**:

- `endMs` must be after `startMs`

### meetingSummaries

**Purpose**: AI output versions

| Field         | Type     | Required | Description                      |
| ------------- | -------- | -------- | -------------------------------- |
| _id           | ObjectId | Yes      | Primary key                      |
| meetingId     | ObjectId | Yes      | Reference to meetings            |
| provider      | String   | Yes      | AI provider name                 |
| model         | String   | Yes      | Model identifier                 |
| promptVersion | String   | Yes      | Prompt template version          |
| status        | String   | Yes      | `pending`, `completed`, `failed` |
| content       | Object   | Yes      | AI-generated summary content     |

### meetingDecisions

**Purpose**: Confirmed decisions

| Field     | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| _id       | ObjectId | Yes      | Primary key                         |
| meetingId | ObjectId | Yes      | Reference to meetings               |
| text      | String   | Yes      | Decision text                       |
| context   | String   | No       | Decision context                    |
| status    | String   | Yes      | `proposed`, `confirmed`, `rejected` |
| createdBy | ObjectId | Yes      | Reference to users                  |

### actionItems

**Purpose**: Follow-up tasks

| Field         | Type     | Required | Description                                                |
| ------------- | -------- | -------- | ---------------------------------------------------------- |
| _id           | ObjectId | Yes      | Primary key                                                |
| meetingId     | ObjectId | Yes      | Reference to meetings                                      |
| title         | String   | Yes      | Action item title                                          |
| ownerId       | ObjectId | Yes      | Reference to users                                         |
| dueAt         | Date     | Yes      | Due date (UTC)                                             |
| priority      | String   | Yes      | `low`, `medium`, `high`                                    |
| status        | String   | Yes      | `open`, `in_progress`, `blocked`, `completed`, `cancelled` |
| sourceSegment | ObjectId | No       | Reference to transcriptSegments                            |

### minutesDocuments

**Purpose**: Formal MoM records

| Field       | Type     | Required | Description                                |
| ----------- | -------- | -------- | ------------------------------------------ |
| _id         | ObjectId | Yes      | Primary key                                |
| meetingId   | ObjectId | Yes      | Reference to meetings                      |
| content     | String   | Yes      | Minutes content                            |
| status      | String   | Yes      | `draft`, `review`, `approved`, `published` |
| version     | Number   | Yes      | Document version                           |
| approvedBy  | ObjectId | No       | Reference to users                         |
| publishedAt | Date     | No       | Publication timestamp                      |

### notifications

**Purpose**: In-app notifications

| Field          | Type     | Required | Description                |
| -------------- | -------- | -------- | -------------------------- |
| _id            | ObjectId | Yes      | Primary key                |
| userId         | ObjectId | Yes      | Reference to users         |
| organizationId | ObjectId | Yes      | Reference to organizations |
| type           | String   | Yes      | Notification type          |
| payload        | Object   | Yes      | Notification data          |
| readAt         | Date     | No       | Read timestamp             |

### auditLogs

**Purpose**: Security and governance events

| Field          | Type     | Required | Description                  |
| -------------- | -------- | -------- | ---------------------------- |
| _id            | ObjectId | Yes      | Primary key                  |
| organizationId | ObjectId | Yes      | Reference to organizations   |
| actorId        | ObjectId | Yes      | Reference to users           |
| action         | String   | Yes      | Action performed             |
| targetType     | String   | Yes      | Type of target resource      |
| targetId       | ObjectId | Yes      | Reference to target resource |
| timestamp      | Date     | Yes      | Event timestamp              |
| metadata       | Object   | No       | Additional event details     |

### processingJobs

**Purpose**: Durable processing state

| Field     | Type     | Required | Description                                                 |
| --------- | -------- | -------- | ----------------------------------------------------------- |
| _id       | ObjectId | Yes      | Primary key                                                 |
| meetingId | ObjectId | Yes      | Reference to meetings                                       |
| jobType   | String   | Yes      | `recording`, `transcription`, `meeting-ai`, `notifications` |
| status    | String   | Yes      | `pending`, `processing`, `completed`, `failed`              |
| attempts  | Number   | Yes      | Retry attempt count                                         |
| errorCode | String   | No       | Error code if failed                                        |

## Data Modeling Rules

- Use explicit `organizationId` on every tenant-owned document
- Validate that referenced records belong to the same organization before reads or writes
- Add indexes for common filters, unique constraints, and lifecycle queries
- Use compound indexes such as `{ organizationId, startAt }`, `{ organizationId, status }`, and `{ meetingId, createdAt }`
- Avoid unbounded arrays for transcript segments, chat messages, or action items embedded in a meeting document
- Use MongoDB TTL indexes only for data whose deletion semantics are genuinely time-based and safe
- Store large media and files in object storage; keep metadata and access controls in MongoDB
- Use soft deletion only where there is a defined recovery and retention policy
- Store timestamps in UTC and retain the original IANA timezone for display and recurrence interpretation
- Never store raw meeting access tokens, refresh tokens, or provider secrets in plaintext

## Relationships (Logical)

```text
Organization
 ├── Memberships ── Users
 ├── Roles
 ├── Invitations
 └── Meetings
      ├── Meeting Participants
      │    └── Meeting Sessions
      ├── Agenda Items
      ├── Notes
      ├── Chat Messages
      ├── Files
      ├── Recording
      │    └── Transcript
      │         └── Transcript Segments
      ├── AI Summary Versions
      ├── Decisions
      ├── Action Items
      ├── Minutes Versions
      └── Audit Events
```
