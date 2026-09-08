import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import type { MagicLinkLoginData } from '../../lib/sveltekit/auth-routes.js';
import { testEvent } from '../helpers/test-event.js';

const branding = { siteName: 'Test Site', from: 'cms@test' };

function event(search = '') {
  const headers: Record<string, string> = {};
  return {
    ...testEvent({ url: `https://test.example/admin/login${search}` }),
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

describe('auth page loads', () => {
  it('loginLoad returns the site name and no error by default', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    // No locals.cairnIdentity on this event, so loginLoad's runtime result is always the
    // magic-link variant; the cast reflects that, not a widening of the declared return type.
    const data = (await loginLoad(event())) as MagicLinkLoginData;
    expect(data).toMatchObject({ siteName: 'Test Site', error: null });
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('loginLoad surfaces the expired error from the query', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    const data = (await loginLoad(event('?error=expired'))) as MagicLinkLoginData;
    expect(data.error).toBe('expired');
  });

  it('confirmLoad returns the token, site name, error, and sets Referrer-Policy', async () => {
    const { confirmLoad } = createAuthRoutes({ branding });
    const ev = event('?token=abc');
    const data = await confirmLoad(ev);
    expect(data).toMatchObject({ token: 'abc', siteName: 'Test Site', error: null });
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(ev._headers['Referrer-Policy']).toBe('no-referrer');
  });
});
