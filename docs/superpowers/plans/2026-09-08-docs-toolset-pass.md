# Docs Standard, Plan Two of Three: the toolset and the harvest

> **Plan two of three; plan one is the Claude infrastructure pass, which lands first.** Plan one
> is the owner's dotfiles and poplar pass carrying spec unit 3c: the workstation setup and the
> tellgrader docs-register profile. Unit 3c and its chain are removed from this plan entirely.
> Plan three is the docs rewrite, spec unit 5.
>
> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` → `diff-reviewer` → gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js`: one preflight task (P), then FOUR concurrent
> chains (H, C, G1, G2), joined by the demonstration chain (D) and closed by the records chain
> (R). Steps use checkbox syntax for tracking. P runs in the main loop on `main`. Chains H, C,
> G1, and G2 each run in their own worktree off `main` (`.claude/worktrees/docs-h`, `-c`, `-g1`,
> `-g2`). D and R run after every chain merges, in one worktree off the merged `main`.
> REVISION 1, authored 2026-09-08 against spec revision 3
> (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`, whose "Owner decisions" section
> records the owner accepting all seven recommendations) and the plannability review
> (`docs/internal/record/2026-09-08-polish-inputs/docs-spec-review-plannability.md`). Anchors
> and line counts verified against `main` at `d565ab77`; re-verify at dispatch, since polish-C
> merges first and moves many of them.

**Goal:** hand plan three, the docs rewrite, the nine artifacts it cannot be authored without: five
fact ledgers, a page type for every published page, an approved corpus, twelve templates, a brief
schema with a parser, six wired scripts with their path scopes, Vale rules with must-fire
fixtures, a drafting-dispatch fragment, and one page rebuilt end to end with its measured cost.

**Architecture:** one preflight, four independent producers, and one consumer. P verifies the two
sequencing preconditions and stops the pass if either is unmet. H harvests every published page's
checkable claims into five ledgers under `docs/internal/record/docs-rebuild/`. C assembles the
corpus the reviews grade against. G1 builds the structure spine: the brief file, twelve templates,
`check:anatomy`, `check:headings`. G2 builds the receipt spine: `check:provenance`,
`check:prose-read`, `check:ledger`, the Vale rules, the figure and visual gates. D rebuilds
`docs/extend/add-a-custom-admin-screen.md` through the whole chain and measures what one page
costs. Unit 3c is plan one's and is not built here; unit 5, the rewrite, is plan three and is out
of scope here.

**Tech stack:** Node ESM scripts under `scripts/checks/`, vitest for their unit tests, Vale
3.15.1 (the CI pin), markdownlint, the repository's existing docs gate estate.

**Spec:** `docs/superpowers/specs/2026-09-08-docs-standard-design.md` (revision 3, units 1, 2,
3a, 3b, and 4; unit 3c belongs to plan one, the Claude infrastructure pass). Inputs:
`docs/internal/record/2026-09-08-polish-inputs/`, above all
`docs-spec-review-plannability.md`, `front-door-author-brief.md`, `front-door-net-failure.md`,
and `docs-sweep.md`.

**Token ceiling:** 8.8M. The plannability review sizes this work at 5.4M to 10.7M across its
chains, of which unit 3c was 0.3M to 0.6M and now leaves with plan one. 8.8M sits above the
midpoint because the harvest is the half whose spread is widest (2.0M to 4.5M for unit 1 alone)
and because this plan adds the preflight, the demonstration chain, and the records chain to the
review's count. Per chain: P 0.1M, H 4.0M, C 0.6M, G1 1.6M, G2 2.0M, D 0.4M, R 0.2M, the
remainder slack. **Checkpoint interval:** four tasks per chain. At each checkpoint the conductor
writes STATUS (task ledger, decisions taken, spend against the ceiling, next task). At 80 percent
of 8.8M the conductor finishes the running task in every chain, writes STATUS, and asks one
combined question. **Execution:** `pass-execute-chains`, four concurrent chains after P, then D,
then R. The machine ceiling is two concurrent full gates; H and C consume no gate slot, since
neither runs a build, so G1 and G2 hold the two slots and D takes one when they merge.

## Ruled inputs (recorded; no task re-derives them)

- **Owner decisions 1 through 7 are accepted as the spec's recommendations state them.** Length
  rules warn permanently with no promotion path (decision 1). The registry keeps eleven types for
  this plan, split to twelve in G1 (decision 2). The receipt is a pull-request artifact plus one
  ledger row per page, never a per-page committed file with a content hash (decision 3). The
  reader test runs on nine pages in plan three, one of which is the demonstration page here
  (decision 4). The `ROADMAP.md` claims-verification row is absorbed and its after-`beta.1`
  sequencing overruled, with the overrule recorded (decision 5). No rendered docs preview is
  added (decision 6). The new scanner measures live in the workstation's tellgrader behind a
  docs-register profile, so they are plan one's work and not a cairn task at all (decision 7).
- **Unit 3c is plan one's, and this plan consumes it rather than building it.** The owner's
  direction of 2026-09-08 makes the Claude infrastructure its own pass in the dotfiles and poplar
  repositories, running first. cairn's chain grades a task by `git diff` plus `npm test` and
  neither reaches `~/.claude/`, `~/.dotfiles/`, or `~/Projects/poplar/`, which is why the work
  moved rather than shrinking to a brief. Task P1 verifies plan one landed and stops the pass if
  it did not.
- **Polish-C lands entirely before the harvest branches.** Its renames invalidate ledger entries
  in exactly the class the ledger exists to guarantee. H1 verifies the merge and stops the chain
  if it has not happened. This is a hard sequencing constraint, not a preference.
- **Polish-B's prose findings are authoritative ledger input, not edits to run.** D1 through D30
  and F7 through F10 in `docs/internal/record/2026-09-08-polish-inputs/docs-sweep.md` are read by
  every harvest task: the ledger records the true claim with its proving source and marks the old
  page's claim superseded. B-code (its tasks 2, 8, 9 and the `check:reference` change in task 5)
  merges before this plan branches.
- **A published page is never a proving source.** That circularity is what let the front door
  assert a workflow that never happened. The four verdict tiers are `gate`, `read`, `owner`, and
  `unverified`, and an `unverified` entry must not enter any brief.
- **Ids never appear in published markdown.** The brief file carries them. A footnote marker on
  every claim-bearing sentence would make the page unreadable for the reader the standard exists
  to serve.
- **The demonstration page is `docs/extend/add-a-custom-admin-screen.md`** (decision 11), and its
  one-page harvest is the harvest chain's first harvest task, so the ledger schema is exercised by
  a real rebuild before the full harvest commits to it.
- **`check:ledger` sits in G2, not H.** The spec files it under unit 1's criteria, but the owner's
  chain assignment puts every gate script in G2. The consequence is named: G2's ledger task
  consumes H1's schema document, which is the one cross-chain edge inside this plan besides the
  join, and it is early because H1 is the harvest chain's first task. H validates its own output
  with `check:fact-coverage` (H2) until `check:ledger` merges; the first full run of
  `check:ledger` over all five ledgers is D2's.
- **Six new scripts, not the spec's five.** The spec's script table names `check:anatomy`,
  `check:headings`, `check:provenance`, `check:prose-read`, and `check:ledger`. Unit 1's first
  acceptance criterion demands a sixth, a machine check that every extractable fact token in a
  page has a ledger entry, and this plan builds it as `check:fact-coverage`. R2 records the
  addition in the register.
- **Release:** no version bump, no publish. The window holds and `CHANGELOG.md` gains one entry
  under `## Unreleased`.

## Global constraints

- **Length rules warn and never gate** (decision 1). No task in this plan clears a sentence to
  satisfy a length number, and the proposal's 196-sentence clearing work is dropped. The 25-word
  ceiling on admin and editors and the 40-word ceiling everywhere ship at warning level with no
  promotion path. Paragraph bounds are the only prose numbers at error level.
- **Eleven page types now; the split to twelve lands in G1-3.** Every artifact this plan writes
  before G1-3 merges names eleven; every artifact after names twelve. The canonical type ids are
  fixed in G1-2 and G1-3 and no task invents a synonym.
- **Plan one's outputs are inputs this plan consumes, and Task P1 verifies them.** The tellgrader
  docs-register profile (its flag present and its bands file readable), the Vale hook's
  path-grading change, and the two changed skills must be present before any chain dispatches.
  **P1 stops the pass if any is missing.** No task in this plan edits a file outside this
  repository.
- **Polish-C must land entirely before the harvest chain branches.** P1 verifies the merge on
  `main`, and H1 re-verifies it and stops the chain if it has not happened.
- **`check:figures` is uncommitted working-tree state on `main` today.** The owner's files are
  `package.json`, `.github/workflows/test.yml`, `scripts/figures/`, `docs/internal/site-figures.md`,
  `docs/internal/site-figures.svg`, and `docs/extend/assets/`. The owner commits that set (with
  the two writer-facing `assets/*.md` files moved to `docs/internal/figures/`, per polish-D's
  pre-dispatch) before **G2-7** runs. G2-7 is marked **blocked-on-owner** and no other task in
  this plan reads those paths.
- **This plan is not prose-graded.** It gets no receipt, no page brief, and no Vale loop. It is an
  internal planning document under `docs/superpowers/`, which `.vale.ini` exempts.
- **No em dashes in any file this plan produces**, prose and comments alike, and no ruling or pass
  citations in shipped comments or condition copy.
- **Every new script gets a must-fire fixture and a unit test.** A fixture that fires is a fixture
  the gate rejects; a fixture that passes proves the gate accepts a correct input. Both shapes per
  script, under `scripts/checks/fixtures/docs-standard/`, with the unit test under
  `src/tests/unit/`.
- **Every new or changed Vale rule ships a fixture that fires on the CI-pinned binary, 3.15.1.**
  A rule written as a section override can silently disable itself between versions. The fixture
  suite runs on every CI run, never once.
- **Internal planning docs stay outside the Vale gates.** `.vale.ini`'s empty `BasedOnStyles` for
  `docs/superpowers/**`, `docs/internal/**`, `docs/STATUS.md`, and `docs/HISTORY.md` is not
  touched by any task here.
- **Gate per task:** the chain's own gate, named per task below. Every task additionally runs
  `npm run check:docs` (links and anchors) and `npm run check:arm-indexes` when it adds a file
  under a documented arm. G1 and G2 tasks run the full `npm run check && npm test`.
- **`check:version` stays green:** `package.json`'s version is not touched by any task.

## Reconciliation (contended resources)

Seven file groups are written by more than one chain. Whichever chain merges second rebases, and the
conductor performs the reconciliation after the first merge lands, never a task.

| File | Chains that write it | Reconciliation |
|---|---|---|
| `package.json` (`scripts` only) | G1-7, G2-8 | Positional; each appends its own script lines. G1 merges first by default. |
| `.github/workflows/test.yml` | G1-7, G2-8 | Each adds one step block. Positional. |
| `scripts/checks/docs-standard-scope.json` | G1-4, G1-6, G2-3, G2-5, G2-8 | Whichever chain merges first creates it; the second chain's first scope task adds its own keys rather than rewriting the file. The self-check that every exclusion names its remover runs in `check:anatomy`, so it fires on the merged file. |
| `docs/internal/docs-register.md` | G2-1, G2-7, G2-8, R2 | R2 runs after both merge and writes the standard's section whole. |
| `docs/STATUS.md` | R2 only | No contention; no chain task edits STATUS. |
| `ROADMAP.md`, `CHANGELOG.md`, `docs/HISTORY.md` | R1, R2 only | No contention. |
| `docs/internal/record/docs-rebuild/` | P, H, D, R | P creates the directory and its index before any chain branches; H owns every `*-facts.md` and the schema; D writes only `receipts.md`'s first row; R writes only the hand-off manifest. Each chain adds its own index row, which is positional. |

`docs/superpowers/specs/2026-09-08-polish-passes-design.md` is amended by R1 alone.

---

## Chain P: the preflight

One task, in the main loop on `main`, before any chain branches.

### Task P1: Verify plan one and polish-C, and record the baseline

**Chain:** P. **Depends on:** nothing. **Deliverables:** 1. **Blocked-on-owner:** plan one, the
Claude infrastructure pass, must have landed.

**Files:**
- Create: `docs/internal/record/docs-rebuild/README.md` (the arm index for the directory; P1 runs
  first, so it creates the directory and its index),
  `docs/internal/record/docs-rebuild/preflight.md`
- Modify: `docs/internal/README.md` (the record arm's index line, if `check:arm-indexes` requires
  one)

**Interfaces:**
- Produces: `preflight.md`, the verified baseline every chain's `read`-tier citations resolve
  against: the `main` sha, the plan-one verification result, and the polish-C verification result.
- Consumes: plan one's own record of what it landed; the polish spec's rename table.

**Steps:**
- [ ] **Step 1:** verify plan one's three consumed outputs are present: the tellgrader
  docs-register profile (the profile flag accepted by the installed binary and its per-audience
  bands file readable), the Vale hook's path-grading change, and the two changed skills
  (`cairn-figure`'s figure production path and the writing-voice skill's author-facing prose
  section). **If any is missing, stop the pass and report which.**
- [ ] **Step 2:** verify polish-C has merged: its `Consumers must:` list is in `CHANGELOG.md` and
  the ten renames in the polish spec's table resolve to their new names in `src/lib/`. **If it has
  not, stop the pass and report the block.**
- [ ] **Step 3:** record the `main` sha, both verification results, and the published-page count;
  `check:docs`, `check:arm-indexes`; commit.

**Gate:** `npm run check:docs && npm run check:arm-indexes`.

**Acceptance criteria:**
- `preflight.md` names each of plan one's three consumed outputs with the command or path that
  proved it present, and the result of running it. A verification recorded as assumed rather than
  run fails this task.
- It names each of polish-C's ten renames with the new symbol resolved in `src/lib/`, or records
  that polish-C has not merged and the pass is stopped.
- It records the `main` sha and the published-page count from a `find` over `package.json`'s
  `files` array plus the root `README.md`. Every later `read`-tier citation in every ledger cites
  that sha or a later one.
- No file outside this repository is modified by this task, and the report says so.

**Notes:** this is the one task that can stop the whole pass. It is cheap and it runs alone; do
not fold it into a chain's first task, because four chains would then each discover the block
separately.

---

## Chain H: the harvest (unit 1)

Thirteen tasks. Produces the five ledgers, the page-type assignment, the unverified list, and the
drafting-dispatch fragment. No build, so no gate slot.

### Task H1: The ledger schema and the polish-C re-check

**Chain:** H. **Depends on:** P1. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/record/docs-rebuild/ledger-schema.md` (the schema every later harvest
  task and `check:ledger` reads)
- Modify: `docs/internal/record/docs-rebuild/README.md` (the index row; P1 created the
  file)

**Interfaces:**
- Produces: `docs/internal/record/docs-rebuild/ledger-schema.md`, consumed by H3 through H11 and
  by G2-6. The id format `^(admin|editors|extend|reference|front-door)-\d{4}$`. The five ledger
  paths `docs/internal/record/docs-rebuild/<track>-facts.md` for `admin`, `editors`, `extend`,
  `reference`, `front-door`. The four verdict tiers `gate`, `read`, `owner`, `unverified`. The
  six keep classes and the block-entry kind.
- Consumes: the spec's unit 1 section; `docs/internal/record/2026-09-08-polish-inputs/docs-sweep.md`.

**Steps:**
- [ ] **Step 1:** re-verify P1's polish-C finding against the branch point, since the chain
  branches later than P1 ran. **If polish-C has not merged, stop the chain and report the
  block.** Record the branch-point `main` sha in `ledger-schema.md`'s header beside P1's.
- [ ] **Step 2:** write `ledger-schema.md`. It fixes, with an example row for each: the entry
  format, the id format, claim granularity, the verdict tiers, the keep classes, the block-entry
  kind, and the anchor map.
- [ ] **Step 3:** add the schema's index row; `check:docs`, `check:arm-indexes`; commit.

**Gate:** `npm run check:docs && npm run check:arm-indexes`.

**Acceptance criteria:**
- The schema fixes the entry shape as a markdown table with these columns, in this order: `id`,
  `claim` (a normalized proposition under fifteen words, never a lifted sentence), `page` (the
  published path), `line` (the line in that page at the recorded sha), `tier` (one of `gate`,
  `read`, `owner`, `unverified`), `source` (for `gate`, the gate or fixture name; for `read`, a
  `file:line` plus the commit sha; for `owner`, the brief file and its line; for `unverified`,
  empty), and `note` (empty, or `superseded by <id>` for a claim the docs sweep corrects).
- The id format is `<track>-NNNN`, four digits, monotonic and unique within its own file, never
  reused. A retired entry keeps its row with `tier: retired` and a `note` naming the reason.
  The schema states both rules.
- Claim granularity is stated as one entry per checkable proposition: a statement that could be
  false and whose falseness a reader would act on. Version numbers, counts, paths, export names,
  defaults, behaviors, and promises about who does what qualify. Transitions, motivation, and
  restatements do not. The schema carries three worked examples of each side.
- The schema states that a published page is never a proving source, in those words.
- The six keep classes are named with a recorded shape each: anchors, Vale suppressions with the
  comment that justifies each, recorded deviations, ratified specimens, deliberate omissions
  (the vendor-link rule named as the example), and reader-tested editor glosses.
- The block-entry kind is specified: `kind: block`, carrying the fence verbatim, its language tag,
  its marker comment, and the fixture path its gate replays against. The schema states that a
  verbatim fence is the one exception to the no-old-prose rule, because a fence is not prose.
- The anchor map is specified as a per-page table, old heading slug to new heading slug or to
  `retired`, and the schema states that the map is the artifact plan three repairs inbound links
  from.
- `ledger-schema.md` names the `main` sha polish-C merged at, and every `read`-tier `source` in
  every later ledger cites that sha or a later one.
- The five ledger file paths carry no date, so plan three resolves them months later.

**Notes:** the schema is the artifact G2-6 writes `check:ledger` against, so its column names are
an interface and every later task spells them exactly. Do not write any ledger content here.

### Task H2: The fact-coverage script

**Chain:** H. **Depends on:** H1. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-fact-coverage.mjs`,
  `scripts/checks/fixtures/docs-standard/fact-coverage-pass/` (a page and a ledger where every
  token resolves), `scripts/checks/fixtures/docs-standard/fact-coverage-fail/` (the same page
  with one uncovered version string), `src/tests/unit/check-fact-coverage.test.ts`
- Modify: `package.json` (`"check:fact-coverage"`)

**Interfaces:**
- Produces: `npm run check:fact-coverage -- --track <track>`, exiting non-zero when a published
  page in that track carries an extractable fact token no ledger entry for that page carries.
  `--json` emits the uncovered tokens per page for a harvest task to work from.
- Consumes: `ledger-schema.md`'s column names.

**Steps:**
- [ ] **Step 1:** write the failing unit test against both fixtures; write the extractor and the
  resolver; run green.
- [ ] **Step 2:** wire `check:fact-coverage` into `package.json`; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The extractor recognizes six token classes and the script documents each with one example:
  semantic version strings, bare numerals outside code fences, repository-relative file paths,
  shell commands with their flags, exported symbol names (matched against
  `docs/internal/api-surface.md`), and config keys.
- The script reads the track's ledger, collects every entry whose `page` is the page under test,
  and fails when a token appears in the page and in none of that page's entries' `claim` or
  `source` fields.
- Both fixtures run in the unit test: the pass fixture exits 0, the fail fixture exits non-zero
  and names the uncovered token and its line.
- Code fences are excluded from token extraction except when the page has a `kind: block` entry,
  in which case the fence must match that entry's verbatim body byte for byte.
- The script takes `--track` and defaults to every track; a missing ledger file for a requested
  track is an error, not a pass.
- `npm run check` and `npm test` are green with the script wired.

### Task H3: Harvest the demonstration page

**Chain:** H. **Depends on:** H1, H2. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/extend-facts.md` (this page's entries only; H7 and
  H8 append)
- Modify: `docs/internal/record/docs-rebuild/ledger-schema.md` (any schema correction this first
  real harvest forces, with the change noted in the header)

**Interfaces:**
- Produces: the `extend-NNNN` entries for `docs/extend/add-a-custom-admin-screen.md`, its anchor
  map, its keep classes, and its block entries. Consumed by D1.
- Consumes: `ledger-schema.md`; `docs-sweep.md`'s findings on that page.

**Steps:**
- [ ] **Step 1:** harvest the page: every checkable proposition, each with its tier and proving
  source; the anchor map; the six keep classes; every gated block verbatim with its fixture path.
- [ ] **Step 2:** run `check:fact-coverage -- --track extend` scoped to this page and close every
  uncovered token; record any schema correction; commit.

**Gate:** `npm run check:fact-coverage -- --track extend` (scoped to the one page) plus
`npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage` reports zero uncovered tokens for
  `docs/extend/add-a-custom-admin-screen.md`.
- Every entry carries an id matching the format, a normalized claim under fifteen words, the page
  and line, and either a verdict tier with its proving source or the `unverified` tier.
- No `claim` field is a sentence lifted from the page. A reviewer can check this: no `claim` value
  appears as a substring of the page.
- The page's anchor map lists every heading slug, and every slug with an inbound link inside
  `docs/` is marked as such.
- Every fenced block the repository's gates replay (`check:snippets`, `check:transcripts`,
  `check:symbols`) has a `kind: block` entry carrying the fence verbatim and its fixture path.
- Any schema change this task forces is recorded in `ledger-schema.md`'s header with its reason,
  and H4 through H11 use the corrected schema.

**Notes:** this task exists to break the schema before eleven more tasks build on it. An
implementer that finds nothing to correct says so explicitly in its report.

### Task H4: The page-type assignment for every published page

**Chain:** H. **Depends on:** H1. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/page-types.md`
- Modify: `docs/internal/record/docs-rebuild/README.md` (the index row)

**Interfaces:**
- Produces: `page-types.md`, one row per published page: `path`, `track`, `type` (a canonical type
  id), and `reason` (the reader's job in one line). This is hand-off artifact 2 and plan three's
  brief authoring reads it.
- Consumes: the spec's registry table and its twelve-type split.

**Steps:**
- [ ] **Step 1:** enumerate the published set from `package.json`'s `files` array plus the root
  `README.md`; assign a type to each page from the twelve canonical ids; write the reason line.
- [ ] **Step 2:** `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- The table covers every published markdown file: the four track directories, `docs/README.md`,
  `docs/why-cairn.md`, and the root `README.md`. The count is stated in the file's first line and
  matches a `find` over the published paths at the recorded sha.
- Every `type` value is one of the twelve canonical ids: `task-guide`, `tutorial-milestone`,
  `concept`, `architecture-overview`, `reference-entry`, `reference-table`, `condition-entry`,
  `symptom-row`, `index`, `front-door-evaluator`, `front-door-track-index`, `proposal`.
- `docs/why-cairn.md` and the root `README.md` are `front-door-evaluator`; `docs/README.md` and
  the four track `README.md` files are `front-door-track-index`.
- Every `track` value is one of `admin`, `editors`, `extend`, `reference`, `front-door`, and
  `front-door` is used for exactly `docs/README.md`, `docs/why-cairn.md`, and the root
  `README.md`. A track README stays in its own track.
- Every page whose type has no exemplar named in the spec's registry is listed in a closing
  section, "types the registry may lack", with the nearest type named. That section is input to
  R2, not a blocker.

**Notes:** the type ids here and the template filenames G1-2 and G1-3 create are one interface.
D2 asserts they agree; a mismatch is a fix verdict on whichever task merged second.

### Task H5: Harvest the admin track

**Chain:** H. **Depends on:** H3. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/admin-facts.md`

**Interfaces:**
- Produces: every `admin-NNNN` entry, the nine pages' anchor maps, keep classes, and block entries.
- Consumes: `ledger-schema.md` as corrected by H3; `docs-sweep.md` findings D1, D2, D5, D6, D10,
  D26, D27.

**Steps:**
- [ ] **Step 1:** harvest the nine pages under `docs/admin/`, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track admin`; close every uncovered token; commit.

**Gate:** `npm run check:fact-coverage -- --track admin && npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage -- --track admin` exits 0.
- Every one of the nine pages has entries, an anchor map, and the six keep classes harvested.
- `docs/admin/create-your-site.md` and `docs/admin/is-it-working.md` each carry a `kind: block`
  entry for every transcript block `check:transcripts`' `PAGE_FLOORS` map requires, with the
  fixture path under `packages/create-cairn-site/test/fixtures/transcripts/` named.
- Every claim the docs sweep corrects is recorded as the true claim with its proving source, and
  the old page's claim carries `superseded by <id>` in its `note`.
- No `unverified` entry lacks a one-line statement of what would prove it.

### Task H6: Harvest the editors track

**Chain:** H. **Depends on:** H3. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/editors-facts.md`

**Interfaces:**
- Produces: every `editors-NNNN` entry for the eight pages under `docs/editors/`.
- Consumes: `ledger-schema.md`; docs-sweep findings D11, D12, D30.

**Steps:**
- [ ] **Step 1:** harvest the eight pages, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track editors`; commit.

**Gate:** `npm run check:fact-coverage -- --track editors && npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage -- --track editors` exits 0.
- The reader-tested editor glosses keep class is populated for this track specifically: every
  banned-vocabulary substitution the track carries is an entry, since the substitution is the
  thing a fresh drafter would lose.
- Every `check:editor-quotes` assertion that keys off a page has a `kind: block` entry.
- Every one of the eight pages has entries, an anchor map, and the six keep classes.

### Task H7: Harvest the extend track, part one

**Chain:** H. **Depends on:** H3. **Deliverables:** 1.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/extend-facts.md` (append; H3 created it)

**Interfaces:**
- Produces: `extend-NNNN` entries for the first half of the track, in path order, excluding
  `add-a-custom-admin-screen.md` (H3) and `architecture.md` (H8).
- Consumes: `ledger-schema.md`; docs-sweep findings D3, D4, D7, D8, D9, D13, D14.

**Steps:**
- [ ] **Step 1:** harvest the pages, one page per read, ids continuing monotonically from H3's
  last.
- [ ] **Step 2:** `check:fact-coverage -- --track extend` over the harvested subset; commit.

**Gate:** `npm run check:fact-coverage -- --track extend` (scoped) plus `npm run check:docs`.

**Acceptance criteria:**
- Every page in the first half has entries, an anchor map, and the six keep classes.
- Ids continue from H3's highest with no gap and no reuse.
- Every recipe page's code fences that `check:snippets` compiles have `kind: block` entries.
- The Vale suppression keep class carries, for each suppression, the comment that states why it
  is right.

**Notes:** H7 and H8 both append to one file. They run sequentially inside chain H, never
concurrently, so the append is positional and no reconciliation is needed.

### Task H8: Harvest the extend track, part two

**Chain:** H. **Depends on:** H7. **Deliverables:** 1.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/extend-facts.md` (append)

**Interfaces:**
- Produces: the remaining `extend-NNNN` entries, `architecture.md` included.
- Consumes: `ledger-schema.md`; docs-sweep findings D15, D17, D18, D19, D28.

**Steps:**
- [ ] **Step 1:** harvest the remaining pages, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track extend` over the whole track; commit.

**Gate:** `npm run check:fact-coverage -- --track extend && npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage -- --track extend` exits 0 over the whole track.
- Every page under `docs/extend/` appears in `page-types.md` and has at least one ledger entry.
- `docs/extend/architecture.md`'s figure, its alt text, its caption, and its text alternative are
  recorded as keep-class entries, since the ownership map moves onto this page in plan three.
- No `claim` value appears as a substring of its source page.

### Task H9: Harvest the reference track, part one

**Chain:** H. **Depends on:** H3. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/reference-facts.md`

**Interfaces:**
- Produces: `reference-NNNN` entries for the first half of `docs/reference/`, in path order.
- Consumes: `ledger-schema.md`; `docs/internal/api-surface.md`; docs-sweep findings D20, D22,
  D23.

**Steps:**
- [ ] **Step 1:** harvest, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track reference` over the subset; commit.

**Gate:** `npm run check:fact-coverage -- --track reference` (scoped) plus `npm run check:docs`.

**Acceptance criteria:**
- Every page in the first half has entries, an anchor map, and the six keep classes.
- Every signature block `check:reference:signatures` asserts is a `kind: block` entry carrying
  the signature verbatim.
- Every export name in `docs/internal/api-surface.md` that the harvested pages document resolves
  to at least one `gate`-tier entry naming `check:reference` or `check:reference:signatures`.

**Notes:** reference pages are edited in place in plan three rather than rebuilt, so their ledgers
serve `check:provenance` and the coverage diff rather than a fresh draft. Harvest them at the same
granularity anyway; the provenance gate reads the same ledger either way.

### Task H10: Harvest the reference track, part two

**Chain:** H. **Depends on:** H9. **Deliverables:** 1.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/reference-facts.md` (append)

**Interfaces:**
- Produces: the remaining `reference-NNNN` entries.
- Consumes: `ledger-schema.md`; docs-sweep findings D24, D25, D29, F7, F8, F9, F10.

**Steps:**
- [ ] **Step 1:** harvest the remaining pages, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track reference` over the whole track; commit.

**Gate:** `npm run check:fact-coverage -- --track reference && npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage -- --track reference` exits 0 over the whole track.
- Every page under `docs/reference/` appears in `page-types.md` and has at least one entry.
- Every `## Types` section the `check:reference` change in polish-B's task 5 asserts is recorded
  as a keep-class deviation or a structural entry, so plan three's in-place edits do not drop it.

### Task H11: Harvest the front door

**Chain:** H. **Depends on:** H3. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/front-door-facts.md`

**Interfaces:**
- Produces: every `front-door-NNNN` entry for `docs/README.md`, `docs/why-cairn.md`, and the root
  `README.md`.
- Consumes: `ledger-schema.md`;
  `docs/internal/record/2026-09-08-polish-inputs/front-door-author-brief.md` (the one `owner`-tier
  source for this track); `front-door-net-failure.md`.

**Steps:**
- [ ] **Step 1:** harvest the three pages, one page per read.
- [ ] **Step 2:** `check:fact-coverage -- --track front-door`; commit.

**Gate:** `npm run check:fact-coverage -- --track front-door && npm run check:docs`.

**Acceptance criteria:**
- `check:fact-coverage -- --track front-door` exits 0.
- Every claim about the owner or about cairn's stance carries the `owner` tier and cites a line in
  `front-door-author-brief.md`, or carries `unverified`. No such claim carries `read` or `gate`.
- The ratified specimens keep class carries the why-cairn opener verbatim, since the owner
  approved that sentence.
- The deliberate omissions keep class carries the vendor-link rule.
- The rejected draft's editors-emailing-the-owner story is recorded as an `unverified` entry with
  its note stating that it resolves to no line in the author brief. That entry is the fixture
  G2-5 reproduces.

**Notes:** the two current front-door pages are the pages whose rejection produced this
initiative. Harvest what is true, not what reads well; a claim the author brief does not carry is
`unverified` and goes to H12's list.

### Task H12: The unverified list and the owner checkpoint

**Chain:** H. **Depends on:** H5, H6, H8, H10, H11. **Deliverables:** 2. **Blocked-on-owner** at
step 3.

**Files:**
- Create: `docs/internal/record/docs-rebuild/unverified.md`
- Modify: the five `*-facts.md` files (tier changes the owner rules; nothing else)

**Interfaces:**
- Produces: `unverified.md`, one row per `unverified` entry: `id`, `claim`, `page`, `what would
  prove it`, and `owner ruling` (empty until the sitting). This is the owner's single batched
  sitting for chain H.
- Consumes: all five ledgers.

**Steps:**
- [ ] **Step 1:** collect every `unverified` entry across the five ledgers into one table, grouped
  by track and ordered by how much a reader would act on the claim's falseness.
- [ ] **Step 2:** for each, state in one line what would prove it and what the conductor
  recommends: true, aspirational, or comes out.
- [ ] **Step 3:** **stop and present the list to the owner as one combined question.** Do not
  guess a ruling.
- [ ] **Step 4:** apply each ruling: a claim ruled true gets its tier and proving source; a claim
  ruled aspirational or out keeps `unverified` with the ruling in its note, and the rule that an
  `unverified` entry never enters a brief carries it out of plan three.
- [ ] **Step 5:** `check:fact-coverage` over every track; commit.

**Gate:** `npm run check:fact-coverage && npm run check:docs`.

**Acceptance criteria:**
- Every `unverified` entry in every ledger appears exactly once in `unverified.md`.
- Every row carries a "what would prove it" line and the conductor's recommendation before the
  sitting.
- After the sitting, every row carries an owner ruling, and every entry the owner ruled true has
  moved to `gate`, `read`, or `owner` with its proving source recorded.
- No entry the owner ruled aspirational or out has changed tier.
- `check:fact-coverage` exits 0 over all five tracks.

**Notes:** this is the front-door failure generalized to 75 pages, and it is the highest-value
attended sitting in the initiative. Batch it whole; do not ask about entries one at a time.

### Task H13: The drafting-dispatch fragment

**Chain:** H. **Depends on:** H12. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/drafting-dispatch.md`,
  `scripts/checks/fixtures/docs-standard/plan-lint-fail.md` (a plan task whose drafting Files list
  names an old published page)
- Modify: `scripts/checks/check-fact-coverage.mjs` (a `--plan-lint <file>` mode), `package.json`
  if the mode gets its own script name

**Interfaces:**
- Produces: `drafting-dispatch.md`, the checked-in prompt block plan three's drafting dispatches
  inherit verbatim. This is hand-off artifact 8.
- Consumes: `ledger-schema.md`; the spec's quarantine rule.

**Steps:**
- [ ] **Step 1:** write the fragment: the quarantine sentence, the readable-file list, the
  one-section-per-read protocol, and the dispatch-id recording rule.
- [ ] **Step 2:** add the plan-lint mode and its fixture; unit test; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The fragment states, as an instruction to a drafting agent: do not open the page you replace;
  read only the track ledger, `page-types.md`, the page type's template, the named corpus entry,
  and the pages the brief's `keep` list names.
- The fragment carries the one-section-per-read protocol and requires the dispatch id to be
  recorded in the receipt row.
- The plan-lint mode fails a plan document whose task Files list names a published page under a
  drafting step, and passes one that does not. Both fixtures run in the unit test.
- The fragment is a single copyable block, delimited so a dispatch can quote it whole.

---

## Chain C: the corpus (unit 2)

Five tasks. Independent of every other chain. No gate slot.

### Task C1: The corpus directory, the manifest, and the three samples

**Chain:** C. **Depends on:** P1. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/corpus/README.md` (the arm index), `docs/internal/corpus/manifest.md`,
  `docs/internal/corpus/concept-sqlite-scope.md`,
  `docs/internal/corpus/proposal-go-monotonic-time.md`,
  `docs/internal/corpus/proposal-kep-node-swap.md`
- Delete: the three `corpus-sample-*.md` files under
  `docs/internal/record/2026-09-08-polish-inputs/`, replaced by a one-line pointer in that
  directory's index if it has one
- Modify: `docs/internal/README.md` (the arm index line for `corpus/`)

**Interfaces:**
- Produces: the corpus entry format (an excerpt at most 400 words, then a `## Source` section in
  the shape of the SQLite sample) and the manifest's column set. The entry id is the filename
  stem, `<type-id>-<source-slug>`, and it is what a brief's `corpus_entry` field carries.
- Consumes: the three existing samples.

**Steps:**
- [ ] **Step 1:** create the directory and the manifest with its columns; migrate the three
  samples to the entry format under their new ids; delete the originals.
- [ ] **Step 2:** `check:docs`, `check:arm-indexes`; commit.

**Gate:** `npm run check:docs && npm run check:arm-indexes`.

**Acceptance criteria:**
- The manifest is a markdown table with these columns, in this order: `id`, `file`, `page type`,
  `track`, `source`, `url`, `license`, `fetched`, `mode`, `sentences`, `avg length`, `longest`,
  `hinged pairs`, `short sentences`, `paragraphs`, `approved`.
- `mode` is one of `excerpt`, `reference-only`, or `structure-only`, and the manifest states what
  each means in a line above the table.
- Every committed entry is at most 400 words before its `## Source` heading, checked by
  `node scripts/checks/measure-prose.mjs <file> --until "## Source" --json` and recorded.
- Every entry carries a `## Source` section naming the source, the URL, the license, and the fetch
  date, in the shape the SQLite sample sets.
- The three samples exist only under `docs/internal/corpus/`; a `grep` for `corpus-sample-` under
  `docs/internal/record/` returns nothing but a pointer line.
- The `approved` column is present and empty for all three.
- The SQLite entry's type is `front-door-evaluator` and the two design-document entries' type is
  `proposal`, matching the spec's exemplar table.

### Task C2: Corpus entries for the first six page types

**Chain:** C. **Depends on:** C1. **Deliverables:** 1.

**Files:**
- Create: one or two entries under `docs/internal/corpus/` for each of `task-guide`,
  `tutorial-milestone`, `concept`, `architecture-overview`, `reference-entry`, `reference-table`
- Modify: `docs/internal/corpus/manifest.md`

**Interfaces:**
- Produces: at least one and at most two entries per named type, each with its manifest row.
- Consumes: the spec's registry table, which names each type's exemplars.

**Steps:**
- [ ] **Step 1:** fetch each candidate; determine its license; commit an excerpt where the license
  permits one and a `reference-only` row where it does not.
- [ ] **Step 2:** write each `## Source` section; add the manifest rows; `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- Each of the six types has at least one entry and at most two.
- An entry whose license does not permit a 400-word excerpt is recorded as `reference-only`: URL,
  fetch date, and measured numbers in the manifest, with no excerpt file committed.
- Where two candidates serve one type, the permissively licensed one is the one committed as an
  excerpt, and the manifest's `note` says so.
- Every `reference-table` entry is marked `structure-only`, and the manifest's legend states that
  a review of such a page compares column order, row completeness, and the lead sentence rather
  than cadence.
- No entry exceeds 400 words before `## Source`.
- Every entry's `license` cell names a specific license or the words "no redistribution grant";
  none is empty.

### Task C3: Corpus entries for the remaining six page types

**Chain:** C. **Depends on:** C2. **Deliverables:** 1.

**Files:**
- Create: entries for `condition-entry`, `symptom-row`, `index`, `front-door-evaluator` (the
  SQLite entry already serves; a second is optional), `front-door-track-index`, `proposal` (the
  two design documents already serve), plus the hand-picked second editors entry
- Modify: `docs/internal/corpus/manifest.md`

**Interfaces:**
- Produces: full coverage of the twelve-type registry.
- Consumes: C1's format; the spec's note that the Mozilla support articles block automated reads.

**Steps:**
- [ ] **Step 1:** fetch or hand-copy each entry; the second editors entry is chosen by hand and
  its selection reasoning recorded in its `## Source` section.
- [ ] **Step 2:** manifest rows; `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- All twelve type ids appear in the manifest's `page type` column, each with at least one row.
- The editors track has two entries, one of which is the hand-picked one, and its `## Source`
  section states why automated fetching was not used.
- `condition-entry` and `symptom-row` have distinct entries; a single Cloudflare error table
  serving both is recorded as two rows with different excerpts or one row plus a
  `structure-only` row, and the choice is stated.
- No entry exceeds 400 words before `## Source`.
- The `approved` column is empty for every new row.

### Task C4: Measure every entry and fill the manifest

**Chain:** C. **Depends on:** C3. **Deliverables:** 1.

**Files:**
- Modify: `docs/internal/corpus/manifest.md`

**Interfaces:**
- Produces: the measured numbers every review's measurement table is graded beside.
- Consumes: `scripts/checks/measure-prose.mjs`.

**Steps:**
- [ ] **Step 1:** run `node scripts/checks/measure-prose.mjs <file> --until "## Source" --json` on
  every committed excerpt; for a `reference-only` entry, measure the fetched source locally and
  record the numbers without committing the text.
- [ ] **Step 2:** fill every measurement column; `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- Every manifest row's six measurement columns are filled with numbers from script output, and
  the manifest's header names the script and the exact flags used.
- Every excerpt was measured with `--until "## Source"`, so no `## Source` prose reaches a number.
- A `reference-only` row carries its numbers and no excerpt file exists for it.
- The manifest states, in one line, that every number is advisory until a track has twenty
  documents and three hundred sentences behind it, and that no number here is a gate.

### Task C5: The corpus approval checkpoint (decision 7)

**Chain:** C. **Depends on:** C4. **Deliverables:** 1. **Blocked-on-owner.**

**Files:**
- Modify: `docs/internal/corpus/manifest.md` (the `approved` column), and delete any entry the
  owner rejects

**Interfaces:**
- Produces: the approved corpus, hand-off artifact 3.
- Consumes: C4's filled manifest.

**Steps:**
- [ ] **Step 1:** present the assembled set to the owner as one combined question: the entries per
  type, the licensing calls, and the hand-picked editors entry.
- [ ] **Step 2:** **stop for the owner.** Apply each verdict: approve with a date, or delete the
  entry and retire its id.
- [ ] **Step 3:** `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- Every remaining manifest row's `approved` column carries a date.
- A rejected entry's file is deleted and its id is listed under a "retired ids" heading in the
  manifest, never reused.
- Every one of the twelve type ids still has at least one approved or `reference-only` entry after
  the deletions. If a deletion leaves a type uncovered, the task reports the gap rather than
  substituting a replacement without approval.

**Notes:** the spec suggests a time-boxed default-to-accept window, since an unapproved entry
blocks work rather than protecting anything. Offer it in the same question; do not assume it.

---

## Chain G1: the structure gates (unit 3a)

Seven tasks. Full gate per task. Shares `package.json` and `.github/workflows/test.yml` with G2.

### Task G1-1: The brief schema, the parser, and one worked brief

**Chain:** G1. **Depends on:** P1. **Deliverables:** 4.

**Files:**
- Create: `docs/internal/templates/brief-schema.md` (the field reference),
  `scripts/checks/brief.mjs` (the parser, imported by `check:anatomy` and `check:provenance`),
  `scripts/checks/fixtures/docs-standard/brief-valid.yml`,
  `scripts/checks/fixtures/docs-standard/brief-invalid.yml`,
  `src/tests/unit/brief-parser.test.ts`
- Modify: `package.json` (`files` array untouched, so no brief ships in the tarball; add nothing
  under `files`)

**Interfaces:**
- Produces: the brief file at `docs/<track>/<page>.brief.yml`, and `README.brief.yml` at the
  repository root for the root README. `parseBrief(path)` returning the eight fields or throwing
  with the offending line. This is hand-off artifact 5.
- Consumes: the spec's brief field table.

**Steps:**
- [ ] **Step 1:** write the failing parser test against both fixtures; write the parser and the
  schema document; run green.
- [ ] **Step 2:** commit the worked brief as `brief-valid.yml`, modeled on
  `docs/extend/add-a-custom-admin-screen.md`; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The schema fixes eight fields with these exact names: `type`, `track`, `exemplar`,
  `corpus_entry`, `needs`, `keep`, `deviations`, `sentences`.
- `type` must be one of the twelve canonical type ids; `track` one of `admin`, `editors`,
  `extend`, `reference`, `front-door`; `exemplar` a path or URL; `corpus_entry` a manifest id;
  `needs` and `keep` lists of ledger ids matching
  `^(admin|editors|extend|reference|front-door)-\d{4}$`;
  `deviations` a list of `{ rule, reason }`; `sentences` an ordered list whose every element is a
  ledger id or the literal `no-claim`.
- The parser rejects an unknown field, a missing required field, a `type` outside the registry,
  and a malformed ledger id, naming the line in each case. The invalid fixture exercises all four.
- No brief path is added to `package.json`'s `files` array, and `npm run check:package` proves no
  `*.brief.yml` reaches the tarball.
- The schema states that ids never appear in published markdown, and that the brief is the only
  place a page's type is written down beside its template.
- `npm run check && npm test` green.

### Task G1-2: Templates for the first six page types

**Chain:** G1. **Depends on:** G1-1. **Deliverables:** 6.

**Files:**
- Create: `docs/internal/templates/task-guide.md`, `tutorial-milestone.md`, `concept.md`,
  `architecture-overview.md`, `reference-entry.md`, `reference-table.md`
- Modify: `docs/internal/templates/README.md` (the arm index; create it here)

**Interfaces:**
- Produces: six templates, each carrying its type's section order from the spec, with every
  heading marked `required` or `optional`. `check:anatomy` reads them as its only source.
- Consumes: the spec's page-level section orders.

**Steps:**
- [ ] **Step 1:** write each template with its headings in the spec's order and a machine-readable
  marker per heading.
- [ ] **Step 2:** `check:docs`, `check:arm-indexes`, full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- Six files exist, named exactly for the six canonical type ids.
- Each carries its section order verbatim from the spec: task guide's six sections, tutorial
  milestone's six, concept's six, architecture overview's five, reference entry's ten, reference
  table's three.
- Every heading line carries a required-or-optional marker in one fixed syntax, stated once in
  `docs/internal/templates/README.md` and identical across all twelve templates.
- The reference-entry template is derived from the shape `check:reference` and
  `check:reference:signatures` already fix, and its header states which script fixes which part,
  so the template is not a second copy that drifts.
- A word ceiling appears in the template where the spec states one: task guide under 800 words,
  concept under 1,500. The template records it as advisory, since length rules warn and never
  gate.

### Task G1-3: Templates for the remaining six types, and the front-door split

**Chain:** G1. **Depends on:** G1-2. **Deliverables:** 6.

**Files:**
- Create: `docs/internal/templates/condition-entry.md`, `symptom-row.md`, `index.md`,
  `front-door-evaluator.md`, `front-door-track-index.md`, `proposal.md`
- Modify: `docs/internal/templates/README.md` (the registry table, twelve rows)

**Interfaces:**
- Produces: the twelve-type registry as the templates directory. This is hand-off artifact 4.
- Consumes: G1-2's marker syntax; the spec's open item on the front-door split.

**Steps:**
- [ ] **Step 1:** write the six templates; split the front-door type into the evaluator type
  (the spec's eight-section order) and the track-index type (a routing shape the register's
  five-routes-in-the-first-screenful rule can hold).
- [ ] **Step 2:** write the registry table naming each type, the reader's job it serves, and its
  exemplars; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- Twelve templates exist, one per canonical type id, and the registry table in
  `docs/internal/templates/README.md` has twelve rows.
- `front-door-evaluator.md` carries the spec's eight-section front-door order and is the template
  for `docs/why-cairn.md` and the root `README.md`.
- `front-door-track-index.md` carries a routing order that satisfies the register's
  five-routes-in-the-first-screenful requirement, and its header states which register rule it
  answers. It is the template for `docs/README.md` and the four track READMEs.
- The registry table's type ids match `docs/internal/record/docs-rebuild/page-types.md` exactly,
  checked by name; a mismatch is a fix verdict here or there.
- `index.md` carries the four-section index order and the rule that an index groups its children
  once it lists more than nine siblings.
- `proposal.md` carries the eleven-section proposal order and is marked internal: the type stays
  outside the Vale gates, and its template governs shape rather than prose.
- Every template uses G1-2's marker syntax unchanged.

### Task G1-4: `check:anatomy`

**Chain:** G1. **Depends on:** G1-3. **Deliverables:** 4.

**Files:**
- Create: `scripts/checks/check-anatomy.mjs`,
  `scripts/checks/fixtures/docs-standard/anatomy-pass/`,
  `scripts/checks/fixtures/docs-standard/anatomy-fail-no-brief/`,
  `scripts/checks/fixtures/docs-standard/anatomy-fail-order/`,
  `src/tests/unit/check-anatomy.test.ts`
- Modify: `package.json` (`"check:anatomy"`), `scripts/checks/docs-standard-scope.json` (create it
  here: the path allowlist, with the plan-three track plan that removes each exclusion named)

**Interfaces:**
- Produces: `npm run check:anatomy`, which reads `docs/internal/templates/` as its only source of
  section orders.
- Consumes: `scripts/checks/brief.mjs`; the twelve templates; the corpus manifest's `approved`
  column.

**Steps:**
- [ ] **Step 1:** write the failing test against the three fixtures; write the script; run green.
- [ ] **Step 2:** create the scope file; wire the script; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The script fails first on a missing or unparseable brief, before any heading check, and names
  the expected brief path.
- It then fails a page whose required headings are missing or out of order, naming the heading and
  the position it expected.
- It refuses a brief whose `corpus_entry` names a manifest row whose `approved` column is empty.
- It reads section orders only from `docs/internal/templates/`; a `grep` for any heading string
  from the spec in `check-anatomy.mjs` returns nothing.
- It reaches the root `README.md` by resolving its brief at `README.brief.yml`, and the script
  states that special case in one comment.
- It is scoped by `docs-standard-scope.json`, which lists every published path currently in
  compliance and, for every exclusion, the plan-three track plan that removes it. An exclusion with
  no named remover fails the script's own self-check.
- All three fixtures run in the unit test with the expected exit codes.

### Task G1-5: The verb lexicon

**Chain:** G1. **Depends on:** G1-3. **Deliverables:** 2.

**Files:**
- Create: `scripts/checks/verb-lexicon.json`, `docs/internal/templates/heading-grammar.md`
- Modify: none

**Interfaces:**
- Produces: the committed word list of imperative verbs cairn's docs use, plus an allowlist escape
  for a heading the lexicon cannot resolve. Consumed by G1-6's rules 5 and 6.
- Consumes: a `grep` over every heading in the published set at the recorded sha.

**Steps:**
- [ ] **Step 1:** extract every heading from the published set; cluster the first words; write the
  lexicon.
- [ ] **Step 2:** write `heading-grammar.md`: what the lexicon is, how to add a word, and why the
  two grammatical rules warn rather than fail; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- `verb-lexicon.json` has two arrays, `imperatives` and `allowlist`, and a `note` field stating
  that a heading whose first word resolves in neither warns rather than fails.
- Every first word of every heading in the published set is classified: in `imperatives`, in
  `allowlist`, or listed in `heading-grammar.md`'s "unresolved" section with the count.
- The unresolved count is stated as a number in `heading-grammar.md`, so G1-6's warning volume is
  known before the script ships.
- `heading-grammar.md` states that no part-of-speech tagger is used and no new dependency is
  added.

### Task G1-6: `check:headings`

**Chain:** G1. **Depends on:** G1-5. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-headings.mjs`,
  `scripts/checks/fixtures/docs-standard/headings/` (one fixture per rule, seven pass and seven
  fail), `src/tests/unit/check-headings.test.ts`
- Modify: `package.json` (`"check:headings"`), `scripts/checks/docs-standard-scope.json`

**Interfaces:**
- Produces: `npm run check:headings`, holding the seven heading rules.
- Consumes: `verb-lexicon.json`; markdownlint's coverage of rules 2 and 3.

**Steps:**
- [ ] **Step 1:** write the failing tests against the fourteen fixtures; write the script; run
  green.
- [ ] **Step 2:** wire it; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The script holds rules 1, 4, 5, 6, and 7 at the levels stated: sentence case (error), no leading
  `-ing` form (error), verb-first for task sections and noun phrases for the rest (warning,
  against the lexicon), siblings in one form (warning, checked only where every sibling resolves
  in the lexicon), question headings only under `docs/editors/` (error).
- Rules 2 and 3, single level-one heading and no skipped levels, are **not** reimplemented. The
  script's header names markdownlint's `MD025` and `MD001` as their home, and a `grep` for a
  level-count check in the script returns nothing.
- Every one of the seven rules has a fixture that fires and a fixture that passes, and all
  fourteen run in the unit test.
- A heading whose first word resolves in neither lexicon array produces a warning naming the
  heading, never a failure.
- The script is scoped by `docs-standard-scope.json` on the same terms as `check:anatomy`.

### Task G1-7: Markdownlint and the G1 CI wiring

**Chain:** G1. **Depends on:** G1-4, G1-6. **Deliverables:** 3.

**Files:**
- Create: `.markdownlint.jsonc` (the stock rule set plus the disables this repository needs, each
  with a comment stating why)
- Modify: `package.json` (`"lint:markdown"`, the `check` composite), `.github/workflows/test.yml`
  (one step block running the G1 gates)

**Interfaces:**
- Produces: `npm run lint:markdown`, `check:anatomy` and `check:headings` in CI.
- Consumes: G1-4 and G1-6.

**Steps:**
- [ ] **Step 1:** add markdownlint with its stock rules; disable only what conflicts, each with a
  reason comment; clear or scope every existing violation.
- [ ] **Step 2:** wire the three into `package.json` and `test.yml`; full gate; commit.

**Gate:** `npm run check && npm test`, plus the new steps run locally as CI runs them.

**Acceptance criteria:**
- Markdownlint runs with its stock rules over the published paths, carrying heading increment,
  single level-one heading, duplicate headings, code-fence language tags, list markers, and table
  integrity.
- Every disabled rule carries a comment naming the reason and, where the disable is temporary, the
  plan-three track plan that removes it.
- `npm run check` runs `check:anatomy`, `check:headings`, and `lint:markdown`, and all three are
  green on `main`'s published set as scoped.
- `.github/workflows/test.yml` runs the same three, and the step names them individually so a
  failure is readable in the run log.
- `npm test` green.

---

## Chain G2: the receipt, provenance, and ledger gates (unit 3b)

Eight tasks. Full gate per task. Shares `package.json` and `.github/workflows/test.yml` with G1.

### Task G2-1: Vendor the guidelines and record the standard

**Chain:** G2. **Depends on:** P1. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/reference-captures/federal-plain-language-guidelines-2011.pdf`,
  `docs/internal/reference-captures/federal-plain-language-guidelines-2011.md` (the provenance
  note: source, fetch date, revision, and why the PDF is vendored)
- Modify: `docs/internal/docs-register.md` (the prose standard section pointing at the vendored
  file and at the spec)

**Interfaces:**
- Produces: the vendored standard every prose rule cites.
- Consumes: the spec's prose-rules section.

**Steps:**
- [ ] **Step 1:** vendor the PDF and write its provenance note.
- [ ] **Step 2:** add the register section naming the six adopted rule groups and the four
  cairn-specific numbers with their sources; `check:docs`, `check:vale`; commit.

**Gate:** `npm run check:docs && npm run check:vale && npm run check:arm-indexes`.

**Acceptance criteria:**
- The PDF is committed and its provenance note states the March 2011 revision, the fetch date, and
  that plainlanguage.gov now redirects to digital.gov with the live guides re-cut, which is why
  the PDF is vendored rather than linked.
- The register section names the adopted parts: audience, organization, words, sentences,
  paragraphs, and test.
- The register's table of the four numbers carries, for each, its target, its source, and its
  status, and every length row's status reads that it warns and never gates.
- The register states the severity contract that governs the linters: an error fails the build, a
  warning shows in the review, a suggestion stays local, and a rule moves to error only after
  every existing violation in the tracks it covers is cleared.
- The register states the review chain's ten steps in order and its two-round revision cap: one
  round is steps 3 through 7 run once, a fix verdict buys one redraft and one second run, and a
  second fix verdict goes to the owner. There is one cap on the whole chain, not one per step.
- The PDF is not added to `package.json`'s `files` array; `check:package` proves it does not ship.

### Task G2-2: The Cairn Vale rules and the must-fire fixture suite

**Chain:** G2. **Depends on:** G2-1. **Deliverables:** 4.

**Files:**
- Create: `.vale/styles/Cairn/SentenceCeiling.yml` (25 words, admin and editors, warning),
  `.vale/styles/Cairn/LongSentence.yml` (40 words, all published tracks, warning),
  `.vale/styles/Cairn/ParagraphBounds.yml` or the equivalent script check if Vale cannot hold a
  paragraph measure, `scripts/checks/vale-fixtures/` (one fixture per Cairn rule),
  `scripts/checks/check-vale-fixtures.mjs`, `src/tests/unit/check-vale-fixtures.test.ts`
- Modify: `.vale.ini` (the section levels only; the vendored packages stay unedited),
  `package.json` (`"check:vale-fixtures"`), `.github/workflows/test.yml`

**Interfaces:**
- Produces: `npm run check:vale-fixtures`, which runs every Cairn rule against its fixture on the
  pinned binary and fails when a rule reports nothing.
- Consumes: Vale 3.15.1, the CI pin.

**Steps:**
- [ ] **Step 1:** write the two length rules at warning level and the paragraph rule at error
  level; write one fixture per Cairn rule, including the five that already exist.
- [ ] **Step 2:** write the fixture runner and its unit test; wire it into CI on every run; full
  gate; commit.

**Gate:** `npm run check && npm test && npm run check:vale && npm run check:vale-fixtures`.

**Acceptance criteria:**
- Both length rules ship at warning level with no promotion path, and each rule file's comment
  states that decision 1 settles the level permanently.
- The 25-word ceiling fires only under `docs/admin/**` and `docs/editors/**`; the 40-word ceiling
  fires across every published path.
- The sentence ceiling travels with its two companion rules from ASD-STE100: complex text goes
  into a list, and no part of a sentence is dropped to make it shorter. Both appear in the rule
  file's message or in the register section G2-1 wrote.
- The paragraph rule holds three to eight sentences and 150 words with 250 as the hard limit, at
  error level, and a list lead-in is exempt.
- `check:vale-fixtures` fails when any Cairn rule reports zero findings on its own fixture, and
  the unit test proves that by disabling one rule and asserting the runner fails.
- The fixture suite runs on every CI run, not once, and `test.yml`'s step is unconditional.
- Both vendored packages, `Google` and `Microsoft`, are unedited: `git diff` over
  `.vale/styles/Google/` and `.vale/styles/Microsoft/` is empty.
- Two fixtures record the exemplar failures the spec's receipt names: KEP-2400's 44-word sentence
  against the 40-word ceiling, and both exemplars' paragraphs under the three-sentence floor.
- `npm run check:vale` is green on `main`'s published set, since the new length rules warn.

### Task G2-3: `check:provenance`, the deny-by-default core

**Chain:** G2. **Depends on:** G2-2, G1-1 (the parser). **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-provenance.mjs`,
  `scripts/checks/fixtures/docs-standard/provenance-pass/`,
  `scripts/checks/fixtures/docs-standard/provenance-fail-unclassified/`,
  `scripts/checks/fixtures/docs-standard/provenance-fail-unresolved/`,
  `src/tests/unit/check-provenance.test.ts`
- Modify: `package.json` (`"check:provenance"`), `scripts/checks/docs-standard-scope.json`

**Interfaces:**
- Produces: `npm run check:provenance`, deny-by-default over the brief's `sentences` list.
- Consumes: `scripts/checks/brief.mjs`; `measure-prose.mjs`'s sentence splitter, imported rather
  than reimplemented, so one definition of a sentence holds across the standard.

**Steps:**
- [ ] **Step 1:** write the failing tests; write the sentence walk, the `sentences` match, and the
  id resolution against the track ledger; run green.
- [ ] **Step 2:** wire it; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- Every sentence in the page must appear in the brief's `sentences` list, in order and in count. A
  sentence the drafter did not classify fails the build, naming the sentence and its index.
- Every non-`no-claim` element must resolve to an entry in the ledger the brief's `track` names.
  An unresolved id fails, naming the id.
- An entry whose tier is `unverified` fails when a brief cites it, since an `unverified` entry
  must not enter any brief.
- The sentence splitter is imported from `measure-prose.mjs`; a `grep` for a second splitting
  regex in `check-provenance.mjs` returns nothing.
- All three fixtures run in the unit test with the expected exit codes and messages.
- The script never reads the published page for ids; a `grep` proves no id syntax is matched
  against page text.
- Scoped by `docs-standard-scope.json` on the same terms as `check:anatomy`.

### Task G2-4: `check:provenance`, the fact matcher and the front-door fixture

**Chain:** G2. **Depends on:** G2-3. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/fixtures/docs-standard/provenance-front-door/` (the rejected draft's
  editors-emailing-the-owner sentence, its brief, and the front-door ledger stub),
  `scripts/checks/fixtures/docs-standard/provenance-fail-uncited-fact/`
- Modify: `scripts/checks/check-provenance.mjs`, `src/tests/unit/check-provenance.test.ts`

**Interfaces:**
- Produces: the second half of the gate, the machine-extractable fact check.
- Consumes: `check-fact-coverage.mjs`'s token classes, imported rather than duplicated.

**Steps:**
- [ ] **Step 1:** add the fact matcher: every machine-extractable fact in the page must appear in
  at least one cited entry.
- [ ] **Step 2:** build the front-door fixture and assert both of its outcomes; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- The matcher covers the classes the spec names: numerals, version strings, file paths, commands
  and flags, export and config names, and the product claims listed in the ledger's `owner` tier.
- The token classes are imported from `check-fact-coverage.mjs`; the two scripts share one
  definition and a `grep` proves the extractor is defined once.
- The front-door fixture reproduces both outcomes the spec describes: leaving the sentence
  unclassified fails the build outright, and marking it `no-claim` passes the script. The unit
  test asserts both, and the second case's assertion carries a comment stating that the reviewer,
  not the script, catches a narrative assertion recorded as claiming nothing.
- An uncited machine-extractable fact fails, naming the token and the sentence.
- Everything the extractor cannot reach is documented in the script's header as the fresh
  reviewer's job at chain step 7.

### Task G2-5: `check:prose-read` and the receipt ledger

**Chain:** G2. **Depends on:** G2-3. **Deliverables:** 4.

**Files:**
- Create: `docs/internal/record/docs-rebuild/receipts.md` (the ledger, header and columns, no rows
  yet), `scripts/checks/check-prose-read.mjs`,
  `scripts/checks/fixtures/docs-standard/receipts-pass.md`,
  `scripts/checks/fixtures/docs-standard/receipts-fail-missing-row.md`,
  `src/tests/unit/check-prose-read.test.ts`
- Modify: `package.json` (`"check:prose-read"`), `scripts/checks/docs-standard-scope.json`

**Interfaces:**
- Produces: the receipt as decision 3 settles it: a pull-request artifact plus one row per page in
  `receipts.md`. No per-page receipt file, no content hash.
- Consumes: `docs-standard-scope.json`.

**Steps:**
- [ ] **Step 1:** write the ledger's columns and its header stating the receipt contract; write the
  failing tests; write the script; run green.
- [ ] **Step 2:** wire it; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- `receipts.md` is a markdown table with these columns, in this order: `page`, `type`,
  `corpus entry`, `reviewer verdict`, `dispatch id`, `reader test`, `date`, `pull request`.
- `reader test` carries a result or the literal `n-a`; the header states that a reference entry
  never gets one.
- `check:prose-read` fails a published page in scope that has no row, naming the page. It fails a
  row whose `page` resolves to no file. It passes otherwise.
- The script computes no hash and reads no per-page receipt file. A `grep` for `createHash` in
  `check-prose-read.mjs` returns nothing, and the script's header states that decision 3 settles
  the mechanism as the pull-request artifact plus this ledger.
- The header states the consequence the decision buys: a typo fix does not re-enter the review
  chain, because nothing here is content-addressed.
- `receipts.md` is under `docs/internal/`, so it never ships in the tarball; `check:package`
  proves it.
- Both fixtures run in the unit test.

### Task G2-6: `check:ledger`

**Chain:** G2. **Depends on:** H1 (the schema document), G2-3. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-ledger.mjs`,
  `scripts/checks/fixtures/docs-standard/ledger-pass.md`,
  `scripts/checks/fixtures/docs-standard/ledger-fail-duplicate-id.md`,
  `scripts/checks/fixtures/docs-standard/ledger-fail-dead-path.md`,
  `src/tests/unit/check-ledger.test.ts`
- Modify: `package.json` (`"check:ledger"`)

**Interfaces:**
- Produces: `npm run check:ledger`, validating the five ledger files.
- Consumes: `docs/internal/record/docs-rebuild/ledger-schema.md`, the one cross-chain edge into
  G2. If the schema is not on `main` when this task dispatches, the task waits rather than
  inventing a schema.

**Steps:**
- [ ] **Step 1:** write the failing tests; write the validator: id format, uniqueness within a
  file, tier validity, source presence, and `read`-tier `file:line` re-resolution.
- [ ] **Step 2:** wire it; full gate; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- Every id matches `^(admin|editors|extend|reference|front-door)-\d{4}$` and is unique within its
  file; a duplicate fails, naming both rows.
- Every entry carries a tier from the four, and every entry outside `unverified` and `retired`
  carries a proving source in the shape its tier requires.
- Every `read`-tier entry's `file:line` is re-resolved against the working tree; a path that is
  gone fails, naming the id and the path. This is what converts "the harvest went stale" from
  prose into a failing test.
- A `gate`-tier entry whose named gate is not a script in `package.json` fails.
- The validator reads its column names from `ledger-schema.md`'s stated set and fails when a
  ledger's header row does not match, so the schema and the gate cannot drift apart.
- All three fixtures run in the unit test.
- The script tolerates a missing ledger file with a clear message naming which track has not been
  harvested yet, so it is green before chain H merges.

### Task G2-7: `check:figures` and the `check:visuals` alt hole

**Chain:** G2. **Depends on:** G2-2. **Deliverables:** 3. **Blocked-on-owner:** the figures
working-tree state must be committed to `main` first.

**Files:**
- Modify: `scripts/figures/` (the seven assertions), `scripts/checks/check-visuals.mjs` (the alt
  attribute), `docs/internal/docs-register.md` (the figure section: the two tests and the
  two-lane routing rule), `package.json` if the figure script's flags change
- Create: `scripts/checks/fixtures/docs-standard/figures/` (one fixture per assertion, pass and
  fail), `scripts/checks/fixtures/docs-standard/visuals-fail-no-alt.md`,
  `src/tests/unit/check-figures.test.ts`

**Interfaces:**
- Produces: `check:figures` grown from a staleness check to seven mechanical assertions;
  `check:visuals` failing an image with no alt attribute.
- Consumes: the owner's committed figures substrate.

**Steps:**
- [ ] **Step 1:** verify the substrate is on `main`. **If it is not, stop and report the block.**
  Re-verify spec decisions 5, 5a, and 6 against the merged state and record any that changed.
- [ ] **Step 2:** write the seven assertions with their fixtures; close the alt hole; full gate;
  commit.

**Gate:** `npm run check && npm test && npm run check:figures && npm run check:visuals`.

**Acceptance criteria:**
- `check:figures` runs seven mechanical assertions, each named in the script's header and each
  with a fixture that fires and a fixture that passes.
- The assertions cover, at minimum: every figure has a committed source, every figure has a
  committed generating script, the rendered output is not stale against its source, every figure
  has alt text, every figure has a caption paragraph, every figure has a text alternative
  reachable from the page, and no third figure tool is used beyond mermaid in the page and
  hand-authored SVG.
- `check:visuals` fails an image with no alt attribute, and its fixture proves the previous
  behavior passed it.
- The register gains the two figure tests as a person's checks beside the seven mechanical
  assertions: the test for a figure that should not be there (remove it; if the text still makes
  the point without a new sentence, it was decoration) and the test for a figure that is missing
  (a paragraph carrying containment words, direction words, or a branch is the text alternative of
  a diagram nobody drew). The register also states the two-lane routing rule, mermaid in the page
  by default and hand-authored SVG as the exception, with no third tool.
- The re-verification of decisions 5, 5a, and 6 against merged `main` is recorded in the task's
  report and, where a decision changed, in R1's amendment.
- Every fixture runs in the unit test.

**Notes:** the owner's files are `package.json`, `.github/workflows/test.yml`, `scripts/figures/`,
`docs/internal/site-figures.md`, `docs/internal/site-figures.svg`, and `docs/extend/assets/`, with
the two writer-facing `assets/*.md` files moved to `docs/internal/figures/` in the same commit so
`check:arm-indexes` is green. No other task in this plan reads those paths, so only this one
blocks.

### Task G2-8: The G2 CI wiring, the path scopes, and the link-rot routine

**Chain:** G2. **Depends on:** G2-4, G2-5, G2-6, G2-7. **Deliverables:** 3.

**Files:**
- Modify: `package.json` (the `check` composite gains the G2 scripts), `.github/workflows/test.yml`
  (one step block), `scripts/checks/docs-standard-scope.json` (the final scope set)
- Create: the scheduled link-rot routine through the `schedule` skill, with its definition
  recorded at `docs/internal/record/docs-rebuild/link-rot-routine.md`

**Interfaces:**
- Produces: every G2 gate wired and scoped; the external link check on a schedule.
- Consumes: G2-3 through G2-7.

**Steps:**
- [ ] **Step 1:** wire the scripts into `package.json` and `test.yml`.
- [ ] **Step 2:** create the scheduled routine; record its definition and its trigger; full gate;
  commit.

**Gate:** `npm run check && npm test`, plus every new gate run by name.

**Acceptance criteria:**
- `npm run check` runs `check:provenance`, `check:prose-read`, `check:ledger`, and
  `check:vale-fixtures`, and CI runs the same by name in readable steps.
- `docs-standard-scope.json` lists every path exclusion with the plan-three track plan that removes
  it. An exclusion with no named remover fails the scope file's own self-check, which runs inside
  `check:anatomy`.
- The link-rot routine runs on a schedule rather than per pull request, reports rather than fails,
  and its recorded definition names the condition that pings.
- The tell scanner is invoked in report mode over changed docs paths where it is available, and
  its absence never fails a build. `test.yml`'s step for it is non-blocking, and the step's name
  says so.
- No `check:cadence` script exists; a `grep` for `check:cadence` in `package.json` returns nothing.

---

## Chain D: the demonstration page (unit 4)

Three tasks, after H, C, G1, and G2 merge. Full gate.

### Task D1: The brief, the outline, and the draft

**Chain:** D. **Depends on:** H3, C5, G1-7, G2-8. **Deliverables:** 3.

**Files:**
- Create: `docs/extend/add-a-custom-admin-screen.brief.yml`
- Modify: `docs/extend/add-a-custom-admin-screen.md` (rebuilt, not edited)

**Interfaces:**
- Consumes: `extend-facts.md`'s entries for this page, `page-types.md`'s type assignment, the
  `task-guide` template, the approved `task-guide` corpus entry, and `drafting-dispatch.md`'s
  prompt fragment verbatim.
- Produces: the rebuilt page and its brief.

**Steps:**
- [ ] **Step 1:** write the brief file from the ledger; the `needs` and `keep` lists cite ids.
- [ ] **Step 2:** the outline is reviewed against the brief, by a reviewer and by `check:anatomy`,
  **before any sentence is drafted**. A page whose type, title, or section order is wrong goes
  back here.
- [ ] **Step 3:** draft the page one section per read, under the quarantine, recording the
  dispatch id; commit.

**Gate:** `npm run check:anatomy && npm run check:headings && npm run lint:markdown &&
npm run check:docs`.

**Acceptance criteria:**
- The brief parses and carries all eight fields, with `type: task-guide`, `track: extend`, a named
  `exemplar`, a `corpus_entry` whose manifest `approved` column is filled, `needs` and `keep`
  lists of resolving ids, and a `sentences` list covering every drafted sentence.
- The drafting dispatch's readable-file list excludes the page it replaces, and the dispatch
  record proves it: `docs/extend/add-a-custom-admin-screen.md` does not appear in the dispatch's
  Files list before step 3's draft.
- The outline review happened before any prose: the commit history shows an outline-only commit or
  the task report carries the reviewer's outline verdict with a timestamp before the draft.
- The page follows the `task-guide` template's section order, with every required heading present
  and in order.
- Every `keep`-class item the ledger records for this page is carried: the anchor map's slugs
  survive or are repaired, the gated blocks match their entries byte for byte, and every Vale
  suppression is either carried with its comment or its removal is recorded in `deviations`.
- No sentence in the page appears in the old page. This is checkable: the diff shows no unchanged
  prose line outside a gated block.

### Task D2: The gates, the fresh reviewer, and the coverage diff

**Chain:** D. **Depends on:** D1. **Deliverables:** 3.

**Files:**
- Modify: `docs/extend/add-a-custom-admin-screen.brief.yml` (the `deviations` list the review
  produces), `docs/extend/add-a-custom-admin-screen.md` (one redraft round at most)
- Create: `docs/internal/record/docs-rebuild/demonstration-review.md` (the reviewer's report and
  the coverage diff's report)

**Interfaces:**
- Consumes: every gate from G1 and G2.
- Produces: the review record.

**Steps:**
- [ ] **Step 1:** run the chain's steps 3 through 6: `check:anatomy`, `check:headings`,
  `check:docs`, `check:visuals`, `check:figures`, then the linters and markdownlint, then the tell
  scanner in report mode, then `check:provenance`.
- [ ] **Step 2:** dispatch the fresh reviewer, a different context and a different model family
  from the drafter, with the corpus entry.
- [ ] **Step 3:** dispatch a separate agent, never the drafter, for the coverage diff against the
  extend ledger. One redraft round at most; a second fix verdict goes to the owner.
- [ ] **Step 4:** run `check:ledger` over all five ledgers, its first full run; full gate; commit.

**Gate:** the full `npm run check && npm test`, plus `check:anatomy`, `check:headings`,
`check:provenance`, `check:ledger`, `check:figures`, `check:visuals`, `check:vale`,
`check:vale-fixtures`, and `lint:markdown` by name.

**Acceptance criteria:**
- Every named gate exits 0 on the page.
- `check:provenance` passes with every sentence classified and every cited id resolving; no
  sentence carries `no-claim` that states a checkable proposition, which the reviewer's report
  addresses explicitly.
- The reviewer's report names the corpus entry it graded against and carries the measurement
  table: sentence count, average length, longest sentence, hinged-pair share, short-sentence
  share, and paragraph counts, each beside the corpus entry's number.
- The coverage diff's report lists every ledger entry for this page that the drafted page dropped,
  and each is either restored or recorded in the brief's `deviations` with a reason.
- The revision cap held: at most one redraft, and the report says how many rounds ran.
- `check:ledger` exits 0 over all five ledger files.
- The type ids in `page-types.md`, the template filenames, and the brief's `type` field agree
  exactly; a mismatch is a fix verdict.

### Task D3: The reader test, the receipt, and the measured cost

**Chain:** D. **Depends on:** D2. **Deliverables:** 3. **Blocked-on-owner:** the reader test is
one attended sitting, and the demonstration read is the plan's closing gate.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/receipts.md` (the first row)
- Create: `docs/internal/record/docs-rebuild/demonstration-cost.md` (the comparison artifact and
  the measured cost)

**Interfaces:**
- Produces: hand-off artifact 9, the demonstration page's measured cost in tokens and sittings,
  which is what sizes plan three.
- Consumes: D2's review record.

**Steps:**
- [ ] **Step 1:** run the reader test: someone who is not the author does the task from the page,
  one sitting. Record every place the page was unclear.
- [ ] **Step 2:** write the receipt row and the comparison artifact.
- [ ] **Step 3:** present the rebuilt page beside the original to the owner. **The owner's read
  and approval to proceed is the plan's closing gate, not this task's criterion.**

**Gate:** `npm run check:prose-read && npm run check && npm test`.

**Acceptance criteria:**
- `receipts.md` carries one row for `docs/extend/add-a-custom-admin-screen.md` with every column
  filled: type, corpus entry, reviewer verdict, dispatch id, reader-test result, date, and pull
  request.
- `check:prose-read` exits 0 with the page in scope.
- `demonstration-cost.md` carries the rebuilt page beside the original, the token spend for the
  page end to end broken down by step (brief, outline review, draft, gates, fresh reviewer,
  coverage diff, reader test), and the attended sitting count.
- The cost document states the per-page figure plan three multiplies, and names the pages it does
  not apply to: the reference entries, which are edited in place.
- The reader test's result is in the receipt row and its findings are listed in the cost document,
  whether or not they were folded.
- The document does not assert the owner's approval. It states that the read is pending or
  records the date it happened.

---

## Chain R: records and the hand-off

Two tasks, last.

### Task R1: The polish-spec amendment and the roadmap absorption

**Chain:** R. **Depends on:** D3. **Deliverables:** 2.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-08-polish-passes-design.md` (an "Amendment, 2026-09-08"
  section), `ROADMAP.md` (the claims-verification row)

**Interfaces:**
- Consumes: the plannability review's "Do polish-B and polish-D fold into plan two cleanly?"
  section; owner decision 5.
- Produces: the amended sequencing, recorded once.

**Steps:**
- [ ] **Step 1:** write the amendment section.
- [ ] **Step 2:** absorb the roadmap row with the overrule recorded; `check:docs`,
  `check:rulings-format`, `check:vale`; commit.

**Gate:** `npm run check:docs && npm run check:rulings-format && npm run check:vale`.

**Acceptance criteria:**
- The amendment states three things, each with its reason:
  1. **Polish-B splits.** B-code keeps tasks 2, 8, 9 and the `check:reference` change in task 5,
     and merges before the harvest branches. Its prose findings D1 through D30 and F7 through F10
     fold into plan three as authoritative ledger input, since a rebuild from a correct ledger emits
     the corrected page once rather than editing a page and rebuilding it afterwards.
  2. **Polish-D splits.** Its substrate commit and its figure and form tasks stay where they are.
     Its task 1, `docs/why-cairn.md`, becomes plan three's first page, since authoring it now
     repeats the exact failure the standard exists to stop. Its `docs/README.md` route-order item
     becomes an index-page question this standard governs.
  3. **Polish-C precedes the harvest.** Polish-C must land entirely before the harvest branches,
     never between the harvest and plan three and never concurrently with either.
- The amendment names the cost of waiting on the front door: it stays as it is until plan three's
  first page lands, and any cairn.pub work depending on the new front-door copy waits with it.
- `ROADMAP.md`'s docs claims-verification row is marked absorbed by this harvest, names the five
  ledger files as where the sweep's output lives, and **records the overrule of its ratified
  after-`beta.1` sequencing with its reason**: polish-C's renames invalidate ledger entries
  wholesale, so the harvest runs with this plan rather than after `beta.1`. The row's status as a
  blocking gate before `1.0.0` is restated, not dropped.
- Nothing in the amendment changes polish-A or polish-C's own task lists.

### Task R2: STATUS, HISTORY, ROADMAP, CHANGELOG, the friction log, and the hand-off manifest

**Chain:** R. **Depends on:** R1. **Deliverables:** 6.

**Files:**
- Create: `docs/internal/record/docs-rebuild/hand-off.md` (the nine artifacts, each at its fixed
  path, each verified)
- Modify: `docs/STATUS.md`, `docs/HISTORY.md`, `ROADMAP.md`, `CHANGELOG.md`,
  `docs/internal/docs-friction-log.md`, `docs/internal/docs-register.md`,
  `docs/internal/record/docs-rebuild/README.md`

**Interfaces:**
- Produces: the closing record and hand-off artifact list plan three reads first.
- Consumes: every chain's output.

**Steps:**
- [ ] **Step 1:** write `hand-off.md`, verifying each of the nine artifacts exists at its stated
  path.
- [ ] **Step 2:** the register's standard section; the friction-log triage; ROADMAP; CHANGELOG;
  HISTORY; STATUS last.
- [ ] **Step 3:** `check:docs`, `check:vale`, `check:arm-indexes`, `check:rulings-format`; commit.

**Gate:** `npm run check && npm test`.

**Acceptance criteria:**
- `hand-off.md` lists all nine artifacts with a verified path each:
  1. The five ledgers at `docs/internal/record/docs-rebuild/<track>-facts.md`.
  2. The page-type assignment at `docs/internal/record/docs-rebuild/page-types.md`, covering every
     published page.
  3. `docs/internal/corpus/` and its manifest, approval column filled, every one of the twelve
     types covered.
  4. `docs/internal/templates/`, twelve templates, each heading marked required or optional.
  5. The brief schema, `scripts/checks/brief.mjs`, and one worked brief.
  6. The six scripts plus markdownlint, wired into `package.json` and CI, each with its path scope
     and the named plan-three track plan that removes each exclusion.
  7. The Vale rules with their must-fire fixtures, verified on 3.15.1.
  8. The drafting-dispatch fragment at
     `docs/internal/record/docs-rebuild/drafting-dispatch.md`.
  9. The demonstration page's measured cost at
     `docs/internal/record/docs-rebuild/demonstration-cost.md`.
- `docs/internal/docs-register.md` records the standard, points at the spec, and names the six new
  scripts. The sixth, `check:fact-coverage`, is recorded as a plan addition to the spec's
  five-script table with its reason: unit 1's first acceptance criterion demands a machine check.
- `ROADMAP.md` carries the docs standard as an Active initiative with plan three named, and no
  item this plan shipped is still listed in a live tier.
- `CHANGELOG.md` gains one entry under `## Unreleased` with no `Consumers must:` line, since no
  public surface changed. `package.json`'s version is untouched and `check:version` is green.
- `docs/internal/docs-friction-log.md` is triaged for entries this standard resolves: each is
  fixed and deleted, promoted to the ROADMAP tier where it bites, or deleted as no longer true.
  No entry is left with an unchanged status.
- `docs/STATUS.md` is present tense only, at most 60 lines, and its next action is authoring plan
  two. Anything historical this plan produced is in `docs/HISTORY.md`, not STATUS.
- `docs/HISTORY.md` gains one entry naming what landed, what the gate caught, and what plan three
  would be wrong to rediscover from scratch.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the six new scripts and the parser; the reviewer fan-out:
`prose-voice-reviewer` over the rebuilt demonstration page and the register section,
`cairn-register-editor` over the register section, `diff-reviewer` per task inside the chains as
usual; fix rounds per the chain discipline. The gates by name: `check:anatomy`, `check:headings`,
`check:provenance`, `check:prose-read`, `check:ledger`, `check:fact-coverage`,
`check:vale-fixtures`, `lint:markdown`, plus the repository's own `check:docs`, `check:vale`,
`check:reference`, `check:reference:signatures`, `check:snippets`, `check:transcripts`,
`check:symbols`, `check:editor-quotes`, `check:arm-indexes`, `check:visuals`, `check:figures`,
`check:package`, `check:readiness`, and the full `npm run check && npm test`. The rebase order for
the contended files is G1 then G2 then D then R, per the Reconciliation block. Both budgets scored:
tokens against the 9.0M ceiling, and attended time as planning misses plus execution sittings.
STATUS, HISTORY, ROADMAP, CHANGELOG per R2. The post-mortem lives here beside the plan. The
`cairn-*` memories refreshed. Push, one pull request per chain, merge on green CI. Plan three is
authored only after the owner's demonstration read.

## What this pass hands forward

- **Plan three, the rewrite** (unit 5): four to five plan documents, one per track plus the front
  door, each with its own worktree, its own pull request, and its own ceiling, **re-sized from
  `demonstration-cost.md` rather than from the spec's 8M to 12M estimate**. `docs/why-cairn.md`
  is its first page. Reference entries are edited in place, the one exception to the rebuild rule,
  and each reference brief records the exception with its reason.
- **Plan one's own follow-ups**, if the Claude infrastructure pass left any. This plan consumed
  its outputs and changed none of them.
- **The scope exclusions**, each naming the plan-three track plan that removes it. Plan three's
  closing criterion is that `docs-standard-scope.json` carries no exclusion.
- **The cairn.pub consultation**, owed before plan three's first track merges: that site renders the
  doc arms from its installed engine version, so a rebuild on a branch stays invisible until a
  release and a pin bump, and a rename or removal breaks its navigation at the bump.
- **The registry gaps** H4 recorded under "types the registry may lack": a glossary, a migration
  guide, a release-notes page, or an FAQ has no type. The escape is a brief-recorded deviation
  naming the nearest type, pending an owner-approved registry addition with its exemplar.
- **Release:** the window holds. This pass does not bump or publish.
