// cairn-cms: the role-widening compile-only fixture (C2 Task 4, R1 - "role names are open;
// capabilities are closed"). Proves a site declaring a custom role name ('webmaster', outside
// the implicit owner/editor pair) assigns into every role-name position with zero casts, now
// that a role name types as `string` everywhere it appears and only `Capability` stays the
// closed `'owner' | 'editor' | 'none'` union. None of the functions below ever run; `npm run
// check` is the only gate that reads them, following the compile-only pattern in
// env-genericity.test.ts.
import { describe, it, expect } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { insertEditor, setEditorRole } from '../../lib/auth/store.js';
import type { Editor } from '../../lib/auth/types.js';
import type { AccessMap } from '../../lib/auth/access.js';
import type { NavLayoutEntry } from '../../lib/sveltekit/admin-nav.js';

// The one runtime assertion in this compile-only file, so vitest collects a real suite (see
// env-genericity.test.ts's own note on why an all-compile-only file needs this).
describe('role widening compile fixture', () => {
  it('exercises the store functions this fixture types against', () => {
    expect(typeof insertEditor).toBe('function');
    expect(typeof setEditorRole).toBe('function');
  });
});

/** Constructs an Editor with a custom role name, no cast. */
function customRoleEditor(): Editor {
  return { email: 'w@x.test', displayName: 'W', role: 'webmaster', capability: 'editor' };
}
void customRoleEditor;

/** Puts the custom role name in an AccessMap value, no cast. */
function customRoleAccessMap(): AccessMap {
  return { pages: ['webmaster'] };
}
void customRoleAccessMap;

/** Puts the custom role name in a NavLayoutEntry.roles array, no cast. */
function customRoleNavEntry(): NavLayoutEntry {
  return { label: 'Pages', icon: 'inbox', href: '/admin/pages', roles: ['webmaster'] };
}
void customRoleNavEntry;

/** Calls insertEditor and setEditorRole with the custom role name, no cast. */
async function customRoleStoreCalls(db: D1Database): Promise<void> {
  await insertEditor(db, 'w@x.test', 'W', 'webmaster', Date.now());
  await setEditorRole(db, 'w@x.test', 'webmaster');
}
void customRoleStoreCalls;
