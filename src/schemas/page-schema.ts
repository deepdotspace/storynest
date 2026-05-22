import type { CollectionSchema } from 'deepspace/worker'

/**
 * Pages mirror their parent book's `visibility` so the platform-worker
 * RBAC layer can permit "read someone else's public book" — without
 * this column the DO would reject `read` on pages owned by other users.
 *
 * Keeping the value in sync with the book is the responsibility of the
 * `setBookVisibility` server action.
 */
export const pageSchema: CollectionSchema = {
  name: 'pages',
  visibilityField: { field: 'visibility', value: 'public' },
  columns: [
    { name: 'bookId', storage: 'text', interpretation: 'plain' },
    { name: 'pageNumber', storage: 'number', interpretation: 'plain' },
    { name: 'text', storage: 'text', interpretation: 'plain' },
    { name: 'imagePrompt', storage: 'text', interpretation: 'plain' },
    { name: 'imageKey', storage: 'text', interpretation: 'plain' },
    { name: 'audioKey', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'failureReason', storage: 'text', interpretation: 'plain' },
    { name: 'visibility', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'published', create: false, update: 'own', delete: 'own' },
    member: { read: 'published', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
