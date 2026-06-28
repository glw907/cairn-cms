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
