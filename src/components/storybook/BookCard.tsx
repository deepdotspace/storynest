/**
 * BookCard — the "paperbook" tile used in the library grid.
 * Two modes: a real book (cover + title + status) or the "create" entry.
 */

import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '../ui'
import type { Storybook } from '../../lib/pipeline'
import { useAssetBlobUrl } from '../../lib/assetUrl'

interface CommonProps {
  className?: string
  testId?: string
}

interface BookProps extends CommonProps {
  isCreate?: false
  book: Storybook
  bookId: string
}

interface CreateProps extends CommonProps {
  isCreate: true
  book?: never
  bookId?: never
}

type BookCardProps = BookProps | CreateProps

function StatusBadge({ book }: { book: Storybook }) {
  if (book.status === 'ready') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]"
        style={{ background: 'var(--storynest-sage)', color: 'oklch(0.18 0.04 150)' }}
      >
        Ready
      </span>
    )
  }
  if (book.status === 'failed') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]"
        style={{
          border: '1px solid var(--storynest-rose)',
          color: 'var(--storynest-rose)',
        }}
      >
        Failed
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] animate-pulse"
      style={{ background: 'var(--storynest-marigold)', color: 'oklch(0.18 0.04 60)' }}
    >
      Generating {Math.max(0, Math.min(100, book.progress || 0))}%
    </span>
  )
}

function PaperFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('rounded-lg overflow-hidden', className)}
      style={{
        background: 'var(--storynest-paper-deep)',
        border: '1px solid var(--storynest-rule)',
        boxShadow: '0 1px 3px oklch(0.22 0.035 265 / 0.06)',
      }}
    >
      {children}
    </div>
  )
}

export function BookCard(props: BookCardProps) {
  // Always call hooks unconditionally. For the create card, key is null
  // and the hook short-circuits.
  const coverKey = props.isCreate ? null : props.book.coverImageKey
  const { url: coverUrl } = useAssetBlobUrl(coverKey)

  if (props.isCreate) {
    return (
      <Link
        to="/create"
        data-testid={props.testId || 'book-card-create'}
        className={cn(
          'group block focus:outline-none',
          props.className,
        )}
      >
        <PaperFrame className="transition-shadow hover:shadow-[0_2px_8px_oklch(0.22_0.035_265_/_0.10)]">
          <div
            className="flex aspect-[3/4] w-full items-center justify-center"
            style={{ background: 'var(--storynest-paper)' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                border: '1.5px dashed var(--storynest-marigold)',
                color: 'var(--storynest-marigold-d, var(--storynest-marigold))',
              }}
            >
              <Plus className="h-6 w-6" aria-hidden />
            </div>
          </div>
          <div className="px-4 py-3">
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
            >
              Create new story
            </div>
            <div
              className="mt-0.5 text-xs"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              Takes about a minute
            </div>
          </div>
        </PaperFrame>
      </Link>
    )
  }

  const { book, bookId } = props

  return (
    <Link
      to={`/book/${bookId}/edit`}
      data-testid={props.testId || `book-card-${bookId}`}
      className={cn('group block focus:outline-none', props.className)}
    >
      <PaperFrame className="transition-shadow hover:shadow-[0_2px_8px_oklch(0.22_0.035_265_/_0.10)]">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden"
          style={{ background: 'var(--storynest-paper)' }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
              <div
                className="font-serif text-[22px] leading-[1.15]"
                style={{ color: 'var(--storynest-ink-soft)' }}
              >
                {book.title || 'Untitled'}
              </div>
              <div
                className="font-hand mt-3 text-[18px]"
                style={{ color: 'var(--storynest-ink-mute)' }}
              >
                — a storynest book
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <div
            className="font-serif text-[19px] leading-tight"
            style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
            title={book.title}
          >
            {book.title || 'Untitled'}
          </div>
          <div className="mt-2">
            <StatusBadge book={book} />
          </div>
        </div>
      </PaperFrame>
    </Link>
  )
}
