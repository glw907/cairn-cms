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

// Appended when a value is cut, so a truncated row or fallback log entry is self-identifying
// rather than looking like a shorter value the caller genuinely supplied.
const TRUNCATION_MARKER = '…';

/**
 * Coerce to a string and cut it to at most `max` characters, counting Unicode code points rather
 * than UTF-16 code units so a cut never lands inside a surrogate pair (D1 can reject a bound
 * string ending in a lone surrogate, which would reopen the exact insert failure the maxima exist
 * to prevent). A cut value ends in an ellipsis, both in the stored row and in the fallback log, so
 * truncation is visible rather than a silent, exploitable boundary.
 */
function truncate(rawValue: unknown, max: number): string {
  const value = String(rawValue);
  const codePoints = Array.from(value);
  if (codePoints.length <= max) return value;
  return codePoints.slice(0, Math.max(0, max - TRUNCATION_MARKER.length)).join('') + TRUNCATION_MARKER;
}

/**
 * Build an `AdminActionAuditSink` (`./admin-action.js`) that persists every record to the
 * packaged `audit_log` table. A site opts in by applying `migrations/0002_audit.sql` and wiring
 * the returned function to `event.locals.auditSink`.
 *
 * The sink is fail-open end to end: it returns synchronously, before the insert settles, and a
 * failure anywhere in the attempt (a synchronous throw from `prepare`, `bind`, or `waitUntil`
 * itself, as well as a rejected insert) is caught and logged rather than left to escape the
 * caller. `adminAction` calls this sink bare inside `ctx.audit`, so an escaping throw here would
 * turn an already-completed domain write into a 500 the editor sees as a failure, inviting a
 * retry that repeats the mutation. Whichever path catches the failure logs the whole truncated
 * record plus the error as `admin.audit.sink_failed`, since the audited action already completed
 * and this is the only remaining trace of that row.
 * @param db - The D1 binding the packaged `audit_log` table lives in.
 * @param waitUntil - Required, and explicitly accepting `undefined`: an optional parameter would
 *   make the shortest call the one that silently drops the insert if the isolate tears down
 *   before it settles, so omitting it (passing `undefined`, typically because no
 *   `event.platform.ctx` is available) has to be a decision the caller makes on purpose, with the
 *   drop risk understood, rather than a default nobody chose. When supplied, it must already be
 *   bound to its owning `ExecutionContext` (`event.platform.context.waitUntil.bind(event.platform.context)`):
 *   `ExecutionContext.waitUntil`'s structural type matches this parameter, so passing the
 *   unbound method typechecks and then throws "Illegal invocation" in workerd, a failure this
 *   sink's own try/catch absorbs but that still silently drops the insert.
 */
export function createD1AuditSink(
  db: D1Database,
  waitUntil: ((promise: Promise<unknown>) => void) | undefined,
): AdminActionAuditSink {
  return (record: AdminActionAuditRecord) => {
    const actor = truncate(record.editor, MAX_ACTOR_LENGTH);
    const action = truncate(record.action, MAX_ACTION_LENGTH);
    const entity = truncate(record.entity, MAX_ENTITY_LENGTH);
    const entityId = record.entityId == null ? null : truncate(record.entityId, MAX_ENTITY_ID_LENGTH);
    const detail = record.detail == null ? null : truncate(record.detail, MAX_DETAIL_LENGTH);

    const logSinkFailed = (error: unknown): void => {
      log.error('admin.audit.sink_failed', {
        editor: actor,
        action,
        entity,
        entityId,
        detail,
        error: error instanceof Error ? error.message : String(error),
      });
    };

    try {
      // Parameterized deliberately: never interpolate audit content into the SQL string, however
      // tempting a template-string simplification looks later.
      const insert = db
        .prepare(
          'INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(actor, action, entity, entityId, detail)
        .run()
        .catch(logSinkFailed);

      waitUntil?.(insert);
    } catch (error) {
      // `prepare`, `bind`, and a nullish `db` all throw synchronously (a typo'd or
      // not-yet-provisioned binding, or D1's own `D1_TYPE_ERROR` for an unsupported bound value),
      // and an unbound `waitUntil` throws "Illegal invocation" in workerd. None of these produce a
      // promise, so the `.catch()` above never runs; this is the only place fail-open can be
      // enforced for that synchronous path.
      logSinkFailed(error);
    }
  };
}
