/**
 * Resolves an R2 storage key to a directly-loadable URL for `<img>` / `<audio>`.
 *
 * Book assets are stored under the app prefix (`apps/<app>/…`) and served via
 * the platform's app-scope read, which is public — no auth header, no proxy,
 * no per-user identity. The returned URL works as a plain `src` for every
 * viewer, owner or not. This is the SDK's documented mechanism for assets
 * meant to be embedded in pages.
 *
 * Thin wrapper over `useR2Files({ scope: 'app' }).getUrl`. The wrapper adds one
 * thing the raw hook method doesn't: it returns `null` for a missing key, so
 * call sites can branch on absence (render a placeholder) instead of pointing
 * an element at a keyless URL.
 */

import { useR2Files } from 'deepspace'

// Module-level constant so the options object is referentially stable across
// renders and every consumer shares one app-scope file client.
const APP_SCOPE = { scope: 'app' } as const

/**
 * Returns a public, directly-loadable URL for an R2 key, or `null` when there
 * is no key. Keys are stored with their full `apps/<app>/…` prefix.
 */
export function useAssetUrl(key: string | null | undefined): string | null {
  const { getUrl } = useR2Files(APP_SCOPE)
  return key ? getUrl(key) : null
}
