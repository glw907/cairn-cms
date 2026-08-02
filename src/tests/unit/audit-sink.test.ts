import { describe, it, expect, vi } from 'vitest';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import type { AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';

const MAX_ACTOR_LENGTH = 320;
const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_DETAIL_LENGTH = 500;

/** A scriptable D1 fake recording every `prepare`/`bind`/`run` call, `run()` resolving or rejecting per test. */
function fakeD1(runResult: 'resolve' | 'reject' = 'resolve') {
  const calls: { sql: string; args: unknown[] }[] = [];
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
  return { db, calls };
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

describe('createD1AuditSink', () => {
  it('inserts exactly one parameterized statement with no interpolated content', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(record());
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).not.toContain('ed@x.dev');
    expect(calls[0].sql).not.toContain('approve');
    expect(calls[0].sql).toMatch(/^INSERT INTO audit_log/);
    expect(calls[0].sql.match(/\?/g)).toHaveLength(5);
  });

  it('binds the editor, action, entity, entityId, and detail in order', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(record());
    await new Promise((r) => setTimeout(r, 0));

    expect(calls[0].args).toEqual(['ed@x.dev', 'approve', 'event', 'evt-1', 'approved for the fall season']);
  });

  it('binds null, not undefined, for an absent entityId and an absent detail', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(record({ entityId: undefined, detail: undefined }));
    await new Promise((r) => setTimeout(r, 0));

    expect(calls[0].args[3]).toBeNull();
    expect(calls[0].args[4]).toBeNull();
  });

  it('binds a numeric entityId as a string', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(record({ entityId: 42 }));
    await new Promise((r) => setTimeout(r, 0));

    expect(calls[0].args[3]).toBe('42');
  });

  it('truncates every field to its documented maximum', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(
      record({
        editor: 'x'.repeat(MAX_ACTOR_LENGTH + 50),
        action: 'x'.repeat(MAX_ACTION_LENGTH + 50),
        entity: 'x'.repeat(MAX_ENTITY_LENGTH + 50),
        entityId: 'x'.repeat(MAX_ENTITY_ID_LENGTH + 50),
        detail: 'x'.repeat(MAX_DETAIL_LENGTH + 50),
      }),
    );
    await new Promise((r) => setTimeout(r, 0));

    const [actor, action, entity, entityId, detail] = calls[0].args as string[];
    expect(actor).toHaveLength(MAX_ACTOR_LENGTH);
    expect(action).toHaveLength(MAX_ACTION_LENGTH);
    expect(entity).toHaveLength(MAX_ENTITY_LENGTH);
    expect(entityId).toHaveLength(MAX_ENTITY_ID_LENGTH);
    expect(detail).toHaveLength(MAX_DETAIL_LENGTH);
  });

  it('returns synchronously, before the insert settles', () => {
    const { db } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    const returned = sink(record());
    expect(returned).toBeUndefined();
  });

  it('hands the in-flight promise to waitUntil exactly once', () => {
    const { db } = fakeD1();
    const waitUntil = vi.fn();
    const sink = createD1AuditSink(db as never, waitUntil);
    sink(record());

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise);
  });

  it('still performs the insert when waitUntil is explicitly undefined', async () => {
    const { db, calls } = fakeD1();
    const sink = createD1AuditSink(db as never, undefined);
    sink(record());
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toHaveLength(1);
  });

  it('does not throw out of the sink when run() rejects, and logs the truncated record plus the error', async () => {
    const { db } = fakeD1('reject');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // A real waitUntil to await, so the assertion below is not racing the .catch() microtask.
    let handed: Promise<unknown> | undefined;
    const sink = createD1AuditSink(db as never, (p) => {
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
