// Test-only helpers for the auth-channel factory's integration suites. The channel schema is not
// applied through the wrangler migrations directory (that machinery is AUTH_DB's own, engine-owned
// migration story): a site runs CHANNEL_SCHEMA_SQL itself, so the harness replays it directly
// against the CHANNEL_DB test binding.
import type { D1Database } from '@cloudflare/workers-types';
import { CHANNEL_SCHEMA_SQL } from '../../lib/auth-channel/store.js';

/** Apply the auth-channel factory's schema to a fresh D1 binding, statement by statement. */
export async function applyChannelSchema(db: D1Database): Promise<void> {
  const statements = CHANNEL_SCHEMA_SQL.split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

/** Empty every channel table, for a clean slate between tests within one file. */
export async function resetChannelDb(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM cairn_channel_code'),
    db.prepare('DELETE FROM cairn_channel_session'),
    db.prepare('DELETE FROM cairn_channel_budget'),
    db.prepare("DELETE FROM cairn_channel_meta WHERE key != 'schema_version'"),
  ]);
}

/**
 * Read a budget row directly for assertions. Mirrors `store.ts`'s private bucket-and-scope key
 * composition (`${scope}:${bucket}`); this is a test-only convenience, not a claim on the
 * store's internal format.
 */
export async function readBudgetRow(
  db: D1Database,
  bucket: string,
  scope: string,
): Promise<{ count: number; windowStart: number; prevCount: number } | null> {
  const row = await db
    .prepare('SELECT count, window_start, prev_count FROM cairn_channel_budget WHERE bucket = ?1')
    .bind(`${scope}:${bucket}`)
    .first<{ count: number; window_start: number; prev_count: number }>();
  return row ? { count: row.count, windowStart: row.window_start, prevCount: row.prev_count } : null;
}
