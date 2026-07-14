// cairn-cms: the tidy action's per-isolate key-health cache (save-500-honest-errors, Task 5).
// A Cloudflare Worker isolate serves one site, so one module-level slot is enough: a tidy call
// that fails with an auth reason (401/403 from Anthropic) marks the key unhealthy for a TTL
// window, and either a subsequent successful call or a passing settings-screen probe clears it.
// editLoad's tidy projection reads this cache only (never an inline probe, so an edit load pays
// no added latency), so a dead key hides the Tidy button entirely (truthful visibility) rather
// than leaving it live to fail again on the next click.

/**
 * How long a marked-unhealthy key stays hidden before the next edit load tries showing the
 *  button again: 10 minutes. Long enough that a revoked key does not flap the button visible
 *  and invisible across a single editing session, short enough that a fixed key recovers without
 *  a deploy.
 */
const TTL_MS = 10 * 60 * 1000;

/** The mark's expiry time in epoch milliseconds, or null when the key is not known unhealthy. */
let unhealthyUntil: number | null = null;

/** Mark the tidy API key unhealthy from `now` (defaults to `Date.now()`) for the TTL window. */
export function markKeyUnhealthy(now: number = Date.now()): void {
  unhealthyUntil = now + TTL_MS;
}

/** Clear an unhealthy mark: a successful model call or a passing settings-screen probe. */
export function markKeyHealthy(): void {
  unhealthyUntil = null;
}

/**
 * Whether the key is known unhealthy at `now` (defaults to `Date.now()`). The mark expires on
 *  its own once `now` passes the TTL window, so a stale mark clears itself with no explicit
 *  recovery call needed.
 */
export function keyKnownUnhealthy(now: number = Date.now()): boolean {
  return unhealthyUntil !== null && now < unhealthyUntil;
}

/** Test-only reset of the module-level cache, so one test's mark cannot leak into the next. */
export function resetKeyHealthForTest(): void {
  unhealthyUntil = null;
}
