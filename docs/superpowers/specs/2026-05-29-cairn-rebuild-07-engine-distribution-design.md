# Plan 07 design: engine distribution, live preview, and extensibility readiness

**One line.** Make the rebuilt `@glw907/cairn-cms` engine consumable and correct, prove it end to
end against an in-repo harness, publish it as a release candidate, and confirm the architecture
supports both ways a site owner will extend it, all without touching either live site.

## Scope

This is the first half of the original "distribution and site cutover" pass, split so the
irreversible production cutover is its own later step. Plan 07 stays inside the engine repo and its
worktree. No consumer site is repointed and `main` is untouched.

In scope:

1. The package publish pipeline: publint and `@arethetypeswrong/cli` gates over both halves of the
   `publishConfig` swap, and the first real publish of the rebuilt engine as `0.6.0-rc.0` under a
   prerelease dist-tag.
2. The live, design-accurate preview wired into the existing editor pane, with an engine-side
   DOMPurify sanitize as the security floor (the Plan 05 locked High).
3. A Playwright golden-path end-to-end test driving an in-repo harness app that composes the engine
   through its public exports.
4. Extensibility readiness for the two ways a site extends, described under "Extensibility" below.
5. Operational guards that hold the Workers constraints (most already exist; this pass closes the
   gaps and documents key rotation).

Out of scope, with the plan that owns each:

- Migrating either site's adapter or route shims, the repoint, and the `main` merge (Plan 08).
- The `CairnExtension` machinery itself: site-registered admin panels, custom concept types, and
  custom field types (Plan 09). Plan 07 designs and type-declares the contract and confirms its
  insertion points; it does not build the runtime that fulfills it.
- The `create-cairn-site` scaffolder and the templates (Plan 10).

## Roadmap context

The rebuild's distribution-and-cutover work is now four passes:

| Plan | Goal |
|---|---|
| 07 | Engine readiness: publish pipeline, preview and sanitize, E2E harness, extensibility readiness. Publishes `0.6.0-rc.0`. |
| 08 | Site cutover: both adapters and all `/admin` shims to the new API, repoint, merge `rebuild` to `main`. |
| 09 | `CairnExtension`: the admin-extension machinery, built against the real needs cutover surfaces. |
| 10 | `create-cairn-site` scaffolder and the first templates, demonstrating both extension modes. |

"Easy to start a site" (Plan 10) and "easy to extend a site, both ways" (Plan 07 readiness through
Plan 09 machinery) are the two halves of the same product goal. Splitting them keeps the cutover
small and reversible.

## Architecture

### Package distribution and the RC publish

The three subpath exports (`.`, `/sveltekit`, `/components`), the source-to-`dist` `publishConfig`
swap, the peer dependencies, and the OIDC Trusted-Publishing workflow already exist from Plan 00.
A `files` array limits the package to `dist` and `src/lib`, so a dev or harness app under
`src/routes` is excluded from the published tarball automatically.

What Plan 07 adds:

- **publint and `@arethetypeswrong/cli` gates.** Both run against the built package and assert the
  exports map and TypeScript resolution are correct for every subpath, under both the source-dev and
  `dist`-publish halves of the swap. They join the CI gate next to `npm run package`.
- **The single-Kit assertion.** A check that the resolved tree has exactly one `@sveltejs/kit`, so a
  thrown `redirect` or `error` keeps class identity across the package boundary. The nav and content
  route code already matches `CommitConflictError` by name as a bundling-alias guard; this assertion
  makes the Kit case explicit.
- **The first publish.** Bump `version` to `0.6.0-rc.0` and publish from the `rebuild` branch through
  the existing workflow's `workflow_dispatch` trigger. The live sites pin `^0.5.1`, whose caret
  range excludes `0.6.x`, so they are unaffected. The publish uses a prerelease dist-tag (`rc`) so
  the `latest` tag keeps pointing at the live `0.5.1`; an unqualified `npm install` never picks up
  the candidate. Plan 08 bumps each site to `^0.6.0` when it repoints.

One manual prerequisite stays with the owner: the npm Trusted-Publisher entry must allow the
`rebuild` branch (or run through an environment the branch can use). The plan notes this as a human
step, since it cannot be done from code.

### Live preview and the engine-side sanitize

`EditPage.svelte` already carries the preview surface from Plan 05: a `previewHtml` state, the
per-user persisted toggle, and the `{@html previewHtml}` pane. The gap is that `previewHtml` is never
assigned, so the pane renders nothing. Plan 07 wires the render and adds the sanitize.

The design:

- `EditPage` gains a client-callable `renderPreview` prop, `(md: string) => string | Promise<string>`,
  the same pipeline the public site ships. The route shim passes the adapter's `renderPreview`.
- A debounced `$effect` on the editor body calls `renderPreview`, awaits it, then assigns
  `previewHtml = DOMPurify.sanitize(html)` before the existing `{@html}` reaches the DOM.
- DOMPurify is a new engine dependency, not a peer. The preview pane renders only in the browser
  after mount, so DOMPurify runs client-side against the real DOM and needs no server shim.
- Carta keeps `sanitizer: false` behind the `MarkdownEditor` seam, so the sanitize in the preview
  pane is the one and only barrier between editor-authored markdown and the DOM. This is the floor
  established in the design decision below.

The render pipeline supports this already: `createRenderer` returns `renderMarkdown` plus the
remark and rehype plugin arrays, and both sites' pipelines are plain JavaScript that runs in the
browser.

### The E2E harness app

Plan 07's Playwright golden path needs a running app, and no live site is repointed, so the engine
repo grows its own minimal SvelteKit app under `src/routes`, dev-only and never published.

That harness composes the engine exactly as a real site would:

- A tiny fake adapter (`cairn.config`) with one post-like concept and a trivial `renderPreview`.
- The real thin `/admin/**` route shims, so the harness also serves as living proof that the public
  exports compose into working routes.
- A GitHub backend double so a save reaches a recorded commit rather than the real API, asserting
  the editor as author and `cairn-cms[bot]` as committer.
- A seeded D1 session so the guard admits a logged-in editor without the email loop, the same
  technique the live admin smoke uses.
- One deliberately non-cairn feature (a small public route plus component) that the engine knows
  nothing about, described under "Extensibility".

The golden path: a logged-in editor opens the post, edits it, watches the preview pane update, saves,
and the commit reaches the double with the right author and committer. This is the spec's section 9
end-to-end test, realized against the harness.

### Extensibility

A Cairn site is a normal SvelteKit app. The engine occupies a bounded namespace and nothing else:
the `/admin/**` routes (thin shims), the adapter seam (`cairn.config.ts` and `site.config.yaml`),
and the admin theme scoped to `[data-theme="cairn-admin"]`. The owner owns every other route, all
public styling, and all site code. Engine fixes arrive through an npm version bump and never reach
into site-owned files.

A site owner extends in one of two ways, and both are first-class.

**Mode 1: build outside the admin.** A public feature with its own routes and data, like a custom
calendar. It needs only a clean, well-documented boundary and a guarantee that the engine does not
interfere with it. Plan 07 proves this:

- The harness carries a real non-cairn feature (a public `/calendar` route and a `Calendar`
  component fed by local data) that imports nothing from the engine and that the engine never
  references. The E2E confirms it coexists with the admin without collision.
- An engine-isolation test asserts the engine does not leak outside its namespace: the `.` and
  `/components` imports inject no global CSS, the admin theme stays scoped, and nothing in the
  package claims a non-`/admin` route. This makes "does not interfere" a tested guarantee, not a
  claim.
- The adapter and namespace boundary are documented under the section 12 first-class-docs mandate,
  so a site author reads exactly where their code lives and where the engine's lives.

**Mode 2: extend the admin.** A site-defined panel that appears in cairn's sidebar, shares the
magic-link session and the `/admin` guard, and commits through the same GitHub pipeline, plus custom
concept types and field types that reuse the engine's validate-form-commit path. This is the
`CairnExtension` seam. Plan 07 does not build it; it designs the contract, type-declares it, and
confirms the architecture admits it additively, so Plan 09 slots the machinery in without a rewrite
and the eventual API is a non-breaking minor bump.

The reserved contract, declared in Plan 07 as types and documented, refined when built:

```typescript
/** A code-defined unit of capability a site composes into the runtime at build time. */
interface CairnExtension {
  /** Stable key; namespaces the extension's routes and nav entries. */
  id: string;
  /** Site-defined admin screens, each gaining a sidebar entry, the guard, and the session. */
  adminPanels?: AdminPanel[];
  /** Custom frontmatter field types: a renderer plus a validator, dispatched like the built-ins. */
  fieldTypes?: FieldTypeDef[];
  /** Additional content concepts beyond posts and pages, flowing through the same commit path. */
  concepts?: ConceptConfig[];
}

interface AdminPanel {
  id: string;              // routes under /admin/<id>
  label: string;          // the sidebar entry
  owner?: boolean;        // owner-gated, like editor management
  load?: (event: ContentEvent) => unknown;        // server load, behind the guard
  actions?: Record<string, (event: ContentEvent) => Promise<unknown>>;
  component: unknown;     // the panel UI, rendered inside the admin shell
}
```

Plan 07 confirms three insertion points exist and are clean:

- **Runtime composition** (Plan 02 seam 2) can accept an `extensions: CairnExtension[]` array and
  merge their concepts, panels, and field types into the composed runtime additively.
- **Admin nav derivation** (the `AdminLayout` `navItems` derived list) already builds from concepts,
  the nav menu, and the editors entry; extension admin panels are one more contributed source,
  owner-gated where flagged.
- **Field dispatch** (the discriminated union over field types the edit form renders) can move to a
  registry-style lookup that accepts site-registered types alongside the built-ins.

One design note carried to Plan 09: SvelteKit filesystem routing needs real route files, so
extension admin panels most likely dispatch through a single catch-all `/admin/[...panel]` route
rather than a generated file per panel. The fixed-concepts decision (posts and pages only in the
core) and `CairnExtension.concepts` are in tension; Plan 09 resolves whether extension concepts are
first-class or a separate, clearly-bounded category. Neither needs deciding now.

### Operational guards

Most guards exist; this pass closes the rest and writes the runbook.

- The carta-boundary test (no server module imports `carta-md`) exists and stays green.
- `/admin/healthz` and `healthLoad` exist; `signingSelfTest` signs a dummy JWT through the real
  PKCS#1-to-PKCS#8 path. The harness exposes the healthz shim so the E2E can hit it.
- A bundle and startup-size check runs against the harness app's production build, standing in for
  the per-site `wrangler deploy --dry-run` guard that lands with each site's CI in Plan 08.
- A documented key-rotation procedure for the GitHub App private key.

## Data flow

**Preview render.** Editor types, the debounced effect fires, `renderPreview(body)` runs the site
pipeline in the browser, the result passes through `DOMPurify.sanitize`, and the sanitized HTML lands
in `previewHtml`, which the existing `{@html}` renders. No server round-trip; no unsanitized HTML
ever reaches the DOM.

**Publish.** Bump `version`, dispatch the workflow on `rebuild`, `prepublishOnly` runs
`svelte-package` to build `dist`, publint and attw gate the result, and `npm publish --access public
--tag rc` mints a short-lived OIDC credential and publishes the candidate under the `rc` dist-tag.

**E2E.** Playwright starts the harness, seeds a session, drives the golden path, and asserts the
recorded commit's author and committer.

## Testing strategy

- **Unit and integration** cover the preview wiring's pure parts (the debounce and the sanitize call
  shape) and any composition-merge logic the readiness work touches.
- **Component** (browser) covers `EditPage` rendering sanitized preview HTML and the toggle behavior,
  and asserts a known XSS payload (a `javascript:`-bearing or script-bearing fragment) is stripped
  before it reaches the pane.
- **E2E** (Playwright, the harness) covers the one golden path plus the Mode-1 coexistence check.
- **Boundary and packaging**: publint, attw, the single-Kit assertion, the engine-isolation test,
  and the existing export-boundary tests.

The bar is the standing one: `npm run check` zero errors and zero warnings, and `npm test` exits 0.

## Design decisions locked for this plan

1. **Split, not one pass.** Plan 07 is engine readiness and the RC publish only. Site cutover is
   Plan 08, the extension machinery Plan 09, the scaffolder Plan 10.
2. **Engine-side DOMPurify is the sanitize floor.** The engine's preview pane sanitizes every site's
   rendered preview HTML before the DOM, regardless of what the site's `renderPreview` does. Security
   lives in the engine; a site or a future template cannot reintroduce the hole by forgetting to
   sanitize.
3. **Publish a prerelease under the `rc` dist-tag from the `rebuild` branch.** `latest` stays on the
   live `0.5.1`; the sites stay on `^0.5.x` until Plan 08.
4. **Harness lives in the engine repo's own dev app under `src/routes`**, excluded from the package
   by the `files` array, and it carries a non-cairn feature so coexistence is tested.
5. **Both extension modes are first-class.** Mode 1 is proven and tested now. Mode 2's contract is
   designed and type-declared now and built in Plan 09; declaring the types does not commit the API,
   since adding the machinery later is an additive minor bump.

## Deferred, with reason

- Site adapter and shim migration, repoint, and the `main` merge: the reversible production step is
  Plan 08, gated on both sites keeping their bespoke features.
- The `CairnExtension` runtime: built in Plan 09 against the real needs cutover surfaces, so the API
  is shaped by use rather than guessed.
- The scaffolder and templates: Plan 10, where both extension modes get a worked example.
- The Plan 05 carried items that ride along naturally (the carta teardown disposal seam) may be taken
  opportunistically while the preview is wired, but are not required by this plan.

## Risks

- **DOMPurify and the design-accurate goal.** Sanitizing can strip markup the site's pipeline
  intends, so the default allowlist may need site-aware additions for directive output. The plan
  starts from a safe default and widens only with evidence, never the reverse.
- **Publishing is close to irreversible.** A published version cannot be reused, and unpublish is
  restricted. The prerelease tag and the excluded-from-`latest` choice contain the blast radius, and
  the publish is a deliberate, gated step.
- **The extension contract could ossify.** Type-declaring it now risks anchoring on the wrong shape.
  The mitigation is that it stays unbuilt until Plan 09, when two real consumers inform it, and that
  the published surface does not yet include it.
