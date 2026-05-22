/**
 * Tiny client-side cache for the public app-config endpoint. Returns
 * { ownerUserId, appName } so the UI can determine whether the current
 * signed-in user is the admin without ever flashing admin chrome to
 * non-admins.
 *
 * The cache is in-module (one fetch per page load) — that's enough to
 * avoid duplicate requests across the admin link in nav + the /admin
 * page guard.
 */

import { useEffect, useState } from 'react'

export interface PublicAppConfig {
  ownerUserId: string | null
  appName: string
}

interface ConfigEnvelope {
  success: boolean
  data?: PublicAppConfig
  error?: string
}

let cached: PublicAppConfig | null = null
let inflight: Promise<PublicAppConfig | null> | null = null

async function fetchConfig(): Promise<PublicAppConfig | null> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/public/app-config')
      if (!res.ok) return null
      const body = (await res.json()) as ConfigEnvelope
      if (body.success && body.data) {
        cached = body.data
        return body.data
      }
      return null
    } catch {
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Returns { config, loading }. `loading` is true on first mount until
 * the network call settles. Subsequent mounts return the cached value
 * synchronously (loading: false).
 */
export function usePublicAppConfig(): {
  config: PublicAppConfig | null
  loading: boolean
} {
  const [config, setConfig] = useState<PublicAppConfig | null>(cached)
  const [loading, setLoading] = useState<boolean>(cached === null)

  useEffect(() => {
    let canceled = false
    if (cached) {
      setConfig(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchConfig().then((c) => {
      if (canceled) return
      setConfig(c)
      setLoading(false)
    })
    return () => {
      canceled = true
    }
  }, [])

  return { config, loading }
}
