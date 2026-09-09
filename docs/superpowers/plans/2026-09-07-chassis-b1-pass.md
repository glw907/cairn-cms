# Chassis-B1 Pass Implementation Plan (audit remediation, slice 9a: the exemplar adopts its chassis)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential; see Execution).
> Steps use checkbox syntax for tracking. **Runs only after chassis-A merges.** Folded
> 2026-09-07 from the four-lens adversarial review of the single chassis-B draft (record:
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-plan-review.md`, the fold brief
> `chassis-b-fold-brief.md`, the superseded draft `chassis-b-plan-draft-1.md`); the split at
> the old Task 6/7 boundary is the review's sizing verdict. Every anchor is re-verified at
> dispatch against post-A `main` (the Reconciliation block below names each A dependency).
> The second half is `2026-09-07-chassis-b2-pass.md`.

**Goal:** the showcase, the chassis every theme copy and the scaffold descend from, USES the
chassis it ships: every public surface in the width matrix, the site shell and the five
composition primitives adopted and baselined, one focus ring, and the entry row written once.

**Architecture:** every task lands inside `examples/showcase`, `templates/waymark` (always
regenerated, never hand-edited), the e2e suites, or the docs. No engine runtime code and no
public export changes; `check:surface` unchanged. **Rendered output changes by design**, so
the `visual-fidelity` method governs with the adaptations a changed-by-design pass needs: the
pass's before set is banked at the branch point; every paint task appends its rows to a
committed intended-moves manifest and produces (never asserts) its moved-baseline list; the
`diff-reviewer` reads named tiles per task; the fresh-context `visual-verifier` grades the
whole surface set at pass end with an adapted verdict vocabulary in a bounded loop; the
conductor's one-check read is a named ritual line; Geoff's five-viewport read is from committed
contact sheets and is the merge gate.

**Tech stack:** SvelteKit 2, Svelte 5, TypeScript, Prettier with `prettier-plugin-svelte`,
vitest, Playwright (baselines CI-canonical via `e2e.yml`'s `update_snapshots` dispatch),
ImageMagick (`magick compare`, `magick montage`; installed), the repo's gate estate.

**Spec:** `docs/superpowers/specs/2026-09-04-chassis-passes-design.md`, section "Chassis-B"
(amended 2026-09-07 from the fold brief's section 4); the fresh review it cites is
`docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`.

**Token ceiling:** 6M (8 tasks at about 0.63M non-image each, plus about 0.2M of per-task tile
reads and about 0.5M for the pass-end verifier over five surfaces; one image read is assumed at
about 1.6k tokens, a grading agent's prose multiplies it by about 1.5). Tasks 4 and 5 are the
two expected to exceed 0.7M; their split points are pre-agreed below. **Checkpoint interval:**
every four tasks (checkpoints at 4 and 8). At each checkpoint, at any split, and before any
question to Geoff, the conductor writes STATUS (task ledger, decisions taken, spend against the
ceiling, next task), then continues. **Execution:** sequential in one worktree,
`.claude/worktrees/chassis-b` off post-A `main`, from-scratch showcase `npm install` before the
first gate; the committed baselines and `templates/waymark` are the contended resources, so no
parallel chains. At most one other full gate may run on the machine concurrently. Full guard
set armed at launch. **Open the PR immediately after Task 1's first commit**: `e2e.yml` runs on
`push` only for `main` and `rebuild`, so only a `pull_request` run gives every later push CI
evidence. A CI baseline regen suspends the chain: the implementer commits, the CONDUCTOR pushes,
dispatches `gh workflow run e2e.yml --ref chassis-b -f update_snapshots=true`, waits, pulls,
and only then dispatches the next task. Every paint task's `criteria` string in the chain args
carries, verbatim, its acceptance criteria, the capture root, the reviewer's tile instruction
("Read the tiles named in the report's `READ ME:` line, at most twelve, and verify the report's
`INTENDED MOVES:` list equals its `MOVED BASELINES:` list name for name"), and the
stop-and-report rule; the conductor writes those strings when it assembles the chain, since the
reviewer never reads the plan file.

## Reconciliation at dispatch (chassis-A dependencies)

1. The ring count: re-derived by Task 5's own grep, never taken from the spec's "20".
2. The `// prettier-ignore` pin above `backend:` in `cairn.config.ts` (A's `de93536c`): A Task 6
   split that file; confirm the pin travelled and still guards the one-line literal
   `packages/create-cairn-site/src/github/finalize.mjs` matches byte-for-byte.
3. `scripts/reference-capture.mjs`: A Task 5 deleted it; Task 1 derives the capture tool from
   its last committed version (`git show 274374f2^:examples/showcase/scripts/reference-capture.mjs`).
4. A Task 4 excluded `(site)/+layout.server.ts` from the scaffold; it is a fixture and gains no
   product wiring (B2's identity task uses the root layout server).
5. The `.js` specifier sweep (A Task 10): A's grep `from '\$chassis/[a-z-]*'` cannot match
   `$theme/cairn.config` (the dot is outside the class), so up to five bare sites may survive A;
   the chassis-A pass-end ritual checks them, and any survivor is closed in B2's identity task.
6. `siteMeta` (A Task 7, `$chassis/content.ts`): B2's identity task reads the site name from it.
7. A Task 11 rewrote the type-scale derivation and the two stale 220-post comments; B2's
   archive and CSS tasks rewrite them again and own the final wording.

## Ruled inputs (recorded; no task re-derives them)

- **The two organizing rules** (spec): the fixture job is excluded by path or marked; the
  exemplar uses the chassis it ships. Every adoption is a real site use, with one sanctioned
  exception, the styleguide's composition section, which is what a styleguide is for.
- **The site shell is paint-neutral.** `.cairn-site-shell`/`.cairn-site-main` replace the
  hand-rolled flex column on both pages; `main` keeps `(site)`'s `tabindex="-1"`; from
  `.site-main` only the `width: 100%` and `min-width: 0` declarations and the comment above
  them go (they become the chassis pair's job), while `max-width`, `margin-inline`, and
  `padding` stay, since eighteen `.site-main`-scoped figure and breakout rules measure against
  them.
- **Primitive call sites, with the paint each adoption moves, stated in numbers.**
  `.cairn-hero` with `-title`/`-lead` on the styleguide masthead (its scoped hero styles
  deleted; the masthead rhythm may shift by the hero gap, `--spacing-s`). `.cairn-section` on
  the home page's `.lead` and `.index`: `.index` carries no box geometry today, so adoption is
  pure addition, `margin-block: var(--cairn-section-gap)` (`--spacing-l`) plus a `> * + *` gap
  between `.index__head` and every year group; on `.lead` it adds a top margin and swaps a
  non-collapsing `padding-bottom` for a collapsible `margin-block-end`. These two are the
  adoptions expected to trip the redesign rule; the implementer applies them, enumerates the
  numbers, and the reviewer judges whether the home page still reads as the same design
  (a visible redesign is reported, not forced). `.cairn-band` on the root error page's message
  block (a full-bleed strip with the centered container as its child; the 404 gains the band
  ground, `--color-base-200`). `.cairn-card`: this theme has no real site use for it (the
  members pages are template-excluded fixtures and the home lead is not a card), so it is
  proven on the styleguide composition section only and that fact is a chassis harvest item.
  `.cairn-sidebar-layout`: the article has no sidebar-shaped region (`related` renders as a
  block in the reading flow), so it too is proven on the styleguide section only; an article
  rail would be a design change, not an adoption.
- **The focus-ring primitive is a token trio plus one utility.** `tokens.css` defines
  `--cairn-focus-ring-outline` (`2px solid var(--color-primary)`), `--cairn-focus-ring-offset`
  (`2px`), and `--cairn-focus-ring-radius` (`2px`, moved down from `theme.css`, which may
  override it). The theme's own markup reaches a `cairn-focus-ring` utility declared with
  Tailwind v4 `@utility` at a stylesheet's TOP LEVEL (Tailwind requires it there, and
  `composition.css` wraps its whole body in `@layer components`): it goes in `tokens.css`
  outside its own `@layer components` block; if that fails to compile, the fallback is a plain
  `.cairn-focus-ring:focus-visible` rule in `composition.css`, and `tokens.css` wins any tie.
  `prose.css`'s six directive sites, whose markup the engine fixes, read the two tokens in
  place. Paint identical to today's ring.
- **Baselines are CI-canonical.** Per task, the implementer regenerates the moved baselines
  locally with the mode pinned, `CI=1 npx playwright test e2e/site-visual.spec.ts
  --update-snapshots=changed`, by FILE PATH inside `examples/showcase` (the bare flag's default
  has changed across Playwright releases and `all` would rewrite every baseline with a
  workstation render; Task 1 verifies the installed Playwright accepts `=changed` and reports
  the version, else regenerates by deleting only the named files and re-running, and says so).
  Locally regenerated baselines are provisional: the CI regen's diff over them is READ, and any
  surface whose CI image differs from the committed local one is named in the report. CI regens
  happen after Task 2 (the new surfaces) and at pass end, each a conductor checkpoint action.
- **The moved-baseline list is produced, not asserted.** Before any regeneration the
  implementer runs the visual suites unmodified (`CI=1 npx playwright test
  e2e/site-visual.spec.ts e2e/admin-visual.spec.ts`) and pastes the exact FAILING snapshot
  names into the report under `MOVED BASELINES:`; for surfaces not yet baselined the instrument
  is `magick compare -metric AE before.png after.png null:` per tile, reported as `TILE DIFF:`.
- **The site-visual baseline count is 31** (thirty in the matrix plus
  `site-article-light-1920`, the clamp-slope test's own); the capture tool covers 1920 for the
  article so that baseline has a before too.
- **Release:** ONE cut after polish; this pass does not bump or publish.

## Global constraints

- Every task that changes an emitted file ends with `npm run emit:template` and commits the
  regenerated `templates/waymark` in the same commit; `check:template` green per task.
- `check:surface` unchanged; no engine runtime code or public export changes. The one engine
  script this pass touches is none; B2 touches `check-public-tokens.mjs` under its own stated
  amendment.
- **Capture directories are pinned:** the PASS before set at
  `~/.cache/cairn-chassis-b/pass/before/`, captured once by Task 1 at the branch point, the
  verifier's reference; each task's before set at `~/.cache/cairn-chassis-b/task-<N>/before/`
  (captured at the START of the task on the clean worktree at the task's parent commit; a task
  whose predecessors moved no paint may symlink the pass set and say so) and its after set at
  `~/.cache/cairn-chassis-b/task-<N>/after/`, the reviewer's reference. Every directory is
  write-once: the tool refuses a non-empty target and the implementer reports the collision.
- **Images are tiles.** The capture tool writes both `full/<surface>-<scheme>-<width>.png`
  (the archival, Playwright-comparable file) and `tiles/<surface>-<scheme>-<width>-<nn>.png`
  (bands of at most 1400 CSS px with a 60 px overlap, numbered from the top) plus a
  `manifest.json` (file, surface, scheme, width, tile index, pixel size, sha256). A grader reads
  TILES, never a full-page file, and every dispatch that hands a grader images names tile
  paths, never a directory.
- **The intended-moves manifest is a committed file**,
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md`, created by
  Task 1 with the before-set inventory (surface, width, scheme, the `.missing` entries, the
  commit sha each capture came from) and appended by every paint task in the same commit as
  its change: surface, width, scheme, what moves, why, and the baseline names it moves. The
  verifier reads this file, never the task reports. A task that moves a baseline without
  appending its row is a blocking finding at the diff gate. STATUS's resume prompt names this
  file as the recovery artifact.
- **`.missing` semantics.** In the BEFORE set it means the surface is new in this pass and is
  graded on its own against the five-viewport standard at 320 and 2560 in both schemes
  (`NEW: composed | NEW: unbroken-only | NEW: broken`); in an AFTER set it is always a
  stop-and-report. Task 1 lists the before-set markers by name; Task 8 confirms every one is
  gone from the final after set or says why.
- **The report contract.** Every paint task's implementer `summary` carries, verbatim and in
  order: `CAPTURES:` / `INTENDED MOVES:` (one `surface width scheme: what moves` per line) /
  `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at most twelve tile paths). The reviewer's
  summary names each tile it read.
- **Screenshot budget per task:** twelve tiles for the reviewer. The pass-end verifier grades
  five surfaces (home, article, styleguide, error404, signups) at five widths in two schemes,
  one above-the-fold tile each plus the tiles the manifest's rows name, before and after.
- **Paint-neutral tasks (2, 3, 5, 6) prove it at the floor-free level:** every baseline
  unchanged AND `magick compare -metric AE` = 0 for every before/after tile of every touched
  surface, reported per tile; a non-zero count is enumerated and justified or it is a
  stop-and-report (the 120 px floor is blind to a 2 px ring).
- Prose in comments and docs: no em dashes, no ruling or pass citations in shipped comments;
  TSDoc and Svelte `@component` conventions; `check:comments` covers the showcase.
- Gate per task: `npm --prefix examples/showcase run format:check`, the showcase `check`,
  `test:unit`, and `CI=1 test:e2e`; the engine's `npm run check`, `check:chassis-boundary`,
  `check:public-tokens`, `check:template`, `check:consumers`, `check:reference`, `check:docs`,
  `check:comments`; `npm --prefix packages/create-cairn-site run prepack && npm --prefix
  packages/create-cairn-site test` green with the collected count recorded (chassis-A's
  omission). Never reflow the `// prettier-ignore` line above `backend:` in `cairn.config.ts`.

---

### Task 1: The capture tool, the before set, and the CSS format half (two commits)

**Files:**
- Create: `examples/showcase/scripts/capture-surfaces.mjs` (under the template-excluded
  `scripts/`; derives from the last committed `scripts/reference-capture.mjs`, which already
  solved the server recipe and the theme cookie: reuse its `newPage`/`shot` shape; starts the
  server with the EXACT `playwright.config.ts` webServer recipe, `VITE_CAIRN_E2E=1 npm run
  build` then `npm run preview -- --port 4173` with `CAIRN_DEV_BACKEND=1`, never a default
  build, which folds the dev backend out and would write `.missing` for every `/admin`
  surface; surfaces `home` `/`, `article` `/posts/the-reading-surface` (plus 1920 light),
  `styleguide` `/styleguide`, `archive2` `/archive/2`, `error404` an unmatched path, `signups`
  `/admin/signups` (no session helper exists or is needed: the dev handle mints the owner;
  the admin scheme is the `cairn-admin-theme` cookie, `cairn-admin`/`cairn-admin-dark`, set
  together with `emulateMedia`; public surfaces use `emulateMedia` alone); widths
  `320 390 768 1440 2560` in `light` and `dark`; a `--only` list, a `--focus <selector>` mode
  that tabs to and captures a focused control; full files, tiles, and the manifest per the
  global constraint; a `.missing` file per surface that does not render; refuses a non-empty
  output dir; a header comment block recording which surfaces render under `vite preview`,
  which need a different server, and why, written from what Step 2 finds),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` (the
  before-set inventory)
- Modify: `examples/showcase/.prettierignore` (all THREE CSS lines removed: `*.css`,
  `src/chassis/*.css`, `src/theme/*.css`), `examples/showcase/package.json` (the shared
  `format`/`format:check` target set gains `src/**/*.css`), the three CSS files Prettier
  reflows (`src/chassis/prose.css`, `src/chassis/tokens.css`, `src/theme/theme.css`;
  `composition.css`, `site.css`, and `probe-craft.css` are already clean), `templates/waymark`
  (regenerated)

**Interfaces:**
- Produces: `node scripts/capture-surfaces.mjs --out <dir> [--only a,b] [--focus <sel>]`,
  consumed by every later task and the verifier; the CSS format in every later gate; the
  intended-moves manifest.

- [ ] **Step 1 (commit 1, the tool):** derive, build, and run the tool once into a scratch dir
  to prove every surface writes either files or a `.missing`; verify the installed Playwright
  accepts `--update-snapshots=changed` and record the version in the report; commit the tool.
- [ ] **Step 2 (the before set):** on the untouched tree, capture into
  `~/.cache/cairn-chassis-b/pass/before/`; write the inventory into the manifest file with the
  head sha; record every `.missing` by name (`/archive/2` at page size 50 is the ONE known
  expectation; whether the 404 renders under `vite preview` is a finding, not an assumption,
  and goes in the tool's header comment either way); commit the manifest with the tool's
  header update.
- [ ] **Step 3 (commit 2, the mechanical reformat):** the ignore and target-set edits; run
  `format`; `git diff -w --stat` on the three files shows only Prettier's own value-preserving
  normalization (trailing zeros stripped from numbers, multi-value declarations split across
  lines); the CSS quote style is pinned to double quotes by a `.prettierrc` override for `*.css`
  so `check-public-tokens.mjs` stays untouched (ruled 2026-09-08 at the Task 1 escalation:
  the engine script is B2's); `check:public-tokens`
  and `check:chassis-boundary` green (both read these files); the visual suite green with
  every baseline unchanged (a reformat that moves paint stops and reports the file);
  re-emit; full gate; commit with a subject naming it the mechanical CSS reformat.

**Acceptance criteria:** the tool exists with the availability header; the pass before set
exists with its `.missing` files named in the manifest; the three CSS files differ from their
parents by whitespace and Prettier's numeric normalization only, quote style pinned; no engine
script touched; `format:check` covers CSS and is green; every baseline unchanged;
two commits; `check:template` green.

### Task 2: Width matrix coverage (early, so every adoption has a before)

**Files:**
- Modify: `examples/showcase/e2e/site-visual.spec.ts` (`error404` joins the width loop at
  five widths in both schemes; `archive2` is B2's), `examples/showcase/e2e/admin-visual.spec.ts`
  (`signups` `/admin/signups` at the five widths in both schemes through the theme cookie),
  `docs/internal/public-design-system.md` (the "Vertical alignment mechanics" section gains one
  sentence: the public corpus measured zero rows above the 2 px bar in 2026-08, no numeric
  compensation test exists for that reason, and the trigger for writing one is the first public
  row that fails a read, in the shape of the admin's `vertical-alignment-recipes.test.ts`),
  `examples/showcase/playwright.config.ts` only if the 404 needs a second webServer (see Step 1)

**Interfaces:**
- Consumes: `scripts/capture-surfaces.mjs` (Task 1) and its header's 404 finding.

- [ ] **Step 1:** read the tool's header. If the root `+error.svelte` renders under `vite
  preview` for an unmatched path, baseline it; if not, either add the `wrangler dev` default-404
  SSR as a second webServer with its cost recorded, or report the recipe that cannot render it
  and carry the 404 to polish by name. The decision with its evidence is the deliverable.
- [ ] **Step 2:** the two spec additions; new baselines regenerated locally by file path; the
  doc sentence; full gate; commit. The conductor then runs the CI regen, waits, pulls, and
  reads the CI diff over the local PNGs.

**Acceptance criteria:** `error404` and `signups` baselined at five widths in both schemes,
or the 404 carried with evidence; no alignment spec added; the doc sentence present; e2e
green; the CI regen's diff over the local baselines read and reported.

### Task 3: The shell from the chassis

**Files:**
- Modify: `examples/showcase/src/routes/(site)/+layout.svelte` (the wrapper becomes
  `cairn-site-shell site-shell bg-base-100 font-body text-base-content`; `main` becomes
  `cairn-site-main site-main` and keeps `tabindex="-1"`), `src/routes/+error.svelte` (the same
  two lines), `src/theme/site.css` (per the ruled input's deletion boundary),
  `src/chassis/README.md` (the gotcha prose collapses to one sentence pointing at
  `composition.css`; the removal table's `composition.css` row and line `:196` stop saying
  nothing uses the shell pair and drop the AstroPaper aside), `src/chassis/composition.css`
  (its header's "Nothing in the showcase's current markup uses any of these yet" becomes
  true-after-this-pass wording), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** task before set (or symlink); the markup and CSS edits; the footer-pin
  geometry test and the whole visual suite green; after set; `magick compare` = 0 on every
  tile of home, article, styleguide, error404.
- [ ] **Step 2:** the README and header prose; `grep -rn "cross axis\|cross-axis"
  examples/showcase/src` returns only `composition.css`; re-emit; full gate; commit.

**Acceptance criteria:** both pages use the chassis pair; `tabindex="-1"` preserved; the
gotcha explained once; every baseline unchanged and every tile at AE 0; `check:docs` green.

### Task 4: The five composition primitives (pre-agreed split: 4a site adoptions, 4b styleguide section)

**Files:**
- Modify (4a): `src/routes/(site)/styleguide/+page.svelte` (the masthead on `.cairn-hero`
  with `-title`/`-lead`, its scoped hero styles deleted), `src/routes/(site)/+page.svelte`
  (`.cairn-section` on `.lead` and `.index`), `src/routes/+error.svelte` (the message block on
  `.cairn-band`), `src/chassis/README.md` (the removal table names the adopters),
  `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-intended-moves.md` (the rows),
  `templates/waymark` (regenerated)
- Modify (4b): `src/routes/(site)/styleguide/+page.svelte` (a "Composition" section
  demonstrating `.cairn-card`, `.cairn-band`, `.cairn-section`, and `.cairn-sidebar-layout`
  with two-sentence captions in the styleguide's existing section register), the manifest,
  `templates/waymark` (regenerated)

**Interfaces:**
- Consumes: `scripts/capture-surfaces.mjs` (Task 1).

- [ ] **Step 1 (4a):** task before set; the three adoptions; after set; `INTENDED MOVES:` in
  numbers per the ruled input (the section gap on the home page at each width, the hero gap on
  the styleguide masthead, the band ground on the 404); `MOVED BASELINES:` produced by the
  unmodified suite run; the two lists equal name for name; the manifest rows appended;
  regenerate by file path; re-emit; full gate; commit. If the reviewer judges the home page a
  visible redesign, the `.cairn-section` adoption is reverted on that surface and the reason
  recorded in the manifest.
- [ ] **Step 2 (4b):** the composition section; captures at 320 and 2560 in both schemes with
  the tile paths named and NO composition claim (the verifier judges composition); the
  styleguide baselines regenerated; the manifest rows; re-emit; full gate; commit.

**Acceptance criteria:** hero, section, and band at real sites; card and sidebar-layout on
the styleguide section; the report's `INTENDED MOVES:` equals `MOVED BASELINES:`; the
manifest carries every row; the reviewer names each tile read.

### Task 5: One focus ring (pre-agreed split point: prose.css and tokens first, theme sweep second)

**Files:**
- Modify: `src/chassis/tokens.css` (the three tokens and the `@utility` per the ruled input),
  `src/chassis/composition.css` (only on the fallback), `src/theme/theme.css` (its
  `--cairn-focus-ring-radius` line deleted or kept as an override with a comment),
  `src/chassis/prose.css` (six `:focus-visible` rules read the tokens), every theme and route
  `:focus-visible` rule that hand-writes the ring (enumerate with `grep -rn "outline: 2px
  solid var(--color-primary)" examples/showcase/src`; re-count at dispatch), each replaced by
  the utility on the element or, for descendant selectors such as `.site-nav a`, by the token
  pair, `e2e/site-visual.spec.ts` (the focus assertion becomes a loop over home, article, and
  styleguide: `page.keyboard.press('Tab')` three times per page, asserting a non-`none` computed
  `outline-style` and the token-resolved `outline-offset` on each focused element),
  `docs/internal/public-design-system.md` (the focus-ring device names its one source),
  `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset`,
  `--cairn-focus-ring-radius` from `tokens.css`; the `cairn-focus-ring` utility, consumed by
  Task 6.

- [ ] **Step 1:** the tokens, the utility, `prose.css`, and `theme.css`; `check:public-tokens`
  green with the new tokens resolved; commit.
- [ ] **Step 2:** the sweep; the grep returns nothing; the focus-loop spec green; focused tiles
  via `--focus` for the first control on home, article, and styleguide in both schemes at 390
  and 1440, paths named and no fidelity claim; every baseline unchanged and every tile at AE 0
  (focus states are not in the baselines); re-emit; full gate; commit.

**Acceptance criteria:** zero hand-written rings; one token trio and one utility; the
theme-only radius token is a chassis default; the focus-loop spec green; the focused tiles
named; every baseline unchanged.

### Task 6: The entry row once

**Files:**
- Create: `src/theme/components/EntryRow.svelte` (`<article class="site-entry">` with
  `site-entry--undated`, `site-entry__date`, `site-entry__title`, `site-entry__excerpt`, the
  `data-cairn-post` hook kept; `.site-entry*` styles and the `@media (max-width: 34rem)` block
  move in; the title link on `cairn-focus-ring`; an `@component` block of purpose, contract,
  failure mode)
- Modify: `src/routes/(site)/+page.svelte` and `src/routes/(site)/archive/[page]/+page.svelte`
  (the three `<article class="entry">` blocks replaced by the component; only the `.entry*`
  rules leave their `<style>` blocks, while `.pagination*` and `.index__*` stay on their
  pages), any e2e selector reading `.entry` (grep `e2e/`; `data-cairn-post` is the stable
  hook), `templates/waymark` (regenerated)

**Interfaces:**
- Consumes: the `cairn-focus-ring` utility (Task 5).
- Produces: `EntryRow` with the single prop `post: ContentSummary`.

- [ ] **Step 1:** task before set; the component and the three call sites; `grep -n
  'pagination__link' examples/showcase/src/routes` still returns both pages; after set; every
  baseline unchanged and every tile of home and article at AE 0; re-emit; full gate; commit.

**Acceptance criteria:** one entry markup and one stylesheet; `grep -rn 'class="entry'
examples/showcase/src` returns nothing; the whole `entry` family renamed under `site-*`;
pagination and index rules untouched; every baseline unchanged.

### Task 7: Records for B1 and the hand-off to B2

**Files:**
- Create: `docs/internal/record/2026-09-04-chassis-inputs/chassis-b1-harvest.md` (what the
  pass learned about the primitives, the capture tool, the tile protocol, the preview 404,
  the baseline regen loop; the `.cairn-card` no-real-use fact; the second-menu editing
  question is B2's), `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-contact-sheets/<surface>.png`
  (per changed surface: before tile beside after tile per width with the manifest's caption,
  composed with `magick montage`; a dark sheet for any surface whose dark render moved)
- Modify: `.github/workflows/e2e.yml` (the `update_snapshots` input description says
  "Regenerate the admin-visual and site-visual baselines instead of asserting against them"),
  `ROADMAP.md` (B1's items leave the tier; B2's remain by name), `docs/STATUS.md` (only stale
  wording), `CHANGELOG.md` (`## Unreleased`: the scaffold's changes, the focus-ring tokens and
  utility, `EntryRow`; no `Consumers must:`), `docs/extend/migration-notes.md` (the same as
  behavior a scaffolded-site owner meets), `docs/internal/docs-friction-log.md` (whole-log
  triage), the manifest (the `.missing` reconciliation line)

- [ ] **Step 1:** the amendments, the sheets, the routing; `check:docs`, `check:rulings-format`,
  `check:vale`; commit.

**Acceptance criteria:** the sheets exist for every changed surface; the workflow description
true; no shipped item remains in a ROADMAP tier; the changelog and migration entries present;
the friction log triaged; the harvest banked.

### Task 8: (reserved) fix rounds from the pass-end verifier

Not a dispatchable task at authoring time; the slot exists so the checkpoint at 8 and the
ceiling arithmetic account for the verifier loop's fix dispatch.

## Pass-end ritual (cairn-pass; not a numbered task), in this order

1. Code-simplifier over the pass diff.
2. The CI baseline regen (conductor), pull, and READ the CI diff over the committed local
   baselines; name any surface that differs.
3. Capture the pass after set from the pulled head into `~/.cache/cairn-chassis-b/pass/after/`.
4. The fresh-context `visual-verifier`, dispatched with an ADAPTED vocabulary stated in the
   dispatch and three inputs (before tiles, after tiles, the committed intended-moves
   manifest): per surface and width one of INTENDED-AND-CORRECT / INTENDED-BUT-WRONG /
   UNINTENDED (STRUCTURAL or COSMETIC) / UNCHANGED, plus `COMPOSED | UNBROKEN-ONLY | BROKEN`
   for every surface new to the matrix (`UNBROKEN-ONLY` is a FAIL for a surface this pass
   adds); the contrast probe is MANDATORY and named in the dispatch (this pass changes a band
   ground, a card recipe, and the focus ring). The loop is bounded: verify, fix, FRESH verify;
   a second FAIL is the conductor's decision.
5. **The one-check read (the conductor's one sanctioned image read):** after PASS and before
   the PR, the conductor reads each changed surface's after tiles at 320 and 2560, light, one
   screenful each, from the contact sheets. Bounded, named, never a diff read.
6. Reviewer fan-out: `svelte-reviewer` (Tasks 3, 4, 6), `daisyui-a11y-reviewer` (Tasks 2, 4,
   5: no regression on the 404, the band, the focus ring), the standing cleanliness-and-beauty
   read over the showcase tree; fix rounds per the chain discipline.
7. The gates BY NAME: the six CI-only ones, `check:comments`, `check:reference:signatures`,
   `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`; the four doc gates
   `check:package`, `check:reference`, `check:reference:signatures`, `check:docs`; plus
   `check:idioms` and `check:cm-internals`; from-scratch showcase install, build, and e2e; a
   fresh scaffold built, format-checked, and unit-tested. The live admin smoke is substituted
   by the dev-backend e2e build here because no `/admin` engine code changes; say so in the
   post-mortem.
8. STATUS/HISTORY/ROADMAP; the post-mortem here; both budgets scored.
9. The PR body links each contact sheet by its `raw.githubusercontent.com` URL under the
   branch, lists the surfaces that did not move, and carries the verifier verdict inline, so
   Geoff's read is one page per changed surface. **Geoff merges.**
10. Pre-bake the context clear; B2 is the next plan (already drafted) and its anchor pass runs
    against post-B1 `main`.

## What this pass hands forward

- **B2:** the corpus, the archive proof, identity, the footer-nav decision, CSS conformance,
  the small idioms, waymark's adaptation, its records; the `archive2` surface and the third CI
  regen; the `.js` specifier survivors if any.
- **Polish:** the `createSectionAction` adoption in `admin/signups`, deferred because the
  showcase declares no access map and `packages/cairn-cms-dev/src/handle.ts` never attaches
  `locals.cairnAccess`, so the adoption needs a dev-package seam that attaches the map and
  selects a role (an engine consultation item), landing only with an access map admitting the
  same role set as today's `requireOwner`; the engine's `src/lib/components` Svelte lint wiring;
  the single-theme identity observation; the 404 if Task 2 carried it.
- **Consumer sites:** the focus-ring tokens, `EntryRow`, and the primitives in each site's own
  chassis pass by its own choice; nothing here is a `Consumers must:`.
- **Release:** the window holds; ONE cut after polish.

## Post-mortem

Merged 2026-09-08 as PR #51 (`58ed9d1f`), after Geoff's five-viewport read of the committed
contact sheets. Ran on `.claude/worktrees/chassis-b` off post-chassis-A `main`.

**What was built.** All seven numbered tasks landed (Task 8 was the reserved fix-round slot,
not a deliverable): the capture tool and the pass before set, plus the CSS format half
(`capture-surfaces.mjs`, the intended-moves manifest, the three-file Prettier reformat pinned to
double quotes); the width matrix gained `error404` and `admin/signups` at all five widths in
both schemes; the showcase's public chrome adopted the chassis site shell
(`.cairn-site-shell`/`.cairn-site-main`) on `(site)/+layout.svelte` and `+error.svelte`; the five
composition primitives landed, `cairn-hero`, `cairn-section`, and `cairn-band` on real site
surfaces (the styleguide masthead, the home page's `.index`, the root error page's message
block) and `cairn-card`/`cairn-sidebar-layout` demonstrated on the styleguide's composition
section, the sanctioned exception; one focus-ring token trio
(`--cairn-focus-ring-outline`/`-offset`/`-radius`) and a `cairn-focus-ring` utility replaced
every hand-written ring; the entry row was written once as `EntryRow.svelte`, retiring three
duplicated `<article class="entry">` blocks. Task 7 banked the harvest
(`chassis-b1-harvest.md`), the per-surface contact sheets, and the hand-off to B2, moved B1's
shipped items out of `ROADMAP.md`'s chassis tier, and closed the `CHANGELOG.md` entry.

**What was verified, with evidence.** Each task ran through the implementer/diff-reviewer/gate
chain with its own before/after capture pair and its `INTENDED MOVES:` row appended to
`chassis-b-intended-moves.md` in the same commit as the change; every paint-neutral task
(2, 3, 5, 6) additionally reported `magick compare -metric AE` = 0 across its touched surfaces'
tiles. The pass-end fresh-context `visual-verifier` graded the whole surface set against the
committed manifest in a bounded loop: it found the band-to-footer seam fix from Task 7's first
round a no-op under Tailwind v4's layer order (the utility `mt-2xl` on `SiteFooter.svelte` beat
the `@layer components` cancel rule regardless of selector specificity), which the second fix
round closed by moving the footer's top margin itself into `@layer components`; a third read
after that fix passed clean. Four baselines (`error404` at 768/1440 in both schemes) had passed
the unmodified suite's per-pixel threshold on the first fix even though the render had actually
moved (a 7-to-9-level color shift on already-height-pinned tiles), caught only by the verifier's
tile read and `magick compare`, not by `toHaveScreenshot`. The conductor's own one-check read
covered every changed surface's after tiles at 320 and 2560 light from the contact sheets.
Geoff's five-viewport read of the merged contact sheets (`chassis-b-contact-sheets/`) was the
merge gate and passed with no further findings.

**Decisions locked.** The ruled inputs recorded at the top of this plan (the site-shell paint
boundary, the five primitives' call-site assignments, the focus-ring token/utility shape, the
CI-canonical baseline regen loop, the 31-baseline count) all held through execution with no
reopening. The Task 1 escalation ruling (recorded 2026-09-08 in the CSS quote-style ruled input)
kept `check-public-tokens.mjs` untouched, routing the quote pin to a `.prettierrc` override
instead, and is now the general lesson: a mechanical reformat pins its own style choice rather
than reaching into an engine script that is a different pass's to touch. The layer-order lesson
from the seam fix (Tailwind v4's cascade layers, not selector specificity, decide a cross-file
rule conflict; both halves of a seam must share a layer) is banked in the
`chassis-b1-harvest.md` and the `tailwind-v4-layer-order` memory for the next primitive
adoption anywhere in the family.

**Blockers.** None; every task closed inside the pass, including both fix rounds.

**Budget.** Tokens: the workflow reported 839,281 subagent tokens for Tasks 5 through 7; the
earlier tasks (1 through 4) ran before that measurement was wired in and are not counted here.
Attended sittings: one, the five-viewport contact-sheet read. Planning misses: zero, no
ambiguity surfaced after plan approval that a planning question would have caught.
