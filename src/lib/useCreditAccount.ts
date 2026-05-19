/**
 * useCreditAccount — single source of truth for the signed-in user's
 * credit balance. Three jobs:
 *   1. On mount, call `getCreditAccount` so the row exists (server
 *      action grants the signup bonus on first call).
 *   2. Live-subscribe via `useQuery` so the badge updates the moment
 *      `reserveCredits` / `claimPackCredits` finishes server-side.
 *   3. If the caller is on a Pro plan, attempt the monthly grant —
 *      the server action is idempotent so spamming it is harmless.
 */

import { useEffect, useState } from 'react'
import { useQuery, useUser } from 'deepspace'
import { callAction } from './callAction'
import type { CreditAccount } from './credits'
import { EMPTY_CREDIT_ACCOUNT } from './credits'

export interface UseCreditAccountResult {
  account: CreditAccount
  isLoading: boolean
  /** Trigger the Pro monthly grant. No-op when not Pro. */
  claimMonthly: () => Promise<void>
  /** Grant any unclaimed pack purchases. Idempotent. */
  claimPackPurchases: (
    purchases: Array<{ purchaseId: string; productId: string | null; refunded?: boolean }>,
  ) => Promise<{ granted: number }>
}

export function useCreditAccount(options?: { isPro?: boolean }): UseCreditAccountResult {
  const { user } = useUser()
  const userId = user?.id ?? ''

  const { records, status } = useQuery<CreditAccount>('credit_accounts', {
    where: { userId },
  })

  // Owner-detect from the bootstrap call. We can't tell client-side without
  // server confirmation (OWNER_USER_ID isn't exposed to the browser).
  const [ownerOverride, setOwnerOverride] = useState<CreditAccount | null>(null)

  // Bootstrap the row on first mount.
  useEffect(() => {
    if (!userId) return
    void (async () => {
      const res = await callAction<CreditAccount>('getCreditAccount', {})
      if (res.success && res.data.isOwner) {
        setOwnerOverride(res.data)
      }
    })()
  }, [userId])

  // Attempt the monthly grant when the caller is Pro. The server caps
  // grants to one per interval, so calling on every mount is safe.
  useEffect(() => {
    if (!userId) return
    if (!options?.isPro) return
    void callAction('claimMonthlyCredits', { isPro: true })
  }, [userId, options?.isPro])

  const envelope = records[0]
  const data = envelope?.data ?? EMPTY_CREDIT_ACCOUNT
  const account: CreditAccount = ownerOverride ?? {
    ...EMPTY_CREDIT_ACCOUNT,
    ...data,
    claimedPurchases: Array.isArray(data.claimedPurchases) ? data.claimedPurchases : [],
  }

  async function claimMonthly() {
    if (!userId || !options?.isPro) return
    await callAction('claimMonthlyCredits', { isPro: true })
  }

  async function claimPackPurchases(
    purchases: Array<{ purchaseId: string; productId: string | null; refunded?: boolean }>,
  ) {
    const res = await callAction<{ balance: number; granted: number }>('claimPackCredits', {
      purchases,
    })
    if (!res.success) return { granted: 0 }
    return { granted: res.data.granted }
  }

  return {
    account,
    isLoading: !ownerOverride && status === 'loading' && !envelope,
    claimMonthly,
    claimPackPurchases,
  }
}
