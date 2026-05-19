/**
 * /create — the wizard.
 *
 * The pipeline runs IN this component and we stay mounted until it
 * resolves. Why: the pipeline depends on hook returns
 * (`useMutations` / `useR2Files`) whose internals get torn down when the
 * component unmounts, which previously caused mid-pipeline stalls when
 * we navigated away early. Keep mounted → no torn-down hooks → robust.
 *
 * The user sees the form, hits submit, the form is replaced in-place by
 * <GenerationProgress> driven by live `useQuery` data. When status
 * flips to "ready" we navigate to /book/:id/edit. On "failed" we stay
 * so the user can see the error and click "Start over".
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutations, useQuery, useR2Files } from 'deepspace'
import { Coins } from 'lucide-react'
import { useToast } from '../../components/ui'
import { CreateWizard, type CreateWizardValues } from '../../components/storybook/CreateWizard'
import { GenerationProgress } from '../../components/storybook/GenerationProgress'
import { runStorybookPipeline, type Storybook, type Page } from '../../lib/pipeline'
import { callAction } from '../../lib/callAction'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'
import { creditsForBook } from '../../lib/credits'

export default function Create() {
  const navigate = useNavigate()
  const toast = useToast()
  const books = useMutations<Storybook>('storybooks')
  const pages = useMutations<Page>('pages')
  const r2 = useR2Files()
  const [busy, setBusy] = useState(false)
  const [bookId, setBookId] = useState<string | null>(null)
  const isPro = useIsPro()
  const { account } = useCreditAccount({ isPro })

  // Live records — only meaningful once bookId is set. (`where: recordId`
  // is silently ignored, so we query all and pick by id client-side.)
  const { records: bookRecords } = useQuery<Storybook>('storybooks', {
    orderBy: 'updatedAt',
    orderDir: 'desc',
  })
  const { records: pageRecords } = useQuery<Page>('pages', {
    where: { bookId: bookId ?? '' },
    orderBy: 'pageNumber',
    orderDir: 'asc',
  })
  const liveBook = bookId ? bookRecords.find((r) => r.recordId === bookId)?.data : undefined
  const livePages = bookId ? pageRecords.map((r) => r.data) : []

  // Auto-navigate to the editor once the live record reports ready.
  // We do this inside an effect rather than in the pipeline callback so
  // the navigation is driven by record state — which means even if a
  // background refresh restored the user, we still hand off cleanly.
  useEffect(() => {
    if (bookId && liveBook?.status === 'ready') {
      // Small grace so the user sees the "ready" celebration banner briefly.
      const t = setTimeout(() => navigate(`/book/${bookId}/edit`), 600)
      return () => clearTimeout(t)
    }
  }, [bookId, liveBook?.status, navigate])

  async function onSubmit(v: CreateWizardValues) {
    if (busy) return
    const needed = creditsForBook(v.pageCount)
    // Owner bypasses the precheck — server skips the deduction too.
    if (!account.isOwner && account.balance < needed) {
      toast.error(
        'Not enough credits',
        `This story needs ${needed} credits. You have ${account.balance}.`,
      )
      navigate('/upgrade')
      return
    }
    setBusy(true)

    const result = await runStorybookPipeline({
      params: v,
      callAction,
      mutations: { books, pages },
      r2,
      onBookCreated: (id) => setBookId(id),
      onUploadFailure: (msg) => {
        toast.warning('Asset upload failed', msg)
      },
    })

    setBusy(false)

    if (!result.ok) {
      toast.error('Generation failed', result.error || 'Unknown error')
      if (!result.bookId) setBookId(null)
    }
  }

  // Progress view: shown once we have a bookId, regardless of busy state,
  // until the user navigates away.
  if (bookId) {
    if (!liveBook) {
      return (
        <div
          className="px-6 py-16 text-center text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Opening your story…
        </div>
      )
    }
    return (
      <GenerationProgress
        book={liveBook}
        pages={livePages}
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
      <header className="mb-8">
        <h1
          className="font-serif text-[33px] leading-tight"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Create a new story
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Tell us a little about it. We will sketch, illustrate, and narrate.
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px]"
          style={{
            background: 'var(--storynest-paper-deep)',
            border: '1px solid var(--storynest-rule)',
            color: 'var(--storynest-ink, var(--color-foreground))',
          }}
          data-testid="create-credit-hint"
        >
          <Coins
            className="h-3.5 w-3.5"
            aria-hidden
            style={{ color: 'var(--storynest-marigold-d)' }}
          />
          <span>
            {account.isOwner
              ? 'Admin · unlimited credits'
              : `1 credit per page · ${account.balance} credits available`}
          </span>
          {!account.isOwner && (
            <Link
              to="/upgrade"
              className="ml-1 underline"
              style={{ color: 'var(--storynest-marigold-d)' }}
            >
              Buy more
            </Link>
          )}
        </div>
      </header>

      <div
        className="rounded-lg p-6 sm:p-8"
        style={{
          background: 'var(--storynest-paper-deep)',
          border: '1px solid var(--storynest-rule)',
        }}
      >
        <CreateWizard onSubmit={onSubmit} disabled={busy} />
      </div>
    </div>
  )
}
