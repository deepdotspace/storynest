/**
 * /library — grid of the signed-in user's storybooks + a "Create new" tile.
 *
 * Public books from OTHER users live in /explore (Pro-gated). We filter to
 * `createdBy === me` so the library is strictly personal.
 */

import { useQuery, useUser } from 'deepspace'
import { Link, useNavigate } from 'react-router-dom'
import { BookCard } from '../../components/storybook/BookCard'
import { Hootie } from '../../components/mascots/Hootie'
import { Heart, Star, Cloud } from '../../components/decor'
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
    <div data-testid="library" className="mx-auto max-w-6xl px-6 py-14">
      <header className="relative mb-12 flex flex-wrap items-baseline justify-between gap-4">
        <Heart
          size={40}
          color="var(--storynest-coral)"
          style={{ position: 'absolute', top: -4, right: 220, opacity: 0.7, zIndex: 0 }}
          className="hidden md:block"
        />
        <div className="relative z-10">
          <h1
            className="font-display font-semibold leading-[1.05]"
            style={{ color: 'var(--storynest-ink)', fontSize: 48 }}
          >
            Library
          </h1>
          <p
            className="font-hand text-[22px]"
            style={{ color: 'var(--storynest-coral-deep)' }}
          >
            your shelf
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--storynest-lavender-soft)',
            color: 'var(--storynest-lavender-deep)',
            border: '1.5px solid var(--storynest-lavender)',
            boxShadow: '2px 2px 0 0 oklch(0.22 0.04 265 / 0.10)',
          }}
        >
          Explore the public library
          {!isPro && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
              style={{
                background: 'var(--storynest-lavender)',
                color: 'white',
              }}
            >
              Pro
            </span>
          )}
        </Link>
      </header>

      {status === 'loading' ? (
        <div className="text-[14px]" style={{ color: 'var(--storynest-ink-mute)' }}>
          Loading your stories…
        </div>
      ) : records.length === 0 ? (
        <EmptyShelf onCreate={() => navigate('/create')} />
      ) : (
        <div
          data-testid="library-grid"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <BookCard isCreate={true} />
          {records.map((r) => (
            <BookCard key={r.recordId} bookId={r.recordId} book={r.data} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyShelf({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative mx-auto mt-8 max-w-xl text-center">
      <Star
        size={48}
        color="var(--storynest-sun)"
        style={{ position: 'absolute', top: -10, left: 8, opacity: 0.8, zIndex: 0 }}
      />
      <Cloud
        size={120}
        color="var(--storynest-sky-soft)"
        style={{ position: 'absolute', top: 30, right: -20, opacity: 0.8, zIndex: 0 }}
      />
      <Star
        size={32}
        color="var(--storynest-coral)"
        style={{ position: 'absolute', bottom: 60, right: 40, opacity: 0.75, zIndex: 0 }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <Hootie variant="waving" size={200} />
        <h2
          className="mt-6 font-display font-semibold leading-tight"
          style={{ color: 'var(--storynest-ink)', fontSize: 32 }}
        >
          No stories yet
        </h2>
        <p
          className="mx-auto mt-3 max-w-sm text-[15px]"
          style={{ color: 'var(--storynest-ink-soft)' }}
        >
          Make your first one — it takes about a minute.
        </p>
        <button
          onClick={onCreate}
          data-testid="library-empty-cta"
          className="mt-7 inline-flex items-center rounded-full px-6 py-3 font-display text-[15px] font-semibold text-white transition-transform active:translate-x-[4px] active:translate-y-[4px]"
          style={{
            background: 'var(--storynest-sky)',
            boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
          }}
        >
          Make a new story
        </button>
      </div>
    </div>
  )
}
