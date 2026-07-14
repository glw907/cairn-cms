// cairn-cms: the tidy action's per-isolate key-health cache (save-500-honest-errors, Task 5).
// A Cloudflare Worker isolate serves one site, so one module-level slot is enough: a tidy call
// that fails with an auth reason (401/403 from Anthropic) marks the key unhealthy for a TTL
// window, and either a subsequent successful call or a passing settings-screen probe clears it.
// editLoad's tidy projection reads this cache only (never an inline probe, so an edit load pays
// no added latency), so a dead key hides the Tidy button entirely (truthful visibility) rather
// than leaving it live to fail again on the next click.
//
// A second, separate slot (save-500-hardening) holds the settings screen's last active-probe
// verdict: `settingsLoad` reaches Anthropic only when this record is absent or stale, so a run of
// settings navigations within the TTL costs no repeated live round trip.

/**
 * How long a marked-unhealthy key stays hidden before the next edit load tries showing the
 *  button again: 10 minutes. Long enough that a revoked key does not flap the button visible
 *  and invisible across a single editing session, short enough that a fixed key recovers without
 *  a deploy. The settings-load probe cache below reuses the same window for the same reason.
 */
const TTL_MS = 10 * 60 * 1000;

/** The mark's expiry time in epoch milliseconds, or null when the key is not known unhealthy. */
let unhealthyUntil: number | null = null;

/** The settings screen's three reportable key states, distinct from bare presence. */
export type TidyKeyProbeResult = 'valid' | 'invalid' | 'unknown';

/** The last active-probe verdict `settingsLoad` recorded, or null before any probe has run. */
let lastProbe: { status: TidyKeyProbeResult; at: number } | null = null;

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

/**
 * Record the settings screen's active-probe verdict from `now` (defaults to `Date.now()`), so a
 *  repeated settings load within the TTL window reuses it instead of spending another live round
 *  trip. Every verdict is cached, including `'unknown'`, since a timed-out or unverifiable probe
 *  is exactly as expensive to repeat as a successful one.
 */
export function recordProbeResult(status: TidyKeyProbeResult, now: number = Date.now()): void {
  lastProbe = { status, at: now };
}

/**
 * The cached probe verdict at `now` (defaults to `Date.now()`), or null when no probe has run yet
 *  or the cached one has aged past the TTL. `settingsLoad` reads this first and only falls back to
 *  a live `probeTidyKey` call on a null result.
 */
export function cachedProbeResult(now: number = Date.now()): TidyKeyProbeResult | null {
  return lastProbe !== null && now - lastProbe.at < TTL_MS ? lastProbe.status : null;
}

/** Test-only reset of the module-level cache, so one test's mark cannot leak into the next. */
export function resetKeyHealthForTest(): void {
  unhealthyUntil = null;
  lastProbe = null;
}
