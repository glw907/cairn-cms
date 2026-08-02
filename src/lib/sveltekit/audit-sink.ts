// cairn-cms: the packaged implementation of the `AdminActionAuditSink` seam (seam 5 of the
// 2026-08-01 ASC engine-seams design). `adminAction` and `createSectionAction` already call
// `event.locals.auditSink` for every mutating action and every authorization refusal; this is the
// first sink the engine ships, backed by the `audit_log` table `migrations/0002_audit.sql` adds.
// Opt-in: a site applies the migration and wires this factory only if it wants the trail
// persisted, and nothing changes for a site that does not.
import type { D1Database } from '@cloudflare/workers-types';
import { log } from '../log/index.js';
import type { AdminActionAuditRecord, AdminActionAuditSink } from './admin-action.js';

// Truncation maxima, chosen to fit every real value this engine or a site wrapper composes with
// generous room to spare, so an oversized `detail` (the one field a handler composes freely)
// cannot suppress its own audit row by causing the insert to fail. These are internal to the
// sink; a truncated value still identifies the actor, action, and entity, and the caller learns
// nothing from a boundary it never sees.
const MAX_ACTOR_LENGTH = 320;
const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_LENGTH = 100;
const MAX_ENTITY_ID_LENGTH = 200;
const MAX_DETAIL_LENGTH = 500;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Build an `AdminActionAuditSink` (`./admin-action.js`) that persists every record to the
 * packaged `audit_log` table. A site opts in by applying `migrations/0002_audit.sql` and wiring
 * the returned function to `event.locals.auditSink`.
 *
 * The sink is fail-open: it returns synchronously, before the insert settles, so a persist
 * failure never fails the audited action. When the insert does reject, the whole truncated
 * record plus the error survives as an `admin.audit.sink_failed` log entry, since the audited
 * action already completed and this is the only remaining trace of that audit row.
 * @param db - The D1 binding the packaged `audit_log` table lives in.
 * @param waitUntil - Required, and explicitly accepting `undefined`: an optional parameter would
 *   make the shortest call the one that silently drops the insert if the isolate tears down
 *   before it settles, so omitting it (passing `undefined`, typically because no
 *   `event.platform.ctx` is available) has to be a decision the caller makes on purpose, with the
 *   drop risk understood, rather than a default nobody chose.
 */
export function createD1AuditSink(
  db: D1Database,
  waitUntil: ((promise: Promise<unknown>) => void) | undefined,
): AdminActionAuditSink {
  return (record: AdminActionAuditRecord) => {
    const actor = truncate(record.editor, MAX_ACTOR_LENGTH);
    const action = truncate(record.action, MAX_ACTION_LENGTH);
    const entity = truncate(record.entity, MAX_ENTITY_LENGTH);
    const entityId =
      record.entityId === undefined ? null : truncate(String(record.entityId), MAX_ENTITY_ID_LENGTH);
    const detail = record.detail === undefined ? null : truncate(record.detail, MAX_DETAIL_LENGTH);

    // Parameterized deliberately: never interpolate audit content into the SQL string, however
    // tempting a template-string simplification looks later.
    const insert = db
      .prepare('INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)')
      .bind(actor, action, entity, entityId, detail)
      .run()
      .catch((error: unknown) => {
        log.error('admin.audit.sink_failed', {
          actor,
          action,
          entity,
          entityId,
          detail,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    waitUntil?.(insert);
  };
}
