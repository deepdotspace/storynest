/**
 * Decorative SVGs scattered as page accents — clouds, stars, hearts,
 * moons, books, rainbows, sparkles. They are never functional icons.
 *
 * Usage: position absolutely behind interactive content, 80-90%
 * opacity, 3-6 per surface max. See `.impeccable.md` § Decorative shapes.
 */

import type { CSSProperties } from 'react'

interface DecorProps {
  size?: number
  className?: string
  style?: CSSProperties
  color?: string
}

const INK = 'var(--storynest-ink, oklch(0.22 0.04 265))'

export function Cloud({ size = 96, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-sky-soft, oklch(0.93 0.05 235))'
  return (
    <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size * (70 / 120), ...style }} className={className} aria-hidden="true">
      <path
        d="M28 50 C 12 50, 12 30, 28 30 C 28 14, 50 14, 56 24 C 62 14, 84 14, 88 30 C 104 30, 104 50, 88 50 Z"
        fill={fill}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Star({ size = 56, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-sun, oklch(0.85 0.16 92))'
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size, ...style }} className={className} aria-hidden="true">
      <path
        d="M32 6 L 39.5 24.5 L 60 27 L 44.5 41 L 49 60 L 32 50 L 15 60 L 19.5 41 L 4 27 L 24.5 24.5 Z"
        fill={fill}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Heart({ size = 48, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-coral, oklch(0.74 0.16 30))'
  return (
    <svg viewBox="0 0 64 60" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size * (60 / 64), ...style }} className={className} aria-hidden="true">
      <path
        d="M32 56 L 6 32 C -2 22, 8 6, 22 12 C 26 14, 30 18, 32 22 C 34 18, 38 14, 42 12 C 56 6, 66 22, 58 32 Z"
        fill={fill}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Moon({ size = 72, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-lavender, oklch(0.75 0.12 295))'
  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size, ...style }} className={className} aria-hidden="true">
      <path
        d="M52 14 C 28 14, 14 30, 14 48 C 14 64, 28 76, 46 76 C 32 70, 22 56, 22 42 C 22 28, 34 18, 52 14 Z"
        fill={fill}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Tiny sleepy face */}
      <path d="M28 42 C 31 46, 35 46, 38 42" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="52" r="3" fill="var(--storynest-coral, oklch(0.74 0.16 30))" opacity="0.65" />
    </svg>
  )
}

export function OpenBook({ size = 80, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-card, oklch(1 0 0))'
  const spine = 'var(--storynest-coral, oklch(0.74 0.16 30))'
  return (
    <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size * (70 / 100), ...style }} className={className} aria-hidden="true">
      <path d="M8 16 L 50 8 L 50 60 L 8 64 Z" fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M92 16 L 50 8 L 50 60 L 92 64 Z" fill={fill} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="50" y1="8" x2="50" y2="60" stroke={spine} strokeWidth="3" />
      <line x1="18" y1="24" x2="40" y2="20" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <line x1="18" y1="32" x2="42" y2="28" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <line x1="60" y1="20" x2="82" y2="24" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <line x1="58" y1="28" x2="82" y2="32" stroke={INK} strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

export function Rainbow({ size = 120, className, style }: DecorProps) {
  return (
    <svg viewBox="0 0 140 80" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size * (80 / 140), ...style }} className={className} aria-hidden="true">
      <path d="M10 76 A 60 60 0 0 1 130 76" fill="none" stroke="var(--storynest-coral)" strokeWidth="10" strokeLinecap="round" />
      <path d="M22 76 A 48 48 0 0 1 118 76" fill="none" stroke="var(--storynest-sun)" strokeWidth="10" strokeLinecap="round" />
      <path d="M34 76 A 36 36 0 0 1 106 76" fill="none" stroke="var(--storynest-mint)" strokeWidth="10" strokeLinecap="round" />
      <path d="M46 76 A 24 24 0 0 1 94 76" fill="none" stroke="var(--storynest-sky)" strokeWidth="10" strokeLinecap="round" />
      <path d="M58 76 A 12 12 0 0 1 82 76" fill="none" stroke="var(--storynest-lavender)" strokeWidth="10" strokeLinecap="round" />
    </svg>
  )
}

export function Sparkle({ size = 28, className, style, color }: DecorProps) {
  const fill = color || 'var(--storynest-mint, oklch(0.78 0.12 165))'
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size, ...style }} className={className} aria-hidden="true">
      <path d="M20 4 L 24 16 L 36 20 L 24 24 L 20 36 L 16 24 L 4 20 L 16 16 Z" fill={fill} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
