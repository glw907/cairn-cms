// cairn-cms: D1 access for auth, through prepared statements only. No ORM. Each function takes
// the `AUTH_DB` binding plus primitives, so it is testable against a real local D1 and free of
// SvelteKit. Callers pass `now`/`expiresAt` in epoch milliseconds.
import type { D1Database } from '@cloudflare/workers-types';
import type { Editor, Role } from './types.js';

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

/** Replace any prior token for this email with a fresh one, atomically. */
export async function issueToken(
  db: D1Database,
  email: string,
  tokenHash: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    // Replace this email's prior token, and sweep any expired token while here (no cron needed).
    db.prepare('DELETE FROM magic_token WHERE email = ? OR expires_at <= ?').bind(email, now),
    db
      .prepare('INSERT INTO magic_token (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(tokenHash, email, expiresAt, now),
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
 * Consume a token in one atomic statement. A returned email means the token was present and
 * unexpired and is now gone, so the link is single-use by construction on strongly-consistent D1.
 */
export async function consumeToken(db: D1Database, tokenHash: string, now: number): Promise<string | null> {
  const row = await db
    .prepare('DELETE FROM magic_token WHERE token_hash = ? AND expires_at > ? RETURNING email')
    .bind(tokenHash, now)
    .first<{ email: string }>();
  return row?.email ?? null;
}

/** Create a session row. */
export async function createSession(
  db: D1Database,
  id: string,
  email: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    // Sweep expired sessions on login, so abandoned rows do not accumulate (no cron needed).
    db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, email, expiresAt, now),
  ]);
}

/**
 * Resolve a session to its editor, joining `editor` so the role is read live. An expired
 * session or a removed editor resolves to null, which revokes access on the next request.
 */
export async function resolveSession(db: D1Database, id: string, now: number): Promise<Editor | null> {
  const row = await db
    .prepare(
      `SELECT e.email AS email, e.display_name AS display_name, e.role AS role
       FROM session s JOIN editor e ON e.email = s.email
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, now)
    .first<EditorCols>();
  return row ? toEditor(row) : null;
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
 * Remove an owner-capability editor only if another owner-capability row remains. The count is
 * part of the DELETE, so two concurrent removals cannot both pass a separate check and strand the
 * allowlist below one owner. `ownerRoles` is the vocabulary's owner-capability name set (see
 * `ownerLevelRoles`), not the literal `'owner'` string, so a site with more than one owner-level
 * role name stays safe. Returns false (and writes nothing) when this is the last owner-capability
 * row. On success the editor's sessions and pending token go too.
 */
export async function removeOwnerIfNotLast(db: D1Database, email: string, ownerRoles: string[]): Promise<boolean> {
  if (ownerRoles.length === 0) return false;
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res = await db
    .prepare(
      `DELETE FROM editor
       WHERE email = ? AND role IN (${placeholders})
         AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`,
    )
    .bind(email, ...ownerRoles, ...ownerRoles)
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
 * Demote an owner-capability editor to `newRole` only if another owner-capability row remains,
 * in one atomic statement (see `removeOwnerIfNotLast`). `ownerRoles` is the vocabulary's
 * owner-capability name set, so a site with more than one owner-level role name stays safe.
 * Returns false (and writes nothing) when this is the last owner-capability row.
 */
export async function demoteOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
  newRole: string,
): Promise<boolean> {
  if (ownerRoles.length === 0) return false;
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res = await db
    .prepare(
      `UPDATE editor SET role = ?
       WHERE email = ? AND role IN (${placeholders})
         AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`,
    )
    .bind(newRole, email, ...ownerRoles, ...ownerRoles)
    .run();
  return res.meta.changes === 1;
}
