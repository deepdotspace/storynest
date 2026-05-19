/**
 * GenerationProgress — bookish in-progress UI shown when status != 'ready'.
 * Hootie centered at the top, thick sky pill progress bar, sticker per-page
 * rows. Success shows a waving Hootie + Sparkle decor; failed shows a
 * sleeping Hootie + Start-over CTA.
 */

import { Link } from 'react-router-dom'
import { Hootie } from '../mascots/Hootie'
import { Sparkle } from '../decor'
import type { Storybook, Page } from '../../lib/pipeline'

interface Props {
  book: Storybook
  pages: Page[]
}

function heading(status: Storybook['status']): string {
  switch (status) {
    case 'outlining': return 'Sketching your story'
    case 'illustrating': return 'Painting the pages'
    case 'narrating': return 'Recording the voice'
    case 'ready': return 'Your story is ready'
    case 'failed': return 'Something went wrong'
  }
}

function pageStatusLabel(s: Page['status']): string {
  switch (s) {
    case 'pending': return 'Waiting'
    case 'text-ready': return 'Text ready'
    case 'image-ready': return 'Image ready'
    case 'ready': return 'Ready'
    case 'failed': return 'Failed'
  }
}

interface PillStyle {
  background: string
  color: string
  border: string
}

function pageStatusPill(s: Page['status']): PillStyle {
  switch (s) {
    case 'ready':
      return {
        background: 'var(--storynest-mint)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-mint-deep)',
      }
    case 'image-ready':
      return {
        background: 'var(--storynest-sun)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-sun-deep)',
      }
    case 'failed':
      return {
        background: 'transparent',
        color: 'var(--storynest-coral-deep)',
        border: '1.5px solid var(--storynest-coral)',
      }
    default:
      return {
        background: 'transparent',
        color: 'var(--storynest-ink-mute)',
        border: '1.5px solid var(--storynest-rule)',
      }
  }
}

function hootieFor(status: Storybook['status']): {
  variant: 'reading' | 'waving' | 'sleeping'
  size: number
} {
  if (status === 'ready') return { variant: 'waving', size: 150 }
  if (status === 'failed') return { variant: 'sleeping', size: 130 }
  return { variant: 'reading', size: 130 }
}

function activeIndex(sorted: Page[]): number {
  // Naive "currently in flight" detection: first non-ready page.
  return sorted.findIndex((p) => p.status !== 'ready' && p.status !== 'failed')
}

export function GenerationProgress({ book, pages }: Props) {
  const progress = Math.max(0, Math.min(100, book.progress || 0))
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)
  const hootie = hootieFor(book.status)
  const inFlight = activeIndex(sorted)

  return (
    <div
      data-testid="generation-progress"
      className="relative mx-auto max-w-2xl px-6 py-12"
    >
      {book.status === 'ready' && (
        <>
          <Sparkle
            size={32}
            className="pointer-events-none absolute"
            style={{ top: 40, left: 30, opacity: 0.85 }}
          />
          <Sparkle
            size={24}
            color="var(--storynest-sun)"
            className="pointer-events-none absolute"
            style={{ top: 100, right: 40, opacity: 0.85 }}
          />
          <Sparkle
            size={20}
            color="var(--storynest-coral)"
            className="pointer-events-none absolute"
            style={{ top: 180, left: 80, opacity: 0.8 }}
          />
        </>
      )}

      <div className="flex flex-col items-center text-center">
        <Hootie variant={hootie.variant} size={hootie.size} />

        <h2
          className="font-display mt-4 leading-tight"
          style={{
            color: 'var(--storynest-ink)',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          {heading(book.status)}
        </h2>

        {book.title && (
          <p
            className="font-hand mt-1"
            style={{
              fontSize: 22,
              color: 'var(--storynest-ink-mute)',
            }}
          >
            {book.title}
          </p>
        )}
      </div>

      {book.status !== 'failed' && (
        <div className="mt-8">
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: 12,
              borderRadius: 9999,
              background: 'var(--storynest-sun-soft)',
            }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'var(--storynest-sky)',
                borderRadius: 9999,
              }}
            />
          </div>
          <div
            className="mt-2 text-center font-display"
            style={{
              color: 'var(--storynest-ink-soft)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {progress}%
          </div>
        </div>
      )}

      {book.status === 'failed' && (
        <div
          className="mt-8 p-5"
          style={{
            background: 'var(--storynest-coral-soft)',
            border: '1.5px solid var(--storynest-coral)',
            borderRadius: 20,
            color: 'var(--storynest-ink)',
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <div
            style={{
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            {book.failureReason || 'The pipeline stopped before finishing.'}
          </div>
          <Link
            to="/create"
            className="mt-4 inline-flex items-center rounded-full transition-transform active:translate-x-[3px] active:translate-y-[3px]"
            style={{
              padding: '10px 22px',
              background: 'var(--storynest-coral)',
              color: 'oklch(0.99 0.005 240)',
              fontFamily: 'Fredoka, system-ui, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              boxShadow: '3px 3px 0 0 var(--storynest-coral-deep)',
            }}
          >
            Start over
          </Link>
        </div>
      )}

      <ul className="mt-10 space-y-3">
        {sorted.map((p, idx) => {
          const pill = pageStatusPill(p.status)
          const isActive = idx === inFlight && book.status !== 'failed' && book.status !== 'ready'
          return (
            <li
              key={p.pageNumber}
              className="flex items-center gap-4 transition-transform"
              style={{
                padding: 16,
                background: 'var(--storynest-card)',
                border: '1.5px solid var(--storynest-rule)',
                borderRadius: 20,
                boxShadow: 'var(--shadow-sticker)',
                opacity: isActive ? 1 : p.status === 'pending' ? 0.78 : 1,
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  background: 'var(--storynest-coral)',
                  border: '2px solid var(--storynest-ink)',
                  color: 'oklch(0.99 0.005 240)',
                  fontFamily: 'Fredoka, system-ui, sans-serif',
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: '2px 2px 0 0 oklch(0.22 0.04 265 / 0.12)',
                }}
              >
                {p.pageNumber}
              </span>
              <span
                className={isActive ? 'animate-pulse flex-1' : 'flex-1'}
                style={{
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--storynest-ink-soft)',
                }}
              >
                {p.text ? (
                  p.text.length > 140 ? p.text.slice(0, 140) + '…' : p.text
                ) : (
                  <span style={{ color: 'var(--storynest-ink-mute)', fontStyle: 'italic' }}>
                    Awaiting text
                  </span>
                )}
              </span>
              <span
                className="shrink-0 rounded-full"
                style={{
                  padding: '4px 12px',
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: pill.background,
                  color: pill.color,
                  border: pill.border,
                }}
              >
                {pageStatusLabel(p.status)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
