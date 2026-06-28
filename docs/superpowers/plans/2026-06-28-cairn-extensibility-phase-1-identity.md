> **SUPERSEDED (2026-06-28), WRONG SCOPE MODEL, KEPT AS HISTORY ONLY.** This plan implemented an
> identity/permissions substrate that is out of cairn's scope; the merge was reverted (`f8359cc`). See the
> charter (`CLAUDE.md` "What cairn is" and `docs/internal/what-cairn-is-and-is-not.md`). Do not execute.

# Developer Extensibility Phase 1: Identity Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize cairn's editor-only, `/admin`-only magic-link auth into a unified principal model (email + session + scopes + trust tier) usable on any route, with a developer authorize callback, the `signIn` seam, and the enforced `./extend` surface, so phases 2 and 3 build on a settled, secured identity foundation.

**Architecture:** A `Principal` replaces the single-role `Editor` as the identity the engine reads. A session row carries an `auth_tier` (`admin` or `member`) set at mint time; `admin:*` scopes are granted only to an admin-tier session whose email is in the editor allowlist, and custom scopes come from a developer `authorize` callback resolved live, lazily, and fail-closed. The guard resolves identity everywhere but enforces only `/admin` (an admin-tier `admin:*` session); developers gate their own routes with `requireScope`. Magic-link stays the only built-in authenticator; `signIn(verifiedEmail)` is the server-only seam for any externally verified mechanism. Everything a customization depends on is exported from one enforced `@glw907/cairn-cms/extend` subpath.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), SvelteKit 2, Cloudflare Workers + D1, Vitest with `@cloudflare/vitest-pool-workers` (`cloudflare:test`), Web Crypto.

## Global Constraints

- **Source of truth spec:** `docs/superpowers/specs/2026-06-28-cairn-developer-extensibility-design.md`. Every task implements part of it; reread the cited section before starting a task.
- **D1 access through prepared statements only.** No ORM. Store functions take the `AUTH_DB` binding plus primitives and stay free of SvelteKit. Callers pass `now`/`expiresAt` in epoch milliseconds.
- **Tokens and session ids are 256-bit url-safe CSPRNG values; only the SHA-256 hash of a magic-link token is stored, never the token.** Reuse `src/lib/auth/crypto.ts` (`generateSessionId`, `generateToken`, `hashToken`).
- **The session cookie keeps the `__Host-` prefix on https, bare on local http** (`sessionCookieName(secure)`); `httpOnly`, `secure` on https, `SameSite=Lax`, explicit `maxAge`.
- **admin scope is gated by the editor allowlist regardless of auth mechanism.** The trust tier is defense-in-depth; the allowlist is the true admin gate.
- **The authorize callback must never break the request:** the engine wraps it in try/catch plus an engine-owned deadline and falls back to built-in scopes only (fail-closed for custom scopes), emitting `auth.authorize.failed`.
- **Every diagnosable path emits a log event through `src/lib/log` (`log.info`/`log.warn`/`log.error`); event names are a stable public contract** (`docs/reference/log-events.md`). Records carry an email for attribution, never a token or session id.
- **Comments follow TSDoc** (`npm run check:comments` over `src/lib`); no em dash in comments.
- **The full gate for "done":** the task's targeted test green, then `npm run check` (0 errors / 0 warnings), then `npm test` (exit 0). Commit only when green.
- **`npm run check` is bare `svelte-check`, the type gate.** It is distinct from the `check:*` doc/package gates (`check:reference`, `check:package`, `check:extension-surface`, `check:comments`, `check:version`), which are separate scripts run individually (in CI and at the phase gate), not chained into `check`. When a task says "run the gate" it means `npm run check && npm test`; a named `check:*` gate is called out explicitly where it applies.
- **TDD, frequent commits, one logical change per commit.** Commit messages use Conventional Commits; footer `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

### Task 1: Add `auth_tier` to sessions and a rate-limit table

**Files:**
- Create: `migrations/0001_principal.sql`
- Test: `src/tests/integration/auth-schema.test.ts` (Modify: add cases)

**Interfaces:**
- Produces: a `session.auth_tier TEXT NOT NULL CHECK (auth_tier IN ('admin','member'))` column, and an `auth_rate` table `(bucket TEXT, window_start INTEGER, count INTEGER, PRIMARY KEY (bucket, window_start))` for per-IP send throttling. Existing rows get `auth_tier` via a default at migration time.

- [ ] **Step 1: Read the current schema and schema test.** Read `migrations/0000_auth.sql` and `src/tests/integration/auth-schema.test.ts` to match style. The test pool applies every file in `migrations/` in lexical order before each suite.

- [ ] **Step 2: Write the migration.**

```sql
-- migrations/0001_principal.sql
-- Phase 1 of developer extensibility: sessions carry a trust tier, and the public login path
-- gets a per-IP rate-limit counter. Timestamps are epoch milliseconds.

-- A session's trust tier, set at mint time. admin:* scopes are granted only to an admin-tier
-- session whose email is in the editor allowlist; a member-tier session never reaches /admin.
-- Existing sessions predate members and were all editor logins, so they backfill to 'admin'.
ALTER TABLE session ADD COLUMN auth_tier TEXT NOT NULL DEFAULT 'admin'
  CHECK (auth_tier IN ('admin', 'member'));

-- Per-IP fixed-window counter for the now-public magic-link send. One row per (bucket, window).
CREATE TABLE auth_rate (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
```

- [ ] **Step 3: Write failing tests for the new shape.** Append to `auth-schema.test.ts`:

```ts
import { env } from 'cloudflare:test';

it('session has an auth_tier column constrained to admin|member', async () => {
  const cols = await env.AUTH_DB.prepare('PRAGMA table_info(session)').all<{ name: string }>();
  expect(cols.results.map((c) => c.name)).toContain('auth_tier');
  await expect(
    env.AUTH_DB.prepare(
      "INSERT INTO session (id, email, expires_at, created_at, auth_tier) VALUES ('s1','a@b.c',1,1,'bogus')",
    ).run(),
  ).rejects.toThrow();
});

it('auth_rate table exists with a composite key', async () => {
  await env.AUTH_DB.prepare(
    "INSERT INTO auth_rate (bucket, window_start, count) VALUES ('ip:1.2.3.4', 100, 1)",
  ).run();
  const row = await env.AUTH_DB.prepare('SELECT count FROM auth_rate WHERE bucket = ?')
    .bind('ip:1.2.3.4')
    .first<{ count: number }>();
  expect(row?.count).toBe(1);
});
```

- [ ] **Step 4: Run the schema test.** `npx vitest run src/tests/integration/auth-schema.test.ts` — expect PASS (the pool applied `0001`).

- [ ] **Step 5: Run the gate and commit.** `npm run check && npm test`, then:

```bash
git add migrations/0001_principal.sql src/tests/integration/auth-schema.test.ts
git commit -m "feat(auth): add session auth_tier and auth_rate table"
```

---

### Task 2: The scope model and the role mapping

**Files:**
- Modify: `src/lib/auth/types.ts`
- Create: `src/lib/auth/scopes.ts`
- Test: `src/tests/unit/auth-scopes.test.ts`

**Interfaces:**
- Produces:
  - In `types.ts`: `type AuthTier = 'admin' | 'member'`; `interface Principal { email: string; displayName: string; scopes: string[]; tier: AuthTier }`. `Role` and `Editor` stay (used by the allowlist store and the editor-management surface).
  - In `scopes.ts`: `const ADMIN_OWNER = 'admin:owner'`, `const ADMIN_EDITOR = 'admin:editor'`; `function rolesToScopes(role: Role): string[]`; `function scopesToRole(scopes: string[]): Role | null`; `function hasScope(principal: Principal, scope: string): boolean`; `function hasAdminScope(principal: Principal): boolean`. Matching is opaque exact-match.

- [ ] **Step 1: Write the failing test.**

```ts
// src/tests/unit/auth-scopes.test.ts
import { describe, it, expect } from 'vitest';
import { ADMIN_OWNER, ADMIN_EDITOR, rolesToScopes, scopesToRole, hasScope, hasAdminScope } from '../../lib/auth/scopes.js';
import type { Principal } from '../../lib/auth/types.js';

const p = (scopes: string[], tier: 'admin' | 'member' = 'admin'): Principal => ({
  email: 'a@b.c', displayName: 'A', scopes, tier,
});

describe('scopes', () => {
  it('maps roles to admin scopes', () => {
    expect(rolesToScopes('owner')).toEqual([ADMIN_OWNER, ADMIN_EDITOR]);
    expect(rolesToScopes('editor')).toEqual([ADMIN_EDITOR]);
  });
  it('derives the role from scopes, owner winning', () => {
    expect(scopesToRole([ADMIN_OWNER, ADMIN_EDITOR])).toBe('owner');
    expect(scopesToRole([ADMIN_EDITOR])).toBe('editor');
    expect(scopesToRole(['member'])).toBe(null);
  });
  it('matches scopes exactly, not hierarchically', () => {
    expect(hasScope(p(['member', 'member:gold']), 'member')).toBe(true);
    expect(hasScope(p(['member:gold']), 'member')).toBe(false);
    expect(hasScope(p([ADMIN_EDITOR]), 'admin')).toBe(false);
  });
  it('detects any admin scope', () => {
    expect(hasAdminScope(p([ADMIN_EDITOR]))).toBe(true);
    expect(hasAdminScope(p(['member']))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`Cannot find module '../../lib/auth/scopes.js'`). `npx vitest run src/tests/unit/auth-scopes.test.ts`

- [ ] **Step 3: Add the types.** In `src/lib/auth/types.ts`, after the `Role`/`Editor` block:

```ts
/** A session's trust tier, set at mint time. See the extensibility spec, "Sessions and the trust-tier partition". */
export type AuthTier = 'admin' | 'member';

/**
 * The identity the engine reads on any route: an email, a display name, the granted scopes, and the
 * session's trust tier. Replaces `Editor` as the runtime identity; `Editor`/`Role` remain the
 * allowlist-row shape behind editor management.
 */
export interface Principal {
  email: string;
  displayName: string;
  scopes: string[];
  tier: AuthTier;
}
```

- [ ] **Step 4: Write the implementation.**

```ts
// src/lib/auth/scopes.ts
// The scope vocabulary and the role<->scope mapping. cairn's built-in scopes gate /admin; a
// developer declares any other scope by string. Matching is opaque exact-match: requireScope('member')
// matches a principal holding 'member', not 'member:gold'. See the extensibility spec, "The principal".
import type { Principal, Role } from './types.js';

/** The owner scope: full admin, including editor management. */
export const ADMIN_OWNER = 'admin:owner';
/** The editor scope: content management under /admin. Every owner also holds it. */
export const ADMIN_EDITOR = 'admin:editor';

/** The admin scopes an allowlist role grants. An owner holds both; an editor holds only the editor scope. */
export function rolesToScopes(role: Role): string[] {
  return role === 'owner' ? [ADMIN_OWNER, ADMIN_EDITOR] : [ADMIN_EDITOR];
}

/**
 * The editor role derived from a scope set, owner winning when both are held, or null when the
 * principal holds no admin scope. Gates owner-only editor management, so it is security-relevant.
 */
export function scopesToRole(scopes: string[]): Role | null {
  if (scopes.includes(ADMIN_OWNER)) return 'owner';
  if (scopes.includes(ADMIN_EDITOR)) return 'editor';
  return null;
}

/** Exact-match scope test. */
export function hasScope(principal: Principal, scope: string): boolean {
  return principal.scopes.includes(scope);
}

/** True when the principal holds any admin scope. */
export function hasAdminScope(principal: Principal): boolean {
  return principal.scopes.includes(ADMIN_OWNER) || principal.scopes.includes(ADMIN_EDITOR);
}
```

- [ ] **Step 5: Run the test (PASS), run the gate, commit.**

```bash
npx vitest run src/tests/unit/auth-scopes.test.ts && npm run check && npm test
git add src/lib/auth/types.ts src/lib/auth/scopes.ts src/tests/unit/auth-scopes.test.ts
git commit -m "feat(auth): add Principal, AuthTier, and the scope/role mapping"
```

---

### Task 3: Store changes — tiered sessions, principal-row resolution, fixation, forget

**Files:**
- Modify: `src/lib/auth/store.ts`
- Test: `src/tests/integration/auth-store.test.ts` (Modify: add cases)

**Interfaces:**
- Consumes: the `auth_tier` column (Task 1), `AuthTier` (Task 2).
- Produces:
  - `createSession(db, id, email, tier: AuthTier, expiresAt, now)` — the `tier` parameter is new (added before `expiresAt`).
  - `resolvePrincipalRow(db, id, now): Promise<{ email: string; tier: AuthTier; role: Role | null; displayName: string | null } | null>` — resolves a session WITHOUT an inner join to `editor`, left-joining for the role and the editor `display_name`; a non-editor session yields `role: null` and `displayName: null`, not null.
  - `deleteSessionsForEmail(db, email): Promise<void>` — fixation: delete prior sessions for an email before minting a new one.
  - `forgetPrincipal(db, email): Promise<void>` — delete all cairn identity rows (sessions, tokens) for an email.
  - `checkAndIncrementRate(db, bucket, now, windowMs, limit): Promise<boolean>` — true when under the limit (and increments), false when the window is exhausted.

- [ ] **Step 1: Write the failing tests.** Append to `auth-store.test.ts` (it imports from `../../lib/auth/store.js` and uses `env.AUTH_DB` + `seedEditor`/`countRows` from `_auth-harness.js`):

```ts
import { createSession, resolvePrincipalRow, deleteSessionsForEmail, forgetPrincipal, checkAndIncrementRate } from '../../lib/auth/store.js';

it('resolvePrincipalRow resolves a member session with role null and no display name (no inner join)', async () => {
  await createSession(env.AUTH_DB, 'sm', 'member@x.io', 'member', Date.now() + 1000, Date.now());
  const row = await resolvePrincipalRow(env.AUTH_DB, 'sm', Date.now());
  expect(row).toEqual({ email: 'member@x.io', tier: 'member', role: null, displayName: null });
});

it('resolvePrincipalRow left-joins the role and display name for an editor session', async () => {
  await seedEditor('boss@x.io', 'Boss', 'owner');
  await createSession(env.AUTH_DB, 'sa', 'boss@x.io', 'admin', Date.now() + 1000, Date.now());
  const row = await resolvePrincipalRow(env.AUTH_DB, 'sa', Date.now());
  expect(row).toEqual({ email: 'boss@x.io', tier: 'admin', role: 'owner', displayName: 'Boss' });
});

it('resolvePrincipalRow returns null for an expired session', async () => {
  await createSession(env.AUTH_DB, 'se', 'x@x.io', 'member', Date.now() - 1, Date.now());
  expect(await resolvePrincipalRow(env.AUTH_DB, 'se', Date.now())).toBeNull();
});

it('deleteSessionsForEmail clears prior sessions (fixation defense)', async () => {
  await createSession(env.AUTH_DB, 's1', 'd@x.io', 'member', Date.now() + 1000, Date.now());
  await deleteSessionsForEmail(env.AUTH_DB, 'd@x.io');
  expect(await resolvePrincipalRow(env.AUTH_DB, 's1', Date.now())).toBeNull();
});

it('forgetPrincipal deletes sessions and tokens for an email', async () => {
  await createSession(env.AUTH_DB, 'sf', 'gone@x.io', 'member', Date.now() + 1000, Date.now());
  await env.AUTH_DB.prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?,?,?,?)')
    .bind('h', 'gone@x.io', Date.now() + 1000, Date.now()).run();
  await forgetPrincipal(env.AUTH_DB, 'gone@x.io');
  expect(await resolvePrincipalRow(env.AUTH_DB, 'sf', Date.now())).toBeNull();
});

it('checkAndIncrementRate allows up to the limit then refuses in-window', async () => {
  const now = 1_000_000;
  expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now, 60_000, 2)).toBe(true);
  expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 1, 60_000, 2)).toBe(true);
  expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 2, 60_000, 2)).toBe(false);
  // A later window resets.
  expect(await checkAndIncrementRate(env.AUTH_DB, 'ip:9.9.9.9', now + 60_001, 60_000, 2)).toBe(true);
});
```

  Substep: convert the existing `resolveSession` cases in `auth-store.test.ts` to `resolvePrincipalRow` (the inner-join resolver is removed in Task 7 Step 6, and Task 7 confirms zero references before deleting it). Update each converted case's `createSession(...)` call to the new tiered signature by inserting the tier argument (`'admin'` for editor sessions). Drop the `resolveSession` import from this test file.

- [ ] **Step 2: Run, expect FAIL** (`resolvePrincipalRow` not exported). `npx vitest run src/tests/integration/auth-store.test.ts`

- [ ] **Step 3: Edit `createSession` to take a tier.** Replace the existing `createSession` body's INSERT to include `auth_tier`, and add the `tier` parameter:

```ts
export async function createSession(
  db: D1Database,
  id: string,
  email: string,
  tier: AuthTier,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO session (id, email, expires_at, created_at, auth_tier) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, expiresAt, now, tier),
  ]);
}
```

Add `import type { ..., AuthTier } from './types.js';` to the existing type import.

- [ ] **Step 4: Add the new functions.** Append to `store.ts`:

```ts
/**
 * Resolve a session to its email and tier without requiring an editor row, left-joining `editor`
 * for the role. A member session (email not in the allowlist) yields `role: null`, a valid scopeless
 * principal, where the prior inner-join `resolveSession` would have returned null and logged the
 * member out. An expired session resolves to null.
 */
export async function resolvePrincipalRow(
  db: D1Database,
  id: string,
  now: number,
): Promise<{ email: string; tier: AuthTier; role: Role | null; displayName: string | null } | null> {
  const row = await db
    .prepare(
      `SELECT s.email AS email, s.auth_tier AS tier, e.role AS role, e.display_name AS display_name
       FROM session s LEFT JOIN editor e ON e.email = s.email
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, now)
    .first<{ email: string; tier: AuthTier; role: Role | null; display_name: string | null }>();
  return row
    ? { email: row.email, tier: row.tier, role: row.role ?? null, displayName: row.display_name ?? null }
    : null;
}

/** Delete every session row for an email. Called before minting a new session, to defeat fixation. */
export async function deleteSessionsForEmail(db: D1Database, email: string): Promise<void> {
  await db.prepare('DELETE FROM session WHERE email = ?').bind(email).run();
}

/** Delete all cairn-owned identity rows for an email (sessions and pending tokens). For erasure. */
export async function forgetPrincipal(db: D1Database, email: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(email),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
  ]);
}

/**
 * Fixed-window per-bucket rate check. Computes the window start from `now`, upserts the counter, and
 * returns true when the post-increment count is within `limit`. Old windows are left to a sweep on the
 * next write for the same bucket; the composite key keeps rows bounded per active bucket.
 */
export async function checkAndIncrementRate(
  db: D1Database,
  bucket: string,
  now: number,
  windowMs: number,
  limit: number,
): Promise<boolean> {
  const windowStart = now - (now % windowMs);
  const res = await db.batch([
    db.prepare('DELETE FROM auth_rate WHERE bucket = ? AND window_start < ?').bind(bucket, windowStart),
    db
      .prepare(
        `INSERT INTO auth_rate (bucket, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(bucket, windowStart),
  ]);
  const count = (res[1].results?.[0] as { count: number } | undefined)?.count ?? limit + 1;
  return count <= limit;
}
```

- [ ] **Step 5: Keep `resolveSession` compiling for now.** The guard still imports it; Task 7 removes that. Leave the old `resolveSession` in place this task. (`npm run check` would fail on an unused export only if a lint rule flags it; it does not — the export stays referenced by the guard until Task 7.)

- [ ] **Step 6: Update every `createSession` caller, run the gate, commit.** `createSession` now has a new required `tier` parameter (fourth, before `expiresAt`), so EVERY existing call site must insert `'admin'` (Task 8 sets the real tier on the magic-link path). Run `grep -rn 'createSession(' src/ packages/ examples/` and update each call site found; the known ones to fix in this task so the tree compiles:
  - `src/lib/sveltekit/auth-routes.ts` `confirmAction` (the one production call): `await createSession(db, id, email, 'admin', now + SESSION_TTL_MS, now);`
  - `src/tests/integration/auth-store.test.ts` (the converted `resolveSession`→`resolvePrincipalRow` cases from Step 1's substep, plus any other `createSession` use).
  - `src/tests/integration/log-redaction.test.ts` (seeds a session to assert redaction).
  - the showcase / dev backend under `examples/` and `packages/` if any seed a session (the `grep` is authoritative; insert `'admin'` at each).

```bash
npm run check && npm test
git add src/lib/auth/store.ts src/lib/sveltekit/auth-routes.ts src/tests/integration/ packages/ examples/
git commit -m "feat(auth): tiered sessions, principal-row resolution, fixation, forget, rate-limit"
```

---

### Task 4: The authorize-callback runner

**Files:**
- Create: `src/lib/auth/authorize.ts`
- Modify: `src/lib/log/events.ts` (extend the `CairnLogEvent` union)
- Modify: `docs/reference/log-events.md` (add `auth.authorize.failed`)
- Test: `src/tests/unit/auth-authorize.test.ts`

**Interfaces:**
- Produces:
  - `type Authorize = (ctx: { email: string; platform: App.Platform | undefined }) => Promise<string[]> | string[]` — declared structurally to avoid an ambient dependency: `type AuthorizeContext = { email: string; platform: unknown }`, `type Authorize = (ctx: AuthorizeContext) => Promise<string[]> | string[]`.
  - `const AUTHORIZE_TIMEOUT_MS = 1000` — the engine-owned deadline.
  - `runAuthorize(authorize: Authorize | undefined, ctx: AuthorizeContext, deadlineMs?: number): Promise<string[]>` — runs the callback under try/catch and a timeout; on any throw, timeout, or non-array return it logs `auth.authorize.failed` and returns `[]` (fail-closed for custom scopes).

- [ ] **Step 1: Write the failing test.**

```ts
// src/tests/unit/auth-authorize.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runAuthorize } from '../../lib/auth/authorize.js';
import { log } from '../../lib/log/index.js';

const ctx = { email: 'a@b.c', platform: undefined };

describe('runAuthorize', () => {
  it('returns the callback scopes on success', async () => {
    expect(await runAuthorize(() => ['member'], ctx)).toEqual(['member']);
    expect(await runAuthorize(async () => ['member:gold'], ctx)).toEqual(['member:gold']);
  });
  it('returns [] and logs when the callback throws', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    expect(await runAuthorize(() => { throw new Error('boom'); }, ctx)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('auth.authorize.failed', expect.objectContaining({ email: 'a@b.c' }));
    spy.mockRestore();
  });
  it('returns [] and logs on timeout', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    // Widen the gap (deadline 5ms vs callback 200ms) so the deadline fires first without flake.
    const slow = () => new Promise<string[]>((r) => setTimeout(() => r(['member']), 200));
    expect(await runAuthorize(slow, ctx, 5)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('auth.authorize.failed', expect.objectContaining({ error: 'timeout' }));
    spy.mockRestore();
  });
  it('returns [] for a missing callback without logging', async () => {
    expect(await runAuthorize(undefined, ctx)).toEqual([]);
  });
  it('returns [] for a non-array return', async () => {
    const spy = vi.spyOn(log, 'error').mockImplementation(() => {});
    // @ts-expect-error deliberately wrong return
    expect(await runAuthorize(() => 'nope', ctx)).toEqual([]);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run src/tests/unit/auth-authorize.test.ts`

- [ ] **Step 3: Extend the log-event union.** `log.info`/`log.warn`/`log.error` take an `event: CairnLogEvent`, a closed union in `src/lib/log/events.ts`, so a new event name must be added there before any call compiles. Add `| 'auth.authorize.failed'` to the `CairnLogEvent` union. The union is the source of truth; `docs/reference/log-events.md` (Step 5) is its paired mirror, so update both together.

- [ ] **Step 4: Implement.**

```ts
// src/lib/auth/authorize.ts
// Runs a site's authorize callback to grant custom scopes, but never lets it break the request. The
// callback is wrapped in try/catch and an engine-owned deadline; any throw, timeout, or non-array
// return falls back to [] (custom scopes denied; built-in editor scopes are added by the caller), and
// logs auth.authorize.failed. See the extensibility spec, "Scope resolution: live, lazy, fail-closed".
import { log } from '../log/index.js';

/** The context cairn passes the callback: the verified email and the platform (for the dev's own D1). */
export interface AuthorizeContext {
  email: string;
  platform: unknown;
}

/** A site's authorize callback. Returns the custom scopes to grant this email, or [] to grant none. */
export type Authorize = (ctx: AuthorizeContext) => Promise<string[]> | string[];

/** The engine-owned deadline for the authorize callback. Not a callback parameter, so it cannot drift. */
export const AUTHORIZE_TIMEOUT_MS = 1000;

/**
 * Resolve custom scopes from a site's authorize callback, fail-closed. A missing callback yields []
 * silently; a throw, a timeout past `deadlineMs`, or a non-array return yields [] and an error log.
 */
export async function runAuthorize(
  authorize: Authorize | undefined,
  ctx: AuthorizeContext,
  deadlineMs = AUTHORIZE_TIMEOUT_MS,
): Promise<string[]> {
  if (!authorize) return [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), deadlineMs);
    });
    const result = await Promise.race([Promise.resolve(authorize(ctx)), timeout]);
    if (!Array.isArray(result) || result.some((s) => typeof s !== 'string')) {
      log.error('auth.authorize.failed', { email: ctx.email, error: 'non-array return' });
      return [];
    }
    return result;
  } catch (err) {
    log.error('auth.authorize.failed', { email: ctx.email, error: err instanceof Error ? err.message : String(err) });
    return [];
  } finally {
    if (timer) clearTimeout(timer);
  }
}
```

- [ ] **Step 5: Document the event.** In `docs/reference/log-events.md`, add a row under the auth events: `auth.authorize.failed` | error | the site's authorize callback threw or timed out; custom scopes denied for this request | fields: `email`, `error`.

- [ ] **Step 6: Run (PASS), gate, commit.**

```bash
npx vitest run src/tests/unit/auth-authorize.test.ts && npm run check && npm test
git add src/lib/auth/authorize.ts src/lib/log/events.ts docs/reference/log-events.md src/tests/unit/auth-authorize.test.ts
git commit -m "feat(auth): bounded fail-closed authorize callback runner"
```

---

### Task 5: Principal resolution (built-in editor scopes + authorize)

**Files:**
- Create: `src/lib/auth/resolve.ts`
- Test: `src/tests/integration/auth-resolve.test.ts`

**Interfaces:**
- Consumes: `resolvePrincipalRow` (Task 3), `rolesToScopes` (Task 2), `runAuthorize`/`Authorize` (Task 4).
- Produces: `resolvePrincipal(deps: { db: D1Database; authorize?: Authorize; platform: unknown; deadlineMs?: number }, id: string, now: number): Promise<Principal | null>`. Resolves the session row, grants admin scopes only when `tier === 'admin'` and the email is in the allowlist (the row's `role`), and adds custom scopes from `runAuthorize`. A valid session with no scopes is a scopeless principal, not null.

- [ ] **Step 1: Write the failing test.**

```ts
// src/tests/integration/auth-resolve.test.ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createSession } from '../../lib/auth/store.js';
import { resolvePrincipal } from '../../lib/auth/resolve.js';
import { seedEditor } from './_auth-harness.js';

const now = Date.now();

describe('resolvePrincipal', () => {
  it('grants admin scopes for an admin-tier allowlisted session', async () => {
    await seedEditor('owner@x.io', 'O', 'owner');
    await createSession(env.AUTH_DB, 'a1', 'owner@x.io', 'admin', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'a1', now);
    expect(p).toMatchObject({ email: 'owner@x.io', tier: 'admin', scopes: ['admin:owner', 'admin:editor'] });
  });
  it('withholds admin scopes from a member-tier session even if allowlisted', async () => {
    await seedEditor('dual@x.io', 'D', 'editor');
    await createSession(env.AUTH_DB, 'm1', 'dual@x.io', 'member', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'm1', now);
    expect(p?.scopes).toEqual([]);
    expect(p?.tier).toBe('member');
  });
  it('adds custom scopes from the authorize callback', async () => {
    await createSession(env.AUTH_DB, 'm2', 'fan@x.io', 'member', now + 1000, now);
    const authorize = ({ email }: { email: string }) => (email === 'fan@x.io' ? ['member'] : []);
    const p = await resolvePrincipal({ db: env.AUTH_DB, authorize, platform: undefined }, 'm2', now);
    expect(p).toMatchObject({ email: 'fan@x.io', tier: 'member', scopes: ['member'] });
  });
  it('returns a scopeless principal for an unentitled verified email', async () => {
    await createSession(env.AUTH_DB, 'm3', 'new@x.io', 'member', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'm3', now);
    expect(p).toEqual({ email: 'new@x.io', displayName: 'new@x.io', scopes: [], tier: 'member' });
  });
  it('returns null for an unknown session id', async () => {
    expect(await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'nope', now)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run src/tests/integration/auth-resolve.test.ts`

- [ ] **Step 3: Implement.**

```ts
// src/lib/auth/resolve.ts
// Resolve a session id to a Principal: built-in admin scopes (admin tier + allowlist role) plus the
// site's custom scopes (the authorize callback, fail-closed). The display name falls back to the email
// for a member with no editor row. See the extensibility spec, "Scope resolution".
import type { D1Database } from '@cloudflare/workers-types';
import { resolvePrincipalRow } from './store.js';
import { rolesToScopes } from './scopes.js';
import { runAuthorize, type Authorize } from './authorize.js';
import type { Principal } from './types.js';

export interface ResolveDeps {
  db: D1Database;
  authorize?: Authorize;
  platform: unknown;
  deadlineMs?: number;
}

/** Resolve a session id to a Principal, or null when the session is absent or expired. */
export async function resolvePrincipal(deps: ResolveDeps, id: string, now: number): Promise<Principal | null> {
  const row = await resolvePrincipalRow(deps.db, id, now);
  if (!row) return null;
  const adminScopes = row.tier === 'admin' && row.role ? rolesToScopes(row.role) : [];
  const customScopes = await runAuthorize(deps.authorize, { email: row.email, platform: deps.platform }, deps.deadlineMs);
  return {
    email: row.email,
    displayName: row.displayName ?? row.email,
    scopes: [...adminScopes, ...customScopes],
    tier: row.tier,
  };
}
```

> Note: `resolvePrincipalRow` already left-joins `editor.display_name`, so an editor principal carries the real display name with no extra query, and a member (no editor row) falls back to the email. The single LEFT JOIN serves both the role and the display name.

- [ ] **Step 4: Run (PASS), gate, commit.**

```bash
npx vitest run src/tests/integration/auth-resolve.test.ts && npm run check && npm test
git add src/lib/auth/resolve.ts src/tests/integration/auth-resolve.test.ts
git commit -m "feat(auth): resolvePrincipal combining editor and custom scopes"
```

---

### Task 6: Route-gating primitives and redirect validation

**Files:**
- Create: `src/lib/sveltekit/scope-guards.ts`
- Create: `src/lib/sveltekit/redirect.ts`
- Modify: `src/lib/log/events.ts` (extend the `CairnLogEvent` union)
- Test: `src/tests/integration/scope-guards.test.ts`, `src/tests/unit/redirect.test.ts`

**Interfaces:**
- Consumes: `resolvePrincipal` (Task 5), `sessionCookieName` (crypto), `hasScope` (Task 2), `Principal`.
- Produces:
  - `redirect.ts`: `validateRedirect(target: string | null, origin: string): string | null` — returns a safe same-origin path, or null.
  - `scope-guards.ts`: `loadPrincipal(event, deps): Promise<Principal | null>` (memoized per request via `event.locals.principal`); `requireScope(event, scope, opts?: { loginPath?: string }): Principal`; `requireAnyScope(event, scopes, opts?): Principal`. A denial logs `auth.scope.denied` and throws a redirect to the login path (303) when unauthenticated, or `error(403)` when authenticated but missing the scope.

- [ ] **Step 1: Write the failing redirect test.**

```ts
// src/tests/unit/redirect.test.ts
import { describe, it, expect } from 'vitest';
import { validateRedirect } from '../../lib/sveltekit/redirect.js';

const origin = 'https://club.org';
describe('validateRedirect', () => {
  it('accepts a same-origin relative path', () => {
    expect(validateRedirect('/account', origin)).toBe('/account');
    expect(validateRedirect('/a/b?x=1', origin)).toBe('/a/b?x=1');
  });
  it('rejects protocol-relative, backslash, absolute-other-origin, and userinfo tricks', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '\\/evil.com', 'https://evil.com', 'https://club.org.evil.com', 'https:evil.com', 'https://user@evil.com', '%2f%2fevil.com']) {
      expect(validateRedirect(bad, origin)).toBeNull();
    }
  });
  it('rejects null and empty', () => {
    expect(validateRedirect(null, origin)).toBeNull();
    expect(validateRedirect('', origin)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL.** `npx vitest run src/tests/unit/redirect.test.ts`

- [ ] **Step 3: Implement `redirect.ts`.**

```ts
// src/lib/sveltekit/redirect.ts
// Validate a post-login redirect target against the site's own origin. The target rides the magic-link
// URL and the confirm handler, so an over-permissive check turns the trusted login mail into an open
// redirect. Parse against the origin and accept ONLY a same-origin result, never a substring match.
// See the extensibility spec, "Redirect validation and cookie attributes", and OWASP Unvalidated
// Redirects.

/** A safe same-origin path-and-query for `target`, or null when it is absent or points elsewhere. */
export function validateRedirect(target: string | null, origin: string): string | null {
  if (!target) return null;
  // Reject byte sequences that browsers normalize into a host before we parse: a leading slash must be
  // a single forward slash, never // or /\ or \/, and there must be no scheme.
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\') || target.startsWith('\\')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(target, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname + url.search;
}
```

- [ ] **Step 4: Write the failing scope-guards test.** Uses the harness `makeEvent` (which sets `locals` and `platform.env.AUTH_DB`):

```ts
// src/tests/integration/scope-guards.test.ts
import { describe, it, expect, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { createSession } from '../../lib/auth/store.js';
import { loadPrincipal, requireScope, requireAnyScope } from '../../lib/sveltekit/scope-guards.js';
import { makeCookies, expectRedirect, expectHttpError, seedEditor } from './_auth-harness.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';

function memberEvent(id?: string) {
  const cookies = makeCookies(id ? { [sessionCookieName(true)]: id } : {});
  return { url: new URL('https://test.dev/account'), request: new Request('https://test.dev/account'),
    cookies, locals: {} as Record<string, unknown>, platform: { env: { AUTH_DB: env.AUTH_DB } }, setHeaders() {} };
}

describe('scope guards', () => {
  it('loadPrincipal resolves and memoizes on locals', async () => {
    await createSession(env.AUTH_DB, 'g1', 'm@x.io', 'member', Date.now() + 1000, Date.now());
    const authorize = () => ['member'];
    const ev = memberEvent('g1');
    const p = await loadPrincipal(ev as never, { authorize });
    expect(p?.scopes).toEqual(['member']);
    expect((ev.locals as { principal?: unknown }).principal).toBe(p);
  });
  it('loadPrincipal returns null with no session cookie and never queries', async () => {
    const ev = memberEvent();
    expect(await loadPrincipal(ev as never, {})).toBeNull();
  });
  it('requireScope returns the principal when the scope is held', async () => {
    await createSession(env.AUTH_DB, 'g2', 'm2@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g2');
    const p = await requireScope(ev as never, 'member', { authorize: () => ['member'] });
    expect(p.email).toBe('m2@x.io');
  });
  it('requireScope redirects an unauthenticated visitor to the login path', async () => {
    const ev = memberEvent();
    const r = await expectRedirect(() => requireScope(ev as never, 'member', { loginPath: '/login' }));
    expect(r).toEqual({ status: 303, location: '/login' });
  });
  it('requireScope 403s an authenticated principal missing the scope', async () => {
    await createSession(env.AUTH_DB, 'g3', 'm3@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g3');
    const r = await expectHttpError(() => requireScope(ev as never, 'member', { authorize: () => [] }));
    expect(r.status).toBe(403);
  });
  it('requireAnyScope passes when any one scope is held', async () => {
    await createSession(env.AUTH_DB, 'g4', 'm4@x.io', 'member', Date.now() + 1000, Date.now());
    const ev = memberEvent('g4');
    const p = await requireAnyScope(ev as never, ['member', 'member:gold'], { authorize: () => ['member:gold'] });
    expect(p.email).toBe('m4@x.io');
  });
});
```

- [ ] **Step 5: Run, expect FAIL.** `npx vitest run src/tests/integration/scope-guards.test.ts`

- [ ] **Step 6: Extend the log-event union.** `scope-guards.ts` logs `auth.scope.denied` through `log.warn`, which takes an `event: CairnLogEvent` (the closed union in `src/lib/log/events.ts`), so the name must exist there before the call compiles. Add `| 'auth.scope.denied'` to the `CairnLogEvent` union. The union is the source of truth; `docs/reference/log-events.md` (Step 8) is its paired mirror, so update both together.

- [ ] **Step 7: Implement `scope-guards.ts`.** The signature options carry `authorize` so a developer composing on their own routes passes their callback; the guard (Task 7) passes it from config too.

```ts
// src/lib/sveltekit/scope-guards.ts
// The public route-gating primitives a developer composes on their own routes. loadPrincipal resolves
// the session on ANY route and memoizes it on locals; requireScope/requireAnyScope gate. Off /admin a
// developer opts in by calling these; the guard calls them under /admin. See the extensibility spec,
// "Composable gating on any route".
import { redirect, error } from '@sveltejs/kit';
import { resolvePrincipal } from '../auth/resolve.js';
import { sessionCookieName } from '../auth/crypto.js';
import { hasScope } from '../auth/scopes.js';
import { log } from '../log/index.js';
import type { Authorize } from '../auth/authorize.js';
import type { Principal } from '../auth/types.js';

/** What a gating call needs from the request event. RequestEvent and the engine event shapes satisfy it. */
interface GateEvent {
  url: URL;
  cookies: { get(name: string): string | undefined };
  locals: { principal?: Principal | null };
  platform?: { env?: { AUTH_DB?: import('@cloudflare/workers-types').D1Database } };
}

export interface GateDeps {
  authorize?: Authorize;
}

interface GateOpts extends GateDeps {
  loginPath?: string;
}

/**
 * Resolve the logged-in principal on any route, or null. Reads nothing and queries no D1 when the
 * session cookie is absent. Memoizes on `locals.principal` so repeated calls in one request resolve once.
 */
export async function loadPrincipal(event: GateEvent, deps: GateDeps = {}): Promise<Principal | null> {
  if (event.locals.principal !== undefined) return event.locals.principal;
  const db = event.platform?.env?.AUTH_DB;
  const id = db ? event.cookies.get(sessionCookieName(event.url.protocol === 'https:')) : undefined;
  const principal = db && id
    ? await resolvePrincipal({ db, authorize: deps.authorize, platform: event.platform }, id, Date.now())
    : null;
  event.locals.principal = principal;
  return principal;
}

/** Gate a route on a single scope. Redirects when unauthenticated; 403s when missing the scope. */
export async function requireScope(event: GateEvent, scope: string, opts: GateOpts = {}): Promise<Principal> {
  return enforce(event, (p) => hasScope(p, scope), scope, opts);
}

/** Gate a route on holding any one of several scopes. */
export async function requireAnyScope(event: GateEvent, scopes: string[], opts: GateOpts = {}): Promise<Principal> {
  return enforce(event, (p) => scopes.some((s) => hasScope(p, s)), scopes.join('|'), opts);
}

async function enforce(
  event: GateEvent,
  ok: (p: Principal) => boolean,
  requested: string,
  opts: GateOpts,
): Promise<Principal> {
  const principal = await loadPrincipal(event, opts);
  if (!principal) {
    throw redirect(303, opts.loginPath ?? '/admin/login');
  }
  if (!ok(principal)) {
    log.warn('auth.scope.denied', { email: principal.email, scope: requested, path: event.url.pathname });
    throw error(403, 'Insufficient scope');
  }
  return principal;
}
```

- [ ] **Step 8: Document `auth.scope.denied`** in `docs/reference/log-events.md` (warn; a `requireScope`/`requireAnyScope` denial; fields `email`, `scope`, `path`).

- [ ] **Step 9: Run both tests (PASS), gate, commit.**

```bash
npx vitest run src/tests/unit/redirect.test.ts src/tests/integration/scope-guards.test.ts && npm run check && npm test
git add src/lib/sveltekit/scope-guards.ts src/lib/sveltekit/redirect.ts src/lib/log/events.ts docs/reference/log-events.md src/tests/unit/redirect.test.ts src/tests/integration/scope-guards.test.ts
git commit -m "feat(auth): route-gating primitives and same-origin redirect validation"
```

---

### Task 7: Rewrite the guard for the principal model

**Files:**
- Modify: `src/lib/sveltekit/guard.ts`
- Modify: `src/lib/auth/store.ts` (remove the now-unused `resolveSession`; keep `findEditor` etc.)
- Test: `src/tests/integration/auth-guard.test.ts` (Modify)

**Interfaces:**
- Consumes: `resolvePrincipal` (Task 5), `loadPrincipal` (Task 6), `hasAdminScope` (Task 2), `Authorize` (Task 4).
- Produces:
  - `createAuthGuard(config?: { authorize?: Authorize }): Handle` — config carries the adapter's `auth.authorize`.
  - The guard: resolves `locals.principal` under `/admin` and requires an admin-tier session with an admin scope (redirect to `/admin/login` otherwise); CSRF double-submit now fires on ANY unsafe form request that carries a session cookie, not only `/admin`; HTTPS and `AUTH_DB` checks stay for `/admin`.
  - `requireSession(event): Principal` and `requireOwner(event): Principal` read `locals.principal`; `requireOwner` checks `hasScope(p, ADMIN_OWNER)`.

- [ ] **Step 1: Read and update `auth-guard.test.ts`.** Read the existing cases (they assert `/admin` redirect-when-unauthenticated, CSRF rejection, the dev-backend tripwire, the https and bindings condition pages). These stay green; make exactly these edits so they compile and pass under the principal model:
  - The existing session-seeding `createSession(...)` call gains the `'admin'` tier argument (new fourth parameter, before `expiresAt`).
  - Every `locals.editor` assertion becomes a `locals.principal` assertion, checking `scopes` and `tier` instead of `role` (an admitted owner is `{ scopes: ['admin:owner', 'admin:editor'], tier: 'admin' }`).
  - The helpers `adminEvent`/`formPost`/`runGuard` build the event with `locals: {}` (empty) and let the guard populate `locals.principal`; do not pre-seed a principal onto `locals`.
  - Confirm the existing CSRF-rejection case asserts the response is a `403` (the guard returns `renderConditionResponse(...)` with status 403); keep that assertion.

- [ ] **Step 2: Write the new failing tests.** Add to `auth-guard.test.ts`:

```ts
it('redirects a member-tier session away from /admin', async () => {
  await createSession(env.AUTH_DB, 'mt', 'm@x.io', 'member', Date.now() + 1000, Date.now());
  const ev = adminEvent('/admin', { [sessionCookieName(true)]: 'mt' }); // adminEvent: see existing helper
  const r = await expectRedirect(() => runGuard(ev));
  expect(r.location).toBe('/admin/login');
});

it('admits an admin-tier allowlisted session to /admin and sets locals.principal', async () => {
  await seedEditor('boss@x.io', 'Boss', 'owner');
  await createSession(env.AUTH_DB, 'at', 'boss@x.io', 'admin', Date.now() + 1000, Date.now());
  const ev = adminEvent('/admin', { [sessionCookieName(true)]: 'at' });
  await runGuard(ev);
  expect(ev.locals.principal).toMatchObject({ email: 'boss@x.io', scopes: ['admin:owner', 'admin:editor'] });
});

it('enforces CSRF on a non-/admin unsafe POST that carries a session cookie', async () => {
  await createSession(env.AUTH_DB, 'mc', 'm@x.io', 'member', Date.now() + 1000, Date.now());
  const ev = formPost('/account', { [sessionCookieName(true)]: 'mc' }, { hello: 'x' }); // no csrf field
  const res = await runGuard(ev);
  expect(res.status).toBe(403);
});

it('passes a non-/admin unsafe POST that carries a session cookie AND a valid CSRF token', async () => {
  await createSession(env.AUTH_DB, 'mok', 'm@x.io', 'member', Date.now() + 1000, Date.now());
  // formPost helper sets both the csrf cookie and the matching form field (double-submit). See the
  // existing admin CSRF-pass case for the token-pair shape.
  const ev = formPost('/account', { [sessionCookieName(true)]: 'mok' }, { hello: 'x' }, { csrf: true });
  const res = await runGuard(ev);
  expect(res.status).toBe(200);
});

it('does not run the authorize callback to admit an admin-tier session to /admin (lazy on /admin)', async () => {
  await seedEditor('lazy@x.io', 'L', 'owner');
  await createSession(env.AUTH_DB, 'lz', 'lazy@x.io', 'admin', Date.now() + 1000, Date.now());
  const spy = vi.fn(() => ['member']);
  const ev = adminEvent('/admin', { [sessionCookieName(true)]: 'lz' });
  await createAuthGuard({ authorize: spy })({ event: ev as never, resolve: async () => new Response('ok') });
  expect(spy).not.toHaveBeenCalled();
});
```

> If the existing test file lacks `adminEvent`/`formPost`/`runGuard` helpers, add small ones mirroring `makeEvent`; `runGuard` calls `createAuthGuard({})({ event, resolve: async () => new Response('ok') })`. The `formPost` helper takes an optional fourth arg to set the matching CSRF cookie+field for the positive-path case. Import `vi` from `vitest` for the spy case.

- [ ] **Step 3: Run, expect FAIL.** `npx vitest run src/tests/integration/auth-guard.test.ts`

- [ ] **Step 4: Rewrite the guard in place.** Modify `src/lib/sveltekit/guard.ts`, do not rewrite the whole file: change ONLY the `resolveSession` import and the two logic blocks shown below (the non-admin CSRF gate and the admin session-resolution block). Leave the `csrf` helpers, the dev-backend tripwire, the https check, the bindings check, the `renderConditionResponse`, `originMatches`, `applySecurityHeaders`, and the security-headers application untouched.

  The import change: drop `resolveSession`, add `resolvePrincipal` plus `hasAdminScope`/`hasScope`/`ADMIN_OWNER` and the `Authorize`/`Principal` types.

```ts
// (imports) replace resolveSession import with the new modules:
import { resolvePrincipal } from '../auth/resolve.js';
import { hasAdminScope, ADMIN_OWNER, hasScope } from '../auth/scopes.js';
import type { Authorize } from '../auth/authorize.js';
import type { Principal } from '../auth/types.js';
// keep: sessionCookieName, csrf helpers, applySecurityHeaders, renderConditionResponse, originMatches, log, types.
```

> Cross-reference: `event.locals.principal` is not a declared field until the Task 9 edits to `src/lib/sveltekit/types.ts` (`EventBase.locals`) and `src/lib/ambient.ts`. This task's `event.locals.principal = principal` write therefore will not type-check on its own; Tasks 7 and 9 are one compiling unit, and the full `npm run check` 0/0 gate runs at the end of Task 9 (see the sequencing note below and Step 7).

> Contract note (member CSRF): the non-admin CSRF gate only protects a member form-action when the page that renders the form has called `issueCsrfToken(event)` to set the double-submit cookie+field. Phase 1 ships no member-facing forms, so this is a standing note: every member-facing load that renders a state-changing form MUST call `issueCsrfToken(event)`.

```ts
export function createAuthGuard(config: { authorize?: Authorize } = {}) {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;

    // ... dev-backend tripwire block: UNCHANGED ...

    const cookieName = sessionCookieName(event.url.protocol === 'https:');
    const hasSessionCookie = event.cookies.get(cookieName) != null;

    // Non-admin: CSRF still applies to an unsafe form POST that carries a session cookie, so member
    // form-actions are protected even though they live outside /admin. With no session cookie, restore
    // the framework's strict Origin check the consumer disabled via checkOrigin: false.
    if (!isAdminPath(pathname)) {
      if (isUnsafeFormRequest(event.request)) {
        if (hasSessionCookie) {
          if (!validateCsrfHeader(event) && !(await validateCsrfToken(event))) {
            log.warn('guard.rejected', { reason: 'csrf', path: pathname });
            return renderConditionResponse('auth.csrf-token-invalid');
          }
        } else if (!originMatches(event)) {
          log.warn('guard.rejected', { reason: 'origin', path: pathname });
          return renderConditionResponse('auth.csrf-origin-mismatch');
        }
      }
      return resolve(event);
    }

    // ... https check block: UNCHANGED ...
    // ... AUTH_DB bindings check block: UNCHANGED (defines `env`) ...
    // ... admin CSRF double-submit block: UNCHANGED ...

    if (!isPublicAdminPath(pathname)) {
      const id = event.cookies.get(cookieName);
      // Lazy on /admin: pass authorize: undefined here. /admin needs only admin:* scopes, which come
      // from the allowlist row, so the developer callback (and its D1) is not run to admit an admin
      // request. config.authorize stays on the non-admin path (see the if (!isAdminPath) block above).
      const principal = id
        ? await resolvePrincipal({ db: env.AUTH_DB, authorize: undefined, platform: event.platform }, id, Date.now())
        : null;
      // /admin requires an admin-tier session carrying an admin scope. A member-tier session, or a
      // scopeless principal, is bounced to login: the allowlist + tier are the structural gate.
      if (!principal || principal.tier !== 'admin' || !hasAdminScope(principal)) {
        throw redirect(303, '/admin/login');
      }
      event.locals.principal = principal;
    }
    const response = await resolve(event);
    applySecurityHeaders(response.headers);
    return response;
  };
}
```

> Stated once: under `/admin` the principal carries admin scopes only (the guard passes `authorize: undefined`), so an admin request never runs the developer callback or its D1. `config.authorize` belongs to the non-admin world, where a developer's own route resolves custom scopes by calling `loadPrincipal`/`resolvePrincipal` directly (passing the callback). A custom-scope admin route does the same, calling `loadPrincipal` itself to pull custom scopes after the guard has admitted the admin-tier session.

- [ ] **Step 5: Rewrite `requireSession`/`requireOwner` over the principal.**

```ts
/** The session the guard resolved, or a login redirect. Reads locals.principal. */
export function requireSession(event: { locals: { principal?: Principal | null } }): Principal {
  const principal = event.locals.principal;
  if (!principal) throw redirect(303, '/admin/login');
  return principal;
}

/** A signed-in owner, or 403. */
export function requireOwner(event: { locals: { principal?: Principal | null } }): Principal {
  const principal = requireSession(event);
  if (!hasScope(principal, ADMIN_OWNER)) throw error(403, 'Owner access required');
  return principal;
}
```

- [ ] **Step 6: Remove `resolveSession` from `store.ts`** (now unused). First run `grep -rn resolveSession src/` and confirm ZERO references remain (the guard's import is gone after Step 4, and the `auth-store.test.ts` cases were converted to `resolvePrincipalRow` in Task 3 Step 1's substep). Only then delete the function and any stale import. If the grep still finds a reference, fix that call site before deleting the export.

- [ ] **Step 7: Run the guard tests (PASS), the gate, commit.** `npm run check` will surface the `locals.editor` → `locals.principal` callers; those are Task 9. This task changes only the guard and `requireSession`/`requireOwner` return types. Because `event.locals.principal` is not a declared field until the Task 9 edit to `src/lib/sveltekit/types.ts`, this task does NOT compile in isolation, expected. Run `npm run check` and expect the only new errors to be: `locals.principal` undeclared (the guard's write and the `requireSession`/`requireOwner` reads, fixed by the Task 9 `types.ts`/`ambient.ts` edits), `Property 'role' does not exist on type 'Principal'` (the engine `role` readers, fixed in Task 9 Step 4), and the remaining `locals.editor` references (also Task 9). Do NOT commit alone; proceed to Task 9 and commit the combined Task 7 + 9 change when `npm run check` is 0/0:

```bash
npx vitest run src/tests/integration/auth-guard.test.ts
git add src/lib/sveltekit/guard.ts src/lib/auth/store.ts src/tests/integration/auth-guard.test.ts
git commit -m "feat(auth): guard resolves principals, gates /admin on admin-tier scope, CSRF off /admin"
```

> Sequencing note for the orchestrator: Tasks 7 and 9 together form one compiling unit (the guard switches `locals` to `principal`, Task 9 migrates every reader). Review them as a pair; run the full `npm run check` gate at the end of Task 9.

---

### Task 8: Login primitives — `sendMagicLink`, `confirmMagicLink`, `signIn`

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts`
- Modify: `src/lib/log/events.ts` (extend the `CairnLogEvent` union)
- Test: `src/tests/integration/auth-confirm.test.ts`, `src/tests/integration/auth-request.test.ts` (Modify), `src/tests/integration/auth-signin.test.ts` (Create)

**Interfaces:**
- Consumes: `createSession` (tiered), `deleteSessionsForEmail`, `checkAndIncrementRate` (Task 3), `validateRedirect` (Task 6), `findEditor` (store).
- Produces, exported from `auth-routes.ts` (and re-exported by `./extend` in Task 10):
  - `sendMagicLink(event, opts: { tier: AuthTier; redirectTo?: string; branding: AuthBranding; send?: SendMagicLink }): Promise<RequestResult>` — open to any email; per-IP rate-limited; issues a token whose link carries the tier and validated `redirectTo`.
  - `confirmMagicLink(event): Promise<never>` — consumes the token, deletes prior sessions for the email (fixation), mints a session of the token's tier, sets the cookie, redirects to the validated target (default `/admin` for admin tier, `/` for member).
  - `signIn(event, verifiedEmail, opts?: { tier?: AuthTier; redirectTo?: string }): Promise<void>` — server-only; mints a session (tier defaults `member`); deletes prior sessions for the email; logs `auth.signin`. Performs no verification.

> Implementation detail: the tier and `redirectTo` ride the magic-link as signed-free query params on the confirm URL is unsafe; instead store them with the token. Add `tier` and `redirect_to` columns to `magic_token` in a follow-on migration `migrations/0002_token_tier.sql` (`ALTER TABLE magic_token ADD COLUMN tier TEXT NOT NULL DEFAULT 'admin'; ALTER TABLE magic_token ADD COLUMN redirect_to TEXT;`), and extend `issueToken` to persist them and `consumeToken` to return them. This keeps the tier server-authoritative, not attacker-controllable via the URL.

- [ ] **Step 1: Add the token migration and extend the store.** Create `migrations/0002_token_tier.sql` as above. Extend `issueToken(db, email, tokenHash, tier, redirectTo, expiresAt, now)` to insert the two columns, and change `consumeToken` to `RETURNING email, tier, redirect_to` and return `{ email; tier; redirectTo } | null`. Update the existing `issueToken`/`consumeToken` tests in `auth-store.test.ts` for the new shape. Run `npx vitest run src/tests/integration/auth-store.test.ts auth-schema.test.ts` green.

  The `consumeToken` return shape changes from a bare email to an object, so every consumer of its return value must be updated in this step or the tree stops compiling. The consumers are `auth-routes.ts` `confirmAction` (and the new `confirmMagicLink` in Step 4), `src/tests/integration/auth-confirm.test.ts`, and the `consumeToken` cases in `src/tests/integration/auth-store.test.ts`. Replace the old `const email = await consumeToken(...)` read with the destructure plus a null guard:

```ts
const { email, tier, redirectTo } = (await consumeToken(db, tokenHash, now)) ?? {};
if (!email) {
  // existing invalid/expired-token branch (render the condition response / redirect to login)
}
```

- [ ] **Step 2: Write the failing confirm/signin tests.** In `auth-confirm.test.ts`, assert a member-tier token yields a member-tier session and redirects to the validated `redirect_to`; assert fixation (a prior session id for the email is gone after confirm). Create `auth-signin.test.ts`:

```ts
// src/tests/integration/auth-signin.test.ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { resolvePrincipalRow, createSession } from '../../lib/auth/store.js';
import { makeRecordingCookies, seedEditor } from './_auth-harness.js';
import { sessionCookieName } from '../../lib/auth/crypto.js';

const routes = createAuthRoutes({ branding: { siteName: 'Club' } });

function ev(cookies = makeRecordingCookies()) {
  return { url: new URL('https://test.dev/auth/google/callback'), request: new Request('https://test.dev/x'),
    cookies, locals: {}, platform: { env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' } }, setHeaders() {} };
}

describe('signIn', () => {
  it('mints a member-tier session by default and rotates prior sessions', async () => {
    await createSession(env.AUTH_DB, 'old', 'g@x.io', 'member', Date.now() + 1000, Date.now());
    const e = ev();
    await routes.signIn(e as never, 'g@x.io');
    expect(await resolvePrincipalRow(env.AUTH_DB, 'old', Date.now())).toBeNull();
    const set = (e.cookies as ReturnType<typeof makeRecordingCookies>).sets.find((s) => s.name === sessionCookieName(true));
    const row = await resolvePrincipalRow(env.AUTH_DB, set!.value, Date.now());
    expect(row).toMatchObject({ email: 'g@x.io', tier: 'member' });
  });
  it('mints an admin-tier session when asked', async () => {
    await seedEditor('board@x.io', 'B', 'editor');
    const e = ev();
    await routes.signIn(e as never, 'board@x.io', { tier: 'admin' });
    const set = (e.cookies as ReturnType<typeof makeRecordingCookies>).sets.find((s) => s.name === sessionCookieName(true));
    expect((await resolvePrincipalRow(env.AUTH_DB, set!.value, Date.now()))?.tier).toBe('admin');
  });
});
```

- [ ] **Step 3: Run, expect FAIL.** `npx vitest run src/tests/integration/auth-signin.test.ts`

- [ ] **Step 4: Extend the log-event union.** `signIn` logs `auth.signin` and the send path logs `auth.link.rate_limited`, both through `log.*`, which take an `event: CairnLogEvent` (the closed union in `src/lib/log/events.ts`). Add `| 'auth.signin' | 'auth.link.rate_limited'` to the `CairnLogEvent` union before the implementation compiles. The union is the source of truth; `docs/reference/log-events.md` is its paired mirror, so document both new events there in this task (see Step 6's rate-limit note).

- [ ] **Step 5: Implement.** Refactor `createAuthRoutes` so the existing `/admin` shims call the new primitives. Add the shared session-minting helper and the three primitives:

```ts
import type { AuthTier } from '../auth/types.js';
import { createSession, deleteSessionsForEmail, checkAndIncrementRate } from '../auth/store.js';
import { validateRedirect } from './redirect.js';

const SEND_RATE_LIMIT = 5;             // sends per IP per window
const SEND_RATE_WINDOW_MS = 60 * 1000;

/** Mint a fresh session of `tier` for `email`, rotating any prior session (fixation defense). */
async function mintSession(event: RequestContext, db: D1Database, email: string, tier: AuthTier): Promise<void> {
  const now = Date.now();
  await deleteSessionsForEmail(db, email);
  const id = generateSessionId();
  await createSession(db, id, email, tier, now + SESSION_TTL_MS, now);
  const secure = event.url.protocol === 'https:';
  event.cookies.set(sessionCookieName(secure), id, {
    path: '/', httpOnly: true, secure, sameSite: 'lax', maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** The client IP for the rate bucket, from the Cloudflare-set header. */
function clientIp(event: RequestContext): string {
  return event.request.headers.get('cf-connecting-ip') ?? 'unknown';
}
```

**These three primitives MUST be standalone module-level functions, not inner closures of `createAuthRoutes`.** Today `requestAction`/`confirmAction`/the login helpers close over `config.branding` and `config.send`; the Task 10 `./extend` barrel re-exports `sendMagicLink`/`confirmMagicLink`/`signIn` as standalone symbols, which cannot resolve if they live inside the factory. Lift them to module scope, taking `branding`/`send` through `opts` per this task's Interfaces block, and rewrite the factory's `/admin` shims to delegate to them. Spell out the full bodies:

```ts
// Module-level (NOT inside createAuthRoutes). branding/send arrive via opts so the function closes
// over nothing from the factory and the ./extend barrel can re-export it standalone.
export async function sendMagicLink(
  event: RequestContext,
  opts: { tier: AuthTier; redirectTo?: string; branding: AuthBranding; send?: SendMagicLink },
): Promise<RequestResult> {
  // Mirror the current requestAction body, but:
  //  - take opts.tier / opts.redirectTo (no longer admin-only);
  //  - rate-limit per IP BEFORE the per-email cooldown:
  //      if (!(await checkAndIncrementRate(db, `ip:${clientIp(event)}`, Date.now(), SEND_RATE_WINDOW_MS, SEND_RATE_LIMIT))) {
  //        log.warn('auth.link.rate_limited', { ip: clientIp(event) });
  //        return { status: 'sent' }; // collapse the throttle into the neutral signal on the public path
  //      }
  //  - validate opts.redirectTo and persist it with the token:
  //      const safeRedirect = validateRedirect(opts.redirectTo ?? null, requireOrigin(env));
  //      await issueToken(db, email, tokenHash, opts.tier, safeRedirect, expiresAt, now);
  //  - send the link through opts.send ?? the default sender, branded with opts.branding.
}

// Module-level. Reads the server-authoritative tier/redirect off the token row.
export async function confirmMagicLink(event: RequestContext): Promise<never> {
  // Mirror confirmAction, but:
  //   const { email, tier, redirectTo } = (await consumeToken(db, tokenHash, now)) ?? {};
  //   if (!email) { /* invalid/expired branch */ }
  //   await mintSession(event, db, email, tier ?? 'admin');
  //   throw redirect(303, validateRedirect(redirectTo ?? null, requireOrigin(env)) ?? (tier === 'admin' ? '/admin' : '/'));
}
```

`signIn` is an account-takeover primitive (it mints a session for an arbitrary email with no verification), so it must never reach a client bundle. House it in a server-only module so the bundler refuses to ship it:

- Create `src/lib/sveltekit/auth-routes.server.ts` and export `signIn` from there (the `.server.` infix is SvelteKit's server-only convention; a client import of a `*.server.*` module is a build error, which is the enforcement). `auth-routes.ts` re-exports nothing of `signIn`.
- The Task 10 `./extend` barrel re-exports `signIn` from `../sveltekit/auth-routes.server.js` (Task 10 Step 3 must be updated to import it from the server module, not `auth-routes.js`).

```ts
// src/lib/sveltekit/auth-routes.server.ts
import type { AuthTier } from '../auth/types.js';
import { mintSession } from './auth-routes.js'; // export mintSession from auth-routes.ts for reuse
import { requireDb } from './auth-routes.js';
import { log } from '../log/index.js';
import type { RequestContext } from './types.js';

/** Mint a session for an already-verified email. Server-only: no verification, an account-takeover primitive. */
export async function signIn(
  event: RequestContext,
  verifiedEmail: string,
  opts: { tier?: AuthTier; redirectTo?: string } = {},
): Promise<void> {
  const db = requireDb(event.platform?.env ?? {});
  const email = verifiedEmail.trim().toLowerCase();
  await mintSession(event, db, email, opts.tier ?? 'member');
  log.info('auth.signin', { email, tier: opts.tier ?? 'member' });
}
```

Keep the `/admin` shims (`loginLoad`, `requestAction`, `confirmLoad`, `confirmAction`, `logoutAction`) inside `createAuthRoutes` as thin wrappers that delegate to the standalone functions: `requestAction` calls `sendMagicLink(event, { tier: 'admin', branding: config.branding, send: config.send })`; `confirmAction` calls `confirmMagicLink(event)`. The factory's returned object still exposes `sendMagicLink`/`confirmMagicLink`/`signIn` (re-exporting the module-level / server-only functions) for the `createAuthRoutes(...).signIn` call shape the Task 8 tests use.

- [ ] **Step 6: Verify `signIn` cannot reach a client bundle.** Confirm the server-only fence holds: `grep -rn "auth-routes.server" src/lib` should show `signIn` exported only from the `.server.` module and re-exported only by the `./extend` barrel and the factory; then build (`npm run package`) and confirm no client/`svelte`-condition chunk imports `auth-routes.server`. If the build does not already fail a hypothetical client import, add a one-line note that the `.server.` infix is the enforcement and a client import is a SvelteKit build error.

- [ ] **Step 7: Rate-limit test.** Add to `auth-request.test.ts`: six rapid `sendMagicLink` calls from one IP yield five `sent` and a sixth that does not issue a token (assert `countRows('magic_token')` did not grow on the sixth). Set a distinct `cf-connecting-ip` header per scenario on the harness `Request` (it currently sets none, so every scenario collapses into the single `ip:unknown` bucket and cross-contaminates): build each request with `new Request(url, { headers: { 'cf-connecting-ip': '203.0.113.7' } })` and use a fresh IP per test. Add `auth_rate` to the harness cleanup/DELETE between tests so a prior test's window does not leak. Note in the step that production keys the bucket on `cf-connecting-ip`, with `unknown` as a logged degraded fallback when the header is absent. Document `auth.link.rate_limited` in `docs/reference/log-events.md` (warn; fields `ip`).

- [ ] **Step 8: Run all auth tests (PASS), gate, commit.**

```bash
npx vitest run src/tests/integration/auth-confirm.test.ts auth-request.test.ts auth-signin.test.ts auth-store.test.ts && npm run check && npm test
git add migrations/0002_token_tier.sql src/lib/auth/store.ts src/lib/sveltekit/auth-routes.ts src/lib/sveltekit/auth-routes.server.ts src/lib/log/events.ts src/lib/sveltekit/redirect.ts docs/reference/log-events.md src/tests/integration/
git commit -m "feat(auth): tiered magic-link, fixation rotation, signIn seam, per-IP send limit"
```

---

### Task 9: Migrate `locals.editor` to `locals.principal` across the engine

**Files:**
- Modify: `src/lib/ambient.ts`
- Modify: `src/lib/sveltekit/types.ts` (the engine event `locals` shape)
- Modify: every engine reader of `locals.editor`, `editor.role`, and `requireSession(...).role` (enumerated by grep below)
- Modify: `src/lib/sveltekit/content-routes.ts` `LayoutData` (`user.role` → derive), and the editor-management gate (`canManageEditors`)
- Modify: `docs/reference/sveltekit.md` (`requireSession`/`requireOwner` return-type signatures)
- Test: existing suites stay green; add no new behavior

**Interfaces:**
- Consumes: `Principal`, `scopesToRole`, `hasScope`, `ADMIN_OWNER` (Task 2).
- Produces: `locals.principal` as the one identity object; `LayoutData.user` carries `{ email; displayName; role }` derived from the principal (the admin chrome still shows a role label).

- [ ] **Step 1: Update the ambient declaration.**

```ts
// src/lib/ambient.ts — replace the editor field
import type { Principal } from './auth/types.js';
import type { Backend } from './github/backend.js';
declare global {
  namespace App {
    interface Locals {
      principal?: Principal | null;
      backend?: Backend;
    }
  }
}
export {};
```

- [ ] **Step 2: Update the engine event `locals` shape.** The engine's event types do NOT derive `locals` from `App.Locals`: `src/lib/sveltekit/types.ts` hardcodes `EventBase.locals: { editor?: Editor | null; backend?: Backend }`, and `RequestContext`/`HandleInput`/`ContentEvent` extend `EventBase`. Change `EventBase.locals` to `{ principal?: Principal | null; backend?: Backend }`; add `import type { Principal } from '../auth/types.js';`; drop the now-unused `Editor` import in that file. This is the type that makes the guard's `event.locals.principal` writes (Task 7) and every engine reader (Step 4) compile.

- [ ] **Step 3: Find every reader.** Run and record:

```bash
grep -rn "locals.editor\|\.role\b\|requireSession\|requireOwner\|canManageEditors\|user.role\|LayoutData" src/lib | grep -v "auth/store.ts\|auth/scopes.ts\|editors-routes"
```

(The `editor` allowlist store and `editors-routes` legitimately keep `Role`; do not change those.)

- [ ] **Step 4: Apply the mechanical transform.** For each engine call site:
  - `event.locals.editor` → `event.locals.principal`.
  - `const editor = requireSession(event)` then `editor.role === 'owner'` → keep `requireSession` (now returns `Principal`), and replace the role read with `hasScope(principal, ADMIN_OWNER)` (or `scopesToRole(principal.scopes)` where a `Role` value is still needed, e.g. building `LayoutData.user.role`).
  - `editor.email` / `editor.displayName` → unchanged (the `Principal` carries both).
  - The git-commit-attribution sites read `.email` and `.displayName` only, so they need only the `editor`→`principal` rename.

  Representative example, content-routes layout load building `LayoutData.user`:

```ts
// before
const editor = requireSession(event);
return { user: { email: editor.email, displayName: editor.displayName, role: editor.role }, ... };
// after
import { scopesToRole } from '../auth/scopes.js';
const principal = requireSession(event);
return { user: { email: principal.email, displayName: principal.displayName, role: scopesToRole(principal.scopes) ?? 'editor' }, ... };
```

  Editor-management gate:

```ts
// before:  const canManageEditors = editor.role === 'owner';
// after:
import { hasScope, ADMIN_OWNER } from '../auth/scopes.js';
const canManageEditors = hasScope(principal, ADMIN_OWNER);
```

- [ ] **Step 5: Update the test harness.** In `_auth-harness.ts`, `makeEvent` builds `locals: { editor }`; change it to `locals: { principal }` and update the `makeEvent` parameter from `editor?: Editor | null` to `principal?: Principal | null`. Run `grep -rn "editor:" src/tests` and update call sites that pass a seeded `editor` to pass a `principal` (email, displayName, scopes, tier).

- [ ] **Step 6: Update the reference signatures.** In `docs/reference/sveltekit.md`, change the documented return type of `requireSession` and `requireOwner` from `Editor` to `Principal` so `check:reference:signatures` stays green (it diffs the doc signature against the `.d.ts`).

- [ ] **Step 7: Run the full gate.** `npm run check` MUST be 0/0 (this is the task that makes the whole tree compile under the principal model). `npm test` exit 0.

- [ ] **Step 8: Commit (the Task 7 + 9 compiling unit).**

```bash
git add src/lib/ambient.ts src/lib/sveltekit/ docs/reference/sveltekit.md src/tests/
git commit -m "refactor(auth)!: migrate locals.editor to locals.principal across the engine"
```

> The `!` marks the breaking change. The consumer "Consumers must" steps (the `./ambient` re-import already covers `locals.principal`; any site reading `data.user.role` still gets a `role`) are recorded in the phase-1 CHANGELOG entry at phase end.

---

### Task 10: The `./extend` public surface

**Files:**
- Create: `src/lib/extend/index.ts`
- Create: `docs/reference/extend.md`
- Modify: `package.json` (`exports`)
- Modify: `scripts/reference-coverage.mjs` (add the `/extend` CONFIG entry)
- Test: `src/tests/unit/extend-barrel.test.ts`

**Interfaces:**
- Produces the single extension barrel re-exporting the phase-1 public surface: `loadPrincipal`, `requireScope`, `requireAnyScope`, `hasScope`, `sendMagicLink`, `confirmMagicLink`, `signIn`, `forgetPrincipal`, and the types `Principal`, `AuthTier`, `Authorize`. (Phase 2 adds `AdminShell`/`adminShellLoad`/`AdminShellData`/`AdminNavItem`.)

- [ ] **Step 1: Write the failing barrel test.**

```ts
// src/tests/unit/extend-barrel.test.ts
import { describe, it, expect } from 'vitest';
import * as extend from '../../lib/extend/index.js';

describe('./extend barrel', () => {
  it('exports the phase-1 extension surface', () => {
    for (const name of ['loadPrincipal', 'requireScope', 'requireAnyScope', 'hasScope', 'sendMagicLink', 'confirmMagicLink', 'signIn', 'forgetPrincipal']) {
      expect(typeof (extend as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Create the barrel.**

```ts
// src/lib/extend/index.ts
// THE developer-extensibility public contract. Everything a customization depends on is re-exported
// here and ONLY here; cairn refactors every internal behind this barrel. This surface is versioned and
// locks at 1.0 (see the extensibility spec). Phase 1 ships identity; phase 2 adds the admin shell.
export { loadPrincipal, requireScope, requireAnyScope } from '../sveltekit/scope-guards.js';
export { hasScope } from '../auth/scopes.js';
export { sendMagicLink, confirmMagicLink } from '../sveltekit/auth-routes.js';
// signIn is server-only (an account-takeover primitive): re-export from the .server. module, never
// from auth-routes.js, so a client import remains a SvelteKit build error. See Task 8 Step 6.
export { signIn } from '../sveltekit/auth-routes.server.js';
export { forgetPrincipal } from '../auth/store.js';
export type { Principal, AuthTier } from '../auth/types.js';
export type { Authorize } from '../auth/authorize.js';
```

> `sendMagicLink`/`confirmMagicLink` are standalone module-level exports of `auth-routes.ts`, and `signIn` is a standalone export of the server-only `auth-routes.server.ts`, all lifted out of `createAuthRoutes` in Task 8 Step 5 (the factory delegates to them). Because they are real standalone symbols, the barrel can re-export them; re-exporting closures of the factory would not resolve.

- [ ] **Step 4: Add the export subpath and the internal deny.** In `package.json` `exports`, add (alphabetneutral, mirror `./islands`):

```json
"./extend": {
  "types": "./dist/extend/index.d.ts",
  "svelte": "./dist/extend/index.js",
  "default": "./dist/extend/index.js"
},
"./internal/*": null
```

- [ ] **Step 5: Register the subpath with `check:reference`.** `check:reference` walks a hardcoded `CONFIG` array in `scripts/reference-coverage.mjs`; a subpath that is absent from `CONFIG` is never checked, so creating the reference page alone does NOT satisfy the gate. Open `scripts/reference-coverage.mjs`, find the `CONFIG` array, and push an entry for `/extend`, mirroring the real field names of the existing entries (the shape is `{ subpath: '/extend', dts: 'dist/extend/index.d.ts', page: 'docs/reference/extend.md' }`; match whatever the actual field names are in that file). `check:reference:signatures` shares the same `CONFIG`, so this one entry registers the subpath for both.

- [ ] **Step 6: Create the reference page and run the gates.** Create `docs/reference/extend.md` listing the phase-1 exports (one line each), then run `npm run check && npm run check:package && npm run check:reference && npm test`. Note: `check:reference` is NOT part of `npm run check` (it runs explicitly), so run it by name here to prove the CONFIG entry plus the page satisfy it.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/extend/index.ts package.json scripts/reference-coverage.mjs docs/reference/extend.md src/tests/unit/extend-barrel.test.ts
git commit -m "feat(extend): the enforced ./extend public surface (phase 1 identity)"
```

---

### Task 11: The `check:extension-surface` gate

**Files:**
- Create: `scripts/check-extension-surface.mjs`
- Create: `docs/internal/extension-surface.snapshot` (the committed baseline)
- Modify: `package.json` (add `scripts.check:extension-surface`; do NOT fold into `check`)
- Modify: `.github/workflows/test.yml` (add the `check:extension-surface` run step)
- Test: covered by running the script (a gate, not a unit test)

**Interfaces:**
- Produces: a CI gate that fails when the `./extend` `.d.ts` export set changes without the snapshot being regenerated AND the diff marked. Phase 1 ships it as the simplest enforceable form: snapshot the exported symbol names and their kinds from `dist/extend/index.d.ts`; fail on any difference from the committed snapshot; the fix is to regenerate and review.

- [ ] **Step 1: Write the script.**

```js
// scripts/check-extension-surface.mjs
// Snapshots the ./extend public surface (exported names from dist/extend/index.d.ts) and fails when it
// drifts from the committed baseline. A drift is either an intended contract change (regenerate the
// snapshot in the same commit, which makes the change reviewable in the diff) or an accident (the gate
// caught it). See the extensibility spec, "A loud-failure gate that classifies the change".
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DTS = 'dist/extend/index.d.ts';
const SNAP = 'docs/internal/extension-surface.snapshot';
const write = process.argv.includes('--write');

if (!existsSync(DTS)) {
  console.error(`check:extension-surface: ${DTS} missing; run npm run package first.`);
  process.exit(1);
}
const src = readFileSync(DTS, 'utf8');
const names = [...src.matchAll(/export (?:declare )?(?:const|function|type|interface|class) (\w+)/g)]
  .map((m) => m[1])
  .concat([...src.matchAll(/export \{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)))
  .sort();
const current = names.join('\n') + '\n';

if (write) {
  writeFileSync(SNAP, current);
  console.log(`check:extension-surface: wrote ${names.length} symbols to ${SNAP}`);
  process.exit(0);
}
const baseline = existsSync(SNAP) ? readFileSync(SNAP, 'utf8') : '';
if (current !== baseline) {
  console.error('check:extension-surface: ./extend surface changed.\nIf intended, run `node scripts/check-extension-surface.mjs --write` and commit the snapshot with the change marked in the commit.\n--- expected\n' + baseline + '--- actual\n' + current);
  process.exit(1);
}
console.log(`check:extension-surface: ${names.length} symbols match the baseline.`);
```

- [ ] **Step 2: Generate the baseline.** `npm run package && node scripts/check-extension-surface.mjs --write`. Inspect `docs/internal/extension-surface.snapshot`: it must list the Task-10 exports.

- [ ] **Step 3: Wire the script into CI.** There is no aggregate script that chains the `check:*` family, and the `check` script is bare `svelte-check` (the type gate); do NOT modify `check`. Add `"check:extension-surface": "node scripts/check-extension-surface.mjs"` to `package.json` scripts, then add a `- run: npm run check:extension-surface` step to `.github/workflows/test.yml` (and to the publish/e2e workflows if a release gates on it). The doc/package `check:*` gates run individually in CI, so wiring the workflow is what makes the gate enforce.

- [ ] **Step 4: Prove it catches drift.** Temporarily add a dummy export to `src/lib/extend/index.ts`, `npm run package`, run `node scripts/check-extension-surface.mjs`, confirm exit 1; revert.

- [ ] **Step 5: Run the gate, commit.**

```bash
npm run check && npm run check:extension-surface && npm test
git add scripts/check-extension-surface.mjs docs/internal/extension-surface.snapshot package.json .github/workflows/test.yml
git commit -m "feat(extend): check:extension-surface gate snapshotting the public surface"
```

---

### Task 12: Update the dev package to mint a principal, and the phase gate

**Files:**
- Modify: the `@glw907/cairn-cms-dev` package source that currently sets `locals.editor` (find with `grep -rn "locals.editor\|auth_tier\|createSession" packages/ examples/ 2>/dev/null`)
- Modify: `packages/cairn-cms-dev/src/handle.test.ts` (the `locals.editor` deep-equal assertion)
- Modify: `packages/cairn-cms-dev/src/env.d.ts` (the `locals` type comment)
- Modify: `CHANGELOG.md` (phase-1 entry with the "Consumers must" list)
- Modify: `docs/STATUS.md` (the carry-forward)

**Interfaces:**
- Consumes: the principal model.
- Produces: the dev backend sets `locals.principal` (an admin-tier owner principal) so local development matches the new gate.

> Compiling-unit note: `cairn-cms-dev` is a real workspace and its `handle.test.ts`/`env.d.ts` are tied to `locals.editor`. These edits must land in the SAME compiling unit as the Task 9 `locals.editor`→`locals.principal` migration. Run the workspace tsc (`npm run check:dev-package`) before declaring Task 9 green; a green root `check` does not cover the dev workspace.

- [ ] **Step 1: Find the dev-package auth shim.** `grep -rn "locals.editor" packages/ examples/`. The dev `handle.ts` sets a synthetic editor to bypass the magic-link loop in dev; `handle.test.ts` asserts the shape; `env.d.ts` types `locals`.

- [ ] **Step 2: Change `handle.ts` to set a principal.**

```ts
// where it set locals.editor = { email, displayName, role: 'owner' }
event.locals.principal = { email, displayName, scopes: ['admin:owner', 'admin:editor'], tier: 'admin' };
```

  Refresh the `handle.ts` comment that described the Editor shape so it describes the principal.

- [ ] **Step 3: Update the dev-package test and env types.** In `packages/cairn-cms-dev/src/handle.test.ts`, change the assertion from `event.locals.editor` deep-equal `{ email, displayName, role: 'owner' }` to `event.locals.principal` deep-equal `{ email, displayName, scopes: ['admin:owner', 'admin:editor'], tier: 'admin' }`, and assert `event.locals.principal` is `undefined` on a public (non-dev-backend) path. In `packages/cairn-cms-dev/src/env.d.ts`, refresh the `locals` comment to describe `principal`, not `editor`.

- [ ] **Step 4: Extend the dev `fake-auth-db` for the new SQL.** The dev backend's `fake-auth-db` is a SQL-string dispatcher that throws on any SQL it does not recognize, so the new `createSession` (with `auth_tier`), `consumeToken` (`RETURNING ... tier, redirect_to`), and `auth_rate` upsert will throw unless handled. Find it (`grep -rn "fake-auth-db" packages/` or similar) and extend it: add the new SQL arms, and give the `auth_rate` `INSERT ... ON CONFLICT ... RETURNING count` arm a `.results`-bearing batch result (the rate check reads `res[1].results?.[0].count`), so `checkAndIncrementRate` resolves instead of throwing.

- [ ] **Step 5: Write the CHANGELOG entry.** Under an unreleased heading, list the breaking change and the Consumers-must steps: re-import `@glw907/cairn-cms/ambient` (now declares `locals.principal`); replace any `locals.editor` read with `locals.principal`; `requireSession`/`requireOwner` now return `Principal` (was `Editor`); `data.user.role` still present (derived); wire `auth.authorize` in the adapter if using member scopes; pass `createAuthGuard({ authorize })` if so.

- [ ] **Step 6: Run the FULL phase gate.**

```bash
npm run check && npm run check:dev-package && npm test && npm run check:comments && npm run check:reference && npm run check:package && npm run check:extension-surface && npm run check:version
```

All green. Then the from-scratch consumer build smoke (the load-bearing proof the dist `./extend` subpath resolves): `cd examples/showcase && rm -rf node_modules package-lock.json && npm install && npm run build`.

- [ ] **Step 7: Update STATUS and commit.** Set the `docs/STATUS.md` immediate-next-action to "phase 2 (admin-screen seam)". Commit:

```bash
git add packages/ examples/ CHANGELOG.md docs/STATUS.md
git commit -m "feat(auth): dev backend mints a principal; close phase 1 identity foundation"
```

---

## Self-Review

**Spec coverage** (against `2026-06-28-cairn-developer-extensibility-design.md`, "The identity foundation" + "Phasing" phase 1):

- Principal + AuthTier + scopes → Task 2. role→scope breaking mapping → Tasks 2, 9. `resolveSession` inner-join fix → Task 3 (`resolvePrincipalRow`, which now also left-joins `editor.display_name`). displayName flow (editor name when present, email fallback for members) → Tasks 3, 5. Live/lazy/fail-closed authorize contract → Tasks 4, 5, 7 (the `authorize: undefined` lazy-on-/admin call). Session lifecycle (rotation/fixation) → Tasks 3, 8. Revocation is live → inherent in per-request resolution (Tasks 5, 7). loadPrincipal/requireScope/requireAnyScope/hasScope → Tasks 2, 6. Guard resolves everywhere, enforces /admin on admin-tier + scope → Task 7. CSRF/HTTPS/AUTH_DB travel with the auth path → Tasks 7, 8 (negative + positive member-CSRF paths in Task 7; the `issueCsrfToken` contract note). Per-IP rate limit (keyed on `cf-connecting-ip`) → Tasks 3, 8. sendMagicLink/confirmMagicLink → Task 8 (standalone in `auth-routes.ts`); signIn → Task 8 (server-only `auth-routes.server.ts`). forgetPrincipal → Tasks 3, 10. redirect validation → Task 6. trust-tier partition → Tasks 1, 3, 5, 7. The engine event `locals` shape (`src/lib/sveltekit/types.ts`) → Task 9. ./extend subpath + exports allow-list + "./internal/*": null → Task 10; the `check:reference` CONFIG entry that registers the subpath → Task 10. `requireSession`/`requireOwner` return type `Editor`→`Principal` in `docs/reference/sveltekit.md` (for `check:reference:signatures`) → Task 9. check:extension-surface (wired into `.github/workflows/test.yml`, NOT into `check`) → Task 11. The `CairnLogEvent` union extension (the closed union in `src/lib/log/events.ts`) paired with `docs/reference/log-events.md`: `auth.authorize.failed` → Task 4, `auth.scope.denied` → Task 6, `auth.signin`/`auth.link.rate_limited` → Task 8. ambient → Task 9. dev package (`handle.ts` principal, `handle.test.ts` assertion, `env.d.ts`, `fake-auth-db` SQL arms, `check:dev-package`) → Task 12.
- Deferred to later phases by design: AdminShell/AdminShellData/admin.nav (phase 2); cairn-doctor extension check, versioning docs, the two-site migration proof (phase 3). The `forgetPrincipal` primitive ships in phase 1 but its GDPR doc note rides phase 3 docs.

**Placeholder scan:** No "TBD"/"implement later". Each code step shows the code. The Task 9 sweep gives the exact grep plus the transform pattern plus representative examples, which is concrete guidance for a mechanical change, not a placeholder.

**Type consistency:** `Principal` { email, displayName, scopes, tier } is used identically in Tasks 2, 5, 6, 7, 9, 10. `createSession(db, id, email, tier, expiresAt, now)` parameter order is consistent across Tasks 3, 8 and the temporary call in Task 3 Step 6. `resolvePrincipalRow` returns `{ email, tier, role, displayName }` in Tasks 3, 5 (the `displayName` field added so `resolvePrincipal` can surface the editor name without a second query). `runAuthorize(authorize, ctx, deadlineMs?)` matches Tasks 4, 5. `requireScope(event, scope, opts?)` matches Tasks 6, the spec, and the `./extend` re-export. `consumeToken` returning `{ email, tier, redirectTo }` is introduced in Task 8 Step 1 (with its consumers listed) and consumed in Task 8 Step 5 (`confirmMagicLink`) consistently.

**Sequencing flag for the orchestrator:** Tasks 7, 9, and 12 form one compiling unit. Task 7 switches the guard to `locals.principal`; Task 9 declares the field (`src/lib/sveltekit/types.ts` `EventBase.locals` and `src/lib/ambient.ts`) and migrates every engine reader; Task 12 migrates the `cairn-cms-dev` workspace (`handle.ts`/`handle.test.ts`/`env.d.ts`). Task 7 does NOT compile alone. Run the full `npm run check` 0/0 gate at the end of Task 9 and `npm run check:dev-package` for the workspace; review the diffs together. The intermediate Tasks 8, 10, 11 sit between 9 and 12 but do not touch `locals`, so the dev-workspace tsc only needs to be green by the end of Task 12.
