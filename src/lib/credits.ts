/**
 * Pure helpers for credit math. Kept out of the action file so UI can
 * import them without pulling in worker-only deps.
 */

import type { PageCount } from '../plans'

/**
 * Pricing unit: **1 credit = 1 generated asset** (one image OR one
 * audio narration). A full page is image + audio = 2 credits. Re-rolls
 * are also priced per-asset (1 credit each), so the cost matches what
 * was actually regenerated.
 */
export const CREDITS_PER_PAGE = 2
export const CREDITS_PER_REROLL = 1

/** Cost to generate a book of N pages. Cover is bundled — no extra charge. */
export function creditsForBook(pageCount: PageCount | number): number {
  return (Number(pageCount) || 0) * CREDITS_PER_PAGE
}

export interface CreditAccount {
  userId: string
  balance: number
  lifetimeGranted: number
  lifetimeSpent: number
  lastMonthlyGrantAt: number
  claimedPurchases: string[]
  gotSignupBonus: number
  /** True when the caller is the app owner — unlimited credits, no paywall. */
  isOwner?: boolean
}

export const EMPTY_CREDIT_ACCOUNT: CreditAccount = {
  userId: '',
  balance: 0,
  lifetimeGranted: 0,
  lifetimeSpent: 0,
  lastMonthlyGrantAt: 0,
  claimedPurchases: [],
  gotSignupBonus: 0,
  isOwner: false,
}

/** Sentinel balance shown to the owner. Pre-flight checks treat it as unlimited. */
export const OWNER_BALANCE_SENTINEL = 999_999
