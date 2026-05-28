# Pass L: Navigation-tree management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give editors a D1-backed UI at `/admin/nav` to manage each site's nestable header navigation, read at runtime by the public layout, and refine the two-tier roles into capability checks so creating pages and managing nav are owner-only.

**Architecture:** The engine (`@glw907/cairn-cms`) owns a capability matrix, the nav tree type + validation, a raw-D1 nav store, the `navLoad`/`navSave` server functions, and a DaisyUI `NavTree` editor component. Each site adds a byte-identical `/admin/nav` shim, a `nav_menu` table in its existing `AUTH_DB`, a seed of its current nav, and a runtime nav read in its root layout (which de-prerenders the layout). Nav is returned as data; each site renders it with its own header markup.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Cloudflare Workers + D1, better-auth (access-control plugin), DaisyUI, vitest + better-sqlite3.

---

## File structure

**Engine (`/home/glw907/Projects/cairn/cairn-cms`):**
- Create `src/lib/auth/capabilities.ts`: capability matrix + `can`/`requireCapability`.
- Create `src/lib/nav.ts`: `NavNode` type, `validateNavTree`, raw-D1 store (`readNavTree`/`writeNavTree`), `loadNav`.
- Modify `src/lib/auth/index.ts`: re-export the capability surface.
- Modify `src/lib/index.ts`: re-export `nav.ts`.
- Modify `src/lib/adapter.ts`: add `navMenus?` field + `NavMenuConfig`.
- Modify `src/lib/sveltekit/index.ts`: `navLoad`/`navSave`; capability gating in `createEntry`; `canCreate` in `collectionListLoad`; `navMenus`/`canManageNav` in `adminLayoutLoad`.
- Create `src/lib/components/NavTree.svelte` + re-export from `src/lib/components/index.ts`.
- Modify `src/lib/components/AdminLayout.svelte` + `CollectionList.svelte`: gated affordances.
- Create `migrations/0001_nav_menu.sql`: canonical table (also feeds the test harness).
- Tests: `src/tests/capabilities.test.ts`, `src/tests/nav.test.ts`, new cases in `src/tests/sveltekit.test.ts`.

**Both sites (`ecnordic-ski`, `907-life`):**
- Create `drizzle/migrations/0001_nav_menu.sql` (copy of the canonical one).
- Create `src/routes/admin/nav/+page.server.ts` + `+page.svelte`.
- Modify `src/routes/+layout.server.ts` (prerender flip + nav load), `src/routes/+layout.svelte` (pass nav), `src/lib/components/Nav.svelte` (render `navItems`).
- Modify `src/lib/cairn.config.ts` (add `navMenus`).

---

## Task 1: Capability matrix (`can` / `requireCapability`)

**Files:**
- Create: `src/lib/auth/capabilities.ts`
- Modify: `src/lib/auth/index.ts`
- Test: `src/tests/capabilities.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/capabilities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { can, requireCapability } from '../lib/auth/capabilities';
import type { CairnUser } from '../lib/auth/guard';

const owner: CairnUser = { id: '1', email: 'o@x', name: 'O', role: 'owner' };
const editor: CairnUser = { id: '2', email: 'e@x', name: 'E', role: 'editor' };

describe('can', () => {
  it('grants an owner every capability', () => {
    for (const cap of ['story:create', 'story:edit', 'page:edit', 'page:create', 'nav:manage', 'user:manage'] as const) {
      expect(can(owner, cap)).toBe(true);
    }
  });

  it('grants an editor only the content subset', () => {
    expect(can(editor, 'story:create')).toBe(true);
    expect(can(editor, 'story:edit')).toBe(true);
    expect(can(editor, 'page:edit')).toBe(true);
    expect(can(editor, 'page:create')).toBe(false);
    expect(can(editor, 'nav:manage')).toBe(false);
    expect(can(editor, 'user:manage')).toBe(false);
  });

  it('denies a null (signed-out) user everything', () => {
    expect(can(null, 'story:edit')).toBe(false);
  });
});

describe('requireCapability', () => {
  it('returns the user when allowed', () => {
    expect(requireCapability(owner, 'nav:manage')).toBe(owner);
  });

  it('throws 401 when signed out', () => {
    try {
      requireCapability(null, 'story:edit');
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(401);
    }
  });

  it('throws 403 when the role lacks the capability', () => {
    try {
      requireCapability(editor, 'nav:manage');
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- capabilities`
Expected: FAIL, cannot resolve `../lib/auth/capabilities`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth/capabilities.ts`:

```ts
// cairn-core: capability checks. Management surfaces gate on a capability, not on a role name,
// so the two-tier owner/editor model can grow finer capabilities (and a future role) additively.
// Creating a page and changing the nav are structural acts, so they sit with owner; editing a
// page's content and running the story feed are everyday editor work.
import { error } from '@sveltejs/kit';
import type { CairnUser } from './guard';

export type Capability =
  | 'story:create'
  | 'story:edit'
  | 'page:edit'
  | 'page:create'
  | 'nav:manage'
  | 'user:manage';

// One source of truth. `'all'` means every capability; otherwise the explicit grant list. A future
// `manager` role is one more row here, no call-site changes.
const CAPS_BY_ROLE: Record<CairnUser['role'], readonly Capability[] | 'all'> = {
  owner: 'all',
  editor: ['story:create', 'story:edit', 'page:edit'],
};

/** Does this user hold the capability? A signed-out (null) user holds nothing. */
export function can(user: CairnUser | null, cap: Capability): boolean {
  if (!user) return false;
  const grants = CAPS_BY_ROLE[user.role];
  return grants === 'all' || grants.includes(cap);
}

/** Assert the capability for a route load/action: 401 when signed out, 403 when under-privileged. */
export function requireCapability(user: CairnUser | null, cap: Capability): CairnUser {
  if (!user) throw error(401, 'Not signed in');
  if (!can(user, cap)) throw error(403, 'You do not have permission to do that');
  return user;
}
```

- [ ] **Step 4: Re-export from the auth barrel**

In `src/lib/auth/index.ts`, append:

```ts
export { can, requireCapability, type Capability } from './capabilities';
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- capabilities`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/capabilities.ts src/lib/auth/index.ts src/tests/capabilities.test.ts
git commit -m "feat(auth): add capability matrix (can/requireCapability)"
```

---

## Task 2: Nav tree type + validation

**Files:**
- Create: `src/lib/nav.ts`
- Test: `src/tests/nav.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateNavTree, NavValidationError, type NavNode } from '../lib/nav';

describe('validateNavTree', () => {
  it('accepts a flat list', () => {
    const tree: NavNode[] = [{ label: 'Home', url: '/' }, { label: 'About', url: '/about' }];
    expect(validateNavTree(tree, 2)).toEqual(tree);
  });

  it('accepts nesting within the depth cap and a label-only parent', () => {
    const tree = [{ label: 'About', children: [{ label: 'Team', url: '/about/team' }] }];
    expect(validateNavTree(tree, 2)).toEqual(tree);
  });

  it('rejects nesting past the depth cap', () => {
    const tree = [{ label: 'A', children: [{ label: 'B', children: [{ label: 'C', url: '/c' }] }] }];
    expect(() => validateNavTree(tree, 2)).toThrow(NavValidationError);
  });

  it('rejects a node with an empty label', () => {
    expect(() => validateNavTree([{ label: '  ', url: '/x' }], 2)).toThrow(NavValidationError);
  });

  it('rejects a non-array root', () => {
    expect(() => validateNavTree({ label: 'x' }, 2)).toThrow(NavValidationError);
  });

  it('rejects more nodes than the cap', () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ label: `n${i}`, url: `/${i}` }));
    expect(() => validateNavTree(many, 2)).toThrow(NavValidationError);
  });

  it('strips unknown keys and normalizes a missing url to undefined', () => {
    const dirty = [{ label: 'Home', url: '/', extra: 'x' } as unknown];
    expect(validateNavTree(dirty, 2)).toEqual([{ label: 'Home', url: '/' }]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- nav`
Expected: FAIL, cannot resolve `../lib/nav`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/nav.ts` (validation half only for now):

```ts
// cairn-core: the navigation tree. Stored per named menu in D1 (see the store functions below)
// and read at runtime by the public layout via `loadNav`. The engine returns data only; each site
// renders the tree with its own header markup.

/** One navigation node. `url` omitted/empty is a label-only grouping header; `children` omitted is a leaf. */
export interface NavNode {
  label: string;
  url?: string;
  children?: NavNode[];
}

/** Total node cap across the whole tree, a guard against a runaway payload. */
export const MAX_NAV_NODES = 200;

export class NavValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavValidationError';
  }
}

/**
 * Validate and normalize an untrusted value into a NavNode[]: arrays only, non-empty labels,
 * depth within `maxDepth` (1 = flat), bounded node count, and only the three known keys kept.
 * Throws NavValidationError on any violation. Used by `navSave` before writing.
 */
export function validateNavTree(value: unknown, maxDepth: number): NavNode[] {
  let count = 0;

  function walk(nodes: unknown, depth: number): NavNode[] {
    if (!Array.isArray(nodes)) throw new NavValidationError('Navigation must be a list of items');
    if (depth > maxDepth) throw new NavValidationError(`Navigation is nested deeper than ${maxDepth} levels`);
    return nodes.map((raw) => {
      if (typeof raw !== 'object' || raw === null) throw new NavValidationError('Each item must be an object');
      const item = raw as Record<string, unknown>;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) throw new NavValidationError('Each item needs a label');
      if (++count > MAX_NAV_NODES) throw new NavValidationError('Too many navigation items');
      const node: NavNode = { label };
      if (typeof item.url === 'string' && item.url.trim()) node.url = item.url.trim();
      if (item.children !== undefined) {
        const children = walk(item.children, depth + 1);
        if (children.length) node.children = children;
      }
      return node;
    });
  }

  return walk(value, 1);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm test -- nav`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/tests/nav.test.ts
git commit -m "feat(nav): add nav tree type + validateNavTree"
```

---

## Task 3: Nav D1 store + `loadNav`

**Files:**
- Modify: `src/lib/nav.ts`
- Modify: `src/lib/index.ts`
- Test: `src/tests/nav.test.ts`

- [ ] **Step 1: Add the failing store test**

Append to `src/tests/nav.test.ts`:

```ts
import Database from 'better-sqlite3';
import { readNavTree, writeNavTree, loadNav } from '../lib/nav';

// A minimal D1Database-shaped shim over better-sqlite3 so the async D1 store contract can be
// exercised in-process (the same "real SQLite" approach the auth integration test uses).
function d1(sqlite: import('better-sqlite3').Database) {
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let args: unknown[] = [];
      const api = {
        bind(...a: unknown[]) { args = a; return api; },
        async first<T>() { return (stmt.get(...args) as T) ?? null; },
        async run() { stmt.run(...args); return { success: true }; },
      };
      return api;
    },
  } as unknown as import('@cloudflare/workers-types').D1Database;
}

function freshDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE nav_menu (name TEXT PRIMARY KEY, tree_json TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  return d1(sqlite);
}

describe('nav D1 store', () => {
  it('writes then reads a tree back', async () => {
    const db = freshDb();
    const tree = [{ label: 'Home', url: '/' }];
    await writeNavTree(db, 'primary', tree);
    expect(await readNavTree(db, 'primary')).toEqual(tree);
  });

  it('upserts (a second write replaces the first)', async () => {
    const db = freshDb();
    await writeNavTree(db, 'primary', [{ label: 'A', url: '/a' }]);
    await writeNavTree(db, 'primary', [{ label: 'B', url: '/b' }]);
    expect(await readNavTree(db, 'primary')).toEqual([{ label: 'B', url: '/b' }]);
  });

  it('readNavTree returns null for an absent menu', async () => {
    expect(await readNavTree(freshDb(), 'missing')).toBeNull();
  });

  it('loadNav returns [] when the binding is absent', async () => {
    expect(await loadNav({}, 'primary')).toEqual([]);
  });

  it('loadNav returns [] for an absent menu and a parsed tree when present', async () => {
    const db = freshDb();
    expect(await loadNav({ AUTH_DB: db }, 'primary')).toEqual([]);
    await writeNavTree(db, 'primary', [{ label: 'Home', url: '/' }]);
    expect(await loadNav({ AUTH_DB: db }, 'primary')).toEqual([{ label: 'Home', url: '/' }]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- nav`
Expected: FAIL, `readNavTree`/`writeNavTree`/`loadNav` not exported.

- [ ] **Step 3: Add the store + loadNav to `src/lib/nav.ts`**

Append to `src/lib/nav.ts`:

```ts
import type { D1Database } from '@cloudflare/workers-types';

/** Worker binding the nav store reads (a structural subset of `Platform.env`). */
export interface NavEnv {
  AUTH_DB?: D1Database;
}

/** Generous depth cap for trusting an already-validated stored tree on the public read path. */
const READ_DEPTH_CAP = 10;

/** Read the raw tree for a menu, or null when the row is absent. */
export async function readNavTree(db: D1Database, name: string): Promise<NavNode[] | null> {
  const row = await db
    .prepare('SELECT tree_json FROM nav_menu WHERE name = ?')
    .bind(name)
    .first<{ tree_json: string }>();
  if (!row) return null;
  return validateNavTree(JSON.parse(row.tree_json), READ_DEPTH_CAP);
}

/** Upsert a menu's tree. The caller validates against the menu's own maxDepth first. */
export async function writeNavTree(db: D1Database, name: string, tree: NavNode[]): Promise<void> {
  await db
    .prepare(
      'INSERT INTO nav_menu (name, tree_json, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(name) DO UPDATE SET tree_json = excluded.tree_json, updated_at = excluded.updated_at',
    )
    .bind(name, JSON.stringify(tree), Date.now())
    .run();
}

/**
 * Public read for the site layout. Returns [] (never throws) when the binding or row is missing or
 * the stored JSON is unreadable, so a nav problem degrades to an empty header rather than a 500.
 */
export async function loadNav(env: NavEnv, name: string): Promise<NavNode[]> {
  if (!env.AUTH_DB) return [];
  try {
    return (await readNavTree(env.AUTH_DB, name)) ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Re-export from the package barrel**

In `src/lib/index.ts`, append:

```ts
export * from './nav';
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npm test -- nav`
Expected: PASS (all nav tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav.ts src/lib/index.ts src/tests/nav.test.ts
git commit -m "feat(nav): add D1 nav store + loadNav public read"
```

---

## Task 4: Adapter `navMenus` field

**Files:**
- Modify: `src/lib/adapter.ts`

- [ ] **Step 1: Add the config type + field**

In `src/lib/adapter.ts`, add the interface above `CairnAdapter`:

```ts
/** A managed navigation menu. `maxDepth` defaults to 2 (a parent plus one level of children). */
export interface NavMenuConfig {
  /** Storage key + nav_menu row name, e.g. 'primary'. */
  name: string;
  /** Sidebar/admin label for the menu. */
  label: string;
  /** Max nesting depth allowed in the editor (1 = flat). Defaults to 2. */
  maxDepth?: number;
}
```

Then add this field to the `CairnAdapter` interface (after `registry?`):

```ts
  /**
   * Navigation menus this site manages from `/admin/nav` (R3/Pass L). Stored in D1 and read at
   * runtime by the site layout via `loadNav`. Omit (or supply an empty array) to hide the nav
   * surface, the same opt-in shape as `registry`.
   */
  navMenus?: NavMenuConfig[];
```

- [ ] **Step 2: Typecheck the package**

Run: `npm run package`
Expected: `svelte-package` completes with no type error (the new field is optional, so existing adapters still satisfy the interface).

- [ ] **Step 3: Commit**

```bash
git add src/lib/adapter.ts
git commit -m "feat(adapter): add optional navMenus field"
```

---

## Task 5: Page-create gating + `canCreate`

**Files:**
- Modify: `src/lib/sveltekit/index.ts`
- Modify: `src/lib/components/CollectionList.svelte`
- Test: `src/tests/sveltekit.test.ts`

- [ ] **Step 1: Add the failing tests**

In `src/tests/sveltekit.test.ts`, add an owner/editor fixture near the top (after the `adapter` fixture):

```ts
import type { CairnUser } from '../lib/auth/guard';
const owner: CairnUser = { id: '1', email: 'o@x', name: 'O', role: 'owner' };
const editor: CairnUser = { id: '2', email: 'e@x', name: 'E', role: 'editor' };
```

Then the tests:

```ts
describe('createEntry capability gating', () => {
  it('blocks an editor from creating a page (403)', async () => {
    const event = {
      params: { collection: 'pages' },
      locals: { user: editor },
      request: new Request('http://x/admin/pages?', { method: 'POST', body: new FormData() }),
      platform: { env: {} },
    };
    try {
      await createEntry(event as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });

  it('lets an editor create a story (redirects to the editor)', async () => {
    const form = new FormData();
    form.set('id', 'my-post');
    mockFetch([{ match: '/contents/src/content/posts/my-post.md', body: 'not found', status: 404 }]);
    const event = {
      params: { collection: 'posts' },
      locals: { user: editor },
      request: new Request('http://x/admin/posts?', { method: 'POST', body: form }),
      platform: { env: {} },
    };
    try {
      await createEntry(event as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});

describe('collectionListLoad canCreate', () => {
  it('is false for an editor on a page collection', async () => {
    mockFetch([{ match: '/contents/src/content/pages', body: JSON.stringify([]) }]);
    const data = await collectionListLoad(
      { params: { collection: 'pages' }, url: new URL('http://x/admin/pages'), locals: { user: editor }, platform: { env: {} } } as never,
      adapter,
    );
    expect(data.canCreate).toBe(false);
  });

  it('is true for an editor on a story collection', async () => {
    mockFetch([{ match: '/contents/src/content/posts', body: JSON.stringify([]) }]);
    const data = await collectionListLoad(
      { params: { collection: 'posts' }, url: new URL('http://x/admin/posts'), locals: { user: editor }, platform: { env: {} } } as never,
      adapter,
    );
    expect(data.canCreate).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- sveltekit`
Expected: FAIL (`canCreate` missing; editor page-create not yet blocked).

- [ ] **Step 3: Gate `createEntry`**

In `src/lib/sveltekit/index.ts`, add the import at the top:

```ts
import { can, requireCapability } from '../auth/capabilities';
```

In `createEntry`, replace the opening guard:

```ts
  if (!event.locals.user) throw error(401, 'Not signed in');
  const collection = findCollection(adapter, event.params.collection);
  if (!collection) throw error(404, 'Unknown collection');
```

with:

```ts
  const collection = findCollection(adapter, event.params.collection);
  if (!collection) throw error(404, 'Unknown collection');
  const kind = collection.kind ?? 'story';
  requireCapability(event.locals.user, kind === 'page' ? 'page:create' : 'story:create');
```

Then delete the now-duplicate `const kind = collection.kind ?? 'story';` line lower in the function (it is computed once above now).

- [ ] **Step 4: Add `canCreate` to `collectionListLoad`**

In `src/lib/sveltekit/index.ts`, extend the `CollectionListData` interface with:

```ts
  /** Whether the viewer may create an entry in this collection (page-create is owner-only). */
  canCreate: boolean;
```

Change the `collectionListLoad` event type to include locals:

```ts
export async function collectionListLoad(
  event: PlatformEvent & { params: { collection: string }; url: URL; locals: { user: CairnUser | null } },
  adapter: CairnAdapter,
): Promise<CollectionListData> {
```

After `const collection = findCollection(...)` and the 404 throw, compute the flag once:

```ts
  const kind = collection.kind ?? 'story';
  const canCreate = can(event.locals.user, kind === 'page' ? 'page:create' : 'story:create');
```

Add `canCreate` (and reuse `kind`) to BOTH returned objects in this function (the catch-branch fallback and the success return). The success return becomes:

```ts
  return {
    type: collection.type,
    label: collection.label,
    kind,
    entries,
    canCreate,
    formError,
  };
```

The catch-branch return gains `kind` and `canCreate` likewise (replace its inline `kind: collection.kind ?? 'story'` with `kind` and add `canCreate`).

- [ ] **Step 5: Hide the create form for `canCreate === false`**

In `src/lib/components/CollectionList.svelte`, wrap the "New entry" create form block in:

```svelte
{#if data.canCreate}
  <!-- existing New entry form markup -->
{/if}
```

(Locate the existing create `<form method="POST" action="?/create">` block and wrap exactly that block.)

- [ ] **Step 6: Run tests**

Run: `npm test -- sveltekit`
Expected: PASS, including the four new cases. Then `npm test` (full suite). Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sveltekit/index.ts src/lib/components/CollectionList.svelte src/tests/sveltekit.test.ts
git commit -m "feat(sveltekit): gate page creation on capability; expose canCreate"
```

---

## Task 6: `navLoad` / `navSave` server functions

**Files:**
- Modify: `src/lib/sveltekit/index.ts`
- Test: `src/tests/sveltekit.test.ts`

- [ ] **Step 1: Add the failing tests**

In `src/tests/sveltekit.test.ts`, add a nav-capable adapter, a D1 shim, and tests:

```ts
import Database from 'better-sqlite3';
import { navLoad, navSave } from '../lib/sveltekit';

const navAdapter: CairnAdapter = { ...adapter, navMenus: [{ name: 'primary', label: 'Main menu', maxDepth: 2 }] };

function navDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec('CREATE TABLE nav_menu (name TEXT PRIMARY KEY, tree_json TEXT NOT NULL, updated_at INTEGER NOT NULL)');
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let args: unknown[] = [];
      const api = {
        bind(...a: unknown[]) { args = a; return api; },
        async first<T>() { return (stmt.get(...args) as T) ?? null; },
        async run() { stmt.run(...args); return { success: true }; },
      };
      return api;
    },
  } as never;
}

describe('navLoad', () => {
  it('denies an editor (403)', async () => {
    try {
      await navLoad({ locals: { user: editor }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });

  it('returns the menu config + empty tree for an owner', async () => {
    mockFetch([{ match: '/contents/src/content/pages', body: JSON.stringify([]) }]);
    const data = await navLoad(
      { locals: { user: owner }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never,
      navAdapter,
    );
    expect(data.menu).toEqual({ name: 'primary', label: 'Main menu', maxDepth: 2 });
    expect(data.tree).toEqual([]);
    expect(Array.isArray(data.pages)).toBe(true);
  });

  it('404s when the site declares no navMenus', async () => {
    try {
      await navLoad({ locals: { user: owner }, url: new URL('http://x/admin/nav'), platform: { env: { AUTH_DB: navDb() } } } as never, adapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(404);
    }
  });
});

describe('navSave', () => {
  it('validates, writes, and redirects to ?saved=1 for an owner', async () => {
    const db = navDb();
    const form = new FormData();
    form.set('tree', JSON.stringify([{ label: 'Home', url: '/' }]));
    try {
      await navSave({ locals: { user: owner }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: db } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e) && e.location).toBe('/admin/nav?saved=1');
    }
  });

  it('redirects to ?error= on an invalid tree', async () => {
    const form = new FormData();
    form.set('tree', JSON.stringify([{ label: '' }]));
    try {
      await navSave({ locals: { user: owner }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isRedirect(e) && String(e.location).startsWith('/admin/nav?error=')).toBe(true);
    }
  });

  it('denies an editor (403)', async () => {
    const form = new FormData();
    form.set('tree', JSON.stringify([]));
    try {
      await navSave({ locals: { user: editor }, request: new Request('http://x/admin/nav', { method: 'POST', body: form }), platform: { env: { AUTH_DB: navDb() } } } as never, navAdapter);
      expect.unreachable();
    } catch (e) {
      expect(isHttpError(e) && e.status).toBe(403);
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- sveltekit`
Expected: FAIL, `navLoad`/`navSave` not exported.

- [ ] **Step 3: Implement `navLoad`/`navSave`**

In `src/lib/sveltekit/index.ts`, add the import:

```ts
import { readNavTree, writeNavTree, validateNavTree, type NavNode } from '../nav';
```

Extend `AdminEnv` with the D1 binding:

```ts
export interface AdminEnv {
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY_B64?: string;
  AUTH_DB?: import('@cloudflare/workers-types').D1Database;
}
```

Add this section near the end of the file:

```ts
// ── /admin/nav (navigation tree) ───────────────────────────────────────────

/** A page the picker can insert: its display label and the URL the nav item points at. */
export interface NavPageOption {
  label: string;
  url: string;
}

export interface NavLoadData {
  menu: { name: string; label: string; maxDepth: number };
  tree: NavNode[];
  pages: NavPageOption[];
  saved: boolean;
  error: string | null;
}

/** List page-collection entries for the picker (one directory listing per page collection). */
async function navPageOptions(adapter: CairnAdapter, env: AdminEnv | undefined): Promise<NavPageOption[]> {
  const token = await readToken(env);
  const pageCollections = adapter.collections.filter((c) => (c.kind ?? 'story') === 'page');
  const lists = await Promise.all(
    pageCollections.map(async (c) => {
      try {
        const files = await listMarkdown(adapter.backend, c.dir, token);
        return files.map((f): NavPageOption => ({ label: f.id, url: `/${f.id}` }));
      } catch {
        return [];
      }
    }),
  );
  return lists.flat();
}

export async function navLoad(
  event: PlatformEvent & { locals: { user: CairnUser | null }; url: URL },
  adapter: CairnAdapter,
): Promise<NavLoadData> {
  requireCapability(event.locals.user, 'nav:manage');
  const config = adapter.navMenus?.[0];
  if (!config) throw error(404, 'No navigation menu configured');
  const menu = { name: config.name, label: config.label, maxDepth: config.maxDepth ?? 2 };

  const db = event.platform?.env?.AUTH_DB;
  let tree: NavNode[] = [];
  if (db) {
    try {
      tree = (await readNavTree(db, menu.name)) ?? [];
    } catch {
      tree = [];
    }
  }
  return {
    menu,
    tree,
    pages: await navPageOptions(adapter, event.platform?.env),
    saved: event.url.searchParams.get('saved') === '1',
    error: event.url.searchParams.get('error'),
  };
}

export async function navSave(
  event: PlatformEvent & { locals: { user: CairnUser | null }; request: Request },
  adapter: CairnAdapter,
): Promise<never> {
  requireCapability(event.locals.user, 'nav:manage');
  const config = adapter.navMenus?.[0];
  if (!config) throw error(404, 'No navigation menu configured');
  const maxDepth = config.maxDepth ?? 2;

  const db = event.platform?.env?.AUTH_DB;
  if (!db) throw error(500, 'AUTH_DB (D1) binding is required');

  const form = await event.request.formData();
  let tree: NavNode[];
  try {
    tree = validateNavTree(JSON.parse(String(form.get('tree') ?? '[]')), maxDepth);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid navigation';
    throw redirect(303, `/admin/nav?error=${encodeURIComponent(message)}`);
  }
  await writeNavTree(db, config.name, tree);
  throw redirect(303, '/admin/nav?saved=1');
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- sveltekit` then `npm test`
Expected: PASS (all nav server-fn cases); full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(sveltekit): add navLoad/navSave server functions"
```

---

## Task 7: AdminLayout nav entry + `adminLayoutLoad` capability/menus

**Files:**
- Modify: `src/lib/sveltekit/index.ts`
- Modify: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/sveltekit.test.ts`

- [ ] **Step 1: Add the failing test**

In `src/tests/sveltekit.test.ts`:

```ts
describe('adminLayoutLoad nav surface', () => {
  it('exposes navMenus + canManageNav=true for an owner', () => {
    const data = adminLayoutLoad({ locals: { user: owner }, url: new URL('http://x/admin/posts') } as never, navAdapter);
    expect(data.navMenus).toEqual([{ name: 'primary', label: 'Main menu' }]);
    expect(data.canManageNav).toBe(true);
  });

  it('canManageNav=false for an editor', () => {
    const data = adminLayoutLoad({ locals: { user: editor }, url: new URL('http://x/admin/posts') } as never, navAdapter);
    expect(data.canManageNav).toBe(false);
  });

  it('navMenus is [] when the adapter declares none', () => {
    const data = adminLayoutLoad({ locals: { user: owner }, url: new URL('http://x/admin/posts') } as never, adapter);
    expect(data.navMenus).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- sveltekit`
Expected: FAIL, `navMenus`/`canManageNav` not on the returned object.

- [ ] **Step 3: Extend `adminLayoutLoad`**

In `src/lib/sveltekit/index.ts`, extend `AdminLayoutData`:

```ts
  /** Managed menus (name+label only) so the shell can show a Navigation entry. */
  navMenus: { name: string; label: string }[];
  /** Whether the viewer may manage navigation (gates the Navigation nav entry). */
  canManageNav: boolean;
```

Update the `adminLayoutLoad` return:

```ts
  return {
    user: event.locals.user,
    siteName: adapter.siteName,
    pathname: event.url.pathname,
    collections: adapter.collections.map(({ type, label }) => ({ type, label })),
    navMenus: (adapter.navMenus ?? []).map(({ name, label }) => ({ name, label })),
    canManageNav: can(event.locals.user, 'nav:manage'),
  };
```

- [ ] **Step 4: Add the nav entry to `AdminLayout.svelte`**

In `src/lib/components/AdminLayout.svelte`, add the two new fields to the `data` prop type annotation (alongside `collections`):

```ts
      navMenus: { name: string; label: string }[];
      canManageNav: boolean;
```

In the `$derived` nav array, insert a Navigation entry between the collections map and the Editors entry:

```ts
  const nav = $derived<NavItem[]>([
    ...data.collections.map((collection) => ({
      href: `/admin/${collection.type}`,
      label: collection.label,
      active: data.pathname === `/admin/${collection.type}`,
    })),
    ...(data.canManageNav && data.navMenus.length
      ? [{ href: '/admin/nav', label: 'Navigation', active: data.pathname.startsWith('/admin/nav') }]
      : []),
    {
      href: '/admin/admins',
      label: 'Editors',
      owner: true,
      active: data.pathname.startsWith('/admin/admins'),
    },
  ]);
```

(The existing `visibleNav` filter on `item.owner` is unchanged; the Navigation entry carries no `owner` flag because `canManageNav` already decided its visibility.)

- [ ] **Step 5: Run tests + package**

Run: `npm test -- sveltekit` then `npm run package`
Expected: tests PASS; `svelte-package` clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sveltekit/index.ts src/lib/components/AdminLayout.svelte src/tests/sveltekit.test.ts
git commit -m "feat(sveltekit): surface a Navigation nav entry for managers"
```

---

## Task 8: `NavTree.svelte` editor component

**Files:**
- Create: `src/lib/components/NavTree.svelte`
- Modify: `src/lib/components/index.ts`

- [ ] **Step 1: Create the component**

Create `src/lib/components/NavTree.svelte`:

```svelte
<script lang="ts">
  // The navigation tree editor (Pass L). Edits a local copy of the menu tree and posts the whole
  // tree as JSON to the `save` action. DaisyUI primitives under the Warm Stone admin theme. Drag a
  // row up or down to reorder within its level; use Indent/Outdent to nest under the previous
  // sibling or promote a level (capped at the menu's maxDepth). The engine validates on save.
  import type { NavLoadData } from '../sveltekit';
  import type { NavNode } from '../nav';

  let { data }: { data: NavLoadData } = $props();

  // A flat, ordered working model is far simpler to drag-edit than a recursive one: each row
  // carries an explicit depth, and the tree is rebuilt from (order + depth) only at submit time.
  interface Row {
    id: number;
    depth: number;
    label: string;
    url: string;
  }

  let nextId = 1;
  function flatten(nodes: NavNode[], depth: number, out: Row[]): Row[] {
    for (const n of nodes) {
      out.push({ id: nextId++, depth, label: n.label, url: n.url ?? '' });
      if (n.children?.length) flatten(n.children, depth + 1, out);
    }
    return out;
  }

  let rows = $state<Row[]>(flatten(data.tree, 0, []));
  const maxDepthIndex = $derived(data.menu.maxDepth - 1); // depth is 0-based here

  // Rebuild the nested tree from the flat rows by depth, then serialize for the hidden field.
  function toTree(list: Row[]): NavNode[] {
    const root: NavNode[] = [];
    const stack: { depth: number; node: NavNode }[] = [];
    for (const r of list) {
      const node: NavNode = { label: r.label.trim() };
      if (r.url.trim()) node.url = r.url.trim();
      while (stack.length && stack[stack.length - 1].depth >= r.depth) stack.pop();
      if (stack.length) (stack[stack.length - 1].node.children ??= []).push(node);
      else root.push(node);
      stack.push({ depth: r.depth, node });
    }
    return root;
  }

  const treeJson = $derived(JSON.stringify(toTree(rows)));

  function addRow() {
    rows = [...rows, { id: nextId++, depth: 0, label: 'New item', url: '' }];
  }
  function removeRow(id: number) {
    rows = rows.filter((r) => r.id !== id);
  }
  function indent(i: number) {
    // A row may nest at most one level deeper than the row above it, and never past the cap.
    if (i === 0) return;
    const ceiling = Math.min(rows[i - 1].depth + 1, maxDepthIndex);
    if (rows[i].depth < ceiling) rows[i].depth += 1;
  }
  function outdent(i: number) {
    if (rows[i].depth > 0) rows[i].depth -= 1;
  }

  let dragFrom = $state<number | null>(null);
  function onDrop(to: number) {
    if (dragFrom === null || dragFrom === to) return;
    const next = [...rows];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(to, 0, moved);
    rows = next;
    dragFrom = null;
  }
</script>

<div class="cairn-admin">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-semibold">{data.menu.label}</h1>
    <button type="button" class="btn btn-sm" onclick={addRow}>Add item</button>
  </div>

  {#if data.saved}
    <div class="alert alert-success mt-3">Navigation saved.</div>
  {/if}
  {#if data.error}
    <div class="alert alert-error mt-3">{data.error}</div>
  {/if}

  <form method="POST" action="?/save" class="mt-4">
    <input type="hidden" name="tree" value={treeJson} />
    <ul class="menu w-full gap-1">
      {#each rows as row, i (row.id)}
        <li
          draggable="true"
          ondragstart={() => (dragFrom = i)}
          ondragover={(e) => e.preventDefault()}
          ondrop={() => onDrop(i)}
          style={`margin-left:${row.depth * 1.5}rem`}
        >
          <div class="flex items-center gap-2 p-2">
            <span class="cursor-grab opacity-40" aria-hidden="true">⠿</span>
            <input class="input input-sm input-bordered flex-1" placeholder="Label" bind:value={row.label} />
            <input
              class="input input-sm input-bordered flex-1"
              placeholder="/path or https://…"
              list="cairn-nav-pages"
              bind:value={row.url}
            />
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => outdent(i)} aria-label="Outdent">&larr;</button>
            <button type="button" class="btn btn-xs btn-ghost" onclick={() => indent(i)} aria-label="Indent">&rarr;</button>
            <button type="button" class="btn btn-xs btn-ghost text-error" onclick={() => removeRow(row.id)} aria-label="Remove">&times;</button>
          </div>
        </li>
      {/each}
    </ul>

    <datalist id="cairn-nav-pages">
      {#each data.pages as p (p.url)}
        <option value={p.url}>{p.label}</option>
      {/each}
    </datalist>

    <div class="mt-4">
      <button type="submit" class="btn btn-primary btn-sm">Save navigation</button>
    </div>
  </form>
</div>
```

- [ ] **Step 2: Re-export the component**

In `src/lib/components/index.ts`, add (match the existing export style):

```ts
export { default as NavTree } from './NavTree.svelte';
```

- [ ] **Step 3: Build the package**

Run: `npm run package`
Expected: `svelte-package` emits `dist/components/NavTree.svelte` with no error. (If a literal script/style tag token appears inside a JS comment it breaks the Svelte parser; the comments above avoid raw tag tokens, per the Pass I gotcha.)

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all green (the component's server contract is covered by Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/NavTree.svelte src/lib/components/index.ts
git commit -m "feat(components): add NavTree editor"
```

---

## Task 9: Canonical D1 migration (engine)

**Files:**
- Create: `migrations/0001_nav_menu.sql`

- [ ] **Step 1: Create the migration**

Create `migrations/0001_nav_menu.sql`:

```sql
CREATE TABLE IF NOT EXISTS nav_menu (
  name TEXT PRIMARY KEY,
  tree_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 2: Confirm the auth harness still passes**

The auth integration harness globs `migrations/*.sql`; the extra table is harmless.
Run: `npm test`
Expected: all green (auth-integration + nav + sveltekit + the rest).

- [ ] **Step 3: Commit**

```bash
git add migrations/0001_nav_menu.sql
git commit -m "feat(nav): add canonical nav_menu migration"
```

---

## Task 10: ecnordic-ski wiring

Work in `/home/glw907/Projects/cairn/ecnordic-ski`. The package is consumed via the workspace symlink, so the engine changes above are already visible.

**Files:**
- Create: `drizzle/migrations/0001_nav_menu.sql`
- Modify: `src/lib/cairn.config.ts`
- Create: `src/routes/admin/nav/+page.server.ts`, `src/routes/admin/nav/+page.svelte`
- Modify: `src/routes/+layout.server.ts`, `src/routes/+layout.svelte`, `src/lib/components/Nav.svelte`

- [ ] **Step 1: Copy the migration + apply it locally**

```bash
cp /home/glw907/Projects/cairn/cairn-cms/migrations/0001_nav_menu.sql drizzle/migrations/0001_nav_menu.sql
npx wrangler d1 migrations apply AUTH_DB --local
```
Expected: the new migration applies (1 migration run).

- [ ] **Step 2: Seed the current nav into local D1**

```bash
npx wrangler d1 execute AUTH_DB --local --command "INSERT INTO nav_menu (name, tree_json, updated_at) VALUES ('primary', '[{\"label\":\"About\",\"url\":\"/about\"},{\"label\":\"Training\",\"url\":\"/training\"},{\"label\":\"Volunteers\",\"url\":\"/volunteers\"},{\"label\":\"CrewLAB\",\"url\":\"/crewlab\"},{\"label\":\"Resources\",\"url\":\"/resources\"},{\"label\":\"Contact\",\"url\":\"/contact\"}]', 1748000000000) ON CONFLICT(name) DO NOTHING;"
```
Expected: 1 row written.

- [ ] **Step 3: Add `navMenus` to the adapter**

In `src/lib/cairn.config.ts`, add to the `cairn` object (after `registry`):

```ts
  navMenus: [{ name: 'primary', label: 'Main menu', maxDepth: 2 }],
```

- [ ] **Step 4: Create the admin route shim**

Create `src/routes/admin/nav/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { navLoad, navSave } from '@glw907/cairn-cms/sveltekit';
import { cairn } from '$lib/cairn.config';

export const load: PageServerLoad = (event) => navLoad(event, cairn);

export const actions: Actions = {
  save: (event) => navSave(event, cairn),
};
```

Create `src/routes/admin/nav/+page.svelte`:

```svelte
<script lang="ts">
  import { NavTree } from '@glw907/cairn-cms/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<NavTree {data} />
```

- [ ] **Step 5: Read nav at runtime in the root layout**

Replace the entire contents of `src/routes/+layout.server.ts` with:

```ts
import type { LayoutServerLoad } from './$types';
import { loadNav } from '@glw907/cairn-cms';

// Nav lives in D1 and is read per request, so the layout (and thus pages) render on the edge
// rather than prerendering to static HTML (the Pass L edge-SSR consumption decision).
export const prerender = false;

export const load: LayoutServerLoad = async ({ platform }) => ({
  nav: platform?.env ? await loadNav(platform.env, 'primary') : [],
});
```

- [ ] **Step 6: Pass the nav into `<Nav>`**

In `src/routes/+layout.svelte`, ensure `data` is destructured from `$props()` and change the Nav usage from:

```svelte
<Nav onSearchOpen={() => { searchOpen = true; }} />
```

to:

```svelte
<Nav navItems={data.nav} onSearchOpen={() => { searchOpen = true; }} />
```

If the layout's `$props()` does not already include `data`, add it (e.g. `let { data, children } = $props();`).

- [ ] **Step 7: Render `navItems` in `Nav.svelte`**

In `src/lib/components/Nav.svelte`:

- Add `navItems` to the props and a type, and delete the hardcoded `const navLinks = [...]`:

```ts
  interface NavItem { label: string; url?: string; children?: NavItem[]; }
  let { navItems = [], onSearchOpen }: { navItems?: NavItem[]; onSearchOpen: () => void } = $props();
```

- Replace the desktop `{#each navLinks as link}` block with (note `link.url`, not `link.href`):

```svelte
      {#each navItems as link}
        {#if link.children?.length}
          <div class="nav-group">
            <span class="nav-link">{link.label}</span>
            <div class="nav-submenu">
              {#each link.children as child}
                <a href={child.url} class="nav-link" class:active={isActive(child.url ?? '')}>{child.label}</a>
              {/each}
            </div>
          </div>
        {:else}
          <a href={link.url} class="nav-link" class:active={isActive(link.url ?? '')} aria-current={isActive(link.url ?? '') ? 'page' : undefined}>{link.label}</a>
        {/if}
      {/each}
```

- Apply the same `{#each navItems as link}` rename in the mobile dropdown block (flat render: render `link`, then any `link.children` as further links). Use `link.url`.

(Visual styling of `.nav-group`/`.nav-submenu` is the standing Firefox refinement step; a minimal inline render is enough for the smoke.)

- [ ] **Step 8: Typecheck + build**

Run: `npx svelte-kit sync && npm run check`
Expected: 0 errors / 0 warnings.
Run: `npm run build`
Expected: Cloudflare build succeeds (the site is no longer prerendered; the build output is the worker).

- [ ] **Step 9: Commit (in the ecnordic-ski repo)**

```bash
git add drizzle/migrations/0001_nav_menu.sql src/lib/cairn.config.ts src/routes/admin/nav src/routes/+layout.server.ts src/routes/+layout.svelte src/lib/components/Nav.svelte
git commit -m "feat(admin): nav-tree management + runtime nav read"
```

---

## Task 11: 907-life wiring

Work in `/home/glw907/Projects/cairn/907-life`. 907 has no `pages` collection, so `navPageOptions` returns [] there (the picker datalist is empty, which is correct).

**Files:** same set as Task 10, with 907's Nav shape.

- [ ] **Step 1: Copy + apply + seed**

```bash
cp /home/glw907/Projects/cairn/cairn-cms/migrations/0001_nav_menu.sql drizzle/migrations/0001_nav_menu.sql
npx wrangler d1 migrations apply AUTH_DB --local
npx wrangler d1 execute AUTH_DB --local --command "INSERT INTO nav_menu (name, tree_json, updated_at) VALUES ('primary', '[{\"label\":\"Archives\",\"url\":\"/archives\"},{\"label\":\"About\",\"url\":\"/about\"},{\"label\":\"Contact\",\"url\":\"/about#contact\"}]', 1748000000000) ON CONFLICT(name) DO NOTHING;"
```
Expected: migration applies; 1 row seeded.

- [ ] **Step 2: Add `navMenus` to the adapter**

In `src/lib/cairn.config.ts`, add after `registry`:

```ts
  navMenus: [{ name: 'primary', label: 'Main menu', maxDepth: 2 }],
```

- [ ] **Step 3: Create the route shim (byte-identical to ecnordic's)**

Create `src/routes/admin/nav/+page.server.ts` and `src/routes/admin/nav/+page.svelte` with the EXACT contents from Task 10 Step 4.

- [ ] **Step 4: Read nav at runtime in the root layout**

Replace `src/routes/+layout.server.ts` with the EXACT contents from Task 10 Step 5.

- [ ] **Step 5: Pass nav into `<Nav>`**

In `src/routes/+layout.svelte`, change the Nav usage to:

```svelte
<Nav navItems={data.nav} onSearchOpen={() => { searchOpen = true; }} />
```

Ensure `data` is in the layout's `$props()` destructuring.

- [ ] **Step 6: Render `navItems` in 907's `Nav.svelte`**

907's nav links are inline (no `navLinks` array, no mobile menu). In `src/lib/components/Nav.svelte`:

- Add props:

```ts
  interface NavItem { label: string; url?: string; children?: NavItem[]; }
  let { navItems = [], onSearchOpen }: { navItems?: NavItem[]; onSearchOpen: () => void } = $props();
```

- Replace the three hardcoded `<a class="nav-link">` tags with a loop, keeping the `.nav-icons` block after it:

```svelte
    <div class="nav-links">
      {#each navItems as link}
        {#if link.children?.length}
          <span class="nav-link">{link.label}</span>
          {#each link.children as child}
            <a href={child.url} class="nav-link">{child.label}</a>
          {/each}
        {:else}
          <a href={link.url} class="nav-link">{link.label}</a>
        {/if}
      {/each}
      <div class="nav-icons">
        <!-- existing search + theme buttons unchanged -->
      </div>
    </div>
```

- [ ] **Step 7: Typecheck + build**

Run: `npx svelte-kit sync && npm run check`
Expected: 0 errors / 0 warnings.
Run: `npm run build`
Expected: Cloudflare build succeeds.

- [ ] **Step 8: Confirm shim byte-identity**

Run: `diff -rq /home/glw907/Projects/cairn/ecnordic-ski/src/routes/admin/nav /home/glw907/Projects/cairn/907-life/src/routes/admin/nav`
Expected: no output (the F2 invariant holds for the new route).

- [ ] **Step 9: Commit (in the 907-life repo)**

```bash
git add drizzle/migrations/0001_nav_menu.sql src/lib/cairn.config.ts src/routes/admin/nav src/routes/+layout.server.ts src/routes/+layout.svelte src/lib/components/Nav.svelte
git commit -m "feat(admin): nav-tree management + runtime nav read"
```

---

## Task 12: Live admin smoke + verification (both sites)

**Files:** none (verification + the engine progress log).

- [ ] **Step 1: code-simplifier over the engine changes**

Dispatch the `code-simplifier:code-simplifier` agent over the cairn-cms files changed in Tasks 1-9. Apply its refinements; keep behavior.

- [ ] **Step 2: Engine gates**

In cairn-cms:
Run: `npm test`  Expected: all green (capabilities + nav + sveltekit + auth-integration + the rest).
Run: `npm run package`  Expected: `svelte-package` clean; `dist/components/NavTree.svelte`, `dist/nav.js`, `dist/auth/capabilities.js` emitted.

- [ ] **Step 3: Live smoke on ecnordic (owner)**

Follow `docs/admin-smoke-test.md`. In ecnordic: `npm run build` then `npx wrangler dev` (with `sleep infinity`). Mint an OWNER session via `scripts/mint-session.mjs`. Then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/admin/nav            # anon -> 303 (guard)
curl -s -b cookie.txt http://localhost:8787/admin/nav | grep -c 'Save navigation'   # owner -> editor renders
curl -s http://localhost:8787/ | grep -c 'href="/training"'                          # public nav from D1 (seeded)
```
Expected: anon 303; owner page contains the editor; the public home page renders the seeded nav links read from D1.

- [ ] **Step 4: Live smoke on ecnordic (editor is denied)**

Mint an EDITOR session. Confirm:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -b editor-cookie.txt http://localhost:8787/admin/nav   # -> 403
curl -s -b editor-cookie.txt http://localhost:8787/admin/pages | grep -c 'New entry'             # -> 0 (page-create hidden)
curl -s -b editor-cookie.txt http://localhost:8787/admin/posts | grep -c 'New entry'             # -> 1+ (story-create allowed)
```
Expected: nav 403; the page-collection create form is absent for the editor; the story create form is present.

- [ ] **Step 5: Repeat the owner + public smoke on 907**

In 907-life: `npm run build` then `npx wrangler dev`. Mint an owner session.

```bash
curl -s -b cookie.txt http://localhost:8787/admin/nav | grep -c 'Save navigation'   # owner -> editor renders
curl -s http://localhost:8787/ | grep -c 'href="/archives"'                          # public nav from D1
```
Expected: editor renders; the public nav shows the seeded 907 links. (907 has no page collection, so the editor-denied page-create check does not apply.)

- [ ] **Step 6: Record results + update the plan + risk register**

Append a Pass L entry to `docs/PLAN.md` Notes/progress log: what was built (capability layer, D1 nav store, navLoad/navSave, NavTree, page-create gating, both sites' runtime read), what was verified (test counts, both smokes, byte-identical shim), the new locked decisions (D1 for admin storage, capabilities-over-role-names, edge-SSR consumption), the standing Firefox visual + drag-interaction step, and the prod D1 migrate + seed at release. Note that flipping the root layout to `prerender = false` makes both sites edge-SSR, with edge-cache-and-bust as the named fast-follow.

- [ ] **Step 7: Final commit (cairn-cms)**

```bash
git add docs/PLAN.md
git commit -m "docs(plan): record Pass L navigation-tree management"
```

---

## Release note (not a task; for the release pass)

Pass L ships as a cairn-cms minor folded with the held Pass I/J/K admin-UI bundle (the Pass P pattern): publish via OIDC, repoint both sites + regenerate lockfiles, then per site apply `0001_nav_menu.sql` to the REMOTE `AUTH_DB` (`wrangler d1 migrations apply AUTH_DB --remote`) and run the same seed INSERT with `--remote`. Both CI deploys green. The Firefox visual + drag confirmation on both `/admin/nav` and the live header is the standing user step.

---

## Self-review

**Spec coverage:**
- Storage shape (JSON-per-menu in AUTH_DB): Tasks 3, 9. OK.
- `NavNode` (label/url?/children?), order, maxDepth default 2, label-only parent: Tasks 2, 8. OK.
- Adapter `navMenus` field: Task 4. OK.
- Engine `navLoad`/`navSave` with validation + typed error: Task 6. OK.
- `loadNav` returns [] for missing menu: Task 3. OK.
- `NavTree.svelte` DaisyUI + two-axis drag (reorder + indent/outdent) + page-picker: Task 8. OK.
- Capability statements (matrix), nav:manage + page:create owner-gated: Tasks 1, 5, 6, 7. OK.
- Route shim, AdminLayout entry gated on capability, migration+seed, edge-SSR consumption: Tasks 7, 9, 10, 11. OK.
- Tests (validation, CRUD over SQLite shim, capability gating): Tasks 1, 2, 3, 5, 6, 7. OK.
- Both-site svelte-check/build/live smoke: Tasks 10, 11, 12. OK.

**Placeholder scan:** No TBD/TODO; every code step shows complete code. The one prose-only spot (Nav submenu CSS) is flagged as the standing Firefox step, not a code gap.

**Type consistency:** `NavNode` (nav.ts) used in the nav store, `navLoad`/`navSave`, and `NavTree`. `Capability` union identical across capabilities.ts and call sites. `NavLoadData`/`NavPageOption` defined in sveltekit/index.ts and imported by `NavTree`. `navMenus` shape (`{name,label,maxDepth?}`) matches between adapter.ts, `navLoad`, and `adminLayoutLoad` (which narrows to `{name,label}`). `canCreate`/`canManageNav` booleans match producer and consumer.
