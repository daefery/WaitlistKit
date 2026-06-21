'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = { id: string; name: string }

export default function WaitlistActions({ id, name }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This will permanently remove all subscribers.`)) return
    setPending(true)
    const res = await fetch(`/api/waitlists/${id}`, { method: 'DELETE' })
    setPending(false)
    if (res.ok) {
      router.refresh()
    } else {
      alert('Failed to delete waitlist. Please try again.')
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
