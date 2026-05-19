/**
 * /book/:id/read — the dedicated reader route.
 *
 * Loads the book + its pages via useQuery, then mounts <StoryReader/>.
 * The reader portals itself outside the app's nav layout so the
 * book takes the entire viewport.
 */

import { useMemo } from 'react'
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from 'deepspace'
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

  // `where: { recordId }` is silently ignored by useQuery (recordId is on
  // the envelope, not the data columns). Query without it and pick by id.
  const bookQuery = useQuery<StorybookRow>('storybooks', {})
  const pagesQuery = useQuery<PageRow>('pages', {
    where: id ? { bookId: id } : undefined,
    orderBy: 'pageNumber',
    orderDir: 'asc',
  })

  const bookRecord = bookQuery.records?.find((r) => r.recordId === id)
  const isLoading =
    bookQuery.status === 'loading' || pagesQuery.status === 'loading'

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

  if (isLoading && !bookRecord) {
    return <ReaderShell><LoadingState /></ReaderShell>
  }

  if (!bookRecord) {
    return <Navigate to="/library" replace />
  }

  const book: ReaderBook = {
    recordId: bookRecord.recordId,
    title: bookRecord.data.title ?? 'Untitled story',
    characters: bookRecord.data.characters,
    coverImageKey: bookRecord.data.coverImageKey ?? null,
  }

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
