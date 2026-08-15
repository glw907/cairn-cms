# Pass D: the documentation rebuild

> **For agentic workers:** executed by a fresh Opus 5 conductor session in its own worktree
> off `main`, dispatching each implementable task to `cairn-implementer` (pinned Sonnet);
> the main loop reviews each diff and confirms the relevant gates before the next dispatch.
> Tasks marked **[main loop]** are cross-repo, external-tooling, or judgment-bearing. Any
> concrete path, count, or code shape this plan names is a claim to verify at the first
> task that touches it, never an instruction to follow blind (the T4a-through-T4d lesson,
> six times now).

**Goal:** build cairn's documentation from the ground up for the four audiences (admin,
editor, extender, contributor), written clean-room against the code and the tool's
recorded runs; then remove the old corpus in one cutover that rewires every gate, so
release one cuts with documentation that matches the product it publishes.

**This is a rebuild, not a refactor (Geoff, 2026-08-14).** Today's guides, tutorials, and
explanation pages are not repaired, moved, or mined during writing: repairing them is
complex and expensive, and mining them would pollute the effort. They are deleted at
cutover. The one exception is the reference arm, which is machine-gated against the code
and current; it is kept and touched, not rebuilt. A mining sweep over the old corpus runs
only after the new docs are fully baked, as a completeness check.

**Spec and inputs.** The umbrella
([`2026-08-09-admin-setup-and-docs-reset-design.md`](../specs/2026-08-09-admin-setup-and-docs-reset-design.md),
Part 2 and its Pass D acceptance criteria) governs, as amended by the rebuild ruling
above. Four inputs banked at the 2026-08-14 planning sitting govern the content and review
work and supersede this plan where they are more specific: the **audience profiles**
(`docs/internal/2026-08-14-audience-profiles.md`, the grading rubric), the **competitor
review** (`docs/internal/2026-08-14-cms-docs-competitor-review.md`, whose closing rules
are adopted doctrine), the **track outlines**
(`docs/internal/2026-08-14-docs-track-outlines.md`, revised at a five-reviewer
adversarial gate; its page set, contracts, and anatomies are the target state; its
"absorbs X" annotations read as job provenance, never as instructions to copy prose),
and the **review methodology**
(`docs/internal/2026-08-14-docs-review-methodology.md`, the five-stage gate sequence
and reliability rules for every Claude-reviews-Claude pass in this plan, researched
against the measured failure modes of LLM-written docs and LLM-as-judge bias).
The admin track's evidence base is the baseline walk
(`docs/internal/2026-08-unagented-setup-baseline.md`; drag points 2, 4, 5, 7, 8, 9, 10,
11, 12, 13, and 14 are defects the new pages must not reproduce) and the live run
records (`docs/internal/2026-08-13-t5-task8-live-e2e.md`,
`docs/internal/2026-08-13-t4d-task7-live-proof.md`).

**Three phases, three worktrees, each merging to `main` green before the next branches.**
Phase 1 (Tasks 1-3) is standards and targets. Phase 2 (Tasks 4-8) is the clean-room
build, landing the new tree beside the old one so `main` stays releasable throughout
(the old arms remain canonical in the tarball until cutover). Phase 3 (Tasks 9-14) is
the mining sweep, the cutover, the consumers, and the final adversarial production
gate. Within a phase, the T4d rule stands: a
second in-flight task split means proposing a further pass split, not absorbing it.

## Rulings made at plan time (approve or veto at the plan gate)

1. **`docs/editors/` moves to Vale's Microsoft package**, vendored beside Google; every
   other published track stays on Google.
2. **The resume table lands as the admin track's setup recovery page** (closes STATUS
   carry-forward 7 and baseline drag 10).
3. **cairn-pub work is prepared in-pass and merged at the site walk**, proven against the
   packed tarball; it cannot build against the registry until release one publishes.
4. **No published page cites Diátaxis.**
5. **ROADMAP reconciliation is explicit:** P6 is absorbed by the front-door task, P7 by
   the tool's chapter 1 plus the create-your-site page; both marked absorbed with
   pointers.
6. **Ground-up rebuild (Geoff, 2026-08-14):** the old guides, tutorial, and explanation
   arms are removed at cutover, not repaired; the reference arm is the kept exception.
7. **Clean-room discipline (Geoff, 2026-08-14):** Phase 2 writers do not read the old
   corpus. Permitted inputs: source code (ground truth), the recorded run transcripts
   and live-proof records, the doctor's condition table, the specs, and the three banked
   input docs. The mining sweep (Task 9) is the only task that reads the old arms, and
   it runs only after the new tracks are written and profile-graded.

## Global constraints

- Docs prose: the Google standard under Vale plus the register standard as Task 3
  rebuilds it (profiles, anatomies, track registers); never names ASC publicly;
  `docs/editors/` under Microsoft per ruling 1.
- **No version bump, no publish.** The `CHANGELOG.md` entry stays under `## Unreleased`
  with a `Consumers must:` line for the docs-tree consumers (cairn-pub's loaders,
  bookmarked `/docs/<arm>/<stem>` URLs).
- **`CHANGELOG.md` history is immutable**: old entries keep their old paths;
  `scripts/checks/docs-links.mjs` learns a legacy-path map applied to `CHANGELOG.md`
  only (Task 10).
- **Quoted tool output traces to a recorded transcript or a freshly captured run.**
  Invented output is a defect, and the transcript gate (Task 4) makes drift mechanical
  to catch.
- **No stub ever ships**, at page level and inside a page: no "coming soon," no
  unresolved marker, no section naming an unrecorded tool state.
- **Every rewired or new gate is proven red once** before it is trusted green.
- Root `CLAUDE.md` has no context headroom: Task 11's path chase trims at least as much
  prose as it adds.
- The full docs gate list runs in whole at each phase close, re-derived (never restated
  from memory) with `grep -l pull_request .github/workflows/*` before each merge:
  `check`, `test`, `check:comments`, `check:docs`, `check:arm-indexes`,
  `check:reference`, `check:reference:signatures`, `check:package`, `check:snippets`,
  `check:surface`, `check:readiness`, `check:prose`, `check:version`,
  `check:dev-package`, `check:consumers`.

---

## Phase 1: standards and targets

### Task 1: the friction-log triage

**Files:** modify `docs/internal/docs-friction-log.md`, `ROADMAP.md`.

Self-contained and dispatchable first. The log holds 19 open findings;
complete-or-move governs, with one rebuild simplification: **a finding about prose in a
page slated for deletion closes as superseded by the rebuild** (its job, if real, is
already in the outlines); engine and code findings triage normally.

- [ ] Verify each finding against current code; delete (with evidence named), promote to
  the ROADMAP tier where it bites with its trigger, convert to a `// WATCH:` comment, or
  close as superseded by the rebuild.
- [ ] The refused-action editor cluster: produce the written recommendation (does it earn
  its own pass?); the refused-save-frontmatter finding files to ROADMAP regardless.
- [ ] Entry 19 (the T2 hardening tail): its trigger has fired twice; re-triage or delete
  per its own text.
- [ ] The setup-walk entry stays open until Phase 3 ships what it names; Task 14 closes
  it. Tags rename in Task 3.

**Acceptance:** only verified-live findings remain; every removal names its evidence;
the cluster recommendation exists in writing.

### Task 2: the target manifest

**Files:** create `docs/internal/2026-08-14-pass-d-target-manifest.md` (a dated process
artifact, filed to the record side per Task 3's rule).

The rebuild's planning document: what gets built, from what inputs, and what the cutover
must touch. No move map; the old corpus's only appearances here are the deletion list
and the redirect map.

- [ ] The target page set, confirmed from the outlines with each outline claim verified
  against the code the way the gate did (it found two code-contradicted passages;
  expect more). Every page carries its contract line and its **input list: the code
  modules, transcript records, spec sections, and reference pages that ground it. Old
  guides, tutorial, and explanation pages never appear in an input list (ruling 7).**
- [ ] The deletion list: every old page removed at cutover (the guides, tutorial, and
  explanation arms, plus `reference/authoring-syntax.md`), and the redirect map from
  every old published path (`/docs/<arm>/<stem>`, `/help/<stem>`) to its nearest new
  page, consumed by Task 12.
- [ ] The cutover gate bill, re-derived against the current tree: `package.json`
  `files`, `check-package-files.mjs` allowlists and fixtures, `check-arm-indexes.mjs`
  `ARMS` (plus the `why-cairn` front-door mapping and the new `docs/internal`
  entry), `check-snippets.mjs` `DOC_DIRS`, `reference-coverage.mjs` and
  `check-reference-signatures.mjs` CONFIG, `check-readiness.mjs` `DOC` plus the 21
  `docsAnchor` slugs in `src/lib/diagnostics/conditions.ts`,
  `src/tests/unit/github-slug-contract.test.ts` corpus, `.vale.ini`, and
  `docs-links.mjs` (legacy map; the `## Unreleased` pairing repoints to
  `extend/migration-notes.md`).
- [ ] The LIVE-UI stance recorded: the seventeen markers die with their pages; a new
  page earns a live reproduction through the `/help` pipeline or carries nothing (the
  no-stub rule applies inside pages).

**Acceptance:** every target page has a contract and a clean-room input list; every old
page appears exactly once in the deletion list with a redirect; the gate bill names
every file the cutover edits.

### Task 3: the standards layer

**Files:** rewrite `docs/internal/docs-register.md`; modify `.vale.ini` (vendor the
Microsoft package under `.vale/styles`); modify `docs/internal/docs-friction-log.md`
(tags), `docs/internal/README.md`; move record artifacts to `docs/internal/record/`;
modify `scripts/checks/check-arm-indexes.mjs`.

The standard is rebuilt before any page is written, because the clean-room writers
write to it.

- [ ] `docs-register.md` rebuilt: the keystone and universal contract stay; the four
  audience profiles fold in as each track's grading rubric; the page anatomies from the
  outlines (task guide, tutorial milestone, reference entry with narrative lede,
  condition entry, symptom row, recovery row) are encoded; the track registers replace
  the arm registers; the front-door register updates for five-route audience routing;
  the stale page count dies.
- [ ] `.vale.ini` gains `[docs/editors/**]` on the vendored Microsoft package (confirm
  it runs offline the way Google's does); the new track paths scope Google.
- [ ] The friction-log tag vocabulary becomes the four audience names (`operator:`
  retires into `admin:`); the log's header rules update.
- [ ] The internal zone: dated artifacts move to `docs/internal/record/`,
  `docs/internal/README.md` becomes the curated live index with the filing rule, and
  `check:arm-indexes` gains a non-recursive `docs/internal` entry so an unindexed
  top-level internal doc fails CI; proven red with a temporary unindexed file.
- [ ] **The symbol sweep** (the methodology's stage-0 defense against hallucinated
  names): a check script that extracts every code-voice token a published page names
  (exports, CLI flags, config keys, env vars, event names, file paths) and resolves
  each against the source tree, failing on any name the code does not carry. Built now
  so Phase 2's pages are written under it; proven red with an invented flag.

**Phase 1 close [main loop]:** full gate, push, PR, checks green, merge. STATUS notes
the phase. Prep the context clear.

---

## Phase 2: the clean-room build (fresh worktree off the merged `main`)

The new tree lands beside the old arms: `docs/admin/`, `docs/editors/`, `docs/extend/`,
`docs/why-cairn.md`, and the rewritten front doors. The old arms stay canonical in the
tarball until Phase 3; `check:docs` covers the new pages (their links must resolve), and
the enumerating gates ignore directories they do not list. **Every writing dispatch
carries ruling 7 verbatim and the page's input list from the manifest; a dispatch that
needs a fact the inputs do not carry captures it from the code or a run, never from an
old page.** Each track task ends with a per-track review run per the methodology's
scaling rule (stages 0, 1, and 4 plus the single-track persona walk), graded against
the track's profile and the register standard; the writer's own context never grades
its track, and every finding carries a quoted line, a named criterion, and a proposed
change or is discarded.

### Task 4: the admin track

**Files:** create `docs/admin/` per the outline (index, `before-you-start`,
`create-your-site`, `own-your-domain`, `is-it-working`, `setup-recovery`,
`invite-editors`, `troubleshooting`); create the transcript-check script and its
fixtures.

- [ ] The eight files per their outline contracts, written from the tool's source and
  the recorded runs. The non-negotiables from the gate: the three admission prices with
  the confirm-every-row token warning; the free-until-second-writer boundary stated at
  the fact sheet and the chapter-1 finish line; "Getting back in" (`--sign-in`, the
  ten-minute token, verified against `bootstrap.mjs`); the two-door fork with price and
  default, **the button half staged on the T5a' spike** (written CLI-first; the
  button's quoted flow lands when the spike records it, inside the release-one window;
  no stub in between); the push-to-deploy-only fork opening `own-your-domain`, its two
  tokens as two admission prices, and the existing-domain "stop and talk to whoever
  runs your DNS" branch (the modal narrative takes the externally-registered live run,
  STATUS carry-forward 1, as its input, or ships the branch in its place and says so);
  browser-moment counts per chapter on the pages that own them; the instrument-keyed
  three-line router atop the three diagnostic pages; `is-it-working` written to the
  condition-entry anatomy with the anchor set the readiness contract will pin at
  cutover.
- [ ] **The transcript gate:** every fenced transcript block in `docs/admin/` compared
  in CI against a recorded fixture, proven red by editing a quoted line.
- [ ] Platform rules: no GNU-only command without a macOS branch; no placeholder ids;
  vendor dashboards linked and named, never restated or pictured.
- [ ] Fresh-context review against the admin profile; findings folded before the task
  closes.

### Task 5: the editors track

**Files:** create `docs/editors/` per the outline (index, `welcome`,
`write-in-the-editor`, `publish-and-history`, `when-something-goes-wrong`,
`add-an-image`, `manage-the-media-library`, `manage-your-tag-vocabulary`).

- [ ] The eight files per their outline contracts, written from the admin components'
  actual behavior (the code), the refusal strings in `content-routes-core.ts` and the
  taxonomy enforcement, and the log-event vocabulary. The non-negotiables: sign-in
  opens `welcome`; the two-tier index is the `/help` sidebar, outcome-phrased, written
  for the reader who arrived stuck, repeating nothing from the admin Help home;
  `when-something-goes-wrong` quotes the real message strings and states the true
  conflict behavior (a refused save keeps the typing; verified against `EditPage`'s
  seeding); the image boundary contracts (formats and HEIC live on the library page);
  alt-text doctrine has one home; the tag page names its actor; `::include` and the
  `cairn:` token are documented where the author meets them.
- [ ] Track rules: Microsoft register; no outbound links to other tracks; no markdown
  demo heading at `h2`; live reproductions only where earned, else nothing; a dated
  change-note footer per page.
- [ ] Fresh-context review against the editor profile; findings folded.

### Task 6: the extend track

**Files:** create `docs/extend/` per the outline (index, `build-a-site-by-hand`, the
23 guides, the 6 concept pages).

- [ ] The files per their outline contracts, written from the engine source, the
  reference pages, and the specs. The non-negotiables: the deep path holds its line
  budget, pulls deploy into the first third, links task guides at credential
  milestones, and is written against a fresh `npx sv create` run (the adapter lives in
  `vite.config.ts` now); `add-cairn-to-a-sveltekit-app` and `what-the-scaffold-wrote`
  serve the two reader states the gate found unserved; `declare-your-own-concept` owns
  concept declaration; `upgrade-cairn` is the short task and `migration-notes` the
  record (seeded from `CHANGELOG.md`, which is a permitted input: it is the immutable
  record, not the old docs); `debug-your-site` carries the code-fixable symptom rows;
  the index carries the groups, the adapter-precondition sentence with its two
  producers, the vocabulary section, the stability statement opening the operate
  group, and the cross-track block to the admin diagnostic pages.
- [ ] Fresh-context review against the extender profile; findings folded.

### Task 7: the front doors

**Files:** rewrite `README.md` and `docs/README.md`; create `docs/why-cairn.md`.

- [ ] The ordered spec: one-sentence what-is line, the copyable command, the five
  routes (evaluator first; the admin and extender lines carry the discriminator and
  the default), all in the first screenful; positioning below; no showcase
  instruction, no "planned" scaffolder residue, no Diátaxis citation, no vocabulary
  section (it lives in the extend index).
- [ ] `why-cairn.md` written fresh to the evaluator: the why, the honest trade-offs,
  the reasons not to use cairn; costs cited from the admin fact sheet, not restated.
- [ ] Fresh-context review against all four profiles' routing questions (does each
  reader recognize their door?).

### Task 8: the reference touch-ups

**Files:** modify `docs/reference/README.md` and reference pages per the outline.

The kept arm. Not clean-room (it is gated against the code and stays), and not a
rebuild: ledes and index corrections only.

- [ ] Each reference page gains its short narrative lede; the index corrects its
  non-export-page miscount, gains the "also for site admins" grouping (`doctor`,
  `log-events`, `supported-toolchain`), and `reference/core.md`'s fields section gains
  the widget-and-validation table (the `structured-fields` job) under its lede.
- [ ] The admin and extend pages link these by name, citing rather than restating
  version facts. `authoring-syntax.md` is untouched here; it dies at cutover.

**Phase 2 close [main loop]:** full gate (the old arms still green and canonical), the
per-track profile grades on record, push, PR, merge. Prep the context clear.

---

## Phase 3: mine, cut over, consumers (fresh worktree off the merged `main`)

### Task 9: the mining sweep

**Files:** a findings report in `docs/internal/record/`; folds applied to the new tree.

**The only task that reads the old arms, and it runs only now, with the new docs fully
baked (Geoff's ordering, 2026-08-14).** A fresh-context sweep reads the old corpus
against the new tree and reports, ranked: facts, worked examples, warnings, and edge
cases present in the old pages and genuinely absent from the new ones.

- [ ] Every candidate find is verified against the code before folding (the old corpus
  contains known code-contradicted prose; nothing folds on the old page's authority).
- [ ] Folds land as edits to the new pages in their own register; a find that would
  add a page goes to the ROADMAP, not the tree (the page set is the approved outline).
- [ ] The report records what was checked and what was declined, so the deletion is
  auditable.

### Task 10: the cutover

**Files:** delete the old arms per the manifest's deletion list; edit every file in the
manifest's gate bill; `CHANGELOG.md`.

- [ ] Delete `docs/guides/`, `docs/tutorial/`, `docs/explanation/`, and
  `reference/authoring-syntax.md`; rewire every gate in the bill (files array,
  packaging allowlists and fixtures, ARMS with the `why-cairn` mapping, snippet dirs,
  reference CONFIG, the readiness `DOC` and the track-aware `docsAnchor` slugs with
  `npm test` proving the three-way contract and one wrong-anchor mutation proving it
  can fail, the slugger corpus, Vale paths, and the `docs-links.mjs` legacy map with
  the `## Unreleased` pairing repointed).
- [ ] Each rewired gate proven red once; full gate green at task end; `npm pack
  --dry-run` inspected (the tarball ships the new tracks and nothing dead).
- [ ] The `CHANGELOG.md` `## Unreleased` entry finalized with the `Consumers must:`
  line naming the tree change and the cairn-pub migration.

### Task 11: the outside edges **[main loop]**

**Files:** root `CLAUDE.md`, `docs/internal/docs-maintenance.md`,
`~/.claude/skills/cairn-pass/SKILL.md`, `CONTRIBUTING.md`, agent memories; the drift
routine via the schedule tooling.

- [ ] The three `CONTRIBUTING.md` edits (track-aware arm list and map, the
  which-track rule, the scope paragraph linking `what-cairn-is-and-is-not.md`), plus
  the `docs-links` pairing's contributor-facing mechanics documented here.
- [ ] Prose path chasing: `CLAUDE.md` (trimming at least as much as it adds),
  `docs-maintenance.md`'s machine-layer table, the `cairn-pass` skill's docs step, any
  memory naming an arm path.
- [ ] The drift routine (`trig_015UPQostYVisXuExTHTH2vu`): verify what it samples; if
  repo paths, re-scope now; if cairn.pub URLs, the re-scope rides the site-walk sitting
  that merges Task 12's branch, recorded as a STATUS hand-off line. Either way it must
  fail loud when its sample set stops resolving.

### Task 12: cairn-pub, prepared **[main loop]**

**Files:** in `~/Projects/cairn-pub`, on a branch:
`src/lib/docs/{loader,link-policy,link-check}.ts`, the `/docs/[...path]` and
`/help/[guide]` routes, the loader tests,
`src/theme/components/GettingStartedPanel.svelte`, the redirect map.

- [ ] The loader consumes the track tree (`/help` derived from the editors index; the
  arms union; tutorial stems reworked; `link-policy.ts` fail-loud on unknown
  prefixes); the redirect map from the manifest covers every old `/docs` and `/help`
  URL; the LIVE-UI reproductions the editors track earned render through this
  pipeline.
- [ ] Proven against the packed tarball (`npm pack` from the Pass D tree, `file:`
  install, site builds green and renders the tracks). **Not merged** (ruling 3): the
  branch and its proof evidence recorded in STATUS; the site walk merges it after
  release one.

### Task 13: the production gate, a final adversarial review **[main loop]**

**Runs on the post-cutover tree, after the mining folds: the exact bytes release one
ships.** The whole-corpus gate (Geoff, 2026-08-14), executed per the review
methodology (`docs/internal/2026-08-14-docs-review-methodology.md`), which owns the
stage definitions, the reliability rules, and the findings pipeline; this task is its
full five-stage form.

- [ ] **Stage 0, mechanical:** the full lint-and-execution battery, including the
  symbol sweep and the transcript gate, green before any model review runs.
- [ ] **Stage 1, the claims sample:** per track, decomposed claims traced to current
  code or recorded runs, numeric claims exact; two confirmed misses of one class
  escalate to a full sweep of that class.
- [ ] **Stage 2, blind persona walks:** one fresh agent per track under knowledge
  suppression, completion-measured (guesses and dead ends are the findings, opinions
  are inadmissible): the admin walks create-through-recover, the editor walks
  first-day-through-refusal against `/help`'s rendered order, the extender walks
  evaluate-through-first-custom-screen, the contributor walks CONTRIBUTING to a
  first-PR question.
- [ ] **Stage 3, the fishtank read:** one cross-track reviewer, per-edge findings
  only, including the redirect map against the cairn-pub branch's rendered preview.
- [ ] **Stage 4, the register pass** over every new page.
- [ ] The findings pipeline per the methodology: quoted line + named criterion +
  proposed change or discarded; forced rankings; independent find-then-verify on
  everything blocking-tier, empirical where executable. Blocking findings fold before
  the pass closes and **release one does not cut until they are folded**; the ranked
  report and dispositions land in `docs/internal/record/`. **Geoff's human read of
  the editor track is part of this gate** (the novice-comprehension instrument no
  LLM pass substitutes). This gate's shape is a natural Workflow-tool
  find-and-verify sweep; the conductor names the moment and Geoff opts in or the
  fan-out runs as plain parallel dispatches.

### Task 14: pass close **[main loop]**

- [ ] ROADMAP reconciliation (Pass D done; P6 and P7 absorbed per ruling 5; the
  editor-cluster filing from Task 1; the admin update page filed to arrive with the
  tool's upgrade verb; the friction log's setup-walk entry closed).
- [ ] Post-mortem appended here; STATUS rewritten (next action: release one via
  `cairn-release`, restating the same-cut obligations: `create-cairn-site`,
  `@glw907/cairn-cms-dev`, the template repo, T5a' with the button spike feeding Task
  4's staged block); the initiative memory refreshed.
- [ ] Phase 3 merges via PR with all checks green; the cold-start test runs before the
  session closes.

## Exit criteria

The umbrella's Pass D acceptance as amended by the rebuild ruling: the four tracks
ship, written clean-room and graded against the audience profiles; the old corpus is
deleted with every published path redirected; every gate in the bill passes, including
the readiness contract, the packaging allowlist, the re-scoped anchor corpus, and the
three gates this plan adds (the admin transcript check, the symbol sweep, and the
internal-index entry); the Task 13 production gate has run all five stages with its
blocking findings folded and Geoff's editor-track read done; the
mining sweep's report is on record with every fold code-verified; the cairn-pub branch
is proven against the tarball with its redirect map and fail-loud link policy; the
CHANGELOG keeps its history via the legacy-path map; the drift routine's scope is
handled at the boundary Task 11 rules; the front doors route five ways by name; the
reference lands at 23 pages with the corrected index; and no published page describes
tooling that is not installable in the same cut, which release one satisfies by
publishing the tool, `@glw907/cairn-cms-dev`, and the template repo together with this
tree.

## Post-mortem (2026-08-14)

### What was built

Four audience tracks replace the old guides, tutorial, and explanation arms: `docs/admin`
(8 pages), `docs/editors` (8 pages), `docs/extend` (31 pages), and the kept `docs/reference`
arm (24 pages, ledes and index corrections rather than a rebuild; the exit criteria above
say 23, an estimate the finished tree overran by one). Three gates ship alongside:
`check:vale` (Google's package on three tracks, Microsoft's on `docs/editors`),
`check:symbols` (the hallucinated-symbol sweep, resolving every code-voice token a
published page names against the source tree), and a non-recursive `docs/internal`
arm-index entry. The old corpus is deleted at cutover; `CHANGELOG.md`'s history survives
it through a legacy-path map that self-checks (a mapped value must name a file that
exists, a mapped key must not, and every key must still be cited by a live link).

### The gate found what four earlier rounds missed, and it failed

Task 13's five-stage gate ran ten lens agents against the finished, post-cutover tree:
four claims sweeps, four blind persona walks, one fishtank cross-track read, one register
pass. **All four persona walks stopped short of their goal**, and this is the pass's single
most important result, not a footnote to soften. The admin walker could not make the
doctor's skipped Cloudflare, D1, and GitHub App checks actually run. The editor walker
could not find the sign-in page's address, at step one of page one, the very first
instruction in the track. The extender walker reached a `defineAccess` gate needing a role
vocabulary no earlier page produced. The reference walker could not learn which adapter
key turns on media or which enables the nav editor, because two pages named the same
things two different ways. Every one of these pages had already cleared a fresh-context
review at the end of its own writing task (stages 0, 1, and 4 of the review methodology,
plus a single-track persona walk, per track). What caught what four earlier review rounds
missed was knowledge suppression: an agent briefed with only what its own track states,
told to record a gap as a guess rather than fill it silently, forced to hit the exact wall
a first-time reader hits. Every earlier reviewer already knew the missing fact, because it
had read the code to write the page in the first place, and that knowledge is exactly what
a blind walk withholds. A review that already knows the answer cannot find the question a
reader never gets to ask.

### The verification cap, and what it hid

The gate's own verify stage was written `verifiable.slice(0, 24)`, and the findings array
it sliced was built in a fixed lens order: the four claims sweeps first, then the four
walks, then the fishtank read, then the register pass. Slicing the front of that array
drew 24 findings almost entirely from three of the four claims sweeps (`docs/admin`,
`docs/editors`, and 2 of `docs/extend`'s 18) and reached zero findings from `docs/reference`'s
claims sweep, zero from any of the four persona walks, zero from the fishtank read, and
zero from the register pass, 94 findings total left dark. The cap was silent: nothing in
the gate's own output flagged that three-quarters of its lenses went unverified. A
follow-up run closed the gap, verifying all 93 (94 minus one, `docs/extend` claims rank 2,
already covered) findings the cap had skipped, deliberately sampled across every lens
rather than off the front of the array. **The lesson to carry forward: sample a capped
verification stage across every lens the findings came from, never off the front of a
combined array, and log what the cap drops even when time or budget forces one.**

### The refutation rates, and what they say about batching

The gate's own verify stage ran one verifier per finding: of the 24 it checked, 19
confirmed, 3 narrowed, and 2 refuted, an 8% refutation rate. The follow-up run batched
findings 8 to 16 per verifier dispatch, one dispatch per lens-and-track slice: of the 93
it checked, 92 confirmed or narrowed and 1 refuted, a rate near 1%. State this plainly
rather than reading it as a clean bill of health: **an order-of-magnitude drop in the
refutation rate when the only thing that changed was batch size is a suspicious result,
not a reassuring one, and the likeliest explanation is that batching cost rigor rather
than that the batched findings were genuinely ten times more reliable.** A single verifier
working eight to sixteen findings in one dispatch has less room, per finding, to run the
kind of adversarial re-derivation (misquote check, empirical execution, refutation
attempts) that produced the gate's own 8% and the follow-up's own occasional strong
refutation. A future gate should keep one verifier per finding for anything blocking-tier,
batching only for lower-stakes or advisory findings where a lower hit rate is an
acceptable trade for coverage.

### What the rebuild ruling bought

The ground-up rebuild ruling (docs written clean-room against the code and the recorded
runs, the old corpus read only by the Task 9 mining sweep after the new tracks were fully
baked and profile-graded) meant the mining sweep found little the new tracks had lost.
Its report found exactly one gap page-shaped enough to matter: the old corpus's academic
case for markdown over rich-text editing and its tool-by-tool competitor comparison have
no home in the new tree, filed to `ROADMAP.md`'s Later tier as a register question rather
than folded as a sentence. Everything else the sweep checked against the old pages was
already covered, or covered better, because the new pages were written from the code
rather than migrated from prose that had drifted from it. The `sv create` and anchor-count
corrections below are the other side of that same coin: clean-room writing does not
protect a page from a fresh mistake, but it means the pass caught its own mistakes against
the code rather than inheriting the old corpus's.

### Verified claims that turned out wrong, as a standing caution

Two claims this pass itself made, on its own record, and later corrected. Both checked a
proxy for the tool's actual current behavior rather than the tool itself.

**A `sv create` verdict that cited this repo's own showcase instead of running the tool.**
Task 2's target manifest first read `examples/showcase/svelte.config.js`, this repo's own
hand-maintained tree, and reported no toolchain drift on the strength of it. That answers a
different question than the one asked (`docs/internal/record/2026-08-14-pass-d-target-manifest.md`,
"The toolchain-drift finding"). Running `npx sv@latest create --template minimal --types ts
--no-add-ons` (sv 0.17.0) found the real answer: a current scaffold emits no
`svelte.config.js` at all, wiring the adapter inside `vite.config.ts` instead, which is
worse than the baseline walk's own drag-point-11 finding had it (not merely a stale file,
no file to edit).

**An anchor count the conductor "corrected" wrongly with `grep -c`.** The track outlines
said `is-it-working.md` keeps its 20 anchors; the target manifest's own review pass
"corrected" that to 21, sourced from `grep -c "docsAnchor"` over `conditions.ts`, which
counts the interface's field declaration alongside the real assignments, one too many. The
outline had been right; the manifest's own correction was wrong, and stood until Task 9
re-derived the true count (21 conditions, all 21 now carrying a `docsAnchor`, 17 distinct
anchors). Both incidents are a proxy read passing for verification: a repo's own tree
standing in for the tool it was built from, a text-matching tool count standing in for
reading the source. Neither survived contact with running the actual thing.

### A fold-coverage gap this close-out found, not the gate

Writing this record's Dispositions section (2026-08-14) surfaced a defect in Task 13's own
fold stage, after the gate had already reported done. Two of the five fold dispatches
(`docs/editors`, `docs/extend`) were instructed to act on the gate's original 24
first-round verdicts as well as the second-round batch each was handed, and one of them
(`docs/editors`) acted on neither: it folded eight second-round findings and zero of its
ten first-round claims-sweep findings, leaving eight CONFIRMED or NARROWED defects
unfixed and unflagged in the tree it reported clean. `docs/extend` folded one of its two
first-round findings and missed the other. `docs/admin`, the one track whose fold
dispatch explicitly enumerated and cited every first-round rank by number in its own
report, got all of them. **A fold agent's own summary is not evidence its scope was
complete; verify a fold's coverage against the input list it was handed, not against what
it says it did.** The nine missed findings are filed to `ROADMAP.md`'s Now tier rather
than fixed here, since fixing them falls outside this close-out's own scope (no page in
`docs/admin/`, `docs/editors/`, `docs/extend/`, or `docs/reference/` changes in this pass).

### Task 14, and what the close itself corrected

The close ran in a session resumed cold after the workstation lost power mid-Task-14, which
made the pre-baked artifacts the whole handoff and tested them for real. They held: the branch
STATUS entry named the worktree, the resume prompt, and the exact record to fold, and the
resumed session reached the same next action from them without re-deriving the pass. What it
did have to check by hand was how far the interrupted close had actually got, since a plan
whose task list never ticks its own checkboxes gives a cold reader no progress signal. The
commits answered it instead. **A pass whose plan does not tick boxes should say in its STATUS
entry which task is in flight, not only which is next.**

Three corrections landed in the close itself, each a case of a document describing an earlier
state of the same pass:

- The production-gate record's Summary counts still read 105 folded and 9 owed, the pre-re-fold
  split, while its own Dispositions section two thousand lines above already recorded the
  re-fold. Corrected to 114 folded.
- The ROADMAP was reconciled except for one Task 14 item, the admin track's missing update page,
  which is now a rider on the Go successor tool entry, where the upgrade verb it waits for
  lives. Filing it forward without an owner is what would have lost it.
- STATUS's consumer table said cairn-pub was a docs shell six minors behind the engine, which
  Task 12's own correction to the table above it had already falsified. Two carry-forwards also
  retired: no published page carries a mermaid diagram any more, so the 320/390 legibility item
  is moot, and the breadcrumb duplication rode the deleted arm structure.

### Budgets

Human interaction points across the pass were low for its size: the plan gate with seven
rulings, the Workflow opt-in for Phase 2, the rebuild ruling, and the ruling that the nine
skipped findings be folded rather than filed. None was avoidable and none was a defect. The
one still outstanding is deliberate and is the pass's own instrument, Geoff's read of the
editor track. The token figure belongs to the usage console rather than this file; the shape
worth recording is that the expensive part was not writing the corpus but verifying it, and
the verification round the cap forced was the single largest avoidable cost.
