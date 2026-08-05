// Internal fixture endpoint: clears the channel's mutable state between e2e runs, so a locally
// reused preview server (playwright's `reuseExistingServer`) does not accumulate hourly budgets
// across runs until specs start answering `throttled`. The e2e calls this once, in
// `test.beforeAll`.
//
// Clears `cairn_channel_code`, `cairn_channel_session`, and `cairn_channel_budget`, the three
// tables that accumulate request-scoped state. `cairn_channel_meta` is deliberately left alone:
// it carries `schema_version` (verifySchema's own read) and the lazily-provisioned
// `identity_salt`, and `memberChannel` is a module-level singleton that caches a positive check
// of each forever (src/lib/auth-channel/factory.ts's `schemaVerified`/`cachedSalt`). Deleting
// `schema_version` after the first request would make every subsequent `verifySchema` call fail
// (no row to read), and every login would answer `unavailable`.
//
// The refusal lives in the body, `devDelivery`'s own precedent; see the sibling `last-otp` route
// for why both checks (host and env) are independent of the build fold.
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetCapture } from '../../../members/capture-transport.js';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export const POST: RequestHandler = async ({ url, platform }) => {
  if (!isLocalHost(url.hostname) || platform?.env?.CAIRN_DEV_BACKEND !== '1') {
    error(404, 'Not found');
  }
  const db = platform?.env?.MEMBER_DB;
  if (!db) {
    error(404, 'Not found');
  }
  await db.prepare('DELETE FROM cairn_channel_code').run();
  await db.prepare('DELETE FROM cairn_channel_session').run();
  await db.prepare('DELETE FROM cairn_channel_budget').run();
  resetCapture();
  return json({ ok: true });
};
