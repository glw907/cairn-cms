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
