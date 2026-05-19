/**
 * Public landing — anonymous users see this.
 * Signed-in users get a "Continue to library" CTA, anonymous gets sign-in.
 *
 * No emojis, no "AI" / "magic" / "sparkle" language. The hero is the tagline.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, AuthOverlay } from 'deepspace'
import { BookCard } from '../components/storybook/BookCard'
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

export default function Landing() {
  const { isSignedIn } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div
      data-testid="landing"
      className="mx-auto max-w-5xl px-6 py-16 sm:py-24"
    >
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <h1
          className="font-serif italic text-[33px] leading-[1.15] sm:text-[40px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Bedtime stories, made for one little reader.
        </h1>
        <p
          className="font-hand mt-3 text-[22px] sm:text-[26px]"
          style={{ color: 'var(--storynest-marigold-d, var(--storynest-marigold))' }}
        >
          — for your little reader
        </p>

        <div className="mt-10 flex items-center justify-center">
          {isSignedIn ? (
            <Link
              to="/library"
              data-testid="landing-cta-continue"
              className="inline-flex items-center rounded-md px-6 py-3 text-sm font-medium transition-shadow hover:shadow-[0_2px_8px_oklch(0.22_0.035_265_/_0.12)]"
              style={{
                background: 'var(--storynest-marigold)',
                color: 'oklch(0.18 0.04 60)',
              }}
            >
              Open your library
            </Link>
          ) : (
            <button
              data-testid="landing-cta-signin"
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center rounded-md px-6 py-3 text-sm font-medium transition-shadow hover:shadow-[0_2px_8px_oklch(0.22_0.035_265_/_0.12)]"
              style={{
                background: 'var(--storynest-marigold)',
                color: 'oklch(0.18 0.04 60)',
              }}
            >
              Sign in to start
            </button>
          )}
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-8 sm:mt-24 sm:grid-cols-2">
        <BookCard isCreate={false} bookId="demo-1" book={mockBook('The Brave Little Acorn')} />
        <BookCard isCreate={false} bookId="demo-2" book={mockBook('Mila and the Friendly Cloud')} />
      </section>

      {/* Value lines */}
      <section className="mx-auto mt-20 max-w-md space-y-4 text-center sm:mt-24">
        <p
          className="font-serif text-[20px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Tell us your idea.
        </p>
        <p
          className="font-serif text-[20px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          We illustrate every page.
        </p>
        <p
          className="font-serif text-[20px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          We read it out loud.
        </p>
      </section>

      <div className="mt-20 flex justify-center sm:mt-24">
        <div
          className="h-px w-24"
          style={{ background: 'var(--storynest-rule)' }}
          aria-hidden
        />
      </div>

      <p
        className="mt-8 text-center text-xs"
        style={{ color: 'var(--storynest-ink-mute)' }}
      >
        A book takes about a minute to make.
      </p>

      {authOpen && <AuthOverlay onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
