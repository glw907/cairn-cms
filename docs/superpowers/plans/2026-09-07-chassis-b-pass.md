# Chassis-B Pass Implementation Plan (audit remediation, slice 9: the exemplar uses its chassis)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (the pass is sequential; see
> Execution). Steps use checkbox syntax for tracking. **Runs only after chassis-A merges**
> (this pass inherits A's split config, the re-homed `headRow`, the comment gate over the
> showcase, the showcase unit tests, and the idiom sweep). Drafted 2026-09-07 while chassis-A
> was executing, against `main` at `d565ab77` plus chassis-A's plan as the known delta, so
> **every anchor below is re-verified at dispatch against post-A `main`**; the anchor pass and
> the three-lens plan review (grounding, risk, hygiene and sizing, standing in for Geoff's read
> per the 2026-09-05 grant) run after A merges and before the first dispatch. Pre-extracted
> anchor evidence is banked at `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-inputs.md`.

**Goal:** make the showcase, the chassis every theme copy and the scaffold descend from, USE
the chassis it ships: the shell and the five composition primitives adopted and baselined, one
focus ring, the paginated archive proven on a real 27-post corpus with the entry row written
once, site identity read from `siteConfig`, the CSS brought to conformance and under the gates,
the width matrix covering every public surface, the small idioms closed, and waymark adapted on
purpose before the release window closes.

**Architecture:** every task lands inside `examples/showcase`, `templates/waymark` (always
regenerated, never hand-edited), the e2e suites, the repo's gates, or the docs. No engine code
changes; `check:surface` unchanged. **Rendered output changes by design in this pass**, so the
`visual-fidelity` method governs: a before capture of every public surface at the five widths
in both schemes is banked before the first change, every paint-changing task enumerates its
intended changes and ships before/after captures, the `diff-reviewer` reads them per task, the
fresh-context `visual-verifier` grades the whole surface set at pass end in a loop that exits
only on PASS, and Geoff's five-viewport before/after read is the merge gate.

**Tech stack:** SvelteKit 2, Svelte 5, TypeScript, Prettier with `prettier-plugin-svelte`,
vitest, Playwright (baselines CI-canonical via `e2e.yml`'s `update_snapshots` dispatch), the
repo's gate estate.

**Spec:** `docs/superpowers/specs/2026-09-04-chassis-passes-design.md`, section "Chassis-B";
the fresh review whose section numbers this plan cites is
`docs/internal/record/2026-09-04-chassis-inputs/showcase-review-at-the-exemplar-bar.md`; the
recorded fourteen at `docs/internal/record/2026-08-26-any-site-audit/int-rank-site-chassis.md`.

**Token ceiling:** 6M (12 tasks; image reads dominate, so each task carries a screenshot
budget). **Checkpoint interval:** every four tasks (checkpoints at 4, 8, 12). **Execution:**
sequential in one worktree, `.claude/worktrees/chassis-b` off post-A `main`, from-scratch
showcase `npm install` before the first gate; `templates/waymark` and the committed baselines
are the contended resources, so no parallel chains. At most one other full gate may run on
the machine concurrently. Full guard set armed at launch.

## Ruled inputs (recorded; no task re-derives them)

- **The two organizing rules** (spec): the fixture job is excluded by path or marked; the
  exemplar uses the chassis it ships. Every adoption in this pass is a real site use, never a
  demonstration bolted on for the baseline's sake, with one sanctioned exception: the
  styleguide's new composition section, which is exactly what a styleguide is for.
- **Thirteen REAL short posts** (Geoff, 2026-09-05): 150 to 300 words each, the existing
  trail-notes voice, written through the site content method (the `content-draft` and
  `content-review` skill files, read directly by the implementer since the showcase has no
  content guide of its own; the voice brief is the fourteen existing posts' descriptions).
  **Dated across 2025** (Geoff, 2026-09-07), so `/archive/2` carries the year heading and the
  home page's page 1 keeps the fourteen 2026 posts. `status: published`. Topics drawn from the
  five vocabulary values in `site.config.yaml`, at least one topic each.
- **The merge gate STAYS** (Geoff, 2026-09-05): run to a green PR with the before/after
  captures and the `visual-verifier` verdict banked; Geoff merges after his five-viewport read.
- **Baselines are CI-canonical.** Per task, the implementer regenerates the moved baselines
  locally (`CI=1 npx playwright test e2e/site-visual.spec.ts --update-snapshots` by FILE PATH,
  inside `examples/showcase`) so the local gate is green and the diff carries the images; the
  canonical regen is ONE `gh workflow run e2e.yml --ref chassis-b -f update_snapshots=true`
  after Task 7 and one at pass end, each followed by `git pull` before the next dispatch. A
  workstation render never substitutes for the CI one, and a local render drifting past the
  120 px floor against the CI baseline is reported, never tuned.
- **The focus-ring primitive is a token pair plus one utility.** `tokens.css` defines
  `--cairn-focus-ring-outline` (`2px solid var(--color-primary)`), `--cairn-focus-ring-offset`
  (`2px`), and `--cairn-focus-ring-radius` (`2px`, the theme-only token from review 4.3 moved
  down to a chassis default). The theme's own markup reaches a `cairn-focus-ring` utility
  (Tailwind v4 `@utility` if the layering permits, else `.cairn-focus-ring:focus-visible` in
  `composition.css`); `prose.css`'s directive sites, whose markup the engine fixes, read the two
  tokens in place. Paint identical to today's ring; the `site-visual.spec.ts` focus assertion
  (outline or box-shadow on `.lead__title a`) stays green.
- **The site shell is paint-neutral.** `.cairn-site-shell`/`.cairn-site-main` replace the
  hand-rolled flex column; the `min-h-screen`/`flex-1` utilities and `site.css`'s `.site-main`
  width block go; the footer-pin geometry test stays green; no baseline moves.
- **Primitive call sites are named here, not chosen at dispatch:** `.cairn-hero` with
  `-title`/`-lead` on the styleguide masthead; `.cairn-section` on the home page's `.index`
  block and the `.lead`; `.cairn-band` on the root error page's message block (a full-bleed
  strip, the shape it already draws); `.cairn-card` on the `/members/login` and `/members`
  card (replacing the DaisyUI `.card` there, since the chassis card is the theme's own
  recipe); `.cairn-sidebar-layout` on the article's related-posts rail if `ArticleView`
  renders `related`, else on the styleguide composition section only. Each adoption may move
  paint; the task enumerates each move. A site where adoption forces a visible redesign is
  reported, not forced.
- **Degenerate clamps become the constants they already resolve to** (`clamp(a, a, b)` with
  `b < a` resolves to `a`), so paint is unchanged; the byte-identical `--text-step-1`/`-2`
  pair keeps both declarations with one comment stating the shared value is deliberate, or
  derives one from the other, the implementer's call, paint unchanged.
- **The class namespace convention is stated, not enforced by rename.** `cairn-*` is the
  chassis's; `site-*` is the theme's chrome; `sg-*` is the styleguide's; bare directive
  classes (`.alert`, `.callout`, `.cta`) are engine-fixed markup, scoped under `.prose`. The
  theme's page classes (`.entry`, `.lead`, `.index`, `.pagination`) are named under the
  convention only where a task rewrites the block anyway (Task 6's component); a tree-wide
  rename is out of scope.
- **`createSectionAction` IS adopted** in `admin/signups` (internals-C Task 10 left
  `docs/extend/add-a-custom-admin-screen.md:32` teaching it as the recommended path;
  chassis-A Task 10 recorded the raw shape as deliberate pending this pass).
- **`siteConfig`'s one door already holds** (all eight imports resolve to `$theme/cairn.config`;
  chassis-A Task 10 adds `.js` to the bare four), so review 1.2 is closed by A and this pass
  only verifies.
- **`ORIGIN` stays a literal** (ledger `public-origin-only-origin-source`, decline); this pass
  writes the comment that says so and distinguishes it from `wrangler.jsonc`'s `PUBLIC_ORIGIN`.
- **Release:** ONE cut after polish; this pass does not bump or publish.

## Global constraints

- Every task that changes an emitted file ends with `npm run emit:template` and commits the
  regenerated `templates/waymark` in the same commit; `check:template` green per task.
- `check:surface` unchanged; no engine code changes; no public export added or removed.
- **Every paint-changing task**: before captures from the task's parent commit and after
  captures from its head, both through `examples/showcase/scripts/capture-surfaces.mjs`
  (Task 1) into `~/.cache/cairn-chassis-b/<task>/{before,after}/`, the intended changes
  enumerated in the task report by surface and width, and the moved baselines regenerated
  locally by file path and committed. A baseline that moves for a change the report does not
  enumerate is a stop-and-report.
- **Screenshot budget per task:** the `diff-reviewer` reads at most the changed surfaces at
  320, 1440, and 2560 in light plus 390 in dark (twelve images for a three-surface task); the
  pass-end `visual-verifier` reads every public surface at all five widths in both schemes.
- Prose in comments and docs: no em dashes; TSDoc and Svelte `@component` conventions; the
  comment gate (`check:comments`) covers the showcase after chassis-A.
- Gate per task: `npm --prefix examples/showcase run format:check`, the showcase `check`,
  `test:unit`, and `CI=1 test:e2e`; the engine's `npm run check`, `check:chassis-boundary`,
  `check:public-tokens`, `check:template`, `check:consumers`, `check:reference`, `check:docs`,
  `check:comments`; `npm --prefix packages/create-cairn-site run prepack && npm --prefix
  packages/create-cairn-site test` (806 of 806; chassis-A's Task 1 omission). The
  `// prettier-ignore` line above `backend:` in `cairn.config.ts` pins the literal
  `packages/create-cairn-site/src/github/finalize.mjs` matches byte-for-byte; never reflow it.
  The six CI-only gates BY NAME at pass end plus `check:idioms` and `check:cm-internals`.

---

### Task 1: The CSS format half and the capture tool (the first commit)

**Files:**
- Modify: `examples/showcase/.prettierignore` (the CSS exclusion removed), `examples/showcase/package.json`
  (the shared `format`/`format:check` target set gains `src/**/*.css`), the four CSS files
  Prettier reflows (`src/chassis/prose.css`, `src/chassis/tokens.css`, `src/theme/theme.css`,
  `src/routes/probe-craft/probe-craft.css`; `composition.css` and `site.css` are already clean),
  `templates/waymark` (regenerated)
- Create: `examples/showcase/scripts/capture-surfaces.mjs` (under the template-excluded
  `scripts/`; a Playwright script against the preview server on 4173 that writes
  `<surface>-<scheme>-<width>.png` full-page for the surface list `home` `/`, `article`
  `/posts/the-reading-surface`, `styleguide` `/styleguide`, `archive2` `/archive/2`, `error404`
  an unmatched path, `members-login` `/members/login`, `signups` `/admin/signups` with the
  e2e session helper, at `320 390 768 1440 2560` in `light` and `dark`, to an output dir
  argument; a surface that does not render is written as a one-line `.missing` file, never a
  silent skip)

**Interfaces:**
- Produces: `node scripts/capture-surfaces.mjs --out <dir> [--only home,article]`, used by
  every later task and by the pass-end verifier; the CSS format in every later task's gate.

- [ ] **Step 1:** bank the pass's BEFORE set: build and preview the untouched tree, run the
  capture tool into `~/.cache/cairn-chassis-b/pass/before/`, and record in the task report
  which surfaces wrote `.missing` (the 404 under `vite preview` and `/archive/2` at page size
  50 are the expected two; a third is a finding).
- [ ] **Step 2:** the ignore and target-set edits; run `format` once; confirm `git diff -w
  --stat` on the four files is whitespace-only; `check:public-tokens` and
  `check:chassis-boundary` green (both read these files).
- [ ] **Step 3:** run the visual suite; if any committed baseline moves, stop and report the
  file (a CSS reformat that changes paint is not mechanical).
- [ ] **Step 4:** re-emit; full gate; ONE commit whose subject says it is the mechanical CSS
  reformat plus the capture tool.

**Acceptance criteria:** `format:check` covers CSS and is green; the four files differ from
their parents by whitespace only; every baseline unchanged; the before set exists with at most
the two expected `.missing` files; `check:template` green.

### Task 2: The shell from the chassis

**Files:**
- Modify: `examples/showcase/src/routes/(site)/+layout.svelte` (the `site-shell flex
  min-h-screen flex-col ...` wrapper becomes `cairn-site-shell site-shell bg-base-100
  font-body text-base-content`; `main` becomes `cairn-site-main site-main`), `src/routes/+error.svelte`
  (the same two lines), `src/theme/site.css` (the `.site-main` width and min-width block and
  its comment admitting the re-derivation deleted; `.site-main` keeps only what is not the
  shell mechanic), `src/chassis/README.md` (the gotcha prose collapses to one sentence
  pointing at `composition.css`, which keeps the full explanation; the removal table's
  `composition.css` row stops saying nothing uses the shell pair and drops the AstroPaper
  aside), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** the two markup edits and the CSS deletion; the footer-pin geometry test and
  the whole visual suite green with every baseline unchanged; if a baseline moves, the shell
  was not paint-neutral: stop and report the diff.
- [ ] **Step 2:** the README collapse; `grep -rn "cross axis\|cross-axis" examples/showcase/src`
  returns only `composition.css`; re-emit; full gate; commit.

**Acceptance criteria:** both pages use the chassis pair; the gotcha is explained once; every
baseline unchanged; `check:docs` green.

### Task 3: The five composition primitives used and proven

**Files:**
- Modify: `src/routes/(site)/styleguide/+page.svelte` (the masthead on `.cairn-hero` with
  `-title`/`-lead`, its scoped hero styles deleted; a new "Composition" section demonstrating
  card, band, section, and sidebar-layout with two-sentence captions, in the styleguide's
  existing section register), `src/routes/(site)/+page.svelte` (`.cairn-section` on `.lead`
  and `.index`; the scoped margins those blocks hand-roll deleted), `src/routes/+error.svelte`
  (the message block on `.cairn-band` with the centered container as its child),
  `src/routes/members/login/+page.svelte` and `src/routes/members/+page.svelte` (`.cairn-card`
  replacing DaisyUI `.card ... shadow`), `src/theme/components/ArticleView.svelte` (only if it
  renders `related`: the rail on `.cairn-sidebar-layout`), `src/chassis/README.md` (the
  removal table's `composition.css` row now names the adopters), `templates/waymark`
  (regenerated)
- Modify: `e2e/site-visual.spec.ts` only if the composition section needs its own scroll
  anchor (it should not; the styleguide is already full-page at five widths)

**Interfaces:** none new.

- [ ] **Step 1:** before captures of `home`, `styleguide`, `error404`, `members-login`,
  `article`; the adoptions; after captures; enumerate every visible move per surface and
  width in the report (expected: the styleguide gains a section and its masthead rhythm may
  shift by the hero gap; the home lead/index spacing may shift by the section gap; the
  members card border replaces the shadow; the 404 message gains the band ground); any
  move outside that list is a stop-and-report.
- [ ] **Step 2:** the moved baselines regenerated by file path and committed with the change;
  a 320 and a 2560 capture of the styleguide's composition section read by the implementer
  and named in the report as proven at the extremes; re-emit; full gate; commit.

**Acceptance criteria:** each of the five primitives appears at a real site and in the
styleguide section; the report's enumerated moves match the baseline diff exactly; the
`daisyui-a11y-reviewer` finds no regression on the members card or the 404 at pass end.

### Task 4: One focus ring

**Files:**
- Modify: `src/chassis/tokens.css` (the three `--cairn-focus-ring-*` tokens per the ruled
  input, with one comment), `src/chassis/composition.css` (the `cairn-focus-ring` utility, or
  the `@utility` in `tokens.css` if that is where Tailwind's layer is activated; the
  implementer verifies which file the activation lives in before choosing), `src/theme/theme.css`
  (`--cairn-focus-ring-radius: 2px` at about `:311` deleted, now a chassis default),
  `src/chassis/prose.css` (its six `:focus-visible` rules read the two tokens), every theme
  and route `:focus-visible` rule that hand-writes the ring (enumerate with `grep -rn
  "outline: 2px solid var(--color-primary)" examples/showcase/src`; chassis-A Task 5 deleted
  two carriers, so re-count at dispatch; the spec's arithmetic says 20 remain), each replaced
  by the utility class on the element or, where the selector is a descendant (`.site-nav a`),
  by the token pair, `docs/internal/public-design-system.md` (the focus-ring device names its
  one source), `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `--cairn-focus-ring-outline`, `--cairn-focus-ring-offset`,
  `--cairn-focus-ring-radius` from `tokens.css`; the `cairn-focus-ring` utility.

- [ ] **Step 1:** the tokens and the utility; the sweep; `grep -rn "outline: 2px solid
  var(--color-primary)" examples/showcase/src` returns nothing; the focus assertion in
  `site-visual.spec.ts` green; every baseline unchanged (focus states are not captured);
  `check:public-tokens` green with the new tokens resolved.
- [ ] **Step 2:** keyboard-tab through the home, article, and styleguide in the preview and
  confirm the ring draws on the first three controls of each (the report names them);
  re-emit; full gate; commit.

**Acceptance criteria:** zero hand-written rings; one token pair and one utility; the
theme-only radius token is a chassis default; every baseline unchanged; the focus assertion
green.

### Task 5: Site identity from `siteConfig` and one title convention

**Files:**
- Modify: `src/theme/components/SiteHeader.svelte` and `SiteFooter.svelte` (the wordmark
  reads `siteConfig.siteName`), `src/routes/+error.svelte`, `src/routes/(site)/archive/[page]/+page.svelte`,
  `src/routes/(site)/styleguide/+page.svelte` (titles), `src/routes/(site)/+page.svelte` and
  `src/routes/(site)/[...path]/+page.svelte` (a `<title>` each, today absent),
  `src/routes/members/+page.svelte` and `members/login/+page.svelte` (suffix added), all on
  the one convention `<page> · <siteName>` with the home page as bare `<siteName>`;
  `src/theme/site-config.ts` (a `footerNav` export through `readMenu(siteConfig, 'footer', 1)`),
  `src/theme/site.config.yaml` (`menus.footer` carrying today's three footer entries verbatim
  so paint is unchanged), `src/theme/components/SiteFooter.svelte` (the hardcoded array
  replaced by `page.data`'s footer nav or a direct import, matching how the header reaches
  `primaryNav`; the "a scaffolded site owner edits this list" comment rewritten to point at
  the yaml), `src/routes/(site)/+layout.server.ts` (passes `footerNav` if the header's path is
  through `page.data`), `src/chassis/content.ts` (the `ORIGIN` comment: literal by ledger
  ruling, what it feeds, how it differs from `PUBLIC_ORIGIN`), `src/theme/cairn.config.ts`
  (`email.from` derived from `ORIGIN`'s host or given a one-line comment explaining why it is
  its own literal; the implementer reads `src/lib/email.ts`'s sender rules before choosing),
  `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `footerNav` from `$theme/site-config.js`; `menus.footer` in the yaml schema the
  admin nav editor reads (verify `/admin/nav` tolerates a second menu; if it edits only
  `primary`, say so in the report and the footer still reads the yaml).

- [ ] **Step 1:** `grep -rn "Waymark" examples/showcase/src --include='*.svelte' --include='*.ts'`
  before (five renderable hits) and after (zero outside comments and content); the titles; the
  footer menu; the two origin comments; every baseline unchanged (the wordmark text is
  identical; titles do not paint); `e2e` green including any nav spec.
- [ ] **Step 2:** re-emit; full gate; commit.

**Acceptance criteria:** zero renderable "Waymark" literals; one title separator tree-wide and
every public page titled; the footer nav sourced from the yaml; both origin literals explained;
every baseline unchanged.

### Task 6: The entry row once

**Files:**
- Create: `src/theme/components/EntryRow.svelte` (the `<article class="site-entry">` markup
  with the date, title link, and excerpt, `entry--undated` becoming `site-entry--undated`, the
  one stylesheet, the `cairn-focus-ring` on the title link; an `@component` block of purpose,
  contract, failure mode)
- Modify: `src/routes/(site)/+page.svelte` (both `<article class="entry">` blocks and the
  `.entry*` styles replaced by the component), `src/routes/(site)/archive/[page]/+page.svelte`
  (the same), any e2e selector that reads `.entry` (grep `e2e/` for `entry`; `data-cairn-post`
  stays as the stable hook), `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `EntryRow` with props `post: ContentSummary` (the `$chassis` summary type the
  pages already hold) and nothing else.

- [ ] **Step 1:** the component; the three call sites; the two style blocks deleted; before
  and after captures of `home` and `article`; every baseline unchanged (a pure extraction;
  the `@media` block travels with the styles); the report proves the extraction by the
  empty baseline diff.
- [ ] **Step 2:** re-emit; full gate; commit.

**Acceptance criteria:** one entry markup and one stylesheet in the tree; `grep -rn
'class="entry' examples/showcase/src` returns nothing; every baseline unchanged; e2e green.

### Task 7: The archive proven on a real corpus

**Files:**
- Create: thirteen posts under `src/content/posts/2025-*.md` per the ruled input (a
  filename per post in the existing `YYYY-MM-DD-slug.md` shape, dates spread across 2025, no
  two in the same week), each with `title`, `date`, `description` (one sentence in the
  existing register), `topics`, `status: published`, a 150 to 300 word body in the trail-notes
  voice, and no fixture narration in the body (the description may keep the corpus's
  self-aware register)
- Modify: `src/chassis/archive.ts` (`ARCHIVE_PAGE_SIZE = 13`; the comment rewritten to the
  truth: sized so the starter corpus crosses one page boundary, and a site sets its own),
  `src/chassis/archive.test.ts` (chassis-A Task 9's table gains the 27-entry case: three pages
  if the featured post is paginated, two if not; the implementer reads
  `(site)/+page.server.ts` to learn which, and the test asserts the real rule),
  `svelte.config.js` (the `handleUnseenRoutes` comment rewritten: the exception is the
  starter's small-corpus affordance, and this corpus now produces `/archive/2`), `e2e/site-visual.spec.ts`
  (`archive2` `/archive/2` joins the width loop as a fourth surface), `e2e/admin-visual.spec.ts-snapshots/admin-office-*`
  (regenerated for the longer posts list), `src/content/.cairn/index.json` if the index is
  committed (regenerate through the repo's index command, never by hand), `templates/waymark`
  (regenerated; the posts ship as the starter corpus)

**Interfaces:** none new.

- [ ] **Step 1:** read `~/.claude/skills/content-draft/SKILL.md` and
  `~/.claude/skills/content-review/SKILL.md` and the fourteen existing posts; draft the
  thirteen; run the content-review gates on each and fix; commit the posts alone.
- [ ] **Step 2:** the page size, the comment rewrites, the unit test, the fourth surface;
  before captures (`home`, `archive2` which was `.missing`) and after; enumerate: the home
  page's page 1 shows the fourteen 2026 posts and the pagination block; `/archive/2` renders
  the 2025 year heading and its rows with the pagination block; `admin-office-*` grows by
  thirteen rows; nothing else moves. Regenerate `site-home-*`, the new `archive2-*`, and
  `admin-office-*` locally by file path.
- [ ] **Step 3:** re-emit; full gate; commit. Then push, `gh workflow run e2e.yml --ref
  chassis-b -f update_snapshots=true`, wait for the bot's commit, `git pull`, and confirm the
  local suite is green against the CI baselines; report any surface past the floor.

**Acceptance criteria:** 27 published posts, thirteen dated 2025 and reviewed; page size 13;
`/archive/2` renders and is baselined at five widths in both schemes; the home pagination
block visible in the page 1 baseline; the archive test covers the corpus; CI baselines
committed by the bot; the `svelte.config.js` and `archive.ts` comments true.

### Task 8: CSS conformance

**Files:**
- Modify: `src/theme/theme.css` (`--text-step--1` and `--text-step-0` become the constants
  they resolve to, `0.84rem` and `1.06rem`, with the derivation comment updated; the
  `--text-step-1`/`-2` pair per the ruled input; `--cairn-caption-tracking` moves to a
  `tokens.css` default with the theme free to override), `src/chassis/tokens.css` (the
  caption-tracking default), `scripts/checks/check-public-tokens.mjs` (`site.css` joins the
  scanned set at about `:79`; the literal scan and the resolution check both read it),
  `src/theme/site.css` (the three size literals at about `:140`, `:193`, `:194` tokenized
  where a token carries the value, or declared as a named `--site-*` custom property on the
  rule with a one-line reason; paint unchanged either way), `src/chassis/README.md` (a
  "Class namespaces" paragraph per the ruled input), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** compute each clamp's resolved value and assert paint unchanged by the
  visual suite; the token moves; the gate extension, which must fail on a planted literal in
  `site.css` before the literals are fixed (prove the gate bites, then fix); the paragraph.
- [ ] **Step 2:** every baseline unchanged; re-emit; full gate; commit.

**Acceptance criteria:** no degenerate clamp; no theme-only token a second theme would
dangle; `site.css` inside both halves of `check:public-tokens` and green; the convention
stated; every baseline unchanged.

### Task 9: Width matrix coverage and the screenshot floor

**Files:**
- Modify: `e2e/site-visual.spec.ts` (`error404` and `members-login` join the width loop;
  `/archive/2` joined in Task 7), `e2e/admin-visual.spec.ts` (`/admin/signups` at the five
  widths in both schemes, through the suite's session helper), `playwright.config.ts` only if
  the 404 needs a webServer change (see Step 1), `e2e/public-alignment.spec.ts` (new: the
  computed-style compensation for the public template, two devices named in
  `docs/internal/public-design-system.md`'s "Vertical alignment mechanics" section, asserted
  with numbers the way `src/tests/component/vertical-alignment-recipes.test.ts` does for the
  admin), `docs/internal/public-design-system.md` (the section now names the spec that holds
  its doctrine; if the section names no measurable device, it instead says why the floor is
  uncompensated and what would trigger a measurement), `templates/waymark` (regenerated if
  any emitted file moved; the e2e dir is excluded)

**Interfaces:** none new.

- [ ] **Step 1:** determine whether the root `+error.svelte` renders under `vite preview` for
  an unmatched path (Task 1's before set says); if not, the 404 baseline is captured through
  the route that does render it (the implementer tries `wrangler dev`'s default-404 SSR as a
  second webServer only if the preview cannot, and reports the cost); the four surfaces; the
  alignment spec; before and after captures for the new surfaces only.
- [ ] **Step 2:** new baselines regenerated locally by file path; full gate; commit.

**Acceptance criteria:** every public surface in the width matrix at five widths in both
schemes, the 404 included; `/admin/signups` baselined; the floor compensated by a numeric
test or the doc says why not; e2e green.

### Task 10: Small idioms and the custom-screen exemplar

**Files:**
- Modify: `src/routes/admin/signups/+page.server.ts` (both actions through
  `createSectionAction` per `docs/extend/add-a-custom-admin-screen.md`; the `load` through
  `requireAccess` as the doc pairs it; the three `platform!` assertions replaced by one
  resolved binding the section action hands the handler, or one guard that returns
  `error(500)` with a log event when the binding is absent; chassis-A Task 10's "raw shape is
  deliberate" comment deleted), `e2e/custom-screen.spec.ts` (test-first: the existing four
  assertions green unchanged, plus one new case for the behavior adoption makes reachable,
  the 403 branch for a non-owner through the access map, driven the way `access-map.spec.ts`
  mints roles), `src/chassis/feed.ts` (the `?.`/`!` mix on `posts` resolved to one guard at
  the top of the function), `docs/internal/public-design-system.md` (the three stale
  `src/lib/*` paths at about `:5` and `:316-317` repointed to `src/theme/theme.css`,
  `src/chassis/prose.css`, `src/theme/components/`), `docs/extend/add-a-custom-admin-screen.md`
  (if its worked example and the exemplar now disagree on a detail, the doc follows the
  exemplar), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** the new e2e case written first and failing; the adoption; the four existing
  cases green unchanged; the new one green; `platform!` count zero in the file.
- [ ] **Step 2:** `feed.ts` and the doc paths; feed bodies byte-identical before and after;
  re-emit; full gate; commit.

**Acceptance criteria:** the exemplar uses the helper the docs teach; `grep -n "platform!"
examples/showcase/src` returns nothing; the 403 branch covered; the feed bodies unchanged;
zero stale paths in the design-system doc.

### Task 11: Waymark's deliberate adaptation and the rebake

**Files:**
- Modify: whatever the read below finds, always in `examples/showcase` (the source), never
  in `templates/waymark`; `docs/extend/what-the-scaffold-wrote.md` (its tree and tables match
  the baked scaffold file for file), `examples/showcase/README.md` (its file table matches),
  `templates/waymark` (the final regeneration)

**Interfaces:** none new.

- [ ] **Step 1:** scaffold a fresh site from `templates/waymark` through the exact
  `create-site.yml` bake command into a temp dir; install; `format:check`; `test:unit`;
  `build`; then read the scaffold as a first-time developer: the README, every file header
  under `src/chassis` and `src/theme`, `cairn.config.ts`, `site.config.yaml`, the content
  corpus. List every sentence that describes the showcase rather than a scaffolded site,
  every header that is still process narration, every doc tree line that does not match a
  real file. Fix each in the showcase source; anything template-only (a header that should
  read differently in the scaffold than in the showcase) is a stop-and-report, since the
  emitter has no per-file rewrite beyond the exclude idiom.
- [ ] **Step 2:** re-emit; the scaffold job's local assertions; full gate; commit.

**Acceptance criteria:** a fresh scaffold builds, format-checks, and unit-tests green;
`what-the-scaffold-wrote.md` and the README match the baked tree; no scaffold file describes
itself as the showcase; `check:template` green.

### Task 12: Records and the harvest (last)

**Files:**
- Modify: `ROADMAP.md` (the chassis improvement round leaves the tier; what this pass hands
  to polish is filed there by name), `docs/STATUS.md` (only the stale wording; the
  immediate-next-action entry is the conductor's at pass end), `CHANGELOG.md` (`## Unreleased`:
  the scaffold's changes for a site created from this template, no `Consumers must:` since
  the four production sites' chassis copies ride their own passes; the focus-ring tokens and
  `menus.footer` named), `docs/internal/docs-friction-log.md` (whole-log triage,
  complete-or-move), `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-harvest.md`
  (what the pass learned about the primitives, the capture tool, the baseline regen loop,
  the preview 404, and the content method on a fixture corpus; the polish inputs listed: the
  engine's `src/lib/components` Svelte lint wiring verified filed by chassis-A Task 12, the
  chassis's single-theme identity as a boundary observation, any tree-wide rename deferred
  under the namespace convention), `docs/internal/engine-rulings.md` only if a task produced
  a ruling

- [ ] **Step 1:** the amendments and the routing; `check:docs`, `check:rulings-format`,
  `check:vale`; commit.

**Acceptance criteria:** no shipped item remains in a ROADMAP tier; polish's inputs named; the
changelog entry present; the friction log triaged; the harvest banked.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the pass diff. The fresh-context `visual-verifier` gate as a LOOP: the
verifier gets the pass's before set (Task 1) and an after set captured from the final head,
every public surface at five widths in both schemes as separate labeled images, plus the
consolidated list of intended changes from every task report, and verdicts each surface and
width with the intended changes MATCHED and everything else unchanged, COSMETIC versus
STRUCTURAL; on FAIL a fix dispatch works the list and a FRESH verifier grades again; exit only
on PASS. The canonical baseline regen dispatch, pull, and a green CI run at the head. Reviewer
fan-out: `svelte-reviewer` (Tasks 2, 3, 5, 6, 10), `daisyui-a11y-reviewer` (Tasks 3, 4, 9),
`web-auth-security-reviewer` (Task 10's exemplar and the members card), `cloudflare-workers-reviewer`
(Task 10's D1 path); fix rounds per the chain discipline; the six CI-only gates BY NAME plus
`check:idioms` and `check:cm-internals`; from-scratch showcase install, build, and e2e; a fresh
scaffold built, format-checked, and unit-tested; whole-log friction triage; STATUS/HISTORY/ROADMAP;
post-mortem here; both budgets scored; push and PR with the before/after captures of the
changed surfaces at the five widths attached for Geoff's read; **Geoff merges.**

## What this pass hands forward

- **Polish:** the engine's own `src/lib/components` Svelte lint wiring; the single-theme
  identity observation; any namespace rename deferred; the OfficeList and busy-idiom rulings
  already routed there; the cover-to-cover docs read over the chassis this pass leaves.
- **Consumer sites:** the focus-ring tokens, `menus.footer`, `EntryRow`, and the primitives,
  in each site's own chassis pass by its own choice; nothing here is a `Consumers must:`.
- **Release:** the window holds; ONE cut after polish, with `check:template` at the cut.
