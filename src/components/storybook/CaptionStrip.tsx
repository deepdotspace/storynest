/**
 * CaptionStrip — left-side panel that shows the current page's narration
 * text as an alternative to the floating bubble overlay. Two visual
 * states:
 *
 *   - expanded: ~320px wide, shows the page text in a calm reading
 *     column with a small header (page X of N) and a close handle
 *   - collapsed: ~40px wide, just a thin chevron handle — image gets
 *     the full viewport again, audio plays without any visible text
 *     (the "audio-only" mode)
 *
 * Both states stay mounted; transition is pure CSS so collapse/expand
 * never blanks the panel. Page text fades-in on change so changing
 * pages with the strip open doesn't feel jumpy.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  text: string
  pageIndex: number
  pageTotal: number
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Optional title shown above the page counter when expanded. */
  bookTitle?: string
}

export const CAPTION_STRIP_EXPANDED_PX = 320
export const CAPTION_STRIP_COLLAPSED_PX = 40
/** Gap to leave between the strip's right edge and any left-anchored
 * reader chrome (close button, prev arrow, etc.) so they don't visually
 * crowd. Keep slightly larger when the strip is fully open. */
const CHROME_GAP_OPEN = 20
const CHROME_GAP_COLLAPSED = 16
/** Matches the strip's own width transition so all left chrome slides
 * in lockstep — no perceived stutter. */
export const CAPTION_STRIP_TRANSITION = 'left 280ms cubic-bezier(0.22, 0.61, 0.36, 1)'

/**
 * Compute the `left` offset (in px) for reader chrome anchored to the
 * left edge of the viewport — close/library button, prev arrow, etc.
 * Pairs with `CAPTION_STRIP_TRANSITION` so animation matches the strip.
 *
 *   captions off                  → 20  (the default `left-5` = 1.25rem)
 *   captions on + collapsed       → 40 + 16 = 56
 *   captions on + expanded        → 320 + 20 = 340
 */
export function captionStripLeftOffset(
  enabled: boolean,
  collapsed: boolean,
): number {
  if (!enabled) return 20
  return collapsed
    ? CAPTION_STRIP_COLLAPSED_PX + CHROME_GAP_COLLAPSED
    : CAPTION_STRIP_EXPANDED_PX + CHROME_GAP_OPEN
}

const EXPANDED_PX = CAPTION_STRIP_EXPANDED_PX
const COLLAPSED_PX = CAPTION_STRIP_COLLAPSED_PX

export function CaptionStrip({
  text,
  pageIndex,
  pageTotal,
  collapsed,
  onToggleCollapsed,
  bookTitle,
}: Props) {
  // Soft fade between pages so swipes don't snap the eye.
  const [fadeKey, setFadeKey] = useState(`${pageIndex}`)
  useEffect(() => {
    setFadeKey(`${pageIndex}-${Date.now()}`)
  }, [pageIndex])

  const containerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: collapsed ? COLLAPSED_PX : EXPANDED_PX,
    transition: 'width 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    zIndex: 30,
    pointerEvents: 'auto',
    background: 'var(--storynest-card)',
    borderRight: '1.5px solid var(--storynest-rule)',
    boxShadow: '4px 0 18px -8px oklch(0.22 0.04 265 / 0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  return (
    <aside
      data-testid="caption-strip"
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Page narration"
      style={containerStyle}
    >
      {/* Toggle handle — always at the top-right of the strip so it
          stays clickable in both states. */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Show captions' : 'Hide captions'}
        title={collapsed ? 'Show captions' : 'Hide captions'}
        data-testid="caption-strip-toggle"
        className="absolute right-2 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full transition-all hover:-translate-y-0.5 focus:outline-none"
        style={{
          background: 'var(--storynest-card-soft)',
          color: 'var(--storynest-ink-soft)',
          border: '1.5px solid var(--storynest-rule)',
        }}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Content — only renders when expanded enough to read.
          We keep it mounted at the same width source-of-truth so the
          width transition is the only animated property. opacity hides
          content during collapse so it doesn't clip ugly mid-transition. */}
      <div
        style={{
          padding: '52px 22px 28px 22px',
          opacity: collapsed ? 0 : 1,
          transition: 'opacity 180ms ease-out',
          pointerEvents: collapsed ? 'none' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 0,
          flex: 1,
        }}
      >
        {bookTitle && (
          <div
            className="font-display truncate"
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--storynest-ink-mute)',
              letterSpacing: '-0.005em',
            }}
            title={bookTitle}
          >
            {bookTitle}
          </div>
        )}
        <div
          style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--storynest-ink-mute)',
          }}
        >
          Page {pageIndex} of {pageTotal}
        </div>
        <div
          key={fadeKey}
          className="caption-strip-text"
          style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 17,
            lineHeight: 1.6,
            color: 'var(--storynest-ink)',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {text}
        </div>
      </div>

      {/* Local fade-in animation. Defined inline so the component is
          fully self-contained and doesn't require a global CSS edit. */}
      <style>{`
        @keyframes caption-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .caption-strip-text { animation: caption-fade-in 240ms ease-out; }
      `}</style>
    </aside>
  )
}
