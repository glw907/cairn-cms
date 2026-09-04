// cairn-cms: D1 access for the auth-channel factory, through prepared statements only. No ORM.
// Every statement in this file targets a site's own channel binding, never AUTH_DB (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md, decision 1: physical
// separation). Each flow opens one `db.withSession('first-primary')` and threads it through these
// functions (spec, Storage), so a flow's reads and writes share a session; `resolveChannelSession`
// is the documented exception and takes the bare `db`, since it runs on every authenticated
// request and accepts replica lag on the revocation path.
//
// Three throttle-shaped functions here (`mintCode`, `charge`, `refund`) are each one atomic
// conditional statement, never a read followed by a decide followed by a write: a read-modify-write
// implementation passes every single-caller test while admitting far more than its cap under
// concurrency, which is exactly the shape the design's threat model rules out.
import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';

/**
 * The schema version the packaged `migrations-channel/0000_channel.sql` seeds, and the value
 * `verifySchema` demands of a deployed channel database on every action. Not part of the package's
 * public surface (no barrel re-export): a site reads the version out of the migration it applies,
 * never out of an import. The engine's own drift test parses the migration's seeding row and
 * compares it here, since the two disagreeing is a fail-closed login outage.
 */
export const CHANNEL_SCHEMA_VERSION = '1';

/** Every budget in the Defaults table is per hour; the sliding window's fixed size. */
export const CHANNEL_BUDGET_WINDOW_MS = 60 * 60 * 1000;

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A budget row's real primary key is the scope-and-bucket pair, not the bucket alone: two
 * different scopes charging the same physical bucket (the requester send cap and a future
 * requester-scoped control, say) must never collide on one row. `bucket` stores this composite
 * value; `scope` is kept alongside as a plain column for an operator's own D1 queries.
 */
function budgetKey(bucket: string, scope: string): string {
  return `${scope}:${bucket}`;
}

/**
 * Confirm the deployed schema matches {@link CHANNEL_SCHEMA_VERSION}. Fails closed (returns false) on
 * any error, including a missing table from a database that was never migrated, and caches
 * nothing: a transient D1 error must not pin an isolate into refusing every login for its
 * lifetime, so every call re-queries.
 */
export async function verifySchema(session: D1DatabaseSession): Promise<boolean> {
  try {
    const row = await session
      .prepare('SELECT value FROM cairn_channel_meta WHERE key = ?1')
      .bind('schema_version')
      .first<{ value: string }>();
    return row?.value === CHANNEL_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

/** Read the per-deployment identity salt, or null if it has never been provisioned. */
export async function readSalt(session: D1DatabaseSession): Promise<string | null> {
  const row = await session
    .prepare('SELECT value FROM cairn_channel_meta WHERE key = ?1')
    .bind('identity_salt')
    .first<{ value: string }>();
  return row?.value ?? null;
}

/**
 * Provision the identity salt on first use: an `INSERT OR IGNORE` of 32 random bytes (hex
 * encoded) followed by a read-back, so two independently migrated databases race safely to
 * exactly one salt each, and two independent deployments always hold different ones. A salt row
 * that is still absent after the insert (a corrupted or half-migrated table) throws rather than
 * falling back to an empty string, which would silently reintroduce the unsalted hash the design
 * rejected.
 */
export async function provisionSalt(session: D1DatabaseSession): Promise<string> {
  const candidate = randomHex(32);
  await session
    .prepare('INSERT OR IGNORE INTO cairn_channel_meta (key, value) VALUES (?1, ?2)')
    .bind('identity_salt', candidate)
    .run();
  const salt = await readSalt(session);
  if (salt == null) {
    throw new Error('auth-channel: identity salt missing after provisioning; refusing to fall back to an empty salt');
  }
  return salt;
}

type CodeRowColumns = {
  nonce_hash: string;
  identity: string;
  code_hash: string;
  subject: string | null;
  kind: string;
  attempts: number;
  expires_at: number;
  created_at: number;
  requester_bucket: string;
};

/** A `cairn_channel_code` row as the store reads it. */
export type CodeRow = {
  nonceHash: string;
  identity: string;
  codeHash: string;
  subject: string | null;
  kind: string;
  attempts: number;
  expiresAt: number;
  createdAt: number;
  requesterBucket: string;
};

function toCodeRow(row: CodeRowColumns): CodeRow {
  return {
    nonceHash: row.nonce_hash,
    identity: row.identity,
    codeHash: row.code_hash,
    subject: row.subject,
    kind: row.kind,
    attempts: row.attempts,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    requesterBucket: row.requester_bucket,
  };
}

/**
 * Mint or refresh the code row for a nonce, in one conditional upsert: a fresh nonce always
 * writes, and a reused nonce refreshes (new code, `attempts` reset to zero) only when the
 * cooldown since its last mint has elapsed. Returns false when the cooldown held, in which case
 * nothing was written. Cooldown enforcement lives inside the same statement that decides whether
 * to write, so two concurrent mints against the same nonce serialize to exactly one write.
 */
export async function mintCode(
  session: D1DatabaseSession,
  nonceHash: string,
  identity: string,
  codeHash: string,
  subject: string | null,
  now: number,
  ttlMs: number,
  cooldownMs: number,
  requesterBucket: string,
): Promise<boolean> {
  const row = await session
    .prepare(
      `INSERT INTO cairn_channel_code
         (nonce_hash, identity, code_hash, subject, kind, attempts, expires_at, created_at, requester_bucket)
       VALUES (?1, ?2, ?3, ?4, 'code', 0, ?5, ?6, ?7)
       ON CONFLICT(nonce_hash) DO UPDATE SET
         identity = excluded.identity,
         code_hash = excluded.code_hash,
         subject = excluded.subject,
         attempts = 0,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at,
         requester_bucket = excluded.requester_bucket
       WHERE (?6 - cairn_channel_code.created_at) >= ?8
       RETURNING nonce_hash`,
    )
    .bind(nonceHash, identity, codeHash, subject, now + ttlMs, now, requesterBucket, cooldownMs)
    .first<{ nonce_hash: string }>();
  return row !== null;
}

/** Read the unexpired code row for a nonce, or null when absent or expired. */
export async function readCodeRow(
  session: D1DatabaseSession,
  nonceHash: string,
  now: number,
): Promise<CodeRow | null> {
  const row = await session
    .prepare(
      `SELECT nonce_hash, identity, code_hash, subject, kind, attempts, expires_at, created_at, requester_bucket
       FROM cairn_channel_code
       WHERE nonce_hash = ?1 AND expires_at > ?2`,
    )
    .bind(nonceHash, now)
    .first<CodeRowColumns>();
  return row ? toCodeRow(row) : null;
}

/**
 * Increment a code row's attempt counter and read back the post-increment count, filtered on
 * `expires_at > now` so an expired row answers null (the caller reports `expired`) rather than
 * incrementing toward `locked`.
 */
export async function incrementAndReadCode(
  session: D1DatabaseSession,
  nonceHash: string,
  now: number,
): Promise<{ codeHash: string; attempts: number } | null> {
  const row = await session
    .prepare(
      `UPDATE cairn_channel_code SET attempts = attempts + 1
       WHERE nonce_hash = ?1 AND expires_at > ?2
       RETURNING code_hash, attempts`,
    )
    .bind(nonceHash, now)
    .first<{ code_hash: string; attempts: number }>();
  return row ? { codeHash: row.code_hash, attempts: row.attempts } : null;
}

/**
 * The sole authority on whether a submitted code was right: one conditioned
 * `DELETE ... RETURNING subject`, matching the hash inside the statement rather than in a
 * preceding compare. A returned row with a non-null, non-empty subject is the only outcome that
 * authorizes a session; the caller enforces that half, since a decoy row's null subject and a
 * roster data fault's empty subject both delete a row here without ever meaning success.
 */
export async function consumeCode(
  session: D1DatabaseSession,
  nonceHash: string,
  codeHash: string,
  now: number,
): Promise<{ subject: string | null } | null> {
  const row = await session
    .prepare(
      `DELETE FROM cairn_channel_code
       WHERE nonce_hash = ?1 AND code_hash = ?2 AND expires_at > ?3
       RETURNING subject`,
    )
    .bind(nonceHash, codeHash, now)
    .first<{ subject: string | null }>();
  return row ? { subject: row.subject } : null;
}

/**
 * Trim a requester bucket's own code rows to the live-row cap, keeping the `keep` most recently
 * created and deleting the rest. Filtered on `requester_bucket`, never `identity`, so an evictor
 * (a cookie-clearing attacker minting many nonces) can only ever destroy rows it created itself.
 */
export async function pruneRequesterRows(session: D1DatabaseSession, bucket: string, keep: number): Promise<void> {
  await session
    .prepare(
      `DELETE FROM cairn_channel_code
       WHERE requester_bucket = ?1
         AND nonce_hash NOT IN (
           SELECT nonce_hash FROM cairn_channel_code
           WHERE requester_bucket = ?1
           ORDER BY created_at DESC, nonce_hash DESC
           LIMIT ?2
         )`,
    )
    .bind(bucket, keep)
    .run();
}

/** Create a channel session row. */
export async function createChannelSession(
  session: D1DatabaseSession,
  tokenHash: string,
  subject: string,
  now: number,
  ttlMs: number,
): Promise<void> {
  await session
    .prepare('INSERT INTO cairn_channel_session (token_hash, subject, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(tokenHash, subject, now + ttlMs, now)
    .run();
}

/**
 * Resolve a session to its subject. Takes the bare `db`, the one documented exception to the
 * shared-session rule: this runs on every authenticated request rather than inside one channel
 * flow, so it accepts the default consistency and any replica lag on the revocation path (spec,
 * Storage).
 */
export async function resolveChannelSession(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<{ subject: string } | null> {
  const row = await db
    .prepare('SELECT subject FROM cairn_channel_session WHERE token_hash = ?1 AND expires_at > ?2')
    .bind(tokenHash, now)
    .first<{ subject: string }>();
  return row ? { subject: row.subject } : null;
}

/** What {@link destroyChannelSession} returns: the deleted row's subject and the expiry it carried. */
export type DestroyedChannelSession = { subject: string; expiresAt: number };

/**
 * Delete a single session by its token hash (logout, confirm's orphan cleanup, and the
 * verify-refused revocation), answering with the subject and expiry the deleted row carried, or
 * null when the hash named no row. `RETURNING` keeps this one statement and one round trip. The
 * subject is a roster identity, so a caller logging the deletion derives the channel's own
 * pseudonymous correlation id from it rather than recording it. The delete is unconditional, an
 * expired row is still safe to remove, so the caller reads the returned `expiresAt` against its
 * own `now` to decide whether the row was still live before emitting a destroyed record.
 */
export async function destroyChannelSession(
  session: D1DatabaseSession,
  tokenHash: string,
): Promise<DestroyedChannelSession | null> {
  const row = await session
    .prepare('DELETE FROM cairn_channel_session WHERE token_hash = ?1 RETURNING subject, expires_at')
    .bind(tokenHash)
    .first<{ subject: string; expires_at: number }>();
  return row ? { subject: row.subject, expiresAt: row.expires_at } : null;
}

/** Delete every session for a subject (roster removal, and `revokeSessions`). */
export async function revokeChannelSessions(session: D1DatabaseSession, subject: string): Promise<void> {
  await session.prepare('DELETE FROM cairn_channel_session WHERE subject = ?1').bind(subject).run();
}

/**
 * Charge one unit against a bucket-and-scope budget, admitting it only when the two-bucket
 * sliding-window estimate stays under `cap`. One atomic conditional upsert: the window roll (a
 * stale row's `count` becoming the new `prev_count`, or ageing out entirely past two windows) and
 * the admission decision both live inside the statement's `CASE` expressions, so k concurrent
 * charges at `cap - 1` admit exactly one and the estimate never doubles at a window boundary.
 * `count` is present on the admitted branch only, since a conditional upsert whose predicate
 * fails returns no row to read it from.
 *
 * The "same window" branch is keyed on `window_start >= ?3`, not `=`: an out-of-order `now` (a
 * charge that lands one or more windows BEFORE the stored row's own window, say a delayed retry
 * racing a later request) must charge against the stored window's own estimate rather than
 * rolling it backwards, which would wipe the accumulated count. `window_start = MAX(...)` mirrors
 * this: the stored value only ever advances, never regresses. The rolled-one-window branch stays
 * keyed on the exact `= WINDOW` delta, since that branch's decay math assumes exactly one window
 * elapsed.
 */
export async function charge(
  session: D1DatabaseSession,
  bucket: string,
  scope: string,
  now: number,
  cap: number,
): Promise<{ admitted: boolean; count?: number }> {
  const key = budgetKey(bucket, scope);
  const windowStart = Math.floor(now / CHANNEL_BUDGET_WINDOW_MS) * CHANNEL_BUDGET_WINDOW_MS;
  const elapsed = now - windowStart;
  const decay = Math.max(0, CHANNEL_BUDGET_WINDOW_MS - elapsed) / CHANNEL_BUDGET_WINDOW_MS;
  const row = await session
    .prepare(
      `INSERT INTO cairn_channel_budget (bucket, scope, count, window_start, prev_count)
       VALUES (?1, ?2, 1, ?3, 0)
       ON CONFLICT(bucket) DO UPDATE SET
         count = CASE
           WHEN cairn_channel_budget.window_start >= ?3 THEN
             CASE
               WHEN (cairn_channel_budget.count + cairn_channel_budget.prev_count * ?4) < ?5
                 THEN cairn_channel_budget.count + 1
               ELSE cairn_channel_budget.count
             END
           ELSE
             CASE
               WHEN (
                 CASE WHEN ?3 - cairn_channel_budget.window_start = ${CHANNEL_BUDGET_WINDOW_MS}
                   THEN cairn_channel_budget.count ELSE 0 END
               ) * ?4 < ?5
                 THEN 1
               ELSE 0
             END
         END,
         prev_count = CASE
           WHEN cairn_channel_budget.window_start >= ?3 THEN cairn_channel_budget.prev_count
           WHEN ?3 - cairn_channel_budget.window_start = ${CHANNEL_BUDGET_WINDOW_MS} THEN cairn_channel_budget.count
           ELSE 0
         END,
         window_start = MAX(cairn_channel_budget.window_start, ?3)
       WHERE (
         CASE
           WHEN cairn_channel_budget.window_start >= ?3
             THEN (cairn_channel_budget.count + cairn_channel_budget.prev_count * ?4)
           ELSE (
             CASE WHEN ?3 - cairn_channel_budget.window_start = ${CHANNEL_BUDGET_WINDOW_MS}
               THEN cairn_channel_budget.count ELSE 0 END
           ) * ?4
         END
       ) < ?5
       RETURNING count`,
    )
    .bind(key, scope, windowStart, decay, cap)
    .first<{ count: number }>();
  return row ? { admitted: true, count: row.count } : { admitted: false };
}

/**
 * Refund one unit to a bucket-and-scope budget, clamped at zero. A no-op against a window that
 * has already rolled since the charge being refunded, since decrementing a later window's count
 * would refund the wrong window entirely; the caller only ever refunds within the same request
 * that charged, so this is a defensive floor rather than the common path.
 */
export async function refund(session: D1DatabaseSession, bucket: string, scope: string, now: number): Promise<void> {
  const key = budgetKey(bucket, scope);
  const windowStart = Math.floor(now / CHANNEL_BUDGET_WINDOW_MS) * CHANNEL_BUDGET_WINDOW_MS;
  await session
    .prepare(
      `UPDATE cairn_channel_budget SET count = MAX(0, count - 1)
       WHERE bucket = ?1 AND window_start = ?2`,
    )
    .bind(key, windowStart)
    .run();
}

/**
 * Sweep all three expiring tables, plus budget rows more than two windows stale, as separate
 * indexed statements rather than a single `OR`ed one, so each delete uses its own index instead
 * of forcing a table scan.
 */
export async function sweep(session: D1DatabaseSession, now: number): Promise<void> {
  const budgetCutoff = now - 2 * CHANNEL_BUDGET_WINDOW_MS;
  await session.batch([
    session.prepare('DELETE FROM cairn_channel_code WHERE expires_at <= ?1').bind(now),
    session.prepare('DELETE FROM cairn_channel_session WHERE expires_at <= ?1').bind(now),
    session.prepare('DELETE FROM cairn_channel_budget WHERE window_start <= ?1').bind(budgetCutoff),
  ]);
}
