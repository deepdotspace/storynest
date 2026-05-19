/**
 * InteractiveMascot — wrap Hootie so the user can tap him.
 *
 * On tap:
 *   1. Cycle to the next phrase in `phrases` and show a speech bubble
 *      above the mascot for ~3 seconds.
 *   2. Trigger a one-shot wiggle on the mascot itself (rotate + scale,
 *      see `mascot-wiggle` keyframes in styles.css). The wiggle plays
 *      ON TOP of the ambient `bob` / `sway` / `float` animation via
 *      nested divs — each animates its own transform so they compose.
 *
 * Accessibility:
 *   - The mascot is wrapped in a real <button> with an aria-label.
 *   - Keyboard-activated (Enter / Space) fires the same handler.
 *   - prefers-reduced-motion users get static phases (no wiggle, no
 *     bubble pop animation — but the bubble still appears).
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Hootie, type HootieProps } from './Hootie'
import { cn } from '../ui/utils'

interface InteractiveMascotProps {
  variant: NonNullable<HootieProps['variant']>
  size: number
  /** CSS class that applies an ambient animation (e.g. 'mascot-bob'). */
  ambientAnim?: string
  /** Phrases shown in the speech bubble, cycled in order on each tap. */
  phrases: readonly string[]
  /** Persistent Caveat byline shown under the mascot. */
  byline?: string
  bylineColor?: string
  /** ARIA label for the button. Should describe what tapping does. */
  ariaLabel?: string
  className?: string
  style?: CSSProperties
}

export function InteractiveMascot({
  variant,
  size,
  ambientAnim,
  phrases,
  byline,
  bylineColor,
  ariaLabel = 'Tap Hootie for a hint',
  className,
  style,
}: InteractiveMascotProps) {
  const [bubbleText, setBubbleText] = useState<string | null>(null)
  // Bumped on every tap. Used as a React key on the wiggle div + bubble div
  // so React remounts them — which restarts each one-shot animation.
  const [tapKey, setTapKey] = useState(0)
  const phraseIdxRef = useRef(0)
  const hideTimerRef = useRef<number | null>(null)

  function handleTap() {
    if (phrases.length === 0) return
    const text = phrases[phraseIdxRef.current % phrases.length]
    phraseIdxRef.current += 1
    setBubbleText(text)
    setTapKey((k) => k + 1)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setBubbleText(null), 3200)
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      style={style}
    >
      {bubbleText && (
        <SpeechBubble key={tapKey} text={bubbleText} />
      )}

      <button
        type="button"
        onClick={handleTap}
        aria-label={ariaLabel}
        className="cursor-pointer rounded-full bg-transparent p-0 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          // Tailwind v4 doesn't pick up dynamic --tw-ring-color from
          // arbitrary CSS vars cleanly; set it as a style for safety.
          // @ts-expect-error CSS var
          '--tw-ring-color': 'var(--storynest-lavender)',
        }}
      >
        <div className={ambientAnim || undefined}>
          {/* Inner remounts on every tap so `mascot-wiggle` replays. */}
          <div key={tapKey} className={tapKey > 0 ? 'mascot-wiggle' : undefined}>
            <Hootie variant={variant} size={size} />
          </div>
        </div>
      </button>

      {byline && (
        <div
          className="font-hand mt-2 select-none text-center text-[18px]"
          style={{ color: bylineColor ?? 'var(--storynest-ink-mute)' }}
        >
          {byline}
        </div>
      )}
    </div>
  )
}

function SpeechBubble({ text }: { text: string }) {
  return (
    <div
      className="mascot-bubble-in pointer-events-none absolute left-1/2 z-10"
      style={{ top: -10, transform: 'translate(-50%, -100%)' }}
    >
      <div className="relative">
        <div
          className="whitespace-nowrap rounded-2xl px-4 py-2 text-[14px] font-semibold"
          style={{
            background: 'white',
            color: 'var(--storynest-ink)',
            border: '1.5px solid var(--storynest-rule)',
            boxShadow: 'var(--shadow-sticker)',
            fontFamily: 'Nunito, system-ui, sans-serif',
            maxWidth: 220,
          }}
        >
          {text}
        </div>
        {/* Tail — two stacked triangles to fake a 1.5px outlined tail
            (border-color version below, white fill version on top). */}
        <div
          aria-hidden
          className="absolute left-1/2"
          style={{
            bottom: -10,
            width: 0,
            height: 0,
            transform: 'translateX(-50%)',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid var(--storynest-rule)',
          }}
        />
        <div
          aria-hidden
          className="absolute left-1/2"
          style={{
            bottom: -8,
            width: 0,
            height: 0,
            transform: 'translateX(-50%)',
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '9px solid white',
          }}
        />
      </div>
    </div>
  )
}
