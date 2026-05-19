/**
 * /explore — the public library. Reads every storybook with
 * `visibility: 'public'` and `status: 'ready'`, excluding the caller's
 * own books (those live in /library).
 *
 * Pro-gated: free users see a paywall card instead of the grid.
 */

import { Link } from 'react-router-dom'
import { useQuery, useUser } from 'deepspace'
import { BookCard } from '../../components/storybook/BookCard'
import { Hootie } from '../../components/mascots/Hootie'
import { Sparkle, OpenBook, Moon } from '../../components/decor'
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
      <div data-testid="explore-paywall" className="relative mx-auto max-w-2xl px-6 py-20">
        <Sparkle
          size={32}
          color="var(--storynest-mint)"
          style={{ position: 'absolute', top: 60, left: 24, opacity: 0.85, zIndex: 0 }}
        />
        <Sparkle
          size={24}
          color="var(--storynest-coral)"
          style={{ position: 'absolute', top: 100, right: 40, opacity: 0.8, zIndex: 0 }}
        />
        <Sparkle
          size={28}
          color="var(--storynest-sky)"
          style={{ position: 'absolute', bottom: 120, right: 80, opacity: 0.8, zIndex: 0 }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <Hootie variant="sleeping" size={200} />
          <h1
            className="mt-6 font-display font-semibold leading-tight"
            style={{ color: 'var(--storynest-ink)', fontSize: 40 }}
          >
            The public library is part of Pro.
          </h1>
          <p
            className="mx-auto mt-4 max-w-md text-[16px] leading-snug"
            style={{ color: 'var(--storynest-ink-soft)' }}
          >
            Read every storybook the community has chosen to share. Pro also
            includes 60 fresh credits each month and a 7-day free trial.
          </p>
          <Link
            to="/upgrade"
            data-testid="paywall-cta"
            className="mt-8 inline-flex items-center rounded-full px-6 py-3 font-display text-[16px] font-semibold text-white transition-transform active:translate-x-[4px] active:translate-y-[4px]"
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
            See plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="explore" className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-12">
        <div className="flex items-center gap-3">
          <h1
            className="font-display font-semibold leading-[1.05]"
            style={{ color: 'var(--storynest-ink)', fontSize: 48 }}
          >
            Explore the nest
          </h1>
          <OpenBook size={32} />
        </div>
        <p
          className="font-hand mt-1 text-[22px]"
          style={{ color: 'var(--storynest-coral-deep)' }}
        >
          stories shared by the community
        </p>
      </header>

      {status === 'loading' && otherPeoples.length === 0 ? (
        <div className="text-[14px]" style={{ color: 'var(--storynest-ink-mute)' }}>
          Loading shared stories…
        </div>
      ) : otherPeoples.length === 0 ? (
        <EmptyExplore />
      ) : (
        <div
          data-testid="explore-grid"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {otherPeoples.map((r) => (
            <BookCard key={r.recordId} bookId={r.recordId} book={r.data} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyExplore() {
  return (
    <div
      className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center"
      style={{
        border: '1.5px solid var(--storynest-rule)',
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      <div className="flex justify-center">
        <Moon size={80} color="var(--storynest-lavender)" />
      </div>
      <h2
        className="mt-4 font-display font-semibold leading-tight"
        style={{ color: 'var(--storynest-ink)', fontSize: 28 }}
      >
        No public storybooks yet
      </h2>
      <p
        className="mx-auto mt-3 max-w-xs text-[14px]"
        style={{ color: 'var(--storynest-ink-soft)' }}
      >
        Be the first — make one and keep it public.
      </p>
    </div>
  )
}
