/**
 * StoryReader — the immersive picture-book mode.
 *
 * Renders into a portal at document.body so the app's top nav is hidden
 * without ripping it from the React tree. Owns:
 *   - currentIndex (0 = cover, 1..N = body pages, N+1 = end card)
 *   - muted / textVisible UI toggles
 *   - keyboard nav (← → space M T Esc)
 *   - audio playback via AudioPlayer
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
        background: 'var(--storynest-paper)',
        color: 'var(--storynest-ink)',
      }}
    >
      <AudioPlayer
        ref={audioRef}
        src={currentAudioSrc}
        muted={muted}
        pageKey={currentIndex}
      />

      {/* Top-left: exit */}
      <button
        type="button"
        data-testid="reader-exit"
        onClick={onExit}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2"
        style={{
          color: 'var(--storynest-ink-mute)',
          // @ts-expect-error CSS var for focus ring
          '--tw-ring-color': 'var(--storynest-marigold)',
        }}
        aria-label="Exit reader and return to library"
      >
        <XIcon className="h-4 w-4" aria-hidden />
        <span>Library</span>
      </button>

      {/* Top-right: text toggle + mute */}
      {currentIndex !== 0 && currentIndex !== lastIndex && (
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
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
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 select-none"
            style={{
              fontSize: 12,
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
      <div className="flex flex-col items-center max-w-3xl w-full">
        <h1
          className="font-serif text-center"
          style={{
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 500,
            lineHeight: 1.15,
            color: 'var(--storynest-ink)',
          }}
        >
          {book.title}
        </h1>
        <p
          className="font-hand mt-3"
          style={{
            fontSize: 28,
            color: 'var(--storynest-ink-soft)',
          }}
        >
          {byline}
        </p>

        {book.coverImageKey ? (
          <div
            className="mt-8 w-full max-w-[420px] aspect-[3/4] rounded-lg overflow-hidden"
            style={{
              background: 'var(--storynest-paper-deep)',
              borderColor: 'var(--storynest-rule)',
              borderWidth: 1,
              borderStyle: 'solid',
              boxShadow: '0 2px 12px rgba(33,42,80,0.10)',
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
          className="mt-10 inline-flex items-center justify-center rounded-lg px-6 py-3 text-[14px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            background: 'var(--storynest-marigold)',
            color: 'var(--storynest-paper)',
            letterSpacing: '-0.01em',
            boxShadow: '0 2px 8px rgba(33,42,80,0.12)',
            // @ts-expect-error CSS var for focus ring
            '--tw-ring-color': 'var(--storynest-marigold-d)',
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
        {/* Soft gradient under the text bubble for legibility — paper to transparent */}
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, oklch(0.975 0.013 84 / 0.55), oklch(0.975 0.013 84 / 0))',
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
      <div
        className="font-serif italic text-center"
        style={{
          fontSize: 'clamp(36px, 5vw, 48px)',
          color: 'var(--storynest-ink)',
        }}
      >
        The End
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-[14px] font-medium"
          style={{
            background: 'var(--storynest-marigold)',
            color: 'var(--storynest-paper)',
            letterSpacing: '-0.01em',
            boxShadow: '0 2px 8px rgba(33,42,80,0.12)',
          }}
        >
          Read again
        </button>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-[14px] font-medium border"
          style={{
            background: 'transparent',
            color: 'var(--storynest-ink)',
            borderColor: 'var(--storynest-rule)',
            letterSpacing: '-0.01em',
          }}
        >
          Back to library
        </button>
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
        'group absolute bottom-6 z-20 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200',
        direction === 'left' ? 'left-5' : 'right-5',
        'opacity-60 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:opacity-100',
      )}
      style={{
        background: 'var(--storynest-paper-deep)',
        color: 'var(--storynest-ink)',
        borderColor: 'var(--storynest-rule)',
        borderWidth: 1,
        borderStyle: 'solid',
        boxShadow: '0 1px 4px rgba(33,42,80,0.08)',
      }}
    >
      <Icon className="h-4 w-4" aria-hidden />
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
        'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150',
        'hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        pressed ? 'opacity-100' : 'opacity-70',
      )}
      style={{
        background: 'var(--storynest-paper-deep)',
        color: 'var(--storynest-ink)',
        borderColor: 'var(--storynest-rule)',
        borderWidth: 1,
        borderStyle: 'solid',
        // @ts-expect-error CSS var for focus ring
        '--tw-ring-color': 'var(--storynest-marigold)',
      }}
    >
      {children}
    </button>
  )
}
