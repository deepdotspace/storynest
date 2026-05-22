/**
 * createActionTools — shared factory for the ActionTools surface.
 *
 * Used by:
 *   - the worker's /api/actions/:name handler (one tools per request)
 *   - the JobRoom job dispatcher (one tools per job, billed as the user
 *     who enqueued the job)
 *
 * For user-billed integrations the caller's JWT is required. Jobs don't
 * have a live caller JWT — they pass `callerJwt = env.APP_OWNER_JWT`
 * because background storybook generation is developer-billed (the user
 * pays in credits; the developer pays the upstream AI providers).
 */

import { apiWorkerFetch } from 'deepspace/worker'
import type { ActionTools, ActionResult } from 'deepspace/worker'
import { integrations } from '../../integrations'

interface MinimalEnv {
  RECORD_ROOMS: DurableObjectNamespace
  APP_NAME: string
  APP_OWNER_JWT: string
  API_WORKER?: Fetcher
  API_WORKER_URL?: string
}

export function createActionTools<E extends MinimalEnv>(
  env: E,
  userId: string,
  callerJwt: string,
): ActionTools {
  const stub = env.RECORD_ROOMS.get(env.RECORD_ROOMS.idFromName(`app:${env.APP_NAME}`))

  async function execTool<TData>(
    tool: string,
    params: Record<string, unknown>,
  ): Promise<ActionResult<TData>> {
    const res = await stub.fetch(new Request('https://internal/api/tools/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-App-Action': 'true',
      },
      body: JSON.stringify({ tool, params }),
    }))
    return res.json() as Promise<ActionResult<TData>>
  }

  async function callIntegration<T = unknown>(
    endpoint: string,
    data?: unknown,
  ): Promise<ActionResult<T>> {
    const integrationName = endpoint.split('/')[0]
    const billingMode = integrations[integrationName]?.billing ?? 'developer'
    const jwt = billingMode === 'developer' ? env.APP_OWNER_JWT : callerJwt

    const res = await apiWorkerFetch(env, `/api/integrations/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(data ?? {}),
    })
    return res.json() as Promise<ActionResult<T>>
  }

  return {
    create: (collection, data) => execTool('records.create', { collection, data }),
    update: (collection, recordId, data) =>
      execTool('records.update', { collection, recordId, data }),
    remove: (collection, recordId) => execTool('records.delete', { collection, recordId }),
    get: (collection, recordId) => execTool('records.get', { collection, recordId }),
    query: (collection, options) => execTool('records.query', { collection, ...options }),
    integration: callIntegration,
    registerUser: (opts) =>
      execTool('users.register', { userId: opts.userId ?? userId, ...opts }),
  }
}
