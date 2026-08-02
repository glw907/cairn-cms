// cairn-cms: the Workers RateLimit binding wrapper two sites already copy by hand, generalized
// only in its typing. Both functions carry the same degrade-to-open convention as
// verifyTurnstile: an absent binding (local dev, vitest, a not-yet-provisioned deploy) never
// blocks a request.

/**
 * The structural slice of a Workers `RateLimit` binding either function below calls; any
 * conforming limiter serves. Declared here so the engine has one structural limiter type;
 * `../sveltekit/section-action.js` imports and re-exports this same declaration.
 */
export interface RateLimitLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Check one rate-limit key against a Workers `RateLimit` binding.
 *
 * The Workers limiter is per-location and eventually consistent, so this is best-effort back
 * pressure, never an authoritative security control; the engine's own D1-backed send cooldown is
 * the pattern for anything that must hold. An absent `binding` degrades to open and returns true
 * without a call, the same convention as {@link verifyTurnstile}. A throwing `limit()` propagates
 * to the caller rather than being swallowed here: degrade-to-open on a throw is a policy each
 * caller decides for itself (`createSectionAction`'s wrapper makes that call for its own branch).
 */
export async function checkRateLimit(
  binding: RateLimitLike | undefined,
  key: string,
): Promise<boolean> {
  if (!binding) return true;
  const result = await binding.limit({ key });
  return result.success;
}

/**
 * Check several rate-limit keys against a Workers `RateLimit` binding, in order.
 *
 * Short-circuits at the first failing key, so a later key's counter is never incremented; an
 * absent `binding` degrades to open and returns true without a call, even with several keys.
 */
export async function checkRateLimitKeys(
  binding: RateLimitLike | undefined,
  keys: string[],
): Promise<boolean> {
  if (!binding) return true;
  for (const key of keys) {
    const success = await checkRateLimit(binding, key);
    if (!success) return false;
  }
  return true;
}
