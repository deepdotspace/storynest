/**
 * Multi-user collaboration spec — verifies two users sign in into
 * separate browser contexts and the app distinguishes them.
 *
 * Pre-create the test accounts once (counted against your 10-cap):
 *   npx deepspace test-accounts create --email collab-a@deepspace.test --password TestPass123! --name "Collab A"
 *   npx deepspace test-accounts create --email collab-b@deepspace.test --password TestPass123! --name "Collab B"
 *
 * The `users` fixture handles sign-in caching (per-account storageState
 * persisted to `~/.deepspace/playwright-states/`), context creation, and
 * cleanup. No need to manage browser contexts manually.
 */
import { test, expect } from 'deepspace/testing'

test('two users render with their own names', async ({ users }) => {
  const [a, b] = await users(['Collab A', 'Collab B'])

  await Promise.all([a.page.goto('/'), b.page.goto('/')])

  await expect(a.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })
  await expect(b.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

  await expect(a.page.getByTestId('nav-user-name')).toContainText('Collab A')
  await expect(b.page.getByTestId('nav-user-name')).toContainText('Collab B')
})
