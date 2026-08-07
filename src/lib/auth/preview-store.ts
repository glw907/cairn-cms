// cairn-cms: D1 access for the public preview token table (spec part 3), through prepared
// statements only. No ORM. Follows the D1 access idiom in src/lib/auth/store.ts exactly: each
// function takes the AUTH_DB binding plus primitives, so it is testable against a real local D1
// and free of SvelteKit. This module is internal, never exported from any package subpath: a
// site reaches it only through mintPreviewToken and the mint/revoke actions
// (src/lib/sveltekit/preview.ts).
import type { D1Database } from '@cloudflare/workers-types';

type PreviewTokenCols = {
  concept: string;
  entry_id: string;
  editor: string;
  expires_at: number;
};

/**
 * A preview token row as the store reads it. `expiresAt` is epoch milliseconds, matching
 * `magic_token` and `session`: SQLite compares across type classes by class, so a TEXT
 * `expires_at` column would never sweep and never expire against a numeric bind.
 */
export type PreviewTokenRow = {
  concept: string;
  entryId: string;
  editor: string;
  expiresAt: number;
};

/** A row to insert, plus the hash the caller has already computed (this module never hashes). */
export type PreviewTokenRecord = PreviewTokenRow & { tokenHash: string };

function toPreviewTokenRow(row: PreviewTokenCols): PreviewTokenRow {
  return { concept: row.concept, entryId: row.entry_id, editor: row.editor, expiresAt: row.expires_at };
}

/**
 * Insert a preview token row, sweeping expired rows in the same batch (the no-cron idiom
 * `issueToken` and `createSession` already run for their own tables). Unlike those two sibling
 * tables, this sweep fires only when a preview is minted, a rare, long-TTL event, so an expired
 * row here can linger longer than a stale magic-link token or session would before its table's
 * own sweep clears it. That lag is cosmetic: expiry is enforced again at lookup in
 * findPreviewToken, so a lingering swept-eligible row is never returned as valid.
 */
export async function insertPreviewToken(db: D1Database, record: PreviewTokenRecord): Promise<void> {
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM preview_tokens WHERE expires_at <= ?').bind(now),
    db
      .prepare(
        `INSERT INTO preview_tokens (token_hash, concept, entry_id, editor, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(record.tokenHash, record.concept, record.entryId, record.editor, record.expiresAt, now),
  ]);
}

/** Look a preview token up by its hash. An unknown or expired hash resolves to null. */
export async function findPreviewToken(db: D1Database, tokenHash: string): Promise<PreviewTokenRow | null> {
  const row = await db
    .prepare('SELECT concept, entry_id, editor, expires_at FROM preview_tokens WHERE token_hash = ? AND expires_at > ?')
    .bind(tokenHash, Date.now())
    .first<PreviewTokenCols>();
  return row ? toPreviewTokenRow(row) : null;
}

/**
 * Delete every preview token minted for one entry (the revoke action, and the rename/delete/
 * discard lifecycle cleanup). Returns the number of rows removed.
 */
export async function deletePreviewTokens(db: D1Database, concept: string, entryId: string): Promise<number> {
  const res = await db
    .prepare('DELETE FROM preview_tokens WHERE concept = ? AND entry_id = ?')
    .bind(concept, entryId)
    .run();
  return res.meta.changes;
}
