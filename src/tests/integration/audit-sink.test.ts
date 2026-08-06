import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import type { AdminActionAuditRecord } from '../../lib/sveltekit/admin-action.js';

const db = env.AUTH_DB;

// migrations/0002_audit.sql is applied by the shared integration harness (_apply-migrations.ts)
// before any test in this pool runs, so audit_log already exists here.
beforeEach(async () => {
  await db.batch([db.prepare('DELETE FROM audit_log')]);
});

interface AuditRow {
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
}

async function selectRows(): Promise<AuditRow[]> {
  const { results } = await db
    .prepare(
      'SELECT actor, action, entity, entity_id, detail, created_at FROM audit_log ORDER BY id',
    )
    .all<AuditRow>();
  return results;
}

/** Persist one record through the sink, taking the insert promise from `waitUntil` to await it. */
async function persist(record: AdminActionAuditRecord): Promise<void> {
  let pending: Promise<unknown> | undefined;
  createD1AuditSink(db, (p) => {
    pending = p;
  })(record);
  await pending;
}

describe('createD1AuditSink against a real D1', () => {
  it('inserts a record and the database populates created_at', async () => {
    await persist({
      actor: 'ed@x.dev',
      action: 'approve',
      entity: 'event',
      entityId: 'evt-1',
      detail: 'approved for the fall season',
    });

    const rows = await selectRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor: 'ed@x.dev',
      action: 'approve',
      entity: 'event',
      entity_id: 'evt-1',
      detail: 'approved for the fall season',
    });
    // Unambiguous UTC, millisecond resolution: parseable with `new Date(...)` in any timezone and
    // sortable within the same second across several audits.
    expect(rows[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('inserts entity_id and detail as null when the record omits them', async () => {
    await persist({ actor: 'ed@x.dev', action: 'sign-in', entity: 'session' });

    const rows = await selectRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_id).toBeNull();
    expect(rows[0].detail).toBeNull();
  });

  it('inserts a detail truncated at an emoji boundary without D1 rejecting a lone surrogate', async () => {
    // A unit-test fake cannot catch this: a real D1 bind() rejects a lone UTF-16 surrogate, which
    // is exactly what a naive code-unit slice can produce at this boundary. The cut lands at
    // MAX_DETAIL_LENGTH - 1 (the ellipsis marker's length); with the emoji's high surrogate at
    // code-unit index MAX_DETAIL_LENGTH - 2, a naive `.slice` grabs the high surrogate but not its
    // pair, leaving a lone surrogate. (MAX_DETAIL_LENGTH - 1 x's instead, tried first, put the
    // whole emoji past the cut on both a naive slice and a code-point slice and could not
    // discriminate between them.)
    const MAX_DETAIL_LENGTH = 500;
    const detail = 'x'.repeat(MAX_DETAIL_LENGTH - 2) + '🎉' + 'y'.repeat(20);

    await persist({ actor: 'ed@x.dev', action: 'approve', entity: 'event', detail });

    const rows = await selectRows();
    expect(rows).toHaveLength(1);
    const stored = rows[0].detail as string;
    const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    expect(loneSurrogate.test(stored)).toBe(false);
    expect(stored.endsWith('…')).toBe(true);
  });
});
