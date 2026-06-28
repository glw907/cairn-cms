-- migrations/0001_principal.sql
-- Phase 1 of developer extensibility: sessions carry a trust tier, and the public login path
-- gets a per-IP rate-limit counter. Timestamps are epoch milliseconds.

-- A session's trust tier, set at mint time. admin:* scopes are granted only to an admin-tier
-- session whose email is in the editor allowlist; a member-tier session never reaches /admin.
-- Existing sessions predate members and were all editor logins, so they backfill to 'admin'.
ALTER TABLE session ADD COLUMN auth_tier TEXT NOT NULL DEFAULT 'admin'
  CHECK (auth_tier IN ('admin', 'member'));

-- Per-IP fixed-window counter for the now-public magic-link send. One row per (bucket, window).
CREATE TABLE auth_rate (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
