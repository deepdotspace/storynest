/**
 * /book/:id/edit — the per-page editor.
 *
 * If book.status !== 'ready', renders <GenerationProgress>.
 * Otherwise: cover sticker (left) + title (inline editable) and actions
 * (right), then a column of <PageEditor>s.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutations, useQuery, useR2Files, useUser } from 'deepspace'
import { useIsAdmin } from '../../../../lib/useIsAdmin'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useToast,
  cn,
} from '../../../../components/ui'
import { GenerationProgress } from '../../../../components/storybook/GenerationProgress'
import { PageEditor } from '../../../../components/storybook/PageEditor'
import { PageImage } from '../../../../components/storybook/PageImage'
import { rerollCover, type Storybook, type Page } from '../../../../lib/pipeline'
import { callAction } from '../../../../lib/callAction'
import { Globe, Lock } from 'lucide-react'

export default function EditBook() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const booksMut = useMutations<Storybook>('storybooks')
  const pagesMut = useMutations<Page>('pages')
  const r2 = useR2Files()

  // The SDK's `where` only filters by data columns — `recordId` lives on the
  // envelope and is silently ignored, which would return all the user's
  // books. Query the user's own books and pick by id client-side.
  const { records: bookRecords, status: bookStatus } = useQuery<Storybook>('storybooks', {
    orderBy: 'updatedAt',
    orderDir: 'desc',
  })
  const { records: pageRecords } = useQuery<Page>('pages', {
    where: { bookId: id ?? '' },
    orderBy: 'pageNumber',
    orderDir: 'asc',
  })

  const bookEnvelope = bookRecords.find((r) => r.recordId === id)
  const book = bookEnvelope?.data
  const bookId = bookEnvelope?.recordId ?? id ?? ''

  // Edit permission: book author OR app admin. Others (e.g. anyone
  // browsing /explore) get a read-only view — no reroll, no visibility
  // toggle, no delete, no inline title/text edit.
  const { user } = useUser()
  const { isAdmin } = useIsAdmin()
  const isAuthor = !!bookEnvelope && (bookEnvelope as { createdBy?: string }).createdBy === user?.id
  const canEdit = isAuthor || isAdmin

  const sortedPages = useMemo(
    () => [...pageRecords].sort((a, b) => a.data.pageNumber - b.data.pageNumber),
    [pageRecords],
  )

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [visibilityBusy, setVisibilityBusy] = useState(false)

  if (bookStatus === 'loading') {
    return (
      <div
        className="px-6 py-16 text-center text-sm"
        style={{ color: 'var(--storynest-ink-mute)' }}
      >
        Loading…
      </div>
    )
  }

  if (!book || !bookId) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h2
          className="font-display"
          style={{
            color: 'var(--storynest-ink)',
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          Story not found
        </h2>
        <Link
          to="/library"
          className="mt-4 inline-block text-sm underline"
          style={{ color: 'var(--storynest-sky-deep)' }}
        >
          Back to library
        </Link>
      </div>
    )
  }

  if (book.status !== 'ready') {
    return (
      <GenerationProgress
        book={book}
        pages={sortedPages.map((r) => r.data)}
        bookId={bookId}
      />
    )
  }

  async function saveTitle() {
    const t = titleDraft.trim()
    if (!t || t === book!.title) {
      setEditingTitle(false)
      return
    }
    try {
      await booksMut.put(bookId, { title: t })
      toast.success('Title updated')
    } catch (err) {
      toast.error('Could not update title', err instanceof Error ? err.message : String(err))
    } finally {
      setEditingTitle(false)
    }
  }

  async function onRerollCover() {
    if (!book) return
    setCoverBusy(true)
    try {
      const res = await rerollCover({
        callAction,
        booksMutations: { create: async () => '', put: booksMut.put, remove: async () => {} },
        r2,
        book: {
          recordId: bookId,
          title: book.title,
          characters: book.characters,
          artStyle: book.artStyle,
          characterSheet: book.characterSheet,
        },
        onUploadFailure: (msg) => toast.warning('Cover upload failed', msg),
      })
      if (res.ok) toast.success('Cover re-rolled')
      else toast.error('Cover re-roll failed', res.error)
    } finally {
      setCoverBusy(false)
    }
  }

  async function setVisibility(next: 'public' | 'private') {
    if (!book || book.visibility === next) return
    setVisibilityBusy(true)
    try {
      const res = await callAction<{ visibility: string }>('setBookVisibility', {
        bookId,
        visibility: next,
      })
      if (res.success) {
        toast.success(next === 'public' ? 'Visible in the public library' : 'Now private')
      } else {
        toast.error('Could not change visibility', res.error)
      }
    } finally {
      setVisibilityBusy(false)
    }
  }

  async function onDelete() {
    setDeleting(true)
    try {
      for (const p of sortedPages) {
        await pagesMut.remove(p.recordId)
      }
      await booksMut.remove(bookId)
      toast.success('Story deleted')
      navigate('/library')
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const visibilityIsPublic = book.visibility !== 'private'

  return (
    <div
      data-testid="edit-page"
      className="mx-auto max-w-4xl px-6 py-12"
    >
      <header className="mb-10 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative">
          <div
            className="relative aspect-[3/4] w-full overflow-hidden"
            style={{
              background: 'var(--storynest-card)',
              border: '1.5px solid var(--storynest-rule)',
              borderRadius: 20,
              boxShadow: 'var(--shadow-sticker)',
            }}
          >
            <PageImage
              imageKey={book.coverImageKey}
              alt={`Cover for ${book.title}`}
              contain
            />
            {canEdit && (
              <button
                type="button"
                onClick={onRerollCover}
                disabled={coverBusy}
                data-testid="reroll-cover"
                className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center rounded-full transition-opacity disabled:opacity-60"
                style={{
                  padding: '8px 12px',
                  background: 'oklch(0.22 0.04 265 / 0.82)',
                  color: 'oklch(0.99 0.005 240)',
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1.5px solid oklch(0.99 0.005 240 / 0.2)',
                }}
              >
                {coverBusy ? 'Re-rolling…' : 'Re-roll cover'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            {editingTitle && canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                  data-testid="edit-title-input"
                  className="font-display"
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    height: 'auto',
                    padding: '12px 16px',
                    borderRadius: 16,
                    border: '1.5px solid var(--storynest-sky-soft)',
                    color: 'var(--storynest-ink)',
                  }}
                />
                <Button size="sm" onClick={saveTitle}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
              </div>
            ) : canEdit ? (
              <button
                type="button"
                onClick={() => { setTitleDraft(book.title); setEditingTitle(true) }}
                data-testid="edit-title-button"
                className="text-left"
              >
                <h1
                  className="font-display leading-tight md:text-[40px]"
                  style={{
                    color: 'var(--storynest-ink)',
                    fontSize: 32,
                    fontWeight: 600,
                  }}
                >
                  {book.title}
                </h1>
              </button>
            ) : (
              <h1
                data-testid="book-title"
                className="font-display leading-tight md:text-[40px]"
                style={{
                  color: 'var(--storynest-ink)',
                  fontSize: 32,
                  fontWeight: 600,
                }}
              >
                {book.title}
              </h1>
            )}
            <p
              className="font-hand mt-2"
              style={{
                color: 'var(--storynest-ink-mute)',
                fontSize: 20,
              }}
            >
              {sortedPages.length} pages · {book.artStyle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/book/${bookId}/read`}
              data-testid="open-reader"
              className="inline-flex items-center rounded-full transition-transform active:translate-x-[4px] active:translate-y-[4px]"
              style={{
                padding: '12px 24px',
                background: 'var(--storynest-sky)',
                color: 'oklch(0.99 0.005 240)',
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '4px 4px 0 0 var(--storynest-sky-deep)',
              }}
            >
              Read story
            </Link>

            {canEdit && (
            <div
              role="radiogroup"
              aria-label="Visibility"
              data-testid="toggle-visibility"
              className="inline-flex items-center gap-1 rounded-full"
              style={{
                padding: 4,
                background: 'var(--storynest-card)',
                border: '1.5px solid var(--storynest-rule)',
              }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={visibilityIsPublic}
                onClick={() => setVisibility('public')}
                disabled={visibilityBusy}
                data-testid="toggle-visibility-public"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full transition-colors',
                )}
                style={{
                  padding: '6px 14px',
                  background: visibilityIsPublic ? 'var(--storynest-sky)' : 'transparent',
                  color: visibilityIsPublic ? 'oklch(0.99 0.005 240)' : 'var(--storynest-ink-soft)',
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  opacity: visibilityBusy ? 0.6 : 1,
                }}
              >
                <Globe className="h-3.5 w-3.5" aria-hidden /> Public
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!visibilityIsPublic}
                onClick={() => setVisibility('private')}
                disabled={visibilityBusy}
                data-testid="toggle-visibility-private"
                className="inline-flex items-center gap-1.5 rounded-full transition-colors"
                style={{
                  padding: '6px 14px',
                  background: !visibilityIsPublic ? 'var(--storynest-sky)' : 'transparent',
                  color: !visibilityIsPublic ? 'oklch(0.99 0.005 240)' : 'var(--storynest-ink-soft)',
                  fontFamily: 'Nunito, system-ui, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  opacity: visibilityBusy ? 0.6 : 1,
                }}
              >
                <Lock className="h-3.5 w-3.5" aria-hidden /> Private
              </button>
            </div>
            )}

            {canEdit && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              data-testid="delete-book"
              className="rounded-full transition-colors hover:bg-[var(--storynest-coral-soft)]"
              style={{
                padding: '6px 14px',
                color: 'var(--storynest-coral-deep)',
                fontFamily: 'Nunito, system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
              }}
            >
              Delete
            </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {sortedPages.map((p) => (
          <PageEditor
            key={p.recordId}
            recordId={p.recordId}
            page={p.data}
            bookId={bookId}
            artStyle={book.artStyle}
            characterSheet={book.characterSheet}
            pagesPut={pagesMut.put}
            canEdit={canEdit}
          />
        ))}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this story?</DialogTitle>
            <DialogDescription>
              This removes the book and all its pages. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              loading={deleting}
              disabled={deleting}
              data-testid="confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
