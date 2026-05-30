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
