# Research Findings: Meetrix Meeting Platform

**Created**: 2026-11-12
**Feature**: 001-meetrix-meeting-platform

This document consolidates research decisions for all Phase 0 unknowns identified in `plan.md`.

## Decision 1: LiveKit Hosting Model

**Decision**: Self-hosted LiveKit deployed via Docker Compose (development/staging) and Pulumi/Ansible (production).

**Rationale**: The existing infrastructure already uses Docker Compose, Pulumi, and Ansible. Self-hosting keeps the media plane separate from the API control plane as required by the PRD architecture boundary. It also avoids vendor lock-in and gives full control over TURN, recording/egress, and media scaling.

**Alternatives considered**:

- Managed LiveKit service: Faster time-to-market but introduces vendor dependency and less control over media infrastructure.

## Decision 2: Recording Policy

**Decision**: Organization-enforced recording policy with host-controlled start/stop within policy bounds. Organization admins can configure recording defaults and guest access policy; hosts can start/stop recording when organization policy allows it.

**Rationale**: Matches PRD requirements FR-048, ADM-003, and the Privacy by Design constitution principle. Recording must be explicit and configurable at the organization level.

**Alternatives considered**:

- Host-only control (no org policy): Would not satisfy enterprise governance requirements.
- Automatic recording for all meetings: Would violate privacy-by-design and consent requirements.

## Decision 3: Consent Model

**Decision**: Explicit participant acknowledgement with clear visual recording indicator. Consent or acknowledgement is recorded according to organization policy and applicable law. Recording state visible to all participants while active.

**Rationale**: Matches PRD requirements FR-049, FR-050, and REC-002/REC-003. Privacy by Design constitution principle requires explicit and configurable consent.

**Alternatives considered**:

- Notice-only (no acknowledgement required): Does not satisfy consent recording requirement.
- Jurisdiction-specific configurable policy: Deferred; start with explicit acknowledgement as the baseline.

## Decision 4: AI Provider Selection

**Decision**: Deferred. Provider abstraction layer will be implemented to support multiple STT and LLM providers. Initial evaluation candidates: OpenAI (GPT + Whisper), Anthropic (Claude), Azure OpenAI, AWS (Transcribe + Bedrock).

**Rationale**: The PRD requires provider abstraction (AI-012, AI-014) so the product is not locked to one vendor. Selection depends on privacy, language (Indonesian support), quality, and cost requirements that need stakeholder input.

**Alternatives considered**: None — decision intentionally deferred to stakeholders.

## Decision 5: Languages at Launch

**Decision**: English-only at MVP launch. Architecture designed to support Indonesian and other locales in future phases.

**Rationale**: Matches PRD Non-Functional Requirements: "Initial UI language English; architecture should support Indonesian and other locales." Keeps MVP scope manageable.

**Alternatives considered**:

- English + Indonesian at launch: Increases scope and testing burden for MVP.

## Decision 6: Guest Access

**Decision**: Guests can join without creating accounts via invitation or secure meeting link. Guests have limited access (meeting-specific only, no organization membership). Guest links are revocable and optionally expiring.

**Rationale**: Matches PRD requirements MTG-003, ATT-007, and authorization principle "Guests must not gain organization membership merely by joining a meeting."

**Alternatives considered**:

- Require guest accounts: Adds friction for external participants.
- Unlimited guest access: Security risk; violates least-privilege principle.

## Decision 7: Meeting Capacity

**Decision**: 50 participants maximum per meeting for the MVP deployment.

**Rationale**: Reasonable default for initial production with LiveKit SFU. Can be scaled based on load testing and pilot measurements. PRD RTC-017 supports configurable participant limit based on deployment capacity and plan.

**Alternatives considered**:

- 100+ participants: Requires more extensive media capacity testing before MVP.
- Unlimited: Not feasible without knowing infrastructure capacity.

## Decision 8: Object Storage Provider

**Decision**: S3-compatible object storage. MinIO for local development; production provider TBD (AWS S3, Cloudflare R2, or self-hosted MinIO).

**Rationale**: PRD Section 9.6 requires private S3-compatible object storage for recordings, attachments, and exports. Using S3-compatible interface avoids vendor lock-in.

**Alternatives considered**:

- Direct database storage: Not suitable for large media files.
- Single provider lock-in: Violates infrastructure flexibility requirements.

## Decision 9: Default Retention Periods

**Decision**: 90 days default retention for recordings and transcripts. Organization administrators can configure retention periods and deletion behavior. Audit logs retained longer (configurable, minimum 1 year).

**Rationale**: Matches PRD requirements REC-008, ADM-003, and Section 10.6 (Data Retention and Deletion). 90 days balances storage cost with operational needs.

**Alternatives considered**:

- 30 days: May be too short for enterprise compliance.
- 1 year: Higher storage cost; can be configured by orgs that need it.

## Decision 10: Calendar Integration

**Decision**: Not in MVP. Planned for Phase 6 (Enterprise Governance and Integrations). Foundation designed to support calendar integration via scoped credentials and auditable actions.

**Rationale**: PRD Phase 6 explicitly lists calendar integration as a post-MVP feature. MVP focuses on core meeting lifecycle.

**Alternatives considered**:

- Include in MVP: Expands scope beyond MVP acceptance checklist.

## Decision 11: Minutes Approval Roles

**Decision**: Meeting Host and Organization Admin can approve and publish official Minutes of Meeting. Organization Owner has implicit approval authority through Organization Admin role.

**Rationale**: Matches PRD requirement MIN-008 and authorization model where Meeting Host controls meetings and Organization Admin governs organization settings.

**Alternatives considered**:

- Any member can approve: Too permissive for official records.
- Only Organization Admin: Too restrictive; hosts need to publish their own meeting minutes.

## Decision 12: Data Residency

**Decision**: Not enforced at platform level for MVP. Organization administrators can configure storage preferences; data residency requirements handled through deployment region selection and documented per-customer.

**Rationale**: PRD Open Product Decision #12 defers this to customer/regulatory requirements. MVP architecture supports deployment in multiple regions.

**Alternatives considered**:

- Enforce residency at platform level: Premature without customer requirements.

## Summary

All 12 Phase 0 unknowns have been resolved with documented decisions. Four decisions (AI provider, languages, calendar integration, data residency) are intentionally deferred or scoped to post-MVP phases. The remaining eight decisions provide a concrete foundation for Phase 1 design (data model, contracts, quickstart).
