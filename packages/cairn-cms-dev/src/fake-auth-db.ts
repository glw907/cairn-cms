// A dev-only AUTH_DB double for the showcase, the auth-store sibling of fake-github.ts. It
// implements just the D1Database surface src/lib/auth/store.ts touches (prepare(sql).bind()
// with first/run/all, plus batch) over an in-memory editors map, so /admin/editors works under
// CAIRN_DEV_BACKEND=1 without a real D1 binding. Installed from hooks.server.ts as
// platform.env.AUTH_DB; never part of the published engine.
//
// Dispatch is on the store's exact SQL strings, matched as normalized substrings. Unknown SQL
// throws with the SQL in the message, deliberately: when a store change adds or rewords a
// statement, dev fails loudly here instead of silently no-opping. The brittleness is confined
// to this fixture and is the point.

type Role = 'owner' | 'editor';

/** A row in the fake `editor` table, in the store's column shape. */
interface EditorRow {
  email: string;
  display_name: string;
  role: Role;
}

/** What one statement execution yields; `run()` and `first()`/`all()` each read their slice. */
interface ExecResult {
  row: EditorRow | null;
  rows: EditorRow[];
  changes: number;
}

interface FakeStatement {
  bind(...args: unknown[]): FakeStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

export interface FakeAuthDb {
  prepare(sql: string): FakeStatement;
  batch(statements: FakeStatement[]): Promise<unknown[]>;
}

export function createFakeAuthDb(): FakeAuthDb {
  // Seeded allowlist: the fake session's editor (hooks.server.ts) as owner, plus one plain
  // editor so the list view renders more than the acting owner's own row.
  const editors = new Map<string, EditorRow>([
    ['editor@showcase.test', { email: 'editor@showcase.test', display_name: 'Demo Editor', role: 'owner' }],
    ['writer@showcase.test', { email: 'writer@showcase.test', display_name: 'Sample Writer', role: 'editor' }],
  ]);

  const ownerCount = () => [...editors.values()].filter((e) => e.role === 'owner').length;

  function execute(rawSql: string, args: unknown[]): ExecResult {
    const sql = rawSql.replace(/\s+/g, ' ').trim();
    const none: ExecResult = { row: null, rows: [], changes: 0 };

    // resolveSession: the fixture hook injects locals.editor directly and the engine guard is
    // not installed in dev, so no session row ever exists. Answer null rather than throwing.
    // The fake db grants nothing on its own; the owner identity is minted by devBackendHandle's
    // locals.editor write, not by this null session lookup.
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

    // removeOwnerIfNotLast's guarded delete; checked before the plain editor delete below
    // because its SQL contains that statement's substring too.
    if (sql.includes("DELETE FROM editor WHERE email = ? AND role = 'owner'")) {
      const target = editors.get(String(args[0]));
      if (!target || target.role !== 'owner' || ownerCount() <= 1) return none;
      editors.delete(target.email);
      return { ...none, changes: 1 };
    }

    // deleteEditor's editor row
    if (sql.includes('DELETE FROM editor WHERE email = ?')) {
      return { ...none, changes: editors.delete(String(args[0])) ? 1 : 0 };
    }

    // demoteOwnerIfNotLast's guarded update; checked before the plain role update below.
    if (sql.includes("UPDATE editor SET role = 'editor' WHERE email = ? AND role = 'owner'")) {
      const target = editors.get(String(args[0]));
      if (!target || target.role !== 'owner' || ownerCount() <= 1) return none;
      target.role = 'editor';
      return { ...none, changes: 1 };
    }

    // setEditorRole (args: role, email)
    if (sql.includes('UPDATE editor SET role = ? WHERE email = ?')) {
      const target = editors.get(String(args[1]));
      if (!target) return none;
      target.role = args[0] as Role;
      return { ...none, changes: 1 };
    }

    // deleteEditor / removeOwnerIfNotLast batch cleanup: no sessions or tokens exist in dev.
    if (sql.includes('DELETE FROM session WHERE email = ?')) return none;
    if (sql.includes('DELETE FROM magic_token WHERE email = ?')) return none;

    throw new Error(`fake-auth-db: unhandled SQL (extend the dispatch table): ${sql}`);
  }

  function statement(sql: string): FakeStatement {
    let bound: unknown[] = [];
    const stmt: FakeStatement = {
      bind(...args: unknown[]) {
        bound = args;
        return stmt;
      },
      async first<T>() {
        return execute(sql, bound).row as T | null;
      },
      async run() {
        return { meta: { changes: execute(sql, bound).changes } };
      },
      async all<T>() {
        return { results: execute(sql, bound).rows as T[] };
      },
    };
    return stmt;
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
