/**
 * Credit pill shown in the top nav. Reads the user's live credit
 * balance and links to /upgrade. Quiet when the user is anonymous.
 */

import { Link } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { Coins } from 'lucide-react'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'

export function CreditBadge() {
  const { isSignedIn } = useAuth()
  const isPro = useIsPro()
  const { account, isLoading } = useCreditAccount({ isPro })

  if (!isSignedIn) return null

  if (account.isOwner) {
    return (
      <span
        data-testid="credit-badge"
        title="Admin · unlimited credits"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
        style={{
          background: 'oklch(0.94 0.022 84)',
          color: 'var(--storynest-ink, #1a1a2e)',
          border: '1px solid var(--storynest-rule)',
        }}
      >
        <Coins
          className="h-3.5 w-3.5"
          aria-hidden
          style={{ color: 'var(--storynest-marigold-d, var(--storynest-marigold))' }}
        />
        <span>
          Admin
          <span
            className="ml-1 hidden sm:inline"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            · unlimited
          </span>
        </span>
      </span>
    )
  }

  return (
    <Link
      to="/upgrade"
      data-testid="credit-badge"
      title={`${account.balance} credits — click to add more`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors hover:opacity-90"
      style={{
        background: 'oklch(0.94 0.022 84)',
        color: 'var(--storynest-ink, #1a1a2e)',
        border: '1px solid var(--storynest-rule)',
      }}
    >
      <Coins
        className="h-3.5 w-3.5"
        aria-hidden
        style={{ color: 'var(--storynest-marigold-d, var(--storynest-marigold))' }}
      />
      <span>
        {isLoading ? '—' : account.balance}
        <span
          className="ml-1 hidden sm:inline"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          credits
        </span>
      </span>
    </Link>
  )
}
