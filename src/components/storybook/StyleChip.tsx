/**
 * StyleChip — a selectable card in the wizard's art-style picker.
 * Bigger sticker card with an illustrated swatch (top) and label (bottom).
 * Selected state lifts with a lavender ring and a coral check.
 */

import { ART_STYLE_LABELS, type ArtStyle } from '../../plans'
import { cn } from '../ui'

interface StyleChipProps {
  style: ArtStyle
  selected: boolean
  onSelect: () => void
}

const INK = 'var(--storynest-ink)'

function Swatch({ style }: { style: ArtStyle }) {
  switch (style) {
    case 'watercolor':
      return (
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(at 30% 38%, var(--storynest-sky-soft) 0%, transparent 58%),' +
              'radial-gradient(at 72% 64%, var(--storynest-coral-soft) 0%, transparent 58%),' +
              'var(--storynest-card-soft)',
          }}
        >
          <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden="true">
            <circle cx="22" cy="24" r="13" fill="var(--storynest-sky)" opacity="0.55" />
            <circle cx="36" cy="36" r="14" fill="var(--storynest-coral)" opacity="0.50" />
          </svg>
        </div>
      )
    case 'paper-cutout':
      return (
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: 'var(--storynest-card-soft)' }}
        >
          <div
            className="absolute"
            style={{
              left: '16%', top: '34%', width: '36%', height: '46%',
              background: 'var(--storynest-mint)', borderRadius: 4,
              boxShadow: '3px 3px 0 0 var(--storynest-ink) / 0.16',
              border: '1.5px solid var(--storynest-ink)',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '46%', top: '20%', width: '38%', height: '52%',
              background: 'var(--storynest-sun)', borderRadius: 4,
              boxShadow: '3px 3px 0 0 oklch(0.22 0.04 265 / 0.16)',
              border: '1.5px solid var(--storynest-ink)',
            }}
          />
        </div>
      )
    case 'soft-pastel':
      return (
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: 'var(--storynest-lavender-soft)' }}
        >
          <div
            className="absolute"
            style={{
              left: '14%', top: '30%', width: '40%', height: '50%',
              background: 'var(--storynest-bubblegum)',
              opacity: 0.55,
              borderRadius: '50%',
              filter: 'blur(2px)',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '46%', top: '22%', width: '42%', height: '54%',
              background: 'var(--storynest-lavender)',
              opacity: 0.65,
              borderRadius: '50%',
              filter: 'blur(2px)',
            }}
          />
        </div>
      )
    case 'classic-ink':
      return (
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ background: 'var(--storynest-sun-soft)' }}
        >
          <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path
              d="M12 16 C 28 8, 42 8, 48 22 C 54 36, 70 40, 86 32"
              fill="none"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M18 44 Q 32 30, 50 42 T 84 46"
              fill="none"
              stroke={INK}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="48" cy="22" r="4.5" fill="var(--storynest-coral)" opacity="0.7" />
          </svg>
        </div>
      )
  }
}

function CheckBadge() {
  return (
    <span
      aria-hidden
      className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full"
      style={{
        background: 'var(--storynest-coral)',
        border: `2px solid ${INK}`,
        boxShadow: '2px 2px 0 0 oklch(0.22 0.04 265 / 0.14)',
        color: 'oklch(0.99 0.005 240)',
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M3 8.5 L 7 12 L 13 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function StyleChip({ style, selected, onSelect }: StyleChipProps) {
  return (
    <button
      type="button"
      data-testid={`style-chip-${style}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col overflow-hidden text-left transition-transform',
        selected ? '-translate-y-0.5' : 'hover:-translate-y-0.5',
      )}
      style={{
        minHeight: 130,
        background: 'var(--storynest-card)',
        borderRadius: 20,
        border: selected
          ? '2.5px solid var(--storynest-lavender-deep)'
          : '1.5px solid var(--storynest-rule)',
        boxShadow: selected ? 'var(--shadow-sticker-hover)' : 'var(--shadow-sticker)',
      }}
    >
      <div className="relative h-[78px] w-full">
        <Swatch style={style} />
        {selected && <CheckBadge />}
      </div>
      <div
        className="flex items-center px-4 py-3"
        style={{
          borderTop: '1.5px solid var(--storynest-rule)',
          background: 'var(--storynest-card)',
        }}
      >
        <span
          className="font-display text-[16px]"
          style={{
            color: 'var(--storynest-ink)',
            fontWeight: 600,
          }}
        >
          {ART_STYLE_LABELS[style]}
        </span>
      </div>
    </button>
  )
}
