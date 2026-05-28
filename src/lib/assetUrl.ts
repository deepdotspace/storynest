/**
 * Resolves an R2 key (stored on storybook/page records) to a URL the browser
 * can load directly.
 *
 * Book assets live under the app prefix (`apps/<app>/…`) and are served via
 * the platform's app-scope read — `/api/files/<key>?scope=app` — which is
 * public (no auth header, no proxy, no per-user identity). The returned URL
 * works as a plain `<img src>` / `<audio src>` for every viewer, owner or
 * not. This is the SDK's documented mechanism for "assets meant to be
 * embedded in pages."
 *
 * Why we build the URL by hand instead of `useR2Files({ scope: 'app' }).getUrl`:
 * the published SDK (v0.4.0) hard-codes `scope=self` inside `useR2Files` and
 * its type only permits `'self'` — app-scope support landed after the 0.4.0
 * cut. Our `/api/files/*` worker proxy already forwards the `?scope=` param
 * verbatim, so constructing `?scope=app` here hits the public read path
 * directly. Revisit once a release exposes `scope` on the hook.
 *
 * (Previously these reads went through an authenticated `/api/book-files`
 * proxy + blob URLs because the assets were treated as `scope='self'`; that
 * was the wrong scope for shared/public content and broke cross-user reads.)
 */

/**
 * Returns a directly-loadable, public URL for an R2 key, or `null` when there
 * is no key. Keys are stored with their full `apps/<app>/…` prefix, so they
 * sit inside the app scope and read publicly.
 *
 * Not a hook (it calls none) — named `useAssetUrl` for call-site readability.
 */
export function useAssetUrl(key: string | null | undefined): string | null {
  if (!key) return null
  return `/api/files/${key}?scope=app`
}
