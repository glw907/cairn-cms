import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('AUTH_DB migrations: the auth schema', () => {
  it('creates the editor, magic_token, and session tables', async () => {
    const { results } = await env.AUTH_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all<{ name: string }>();
    const names = results.map((r) => r.name);
    expect(names).toContain('editor');
    expect(names).toContain('magic_token');
    expect(names).toContain('session');
  });
});
