import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { D1DatabaseSession } from '@cloudflare/workers-types';
import {
  CHANNEL_BUDGET_WINDOW_MS,
  verifySchema,
  readSalt,
  provisionSalt,
  mintCode,
  readCodeRow,
  incrementAndReadCode,
  consumeCode,
  pruneRequesterRows,
  createChannelSession,
  resolveChannelSession,
  destroyChannelSession,
  revokeChannelSessions,
  charge,
  refund,
  sweep,
} from '../../lib/auth-channel/store.js';
import { deriveIdentity } from '../../lib/auth-channel/identity.js';
import { applyChannelSchema, resetChannelDb, readBudgetRow, channelSession as session } from './_channel-harness.js';

const db = env.CHANNEL_DB;

beforeAll(async () => {
  await applyChannelSchema();
});

beforeEach(async () => {
  await resetChannelDb();
});

describe('CHANNEL_DB is physically separate from AUTH_DB', () => {
  it('never writes a channel table into AUTH_DB', async () => {
    const { results } = await env.AUTH_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'cairn_channel%'",
    ).all<{ name: string }>();
    expect(results).toHaveLength(0);
  });

  it('carries every channel table and index on CHANNEL_DB', async () => {
    const { results } = await db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name")
      .all<{ name: string }>();
    const names = results.map((r) => r.name);
    expect(names).toContain('cairn_channel_meta');
    expect(names).toContain('cairn_channel_code');
    expect(names).toContain('cairn_channel_session');
    expect(names).toContain('cairn_channel_budget');
    expect(names).toContain('idx_cairn_channel_code_identity');
    expect(names).toContain('idx_cairn_channel_code_expires');
    expect(names).toContain('idx_cairn_channel_code_requester_bucket');
    expect(names).toContain('idx_cairn_channel_session_subject');
    expect(names).toContain('idx_cairn_channel_session_expires');
    expect(names).toContain('idx_cairn_channel_budget_window');
  });
});

describe('verifySchema', () => {
  it('is true against the applied schema', async () => {
    expect(await verifySchema(session())).toBe(true);
  });

  it('fails closed on an old shape and does not cache the failure', async () => {
    await db.prepare("UPDATE cairn_channel_meta SET value = '0' WHERE key = 'schema_version'").run();
    expect(await verifySchema(session())).toBe(false);
    // Restore, then check again in the same process: a cached false would still read false here.
    await db.prepare("UPDATE cairn_channel_meta SET value = '1' WHERE key = 'schema_version'").run();
    expect(await verifySchema(session())).toBe(true);
  });

  it('fails closed when the version row is entirely absent', async () => {
    await db.prepare("DELETE FROM cairn_channel_meta WHERE key = 'schema_version'").run();
    expect(await verifySchema(session())).toBe(false);
    await db
      .prepare("INSERT INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1')")
      .run();
  });
});

describe('salt provisioning', () => {
  it('provisions a fresh salt when absent, and readSalt then agrees', async () => {
    expect(await readSalt(session())).toBeNull();
    const salt = await provisionSalt(session());
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    expect(await readSalt(session())).toBe(salt);
  });

  it('races two concurrent provisions to exactly one salt', async () => {
    const [a, b] = await Promise.all([provisionSalt(session()), provisionSalt(session())]);
    expect(a).toBe(b);
  });

  it('returns the same salt on a later call rather than overwriting it', async () => {
    const first = await provisionSalt(session());
    const second = await provisionSalt(session());
    expect(second).toBe(first);
  });

  it('fails closed when the salt is absent after provisioning (a corrupted store)', async () => {
    const fakeSession = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true, meta: {} }),
          first: async () => null,
        }),
      }),
    } as unknown as D1DatabaseSession;
    await expect(provisionSalt(fakeSession)).rejects.toThrow(/identity salt missing/);
  });
});

describe('deriveIdentity across independently migrated databases', () => {
  it('derives different identities for the same contact under two fresh salts', async () => {
    const saltA = await provisionSalt(session());
    const idA = await deriveIdentity(saltA, null, 'shared@example.test');

    // A second "independently migrated" database: wipe the meta table entirely (including
    // schema_version, since a real fresh migration never carried the first deployment's salt
    // either) and provision a brand new salt from scratch.
    await db.prepare('DELETE FROM cairn_channel_meta').run();
    await db
      .prepare("INSERT INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1')")
      .run();
    const saltB = await provisionSalt(session());
    const idB = await deriveIdentity(saltB, null, 'shared@example.test');

    expect(saltA).not.toBe(saltB);
    expect(idA).not.toBe(idB);
  });
});

describe('mintCode', () => {
  it('mints a fresh nonce and writes attempts = 0', async () => {
    const now = 1_000_000;
    const admitted = await mintCode(session(), 'nonce-1', 'identity-1', 'code-hash-1', 'subject-1', now, 600_000, 60_000, 'bucket-1');
    expect(admitted).toBe(true);
    const row = await readCodeRow(session(), 'nonce-1', now);
    expect(row).toMatchObject({
      nonceHash: 'nonce-1',
      identity: 'identity-1',
      codeHash: 'code-hash-1',
      subject: 'subject-1',
      attempts: 0,
      requesterBucket: 'bucket-1',
    });
  });

  it('writes a decoy row (subject null) the same as a known-subject row', async () => {
    const now = 1_000_000;
    await mintCode(session(), 'nonce-decoy', 'identity-decoy', 'code-hash-decoy', null, now, 600_000, 60_000, 'bucket-1');
    const row = await readCodeRow(session(), 'nonce-decoy', now);
    expect(row?.subject).toBeNull();
  });

  it('serializes concurrent mints on one fresh nonce to exactly one write', async () => {
    const now = 2_000_000;
    const results = await Promise.all([
      mintCode(session(), 'nonce-race', 'identity-1', 'code-a', 'subject-a', now, 600_000, 60_000, 'bucket-1'),
      mintCode(session(), 'nonce-race', 'identity-1', 'code-b', 'subject-b', now, 600_000, 60_000, 'bucket-1'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const { results: rows } = await db
      .prepare('SELECT COUNT(*) AS n FROM cairn_channel_code WHERE nonce_hash = ?1')
      .bind('nonce-race')
      .all<{ n: number }>();
    expect(rows[0].n).toBe(1);
  });

  it('refuses to remint within the cooldown', async () => {
    const t0 = 3_000_000;
    await mintCode(session(), 'nonce-cd', 'identity-1', 'code-first', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    const second = await mintCode(session(), 'nonce-cd', 'identity-1', 'code-second', 'subject-1', t0 + 1_000, 600_000, 60_000, 'bucket-1');
    expect(second).toBe(false);
    const row = await readCodeRow(session(), 'nonce-cd', t0 + 1_000);
    expect(row?.codeHash).toBe('code-first');
  });

  it('reminting after the cooldown resets attempts and refreshes the code', async () => {
    const t0 = 4_000_000;
    await mintCode(session(), 'nonce-remint', 'identity-1', 'code-first', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    await incrementAndReadCode(session(), 'nonce-remint', t0);
    await incrementAndReadCode(session(), 'nonce-remint', t0);
    const midway = await readCodeRow(session(), 'nonce-remint', t0);
    expect(midway?.attempts).toBe(2);

    const t1 = t0 + 61_000;
    const reminted = await mintCode(session(), 'nonce-remint', 'identity-1', 'code-second', 'subject-1', t1, 600_000, 60_000, 'bucket-1');
    expect(reminted).toBe(true);
    const row = await readCodeRow(session(), 'nonce-remint', t1);
    expect(row?.attempts).toBe(0);
    expect(row?.codeHash).toBe('code-second');
  });
});

describe('readCodeRow / incrementAndReadCode', () => {
  it('returns null for an absent nonce', async () => {
    expect(await readCodeRow(session(), 'no-such-nonce', 0)).toBeNull();
  });

  it('returns null for an expired row and does not increment it', async () => {
    const t0 = 5_000_000;
    await mintCode(session(), 'nonce-expired', 'identity-1', 'code-1', 'subject-1', t0, 1_000, 60_000, 'bucket-1');
    const afterExpiry = t0 + 5_000;
    expect(await readCodeRow(session(), 'nonce-expired', afterExpiry)).toBeNull();
    expect(await incrementAndReadCode(session(), 'nonce-expired', afterExpiry)).toBeNull();
    // The row itself is untouched: reading it before expiry (its own now) still shows attempts 0.
    const raw = await db
      .prepare('SELECT attempts FROM cairn_channel_code WHERE nonce_hash = ?1')
      .bind('nonce-expired')
      .first<{ attempts: number }>();
    expect(raw?.attempts).toBe(0);
  });

  it('increments attempts and returns the post-increment count', async () => {
    const t0 = 6_000_000;
    await mintCode(session(), 'nonce-inc', 'identity-1', 'code-1', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    const first = await incrementAndReadCode(session(), 'nonce-inc', t0);
    expect(first).toEqual({ codeHash: 'code-1', attempts: 1 });
    const second = await incrementAndReadCode(session(), 'nonce-inc', t0);
    expect(second).toEqual({ codeHash: 'code-1', attempts: 2 });
  });
});

describe('consumeCode', () => {
  it('deletes and returns the subject on a matching, unexpired row', async () => {
    const t0 = 7_000_000;
    await mintCode(session(), 'nonce-consume', 'identity-1', 'code-right', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    const result = await consumeCode(session(), 'nonce-consume', 'code-right', t0);
    expect(result).toEqual({ subject: 'subject-1' });
    expect(await readCodeRow(session(), 'nonce-consume', t0)).toBeNull();
  });

  it('rejects a wrong hash without deleting the row', async () => {
    const t0 = 8_000_000;
    await mintCode(session(), 'nonce-wrong', 'identity-1', 'code-right', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    const result = await consumeCode(session(), 'nonce-wrong', 'code-wrong', t0);
    expect(result).toBeNull();
    expect(await readCodeRow(session(), 'nonce-wrong', t0)).not.toBeNull();
  });

  it('rejects an expired row', async () => {
    const t0 = 9_000_000;
    await mintCode(session(), 'nonce-exp', 'identity-1', 'code-right', 'subject-1', t0, 1_000, 60_000, 'bucket-1');
    const result = await consumeCode(session(), 'nonce-exp', 'code-right', t0 + 5_000);
    expect(result).toBeNull();
  });

  it('a decoy row never authorizes: subject comes back null, never coerced', async () => {
    const t0 = 10_000_000;
    await mintCode(session(), 'nonce-decoy2', 'identity-1', 'code-right', null, t0, 600_000, 60_000, 'bucket-1');
    const result = await consumeCode(session(), 'nonce-decoy2', 'code-right', t0);
    expect(result).toEqual({ subject: null });
  });

  it('an empty-string subject row passes through as empty, not coerced to null', async () => {
    const t0 = 10_500_000;
    await mintCode(session(), 'nonce-empty', 'identity-1', 'code-right', '', t0, 600_000, 60_000, 'bucket-1');
    const result = await consumeCode(session(), 'nonce-empty', 'code-right', t0);
    expect(result).toEqual({ subject: '' });
  });

  it('concurrent identical confirms consume exactly once', async () => {
    const t0 = 11_000_000;
    await mintCode(session(), 'nonce-concurrent', 'identity-1', 'code-right', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    const [a, b] = await Promise.all([
      consumeCode(session(), 'nonce-concurrent', 'code-right', t0),
      consumeCode(session(), 'nonce-concurrent', 'code-right', t0),
    ]);
    const successes = [a, b].filter((r) => r !== null);
    expect(successes).toHaveLength(1);
  });

  it('replay of a consumed code fails', async () => {
    const t0 = 12_000_000;
    await mintCode(session(), 'nonce-replay', 'identity-1', 'code-right', 'subject-1', t0, 600_000, 60_000, 'bucket-1');
    await consumeCode(session(), 'nonce-replay', 'code-right', t0);
    const replay = await consumeCode(session(), 'nonce-replay', 'code-right', t0);
    expect(replay).toBeNull();
  });
});

describe('pruneRequesterRows', () => {
  it('trims one bucket to the keep cap and never touches another bucket', async () => {
    const t0 = 13_000_000;
    for (let i = 0; i < 5; i++) {
      await mintCode(session(), `nonce-b1-${i}`, 'identity-1', `code-${i}`, 'subject-1', t0 + i, 600_000, 0, 'bucket-A');
    }
    for (let i = 0; i < 3; i++) {
      await mintCode(session(), `nonce-b2-${i}`, 'identity-2', `code-${i}`, 'subject-2', t0 + i, 600_000, 0, 'bucket-B');
    }

    await pruneRequesterRows(session(), 'bucket-A', 2);

    const { results: aRows } = await db
      .prepare('SELECT nonce_hash FROM cairn_channel_code WHERE requester_bucket = ?1 ORDER BY nonce_hash')
      .bind('bucket-A')
      .all<{ nonce_hash: string }>();
    expect(aRows.map((r) => r.nonce_hash)).toEqual(['nonce-b1-3', 'nonce-b1-4']);

    const { results: bRows } = await db
      .prepare('SELECT COUNT(*) AS n FROM cairn_channel_code WHERE requester_bucket = ?1')
      .bind('bucket-B')
      .all<{ n: number }>();
    expect(bRows[0].n).toBe(3);
  });
});

describe('channel sessions', () => {
  it('creates and resolves a session', async () => {
    const now = 14_000_000;
    await createChannelSession(session(), 'token-hash-1', 'subject-1', now, 1_000_000);
    const resolved = await resolveChannelSession(db, 'token-hash-1', now);
    expect(resolved).toEqual({ subject: 'subject-1' });
  });

  it('does not resolve an expired session', async () => {
    const now = 15_000_000;
    await createChannelSession(session(), 'token-hash-2', 'subject-1', now, 1_000);
    expect(await resolveChannelSession(db, 'token-hash-2', now + 5_000)).toBeNull();
  });

  it('destroys a session by token hash and returns the subject and expiry the deleted row carried', async () => {
    const now = 16_000_000;
    await createChannelSession(session(), 'token-hash-3', 'subject-1', now, 1_000_000);
    expect(await destroyChannelSession(session(), 'token-hash-3')).toEqual({
      subject: 'subject-1',
      expiresAt: now + 1_000_000,
    });
    expect(await resolveChannelSession(db, 'token-hash-3', now)).toBeNull();
  });

  it('returns null when no session row matched, so the caller can skip its record', async () => {
    expect(await destroyChannelSession(session(), 'token-hash-never-existed')).toBeNull();
  });

  it('destroys an already-expired session unconditionally, still answering its (past) expiry so the caller can tell it was not live', async () => {
    const mintedAt = 16_500_000;
    const expiresAt = mintedAt + 1_000;
    await createChannelSession(session(), 'token-hash-expired', 'subject-1', mintedAt, 1_000);
    const laterNow = expiresAt + 5_000;
    const destroyed = await destroyChannelSession(session(), 'token-hash-expired');
    expect(destroyed).toEqual({ subject: 'subject-1', expiresAt });
    expect(destroyed?.expiresAt).toBeLessThan(laterNow);
  });

  it('revokes every session for a subject', async () => {
    const now = 17_000_000;
    await createChannelSession(session(), 'token-hash-4', 'subject-shared', now, 1_000_000);
    await createChannelSession(session(), 'token-hash-5', 'subject-shared', now, 1_000_000);
    await createChannelSession(session(), 'token-hash-6', 'subject-other', now, 1_000_000);
    await revokeChannelSessions(session(), 'subject-shared');
    expect(await resolveChannelSession(db, 'token-hash-4', now)).toBeNull();
    expect(await resolveChannelSession(db, 'token-hash-5', now)).toBeNull();
    expect(await resolveChannelSession(db, 'token-hash-6', now)).toEqual({ subject: 'subject-other' });
  });
});

describe('charge / refund', () => {
  it('admits a fresh bucket at count 1', async () => {
    const now = 18_000_000;
    const result = await charge(session(), 'req-bucket-1', 'send', now, 5);
    expect(result).toEqual({ admitted: true, count: 1 });
  });

  it('denies once the cap is reached within one window', async () => {
    const now = 19_000_000;
    for (let i = 0; i < 3; i++) {
      const r = await charge(session(), 'req-bucket-2', 'send', now + i, 3);
      expect(r.admitted).toBe(true);
    }
    const denied = await charge(session(), 'req-bucket-2', 'send', now + 3, 3);
    expect(denied).toEqual({ admitted: false });
  });

  it('k parallel charges at cap - 1 admit exactly one', async () => {
    const now = 20_000_000;
    const cap = 5;
    for (let i = 0; i < cap - 1; i++) {
      const r = await charge(session(), 'req-bucket-3', 'send', now + i, cap);
      expect(r.admitted).toBe(true);
    }
    const attempts = await Promise.all(
      Array.from({ length: cap }, () => charge(session(), 'req-bucket-3', 'send', now + cap, cap)),
    );
    expect(attempts.filter((r) => r.admitted)).toHaveLength(1);
    const row = await readBudgetRow('req-bucket-3', 'send');
    expect(row?.count).toBe(cap);
  });

  it('two different requester buckets against one scope do not share a limit', async () => {
    const now = 21_000_000;
    const cap = 2;
    await charge(session(), 'req-bucket-4a', 'send', now, cap);
    await charge(session(), 'req-bucket-4a', 'send', now + 1, cap);
    const stillOpenForOtherBucket = await charge(session(), 'req-bucket-4b', 'send', now + 2, cap);
    expect(stillOpenForOtherBucket.admitted).toBe(true);
  });

  it('does not admit a fresh cap the instant a fixed window rolls over', async () => {
    const origin = 1000 * CHANNEL_BUDGET_WINDOW_MS;
    const cap = 3;
    for (let i = 0; i < cap; i++) {
      const r = await charge(session(), 'req-bucket-5', 'send', origin + i, cap);
      expect(r.admitted).toBe(true);
    }
    // Right at the boundary the prior window's full weight still counts at ~full strength.
    const atBoundary = await charge(session(), 'req-bucket-5', 'send', origin + CHANNEL_BUDGET_WINDOW_MS, cap);
    expect(atBoundary.admitted).toBe(false);
    // As the new window ages, the prior window's contribution decays and capacity reopens.
    const nearEndOfNextWindow = await charge(
      session(),
      'req-bucket-5',
      'send',
      origin + 2 * CHANNEL_BUDGET_WINDOW_MS - 1,
      cap,
    );
    expect(nearEndOfNextWindow.admitted).toBe(true);
  });

  it('refund restores exactly one and clamps at zero', async () => {
    const now = 22_000_000;
    await charge(session(), 'req-bucket-6', 'send', now, 5);
    await refund(session(), 'req-bucket-6', 'send', now);
    const afterOneRefund = await readBudgetRow('req-bucket-6', 'send');
    expect(afterOneRefund?.count).toBe(0);

    await refund(session(), 'req-bucket-6', 'send', now);
    const afterSecondRefund = await readBudgetRow('req-bucket-6', 'send');
    expect(afterSecondRefund?.count).toBe(0);
  });

  it('refund is a no-op against a window that has already rolled', async () => {
    const origin = 2000 * CHANNEL_BUDGET_WINDOW_MS;
    await charge(session(), 'req-bucket-7', 'send', origin, 5);
    await refund(session(), 'req-bucket-7', 'send', origin + CHANNEL_BUDGET_WINDOW_MS);
    const row = await readBudgetRow('req-bucket-7', 'send');
    expect(row?.count).toBe(1);
  });

  it('a charge one full window before the stored window is not admitted and leaves window_start and count intact', async () => {
    const t0 = 23_000_000;
    const cap = 3;
    for (let i = 0; i < cap; i++) {
      const r = await charge(session(), 'req-bucket-8', 'send', t0 + i, cap);
      expect(r.admitted).toBe(true);
    }
    const before = await readBudgetRow('req-bucket-8', 'send');
    expect(before?.count).toBe(cap);

    // An out-of-order timestamp: a charge whose own now maps to a window one full window BEFORE
    // the row's stored window_start (a delayed retry racing a later request, say). Admitting it
    // unconditionally would roll window_start backwards and wipe the accumulated count; the fix
    // charges it against the stored window's own estimate instead, and refuses it outright once
    // that estimate is already at cap.
    const backwards = await charge(session(), 'req-bucket-8', 'send', t0 - CHANNEL_BUDGET_WINDOW_MS, cap);
    expect(backwards).toEqual({ admitted: false });
    const after = await readBudgetRow('req-bucket-8', 'send');
    expect(after?.count).toBe(cap);
    expect(after?.windowStart).toBe(before?.windowStart);
  });
});

describe('sweep', () => {
  it('clears expired code rows, expired sessions, and stale budget rows via their own indexed deletes', async () => {
    const now = 30_000_000;

    await mintCode(session(), 'nonce-sweep-expired', 'identity-1', 'code-1', 'subject-1', now - 10_000, 1_000, 0, 'bucket-1');
    await mintCode(session(), 'nonce-sweep-live', 'identity-1', 'code-2', 'subject-1', now, 600_000, 0, 'bucket-1');

    await createChannelSession(session(), 'session-sweep-expired', 'subject-1', now - 10_000, 1_000);
    await createChannelSession(session(), 'session-sweep-live', 'subject-1', now, 600_000);

    await charge(session(), 'req-sweep-stale', 'send', now - 3 * CHANNEL_BUDGET_WINDOW_MS, 5);
    await charge(session(), 'req-sweep-fresh', 'send', now, 5);

    await sweep(session(), now);

    expect(await readCodeRow(session(), 'nonce-sweep-expired', now)).toBeNull();
    expect(await readCodeRow(session(), 'nonce-sweep-live', now)).not.toBeNull();

    expect(await resolveChannelSession(db, 'session-sweep-expired', now)).toBeNull();
    expect(await resolveChannelSession(db, 'session-sweep-live', now)).not.toBeNull();

    expect(await readBudgetRow('req-sweep-stale', 'send')).toBeNull();
    expect(await readBudgetRow('req-sweep-fresh', 'send')).not.toBeNull();
  });
});
