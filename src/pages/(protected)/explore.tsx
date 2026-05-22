/**
 * /explore — the public library. Reads every storybook with
 * `visibility: 'public'` and `status: 'ready'`, excluding the caller's
 * own books (those live in /library).
 *
 * Open to all signed-in users.
 */

import { useQuery, useUser } from 'deepspace'
import { BookCard } from '../../components/storybook/BookCard'
import { OpenBook, Moon } from '../../components/decor'
import type { Storybook } from '../../lib/pipeline'

export default function Explore() {
  const { user } = useUser()
  const myId = user?.id ?? ''

  const { records, status } = useQuery<Storybook>('storybooks', {
    where: { visibility: 'public', status: 'ready' },
    orderBy: 'updatedAt',
    orderDir: 'desc',
  })

  const otherPeoples = records.filter((r) => r.createdBy !== myId)

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
            <BookCard
              key={r.recordId}
              bookId={r.recordId}
              book={r.data}
              publicBookId={r.recordId}
            />
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
