/**
 * /book/:id/read — the dedicated reader route.
 *
 * Loads the book + its pages via useQuery, then mounts <StoryReader/>.
 * The reader portals itself outside the app's nav layout so the
 * book takes the entire viewport.
 */

import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useUser } from 'deepspace'
import { useIsAdmin } from '../../../../lib/useIsAdmin'
import {
  StoryReader,
  type ReaderBook,
  type ReaderPage,
} from '../../../../components/storybook/StoryReader'

interface StorybookRow {
  title?: string
  characters?: string
  coverImageKey?: string
  status?: string
}

interface PageRow {
  bookId?: string
  pageNumber?: number
  text?: string
  imageKey?: string
  audioKey?: string
}

export default function ReadBookPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { isAdmin } = useIsAdmin()
  const viewerId = user?.id ?? ''

  // `where: { recordId }` is silently ignored by useQuery (recordId is on
  // the envelope, not the data columns). Query without it and pick by id.
  const bookQuery = useQuery<StorybookRow>('storybooks', {})
  const pagesQuery = useQuery<PageRow>('pages', {
    where: id ? { bookId: id } : undefined,
    orderBy: 'pageNumber',
    orderDir: 'asc',
  })

  const bookRecord = bookQuery.records?.find((r) => r.recordId === id)
  // "Settled" = the SDK reports the subscription is no longer loading
  // AND the records array is a real array (not undefined). On in-app
  // navigation the new subscription can briefly report status='ready'
  // before records hydrates — both signals must agree before we trust
  // that "not in records" means "doesn't exist".
  const bookSettled =
    bookQuery.status !== 'loading' && Array.isArray(bookQuery.records)

  // Grace window for the race between status='ready' and records
  // populating. If 600ms pass with the query "settled" but no book
  // found, we treat it as genuinely not found.
  const [notFoundConfirmed, setNotFoundConfirmed] = useState(false)
  useEffect(() => {
    if (bookSettled && !bookRecord) {
      const t = setTimeout(() => setNotFoundConfirmed(true), 600)
      return () => clearTimeout(t)
    }
    // Reset whenever the book appears or we go back to loading.
    setNotFoundConfirmed(false)
    return undefined
  }, [bookSettled, bookRecord])

  const readerPages = useMemo<ReaderPage[]>(() => {
    return (pagesQuery.records ?? [])
      .filter((r) => r.data.pageNumber !== undefined && r.data.pageNumber > 0)
      .map((r) => ({
        recordId: r.recordId,
        pageNumber: r.data.pageNumber ?? 0,
        text: r.data.text ?? '',
        imageKey: r.data.imageKey ?? null,
        audioKey: r.data.audioKey ?? null,
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber)
  }, [pagesQuery.records])

  if (!id) {
    return <Navigate to="/library" replace />
  }

  // Loading: query not settled yet, OR settled-but-bookRecord-undefined
  // and we're still inside the grace window.
  if (!bookSettled || (!bookRecord && !notFoundConfirmed)) {
    return <ReaderShell><LoadingState /></ReaderShell>
  }

  // Genuinely not found after the grace window. Render UI instead of
  // silently redirecting so the user sees what happened — and so a
  // transient race doesn't throw them back to /library.
  if (!bookRecord) {
    return <ReaderShell><NotFoundState /></ReaderShell>
  }

  const book: ReaderBook = {
    recordId: bookRecord.recordId,
    title: bookRecord.data.title ?? 'Untitled story',
    characters: bookRecord.data.characters,
    coverImageKey: bookRecord.data.coverImageKey ?? null,
  }

  // Asset-routing decision: if the viewer is the owner OR the admin,
  // SDK scope=self readFile works. Otherwise route via the cross-user
  // public-book endpoint.
  const ownerOfBook = (bookRecord as { createdBy?: string }).createdBy
  const isOwnedByViewer = !!ownerOfBook && (ownerOfBook === viewerId || isAdmin)

  const notReady =
    bookRecord.data.status !== 'ready' || readerPages.length === 0

  if (notReady) {
    return (
      <ReaderShell>
        <NotReadyState bookId={book.recordId} />
      </ReaderShell>
    )
  }

  return (
    <StoryReader
      book={book}
      pages={readerPages}
      onExit={() => navigate('/library')}
      // Cross-user reads (someone opening another's public book from
      // /explore) can't fetch the owner's scope=self assets directly.
      // Route them through the public-book endpoint instead.
      publicBookId={isOwnedByViewer ? undefined : bookRecord.recordId}
    />
  )
}

/* ── Quiet states (rendered inline, not full-screen). ─────────────────── */

function ReaderShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-full w-full flex items-center justify-center px-6 py-16"
      style={{ background: 'var(--storynest-paper)', color: 'var(--storynest-ink)' }}
    >
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <p
      className="font-serif italic"
      style={{ fontSize: 23, color: 'var(--storynest-ink-soft)' }}
    >
      Opening the book…
    </p>
  )
}

function NotFoundState() {
  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-md">
      <p
        className="font-serif italic"
        style={{ fontSize: 23, color: 'var(--storynest-ink-soft)' }}
      >
        We couldn't find that story.
      </p>
      <Link
        to="/library"
        className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{
          background: 'var(--storynest-sky)',
          color: 'oklch(0.99 0.005 240)',
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(33,42,80,0.12)',
        }}
      >
        Back to library
      </Link>
    </div>
  )
}

function NotReadyState({ bookId }: { bookId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-md">
      <p
        className="font-serif italic"
        style={{ fontSize: 23, color: 'var(--storynest-ink-soft)' }}
      >
        This story is still being made.
      </p>
      <Link
        to={`/book/${bookId}/edit`}
        className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{
          background: 'var(--storynest-marigold)',
          color: 'var(--storynest-paper)',
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(33,42,80,0.12)',
        }}
      >
        Watch it generate
      </Link>
    </div>
  )
}
