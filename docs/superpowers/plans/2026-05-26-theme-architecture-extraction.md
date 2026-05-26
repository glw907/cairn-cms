# Theme-Architecture Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the generic markdown/directive **rendering engine + component-registry machinery** into `@glw907/cairn-cms`, leaving each site's theme to supply only registry entries (builders + class names + templates), the icon set, and CSS — fully realizing the scaffold-copy theme architecture (model a) for ecnordic-ski and 907-life, with **byte-identical rendered output** (no production change).

**Architecture:** cairn-core gains a `render` module: a pipeline factory + a registry type + a generic remark directive-stamp plugin (parameterized by component names + role→default-icon) + the rehype dispatcher and shared structural helpers (`splitHead`, `cardShell`, `markFirstList`, rise stagger, recursion) + a `glyph(name, set)` helper. Each site keeps a **theme registry** (`src/lib/theme/`) holding its component builder fns + class names + insert templates + icon set; its `render.ts` composes the processor from `cairn-cms` + that registry. The single registry also feeds the editor's component palette (R10a). Safety net: characterization snapshot tests capture current rendered HTML before any move, asserting identical output after.

**Tech Stack:** unified / remark / rehype / mdast / hast / hastscript, Vitest, SvelteKit, `@glw907/cairn-cms` (workspace package), Carta.

**Critique constraints to honor in this plan** (see `docs/ARCHITECTURE-CRITIQUE.md`): (H1) keep ALL
security/fix-prone + UI logic in the engine — the theme holds only registry data + builders + class names +
icons + CSS (engine-fat/theme-thin); (M4) `@sveltejs/kit` stays a **peerDependency** with one resolved
version asserted; (C4) keep Carta/Shiki **client-only** and guard bundle size. (Auth-hardening — C1/C2/H3 —
is a SEPARATE pass, not this one.)

---

## File Structure

**cairn-cms (new — the engine):**
- `src/lib/render/registry.ts` — `ComponentRegistry`, `ComponentDef` types; `defineRegistry()` helper.
- `src/lib/render/remark-directives.ts` — generic directive-stamp plugin (from `remark-ec-directives.ts`, parameterized).
- `src/lib/render/rehype-dispatch.ts` — generic dispatcher + shared helpers (`splitHead`, `cardShell`, `markFirstList`, rise, recursion) extracted from `rehype-ec-primitives.ts`.
- `src/lib/render/glyph.ts` — `glyph(name, iconSet)` (from `icons.ts`'s `glyph`, parameterized by an icon-path map).
- `src/lib/render/pipeline.ts` — `createRenderer(registry)` → `{ renderMarkdown, remarkPlugins, rehypePlugins }` (the `render.ts` composition, generalized).
- `src/lib/render/index.ts` — barrel; re-exported from the package root barrel `src/lib/index.ts`.
- Tests: `src/tests/render/*.test.ts`.

**ecnordic-ski (theme side):**
- `src/lib/theme/components.ts` — the registry: 7 `ComponentDef`s (card/grid/alert/cta/split/panel/passage) with builder fns + class names + insert templates, using core's shared helpers.
- `src/lib/theme/icons.ts` — `ICON_PATHS` (moved from `src/lib/markdown/icons.ts`, unchanged data).
- `src/lib/markdown/render.ts` — rewired to `createRenderer(ecnordicRegistry)`; keeps exporting `renderMarkdown`, `remarkEcPlugins`, `rehypeEcPlugins` (now derived) for back-compat + Carta.
- Delete after parity: `src/lib/markdown/remark-ec-directives.ts`, `rehype-ec-primitives.ts` (logic now core+registry).
- Tests: `src/tests/markdown/characterization.test.ts` (Phase 0), updated unit tests.

**907-life (theme side):**
- `src/lib/markdown/render.ts` (if present) / `cairn.config.ts` — adopt `createRenderer(emptyRegistry)`; assert identical plain-markdown output.

---

## Phase 0 — Characterization safety net (do FIRST, before any move)

### Task 1: Snapshot ecnordic's current rendered output

**Files:**
- Create: `ecnordic-ski/src/tests/markdown/characterization.test.ts`
- Fixtures: real content already in `src/content/pages/*.md` (crewlab, about, training, volunteers, resources)

- [ ] **Step 1: Write the characterization test** (renders every page + post through the CURRENT `renderMarkdown` and snapshots the HTML)

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { renderMarkdown } from '$lib/markdown/render';

const PAGES_DIR = 'src/content/pages';
const POSTS_DIR = 'src/content/posts';

function bodies(dir: string): [string, string][] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => [f, matter(readFileSync(join(dir, f), 'utf8')).content]);
}

describe('characterization: current rendered HTML is preserved', () => {
  for (const [name, body] of [...bodies(PAGES_DIR), ...bodies(POSTS_DIR)]) {
    it(`renders ${name} identically`, async () => {
      expect(await renderMarkdown(body)).toMatchSnapshot();
    });
  }
});
```

- [ ] **Step 2: Generate the baseline snapshots**

Run: `cd ecnordic-ski && npx vitest run src/tests/markdown/characterization.test.ts`
Expected: PASS, writes `__snapshots__/characterization.test.ts.snap` (one entry per page/post).

- [ ] **Step 3: Commit the baseline**

```bash
git -C ecnordic-ski add src/tests/markdown/characterization.test.ts src/tests/markdown/__snapshots__
git -C ecnordic-ski commit -m "test: characterize current markdown render output (extraction baseline)"
```

> **This snapshot is the contract for the whole plan.** Every later task re-runs it; it must stay green (byte-identical) until the very end, where the only allowed diff is none.

### Task 2: Snapshot 907-life's current rendered output

**Files:**
- Create: `907-life/src/tests/markdown/characterization.test.ts` (same shape; adjust content dirs to 907's layout — posts only)

- [ ] **Step 1: Write the equivalent characterization test** for 907's `renderMarkdown`/preview path (mirror Task 1, posts dir per 907's structure).
- [ ] **Step 2: Generate baseline** — `cd 907-life && npx vitest run src/tests/markdown/characterization.test.ts` → PASS, writes snapshots.
- [ ] **Step 3: Commit** — `git -C 907-life add … && git -C 907-life commit -m "test: characterize 907 render output (extraction baseline)"`

---

## Phase 1 — Build the engine in cairn-core (generic)

### Task 3: Registry types

**Files:**
- Create: `cairn-cms/src/lib/render/registry.ts`
- Test: `cairn-cms/src/tests/render/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { defineRegistry } from '../../lib/render/registry';

describe('defineRegistry', () => {
  it('exposes component names and a role→default-icon map', () => {
    const reg = defineRegistry({
      components: [
        { name: 'card', label: 'Card', description: '', insertTemplate: ':::card\n## H\n:::', build: (n) => n },
        { name: 'alert', label: 'Alert', description: '', insertTemplate: ':::alert\n## H\n:::', build: (n) => n, defaultIconByRole: { caution: 'warning' } },
      ],
    });
    expect(reg.names).toEqual(['card', 'alert']);
    expect(reg.defaultIcon('alert', 'caution')).toBe('warning');
    expect(reg.defaultIcon('card', 'caution')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `cd cairn-cms && npx vitest run src/tests/render/registry.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `registry.ts`**

```ts
import type { Element } from 'hast';

/** A site component: how it inserts (editor) and how it renders (rehype). */
export interface ComponentDef {
  name: string;            // directive name, e.g. 'card'
  label: string;           // palette label
  description: string;     // palette description
  insertTemplate: string;  // scaffold inserted at cursor
  /** Build the final hast element from the stamped directive element. */
  build: (node: Element, rise?: string) => Element;
  /** Optional role→default-icon (e.g. { caution: 'warning' }). */
  defaultIconByRole?: Record<string, string>;
}

export interface ComponentRegistry {
  defs: ComponentDef[];
  names: string[];
  get(name: string): ComponentDef | undefined;
  defaultIcon(name: string, role?: string): string | undefined;
}

export function defineRegistry(input: { components: ComponentDef[] }): ComponentRegistry {
  const byName = new Map(input.components.map((c) => [c.name, c]));
  return {
    defs: input.components,
    names: input.components.map((c) => c.name),
    get: (name) => byName.get(name),
    defaultIcon: (name, role) => (role ? byName.get(name)?.defaultIconByRole?.[role] : undefined),
  };
}
```

- [ ] **Step 4: Run to verify it passes** — same command → PASS.
- [ ] **Step 5: Commit** — `git -C cairn-cms add src/lib/render/registry.ts src/tests/render/registry.test.ts && git -C cairn-cms commit -m "feat(render): component registry type"`

### Task 4: `glyph(name, iconSet)` helper

**Files:**
- Create: `cairn-cms/src/lib/render/glyph.ts`
- Test: `cairn-cms/src/tests/render/glyph.test.ts`

- [ ] **Step 1: Write the failing test** (mirrors `icons.ts`'s `glyph`, but the icon-path map is a parameter)

```ts
import { describe, it, expect } from 'vitest';
import { glyph } from '../../lib/render/glyph';

const SET = { flag: 'M1 2 3 4Z' };

describe('glyph', () => {
  it('builds an ec-glyph svg hast node with the path for the named icon', () => {
    const node = glyph('flag', SET);
    expect(node.tagName).toBe('svg');
    expect(node.properties?.className).toEqual(['ec-glyph']);
    expect(node.properties?.viewBox).toBe('0 0 256 256');
    const path = node.children[0];
    expect(path).toMatchObject({ tagName: 'path', properties: { d: 'M1 2 3 4Z' } });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/tests/render/glyph.test.ts` → FAIL.
- [ ] **Step 3: Implement `glyph.ts`** (verbatim logic from `icons.ts`, icon map injected)

```ts
import { s } from 'hastscript';
import type { Element } from 'hast';

export type IconSet = Record<string, string>;

/** Inline SVG glyph: class ec-glyph, 256 viewBox, currentColor fill. */
export function glyph(name: string, icons: IconSet): Element {
  return s(
    'svg',
    { className: ['ec-glyph'], viewBox: '0 0 256 256', fill: 'currentColor', ariaHidden: 'true' },
    [s('path', { d: icons[name] })],
  );
}
```

- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Commit** — `git -C cairn-cms add src/lib/render/glyph.ts src/tests/render/glyph.test.ts && git -C cairn-cms commit -m "feat(render): parameterized glyph helper"`

### Task 5: Generic remark directive-stamp plugin

**Files:**
- Create: `cairn-cms/src/lib/render/remark-directives.ts`
- Test: `cairn-cms/src/tests/render/remark-directives.test.ts`

- [ ] **Step 1: Write the failing test** (stamps known names; restores accidental prose colons; uses registry's role-default-icon)

```ts
import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from '../../lib/render/remark-directives';
import { defineRegistry } from '../../lib/render/registry';

const reg = defineRegistry({ components: [
  { name: 'card', label: '', description: '', insertTemplate: '', build: (n) => n },
  { name: 'alert', label: '', description: '', insertTemplate: '', build: (n) => n, defaultIconByRole: { caution: 'warning' } },
]});

async function run(md: string) {
  const f = await unified().use(remarkParse).use(remarkDirective)
    .use(remarkDirectiveStamp, reg).use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify).process(md);
  return String(f);
}

describe('remarkDirectiveStamp', () => {
  it('stamps a known container directive with data-primitive/icon/role', async () => {
    const html = await run(':::card{icon=flag role=secondary}\n## H\n:::');
    expect(html).toContain('data-primitive="card"');
    expect(html).toContain('data-icon="flag"');
    expect(html).toContain('data-role="secondary"');
  });
  it('applies the role default icon for alert', async () => {
    const html = await run(':::alert{role=caution}\n## H\n:::');
    expect(html).toContain('data-icon="warning"');
  });
  it('restores an accidental prose colon (text directive) verbatim', async () => {
    const html = await run('meet at 9:30 today');
    expect(html).toContain('9:30');
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.
- [ ] **Step 3: Implement `remark-directives.ts`** — the body of `remark-ec-directives.ts`, but `PRIMITIVES` → `registry.names`, `ALERT_DEFAULT_ICON` → `registry.defaultIcon(name, role)`. Signature: `export function remarkDirectiveStamp(registry: ComponentRegistry) { return (tree: Root) => { … } }`. Keep `serializeAttributes`/`restoreLiteral` verbatim (they're generic).

- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Commit** — `git -C cairn-cms add src/lib/render/remark-directives.ts src/tests/render/remark-directives.test.ts && git -C cairn-cms commit -m "feat(render): generic directive-stamp plugin (registry-driven)"`

### Task 6: Rehype dispatcher + shared structural helpers

**Files:**
- Create: `cairn-cms/src/lib/render/rehype-dispatch.ts`
- Test: `cairn-cms/src/tests/render/rehype-dispatch.test.ts`

- [ ] **Step 1: Write the failing test** (dispatcher calls the registry's `build` for stamped elements, applies a rise to top-level, recurses; shared helpers exported)

```ts
import { describe, it, expect } from 'vitest';
import { h } from 'hastscript';
import type { Root } from 'hast';
import { rehypeDispatch, splitHead, cardShell, markFirstList } from '../../lib/render/rehype-dispatch';
import { defineRegistry } from '../../lib/render/registry';

const reg = defineRegistry({ components: [
  { name: 'card', label: '', description: '', insertTemplate: '',
    build: (node) => { const { head, rest } = splitHead(node, true); return cardShell(['card'], undefined, [head, h('div', { className: ['section-body'] }, rest)]); } },
]});

it('dispatches a stamped element through its registry build fn', () => {
  const tree: Root = { type: 'root', children: [
    h('div', { dataPrimitive: 'card' }, [h('h2', ['Title']), h('p', ['Body'])]),
  ] } as Root;
  rehypeDispatch(reg)(tree);
  const section = tree.children[0] as any;
  expect(section.tagName).toBe('section');
  expect(section.children[0].children[0].properties.className).toContain('ec-head');
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.
- [ ] **Step 3: Implement `rehype-dispatch.ts`** — export the shared helpers `isElement`, `strProp`, `iconSpan`, `splitHead`, `cardShell`, `markFirstList`, and the rise/recursion machinery (`transformChildren`, top-level `rise` stagger) verbatim from `rehype-ec-primitives.ts`. Replace the hardcoded `switch (dataPrimitive)` with `registry.get(name)?.build(node, rise)`. `iconSpan`/`splitHead` need the glyph — accept the site's `glyph` via the registry or pass an icon set; simplest: builders call `glyph` themselves (Task 7), so `splitHead` takes a pre-built icon element. Adjust `splitHead(node, withIcon, makeIcon?)` to accept an icon-builder callback. Signature: `export function rehypeDispatch(registry: ComponentRegistry) { return (tree: Root) => { … } }`.

> Exact helper signatures are pinned by this task's test + the Phase-3 snapshot. Implement to satisfy both; the registry's `build` fns (Task 8) consume these helpers.

- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Commit** — `git -C cairn-cms add src/lib/render/rehype-dispatch.ts src/tests/render/rehype-dispatch.test.ts && git -C cairn-cms commit -m "feat(render): rehype dispatcher + shared structural helpers"`

### Task 7: Pipeline factory + barrel

**Files:**
- Create: `cairn-cms/src/lib/render/pipeline.ts`, update `cairn-cms/src/lib/render/index.ts` + `src/lib/index.ts`
- Test: `cairn-cms/src/tests/render/pipeline.test.ts`

- [ ] **Step 1: Write the failing test** (a renderer built from an empty registry behaves like plain remark+gfm+rehype; matches a known plain-markdown → html mapping)

```ts
import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline';
import { defineRegistry } from '../../lib/render/registry';

it('empty-registry renderer renders plain markdown', async () => {
  const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
  expect(await renderMarkdown('# Hi\n\nText')).toContain('<h1');
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.
- [ ] **Step 3: Implement `pipeline.ts`** — generalize `render.ts`:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { remarkDirectiveStamp } from './remark-directives';
import { rehypeDispatch } from './rehype-dispatch';
import type { ComponentRegistry } from './registry';

export function createRenderer(registry: ComponentRegistry) {
  const remarkPlugins = [remarkDirective, [remarkDirectiveStamp, registry] as const];
  const rehypePlugins = [rehypeRaw, [rehypeDispatch, registry] as const, rehypeSlug];
  const processor = unified()
    .use(remarkParse).use(remarkGfm).use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true }).use(rehypePlugins)
    .use(rehypeStringify);
  return {
    remarkPlugins, rehypePlugins,
    renderMarkdown: async (content: string) => String(await processor.process(content)),
  };
}
```

- [ ] **Step 4: Export** `createRenderer`, `defineRegistry`, types, `glyph`, and the shared helpers from `src/lib/render/index.ts`, and re-export `render/index` from `src/lib/index.ts`. Run `npx vitest run src/tests/render` → all PASS; run `npm run package` → emits `render/*`.
- [ ] **Step 5: Commit** — `git -C cairn-cms add -A && git -C cairn-cms commit -m "feat(render): pipeline factory + public render exports"`

---

## Phase 2 — Convert ecnordic into a theme on the engine

### Task 8: ecnordic theme registry (the 7 components)

**Files:**
- Create: `ecnordic-ski/src/lib/theme/icons.ts` (move `ICON_PATHS` from `src/lib/markdown/icons.ts`, data unchanged)
- Create: `ecnordic-ski/src/lib/theme/components.ts`
- Test: covered by characterization (Task 1) + a focused unit test below

- [ ] **Step 1: Move the icon data** — copy `ICON_PATHS` into `theme/icons.ts`; export it. (Leave `markdown/icons.ts` until Task 10 deletes it.)
- [ ] **Step 2: Write `theme/components.ts`** — one `ComponentDef` per primitive, whose `build` reproduces the current `buildCard/buildPassage/buildAlert/buildGrid/buildCta/buildSplit/buildPanel` exactly, using core's exported `splitHead`/`cardShell`/`markFirstList` and `glyph(name, ICON_PATHS)`. Class-name constants (`CARD_CLASS`, `CTA_CLASS`) live here (theme-owned). `insertTemplate`/`label`/`description` per the design spec R10. `alert` carries `defaultIconByRole: { caution: 'warning' }`. Export `ecnordicRegistry = defineRegistry({ components: [...] })`.
- [ ] **Step 3: Write a focused unit test** asserting `ecnordicRegistry.names` equals `['card','grid','alert','cta','split','panel','passage']` and a `:::card` builds a `section.card.ec-card` with an `ec-head` + `card-title`. Run it → iterate `build` fns until green.
- [ ] **Step 4: Commit** — `git -C ecnordic-ski add src/lib/theme && git -C ecnordic-ski commit -m "feat(theme): ecnordic component registry on cairn-core engine"`

### Task 9: Rewire ecnordic `render.ts` to the engine

**Files:**
- Modify: `ecnordic-ski/src/lib/markdown/render.ts`

- [ ] **Step 1: Replace the body** with the engine composition, preserving the exported names Carta + callers use:

```ts
import { createRenderer } from '@glw907/cairn-cms';
import { ecnordicRegistry } from '$lib/theme/components';

const renderer = createRenderer(ecnordicRegistry);
export const remarkEcPlugins = renderer.remarkPlugins;   // back-compat for Carta wiring
export const rehypeEcPlugins = renderer.rehypePlugins;
export const renderMarkdown = renderer.renderMarkdown;
```

- [ ] **Step 2: Run the characterization snapshot (Task 1)** — `cd ecnordic-ski && npx vitest run src/tests/markdown/characterization.test.ts`
Expected: **PASS with zero snapshot diffs.** If any diff, fix the Task-8 `build` fns until byte-identical. **Do not update snapshots.**
- [ ] **Step 3: Run the full suite + svelte-check** — `npx vitest run` and `npm run check` → green.
- [ ] **Step 4: Commit** — `git -C ecnordic-ski add src/lib/markdown/render.ts && git -C ecnordic-ski commit -m "refactor(render): ecnordic renders via cairn-core engine (output identical)"`

### Task 10: Delete the superseded in-tree modules

**Files:**
- Delete: `ecnordic-ski/src/lib/markdown/remark-ec-directives.ts`, `rehype-ec-primitives.ts`, `src/lib/markdown/icons.ts`
- Update: any imports of the deleted `icons.ts` glyph to use `$lib/theme/icons` (grep first)

- [ ] **Step 1: Grep for importers** — `grep -rn "markdown/icons\|remark-ec-directives\|rehype-ec-primitives" ecnordic-ski/src`. Repoint each to `$lib/theme/*` or the package.
- [ ] **Step 2: Delete the three files.**
- [ ] **Step 3: Re-run characterization + `npm run check` + `npm run build`** → all green, zero snapshot diff.
- [ ] **Step 4: Commit** — `git -C ecnordic-ski add -A && git -C ecnordic-ski commit -m "chore(render): remove in-tree pipeline superseded by cairn-core"`

---

## Phase 3 — 907-life on the engine (trivial)

### Task 11: 907 adopts the empty-registry renderer

**Files:**
- Modify: 907's render/preview wiring (`src/lib/markdown/render.ts` or `cairn.config.ts` preview plugins)

- [ ] **Step 1:** Replace 907's plain processor with `createRenderer(defineRegistry({ components: [] }))` (or pass `[]`), keeping its exported `renderMarkdown`/preview plugins names.
- [ ] **Step 2: Run 907 characterization (Task 2)** → PASS, zero diff. (907 emits no directives, so the base pipeline must match its current remark+gfm+html output — verify; if 907 used `remark-html` rather than rehype-stringify, keep 907's preview wiring and only adopt the registry where it actually shares the engine. If output differs, 907 keeps its own minimal renderer and simply consumes `defineRegistry` for the palette — record which.)
- [ ] **Step 3: `npm run check` + build** → green.
- [ ] **Step 4: Commit** — `git -C 907-life add -A && git -C 907-life commit -m "refactor(render): 907 on cairn-core engine (empty registry; output identical)"`

---

## Phase 4 — Wire the registry to the editor palette + preview (R10a groundwork)

### Task 12: Expose the registry through the adapter; Carta preview uses it

**Files:**
- Modify: `ecnordic-ski/src/lib/cairn.config.ts` (+ 907's) — adapter exposes its registry; `renderPreview` already uses the engine plugins via `render.ts`.
- Modify (if needed): `cairn-cms` Carta preview wiring to read the registry's plugins.

- [ ] **Step 1:** Add the registry (or its `remarkPlugins`/`rehypePlugins` + `defs`) to each adapter so (a) the Carta preview keeps byte-identical rendering and (b) the future palette (R10) can read `registry.defs`. Keep this additive — no behavior change.
- [ ] **Step 2:** Verify the edit-page Carta preview still renders directives correctly under `wrangler dev` (ecnordic, minted session) — `/admin/edit/pages/crewlab` shows the directive blocks.
- [ ] **Step 3: Commit** — adapter change in each site.

---

## Phase 5 — Verify, release, document

### Task 13: Full verification both sites

- [ ] Package: `cd cairn-cms && npm test && npm run package` → all green; `render/*` in `dist`.
- [ ] ecnordic: `npm run check` (0/0), `npm run build`, characterization zero-diff, `wrangler dev` smoke (`/admin` authed 200, `/admin/edit/pages/crewlab` preview renders).
- [ ] 907: `npm run check` (0/0), `npm run build`, characterization zero-diff, `wrangler dev` smoke.

### Task 14: Release + repoint

- [ ] Bump `@glw907/cairn-cms` minor (e.g. `0.4.0`), publish via the Trusted-Publishing OIDC workflow (GitHub Release).
- [ ] Repoint both sites to the new version with regenerated standalone lockfiles (isolated-temp-dir method — Pass P pattern). Confirm both CI deploys green; both prod sites 200.

### Task 15: Documentation

- [ ] In `cairn-cms/docs/creating-a-cairn-theme.md`, flip the **Components & component registry** section from `[Planned]` → `[Shipped]` for the engine half (registry mechanics + builders-in-theme); note the palette UI remains R10 (admin-UI plan).
- [ ] Append a **Notes / progress log** entry in `docs/PLAN.md` (built, verified with evidence, the engine/theme line as implemented, byte-identical proof).
- [ ] Run the workstation `code-simplifier` over the new cairn-cms `render/*` + ecnordic `theme/*` before the final commit (per the repo's git conventions).

---

## Self-Review

- **Spec coverage:** Engine/theme line (creating-a-cairn-theme.md) → Phases 1–2; R10a registry → Tasks 3,8,12; "no production break" → Phase-0 characterization gating every move + Task 14 CI; both sites → Phases 2–3. The **palette UI / R10** and R1–R9/R11–R12 are explicitly the *separate* admin-UI plan (next), not this one.
- **Placeholder note:** Tasks 6 and 8 intentionally pin exact helper signatures via their tests + the characterization snapshot rather than pre-committing final code, because the precise generic signatures are discovered against the behavior contract — the test is the spec (TDD). All other steps carry concrete code/commands.
- **Type consistency:** `defineRegistry`/`ComponentRegistry`/`ComponentDef`/`createRenderer`/`glyph`/`splitHead`/`cardShell`/`markFirstList`/`remarkDirectiveStamp`/`rehypeDispatch` are used consistently across Tasks 3–9.
