/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { storybookSchema } from './schemas/storybook-schema'
import { pageSchema } from './schemas/page-schema'
import { creditAccountSchema } from './schemas/credit-account-schema'
import { helpMessageSchema } from './schemas/help-message-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  storybookSchema,
  pageSchema,
  creditAccountSchema,
  helpMessageSchema,
]
