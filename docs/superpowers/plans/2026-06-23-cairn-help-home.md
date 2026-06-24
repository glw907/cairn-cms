# Cairn Help home (editor-help Pass 2) Implementation Plan

> **For agentic workers:** Execute with the cairn model: dispatch each task to `cairn-implementer`
> (pinned Sonnet), test-first, and clear the full gate before the next dispatch; the main loop reviews
> each diff and verifies the gate. Steps use checkbox (`- [ ]`) syntax. Upshift a dispatch
> (`model: opus`) only for a task the plan does not fully specify.

**Goal:** Build the standing, labeled Help home admin screen (a derived getting-started checklist, the
promoted formatting reference, and the support hand-off), the pull half of the editor-help initiative.

**Architecture:** A new single-mount admin view, `help`, wired through the three admin seams (the path
parser, the load dispatcher, the component switch). A pure function derives the getting-started progress
from the committed manifest and the pending-branch list. The formatting reference is extracted to a
shared data module that both the editor's Ctrl+/ dialog and the Help home render. The Help home is a
plain content component inside the office shell, reached from a pinned, labeled Help nav home.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit 2, DaisyUI v5 and Tailwind v4, vitest (unit,
integration, component). The design record is the polished mockup,
`docs/internal/design/2026-06-23-help-shell-mockup-rev2-polished.html`.

## Global Constraints

- Svelte 5 runes, DaisyUI v5, Tailwind v4. Match `docs/internal/admin-design-system.md` and its
  load-bearing rules (`data-theme` on a bare wrapper, scoped overrides in `@layer components`,
  theme-adaptive `--cairn-card-border` and `--cairn-shadow`). The HelpHome component renders inside
  `AdminLayout`, so it carries no theme wrapper of its own.
- The build is the polished mockup. Port its composition, copy, and a11y verbatim except the three
  recorded copy refinements: cut the lede's "It is always here when you need it"; collapse the
  getting-started block's stacked intro layers; de-duplicate the Get-help heading against its card title.
- Accessibility holds, designed in: the done state reaches assistive tech three ways (a filled
  glyph-backed box, a visible "Done" word, an `sr-only` "not done" on every open step); the unchecked
  ring is `color-mix(in oklab, var(--color-base-content) 42%, transparent)` (about 3:1 on base-100); the
  progress bar is `role="presentation"` with no focusable child and the count in real adjacent text; the
  reference is a real `<table>` with `th scope="col"`; the Help nav home carries `aria-current="page"`;
  focus is the canonical universal `:focus-visible` (already in `cairn-admin.css`).
- All user-facing copy meets the voice bar (`npm run check:prose`, which scans `src/lib/components`):
  plain author language, sentence case, name things by what the author controls, never engine terms, no
  tacked-on closers.
- The Get-help unset state is the canonical default (a plain self-serve line, no control, when the site
  set no `supportContact`); the set state renders the contact card. The getting-started section uses the
  warmer empty-state composition at 0 of 3, the calm card once populated, and is omitted entirely at 3
  of 3. The "Hide these steps" dismiss is a per-device `localStorage` preference that hides the section
  until the author un-hides it; no auto-resurface.
- Test-first. The full gate per task: `npm run check` 0 errors and 0 warnings, `npm test` exits 0.
- Run on a fresh worktree branched off the editor-help foundation branch (Pass 2 builds on Pass 1's
  `supportContact` and field-hint seams), and before `npm test` run `npm run package` to build `dist`
  (see the `cairn-worktree-needs-dist-build` memory).

## The single-mount seam (orientation)

A new admin screen extends three seams in lockstep, then mounts a content component:

- **Path** (`src/lib/sveltekit/admin-dispatch.ts`): the `AdminView` union (`:11-20`), the
  `parseAdminPath` single-segment branch (`:57-72`), and `RESERVED_SEGMENTS` (`:28`).
- **Load** (`src/lib/sveltekit/cairn-admin.ts`): the `AdminData` union (`:61-69`) and the `load` switch
  (`:115-159`); the `media`/`settings` cases (`:149-158`) are the no-concept template. Help posts no
  form actions, so it needs no `actions` entry.
- **Component** (`src/lib/components/CairnAdmin.svelte`): the `data.view` switch (`:52-77`); authed
  views mount inside `<AdminLayout data={data.layout}>`.
- **Nav** (`src/lib/components/AdminLayout.svelte`): a pinned `flex-none` band between the scroll area
  (`:479`) and the user/sign-out footer (`:481`).

Content state for the checklist comes from two server-side sources, both already loaded elsewhere: the
committed **manifest** (`src/lib/content/manifest.ts`; an entry is in it iff published to `main`; read
via `readManifest(token)` at `content-routes.ts:654-656`) and the layout's **`pendingEntries`**
(`LayoutData`, `content-routes.ts:85`; entries with an open `cairn/` branch, written but not published).

---

## Task 1: the shared markdown-reference module

Extract the formatting-reference content out of `MarkdownHelpDialog.svelte`'s inline table into a shared
data module, so the editor dialog and the Help home render one source and cannot drift. This follows the
existing `editor-shortcuts.ts` + `ShortcutsGrid.svelte` precedent exactly.

**Files:**
- Create: `src/lib/components/markdown-reference.ts`.
- Modify: `src/lib/components/MarkdownHelpDialog.svelte` (render the array, drop the inline rows).
- Test: `src/tests/unit/markdown-reference.test.ts` (new).

**Interfaces:**
- Produces: `interface MarkdownReferenceRow { syntax: string; makes: string; group: 'text' | 'links' | 'blocks'; }`
  and `export const markdownReference: MarkdownReferenceRow[]`. `syntax` is the literal "type this" text;
  `makes` is the plain "what it makes" gloss; `group` curates which rows the Help home shows (it renders
  `text` and `links`; the dialog renders all). The nine Help-home rows: `## Heading`/A heading,
  `**bold**`/Bold text, `*italic*`/Italic text, `> quote`/A quote, `` `code` ``/Inline code (group
  `text`); `[text](url)`/A link, `[[page-name]]`/A link to one of your pages, `- item`/A bulleted list,
  `1. item`/A numbered list (group `links`). Carry the dialog's remaining rows (`### Heading`,
  `#### Heading`, `~~text~~`, `- [ ] item`, table note, `---`) as group `blocks`.

- [ ] **Step 1: Write the failing unit test**

In `src/tests/unit/markdown-reference.test.ts`, assert the module's shape and content:

```ts
import { describe, it, expect } from 'vitest';
import { markdownReference } from '../../lib/components/markdown-reference.js';

describe('markdownReference', () => {
  it('carries every cheat-sheet row with a syntax, a gloss, and a group', () => {
    expect(markdownReference.length).toBeGreaterThanOrEqual(14);
    for (const row of markdownReference) {
      expect(row.syntax.length).toBeGreaterThan(0);
      expect(row.makes.length).toBeGreaterThan(0);
      expect(['text', 'links', 'blocks']).toContain(row.group);
    }
  });
  it('documents the cairn wikilink as a links-group row', () => {
    const wiki = markdownReference.find((r) => r.syntax.includes('[[page-name]]'));
    expect(wiki).toBeDefined();
    expect(wiki?.group).toBe('links');
    expect(wiki?.makes.toLowerCase()).toContain('link');
  });
  it('exposes the nine everyday rows the Help home shows (text + links groups)', () => {
    const everyday = markdownReference.filter((r) => r.group === 'text' || r.group === 'links');
    expect(everyday).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project unit markdown-reference`
Expected: FAIL (the module does not exist).

- [ ] **Step 3: Create the module**

Create `src/lib/components/markdown-reference.ts` with the `MarkdownReferenceRow` interface and the
`markdownReference` array, carrying every current `MarkdownHelpDialog` row with its `group`. Follow the
TSDoc comment standard (a one-line export doc; no `{type}` tags).

- [ ] **Step 4: Render the array in the dialog**

In `MarkdownHelpDialog.svelte`, replace the hand-written `<tbody>` rows (`:28-52`) with an
`{#each markdownReference as row}` that renders `<tr><td><code>{row.syntax}</code></td><td>{row.makes}</td></tr>`.
Keep the table head, the `::: ` layout-block note, and the `<ShortcutsGrid />`. Import `markdownReference`.

- [ ] **Step 5: Run the unit test and the existing dialog test**

Run: `npm test -- --project unit markdown-reference` (PASS), then `npm test -- --project component MarkdownHelpDialog` if such a test exists (it must still pass; if none exists, skip).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exits 0).

```bash
git add src/lib/components/markdown-reference.ts src/lib/components/MarkdownHelpDialog.svelte src/tests/unit/markdown-reference.test.ts
git commit -m "refactor: extract the markdown reference to a shared data module"
```

---

## Task 2: the getting-started derive function

A pure function maps the committed manifest and the pending-branch list to the three getting-started
step states, so the Help home count is always real and never stored.

**Files:**
- Create: `src/lib/content/getting-started.ts`.
- Test: `src/tests/unit/getting-started.test.ts` (new).

**Interfaces:**
- Consumes: `Manifest` and `ManifestEntry` from `./manifest.js` (an entry is published; `concept` is
  `'posts'` or `'pages'`), and the pending list shape `{ concept: string; id: string }[]` (the layout's
  `pendingEntries`, written-but-unpublished entries).
- Produces:
  `export interface GettingStarted { wrotePost: boolean; publishedPost: boolean; createdPage: boolean; doneCount: number; total: 3; }`
  and `export function deriveGettingStarted(manifest: Manifest, pending: { concept: string; id: string }[]): GettingStarted`.
  `wrotePost` is true if any post exists (published in the manifest or pending); `publishedPost` is true
  if any `posts` entry is in the manifest; `createdPage` is true if any page exists (manifest or
  pending). `doneCount` sums the three booleans.

- [ ] **Step 1: Write the failing unit test**

```ts
import { describe, it, expect } from 'vitest';
import { deriveGettingStarted } from '../../lib/content/getting-started.js';
import type { Manifest } from '../../lib/content/manifest.js';

const empty: Manifest = { version: 1, entries: [] };
const entry = (concept: string, id: string) => ({ id, concept, title: id, permalink: '/' + id, draft: false, links: [] });

describe('deriveGettingStarted', () => {
  it('an empty site is 0 of 3, all steps not done', () => {
    expect(deriveGettingStarted(empty, [])).toEqual({ wrotePost: false, publishedPost: false, createdPage: false, doneCount: 0, total: 3 });
  });
  it('a post written but not published counts the first step only', () => {
    const r = deriveGettingStarted(empty, [{ concept: 'posts', id: '2026-01-hello' }]);
    expect(r.wrotePost).toBe(true);
    expect(r.publishedPost).toBe(false);
    expect(r.doneCount).toBe(1);
  });
  it('a published post counts wrote and published', () => {
    const r = deriveGettingStarted({ version: 1, entries: [entry('posts', 'p1')] as Manifest['entries'] }, []);
    expect(r.wrotePost).toBe(true);
    expect(r.publishedPost).toBe(true);
    expect(r.createdPage).toBe(false);
    expect(r.doneCount).toBe(2);
  });
  it('a page (published or pending) counts the page step', () => {
    expect(deriveGettingStarted({ version: 1, entries: [entry('pages', 'about')] as Manifest['entries'] }, []).createdPage).toBe(true);
    expect(deriveGettingStarted(empty, [{ concept: 'pages', id: 'about' }]).createdPage).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project unit getting-started`
Expected: FAIL (the module does not exist).

- [ ] **Step 3: Implement the pure function**

Create `src/lib/content/getting-started.ts`. Derive each boolean from `manifest.entries` (filtered by
`concept`) unioned with `pending` (filtered by `concept`) for the existence checks, and from
`manifest.entries` alone for `publishedPost`. Sum `doneCount`. Pure: no I/O, no globals.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --project unit getting-started`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

```bash
git add src/lib/content/getting-started.ts src/tests/unit/getting-started.test.ts
git commit -m "feat: derive getting-started progress from the manifest and pending branches"
```

---

## Task 3: the Help view, its load, and the `HelpData` contract

Wire the new `help` view through the three admin seams and add `helpLoad`, which reads the manifest and
the pending list, derives the progress (Task 2), and carries the reference (Task 1) and the runtime's
`supportContact`.

**Files:**
- Modify: `src/lib/sveltekit/admin-dispatch.ts` (the `AdminView` union, `parseAdminPath`, `RESERVED_SEGMENTS`).
- Modify: `src/lib/sveltekit/cairn-admin.ts` (the `AdminData` union, the `load` switch).
- Modify: `src/lib/sveltekit/content-routes.ts` (add `HelpData` and `helpLoad`, modeled on `settingsLoad`).
- Test: `src/tests/unit/admin-dispatch.test.ts` (extend the existing dispatch test) and a `helpLoad`
  test placed with the existing load tests (follow the nearest `settingsLoad`/`mediaLibraryLoad` test).

**Interfaces:**
- Consumes: `deriveGettingStarted` (Task 2), `markdownReference` (Task 1), `readManifest` (content-routes),
  the layout's `pendingEntries`, and `runtime.supportContact` (Pass 1).
- Produces: `parseAdminPath('help')` returns `{ view: 'help' }`; `RESERVED_SEGMENTS` includes `'help'`;
  `AdminData` gains `{ view: 'help'; layout: LayoutData; page: HelpData }`; and
  `export interface HelpData { gettingStarted: GettingStarted; reference: MarkdownReferenceRow[]; supportContact?: string; }`.
  `reference` is the full `markdownReference` array (the component curates by group). Re-export `HelpData`
  from `src/lib/sveltekit/index.ts` beside `AdminData`.

- [ ] **Step 1: Write the failing dispatch test**

Extend `src/tests/unit/admin-dispatch.test.ts`:

```ts
expect(parseAdminPath('help')).toEqual({ view: 'help' });
// a sub-path under a reserved segment does not resolve as a concept
expect(parseAdminPath('help/anything')).toBeNull();
```

(Match the existing test's import and the null/`404` convention for a reserved segment with a tail.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project unit admin-dispatch`
Expected: FAIL (`help` is not a known view).

- [ ] **Step 3: Add the `help` view to the three seams**

In `admin-dispatch.ts`: add `| { view: 'help' }` to `AdminView`; add `'help'` to `RESERVED_SEGMENTS`; in
the single-segment branch add `if (head === 'help') return { view: 'help' };` beside the `media`/`settings`
cases. In `cairn-admin.ts`: add `| { view: 'help'; layout: LayoutData; page: HelpData }` to `AdminData`,
and a `case 'help':` to the `load` switch that runs
`Promise.all([content.layoutLoad(delegated), content.helpLoad(delegated)])` and returns
`{ view: 'help', layout, page }` (the `settings` case at `:149-158` is the exact template). In
`content-routes.ts`: add the `HelpData` interface and `export async function helpLoad(event)` that reads
`readManifest(token)`, takes `pendingEntries` from the same source `layoutLoad` uses, calls
`deriveGettingStarted(manifest, pending)`, and returns
`{ gettingStarted, reference: markdownReference, supportContact: runtime.supportContact }`. Re-export
`HelpData` from `src/lib/sveltekit/index.ts`.

- [ ] **Step 4: Write and run the `helpLoad` test**

Add a `helpLoad` test beside the existing load tests (model it on the `settingsLoad`/`mediaLibraryLoad`
test): given a fake backend whose manifest holds one published post and no page, `helpLoad` returns
`gettingStarted.publishedPost === true`, `gettingStarted.createdPage === false`, the `reference` array,
and `supportContact` passed through from the runtime. Run `npm test -- --project unit admin-dispatch` and
the load test; both PASS.

- [ ] **Step 5: Gate and commit**

```bash
git add src/lib/sveltekit/admin-dispatch.ts src/lib/sveltekit/cairn-admin.ts src/lib/sveltekit/content-routes.ts src/lib/sveltekit/index.ts src/tests/unit/admin-dispatch.test.ts src/tests/unit/<the helpLoad test file>
git commit -m "feat: add the help admin view, its load, and the HelpData contract"
```

---

## Task 4: the HelpHome component

Build the Help home content component from the polished mockup, mounted in the office shell through the
`CairnAdmin` switch.

**Files:**
- Create: `src/lib/components/HelpHome.svelte`.
- Modify: `src/lib/components/CairnAdmin.svelte` (add the `help` branch).
- Modify: the `src/lib/components/` export barrel (export `HelpHome`, beside the other admin screens).
- Test: `src/tests/component/help-home.test.ts` (new).

**Interfaces:**
- Consumes: `HelpData` (Task 3) as the `data` prop, and `markdownReference`'s `group` field to curate the
  reference. No theme wrapper of its own (it renders inside `AdminLayout`).
- Produces: the rendered Help home (the masthead, the three sections).

Port the polished mockup
(`docs/internal/design/2026-06-23-help-shell-mockup-rev2-polished.html`) to a Svelte component, with
these state branches driven by `data`:
- **Masthead:** an eyebrow "Help" over a real-sentence h1; the lede without the cut closer.
- **Getting started:** at `gettingStarted.doneCount === 3`, render nothing (omit the section). At 0 of 3,
  the warmer empty-state composition (the cairn mark presiding, per the empty-state recipe), the count in
  real text at 0 of 3, and a faint seed bar. At 1 or 2, the calm peer card. Each step's done state cues three
  ways (the filled glyph box, the visible "Done" tag, and an `sr-only` "not done" on open steps); the bar
  is `role="presentation"`; each open step links to its action. The "Hide these steps" control toggles a
  per-device `localStorage` flag that hides the whole section; a quiet "show getting started" affordance
  restores it.
- **Formatting:** the `<table>` with `th scope="col"`, two columns from the `text` and `links` groups of
  `data.reference`, the syntax cells in `var(--font-editor)`, the foot pointing at Ctrl+/.
- **Get help:** when `data.supportContact` is set, the contact card with a real `mailto`/link; when
  unset, the plain self-serve line and no control.

- [ ] **Step 1: Write the failing component test**

In `src/tests/component/help-home.test.ts`, render `HelpHome` with a populated `HelpData` (1 of 3:
`wrotePost` true, others false; the reference array; `supportContact: 'help@example.org'`) and assert:

```ts
// the three sections render
await expect.element(page.getByRole('heading', { name: 'Find your way around' })).toBeInTheDocument();
// derived progress is real text, the bar is presentational
await expect.element(page.getByText('1 of 3 done', { exact: false })).toBeInTheDocument();
// the done step carries a visible "Done" tag, not color alone
await expect.element(page.getByText('Done')).toBeInTheDocument();
// the reference is a real table exposing the column header
await expect.element(page.getByRole('columnheader', { name: 'What it makes' })).toBeInTheDocument();
// the wikilink row is present
await expect.element(page.getByText('A link to one of your pages')).toBeInTheDocument();
// the set support contact renders a mailto
const email = page.getByRole('link', { name: /Email/ });
await expect.element(email).toHaveAttribute('href', expect.stringContaining('mailto:help@example.org'));
```

Add a second `it` for the unset state: render with `supportContact: undefined` and assert the self-serve
line renders and no `mailto` link is present. Add a third `it` for the omitted state: render with
`doneCount: 3` and assert the getting-started heading is absent while the reference still renders. Mount
the way the nearest existing component test under `src/tests/component/` mounts an admin screen.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project component help-home`
Expected: FAIL (the component does not exist).

- [ ] **Step 3: Build the component and wire the switch**

Create `HelpHome.svelte` per the mockup and the state branches above. Add
`{:else if data.view === 'help'}<HelpHome data={data.page} />` to `CairnAdmin.svelte`'s switch (`:69-74`),
beside `settings`. Export `HelpHome` from the components barrel. Use the design-system recipes (the
floating card, the eyebrow groups, the progress recipe, the empty-state recipe) and the Warm Stone
tokens; no off-palette values.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --project component help-home`
Expected: PASS.

- [ ] **Step 5: Voice gate**

Run `npm run check:prose` (the copy in `HelpHome.svelte` is scanned); it exits 0.

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exits 0).

```bash
git add src/lib/components/HelpHome.svelte src/lib/components/CairnAdmin.svelte src/lib/components/index.ts src/tests/component/help-home.test.ts
git commit -m "feat: add the Help home admin screen"
```

---

## Task 5: the Help nav home

Add the standing, labeled Help home to the office sidebar, pinned at the foot and set apart from the
content concepts, with `aria-current` when active.

**Files:**
- Modify: `src/lib/components/AdminLayout.svelte` (a pinned `flex-none` Help band between the scroll area
  and the user/sign-out footer).
- Test: extend the nearest existing `AdminLayout` component test (or add `src/tests/component/admin-layout-help-nav.test.ts`).

**Interfaces:**
- Consumes: the existing `isActive(href)` helper (`:94-96`) for `aria-current`.
- Produces: a sidebar link to `/admin/help` labeled Help, rendered in its own band (not in `coreItems`),
  carrying `aria-current="page"` when the path is `/admin/help`.

- [ ] **Step 1: Write the failing component test**

Render `AdminLayout` (with the layout data shape the existing tests use) on the `/admin/help` path and
assert:

```ts
const help = page.getByRole('link', { name: 'Help' });
await expect.element(help).toHaveAttribute('href', '/admin/help');
await expect.element(help).toHaveAttribute('aria-current', 'page');
```

Add a second assertion that on a non-help path (for example `/admin/posts`) the Help link has no
`aria-current`. Follow the existing `AdminLayout` test for how the path and layout data are provided.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --project component admin-layout`
Expected: FAIL (no Help nav home yet).

- [ ] **Step 3: Add the pinned Help band**

In `AdminLayout.svelte`, between the scrolling group area (ends `:479`) and the user/sign-out footer
(`:481`), add a `flex-none` bordered band holding a single `<a href="/admin/help">` styled like the
footer's row (a nav item with the Help icon and the "Help" label), with
`aria-current={isActive('/admin/help') ? 'page' : undefined}`. Optionally append a Help entry to
`paletteCommands` (`:187-193`) so it is reachable from Ctrl+K.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --project component admin-layout`
Expected: PASS.

- [ ] **Step 5: Gate and commit**

```bash
git add src/lib/components/AdminLayout.svelte src/tests/component/<the admin-layout test file>
git commit -m "feat: pin a standing Help home in the office sidebar"
```

---

## Pass 2 exit criteria

`npm run check` 0/0, `npm test` exits 0, `check:docs` and `check:prose` pass, and the consumer build is
green (`npm run package` then the showcase e2e, or push for CI). The Help home renders the three sections
with derived progress, the curated reference, and the set/unset support hand-off; the Help nav home is
pinned and carries `aria-current`. Run the code-simplifier over the changed code; fan out the svelte and
daisyui-a11y reviewers (the screen is new admin UI) and the cloudflare-workers reviewer is not needed (no
Worker or D1 change). Run the live admin smoke for the new `/admin/help` route. Update
`docs/internal/admin-design-system.md` with a Help home recipe, add the `/admin/help` route to the admin
reference, and add a `CHANGELOG.md` entry (a new admin screen; no `Consumers must:` line, the route is
additive). Append any friction to `docs/internal/docs-friction-log.md`.

## Deferred (not in this slice)

- **The wikilink highlight rider.** The Explore pass found `[[` is an autocomplete trigger that rewrites
  to a `cairn:` link, so a literal `[[page-name]]` rarely persists in the source, and the render behavior
  for a literal wikilink needs its own look. Defer it to a small editor pass that first settles whether
  the renderer resolves literal `[[page-name]]` (and if the cheat sheet should teach the autocomplete path
  instead), then attaches a `Decoration.mark` over `[[...]]` following the directive-highlight pattern
  (`editor-highlight.ts:107-182`).
- **The recede-on-desk slide-over** (screen-contextual help, with the route-and-concept-keyed manifest),
  **the command-palette help** integration, the deeper **corpus**, and **starter content** in the empty
  state (rides the scaffolder). These are later slices on the same architecture, per the spec.

## Self-review

- **Spec coverage.** The first-slice scope in the spec maps to the tasks: the shared help-content source
  (Task 1), the derive-progress function (Task 2), the Help route and load and `HelpData` (Task 3), the
  Help home component with the empty/populated/done and set/unset states (Task 4), and the labeled nav
  home (Task 5). The design-system, reference, and changelog updates are the exit criteria. The wikilink
  rider and the later slices are explicitly deferred.
- **No placeholders.** Each task names the exact files and seams (with the Explore map's line numbers),
  the interface types and names, the test intent with assertions, and the key shapes. The component port
  references the polished mockup as the build source rather than restating 700 lines of markup.
- **Type consistency.** `markdownReference: MarkdownReferenceRow[]` (Task 1) is consumed by `helpLoad`
  and the component (Tasks 3, 4). `deriveGettingStarted` returns `GettingStarted` (Task 2), carried on
  `HelpData.gettingStarted` (Task 3) and read by the component (Task 4). `HelpData` is defined once
  (Task 3) and consumed by the component (Task 4). The view string `'help'` matches across the parser,
  the union, the load, and the switch.
