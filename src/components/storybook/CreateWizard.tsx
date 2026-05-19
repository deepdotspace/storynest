/**
 * CreateWizard — the single-screen form used by /create.
 * Kept in its own component so the page file stays tiny.
 */

import { useMemo, useState } from 'react'
import { Input, Textarea, Button, cn } from '../ui'
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

function PillRow<T extends string | number>(props: {
  testId: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  label: (v: T) => string
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
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
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            )}
            style={{
              border: active
                ? '1.5px solid var(--storynest-marigold)'
                : '1px solid var(--storynest-rule)',
              background: active ? 'oklch(0.78 0.155 72 / 0.10)' : 'transparent',
              color: 'var(--storynest-ink, var(--color-foreground))',
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
      className="block text-[11px] font-medium uppercase tracking-[0.05em]"
      style={{ color: 'var(--storynest-ink-mute)' }}
    >
      {children}
    </label>
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

  return (
    <form onSubmit={handleSubmit} data-testid="create-form" className="space-y-7">
      <div className="space-y-2">
        <FieldLabel htmlFor="cw-prompt">Story idea</FieldLabel>
        <Textarea
          id="cw-prompt"
          data-testid="create-prompt"
          rows={4}
          placeholder="A brave little fox who learns that being scared is OK"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={2000}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="cw-chars">Main characters</FieldLabel>
        <Input
          id="cw-chars"
          data-testid="create-characters"
          placeholder="Fern the fox, Bo the rabbit"
          value={characters}
          onChange={(e) => setCharacters(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="cw-lesson">Lesson</FieldLabel>
        <Input
          id="cw-lesson"
          data-testid="create-lesson"
          placeholder="Being brave looks different for everyone (optional)"
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Age band</FieldLabel>
        <PillRow
          testId="create-age"
          options={AGE_BANDS}
          value={ageBand}
          onChange={setAgeBand}
          label={(o) => AGE_BAND_LABELS[o]}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Number of pages</FieldLabel>
        <PillRow
          testId="create-pages"
          options={PAGE_COUNT_OPTIONS}
          value={pageCount}
          onChange={setPageCount}
          label={(o) => String(o)}
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Art style</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
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

      <Button
        type="submit"
        size="lg"
        disabled={!ready || disabled}
        data-testid="create-submit"
        className="w-full"
        style={{
          background: 'var(--storynest-marigold)',
          color: 'oklch(0.18 0.04 60)',
          border: 'none',
        }}
      >
        {disabled ? 'Working on it' : 'Make my story'}
      </Button>
    </form>
  )
}
