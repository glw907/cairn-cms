# cairn-owned admin CSRF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the JS-free admin sign-in work for a browser that sends no `Origin` header, by moving CSRF ownership from SvelteKit's global check to cairn's guard with one uniform double-submit token over all admin form POSTs.

**Architecture:** A site disables SvelteKit's global `checkOrigin`. cairn's `createAuthGuard()` becomes the single CSRF authority with two rules: every `/admin` unsafe form POST carries a valid `__Host-cairn_csrf` double-submit token (issued lazily and stably by the loads, rendered by a shared `CsrfField`, validated centrally in the guard), and every non-admin unsafe form POST keeps a faithful `Origin` check. Any rejection from cairn's own check renders a branded page built through a shared static-page helper.

**Tech Stack:** TypeScript, SvelteKit 2, Svelte 5 runes, Cloudflare Workers (workerd), Vitest (unit, `cloudflare:test` integration, `vitest-browser-svelte` component). Design spec: `docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md`.

---

## File structure

- Modify `src/lib/auth/crypto.ts`: add `csrfCookieName`, `generateCsrfToken`.
- Create `src/lib/sveltekit/csrf.ts`: `isUnsafeFormRequest`, `originMatches`, `tokensMatch`, `issueCsrfToken`, `validateCsrfToken`.
- Create `src/lib/sveltekit/static-admin-page.ts`: `renderStaticAdminPage`, `escapeHtml` (moved), the shared CSS and glyph.
- Modify `src/lib/sveltekit/https-required-page.ts`: build inner HTML, delegate the shell to the helper.
- Create `src/lib/sveltekit/csrf-required-page.ts`: the branded 403 page.
- Modify `src/lib/sveltekit/guard.ts`: the two-rule CSRF gate and its response builders.
- Modify `src/lib/sveltekit/auth-routes.ts`: `loginLoad` and `confirmLoad` issue the token.
- Modify `src/lib/sveltekit/content-routes.ts`: `layoutLoad` issues the token; `LayoutData.csrf`; widen `ContentEvent.cookies`.
- Create `src/lib/components/csrf-context.ts`: the context key.
- Create `src/lib/components/CsrfField.svelte`: the shared hidden input.
- Modify `src/lib/components/index.ts`: export `CsrfField`.
- Modify the form components: `LoginPage.svelte`, `ConfirmPage.svelte`, `AdminLayout.svelte`, `EditPage.svelte`, `ConceptList.svelte`, `NavTree.svelte`, `ManageEditors.svelte`.
- Docs: `CHANGELOG.md`, `docs/guides/deploy-to-cloudflare.md`, `docs/guides/upgrade-cairn.md`, `docs/explanation/security-model.md`, `docs/admin-route-structure.md`, `docs/reference/components.md`, `package.json`.

The project gate after each task: the targeted test green, then `npm run check` 0/0, then `npm test` exit 0.

---

### Task 1: CSRF crypto primitives

**Files:**
- Modify: `src/lib/auth/crypto.ts`
- Test: `src/tests/unit/csrf-crypto.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/csrf-crypto.test.ts
import { describe, it, expect } from 'vitest';
import { csrfCookieName, generateCsrfToken } from '../../lib/auth/crypto.js';

describe('CSRF crypto primitives', () => {
  it('prefixes the cookie name with __Host- only when secure', () => {
    expect(csrfCookieName(true)).toBe('__Host-cairn_csrf');
    expect(csrfCookieName(false)).toBe('cairn_csrf');
  });

  it('generates a url-safe 256-bit token that differs each call', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url, unpadded
    expect(generateCsrfToken()).not.toBe(token);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/csrf-crypto.test.ts`
Expected: FAIL with `csrfCookieName` / `generateCsrfToken` not exported.

- [ ] **Step 3: Add the primitives**

Append to `src/lib/auth/crypto.ts` (after `sessionCookieName`, reusing the existing `randomBase64Url`):

```ts
/** The CSRF double-submit cookie base name, __Host- prefixed when the cookie is Secure. */
const CSRF_COOKIE_BASE = 'cairn_csrf';

/** The CSRF cookie name, mirroring sessionCookieName: __Host- on https, bare on local http. */
export function csrfCookieName(secure: boolean): string {
  return secure ? `__Host-${CSRF_COOKIE_BASE}` : CSRF_COOKIE_BASE;
}

/** A fresh 256-bit double-submit token, url-safe. */
export function generateCsrfToken(): string {
  return randomBase64Url(32);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/csrf-crypto.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0 errors / 0 warnings; test exit 0.

```bash
git add src/lib/auth/crypto.ts src/tests/unit/csrf-crypto.test.ts
git commit -m "Add CSRF cookie-name and token primitives"
```

---

### Task 2: The CSRF glue module

**Files:**
- Create: `src/lib/sveltekit/csrf.ts`
- Test: `src/tests/unit/csrf.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/csrf.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/csrf.test.ts`
Expected: FAIL with module `csrf.js` not found.

- [ ] **Step 3: Write the module**

```ts
// src/lib/sveltekit/csrf.ts
// cairn owns CSRF for the admin once a site disables SvelteKit's global checkOrigin. These helpers
// back the guard's two rules and the loads that issue the double-submit token. See
// docs/superpowers/specs/2026-06-08-cairn-login-csrf-ownership-design.md.
import { csrfCookieName, generateCsrfToken } from '../auth/crypto.js';
import type { CookieJar, RequestContext } from './types.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = new Set([
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

/** True for a request SvelteKit's CSRF guard screens: an unsafe method with a form content type. */
export function isUnsafeFormRequest(request: Request): boolean {
  if (!UNSAFE_METHODS.has(request.method)) return false;
  const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  return FORM_CONTENT_TYPES.has(type);
}

/** The faithful framework check: the Origin header equals the request's own origin. */
export function originMatches(event: Pick<RequestContext, 'url' | 'request'>): boolean {
  return event.request.headers.get('origin') === event.url.origin;
}

/** A length-checked constant-time compare, so the token check leaks no timing. */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Return the session's CSRF token, minting and setting it when absent. Lazy and stable: a second
 * open admin tab reuses the same value, so its form field still matches the cookie. Session-scoped
 * (no maxAge), HttpOnly (the server sets both halves), SameSite=Strict, and __Host- on https.
 */
export function issueCsrfToken(event: { url: URL; cookies: CookieJar }): string {
  const secure = event.url.protocol === 'https:';
  const name = csrfCookieName(secure);
  const existing = event.cookies.get(name);
  if (existing) return existing;
  const token = generateCsrfToken();
  event.cookies.set(name, token, { path: '/', httpOnly: true, secure, sameSite: 'strict' });
  return token;
}

/** Validate the double-submit token on an admin form POST, reading the field from a body clone. */
export async function validateCsrfToken(event: RequestContext): Promise<boolean> {
  const cookie = event.cookies.get(csrfCookieName(event.url.protocol === 'https:'));
  if (!cookie) return false;
  let submitted = '';
  try {
    const form = await event.request.clone().formData();
    submitted = String(form.get('csrf') ?? '');
  } catch {
    return false;
  }
  return tokensMatch(submitted, cookie);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/csrf.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/csrf.ts src/tests/unit/csrf.test.ts
git commit -m "Add the CSRF glue: form-request, origin, token issue and validate"
```

---

### Task 3: Extract the shared static admin page

**Files:**
- Create: `src/lib/sveltekit/static-admin-page.ts`
- Modify: `src/lib/sveltekit/https-required-page.ts`
- Test: `src/tests/unit/static-admin-page.test.ts`
- Leave unchanged (must stay green): `src/tests/unit/https-required-page.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/static-admin-page.test.ts
import { describe, it, expect } from 'vitest';
import { renderStaticAdminPage, escapeHtml } from '../../lib/sveltekit/static-admin-page.js';

describe('renderStaticAdminPage', () => {
  it('wraps inner html in a self-contained branded document', () => {
    const html = renderStaticAdminPage({ title: 'T · Cairn', innerHtml: '<h1>Hello</h1>' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('Powered by Cairn');
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toContain('<script');
  });

  it('escapes the title', () => {
    expect(renderStaticAdminPage({ title: '<x>', innerHtml: '' })).toContain('<title>&lt;x&gt;</title>');
  });
});

describe('escapeHtml', () => {
  it('escapes the four entities', () => {
    expect(escapeHtml('&<>"')).toBe('&amp;&lt;&gt;&quot;');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/static-admin-page.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Create the helper, move the shared parts out of `https-required-page.ts`**

Create `src/lib/sveltekit/static-admin-page.ts`. Move `escapeHtml` and `CAIRN_GLYPH` here verbatim from `https-required-page.ts` and add the shared shell. The `SHARED_STYLE` constant is the exact contents of the current `<style>` block in `https-required-page.ts` (the `:root` light tokens, the `@media (prefers-color-scheme: dark)` block, and every rule through `.foot`), copied unchanged.

```ts
// src/lib/sveltekit/static-admin-page.ts
// The shared shell for cairn's edge-served admin pages (HTTPS-required, CSRF-failed). Each is a
// self-contained document with inlined Warm Stone tokens for both colour schemes and the system
// font stack, served raw before SvelteKit renders. See docs/internal/admin-design-system.md.

/** Escape a string for safe interpolation into HTML text and double-quoted attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The cairn stone-stack glyph (Temaki, CC0), drawn in currentColor like CairnLogo.svelte.
const CAIRN_GLYPH =
  '<path d="M6.28 14C5.56 14 1 13.89 1 12.91C1 11.46 2.16 11.07 3.2 10.81C4.36 10.51 13.18 9.77 ' +
  '13.76 10.07C14.46 10.43 13.52 12.49 12.44 12.77C11.28 13.07 10.21 14 8.48 14C7.05 14 9.69 14 ' +
  '6.28 14ZM6.92 4.5C6.67 4.5 5 4.43 5 3.88C5 3.07 5.75 2.51 5.96 2.35C6.36 2.03 6.32 1.62 6.54 ' +
  '1.27C6.84 0.79 7.61 0.5 7.88 0.5C8.1 0.5 8.75 0.9 9.23 1.42C9.45 1.66 10 2.77 10 3.12C10 4.22 ' +
  '9.36 4.5 8.85 4.5C8.33 4.5 8.15 4.5 6.92 4.5ZM3.68 8.22C3 7.73 3.67 6.86 4.57 6.21C5.38 5.63 ' +
  '5.92 5.96 6.79 5.7C8.33 5.24 9.02 5.72 9.02 5.72L10.9 6.82C12.03 7.63 10.99 7.67 10.38 8.56C9.79 ' +
  '9.42 8.18 9.11 7.42 9.33C6.78 9.53 5.75 9.71 4.62 8.9L3.68 8.22Z"/>';

// Copy the exact CSS that currently sits between <style> and </style> in https-required-page.ts
// (the `:root { … }` light tokens, the `@media (prefers-color-scheme: dark)` block, and every rule
// from `* { box-sizing }` through `.foot { … }`), pasted verbatim with no edits. It already covers
// every class both pages use (brand, eyebrow, cta, fix, path, foot).
const SHARED_STYLE = `/* … the verbatim rule set described in the comment above … */`;

/**
 * Render a full self-contained admin page document. The caller supplies trusted inner HTML
 * (eyebrow, heading, copy, CTA); the helper owns the head, the inlined style, the brand tile,
 * and the footer.
 */
export function renderStaticAdminPage(opts: { title: string; innerHtml: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(opts.title)}</title>
<style>
${SHARED_STYLE}
</style>
</head>
<body>
<main>
  <div class="brand">
    <span class="tile"><svg viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">${CAIRN_GLYPH}</svg></span>
    <span class="word">Cairn</span>
  </div>
${opts.innerHtml}
  <p class="foot">Powered by Cairn</p>
</main>
</body>
</html>`;
}
```

Then rewrite `src/lib/sveltekit/https-required-page.ts` to build only its inner HTML and delegate the shell. Keep the eyebrow lock SVG, the `<h1>`, the intro `<p>`, the `.cta` link with the arrow SVG, and the `.fix` block exactly as they are today, moved into `inner`:

```ts
// src/lib/sveltekit/https-required-page.ts
// The "this admin needs HTTPS" page. The auth guard serves it when a request reaches a deployed
// Worker over http, the one case that makes the magic-link sign-in fail. See guard.ts.
import { escapeHtml, renderStaticAdminPage } from './static-admin-page.js';

/**
 * Render the full HTML document for the HTTPS-required page.
 * @param httpsUrl The same request rebuilt over https, offered as the one-click recovery link.
 */
export function httpsRequiredPage(httpsUrl: string): string {
  const href = escapeHtml(httpsUrl);
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    Secure connection required
  </span>
  <h1>This admin needs a secure connection</h1>
  <p>You opened this page over http. Sign-in only works over https, so open the secure version to continue.</p>

  <a class="cta" href="${href}">
    Open over HTTPS
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>

  <div class="fix">
    <h2>If you run this site</h2>
    <p>Turn on Always Use HTTPS in Cloudflare. It upgrades every request to https before it reaches the site:</p>
    <span class="path">SSL/TLS<span class="arrow">&rsaquo;</span>Edge Certificates<span class="arrow">&rsaquo;</span>Always Use HTTPS</span>
    <p>Keep HSTS on too. The browser then stays on https and sign-in works.</p>
  </div>`;
  return renderStaticAdminPage({ title: 'HTTPS required · Cairn', innerHtml: inner });
}
```

- [ ] **Step 3b: Run the existing HTTPS-page test to confirm no regression**

Run: `npx vitest run src/tests/unit/https-required-page.test.ts`
Expected: PASS (doctype start, `Always Use HTTPS`, escaped href, no stylesheet link, no script).

- [ ] **Step 4: Run the new test to verify it passes**

Run: `npx vitest run src/tests/unit/static-admin-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/static-admin-page.ts src/lib/sveltekit/https-required-page.ts src/tests/unit/static-admin-page.test.ts
git commit -m "Extract the shared static admin-page shell"
```

---

### Task 4: The branded CSRF-failed page

**Files:**
- Create: `src/lib/sveltekit/csrf-required-page.ts`
- Test: `src/tests/unit/csrf-required-page.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/csrf-required-page.test.ts
import { describe, it, expect } from 'vitest';
import { csrfRequiredPage } from '../../lib/sveltekit/csrf-required-page.js';

describe('csrfRequiredPage', () => {
  it('renders a branded recovery page back to sign-in', () => {
    const html = csrfRequiredPage();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('href="/admin/login"');
    expect(html).toMatch(/sign-in|sign in/i);
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/csrf-required-page.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the page**

```ts
// src/lib/sveltekit/csrf-required-page.ts
// The branded 403 the guard serves when an admin form POST fails the double-submit token check.
// A sibling to https-required-page, built through the shared shell. It names the likely cause and
// offers a fresh sign-in, and it does not mention Origin headers (the token path does not read them).
import { renderStaticAdminPage } from './static-admin-page.js';

/** Render the full HTML document for the CSRF-failed page. */
export function csrfRequiredPage(): string {
  const inner = `
  <span class="eyebrow">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    Security check
  </span>
  <h1>Let's try that again</h1>
  <p>Your sign-in form could not be verified. This usually means the page was open across a browser restart, or cookies are blocked for this site.</p>

  <a class="cta" href="/admin/login">
    Back to sign-in
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  </a>

  <div class="fix">
    <h2>If it keeps happening</h2>
    <p>Allow cookies for this site, then open the sign-in page fresh and request a new link.</p>
  </div>`;
  return renderStaticAdminPage({ title: 'Security check · Cairn', innerHtml: inner });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/unit/csrf-required-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/csrf-required-page.ts src/tests/unit/csrf-required-page.test.ts
git commit -m "Add the branded CSRF-failed page"
```

---

### Task 5: Wire the two CSRF rules into the guard

**Files:**
- Modify: `src/lib/sveltekit/guard.ts`
- Test: `src/tests/integration/auth-guard.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these imports at the top of `src/tests/integration/auth-guard.test.ts` (alongside the existing imports):

```ts
import { csrfCookieName } from '../../lib/auth/crypto.js';
```

Add this helper after the existing `httpEvent` helper:

```ts
function formEvent(
  pathname: string,
  opts: { csrfCookie?: string; csrfField?: string; origin?: string } = {},
): RequestContext {
  const url = `https://test.dev${pathname}`;
  const body = new URLSearchParams();
  if (opts.csrfField !== undefined) body.set('csrf', opts.csrfField);
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (opts.origin !== undefined) headers.origin = opts.origin;
  const cookieMap: Record<string, string> = {};
  if (opts.csrfCookie) cookieMap[csrfCookieName(true)] = opts.csrfCookie;
  return {
    url: new URL(url),
    request: new Request(url, { method: 'POST', headers, body }),
    cookies: makeCookies(cookieMap),
    locals: {},
    platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}
```

Add this describe block at the end of the file:

```ts
describe('CSRF (cairn owns it)', () => {
  it('rejects a non-admin form POST with a mismatched Origin', async () => {
    const res = await handle({ event: formEvent('/contact', { origin: 'https://evil.dev' }), resolve: async () => OK });
    expect(res.status).toBe(403);
  });

  it('passes a non-admin form POST with a matching Origin', async () => {
    const res = await handle({ event: formEvent('/contact', { origin: 'https://test.dev' }), resolve: async () => OK });
    expect(res).toBe(OK);
  });

  it('serves the branded page for an admin form POST with no token, never resolving', async () => {
    let resolved = false;
    const res = await handle({
      event: formEvent('/admin/login'),
      resolve: async () => {
        resolved = true;
        return OK;
      },
    });
    expect(resolved).toBe(false);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('Back to sign-in');
  });

  it('passes an admin form POST whose token matches, with no Origin header', async () => {
    const res = await handle({
      event: formEvent('/admin/login', { csrfCookie: 'TOK', csrfField: 'TOK' }),
      resolve: async () => OK,
    });
    expect(res).toBe(OK);
  });

  it('passes an authenticated admin form POST with a valid token and no Origin', async () => {
    const cookies = await seedSession('own@x.dev');
    cookies.jar.set(csrfCookieName(true), 'TOK');
    const url = 'https://test.dev/admin/posts/p1';
    const ev: RequestContext = {
      url: new URL(url),
      request: new Request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrf: 'TOK', title: 'x' }),
      }),
      cookies,
      locals: {},
      platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
      setHeaders: () => {},
    };
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.editor?.email).toBe('own@x.dev');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/integration/auth-guard.test.ts`
Expected: FAIL (non-admin POST resolves instead of 403; admin no-token POST resolves instead of the branded 403).

- [ ] **Step 3: Wire the guard**

In `src/lib/sveltekit/guard.ts`, add the imports:

```ts
import { isUnsafeFormRequest, originMatches, validateCsrfToken } from './csrf.js';
import { csrfRequiredPage } from './csrf-required-page.js';
```

Add these two response builders next to `httpsRequiredResponse`:

```ts
/** A plain 403 for a non-admin cross-origin form POST, matching the framework's wording. */
function csrfForbidden(): Response {
  return new Response('Cross-site POST form submissions are forbidden', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/** The branded 403 for a failed admin double-submit token check. */
function csrfRequiredResponse(): Response {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  applySecurityHeaders(headers);
  return new Response(csrfRequiredPage(), { status: 403, headers });
}
```

Replace the body of the returned `handle` so the two rules sit in order. The non-admin branch gains Rule 2, and Rule 1 sits after the HTTPS check and before the session gate:

```ts
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;

    // Rule 2 — non-admin: restore the framework's strict Origin check the consumer disabled.
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request) && !originMatches(event)) return csrfForbidden();
      return resolve(event);
    }

    // A deployed admin request over http never works; serve the help page before resolve().
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      return httpsRequiredResponse(event.url);
    }

    // Rule 1 — admin: every unsafe form POST carries a valid double-submit token.
    if (isUnsafeFormRequest(event.request) && !(await validateCsrfToken(event))) {
      return csrfRequiredResponse();
    }

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/integration/auth-guard.test.ts`
Expected: PASS, including the pre-existing guard and HTTPS-page tests.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/guard.ts src/tests/integration/auth-guard.test.ts
git commit -m "Make the guard cairn's CSRF authority with two rules"
```

---

### Task 6: The auth loads issue the token

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Test: `src/tests/integration/auth-load-csrf.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/integration/auth-load-csrf.test.ts
import { describe, it, expect } from 'vitest';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { makeRecordingCookies } from './_auth-harness.js';
import { csrfCookieName } from '../../lib/auth/crypto.js';
import type { CookieJar } from '../../lib/sveltekit/types.js';

const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'a@b.c' } });

function loadEvent(url: string, cookies: CookieJar) {
  return { url: new URL(url), request: new Request(url), cookies, locals: {}, platform: { env: {} }, setHeaders: () => {} } as never;
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/integration/auth-load-csrf.test.ts`
Expected: FAIL (`data.csrf` is undefined).

- [ ] **Step 3: Issue the token in the two loads**

In `src/lib/sveltekit/auth-routes.ts`, add the import:

```ts
import { issueCsrfToken } from './csrf.js';
```

Replace `loginLoad` and `confirmLoad`:

```ts
  /** GET /admin/login. Public. Carries the site name, an optional `?error`, and the CSRF token. */
  function loginLoad(event: RequestContext): { siteName: string; error: string | null; csrf: string } {
    return {
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }

  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST verifies.
   * Sets Referrer-Policy: no-referrer so the token does not leak to a referrer, and issues the CSRF token.
   */
  function confirmLoad(
    event: RequestContext,
  ): { token: string; siteName: string; error: string | null; csrf: string } {
    event.setHeaders({ 'Referrer-Policy': 'no-referrer' });
    return {
      token: event.url.searchParams.get('token') ?? '',
      siteName: config.branding.siteName,
      error: event.url.searchParams.get('error'),
      csrf: issueCsrfToken(event),
    };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/integration/auth-load-csrf.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/auth-routes.ts src/tests/integration/auth-load-csrf.test.ts
git commit -m "Issue the CSRF token from the login and confirm loads"
```

---

### Task 7: The admin shell load issues the token

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts`
- Test: `src/tests/unit/content-routes-layout.test.ts`, `src/tests/unit/content-routes-list.test.ts`

- [ ] **Step 1: Make the existing layout fixtures provide a settable cookie jar, and assert the token**

Both `content-routes-layout.test.ts` and `content-routes-list.test.ts` build a fake event whose `cookies` is get-only. `layoutLoad` will now call `cookies.set`, so both fixtures need a `set` (and `delete`). Update each file's event builder so its `cookies` object includes:

```ts
      set: () => {},
      delete: () => {},
```

For `content-routes-list.test.ts`, the `event()` helper builds `cookies: { get: (name) => opts.cookies?.[name] }`. Change it to:

```ts
    cookies: { get: (name: string) => opts.cookies?.[name], set: () => {}, delete: () => {} },
```

In `content-routes-layout.test.ts`, find the `event(...)` helper's `cookies` literal and add the same `set` and `delete` no-ops. Then add this assertion inside the existing `describe('layoutLoad', ...)` block:

```ts
  it('issues a CSRF token in the layout data', () => {
    const data = routes.layoutLoad(event('/admin/posts', 'owner') as never);
    expect(data.csrf).toMatch(/^[A-Za-z0-9_-]+$/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/unit/content-routes-layout.test.ts`
Expected: FAIL (`data.csrf` is undefined).

- [ ] **Step 3: Add the token to `LayoutData` and `layoutLoad`, widen `ContentEvent.cookies`**

In `src/lib/sveltekit/content-routes.ts`:

Add the imports:

```ts
import { issueCsrfToken } from './csrf.js';
import type { CookieJar } from './types.js';
```

In the `ContentEvent` interface, replace the `cookies` field with the full jar (a real event always supplies it; the layout load now needs `set`):

```ts
  /** SvelteKit's cookie jar. The layout load reads the persisted theme and issues the CSRF token. */
  cookies?: CookieJar;
```

Add `csrf` to `LayoutData` (after `collapsedNav`):

```ts
  /** The session's CSRF double-submit token, rendered as a hidden field in every admin form. */
  csrf: string;
```

In `layoutLoad`, add the token to the returned object (the `event.cookies` guard keeps the optional type honest; a real route always has cookies):

```ts
      collapsedNav,
      csrf: event.cookies ? issueCsrfToken({ url: event.url, cookies: event.cookies }) : '',
    };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/unit/content-routes-layout.test.ts src/tests/unit/content-routes-list.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-layout.test.ts src/tests/unit/content-routes-list.test.ts
git commit -m "Issue the CSRF token from the admin shell load"
```

---

### Task 8: The shared CsrfField component

**Files:**
- Create: `src/lib/components/csrf-context.ts`
- Create: `src/lib/components/CsrfField.svelte`
- Modify: `src/lib/components/index.ts`
- Test: `src/tests/component/CsrfField.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/component/CsrfField.test.ts
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CsrfField from '../../lib/components/CsrfField.svelte';

describe('CsrfField', () => {
  it('renders a hidden csrf input from the token prop', () => {
    const screen = render(CsrfField, { token: 'ABC' });
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('type')).toBe('hidden');
    expect(input).toHaveValue('ABC');
  });

  it('renders an empty value when given no token and no context', () => {
    const screen = render(CsrfField, {});
    const input = screen.container.querySelector('input[name="csrf"]') as HTMLInputElement;
    expect(input).toHaveValue('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/component/CsrfField.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write the context key, the component, and the export**

```ts
// src/lib/components/csrf-context.ts
/** The Svelte context key AdminLayout uses to hand the CSRF token to descendant admin forms. */
export const CSRF_CONTEXT_KEY = 'cairn:csrf';
```

```svelte
<!--
@component
A hidden CSRF double-submit field for an admin form. Pass `token` directly (the pre-auth pages do),
or omit it inside the authed shell, where AdminLayout provides the token through context. A form that
omits this field fails the guard's token check, which is the intended fail-closed signal.
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';

  interface Props {
    /** The CSRF token. Falls back to the admin context when omitted. */
    token?: string;
  }
  let { token }: Props = $props();
  const fromContext = getContext<string | undefined>(CSRF_CONTEXT_KEY);
  const value = $derived(token ?? fromContext ?? '');
</script>

<input type="hidden" name="csrf" value={value} />
```

Add to `src/lib/components/index.ts` (after the `ConfirmPage` export):

```ts
export { default as CsrfField } from './CsrfField.svelte';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/component/CsrfField.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/components/csrf-context.ts src/lib/components/CsrfField.svelte src/lib/components/index.ts src/tests/component/CsrfField.test.ts
git commit -m "Add the shared CsrfField component"
```

---

### Task 9: Wire the token into the pre-auth forms

**Files:**
- Modify: `src/lib/components/LoginPage.svelte`, `src/lib/components/ConfirmPage.svelte`
- Test: `src/tests/component/LoginPage.test.ts`, `src/tests/component/ConfirmPage.test.ts`

- [ ] **Step 1: Update the tests to pass `csrf` and assert the field**

In `src/tests/component/LoginPage.test.ts`, add `csrf: 'csrf-tok'` to each `data` object, and extend the first test:

```ts
  it('renders an email form posting to the request action with a CSRF field', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: null });
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /send|sign in/i })).toBeInTheDocument();
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });
```

(Add `csrf: 'csrf-tok'` to the `data` in the second LoginPage test too, so it type-checks.)

In `src/tests/component/ConfirmPage.test.ts`, add `csrf: 'csrf-tok'` to each `data` object, and extend the first test:

```ts
  it('renders a POST confirm form carrying the token and a CSRF field', async () => {
    const screen = render(ConfirmPage, { data: { token: 'tok123', siteName: 'Test Site', error: null, csrf: 'csrf-tok' } });
    await expect.element(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(document.querySelector('input[name="token"]')).toHaveValue('tok123');
    expect(screen.container.querySelector('form input[name="csrf"]')).toHaveValue('csrf-tok');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts`
Expected: FAIL (no `input[name="csrf"]`).

- [ ] **Step 3: Add `csrf` to the props and render `CsrfField`**

In `src/lib/components/LoginPage.svelte`, import the field and widen the `data` prop:

```ts
  import CsrfField from './CsrfField.svelte';
```

```ts
  interface Props {
    /** The login load's data: the site name, an optional error, and the CSRF token. */
    data: { siteName: string; error: string | null; csrf: string };
    /** The action result: `sent` is true once a request was accepted. */
    form: { sent?: boolean } | null;
  }
```

Inside the `<form method="POST" ...>` (just under the opening tag), add:

```svelte
        <CsrfField token={data.csrf} />
```

In `src/lib/components/ConfirmPage.svelte`, import the field and widen the `data` prop:

```ts
  import CsrfField from './CsrfField.svelte';
```

```ts
  interface Props {
    /** The confirm load's data: the token to submit, the site name, an optional error, the CSRF token. */
    data: { token: string; siteName: string; error: string | null; csrf: string };
  }
```

Inside the `<form method="POST">`, next to the existing hidden token input, add:

```svelte
        <CsrfField token={data.csrf} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/components/LoginPage.svelte src/lib/components/ConfirmPage.svelte src/tests/component/LoginPage.test.ts src/tests/component/ConfirmPage.test.ts
git commit -m "Render the CSRF field in the login and confirm forms"
```

---

### Task 10: Wire the token into the authenticated forms

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`, `EditPage.svelte`, `ConceptList.svelte`, `NavTree.svelte`, `ManageEditors.svelte`
- Test: `src/tests/component/AdminLayout.test.ts` plus the existing test files for the four form components

- [ ] **Step 1: Update each form component's test to assert every POST form carries a CSRF field**

For each of `AdminLayout.test.ts`, and the existing test files that render `EditPage`, `ConceptList`, `NavTree`, and `ManageEditors`, find a test that already calls `const screen = render(...)` with valid props and add this assertion (it proves every `method="POST"` form in the component carries exactly one `csrf` field):

```ts
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
```

For `AdminLayout.test.ts`, the rendered `data` is a `LayoutData`. Add `csrf: 'csrf-tok'` to that fixture object so it type-checks and the logout field has a value. If the fixture is shared across tests, add `csrf: 'csrf-tok'` once at its definition.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts src/tests/component/EditPage.test.ts src/tests/component/ConceptList.test.ts src/tests/component/NavTree.test.ts src/tests/component/ManageEditors.test.ts`
Expected: FAIL (`csrfFields.length` is 0, not equal to the form count).

Note: if a component's test file name differs, run `ls src/tests/component` and target the file that imports that component.

- [ ] **Step 3: Provide the context in AdminLayout and drop `CsrfField` into every authed form**

In `src/lib/components/AdminLayout.svelte`, add the imports and set the context from the layout data:

```ts
  import { setContext } from 'svelte';
  import CsrfField from './CsrfField.svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
```

After `let { data, children }: Props = $props();`, add:

```ts
  // Hand the CSRF token to every descendant admin form. layoutLoad issued and returned it.
  setContext(CSRF_CONTEXT_KEY, data.csrf);
```

Inside the logout form (`<form method="POST" action="/admin/auth/logout" ...>`), add:

```svelte
            <CsrfField token={data.csrf} />
```

In each of `EditPage.svelte`, `ConceptList.svelte`, `NavTree.svelte`, and `ManageEditors.svelte`, import the field once:

```ts
  import CsrfField from './CsrfField.svelte';
```

Then add `<CsrfField />` as the first child inside every `<form method="POST" ...>` in that component (these forms read the token from context):

- `EditPage.svelte`: the `action="?/save"` form.
- `ConceptList.svelte`: the `action="?/delete"` form and the `action="?/create"` form.
- `NavTree.svelte`: the `action="?/save"` form.
- `ManageEditors.svelte`: the `action="?/setRole"`, `action="?/remove"`, and `action="?/add"` forms.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts src/tests/component/EditPage.test.ts src/tests/component/ConceptList.test.ts src/tests/component/NavTree.test.ts src/tests/component/ManageEditors.test.ts`
Expected: PASS.

- [ ] **Step 5: Project gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add src/lib/components/AdminLayout.svelte src/lib/components/EditPage.svelte src/lib/components/ConceptList.svelte src/lib/components/NavTree.svelte src/lib/components/ManageEditors.svelte src/tests/component/AdminLayout.test.ts src/tests/component/EditPage.test.ts src/tests/component/ConceptList.test.ts src/tests/component/NavTree.test.ts src/tests/component/ManageEditors.test.ts
git commit -m "Render the CSRF field in every authenticated admin form"
```

---

### Task 11: Docs, reference, and the version bump

**Files:**
- Modify: `docs/reference/components.md`, `docs/guides/deploy-to-cloudflare.md`, `docs/guides/upgrade-cairn.md`, `CHANGELOG.md`, `docs/explanation/security-model.md`, `docs/admin-route-structure.md`, `package.json`

- [ ] **Step 1: Document the new export and data shapes in the reference**

In `docs/reference/components.md`, add a `CsrfField` entry to the component list, with its one `token?: string` prop and a one-line description (a hidden double-submit field; pass `token`, or omit it inside the authed shell where `AdminLayout` provides it through context). Note that `LoginPage` and `ConfirmPage` data now carries `csrf`, and `AdminLayout` data (`LayoutData`) now carries `csrf`.

Run: `npm run check:reference`
Expected: exit 0 (the gate enumerates exports from the built `.d.ts`; `CsrfField` must be documented).

- [ ] **Step 2: Add the required consumer step to the deploy guide**

In `docs/guides/deploy-to-cloudflare.md`, add a step near the force-HTTPS step: a consuming site must set `csrf: { checkOrigin: false }` in `kit` in `svelte.config.js`, because cairn now owns CSRF for the admin through its guard (a uniform double-submit token), and the framework's global check would otherwise reject the JS-free auth POST from a browser that omits `Origin`. State that cairn restores the strict `Origin` check for the site's own non-admin forms, so disabling the global check is not a net loss.

- [ ] **Step 3: Add the upgrade and changelog entries**

In `CHANGELOG.md`, add a `0.35.0` section with a `Consumers must:` line: set `csrf: { checkOrigin: false }` in `svelte.config.js`. Summarize the change: cairn owns admin CSRF with a uniform `__Host-cairn_csrf` double-submit token, tolerant of a missing `Origin`; a branded page replaces the raw framework 403; the non-admin `Origin` check is preserved.

In `docs/guides/upgrade-cairn.md`, add the matching `Consumers must:` entry for `0.35.0`.

- [ ] **Step 4: Update the explanation and route-structure docs**

In `docs/explanation/security-model.md`, document cairn as the CSRF authority: the uniform admin double-submit token (lazy and stable, `__Host-` on https, `SameSite=Strict`), the session cookie as a second layer, the non-admin `Origin` reproduction, and the `trustedOrigins` boundary.

In `docs/admin-route-structure.md`, add a one-line note that the canonical structure assumes `csrf: { checkOrigin: false }` and cairn's guard owns CSRF.

- [ ] **Step 5: Bump the version, run the doc and prose gates**

In `package.json`, set `"version": "0.35.0"`.

Run: `npm run check:docs && npm run check:reference && npm run check:package`
Expected: each exit 0.

Run: `prose-guard docs/guides/deploy-to-cloudflare.md docs/explanation/security-model.md` and any other doc touched.
Expected: no blocking tell (advisory tells are acceptable).

- [ ] **Step 6: Full gate, then commit**

Run: `npm run check && npm test`
Expected: check 0/0; test exit 0.

```bash
git add docs/reference/components.md docs/guides/deploy-to-cloudflare.md docs/guides/upgrade-cairn.md CHANGELOG.md docs/explanation/security-model.md docs/admin-route-structure.md package.json
git commit -m "Document cairn-owned CSRF and bump 0.35.0"
```

---

## Verification at the end of the plan

- [ ] `npm run check` reports 0 errors and 0 warnings.
- [ ] `npm test` exits 0.
- [ ] `npm run check:reference`, `npm run check:package`, and `npm run check:docs` each exit 0.
- [ ] The new guarantees hold in the integration suite: an admin form POST with no `Origin` but a valid token passes; an admin form POST with no token gets the branded 403; a non-admin cross-origin form POST is rejected.
- [ ] `examples/showcase` builds (`cd examples/showcase && npm run build`) and its admin still works, since it runs its own fake handle with the framework check on and the added hidden field is inert there.

## Notes for the implementer

- The showcase does not mount the login or auth routes and uses its own fake `handle`, so it needs no `svelte.config.js` change. The added `CsrfField` markup is inert there.
- Every admin mutation form must carry exactly one `CsrfField`. The guard validates the token on any admin unsafe form POST, so a missing field fails closed (a 403 in real use). The Task 10 test pins one field per POST form per component.
- The CSRF cookie is session-scoped on purpose. A page held open across a browser restart loses the cookie and shows the branded recovery page, which is the intended behavior.
- Do not change the auth actions (`requestAction`, `confirmAction`, `logoutAction`) or the session cookie. The token is validated in the guard before the action runs.
