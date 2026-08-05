// Internal fixture endpoint: reads back the last code and delivery count `captureDeliver`
// recorded for a contact, or 404 when none exists. This is a roster oracle by construction
// (delivery only ever runs for a known subject; members/channel.ts's lookupContact resolves
// against MEMBER_ROSTER), so this route must never run against a database holding real contacts;
// docs/guides/add-a-login-channel.md's "Prove your channel" section states that as a rule for a
// site building its own version of this harness.
//
// The refusal lives in the body, `devDelivery`'s own precedent (never a caller's gate), and
// checks two things independent of each other: `isLocalHost` closes the one path the build fold
// cannot (a `VITE_CAIRN_E2E=1` build that reaches a deployed runtime with CAIRN_DEV_BACKEND=1
// still set would otherwise expose an unauthenticated OTP oracle there), and
// `platform.env?.CAIRN_DEV_BACKEND === '1'` mirrors the same flag every other dev-only surface
// reads. Duplicated in the two sibling routes rather than imported from a shared module, the same
// duplication `factory.ts`'s own `isLocalHost` documents for `guard.ts`'s.
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readCapture } from '../../../members/capture-transport.js';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!isLocalHost(url.hostname) || platform?.env?.CAIRN_DEV_BACKEND !== '1') {
    error(404, 'Not found');
  }
  const contact = url.searchParams.get('contact') ?? '';
  const capture = readCapture(contact);
  if (!capture) {
    error(404, 'Not found');
  }
  return json(capture);
};
