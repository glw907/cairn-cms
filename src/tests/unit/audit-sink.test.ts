import { describe, it, expect, vi } from 'vitest';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';

const MAX_ACTOR_LENGTH = 320;
const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_DETAIL_LENGTH = 500;

interface RecordedCall {
  sql: string;
  args: unknown[];
}

/** A scriptable D1 fake recording every `prepare`/`bind`/`run` call, `run()` resolving or rejecting per test. */
function fakeD1(
  runResult: 'resolve' | 'reject' = 'resolve',
): { db: D1Database; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const db = {
    prepare(sql: string) {
      const stmt = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          stmt.args = args;
          return stmt;
        },
        run() {
          calls.push({ sql, args: stmt.args });
          return runResult === 'resolve'
            ? Promise.resolve({ meta: { changes: 1 } })
            : Promise.reject(new Error('D1_ERROR: table audit_log has no column'));
        },
      };
      return stmt;
    },
  };
  return { db: db as unknown as D1Database, calls };
}

function record(overrides: Partial<AdminActionAuditRecord> = {}): AdminActionAuditRecord {
  return {
    editor: 'ed@x.dev',
    action: 'approve',
    entity: 'event',
    entityId: 'evt-1',
    detail: 'approved for the fall season',
    ...overrides,
  };
}

/** Yield a macrotask, long enough for the sink's in-flight insert to have reached the fake. */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Drive one record through a sink with no `waitUntil`, and return what the fake recorded. */
async function recordedCalls(
  overrides: Partial<AdminActionAuditRecord> = {},
): Promise<RecordedCall[]> {
  const { db, calls } = fakeD1();
  createD1AuditSink(db, undefined)(record(overrides));
  await settled();
  return calls;
}

describe('createD1AuditSink', () => {
  it('inserts exactly one parameterized statement with no interpolated content', async () => {
    const calls = await recordedCalls();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain('ed@x.dev');
    expect(calls[0].sql).not.toContain('approve');
    expect(calls[0].sql).toMatch(/^INSERT INTO audit_log/);
    expect(calls[0].sql.match(/\?/g)).toHaveLength(5);
  });

  it('binds the editor, action, entity, entityId, and detail in order', async () => {
    const calls = await recordedCalls();

    expect(calls[0].args).toEqual([
      'ed@x.dev',
      'approve',
      'event',
      'evt-1',
      'approved for the fall season',
    ]);
  });

  it('binds null, not undefined, for an absent entityId and an absent detail', async () => {
    const calls = await recordedCalls({ entityId: undefined, detail: undefined });

    expect(calls[0].args[3]).toBeNull();
    expect(calls[0].args[4]).toBeNull();
  });

  it('binds a numeric entityId as a string', async () => {
    const calls = await recordedCalls({ entityId: 42 });

    expect(calls[0].args[3]).toBe('42');
  });

  it('truncates every field to its documented maximum', async () => {
    const calls = await recordedCalls({
      editor: 'x'.repeat(MAX_ACTOR_LENGTH + 50),
      action: 'x'.repeat(MAX_ACTION_LENGTH + 50),
      entity: 'x'.repeat(MAX_ENTITY_LENGTH + 50),
      entityId: 'x'.repeat(MAX_ENTITY_ID_LENGTH + 50),
      detail: 'x'.repeat(MAX_DETAIL_LENGTH + 50),
    });

    const [actor, action, entity, entityId, detail] = calls[0].args as string[];
    expect(actor).toHaveLength(MAX_ACTOR_LENGTH);
    expect(action).toHaveLength(MAX_ACTION_LENGTH);
    expect(entity).toHaveLength(MAX_ENTITY_LENGTH);
    expect(entityId).toHaveLength(MAX_ENTITY_ID_LENGTH);
    expect(detail).toHaveLength(MAX_DETAIL_LENGTH);
  });

  it('returns synchronously, before the insert settles', () => {
    const { db } = fakeD1();
    const sink = createD1AuditSink(db, undefined);
    const returned = sink(record());
    expect(returned).toBeUndefined();
  });

  it('hands the in-flight promise to waitUntil exactly once', () => {
    const { db } = fakeD1();
    const waitUntil = vi.fn();
    const sink = createD1AuditSink(db, waitUntil);
    sink(record());

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);
  });

  it('still performs the insert when waitUntil is explicitly undefined', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db, undefined);
    sink(record());
    await settled();

    expect(calls).toHaveLength(1);
  });

  it('does not throw out of the sink when run() rejects, and logs the truncated record plus the error', async () => {
    const { db } = fakeD1('reject');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // A real waitUntil to await, so the assertion below is not racing the .catch() microtask.
    let handed: Promise<unknown> | undefined;
    const sink = createD1AuditSink(db, (p) => {
      handed = p;
    });

    expect(() => sink(record())).not.toThrow();
    await handed;

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'admin.audit.sink_failed',
        actor: 'ed@x.dev',
        action: 'approve',
        entity: 'event',
        entityId: 'evt-1',
        detail: 'approved for the fall season',
        error: expect.stringContaining('D1_ERROR'),
      }),
    );
    spy.mockRestore();
  });
});
