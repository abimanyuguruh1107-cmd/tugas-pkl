
# Tasks: Meetrix Frontend Application

**Input**: Design documents from `/specs/001-meetrix-meeting-platform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

> ## ⚠️ CURRENT SCOPE: PHASE 1 (SETUP) ONLY
>
> UI/UX design has **not** been approved yet. Only **Phase 1: Setup** is active.
> Phases 2–8 (UI components, screens, meeting room, minutes, action items, admin, QA)
> are **BLOCKED** until the design system and screen designs are signed off.
>
> When design is approved, re-enable the remaining phases in this file and add a
> design-reference note to each task so implementation follows the approved mockups.

**Organization**: Tasks grouped per user story (US1-US4) for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependencies)
- **[Story]**: User story (US1-US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup ✅ ACTIVE

**Status legend**: `[x]` done by starterpack · `[ ]` todo for Meetrix

- [x] T001 Frontend project structure exists (`frontend/src/`, `package.json`, `vite.config.ts`, `wrangler.jsonc`)
- [x] T002 TypeScript strict mode + path aliases (`#/*`, `@/*`) in `frontend/tsconfig.json`
- [x] T003 Tailwind CSS v4 theme + design tokens in `frontend/src/styles.css`
- [x] T004 ESLint + Prettier config in `frontend/eslint.config.js`, `frontend/prettier.config.js`
- [x] T006 TanStack Start 1.169 + React 19 + TanStack Router in `frontend/src/router.tsx`
- [x] T007 TanStack Query provider in `frontend/src/integrations/tanstack-query/root-provider.tsx`
- [x] T008 API client with JWT attach + auto-refresh in `frontend/src/lib/auth.ts`
- [x] T005 [P] Create `frontend/.env.example` with `VITE_API_URL`, `VITE_LIVEKIT_URL`, `VITE_LIVEKIT_PUBLIC_KEY`
- [x] T009 [P] Add `livekit-client` dependency to `frontend/package.json` and install
- [x] T010 [P] Create LiveKit client wrapper in `frontend/src/integrations/livekit/` (`client.ts`, `types.ts`, `index.ts`)
- [x] T011 Restructure routes to `frontend/src/routes/_auth/`, `frontend/src/routes/_app/`, `frontend/src/routes/meeting-join/` and regenerate `routeTree.gen.ts`
- [x] T012 Set app title/meta to Meetrix in `frontend/src/routes/__root.tsx`
- [x] T013 [P] Verify `bun run typecheck`, `bun run lint`, `bun run build` pass in `frontend/`
- [x] T014 [P] Split API layer in `frontend/src/integrations/api/` (`client.ts` transport, `session.ts` store, `auth.ts`, `meetings.ts`, `action-items.ts`, `organizations.ts`) — no circular imports
- [x] T015 [P] Add typed runtime config in `frontend/src/lib/env.ts` + `frontend/src/env.d.ts`
- [x] T016 [P] Add RBAC helpers in `frontend/src/lib/permissions.ts` (`resource:action` convention)
- [x] T017 [P] Add formatting helpers in `frontend/src/lib/format.ts` (date, duration, file size, timestamp)
- [x] T018 [P] Add route group layouts `frontend/src/routes/_auth/route.tsx` and `frontend/src/routes/_app/route.tsx`
- [x] T019 [P] Create design-ready feature folders in `frontend/src/components/` (`layout`, `meetings`, `meeting-room`, `meeting-records`, `action-items`, `notifications`, `organization`)
- [x] T020 Document source structure and conventions in `frontend/src/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create shared UI component library (`Button`, `Input`, `Select`, `Modal`, `Toast`, `Badge`, `Avatar`, `Card`, `Spinner`) in `frontend/src/components/ui/`
- [ ] T010 [P] Create auth state management in `frontend/src/lib/auth.ts`
- [ ] T011 [P] Create API integration layer in `frontend/src/integrations/api.ts`
- [ ] T012 [P] Create LiveKit client wrapper in `frontend/src/integrations/livekit.ts`
- [ ] T013 [P] Create shared layout components (sidebar, header, breadcrumb) in `frontend/src/components/layout/`
- [ ] T014 [P] Configure TanStack Router routes
**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: US1 - Schedule and Prepare a Meeting (P1 MVP)

**Goal**: A member can create a meeting with title, description, date, time, timezone, visibility, agenda, participants, and configuration settings; send invitations.

**Independent Test**: Create a meeting through the UI and verify meeting record, invitations, agenda, and settings are persisted correctly.

- [ ] T015 [P] [US1] Create Login page in `frontend/src/routes/_auth/login.tsx`
- [ ] T016 [P] [US1] Create Register page in `frontend/src/routes/_auth/register.tsx`
- [ ] T017 [P] [US1] Create Forgot Password page in `frontend/src/routes/_auth/forgot-password.tsx`
- [ ] T018 [P] [US1] Create Reset Password page in `frontend/src/routes/_auth/reset-password.tsx`
- [ ] T019 [P] [US1] Implement login API call with JWT storage in `frontend/src/lib/auth.ts`
- [ ] T020 [P] [US1] Implement register API call in `frontend/src/lib/auth.ts`
- [ ] T021 [P] [US1] Implement auth state management in `frontend/src/lib/auth.ts`
- [ ] T022 [P] [US1] Create Dashboard overview page in `frontend/src/routes/_app/dashboard/index.tsx`
- [ ] T023 [P] [US1] Create sidebar navigation in `frontend/src/components/layout/sidebar.tsx`
- [ ] T024 [P] [US1] Create top bar in `frontend/src/components/layout/header.tsx`
- [ ] T025 [P] [US1] Create Meetings list page in `frontend/src/routes/_app/meetings/index.tsx`
- [ ] T026 [P] [US1] Create Meeting status badges in `frontend/src/components/ui/meeting-badge.tsx`
- [ ] T027 [P] [US1] Create meeting search in `frontend/src/components/meetings/meeting-search.tsx`
- [ ] T028 [P] [US1] Create Create Meeting form in `frontend/src/routes/_app/meetings/new.tsx`
- [ ] T029 [P] [US1] Create participant invite form in `frontend/src/components/meetings/participant-invite.tsx`
- [ ] T030 [P] [US1] Create Agenda builder in `frontend/src/components/meetings/agenda-builder.tsx`
- [ ] T031 [P] [US1] Create Meeting settings form in `frontend/src/components/meetings/meeting-settings.tsx`
- [ ] T032 [P] [US1] Create Meeting detail page in `frontend/src/routes/_app/meetings/$meetingId/index.tsx`
- [ ] T033 [US1] Implement meeting create API in `frontend/src/integrations/meetings.ts`
- [ ] T034 [US1] Implement meeting edit API in `frontend/src/integrations/meetings.ts`
- [ ] T035 [US1] Implement meeting cancel/delete API in `frontend/src/integrations/meetings.ts`
- [ ] T036 [US1] Implement meeting list loading with filters in `frontend/src/integrations/meetings.ts`
- [ ] T037 [US1] Implement meeting detail view with tabs in `frontend/src/integrations/meetings.ts`
**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create shared UI component library (`Button`, `Input`, `Select`, `Modal`, `Toast`, `Badge`, `Avatar`, `Card`, `Spinner`) in `frontend/src/components/ui/`
- [ ] T010 [P] Create auth state management in `frontend/src/lib/auth.ts`
- [ ] T011 [P] Create API integration layer in `frontend/src/integrations/api.ts`
- [ ] T012 [P] Create LiveKit client wrapper in `frontend/src/integrations/livekit.ts`
- [ ] T013 [P] Create shared layout components (sidebar, header, breadcrumb) in `frontend/src/components/layout/`
- [ ] T014 [P] Configure TanStack Router routes

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 4: US2 - Join and Conduct a Meeting (P1 MVP)

**Goal**: A participant can join a meeting link, validate invitation/membership, test devices, join waiting room/meeting, use media controls, chat, reactions, host controls.

**Independent Test**: Join a scheduled meeting through the UI, verify media connection, participant controls, and attendance recording.

- [ ] T038 [P] [US2] Create Pre-Join screen in `frontend/src/routes/meeting-join/$inviteToken/pre-join.tsx`
- [ ] T039 [P] [US2] Create waiting room UI in `frontend/src/components/meeting-room/waiting-room.tsx`
- [ ] T040 [P] [US2] Create meeting room layout in `frontend/src/routes/_app/meetings/$meetingId/room.tsx`
- [ ] T041 [P] [US2] Create video tile component in `frontend/src/components/meeting-room/video-tile.tsx`
- [ ] T042 [P] [US2] Create microphone mute/unmute control in `frontend/src/components/meeting-room/media-controls/mute-mic.tsx`
- [ ] T043 [P] [US2] Create camera enable/disable control in `frontend/src/components/meeting-room/media-controls/toggle-camera.tsx`
- [ ] T044 [P] [US2] Create screen share button in `frontend/src/components/meeting-room/media-controls/screen-share.tsx`
- [ ] T045 [P] [US2] Create device selection in `frontend/src/components/meeting-room/media-controls/device-selector.tsx`
- [ ] T046 [P] [US2] Create connection quality indicator in `frontend/src/components/meeting-room/connection-quality.tsx`
- [ ] T047 [P] [US2] Create waiting room controls in `frontend/src/components/meeting-room/waiting-room-controls.tsx`
- [ ] T048 [P] [US2] Create room lock/unlock control in `frontend/src/components/meeting-room/room-lock.tsx`
- [ ] T049 [P] [US2] Create recording start/stop controls with consent in `frontend/src/components/meeting-room/recording-controls.tsx`
- [ ] T050 [P] [US2] Create end meeting button (host only) in `frontend/src/components/meeting-room/end-meeting.tsx`
- [ ] T051 [P] [US2] Create meeting chat panel in `frontend/src/components/meeting-room/chat-panel.tsx`
- [ ] T052 [P] [US2] Create reactions panel in `frontend/src/components/meeting-room/reactions.tsx`
- [ ] T053 [P] [US2] Create hand raise feature in `frontend/src/components/meeting-room/hand-raise.tsx`
- [ ] T054 [P] [US2] Create chat scroll to bottom in `frontend/src/components/meeting-room/chat-scroll.tsx`
- [ ] T055 [US2] Integrate LiveKit client SDK in `frontend/src/integrations/livekit.ts`
- [ ] T056 [US2] Implement room join with token in `frontend/src/integrations/livekit.ts`
- [ ] T057 [US2] Implement media track management in `frontend/src/integrations/livekit.ts`
- [ ] T058 [US2] Implement reconnection handling in `frontend/src/integrations/livekit.ts`
- [ ] T059 [US2] Implement connection quality monitoring in `frontend/src/integrations/livekit.ts`

---

## Phase 5: US3 - Generate and Approve Meeting Minutes (P1 MVP)

**Goal**: After meeting ends, system processes recording/transcript/AI, user reviews draft minutes, approves/publishes official MoM, action items tracked.

**Independent Test**: View post-meeting workspace, verify recording playback, transcript viewer, AI summary, minutes editor, approval workflow.

- [ ] T060 [P] [US3] Create Post-Meeting workspace page in `frontend/src/routes/_app/meetings/$meetingId/post-meeting.tsx`
- [ ] T061 [P] [US3] Create recording playback page in `frontend/src/routes/_app/meetings/$meetingId/recording.tsx`
- [ ] T062 [P] [US3] Create transcript viewer in `frontend/src/components/meeting-records/transcript-viewer.tsx`
- [ ] T063 [P] [US3] Create AI summary view in `frontend/src/components/meeting-records/ai-summary.tsx`
- [ ] T064 [P] [US3] Create Minutes editor in `frontend/src/routes/_app/meetings/$meetingId/minutes.tsx`
- [ ] T065 [P] [US3] Create minutes approval workflow in `frontend/src/components/meeting-records/minutes-approval.tsx`
- [ ] T066 [P] [US3] Create revision history view in `frontend/src/components/meeting-records/revision-history.tsx`
- [ ] T067 [P] [US3] Create export to PDF/Markdown in `frontend/src/components/meeting-records/export-minutes.tsx`
- [ ] T068 [P] [US3] Create decisions list in `frontend/src/components/meeting-records/decisions-list.tsx`
- [ ] T069 [P] [US3] Create action items list in `frontend/src/components/meeting-records/action-items-list.tsx`
- [ ] T070 [P] [US3] Create action item editor in `frontend/src/components/meeting-records/action-item-editor.tsx`
- [ ] T071 [US3] Implement recording playback API in `frontend/src/integrations/recordings.ts`
- [ ] T072 [US3] Implement transcript viewer API in `frontend/src/integrations/transcripts.ts`
- [ ] T073 [US3] Implement AI summary API in `frontend/src/integrations/ai-summary.ts`
- [ ] T074 [US3] Implement minutes editor API in `frontend/src/integrations/minutes.ts`
- [ ] T075 [US3] Implement decisions API in `frontend/src/integrations/decisions.ts`
- [ ] T076 [US3] Implement action items API in `frontend/src/integrations/action-items.ts`

---

## Phase 6: US4 - Follow Up on Action Items (P2)

**Goal**: A user can view My Action Items, filter by status, open action item detail, update status, see source meeting context.

**Independent Test**: Open My Action Items page, filter open/overdue/completed, update an action item status.

- [ ] T077 [P] [US4] Create My Action Items page in `frontend/src/routes/_app/action-items/index.tsx`
- [ ] T078 [P] [US4] Create action item detail page in `frontend/src/routes/_app/action-items/$actionItemId/index.tsx`
- [ ] T079 [P] [US4] Create action item status update in `frontend/src/components/action-items/status-update.tsx`
- [ ] T080 [P] [US4] Create Notification center in `frontend/src/components/notifications/notification-center.tsx`
- [ ] T081 [P] [US4] Create notification list in `frontend/src/components/notifications/notification-list.tsx`
- [ ] T082 [P] [US4] Create notification read/unread states in `frontend/src/components/notifications/notification-item.tsx`
- [ ] T083 [US4] Implement action items list API in `frontend/src/integrations/action-items.ts`
- [ ] T084 [US4] Implement notifications API in `frontend/src/integrations/notifications.ts`
- [ ] T085 [US4] Implement real-time notifications in `frontend/src/integrations/notifications.ts`

---

## Phase 7: US4 - Organization Settings and Admin (P2)

**Goal**: Organization admins can manage members, roles, policies, audit logs, usage/storage.

**Independent Test**: Access organization settings, manage members/roles, view audit logs, configure policies.

- [ ] T086 [P] [US4] Create Organization settings page in `frontend/src/routes/_app/settings/organization.tsx`
- [ ] T087 [P] [US4] Create Members management page in `frontend/src/routes/_app/settings/members.tsx`
- [ ] T088 [P] [US4] Create Roles management page in `frontend/src/routes/_app/settings/roles.tsx`
- [ ] T089 [P] [US4] Create Meeting policies page in `frontend/src/routes/_app/settings/policies.tsx`
- [ ] T090 [P] [US4] Create Audit Logs page in `frontend/src/routes/_app/settings/audit-logs.tsx`
- [ ] T091 [US4] Implement organization settings API in `frontend/src/integrations/organizations.ts`
- [ ] T092 [US4] Implement members management API in `frontend/src/integrations/organizations.ts`
- [ ] T093 [US4] Implement roles management API in `frontend/src/integrations/roles.ts`
- [ ] T094 [US4] Implement audit logs API in `frontend/src/integrations/audit-logs.ts`

---

## Phase 8: Testing & Quality

**Purpose**: Quality assurance, accessibility, performance testing

- [ ] T095 [P] Write unit tests for components (Vitest) in `frontend/src/components/**/*.test.tsx`
- [ ] T096 [P] Write integration tests for meeting flows (Vitest) in `frontend/tests/integration/`
- [ ] T097 [P] Write E2E tests for critical journeys (Playwright) in `frontend/tests/e2e/`
- [ ] T098 [P] Test WebRTC in different browsers (Chrome, Firefox, Safari, Edge)
- [ ] T099 Implement keyboard navigation across all interactive components
- [ ] T100 Implement ARIA labels and roles for accessibility
- [ ] T101 Test color contrast (WCAG 2.1 AA) across all components
- [ ] T102 Optimize bundle size in `frontend/vite.config.ts`
- [ ] T103 Test mobile responsiveness across all pages

---

## 📊 Frontend Task Summary

| Phase                             | Tasks     | Story | Status    |
| --------------------------------- | --------- | ----- | --------- |
| Phase 1: Setup                    | T001-T008 | -     | Pending   |
| Phase 2: Foundational             | T009-T014 | -     | Pending   |
| Phase 3: US1 Schedule Meeting     | T015-T037 | US1   | Pending   |
| Phase 4: US2 Join/Conduct Meeting | T038-T059 | US2   | Pending   |
| Phase 5: US3 Minutes & Records    | T060-T076 | US3   | Pending   |
| Phase 6: US4 Action Items         | T077-T085 | US4   | Pending   |
| Phase 7: US4 Org Settings         | T086-T094 | US4   | Pending   |
| Phase 8: Testing & QA             | T095-T103 | -     | Pending   |

Total: 103 frontend tasks

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: Depend on Foundational completion
- **Testing & QA (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories
- **US2 (P1)**: Integrates with US1 (meetings must exist)
- **US3 (P1)**: Integrates with US2 (meeting must be conducted)
- **US4 (P2)**: Integrates with US1/US3 (action items from meetings)

### Parallel Opportunities

- All [P] tasks in Setup can run in parallel
- All [P] tasks in Foundational can run in parallel
- Once Foundational completes, all user stories can start in parallel
- All [P] tasks within a user story can run in parallel
- Different user stories can be worked on in parallel

---

## Next Steps

1. Setup frontend project (T001-T008)
2. Complete foundational infrastructure (T009-T014)
3. Build US1: Schedule and Prepare a Meeting (T015-T037)
4. Build US2: Join and Conduct a Meeting (T038-T059)
5. Build US3: Generate and Approve Meeting Minutes (T060-T076)
6. Build US4: Action Items and Organization Settings (T077-T094)
7. Testing & QA (T095-T103)
