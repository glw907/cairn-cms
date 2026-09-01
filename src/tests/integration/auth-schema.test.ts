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

  it('carries a nullable nonce_hash column on magic_token (migration 0004)', async () => {
    // Nullable by design: a row written before the migration landed carries NULL and stays
    // confirmable, which is what keeps applying 0004 from stranding an in-flight magic link.
    const { results } = await env.AUTH_DB.prepare('PRAGMA table_info(magic_token)').all<{
      name: string;
      notnull: number;
    }>();
    const column = results.find((row) => row.name === 'nonce_hash');
    expect(column).toBeDefined();
    expect(column?.notnull).toBe(0);
  });
});
