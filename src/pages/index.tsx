/**
 * Public landing — anonymous users see this.
 *
 * Hero + value rows are static. The "Showcase" section pulls the
 * admin-selected featured story from the public endpoint and lets
 * visitors flip through it (with narration) before signing in.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, AuthOverlay } from 'deepspace'
import { Hootie } from '../components/mascots/Hootie'
import { Cloud, Star, Sparkle, OpenBook } from '../components/decor'
import {
  PublicStoryReader,
  type PublicReaderBook,
  type PublicReaderPage,
} from '../components/storybook/PublicStoryReader'

interface FeaturedEnvelope {
  success: boolean
  data?: {
    book: PublicReaderBook
    pages: PublicReaderPage[]
  } | null
  error?: string
}

const HERO_BOB_STYLE = `
  @keyframes hootie-bob {
    0%   { transform: translateY(0px); }
    100% { transform: translateY(-8px); }
  }
  .hootie-bob { animation: hootie-bob 3s ease-in-out infinite alternate; }
`

export default function Landing() {
  const { isSignedIn } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [featured, setFeatured] = useState<
    { book: PublicReaderBook; pages: PublicReaderPage[] } | null
  >(null)
  const [featuredLoaded, setFeaturedLoaded] = useState(false)
  const [readerOpen, setReaderOpen] = useState(false)

  useEffect(() => {
    let canceled = false
    ;(async () => {
      try {
        const res = await fetch('/api/public/featured-story')
        if (!res.ok) return
        const body = (await res.json()) as FeaturedEnvelope
        if (canceled) return
        if (body.success && body.data) {
          setFeatured({ book: body.data.book, pages: body.data.pages })
        }
      } catch {
        /* no demo available — section just hides */
      } finally {
        if (!canceled) setFeaturedLoaded(true)
      }
    })()
    return () => {
      canceled = true
    }
  }, [])

  return (
    <div data-testid="landing" className="relative overflow-hidden">
      <style>{HERO_BOB_STYLE}</style>

      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Hero */}
        <section className="relative grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <Cloud
            size={120}
            color="var(--storynest-sky-soft)"
            style={{ position: 'absolute', top: -10, right: 10, opacity: 0.85, zIndex: 0 }}
          />
          <Sparkle
            size={28}
            color="var(--storynest-mint)"
            style={{ position: 'absolute', top: 30, left: '48%', opacity: 0.9, zIndex: 0 }}
          />
          <Star
            size={56}
            color="var(--storynest-sun)"
            style={{ position: 'absolute', bottom: -10, left: '52%', opacity: 0.9, zIndex: 0 }}
          />

          <div className="relative z-10">
            <h1
              className="font-display font-semibold leading-[1.05]"
              style={{
                color: 'var(--storynest-ink)',
                fontSize: 'clamp(40px, 6vw, 64px)',
              }}
            >
              Bedtime stories, made for one little reader.
            </h1>
            <p
              className="font-hand mt-4 text-[24px]"
              style={{ color: 'var(--storynest-coral-deep)' }}
            >
              — for your little reader
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <Link
                  to="/library"
                  data-testid="landing-cta-continue"
                  className="inline-flex items-center rounded-full px-6 py-3 font-display text-[16px] font-semibold text-white"
                  style={{
                    background: 'var(--storynest-sky)',
                    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
                  }}
                >
                  Open your library
                </Link>
              ) : (
                <button
                  data-testid="landing-cta-signin"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center rounded-full px-6 py-3 font-display text-[16px] font-semibold text-white"
                  style={{
                    background: 'var(--storynest-sky)',
                    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
                  }}
                >
                  Sign in to start
                </button>
              )}
              {featured && (
                <button
                  data-testid="landing-read-demo"
                  onClick={() => setReaderOpen(true)}
                  className="inline-flex items-center rounded-full px-5 py-3 font-display text-[15px] font-semibold"
                  style={{
                    background: 'var(--storynest-card)',
                    color: 'var(--storynest-ink)',
                    border: '1.5px solid var(--storynest-ink)',
                    boxShadow: 'var(--shadow-sticker)',
                  }}
                >
                  Try the demo
                </button>
              )}
            </div>
          </div>

          <div className="relative z-10 flex justify-center md:justify-end">
            <div className="hootie-bob relative">
              <Hootie variant="reading" size={260} />
            </div>
          </div>
        </section>

        {/* Showcase: live featured story */}
        {featured ? (
          <FeaturedShowcase
            book={featured.book}
            pageCount={featured.pages.length}
            onOpen={() => setReaderOpen(true)}
          />
        ) : featuredLoaded ? null : (
          <div className="mt-24 h-[200px]" aria-hidden />
        )}

        {/* Value rows */}
        <section className="mx-auto mt-24 max-w-2xl space-y-4">
          <ValueRow
            color="var(--storynest-sky-soft)"
            iconColor="var(--storynest-sky)"
            icon="open"
            title="Tell us your idea."
            body="A character, a feeling, a place — whatever your kid is into right now."
          />
          <ValueRow
            color="var(--storynest-sun-soft)"
            iconColor="var(--storynest-sun)"
            icon="star"
            title="We illustrate every page."
            body="Hand-drawn-style covers and scenes that match your story's mood."
          />
          <ValueRow
            color="var(--storynest-mint-soft)"
            iconColor="var(--storynest-mint)"
            icon="sparkle"
            title="We narrate it aloud."
            body="Warm audio you can play back any night, on any device."
          />
        </section>

        <p
          className="mt-16 text-center text-[13px]"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          A book takes about a minute to make.
        </p>
      </div>

      {authOpen && <AuthOverlay onClose={() => setAuthOpen(false)} />}
      {readerOpen && featured && (
        <PublicStoryReader
          book={featured.book}
          pages={featured.pages}
          onExit={() => setReaderOpen(false)}
          endCta={
            isSignedIn
              ? undefined
              : {
                  label: 'Make your own',
                  onClick: () => {
                    setReaderOpen(false)
                    setAuthOpen(true)
                  },
                }
          }
        />
      )}
    </div>
  )
}

function FeaturedShowcase({
  book,
  pageCount,
  onOpen,
}: {
  book: PublicReaderBook
  pageCount: number
  onOpen: () => void
}) {
  const coverUrl = book.coverImageKey
    ? `/api/public/files/${encodeURIComponent(book.coverImageKey)}`
    : null

  return (
    <section
      data-testid="landing-featured-showcase"
      className="mx-auto mt-24 max-w-3xl"
    >
      <div className="mb-6 text-center">
        <p
          className="text-[12px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          A book made with storynest
        </p>
        <h2
          className="mt-2 font-display text-[32px] font-semibold"
          style={{ color: 'var(--storynest-ink)' }}
        >
          {book.title}
        </h2>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="group block w-full"
      >
        <div
          className="mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white p-5 transition-transform group-hover:-translate-y-1"
          style={{
            border: '1.5px solid var(--storynest-rule)',
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          {coverUrl ? (
            <div
              className="w-full aspect-[3/4] overflow-hidden rounded-2xl"
              style={{ background: 'var(--storynest-paper-deep)' }}
            >
              <img
                src={coverUrl}
                alt={`Cover for ${book.title}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className="w-full aspect-[3/4] flex items-center justify-center rounded-2xl"
              style={{ background: 'var(--storynest-paper-deep)' }}
            >
              <span className="font-hand text-2xl" style={{ color: 'var(--storynest-ink-mute)' }}>
                no cover yet
              </span>
            </div>
          )}
          <div className="mt-4 text-center">
            <p
              className="font-display text-[18px] font-semibold"
              style={{ color: 'var(--storynest-ink)' }}
            >
              {book.title}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--storynest-ink-mute)' }}>
              {pageCount} page{pageCount === 1 ? '' : 's'} · tap to read
            </p>
          </div>
        </div>
      </button>
    </section>
  )
}

function ValueRow({
  color,
  iconColor,
  icon,
  title,
  body,
}: {
  color: string
  iconColor: string
  icon: 'open' | 'star' | 'sparkle'
  title: string
  body: string
}) {
  return (
    <div
      className="flex items-start gap-4 rounded-2xl bg-white p-4"
      style={{
        border: '1.5px solid var(--storynest-rule)',
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: color }}
      >
        {icon === 'open' && <OpenBook size={28} color={iconColor} />}
        {icon === 'star' && <Star size={26} color={iconColor} />}
        {icon === 'sparkle' && <Sparkle size={24} color={iconColor} />}
      </div>
      <div className="min-w-0">
        <div
          className="font-display text-[18px] font-semibold leading-tight"
          style={{ color: 'var(--storynest-ink)' }}
        >
          {title}
        </div>
        <div
          className="mt-1 text-[14px] leading-snug"
          style={{ color: 'var(--storynest-ink-soft)' }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}
