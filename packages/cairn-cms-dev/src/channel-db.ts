// cairn-cms: the auth-channel double for @glw907/cairn-cms-dev. fake-auth-db.ts matches AUTH_DB's
// exact SQL strings and answers by hand, because that store's statements are plain CRUD a fixture
// can safely reimplement. The channel store's conditional upserts, sliding-window budgets, and
// RETURNING-based consume/delete semantics (src/lib/auth-channel/store.ts) are not safe to
// reimplement that way: a hand-rolled double would mirror the implementation instead of exercising
// it, hiding exactly the concurrency bugs the design exists to catch. This double instead runs a
// site's real schema and the store's real SQL against a real engine, node:sqlite's in-memory
// DatabaseSync, so unknown SQL executes rather than throwing, the deliberate opposite of
// fake-auth-db's fail-loud dispatch table.
import type { SQLInputValue } from 'node:sqlite';

/** The floor node:sqlite is unflagged from; createChannelDb throws below it. */
const NODE_SQLITE_FLOOR = '22.13.0';

/**
 * Compare two `major.minor.patch` version strings. A missing component reads as 0, so `'22'` and
 * `'22.0.0'` compare equal.
 */
function isAtLeast(version: string, floor: string): boolean {
  const parts = version.split('.').map(Number);
  for (const [index, floorPart] of floor.split('.').map(Number).entries()) {
    const part = parts[index] ?? 0;
    if (part !== floorPart) return part > floorPart;
  }
  return true;
}

/**
 * Refuse a sub-floor Node runtime with a clear message instead of letting `import('node:sqlite')`
 * fail with an opaque resolution error. Takes the version as a parameter (never reads
 * `process.versions` itself) so a test can drive both branches without mutating a global.
 */
export function checkNodeSqliteFloor(nodeVersion: string): void {
  if (!isAtLeast(nodeVersion, NODE_SQLITE_FLOOR)) {
    throw new Error(
      `createChannelDb requires node:sqlite, unflagged from Node.js ${NODE_SQLITE_FLOOR}; this process is running Node.js ${nodeVersion}.`,
    );
  }
}

/** The D1 prepared-statement surface the channel store's bare-db and session calls touch. */
export interface ChannelStatement {
  bind(...args: unknown[]): ChannelStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}

/** The `withSession()` surface: the same statement builder, plus atomic batch. */
export interface ChannelSession {
  prepare(sql: string): ChannelStatement;
  batch(statements: ChannelStatement[]): Promise<unknown[]>;
}

/** The D1-shaped double `createChannelDb` returns. */
export interface ChannelDb {
  prepare(sql: string): ChannelStatement;
  withSession(constraint?: string): ChannelSession;
}

/**
 * Build an in-memory `node:sqlite` database, apply `schemaSql` once, and wrap it in the surface
 * the channel store touches. `withSession` ignores its constraint argument and shares this one
 * database: single-node SQLite already satisfies D1's first-primary session guarantee.
 * @throws When running below the node:sqlite floor (Node.js 22.13).
 */
export async function createChannelDb(schemaSql: string): Promise<ChannelDb> {
  checkNodeSqliteFloor(process.versions.node);
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(':memory:');
  database.exec(schemaSql);

  function statement(sql: string): ChannelStatement {
    const compiled = database.prepare(sql);
    let bound: SQLInputValue[] = [];
    const stmt: ChannelStatement = {
      bind(...args: unknown[]) {
        bound = args as SQLInputValue[];
        return stmt;
      },
      async first<T>() {
        // node:sqlite's get() answers undefined on no row; the channel store's mintCode compares
        // its result with `!== null`, so a passed-through undefined would read as a successful
        // mint through a cooldown-rejected upsert.
        const row = compiled.get(...bound);
        return row === undefined ? null : (row as T);
      },
      async run() {
        const result = compiled.run(...bound);
        return { meta: { changes: Number(result.changes) } };
      },
    };
    return stmt;
  }

  function session(): ChannelSession {
    return {
      prepare: statement,
      async batch(statements: ChannelStatement[]) {
        // A bare loop admits a partial write on a failing statement; D1's batch is atomic, so this
        // double wraps the run in one transaction and rolls back whole on any failure.
        database.exec('BEGIN');
        try {
          const results: unknown[] = [];
          for (const s of statements) {
            results.push(await s.run());
          }
          database.exec('COMMIT');
          return results;
        } catch (err) {
          database.exec('ROLLBACK');
          throw err;
        }
      },
    };
  }

  return {
    prepare: statement,
    withSession() {
      return session();
    },
  };
}
