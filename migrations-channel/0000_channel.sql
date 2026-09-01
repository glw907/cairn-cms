-- The auth-channel factory's own D1 schema (`createAuthChannel`, @glw907/cairn-cms/auth-channel).
-- Apply it against the site's OWN channel binding, never AUTH_DB: a second audience's roster and
-- sessions live in a physically separate database. This directory is a sibling of cairn's own
-- migrations/, never a member of it, because a shared migrations_dir applies each database's
-- schema to the other the first time either is migrated.
--
-- Every statement is idempotent. A site that provisioned this schema by running the DDL directly,
-- before the engine packaged it, points a migrations_dir here and runs the ordinary
-- `wrangler d1 migrations apply`: the apply cannot abort on "table already exists", it changes
-- nothing, and it records the d1_migrations marker itself. Hand-inserting that marker stays the
-- fallback for an operator who must not run the migration runner at all.
--
-- identity_salt is deliberately absent: it is a per-deployment random value, and a file published
-- on npm and pinned byte for byte by a test cannot carry one, so provisionSalt writes it lazily on
-- first use.
--
-- requester_bucket on cairn_channel_code is what lets the live-row cap find "this requester's own
-- rows" without ever keying on identity, the rule the whole design exists to enforce.
CREATE TABLE IF NOT EXISTS cairn_channel_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cairn_channel_code (
  nonce_hash TEXT PRIMARY KEY,
  identity TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  subject TEXT,
  kind TEXT NOT NULL DEFAULT 'code',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  requester_bucket TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cairn_channel_session (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cairn_channel_budget (
  bucket TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  prev_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cairn_channel_code_identity ON cairn_channel_code (identity);
CREATE INDEX IF NOT EXISTS idx_cairn_channel_code_expires ON cairn_channel_code (expires_at);
CREATE INDEX IF NOT EXISTS idx_cairn_channel_code_requester_bucket ON cairn_channel_code (requester_bucket);
CREATE INDEX IF NOT EXISTS idx_cairn_channel_session_subject ON cairn_channel_session (subject);
CREATE INDEX IF NOT EXISTS idx_cairn_channel_session_expires ON cairn_channel_session (expires_at);
CREATE INDEX IF NOT EXISTS idx_cairn_channel_budget_window ON cairn_channel_budget (window_start);

INSERT OR IGNORE INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1');
