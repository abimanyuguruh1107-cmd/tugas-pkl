# Feature Specification: Meetrix Frontend Application

**Feature Branch**: `001-meetrix-meeting-platform`

**Created**: 2026-11-12

**Status**: Draft

**Input**: Meetrix Enterprise Meeting & Collaboration Platform PRD — a multi-tenant enterprise web application for planning, conducting, documenting, and following up on meetings with WebRTC, participant management, recordings, transcripts, and AI-generated outcomes.

**Short name**: `meetrix-frontend`

**Product Vision**: Make every enterprise meeting easier to run, easier to understand, and easier to turn into accountable work.

**Product Principles**:

1. Meeting-first workflow
2. Human-controlled AI
3. Privacy by design
4. Enterprise governance
5. Reliable real-time communication
6. Incremental architecture

## Scope *(mandatory)*

### In Scope

- Multi-tenant organization and workspace management
- User invitations, memberships, profiles, and RBAC
- Meeting scheduling and lifecycle management
- Meeting links and guest access
- WebRTC audio/video meetings
- Waiting room, participant controls, and host/moderator controls
- Participant list and attendance records
- Screen sharing, chat, reactions, and basic meeting interaction
- Agenda and collaborative notes
- Meeting files and attachments
- Recording and playback
- Speech-to-text transcription
- AI meeting summaries, decisions, topics, and suggested action items
- Human review and approval of meeting minutes
- Search, filters, and meeting history
- Notifications and reminders
- Audit logs, retention settings, and organization policies
- Administrative dashboards and operational monitoring

### Out of Scope for Initial Release

- Native iOS and Android applications
- PSTN dial-in and outbound telephone calling
- Webinar broadcasting to thousands of passive viewers
- Full project management functionality
- Full document editing comparable to Google Docs
- AI-generated voice cloning or synthetic participant voices
- Automatic approval of official minutes without human review
- Automatic employee performance scoring based on meeting speech
- End-to-end encrypted group media if it conflicts with server-side recording and transcription requirements
- Complex on-premises deployment for every customer

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schedule and Prepare a Meeting (Priority: P1)

A member creates a meeting with title, description, date, time, timezone, and visibility; adds internal participants and external guest invitees; assigns a host and optional co-hosts; creates an agenda; attaches reference documents; configures waiting room, guest access, recording, and AI settings within organization policy; and sends invitations.

**Why this priority**: This is the primary entry point of the meeting lifecycle. Without scheduling, no meeting can occur. It is the most critical user journey for platform adoption.

**Independent Test**: Can be fully tested by creating a meeting through the UI and verifying that the meeting record, invitations, agenda, and settings are persisted correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated member with organization membership, **When** they create a meeting with valid time range and participants, **Then** the meeting is created with status `scheduled` and invitations are sent.
2. **Given** an authenticated member, **When** they create a meeting with an invalid time range (end before start), **Then** the system rejects the creation with a validation error.
3. **Given** an authenticated member, **When** they invite external guests by email, **Then** guest invitations are created with revocable, expiring tokens.
4. **Given** an unauthorized user, **When** they attempt to create a meeting, **Then** the system rejects the request with an authorization error.

---

### User Story 2 - Join and Conduct a Meeting (Priority: P1)

A participant opens the meeting link; the application validates their invitation or membership; they see a pre-join screen to test microphone, camera, and speaker; they join the waiting room or meeting depending on policy; the host admits them if required; they join the media room using a short-lived token; participants use microphone, camera, screen share, chat, and reactions; the host manages participants and meeting controls; attendance events are recorded; the host ends the meeting or leaves it running for others.

**Why this priority**: This is the core real-time experience of the platform. Without reliable joining and conducting, the meeting platform fails its primary purpose.

**Independent Test**: Can be fully tested by having an authorized participant join a scheduled meeting through the UI and verifying media connection, participant controls, and attendance recording.

**Acceptance Scenarios**:

1. **Given** an invited participant with a valid invitation token, **When** they open the meeting link, **Then** they can join the meeting room using a short-lived media token.
2. **Given** an unauthorized user with an expired invitation, **When** they attempt to join, **Then** they cannot obtain a room token and are denied access.
3. **Given** an active meeting with a participant experiencing temporary network loss, **When** the participant reconnects, **Then** no duplicate attendance record is created.
4. **Given** an authorized host, **When** they end the meeting for all participants, **Then** the meeting ends for everyone and the status changes to `ended`.

---

### User Story 3 - Generate and Approve Meeting Minutes (Priority: P1)

The meeting ends; the system finalizes recording metadata and queues processing jobs; audio is submitted to the transcription provider; the transcript is stored with timestamps and speaker labels; AI generates a summary, decisions, and proposed action items; the host reviews and edits the draft MoM; the host assigns or corrects action item owners and due dates; an authorized user approves and publishes the minutes; participants receive notification and can view the published record.

**Why this priority**: This converts the meeting into accountable, searchable outcomes — the core differentiator of the platform.

**Independent Test**: Can be fully tested by having a host review AI-generated minutes, edit them, approve and publish, then verifying the published record is visible to authorized participants.

**Acceptance Scenarios**:

1. **Given** a completed meeting with recording and transcript, **When** AI generates a summary, **Then** the summary is an editable draft requiring human approval.
2. **Given** a draft MoM, **When** an authorized user approves and publishes it, **Then** the minutes have a revision history and publication metadata.
3. **Given** an AI processing failure, **When** the host attempts to publish manually written minutes, **Then** the host can publish without AI output.
4. **Given** published minutes, **When** a revision is made, **Then** a new version is created without silently overwriting the historical record.

---

### User Story 4 - Follow Up on Action Items (Priority: P2)

A user opens My Action Items; filters open, overdue, or completed tasks; opens an action item and sees its source meeting and decision context; updates status or adds a progress note; the system records the change and notifies relevant users; the meeting record reflects the latest action item status.

**Why this priority**: Follow-up ensures meeting outcomes turn into accountable work, but it is a post-meeting activity that can follow the first release.

**Independent Test**: Can be fully tested by a user viewing their assigned action items, updating status, and verifying notifications are sent.

**Acceptance Scenarios**:

1. **Given** a user with assigned action items, **When** they view My Action Items, **Then** they see tasks filtered by owner, due date, status, and source meeting.
2. **Given** an action item approaching its due date, **When** the deadline approaches, **Then** the system sends a reminder to the owner.

---

### Edge Cases

- What happens when a recording job fails mid-processing? The failure must be recorded safely and surfaced to administrators without erasing the meeting or its recording metadata.
- How does the system handle a participant who rejoins after network loss? Reconnection creates or updates session segments without duplicating participant identity.
- What occurs when AI produces incorrect decisions or action items? AI output is always a draft until an authorized user approves it; users can mark AI results as incorrect and edit them.
- How are cross-tenant access attempts prevented? Tenant context is resolved and validated for every organization-scoped request; zero known cross-tenant data access incidents must be maintained.
- What happens when a guest joins a meeting? Guests must not gain organization membership merely by joining a meeting.
- How does the system handle recording consent? Participants receive a clear visual indication while recording is active; consent or acknowledgement is recorded according to organization policy and applicable law.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication and Organization Management

- **FR-001**: Users MUST be able to register or accept an invitation and authenticate using JWT access/refresh tokens.
- **FR-002**: Users MUST be able to log in, log out, refresh sessions, and view their active profile.
- **FR-003**: Users MUST be able to belong to multiple organizations with independent memberships.
- **FR-004**: Organization owners/admins MUST be able to update organization name, logo, timezone, and basic settings.
- **FR-005**: Admins MUST be able to invite users by email and assign an organization role.
- **FR-006**: Admins MUST be able to deactivate or remove members, subject to ownership safeguards.
- **FR-007**: Organization data MUST be isolated from other tenants.
- **FR-008**: RBAC permissions MUST use the `resource:action` convention.
- **FR-009**: Tenant context MUST be resolved and validated for every organization-scoped request.
- **FR-010**: A role name alone MUST never be treated as sufficient authorization; permissions and resource ownership MUST be checked.

#### Meeting Scheduling and Management

- **FR-011**: Authorized users MUST be able to create a meeting with title, description, start/end time, timezone, and visibility.
- **FR-012**: A meeting MUST support scheduled or immediate start.
- **FR-013**: A meeting MUST support internal members and external guest invitees.
- **FR-014**: The creator MUST be able to assign a host and optional co-hosts.
- **FR-015**: A meeting MUST support an agenda with ordered items and descriptions.
- **FR-016**: Users MUST be able to edit, reschedule, cancel, or duplicate meetings subject to permissions.
- **FR-017**: Users MUST be able to view upcoming, past, and cancelled meetings.
- **FR-018**: The system MUST generate a unique meeting join URL and access credentials.
- **FR-019**: Hosts MUST be able to configure waiting room, guest access, passcode, and participant permissions.
- **FR-020**: Meeting lifecycle MUST follow `draft → scheduled → live → ended → processing → completed`, with `cancelled` as an additional state.

#### Real-Time WebRTC Meeting Room

- **FR-021**: Participants MUST be able to join a meeting using a valid authenticated membership or guest invitation.
- **FR-022**: Participants MUST be able to mute/unmute their microphone and enable/disable their camera.
- **FR-023**: Participants MUST be able to select available camera, microphone, and speaker devices.
- **FR-024**: Participants MUST be able to share their screen or a selected window/tab where browser support allows.
- **FR-025**: The meeting room MUST display participant video tiles and audio-only participant state.
- **FR-026**: Hosts MUST be able to mute participants, remove participants, lock the room, and control the waiting room.
- **FR-027**: Participants MUST be able to reconnect after temporary network loss without creating duplicate attendance records.
- **FR-028**: Only authorized hosts MUST be able to end the meeting for all participants.

#### Participant and Attendance Management

- **FR-029**: A meeting MUST have an invitee list with invitation status.
- **FR-030**: The system MUST record join and leave timestamps for each participant session.
- **FR-031**: The system MUST calculate attendance duration from valid session intervals.
- **FR-032**: Attendance records MUST distinguish internal members from guests.
- **FR-033**: Hosts MUST be able to view invited, accepted, declined, waiting, present, and absent states.

#### Agenda, Notes, and Minutes of Meeting

- **FR-034**: A meeting MUST be able to have an agenda created before the meeting.
- **FR-035**: Authorized participants MUST be able to create and edit meeting notes during the meeting.
- **FR-036**: Notes MUST be associable with agenda items.
- **FR-037**: Users MUST be able to create a formal Minutes of Meeting (MoM) document after the meeting.
- **FR-038**: MoM MUST include meeting metadata, attendees, agenda, discussion notes, decisions, and action items.
- **FR-039**: Users MUST be able to edit AI-generated or manually written minutes before publication.
- **FR-040**: Authorized users MUST be able to approve and publish minutes.
- **FR-041**: Published minutes MUST have a revision history and publication metadata.

#### Decisions and Action Items

- **FR-042**: Users MUST be able to create an action item linked to a meeting.
- **FR-043**: An action item MUST have title, description, owner, due date, priority, and status.
- **FR-044**: Action item status MUST support `open`, `in_progress`, `blocked`, `completed`, and `cancelled`.
- **FR-045**: Users MUST be able to record decisions separately from general notes.
- **FR-046**: AI MUST be able to propose action items and owners from transcript content, but a user MUST confirm them.
- **FR-047**: AI MUST NOT assign an action item to a person solely because their name was mentioned.

#### Recording and Media Library

- **FR-048**: An authorized host MUST be able to start or stop a meeting recording when organization policy allows it.
- **FR-049**: Participants MUST receive a clear visual indication while recording is active.
- **FR-050**: The system MUST record consent or acknowledgement according to organization policy and applicable law.
- **FR-051**: Recording access MUST be checked on every playback request.
- **FR-052**: Organization administrators MUST be able to configure retention periods and deletion behavior.
- **FR-053**: Recordings MUST be stored in private object storage, not directly in the application database.

#### Transcription

- **FR-054**: Eligible recordings MUST be submittable to a speech-to-text provider.
- **FR-055**: The system MUST store transcript segments with timestamps and speaker labels where supported.
- **FR-056**: Users MUST be able to view a transcript alongside the recording.
- **FR-057**: Authorized users MUST be able to correct transcript text and speaker labels.

#### AI Meeting Intelligence

- **FR-058**: AI MUST generate a concise executive summary from an eligible transcript.
- **FR-059**: AI MUST generate a detailed summary organized by agenda item or topic.
- **FR-060**: AI MUST extract key discussion points and topics.
- **FR-061**: AI MUST propose decisions made during the meeting.
- **FR-062**: AI MUST propose action items, owners, and due dates when supported by explicit evidence.
- **FR-063**: AI MUST generate a draft MoM using meeting metadata, agenda, notes, and transcript.
- **FR-064**: AI output MUST always be a draft until an authorized user approves it.
- **FR-065**: Meeting content MUST NOT be used to train a provider model unless the organization has explicitly enabled and approved that processing arrangement.
- **FR-066**: AI enablement MUST be configurable by organization and meeting.

#### Search and Meeting History

- **FR-067**: Users MUST be able to search meetings by title and description.
- **FR-068**: Users MUST be able to filter by date range, host, participant, status, and tag.
- **FR-069**: Authorized users MUST be able to search minutes and action items.
- **FR-070**: Search results MUST enforce tenant and meeting-level authorization.

#### Notifications

- **FR-071**: The system MUST send meeting invitation emails.
- **FR-072**: The system MUST send meeting update and cancellation emails.
- **FR-073**: The system MUST notify users when minutes are published or they are assigned an action item.

#### Administration and Governance

- **FR-074**: Organization admins MUST be able to manage members and roles.
- **FR-075**: Organization admins MUST be able to configure meeting defaults and guest access policy.
- **FR-076**: Organization admins MUST be able to configure recording, AI, and retention policies.
- **FR-077**: Authorized administrators MUST be able to view audit events.
- **FR-078**: Audit events MUST cover authentication, member changes, meeting changes, recording actions, minutes approval, action item changes, policy changes, and administrative support access.

### Key Entities *(include if feature involves data)*

- **Organization**: Tenant record with name, slug, timezone, and settings. Boundary for all data isolation.
- **Membership**: User-to-organization relationship with role and status. A user may belong to multiple organizations.
- **Role**: Role definition with permissions using `resource:action` convention.
- **Invitation**: Organization invitation with email, role, token hash, expiry, and status.
- **Meeting**: Meeting metadata and lifecycle with organization, title, description, times, status, host, and settings.
- **MeetingParticipant**: Invitees and participant access with meeting, user/guest email, role, and invitation status.
- **MeetingSession**: Participant connection sessions with join/leave timestamps and connection metadata.
- **AgendaItem**: Ordered agenda items with title, description, position, and status.
- **MeetingNote**: Notes and revisions with content, version, and associations to agenda items.
- **Recording**: Recording metadata with provider, object key, status, duration, and retention.
- **Transcript**: Transcript metadata with language, provider, status, and version.
- **TranscriptSegment**: Timestamped transcript chunks with start/end times, speaker label, and text.
- **MeetingSummary**: AI output versions with provider, model, prompt version, status, and content.
- **MeetingDecision**: Confirmed decisions with text, context, status, and creator.
- **ActionItem**: Follow-up tasks with title, owner, due date, priority, status, and source segment.
- **MinutesDocument**: Formal MoM records with content, status, version, approver, and publication timestamp.
- **AuditLog**: Security and governance events with actor, action, target, timestamp, and metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully join at least 98% of meeting join attempts.
- **SC-002**: The meeting service maintains 99.5% monthly availability for initial production.
- **SC-003**: At least 85% of completed meetings have minutes or a summary.
- **SC-004**: 95% of eligible recordings are processed successfully through transcription.
- **SC-005**: AI summaries are generated within 5 minutes after processing is queued for a typical 60-minute meeting.
- **SC-006**: At least 70% of AI-proposed action items are reviewed or resolved.
- **SC-007**: Core API workflows maintain less than 1% server-side error rate.
- **SC-008**: Search returns results in under 2 seconds (p95) for normal indexed queries.
- **SC-009**: Zero known cross-tenant data access incidents.
- **SC-010**: Participants can complete meeting join and device setup in under 2 minutes.

Targets are provisional and must be validated through load testing and pilot usage.

## Assumptions

- The product is built on the existing `merb-starterpack` repository, reusing its authentication, RBAC foundation, monorepo, queue infrastructure, frontend framework, containerization, and deployment automation.
- LiveKit is used as the WebRTC SFU/media layer for real-time audio/video communication.
- MongoDB is the primary application database with Mongoose for data modeling.
- Redis and BullMQ are used for asynchronous background jobs (email, recording, transcription, AI, notifications).
- TanStack Start with React 19 is used for the web application frontend.
- Native iOS and Android applications are out of scope for the initial release.
- SSO using OIDC/SAML is planned for a later enterprise phase, not the MVP.
- Meeting content is processed by server-side recording and transcription services; end-to-end confidentiality is not promised if media is processed by these services.
- Existing authentication flows (JWT access/refresh tokens) are extended rather than rewritten for meeting features.
- Data retention periods are organization-level and configurable, subject to platform and legal constraints.
- Speaker labels from transcription are estimates and may be incorrect; the UI does not present diarization as verified identity.
- AI output is always treated as a draft until an authorized user reviews and approves it.
