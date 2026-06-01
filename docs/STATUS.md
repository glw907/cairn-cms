# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is the workspace `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`.

## Where the work is (2026-06-01, delivery-surface DX executed, unpublished)

The delivery-surface developer-experience pass executed and landed on `main`, commits `d606676..27deb16`
(thirteen: ten plan tasks plus three review-gate fixes), local only and not yet published. The delivery
layer is now the blessed, backend-free public path a SvelteKit site wires in a few lines. It adds the
fourth package entry `@glw907/cairn-cms/delivery` (imports no auth, github, or email, enforced by a
boundary test), build-time validation safe-by-default in `createSiteIndex` (`{ validate: false }` opt-out),
a ready `seo: SeoMeta` from the catch-all `entryLoad`, the `responses.ts` feed/sitemap/robots `Response`
helpers, `json-ld.ts` with breakout-safe escaping, the `<CairnHead>` head component (`title={false}` to let
a site own its `<title>`), the `siteDescriptors(adapter, config)` one-liner, `buildSeoMeta` `robots` and
`article:*` tags, and generic-over-frontmatter content reads (`createContentIndex<F>`) for a later
typed-reads pass. The showcase wires every surface (`content.ts`, the `[...path]` route, feed.xml,
feed.json, sitemap.xml, robots.txt) and the production build prerenders them as the end-to-end gate.

Final gate on `main`: `npm run check` 739 files 0/0, `npm test` 88 files / 398 tests exit 0,
`check:package` green (attw all-green for `/delivery`), showcase build prerenders all feeds and the
catch-all. A simplifier pass, a `svelte-reviewer`, a `daisyui-a11y-reviewer` (both Opus), and a
two-angle `/code-review` ran at the gate; three findings were folded in (the U+2028/U+2029 JSON-LD
escape gap, the missing showcase `feed.json` route the head advertised, a repeated concept lookup).
Plan and full post-mortem with the carried open decisions: `docs/superpowers/plans/2026-06-01-cairn-delivery-dx.md`.

- Spec: `docs/superpowers/specs/2026-06-01-cairn-delivery-dx-design.md`.

**Published as `0.11.0` (`latest` on npm, OIDC release `v0.11.0`, 2026-06-01); `main` pushed (commits
`d522dfd..41b7a42`).** The delivery surface is now consumable as `@glw907/cairn-cms/delivery`.

**Decision (2026-06-01): clear the engine backlog before any site migration, as three
surface-focused passes; hold the roadmap initiatives out.** Brainstormed and scoped with the user.
The sites (ecnordic component migration + delivery Pass 1c, 907 catch-up) wait until these land. The
three passes:
1. **Component completion** (next, design written). The component slot render path end to end plus the
   render/grammar hardening, the Plan 2 form fixes, and the live `/admin` smoke. Design:
   `docs/superpowers/specs/2026-06-01-cairn-engine-backlog-and-slot-render-design.md`. The render half
   of the component initiative was never built: `remarkDirectiveStamp` only stamps registered component
   directives, so nested `:::title`/`:::actions` slots are dropped on the way to hast and the Plan 2 form
   can insert markup that renders to nothing. Pass 1 stamps slots at remark, partitions them at dispatch,
   and changes `ComponentDef.build` from `build(node)` to `build(ctx)` (`{ attributes, slots, node }`,
   rendered hast per slot) so a site `build()` arranges hast and never walks the tree. Breaking on
   `ComponentDef.build`, so it bumps the version. Folded hardening: `splitHead` heading-sniffing retires
   (its crash with it), the `glyph` unknown-icon guard, the `validateComponent` double-parse, the form
   repeatable-id + a11y fixes.
2. **Delivery/SEO hardening.** Skip-drafts-at-build, per-entry `image`/`robots`/`author` in the SEO head,
   the feed/excerpt/permalink edge cases, and typed reads (infer `F` from concept fields, apply the
   validator's normalized `data` on read).
3. **Auth hardening.** `__Host-` cookie prefix, `/admin` security headers, rate-limit + `waitUntil` on the
   request endpoint, install-token KV caching.

**Immediate next action: write the Pass 1 plan** (`superpowers:writing-plans`) from the design doc above,
once the user has reviewed the spec. Then execute it `subagent-driven` (one `cairn-implementer` per task)
on `main` (or a worktree off `main`). After Pass 1 lands and publishes, the ecnordic component migration
becomes a site-pass that refactors ecnordic's `build()` to the `build(ctx)` shape. 907-life has no
directive components (plain remark-html, still on `0.6.0`), so it is out of the component initiative; its
only pending work is the version catch-up. Carried for the later delivery migration: the build-validation
date gotcha (an unquoted YAML `date` arrives as a JS `Date`, so a site's hand-rolled `validate` must route
it through `validateFields` or coerce).

Carried out-of-scope follow-ons: typed reads, OpenGraph image generation, redirects, i18n, and the two
delivery-validation refinements in the post-mortem (skip-drafts-at-build and apply-normalized-`data`-on-read).

## Where the work is (2026-05-31, post-component-form)

- Component registry Plan 2 of 3 (admin guided-insert form) executed, landed on `main`, pushed, and
  published as `0.10.0` (`latest` on npm via the OIDC release `v0.10.0`; commits `a3b38a3..008fc33`
  plus the docs and release-bump commits). `0.10.0` is additive over `0.9.0`: it bundles both
  component plans (Plan 1 grammar and Plan 2 form), and `ComponentPalette` was born and removed inside
  the unpublished window so no published export was dropped. It builds the guided-insert flow on
  Plan 1's grammar: `buildComponentInsert(def, values)` (the one pure serialize-then-validate step,
  exported from the main entry), `ComponentForm.svelte` (schema-driven fields, a repeatable
  add-and-remove list, inline validation errors), `ComponentInsertDialog.svelte` (the Insert trigger
  and a native `<dialog>` picker with the schema-vs-template dual path), and `IconPicker.svelte` over
  a site `IconSet` that now threads from the adapter through `composeRuntime` to `EditPage` to the
  form. `ComponentPalette` is removed; the dialog's dual path closes the Plan 1 no-op-def finding.
  The render `build()` path is untouched (that is Plan 3). Green at close: `npm run check` scan 0/0
  over 725 files, `npm test` 375 tests exit 0, `check:package` green, showcase builds. Execution
  deviations locked in: the unions are narrowed with typed accessors (no `any`) and `slotItems`
  returns the live `$state` proxy; `ComponentForm` is `{#key picked}`-wrapped so its `untrack` seed
  cannot go stale; the Insert trigger gets `aria-label="Insert component"` to avoid colliding with the
  form's submit. A review gate (simplifier plus svelte and daisyui-a11y reviewers, both Opus) ran;
  its findings were folded in test-first as the `008fc33` hardening commit (dropped the
  listbox/option roles for a plain button list, named the dialog, `role="alert"` plus `aria-invalid`/
  `aria-describedby` on the validation errors, the `{#key}` guard, the 24px remove-button floor).
  Plan and full post-mortem: `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`.
  **Queued (sequence against the delivery-surface DX pass above): brainstorm then write Plan 3
  (per-site migration: each site declares its UI components and `build()` reads named slots instead of
  the old heading convention, ecnordic then 907). It is the last of the three-plan component initiative. This is a design-bearing pass, so run
  `superpowers:brainstorming` with the user on the open decisions before `superpowers:writing-plans`;
  do not auto-write it. Parent design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`.
  Before Plan 3 ships, the live interactive `/admin` smoke for the guided-insert flow is the one
  unverified Plan 2 surface (see the carried follow-up).** Plan 3 is where the sites pin `^0.10.0` and
  the symlink dev link can engage.

## Earlier state (2026-05-31, post-component-grammar)

- Component registry Plan 1 of 3 (engine grammar and schema) executed and landed on `main`
  (commits `dbc1b69..174e02c`, not pushed, not published). It extends `ComponentDef` with a
  typed schema (`attributes` + named `slots`, plus `use`), adds the three grammar machines
  (`serializeComponent`, `parseComponent`, `validateComponent`) over one canonical
  `remark-directive` grammar, and `generateComponentReference` for the llms-full author/AI
  reference. Pure node `unit` code; `build()`, the render dispatch, and `insertTemplate` are
  untouched (`insertTemplate` only moved to optional). Green at close: `npm run check` scan 0/0
  over `src/`, `npm test` 360 tests exit 0, `check:package` green. Three corrections locked in
  during execution: `insertTemplate` became optional with a one-line palette guard;
  `remark-stringify` was an undeclared dependency (added and the committed lock relocked);
  and the plan's backslash-escaping premise was wrong (the directive grammar decodes HTML
  entities, so attribute quotes entity-encode instead). A svelte review plus a correctness
  review ran at the gate; the correctness findings were folded in test-first as a Task 9
  hardening pass (entity-encode quotes, escape title brackets, quote-aware unknown-attribute
  detection, repeatable-slot array guard, pinned `bullet: '-'`). Plan and full post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. **Immediate next action:
  execute Plan 2 (the admin guided-insert form),
  `docs/superpowers/plans/2026-05-31-cairn-components-02-form.md`, via `cairn-pass` +
  `subagent-driven-development`, dispatching the `cairn-implementer` per task (Sonnet default fits
  these well-specified tasks). Ten tasks, test-first, building on Plan 1's `serializeComponent`/
  `validateComponent`/`emptyValues` and the editor's `registerInsert` seam. It is engine + admin-UI,
  no site migration; run it on `main` directly (additive, no site deploys on a cairn-cms push) or a
  worktree off `main`. Design: `docs/superpowers/specs/2026-05-31-cairn-components-02-form-design.md`.
  The brainstorm settled a modal dialog that folds in the palette, a visual icon picker fed by a site
  `IconSet` threaded through the adapter (with a None choice when the icon field is optional), reuse
  of `validateComponent` as the form validator, a schema-vs-template dual path (which also resolves
  the Plan 1 no-op-def finding), and body validation deferred.**

## Earlier state (2026-06-01, post-editor-swap-publish)

- The editor foundation swap (Carta to CodeMirror 6) MERGED to `main`, pushed to origin, and PUBLISHED
  as `0.9.0` (now `latest` on npm via the OIDC release `v0.9.0`). It replaces Carta with a
  client-only CodeMirror 6 edit surface behind the unchanged `MarkdownEditor` seam
  (`value`/`name`/`registerInsert`), gives cairn its own house-icon `EditorToolbar.svelte` and a pure
  node-testable `markdown-format.ts`, drops the dead Carta `preview` adapter prop from `EditPage`, and is
  breaking (the `preview` prop and the carta-md peer both left). Green on `main` after the merge: `npm run
  check` 0/0 over 707 files, `npm test` 331 passed exit 0. The showcase production build code-splits
  CodeMirror to client chunks with no `@codemirror/view` in the server bundle. Two review subagents
  (svelte, daisyui-a11y) plus a simplifier pass were folded in (the `$bindable` seam reconciles an external
  value change into the mounted view, a focus ring was restored, toolbar targets reach the 24px floor, and
  the toolbar uses the admin's stroke SVG icon set). Plan and post-mortem:
  `docs/superpowers/plans/2026-05-31-cairn-editor-codemirror-swap.md`. The `feat/editor-codemirror-swap`
  worktree and branch were removed after the merge. Carried follow-up: the interactive browser smoke (live
  typing, the focus ring, toolbar formatting) is the one unverified surface; the automated gate and the prod
  build cover the rest.
- The site UI component registry is designed; Plan 1 of 3 (engine grammar and schema) is now executed
  and landed (see the top entry). Each site will declare its UI components once (typed attributes, named
  slots, description, intended-use, render). One canonical directive grammar drives a guided insert form
  for non-technical editors, save+build validation, and a generated `llms-full`-shaped reference file an
  author points claude.ai at. Research grounded three choices: explicit named slots over an implicit
  heading, a parse-ready grammar for later round-trip editing, and schema validation. Insert-only in v1.
  Design: `docs/superpowers/specs/2026-05-31-cairn-site-components-design.md`; Plan 1 (engine grammar and
  schema, no UI): `docs/superpowers/plans/2026-05-31-cairn-components-01-grammar.md`. Plans 2 (admin guided
  form) and 3 (per-site migration, ecnordic then 907) are written just-in-time after each lands. Builds on
  the editor swap's `registerInsert` seam, now published.
- The dated-slug identity pass landed on `main` (commits `dd2a265..77d9bf2`), bumping the local
  version to `0.8.0` (published to npm). It gives dated concepts a split id/slug identity (id is the
  filename stem, slug is the date-stripped id), adds a per-concept `datePrefix` granularity knob,
  moves per-concept URL policy (`permalink`, `datePrefix`) into the admin-editable YAML site-config
  under an SSG model, and unifies public delivery behind a site-level `byPermalink` resolver one
  catch-all `[...path]` route serves. Green at close: `npm run check` 0/0 over `src/`, 315 tests exit
  0, `npm run check:package` clean. Three review subagents returned no blockers; four small findings
  were folded in. Design: `docs/superpowers/specs/2026-05-31-cairn-dated-slug-design.md`; plan and
  post-mortem: `docs/superpowers/plans/2026-05-31-cairn-dated-slug.md`. The pass ran directly on
  `main` (user-authorized), not a worktree. Not yet published to npm and not yet smoke-tested against
  a live Worker.
- Rebuild plans 00 through 08 landed earlier. The public content delivery layer landed too. It merged
  to `main` (merge `6080496`) and published as `0.7.0`, the `latest` tag on npm. The delivery layer is
  additive over the 0.6.0 admin and auth surfaces, so it shipped as a minor. Green at that merge:
  `npm run check` 0/0, 285 tests exit 0, `npm run check:package` passing. The publish ran through the
  OIDC trusted-publishing workflow off the `v0.7.0` GitHub Release.
- Both consumer sites (907-life, ecnordic-ski) still run `0.6.0`. They cut over to it, merged to
  their mains, deploy via CI, and passed a full live magic-link smoke. The dormant better-auth
  tables and AUTH_KV are deleted. Neither site has migrated onto the delivery surface yet.

## Worktree topology

- `~/Projects/cairn/cairn-cms` is the `main` checkout, canonical, and the only worktree. STATUS.md
  is canonical here.
- The two merged feature worktrees are gone. `cairn-public-delivery` (`feat/public-delivery`) was
  pruned at the 0.7.0 landing; `cairn-cms-rebuild` (`feat/rise-data-attr`) was removed and its branch
  deleted in the teardown pass (2026-05-30).
- Structural decision (settled): keep the `~/Projects/cairn` meta-workspace through the site
  co-evolution phase. The sites are about to migrate onto the `0.7.0` delivery surface, which is the
  strongest case for zero-publish symlink dev. Dissolving the workspace to standalone top-level
  repos is deferred until cairn-cms stabilizes after the scaffolder (Plan 10).
- Symlink dev is documented and proven, currently off. The runbook is
  `docs/runbooks/symlink-dev.md`. npm links a member only when its version satisfies the consumer's
  range, so the link engages per-site at first migration, when a site moves to `^0.7.0` (which also
  forces the `renderPreview`-to-`render` adapter rename and a deploy). The teardown pass proved the
  end-to-end link against 907-life and found two conditions the original plan missed, both now in the
  runbook: the local cairn-cms version must run a proper patch *ahead* of the published one (an exact
  `0.7.0 == registry 0.7.0` makes npm prefer the tarball; a prerelease like `0.7.1-dev` fails to
  satisfy `^0.7.0`), and the root `package-lock.json` must be deleted after the bump so npm
  re-resolves instead of honoring the stale registry pin. A member-local `node_modules` copy also
  shadows the link and must be removed. A root-level `npm install` was verified not to drift either
  site's committed lock, and standalone `npm ci` stayed green for both. See
  [[workspace-symlink-and-next-pass]].

## Open decisions and next steps

Do these in order.

0. Editor swap is merged, pushed, and published as `0.9.0` (`latest` on npm), `0.8.0` published earlier
   (done). The interactive browser smoke remains a fast-follow: live keyboard behavior in the showcase admin
   editor (typing, the focus ring, toolbar formatting, the palette insert, the preview toggle). Pushing
   cairn-cms `main` does not deploy a site (only the site repos deploy on push).
0a. Publishing: the registry carries `0.7.0`, `0.8.0`, and `0.9.0` (`latest`). The delivery-surface DX
   pass on `main` is unpublished; publish it as `0.11.0` (additive minor over `0.10.0`) before any site
   migration, so a site can import `@glw907/cairn-cms/delivery`. `0.9.0` is breaking on the package
   surface (the `MarkdownEditor` `preview` prop is gone and carta-md left the peer set), so a consuming
   site that passed `preview` must drop it at that bump.
1. Migrate each site onto the published delivery surface (`^0.11.0` once published), one per-site
   `site-pass`, from that site's own directory. Each imports from `@glw907/cairn-cms/delivery`, applies
   the `renderPreview`-to-`render` rename, builds the content layer with `siteDescriptors` +
   `createSiteIndex` (which now validates frontmatter at build), adopts the `responses.ts` feed/sitemap/
   robots helpers and the `<CairnHead>` SEO head, wires the catch-all `[...path]` route, sets its
   per-concept URL policy in the YAML (`907`: `datePrefix: day`, `/:year/:month/:day/:slug`; `ecnordic`:
   `datePrefix: month`, `/:year/:month/:slug`), and drops its hand-rolled `posts.ts`/`feed.ts`.
   `examples/showcase` is the complete working reference. **Gotcha to honor (from the delivery DX review):
   the build-time validation feeds `parseMarkdown` frontmatter to the site's `validate`, where an unquoted
   YAML `date:` is a JS `Date`, not a string. A hand-rolled `validate` that string-checks `date` must route
   it through `validateFields` or coerce it, or the build rejects valid dated posts.** Existing filenames and
   URLs are preserved with zero redirects. This is where the symlink engages
   (`docs/runbooks/symlink-dev.md`) and where the production deploys happen. The live `/admin` smoke
   for the dated create flow is best run here, against the real Worker.
2. The internal-link picker is the next editor pass (post-to-post linking via a `cairn:<concept>/<id>`
   token resolved at build). It builds directly on the new CodeMirror surface and the `registerInsert`
   seam, which is why the seam's two-way `value` flow was made correct in this pass.
3. Next cairn engine passes, each its own brainstorm-then-plan: a content-lifecycle pass (atomic
   Git Data API move primitive, delete, rename, internal-link rewriting; external redirects stay the
   site's job) and a settings-editor pass (the admin web UI to edit the YAML URL policy and other
   settings). Then the still-pending CairnExtension dispatch and the `create-cairn-site` scaffolder.
   Both deferred passes are scoped in the dated-slug design doc's future-work section.

Launch directory: start Claude inside the repo a pass targets (cairn-cms or a site), so that repo's
own `.claude/` hooks and per-project memory stay active. The workspace `CLAUDE.md` still loads as a
parent. Reserve `~/Projects/cairn` for cross-repo or workspace-config chores. The launch-directory
table also lives in `docs/runbooks/symlink-dev.md`.

The teardown pass settled the carried loose ends: the content-concepts design doc is committed as
history (`5c10058`), and the stale in-progress breadcrumb in `docs/PLAN.md` was discarded (its
outcome is in the functional spec).

## Carried follow-ups (latent, not bugs under current conventions)

- Delivery DX (open design decisions from the review, not bugs): build validation runs over drafts too
  (`includeDrafts: true`), so a draft saved with an unfilled required field would fail the build; the admin
  save path validates before commit, so this is a backstop for direct-git edits. `createSiteIndex`
  validation checks `result.ok` and discards the validator's normalized `result.data`, so a `validate` that
  trims or defaults a field passes the build yet the read serves raw frontmatter (the delivery path treats
  `validate` as a gate, not a transform; fold normalization in with the typed-reads pass). Minor: `entryLoad`
  attaches feed autodiscovery links to undated Pages too, and the showcase `feed.xml` would render an
  `Invalid Date` pubDate for an undated item (unreachable while posts are always dated). The build-validation
  date-shape gotcha (unquoted YAML `date` arrives as a JS `Date`) is recorded in the site-migration step
  above, since that is where a hand-rolled validator would meet it.
- Component registry (Plan 1, RESOLVED by Plan 2): the old palette rendered a no-op item for a def
  lacking `insertTemplate`. The Plan 2 dialog replaces the palette with a dual path (schema def opens
  the form, template-only inserts directly, a def with neither is omitted), so the no-op is gone.
- Component form (Plan 2): the live interactive `/admin` smoke against a real Worker (open the
  dialog, fill the form, insert into the editor) is unverified; the browser-layer component tests and
  the untouched auth/save flow make it a fast-follow, not a blocker. Repeatable items are bare strings
  keyed by index, so a mid-list removal reuses DOM nodes by position (values stay correct, focus
  identity does not follow an item); a stable per-item id is the fix once multi-field repeatable items
  arrive. Minor a11y polish left: the flat fields carry a redundant `aria-label` alongside their
  visible `<label>`, the per-item input label is generic rather than indexed, and `IconPicker` is an
  `aria-pressed` toggle group that could move to radiogroup semantics.
- Component grammar (latent, low likelihood for the planned sites): an attribute value with a literal
  newline is unsupported (single-line form fields make it unreachable); `validateComponent` parses the
  markdown twice (fine, validation is not hot). Multi-field repeatable items stay deferred by design, and
  `build()` reads the old heading convention until Plan 3 refactors each site to read slots.
- Dated slug: the admin create date-in-slug guard rejects any slug opening with `^\d{4}-` on a dated
  concept, broader than the `datePrefix` strip (a `day` concept strips only a full `YYYY-MM-DD-`). A
  post deliberately slugged `2026-recap` is refused with the "leave the date out" hint. Acceptable
  since the date is captured separately; revisit if a real title trips it.
- Public delivery: the feed date formatters throw on a malformed date (the index normalizes
  upstream); a dateless entry sorts last in a dated concept; `deriveExcerpt`/`wordCount` assume
  whitespace-delimited words; the permalink date parse accepts a shape-valid but impossible date.
- Render hardening: `splitHead` dereferences a missing `<h2>`; `glyph` serializes `d="undefined"`
  for an unknown icon. Both inherited from legacy, unreachable under the sites' content.
- Auth hardening: install-token KV caching, rate-limit plus `waitUntil` on the request endpoint,
  `/admin` security headers, the `__Host-` session cookie prefix.

## Durable operational traps

- Both sites deploy on push to `main`. An editor SAVE commits content to `main` and triggers a
  redeploy, so a cutover must merge to `main` rather than run from an unmerged branch.
- The npm workspace root makes `npm install` from a member update the root lock, leaving the
  member's committed lock stale and failing CI `npm ci`. Relock standalone: temp-move the root
  `package.json` and lock, `rm -rf node_modules package-lock.json`, `npm install`, restore the
  root, commit the lock.
- npm 11 does not apply `publishConfig.exports` on pack, so `exports` point at `dist/` always with
  a `prepare` build.
- `npm run check` exits non-zero locally on the showcase `svelte.config.js` (it imports
  `@sveltejs/adapter-node`) unless the showcase deps are installed (`cd examples/showcase &&
  npm install`). CI checks out cairn-cms standalone and stays green. The svelte-check scan itself
  is 0 errors 0 warnings either way.
- Durable cross-cutting gotchas are the focused `cairn-*` memories (email send vs routing, the
  GitHub App PKCS#1 to PKCS#8 wrap, DaisyUI v5 form classes, carta-md NodeNext typing, the
  subagent model assignment, prose-guard tiers, dispatch discipline, the code-simplifier rule).
