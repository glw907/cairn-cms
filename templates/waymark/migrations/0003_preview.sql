-- The share-a-draft preview token table (spec part 3, "Public preview for a non-editor"). Opt-in:
-- only a site that mints preview links (previewMint, ./sveltekit) ever touches this table.
-- `token_hash` follows `magic_token`'s idiom exactly, the lowercase hex SHA-256 digest of the
-- token (hashToken, src/lib/auth/crypto.ts); the plaintext token is never stored. `expires_at`
-- is epoch milliseconds, matching `magic_token` and `session`: SQLite compares across type
-- classes by class, so a TEXT expires_at column would never sweep and never expire against a
-- numeric bind. `concept`/`entry_id` name the draft the token shares; `editor` is the minting
-- editor's email, for the removal cascade in deleteEditor and removeOwnerIfNotLast.
CREATE TABLE preview_tokens (
  token_hash TEXT PRIMARY KEY,
  concept TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  editor TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- The sweep on mint (insertPreviewToken) reads by expires_at, the same no-cron idiom
-- idx_magic_token_email and idx_session_email back for their own tables. The revoke action and
-- the rename/delete/discard lifecycle cleanup both delete by (concept, entry_id); indexes are
-- free now and a second migration against every adopter later.
CREATE INDEX idx_preview_tokens_expires_at ON preview_tokens (expires_at);
CREATE INDEX idx_preview_tokens_concept_entry ON preview_tokens (concept, entry_id);
