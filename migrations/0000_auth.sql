-- Self-owned magic-link auth on D1 (spec 7.1). Timestamps are epoch milliseconds.
CREATE TABLE editor (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  created_at INTEGER NOT NULL
);

CREATE TABLE magic_token (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_magic_token_email ON magic_token (email);
CREATE INDEX idx_session_email ON session (email);

-- No index on session.expires_at or magic_token.expires_at backs their login-time sweeps
-- (auth/store.ts's createSession and issueToken): both scan the full table on every login, but an
-- editor roster is small enough that a full-table scan is negligible, and adding the index later
-- is a hand-applied migration a consumer runs themselves (docs/extend/upgrade-cairn.md), not
-- worth asking for at this scale. magic_token's own sweep combines the email equality with the
-- expires_at range under OR, which would defeat idx_magic_token_email even if expires_at carried
-- an index of its own. migrations/0003_preview.sql indexes the identical expires_at-sweep idiom
-- for preview_tokens instead, the deliberate counter-example this ruling does not extend to.
-- Reopen if editor rosters stop being small.
