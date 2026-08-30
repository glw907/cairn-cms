import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { makeRecordingCookies } from './_auth-harness.js';
import { csrfCookieName } from '../../lib/auth/crypto.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';

const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'a@b.c' } });

function loadEvent(url: string, cookies: CookieJar, env: Record<string, string> = {}) {
  return {
    url: new URL(url),
    request: new Request(url),
    cookies,
    locals: {},
    platform: { env },
    setHeaders: () => {},
  } as never;
}

describe('auth loads issue a CSRF token', () => {
  it('loginLoad sets a __Host- csrf cookie and returns its value', () => {
    const cookies = makeRecordingCookies();
    const data = routes.loginLoad(loadEvent('https://test.dev/admin/login', cookies));
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(cookies.sets.find((s) => s.name === csrfCookieName(true))?.value).toBe(data.csrf);
  });

  it('confirmLoad returns both the magic-link token and the csrf token', () => {
    const cookies = makeRecordingCookies();
    const data = routes.confirmLoad(loadEvent('https://test.dev/admin/auth/confirm?token=ml', cookies));
    expect(data.token).toBe('ml');
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('with no PUBLIC_ORIGIN configured (platform: { env: {} }), falls back to the request protocol', () => {
    const cookies = makeRecordingCookies();
    routes.loginLoad(loadEvent('https://test.dev/admin/login', cookies, {}));
    expect(cookies.sets.find((s) => s.name === csrfCookieName(true))).toBeDefined();
  });

  it('a configured PUBLIC_ORIGIN wins over the request protocol on a non-local host', () => {
    const cookies = makeRecordingCookies();
    routes.loginLoad(
      loadEvent('http://test.dev/admin/login', cookies, { PUBLIC_ORIGIN: 'https://test.dev' }),
    );
    expect(cookies.sets.find((s) => s.name === csrfCookieName(true))).toBeDefined();
  });
});
