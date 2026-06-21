import Link from 'next/link'
import { Button } from '@/components/ui/button'
import WaitlistForm from '../waitlist-form'

export default function NewWaitlistPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/waitlists" className="text-sm text-muted-foreground hover:underline">
          ← Waitlists
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-8">Create waitlist</h1>
      <WaitlistForm />
    </main>
  )
}
