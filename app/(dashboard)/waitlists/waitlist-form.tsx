'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Preset = 'light' | 'dark' | 'brand'

type DefaultValues = {
  name?: string
  slug?: string
  headline?: string
  subheadline?: string
  logoUrl?: string
  preset?: Preset
}

type Props = {
  waitlistId?: string
  defaultValues?: DefaultValues
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

export default function WaitlistForm({ waitlistId, defaultValues = {} }: Props) {
  const router = useRouter()
  const isEdit = Boolean(waitlistId)

  const [name, setName] = useState(defaultValues.name ?? '')
  const [slug, setSlug] = useState(defaultValues.slug ?? '')
  const [headline, setHeadline] = useState(defaultValues.headline ?? '')
  const [subheadline, setSubheadline] = useState(defaultValues.subheadline ?? '')
  const [logoUrl, setLogoUrl] = useState(defaultValues.logoUrl ?? '')
  const [preset, setPreset] = useState<Preset>(defaultValues.preset ?? 'light')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function validateSlug(value: string): string | undefined {
    if (!value) return 'Slug is required'
    if (value.length > 64) return 'Slug must be 64 characters or fewer'
    if (!SLUG_PATTERN.test(value)) return 'Slug must be lowercase letters, digits, or hyphens only'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isEdit) {
      const slugError = validateSlug(slug)
      if (slugError) {
        setErrors({ slug: slugError })
        return
      }
    }

    setErrors({})
    setSubmitting(true)

    const body = {
      name,
      ...(!isEdit ? { slug } : {}),
      headline,
      ...(subheadline ? { subheadline } : {}),
      ...(logoUrl ? { logoUrl } : {}),
      themeJson: { preset },
    }

    const url = isEdit ? `/api/waitlists/${waitlistId}` : '/api/waitlists'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSubmitting(false)

    if (res.status === 409) {
      // On edit, slug is immutable — 409 cannot be attributed to the slug field
      setErrors(isEdit
        ? { form: 'A conflict occurred. Please try again.' }
        : { slug: 'This slug is already taken. Choose a different one.' })
      return
    }

    if (res.status === 400) {
      let data: unknown
      try {
        data = await res.json()
      } catch {
        setErrors({ form: 'Invalid input. Please check your fields.' })
        return
      }
      const issues = (data as { error?: Array<{ path: (string | number)[]; message: string }> }).error
      if (Array.isArray(issues) && issues.length > 0) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of issues) {
          const field = String(issue.path[0] ?? '')
          if (field && !fieldErrors[field]) fieldErrors[field] = issue.message
        }
        setErrors(Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { form: issues[0].message ?? 'Invalid input' })
      } else {
        setErrors({ form: 'Invalid input. Please check your fields.' })
      }
      return
    }

    if (!res.ok) {
      setErrors({ form: 'Something went wrong. Please try again.' })
      return
    }

    router.push('/waitlists')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My product launch"
          required
        />
        {errors.name && (
          <p role="alert" className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="my-product-launch"
          pattern="[a-z0-9-]+"
          maxLength={64}
          required={!isEdit}
          disabled={isEdit}
          aria-describedby={errors.slug ? 'slug-error' : undefined}
        />
        {errors.slug && (
          <p id="slug-error" role="alert" className="text-sm text-destructive">
            {errors.slug}
          </p>
        )}
        {isEdit && (
          <p className="text-sm text-muted-foreground">Slug cannot be changed after creation.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Join the waitlist for early access"
          required
        />
        {errors.headline && (
          <p role="alert" className="text-sm text-destructive">{errors.headline}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subheadline">Subheadline (optional)</Label>
        <Input
          id="subheadline"
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
          placeholder="Be first to know when we launch"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL (optional)</Label>
        <Input
          id="logoUrl"
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
        {errors.logoUrl && (
          <p role="alert" className="text-sm text-destructive">{errors.logoUrl}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label id="preset-label">Theme</Label>
        <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
          <SelectTrigger aria-labelledby="preset-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="brand">Brand</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {errors.form && (
        <p role="alert" className="text-sm text-destructive">{errors.form}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create waitlist'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/waitlists')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
