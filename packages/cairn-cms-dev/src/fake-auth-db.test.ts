import { expect, test } from 'vitest';
import { createFakeAuthDb } from './fake-auth-db.js';

// The store's findEditor read path: prepare the exact SQL, bind the email, read the first row. The
// double seeds editor@showcase.test as owner, so the seeded editor resolves through the same call
// the engine's auth store makes (src/lib/auth/store.ts).
const FIND_EDITOR = 'SELECT email, display_name, role FROM editor WHERE email = ?';

test('a seeded editor resolves through the store read path', async () => {
  const db = createFakeAuthDb();

  const row = await db
    .prepare(FIND_EDITOR)
    .bind('editor@showcase.test')
    .first<{ email: string; display_name: string; role: string }>();

  expect(row).toEqual({
    email: 'editor@showcase.test',
    display_name: 'Demo Editor',
    role: 'owner',
  });
});

test('an unseeded email resolves to null', async () => {
  const db = createFakeAuthDb();

  const row = await db.prepare(FIND_EDITOR).bind('nobody@showcase.test').first();

  expect(row).toBeNull();
});
