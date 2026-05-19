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
import { Cloud, Star } from '../../components/decor'
import { InteractiveMascot } from '../../components/mascots/InteractiveMascot'
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
    <div className="mx-auto flex max-w-[1400px] items-start gap-8 px-2">
      {/* Side mascot — Hootie reading along, sways slowly as if turning
          pages. Tap him to hear a thought. */}
      <aside className="hidden 2xl:block w-[170px] shrink-0 pt-32">
        <InteractiveMascot
          variant="reading"
          size={150}
          ambientAnim="mascot-sway"
          byline="tell us your idea"
          bylineColor="var(--storynest-lavender-deep)"
          ariaLabel="Tap Hootie for inspiration"
          phrases={[
            'Oh, a new story.',
            'What is the idea?',
            'Who is it for?',
            'Tell me everything.',
            'Make it a cozy one.',
            'I love a brave little hero.',
          ]}
        />
      </aside>

      <div className="relative mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      {/* Decorative shapes scattered behind the form */}
      <Cloud
        size={140}
        className="pointer-events-none absolute"
        style={{ top: 20, left: -60, opacity: 0.65, zIndex: 0 }}
      />
      <Cloud
        size={110}
        className="pointer-events-none absolute"
        style={{ top: 220, right: -40, opacity: 0.6, zIndex: 0 }}
      />
      <Star
        size={48}
        className="pointer-events-none absolute"
        style={{ top: 80, right: 40, opacity: 0.7, zIndex: 0 }}
      />

      <div className="relative" style={{ zIndex: 1 }}>
        <header className="mb-8">
          <h1
            className="font-display leading-tight"
            style={{
              color: 'var(--storynest-ink)',
              fontSize: 40,
              fontWeight: 600,
            }}
          >
            Create a new story
          </h1>
          <p
            className="font-hand mt-1"
            style={{
              fontSize: 20,
              color: 'var(--storynest-ink-mute)',
            }}
          >
            made just for them
          </p>

          <div
            className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5"
            style={{
              background: 'var(--storynest-sun-soft)',
              borderTop: '1.5px solid var(--storynest-rule)',
              borderRight: '1.5px solid var(--storynest-rule)',
              borderBottom: '1.5px solid var(--storynest-rule)',
              borderLeft: '5px solid var(--storynest-sun-deep)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-sticker)',
              color: 'var(--storynest-ink)',
              fontFamily: 'Nunito, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="create-credit-hint"
          >
            <Coins
              className="h-4 w-4"
              aria-hidden
              style={{ color: 'var(--storynest-sun-deep)' }}
            />
            <span>
              {account.isOwner
                ? 'Admin · unlimited credits'
                : `1 credit per page · ${account.balance} credits available`}
            </span>
            {!account.isOwner && (
              <Link
                to="/upgrade"
                className="ml-1"
                style={{
                  color: 'var(--storynest-sky-deep)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Buy more
              </Link>
            )}
          </div>
        </header>

        <div
          style={{
            background: 'var(--storynest-card)',
            border: '1.5px solid var(--storynest-rule)',
            borderRadius: 24,
            padding: 36,
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <CreateWizard onSubmit={onSubmit} disabled={busy} />
        </div>
      </div>
      </div>

      {/* Right margin — a small sleeping Hootie for atmosphere. */}
      <aside className="hidden 2xl:flex w-[150px] shrink-0 flex-col items-center pt-72">
        <InteractiveMascot
          variant="sleeping"
          size={120}
          ambientAnim="mascot-float"
          ariaLabel="Tap to wake Hootie"
          phrases={[
            'Wake me when it is ready.',
            'Zzz…',
            'I am dreaming of clouds.',
            'Soft pages, soft pillow.',
          ]}
        />
      </aside>
    </div>
  )
}
