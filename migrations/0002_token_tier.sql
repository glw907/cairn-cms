-- migrations/0002_token_tier.sql
-- The magic-link send is now open to any email, not just allowlisted editors, so the token row
-- carries the server-authoritative trust tier and the validated post-login redirect target. Both
-- ride the token, never the confirm URL, so neither is attacker-controllable. Timestamps stay
-- epoch milliseconds.

-- The tier the confirmed session inherits. Existing tokens predate members and were editor logins,
-- so they backfill to 'admin'.
ALTER TABLE magic_token ADD COLUMN tier TEXT NOT NULL DEFAULT 'admin';

-- The validated same-origin path the confirm handler redirects to, or null for the tier default.
ALTER TABLE magic_token ADD COLUMN redirect_to TEXT;
