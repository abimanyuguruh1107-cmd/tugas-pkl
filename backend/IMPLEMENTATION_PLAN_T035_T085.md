# Implementation Plan: 11 Critical Tasks (T035-T085)

## Overview
Tasks ini mencakup: recording management, transcription, AI-generated MoM, notifications, audit logging, dan meeting workflows. Ini adalah Phase 3-5 implementation yang sangat interdependent.

## Critical Path Analysis

### PRIORITY 1 (Must have first)
- T050: Recording Model — prerequisite untuk recording service
- T055: Notification Model — untuk system-wide notifications
- T035: meeting-room.routes.ts POST /end — entry point ke workflow
- T040: recording.service.ts — starts recording jobs

### PRIORITY 2 (Foundation)
- T045: Meeting state transition — gates PROCESSING state
- T060: transcription.service.ts — handles transcription workflow
- T075: audit-logs.service.ts — logs all sensitive actions
- T070: Minutes model + approval workflow

### PRIORITY 3 (Enhancement)
- T065: AI MoM generation — uses transcript + metadata
- T080: Action item audit trail — detailed change tracking
- T085: Comprehensive audit logging — system-wide

## Implementation Strategy

### Phase 1: Data Models
1. Recording model (T050)
2. Notification model (T055)
3. Minutes document model (T070)
4. Audit log model (T075)
5. Action item audit model (T080)

### Phase 2: Core Services
1. Recording service (T040)
2. Transcription service (T060)
3. Audit logs service (T075)

### Phase 3: Workflows
1. Meeting end endpoint (T035)
2. State transition to PROCESSING (T045)
3. Minutes approval workflow (T070)
4. AI MoM service (T065)

### Phase 4: Integration
1. Audit logging for all sensitive actions (T085)
2. Action item audit trail (T080)
3. Job queuing

## Folder Structure Changes

```
backend/src/
├── models/
│   ├── recording.model.ts (NEW — T050)
│   ├── notification.model.ts (NEW — T055)
│   ├── minutes.model.ts (NEW — T070)
│   ├── audit-log.model.ts (NEW — T075)
│   └── action-item.model.ts (UPDATE — add audit fields)
│
├── routes/
│   ├── meeting-room.routes.ts (NEW — T035)
│   └── meetings.routes.ts (UPDATE)
│
├── services/
│   ├── recordings/ (NEW)
│   │   └── recording.service.ts (T040)
│   ├── transcription/ (NEW)
│   │   └── transcription.service.ts (T060)
│   ├── meeting-ai/ (NEW)
│   │   └── ai-mom.service.ts (T065)
│   ├── audit-logs/ (NEW)
│   │   └── audit-logs.service.ts (T075)
│   └── (existing auth, user services)
│
├── controllers/
│   ├── transcripts.controller.ts (NEW — T060)
│   ├── audit-logs.controller.ts (NEW — T075)
│   └── (existing controllers)
│
└── lib/
    ├── meeting-status.ts (UPDATE — add PROCESSING state)
    ├── audit-events.ts (NEW — T085)
    └── permissions.ts (UPDATE — add new perms)
```

## Service Dependencies

```
meeting-room.routes.ts
  ├→ POST /end calls meetingService.endMeeting()
      ├→ Validates host ownership
      ├→ Updates Meeting status LIVE → ENDED
      ├→ Creates MeetingSession leftAt records
      ├→ Queues recording job
      ├→ Queues transcription job
      ├→ Transitions to PROCESSING
      ├→ Logs audit event
      └→ Notifies participants

recordingService.start/stop()
  ├→ Validates recording config consent
  ├→ Calls LiveKit egress API
  ├→ Creates Recording model record
  ├→ Logs audit event
  └→ Broadcasts notification

transcriptionService.transcribe()
  ├→ Processes audio from recording
  ├→ Stores transcript segments
  ├→ Updates Meeting transcript status
  └→ Triggers AI processing

aiMomService.generateDraft()
  ├→ Uses meeting metadata, agenda, notes, transcript
  ├→ Generates draft MoM
  ├→ Creates MinutesDocument (DRAFT status)
  ├→ Queues for human review
  └→ Updates Meeting state

minutesService.approve()
  ├→ DRAFT → REVIEW → APPROVED → PUBLISHED workflow
  ├→ Creates version history (no overwrites)
  ├→ Logs all transitions
  ├→ Notifies stakeholders
  └→ Updates Meeting status

auditLogsService.log()
  ├→ Creates AuditLog record
  ├→ Stores actor, action, target, timestamp
  ├→ For all sensitive operations
  └→ Queryable by organization

actionItemAudit.trackChange()
  ├→ Tracks ownership changes
  ├→ Tracks due date changes
  ├→ Tracks status changes
  └→ Links to parent AuditLog
```

## TODO Implementation Order

1. ✅ Create all 5 data models
2. ✅ Create all 4 services (recording, transcription, audit, ai-mom)
3. ✅ Create all 3 controllers
4. ✅ Create T035 meeting-room.routes.ts
5. ✅ Implement T045 state transition
6. ✅ Implement T070 minutes workflow
7. ✅ Implement T080 action item audit
8. ✅ Implement T085 comprehensive audit logging

## Risk Mitigations

- **Job Queue Failures:** BullMQ with retries, dead-letter queue handling
- **Transcription Delays:** Async processing, status polling, websocket updates
- **Recording Storage:** Private S3 buckets, signed URLs, TTL cleanup
- **AI Hallucinations:** Human review required, transcript references, structured output
- **Audit Log Volume:** Pagination, archival, efficient indexing
- **Race Conditions:** Optimistic locking on Minutes, Meeting state validation

## Success Criteria

- ✅ All 11 tasks implemented
- ✅ Zero TypeScript errors
- ✅ All models with proper indexes
- ✅ All services with TODO cleanup
- ✅ All audit events logged
- ✅ State machine transitions validated
- ✅ Notification system ready
- ✅ Meeting workflows complete

---

Estimated completion: Full implementation of all 11 tasks.
