// The doctor's opt-in live send (--send-test): one real message through the Email Sending
// REST API, since the Worker EMAIL binding is unreachable from a CLI. A factory rather than
// a check constant, so the check exists only when the bin receives an address; no default
// registry carries it.
//
// Endpoint and payload re-verified against the Cloudflare API reference, 2026-07-07: POST
// /accounts/{account_id}/email/sending/send with { from, to, subject, text }, where from and
// to still accept a plain address string (each also now accepts an { address, name } object,
// and to also an array of either; this check keeps the minimal string form since it names one
// recipient). The public beta has since widened the payload with cc, bcc, reply_to, and
// attachments, none of which this minimal test send needs.
//   https://developers.cloudflare.com/api/resources/email_sending/
import { fail, pass } from './types.js';
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';
import { cfPost, NO_ACCOUNT, NO_FROM } from './cloudflare-api.js';

// Enough of an error body to act on without flooding the one-line report.
const EXCERPT_MAX = 200;

/** Build the live-send check for one recipient address. */
export function liveSendCheck(to: string): DoctorCheck {
  return {
    id: 'email.live-send',
    conditionId: 'email.send-failed',
    title: 'Live test send',
    async run(ctx: DoctorContext): Promise<CheckResult> {
      if (!ctx.cfToken || !ctx.cfAccountId) return NO_ACCOUNT;
      if (!ctx.from) return NO_FROM;
      try {
        const res = await cfPost(ctx, `/accounts/${ctx.cfAccountId}/email/sending/send`, {
          from: ctx.from,
          to,
          subject: 'cairn doctor test send',
          text: 'This is a cairn doctor test send. Receiving it proves the sending path.',
        });
        if (!res.ok) {
          const excerpt = (await res.text()).slice(0, EXCERPT_MAX);
          return fail(`send returned ${res.status}: ${excerpt}`);
        }
        return pass(`sent to ${to}; check the inbox`);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  };
}
