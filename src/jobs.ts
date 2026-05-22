/**
 * Background job dispatcher — wired into AppJobRoom (worker.ts).
 *
 * Job types:
 *   - 'generate-storybook': full pipeline (outline → images/audios →
 *     finalize). Enqueued by the `enqueueStorybookGeneration` action.
 *   - 'retry-failed-pages': re-run failed pages on an existing book.
 *     Enqueued by the `enqueueRetryFailedPages` action.
 *
 * Add new types by extending the switch below + the corresponding
 * payload type in src/server/jobs/*.ts.
 */

import type { Job, JobContext } from 'deepspace/worker'
import type { Env } from '../worker'
import {
  runStorybookJob,
  type StorybookJobPayload,
} from './server/jobs/storybookJob'
import {
  runRetryFailedPagesJob,
  type RetryFailedPagesPayload,
} from './server/jobs/retryFailedPagesJob'

export async function runJob(job: Job, _ctx: JobContext, env: Env): Promise<unknown> {
  switch (job.type) {
    case 'generate-storybook':
      return await runStorybookJob(job.payload as StorybookJobPayload, env)
    case 'retry-failed-pages':
      return await runRetryFailedPagesJob(job.payload as RetryFailedPagesPayload, env)
    default:
      throw new Error(`unknown_job_type: ${job.type}`)
  }
}
