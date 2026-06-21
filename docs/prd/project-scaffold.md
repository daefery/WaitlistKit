---
feature: project-scaffold
ticket: FOUND-1
status: approved
prd_type: light (scaffold — no rules, no §5)
authored: 2026-06-21
---

# FOUND-1 — Project scaffold: Next.js 15 + Prisma + shadcn/Tailwind + SQLite

## Problem

The repository is empty. No developer can clone and run the app. Every subsequent ticket (auth, waitlist pages, referral engine, dashboard) depends on a working Next.js 15 foundation with Prisma and shadcn/ui wired up.

## REQ-N

| REQ   | Statement | Acceptance criteria | Metric |
| :---- | :-------- | :------------------ | :----- |
| REQ-1 | `pnpm install && pnpm dev` succeeds on a fresh clone | App serves `http://localhost:3000` with no console errors or build failures | n/a |
| REQ-2 | `pnpm prisma migrate dev` runs and creates the SQLite database file | No error output; `prisma/dev.db` exists on disk after the command completes | n/a |
| REQ-3 | A shadcn/ui Button component renders on the index page | Button is visually present at `http://localhost:3000` in dev mode | n/a |

## Solution shape (decided)

- **Layout:** single-package — one `package.json` at root, no `pnpm-workspace.yaml`
- **Runtime:** Node 20 LTS; pinned via `engines.node: ">=20"` in `package.json` + `.nvmrc`
- **pnpm:** pinned at `9.x` via `packageManager` field (corepack-compatible)
- **TypeScript:** `strict: true` (Next.js scaffold default)
- **Prisma schema:** stub only — `datasource db` (provider `sqlite`, url `file:./dev.db`) + `generator client`; no models (FOUND-3 adds tables)
- **shadcn/ui:** initialized with `components.json`; Button component added as the REQ-3 smoke-test artifact

## Non-goals & rabbit holes

- No data models in `prisma/schema.prisma` — that is FOUND-3's job
- No auth or Clerk setup — FOUND-2
- No Vercel/production deployment config — a later ticket
- No monorepo (`apps/*`, `packages/*`) split — single package for MVP; restructure when warranted
- No CI/GitHub Actions — a later ticket

## §5 safety surface

NO — pure toolchain setup; no user data, no PII, no auth, no payments, no AI.

## Definition of Done

- [ ] `pnpm install` completes without errors on a fresh clone (REQ-1 precondition)
- [ ] `pnpm dev` serves `http://localhost:3000` with no errors (REQ-1)
- [ ] `pnpm prisma migrate dev` produces `prisma/dev.db` with no errors (REQ-2)
- [ ] shadcn/ui Button is visible at `http://localhost:3000` in dev (REQ-3)
- [ ] `tsconfig.json` has `"strict": true`
- [ ] `package.json` has `packageManager: "pnpm@9.x.x"` and `"engines": { "node": ">=20" }`
- [ ] `prisma/dev.db` is listed in `.gitignore`
- [ ] `pnpm tsc --noEmit` exits 0
