// A test seam for the stale-read races: wrap the already-installed fetch so a concurrent commit
// lands in the instant after the action's first read of one repo path and before the action's own
// commit. The read still answers with the pre-injection bytes, so the action holds a stale file
// exactly as it would when a second editor's commit lands between its read and its write.
import { vi } from 'vitest';

/**
 * Run `inject` once, right after the first GET of the contents API for `path` returns. Call it
 *  after `GithubDouble.install()`, so it wraps the double's fetch. Returns a getter for whether
 *  the injection fired, so a test can prove its race window was actually entered.
 */
export function injectAfterFirstRead(path: string, inject: () => void): () => boolean {
  const inner = globalThis.fetch;
  let fired = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const response = await inner(input, init);
      const url = new URL(String(input instanceof Request ? input.url : input));
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (!fired && method === 'GET' && decodeURIComponent(url.pathname).endsWith(`/contents/${path}`)) {
        fired = true;
        inject();
      }
      return response;
    }),
  );
  return () => fired;
}
