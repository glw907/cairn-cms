// A dev-only AUTH_DB double for the showcase, the auth-store sibling of fake-github.ts. It
// implements just the D1Database surface src/lib/auth/store.ts and src/lib/auth/preview-store.ts
// touch (prepare(sql).bind() with first/run/all, plus batch) over in-memory editor and
// preview-token maps, so /admin/editors and the preview mint/revoke/load chain work under
// CAIRN_DEV_BACKEND=1 without a real D1 binding. Installed from hooks.server.ts as
// platform.env.AUTH_DB (the admin routes AND, since the preview pass, /preview/[token] too, the
// only non-admin path this fixture reaches: previewLoad reads the same rows previewMintAction
// wrote, and both must share this one instance); never part of the published engine.
//
// Dispatch is on the store's exact SQL strings, matched as normalized substrings. Unknown SQL
// throws with the SQL in the message, deliberately: when a store change adds or rewords a
// statement, dev fails loudly here instead of silently no-opping. The brittleness is confined
// to this fixture and is the point. The two fixtures share their FakeStatement contract and
// closure factory via fake-d1-statement.ts.

import { createFakeStatement, type FakeExecResult, type FakeStatement } from './fake-d1-statement.js';

// A site's declared role vocabulary can name any string, not just 'owner'/'editor' (see
// src/lib/auth/roles.ts), so the fixture's role column is a bare string rather than a fixed
// union; the guarded delete/update below key on membership in a bound owner-role set, not on
// the literal 'owner'.
type Role = string;

/** A row in the fake `editor` table, in the store's column shape. */
interface EditorRow {
  email: string;
  display_name: string;
  role: Role;
}

/** A row in the fake `preview_tokens` table, in the store's column shape (preview-store.ts). */
interface PreviewTokenRow {
  concept: string;
  entry_id: string;
  editor: string;
  expires_at: number;
}

/**
 * The store's `SELECT 1 …` classification reads (deleteEditor/setEditorRole and their owner-only
 * guard twins, on a `changes === 0` write) never read a real column, only presence; this shape
 * stands in for `1 AS one`.
 */
interface ProbeRow {
  one: number;
}

/** Any row shape `execute` dispatches into from one function. */
type FakeRow = EditorRow | PreviewTokenRow | ProbeRow;

export interface FakeAuthDb {
  prepare(sql: string): FakeStatement;
  batch(statements: FakeStatement[]): Promise<unknown[]>;
}

/** Build the in-memory D1 stand-in the showcase binds as AUTH_DB, seeded with a demo allowlist. */
export function createFakeAuthDb(): FakeAuthDb {
  // Seeded allowlist: the fake session's editor (hooks.server.ts) as owner, plus one plain
  // editor so the list view renders more than the acting owner's own row.
  const editors = new Map<string, EditorRow>([
    ['editor@showcase.test', { email: 'editor@showcase.test', display_name: 'Demo Editor', role: 'owner' }],
    ['writer@showcase.test', { email: 'writer@showcase.test', display_name: 'Sample Writer', role: 'editor' }],
  ]);

  // The guard's live count: how many rows carry a role in the bound owner-role set, not the
  // literal 'owner' (a site can name more than one owner-capability role, see resolveOwnerLevelRoles).
  const ownerCount = (ownerRoles: string[]) =>
    [...editors.values()].filter((e) => ownerRoles.includes(e.role)).length;

  // Preview tokens, keyed by their hash (the store never sees the plaintext): previewMint's
  // insert, previewLoad's two lookups (with and without the expiry predicate), and the
  // revoke/lifecycle-cleanup deletes by entry or by editor.
  const previewTokens = new Map<string, PreviewTokenRow>();

  // The scan all three of the table's DELETE statements share (by expiry, by entry, by editor);
  // each supplies only its own predicate, and the returned count is the D1 `meta.changes` the
  // store reads back.
  const deletePreviewTokensWhere = (match: (row: PreviewTokenRow) => boolean): number => {
    let changes = 0;
    for (const [hash, row] of previewTokens) {
      if (match(row)) {
        previewTokens.delete(hash);
        changes++;
      }
    }
    return changes;
  };

  function execute(rawSql: string, args: unknown[]): FakeExecResult<FakeRow> {
    const sql = rawSql.replace(/\s+/g, ' ').trim();
    const none: FakeExecResult<FakeRow> = { row: null, rows: [], changes: 0 };

    // resolveSession: the fixture hook injects locals.cairnEditor directly and the engine guard
    // is not installed in dev, so no session row ever exists. Answer null rather than throwing.
    // The fake db grants nothing on its own; the owner identity is minted by devBackendHandle's
    // locals.cairnEditor write, not by this null session lookup.
    if (sql.includes('FROM session s JOIN editor e')) return none;

    // findEditor
    if (sql.includes('SELECT email, display_name, role FROM editor WHERE email = ?')) {
      return { ...none, row: editors.get(String(args[0])) ?? null };
    }

    // listEditors
    if (sql.includes('SELECT email, display_name, role FROM editor ORDER BY email')) {
      const rows = [...editors.values()].sort((a, b) => a.email.localeCompare(b.email));
      return { ...none, rows };
    }

    // insertEditor (args: email, display_name, role, created_at)
    if (sql.includes('INSERT INTO editor')) {
      const email = String(args[0]);
      editors.set(email, { email, display_name: String(args[1]), role: args[2] as Role });
      return { ...none, changes: 1 };
    }

    // deleteEditor / setEditorRole's changes===0 classification read, the owner-only-guard
    // variant removeOwnerIfNotLast/demoteOwnerIfNotLast use ("is this row still eligible for the
    // guard at all"): `SELECT 1 FROM editor WHERE email = ? AND role IN (...)`, bound
    // (email, ...ownerRoles). Checked before the plain classification read below, since this
    // statement's SQL is a superset of that one's (same ordering concern as the guarded
    // delete/update pair).
    if (sql.includes('SELECT 1 FROM editor WHERE email = ?') && sql.includes('role IN (')) {
      const email = String(args[0]);
      const ownerRoles = args.slice(1).map(String);
      const target = editors.get(email);
      return { ...none, row: target && ownerRoles.includes(target.role) ? { one: 1 } : null };
    }

    // deleteEditor / setEditorRole's changes===0 classification read, the generalized-dispatch
    // variant ("is this row still there at all"): `SELECT 1 FROM editor WHERE email = ?`.
    if (sql.includes('SELECT 1 FROM editor WHERE email = ?')) {
      return { ...none, row: editors.has(String(args[0])) ? { one: 1 } : null };
    }

    // deleteEditor's generalized guarded delete (ownerRoles.length > 0): a non-owner row is
    // removed unconditionally (`role NOT IN (...)`), an owner-capability row only when another
    // owner-capability row remains (the COUNT(*) subquery), bound
    // (email, ...ownerRoles, ...ownerRoles). The `role NOT IN (` marker is unique to this shape
    // and to setEditorRole's UPDATE twin below; it distinguishes both from the narrower
    // owner-only guards (removeOwnerIfNotLast/demoteOwnerIfNotLast), which have no NOT-IN branch
    // and refuse a non-owner row outright. Checked before the owner-only guard below because that
    // check's `role IN (` / `COUNT(*)` markers both also appear here (the subquery text).
    if (sql.startsWith('DELETE FROM editor') && sql.includes('role NOT IN (')) {
      const email = String(args[0]);
      const rest = args.slice(1).map(String);
      const ownerRoles = rest.slice(0, rest.length / 2);
      const target = editors.get(email);
      if (!target) return none;
      const isOwner = ownerRoles.includes(target.role);
      if (!isOwner || ownerCount(ownerRoles) > 1) {
        editors.delete(email);
        return { ...none, changes: 1 };
      }
      return none;
    }

    // removeOwnerIfNotLast's guarded delete: a set-based `role IN (...)` membership test plus a
    // COUNT(*) subquery over that same set, bound (email, ...ownerRoles, ...ownerRoles). Checked
    // before the plain editor delete below because its SQL contains that statement's substring
    // too; the `role IN (` marker distinguishes the guarded shape.
    if (sql.startsWith('DELETE FROM editor') && sql.includes('role IN (') && sql.includes('COUNT(*)')) {
      const email = String(args[0]);
      const ownerRoles = args.slice(1, 1 + (args.length - 1) / 2).map(String);
      const target = editors.get(email);
      if (!target || !ownerRoles.includes(target.role) || ownerCount(ownerRoles) <= 1) return none;
      editors.delete(target.email);
      return { ...none, changes: 1 };
    }

    // deleteEditor's ownerRoles-empty path: the unguarded editor row delete.
    if (sql.includes('DELETE FROM editor WHERE email = ?')) {
      return { ...none, changes: editors.delete(String(args[0])) ? 1 : 0 };
    }

    // setEditorRole's generalized guarded update (ownerRoles.length > 0): the same non-owner /
    // last-owner split as the guarded delete above, plus a third escape (`? = 1`, the
    // caller-computed flag for "the new role is itself owner-capability") since a same-capability
    // role change is never a demotion. Bound (role, email, ...ownerRoles, flag, ...ownerRoles).
    if (sql.startsWith('UPDATE editor SET role = ?') && sql.includes('role NOT IN (')) {
      const role = String(args[0]);
      const email = String(args[1]);
      const n = (args.length - 3) / 2;
      const ownerRoles = args.slice(2, 2 + n).map(String);
      const flag = args[2 + n];
      const target = editors.get(email);
      if (!target) return none;
      const isOwner = ownerRoles.includes(target.role);
      if (!isOwner || flag === 1 || ownerCount(ownerRoles) > 1) {
        target.role = role;
        return { ...none, changes: 1 };
      }
      return none;
    }

    // demoteOwnerIfNotLast's guarded update: the same set-based membership plus COUNT(*) shape,
    // bound (newRole, email, ...ownerRoles, ...ownerRoles). Checked before the plain role update
    // below for the same reason as the guarded delete above.
    if (sql.startsWith('UPDATE editor SET role = ?') && sql.includes('role IN (') && sql.includes('COUNT(*)')) {
      const newRole = String(args[0]);
      const email = String(args[1]);
      const ownerRoles = args.slice(2, 2 + (args.length - 2) / 2).map(String);
      const target = editors.get(email);
      if (!target || !ownerRoles.includes(target.role) || ownerCount(ownerRoles) <= 1) return none;
      target.role = newRole;
      return { ...none, changes: 1 };
    }

    // setEditorRole's ownerRoles-empty path: the unguarded role update (args: role, email).
    if (sql.includes('UPDATE editor SET role = ? WHERE email = ?')) {
      const target = editors.get(String(args[1]));
      if (!target) return none;
      target.role = args[0] as Role;
      return { ...none, changes: 1 };
    }

    // deleteSession (logout): the fixture hook injects locals.cairnEditor directly, so no session
    // row ever exists here. The RETURNING read (email, expires_at) answers with no row, which is
    // exactly the signal logout reads to skip its auth.session.destroyed record.
    if (sql.includes('DELETE FROM session WHERE id = ? RETURNING email, expires_at')) return none;

    // deleteEditor / removeOwnerIfNotLast batch cleanup: no sessions or tokens exist in dev.
    if (sql.includes('DELETE FROM session WHERE email = ?')) return none;
    if (sql.includes('DELETE FROM magic_token WHERE email = ?')) return none;

    // insertPreviewToken's expiry sweep, the first statement of its batch.
    if (sql.startsWith('DELETE FROM preview_tokens WHERE expires_at <= ?')) {
      const now = Number(args[0]);
      return { ...none, changes: deletePreviewTokensWhere((row) => row.expires_at <= now) };
    }

    // insertPreviewToken's own insert (args: tokenHash, concept, entryId, editor, expiresAt, createdAt).
    if (sql.includes('INSERT INTO preview_tokens')) {
      previewTokens.set(String(args[0]), {
        concept: String(args[1]),
        entry_id: String(args[2]),
        editor: String(args[3]),
        expires_at: Number(args[4]),
      });
      return { ...none, changes: 1 };
    }

    // findPreviewToken: the expiry-checked lookup. Checked before findPreviewTokenAnyExpiry below,
    // since this statement's SQL is a superset of that one's (the `AND expires_at > ?` marker
    // distinguishes them; matching order matters, exactly like the guarded editor delete above).
    if (sql.includes('FROM preview_tokens WHERE token_hash = ?') && sql.includes('AND expires_at > ?')) {
      const row = previewTokens.get(String(args[0]));
      const now = Number(args[1]);
      return { ...none, row: row && row.expires_at > now ? row : null };
    }

    // findPreviewTokenAnyExpiry: the same lookup with no expiry predicate, previewLoad's
    // expired-versus-unknown distinguisher.
    if (sql.includes('FROM preview_tokens WHERE token_hash = ?')) {
      return { ...none, row: previewTokens.get(String(args[0])) ?? null };
    }

    // deletePreviewTokens: the revoke action and the rename/delete/discard lifecycle cleanup.
    if (sql.includes('DELETE FROM preview_tokens WHERE concept = ? AND entry_id = ?')) {
      const concept = String(args[0]);
      const entryId = String(args[1]);
      return {
        ...none,
        changes: deletePreviewTokensWhere((row) => row.concept === concept && row.entry_id === entryId),
      };
    }

    // The editor-removal cascade's third statement (deleteEditor/removeOwnerIfNotLast, store.ts):
    // every preview link the removed editor minted.
    if (sql.includes('DELETE FROM preview_tokens WHERE editor = ?')) {
      const editor = String(args[0]);
      return { ...none, changes: deletePreviewTokensWhere((row) => row.editor === editor) };
    }

    throw new Error(`fake-auth-db: unhandled SQL (extend the dispatch table): ${sql}`);
  }

  function statement(sql: string): FakeStatement {
    return createFakeStatement(sql, execute);
  }

  return {
    prepare: statement,
    async batch(statements: FakeStatement[]) {
      // Sequential, matching D1's transactional batch closely enough for this fixture.
      const results: unknown[] = [];
      for (const s of statements) results.push(await s.run());
      return results;
    },
  };
}
