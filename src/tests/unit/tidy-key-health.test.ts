// save-500-honest-errors, Task 5: the tidy action's per-isolate key-health cache. A tidy call
// failing with an auth reason marks the key unhealthy for a TTL window; the mark expires on its
// own once the window passes, with no explicit recovery call needed.
import { describe, it, expect, afterEach } from 'vitest';
import {
  markKeyUnhealthy,
  markKeyHealthy,
  keyKnownUnhealthy,
  resetKeyHealthForTest,
} from '../../lib/sveltekit/tidy-key-health.js';

afterEach(() => resetKeyHealthForTest());

const TEN_MINUTES = 10 * 60 * 1000;

describe('tidy key health cache', () => {
  it('starts healthy: no prior mark means keyKnownUnhealthy is false', () => {
    expect(keyKnownUnhealthy(0)).toBe(false);
  });

  it('marks the key unhealthy from the given time, through the TTL window', () => {
    markKeyUnhealthy(1_000_000);
    expect(keyKnownUnhealthy(1_000_000)).toBe(true);
    expect(keyKnownUnhealthy(1_000_000 + TEN_MINUTES - 1)).toBe(true);
  });

  it('recovers once the TTL window passes, with no explicit clear', () => {
    markKeyUnhealthy(1_000_000);
    expect(keyKnownUnhealthy(1_000_000 + TEN_MINUTES)).toBe(false);
  });

  it('markKeyHealthy clears the mark immediately, before the TTL would expire it', () => {
    markKeyUnhealthy(1_000_000);
    markKeyHealthy();
    expect(keyKnownUnhealthy(1_000_000)).toBe(false);
  });

  it('defaults `now` to Date.now() when the caller passes none', () => {
    markKeyUnhealthy();
    expect(keyKnownUnhealthy()).toBe(true);
  });
});
