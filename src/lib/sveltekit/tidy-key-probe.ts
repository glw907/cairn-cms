// cairn-cms: the tidy settings screen's active key probe (save-500-honest-errors, Task 5).
// Presence alone stopped being the bar once a live site proved a present-but-revoked key: the
// settings load calls this to distinguish missing / invalid / valid instead of just presence,
// through the same injectable TidyClient the tidy action itself calls, so a test's fake client
// stands in with no real network or key.
import { markKeyHealthy, markKeyUnhealthy } from './tidy-key-health.js';
import { tidyClientErrorStatus, type TidyClient } from './content-routes-context.js';

/** The settings screen's three reportable key states, distinct from bare presence. */
export type TidyKeyProbeResult = 'valid' | 'invalid' | 'unknown';

/**
 * Actively verify a resolved Anthropic key with a zero-token `models.list` call: a 401/403
 *  confirms the key is invalid and marks the shared key-health cache unhealthy, the same state a
 *  failed tidy call leaves; a success marks it healthy. A client with no `models` probe surface
 *  (the showcase's deterministic dev stub, an older fake) or a network failure both degrade to
 *  'unknown' rather than a false claim of invalid: the probe fails soft, never punishing a state
 *  it cannot actually verify.
 */
export async function probeTidyKey(client: TidyClient): Promise<TidyKeyProbeResult> {
  if (!client.models) return 'unknown';
  try {
    await client.models.list({ limit: 1 });
    markKeyHealthy();
    return 'valid';
  } catch (err) {
    const status = tidyClientErrorStatus(err);
    if (status === 401 || status === 403) {
      markKeyUnhealthy();
      return 'invalid';
    }
    return 'unknown';
  }
}
