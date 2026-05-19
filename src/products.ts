/**
 * One-time products. Synced to Stripe on `deepspace deploy`.
 *
 * These are credit packs the user can buy without subscribing. The
 * `productId` is the entitlement key — both the manifest and the
 * `claimPackCredits` server action key off it.
 */

export const oneTimeProducts = [
  {
    productId: 'credits_starter',
    name: 'Starter — 30 credits',
    amountCents: 500,
    description: '30 storybook page credits. Enough for ~4 books.',
  },
  {
    productId: 'credits_standard',
    name: 'Standard — 75 credits',
    amountCents: 1000,
    description: '75 page credits. Roughly 9 books. Most popular.',
  },
  {
    productId: 'credits_bulk',
    name: 'Bulk — 200 credits',
    amountCents: 2000,
    description: '200 page credits. ~25 books. Best per-credit value.',
  },
] as const

export type CreditPackId = (typeof oneTimeProducts)[number]['productId']

/** How many credits each pack grants. Keyed by productId. */
export const CREDITS_PER_PACK: Record<CreditPackId, number> = {
  credits_starter: 30,
  credits_standard: 75,
  credits_bulk: 200,
}
