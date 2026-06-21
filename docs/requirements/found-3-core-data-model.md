# Requirements — FOUND-3: Core data model + Prisma schema migrations

**Source:** ticket FOUND-3 draft REQ + resolved open questions (2026-06-21)
**PRD:** `docs/prd/core-data-model.md`
**Rules in scope:** REF-1 · ANTI-2 · PAGE-2 · DATA-3

---

## REQ-1 — User table

**Statement:** `User` table with fields: `id` (cuid PK), `clerkId` (String, unique), `email` (String, local Clerk mirror), `name` (String), `plan` (enum Plan `FREE|STARTER|PRO`, default `FREE`), `stripeCustomerId` (String, nullable), `createdAt` (DateTime, default `now()`).

**Acceptance:** `prisma migrate dev` applies cleanly; schema introspection shows `User` with unique constraint on `clerkId`; `plan` default is `FREE`.

**Source:** ticket draft REQ-1 + resolved Q: User.plan default = FREE.

---

## REQ-2 — Waitlist table

**Statement:** `Waitlist` table with fields: `id` (cuid PK), `userId` (FK→User), `name` (String), `slug` (String, globally unique — PAGE-2), `customDomain` (String, nullable), `themeJson` (Prisma `Json`), `headline` (String), `subheadline` (String, nullable), `logoUrl` (String, nullable), `rewardsJson` (Json, nullable), `createdAt` (DateTime, default `now()`).

**Acceptance:** Migration applies; unique index on `slug` present; `userId` FK to `User` enforced; `themeJson` typed as Prisma `Json` (not String).

**Source:** ticket draft REQ-2 + resolved Q: themeJson/rewardsJson = Prisma Json type.

---

## REQ-3 — Signup table

**Statement:** `Signup` table with fields: `id` (cuid PK), `waitlistId` (FK→Waitlist, `onDelete: Cascade` — DATA-3), `email` (String), `verified` (Boolean, default false), `referralCode` (String, unique — REF-1), `referredBy` (self-FK to Signup, nullable), `position` (Int, not null — column shape; count+1 logic in referral-engine ticket), `referralCount` (Int, default 0), `source` (String, nullable), `createdAt` (DateTime, default `now()`). Composite unique: `@@unique([waitlistId, email])` (ANTI-2).

**Acceptance:** Migration applies; `referralCode @unique` (REF-1); `@@unique([waitlistId, email])` (ANTI-2); `waitlistId` FK `onDelete: Cascade` (DATA-3); `position` non-null Int.

**Source:** ticket draft REQ-3 + resolved Qs: position = column shape only; DATA-3 = Cascade; Signup is the only child table for MVP.

---

## REQ-4 — Append-only migrations

**Statement:** All migrations generated for this ticket are append-only — no `DROP TABLE` or `DROP COLUMN` statements.

**Acceptance:** Generated migration SQL contains no `DROP TABLE` / `DROP COLUMN` statements (grep-verifiable); db-architect review recorded as a hard merge gate.

**Source:** ticket draft REQ-4 + profile §8 (DoD: db-architect review required).
