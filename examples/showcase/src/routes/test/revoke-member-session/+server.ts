// Internal fixture endpoint: revokes the CALLER's own resolved session, never a subject named in
// the request body. This is a harness affordance for the e2e's revocation spec, not a pattern to
// copy: a real site's roster-removal flow (docs/guides/add-a-login-channel.md, "Remove a member
// from the roster") revokes an admin-chosen subject from an authenticated admin action, which is
// a different caller entirely from the subject being revoked. A route that let ANY caller name an
// arbitrary victim subject would be exactly the shape pass 1's rule forbids: no control keyed on
// the victim's identity may deny, delay, or destroy anything; denial keys on the requester. Here
// the "requester" and the "victim" are deliberately the same person, by construction, because the
// subject comes from `memberChannel.resolveSubject(event)` (the caller's own session cookie), not
// from a posted field.
//
// The refusal lives in the body, `devDelivery`'s own precedent; see the sibling `last-otp` route
// for why both checks (host and env) are independent of the build fold.
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { memberChannel } from '../../../members/channel.js';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export const POST: RequestHandler = async (event) => {
  const { url, platform } = event;
  if (!isLocalHost(url.hostname) || platform?.env?.CAIRN_DEV_BACKEND !== '1') {
    error(404, 'Not found');
  }
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) {
    error(404, 'Not found');
  }
  const db = platform?.env?.MEMBER_DB;
  if (!db) {
    error(404, 'Not found');
  }
  await memberChannel.revokeSessions(db, subject);
  return json({ ok: true });
};
