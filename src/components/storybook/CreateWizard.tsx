/**
 * CreateWizard — the single-screen form used by /create.
 * Field labels, large rounded inputs, accent-tinted pill rows, and a
 * big sky pill submit button. The form state machine and the onSubmit
 * shape are preserved exactly.
 */

import { useMemo, useState } from 'react'
import { cn } from '../ui'
import {
  AGE_BANDS,
  AGE_BAND_LABELS,
  ART_STYLES,
  PAGE_COUNT_OPTIONS,
  type AgeBand,
  type ArtStyle,
  type PageCount,
} from '../../plans'
import { StyleChip } from './StyleChip'

export interface CreateWizardValues {
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: PageCount
  artStyle: ArtStyle
}

interface Props {
  onSubmit: (v: CreateWizardValues) => void
  disabled?: boolean
}

/** Per-row accent for the selected pill — gives the form visual variety. */
type AccentTone = 'sky' | 'sun' | 'coral' | 'mint'

const ACCENT_FILL: Record<AccentTone, string> = {
  sky: 'var(--storynest-sky)',
  sun: 'var(--storynest-sun-deep)',
  coral: 'var(--storynest-coral)',
  mint: 'var(--storynest-mint-deep)',
}

const ACCENT_RING: Record<AccentTone, string> = {
  sky: 'var(--storynest-lavender-deep)',
  sun: 'var(--storynest-sun-deep)',
  coral: 'var(--storynest-coral-deep)',
  mint: 'var(--storynest-mint-deep)',
}

function PillRow<T extends string | number>(props: {
  testId: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: (v: T) => string
  accent: AccentTone
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2.5">
      {props.options.map((opt) => {
        const active = opt === props.value
        return (
          <button
            key={String(opt)}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`${props.testId}-${opt}`}
            onClick={() => props.onChange(opt)}
            className={cn(
              'rounded-full transition-all font-body',
            )}
            style={{
              padding: '10px 22px',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: 15,
              background: active ? ACCENT_FILL[props.accent] : 'var(--storynest-card)',
              color: active ? 'oklch(0.99 0.005 240)' : 'var(--storynest-ink-soft)',
              border: active
                ? `2px solid ${ACCENT_FILL[props.accent]}`
                : '1.5px solid var(--storynest-rule)',
              boxShadow: active
                ? `0 0 0 3px ${ACCENT_RING[props.accent]} / 0.18, 3px 3px 0 0 oklch(0.22 0.04 265 / 0.10)`
                : 'none',
            }}
          >
            {props.label(opt)}
          </button>
        )
      })}
    </div>
  )
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block"
      style={{
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--storynest-ink-mute)',
      }}
    >
      {children}
    </label>
  )
}

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--storynest-card)',
  border: '1.5px solid var(--storynest-sky-soft)',
  borderRadius: 16,
  padding: '14px 16px',
  fontFamily: 'Nunito, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 500,
  color: 'var(--storynest-ink)',
  outline: 'none',
  transition: 'border-color 150ms, border-width 150ms',
}

function StyledInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { onFocus, onBlur, style, ...rest } = props
  return (
    <input
      {...rest}
      style={{ ...inputBaseStyle, ...style }}
      onFocus={(e) => {
        e.currentTarget.style.border = '3px solid var(--storynest-sky)'
        e.currentTarget.style.padding = '12.5px 14.5px'
        onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = '1.5px solid var(--storynest-sky-soft)'
        e.currentTarget.style.padding = '14px 16px'
        onBlur?.(e)
      }}
    />
  )
}

function StyledTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { onFocus, onBlur, style, ...rest } = props
  return (
    <textarea
      {...rest}
      style={{
        ...inputBaseStyle,
        lineHeight: 1.55,
        resize: 'vertical',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = '3px solid var(--storynest-sky)'
        e.currentTarget.style.padding = '12.5px 14.5px'
        onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = '1.5px solid var(--storynest-sky-soft)'
        e.currentTarget.style.padding = '14px 16px'
        onBlur?.(e)
      }}
    />
  )
}

export function CreateWizard({ onSubmit, disabled }: Props) {
  const [prompt, setPrompt] = useState('')
  const [characters, setCharacters] = useState('')
  const [lesson, setLesson] = useState('')
  const [ageBand, setAgeBand] = useState<AgeBand>('3-5')
  const [pageCount, setPageCount] = useState<PageCount>(6)
  const [artStyle, setArtStyle] = useState<ArtStyle>('watercolor')

  const ready = useMemo(() => (
    prompt.trim().length > 0 && characters.trim().length > 0
  ), [prompt, characters])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || disabled) return
    onSubmit({ prompt, characters, lesson, ageBand, pageCount, artStyle })
  }

  const canSubmit = ready && !disabled

  return (
    <form onSubmit={handleSubmit} data-testid="create-form" className="space-y-8">
      <div className="space-y-2.5">
        <FieldLabel htmlFor="cw-prompt">Story idea</FieldLabel>
        <StyledTextarea
          id="cw-prompt"
          data-testid="create-prompt"
          rows={4}
          placeholder="A brave little fox who learns that being scared is OK"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="space-y-2.5">
        <FieldLabel htmlFor="cw-chars">Main characters</FieldLabel>
        <StyledInput
          id="cw-chars"
          data-testid="create-characters"
          placeholder="Fern the fox, Bo the rabbit"
          value={characters}
          onChange={(e) => setCharacters(e.target.value)}
        />
      </div>

      <div className="space-y-2.5">
        <FieldLabel htmlFor="cw-lesson">Lesson</FieldLabel>
        <StyledInput
          id="cw-lesson"
          data-testid="create-lesson"
          placeholder="Being brave looks different for everyone (optional)"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Age band</FieldLabel>
        <PillRow
          testId="create-age"
          options={AGE_BANDS}
          value={ageBand}
          onChange={setAgeBand}
          label={(o) => AGE_BAND_LABELS[o]}
          accent="sky"
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Number of pages</FieldLabel>
        <PillRow
          testId="create-pages"
          options={PAGE_COUNT_OPTIONS}
          value={pageCount}
          onChange={setPageCount}
          label={(o) => String(o)}
          accent="sun"
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Art style</FieldLabel>
        <div className="grid grid-cols-2 gap-3.5">
          {ART_STYLES.map((s) => (
            <StyleChip
              key={s}
              style={s}
              selected={artStyle === s}
              onSelect={() => setArtStyle(s)}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        data-testid="create-submit"
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-full transition-all',
          canSubmit ? 'active:translate-x-[4px] active:translate-y-[4px]' : '',
        )}
        style={{
          padding: '16px 28px',
          background: 'var(--storynest-sky)',
          color: 'oklch(0.99 0.005 240)',
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontSize: 19,
          fontWeight: 600,
          border: 'none',
          boxShadow: canSubmit
            ? '4px 4px 0 0 var(--storynest-sky-deep)'
            : 'none',
          opacity: canSubmit ? 1 : 0.4,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {disabled && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {disabled ? 'Working on it' : 'Make my story'}
      </button>
    </form>
  )
}
