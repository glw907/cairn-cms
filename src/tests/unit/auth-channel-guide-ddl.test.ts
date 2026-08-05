// cairn-cms: the login-channel guide's DDL block is pinned to CHANNEL_SCHEMA_SQL, not merely
// described from it, since a site copies that block verbatim into its own migration file (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, Storage). A guide that drifts
// from the real constant would ship a site a schema its own binding never matches, failing
// verifySchema at every request with `{error: 'unavailable'}` and no clue why.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHANNEL_SCHEMA_SQL } from '../../lib/auth-channel/store.js';

const ROOT = resolve(__dirname, '../../..');

/** The login-channel guide's own fenced ```sql DDL block. */
function guideDdlBlock(): string {
  const guide = readFileSync(resolve(ROOT, 'docs/guides/add-a-login-channel.md'), 'utf-8');
  const match = /```sql\n([\s\S]*?)```/.exec(guide);
  if (!match) throw new Error('add-a-login-channel.md carries no fenced sql block');
  return match[1];
}

describe('the login-channel guide pins CHANNEL_SCHEMA_SQL byte for byte', () => {
  it('matches the store constant exactly, modulo the markdown fence’s own surrounding blank lines', () => {
    expect(guideDdlBlock().trim()).toBe(CHANNEL_SCHEMA_SQL.trim());
  });
});
