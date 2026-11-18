# Meetrix Frontend — Source Structure

Reference for where each piece of code lives. Use this when the UI/UX design is
approved and implementation starts.

## Directory map

```text
src/
├── components/
│   ├── ui/              Design-system primitives (shadcn). Extend, don't fork.
│   ├── layout/          App shell: sidebar, header, breadcrumbs, org switcher
│   ├── meetings/        Meeting list, create form, agenda builder, detail tabs
│   ├── meeting-room/    Pre-join, video grid, media controls, chat, reactions
│   ├── meeting-records/ Recording player, transcript viewer, AI summary, minutes editor
│   ├── action-items/    My Action Items list, detail, status controls
│   ├── notifications/   Notification center, list, item states
│   └── organization/    Members, roles, policies, audit log views
│
├── integrations/
│   ├── api/
│   │   ├── client.ts    HTTP transport: token attach, 401 refresh, ApiError
│   │   ├── session.ts   Session store + types (no imports — breaks cycles)
│   │   ├── auth.ts      Auth endpoints (login, register, logout, me)
│   │   ├── meetings.ts  Meeting, participant, agenda, join-token endpoints
│   │   ├── action-items.ts
│   │   └── organizations.ts  Org, member, role, policy endpoints
│   ├── livekit/
│   │   ├── client.ts    Room connect/reconnect, mic/cam/screen, quality events
│   │   ├── types.ts     ConnectionState, JoinTokenResponse
│   │   └── index.ts     Barrel export
│   ├── posthog/         Analytics provider
│   └── tanstack-query/  Query client + devtools
│
├── lib/
│   ├── env.ts           Typed runtime config (single source of truth)
│   ├── format.ts        Date, duration, file size, timestamp formatting
│   ├── permissions.ts   `resource:action` RBAC helpers
│   └── utils.ts         `cn()` class merge helper
│
└── routes/
    ├── __root.tsx       Document shell, meta, global providers
    ├── index.tsx        Public landing
    ├── _auth/           Unauthenticated route group
    │   ├── route.tsx    Layout shell
    │   ├── login.tsx
    │   └── register.tsx
    ├── _app/            Authenticated route group
    │   ├── route.tsx    Layout shell (app shell goes here)
    │   └── dashboard/
    └── meeting-join/    Guest join flow
        └── $inviteToken.tsx
```

## Conventions

**Layering** — routes compose, components render, integrations talk to the
outside world, `lib/` holds pure helpers. A component never calls `fetch`
directly; it goes through `integrations/api/*`.

**Server state** — remote data is fetched with TanStack Query. Local UI state
stays in React. The session in `integrations/api/auth.ts` is the one exception:
it is a plain reactive store because it must be readable synchronously during
route guards.

**Authorization** — `lib/permissions.ts` mirrors the backend `resource:action`
convention so the UI can hide unavailable controls. The backend stays
authoritative; hidden controls are a usability measure, not a security boundary.

**Styling** — Tailwind utilities plus the design tokens already defined in
`styles.css`. No inline style objects and no new CSS files unless a token is
missing from the theme.

**Types** — API response types live next to their endpoint module. They mirror
`specs/001-meetrix-meeting-platform/contracts/api.md` and `data-model.md`; keep
them in sync when the backend contract changes.

**Configuration** — read environment variables through `lib/env.ts`. Never
access `import.meta.env` directly outside that file. Secrets never reach the
browser; only `VITE_`-prefixed public values are exposed.

## Adding a screen

1. Create the route file under the appropriate group in `routes/`.
2. Add the endpoint calls to the matching `integrations/api/*` module.
3. Build presentational pieces in the matching `components/<feature>/` folder.
4. Reuse primitives from `components/ui/`; add to that folder only when a
   primitive is genuinely reusable across features.
5. Run `bun run generate-routes` after adding or moving route files.
