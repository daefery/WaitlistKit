import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export type WaitlistCreateData = {
  name: string
  slug: string
  headline: string
  subheadline?: string
  logoUrl?: string
  themeJson: Prisma.InputJsonValue
}

export type WaitlistUpdateData = Partial<WaitlistCreateData>

// AUTH-2: ownership predicate helper — pure, testable.
// internalUserId must be the Prisma User.id (CUID), NOT the Clerk userId/clerkId.
// Production routes use findWaitlistByIdForOwner() (DB-join guard); this helper
// is for unit-testing the ownership comparison logic in isolation.
export function authorize(
  row: { userId: string } | null,
  internalUserId: string,
): 'ok' | 'forbidden' {
  if (!row || row.userId !== internalUserId) return 'forbidden'
  return 'ok'
}

// AUTH-2: query-level scope — never fetch-all-then-filter.
export async function findWaitlists(clerkId: string) {
  return prisma.waitlist.findMany({
    where: { user: { clerkId } },
    orderBy: { createdAt: 'desc' },
  })
}

// Returns full row (including userId) so the handler can run authorize().
export async function findWaitlistById(id: string) {
  return prisma.waitlist.findUnique({ where: { id } })
}

// Convenience: fetch + ownership check in one query (anti-enumeration).
// Returns null for both not-found and wrong-owner → caller returns 403 uniformly.
export async function findWaitlistByIdForOwner(id: string, clerkId: string) {
  return prisma.waitlist.findFirst({
    where: { id, user: { clerkId } },
  })
}

// userId = internal User.id (CUID), injected by the handler from auth, never from body.
export async function createWaitlist(userId: string, data: WaitlistCreateData) {
  return prisma.waitlist.create({ data: { ...data, userId } })
}

// Slug change on update also subject to P2002 → 409 (PAGE-2 holds on update too).
export async function updateWaitlist(id: string, data: WaitlistUpdateData) {
  return prisma.waitlist.update({ where: { id }, data })
}

// DATA-3: relies on Prisma onDelete: Cascade on Signup.waitlistId — no manual child delete.
export async function deleteWaitlist(id: string) {
  return prisma.waitlist.delete({ where: { id } })
}
