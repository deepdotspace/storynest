/**
 * Public landing — anonymous users see this.
 *
 * Hero: Fredoka tagline + Hootie reading, scattered Cloud / Star / Sparkle.
 * Showcase: two example BookCards.
 * Value rows: three sticker minis with decor icons.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, AuthOverlay } from 'deepspace'
import { BookCard } from '../components/storybook/BookCard'
import { Hootie } from '../components/mascots/Hootie'
import { Cloud, Star, Sparkle, OpenBook } from '../components/decor'
import type { Storybook } from '../lib/pipeline'

function mockBook(title: string): Storybook {
  return {
    title,
    prompt: '',
    characters: '',
    lesson: '',
    ageBand: '3-5',
    pageCount: 6,
    artStyle: 'watercolor',
    coverImageKey: '',
    status: 'ready',
    failureReason: '',
    progress: 100,
    visibility: 'public',
    characterSheet: '',
  }
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

  return (
    <div data-testid="landing" className="relative overflow-hidden">
      <style>{HERO_BOB_STYLE}</style>

      <div className="mx-auto max-w-5xl px-6 py-20">
        {/* Hero */}
        <section className="relative grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Background scatter (hero region) */}
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

          {/* LEFT: copy + CTA */}
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

            <div className="mt-8">
              {isSignedIn ? (
                <Link
                  to="/library"
                  data-testid="landing-cta-continue"
                  className="inline-flex items-center rounded-full px-6 py-3 font-display text-[16px] font-semibold text-white transition-transform active:translate-x-[4px] active:translate-y-[4px]"
                  style={{
                    background: 'var(--storynest-sky)',
                    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
                  }}
                >
                  Open your library
                </Link>
              ) : (
                <button
                  data-testid="landing-cta-signin"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center rounded-full px-6 py-3 font-display text-[16px] font-semibold text-white transition-transform active:translate-x-[4px] active:translate-y-[4px]"
                  style={{
                    background: 'var(--storynest-sky)',
                    boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0 transparent'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '4px 4px 0 0 var(--storynest-sky-deep)'
                  }}
                >
                  Sign in to start
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Hootie */}
          <div className="relative z-10 flex justify-center md:justify-end">
            <div className="hootie-bob relative">
              <Hootie variant="reading" size={260} />
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="mx-auto mt-24 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-2">
          <BookCard isCreate={false} bookId="demo-1" book={mockBook('The Brave Little Acorn')} />
          <BookCard isCreate={false} bookId="demo-2" book={mockBook('Mila and the Friendly Cloud')} />
        </section>

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
    </div>
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
