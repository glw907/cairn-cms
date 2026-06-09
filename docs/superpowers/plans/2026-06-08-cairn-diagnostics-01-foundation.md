# Diagnostics Pass 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an internal `src/lib/diagnostics/` condition registry and `CairnError` primitive, and route the auth guard's three rejection responses through the registry, with no change to behavior.

**Architecture:** One registry maps a stable condition id to its severity, title, why, and remediation. The guard's three `guard.rejected` reasons (`https`, `csrf`, `origin`) each correspond to one registered condition, and a single `renderConditionResponse(id, ctx)` re-homes the rejection Responses the guard built inline. The data model is complete for the checklist and doctor surfaces that arrive in later passes; Pass 1 ships only the runtime renderer, whose consumer is the guard. `CairnError` is the throw primitive; its first throw-site is Pass 2, so Pass 1 lands and unit-tests it in isolation.

**Tech Stack:** TypeScript (NodeNext ESM, `.js` import specifiers), Vitest (`vitest run`), `@cloudflare/vitest-pool-workers` for the integration project, svelte-check for the type gate.

**Spec:** `docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md` (Pass 1 section).

**Project gate (every task ends green):** the task's targeted test passes, `npm run check` reports 0 errors / 0 warnings, and `npm test` exits 0. The module is internal, so `npm run check:reference` and `npm run check:package` must stay green with no reference edit. Do **not** add `src/lib/diagnostics` to any public barrel or to `package.json` exports.

---

### Task 1: The condition registry

**Files:**
- Create: `src/lib/diagnostics/conditions.ts`
- Test: `src/tests/unit/conditions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/conditions.test.ts
import { describe, it, expect } from 'vitest';
import { condition, allConditions, type CairnCondition } from '../../lib/diagnostics/conditions.js';

describe('condition registry', () => {
  it('resolves each guard condition by id', () => {
    expect(condition('edge.https-not-forced').severity).toBe('blocker');
    expect(condition('auth.csrf-token-invalid').title).toMatch(/csrf/i);
    expect(condition('auth.csrf-origin-mismatch').logEvent).toBe('guard.rejected');
  });

  it('throws on an unknown id', () => {
    expect(() => condition('nope.not-real')).toThrow(/unknown cairn condition/);
  });

  it('every entry carries the required human fields', () => {
    const required: (keyof CairnCondition)[] = ['id', 'severity', 'title', 'why', 'remediation'];
    for (const c of allConditions()) {
      for (const key of required) expect(c[key], `${c.id}.${key}`).toBeTruthy();
      expect(c.severity === 'blocker' || c.severity === 'warning').toBe(true);
    }
  });

  it('id matches the registry key for every entry', () => {
    for (const c of allConditions()) expect(condition(c.id)).toBe(c);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/conditions.test.ts`
Expected: FAIL, cannot resolve `../../lib/diagnostics/conditions.js`.

- [ ] **Step 3: Write the registry**

```ts
// src/lib/diagnostics/conditions.ts
// The cairn condition registry: one entry per known environment or operational failure mode. It is
// the shared identity the readiness checklist, the doctor probe, and the runtime renderer all draw
// from, so the three surfaces agree (the 1:1:1). Internal: exported from no public package subpath,
// so the shape stays free to grow, the same stance as src/lib/log/. Renaming an id is a breaking
// change to the observable contract. See
// docs/superpowers/specs/2026-06-08-cairn-diagnostics-initiative-design.md.
import type { CairnLogEvent } from '../log/index.js';

export type ConditionSeverity = 'blocker' | 'warning';

export interface CairnCondition {
  /** Stable, greppable id, e.g. 'edge.https-not-forced'. */
  id: string;
  severity: ConditionSeverity;
  /** Short human label. */
  title: string;
  /** One or two sentences on why the condition bites. */
  why: string;
  /** The fix, often a command. */
  remediation: string;
  /** Anchor into the readiness checklist doc, filled in when that doc lands (Pass 3). */
  docsAnchor?: string;
  /** The log vocabulary event this condition correlates with, if any. */
  logEvent?: CairnLogEvent;
}

const REGISTRY: Record<string, CairnCondition> = {
  'edge.https-not-forced': {
    id: 'edge.https-not-forced',
    severity: 'blocker',
    title: 'Always Use HTTPS is off',
    why: 'The JS-free admin sign-in posts a form, and the framework CSRF guard rejects a form POST whose origin scheme does not match, so an admin reached over http hits an opaque 403.',
    remediation: 'Turn on Always Use HTTPS for the zone under SSL/TLS, Edge Certificates, and keep HSTS on.',
    logEvent: 'guard.rejected',
  },
  'auth.csrf-token-invalid': {
    id: 'auth.csrf-token-invalid',
    severity: 'blocker',
    title: 'Admin CSRF token check failed',
    why: 'An admin form POST carried no valid __Host-cairn_csrf double-submit token, usually a stale tab or blocked cookies.',
    remediation: 'Open the sign-in page fresh, allow cookies for the site, and request a new link.',
    logEvent: 'guard.rejected',
  },
  'auth.csrf-origin-mismatch': {
    id: 'auth.csrf-origin-mismatch',
    severity: 'blocker',
    title: 'Non-admin form Origin rejected',
    why: "A non-admin unsafe form POST carried an Origin that did not match the site, so cairn's restored framework Origin check rejected it.",
    remediation: 'Post the form from the same origin, or check a proxy that strips or rewrites the Origin header.',
    logEvent: 'guard.rejected',
  },
};

/** Resolve a condition by id. Throws on an unknown id, since ids are compile-time constants. */
export function condition(id: string): CairnCondition {
  const found = REGISTRY[id];
  if (!found) throw new Error(`unknown cairn condition: ${id}`);
  return found;
}

/** Every registered condition, for the checklist generator and coverage tests. */
export function allConditions(): CairnCondition[] {
  return Object.values(REGISTRY);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/conditions.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/diagnostics/conditions.ts src/tests/unit/conditions.test.ts
git commit -m "Add the cairn condition registry"
```

---

### Task 2: The CairnError primitive

**Files:**
- Create: `src/lib/diagnostics/error.ts`
- Test: `src/tests/unit/cairn-error.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/cairn-error.test.ts
import { describe, it, expect } from 'vitest';
import { CairnError } from '../../lib/diagnostics/error.js';

describe('CairnError', () => {
  it('carries the condition id and the resolved condition', () => {
    const err = new CairnError('edge.https-not-forced');
    expect(err.conditionId).toBe('edge.https-not-forced');
    expect(err.condition.title).toBe('Always Use HTTPS is off');
  });

  it('narrows with instanceof and defaults its message to the condition title', () => {
    const err: unknown = new CairnError('auth.csrf-token-invalid');
    expect(err instanceof CairnError).toBe(true);
    expect(err instanceof Error).toBe(true);
    if (err instanceof CairnError) expect(err.message).toBe('Admin CSRF token check failed');
  });

  it('preserves an overriding message and a cause', () => {
    const cause = new Error('E_SENDER_NOT_VERIFIED');
    const err = new CairnError('edge.https-not-forced', { message: 'custom', cause });
    expect(err.message).toBe('custom');
    expect(err.cause).toBe(cause);
  });

  it('throws when constructed with an unknown condition id', () => {
    expect(() => new CairnError('nope.not-real')).toThrow(/unknown cairn condition/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/cairn-error.test.ts`
Expected: FAIL, cannot resolve `../../lib/diagnostics/error.js`.

- [ ] **Step 3: Write CairnError**

```ts
// src/lib/diagnostics/error.ts
// CairnError: a thrown failure that names a known condition. A catch site narrows on it, logs from
// the condition, and renders the condition's message in place of an opaque string. Its first
// throw-site is Pass 2 (the email send mapping); Pass 1 lands and tests the primitive.
import { condition, type CairnCondition } from './conditions.js';

export class CairnError extends Error {
  readonly conditionId: string;
  readonly condition: CairnCondition;

  constructor(conditionId: string, options?: { cause?: unknown; message?: string }) {
    const resolved = condition(conditionId);
    super(options?.message ?? resolved.title, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'CairnError';
    this.conditionId = conditionId;
    this.condition = resolved;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/cairn-error.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/diagnostics/error.ts src/tests/unit/cairn-error.test.ts
git commit -m "Add the CairnError primitive"
```

---

### Task 3: The diagnostics barrel

**Files:**
- Create: `src/lib/diagnostics/index.ts`
- Test: `src/tests/unit/diagnostics-barrel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/diagnostics-barrel.test.ts
import { describe, it, expect } from 'vitest';
import { condition, allConditions, CairnError } from '../../lib/diagnostics/index.js';

describe('diagnostics barrel', () => {
  it('re-exports the registry helpers and CairnError', () => {
    expect(typeof condition).toBe('function');
    expect(allConditions().length).toBeGreaterThan(0);
    expect(new CairnError('edge.https-not-forced')).toBeInstanceOf(CairnError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/diagnostics-barrel.test.ts`
Expected: FAIL, cannot resolve `../../lib/diagnostics/index.js`.

- [ ] **Step 3: Write the barrel**

```ts
// src/lib/diagnostics/index.ts
// Internal barrel for the diagnostics model. Not re-exported from any public package subpath.
export { condition, allConditions } from './conditions.js';
export type { CairnCondition, ConditionId, ConditionSeverity } from './conditions.js';
export { CairnError } from './error.js';
```

Note: `ConditionId` is added to `conditions.ts` in this step as `export type ConditionId = string;` is **not** wanted. Instead, add this line to `conditions.ts` right after the `CairnCondition` interface so the barrel's type re-export resolves:

```ts
/** The set of registered ids. A string alias today; tighten to a union if call sites want it. */
export type ConditionId = string;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/diagnostics-barrel.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/diagnostics/index.ts src/lib/diagnostics/conditions.ts src/tests/unit/diagnostics-barrel.test.ts
git commit -m "Add the internal diagnostics barrel"
```

---

### Task 4: Extract the shared admin-response helpers

This is a behavior-preserving refactor. `applySecurityHeaders` and `brandedAdminPage` move out of `guard.ts` into a shared module so both the guard's resolve path and the new condition renderer use one definition. Avoids a guard-to-condition-renderer import cycle.

**Files:**
- Create: `src/lib/sveltekit/admin-response.ts`
- Modify: `src/lib/sveltekit/guard.ts` (remove the two local helpers, import them)
- Test: `src/tests/unit/admin-response.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/admin-response.test.ts
import { describe, it, expect } from 'vitest';
import { applySecurityHeaders, brandedAdminPage } from '../../lib/sveltekit/admin-response.js';

describe('admin-response helpers', () => {
  it('applies the baseline security headers', () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });

  it('builds a branded html response, no-store and hardened', () => {
    const res = brandedAdminPage(400, '<!doctype html><p>hi</p>');
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/admin-response.test.ts`
Expected: FAIL, cannot resolve `../../lib/sveltekit/admin-response.js`.

- [ ] **Step 3: Create the shared module**

```ts
// src/lib/sveltekit/admin-response.ts
// Shared response helpers for cairn's admin pages: the baseline security headers and a branded
// full-document response. Extracted from guard.ts so the guard's resolve path and the condition
// renderer share one definition.

/**
 * Attach the baseline security headers to an admin response. No full CSP; see the auth-hardening
 * design. frame-ancestors is the modern clickjacking control and the one CSP directive included.
 */
export function applySecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Content-Security-Policy', "frame-ancestors 'none'");
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

/** A branded full-document admin page, hardened with the baseline headers and never cached. */
export function brandedAdminPage(status: number, body: string): Response {
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  applySecurityHeaders(headers);
  return new Response(body, { status, headers });
}
```

- [ ] **Step 4: Update guard.ts to import the helpers**

In `src/lib/sveltekit/guard.ts`, add the import near the other sveltekit imports (after the `csrf-required-page.js` import):

```ts
import { applySecurityHeaders, brandedAdminPage } from './admin-response.js';
```

Then delete the now-duplicated local definitions of `applySecurityHeaders` (lines 39-50) and `brandedAdminPage` (lines 52-57). Leave `httpsRequiredResponse`, `csrfForbidden`, and `csrfRequiredResponse` in place for now; Task 6 removes them. Leave the `applySecurityHeaders(response.headers)` call on the resolve path untouched; it now calls the imported helper.

- [ ] **Step 5: Run the targeted tests to verify they pass**

Run: `npx vitest run src/tests/unit/admin-response.test.ts src/tests/integration/auth-guard.test.ts`
Expected: PASS. The guard integration tests still pass, proving the extraction changed no behavior.

- [ ] **Step 6: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sveltekit/admin-response.ts src/lib/sveltekit/guard.ts src/tests/unit/admin-response.test.ts
git commit -m "Extract the shared admin-response helpers from the guard"
```

---

### Task 5: The condition-to-Response renderer

**Files:**
- Create: `src/lib/sveltekit/condition-response.ts`
- Test: `src/tests/unit/condition-response.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/condition-response.test.ts
import { describe, it, expect } from 'vitest';
import { renderConditionResponse, REASON_CONDITION } from '../../lib/sveltekit/condition-response.js';
import { condition } from '../../lib/diagnostics/index.js';

describe('renderConditionResponse', () => {
  it('renders the branded HTTPS page over https for the https condition', async () => {
    const res = renderConditionResponse('edge.https-not-forced', { url: new URL('http://test.dev/admin') });
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    const body = await res.text();
    expect(body).toContain('Always Use HTTPS');
    expect(body).toContain('https://test.dev/admin');
  });

  it('renders the branded CSRF recovery page for the token condition', async () => {
    const res = renderConditionResponse('auth.csrf-token-invalid');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    expect(await res.text()).toContain('Back to sign-in');
  });

  it('renders the plain-text 403 for the origin condition', async () => {
    const res = renderConditionResponse('auth.csrf-origin-mismatch');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toMatch(/text\/plain/);
    expect(await res.text()).toBe('Cross-site POST form submissions are forbidden');
  });

  it('throws for an id with no renderer', () => {
    expect(() => renderConditionResponse('nope.not-real')).toThrow();
  });

  it('maps every guard reason to a registered condition', () => {
    for (const id of Object.values(REASON_CONDITION)) {
      expect(condition(id).id).toBe(id);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/condition-response.test.ts`
Expected: FAIL, cannot resolve `../../lib/sveltekit/condition-response.js`.

- [ ] **Step 3: Write the renderer**

```ts
// src/lib/sveltekit/condition-response.ts
// The runtime renderer leg of the diagnostics model: map a condition to the Response the guard
// serves. Re-homes the three rejection responses guard.ts built inline, keyed by condition id, so
// the guard's reason, the registered condition, and the served page stay in step.
import { brandedAdminPage } from './admin-response.js';
import { httpsRequiredPage } from './https-required-page.js';
import { csrfRequiredPage } from './csrf-required-page.js';
import { condition } from '../diagnostics/index.js';

/** The guard.rejected reasons, each mapped to its registered condition id. */
export const REASON_CONDITION = {
  https: 'edge.https-not-forced',
  csrf: 'auth.csrf-token-invalid',
  origin: 'auth.csrf-origin-mismatch',
} as const;

export type GuardReason = keyof typeof REASON_CONDITION;

/** Render the Response the guard serves for a rejection, by its condition id. */
export function renderConditionResponse(id: string, ctx: { url?: URL } = {}): Response {
  // Assert the id is registered before rendering, keeping the renderer in 1:1 with the registry.
  condition(id);
  switch (id) {
    case REASON_CONDITION.https: {
      const httpsUrl = new URL(ctx.url!);
      httpsUrl.protocol = 'https:';
      return brandedAdminPage(400, httpsRequiredPage(httpsUrl.toString()));
    }
    case REASON_CONDITION.csrf:
      return brandedAdminPage(403, csrfRequiredPage());
    case REASON_CONDITION.origin:
      return new Response('Cross-site POST form submissions are forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    default:
      throw new Error(`no runtime renderer for condition: ${id}`);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/condition-response.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/condition-response.ts src/tests/unit/condition-response.test.ts
git commit -m "Add the condition-to-Response renderer"
```

---

### Task 6: Route the guard through the renderer

**Files:**
- Modify: `src/lib/sveltekit/guard.ts`
- Test: `src/tests/integration/auth-guard.test.ts` (existing; must stay green, no edit required)

- [ ] **Step 1: Confirm the existing guard tests pass before the change**

Run: `npx vitest run src/tests/integration/auth-guard.test.ts`
Expected: PASS. These assert the three rejection Responses (status, content-type, body, headers) and the three `guard.rejected` reasons. They are the regression proof that this task changes no behavior.

- [ ] **Step 2: Rewire the guard**

In `src/lib/sveltekit/guard.ts`:

Add the renderer import next to the `admin-response.js` import from Task 4:

```ts
import { renderConditionResponse } from './condition-response.js';
```

Delete these now-unused imports, since the renderer owns the page builders:

```ts
import { httpsRequiredPage } from './https-required-page.js';
import { csrfRequiredPage } from './csrf-required-page.js';
```

Delete the three local response helpers `httpsRequiredResponse`, `csrfForbidden`, and `csrfRequiredResponse`.

Replace the three rejection `return` statements inside the `handle` function. The non-admin origin branch:

```ts
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request) && !originMatches(event)) {
        log.warn('guard.rejected', { reason: 'origin', path: pathname });
        return renderConditionResponse('auth.csrf-origin-mismatch');
      }
      return resolve(event);
    }
```

The deployed-http branch:

```ts
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      log.warn('guard.rejected', { reason: 'https', path: pathname });
      return renderConditionResponse('edge.https-not-forced', { url: event.url });
    }
```

The admin token branch:

```ts
    if (isUnsafeFormRequest(event.request) && !(await validateCsrfToken(event))) {
      log.warn('guard.rejected', { reason: 'csrf', path: pathname });
      return renderConditionResponse('auth.csrf-token-invalid');
    }
```

Leave the `guard.rejected` log lines exactly as shown (the `reason` strings are the public log contract and do not change). Leave the resolve-path `applySecurityHeaders(response.headers)` call untouched.

- [ ] **Step 3: Run the guard tests to verify they still pass**

Run: `npx vitest run src/tests/integration/auth-guard.test.ts`
Expected: PASS, unchanged. Same statuses, bodies, headers, and reasons as before the rewire.

- [ ] **Step 4: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0. `guard.ts` no longer references `httpsRequiredPage`, `csrfRequiredPage`, or the deleted helpers, so check reports no unused symbols.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/guard.ts
git commit -m "Route the guard rejections through the condition renderer"
```

---

### Task 7: Confirm the surface stayed internal

No code change. This task verifies Pass 1 added no public API and no doc drift.

- [ ] **Step 1: Confirm no public export leaked**

Run: `npm run check:reference && npm run check:package`
Expected: both exit 0 with no change. `src/lib/diagnostics` appears in no public subpath and no reference page, which is correct.

- [ ] **Step 2: Confirm the diagnostics module is not re-exported by a barrel**

Run: `grep -rn "diagnostics" src/lib/index.ts src/lib/sveltekit/index.ts`
Expected: the only hit is `condition-response.ts` importing `../diagnostics/index.js` internally. No barrel re-exports `diagnostics`. If a barrel does re-export it, remove that line; the module is internal for Pass 1.

- [ ] **Step 3: Final full gate**

Run: `npm run check && npm test && npm run check:reference && npm run check:package`
Expected: all green. Record the test file/count and the check result for the pass-end STATUS update.

---

## Self-review notes

- **Spec coverage.** The registry (Task 1), `CairnError` (Task 2), the barrel (Task 3), and the runtime renderer with the two-page migration (Tasks 4-6) cover the Pass 1 section of the spec. The two-CSRF-conditions decision is realized as `auth.csrf-token-invalid` and `auth.csrf-origin-mismatch`. The checklist and doctor renderers are correctly absent; they belong to Pass 3.
- **No public surface.** Task 7 enforces the internal-module decision, so `check:reference` and `check:package` need no edit and the docs dimension for Pass 1 is "nothing public to document." The pass-end STATUS and memory updates are the `cairn-pass` ritual, not plan tasks.
- **Behavior preservation.** Tasks 4 and 6 are proven by the pre-existing `auth-guard.test.ts`, which pins the rejection statuses, bodies, headers, and log reasons. Keeping it green is the regression gate.
- **CairnError consumer.** Its first throw-site is Pass 2; Pass 1 lands the tested primitive. This is the one deliverable without a Pass 1 runtime caller, called out so the implementer does not hunt for one.
