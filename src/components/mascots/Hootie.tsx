/**
 * Hootie — the storynest mascot. A small, friendly owl, three variants.
 * Inline SVG, never a raster image. Colors resolve via CSS vars so the
 * mascot tints correctly through theme changes.
 *
 * Anatomy per `.impeccable.md` § Mascot:
 *   - Body: lavender teardrop, 3px ink outline
 *   - Belly: cream oval, 1.5px ink outline
 *   - Eyes: large round white, ink iris with catch-light
 *   - Beak: triangular sun-deep
 *   - Books / branch under feet: hand-drawn stack in mint/coral/sky/sun
 */

import type { CSSProperties } from 'react'

export interface HootieProps {
  /** Which variant to render. */
  variant?: 'reading' | 'waving' | 'sleeping'
  /** Pixel size (height). Width is derived from the variant's aspect. */
  size?: number
  className?: string
  style?: CSSProperties
}

const INK = 'var(--storynest-ink, oklch(0.22 0.04 265))'
const LAV = 'var(--storynest-lavender, oklch(0.75 0.12 295))'
const LAV_DEEP = 'var(--storynest-lavender-deep, oklch(0.58 0.14 295))'
const CREAM = 'oklch(0.96 0.03 70)'
const SUN_DEEP = 'var(--storynest-sun-deep, oklch(0.72 0.16 78))'
const SUN = 'var(--storynest-sun, oklch(0.85 0.16 92))'
const MINT = 'var(--storynest-mint, oklch(0.78 0.12 165))'
const MINT_DEEP = 'var(--storynest-mint-deep, oklch(0.62 0.14 162))'
const CORAL = 'var(--storynest-coral, oklch(0.74 0.16 30))'
const SKY = 'var(--storynest-sky, oklch(0.72 0.15 235))'
const WHITE = 'oklch(0.99 0.005 240)'

export function Hootie({ variant = 'reading', size = 160, className, style }: HootieProps) {
  if (variant === 'reading') return <Reading size={size} className={className} style={style} />
  if (variant === 'waving') return <Waving size={size} className={className} style={style} />
  return <Sleeping size={size} className={className} style={style} />
}

function Reading({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  // viewBox 220 × 240 — body sitting on book stack
  const aspect = 220 / 240
  return (
    <svg
      viewBox="0 0 220 240"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size * aspect, height: size, display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      {/* Book stack — three colored hardcovers */}
      <rect x="34" y="200" width="152" height="22" rx="3" fill={CORAL} stroke={INK} strokeWidth="3" />
      <line x1="34" y1="208" x2="186" y2="208" stroke={INK} strokeWidth="1.5" />
      <rect x="22" y="180" width="176" height="22" rx="3" fill={SKY} stroke={INK} strokeWidth="3" />
      <line x1="22" y1="188" x2="198" y2="188" stroke={INK} strokeWidth="1.5" />
      <rect x="40" y="160" width="140" height="22" rx="3" fill={SUN} stroke={INK} strokeWidth="3" />
      <line x1="40" y1="168" x2="180" y2="168" stroke={INK} strokeWidth="1.5" />

      {/* Body — teardrop sitting on top */}
      <path
        d="M110 30
           C 60 30, 28 80, 28 130
           C 28 158, 50 168, 110 168
           C 170 168, 192 158, 192 130
           C 192 80, 160 30, 110 30 Z"
        fill={LAV}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Wing tufts on each side — flicked outward */}
      <path d="M40 110 C 26 122, 26 142, 38 152" stroke={LAV_DEEP} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M180 110 C 194 122, 194 142, 182 152" stroke={LAV_DEEP} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Ear tufts */}
      <path d="M70 38 L 64 18 L 78 30 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 38 L 156 18 L 142 30 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* Belly — cream oval */}
      <ellipse cx="110" cy="120" rx="48" ry="40" fill={CREAM} stroke={INK} strokeWidth="2" />

      {/* Eyes — closed in concentration (reading) — gentle arcs */}
      <path d="M70 92 C 78 84, 96 84, 102 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M118 92 C 124 84, 142 84, 150 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Beak */}
      <path
        d="M104 100 L 116 100 L 110 116 Z"
        fill={SUN_DEEP}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Tiny cheeks — coral blush */}
      <circle cx="74" cy="110" r="5" fill={CORAL} opacity="0.55" />
      <circle cx="146" cy="110" r="5" fill={CORAL} opacity="0.55" />

      {/* Open book held in wings — small detail at base of body */}
      <path d="M86 138 L 110 132 L 134 138 L 134 156 L 110 152 L 86 156 Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <line x1="110" y1="132" x2="110" y2="152" stroke={INK} strokeWidth="1.5" />
      <line x1="96" y1="144" x2="104" y2="142" stroke={INK} strokeWidth="1" />
      <line x1="116" y1="142" x2="124" y2="144" stroke={INK} strokeWidth="1" />
    </svg>
  )
}

function Waving({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  // viewBox 220 × 220 — head-and-shoulders, one wing raised
  const aspect = 220 / 220
  return (
    <svg
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size * aspect, height: size, display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      {/* Body teardrop */}
      <path
        d="M110 22
           C 60 22, 28 72, 28 122
           C 28 162, 60 200, 110 200
           C 160 200, 192 162, 192 122
           C 192 72, 160 22, 110 22 Z"
        fill={LAV}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Raised wing — coming up on the right */}
      <path
        d="M178 110
           C 210 92, 220 60, 200 40
           C 184 24, 168 36, 174 60
           C 178 80, 170 96, 176 110 Z"
        fill={LAV_DEEP}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Tucked wing on the left */}
      <path d="M40 110 C 26 122, 28 148, 44 158" stroke={LAV_DEEP} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Ear tufts */}
      <path d="M70 28 L 64 8 L 80 22 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M150 28 L 156 8 L 140 22 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* Belly */}
      <ellipse cx="110" cy="120" rx="50" ry="48" fill={CREAM} stroke={INK} strokeWidth="2" />

      {/* Eyes — open, friendly */}
      <circle cx="84" cy="92" r="14" fill={WHITE} stroke={INK} strokeWidth="2.5" />
      <circle cx="136" cy="92" r="14" fill={WHITE} stroke={INK} strokeWidth="2.5" />
      <circle cx="86" cy="94" r="6" fill={INK} />
      <circle cx="138" cy="94" r="6" fill={INK} />
      <circle cx="88" cy="91" r="1.6" fill={WHITE} />
      <circle cx="140" cy="91" r="1.6" fill={WHITE} />

      {/* Beak — friendly smile shape */}
      <path d="M102 108 L 118 108 L 110 122 Z" fill={SUN_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* Cheeks */}
      <circle cx="70" cy="118" r="6" fill={CORAL} opacity="0.6" />
      <circle cx="150" cy="118" r="6" fill={CORAL} opacity="0.6" />

      {/* Feet */}
      <line x1="92" y1="200" x2="92" y2="208" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="128" y1="200" x2="128" y2="208" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M86 208 L 98 208" stroke={SUN_DEEP} strokeWidth="4" strokeLinecap="round" />
      <path d="M122 208 L 134 208" stroke={SUN_DEEP} strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function Sleeping({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  // viewBox 220 × 200 — eyes closed, tiny zzz's drifting
  const aspect = 220 / 200
  return (
    <svg
      viewBox="0 0 220 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size * aspect, height: size, display: 'block', ...style }}
      className={className}
      aria-hidden="true"
    >
      {/* Body — slightly drooped */}
      <path
        d="M110 24
           C 60 24, 28 72, 28 116
           C 28 156, 60 184, 110 184
           C 160 184, 192 156, 192 116
           C 192 72, 160 24, 110 24 Z"
        fill={LAV}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Wings tucked in */}
      <path d="M40 110 C 26 124, 28 150, 46 160" stroke={LAV_DEEP} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M180 110 C 194 124, 192 150, 174 160" stroke={LAV_DEEP} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Ear tufts droop */}
      <path d="M72 30 L 66 14 L 80 22 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M148 30 L 154 14 L 140 22 Z" fill={LAV_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* Belly */}
      <ellipse cx="110" cy="116" rx="48" ry="44" fill={CREAM} stroke={INK} strokeWidth="2" />

      {/* Closed eyes — peaceful arcs with eyelash dots */}
      <path d="M68 92 C 78 100, 96 100, 104 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M116 92 C 124 100, 142 100, 152 92" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Beak */}
      <path d="M104 102 L 116 102 L 110 116 Z" fill={SUN_DEEP} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* Cheeks */}
      <circle cx="72" cy="116" r="5" fill={CORAL} opacity="0.5" />
      <circle cx="148" cy="116" r="5" fill={CORAL} opacity="0.5" />

      {/* Z z z drifting up */}
      <text x="170" y="42" fontFamily="Fredoka, sans-serif" fontSize="22" fontWeight="700" fill={MINT_DEEP}>z</text>
      <text x="186" y="22" fontFamily="Fredoka, sans-serif" fontSize="18" fontWeight="700" fill={MINT}>z</text>
      <text x="200" y="8" fontFamily="Fredoka, sans-serif" fontSize="14" fontWeight="700" fill={SKY} opacity="0.8">z</text>
    </svg>
  )
}
