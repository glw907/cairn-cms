# Admin UX rebuild plus dark mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cairn admin's list, sidebar, and topbar as an idiomatic DaisyUI v5 CMS admin with Lucide icons and a dark mode, on top of the self-styling stylesheet plan 1 shipped, preserving all `EditPage` and dialog behavior.

**Architecture:** The engine already ships a scoped, self-contained admin stylesheet (`dist/components/cairn-admin.css`), compiled from the component source by `scripts/build-admin-css.mjs` with an `@source` scan, so any DaisyUI or Tailwind class a rebuilt component adds ships automatically with no build change. This pass rewrites three thin components (`ConceptList`, `AdminLayout`) into a data-table list, an icon-and-user-menu sidebar, and a sticky breadcrumb topbar; adds a hand-authored dark variable block plus a topbar toggle persisted through a cookie the layout load reads for a zero-flash first paint; and adds `@lucide/svelte` as a runtime dependency with per-icon imports. `EditPage`, the dialogs, the alerts, and the live regions keep their logic unchanged.

**Tech Stack:** Svelte 5 runes, DaisyUI v5, Tailwind v4 (build-time, already wired), `@lucide/svelte` (new runtime dep, per-icon imports), Vitest with `vitest-browser-svelte` for the component project, `Intl.DateTimeFormat`.

**Scope note:** This is plan 2 of the "admin stands on its own" initiative (spec: `docs/superpowers/specs/2026-06-07-cairn-admin-stands-alone-design.md`, design section 2). It lands the UX rebuild and dark mode. Chrome isolation, the dev guard, the route-structure docs, and the showcase `(site)` group are plan 3 and are out of scope here. The sizing decision (UX and dark mode in one pass) and the dark first-paint decision (cookie read in the layout load) are recorded in the spec's sequencing and open-questions sections.

**Structural pass, then a polish pass.** This plan builds the structure and behavior test-first: correct, accessible, idiomatic DaisyUI markup with passing component tests and a green engine gate. It does not chase pixel fidelity against the SvelteForge reference. Once all tasks here land green, a separate `/frontend-design:frontend-design` pass refines the visual quality against the reference using the Playwright render-and-compare loop (see "After structural completion" at the end). Keeping the visual refinement out of the test-first loop is deliberate: the structural pass proves behavior, the polish pass tunes look.

**Key facts about this repo.**
- The admin components live in `src/lib/components/`. `@sveltejs/package` flattens `src/lib` to `dist`, so a component at `src/lib/components/X.svelte` ships at `dist/components/X.svelte`.
- The component test project runs in a real browser via `vitest-browser-svelte`. Tests render a component with `render(Component, { props })` and assert with `expect.element(...)`. Run one file with `npx vitest run src/tests/component/<file>`.
- `LayoutData` and `ListData` are defined in `src/lib/sveltekit/content-routes.ts` and re-exported from `@glw907/cairn-cms/sveltekit`. `EntrySummary` rows carry `{ id, title, date: string | null, draft: boolean }`.
- The admin theme variables and the scoped reset live in `src/lib/components/cairn-admin.css`. The light theme is `[data-theme='cairn-admin']`. The dark scope root `[data-theme='cairn-admin-dark']` is already named in the reset (plan 1) but has no variables yet.
- The showcase (`examples/showcase`) consumes the engine through its `dist` export condition and ships no Tailwind and no DaisyUI. Its authed admin shell is `examples/showcase/src/routes/admin/(app)/+layout.svelte`, which renders `AdminLayout`. The admin layout load is `examples/showcase/src/routes/admin/(app)/+layout.server.ts` and delegates to `routes.layoutLoad`.
- The current version on `main` is `0.31.0`, unpublished. This pass bumps `0.32.0`.

---

### Task 1: Add Lucide and the admin icon module

The admin chrome uses a fixed, small set of glyphs (menu, search, sort arrows, edit, delete, add, sign-out, user, sun, moon, chevrons). A per-icon import keeps the bundle to only the glyphs in use. A single re-export module gives the components one import surface and documents the set for the later polish pass.

**Files:**
- Modify: `package.json` (dependencies)
- Create: `src/lib/components/admin-icons.ts`
- Test: `src/tests/component/admin-icons.test.ts`

- [ ] **Step 1: Install Lucide as a runtime dependency**

Run from the repo root:

```bash
npm i @lucide/svelte@latest
```

`@lucide/svelte` is MIT with a Svelte 5 peer. It belongs in `dependencies` (not `devDependencies`), because the admin components import it at runtime and a consumer that mounts the admin needs it resolved transitively.

- [ ] **Step 2: Confirm the per-icon import path resolves**

Run:

```bash
node -e "import('@lucide/svelte/icons/menu').then((m) => { if (!m.default) throw new Error('no default export'); console.log('ok', typeof m.default); })"
```

Expected: `ok function`. This confirms the `@lucide/svelte/icons/<name>` subpath used below resolves against the installed version. If it does not, check the installed package's `exports` for the icon subpath shape and adjust the import paths in Step 4 to match before continuing.

- [ ] **Step 3: Write the failing test**

Create `src/tests/component/admin-icons.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as icons from '../../lib/components/admin-icons.js';

describe('admin-icons', () => {
  it('re-exports every chrome glyph the admin uses as a component', () => {
    const expected = [
      'MenuIcon', 'SearchIcon', 'ArrowUpIcon', 'ArrowDownIcon', 'ChevronsUpDownIcon',
      'PencilIcon', 'Trash2Icon', 'PlusIcon', 'LogOutIcon', 'SunIcon', 'MoonIcon',
      'ChevronLeftIcon', 'ChevronRightIcon',
    ];
    for (const name of expected) {
      expect(icons, `missing ${name}`).toHaveProperty(name);
      expect(typeof (icons as Record<string, unknown>)[name], `${name} is not a component`).toBe('function');
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/tests/component/admin-icons.test.ts`
Expected: FAIL, cannot resolve `../../lib/components/admin-icons.js` (the module does not exist yet).

- [ ] **Step 5: Create the icon module**

Create `src/lib/components/admin-icons.ts`:

```ts
// The fixed set of Lucide glyphs the admin chrome uses, each a per-icon import so only these ship.
// Components import from here, which keeps one import surface and documents the chrome's icon set.
export { default as MenuIcon } from '@lucide/svelte/icons/menu';
export { default as SearchIcon } from '@lucide/svelte/icons/search';
export { default as ArrowUpIcon } from '@lucide/svelte/icons/arrow-up';
export { default as ArrowDownIcon } from '@lucide/svelte/icons/arrow-down';
export { default as ChevronsUpDownIcon } from '@lucide/svelte/icons/chevrons-up-down';
export { default as PencilIcon } from '@lucide/svelte/icons/pencil';
export { default as Trash2Icon } from '@lucide/svelte/icons/trash-2';
export { default as PlusIcon } from '@lucide/svelte/icons/plus';
export { default as LogOutIcon } from '@lucide/svelte/icons/log-out';
export { default as SunIcon } from '@lucide/svelte/icons/sun';
export { default as MoonIcon } from '@lucide/svelte/icons/moon';
export { default as ChevronLeftIcon } from '@lucide/svelte/icons/chevron-left';
export { default as ChevronRightIcon } from '@lucide/svelte/icons/chevron-right';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/tests/component/admin-icons.test.ts`
Expected: PASS (1 test).

- [ ] **Step 7: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add package.json package-lock.json src/lib/components/admin-icons.ts src/tests/component/admin-icons.test.ts
git commit -m "Add Lucide and the admin icon module"
```

---

### Task 2: Carry the user email and the resolved theme through the layout load

The sidebar user menu needs the editor's email (today `LayoutData.user` carries only `displayName` and `role`, though `Editor` already has `email`). The dark-mode toggle needs an SSR-resolved theme so the first paint matches the persisted choice with no flash. Both land in `LayoutData`, read in `layoutLoad`.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (the `LayoutData` interface, the `ContentEvent` interface, and `layoutLoad`)
- Test: `src/tests/unit/content-routes-list.test.ts` (add a layout-load describe block)

- [ ] **Step 1: Write the failing test**

Add this block to `src/tests/unit/content-routes-list.test.ts`. First open the file and read its existing imports and the runtime/event fixtures it already builds (it exercises `listLoad`, so it has a runtime and a `ContentEvent` factory). Reuse those fixtures. If the file builds its event inline, mirror that shape. The new block:

```ts
describe('layoutLoad', () => {
  it('carries the editor email and resolves the theme from the cookie', () => {
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'owner' },
      cookies: { 'cairn-admin-theme': 'cairn-admin-dark' },
    });
    const data = routes.layoutLoad(event);
    expect(data.user.email).toBe('ed@example.com');
    expect(data.theme).toBe('cairn-admin-dark');
  });

  it('defaults the theme to light when no cookie is set', () => {
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: {},
    });
    expect(routes.layoutLoad(event).theme).toBe('cairn-admin');
  });

  it('ignores an unknown cookie value and falls back to light', () => {
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeEvent({
      pathname: '/admin/posts',
      editor: { email: 'ed@example.com', displayName: 'Ed', role: 'editor' },
      cookies: { 'cairn-admin-theme': 'bogus' },
    });
    expect(routes.layoutLoad(event).theme).toBe('cairn-admin');
  });
});
```

Adapt `makeEvent` to the file's existing helper name and shape. The helper must let a test set `locals.editor`, `url.pathname`, and a `cookies` map exposed as `event.cookies.get(name)`. If the existing helper does not build `cookies`, extend it: add a `cookies` option that becomes `{ get: (name: string) => opts.cookies?.[name] }`. Keep `email` on the editor fixture, which `Editor` already requires.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/content-routes-list.test.ts`
Expected: FAIL: `data.user.email` is undefined and `data.theme` does not exist (type error on `.theme`, and the assertion fails at runtime).

- [ ] **Step 3: Extend the types and `layoutLoad`**

In `src/lib/sveltekit/content-routes.ts`, change the `LayoutData` interface so `user` carries `email` and add a `theme` field:

```ts
/** The admin layout's data: site identity, the signed-in user, the nav, the active path, and theme. */
export interface LayoutData {
  siteName: string;
  user: { displayName: string; email: string; role: Role };
  concepts: NavConcept[];
  pathname: string;
  canManageEditors: boolean;
  /** The nav menu's label when the site configures one; gates the Navigation nav entry. Null otherwise. */
  navLabel: string | null;
  /** The admin theme resolved for SSR: the persisted cookie choice, or the light default. */
  theme: 'cairn-admin' | 'cairn-admin-dark';
}
```

Add an optional `cookies` reader to `ContentEvent` (a real SvelteKit `RequestEvent` satisfies it; the value is `event.cookies`):

```ts
export interface ContentEvent {
  url: URL;
  params: Record<string, string>;
  request: Request;
  locals: { editor?: Editor | null };
  platform?: { env?: GithubKeyEnv };
  /** SvelteKit's cookie jar; the layout load reads the persisted admin theme. Optional for non-route callers. */
  cookies?: { get(name: string): string | undefined };
}
```

Rewrite `layoutLoad` to carry the email and resolve the theme:

```ts
  /** Layout load for every admin page: the nav, the user, the active path, and the resolved theme. */
  function layoutLoad(event: ContentEvent): LayoutData {
    const editor = sessionOf(event);
    const cookieTheme = event.cookies?.get('cairn-admin-theme');
    const theme = cookieTheme === 'cairn-admin-dark' ? 'cairn-admin-dark' : 'cairn-admin';
    return {
      siteName: runtime.siteName,
      user: { displayName: editor.displayName, email: editor.email, role: editor.role },
      concepts: runtime.concepts.map((c) => ({ id: c.id, label: c.label })),
      pathname: event.url.pathname,
      canManageEditors: editor.role === 'owner',
      navLabel: runtime.navMenu?.label ?? null,
      theme,
    };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/content-routes-list.test.ts`
Expected: PASS (the new block plus the existing list tests).

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings. The `AdminLayout` test fixture builds a `data.user` without `email`; svelte-check may not flag the test object literal, but if it does, that is fixed in Task 7 where the layout and its test are rewritten. If `npm run check` reports an error on the existing `AdminLayout.test.ts` `data()` helper, add `email: 'ed@example.com'` to its `user` literal now to keep the gate green.

```bash
git add src/lib/sveltekit/content-routes.ts src/tests/unit/content-routes-list.test.ts
git commit -m "Carry the user email and the resolved theme through the admin layout load"
```

---

### Task 3: Author the dark Warm Stone palette

Dark mode is a second hand-authored variable block mirroring Warm Stone in dark tones. DaisyUI reads variables at the point of use, so the same compiled component classes render under either theme. The block lives in the theme partial, so the `package` build compiles and scopes it into the shipped sheet with no build change.

**Files:**
- Modify: `src/lib/components/cairn-admin.css`
- Test: `src/tests/unit/engine-isolation.test.ts` (add a dark-theme assertion)

- [ ] **Step 1: Write the failing assertion**

Open `src/tests/unit/engine-isolation.test.ts` and read how it loads the partial (it reads `src/lib/components/cairn-admin.css` as text and asserts scoping). Add one test to its describe block:

```ts
  it('defines a dark Warm Stone palette under the dark theme root', () => {
    // css is the partial's text, loaded the same way the existing tests load it. Reuse that variable.
    const dark = css.slice(css.indexOf("[data-theme='cairn-admin-dark']"));
    expect(css).toContain("[data-theme='cairn-admin-dark'] {");
    expect(dark).toContain('color-scheme: dark');
    for (const token of ['--color-base-100', '--color-base-content', '--color-primary', '--color-error']) {
      expect(dark, `dark theme missing ${token}`).toContain(token);
    }
  });
```

If the existing tests do not expose the partial text as a reusable `css` variable, read the file at the top of this test with `readFileSync` mirroring the existing pattern in that file, and name it so this test compiles.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/unit/engine-isolation.test.ts`
Expected: FAIL: the partial has no `[data-theme='cairn-admin-dark'] {` variable block yet (the dark root appears only in the shared reset selector list).

- [ ] **Step 3: Add the dark variable block**

In `src/lib/components/cairn-admin.css`, insert this block after the closing `}` of the `[data-theme='cairn-admin']` variable block and before the scoped-reset comment:

```css

/* Warm Stone, dark. Mirrors the light palette in dark tones, keeping the same hues (the warm 75 and
   the violet 293 primary) so the admin reads as one theme under either mode. DaisyUI v5 reads these
   at point of use, so the compiled component classes need no change. The muted and subtle tones keep
   >= 4.5:1 contrast on the dark bases. The polish pass tunes these values against the reference. */
[data-theme='cairn-admin-dark'] {
  color-scheme: dark;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  --color-base-100: oklch(23% 0.008 75);
  --color-base-200: oklch(20% 0.008 75);
  --color-base-300: oklch(27% 0.01 75);
  --color-base-content: oklch(92% 0.006 75);

  --color-primary: oklch(68% 0.18 293);
  --color-primary-content: oklch(20% 0.04 293);
  --color-secondary: oklch(72% 0.02 75);
  --color-secondary-content: oklch(20% 0.008 75);
  --color-accent: oklch(70% 0.14 300);
  --color-accent-content: oklch(20% 0.04 300);
  --color-neutral: oklch(80% 0.01 75);
  --color-neutral-content: oklch(22% 0.008 75);

  --color-info: oklch(72% 0.12 240);
  --color-info-content: oklch(20% 0.04 240);
  --color-success: oklch(70% 0.12 150);
  --color-success-content: oklch(20% 0.04 150);
  --color-warning: oklch(80% 0.14 70);
  --color-warning-content: oklch(24% 0.05 70);
  --color-error: oklch(70% 0.18 25);
  --color-error-content: oklch(20% 0.04 25);

  /* Accessible muted text tones on the dark bases. */
  --color-muted: oklch(72% 0.01 75);
  --color-subtle: oklch(80% 0.008 75);

  --radius-selector: 0.5rem;
  --radius-field: 0.5rem;
  --radius-box: 0.75rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/unit/engine-isolation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/cairn-admin.css src/tests/unit/engine-isolation.test.ts
git commit -m "Author the dark Warm Stone palette"
```

---

### Task 4: Rebuild the concept list as a data-table

`ConceptList` becomes a DaisyUI `table` with a search filter, a result count, sortable Title and Date headers (asc and desc indicators), a status badge column, a formatted date column, a search-aware empty state, and client-side pagination with a page-size control. Filtering, sorting, and pagination run over the loaded `data.entries` in component state. The new-entry create form moves out in Task 5; this task keeps it in place (and a header "New" button placeholder is wired in Task 5), so the list display is verified on its own first.

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Test: `src/tests/component/ConceptList.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Replace the body of the `describe('ConceptList', ...)` in `src/tests/component/ConceptList.test.ts` with these tests. Keep the existing `data()` helper, and extend its default `entries` to a set large enough to page (add rows so there are at least 12 entries, varied titles and dates, one draft). Use this `data()`:

```ts
function data(over = {}) {
  const entries = Array.from({ length: 12 }, (_, i) => ({
    id: `2026-05-${String(i + 1).padStart(2, '0')}-post-${i + 1}`,
    title: `Post ${String(i + 1).padStart(2, '0')}`,
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    draft: i === 1,
  }));
  return { conceptId: 'posts', label: 'Posts', dated: true, entries, error: null, formError: null, ...over };
}
```

The tests:

```ts
  it('renders entries as table rows linking to their editor', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByRole('link', { name: 'Post 01' })).toHaveAttribute('href', '/admin/posts/2026-05-01-post-1');
  });

  it('flags a draft row with a status badge', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument();
  });

  it('filters rows by a search query and shows a result count', async () => {
    const screen = render(ConceptList, { data: data() });
    const search = screen.getByRole('searchbox', { name: /search/i });
    await search.fill('Post 03');
    await expect.element(screen.getByRole('link', { name: 'Post 03' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Post 01' })).not.toBeInTheDocument();
    await expect.element(screen.getByText(/1 of 12/i)).toBeInTheDocument();
  });

  it('shows a search-aware empty state when nothing matches', async () => {
    const screen = render(ConceptList, { data: data() });
    await screen.getByRole('searchbox', { name: /search/i }).fill('no such title');
    await expect.element(screen.getByText(/no entries match/i)).toBeInTheDocument();
  });

  it('shows a first-run empty state when the concept has no entries', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await expect.element(screen.getByText(/no entries yet/i)).toBeInTheDocument();
  });

  it('paginates and exposes a page-size control', async () => {
    const screen = render(ConceptList, { data: data() });
    // Default page size 10, so 12 entries paginate to two pages: page 1 shows 10 rows.
    await expect.element(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /next page/i }).click();
    await expect.element(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it('sorts by title when the Title header is toggled', async () => {
    const screen = render(ConceptList, { data: data() });
    const header = screen.getByRole('button', { name: /sort by title/i });
    await header.click(); // ascending
    await header.click(); // descending
    const links = screen.container.querySelectorAll('tbody a');
    expect(links[0].textContent).toContain('Post 12');
  });

  it('shows an inline error when listing failed', async () => {
    const screen = render(ConceptList, { data: data({ error: 'Could not load this content type from GitHub.', entries: [] }) });
    await expect.element(screen.getByText(/could not load/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tests/component/ConceptList.test.ts`
Expected: FAIL (no searchbox, no pagination controls, no sortable headers in the current flat menu).

- [ ] **Step 3: Rebuild the component**

Replace `src/lib/components/ConceptList.svelte` with this. The create form and the slug-auto-derive state move behind a header button in Task 5; for now keep the existing create form below the table so the create-flow tests still pass, and add a header that will host the New button. Keep the `data` prop shape (`ListData`).

```svelte
<!--
@component
One concept's list view as a DaisyUI data-table: a search filter, a result count, sortable Title and
Date headers, a status badge, a formatted date, and client-side pagination with a page-size control.
Filtering, sorting, and paging run over the loaded entries in component state, which suits typical
content sizes. The new-entry form lives below; Task 5 moves it behind the header New button.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { ListData } from '../sveltekit/content-routes.js';
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from './admin-icons.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
  }

  let { data }: Props = $props();

  type SortKey = 'title' | 'date';
  let query = $state('');
  let sortKey = $state<SortKey>('date');
  let sortAsc = $state(false);
  let pageSize = $state(10);
  let page = $state(1);

  const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  function formatDate(iso: string | null): string {
    if (!iso) return '';
    const parsed = new Date(`${iso}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? iso : dateFmt.format(parsed);
  }

  const filtered = $derived(
    data.entries.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      const av = sortKey === 'title' ? a.title.toLowerCase() : (a.date ?? '');
      const bv = sortKey === 'title' ? b.title.toLowerCase() : (b.date ?? '');
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    }),
  );

  const pageCount = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
  // Clamp the page when filtering shrinks the result set below the current page.
  $effect(() => {
    if (page > pageCount) page = pageCount;
  });
  const pageRows = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));

  function toggleSort(key: SortKey) {
    if (sortKey === key) sortAsc = !sortAsc;
    else {
      sortKey = key;
      sortAsc = true;
    }
    page = 1;
  }

  // --- create form state (moves behind the header New button in Task 5) ---
  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);
  let dateDefault = $state('');
  $effect(() => {
    dateDefault = new Date().toISOString().slice(0, 10);
  });
  const derivedSlug = $derived(slugEdited ? slug : slugify(title));
  const slugPlaceholder = $derived(data.dated ? 'my-entry' : 'about-us');
</script>

<header class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl font-semibold">{data.label}</h1>
  <label class="input input-sm w-full max-w-xs">
    <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
    <input type="search" role="searchbox" aria-label="Search {data.label}" bind:value={query} placeholder="Search" oninput={() => (page = 1)} />
  </label>
</header>

{#if data.formError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

<div class="rounded-box border border-base-300 bg-base-100 mb-2 overflow-x-auto">
  {#if data.entries.length === 0}
    <p class="p-4 text-sm opacity-70">No entries yet. Create the first one below.</p>
  {:else if sorted.length === 0}
    <p class="p-4 text-sm opacity-70">No entries match "{query}".</p>
  {:else}
    <table class="table">
      <thead>
        <tr>
          <th>
            <button type="button" class="inline-flex items-center gap-1" aria-label="Sort by title" onclick={() => toggleSort('title')}>
              Title
              {#if sortKey === 'title'}
                {#if sortAsc}<ArrowUpIcon class="h-3 w-3" />{:else}<ArrowDownIcon class="h-3 w-3" />{/if}
              {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" />{/if}
            </button>
          </th>
          {#if data.dated}
            <th>
              <button type="button" class="inline-flex items-center gap-1" aria-label="Sort by date" onclick={() => toggleSort('date')}>
                Date
                {#if sortKey === 'date'}
                  {#if sortAsc}<ArrowUpIcon class="h-3 w-3" />{:else}<ArrowDownIcon class="h-3 w-3" />{/if}
                {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" />{/if}
              </button>
            </th>
          {/if}
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each pageRows as entry (entry.id)}
          <tr>
            <td><a class="link link-hover font-medium" href={`/admin/${data.conceptId}/${entry.id}`}>{entry.title}</a></td>
            {#if data.dated}<td class="text-sm text-[var(--color-muted)]">{formatDate(entry.date)}</td>{/if}
            <td>
              {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>
              {:else}<span class="badge badge-ghost badge-sm">Published</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if data.entries.length > 0}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm">
    <span class="text-[var(--color-muted)]">{sorted.length} of {data.entries.length}</span>
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1">
        <span class="sr-only">Rows per page</span>
        <select class="select select-sm" bind:value={pageSize} onchange={() => (page = 1)} aria-label="Rows per page">
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </label>
      <button type="button" class="btn btn-sm btn-ghost" aria-label="Previous page" disabled={page <= 1} onclick={() => (page -= 1)}>
        <ChevronLeftIcon class="h-4 w-4" />
      </button>
      <span>Page {page} of {pageCount}</span>
      <button type="button" class="btn btn-sm btn-ghost" aria-label="Next page" disabled={page >= pageCount} onclick={() => (page += 1)}>
        <ChevronRightIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
{/if}

<form method="POST" action="?/create" class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
  <h2 class="text-sm font-semibold">New entry</h2>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Title</span>
    <input class="input" name="title" bind:value={title} required />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Slug</span>
    <input
      class="input"
      name="slug"
      placeholder={slugPlaceholder}
      value={derivedSlug}
      oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
    />
  </label>
  {#if data.dated}
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Date</span>
      <input class="input" type="date" name="date" value={dateDefault} />
    </label>
  {/if}
  <button type="submit" class="btn btn-primary self-start">Create</button>
</form>
```

The existing create-flow tests (`auto-derives the slug`, `shows a date input`, `omits the date input`, `date-free slug placeholder`) still pass against this markup, because the form below is unchanged. Keep those tests.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tests/component/ConceptList.test.ts`
Expected: PASS (the new table tests and the retained create-flow tests). If a `vitest-browser-svelte` screenshot baseline under `__screenshots__/ConceptList.test.ts/` no longer matches, delete the stale baseline files for the renamed tests so the run regenerates them; the visual baseline is re-anchored in the polish pass.

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add src/lib/components/ConceptList.svelte src/tests/component/ConceptList.test.ts
git commit -m "Rebuild the concept list as a searchable, sortable data-table"
```

---

### Task 5: Move the new-entry create form behind a header button

The create affordance becomes a primary-action button in the list header that opens a DaisyUI dialog holding the title, slug, and date fields, keeping cairn's slug auto-derive. A native `<dialog>` element matches cairn's existing dialog convention (`DeleteDialog`, `RenameDialog` use `<dialog>`).

**Files:**
- Modify: `src/lib/components/ConceptList.svelte`
- Test: `src/tests/component/ConceptList.test.ts` (adjust the create-flow tests to open the dialog first)

- [ ] **Step 1: Update the failing tests**

Read `src/lib/components/DeleteDialog.svelte` and `src/lib/components/RenameDialog.svelte` first to copy the repo's `<dialog>` open and close idiom (a `bind:this` on the dialog, `dialog.showModal()`, and a close button). Then change the create-flow tests so they click the header New button to open the dialog before asserting the fields. Replace the four create-flow tests with:

```ts
  it('opens a create dialog from the header New button and auto-derives the slug', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).click();
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    await expect.element(screen.getByLabelText(/slug/i)).toHaveValue('my-new-post');
  });

  it('shows a date input defaulted to today for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).click();
    const date = screen.getByLabelText('Date');
    await expect.element(date).toBeVisible();
    await expect.poll(() => (date.element() as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the date input for a non-dated concept', async () => {
    const screen = render(ConceptList, { data: data({ conceptId: 'pages', label: 'Pages', dated: false, entries: [] }) });
    await screen.getByRole('button', { name: /new pages/i }).click();
    expect(screen.container.querySelector('input[name="date"]')).toBeNull();
  });

  it('uses a date-free slug placeholder for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).click();
    await expect.element(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'my-entry');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tests/component/ConceptList.test.ts`
Expected: FAIL: there is no "New Posts" button and the form is not in a dialog yet.

- [ ] **Step 3: Move the form into a header-triggered dialog**

In `src/lib/components/ConceptList.svelte`, import the `PlusIcon`, add a dialog ref, replace the standalone `<form>` at the bottom with a `<dialog>` wrapping the same form, and add the New button to the header. Add to the imports:

```ts
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './admin-icons.js';
```

Add the dialog ref to the script:

```ts
  let createDialog = $state<HTMLDialogElement>();
```

Change the header to carry the New button (place it after the search label, inside the `<header>`):

```svelte
  <button type="button" class="btn btn-primary btn-sm" onclick={() => createDialog?.showModal()}>
    <PlusIcon class="h-4 w-4" /> New {data.label}
  </button>
```

Replace the bottom `<form ...>...</form>` block with a dialog wrapping the same fields:

```svelte
<dialog bind:this={createDialog} class="modal">
  <div class="modal-box" data-theme="cairn-admin">
    <h2 class="mb-3 text-base font-semibold">New {data.label}</h2>
    <form method="POST" action="?/create" class="flex flex-col gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Title</span>
        <input class="input w-full" name="title" bind:value={title} required />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Slug</span>
        <input
          class="input w-full"
          name="slug"
          placeholder={slugPlaceholder}
          value={derivedSlug}
          oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
        />
      </label>
      {#if data.dated}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Date</span>
          <input class="input w-full" type="date" name="date" value={dateDefault} />
        </label>
      {/if}
      <div class="modal-action">
        <button type="button" class="btn btn-ghost" onclick={() => createDialog?.close()}>Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
```

The `data-theme="cairn-admin"` on the `modal-box` is needed because a native `<dialog>` renders in the top layer outside the admin root, so it must re-assert the theme to stay styled (mirror whatever `DeleteDialog`/`RenameDialog` do; if they set `data-theme` on the modal-box, match it; if they rely on the toggle's runtime attribute, follow Task 8's pattern). Confirm against those files in Step 1.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tests/component/ConceptList.test.ts`
Expected: PASS (all list and create-flow tests).

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add src/lib/components/ConceptList.svelte src/tests/component/ConceptList.test.ts
git commit -m "Move the new-entry create form behind a header primary-action button"
```

---

### Task 6: Add per-row delete reusing the inbound-link guard

Each row gains a delete action. Delete carries the block-until-clean inbound-link guard the editor already enforces, so the row delete reuses that guard rather than reimplementing it. The engine extracts the shared delete core so the existing editor `deleteAction` (id from `params`) and a new `listDeleteAction` (id from the form body) call the same guard-and-commit path. The list shim wires a `?/delete` action, and the row opens the existing `DeleteDialog`.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (extract `deleteEntry` core; add `listDeleteAction`; export it from the returned object)
- Modify: `src/lib/components/ConceptList.svelte` (per-row delete button opening `DeleteDialog`)
- Modify: `examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts` (wire `?/delete`)
- Test: `src/tests/unit/content-routes-list.test.ts` (a `listDeleteAction` describe block)
- Test: `src/tests/component/ConceptList.test.ts` (a row-delete test)

- [ ] **Step 1: Read the existing delete path and dialog**

Read `deleteAction` in `src/lib/sveltekit/content-routes.ts` (lines around 344-380) and `src/lib/components/DeleteDialog.svelte`. Note that `deleteAction` reads `event.params.id`, runs `inboundLinks`, returns `fail(409, { inboundLinks })` when links exist, else commits the file removal plus the manifest patch and redirects to the list. Note `DeleteDialog`'s props (the inbound links it renders and the form action it posts to).

- [ ] **Step 2: Write the failing unit tests**

Add to `src/tests/unit/content-routes-list.test.ts`, reusing the file's runtime and fetch-double fixtures (mirror how the existing `listLoad` tests stub `listMarkdown`/`readRaw` and how other action tests build the form `request`):

```ts
describe('listDeleteAction', () => {
  it('deletes an entry whose id arrives in the form body when no inbound links exist', async () => {
    // Arrange the fetch double so the manifest read returns a manifest with the target and no inbound
    // edge, mirroring the deleteAction tests. Build an event whose request form carries id=<target>.
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeActionEvent({ params: { concept: 'posts' }, form: { id: '2026-05-01-hello' } });
    await expect(routes.listDeleteAction(event)).rejects.toMatchObject({ status: 303 }); // redirect to the list
  });

  it('blocks the delete and returns the inbound links when something links to the entry', async () => {
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeActionEvent({ params: { concept: 'posts' }, form: { id: '2026-05-01-hello' } });
    // Arrange the manifest double so another entry links to posts/2026-05-01-hello.
    const result = await routes.listDeleteAction(event);
    expect(result).toMatchObject({ status: 409 });
    expect((result as { data: { inboundLinks: unknown[] } }).data.inboundLinks.length).toBeGreaterThan(0);
  });

  it('rejects an invalid id from the form with a 400', async () => {
    const routes = createContentRoutes(runtime, { mintToken: async () => 'tok' });
    const event = makeActionEvent({ params: { concept: 'posts' }, form: { id: '../escape' } });
    await expect(routes.listDeleteAction(event)).rejects.toMatchObject({ status: 400 });
  });
});
```

Adapt `makeActionEvent` to the file's existing action-event helper; it must build `event.request` from a `FormData` carrying the given fields and set `event.params`. If no such helper exists, add one that wraps `new Request('http://x', { method: 'POST', body: <urlencoded form> })`. Arrange the GitHub fetch double exactly as the existing `deleteAction` tests do (they live in a sibling test file if not here; grep `deleteAction` under `src/tests` and copy the manifest/inbound fixture).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/tests/unit/content-routes-list.test.ts`
Expected: FAIL: `routes.listDeleteAction` is not a function.

- [ ] **Step 4: Extract the shared delete core and add `listDeleteAction`**

In `src/lib/sveltekit/content-routes.ts`, refactor so the guard-and-commit body of `deleteAction` lives in one private function keyed by an already-resolved id, and both entry points call it. Add after the existing `isConflict` helper:

```ts
  /** The shared delete core: guard on inbound links, then commit the file removal and manifest patch.
   *  Both the editor delete (id from params) and the list delete (id from the form) call this with a
   *  validated id, so the block-until-clean inbound guard is enforced once. */
  async function deleteEntry(
    event: ContentEvent,
    concept: ConceptDescriptor,
    id: string,
    editor: Editor,
  ): Promise<ReturnType<typeof fail> | never> {
    const path = `${concept.dir}/${filenameFromId(id)}`;
    const token = await mintToken(event.platform?.env ?? {});
    const manifestRaw = await readRaw(runtime.backend, runtime.manifestPath, token);
    const manifest = manifestRaw === null ? emptyManifest() : parseManifest(manifestRaw);
    const inbound = inboundLinks(manifest, concept.id, id);
    if (inbound.length) {
      return fail(409, { inboundLinks: inbound });
    }
    const nextManifest = serializeManifest(removeEntry(manifest, concept.id, id));
    try {
      await commitFiles(
        runtime.backend,
        [
          { path, content: null },
          { path: runtime.manifestPath, content: nextManifest },
        ],
        { message: `Delete ${concept.label.toLowerCase()}: ${id}`, author: { name: editor.displayName, email: editor.email } },
        token,
      );
    } catch (err) {
      if (isConflict(err)) {
        const message = 'This file changed since you opened it. Reload and try again.';
        throw redirect(303, `/admin/${concept.id}/${id}?error=${encodeURIComponent(message)}`);
      }
      throw err;
    }
    throw redirect(303, `/admin/${concept.id}`);
  }
```

Rewrite the existing `deleteAction` to resolve and validate the id from params, then delegate:

```ts
  /** Delete an entry from its editor. The id comes from the route param. */
  async function deleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const id = event.params.id ?? '';
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }

  /** Delete an entry from the concept list. The id comes from the form body. */
  async function listDeleteAction(event: ContentEvent): Promise<ReturnType<typeof fail> | never> {
    const editor = sessionOf(event);
    const concept = conceptOf(runtime, event.params);
    const form = await event.request.formData();
    const id = String(form.get('id') ?? '');
    if (!isValidId(id)) throw error(400, 'Invalid entry id');
    return deleteEntry(event, concept, id, editor);
  }
```

Add `listDeleteAction` to the returned object:

```ts
  return { layoutLoad, indexRedirect, listLoad, createAction, editLoad, saveAction, deleteAction, listDeleteAction, renameAction, mintToken };
```

- [ ] **Step 5: Wire the row delete in the component**

In `src/lib/components/ConceptList.svelte`, import `DeleteDialog` and `Trash2Icon`, hold the row targeted for delete in state, and render one shared `DeleteDialog` driven by the failed action's inbound links. Read `DeleteDialog.svelte`'s prop contract in Step 1 and match it. Add the imports:

```ts
  import DeleteDialog from './DeleteDialog.svelte';
  import { /* existing icons */ Trash2Icon } from './admin-icons.js';
```

Add a Status-adjacent actions cell to each `<tr>` after the Status `<td>`:

```svelte
            <td class="text-right">
              <form method="POST" action="?/delete" use:enhance>
                <input type="hidden" name="id" value={entry.id} />
                <button type="submit" class="btn btn-ghost btn-xs" aria-label="Delete {entry.title}">
                  <Trash2Icon class="h-4 w-4 text-error" />
                </button>
              </form>
            </td>
```

Add a `<th>Actions</th>` (visually hidden label is fine) to the header row. Use SvelteKit's `enhance` so a `fail(409)` returns the inbound links to the page without a navigation, and surface them through `DeleteDialog`. Import `enhance` and wire the dialog by reading `DeleteDialog`'s contract; if `DeleteDialog` expects the inbound links and a confirm action, pass the failed-row links to it and open it on a 409 result. The exact wiring follows `DeleteDialog`'s existing props from Step 1.

If `DeleteDialog`'s current contract is tightly coupled to the editor page (it posts to the editor's `?/delete`), the minimal correct approach is: the row form posts to the list `?/delete`; on a 409 `fail` the page shows the returned inbound links in a `DeleteDialog` instance whose confirm is disabled (block-until-clean), matching the editor's behavior. Keep the guard's UX identical to the editor's.

- [ ] **Step 6: Write and run the component row-delete test**

Add to `src/tests/component/ConceptList.test.ts`:

```ts
  it('offers a delete action per row', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByRole('button', { name: /delete post 01/i })).toBeInTheDocument();
  });
```

Run: `npx vitest run src/tests/component/ConceptList.test.ts src/tests/unit/content-routes-list.test.ts`
Expected: PASS.

- [ ] **Step 7: Wire the showcase list action and run the full gate**

In `examples/showcase/src/routes/admin/(app)/[concept]/+page.server.ts`, add `delete: routes.listDeleteAction` to the `actions` export alongside the existing `create` action (read the file first; mirror its `actions` shape).

Run: `npm run check` (0/0) and `npm test` (exit 0).

```bash
git add src/lib/sveltekit/content-routes.ts src/lib/components/ConceptList.svelte src/tests/unit/content-routes-list.test.ts src/tests/component/ConceptList.test.ts examples/showcase/src/routes/admin/\(app\)/\[concept\]/+page.server.ts
git commit -m "Add per-row delete reusing the inbound-link guard"
```

---

### Task 7: Rebuild the sidebar with nav icons and a user menu

`AdminLayout`'s flat menu gains a Lucide icon per nav item, and a footer user menu (avatar initials, display name, email, role) replaces the bare topbar name and the loose sign-out button. The nav stays concept-driven and role-gated.

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Step 1: Update the failing tests**

In `src/tests/component/AdminLayout.test.ts`, add `email` to the `data()` user literal and add user-menu tests. Change the `data()` helper's `user` to `{ displayName: 'Ed', email: 'ed@example.com', role: ... }` and add `theme: 'cairn-admin' as const` to the returned object (Task 2 added the field; Task 8 consumes it). Add:

```ts
  it('shows the user identity and a sign-out control in the sidebar', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText('ed@example.com')).toBeInTheDocument();
    await expect.element(screen.getByText('Ed')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('shows the owner role in the user menu', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    await expect.element(screen.getByText(/owner/i)).toBeInTheDocument();
  });
```

Keep the existing nav and role-gating tests; they still hold.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: FAIL: no email, role, or sign-out button rendered in a user menu yet.

- [ ] **Step 3: Rebuild the sidebar**

In `src/lib/components/AdminLayout.svelte`, import the menu and content icons and a nav-icon map, give each nav item a Lucide icon, and replace the bare topbar name and the loose sign-out form with a sidebar footer user block. Add to the script imports:

```ts
  import { MenuIcon, LogOutIcon } from './admin-icons.js';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UsersIcon from '@lucide/svelte/icons/users';
  import type { Component } from 'svelte';
```

Extend the `NavItem` interface with an icon and assign one per item (concepts get a content glyph, the nav-menu entry gets settings, editors get users):

```ts
  interface NavItem {
    href: string;
    label: string;
    icon: Component;
    owner?: boolean;
  }

  const navItems: NavItem[] = $derived([
    ...data.concepts.map((c) => ({ href: `/admin/${c.id}`, label: c.label, icon: FileTextIcon })),
    ...(data.navLabel ? [{ href: '/admin/nav', label: data.navLabel, icon: SettingsIcon }] : []),
    { href: '/admin/editors', label: 'Editors', icon: UsersIcon, owner: true },
  ]);
```

Compute the user's initials in the script:

```ts
  const initials = $derived(
    data.user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?',
  );
```

In the nav `<ul>`, render the icon before the label inside each link:

```svelte
        {#each visibleNav as item (item.href)}
          <li>
            <a href={item.href} class:menu-active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
              <item.icon class="h-4 w-4" aria-hidden="true" />
              {item.label}
            </a>
          </li>
        {/each}
```

Replace the sidebar's bottom sign-out form with a user footer (put it at the end of the `<nav>`, after the menu `<ul>`):

```svelte
      <div class="mt-auto border-t border-base-300 pt-3">
        <div class="flex items-center gap-3 px-2">
          <div class="avatar avatar-placeholder">
            <div class="bg-neutral text-neutral-content w-9 rounded-full">
              <span class="text-sm">{initials}</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium">{data.user.displayName}</div>
            <div class="truncate text-xs text-[var(--color-muted)]">{data.user.email}</div>
            <div class="text-xs capitalize text-[var(--color-subtle)]">{data.user.role}</div>
          </div>
        </div>
        <form method="POST" action="/admin/auth/logout" class="mt-3 px-2">
          <button type="submit" class="btn btn-ghost btn-sm btn-block justify-start">
            <LogOutIcon class="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
```

For the footer to sit at the bottom, make the `<nav>` a flex column: change its class to include `flex flex-col` (keep `min-h-full w-64 border-r border-base-300 p-4 bg-base-100`). Replace the topbar's bare name `<div class="flex-none px-2 text-sm ...">{data.user.displayName}</div>` with nothing for now (the topbar is rebuilt in Task 8); leave the navbar's site-name and hamburger in place. Swap the hand-rolled hamburger SVG for `<MenuIcon class="h-5 w-5" />`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: PASS (the new user-menu tests and the retained nav and role-gating tests).

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add src/lib/components/AdminLayout.svelte src/tests/component/AdminLayout.test.ts
git commit -m "Rebuild the admin sidebar with nav icons and a user menu"
```

---

### Task 8: Add the sticky topbar, breadcrumbs, and the dark-mode toggle

The topbar becomes sticky, carries path-derived breadcrumbs for orientation inside `/admin/<concept>/<id>`, and holds the dark-mode toggle. The toggle switches the `data-theme` on the admin root, writes the `cairn-admin-theme` cookie, and on first mount with no cookie follows `prefers-color-scheme`. The layout SSRs `data.theme` (Task 2) so a returning user sees no flash.

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/component/AdminLayout.test.ts`. For the breadcrumb test, set the pathname to an entry route; for the toggle test, assert the root `data-theme` flips and the cookie is written:

```ts
  it('derives breadcrumbs from the path inside an entry route', async () => {
    const screen = render(AdminLayout, { data: data(true, null, '/admin/posts/2026-05-hello'), children: child });
    await expect.element(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    await expect.element(screen.getByText('2026-05-hello')).toBeInTheDocument();
  });

  it('toggles the theme on the admin root and persists it to a cookie', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const root = () => screen.container.querySelector('[data-theme]');
    expect(root()?.getAttribute('data-theme')).toBe('cairn-admin');
    await screen.getByRole('button', { name: /dark mode|light mode|toggle theme/i }).click();
    expect(root()?.getAttribute('data-theme')).toBe('cairn-admin-dark');
    expect(document.cookie).toContain('cairn-admin-theme=cairn-admin-dark');
  });
```

Update the `data()` helper to take a third `pathname` argument defaulting to `/admin/posts`:

```ts
function data(canManageEditors: boolean, navLabel: string | null = null, pathname = '/admin/posts') {
  return {
    siteName: 'Test Site',
    user: { displayName: 'Ed', email: 'ed@example.com', role: canManageEditors ? ('owner' as const) : ('editor' as const) },
    concepts: [{ id: 'posts', label: 'Posts' }, { id: 'pages', label: 'Pages' }],
    pathname,
    canManageEditors,
    navLabel,
    theme: 'cairn-admin' as const,
  };
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: FAIL: no breadcrumb nav, no theme toggle button.

- [ ] **Step 3: Add the theme state, the breadcrumbs, and the toggle**

In `src/lib/components/AdminLayout.svelte`, import the sun and moon icons, hold the live theme in state seeded from `data.theme`, bind it to the root `data-theme`, and add a mount effect for the no-cookie `prefers-color-scheme` default. Add to imports:

```ts
  import { MenuIcon, LogOutIcon, SunIcon, MoonIcon } from './admin-icons.js';
```

Add to the script:

```ts
  let theme = $state<'cairn-admin' | 'cairn-admin-dark'>(data.theme);

  // First mount with no persisted choice follows the OS preference. A returning user's cookie was
  // already honored by the layout load (data.theme), so this only fires on a first-ever visit.
  $effect(() => {
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith('cairn-admin-theme='));
    if (!hasCookie && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      theme = 'cairn-admin-dark';
    }
  });

  function toggleTheme() {
    theme = theme === 'cairn-admin' ? 'cairn-admin-dark' : 'cairn-admin';
    // 1 year, path-scoped to the admin so the cookie never reaches the host's pages.
    document.cookie = `cairn-admin-theme=${theme}; path=/admin; max-age=31536000; samesite=lax`;
  }

  interface Crumb {
    label: string;
    href?: string;
  }

  // Path-derived breadcrumbs: the concept label (from the nav) then the entry id segment. Only the
  // /admin/<concept>/<id> depth shows a trail; a bare concept list shows just the concept.
  const crumbs = $derived.by<Crumb[]>(() => {
    const segs = data.pathname.split('/').filter(Boolean); // ['admin', concept, id?]
    if (segs.length < 2 || segs[0] !== 'admin') return [];
    const conceptId = segs[1];
    const concept = data.concepts.find((c) => c.id === conceptId);
    const out: Crumb[] = [{ label: concept?.label ?? conceptId, href: `/admin/${conceptId}` }];
    if (segs[2]) out.push({ label: decodeURIComponent(segs[2]) });
    return out;
  });
```

Change the root element to bind the theme and make the navbar sticky. Update the root `<div>`:

```svelte
<div data-theme={theme} class="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
```

Replace the existing `<div class="navbar ...">...</div>` with a sticky topbar carrying the hamburger, the breadcrumbs, and the toggle:

```svelte
    <div class="navbar bg-base-100 border-b border-base-300 sticky top-0 z-30">
      <div class="flex-none lg:hidden">
        <label for="cairn-drawer" aria-label="Open menu" class="btn btn-square btn-ghost">
          <MenuIcon class="h-5 w-5" />
        </label>
      </div>
      <div class="flex-1 px-2">
        {#if crumbs.length}
          <nav aria-label="Breadcrumb" class="breadcrumbs text-sm">
            <ul>
              {#each crumbs as crumb (crumb.label)}
                <li>{#if crumb.href}<a href={crumb.href}>{crumb.label}</a>{:else}{crumb.label}{/if}</li>
              {/each}
            </ul>
          </nav>
        {:else}
          <span class="font-semibold">{data.siteName}</span>
        {/if}
      </div>
      <div class="flex-none">
        <button type="button" class="btn btn-square btn-ghost" aria-label="Toggle theme" onclick={toggleTheme}>
          {#if theme === 'cairn-admin'}<MoonIcon class="h-5 w-5" />{:else}<SunIcon class="h-5 w-5" />{/if}
        </button>
      </div>
    </div>
```

Update the `@component` doc comment's claim that the root sets `data-theme="cairn-admin"` to note it now reflects the resolved light or dark theme.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: PASS. If the cookie assertion leaks between tests (a prior test's cookie persists), clear it in a `beforeEach` with `document.cookie = 'cairn-admin-theme=; path=/admin; max-age=0'`.

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add src/lib/components/AdminLayout.svelte src/tests/component/AdminLayout.test.ts
git commit -m "Add the sticky topbar, breadcrumbs, and the dark-mode toggle"
```

---

### Task 9: Add the sidebar keyboard shortcut and close the mobile drawer on navigation

Two cheap polish behaviors from the reference: Cmd or Ctrl+B toggles the sidebar, and navigating closes the mobile drawer. cairn keeps its DaisyUI drawer, so these are additive behaviors over the existing `#cairn-drawer` checkbox.

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte`
- Test: `src/tests/component/AdminLayout.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/tests/component/AdminLayout.test.ts`:

```ts
  it('toggles the drawer with Ctrl+B', async () => {
    const screen = render(AdminLayout, { data: data(true), children: child });
    const toggle = () => screen.container.querySelector('#cairn-drawer') as HTMLInputElement;
    const before = toggle().checked;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
    await expect.poll(() => toggle().checked).toBe(!before);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: FAIL: the keydown does not change the drawer checkbox.

- [ ] **Step 3: Add the behaviors**

In `src/lib/components/AdminLayout.svelte`, bind the drawer checkbox to state and wire a window keydown plus a pathname effect that closes the drawer on navigation. Add to the script:

```ts
  let drawerOpen = $state(false);

  function onKeydown(e: KeyboardEvent) {
    if (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      drawerOpen = !drawerOpen;
    }
  }

  // Close the mobile drawer whenever the active path changes (a nav click navigated).
  $effect(() => {
    data.pathname;
    drawerOpen = false;
  });
```

Add the window listener with `<svelte:window onkeydown={onKeydown} />` near the top of the markup. Bind the drawer checkbox:

```svelte
  <input id="cairn-drawer" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />
```

Note: the pathname effect runs once on mount too, setting `drawerOpen=false`, which is the correct default. The Ctrl+B effect and the pathname effect both write `drawerOpen`; they do not conflict because the pathname effect only fires when `data.pathname` actually changes.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tests/component/AdminLayout.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full check and commit**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

```bash
git add src/lib/components/AdminLayout.svelte src/tests/component/AdminLayout.test.ts
git commit -m "Add the sidebar shortcut and close the mobile drawer on navigation"
```

---

### Task 10: Prove the rebuilt admin renders on the framework-free showcase, light and dark

The showcase ships no Tailwind and no DaisyUI. The rebuilt list, sidebar, and topbar must render fully styled there in both themes, which proves the self-styling guarantee end to end against the new classes. The `@source` scan picks up the new classes when `dist` rebuilds, so no build change is needed.

**Files:**
- None (verification only). If the showcase needs the theme cookie passed through, confirm it flows automatically (it does: `routes.layoutLoad` reads `event.cookies`, which the real SvelteKit event provides).

- [ ] **Step 1: Rebuild the engine and start the showcase**

```bash
npm run package
cd examples/showcase && npm run build && npm run preview
```

Run the preview in the background. Wait for `http://localhost:4173`. If `npm run build` needs a manifest, run `npm run cairn:manifest` first, then rebuild. The showcase mounts the authed shell under `/admin/posts` (it has no `/admin/login` route; the fake backend authenticates via `SHOWCASE_FAKE_BACKEND=1`, the documented showcase flag). Start the preview with that flag set so the authed shell renders:

```bash
SHOWCASE_FAKE_BACKEND=1 npm run preview
```

- [ ] **Step 2: Screenshot the list in light and dark**

```bash
cat > /tmp/cairn-admin-ux-shot.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:4173/admin/posts', { waitUntil: 'networkidle' });
await p.screenshot({ path: '/tmp/cairn-admin-list-light.png' });
// Toggle dark via the topbar button, then screenshot again.
await p.getByRole('button', { name: /toggle theme/i }).click();
await p.waitForTimeout(200);
await p.screenshot({ path: '/tmp/cairn-admin-list-dark.png' });
await b.close();
console.log('shots written');
EOF
cp /tmp/cairn-admin-ux-shot.mjs ./tmp-shot.mjs && node ./tmp-shot.mjs; rm -f ./tmp-shot.mjs
```

- [ ] **Step 3: Confirm both renders**

View `/tmp/cairn-admin-list-light.png` and `/tmp/cairn-admin-list-dark.png`. Expected light: a Warm Stone sidebar with icon nav items and a user footer, a sticky topbar with the site name or breadcrumbs and a moon toggle, and a bordered data-table with the search box, sortable headers, status badges, formatted dates, per-row delete, and the pagination controls. Expected dark: the same layout in the dark Warm Stone palette with readable contrast and a sun toggle. Confirm neither is a stack of unstyled browser defaults. Stop the preview when done. If a surface is unstyled, the new class did not compile; check the `@source` glob picked up the component and that `npm run package` reran before the showcase build.

---

### Task 11: Version, changelog, upgrade guide, and the full gate

**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md`
- Modify: `docs/guides/upgrade-cairn.md`

- [ ] **Step 1: Bump the version**

Set `package.json` `version` to `0.32.0`.

- [ ] **Step 2: Add the changelog entry**

Add a `0.32.0` section at the top of the entries in `CHANGELOG.md`, matching the file's format:

```markdown
## 0.32.0

The admin gets a real CMS UX. The concept list is now a searchable, sortable data-table with status
badges, formatted dates, per-row delete, and pagination. The sidebar carries an icon per nav item and
a user menu with sign-out. The topbar is sticky and shows breadcrumbs. The admin has a dark mode, with
a topbar toggle that persists through a cookie and follows the OS preference on a first visit. The admin
icons are Lucide, added as a runtime dependency.

This is additive for a consumer that mounts the admin through the documented routes. The engine now
depends on `@lucide/svelte`, which installs transitively, so no consumer action is required. A new
`listDeleteAction` is available on the content routes for wiring per-row delete on the list page; the
showcase wires it as the list `?/delete` action.
```

Run `prose-guard CHANGELOG.md` and fix any blocking tell in the text you added (advisory tells do not block).

- [ ] **Step 3: Add the upgrade-guide entry**

Append a `0.32.0` section to `docs/guides/upgrade-cairn.md`, matching the additive style used for the `0.31.0` entry:

```markdown
## 0.32.0: the admin UX rebuild and dark mode

The admin list, sidebar, and topbar are rebuilt in DaisyUI with Lucide icons and a dark mode. This
needs no migration. Consumers may: wire per-row delete on the concept list by adding
`delete: routes.listDeleteAction` to the list route's `actions`, the way the showcase does. The dark
mode persists through a `cairn-admin-theme` cookie scoped to `/admin`, so it never reaches the host's
pages.
```

Run `prose-guard docs/guides/upgrade-cairn.md` and fix any blocking tell in the added text.

- [ ] **Step 4: Run the full engine gate**

```bash
npm run check
npm test
npm run check:reference
npm run check:package
npm run check:docs
```

Expected: `npm run check` 0 errors and 0 warnings, `npm test` exits 0, and the three `check:*` commands exit 0. A new public type (`LayoutData.theme`, `listDeleteAction`) is exported from `@glw907/cairn-cms/sveltekit`; if `check:reference` flags an undocumented export, add the entry to `docs/reference/sveltekit.md` (read the page first and match its format), then re-run.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md docs/guides/upgrade-cairn.md docs/reference/sveltekit.md
git commit -m "Release 0.32.0: the admin UX rebuild and dark mode"
```

---

## After structural completion: the frontend-design polish pass

Once Tasks 1 through 11 land green, the admin is structurally complete: correct behavior, accessible markup, idiomatic DaisyUI, light and dark, proven on the framework-free showcase. The visual quality is then refined in a separate `/frontend-design:frontend-design` pass, at the user's request. That pass:

- Treats SvelteForge (`ColorlibHQ/svelteforge-admin`) as the look reference and uses the Playwright render-and-compare loop the spec describes: render each admin screen on the showcase, screenshot it, compare against the reference, and adjust spacing, density, weight, and the Warm Stone light and dark token values.
- Touches the component markup classes and the `cairn-admin.css` token values only. It changes no load, action, or content-route logic, and it keeps every component test green.
- Re-anchors the `vitest-browser-svelte` screenshot baselines under `src/tests/component/__screenshots__/` once the look settles.

It runs as its own pass with its own review gate, because design refinement is iterative and visual rather than test-first. Keeping it separate keeps this plan's gate honest: structure and behavior pass here, look is tuned there.

---

## Self-review notes

- **Spec coverage (design section 2).** The data-table list with search, result count, sortable headers, status badges, formatted date, per-row edit and delete, search-aware empty state, and pagination with a page-size control is Tasks 4, 5, 6. The header primary-action create button keeping slug auto-derive is Task 5. The sidebar icons and footer user menu are Task 7. The sticky topbar with breadcrumbs is Task 8. Dark mode (the variable block, the toggle, the cookie persistence, the prefers-color-scheme default) is Tasks 3 and 8 plus the layout-load read in Task 2. The Cmd/Ctrl+B shortcut and the mobile-drawer close are Task 9. Lucide as a per-icon runtime dependency is Task 1. The showcase proof in both themes is Task 10. The preserved surfaces (`EditPage`, the dialogs, the alerts, the live regions) keep their logic; this plan does not touch them beyond reusing `DeleteDialog` for the row guard, and the full `npm test` in Task 11 confirms their tests stay green. Out of scope and deferred to plan 3: chrome isolation, the dev guard, the route-structure docs, the showcase `(site)` group.
- **Type and name consistency.** `LayoutData.theme` and `LayoutData.user.email` (Task 2) are consumed by `AdminLayout` (Tasks 7, 8) and the `AdminLayout.test.ts` `data()` helper (updated in Tasks 7, 8). `listDeleteAction` is defined and returned in Task 6 and wired in the showcase in the same task. The cookie name `cairn-admin-theme` is identical in `layoutLoad` (Task 2) and the toggle (Task 8). The icon export names in `admin-icons.ts` (Task 1) match every import site.
- **Decisions locked by the brainstorm.** One pass for the UX rebuild plus dark mode; the dark first paint reads the cookie in the layout load for zero flash, with `prefers-color-scheme` as the no-cookie default applied on first mount.
- **Carry-forward awareness.** Plan 1 left a global at-rule leak carry-forward (DaisyUI `@keyframes`, including `spin`, stay document-global because the scoping tool rewrites selectors only). This pass adds DaisyUI components that may emit more keyframes, so it does not widen the guarantee; the name-mangling fix stays deferred to a later pass and is recorded in STATUS. No task here depends on keyframe scoping.
```

---

## Post-mortem (landed 2026-06-07 on `main`, `0.32.0`, unpublished)

The plan ran subagent-driven, one `cairn-implementer` per task on `main` directly, Tasks 4, 6, 8, and 10 on Opus and the rest on Sonnet. Eleven task commits `01751ae..1929b21` plus three fold-in commits: the self-styling render fix `ed0d50a`, the simplifier `129ba6d`, and the review fold-in `73cf8a7`. The minor bumps `0.32.0` with a "Consumers may:" line (the change is additive; `listDeleteAction` is the one new opt-in action). The gate is green at the tip `73cf8a7`, run first-hand: `npm run check` 816 files 0/0, `npm test` 120 files / 745 tests exit 0 (one re-run cleared the known `delivery-*-split` parallel-load flake), and `check:reference`/`check:package`/`check:docs` exit 0.

**What landed.** The concept list is a searchable, sortable DaisyUI data-table: a search box, a result count, sortable Title and Date headers with direction indicators, status badges, formatted dates, per-row delete, client-side pagination with a page-size control, and search-aware and first-run empty states. The create form moved behind a header primary-action button that opens a native `<dialog>`, keeping the slug auto-derive. The sidebar carries a Lucide icon per nav item and a footer user menu (avatar initials, name, email, role, sign-out). The topbar is sticky with path-derived breadcrumbs and a dark-mode toggle. Dark mode is a second Warm Stone variable block plus the toggle, persisted through a `cairn-admin-theme` cookie path-scoped to `/admin` that `layoutLoad` reads for a no-flash first paint, with `prefers-color-scheme` as the no-cookie default. `@lucide/svelte` is a new runtime dependency; `lightningcss` is a new build-only devDependency. The engine extracted a shared `deleteEntry` core so the editor delete and the new `listDeleteAction` enforce the one inbound-link guard.

**The verification gate caught a latent plan-1 defect, fixed as `ed0d50a`.** Task 10's light-and-dark showcase proof found the admin sidebar never rendered at desktop width, and the root background never filled. Two causes, both in the plan-1 self-styling foundation and unscrutinized until this pass rendered the full shell. First, `postcss-prefix-selector` prepended the scope to the front of every rule including the nested rules Tailwind v4 and DaisyUI emit, so a nested selector starting with a combinator (`> .drawer-toggle ~ .drawer-side`) became `:where(scope) > .x`, which native nesting composed as `& :where(scope) > .x` and severed the `lg:drawer-open` reveal from its parent; 51 rules were broken this way. The fix flattens the nesting with lightningcss before scoping, so every rule is one flat selector the scope prepends to once at the front. Second, the admin root carried `data-theme` and the drawer classes on the same element, but every rule scopes as a descendant of the theme root, so `.drawer` on the theme element never matched and stayed `display:block`; moving `data-theme` onto a bare wrapper makes the drawer a scoped descendant. A regression test in `admin-css-build.test.ts` pins that no scoped selector starts with a combinator and the flat reveal rule survives. Proven on the framework-free showcase in both themes (`/tmp/cairn-admin-light-fixed.png`, `/tmp/cairn-admin-dark-fixed.png`).

**The review gate caught one Critical and two Important issues, folded in as `73cf8a7`.** The per-row delete-refusal UI was dead: `listDeleteAction` returns a flat `fail(409, { inboundLinks, id })`, but `ConceptList` read a nested `form.deleteRefused` the action never produces, and the showcase shim never forwarded the `form` prop. The server still refused the unsafe delete, so data was safe, but the author saw no reason. The fold-in reads the flat shape, forwards `form` from the shim, and surfaces the refusal as a visible `role="alert"` banner for parity with the editor, with a new component test that passes `form`. The two a11y fixes add `aria-sort` to the sortable headers and a load-present `role="status"` live region for the filter result count and the empty state. Two cheap minors rode along: the breadcrumb `{#each}` key is now `crumb.href ?? crumb.label`, and the per-row delete button is `btn-sm` to clear the 24px target floor.

**Carry-forwards (recorded, deferred to the frontend-design polish pass that runs next).** (1) The list default sort is date-ascending (oldest-first) to satisfy the plan's locked tests; newest-first is the usual CMS default. (2) The breadcrumb shows a single concept crumb on a bare list page (`/admin/posts`), which duplicates the sidebar active item and the page heading. (3) The list delete uses a plain POST, so a 409 does a full reload and resets the search/sort/page state; `use:enhance` with `applyAction` would keep it in place, deferred because `$app/forms` does not resolve in the component test project. (4) A first-ever-visit dark-OS user gets a light first paint before the client effect flips, since `prefers-color-scheme` reads in a `$effect`; an inline head script in the host `app.html` would remove the flash. (5) DaisyUI's modal and drawer transitions are not behind a `prefers-reduced-motion` guard; a sheet-level `@media` block in `admin-css.input.css` would respect the preference. (6) The plan-1 global at-rule leak (DaisyUI `@keyframes` and `@property` stay document-global) still stands; the flatten step does not change at-rule scoping. Items 1 through 5 are visual or interaction refinements that suit the polish pass; item 6 belongs with plan 3's chrome isolation.

**Live verification.** Task 10's showcase render proof is this pass's live-admin evidence: it drove the real rendered admin shell (list, sidebar, topbar, toggle) through the real route loads in a browser, light and dark. The auth and session path was not touched this pass. The new `listDeleteAction` commit path is covered by unit tests for the 303, 409, and 400 branches and wired in the showcase; a real-Worker `wrangler dev` D1 smoke was not run, because the pass changed no auth, cookie, or Worker code.

---

## Frontend-design polish pass (landed 2026-06-07 on `main`, folded into the unpublished `0.32.0`)

The polish pass ran after the structural rebuild landed, refining visual quality with the Playwright render-and-compare loop against the showcase. The direction is warm editorial utility: a calm warm-neutral workspace, crisp type hierarchy, clear surface layering, and a violet accent used sparingly. It touched the component classes and the `cairn-admin.css` tokens only, kept every test green, and stayed in the unpublished `0.32.0` window (no version bump). Two commits: the polish `97ff069` (after a simplifier extract of the shared header-label class strings) and this tracking update.

**What changed.** The Warm Stone light and dark token values gained clearer surface separation and crisper borders. The sidebar active item moved from the heavy `menu-active` block to a soft `bg-primary/10` tint with primary text and a weight delta. The topbar shows the site name on a bare list page instead of a lone breadcrumb that echoed the sidebar and the heading (carry-forward 2). The list table gained uppercase muted column labels, row hover, an elevated card, and entry-title links that read as base-content and hover to primary. The list defaults to newest-first (carry-forward 1, with two test assertions repointed to page-1 rows). A `prefers-reduced-motion` block honors the OS preference inside the admin (carry-forward 5). The editor took a light, consistent touch (heading and card elevation).

**The anchor reset and a real cascade-layer lesson.** Omitting Preflight left admin anchors with the UA blue underline, so the pass added a scoped `a { color: inherit; text-decoration: none }` reset. The first attempt left it unlayered, and the a11y review caught that this silently killed the title link's `hover:underline` and any DaisyUI `.link` underline: cascade layers resolve before specificity, so an unlayered rule beats every layered utility regardless of `:where()`. The compiled sheet's layer order here is `properties < theme < components < utilities < base` (Tailwind v4 forward-declares `components` before `utilities`, and `base` lands last), so the fix puts the reset in `@layer components`, below `utilities`, where Tailwind hover utilities and DaisyUI links override it while bare anchors still get the reset. Verified in headless Chrome: the title link is base-content with no underline at rest and underlines to primary on hover.

**The a11y review (contrast) passed; one margin is locked.** The reviewer computed every changed pair from the oklch tokens. All clear AA in both themes (muted labels ~6.1 to 7.1:1, inactive nav ~8:1, title ~13 to 15:1, badges and the primary button all pass). The dark active-nav (`text-primary` on `bg-primary/10`) sits at 4.53:1, just over the line, so the dark `--color-primary` lightness (68%) and the `/10` tint opacity are effectively locked; any later nudge there must re-run that pair.

**Carry-forwards still open after the polish.** (3) `use:enhance` with `applyAction` for the list delete, still deferred because `$app/forms` does not resolve in the component test project. (4) The first-ever-visit dark-OS first-paint flash, which needs an inline head script in the host `app.html` and so belongs with plan 3 or a showcase touch. (6) The plan-1 global at-rule leak, for plan 3's chrome isolation. The reduced-motion guard (5) now also leans on `cairn-admin.css` rather than the compile input, which is the same scoped sheet.


---

## Design-identity pass (landed 2026-06-07 on `main`, folded into the unpublished `0.32.0`)

The identity pass ran after the polish, driven by a long sequence of design refinements with the user
against the live showcase. It gave the admin a distinct visual identity and stayed in the unpublished
`0.32.0` window with no version bump, since nothing here changes the public API. It touched the admin
components, `cairn-admin.css`, and the build script, kept every test green, and added the self-hosted
fonts. The work commits are folded into the `main` history through the final fold-in commit
`a76aa8b`.

**Brand and type.** Cairn now has a wordmark set in Bricolage Grotesque over a Figtree body, both
self-hosted as variable woff2 under the SIL Open Font License, so the admin makes no webfont network
call. The fonts ship through the build: `build-admin-css.mjs` appends the `@font-face` rules after the
Tailwind compile, because an `@import` at the top would rebase the `url()` against the source tree and
break the path. The fonts live in `src/lib/components/fonts/` with their license files. An app-icon
brand tile sits at the top of the sidebar: the Cairn cairn-stack mark (the CC0 public-domain Temaki
glyph, provenance noted in `CairnLogo.svelte`) in a primary-tinted rounded tile, the wordmark beside
it, and a CMS chip. The favicon and document title come from `cairn-favicon.ts`, which inlines the same
glyph as a data URL.

**Surfaces and the header strip.** The admin moved to softer radii and floating cards over a calm
warm-neutral ground, with a soft violet shadow lift on the primary button. The sidebar and the topbar
share one flat opaque header strip, so the seam where they meet reads as a single plane rather than the
intersection of two borders. The topbar carries the command palette trigger, which fills the dead space
it used to show.

**Grouped, collapsible nav.** The nav separates the core Cairn functions from a developer's own
extensions. The core functions live in one collapsible group; a developer's admin extensions sit in
their own custom-named groups at the same level, with no parent "Extensions" wrapper. Each group is a
native `<details>` with an eyebrow `<summary>` on a faint base-content band. The open or collapsed state
persists through a `cairn-admin-nav-collapsed` cookie that `layoutLoad` reads into `data.collapsedNav`,
so a collapsed group renders collapsed with no flash, the same no-flash mechanism the theme cookie uses.
The collapse set is seeded once from the SSR'd cookie and then owned by the toggle, which mirrors each
change back to the cookie through one `writeAdminCookie` helper shared with the theme toggle.

**The command palette.** A palette opens with Cmd/Ctrl+K or the topbar search box. It filters over the
admin destinations plus a couple of actions (the theme toggle, a link to the live site) and is a native
`<dialog>`. Destinations are real `<a>` links so the browser navigates them; actions are buttons.

**The agent-facing design system.** The pass wrote `docs/internal/admin-design-system.md`, a design
system reference written for an implementing agent, so continued interface work stays consistent. It
records the Warm Stone tokens, the type system and the eyebrow recipe, the radii and shadow and border
variables, the component recipes (floating card, active nav, the collapsible eyebrow groups, the brand
tile, the primary-CTA lift, empty states, the command palette, the flat header strip), the Cairn voice,
and the load-bearing scoping rules that are invisible in the markup. The project `CLAUDE.md` gained an
"Admin interface design" section pointing to it, which is the primary discovery hook since `CLAUDE.md`
loads every session. The `cairn-admin-design-system` memory points to it too.

**Two rendering bugs fixed in this window.** First, the login and confirm screens centered their layout
classes on the `data-theme` element, which every scoped rule treats as the root rather than a styled
target, so the screens did not fill the viewport. They now carry `data-theme` on a bare wrapper, the
same fix the drawer needed in plan 2. Second, the command palette closed its dialog from a result
link's own `onclick`, and closing a native dialog mid-click cancels the link's navigation, so selecting
a destination did nothing. Internal links now carry no `onclick` and let the navigation proceed, and the
existing pathname effect closes the palette once the new route lands; external links still close it
themselves, since they open a new tab and leave the page in place. A regression test in
`AdminLayout.test.ts` pins that the palette closes on a pathname change.

**Verification.** The whole arc cleared the `svelte-reviewer` and `daisyui-a11y-reviewer` gate with no
Criticals: every contrast pair passes AA in both themes (the brand tile at 5.69 and 5.94:1, the active
nav at 5.08 and 4.66:1, the eyebrows above 5.9:1), the focus ring is a real `:focus-visible` outline,
and the DaisyUI v5 usage is clean. The `code-simplifier` extracted the `writeAdminCookie` helper. A live
showcase smoke drove the real rendered admin through four paths in a browser: a palette click that
navigates and closes the palette, a palette Enter that navigates, a palette action command (the theme
toggle), and the editor surface rendering in dark mode. The full gate is green at `a76aa8b`: `npm run
check` 821 files 0/0, `npm test` 120 files / 751 tests exit 0, and `check:reference`,
`check:package`, and `check:docs` exit 0.

**Carry-forwards unchanged.** The polish pass carry-forwards (3) the `use:enhance` list delete, (4) the
first-ever-visit dark-OS first-paint flash, and (6) the plan-1 global at-rule leak still stand for plan
3 or a later touch. The identity pass added no new carry-forward.
