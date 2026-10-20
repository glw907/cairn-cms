# Pass K: differentiated editing, component palette, formatting toolbar, preview toggle (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the cairn admin editor into a differentiated, capable surface: page-vs-story editing driven by a collection `kind`, a registry-driven insert-component palette, the standard Carta formatting toolbar, and a toggleable preview, all in DaisyUI under the Warm Stone admin theme.

**Architecture:** A small adapter addition (`kind?: 'page' | 'story'` on `CairnCollection`) threads through the existing `cairn-cms/sveltekit` content loads into the shared `cairn-cms/components` editor. The palette reads the component registry that already ships on the adapter (`adapter.registry`), inserting at the cursor through a new package-internal `MarkdownEditor` interface backed by Carta's public `carta.input` API (verified sufficient). Both sites repoint as byte-identical shims; only `cairn.config.ts` differs.

**Tech Stack:** SvelteKit 2 plus Svelte 5 runes, `carta-md@4.11.2` (peer dep), DaisyUI v5, vitest, `svelte-package`. Spec: `docs/superpowers/specs/2026-05-27-pass-k-editing-design.md`.

---

## Background the implementer needs

- This is a **non-git workspace** with three git repos: `cairn-cms/` (the package, where most code lands), `ecnordic-ski/`, `907-life/` (the two consumer sites). Run package commands from `cairn-cms/`. The sites consume the package through an npm-workspace symlink, so package source edits are visible to the sites immediately, with no rebuild.
- The package exposes subpath exports: `cairn-cms` (lib barrel), `cairn-cms/sveltekit` (route server logic), `cairn-cms/components` (Svelte shell), `cairn-cms/auth`. Checked-in `exports` point at **source** (`./src/lib/...`); `publishConfig.exports` swap to `./dist/...` at publish. Do not touch the export wiring.
- **Component tests do not exist** and are out of scope: the package's vitest runs in a node env that cannot mount Carta. Svelte component changes (`EditPage`, `CollectionList`, the new `ComponentPalette`) are verified by `svelte-check` plus the live `wrangler dev` admin smoke, not unit tests. Pure logic (`slug.ts`, `editor.ts`, the `sveltekit` loads) gets unit tests, TDD.
- The sites import the package as `@glw907/cairn-cms` (note the scope); the package's own internal imports are relative (`../adapter`, `../render`).
- **Prose-guard hook is active.** When editing docs or code comments, write clean: no em dashes, vary sentence length. Code is exempt, but this plan deliberately keeps comments em-dash-free so the emitted source passes too.

### Commands

- Package tests: from `cairn-cms/`, `npm test` (vitest). Single file: `npm test -- src/tests/sveltekit.test.ts`.
- Package type-check and build: `npm run package` (runs `svelte-package`; emits `dist/`).
- Site type-check: from the site dir, `npm run check` (svelte-check). Run `npx svelte-kit sync` first if `$types` are stale.
- Site build: from the site dir, `npm run build` (Cloudflare adapter).

### Carta API (verified against `carta-md@4.11.2` types)

- `new Carta(options)` returns an instance; `carta.input` is an `InputEnhancer` (may be `undefined` until the editor mounts).
- `carta.input.getSelection()` returns `{ start: number; end: number; direction; slice: string }`.
- `carta.input.insertAt(position: number, string: string): void` (updates the textarea and the bound value).
- `<MarkdownEditor {carta} bind:value mode="tabs"|"split"|"auto" disableToolbar?={false} />`. The default toolbar (bold, italic, heading, link, list, quote, code) ships when `disableToolbar` is unset, so R11 means leaving it unset.

---

## File structure

**Package (`cairn-cms/`):**

- `src/lib/adapter.ts`: MODIFY. Add `kind?: 'page' | 'story'` to `CairnCollection`.
- `src/lib/slug.ts`: CREATE. `slugify(title)` pure helper for the create-entry form.
- `src/lib/editor.ts`: CREATE. The `MarkdownEditor` interface plus `cartaEditor(getCarta)` Carta-backed factory (the cursor seam).
- `src/lib/sveltekit/index.ts`: MODIFY. Thread `kind` into `CollectionListData` and `EditData`; forward a story `date` from `createEntry`; seed `frontmatter.date` for a new dated story in `editLoad`.
- `src/lib/components/EditPage.svelte`: MODIFY. Content-forward layout, kind-aware header, the palette plus preview-toggle control row, the `cartaEditor` wrapper, Carta's toolbar kept.
- `src/lib/components/ComponentPalette.svelte`: CREATE. DaisyUI dropdown over `registry.defs`, calls an `insert(template)` prop.
- `src/lib/components/CollectionList.svelte`: MODIFY. Kind-aware create form (title-to-slug, story gets a date input).
- `src/tests/sveltekit.test.ts`: MODIFY. Cover `kind` in the loads plus the story-date forwarding and seeding.
- `src/tests/slug.test.ts`: CREATE.
- `src/tests/editor.test.ts`: CREATE.

**Sites:**

- `ecnordic-ski/src/lib/cairn.config.ts`: MODIFY. `kind: 'page'` on the pages collection (posts stays default story).
- `ecnordic-ski/src/routes/admin/edit/[type]/[id]/+page.svelte`: MODIFY. Pass `registry={cairn.registry}`.
- `907-life/src/routes/admin/edit/[type]/[id]/+page.svelte`: MODIFY. Pass `registry={cairn.registry}` (undefined, so no palette).

---

## Task 1: Add `kind` to the collection contract and thread it through the loads

**Files:**
- Modify: `src/lib/adapter.ts:52-62`
- Modify: `src/lib/sveltekit/index.ts` (`CollectionListData`, `collectionListLoad`, `EditData`, `editLoad`)
- Test: `src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/sveltekit.test.ts`. First extend the fixture: give `pages` an explicit kind. Change the fixture `collections` to:

```ts
collections: [
  { type: 'posts', label: 'Posts', dir: 'src/content/posts', fields: [], validate: (d) => d },
  { type: 'pages', label: 'Pages', dir: 'src/content/pages', kind: 'page', fields: [], validate: (d) => d },
],
```

Then add these tests:

```ts
describe('collection kind', () => {
  it('collectionListLoad defaults an unmarked collection to story', async () => {
    mockFetch([{ match: '/contents/src/content/posts?', body: '[]' }]);
    const data = await collectionListLoad(listEvent('posts'), adapter);
    expect(data.kind).toBe('story');
  });

  it('collectionListLoad reports an explicit page kind', async () => {
    mockFetch([{ match: '/contents/src/content/pages?', body: '[]' }]);
    const data = await collectionListLoad(listEvent('pages'), adapter);
    expect(data.kind).toBe('page');
  });

  it('editLoad returns the collection kind', async () => {
    mockFetch([{ match: '/contents/src/content/pages/about.md', body: '# About', status: 200 }]);
    const data = await editLoad(editEvent('about', '', 'pages'), adapter);
    expect(data.kind).toBe('page');
  });
});
```

Note: `editEvent` currently hardcodes `type: 'posts'`. Widen its signature in the test helpers to accept a type:

```ts
const editEvent = (id: string, search = '', type = 'posts') => ({
  params: { type, id },
  url: new URL(`https://x/admin/edit/${type}/${id}${search}`),
  platform: { env: {} },
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/tests/sveltekit.test.ts`
Expected: FAIL. `data.kind` is `undefined` (property does not exist yet), and the TS types lack `kind`.

- [ ] **Step 3: Add `kind` to the contract**

In `src/lib/adapter.ts`, add the field to `CairnCollection` (after `label`):

```ts
export interface CairnCollection {
  /** Route `[type]` segment and list key, e.g. `posts`. */
  type: string;
  label: string;
  /**
   * Editing shape. `story` (the default when absent) is a dated feed entry; `page` is a
   * navigation-placed entry with a path-like slug and no date emphasis. Drives the create
   * form and the editor header. Never gates editing capability: the palette and toolbar are
   * available to both. (Pass K, R4.)
   */
  kind?: 'page' | 'story';
  /** Repo-relative folder holding the collection's markdown files. */
  dir: string;
  /** Editor form fields, rendered in order. */
  fields: CairnField[];
  /** Validate raw frontmatter (from the form) into the on-disk object, throwing on error. */
  validate(data: Record<string, unknown>, source: string): object;
}
```

- [ ] **Step 4: Thread `kind` through `collectionListLoad`**

In `src/lib/sveltekit/index.ts`, add `kind` to `CollectionListData`:

```ts
export interface CollectionListData {
  type: string;
  label: string;
  kind: 'page' | 'story';
  entries: CollectionEntry[];
  /** Set when the directory listing itself failed (rate limit, network). */
  error?: string;
  /** A create-flow error bounced back via `?error=` (an invalid or taken slug). */
  formError: string | null;
}
```

In `collectionListLoad`, set `kind` on both return paths. The error-path return becomes:

```ts
return {
  type: collection.type,
  label: collection.label,
  kind: collection.kind ?? 'story',
  entries: [],
  error: err instanceof Error ? err.message : 'Failed to load',
  formError,
};
```

and the success return becomes:

```ts
return {
  type: collection.type,
  label: collection.label,
  kind: collection.kind ?? 'story',
  entries,
  formError,
};
```

- [ ] **Step 5: Thread `kind` through `editLoad`**

Add `kind` to `EditData`:

```ts
export interface EditData {
  type: string;
  id: string;
  label: string;
  kind: 'page' | 'story';
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

In `editLoad`'s return object, add `kind: collection.kind ?? 'story',` (place it after `label`).

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/tests/sveltekit.test.ts`
Expected: PASS (all prior tests still green; the three new `collection kind` tests pass).

- [ ] **Step 7: Commit**

```bash
cd cairn-cms
git add src/lib/adapter.ts src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(adapter): add collection kind and thread it through the loads

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Forward a story's date at create time and seed it into the new entry

The create flow redirects into the editor in create mode (`?new=1`) with a blank document. For a story, collect a date at create and seed it into the new entry's frontmatter so the editor opens with the date set (no double entry).

**Files:**
- Modify: `src/lib/sveltekit/index.ts` (`createEntry`, `editLoad`)
- Test: `src/tests/sveltekit.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/sveltekit.test.ts`. The `createEvent` helper currently posts only an `id`; widen it to also carry an optional date:

```ts
const createEvent = (collection: string, id: string, date?: string) => {
  const form = new FormData();
  form.set('id', id);
  if (date) form.set('date', date);
  return {
    params: { collection },
    locals: { user: { id: 'u', name: 'U', email: 'u@x', role: 'owner' } },
    request: new Request('https://x', { method: 'POST', body: form }),
    platform: { env: {} },
    url: new URL(`https://x/admin/${collection}`),
  };
};
```

(If `createEvent` already exists with a different shape, replace it with the above; keep the existing positional `(collection, id)` calls working since `date` is optional.)

Then add:

```ts
describe('createEntry story date', () => {
  it('forwards a story date into the editor redirect', async () => {
    // posts is a story (no kind); the existence check read returns 404 (free slug).
    mockFetch([{ match: '/contents/src/content/posts/2026-05-fresh.md', body: '', status: 404 }]);
    try {
      await createEntry(createEvent('posts', '2026-05-fresh', '2026-05-20'), adapter);
      expect.unreachable('should redirect');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/posts/2026-05-fresh?new=1&date=2026-05-20');
    }
  });

  it('omits the date for a page kind even if posted', async () => {
    mockFetch([{ match: '/contents/src/content/pages/about.md', body: '', status: 404 }]);
    try {
      await createEntry(createEvent('pages', 'about', '2026-05-20'), adapter);
      expect.unreachable('should redirect');
    } catch (err) {
      expect(isRedirect(err)).toBe(true);
      expect((err as { location: string }).location).toBe('/admin/edit/pages/about?new=1');
    }
  });
});

describe('editLoad date seeding', () => {
  it('seeds frontmatter.date for a new dated story', async () => {
    mockFetch([{ match: '/contents/src/content/posts/2026-05-fresh.md', body: '', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-fresh', '?new=1&date=2026-05-20', 'posts'), adapter);
    expect(data.isNew).toBe(true);
    expect(data.frontmatter.date).toBe('2026-05-20');
  });

  it('does not seed a date when none is passed', async () => {
    mockFetch([{ match: '/contents/src/content/posts/2026-05-bare.md', body: '', status: 404 }]);
    const data = await editLoad(editEvent('2026-05-bare', '?new=1', 'posts'), adapter);
    expect(data.frontmatter.date).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/tests/sveltekit.test.ts`
Expected: FAIL. The redirect location lacks `&date=...`, and `frontmatter.date` is undefined for the seeding test.

- [ ] **Step 3: Forward the date in `createEntry`**

In `createEntry`, replace the final `throw redirect(...)` with a story-only date suffix:

```ts
  const kind = collection.kind ?? 'story';
  const date = String(form.get('date') ?? '').trim();
  const dateSuffix = kind === 'story' && date ? `&date=${encodeURIComponent(date)}` : '';

  throw redirect(303, `/admin/edit/${collection.type}/${id}?new=1${dateSuffix}`);
```

- [ ] **Step 4: Seed the date in `editLoad`**

In `editLoad`, right after the `const { data: frontmatter, content: body } = ...` line, seed the date when this is a new entry, a `date` query param is present, and the frontmatter has no date yet:

```ts
  const seedDate = event.url.searchParams.get('date');
  if (isNew && seedDate && frontmatter.date === undefined) {
    frontmatter.date = seedDate;
  }
```

(`frontmatter` is already a mutable `Record<string, unknown>`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/tests/sveltekit.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd cairn-cms
git add src/lib/sveltekit/index.ts src/tests/sveltekit.test.ts
git commit -m "feat(sveltekit): seed a story's date from create into the new entry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `slugify` helper for the create form

The create form derives an editable slug stem from the title so authors do not hand-type slugs.

**Files:**
- Create: `src/lib/slug.ts`
- Test: `src/tests/slug.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/slug.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { slugify } from '../lib/slug';

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips punctuation and collapses separators', () => {
    expect(slugify("Geoff's  First Post!!")).toBe('geoffs-first-post');
  });
  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Edge-- ')).toBe('edge');
  });
  it('returns empty for punctuation-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/tests/slug.test.ts`
Expected: FAIL. `Cannot find module '../lib/slug'`.

- [ ] **Step 3: Implement `slugify`**

Create `src/lib/slug.ts`:

```ts
// cairn-core: derive a filename-safe slug stem from a human title, for the create-entry form.
// The admin is filename-based (Pass E): this produces the editable stem an author can adjust,
// matching the server-side SLUG_RE (lowercase alphanumerics and internal hyphens). Pure.

/** Lowercase, replace non-alphanumeric runs with a single hyphen, trim edge hyphens. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/tests/slug.test.ts`
Expected: PASS.

- [ ] **Step 5: Export from the lib barrel**

In `src/lib/index.ts`, add `export * from './slug';` after `export * from './adapter';`.

- [ ] **Step 6: Run the full package suite**

Run: `npm test`
Expected: PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
cd cairn-cms
git add src/lib/slug.ts src/tests/slug.test.ts src/lib/index.ts
git commit -m "feat: add slugify helper for the create-entry form

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `MarkdownEditor` interface and Carta-backed wrapper (the cursor seam, P3)

The palette inserts at the cursor through this interface, not through Carta directly, so a future swap to a bare editor is contained to one file.

**Files:**
- Create: `src/lib/editor.ts`
- Test: `src/tests/editor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/editor.test.ts`. The test uses a hand-rolled stub of the slice of Carta the wrapper touches (`input.getSelection`, `input.insertAt`):

```ts
import { describe, it, expect, vi } from 'vitest';
import { cartaEditor } from '../lib/editor';

// A minimal Carta stand-in exposing only the `input` surface the wrapper reads.
function fakeCarta(start: number) {
  const insertAt = vi.fn();
  return {
    carta: {
      input: {
        getSelection: () => ({ start, end: start, direction: 'none' as const, slice: '' }),
        insertAt,
      },
    },
    insertAt,
  };
}

describe('cartaEditor', () => {
  it('inserts text at the current selection start', () => {
    const { carta, insertAt } = fakeCarta(12);
    const editor = cartaEditor(() => carta as never);
    editor.insertComponent(':::card\n\n:::\n');
    expect(insertAt).toHaveBeenCalledWith(12, ':::card\n\n:::\n');
  });

  it('is a no-op when the editor has not mounted yet (input undefined)', () => {
    const editor = cartaEditor(() => ({ input: undefined }) as never);
    expect(() => editor.insertComponent('x')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/tests/editor.test.ts`
Expected: FAIL. `Cannot find module '../lib/editor'`.

- [ ] **Step 3: Implement the interface and wrapper**

Create `src/lib/editor.ts`:

```ts
// cairn-core: the editor cursor seam (decision P3). The component palette and any later insert
// control talk to MarkdownEditor, never to Carta directly, so a swap to a different editing
// engine is contained to this file. The Carta implementation is verified against carta-md@4.11:
// `carta.input.getSelection()` and `carta.input.insertAt(pos, text)` are public.
import type { Carta } from 'carta-md';

/** The programmatic editing surface the admin relies on. */
export interface MarkdownEditor {
  /** Insert a component or template at the current cursor position. */
  insertComponent(template: string): void;
}

/**
 * Wrap a Carta instance as a MarkdownEditor. Takes a getter (not the instance) because the
 * EditPage component creates the Carta instance once and `carta.input` is only populated after
 * the editor mounts; reading it lazily at call time avoids capturing an undefined `input`.
 */
export function cartaEditor(getCarta: () => Carta): MarkdownEditor {
  return {
    insertComponent(template) {
      const input = getCarta().input;
      if (!input) return; // editor not mounted yet; nothing to insert into
      const { start } = input.getSelection();
      input.insertAt(start, template);
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/tests/editor.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full package suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd cairn-cms
git add src/lib/editor.ts src/tests/editor.test.ts
git commit -m "feat: add MarkdownEditor cursor seam with a Carta-backed wrapper

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `ComponentPalette.svelte` (DaisyUI insert dropdown)

A DaisyUI dropdown listing the site's registry components; selecting one calls an `insert` prop with the component's `insertTemplate`.

**Files:**
- Create: `src/lib/components/ComponentPalette.svelte`

(No unit test: Svelte component, verified by `svelte-check` in Task 8 and the live smoke in Task 9.)

- [ ] **Step 1: Write the component**

Create `src/lib/components/ComponentPalette.svelte`:

```svelte
<script lang="ts">
  // The insert-component palette (R10). Reads the site's component registry (R10a) and inserts a
  // scaffolded directive snippet at the cursor via the `insert` callback. DaisyUI dropdown so it
  // matches the Warm Stone admin theme. Shown only when the site supplies a non-empty registry; a
  // plain-markdown site (e.g. 907.life) passes no registry and this renders nothing.
  import type { ComponentRegistry } from '../render';

  let { registry, insert }: { registry?: ComponentRegistry; insert: (template: string) => void } =
    $props();

  const defs = $derived(registry?.defs ?? []);
</script>

{#if defs.length > 0}
  <div class="dropdown">
    <button type="button" tabindex="0" class="btn btn-sm btn-ghost">Insert ▾</button>
    <ul
      tabindex="0"
      class="dropdown-content menu z-10 mt-1 w-72 rounded-box border border-base-300 bg-base-100 p-2 shadow"
    >
      {#each defs as def (def.name)}
        <li>
          <button type="button" class="flex flex-col items-start gap-0.5" onclick={() => insert(def.insertTemplate)}>
            <span class="font-medium">{def.label}</span>
            <span class="text-xs opacity-60">{def.description}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
```

- [ ] **Step 2: Export from the components barrel**

In `src/lib/components/index.ts`, add after the `EditPage` export:

```ts
export { default as ComponentPalette } from './ComponentPalette.svelte';
```

- [ ] **Step 3: Commit**

```bash
cd cairn-cms
git add src/lib/components/ComponentPalette.svelte src/lib/components/index.ts
git commit -m "feat(components): add the insert-component palette (R10)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Rework `EditPage.svelte` for layout, palette, preview toggle, kind header

Pull the four editor features together. Content-forward layout (body prominent, frontmatter in a side column), a cairn DaisyUI control row hosting the palette and the preview toggle, the `cartaEditor` wrapper feeding the palette, a kind-aware header, and Carta's own toolbar kept for formatting (R11).

**Files:**
- Modify: `src/lib/components/EditPage.svelte` (full rewrite of the markup; script gains the wrapper, registry prop, and preview state)

(Verified by `svelte-check` and build in Task 8 and the live smoke in Task 9.)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/lib/components/EditPage.svelte` with:

```svelte
<script lang="ts">
  // The editor: a per-field frontmatter form (driven by the adapter's `fields`) beside a Carta
  // markdown editor whose preview runs the site plugin set (`preview`). Content-forward layout:
  // the editor is the prominent column, frontmatter sits in a side column (R4). A cairn control
  // row hosts the insert-component palette (R10) and the preview toggle (R12); basic formatting
  // stays on Carta's built-in toolbar (R11). Data comes from `editLoad` merged with the layout
  // load (siteName); `carta-md` is a peer dependency.
  import { onMount } from 'svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  import 'carta-md/default.css';
  import { previewCartaOptions, type PreviewPlugins } from '../carta';
  import type { CairnField } from '../adapter';
  import type { ComponentRegistry } from '../render';
  import type { EditData } from '../sveltekit';
  import { cartaEditor } from '../editor';
  import ComponentPalette from './ComponentPalette.svelte';

  let {
    data,
    preview,
    registry,
  }: { data: EditData & { siteName: string }; preview: PreviewPlugins; registry?: ComponentRegistry } =
    $props();

  // Body is editable state; the Carta editor's preview runs the exact site plugin set, so it
  // matches the live page. A hidden input carries the current value into the form.
  // svelte-ignore state_referenced_locally (seeding from the initial load is intended)
  let body = $state(data.body);

  // svelte-ignore state_referenced_locally (the preview plugin set is fixed for the load)
  const carta = new Carta(previewCartaOptions(preview));
  const editor = cartaEditor(() => carta);

  // Carta's MarkdownEditor must not render on the worker (it pulls Shiki). onMount fires only in
  // the browser, so SSR renders the plain textarea and the client swaps in the editor.
  let mounted = $state(false);

  // Preview toggle (R12), persisted per user. 'split' shows the live preview beside the editor;
  // 'tabs' foregrounds the editor full width with the preview one click away.
  let mode = $state<'split' | 'tabs'>('split');
  onMount(() => {
    mounted = true;
    const saved = localStorage.getItem('cairn-admin:preview');
    if (saved === 'tabs' || saved === 'split') mode = saved;
  });
  function togglePreview() {
    mode = mode === 'split' ? 'tabs' : 'split';
    localStorage.setItem('cairn-admin:preview', mode);
  }

  // svelte-ignore state_referenced_locally (form defaults from the initial load)
  const fm = data.frontmatter as Record<string, unknown>;

  function fmString(key: string): string {
    return typeof fm[key] === 'string' ? (fm[key] as string) : '';
  }
  function fmTags(key: string): Set<string> {
    return new Set(Array.isArray(fm[key]) ? (fm[key] as unknown[]).map(String) : []);
  }
  function fmFreeTags(key: string): string {
    return Array.isArray(fm[key]) ? (fm[key] as unknown[]).map(String).join(', ') : '';
  }

  // Kind-aware header: a story leads with its date; a page leads with its slug/path.
  const subtitle = $derived(
    data.kind === 'page' ? `Page · ${data.path}` : `${data.label} · ${fmString('date') || data.path}`,
  );
</script>

<svelte:head>
  <title>{data.isNew ? `New ${data.label} entry` : `Edit ${data.title}`} · {data.siteName} CMS</title>
</svelte:head>

<div class="flex items-center justify-between gap-4">
  <div>
    <a href="/admin/{data.type}" class="text-sm opacity-70 hover:underline">Back to {data.label}</a>
    <h1 class="mt-1 text-2xl font-bold">{data.isNew ? `New ${data.label} entry` : data.title}</h1>
    <p class="text-sm opacity-60">{subtitle}</p>
  </div>
</div>

{#if data.saved}
  <div class="alert alert-success mt-6"><span>Saved. Committed to main; the site will redeploy.</span></div>
{:else if data.error}
  <div class="alert alert-error mt-6"><span>{data.error}</span></div>
{/if}

<form method="POST" action="/admin/save" class="mt-6 flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start">
  <input type="hidden" name="type" value={data.type} />
  <input type="hidden" name="id" value={data.id} />
  {#if data.isNew}<input type="hidden" name="new" value="1" />{/if}

  <!-- Editor column (content-forward: first and widest) -->
  <div class="flex flex-col gap-3 lg:order-1">
    <div class="flex items-center justify-between gap-2">
      <ComponentPalette {registry} insert={(template) => editor.insertComponent(template)} />
      <button type="button" class="btn btn-sm btn-ghost" onclick={togglePreview}>
        {mode === 'split' ? 'Hide preview' : 'Show preview'}
      </button>
    </div>
    <div class="rounded-box border border-base-300 bg-base-100 p-2">
      <input type="hidden" name="body" value={body} />
      {#if mounted}
        <MarkdownEditor {carta} bind:value={body} {mode} />
      {:else}
        <textarea bind:value={body} rows="20" class="textarea w-full font-mono"></textarea>
      {/if}
    </div>
  </div>

  <!-- Frontmatter side column -->
  <fieldset class="grid gap-4 rounded-box border border-base-300 bg-base-100 p-6 lg:order-2">
    {#each data.fields as field (field.name)}
      {#if field.type === 'text' || field.type === 'date'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            name={field.name}
            required={field.required}
            value={fmString(field.name)}
            class="input w-full"
          />
        </label>
      {:else if field.type === 'textarea'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <textarea name={field.name} required={field.required} rows={field.rows ?? 4}
            class="textarea w-full">{fmString(field.name)}</textarea>
        </label>
      {:else if field.type === 'tags'}
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <div class="flex flex-wrap gap-3">
            {#each field.options as option (option)}
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" name={field.name} value={option}
                  checked={fmTags(field.name).has(option)} class="checkbox checkbox-sm" />
                {option}
              </label>
            {/each}
          </div>
        </div>
      {:else if field.type === 'freetags'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{field.label}</span>
          <input type="text" name={field.name} value={fmFreeTags(field.name)}
            placeholder={field.placeholder ?? 'comma, separated'} class="input w-full" />
        </label>
      {:else if field.type === 'boolean'}
        <label class="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name={field.name} checked={fm[field.name] === true} class="checkbox checkbox-sm" />
          {field.label}
        </label>
      {/if}
    {/each}

    <button type="submit" class="btn btn-primary mt-2">{data.isNew ? 'Create & commit' : 'Save & commit'}</button>
  </fieldset>
</form>
```

Key changes from the original, for review: the `<form>` becomes a two-column grid on `lg` (`[1fr_20rem]`); the editor column is `order-1` (content-forward), the frontmatter fieldset `order-2`; the save button moved into the fieldset; a control row above the editor holds `<ComponentPalette>` and the preview toggle; `mode` is now stateful (`split`/`tabs`) and persisted; the subtitle is kind-aware; Carta's toolbar is kept (no `disableToolbar`). The back-link and the saved-alert copy lost their em dash to satisfy prose-guard.

- [ ] **Step 2: Commit**

```bash
cd cairn-cms
git add src/lib/components/EditPage.svelte
git commit -m "feat(components): content-forward editor with palette and preview toggle

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(Type-checking happens against the sites in Task 8; `svelte-package` runs there too.)

---

## Task 7: Kind-aware create form in `CollectionList.svelte`

The create form derives an editable slug from a title; a story collection also collects a date (forwarded by `createEntry` from Task 2). Placeholders differ by kind.

**Files:**
- Modify: `src/lib/components/CollectionList.svelte`

(Verified by `svelte-check` and build in Task 8 and the live smoke in Task 9.)

- [ ] **Step 1: Rewrite the create form**

Replace the entire contents of `src/lib/components/CollectionList.svelte` with:

```svelte
<script lang="ts">
  // One collection's entries: a table (title, date, draft badge) linking into the editor, plus a
  // collapsible "New entry" form. The author types a title; the slug stem derives from it (R4) and
  // stays editable. A story collection also collects a date, which createEntry forwards so the new
  // entry opens with its date set. Placeholders differ by kind. The shell (AdminLayout) owns the
  // chrome and nav; this renders only the body.
  import type { CollectionListData } from '../sveltekit';
  import { slugify } from '../slug';

  let { data }: { data: CollectionListData } = $props();

  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);

  // Keep the slug in sync with the title until the author edits the slug directly.
  function onTitleInput(value: string) {
    title = value;
    if (!slugEdited) slug = slugify(value);
  }

  const slugPlaceholder = $derived(data.kind === 'page' ? 'about-us' : '2026-05-my-entry');
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
        <span class="text-sm font-medium">Title</span>
        <input
          type="text"
          value={title}
          oninput={(e) => onTitleInput(e.currentTarget.value)}
          placeholder="A human title"
          class="input w-full"
        />
      </label>

      {#if data.kind === 'story'}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Date</span>
          <input type="date" name="date" class="input w-full" />
        </label>
      {/if}

      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Slug</span>
        <input
          type="text"
          name="id"
          required
          bind:value={slug}
          oninput={() => (slugEdited = true)}
          placeholder={slugPlaceholder}
          pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
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

Note: the slug input keeps `name="id"` (what `createEntry` reads) and the title input is intentionally unnamed (client-only, drives the slug). The date input is `name="date"` and only present for stories.

- [ ] **Step 2: Commit**

```bash
cd cairn-cms
git add src/lib/components/CollectionList.svelte
git commit -m "feat(components): kind-aware create form with title-derived slug

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Wire both sites and verify package plus sites build

**Files:**
- Modify: `ecnordic-ski/src/lib/cairn.config.ts`
- Modify: `ecnordic-ski/src/routes/admin/edit/[type]/[id]/+page.svelte`
- Modify: `907-life/src/routes/admin/edit/[type]/[id]/+page.svelte`

- [ ] **Step 1: Mark ecnordic's pages collection as a page**

In `ecnordic-ski/src/lib/cairn.config.ts`, add `kind: 'page',` to the `pages` collection object (after its `dir` line). Leave `posts` unmarked (defaults to story):

```ts
    {
      type: 'pages',
      label: 'Pages',
      dir: 'src/content/pages',
      kind: 'page',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      validate: validatePageFrontmatter,
    },
```

- [ ] **Step 2: Pass the registry to EditPage on both sites**

In `ecnordic-ski/src/routes/admin/edit/[type]/[id]/+page.svelte`, change the `<EditPage>` line to:

```svelte
<EditPage {data} preview={cairn.preview} registry={cairn.registry} />
```

In `907-life/src/routes/admin/edit/[type]/[id]/+page.svelte`, make the identical change (907's `cairn.registry` is undefined, so the palette renders nothing and the byte-identical-shim invariant holds):

```svelte
<EditPage {data} preview={cairn.preview} registry={cairn.registry} />
```

- [ ] **Step 3: Build the package**

Run: from `cairn-cms/`, `npm run package`
Expected: PASS. `svelte-package` emits `dist/components/ComponentPalette.svelte`, the updated `EditPage.svelte`, `dist/editor.js`, `dist/slug.js`, and the updated `dist/sveltekit/index.js` and `.d.ts`, with no type errors.

- [ ] **Step 4: Type-check ecnordic**

Run: from `ecnordic-ski/`, `npx svelte-kit sync && npm run check`
Expected: PASS. 0 errors, 0 warnings.

- [ ] **Step 5: Type-check 907-life**

Run: from `907-life/`, `npx svelte-kit sync && npm run check`
Expected: PASS. 0 errors, 0 warnings.

- [ ] **Step 6: Build both sites**

Run: from `ecnordic-ski/`, `npm run build`; then from `907-life/`, `npm run build`
Expected: both succeed (Carta still client-only; bundle under the size wall).

- [ ] **Step 7: Confirm the admin route trees stay byte-identical**

Run: `diff -rq ecnordic-ski/src/routes/admin 907-life/src/routes/admin`
Expected: the edit `+page.svelte` change is identical on both, so this pass introduces no new difference. If the edit shims differ, reconcile them.

- [ ] **Step 8: Commit (per repo)**

```bash
cd ecnordic-ski
git add src/lib/cairn.config.ts "src/routes/admin/edit/[type]/[id]/+page.svelte"
git commit -m "feat(admin): mark pages as a page kind; pass registry to the editor

Co-Authored-By: Claude <noreply@anthropic.com>"

cd ../907-life
git add "src/routes/admin/edit/[type]/[id]/+page.svelte"
git commit -m "feat(admin): pass the (empty) registry to the editor

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Pass close-out (cairn-pass ritual)

- [ ] **Step 1: code-simplifier over the changed package code**

Dispatch the `code-simplifier:code-simplifier` subagent over the files changed this pass (`adapter.ts`, `slug.ts`, `editor.ts`, `sveltekit/index.ts`, `EditPage.svelte`, `ComponentPalette.svelte`, `CollectionList.svelte`). Review and apply its refinements; do not let it alter behavior.

- [ ] **Step 2: Full type-check plus tests once more**

Run: from `cairn-cms/`, `npm test && npm run package`
Expected: all tests PASS; `svelte-package` clean.

- [ ] **Step 3: Live admin smoke on both sites**

Follow `docs/admin-smoke-test.md`: start `wrangler dev`, mint an owner session via the site's `scripts/mint-session.mjs`, and run the checklist. For Pass K, additionally confirm on each site:

- A **story** entry (ecnordic Posts, 907 Posts): the editor shows the content-forward two-column layout, the header leads with the date, and the create form (New entry) shows Title, Date, and an auto-derived editable Slug.
- A **page** entry (ecnordic Pages): the header leads with the slug/path, and the create form shows Title and Slug (no Date).
- The **Insert palette** is present on ecnordic (seven components) and **absent** on 907; selecting a component inserts its template into the editor at the cursor.
- The **formatting toolbar** (Carta's) is present and styled under Warm Stone.
- The **preview toggle** switches between split and tabs and the choice persists across a reload.

Record the smoke results in the PLAN progress log (next step). The Firefox visual confirmation stays the standing user step.

- [ ] **Step 4: Update `docs/PLAN.md`**

Append a "Pass K" entry to the Notes / progress log: what was built (R4 kind plus the slug/date create flow, R10 palette, R11 toolbar kept, R12 preview toggle, the P3 `MarkdownEditor` seam), what was verified (tests, both sites check and build, the smoke results), and the editor-engine finding (Carta hooks sufficient; correct the "wrapper over CM6" note in risk #17 and `docs/ARCHITECTURE.md`). Note Pass K2 (R9 pickers) and Pass L (nav management) as the next New-Admin-UI items. Mark the release as folding into the same cairn-cms minor as Pass I and Pass J (Pass P pattern), not published this pass.

- [ ] **Step 5: Correct the Carta-is-CM6 inaccuracy**

In `docs/PLAN.md` risk #17 and in `docs/ARCHITECTURE.md` wherever Carta is called "a thin wrapper over CodeMirror 6," correct it to: Carta is textarea-based (`InputEnhancer` over an `HTMLTextAreaElement`); the fallback is a bare editor, not CM6. Keep the prose clean (prose-guard).

- [ ] **Step 6: Commit the docs**

```bash
cd cairn-cms
git add docs/PLAN.md docs/ARCHITECTURE.md docs/superpowers/specs/2026-05-27-pass-k-editing-design.md docs/superpowers/plans/2026-05-27-pass-k-editing.md
git commit -m "docs: record Pass K (differentiated editing, palette, preview toggle)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(Do not push; pushing is a user-gated step, and the release folds in with Pass I and Pass J.)

---

## Self-review notes (for the implementer)

- **Spec coverage:** R4 maps to Tasks 1, 2, 6 (kind, layout, header) and 7 (create flow); R10 and R10a map to Tasks 4, 5, 6 (seam, palette, wiring); R11 maps to Task 6 (Carta toolbar kept); R12 maps to Task 6 (preview toggle). The `MarkdownEditor` interface (P3) is Task 4. Site wiring is Task 8. Deferred R9 (Pass K2) and nav (Pass L) are out of scope by design.
- **No new adapter read path or contract beyond `kind`** (and `adapter.registry` already exists), keeping the pass within one reviewable unit.
- **Type consistency:** `kind: 'page' | 'story'` is the same union everywhere (adapter, `CollectionListData`, `EditData`); `cartaEditor(getCarta)` takes a getter and exposes `insertComponent`; `ComponentPalette` props are `{ registry?, insert }`; the create-form slug input keeps `name="id"`.
