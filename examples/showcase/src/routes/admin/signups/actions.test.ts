import { describe, expect, it } from 'vitest';
import { actions } from './+page.server.js';

const CSRF_TOKEN = 'showcase-csrf-token';

/**
 * Build the one event shape these actions read: an editor session, a cookie jar carrying the
 * double-submit token, a matching `csrf` form field, and the site's access declaration. The
 * platform env carries no `APP_DB`, which is safe here because every authorization check runs
 * before the binding resolves. A non-owner session is the interesting case, since
 * `/admin/signups` is declared owner-only.
 */
function signupsEvent(options: {
  capability: 'owner' | 'editor' | 'none';
  body: Record<string, string>;
}): Parameters<(typeof actions)['remove']>[0] {
  const form = new URLSearchParams({ csrf: CSRF_TOKEN, ...options.body });
  const event = {
    url: new URL('http://localhost/admin/signups'),
    route: { id: '/admin/signups' },
    request: new Request('http://localhost/admin/signups?/remove', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }),
    cookies: { get: () => CSRF_TOKEN },
    locals: {
      cairnEditor: {
        email: 'someone@showcase.test',
        displayName: 'Someone',
        role: options.capability,
        capability: options.capability,
      },
      cairnAccess: { '/admin/signups': ['owner'] },
    },
    platform: { env: { APP_DB: undefined } },
  };
  return event as unknown as Parameters<(typeof actions)['remove']>[0];
}

describe('the signups screen actions', () => {
  it('refuses a non-owner remove through the section action rather than throwing', async () => {
    const result = await actions.remove(signupsEvent({ capability: 'editor', body: { id: '1' } }));
    // The section action's own refusal channel returns fail(403) with the shared denial copy; a
    // bare requireOwner would have thrown error(403, 'Owner access required') instead, so
    // resolving at all is half of what this asserts. The returned failure is compared by shape
    // rather than through SvelteKit's own isActionFailure: the engine resolves @sveltejs/kit from
    // the repo root while this test resolves it from the showcase, so the two ActionFailure
    // classes are distinct and an instanceof check would answer false for a real failure.
    expect(result).toMatchObject({
      status: 403,
      data: { error: 'You do not have access to this action.' },
    });
  });
});
