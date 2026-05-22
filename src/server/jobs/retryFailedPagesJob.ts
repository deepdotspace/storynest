/**
 * retryFailedPagesJob — re-run image/audio for any pages on an existing
 * book that are missing assets (failed or partial).
 *
 * Skips the outline; trusts the existing characterSheet on the book.
 * Bounded-parallel fan-out same as the main job. Refunds credits for
 * pages that still fail after retry; charges credits for pages that
 * succeed (the enqueue action reserves before calling).
 */

import type { Env } from '../../../worker'
import { createActionTools } from '../lib/actionTools'
import { withRetry } from '../lib/withRetry'
import { runBounded } from '../lib/bounded'
import { uploadBase64AsUser } from '../lib/r2Upload'
import { generateImageBytes } from '../ai/image'
import { generateAudioBytes } from '../ai/audio'
import { coverImageKey, pageImageKey, pageAudioKey, type ArtStyle } from '../../plans'
import { refundCreditsForUser } from './storybookJob'

export interface RetryFailedPagesPayload {
  userId: string
  bookId: string
}

interface BookRow extends Record<string, unknown> {
  title?: string
  characters?: string
  artStyle?: ArtStyle
  characterSheet?: string
  coverImageKey?: string
}

interface PageRow extends Record<string, unknown> {
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

export async function runRetryFailedPagesJob(
  payload: RetryFailedPagesPayload,
  env: Env,
): Promise<unknown> {
  const { userId, bookId } = payload
  const tools = createActionTools(env, userId, env.APP_OWNER_JWT)

  const bookRes = await tools.get<BookRow>('storybooks', bookId)
  if (!bookRes.success) return { ok: false, error: 'book_not_found' }
  const book = (bookRes.data as unknown as { record: { data: BookRow } }).record.data
  const artStyle = book.artStyle ?? 'watercolor'
  const characterSheet = book.characterSheet ?? ''
  const title = book.title ?? ''
  const characters = book.characters ?? ''
  const needsCover = !book.coverImageKey

  await tools.update('storybooks', bookId, {
    status: 'illustrating',
    failureReason: '',
    progress: 10,
  })

  const pagesQ = await tools.query<PageRow>('pages', { where: { bookId } })
  if (!pagesQ.success) return { ok: false, error: 'pages_query_failed' }

  // Pages we still need to fix: failed OR missing an asset.
  const todo = pagesQ.data.records.filter((r) => {
    const d = r.data
    return d.status === 'failed' || !d.imageKey || !d.audioKey
  })

  if (todo.length === 0 && !needsCover) {
    // Nothing to do — promote to ready if all good.
    await tools.update('storybooks', bookId, { status: 'ready', progress: 100, failureReason: '' })
    return { ok: true, attempted: 0 }
  }

  // Clear the per-page failure markers so the UI resets to "in flight".
  for (const r of todo) {
    await tools.update('pages', r.recordId, { status: 'text-ready', failureReason: '' })
  }

  let failedImageRefunds = 0
  let failedAudioRefunds = 0
  let totalSteps = 0
  let completedSteps = 0
  let coverKeyResult: string | null = null
  const tasks: Array<() => Promise<unknown>> = []

  // Cover retry — only if missing. Free (we don't charge for cover).
  if (needsCover) {
    totalSteps++
    tasks.push(async () => {
      try {
        const { base64Png } = await withRetry(
          () =>
            generateImageBytes(tools, {
              kind: 'cover',
              title,
              characters,
              artStyle,
              characterSheet,
            }),
          retryLogger(`retry cover image ${bookId}`),
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
          retryLogger(`retry cover upload ${bookId}`),
        )
        coverKeyResult = key
      } catch (err) {
        console.error(`[retryJob ${bookId}] cover retry failed:`, err)
      } finally {
        completedSteps++
        const pct = Math.min(95, 10 + Math.round((completedSteps / Math.max(1, totalSteps)) * 85))
        void tools.update('storybooks', bookId, { progress: pct })
      }
    })
  }

  for (const r of todo) {
    const recordId = r.recordId
    const d = r.data
    const pageNumber = d.pageNumber ?? 0
    const text = d.text ?? ''
    const imagePrompt = d.imagePrompt ?? ''

    const needsImage = !d.imageKey
    const needsAudio = !d.audioKey

    if (needsImage) {
      totalSteps++
      tasks.push(async () => {
        try {
          const { base64Png } = await withRetry(
            () =>
              generateImageBytes(tools, {
                kind: 'page',
                imagePrompt,
                artStyle,
                characterSheet,
              }),
            retryLogger(`retry image p${pageNumber} ${bookId}`),
          )
          const { key } = await withRetry(
            () =>
              uploadBase64AsUser(
                env,
                userId,
                pageImageKey(bookId, pageNumber),
                base64Png,
                'image/png',
              ),
            retryLogger(`retry image upload p${pageNumber} ${bookId}`),
          )
          await tools.update('pages', recordId, { imageKey: key })
        } catch (err) {
          failedImageRefunds++
          await markPageFailurePreserveFirst(
            tools,
            recordId,
            err instanceof Error ? err.message : String(err),
          )
        } finally {
          completedSteps++
          const pct = Math.min(95, 10 + Math.round((completedSteps / Math.max(1, totalSteps)) * 85))
          void tools.update('storybooks', bookId, { progress: pct })
        }
      })
    }

    if (needsAudio) {
      totalSteps++
      tasks.push(async () => {
        try {
          const { base64Mp3 } = await withRetry(
            () => generateAudioBytes(tools, text),
            retryLogger(`retry audio p${pageNumber} ${bookId}`),
          )
          const { key } = await withRetry(
            () =>
              uploadBase64AsUser(
                env,
                userId,
                pageAudioKey(bookId, pageNumber),
                base64Mp3,
                'audio/mpeg',
              ),
            retryLogger(`retry audio upload p${pageNumber} ${bookId}`),
          )
          await tools.update('pages', recordId, { audioKey: key })
        } catch (err) {
          failedAudioRefunds++
          await markPageFailurePreserveFirst(
            tools,
            recordId,
            err instanceof Error ? err.message : String(err),
          )
        } finally {
          completedSteps++
          const pct = Math.min(95, 10 + Math.round((completedSteps / Math.max(1, totalSteps)) * 85))
          void tools.update('storybooks', bookId, { progress: pct })
        }
      })
    }
  }

  await runBounded(tasks, CONCURRENCY)

  // Finalize page statuses.
  const refreshed = await tools.query<PageRow>('pages', { where: { bookId } })
  const allPages = refreshed.success ? refreshed.data.records : []
  for (const r of allPages) {
    const d = r.data
    if (d.status === 'failed') continue
    if (d.imageKey && d.audioKey) {
      if (d.status !== 'ready') await tools.update('pages', r.recordId, { status: 'ready' })
    } else if (d.imageKey) {
      if (d.status !== 'image-ready') await tools.update('pages', r.recordId, { status: 'image-ready' })
    }
  }

  const refund = failedImageRefunds + failedAudioRefunds
  if (refund > 0) await refundCreditsForUser(tools, userId, refund)

  const failedPages = allPages.filter((r) => r.data.status === 'failed').length
  const finalize: Record<string, unknown> = { progress: 100 }
  if (coverKeyResult) finalize.coverImageKey = coverKeyResult

  if (failedPages === 0) {
    finalize.status = 'ready'
    finalize.failureReason = ''
    await tools.update('storybooks', bookId, finalize)
    return { ok: true, retried: tasks.length, refundedCredits: refund, coverOk: !!coverKeyResult }
  }
  finalize.status = 'failed'
  finalize.failureReason =
    failedPages === allPages.length
      ? `All ${allPages.length} pages still failed. Credits refunded — please try a different story.`
      : `${failedPages} of ${allPages.length} pages still failed. Tap "Retry failed pages" to try again.`
  await tools.update('storybooks', bookId, finalize)
  return { ok: false, retried: tasks.length, failedPages, refundedCredits: refund, coverOk: !!coverKeyResult }
}

async function markPageFailurePreserveFirst(
  tools: ReturnType<typeof createActionTools>,
  recordId: string,
  reason: string,
): Promise<void> {
  const existing = await tools.get<{ status?: string; failureReason?: string }>(
    'pages',
    recordId,
  )
  const cur = existing.success
    ? ((existing.data as unknown as { record: { data: { status?: string; failureReason?: string } } }).record.data)
    : null
  if (cur?.status === 'failed' && cur.failureReason) return
  await tools.update('pages', recordId, {
    status: 'failed',
    failureReason: reason.slice(0, 500),
  })
}

function retryLogger(label: string) {
  return {
    onAttemptFailed: (err: unknown, attempt: number, nextDelayMs: number | null) => {
      console.error(
        `[retryJob ${label}] attempt ${attempt} failed:`,
        err instanceof Error ? err.message : String(err),
        nextDelayMs === null ? '(giving up)' : `(retry in ${nextDelayMs}ms)`,
      )
    },
  }
}
