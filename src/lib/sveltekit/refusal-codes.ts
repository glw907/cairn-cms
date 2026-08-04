// The closed vocabulary a genuinely-navigating refusal may carry on `?error=`. Every in-place
// refusal answers through `fail()` (R10); this module is the whole bounded surface the query
// channel is still allowed to speak, so an attacker-crafted query value carries no meaning past
// this resolver. Internal: no signature outside this file names RefusalCode, so a `*Data.error`
// field stays `string | null` and the public surface never grows a code union to write.

/**
 * The refusals that genuinely navigate rather than answering the form that posted: an expired
 *  sign-in link, publish-all's three outcomes, and the one deliberate exception to the
 *  "publish-all only ever redirects to its own three outcomes" rule, `publish_failed`, for the
 *  unexpected (non-conflict) commit error that would otherwise reach `viewAction`'s generic
 *  `fail(500)` and be discarded when `/admin`'s own load redirects away before it can render
 *  (C2b's own post-review fix; `publishAllAction`, `content-routes-core.ts`). `expired` keeps its
 *  shipped spelling; the rest are snake_case, matching the log vocabulary's grammar
 *  (`docs/reference/log-events.md`).
 */
export type RefusalCode = 'expired' | 'nothing_to_publish' | 'publish_conflict' | 'publish_failed';

/** Each {@link RefusalCode}'s engine copy, the only prose the query channel is ever allowed to carry. */
const REFUSAL_COPY: Record<RefusalCode, string> = {
  expired: 'That link expired. Request a new one below.',
  nothing_to_publish: 'Nothing to publish. Every entry is already live.',
  publish_conflict: 'The site changed while publishing. Reload and try again.',
  publish_failed: 'Something went wrong and the site did not publish. Try again, and if it keeps failing, let your site developer know.',
};

/**
 * Narrow a raw `?error=` query value to a {@link RefusalCode}, or `null` for anything outside the
 *  closed set. Rejecting an unrecognized value is the default here, not a check every caller
 *  repeats, so a crafted query string can never reach a load's data.
 */
export function resolveRefusalCode(raw: string | null): RefusalCode | null {
  return raw !== null && Object.hasOwn(REFUSAL_COPY, raw) ? (raw as RefusalCode) : null;
}

/** The engine copy for a {@link RefusalCode}. */
export function refusalMessage(code: RefusalCode): string {
  return REFUSAL_COPY[code];
}
