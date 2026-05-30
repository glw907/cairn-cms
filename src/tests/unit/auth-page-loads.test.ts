import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';

const branding = { siteName: 'Test Site', from: 'cms@test' };

function event(search = '') {
  const headers: Record<string, string> = {};
  return {
    url: new URL(`https://test.example/admin/login${search}`),
    request: new Request('https://test.example/admin/login'),
    cookies: { get: () => undefined, set() {}, delete() {} },
    locals: {},
    platform: { env: {} },
    setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
    _headers: headers,
  };
}

describe('auth page loads', () => {
  it('loginLoad returns the site name and no error by default', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    expect(await loginLoad(event() as never)).toEqual({ siteName: 'Test Site', error: null });
  });

  it('loginLoad surfaces the expired error from the query', async () => {
    const { loginLoad } = createAuthRoutes({ branding });
    const data = await loginLoad(event('?error=expired') as never);
    expect(data.error).toBe('expired');
  });

  it('confirmLoad returns the token, site name, error, and sets Referrer-Policy', async () => {
    const { confirmLoad } = createAuthRoutes({ branding });
    const ev = event('?token=abc');
    const data = await confirmLoad(ev as never);
    expect(data).toEqual({ token: 'abc', siteName: 'Test Site', error: null });
    expect(ev._headers['Referrer-Policy']).toBe('no-referrer');
  });
});
