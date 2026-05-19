import { useSubscription } from 'deepspace'
import { useCreditAccount } from './useCreditAccount'

/**
 * Returns true when the caller is entitled to Pro features.
 * Three paths grant entitlement:
 *   1. The app owner (server confirms via `isOwner` on getCreditAccount).
 *   2. An active Pro subscriber (handles `past_due` / `canceled` correctly
 *      via the SDK's `isAtLeast` helper, not a bare slug check).
 *
 * Using `isAtLeast('pro')` (not `tier === 'pro'`) avoids leaking paid
 * features to past-due / canceled subscribers — see payments SKILL.md.
 */
export function useIsPro(): boolean {
  const sub = useSubscription()
  const { account } = useCreditAccount()
  if (account.isOwner) return true
  if (sub.isLoading) return false
  return sub.isAtLeast('pro')
}
