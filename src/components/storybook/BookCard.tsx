/**
 * BookCard — sticker-style tile used in the library / explore / showcase grids.
 *
 * Two modes:
 *   - Real book: 3:4 cover area (image OR colored placeholder by bookId hash)
 *     with a title + status badge below.
 *   - Create entry (`isCreate={true}`): coral-soft cover area with a centered
 *     "Make a new story" headline + Sparkle decoration.
 */

import { Link } from 'react-router-dom'
import { cn } from '../ui'
import type { Storybook } from '../../lib/pipeline'
import { useAssetUrl } from '../../lib/assetUrl'
import { OpenBook, Sparkle, Star } from '../decor'

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

const PALETTE: Array<{ bg: string; ink: string; decor: 'open' | 'star'; decorColor: string }> = [
  { bg: 'var(--storynest-sky-soft)', ink: 'var(--storynest-sky-deep)', decor: 'open', decorColor: 'var(--storynest-sky)' },
  { bg: 'var(--storynest-sun-soft)', ink: 'var(--storynest-coral-deep)', decor: 'star', decorColor: 'var(--storynest-sun)' },
  { bg: 'var(--storynest-coral-soft)', ink: 'var(--storynest-coral-deep)', decor: 'open', decorColor: 'var(--storynest-coral)' },
  { bg: 'var(--storynest-mint-soft)', ink: 'var(--storynest-mint-deep)', decor: 'star', decorColor: 'var(--storynest-mint)' },
  { bg: 'var(--storynest-lavender-soft)', ink: 'var(--storynest-lavender-deep)', decor: 'open', decorColor: 'var(--storynest-lavender)' },
]

function hashIndex(id: string, mod: number): number {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i)) % 1000003
  return sum % mod
}

function StatusBadge({ book }: { book: Storybook }) {
  if (book.status === 'ready') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
        style={{ background: 'var(--storynest-mint)', color: 'oklch(0.20 0.05 162)' }}
      >
        Ready
      </span>
    )
  }
  if (book.status === 'failed') {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
        style={{
          border: '1.5px solid var(--storynest-coral)',
          color: 'var(--storynest-coral-deep)',
        }}
      >
        Failed
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] animate-pulse"
      style={{ background: 'var(--storynest-sun)', color: 'oklch(0.22 0.05 78)' }}
    >
      Generating {Math.max(0, Math.min(100, book.progress || 0))}%
    </span>
  )
}

function StickerFrame({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-3xl overflow-hidden bg-white transition-all duration-150 will-change-transform',
        'hover:-translate-y-0.5',
        className,
      )}
      style={{
        border: '1.5px solid var(--storynest-rule)',
        boxShadow: 'var(--shadow-sticker)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sticker-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sticker)'
      }}
    >
      {children}
    </div>
  )
}

export function BookCard(props: BookCardProps) {
  // Hooks must always run. Create card passes null and the hook short-circuits.
  const coverKey = props.isCreate ? null : props.book.coverImageKey
  const coverUrl = useAssetUrl(coverKey)

  if (props.isCreate) {
    return (
      <Link
        to="/create"
        data-testid={props.testId || 'book-card-create'}
        className={cn('group block focus:outline-none', props.className)}
      >
        <StickerFrame>
          <div
            className="relative flex aspect-[3/4] w-full items-center justify-center px-6 text-center"
            style={{ background: 'var(--storynest-coral-soft)' }}
          >
            <Sparkle
              size={36}
              style={{ position: 'absolute', top: 18, right: 18, opacity: 0.9 }}
              color="var(--storynest-coral)"
            />
            <Star
              size={28}
              style={{ position: 'absolute', bottom: 22, left: 18, opacity: 0.8 }}
              color="var(--storynest-sun)"
            />
            <div
              className="font-display text-[24px] font-semibold leading-tight"
              style={{ color: 'var(--storynest-coral-deep)' }}
            >
              Make a new story
            </div>
          </div>
          <div className="px-5 py-4">
            <div
              className="font-display text-[17px] font-semibold"
              style={{ color: 'var(--storynest-ink)' }}
            >
              Start fresh
            </div>
            <div
              className="mt-0.5 text-[13px]"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              Takes about a minute
            </div>
          </div>
        </StickerFrame>
      </Link>
    )
  }

  const { book, bookId } = props
  const palette = PALETTE[hashIndex(bookId, PALETTE.length)]
  // Decor placement: alternate corner by a second hash bit.
  const cornerTopRight = hashIndex(bookId + 'corner', 2) === 0

  return (
    <Link
      to={`/book/${bookId}/edit`}
      data-testid={props.testId || `book-card-${bookId}`}
      className={cn('group block focus:outline-none', props.className)}
    >
      <StickerFrame>
        <div
          className="relative aspect-[3/4] w-full overflow-hidden"
          style={{ background: coverUrl ? 'var(--storynest-card-soft)' : palette.bg }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <div className="flex h-full w-full items-center justify-center px-6 text-center">
                <div
                  className="font-display text-[22px] font-semibold leading-[1.15]"
                  style={{ color: palette.ink }}
                >
                  {book.title || 'Untitled'}
                </div>
              </div>
              {palette.decor === 'open' ? (
                <OpenBook
                  size={56}
                  color={palette.decorColor}
                  style={{
                    position: 'absolute',
                    [cornerTopRight ? 'top' : 'bottom']: 14,
                    [cornerTopRight ? 'right' : 'left']: 14,
                    opacity: 0.85,
                  }}
                />
              ) : (
                <Star
                  size={36}
                  color={palette.decorColor}
                  style={{
                    position: 'absolute',
                    [cornerTopRight ? 'top' : 'bottom']: 16,
                    [cornerTopRight ? 'right' : 'left']: 16,
                    opacity: 0.85,
                  }}
                />
              )}
            </>
          )}
        </div>
        <div className="px-5 py-4">
          <div
            className="font-display text-[19px] font-semibold leading-tight truncate"
            style={{ color: 'var(--storynest-ink)' }}
            title={book.title}
          >
            {book.title || 'Untitled'}
          </div>
          <div className="mt-2">
            <StatusBadge book={book} />
          </div>
        </div>
      </StickerFrame>
    </Link>
  )
}
