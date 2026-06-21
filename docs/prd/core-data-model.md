# PRD: core-data-model

**Ticket:** FOUND-3 · **Epic:** Foundations (phase 0) · **Discipline:** BE only (Prisma schema + migrations) · **Modules:** referral-engine, page-builder, billing · **Depends on:** FOUND-1 (done)

## 1. TL;DR

Define the three foundational Prisma models — `User` (founders), `Waitlist`, `Signup` — plus the relations, defaults, and constraints that encode the product's invariants at the database layer. This is a pure schema + append-only migration ticket: no API routes, no FE, no flags. It unblocks every downstream waitlist, referral, and billing slice by giving them a typed, constraint-enforced data spine to build against.

## 2. Problem & Evidence

Downstream tickets (referral-engine, page-builder, billing, anti-fraud) cannot be built or tested without a stable data model. Without DB-level constraints, rules like "unique referral code" or "no duplicate email per waitlist" become application-only conventions that any future code path can silently violate.

| claim | source | tag |
| :---- | :----- | :-- |
| FOUND-1 scaffold exists with `prisma/schema.prisma` holding datasource + generator only | FOUND-1 ticket (done) | validated |
| REF-1 / ANTI-2 / PAGE-2 / DATA-3 each map naturally to a DB constraint (unique / composite-unique / cascade) | profile §4 + REQ-1..3 | validated |
| `Signup` is the only PII-bearing child table in MVP scope, so DATA-3 purge reduces to one cascade relation | resolved open questions | validated |
| Enforcing invariants in schema (not app code) prevents silent violations as new write paths are added | standard data-modeling practice | assumed |

## 3. Primary job (JTBD)

When I'm about to build the waitlist, referral, and billing features, I want a typed data model whose constraints encode the product's invariants, so I can implement against a stable spine without re-deriving (or accidentally breaking) the core rules in every slice.

Related jobs:
- As the db-architect, I want migrations to be append-only so production data is never at risk from a foundation change.
- As qa-senior, I want each invariant expressed as a named DB constraint so I can name a rule-test against it.

## 4. Desired outcomes

- **Maximize constraint coverage of the four in-scope Product Rules** when the migration is applied — target: 4/4 rules (REF-1, ANTI-2, PAGE-2, DATA-3) backed by a DB constraint, measured by schema introspection / generated SQL inspection.
- **Minimize migration risk** when this ships to a Postgres environment — target: 0 destructive DDL statements (`DROP TABLE` / `DROP COLUMN`) in generated migration SQL, measured by grep over the migration file + db-architect review.
- **Maximize downstream build-readiness** for the referral/page/billing slices — target: all three models present with relations resolvable, measured by `prisma migrate dev` applying cleanly and `prisma generate` producing a typed client.

Each links to the §3 job and is satisfied by ≥1 acceptance criterion in §8.

## 5. Product Rules & Safety in scope

| Rule | Where it's satisfied |
| :--- | :------------------- |
| **REF-1** — every signup gets exactly one unique referral code | `Signup.referralCode` `String @unique` (Slice C / AC-5) |
| **ANTI-2** — duplicate email per waitlist rejected (409) | `@@unique([waitlistId, email])` on `Signup` — the DB constraint the future API route maps a 409 to (Slice C / AC-6) |
| **PAGE-2** — slug globally unique (409 on conflict) | `Waitlist.slug` `String @unique` (Slice B / AC-3) |
| **DATA-3** — all subscriber data purged on waitlist deletion | `Signup.waitlistId` FK `onDelete: Cascade` (Slice C / AC-7) |

**§5 SAFETY SURFACE: NO.** Schema definition only — no email-capture form, opt-in flow, Resend integration, Stripe webhook, or Clerk auth predicate is touched. The PII safety gate fires in the future ticket that builds the API route writing `Signup.email`. `safety-reviewed` tag not required here. (db-architect review remains a hard gate — see DoD.)

## 6. Appetite

~1 build iteration. Pure schema + one generated migration; no runtime logic. If it does not fit one iteration, the model has been over-scoped — cut to the three tables above, not more.

## 7. Vertical slices

Each slice is an additive set of model definitions in `prisma/schema.prisma` plus the one append-only migration they produce. Forward-deps only; ≤2 modules each.

- **Slice A — `User` model.** The founder account, mirroring Clerk identity + plan/billing handles. Modules: billing. Depends on: none.
- **Slice B — `Waitlist` model + `User`→`Waitlist` relation.** The hosted page entity, slug-unique. Modules: page-builder. Depends on: Slice A.
- **Slice C — `Signup` model + relations + cascade.** The subscriber row carrying the referral + anti-fraud + purge constraints, including the self-relation for `referredBy`. Modules: referral-engine, anti-fraud. Depends on: Slice B.

Migration is generated once over the assembled schema (append-only, REQ-4). The PRD stops at these slices — file-level decomposition and the exact `prisma migrate` invocation are tech-lead/implement's call.

## 8. Acceptance criteria

- **AC-1 (Slice A → Outcome 3):** `prisma migrate dev` applies cleanly; introspection shows `User` with `clerkId` `String @unique` and `email`, `name` present.
- **AC-2 (Slice A → Outcome 1):** Prisma schema declares enum `Plan { FREE STARTER PRO }` with `@default(FREE)` on `User.plan`; `stripeCustomerId` is nullable; `createdAt` defaults to `now()`. (SQLite emulates enums — the Prisma-level declaration is the verifiable contract; DB-native enum enforcement applies post-Supabase swap.)
- **AC-3 (Slice B → PAGE-2):** `Waitlist.slug` carries a unique index — a second row with the same slug is rejected at the DB level.
- **AC-4 (Slice B → Outcome 3):** `Waitlist.userId` is a FK to `User`; `themeJson` is Prisma `Json` (not `String`); `customDomain`, `subheadline`, `logoUrl`, `rewardsJson` are nullable; `rewardsJson` is `Json?`.
- **AC-5 (Slice C → REF-1):** `Signup.referralCode` carries a unique constraint — no two signups can share a code.
- **AC-6 (Slice C → ANTI-2):** `@@unique([waitlistId, email])` is present on `Signup` — the same email cannot appear twice on one waitlist.
- **AC-7 (Slice C → DATA-3):** `Signup.waitlistId` FK declares `onDelete: Cascade` — deleting a `Waitlist` hard-deletes its `Signup` rows.
- **AC-8a (Slice C → Outcome 3):** `Signup.referredBy` is a nullable self-relation FK to `Signup`; `position` is a non-null `Int` (column shape only — insert-time count+1 logic is referral-engine's test).
- **AC-8b (Slice C → Outcome 3):** `Signup.referralCount` defaults to `0`; `Signup.verified` defaults to `false`; `Signup.source` is a nullable `String`.
- **AC-9 (all slices → Outcome 2):** the generated migration SQL contains no `DROP TABLE` / `DROP COLUMN` statements (grep-verifiable); db-architect review recorded.

## 9. Non-goals & rabbit holes

Non-goals (explicitly out of scope):
- Insert-time `position` assignment logic — the schema asserts the column shape only; the count+1 computation and its rule-test (REF-3) live in the referral-engine ticket.
- The Clerk webhook that syncs `User.email` — future email/auth ticket. `User.email` is a local mirror here.
- Application-layer plan gating (BILL-3 custom-domain gate, signup-count caps) — enforced by API routes, not DB constraints; schema only stores `customDomain` / `plan`.

Rabbit holes (declared out-of-bounds up front):
- Do not add an enum for `Signup.source` — free-text `String` for MVP.
- Do not build custom-domain DNS validation — billing ticket.
- Do not introduce soft-delete / recovery grace period — hard cascade is the chosen design for DATA-3.
- Do not pre-add indexes/columns for unbuilt features (analytics rollups, etc.) — additive migrations come with their owning ticket.

## 10. Data & contracts

Bounded contexts touched: referral-engine, page-builder, billing (+ anti-fraud constraint). Models declared in `prisma/schema.prisma`; the typed Prisma client is the FE↔BE contract seam for downstream slices. Model shapes at the constraint level (not full field-by-field DDL — that's the migration):

- **`User`** — `id` cuid PK · `clerkId` `@unique` · `email` · `name` · `plan` enum `Plan{FREE|STARTER|PRO}` default `FREE` · `stripeCustomerId?` · `createdAt` default `now()` · has-many `Waitlist`.
- **`Waitlist`** — `id` cuid PK · `userId` FK→`User` · `name` · `slug` `@unique` (PAGE-2) · `customDomain?` · `themeJson` `Json` · `headline` · `subheadline?` · `logoUrl?` · `rewardsJson? Json` · `createdAt` default `now()` · has-many `Signup`.
- **`Signup`** — `id` cuid PK · `waitlistId` FK→`Waitlist` `onDelete: Cascade` (DATA-3) · `email` · `verified Boolean` default `false` · `referralCode` `@unique` (REF-1) · `referredBy?` self-FK→`Signup` · `position Int` (non-null) · `referralCount Int` default `0` · `source?` · `createdAt` default `now()` · `@@unique([waitlistId, email])` (ANTI-2).

Provider note: SQLite for MVP/local; `Json` and enum types are written for Prisma-portable behavior so the Postgres provider swap (Supabase) carries the same constraints. Migrations are append-only (REQ-4).

## 11. Definition of Done

Per profile §8, the applicable gates for this ticket:
- [ ] Unit/rule tests pass where applicable, named to Product-Rule IDs (constraint-backed; e.g. a `test-ANTI-2` / `test-REF-1` exercising the unique/composite-unique rejection once a write path exists — schema correctness here is verified by introspection + migration apply).
- [ ] **Prisma migration reviewed by db-architect — append-only, no destructive column/table drops (hard gate, blocks merge).**
- [ ] No raw SQL bypassing Prisma ORM.
- [ ] Feature flag — n/a (foundation schema, no runtime ramp).
- [ ] E2E — n/a (no PII or billing write surface in this ticket; gate fires on the future API-route ticket).
- [ ] Safety sign-off — n/a (§5 surface NO).

PM approval requested before tech-lead decomposes Slices A–C into the schema edit + migration tasks.
