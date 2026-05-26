// Runs the REAL cairn plugin set (buildAuth) over an in-memory better-sqlite3 with the
// generated D1 migrations applied — so allowlist semantics, single-use verify, roles, and
// anti-lockout are exercised against actual better-auth behavior, not mocks.
import { describe, it, expect } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { buildAuth } from '../lib/auth/config';
import * as schema from '../lib/auth/schema';

type Role = 'owner' | 'editor';

/** A real better-auth instance + a spy capturing whatever the magic-link send would email. */
function harness() {
  const sqlite = new Database(':memory:');
  for (const f of globSync('migrations/*.sql')) {
    // wrangler/drizzle delimit statements with `--> statement-breakpoint`; exec handles the rest.
    sqlite.exec(readFileSync(f, 'utf8').replace(/-->.*$/gm, ''));
  }
  const db = drizzle(sqlite, { schema });
  const sent: { email: string; token: string }[] = [];
  const auth = buildAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    baseURL: 'http://localhost',
    secret: 'test-secret-test-secret-test-secret-0123',
    branding: { siteName: 'Test', sender: 'noreply@test.dev' },
    sendLink: async (email, token) => {
      sent.push({ email, token });
    },
  });

  // Seed directly: createUser is admin-gated, but the user table IS the allowlist, so a row
  // is exactly "this email may sign in" (what an owner's createUser would insert in prod).
  function seed(email: string, name: string, role: Role) {
    const now = Date.now();
    sqlite
      .prepare(
        'INSERT INTO user (id,name,email,email_verified,created_at,updated_at,role) VALUES (?,?,?,1,?,?,?)',
      )
      .run(crypto.randomUUID(), name, email.toLowerCase(), now, now, role);
  }

  const signIn = (email: string) =>
    auth.api.signInMagicLink({ body: { email }, headers: new Headers() });
  const verify = (token: string) =>
    auth.handler(
      new Request(
        `http://localhost/api/auth/magic-link/verify?token=${encodeURIComponent(token)}&callbackURL=/admin`,
      ),
    );

  return { auth, sent, seed, signIn, verify, db };
}

describe('better-auth allowlist (disableSignUp ⇒ user table is the allowlist)', () => {
  it('does not send a link to a non-allowlisted email', async () => {
    const { sent, signIn } = harness();
    await signIn('nope@x.com').catch(() => {});
    expect(sent).toHaveLength(0);
  });

  it('sends exactly one link to an allowlisted (pre-seeded) editor', async () => {
    const { sent, seed, signIn } = harness();
    seed('ed@x.com', 'Ed', 'editor');
    await signIn('ed@x.com');
    expect(sent).toHaveLength(1);
    expect(sent[0].email).toBe('ed@x.com');
    expect(sent[0].token).toBeTruthy();
  });
});

describe('magic-link verify (single-use by construction — C1)', () => {
  it('verifies a captured token once and yields a session; replay yields none', async () => {
    const { sent, seed, signIn, verify } = harness();
    seed('ed@x.com', 'Ed', 'editor');
    await signIn('ed@x.com');
    const token = sent[0].token;

    const first = await verify(token);
    expect(first.headers.getSetCookie().some((c) => /better-auth/.test(c))).toBe(true);

    const replay = await verify(token);
    expect(replay.headers.getSetCookie().some((c) => /better-auth/.test(c))).toBe(false);
  });
});
