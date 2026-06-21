import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { findWaitlistByIdForOwner } from '@/lib/db/waitlists'
import WaitlistForm from '../../waitlist-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditWaitlistPage({ params }: Props) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { id } = await params

  // Server-side ownership check before rendering — non-owner sees notFound (no data leak)
  const waitlist = await findWaitlistByIdForOwner(id, clerkId)
  if (!waitlist) notFound()

  const themeJson = waitlist.themeJson as { preset: 'light' | 'dark' | 'brand' }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/waitlists" className="text-sm text-muted-foreground hover:underline">
          ← Waitlists
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-8">Edit waitlist</h1>
      <WaitlistForm
        waitlistId={id}
        defaultValues={{
          name: waitlist.name,
          slug: waitlist.slug,
          headline: waitlist.headline,
          subheadline: waitlist.subheadline ?? '',
          logoUrl: waitlist.logoUrl ?? '',
          preset: themeJson.preset,
        }}
      />
    </main>
  )
}
