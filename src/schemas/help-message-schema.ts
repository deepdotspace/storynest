import type { CollectionSchema } from 'deepspace/worker'

export const helpMessageSchema: CollectionSchema = {
  name: 'help_messages',
  columns: [
    { name: 'userId', storage: 'text', interpretation: 'plain' },
    { name: 'userEmail', storage: 'text', interpretation: 'plain' },
    { name: 'userName', storage: 'text', interpretation: 'plain' },
    { name: 'message', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'createdAt', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: true, update: false, delete: false },
    member: { read: false, create: true, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
