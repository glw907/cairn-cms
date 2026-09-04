// cairn-cms: D1 access for auth, through prepared statements only. No ORM. Each function takes
// the `AUTH_DB` binding plus primitives, so it is testable against a real local D1 and free of
// SvelteKit. Callers pass `now`/`expiresAt` in epoch milliseconds.
//
// Store-level invariant: every email argument is normalized here, trimmed and lowercased, before it
// matches or writes a row. `editor.email` is the identity, a BINARY-collated TEXT PRIMARY KEY, so a
// row written under one case is unreachable to a lookup under another. Normalizing at the store,
// rather than trusting each caller, keeps that impossible: `/auth-store` is public surface, and a
// consumer provisioning an editor from an address as a user typed it would otherwise write a shadow
// row that can never sign in yet still counts toward the last-owner guards.
import type { D1Database } from '@cloudflare/workers-types';
import { CairnError } from '../diagnostics/error.js';

type EditorCols = { email: string; display_name: string; role: string };

/**
 * Rethrow the one D1 fault a correct deployment can still produce as a named condition. An
 * `AUTH_DB` that never received migrations/0004_login_nonce.sql answers both the token issue and
 * the token consume with `no such column: nonce_hash`, which reaches the editor as a bare 500 on
 * the login POST and tells the operator nothing. The two statements that name the column route
 * their failure through here so the message names the migration to apply; anything else rethrows
 * untouched, since this module diagnoses nothing it does not recognize.
 */
function rethrowStoreFailure(err: unknown): never {
  if (/no such column:?\s*(?:\w+\.)?nonce_hash/i.test(String(err))) {
    throw new CairnError('auth.store-unmigrated', {
      cause: err,
      message:
        'cairn: AUTH_DB has no magic_token.nonce_hash column; apply migrations/0004_login_nonce.sql before signing in',
    });
  }
  throw err;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * An allowlist row as the store reads it: email, displayName, and the bare role name. The store
 * has no access to the site's declared vocabulary, so it can never resolve `capability`; a caller
 * that needs a full `Editor` (the guard, `editorsLoad`) resolves capability itself and spreads it
 * onto this shape.
 */
export type EditorRow = { email: string; displayName: string; role: string };

function toEditor(row: EditorCols): EditorRow {
  return { email: row.email, displayName: row.display_name, role: row.role };
}

/** Look an email up in the allowlist. */
export async function findEditor(db: D1Database, email: string): Promise<EditorRow | null> {
  const row = await db
    .prepare('SELECT email, display_name, role FROM editor WHERE email = ?')
    .bind(normalizeEmail(email))
    .first<EditorCols>();
  return row ? toEditor(row) : null;
}

/**
 * Replace any prior token for this email with a fresh one, atomically.
 *
 * `nonceHash` binds the token to the browser that requested it: the hash of the nonce that
 * browser carries in its pending-login cookie, which {@link consumeToken} then requires back.
 * Omitted, the row is written unbound, and any browser holding the token can confirm it; the
 * engine's own request action always passes one (migrations/0004_login_nonce.sql).
 */
export async function issueToken(
  db: D1Database,
  email: string,
  tokenHash: string,
  expiresAt: number,
  now: number,
  nonceHash: string | null = null,
): Promise<void> {
  const key = normalizeEmail(email);
  try {
    await db.batch([
      // Replace this email's prior token, and sweep any expired token while here (no cron needed).
      db.prepare('DELETE FROM magic_token WHERE email = ? OR expires_at <= ?').bind(key, now),
      db
        .prepare(
          'INSERT INTO magic_token (token_hash, email, expires_at, created_at, nonce_hash) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(tokenHash, key, expiresAt, now, nonceHash),
    ]);
  } catch (err) {
    rethrowStoreFailure(err);
  }
}

/**
 * What {@link rebindToken} returns: the live token now answers to the requesting browser, or no
 * row was eligible for the move.
 *
 * `not-eligible` (never a set of finer reasons) for the same reason {@link OwnerGuardOutcome}
 * carries that arm: four situations produce `changes === 0` on the one conditional statement, and
 * the statement cannot tell them apart. No token row at all, an expired row, an unbound row, and a
 * row already carrying this exact nonce all land here. Naming any of them would mean a second read
 * that could disagree with the write it claims to explain, so the discriminant names only what the
 * predicate knows.
 */
export type RebindTokenOutcome = { outcome: 'rebound' } | { outcome: 'not-eligible' };

/**
 * Point this email's live token at a different browser's nonce, minting nothing and sending
 * nothing. The throttled branch of the request action calls it, and it is the anti-lockout half
 * of the same-browser binding.
 *
 * The lockout it closes: an attacker POSTing the request form once a minute keeps the live token
 * bound to the attacker's own nonce, and the per-email send cooldown then throttles the editor's
 * recovery re-request, so the editor can neither confirm the link in their inbox nor get a new
 * one. Rebinding on the throttled path makes the semantics last-requester-wins, which is
 * symmetric: whoever asked most recently is who the link works for, and the editor recovers by
 * asking again. Nothing is granted by asking, since the token itself only ever reaches the
 * editor's own inbox.
 *
 * Three things the one statement's `WHERE` decides, in order:
 *
 * - `expires_at > ?` keeps a rebind from resurrecting an expired row that the next `issueToken`
 *   sweep would drop anyway; an expired row must stay dead however it is touched.
 * - `nonce_hash IS NOT NULL` leaves an UNBOUND row alone deliberately. An unbound row is the
 *   hand-seeded lockout-recovery escape hatch ({@link consumeToken}), and binding it to whoever
 *   POSTs the request form would hand that escape hatch to an attacker.
 * - `nonce_hash <> ?` makes a genuine double-submit from the same browser a pure no-op rather
 *   than a write.
 *
 * It is one statement, so a rebind racing the confirm that consumes the row loses cleanly under
 * D1's serialization: either the `UPDATE` lands first and the consume then compares against the
 * new hash, or the `DELETE` lands first and the `UPDATE` matches no row. Neither order can leave
 * a half-rebound row or resurrect a consumed one.
 */
export async function rebindToken(
  db: D1Database,
  email: string,
  nonceHash: string,
  now: number,
): Promise<RebindTokenOutcome> {
  const res = await db
    .prepare(
      `UPDATE magic_token SET nonce_hash = ?
       WHERE email = ? AND expires_at > ? AND nonce_hash IS NOT NULL AND nonce_hash <> ?`,
    )
    .bind(nonceHash, normalizeEmail(email), now, nonceHash)
    .run();
  return res.meta.changes > 0 ? { outcome: 'rebound' } : { outcome: 'not-eligible' };
}

/** True when a magic-link token for this email was issued at or after `since`, for the send cooldown. */
export async function recentlyIssued(db: D1Database, email: string, since: number): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS one FROM magic_token WHERE email = ? AND created_at >= ? LIMIT 1')
    .bind(normalizeEmail(email), since)
    .first<{ one: number }>();
  return row != null;
}

/**
 * Consume a token in one atomic statement. A returned email means the token was present and
 * unexpired and is now gone, so the link is single-use by construction on strongly-consistent D1.
 *
 * `nonceHash` is the confirming browser's own pending-login nonce, hashed. The same-browser
 * binding lives inside this one predicate: a row bound at issue time is deleted only when the
 * two hashes are equal, and a null returned for a mismatch means the row is still there, so a
 * click from the wrong browser refuses without burning the requester's own link. A row carrying
 * no binding (written before migrations/0004_login_nonce.sql) is consumed whatever the caller
 * passes, which is what keeps an in-flight link confirmable across the migration.
 *
 * The comparison happens in SQL rather than in TypeScript on purpose: no `===` ever runs against
 * a secret here.
 */
export async function consumeToken(
  db: D1Database,
  tokenHash: string,
  now: number,
  nonceHash: string | null = null,
): Promise<string | null> {
  try {
    const row = await db
      .prepare(
        `DELETE FROM magic_token
       WHERE token_hash = ? AND expires_at > ? AND (nonce_hash IS NULL OR nonce_hash = ?)
       RETURNING email`,
      )
      .bind(tokenHash, now, nonceHash)
      .first<{ email: string }>();
    return row?.email ?? null;
  } catch (err) {
    rethrowStoreFailure(err);
  }
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
    // issueToken's own sweep (above) runs the identical unindexed idiom against magic_token, and
    // there the OR also defeats idx_magic_token_email: a WHERE clause combining an indexed
    // equality with an unindexed range under OR cannot use either index. No index on
    // session.expires_at or magic_token.expires_at backs either scan: an editor roster is small
    // enough that a full-table scan here is negligible, and adding the index later is a
    // hand-applied migration a consumer runs themselves (docs/extend/upgrade-cairn.md), not
    // worth asking for at this scale. migrations/0003_preview.sql indexes the identical
    // expires_at-sweep idiom for preview_tokens instead, the deliberate counter-example this
    // ruling does not extend to. Reopen if editor rosters stop being small.
    db.prepare('DELETE FROM session WHERE expires_at <= ?').bind(now),
    db
      .prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, normalizeEmail(email), expiresAt, now),
  ]);
}

/**
 * Resolve a session to its editor, joining `editor` so the role is read live. An expired
 * session or a removed editor resolves to null, which revokes access on the next request.
 */
export async function resolveSession(db: D1Database, id: string, now: number): Promise<EditorRow | null> {
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

/** What {@link deleteSession} returns: the deleted row's email and the expiry it carried. */
export type DeletedSession = { email: string; expiresAt: number };

/**
 * Delete a session (logout), answering with the email and expiry the deleted row carried, or
 * null when the id named no row. `RETURNING` keeps this one statement and one round trip, and
 * gives the logout record a subject the caller has no other way to reach: logout is a public
 * admin path, so the guard never resolves an editor onto it. The delete is unconditional, an
 * expired row is still safe to remove, so the caller reads the returned `expiresAt` against its
 * own `now` to decide whether the row was still live before emitting a destroyed record.
 */
export async function deleteSession(db: D1Database, id: string): Promise<DeletedSession | null> {
  const row = await db
    .prepare('DELETE FROM session WHERE id = ? RETURNING email, expires_at')
    .bind(id)
    .first<{ email: string; expires_at: number }>();
  return row ? { email: row.email, expiresAt: row.expires_at } : null;
}

/** The full allowlist, sorted by email. */
export async function listEditors(db: D1Database): Promise<EditorRow[]> {
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
  role: string,
  now: number,
): Promise<void> {
  await db
    .prepare('INSERT INTO editor (email, display_name, role, created_at) VALUES (?, ?, ?, ?)')
    .bind(normalizeEmail(email), displayName, role, now)
    .run();
}

/** What {@link deleteEditor} returns: removed, refused as the last owner-capability row, or no such editor. */
export type DeleteEditorOutcome =
  | { outcome: 'removed' }
  | { outcome: 'last-owner' }
  | { outcome: 'not-found' };

/** What {@link setEditorRole} returns: changed, refused as a last-owner demotion, or no such editor. */
export type SetEditorRoleOutcome =
  | { outcome: 'ok' }
  | { outcome: 'last-owner' }
  | { outcome: 'not-found' };

/**
 * What {@link removeOwnerIfNotLast} and {@link demoteOwnerIfNotLast} return: the guarded write
 * landed, it is refused because this is the last owner-capability row, or the row is not eligible
 * for this guard at all. `not-eligible` (never `not-found`) because the atomic write's own `WHERE`
 * only matches owner-capability rows, so a `changes === 0` result cannot tell an absent row apart
 * from a present, non-owner one; the discriminant names only what the predicate knows.
 */
export type OwnerGuardOutcome =
  | { outcome: 'ok' }
  | { outcome: 'last-owner' }
  | { outcome: 'not-eligible' };

/**
 * The removal cascade's preview-token leg: every link one removed editor minted, keyed by their
 * already-normalized address. Both {@link deleteEditor} and {@link removeOwnerIfNotLast} call it
 * after their own session/magic-token batch.
 *
 * It runs as its own statement, deliberately outside that batch: `preview_tokens` is additive
 * (migrations/0003_preview.sql), and every site with `AUTH_DB` wired but that migration unapplied
 * (today, every consumer site) must still remove an editor cleanly. A single `db.batch()` fails
 * the WHOLE batch on one statement's "no such table", which would regress that site's editor
 * removal entirely; a separate statement confines that failure to the one table it names. A
 * "no such table" here is silently swallowed (the un-migrated normal state has no rows to clear);
 * any other error rethrows, since the caller's own removal has already committed and this module
 * stays logger-free, so a genuine D1 fault surfaces to the caller rather than disappearing.
 */
async function deleteEditorPreviewTokens(db: D1Database, normalizedEmail: string): Promise<void> {
  try {
    await db.prepare('DELETE FROM preview_tokens WHERE editor = ?').bind(normalizedEmail).run();
  } catch (err) {
    if (!/no such table/i.test(String(err))) throw err;
  }
}

/**
 * Whether the row a guarded write left untouched is still there, the read every `changes === 0`
 * branch below runs to tell a refusal apart from a plain miss. `ownerRoles`, when given, narrows
 * the read to owner-capability rows, matching the two owner-only guards whose own `WHERE` never
 * admitted a non-owner row in the first place.
 *
 * It runs after the atomic write and cannot change that write's outcome; it only names which of
 * the two things happened, so it stays outside the conditional statement the guard depends on.
 * A concurrent write landing between the guarded statement and this read can therefore mislabel
 * the refusal (a row removed in that window reads as `not-found` where `last-owner` was true, and
 * the reverse). That is a message-only error: the guarded write itself already refused correctly,
 * and no caller acts on the discriminant beyond choosing which sentence to show.
 */
async function editorRowStillPresent(
  db: D1Database,
  normalizedEmail: string,
  ownerRoles?: string[],
): Promise<boolean> {
  if (ownerRoles === undefined) {
    const row = await db.prepare('SELECT 1 FROM editor WHERE email = ?').bind(normalizedEmail).first();
    return Boolean(row);
  }
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const row = await db
    .prepare(`SELECT 1 FROM editor WHERE email = ? AND role IN (${placeholders})`)
    .bind(normalizedEmail, ...ownerRoles)
    .first();
  return Boolean(row);
}

/**
 * Remove an editor and cut their live access: sessions, any pending token, and every preview
 * link they minted go too. A removed editor's outstanding preview links die with their access,
 * the same posture as the session and magic-token cascade; a mere role or access-map change,
 * by contrast, does not retro-revoke a link, and the owner's remedy there is the revoke-all
 * admin affordance. See {@link deleteEditorPreviewTokens} for why that last delete sits outside
 * the batch.
 *
 * `ownerRoles` (the vocabulary's owner-capability name set, see `resolveOwnerLevelRoles`) is
 * folded into the same atomic `DELETE`: a non-owner row is removed unconditionally, and an
 * owner-capability row is refused when it is the last one. This is the one call a caller needs
 * for "remove this editor" regardless of role, so it no longer pre-fetches the target's role and
 * dispatches between this function and {@link removeOwnerIfNotLast}. On a `changes === 0` result
 * the only follow-up is a read that classifies the refusal (the row is present and is the last
 * owner) from a plain miss (no such editor); that read cannot change the outcome, it only names
 * which of the two happened. `removeOwnerIfNotLast` survives alongside this as the narrower
 * owner-only guard.
 *
 * An EMPTY `ownerRoles` means the caller declares no owner-capability vocabulary at all, and the
 * write is then unguarded: with no role names to count, there is no last-owner row to protect, so
 * the plain `DELETE` runs. `defineRoles` always resolves at least one owner-capability name, so
 * `[]` is unreachable through the engine's own callers; it is reachable only from a site calling
 * this `/auth-store` export directly, which is exactly the caller that has taken the decision on
 * itself.
 *
 * The cascade is deliberately two statements, not one batch with the removal: the editor `DELETE`
 * has to commit and report its own `changes` before the sweep runs, since the sweep is
 * conditional on the removal having happened. Access dies with the editor row regardless of when
 * the sweep lands, because `resolveSession` INNER JOINs `editor`, so a session row outliving its
 * editor by a moment resolves to null and authorizes nothing.
 */
export async function deleteEditor(
  db: D1Database,
  email: string,
  ownerRoles: string[],
): Promise<DeleteEditorOutcome> {
  const key = normalizeEmail(email);
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res =
    ownerRoles.length === 0
      ? await db.prepare('DELETE FROM editor WHERE email = ?').bind(key).run()
      : await db
          .prepare(
            `DELETE FROM editor
             WHERE email = ?
               AND (
                 role NOT IN (${placeholders})
                 OR (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1
               )`,
          )
          .bind(key, ...ownerRoles, ...ownerRoles)
          .run();
  if (res.meta.changes === 0) {
    return (await editorRowStillPresent(db, key)) ? { outcome: 'last-owner' } : { outcome: 'not-found' };
  }
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(key),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(key),
  ]);
  await deleteEditorPreviewTokens(db, key);
  return { outcome: 'removed' };
}

/**
 * Remove an owner-capability editor only if another owner-capability row remains. The count is
 * part of the DELETE, so two concurrent removals cannot both pass a separate check and strand the
 * allowlist below one owner. `ownerRoles` is the vocabulary's owner-capability name set (see
 * `resolveOwnerLevelRoles`), not the literal `'owner'` string, so a site with more than one owner-level
 * role name stays safe. The narrower, owner-only twin of {@link deleteEditor}: its own `WHERE`
 * matches only an owner-capability row, so it refuses outright (`not-eligible`) on a row that is
 * not owner-capability at all, rather than removing it. On success the editor's sessions, pending
 * token, and minted preview links all go too, the same cascade {@link deleteEditor} runs.
 */
export async function removeOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
): Promise<OwnerGuardOutcome> {
  if (ownerRoles.length === 0) return { outcome: 'not-eligible' };
  const key = normalizeEmail(email);
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res = await db
    .prepare(
      `DELETE FROM editor
       WHERE email = ? AND role IN (${placeholders})
         AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`,
    )
    .bind(key, ...ownerRoles, ...ownerRoles)
    .run();
  if (res.meta.changes === 0) {
    return (await editorRowStillPresent(db, key, ownerRoles))
      ? { outcome: 'last-owner' }
      : { outcome: 'not-eligible' };
  }
  await db.batch([
    db.prepare('DELETE FROM session WHERE email = ?').bind(key),
    db.prepare('DELETE FROM magic_token WHERE email = ?').bind(key),
  ]);
  await deleteEditorPreviewTokens(db, key);
  return { outcome: 'ok' };
}

/**
 * Insert the owner row when the allowlist is empty, in one atomic statement
 * (`INSERT ... SELECT ... WHERE NOT EXISTS`), so two concurrent bootstrap requests race safely
 * to exactly one inserted row. Returns whether this call performed the insert; a non-empty
 * table writes nothing and returns false.
 */
export async function insertOwnerIfEmpty(
  db: D1Database,
  email: string,
  displayName: string,
  now: number,
): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT INTO editor (email, display_name, role, created_at)
       SELECT ?, ?, 'owner', ?
       WHERE NOT EXISTS (SELECT 1 FROM editor)`,
    )
    .bind(normalizeEmail(email), displayName, now)
    .run();
  return res.meta.changes === 1;
}

/**
 * Change an editor's role. The guard reads the new role on the next request.
 *
 * `ownerRoles` (the vocabulary's owner-capability name set, see `resolveOwnerLevelRoles`) is
 * folded into the same atomic `UPDATE`: the write is refused only when it would demote the last
 * owner-capability row out of owner capability, never for any other role change. This is the one
 * call a caller needs for "change this editor's role", so it no longer pre-fetches the target's
 * current role and dispatches between this function and {@link demoteOwnerIfNotLast}. On a
 * `changes === 0` result the only follow-up is a read that classifies the refusal (the row is
 * present and this was a last-owner demotion) from a plain miss (no such editor); that read
 * cannot change the outcome, it only names which of the two happened.
 * `demoteOwnerIfNotLast` survives alongside this as the narrower owner-only guard.
 *
 * An EMPTY `ownerRoles` means the caller declares no owner-capability vocabulary at all, and the
 * write is then unguarded: with no role names to count, no change can demote a last owner, so the
 * plain `UPDATE` runs. `defineRoles` always resolves at least one owner-capability name, so `[]`
 * is unreachable through the engine's own callers; it is reachable only from a site calling this
 * `/auth-store` export directly.
 */
export async function setEditorRole(
  db: D1Database,
  email: string,
  role: string,
  ownerRoles: string[],
): Promise<SetEditorRoleOutcome> {
  const key = normalizeEmail(email);
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res =
    ownerRoles.length === 0
      ? await db.prepare('UPDATE editor SET role = ? WHERE email = ?').bind(role, key).run()
      : await db
          .prepare(
            `UPDATE editor SET role = ?
             WHERE email = ?
               AND (
                 role NOT IN (${placeholders})
                 OR ? = 1
                 OR (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1
               )`,
          )
          .bind(role, key, ...ownerRoles, ownerRoles.includes(role) ? 1 : 0, ...ownerRoles)
          .run();
  if (res.meta.changes === 0) {
    return (await editorRowStillPresent(db, key)) ? { outcome: 'last-owner' } : { outcome: 'not-found' };
  }
  return { outcome: 'ok' };
}

/**
 * Demote an owner-capability editor to `newRole` only if another owner-capability row remains,
 * in one atomic statement (see `removeOwnerIfNotLast`). `ownerRoles` is the vocabulary's
 * owner-capability name set, so a site with more than one owner-level role name stays safe. The
 * narrower, owner-only twin of {@link setEditorRole}: its own `WHERE` matches only an
 * owner-capability row, so it refuses outright (`not-eligible`) on a row that is not
 * owner-capability at all, rather than changing it.
 */
export async function demoteOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
  newRole: string,
): Promise<OwnerGuardOutcome> {
  if (ownerRoles.length === 0) return { outcome: 'not-eligible' };
  const key = normalizeEmail(email);
  const placeholders = ownerRoles.map(() => '?').join(', ');
  const res = await db
    .prepare(
      `UPDATE editor SET role = ?
       WHERE email = ? AND role IN (${placeholders})
         AND (SELECT COUNT(*) FROM editor WHERE role IN (${placeholders})) > 1`,
    )
    .bind(newRole, key, ...ownerRoles, ...ownerRoles)
    .run();
  if (res.meta.changes === 0) {
    return (await editorRowStillPresent(db, key, ownerRoles))
      ? { outcome: 'last-owner' }
      : { outcome: 'not-eligible' };
  }
  return { outcome: 'ok' };
}
