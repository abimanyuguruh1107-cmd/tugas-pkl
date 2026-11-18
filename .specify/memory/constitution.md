# Meetrix Constitution

## Core Principles

### I. Meeting-First Workflow
Scheduling, joining, conducting, documenting, and following up on meetings belong to one coherent workflow. Every meeting must produce an organized record containing its agenda, participants, attendance, minutes, decisions, action items, supporting files, transcript, and AI-generated summary. A meeting must not end with an unstructured recording or notes that are difficult to find.

### II. Human-Controlled AI
AI output is a draft or recommendation. Authorized users must review and approve official minutes and action items. Automatic approval of official minutes without human review is prohibited. AI-generated voice cloning or synthetic participant voices are out of scope.

### III. Privacy by Design
Recording, transcription, AI processing, retention, and access must be explicit and configurable. Consent and policy requirements must be satisfied before recording or transcription. Data retention settings are organization-level and configurable.

### IV. Enterprise Governance
Tenant isolation, role-based access control, auditability, retention policies, and administrative controls are core requirements. Zero known cross-tenant data access incidents must be maintained. An organization is a tenant boundary; a user may belong to more than one organization with separate membership and role in each.

### V. Reliable Real-Time Communication
The meeting experience must remain usable under imperfect network conditions. WebRTC audio/video must function under suboptimal connectivity.

### VI. Incremental Architecture
Preserve the starterpack's modular monolith and worker model initially. Extract services only when scale or operational requirements justify it. Do not introduce premature service decomposition.

## Success Metrics

| Metric | Initial Target |
|--------|---------------|
| Successful meeting joins | At least 98% of join attempts |
| Meeting service availability | 99.5% monthly target for initial production |
| Meeting record completion | At least 85% of completed meetings have minutes or a summary |
| AI summary generation | 95% of eligible recordings processed successfully |
| AI summary turnaround | Within 5 minutes after processing is queued for a typical 60-minute meeting |
| Action item review | At least 70% of AI-proposed action items reviewed or resolved |
| API reliability | Less than 1% server-side error rate for core workflows |
| Search response | p95 under 2 seconds for normal indexed queries |
| Authorization | Zero known cross-tenant data access incidents |

Targets are provisional and must be validated through load testing and pilot usage.

## Roles and Permissions

Meetrix is a multi-tenant application. Core roles include:
- **Platform Super Admin**: Operates the Meetrix platform and manages tenant-level platform support functions.
- **Organization Owner**: Owns organization configuration, subscription-level settings, and organization administrators.
- **Organization Admin**: Manages members, roles, policies, organization settings, and audit access.
- **Meeting Admin**: Manages organization meetings and meeting templates, subject to policy.
- **Meeting Host**: Creates and controls meetings, manages participants, and publishes records.
- **Participant**: Joins meetings and collaborates on notes and agenda.

Each role has clearly defined permissions scoped to their organization membership.

## Governance

This constitution supersedes all other development and operational practices. Amendments require documentation, approval, and a migration plan. All PRs and reviews must verify compliance with these principles. Complexity must be justified. Product scope (in-scope and out-of-scope items) is defined in the Product Requirements Document and must be respected.

**Version**: 1.0.0 | **Ratified**: 2026-11-12 | **Last Amended**: 2026-11-12
