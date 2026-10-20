# Pass J: Collections-First Nav + Per-Collection Entries List (R3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's single lumped "Content" page with a Sveltia-style collections IA. Each adapter collection becomes its own sidebar nav entry that opens a per-collection entries list (with title, date, draft badge, and a working "New entry" create flow).

**Architecture:** All real logic lives in the `@glw907/cairn-cms` package (server functions in `cairn-cms/sveltekit`, components in `cairn-cms/components`); both sites consume it through byte-identical thin route shims (the F2 invariant). A new dynamic route `/admin/[collection]` lists one collection; `/admin` redirects to the first collection; the editor gains a create mode reached via `?new=1`. No content moves out of git; reads use the existing GitHub contents API plus the App-token read path.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, DaisyUI v5, `@sveltejs/kit` (peer dep, for `redirect`/`error`), `gray-matter`, vitest. The package builds via `svelte-package`; release follows the Pass P pattern (OIDC publish plus both-site lockfile repoint).

---

## Background the implementer needs

Read these before starting; they are the ground truth this plan is written against.

- **Initiative tracker:** `cairn-cms/docs/PLAN.md` (locked decisions, risk register, progress log). Pass J is one of the "New Admin UI" passes; it ships folded with Pass I (already coded) and possibly Pass K as one cairn-cms minor.
- **Design source:** `cairn-cms/docs/superpowers/specs/2026-05-26-admin-ui-design.md` §R3 (the requirement) and the "Implementation passes" section (the Pass J line).
- **The F2 invariant (do not break it):** the admin route files in `ecnordic-ski/src/routes/admin/**` and `907-life/src/routes/admin/**` are **byte-identical** except each site's `src/lib/cairn.config.ts`. Every route file you add or change must be added or changed identically in **both** sites. After the site work, `diff -rq ecnordic-ski/src/routes/admin 907-life/src/routes/admin` must report only legitimate differences.
- **Filename-based ids (Pass E finding):** an entry's `id` is the bare filename stem (`2026-05-welcome` for `src/content/posts/2026-05-welcome.md`). There is no slug codec. `RepoFile` is `{ id, name, path }` (`src/lib/github.ts:19`).
- **Read auth:** `readToken(env)` (`src/lib/sveltekit/index.ts:44`) mints a GitHub App installation token for reads when configured, else returns `undefined` (anonymous). Always thread it through `listMarkdown`/`readRaw`; anonymous reads 403 in prod (Hotfix 0.3.1).
- **Why server functions take a structurally-typed `event`:** the package can't depend on each site's generated `App.*` ambient types, so the functions accept a minimal structural shape. Follow the existing patterns in `src/lib/sveltekit/index.ts` exactly.

## Sveltia alignment and deliberate scope cuts (decided during planning)

Sveltia CMS (the model R3 cites) was reviewed. Here is what Pass J matches and what it deliberately does **not** build.

- **Match:** a flat collection list in the sidebar (no tree or grouping); selecting a folder collection opens an entries list; newest-first ordering (already done by `markdownFiles`); a "create new entry" affordance on the list.
- **Cut (lean-core; WordPress-bloat is the cautionary tale):**
  - **No `summary` template engine.** Sveltia rows are driven by a per-collection `summary` template with pipe transforms. Pass J shows a fixed lean row: frontmatter `title` (falling back to the id), `date` if present, and a draft badge when `draft: true`. No template syntax enters the adapter.
  - **No file/singleton collections.** Sveltia has a second collection shape (`files:`, fixed singletons that open straight in the editor with no list). Cairn models only **folder collections** (`dir` plus many entries). That second shape is a forward-compat seam (a future `kind: 'file'` on `CairnCollection`) and is explicitly out of scope here. ecnordic "Pages" stays a folder collection with a list.
  - **No title-to-slug derivation.** Sveltia separates `identifier_field` plus a `slug` template from the display. Cairn is filename-based, so the "New entry" flow asks the author for the slug stem directly. A title-driven auto-slug belongs to Pass K (editing).
  - **No per-collection icons, `label_singular`, sorting UI, view filters/groups, thumbnails, drag-reorder, `limit`, or `hide`.** These are Sveltia niceties; none are R3 requirements. Every collection nav entry reuses one generic document icon. Note them in the close-out as known additive future options; build none now.

## File structure

**Package, `cairn-cms/src/lib/sveltekit/index.ts`** (server logic, the one module that grows):
- `adminLayoutLoad`: extend its return with `collections: NavCollection[]` so the shell can render per-collection nav.
- `adminIndexRedirect(adapter)`: NEW; `/admin` to the first collection.
- `collectionListLoad(event, adapter)`: NEW; one collection's entries with title, date, draft.
- `createEntry(event, adapter)`: NEW; the `?/create` form action (validate slug, redirect to the editor with `?new=1`).
- `editLoad`: extend to return a blank new document when `?new=1` and the file is missing; add `isNew` to `EditData`.
- `saveCommit`: preserve the `new=1` flag across its error redirects.
- Retire `adminListLoad` plus `AdminCollectionList` (the lumped multi-collection list), superseded by `collectionListLoad`.

**Package, `cairn-cms/src/lib/components/`** (UI):
- `AdminLayout.svelte`: per-collection nav from `data.collections`.
- `CollectionList.svelte`: NEW; the entries table plus the "New entry" disclosure form.
- `EditPage.svelte`: create-mode support plus a back-link to the collection.
- `index.ts`: export `CollectionList`; remove `AdminList`.
- `AdminList.svelte`: DELETE (fully retired).

**Package, tests** (`cairn-cms/src/tests/`):
- NEW `sveltekit.test.ts`, covering `adminLayoutLoad`, `adminIndexRedirect`, `collectionListLoad`, `createEntry`, `editLoad` (new path), and `saveCommit` (new-flag preservation). There is currently **no** test file for `sveltekit/index.ts`; this adds the first.

**Sites, `ecnordic-ski/` and `907-life/` (identical changes in both):**
- NEW `src/routes/admin/[collection]/+page.server.ts`: shim to `collectionListLoad` plus the `createEntry` action.
- NEW `src/routes/admin/[collection]/+page.svelte`: shim to `<CollectionList {data} />`.
- MODIFY `src/routes/admin/+page.server.ts`: shim to `adminIndexRedirect`.
- MODIFY `src/routes/admin/+page.svelte`: a minimal redirect stub (no more `<AdminList>`).
- UNCHANGED `src/routes/admin/edit/[type]/[id]/+page.server.ts` and `+page.svelte`: they forward `event`; the new behavior is all in `editLoad`/`EditPage`.

**Route-precedence note:** the static siblings under `/admin/` (`edit`, `admins`, `auth`, `healthz`, `login`) take precedence over the dynamic `[collection]`, so they are unaffected. No adapter declares a collection `type` of `edit`/`admins`/`auth`/`healthz`/`login`, so nothing is shadowed. Document this constraint in the close-out.

---

## Task 1: Expose collections to the admin layout

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (the `AdminLayoutData` interface plus `adminLayoutLoad`, around lines 62-80)
- Test: `cairn-cms/src/tests/sveltekit.test.ts` (new file)

- [ ] **Step 1: Write the failing test**

Create `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { adminLayoutLoad } from '../lib/sveltekit';
import type { CairnAdapter } from '../lib/adapter';

// A fixture adapter with two folder collections, mirroring ecnordic's shape.
const adapter: CairnAdapter = {
  siteName: 'Test Site',
  sender: 'noreply@test',
  backend: { owner: 'o', repo: 'r', branch: 'main' },
  preview: { remarkPlugins: [], rehypePlugins: [] },
  collections: [
    { type: 'posts', label: 'Posts', dir: 'src/content/posts', fields: [], validate: (d) => d },
    { type: 'pages', label: 'Pages', dir: 'src/content/pages', fields: [], validate: (d) => d },
  ],
};

describe('adminLayoutLoad', () => {
  it('returns branding, session, pathname, and the collection nav list', () => {
    const data = adminLayoutLoad(
      { locals: { user: null }, url: new URL('https://x/admin/posts') },
      adapter,
    );
    expect(data.siteName).toBe('Test Site');
    expect(data.pathname).toBe('/admin/posts');
    expect(data.collections).toEqual([
      { type: 'posts', label: 'Posts' },
      { type: 'pages', label: 'Pages' },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. `data.collections` is `undefined` (the property does not exist yet).

- [ ] **Step 3: Extend `AdminLayoutData` and `adminLayoutLoad`**

In `cairn-cms/src/lib/sveltekit/index.ts`, replace the `AdminLayoutData` interface and `adminLayoutLoad` (currently lines 62-80) with:

```ts
/** A collection reduced to what the sidebar nav needs (no plugin graph crosses to the client). */
export interface NavCollection {
  type: string;
  label: string;
}

export interface AdminLayoutData {
  user: CairnUser | null;
  siteName: string;
  pathname: string;
  collections: NavCollection[];
}

/**
 * Branding, session, and collection nav for every admin page. `siteName` and the collection
 * list flow from the adapter without pulling its plugin graph into client bundles (the import
 * stays server-side in the layout load; only `{type,label}` crosses). `pathname` lets the
 * shared shell highlight the active nav item without a `$app/*` import (those kit virtual
 * modules have no types outside a kit app); reading `event.url` also opts the layout load into
 * rerunning on navigation, keeping the active class correct.
 */
export function adminLayoutLoad(
  event: { locals: { user: CairnUser | null }; url: URL },
  adapter: CairnAdapter,
): AdminLayoutData {
  return {
    user: event.locals.user,
    siteName: adapter.siteName,
    pathname: event.url.pathname,
    collections: adapter.collections.map(({ type, label }) => ({ type, label })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): expose collection nav list from adminLayoutLoad

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Render per-collection nav in the shell

**Files:**
- Modify: `cairn-cms/src/lib/components/AdminLayout.svelte`

This is a Svelte component; it has no unit test in this repo. It is verified by `svelte-check` (Task 11) and the live `wrangler dev` smoke (Task 12). Follow the code exactly.

- [ ] **Step 1: Widen the component's `data` prop**

In `AdminLayout.svelte`, change the props type (currently lines 8-14) to include the collection list:

```ts
  let {
    data,
    children,
  }: {
    data: {
      siteName: string;
      user: CairnUser | null;
      pathname: string;
      collections: { type: string; label: string }[];
    };
    children: Snippet;
  } = $props();
```

- [ ] **Step 2: Build the nav from collections instead of a single "Content" entry**

Replace the `nav` `$derived` block (currently lines 25-39) with one entry per collection plus the owner-only Editors entry:

```ts
  const nav = $derived<NavItem[]>([
    ...data.collections.map((collection) => ({
      href: `/admin/${collection.type}`,
      label: collection.label,
      icon: contentIcon,
      active:
        data.pathname === `/admin/${collection.type}` ||
        data.pathname.startsWith(`/admin/edit/${collection.type}/`),
    })),
    {
      href: '/admin/admins',
      label: 'Editors',
      icon: editorsIcon,
      owner: true,
      active: data.pathname.startsWith('/admin/admins'),
    },
  ]);
```

Leave the `visibleNav` derivation, the `contentIcon`/`editorsIcon` snippets, the `closeDrawer` helper, both shell branches, and the `<style>` block unchanged. Every collection reuses `contentIcon` (per-collection icons are a deliberate scope cut).

- [ ] **Step 3: Verify it compiles in isolation**

Run: `cd cairn-cms && npx svelte-package`
Expected: a clean build; `dist/components/AdminLayout.svelte` emitted with no error. (Full `svelte-check` across the sites runs in Task 11.)

- [ ] **Step 4: Commit**

```bash
cd cairn-cms
git add src/lib/components/AdminLayout.svelte
git commit -m "feat(admin): render one sidebar nav entry per collection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: collectionListLoad, one collection's entries with metadata

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (replace the `adminListLoad` section, lines 82-108)
- Test: `cairn-cms/src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { afterEach, vi } from 'vitest';
import { collectionListLoad } from '../lib/sveltekit';
import { isHttpError } from '@sveltejs/kit';

afterEach(() => {
  vi.restoreAllMocks();
});

// A fetch stub keyed by URL substring, so a directory listing and each raw-file read return
// distinct bodies (mirrors the contents-API shapes github.ts relies on).
function mockFetch(routes: { match: string; body: string; status?: number }[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) return new Response('not mocked', { status: 500 });
    return new Response(route.body, { status: route.status ?? 200 });
  });
}

const listEvent = (collection: string) => ({
  params: { collection },
  url: new URL(`https://x/admin/${collection}`),
  platform: { env: {} },
});

describe('collectionListLoad', () => {
  it('throws 404 for an unknown collection', async () => {
    try {
      await collectionListLoad(listEvent('events'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });

  it('lists entries with title, date, and draft from each frontmatter', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([
          { name: '2026-05-two.md', path: 'src/content/posts/2026-05-two.md', type: 'file' },
          { name: '2025-01-one.md', path: 'src/content/posts/2025-01-one.md', type: 'file' },
        ]),
      },
      {
        match: '2026-05-two.md',
        body: '---\ntitle: Second\ndate: 2026-05-10\ndraft: true\n---\nbody',
      },
      {
        match: '2025-01-one.md',
        body: '---\ntitle: First\ndate: 2025-01-02\n---\nbody',
      },
    ]);

    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.type).toBe('posts');
    expect(data.label).toBe('Posts');
    expect(data.error).toBeUndefined();
    // markdownFiles sorts newest id first, so 2026-05-two precedes 2025-01-one.
    expect(data.entries).toEqual([
      { id: '2026-05-two', path: 'src/content/posts/2026-05-two.md', title: 'Second', date: '2026-05-10', draft: true },
      { id: '2025-01-one', path: 'src/content/posts/2025-01-one.md', title: 'First', date: '2025-01-02', draft: false },
    ]);
  });

  it('degrades to the slug when an entry read fails', async () => {
    mockFetch([
      {
        match: '/contents/src/content/posts?',
        body: JSON.stringify([{ name: 'a.md', path: 'src/content/posts/a.md', type: 'file' }]),
      },
      { match: 'src/content/posts/a.md', body: 'boom', status: 500 },
    ]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([
      { id: 'a', path: 'src/content/posts/a.md', title: 'a', date: null, draft: false },
    ]);
  });

  it('returns an inline error when the directory listing fails', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: 'rate limited', status: 403 }]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.entries).toEqual([]);
    expect(data.error).toMatch(/403/);
  });

  it('surfaces a create-flow error from the query string', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: JSON.stringify([]) }]);
    const event = { params: { collection: 'posts' }, url: new URL('https://x/admin/posts?error=nope'), platform: { env: {} } };
    const data = await collectionListLoad(event, adapter);
    expect(data.formError).toBe('nope');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. `collectionListLoad` is not exported.

- [ ] **Step 3: Implement collectionListLoad**

In `cairn-cms/src/lib/sveltekit/index.ts`, delete the existing `// ── /admin (content list) ──` section (the `AdminCollectionList` interface and the `adminListLoad` function, lines 82-108) and replace it with:

```ts
// ── /admin/[collection] (entries list) ─────────────────────────────────────

/** One entry row: id (filename stem), display title, optional date, draft flag. */
export interface CollectionEntry {
  id: string;
  path: string;
  title: string;
  date: string | null;
  draft: boolean;
}

export interface CollectionListData {
  type: string;
  label: string;
  entries: CollectionEntry[];
  /** Set when the directory listing itself failed (rate limit, network). */
  error?: string;
  /** A create-flow error bounced back via `?error=` (an invalid or taken slug). */
  formError: string | null;
}

/** Coerce a frontmatter `date` (gray-matter may parse YAML dates to `Date`) to `YYYY-MM-DD`. */
function entryDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value;
  return null;
}

/**
 * List one collection's entries, reading each file's frontmatter for the display title, date,
 * and draft badge. Reads run in parallel; a single failed read degrades that row to the slug
 * (rather than failing the page), and a failed directory listing returns an inline `error`.
 * Collections are small here; the 1,000-entry / Git-Trees sharding concern is risk #11, deferred.
 */
export async function collectionListLoad(
  event: PlatformEvent & { params: { collection: string }; url: URL },
  adapter: CairnAdapter,
): Promise<CollectionListData> {
  const collection = findCollection(adapter, event.params.collection);
  if (!collection) throw error(404, 'Unknown collection');

  const formError = event.url.searchParams.get('error');
  const token = await readToken(event.platform?.env);

  let files: RepoFile[];
  try {
    files = await listMarkdown(adapter.backend, collection.dir, token);
  } catch (err) {
    return {
      type: collection.type,
      label: collection.label,
      entries: [],
      error: err instanceof Error ? err.message : 'Failed to load',
      formError,
    };
  }

  const entries = await Promise.all(
    files.map(async (file): Promise<CollectionEntry> => {
      const fallback: CollectionEntry = { id: file.id, path: file.path, title: file.id, date: null, draft: false };
      try {
        const raw = await readRaw(adapter.backend, file.path, token);
        if (raw === null) return fallback;
        const { data } = matter(raw);
        return {
          id: file.id,
          path: file.path,
          title: typeof data.title === 'string' ? data.title : file.id,
          date: entryDate(data.date),
          draft: data.draft === true,
        };
      } catch {
        return fallback;
      }
    }),
  );

  return { type: collection.type, label: collection.label, entries, formError };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS (all `collectionListLoad` cases).

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): add collectionListLoad with per-entry title/date/draft

Replaces the lumped adminListLoad. Reads each entry's frontmatter in
parallel and degrades to the slug on a per-file read failure.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: CollectionList.svelte plus barrel; retire AdminList

**Files:**
- Create: `cairn-cms/src/lib/components/CollectionList.svelte`
- Modify: `cairn-cms/src/lib/components/index.ts`
- Delete: `cairn-cms/src/lib/components/AdminList.svelte`

Component work, verified by `svelte-package` here and `svelte-check`/smoke later.

- [ ] **Step 1: Create CollectionList.svelte**

```svelte
<script lang="ts">
  // One collection's entries: a table (title, date, draft badge) linking into the editor, plus
  // a collapsible "New entry" form that POSTs a slug to the `?/create` action. The shell
  // (AdminLayout) owns the chrome and the per-collection nav; this renders only the body.
  import type { CollectionListData } from '../sveltekit';

  let { data }: { data: CollectionListData } = $props();
</script>

<div class="flex items-center justify-between gap-4">
  <h1 class="text-2xl font-bold">{data.label}</h1>
  <details class="dropdown dropdown-end">
    <summary class="btn btn-primary btn-sm">New entry</summary>
    <form
      method="POST"
      action="?/create"
      class="dropdown-content z-10 mt-2 flex w-80 flex-col gap-2 rounded-box border border-base-300 bg-base-100 p-4 shadow"
    >
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Slug</span>
        <input
          type="text"
          name="id"
          required
          placeholder="2026-05-my-entry"
          pattern="[a-z0-9][a-z0-9\-]*"
          class="input w-full"
        />
        <span class="text-xs opacity-60">Lowercase letters, numbers, and hyphens. Becomes the filename.</span>
      </label>
      <button type="submit" class="btn btn-primary btn-sm">Create &amp; edit</button>
    </form>
  </details>
</div>

{#if data.formError}
  <div class="alert alert-error mt-4"><span>{data.formError}</span></div>
{/if}

{#if data.error}
  <div class="alert alert-warning mt-6">Couldn't load {data.label.toLowerCase()}: {data.error}</div>
{:else if data.entries.length === 0}
  <p class="mt-6 opacity-60">No entries yet.</p>
{:else}
  <ul class="menu mt-6 rounded-box border border-base-300 bg-base-100 p-2">
    {#each data.entries as entry (entry.path)}
      <li>
        <a href="/admin/edit/{data.type}/{entry.id}" class="flex items-center justify-between gap-3">
          <span class="flex items-center gap-2">
            <span>{entry.title}</span>
            {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>{/if}
          </span>
          {#if entry.date}<span class="text-xs opacity-60">{entry.date}</span>{/if}
        </a>
      </li>
    {/each}
  </ul>
{/if}
```

- [ ] **Step 2: Update the components barrel**

In `cairn-cms/src/lib/components/index.ts`, remove the `AdminList` export line and add `CollectionList`:

```ts
// cairn-cms admin UI shell. Consumers import from 'cairn-cms/components'; each site's
// admin route `.svelte` files are one-line shims around these.
export { default as AdminLayout } from './AdminLayout.svelte';
export { default as CollectionList } from './CollectionList.svelte';
export { default as LoginPage } from './LoginPage.svelte';
export { default as ConfirmPage } from './ConfirmPage.svelte';
export { default as EditPage } from './EditPage.svelte';
export { default as ManageAdmins } from './ManageAdmins.svelte';
```

- [ ] **Step 3: Delete the retired component**

```bash
cd cairn-cms && git rm src/lib/components/AdminList.svelte
```

- [ ] **Step 4: Verify the package builds**

Run: `cd cairn-cms && npx svelte-package`
Expected: clean; `dist/components/CollectionList.svelte` emitted, no reference to the deleted `AdminList`.

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/components/CollectionList.svelte src/lib/components/index.ts
git commit -m "feat(admin): add CollectionList entries view; retire AdminList

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: createEntry, the "New entry" form action

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (add after `collectionListLoad`)
- Test: `cairn-cms/src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { createEntry } from '../lib/sveltekit';
import { isRedirect } from '@sveltejs/kit';

function createEvent(collection: string, id: string) {
  const form = new FormData();
  form.set('id', id);
  return {
    params: { collection },
    locals: { user: { id: 'u1', name: 'Ed', email: 'ed@test', role: 'editor' as const } },
    platform: { env: {} },
    request: new Request('https://x/admin/posts?/create', { method: 'POST', body: form }),
  };
}

describe('createEntry', () => {
  it('rejects an invalid slug with a redirect back to the list', async () => {
    try {
      await createEntry(createEvent('posts', 'Not A Slug!'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      const loc = (err as { location: string }).location;
      expect(loc).toMatch(/^\/admin\/posts\?error=/);
    }
  });

  it('rejects a slug that already exists', async () => {
    mockFetch([{ match: 'src/content/posts/taken.md', body: '---\ntitle: Taken\n---\n' }]);
    try {
      await createEntry(createEvent('posts', 'taken'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect(decodeURIComponent((err as { location: string }).location)).toContain('already exists');
    }
  });

  it('redirects a valid new slug into the editor in create mode', async () => {
    // readRaw to 404 means the slug is free.
    mockFetch([{ match: 'src/content/posts/2026-05-fresh.md', body: 'not found', status: 404 }]);
    try {
      await createEntry(createEvent('posts', '2026-05-fresh'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/posts/2026-05-fresh?new=1');
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. `createEntry` is not exported.

- [ ] **Step 3: Implement createEntry**

In `cairn-cms/src/lib/sveltekit/index.ts`, immediately after the `collectionListLoad` function, add:

```ts
/** A safe filename stem: lowercase alphanumerics and hyphens (matches ecnordic and 907 ids). */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The "New entry" form action. Validates the requested slug, rejects one that already exists,
 * then redirects into the editor in create mode (`?new=1`, where `editLoad` serves a blank
 * document and `saveCommit`'s create path commits a new file). cairn is filename-based, so the
 * slug is the filename stem the author types; a title-driven auto-slug is a later (Pass K) concern.
 */
export async function createEntry(
  event: PlatformEvent & {
    params: { collection: string };
    locals: { user: CairnUser | null };
    request: Request;
  },
  adapter: CairnAdapter,
): Promise<never> {
  if (!event.locals.user) throw error(401, 'Not signed in');
  const collection = findCollection(adapter, event.params.collection);
  if (!collection) throw error(404, 'Unknown collection');

  const form = await event.request.formData();
  const id = String(form.get('id') ?? '').trim();
  const back = (message: string) =>
    redirect(303, `/admin/${collection.type}?error=${encodeURIComponent(message)}`);

  if (!SLUG_RE.test(id)) {
    throw back('Enter a slug using lowercase letters, numbers, and hyphens (for example 2026-05-my-entry).');
  }

  const token = await readToken(event.platform?.env);
  const existing = await readRaw(adapter.backend, `${collection.dir}/${id}.md`, token);
  if (existing !== null) throw back(`An entry named "${id}" already exists.`);

  throw redirect(303, `/admin/edit/${collection.type}/${id}?new=1`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): add createEntry action for the New entry flow

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: editLoad, serve a blank document in create mode

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (`EditData` interface plus `editLoad`, currently lines 112-153)
- Test: `cairn-cms/src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { editLoad } from '../lib/sveltekit';

const editEvent = (id: string, query = '') => ({
  params: { type: 'posts', id },
  url: new URL(`https://x/admin/edit/posts/${id}${query}`),
  platform: { env: {} },
});

describe('editLoad', () => {
  it('serves a blank new document when the file is missing and ?new=1', async () => {
    mockFetch([{ match: 'src/content/posts/2026-05-fresh.md', body: 'not found', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-fresh', '?new=1'), adapter);
    expect(data.isNew).toBe(true);
    expect(data.id).toBe('2026-05-fresh');
    expect(data.body).toBe('');
    expect(data.frontmatter).toEqual({});
    expect(data.title).toBe('2026-05-fresh');
    expect(data.fields).toEqual(adapter.collections[0].fields);
  });

  it('404s for a missing file without ?new=1', async () => {
    mockFetch([{ match: 'src/content/posts/ghost.md', body: 'not found', status: 404 }]);
    try {
      await editLoad(editEvent('ghost'), adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });

  it('loads an existing file as a non-new document', async () => {
    mockFetch([{ match: 'src/content/posts/real.md', body: '---\ntitle: Real\n---\nhi' }]);
    const data = await editLoad(editEvent('real'), adapter);
    expect(data.isNew).toBe(false);
    expect(data.title).toBe('Real');
    expect(data.body).toBe('hi');
  });
});
```

The fixture `adapter` has empty `fields` for `posts`, so `data.fields` is `[]`; the assertion compares against `adapter.collections[0].fields`, which is robust to that.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. `data.isNew` is `undefined`, and the missing-file `?new=1` case currently throws 404.

- [ ] **Step 3: Add `isNew` and the create-mode branch**

In `cairn-cms/src/lib/sveltekit/index.ts`, add `isNew: boolean;` to the `EditData` interface (after `error`):

```ts
export interface EditData {
  type: string;
  id: string;
  label: string;
  fields: CairnField[];
  path: string;
  body: string;
  frontmatter: Record<string, unknown>;
  title: string;
  saved: boolean;
  error: string | null;
  /** True when editing a not-yet-committed new entry (reached via `?new=1`). */
  isNew: boolean;
}
```

Then replace the body of `editLoad` (the part from `const token = ...` / `const path = ...` through the `return`) with:

```ts
  const token = await readToken(event.platform?.env);
  const path = `${collection.dir}/${event.params.id}.md`;
  const raw = await readRaw(adapter.backend, path, token);
  const isNew = event.url.searchParams.get('new') === '1';

  // A missing file is a 404 normally, but in create mode (`?new=1`) it's a blank new document.
  if (raw === null && !isNew) throw error(404, 'Content not found');

  // Split frontmatter from body server-side; the editor form binds to the frontmatter and the
  // Carta editor to the body, and /admin/save reassembles them on commit. A new document starts
  // empty so the author fills the fields from scratch.
  const { data: frontmatter, content: body } = raw === null ? { data: {}, content: '' } : matter(raw);

  return {
    type: event.params.type,
    id: event.params.id,
    label: collection.label,
    fields: collection.fields,
    path,
    body,
    frontmatter,
    title: typeof frontmatter.title === 'string' ? frontmatter.title : event.params.id,
    saved: event.url.searchParams.get('saved') === '1',
    error: event.url.searchParams.get('error'),
    isNew,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): serve a blank document in editLoad create mode

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: saveCommit, preserve the create flag across error redirects

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (`saveCommit`, currently lines 157-212)
- Test: `cairn-cms/src/tests/sveltekit.test.ts`

**Why:** in create mode the form posts `new=1`. If validation fails, `saveCommit` redirects to `/admin/edit/<type>/<id>?error=...`. Without the flag, `editLoad` would 404 on that reload (the file still doesn't exist). Preserving `&new=1` keeps the author in create mode with their error shown. The validation-error path runs **before** any GitHub token mint, so this is testable without crypto.

- [ ] **Step 1: Write the failing test**

Append to `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { saveCommit } from '../lib/sveltekit';

// An adapter whose validate always throws, so saveCommit takes the validation-error redirect
// before any GitHub call. Dummy GitHub App env satisfies the earlier config gate.
const throwingAdapter: CairnAdapter = {
  ...adapter,
  collections: [
    {
      type: 'posts',
      label: 'Posts',
      dir: 'src/content/posts',
      fields: [],
      validate: () => {
        throw new Error('bad frontmatter');
      },
    },
  ],
};

function saveEvent(extra: Record<string, string>) {
  const form = new FormData();
  form.set('type', 'posts');
  form.set('id', '2026-05-fresh');
  form.set('body', 'hello');
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return {
    locals: { user: { id: 'u1', name: 'Ed', email: 'ed@test', role: 'editor' as const } },
    platform: { env: { GITHUB_APP_ID: '1', GITHUB_APP_INSTALLATION_ID: '2', GITHUB_APP_PRIVATE_KEY_B64: 'x' } },
    request: new Request('https://x/admin/save', { method: 'POST', body: form }),
  };
}

describe('saveCommit create-flag preservation', () => {
  it('keeps ?new=1 on a validation-error redirect for a new entry', async () => {
    try {
      await saveCommit(saveEvent({ new: '1' }), throwingAdapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      const loc = (err as { location: string }).location;
      expect(loc).toContain('/admin/edit/posts/2026-05-fresh?error=');
      expect(loc).toContain('&new=1');
    }
  });

  it('omits the new flag for an existing-entry validation error', async () => {
    try {
      await saveCommit(saveEvent({}), throwingAdapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).not.toContain('new=1');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. The redirect location has no `&new=1`.

- [ ] **Step 3: Thread the flag through both error redirects**

In `saveCommit`, after the form fields are read (after the `const body = ...` line), add:

```ts
  const newSuffix = form.get('new') === '1' ? '&new=1' : '';
```

Then update the two error redirects to append `${newSuffix}`. The validation-error redirect becomes:

```ts
    throw redirect(303, `/admin/edit/${type}/${id}?error=${encodeURIComponent(message)}${newSuffix}`);
```

and the `CommitConflictError` redirect becomes:

```ts
      throw redirect(303, `/admin/edit/${type}/${id}?error=${encodeURIComponent(message)}${newSuffix}`);
```

Leave the success redirect (`?saved=1`) unchanged. After a successful create the file exists, so the editor reloads it as a normal (non-new) document.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS (the whole file is green).

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): preserve ?new=1 across saveCommit error redirects

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: EditPage, create-mode UI plus collection back-link

**Files:**
- Modify: `cairn-cms/src/lib/components/EditPage.svelte`

Component work, verified by `svelte-package` here and `svelte-check`/smoke later.

- [ ] **Step 1: Point the back-link at the collection and label the create state**

In `EditPage.svelte`, replace the header block (currently lines 48-54) with:

```svelte
<div class="flex items-center justify-between gap-4">
  <div>
    <a href="/admin/{data.type}" class="text-sm opacity-70 hover:underline">← Back to {data.label}</a>
    <h1 class="mt-1 text-2xl font-bold">{data.isNew ? `New ${data.label} entry` : data.title}</h1>
    <p class="text-sm opacity-60">{data.label} · {data.path}</p>
  </div>
</div>
```

- [ ] **Step 2: Carry the create flag and adjust the save button**

In the `<form>` (currently lines 62-64), add a hidden `new` input right after the existing hidden inputs, so `saveCommit` can preserve create mode on a validation error:

```svelte
<form method="POST" action="/admin/save" class="mt-6 flex flex-col gap-5">
  <input type="hidden" name="type" value={data.type} />
  <input type="hidden" name="id" value={data.id} />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}
```

Then change the submit button label (currently line 123) to reflect the mode:

```svelte
    <button type="submit" class="btn btn-primary">{data.isNew ? 'Create & commit' : 'Save & commit'}</button>
```

Leave everything else (the Carta wiring, the field loop, the `fm*` helpers) unchanged.

- [ ] **Step 3: Verify the package builds**

Run: `cd cairn-cms && npx svelte-package`
Expected: clean; `dist/components/EditPage.svelte` emitted.

- [ ] **Step 4: Commit**

```bash
cd cairn-cms
git add src/lib/components/EditPage.svelte
git commit -m "feat(admin): EditPage create-mode label and per-collection back-link

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: adminIndexRedirect, /admin to the first collection

**Files:**
- Modify: `cairn-cms/src/lib/sveltekit/index.ts` (add near the top of the `/admin layout` section)
- Test: `cairn-cms/src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `cairn-cms/src/tests/sveltekit.test.ts`:

```ts
import { adminIndexRedirect } from '../lib/sveltekit';

describe('adminIndexRedirect', () => {
  it('redirects to the first collection', () => {
    try {
      adminIndexRedirect(adapter);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/posts');
    }
  });

  it('404s when no collections are configured', () => {
    try {
      adminIndexRedirect({ ...adapter, collections: [] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isHttpError(err)).toBe(true);
      expect((err as { status: number }).status).toBe(404);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: FAIL. `adminIndexRedirect` is not exported.

- [ ] **Step 3: Implement adminIndexRedirect**

In `cairn-cms/src/lib/sveltekit/index.ts`, just below the `adminLayoutLoad` function, add:

```ts
/**
 * The `/admin` index has no content of its own now that each collection is its own page; send
 * the editor straight to the first collection's entries list (a Sveltia-style landing).
 */
export function adminIndexRedirect(adapter: CairnAdapter): never {
  const first = adapter.collections[0];
  if (!first) throw error(404, 'No collections configured');
  throw redirect(307, `/admin/${first.type}`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd cairn-cms && npx vitest run src/tests/sveltekit.test.ts`
Expected: PASS (the whole file is green).

- [ ] **Step 5: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(admin): redirect /admin to the first collection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Wire the site route shims (BOTH sites, identically)

**Files (create or modify the SAME content in each site):**
- Create: `<site>/src/routes/admin/[collection]/+page.server.ts`
- Create: `<site>/src/routes/admin/[collection]/+page.svelte`
- Modify: `<site>/src/routes/admin/+page.server.ts`
- Modify: `<site>/src/routes/admin/+page.svelte`

where `<site>` is each of `/home/glw907/Projects/cairn/ecnordic-ski` and `/home/glw907/Projects/cairn/907-life`.

> The package source resolves instantly through the workspace symlink, so no publish is needed to test locally. The release (publish plus lockfile repoint) is Task 12's hand-off, not part of this task.

- [ ] **Step 1: Create the `[collection]` server shim in both sites**

Write this identical content to BOTH `ecnordic-ski/src/routes/admin/[collection]/+page.server.ts` and `907-life/src/routes/admin/[collection]/+page.server.ts`:

```ts
import type { Actions, PageServerLoad } from './$types';
import { collectionListLoad, createEntry } from '@glw907/cairn-cms/sveltekit';
import { cairn } from '$lib/cairn.config';

export const load: PageServerLoad = (event) => collectionListLoad(event, cairn);

export const actions: Actions = {
  create: (event) => createEntry(event, cairn),
};
```

- [ ] **Step 2: Create the `[collection]` page shim in both sites**

Write this identical content to BOTH `ecnordic-ski/src/routes/admin/[collection]/+page.svelte` and `907-life/src/routes/admin/[collection]/+page.svelte`:

```svelte
<script lang="ts">
  import { CollectionList } from '@glw907/cairn-cms/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<CollectionList {data} />
```

- [ ] **Step 3: Replace the `/admin` index server shim in both sites**

Overwrite BOTH `ecnordic-ski/src/routes/admin/+page.server.ts` and `907-life/src/routes/admin/+page.server.ts` with:

```ts
import type { PageServerLoad } from './$types';
import { adminIndexRedirect } from '@glw907/cairn-cms/sveltekit';
import { cairn } from '$lib/cairn.config';

export const load: PageServerLoad = () => adminIndexRedirect(cairn);
```

- [ ] **Step 4: Replace the `/admin` index page shim in both sites**

The load always redirects, so this page never renders; keep a minimal stub (SvelteKit still expects a `+page.svelte` for the route). Overwrite BOTH `ecnordic-ski/src/routes/admin/+page.svelte` and `907-life/src/routes/admin/+page.svelte` with:

```svelte
<!-- /admin redirects to the first collection in +page.server.ts; this never renders. -->
<p class="opacity-60">Redirecting…</p>
```

- [ ] **Step 5: Regenerate `$types` and confirm both sites resolve the package**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npx svelte-kit sync && npx svelte-check --threshold error
cd /home/glw907/Projects/cairn/907-life && npx svelte-kit sync && npx svelte-check --threshold error
```
Expected: both report `0 errors`. If `svelte-check` flags the new `[collection]` `$types`, the `svelte-kit sync` step regenerates them.

- [ ] **Step 6: Confirm the F2 byte-identical invariant still holds**

Run: `diff -rq /home/glw907/Projects/cairn/ecnordic-ski/src/routes/admin /home/glw907/Projects/cairn/907-life/src/routes/admin`
Expected: the new `[collection]` files and the changed `+page.*` files are byte-identical across the two sites. Investigate and fix any unexpected difference before committing.

- [ ] **Step 7: Commit in each site repo**

```bash
cd /home/glw907/Projects/cairn/ecnordic-ski
git add src/routes/admin/\[collection\]/+page.server.ts src/routes/admin/\[collection\]/+page.svelte src/routes/admin/+page.server.ts src/routes/admin/+page.svelte
git commit -m "feat(admin): collections-first nav and per-collection entries list

Consume cairn-cms Pass J: /admin redirects to the first collection;
/admin/[collection] lists its entries with a New entry flow.

Co-Authored-By: Claude <noreply@anthropic.com>"

cd /home/glw907/Projects/cairn/907-life
git add src/routes/admin/\[collection\]/+page.server.ts src/routes/admin/\[collection\]/+page.svelte src/routes/admin/+page.server.ts src/routes/admin/+page.svelte
git commit -m "feat(admin): collections-first nav and per-collection entries list

Consume cairn-cms Pass J: /admin redirects to the first collection;
/admin/[collection] lists its entries with a New entry flow.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Full quality gates (package plus both sites)

**Files:** none (verification only).

- [ ] **Step 1: Package test suite**

Run: `cd /home/glw907/Projects/cairn/cairn-cms && npm test`
Expected: PASS. The pre-Pass-J count was 48; this plan adds one suite (`sveltekit.test.ts`) with about 16 new cases, so expect roughly 64 tests across all suites. Confirm zero failures.

- [ ] **Step 2: Package build (publish path)**

Run: `cd /home/glw907/Projects/cairn/cairn-cms && npm run package`
Expected: clean `svelte-package`; `dist/` contains `sveltekit/index.js`, `components/CollectionList.svelte`, the updated `AdminLayout.svelte`/`EditPage.svelte`, and NO `components/AdminList.svelte`.

- [ ] **Step 3: Both sites type-check**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run check
cd /home/glw907/Projects/cairn/907-life && npm run check
```
Expected: both `0 errors, 0 warnings`. (Use each site's `svelte-check` skill if present.)

- [ ] **Step 4: Both sites build for Cloudflare**

Run:
```bash
cd /home/glw907/Projects/cairn/ecnordic-ski && npm run build
cd /home/glw907/Projects/cairn/907-life && npm run build
```
Expected: both succeed (Carta still bundles client-only; no SSR/Shiki breakage).

---

## Task 12: Live smoke plus pass-end ritual

**Files:** `cairn-cms/docs/PLAN.md` (progress log).

- [ ] **Step 1: Live `wrangler dev` smoke on BOTH sites**

For each site, start `wrangler dev` (pipe to `sleep infinity`), mint an editor and an owner session with `scripts/mint-session.mjs`, and confirm in Firefox at `http://localhost:8787`:
- `/admin` returns 307 to `/admin/<first-collection>` (ecnordic to `/admin/posts`, 907 to `/admin/posts`).
- The sidebar shows one nav entry **per collection** (ecnordic: Posts and Pages; 907: Posts) plus the owner-only Editors; the active entry highlights on the matching list and its edit pages.
- `/admin/posts` lists entries with title, date, and a Draft badge where `draft: true`; Pages entries (ecnordic) show just the title (no date/draft fields).
- "New entry" with a valid slug lands in the editor in create mode ("New … entry", "Create & commit"); an invalid or taken slug bounces back with the error shown.
- An existing entry still edits and saves. Do not commit junk to `main`: exercise the validation-error and conflict paths, or save a trivial no-op edit if confirming the commit path, matching the prior passes' posture.
- `/admin/login` (signed out) still renders the minimal centered shell with no drawer or nav.

Record the observed results in the progress-log entry (Step 4).

- [ ] **Step 2: Run code-simplifier over the changed package code**

Dispatch the `code-simplifier:code-simplifier` agent over the files changed this pass (`src/lib/sveltekit/index.ts`, `src/lib/components/{AdminLayout,CollectionList,EditPage}.svelte`, `src/lib/components/index.ts`). Review its suggestions; apply those that preserve behavior; re-run `npm test` plus both sites' `npm run check` after applying. Per the workstation Git convention, this runs before the work is considered shippable.

- [ ] **Step 3: Re-verify green after simplification**

Run: `cd /home/glw907/Projects/cairn/cairn-cms && npm test` and both sites' `npm run check`.
Expected: still all green.

- [ ] **Step 4: Update the cairn tracker**

Append a `### Pass J` entry to the **Notes / progress log** in `cairn-cms/docs/PLAN.md`: what was built (per-collection nav, the `/admin/[collection]` entries list, the create flow, the `/admin` redirect, `AdminList` retired), what was verified (test count, both-site check and build, the `wrangler dev` smoke results from Step 1, the `diff -rq` invariant), the Sveltia-alignment scope cuts (no summary template, file-collections, title-to-slug, or per-collection icons, listed as future additive options), and the standing user step (the Firefox visual confirmation). Update the NEXT-SESSION pointer to **Pass K** (differentiated editing, R4). Note that Pass J ships folded with Pass I as one cairn-cms minor (the release itself is the user-gated publish step, not this pass).

- [ ] **Step 5: Commit the tracker update**

```bash
cd /home/glw907/Projects/cairn/cairn-cms
git add docs/PLAN.md
git commit -m "docs(plan): record Pass J (collections-first nav and entries list)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> **Release (user-gated, NOT part of this pass):** publishing the cairn-cms minor (OIDC Trusted-Publishing), repointing both sites' pins, regenerating their standalone lockfiles, and confirming both CI deploys green is the Pass P pattern, folded with Pass I (and possibly Pass K). Do not push or publish without the user's go-ahead.

---

## Self-review (run by the planner)

**Spec coverage (§R3):**
- "Each adapter collection is a first-class sidebar nav entry (generated from `adapter.collections`)" maps to Tasks 1-2.
- "Selecting a collection opens its entries list (`/admin/[collection]`): entry title/slug, key metadata (date, draft badge)" maps to Tasks 3-4 (full metadata, the chosen option).
- "a 'new entry' affordance" maps to Tasks 4-8 (create flow included, the chosen option).
- "Replaces today's single stacked list" maps to Task 4 (retire `AdminList`) plus Task 9 (`/admin` redirect).
- "Nav grows automatically with the adapter, ecnordic Posts and Pages; 907 Posts" maps to Task 2 (maps over `adapter.collections`); verified in the Task 12 smoke.

**Placeholder scan:** every code step shows complete content; no TBD or TODO; test bodies are concrete.

**Type consistency:** `AdminLayoutData.collections: NavCollection[]` (Task 1) matches the component prop `{type,label}[]` (Task 2). `CollectionListData` (Task 3) is the prop type for `CollectionList` (Task 4) and the return of `collectionListLoad` consumed by the shim (Task 10). `CollectionEntry` fields (`id/path/title/date/draft`) are produced in Task 3 and consumed in Task 4. `EditData.isNew` (Task 6) is set by `editLoad`, read by `EditPage` (Task 8), and round-tripped via the hidden `new` input into `saveCommit`'s `newSuffix` (Task 7). `createEntry` (Task 5) redirects to `?new=1`, which `editLoad` (Task 6) keys on. `adminIndexRedirect` (Task 9) targets `/admin/<type>`, the route created in Task 10.

**Known deviations from a literal Sveltia clone** are deliberate and documented under "Sveltia alignment and deliberate scope cuts" (no summary-template engine, no file/singleton collections, no title-to-slug derivation, no per-collection icons, view filters, or sorting UI). None are R3 requirements.
