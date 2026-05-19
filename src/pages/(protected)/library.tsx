/**
 * /library — grid of the signed-in user's storybooks + a "Create new" tile.
 *
 * Public books from OTHER users live in /explore (Pro-gated). This
 * filters to `createdBy === me` so the library is strictly personal.
 */

import { useQuery, useUser } from 'deepspace'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/ui'
import { BookCard } from '../../components/storybook/BookCard'
import type { Storybook } from '../../lib/pipeline'
import { useIsPro } from '../../lib/useIsPro'

export default function Library() {
  const navigate = useNavigate()
  const { user } = useUser()
  const isPro = useIsPro()
  const { records, status } = useQuery<Storybook>('storybooks', {
    where: { createdBy: user?.id ?? '' },
    orderBy: 'updatedAt',
    orderDir: 'desc',
  })

  return (
    <div
      data-testid="library"
      className="mx-auto max-w-6xl px-6 py-12 sm:py-16"
    >
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1
            className="font-serif text-[40px] leading-tight"
            style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
          >
            Library
          </h1>
          <p
            className="font-hand text-[20px]"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            your shelf
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
          style={{
            background: 'var(--storynest-paper-deep)',
            color: 'var(--storynest-ink, var(--color-foreground))',
            border: '1px solid var(--storynest-rule)',
          }}
        >
          Explore the public library
          {!isPro && (
            <span
              className="inline-flex items-center rounded-full px-1.5 text-[10px] uppercase tracking-[0.05em]"
              style={{
                background: 'var(--storynest-marigold)',
                color: 'oklch(0.18 0.04 60)',
              }}
            >
              Pro
            </span>
          )}
        </Link>
      </header>

      {status === 'loading' ? (
        <div
          className="text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Loading your stories…
        </div>
      ) : records.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No stories yet"
            description="Make your first one — it takes about a minute."
            action={{ label: 'Create a story', onClick: () => navigate('/create') }}
          />
        </div>
      ) : (
        <div
          data-testid="library-grid"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <BookCard isCreate={true} />
          {records.map((r) => (
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
