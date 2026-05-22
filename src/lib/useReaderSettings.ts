/**
 * Reader user-preferences — persisted across sessions in localStorage.
 *
 * Two settings:
 *   - `captionsEnabled`: switch from the default floating text bubble to
 *     the left-side caption strip
 *   - `captionsCollapsed`: when captions are on, collapse the strip to a
 *     thin handle so the reader is effectively audio-only
 *
 * Keys are versioned so we can change shape without stale-data bugs.
 * SSR-safe: localStorage access is guarded for `typeof window`.
 */

import { useEffect, useState, useCallback } from 'react'

const KEY_ENABLED = 'storynest:reader:captions:v1'
const KEY_COLLAPSED = 'storynest:reader:captionsCollapsed:v1'

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false')
  } catch {
    /* private mode / quota exceeded — silently ignore */
  }
}

export interface ReaderSettings {
  captionsEnabled: boolean
  captionsCollapsed: boolean
}

export interface ReaderSettingsApi extends ReaderSettings {
  toggleCaptions: () => void
  toggleCollapsed: () => void
  setCaptionsEnabled: (v: boolean) => void
  setCaptionsCollapsed: (v: boolean) => void
}

export function useReaderSettings(): ReaderSettingsApi {
  // Initial state read on mount — avoids hydration mismatch by starting
  // with the fallback and updating in an effect.
  const [captionsEnabled, setEnabled] = useState(false)
  const [captionsCollapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setEnabled(readBool(KEY_ENABLED, false))
    setCollapsed(readBool(KEY_COLLAPSED, false))
  }, [])

  const setCaptionsEnabled = useCallback((v: boolean) => {
    setEnabled(v)
    writeBool(KEY_ENABLED, v)
  }, [])
  const setCaptionsCollapsed = useCallback((v: boolean) => {
    setCollapsed(v)
    writeBool(KEY_COLLAPSED, v)
  }, [])
  const toggleCaptions = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      writeBool(KEY_ENABLED, next)
      return next
    })
  }, [])
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      writeBool(KEY_COLLAPSED, next)
      return next
    })
  }, [])

  return {
    captionsEnabled,
    captionsCollapsed,
    toggleCaptions,
    toggleCollapsed,
    setCaptionsEnabled,
    setCaptionsCollapsed,
  }
}
