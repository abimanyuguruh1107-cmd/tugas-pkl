# Tasks: Meetrix Meeting Platform

**Input**: Design documents from `/specs/001-meetrix-meeting-platform/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in feature specification - test tasks omitted per template rule.

**Organization**: Tasks are grouped **per team member** (C, B, W, S, J) so each person can create their own feature branch and work independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`

---

## 👤 C — Branch: `feat/backend-platform`

**Total task**: 18  
**Focus**: Project setup, auth/RBAC foundation, invitations, LiveKit, AI provider interface, draft-only AI enforcement, minutes metadata, processing jobs, action item linkage, retention workflows

- [ ] T001 Create project structure per implementation plan (backend/src/, frontend/src/, infra/)
- [ ] T006 [P] Implement RBAC authorization with `resource:action` convention in backend/src/lib/permissions.ts
- [ ] T011 [P] Implement invitation system with tokenHash, expiresAt, status fields in backend/src/services/organizations/
- [ ] T016 [P] [US1] Create MeetingAgendaItem model in `backend/src/models/meeting-agenda-item.model.ts` with fields: meetingId (required), title (required), description (optional), position (required, unique within meeting), status (required, enum: pending/discussed/completed)
- [ ] T021 [P] [US1] Create MeetingParticipant service in `backend/src/services/participants/participant.service.ts` managing invitee list, invitation status, and guest access
- [ ] T026 [P] [US1] Create MeetingAgendaItem routes in `backend/src/routes/agenda.routes.ts`
- [ ] T031 [US1] Implement meeting invitation email notifications via BullMQ email queue
- [ ] T036 [P] [US2] Implement attendance tracking service in `backend/src/services/attendance/attendance.service.ts` recording join/leave timestamps and calculating duration
- [ ] T041 [P] [US2] Implement recording consent/acknowledgement recording per organization policy in `backend/src/services/recordings/consent.service.ts`
- [ ] T046 [P] [US2] Implement connection quality monitoring and device/network error display in frontend meeting room
- [ ] T051 [P] [US3] Create MeetingSummary model in `backend/src/models/meeting-summary.model.ts` with fields: meetingId, provider, model, promptVersion, status, content
- [ ] T056 [P] [US3] Create AuditLog model in `backend/src/models/audit-log.model.ts` with fields: organizationId, actorId, action, targetType, targetId, timestamp, metadata
- [ ] T061 [P] [US3] Create AI provider abstraction interface in `backend/src/services/meeting-ai/ai-provider.interface.ts` with methods: generateSummary, extractDecisions, extractActionItems, generateMinutes
- [ ] T066 [US3] Enforce AI output as draft-only: no automatic publication or task execution; users can mark AI results as incorrect and edit them
- [ ] T071 [US3] Implement minutes publication metadata: approvedBy, publishedAt, revision history
- [ ] T076 [US3] Implement ProcessingJob service in `backend/src/services/processing/processing-jobs.service.ts` tracking status, attempts, timestamps, error metadata for recording/transcription/AI jobs
- [ ] T081 [US4] Link action items to source meeting and decision context in `backend/src/services/action-items/action-items.service.ts`
- [ ] T086 Implement retention and deletion workflows: recording/transcript retention periods, deletion requests recorded in audit log, object storage cleanup

---

## 👤 B — Branch: `feat/backend-models`

**Total task**: 18  
**Focus**: Project initialization, base models, LiveKit server/TURN, MeetingFile, MeetingParticipant controller/routes, meeting settings validation, recording/transcript models, MeetingDecision controller, action item listing, quickstart validation

- [x] T002 Initialize Bun/TypeScript project with Express 5, Mongoose, BullMQ, zod dependencies in backend/package.json
- [X] T007 Create base models: Organization (slug unique, timezone IANA), User (email unique), Role (permissions array), Membership (orgId+userId unique) in backend/src/models/
- [X] T012 [P] Setup LiveKit server, TURN configuration, and media token issuance in backend/src/lib/livekit.ts
- [ ] T007 Create base models: Organization (slug unique, timezone IANA), User (email unique), Role (permissions array), Membership (orgId+userId unique) in backend/src/models/
- [ ] T012 [P] Setup LiveKit server, TURN configuration, and media token issuance in backend/src/lib/livekit.ts
- [ ] T017 [P] [US1] Create MeetingFile model in `backend/src/models/meeting-file.model.ts` with fields: meetingId, uploaderId, objectKey, mimeType, size
- [ ] T022 [P] [US1] Create MeetingParticipant controller in `backend/src/controllers/participant.controller.ts` with endpoints: GET /meetings/:meetingId/participants, POST /meetings/:meetingId/participants, PATCH /meetings/:meetingId/participants/:participantId
- [ ] T027 [P] [US1] Create MeetingFile service in `backend/src/services/files/file.service.ts` handling file metadata and signed URLs
- [ ] T032 [US1] Implement meeting settings validation: waiting room, guest access, passcode, recording policy, AI enablement per organization policy
- [ ] T037 [P] [US2] Implement waiting room logic: host admits participants, guest access control, passcode validation
- [ ] T042 [P] [US2] Implement recording metadata storage with provider, objectKey, status, duration, retentionUntil fields
- [ ] T047 [P] [US2] Create MeetingFile controller in `backend/src/controllers/file.controller.ts` with endpoints: POST /meetings/:meetingId/files, GET /meetings/:meetingId/files/:fileId, DELETE /meetings/:meetingId/files/:fileId

- [ ] T052 [P] [US3] Create MeetingDecision model in `backend/src/models/meeting-decision.model.ts` with fields: meetingId, text, context, status (proposed/confirmed/rejected), createdBy
- [ ] T057 [P] [US3] Create ProcessingJob model in `backend/src/models/processing-job.model.ts` with fields: meetingId, jobType, status, attempts, errorCode
- [ ] T062 [P] [US3] Implement AI summary generation in `backend/src/services/meeting-ai/ai-summary.service.ts` producing executive summary and detailed summary organized by agenda item
- [ ] T067 [US3] Implement AI training opt-out: meeting content not used for provider model training unless organization explicitly enables and approves
- [ ] T072 [US3] Implement MeetingDecision service in `backend/src/services/decisions/decisions.service.ts` and controller in `backend/src/controllers/decisions.controller.ts`
- [ ] T077 [P] [US4] Create ActionItem listing endpoint in `backend/src/controllers/action-items.controller.ts` GET /action-items with filters: owner, due date, status, project/tag
- [ ] T082 [US4] Implement action item progress notes and status change notifications
- [ ] T087 Run quickstart.md validation scenarios (all 7 scenarios) and document results

## 👤 W — Branch: `feat/backend-meetings`

**Total task**: 18  
**Focus**: Linting/format, tenant context middleware, Meeting model, MeetingService, MeetingParticipant routes, MeetingFile controller, join-token endpoint, host controls, recording access control, Transcript model, MinutesDocument model, MeetingNote service/controller, AI decision extraction, AI enablement config, ActionItem service/controller, action item status transitions, search, security hardening

- [ ] T003 [P] Configure ESLint, Prettier, and TypeScript strict mode in backend/ and frontend/
- [ ] T008 Implement tenant context middleware resolving organizationId for every org-scoped request in backend/src/middleware/tenant.middleware.ts
- [ ] T013 [P] [US1] Create Meeting model in `backend/src/models/meeting.model.ts` with fields: organizationId (required), title (required), description (optional), startAt (required, UTC), endAt (required, must be after startAt), timezone (required, IANA), status (required, enum: draft/scheduled/live/ended/processing/completed/cancelled), hostId (required), settings (required object)
- [ ] T018 [P] [US1] Create MeetingService in `backend/src/services/meetings/meeting.service.ts` implementing meeting CRUD, lifecycle state transitions, and validation (endAt after startAt)
- [ ] T023 [P] [US1] Create MeetingParticipant routes in `backend/src/routes/participants.routes.ts`
- [ ] T028 [P] [US1] Create MeetingFile controller in `backend/src/controllers/file.controller.ts` with endpoints for file upload metadata
- [ ] T033 [P] [US2] Create join-token endpoint in `backend/src/routes/meeting-room.routes.ts` with POST /meetings/:meetingId/join-token generating short-lived LiveKit room tokens
- [ ] T038 [P] [US2] Implement host controls: mute participants, remove participants, lock room in `backend/src/services/rtc/host-controls.service.ts`
- [ ] T043 [P] [US2] Implement recording access control checked on every playback request in `backend/src/middleware/recording-access.middleware.ts`
- [ ] T048 [P] [US3] Create Transcript model in `backend/src/models/transcript.model.ts` with fields: meetingId, language, provider, status, version
- [ ] T053 [P] [US3] Create MinutesDocument model in `backend/src/models/minutes-document.model.ts` with fields: meetingId, content, status (draft/review/approved/published), version, approvedBy, publishedAt
- [ ] T058 [P] [US3] Create MeetingNote service in `backend/src/services/notes/note.service.ts` and controller in `backend/src/controllers/notes.controller.ts` with endpoints: GET /meetings/:meetingId/notes, POST /meetings/:meetingId/notes
- [ ] T063 [P] [US3] Implement AI decision extraction in `backend/src/services/meeting-ai/ai-decisions.service.ts` proposing decisions made during meeting
- [ ] T068 [US3] Implement AI enablement configurable by organization and meeting in meeting settings
- [ ] T073 [US3] Implement ActionItem service in `backend/src/services/action-items/action-items.service.ts` and controller in `backend/src/controllers/action-items.controller.ts` with endpoints: GET /action-items, POST /meetings/:meetingId/action-items, PATCH /action-items/:actionItemId
- [ ] T078 [P] [US4] Implement action item status transitions: open → in_progress → blocked → completed → cancelled
- [ ] T083 Implement search with tenant and meeting-level authorization in `backend/src/services/search/search.service.ts` and `backend/src/controllers/search.controller.ts` endpoint: GET /search
- [ ] T088 Security hardening: rate limits on auth endpoints, CSRF/XSS protection, secret management (no plaintext tokens), input validation with Zod schemas

---

## 👤 S — Branch: `feat/backend-realtime`

**Total task**: 17  
**Focus**: MongoDB/Mongoose setup, error handling/logging, MeetingParticipant model, MeetingController, MeetingAgendaItem service, MeetingFile routes, LiveKit token generation, reconnection handling, LiveKit webhook handler, TranscriptSegment model, ActionItem model, Recording service/controller, AI action item extraction, Minutes service/controller, Notification service/controller, action item reminders, organization policies config

## 👤 J — Branch: `feat/backend-auth`

**Total task**: 17  
**Focus**: JWT auth, environment config, MeetingSession model, Meeting routes, MeetingAgendaItem controller, meeting lifecycle state machine, meeting end endpoint, recording start/stop, meeting state transition to processing, Recording model, Notification model, Transcript service/controller, AI draft MoM generation, minutes approval workflow, AuditLog service/controller, action item audit trail, audit logging for sensitive actions

- [ ] T005 [P] Implement JWT access/refresh token authentication in backend/src/lib/jwt.ts and backend/src/middleware/auth.mid dleware.ts
- [ ] T010 [P] Setup environment configuration management in backend/src/config/env.ts
- [ ] T015 [P] [US1] Create MeetingSession model in `backend/src/models/meeting-session.model.ts` with fields: meetingId, participantId, joinedAt, leftAt (optional), connectionMetadata (optional object)
- [ ] T020 [P] [US1] Create Meeting routes in `backend/src/routes/meetings.routes.ts` mounting all meeting endpoints with tenant context and RBAC middleware
- [ ] T025 [P] [US1] Create MeetingAgendaItem controller in `backend/src/controllers/agenda.controller.ts` with endpoints: GET /meetings/:meetingId/agenda, PUT /meetings/:meetingId/agenda
- [ ] T030 [US1] Implement meeting lifecycle state machine: draft → scheduled → live → ended → processing → completed, with cancelled as terminal state from any pre-completed status
- [ ] T035 [P] [US2] Create meeting end endpoint in `backend/src/routes/meeting-room.routes.ts` with POST /meetings/:meetingId/end restricted to authorized hosts
- [ ] T040 [P] [US2] Implement recording start/stop with visual consent indicator in `backend/src/services/recordings/recording.service.ts`
- [ ] T045 [US2] Implement meeting state transition to `processing` when meeting ends and recording/transcription jobs are queued
- [ ] T050 [P] [US3] Create Recording model in `backend/src/models/recording.model.ts` with fields: meetingId, provider, objectKey, status, duration, retentionUntil
- [ ] T055 [P] [US3] Create Notification model in `backend/src/models/notification.model.ts` with fields: userId, organizationId, type, payload, readAt
- [ ] T060 [P] [US3] Create Transcript service in `backend/src/services/transcription/transcription.service.ts` and controller in `backend/src/controllers/transcripts.controller.ts` with endpoints: GET /meetings/:meetingId/transcript, PATCH /meetings/:meetingId/transcript/correct
- [ ] T065 [P] [US3] Implement AI draft MoM generation in `backend/src/services/meeting-ai/ai-mom.service.ts` using meeting metadata, agenda, notes, and transcript
- [ ] T070 [US3] Implement minutes approval workflow: draft → review → approved → published; revisions create new version without overwriting historical record
- [ ] T075 [US3] Implement AuditLog service in `backend/src/services/audit-logs/audit-logs.service.ts` and controller in `backend/src/controllers/audit-logs.controller.ts` with endpoint: GET /organizations/:organizationId/audit-logs
- [ ] T080 [US4] Implement action item audit trail: changes to ownership, due date, and status are auditable
- [ ] T085 Implement audit logging for all sensitive actions: auth events, member changes, meeting changes, recording actions, minutes approval, action item changes, policy changes, administrative support access

## 📊 Ringkasan Distribusi Task

| Orang     | Branch                  | Jumlah Task | Rentang ID                                                                                                 |
| --------- | ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| **C**     | `feat/backend-platform` | 18          | T001, T006, T011, T016, T021, T026, T031, T036, T041, T046, T051, T056, T061, T066, T071, T076, T081, T086 |
| **B**     | `feat/backend-models`   | 18          | T002, T007, T012, T017, T022, T027, T032, T037, T042, T047, T052, T057, T062, T067, T072, T077, T082, T087 |
| **W**     | `feat/backend-meetings` | 18          | T003, T008, T013, T018, T023, T028, T033, T038, T043, T048, T053, T058, T063, T068, T073, T078, T083, T088 |
| **S**     | `feat/backend-realtime` | 17          | T004, T009, T014, T019, T024, T029, T034, T039, T044, T049, T054, T059, T064, T069, T074, T079, T084       |
| **J**     | `feat/backend-auth`     | 17          | T005, T010, T015, T020, T025, T030, T035, T040, T045, T050, T055, T060, T065, T070, T075, T080, T085       |
| **Total** |                         | **88**      | T001 – T088                                                                                                |

---

## Dependencies & Execution Order

### Fase Harus Diselesaikan Secara Bersama (Sebelum Branch Pribadi)

Semua anggota **harus menyelesaikan Fase 1 dan Fase 2 bersama-sama** sebelum mulai branch pribadi, karena Fase 2 adalah blocking prerequisite:

- **Phase 1: Setup** — T001 (C), T002 (B), T003 (W) — tidak ada dependensi
- **Phase 2: Foundational** — T004–T012 (gabungan semua orang) — **BLOKIR semua user story**

### Setelah Foundational Selesai — Setiap Orang Kerja di Branch Sendiri

Setelah Phase 2 selesai, masing-masing orang bisa mulai di branch mereka masing-masing secara paralel:

- **C** (`feat/backend-platform`): T011, T016, T021, T026, T031, T036, T041, T046, T051, T056, T061, T066, T071, T076, T081, T086
- **B** (`feat/backend-models`): T012, T017, T022, T027, T032, T037, T042, T047, T052, T057, T062, T067, T072, T077, T082, T087
- **W** (`feat/backend-meetings`): T008, T013, T018, T023, T028, T033, T038, T043, T048, T053, T058, T063, T068, T073, T078, T083, T088
- **S** (`feat/backend-realtime`): T009, T014, T019, T024, T029, T034, T039, T044, T049, T054, T059, T064, T069, T074, T079, T084
- **J** (`feat/backend-auth`): T005, T010, T015, T020, T025, T030, T035, T040, T045, T050, T055, T060, T065, T070, T075, T080, T085

### Final Phase: Polish & Cross-Cutting Concerns

- T083 (W), T084 (S), T085 (J), T086 (C), T087 (B), T088 (W) — dilakukan setelah semua user story selesai

### Contoh Pembuatan Branch

Setiap anggota membuat branch dari `main`:

```bash
# Contoh untuk C
git checkout -b feat/backend-platform

# Contoh untuk B
git checkout -b feat/backend-models

# Contoh untuk W
git checkout -b feat/backend-meetings

# Contoh untuk S
git checkout -b feat/backend-realtime

# Contoh untuk J
git checkout -b feat/backend-auth
```

### Catatan

- Setiap task memiliki ID unik (T001–T088), tidak ada duplikasi
- Tandai `[P]` berarti task dapat dijalankan parallel (berkas berbeda, tidak bergantung pada task yang belum selesai)
- Tandai `[US1]`–`[US4]` mengarah ke user story dari `spec.md`
- Setiap anggota bertanggung jawab atas commit dan PR dari branch mereka sendiri
- Setelah semua branch selesai, dilakukan merge ke `main` dan lanjut ke Final Phase (Polish)
