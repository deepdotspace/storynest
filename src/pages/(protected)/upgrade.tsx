/**
 * /upgrade — subscription plans (Free / Pro) and one-time credit packs.
 *
 * Two purchase flows wired here:
 *   - `useSubscription().subscribe('pro')` for the recurring plan
 *   - `useCheckout({ productId }).chargeOnce({ productId })` for packs
 *
 * On return from Stripe Checkout we call `claimPackPurchases` to grant
 * any unclaimed pack credits (idempotent server-side).
 *
 * v2 visual: sticker cards, Fredoka headings, lavender Pro card with
 * Hootie peeking out, multi-color credit packs, Cloud / Star decor.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useCheckout, useSubscription } from 'deepspace'
import { Check, Coins, X as XIcon } from 'lucide-react'
import { Button, useToast } from '../../components/ui'
import { useCreditAccount } from '../../lib/useCreditAccount'
import { useIsPro } from '../../lib/useIsPro'
import { oneTimeProducts, CREDITS_PER_PACK, type CreditPackId } from '../../products'
import { PRO_MONTHLY_CREDITS } from '../../subscriptions'
import { Hootie } from '../../components/mascots/Hootie'
import { Cloud, Star } from '../../components/decor'

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

type PackVariant = 'sky' | 'sun' | 'mint'

interface PackVariantStyle {
  bg: string
  border: string
  borderL: string
  pillBg: string
  pillDeep: string
}

const PACK_VARIANTS: Record<PackVariant, PackVariantStyle> = {
  sky: {
    bg: 'var(--storynest-sky-soft)',
    border: '1.5px solid var(--storynest-rule)',
    borderL: 'var(--storynest-sky-deep)',
    pillBg: 'var(--storynest-sky)',
    pillDeep: 'var(--storynest-sky-deep)',
  },
  sun: {
    bg: 'var(--storynest-sun-soft)',
    border: '2.5px solid var(--storynest-sun)',
    borderL: 'var(--storynest-sun-deep)',
    pillBg: 'var(--storynest-sun)',
    pillDeep: 'var(--storynest-sun-deep)',
  },
  mint: {
    bg: 'var(--storynest-mint-soft)',
    border: '1.5px solid var(--storynest-rule)',
    borderL: 'var(--storynest-mint-deep)',
    pillBg: 'var(--storynest-mint)',
    pillDeep: 'var(--storynest-mint-deep)',
  },
}

const PACK_VARIANT_BY_ID: Record<CreditPackId, PackVariant> = {
  credits_starter: 'sky',
  credits_standard: 'sun',
  credits_bulk: 'mint',
}

const DISPLAY = 'var(--storynest-font-display, Fredoka), system-ui, sans-serif'
const BODY = 'var(--storynest-font-body, Nunito), system-ui, sans-serif'
const HAND = 'var(--storynest-font-hand, Caveat), cursive'

export default function Upgrade() {
  const toast = useToast()
  const sub = useSubscription()
  const isPro = useIsPro()
  const co = useCheckout()
  const { account, claimPackPurchases } = useCreditAccount({ isPro })
  const [interval, setIntervalState] = useState<'month' | 'year'>('month')
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

  const isOwner = Boolean(account.isOwner)

  return (
    <div
      className="relative mx-auto max-w-6xl px-6 py-16"
      style={{ background: 'transparent' }}
    >
      {/* Background decor — quiet, behind everything */}
      <Cloud
        size={140}
        style={{ position: 'absolute', top: 40, left: -30, opacity: 0.7, zIndex: 0 }}
      />
      <Cloud
        size={110}
        style={{ position: 'absolute', top: 110, right: -20, opacity: 0.65, zIndex: 0 }}
      />
      <Star
        size={44}
        style={{ position: 'absolute', top: 280, left: 60, opacity: 0.7, zIndex: 0 }}
      />
      <Star
        size={36}
        style={{ position: 'absolute', top: 580, right: 80, opacity: 0.6, zIndex: 0 }}
        color="var(--storynest-coral)"
      />
      <Star
        size={32}
        style={{ position: 'absolute', bottom: 80, left: 100, opacity: 0.65, zIndex: 0 }}
        color="var(--storynest-mint)"
      />

      <header className="relative z-10 mb-12 text-center">
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            color: 'var(--storynest-ink)',
          }}
        >
          Plans &amp; credits
        </h1>
        <p
          className="mt-2"
          style={{
            fontFamily: HAND,
            fontSize: 22,
            color: 'var(--storynest-ink-mute)',
          }}
        >
          2 credits per page · 1 per re-roll · pay-as-you-go or subscribe
        </p>

        <div
          className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: isOwner
              ? 'var(--storynest-lavender-soft)'
              : 'var(--storynest-sun-soft)',
            border: `1.5px solid ${isOwner ? 'var(--storynest-lavender)' : 'var(--storynest-sun)'}`,
            color: 'var(--storynest-ink)',
            fontFamily: BODY,
            fontWeight: 600,
            fontSize: 13,
            boxShadow: 'var(--shadow-sticker)',
          }}
        >
          <Coins
            className="h-4 w-4"
            aria-hidden
            style={{
              color: isOwner
                ? 'var(--storynest-lavender-deep)'
                : 'var(--storynest-coral-deep)',
            }}
          />
          <span data-testid="upgrade-balance">
            {isOwner
              ? 'Admin · unlimited credits'
              : `${account.balance} credits in your account`}
          </span>
        </div>
      </header>

      {/* ── Plans ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 mb-16 grid gap-6 md:grid-cols-2">
        {/* Free */}
        <PlanCard
          name="Free"
          accent={
            <Pill bg="var(--storynest-mint-soft)" border="var(--storynest-mint)" color="var(--storynest-ink)">
              $0 / always
            </Pill>
          }
          features={FEATURES.map((f) => ({ label: f.label, included: f.free }))}
          footer={
            !isPro && !isOwner ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1.5"
                style={{
                  background: 'var(--storynest-card-soft)',
                  color: 'var(--storynest-ink-mute)',
                  border: '1.5px solid var(--storynest-rule)',
                  fontFamily: BODY,
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Your current plan
              </span>
            ) : null
          }
        />

        {/* Pro */}
        <ProCard
          isPro={isPro}
          isOwner={isOwner}
          interval={interval}
          setInterval={setIntervalState}
          onSubscribe={onSubscribePro}
          onPortal={() => sub.openPortal()}
          busy={busy === 'pro'}
          disabled={busy !== null}
        />
      </section>

      {/* ── Credit packs ─────────────────────────────────────────────────── */}
      <section className="relative z-10">
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Buy credits
        </h2>
        <p
          className="mt-1"
          style={{
            fontFamily: HAND,
            fontSize: 18,
            color: 'var(--storynest-ink-mute)',
          }}
        >
          credits never expire · one-time purchase
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {oneTimeProducts.map((product) => {
            const credits = CREDITS_PER_PACK[product.productId]
            const dollars = (product.amountCents / 100).toFixed(0)
            const perCredit = (product.amountCents / 100 / credits).toFixed(2)
            const variant = PACK_VARIANT_BY_ID[product.productId]
            const v = PACK_VARIANTS[variant]
            const isPopular = product.productId === 'credits_standard'
            return (
              <div
                key={product.productId}
                data-testid={`pack-${product.productId}`}
                className="relative flex flex-col"
                style={{
                  background: v.bg,
                  border: v.border,
                  borderLeft: `4px solid ${v.borderL}`,
                  borderRadius: 22,
                  padding: 24,
                  boxShadow: 'var(--shadow-sticker)',
                  minHeight: 240,
                }}
              >
                {isPopular && (
                  <div
                    className="absolute -top-3 left-5 inline-flex items-center rounded-full px-3 py-1"
                    style={{
                      background: 'var(--storynest-coral)',
                      color: 'oklch(0.99 0.005 240)',
                      fontFamily: BODY,
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      boxShadow: '3px 3px 0 0 var(--storynest-coral-deep)',
                    }}
                  >
                    Most popular
                  </div>
                )}
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 28,
                    fontWeight: 600,
                    color: 'var(--storynest-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {credits} credits
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: HAND,
                    fontSize: 16,
                    color: 'var(--storynest-ink-mute)',
                  }}
                >
                  ${perCredit} per credit
                </div>
                <div
                  className="mt-3"
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 40,
                    fontWeight: 600,
                    color: 'var(--storynest-ink)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  ${dollars}
                </div>

                <div className="mt-auto pt-5">
                  <Button
                    onClick={() => onBuyPack(product.productId)}
                    loading={busy === product.productId}
                    disabled={busy !== null}
                    data-testid={`buy-${product.productId}`}
                    className="w-full"
                    style={{
                      background: v.pillBg,
                      color: 'oklch(0.99 0.005 240)',
                      border: 'none',
                      borderRadius: 9999,
                      paddingTop: 12,
                      paddingBottom: 12,
                      fontFamily: DISPLAY,
                      fontWeight: 600,
                      fontSize: 16,
                      boxShadow: `4px 4px 0 0 ${v.pillDeep}`,
                    }}
                  >
                    Buy {credits}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────
 * Sub-components
 * ────────────────────────────────────────────────────────────────────── */

function PlanCard({
  name,
  accent,
  features,
  footer,
}: {
  name: string
  accent: ReactNode
  features: Array<{ label: string; included: boolean }>
  footer: ReactNode
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--storynest-card)',
        border: '1.5px solid var(--storynest-ink)',
        borderRadius: 24,
        padding: 28,
        boxShadow: 'var(--shadow-sticker)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {name}
        </h2>
        {accent}
      </div>

      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <FeatureLine key={f.label} included={f.included} label={f.label} />
        ))}
      </ul>

      {footer ? <div className="mt-7">{footer}</div> : null}
    </div>
  )
}

function ProCard({
  isPro,
  isOwner,
  interval,
  setInterval,
  onSubscribe,
  onPortal,
  busy,
  disabled,
}: {
  isPro: boolean
  isOwner: boolean
  interval: 'month' | 'year'
  setInterval: (v: 'month' | 'year') => void
  onSubscribe: () => void
  onPortal: () => void
  busy: boolean
  disabled: boolean
}) {
  const price = interval === 'month' ? '12' : '9'

  return (
    <div
      className="relative flex flex-col"
      style={{
        background: 'var(--storynest-lavender-soft)',
        border: '2.5px solid var(--storynest-lavender)',
        borderRadius: 28,
        padding: 32,
        paddingTop: 36,
        boxShadow: '6px 6px 0 0 var(--storynest-lavender-deep)',
        overflow: 'visible',
      }}
    >
      {/* Hootie peeking out, top-right */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: 0,
          right: 8,
          transform: 'translate(8px, -28px)',
          zIndex: 2,
        }}
      >
        <Hootie variant="waving" size={120} />
      </div>

      {/* 7-day trial pill, top-right */}
      <div
        className="absolute"
        style={{
          top: 18,
          left: 28,
          zIndex: 1,
        }}
      >
        <Pill
          bg="var(--storynest-coral)"
          border="var(--storynest-coral-deep)"
          color="oklch(0.99 0.005 240)"
        >
          7-day trial
        </Pill>
      </div>

      <div className="mt-8 flex items-start justify-between gap-3">
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.01em',
          }}
        >
          Pro
        </h2>
      </div>

      {/* Interval toggle */}
      <div
        className="mt-4 inline-flex items-center gap-1 self-start rounded-full p-1"
        style={{
          background: 'var(--storynest-card)',
          border: '1.5px solid var(--storynest-lavender)',
        }}
      >
        <IntervalChip
          active={interval === 'month'}
          onClick={() => setInterval('month')}
          testId="interval-month"
        >
          Monthly
        </IntervalChip>
        <IntervalChip
          active={interval === 'year'}
          onClick={() => setInterval('year')}
          testId="interval-year"
        >
          Yearly
          <span
            className="ml-1"
            style={{
              color: interval === 'year' ? 'oklch(0.99 0.005 240)' : 'var(--storynest-mint-deep)',
              fontWeight: 700,
            }}
          >
            -25%
          </span>
        </IntervalChip>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: 56,
            fontWeight: 600,
            color: 'var(--storynest-ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          ${price}
        </span>
        <span
          style={{
            fontFamily: BODY,
            fontSize: 16,
            color: 'var(--storynest-ink-mute)',
          }}
        >
          / month
        </span>
      </div>
      {interval === 'year' && (
        <div
          className="mt-1"
          style={{
            fontFamily: HAND,
            fontSize: 16,
            color: 'var(--storynest-ink-mute)',
          }}
        >
          billed $108 yearly
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {FEATURES.map((f) => (
          <FeatureLine key={f.label} included={f.pro} label={f.label} />
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {isPro ? (
          <>
            <span
              className="inline-flex items-center rounded-full px-4 py-2"
              style={{
                background: 'var(--storynest-mint)',
                color: 'var(--storynest-ink)',
                fontFamily: BODY,
                fontWeight: 700,
                fontSize: 13,
                border: '1.5px solid var(--storynest-mint-deep)',
              }}
            >
              You&rsquo;re on Pro
            </span>
            <button
              type="button"
              onClick={onPortal}
              className="underline"
              style={{
                fontFamily: BODY,
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--storynest-ink-mute)',
              }}
            >
              Manage billing
            </button>
          </>
        ) : (
          <Button
            onClick={onSubscribe}
            loading={busy}
            disabled={disabled}
            data-testid="subscribe-pro"
            className="w-full sm:w-auto"
            style={{
              background: 'var(--storynest-lavender-deep)',
              color: 'oklch(0.99 0.005 240)',
              border: 'none',
              borderRadius: 9999,
              paddingLeft: 28,
              paddingRight: 28,
              paddingTop: 14,
              paddingBottom: 14,
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 17,
              boxShadow: '4px 4px 0 0 oklch(0.42 0.16 295)',
            }}
          >
            Start 7-day trial
          </Button>
        )}
      </div>
    </div>
  )
}

function IntervalChip({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean
  onClick: () => void
  testId: string
  children: ReactNode
}) {
  const style: CSSProperties = active
    ? {
        background: 'var(--storynest-lavender-deep)',
        color: 'oklch(0.99 0.005 240)',
      }
    : {
        background: 'transparent',
        color: 'var(--storynest-ink)',
      }
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="rounded-full px-4 py-1.5 transition-colors"
      style={{
        ...style,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {children}
    </button>
  )
}

function FeatureLine({ included, label }: { included: boolean; label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          background: included ? 'var(--storynest-mint-soft)' : 'transparent',
          border: included
            ? '1.5px solid var(--storynest-mint-deep)'
            : '1.5px solid var(--storynest-rule)',
        }}
        aria-hidden
      >
        {included ? (
          <Check
            className="h-3 w-3"
            style={{ color: 'var(--storynest-mint-deep)', strokeWidth: 3 }}
          />
        ) : (
          <XIcon
            className="h-3 w-3"
            style={{ color: 'var(--storynest-ink-mute)', strokeWidth: 2.5 }}
          />
        )}
      </span>
      <span
        style={{
          fontFamily: BODY,
          fontSize: 15,
          fontWeight: 500,
          color: included ? 'var(--storynest-ink)' : 'var(--storynest-ink-mute)',
          textDecoration: 'none',
        }}
      >
        {label}
      </span>
    </li>
  )
}

function Pill({
  bg,
  border,
  color,
  children,
}: {
  bg: string
  border: string
  color: string
  children: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1"
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        color,
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}
