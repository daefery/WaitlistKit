import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertUser } from '@/lib/db/users'
import { createWaitlist, findWaitlists } from '@/lib/db/waitlists'
import { isPrismaUniqueError } from '@/lib/db/errors'

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'must be lowercase letters, digits, or hyphens')

export const CreateWaitlistSchema = z.object({
  name: z.string().min(1),
  slug: slugSchema,
  headline: z.string().min(1),
  subheadline: z.string().optional(),
  logoUrl: z.string().url().optional(),
  themeJson: z.object({ preset: z.enum(['light', 'dark', 'brand']) }),
})

export type CreateWaitlistInput = z.infer<typeof CreateWaitlistSchema>

// REQ-1, REQ-2, REQ-3 — AUTH-2: userId sourced from auth() only, never from body
export async function POST(req: Request) {
  // REQ-7 / AUTH-1: belt-and-suspenders (middleware already gates, but never trust null userId)
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // REQ-3 / PAGE-2: Zod validation (anchored slug regex)
  const parsed = CreateWaitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Ensure User row exists for this Clerk identity (upsert is idempotent)
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim()
  const user = await upsertUser(clerkId, email, name)

  try {
    // REQ-1: create waitlist; userId from auth, never from body (AUTH-2)
    const waitlist = await createWaitlist(user.id, parsed.data)
    return NextResponse.json({ id: waitlist.id, slug: waitlist.slug }, { status: 201 })
  } catch (err: unknown) {
    // REQ-2 / PAGE-2: unique slug constraint (P2002) — authoritative race guard
    if (isPrismaUniqueError(err)) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 })
    }
    throw err
  }
}

// REQ-5 / AUTH-2: list scoped to authenticated founder only, query-level filter
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const waitlists = await findWaitlists(clerkId)
  return NextResponse.json(waitlists)
}
