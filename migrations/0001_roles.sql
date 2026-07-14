-- Drop the role CHECK constraint (spec section 7). SQLite has no
-- ALTER TABLE DROP CONSTRAINT, so this rebuilds the table via the
-- create-copy-drop-rename sequence, inside the migration's implicit
-- transaction. Role validity moves to the app layer from here on,
-- validated against the site's declared role vocabulary.
CREATE TABLE editor_new (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO editor_new (email, display_name, role, created_at)
SELECT email, display_name, role, created_at FROM editor;

DROP TABLE editor;

ALTER TABLE editor_new RENAME TO editor;
