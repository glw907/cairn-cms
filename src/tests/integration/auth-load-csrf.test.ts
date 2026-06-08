import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { makeRecordingCookies } from './_auth-harness.js';
import { csrfCookieName } from '../../lib/auth/crypto.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';

const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'a@b.c' } });

function loadEvent(url: string, cookies: CookieJar) {
  return {
    url: new URL(url),
    request: new Request(url),
    cookies,
    locals: {},
    platform: { env: {} },
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
});
