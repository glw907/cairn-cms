-- The developer's own table, not cairn's: it backs the custom /admin/signups screen mounted in
-- CairnAdminShell. Its own migrations directory, never the auth store's: `wrangler d1 migrations
-- apply` walks one directory per database, so two databases sharing one directory each receive the
-- other's schema.
CREATE TABLE signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);
