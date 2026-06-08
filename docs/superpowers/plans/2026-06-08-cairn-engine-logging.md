# cairn engine logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the cairn engine structured, queryable diagnostics on the Cloudflare-first stack, routed through one internal chokepoint so the later admin-extension work can add a subscriber without a rewrite.

**Architecture:** A new internal `src/lib/log/` module owns one logger. Every engine diagnostic calls `log.info|warn|error(event, fields)`, which assembles a structured record (`{ level, event, timestamp, ...fields }`) and writes it to `console` as a JSON object. Workers Logs ingests and indexes it when a consumer sets `observability.enabled = true`. The module is not exported from any package subpath, so its API is free to grow. Call sites in the auth handlers, the admin guard, and the commit pipeline emit a fixed event vocabulary. The vocabulary is documented as public-observable API.

**Tech Stack:** TypeScript, SvelteKit, Cloudflare Workers, D1, Vitest (unit, integration via `@cloudflare/vitest-pool-workers`, component via Playwright). The design spec is `docs/superpowers/specs/2026-06-08-cairn-engine-logging-design.md`.

**Scope note (read before Task 1):** The spec lists `render.failed`. The engine has no request-time render call site that catches an error (rendering is build-time and consumer-side, and the editor preview is client-only behind the `MarkdownEditor` seam). `render.failed` is therefore deferred until a server-side render path exists, alongside the spec's named extension points. It is not in this plan's vocabulary. The two non-engine `console` calls stay as they are: `src/lib/vite/bin.ts` (a CLI) and `src/lib/components/chrome-guard.ts` (a dev-only browser guard). Only `src/lib/sveltekit/auth-routes.ts:55` (the send-failed log) is replaced.

---

### Task 1: The log core module

**Files:**
- Create: `src/lib/log/events.ts`
- Create: `src/lib/log/emit.ts`
- Create: `src/lib/log/index.ts`
- Test: `src/tests/unit/log-emit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/unit/log-emit.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { log } from '../../lib/log/index.js';

afterEach(() => vi.restoreAllMocks());

describe('log', () => {
  it('writes info to console.log with the envelope and the fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('commit.succeeded', { id: 'x' });
    expect(spy).toHaveBeenCalledTimes(1);
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ level: 'info', event: 'commit.succeeded', id: 'x' });
    expect(typeof record.timestamp).toBe('string');
    // The timestamp round-trips as an ISO 8601 string.
    expect(new Date(record.timestamp as string).toISOString()).toBe(record.timestamp);
  });

  it('maps warn and error to the matching console method', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.warn('commit.failed', { reason: 'conflict' });
    log.error('auth.link.send_failed', { error: 'boom' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect((warn.mock.calls[0][0] as Record<string, unknown>).level).toBe('warn');
    expect((error.mock.calls[0][0] as Record<string, unknown>).level).toBe('error');
  });

  it('lets the envelope keys win over a clashing field', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('commit.succeeded', { level: 'bogus', event: 'nope', timestamp: 'nope' } as Record<string, unknown>);
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record.level).toBe('info');
    expect(record.event).toBe('commit.succeeded');
    expect(record.timestamp).not.toBe('nope');
  });

  it('emits a record with no fields when none are passed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('auth.session.destroyed');
    const record = spy.mock.calls[0][0] as Record<string, unknown>;
    expect(record).toMatchObject({ level: 'info', event: 'auth.session.destroyed' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- log-emit`
Expected: FAIL, cannot resolve `../../lib/log/index.js`.

- [ ] **Step 3: Write the event vocabulary**

Create `src/lib/log/events.ts`:

```ts
// The cairn engine's diagnostic event vocabulary. Each name is the stable `type` a future
// admin-extension subscriber switches on, so it is public-observable API: renaming one is a
// breaking change. See docs/reference/log-events.md, kept in step with this union.
export type CairnLogEvent =
  | 'auth.link.requested'
  | 'auth.link.send_failed'
  | 'auth.token.minted'
  | 'auth.token.confirmed'
  | 'auth.session.created'
  | 'auth.session.destroyed'
  | 'commit.succeeded'
  | 'commit.failed'
  | 'guard.rejected';
```

- [ ] **Step 4: Write the logger**

Create `src/lib/log/emit.ts`:

```ts
// The engine's one logger and the single console chokepoint. Every diagnostic routes through
// `log`; today each call writes a structured JSON object to console, which Workers Logs ingests
// and indexes when a consumer sets observability.enabled. A future admin-extension pass adds a
// subscriber fan-out inside this module, leaving every call site unchanged.
import type { CairnLogEvent } from './events.js';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogRecord {
  level: LogLevel;
  event: CairnLogEvent;
  timestamp: string;
  [field: string]: unknown;
}

export interface Logger {
  info(event: CairnLogEvent, fields?: Record<string, unknown>): void;
  warn(event: CairnLogEvent, fields?: Record<string, unknown>): void;
  error(event: CairnLogEvent, fields?: Record<string, unknown>): void;
}

const sinkByLevel: Record<LogLevel, (record: LogRecord) => void> = {
  info: (record) => console.log(record),
  warn: (record) => console.warn(record),
  error: (record) => console.error(record),
};

function buildRecord(level: LogLevel, event: CairnLogEvent, fields: Record<string, unknown>): LogRecord {
  // The envelope keys are written last, so a stray field named level/event/timestamp cannot
  // corrupt the record shape a subscriber relies on.
  return { ...fields, level, event, timestamp: new Date().toISOString() };
}

function emit(level: LogLevel, event: CairnLogEvent, fields: Record<string, unknown> = {}): void {
  sinkByLevel[level](buildRecord(level, event, fields));
}

export const log: Logger = {
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
};
```

- [ ] **Step 5: Write the barrel**

Create `src/lib/log/index.ts`:

```ts
export { log } from './emit.js';
export type { Logger, LogLevel, LogRecord } from './emit.js';
export type { CairnLogEvent } from './events.js';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:unit -- log-emit`
Expected: PASS, 4 tests.

- [ ] **Step 7: Run the full check gate**

Run: `npm run check`
Expected: 0 errors, 0 warnings (the new files type-clean).

- [ ] **Step 8: Commit**

```bash
git add src/lib/log/events.ts src/lib/log/emit.ts src/lib/log/index.ts src/tests/unit/log-emit.test.ts
git commit -m "Add the internal structured logger and event vocabulary"
```

---

### Task 2: Wire the auth-flow events

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts` (the `requestAction`, `confirmAction`, and `logoutAction` bodies)
- Test: `src/tests/integration/auth-request.test.ts`, `src/tests/integration/auth-confirm.test.ts`

The auth handlers run against a real D1 in the integration project. The `_auth-harness.ts` helpers (`seedEditor`, `makeEvent`, `expectRedirect`) drive them. Console spies work in the workerd test env.

- [ ] **Step 1: Write the failing tests for the request path**

Append to `src/tests/integration/auth-request.test.ts` (inside the file, after the existing `describe` blocks):

```ts
describe('request logging', () => {
  const url = 'https://test.dev/admin/auth/request';

  it('logs auth.link.requested then auth.token.minted for an allow-listed editor', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { routes } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.requested');
    expect(events).toContain('auth.token.minted');
    vi.restoreAllMocks();
  });

  it('logs auth.link.requested but never auth.token.minted for a stranger', async () => {
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { routes } = routesWithSink();
    await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.requested');
    expect(events).not.toContain('auth.token.minted');
    vi.restoreAllMocks();
  });

  it('logs auth.link.send_failed when the send rejects', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = createAuthRoutes({
      branding: { siteName: 'Test', from: 'noreply@test.dev' },
      send: async () => {
        throw new Error('smtp down');
      },
    });
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const events = errorSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.link.send_failed');
    vi.restoreAllMocks();
  });
});
```

Add `vi` to the existing vitest import at the top of the file if absent: `import { describe, it, expect, beforeEach, vi } from 'vitest';`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:integration -- auth-request`
Expected: FAIL, the `event` arrays do not contain the new names.

- [ ] **Step 3: Wire the request handler**

In `src/lib/sveltekit/auth-routes.ts`, add the import near the other imports:

```ts
import { log } from '../log/index.js';
```

In `requestAction`, after the line `const email = String(form.get('email') ?? '').trim().toLowerCase();`, add:

```ts
    log.info('auth.link.requested', { email });
```

Inside the `if (!(await recentlyIssued(...)))` block, after `await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);`, add:

```ts
        log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
```

Replace the existing send-failure log. Change:

```ts
        const sending = send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link })).catch(
          (err) => console.error('cairn: magic-link send failed', err),
        );
```

to:

```ts
        const sending = send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link })).catch(
          (err) => log.error('auth.link.send_failed', { email, error: String(err) }),
        );
```

- [ ] **Step 4: Run the request tests to verify they pass**

Run: `npm run test:integration -- auth-request`
Expected: PASS, including the three new tests.

- [ ] **Step 5: Write the failing tests for confirm and logout**

Append to `src/tests/integration/auth-confirm.test.ts` a `describe` block that mints a valid token, confirms it, and asserts the events. Match the file's existing harness use (it already imports `seedEditor`, `makeEvent`, `expectRedirect` and mints tokens; reuse that exact setup). The assertions:

```ts
describe('confirm and logout logging', () => {
  it('logs auth.token.confirmed and auth.session.created on a valid confirm', async () => {
    // Arrange a valid token for ed@x.dev exactly as the existing confirm tests do, then:
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: confirmUrl, form: { token } })));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.token.confirmed');
    expect(events).toContain('auth.session.created');
    vi.restoreAllMocks();
  });

  it('logs auth.session.destroyed on logout when a session cookie is present', async () => {
    // Create a session row and a cookie jar holding its id exactly as the existing logout test does, then:
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expectRedirect(() => routes.logoutAction(logoutEvent));
    const events = infoSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    expect(events).toContain('auth.session.destroyed');
    vi.restoreAllMocks();
  });
});
```

Read the existing confirm and logout tests in this file first and copy their exact arrange steps (token minting, cookie jar, event construction) into the two tests above, replacing the comment lines. Add `vi` to the file's vitest import if absent.

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm run test:integration -- auth-confirm`
Expected: FAIL on the two new event assertions.

- [ ] **Step 7: Wire the confirm and logout handlers**

In `confirmAction`, after `const email = await consumeToken(db, await hashToken(token), now);` and its `if (!email)` guard, add:

```ts
    log.info('auth.token.confirmed', { email });
```

After `await createSession(db, id, email, now + SESSION_TTL_MS, now);`, add:

```ts
    log.info('auth.session.created', { email });
```

In `logoutAction`, change the deletion branch:

```ts
    if (id) await deleteSession(db, id);
```

to:

```ts
    if (id) {
      await deleteSession(db, id);
      log.info('auth.session.destroyed');
    }
```

Note the redaction rule: the session id and the raw token are never passed as fields. The confirm and session events carry only the email.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm run test:integration -- auth-confirm auth-request`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/sveltekit/auth-routes.ts src/tests/integration/auth-request.test.ts src/tests/integration/auth-confirm.test.ts
git commit -m "Emit structured auth-flow events through the logger"
```

---

### Task 3: Wire the guard.rejected event

**Files:**
- Modify: `src/lib/sveltekit/guard.ts` (the three rejection branches in `createAuthGuard`)
- Test: `src/tests/integration/auth-guard.test.ts`

The guard's three pre-`resolve` rejections each return a Response: the non-admin origin refusal (`csrfForbidden`), the deployed-http help page (`httpsRequiredResponse`), and the admin double-submit failure (`csrfRequiredResponse`). Each emits `guard.rejected` with a `reason`.

- [ ] **Step 1: Write the failing tests**

Read `src/tests/integration/auth-guard.test.ts` first to match its event-construction and `handle` invocation pattern. Append a `describe` block:

```ts
describe('guard rejection logging', () => {
  it('logs guard.rejected reason=origin for a non-admin cross-origin form POST', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Build a non-admin unsafe form POST whose Origin does not match url.origin, as the existing
    // origin test in this file does, and run it through createAuthGuard()'s handle.
    // ...arrange + act...
    const events = warnSpy.mock.calls.map((c) => (c[0] as { event?: string }).event);
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(events).toContain('guard.rejected');
    expect(reasons).toContain('origin');
    vi.restoreAllMocks();
  });

  it('logs guard.rejected reason=https for a deployed admin request over http', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Build an http://example.com/admin request (non-local host), run it through handle.
    // ...arrange + act...
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('https');
    vi.restoreAllMocks();
  });

  it('logs guard.rejected reason=csrf for an admin form POST with no valid token', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Build an https admin form POST with no/invalid __Host-cairn_csrf token, run it through handle.
    // ...arrange + act...
    const reasons = warnSpy.mock.calls.map((c) => (c[0] as { reason?: string }).reason);
    expect(reasons).toContain('csrf');
    vi.restoreAllMocks();
  });
});
```

Replace the comment lines with the concrete arrange/act steps copied from the matching existing tests in this file (the origin, https, and csrf rejection cases already exist there). Add `vi` to the vitest import if absent.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:integration -- auth-guard`
Expected: FAIL, no `guard.rejected` records.

- [ ] **Step 3: Wire the three rejection branches**

In `src/lib/sveltekit/guard.ts`, add the import:

```ts
import { log } from '../log/index.js';
```

In `createAuthGuard`'s returned `handle`, the non-admin branch becomes:

```ts
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request) && !originMatches(event)) {
        log.warn('guard.rejected', { reason: 'origin', path: pathname });
        return csrfForbidden();
      }
      return resolve(event);
    }
```

The deployed-http branch becomes:

```ts
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      log.warn('guard.rejected', { reason: 'https', path: pathname });
      return httpsRequiredResponse(event.url);
    }
```

The admin double-submit branch becomes:

```ts
    if (isUnsafeFormRequest(event.request) && !(await validateCsrfToken(event))) {
      log.warn('guard.rejected', { reason: 'csrf', path: pathname });
      return csrfRequiredResponse();
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:integration -- auth-guard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/guard.ts src/tests/integration/auth-guard.test.ts
git commit -m "Emit guard.rejected for the admin guard's pre-resolve refusals"
```

---

### Task 4: Wire the commit events

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (the `saveAction`, `createAction`, `deleteEntry`, `renameEntry` commit sites)
- Modify: `src/lib/sveltekit/nav-routes.ts` (the `navSave` commit site)
- Test: `src/tests/unit/content-routes-save.test.ts`, `src/tests/unit/content-routes-delete.test.ts`

Each mutation commits through `commitFiles`. A landed commit logs `commit.succeeded`; a failure logs `commit.failed` at `warn` for a 409 conflict and `error` otherwise. The fields are `concept`, `id`, and `editor` (the editor's email), plus `reason` or `error` on a failure.

- [ ] **Step 1: Write the failing tests**

In `src/tests/unit/content-routes-save.test.ts`, add two tests to the existing suite (it already drives `saveAction` with a fetch double and asserts redirects). The success test asserts the success record; the conflict test reuses the existing conflict scenario and asserts the failure record. Pattern:

```ts
it('logs commit.succeeded after a save lands', async () => {
  const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  // Arrange the same successful save the existing "saves" test uses, then act.
  // ...
  const record = infoSpy.mock.calls.map((c) => c[0] as { event?: string; editor?: string }).find((r) => r.event === 'commit.succeeded');
  expect(record).toBeTruthy();
  expect(record?.editor).toBe('ed@x.dev'); // the session editor's email
  vi.restoreAllMocks();
});

it('logs commit.failed reason=conflict on a 409', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Arrange the same conflict the existing conflict test uses (commitFiles throws CommitConflictError), then act.
  // ...
  const reasons = warnSpy.mock.calls.map((c) => (c[0] as { event?: string; reason?: string }));
  expect(reasons.some((r) => r.event === 'commit.failed' && r.reason === 'conflict')).toBe(true);
  vi.restoreAllMocks();
});
```

Copy the arrange/act from the existing save-success and conflict tests in the file, replacing the comment lines. Confirm the session editor email used by the harness (read the test's `saveEvent`/session setup) and assert that exact value.

In `src/tests/unit/content-routes-delete.test.ts`, add one test asserting `commit.succeeded` fires after a successful delete, copying the existing successful-delete arrange/act.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- content-routes-save content-routes-delete`
Expected: FAIL, no commit records.

- [ ] **Step 3: Wire `saveAction`**

In `src/lib/sveltekit/content-routes.ts`, add the import:

```ts
import { log } from '../log/index.js';
```

In `saveAction`, the commit `try/catch` becomes:

```ts
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: markdown },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Update ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
      log.info('commit.succeeded', { concept: concept.id, id, editor: editor.email });
    } catch (err) {
      if (isConflict(err)) {
        log.warn('commit.failed', { concept: concept.id, id, editor: editor.email, reason: 'conflict' });
        const message = 'This file changed since you opened it. Reload and reapply your edits.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}${suffix}`);
      }
      log.error('commit.failed', { concept: concept.id, id, editor: editor.email, error: String(err) });
      throw err;
    }
```

- [ ] **Step 4: Wire `deleteEntry`**

In `deleteEntry`, wrap its `commitFiles` call the same way. After the successful `commitFiles(...)` add `log.info('commit.succeeded', { concept: concept.id, id, editor: editor.email });`, and in its `catch` (matching the file's existing delete-commit error handling) add `log.warn('commit.failed', { concept: concept.id, id, editor: editor.email, reason: 'conflict' });` on the conflict branch and `log.error('commit.failed', { concept: concept.id, id, editor: editor.email, error: String(err) });` on the rethrow branch. Read the existing `deleteEntry` body and mirror the exact branch structure it already uses.

- [ ] **Step 5: Wire `createAction` and `renameEntry`**

Each of these also calls `commitFiles`. After each successful `commitFiles(...)`, add `log.info('commit.succeeded', { concept: concept.id, id, editor: editor.email });` using whichever local variable holds the entry id and the session editor in that function (read each body; `createAction` composes a new id, `renameEntry` has the source and target id, so log the target id). On their failure branches, mirror the save pattern (`warn` + `reason: 'conflict'` on a conflict, `error` + `error: String(err)` otherwise). Where a function does not already wrap `commitFiles` in a try/catch, add only the success log and let existing error handling stand, so this task introduces no behavior change beyond the success record.

- [ ] **Step 6: Wire `navSave`**

In `src/lib/sveltekit/nav-routes.ts`, add the `log` import and, after the successful `commitFiles(...)` in `navSave`, add `log.info('commit.succeeded', { concept: 'nav', id: 'site-config', editor: editor.email });` using the session editor variable in that function. Mirror the failure pattern in its existing `catch`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:unit -- content-routes-save content-routes-delete nav-routes-save`
Expected: PASS.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: exit 0 (no existing action test regressed; the added logs change no control flow).

- [ ] **Step 9: Commit**

```bash
git add src/lib/sveltekit/content-routes.ts src/lib/sveltekit/nav-routes.ts src/tests/unit/content-routes-save.test.ts src/tests/unit/content-routes-delete.test.ts
git commit -m "Emit commit.succeeded and commit.failed across the mutation commit sites"
```

---

### Task 5: The redaction safety net

**Files:**
- Test: `src/tests/integration/log-redaction.test.ts` (create)

A standing test that asserts the secret-bearing handlers never widen a record to leak a token or a session id. It drives the request and confirm handlers and scans every emitted record's serialized form for the raw secret values.

- [ ] **Step 1: Write the failing test**

Create `src/tests/integration/log-redaction.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedEditor, makeEvent, makeCookies } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { issueToken, createSession } from '../../lib/auth/store.js';
import { generateToken, generateSessionId, hashToken, sessionCookieName, TOKEN_TTL_MS, SESSION_TTL_MS } from '../../lib/auth/crypto.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

function routes() {
  return createAuthRoutes({ branding: { siteName: 'T', from: 'n@test.dev' }, send: async () => {} });
}

/** Capture every record any console method emits during `run`. */
async function records(run: () => Promise<unknown>): Promise<unknown[]> {
  const captured: unknown[] = [];
  const grab = (c: unknown[]) => captured.push(c[0]);
  vi.spyOn(console, 'log').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'warn').mockImplementation((...c) => grab(c));
  vi.spyOn(console, 'error').mockImplementation((...c) => grab(c));
  try {
    await run().catch(() => {});
  } finally {
    vi.restoreAllMocks();
  }
  return captured;
}

describe('log redaction', () => {
  it('never logs the raw magic-link token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    // Pin the token by issuing it directly, then confirm with the same value.
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now + TOKEN_TTL_MS, now);
    const captured = await records(() =>
      routes().confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies: makeCookies() })),
    );
    const blob = JSON.stringify(captured);
    expect(blob).not.toContain(token);
  });

  it('never logs the raw session id at logout', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const id = generateSessionId();
    const now = Date.now();
    await createSession(db, id, 'ed@x.dev', now + SESSION_TTL_MS, now);
    const cookies = makeCookies({ [sessionCookieName(true)]: id });
    const captured = await records(() =>
      routes().logoutAction(makeEvent({ url: 'https://test.dev/admin/auth/logout', form: {}, cookies })),
    );
    const blob = JSON.stringify(captured);
    expect(blob).not.toContain(id);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm run test:integration -- log-redaction`
Expected: PASS (Tasks 2's wiring already logs only the email, never the secret). If a test fails, a handler is leaking a secret into a field. Fix the handler, not the test.

- [ ] **Step 3: Commit**

```bash
git add src/tests/integration/log-redaction.test.ts
git commit -m "Pin that auth logging never leaks a token or session id"
```

---

### Task 6: Documentation

**Files:**
- Create: `docs/reference/log-events.md`
- Create: `docs/guides/read-cairn-logs.md`
- Modify: `docs/reference/README.md` (add the log-events link)
- Modify: `docs/guides/README.md` (add the read-cairn-logs link in the maintain group)
- Modify: `docs/explanation/security-model.md` (add the logging-and-redaction note)

Documentation is a pass dimension. The event vocabulary is public-observable, so it gets a reference page; the operator gets a how-to; the security model records what cairn logs and withholds. Draft each clean against the prose voice (`~/.claude/docs/prose-voice.md`); `prose-guard` blocks a file on a lexical or structural tell.

- [ ] **Step 1: Write the reference page**

Create `docs/reference/log-events.md`:

```markdown
# Reference: log events

cairn emits structured diagnostic events through `console`, which Cloudflare Workers Logs ingests
and indexes when a site sets `observability.enabled = true`. Each record carries an envelope
(`level`, `event`, `timestamp`) plus event-specific fields. The `event` name is a stable contract:
renaming one is a breaking change. To read these in production, see the
[read cairn's logs guide](../guides/read-cairn-logs.md).

The records carry an editor's email for attribution. They never carry a magic-link token, a session
id, or a magic-link's contents. See [the security model](../explanation/security-model.md) for the
redaction stance.

| Event | Level | Fires when | Fields |
|---|---|---|---|
| `auth.link.requested` | info | A magic-link request reaches `POST /admin/auth/request`. | `email` |
| `auth.token.minted` | info | A token is issued for an allow-listed editor. | `email`, `expiresAt` |
| `auth.link.send_failed` | error | The confirmation email send rejects. | `email`, `error` |
| `auth.token.confirmed` | info | A valid token is consumed at `POST /admin/auth/confirm`. | `email` |
| `auth.session.created` | info | A session row is created after a confirm. | `email` |
| `auth.session.destroyed` | info | A session is deleted at logout. | none |
| `commit.succeeded` | info | A content or nav commit lands on the branch. | `concept`, `id`, `editor` |
| `commit.failed` | warn or error | A commit fails. `warn` with `reason: "conflict"` on a 409, `error` with `error` otherwise. | `concept`, `id`, `editor`, `reason` or `error` |
| `guard.rejected` | warn | The admin guard refuses a request before `resolve()`. | `reason` (`csrf`, `origin`, or `https`), `path` |
```

- [ ] **Step 2: Write the how-to guide**

Create `docs/guides/read-cairn-logs.md`:

```markdown
# Read cairn's logs

cairn emits structured diagnostic events for the admin flow, the commit pipeline, and the request
guard. On Cloudflare, Workers Logs is the query surface, and turning it on is the only setup step.

## Turn on Workers Logs

Add this to your `wrangler.jsonc`:

```jsonc
{
  "observability": { "enabled": true }
}
```

Deploy. Cloudflare now ingests every `console` record from your Worker, indexes the JSON fields, and
stores them for seven days. cairn logs a JSON object per event, so each field is filterable.

## Find an event

In the Cloudflare dashboard, open your Worker and go to the Logs tab. Filter on `event` to scope to
one kind of record, for example `event = "commit.succeeded"` to see every save that landed, or
`editor = "jo@example.com"` to see one person's activity. The full event list is in the
[log events reference](../reference/log-events.md).

## Worked example: a failed save

An editor reports that a save did nothing. Filter on `event = "commit.failed"` and read the most
recent record. A `reason` of `conflict` means the file changed underneath them, and they need to
reload and reapply. An `error` field instead means the GitHub commit itself failed, and the value is
the underlying message to act on.

## Send logs elsewhere

Workers Logs is the zero-setup default. To forward records to Sentry, Honeycomb, or your own store,
wire a [Tail Worker](https://developers.cloudflare.com/workers/observability/logs/tail-workers/) or
an [OTLP destination](https://developers.cloudflare.com/workers/observability/) at the platform
level. cairn writes to `console`; the platform decides where that goes.
```

- [ ] **Step 3: Write the security-model note**

In `docs/explanation/security-model.md`, add a section (place it near the auth or render-safety
material, matching the page's existing heading depth):

```markdown
## What cairn logs

cairn emits structured diagnostic events for the auth flow, the commit pipeline, and the request
guard, written to `console` for Workers Logs (see the [log events reference](../reference/log-events.md)).
The records carry an editor's email for attribution, so an operator can answer who did what. They
withhold the secrets: no magic-link token, no session id in the clear, and no magic-link contents
ever enter a record. A standing redaction test drives the token-confirm and logout handlers and
asserts the raw secret never appears in any emitted record, so a later change cannot widen a field to
leak one.
```

- [ ] **Step 4: Wire the index links**

In `docs/reference/README.md`, add a list item linking `log-events.md` (match the file's existing list style). In `docs/guides/README.md`, add `read-cairn-logs.md` to the maintain group (the group that holds `upgrade-cairn.md`), matching its style.

- [ ] **Step 5: Run the docs gates**

Run: `npm run check:docs`
Expected: exit 0, every relative link and anchor resolves.

Run: `npm run check:reference`
Expected: exit 0 (the log module exports nothing from a package subpath, so coverage is unaffected; the new page is additive).

Run the prose gate on each authored file:
Run: `prose-guard docs/reference/log-events.md docs/guides/read-cairn-logs.md docs/explanation/security-model.md`
Expected: no blocking tell. Advisory tells (tricolon, anaphora, passive) do not block; fix a blocking tell by rewriting the sentence for human cadence.

- [ ] **Step 6: Commit**

```bash
git add docs/reference/log-events.md docs/guides/read-cairn-logs.md docs/reference/README.md docs/guides/README.md docs/explanation/security-model.md
git commit -m "Document the log events, the read-logs guide, and the redaction stance"
```

---

## Self-review

**Spec coverage.** The default sink (console JSON to Workers Logs) is Task 1. The record shape and the dotted-event vocabulary are Task 1. The single internal chokepoint is the `src/lib/log/` module, used by Tasks 2 to 4. The build-now event list is covered by Tasks 2 (auth), 3 (guard), and 4 (commit), minus `render.failed`, which the scope note defers because no engine request path renders. The redaction stance is Task 5. The three docs deliverables (reference page, how-to guide, security note) are Task 6, and the "stay internal this pass" decision is honored by exporting the module from no subpath. The deferred extension points (`event.locals.cairn.log`, `onEvent`, per-extension namespacing) are recorded in the spec and need no code here.

**Type consistency.** `CairnLogEvent` is defined once in Task 1 and imported everywhere. The logger methods are `info`/`warn`/`error` with the signature `(event, fields?)` across all call sites. The fields use stable names: `email`, `expiresAt`, `error`, `concept`, `id`, `editor`, `reason`, `path`. `commit.failed` uses `reason: 'conflict'` for a 409 and `error` otherwise, consistently in Task 4 and the reference table.

**Placeholder scan.** The call-site test steps (Tasks 2, 3, 4) say to copy the arrange/act from a named existing test in the same file rather than restate a long harness setup. That is a deliberate instruction with the exact file and scenario named, not a TODO. Every code edit shows the full code. The reference table, the guide, and the security note are written in full.
