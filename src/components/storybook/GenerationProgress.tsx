/**
 * GenerationProgress — bookish in-progress UI shown when status != 'ready'.
 * Calm, single marigold progress bar + per-page status list.
 */

import { Link } from 'react-router-dom'
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

function pageStatusColor(s: Page['status']): string {
  switch (s) {
    case 'ready': return 'var(--storynest-sage)'
    case 'failed': return 'var(--storynest-rose)'
    case 'image-ready': return 'var(--storynest-marigold)'
    default: return 'var(--storynest-ink-mute)'
  }
}

export function GenerationProgress({ book, pages }: Props) {
  const progress = Math.max(0, Math.min(100, book.progress || 0))
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)

  return (
    <div
      data-testid="generation-progress"
      className="mx-auto max-w-2xl px-6 py-12"
    >
      <h2
        className="font-serif text-[28px] leading-tight"
        style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
      >
        {heading(book.status)}
      </h2>

      {book.title && (
        <p
          className="font-hand mt-1 text-[20px]"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          {book.title}
        </p>
      )}

      {book.status !== 'failed' && (
        <div className="mt-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--storynest-paper-deep)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%`, background: 'var(--storynest-marigold)' }}
            />
          </div>
          <div
            className="mt-2 text-xs"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            {progress}%
          </div>
        </div>
      )}

      {book.status === 'failed' && (
        <div
          className="mt-6 rounded-md p-4"
          style={{
            background: 'oklch(0.97 0.02 22 / 0.4)',
            border: '1px solid var(--storynest-rose)',
            color: 'var(--storynest-ink, var(--color-foreground))',
          }}
        >
          <div className="text-sm">{book.failureReason || 'The pipeline stopped before finishing.'}</div>
          <Link
            to="/create"
            className="mt-3 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: 'var(--storynest-marigold)', color: 'oklch(0.18 0.04 60)' }}
          >
            Start over
          </Link>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {sorted.map((p) => (
          <li
            key={p.pageNumber}
            className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors"
            style={{
              background: 'var(--storynest-paper-deep)',
              border: '1px solid var(--storynest-rule)',
            }}
          >
            <span
              className="font-serif mt-0.5 w-8 shrink-0 text-right text-[16px]"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              {p.pageNumber}
            </span>
            <span
              className="flex-1 text-sm leading-snug"
              style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
            >
              {p.text ? (
                p.text.length > 140 ? p.text.slice(0, 140) + '…' : p.text
              ) : (
                <em style={{ color: 'var(--storynest-ink-mute)' }}>Awaiting text</em>
              )}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]"
              style={{
                background: 'transparent',
                border: `1px solid ${pageStatusColor(p.status)}`,
                color: pageStatusColor(p.status),
              }}
            >
              {pageStatusLabel(p.status)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
