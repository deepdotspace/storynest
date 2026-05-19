/**
 * Tiny fetch wrapper for server actions exposed at /api/actions/:name.
 * Returns the SDK's ActionResult discriminated-union shape — narrow with
 * `if (result.success)` to access `result.data`.
 */

import { getAuthToken } from 'deepspace'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

const DEFAULT_TIMEOUT_MS = 90_000

export async function callAction<T>(
  name: string,
  body: unknown,
  options?: { timeoutMs?: number },
): Promise<ActionResult<T>> {
  let token: string | null = null
  try {
    token = await getAuthToken()
  } catch {
    token = null
  }

  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if (controller.signal.aborted) {
      return { success: false, error: `Action ${name} timed out after ${Math.round(timeoutMs / 1000)}s` }
    }
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let bodyText = ''
    try { bodyText = await res.text() } catch { /* ignore */ }
    return { success: false, error: `HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}` }
  }

  try {
    return (await res.json()) as ActionResult<T>
  } catch (err) {
    return { success: false, error: `Bad JSON: ${err instanceof Error ? err.message : String(err)}` }
  }
}
