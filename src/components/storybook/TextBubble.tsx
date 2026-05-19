/**
 * The narration "callout" that floats over the lower edge of a page's
 * illustration. Mounted always; only its opacity changes when toggled so
 * the surrounding layout doesn't jump.
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
        'pointer-events-none mx-auto w-full max-w-[720px] transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      <div
        className="rounded-2xl px-8 py-7 sm:px-10 sm:py-8 shadow-[0_2px_12px_rgba(33,42,80,0.06)]"
        style={{
          background: 'oklch(0.975 0.013 84 / 0.92)',
          borderColor: 'var(--storynest-rule)',
          borderWidth: 1,
          borderStyle: 'solid',
          color: 'var(--storynest-ink)',
        }}
      >
        <p
          className="font-serif italic text-center"
          style={{
            fontSize: '23px',
            lineHeight: 1.55,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
