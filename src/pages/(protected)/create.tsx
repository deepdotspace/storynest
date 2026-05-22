/**
 * /create — the wizard.
 *
 * Submitting calls `enqueueStorybookGeneration` which (a) reserves
 * credits, (b) creates a placeholder book row, (c) enqueues the
 * background job. We navigate to /book/:id/edit immediately — that
 * page renders <GenerationProgress> while status != 'ready', driven
 * by live useQuery on book + pages. Refresh / tab-close no longer
 * kills the generation; the job continues server-side.
 */

import { Link, useNavigate } from 'react-router-dom'
import { Coins } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../components/ui'
import { CreateWizard, type CreateWizardValues } from '../../components/storybook/CreateWizard'
import { Cloud, Star } from '../../components/decor'
import { InteractiveMascot } from '../../components/mascots/InteractiveMascot'
import { callAction } from '../../lib/callAction'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'
import { creditsForBook } from '../../lib/credits'

export default function Create() {
  const navigate = useNavigate()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const isPro = useIsPro()
  const { account } = useCreditAccount({ isPro })

  async function onSubmit(v: CreateWizardValues) {
    if (submitting) return
    const needed = creditsForBook(v.pageCount)
    if (!account.isOwner && account.balance < needed) {
      toast.error(
        'Not enough credits',
        `This story needs ${needed} credits. You have ${account.balance}.`,
      )
      navigate('/upgrade')
      return
    }
    setSubmitting(true)
    const result = await callAction<{ bookId: string }>('enqueueStorybookGeneration', v)
    setSubmitting(false)
    if (!result.success) {
      toast.error('Could not start generation', result.error)
      return
    }
    // Navigate to the edit page — it renders progress while the job runs.
    navigate(`/book/${result.data.bookId}/edit`)
  }

  return (
    <div className="mx-auto flex max-w-[1400px] items-start gap-8 px-2">
      <aside
        className="hidden 2xl:block w-[170px] shrink-0 self-start sticky"
        style={{ top: 120 }}
      >
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
                  : `2 credits per page · 1 per re-roll · ${account.balance} available`}
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
            <CreateWizard onSubmit={onSubmit} disabled={submitting} />
          </div>
        </div>
      </div>

      <aside
        className="hidden 2xl:flex w-[150px] shrink-0 flex-col items-center self-start sticky"
        style={{ top: 260 }}
      >
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
