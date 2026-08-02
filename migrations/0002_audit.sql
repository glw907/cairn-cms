-- The packaged audit-log sink's table (seam 5, ASC's schema carried whole). Opt-in: only a site
-- that wires `createD1AuditSink` (./sveltekit) needs this migration; a site that never wires the
-- sink never touches this table. `actor` holds whatever string the writing wrapper supplies: an
-- editor email when written through `createD1AuditSink`, or a site's own identifier (a member id,
-- `'system'`) when a site writes through its own wrapper instead. `created_at` is a human-readable
-- `datetime('now')` string here, deliberately unlike the auth tables' epoch-millisecond integers,
-- because this is ASC's proven schema and the column is read by people, not by the engine.
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
