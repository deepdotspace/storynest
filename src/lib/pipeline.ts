/**
 * Storybook generation pipeline — orchestrated on the client because the
 * R2 hook lives in the React tree. Each step calls a server action for
 * the AI work, then uploads the bytes to R2 from the browser.
 *
 * On any R2 upload 401 (dev-only), we surface a toast and continue —
 * text-only iteration still completes.
 */

import type { ActionResult } from './callAction'
import {
  coverImageKey,
  pageImageKey,
  pageAudioKey,
  type AgeBand,
  type ArtStyle,
} from '../plans'

/* ── shared types ───────────────────────────────────────────────────── */

export interface PipelineParams {
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
}

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
  visibility: 'public' | 'private'
}

interface OutlineResp {
  title: string
  characterSheet: string
  pages: Array<{ pageNumber: number; text: string; imagePrompt: string }>
}

interface ImageResp { base64Png: string }
interface AudioResp { base64Mp3: string }
interface UploadResult { success: boolean; key?: string; url?: string; error?: string }

interface Mutations<T> {
  create: (data: T) => Promise<string>
  put: (recordId: string, data: Partial<T>) => Promise<void>
  remove: (recordId: string) => Promise<void>
}

export interface PipelineDeps {
  params: PipelineParams
  callAction: <T>(name: string, body: unknown) => Promise<ActionResult<T>>
  mutations: {
    books: Mutations<Storybook>
    pages: Mutations<Page>
  }
  r2: {
    uploadBase64: (b64: string, key: string, mime?: string) => Promise<UploadResult>
  }
  onBookCreated?: (bookId: string) => void
  onProgress?: (info: { stage: string; current: number; total: number; message?: string }) => void
  onUploadFailure?: (message: string) => void
}

export interface PipelineOutcome {
  bookId: string | null
  ok: boolean
  error?: string
}

/* ── helpers ────────────────────────────────────────────────────────── */

async function tryUpload(
  r2: PipelineDeps['r2'],
  base64: string,
  key: string,
  mime: string,
  onFail?: (msg: string) => void,
): Promise<string> {
  try {
    const res = await r2.uploadBase64(base64, key, mime)
    if (res.success && res.key) return res.key
    const msg = res.error || 'Upload failed'
    onFail?.(msg)
    return ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    onFail?.(msg)
    return ''
  }
}

function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/* ── pipeline ───────────────────────────────────────────────────────── */

export async function runStorybookPipeline(deps: PipelineDeps): Promise<PipelineOutcome> {
  const { params, callAction, mutations, r2, onBookCreated, onProgress, onUploadFailure } = deps
  let bookId: string | null = null

  let creditsReserved = 0

  try {
    /* 0. reserve credits up-front. 2 credits per page (image + audio).
       Cover is bundled — no extra charge. */
    const cost = (params.pageCount | 0) * 2
    const reserveRes = await callAction<{ balance: number; insufficient?: boolean }>(
      'reserveCredits',
      { amount: cost },
    )
    if (!reserveRes.success) {
      return { bookId, ok: false, error: reserveRes.error || 'Could not reserve credits' }
    }
    creditsReserved = cost

    /* 1. outline */
    onProgress?.({ stage: 'outlining', current: 0, total: params.pageCount, message: 'Sketching your story' })
    const outlineRes = await callAction<OutlineResp>('outlineStorybook', params)
    if (!outlineRes.success) {
      // Refund — the user got nothing useful.
      if (creditsReserved > 0) {
        await callAction('refundCredits', { amount: creditsReserved })
        creditsReserved = 0
      }
      return { bookId, ok: false, error: outlineRes.error }
    }
    const outline = outlineRes.data

    /* 2. create book row */
    bookId = await mutations.books.create({
      title: outline.title,
      prompt: params.prompt,
      characters: params.characters,
      lesson: params.lesson,
      ageBand: params.ageBand,
      pageCount: params.pageCount,
      artStyle: params.artStyle,
      coverImageKey: '',
      status: 'outlining',
      failureReason: '',
      progress: 5,
      visibility: 'public',
      characterSheet: outline.characterSheet || '',
    })
    onBookCreated?.(bookId)

    /* 3. flip to illustrating */
    await mutations.books.put(bookId, { status: 'illustrating', progress: 10 })

    /* 4. create page rows in parallel; capture ids */
    const pageCreates = outline.pages.map((p) =>
      mutations.pages.create({
        bookId: bookId!,
        pageNumber: p.pageNumber,
        text: p.text,
        imagePrompt: p.imagePrompt,
        imageKey: '',
        audioKey: '',
        status: 'text-ready',
        visibility: 'public',
      }).then((recordId) => ({ recordId, page: p })),
    )
    const createdPages = await Promise.all(pageCreates)
    const totalUnits = createdPages.length * 2 + 1 // images + audios + cover
    let doneUnits = 0

    /* 5. cover image */
    const coverRes = await callAction<ImageResp>('generatePageImage', {
      artStyle: params.artStyle,
      imagePrompt: '',
      characterSheet: outline.characterSheet || '',
      asCover: { title: outline.title, characters: params.characters },
    })
    if (coverRes.success) {
      const key = await tryUpload(
        r2,
        coverRes.data.base64Png,
        coverImageKey(bookId),
        'image/png',
        onUploadFailure,
      )
      if (key) await mutations.books.put(bookId, { coverImageKey: key })
    }
    doneUnits += 1
    await mutations.books.put(bookId, {
      progress: clampProgress(10 + ((doneUnits / totalUnits) * 80)),
    })

    /* 6. per-page image then audio */
    for (const { recordId, page } of createdPages) {
      onProgress?.({
        stage: 'illustrating',
        current: page.pageNumber,
        total: params.pageCount,
        message: `Painting page ${page.pageNumber}`,
      })

      const imgRes = await callAction<ImageResp>('generatePageImage', {
        imagePrompt: page.imagePrompt,
        artStyle: params.artStyle,
        characterSheet: outline.characterSheet || '',
      })
      if (imgRes.success) {
        const key = await tryUpload(
          r2,
          imgRes.data.base64Png,
          pageImageKey(bookId, page.pageNumber),
          'image/png',
          onUploadFailure,
        )
        await mutations.pages.put(recordId, {
          imageKey: key,
          status: 'image-ready',
        })
      } else {
        await mutations.pages.put(recordId, { status: 'failed' })
      }
      doneUnits += 1
      await mutations.books.put(bookId, {
        progress: clampProgress(10 + ((doneUnits / totalUnits) * 80)),
      })

      onProgress?.({
        stage: 'narrating',
        current: page.pageNumber,
        total: params.pageCount,
        message: `Recording page ${page.pageNumber}`,
      })

      await mutations.books.put(bookId, { status: 'narrating' })

      const audioRes = await callAction<AudioResp>('generatePageAudio', { text: page.text })
      if (audioRes.success) {
        const akey = await tryUpload(
          r2,
          audioRes.data.base64Mp3,
          pageAudioKey(bookId, page.pageNumber),
          'audio/mpeg',
          onUploadFailure,
        )
        await mutations.pages.put(recordId, {
          audioKey: akey,
          status: 'ready',
        })
      } else {
        await mutations.pages.put(recordId, { status: 'failed' })
      }
      doneUnits += 1
      await mutations.books.put(bookId, {
        progress: clampProgress(10 + ((doneUnits / totalUnits) * 80)),
      })
    }

    /* 7. done */
    await mutations.books.put(bookId, { status: 'ready', progress: 100 })
    onProgress?.({
      stage: 'ready',
      current: params.pageCount,
      total: params.pageCount,
      message: 'Your story is ready',
    })
    return { bookId, ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (bookId) {
      try { await deps.mutations.books.put(bookId, { status: 'failed', failureReason: msg }) } catch { /* ignore */ }
    }
    return { bookId, ok: false, error: msg }
  }
}

/* ── single-page re-rolls (used by the edit page) ───────────────────── */

export async function rerollPageImage(args: {
  callAction: PipelineDeps['callAction']
  pagesMutations: Mutations<Page>
  r2: PipelineDeps['r2']
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
  if (key) await pagesMutations.put(page.recordId, { imageKey: key })
  return { ok: true }
}

/**
 * Reserve one credit before a re-roll, refund if the integration call
 * fails (so users only pay for actual successful re-generations).
 * Server-side, the owner bypass kicks in and the deduction is a no-op.
 */
async function reserveOne(
  callAction: PipelineDeps['callAction'],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await callAction<{ balance: number }>('reserveCredits', { amount: 1 })
  if (!res.success) return { ok: false, error: res.error || 'Could not reserve credit' }
  return { ok: true }
}

async function refundOne(callAction: PipelineDeps['callAction']) {
  await callAction('refundCredits', { amount: 1 })
}

export async function rerollCover(args: {
  callAction: PipelineDeps['callAction']
  booksMutations: Mutations<Storybook>
  r2: PipelineDeps['r2']
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
  if (key) await booksMutations.put(book.recordId, { coverImageKey: key })
  return { ok: true }
}

export async function rerollPageAudio(args: {
  callAction: PipelineDeps['callAction']
  pagesMutations: Mutations<Page>
  r2: PipelineDeps['r2']
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
  if (key) await pagesMutations.put(page.recordId, { audioKey: key })
  return { ok: true }
}
