// Runs the REAL cairn plugin set (buildAuth) over an in-memory better-sqlite3 with the
// generated D1 migrations applied, so allowlist semantics, single-use verify, roles, and
// anti-lockout are exercised against actual better-auth behavior, not mocks.
import { describe, it, expect } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { buildAuth } from '../lib/auth/config';
import { confirmSignIn, type CairnUser } from '../lib/auth/guard';
import { adminsLoad, addAdmin, removeAdmin, setAdminRole, requireOwner } from '../lib/auth/admins';
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

  // Sign a seeded user in fully and return their session as a `Cookie` header value, so admin
  // API calls (which authorize via the session in headers) run as that real user.
  async function cookieFor(email: string): Promise<string> {
    await signIn(email);
    const token = sent.at(-1)!.token;
    const res = await verify(token);
    return res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  }

  return { auth, sent, seed, signIn, verify, cookieFor, db };
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

describe('magic-link verify (single-use by construction, C1)', () => {
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

describe('confirmSignIn (POST-confirm proxy, C2)', () => {
  function confirmEvent(auth: ReturnType<typeof harness>['auth'], token: string) {
    const form = new FormData();
    form.set('token', token);
    return {
      request: new Request('http://localhost/admin/auth/confirm', { method: 'POST', body: form }),
      locals: { auth },
      url: new URL('http://localhost/admin/auth/confirm'),
    };
  }

  it('consumes a token via POST → 303 to /admin with session cookies; replay redirects to login', async () => {
    const { auth, sent, seed, signIn } = harness();
    seed('ed@x.com', 'Ed', 'editor');
    await signIn('ed@x.com');
    const token = sent[0].token;

    const res = await confirmSignIn(confirmEvent(auth, token));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin');
    expect(res.headers.getSetCookie().some((c) => /better-auth/.test(c))).toBe(true);

    // Replaying the now-consumed token throws a SvelteKit redirect back to login.
    await expect(confirmSignIn(confirmEvent(auth, token))).rejects.toMatchObject({
      status: 303,
      location: '/admin/login?error=expired',
    });
  });
});

describe('manage-editors (owner-gated, on auth.api, AUTH-2)', () => {
  const owner: CairnUser = { id: '', email: 'o@x.com', name: 'O', role: 'owner' };

  function ev(auth: ReturnType<typeof harness>['auth'], cookie: string, user: CairnUser | null, form?: Record<string, string>, query = '') {
    const fd = new FormData();
    for (const [k, v] of Object.entries(form ?? {})) fd.set(k, v);
    return {
      locals: { auth, user },
      request: new Request('http://localhost/admin/admins', { method: 'POST', headers: { cookie }, body: form ? fd : undefined }),
      url: new URL(`http://localhost/admin/admins${query}`),
    };
  }

  it('requireOwner: null → 401, editor → 403, owner passes', () => {
    expect(() => requireOwner(null)).toThrow();
    expect(() => requireOwner({ id: '1', email: 'e@x.com', name: 'E', role: 'editor' })).toThrow();
    expect(requireOwner(owner).role).toBe('owner');
  });

  it('owner can add, list, re-role (revokes sessions), and remove an editor', async () => {
    const h = harness();
    h.seed('o@x.com', 'O', 'owner');
    const cookie = await h.cookieFor('o@x.com');

    await expect(addAdmin(ev(h.auth, cookie, owner, { email: 'new@x.com', name: 'New', role: 'editor' })))
      .rejects.toMatchObject({ status: 303, location: '/admin/admins?saved=1' });

    let list = await adminsLoad(ev(h.auth, cookie, owner, undefined, '?saved=1'));
    expect(list.admins.map((a) => a.email).sort()).toEqual(['new@x.com', 'o@x.com']);
    expect(list.admins.find((a) => a.email === 'new@x.com')!.role).toBe('editor');

    await expect(setAdminRole(ev(h.auth, cookie, owner, { email: 'new@x.com', role: 'owner' })))
      .rejects.toMatchObject({ status: 303, location: '/admin/admins?saved=1' });
    list = await adminsLoad(ev(h.auth, cookie, owner));
    expect(list.admins.find((a) => a.email === 'new@x.com')!.role).toBe('owner');

    await expect(removeAdmin(ev(h.auth, cookie, owner, { email: 'new@x.com' })))
      .rejects.toMatchObject({ status: 303, location: '/admin/admins?saved=1' });
    list = await adminsLoad(ev(h.auth, cookie, owner));
    expect(list.admins.map((a) => a.email)).toEqual(['o@x.com']);
  });

  it('anti-lockout: an owner cannot remove or demote themselves', async () => {
    const h = harness();
    h.seed('o@x.com', 'O', 'owner');
    const cookie = await h.cookieFor('o@x.com');

    await expect(removeAdmin(ev(h.auth, cookie, owner, { email: 'o@x.com' })))
      .rejects.toMatchObject({ location: expect.stringContaining('error=') });
    await expect(setAdminRole(ev(h.auth, cookie, owner, { email: 'o@x.com', role: 'editor' })))
      .rejects.toMatchObject({ location: expect.stringContaining('error=') });

    const list = await adminsLoad(ev(h.auth, cookie, owner));
    expect(list.admins.find((a) => a.email === 'o@x.com')!.role).toBe('owner');
  });
});
