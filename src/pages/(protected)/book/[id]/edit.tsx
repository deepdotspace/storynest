/**
 * /book/:id/edit — the per-page editor.
 *
 * If book.status !== 'ready', renders <GenerationProgress>.
 * Otherwise: title (inline editable), Read button, Delete confirmation,
 * and a column of <PageEditor>s.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutations, useQuery, useR2Files } from 'deepspace'
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
          className="font-serif text-[28px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Story not found
        </h2>
        <Link
          to="/library"
          className="mt-4 inline-block text-sm underline"
          style={{ color: 'var(--storynest-marigold-d, var(--storynest-marigold))' }}
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

  async function onToggleVisibility() {
    if (!book) return
    const next = book.visibility === 'private' ? 'public' : 'private'
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

  return (
    <div
      data-testid="edit-page"
      className="mx-auto max-w-4xl px-6 py-12"
    >
      <header className="mb-10 grid gap-6 md:grid-cols-[180px_1fr]">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden rounded-md"
          style={{
            background: 'var(--storynest-paper-deep)',
            border: '1px solid var(--storynest-rule)',
          }}
        >
          <PageImage
            imageKey={book.coverImageKey}
            alt={`Cover for ${book.title}`}
            contain
          />
          <button
            type="button"
            onClick={onRerollCover}
            disabled={coverBusy}
            data-testid="reroll-cover"
            className="absolute bottom-2 left-2 right-2 inline-flex items-center justify-center rounded-md px-2 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-60"
            style={{
              background: 'oklch(0.22 0.035 265 / 0.78)',
              color: 'var(--storynest-paper)',
              backdropFilter: 'blur(2px)',
            }}
          >
            {coverBusy ? 'Re-rolling…' : 'Re-roll cover'}
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <div className="flex gap-2">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  autoFocus
                  data-testid="edit-title-input"
                  className="font-serif text-[28px]"
                />
                <Button size="sm" onClick={saveTitle}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setTitleDraft(book.title); setEditingTitle(true) }}
                data-testid="edit-title-button"
                className="text-left"
              >
                <h1
                  className="font-serif text-[33px] leading-tight"
                  style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
                >
                  {book.title}
                </h1>
              </button>
            )}
            <p
              className="font-hand mt-2 text-[18px]"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              {sortedPages.length} pages · {book.artStyle}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`/book/${bookId}/read`}
              data-testid="open-reader"
              className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
              style={{
                background: 'var(--storynest-marigold)',
                color: 'oklch(0.18 0.04 60)',
              }}
            >
              Read story
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleVisibility}
              loading={visibilityBusy}
              disabled={visibilityBusy}
              data-testid="toggle-visibility"
              className="inline-flex items-center gap-1.5"
            >
              {book.visibility === 'private' ? (
                <>
                  <Lock className="h-3.5 w-3.5" aria-hidden /> Private
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5" aria-hidden /> Public
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              data-testid="delete-book"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {sortedPages.map((p) => (
          <PageEditor
            key={p.recordId}
            recordId={p.recordId}
            page={p.data}
            bookId={bookId}
            artStyle={book.artStyle}
            characterSheet={book.characterSheet}
            pagesPut={pagesMut.put}
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
