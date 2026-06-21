/**
 * Schema rule-tests for FOUND-3: Core data model + Prisma schema migrations
 *
 * Each describe block is named to a Product-Rule ID per the DoD convention.
 * Tests use an isolated SQLite test database spun up via `prisma db push`
 * in beforeAll and destroyed in afterAll — the dev.db is never touched.
 *
 * Rules covered: REF-1 · ANTI-2 · PAGE-2 · DATA-3 · REQ-4
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

const ROOT = process.cwd()
const TEST_DB_PATH = join(ROOT, 'test-schema-rules.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
})

// Apply committed migration files to a fresh test DB before any test runs.
// Delete the test DB file first (manual reset), then `migrate deploy` applies
// the migration SQL from prisma/migrations/ — the same path used in production.
beforeAll(async () => {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix
    if (existsSync(p)) unlinkSync(p)
  }
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: ROOT,
    stdio: 'pipe',
  })
  await prisma.$connect()
}, 30_000)

afterAll(async () => {
  await prisma.$disconnect()
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH)
})

// ── helpers ──────────────────────────────────────────────────────────────────

let seq = 0
function uid() {
  return `test-${++seq}-${Date.now()}`
}

async function makeUser() {
  return prisma.user.create({
    data: { clerkId: uid(), email: 'user@test.com', name: 'Tester' },
  })
}

async function makeWaitlist(userId: string, slug?: string) {
  return prisma.waitlist.create({
    data: {
      userId,
      name: 'Test Waitlist',
      slug: slug ?? uid(),
      themeJson: { color: '#000' },
      headline: 'Join us',
    },
  })
}

async function makeSignup(waitlistId: string, email: string, code: string, pos = 1) {
  return prisma.signup.create({
    data: { waitlistId, email, referralCode: code, position: pos },
  })
}

// ── test-REF-1 ───────────────────────────────────────────────────────────────
// REF-1: Every signup receives exactly one unique referral code.
// The DB enforces this via `Signup.referralCode @unique`.

describe('test-REF-1 — referralCode is unique across all signups', () => {
  it('creates a signup with a unique referralCode', async () => {
    const user = await makeUser()
    const waitlist = await makeWaitlist(user.id)
    const signup = await makeSignup(waitlist.id, 'a@test.com', uid())
    expect(signup.referralCode).toBeTruthy()
  })

  it('rejects a second signup with a duplicate referralCode', async () => {
    const user = await makeUser()
    const waitlist = await makeWaitlist(user.id)
    const code = `DUPCODE-${uid()}`
    await makeSignup(waitlist.id, 'x@test.com', code)
    // Same code on a different email — must be rejected at the DB level.
    await expect(makeSignup(waitlist.id, 'y@test.com', code)).rejects.toThrow()
  })

  it('rejects a duplicate referralCode even across different waitlists', async () => {
    const user = await makeUser()
    const w1 = await makeWaitlist(user.id)
    const w2 = await makeWaitlist(user.id)
    const code = `CROSSWL-${uid()}`
    await makeSignup(w1.id, 'p@test.com', code)
    await expect(makeSignup(w2.id, 'q@test.com', code)).rejects.toThrow()
  })
})

// ── test-ANTI-2 ──────────────────────────────────────────────────────────────
// ANTI-2: Duplicate email submissions to the same waitlist are rejected.
// Enforced by `@@unique([waitlistId, email])` on Signup.

describe('test-ANTI-2 — duplicate email per waitlist is rejected', () => {
  it('rejects the same email joining the same waitlist twice', async () => {
    const user = await makeUser()
    const waitlist = await makeWaitlist(user.id)
    await makeSignup(waitlist.id, 'dup@test.com', uid())
    // Same waitlist + same email → composite unique violation.
    await expect(makeSignup(waitlist.id, 'dup@test.com', uid())).rejects.toThrow()
  })

  it('allows the same email to join different waitlists', async () => {
    const user = await makeUser()
    const w1 = await makeWaitlist(user.id)
    const w2 = await makeWaitlist(user.id)
    await makeSignup(w1.id, 'multi@test.com', uid())
    const s2 = await makeSignup(w2.id, 'multi@test.com', uid())
    expect(s2.id).toBeTruthy()
  })
})

// ── test-PAGE-2 ───────────────────────────────────────────────────────────────
// PAGE-2: Waitlist slug must be globally unique.
// Enforced by `Waitlist.slug @unique`.

describe('test-PAGE-2 — waitlist slug is globally unique', () => {
  it('creates a waitlist with a unique slug', async () => {
    const user = await makeUser()
    const wl = await makeWaitlist(user.id, `my-product-${uid()}`)
    expect(wl.slug).toBeTruthy()
  })

  it('rejects a second waitlist with the same slug', async () => {
    const user = await makeUser()
    const slug = `same-slug-${uid()}`
    await makeWaitlist(user.id, slug)
    await expect(makeWaitlist(user.id, slug)).rejects.toThrow()
  })

  it('allows the same slug owner to reuse a slug on a different user (slug is global, not per-user)', async () => {
    const u1 = await makeUser()
    const u2 = await makeUser()
    const slug = `global-slug-${uid()}`
    await makeWaitlist(u1.id, slug)
    // Different user, same slug — still must be rejected (slug is globally unique).
    await expect(makeWaitlist(u2.id, slug)).rejects.toThrow()
  })
})

// ── test-DATA-3 ───────────────────────────────────────────────────────────────
// DATA-3: All subscriber data is purged on waitlist deletion.
// Enforced by `onDelete: Cascade` on Signup.waitlistId FK.

describe('test-DATA-3 — signups are hard-deleted when their waitlist is deleted', () => {
  it('deletes all signups when the parent waitlist is deleted', async () => {
    const user = await makeUser()
    const waitlist = await makeWaitlist(user.id)
    const s1 = await makeSignup(waitlist.id, 'c1@test.com', uid(), 1)
    const s2 = await makeSignup(waitlist.id, 'c2@test.com', uid(), 2)

    await prisma.waitlist.delete({ where: { id: waitlist.id } })

    const found1 = await prisma.signup.findUnique({ where: { id: s1.id } })
    const found2 = await prisma.signup.findUnique({ where: { id: s2.id } })
    expect(found1).toBeNull()
    expect(found2).toBeNull()
  })

  it('does not delete signups when a different waitlist is deleted', async () => {
    const user = await makeUser()
    const w1 = await makeWaitlist(user.id)
    const w2 = await makeWaitlist(user.id)
    const s = await makeSignup(w1.id, 'keep@test.com', uid(), 1)

    await prisma.waitlist.delete({ where: { id: w2.id } })

    const still = await prisma.signup.findUnique({ where: { id: s.id } })
    expect(still).not.toBeNull()
  })
})

// ── test-REQ-4 ────────────────────────────────────────────────────────────────
// REQ-4: All migrations are append-only (no DROP TABLE / DROP COLUMN).
// Verified by inspecting the generated SQL files.

describe('test-REQ-4 — migration SQL is append-only', () => {
  it('contains no DROP TABLE statements', () => {
    const migrationsDir = join(ROOT, 'prisma', 'migrations')
    const sqlFiles = readdirSync(migrationsDir, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith('migration.sql'))

    expect(sqlFiles.length).toBeGreaterThan(0)

    for (const f of sqlFiles) {
      const sql = readFileSync(join(migrationsDir, f), 'utf-8')
      expect(sql, `${f} contains DROP TABLE`).not.toMatch(/DROP\s+TABLE/i)
    }
  })

  it('contains no DROP COLUMN statements', () => {
    const migrationsDir = join(ROOT, 'prisma', 'migrations')
    const sqlFiles = readdirSync(migrationsDir, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith('migration.sql'))

    for (const f of sqlFiles) {
      const sql = readFileSync(join(migrationsDir, f), 'utf-8')
      expect(sql, `${f} contains DROP COLUMN`).not.toMatch(/DROP\s+COLUMN/i)
    }
  })
})
