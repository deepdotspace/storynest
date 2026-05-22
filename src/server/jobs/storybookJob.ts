/**
 * storybookJob — the main background pipeline.
 *
 * Replaces the old browser-driven runStorybookPipeline. Runs entirely
 * inside AppJobRoom so it survives refresh/tab-close, gets free
 * crash-recovery from the DO alarm loop, and can fan out AI calls in
 * parallel without burning the worker's request budget.
 *
 * Lifecycle:
 *   1. Read placeholder book row (already created by enqueue action)
 *   2. Outline (Anthropic, retried) → save characterSheet on book row
 *   3. Create one page row per outline page
 *   4. Bounded fan-out: cover image + per-page image + per-page audio
 *      Each task is retried in-place (transient errors). On final
 *      failure, the page row's `failureReason` is persisted.
 *   5. Aggregate: book → 'ready' iff every page is ready, else
 *      'failed' with reason; refund credits for failed pages.
 *
 * Credits: the enqueue action reserves pages*2 upfront. We refund
 * 1 per failed image step + 1 per failed audio step. Cover failure
 * is not refunded (cover is bundled, never charged).
 */

import type { Env } from '../../../worker'
import { createActionTools } from '../lib/actionTools'
import { withRetry } from '../lib/withRetry'
import { runBounded } from '../lib/bounded'
import { uploadBase64AsUser } from '../lib/r2Upload'
import { generateOutline } from '../ai/outline'
import { generateImageBytes } from '../ai/image'
import { generateAudioBytes } from '../ai/audio'
import { coverImageKey, pageImageKey, pageAudioKey, type AgeBand, type ArtStyle } from '../../plans'

export interface StorybookJobPayload {
  userId: string
  bookId: string
  /** Credits the enqueue action reserved upfront — passed through so the
   * job's refund math doesn't have to re-derive the pricing rule. */
  reservedCredits: number
  params: {
    prompt: string
    characters: string
    lesson: string
    ageBand: AgeBand
    pageCount: number
    artStyle: ArtStyle
  }
}

interface PageRowRead extends Record<string, unknown> {
  bookId?: string
  pageNumber?: number
  text?: string
  imagePrompt?: string
  imageKey?: string
  audioKey?: string
  status?: string
  failureReason?: string
}

const CONCURRENCY = 4

export async function runStorybookJob(payload: StorybookJobPayload, env: Env): Promise<unknown> {
  const { userId, bookId, params, reservedCredits } = payload
  // Jobs are developer-billed for AI providers; the user's billing
  // lives in our `credit_accounts` row (reserved/refunded explicitly).
  // Pass APP_OWNER_JWT as the caller JWT so any user-billed integration
  // would also use the owner (we have no live caller JWT here).
  const tools = createActionTools(env, userId, env.APP_OWNER_JWT)

  /* ── 1. outline ─────────────────────────────────────────────────── */
  let outline
  try {
    outline = await withRetry(
      () => generateOutline(tools, params),
      {
        onAttemptFailed: (err, attempt, nextDelayMs) => {
          console.error(
            `[storybookJob ${bookId}] outline attempt ${attempt} failed:`,
            err instanceof Error ? err.message : String(err),
            nextDelayMs === null ? '(giving up)' : `(retry in ${nextDelayMs}ms)`,
          )
        },
      },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await tools.update('storybooks', bookId, {
      status: 'failed',
      failureReason: `Outline failed: ${msg}`,
      progress: 0,
    })
    // Full refund of whatever the enqueue action actually reserved.
    await refundCreditsForUser(tools, userId, reservedCredits)
    return { ok: false, stage: 'outline', error: msg }
  }

  // Clamp the outline to the requested page count. The model occasionally
  // returns more or fewer pages than asked — we honor what the user paid
  // for (refunding the delta below if it returned fewer).
  const outlinePages = outline.pages.slice(0, params.pageCount)
  const missingPages = Math.max(0, params.pageCount - outlinePages.length)
  // Stable locals — closures below capture these without non-null
  // assertions on `outline`.
  const title = outline.title
  const characterSheet = outline.characterSheet ?? ''
  const characters = params.characters

  await tools.update('storybooks', bookId, {
    title,
    characterSheet,
    status: 'illustrating',
    progress: 10,
  })

  /* ── 2. create page rows ────────────────────────────────────────── */
  const pageCreates = outlinePages.map(async (p) => {
    const created = await tools.create('pages', {
      bookId,
      pageNumber: p.pageNumber,
      text: p.text,
      imagePrompt: p.imagePrompt,
      imageKey: '',
      audioKey: '',
      status: 'text-ready',
      failureReason: '',
      visibility: 'public',
    })
    if (!created.success) {
      throw new Error(`create_page_failed: ${created.error ?? 'unknown'}`)
    }
    const data = created.data as { recordId?: string }
    if (!data.recordId) throw new Error('create_page_failed: no_recordId')
    return { recordId: data.recordId, pageNumber: p.pageNumber, text: p.text, imagePrompt: p.imagePrompt }
  })
  const pageRows = await Promise.all(pageCreates)

  /* ── 3. fan out cover + images + audios with bounded concurrency ── */
  const tasks: Array<() => Promise<{ kind: string; refundOnFail: boolean }>> = []
  let failedImageRefunds = 0
  let failedAudioRefunds = 0
  let failedSteps = 0
  const totalSteps = 1 + pageRows.length * 2 // cover + (image+audio)*N
  let completedSteps = 0

  const tickProgress = async () => {
    completedSteps++
    const pct = Math.min(95, 10 + Math.round((completedSteps / totalSteps) * 85))
    // Fire-and-forget — progress updates are non-critical.
    void tools.update('storybooks', bookId, { progress: pct })
  }

  // Cover — write `coverImageKey` in the finalize step (not from this
  // task) so the field can't be clobbered by concurrent `progress`
  // writes from other tasks that target the same book row. Tasks that
  // touch the book row in parallel are racy; only the finalize step
  // (after runBounded completes) writes coverImageKey safely.
  let coverKeyResult: string | null = null
  let coverErrorMsg: string | null = null
  tasks.push(async () => {
    try {
      const { base64Png } = await withRetry(
        () =>
          generateImageBytes(tools, {
            kind: 'cover',
            title,
            characters,
            artStyle: params.artStyle,
            characterSheet,
          }),
        retryLogger(`cover image ${bookId}`),
      )
      const { key } = await withRetry(
        () =>
          uploadBase64AsUser(
            env,
            userId,
            coverImageKey(bookId),
            base64Png,
            'image/png',
          ),
        retryLogger(`cover upload ${bookId}`),
      )
      coverKeyResult = key
    } catch (err) {
      failedSteps++
      coverErrorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[storybookJob ${bookId}] cover failed permanently:`, coverErrorMsg)
      // Cover failure isn't fatal — story still readable without it.
    } finally {
      await tickProgress()
    }
    return { kind: 'cover', refundOnFail: false }
  })

  // Per-page image
  for (const p of pageRows) {
    tasks.push(async () => {
      try {
        const { base64Png } = await withRetry(
          () =>
            generateImageBytes(tools, {
              kind: 'page',
              imagePrompt: p.imagePrompt,
              artStyle: params.artStyle,
              characterSheet,
            }),
          retryLogger(`image p${p.pageNumber} ${bookId}`),
        )
        const { key } = await withRetry(
          () =>
            uploadBase64AsUser(
              env,
              userId,
              pageImageKey(bookId, p.pageNumber),
              base64Png,
              'image/png',
            ),
          retryLogger(`image upload p${p.pageNumber} ${bookId}`),
        )
        await tools.update('pages', p.recordId, { imageKey: key })
      } catch (err) {
        failedImageRefunds++
        failedSteps++
        const msg = err instanceof Error ? err.message : String(err)
        await markPageFailure(tools, p.recordId, msg)
      } finally {
        await tickProgress()
      }
      return { kind: 'image', refundOnFail: true }
    })
  }

  // Per-page audio
  for (const p of pageRows) {
    tasks.push(async () => {
      try {
        const { base64Mp3 } = await withRetry(
          () => generateAudioBytes(tools, p.text),
          retryLogger(`audio p${p.pageNumber} ${bookId}`),
        )
        const { key } = await withRetry(
          () =>
            uploadBase64AsUser(
              env,
              userId,
              pageAudioKey(bookId, p.pageNumber),
              base64Mp3,
              'audio/mpeg',
            ),
          retryLogger(`audio upload p${p.pageNumber} ${bookId}`),
        )
        await tools.update('pages', p.recordId, { audioKey: key })
      } catch (err) {
        failedAudioRefunds++
        failedSteps++
        const msg = err instanceof Error ? err.message : String(err)
        await markPageFailure(tools, p.recordId, msg)
      } finally {
        await tickProgress()
      }
      return { kind: 'audio', refundOnFail: true }
    })
  }

  await runBounded(tasks, CONCURRENCY)

  /* ── 4. finalize status + refunds ──────────────────────────────── */
  // Pull current page state to compute the per-page success bitmap.
  const pagesQ = await tools.query<PageRowRead>('pages', { where: { bookId } })
  const pagesNow = pagesQ.success ? pagesQ.data.records : []
  const totalPages = pagesNow.length
  const failedPages = pagesNow.filter((r) => (r.data.status ?? '') === 'failed').length

  // Promote pages that have BOTH image+audio to status='ready'. A page
  // can still be 'failed' (one of its assets is missing) — we leave it.
  for (const r of pagesNow) {
    const d = r.data
    if (d.status === 'failed') continue
    if (d.imageKey && d.audioKey) {
      if (d.status !== 'ready') {
        await tools.update('pages', r.recordId, { status: 'ready' })
      }
    } else if (d.imageKey) {
      if (d.status !== 'image-ready') {
        await tools.update('pages', r.recordId, { status: 'image-ready' })
      }
    }
  }

  // Refund: per-step failures + any pages the outline didn't return.
  const refund = failedImageRefunds + failedAudioRefunds + missingPages * 2
  if (refund > 0) await refundCreditsForUser(tools, userId, refund)

  // Single finalize write — includes coverImageKey iff the cover task
  // succeeded. Doing it here (not from the cover task) prevents
  // concurrent tickProgress writes from clobbering the cover key.
  const finalize: Record<string, unknown> = {
    progress: 100,
  }
  if (coverKeyResult) finalize.coverImageKey = coverKeyResult

  if (failedPages === 0) {
    finalize.status = 'ready'
    finalize.failureReason = ''
    await tools.update('storybooks', bookId, finalize)
    return { ok: true, totalPages, failedPages, refundedCredits: refund, coverOk: !!coverKeyResult, coverError: coverErrorMsg }
  }

  finalize.status = 'failed'
  finalize.failureReason =
    failedPages === totalPages
      ? `All ${totalPages} pages could not be generated. Credits were refunded — please try again.`
      : `${failedPages} of ${totalPages} pages couldn't be generated (credits refunded for those). Tap "Retry failed pages" to try again.`
  await tools.update('storybooks', bookId, finalize)
  return { ok: false, stage: 'fan-out', totalPages, failedPages, refundedCredits: refund, coverOk: !!coverKeyResult, coverError: coverErrorMsg }
}

/* ── helpers ────────────────────────────────────────────────────── */

function retryLogger(label: string) {
  return {
    onAttemptFailed: (err: unknown, attempt: number, nextDelayMs: number | null) => {
      console.error(
        `[storybookJob ${label}] attempt ${attempt} failed:`,
        err instanceof Error ? err.message : String(err),
        nextDelayMs === null ? '(giving up)' : `(retry in ${nextDelayMs}ms)`,
      )
    },
  }
}

async function markPageFailure(
  tools: ReturnType<typeof createActionTools>,
  recordId: string,
  reason: string,
): Promise<void> {
  // Preserve the FIRST failure reason — image and audio for the same
  // page can both fail in the same fan-out wave, and overwriting loses
  // the original signal. Read-check-then-write is good enough; the
  // window where two tasks race the read is small and the worst case
  // is showing the second reason (same as before).
  const existing = await tools.get<{ status?: string; failureReason?: string }>(
    'pages',
    recordId,
  )
  const cur = existing.success
    ? ((existing.data as unknown as { record: { data: { status?: string; failureReason?: string } } }).record.data)
    : null
  if (cur?.status === 'failed' && cur.failureReason) {
    // Already marked failed with a reason — don't clobber.
    return
  }
  await tools.update('pages', recordId, {
    status: 'failed',
    failureReason: reason.slice(0, 500),
  })
}

interface CreditAccountRow extends Record<string, unknown> {
  userId: string
  balance: number
  lifetimeSpent: number
}

export async function refundCreditsForUser(
  tools: ReturnType<typeof createActionTools>,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return
  const q = await tools.query<CreditAccountRow>('credit_accounts', { where: { userId } })
  if (!q.success) return
  const rec = q.data.records[0]
  if (!rec) return
  const next = {
    balance: (rec.data.balance ?? 0) + amount,
    lifetimeSpent: Math.max(0, (rec.data.lifetimeSpent ?? 0) - amount),
  }
  await tools.update('credit_accounts', rec.recordId, next)
}
