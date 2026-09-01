// cairn-cms: the packaged migrations-channel/0000_channel.sql is the channel schema's canonical
// text (conventions pass, Task 8: CHANNEL_SCHEMA_SQL retires as an export in favor of a packaged
// migration file, the same form AUTH_DB's own migrations/ already ships). Two things can drift
// away from it, and each gets its own assertion here.
//
// The showcase fixture is byte-equal, since the showcase applies its copy with
// `wrangler d1 migrations apply` exactly the way a consumer site would, so a drifted copy would
// leave the fixture's MEMBER_DB out of step with what createAuthChannel's own store expects.
//
// The schema_version the file seeds is PARSED OUT and compared against CHANNEL_SCHEMA_VERSION, the
// value verifySchema demands on every action: a constant cannot byte-equal a SQL file, and the two
// disagreeing is a total, fail-closed login outage on a correctly migrated database.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHANNEL_SCHEMA_VERSION } from '../../lib/auth-channel/store.js';

const ROOT = resolve(__dirname, '../../..');
const PACKAGED_PATH = 'migrations-channel/0000_channel.sql';
const SHOWCASE_PATH = 'examples/showcase/migrations-members/0000_channel.sql';

/** The seeding row's version literal, from the one `INSERT OR IGNORE` the migration ends with. */
const SEEDED_VERSION_RE = /INSERT OR IGNORE INTO cairn_channel_meta \(key, value\) VALUES \('schema_version', '([^']+)'\)/;

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf-8');
}

describe('the packaged channel migration is canonical', () => {
  it('is copied byte for byte into the showcase fixture', () => {
    expect(read(SHOWCASE_PATH)).toBe(read(PACKAGED_PATH));
  });

  it('seeds the schema_version verifySchema demands', () => {
    const seeded = SEEDED_VERSION_RE.exec(read(PACKAGED_PATH));
    expect(seeded).not.toBeNull();
    expect(seeded?.[1]).toBe(CHANNEL_SCHEMA_VERSION);
  });

  it('ships every statement in idempotent form, so an already-provisioned database can adopt it', () => {
    const sql = read(PACKAGED_PATH);
    const statements = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(/^(CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|INSERT OR IGNORE INTO)\b/);
    }
  });
});
