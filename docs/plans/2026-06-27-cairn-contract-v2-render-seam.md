# Contract v2 Phase 4a: Render-Seam Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the `render` adapter seam from the positional `render(md, opts?): string | Promise<string>` to the entry-aware `render({ body, concept?, frontmatter?, resolve?, resolveMedia? }): Promise<string>`, and retire the dead `stagger` knob by making the `data-rise` entrance ordinal unconditional pipeline output.

**Architecture:** The seam type lives in two parallel declarations (`CairnAdapter.rendering.render`, `CairnRuntime.render`) plus a narrower local copy in `public-routes.ts`. This pass extracts one shared `SiteRender` type, retypes all three to it, and migrates the four call sites (the public route, the editor preview, the component-insert preview, the syndication feeds) plus the showcase adapter, the test fixture, and the tests. The engine's internal `renderMarkdown(content, { resolve, resolveMedia })` is unchanged; only the site-facing seam wraps it. Separately, the entrance-stagger ordinal (`data-rise`) becomes unconditional pipeline output (it is inert without site CSS), the `stagger` plumbing leaves `createRenderer`/`rehypeDispatch`/the seam, and the preview document gains a `data-cairn-preview` marker a site can scope an entrance animation against.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, unified/remark/rehype, Vitest (unit + integration in workerd/miniflare, component in a real browser), Playwright (showcase e2e).

## Global Constraints

- **Version:** bump to `0.75.0` (breaking-within-0.x, minor). The whole Contract v2 window stays held unpublished; no GitHub Release or npm publish this pass. Sync the root `package-lock.json` self-version in the same commit (`check:version` does not catch the lockfile self-version; CI `npm ci` needs it).
- **Gate per task:** `npm run check` (svelte-check, 0 errors and 0 warnings) and `npm test` (exit 0, not just a passing assertion count). `check` is 0-warnings, so Task 2 has no mid-migration green; it is one atomic compile unit gated once.
- **Comment standard:** TSDoc, enforced by `npm run check:comments` over `src/lib`. No `{type}` tags, no em dash in comments, document the contract not the type.
- **Docs are a pass dimension:** a public-API change is not done until its reference page matches. Run all four doc gates (`check:reference`, `check:reference:signatures`, `check:package`, `check:docs`).
- **No `new Date()` / `Math.random()` in the library** (the injected-clock rule); this pass adds none.

---

## Adversarial review fold (2026-06-27)

A six-lens find-and-verify workflow over this plan and the spec confirmed 28 of 36 findings. The folds below supersede the affected steps; the dominant one is the test-stub blast radius.

- **The seam retype breaks 37 test files, not 4.** Every `render: (md) => md` stub typed against `CairnAdapter`/`CairnRuntime`/`PublicRoutesDeps` fails assignability under `SiteRender` (wrong arg shape, `string` not `Promise<string>`), and `check` type-checks `src/tests/**`. The original Step 10 grep matched `.render(` call sites, not `render:` property definitions, so it found 5 of ~45 sites. Task 2 now carries the authoritative discovery grep, the migration recipe, the special-shape cases, and the two exclusions. The atomic gate (`check` to 0/0) is the completeness authority.
- **`SiteRender` must be barrel-exported.** Documenting it in `core.md` requires it on the root export subpath, or `check:reference` passes falsely and `import type { SiteRender }` does not resolve. Task 2 adds the `src/lib/index.ts` re-export.
- **Preview marker goes on `<html>`, not `<body>`.** `preview-doc.test.ts` asserts exact `<body>` substrings; `<html data-cairn-preview>` keeps them green.
- **Doc-drift grep and reference targets corrected.** `RendererOptions` lives in `core.md`, not `render.md`; the drift grep must catch `render: (md` / `render?: (md`; `components.md` carries three stale render-prop blocks.
- **Three spec prose corrections already applied** to `2026-06-25-cairn-contract-v2-design.md`: the `data-rise` owner (rehype dispatch, not the directive stamp), the optional `concept`/`frontmatter` in the seam signature, and the stale "`defineComponent` supersedes" claim (it shipped in 3c). Four islands-design findings are recorded as 4b carry-forwards at the end of this plan.

---

## File Structure

**Engine (`src/lib`):**
- `content/types.ts` — add `export type SiteRender`; retype `CairnAdapter.rendering.render` and `CairnRuntime.render` to it.
- `render/pipeline.ts` — remove `RendererOptions.stagger`; drop `options.stagger` from the `rehypeDispatch` plugin entry.
- `render/rehype-dispatch.ts` — drop the `stagger` parameter from `rehypeDispatch`; stamp `data-rise` unconditionally on top-level primitives.
- `render/registry.ts` — fix the `data-rise` doc on `ComponentDef.build` (drop the "when stagger is on" conditional phrasing).
- `components/preview-doc.ts` — add the `data-cairn-preview` marker to the preview document root.
- `delivery/public-routes.ts` — reuse `SiteRender` for `PublicRoutesDeps.render`; migrate the call at the entry load.
- `components/EditPage.svelte`, `components/CairnAdmin.svelte`, `components/ComponentInsertDialog.svelte` — retype the `render` prop to `SiteRender`; migrate the preview calls.

**Showcase (`examples/showcase`):**
- `src/lib/cairn.config.ts` — migrate the `render` wrapper to the object arg.
- `src/routes/(site)/[...path]/+page.server.ts`, `admin/[...path]/+page.svelte` — unchanged wiring (they pass `cairn.rendering.render` by reference; the type flows through).
- `src/routes/feed.xml/+server.ts`, `feed.json/+server.ts`, `(site)/styleguide/+page.server.ts`, `test/render-media/+server.ts` — migrate the direct `cairn.rendering.render(...)` calls.

**Tests (`src/tests`):**
- `unit/render-rehype-dispatch.test.ts`, `unit/render-pipeline.test.ts`, `unit/render-pipeline-snapshot.test.ts` — drop/invert the `stagger` cases; `data-rise` is now unconditional.
- `unit/content-compose.test.ts` — `await runtime.render({ body: 'x' })`.
- `unit/_content-fixture.ts` — the fixture adapter's `rendering.render` becomes the object-arg Promise form.
- `unit/public-routes.test.ts`, `component/EditPage.test.ts` — migrate any direct seam calls or render-prop stubs.

---

## Task 1: Make `data-rise` unconditional; retire the `stagger` plumbing; add the preview marker

**Files:**
- Modify: `src/lib/render/rehype-dispatch.ts:161-174`
- Modify: `src/lib/render/pipeline.ts:22-48` (RendererOptions), `:76` (the dispatch plugin entry)
- Modify: `src/lib/render/registry.ts:61` (the `build` doc)
- Modify: `src/lib/components/preview-doc.ts:51-84`
- Test: `src/tests/unit/render-rehype-dispatch.test.ts:52-76`, `src/tests/unit/render-pipeline.test.ts`, `src/tests/unit/render-pipeline-snapshot.test.ts`

**Interfaces:**
- Produces: `rehypeDispatch(registry: ComponentRegistry)` (no `stagger` param). `RendererOptions` no longer has `stagger`. `buildPreviewDoc` output carries `data-cairn-preview` on the root element.
- Consumes: nothing new.

- [ ] **Step 1: Invert the dispatch unit test to expect unconditional `data-rise`**

In `src/tests/unit/render-rehype-dispatch.test.ts`, the test at `:52` ("stamps a data-rise ordinal on top-level primitives in document order") already builds a hast `Root` with `h(...)` and asserts `dataRise` `'0'`/`'1'` on `children[0]`/`children[2]`; it calls `rehypeDispatch(reg, true)`. Drop the `true` argument so it reads `rehypeDispatch(reg)(tree)`, since the ordinal is now unconditional. Then delete the test at `:69` ("omits data-rise when no stagger is requested") outright; there is no longer an unstaggered mode. Do not introduce a `runDispatch` helper or a `box` component (neither exists; the file uses `h(...)` directly and the registered component is `card`).

- [ ] **Step 2: Run the dispatch test to verify it fails**

Run: `npm test -- src/tests/unit/render-rehype-dispatch.test.ts`
Expected: FAIL — `rehypeDispatch` still requires/reads the `stagger` argument, so the unflagged call emits no `dataRise`.

- [ ] **Step 3: Make `rehypeDispatch` stamp unconditionally**

In `src/lib/render/rehype-dispatch.ts`, drop the `stagger` parameter and the guard:

```ts
export function rehypeDispatch(registry: ComponentRegistry) {
  return (tree: Root) => {
    let idx = 0;
    tree.children = (tree.children as ElementContent[]).map((child) => {
      if (isElement(child) && child.properties?.dataPrimitive) {
        const el = transformNode(child, registry);
        el.properties = { ...el.properties, dataRise: String(idx++) };
        return el;
      }
      if (isElement(child)) child.children = transformChildren(child.children as ElementContent[], registry);
      return child;
    });
  };
}
```

Update the function's TSDoc (`:153-160`): drop "When `stagger` is on"; state that every top-level primitive carries a document-order `data-rise` ordinal, inert without site CSS, and nested primitives never get it.

- [ ] **Step 4: Drop `stagger` from `RendererOptions` and the pipeline**

In `src/lib/render/pipeline.ts`, delete the `stagger?: boolean` member and its TSDoc (`:22-28`), and change the dispatch plugin entry at `:76` from `[rehypeDispatch, registry, options.stagger]` to `[rehypeDispatch, registry]`.

- [ ] **Step 5: Scrub the removed `stagger` term from the `ComponentDef.build` doc**

In `src/lib/render/registry.ts:61`, the `build` doc reads "The engine stamps the entrance-stagger ordinal (`data-rise`) on the top-level result, so a build fn stays free of any motion concern." It already reads unconditionally (there is no "when stagger is on" phrase to remove), but it still uses the retired term `stagger`. Reword "entrance-stagger ordinal" to "entrance ordinal" so no doc references the removed knob.

- [ ] **Step 6: Add the `data-cairn-preview` marker to the preview `<html>`**

In `src/lib/components/preview-doc.ts:69`, change the emitted `<html>` tag to `<html data-cairn-preview>`. Put the marker on `<html>`, not `<body>`: `preview-doc.test.ts` asserts exact `<body>` and `<body class="site-body">` substrings (`:50`, `:56`, `:64`), and no test asserts on the bare `<html>` tag, so this needs no test edit. Add a short comment: the preview shows the resting state of content, so a site driving an entrance animation off `[data-rise]` scopes it away from `[data-cairn-preview]` (the preview runs the same pipeline and would otherwise re-animate on every debounced render). Do not add a blanket `animation: none` override; cairn provides the hook, the site owns its animation.

- [ ] **Step 7: Update the pipeline + snapshot tests**

In `src/tests/unit/render-pipeline.test.ts`, the test at `:42` constructs `createRenderer(reg, { stagger: true })` and asserts `data-rise="0"`. Drop the `{ stagger: true }` option (the ordinal is now unconditional); keep the assertion. In `src/tests/unit/render-pipeline-snapshot.test.ts:86,92`, drop `{ stagger: true }`; regenerate the snapshots (`npm test -- src/tests/unit/render-pipeline-snapshot.test.ts -u`) and eyeball the diff: every top-level primitive now carries `data-rise`, nothing else changes.

- [ ] **Step 8: Run the full gate**

Run: `npm run check` (expect 0/0) and `npm test` (expect exit 0). Then `npm run check:comments`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/render/rehype-dispatch.ts src/lib/render/pipeline.ts src/lib/render/registry.ts src/lib/components/preview-doc.ts src/tests/unit/render-rehype-dispatch.test.ts src/tests/unit/render-pipeline.test.ts src/tests/unit/render-pipeline-snapshot.test.ts
git commit -m "refactor(render): make the data-rise ordinal unconditional, retire the stagger knob"
```

---

## Task 2: Extract `SiteRender` and migrate the seam to the entry-aware `Promise<string>` object arg

This is one atomic compile unit. Retyping `render` breaks every consumer at once and `check` is 0-warnings, so there is no mid-migration green. Write the new tests, migrate every source and test consumer in lockstep, then gate once.

**Files:**
- Modify: `src/lib/content/types.ts` (add `SiteRender`; `:202-209` adapter render; `:348-355` runtime render)
- Modify: `src/lib/index.ts` (re-export `SiteRender` from the root barrel)
- Modify: `src/lib/delivery/public-routes.ts:21` (deps type), `:166` (call)
- Modify: `src/lib/components/EditPage.svelte:80-83` (prop), `:1235` (call)
- Modify: `src/lib/components/CairnAdmin.svelte:40-43` (prop)
- Modify: `src/lib/components/ComponentInsertDialog.svelte:80` (prop), `:159` (call)
- Modify: `examples/showcase/src/lib/cairn.config.ts:172` (wrapper)
- Modify: `examples/showcase/src/routes/feed.xml/+server.ts:18`, `feed.json/+server.ts:18`, `(site)/styleguide/+page.server.ts:109-111`, `test/render-media/+server.ts:22`
- Test (call/positional sites): `src/tests/unit/content-compose.test.ts:14`, `src/tests/unit/render-resolve-media-opt.test.ts` (a typed-const positional stub + a bare positional call; rewrite, see Step 10)
- Test (stub definitions, ~37 files): every `render: (md) => md` stub typed against the seam, enumerated by the Step 10 discovery grep. Special shapes are called out in Step 10: `public-routes.test.ts`, `public-routes-seo.test.ts`, `EditPage.test.ts`, `CairnAdmin.test.ts`, `_content-fixture.ts`. **Exclude** `admin-layout-help-nav.test.ts` and `AdminLayout.test.ts`: their `render:` is a `createRawSnippet` body, not the seam.

**Interfaces:**
- Produces:
  ```ts
  export type SiteRender = (input: {
    body: string;
    concept?: string;
    frontmatter?: Record<string, unknown>;
    resolve?: LinkResolve;
    resolveMedia?: import('../render/resolve-media.js').MediaResolve;
  }) => Promise<string>;
  ```
  `CairnAdapter.rendering.render: SiteRender`, `CairnRuntime.render: SiteRender`, `PublicRoutesDeps.render: SiteRender`, and the three component `render` props all typed `SiteRender` (optional where they already were). `SiteRender` is re-exported from the root barrel `src/lib/index.ts`, so it is a public type documented in `core.md`.
- Consumes: nothing from Task 1 beyond the unchanged `renderMarkdown`.

- [ ] **Step 1: Write the failing compose test against the new shape**

In `src/tests/unit/content-compose.test.ts:14`, change the assertion to the object arg and await:

```ts
expect(await runtime.render({ body: 'x' })).toBe('x');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/tests/unit/content-compose.test.ts`
Expected: FAIL — the fixture's `render` is still the positional form, and the type/shape mismatch surfaces (or the call returns a non-Promise).

- [ ] **Step 3: Add the `SiteRender` type**

In `src/lib/content/types.ts`, above `CairnAdapter`, add the `SiteRender` type from the Interfaces block, with TSDoc: the one renderer (design decision 4), entry-aware so a custom renderer can vary output by concept or frontmatter; the default reads `body` plus the resolvers; `resolve` rewrites cairn: links to live permalinks (build: site-resolver-backed, preview: manifest-backed); `resolveMedia` resolves media: references the same way; `concept` and `frontmatter` are present for an entry render and absent for the standalone component-insert preview.

Then add `SiteRender` to the type re-export block in `src/lib/index.ts` (alongside `CairnAdapter`/`CairnRuntime`), so it ships in `dist/index.d.ts` as a public type. This is required, not optional: `check:reference` keys documentation to exported symbols, so an unexported `SiteRender` would make its `core.md` entry a false pass and `import type { SiteRender } from '@glw907/cairn-cms'` would not resolve.

- [ ] **Step 4: Retype the adapter and runtime render members**

In `src/lib/content/types.ts`, replace the inline `render(md, opts?)` signatures at `:202-209` (adapter) and `:348-355` (runtime) with `render: SiteRender;`, keeping the surrounding TSDoc but dropping the now-stale `stagger` mention. (`composeRuntime` already passes `adapter.rendering.render` through by reference at `compose.ts:55`, so no compose change is needed.)

- [ ] **Step 5: Migrate the public route deps and call**

In `src/lib/delivery/public-routes.ts`, import `SiteRender` from `../content/types.js` and set `PublicRoutesDeps.render: SiteRender` (`:21`, replacing the narrower local copy). At the entry load (`:166`), migrate the call:

```ts
html: await render({
  body: entry.body,
  concept: entry.concept,
  frontmatter: entry.frontmatter,
  resolve: buildLinkResolver(site),
}),
```

- [ ] **Step 6: Migrate the editor component props and preview calls**

In `src/lib/components/CairnAdmin.svelte:40-43` and `src/lib/components/EditPage.svelte:80-83`, replace the inline `render?: (md, opts?) => ...` prop type with `render?: SiteRender;` (import `SiteRender` from `../content/types.js`). In `EditPage.svelte:1235`, migrate the call:

```ts
const html = await render({ body: md, resolve, resolveMedia: resolveMediaRef });
```

In `src/lib/components/ComponentInsertDialog.svelte:80`, replace the inline `render?` prop type with `render?: SiteRender;`. At `:159`, migrate the call:

```ts
const html = await render({ body: md });
```

(The component-insert preview has no entry, so `concept`/`frontmatter` are absent — exactly the optional case `SiteRender` allows.)

- [ ] **Step 7: Migrate the showcase adapter wrapper**

In `examples/showcase/src/lib/cairn.config.ts:172`, migrate the wrapper to the object arg, forwarding the entry-aware fields the default renderer ignores and defaulting `resolveMedia`:

```ts
render: ({ body, resolve, resolveMedia }) =>
  renderMarkdown(body, { resolve, resolveMedia: resolveMedia ?? publicMediaResolver }),
```

- [ ] **Step 8: Migrate the remaining showcase call sites**

- `feed.xml/+server.ts:18` and `feed.json/+server.ts:18`:
  ```ts
  contentHtml: await cairn.rendering.render({ body: posts!.byId(p.id)!.body, resolve }),
  ```
- `(site)/styleguide/+page.server.ts:111`: `proseHtml: await cairn.rendering.render({ body: SAMPLE }),` and update the stale comment at `:109-110` (no more positional opts).
- `test/render-media/+server.ts:22`: `const html = await cairn.rendering.render({ body, resolveMedia });`

- [ ] **Step 9: Migrate the test fixture**

In `src/tests/unit/_content-fixture.ts`, change the test adapter's `rendering.render` to the object-arg Promise form (the identity renderer the compose test relies on):

```ts
render: ({ body }) => Promise.resolve(body),
```

- [ ] **Step 10: Migrate every test stub and positional call (the bulk of the work)**

The retype breaks ~37 test files that stub `render` in a slot typed `CairnAdapter`/`CairnRuntime`/`PublicRoutesDeps`. The discovery grep must find property **definitions**, not just `.render(` calls:

```bash
# the identity stubs (37 files) — the dominant class
grep -rln "render: (md" src/tests
# the typed-const / bare-positional usages that evade both greps
grep -rln "rendering'\]\['render'\]" src/tests   # render-resolve-media-opt.test.ts
# residual direct calls (showcase + compose), already handled in Steps 1, 8
grep -rnE "\.render\(" src/tests examples/showcase | grep -v "renderMarkdown\|renderStatic\|renderCondition\|\.render({"
```

The migration by shape:

1. **Identity stubs** (`render: (md) => md`, the vast majority): rewrite to `render: ({ body }) => Promise.resolve(body)`. This covers the 32-odd `content-routes-*`, `nav-routes-*`, `cairn-admin-*`, `delivery-*`, `compose*`, `content-adapter`, `health`, and the integration `content-routes-reference-*` files, plus `_content-fixture.ts` (Step 9) and `CairnAdmin.test.ts:230`.
2. **`public-routes.test.ts`** (8 sites `render: (md) => \`<r>${md.trim()}</r>\`` at `:25,:74,:103,:115,:137,:160,:182,:205,:241`, and `:225` `render: (md, opts) => renderMarkdown(md, opts)`): rewrite the template stubs to `({ body }) => Promise.resolve(\`<r>${body.trim()}</r>\`)`, and `:225` to `({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia })`. The tests already `await` `entryLoad`, so `data.html` resolves; no assertion text changes.
3. **`public-routes-seo.test.ts:53`** (`render: (md) => \`<p>${md}</p>\``): rewrite to `({ body }) => Promise.resolve(\`<p>${body}</p>\`)`.
4. **`EditPage.test.ts`** (13 stubs, per shape, do NOT collapse to identity):
   - plain string stubs at `:280,:300,:452,:948`: `({ body }) => Promise.resolve(\`<p>${body}</p>\`)`.
   - the empty-conditional stub at `:1950`: `({ body }) => Promise.resolve(body ? \`<p>${body}</p>\` : '')`.
   - the floor stub at `:315`: `({ body }) => renderMarkdown(body)`.
   - the **three resolver-threading typed variants** at `:330,:350,:408` (they back the live href / broken-link / media-src assertions): `({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia })`. Migrating these to identity would break `:335` (`href="/about"`), `:336` (`cairn-broken-link`), and `:362` (the media src) — keep the resolver threading.
   - the throwing stub at `:1959`: keep `() => { throw new Error('boom'); }` (a sync throw is fine; the call is awaited).
   - the async `slowRender` helper at `:1972`: destructure the object arg — `const slowRender = ({ body }) => new Promise<string>((resolve) => calls.push({ md: body, resolve }))` — so the `calls[1].md` assertion at `:1990` still reads the string.
5. **`render-resolve-media-opt.test.ts`** (rewrite, not mechanical): `:18` declares `const render: CairnAdapter['rendering']['render'] = (md, opts) => inner(md, { ...opts })` and `:21` calls it positionally. `inner` returns a plain string, so wrap it: `const render: SiteRender = ({ body, resolveMedia }) => Promise.resolve(inner(body, { resolveMedia }))`, and the call becomes `const out = await render({ body: '![x](media:a1b2c3d4e5f6a7b8)', resolveMedia })`. The test's old "spread-forwarding of positional opts" premise is gone; assert the object-arg `resolveMedia` is forwarded.

**Exclude** `src/tests/component/admin-layout-help-nav.test.ts:6` and `src/tests/component/AdminLayout.test.ts:8`: their `render:` is inside `createRawSnippet(() => ({ render: () => '...' }))`, a Svelte snippet, not the seam. Leave them.

- [ ] **Step 11: Gate the atomic unit once**

Run: `npm run check` (expect 0/0), `npm test` (expect exit 0), `npm run check:comments`.
If `check` reports a missed consumer, migrate it and re-run; do not look for a partial green.

- [ ] **Step 12: Commit**

The migration spans ~50 modified tracked files (the seam, the components, the showcase, and ~37 test files). After a verified `git status` shows only this task's changes, stage the modified tracked files in one go:

```bash
git status   # confirm only Task 2's modifications are present
git add -u src/lib src/tests examples/showcase
git commit -m "feat(render)!: make the render seam entry-aware and Promise<string>"
```

---

## Task 3: Docs, reference, changelog, and the held version bump

**Files:**
- Modify: `docs/reference/core.md` (add the `SiteRender` type; the `rendering` group example at `:60` and `:461`; the `RendererOptions` table row at `:848`, dropping `stagger`)
- Modify: `docs/reference/components.md` (the three render-prop blocks at `:33`, `:162`, `:471`)
- Modify: `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`
- Modify: `package.json` (version `0.75.0`), `package-lock.json` (root self-version)
- Modify: any explanation/guide page that shows the old `render(md, opts)` shape (grep, see Step 2)

- [ ] **Step 1: Update the reference**

Document `SiteRender` on its export page (`core.md` — it is now a root-barrel export from Task 2, so it documents there, not a new page; mirrors the v2 field-foundation rule). State the entry-aware object arg, the `Promise<string>` return, and that `concept`/`frontmatter` are optional context. Update the showcase adapter example at `core.md:60` and `:461` from the positional `render: (md, opts) => renderMarkdown(md, opts)` to the object-arg form. Drop `stagger` from the `RendererOptions` table row at `core.md:848` (it lives in `core.md`, not `render.md`) so it reads "The render pipeline's sanitize and anchor controls." In `docs/reference/components.md`, rewrite the three render-prop blocks at `:33`, `:162`, `:471` to `render?: SiteRender;` (matching the migrated component props). Run `npm run check:reference` and `npm run check:reference:signatures` — `SiteRender` is now an export, so its `core.md` entry is required and the documented signature must match the exported type.

- [ ] **Step 2: Hunt and fix doc drift on the old shape**

The old positional shape also appears as `render: (md` / `render?: (md`, which a bare `render(md` grep misses. Use:

```bash
grep -rnE "render\??: ?\(md|render\(md|stagger" docs README.md
```

Repoint or rewrite every hit (the `core.md` and `components.md` lines from Step 1, the upgrade guide, any guide showing the adapter `render`). Run `npm run check:docs` (the link gate).

- [ ] **Step 3: Changelog and upgrade guide**

Add a `0.75.0` entry to `CHANGELOG.md` with a `Consumers must:` line per breaking change:
- `Consumers must:` change the adapter `render` from `(md, opts) => ...` to `({ body, resolve, resolveMedia }) => ...` returning a `Promise<string>`.
- `Consumers must:` drop any `stagger` option passed to `createRenderer` or the seam; `data-rise` is now always emitted (inert without `[data-rise]` CSS).

Add the matching per-version entry to `docs/guides/upgrade-cairn.md`.

- [ ] **Step 4: Bump the held version**

Set `package.json` version to `0.75.0` and sync the root `package-lock.json` self-version to match. Run `npm run check:version`.

- [ ] **Step 5: Run all four doc gates + the package gate**

Run: `npm run check:reference`, `npm run check:reference:signatures`, `npm run check:package`, `npm run check:docs`. All must pass.

- [ ] **Step 6: Commit**

```bash
git add docs CHANGELOG.md package.json package-lock.json README.md
git commit -m "docs(render): document the entry-aware seam; bump held 0.75.0"
```

---

## Pass-end ritual (run after the tasks, per `cairn-pass`)

Not plan tasks; the consolidation ritual. In order:

1. **Simplify** — dispatch `code-simplifier:code-simplifier` over the changed code.
2. **Full gate** — `npm run check` 0/0, `npm test` exit 0, `npm run check:comments`, all four doc gates, `check:version`.
3. **Consumer build proof** — the seam ships TypeScript in `.svelte`, so prove a from-scratch consumer build: `rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`, then the Playwright e2e (the create → save → publish round-trip and the public render path, which now exercises the entry-aware seam). Local Playwright reuses a stale server when `CI` is unset, so force the fresh build or push for CI.
4. **Review fan-out** — `svelte-reviewer` (the three component prop migrations) and `cloudflare-workers-reviewer` (the delivery/feed render paths). `web-auth-security-reviewer` is not implicated (no auth/session/token change). Fold findings before merge.
5. **Live admin smoke** — the preview pane is touched (the `data-cairn-preview` marker, the entry-aware preview call), so run the `wrangler dev` admin smoke per `docs/internal/admin-smoke-test.md`, or rely on the from-scratch e2e covering the `/admin` preview if a live Worker smoke is deferred (record which).
6. **Post-mortem + STATUS** — append the post-mortem here; update `docs/STATUS.md` immediate-next-action to phase 4b (islands), held.
7. **Merge + push** — merge `contract-v2-render-seam` to `main` and push. **Do not release** (the v2 window stays held through 4b).

---

## Self-Review

**Spec coverage (the render-seam section of `2026-06-25-cairn-contract-v2-design.md`):**
- Entry-aware `render({ concept, frontmatter, body, resolve, resolveMedia })` → Task 2 (`concept`/`frontmatter` optional, since the component-insert preview has no entry).
- Return narrows to `Promise<string>` → Task 2.
- `stagger` flag goes away, ordinal moves into the pipeline → Task 1.
- Page chrome stays the site's Svelte route; `PreviewConfig` stays → unchanged (no task needed; the seam renders body only, chrome is the site route).
- Preview iframe stays `sandbox=""` → unchanged. The `data-cairn-preview` marker (Task 1) is the new preview-vs-public hook the unconditional ordinal needs.

**Out of scope (4b, islands):** `hydrate`, the `rendering.islands` field, the boundary emission, the client runtime, the `./islands` subpath. The spec lists islands as part of phase 4; this plan is 4a only (the breaking seam), and 4b is additive on the settled seam.

**4b carry-forwards (from the adversarial review, for the 4b brainstorm):**
- `defineComponent` already shipped in 3c, so 4b's delta on it is a single `hydrate?: boolean` field on `ComponentDef` plus the `rendering.islands` plumbing. Do not re-litigate the constructor.
- The island runtime mounts the site's `.svelte` components, so it is likely pure `.ts` (the components live in the site); confirm whether the `./islands` subpath needs the `svelte` export condition, and let `check:package` (publint + attw) gate it empirically.
- `build()`'s fallback hast passes through the same pipeline as every directive build, including `rehypeSinkGuard` (strips inline `style` and `on*`), so the fallback must be class-driven. State this in the 4b spec/docs.
- Ground the prop trust boundary concretely: props are `JSON.stringify`-ed into `data-cairn-props`, HTML-attribute-escaped by `rehypeStringify` on emit, then read and `JSON.parse`-d (wrapped in try/catch) on the client. Safe against breakout only because the value never enters a script context.
- Name the mount-and-replace cost: clearing the fallback and remounting is a visible flash and a layout shift when the live component differs in size from the fallback, which makes fallback fidelity doubly load-bearing.
- The flagship `poll` example cannot work from a single `question` scalar (it needs options and a vote sink); pick a genuinely attribute-driven flagship (a countdown from a `target` datetime, attribute-driven tabs) or give the poll a `pollId` sourcing its data.

**Placeholder scan:** none — every step carries the concrete edit.

**Type consistency:** `SiteRender` is defined once (Task 2 Step 3) and referenced by name in every consumer. The fixture and the component stubs all resolve to `({ body }) => Promise.resolve(body)`. `data-rise` is `dataRise` in hast properties (Task 1) and `data-rise` in the DOM/CSS/docs.

---

## Post-mortem (2026-06-27)

**Shipped as `0.75.0` (breaking-within-0.x, minor), held unpublished.** Merged to `main`; the v2 window now spans `0.69.0` through `0.75.0` and stays held until islands (4b) land, per Geoff. One rollup release closes the window.

**Built.** The `render` adapter seam moved from the positional `render(md, opts?): string | Promise<string>` to the entry-aware `render({ body, concept?, frontmatter?, resolve?, resolveMedia? }): Promise<string>`, extracted as the root-barrel `SiteRender` type and documented in `core.md`. The `stagger` knob left `createRenderer`, the pipeline, and the seam; the `data-rise` entrance ordinal is now unconditional pipeline output. The preview document gained a `data-cairn-preview` marker on `<html>`. ~50 files migrated in one atomic compile unit, including ~37 test-stub files. The editor preview threads the full entry context (concept, frontmatter) so a custom entry-aware renderer's preview matches its page.

**Verified (evidence).** `npm run check` 1206 files 0/0; `npm test` exit 0 at 2711; `check:comments` OK; the four doc gates + `check:version` (minor → 0.75.0); `code-simplifier` clean (no refinements); the svelte and cloudflare-workers reviewer fan-out (two findings folded); and the load-bearing proof, a from-scratch consumer build (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`) plus the 39-test Playwright e2e, both green, the public render path now exercising the entry-aware seam.

**Decisions locked.** The seam returns `Promise<string>`; returning a Svelte component was rejected in the spec (interactivity rides on 4b islands instead). `concept` and `frontmatter` are optional, because the standalone component-insert preview renders with no entry. `data-rise` is unconditional and inert without site CSS; the preview marker is the preview-vs-page hook. `SiteRender` is a public root-barrel export.

**Execution.** Main-loop orchestrate-and-verify on `contract-v2-render-seam` off `main`. Three `cairn-implementer` (Sonnet) dispatches, one per task, each gated and its diff verified before the next. A six-lens adversarial find-verify workflow over the plan and spec ran first and confirmed 28 of 36 findings, all folded; it front-loaded the dominant scope gap rather than discovering it at the gate.

**Durable lessons.**
1. The adversarial-review-over-the-plan pattern (3b/3c) paid off again: it caught that the seam retype breaks ~37 test files stubbing `render: (md) => md`, not the 4 the draft named, and that the draft's `.render(` discovery grep matches call sites, not property definitions. Property-stub discovery needs `grep "render: ("`, never `.render(`.
2. A destructure-only stub (`render: ({ body }) => ...`) in a bare object literal has no contextual type, so `{ body }` is implicit-any under the 0-warnings gate. Annotate with `Parameters<SiteRender>[0]` (the input shape itself, not a type hole).
3. An entry-aware preview must thread the same entry context the public page passes, or a custom renderer's preview diverges from its page. The plan's minimal-EditPage decision missed this; the svelte reviewer caught it. The reviewer fan-out remains complementary to the pre-plan sweep.
4. The showcase lockfile records the `file:../..` library version, so a library version bump must sync the showcase lockfile too (the showcase analog of the root self-version sync), or CI `npm ci` drifts.

**Carry-forwards.** Phase 4b (islands) is the last v2 phase; its six design carry-forwards are recorded in this plan's "4b carry-forwards" block (the `defineComponent` delta is just `hydrate`, the fallback is class-driven through the sink guard, the prop-escaping contract, the mount-and-replace flash cost, the poll example is too thin, the `./islands` export condition). The live `wrangler dev` admin smoke stays owed at the next site cutover; the from-scratch e2e covers the `/admin` preview surface meanwhile.
