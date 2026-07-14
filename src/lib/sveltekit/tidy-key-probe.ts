// cairn-cms: the tidy settings screen's active key probe (save-500-honest-errors, Task 5).
// Presence alone stopped being the bar once a live site proved a present-but-revoked key: the
// settings load calls this to distinguish missing / invalid / valid instead of just presence,
// through the same injectable TidyClient the tidy action itself calls, so a test's fake client
// stands in with no real network or key.
import { markKeyHealthy, markKeyUnhealthy, recordProbeResult, type TidyKeyProbeResult } from './tidy-key-health.js';
import { tidyClientErrorStatus, type TidyClient } from './content-routes-context.js';

export type { TidyKeyProbeResult } from './tidy-key-health.js';

/**
 * Actively verify a resolved Anthropic key with a zero-token `models.list` call: a 401/403
 *  confirms the key is invalid and marks the shared key-health cache unhealthy, the same state a
 *  failed tidy call leaves; a success marks it healthy. A client with no `models` probe surface
 *  (the showcase's deterministic dev stub, an older fake) or a network failure both degrade to
 *  'unknown' rather than a false claim of invalid: the probe fails soft, never punishing a state
 *  it cannot actually verify.
 *
 *  Bounded by `timeoutMs` (save-500-hardening): the production client is a bare `new Anthropic()`
 *  call, whose SDK default is a multi-minute request timeout plus retries, so an unbounded probe
 *  on every settings load could hang the request far past any reasonable page load. An
 *  `AbortController` mirrors `tidyAction`'s own deadline exactly, and an abort or timeout resolves
 *  to 'unknown' (the existing fail-soft posture) rather than throwing into the load. Every
 *  verdict, including 'unknown', is cached through `recordProbeResult` so a run of settings
 *  navigations within the cache's TTL costs no repeated live round trip.
 */
export async function probeTidyKey(client: TidyClient, timeoutMs: number): Promise<TidyKeyProbeResult> {
  if (!client.models) {
    recordProbeResult('unknown');
    return 'unknown';
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await client.models.list({ limit: 1 }, { signal: controller.signal });
    markKeyHealthy();
    recordProbeResult('valid');
    return 'valid';
  } catch (err) {
    const status = tidyClientErrorStatus(err);
    if (status === 401 || status === 403) {
      markKeyUnhealthy();
      recordProbeResult('invalid');
      return 'invalid';
    }
    recordProbeResult('unknown');
    return 'unknown';
  } finally {
    clearTimeout(timer);
  }
}
