import { describe, it, expect } from 'vitest';
import {
  isUnsafeFormRequest,
  originMatches,
  tokensMatch,
  issueCsrfToken,
  validateCsrfToken,
} from '../../lib/sveltekit/csrf.js';
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

describe('tokensMatch', () => {
  it('is true only for equal non-empty strings', () => {
    expect(tokensMatch('abc', 'abc')).toBe(true);
    expect(tokensMatch('abc', 'abd')).toBe(false);
    expect(tokensMatch('abc', 'ab')).toBe(false);
    expect(tokensMatch('', '')).toBe(false);
  });
});

describe('issueCsrfToken', () => {
  it('mints and sets a __Host- cookie when absent', () => {
    const cookies = jar();
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(cookies.sets[0].name).toBe('__Host-cairn_csrf');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
    expect(cookies.sets[0].opts.maxAge).toBeUndefined();
  });

  it('reuses a present cookie and sets nothing', () => {
    const cookies = jar({ '__Host-cairn_csrf': 'EXISTING' });
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies });
    expect(token).toBe('EXISTING');
    expect(cookies.sets).toHaveLength(0);
  });

  it('drops the prefix and Secure on http', () => {
    const cookies = jar();
    issueCsrfToken({ url: new URL('http://localhost/admin/login'), cookies });
    expect(cookies.sets[0].name).toBe('cairn_csrf');
    expect(cookies.sets[0].opts.secure).toBe(false);
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
