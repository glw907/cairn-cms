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

async function selectRows() {
  const { results } = await db
    .prepare('SELECT actor, action, entity, entity_id, detail, created_at FROM audit_log ORDER BY id')
    .all<{ actor: string; action: string; entity: string; entity_id: string | null; detail: string | null; created_at: string }>();
  return results;
}

describe('createD1AuditSink against a real D1', () => {
  it('inserts a record and the database populates created_at', async () => {
    const record: AdminActionAuditRecord = {
      editor: 'ed@x.dev',
      action: 'approve',
      entity: 'event',
      entityId: 'evt-1',
      detail: 'approved for the fall season',
    };
    let pending: Promise<unknown> | undefined;
    const sink = createD1AuditSink(db, (p) => {
      pending = p;
    });
    sink(record);
    await pending;

    const rows = await selectRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor: 'ed@x.dev',
      action: 'approve',
      entity: 'event',
      entity_id: 'evt-1',
      detail: 'approved for the fall season',
    });
    expect(rows[0].created_at).toEqual(expect.any(String));
    expect(rows[0].created_at.length).toBeGreaterThan(0);
  });

  it('inserts entity_id and detail as null when the record omits them', async () => {
    let pending: Promise<unknown> | undefined;
    const sink = createD1AuditSink(db, (p) => {
      pending = p;
    });
    sink({ editor: 'ed@x.dev', action: 'sign-in', entity: 'session' });
    await pending;

    const rows = await selectRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_id).toBeNull();
    expect(rows[0].detail).toBeNull();
  });
});
