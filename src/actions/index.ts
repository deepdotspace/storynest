import type { ActionHandler, ActionResult } from 'deepspace/worker'
import { enqueueJob } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generateImageBytes } from '../server/ai/image'
import { generateAudioBytes } from '../server/ai/audio'
import { type AgeBand, type ArtStyle } from '../plans'
import {
  PRO_MONTHLY_CREDITS,
  PRO_MONTHLY_GRANT_INTERVAL_DAYS,
  SIGNUP_BONUS_CREDITS,
} from '../subscriptions'
import { CREDITS_PER_PACK, type CreditPackId } from '../products'
import type { StorybookJobPayload } from '../server/jobs/storybookJob'
import type { RetryFailedPagesPayload } from '../server/jobs/retryFailedPagesJob'

/* ── per-page image (used by single-page reroll in /edit) ───────────── */

interface ImageParams {
  imagePrompt: string
  artStyle: ArtStyle
  characterSheet?: string
  asCover?: { title: string; characters: string }
}

const generatePageImage: ActionHandler<Env> = async ({ params, tools }) => {
  try {
    const p = params as unknown as ImageParams
    const bytes = p.asCover
      ? await generateImageBytes(tools, {
          kind: 'cover',
          title: p.asCover.title,
          characters: p.asCover.characters,
          artStyle: p.artStyle,
          characterSheet: p.characterSheet,
        })
      : await generateImageBytes(tools, {
          kind: 'page',
          imagePrompt: p.imagePrompt,
          artStyle: p.artStyle,
          characterSheet: p.characterSheet,
        })
    return { success: true, data: bytes }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generatePageImage]', msg)
    return { success: false, error: msg }
  }
}

/* ── per-page audio (used by single-page reroll in /edit) ───────────── */

interface AudioParams {
  text: string
}

const generatePageAudio: ActionHandler<Env> = async ({ params, tools }) => {
  try {
    const p = params as unknown as AudioParams
    const bytes = await generateAudioBytes(tools, p.text ?? '')
    return { success: true, data: bytes }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generatePageAudio]', msg)
    return { success: false, error: msg }
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

/* ────────────────────────────────────────────────────────────────────────
 * Admin: featured story picker + help messages
 *
 * Featured-story id lives in the existing `settings` (key/value) collection
 * under key='featured_story_id'. Admin-gated by env.OWNER_USER_ID — role
 * checks on the client are advisory; the server is authoritative.
 * ──────────────────────────────────────────────────────────────────────── */

function requireOwner(userId: string, env: Env): ActionResult<never> | null {
  if (!env.OWNER_USER_ID || userId !== env.OWNER_USER_ID) {
    return { success: false, error: 'forbidden' }
  }
  return null
}

const FEATURED_KEY = 'featured_story_id'

interface SettingRow extends Record<string, unknown> {
  key: string
  value: string
}

interface StorybookRow extends Record<string, unknown> {
  title?: string
  visibility?: string
  status?: string
  coverImageKey?: string
  characters?: string
  ageBand?: string
  artStyle?: string
}

async function findFeaturedSettingRecord(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
): Promise<{ recordId: string; data: SettingRow } | null> {
  const q = await tools.query<SettingRow>('settings', { where: { key: FEATURED_KEY } })
  if (!q.success) return null
  const rec = q.data.records[0]
  return rec ? { recordId: rec.recordId, data: rec.data } : null
}

const listPublicStories: ActionHandler<Env> = async ({ userId, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const q = await tools.query<StorybookRow>('storybooks', {
      where: { visibility: 'public' },
      orderBy: 'updatedAt',
      orderDir: 'desc',
    })
    if (!q.success) return q
    return {
      success: true,
      data: {
        stories: q.data.records.map((r) => ({
          recordId: r.recordId,
          title: r.data.title ?? 'Untitled',
          status: r.data.status ?? '',
          coverImageKey: r.data.coverImageKey ?? null,
          characters: r.data.characters ?? '',
          ageBand: r.data.ageBand ?? '',
          artStyle: r.data.artStyle ?? '',
        })),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const setFeaturedStory: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const bookId = String((params as { bookId?: string }).bookId ?? '').trim()
    if (!bookId) return { success: false, error: 'bookId required' }
    const got = await tools.get<StorybookRow>('storybooks', bookId)
    if (!got.success) return got
    const env2 = (got.data as unknown as { record: { data: StorybookRow } }).record
    if (env2.data.visibility !== 'public') {
      return { success: false, error: 'Story must be public to feature' }
    }
    if (env2.data.status !== 'ready') {
      return { success: false, error: 'Story must be ready to feature' }
    }
    const existing = await findFeaturedSettingRecord(tools)
    if (existing) {
      const upd = await tools.update('settings', existing.recordId, { value: bookId })
      if (!upd.success) return upd
    } else {
      const created = await tools.create('settings', { key: FEATURED_KEY, value: bookId })
      if (!created.success) return created
    }
    return { success: true, data: { bookId } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const clearFeaturedStory: ActionHandler<Env> = async ({ userId, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const existing = await findFeaturedSettingRecord(tools)
    if (!existing) return { success: true, data: { cleared: false } }
    const del = await tools.remove('settings', existing.recordId)
    if (!del.success) return del
    return { success: true, data: { cleared: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const getFeaturedStoryId: ActionHandler<Env> = async ({ userId, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const existing = await findFeaturedSettingRecord(tools)
    return { success: true, data: { bookId: existing?.data.value ?? null } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

interface HelpMessageRow extends Record<string, unknown> {
  userId: string
  userEmail: string
  userName: string
  message: string
  status: string
  createdAt: number
}

const sendHelpMessage: ActionHandler<Env> = async ({ userId, params, tools }) => {
  try {
    const p = params as { message?: string; email?: string; name?: string }
    const message = String(p.message ?? '').trim()
    if (!message) return { success: false, error: 'Message is empty' }
    if (message.length > 5000) {
      return { success: false, error: 'Message too long (5000 char max)' }
    }
    const row: HelpMessageRow = {
      userId,
      userEmail: String(p.email ?? '').slice(0, 320),
      userName: String(p.name ?? '').slice(0, 200),
      message,
      status: 'open',
      createdAt: Date.now(),
    }
    const created = await tools.create('help_messages', row as unknown as Record<string, unknown>)
    if (!created.success) return created
    return { success: true, data: { sent: true } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const listHelpMessages: ActionHandler<Env> = async ({ userId, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const q = await tools.query<HelpMessageRow>('help_messages', {
      orderBy: 'createdAt',
      orderDir: 'desc',
    })
    if (!q.success) return q
    return {
      success: true,
      data: {
        messages: q.data.records.map((r) => ({
          recordId: r.recordId,
          userId: r.data.userId,
          userEmail: r.data.userEmail ?? '',
          userName: r.data.userName ?? '',
          message: r.data.message ?? '',
          status: r.data.status ?? 'open',
          createdAt: r.data.createdAt ?? 0,
        })),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const setHelpMessageStatus: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  const denied = requireOwner(userId, env)
  if (denied) return denied
  try {
    const p = params as { recordId?: string; status?: string }
    const recordId = String(p.recordId ?? '').trim()
    const status = String(p.status ?? '').trim()
    if (!recordId) return { success: false, error: 'recordId required' }
    if (status !== 'open' && status !== 'resolved') {
      return { success: false, error: 'status must be open or resolved' }
    }
    const upd = await tools.update('help_messages', recordId, { status })
    if (!upd.success) return upd
    return { success: true, data: { status } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Storybook generation — enqueue path
 *
 * The browser previously ran the full pipeline (outline → per-page image
 * → per-page audio → upload). That was fragile: tab-close killed it, no
 * retries, no parallelism. We now reserve credits, create a placeholder
 * book row, and enqueue a JobRoom job. The job runs server-side and
 * updates the same records the client is already subscribed to.
 * ──────────────────────────────────────────────────────────────────────── */

interface EnqueueParams {
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
}

interface PlaceholderBookRow extends Record<string, unknown> {
  title: string
  prompt: string
  characters: string
  lesson: string
  ageBand: AgeBand
  pageCount: number
  artStyle: ArtStyle
  coverImageKey: string
  status: string
  failureReason: string
  progress: number
  visibility: string
  characterSheet: string
}

const enqueueStorybookGeneration: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  try {
    const p = params as unknown as EnqueueParams
    if (!p.prompt?.trim()) return { success: false, error: 'Story idea required' }
    if (!p.characters?.trim()) return { success: false, error: 'Characters required' }
    const pageCount = Math.max(1, Math.min(20, Number(p.pageCount) | 0))

    const cost = pageCount * 2
    const reserveResult = await reserveCreditsInline(tools, userId, env, cost)
    if (!reserveResult.success) return reserveResult

    const placeholder: PlaceholderBookRow = {
      title: 'Untitled story',
      prompt: p.prompt.trim(),
      characters: p.characters.trim(),
      lesson: (p.lesson ?? '').trim(),
      ageBand: p.ageBand,
      pageCount,
      artStyle: p.artStyle,
      coverImageKey: '',
      status: 'outlining',
      failureReason: '',
      progress: 5,
      visibility: 'public',
      characterSheet: '',
    }
    const created = await tools.create('storybooks', placeholder)
    if (!created.success) {
      await refundCreditsInline(tools, userId, env, cost)
      return created
    }
    const bookId = (created.data as { recordId?: string }).recordId
    if (!bookId) {
      await refundCreditsInline(tools, userId, env, cost)
      return { success: false, error: 'create_book_failed: no_recordId' }
    }

    const payload: StorybookJobPayload = {
      userId,
      bookId,
      reservedCredits: cost,
      params: {
        prompt: p.prompt.trim(),
        characters: p.characters.trim(),
        lesson: (p.lesson ?? '').trim(),
        ageBand: p.ageBand,
        pageCount,
        artStyle: p.artStyle,
      },
    }
    await enqueueJob(env.JOB_ROOMS, `app:${env.APP_NAME}`, 'generate-storybook', payload)

    return { success: true, data: { bookId } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enqueueStorybookGeneration]', msg)
    return { success: false, error: msg }
  }
}

const enqueueRetryFailedPages: ActionHandler<Env> = async ({ userId, params, tools, env }) => {
  try {
    const bookId = String((params as { bookId?: string }).bookId ?? '').trim()
    if (!bookId) return { success: false, error: 'bookId required' }
    const got = await tools.get('storybooks', bookId)
    if (!got.success) return got
    const book = (got.data as unknown as { record: { createdBy: string } }).record
    if (book.createdBy !== userId) return { success: false, error: 'forbidden' }

    // Count the pages that need redo so we can charge accurately.
    const pagesQ = await tools.query<{ imageKey?: string; audioKey?: string; status?: string }>(
      'pages',
      { where: { bookId } },
    )
    if (!pagesQ.success) return pagesQ
    let cost = 0
    for (const r of pagesQ.data.records) {
      const d = r.data
      if (!d.imageKey) cost++
      if (!d.audioKey) cost++
    }
    if (cost === 0) {
      return { success: true, data: { nothingToRetry: true } }
    }

    const reserveResult = await reserveCreditsInline(tools, userId, env, cost)
    if (!reserveResult.success) return reserveResult

    await tools.update('storybooks', bookId, {
      status: 'illustrating',
      failureReason: '',
      progress: 10,
    })

    const payload: RetryFailedPagesPayload = { userId, bookId }
    await enqueueJob(env.JOB_ROOMS, `app:${env.APP_NAME}`, 'retry-failed-pages', payload)

    return { success: true, data: { bookId, retrySteps: cost } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enqueueRetryFailedPages]', msg)
    return { success: false, error: msg }
  }
}

/* Internal helpers reused by enqueue actions — same semantics as the
 * standalone reserveCredits/refundCredits actions but callable directly
 * instead of round-tripping through the action dispatcher. */
async function reserveCreditsInline(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
  userId: string,
  env: Env,
  amount: number,
): Promise<ActionResult<{ balance: number }>> {
  if (isAppOwner(userId, env)) return { success: true, data: { balance: OWNER_BALANCE_SENTINEL } }
  const acct = await loadOrCreateCreditAccount(tools, userId)
  if (!acct.success) return acct
  const { recordId, data } = acct.data
  if (data.balance < amount) {
    return { success: false, error: `Insufficient credits — need ${amount}, have ${data.balance}` }
  }
  const next = {
    balance: data.balance - amount,
    lifetimeSpent: data.lifetimeSpent + amount,
  }
  const upd = await tools.update('credit_accounts', recordId, next)
  if (!upd.success) return upd
  return { success: true, data: { balance: next.balance } }
}

async function refundCreditsInline(
  tools: Parameters<ActionHandler<Env>>[0]['tools'],
  userId: string,
  env: Env,
  amount: number,
): Promise<void> {
  if (amount <= 0) return
  if (isAppOwner(userId, env)) return
  const acct = await loadOrCreateCreditAccount(tools, userId)
  if (!acct.success) return
  const { recordId, data } = acct.data
  await tools.update('credit_accounts', recordId, {
    balance: data.balance + amount,
    lifetimeSpent: Math.max(0, data.lifetimeSpent - amount),
  })
}

export const actions: Record<string, ActionHandler<Env>> = {
  generatePageImage,
  generatePageAudio,
  getCreditAccount,
  reserveCredits,
  refundCredits,
  claimPackCredits,
  claimMonthlyCredits,
  setBookVisibility,
  listPublicStories,
  setFeaturedStory,
  clearFeaturedStory,
  getFeaturedStoryId,
  sendHelpMessage,
  listHelpMessages,
  setHelpMessageStatus,
  enqueueStorybookGeneration,
  enqueueRetryFailedPages,
}
