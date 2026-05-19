/**
 * Subscription plan manifest. Synced to Stripe on `deepspace deploy`.
 *
 * Pricing rationale (worst-case raw API cost ~$0.05/page if Gemini moves
 * off free tier; 60 credits/mo at $12 = 75% gross margin at full
 * utilization; competitive with Storywizard/Bookjockey at $10-15/mo).
 *
 * Slugs are stable — DO NOT rename. Change `name` for branding.
 */

export const subscriptionPlans = [
  { slug: 'free', name: 'Free', priceCents: 0 },
  {
    slug: 'pro',
    name: 'Pro',
    priceCents: 1200,
    yearlyCents: 10800,
    trialDays: 7,
  },
] as const

export type SubscriptionSlug = (typeof subscriptionPlans)[number]['slug']

/** How many credits the user's Pro plan grants per calendar month. */
export const PRO_MONTHLY_CREDITS = 60

/** Days between automatic monthly grants (a touch under 30 to avoid skipping a month). */
export const PRO_MONTHLY_GRANT_INTERVAL_DAYS = 28

/** Number of credits granted to a brand-new account on first login. */
export const SIGNUP_BONUS_CREDITS = 10
