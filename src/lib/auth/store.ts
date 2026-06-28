// D1 access for auth, through prepared statements only. No ORM. Each function takes the
// `AUTH_DB` binding plus primitives, so it is testable against a real local D1 and free of
// SvelteKit. Callers pass `now`/`expiresAt` in epoch milliseconds.
import type { D1Database } from '@cloudflare/workers-types';
import type { AuthTier, Editor, Role } from './types.js';

type EditorCols = { email: string; display_name: string; role: Role };

function toEditor(row: EditorCols): Editor {
  return { email: row.email, displayName: row.display_name, role: row.role };
}

/** Look an email up in the allowlist. */
export async function findEditor(db: D1Database, email: string): Promise<Editor | null> {
  const row = await db
    .prepare('SELECT email, display_name, role FROM editor WHERE email = ?')
    .bind(email)
    .first<EditorCols>();
  return row ? toEditor(row) : null;
}

/**
 * Replace any prior token for this email with a fresh one, atomically. The token row carries the
 * server-authoritative `tier` the confirmed session inherits and the validated `redirectTo` path, so
 * neither rides the confirm URL where an attacker could forge them.
 */
export async function issueToken(
  db: D1Database,
  email: string,
  tokenHash: string,
  tier: AuthTier,
  redirectTo: string | null,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    // Replace this email's prior token, and sweep any expired token while here (no cron needed).
    db.prepare('DELETE FROM magic_token WHERE email = ? OR expires_at <= ?').bind(email, now),
    db
      .prepare(
        'INSERT INTO magic_token (token_hash, email, tier, redirect_to, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(tokenHash, email, tier, redirectTo, expiresAt, now),
  ]);
}

/** True when a magic-link token for this email was issued at or after `since`, for the send cooldown. */
export async function recentlyIssued(db: D1Database, email: string, since: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS one FROM magic_token WHERE email = ? AND created_at >= ? LIMIT 1')
    .bind(email, since)
    .first<{ one: number }>();
  return row != null;
}

/**
 * Consume a token in one atomic statement, returning the email plus the server-authoritative tier
 * and redirect target the row carried. A returned object means the token was present and unexpired
 * and is now gone, so the link is single-use by construction on strongly-consistent D1.
 */
export async function consumeToken(
  db: D1Database,
  tokenHash: string,
  now: number,
): Promise<{ email: string; tier: AuthTier; redirectTo: string | null } | null> {
  const row = await db
    .prepare('DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email, tier, redirect_to')
    .bind(tokenHash, now)
    .first<{ email: string; tier: AuthTier; redirect_to: string | null }>();
  return row ? { email: row.email, tier: row.tier, redirectTo: row.redirect_to ?? null } : null;
}

/** Create a session row carrying its trust tier, set at mint time. */
export async function createSession(
  db: D1Database,
  id: string,
  email: string,
  tier: AuthTier,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    // Sweep expired sessions on login, so abandoned rows do not accumulate (no cron needed).
    db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO session (id, email, expires_at, created_at, auth_tier) VALUES (?, ?, ?, ?, ?)')
      .bind(id, email, expiresAt, now, tier),
  ]);
}

/** Delete a session (logout). */
export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM session WHERE id = ?').bind(id).run();
}

/** The full allowlist, sorted by email. */
export async function listEditors(db: D1Database): Promise<Editor[]> {
  const { results } = await db
    .prepare('SELECT email, display_name, role FROM editor ORDER BY email')
    .all<EditorCols>();
  return results.map(toEditor);
}

/** Add an editor to the allowlist. */
export async function insertEditor(
  db: D1Database,
  email: string,
  displayName: string,
  role: Role,
  now: number,
): Promise<void> {
  await db
    .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(email, displayName, role, now)
    .run();
}

/** Remove an editor and cut their live access (sessions and any pending token go too). */
export async function deleteEditor(db: D1Database, email: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(email),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
    db.prepare('DELETE FROM editor WHERE email = ?').bind(email),
  ]);
}

/**
 * Remove an owner only if another owner remains. The count is part of the DELETE, so two
 * concurrent removals cannot both pass a separate check and strand the allowlist at zero
 * owners. Returns false (and writes nothing) when this is the last owner. On success the
 * editor's sessions and pending token go too.
 */
export async function removeOwnerIfNotLast(db: D1Database, email: string): Promise<boolean> {
  const res = await db
    .prepare(
      `DELETE FROM editor
       WHERE email = ? AND role = 'owner'
         AND (SELECT COUNT(*) FROM editor WHERE role = 'owner') > 1`,
    )
    .bind(email)
    .run();
  if (res.meta.changes !== 1) return false;
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(email),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
  ]);
  return true;
}

/** Change an editor's role. The guard reads the new role on the next request. */
export async function setEditorRole(db: D1Database, email: string, role: Role): Promise<void> {
  await db.prepare('UPDATE editor SET role = ? WHERE email = ?').bind(role, email).run();
}

/**
 * Demote an owner to editor only if another owner remains, in one atomic statement (see
 * `removeOwnerIfNotLast`). Returns false (and writes nothing) when this is the last owner.
 */
export async function demoteOwnerIfNotLast(db: D1Database, email: string): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE editor SET role = 'editor'
       WHERE email = ? AND role = 'owner'
         AND (SELECT COUNT(*) FROM editor WHERE role = 'owner') > 1`,
    )
    .bind(email)
    .run();
  return res.meta.changes === 1;
}

/**
 * Resolve a session to its email and tier without requiring an editor row, left-joining `editor`
 * for the role. A member session (email not in the allowlist) yields `role: null`, a valid scopeless
 * principal, where the prior inner-join resolver would have returned null and logged the member out.
 * An expired session resolves to null.
 */
export async function resolvePrincipalRow(
  db: D1Database,
  id: string,
  now: number,
): Promise<{ email: string; tier: AuthTier; role: Role | null; displayName: string | null } | null> {
  const row = await db
    .prepare(
      `SELECT s.email AS email, s.auth_tier AS tier, e.role AS role, e.display_name AS display_name
       FROM session s LEFT JOIN editor e ON e.email = s.email
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, now)
    .first<{ email: string; tier: AuthTier; role: Role | null; display_name: string | null }>();
  return row
    ? { email: row.email, tier: row.tier, role: row.role ?? null, displayName: row.display_name ?? null }
    : null;
}

/** Delete every session row for an email. Called before minting a new session, to defeat fixation. */
export async function deleteSessionsForEmail(db: D1Database, email: string): Promise<void> {
  await db.prepare('DELETE FROM session WHERE email = ?').bind(email).run();
}

/** Delete all cairn-owned identity rows for an email (sessions and pending tokens). For erasure. */
export async function forgetPrincipal(db: D1Database, email: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(email),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(email),
  ]);
}

/**
 * Fixed-window per-bucket rate check. Computes the window start from `now`, upserts the counter, and
 * returns true when the post-increment count is within `limit`. Old windows are left to a sweep on the
 * next write for the same bucket; the composite key keeps rows bounded per active bucket.
 */
export async function checkAndIncrementRate(
  db: D1Database,
  bucket: string,
  now: number,
  windowMs: number,
  limit: number,
): Promise<boolean> {
  const windowStart = now - (now % windowMs);
  const res = await db.batch([
    db.prepare('DELETE FROM auth_rate WHERE bucket = ? AND window_start < ?').bind(bucket, windowStart),
    db
      .prepare(
        `INSERT INTO auth_rate (bucket, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT (bucket, window_start) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(bucket, windowStart),
  ]);
  const count = (res[1].results?.[0] as { count: number } | undefined)?.count ?? limit + 1;
  return count <= limit;
}
