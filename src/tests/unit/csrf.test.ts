import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isUnsafeFormRequest,
  originMatches,
  issueCsrfToken,
  validateCsrfHeader,
  validateCsrfToken,
  csrfSecure,
  csrfHeaderVerdict,
  csrfTokenVerdict,
  csrfFieldVerdict,
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
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies, platform: undefined });
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(cookies.sets[0].name).toBe('__Host-cairn_csrf');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    expect(cookies.sets[0].opts.maxAge).toBe(SESSION_MAX_AGE);
  });

  it('re-anchors a present cookie with a fresh maxAge and the unchanged value (no rotate-on-confirm)', () => {
    const cookies = jar({ '__Host-cairn_csrf': 'EXISTING' });
    const token = issueCsrfToken({ url: new URL('https://x.dev/admin/login'), cookies, platform: undefined });
    expect(token).toBe('EXISTING');
    expect(cookies.sets).toHaveLength(1);
    expect(cookies.sets[0].value).toBe('EXISTING');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    expect(cookies.sets[0].opts.maxAge).toBe(SESSION_MAX_AGE);
  });

  it('drops the prefix and Secure on http', () => {
    const cookies = jar();
    issueCsrfToken({ url: new URL('http://localhost/admin/login'), cookies, platform: undefined });
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

  it('resolves Secure on an https request with no PUBLIC_ORIGIN configured', () => {
    const event = { url: new URL('https://site.example/admin/login'), platform: { env: {} } };
    expect(csrfSecure(event)).toBe(true);
  });

  it('resolves Secure on an https request whose PUBLIC_ORIGIN does not parse', () => {
    const event = {
      url: new URL('https://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'not a url' } },
    };
    expect(csrfSecure(event)).toBe(true);
  });

  it('falls back to non-Secure for an http non-local request with no usable PUBLIC_ORIGIN', () => {
    const absent = { url: new URL('http://site.example/admin/login'), platform: { env: {} } };
    const unparseable = {
      url: new URL('http://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'not a url' } },
    };
    expect(csrfSecure(absent)).toBe(false);
    expect(csrfSecure(unparseable)).toBe(false);
  });

  // The monotonic rule: a real https request is Secure whatever PUBLIC_ORIGIN says. A leftover
  // dev value in a deployed site's PUBLIC_ORIGIN (env.ts's requireOrigin tolerates it) used to
  // mint a bare, non-Secure, thirty-day cairn_csrf on production https, which a sibling
  // subdomain can then overwrite and defeat the double-submit compare.
  it('never downgrades an https request when PUBLIC_ORIGIN carries a leftover http dev value', () => {
    const event = {
      url: new URL('https://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'http://localhost:8788' } },
    };
    expect(csrfSecure(event)).toBe(true);
  });

  it('mints the __Host- Secure cookie on an https request under an http PUBLIC_ORIGIN', () => {
    const cookies = jar();
    issueCsrfToken({
      url: new URL('https://site.example/admin/login'),
      cookies,
      platform: { env: { PUBLIC_ORIGIN: 'http://localhost:8788' } },
    });
    expect(cookies.sets[0].name).toBe('__Host-cairn_csrf');
    expect(cookies.sets[0].opts.secure).toBe(true);
  });

  it('keeps the bare dev cookie for a local http request, PUBLIC_ORIGIN notwithstanding', () => {
    const event = {
      url: new URL('http://127.0.0.1:8788/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'https://site.example' } },
    };
    expect(csrfSecure(event)).toBe(false);
  });
});

// The Task 9 reconciliation: `csrfSecure` now consumes the shared `readPublicOrigin` reader
// (dev-flag.ts) at platform depth only, so a `process.env.PUBLIC_ORIGIN` the runner's own shell
// happens to export must never leak into this function's answer. Every case stubs
// `PUBLIC_ORIGIN` on `process.env` so the suite stays deterministic regardless of the runner's
// shell, and unstubs it afterward so the stub cannot leak into a sibling test file.
describe('csrfSecure (platform-only depth; process.env must never leak in)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('platform-set PUBLIC_ORIGIN still decides, unchanged, with process.env also set', () => {
    vi.stubEnv('PUBLIC_ORIGIN', 'http://process-should-be-ignored.example');
    const event = {
      url: new URL('http://site.example/admin/login'),
      platform: { env: { PUBLIC_ORIGIN: 'https://site.example' } },
    };
    expect(csrfSecure(event)).toBe(true);
  });

  it('a process.env-only PUBLIC_ORIGIN (no platform value) does not flip csrfSecure', () => {
    vi.stubEnv('PUBLIC_ORIGIN', 'https://site.example');
    const event = {
      url: new URL('http://site.example/admin/login'),
      platform: { env: {} },
    };
    // Platform depth only: with no platform-supplied origin, csrfSecure falls through to its own
    // non-Secure default rather than consulting process.env, even though a bare `readPublicOrigin`
    // dual read would have found the stubbed value.
    expect(csrfSecure(event)).toBe(false);
  });

  it('the https short-circuit is unchanged with process.env set to an http origin', () => {
    vi.stubEnv('PUBLIC_ORIGIN', 'http://process-should-be-ignored.example');
    const event = {
      url: new URL('https://site.example/admin/login'),
      platform: { env: {} },
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

  it('a reader passing platform: undefined resolves the fallback name, not the writer\'s', () => {
    const cookies = jar();
    const token = issueCsrfToken({ url, cookies, platform });
    const request = req('http://site.example/admin/media/upload', {
      method: 'POST',
      headers: { 'x-cairn-csrf': token },
    });
    // `platform` is required but nullable, so a call site can no longer OMIT it (that is a compile
    // error now, which is what closes the silent divergence). Explicit `undefined` stays legal and
    // pins the fallback rule: with no PUBLIC_ORIGIN to read, this http request resolves the bare
    // cookie name and never sees the __Host-prefixed cookie the writer set.
    expect(validateCsrfHeader({ url, request, cookies, platform: undefined })).toBe(false);
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

// The discriminating verdicts guard.ts and admin-action.ts route through for their rejection
// records (the CSRF hardening pass, Task 3): one test per CsrfRejectionDetail value where each
// verdict function can reach it.
describe('csrfHeaderVerdict', () => {
  const ev = (cookie: string | undefined, header: string | undefined) =>
    ({
      url: new URL('https://x.dev/admin/upload'),
      cookies: jar(cookie !== undefined ? { '__Host-cairn_csrf': cookie } : {}),
      request: req('https://x.dev/admin/upload', {
        method: 'POST',
        headers: header !== undefined ? { 'x-cairn-csrf': header } : {},
      }),
    }) as never;

  it('passes when the header matches the cookie', () => {
    expect(csrfHeaderVerdict(ev('TOK', 'TOK'))).toEqual({ ok: true });
  });

  it('reads no-cookie when the double-submit cookie is absent', () => {
    expect(csrfHeaderVerdict(ev(undefined, 'TOK'))).toEqual({ ok: false, detail: 'no-cookie' });
  });

  it('reads no-witness when the header was never sent', () => {
    expect(csrfHeaderVerdict(ev('TOK', undefined))).toEqual({ ok: false, detail: 'no-witness' });
  });

  it('reads mismatch when the header was sent but does not match the cookie', () => {
    expect(csrfHeaderVerdict(ev('TOK', 'WRONG'))).toEqual({ ok: false, detail: 'mismatch' });
  });
});

describe('csrfTokenVerdict', () => {
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
    expect(await csrfTokenVerdict(ev('TOK', 'csrf=TOK'))).toEqual({ ok: true });
  });

  it('reads no-cookie when the double-submit cookie is absent', async () => {
    expect(await csrfTokenVerdict(ev(undefined, 'csrf=TOK'))).toEqual({ ok: false, detail: 'no-cookie' });
  });

  it('reads no-witness when the csrf field was never submitted', async () => {
    expect(await csrfTokenVerdict(ev('TOK', 'email=a@b.c'))).toEqual({ ok: false, detail: 'no-witness' });
  });

  it('reads mismatch when the field was submitted but does not match the cookie', async () => {
    expect(await csrfTokenVerdict(ev('TOK', 'csrf=OTHER'))).toEqual({ ok: false, detail: 'mismatch' });
  });

  it('reads unparseable-body when the body cannot be read as form data', async () => {
    const event = {
      url: new URL('https://x.dev/admin/login'),
      cookies: jar({ '__Host-cairn_csrf': 'TOK' }),
      request: req('https://x.dev/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=z' },
        body: 'not actually multipart',
      }),
    } as never;
    expect(await csrfTokenVerdict(event)).toEqual({ ok: false, detail: 'unparseable-body' });
  });
});

describe('csrfFieldVerdict (an already-parsed form, the shape admin-action.ts uses)', () => {
  const form = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };

  it('passes when the field matches the cookie', () => {
    expect(csrfFieldVerdict('TOK', form({ csrf: 'TOK' }))).toEqual({ ok: true });
  });

  it('reads no-cookie when the cookie is absent', () => {
    expect(csrfFieldVerdict(undefined, form({ csrf: 'TOK' }))).toEqual({ ok: false, detail: 'no-cookie' });
  });

  it('reads no-witness when the form carries no csrf field', () => {
    expect(csrfFieldVerdict('TOK', form({ email: 'a@b.c' }))).toEqual({ ok: false, detail: 'no-witness' });
  });

  it('reads mismatch when the field does not match the cookie', () => {
    expect(csrfFieldVerdict('TOK', form({ csrf: 'OTHER' }))).toEqual({ ok: false, detail: 'mismatch' });
  });
});
