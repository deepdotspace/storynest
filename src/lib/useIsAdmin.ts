/**
 * useIsAdmin — strict tri-state hook that prevents any admin-only chrome
 * from flashing to non-admins.
 *
 * Returns { isAdmin, ready }:
 *   - ready: false  → don't render anything admin-related yet
 *   - ready: true && isAdmin: true → render admin UI
 *   - ready: true && isAdmin: false → not admin; render the non-admin path
 *
 * "Ready" means we know the answer for sure: auth has resolved, the user
 * record has loaded (or we know there is no user), and the public app
 * config (which contains ownerUserId) is in.
 */

import { useAuth, useUser } from 'deepspace'
import { usePublicAppConfig } from './publicConfig'

export function useIsAdmin(): { isAdmin: boolean; ready: boolean } {
  const { isLoaded, isSignedIn } = useAuth()
  const { user, isLoading: userLoading } = useUser()
  const { config, loading: configLoading } = usePublicAppConfig()

  if (!isLoaded || configLoading) {
    return { isAdmin: false, ready: false }
  }
  if (!isSignedIn) {
    return { isAdmin: false, ready: true }
  }
  if (userLoading || !user) {
    return { isAdmin: false, ready: false }
  }
  const ownerId = config?.ownerUserId ?? null
  const isAdmin = !!ownerId && user.id === ownerId
  return { isAdmin, ready: true }
}
