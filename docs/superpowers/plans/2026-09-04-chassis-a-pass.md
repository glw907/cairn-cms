# Chassis-A Pass Implementation Plan (audit remediation, slice 8: the structural chassis pass)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via the chain-aware
> `pass-execute-chains.js` variant with ONE chain (the pass is sequential; see Execution).
> Steps use checkbox syntax for tracking. **Runs only after internals-C merges** (its Task 4
> renames the emitted `ec-*` classes and re-emits the template; this pass inherits `cairn-*`).
> Reconcile every anchor against post-C `main` at dispatch, and reconcile Task 10's
> `createSectionAction` conditional against internals-C's Task 10 output.

**Goal:** bring `examples/showcase`, the chassis every theme copy and the scaffold descend
from, to the exemplar bar structurally: the fixture job excluded from the emitted scaffold,
lint and format reaching the showcase, the monolith config split, dead code gone, the archive
proven, public routes single-sourced, the render trio re-homed per its rulings, the chassis's
pure logic unit-tested, the idioms one way, and the shipped comments in register.

**Architecture:** every task lands inside `examples/showcase`, `templates/waymark` (always
regenerated, never hand-edited), the emitter and bake scripts, the repo's gates, or the docs.
The one engine-surface change is the render trio's deletion (Task 8), executed as the three
retire rulings require: re-home, rebake, guide rewrite, and deletion in one change, with the
replacement code in the `Consumers must:` line. Rendered output does not change in this pass
except for one new baseline (`/archive/2`); every output-changing item is chassis-B's.

**Tech stack:** SvelteKit 2, Svelte 5, TypeScript, Prettier with `prettier-plugin-svelte`,
ESLint with `svelte-eslint-parser`/`eslint-plugin-svelte`, vitest, Playwright, the repo's
gate estate.

**Spec:** `docs/superpowers/specs/2026-09-04-chassis-passes-design.md` (revised after the
three-lens review); inputs and the review banked at
`docs/internal/record/2026-09-04-chassis-inputs/`; the recorded fourteen at
`docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`. Anchors verified
2026-09-04 against `main` at `5c6cf425` (pre-internals-C-merge; re-verify at dispatch).

**Token ceiling:** 6.5M (12 tasks; heavier gate than internals-C). **Checkpoint interval:**
every four tasks (checkpoints at 4, 8, 12). **Execution:** sequential in one worktree,
`.claude/worktrees/chassis-a` off post-C `main`, from-scratch showcase `npm install` before
the first gate; `templates/waymark` is the contended resource, so no parallel chains. At most
one other full gate may run on the machine concurrently.

## Ruled inputs (recorded; no task re-derives them)

- **The two organizing rules** (spec): the fixture job is excluded by path or marked by the
  `cairn-template:exclude-start`/`-end` idiom (`examples/showcase/wrangler.jsonc:44-55` is the
  worked example that keeps a stripped file whole); the exemplar uses the chassis it ships.
- **Prettier in the chassis only**, pinned: `printWidth: 100`, `singleQuote: true`,
  `useTabs: false`, `trailingComma: 'all'`, `prettier-plugin-svelte`. 68 of 100 showcase source
  files reformat at width 100; the reformat is this pass's FIRST commit and is reviewed as a
  mechanical change. Engine gates never depend on the scaffold's formatter; the engine's own
  `check:idioms` (internals-C Task 2) stays its only formatting enforcement.
- **The archive is proven by growing the corpus, and the exception stays.** Home paginates
  `entries.slice(1)` (`(site)/+page.server.ts:15`); the tag filter renders only when
  `pageEntries.length > TAG_FILTER_MIN_ENTRIES` (12) (`(site)/+page.svelte:16,94`). So
  `ARCHIVE_PAGE_SIZE` becomes 13 and the corpus grows from 14 to 27 posts: page one holds 13,
  the filter and the home baseline are unchanged, `/archive/2` exists. The
  `handleUnseenRoutes` exception (`svelte.config.js:47-50`) is the starter's affordance for a
  corpus that fits one page (`entries()` returns `[]` and SvelteKit's unseen-route check would
  fail the build); it stays, with its comment rewritten to that reason.
- **Render trio shape:** `headRow` re-homed as a chassis-local export; `cardShell` and
  `iconSpan` inlined at their single call sites; `/render` survives type-only
  (`ComponentContext`); the allowlist entry lives in `scripts/checks/reference-coverage.mjs`
  (`NARRATIVE_CONTEXT_ALLOWLIST`, about :601-610) under `check:reference`, pinned by
  `src/tests/unit/reference-coverage.test.ts:403,409`. Four production sites import at least
  two of the three (ecxc-ski, aksailingclub-org, xcathletes-org, cairn-pub).
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
- No rendered output changes except Task 6's new `/archive/2` baseline. A task whose diff
  changes any existing baseline stops and reports (that work is chassis-B's).
- Prose in comments, docs, and content: no em dashes; TSDoc and Svelte `@component`
  conventions; the showcase content guide for posts.
- Gate per task: `npm --prefix examples/showcase run format:check` (after Task 1), the
  showcase `check`, `test:unit` (after Task 9), and `test:e2e`; the engine's `npm run check`,
  `check:chassis-boundary`, `check:public-tokens`, `check:template`, `check:consumers`,
  `check:reference`, `check:docs`; `npm test` when engine code or tests change (Task 8).
  The six CI-only gates BY NAME at pass end plus `check:idioms` and `check:cm-internals`.

---

### Task 1: Prettier adoption and the tab fixes (the first commit)

**Files:**
- Create: `examples/showcase/.prettierrc` (or `prettier.config.js`), `examples/showcase/.prettierignore`
- Modify: `examples/showcase/package.json` (devDependencies `prettier`,
  `prettier-plugin-svelte`; scripts `format`, `format:check`), every showcase source file the
  reformat touches, `examples/showcase/playwright.config.ts` (tabs at :4-14), the three
  tab-indented e2e specs (`e2e/masthead-responsive.spec.ts`, `e2e/site-visual.spec.ts`,
  `e2e/theme-toggle.spec.ts`), `packages/create-cairn-site/scripts/bake-template.mjs` and its
  test (`bake-template.test.mjs:200,213` pin the pruned-script and field behavior; extend, do
  not weaken), `.github/workflows/create-site.yml` (the scaffold job runs `format:check`),
  `.github/workflows/test.yml` (the engine's job runs the showcase `format:check`)

**Interfaces:**
- Produces: `npm --prefix examples/showcase run format:check` as a gate every later task
  runs; the emitted scaffold carries the config and the scripts.

- [ ] **Step 1:** add the pinned config and the two scripts; install the two devDependencies;
  write `.prettierignore` covering the bake's generated files by name (the bake writes
  `README.md` from `SITE_README`, the dev shim from `DEV_SHIM`, and rewrites `package.json`;
  read `bake-template.mjs:21-84` and `emit-template.mjs:141` for the exact paths) so the
  emitted scaffold passes its own `format:check` without a bake-side formatter. Verify by
  emitting and running `format:check` inside a fresh `templates/waymark`.
- [ ] **Step 2:** run `format` once over `examples/showcase/{src,e2e,*.ts,*.js}`; fix the
  four tab-indented files if the formatter did not already; `git diff -w --stat` shows the
  whitespace-only nature for the tab files.
- [ ] **Step 3:** wire `format:check` into both workflows; re-emit; full gate; ONE commit
  whose subject says it is the mechanical reformat.

**Acceptance criteria:** `format:check` green on the showcase and on a fresh scaffold;
`check:template` green; no behavior change (the showcase e2e suite green unchanged; no
baseline changes); the commit is the first on the branch.

### Task 2: The comment gate reaches the showcase

**Files:**
- Modify: `eslint.config.js` (`COMMENT_GLOBS` at :33 gains `examples/showcase/src/**/*.ts`
  and `examples/showcase/e2e/**/*.ts`; a new Svelte block for
  `examples/showcase/src/**/*.svelte` using `svelte-eslint-parser` with the TypeScript
  sub-parser and `eslint-plugin-svelte`'s recommended flat config), `package.json` (`lint`
  at :67 and `scripts/checks/check-comments.sh:9` stop hardcoding `src/lib`: both take the
  showcase paths too), devDependencies (`svelte-eslint-parser`, `eslint-plugin-svelte`), the
  showcase comment sites the gate now flags

**Interfaces:**
- Produces: `npm run check:comments` covering `examples/showcase`; the engine's own
  `src/lib/components/*.svelte` stays unwired (filed to polish in Task 12).

- [ ] **Step 1:** wire both halves; run `check:comments`; record the finding count by
  directory in the task report before fixing anything.
- [ ] **Step 2:** fix the findings (TSDoc structure, `{type}` tags, paraphrase comments, em
  dashes) in the showcase `.ts` and `.svelte` files. Comment rewrites only; a comment that is
  wrong about the code is fixed by fixing the comment, and a real defect it reveals goes to
  the conductor. If the volume exceeds one task's scope, stop at a directory boundary, commit,
  and report the remaining directories as a named follow-on for the checkpoint.
- [ ] **Step 3:** `check:comments` green; re-emit; full gate; commit.

**Acceptance criteria:** the gate runs over the showcase in `lint` and `check:comments`; zero
findings, or the remainder named by directory; the engine's `src/lib` results unchanged; the
Svelte parser is scoped to the showcase.

### Task 3: Fixtures out of the scaffold

**Files:**
- Modify: `examples/showcase/.cairn-template.json` (exclude `src/routes/probe-craft` and
  `src/routes/(site)/+layout.server.ts`), `examples/showcase/README.md` (the fixture
  convention: what is excluded, what is marked, how a contributor adds a fixture),
  `docs/extend/what-the-scaffold-wrote.md` (:67 tree line and :153 public-routes row for
  `probe-craft/` removed), `.github/workflows/create-site.yml:105-106` (the leftover list gains
  `src/routes/probe-craft` and a grep asserting `siteLayoutSentinel` is absent from the
  scaffolded tree), `templates/waymark` (regenerated)

**Interfaces:** none new. The fixtures stay in the showcase: `e2e/preview.spec.ts:245-247`
keeps asserting `cairn-showcase-site-layout`, and the craft-chapter acceptance protocol keeps
driving `src/routes/probe-craft/` by path.

- [ ] **Step 1:** the exclusions; re-emit; confirm neither path exists under
  `templates/waymark` and that the scaffold builds without a `(site)/+layout.server.ts`.
- [ ] **Step 2:** the README convention; the doc edits; the CI assertions; full gate
  including a local run of the scaffold job's assertions; commit.

**Acceptance criteria:** `templates/waymark` contains neither fixture; the scaffold job's
assertions cover both by name; the showcase e2e suite green unchanged; `check:docs` green.

### Task 4: Dead code out

**Files:**
- Delete: `examples/showcase/src/theme/components/IntroLedger.svelte` (267 lines),
  `examples/showcase/src/theme/components/Carousel.svelte` (197 lines),
  `examples/showcase/scripts/reference-capture.mjs` (its header at :1-3 says "deleted after
  the pass")
- Modify: `docs/extend/what-the-scaffold-wrote.md:130` (stops describing the two components
  as registered), any import or doc that names them (grep `IntroLedger|Carousel|reference-capture`
  across the repo first; the recorded finding verified zero referrers in `src/` and `e2e/`),
  `templates/waymark` (regenerated)

- [ ] **Step 1:** the grep; the deletions; the doc line; re-emit; full gate; commit.

**Acceptance criteria:** zero references remain outside `docs/internal/history`,
`docs/internal/record`, and `docs/superpowers`; the scaffold builds; no baseline changes.

### Task 5: `cairn.config.ts` split

**Files:**
- Create: `examples/showcase/src/theme/icons.ts` (the icon set) and
  `examples/showcase/src/theme/components.ts` (the nine `defineComponent` declarations),
  each with a true header
- Modify: `examples/showcase/src/theme/cairn.config.ts` (526 lines to the adapter, concepts,
  backend, and `navLayout`, importing the two new modules; the `$theme` self-imports at :9-10
  become relative or stay `$theme` per the tree's convention, one way; the two-line header
  rewritten to describe the file), the chassis README's file table if it lists theme files,
  `docs/extend/what-the-scaffold-wrote.md` and `docs/extend/define-an-adapter-and-schema.md`
  where they describe the adapter file's contents, `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `icons` and the component list as named exports the adapter imports; every
  existing importer of `cairn.config.ts` compiles unchanged.

- [ ] **Step 1:** pure move: the render-pipeline snapshot and the showcase e2e suite must be
  byte-identical after the split. Move, wire, verify; headers; docs; re-emit; full gate;
  commit.

**Acceptance criteria:** the adapter file is under 200 lines and its header is true; the
snapshot and every baseline unchanged; `check:chassis-boundary` green.

### Task 6: Archive proven

**Files:**
- Create: 13 new posts under `examples/showcase/src/content/posts/`, written to the showcase
  content guide (dated across the existing range so the year grouping is exercised)
- Modify: `examples/showcase/src/chassis/archive.ts` (`ARCHIVE_PAGE_SIZE` 13; the :7-9
  derivation comment rewritten, no 220-post fixture exists), `examples/showcase/svelte.config.js:39-50`
  (the exception's comment rewritten to the small-corpus reason; the exception stays),
  `examples/showcase/e2e/site-visual.spec.ts` (`/archive/2` added to the width matrix; its
  baselines committed for the five viewports in both color schemes), `docs/reference/delivery.md`
  (the newest-first ordering for dated concepts documented as a contract, sourced from
  `src/lib/delivery/content-index.ts:139-140`), `examples/showcase/src/chassis/archive.ts:26-29`
  (`sortNewestFirst` removed) and its two call sites, `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** the posts and the constant; confirm `paginateArchive` yields `totalPages: 2`
  and the home page still shows 13 entries with the tag filter visible (`tag-filter.spec.ts`
  green unchanged).
- [ ] **Step 2:** the baselines for `/archive/2` (new baselines only; a diff on any existing
  baseline is a stop-and-report); the two comment rewrites; the ordering contract in
  `delivery.md` and the sort removal; re-emit; full gate; commit.

**Acceptance criteria:** `/archive/2` prerenders and is baselined; `tag-filter.spec.ts` and
every existing baseline unchanged; `sortNewestFirst` gone and the ordering documented;
neither stale 220-post comment remains.

### Task 7: Single-source public routes

**Files:**
- Modify: `examples/showcase/src/routes/(site)/[...path=md]/+server.ts:13-21` (consume the
  chassis `PublicRoutesConfig` from `src/chassis/public-routes.ts:11-25` instead of retyping
  seven of nine fields and dropping `defaultImage`/`feeds`),
  `examples/showcase/src/routes/feed.xml/+server.ts:11-13` and `feed.json/+server.ts:11-13`
  (the same duplication one level down), `templates/waymark` (regenerated)

- [ ] **Step 1:** one config source; the `.md` twin's output and both feeds byte-identical
  before and after (capture and diff them in the task); re-emit; full gate; commit.

**Acceptance criteria:** exactly one `PublicRoutesConfig` literal in the showcase; the three
handlers' outputs unchanged; e2e green.

### Task 8: Render trio re-homing (one change, per the rulings)

**Files:**
- Modify (showcase): `src/chassis/render.ts` (`headRow` becomes a local export beside
  `makeIconRenderer`; `iconSpan`'s one-`h()` body inlined into `makeIconRenderer` at :20; the
  `@glw907/cairn-cms/render` import goes), `src/theme/cairn.config.ts` (or the Task 5 module
  that now holds the `alert` component: `cardShell` inlined, `headRow` imported from
  `$chassis/render.js`), `src/chassis/README.md:102-105` (the component-grammar paragraph gains
  `headRow`) and `:190` (the removal table), `src/chassis/tokens.css:17` (the comment
  re-pointed), `templates/waymark` (regenerated)
- Modify (engine): `src/lib/render/rehype-dispatch.ts:20,29,39` (the three definitions
  deleted), `src/lib/render/authoring.ts:9` (the barrel line deleted; the header rewritten to
  say the subpath is type-only, exporting `ComponentContext`), `src/lib/index.ts:106` (the
  comment), `src/tests/unit/render-pipeline-snapshot.test.ts`, `render-rehype-dispatch.test.ts`,
  `render-exports.test.ts`, `reference-coverage.test.ts:276,403,409`,
  `scripts/checks/reference-coverage.mjs` (the `NARRATIVE_CONTEXT_ALLOWLIST` entry removed),
  `docs/reference/render.md:11,18-20` and `docs/reference/core.md:696-709` (the trio removed;
  `render.md` keeps the emitted class registry), `docs/extend/configure-rendering.md:49,57-58,84-85`
  (the worked example rewritten against plain `h()`), `docs/internal/api-surface.md`
  (`check:surface -- --update`), `CHANGELOG.md` (`## Unreleased`, `Consumers must:` naming the
  three removed exports, the chassis `render.ts` shape, the inline forms of `cardShell` and
  `iconSpan` verbatim, and the note that the emitted classes are `cairn-*` after internals-C),
  `docs/extend/migration-notes.md`, `docs/internal/engine-rulings.md` (the three rows closed
  with the seam-fit line)

**Interfaces:**
- Produces: `headRow` from `$chassis/render.js` with the signature it has today in the engine;
  the `/render` subpath exports only `ComponentContext`.

- [ ] **Step 1:** showcase side first, with the render-pipeline snapshot (engine side) and the
  showcase e2e suite proving the rendered markup is byte-identical.
- [ ] **Step 2:** engine deletion, tests, allowlist, surface regeneration, docs, changelog,
  migration note, ledger; re-emit; the full engine gate (`npm run check && npm test`) plus
  `check:reference`, `check:surface`, `check:snippets`, `check:consumers`; commit.

**Acceptance criteria:** `grep -rn "cardShell\|iconSpan" src/lib examples/showcase templates`
returns nothing, and `headRow` resolves only to the chassis; every gate named green; the
changelog line carries the replacement code; the three ledger rows read closed.

### Task 9: Showcase unit tests

**Files:**
- Create: `examples/showcase/vitest.config.ts` (standalone, node environment),
  `examples/showcase/src/chassis/archive.test.ts`, `date.test.ts`,
  `islands/banner-expiry.test.ts`, and a test per pure function Task 5 exposed, co-located
  with their modules
- Modify: `examples/showcase/package.json` (devDependency `vitest`; script `test:unit`),
  `.github/workflows/test.yml` (runs it), `packages/create-cairn-site/scripts/bake-template.test.mjs`
  only if the bake's assertions need the new script named, `templates/waymark` (regenerated;
  the tests ship)

**Interfaces:**
- Produces: `npm --prefix examples/showcase run test:unit`, in every later task's gate.

- [ ] **Step 1:** config, tests (table-driven where the input space is small: page
  boundaries, empty corpus, the year grouping, expiry at the boundary), wiring; re-emit; full
  gate; commit.

**Acceptance criteria:** every pure chassis function has a test; the scaffold's `test:unit`
runs green inside a fresh `templates/waymark`; `check:template` green.

### Task 10: Idiom conformance

**Files:**
- Modify: every `$chassis`/`$theme` import without `.js` (recorded rank 9 names
  `(site)/[...path]/+page.server.ts:3-4` against `(site)/preview/[token]/+page.server.ts:11-12`),
  `src/routes/test/last-commit/+server.ts:9` (typed `RequestHandler`) and
  `src/routes/(site)/archive/[page]/+page.server.ts:25` (one `error(404, ...)` idiom),
  `src/routes/admin/signups/+page.server.ts:32` (the `fail` literal onto the sanctioned
  shape, and the `createSectionAction` conditional: adopt it if internals-C's Task 10 left the
  docs teaching it, otherwise keep the raw shape and write one comment saying the docs demote
  it), the `src/chassis/*` modules missing the `// cairn-cms:` header prefix (2 of 12 carry it
  today), one showcase `+page.server.ts` hand-mounted against generated `./$types` (the
  foundations-B carry-forward: pick the custom-screen exemplar and type its load and actions
  from `./$types`), `templates/waymark` (regenerated)

- [ ] **Step 1:** enumerate at dispatch (the greps are the plan's anchors); apply; the
  `../../members` traversals stay, with one sentence in the README convention (Task 3's
  section) recording that they are fixture-only; re-emit; full gate; commit.

**Acceptance criteria:** zero bare `$chassis`/`$theme` specifiers; one handler idiom and one
error idiom in the tree; every chassis module headered; the hand-mount compiles against
generated types; the `createSectionAction` decision recorded either way.

### Task 11: Register purge of shipped exemplar comments

**Files:**
- Modify: the fourteen pass-and-plan citation sites the showcase review lists (3.1:
  `prose.css:2` "B2 deliverable", "B3 and B4 add", "the manual light/dark toggle is B4",
  "Plan 1 extension-seam proof", "spec §2"), the history-narration comments (3.2), the
  35-line derivation narrative in `src/theme/theme.css` (3.3), the `cairn-cms:` header fork
  (3.4, folded with Task 10 where the same file is touched), the 46-line `@component` blocks
  (3.5: purpose, contract, failure mode only), the `ec-*` residue the rename stepped over
  (3.6), `templates/waymark` (regenerated)

- [ ] **Step 1:** enumerate against post-C main (internals-C's 3a/3b swept `src/lib`, not the
  showcase, and its Task 4 renamed classes, so re-grep for `ec-` residue and the pass
  vocabulary); rewrite per the internals-C partition (rationale survives, citation-only goes,
  process narration goes); `check:comments` green; re-emit; full gate; commit.

**Acceptance criteria:** zero pass, plan, spec, or task citations in `examples/showcase/src`;
no comment describes absent code; every `@component` block fits the standard; no `ec-`
residue.

### Task 12: Records (last)

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md:109-121`
  (item 6 and the publish paragraph amended: one cut after polish; the chassis work is two
  passes), `docs/STATUS.md` (the stale "amended initiative design" wording), `ROADMAP.md`
  (the chassis improvement round: what shipped leaves the tier, the rest carried to chassis-B
  by name; the `src/lib/components` Svelte lint wiring filed to polish), `docs/internal/engine-rulings.md`
  (verify Task 8 closed the three rows), `docs/internal/docs-friction-log.md` (whole-log
  triage), the chassis harvest banked under `docs/internal/record/2026-09-04-chassis-inputs/`
  (what the pass learned about the emitter, the bake, and the gates)

- [ ] **Step 1:** the amendments and the routing; `check:docs`; commit.

**Acceptance criteria:** the initiative design agrees with STATUS and ROADMAP on the release
ruling; no shipped item remains in a ROADMAP tier; chassis-B's inputs are named.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff; reviewer fan-out: `svelte-reviewer` (Tasks 5, 7, 8, 10),
`daisyui-a11y-reviewer` (no admin surface changes expected; confirm), `web-auth-security-reviewer`
(Task 3's exclusions and Task 7's route consolidation), `cloudflare-workers-reviewer` (Task 7),
the standing cleanliness-and-beauty review over the whole showcase tree at the exemplar bar;
fix rounds per the chain discipline; the six CI-only gates BY NAME plus `check:idioms` and
`check:cm-internals`; from-scratch showcase install, build, and e2e; a fresh scaffold from
`templates/waymark` built and format-checked; whole-log friction triage; STATUS/HISTORY/
ROADMAP; post-mortem here; both budgets scored; push, PR, merge on green CI.

## What this pass hands forward

- **Chassis-B (next):** the entry-row extraction and CSS de-duplication (recorded rank 6),
  the 20 remaining focus rings, the shell and the five remaining primitives, site identity,
  CSS conformance, the width-matrix gaps, waymark's deliberate adaptation and final rebake,
  the harvest.
- **Polish:** the engine's own `src/lib/components` Svelte lint wiring; the chassis's
  single-theme identity as a boundary observation.
- **Consumer sites:** the trio replacement and the `ec-*` rename, per the `Consumers must:`
  lines, in each site's own pass.
- **Release:** the window holds; ONE cut after polish.
