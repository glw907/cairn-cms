import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import migration0000 from '../../../migrations/0000_auth.sql?raw';
import migration0001 from '../../../migrations/0001_roles.sql?raw';

const db = env.AUTH_DB;

/**
 * Split a migration file into individual statements for `db.batch`. `D1Database.exec` splits
 * naively on every newline and chokes on a comment line or a multi-line `CREATE TABLE`, so the
 * migration harness runs each statement through `prepare` instead, the same as `applyD1Migrations`
 * does under the hood.
 */
function statements(raw: string): string[] {
  return raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function insertEditorRow(email: string, displayName: string, role: string, createdAt: number) {
  return db
    .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(email, displayName, role, createdAt)
    .run();
}

async function editorTableSql(): Promise<string | undefined> {
  const row = await db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'editor'")
    .first<{ sql: string }>();
  return row?.sql;
}

describe('migration 0001: open the editor role column', () => {
  it('is applied by the shared vitest integration harness for the rest of the suite', async () => {
    // _apply-migrations.ts applies every file under migrations/ before any integration test
    // runs, so by the time this test executes the editor table already has the open schema.
    expect(await editorTableSql()).not.toMatch(/CHECK/i);
  });

  it('rebuilds editor without the CHECK constraint, preserving existing rows', async () => {
    // Start from a clean pre-0001 schema: drop what the shared harness already migrated and
    // reapply 0000 alone, to reproduce the table this migration targets.
    await db.batch([
      db.prepare('DROP TABLE IF EXISTS editor'),
      db.prepare('DROP TABLE IF EXISTS magic_token'),
      db.prepare('DROP TABLE IF EXISTS session'),
    ]);
    await db.batch(statements(migration0000).map((statement) => db.prepare(statement)));
    expect(await editorTableSql()).toMatch(/CHECK/i);

    // Under 0000 alone, a role outside the CHECK's literal pair is rejected at the schema layer.
    await expect(insertEditorRow('club@x.dev', 'Club Admin', 'club-admin', 500)).rejects.toThrow();

    await insertEditorRow('own@x.dev', 'Own', 'owner', 1000);
    await insertEditorRow('ed@x.dev', 'Ed', 'editor', 2000);

    await db.batch(statements(migration0001).map((statement) => db.prepare(statement)));

    const { results } = await db
      .prepare('SELECT email, display_name, role, created_at FROM editor ORDER BY email')
      .all<{ email: string; display_name: string; role: string; created_at: number }>();
    expect(results).toEqual([
      { email: 'ed@x.dev', display_name: 'Ed', role: 'editor', created_at: 2000 },
      { email: 'own@x.dev', display_name: 'Own', role: 'owner', created_at: 1000 },
    ]);

    // The CHECK is gone: a role outside the old literal pair now inserts cleanly.
    await expect(insertEditorRow('club@x.dev', 'Club Admin', 'club-admin', 3000)).resolves.toBeDefined();
    expect(await editorTableSql()).not.toMatch(/CHECK/i);
  });
});
