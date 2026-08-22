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
 *
 * No runtime floor guard: `node:sqlite` has been unflagged since Node.js 22.13, well below this
 * package's own `engines.node` (`>=24`), so the version npm merely warns about on a mismatch is
 * already past the point where `node:sqlite` needs one.
 */
export async function createChannelDb(schemaSql: string): Promise<ChannelDb> {
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
