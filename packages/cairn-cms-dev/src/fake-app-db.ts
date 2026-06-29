// A dev-only APP_DB double for the showcase's custom Signups screen, the developer-binding sibling
// of fake-auth-db.ts. It implements just the D1Database surface the custom route touches
// (prepare(sql).bind() with all/run/first) over an in-memory signups array, so /admin/signups
// reads and writes its own binding under the cms-dev handle without a real D1 binding. Installed
// from handle.ts as platform.env.APP_DB; never part of the published engine.
//
// Dispatch is on the route's exact SQL strings, matched as normalized substrings. Unknown SQL
// throws with the SQL in the message, deliberately: when the screen adds or rewords a statement,
// dev fails loudly here instead of silently no-opping. The brittleness is confined to this fixture
// and is the point, mirroring fake-auth-db.ts.

/** A row in the fake `signups` table, in the screen's column shape. */
interface SignupRow {
  id: number;
  name: string;
  email: string;
}

interface FakeStatement {
  bind(...args: unknown[]): FakeStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

/** The in-memory D1 stand-in the showcase binds as APP_DB for its custom Signups screen. */
export interface FakeAppDb {
  prepare(sql: string): FakeStatement;
}

/** Build the in-memory APP_DB stand-in, seeded empty so each dev session starts with no signups. */
export function createFakeAppDb(): FakeAppDb {
  const signups: SignupRow[] = [];
  let nextId = 1;

  function execute(rawSql: string, args: unknown[]): { rows: SignupRow[]; changes: number } {
    const sql = rawSql.replace(/\s+/g, ' ').trim();

    // load: list every signup, newest first.
    if (sql.includes('SELECT id, name, email FROM signups ORDER BY id DESC')) {
      const rows = [...signups].sort((a, b) => b.id - a.id);
      return { rows, changes: 0 };
    }

    // create action (args: name, email)
    if (sql.includes('INSERT INTO signups (name, email) VALUES (?, ?)')) {
      signups.push({ id: nextId++, name: String(args[0]), email: String(args[1]) });
      return { rows: [], changes: 1 };
    }

    // remove action (args: id)
    if (sql.includes('DELETE FROM signups WHERE id = ?')) {
      const id = Number(args[0]);
      const index = signups.findIndex((s) => s.id === id);
      if (index === -1) return { rows: [], changes: 0 };
      signups.splice(index, 1);
      return { rows: [], changes: 1 };
    }

    throw new Error(`fake-app-db: unhandled SQL (extend the dispatch table): ${sql}`);
  }

  function statement(sql: string): FakeStatement {
    let bound: unknown[] = [];
    const stmt: FakeStatement = {
      bind(...args: unknown[]) {
        bound = args;
        return stmt;
      },
      async first<T>() {
        return (execute(sql, bound).rows[0] ?? null) as T | null;
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

  return { prepare: statement };
}
