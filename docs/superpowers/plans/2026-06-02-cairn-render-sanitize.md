# cairn Render-Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the render-safety gap by adding a `rehype-sanitize` floor to the engine's render pipeline, on by default, so author markdown can no longer inject script or `javascript:` URLs into the published page.

**Architecture:** One sanitize step is inserted into `createRenderer`, after `rehype-raw` and before the component dispatch. It cleans the untrusted author content while leaving the site's trusted `build()` output and its inline SVG icons untouched. The schema starts from `hast-util-sanitize`'s `defaultSchema` and is extended with the registry-derived directive markers and the benign HTML real content uses. Posture is extend-only, with a developer-only disable hatch. The admin preview and delivery collapse to the one floor, so the redundant DOMPurify preview pass and the `dompurify` dependency are removed.

**Tech Stack:** TypeScript, unified/remark/rehype, `rehype-sanitize` and `hast-util-sanitize`, Svelte 5 (the editor preview), vitest (`unit` in node, `component` in a real browser).

**Design reference:** `docs/superpowers/specs/2026-06-02-cairn-render-sanitize-design.md` (approved).

---

## Conventions for every task

- Work in `/home/glw907/Projects/cairn/cairn-cms` on branch `main`. This pass is additive or internal across the package, and a cairn-cms push deploys no site, so it runs on `main` directly.
- Test-first (TDD): write or change the failing test, run it and watch it fail for the right reason, implement, watch it pass.
- Full gate before each commit: `npm run check` reports 0 errors and 0 warnings, and `npm test` EXITS 0 (it runs `unit`, `component`, and `integration`).
- Targeted unit test: `npx vitest run --project unit src/tests/unit/<file>.test.ts`. Targeted component test: `npx vitest run --project component src/tests/component/<file>.test.ts`.
- Commit specific files, never `git add -A`. Commit footer: `Co-Authored-By: Claude <noreply@anthropic.com>`. No em dashes in commit bodies or code comments; plain voice.
- **Adding or removing a dependency needs the standalone relock dance**, since a bare `npm install` from inside the workspace member drifts the root lock. The exact sequence is in Task 1 and Task 3. Do NOT run a bare `npm install` from the member otherwise.
- Known flake: `src/tests/component/MarkdownEditor.test.ts` can fail once on a CodeMirror mount-timeout under parallel load. If `npm test` exits non-zero solely on that, re-run once to confirm green before committing.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports `@sveltejs/adapter-node`) unless the showcase deps are installed. The svelte-check scan itself is 0 errors 0 warnings either way. If the showcase config import is the only failure, the scan result (0/0) is the gate.

## Reference values (verified against the live tree, 2026-06-02)

- `src/lib/render/pipeline.ts`: the whole renderer factory (38 lines). `RendererOptions` is `{ stagger?: boolean }` (lines 13-18). `createRenderer(registry, options = {})` builds `remarkPlugins` (line 24) and `rehypePlugins = [rehypeRaw, [rehypeDispatch, registry, options.stagger], rehypeSlug]` (line 25), composes the processor (lines 26-32), and returns `{ remarkPlugins, rehypePlugins, renderMarkdown }` (lines 33-37).
- `src/lib/render/registry.ts`: `ComponentRegistry` has `defs: ComponentDef[]` and `names: string[]`. `ComponentDef.attributes?: AttributeField[]`, each with a `key`. `dataAttrProp(key)` (lines 90-92) maps a key to its hast marker property, e.g. `tone` to `dataAttrTone`.
- `src/lib/render/remark-directives.ts`: the stamp writes hast properties `dataPrimitive` (always), `dataIcon`, `dataRole`, and `dataAttr<Key>` per declared attribute onto a `<div>` (`hName='div'`, lines 65-78), and `dataSlot` on slot children (lines 14-19). The dispatch reads these back, so the floor must preserve them.
- `src/lib/render/rehype-dispatch.ts`: `rehypeDispatch(registry, stagger?)` reads `dataPrimitive`/`dataSlot`/`dataAttr*` and stamps `dataRise` on a top-level primitive when `stagger` is on.
- `src/lib/render/sanitize.ts`: the browser-only DOMPurify preview floor (`sanitizePreviewHtml`). Imported only by `src/lib/components/EditPage.svelte:15` and `src/tests/component/sanitize.test.ts:2`. Not re-exported from `src/lib/index.ts`. Deleted in Task 3.
- `src/lib/components/EditPage.svelte`: imports `sanitizePreviewHtml` (line 15); the preview `$effect` (lines 54-68) calls `const html = await render(md); const safe = await sanitizePreviewHtml(html); ... previewHtml = safe;`. `previewHtml` renders via `{@html previewHtml}` (line 115). The `render` prop is `(md, opts?) => string | Promise<string>` (line 23).
- `src/tests/component/EditPage.test.ts`: a `postProps(over)` helper (lines 6-28); the preview tests at lines 73-80 and 82-93 are rewritten in Task 3.
- `src/tests/unit/render-pipeline.test.ts`: shows the `createRenderer(defineRegistry({ components }))` test pattern, including a registered-component render (lines 17-38).
- Current version: `package.json` `"version": "0.16.0"` (unpublished).
- Workspace root for the relock dance: `/home/glw907/Projects/cairn` (holds the root `package.json` and `package-lock.json`).

---

## Task 1: add the sanitize dependencies

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `package-lock.json` (regenerated by the relock)

Add `rehype-sanitize` (the rehype plugin) and `hast-util-sanitize` (its schema and the `Schema` type). `dompurify` stays for now, since `EditPage` still imports the preview floor until Task 3. This task adds dependencies only and changes no source, so the gate is the existing suite staying green against the new lock.

- [ ] **Step 1: Relock standalone with the new dependencies**

Run this exact sequence (it temp-moves the root workspace manifests so npm treats cairn-cms standalone, installs into the member, then restores the root):

```bash
cd /home/glw907/Projects/cairn
mv package.json _root-package.json.bak
mv package-lock.json _root-package-lock.json.bak
cd /home/glw907/Projects/cairn/cairn-cms
rm -rf node_modules package-lock.json
npm install rehype-sanitize hast-util-sanitize
cd /home/glw907/Projects/cairn
mv _root-package.json.bak package.json
mv _root-package-lock.json.bak package-lock.json
```

- [ ] **Step 2: Confirm the dependencies landed**

Run: `cd /home/glw907/Projects/cairn/cairn-cms && node -e "const p=require('./package.json'); console.log(p.dependencies['rehype-sanitize'], p.dependencies['hast-util-sanitize'])"`
Expected: two version ranges print (not `undefined undefined`). Confirm `node_modules/rehype-sanitize` and `node_modules/hast-util-sanitize` both exist.

- [ ] **Step 3: Gate**

Run `npm run check` (0/0) and `npm test` (exit 0). The suite is unchanged, so it stays green on the new lock. Re-run once if the only failure is the known `MarkdownEditor.test.ts` flake.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(render): add rehype-sanitize and hast-util-sanitize

The render-safety pass adds a sanitize floor to the engine pipeline. Pull in
rehype-sanitize and hast-util-sanitize, which carry the GitHub-lineage
defaultSchema the floor extends. dompurify stays until the preview unification
in a later task drops its last importer. The lock was rebuilt standalone so the
workspace root lock did not drift.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: the sanitize floor in the render pipeline

**Files:**
- Create: `src/lib/render/sanitize-schema.ts`
- Modify: `src/lib/render/pipeline.ts`
- Create: `src/tests/unit/render-sanitize.test.ts`

Insert `rehype-sanitize` after `rehype-raw` and before the dispatch, with a schema built from `defaultSchema` plus the registry-derived directive markers and the benign author tags. Add the `target="_blank"` rel hardening as a small transform after the dispatch, carrying the behavior the DOMPurify preview pass enforced. Wire the `sanitizeSchema` extend option and the developer-only `unsafeDisableSanitize` hatch.

- [ ] **Step 1: Write the floor module**

Create `src/lib/render/sanitize-schema.ts`:

```ts
import { defaultSchema, type Schema } from 'hast-util-sanitize';
import type { Root, Element } from 'hast';
import { visit } from 'unist-util-visit';
import { dataAttrProp, type ComponentRegistry } from './registry.js';

// The fixed directive markers the stamp writes and the dispatch reads. They are inert data
// attributes, never a script vector, and must survive the floor so the dispatch still runs.
const FIXED_MARKERS = ['dataPrimitive', 'dataSlot', 'dataIcon', 'dataRole', 'dataRise'];

/**
 * Build the delivery sanitize schema. Starts from hast-util-sanitize's defaultSchema, the
 * GitHub-lineage allowlist that strips scripts, inline event handlers, and javascript:/data: URLs,
 * then adds exactly what cairn's render needs. The directive markers (the fixed ones plus the
 * dataAttr<Key> markers derived from the registry) survive so the dispatch reads its stamps after
 * the floor. The benign author tags real content uses (nav, details, summary) and class/target/rel
 * on anchors are admitted. A site extends the result through `extend`, always starting from this
 * safe base, so it can add to the allowlist but not weaken the core strip.
 */
export function buildSanitizeSchema(
  registry: ComponentRegistry,
  extend?: (defaults: Schema) => Schema,
): Schema {
  const attrMarkers = registry.defs.flatMap((d) => (d.attributes ?? []).map((a) => dataAttrProp(a.key)));
  const markers = [...FIXED_MARKERS, ...attrMarkers];
  const attributes = defaultSchema.attributes ?? {};
  const schema: Schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), 'nav', 'details', 'summary'],
    attributes: {
      ...attributes,
      '*': [...(attributes['*'] ?? []), 'className', ...markers],
      a: [...(attributes.a ?? []), 'className', 'target', 'rel'],
    },
  };
  return extend ? extend(schema) : schema;
}

/**
 * Force rel="noopener noreferrer" on every target="_blank" anchor, to prevent reverse-tabnabbing.
 * hast-util-sanitize runs no per-node hook, so this small transform carries the behavior the old
 * DOMPurify preview pass enforced, now on the delivered output as well.
 */
export function rehypeAnchorRel() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'a' && node.properties?.target === '_blank') {
        node.properties.rel = 'noopener noreferrer';
      }
    });
  };
}
```

- [ ] **Step 2: Write the failing floor tests**

Create `src/tests/unit/render-sanitize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
import type { Schema } from 'hast-util-sanitize';

const plain = () => createRenderer(defineRegistry({ components: [] }));

describe('render sanitize floor', () => {
  it('strips a script element from author HTML', async () => {
    const html = await plain().renderMarkdown('ok\n\n<script>alert(1)<\/script>');
    expect(html).not.toContain('alert');
  });

  it('strips an inline event handler', async () => {
    const html = await plain().renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });

  it('neutralizes a javascript: link but keeps the text', async () => {
    const html = await plain().renderMarkdown('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('click');
  });

  it('neutralizes a data: link', async () => {
    const html = await plain().renderMarkdown('[x](data:text/html,<script>alert(1)<\/script>)');
    expect(html).not.toContain('data:text/html');
  });

  it('keeps ordinary formatting', async () => {
    const html = await plain().renderMarkdown('Hello **world**');
    expect(html).toContain('<strong>world</strong>');
  });

  it('keeps benign author tags real content uses', async () => {
    const html = await plain().renderMarkdown(
      '<nav><a href="#x" class="toc-link">X</a></nav>\n\n<details><summary>More</summary>\n\nbody\n\n</details>',
    );
    expect(html).toContain('<nav>');
    expect(html).toContain('class="toc-link"');
    expect(html).toContain('<details>');
    expect(html).toContain('<summary>');
  });

  it('forces rel="noopener noreferrer" on a target="_blank" anchor', async () => {
    const html = await plain().renderMarkdown('<a href="https://x.test" target="_blank">x</a>');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('preserves the directive markers so a registered component still renders', async () => {
    const reg = defineRegistry({
      components: [
        {
          name: 'box',
          label: '',
          description: '',
          build: (ctx) => {
            const node = ctx.node;
            node.tagName = 'section';
            node.properties = { className: ['box'] };
            return node;
          },
        },
      ],
    });
    const html = await createRenderer(reg).renderMarkdown(':::box\ncontent\n:::');
    expect(html).toContain('class="box"');
    expect(html).toContain('content');
  });

  it('a sanitizeSchema extension admits a tag while the core strip still removes a script', async () => {
    const extend = (s: Schema): Schema => ({ ...s, tagNames: [...(s.tagNames ?? []), 'figure'] });
    const r = createRenderer(defineRegistry({ components: [] }), { sanitizeSchema: extend });
    const html = await r.renderMarkdown('<figure>cap</figure>\n\n<script>alert(1)<\/script>');
    expect(html).toContain('<figure>');
    expect(html).not.toContain('alert');
  });

  it('unsafeDisableSanitize lets raw HTML through (developer-only hatch)', async () => {
    const r = createRenderer(defineRegistry({ components: [] }), { unsafeDisableSanitize: true });
    const html = await r.renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).toContain('onerror');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run --project unit src/tests/unit/render-sanitize.test.ts`
Expected: FAIL. The floor is not wired into the pipeline yet, so `onerror`, `javascript:`, and the script survive, and `RendererOptions` has no `sanitizeSchema`/`unsafeDisableSanitize` (a type error on those two tests until Step 4).

- [ ] **Step 4: Wire the floor into the pipeline**

In `src/lib/render/pipeline.ts`, add these imports after the existing rehype imports (after line 8):

```ts
import rehypeSanitize from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import { buildSanitizeSchema, rehypeAnchorRel } from './sanitize-schema.js';
```

Replace the `RendererOptions` interface (lines 13-18) with:

```ts
export interface RendererOptions {
  /** Stamp a `data-rise` ordinal (0, 1, 2, …) on each top-level component so a site's
   *  CSS can drive an entrance-cascade delay off it. Omit for no stagger. The ordinal
   *  is inert, so a consumer's sanitize floor can keep `data-rise` and drop `style`. */
  stagger?: boolean;
  /** Extend the sanitize allowlist. Receives cairn's default schema (defaultSchema plus the
   *  directive markers and the common benign tags) and returns the schema to use. Add to the
   *  allowlist for the benign HTML a site's content needs; start from the argument so the
   *  dangerous strip is preserved. */
  sanitizeSchema?: (defaults: Schema) => Schema;
  /** Developer-only escape hatch: disable the sanitize floor entirely. This reintroduces the XSS
   *  vector the floor closes, so it is only for a site whose content is fully developer-controlled.
   *  It is a code-level adapter decision, never an editor-facing setting. */
  unsafeDisableSanitize?: boolean;
}
```

Replace the `rehypePlugins` line (line 25) with the floored composition:

```ts
  // The sanitize floor runs after rehype-raw (so author raw HTML is parsed, then cleaned) and
  // before the dispatch (so the site's trusted build() output and its inline SVG icons are never
  // sanitized). The anchor-rel hardening runs last so it also covers component-built anchors.
  const floor: PluggableList = options.unsafeDisableSanitize
    ? []
    : [[rehypeSanitize, buildSanitizeSchema(registry, options.sanitizeSchema)]];
  const rehypePlugins: PluggableList = [
    rehypeRaw,
    ...floor,
    [rehypeDispatch, registry, options.stagger],
    rehypeSlug,
    rehypeAnchorRel,
  ];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run --project unit src/tests/unit/render-sanitize.test.ts`
Expected: PASS, all eleven tests green. Then run `npx vitest run --project unit src/tests/unit/render-pipeline.test.ts` to confirm the existing pipeline tests still pass (the registered-component render and the data-rise stamp survive the floor, since the markers are preserved).

- [ ] **Step 6: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/render/sanitize-schema.ts src/lib/render/pipeline.ts src/tests/unit/render-sanitize.test.ts
git commit -m "feat(render): sanitize author content in the delivery pipeline

Insert rehype-sanitize after rehype-raw and before the component dispatch, so it
cleans the untrusted author markdown (raw HTML, link URLs, slot bodies) while the
site's trusted build() output and its inline SVG icons are never sanitized. The
schema extends defaultSchema with the registry-derived directive markers, so the
dispatch still reads its stamps, and with the benign tags real content uses (nav,
details, summary, anchor class/target/rel). A target=_blank anchor gets
rel=noopener noreferrer. A site extends the allowlist through sanitizeSchema and
cannot weaken the core; unsafeDisableSanitize is the developer-only off switch.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: collapse the preview onto the one floor

**Files:**
- Modify: `src/lib/components/EditPage.svelte`
- Delete: `src/lib/render/sanitize.ts`
- Delete: `src/tests/component/sanitize.test.ts`
- Modify: `src/tests/component/EditPage.test.ts`
- Modify: `package.json` (remove `dompurify`)
- Modify: `package-lock.json` (regenerated by the relock)

The preview renders through the adapter's `render`, which is the same floored `createRenderer` pipeline. So the second DOMPurify pass is redundant and can drift from the real page. Remove it, render the pipeline output directly, delete the DOMPurify module and its test, and drop the `dompurify` dependency. The preview becomes a faithful mirror of the published page.

This task is a behavior-preserving refactor for the real path: the safety the old DOMPurify-coupled test asserted moves to the floor, which Task 2's unit tests cover. So the rewritten preview tests encode the new contract and stay green across the change, rather than failing first. The proof the responsibility moved is that the dangerous-payload test passes while driving a real floored renderer with `dompurify` gone, plus the deletion of the DOMPurify-specific unit test.

- [ ] **Step 1: Rewrite the preview tests against a real floored renderer**

In `src/tests/component/EditPage.test.ts`, add these imports after the existing imports (after line 4):

```ts
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';
```

Replace the two preview tests (the `it('renders sanitized preview HTML when the preview is shown', ...)` block at lines 73-80 and the `it('strips a dangerous payload from the rendered preview', ...)` block at lines 82-93) with:

```ts
  it('renders preview HTML when the preview is shown', async () => {
    const props = { ...postProps({ body: 'Hello world' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('Hello world');
  });

  it('the floored render pipeline strips a dangerous payload in the preview', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({ body: 'safe text\n\n<img src=x onerror="alert(1)">' }),
      render: (md: string) => renderMarkdown(md),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('safe text');
    expect(screen.container.querySelector('section[aria-label="Preview"]')!.innerHTML).not.toContain('onerror');
  });
```

The second test now drives the real floored renderer through the editor, so the payload is stripped by the pipeline rather than a DOMPurify pass in the component. That is the behavior in production, where `render` is the adapter's floored `renderMarkdown`.

- [ ] **Step 2: Run the rewritten tests to confirm the new contract holds**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS. The dangerous-payload test drives a real floored renderer, so the payload is already stripped by the pipeline (DOMPurify, still present, is now redundant on already-clean output). These two tests are the contract that must stay green across the refactor in Steps 3 through 5. If a test fails here, the floor from Task 2 is wrong, not this task; stop and fix Task 2.

- [ ] **Step 3: Render the pipeline output directly in EditPage**

In `src/lib/components/EditPage.svelte`, remove the import on line 15:

```ts
  import { sanitizePreviewHtml } from '../render/sanitize.js';
```

Replace the preview `$effect` comment and body (lines 49-68) so it renders the floored output directly. Change the two comment lines (49-50) to:

```ts
  // Render the design-accurate preview as the body changes, debounced. The site's render is the
  // floored engine pipeline, so its output is already sanitized; the preview mirrors the page.
  // previewRun is a plain counter (not reactive state) used as a latest-wins guard: if a slow earlier
  // async render call resolves after a newer one has started, the stale result is discarded.
```

And change the `try` block (lines 59-65) from:

```ts
      try {
        const html = await render(md);
        const safe = await sanitizePreviewHtml(html);
        if (run === previewRun) previewHtml = safe;
      } catch {
        if (run === previewRun) previewHtml = '';
      }
```

to:

```ts
      try {
        const html = await render(md);
        if (run === previewRun) previewHtml = html;
      } catch {
        if (run === previewRun) previewHtml = '';
      }
```

Also update the `render` prop doc comment (line 22) from `the preview pane sanitizes its output` to `the preview pane renders its output, which the floored pipeline already sanitized`.

- [ ] **Step 4: Delete the DOMPurify module and its test**

```bash
git rm src/lib/render/sanitize.ts src/tests/component/sanitize.test.ts
```

- [ ] **Step 5: Remove the dompurify dependency (standalone relock)**

```bash
cd /home/glw907/Projects/cairn
mv package.json _root-package.json.bak
mv package-lock.json _root-package-lock.json.bak
cd /home/glw907/Projects/cairn/cairn-cms
rm -rf node_modules package-lock.json
npm uninstall dompurify
cd /home/glw907/Projects/cairn
mv _root-package.json.bak package.json
mv _root-package-lock.json.bak package-lock.json
```

Confirm: `cd /home/glw907/Projects/cairn/cairn-cms && node -e "console.log(require('./package.json').dependencies.dompurify ?? 'removed')"` prints `removed`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run --project component src/tests/component/EditPage.test.ts`
Expected: PASS. The preview shows the render output, and the floored renderer strips `onerror`. Then confirm there is no dangling import: `grep -rn "render/sanitize" src/` returns nothing.

- [ ] **Step 7: Gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add src/lib/components/EditPage.svelte src/tests/component/EditPage.test.ts src/lib/render/sanitize.ts src/tests/component/sanitize.test.ts package.json package-lock.json
git commit -m "refactor(render): drop the DOMPurify preview pass for the one floor

The admin preview renders through the adapter's render, which is the floored
engine pipeline, so the separate DOMPurify pass was redundant and could drift
from the real page. Render the pipeline output directly, delete the browser-only
sanitize module and its test, and drop the dompurify dependency. The preview is
now a faithful mirror of the published page, and the rewritten EditPage test
drives the real floored renderer so it still proves a payload is stripped. The
lock was rebuilt standalone so the workspace root lock did not drift.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: document the render-safety contract and the CSP recommendation

**Files:**
- Modify: `docs/creating-a-cairn-site.md`

The site-author guide should state that the engine sanitizes author content by default, name the floor as the primary XSS control, and recommend a public-page CSP as defense-in-depth. This task is docs only, so it skips the simplifier and runs no test, but the gate's `npm run check` must still pass.

- [ ] **Step 1: Add the render-safety subsection**

In `docs/creating-a-cairn-site.md`, add a new `### Render safety and CSP` subsection at the end of the `## Public delivery` section (after the `### Platform note` subsection near line 471). Write it as prose, not a bare list, covering these load-bearing points:

- The engine sanitizes author content in the render pipeline by default. `createRenderer` runs `rehype-sanitize` after `rehype-raw` and before the component dispatch, so author markdown cannot inject script, inline event handlers, or `javascript:`/`data:` URLs into the page. This is the primary XSS control.
- A site extends the allowlist through `createRenderer(registry, { sanitizeSchema })` when its content needs a benign tag the default omits. The callback receives cairn's default schema and returns an extended one, so a site adds to the allowlist and cannot weaken the core strip. The `unsafeDisableSanitize` option turns the floor off and is only for a site whose content is fully developer-controlled.
- The component `build(ctx)` output is trusted and is never sanitized, since it is the site's own code and runs after the floor. Author content inside a component's slots is sanitized.
- A public-page Content-Security-Policy is recommended as defense-in-depth, set in the site's response headers or `svelte.config.js` (`kit.csp`), for example `script-src 'self'; object-src 'none'; base-uri 'self'`. The CSP is the site's to set, since it spans the library and the site, and the sanitize floor is the control that does not depend on it.

- [ ] **Step 2: Prose check and gate**

Run `prose-guard docs/creating-a-cairn-site.md` (the blocking tier must pass; the advisory anaphora and burstiness sweep on the whole file is not a gate). Then run `npm run check` (0/0) to confirm the docs change did not break the scan.

- [ ] **Step 3: Commit**

```bash
git add docs/creating-a-cairn-site.md
git commit -m "docs(render): document the sanitize floor and the CSP recommendation

State that the engine sanitizes author content by default, name the floor as the
primary XSS control, and describe the sanitizeSchema extend seam and the
developer-only disable hatch. Recommend a public-page CSP as defense-in-depth,
set by the site, since it spans the library and site boundary.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: bump the version and run the full gate

**Files:**
- Modify: `package.json`

The pass adds the floor and removes the internal DOMPurify pass. The render output for clean content is unchanged, so the surface is additive. It bumps a minor to `0.17.0`.

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.16.0"` to `"version": "0.17.0"`.

- [ ] **Step 2: Validate the package shape**

Run: `npm run check:package`
Expected: green. No export-condition change; this pass adds no export.

- [ ] **Step 3: Full gate and commit**

Run `npm run check` (0/0) and `npm test` (exit 0), then:

```bash
git add package.json
git commit -m "chore(render): bump to 0.17.0 for the render-safety pass

The render-safety pass adds the sanitize floor to the delivery pipeline, removes
the redundant DOMPurify preview pass, and documents the render-safety contract.
The render output for clean content is unchanged, so the bump is a minor to
0.17.0, unpublished until the next release rolls the window.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification items (no implementation task)

- **Showcase end-to-end.** The showcase production prerender stays the end-to-end gate, and `npm test` exercises it. Confirm at the pass-end gate that the showcase `callout` still prerenders to its full `<aside class="callout ...">` markup through the floor, the proof that the before-dispatch placement preserves the directive markers.

## Pass-end review gate

The pass changes the render pipeline (an XSS control) and one Svelte component. The gate runs `svelte-reviewer` (Opus) for the `EditPage` change, a high-effort `/code-review` with a security angle to confirm the floor closes the script, event-handler, and `javascript:`/`data:` vectors and that the before-dispatch placement cannot serve unsanitized author content, and the simplifier over the changed code. The `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and `daisyui-a11y-reviewer` do not apply (no Worker, auth, session, cookie, or new DaisyUI markup). No `/admin` server surface changed, so the live admin smoke does not apply; the editor preview is covered by the browser component tests.

---

## Self-review notes

- **Spec coverage.** Spec unit 1 (the floor) is Task 2; unit 2 (anchor hardening) is folded into Task 2, since `rehypeAnchorRel` is part of the floor module and composition; unit 3 (preview unification) is Task 3; unit 4 (docs) is Task 4; unit 5 (version) is Task 5. The dependency add is Task 1, a prerequisite the spec implies. The extend-only posture and the developer-only disable hatch are realized by `RendererOptions.sanitizeSchema` and `unsafeDisableSanitize` in Task 2 and documented in Task 4.
- **No regression.** The existing `render-pipeline.test.ts` registered-component and data-rise tests hold, since the floor preserves the directive markers. The other `EditPage` tests hold, since only the two preview tests change. `createRenderer`'s return shape (`remarkPlugins`, `rehypePlugins`, `renderMarkdown`) is unchanged, so `render-exports.test.ts` holds; the exported `rehypePlugins` array now includes the floor, which is correct.
- **Type and name consistency.** `buildSanitizeSchema(registry, extend?)` returns `Schema`, the type `RendererOptions.sanitizeSchema` produces and consumes. `rehypeAnchorRel` is a zero-arg rehype plugin. `dataAttrProp` is imported from `registry.js` in both the stamp and the schema builder, so the marker names match on both sides. `unsafeDisableSanitize` and `sanitizeSchema` are defined in Task 2 before any later reference.
- **Ordering and green builds.** Task 1 adds the deps so Task 2 can import them. Task 2 wires the floor with `dompurify` still present, so the build stays green. Task 3 removes the DOMPurify importer and only then drops the `dompurify` dependency, so no task leaves a dangling import or an unused dependency. Each task ends with the full gate.
- **Dependency hygiene.** Both dependency changes use the standalone relock dance, so the workspace root lock never drifts. The committed artifacts are `package.json` and the rebuilt `package-lock.json`.
- **Versioning.** Additive apart from the internal DOMPurify removal. No export-condition change. Bumps a minor to `0.17.0`, unpublished until the next release rolls the `0.16.0`/`0.17.0` window into one publish.
```

---

## Post-mortem (executed 2026-06-02)

The pass executed subagent-driven on `main`, one `cairn-implementer` per task (Sonnet), commits `ae69a50..8aee8a7`. That is the five plan-task commits plus one review-gate doc fold-in. Local only, not pushed, not published. The version bumped to `0.17.0`.

### What was built

The engine render pipeline now sanitizes author content by default. `createRenderer` inserts `rehype-sanitize` after `rehype-raw` and before the component dispatch, so it cleans the untrusted author markdown (raw HTML, link URLs, slot bodies) while the site's trusted `build()` output and its inline SVG icons run after the floor and are never sanitized. A new `src/lib/render/sanitize-schema.ts` holds `buildSanitizeSchema(registry, extend?)`, which starts from `hast-util-sanitize`'s `defaultSchema` and adds the directive markers (`dataPrimitive`, `dataSlot`, `dataIcon`, `dataRole`, `dataRise`, and the registry-derived `dataAttr<Key>` markers) so the dispatch still reads its stamps, plus the benign tags real content uses (`nav`, `details`, `summary`) and free-form `className`/`target`/`rel` on anchors. `rehypeAnchorRel` runs last and forces `rel="noopener noreferrer"` on every `target="_blank"` anchor, covering component-built anchors too. Two `RendererOptions` members wire the posture: `sanitizeSchema` extends the allowlist from the safe base (extend-only, a site cannot weaken the core strip), and `unsafeDisableSanitize` is the developer-only off switch. The admin preview in `EditPage.svelte` collapsed onto the one floor: the redundant DOMPurify pass and the `dompurify` dependency are gone, and the preview now renders the floored pipeline output directly, so it mirrors the published page. `docs/creating-a-cairn-site.md` documents the contract.

### Execution deviations locked in

- **Task 2, the `a`-scope className filter.** The plan's verbatim schema builder appended a bare `'className'` to the `a` attribute scope, which did not work: `defaultSchema.attributes.a` carries a restrictive `['className', 'data-footnote-backref']` tuple that a per-tag entry honors over a bare `*` entry, so an author's `class="toc-link"` collapsed to `class=""`. The implementer added a filter that drops the existing className tuple from the `a` scope before appending free-form `className`, with an explaining comment. The dangerous strip is unaffected (the script, event-handler, `javascript:`, and `data:` tests all still pass). Verified at the review gate as a faithful realization of the plan's intent.

### Verification (evidence)

- Final gate at the tip (`8aee8a7`): `npm run check` 753 files 0 errors 0 warnings; `npm test` exits 0 at 482 tests; `npm run check:package` all-green with no export-condition change.
- The new `render-sanitize.test.ts` (ten cases) proves the floor strips a `<script>`, an inline event handler, a `javascript:` link, and a `data:` link, keeps ordinary formatting and the benign author tags, forces the anchor rel, preserves the directive markers so a registered component still renders, honors a `sanitizeSchema` extension while keeping the core strip, and lets `unsafeDisableSanitize` through.
- Verification item satisfied: the showcase production build (exit 0) prerenders the `callout` to `<aside class="callout callout-warning">` through the floor, and no `onerror`/`<script>` vectors appear in the prerendered output, the proof the before-dispatch placement preserves the directive markers and the full component render.

### Review gate

A `code-simplifier` pass found nothing to change (the code is already clean and the security-critical factoring is correct). `svelte-reviewer` (Opus) returned a clean verdict on the `EditPage` change: the `$effect` debounce and the `previewRun` latest-wins guard are correct, dropping the second await introduces no race, and `{@html previewHtml}` is safe given the single-floor model. A high-effort seven-angle `/code-review` with a security angle surfaced one Important finding, folded in as `8aee8a7`: the floor runs before the dispatch, so a component `build()` that routes a directive **attribute value** (raw author input) into an `href`, `src`, `style`, or event-handler position re-opens the `javascript:` vector the floor otherwise closes. The build *code* is trusted, but its *inputs* are not. This is not a regression (delivery had no sanitization at all before this pass) and the planned sites route attribute values into class positions, so the fix is a documented `build()` contract caveat in the render-safety section rather than engine code. The other findings were a Minor (the preview renders a custom non-floored `render` prop directly, by design on the trusted admin surface), a Minor (`defaultSchema`'s `clobberPrefix` rewrites a hand-rolled author `id`, a security feature, heading anchors unaffected since `rehypeSlug` runs after the floor), and a Nit (`className` on the `*` scope, not a script vector). The three non-folded findings are recorded as carried follow-ups. The `cloudflare-workers-reviewer`, `web-auth-security-reviewer`, and `daisyui-a11y-reviewer` did not apply, and no `/admin` server surface changed, so the live admin smoke did not apply.

### Carried follow-ups

- **A URL-coercing helper for component builds (latent, low likelihood for the planned sites).** A future component-lifecycle or render pass could give `build()` a coercion helper for attribute values headed into URL or handler positions, or add a narrow post-dispatch protocol check, so the contract is enforced rather than only documented. The planned sites use attribute values in class positions, so this is not urgent.
- The preview's single-floor model assumes the adapter's `render` is the floored `createRenderer` pipeline. A site that wires a custom non-floored `render` (or one built with `unsafeDisableSanitize`) reintroduces preview XSS into the trusted admin surface. Documented and acceptable; named here so a later editor pass keeps the assumption in view.
