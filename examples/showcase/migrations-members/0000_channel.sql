CREATE TABLE cairn_channel_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE cairn_channel_code (
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

CREATE TABLE cairn_channel_session (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE cairn_channel_budget (
  bucket TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  prev_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_cairn_channel_code_identity ON cairn_channel_code (identity);
CREATE INDEX idx_cairn_channel_code_expires ON cairn_channel_code (expires_at);
CREATE INDEX idx_cairn_channel_code_requester_bucket ON cairn_channel_code (requester_bucket);
CREATE INDEX idx_cairn_channel_session_subject ON cairn_channel_session (subject);
CREATE INDEX idx_cairn_channel_session_expires ON cairn_channel_session (expires_at);
CREATE INDEX idx_cairn_channel_budget_window ON cairn_channel_budget (window_start);

INSERT INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1');
