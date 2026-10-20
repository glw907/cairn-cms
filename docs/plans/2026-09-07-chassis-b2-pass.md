# Chassis-B2 Pass Implementation Plan (audit remediation, slice 9b: the corpus, conformance, and the rebake)

> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js` with ONE chain (sequential; see Execution).
> Steps use checkbox syntax for tracking. **Stacks on chassis-B1's branch** (Geoff, 2026-09-07:
> the worktree `chassis-b2` branches from `chassis-b`, not from `main`, so both PRs wait for one
> sitting of his five-viewport read and merge in order) and inherits
> B1's capture tool, tile protocol, intended-moves manifest, report contract, baseline rules,
> and ritual order; this plan restates only what differs. Folded 2026-09-07 from the four-lens
> review (record: `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-plan-review.md`,
> the fold brief `chassis-b-fold-brief.md`). Every anchor is re-verified at dispatch against
> the `chassis-b` head.

**Goal:** the paginated archive proven on a real 27-post corpus in the showcase while the
scaffold keeps its fourteen, site identity read from one source, the footer nav out of code,
the CSS brought to conformance and under the gates, the small idioms closed, and waymark read
as a first-time developer and rebaked.

**Architecture:** every task lands inside `examples/showcase`, `templates/waymark` (always
regenerated, never hand-edited), the e2e suites, the docs, and ONE engine gate script
(`scripts/checks/check-public-tokens.mjs`'s scanned set; `site.css` consumes tokens and does
not define them, so it belongs in the gate the way `composition.css` does). No engine runtime
code and no public export changes; `check:surface` unchanged. Rendered output changes by
design under B1's protocol.

**Tech stack:** as B1.

**Spec:** `docs/superpowers/specs/2026-09-04-chassis-passes-design.md`, section "Chassis-B"
(amended 2026-09-07).

**Token ceiling:** 6M (8 tasks at about 0.63M non-image each, plus about 0.15M of per-task
tile reads and about 0.55M for the pass-end verifier over six surfaces, the image assumption
as B1's). Task 1 (thirteen posts) and Task 2 (the archive) are the two expected to exceed
0.7M; Task 1 splits at seven posts if it does. **Checkpoint interval:** every four tasks
(checkpoints at 4 and 8), each writing STATUS (task ledger, decisions taken, spend against the
ceiling, next task). **Execution:** sequential in one worktree, `.claude/worktrees/chassis-b2`
off the `chassis-b` branch (stacked on B1), from-scratch showcase `npm install` before the first gate; the baselines,
the template, and the content corpus are the contended resources, so no parallel chains. Open
the PR after Task 1's commit. CI regens (conductor checkpoint actions, chain suspended) after
Task 2 and at pass end. The chain's `criteria` strings carry the paint protocol verbatim, as
in B1.

## Reconciliation at dispatch

1. `archive.test.ts` (chassis-A Task 9): if its table is absent, Task 2 writes the 27-entry
   case standalone and reports it.
2. `siteMeta` (chassis-A Task 7, `$chassis/content.ts`): Task 3 reads the site name from it;
   if A shaped it differently, Task 3 uses whatever single composition point A left and names
   it.
3. The `.js` specifier survivors (chassis-A Task 10's grep gap, B1's Reconciliation item 5):
   Task 3 closes any that remain, naming the files.
4. The type-scale derivation comment and the two 220-post comments (chassis-A Task 11): Tasks
   2 and 5 own their final wording.
5. `scripts/lab/reskin-fixture.mjs:136-140` calls `checkTokenResolution` with three arguments
   and runs under `design.yml`; Task 5 keeps it compiling.

## Ruled inputs (recorded; no task re-derives them)

- **Thirteen REAL short posts** (Geoff, 2026-09-05): 150 to 300 words of body each by `wc -w`,
  the existing trail-notes voice, written through the site content method (the implementer
  reads `~/.claude/skills/content-draft/SKILL.md` and `content-review/SKILL.md` directly; the
  voice brief is the fourteen existing posts). **Dated across 2025** (Geoff, 2026-09-07), no two
  in the same week, filenames `2025-MM-DD-slug.md`. Frontmatter `title`, `date`, `description`
  (one sentence in the existing register), `topics` (at least one of the five vocabulary
  values); no `status` key (no existing post carries it and nothing reads it).
- **The thirteen do not ship to the scaffold.** `src/content/` is in no exclude list today, so
  without a ruling every scaffolded site's corpus would double. The thirteen are excluded by
  path in `.cairn-template.json` (a glob if the emitter accepts one, else thirteen paths, the
  implementer verifies by reading `emit-template.mjs`'s exclusion walk); the showcase proves
  the archive and a scaffolded site still ships fourteen, with `ARCHIVE_PAGE_SIZE` documented
  in the chassis README as the site's own knob whose pagination block appears at the fifteenth
  post. `docs/extend/what-the-scaffold-wrote.md`'s "(14 sample entries)" line stays true.
- **The archive arithmetic is settled.** Both `(site)/+page.server.ts` and
  `archive/[page]/+page.server.ts` paginate `entries.slice(1)`, so 27 posts minus the featured
  lead is 26, which at `ARCHIVE_PAGE_SIZE = 13` is exactly two pages of thirteen; `/archive/3`
  correctly 404s through the clamp guard. Page 1 keeps the 2026 posts under one year heading
  and the pagination block appears; `/archive/2` carries the 2025 posts under one heading. The
  tag filter survives its `> 12` threshold and `tag-filter.spec.ts` still counts 14
  `[data-cairn-post]`. `admin-office-*` moves only in the list's count line and pagination
  control, since `ConceptList.svelte` paginates at ten rows client-side.
- **Site identity has one source and it is server-side.** The wordmark and every `<title>`
  read the site name through `page.data` from the ROOT `+layout.server.ts` (which already
  serves `nav` to both `SiteHeader` mounts, including `+error.svelte`'s), sourced from
  `siteMeta` (chassis-A Task 7's single composition point) rather than a second read of
  `siteConfig`; a direct `siteConfig` import into a `.svelte` component is forbidden because
  `parseSiteConfig` pulls the `yaml` parser into the client bundle. `(site)/+layout.server.ts`
  is a template-excluded fixture and gains no product wiring.
- **One title convention:** `<page> · <siteName>`, the home page bare `<siteName>`; the home
  and article pages, which set no title today, gain one.
- **The footer nav moves to `site.config.yaml` as `menus.footer`** (today's three entries
  verbatim, so paint is unchanged), read through `readMenu(siteConfig, 'footer', 1)` as a
  `footerNav` export from `site-config.ts` and served through the root layout's `page.data`.
  `/admin/nav` edits only the one menu `createNavRoutes` is bound to, so the yaml carries a
  comment above `footer:` saying it is developer-edited for that reason, and the second-menu
  editing question is a chassis harvest item (an engine consultation candidate, never a
  site-side patch).
- **`ORIGIN` stays a literal** (ledger ruling); its comment reads: "The public origin as a
  literal: it is read at build time by the feed and sitemap, and `PUBLIC_ORIGIN` in
  `wrangler.jsonc` is the Worker's runtime value for the same host." No ruling citation in
  the comment. **`email.from` stays its own literal** with a comment naming the verified-sender
  constraint (deriving a sender from a URL host is what `E_SENDER_NOT_VERIFIED` punishes).
- **Degenerate clamps become the constants they resolve to.** Both have a constant preferred
  value: `clamp(0.84rem, 0.84rem, 0.80rem)` resolves to `0.84rem` (the max is below the min)
  and `clamp(1.06rem, 1.06rem, 1.0625rem)` to `1.06rem`; paint unchanged. The byte-identical
  `--text-step-1`/`-2` pair keeps both declarations with one comment stating the shared value
  is deliberate.
- **`site.css` enters the token gate, and the one real hit is decided.** `check-public-tokens`
  bans literal colors and absolute font sizes; the three size literals the review named
  (`max-height: 32rem`, `border-left: 3px`, `border-radius: 0.25rem`) are invisible to it, and
  the one line that fails is `site.css`'s root `font-size: clamp(1rem, ...)`, the fluid-type
  formula, which cannot be tokenized. The `html { font-size }` rule is exempted by name with
  the definitions-layer reason `theme.css` and `tokens.css` already carry. The three size
  literals are hygiene the gate does not enforce: default each to a named `--site-*` custom
  property on its rule, reaching for an existing token only where its name means what the
  rule means.
- **The class namespace convention is stated, not enforced by rename.** `cairn-*` the
  chassis's; `site-*` the theme's chrome and page classes; `sg-*` the styleguide's; bare
  directive classes engine-fixed under `.prose`. B1 renamed the entry family; no further
  tree-wide rename.
- **`createSectionAction` is NOT adopted here** (deferred to polish by B1 with the seam it
  needs named). Task 6 keeps the raw shape and its comment, and still removes the three
  `platform!` assertions.
- **Release:** ONE cut after polish; this pass does not bump or publish. The final
  `emit:template` before the cut is the release skill's `check:template`, not a task here.

## Global constraints

As B1's, with: capture directories under `~/.cache/cairn-chassis-b2/`; the intended-moves
manifest continues in the same committed file with a `## B2` heading; the verifier grades six
surfaces (B1's five plus `archive2`); paint-neutral tasks (3, 4, 5, 6) prove AE 0 per tile;
the gate as B1's plus `npm --prefix examples/showcase run cairn:manifest` wherever content
changes (a stale committed `src/content/.cairn/index.json` fails the build).

---

### Task 1: The thirteen posts

**Files:**
- Create: `examples/showcase/src/content/posts/2025-*.md`, thirteen files per the ruled input
- Modify: `examples/showcase/.cairn-template.json` (the thirteen excluded by path or glob),
  `examples/showcase/src/content/.cairn/index.json` (regenerated with `cairn:manifest`),
  `examples/showcase/src/chassis/README.md` (the `ARCHIVE_PAGE_SIZE` knob paragraph),
  `templates/waymark` (regenerated; must still hold fourteen posts)

**Interfaces:** none new.

- [ ] **Step 1:** read the two skill files and the fourteen posts; draft seven; run the
  content-review gates on each, record every finding with the fix or the reason declined;
  commit (the pre-agreed split point).
- [ ] **Step 2:** the remaining six the same way; the exclusion; the manifest; the README
  paragraph; re-emit and confirm `ls templates/waymark/src/content/posts | wc -l` is 14; the
  home page at page size 50 now lists 26 rows, so `site-home-*` moves: `INTENDED MOVES:` names
  the row count and nothing else, `MOVED BASELINES:` produced, regenerated by file path; full
  gate; commit.

**Acceptance criteria:** thirteen files matching `2025-*.md`, each 150 to 300 body words;
each post's review findings recorded; the scaffold holds fourteen posts; the manifest
committed; the home baselines moved by the row count only.

### Task 2: The archive proven

**Files:**
- Modify: `src/chassis/archive.ts` (`ARCHIVE_PAGE_SIZE = 13`; the comment rewritten: sized so
  the showcase corpus crosses one page boundary, a site sets its own), `src/chassis/archive.test.ts`
  (the 27-entry case: two pages of thirteen after the featured slice, and the assertion that
  the home route's and the archive route's page counts agree), `svelte.config.js` (the
  `handleUnseenRoutes` comment: the starter's small-corpus affordance, and this corpus now
  produces `/archive/2`), `e2e/site-visual.spec.ts` (`archive2` `/archive/2` joins the width
  loop), the manifest, `templates/waymark` (regenerated)

**Interfaces:**
- Consumes: `scripts/capture-surfaces.mjs` (B1 Task 1); `archive.test.ts` (chassis-A Task 9).

- [ ] **Step 1:** task before set (`archive2` was `.missing`); the constant, the comments, the
  test, the surface; after set; `INTENDED MOVES:` per the settled arithmetic (home page 1: 13
  rows plus the lead and the pagination block; `archive2` new: the 2025 heading, 13 rows, the
  block; `admin-office-*`: the count line and pagination control only); `MOVED BASELINES:`
  produced; regenerate by file path; the manifest rows; re-emit; full gate; commit. The
  conductor then runs the CI regen, waits, pulls, reads the CI diff.

**Acceptance criteria:** page size 13; `/archive/2` renders and is baselined at five widths
in both schemes; the pagination block visible in the page 1 baseline; the two page counts
asserted equal; the comments true; the CI regen's diff read.

### Task 3: Site identity and one title convention

**Files:**
- Modify: `src/routes/+layout.server.ts` (`load` returns `siteName` from `siteMeta` beside
  `nav`), `src/theme/components/SiteHeader.svelte` and `SiteFooter.svelte` (wordmarks from
  `page.data.siteName`), `src/routes/+error.svelte`, `src/routes/(site)/archive/[page]/+page.svelte`,
  `src/routes/(site)/styleguide/+page.svelte`, `src/routes/(site)/+page.svelte`,
  `src/routes/(site)/[...path]/+page.svelte`, `src/routes/members/+page.svelte`,
  `src/routes/members/login/+page.svelte` (titles on the one convention), `src/chassis/content.ts`
  (the `ORIGIN` comment), `src/theme/cairn.config.ts` (the `email.from` comment; the
  `prettier-ignore` pin untouched), the five bare `$theme/cairn.config` specifiers if any
  survived chassis-A (`(site)/+page.server.ts`, `feed.xml/+server.ts`, `feed.json/+server.ts`,
  `(site)/[...path=md]/+server.ts`, `(site)/styleguide/+page.server.ts`), `templates/waymark`
  (regenerated)

**Interfaces:**
- Produces: `page.data.siteName` from the root layout.

- [ ] **Step 1:** `grep -rn "Waymark" examples/showcase/src --include='*.svelte'
  --include='*.ts'` before (six lines, five renderable plus `ArticleView.svelte:2`'s comment)
  and after (the comment line only); the titles; the two comments; the specifiers; every
  baseline unchanged and every tile at AE 0 (the wordmark text is identical; titles do not
  paint); re-emit; full gate; commit.

**Acceptance criteria:** the five renderable sites read `page.data.siteName`; no `.svelte`
imports `siteConfig`; every public page titled on one convention; both origin literals
explained without citations; zero bare `$theme`/`$chassis` specifiers; every baseline
unchanged.

### Task 4: The footer nav out of code

**Files:**
- Modify: `src/theme/site.config.yaml` (`menus.footer` with the comment), `src/theme/site-config.ts`
  (`footerNav`), `src/routes/+layout.server.ts` (serves `footerNav`),
  `src/theme/components/SiteFooter.svelte` (the array replaced by `page.data.footerNav`; the
  "a scaffolded site owner edits this list" comment rewritten to point at the yaml),
  `templates/waymark` (regenerated)

**Interfaces:**
- Produces: `footerNav` from `$theme/site-config.js`; `page.data.footerNav`.

- [ ] **Step 1:** the four edits; a `/admin/nav` save round-trips the document with the
  `footer` block intact (assert in the nav e2e or a unit test over `setMenu`); every baseline
  unchanged and every tile at AE 0; re-emit; full gate; commit.

**Acceptance criteria:** no nav array in a component; the yaml comment present; a nav save
preserves `menus.footer`; every baseline unchanged; the second-menu question in the harvest.

### Task 5: CSS conformance

**Files:**
- Modify: `src/theme/theme.css` (the two clamps to constants, the pair's comment, the
  derivation comment's final wording, `--cairn-caption-tracking` moved to a `tokens.css`
  default the theme may override), `src/chassis/tokens.css` (the caption-tracking default),
  `scripts/checks/check-public-tokens.mjs` (`site.css` joins `scannedFiles`; the `html {
  font-size }` exemption by name with its reason; a fourth `checkTokenResolution` source with
  the new parameter OPTIONAL so `scripts/lab/reskin-fixture.mjs` keeps compiling),
  `src/theme/site.css` (the three literals as `--site-*` properties), `src/chassis/README.md`
  (the "Class namespaces" paragraph), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** plant a literal color in `site.css` and prove the extended gate fails on it,
  then remove it; the exemption; the clamps; the token move; the paragraph; every baseline
  unchanged including `site-article-light-1920`, every tile at AE 0; `node
  scripts/lab/reskin-fixture.mjs` still runs; re-emit; full gate; commit.

**Acceptance criteria:** no degenerate clamp; no theme-only token a second theme would
dangle; `site.css` scanned by both halves of `check:public-tokens` and green, with the root
font-size exemption named; the convention stated; every baseline unchanged; the lab fixture
runs.

### Task 6: Small idioms

**Files:**
- Modify: `src/routes/admin/signups/+page.server.ts` (the three `platform!` assertions
  replaced by one guard at the top of each handler that returns `error(500)` with the
  existing log vocabulary when the binding is absent; the raw `requireOwner` shape and its
  comment kept), `src/chassis/feed.ts` (the `?.`/`!` mix on `posts` resolved to one guard),
  `docs/internal/public-design-system.md` (the four stale `examples/showcase/src/lib/*`
  occurrences at about `:5`, `:316`, `:317` repointed to `src/theme/theme.css`,
  `src/chassis/prose.css`, `src/theme/components/`; `:5`'s unpathed references made
  explicit; the engine's own `src/lib/render/*` and `src/lib/components/cairn-admin.css`
  references stay), `templates/waymark` (regenerated)

**Interfaces:** none new.

- [ ] **Step 1:** the two custom-screen tests (five assertions) green unchanged; `grep -n
  "platform!" examples/showcase/src` returns nothing; feed bodies byte-identical before and
  after; `admin-office-*` and `signups-*` baselines unchanged; the doc paths; re-emit; full
  gate; commit.

**Acceptance criteria:** as the step; the adoption still deferred and its comment present.

### Task 7: Waymark read as a first-time developer, and the rebake

**Files:**
- Modify: whatever the bounded read finds, always in `examples/showcase`; the read covers ONLY
  the scaffold's `README.md`, the `src/chassis` and `src/theme` file headers, `cairn.config.ts`,
  `site.config.yaml`, and `docs/extend/what-the-scaffold-wrote.md`; `examples/showcase/README.md`
  (its file table matches), `templates/waymark` (the final regeneration)

**Interfaces:** none new.

- [ ] **Step 1:** scaffold a fresh site from `templates/waymark` through the exact
  `create-site.yml` bake command into a temp dir; install; `format:check`; `test:unit`;
  `build`; the bounded read; fix each finding in the showcase source; anything template-only
  is a stop-and-report (the emitter has no per-file rewrite beyond the exclude idiom).
- [ ] **Step 2:** `grep -rn "showcase\|examples/" <scaffold>/src <scaffold>/README.md` returns
  nothing outside a named allowlist recorded in the report; re-emit; the scaffold job's local
  assertions; full gate; commit.

**Acceptance criteria:** a fresh scaffold builds, format-checks, and unit-tests green; the
grep clean outside the allowlist; `what-the-scaffold-wrote.md` and the README match the baked
tree; `check:template` green.

### Task 8: Records and the harvest (last)

**Files:**
- Create: `docs/internal/record/2026-09-04-chassis-inputs/chassis-b2-harvest.md` (the
  corpus decision and its trade, the content method on a fixture corpus, the second-menu
  editing question, the `check-public-tokens` scope argument, the CI regen loop's cost), the
  contact sheets for B2's changed surfaces (home, archive2, admin-office)
- Modify: `docs/superpowers/specs/2026-08-27-audit-remediation-initiative-design.md` (item 6
  and the publish paragraph: one cut after polish; the chassis work is three passes, A, B1,
  B2), `ROADMAP.md` (the chassis improvement round leaves the tier; polish's inputs by name),
  `docs/STATUS.md` (only stale wording), `CHANGELOG.md` (`## Unreleased`: `menus.footer`,
  `page.data.siteName` and `footerNav`, the archive page size; no `Consumers must:`),
  `docs/extend/migration-notes.md` (the same), `docs/internal/engine-rulings.md` only if a
  task produced a ruling, `docs/internal/docs-friction-log.md` (whole-log triage), the
  manifest (the `.missing` reconciliation)

- [ ] **Step 1:** the amendments, the sheets, the routing; `check:docs`, `check:rulings-format`,
  `check:vale`; commit.

**Acceptance criteria:** the initiative design agrees with STATUS and ROADMAP; no shipped
item remains in a tier; polish's inputs named; the changelog and migration entries present;
the friction log triaged; both harvests banked.

## Pass-end ritual

B1's ten steps in B1's order, with these differences: the verifier grades six surfaces and
`archive2` is a new surface (its `COMPOSED` line required); the reviewer fan-out is
`svelte-reviewer` (Tasks 3, 4, 6), `web-auth-security-reviewer` (Task 6's guard and Task 4's
yaml round-trip), `cloudflare-workers-reviewer` (Task 6's D1 guard); `design.yml`'s fixture
run joins the CI-only gate list by name; the post-mortem scores both budgets for B1 and B2
together against the original single-pass estimate. **Geoff merges.**

## What this pass hands forward

- **The identity seam pass** (next, per ROADMAP): nothing from here, and it must not touch
  the showcase's `admin/signups` exemplar, which polish owns.
- **Polish:** the `createSectionAction` adoption with its dev-package seam; the second-menu
  editing consultation; the `.cairn-card` no-real-use observation; the 404 if B1 carried it;
  the engine's `src/lib/components` Svelte lint wiring; the single-theme identity observation;
  the two cosmetic gaps the pass-end `visual-verifier` named (the home/archive2 double
  hairline above the pagination block, the "N entries" count reading the page rather than the
  archive total), filed to `ROADMAP.md`'s Next tier at this pass's close.
- **Release:** the window holds; ONE cut after polish, `check:template` at the cut.

## Post-mortem (2026-09-09)

**What was built.** All eight tasks landed on `chassis-b2` (stacked on `chassis-b`, itself
already merged to `main` as PR #51), 22 commits: the thirteen 2025-dated posts excluded from
the scaffold by path (`2e2dfcd5`, `4aac78db`, `3c6fcd2d`), the archive proven on the real
27-post corpus at `ARCHIVE_PAGE_SIZE = 13` with `/archive/2` real for the first time
(`8f47f098`, `1c8fc189`, and the CI baseline regen `4de378ec`), site identity read from one
server-side source with one title convention (`9e472aa7`), the footer nav moved into
`site.config.yaml`'s `menus.footer` (`7fd0bc81`), CSS conformance (`site.css` under
`check-public-tokens`, the degenerate clamps collapsed: `83a9c55a`, `ef9e3649`), the small
idioms closed (the three `platform!` assertions, the `feed.ts` guard mix: `b5dffd0a`,
`87a48160`), Waymark read as a first-time developer and rebaked (`9ea2763f`, `81e2d08b`), and
the records and harvest (`3b97188f`, `430090ed`). The code-simplifier (`2e5921d3`) and a
pass-end fix round closed the ritual: a `check:symbols` break from the identity rework
(`e6553813`), then four blocking findings from the pass-end reviewer fan-out fixed in one
round (`36a4e77d`, `79df0ebf`, `eb234d9c`, `2bad6688`).

**What was verified, with evidence.** Every task's own `diff-reviewer` round independently
re-ran the affected gates and re-compared tiles rather than trusting the implementer's report
(for example Task 5's reviewer planted a literal color and an unresolvable token in `site.css`
to prove `check-public-tokens`'s two halves actually fail before accepting that they pass).
The committed intended-moves manifest's `## B2` section confirms `magick compare -metric AE`
at 0 on every tile of every paint-neutral task (253 to 314 tiles per task across Tasks 3
through 6) and that Tasks 1 and 2's declared moves (`site-home-*`, then `archive2-*` new) match
the unmodified visual suite's own failure list name for name. The final full-gate run on
`HEAD e6553813` (before the fix round) reported `npm run check`: 1836 files, 0 errors, 0
warnings; `npm test`: 5060 unit and integration tests passed across 380 files plus 1370
component tests across 78 files; every named check green; a fresh `templates/waymark` scaffold
baked, installed, format-checked, unit-tested, and built green (Task 7); and the showcase
e2e's 20 `site-home-*`/`archive2-*` baseline diffs verified, by file-list diff against
`4de378ec`, as the pass's own already-documented CI/workstation font-rendering drift rather
than a regression, per the paint protocol's baseline rule. The pass-end reviewer fan-out
returned: `svelte-reviewer`, one blocking (archive2 shipped with no `h1` and an inverted
heading order the first time it rendered, tripping axe's `page-has-heading-one` and
`heading-order`) plus four non-blocking; `web-auth-security-reviewer`, one blocking
(`App.PageData` never declared `siteName` despite nine new readers, so a typo would have
compiled clean) plus eight non-blocking, and confirmed no auth, session, CSRF, or signing
surface changed; `cloudflare-workers-reviewer`, two blocking (the root layout's new
`siteMeta` import pulled the full render adapter and three eager content globs into every
`/admin`, `/members`, and 404 request; the showcase's site description silently regressed to
the generic fallback). The `visual-verifier`'s six-surface grade returned `pass: true`,
structural findings empty, three cosmetic (the pre-existing double-hairline gap and the "N
entries" count ambiguity, both filed to `ROADMAP.md`'s Next tier at this close since the
pass's own harvest commit had already landed before the verifier ran; one sub-pixel AE-56
rendering-noise tile). All four reviewers' blocking findings were fixed in one review-fix
round and re-verified against the code, not the report, before landing.

**Decisions taken in execution.** Task 7's `diff-reviewer` found the "first-time developer"
read's own fix incomplete against the freshly baked scaffold (the "complete" root tree
omitted `.prettierignore`, `.prettierrc`, and `vitest.config.ts`; a description sentence was
inaccurate; the showcase's own README had gone stale after Task 1 without being touched); the
ruling was one fix round (`81e2d08b`) rather than accepting the gap, since the task's whole
point was catching exactly this class of miss. Task 8's `diff-reviewer` caught that its own
ROADMAP edit violated the repo's own ledger rule (a pass shipping a roadmap item removes it
from the live tier rather than expanding the entry with what shipped): the chassis-improvement
bullet had grown by roughly ten lines of shipped narrative instead of leaving the Now tier; the
ruling was a same-task fix (`430090ed`) cutting it to a six-line pointer at the three plans and
two harvests. The pass-end reviewer fan-out's four blocking findings were, notably, none of
them caught by any individual task's own `diff-reviewer`: each was introduced incrementally
(Task 3's `siteName` plumbing, Task 7's description fallback) in a way that read as correct in
isolation and only became visible once the whole pass's diff was graded together, which is the
fan-out's job and is why it runs even after every task's own gate is green. The overnight run
halted once, mid pass-end ritual, at step `b2:capture-after` (a wall-clock/context guard
forcing the session to report, recorded on `main` at `0794774d`); a fresh session resumed from
the committed resume prompt and completed capture-after, records, simplify, verify, the
reviewer fan-out, and the review-fix round with no decision from Geoff.

**What a later pass would be wrong to rediscover.** The pass-end reviewer fan-out catches
defects individual task gates structurally cannot: a per-task diff-reviewer only ever sees one
task's diff against its own criteria, so a cross-cutting property (does every new
`page.data.siteName` reader have a type declaration; does the root layout's new import graph
stay lean) is invisible until the whole pass is read at once. A pass that banks its harvest and
ROADMAP routing (Task 8) before the pass-end verifier and reviewer fan-out run will miss
whatever they find; this pass's own harvest doc predates the verifier by nearly three hours
(`3b97188f` at 04:11, the verifier at 06:57), which is why its two cosmetic findings needed a
second pass at close to be filed. `admin/signups`'s post listing reads the dev backend's own
seeded fixture, never the public `src/content/posts/` directory, so a corpus-size ruling
written against the public archive (as this pass's Task 2 was) cannot assume it moves an admin
baseline too; verify the actual data source before predicting a baseline move. A local `CI=1`
e2e run drifts permanently from a CI baseline regen by a fixed, nameable file list
(font-hinting or subpixel differences between the workstation's ImageMagick/browser stack and
the CI runner's); treat any local failure outside that named list, not any failure at all, as
the real gate, and do not try to regenerate the drift away locally, since that only
reintroduces it against the next real CI regen.

**Budgets.** No chain-reported token total was recoverable from this close-out dispatch's own
session history (a fresh subagent with no visibility into the parent conductor's `/cost`
reading); reconstructed instead from the four `pass-execute-chains` workflow runs' own
subagent transcripts, summing each turn's `input_tokens` + `cache_creation_input_tokens` +
`output_tokens` (`cache_read_input_tokens` excluded as the standard discount convention). That
reconstruction likely still overstates true spend, since a long, tool-heavy agent conversation
re-embeds a growing prior context at each cache-creation breakpoint rather than only its new
tokens, so treat the figure as an upper-bound approximation, not the number of record if the
conductor's own accounting differs. By that reconstruction: Task 1's workflow run about 1.7M,
Task 2 plus its fix round about 1.1M, Task 3 plus its CI regen and the mid-pass halt about
1.0M, and Tasks 4 through 8 plus the full close ritual (the halt-and-resume, four
`diff-reviewer` fix rounds, the three-reviewer fan-out, the `visual-verifier`, and the
code-simplifier) about 8.7M, for an execution total near 12.5M; adding this close-out
dispatch's own reported spend of about 0.18M puts the pass near 12.7M against its 6M ceiling,
roughly double. The overrun concentrates in the pass-end ritual: four of the five tasks from 4
onward needed a `diff-reviewer` fix round, and the halt-and-resume added a second cold start
mid-ritual, both costlier than the plan's own per-task estimate assumed. Attended time: zero
planning misses (nothing surfaced after approval that a planning question would have caught);
zero execution sittings, since the one halt was a wall-clock and context guard resuming from
its own recorded prompt with no decision pulled from Geoff, not a genuine blocker.
