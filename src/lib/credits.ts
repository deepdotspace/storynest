/**
 * Pure helpers for credit math. Kept out of the action file so UI can
 * import them without pulling in worker-only deps.
 */

import type { PageCount } from '../plans'

/** Cost to generate a book of N pages. 1 credit per page. */
export function creditsForBook(pageCount: PageCount | number): number {
  return Number(pageCount) || 0
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
