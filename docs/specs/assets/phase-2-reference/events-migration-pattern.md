# The migration pattern (Fable, 2026-07-06) — worked instance: events.category

Every phase-2 schema change follows this shape. The worked instance is pass 2.1's first
migration: the shared category enum the C7 taxonomy needs on `events` (today: a free-text
`event_type` with no CHECK; 12 live rows: regatta 7, work_party 3, social 1, meeting 1).

## The four files per migration (numbered together, committed together)

**1. The migration** (`migrations/000X_events_category.sql`) — additive first, constrain
after backfill, never in one step:
```sql
-- Step A (this migration): the new column, nullable, no constraint yet.
ALTER TABLE events ADD COLUMN category TEXT;
-- Backfill from the existing taxonomy (the mapping IS the migration's judgment;
-- 'class' arrives via the classes table's synthesized rows, not here):
UPDATE events SET category = CASE event_type
  WHEN 'regatta'    THEN 'racing'
  WHEN 'work_party' THEN 'operations'
  WHEN 'social'     THEN 'social'
  WHEN 'meeting'    THEN 'governance'
  ELSE NULL END;
```
```sql
-- Step B (the FOLLOWING migration, after A verifies live): the constraint.
-- D1/SQLite can't ADD CHECK to an existing column; recreate-and-copy per the
-- standard 12-step, inside one transaction, indexes and FKs re-created verbatim.
```

**2. The verification script** (`migrations/verify/000X.sql` + a runner) — runs against
the REAL data before and after, and its output is the pass's evidence:
```sql
SELECT 'total', COUNT(*) FROM events;                      -- must equal pre-count (12)
SELECT 'unmapped', COUNT(*) FROM events WHERE category IS NULL;   -- must be 0 after A
SELECT category, COUNT(*) FROM events GROUP BY category ORDER BY 1;  -- eyeball vs the
  -- pre-migration event_type distribution (7/3/1/1 must re-appear re-labeled)
```

**3. The rollback** (`migrations/rollback/000X.sql`) — written BEFORE running forward,
tested on a staging copy: for A, `ALTER TABLE events DROP COLUMN category;`.

**4. The reader-version note** — which read surfaces touch the table (the asc-site
Season/events pages read EVENTS_DB), verified still-green after each step: additive A
changes nothing they select; the B recreate must preserve column order or the readers'
SELECTs must be column-named (they are; the pattern REQUIRES named columns in readers).

## The rules the instance demonstrates

- Additive, backfill, verify, THEN constrain — two migrations, never one.
- The mapping table (event_type -> category) lives in the migration file as the
  auditable judgment; no code-side remapping.
- Real-data verification with expected numbers written down BEFORE running.
- Rollbacks exist before forwards run; staging (asc-ops-staging) eats every migration
  first — it is a full schema clone for exactly this.
- ops keeps writing event_type until its events screens retire (2.1's cutover); the
  column drops only in a LATER migration after nothing reads it (the tidy).
