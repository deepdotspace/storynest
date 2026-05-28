/**
 * PageEditor — single page row in the edit screen.
 * Sticker card with a mini-thumbnail (coral page badge floats over its
 * top-left), Nunito body text, and three accent-tinted re-roll buttons.
 */

import { useState } from 'react'
import { Textarea, useToast, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, cn } from '../ui'
import { useR2Files } from 'deepspace'
import { useAssetUrl } from '../../lib/assetUrl'
import { callAction } from '../../lib/callAction'
import { rerollPageImage, rerollPageAudio, type Page } from '../../lib/pipeline'
import type { ArtStyle } from '../../plans'

interface Props {
  recordId: string
  page: Page
  bookId: string
  artStyle: ArtStyle
  characterSheet?: string
  pagesPut: (recordId: string, data: Partial<Page>) => Promise<void>
  /** When false, render read-only: no reroll buttons, no inline text
   * edit. Used when a non-author / non-admin viewer opens the page from
   * /explore. Defaults to true for back-compat with library usage. */
  canEdit?: boolean
}

interface StatusPill {
  background: string
  color: string
  border: string
  label: string
}

function statusPill(s: Page['status']): StatusPill {
  switch (s) {
    case 'ready':
      return {
        background: 'var(--storynest-mint)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-mint-deep)',
        label: 'Ready',
      }
    case 'image-ready':
      return {
        background: 'var(--storynest-sun)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-sun-deep)',
        label: 'Image ready',
      }
    case 'text-ready':
      return {
        background: 'transparent',
        color: 'var(--storynest-ink-soft)',
        border: '1.5px solid var(--storynest-rule)',
        label: 'Text ready',
      }
    case 'failed':
      return {
        background: 'transparent',
        color: 'var(--storynest-coral-deep)',
        border: '1.5px solid var(--storynest-coral)',
        label: 'Failed',
      }
    case 'pending':
    default:
      return {
        background: 'transparent',
        color: 'var(--storynest-ink-mute)',
        border: '1.5px solid var(--storynest-rule)',
        label: 'Waiting',
      }
  }
}

interface PillBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone: 'sky' | 'sun' | 'mute' | 'ghost'
  loading?: boolean
}

function PillButton({ tone, loading, disabled, children, className, ...rest }: PillBtnProps) {
  const tones = {
    sky: {
      background: 'var(--storynest-card)',
      color: 'var(--storynest-sky-deep)',
      border: '1.5px solid var(--storynest-sky-soft)',
      hint: 'var(--storynest-sky-soft)',
    },
    sun: {
      background: 'var(--storynest-card)',
      color: 'var(--storynest-ink-soft)',
      border: '1.5px solid var(--storynest-sun-soft)',
      hint: 'var(--storynest-sun-soft)',
    },
    mute: {
      background: 'var(--storynest-card)',
      color: 'var(--storynest-ink-mute)',
      border: '1.5px solid var(--storynest-rule)',
      hint: 'transparent',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--storynest-ink-soft)',
      border: '1.5px solid var(--storynest-rule)',
      hint: 'transparent',
    },
  }[tone]
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition-all',
        className,
      )}
      style={{
        padding: '8px 16px',
        background: tones.background,
        color: tones.color,
        border: tones.border,
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: 600,
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        aria-hidden
        className="inline-block"
        style={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          background: tones.hint,
          border: tones.hint === 'transparent' ? 'none' : '1px solid var(--storynest-rule)',
        }}
      />
      {loading && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}

function PrimaryPill({
  onClick,
  loading,
  disabled,
  children,
  testId,
}: {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  children: React.ReactNode
  testId?: string
}) {
  const canClick = !disabled && !loading
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-2 rounded-full transition-all',
        canClick ? 'active:translate-x-[3px] active:translate-y-[3px]' : '',
      )}
      style={{
        padding: '10px 20px',
        background: 'var(--storynest-sky)',
        color: 'oklch(0.99 0.005 240)',
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        border: 'none',
        boxShadow: canClick ? '3px 3px 0 0 var(--storynest-sky-deep)' : 'none',
        opacity: canClick ? 1 : 0.5,
        cursor: canClick ? 'pointer' : 'not-allowed',
      }}
    >
      {loading && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}

export function PageEditor({ recordId, page, bookId, artStyle, characterSheet, pagesPut, canEdit = true }: Props) {
  const toast = useToast()
  const r2 = useR2Files()
  const imgUrl = useAssetUrl(page.imageKey)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.text)
  const [imgBusy, setImgBusy] = useState(false)
  const [audBusy, setAudBusy] = useState(false)
  const [textBusy, setTextBusy] = useState(false)

  const pill = statusPill(page.status)

  async function saveText() {
    if (draft.trim() === page.text.trim()) {
      setEditing(false)
      return
    }
    setTextBusy(true)
    try {
      await pagesPut(recordId, { text: draft.trim() })
      const res = await rerollPageAudio({
        callAction,
        pagesMutations: { create: async () => '', put: pagesPut, remove: async () => {} },
        r2,
        page: { recordId, bookId, pageNumber: page.pageNumber, text: draft.trim() },
        onUploadFailure: (msg) =>
          toast.warning('Asset upload requires production deploy', msg),
      })
      if (res.ok) toast.success('Text updated', 'New narration on the way')
      else toast.error('Could not re-narrate', res.error)
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : String(err))
    } finally {
      setTextBusy(false)
      setEditing(false)
    }
  }

  async function onRerollImage() {
    setImgBusy(true)
    try {
      const res = await rerollPageImage({
        callAction,
        pagesMutations: { create: async () => '', put: pagesPut, remove: async () => {} },
        r2,
        page: { recordId, bookId, pageNumber: page.pageNumber, imagePrompt: page.imagePrompt },
        artStyle,
        characterSheet,
        onUploadFailure: (msg) =>
          toast.warning('Asset upload requires production deploy', msg),
      })
      if (res.ok) toast.success('Image re-rolled')
      else toast.error('Image re-roll failed', res.error)
    } finally {
      setImgBusy(false)
    }
  }

  async function onRerollAudio() {
    setAudBusy(true)
    try {
      const res = await rerollPageAudio({
        callAction,
        pagesMutations: { create: async () => '', put: pagesPut, remove: async () => {} },
        r2,
        page: { recordId, bookId, pageNumber: page.pageNumber, text: page.text },
        onUploadFailure: (msg) =>
          toast.warning('Asset upload requires production deploy', msg),
      })
      if (res.ok) toast.success('Audio re-rolled')
      else toast.error('Audio re-roll failed', res.error)
    } finally {
      setAudBusy(false)
    }
  }

  return (
    <div
      data-testid={`page-editor-${page.pageNumber}`}
      className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]"
      style={{
        background: 'var(--storynest-card)',
        border: '1.5px solid var(--storynest-rule)',
        borderRadius: 22,
        padding: 20,
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      <div className="relative">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden"
          style={{
            background: 'var(--storynest-card-soft)',
            border: '1.5px solid var(--storynest-rule)',
            borderRadius: 16,
          }}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-display"
              style={{
                color: 'var(--storynest-ink-mute)',
                fontSize: 44,
                fontWeight: 600,
              }}
            >
              {page.pageNumber}
            </div>
          )}
        </div>
        <span
          aria-hidden
          className="absolute flex items-center justify-center"
          style={{
            top: -10,
            left: -10,
            width: 40,
            height: 40,
            borderRadius: 9999,
            background: 'var(--storynest-coral)',
            border: '2px solid var(--storynest-ink)',
            color: 'oklch(0.99 0.005 240)',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            boxShadow: '2px 2px 0 0 oklch(0.22 0.04 265 / 0.14)',
          }}
        >
          {page.pageNumber}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span
            className="font-display"
            style={{
              color: 'var(--storynest-ink-soft)',
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Page {page.pageNumber}
          </span>
          <span
            className="rounded-full"
            style={{
              padding: '4px 12px',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: pill.background,
              color: pill.color,
              border: pill.border,
            }}
          >
            {pill.label}
          </span>
        </div>

        {editing && canEdit ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            data-testid={`page-text-edit-${page.pageNumber}`}
            style={{
              background: 'var(--storynest-card)',
              border: '1.5px solid var(--storynest-sky-soft)',
              borderRadius: 16,
              padding: '14px 16px',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.6,
              color: 'var(--storynest-ink)',
              boxShadow: 'none',
            }}
          />
        ) : canEdit ? (
          <button
            type="button"
            onClick={() => { setDraft(page.text); setEditing(true) }}
            data-testid={`page-text-${page.pageNumber}`}
            className="w-full rounded-2xl p-3 text-left transition-colors hover:bg-[var(--storynest-card-soft)]"
          >
            <p
              style={{
                fontFamily: 'Nunito, system-ui, sans-serif',
                fontSize: 16,
                lineHeight: 1.6,
                color: 'var(--storynest-ink)',
              }}
            >
              {page.text || (
                <em style={{ color: 'var(--storynest-ink-mute)' }}>No text yet</em>
              )}
            </p>
          </button>
        ) : (
          <p
            data-testid={`page-text-${page.pageNumber}`}
            className="p-3"
            style={{
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--storynest-ink)',
            }}
          >
            {page.text || (
              <em style={{ color: 'var(--storynest-ink-mute)' }}>No text yet</em>
            )}
          </p>
        )}

        {canEdit && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {editing ? (
            <>
              <PrimaryPill
                onClick={saveText}
                loading={textBusy}
                disabled={textBusy}
                testId={`save-text-${page.pageNumber}`}
              >
                Save and re-narrate
              </PrimaryPill>
              <PillButton
                tone="ghost"
                onClick={() => { setEditing(false); setDraft(page.text) }}
                disabled={textBusy}
              >
                Cancel
              </PillButton>
            </>
          ) : (
            <>
              <PillButton
                tone="sky"
                onClick={onRerollImage}
                loading={imgBusy}
                disabled={imgBusy}
                data-testid={`reroll-image-${page.pageNumber}`}
              >
                Re-roll image
              </PillButton>
              <PillButton
                tone="sun"
                onClick={onRerollAudio}
                loading={audBusy}
                disabled={audBusy || !page.text.trim()}
                data-testid={`reroll-audio-${page.pageNumber}`}
              >
                Re-roll audio
              </PillButton>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <PillButton tone="mute" disabled>
                        Re-roll text
                      </PillButton>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
