import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { findWaitlists } from '@/lib/db/waitlists'
import { Button } from '@/components/ui/button'
import WaitlistActions from './waitlist-actions'

export default async function WaitlistsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const waitlists = await findWaitlists(clerkId)

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Waitlists</h1>
        <Button asChild>
          <Link href="/waitlists/new">Create waitlist</Link>
        </Button>
      </div>

      {waitlists.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">You don&apos;t have any waitlists yet.</p>
          <Button asChild>
            <Link href="/waitlists/new">Create your first waitlist</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {waitlists.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-muted-foreground">/{w.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/waitlists/${w.id}/edit`}>Edit</Link>
                </Button>
                <WaitlistActions id={w.id} name={w.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
