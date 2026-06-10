# Diagnostics Pass 2: Email-Delivery Runtime Arm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a magic-link send failure visible instead of swallowed: await the send, return a typed additive `status` from `requestAction`, log the binding `code` and the mapped diagnostic condition, and give `LoginPage` a `send_error` and a `throttled` state.

**Architecture:** This is Arm A of the email-delivery design. The send stops being fire-and-forget; `requestAction` awaits it inside a `try`/`catch` and returns a `{ status, sent }` discriminant that is additive over the existing `sent` boolean. The Pass 1 condition registry gains two email conditions, and a small `email.ts` helper maps a binding error code to its condition, carried as a `CairnError` (its first production use; the `cause` is the original binding error). The send-failure log line gains `code` and `conditionId`, tying the `auth.link.send_failed` event to its registry condition. The non-editor and editor-send-ok paths stay byte-identical, so the common case never leaks; `send_error` and `throttled` are the editor-only signals the relaxed posture deliberately accepts.

**Tech Stack:** TypeScript (NodeNext ESM, `.js` import specifiers), Vitest (`vitest run`), `@cloudflare/vitest-pool-workers` for the integration project (runs `requestAction` in workerd against a real miniflare D1), `vitest-browser-svelte` for the component project, svelte-check for the type gate.

**Spec:** `docs/superpowers/specs/2026-06-08-cairn-email-delivery-and-environment-preflight-design.md` (Arm A, plus the two 2026-06-09 reconciliations: the Pass 2/3 docs split and the await-the-send timing side-channel noted not mitigated).

**Project gate (every task ends green):** the task's targeted test passes, `npm run check` reports 0 errors / 0 warnings, and `npm test` exits 0. The diagnostics module stays internal (no public subpath). The one public-surface change is the additive `status` field on the action result; the observable-log contract gains `code` and `conditionId` on `auth.link.send_failed`. Bump the minor to `0.38.0` (additive; a `Consumers may:` changelog line). The `delivery-*-split` parallel-load flake is known: if `npm test` exits 1 only on those two files with an import-timeout, re-run the full suite once to confirm green.

---

### Task 1: Add the two email conditions to the registry

**Files:**
- Modify: `src/lib/diagnostics/conditions.ts`
- Test: `src/tests/unit/conditions.test.ts` (extend)

The registry is the shared identity Pass 3's `cairn doctor` email-deliverability check reuses, so the remediation string lives here once. `email.sender-not-onboarded` is the exact ecxc fault (`E_SENDER_NOT_VERIFIED`); `email.send-failed` is the catch-all for any other binding failure.

- [ ] **Step 1: Write the failing test**

Add these cases to `src/tests/unit/conditions.test.ts` inside the existing `describe('condition registry', ...)` block:

```ts
  it('resolves the two email conditions', () => {
    expect(condition('email.sender-not-onboarded').severity).toBe('blocker');
    expect(condition('email.sender-not-onboarded').remediation).toMatch(/wrangler email sending enable/);
    expect(condition('email.sender-not-onboarded').logEvent).toBe('auth.link.send_failed');
    expect(condition('email.send-failed').severity).toBe('blocker');
    expect(condition('email.send-failed').logEvent).toBe('auth.link.send_failed');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/conditions.test.ts`
Expected: FAIL, `condition('email.sender-not-onboarded')` throws `unknown cairn condition`.

- [ ] **Step 3: Add the conditions**

In `src/lib/diagnostics/conditions.ts`, add these two entries to the `REGISTRY` object, after the existing `auth.csrf-origin-mismatch` entry (keep the trailing comma style of the file):

```ts
  'email.sender-not-onboarded': {
    id: 'email.sender-not-onboarded',
    severity: 'blocker',
    title: 'Email sending domain is not onboarded',
    why: 'The from-address domain has no enabled Cloudflare sending subdomain, so env.EMAIL.send has no aligned sender and the magic-link send throws E_SENDER_NOT_VERIFIED. No editor can sign in.',
    remediation: 'Onboard the sending domain with `wrangler email sending enable <domain>`, then re-deploy. The domain must match branding.from.',
    logEvent: 'auth.link.send_failed',
  },
  'email.send-failed': {
    id: 'email.send-failed',
    severity: 'blocker',
    title: 'Magic-link email send failed',
    why: 'The magic-link send threw for a reason other than a missing sender onboarding (a delivery error, a binding misconfiguration, or a custom sender failure), so the editor never received a link.',
    remediation: 'Read the auth.link.send_failed log record (the code and error fields) in Workers Logs, and check the EMAIL binding and the sender configuration.',
    logEvent: 'auth.link.send_failed',
  },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/conditions.test.ts`
Expected: PASS. The existing "every entry carries the required human fields" and "id matches the registry key" cases also cover the two new entries.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/diagnostics/conditions.ts src/tests/unit/conditions.test.ts
git commit -m "$(printf 'Add the email send-failure conditions to the registry\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: The errorCode helper and the send-failure condition mapping

**Files:**
- Modify: `src/lib/email.ts`
- Test: `src/tests/unit/email-send-failure.test.ts` (create)

`errorCode(err)` reads the `E_*` code a Cloudflare binding error carries, falling back to `undefined` for a custom sender that throws a plain `Error`. `emailSendFailure(err)` maps that code to its registered condition and returns a `CairnError` carrying the original error as `cause`. This is `CairnError`'s first production use; the catch site (Task 3) logs `failure.conditionId` and `errorCode(err)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/tests/unit/email-send-failure.test.ts
import { describe, it, expect } from 'vitest';
import { errorCode, emailSendFailure } from '../../lib/email.js';
import { CairnError } from '../../lib/diagnostics/index.js';

describe('errorCode', () => {
  it('reads a string code off a binding error', () => {
    expect(errorCode({ code: 'E_SENDER_NOT_VERIFIED' })).toBe('E_SENDER_NOT_VERIFIED');
  });

  it('falls back to undefined for a plain Error or a non-string code', () => {
    expect(errorCode(new Error('smtp down'))).toBeUndefined();
    expect(errorCode({ code: 42 })).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
  });
});

describe('emailSendFailure', () => {
  it('maps the not-verified code to the sender-not-onboarded condition', () => {
    const cause = Object.assign(new Error('not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
    const failure = emailSendFailure(cause);
    expect(failure).toBeInstanceOf(CairnError);
    expect(failure.conditionId).toBe('email.sender-not-onboarded');
    expect(failure.cause).toBe(cause);
  });

  it('maps any other failure to the generic send-failed condition', () => {
    const cause = new Error('smtp down');
    const failure = emailSendFailure(cause);
    expect(failure.conditionId).toBe('email.send-failed');
    expect(failure.cause).toBe(cause);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/email-send-failure.test.ts`
Expected: FAIL, `errorCode`/`emailSendFailure` are not exported from `email.js`.

- [ ] **Step 3: Add the helpers**

In `src/lib/email.ts`, add the `CairnError` import near the top (after the existing `AuthEnv` import):

```ts
import { CairnError } from './diagnostics/index.js';
```

Then add these two exports at the end of the file (after `cloudflareSend`):

```ts
/**
 * Read the E_* code a Cloudflare Email Sending binding error carries (E_SENDER_NOT_VERIFIED,
 * E_DELIVERY_FAILED, and the rest of the set). A custom injected sender that throws a plain Error
 * has no code, so this returns undefined and the record still logs cleanly.
 */
export function errorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/**
 * Map a magic-link send failure to its registered diagnostic condition, carrying the original error
 * as the cause. The not-verified code is the onboarding gap (the ecxc fault); everything else is the
 * generic send failure. The caller logs the conditionId and code, and returns a send_error status.
 */
export function emailSendFailure(err: unknown): CairnError {
  const id = errorCode(err) === 'E_SENDER_NOT_VERIFIED' ? 'email.sender-not-onboarded' : 'email.send-failed';
  return new CairnError(id, { cause: err });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/email-send-failure.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/tests/unit/email-send-failure.test.ts
git commit -m "$(printf 'Add the email error-code reader and send-failure condition mapping\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: Rewire requestAction (await, typed status, throttled, send-failure)

This is the behavioral core. The send is awaited (the `waitUntil` backgrounding is removed for it), and the action returns a `{ status, sent }` discriminant. The existing integration tests in `auth-request.test.ts` assert the old `{ sent: true }` shape and the old backgrounding, so they are updated here. The non-leak property is made explicit: the neutral and send-ok results are asserted byte-identical, and the deliberate `send_error`/`throttled` divergence is documented in the test, putting it in front of the security reviewer.

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Test: `src/tests/integration/auth-request.test.ts` (rewrite several cases)

- [ ] **Step 1: Confirm the current tests pass before the change**

Run: `npx vitest run src/tests/integration/auth-request.test.ts`
Expected: PASS. These pin the current `{ sent: true }` shape and the `waitUntil` backgrounding; this task changes both deliberately.

- [ ] **Step 2: Rewrite the affected integration tests**

In `src/tests/integration/auth-request.test.ts`, replace the **two** assertions in `describe('request a link (scenarios 1, 2)', ...)`.

The allow-listed case (was `expect(result).toEqual({ sent: true })`):

```ts
  it('sends exactly one link to an allow-listed editor and stores a token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ed@x.dev');
    expect(sent[0].html).toContain('https://test.dev/admin/auth/confirm?token=');
    expect(await countRows('magic_token')).toBe(1);
  });
```

The non-allow-listed case:

```ts
  it('returns the same response and sends nothing for a non-allow-listed email', async () => {
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ status: 'sent', sent: true });
    expect(sent).toHaveLength(0);
    expect(await countRows('magic_token')).toBe(0);
  });
```

Add a dedicated non-leak case at the end of that same `describe` block, asserting the byte-identical result and documenting the deliberate divergence:

```ts
  it('returns a byte-identical result for a stranger and an editor whose send succeeds (non-leak)', async () => {
    // The relaxed-non-leak posture (email-delivery design) keeps the neutral and send-ok paths
    // identical, so the common case never reveals allowlist membership. Only the send_error and
    // throttled paths differ, and they do so by design for editor feedback.
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes } = routesWithSink();
    const url = 'https://test.dev/admin/auth/request';
    const editorResult = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const strangerResult = await routes.requestAction(makeEvent({ url, form: { email: 'stranger@x.dev' } }));
    expect(editorResult).toEqual(strangerResult);
    expect(editorResult).toEqual({ status: 'sent', sent: true });
  });
```

Replace the cooldown case in `describe('request hardening (Unit 4)', ...)` to also assert the `throttled` status on the second call:

```ts
  it('suppresses a second request inside the cooldown window and reports throttled', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const first = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const second = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(first).toEqual({ status: 'sent', sent: true });
    expect(second).toEqual({ status: 'throttled', sent: false });
    expect(sent).toHaveLength(1);
    expect(await countRows('magic_token')).toBe(1);
  });
```

Replace the `waitUntil` backgrounding case (the send is no longer backgrounded) with one that proves the send is awaited and a failure reaches the result, and that `waitUntil` is not used for the send:

```ts
  it('awaits the send and never backgrounds it through waitUntil', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const promises: Promise<unknown>[] = [];
    let finished = false;
    const routes = createAuthRoutes({
      branding: { siteName: 'Test', from: 'noreply@test.dev' },
      send: async () => {
        await Promise.resolve();
        finished = true;
      },
    });
    const result = await routes.requestAction(
      makeEvent({ url, form: { email: 'ed@x.dev' }, waitUntil: (p) => promises.push(p) }),
    );
    expect(finished).toBe(true); // the send completed before requestAction returned
    expect(promises).toHaveLength(0); // the send was not handed to waitUntil
    expect(result).toEqual({ status: 'sent', sent: true });
  });

  it('returns send_error when the send rejects, after awaiting it', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const routes = createAuthRoutes({
      branding: { siteName: 'Test', from: 'noreply@test.dev' },
      send: async () => {
        throw Object.assign(new Error('not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
      },
    });
    const result = await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ status: 'send_error', sent: false });
    expect(await countRows('magic_token')).toBe(1); // the token row was written before the send threw
  });
```

Extend the `send_failed` logging case in `describe('request logging', ...)` to assert the `code` and `conditionId` fields:

```ts
  it('logs auth.link.send_failed with the binding code and the mapped condition when the send rejects', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = createAuthRoutes({
      branding: { siteName: 'Test', from: 'noreply@test.dev' },
      send: async () => {
        throw Object.assign(new Error('not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
      },
    });
    await routes.requestAction(makeEvent({ url, form: { email: 'ed@x.dev' } }));
    const record = errorSpy.mock.calls
      .map((c) => c[0] as { event?: string; code?: string; conditionId?: string })
      .find((r) => r.event === 'auth.link.send_failed');
    expect(record).toBeDefined();
    expect(record?.code).toBe('E_SENDER_NOT_VERIFIED');
    expect(record?.conditionId).toBe('email.sender-not-onboarded');
    vi.restoreAllMocks();
  });
```

- [ ] **Step 3: Run the rewritten tests to verify they fail against the current code**

Run: `npx vitest run src/tests/integration/auth-request.test.ts`
Expected: FAIL. The current `requestAction` returns `{ sent: true }` and backgrounds the send, so the `status`/`throttled`/`send_error`/no-`waitUntil` assertions fail.

- [ ] **Step 4: Rewire requestAction**

In `src/lib/sveltekit/auth-routes.ts`, add `emailSendFailure` and `errorCode` to the existing `email.js` import:

```ts
import { buildMagicLinkMessage, cloudflareSend, emailSendFailure, errorCode, type AuthBranding, type SendMagicLink } from '../email.js';
```

Add the result type above `createAuthRoutes` (after the `AuthRoutesConfig` interface):

```ts
/**
 * The request-action result. `status` is the discriminant; `sent` is kept for a site rendering its
 * own form against `form.sent`, so the field is additive. The neutral and send-ok paths return the
 * identical `{ status: 'sent', sent: true }`, so the common case never leaks allowlist membership.
 */
export type RequestResult =
  | { status: 'sent'; sent: true }
  | { status: 'send_error'; sent: false }
  | { status: 'throttled'; sent: false };
```

Replace the whole `requestAction` function body with:

```ts
  async function requestAction(event: RequestContext): Promise<RequestResult> {
    const env = event.platform?.env ?? {};
    const origin = requireOrigin(env);
    const db = requireDb(env);
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    // `email` here is unvalidated request input logged before the allowlist check, so bound the
    // logged value to the RFC 5321 maximum to cap an abusive record's size. A real editor's address
    // fits well under this; only a junk payload is truncated.
    log.info('auth.link.requested', { email: email.slice(0, 320) });

    const editor = email ? await findEditor(db, email) : null;
    // Non-editor: byte-identical to the editor send-ok path, so the response never leaks membership.
    if (!editor) return { status: 'sent', sent: true };

    const now = Date.now();
    // Per-email cooldown: an editor who requested within the window gets the throttled signal rather
    // than a second email. This reveals editor membership, the deliberate relaxed-non-leak posture.
    if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {
      return { status: 'throttled', sent: false };
    }

    const token = generateToken();
    await issueToken(db, email, await hashToken(token), now + TOKEN_TTL_MS, now);
    log.info('auth.token.minted', { email, expiresAt: now + TOKEN_TTL_MS });
    const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
    // The token row is the security-critical write the email depends on, so it is awaited first.
    // The send is now awaited too (no waitUntil backgrounding), so its outcome drives the response:
    // confirm the link went out before telling an editor to check their inbox. The cost is one
    // email-API round trip on the login POST, the right trade for a login flow.
    try {
      await send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link }));
    } catch (err) {
      // Map the binding failure to its registered condition (carried as a CairnError with the
      // original as cause), and log the greppable code plus the conditionId so the next onboarding
      // gap reads straight to its fix. The editor sees only a generic message, never this detail.
      const failure = emailSendFailure(err);
      log.error('auth.link.send_failed', { email, error: String(err), code: errorCode(err), conditionId: failure.conditionId });
      return { status: 'send_error', sent: false };
    }
    return { status: 'sent', sent: true };
  }
```

The `event.platform?.ctx`/`platform?.context` lookup and the `ctx.waitUntil(sending)`/`else await sending` branch are gone (the send is awaited directly). Leave every other handler in the file untouched.

- [ ] **Step 5: Run the targeted tests to verify they pass**

Run: `npx vitest run src/tests/integration/auth-request.test.ts`
Expected: PASS, all cases including the non-leak equality, throttled, await-not-background, send_error, and the `code`/`conditionId` log assertions.

- [ ] **Step 6: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0. If `npm test` exits 1 only on `delivery-*-split` with an import timeout, re-run the full suite once.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sveltekit/auth-routes.ts src/tests/integration/auth-request.test.ts
git commit -m "$(printf 'Await the magic-link send and return a typed request status\n\nThe send stops being fire-and-forget. requestAction awaits it and returns\na status discriminant (sent/send_error/throttled) additive over the sent\nboolean, logs the binding code and the mapped condition on failure, and\nkeeps the neutral and send-ok paths byte-identical so the common case\nnever leaks allowlist membership.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: LoginPage send_error and throttled states

**Files:**
- Modify: `src/lib/components/LoginPage.svelte`
- Test: `src/tests/component/LoginPage.test.ts` (extend)

The two new states render above the sign-in form (the form stays available to retry or correct the address), built on the existing `0.37.0` markup and the admin design system. The `sent` confirmation is unchanged. Legacy callers passing only `{ sent: true }` still hit the confirmation through the `form?.sent` fallback.

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/component/LoginPage.test.ts` inside the `describe('LoginPage', ...)` block:

```ts
  it('shows a send-error warning and keeps the form available', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'send_error', sent: false } });
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();
    await expect.element(screen.getByText(/trouble sending sign-in links/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });

  it('shows a throttled hint and keeps the form available', async () => {
    const screen = render(LoginPage, { data: { siteName: 'Test Site', error: null, csrf: 'csrf-tok' }, form: { status: 'throttled', sent: false } });
    await expect.element(screen.getByText(/requested a link recently/i)).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tests/component/LoginPage.test.ts`
Expected: FAIL, no warning text and no throttled hint render (the component does not yet read `status`).

- [ ] **Step 3: Widen the prop and add the states**

In `src/lib/components/LoginPage.svelte`, widen the `form` prop type in the `Props` interface:

```ts
    /** The action result. `sent` is true once a request was accepted; `status` discriminates the
     * neutral, send-error, and throttled outcomes. */
    form: { sent?: boolean; status?: 'sent' | 'send_error' | 'throttled' } | null;
```

The confirmation branch condition becomes status-aware while keeping the legacy `sent` fallback. Change the opening `{#if ...}` on the success block from:

```svelte
    {#if form?.sent && !dismissed}
```

to:

```svelte
    {#if (form?.status === 'sent' || form?.sent) && !dismissed}
```

In the `{:else}` block, add the two state panels immediately after the `<h1 class="text-center ...">Sign in to {data.siteName}</h1>` and its following `<p>`, and before the `{#if data.error}` block:

```svelte
      {#if form?.status === 'send_error'}
        <div role="alert" class="alert alert-warning mb-3 text-sm">
          We're having trouble sending sign-in links right now. Please contact the site owner.
        </div>
      {:else if form?.status === 'throttled'}
        <div role="status" class="alert mb-3 text-sm">
          You requested a link recently. Check your inbox, or wait a minute and try again.
        </div>
      {/if}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tests/component/LoginPage.test.ts`
Expected: PASS, all cases (the existing form, success, spam-guidance, and use-a-different-email cases still pass; the two new state cases pass).

- [ ] **Step 5: Check the admin prose gate**

Run: `npm run check:prose`
Expected: exit 0. The two new strings ship compiled in the component, so this gate scans them for AI tells. If it flags either string, rewrite for plain human cadence (one idea per sentence, no em dash) and re-run.

- [ ] **Step 6: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/LoginPage.svelte src/tests/component/LoginPage.test.ts
git commit -m "$(printf 'Add the LoginPage send-error and throttled states\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: Reference, changelog, upgrade guide, and the version bump

**Files:**
- Modify: `docs/reference/log-events.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/guides/upgrade-cairn.md`
- Modify: `package.json`

The additive `status` field and the two new log fields are observable changes, so they get a changelog and upgrade-guide entry. The minor bumps to `0.38.0`.

- [ ] **Step 1: Update the log-events reference**

In `docs/reference/log-events.md`, find the `auth.link.send_failed` row:

```
| `auth.link.send_failed` | error | The confirmation email send rejects. | `email`, `error` |
```

Replace its fields column to add `code` and `conditionId`:

```
| `auth.link.send_failed` | error | The confirmation email send rejects. | `email`, `error`, `code`, `conditionId` |
```

If the page carries a per-field prose note section below the table, add one line: `code` is the Cloudflare binding error code (`E_SENDER_NOT_VERIFIED` and the rest of the `E_*` set, or absent for a custom sender), and `conditionId` is the mapped diagnostic condition (`email.sender-not-onboarded` or `email.send-failed`). If the page is table-only, the column entry is sufficient.

- [ ] **Step 2: Add the changelog entry**

In `CHANGELOG.md`, add a `0.38.0` section at the top of the version list (match the file's existing heading style):

```markdown
## 0.38.0

- The magic-link send is now awaited rather than fire-and-forget, so a delivery failure reaches the
  login response instead of being swallowed. `requestAction` returns a `status` discriminant
  (`sent` | `send_error` | `throttled`) alongside the existing `sent` boolean, and `LoginPage` renders
  a send-error and a throttled state. The `auth.link.send_failed` log record gains a `code` (the
  Cloudflare binding error code) and a `conditionId` (the mapped diagnostic condition).
- Consumers may: read `form.status` to render the new states. A site rendering against `form.sent` is
  unaffected, since `sent` is unchanged.
```

- [ ] **Step 3: Add the upgrade-guide entry**

In `docs/guides/upgrade-cairn.md`, add a `0.38.0` entry in the same per-version style the file uses, stating that the change is additive (no required action), that `requestAction` now returns `{ status, sent }`, and that a site opts into the new states by reading `form.status`.

- [ ] **Step 4: Bump the version**

In `package.json`, change `"version": "0.37.0"` to `"version": "0.38.0"`.

- [ ] **Step 5: Run the doc and package gates**

Run: `npm run check:docs && npm run check:reference && npm run check:package`
Expected: all exit 0. No public export changed, so `check:reference` needs no new page.

- [ ] **Step 6: Run the project gate**

Run: `npm run check && npm test`
Expected: check 0/0, test exit 0.

- [ ] **Step 7: Commit**

```bash
git add docs/reference/log-events.md CHANGELOG.md docs/guides/upgrade-cairn.md package.json
git commit -m "$(printf 'Document the request status and send-failed log fields; bump 0.38.0\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: Correct the stale Cloudflare-email gotcha in CLAUDE.md

No code change. The `CLAUDE.md` "Durable gotcha (Cloudflare email)" section predates the 2025 Email Service and conflates the binding's call shapes. The rewrite states the three facts plainly. (The `cloudflare-email-sending-vs-routing` machine-local memory is corrected as a pass-end ritual step, not a plan task, since it lives outside the repo.)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite the gotcha section**

In `CLAUDE.md`, replace the body of the `## Durable gotcha (Cloudflare email)` section with the three plain facts. Keep the heading. The new body:

```markdown
Email *Sending* to arbitrary recipients is `env.EMAIL.send({ to, from, subject, html, text })`. The
real gate is the per-zone sending subdomain: onboard the `from` domain with `wrangler email sending
enable <domain>` (or the API) and the binding reaches any recipient. An un-onboarded sender throws
`E_SENDER_NOT_VERIFIED`. The `cloudflare:email` `EmailMessage`/mimetext MIME form is Email *Routing*'s
`message.forward()`, a different call that reaches only **verified** destinations; do not confuse the
two. Email Sending also needs Workers Paid plus dashboard onboarding.
```

(Adjust the surrounding sentence flow to match the section's existing voice. The three facts are: the per-zone subdomain is the gate, an unrestricted binding reaches any recipient, and Routing's `message.forward()` is the verified-destination call.)

- [ ] **Step 2: Check the prose gate on the edit**

Run: `prose-guard CLAUDE.md`
Expected: no blocking tell (em dash, banned phrase, structural). Advisory sweep-only findings in the file's pre-existing body do not gate.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(printf 'Correct the stale Cloudflare-email gotcha\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 7: Remove the login-preview scaffold and run the final gate

The throwaway `examples/showcase/src/routes/_login-preview/` route helped eyeball the states during implementation and ships in no release. Remove it, then run the full gate one last time.

**Files:**
- Delete: `examples/showcase/src/routes/_login-preview/` (untracked directory)

- [ ] **Step 1: Remove the preview route**

Run: `rm -rf examples/showcase/src/routes/_login-preview`
Expected: the directory is gone. It is untracked, so there is nothing to stage.

- [ ] **Step 2: Confirm it left no dangling reference**

Run: `grep -rn "_login-preview" examples/showcase/src docs 2>/dev/null`
Expected: no output. If anything references the route, remove that reference too.

- [ ] **Step 3: Final full gate**

Run: `npm run check && npm test && npm run check:docs && npm run check:reference && npm run check:package && npm run check:prose`
Expected: all green. Record the test file/count and the check result for the pass-end STATUS update. If `npm test` exits 1 only on the `delivery-*-split` files with an import timeout, re-run the full suite once to confirm green.

- [ ] **Step 4: Confirm the showcase still builds**

Run: `cd examples/showcase && npm run check`
Expected: 0 errors in `src/`. The showcase consumes the engine through the relative path, so this proves the widened `form` prop and the action result type compile against a real consumer. Return to the repo root afterward.

---

## Self-review notes

- **Spec coverage (Arm A).** Await the send (Task 3), the typed additive `status` result with the four-outcome matrix (Task 3), capture the binding error `code` (Tasks 2 and 3), the two `LoginPage` states (Task 4), and the non-leak test rewritten explicit with the deliberate divergence documented (Task 3). The docs split settled 2026-06-09 is Tasks 5 (change-docs and version) and 6 (the gotcha correction); the readiness checklist, the deploy-guide onboarding section, and the doctor reference stay Pass 3.
- **The CairnError reconciliation.** Arm A surfaces a send failure as a form `status`, not a rendered error, so there is no natural throw-and-render boundary here. Pass 2 gives `CairnError` its first production use as the carrier of the mapped condition (Task 2's `emailSendFailure`, used in Task 3's catch), and ties the `auth.link.send_failed` log event to its registry condition through the new `conditionId` field. The first thrown-and-rendered `CairnError` site moves to the Pass 3 `cairn doctor`. This is a deliberate reassessment of the Pass 1 aside that named Pass 2 the "throw-site"; it is recorded in STATUS and the handoff.
- **The timing side-channel.** Awaiting the send makes an editor's POST measurably slower than a non-editor's, a membership timing oracle strictly weaker than the explicit `send_error`/`throttled` leak the posture already accepts. Noted in the spec, flagged to the `web-auth-security-reviewer` at the pass-end gate, not mitigated (no constant-time floor). No plan task; it is a review-gate note.
- **Behavior changes that break existing tests, handled in-task.** The `{ sent: true }` shape (two cases) and the `waitUntil` backgrounding case in `auth-request.test.ts` are rewritten in Task 3, since this pass changes both deliberately. The `LoginPage` legacy `{ sent: true }` callers still hit the confirmation through the `form?.sent` fallback (Task 4).
- **Type consistency.** `RequestResult` (Task 3) is the discriminated union `{ status: 'sent'; sent: true } | { status: 'send_error'; sent: false } | { status: 'throttled'; sent: false }`. `errorCode` and `emailSendFailure` (Task 2) are imported into `auth-routes.ts` in Task 3. The `LoginPage` `form` prop (Task 4) is the structural `{ sent?: boolean; status?: 'sent' | 'send_error' | 'throttled' } | null`, matching the result's observable fields without importing the server type.
- **Security review at the gate.** The `web-auth-security-reviewer` is mandatory (auth/session/cookie path). It confirms the deliberate non-leak relaxation on `send_error`/`throttled` is the only body-level leak, that the timing side-channel is subsumed, that no token, session id, or magic-link URL reaches the result fields or the log fields, and that `code`/`conditionId`/`String(err)` cannot transitively carry the GitHub token or the link. The live admin smoke is in scope this pass (the login surface changes): mint a session via a D1 row per the smoke doc and eyeball the `send_error`/`throttled` states against a real Worker, or justify skipping if the component render proof is judged sufficient.
- **Pass-end (ritual, not plan tasks).** Simplify the changed code, run the review gate, correct the `cloudflare-email-sending-vs-routing` memory to match Task 6, append the post-mortem, update STATUS, and cut the publish window when the user asks (the held window is then `0.38.0` over the `0.37.0` `latest`).

---

## Post-mortem (pass landed 2026-06-10)

**What was built.** All seven tasks, as planned. The two email conditions joined the registry
(`5d5c865`), `errorCode`/`emailSendFailure` landed in `email.ts` (`a2174ea`), `requestAction` awaits
the send and returns the `RequestResult` discriminant (`57a7e5a`), `LoginPage` renders the
`send_error` and `throttled` states (`e218d3c`), the docs and the `0.38.0` bump landed (`8dd6609`),
the CLAUDE.md gotcha was corrected (`4862dce`), and the `_login-preview` scaffold was removed. The
simplifier tightened `errorCode`'s narrowing and extracted the failing-send test helper (`6c5ea1e`).

**Execution shape.** The pass ran across two sessions: Tasks 1 and 2 plus Task 3's edits landed in a
prior session that ended before Task 3's commit, and this session resumed from the dirty tree after
verifying the targeted suite green, then ran Tasks 4 through 7 in the main loop. The resume cost was
near zero because the plan's task boundaries made the tree state legible.

**Gate evidence (final, run first-hand).** `npm run check` 854 files 0/0; `npm test` 136 files / 846
tests exit 0; `check:docs`/`check:reference`/`check:package`/`check:prose` all exit 0; showcase
`check` 0 errors in `src/` (24 pre-existing errors in `node_modules` type declarations and
`vite.config.ts`, the known toolchain noise).

**The review gate found no Critical; the fold-in is `3f1d8f8`.** `web-auth-security-reviewer`
confirmed the locked posture is bounded (fixed-literal results, no token reaches the result, the
page, or the logs on engine paths) and rated the timing side-channel strictly weaker than the
deliberate `throttled` oracle. Its one guarantee-level catch: `String(err)` from the injected-sender
seam could carry the confirm URL into the logs; the fold-in scrubs the token query and caps the
field at 300 chars, with a pinning test. `svelte-reviewer` caught both auth reference pages stale
(`requestAction`'s return shape, and `loginLoad`'s `csrf` field missing since 0.35.0) plus
`RequestResult` being exported but unreachable from the barrel; the fold-in fixed the pages,
re-exported the type, gated the stale `?error=expired` alert behind `!form?.status`, and added the
engine-shape success render test. `cloudflare-workers-reviewer`'s Important: the structured `E_*`
`code` assumption is unproven against the live binding, while the repo's own record of the ecxc
outage shows a bare "not a verified address" string; the fold-in adds a message-scan fallback for
`E_*` codes and maps that observed substring to `email.sender-not-onboarded`, so the remediation
stays reachable under either shape.

**Live smoke: skipped with justification.** The component tests pin both new states and the
showcase compiles against the widened prop. The designed live proof is the queued ecxc bump to
`^0.38.0`, which puts `send_error`/`throttled` on the exact site where the originating finding was
filed; a local `wrangler dev` smoke (no real EMAIL binding) would prove strictly less.

**Decisions locked in.** `send_error` returns a plain 200 with a status field, not `fail(503)`: the
union stays uniform for the page and the failure is observable through the error-level log record
(commented at the return site). The LoginPage `form` prop stays structural (no server-type import),
a deliberate decoupling.

**Carry-forwards (recorded, not fixed).** (1) The live `E_*` error shape: treat the post-publish
ecxc bump as the empirical proof, and adjust `errorCode` to whatever the real binding throws before
runbooks lean on `conditionId`. (2) The cooldown is a SELECT-then-INSERT split, so concurrent POSTs
can multiply the one-email-per-minute throttle; token security is unaffected (the mint batch
replaces the prior row). Folding the window check into the mint closes it if wanted. (3) The awaited
send has no `waitUntil` tether, so a client disconnect mid-send can abandon the send after the token
row was written; the retry then sees `throttled` for up to 60s. The belt-and-suspenders tether
(`waitUntil` plus await) contradicts this plan's locked no-backgrounding test, so adopting it is a
deliberate future change. (4) A missing EMAIL binding maps to the generic `email.send-failed` though
it is precisely detectable; a dedicated condition belongs with Pass 3's environment preflight.
(5) The reference pages' signature drift went uncaught by every gate; a signature-currency check is
filed in the friction log for the gates-and-tooling pass. (6) Pre-existing and restated: the request
endpoint has no per-IP rate limit, and the new `throttled` oracle makes it more scriptable.
