CREATE TABLE IF NOT EXISTS nav_menu (
  name TEXT PRIMARY KEY,
  tree_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
