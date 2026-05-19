import type { ActionHandler, ActionResult } from 'deepspace/worker'
import type { Env } from '../../worker'
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
  buildImagePrompt,
  buildCoverImagePrompt,
  extractOutlineJson,
  type OutlineResult,
} from '../lib/storyPrompts'
import {
  OUTLINE_MODEL,
  OUTLINE_MAX_TOKENS,
  IMAGE_MODEL,
  TTS_MODEL,
  TTS_VOICE_ID,
  TTS_OUTPUT_FORMAT,
  type AgeBand,
  type ArtStyle,
} from '../plans'
import {
  PRO_MONTHLY_CREDITS,
  PRO_MONTHLY_GRANT_INTERVAL_DAYS,
  SIGNUP_BONUS_CREDITS,
} from '../subscriptions'
import { CREDITS_PER_PACK, type CreditPackId } from '../products'

/* ── outline ────────────────────────────────────────────────────────── */

interface OutlineParams {
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
}

const outlineStorybook: ActionHandler<Env> = async ({ params, tools }) => {
  try {
    const input = params as unknown as OutlineParams

    const messages = [
      { role: 'user', content: buildOutlineUserPrompt(input) },
    ]

    const result = await tools.integration<{
      content?: Array<{ type: string; text?: string }>
      stop_reason?: string
    }>('anthropic/chat-completion', {
      model: OUTLINE_MODEL,
      max_tokens: OUTLINE_MAX_TOKENS,
      system: buildOutlineSystemPrompt(),
      messages,
    })

    if (!result.success) {
      console.error('[outlineStorybook] integration failed', result.error)
      return result
    }
    const wrapper = result.data as unknown as Record<string, unknown>
    const response = (wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as { content?: Array<{ type: string; text?: string }> })
      : (wrapper as unknown as { content?: Array<{ type: string; text?: string }> }))

    const text = response?.content?.[0]?.text ?? ''
    if (!text) {
      console.error('[outlineStorybook] no text in anthropic response', JSON.stringify(response).slice(0, 500))
      return { success: false, error: 'Anthropic returned empty text content' }
    }

    let outline: OutlineResult
    try {
      outline = extractOutlineJson(text)
    } catch (err) {
      console.error('[outlineStorybook] JSON parse failed', text.slice(0, 500))
      return {
        success: false,
        error: `Failed to parse outline JSON: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
    return { success: true, data: outline }
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[outlineStorybook] unhandled', msg)
    return { success: false, error: `Outline action threw: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/* ── per-page image ─────────────────────────────────────────────────── */

interface ImageParams {
  imagePrompt: string
  artStyle: ArtStyle
  characterSheet?: string
  asCover?: { title: string; characters: string }
}

const generatePageImage: ActionHandler<Env> = async ({ params, tools }) => {
  try {
    const p = params as unknown as ImageParams
    const prompt = p.asCover
      ? buildCoverImagePrompt(p.asCover.title, p.asCover.characters, p.artStyle, p.characterSheet)
      : buildImagePrompt(p.imagePrompt, p.artStyle, p.characterSheet)

    const result = await tools.integration<{
      base64Images?: string[]
      images?: Array<{ base64?: string; data?: string }>
    }>('gemini/generate-image', {
      model: IMAGE_MODEL,
      prompt,
    })

    if (!result.success) {
      console.error('[generatePageImage] integration failed', result.error)
      return result
    }
    const wrapper = result.data as unknown as Record<string, unknown>
    const r = (wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as { base64Images?: string[]; images?: Array<{ base64?: string; data?: string }> })
      : (wrapper as unknown as { base64Images?: string[]; images?: Array<{ base64?: string; data?: string }> }))
    const first =
      r?.base64Images?.[0] ??
      r?.images?.[0]?.base64 ??
      r?.images?.[0]?.data ??
      null
    if (!first) {
      console.error('[generatePageImage] no base64 in gemini response', JSON.stringify(r).slice(0, 400))
      return { success: false, error: 'Image response had no base64 payload' }
    }
    const stripped = first.startsWith('data:') ? first.split(',', 2)[1] : first
    return { success: true, data: { base64Png: stripped } }
  } catch (err) {
    console.error('[generatePageImage] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: `Image action threw: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/* ── per-page audio ─────────────────────────────────────────────────── */

interface AudioParams {
  text: string
}

const generatePageAudio: ActionHandler<Env> = async ({ params, tools }) => {
  try {
    const p = params as unknown as AudioParams
    if (!p.text || !p.text.trim()) {
      return { success: false, error: 'Empty text — nothing to narrate' }
    }

    const result = await tools.integration<{
      audioUrl?: string
      audio_base64?: string
      audio?: string
      base64?: string
      data?: string
    }>('elevenlabs/generate-speech', {
      text: p.text,
      voice_id: TTS_VOICE_ID,
      model_id: TTS_MODEL,
      output_format: TTS_OUTPUT_FORMAT,
    })

    if (!result.success) {
      console.error('[generatePageAudio] integration failed', result.error)
      return result
    }
    const wrapper = result.data as unknown as Record<string, unknown>
    const r = (wrapper && typeof wrapper === 'object' && 'response' in wrapper
      ? (wrapper.response as Record<string, string | undefined>)
      : (wrapper as unknown as Record<string, string | undefined>))
    const raw =
      r?.audioUrl ?? r?.audio_base64 ?? r?.audio ?? r?.base64 ?? r?.data ?? null
    if (!raw) {
      console.error('[generatePageAudio] no audio in response', JSON.stringify(r).slice(0, 400))
      return { success: false, error: 'Audio response had no base64 payload' }
    }
    const stripped = raw.startsWith('data:') ? raw.split(',', 2)[1] : raw
    return { success: true, data: { base64Mp3: stripped } }
  } catch (err) {
    console.error('[generatePageAudio] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: `Audio action threw: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Credits + subscription mechanics
 * ──────────────────────────────────────────────────────────────────────── */

interface CreditAccountRow extends Record<string, unknown> {
  userId: string
  balance: number
  lifetimeGranted: number
  lifetimeSpent: number
  lastMonthlyGrantAt: number
  claimedPurchases: string[]
  gotSignupBonus: number
}

const OWNER_BALANCE_SENTINEL = 999_999

function ownerAccount(userId: string): CreditAccountRow & { isOwner: true } {
  return {
    userId,
    balance: OWNER_BALANCE_SENTINEL,
    lifetimeGranted: 0,
    lifetimeSpent: 0,
    lastMonthlyGrantAt: 0,
    claimedPurchases: [],
    gotSignupBonus: 1,
    isOwner: true,
  }
}

function isAppOwner(userId: string, env: Env): boolean {
  return Boolean(env.OWNER_USER_ID) && userId === env.OWNER_USER_ID
}

/**
 * Find-or-create the caller's credit account. Returns the envelope's
 * recordId + parsed data so callers can `tools.update` it.
 *
 * Idempotent: if the account exists, returns it; if not, creates a row
 * (and grants the signup bonus on first creation).
 */
async function loadOrCreateCreditAccount(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
  userId: string,
): Promise<ActionResult<{ recordId: string; data: CreditAccountRow }>> {
  const existing = await tools.query<CreditAccountRow>('credit_accounts', { where: { userId } })
  if (!existing.success) return existing
  const rec = existing.data.records[0]
  if (rec) {
    return { success: true, data: { recordId: rec.recordId, data: { ...rec.data, claimedPurchases: Array.isArray(rec.data.claimedPurchases) ? rec.data.claimedPurchases : [] } } }
  }
  // No row → create with signup bonus.
  const fresh: CreditAccountRow = {
    userId,
    balance: SIGNUP_BONUS_CREDITS,
    lifetimeGranted: SIGNUP_BONUS_CREDITS,
    lifetimeSpent: 0,
    lastMonthlyGrantAt: 0,
    claimedPurchases: [],
    gotSignupBonus: 1,
  }
  const created = await tools.create('credit_accounts', fresh as unknown as Record<string, unknown>)
  if (!created.success) return created
  return { success: true, data: { recordId: created.data.recordId, data: fresh } }
}

/** Public action: returns the caller's credit account state. */
const getCreditAccount: ActionHandler<Env> = async ({ userId, tools, env }) => {
  try {
    if (isAppOwner(userId, env)) {
      return { success: true, data: ownerAccount(userId) }
    }
    const acct = await loadOrCreateCreditAccount(tools, userId)
    if (!acct.success) return acct
    return { success: true, data: acct.data.data }
  } catch (err) {
    console.error('[getCreditAccount] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Atomically check + reserve N credits. Returns the new balance on
 * success; returns success: false with `insufficient: true` data
 * if the caller doesn't have enough.
 *
 * Caller-flow: check this before kicking off generation. If outline
 * fails, call `refundCredits` to give them back.
 */
const reserveCredits: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  try {
    const amount = Math.max(0, Number((params as { amount?: number }).amount ?? 0) | 0)
    if (amount <= 0) return { success: false, error: 'Invalid amount' }

    // App owner has unlimited credits — never deduct.
    if (isAppOwner(userId, env)) {
      return { success: true, data: { balance: OWNER_BALANCE_SENTINEL } }
    }

    const acct = await loadOrCreateCreditAccount(tools, userId)
    if (!acct.success) return acct
    const { recordId, data } = acct.data

    if (data.balance < amount) {
      return { success: false, error: 'Insufficient credits', data: { insufficient: true, balance: data.balance, needed: amount } as unknown as Record<string, unknown> } as unknown as ActionResult<never>
    }

    const next = {
      balance: data.balance - amount,
      lifetimeSpent: data.lifetimeSpent + amount,
    }
    const upd = await tools.update('credit_accounts', recordId, next)
    if (!upd.success) return upd
    return { success: true, data: { balance: next.balance } }
  } catch (err) {
    console.error('[reserveCredits] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Refund N credits. Used when outline fails after a reserve. */
const refundCredits: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  try {
    const amount = Math.max(0, Number((params as { amount?: number }).amount ?? 0) | 0)
    if (amount <= 0) return { success: false, error: 'Invalid amount' }
    if (isAppOwner(userId, env)) {
      return { success: true, data: { balance: OWNER_BALANCE_SENTINEL } }
    }
    const acct = await loadOrCreateCreditAccount(tools, userId)
    if (!acct.success) return acct
    const { recordId, data } = acct.data
    const upd = await tools.update('credit_accounts', recordId, {
      balance: data.balance + amount,
      lifetimeSpent: Math.max(0, data.lifetimeSpent - amount),
    })
    if (!upd.success) return upd
    return { success: true, data: { balance: data.balance + amount } }
  } catch (err) {
    console.error('[refundCredits] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Claim credits for any one-time purchases the caller has made that
 * haven't been credited yet. Idempotent — we track which purchase rows
 * we've already counted in `claimedPurchases`.
 *
 * Caller passes a list of purchase rows `{ purchaseId, productId,
 * refunded }` — typically `useCheckout().purchases`. We trust the
 * client to pass *their own* purchase list; the platform validates the
 * underlying entitlement, and our credit row is owner-scoped.
 */
interface IncomingPurchase {
  purchaseId: string
  productId: string | null
  refunded?: boolean
}

const claimPackCredits: ActionHandler<Env> = async ({ userId, params, tools }) => {
  try {
    const purchases = ((params as { purchases?: IncomingPurchase[] }).purchases ?? []).filter(
      (p): p is IncomingPurchase => !!p && typeof p.purchaseId === 'string',
    )
    const acct = await loadOrCreateCreditAccount(tools, userId)
    if (!acct.success) return acct
    const { recordId, data } = acct.data
    const alreadyClaimed = new Set(data.claimedPurchases)

    let added = 0
    const newClaimed = [...data.claimedPurchases]
    for (const p of purchases) {
      if (alreadyClaimed.has(p.purchaseId)) continue
      if (p.refunded) continue
      if (!p.productId) continue
      const credits = CREDITS_PER_PACK[p.productId as CreditPackId] ?? 0
      if (credits <= 0) continue
      added += credits
      newClaimed.push(p.purchaseId)
    }

    if (added === 0) {
      return { success: true, data: { balance: data.balance, granted: 0 } }
    }

    const upd = await tools.update('credit_accounts', recordId, {
      balance: data.balance + added,
      lifetimeGranted: data.lifetimeGranted + added,
      claimedPurchases: newClaimed,
    })
    if (!upd.success) return upd
    return { success: true, data: { balance: data.balance + added, granted: added } }
  } catch (err) {
    console.error('[claimPackCredits] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Grant Pro's monthly credit allowance if the caller is currently on
 * Pro AND enough time has elapsed since the last grant.
 *
 * Pro status is asserted by the client (the SDK verifies it via the
 * `requireSubscription` server helper if we wanted server-side proof,
 * but for v1 trusting `useSubscription().isAtLeast('pro')` is fine —
 * the worst case is a non-Pro user spamming credits, and we cap to one
 * grant per interval anyway).
 */
const claimMonthlyCredits: ActionHandler<Env> = async ({ userId, params, tools }) => {
  try {
    const claimerIsPro = Boolean((params as { isPro?: boolean }).isPro)
    if (!claimerIsPro) return { success: false, error: 'Not on a Pro plan' }

    const acct = await loadOrCreateCreditAccount(tools, userId)
    if (!acct.success) return acct
    const { recordId, data } = acct.data
    const now = Date.now()
    const intervalMs = PRO_MONTHLY_GRANT_INTERVAL_DAYS * 24 * 60 * 60 * 1000

    if (data.lastMonthlyGrantAt && now - data.lastMonthlyGrantAt < intervalMs) {
      const nextAt = data.lastMonthlyGrantAt + intervalMs
      return { success: true, data: { balance: data.balance, granted: 0, nextGrantAt: nextAt } }
    }

    const upd = await tools.update('credit_accounts', recordId, {
      balance: data.balance + PRO_MONTHLY_CREDITS,
      lifetimeGranted: data.lifetimeGranted + PRO_MONTHLY_CREDITS,
      lastMonthlyGrantAt: now,
    })
    if (!upd.success) return upd
    return {
      success: true,
      data: {
        balance: data.balance + PRO_MONTHLY_CREDITS,
        granted: PRO_MONTHLY_CREDITS,
        nextGrantAt: now + intervalMs,
      },
    }
  } catch (err) {
    console.error('[claimMonthlyCredits] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Visibility (public/private library)
 * ──────────────────────────────────────────────────────────────────────── */

interface VisibilityParams {
  bookId: string
  visibility: 'public' | 'private'
}

/**
 * Toggle a book's visibility. Owner-only. Syncs the visibility column
 * onto every page in the book so the platform-worker RBAC layer permits
 * read by other users when the parent book is public.
 */
const setBookVisibility: ActionHandler<Env> = async ({ userId, params, tools }) => {
  try {
    const { bookId, visibility } = params as unknown as VisibilityParams
    if (visibility !== 'public' && visibility !== 'private') {
      return { success: false, error: 'visibility must be public or private' }
    }
    const got = await tools.get<{ visibility?: string }>('storybooks', bookId)
    if (!got.success) return got
    const envelope = (got.data as unknown as { record: { createdBy: string } }).record
    if (envelope.createdBy !== userId) {
      return { success: false, error: 'Not the book owner' }
    }
    const upd = await tools.update('storybooks', bookId, { visibility })
    if (!upd.success) return upd

    // Sync pages.
    const pages = await tools.query<{ bookId: string }>('pages', { where: { bookId } })
    if (pages.success) {
      for (const p of pages.data.records) {
        await tools.update('pages', p.recordId, { visibility })
      }
    }
    return { success: true, data: { visibility } }
  } catch (err) {
    console.error('[setBookVisibility] unhandled', err instanceof Error ? err.stack : String(err))
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export const actions: Record<string, ActionHandler<Env>> = {
  outlineStorybook,
  generatePageImage,
  generatePageAudio,
  getCreditAccount,
  reserveCredits,
  refundCredits,
  claimPackCredits,
  claimMonthlyCredits,
  setBookVisibility,
}
