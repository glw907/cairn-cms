// Email Sending: onboard the admin's apex, poll it once, and send the test message that proves
// sign-in mail actually works, classifying a send refusal into the right catalogue row. Every
// finding below traces to the T4b email spike (docs/internal/2026-08-11-t4b-email-spike.md) and
// its amendments, folded into the plan 2026-08-12.
//
// ensureSendingDomain reads the subdomain list before ever posting a create, because
// createSendingSubdomain is a write and this seam's own rule (api.mjs) is that a write is never
// retried: a resumed run that posted blind would risk onboarding the same apex twice. It never
// loops or sleeps; a caller that gets back `enabled: false` parks and re-runs later, the same
// shape as this chapter's other single-poll checks.
//
// sendTestMessage's classification is the one place amendment 1 replaces the plan's original
// design: the REST send carries no `E_` codes, only a numeric `code` and a dotted identifier on
// `err.api` (api.mjs's own throwCatalogued). SENDING_DISABLED_CODE (10203) is the ONLY signal
// available for the propagation condition, and it is byte-identical for a domain that was never
// onboarded and one whose records are still settling (amendment 2), so the caller's own
// `onboardedAt` plus the clock is the whole discriminator; nothing in the body can do it. The
// daily-limit condition was never observed live (amendment 8's sibling for the send path), so it
// is matched on Cloudflare's dotted identifier containing "daily_limit", in that identifier's own
// style, rather than on an invented numeric code.
//
// The three reclassified rows (email-sender-propagating, email-sender-unavailable,
// email-daily-limit) are built here with no `dir`: this module classifies a failure, it does not
// print one, and `dir` is not part of its interface. The caller that prints the final row (chapter
// 2's orchestrator, which already builds every other wait/act row with its own `dir`) reads
// `err.catalogue.code` off what this throws and rebuilds the printed message with `dir` in hand,
// the same "outcome now, message later" split hostname.mjs's cutover already uses for its own wait
// rows. An unmapped failure is rethrown as-is instead: it already carries api.mjs's real `dir`,
// since api.mjs built it, and reclassifying it here would only lose that.
import { SENDING_DISABLED_CODE } from './api.mjs';
import { cloudflareError } from './catalogue.mjs';

/**
 * How long after onboarding a send refusal still counts as normal propagation rather than a
 * failed onboarding. Cloudflare documents 5 to 15 minutes; the T4b spike measured 47 to 107
 * seconds on an already-active zone (amendment 10), so 30 minutes is generous headroom over both.
 */
export const PROPAGATION_WINDOW_MS = 30 * 60 * 1000;

/**
 * Matches Cloudflare's dotted-identifier style for a daily-sending-limit refusal. No numeric code
 * for this condition has ever been observed live (this account never reached it), so the
 * identifier is the only thing to key on; the pattern covers Cloudflare's own naming convention
 * rather than one captured string.
 */
const DAILY_LIMIT_PATTERN = /daily_limit/i;

/**
 * Derive a site's default sign-in sender address from its domain. The one place this address is
 * built, so config.mjs's writeEmailFrom and chapter 2's orchestrator both derive it the same way.
 * @param {string} domain the site's apex, including a subdomain when the site is on one
 * @returns {string} `no-reply@<domain>`
 */
export function defaultFromAddress(domain) {
  return `no-reply@${domain}`;
}

/**
 * @typedef {object} EnsureSendingDomainResult
 * @property {boolean} enabled whether the apex is enabled for Email Sending right now
 * @property {string} [onboardedAt] the ISO moment this call first saw `enabled: true`, set only
 *  when `enabled` is true; anchors `sendTestMessage`'s propagation window
 */

/**
 * Onboard the admin's apex for Email Sending, or confirm it already is. Reads the zone's sending
 * subdomains first and posts a create only when no entry matches the apex, so a resumed run never
 * creates twice. One poll, no loop: a disabled entry (existing or freshly created, since a create
 * that has not yet taken reports the same way) is returned for the caller to park on.
 * @param {object} args
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {string} args.zoneId the zone to onboard, from `record.cloudflare.zoneId`
 * @param {string} args.domain the apex to onboard, from `record.cloudflare.domain`
 * @param {object} args.record the site's in-memory state record; accepted for parity with this
 *  chapter's other producers (zone.mjs, hostname.mjs), though this hop needs none of its fields,
 *  since the caller already resolves `zoneId` and `domain` explicitly
 * @returns {Promise<EnsureSendingDomainResult>} the current state, and, once enabled, the moment
 *  this call observed it
 */
export async function ensureSendingDomain({ api, zoneId, domain, record: _record }) {
  const subdomains = await api.listSendingSubdomains(zoneId);
  const existing = subdomains.find((entry) => entry.name === domain);
  const entry = existing ?? (await api.createSendingSubdomain(zoneId, domain));

  if (!entry.enabled) return { enabled: false };
  return { enabled: true, onboardedAt: new Date().toISOString() };
}

/**
 * Classify a caught send failure by Cloudflare's code and by the propagation clock, throwing the
 * catalogue row the failure actually means. Returns normally (falls through to the caller's own
 * rethrow) when the failure is not one this function recognizes.
 * @param {Error & { catalogue?: { code?: string }, api?: { code?: number, id?: string } }} err the
 *  error `api.sendMessage` threw
 * @param {string} from the sender address the send was attempted with, `no-reply@<domain>`
 * @param {string} onboardedAt the ISO moment `ensureSendingDomain` first saw the apex enabled
 * @param {() => number} now the injected clock
 * @returns {never | void} never returns when it recognizes the failure; returns when it does not,
 *  leaving the caller to rethrow the original error
 */
function classifySendFailure(err, from, onboardedAt, now) {
  if (err?.catalogue?.code !== 'email-send-failed') return;

  if (err.api?.code === SENDING_DISABLED_CODE) {
    const elapsedMs = now() - Date.parse(onboardedAt);
    if (elapsedMs <= PROPAGATION_WINDOW_MS) {
      throw cloudflareError('email-sender-propagating', {});
    }
    const domain = from.split('@')[1];
    throw cloudflareError('email-sender-unavailable', { domain });
  }

  if (typeof err.api?.id === 'string' && DAILY_LIMIT_PATTERN.test(err.api.id)) {
    throw cloudflareError('email-daily-limit', {});
  }
}

/**
 * Send the test sign-in message that proves the onboarded apex can actually deliver, classifying
 * a refusal into the propagation park, the past-window failure, the daily-limit park, or Task 4's
 * own send-failed fall-through. Resolves silently on success; every other outcome throws.
 * @param {object} args
 * @param {ReturnType<typeof import('./api.mjs').makeApi>} args.api the Cloudflare API client
 * @param {string} args.from the sender address, `no-reply@<domain>` from `defaultFromAddress`
 * @param {string} args.to the recipient, the admin's own address
 * @param {string} args.onboardedAt the ISO moment `ensureSendingDomain` first saw the apex enabled
 * @param {() => number} [args.now] the clock the propagation window is measured against; defaults
 *  to `Date.now`, a test seam so the window is testable without waiting
 * @returns {Promise<void>}
 */
export async function sendTestMessage({ api, from, to, onboardedAt, now = Date.now }) {
  try {
    await api.sendMessage({
      from,
      to,
      subject: 'Your cairn sign-in email is working',
      text: 'This is a test message from your cairn site, confirming Email Sending is set up ' +
        'and working. No action needed.',
    });
  } catch (err) {
    classifySendFailure(err, from, onboardedAt, now);
    throw err;
  }
}
