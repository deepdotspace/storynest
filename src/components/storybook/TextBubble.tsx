/**
 * The narration "callout" floating over the lower edge of a page's
 * illustration. Mounted always; only opacity toggles so layout never
 * jumps when the user hides the text.
 *
 * v2 chrome: white sticker card, hard-offset shadow, Nunito 24/500
 * (NOT italic, NOT EB-Garamond — those were the v1 cream-paper look).
 */

import { cn } from '../ui/utils'

interface TextBubbleProps {
  text: string
  visible: boolean
  className?: string
}

export function TextBubble({ text, visible, className }: TextBubbleProps) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none mx-auto w-full transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
      // Wide horizontal strip — fills most of the viewport so the
      // narration reads in 1–2 lines rather than wrapping into a tall
      // square. Capped at 1500px so it doesn't stretch to absurd
      // widths on ultra-wide screens.
      style={{ maxWidth: 1500 }}
    >
      <div
        className="px-7 py-4 sm:px-10 sm:py-5"
        style={{
          background: 'oklch(1 0 0 / 0.96)',
          border: '2px solid var(--storynest-sky-soft)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-sticker)',
          color: 'var(--storynest-ink)',
        }}
      >
        <p
          className="text-center"
          style={{
            fontFamily: 'var(--storynest-font-body, Nunito), system-ui, sans-serif',
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.45,
            fontStyle: 'normal',
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
