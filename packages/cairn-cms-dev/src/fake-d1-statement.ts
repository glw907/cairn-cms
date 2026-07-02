// cairn-cms: shared D1Database-shim plumbing for the dev package's SQL-dispatching fakes
// (fake-app-db.ts, fake-auth-db.ts). Both fixtures match exact SQL substrings and answer through
// the same prepare().bind().first()/run()/all() surface; this module holds the one FakeStatement
// contract and the one bind-then-dispatch closure factory so the two fixtures cannot drift on the
// D1Database shape they stand in for.

/** The D1 prepared-statement surface both fake stores implement. */
export interface FakeStatement {
  bind(...args: unknown[]): FakeStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

/** What one dispatched SQL execution yields; first()/run()/all() each read their own slice. */
export interface FakeExecResult<Row> {
  row: Row | null;
  rows: Row[];
  changes: number;
}

/** Build a bind-then-execute FakeStatement over a per-call SQL dispatcher. */
export function createFakeStatement<Row>(
  sql: string,
  execute: (sql: string, args: unknown[]) => FakeExecResult<Row>,
): FakeStatement {
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
      return { results: execute(sql, bound).rows as unknown as T[] };
    },
  };
  return stmt;
}
