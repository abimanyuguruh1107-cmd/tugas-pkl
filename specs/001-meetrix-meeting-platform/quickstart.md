# Quickstart Validation Guide: Meetrix Meeting Platform

**Created**: 2026-11-12
**Feature**: 001-meetrix-meeting-platform

This document provides runnable validation scenarios that prove the Meetrix feature works end-to-end. It references contracts and data model details rather than duplicating them.

## Prerequisites

- Docker Compose stack running (MongoDB, Redis, LiveKit, TURN, MinIO)
- Backend dependencies installed (`bun install` in `backend/`)
- Frontend dependencies installed (`bun install` in `frontend/`)
- Environment variables configured (see `.env.example`)

## Stack Setup

```bash
# From repository root
bun run stack:up        # Start MongoDB, Redis, LiveKit, TURN, MinIO
bun run dev:backend     # Start Express API
bun run dev:frontend    # Start TanStack Start frontend
```

## Validation Scenarios

### Scenario 1: Organization and Member Management

**Goal**: Verify tenant isolation and RBAC work correctly.

**Steps**:

1. Register a user via `POST /api/v1/auth/register` (or accept invitation)
2. Create an organization via `POST /api/v1/organizations`
3. Invite a member via `POST /api/v1/organizations/:orgId/invitations`
4. Verify the invited user can accept and join the organization
5. Verify a user from Organization A cannot access Organization B's meetings (cross-tenant isolation test)

**Expected outcomes**:

- User can create and manage their organization
- Members can be invited and accept invitations
- Cross-tenant access attempts return 403 Forbidden
- Audit log entries are created for membership changes

**References**:

- Contract: `contracts/api.md` — Members & Invitations, Organizations
- Data model: `data-model.md` — organizations, memberships, roles, users

### Scenario 2: Meeting Scheduling and Invitations

**Goal**: Verify meeting creation with participants and guest access.

**Steps**:

1. Authenticate as a meeting host
2. Create a meeting via `POST /api/v1/meetings` with title, start/end time, participants
3. Add internal members and external guest email addresses
4. Configure waiting room, recording, and AI settings
5. Verify meeting record is created with status `scheduled`
6. Verify invitations are generated with revocable tokens

**Expected outcomes**:

- Meeting cannot be created with invalid time range (end before start)
- Meeting join URL and access credentials are generated
- Guest invitations have expiring tokens
- Unauthorized users cannot create meetings

**References**:

- Contract: `contracts/api.md` — Meetings, Meeting Participants
- Data model: `data-model.md` — meetings, meetingParticipants, invitations

### Scenario 3: Join and Conduct a Meeting (WebRTC)

**Goal**: Verify real-time meeting room access and controls.

**Steps**:

1. Obtain a short-lived LiveKit token via `POST /api/v1/meetings/:meetingId/join-token`
2. Join the meeting room using the token
3. Verify microphone, camera, and screen share controls work
4. Host admits waiting room participants
5. Host ends the meeting for all participants
6. Verify meeting status changes to `ended`

**Expected outcomes**:

- Unauthorized users cannot obtain a room token
- Expired invitations cannot be used to join
- Network reconnect does not create duplicate attendance records
- Only authorized hosts can end the meeting
- Attendance sessions are recorded with join/leave timestamps

**References**:

- Contract: `contracts/api.md` — Meeting Room
- Data model: `data-model.md` — meetingSessions, meetingParticipants

### Scenario 4: Recording and Transcription

**Goal**: Verify recording, consent, and transcription pipeline.

**Steps**:

1. Host starts recording via `POST /api/v1/meetings/:meetingId/recordings/start`
2. Verify visual recording indicator is shown to all participants
3. Host stops recording via `POST /api/v1/meetings/:meetingId/recordings/stop`
4. Verify recording metadata is stored with object key
5. Verify transcription job is queued and processed
6. Verify transcript is viewable alongside recording

**Expected outcomes**:

- Recording access is checked on every playback request
- Consent/acknowledgement is recorded per organization policy
- Failed recording jobs can be retried safely
- Recording artifacts stored in private object storage

**References**:

- Contract: `contracts/api.md` — Recordings, Transcripts
- Data model: `data-model.md` — recordings, transcripts, transcriptSegments

### Scenario 5: AI Summary and Minutes Approval

**Goal**: Verify AI generates draft outputs requiring human approval.

**Steps**:

1. After meeting ends and transcription completes, trigger AI generation via `POST /api/v1/meetings/:meetingId/ai/generate`
2. Verify AI output is a draft (not automatically published)
3. Host reviews and edits the draft MoM
4. Host assigns/corrects action item owners and due dates
5. Authorized user approves and publishes minutes via `POST /api/v1/minutes/:minutesId/publish`
6. Verify published minutes have revision history

**Expected outcomes**:

- AI output is always a draft until authorized approval
- AI cannot automatically publish minutes or execute tasks
- Users can mark AI results as incorrect and edit them
- Published minutes preserve version history

**References**:

- Contract: `contracts/api.md` — AI, Minutes, Decisions, Action Items
- Data model: `data-model.md` — meetingSummaries, minutesDocuments, meetingDecisions, actionItems

### Scenario 6: Action Item Follow-up

**Goal**: Verify action item tracking and notifications.

**Steps**:

1. User opens My Action Items
2. Filter by owner, due date, status
3. Update action item status to `completed`
4. Verify system records the change and sends notification
5. Verify meeting record reflects latest action item status

**Expected outcomes**:

- Action items can be assigned, tracked, and updated
- Reminders are sent for approaching/overdue deadlines
- Changes to ownership, due date, and status are auditable

**References**:

- Contract: `contracts/api.md` — Action Items, Notifications
- Data model: `data-model.md` — actionItems, notifications

### Scenario 7: Search and Authorization

**Goal**: Verify search enforces tenant and meeting-level authorization.

**Steps**:

1. Search meetings via `GET /api/v1/search` with various filters
2. Verify results only include meetings the user is authorized to access
3. Verify cross-tenant meetings are not returned
4. Verify search returns results in under 2 seconds (p95)

**Expected outcomes**:

- Search results enforce tenant isolation
- Meeting-level access controls are applied
- Search performance meets SLO (p95 <2s)

**References**:

- Contract: `contracts/api.md` — Search
- Data model: `data-model.md` — all tenant-owned collections

## Success Criteria Validation

| Metric                    | Target        | Validation Method                                |
| ------------------------- | ------------- | ------------------------------------------------ |
| Meeting join success      | ≥98%          | Scenario 3 - successful joins / total attempts   |
| Service availability      | 99.5% monthly | Backend health checks over test period           |
| Meeting record completion | ≥85%          | Scenario 4 - meetings with minutes/summary       |
| AI summary generation     | 95% success   | Scenario 5 - successful AI processing            |
| AI summary turnaround     | <5 min        | Scenario 5 - time from queue to completion       |
| Action item review        | ≥70%          | Scenario 6 - reviewed/resolved / total proposed  |
| API error rate            | <1%           | All scenarios - error responses / total requests |
| Search response           | p95 <2s       | Scenario 7 - search query latency                |
| Cross-tenant incidents    | 0             | Scenario 1 and 7 - unauthorized access attempts  |

## References

- **Spec**: `spec.md` — Feature specification with user stories and requirements
- **Plan**: `plan.md` — Implementation plan with technical context and project structure
- **Research**: `research.md` — Phase 0 research decisions
- **Data Model**: `data-model.md` — Entity definitions and validation rules
- **Contracts**: `contracts/api.md` — API endpoint contracts
