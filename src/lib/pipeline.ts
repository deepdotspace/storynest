/**
 * Single-page re-roll helpers used by the per-page editor (/book/:id/edit).
 *
 * The full storybook pipeline now runs server-side in AppJobRoom (see
 * src/server/jobs/storybookJob.ts). These functions are the smaller
 * one-shot variants the editor calls directly from the browser when the
 * user re-rolls a single page's image or audio.
 */

import type { ActionResult } from './callAction'
import {
  coverImageKey,
  pageImageKey,
  pageAudioKey,
  type AgeBand,
  type ArtStyle,
} from '../plans'

/* ── shared types — re-exported so other modules keep importing from
 *    this stable location. ────────────────────────────────────────── */

export interface Storybook {
  title: string
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
  coverImageKey: string
  status: 'outlining' | 'illustrating' | 'narrating' | 'ready' | 'failed'
  failureReason: string
  progress: number
  visibility: 'public' | 'private'
  characterSheet: string
}

export interface Page {
  bookId: string
  pageNumber: number
  text: string
  imagePrompt: string
  imageKey: string
  audioKey: string
  status: 'pending' | 'text-ready' | 'image-ready' | 'ready' | 'failed'
  failureReason?: string
  visibility: 'public' | 'private'
}

interface ImageResp { base64Png: string }
interface AudioResp { base64Mp3: string }
interface UploadResult { success: boolean; key?: string; url?: string; error?: string }

/** Caller surface: the rerolls only need `put`, but the SDK's
 * useMutations<T>() return value also exposes `create` and `remove`.
 * Accept them so callers can pass the whole object without picking. */
interface Mutations<T> {
  put: (recordId: string, data: Partial<T>) => Promise<void>
  create?: unknown
  remove?: unknown
}

interface R2 {
  uploadBase64: (b64: string, key: string, mime?: string) => Promise<UploadResult>
}

type CallAction = <T>(name: string, body: unknown) => Promise<ActionResult<T>>

/* ── single-page re-rolls ───────────────────────────────────────────── */

async function tryUpload(
  r2: R2,
  base64: string,
  key: string,
  mime: string,
  onFail?: (msg: string) => void,
): Promise<string> {
  try {
    const res = await r2.uploadBase64(base64, key, mime)
    if (res.success && res.key) return res.key
    onFail?.(res.error || 'Upload failed')
    return ''
  } catch (err) {
    onFail?.(err instanceof Error ? err.message : String(err))
    return ''
  }
}

async function reserveOne(callAction: CallAction): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await callAction<{ balance: number }>('reserveCredits', { amount: 1 })
  if (!res.success) return { ok: false, error: res.error || 'Could not reserve credit' }
  return { ok: true }
}

async function refundOne(callAction: CallAction): Promise<void> {
  await callAction('refundCredits', { amount: 1 })
}

export async function rerollPageImage(args: {
  callAction: CallAction
  pagesMutations: Mutations<Page>
  r2: R2
  page: { recordId: string; bookId: string; pageNumber: number; imagePrompt: string }
  artStyle: ArtStyle
  characterSheet?: string
  onUploadFailure?: (msg: string) => void
}): Promise<{ ok: boolean; error?: string }> {
  const { callAction, pagesMutations, r2, page, artStyle, characterSheet, onUploadFailure } = args
  const reserved = await reserveOne(callAction)
  if (!reserved.ok) return { ok: false, error: reserved.error }
  const res = await callAction<ImageResp>('generatePageImage', {
    imagePrompt: page.imagePrompt,
    artStyle,
    characterSheet: characterSheet || '',
  })
  if (!res.success) {
    await refundOne(callAction)
    return { ok: false, error: res.error }
  }
  const key = await tryUpload(
    r2,
    res.data.base64Png,
    pageImageKey(page.bookId, page.pageNumber),
    'image/png',
    onUploadFailure,
  )
  if (!key) {
    // AI succeeded, upload failed — user got nothing visible. Refund.
    await refundOne(callAction)
    return { ok: false, error: 'Upload failed' }
  }
  await pagesMutations.put(page.recordId, { imageKey: key })
  return { ok: true }
}

export async function rerollCover(args: {
  callAction: CallAction
  booksMutations: Mutations<Storybook>
  r2: R2
  book: { recordId: string; title: string; characters: string; artStyle: ArtStyle; characterSheet?: string }
  onUploadFailure?: (msg: string) => void
}): Promise<{ ok: boolean; error?: string }> {
  const { callAction, booksMutations, r2, book, onUploadFailure } = args
  const reserved = await reserveOne(callAction)
  if (!reserved.ok) return { ok: false, error: reserved.error }
  const res = await callAction<ImageResp>('generatePageImage', {
    artStyle: book.artStyle,
    imagePrompt: '',
    characterSheet: book.characterSheet || '',
    asCover: { title: book.title, characters: book.characters },
  })
  if (!res.success) {
    await refundOne(callAction)
    return { ok: false, error: res.error }
  }
  const key = await tryUpload(
    r2,
    res.data.base64Png,
    coverImageKey(book.recordId),
    'image/png',
    onUploadFailure,
  )
  if (!key) {
    await refundOne(callAction)
    return { ok: false, error: 'Upload failed' }
  }
  await booksMutations.put(book.recordId, { coverImageKey: key })
  return { ok: true }
}

export async function rerollPageAudio(args: {
  callAction: CallAction
  pagesMutations: Mutations<Page>
  r2: R2
  page: { recordId: string; bookId: string; pageNumber: number; text: string }
  onUploadFailure?: (msg: string) => void
}): Promise<{ ok: boolean; error?: string }> {
  const { callAction, pagesMutations, r2, page, onUploadFailure } = args
  const reserved = await reserveOne(callAction)
  if (!reserved.ok) return { ok: false, error: reserved.error }
  const res = await callAction<AudioResp>('generatePageAudio', { text: page.text })
  if (!res.success) {
    await refundOne(callAction)
    return { ok: false, error: res.error }
  }
  const key = await tryUpload(
    r2,
    res.data.base64Mp3,
    pageAudioKey(page.bookId, page.pageNumber),
    'audio/mpeg',
    onUploadFailure,
  )
  if (!key) {
    await refundOne(callAction)
    return { ok: false, error: 'Upload failed' }
  }
  await pagesMutations.put(page.recordId, { audioKey: key })
  return { ok: true }
}
