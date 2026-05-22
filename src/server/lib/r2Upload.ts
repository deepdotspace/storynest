/**
 * Server-side R2 upload — mirrors what the SDK's browser `useR2Files`
 * hook does (`POST /api/files/upload?scope=self` with JSON body) but
 * dispatched directly to the platform-worker so jobs running in the
 * JobRoom DO can write files without going through the browser.
 *
 * Why the explicit `?key=` query param: by default the SDK appends a
 * `<timestamp>-<random>-` suffix to make duplicate-name uploads
 * non-clobbering. We want the opposite — stable, predictable keys per
 * (bookId, pageNumber) so re-rolls upsert at the same location and the
 * page record's `imageKey`/`audioKey` field doesn't have to be rewritten
 * after every regeneration.
 *
 * Returns `{ key }` where `key` is the full storage key returned by the
 * server (already prefixed with `apps/<APP_NAME>/users/<userId>/`).
 * Callers MUST store this returned key — the input `logicalName` is
 * just an input, not the storage path.
 */

import { platformWorkerFetch } from 'deepspace/worker'

interface MinimalEnv {
  APP_NAME: string
  APP_IDENTITY_TOKEN: string
  PLATFORM_WORKER?: Fetcher
  PLATFORM_WORKER_URL?: string
}

interface UploadResponse {
  success?: boolean
  key?: string
  url?: string
  error?: string
}

export async function uploadBase64AsUser<E extends MinimalEnv>(
  env: E,
  userId: string,
  logicalName: string,
  base64: string,
  contentType: string,
): Promise<{ key: string; url: string | null }> {
  // `?key=<logicalName>` requests a deterministic storage path
  // (`<scope-prefix>/<logicalName>`) instead of the timestamped default.
  const qs = new URLSearchParams({ scope: 'self', key: logicalName })
  const platformUrl = `https://internal/internal/files/upload?${qs.toString()}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-app-identity-token': env.APP_IDENTITY_TOKEN,
    'x-app-name': env.APP_NAME,
    'x-user-id': userId,
  }

  const stripped = base64.startsWith('data:')
    ? base64.split(',', 2)[1] ?? ''
    : base64

  const resp = await platformWorkerFetch(
    env,
    new Request(platformUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: stripped,
        name: logicalName,
        mimeType: contentType,
      }),
    }),
  )

  if (!resp.ok) {
    let detail = ''
    try { detail = (await resp.text()).slice(0, 200) } catch { /* ignore */ }
    throw new Error(`r2_upload_failed: HTTP ${resp.status} ${detail}`)
  }

  const body = (await resp.json()) as UploadResponse
  if (!body.success || !body.key) {
    throw new Error(`r2_upload_failed: ${body.error ?? 'no key in response'}`)
  }
  return { key: body.key, url: body.url ?? null }
}
