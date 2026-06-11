// The doctor's opt-in live send (--send-test): one real message through the Email Sending
// REST API, since the Worker EMAIL binding is unreachable from a CLI. A factory rather than
// a check constant, so the check exists only when the bin receives an address; no default
// registry carries it.
//
// Endpoint and payload verified against the Cloudflare API reference, 2026-06-11:
//   POST /accounts/{account_id}/email/sending/send with { from, to, subject, text },
//   where from and to take a plain address string.
//   https://developers.cloudflare.com/api/resources/email_sending/
import type { CheckResult, DoctorCheck, DoctorContext } from './types.js';

const API = 'https://api.cloudflare.com/client/v4';

// Enough of an error body to act on without flooding the one-line report.
const EXCERPT_MAX = 200;

/** Build the live-send check for one recipient address. */
export function liveSendCheck(to: string): DoctorCheck {
	return {
		id: 'email.live-send',
		conditionId: 'email.send-failed',
		title: 'Live test send',
		async run(ctx: DoctorContext): Promise<CheckResult> {
			if (!ctx.cfToken || !ctx.cfAccountId) {
				return {
					status: 'skip',
					detail: 'set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to run this check',
				};
			}
			if (!ctx.from) {
				return { status: 'skip', detail: 'pass --from or set CAIRN_FROM to run this check' };
			}
			try {
				const res = await ctx.fetch(`${API}/accounts/${ctx.cfAccountId}/email/sending/send`, {
					method: 'POST',
					headers: {
						authorization: `Bearer ${ctx.cfToken}`,
						'content-type': 'application/json',
					},
					body: JSON.stringify({
						from: ctx.from,
						to,
						subject: 'cairn doctor test send',
						text: 'This is a cairn doctor test send. Receiving it proves the sending path.',
					}),
				});
				if (!res.ok) {
					const excerpt = (await res.text()).slice(0, EXCERPT_MAX);
					return { status: 'fail', detail: `send returned ${res.status}: ${excerpt}` };
				}
				return { status: 'pass', detail: `sent to ${to}; check the inbox` };
			} catch (err) {
				return { status: 'fail', detail: String(err) };
			}
		},
	};
}
