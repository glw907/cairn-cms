// cairn-cms: the Workers RateLimit binding wrapper two sites already copy by hand, generalized
// only in its typing. An absent binding (local dev, vitest, a not-yet-provisioned deploy) never
// blocks a request. That is degrade-to-open, which is the opposite of `verifyTurnstile`'s own
// contract (fail-closed on any ambiguity); the two modules read the same word differently on
// purpose, since a missing rate limiter is a missing convenience, while a missing Turnstile
// secret is the caller's own policy decision.

/**
 * The structural slice of a Workers `RateLimit` binding {@link resolveRateLimit} calls; any
 * conforming limiter serves. Declared here so the engine has one structural limiter type;
 * `../sveltekit/section-action.js` imports and re-exports this same declaration.
 */
export interface RateLimitLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * What {@link resolveRateLimit} returns: the binding is absent (`no-binding`), every key cleared
 * (`allowed`), one key is over budget (`limited`, naming which key), or the limiter call itself
 * threw (`failed`, carrying the thrown value). Degrade-to-open on `no-binding` or `failed` stays
 * the caller's own decision; this type only names what happened.
 */
export type RateLimitOutcome =
  | { outcome: 'allowed' }
  | { outcome: 'limited'; key: string }
  | { outcome: 'no-binding' }
  | { outcome: 'failed'; error: unknown };

/**
 * Resolve one or several rate-limit keys against a Workers `RateLimit` binding, in order.
 *
 * The Workers limiter is per-location and eventually consistent, so this is best-effort back
 * pressure, never an authoritative security control; the engine's own D1-backed send cooldown is
 * the pattern for anything that must hold. An absent `binding` returns `no-binding` without a
 * call: a missing rate limiter is a missing convenience, not a security gap, which is the
 * opposite of `verifyTurnstile`'s own contract (that function fails closed on any ambiguity; this
 * one only degrades open on the caller's own reading of `no-binding`/`failed`). Several keys are
 * checked in order with a short-circuit at the first that is over budget, so a later key's
 * counter is never incremented; order the keys broadest first, so the budget that most needs to
 * hold sits at index 0. A throwing `limit()` is captured into the `failed` arm rather than
 * propagating, so degrade-to-open on a throw is a policy each caller reads off the result rather
 * than a try/catch it must write itself. `limit()`'s resolved value is checked against its
 * declared shape rather than trusted outright, since `RateLimitLike` is structural and a
 * malformed response reads as `limited`, not as an accidental `allowed`.
 */
export async function resolveRateLimit(
  binding: RateLimitLike | undefined,
  keys: string | string[],
): Promise<RateLimitOutcome> {
  if (!binding) return { outcome: 'no-binding' };
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    let result: { success: boolean } | undefined;
    try {
      result = await binding.limit({ key });
    } catch (error) {
      return { outcome: 'failed', error };
    }
    if (result?.success !== true) return { outcome: 'limited', key };
  }
  return { outcome: 'allowed' };
}
