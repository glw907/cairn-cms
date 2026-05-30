# Cairn Rebuild 01: Self-Owned Magic-Link Auth on D1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build cairn's authentication as a lean, self-owned magic-link system on D1: a per-site email allowlist, single-use POST-confirmed tokens, D1-backed sessions, and a two-role model with last-owner anti-lockout, all driven by the real `load`/action functions against a real local D1.

**Architecture:** Auth is engine code (engine-fat, site-thin). The engine talks to D1 through prepared statements and ships hand-written migration SQL; there is no better-auth, no Kysely, and no ORM. Core logic splits into a crypto layer (token and session-id generation, SHA-256 hashing) and a D1 store layer (editors, tokens, sessions), both pure over their inputs and tested against real D1. A thin SvelteKit layer under `src/lib/sveltekit/` adapts SvelteKit request events to that core: a guard `Handle`, the request/confirm/logout handlers, and the owner-gated manage-editors handlers. Events are typed structurally so the engine never depends on a site's generated `App.*` ambient types. The email send crosses an injected sender boundary, so tests capture links in a sink with no `send_email` binding.

**Tech Stack:** D1 via `@cloudflare/workers-types` `D1Database`, Web Crypto (`crypto.subtle`, `crypto.getRandomValues`), `@sveltejs/kit` `redirect`/`error`/`fail` plus the `isRedirect`/`isHttpError` guards, Vitest 4.1 with `@cloudflare/vitest-pool-workers` against real miniflare D1.

**Source spec:** `docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md` (section 7.1, the seam in section 6, the test design in section 9, and auth acceptance scenarios 1 through 9 in section 10).

**Divergences from the frozen `legacy/` auth (deliberate, spec-driven):**

- **Anti-lockout rule.** Legacy refused an owner's self-targeted remove or demote. The spec's rule is the last *remaining* owner: an owner may demote or remove another owner, but the system refuses to drop below one owner. This plan counts owners, it does not compare against the acting user.
- **Demotion takes effect live.** Legacy revoked a demoted editor's sessions explicitly. Here the guard resolves the role from the `editor` row on every request by joining session to editor, so a role change or removal takes effect on the next request with no session bookkeeping.
- **No better-auth.** The whole better-auth instance, its Drizzle adapter, and the admin/access plugins are gone. The two transferable patterns kept from legacy are the structural event typing and the injected email-sender boundary.

---

## File structure (created or changed in this plan)

| Path | Responsibility |
|---|---|
| `migrations/0000_auth.sql` | The three auth tables: `editor`, `magic_token`, `session`. Applied by the existing test harness automatically. |
| `src/lib/auth/types.ts` | Shared auth types: `Role`, `Editor`, `AuthEnv`, the row shapes. |
| `src/lib/auth/crypto.ts` | Token and session-id generation, SHA-256 token hashing, TTL and cookie constants. |
| `src/lib/auth/store.ts` | D1 prepared-statement access: editors, tokens, sessions, owner count. |
| `src/lib/email.ts` | The `EmailSender` boundary: the magic-link message builder and the default Cloudflare Email Sending implementation. |
| `src/lib/sveltekit/types.ts` | Structural SvelteKit event subsets (`RequestContext`, `CookieJar`, `HandleInput`), so the engine stays free of a site's `App.*`. |
| `src/lib/sveltekit/guard.ts` | `createAuthGuard()` (the `/admin/**` `Handle`), `requireSession`, `requireOwner`, `logout`. |
| `src/lib/sveltekit/auth-routes.ts` | `createAuthRoutes({ branding, send })`: the request, confirm-load, confirm, and logout handlers. |
| `src/lib/sveltekit/editors-routes.ts` | `createEditorRoutes()`: owner-gated list, add, remove, and set-role handlers with anti-lockout. |
| `src/lib/index.ts` | Engine entry: re-export the auth types and helpers that sites consume. |
| `src/lib/sveltekit/index.ts` | `/sveltekit` entry: re-export the guard and route factories. |
| `src/tests/integration/_auth-harness.ts` | Shared test helpers: seed an editor, build cookie jars and request events, assert thrown redirects and HTTP errors. |
| `src/tests/unit/auth-crypto.test.ts` | Crypto unit tests. |
| `src/tests/unit/email.test.ts` | Email-builder unit tests. |
| `src/tests/integration/auth-schema.test.ts` | The migration creates the three tables. |
| `src/tests/integration/auth-store.test.ts` | The D1 store: single-use tokens, expiry, live-role session resolution, owner count. |
| `src/tests/integration/auth-request.test.ts` | Request-link allowlist and no-leak behavior (scenarios 1, 2). |
| `src/tests/integration/auth-confirm.test.ts` | Confirm load and POST: single-use, expiry, GET-consumes-nothing (scenarios 1, 3, 4, 5). |
| `src/tests/integration/auth-guard.test.ts` | Guard redirect and admit, logout (scenario 6). |
| `src/tests/integration/auth-editors.test.ts` | Roles, manage-editors, last-owner anti-lockout, live demotion (scenarios 7, 8, 9). |

**Constants locked here** (in `src/lib/auth/crypto.ts`): the session cookie is `cairn_session`; the token TTL is 10 minutes; the session TTL is 30 days; timestamps are epoch milliseconds in `INTEGER` columns. Store functions take `now` and `expiresAt` as explicit numeric parameters so expiry is deterministic in tests; the SvelteKit layer passes `Date.now()`.

---

## Task 1: Auth schema migration

**Files:**
- Create: `migrations/0000_auth.sql`
- Create: `src/tests/integration/auth-schema.test.ts`

The existing harness reads `migrations/` at vitest-config load (`readD1Migrations`) and applies the SQL in `beforeAll`, so adding the file is all that is needed; no config change.

- [ ] **Step 1: Write the failing schema test**

Create `src/tests/integration/auth-schema.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { it, expect } from 'vitest';

it('creates the editor, magic_token, and session tables', async () => {
  const { results } = await env.AUTH_DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  ).all<{ name: string }>();
  const names = results.map((r) => r.name);
  expect(names).toContain('editor');
  expect(names).toContain('magic_token');
  expect(names).toContain('session');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL on the new test; the tables do not exist yet.

- [ ] **Step 3: Write the migration**

Create `migrations/0000_auth.sql`:
```sql
-- Self-owned magic-link auth on D1 (spec 7.1). Timestamps are epoch milliseconds.
CREATE TABLE editor (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  created_at INTEGER NOT NULL
);

CREATE TABLE magic_token (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_magic_token_email ON magic_token (email);
CREATE INDEX idx_session_email ON session (email);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS. If the runner reports only one statement ran, confirm how the installed `readD1Migrations` splits statements (it splits on `;`); the plain semicolon-terminated statements above are the supported form.

- [ ] **Step 5: Commit**

```bash
git add migrations/0000_auth.sql src/tests/integration/auth-schema.test.ts
git commit -m "feat(auth): add D1 schema migration for editors, tokens, sessions"
```

---

## Task 2: Crypto primitives

**Files:**
- Create: `src/lib/auth/crypto.ts`
- Create: `src/tests/unit/auth-crypto.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/tests/unit/auth-crypto.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateToken, generateSessionId, hashToken } from '../../lib/auth/crypto.js';

describe('hashToken', () => {
  it('is the lowercase hex SHA-256 of the input', async () => {
    // Known vector: SHA-256("abc").
    expect(await hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic and 64 hex chars', async () => {
    const a = await hashToken('some-token-value');
    const b = await hashToken('some-token-value');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateToken / generateSessionId', () => {
  it('returns url-safe strings with no padding', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateSessionId()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('does not repeat across calls', () => {
    const seen = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(seen.size).toBe(100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:unit
```
Expected: FAIL; the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth/crypto.ts`:
```ts
// Token and session-id generation plus SHA-256 token hashing, on Web Crypto so the
// code runs unchanged in workerd. The store keeps only the hash of a token, never the
// token itself (spec 7.1).

/** The session cookie name. */
export const COOKIE_NAME = 'cairn_session';

/** Magic-link tokens live 10 minutes. */
export const TOKEN_TTL_MS = 10 * 60 * 1000;

/** Sessions live 30 days. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomBase64Url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** A fresh 256-bit magic-link token, url-safe. */
export function generateToken(): string {
  return randomBase64Url(32);
}

/** A fresh 256-bit session id, url-safe. */
export function generateSessionId(): string {
  return randomBase64Url(32);
}

/** The lowercase hex SHA-256 of a token, for storage and lookup. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:unit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/crypto.ts src/tests/unit/auth-crypto.test.ts
git commit -m "feat(auth): add token and session crypto primitives"
```

---

## Task 3: D1 store and the test harness

**Files:**
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/store.ts`
- Create: `src/tests/integration/_auth-harness.ts`
- Create: `src/tests/integration/auth-store.test.ts`

- [ ] **Step 1: Write the shared types**

Create `src/lib/auth/types.ts`:
```ts
import type { D1Database } from '@cloudflare/workers-types';

export type Role = 'owner' | 'editor';

/** The session shape the whole admin reads: guard, loads, content fns, manage-editors. */
export interface Editor {
  email: string;
  displayName: string;
  role: Role;
}

/** Worker bindings and vars the auth layer reads; a structural subset of `Platform.env`. */
export interface AuthEnv {
  AUTH_DB?: D1Database;
  /** Canonical origin for confirmation links, never read from a request header (spec 7.1, risk H3). */
  PUBLIC_ORIGIN?: string;
  /** Cloudflare Email Sending binding. */
  EMAIL?: {
    send(message: {
      to: string;
      from: string;
      subject: string;
      html: string;
      text: string;
    }): Promise<void>;
  };
}
```

- [ ] **Step 2: Write the test harness with a seed helper**

Create `src/tests/integration/_auth-harness.ts`:
```ts
import { env } from 'cloudflare:test';
import type { Role } from '../../lib/auth/types.js';

/** Insert an editor row directly. The editor table is the allowlist, so a row is "may sign in". */
export async function seedEditor(email: string, displayName: string, role: Role, now = Date.now()): Promise<void> {
  await env.AUTH_DB.prepare(
    'INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(email, displayName, role, now)
    .run();
}

/** Count the rows in a table, for assertions that nothing was written or consumed. */
export async function countRows(table: 'editor' | 'magic_token' | 'session'): Promise<number> {
  const row = await env.AUTH_DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}
```

- [ ] **Step 3: Write the failing store test**

Create `src/tests/integration/auth-store.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor } from './_auth-harness.js';
import {
  findEditor,
  issueToken,
  consumeToken,
  createSession,
  resolveSession,
  deleteSession,
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  countOwners,
} from '../../lib/auth/store.js';

const db = env.AUTH_DB;

// Each test starts from an empty allowlist; the harness D1 persists across a file.
beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM session'),
    db.prepare('DELETE FROM magic_token'),
    db.prepare('DELETE FROM editor'),
  ]);
});

describe('editors', () => {
  it('finds a seeded editor and returns null for an unknown one', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    expect(await findEditor(db, 'ed@x.dev')).toEqual({ email: 'ed@x.dev', displayName: 'Ed', role: 'editor' });
    expect(await findEditor(db, 'nope@x.dev')).toBeNull();
  });

  it('lists editors sorted by email and counts owners', async () => {
    await seedEditor('b@x.dev', 'B', 'editor');
    await seedEditor('a@x.dev', 'A', 'owner');
    expect((await listEditors(db)).map((e) => e.email)).toEqual(['a@x.dev', 'b@x.dev']);
    expect(await countOwners(db)).toBe(1);
  });

  it('inserts, sets role, and removes', async () => {
    await insertEditor(db, 'new@x.dev', 'New', 'editor', Date.now());
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('editor');
    await setEditorRole(db, 'new@x.dev', 'owner');
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('owner');
    await deleteEditor(db, 'new@x.dev');
    expect(await findEditor(db, 'new@x.dev')).toBeNull();
  });
});

describe('magic tokens (single-use by construction)', () => {
  it('issues a token and consumes it exactly once', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-1', future, Date.now());
    expect(await consumeToken(db, 'hash-1', Date.now())).toBe('ed@x.dev');
    expect(await consumeToken(db, 'hash-1', Date.now())).toBeNull();
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const past = Date.now() - 10_000;
    await issueToken(db, 'ed@x.dev', 'hash-2', past, Date.now());
    expect(await consumeToken(db, 'hash-2', Date.now())).toBeNull();
  });

  it('replaces a prior token for the same email', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const future = Date.now() + 10_000;
    await issueToken(db, 'ed@x.dev', 'old', future, Date.now());
    await issueToken(db, 'ed@x.dev', 'new', future, Date.now());
    expect(await consumeToken(db, 'old', Date.now())).toBeNull();
    expect(await consumeToken(db, 'new', Date.now())).toBe('ed@x.dev');
  });
});

describe('sessions (server-side, role read live)', () => {
  it('resolves a valid session to the editor with the current role', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const future = Date.now() + 10_000;
    await createSession(db, 'sid-1', 'own@x.dev', future, Date.now());
    expect(await resolveSession(db, 'sid-1', Date.now())).toEqual({
      email: 'own@x.dev',
      displayName: 'Own',
      role: 'owner',
    });
    // A role change is reflected on the next resolve with no session change.
    await setEditorRole(db, 'own@x.dev', 'editor');
    expect((await resolveSession(db, 'sid-1', Date.now()))?.role).toBe('editor');
  });

  it('returns null for an expired session and after the editor is removed', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-exp', 'ed@x.dev', Date.now() - 1, Date.now());
    expect(await resolveSession(db, 'sid-exp', Date.now())).toBeNull();

    await createSession(db, 'sid-live', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await deleteEditor(db, 'ed@x.dev');
    expect(await resolveSession(db, 'sid-live', Date.now())).toBeNull();
  });

  it('deletes a session', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    await createSession(db, 'sid-del', 'ed@x.dev', Date.now() + 10_000, Date.now());
    await deleteSession(db, 'sid-del');
    expect(await resolveSession(db, 'sid-del', Date.now())).toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL; `src/lib/auth/store.js` does not exist.

- [ ] **Step 5: Write the store**

Create `src/lib/auth/store.ts`:
```ts
// D1 access for auth, through prepared statements only. No ORM. Each function takes the
// `AUTH_DB` binding plus primitives, so it is testable against a real local D1 and free of
// SvelteKit. Callers pass `now`/`expiresAt` in epoch milliseconds.
import type { D1Database } from '@cloudflare/workers-types';
import type { Editor, Role } from './types.js';

type EditorCols = { email: string; display_name: string; role: Role };

function toEditor(row: EditorCols): Editor {
  return { email: row.email, displayName: row.display_name, role: row.role };
}

/** Look an email up in the allowlist. */
export async function findEditor(db: D1Database, email: string): Promise<Editor | null> {
  const row = await db
    .prepare('SELECT email, display_name, role FROM editor WHERE email = ?')
    .bind(email)
    .first<EditorCols>();
  return row ? toEditor(row) : null;
}

/** Replace any prior token for this email with a fresh one, atomically. */
export async function issueToken(
  db: D1Database,
  email: string,
  tokenHash: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
    db
      .prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(tokenHash, email, expiresAt, now),
  ]);
}

/**
 * Consume a token in one atomic statement. A returned email means the token was present and
 * unexpired and is now gone, so the link is single-use by construction on strongly-consistent D1.
 */
export async function consumeToken(db: D1Database, tokenHash: string, now: number): Promise<string | null> {
  const row = await db
    .prepare('DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email')
    .bind(tokenHash, now)
    .first<{ email: string }>();
  return row?.email ?? null;
}

/** Create a session row. */
export async function createSession(
  db: D1Database,
  id: string,
  email: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db
    .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, email, expiresAt, now)
    .run();
}

/**
 * Resolve a session to its editor, joining `editor` so the role is read live. An expired
 * session or a removed editor resolves to null, which revokes access on the next request.
 */
export async function resolveSession(db: D1Database, id: string, now: number): Promise<Editor | null> {
  const row = await db
    .prepare(
      `SELECT e.email AS email, e.display_name AS display_name, e.role AS role
       FROM session s JOIN editor e ON e.email = s.email
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, now)
    .first<EditorCols>();
  return row ? toEditor(row) : null;
}

/** Delete a session (logout). */
export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM session WHERE id = ?').bind(id).run();
}

/** The full allowlist, sorted by email. */
export async function listEditors(db: D1Database): Promise<Editor[]> {
  const { results } = await db
    .prepare('SELECT email, display_name, role FROM editor ORDER BY email')
    .all<EditorCols>();
  return results.map(toEditor);
}

/** Add an editor to the allowlist. */
export async function insertEditor(
  db: D1Database,
  email: string,
  displayName: string,
  role: Role,
  now: number,
): Promise<void> {
  await db
    .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(email, displayName, role, now)
    .run();
}

/** Remove an editor and cut their live access (sessions and any pending token go too). */
export async function deleteEditor(db: D1Database, email: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(email),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
    db.prepare('DELETE FROM editor WHERE email = ?').bind(email),
  ]);
}

/** Change an editor's role. The guard reads the new role on the next request. */
export async function setEditorRole(db: D1Database, email: string, role: Role): Promise<void> {
  await db.prepare('UPDATE editor SET role = ? WHERE email = ?').bind(role, email).run();
}

/** How many owners exist, for the last-owner anti-lockout rule. */
export async function countOwners(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM editor WHERE role = 'owner'").first<{ n: number }>();
  return row?.n ?? 0;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS, all store tests green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth/types.ts src/lib/auth/store.ts src/tests/integration/_auth-harness.ts src/tests/integration/auth-store.test.ts
git commit -m "feat(auth): add D1 store for editors, tokens, and sessions"
```

---

## Task 4: Email sender boundary

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/tests/unit/email.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/tests/unit/email.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildMagicLinkMessage, cloudflareSend, type AuthEnv } from '../../lib/email.js';

describe('buildMagicLinkMessage', () => {
  it('addresses the editor and embeds the link in both parts', () => {
    const msg = buildMagicLinkMessage({
      to: 'ed@x.dev',
      branding: { siteName: 'EC Nordic', from: 'noreply@ecnordic.ski' },
      link: 'https://ecnordic.ski/admin/auth/confirm?token=abc',
    });
    expect(msg.to).toBe('ed@x.dev');
    expect(msg.from).toBe('noreply@ecnordic.ski');
    expect(msg.subject).toContain('EC Nordic');
    expect(msg.html).toContain('https://ecnordic.ski/admin/auth/confirm?token=abc');
    expect(msg.text).toContain('https://ecnordic.ski/admin/auth/confirm?token=abc');
  });
});

describe('cloudflareSend', () => {
  it('calls the EMAIL binding with the built message', async () => {
    const sent: unknown[] = [];
    const env: AuthEnv = { EMAIL: { send: async (m) => void sent.push(m) } };
    await cloudflareSend(env, {
      to: 'ed@x.dev',
      from: 'noreply@x.dev',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
    });
    expect(sent).toHaveLength(1);
  });

  it('throws a clear error when the EMAIL binding is missing', async () => {
    await expect(
      cloudflareSend({}, { to: 'a', from: 'b', subject: 's', html: 'h', text: 't' }),
    ).rejects.toThrow(/EMAIL/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:unit
```
Expected: FAIL; the module does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/lib/email.ts`:
```ts
// The email boundary. The send is injected so tests capture links in a sink with no
// send_email binding; production passes `cloudflareSend`, which calls env.EMAIL.send
// (Cloudflare Email Sending, arbitrary recipients).
import type { AuthEnv } from './auth/types.js';

export type { AuthEnv };

/** The message a built magic-link email carries. */
export interface MagicLinkMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

/** Per-site identity for the magic-link email, sourced from the adapter. */
export interface AuthBranding {
  siteName: string;
  from: string;
  replyTo?: string;
}

/** The injected send. Production uses `cloudflareSend`; tests pass a sink. */
export type SendMagicLink = (env: AuthEnv, message: MagicLinkMessage) => Promise<void>;

/** Build the confirmation email. The link is the only action; the copy stays plain. */
export function buildMagicLinkMessage(input: {
  to: string;
  branding: AuthBranding;
  link: string;
}): MagicLinkMessage {
  const { to, branding, link } = input;
  const subject = `Sign in to ${branding.siteName}`;
  const text = `Open this link to sign in to ${branding.siteName}:\n\n${link}\n\nThe link expires in 10 minutes. If you did not request it, ignore this email.`;
  const html = `<p>Open this link to sign in to ${branding.siteName}:</p><p><a href="${link}">Sign in</a></p><p>The link expires in 10 minutes. If you did not request it, ignore this email.</p>`;
  return { to, from: branding.from, subject, html, text };
}

/** The production send: Cloudflare Email Sending through the EMAIL binding. */
export const cloudflareSend: SendMagicLink = async (env, message) => {
  if (!env.EMAIL) throw new Error('EMAIL binding is not configured');
  await env.EMAIL.send(message);
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:unit
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/tests/unit/email.test.ts
git commit -m "feat(auth): add injected email-sender boundary"
```

---

## Task 5: SvelteKit structural types and the request-link handler

**Files:**
- Create: `src/lib/sveltekit/types.ts`
- Create: `src/lib/sveltekit/auth-routes.ts`
- Append: `src/tests/integration/_auth-harness.ts` (event and assertion helpers)
- Create: `src/tests/integration/auth-request.test.ts`

This implements scenarios 1 and 2: an allow-listed editor gets exactly one link; a non-allow-listed email gets the same response and no link.

- [ ] **Step 1: Write the structural event types**

Create `src/lib/sveltekit/types.ts`:
```ts
// Structural subsets of SvelteKit's RequestEvent. A site passes its real event, which has
// these and more, so the engine never imports a site's generated App.* ambient types.
import type { AuthEnv, Editor } from '../auth/types.js';

export interface CookieSetOptions {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, opts: CookieSetOptions): void;
  delete(name: string, opts: { path: string }): void;
}

export interface RequestContext {
  url: URL;
  request: Request;
  cookies: CookieJar;
  locals: { editor?: Editor | null };
  platform?: { env?: AuthEnv };
  setHeaders?(headers: Record<string, string>): void;
}

export interface HandleInput {
  event: RequestContext;
  resolve(event: RequestContext): Promise<Response> | Response;
}
```

- [ ] **Step 2: Append event and assertion helpers to the harness**

Append to `src/tests/integration/_auth-harness.ts`:
```ts
import { isRedirect, isHttpError } from '@sveltejs/kit';
import { env } from 'cloudflare:test';
import type { CookieJar } from '../../lib/sveltekit/types.js';
import type { Editor } from '../../lib/auth/types.js';

/** An in-memory cookie jar matching the slice of SvelteKit's `cookies` API the engine uses. */
export function makeCookies(initial: Record<string, string> = {}): CookieJar & { jar: Map<string, string> } {
  const jar = new Map(Object.entries(initial));
  return {
    jar,
    get: (name) => jar.get(name),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name),
  };
}

/** Build a request event for a handler. `form` becomes a POST body. */
export function makeEvent(input: {
  url: string;
  form?: Record<string, string>;
  cookies?: CookieJar;
  editor?: Editor | null;
}) {
  const { url, form, cookies = makeCookies(), editor = null } = input;
  const request = form
    ? new Request(url, { method: 'POST', body: new URLSearchParams(form) })
    : new Request(url);
  return {
    url: new URL(url),
    request,
    cookies,
    locals: { editor },
    platform: { env: { AUTH_DB: env.AUTH_DB, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}

/** Run a handler that should throw a redirect; return its status and location. */
export async function expectRedirect(fn: () => Promise<unknown>): Promise<{ status: number; location: string }> {
  try {
    await fn();
  } catch (e) {
    if (isRedirect(e)) return { status: e.status, location: e.location };
    throw e;
  }
  throw new Error('expected a redirect, none thrown');
}

/** Run a handler that should throw an HTTP error; return its status. */
export async function expectHttpError(fn: () => Promise<unknown>): Promise<{ status: number }> {
  try {
    await fn();
  } catch (e) {
    if (isHttpError(e)) return { status: e.status };
    throw e;
  }
  throw new Error('expected an HTTP error, none thrown');
}
```

- [ ] **Step 3: Write the failing request-link test**

Create `src/tests/integration/auth-request.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeEvent, countRows } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import type { MagicLinkMessage } from '../../lib/email.js';

const db = env.AUTH_DB;

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

function routesWithSink() {
  const sent: MagicLinkMessage[] = [];
  const routes = createAuthRoutes({
    branding: { siteName: 'Test', from: 'noreply@test.dev' },
    send: async (_env, message) => void sent.push(message),
  });
  return { routes, sent };
}

describe('request a link (scenarios 1, 2)', () => {
  it('sends exactly one link to an allow-listed editor and stores a token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'ed@x.dev' } }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('ed@x.dev');
    expect(sent[0].html).toContain('https://test.dev/admin/auth/confirm?token=');
    expect(await countRows('magic_token')).toBe(1);
  });

  it('returns the same response and sends nothing for a non-allow-listed email', async () => {
    const { routes, sent } = routesWithSink();
    const result = await routes.requestAction(makeEvent({ url: 'https://test.dev/admin/auth/request', form: { email: 'stranger@x.dev' } }));
    expect(result).toEqual({ sent: true });
    expect(sent).toHaveLength(0);
    expect(await countRows('magic_token')).toBe(0);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL; `auth-routes.js` does not exist.

- [ ] **Step 5: Write the request handler (partial route factory)**

Create `src/lib/sveltekit/auth-routes.ts`:
```ts
// The SvelteKit handlers for the magic-link flow, consumed by a site's thin route shims.
// The factory takes per-site branding and an injected send, so tests run the real handlers
// against a sink. The confirm-load, confirm, and logout handlers arrive in Task 6.
import { requireOrigin } from '../env.js';
import { generateToken, hashToken, TOKEN_TTL_MS } from '../auth/crypto.js';
import { findEditor, issueToken } from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, type AuthBranding, type SendMagicLink } from '../email.js';
import type { RequestContext } from './types.js';

export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
}

export function createAuthRoutes(config: AuthRoutesConfig) {
  const send = config.send ?? cloudflareSend;

  /**
   * POST /admin/auth/request. Looks the email up in the allowlist; on a match, issues a token
   * and emails the confirmation link. The response is identical whether or not the email is
   * allow-listed, so the endpoint never leaks membership.
   */
  async function requestAction(event: RequestContext): Promise<{ sent: true }> {
    const env = event.platform?.env ?? {};
    const origin = requireOrigin(env);
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();

    const editor = email ? await findEditor(env.AUTH_DB!, email) : null;
    if (editor) {
      const token = generateToken();
      const now = Date.now();
      await issueToken(env.AUTH_DB!, email, await hashToken(token), now + TOKEN_TTL_MS, now);
      const link = `${origin}/admin/auth/confirm?token=${encodeURIComponent(token)}`;
      await send(env, buildMagicLinkMessage({ to: email, branding: config.branding, link }));
    }
    return { sent: true };
  }

  return { requestAction };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS, both request-link tests green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sveltekit/types.ts src/lib/sveltekit/auth-routes.ts src/tests/integration/_auth-harness.ts src/tests/integration/auth-request.test.ts
git commit -m "feat(auth): add request-link handler with no-leak allowlist"
```

---

## Task 6: Confirm load and POST

**Files:**
- Modify: `src/lib/sveltekit/auth-routes.ts` (add `confirmLoad`, `confirmAction`, `logoutAction`)
- Create: `src/tests/integration/auth-confirm.test.ts`

This implements scenarios 1, 3, 4, and 5: a GET of the confirm link consumes nothing; the POST verifies once; a replay fails; an expired token fails.

- [ ] **Step 1: Write the failing confirm test**

Create `src/tests/integration/auth-confirm.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeEvent, makeCookies, countRows, expectRedirect } from './_auth-harness.js';
import { createAuthRoutes } from '../../lib/sveltekit/auth-routes.js';
import { generateToken, hashToken, COOKIE_NAME } from '../../lib/auth/crypto.js';
import { issueToken } from '../../lib/auth/store.js';

const db = env.AUTH_DB;
const routes = createAuthRoutes({ branding: { siteName: 'Test', from: 'noreply@test.dev' }, send: async () => {} });

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM magic_token'), db.prepare('DELETE FROM editor')]);
});

/** Seed an editor and a live token, returning the raw token for a confirm POST. */
async function liveToken(email: string): Promise<string> {
  await seedEditor(email, 'Ed', 'editor');
  const token = generateToken();
  const now = Date.now();
  await issueToken(db, email, await hashToken(token), now + 10_000, now);
  return token;
}

describe('confirm GET (scenario 5: consumes nothing)', () => {
  it('returns the token and leaves it in the store', async () => {
    const token = await liveToken('ed@x.dev');
    const data = await routes.confirmLoad(makeEvent({ url: `https://test.dev/admin/auth/confirm?token=${token}` }));
    expect(data).toEqual({ token });
    expect(await countRows('magic_token')).toBe(1);
  });
});

describe('confirm POST (scenarios 1, 3, 4)', () => {
  it('verifies a valid token once: creates a session, sets the cookie, redirects to /admin', async () => {
    const token = await liveToken('ed@x.dev');
    const cookies = makeCookies();
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token }, cookies })),
    );
    expect(redirect).toEqual({ status: 303, location: '/admin' });
    expect(cookies.get(COOKIE_NAME)).toBeTruthy();
    expect(await countRows('session')).toBe(1);
    expect(await countRows('magic_token')).toBe(0);
  });

  it('refuses a replayed token', async () => {
    const token = await liveToken('ed@x.dev');
    await expectRedirect(() => routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })));
    const replay = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })),
    );
    expect(replay.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(1);
  });

  it('refuses an expired token', async () => {
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const token = generateToken();
    const now = Date.now();
    await issueToken(db, 'ed@x.dev', await hashToken(token), now - 1, now);
    const redirect = await expectRedirect(() =>
      routes.confirmAction(makeEvent({ url: 'https://test.dev/admin/auth/confirm', form: { token } })),
    );
    expect(redirect.location).toBe('/admin/login?error=expired');
    expect(await countRows('session')).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL; `confirmLoad`/`confirmAction` are not exported.

- [ ] **Step 3: Add the confirm and logout handlers**

In `src/lib/sveltekit/auth-routes.ts`, update the imports and add the handlers inside `createAuthRoutes`, then return them. Replace the import block and the `return` statement:

Change the imports at the top to:
```ts
import { redirect } from '@sveltejs/kit';
import { requireOrigin } from '../env.js';
import {
  generateToken,
  generateSessionId,
  hashToken,
  TOKEN_TTL_MS,
  SESSION_TTL_MS,
  COOKIE_NAME,
} from '../auth/crypto.js';
import { findEditor, issueToken, consumeToken, createSession, deleteSession } from '../auth/store.js';
import { buildMagicLinkMessage, cloudflareSend, type AuthBranding, type SendMagicLink } from '../email.js';
import type { RequestContext } from './types.js';
```

Add these handlers inside `createAuthRoutes`, after `requestAction`:
```ts
  /**
   * GET /admin/auth/confirm. Renders the confirm page and consumes nothing; only the POST
   * verifies. Sets Referrer-Policy: no-referrer so the token does not leak to a referrer.
   */
  async function confirmLoad(event: RequestContext): Promise<{ token: string }> {
    event.setHeaders?.({ 'Referrer-Policy': 'no-referrer' });
    return { token: event.url.searchParams.get('token') ?? '' };
  }

  /**
   * POST /admin/auth/confirm. Hashes the submitted token and consumes it atomically. A valid
   * token yields the email; the handler creates a session, sets the cookie, and redirects to
   * /admin. An invalid, replayed, or expired token redirects to the login page.
   */
  async function confirmAction(event: RequestContext): Promise<never> {
    const env = event.platform?.env ?? {};
    const form = await event.request.formData();
    const token = String(form.get('token') ?? '');
    if (!token) throw redirect(303, '/admin/login?error=expired');

    const email = await consumeToken(env.AUTH_DB!, await hashToken(token), Date.now());
    if (!email) throw redirect(303, '/admin/login?error=expired');

    const id = generateSessionId();
    const now = Date.now();
    await createSession(env.AUTH_DB!, id, email, now + SESSION_TTL_MS, now);
    event.cookies.set(COOKIE_NAME, id, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    throw redirect(303, '/admin');
  }

  /** POST /admin/auth/logout. Deletes the session row and clears the cookie. */
  async function logoutAction(event: RequestContext): Promise<never> {
    const env = event.platform?.env ?? {};
    const id = event.cookies.get(COOKIE_NAME);
    if (id) await deleteSession(env.AUTH_DB!, id);
    event.cookies.delete(COOKIE_NAME, { path: '/' });
    throw redirect(303, '/admin/login');
  }
```

Change the `return` to:
```ts
  return { requestAction, confirmLoad, confirmAction, logoutAction };
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS, all confirm tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/auth-routes.ts src/tests/integration/auth-confirm.test.ts
git commit -m "feat(auth): add POST-confirm verification and logout"
```

---

## Task 7: The guard

**Files:**
- Create: `src/lib/sveltekit/guard.ts`
- Create: `src/tests/integration/auth-guard.test.ts`

This implements scenario 6: an anonymous request to `/admin` redirects to `/admin/login`; a valid session reaches `/admin` with `locals.editor` populated.

- [ ] **Step 1: Write the failing guard test**

Create `src/tests/integration/auth-guard.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeCookies, expectRedirect } from './_auth-harness.js';
import { createAuthGuard } from '../../lib/sveltekit/guard.js';
import { createSession } from '../../lib/auth/store.js';
import { COOKIE_NAME } from '../../lib/auth/crypto.js';
import type { RequestContext } from '../../lib/sveltekit/types.js';

const db = env.AUTH_DB;
const handle = createAuthGuard();
const OK = new Response('ok');

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

function event(pathname: string, cookies = makeCookies()): RequestContext {
  const url = `https://test.dev${pathname}`;
  return {
    url: new URL(url),
    request: new Request(url),
    cookies,
    locals: {},
    platform: { env: { AUTH_DB: db, PUBLIC_ORIGIN: 'https://test.dev' } },
    setHeaders: () => {},
  };
}

async function seedSession(email: string): Promise<ReturnType<typeof makeCookies>> {
  await seedEditor(email, 'Ed', 'owner');
  await createSession(db, 'sid-ok', email, Date.now() + 10_000, Date.now());
  return makeCookies({ [COOKIE_NAME]: 'sid-ok' });
}

describe('guard (scenario 6)', () => {
  it('redirects an anonymous request to a protected path', async () => {
    const r = await expectRedirect(() => handle({ event: event('/admin'), resolve: async () => OK }));
    expect(r).toEqual({ status: 303, location: '/admin/login' });
  });

  it('admits a valid session and populates locals.editor', async () => {
    const cookies = await seedSession('own@x.dev');
    const ev = event('/admin', cookies);
    const res = await handle({ event: ev, resolve: async () => OK });
    expect(res).toBe(OK);
    expect(ev.locals.editor).toEqual({ email: 'own@x.dev', displayName: 'Ed', role: 'owner' });
  });

  it('lets the login and auth endpoints through without a session', async () => {
    const res1 = await handle({ event: event('/admin/login'), resolve: async () => OK });
    const res2 = await handle({ event: event('/admin/auth/request'), resolve: async () => OK });
    expect(res1).toBe(OK);
    expect(res2).toBe(OK);
  });

  it('ignores non-admin paths', async () => {
    const res = await handle({ event: event('/about'), resolve: async () => OK });
    expect(res).toBe(OK);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL; `guard.js` does not exist.

- [ ] **Step 3: Write the guard**

Create `src/lib/sveltekit/guard.ts`:
```ts
// The /admin guard, plus the per-load owner/session gates. A site's hooks.server.ts sets
// `export const handle = createAuthGuard()`. Events are typed structurally, so the engine
// stays free of a site's App.* ambient types.
import { redirect, error } from '@sveltejs/kit';
import { resolveSession } from '../auth/store.js';
import { COOKIE_NAME } from '../auth/crypto.js';
import type { Editor } from '../auth/types.js';
import type { HandleInput, RequestContext } from './types.js';

/** The login page and the auth endpoints are public; everything else under /admin is gated. */
function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** The SvelteKit `Handle` that guards `/admin/**`. */
export function createAuthGuard() {
  return async function handle({ event, resolve }: HandleInput): Promise<Response> {
    const { pathname } = event.url;
    if (!isAdminPath(pathname) || isPublicAdminPath(pathname)) {
      return resolve(event);
    }
    const env = event.platform?.env ?? {};
    const id = event.cookies.get(COOKIE_NAME);
    const editor = id && env.AUTH_DB ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
    if (!editor) throw redirect(303, '/admin/login');
    event.locals.editor = editor;
    return resolve(event);
  };
}

/** For a protected load/action: the session the guard already resolved, or a login redirect. */
export function requireSession(event: RequestContext): Editor {
  const editor = event.locals.editor;
  if (!editor) throw redirect(303, '/admin/login');
  return editor;
}

/** For the management surface: a signed-in owner, or 403 for an editor. */
export function requireOwner(event: RequestContext): Editor {
  const editor = requireSession(event);
  if (editor.role !== 'owner') throw error(403, 'Owner access required');
  return editor;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS, all guard tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/guard.ts src/tests/integration/auth-guard.test.ts
git commit -m "feat(auth): add the /admin session guard"
```

---

## Task 8: Manage editors, roles, and anti-lockout

**Files:**
- Create: `src/lib/sveltekit/editors-routes.ts`
- Create: `src/tests/integration/auth-editors.test.ts`

This implements scenarios 7, 8, and 9: an editor is rejected from the management surface; the last owner cannot be removed or demoted; a demotion takes effect on the next request with no re-login.

- [ ] **Step 1: Write the failing editors test**

Create `src/tests/integration/auth-editors.test.ts`:
```ts
import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEditor, makeEvent, countRows, expectHttpError } from './_auth-harness.js';
import { createEditorRoutes } from '../../lib/sveltekit/editors-routes.js';
import { findEditor, createSession, resolveSession } from '../../lib/auth/store.js';

const db = env.AUTH_DB;
const routes = createEditorRoutes();

beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM session'), db.prepare('DELETE FROM editor')]);
});

/** Build an event whose locals.editor is the acting owner (as the guard would set it). */
function asOwner(form?: Record<string, string>) {
  const ev = makeEvent({ url: 'https://test.dev/admin/editors', form, editor: { email: 'own@x.dev', displayName: 'Own', role: 'owner' } });
  return ev;
}

describe('management gate (scenario 7)', () => {
  it('rejects an editor from the management surface with 403', async () => {
    const ev = makeEvent({ url: 'https://test.dev/admin/editors', editor: { email: 'ed@x.dev', displayName: 'Ed', role: 'editor' } });
    const r = await expectHttpError(() => routes.editorsLoad(ev));
    expect(r.status).toBe(403);
  });

  it('lists editors for an owner', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const data = await routes.editorsLoad(asOwner());
    expect(data.editors.map((e) => e.email)).toEqual(['ed@x.dev', 'own@x.dev']);
    expect(data.self).toBe('own@x.dev');
  });
});

describe('add, remove, set role', () => {
  it('adds an editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.addEditorAction(asOwner({ email: 'New@x.dev', name: 'New', role: 'editor' }));
    expect(result).toEqual({ ok: true });
    expect((await findEditor(db, 'new@x.dev'))?.role).toBe('editor');
  });

  it('removes a non-last-owner editor', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('ed@x.dev', 'Ed', 'editor');
    const result = await routes.removeEditorAction(asOwner({ email: 'ed@x.dev' }));
    expect(result).toEqual({ ok: true });
    expect(await findEditor(db, 'ed@x.dev')).toBeNull();
  });
});

describe('last-owner anti-lockout (scenario 8)', () => {
  it('refuses to remove the last owner and writes nothing', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.removeEditorAction(asOwner({ email: 'own@x.dev' }));
    expect(result.status).toBe(400);
    expect(await countRows('editor')).toBe(1);
  });

  it('refuses to demote the last owner', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    const result = await routes.setRoleAction(asOwner({ email: 'own@x.dev', role: 'editor' }));
    expect(result.status).toBe(400);
    expect((await findEditor(db, 'own@x.dev'))?.role).toBe('owner');
  });

  it('allows demoting an owner when another owner remains', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('two@x.dev', 'Two', 'owner');
    const result = await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    expect(result).toEqual({ ok: true });
    expect((await findEditor(db, 'two@x.dev'))?.role).toBe('editor');
  });
});

describe('demotion takes effect live (scenario 9)', () => {
  it('a demoted editor resolves with the new role on the next request, no re-login', async () => {
    await seedEditor('own@x.dev', 'Own', 'owner');
    await seedEditor('two@x.dev', 'Two', 'owner');
    await createSession(db, 'sid-two', 'two@x.dev', Date.now() + 10_000, Date.now());
    expect((await resolveSession(db, 'sid-two', Date.now()))?.role).toBe('owner');
    await routes.setRoleAction(asOwner({ email: 'two@x.dev', role: 'editor' }));
    expect((await resolveSession(db, 'sid-two', Date.now()))?.role).toBe('editor');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test:integration
```
Expected: FAIL; `editors-routes.js` does not exist.

- [ ] **Step 3: Write the editors routes**

Create `src/lib/sveltekit/editors-routes.ts`:
```ts
// Owner-gated editor management. The editor table is the allowlist, so add and remove are
// insert and delete. The anti-lockout rule is the last remaining owner: the system refuses to
// drop below one owner (spec 7.1), counting owners rather than comparing against the acting user.
import { fail } from '@sveltejs/kit';
import { requireOwner } from './guard.js';
import {
  listEditors,
  findEditor,
  insertEditor,
  deleteEditor,
  setEditorRole,
  countOwners,
} from '../auth/store.js';
import type { Editor, Role } from '../auth/types.js';
import type { RequestContext } from './types.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseRole(value: FormDataEntryValue | null): Role {
  return value === 'owner' ? 'owner' : 'editor';
}

export function createEditorRoutes() {
  /** GET /admin/editors. Owner-only. Returns the allowlist and the acting owner's email. */
  async function editorsLoad(event: RequestContext): Promise<{ editors: Editor[]; self: string }> {
    const owner = requireOwner(event);
    const editors = await listEditors(event.platform!.env!.AUTH_DB!);
    return { editors, self: owner.email };
  }

  /** POST add an editor. Owner-only. */
  async function addEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const name = String(form.get('name') ?? '').trim();
    const role = parseRole(form.get('role'));
    if (!EMAIL_RE.test(email) || !name) return fail(400, { error: 'Enter a valid email and name' });
    if (await findEditor(db, email)) return fail(400, { error: 'That editor already exists' });
    await insertEditor(db, email, name, role, Date.now());
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner. */
  async function removeEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (target.role === 'owner' && (await countOwners(db)) <= 1) {
      return fail(400, { error: 'You cannot remove the last owner' });
    }
    await deleteEditor(db, email);
    return { ok: true as const };
  }

  /** POST change an editor's role. Owner-only. Refuses demoting the last owner. */
  async function setRoleAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const role = parseRole(form.get('role'));
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (role === 'editor' && target.role === 'owner' && (await countOwners(db)) <= 1) {
      return fail(400, { error: 'You cannot demote the last owner' });
    }
    await setEditorRole(db, email, role);
    return { ok: true as const };
  }

  return { editorsLoad, addEditorAction, removeEditorAction, setRoleAction };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:integration
```
Expected: PASS, all editors tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/editors-routes.ts src/tests/integration/auth-editors.test.ts
git commit -m "feat(auth): add owner-gated editor management with last-owner anti-lockout"
```

---

## Task 9: Wire the package exports and verify the gate

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `src/lib/sveltekit/index.ts`

- [ ] **Step 1: Re-export the engine surface**

Replace `src/lib/index.ts`:
```ts
// Engine entry. Auth lands here in Plan 01; content, github, render, and nav follow.
export { requireOrigin } from './env.js';
export type { Role, Editor, AuthEnv } from './auth/types.js';
export type { AuthBranding, MagicLinkMessage, SendMagicLink } from './email.js';
export { buildMagicLinkMessage, cloudflareSend } from './email.js';
```

- [ ] **Step 2: Re-export the SvelteKit surface**

Replace `src/lib/sveltekit/index.ts`:
```ts
// SvelteKit server logic consumed by site route shims: the guard plus the auth and
// editor-management route factories.
export { createAuthGuard, requireSession, requireOwner } from './guard.js';
export { createAuthRoutes, type AuthRoutesConfig } from './auth-routes.js';
export { createEditorRoutes } from './editors-routes.js';
export type { RequestContext, CookieJar, HandleInput } from './types.js';
```

- [ ] **Step 3: Run the full gate**

Run:
```bash
npm run check
npm test
npm run package
```
Expected: `svelte-check` 0 errors (the one expected "no svelte input files" warning remains until Plan 05); both vitest projects pass, including every new auth test; `svelte-package` builds `dist/` with the auth modules under the three subpaths.

- [ ] **Step 4: Commit**

```bash
git add src/lib/index.ts src/lib/sveltekit/index.ts
git commit -m "feat(auth): export the auth engine and sveltekit surface"
```

---

## Task 10: Exit criteria

**Files:** none (verification only).

- [ ] **Step 1: Confirm the acceptance scenarios are covered**

Each auth scenario from spec section 10 maps to a passing test:

| Scenario | Test |
|---|---|
| 1 request → link → confirm → /admin | `auth-request` + `auth-confirm` (valid POST) |
| 2 non-allow-listed gets same response, no link | `auth-request` (no-leak) |
| 3 token works once, replay fails | `auth-confirm` (replay) + `auth-store` (single-use) |
| 4 expired token fails | `auth-confirm` (expired) + `auth-store` (expiry) |
| 5 GET consumes nothing | `auth-confirm` (confirm GET) |
| 6 anon → login, valid session → /admin | `auth-guard` |
| 7 owner sees management, editor rejected | `auth-editors` (403 gate) |
| 8 last owner cannot be removed or demoted | `auth-editors` (anti-lockout) |
| 9 demotion takes effect next request | `auth-editors` + `auth-store` (live role) |

- [ ] **Step 2: Confirm the full suite and gate are green**

Run:
```bash
npm run check
npm test
```
Expected: 0 errors; all unit and integration projects pass.

- [ ] **Step 3: Confirm no better-auth or ORM crept in**

Run:
```bash
grep -rn "better-auth\|drizzle\|kysely" src/lib && echo "LEAK" || echo "clean: self-owned auth only"
```
Expected: "clean: self-owned auth only".

**Plan 01 is complete when both steps pass.** The engine now owns magic-link auth on D1 end to end: an allow-listed editor signs in by email, a single-use POST-confirmed token mints a server-side session, the guard gates `/admin` and reads the role live, and owners manage the allowlist under a last-owner anti-lockout. Plan 02 builds the content model and the adapter contract on top of this, and the live `/admin` smoke (real email and a real session row) follows the rebuilt smoke doc once the admin UI exists in Plan 05.

---

## Self-review notes

- **Spec coverage.** Schema (spec 7.1) is Task 1; the single-use token, POST-confirm, sessions, guard, roles, and anti-lockout (spec 7.1) are Tasks 3 through 8; the injected email sender and the `PUBLIC_ORIGIN`-only origin (spec 7.1) are Tasks 4 and 5. All nine auth acceptance scenarios map to tests in Task 10.
- **Divergences are deliberate.** The last-owner rule and the live-role read replace legacy's self-target rule and session revocation; both are stated in the header and enforced by `auth-editors` tests.
- **Seam discipline.** Events are typed structurally (`RequestContext`), so the engine never imports a site's `App.*`. The email send crosses an injected boundary. Neither couples the engine to a site or to a deployed Worker.
- **No forward references.** Every symbol used in a later task is defined in an earlier one: `crypto.ts` (Task 2) before the store (Task 3), the store before the routes (Tasks 5 through 8), the structural types (Task 5) before the guard (Task 7). `requireOrigin` comes from Plan 00's `env.ts`.
- **Deferred by design.** The Svelte components for the login, confirm, and manage-editors pages arrive in Plan 05; this plan builds and tests the server `load`/action functions they will call. The contract test asserting a single resolved `@sveltejs/kit` across the package boundary (spec 5) lands with the distribution guards in Plan 07.

---

## Execution record (2026-05-28)

Plan 01 executed end to end in one session against the test suite. Final gate: `svelte-check`
0 errors (the one "no svelte input files" warning stays until Plan 05), `npm test` 45 passing
(unit plus integration on real miniflare D1), `npm run package` builds, and the leak grep reports
self-owned auth only. All ten tasks landed as their own commits on branch `rebuild`. Every auth
acceptance scenario (spec section 10) maps to a passing test.

**Two deviations from the verbatim plan, both deliberate.**

1. The cookie `Secure` flag is derived from the request protocol (`event.url.protocol === 'https:'`)
   rather than hardcoded `true`. The spec writes the cookie as `Secure`. Deriving it keeps the cookie
   Secure on every real HTTPS deploy and still lets it stick on local `http://`, so Plan 05's live
   admin smoke under `wrangler dev` does not break in a way that looks like an auth bug. The
   production posture is unchanged.
2. Two `auth-editors` assertions use `toHaveProperty('status', 400)` rather than `result.status`. The
   verbatim form did not type-check against the `ActionFailure | { ok: true }` union. This form reads
   the failure status without fighting the union.

**Review gate.** Ran the code-simplifier plus three opus review subagents in parallel
(`web-auth-security-reviewer`, `cloudflare-workers-reviewer`, `svelte-reviewer`). Findings folded in
this plan:

- Atomic last-owner anti-lockout. The old count-then-write (`countOwners`, then delete or update)
  let two concurrent owner removals both pass the check and strand zero owners. It now uses two
  guarded single-statement store ops, `removeOwnerIfNotLast` and `demoteOwnerIfNotLast`, that fold
  the owner count into the `DELETE`/`UPDATE` and report whether the row changed. `countOwners` is gone.
- `requireDb(env)` gives a missing `AUTH_DB` binding a named error, matching `requireOrigin`. The
  route handlers dropped their `env.AUTH_DB!` assertions.
- `siteName` is HTML-escaped in the magic-link body, since a site's config is untrusted input.
- `setHeaders` is required in `RequestContext`, so a site cannot silently drop the confirm page's
  `Referrer-Policy: no-referrer`.

**By design, not a defect.** The reviewers suggested rotating sessions on a role change. That
conflicts with the plan's stated live-role-read divergence. The guard resolves the role from the
editor row on every request, so a demotion takes effect on the next request with no session
bookkeeping.

**Deferred security follow-ups,** each tracked for the named plan:

- Rate limiting and request-endpoint timing. The request endpoint returns an identical body for an
  allow-listed and an unknown email. An allow-listed email still does more work (hash, D1 write, email
  send), which is a measurable timing oracle. The proper fix pairs a rate limiter with moving the send
  off the response path via `waitUntil` and a dummy hash on the miss path. It needs platform plumbing
  the structural `RequestContext` does not expose. Handle with the admin surface in Plan 05, or the
  distribution and site work in Plan 07.
- Security headers on `/admin` (CSP, `X-Content-Type-Options`, frame denial, HSTS). Plan 05.
- CSRF documentation. Consuming sites must not disable SvelteKit's `csrf.checkOrigin`, and
  `PUBLIC_ORIGIN` must match the deploy origin. Document this with the site wiring in Plan 05 or 07.
- D1 read-after-write under read replication. Confirm writes a session row, and the redirect's guard
  reads it on a separate request. With read replication on, that read could land on a stale replica
  and bounce a just-signed-in user. It is latent today because no replicas are configured. Use the D1
  Sessions API (`first-primary` or a bookmark) on the auth read path before enabling read replication.
- Token-in-URL note for the Plan 05 confirm page. The page must put the token only in a POST form
  field and render no third-party resources, so an email scanner that submits simple forms cannot
  consume the token.

**Carryover gotcha.** `D1PreparedStatement.run()` exposes `.meta.changes`, which the new guarded ops
rely on to tell an applied write from a refused one. This holds on both miniflare D1 and real D1.
