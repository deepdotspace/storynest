/**
 * PublicStoryReader — the immersive reader for the unauthenticated landing-
 * page demo.
 *
 * Mirrors StoryReader's keyboard nav + cover/body/end index space, but
 * resolves images and audio through the unauthenticated
 * `/api/public/files/<key>` endpoint instead of the authenticated SDK
 * blob-URL flow. Anonymous visitors can flip pages and hear narration
 * without a sign-in.
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
  Captions as CaptionsIcon,
} from 'lucide-react'
import { Sparkle, Star, Cloud } from '../decor'
import { cn } from '../ui/utils'
import { useReaderSettings } from '../../lib/useReaderSettings'
import {
  CaptionStrip,
  captionStripLeftOffset,
  CAPTION_STRIP_TRANSITION,
} from './CaptionStrip'

export interface PublicReaderBook {
  recordId: string
  title: string
  characters?: string
  coverImageKey?: string | null
}

export interface PublicReaderPage {
  recordId: string
  pageNumber: number
  text: string
  imageKey?: string | null
  audioKey?: string | null
}

interface PublicStoryReaderProps {
  book: PublicReaderBook
  pages: PublicReaderPage[]
  onExit: () => void
  /** CTA in the End view — usually "Sign in to make your own". */
  endCta?: { label: string; onClick: () => void }
}

function publicFileUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return `/api/public/files/${encodeURIComponent(key)}`
}

export function PublicStoryReader({
  book,
  pages,
  onExit,
  endCta,
}: PublicStoryReaderProps) {
  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.pageNumber - b.pageNumber),
    [pages],
  )
  const N = sortedPages.length
  const lastIndex = N + 1

  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [textVisible, setTextVisible] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const {
    captionsEnabled,
    captionsCollapsed,
    toggleCaptions,
    toggleCollapsed,
  } = useReaderSettings()

  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), [])
  const goNext = useCallback(
    () => setCurrentIndex((i) => Math.min(lastIndex, i + 1)),
    [lastIndex],
  )

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
      } else if (e.key === 'c' || e.key === 'C') {
        toggleCaptions()
      } else if (e.key === '[') {
        if (captionsEnabled) toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onExit, toggleCaptions, toggleCollapsed, captionsEnabled])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const onBodyPage = currentIndex >= 1 && currentIndex <= N
  const currentBodyPage = onBodyPage ? sortedPages[currentIndex - 1] : null
  const currentAudioSrc = onBodyPage ? publicFileUrl(currentBodyPage?.audioKey) : null

  // Autoplay current page audio when index changes.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.muted = muted
    if (!currentAudioSrc) return
    el.currentTime = 0
    el.play().catch(() => { /* browser may block autoplay until user gesture */ })
  }, [currentAudioSrc, muted])

  const onImageClick = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => { /* ignore */ })
  }, [])

  const content: ReactNode = (
    <div
      data-testid="public-reader-root"
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{
        background: 'var(--storynest-bg)',
        color: 'var(--storynest-ink)',
      }}
    >
      {currentAudioSrc && (
        <audio
          ref={audioRef}
          src={currentAudioSrc}
          preload="auto"
          muted={muted}
        />
      )}

      <button
        type="button"
        data-testid="public-reader-exit"
        onClick={onExit}
        className="absolute top-5 z-20 inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition-all hover:-translate-y-0.5 focus:outline-none"
        style={{
          left: captionStripLeftOffset(captionsEnabled, captionsCollapsed),
          transition: `${CAPTION_STRIP_TRANSITION}, transform 150ms, box-shadow 150ms`,
          background: 'var(--storynest-card)',
          color: 'var(--storynest-ink)',
          border: '1.5px solid var(--storynest-rule)',
          boxShadow: 'var(--shadow-sticker)',
          fontFamily: 'var(--storynest-font-body, Nunito), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        <XIcon className="h-4 w-4" aria-hidden />
        <span>Close</span>
      </button>

      {currentIndex !== 0 && currentIndex !== lastIndex && (
        <div className="absolute right-5 top-5 z-20 flex items-center gap-2.5">
          <ChromeIconButton
            label={captionsEnabled ? 'Hide caption strip' : 'Show caption strip on the left'}
            pressed={captionsEnabled}
            onClick={toggleCaptions}
          >
            <CaptionsIcon className="h-4 w-4" aria-hidden />
          </ChromeIconButton>
          {!captionsEnabled && (
            <ChromeIconButton
              label={textVisible ? 'Hide text' : 'Show text'}
              pressed={!textVisible}
              onClick={() => setTextVisible((v) => !v)}
            >
              {textVisible ? <Type className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
            </ChromeIconButton>
          )}
          <ChromeIconButton
            label={muted ? 'Unmute' : 'Mute'}
            pressed={muted}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          </ChromeIconButton>
        </div>
      )}

      {captionsEnabled && currentIndex !== 0 && currentIndex !== lastIndex && currentBodyPage && (
        <CaptionStrip
          text={currentBodyPage.text}
          pageIndex={currentIndex}
          pageTotal={N}
          collapsed={captionsCollapsed}
          onToggleCollapsed={toggleCollapsed}
          bookTitle={book.title}
        />
      )}

      {currentIndex === 0 ? (
        <CoverView book={book} onStart={goNext} />
      ) : currentIndex === lastIndex ? (
        <EndView onReplay={() => setCurrentIndex(0)} onExit={onExit} endCta={endCta} />
      ) : (
        <BodyView
          page={currentBodyPage!}
          index={currentIndex}
          total={N}
          textVisible={textVisible && !captionsEnabled}
          onImageClick={onImageClick}
        />
      )}

      {currentIndex !== 0 && currentIndex !== lastIndex && (
        <>
          <ArrowButton
            label="Previous page"
            direction="left"
            disabled={currentIndex <= 0}
            onClick={goPrev}
            leftOffsetPx={captionStripLeftOffset(captionsEnabled, captionsCollapsed)}
          />
          <ArrowButton
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

function CoverView({ book, onStart }: { book: PublicReaderBook; onStart: () => void }) {
  const firstName = book.characters?.trim().split(/[\s,]+/)[0]
  const byline = firstName ? `for ${firstName}` : 'a story'
  const coverUrl = publicFileUrl(book.coverImageKey)

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
      <Cloud size={140} style={{ position: 'absolute', top: '8%', left: '6%', opacity: 0.35 }} />
      <Cloud size={110} style={{ position: 'absolute', top: '14%', right: '8%', opacity: 0.3 }} />
      <Star size={48} style={{ position: 'absolute', bottom: '14%', left: '12%', opacity: 0.4 }} />
      <Star size={36} style={{ position: 'absolute', bottom: '22%', right: '14%', opacity: 0.4 }} />

      <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
        <h1
          className="text-center"
          style={{
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 600,
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

        {coverUrl && (
          <div
            className="mt-8 w-full max-w-[420px] aspect-[3/4] overflow-hidden"
            style={{
              background: 'var(--storynest-card)',
              border: '1.5px solid var(--storynest-rule)',
              borderRadius: 24,
              boxShadow: 'var(--shadow-sticker)',
            }}
          >
            <img
              src={coverUrl}
              alt={`Cover for ${book.title}`}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          className="mt-10 inline-flex items-center justify-center rounded-full px-7 py-3.5 transition-all"
          style={{
            background: 'var(--storynest-sky)',
            color: 'white',
            border: 'none',
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 18,
            boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
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
  page: PublicReaderPage
  index: number
  total: number
  textVisible: boolean
  onImageClick: () => void
}) {
  const url = publicFileUrl(page.imageKey)
  return (
    <div className="absolute inset-0">
      <button
        type="button"
        onClick={onImageClick}
        aria-label="Replay narration"
        className="absolute inset-0 block w-full h-full focus:outline-none"
      >
        {url ? (
          <img
            src={url}
            alt={`Illustration for page ${index} of ${total}`}
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center top' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ background: 'var(--storynest-paper-deep)' }}
          >
            <span className="font-hand text-2xl" style={{ color: 'var(--storynest-ink-mute)' }}>
              Illustration coming soon
            </span>
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, oklch(0.985 0.008 240 / 0.55), oklch(0.985 0.008 240 / 0))',
          }}
        />
      </button>

      {textVisible && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 sm:bottom-16 z-10 px-6 flex justify-center">
          <div
            className="rounded-2xl px-7 py-4 sm:px-10 sm:py-5 text-center w-full"
            style={{
              maxWidth: 1500,
              background: 'oklch(0.985 0.008 240 / 0.96)',
              border: '2px solid var(--storynest-sky-soft)',
              boxShadow: 'var(--shadow-sticker)',
              fontFamily: 'var(--storynest-font-body, Nunito), system-ui, sans-serif',
              fontSize: 22,
              lineHeight: 1.45,
              color: 'var(--storynest-ink)',
            }}
          >
            {page.text}
          </div>
        </div>
      )}
    </div>
  )
}

function EndView({
  onReplay,
  onExit,
  endCta,
}: {
  onReplay: () => void
  onExit: () => void
  endCta?: { label: string; onClick: () => void }
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
      <div className="relative inline-flex items-center justify-center">
        <Sparkle size={32} style={{ position: 'absolute', top: -28, left: -36, opacity: 0.9 }} />
        <Sparkle size={24} style={{ position: 'absolute', top: -10, right: -40, opacity: 0.85 }} color="var(--storynest-sun)" />
        <Sparkle size={28} style={{ position: 'absolute', bottom: -22, right: -28, opacity: 0.85 }} color="var(--storynest-coral)" />
        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
            fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 600,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          The End
        </h2>
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        {endCta && (
          <PillButton onClick={endCta.onClick} variant="sky" label={endCta.label} />
        )}
        <PillButton onClick={onReplay} variant="ghost" label="Read again" />
        <PillButton onClick={onExit} variant="ghost" label="Close" />
      </div>
    </div>
  )
}

function ArrowButton({
  label,
  direction,
  disabled,
  onClick,
  leftOffsetPx,
}: {
  label: string
  direction: 'left' | 'right'
  disabled: boolean
  onClick: () => void
  leftOffsetPx?: number
}) {
  const Icon = direction === 'left' ? ArrowLeft : ArrowRight
  const positionStyle =
    direction === 'left' && typeof leftOffsetPx === 'number'
      ? { left: leftOffsetPx, transition: `${CAPTION_STRIP_TRANSITION}, transform 150ms` }
      : undefined
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'absolute bottom-6 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-all',
        direction === 'left' && typeof leftOffsetPx !== 'number' && 'left-5',
        direction === 'right' && 'right-5',
        'disabled:opacity-30 disabled:cursor-not-allowed hover:-translate-y-0.5',
      )}
      style={{
        ...positionStyle,
        background: 'var(--storynest-card)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-ink)',
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  )
}

function ChromeIconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
      style={{
        background: pressed ? 'var(--storynest-sky-soft)' : 'var(--storynest-card)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-ink)',
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      {children}
    </button>
  )
}

function PillButton({
  onClick,
  variant,
  label,
}: {
  onClick: () => void
  variant: 'sky' | 'ghost'
  label: string
}) {
  const sky = {
    background: 'var(--storynest-sky)',
    color: 'white',
    border: 'none',
    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
  } as const
  const ghost = {
    background: 'var(--storynest-card)',
    color: 'var(--storynest-ink)',
    border: '1.5px solid var(--storynest-ink)',
    boxShadow: 'var(--shadow-sticker)',
  } as const
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full px-6 py-3 transition-all"
      style={{
        ...(variant === 'sky' ? sky : ghost),
        fontFamily: 'var(--storynest-font-display, Fredoka), system-ui, sans-serif',
        fontWeight: 600,
        fontSize: 16,
      }}
    >
      {label}
    </button>
  )
}
