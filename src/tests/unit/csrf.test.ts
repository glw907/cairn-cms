import { describe, it, expect } from 'vitest';
import {
  isUnsafeFormRequest,
  originMatches,
  issueCsrfToken,
  validateCsrfHeader,
  validateCsrfToken,
  csrfSecure,
} from '../../lib/sveltekit/csrf.js';
import { SESSION_TTL_MS } from '../../lib/auth/crypto.js';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';

function jar(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  const cookies: CookieJar & { sets: typeof sets } = {
    sets,
    get: (name) => store.get(name),
    set: (name, value, opts) => {
      store.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name) => void store.delete(name),
  };
  return cookies;
}

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe('isUnsafeFormRequest', () => {
  it('flags an unsafe method carrying a form content type', () => {
    const urlenc = req('https://x.dev/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a=1',
    });
    const multi = req('https://x.dev/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=z' },
      body: 'x',
    });
    expect(isUnsafeFormRequest(urlenc)).toBe(true);
    expect(isUnsafeFormRequest(multi)).toBe(true);
  });

  it('ignores a GET and a JSON POST', () => {
    expect(isUnsafeFormRequest(req('https://x.dev/admin/login'))).toBe(false);
    const json = req('https://x.dev/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(isUnsafeFormRequest(json)).toBe(false);
  });
});

describe('originMatches', () => {
  const ev = (origin: string | null) =>
    ({
      url: new URL('https://x.dev/about'),
      request: req('https://x.dev/about', origin ? { headers: { origin } } : undefined),
    }) as never;
  it('matches an equal origin and rejects a mismatch or absence', () => {
    expect(originMatches(ev('https://x.dev'))).toBe(true);
    expect(originMatches(ev('https://evil.dev'))).toBe(false);
    expect(originMatches(ev(null))).toBe(false);
  });
});

const SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

describe('issueCsrfToken', () => {
  it('mints and sets a __Host- cookie when absent, SameSite=Lax explicit with the session maxAge', () => {
    const cookies = jar();
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(cookies.sets[0].name).toBe('__Host-cairn_csrf');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    expect(cookies.sets[0].opts.maxAge).toBe(SESSION_MAX_AGE);
  });

  it('re-anchors a present cookie with a fresh maxAge and the unchanged value (no rotate-on-confirm)', () => {
    const cookies = jar({ '__Host-cairn_csrf': 'EXISTING' });
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies });
    expect(token).toBe('EXISTING');
    expect(cookies.sets).toHaveLength(1);
    expect(cookies.sets[0].value).toBe('EXISTING');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    expect(cookies.sets[0].opts.maxAge).toBe(SESSION_MAX_AGE);
  });

  it('drops the prefix and Secure on http', () => {
    const cookies = jar();
    issueCsrfToken({ url: new URL('http://localhost/admin/login'), cookies });
    expect(cookies.sets[0].name).toBe('cairn_csrf');
    expect(cookies.sets[0].opts.secure).toBe(false);
  });
});

describe('csrfSecure', () => {
  it('derives from the request protocol on a local host, ignoring PUBLIC_ORIGIN', () => {
    const event = {
      url: new URL('http://localhost:8788/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'https://site.example' } },
    };
    expect(csrfSecure(event)).toBe(false);
  });

  it('derives from PUBLIC_ORIGIN on a non-local host when it parses', () => {
    const event = {
      url: new URL('http://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'https://site.example' } },
    };
    expect(csrfSecure(event)).toBe(true);
  });

  it('falls back to the request protocol when PUBLIC_ORIGIN is absent', () => {
    const event = { url: new URL('https://site.example/admin/login'), platform: { env: {} } };
    expect(csrfSecure(event)).toBe(true);
  });

  it('falls back to the request protocol when PUBLIC_ORIGIN does not parse', () => {
    const event = {
      url: new URL('https://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'not a url' } },
    };
    expect(csrfSecure(event)).toBe(true);
  });
});

describe('CSRF cookie round trip under PUBLIC_ORIGIN', () => {
  // The permanent-403 class this pass closes: a writer and a reader must resolve the same
  // cookie name for the same request, which only holds when both are handed `platform`.
  const platform = { env: { PUBLIC_ORIGIN: 'https://site.example' } };
  const url = new URL('http://site.example/admin/media/upload');

  it('a header check finds the cookie a load minted when both are handed platform', () => {
    const cookies = jar();
    const token = issueCsrfToken({ url, cookies, platform });
    const request = req('http://site.example/admin/media/upload', {
      method: 'POST',
      headers: { 'x-cairn-csrf': token },
    });
    expect(validateCsrfHeader({ url, request, cookies, platform })).toBe(true);
  });

  it('a reader that omits platform misses the cookie the writer minted under PUBLIC_ORIGIN', () => {
    const cookies = jar();
    const token = issueCsrfToken({ url, cookies, platform });
    const request = req('http://site.example/admin/media/upload', {
      method: 'POST',
      headers: { 'x-cairn-csrf': token },
    });
    // No platform: this reader resolves the cookie name from event.url.protocol (http, so the
    // non-prefixed name) and never sees the __Host-prefixed cookie the writer set.
    expect(validateCsrfHeader({ url, request, cookies })).toBe(false);
  });
});

describe('validateCsrfToken', () => {
  const ev = (cookie: string | undefined, body: string | undefined) =>
    ({
      url: new URL('https://x.dev/admin/login'),
      cookies: jar(cookie !== undefined ? { '__Host-cairn_csrf': cookie } : {}),
      request:
        body !== undefined
          ? req('https://x.dev/admin/login', {
              method: 'POST',
              headers: { 'content-type': 'application/x-www-form-urlencoded' },
              body,
            })
          : req('https://x.dev/admin/login', { method: 'POST' }),
    }) as never;

  it('passes when the field matches the cookie', async () => {
    expect(await validateCsrfToken(ev('TOK', 'csrf=TOK&email=a@b.c'))).toBe(true);
  });

  it('fails on a mismatch, a missing cookie, or a missing field', async () => {
    expect(await validateCsrfToken(ev('TOK', 'csrf=OTHER'))).toBe(false);
    expect(await validateCsrfToken(ev(undefined, 'csrf=TOK'))).toBe(false);
    expect(await validateCsrfToken(ev('TOK', 'email=a@b.c'))).toBe(false);
  });

  it('leaves the original body readable by the action', async () => {
    const event = ev('TOK', 'csrf=TOK&email=a@b.c');
    await validateCsrfToken(event);
    const form = await (event as { request: Request }).request.formData();
    expect(form.get('email')).toBe('a@b.c');
  });
});
