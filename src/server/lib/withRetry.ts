/**
 * withRetry — exponential backoff with jitter for transient AI/upload calls.
 *
 * Defaults: 3 attempts, 1.5s base delay, 15s cap, 3x growth, ±25% jitter.
 * Worst-case wait between first and last attempt ≈ 1.5s + 4.5s ≈ 6s,
 * jittered ±25%.
 *
 * `shouldRetry(err)` decides whether a thrown error is worth retrying.
 * Default policy: retry all errors except those whose message includes
 * `forbidden`, `unauthorized`, `quota`, `insufficient_credits`,
 * `invalid_request` — i.e. permanent client errors we'd just retry into.
 */

export interface RetryOpts {
  attempts?: number
  baseMs?: number
  capMs?: number
  growth?: number
  jitter?: number
  shouldRetry?: (err: unknown) => boolean
  onAttemptFailed?: (err: unknown, attempt: number, nextDelayMs: number | null) => void
}

const PERMANENT_PATTERNS = [
  /\bforbidden\b/i,
  /\bunauthorized\b/i,
  /\bquota\b/i,
  /\binsufficient(_| )credits?\b/i,
  /\binvalid(_| )request\b/i,
  /\bbad request\b/i,
]

function defaultShouldRetry(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return !PERMANENT_PATTERNS.some((re) => re.test(msg))
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3
  const baseMs = opts.baseMs ?? 1500
  const capMs = opts.capMs ?? 15000
  const growth = opts.growth ?? 3
  const jitter = opts.jitter ?? 0.25
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry

  let lastErr: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      const hasMore = attempt < attempts
      if (!hasMore || !shouldRetry(err)) {
        opts.onAttemptFailed?.(err, attempt, null)
        throw err
      }
      const raw = Math.min(capMs, baseMs * Math.pow(growth, attempt - 1))
      const jitterFactor = 1 + (Math.random() * 2 - 1) * jitter
      const delay = Math.max(0, Math.round(raw * jitterFactor))
      opts.onAttemptFailed?.(err, attempt, delay)
      await sleep(delay)
    }
  }
  throw lastErr
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
