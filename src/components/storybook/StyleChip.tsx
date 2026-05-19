/**
 * StyleChip — a selectable card in the wizard's art-style picker.
 * Visual mock of each style via small CSS — no AI imagery here.
 */

import { ART_STYLE_LABELS, type ArtStyle } from '../../plans'
import { cn } from '../ui'

interface StyleChipProps {
  style: ArtStyle
  selected: boolean
  onSelect: () => void
}

function Swatch({ style }: { style: ArtStyle }) {
  switch (style) {
    case 'watercolor':
      return (
        <div
          className="h-16 w-full rounded-md"
          style={{
            background:
              'radial-gradient(at 30% 40%, oklch(0.88 0.10 65 / 0.85), transparent 55%),' +
              'radial-gradient(at 70% 60%, oklch(0.82 0.09 200 / 0.65), transparent 55%),' +
              'oklch(0.96 0.02 84)',
          }}
        />
      )
    case 'paper-cutout':
      return (
        <div
          className="relative h-16 w-full rounded-md overflow-hidden"
          style={{ background: 'oklch(0.96 0.02 84)' }}
        >
          <div
            className="absolute"
            style={{
              left: '14%', top: '38%', width: '34%', height: '38%',
              background: 'oklch(0.78 0.155 72)', borderRadius: 3,
              boxShadow: '2px 2px 0 oklch(0.22 0.035 265 / 0.08)',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '44%', top: '20%', width: '40%', height: '52%',
              background: 'oklch(0.72 0.075 150)', borderRadius: 3,
              boxShadow: '2px 2px 0 oklch(0.22 0.035 265 / 0.08)',
            }}
          />
        </div>
      )
    case 'soft-pastel':
      return (
        <div
          className="h-16 w-full rounded-md"
          style={{
            background:
              'linear-gradient(135deg, oklch(0.92 0.06 350), oklch(0.92 0.06 220))',
          }}
        />
      )
    case 'classic-ink':
      return (
        <div
          className="relative h-16 w-full rounded-md overflow-hidden"
          style={{ background: 'oklch(0.97 0.01 84)' }}
        >
          <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full">
            <path
              d="M5 50 Q 25 10, 50 35 T 95 25"
              fill="none"
              stroke="oklch(0.22 0.035 265)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="30" cy="38" r="3" fill="oklch(0.72 0.135 22 / 0.6)" />
          </svg>
        </div>
      )
  }
}

export function StyleChip({ style, selected, onSelect }: StyleChipProps) {
  return (
    <button
      type="button"
      data-testid={`style-chip-${style}`}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'text-left rounded-lg p-3 transition-colors',
        'bg-card hover:bg-accent/40',
      )}
      style={{
        border: selected
          ? `2px solid var(--storynest-marigold)`
          : `1px solid var(--storynest-rule)`,
        boxShadow: selected ? '0 0 0 3px oklch(0.78 0.155 72 / 0.18)' : undefined,
      }}
    >
      <Swatch style={style} />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}>
          {ART_STYLE_LABELS[style]}
        </span>
        {selected && (
          <span
            className="text-[11px] font-medium"
            style={{ color: 'var(--storynest-sage)' }}
            aria-hidden
          >
            ✓
          </span>
        )}
      </div>
    </button>
  )
}
