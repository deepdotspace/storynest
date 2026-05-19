import type { CollectionSchema } from 'deepspace/worker'

/**
 * One row per user. Only server actions mutate (they go through
 * `tools.update` which bypasses RBAC). Users read their own row.
 *
 * `claimedPurchases` is a JSON column holding an array of Stripe
 * purchase row ids that have already been credited — prevents
 * double-granting when the user clicks "refresh credits" repeatedly.
 */
export const creditAccountSchema: CollectionSchema = {
  name: 'credit_accounts',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain' },
    { name: 'balance', storage: 'number', interpretation: 'plain' },
    { name: 'lifetimeGranted', storage: 'number', interpretation: 'plain' },
    { name: 'lifetimeSpent', storage: 'number', interpretation: 'plain' },
    { name: 'lastMonthlyGrantAt', storage: 'number', interpretation: 'plain' },
    { name: 'claimedPurchases', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'gotSignupBonus', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
