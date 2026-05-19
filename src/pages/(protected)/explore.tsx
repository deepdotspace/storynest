/**
 * /explore — the public library. Reads every storybook with
 * `visibility: 'public'` and `status: 'ready'`, excluding the caller's
 * own books (those live in /library).
 *
 * Pro-gated: free users see a paywall card instead of the grid.
 */

import { Link } from 'react-router-dom'
import { useQuery, useUser } from 'deepspace'
import { Lock } from 'lucide-react'
import { BookCard } from '../../components/storybook/BookCard'
import type { Storybook } from '../../lib/pipeline'
import { useIsPro } from '../../lib/useIsPro'

export default function Explore() {
  const isPro = useIsPro()
  const { user } = useUser()
  const myId = user?.id ?? ''

  const { records, status } = useQuery<Storybook>('storybooks', {
    where: { visibility: 'public', status: 'ready' },
    orderBy: 'updatedAt',
    orderDir: 'desc',
  })

  const otherPeoples = records.filter((r) => r.createdBy !== myId)

  if (!isPro) {
    return (
      <div
        data-testid="explore-paywall"
        className="mx-auto max-w-2xl px-6 py-20 text-center"
      >
        <Lock
          className="mx-auto h-8 w-8"
          aria-hidden
          style={{ color: 'var(--storynest-marigold-d)' }}
        />
        <h1
          className="mt-4 font-serif text-[33px] leading-tight"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          The public library is part of Pro
        </h1>
        <p
          className="mx-auto mt-3 max-w-md text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Read every storybook the community has chosen to share. Pro also
          includes 60 fresh credits each month and a 7-day free trial.
        </p>
        <Link
          to="/upgrade"
          data-testid="paywall-cta"
          className="mt-6 inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium"
          style={{
            background: 'var(--storynest-marigold)',
            color: 'oklch(0.18 0.04 60)',
          }}
        >
          See plans
        </Link>
      </div>
    )
  }

  return (
    <div
      data-testid="explore"
      className="mx-auto max-w-6xl px-6 py-12 sm:py-16"
    >
      <header className="mb-10">
        <h1
          className="font-serif text-[40px] leading-tight"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Explore
        </h1>
        <p
          className="font-hand mt-1 text-[20px]"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          stories shared by the community
        </p>
      </header>

      {status === 'loading' && otherPeoples.length === 0 ? (
        <div
          className="text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Loading shared stories…
        </div>
      ) : otherPeoples.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{
            background: 'var(--storynest-paper-deep)',
            border: '1px solid var(--storynest-rule)',
            color: 'var(--storynest-ink-mute)',
          }}
        >
          No public storybooks yet. Be the first — make one and keep it public.
        </div>
      ) : (
        <div
          data-testid="explore-grid"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {otherPeoples.map((r) => (
            <BookCard
              key={r.recordId}
              bookId={r.recordId}
              book={r.data}
            />
          ))}
        </div>
      )}
    </div>
  )
}
