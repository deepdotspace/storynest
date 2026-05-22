/**
 * Resolves R2 keys (stored on storybook/page records) to URLs the browser
 * can actually load.
 *
 * Why this is fiddly: the SDK's `getUrl()` returns a public URL that only
 * works for unauthenticated reads. Our files are owner-scoped (`?scope=self`
 * upstream), so the platform-worker rejects anonymous `<img src>` /
 * `<audio src>` GETs with 401 — the browser doesn't send the Bearer token
 * those resources need. The fix is to fetch the file ourselves with
 * `readFile()` (authenticated) and hand the page a `blob:` URL.
 *
 * Use `useAssetBlobUrl(key)` for every owner-scoped asset. The hook
 * handles loading state, errors, and cleanup of the blob URL on key
 * change or unmount.
 */

import { useEffect, useRef, useState } from 'react'
import { useR2Files, getAuthToken } from 'deepspace'

export interface AssetBlobUrlState {
  url: string | null
  isLoading: boolean
  error: string | null
}

export interface AssetBlobUrlOptions {
  /**
   * When set, route the read through `/api/book-files/<key>?bookId=<id>`
   * instead of the SDK's `readFile`. Required for any cross-user read
   * (e.g. viewing someone else's public book from /explore) because
   * the SDK's `readFile` always uses scope=self and 403s on another
   * user's prefix. Server-side this endpoint validates the book is
   * public AND the key is one of its known assets.
   */
  publicBookId?: string
}

/**
 * Fetches the file and exposes a `blob:` URL. Re-runs when `key` (or
 * `publicBookId`) changes. Revokes the blob URL on cleanup so we don't
 * leak.
 */
export function useAssetBlobUrl(
  key: string | null | undefined,
  options?: AssetBlobUrlOptions,
): AssetBlobUrlState {
  const { readFile } = useR2Files()
  const readFileRef = useRef(readFile)
  readFileRef.current = readFile

  const publicBookId = options?.publicBookId ?? null

  const [state, setState] = useState<AssetBlobUrlState>({
    url: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    if (!key) {
      setState({ url: null, isLoading: false, error: null })
      return
    }
    let canceled = false
    let createdUrl: string | null = null
    setState((s) => ({ ...s, isLoading: true, error: null }))
    ;(async () => {
      try {
        let resp: Response
        if (publicBookId) {
          const params = new URLSearchParams({ bookId: publicBookId })
          let token: string | null = null
          try { token = await getAuthToken() } catch { token = null }
          resp = await fetch(
            `/api/book-files/${key}?${params.toString()}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} },
          )
        } else {
          resp = await readFileRef.current(key)
        }
        if (canceled) return
        if (!resp.ok) {
          setState({ url: null, isLoading: false, error: `HTTP ${resp.status}` })
          return
        }
        const blob = await resp.blob()
        if (canceled) return
        const objUrl = URL.createObjectURL(blob)
        createdUrl = objUrl
        setState({ url: objUrl, isLoading: false, error: null })
      } catch (err) {
        if (canceled) return
        setState({
          url: null,
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
    return () => {
      canceled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [key, publicBookId])

  return state
}

/**
 * Legacy hook kept for callers that may want the unauthenticated URL
 * (e.g. for share links to public files). For displaying owner-scoped
 * files, ALWAYS prefer `useAssetBlobUrl` — `getUrl` will 401 the
 * browser's anonymous GET.
 */
export function useAssetUrl(): (key: string | null | undefined) => string | null {
  const { getUrl } = useR2Files()
  return (key) => {
    if (!key) return null
    return getUrl(key) ?? null
  }
}

export function buildAssetUrl(_key: string | null | undefined): string | null {
  return null
}
