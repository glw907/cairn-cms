// The closed vocabulary a genuinely-navigating refusal may carry on `?error=`. Every in-place
// refusal answers through `fail()` (R10); this module is the whole bounded surface the query
// channel is still allowed to speak, so an attacker-crafted query value carries no meaning past
// this resolver. Internal: no signature outside this file names RefusalCode, so a `*Data.error`
// field stays `string | null` and the public surface never grows a code union to write.

/**
 * The three refusals that genuinely navigate rather than answering the form that posted: an
 *  expired sign-in link, and publish-all's two outcomes. `expired` keeps its shipped spelling;
 *  the other two are snake_case, matching the log vocabulary's grammar (`docs/reference/log-events.md`).
 */
export type RefusalCode = 'expired' | 'nothing_to_publish' | 'publish_conflict';

/** Each {@link RefusalCode}'s engine copy, the only prose the query channel is ever allowed to carry. */
const REFUSAL_COPY: Record<RefusalCode, string> = {
  expired: 'That link expired. Request a new one below.',
  nothing_to_publish: 'Nothing to publish. Every entry is already live.',
  publish_conflict: 'The site changed while publishing. Reload and try again.',
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
