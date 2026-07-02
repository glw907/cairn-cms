// cairn-cms: the fetch + devalue-deserialize + stale-guard round trip shared by every admin
// client action that posts to a SvelteKit form action from script (a preview, a bulk apply, a scan)
// instead of a plain form submit. It folds a network failure into the same fail-closed shape a
// server-returned failure carries, so a caller writes one branch, not two. It does not itself guard
// against a stale, superseded response; a caller that can re-run (a "Check usage again" retry
// racing an earlier response) pairs it with `createRequestGuard` below.
import { deserialize } from '$app/forms';

/**
 * The outcome of `postFormAction`: a typed success payload, or a fail-closed miss carrying
 * whatever data a parsed failure response supplied (`undefined` for a network throw).
 */
export type ActionOutcome<T> = { ok: true; data: T } | { ok: false; data?: unknown };

/**
 * POST `init` to `url` and parse the response as a SvelteKit `ActionResult` envelope via
 * `deserialize`. A network throw and a non-success envelope both resolve to `{ ok: false }` (the
 * fail-closed branch), so the caller's own default-failure object handles both uniformly; a
 * success envelope with falsy `data` also resolves fail-closed, matching the action-result
 * contract (a success always carries data here).
 */
export async function postFormAction<T>(url: string, init: RequestInit): Promise<ActionOutcome<T>> {
  let result: { type: string; data?: unknown };
  try {
    const res = await fetch(url, init);
    result = deserialize(await res.text()) as { type: string; data?: unknown };
  } catch {
    return { ok: false };
  }
  if (result.type === 'success' && result.data) {
    return { ok: true, data: result.data as T };
  }
  return { ok: false, data: result.data };
}

/** A per-call request-sequence guard. */
export interface RequestGuard {
  /** Claim the next sequence token for a fresh call. */
  next: () => number;
  /** Whether `token` has been superseded by a later `next()` call. */
  isStale: (token: number) => boolean;
}

/**
 * Create a request-sequence guard: each call to `next()` returns a token, and `isStale(token)`
 * reports whether a newer call has since superseded it. A client action that can be re-run while
 * an earlier call is still in flight (a dialog reopen, a "Check usage again" retry) pins a token
 * at entry and drops its response after the await if a fresher call has already landed.
 */
export function createRequestGuard(): RequestGuard {
  let seq = 0;
  return {
    next: () => ++seq,
    isStale: (token: number) => token !== seq,
  };
}
