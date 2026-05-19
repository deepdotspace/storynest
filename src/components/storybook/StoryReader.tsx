/**
 * StoryReader — the immersive picture-book mode.
 *
 * Renders into a portal at document.body so the app's top nav is hidden
 * without ripping it from the React tree. Owns:
 *   - currentIndex (0 = cover, 1..N = body pages, N+1 = end card)
 *   - muted / textVisible UI toggles
 *   - keyboard nav (← → space M T Esc)
 *   - audio playback via AudioPlayer
 *
 * v2 chrome refresh: cover + chrome buttons restyled to the sticker
 * recipe (white bg, ink border, hard-offset shadow, Fredoka titles).
 * The body layout (image + TextBubble), portal mount, keyboard handler,
 * audio source resolution, and index space are unchanged.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Type,
  EyeOff,
  X as XIcon,
} from 'lucide-react'
import { useAssetBlobUrl } from '../../lib/assetUrl'
import { PageImage } from './PageImage'
import { TextBubble } from './TextBubble'
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer'
import { Sparkle, Star, Cloud } from '../decor'
import { cn } from '../ui/utils'

/* ── Minimal row shapes we depend on (avoid coupling to W1's exports). ─── */

export interface ReaderBook {
  recordId: string
  title: string
  characters?: string
  coverImageKey?: string | null
}

export interface ReaderPage {
  recordId: string
  pageNumber: number
  text: string
  imageKey?: string | null
  audioKey?: string | null
}

interface StoryReaderProps {
  book: ReaderBook
  pages: ReaderPage[]
  onExit: () => void
}

export function StoryReader({ book, pages, onExit }: StoryReaderProps) {
  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.pageNumber - b.pageNumber),
    [pages],
  )

  // Index space: 0 = cover, 1..N = body pages, N+1 = end card.
  const N = sortedPages.length
  const lastIndex = N + 1

  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [textVisible, setTextVisible] = useState(true)
  const audioRef = useRef<AudioPlayerHandle>(null)

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }, [])
  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(lastIndex, i + 1))
  }, [lastIndex])

  // Keyboard nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onExit()
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => !m)
      } else if (e.key === 't' || e.key === 'T') {
        setTextVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onExit])

  // Lock body scroll while the reader is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  /* ── Resolve current page's audio key (skip on cover / end). ─────────── */
  const onBodyPage = currentIndex >= 1 && currentIndex <= N
  const currentBodyPage = onBodyPage ? sortedPages[currentIndex - 1] : null
  // Owner-scoped audio — needs blob URL (see assetUrl.ts).
  const { url: currentAudioSrc } = useAssetBlobUrl(
    onBodyPage ? currentBodyPage?.audioKey ?? null : null,
  )

  const onImageClick = useCallback(() => {
    audioRef.current?.replay()
  }, [])

  /* ── The portal content. ─────────────────────────────────────────────── */
  const content: ReactNode = (
    <div
      data-testid="reader-root"
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{
        background: 'var(--storynest-bg)',
        color: 'var(--storynest-ink)',
      }}
    >
      <AudioPlayer
        ref={audioRef}
        src={currentAudioSrc}
        muted={muted}
        pageKey={currentIndex}
      />

      {/* Top-left: exit — sticker pill */}
      <button
        type="button"
        data-testid="reader-exit"
        onClick={onExit}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background: 'var(--storynest-card)',
          color: 'var(--storynest-ink)',
          border: '1.5px solid var(--storynest-rule)',
          boxShadow: 'var(--shadow-sticker)',
          fontFamily: 'var(--storynest-font-body, Nunito), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          // @ts-expect-error CSS var for focus ring
          '--tw-ring-color': 'var(--storynest-sky)',
        }}
        aria-label="Exit reader and return to library"
      >
        <XIcon className="h-4 w-4" aria-hidden />
        <span>Library</span>
      </button>

      {/* Top-right: text toggle + mute */}
      {currentIndex !== 0 && currentIndex !== lastIndex && (
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2.5">
          <ChromeIconButton
            testId="reader-text-toggle"
            label={textVisible ? 'Hide narration text' : 'Show narration text'}
            pressed={!textVisible}
            onClick={() => setTextVisible((v) => !v)}
          >
            {textVisible ? (
              <Type className="h-4 w-4" aria-hidden />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden />
            )}
          </ChromeIconButton>

          <ChromeIconButton
            testId="reader-mute"
            label={muted ? 'Unmute narration' : 'Mute narration'}
            pressed={muted}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden />
            )}
          </ChromeIconButton>
        </div>
      )}

      {/* ── Page content ───────────────────────────────────────────────── */}
      {currentIndex === 0 ? (
        <CoverView
          book={book}
          onStart={goNext}
        />
      ) : currentIndex === lastIndex ? (
        <EndView
          onReplay={() => setCurrentIndex(0)}
          onExit={onExit}
        />
      ) : (
        <BodyView
          page={currentBodyPage!}
          index={currentIndex}
          total={N}
          textVisible={textVisible}
          onImageClick={onImageClick}
        />
      )}

      {/* ── Bottom chrome: prev/next + counter (only on body pages) ────── */}
      {currentIndex !== 0 && currentIndex !== lastIndex && (
        <>
          <ArrowButton
            testId="reader-prev"
            label="Previous page"
            direction="left"
            disabled={currentIndex <= 0}
            onClick={goPrev}
          />
          <ArrowButton
            testId="reader-next"
            label="Next page"
            direction="right"
            disabled={currentIndex >= lastIndex}
            onClick={goNext}
          />
          <div
            className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 select-none"
            style={{
              fontFamily: 'var(--storynest-font-body, Nunito), system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'var(--storynest-ink-mute)',
            }}
          >
            {currentIndex} / {N}
          </div>
        </>
      )}
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}

/* ────────────────────────────────────────────────────────────────────────
 * Sub-views
 * ──────────────────────────────────────────────────────────────────────── */

function CoverView({
  book,
  onStart,
}: {
  book: ReaderBook
  onStart: () => void
}) {
  // Pull a single name out of the characters field for the Caveat byline,
  // falling back to "a story" if not present.
  const firstName = book.characters?.trim().split(/[\s,]+/)[0]
  const byline = firstName ? `for ${firstName}` : 'a story'

  return (
    <div
      data-testid="reader-cover"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
    >
      {/* Background decor — quiet */}
      <Cloud
        size={140}
        style={{ position: 'absolute', top: '8%', left: '6%', opacity: 0.35, zIndex: 0 }}
      />
      <Cloud
        size={110}
        style={{ position: 'absolute', top: '14%', right: '8%', opacity: 0.3, zIndex: 0 }}
      />
      <Star
        size={48}
        style={{ position: 'absolute', bottom: '14%', left: '12%', opacity: 0.4, zIndex: 0 }}
      />
      <Star
        size={36}
        style={{ position: 'absolute', bottom: '22%', right: '14%', opacity: 0.4, zIndex: 0 }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
        <h1
          className="text-center"
          style={{
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 600,
            fontStyle: 'normal',
            lineHeight: 1.1,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {book.title}
        </h1>
        <p
          className="mt-3"
          style={{
            fontFamily: 'var(--storynest-font-hand, Caveat), cursive',
            fontSize: 26,
            color: 'var(--storynest-lavender-deep)',
          }}
        >
          {byline}
        </p>

        {book.coverImageKey ? (
          <div
            className="mt-8 w-full max-w-[420px] aspect-[3/4] overflow-hidden"
            style={{
              background: 'var(--storynest-card)',
              border: '1.5px solid var(--storynest-rule)',
              borderRadius: 24,
              boxShadow: 'var(--shadow-sticker)',
            }}
          >
            <PageImage
              imageKey={book.coverImageKey}
              alt={`Cover illustration for ${book.title}`}
              contain
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onStart}
          className="mt-10 inline-flex items-center justify-center rounded-full px-7 py-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: 'var(--storynest-sky)',
            color: 'oklch(0.99 0.005 240)',
            border: 'none',
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: '-0.01em',
            boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
            // @ts-expect-error CSS var for focus ring
            '--tw-ring-color': 'var(--storynest-sky-deep)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 0 var(--storynest-sky-deep)'
            e.currentTarget.style.transform = 'translate(4px, 4px)'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
            e.currentTarget.style.transform = 'translate(0, 0)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
            e.currentTarget.style.transform = 'translate(0, 0)'
          }}
        >
          Start reading
        </button>
      </div>
    </div>
  )
}

function BodyView({
  page,
  index,
  total,
  textVisible,
  onImageClick,
}: {
  page: ReaderPage
  index: number
  total: number
  textVisible: boolean
  onImageClick: () => void
}) {
  return (
    <div
      data-testid={`reader-page-${index}`}
      className="absolute inset-0"
    >
      {/* Full-bleed illustration */}
      <button
        type="button"
        onClick={onImageClick}
        aria-label="Replay narration"
        className="absolute inset-0 block w-full h-full focus:outline-none"
      >
        <PageImage
          imageKey={page.imageKey}
          alt={`Illustration for page ${index} of ${total}`}
        />
        {/* Soft gradient under the text bubble for legibility */}
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, oklch(0.985 0.008 240 / 0.55), oklch(0.985 0.008 240 / 0))',
          }}
        />
      </button>

      {/* Text bubble floating over the lower edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 sm:bottom-28 z-10 px-6 flex justify-center">
        <TextBubble text={page.text} visible={textVisible} />
      </div>
    </div>
  )
}

function EndView({
  onReplay,
  onExit,
}: {
  onReplay: () => void
  onExit: () => void
}) {
  return (
    <div
      data-testid="reader-end"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
    >
      <div className="relative inline-flex items-center justify-center">
        <Sparkle
          size={32}
          style={{ position: 'absolute', top: -28, left: -36, opacity: 0.9 }}
        />
        <Sparkle
          size={24}
          style={{ position: 'absolute', top: -10, right: -40, opacity: 0.85 }}
          color="var(--storynest-sun)"
        />
        <Sparkle
          size={28}
          style={{ position: 'absolute', bottom: -22, right: -28, opacity: 0.85 }}
          color="var(--storynest-coral)"
        />
        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 600,
            fontStyle: 'normal',
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          The End
        </h2>
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        <PillButton
          onClick={onReplay}
          variant="sky"
          label="Read again"
        />
        <PillButton
          onClick={onExit}
          variant="ghost"
          label="Back to library"
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
 * Floating chrome buttons
 * ──────────────────────────────────────────────────────────────────────── */

function ArrowButton({
  testId,
  label,
  direction,
  disabled,
  onClick,
}: {
  testId: string
  label: string
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group absolute bottom-6 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-150',
        direction === 'left' ? 'left-5' : 'right-5',
        'disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      )}
      style={{
        background: 'var(--storynest-card)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-ink)',
        boxShadow: 'var(--shadow-sticker)',
        // @ts-expect-error CSS var for focus ring
        '--tw-ring-color': 'var(--storynest-sky)',
      }}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  )
}

function ChromeIconButton({
  testId,
  label,
  pressed,
  onClick,
  children,
}: {
  testId: string
  label: string
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150',
        'hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      )}
      style={{
        background: pressed ? 'var(--storynest-sky-soft)' : 'var(--storynest-card)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-ink)',
        boxShadow: 'var(--shadow-sticker)',
        // @ts-expect-error CSS var for focus ring
        '--tw-ring-color': 'var(--storynest-sky)',
      }}
    >
      {children}
    </button>
  )
}

/* End-card buttons — pill recipe matching the cover CTA. */
function PillButton({
  onClick,
  variant,
  label,
}: {
  onClick: () => void
  variant: 'sky' | 'ghost'
  label: string
}) {
  const sky: CSSProperties = {
    background: 'var(--storynest-sky)',
    color: 'oklch(0.99 0.005 240)',
    border: 'none',
    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
  }
  const ghost: CSSProperties = {
    background: 'var(--storynest-card)',
    color: 'var(--storynest-ink)',
    border: '1.5px solid var(--storynest-ink)',
    boxShadow: 'var(--shadow-sticker)',
  }
  const baseStyle = variant === 'sky' ? sky : ghost
  const shadowKey = variant === 'sky'
    ? '4px 4px 0 0 var(--storynest-sky-deep)'
    : 'var(--shadow-sticker)'
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        ...baseStyle,
        fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '-0.01em',
        // @ts-expect-error CSS var for focus ring
        '--tw-ring-color': 'var(--storynest-sky-deep)',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
        e.currentTarget.style.transform = 'translate(4px, 4px)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.boxShadow = shadowKey
        e.currentTarget.style.transform = 'translate(0, 0)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = shadowKey
        e.currentTarget.style.transform = 'translate(0, 0)'
      }}
    >
      {label}
    </button>
  )
}
