import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { CreateWaitlistSchema } from '../route'
import { findWaitlistByIdForOwner, updateWaitlist, deleteWaitlist } from '@/lib/db/waitlists'
import { isPrismaUniqueError, isPrismaNotFoundError } from '@/lib/db/errors'

// Fix 2: .refine guards against empty-body no-op (REQ-4 correctness)
const UpdateWaitlistSchema = CreateWaitlistSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one field must be provided' },
)

type RouteContext = { params: Promise<{ id: string }> }

// REQ-4 / AUTH-2: update; ownership predicate before mutation
export async function PUT(req: Request, ctx: RouteContext) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  // AUTH-2 + anti-enumeration: 403 for both not-found and wrong-owner (never 404 on mutating paths)
  const waitlist = await findWaitlistByIdForOwner(id, clerkId)
  if (!waitlist) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateWaitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const updated = await updateWaitlist(id, parsed.data)
    return NextResponse.json(updated)
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 })
    }
    // Fix 4: TOCTOU — row deleted between ownership check and update → 403 (anti-enumeration)
    if (isPrismaNotFoundError(err)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    throw err
  }
}

// REQ-6 / AUTH-2 + DATA-3: delete with cascade; ownership predicate before delete
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params

  // AUTH-2 + anti-enumeration: 403 for both not-found and wrong-owner
  const waitlist = await findWaitlistByIdForOwner(id, clerkId)
  if (!waitlist) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // DATA-3: Prisma onDelete: Cascade on Signup.waitlistId purges all child Signup rows
    await deleteWaitlist(id)
  } catch (err: unknown) {
    // Fix 3: TOCTOU — row deleted between ownership check and delete → 204 (idempotent outcome)
    if (isPrismaNotFoundError(err)) {
      return new Response(null, { status: 204 })
    }
    throw err
  }

  // REQ-6: 204 no body
  return new Response(null, { status: 204 })
}
