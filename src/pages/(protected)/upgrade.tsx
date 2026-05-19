/**
 * /upgrade — subscription plans (Free / Pro) and one-time credit packs.
 *
 * Two purchase flows wired here:
 *   - `useSubscription().subscribe('pro')` for the recurring plan
 *   - `useCheckout({ productId }).chargeOnce({ productId })` for packs
 *
 * On return from Stripe Checkout we call `claimPackPurchases` to grant
 * any unclaimed pack credits (idempotent server-side).
 */

import { useEffect, useState } from 'react'
import { useCheckout, useSubscription } from 'deepspace'
import { Check, Coins } from 'lucide-react'
import { Button, useToast } from '../../components/ui'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'
import { oneTimeProducts, CREDITS_PER_PACK, type CreditPackId } from '../../products'
import { PRO_MONTHLY_CREDITS } from '../../subscriptions'

interface FeatureRow {
  label: string
  free: boolean
  pro: boolean
}

const FEATURES: FeatureRow[] = [
  { label: 'Create personalized storybooks', free: true, pro: true },
  { label: 'Pay-as-you-go credits', free: true, pro: true },
  { label: 'Keep books private or public', free: true, pro: true },
  { label: `${PRO_MONTHLY_CREDITS} credits every month`, free: false, pro: true },
  { label: 'Explore the public library', free: false, pro: true },
  { label: '7-day free trial', free: false, pro: true },
]

export default function Upgrade() {
  const toast = useToast()
  const sub = useSubscription()
  const isPro = useIsPro()
  const co = useCheckout()
  const { account, claimPackPurchases } = useCreditAccount({ isPro })
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [busy, setBusy] = useState<string | null>(null)

  // Refresh subscription + purchase state when the page mounts (returning
  // from Stripe Checkout). Local rows reconcile ~1-2s after webhook.
  useEffect(() => {
    void sub.refresh?.()
    void co.refresh?.()
  }, [])

  // Grant any unclaimed pack credits whenever the purchase list changes.
  useEffect(() => {
    const purchases = (co.purchases ?? []).map((p) => ({
      purchaseId: (p as { id?: string; purchaseId?: string }).id ??
        (p as { id?: string; purchaseId?: string }).purchaseId ?? '',
      productId: (p as { productId?: string | null }).productId ?? null,
      refunded: Boolean((p as { refunded?: boolean }).refunded),
    })).filter((p) => p.purchaseId)
    if (purchases.length === 0) return
    let canceled = false
    ;(async () => {
      const res = await claimPackPurchases(purchases)
      if (canceled) return
      if (res.granted > 0) {
        toast.success(`Added ${res.granted} credits`, 'Thank you')
      }
    })()
    return () => { canceled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [co.purchases])

  async function onSubscribePro() {
    setBusy('pro')
    try {
      await sub.subscribe('pro', { interval })
    } catch (err) {
      toast.error('Could not start checkout', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  async function onBuyPack(id: CreditPackId) {
    setBusy(id)
    try {
      await co.chargeOnce({ productId: id })
    } catch (err) {
      toast.error('Could not start checkout', err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 text-center">
        <h1
          className="font-serif text-[40px] leading-tight"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Plans &amp; credits
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          One credit per page. An 8-page book costs 8 credits.
        </p>
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]"
          style={{
            background: 'var(--storynest-paper-deep)',
            border: '1px solid var(--storynest-rule)',
            color: 'var(--storynest-ink, var(--color-foreground))',
          }}
        >
          <Coins
            className="h-4 w-4"
            aria-hidden
            style={{ color: 'var(--storynest-marigold-d)' }}
          />
          <span data-testid="upgrade-balance">{account.balance} credits in your account</span>
        </div>
      </header>

      {/* ── Plans ───────────────────────────────────────────────────────── */}
      <section className="mb-12 grid gap-5 md:grid-cols-2">
        {/* Free */}
        <div
          className="rounded-lg p-6"
          style={{
            background: 'var(--storynest-paper-deep)',
            border: '1px solid var(--storynest-rule)',
          }}
        >
          <h2
            className="font-serif text-[28px]"
            style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
          >
            Free
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--storynest-ink-mute)' }}
          >
            Make storybooks on a pay-as-you-go basis. No subscription.
          </p>
          <div
            className="mt-4 font-serif text-[40px]"
            style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
          >
            $0
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                  style={{
                    color: f.free
                      ? 'var(--storynest-sage)'
                      : 'oklch(0.85 0.01 84)',
                  }}
                />
                <span
                  style={{
                    color: f.free
                      ? 'var(--storynest-ink, var(--color-foreground))'
                      : 'var(--storynest-ink-mute)',
                    textDecoration: f.free ? 'none' : 'line-through',
                  }}
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
          {!isPro && (
            <div
              className="mt-6 inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium"
              style={{
                background: 'var(--storynest-paper)',
                color: 'var(--storynest-ink-mute)',
                border: '1px solid var(--storynest-rule)',
              }}
            >
              Your current plan
            </div>
          )}
        </div>

        {/* Pro */}
        <div
          className="relative rounded-lg p-6"
          style={{
            background: 'var(--storynest-paper)',
            border: '2px solid var(--storynest-marigold)',
            boxShadow: '0 8px 24px oklch(0.78 0.155 72 / 0.12)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              className="font-serif text-[28px]"
              style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
            >
              Pro
            </h2>
            <div
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]"
              style={{
                background: 'var(--storynest-marigold)',
                color: 'oklch(0.18 0.04 60)',
              }}
            >
              7-day trial
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInterval('month')}
              data-testid="interval-month"
              className="rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: interval === 'month' ? 'var(--storynest-paper-deep)' : 'transparent',
                color: 'var(--storynest-ink, var(--color-foreground))',
                border: '1px solid var(--storynest-rule)',
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              data-testid="interval-year"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: interval === 'year' ? 'var(--storynest-paper-deep)' : 'transparent',
                color: 'var(--storynest-ink, var(--color-foreground))',
                border: '1px solid var(--storynest-rule)',
              }}
            >
              Yearly
              <span style={{ color: 'var(--storynest-sage)' }}>save 25%</span>
            </button>
          </div>

          <div
            className="mt-4 font-serif text-[40px]"
            style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
          >
            ${interval === 'month' ? '12' : '9'}
            <span
              className="text-[16px]"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              {' '}/ month
            </span>
          </div>
          {interval === 'year' && (
            <div
              className="mt-1 text-xs"
              style={{ color: 'var(--storynest-ink-mute)' }}
            >
              Billed $108 yearly
            </div>
          )}

          <ul className="mt-5 space-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                  style={{
                    color: f.pro
                      ? 'var(--storynest-sage)'
                      : 'oklch(0.85 0.01 84)',
                  }}
                />
                <span
                  style={{
                    color: f.pro
                      ? 'var(--storynest-ink, var(--color-foreground))'
                      : 'var(--storynest-ink-mute)',
                  }}
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isPro ? (
              <>
                <div
                  className="inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    background: 'var(--storynest-sage)',
                    color: 'oklch(0.18 0.04 150)',
                  }}
                >
                  You're on Pro
                </div>
                <button
                  type="button"
                  onClick={() => sub.openPortal()}
                  className="text-[12px] underline"
                  style={{ color: 'var(--storynest-ink-mute)' }}
                >
                  Manage billing
                </button>
              </>
            ) : (
              <Button
                onClick={onSubscribePro}
                loading={busy === 'pro'}
                disabled={busy !== null}
                data-testid="subscribe-pro"
                style={{
                  background: 'var(--storynest-marigold)',
                  color: 'oklch(0.18 0.04 60)',
                  border: 'none',
                }}
              >
                Start 7-day trial
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Credit packs ─────────────────────────────────────────────────── */}
      <section>
        <h2
          className="font-serif text-[28px]"
          style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
        >
          Buy credits
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--storynest-ink-mute)' }}
        >
          Credits never expire. One-time purchase, no subscription required.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {oneTimeProducts.map((product) => {
            const credits = CREDITS_PER_PACK[product.productId]
            const dollars = (product.amountCents / 100).toFixed(0)
            const perCredit = (product.amountCents / 100 / credits).toFixed(3)
            const isPopular = product.productId === 'credits_standard'
            return (
              <div
                key={product.productId}
                data-testid={`pack-${product.productId}`}
                className="relative rounded-lg p-5"
                style={{
                  background: 'var(--storynest-paper-deep)',
                  border: isPopular
                    ? '2px solid var(--storynest-marigold)'
                    : '1px solid var(--storynest-rule)',
                }}
              >
                {isPopular && (
                  <div
                    className="absolute -top-2 left-4 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]"
                    style={{
                      background: 'var(--storynest-marigold)',
                      color: 'oklch(0.18 0.04 60)',
                    }}
                  >
                    Most popular
                  </div>
                )}
                <div
                  className="font-serif text-[22px]"
                  style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
                >
                  {credits} credits
                </div>
                <div
                  className="mt-1 text-xs"
                  style={{ color: 'var(--storynest-ink-mute)' }}
                >
                  ${perCredit} per credit
                </div>
                <div
                  className="mt-3 font-serif text-[32px]"
                  style={{ color: 'var(--storynest-ink, var(--color-foreground))' }}
                >
                  ${dollars}
                </div>
                <Button
                  onClick={() => onBuyPack(product.productId)}
                  loading={busy === product.productId}
                  disabled={busy !== null}
                  data-testid={`buy-${product.productId}`}
                  className="mt-4 w-full"
                  style={{
                    background: isPopular
                      ? 'var(--storynest-marigold)'
                      : 'transparent',
                    color: isPopular
                      ? 'oklch(0.18 0.04 60)'
                      : 'var(--storynest-ink, var(--color-foreground))',
                    border: isPopular ? 'none' : '1px solid var(--storynest-rule)',
                  }}
                >
                  Buy
                </Button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
