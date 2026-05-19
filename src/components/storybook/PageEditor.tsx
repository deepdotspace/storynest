/**
 * PageEditor — single page row in the edit screen.
 * Image thumb + inline-editable text + three re-roll buttons.
 */

import { useState } from 'react'
import { Button, Textarea, useToast, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui'
import { useR2Files } from 'deepspace'
import { useAssetBlobUrl } from '../../lib/assetUrl'
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
}

export function PageEditor({ recordId, page, bookId, artStyle, characterSheet, pagesPut }: Props) {
  const toast = useToast()
  const r2 = useR2Files()
  const { url: imgUrl } = useAssetBlobUrl(page.imageKey)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.text)
  const [imgBusy, setImgBusy] = useState(false)
  const [audBusy, setAudBusy] = useState(false)
  const [textBusy, setTextBusy] = useState(false)

  async function saveText() {
    if (draft.trim() === page.text.trim()) {
      setEditing(false)
      return
    }
    setTextBusy(true)
    try {
      await pagesPut(recordId, { text: draft.trim() })
      // Re-narrate after text edit.
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
      className="grid grid-cols-1 gap-4 rounded-lg p-4 md:grid-cols-[200px_1fr]"
      style={{
        background: 'var(--storynest-paper-deep)',
        border: '1px solid var(--storynest-rule)',
      }}
    >
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-md"
        style={{ background: 'var(--storynest-paper)' }}
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
            className="flex h-full w-full items-center justify-center font-serif text-[40px]"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            {page.pageNumber}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span
            className="font-hand text-[18px]"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            Page {page.pageNumber}
          </span>
          <span
            className="text-[11px] font-medium uppercase tracking-[0.05em]"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            {page.status}
          </span>
        </div>

        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            data-testid={`page-text-edit-${page.pageNumber}`}
            className="font-serif text-[16px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setDraft(page.text); setEditing(true) }}
            data-testid={`page-text-${page.pageNumber}`}
            className="w-full rounded-md p-2 text-left transition-colors hover:bg-card/40"
          >
            <p
              className="font-serif text-[16px] leading-relaxed"
              style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
            >
              {page.text || <em style={{ color: 'var(--storynest-ink-mute)' }}>No text yet</em>}
            </p>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={saveText}
                loading={textBusy}
                disabled={textBusy}
                data-testid={`save-text-${page.pageNumber}`}
              >
                Save and re-narrate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setEditing(false); setDraft(page.text) }}
                disabled={textBusy}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onRerollImage}
                loading={imgBusy}
                disabled={imgBusy}
                data-testid={`reroll-image-${page.pageNumber}`}
              >
                Re-roll image
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRerollAudio}
                loading={audBusy}
                disabled={audBusy || !page.text.trim()}
                data-testid={`reroll-audio-${page.pageNumber}`}
              >
                Re-roll audio
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" disabled>
                      Re-roll text
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
