# Implementation plan: page-builder (WAIT-1)

> FULL-tier plan doc. Precedes implementation. Slice→file decomposition, call paths + contracts, test plan, edge cases, risks + rollback.
> PRD: WAIT-1 (page-builder) · Module: `page-builder` · §5 surface: **YES** (new AUTH-2 ownership predicates + DATA-3 cascade purge)
> No feature flag (MVP core CRUD ships directly). No async/queue. Synchronous CRUD. Schema already in place (FOUND-3) — **no new migration**.

---

## 0. Scope summary

| REQ | Behavior | Rule |
| :-- | :------- | :--- |
| REQ-1 | `POST /api/waitlists` → 201 `{id, slug}`; `userId` = auth founder | AUTH-2 |
| REQ-2 | duplicate slug → 409 | PAGE-2 |
| REQ-3 | invalid slug (not `^[a-z0-9-]+$` or >64) → 400 | PAGE-2 |
| REQ-4 | `PUT /api/waitlists/[id]` → 200 read-back; non-owner → 403 | AUTH-2 |
| REQ-5 | `GET /api/waitlists` → list scoped to auth `userId` | AUTH-2 |
| REQ-6 | `DELETE /api/waitlists/[id]` → 204; cascade-purge Signups; non-owner → 403 | AUTH-2, DATA-3 |
| REQ-7 | unauthenticated `/api/waitlists*` → 401 JSON (not 302) | AUTH-1 |

Slices: **A** = owner-scoped CRUD API (POST/GET/PUT) + Zod contracts · **B** = DELETE + cascade purge · **C** = dashboard UI (list, create, edit).

§5 gate active: `safety-reviewer` veto on the AUTH-2 ownership predicate + DATA-3 cascade purge. Sign-off recorded before merge.

---

## 1. File decomposition (slice → file → responsibility)

### Slice A — owner-scoped CRUD API + contracts

#### CREATE `lib/db/waitlists.ts` — Prisma repository layer
- **Owns:** the *only* call site of `prisma.waitlist.*`. Exposes `create`, `findMany`, `findById`, `update`, `delete`. No HTTP, no auth, no Zod here — pure data access.
- **Satisfies:** all of REQ-1/4/5/6 (data access half).
- **Invariants:**
  - `findMany(userId)` MUST filter by `userId` at the query level — never fetch-all-then-filter (AUTH-2; prevents over-fetch leakage). Signature: `findMany(userId: string)`.
  - `findById(id)` returns the row *including `userId`* so the handler can run the ownership predicate. It does NOT take `userId` — ownership is decided in the handler, not silently swallowed into the query (so the handler can distinguish "exists but not owned" and return the anti-enumeration 403 uniformly; see §3).
  - `delete(id)` relies on Prisma `onDelete: Cascade` (schema FOUND-3) to purge `Signup` rows — no manual child delete, no raw SQL (DoD: no raw SQL bypassing Prisma).
  - `create` accepts a typed object whose `userId` is supplied by the handler from `auth()`, never from the request body (AUTH-2 — client cannot set owner).
  - Single Prisma client import (`@/lib/db/prisma` or existing client export) — do not instantiate `new PrismaClient()` per call.

#### CREATE `app/api/waitlists/route.ts` — collection handlers (POST, GET)
- **Owns:** `POST` (create) + `GET` (list). Co-locates `CreateWaitlistSchema` (see §2).
- **Satisfies:** REQ-1, REQ-2, REQ-3, REQ-5, REQ-7.
- **Invariants:**
  - Belt-and-suspenders `const { userId } = auth()` (or `await auth()` per Clerk v5/v6); `if (!userId) return 401 JSON` even though middleware already gates (REQ-7 / AUTH-1).
  - `POST`: parse body with `CreateWaitlistSchema.safeParse` → on failure return **400** with issues (REQ-3). Never trust `userId`/`id`/`slug`-collision from body.
  - `userId` injected from `auth()`, stripped from any client-supplied body field.
  - P2002 on `slug` (unique) → **409** (REQ-2; see §5). Pre-check is allowed but the P2002 catch is the authoritative guard against the race.
  - `GET`: return `findMany(userId)` only — scoped list (REQ-5).
  - Responses are JSON; 201 body = `{ id, slug }` exactly (REQ-1).

#### CREATE `app/api/waitlists/[id]/route.ts` — item handlers (PUT, DELETE)
- **Owns:** `PUT` (update) + `DELETE`. Co-locates `UpdateWaitlistSchema` (see §2).
- **Satisfies:** REQ-4 (PUT), REQ-6 (DELETE), plus AUTH-1/REQ-7.
- **Invariants:**
  - **Ownership predicate runs AFTER fetch, BEFORE any mutation** (AUTH-2): `findById(id)` → if `!row || row.userId !== userId` return **403** (uniform — anti-enumeration; see §3 + §5). No mutation may precede this check.
  - `PUT`: `UpdateWaitlistSchema.safeParse` (all fields optional) → 400 on failure; on success `update(id, data)` → **200** returning the read-back row (REQ-4). `userId`/`id` are never updatable from body.
  - `DELETE`: after ownership check, `delete(id)` (cascade) → **204 no body** (REQ-6, DATA-3). Do NOT return JSON on delete success.
  - Same belt-and-suspenders 401 JSON (REQ-7).
  - Slug change via PUT also subject to P2002 → 409 (PAGE-2 holds on update too).

### Slice C — dashboard UI

#### CREATE `app/(dashboard)/waitlists/page.tsx` — list page
- **Owns:** server-component list view + empty state.
- **Satisfies:** REQ-5 (UI surface).
- **Invariants:** under `(dashboard)` group → inherits Clerk `auth()` belt-and-suspenders from existing `app/(dashboard)/layout.tsx`. Reads via `lib/db/waitlists.findMany(userId)` server-side (or fetch to GET) scoped to the session user — never renders another founder's rows. Empty state uses on-brand copy (sentence case; no hype; "create your first waitlist"). shadcn/ui components, WCAG AA.

#### CREATE `app/(dashboard)/waitlists/new/page.tsx` — create form
- **Owns:** create form (Server Component shell + client form island or Server Action).
- **Satisfies:** REQ-1, REQ-3 (client-side mirror of slug rule for UX; server is authoritative).
- **Invariants:** form posts to `POST /api/waitlists` (or Server Action calling the repo). Client slug validation is UX-only; the route's Zod parse is the source of truth. Surfaces 409 (slug taken) and 400 (invalid slug) as inline field errors, not toasts only. No business logic in the component — delegates to API/repo.

#### CREATE `app/(dashboard)/waitlists/[id]/edit/page.tsx` — edit form
- **Owns:** pre-populated edit form.
- **Satisfies:** REQ-4.
- **Invariants:** server-loads the record via `findById` + ownership check (or GET) before rendering; a non-owner hitting this route must not see the form (403/redirect) — UI must not leak another founder's data. Submits to `PUT /api/waitlists/[id]`.

### Tests

#### CREATE `__tests__/page-builder.rules.test.ts` — rule tests
- **Owns:** test-PAGE-2-unique, test-PAGE-2-format, test-AUTH-1, test-AUTH-2, test-DATA-3.
- **Satisfies:** coverage proof for REQ-1..7 (see §4).
- **Invariants:** named to Product-Rule IDs (DoD). Follows the existing `__tests__/auth.rules.test.ts` pattern (Node-env Vitest, `@` alias) — see §4 for the import-vs-replicate decision forced by edge-only Clerk modules.

### No files MODIFIED
`middleware.ts`, `app/(dashboard)/layout.tsx`, and the Prisma schema are unchanged. `/api/waitlists*` already falls under the middleware's `protected-api` matcher (verified in `__tests__/auth.rules.test.ts` — `classifyRoute('/api/waitlists')` → `protected-api`), so REQ-7's 401-JSON behavior is already wired; the handler adds the in-handler belt-and-suspenders only.

---

## 2. Zod contracts (co-located with the routes)

```ts
// shared slug rule — anchored regex is load-bearing (see §5)
const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, or hyphens');

// app/api/waitlists/route.ts — POST body (REQ-1, REQ-3)
const CreateWaitlistSchema = z.object({
  name:         z.string().min(1),
  slug:         slugSchema,
  headline:     z.string().min(1),
  subheadline:  z.string().optional(),
  logoUrl:      z.string().url().optional(),
  themeJson:    z.unknown(),            // validated as present; stored as Json (see §5)
  customDomain: z.string().optional(),  // BILL-3 gate is out of WAIT-1 scope; accept + persist only
  rewardsJson:  z.unknown().optional(),
});
// NOTE: userId and id are NEVER in the schema — server-injected from auth() (AUTH-2).

// app/api/waitlists/[id]/route.ts — PUT body (REQ-4) — all fields optional
const UpdateWaitlistSchema = CreateWaitlistSchema.partial();
// slug, if present, still passes slugSchema; userId/id remain non-updatable.
```

- Inferred types (`z.infer<typeof CreateWaitlistSchema>`) feed `lib/db/waitlists.create`. FE imports the inferred type — no hand-rolled DTO (contract-first).
- `themeJson` typed as `z.unknown()` (present-but-opaque) at the API edge; a richer theme schema is a later ticket (rewards/theme presets are `rewards`/`page-builder` follow-ons). Validate shape minimally on write; read back as Prisma deserializes it.

---

## 3. Call paths (end-to-end per slice)

```
POST /api/waitlists            (Slice A — REQ-1/2/3)
  → middleware (protected-api: 401 JSON if no session)
  → handler: const { userId } = auth(); if (!userId) → 401 JSON   [belt-and-suspenders, REQ-7]
  → CreateWaitlistSchema.safeParse(body); !success → 400 + issues  [REQ-3]
  → lib/db.create({ ...data, userId })                            [userId from auth, not body — AUTH-2]
      → P2002 on slug? → 409                                      [REQ-2 / PAGE-2]
  → 201 { id, slug }                                              [REQ-1]

GET /api/waitlists             (Slice A — REQ-5)
  → middleware → handler auth() → 401 if null
  → lib/db.findMany(userId)                                       [query-level scope — AUTH-2]
  → 200 [ ...rows ]

PUT /api/waitlists/[id]        (Slice A — REQ-4)
  → middleware → handler auth() → 401 if null
  → row = lib/db.findById(id)
  → OWNERSHIP PREDICATE: if (!row || row.userId !== userId) → 403 [AUTH-2 + anti-enumeration]
  → UpdateWaitlistSchema.safeParse(body); !success → 400
  → P2002 on slug change? → 409
  → lib/db.update(id, data)
  → 200 { ...read-back row }                                      [REQ-4]

DELETE /api/waitlists/[id]     (Slice B — REQ-6 / DATA-3)
  → middleware → handler auth() → 401 if null
  → row = lib/db.findById(id)
  → OWNERSHIP PREDICATE: if (!row || row.userId !== userId) → 403 [AUTH-2 + anti-enumeration]
  → lib/db.delete(id)   (Prisma onDelete: Cascade purges Signups) [DATA-3]
  → 204 (no body)                                                 [REQ-6]
```

### Ownership predicate pattern (AUTH-2) — the decision
- **Verify `row.userId === userId` AFTER fetch, BEFORE any mutation.** Mutation must never precede the check.
- **403 for both not-found and wrong-owner on mutating paths (PUT/DELETE).** A 404 for "owned id not found" would leak which ids exist to an attacker probing the space; returning a uniform 403 for `!row || row.userId !== userId` makes "doesn't exist" and "exists but yours-not" indistinguishable (anti-enumeration; resolves the PRD rabbit hole). **Never return 404 on the mutating paths.**
- GET list never needs the predicate — it filters by `userId` at the query, so a non-owned row simply never appears.

---

## 4. Test plan — `__tests__/page-builder.rules.test.ts`

**Runner reality (verified):** `vitest.config.ts` is `environment: 'node'`, `globals: true`, alias `@ → repo root`. The existing `__tests__/auth.rules.test.ts` does **not** import Clerk's `createRouteMatcher` because `@clerk/nextjs/server` is edge-only and cannot load under Node Vitest — it **replicates** the invariant and fails loudly on drift. The same constraint applies here: route handlers call `auth()` from `@clerk/nextjs/server`, so importing the handlers directly will pull the edge module.

**Decision:** test the pure, importable units + the policy logic, not the edge-coupled handler wiring:
1. **Zod contract tests** — import `CreateWaitlistSchema`/`UpdateWaitlistSchema` (pure, no Clerk) → drive PAGE-2-format directly.
2. **Repository tests against a real Prisma client on a SQLite test DB** — `lib/db/waitlists.ts` is pure data access (no Clerk) → drive DATA-3 cascade and findMany-scope for real.
3. **Ownership-predicate policy test** — extract the predicate as a tiny pure helper (e.g. `isOwner(row, userId)` / `authorize(row, userId)` returning `'ok' | 'forbidden'`) in `lib/db/waitlists.ts` or a sibling, and unit-test it (mirrors the auth.rules `classifyRoute` pattern) → drive AUTH-2 without the edge module.
4. **AUTH-1/REQ-7** — assert the route classification (already covered by `auth.rules.test.ts` `classifyRoute('/api/waitlists') === 'protected-api'`); add an explicit assertion here referencing PAGE so coverage is named in this file too. Full session round-trip (live 401) is deferred to Playwright E2E (tracked like FOUND-E2E) — note this in the file header, matching the existing test's convention.

| Test name | Drives | Mechanism | Asserts |
| :-------- | :----- | :-------- | :------ |
| `test-PAGE-2-format` | REQ-3 | `CreateWaitlistSchema.safeParse` | `"Bad Slug!"`, `"UPPER"`, 65-char string, `""` → fail; `"my-launch-2026"` → pass. **Includes the anchored-regex regression: `"good\nBad Slug!"` / `"ok bad"` must FAIL** (unanchored regex would wrongly pass). |
| `test-PAGE-2-unique` | REQ-2 | repo create twice w/ same slug on test DB | second insert throws P2002; assert the handler maps it to 409 (test the mapping helper if extracted). |
| `test-AUTH-2` | REQ-4/5/6 | `authorize(row, userId)` helper + `findMany` scope | non-owner row → `'forbidden'`; owner → `'ok'`; missing row → `'forbidden'` (uniform, anti-enum). `findMany(userA)` returns only userA rows when DB also holds userB rows. |
| `test-AUTH-1` | REQ-7 | route classification | `/api/waitlists` + `/api/waitlists/<id>` classify as `protected-api` (401-JSON policy); cross-ref to `auth.rules.test.ts`. |
| `test-DATA-3` | REQ-6 | repo `delete` on test DB w/ seeded Signups | after `delete(waitlistId)`, `signup.count({ where: { waitlistId } })` === 0 (cascade purge verified, not assumed). |

**Test DB setup:** point Prisma at a throwaway SQLite file (or `:memory:`) in test setup; run `prisma db push`/migrate-deploy in a `beforeAll`, truncate/reset between cases. Keep this in the test file or a `__tests__/helpers/` setup so it does not touch prod config.

`qa-senior` owns authoring these + runs `/verify` + the suite. Must pass before DoD.

---

## 5. Edge cases

| # | Case | Handling |
| :-- | :--- | :------- |
| E1 | Slug race: two concurrent POSTs, same slug | Pre-check is insufficient. Catch Prisma **P2002** (unique constraint) in POST and PUT → **409** (REQ-2 / PAGE-2). This is the authoritative guard. |
| E2 | `auth().userId` null inside the handler past middleware | Shouldn't happen, but **belt-and-suspenders 401 JSON in every handler** (REQ-7 / AUTH-1). Never proceed with `userId === null`. |
| E3 | `themeJson` (Json in SQLite) | Prisma maps Json→TEXT in SQLite; read-back is a deserialized object. **Validate on write (present), read as-is.** Do not double-stringify. |
| E4 | Slug regex anchoring | Must be `.regex(/^[a-z0-9-]+$/).max(64)` — **anchored**. An unanchored `/[a-z0-9-]+/` would pass `"Bad Slug!"` (matches the `ad` substring). Covered by `test-PAGE-2-format` regression case. |
| E5 | DELETE success body | **204, no body.** Returning JSON on delete violates REQ-6 shape. |
| E6 | 403 vs 404 on PUT/DELETE for non-existent **or** non-owned id | **Always 403.** Prevents existence enumeration. Never 404 for owned-id-not-found on mutating paths (PRD rabbit hole — resolved). |
| E7 | Client sets `userId`/`id`/owner in body | Not in the Zod schema; server injects `userId` from `auth()`. Stripped (AUTH-2). |
| E8 | `customDomain` / plan-gated fields (BILL-3) | Out of WAIT-1 scope — accept + persist the column; **do not** implement plan enforcement here (that's the `billing` module). Flag to reviewers so it isn't mistaken for a gap. |

---

## 6. Risks + rollback

**§5 safety surface (mandatory `safety-reviewer` veto gate):**
- New **AUTH-2** ownership predicates on PUT/DELETE — a missed predicate = cross-account read/write. `safety-reviewer` must confirm the predicate runs before every mutation and that 403 is uniform (anti-enumeration).
- **DATA-3** cascade purge — DELETE permanently removes subscriber PII (Signups). `safety-reviewer` must confirm the cascade is intentional, scoped to the owner's waitlist only, and that no non-owner can trigger it (gated by the same predicate). DELETE is the only irreversible operation in this change — and it is intentional per PRD/DATA-3.
- Sign-off recorded before merge; this is a veto gate, not advisory.

**Risks:**
- **No migration risk** — schema is in place from FOUND-3; this change adds no columns/tables/indexes and runs no destructive migration.
- **Authz regression risk** — the central risk. Mitigated by the extracted `authorize()` helper + `test-AUTH-2` + `safety-reviewer` veto.
- **PII-loss risk** — cascade DELETE; mitigated by the ownership gate + `test-DATA-3` proving scope.
- **Slug-collision race** — mitigated by P2002→409 (E1).

**Rollback:**
- The only new *persistent* state is `Waitlist` rows (and their cascaded `Signup` children). Deleting the new files — `lib/db/waitlists.ts`, `app/api/waitlists/route.ts`, `app/api/waitlists/[id]/route.ts`, the three `app/(dashboard)/waitlists/**` pages, and `__tests__/page-builder.rules.test.ts` — reverts the surface to a no-op. No schema change to roll back.
- No irreversible data operation other than `DELETE` (intentional per PRD/DATA-3). No flag to flip, no deploy state to unwind.

---

## 7. Gate sequence (Definition of Done — profile §8)

```
implement (be: lib/db + routes + contracts; fe: 3 dashboard pages)
  → reviewer loop (be-reviewer / fe-reviewer) until no high/critical
  → safety-reviewer veto gate (AUTH-2 predicate + DATA-3 cascade)   [§5 — non-skippable]
  → qa-senior: page-builder.rules.test.ts named to rule IDs + /verify + run
  → DoD checklist
  → human role-owner approves + merges
```

- [ ] No feature flag (MVP core CRUD — ships directly per ticket)
- [ ] Unit/rule tests pass, named to Product-Rule IDs (`test-PAGE-2-*`, `test-AUTH-1`, `test-AUTH-2`, `test-DATA-3`)
- [ ] E2E journey green for the PII/auth surface — Playwright deferred (FOUND-E2E); note in test header
- [ ] **Safety sign-off recorded** (PII via DATA-3 + auth via AUTH-2 surface touched)
- [ ] Prisma migration reviewed by db-architect — **N/A, no migration** (schema FOUND-3)
- [ ] No raw SQL bypassing Prisma ORM — repo layer is the only `prisma.*` call site
- [ ] Stripe webhook signature — N/A (no billing surface in WAIT-1)
- [ ] Module boundary held: all `prisma.waitlist.*` in `lib/db/waitlists.ts`; no business logic in `app/(dashboard)/**`; Zod contracts co-located, FE imports inferred types
```
