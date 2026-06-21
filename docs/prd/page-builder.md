# PRD: page-builder

> Ticket: WAIT-1 · Epic: Core Waitlist — Phase 1 · Module: `page-builder` · Discipline: FE + BE + DB
> Status: awaiting PM approval → `tech-lead`

## 1. TL;DR

Founders can create, edit, and delete a waitlist (name, slug, headline, subheadline, logo URL, theme preset) from an authenticated dashboard backed by owner-scoped `/api/waitlists*` routes. This is the foundational CRUD for the Core Waitlist epic — everything downstream (public page, referral engine, rewards) hangs off a Waitlist record that only exists after this ships. Ships directly (no flag) as MVP core CRUD.

## 2. Problem & Evidence

A founder has nothing to share, refer to, or grow until a waitlist record exists. WAIT-1 is the entry point of the entire product; without it no public page, referral link, or dashboard stat can exist.

| claim | source | confidence |
| :---- | :----- | :--------- |
| Waitlist creation is the first action a new founder must take; nothing else is reachable until it exists | product positioning (profile §1) + epic ordering (WAIT-1 is Phase 1 gate) | observed |
| Founders expect a no-code "create in minutes" flow, not config files | profile §1 framing ("in minutes", "no code required") | assumed |
| Owner isolation is a hard expectation for a multi-tenant SaaS dashboard | AUTH-2 (profile §4) + §5 safety surface designation | validated (rule-backed) |
| URL-paste logo + named theme presets are sufficient for MVP (no upload) | PM-resolved decision (this ticket) | validated (PM decision) |

## 3. Primary job (JTBD)

When I'm launching a new product and need somewhere to send interested people, I want to stand up a branded waitlist page in a few minutes without writing code, so I can start capturing and growing an audience immediately.

Related jobs (≤3):
- When my launch details change, I want to edit my waitlist's copy and look without rebuilding it.
- When a waitlist is dead or was a mistake, I want to delete it and know its subscriber data is gone.

## 4. Desired outcomes (Ulwick)

| # | Outcome | Target | Measured by |
| :- | :------ | :----- | :---------- |
| O-1 | Minimize time-to-first-waitlist for a new founder when going from signed-in dashboard to a saved waitlist | first create succeeds in a single uninterrupted form submission (no error round-trip on valid input) | manual/E2E flow: signed-in founder → create form → 201 with `{ id, slug }` |
| O-2 | Maximize correctness of owner isolation when any founder reads or mutates waitlists | 100% — zero cross-account read/write/delete | AUTH-2 rule tests: second Clerk account sees/affects zero of another founder's data (REQ-5, REQ-4, REQ-6) |
| O-3 | Maximize slug integrity when founders pick a slug, so no two waitlists collide and no malformed slug is stored | 100% — every duplicate → 409, every malformed → 400 | PAGE-2 rule tests (REQ-2, REQ-3) |
| O-4 | Maximize subscriber-data hygiene when a waitlist is deleted, so no orphaned PII remains | 100% — all Signup rows absent after delete | DATA-3 rule test (REQ-6 read-back) |

Each outcome links to the §3 job and is satisfied by ≥1 acceptance criterion in §8.

## 5. Product Rules & Safety in scope

| Rule | Scope in this PRD | Satisfied by |
| :--- | :---------------- | :----------- |
| AUTH-1 | All `/api/waitlists*` verbs return 401 JSON (not 302) when unauthenticated | AC-7 (Slice A) |
| AUTH-2 | Every mutating endpoint + list query scoped to `auth().userId`; non-owner → 403 | AC-1, AC-4, AC-5, AC-6 (Slices A, B) |
| PAGE-2 | Slug globally unique (DB `@unique` + API 409); slug format `^[a-z0-9-]+$`, ≤64 chars (Zod) | AC-2, AC-3 (Slice A) |
| DATA-3 | All Signup rows cascade-purged on waitlist deletion | AC-6 (Slice B) |

**§5 SAFETY SURFACE: YES.** This ticket introduces AUTH-2 ownership predicates in new `/api/waitlists*` API routes (profile §5: "any change to ownership predicates is a safety surface"). It also touches PII via cascade purge of Signups (DATA-3) on delete. Downstream this requires: `safety-reviewed` tag, `safety-reviewer` mandatory review with veto, and a green E2E journey for the auth/ownership + delete-purge paths before merge (profile §8 DoD).

## 6. Appetite

**M (~3 build iterations).** Three thin slices: (A) the owner-scoped CRUD API + contracts, (B) the cascade-delete path, (C) the dashboard FE forms wiring to the API. Schema is already migrated (FOUND-3) and cascade is already in place, so no DB iteration is spent. If it doesn't fit, narrow the FE slice (forms can ship without polish) — do not raise the cap or relax the AUTH/PAGE/DATA rules.

## 7. Vertical slices

The PRD stops here — `tech-lead` decomposes these into file-level work at build time.

**Slice A — Owner-scoped waitlist API: create / update / list.**
Thin end-to-end: authenticated CRUD over `/api/waitlists` and `/api/waitlists/[id]` with Zod validation, slug uniqueness/format enforcement, owner isolation, and 401-JSON-on-unauth. Modules: `page-builder`. Depends on: none.
Acceptance: AC-1, AC-2, AC-3, AC-4, AC-5, AC-7.

**Slice B — Delete with cascade purge.**
Owner-only hard-delete of a waitlist that cascade-purges all Signups (DATA-3); non-owner → 403. Modules: `page-builder`. Depends on: Slice A (reuses ownership predicate).
Acceptance: AC-6.

**Slice C — Dashboard CRUD UI.**
List page (with empty state), create form, pre-populated edit form, theme-preset picker — wired to Slice A/B endpoints with loading + error states. Modules: `page-builder`. Depends on: Slice A, Slice B.
Acceptance: AC-8.

## 8. Acceptance criteria

Each is observable and traces to an outcome (§4) or a rule (§5) — `qa-senior` names a rule-test after each.

- **AC-1 (Slice A → REQ-1, AUTH-2, O-1):** Valid `POST /api/waitlists` by an authenticated founder returns `201 { id, slug }` and the persisted record's `userId` equals the authenticated founder's id.
- **AC-2 (Slice A → REQ-2, PAGE-2, O-3):** A second create with an already-used slug returns `409` and no second record is persisted.
- **AC-3 (Slice A → REQ-3, PAGE-2, O-3):** A slug not matching `^[a-z0-9-]+$` or >64 chars returns `400`; a conforming slug is accepted.
- **AC-4 (Slice A → REQ-4, AUTH-2, O-2):** `PUT /api/waitlists/[id]` by the owner returns `200` with name/headline/subheadline/logoUrl/themeJson changes reflected on read-back; a non-owner returns `403`.
- **AC-5 (Slice A → REQ-5, AUTH-2, O-2):** The list query returns only the authenticated founder's waitlists; a second Clerk account sees zero of another founder's waitlists.
- **AC-6 (Slice B → REQ-6, AUTH-2, DATA-3, O-2, O-4):** `DELETE /api/waitlists/[id]` by the owner returns `204` and, on read-back, the waitlist and all its Signups are absent; a non-owner returns `403`.
- **AC-7 (Slice A → REQ-7, AUTH-1):** A request with no/invalid Clerk session to any `/api/waitlists*` route, on any verb, returns `401` JSON (not a 302 redirect).
- **AC-8 (Slice C → REQ-1/4/5/6, O-1):** From the dashboard, a founder can create a waitlist (form → 201 → appears in list), edit it (pre-populated form → persisted), and delete it (removed from list); the list renders an empty state when the founder has no waitlists.

## 9. Non-goals & rabbit holes

Non-goals (explicitly out of scope for WAIT-1):
- Public `/[slug]` waitlist page — separate ticket (WAIT-2+).
- File upload / image hosting — logo is URL-paste-only (`logoUrl?: string`).
- Custom domain setup — Pro plan, gated by BILL-3, separate work.
- Referral engine, rewards, anti-fraud, dashboard stats — separate modules.
- Real-time preview of the rendered waitlist page.
- New Prisma migrations — schema (incl. `Signup.waitlistId onDelete: Cascade`) already shipped in FOUND-3.

Rabbit holes (declared out-of-bounds up front):
- Do not build a generic theming system — theme is a 3-option named preset (`light | dark | brand`) stored in `themeJson`, nothing more.
- Do not soft-delete or build a recovery/trash flow — DELETE is a hard delete by PM decision; the cascade purge is the point (DATA-3).
- Do not add server-side logo URL fetching/validation/proxying — accept the string; rendering safety belongs to the public-page ticket.
- Do not conflate 403 and 404 for non-existent ids — `tech-lead` must make an explicit choice: returning 404 always leaks whether a resource exists (enumeration); returning 403 for any non-owned resource (whether missing or someone else's) is the safer anti-enumeration pattern. Pick one and be consistent across PUT and DELETE.

## 10. UX & states

No Figma frame linked — use standard shadcn/ui patterns (`<Form>`, `<Input>`, `<Select>` theme picker, `<Button>`), sentence case, WCAG AA (profile §6). Routes: `/dashboard/waitlists` (list), `/dashboard/waitlists/new` (create), `/dashboard/waitlists/[id]/edit` (edit).

| State | Behavior |
| :---- | :------- |
| default | List shows the founder's waitlists with edit/delete actions and a "Create waitlist" CTA. |
| empty | Founder has no waitlists → empty state with a single "Create waitlist" CTA. |
| loading | Form submit / list fetch shows a pending state on the button/list; no double-submit. |
| error | 409 (slug taken) and 400 (invalid slug) surface inline on the slug field; 403/401 → access error message. |
| offline | Best-effort: submit failure shows a retryable error toast; no offline queueing for MVP. |

## 11. Data & contracts

Module: `page-builder`. Entity: `Waitlist` (existing, FOUND-3 — no new fields, no migration). Zod contracts co-located with the API routes (profile §2). Interface-level shapes only — `tech-lead`/implementer owns the full definitions.

- **Create** `POST /api/waitlists` — request: `{ name, slug, headline, subheadline?, logoUrl?, themeJson: { preset: "light" | "dark" | "brand" } }`; slug refined to `^[a-z0-9-]+$` and ≤64 chars. Response: `201 { id, slug }`. Errors: `400` invalid, `409` slug taken, `401` unauth.
- **Update** `PUT /api/waitlists/[id]` — request: partial of the create fields (name, headline, subheadline, logoUrl, themeJson). Response: `200` updated record. Errors: `400`, `403` non-owner, `404`, `401`.
- **List** `GET /api/waitlists` — response: `200` array scoped to `auth().userId`. Errors: `401`.
- **Delete** `DELETE /api/waitlists/[id]` — response: `204`; cascade-purges Signups via existing `onDelete: Cascade`. Errors: `403` non-owner, `404`, `401`.

Idempotency: create is not idempotent (slug uniqueness via DB `@unique` is the guard). Delete is idempotent in effect (second delete → 404, no orphaned rows).

## 12. Telemetry

n/a — no metric change defined for WAIT-1 (PM-confirmed: MVP dashboard CRUD ships without telemetry events; profile §2 telemetry is TODO/not configured).

## 13. Rollout

n/a — ships directly, no feature flag (MVP core CRUD policy, this ticket). The §5 gate still applies: merge requires `safety-reviewed` + `safety-reviewer` sign-off + green E2E on the auth/ownership and delete-purge paths (profile §8 DoD).
