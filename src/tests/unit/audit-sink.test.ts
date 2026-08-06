import { describe, it, expect, vi } from 'vitest';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';

const MAX_ACTOR_LENGTH = 320;
const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_DETAIL_LENGTH = 500;

// One unpaired UTF-16 surrogate, the shape D1's bind() rejects. Deliberately not the module's own
// LONE_SURROGATE (which is unexported, and reusing it would let a bug in it pass its own tests),
// and deliberately non-global, so .test() stays stateless across calls.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

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
    actor: 'ed@x.dev',
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

  it('binds the actor, action, entity, entityId, and detail in order', async () => {
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

  it('binds null, not the literal string "null", for an explicit null entityId and detail', async () => {
    const calls = await recordedCalls({
      entityId: null as unknown as string | undefined,
      detail: null as unknown as string | undefined,
    });

    expect(calls[0].args[3]).toBeNull();
    expect(calls[0].args[4]).toBeNull();
  });

  it('binds a numeric entityId as a string', async () => {
    const calls = await recordedCalls({ entityId: 42 });

    expect(calls[0].args[3]).toBe('42');
  });

  it('truncates every field to its documented maximum and marks it with an ellipsis', async () => {
    const calls = await recordedCalls({
      actor: 'x'.repeat(MAX_ACTOR_LENGTH + 50),
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
    // A truncated value is self-identifying, so an operator reading the table (or the fallback
    // log) never mistakes a cut value for one the caller genuinely supplied that short.
    expect(actor.endsWith('…')).toBe(true);
    expect(detail.endsWith('…')).toBe(true);
  });

  it('does not mark an untruncated value with an ellipsis', async () => {
    const calls = await recordedCalls({ detail: 'short and unremarkable' });

    expect(calls[0].args[4]).toBe('short and unremarkable');
  });

  it('slices on a code-point boundary, never leaving a lone surrogate half', async () => {
    // An emoji ('🎉') is one code point but two UTF-16 code units. The cut lands at
    // MAX_DETAIL_LENGTH - TRUNCATION_MARKER.length (499); with the emoji starting at code-unit
    // index 498, a naive `.slice(0, 499)` on UTF-16 units grabs the emoji's high surrogate only,
    // leaving a lone surrogate at the very end. (A prefix of MAX_DETAIL_LENGTH - 1 instead, tried
    // first, put the whole emoji past the cut on both implementations and could not discriminate
    // between them; this prefix was verified against a temporary naive `value.slice` to confirm
    // it actually fails there before trusting it here.)
    const prefix = 'x'.repeat(MAX_DETAIL_LENGTH - 2);
    const calls = await recordedCalls({ detail: prefix + '🎉' + 'y'.repeat(20) });

    const detail = calls[0].args[4] as string;
    expect(LONE_SURROGATE.test(detail)).toBe(false);
    expect(detail.endsWith('…')).toBe(true);
  });

  it('replaces a lone surrogate already present in the middle of detail, not created by any cut', async () => {
    // The code-point slice only prevents the CUT from creating a lone surrogate; one already
    // present elsewhere in the input (well under the truncation maximum, so no cut happens at
    // all) must still not reach D1's bind() as an invalid string.
    const calls = await recordedCalls({ detail: 'before \uD800 after' });

    const detail = calls[0].args[4] as string;
    expect(LONE_SURROGATE.test(detail)).toBe(false);
    expect(detail).toBe('before � after');
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
        event: 'audit.sink.write_failed',
        reason: 'insert_rejected',
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

  it('does not throw when db.prepare() throws synchronously, and logs the failure', () => {
    const db = {
      prepare() {
        throw new Error('typo binding: AUTH_DB is undefined');
      },
    } as unknown as D1Database;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const waitUntil = vi.fn();
    const sink = createD1AuditSink(db, waitUntil);

    expect(() => sink(record())).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit.sink.write_failed',
        reason: 'prepare_failed',
        actor: 'ed@x.dev',
        error: expect.stringContaining('typo binding'),
      }),
    );
    // Nothing to hand waitUntil: no promise was ever created on this synchronous path.
    expect(waitUntil).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not throw when bind() throws synchronously (D1_TYPE_ERROR), and logs the failure', () => {
    const db = {
      prepare() {
        return {
          bind() {
            throw new Error('D1_TYPE_ERROR: unsupported bind value');
          },
        };
      },
    } as unknown as D1Database;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = createD1AuditSink(db, undefined);

    expect(() => sink(record())).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit.sink.write_failed',
        reason: 'prepare_failed',
        error: expect.stringContaining('D1_TYPE_ERROR'),
      }),
    );
    spy.mockRestore();
  });

  it('does not throw when the db binding itself is undefined (a not-yet-provisioned or typo\'d binding)', () => {
    const db = undefined as unknown as D1Database;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = createD1AuditSink(db, undefined);

    expect(() => sink(record())).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'audit.sink.write_failed', reason: 'prepare_failed' }),
    );
    spy.mockRestore();
  });

  it('does not throw when waitUntil itself throws synchronously (an unbound method, "Illegal invocation")', () => {
    const { db } = fakeD1();
    const waitUntil = (() => {
      throw new Error('Illegal invocation');
    }) as (promise: Promise<unknown>) => void;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = createD1AuditSink(db, waitUntil);

    expect(() => sink(record())).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit.sink.write_failed',
        reason: 'wait_until_failed',
        error: expect.stringContaining('Illegal invocation'),
      }),
    );
    spy.mockRestore();
  });

  it('logs the failure once, tagged wait_until_failed, even when the still-dispatched insert later rejects too', async () => {
    const { db } = fakeD1('reject');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const waitUntil = (() => {
      throw new Error('Illegal invocation');
    }) as (promise: Promise<unknown>) => void;
    const sink = createD1AuditSink(db, waitUntil);

    expect(() => sink(record())).not.toThrow();
    await settled();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'audit.sink.write_failed', reason: 'wait_until_failed' }),
    );
    spy.mockRestore();
  });

  it('does not throw when a field is a null-prototype object (String() throws for it), and logs the failure with a placeholder for that field', () => {
    const { db } = fakeD1();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = createD1AuditSink(db, undefined);
    const badRecord = record({ detail: Object.create(null) as unknown as string });

    expect(() => sink(badRecord)).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit.sink.write_failed',
        reason: 'coercion_failed',
        actor: 'ed@x.dev',
        action: 'approve',
        entity: 'event',
        detail: '[unloggable value]',
        error: expect.stringContaining('Cannot convert object to primitive value'),
      }),
    );
    spy.mockRestore();
  });

  it('does not throw when a field has a throwing toString, and logs the failure with a placeholder for that field', () => {
    const { db } = fakeD1();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sink = createD1AuditSink(db, undefined);
    const badRecord = record({
      detail: {
        toString() {
          throw new Error('boom');
        },
      } as unknown as string,
    });

    expect(() => sink(badRecord)).not.toThrow();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'audit.sink.write_failed',
        reason: 'coercion_failed',
        detail: '[unloggable value]',
        error: expect.stringContaining('boom'),
      }),
    );
    spy.mockRestore();
  });
});
