/**
 * runBounded — concurrency-limited fan-out.
 *
 * Takes a list of jobs and runs at most `limit` of them concurrently.
 * Always returns one settled result per job (in input order). Never
 * throws; individual rejections come back as { ok: false, error }.
 *
 * Used by the storybook job to parallelize cover + per-page image +
 * per-page audio generation without slamming provider rate limits.
 */

export type Settled<T> = { ok: true; value: T } | { ok: false; error: Error }

export async function runBounded<T>(
  jobs: Array<() => Promise<T>>,
  limit: number,
): Promise<Settled<T>[]> {
  const results: Settled<T>[] = new Array(jobs.length)
  let next = 0

  async function worker() {
    while (true) {
      const i = next++
      if (i >= jobs.length) return
      try {
        const value = await jobs[i]()
        results[i] = { ok: true, value }
      } catch (err) {
        results[i] = {
          ok: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, jobs.length) }, () => worker())
  await Promise.all(workers)
  return results
}
