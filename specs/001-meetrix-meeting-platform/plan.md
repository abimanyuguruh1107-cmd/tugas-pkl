# Implementation Plan: Meetrix Meeting Platform

**Branch**: `001-meetrix-meeting-platform` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-meetrix-meeting-platform/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The implementation preserves the starterpack's modular monolith and worker model, extending Express 5 (backend) and TanStack Start + React 19 (frontend) with meeting domain modules, LiveKit media infrastructure, and asynchronous processing pipelines.

## Technical Context

**Language/Version**: TypeScript 5.x, Bun 1.4.0 runtime

**Primary Dependencies**: Express 5, Mongoose 9.x, MongoDB, BullMQ, Redis, ioredis, jsonwebtoken, zod, TanStack Start + React 19, TanStack Router, LiveKit (WebRTC SFU), TURN server

**Storage**: MongoDB (application data), Redis (queue/coordination), Private S3-compatible object storage (recordings, attachments, exports)

**Testing**: Bun test (backend unit/integration), Vitest + Playwright (frontend)

**Target Platform**: Web application (responsive desktop and mobile web); native mobile out of scope

**Project Type**: Web service (monorepo: backend + frontend)

**Performance Goals**: 98% meeting join success, 99.5% monthly availability, p95 <2s search, <1% server-side error rate, AI summary within 5 minutes

**Constraints**: Tenant isolation on every organization-scoped request, RBAC with `resource:action` convention, human-controlled AI (draft-only until approved), privacy-by-design recording/transcription consent, incremental architecture (no premature service decomposition)

**Scale/Scope**: Multi-tenant enterprise MVP; organizations, members, meetings, recordings, transcripts, AI summaries, minutes, action items
Build the Meetrix Enterprise Meeting & Collaboration Platform as a multi-tenant web application on the existing `merb-starterpack` monorepo. The platform enables organizations to plan, conduct, document, and follow up on meetings with real-time WebRTC communication, recording, transcription, AI-generated outcomes, and human approval workflows.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle              | Assessment                                                                                                                                                                                                                            | Status |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Meeting-First Workflow           | Spec covers full meeting lifecycle: schedule → join → conduct → document → follow up. Every meeting produces organized record with agenda, participants, attendance, minutes, decisions, action items, files, transcript, AI summary. | PASS   |
| II. Human-Controlled AI             | All AI outputs (summary, decisions, action items, MoM draft) are drafts requiring authorized user approval. No automatic approval or execution. Voice cloning out of scope.                                                           | PASS   |
| III. Privacy by Design              | Recording/transcription consent explicitly recorded. Visual recording indicator required. Organization-level retention policies. Configurable AI enablement per org/meeting.                                                          | PASS   |
| IV. Enterprise Governance           | Tenant boundary = organization. RBAC with `resource:action`. Tenant context validated on every org-scoped request. Audit logs for sensitive actions. Zero cross-tenant access target.                                                 | PASS   |
| V. Reliable Real-Time Communication | LiveKit WebRTC SFU with TURN fallback. Reconnect without duplicate attendance. Usable under imperfect network. Connection quality indicators.                                                                                         | PASS   |
| VI. Incremental Architecture        | Preserves starterpack modular monolith + worker model. Extends existing auth/RBAC rather than rewriting. No premature service extraction.                                                                                             | PASS   |

**Gate Result**: All 6 constitution principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-meetrix-meeting-platform/
├── spec.md              # Feature specification (/speckit-specify output)
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/              # env.ts, mongo.ts
│   ├── controllers/         # auth, role, user, meeting, participant, recording, transcript, ai, minutes, action-item
│   ├── services/            # auth, role, user, meeting, attendance, rtc, recording, transcription, meeting-ai, minutes, action-items, organizations
│   ├── models/              # organization, membership, role, invitation, meeting, meeting-participant, meeting-session, meeting-agenda-item, meeting-note, recording, transcript, transcript-segment, meeting-summary, meeting-decision, action-item, minutes-document, audit-log, processing-job
│   ├── routes/              # organizations, members, meetings, meeting-room, participants, agenda, notes, recordings, transcripts, ai, minutes, decisions, action-items, search, notifications, policies, audit-logs, webhooks
│   ├── middleware/          # auth, tenant-context, rbac, error, rate-limit
│   ├── queue/               # connection.ts, email.queue.ts, recording.queue.ts, transcription.queue.ts, meeting-ai.queue.ts, notifications.queue.ts
│   ├── workers/             # email.worker.ts, recording.worker.ts, transcription.worker.ts, meeting-ai.worker.ts, notifications.worker.ts
│   ├── lib/                 # errors.ts, jwt.ts, logger.ts, permissions.ts, livekit.ts, storage.ts
│   ├── validators/          # zod schemas for all request bodies
│   ├── index.ts             # App entry point
│   ├── app.ts               # Express app setup
│   └── seed.ts              # Database seeding
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── Dockerfile
├── package.json
└── tsconfig.json

frontend/
├── src/
│   ├── components/          # Shared UI components
│   ├── integrations/        # API client, LiveKit client
│   ├── lib/                 # Utilities, auth helpers
│   ├── routes/              # TanStack Start routes (_auth, _app/dashboard, meetings, calendar, action-items, search, settings, meeting-join)
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   └── styles.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc

infra/
├── docker-compose.yml       # MongoDB, Redis, LiveKit, TURN, object storage (MinIO)
├── pulumi/                  # Infrastructure as code
└── ansible/                 # Provisioning playbooks
```

**Structure Decision**: Web application structure. Backend at `backend/src/`, frontend at `frontend/src/`, infrastructure at `infra/`. This matches the existing monorepo conventions and the PRD's specified stack (Express + TanStack Start + MongoDB + Redis + BullMQ + Docker Compose + Pulumi + Ansible).

## Complexity Tracking

No constitution violations requiring justification. All principles pass without complexity exceptions.

## Phase 0: Outline & Research

### Unknowns and Research Tasks

The following areas require research and decision documentation before Phase 1 design:

1. **LiveKit hosting model**: Self-hosted LiveKit vs managed LiveKit service
2. **Recording policy**: Host-controlled vs organization-enforced recording
3. **Consent model**: Explicit participant acknowledgement vs notice with acknowledgement vs jurisdiction-specific
4. **AI provider selection**: Speech-to-text and LLM providers meeting privacy, language, quality, cost requirements
5. **Languages at launch**: English-only vs English and Indonesian
6. **Guest access**: Account-less guest joining and restrictions
7. **Meeting capacity**: Participant limit for first deployment
8. **Object storage provider**: S3-compatible provider selection
9. **Default retention periods**: Recording, transcript, audit retention
10. **Calendar integration**: Google Calendar / Microsoft 365 in first release
11. **Minutes approval roles**: Which roles can approve/publish MoM
12. **Data residency**: Jurisdictional requirements for recording/transcript storage

### Research Output: research.md

See `research.md` for consolidated findings with Decision/Rationale/Alternatives for each unknown above.

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### 1. Data Model: `data-model.md`

See `data-model.md` for entity definitions, fields, relationships, validation rules, and state transitions.

### 2. Interface Contracts: `contracts/`

See `contracts/` directory for API contracts.

### 3. Quickstart Validation Guide: `quickstart.md`

See `quickstart.md` for runnable end-to-end validation scenarios.

---

**Re-evaluate Constitution Check post-design**: All 6 principles confirmed in design. No changes needed.
