-- The packaged audit-log sink's table (seam 5, ASC's schema carried whole). Opt-in: only a site
-- that wires `createD1AuditSink` (./sveltekit) needs this migration; a site that never wires the
-- sink never touches this table. `actor` holds whatever string the writing wrapper supplies: an
-- editor email when written through `createD1AuditSink`, or a site's own identifier (a member id,
-- `'system'`) when a site writes through its own wrapper instead.
--
-- `AUTOINCREMENT` is deliberate, not a copied default: it costs an extra `sqlite_sequence` write
-- per insert, but it guarantees an id is never reused, an audit trail's whole point.
--
-- `created_at`'s format is the one deviation from "ASC's schema, carried whole" (design doc, Pass
-- two): ASC's original default is `datetime('now')`, a space-separated, second-resolution, no-`Z`
-- string. That string parses as LOCAL time under `new Date(...)` in a browser, and its second
-- resolution sorts several same-second audits non-deterministically. No site has applied this
-- migration yet, so the format is free to fix now and expensive to fix once two production sites
-- have; a later fix means a second migration against both. `strftime`'s ISO 8601 form is
-- unambiguous UTC at millisecond resolution, and this column exists to be read by people, not by
-- the engine, so an unambiguous timestamp is worth the deviation.
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The intended read patterns are by actor and by recency: `createSectionAction` audits every
-- authorization refusal before any binding resolution (see the reference page's warning to pair
-- this sink with a rate limit), so a refused caller can fill this table cheaply, and the first
-- query an operator reaches for is "what did this actor do" or "what happened recently". No site
-- has applied this migration yet, so adding these indexes now is free; adding them later means a
-- second migration against every site that already has.
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
CREATE INDEX idx_audit_log_actor ON audit_log (actor, created_at);
