import type { CollectionSchema } from 'deepspace/worker'

/**
 * `visibility` controls who can read this book:
 *   - 'public'  → any signed-in member (drives the public library)
 *   - 'private' → owner only
 *
 * `visibilityField` + `read: 'published'` is the SDK pattern for owner-OR-public
 * row-level reads. Owner always passes (per `'published'` rule semantics).
 */
export const storybookSchema: CollectionSchema = {
  name: 'storybooks',
  visibilityField: { field: 'visibility', value: 'public' },
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'prompt', storage: 'text', interpretation: 'plain' },
    { name: 'characters', storage: 'text', interpretation: 'plain' },
    { name: 'lesson', storage: 'text', interpretation: 'plain' },
    { name: 'ageBand', storage: 'text', interpretation: 'plain' },
    { name: 'pageCount', storage: 'number', interpretation: 'plain' },
    { name: 'artStyle', storage: 'text', interpretation: 'plain' },
    { name: 'coverImageKey', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'failureReason', storage: 'text', interpretation: 'plain' },
    { name: 'progress', storage: 'number', interpretation: 'plain' },
    { name: 'visibility', storage: 'text', interpretation: 'plain' },
    { name: 'characterSheet', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: 'published', create: false, update: 'own', delete: 'own' },
    member: { read: 'published', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
