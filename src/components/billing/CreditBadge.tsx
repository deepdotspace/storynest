/**
 * Credit pill shown in the top nav. Reads the user's live credit
 * balance and links to /upgrade. Hidden when anonymous.
 *
 * Sticker recipe — sun-soft bg, coral coin icon. Owner variant uses a
 * lavender-soft bg with lavender-deep text.
 */

import { Link } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { Coins } from 'lucide-react'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'

const STICKER_SHADOW = '2px 2px 0 0 oklch(0.22 0.04 265 / 0.10)'

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
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
        style={{
          background: 'var(--storynest-lavender-soft)',
          color: 'var(--storynest-lavender-deep)',
          border: '1.5px solid var(--storynest-lavender)',
          boxShadow: STICKER_SHADOW,
        }}
      >
        <Coins
          className="h-3.5 w-3.5"
          aria-hidden
          style={{ color: 'var(--storynest-lavender-deep)' }}
        />
        <span>
          Admin
          <span className="ml-1 hidden sm:inline opacity-80">· unlimited</span>
        </span>
      </span>
    )
  }

  return (
    <Link
      to="/upgrade"
      data-testid="credit-badge"
      title={`${account.balance} credits — click to add more`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-transform hover:-translate-y-0.5"
      style={{
        background: 'var(--storynest-sun-soft)',
        color: 'var(--storynest-ink)',
        border: '1.5px solid var(--storynest-sun)',
        boxShadow: STICKER_SHADOW,
      }}
    >
      <Coins
        className="h-3.5 w-3.5"
        aria-hidden
        style={{ color: 'var(--storynest-coral)' }}
      />
      <span>
        {isLoading ? '—' : account.balance}
        <span
          className="ml-1 hidden sm:inline"
          style={{ color: 'var(--storynest-ink-soft)' }}
        >
          credits
        </span>
      </span>
    </Link>
  )
}
