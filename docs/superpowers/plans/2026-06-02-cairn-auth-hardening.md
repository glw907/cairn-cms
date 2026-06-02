# cairn Auth-Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the known hygiene gaps in cairn's self-owned auth and the GitHub App commit path, adding no new Cloudflare binding and no per-site setup.

**Architecture:** Six small units across the auth and GitHub layers. The session cookie takes the `__Host-` prefix when it is Secure. The guard attaches a baseline of security headers to every admin response. The installation token is memoized per isolate. The magic-link request endpoint gains a per-email cooldown and backgrounds its email send through `waitUntil`. Expired auth rows are swept lazily at write time. The stale admin smoke doc is rewritten for the self-owned model.

**Tech Stack:** TypeScript, SvelteKit handlers and `Handle` hook, Web Crypto, D1 via prepared statements, vitest (`unit` project in node, `integration` project in workerd against a real miniflare D1).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-auth-hardening-design.md` (approved).

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This pass is additive or internal across the package, and a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`).
- Targeted unit test: `npx vitest run --project unit src/tests/unit/<file>.test.ts`. Targeted integration test: `npx vitest run --project integration src/tests/integration/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- Do NOT run `npm install` from inside the workspace member; it drifts the root lock.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` unless the showcase deps are installed. The svelte-check scan itself is 0/0 either way. If the showcase config import is the only failure, the scan result (0 errors 0 warnings) is the gate.

## Reference values (verified against the live tree)

- `src/lib/auth/crypto.ts`: `COOKIE_NAME = 'cairn_session'` (line 6); `TOKEN_TTL_MS` (line 9); `SESSION_TTL_MS` (line 12).
- `src/lib/sveltekit/auth-routes.ts`: `requestAction` (lines 31-47); `confirmAction` sets the cookie (lines 86-93) with `secure: event.url.protocol === 'https:'`; `logoutAction` reads and clears the cookie (lines 100-102); `confirmLoad` sets `Referrer-Policy: no-referrer` (line 61).
- `src/lib/sveltekit/guard.ts`: `createAuthGuard` (lines 20-33) reads the cookie at line 27 and returns `resolve(event)` at lines 24 and 31; `isAdminPath`/`isPublicAdminPath` (lines 11-17).
- `src/lib/sveltekit/types.ts`: `RequestContext.platform` is `{ env?: AuthEnv }` (line 24).
- `src/lib/auth/store.ts`: `issueToken` (lines 23-36) runs a `db.batch` of a DELETE then an INSERT; `createSession` (lines 51-62) runs a single INSERT.
- `src/lib/github/signing.ts`: `installationToken(creds)` (lines 67-80) returns `Promise<string>` and discards the API `expires_at`.
- `src/lib/sveltekit/content-routes.ts` (lines 98-99) and `src/lib/sveltekit/nav-routes.ts` (lines 47-48): `mintToken = deps.mintToken ?? ((env) => installationToken(appCredentials(runtime.backend, env)))`.
- `src/lib/env.ts`: `requireOrigin` (lines 11-17) returns the configured origin or throws when unset.
- `COOKIE_NAME` importers, all updated in Task 1: `crypto.ts`, `guard.ts`, `auth-routes.ts`, `src/tests/integration/auth-guard.test.ts`, `src/tests/integration/auth-confirm.test.ts`.
- Test harness `src/tests/integration/_auth-harness.ts`: `makeCookies` (lines 22-30, discards set options), `makeEvent` (lines 33-51, builds `platform` with no `context`).

---

## Task 1: `__Host-` session cookie

**Files:**
- Modify: `src/lib/auth/crypto.ts`
- Modify: `src/lib/sveltekit/guard.ts`
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Modify: `src/tests/integration/_auth-harness.ts`
- Modify: `src/tests/integration/auth-confirm.test.ts`
- Modify: `src/tests/integration/auth-guard.test.ts`

The cookie name is derived from the protocol. On https it is `__Host-cairn_session` with `Secure` always set; on local http it is `cairn_session`. `COOKIE_NAME` is replaced by a `sessionCookieName(secure)` function, and every importer derives the name from the request protocol.

- [ ] **Step 1: Add the options-recording cookie jar to the harness**

In `src/tests/integration/_auth-harness.ts`, add `CookieSetOptions` to the type import on line 3 and append a recording jar after `makeCookies` (after line 30):

```ts
/** Like makeCookies, but records every set call's name and options, for cookie-attribute asserts. */
export function makeRecordingCookies(
  initial: Record<string, string> = {},
): CookieJar & { sets: { name: string; value: string; opts: CookieSetOptions }[] } {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  return {
    sets,
    get: (name) => jar.get(name),
    set: (name, value, opts) => {
      jar.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name) => void jar.delete(name),
  };
}
```

Change the type import on line 3 from `import type { CookieJar } from '../../lib/sveltekit/types.js';` to:

```ts
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';
```

- [ ] **Step 2: Write the failing cookie tests**

Append this describe block to `src/tests/integration/auth-confirm.test.ts`:

```ts
describe('session cookie prefix and attributes (Unit 1)', () => {
  it('sets a __Host- prefixed Secure cookie on https', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeRecordingCookies();
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(cookies.sets).toHaveLength(1);
    expect(cookies.sets[0].name).toBe('__Host-cairn_session');
    expect(cookies.sets[0].opts).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('sets a plain unprefixed cookie on local http', async () => {
    const token = await liveToken('ed2@x.dev');
    const cookies = makeRecordingCookies();
    await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'http://localhost/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(cookies.sets[0].name).toBe('cairn_session');
    expect(cookies.sets[0].opts.secure).toBe(false);
  });
});
```

Add `makeRecordingCookies` to the harness import on line 3 of `auth-confirm.test.ts`, and change the existing `COOKIE_NAME` import on line 5 to `sessionCookieName`:

```ts
import { seedEditor, makeEvent, makeCookies, makeRecordingCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, sessionCookieName } from '../../lib/auth/crypto.js';
```

Change the existing assertion on line 42 from `expect(cookies.get(COOKIE_NAME)).toBeTruthy();` to:

```ts
    expect(cookies.get(sessionCookieName(true))).toBeTruthy();
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run --project integration src/tests/integration/auth-confirm.test.ts`
Expected: a compile error, since `sessionCookieName` is not exported yet. That is the right failure; it drives Step 4.

- [ ] **Step 4: Replace the cookie-name constant with a derived name**

In `src/lib/auth/crypto.ts`, replace the `COOKIE_NAME` export (lines 5-6) with:

```ts
/** The base session cookie name, prefixed with __Host- when the cookie is Secure. */
const COOKIE_BASE = 'cairn_session';

/**
 * The session cookie name. On https the cookie is Secure and takes the __Host- prefix, which
 * binds it to the origin (the browser enforces Secure, Path=/, and no Domain). On local http
 * dev the prefix is dropped, since __Host- requires Secure and the dev cookie cannot set it.
 */
export function sessionCookieName(secure: boolean): string {
  return secure ? `__Host-${COOKIE_BASE}` : COOKIE_BASE;
}
```

- [ ] **Step 5: Derive the name in the guard**

In `src/lib/sveltekit/guard.ts`, change the import on line 6 from `import { COOKIE_NAME } from '../auth/crypto.js';` to:

```ts
import { sessionCookieName } from '../auth/crypto.js';
```

Change the cookie read on line 27 from `const id = event.cookies.get(COOKIE_NAME);` to:

```ts
    const id = event.cookies.get(sessionCookieName(event.url.protocol === 'https:'));
```

- [ ] **Step 6: Derive the name when setting and clearing the cookie**

In `src/lib/sveltekit/auth-routes.ts`, change the crypto import (lines 6-13) so it pulls `sessionCookieName` in place of `COOKIE_NAME`:

```ts
import {
  generateToken,
  generateSessionId,
  hashToken,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
  sessionCookieName,
} from '../auth/crypto.js';
```

Replace the cookie set in `confirmAction` (lines 86-93) with:

```ts
    const secure = event.url.protocol === 'https:';
    event.cookies.set(sessionCookieName(secure), id, {
      path: '/',
      httpOnly: true,
      // __Host- needs Secure unconditionally on https; local http dev drops the prefix and Secure.
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
```

Replace the cookie read and clear in `logoutAction` (lines 100-102) with:

```ts
    const name = sessionCookieName(event.url.protocol === 'https:');
    const id = event.cookies.get(name);
    if (id) await deleteSession(db, id);
    event.cookies.delete(name, { path: '/' });
```

- [ ] **Step 7: Update the guard test to the derived name**

In `src/tests/integration/auth-guard.test.ts`, change the import on line 6 from `import { COOKIE_NAME } from '../../lib/auth/crypto.js';` to:

```ts
import { sessionCookieName } from '../../lib/auth/crypto.js';
```

Change the cookie seed on line 32 from `return makeCookies({ [COOKIE_NAME]: 'sid-ok' });` to:

```ts
  return makeCookies({ [sessionCookieName(true)]: 'sid-ok' });
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run --project integration src/tests/integration/auth-confirm.test.ts src/tests/integration/auth-guard.test.ts`
Expected: PASS, the two new cookie tests plus every existing confirm and guard test green.

- [ ] **Step 9: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/auth/crypto.ts src/lib/sveltekit/guard.ts src/lib/sveltekit/auth-routes.ts src/tests/integration/_auth-harness.ts src/tests/integration/auth-confirm.test.ts src/tests/integration/auth-guard.test.ts
git commit -m "feat(auth): prefix the session cookie with __Host- on https

The session cookie name is derived from the protocol: __Host-cairn_session with
Secure on https, plain cairn_session on local http dev where Secure cannot be
set. The prefix binds the cookie to the origin, since the browser then enforces
Secure, Path=/, and no Domain. A site upgrading logs its editors out once, since
the cookie name changes, so they click a fresh magic link.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `/admin` security headers

**Files:**
- Modify: `src/lib/sveltekit/guard.ts`
- Modify: `src/tests/integration/auth-guard.test.ts`

The guard wraps `resolve(event)` and attaches five enforcing headers to every admin response, including the one CSP directive (`frame-ancestors 'none'`) that carries no nonce cost. The confirm page keeps its own `Referrer-Policy` as defense-in-depth.

- [ ] **Step 1: Write the failing header tests**

Append this describe block to `src/tests/integration/auth-guard.test.ts` (it reuses `event`, `seedSession`, and `handle`):

```ts
describe('admin security headers (Unit 2)', () => {
  it('attaches the baseline headers to a gated admin response', async () => {
    const cookies = await seedSession('own@x.dev');
    const res = await handle({ event: event('/admin', cookies), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
    expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('attaches the headers to a public admin page too', async () => {
    const res = await handle({ event: event('/admin/login'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('leaves a non-admin response untouched', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => new Response('ok') });
    expect(res.headers.get('X-Frame-Options')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project integration src/tests/integration/auth-guard.test.ts`
Expected: FAIL on the two header-presence tests, since the guard sets no headers today. The non-admin test passes already.

- [ ] **Step 3: Restructure the guard to attach headers on admin paths**

In `src/lib/sveltekit/guard.ts`, replace the whole `createAuthGuard` function (lines 19-33) with:

```ts
/** Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 *  design. frame-ancestors is the modern clickjacking control and the one CSP directive included. */
function applySecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/** The SvelteKit `Handle` that guards `/admin/**` and hardens admin responses. */
export function createAuthGuard() {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;
    if (!isAdminPath(pathname)) return resolve(event);
    if (!isPublicAdminPath(pathname)) {
      const env = event.platform?.env ?? {};
      const id = event.cookies.get(sessionCookieName(event.url.protocol === 'https:'));
      const editor = id && env.AUTH_DB ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
      if (!editor) throw redirect(303, '/admin/login');
      event.locals.editor = editor;
    }
    const response = await resolve(event);
    applySecurityHeaders(response.headers);
    return response;
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project integration src/tests/integration/auth-guard.test.ts`
Expected: PASS, the three new tests and every existing guard test green. The existing "admits a valid session" test still holds, since the guard returns the same response object after setting headers on it.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/sveltekit/guard.ts src/tests/integration/auth-guard.test.ts
git commit -m "feat(auth): set baseline security headers on admin responses

The guard wraps resolve and attaches nosniff, X-Frame-Options DENY with a
matching frame-ancestors none, Referrer-Policy no-referrer, HSTS, and a
conservative Permissions-Policy to every admin response, gated and public alike.
frame-ancestors is the one CSP directive included, since it is the modern
clickjacking control and carries none of the nonce cost a full CSP would. A
non-admin response passes through untouched.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: install-token in-isolate memo

**Files:**
- Modify: `src/lib/github/signing.ts`
- Modify: `src/lib/sveltekit/content-routes.ts`
- Modify: `src/lib/sveltekit/nav-routes.ts`
- Create: `src/tests/unit/github-token-cache.test.ts`

A module-level cache memoizes the minted installation token per `installationId` for most of its one-hour life, so a warm isolate reuses it. A conservative fixed TTL under the documented one-hour lifetime avoids parsing the API response and keeps `installationToken` unchanged.

- [ ] **Step 1: Write the failing cache tests**

Create `src/tests/unit/github-token-cache.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { createInstallationTokenCache } from '../../lib/github/signing.js';

const creds = { appId: '1', installationId: '2', privateKeyB64: 'x' };

describe('installation token cache (Unit 3)', () => {
  it('mints once and reuses the token within the TTL', async () => {
    const mint = vi.fn(async () => 'ghs_token');
    let t = 1000;
    const get = createInstallationTokenCache(mint, () => t, 55 * 60 * 1000);
    expect(await get(creds)).toBe('ghs_token');
    t += 60 * 1000; // one minute later, inside the TTL
    expect(await get(creds)).toBe('ghs_token');
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('re-mints once the TTL has passed', async () => {
    let n = 0;
    const mint = vi.fn(async () => `ghs_${n++}`);
    let t = 1000;
    const get = createInstallationTokenCache(mint, () => t, 55 * 60 * 1000);
    expect(await get(creds)).toBe('ghs_0');
    t += 56 * 60 * 1000; // past the 55-minute TTL
    expect(await get(creds)).toBe('ghs_1');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('keys the cache by installationId', async () => {
    const mint = vi.fn(async (c: typeof creds) => `ghs_${c.installationId}`);
    const get = createInstallationTokenCache(mint, () => 1000);
    expect(await get({ ...creds, installationId: 'a' })).toBe('ghs_a');
    expect(await get({ ...creds, installationId: 'b' })).toBe('ghs_b');
    expect(mint).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/github-token-cache.test.ts`
Expected: a compile error, since `createInstallationTokenCache` is not exported yet.

- [ ] **Step 3: Add the cache to the signing module**

In `src/lib/github/signing.ts`, append after `installationToken` (after line 80):

```ts
interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Build an installation-token cache. A module-global instance memoizes the minted token per
 * installation for most of its one-hour life, so a warm Worker isolate reuses it across requests
 * instead of re-signing and re-calling GitHub on every list and commit. A cold isolate re-mints,
 * which is always safe. This mirrors the default of @octokit/auth-app, which caches installation
 * tokens in memory and returns them until expiry. The TTL stays under GitHub's documented one-hour
 * lifetime, so a fixed margin avoids parsing the API expiry. `mint` and `now` are injected so the
 * cache is testable with no network call and no real clock.
 */
export function createInstallationTokenCache(
  mint: (creds: AppCredentials) => Promise<string> = installationToken,
  now: () => number = () => Date.now(),
  ttlMs = 55 * 60 * 1000,
): (creds: AppCredentials) => Promise<string> {
  const cache = new Map<string, CachedToken>();
  return async function get(creds: AppCredentials): Promise<string> {
    const hit = cache.get(creds.installationId);
    if (hit && hit.expiresAt > now()) return hit.token;
    const token = await mint(creds);
    cache.set(creds.installationId, { token, expiresAt: now() + ttlMs });
    return token;
  };
}

/** The shared installation-token cache, one instance per Worker isolate. */
export const cachedInstallationToken = createInstallationTokenCache();
```

- [ ] **Step 4: Wire the route closures to the cache**

In `src/lib/sveltekit/content-routes.ts`, change the signing import so it pulls `cachedInstallationToken` (find the existing `import { installationToken } from '../github/signing.js';` and change the imported name to `cachedInstallationToken`), then change the `mintToken` default (lines 98-99) to:

```ts
  const mintToken =
    deps.mintToken ?? ((env: GithubKeyEnv) => cachedInstallationToken(appCredentials(runtime.backend, env)));
```

Make the identical two changes in `src/lib/sveltekit/nav-routes.ts` (the import and the `mintToken` default at lines 47-48).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/github-token-cache.test.ts`
Expected: PASS, all three cache tests green. The existing `github-signing.test.ts` stays green, since `installationToken` is unchanged.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/github/signing.ts src/lib/sveltekit/content-routes.ts src/lib/sveltekit/nav-routes.ts src/tests/unit/github-token-cache.test.ts
git commit -m "feat(github): memoize the installation token per isolate

The installation token was minted fresh on every list and commit. A module-level
cache keyed by installationId now reuses it for 55 minutes, under GitHub's
one-hour lifetime, so a warm Worker isolate stops re-signing and re-calling
GitHub. A cold isolate re-mints, which is always safe. This mirrors the
@octokit/auth-app default and adds no binding. The mint and clock are injected so
the cache tests run with no network and no real time.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: magic-link request cooldown and waitUntil

**Files:**
- Modify: `src/lib/auth/crypto.ts`
- Modify: `src/lib/auth/store.ts`
- Modify: `src/lib/sveltekit/types.ts`
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Modify: `src/tests/integration/_auth-harness.ts`
- Modify: `src/tests/integration/auth-request.test.ts`

`requestAction` gains a per-email cooldown that suppresses a reissue and send when a token for that email was created within the window, and it backgrounds the send through `platform.context.waitUntil` with an inline fallback. The non-leak response is unchanged.

- [ ] **Step 1: Widen the event type and add the harness waitUntil hook**

In `src/lib/sveltekit/types.ts`, change the `platform` line (line 24) to:

```ts
  platform?: { env?: AuthEnv; context?: { waitUntil(promise: Promise<unknown>): void } };
```

In `src/tests/integration/_auth-harness.ts`, change `makeEvent` (lines 33-51) so it accepts and threads an optional `waitUntil`:

```ts
export function makeEvent(input: {
  url: string;
  form?: Record<string, string>;
  cookies?: CookieJar;
  editor?: Editor | null;
  waitUntil?: (promise: Promise<unknown>) => void;
}) {
  const { url, form, cookies = makeCookies(), editor = null, waitUntil } = input;
  const request = form
    ? new Request(url, { method: 'POST', body: new URLSearchParams(form) })
    : new Request(url);
  return {
    url: new URL(url),
    request,
    cookies,
    locals: { editor },
    platform: {
      env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' },
      context: waitUntil ? { waitUntil } : undefined,
    },
    setHeaders: () => {},
  };
}
```

- [ ] **Step 2: Write the failing cooldown and waitUntil tests**

Append this describe block to `src/tests/integration/auth-request.test.ts` (it reuses `routesWithSink`, `seedEditor`, `makeEvent`, `countRows`, and `db`):

```ts
describe('request hardening (Unit 4)', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('suppresses a second request inside the cooldown window', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('sends again once the cooldown has passed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { issueToken } = await import('../../lib/auth/store.js');
    const { hashToken, generateToken } = await import('../../lib/auth/crypto.js');
    const old = Date.now() - 61_000; // older than the 60s cooldown, still inside the 10-min TTL
    await issueToken(db, 'ed@x.dev', await hashToken(generateToken()), old + 600_000, old);
    const { routes, sent } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('backgrounds the send through waitUntil when present', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const promises: Promise<unknown>[] = [];
    const result = await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, waitUntil: (p) => promises.push(p) }),
    );
    expect(result).toEqual({ sent: true });
    expect(promises).toHaveLength(1);
    await Promise.all(promises);
    expect(sent).toHaveLength(1);
  });
});
```

- [ ] **Step 2b: Run the tests to verify they fail**

Run: `npx vitest run --project integration src/tests/integration/auth-request.test.ts`
Expected: FAIL. Today every call issues and sends, so the cooldown test sees two sends, and `waitUntil` is never called, so the third test's `promises` stays empty.

- [ ] **Step 3: Add the cooldown constant and the store query**

In `src/lib/auth/crypto.ts`, add after `SESSION_TTL_MS` (after line 12):

```ts
/** A magic link is sent at most once per email per minute, to throttle inbox flooding. */
export const SEND_COOLDOWN_MS = 60 * 1000;
```

In `src/lib/auth/store.ts`, add after `issueToken` (after line 36):

```ts
/** True when a magic-link token for this email was issued at or after `since`, for the send cooldown. */
export async function recentlyIssued(db: D1Database, email: string, since: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS one FROM magic_token WHERE email = ? AND created_at >= ? LIMIT 1')
    .bind(email, since)
    .first<{ one: number }>();
  return row != null;
}
```

- [ ] **Step 4: Apply the cooldown and waitUntil in requestAction**

In `src/lib/sveltekit/auth-routes.ts`, add `SEND_COOLDOWN_MS` to the crypto import block (the same block edited in Task 1) and `recentlyIssued` to the store import on line 14:

```ts
import { findEditor, issueToken, consumeToken, createSession, deleteSession, recentlyIssued } from '../auth/store.js';
```

Replace the body of `requestAction` (lines 38-46, the `const editor` line through the closing brace before `return`) with:

```ts
    const editor = email ? await findEditor(db, email) : null;
    if (editor) {
      const now = Date.now();
      // Per-email cooldown: skip the reissue and send when a token for this email was issued within
      // the window, so the endpoint cannot flood an editor's inbox. The response is unchanged, so
      // the non-leak property holds.
      if (!(await recentlyIssued(db, email, now - SEND_COOLDOWN_MS))) {
        const token = generateToken();
        await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);
        const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
        // The token row is the security-critical write the email depends on, so it is awaited. The
        // send is a post-response side effect, handed to waitUntil so a slow email provider does not
        // hold the response. An absent waitUntil (local dev, tests) falls back to await. A send
        // failure is logged so observability survives a backgrounded send.
        const sending = send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link })).catch(
          (err) => console.error('cairn: magic-link send failed', err),
        );
        const ctx = event.platform?.context;
        if (ctx?.waitUntil) ctx.waitUntil(sending);
        else await sending;
      }
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project integration src/tests/integration/auth-request.test.ts`
Expected: PASS, the three new tests plus the two existing request tests green (the first request in each existing test still sends, since no prior token exists).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/auth/crypto.ts src/lib/auth/store.ts src/lib/sveltekit/types.ts src/lib/sveltekit/auth-routes.ts src/tests/integration/_auth-harness.ts src/tests/integration/auth-request.test.ts
git commit -m "feat(auth): cooldown and background the magic-link send

requestAction now skips the reissue and send when a token for the email was
issued within the last minute, so the endpoint cannot flood an editor's inbox;
the response stays identical, so it still does not leak membership. The send
moves off the response path through platform.context.waitUntil, with an inline
await fallback for local dev and tests and a logged failure, so a slow email
provider no longer holds the response. The token-issue write is still awaited.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: lazy expired-row cleanup

**Files:**
- Modify: `src/lib/auth/store.ts`
- Create: `src/tests/integration/auth-cleanup.test.ts`

Expired rows are swept at write time, with no Cron Trigger. Token issue sweeps expired tokens, and session creation sweeps expired sessions.

- [ ] **Step 1: Write the failing cleanup tests**

Create `src/tests/integration/auth-cleanup.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { countRows } from './_auth-harness.js';
import { issueToken, createSession } from '../../lib/auth/store.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM editor'),
  ]);
});

describe('lazy expired-row cleanup (Unit 6)', () => {
  it('sweeps an expired token for another email when a token is issued', async () => {
    const now = Date.now();
    await db
      .prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind('stale-hash', 'old@x.dev', now - 1, now - 10_000)
      .run();
    await issueToken(db, 'new@x.dev', 'fresh-hash', now + 600_000, now);
    expect(await countRows('magic_token')).toBe(1);
  });

  it('sweeps an expired session when a session is created', async () => {
    const now = Date.now();
    await db
      .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind('stale-sid', 'old@x.dev', now - 1, now - 10_000)
      .run();
    await createSession(db, 'fresh-sid', 'new@x.dev', now + 600_000, now);
    expect(await countRows('session')).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project integration src/tests/integration/auth-cleanup.test.ts`
Expected: FAIL. Today nothing sweeps, so each table holds two rows and `countRows` returns 2.

- [ ] **Step 3: Sweep expired rows on write**

In `src/lib/auth/store.ts`, change the DELETE in `issueToken` (line 31) so it also sweeps expired tokens:

```ts
    // Replace this email's prior token, and sweep any expired token while here (no cron needed).
    db.prepare('DELETE FROM magic_token WHERE email = ? OR expires_at <= ?').bind(email, now),
```

Replace the body of `createSession` (lines 58-61, the single `await db.prepare(...).run();`) with a batch that sweeps first:

```ts
  await db.batch([
    // Sweep expired sessions on login, so abandoned rows do not accumulate (no cron needed).
    db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, email, expiresAt, now),
  ]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project integration src/tests/integration/auth-cleanup.test.ts`
Expected: PASS, both cleanup tests green. The existing confirm and request tests stay green, since fresh tokens and sessions are not swept.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/auth/store.ts src/tests/integration/auth-cleanup.test.ts
git commit -m "feat(auth): sweep expired auth rows at write time

Nothing pruned expired magic_token and session rows, so abandoned rows
accumulated in AUTH_DB. Token issue now also deletes expired tokens, and session
creation deletes expired sessions, both as part of the existing write. This is a
lazy opportunistic sweep with no Cron Trigger and no new binding, matching the
no-new-setup stance.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: require an https `PUBLIC_ORIGIN` in production

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/tests/unit/env.test.ts`

`requireOrigin` rejects a non-https origin unless it is local, since the magic-link origin and the `__Host-` cookie depend on https.

- [ ] **Step 1: Write the failing tests**

Append to the `requireOrigin` describe in `src/tests/unit/env.test.ts` (after line 16, inside the describe):

```ts
  it('allows http on localhost for dev', () => {
    expect(requireOrigin({ PUBLIC_ORIGIN: 'http://localhost:5173' })).toBe('http://localhost:5173');
  });

  it('throws on a non-https origin that is not local', () => {
    expect(() => requireOrigin({ PUBLIC_ORIGIN: 'http://ecnordic.ski' })).toThrow(/https/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/env.test.ts`
Expected: FAIL on the non-https test, since `requireOrigin` accepts any non-empty string today. The localhost test passes already.

- [ ] **Step 3: Add the https guard**

In `src/lib/env.ts`, replace the body of `requireOrigin` (lines 12-16) with:

```ts
  const origin = env.PUBLIC_ORIGIN;
  if (!origin) {
    throw new Error('PUBLIC_ORIGIN is not configured');
  }
  // The magic-link origin must be https in production so the link and the __Host- cookie are
  // origin-bound. http is allowed only for local dev on localhost.
  const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  if (!origin.startsWith('https://') && !isLocal) {
    throw new Error(`PUBLIC_ORIGIN must be https in production, got ${origin}`);
  }
  return origin;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/env.test.ts`
Expected: PASS, the two new tests and the three existing `requireOrigin` tests green.

- [ ] **Step 5: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/env.ts src/tests/unit/env.test.ts
git commit -m "feat(auth): require an https PUBLIC_ORIGIN in production

requireOrigin now rejects a non-https origin unless it is localhost, so a
misconfigured production origin fails by name instead of minting magic links and
a __Host- cookie that depend on https. Local http dev on localhost stays allowed.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: rewrite the admin smoke doc for self-owned auth

**Files:**
- Modify: `docs/admin-smoke-test.md`

The doc still describes the retired better-auth model. It is rewritten for the self-owned D1 model, where the smoke mints a session by inserting a `session` row and sends `Cookie: __Host-cairn_session=<id>`, with no HMAC and no secret. This task is docs only, so it skips the simplifier and runs no test, but the gate's `npm run check` must still pass.

- [ ] **Step 1: Read the current doc and the auth flow it must describe**

Read `docs/admin-smoke-test.md` in full, then confirm the live model against `src/lib/auth/store.ts` (`createSession`, `resolveSession`) and `src/lib/auth/crypto.ts` (`sessionCookieName`). The smoke inserts a `session` row whose `id` is the cookie value, and the guard resolves it by joining `editor`.

- [ ] **Step 2: Rewrite the doc**

Replace the doc body so it describes the self-owned flow, including these load-bearing points stated as prose, not a bare list:

- The session store is D1, table `session` with columns `id`, `email`, `expires_at`, `created_at`. The cookie value is the opaque `id` itself, with no signing and no `AUTH_SECRET`.
- To mint a smoke session, seed an `editor` row, then insert a `session` row with a known `id`, an `expires_at` in the future, and the editor's `email`.
- Send the cookie as `__Host-cairn_session=<id>` against the deployed https Worker, or `cairn_session=<id>` against a local http `wrangler dev`.
- The guard reads the role from the `editor` row on every request, so a role change takes effect immediately, and an expired or missing session redirects to `/admin/login`.
- The final magic-link click in a browser stays a manual step; the inserted session row is the no-email shortcut for the smoke.

Remove every reference to better-auth, signed cookies, `AUTH_SECRET`, the `user` table, and the `better-auth.session_token` cookie.

- [ ] **Step 3: Update the smoke-process memory**

Update the memory file `/home/glw907/.claude/projects/-home-glw907-Projects-cairn/memory/cairn-admin-smoke-test-process.md` so its description and body describe the self-owned D1 session-row mint and the `__Host-cairn_session` cookie, not the better-auth forged cookie. Keep the same `name` and `metadata`. Update the matching one-line pointer in that directory's `MEMORY.md`.

- [ ] **Step 4: Gate and commit**

Run `npm run check` (0/0) to confirm the docs change did not break the scan, then:

```bash
git add docs/admin-smoke-test.md
git commit -m "docs(auth): rewrite the admin smoke doc for self-owned auth

The doc described the retired better-auth model (signed cookies, AUTH_SECRET, a
user table). It now describes the self-owned D1 model: mint a smoke session by
inserting a session row and send Cookie __Host-cairn_session=<id>, with no HMAC
and no secret. This is what the live admin smoke at the pass-end gate runs
against.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: bump the version and run the full gate

**Files:**
- Modify: `package.json`

The pass is internal and additive apart from the cookie rename, so it bumps a minor to `0.16.0`.

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.15.0"` to `"version": "0.16.0"`.

- [ ] **Step 2: Validate the package shape**

Run: `npm run check:package`
Expected: green. No export-condition change; this pass adds no export.

- [ ] **Step 3: Full gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add package.json
git commit -m "chore(auth): bump to 0.16.0 for the auth-hardening pass

The auth-hardening pass adds the __Host- cookie prefix, the admin security
headers, the install-token memo, the magic-link cooldown and waitUntil, the
expired-row sweep, and the https PUBLIC_ORIGIN guard. The one externally visible
change is the cookie rename, which logs editors out once on upgrade so they click
a fresh magic link. The minor bumps to 0.16.0.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

These are confirmed at the pass-end review gate, not coded as tasks, per the design.

- **CSRF origin check.** SvelteKit's built-in CSRF origin check defaults on for form actions. Confirm no site config disables it. The `web-auth-security-reviewer` covers this.
- **Render safety.** Confirm the showcase reference `render(md)` does not emit raw author HTML or `javascript:` URIs, and note that render-safety expectation in the adapter contract docs. This is the real XSS control behind the deferred CSP. A genuine gap is escalated to its own pass rather than fixed here.

## Pass-end review gate

The pass touches auth, session, cookie, and Worker code, so the gate runs `web-auth-security-reviewer` and `cloudflare-workers-reviewer` (both Opus) alongside the simplifier and `/code-review`. The plan touches the `/admin` surface, so the live admin smoke runs against a real Worker using the rewritten doc from Task 7.

---

## Self-review notes

- **Spec coverage.** Unit 1 is Task 1; Unit 2 is Task 2; Unit 3 is Task 3; Unit 4 is Task 4; Unit 6 is Task 5; the two baked-in acceptance checks are Task 6 (the https origin guard) and the verification items (CSRF); Unit 5 is Task 7; the version bump is Task 8. The render-safety investigation is a verification item, as the spec framed it.
- **No regression.** The existing guard tests hold, since the guard returns the same response object after setting headers and still redirects an anonymous request. The existing confirm and request tests hold, since a first request still sends and a fresh token or session is never swept. `installationToken` is unchanged, so `github-signing.test.ts` holds.
- **Type and name consistency.** `sessionCookieName(secure: boolean)` replaces `COOKIE_NAME` across `crypto.ts`, `guard.ts`, `auth-routes.ts`, and the two integration tests. `createInstallationTokenCache` returns `(creds: AppCredentials) => Promise<string>`, the same shape as the `mintToken` closures and the `deps.mintToken` seam. `recentlyIssued(db, email, since)` and `SEND_COOLDOWN_MS` are defined in Task 4 before `requestAction` consumes them. The `RequestContext.platform.context.waitUntil` widening in Task 4 matches the harness `makeEvent` context shape.
- **Ordering and green builds.** Tasks 1 and 2 both touch `guard.ts`, in order: Task 1 changes the cookie read, Task 2 restructures the handle around that read. Tasks 4 and 5 both touch `store.ts`, in order: Task 4 adds `recentlyIssued`, Task 5 changes `issueToken` and `createSession`. Each task ends with the full gate.
- **Versioning.** Internal and additive apart from the cookie rename. No export-condition change. Bumps a minor to `0.16.0`, unpublished until the next release step.

---

## Post-mortem (executed 2026-06-02, on `main`, unpublished)

The pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet for Tasks 1 through 6 and 8, Opus for Task 7's prose-and-memory rewrite), commits `ad19f0e..443ab01`. That is the eight plan-task commits, one simplifier refinement (`9f9d5f5`), and one review-gate fold-in (`443ab01`). Local only, not pushed, not published.

**What was built.** All six units landed as specified. The session cookie name derives from the request protocol through `sessionCookieName(secure)`, so it is `__Host-cairn_session` with `Secure` on https and plain `cairn_session` on local http, derived identically at set, read, and clear. The guard attaches six baseline security headers (`nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, HSTS, a conservative `Permissions-Policy`) to every admin response that flows through `resolve()`, gated and public-admin alike, and leaves non-admin responses untouched. A module-level `Map` memoizes the GitHub installation token per `installationId` for 55 minutes under the one-hour lifetime, with the mint and clock injected for testing, wired into both route closures. `requestAction` skips the reissue and send when a token for the email was issued within a 60-second cooldown, keeping the response identical so the non-enumeration property holds, and backgrounds the send through `platform.ctx.waitUntil` with an inline `await` fallback while still awaiting the token-row write. Expired rows are swept at write time, with `issueToken`'s DELETE folding in `OR expires_at <= ?` and `createSession` batching a session sweep before its insert, so no Cron Trigger is needed. `requireOrigin` rejects a non-https origin unless the parsed hostname is exactly `localhost` or `127.0.0.1`. The admin smoke doc was rewritten for the self-owned D1 model, and its memory was updated.

**Final gate** at the tip (`443ab01`): `npm run check` 753 files 0 errors 0 warnings, `npm test` 98 files / 477 tests exit 0, `check:package` all-green across the existing entries with no export-condition change. Each task ran test-first, watched red for the right reason, then green.

**Review gate.** A `code-simplifier` pass found the code already clean and made one cosmetic doc-comment normalization (`9f9d5f5`). The two applicable Opus reviewers ran in parallel. `web-auth-security-reviewer` returned no Critical and no in-scope Important finding against the pass's own changes, confirmed the `__Host-` invariants, the non-enumeration property, the parameterized email-safe sweeps, the header coverage, and the install-token memo, and returned a PASS on the CSRF verification item (no config disables SvelteKit's origin check). `cloudflare-workers-reviewer` returned no Critical or Important, confirmed the `db.batch` atomicity, the per-isolate `Map` soundness, the 55-minute TTL margin, and the `waitUntil` keep-alive contract. Two minor findings in this pass's own new code were folded in test-first as `443ab01`: `requestAction` now prefers the supported `platform.ctx` accessor over the deprecated `platform.context` alias, and `requireOrigin` matches the localhost hostnames exactly so a lookalike host like `localhost.evil.com` cannot skip the https requirement.

**Render-safety verification item: FAIL, escalated (not fixed here, per the plan).** The auth reviewer found that the reference delivery render path in `src/lib/render/pipeline.ts` composes `remarkRehype({ allowDangerousHtml: true })` with `rehypeRaw` and no `rehype-sanitize`, and the showcase delivers its output through `{@html}`. Author markdown that contains a `<script>`, an `onerror` attribute, or a `javascript:` URI therefore reaches the published page verbatim. The deferred-CSP decision in the design rested on render safety being the real XSS control, and that control is absent on the reference path as written. Cairn's trusted-editor model lowers the likelihood, since editors are an owner-curated allowlist committing through the GitHub App with history, so this is a malicious-or-compromised-editor and paste-mistake exposure rather than anonymous input. Per the plan's escalate-not-fix rule for a real gap, it is recorded as the next security pass (a `rehype-sanitize` floor in the delivered pipeline, or a reconsidered CSP) and must land before either site adopts the delivery surface. See the STATUS entry and the `cairn-render-sanitize-gap` memory.

**Live admin smoke.** The showcase reference runs on `@sveltejs/adapter-node` with Playwright, not a Cloudflare Worker with a `wrangler` config, so there is no `wrangler dev` admin Worker to smoke in this workspace. Real-Worker coverage for every behavior this pass changed comes from the `integration` test project, which runs in workerd against a real miniflare D1 and is green across `auth-guard` (the `__Host-` cookie read, the headers on gated, public-admin, and non-admin responses), `auth-confirm` (the cookie set with its attributes on https and http), `auth-request` (the cooldown suppression and the `ctx.waitUntil` backgrounding), and `auth-cleanup` (the expired-row sweeps). A deployed-https browser smoke, where a real browser sets and returns the `__Host-` cookie and an editor clicks a real magic link, stays a human fast-follow against a deployed site, consistent with this project's precedent for live `/admin` smokes.

**Carried follow-ups.** The guard's own 303 login-redirect skips the security headers, since `throw redirect(...)` unwinds before the post-resolve header step. The bare redirect carries a `Location` and a `Set-Cookie` with almost no body, and the eventual `/admin/login` page does get the headers, so the impact is low. Full coverage would set the headers before the auth check. Left as a documented minor, not fixed.
