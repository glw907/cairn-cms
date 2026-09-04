# Chassis-A Pass Implementation Plan (audit remediation, slice 8: the structural chassis pass)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (the pass is sequential; see
> Execution). Steps use checkbox syntax for tracking. **Runs only after internals-C merges**
> (its Task 4 renames the emitted `ec-*` classes and re-emits the template; this pass inherits
> `cairn-*`). Reconcile every anchor against post-C `main` at dispatch. Round-1 three-lens
> review folded 2026-09-04 (grounding, risk, hygiene and sizing; report banked at
> `docs/internal/record/2026-09-04-chassis-inputs/plan-review.md`); the fold notes below each
> carry the finding where the reasoning matters.

**Goal:** bring `examples/showcase`, the chassis every theme copy and the scaffold descend
from, to the exemplar bar structurally: the fixture job excluded from the emitted scaffold,
lint and format reaching the showcase, the monolith config split, dead code gone, public
routes single-sourced, the render trio re-homed per its rulings, the chassis's pure logic
unit-tested, the idioms one way, and the shipped comments in register.

**Architecture:** every task lands inside `examples/showcase`, `templates/waymark` (always
regenerated, never hand-edited), the emitter and bake scripts, the repo's gates, or the docs.
The one engine-surface change is the render trio's deletion (Task 8), executed as the three
retire rulings require: re-home, rebake, guide rewrite, and deletion in one change, with the
replacement code in the `Consumers must:` line. **Rendered output does not change in this
pass.** Every output-changing item is chassis-B's, including the archive proof (review fold:
proving pagination reveals the home page's pagination block and moves at least twelve
committed baselines, so it moved to B with the entry-row extraction).

**Tech stack:** SvelteKit 2, Svelte 5, TypeScript, Prettier with `prettier-plugin-svelte`,
ESLint with `svelte-eslint-parser`, vitest, Playwright, the repo's gate estate.

**Spec:** `docs/superpowers/specs/2026-09-04-chassis-passes-design.md`; inputs and reviews
banked at `docs/internal/record/2026-09-04-chassis-inputs/`; the recorded fourteen at
`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`; the fresh review
whose section numbers this plan cites is
`docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`.
Anchors verified 2026-09-04 against `main` at `5c6cf425` (pre-internals-C-merge; re-verify at
dispatch, especially `docs/reference/render.md`, which internals-C Task 4 rewrites).

**Token ceiling:** 7.5M (12 tasks; a heavier gate than internals-C's, two tasks with unbounded
finding volume; review fold: 6.5M sat at the observed per-task rate). **Checkpoint interval:**
every four tasks (checkpoints at 4, 8, 12). **Execution:** sequential in one worktree,
`.claude/worktrees/chassis-a` off post-C `main`, from-scratch showcase `npm install` before the
first gate; `templates/waymark` is the contended resource, so no parallel chains. At most one
other full gate may run on the machine concurrently.

## Ruled inputs (recorded; no task re-derives them)

- **The two organizing rules** (spec): the fixture job is excluded by path or marked by the
  `cairn-template:exclude-start`/`-end` idiom (`examples/showcase/wrangler.jsonc:44-55` is the
  worked example that keeps a stripped file whole); the exemplar uses the chassis it ships.
- **Prettier in the chassis only**, pinned: `printWidth: 100`, `singleQuote: true`,
  `useTabs: false`, `trailingComma: 'all'`, `prettier-plugin-svelte`. The first adoption
  covers `.ts`, `.js`, and `.svelte` only; the CSS half (`src/chassis/*.css`,
  `src/theme/*.css`) rides chassis-B, after internals-C's `prose.css` rename settles and
  because `check:public-tokens` and `check:chassis-boundary` read those files. The reformat
  is this pass's FIRST commit and is reviewed as a mechanical change. Engine gates never
  depend on the scaffold's formatter; the engine's own `check:idioms` (internals-C Task 2)
  stays its only formatting enforcement.
- **The Svelte lint half wires a parser, not a rule set.** One `eslint.config.js` block with
  explicit `files: ['examples/showcase/src/**/*.svelte']`, `svelte-eslint-parser` with
  `parserOptions.parser: tseslint.parser`, and the same four comment rules the `.ts` block
  carries (`house/no-em-dash-in-comments`, `jsdoc/no-types`, `tsdoc/syntax`,
  `jsdoc/informative-docs`). `eslint-plugin-svelte`'s own rule sets are deliberately not
  enabled (they are a11y and reactivity rules, not a comment gate, and their `files` glob
  would reach `src/lib/components`). Both devDependencies go in the ROOT `package.json`; they
  do not ship to the scaffold.
- **The `// cairn-cms:` header prefix is dropped, not spread** (review 3.4: the prefix carries
  no information inside a file that lives in a cairn site; the leanness test favours removal).
  Eight showcase modules carry it today; after this pass none does.
- **`createSectionAction` stays unadopted in this pass.** `admin/signups/+page.server.ts` is
  the extension-seam proof driven by `e2e/custom-screen.spec.ts`, and adopting the helper
  changes its auth and audit path, which is behavioral work with an input (internals-C Task
  10's ruling) that may not have landed. Task 10 writes one comment recording the raw shape
  as deliberate; adoption, if the docs keep teaching the helper, is chassis-B's.
- **Render trio shape:** `headRow` re-homed as a chassis-local export; `cardShell` and
  `iconSpan` inlined at their single call sites; `/render` survives type-only
  (`ComponentContext`); the allowlist entry lives in `scripts/checks/reference-coverage.mjs`
  (`NARRATIVE_CONTEXT_ALLOWLIST`, about :601-610) under `check:reference`, pinned by
  `src/tests/unit/reference-coverage.test.ts:403,409`. The engine's render-pipeline snapshot
  test keeps its byte-identical lock by carrying local fixture copies of the three helpers
  beside its `fixtureHead` (it imports them from the internal path today and never touches
  the showcase, so it cannot prove either showcase change). Four production sites import at
  least two of the three.
- **The showcase's unit tests ship to the scaffold on purpose** (a scaffolded site inherits
  the chassis logic and its tests); `PRUNED_SCRIPTS` (`bake-template.mjs:21`) is not extended.
- **`$members` alias rejected:** all six `../../members` traversals live in template-excluded
  files; an alias in the emitted `svelte.config.js` would point every scaffold at a directory
  it lacks.
- **Release:** ONE cut after polish; the initiative design's item-6 publish paragraph is
  amended in Task 12.

## Global constraints

- Every task that changes an emitted file ends with `npm run emit:template` and commits the
  regenerated `templates/waymark` in the same commit; `check:template` green per task.
- `check:surface` unchanged except Task 8's regeneration; no public export added; the only
  removal is Task 8's trio.
- No rendered output changes. A task whose diff moves any committed baseline stops and
  reports; that work is chassis-B's.
- Prose in comments and docs: no em dashes; TSDoc and Svelte `@component` conventions.
- Gate per task: `npm --prefix examples/showcase run format:check` (after Task 1), the
  showcase `check`, `test:unit` (after Task 9), and `test:e2e`; the engine's `npm run check`,
  `check:chassis-boundary`, `check:public-tokens`, `check:template`, `check:consumers`,
  `check:reference`, `check:docs`; `npm test` when engine code or tests change (Task 8).
  The six CI-only gates BY NAME at pass end plus `check:idioms` and `check:cm-internals`.

---

### Task 1: The Prettier reformat and the tab fixes (the first commit)

**Files:**
- Create: `examples/showcase/.prettierrc`, `examples/showcase/.prettierignore`
- Modify: `examples/showcase/package.json` (devDependencies `prettier`,
  `prettier-plugin-svelte`; scripts `format` and `format:check` sharing ONE target set
  written once, `src/**/*.{ts,js,svelte} e2e/**/*.ts *.ts *.js`, with `format:check` never
  wider than `format`), every showcase source file the reformat touches,
  `examples/showcase/playwright.config.ts` (tabs at :4-14), `e2e/masthead-responsive.spec.ts`,
  `e2e/site-visual.spec.ts`, `e2e/theme-toggle.spec.ts` (tab-indented), `templates/waymark`
  (regenerated)

**Interfaces:**
- Produces: `npm --prefix examples/showcase run format:check`, in every later task's gate;
  the emitted scaffold carries the config and the scripts.

- [ ] **Step 1:** run the showcase visual suite once on the untouched tree and keep its
  result as the before-state.
- [ ] **Step 2:** add the pinned config, the ignore file (CSS excluded for now; the bake's
  generated files are Task 2's concern), the scripts, and the two devDependencies; run
  `format` once; confirm the four tab-indented files are now spaces (`git diff -w --stat` on
  those four shows whitespace-only).
- [ ] **Step 3:** run the visual suite again. If any committed baseline moves, stop and
  report with the file: a mechanical reformat that changes paint is not mechanical, and the
  offending markup gets a `prettier-ignore` line rather than a baseline regeneration.
- [ ] **Step 4:** re-emit; full gate; ONE commit whose subject says it is the mechanical
  reformat.

**Acceptance criteria:** `format:check` green on the showcase; `check:template` green; the
showcase e2e suite green with every baseline unchanged; the commit is the first on the
branch; `format` and `format:check` share one target set.

### Task 2: The scaffold's format check

**Files:**
- Modify: `examples/showcase/.prettierignore` (the bake's generated files by their emitted
  paths: `README.md` and `scripts/dev.mjs`, written at `bake-template.mjs:192-197`; the
  rewritten `package.json` at `emit-template.mjs:141-145`; the overlay's `LICENSE`,
  `.dev.vars.example`, and appended `.gitignore` per `emit-template-dir.mjs:47-79`),
  `.github/workflows/create-site.yml` (the scaffold job runs `format:check` after its build),
  `.github/workflows/test.yml` (the engine's job runs the showcase `format:check`),
  `packages/create-cairn-site/scripts/bake-template.test.mjs` only if its assertions need
  the new scripts named, `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** the ignore entries; verify in BOTH trees: a fresh `templates/waymark`, and
  a bake-only tree produced by the exact command `create-site.yml:50` runs
  (`node packages/create-cairn-site/scripts/bake-template.mjs --to <tmp> ...`), since the
  overlay replaces the bake's README and the scaffold job format-checks the bake's output.
- [ ] **Step 2:** the two workflow wirings; re-emit; full gate; commit.

**Acceptance criteria:** `format:check` green inside both trees; both workflows carry the
check; no bake-side formatter was added.

### Task 3: The comment gate reaches the showcase

**Files:**
- Modify: `eslint.config.js` (`COMMENT_GLOBS` at :33 gains `examples/showcase/src/**/*.ts`
  and `examples/showcase/e2e/**/*.ts`; the new scoped Svelte block per the ruled input),
  root `package.json` (`lint` at :67 and `scripts/checks/check-comments.sh:9` take the
  showcase paths as well as `src/lib`; devDependencies `svelte-eslint-parser`,
  `eslint-plugin-svelte` only if the parser package requires it as a peer, otherwise the
  parser alone), the showcase comment sites the gate now flags, `templates/waymark`
  (regenerated)

**Interfaces:**
- Produces: `npm run check:comments` covering `examples/showcase`; the engine's own
  `src/lib/components/*.svelte` stays unwired (filed to polish in Task 12).

- [ ] **Step 1:** wire both halves; run `eslint src/lib` before and after and confirm its
  file count is unchanged (the Svelte block must not reach the engine); run
  `check:comments` and record the finding count by directory in the task report before
  fixing anything.
- [ ] **Step 2:** fix the findings (TSDoc structure, `{type}` tags, paraphrase comments, em
  dashes) in the showcase `.ts` and `.svelte` files. Comment rewrites only; a comment that is
  wrong about the code is fixed by fixing the comment, and a real defect it reveals goes to
  the conductor. If the volume exceeds one task's scope, stop at a directory boundary, commit,
  and report the remaining directories as a named follow-on for the checkpoint.
- [ ] **Step 3:** `check:comments` green; re-emit; full gate; commit.

**Acceptance criteria:** the gate runs over the showcase in `lint` and `check:comments`; zero
findings, or the remainder named by directory; `eslint src/lib` lints the same file set as
before; no `eslint-plugin-svelte` rule is enabled.

### Task 4: Fixtures out of the scaffold

**Files:**
- Modify: `examples/showcase/.cairn-template.json` (exclude `src/routes/probe-craft` and
  `src/routes/(site)/+layout.server.ts`; verify at dispatch that the emitter's exclude list
  accepts a file path as well as a directory by reading `emit-template.mjs`'s exclusion
  walk; if it accepts directories only, wrap the file's whole body, import through closing
  brace, in exclude markers instead and say so), `examples/showcase/README.md` (the fixture
  convention: what is excluded, what is marked, that the `../../members` traversals are
  fixture-only, how a contributor adds a fixture), `docs/extend/what-the-scaffold-wrote.md`
  (:67 tree line and :153 public-routes row for `probe-craft/` removed),
  `.github/workflows/create-site.yml:89-111` (the leftover list gains `src/routes/probe-craft`;
  a second assertion walks the scaffolded tree recursively and fails if any file's contents
  include `siteLayoutSentinel`, since the existing block uses `fs.existsSync` and a content
  check needs a read), `templates/waymark` (regenerated)

**Interfaces:** none new. The fixtures stay in the showcase: `e2e/preview.spec.ts:245-247`
keeps asserting `cairn-showcase-site-layout`, and the craft-chapter acceptance protocol keeps
driving `src/routes/probe-craft/` by path.

- [ ] **Step 1:** the exclusions; re-emit; confirm neither path exists under
  `templates/waymark` and that the scaffold builds without a `(site)/+layout.server.ts`.
- [ ] **Step 2:** the README convention; the doc edits; the CI assertions; run the scaffold
  job's assertion script locally against a fresh scaffold; full gate; commit.

**Acceptance criteria:** `templates/waymark` contains neither fixture; the scaffold job's
assertions cover both by name; the showcase e2e suite green unchanged; `check:docs` green.

### Task 5: Dead code out

**Files:**
- Delete: `examples/showcase/src/theme/components/IntroLedger.svelte` (267 lines),
  `examples/showcase/src/theme/components/Carousel.svelte` (197 lines),
  `examples/showcase/scripts/reference-capture.mjs` (its header at :1-3 says "deleted after
  the pass"; it sits under the excluded `scripts/`, so hygiene rather than a leak)
- Modify: `docs/extend/what-the-scaffold-wrote.md:131` (the `components/` row stops calling
  the directory "the theme's registered markdown components", since the registered set lives
  in the adapter's component list and `ArticleView` and `Carousel` are not in it; rewrite the
  row's claim), `templates/waymark` (regenerated)

- [ ] **Step 1:** `grep -rn "IntroLedger\|Carousel\|reference-capture" --include='*' .`
  outside `node_modules`, `docs/internal/history`, `docs/internal/record`, and
  `docs/superpowers` (the recorded finding verified zero referrers in `src/` and `e2e/`); the
  deletions; the row rewrite; re-emit; full gate; commit.

**Acceptance criteria:** the grep returns nothing outside the write-once directories; the
scaffold builds; no baseline changes.

### Task 6: `cairn.config.ts` split

**Files:**
- Create: `examples/showcase/src/theme/icons.ts` (the icon set, `cairn.config.ts:18-36`
  today) and `examples/showcase/src/theme/markdown-components.ts` (the nine
  `defineComponent` declarations; NOT `components.ts`, which would share the `$theme/components`
  specifier with the existing `src/theme/components/` directory six files import through),
  each with a true header
- Modify: `examples/showcase/src/theme/cairn.config.ts` (526 lines to the adapter, concepts,
  backend, and `navLayout`, importing the two new modules; the `$theme` self-imports at :9-10
  made one way with the rest of the tree; the two-line header rewritten to describe the
  file), the chassis README's file table if it lists theme files,
  `docs/extend/what-the-scaffold-wrote.md` and `docs/extend/define-an-adapter-and-schema.md`
  where they describe the adapter file's contents, `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `export const icons` from `$theme/icons.js` and
  `export const components = [callout, alert, icon, video, pullQuote, cta, microCta, faq, banner]`
  (the nine, named as they are declared today) from `$theme/markdown-components.js`, with each
  declaration also exported by name so Task 8 can reach `alert`; every existing importer of
  `cairn.config.ts` compiles unchanged.

- [ ] **Step 1:** pure move. Proof: the showcase e2e suite green with every baseline
  unchanged, and the rendered HTML of one page carrying every component directive (the
  styleguide page) diffed before and after and byte-identical. Move, wire, verify; headers;
  docs; re-emit; full gate; commit.

**Acceptance criteria:** the adapter file holds only the adapter, concepts, backend, and
`navLayout` (expected 100 to 130 lines; a larger residue is reported, not forced); its header
is true; the styleguide HTML diff is empty and every baseline unchanged;
`check:chassis-boundary` green.

### Task 7: Single-source public routes and site metadata

**Files:**
- Modify: `examples/showcase/src/routes/(site)/[...path=md]/+server.ts:13-21` (consume the
  chassis `PublicRoutesConfig` from `src/chassis/public-routes.ts:11-25` instead of retyping
  seven of nine fields and dropping `defaultImage`/`feeds`), `examples/showcase/src/chassis/content.ts`
  (a `siteMeta` export holding the title, description, and origin the feeds compose today),
  `examples/showcase/src/routes/feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13`
  (each consumes `siteMeta` and supplies only its own `feedUrl`), `templates/waymark`
  (regenerated)

**Interfaces:**
- Produces: `export const siteMeta = { title, description, origin }` from
  `$chassis/content.js`.

- [ ] **Step 1:** capture the `.md` twin's output for two entries and both feed bodies
  before the change; one config source and one metadata source; capture again and diff;
  re-emit; full gate; commit.

**Acceptance criteria:** exactly one `PublicRoutesConfig` literal in the showcase;
`siteConfig.siteName` and the site description are composed for the feeds in exactly one
place; the `.md` outputs and both feed bodies byte-identical before and after; e2e green.

### Task 8: Render trio re-homing (one change, per the rulings)

**Files:**
- Modify (showcase): `src/chassis/render.ts` (`headRow` becomes a local export beside
  `makeIconRenderer`; `iconSpan`'s one-`h()` body inlined into `makeIconRenderer` at :20; the
  `@glw907/cairn-cms/render` import goes; the prose mention at :4 goes),
  `src/theme/markdown-components.ts` (Task 6's module: `cardShell` inlined in `alert`,
  `headRow` imported from `$chassis/render.js`, the inline class literal taken from the
  post-internals-C source so it reads `cairn-*`), `src/chassis/README.md:102-105` (the
  component-grammar paragraph gains `headRow` and loses the removed names) and `:190` (the
  removal table), `src/chassis/tokens.css:17` (the comment re-pointed), `templates/waymark`
  (regenerated)
- Modify (engine): `src/lib/render/rehype-dispatch.ts:20,29,39` (the three definitions
  deleted), `src/lib/render/authoring.ts:9` (the barrel line deleted; the header rewritten to
  say the subpath is type-only, exporting `ComponentContext`), `src/lib/index.ts:106` (the
  comment), `src/tests/unit/render-pipeline-snapshot.test.ts` (local fixture copies of the
  three helpers beside `fixtureHead` at :26 so the byte-identical lock survives),
  `render-rehype-dispatch.test.ts`, `render-exports.test.ts`,
  `reference-coverage.test.ts:276,403,409`, `scripts/checks/reference-coverage.mjs` (the
  `NARRATIVE_CONTEXT_ALLOWLIST` entry removed), `docs/reference/render.md` (the trio removed;
  the emitted class registry internals-C Task 4 placed there stays; re-anchor at dispatch)
  and `docs/reference/core.md:696-709`, `docs/extend/configure-rendering.md:49,57-58,84-85`
  (the worked example rewritten against plain `h()`), `docs/internal/api-surface.md`
  (`check:surface -- --update`), `CHANGELOG.md` (`## Unreleased`; `Consumers must:` naming the
  three removed exports, the chassis `render.ts` shape, the inline forms of `cardShell` and
  `iconSpan` verbatim, and the note that the emitted classes are `cairn-*` after internals-C),
  `docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md` (the three rows closed
  with the seam-fit line)

**Interfaces:**
- Consumes: `alert` from `$theme/markdown-components.js` (Task 6).
- Produces: `headRow` from `$chassis/render.js` with the signature it has in the engine
  today; the `/render` subpath exports only `ComponentContext`.

- [ ] **Step 1:** showcase side first. Proof: render the `alert` directive (and one `icon`
  directive) through the showcase pipeline before and after and diff the HTML; the showcase
  e2e suite green with every baseline unchanged.
- [ ] **Step 2:** engine deletion, the snapshot test's fixture copies, the other tests, the
  allowlist, surface regeneration, docs, changelog, migration note, ledger; re-emit; the full
  engine gate (`npm run check && npm test`) plus `check:reference`, `check:surface`,
  `check:snippets`, `check:consumers`; commit.

**Acceptance criteria:** `grep -rn "cardShell\|iconSpan" src/lib examples/showcase templates`
returns nothing outside the snapshot test's fixture block, and `headRow` resolves only to the
chassis and that fixture block; the HTML diffs are empty; every gate named green; the
changelog line carries the replacement code; the three ledger rows read closed.

### Task 9: Showcase unit tests

**Files:**
- Create: `examples/showcase/vitest.config.ts` (standalone, node environment; not a project
  in the engine's root config), `examples/showcase/src/chassis/archive.test.ts`,
  `src/chassis/date.test.ts`, `src/theme/islands/banner-expiry.test.ts`,
  `src/theme/components/admin-link.test.ts`, and a test per pure function Task 6 exposed,
  each co-located with its module
- Modify: `examples/showcase/package.json` (devDependency `vitest`; script `test:unit`),
  `.github/workflows/test.yml` (runs it), `templates/waymark` (regenerated; the tests ship)

**Interfaces:**
- Produces: `npm --prefix examples/showcase run test:unit`, in every later task's gate.

- [ ] **Step 1:** config, tests (table-driven where the input space is small: page
  boundaries and the empty corpus for `paginateArchive`, the year grouping, expiry at the
  boundary for `isBannerExpired`, admin and non-admin hrefs for `isAdminHref`), wiring;
  re-emit; run `test:unit` inside a fresh `templates/waymark`; full gate; commit.

**Acceptance criteria:** every pure function the spec names (`paginateArchive`, `formatDate`,
`isBannerExpired`, `isAdminHref`) has a co-located test, in `$chassis` or `$theme` as it
lives; the scaffold's `test:unit` runs green inside a fresh `templates/waymark`;
`check:template` green.

### Task 10: Idiom conformance

**Files:**
- Modify: every `$chassis`/`$theme` import without `.js` (enumerate with
  `grep -rn "from '\$chassis/[a-z-]*'" examples/showcase/src` and the `$theme` twin; recorded
  rank 9 names `(site)/[...path]/+page.server.ts:3-4` against
  `(site)/preview/[token]/+page.server.ts:11-12`), `src/routes/test/last-commit/+server.ts:9`
  (typed `RequestHandler`, matching `test/last-otp/+server.ts:23`) and
  `src/routes/(site)/archive/[page]/+page.server.ts:25` (one `error(404, ...)` idiom across
  the tree), `src/routes/admin/signups/+page.server.ts:32` (the `fail` literal onto the
  sanctioned shape; one comment recording that the raw `requireOwner`/`formData`/`fail`
  shape is kept deliberately, per the ruled input), the eight showcase modules that open
  with `// cairn-cms:` (the prefix removed; enumerate with `grep -rln "^// cairn-cms:"
  examples/showcase/src`), `src/chassis/archive.ts:26-29` (`sortNewestFirst` removed) and
  its two call sites with the engine's newest-first ordering for dated concepts documented as
  a contract in `docs/reference/delivery.md` (sourced from
  `src/lib/delivery/content-index.ts:139-140`), one showcase `+page.server.ts` hand-mounted
  against generated `./$types` (the foundations-B carry-forward: type the custom-screen
  exemplar's load and actions from `./$types`), `templates/waymark` (regenerated)

- [ ] **Step 1:** enumerate with the greps above; apply; `e2e/custom-screen.spec.ts` and
  `e2e/access-map.spec.ts` green unchanged; re-emit; full gate; commit.

**Acceptance criteria:** zero bare `$chassis`/`$theme` specifiers; one handler idiom and one
error idiom in the tree; no showcase module opens with the prefix; `sortNewestFirst` gone and
the ordering documented; the hand-mount compiles against generated types; the
`createSectionAction` comment present.

### Task 11: Register purge of shipped exemplar comments

**Files:**
- Modify: the citation and narration sites the fresh review enumerates in sections 3.1 to
  3.6 (Step 0 reads them), among them `src/chassis/prose.css:2` ("B2 deliverable"), the "B3
  and B4 add" and "the manual light/dark toggle is B4" lines, the "Plan 1 extension-seam
  proof" header, the "spec §2" citation; the type-scale derivation at
  `src/theme/theme.css:191-225` (keep about five lines carrying the two facts a re-skinner
  needs; move the derivation to `docs/internal/public-design-system.md`; the file's :1-40
  header is the re-skin recipe and stays); the `@component` blocks past the standard's
  length (purpose, contract, failure mode only); the `ec-*` residue the rename stepped over;
  the two stale 220-post comments (`src/chassis/archive.ts:7-9`, `svelte.config.js:39-46`)
  rewritten to the truth (the constant is fixture-sized and chassis-B re-derives it; the
  exception is the starter's small-corpus affordance), `templates/waymark` (regenerated)

- [ ] **Step 0:** read
  `docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`
  sections 3.1 to 3.6 and list every `file:line` they name; re-grep against post-C main for
  `ec-` residue and the pass vocabulary (internals-C's 3a and 3b swept `src/lib`, not the
  showcase).
- [ ] **Step 1:** rewrite per the internals-C partition (rationale survives, citation-only
  goes, process narration goes); `check:comments` green; re-emit; full gate; commit.

**Acceptance criteria:** zero pass, plan, spec, or task citations in `examples/showcase/src`;
no comment describes absent code; every `@component` block fits the standard; no `ec-`
residue; neither 220-post comment remains.

### Task 12: Records (last)

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md:109-121`
  (item 6 and the publish paragraph amended: one cut after polish; the chassis work is two
  passes), `docs/STATUS.md` (the stale "amended initiative design" wording), `ROADMAP.md`
  (the chassis improvement round: what shipped leaves the tier, the rest carried to chassis-B
  by name, including the archive proof, the entry row, and `createSectionAction`'s adoption;
  the `src/lib/components` Svelte lint wiring and the CSS format half filed to polish and
  chassis-B respectively), `docs/internal/engine-rulings.md` (verify Task 8 closed the three
  rows), `docs/internal/docs-friction-log.md` (whole-log triage), the chassis harvest banked
  under `docs/internal/record/2026-09-04-chassis-inputs/` (what the pass learned about the
  emitter, the bake, and the gates)

- [ ] **Step 1:** the amendments and the routing; `check:docs`; commit.

**Acceptance criteria:** the initiative design agrees with STATUS and ROADMAP on the release
ruling; no shipped item remains in a ROADMAP tier; chassis-B's inputs are named.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; reviewer fan-out: `svelte-reviewer` (Tasks 6, 7, 8, 10),
`web-auth-security-reviewer` (Task 4's exclusions, Task 7's route consolidation, Task 10's
custom-screen touch), `cloudflare-workers-reviewer` (Task 7), the standing
cleanliness-and-beauty review over the whole showcase tree at the exemplar bar (`daisyui-a11y-reviewer`
only if any admin surface changed, which none should); fix rounds per the chain discipline;
the six CI-only gates BY NAME plus `check:idioms` and `check:cm-internals`; from-scratch
showcase install, build, and e2e; a fresh scaffold from `templates/waymark` built,
format-checked, and unit-tested; whole-log friction triage; STATUS/HISTORY/ROADMAP;
post-mortem here; both budgets scored; push, PR, merge on green CI.

## What this pass hands forward

- **Chassis-B (next):** the archive proof (27 posts at page size 13, the pagination block and
  `/archive/2` baselined, `admin-office-*` regenerated, the posts written under the site
  content method since the showcase has no content guide of its own), the entry-row
  extraction and CSS de-duplication (recorded rank 6), the CSS format half, the 20 remaining
  focus rings, the shell and the five remaining primitives, site identity, CSS conformance,
  the width-matrix gaps, `createSectionAction` adoption if the docs keep teaching it,
  waymark's deliberate adaptation and final rebake, the harvest.
- **Polish:** the engine's own `src/lib/components` Svelte lint wiring; the chassis's
  single-theme identity as a boundary observation.
- **Consumer sites:** the trio replacement and the `ec-*` rename, per the `Consumers must:`
  lines, in each site's own pass.
- **Release:** the window holds; ONE cut after polish.
