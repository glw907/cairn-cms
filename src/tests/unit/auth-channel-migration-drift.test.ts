// cairn-cms: examples/showcase/migrations-members/0000_channel.sql must equal
// CHANNEL_SCHEMA_SQL byte for byte, the same guarantee auth-channel-guide-ddl.test.ts holds for
// the guide's own fenced block (spec docs/superpowers/specs/2026-08-04-auth-channel-consumer-proof-design.md,
// "The showcase fixture"). The showcase applies this file with `wrangler d1 migrations apply` the
// same way a consumer site would, so a drifted copy would leave the fixture's MEMBER_DB schema
// silently out of step with what createAuthChannel's own store expects.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHANNEL_SCHEMA_SQL } from '../../lib/auth-channel/store.js';

const ROOT = resolve(__dirname, '../../..');

describe('the showcase fixture migration pins CHANNEL_SCHEMA_SQL byte for byte', () => {
  it('matches the store constant exactly, modulo the file’s own trailing newline', () => {
    const migration = readFileSync(
      resolve(ROOT, 'examples/showcase/migrations-members/0000_channel.sql'),
      'utf-8',
    );
    expect(migration.trim()).toBe(CHANNEL_SCHEMA_SQL.trim());
  });
});
