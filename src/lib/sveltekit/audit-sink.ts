// cairn-cms: the packaged implementation of the `AdminActionAuditSink` seam (seam 5 of the
// 2026-08-01 ASC engine-seams design). `adminAction` and `createSectionAction` already call
// `event.locals.cairnAuditSink` for every mutating action and every authorization refusal; this is the
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

// What a field logs as when its own coercion (`String(rawValue)` inside `truncate`) throws,
// rather than losing the whole `audit.sink.write_failed` line for the one field that could not
// be turned into a string.
const UNCOERCIBLE_PLACEHOLDER = '[unloggable value]';

// Matches one unpaired UTF-16 surrogate: a high surrogate with no following low surrogate, or a
// low surrogate with no preceding high surrogate. `truncate`'s code-point slice never produces
// one of these at the cut itself, but a lone surrogate already present anywhere else in the input
// passes through a naive slice untouched.
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Coerce to a string and cut it to at most `max` characters, counting Unicode code points rather
 * than UTF-16 code units so a cut never lands inside a surrogate pair (D1 can reject a bound
 * string ending in a lone surrogate, which would reopen the exact insert failure the maxima exist
 * to prevent). A cut value ends in an ellipsis, both in the stored row and in the fallback log, so
 * truncation is visible rather than a silent, exploitable boundary. A lone surrogate already
 * present anywhere in the input, not created by the cut, survives the code-point split as its own
 * element and would still reach D1's `bind()` as an invalid string; replacing it with the Unicode
 * replacement character closes that same attacker-chosen-content-suppresses-its-own-row class the
 * maxima exist to close, rather than leaving it to whatever `bind()` does with it. `String(rawValue)`
 * itself is left free to throw here (a null-prototype object, a throwing or absent `toString`, or a
 * throwing Proxy get trap): the caller runs every call to this function inside its own try, so a
 * coercion failure lands there rather than needing its own handling in two places.
 */
function truncate(rawValue: unknown, max: number): string {
  const value = String(rawValue);
  const codePoints = Array.from(value);
  const cut =
    codePoints.length <= max
      ? value
      : codePoints.slice(0, Math.max(0, max - TRUNCATION_MARKER.length)).join('') + TRUNCATION_MARKER;
  return cut.replace(LONE_SURROGATE, '�');
}

/**
 * Build an `AdminActionAuditSink` (`./admin-action.js`) that persists every record to the
 * packaged `audit_log` table. A site opts in by applying `migrations/0002_audit.sql` and wiring
 * the returned function to `event.locals.cairnAuditSink`.
 *
 * The sink is fail-open end to end: it returns synchronously, before the insert settles, and a
 * failure anywhere in the attempt, a throwing coercion, a synchronous throw from `prepare`,
 * `bind`, or `waitUntil` itself, or a rejected insert, is caught and logged rather than left to
 * escape the caller. `adminAction` guards its own `ctx.audit` call too, so an escaping throw is
 * caught either way; this sink still catches its own, because only here is the failing stage known,
 * and a caller-level catch could report neither the `reason` nor the record it tried to persist.
 * Whichever path catches the failure logs the
 * truncated record (falling back to a placeholder for any field whose own coercion is what threw)
 * plus a `reason` distinguishing which stage failed (`coercion_failed`, `prepare_failed`,
 * `insert_rejected`, or `wait_until_failed`) and the error, as `audit.sink.write_failed`; only the
 * first of these to fire actually logs, since a `wait_until_failed` throw leaves the insert it was
 * meant to back still in flight; that insert's own later rejection would otherwise log a second,
 * redundant line for the same attempt. The audited action already completed by the time any of
 * this runs, so this is the only surviving record of the *persisted row*; the untruncated original
 * already logged as `admin.action.audited` (`./admin-action.js`) before this sink was ever called.
 * @param db - The D1 binding the packaged `audit_log` table lives in.
 * @param waitUntil - Required, and explicitly accepting `undefined`: an optional parameter would
 *   make the shortest call the one that silently drops the insert if the isolate tears down
 *   before it settles, so omitting it (passing `undefined`, typically because no
 *   `event.platform.ctx` is available) has to be a decision the caller makes on purpose, with the
 *   drop risk understood, rather than a default nobody chose. When supplied, it must already be
 *   bound to its owning `ExecutionContext` (`event.platform.ctx.waitUntil.bind(event.platform.ctx)`):
 *   `ExecutionContext.waitUntil`'s structural type matches this parameter, so passing the
 *   unbound method typechecks and then throws "Illegal invocation" in workerd, a failure this
 *   sink's own try/catch absorbs but that still silently drops the insert.
 */
export function createD1AuditSink(
  db: D1Database,
  waitUntil: ((promise: Promise<unknown>) => void) | undefined,
): AdminActionAuditSink {
  return (record: AdminActionAuditRecord) => {
    // Declared outside the try below, not inside it, so the catch can still log a recognizable
    // record even when the failure is a field's own coercion: a value that never finishes
    // truncating keeps this placeholder rather than the whole log line losing every field.
    let actor = UNCOERCIBLE_PLACEHOLDER;
    let action = UNCOERCIBLE_PLACEHOLDER;
    let entity = UNCOERCIBLE_PLACEHOLDER;
    // Reassigned to null, not this placeholder, whenever the record's own field is genuinely
    // absent (the `== null` checks below); this default only surfaces if that check's own
    // truncate() call throws before reassigning it.
    let entityId: string | null = UNCOERCIBLE_PLACEHOLDER;
    let detail: string | null = UNCOERCIBLE_PLACEHOLDER;
    // What the catch below reports, advanced as each stage of the try completes, so a failure is
    // triaged by where it happened: a coercion failure, a synchronous prepare()/bind() failure (no
    // insert was ever created), and waitUntil() itself throwing (the insert was already created
    // and is still running) are three different situations, not one.
    let failureReason = 'coercion_failed';
    let sinkFailedLogged = false;

    function logSinkFailed(reason: string) {
      return (error: unknown): void => {
        // A wait_until_failed throw leaves the dispatched insert's own .catch() still armed; if
        // that insert later rejects too, it would otherwise log a second, misleading line for
        // the same attempt. Only the first failure to reach this function logs.
        if (sinkFailedLogged) return;
        sinkFailedLogged = true;
        log.error('audit.sink.write_failed', {
          reason,
          editor: actor,
          action,
          entity,
          entityId,
          detail,
          error: error instanceof Error ? error.message : String(error),
        });
      };
    }

    try {
      actor = truncate(record.editor, MAX_ACTOR_LENGTH);
      action = truncate(record.action, MAX_ACTION_LENGTH);
      entity = truncate(record.entity, MAX_ENTITY_LENGTH);
      entityId = record.entityId == null ? null : truncate(record.entityId, MAX_ENTITY_ID_LENGTH);
      detail = record.detail == null ? null : truncate(record.detail, MAX_DETAIL_LENGTH);
      failureReason = 'prepare_failed';

      // Parameterized deliberately: never interpolate audit content into the SQL string, however
      // tempting a template-string simplification looks later.
      const insert = db
        .prepare(
          'INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(actor, action, entity, entityId, detail)
        .run()
        .catch(logSinkFailed('insert_rejected'));
      failureReason = 'wait_until_failed';

      waitUntil?.(insert);
    } catch (error) {
      logSinkFailed(failureReason)(error);
    }
  };
}
