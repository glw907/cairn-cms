# Docs Standard, Pass 2a: the toolset and the demonstration page

> **This is pass 2a of the docs standard.** Plan one is the Claude infrastructure pass, the owner's
> dotfiles and poplar pass carrying spec unit 3c: the workstation setup and the tellgrader
> docs-register profile. It lands first, and unit 3c and its chain are removed from this plan
> entirely.
>
> **The rewrite that follows this pass is five per-track stages, not one plan three.** Each stage is
> one pass with its own plan document, its own worktree, its own pull request, and its own ceiling,
> and **each stage's plan is authored only after the previous stage's tuning checkpoint**, against
> the tooling that checkpoint amended. The order is by difficulty of writing the track well, easiest
> first: reference, extend, admin, editors, front door. "Stages that follow" at the end of this
> document names what each carries, why it sits where it does, and the task shapes each reuses.
>
> **REVISION 3, authored 2026-09-08.** Revision 2 was one toolset pass split into two runs, 2a and
> 2b, with the whole 76-page harvest in 2b. The owner's direction of 2026-09-08 dissolved 2b and
> moved the harvest into the per-track stages, so the docs system is tuned as it is used. Revision 2
> was authored against spec revision 3
> (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`) and the six adversarial reviews of
> revision 1 under `docs/internal/record/2026-09-08-polish-inputs/` (`plan2-review-coverage.md`,
> `-plannability.md`, `-executor.md`, `-sequencing.md`, `-charter.md`, `-benchmark.md`); that spec's
> Implementation section now carries the staged shape. What each review finding became is recorded in
> "Review disposition" at the end of this document, and what the restructure changed is recorded
> there too.
>
> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` -> `diff-reviewer` -> gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js`. The pass runs as **two workflow invocations** with
> one owner sitting between them, because the workflow has no wait primitive. Chain P and every
> task marked **conductor task** run in the main loop, not under the workflow. Steps use checkbox
> syntax for tracking.

**Goal:** hand stage one, the reference rewrite, everything a stage cannot be authored without: an
approved corpus, nine templates, the page-type registry with its two lifecycle records, a brief
schema with a parser, the gate estate with its path scopes, Vale rules with must-fire fixtures, a
fact-ledger schema proved on one real page, a drafting-dispatch fragment, one page rebuilt end to
end with its measured cost, and the first tuning checkpoint.

**Architecture:** one preflight that builds every shared substrate before any fork, then four
concurrent producers, one consumer, and a records chain. P verifies the sequencing preconditions,
re-derives the published-page set, and commits every file two chains would otherwise both create.
H builds the harvest spine and proves it on one page: the fact-coverage tool, the demonstration
page's ledger under `docs/internal/record/docs-rebuild/`, and the drafting-dispatch fragment. The
other four tracks are harvested inside their own stages, against the schema each previous
checkpoint amended. C assembles the corpus the reviews grade against. G1
builds the structure spine: the nine templates and the markdownlint-cli2 runner that carries
anatomy, heading order, the front-door and index shapes, brief presence, and the alt-text hole. G2
builds the prose and receipt spine: the Vale rule set with its golden fixtures, `check:provenance`,
`check:prose-read`, `check:ledger`, and the quality checklist. D rebuilds
`docs/extend/add-a-custom-admin-screen.md` through the whole chain and measures what one page
costs. R records the pass and runs the first tuning checkpoint, which is the artifact stage one is
authored against. Unit 3c is plan one's and is not built here; unit 5, the rewrite, is the five
stages.

**Tech stack:** `markdownlint-cli2` (MIT) with cairn custom rules as the docs linter runner; Vale
3.15.1 (the CI pin) for prose and heading rules; Node ESM scripts under `scripts/checks/` with
co-located vitest specs for the four gates no linter can carry; the `yaml` package already in `dependencies` for the brief parser.

**Spec:** `docs/superpowers/specs/2026-09-08-docs-standard-design.md` (revision 3 with the
2026-09-08 staged Implementation section; units 2, 3a, 3b, and 4 in full, unit 1's schema and tools,
and the first tuning checkpoint. Unit 3c belongs to plan one; unit 1's four remaining track harvests
and unit 5 belong to the stages). Inputs: `docs/internal/record/2026-09-08-polish-inputs/`,
above all `docs-spec-review-plannability.md`, `front-door-author-brief.md`,
`front-door-net-failure.md`, `docs-sweep.md`, and `exports-sweep.md`.

**Token ceiling: 4.75M**, recomputed for 2a alone, and restated from the two-run total rather than
from run one's share of it, since two of the three changes move work across the run boundary rather
than change run one itself. Revision 2 carried 6.5M across two runs. The fourteen track-harvest
tasks, H12, and `check:figures`' seven assertions leave for the stages, a gross removal, while the
baseline record and the tuning checkpoint arrive as this pass's one genuinely new cost, at about
0.30M, because they instantiate the measure set and the lever map, then amend two schemas and the
templates; those two changes net to about 2.35M removed. D3 and chain R, previously scoped to run
two, move into this single pass, adding back about 0.20M. 6.5M minus 2.35M plus 0.20M is 4.35M. Per
chain: P 0.30M, H 0.35M, C 0.45M, G1 1.00M, G2 1.35M, D 0.45M, R 0.45M, which sums to the same
4.35M against the 4.75M ceiling, leaving 0.40M slack.

**Each of the five stages carries its own ceiling, set when its plan is authored** from the previous
stage's measured cost and, for stage one, from `demonstration-cost.md`. Do not pre-number them here;
a ceiling written for a plan nobody has authored is a phantom, the way `0.77.0` was. The rough total
to expect across the five is **10 to 17M**: the plannability review's ranges for unit 1 (2.0 to 4.5M)
and unit 5 (8 to 12M) sum to 10.0 to 16.5M, 2a absorbs about 0.35M of unit 1 as the harvest spine and
the demonstration page's own ledger, and the five tuning checkpoints add about 1.0M. That is a range
for a sizing conversation, never a commitment; the first stage's measured cost replaces it.

**Checkpoint interval:** four tasks per chain. At each checkpoint the conductor
writes STATUS (task ledger, decisions taken, spend against the ceiling, next task). At 80 percent
of 4.75M the conductor finishes the running task in every chain, writes STATUS, and asks one
combined question.

**Cut points.** 2a's own cut point is unchanged in principle and unused in practice: if the ceiling
binds, chain D's demonstration page is the last work to leave, because everything else is what a
stage plan is authored against. Beyond that, **each stage is its own pass**, which is the point of
the restructure: a wrong ledger field or a bad template is found after one small track rather than
after all five.

## The two workflow invocations and the two owner sittings

The workflow has no wait primitive, so a task that stops for the owner ends its chain for that
invocation. The pass therefore runs as two invocations with one owner sitting between them. These
are invocations, not passes: 2a is one pass with one ceiling and one pull-request set.

**Invocation one:** P (main loop), then chains C (C1 through C4), G1 (all seven), G2 (all nine), and
H (H1 through H3) concurrently, then D1 and D2 as conductor tasks after those chains merge.

**The mid sitting (owner).** One batched sitting carrying C5's corpus approval, the CLAUDE.md line
displacement owed from plan one, and ratification of the provisional corpus approval D1 ran against
(C5's notes).

**Invocation two:** D3, then chain R in order: R1, T1 (the baseline record), T2 (the tuning
checkpoint), R2, R3.

**The closing sitting (owner).** D3's reader test, the demonstration read, and the demonstration
page's own unverified-claim rulings, presented together. The rest of the unverified list does not
exist yet: each track's unverified rulings are one sitting inside that track's stage, batched with
that stage's other owner items.

Two owner sittings, which is what this pass batches to. Everything that can batch does: C5 and the
CLAUDE.md displacement at the mid sitting, D3 and the one page's unverified rulings at the closing
one.

## Ruled inputs (recorded; no task re-derives them)

- **Owner decisions 1 through 7 are accepted as the spec's recommendations state them.** Length
  rules warn permanently with no promotion path (decision 1). **The registry is nine page types
  from task P2 onward**, which is owner decision 2 resolved on 2026-09-08: the internal proposal
  type is dropped, the condition entry and the symptom row fold into the reference entry as section
  shapes, and both front-door types stay. The eleven-then-twelve straddle is deleted, because a
  plan-internal split guarded only by prose is the weakest form of a watch item and nothing detects
  a violation. **The registry is maintained on outcome from here**, per the spec's registry
  lifecycle: `docs/internal/page-types.md` carries one outcome row per type, and
  `docs/internal/page-type-rulings.md` carries each ruling in the shape
  `docs/internal/engine-rulings.md` uses. The
  receipt is a pull-request artifact plus one ledger row per page, never a per-page committed file
  with a content hash (decision 3). **The reader test runs on nine pages across the initiative
  (decision 4), allocated one to the demonstration page here and eight across the five stages**, per
  the allocation in "Stages that follow". The `ROADMAP.md` claims-verification row is absorbed
  and its after-`beta.1` sequencing overruled, with the overrule recorded (decision 5). No rendered
  docs preview is added (decision 6). The new scanner measures live in the workstation's tellgrader
  behind a docs-register profile, so they are plan one's work (decision 7). **Decision 2's earlier
  "review after the demonstration page shows what a template costs" note is superseded by the
  registry lifecycle's first review, which D3 runs at the demonstration page and records as a
  ruling.** **The registry lifecycle gains a fourth review trigger, the close of every stage**, which
  is the tuning checkpoint's first part; the spec's registry lifecycle carries it.
- **The gate estate is consolidated onto two runners plus four bespoke scripts.**
  `markdownlint-cli2` (MIT, `DavidAnson/markdownlint-cli2`) is the runner for page anatomy, heading
  order, the front-door and index shapes, brief presence, and the missing-alt hole (MD045). Vale
  carries the heading rules markdownlint does not (rule 1 is `Google.Headings`, which already ships
  and already runs) plus the prose rules. The four gates that read artifacts no linter can see stay
  as scripts: `check:provenance`, `check:ledger`, `check:prose-read`, and `check:fact-coverage`.
  This is the field's packaging: `github/docs` registers 46 custom rules inside one markdownlint
  run, and GitLab's whole docs lint estate is two binaries. **Revision 1's `check:anatomy` and
  `check:headings` do not exist in this revision.**
- **`scripts/checks/docs-standard-scope.json` is not built.** `markdownlint-cli2`'s glob-keyed
  config overrides are the mechanism that file hand-rolled, and `.vale.ini`'s sections are the same
  mechanism for prose. Revision 1 had five tasks across two chains writing one JSON file whose own
  specification called it an allowlist and an exclusion list in the same sentence. The named-remover
  discipline survives: every glob override that relaxes a rule carries a comment naming the
  plan-three track plan that removes it, and `check:docs-standard-globs` (G1-5) fails an override
  with no named remover.
- **`check:fact-coverage` is a harvest-time tool, not a CI gate.** It matches **extracted fact
  tokens** (numerals, version strings, repository-relative paths, commands with flags, exported
  symbol names, config keys) against a ledger entry's `tokens` and `source` fields. It never
  matches against the `claim` field, which is a normalized paraphrase written deliberately not to
  resemble the page; matching extracted page tokens against a paraphrase would push entries toward
  satisfying the extractor rather than toward propositions that matter. It is wired into
  `package.json` so a harvest task can run it, and it is deliberately **not** added to CI. That
  non-wiring is recorded in the register with its reason, so it is a decision rather than an
  omission.
- **Ledger entries re-resolve by anchor plus claim string, never by line.** `line` stays in the
  schema as an advisory locator recorded at the preflight sha; `check:ledger` re-resolves a `read`
  entry by its anchor and its recorded claim. A reflow therefore does not invalidate the harvest,
  which matters here (markdownlint) and matters more in the stages, where every page moves.
  **Markdownlint's reflowing rules are disabled on the published pages until their stage rewrites
  them**, per glob, each disable naming the stage that removes it.
- **Unit 3c is plan one's, and this plan consumes it rather than building it.** cairn's chain grades
  a task by `git diff` plus `npm test` and neither reaches `~/.claude/`, `~/.dotfiles/`, or
  `~/Projects/poplar/`. **P1 records what plan one landed and what it did not; a missing plan-one
  output degrades a named criterion and never stops the pass.** Nothing in this plan mechanically
  consumes the Vale hook or the two skills, and the tell scanner is not invoked from CI at all in
  this revision.
- **Polish-C gates the stages' harvests, not this pass.** Its renames invalidate ledger entries in
  exactly the class the ledger exists to guarantee, which is why **polish-C must land before stage
  one's harvest branches**. It does not gate 2a: the only harvest here is H2's one page, which exists
  to break the schema, and a schema is not invalidated by a rename. P1 records the polish-C state and
  **stops nothing**; H2 records that its entries are provisional against polish-C and are re-derived
  at the extend stage's harvest, which is the same treatment the identity-seam and chassis passes'
  page edits get. **Every stage's harvest re-derives its track's pages against merged `main` at that
  stage's own sha**, so a page edited by any pass between 2a and that stage is harvested as it then
  stands, never as `preflight.md` recorded it.
- **The figures substrate is not a pass stop** (amended 2026-09-08 evening, above). `check:figures`,
  `scripts/figures/`, `docs/internal/site-figures.*`, and `docs/extend/assets/` stay uncommitted
  working-tree files that no pass owns, so the published-page count and the `package.json` and
  `test.yml` baseline every G task edits are the ones on `main` today. P1 records the count as it
  stands and the pass proceeds.
- **Polish-B's prose findings are authoritative ledger input, not edits to run.** The findings in
  `docs/internal/record/2026-09-08-polish-inputs/docs-sweep.md` are numbered **1 through 30 with no
  prefix**; `F7` through `F10` live in **`exports-sweep.md`**, not the docs sweep. P1 re-resolves
  every finding number against merged `main`, records that none was applied as an edit because
  polish-B dissolved, and
  writes the **finding-to-track map** each stage's harvest reads. Revision 2 mapped findings to
  harvest tasks; the harvest tasks now live in stage plans nobody has authored, so the map's unit is
  the track and the stage's own plan assigns each finding to a task. A finding that no longer
  resolves is reported, never silently dropped.
- **A published page is never a proving source.** That circularity is what let the front door assert
  a workflow that never happened. The verdict tiers are **five**: `gate`, `read`, `owner`,
  `unverified`, and `retired`. Revision 1 said four in eight places and then used a fifth;
  `retired` is a tombstone tier for an entry whose claim left the corpus. An `unverified` entry must
  not enter any brief.
- **Ids never appear in published markdown.** The brief file carries them.
- **Six keep classes, not the spec's "five".** The spec's unit 1 says "five further entry classes"
  and then lists six bullets. This plan resolves the arithmetic upward to six and records the
  correction here rather than leaving it undisclosed.
- **The page-type assignment lives in `docs/internal/record/docs-rebuild/page-types.md`, not in the
  ledger.** The spec's unit 1
  acceptance criterion 5 says the ledger records it. The ledger is per track and the assignment is
  one table over all 76 pages, so the assignment is one file. Recorded as a deliberate change.
  **P2 enumerates every published page into that file and assigns a type only to the pages 2a
  harvests**, which is the demonstration page. Every other row carries its path and its track with an
  empty `type`, and **each stage assigns its own track's types at its harvest**, against the registry
  as that stage received it. A type assigned before the registry has been tuned by the stages ahead
  of it would be re-derived anyway, and 2a hands forward no type assignment for a track it did not
  harvest.
- **The published-page set is defined once, in P1, and is 76 today.** Nine admin, eight editors,
  thirty-one extend, twenty-five reference, and three front door (`docs/README.md`,
  `docs/why-cairn.md`, and the root `README.md`). `CHANGELOG.md` and `skills/*.md` ship in the
  tarball and are **not** published documentation pages; P1 states that exclusion. Every later task
  reads P1's number and no task re-derives it. **The stage partition regroups the same 76**: each
  track's own `README.md` moves into the front-door stage with the other index and evaluator pages,
  so the stage counts are reference 24, extend 30, admin 8, editors 7, and front door 7. The
  directory counts above define the set; the stage counts assign it. Both appear in P2's header, and
  the two must sum to the same 76.
- **The spec's own 1a/1b split is superseded.** The spec's Implementation section shapes plan one as
  two concurrently launched documents. This is one document with several chains, which is the shape
  `pass-execute-chains` takes. The companion edit to the spec records that.
- **The rewrite is five stages, not one plan three, and the tuning checkpoint is defined once in the
  spec.** The spec's Implementation section carries the checkpoint's definition, the gauging and
  iterating subsection, and the lever map, and every stage references all three; this plan does not
  restate them, so there is one copy to amend. T1 records the baseline and T2 runs the checkpoint.
- **Release:** no version bump, no publish. The window holds and `CHANGELOG.md` gains one entry
  under `## Unreleased`.

## Amendment 2026-09-08 (evening), from the polish spec revision 4 fold

Geoff's rulings of that evening, recorded in
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` revision 4, change three things in this
plan. Task numbering is unchanged.

1. **The figures substrate is no longer a precondition, and no longer a hard stop.** Pre-task 1 read
   "**The owner commits the figures substrate**" and "This is the pass's one hard stop", and the
   global constraint read "**The owner commits it before P1**". Geoff has ruled the figure assets,
   `scripts/figures/`, `check:figures`, and
   `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md` to be uncommitted
   working-tree files that no pass owns and that the docs initiative replaces with its own figures
   and its own front door. They stay untracked, `docs/extend/assets/*.md` never reaches the
   published arm, and P1 records the published-page count as it stands rather than after a commit.
   Task P1's step 1 becomes a record, not a stop.
2. **Polish-B dissolved, so its edit record is empty.** The preflight instruction to record "which
   polish-B already applied as edits" is answered "none; polish-B dissolved" wherever it appears.
   Every `docs-sweep.md` finding and every `exports-sweep.md` F7 through F10 finding is still mapped
   to its page and track, with four qualifications the polish spec states: D11, D12, and D1 bank
   their docs halves only, since their engine, CLI, and ruling halves execute in polish slices 11a
   and 11b; D21's sentence is removed at stage five rather than corrected; D16 is moot, because the
   two figure-copy files it concerns stay untracked; and A29 is not banked, because it lands in
   slice 11b.
3. **Chain D is ordered after polish-C merges.** Chain D rebuilds
   `docs/extend/add-a-custom-admin-screen.md`, and polish-C's task 1 rewrites the same page to
   compose `PageHeader` beside `AdminTable` with no `OfficeList`. A rebuild from a ledger harvested
   before polish-C re-teaches a removed export and turns `check:snippets` red on `main` after the
   release is cut, and two branches owning one file conflict either way. The merge order below reads
   "P, then C, G1, G2, H in any order, then D, then R" and still does; D additionally waits for
   polish-C's merge and takes a rebase on merged `main` as its step 0.

## Global constraints

- **`npm run check` is `svelte-check --tsconfig ./tsconfig.json` and nothing else.** It is not a
  composite and no task in this plan makes it one. The **full gate is the CI step list in
  `.github/workflows/test.yml`**, roughly thirty sequential `run:` steps, and the G chains extend
  that list. Every claim in revision 1 that `npm run check` runs a docs gate was false about this
  repository.
- **Gate per chain, not per task.** `pass-execute-chains.js` takes one `args.gate` for a whole run,
  so revision 1's twenty-nine different gates were inexpressible. A conductor pre-task extends the
  scratchpad chain script to accept a per-chain gate (see "Conductor pre-tasks"). The four gates:

  | Chain | Gate |
  |---|---|
  | H | `npx vitest run scripts/checks && npm run check:docs` |
  | C | `npm run check:docs` |
  | G1, G2 | `npm run check && npx vitest run scripts/checks && npm run check:docs && npm run check:vale` |

  Chain H cannot gate on `check:ledger` here, because H1 through H3 run concurrently with G2-8, which
  is the task that builds it. The conductor runs `check:ledger` over H's output at the invocation-one
  join, where D2 performs its first real run anyway. **Every stage's harvest chain gates on
  `npm run check:ledger && npm run check:fact-coverage && npx vitest run scripts/checks`**, which is
  the gate this pass could not run and every stage can. D and R run in the main loop and name their
  own gates on the task.
- **Every new unit test is co-located at `scripts/checks/<name>.test.ts`**, and P4 adds
  `scripts/checks/**/*.test.ts` to the vitest `unit` project's `include`. That is what makes
  `npx vitest run scripts/checks` resolve to anything.
- **The tuning checkpoint may change any threshold in this section, and a stage inherits the changed
  value.** Nothing below is fixed for the initiative; it is fixed for this pass, and T1 and every
  later checkpoint revise it against measured evidence.
- **Length rules warn and never gate** (decision 1). No task clears a sentence to satisfy a length
  number. The 25-word ceiling on admin and editors, the 40-word ceiling everywhere, and the
  paragraph bounds all ship at warning level with no promotion path.
- **A warning must be visible or it is not a rule.** `check:vale` runs `--minAlertLevel=error`, so
  every warning in this repository is invisible today (558 `Google.WordListCase`, 178
  `Google.Colons`, 46 `Google.OxfordComma`, 17 `Google.Headings`). G2-4 adds a second, non-blocking
  CI step at `--minAlertLevel=warning --no-exit` writing a report to a CI artifact.
- **Every new or changed Vale rule ships a fixture in the errata-ai golden form.** A fixture
  directory carrying its own minimal `.vale.ini` plus `test.md`, driven as
  `vale --output=line --sort --normalize --relative --no-global --no-exit`, asserted against
  committed expected output. `--no-global` is what makes the run hermetic; `--sort`, `--normalize`,
  and `--relative` are what make the golden stable across machines. Asserting the exact
  `file:line:col:Rule:message` line is stricter than revision 1's "reports at least one finding",
  which a rule firing on the wrong line with the wrong message would pass and which a silently
  rescoped section override would also pass.
- **Vale version skew is real and named.** `.vale.ini`'s header records that this workstation's
  Homebrew binary drifts ahead of the 3.15.1 CI pin and that the two disagree on the same source. A
  local fixture run is advisory; **CI's pinned binary is the verification**, and every Vale task
  says so in its report rather than claiming a local green means the criterion held.
- **Every new script gets a must-fire fixture and a passing fixture, plus a unit test.** Both shapes
  per script, under `scripts/checks/fixtures/docs-standard/`.
- **Internal planning docs stay outside the Vale gates.** `.vale.ini`'s empty `BasedOnStyles` for
  `docs/superpowers/**`, `docs/internal/**`, `docs/STATUS.md`, and `docs/HISTORY.md` is not touched.
- **This plan is not prose-graded.** No receipt, no page brief, no Vale loop.
- **No em dashes in any file this plan produces**, prose and comments alike, and no ruling or pass
  citations in shipped comments or condition copy.
- **`check:version` stays green:** `package.json`'s version is not touched by any task.
- **Deliverables are counted as artifacts, not files.** A script plus its two fixtures plus its unit
  test is one artifact. No task in this plan exceeds four.
- **Two traps are inert for this pass, so no task defends against them.** Port 4173 is the showcase
  Playwright preview and no task here runs the showcase e2e. The worktree showcase `node_modules`
  symlink trap needs no defence for the same reason: nothing here proves the engine through the
  showcase. Do not reinstall the showcase.
- **"Paragraphs outside the bounds" in the review agents' measurement table has no defined bounds
  until G2-4's Vale paragraph rule ships.** `prose-voice-reviewer` and `cairn-register-editor` both
  carry "any paragraph you judge disproportionate for the register" with no number behind
  "disproportionate," because no rule has stated one yet. G2-4 ships `Cairn.ParagraphBounds` and
  states the bounds it sets, three to eight sentences and 150 words with 250 as the hard limit, and
  a reviewer reading that cell before G2-4 lands treats it as an open column, never a silent zero.

## Conductor pre-tasks (before P1 dispatches)

None of these is a numbered task; all run in the main loop and are recorded in `preflight.md`.

1. **Record the owner's untracked working-tree files and depend on none of them** (amended
   2026-09-08 evening, above). `package.json`, `.github/workflows/test.yml`, `scripts/figures/`,
   `docs/internal/site-figures.{md,svg}`, `docs/extend/assets/`, and
   `docs/internal/record/2026-09-04-cairn-case/25-front-door-proposal.md` stay untracked and unowned
   until the docs initiative's own figure and front-door stages replace them. No task reads them, no
   gate sees them, and the pass does not stop on them. `preflight.md` records their presence as
   working-tree state and states that the published-page count is derived without them.
2. **Extend `~/.claude/workflows/pass-execute-chains.js` to accept a per-chain gate**, reading
   `chain.gate ?? args.gate` into both the implementer and the reviewer prompts. Ten lines. Without
   it the four chain gates in the table above are not expressible and every chain runs one string.
3. **Create the worktrees and run `npm install` in each**, confirming `dist/` built. A fresh
   worktree has no `node_modules`, and the root `prepare` script runs `npm run package`, so every
   install also builds `dist/`. Record which worktree is which branch.
4. **Pre-fetch every external source into the scratchpad.** The implementer has `Read, Write, Edit,
   Bash, Grep, Glob` and no `WebFetch`, no `WebSearch`, no `Agent`, no `Skill`, and a sandboxed
   shell. Chain C's candidates and their license pages are fetched by the conductor and handed over
   as local files. Chain C reads local files only, and C1's notes say so.
5. **Calibrate `check:fact-coverage`** after H1 merges and before H2 dispatches: run its `--report`
   mode over one admin page and one reference page and record the token count per page in
   `preflight.md`. If a reference page yields more than roughly 200 tokens, the token classes or the
   granularity rule change here, in the pass whose whole purpose is to break the schema before a
   stage harvests a track against it. T2 re-runs the calibration over the demonstration page and
   records whether it held.
6. **Confirm the local `vale --version`** and record the disposition beside the CI pin.
7. **Pre-extract the spec's nine section orders and its brief field table** into the scratchpad,
   so G1-2 through G1-4 and P3 do not each scan the spec to find them. The reference-entry order
   carries the condition and the symptom section shapes, so extract those with it.

## Reconciliation (contended resources)

Corrected from the tasks' own Files lists. Whichever chain merges second rebases, and the conductor
performs the reconciliation after the first merge lands, never a task. **P creates a stub of every
file two chains would otherwise both create**, which converts each add/add conflict into an
ordinary line merge.

| File | Chains that write it | Reconciliation |
|---|---|---|
| `package.json` (`scripts` only) | H1, G1-5, G2-2, G2-4, G2-5, G2-7, G2-8 | No owner line lands first (amended 2026-09-08 evening). Each chain appends its own script lines adjacent to its own block; the conductor reconciles at each merge. |
| `package.json` (`files`, `devDependencies`) | P3, P4, G1-5 | P3 adds the `!docs/**/*.brief.yml` negation; G1-5 adds `markdownlint-cli2`. Positional. |
| `.github/workflows/test.yml` | G1-5, G2-4, G2-9 | P4 creates the empty `docs-gates` job with a named anchor comment; each task appends its own step block inside it. |
| `.markdownlint-cli2.yaml` | G1-5, G1-6 | Same chain, sequential. P4 stubs it. |
| `.vale.ini` | G2-2, G2-3, G2-4 | Same chain, sequential. |
| `docs/internal/record/docs-rebuild/README.md` | P, H, D, R, G2-7 | P1 creates it with one pre-written unchecked row per artifact. A task ticks its own row rather than appending, so several worktrees do not append to one table. |
| `docs/internal/docs-register.md` | G2-1, G2-9, R2 | R2 runs after every chain merges and writes the standard's section whole. |
| `docs/STATUS.md` | R2 only, plus the conductor's checkpoint writes on `main` | The conductor never edits STATUS from inside a worktree. |
| `ROADMAP.md`, `CHANGELOG.md`, `docs/HISTORY.md` | R1 (the ROADMAP row), R2 (the rest) | No contention. |
| `docs/internal/record/docs-rebuild/*-facts.md` | H | Only `extend-facts.md` exists in this pass, written by H2 alone. The four other ledgers are each written by their own stage, one file per stage, so no two passes ever append to one ledger. |
| `docs/internal/corpus/manifest.md` | C1 through C5 | One chain, sequential. |
| `docs/internal/page-types.md`, `docs/internal/page-type-rulings.md` | P2, G1-7, D3, T2 | P2 creates both with their headers and the nine type rows. G1-7 fills the computed columns, D3 writes the first review's rows and its ruling, and T2 rolls up the questions log and the reviewer misses from T1's baseline. Sequential, no contention. |

Merge order: **P, then C, G1, G2, H in any order, then D, then R.** **Chain D additionally waits for
polish-C's merge** (amended 2026-09-08 evening) and takes a rebase on merged `main` as its step 0. G1 merges before G2 by default,
since G1-5 creates the `.markdownlint-cli2.yaml` that G1-6 and the register both cite. **G2-6 and
G2-8 take a rebase on merged `main` as their step 0**, since both consume a file chain H or chain P
produced. Chain R is sequential: R1, T1, T2, R2, R3.

---

## Chain P: the preflight and the shared substrate

Four tasks, in the main loop on `main`, before any chain branches. Every cross-chain edge revision 1
carried is resolved here by moving the shared file into P, so all four producers branch from common
ground.

**Gate for every P task:** `npm run check:docs && npm run check:arm-indexes`, plus
`npx vitest run scripts/checks` from P3 onward.

### Task P1: Verify the preconditions, re-derive the baseline, and wire the docs-register profile

**Chain:** P. **Depends on:** nothing. **Deliverables:** 4, which is the cap.

**Files:**
- Create: `docs/internal/record/docs-rebuild/README.md` (the directory's arm index, one pre-written
  row per artifact this plan produces, each unchecked),
  `docs/internal/record/docs-rebuild/preflight.md`, `.tellgrader.json`
- Modify: `docs/internal/README.md` (the record arm's index line, if `check:arm-indexes` requires
  one)

**Interfaces:**
- Produces: `preflight.md`, the verified baseline every chain's `read`-tier citation resolves
  against: the `main` sha, the published-page set and its count, the polish-C result, the six
  plan-one hand-off artifacts' presence, and the sweep finding map. `.tellgrader.json`, the
  discovery file that fires the docs-register profile without an explicit flag; consumed by
  `check:provenance` (G2-5) and by any later scanner run over this repository.
- Consumes: the polish spec's rename table; `docs-sweep.md`; `exports-sweep.md`;
  `~/.dotfiles/docs/superpowers/plans/2026-09-08-docs-standard-claude-infra-handoff.md`, plan
  one's hand-off, which names the six artifacts and gives the verification commands step 3 runs.

**Steps:**
- [ ] **Step 1:** record that the owner's untracked working-tree files are not a precondition
  (amended 2026-09-08 evening) and derive the published-page set without them. The plan has no hard
  stop.
- [ ] **Step 2:** record the polish-C state: whether its `Consumers must:` list is in `CHANGELOG.md`
  and whether the ten renames in the polish spec's table resolve to their new names in `src/lib/`.
  Record the result; do not stop the pass and do not stop chain H. **State in `preflight.md` that
  polish-C gates stage one's harvest, not this pass**, and that H2's entries are provisional against
  it.
- [ ] **Step 3:** run the hand-off's own verification command for each of the six artifacts it
  names, and record each as present or absent with the command and its output pasted. Do not stop
  the pass on any absence; name the criterion each absence degrades.
- [ ] **Step 4:** create `.tellgrader.json` at the repository root with exactly
  `{"profile":"docs-register","include":["docs/**"],"exclude":["docs/internal/**","docs/superpowers/**"]}`,
  and prove discovery fires by path rather than by an explicit flag.
- [ ] **Step 5:** re-derive the published-page set and count; re-resolve every `docs-sweep.md`
  finding number and every `exports-sweep.md` `F` number this plan cites, and write the
  finding-to-track map; record the `main` sha; commit.
- [ ] **Step 6:** add an empty `## Questions` section to `preflight.md`, with a one-line conductor
  instruction above the (empty) list: append one line per question, as it lands, in the shape
  "`<date>` `<chain/task>`: `<question>` -> `<answer>`". This is the standing questions log the
  `questions asked` measure counts from; T1 rolls it up rather than re-deriving it.

**Acceptance criteria:**
- `preflight.md` states the published-page definition once, as the four track directories plus
  `docs/README.md`, `docs/why-cairn.md`, and the root `README.md`, and states plainly that
  `CHANGELOG.md` and `skills/*.md` ship in the tarball and are not published documentation pages. It
  records the per-track counts and the total. The total is 76 today; a different number is reported,
  not corrected to match this plan.
- It records the `main` sha. Every later `read`-tier `source` in every ledger cites that sha, not a
  worktree HEAD, and `preflight.md` says so in those words.
- It records the polish-C verification result, each with the command run and its output pasted,
  since a verification recorded as prose is one `diff-reviewer` cannot confirm. A verification
  recorded as assumed rather than run fails this task.
- It carries a table mapping every `docs-sweep.md` finding (1 through 30, no prefix) and every
  `exports-sweep.md` finding (F7 through F10) to **the page it concerns and the track whose stage
  consumes it**, with **every finding assigned**. Revision 1 left findings 16 and 21 unassigned. A
  finding is marked not applied, since polish-B dissolved and applied none. The map's unit is the
  track, not the task, because the harvest tasks live in stage plans that do not exist yet; each
  stage's plan assigns its track's findings to its own tasks.
- It records the current value of `package.json`'s `check` script verbatim, so no later task assumes
  a composite.
- `preflight.md` carries a table with exactly the hand-off's six artifacts, one row each (the
  profile flag, the discovery schema, the measure definition, the Vale hook change, the two
  skills, the figure-verifier agent), each row stating present or absent, the command run, and the
  criterion the absence degrades. **The verification runs the hand-off's own commands**: for the
  profile flag, `tellgrader --profile docs-register <file>` against a committed docs page and
  `tellgrader --profile none` against the same page; for the Vale hook change, `grep -n "config
  root" bin/.local/bin/vale-hook` and `uv run --with pytest --no-project python -m pytest
  tests/test_vale_hook.py -q` from `~/.dotfiles`; for the two skills, `readlink -f
  ~/.claude/skills/cairn-figure/SKILL.md` and `grep -n "^## Author-facing prose"
  ~/.dotfiles/claude/.claude/skills/writing-voice/SKILL.md`; for the figure-verifier agent,
  `readlink -f ~/.claude/agents/figure-verifier.md` and `grep -n "earns its place\|decoration\|should
  be a table\|should be a numbered\|missing figure" ~/.dotfiles/claude/.claude/agents/figure-verifier.md`.
  The hand-off gives no standalone command for the discovery schema or the measure definition, so
  this task checks the discovery schema against the `.tellgrader.json` step 4 creates, and checks
  the measure definition by `test -f
  ~/.claude/skills/writing-voice/evals/tellgrader/MEASURES.md` plus `grep -n "Divergences from
  cairn's measure-prose.mjs" ~/.claude/skills/writing-voice/evals/tellgrader/MEASURES.md`.
- `.tellgrader.json` is committed at the repository root with exactly
  `{"profile":"docs-register","include":["docs/**"],"exclude":["docs/internal/**","docs/superpowers/**"]}`,
  and the report pastes the output proving `tellgrader --register docs docs/why-cairn.md` then
  reports a `measures` object and `tellgrader --register docs docs/internal/docs-register.md` does
  not, so discovery, not an explicit flag, is what fires the profile on one path and not the other.
- `docs/internal/record/docs-rebuild/README.md` carries one unchecked row per artifact, so later
  tasks tick rather than append.
- `preflight.md` carries a `## Questions` section with the append-one-line-per-question instruction,
  so every chain and every conductor pre-task has one place to log a question as it lands.
- No file outside this repository is modified, and the report says so.

**Notes:** no precondition stops this task; it records every one of them. It is cheap and it runs
alone, because the pass ahead of it builds tools and gates against fixtures, not against the
published pages. **`.tellgrader.json` moves here from P3** because plan one's hand-off names its
absence as the sole reason the docs-register profile is dead on arrival in this repository, and P1
is where the repository's baseline first exists to commit against.

### Task P2: The ledger schema and the page-type assignment

**Chain:** P. **Depends on:** P1. **Deliverables:** 4, which is the cap.

**Files:**
- Create: `docs/internal/record/docs-rebuild/ledger-schema.md`,
  `docs/internal/record/docs-rebuild/page-types.md`, `docs/internal/page-types.md`,
  `docs/internal/page-type-rulings.md`
- Modify: `docs/internal/record/docs-rebuild/README.md` (tick two rows),
  `docs/internal/README.md` (the arm index lines for the two new files, if `check:arm-indexes`
  requires them)

**Two files share a basename and are not the same file.** The per-page assignment is
`docs/internal/record/docs-rebuild/page-types.md`, one row per published page. The registry's
outcome record is `docs/internal/page-types.md`, one row per type. Every reference in this plan
names the full path.

**Interfaces:**
- Produces: `ledger-schema.md`, read by every harvest task, by `check:fact-coverage` (H1), and by
  `check:ledger` (G2-8). Revision 1 left this in chain H and made it the one declared cross-chain
  edge; in P it is not a cross-chain edge at all. `docs/internal/record/docs-rebuild/page-types.md`,
  the enumerated published set with the demonstration page's type filled and every other row's type
  empty, read by G1-1's registry table and filled one track at a time by each stage's harvest.
  `docs/internal/page-types.md` and `docs/internal/page-type-rulings.md`, the registry lifecycle's
  two records, written by G1-7, D3, and every later review.
- Consumes: the spec's unit 1 section, its registry table, and its registry lifecycle;
  `docs-sweep.md`.

**Steps:**
- [ ] **Step 1:** write `ledger-schema.md` with an example row for each shape it fixes.
- [ ] **Step 2:** enumerate the published set from `preflight.md`'s definition, one row per page
  with its path and its track. **Assign a type only to `docs/extend/add-a-custom-admin-screen.md`**,
  the page this pass rebuilds, with a one-line reason naming the reader's job. Leave every other
  row's `type` and `reason` empty, and write the rule in the file's header: each stage fills its own
  track's rows at its harvest, against the registry as that stage received it.
- [ ] **Step 3:** create `docs/internal/page-types.md` with its outcome-record columns and one row
  per type, and `docs/internal/page-type-rulings.md` with its header and no rulings.
- [ ] **Step 4:** `check:docs`, `check:arm-indexes`; commit.

**Acceptance criteria (schema):**
- The entry shape is a markdown table with these columns, in this order: `id`, `claim` (a normalized
  proposition under fifteen words, never a lifted sentence), `tokens` (the literal fact tokens the
  entry covers, comma separated), `page` (the published path), `anchor` (the heading slug the claim
  sits under), `line` (advisory, at the preflight sha), `tier` (one of `gate`, `read`, `owner`,
  `unverified`, `retired`), `source` (for `gate`, the gate or fixture name; for `read`, a
  `file:line` plus the preflight sha; for `owner`, the brief file and its line; for `unverified` and
  `retired`, empty), and `note`.
- **The schema states that re-resolution is by `anchor` plus `claim`, and that `line` is advisory.**
  A reflow of the page must not invalidate an entry. The schema states the reason: this pass reflows
  pages and every stage moves every page in its track.
- **The `tokens` column is what `check:fact-coverage` matches against**, and the schema says so in
  those words, together with the reason: `claim` is a paraphrase written deliberately not to
  resemble the page, so matching extracted page tokens against it would push entries toward
  restating the page.
- Five tiers are enumerated once, consistently, everywhere in the file. A `retired` entry keeps its
  row with a `note` naming the reason and its id is never reused.
- The id format is `^(admin|editors|extend|reference|front-door)-\d{4}$`, monotonic and unique
  within its own file.
- Claim granularity is one entry per checkable proposition: a statement that could be false and
  whose falseness a reader would act on. Version numbers, counts, paths, export names, defaults,
  behaviors, and promises about who does what qualify. Transitions, motivation, and restatements do
  not. Three worked examples of each side.
- The schema states, in those words, that a published page is never a proving source.
- Six keep classes are named with a recorded shape each: anchors, Vale suppressions with the comment
  that justifies each, recorded deviations, ratified specimens, deliberate omissions (the
  vendor-link rule as the example), and reader-tested editor glosses. The schema notes that the spec
  says five and lists six, and that six is the resolution.
- The block-entry kind is specified: `kind: block`, carrying the fence verbatim, its language tag,
  its marker comment, and the fixture path its gate replays against. A verbatim fence is the one
  exception to the no-old-prose rule, because a fence is not prose.
- The anchor map is specified as a per-page table, old heading slug to new heading slug or to
  `retired`, and named as the artifact each stage repairs inbound links from.
- The five ledger paths are `docs/internal/record/docs-rebuild/<track>-facts.md` and carry no date.

**Acceptance criteria (page types):**
- One row per published page: `path`, `track`, `type`, `reason`. The count is stated in the first
  line and equals `preflight.md`'s number.
- **Exactly one row carries a filled `type`**, `docs/extend/add-a-custom-admin-screen.md` as
  `task-guide`. Every other row's `type` and `reason` are empty, and the header states that each
  stage fills its own track's rows at its harvest. This pass hands forward no type assignment for a
  track it did not harvest.
- The header fixes the vocabulary a stage assigns from: every `type` is one of the nine canonical
  ids, `task-guide`, `tutorial-milestone`, `concept`, `architecture-overview`, `reference-entry`,
  `reference-table`, `index`, `front-door-evaluator`, `front-door-track-index`. **A recovery page,
  which revision 2 would have typed `condition-entry` or `symptom-row`, is `reference-entry`**, and
  its `reason` names which of the two section shapes it uses; neither id appears anywhere in the
  file. `docs/why-cairn.md` and the root `README.md` are `front-door-evaluator`; `docs/README.md` and
  the four track `README.md` files are `front-door-track-index`.
- Every `track` is one of `admin`, `editors`, `extend`, `reference`, `front-door`. **`front-door` is
  `docs/README.md`, `docs/why-cairn.md`, the root `README.md`, and the four track `README.md`
  files**, seven pages, because the front-door stage rewrites every index and evaluator page together
  and no track stage should rewrite its own index in isolation. Each track README's `reason` names
  the directory it indexes. The header states the per-stage page counts that follow, so the five
  stages partition the 76 pages with no page in two stages and no page in none.
- A closing section, "types the registry may lack", is opened with its heading and the demonstration
  page's finding, if any, and the header states that **each stage appends its own track's findings at
  its harvest**. That section is input to R2, to the registry lifecycle's first review in D3, and to
  every stage's tuning checkpoint; it is not a blocker. A page listed there is a review trigger under
  the lifecycle, which the section states.

**Acceptance criteria (the registry outcome record):**
- `docs/internal/page-types.md` is a markdown table with one row per type, nine rows, keyed by the
  canonical id, with these columns in this order: `type`, `pages assigned`, `outline-review
  failures`, `provenance findings`, `questions asked`, `reviewer misses`, `helpful votes`,
  `reader-test results`, `measured drafting cost`, `last reviewed`. Every column but `type` and
  `pages assigned` is empty at this task, and the header says which task fills each: G1-7 the two
  finding columns, D3 the rest.
- The file's header states the sources, in these words: the finding counts come from the ledger rows
  `check:prose-read` verifies and from the coverage-diff reports, never from a hand count. `questions
  asked` is rolled up at the review from the lines a pass records as the questions land, one line per
  question the owner, an agent, or a reviewer had to ask about a page. `reviewer misses` is what the
  fresh reviewer changed on a drafted page, each miss attributed to the template, the subject, or
  register, recorded by the coverage-diff and review steps.
- **The `helpful votes` column is marked future work and stays empty.** It starts when cairn.pub
  carries a voting widget, and no task in this plan builds one. The header states that a vote is read
  against the page's type and never pooled across types.
- The header states the **four** review triggers and the four rulings from the spec's registry
  lifecycle, and points at the spec section rather than restating its reasoning. The four triggers
  are the close of every stage, the close of every rewrite plan, a page brief that cannot name a
  type, and a type whose own outline-review failure count rises for two consecutive reviews. It
  states that last trigger's shape in full: a type is compared against its own prior record, never
  against the other types, and the trigger cannot fire below three outline-review failures in the
  window or below three pages of that type.
- `docs/internal/page-type-rulings.md` carries the header, the column set, and no rulings. Its
  columns are the shape `docs/internal/engine-rulings.md` uses: the ruling, the evidence, and what
  would reopen it. The header states that D3 writes the first row.
- `npm run check:rulings-format` is green if it reaches the new file, and the task reports whether it
  does.

**Notes:** the type ids here and G1-1's registry table are one interface. G1-1 grades against the
nine ids in the header of `docs/internal/record/docs-rebuild/page-types.md`, which exists on `main`
before G1 branches, and never against the per-page rows, which are empty by design.

### Task P3: The brief schema, the parser, and the packaging negation

**Chain:** P. **Depends on:** P2. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/templates/brief-schema.md`, `scripts/checks/brief.mjs`,
  `scripts/checks/brief.schema.json`,
  `scripts/checks/fixtures/docs-standard/brief-valid.yml`,
  `scripts/checks/fixtures/docs-standard/brief-invalid.yml`,
  `scripts/checks/brief.test.ts`
- Modify: `package.json` (`files` gains the negation
  `!docs/**/*.brief.yml`), `scripts/checks/check-package-files.mjs` (the new assertion)

**Interfaces:**
- Produces: the brief file at `docs/<track>/<page>.brief.yml`, and `README.brief.yml` at the
  repository root for the root README. `parseBrief(path)` returning the eight fields or throwing
  with the offending line. Hand-off artifact 5. Imported by `check:provenance` (G2-5) and by the
  markdownlint brief-presence rule (G1-6), both of which branch from P.
- Consumes: the spec's brief field table, pre-extracted by the conductor.

**Steps:**
- [ ] **Step 1:** write the failing parser test against both fixtures; write the JSON Schema and the
  parser over the `yaml` package; run green.
- [ ] **Step 2:** add the `files` negation and the `check:package` assertion; prove no
  `*.brief.yml` reaches the tarball.
- [ ] **Step 3:** write `brief-schema.md`; commit.

**Acceptance criteria:**
- The parser uses the **`yaml`** package for parsing and a JSON Schema check for validation, and the task adds
  the `yaml` package (ISC), which already ships in `dependencies`, so no second YAML parser
  enters the tree. No surveyed documentation program hand-writes a YAML parser; `github/docs`
  parses with `js-yaml` and validates with ajv. Conductor ruling 2026-09-08: reuse the existing
  dependency rather than add `js-yaml`; a gate script importing a runtime dependency is fine.
- `brief-schema.md` is checked against `brief.schema.json`, not written independently of it, on the
  same discipline `check:ledger` applies to `ledger-schema.md`. A field in one and not the other
  fails the unit test.
- The schema fixes eight fields with these exact names: `type`, `track`, `exemplar`, `corpus_entry`,
  `needs`, `keep`, `deviations`, `sentences`.
- `type` is one of the nine canonical ids; `track` one of the five; `exemplar` a path or URL;
  **`corpus_entry` is a list of one or two manifest ids**; `needs` and `keep` lists of ledger ids
  matching the id regex; `deviations` a list of `{ rule, reason }`; `sentences` an ordered list
  whose every element is a ledger id or the literal `no-claim`.
- The schema states the two-entry rule the spec's unit 2 body carries and revision 1 dropped: **a
  page whose brief names two entries is compared against the closer of the two, and the review names
  both.** D2 asserts it.
- The parser rejects an unknown field, a missing required field, a `type` outside the registry, a
  malformed ledger id, and a `corpus_entry` list of more than two, naming the line in each case. The
  invalid fixture exercises all five.
- **`package.json`'s `files` array gains `!docs/**/*.brief.yml`, and
  `scripts/checks/check-package-files.mjs` gains an assertion that no `*.brief.yml` appears in the
  pack listing.** Revision 1's criterion, "no brief path is added to `files`, and `check:package`
  proves none ships", was self-contradictory: `files` lists `docs/extend` as a directory and npm
  includes a listed directory recursively, so adding nothing is exactly what makes the sidecars
  ship. The task proves the negation with `npm pack --dry-run`.
- The schema names the sidecar's cost: page metadata normally lives in a page's own frontmatter
  (Kubernetes' `content_type`, GitHub Docs' `type`), and the sidecar is chosen because the
  `sentences` list is per-sentence and because cairn ships raw markdown that cairn.pub renders.
- The schema states that ids never appear in published markdown, and that the brief is the only
  place a page's type is written down beside its template. It names the path of the twelve-row
  quality checklist G2-7 commits.
- `npx vitest run scripts/checks` and `npm run check:package` are green.

**Notes:** `.tellgrader.json` is P1's, not this task's, since P1 is where the repository's
baseline first exists to commit against and plan one's hand-off names its absence as the sole
reason the docs-register profile is dead on arrival here.

### Task P4: The shared substrate, the stubs, and the sentence splitter

**Chain:** P. **Depends on:** P3. **Deliverables:** 4.

**Files:**
- Modify: `scripts/checks/measure-prose.mjs` (export the splitter behind a CLI guard),
  `vitest.config.ts` (the `unit` project's `include` gains `scripts/checks/**/*.test.ts`),
  `.github/workflows/test.yml` (the empty `docs-gates` job with its anchor comment)
- Create: `scripts/checks/measure-prose.test.ts`,
  `docs/internal/record/docs-rebuild/receipts.md` (header and columns, no rows),
  `docs/internal/templates/README.md` (the arm index, empty registry table),
  `.markdownlint-cli2.yaml` (a stub carrying only `default: true` and a comment naming G1-5 as its
  author)

**Interfaces:**
- Produces: `export function splitSentences(text)` from `measure-prose.mjs`, so one definition of a
  sentence holds across `check:provenance`, `check:fact-coverage`, and the measurement script. The
  stubs that convert three add/add conflicts into line merges.
- Consumes: nothing.

**Steps:**
- [ ] **Step 1:** refactor `measure-prose.mjs` into exported functions plus a CLI guard; write the
  test proving the CLI's output is byte-identical before and after; run green.
- [ ] **Step 2:** wire the vitest include; create the four stubs; commit.

**Acceptance criteria:**
- `measure-prose.mjs` exports `splitSentences` and keeps its CLI behavior. Today it reads
  `process.argv` at module scope and calls `process.exit(2)` with no file argument, so importing it
  from another script executes and exits it. The test proves the CLI's `--json` output on a fixture
  is byte-identical to the pre-refactor output, which the task records in the fixture.
- No second sentence-splitting regex is introduced anywhere in this plan. Every consumer imports
  this one.
- `vitest.config.ts`'s `unit` project includes `scripts/checks/**/*.test.ts`, and
  `npx vitest run scripts/checks` runs at least `brief.test.ts` and `measure-prose.test.ts`.
- `.github/workflows/test.yml` carries an empty `docs-gates` job with a comment naming G1-5, G2-4,
  and G2-9 as the tasks that fill it. The job runs and passes with no steps.
- `receipts.md` carries its header and columns and zero rows, and its header states the receipt
  contract decision 3 settles.
- `.markdownlint-cli2.yaml` exists with `default: true` and no overrides, and `markdownlint-cli2` is
  not yet installed or wired into CI, so the stub changes no gate result.
- `docs/internal/templates/README.md` exists with the arm index line and an empty registry table.
- `npm run check:arm-indexes` and `npm run check:docs` are green.

---

## Chain H: the harvest spine (unit 1's schema and tools)

Three tasks. Produces the harvest tool, the demonstration page's ledger, and the drafting-dispatch
fragment. **The four remaining track harvests are each their own stage's first work**, against the
schema the previous stage's tuning checkpoint amended. This chain exists to make that schema
survivable.

### Task H1: `check:fact-coverage`, the harvest-time tool

**Chain:** H. **Depends on:** P4. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-fact-coverage.mjs`,
  `scripts/checks/fixtures/docs-standard/fact-coverage-pass/`,
  `scripts/checks/fixtures/docs-standard/fact-coverage-fail/`,
  `scripts/checks/check-fact-coverage.test.ts`
- Modify: `package.json` (`"check:fact-coverage"`)

**Interfaces:**
- Produces: `npm run check:fact-coverage -- --track <track> [--page <path>] [--json] [--report]`.
- Consumes: `ledger-schema.md`'s column names; `measure-prose.mjs`'s splitter.

**Steps:**
- [ ] **Step 1:** record the branch-point `main` sha beside `preflight.md`'s. Polish-C does not gate
  this chain; it gates stage one's harvest, and P1 has recorded its state.
- [ ] **Step 2:** write the failing unit test against both fixtures; write the extractor and the
  resolver; run green.
- [ ] **Step 3:** wire the script; commit.

**Acceptance criteria:**
- The extractor recognizes six token classes and the script's header documents each with one
  example: semantic version strings, bare numerals outside code fences, repository-relative file
  paths, shell commands with their flags, exported symbol names (matched against
  `docs/internal/api-surface.md`), and config keys.
- **The resolver matches a page token against a ledger entry's `tokens` and `source` fields only,
  never against `claim`.** A `grep` proves `claim` is not read by the resolver.
- `--page <path>` scopes the run to one page and `--track <track>` to one track; both are real flags
  with tests. Revision 1's harvest gates asked for a page scope no stated interface carried.
- `--report` prints the extracted token count per page without failing, which is what the
  conductor's calibration pre-task runs.
- Both fixtures run in the unit test: the pass fixture exits 0, the fail fixture exits non-zero and
  names the uncovered token and its line.
- Code fences are excluded from token extraction except where the page has a `kind: block` entry, in
  which case the fence must match that entry's verbatim body byte for byte.
- A missing ledger file for a requested track is an error, not a pass. **Four of the five ledgers do
  not exist when this pass ends**, so the error names the stage that produces the missing track's
  ledger rather than reading as a defect.
- **The script's header states that it is not a CI gate and why**: it is a completeness instrument
  for a harvest task working the uncovered-token list, and standing it up over 76 pages would push
  entries toward satisfying the extractor. `grep` proves it appears in no `test.yml` step. The header
  also states that **every stage's harvest chain gates on it over that stage's own track**, which is a
  scoped run at harvest time and not a standing assertion over the published set.
- The script asserts the ledger's header row against `ledger-schema.md`'s stated column set and
  fails on a mismatch, so the chain that mutates the schema is the chain that detects the mutation.

### Task H2: Harvest the demonstration page

**Chain:** H. **Depends on:** H1. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/extend-facts.md` (this page's entries only; the extend
  stage appends the rest of the track)
- Modify: `docs/internal/record/docs-rebuild/ledger-schema.md` (any schema correction this first
  real harvest forces, noted in the header)

**Interfaces:**
- Produces: the `extend-NNNN` entries for `docs/extend/add-a-custom-admin-screen.md` (2,649 words),
  its anchor map, its keep classes, and its block entries. Consumed by D1.
- Consumes: `ledger-schema.md`; the sweep findings `preflight.md` maps to this page.

**Steps:**
- [ ] **Step 1:** harvest the page: every checkable proposition with its tier, its `tokens`, and its
  proving source; the anchor map; the six keep classes; every gated block verbatim with its fixture
  path.
- [ ] **Step 2:** run `check:fact-coverage -- --page docs/extend/add-a-custom-admin-screen.md` and
  close every uncovered token; record any schema correction; commit.

**Acceptance criteria:**
- `check:fact-coverage -- --page docs/extend/add-a-custom-admin-screen.md` exits 0.
- Every entry carries an id matching the format, a normalized claim under fifteen words, its
  `tokens`, its page and anchor, and either a tier with its proving source or the `unverified` tier.
- No `claim` value appears as a substring of the page.
- The anchor map lists every heading slug, and every slug with an inbound link inside `docs/` is
  marked as such.
- Every fenced block the repository's gates replay (`check:snippets`, `check:transcripts`,
  `check:symbols`) has a `kind: block` entry carrying the fence verbatim and its fixture path.
- Any schema change this task forces is recorded in `ledger-schema.md`'s header with its reason, and
  every stage uses the corrected schema.
- Every `read`-tier `source` cites `preflight.md`'s sha, not a worktree HEAD.
- **The ledger's header records that these entries are provisional against polish-C** and against any
  identity-seam or chassis page edit landing after this sha, and that **the extend stage re-derives
  them** when it harvests the rest of the track. A re-derived entry keeps its id.

**Notes:** this task exists to break the schema before any stage harvests a track against it, which
is why the schema and the demonstration page stay in this pass while the harvest leaves. An
implementer that finds nothing to correct says so explicitly in its report.

### Task H3: The drafting-dispatch fragment

**Chain:** H. **Depends on:** H2. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/drafting-dispatch.md`

**Interfaces:**
- Produces: the checked-in prompt block every stage's drafting dispatches inherit verbatim. Consumed
  by D1 in this pass, which is why it sits here rather than after a track harvest.
- Consumes: `ledger-schema.md`; the spec's quarantine rule.

**Steps:**
- [ ] **Step 1:** write the fragment: the quarantine sentence, the readable-file list, the
  one-section-per-read protocol, and the dispatch-id recording rule; commit.

**Acceptance criteria:**
- The fragment states, as an instruction to a drafting agent: do not open the page you replace; read
  only the track ledger, `docs/internal/record/docs-rebuild/page-types.md`, the page type's
  template, the named corpus entry, and the
  pages the brief's `keep` list names.
- It carries the one-section-per-read protocol and requires the dispatch id in the receipt row.
- It states the mechanical half of the quarantine, which is the conductor's job and not the
  drafter's: the page being replaced is moved to a path outside `docs/` for the duration of the
  drafting dispatch and restored by the coverage-diff step.
- It is a single copyable block, delimited so a dispatch can quote it whole.
- **No plan linter is built.** Revision 1 bolted a `--plan-lint` mode, a fixture, a package script,
  and a full gate run onto this task; plan documents live under `docs/superpowers/`, which every
  gate in this standard exempts, and nothing in this plan would exercise it against a real input.
  The fragment is the artifact the spec funds.

---

## Chain C: the corpus (unit 2)

Four tasks in the chain plus one conductor task at the mid sitting.

**The conductor pre-fetches every source into the scratchpad before this chain dispatches.** The
implementer has no `WebFetch`, no `WebSearch`, and a sandboxed shell. A cold agent told to "fetch
each candidate and determine its license" either fabricates an excerpt and a license, which is the
worst possible outcome for an artifact whose whole purpose is provenance, or stalls the chain. Every
C task reads local files the conductor placed, and each task's report names the scratchpad path it
read.

### Task C1: The corpus directory, the manifest, and the three samples

**Chain:** C. **Depends on:** P4. **Deliverables:** 4.

**Files:**
- Create: `docs/internal/corpus/README.md` (the arm index), `docs/internal/corpus/manifest.md`,
  `docs/internal/corpus/front-door-evaluator-sqlite-scope.md`,
  `docs/internal/corpus/internal-proposal-go-monotonic-time.md`,
  `docs/internal/corpus/internal-proposal-kep-node-swap.md`
- Delete: the three `corpus-sample-*.md` files under
  `docs/internal/record/2026-09-08-polish-inputs/`
- Modify: `docs/internal/README.md` (the arm index line for `corpus/`), and the six records that
  link to the deleted samples: `proposal-review-rev4.md`, `proposal-review-rev5.md`,
  `proposal-review-rev6.md`, `docs-standard-proposal.md`, `docs-standard-proposal-fresh.md`,
  `docs-spec-review-conformance.md`

**Interfaces:**
- Produces: the corpus entry format and the manifest's column set. The entry id is the filename
  stem, `<type-id>-<source-slug>`, and it is what a brief's `corpus_entry` carries.
- Consumes: the three existing samples; the conductor's local captures.

**Steps:**
- [ ] **Step 1:** create the directory and the manifest with its columns; migrate the three samples
  to the entry format under their new ids; repoint the six inbound links; delete the originals.
- [ ] **Step 2:** `check:docs`, `check:arm-indexes`; commit.

**Acceptance criteria:**
- The manifest is a markdown table with these columns, in this order: `id`, `file`, `page type`,
  `track`, `source`, `url`, `license`, `fetched`, `mode`, `note`, `sentences`, `avg length`,
  `longest`, `short sentences`, `paragraphs`, `paragraph variance`, `approved`. **There is no
  `hinged pairs` column.** The spec-level benchmark recommended dropping it, on the spec's own
  evidence that the definition moved twice and that a splitter change moves a track figure by 17
  points; revision 1 carried the column anyway. The share stays a reported number in reviewer
  reports, never a recorded manifest figure a stage drafts against.
- `mode` is one of `reference-only`, `excerpt`, or `structure-only`, and the manifest states what
  each means in a line above the table. **`reference-only` is the default and `excerpt` is the
  exception**, taken only where the license permits redistribution and where a side-by-side read
  genuinely needs the text. The manifest states the reason and cites the Google style guide, the
  standard every published page is graded under, which says to paraphrase and link rather than copy.
- The entry id format holds for all three migrated samples: the SQLite entry's type is
  `front-door-evaluator` and its file is therefore `front-door-evaluator-sqlite-scope.md`. Revision
  1 fixed the id as `<type-id>-<source-slug>` and then named the file `concept-sqlite-scope.md`, and
  `corpus_entry` is a brief field, so the format is load-bearing.
- **The two design-document samples keep the reserved `internal-proposal-` prefix, which is not a
  type id.** Owner decision 2 dropped the internal proposal type from the registry, and internal
  planning documents are not graded, so their `page type` cell reads `none (internal, not a registry
  type)` and the manifest legend states they are retained as the exemplars an internal spec is
  written against and that no published page is graded on them. A brief's `corpus_entry` never names
  one, and the parser's registry check does not accept the prefix as a type.
- Every committed excerpt is at most 400 words before its `## Source` heading, measured by
  `node scripts/checks/measure-prose.mjs <file> --until "## Source" --json`.
- Every entry carries a `## Source` section naming the source, the URL, the license, and the fetch
  date. **For a BSD-3-Clause source the section reproduces the copyright notice; for an Apache-2.0
  source it carries the attribution and a notice of changes.** The two migrated design-document
  samples cite their licenses today and reproduce neither notice; this task fixes both.
- The Go sample's own note, "unedited apart from rewrapping and the removal of one heading", records
  an edit. The manifest states the share-alike rule: **a share-alike source is quoted byte for byte
  or it is `reference-only`, never trimmed or rewrapped.**
- A `grep` for `corpus-sample-` under `docs/internal/record/` returns nothing, and
  `npm run check:docs` is green, which it was not in revision 1: six sibling records link to the
  deleted files and `docs-links.mjs` walks all of `docs/` except `superpowers/`.
- The `approved` column is present and empty for all three.

### Task C2: Corpus entries for the first five page types

**Chain:** C. **Depends on:** C1. **Deliverables:** 1.

**Files:**
- Create: one or two entries under `docs/internal/corpus/` for each of `task-guide`,
  `tutorial-milestone`, `concept`, `architecture-overview`, `reference-entry`
- Modify: `docs/internal/corpus/manifest.md`

**Steps:**
- [ ] **Step 1:** for each candidate, read the conductor's local capture and its license capture;
  write a `reference-only` entry by default.
- [ ] **Step 2:** commit an excerpt only where the license permits redistribution and a side-by-side
  read needs the text, with the reason stated in the entry's `## Source`; add the manifest rows;
  `check:docs`; commit.

**Acceptance criteria:**
- Each of the five types has at least one entry and at most two.
- **The `reference-entry` entries cover the type's three shapes**: the export contract (PostgreSQL's
  CREATE INDEX or MDN's scrollIntoView) and, in one entry marked `structure-only`, the condition and
  symptom section shapes from a Cloudflare Workers error table. The two shapes fold into this type
  under owner decision 2, so they need an exemplar here and no type of their own.
- Every entry's `mode` is `reference-only` unless its `## Source` states both the permitting license
  and the reason a side-by-side read needs the text.
- **DigitalOcean is `reference-only` unless the license is verified from the page itself.**
  Secondary sources report CC BY-NC-SA 4.0; if the non-commercial term is correct it bars the use
  outright.
- Every share-alike source (GitLab docs, CC BY-SA 4.0; Mozilla SUMO, version unverified) carries a
  `note` flagging it and is quoted byte for byte or is `reference-only`.
- Every entry's `license` cell names a specific license or the words "no redistribution grant"; none
  is empty. Verified clean for a 400-word attributed excerpt: SQLite (public domain), Kubernetes and
  Cloudflare docs and GitHub Docs content (CC BY 4.0), Go proposals (BSD-3-Clause), Kubernetes KEPs
  (Apache-2.0).
- No committed excerpt exceeds 400 words before `## Source`.

### Task C3: Corpus entries for the remaining four page types

**Chain:** C. **Depends on:** C2. **Deliverables:** 1.

**Files:**
- Create: entries for `reference-table`, `index`, `front-door-evaluator` (the SQLite entry already
  serves; a second is optional), and `front-door-track-index`, plus the hand-picked second editors
  entry
- Modify: `docs/internal/corpus/manifest.md`

**Steps:**
- [ ] **Step 1:** write each entry from the conductor's local captures; the second editors entry is
  the one the conductor selected by hand, and its selection reasoning goes in its `## Source`.
- [ ] **Step 2:** manifest rows; `check:docs`; commit.

**Acceptance criteria:**
- All nine type ids appear in the manifest's `page type` column, each with at least one row, and no
  row names `condition-entry`, `symptom-row`, or `proposal`.
- The editors track has two entries, one of them the hand-picked one, and its `## Source` states why
  an automated fetch was not used (the Mozilla support articles block automated reads).
- **Every `reference-table` entry is `structure-only`**, and the manifest's legend states that a
  review of such a page compares column order, row completeness, and the lead sentence rather than
  cadence.
- **No Stripe excerpt is committed.** Stripe is the `reference-table` exemplar and its Services
  Agreement reserves all rights in the documentation, so the entry is `reference-only` and the
  manifest names Stripe as the worked case, so no later implementer reaches for fair use.
- The `approved` column is empty for every new row.
- The same license and mode criteria as C2.

### Task C4: Measure every entry and fill the manifest

**Chain:** C. **Depends on:** C3. **Deliverables:** 1.

**Files:** Modify `docs/internal/corpus/manifest.md`.

**Steps:**
- [ ] **Step 1:** run `node scripts/checks/measure-prose.mjs <file> --until "## Source" --json` on
  every committed excerpt; for a `reference-only` entry, measure the conductor's local capture and
  record the numbers without committing the text.
- [ ] **Step 2:** fill every measurement column; `check:docs`; commit.

**Acceptance criteria:**
- Every manifest row's six measurement columns are filled with numbers from script output, and the
  manifest's header names the script and the exact flags used.
- **`paragraph variance` is recorded as the difference in sentence count between the entry's
  shortest and longest paragraph**, which is the spec's normative variance requirement expressed as
  a reported measure. The manifest states that it is reported and never gated, since no evidence
  ties a variance number to the recorded failure. Revision 1 carried no variance measure at all.
- Every excerpt was measured with `--until "## Source"`, so no `## Source` prose reaches a number.
- A `reference-only` row carries its numbers and no excerpt file exists for it.
- The manifest states, in one line, that every number is advisory until a track has twenty documents
  and three hundred sentences behind it, and that no number here is a gate.

### Task C5: The corpus approval sitting

**Conductor task**, at the mid sitting. **Depends on:** C4. **Deliverables:** 1. **Owner-blocked.**

**Files:** Modify `docs/internal/corpus/manifest.md` (the `approved` column), and delete any entry
the owner rejects.

**Steps:**
- [ ] **Step 1:** present the assembled set to the owner as one combined question, batched with the
  CLAUDE.md line displacement owed from plan one: the entries per type, the licensing calls, the
  hand-picked editors entry, and the provisional approval D1 ran against.
- [ ] **Step 2:** apply each verdict: approve with a date, or delete the entry and retire its id.
- [ ] **Step 3:** `check:docs`; commit.

**Gate:** `npm run check:docs`.

**Acceptance criteria:**
- Every remaining manifest row's `approved` column carries a date.
- A rejected entry's file is deleted and its id is listed under a "retired ids" heading, never
  reused.
- Every one of the nine type ids still has at least one approved or `reference-only` entry after
  the deletions. If a deletion leaves a type uncovered, the task reports the gap rather than
  substituting a replacement without approval.
- **The `task-guide` entry D1 drafted against is either ratified or replaced.** If replaced, D2's
  one redraft round re-runs against the ratified entry and the report says so.

**Notes:** D1 and D2 run at the end of invocation one, before this sitting, so the one `task-guide`
entry they need carries `provisional <date>` in the `approved` column, written by the conductor at D1's
dispatch and recorded in `preflight.md`. G1-6's brief-presence rule treats `provisional` as
unapproved for every page except the demonstration page, which is named in a glob override with this
task as its remover. The spec suggests a time-boxed default-to-accept window, since an unapproved
entry blocks work rather than protecting anything. Offer it in the same question; do not assume it.

---

## Chain G1: the structure spine (unit 3a)

Seven tasks. Three fewer templates than revision 2 planned, since the registry is nine types, and
one new task, G1-7, which reports the registry lifecycle's per-type measurements.

### Task G1-1: The marker syntax, the registry table, and the index template

**Chain:** G1. **Depends on:** P4. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/templates/index.md`
- Modify: `docs/internal/templates/README.md` (the marker syntax and the nine-row registry table;
  P4 created the file)

**Acceptance criteria:**
- The registry table has nine rows, one per canonical type id, each naming the reader's job it
  serves and its exemplars. **The type ids match the nine listed in the header of
  `docs/internal/record/docs-rebuild/page-types.md` exactly, checked by name.** That file is on
  `main` before this chain branches, so the check is runnable here; revision 1 asked a G1 task to
  grade against a chain-H file its worktree did not contain. The check is against the header's
  vocabulary, not against the per-page rows, which are empty until each stage fills its track's.
- The marker syntax for required-or-optional headings is stated once, in one fixed form, and is
  identical across all nine templates.
- `index.md` carries the four-section index order and the rule that an index groups its children
  once it lists more than nine siblings.
- Every template file this chain writes is under `docs/internal/`, so none ships;
  `npm run check:package` proves it.

### Task G1-2: Templates for the four narrative types

**Chain:** G1. **Depends on:** G1-1. **Deliverables:** 4.

**Files:** Create `docs/internal/templates/task-guide.md`, `tutorial-milestone.md`, `concept.md`,
`architecture-overview.md`.

**Acceptance criteria:**
- Each carries its section order verbatim from the spec: task guide's six sections, tutorial
  milestone's six, concept's six, architecture overview's five. **The conductor's pre-extraction of
  the spec's nine section orders is the task's input**, so the implementer does not scan a
  1,065-line spec to find them.
- Every heading line carries G1-1's required-or-optional marker.
- A word ceiling appears where the spec states one: task guide under 800 words, concept under 1,500,
  recorded as advisory, since length rules warn and never gate.

### Task G1-3: Templates for the two reference types

**Chain:** G1. **Depends on:** G1-2. **Deliverables:** 2.

**Files:** Create `docs/internal/templates/reference-entry.md`, `reference-table.md`.

**Acceptance criteria:**
- Reference entry carries its ten sections and reference table its three.
- **The reference-entry template carries the condition and the symptom section shapes**, each marked
  optional, in the orders the spec's reference-entry section fixes. Owner decision 2 folded both into
  this type, so no `condition-entry.md` or `symptom-row.md` template is written and a `grep` for
  either filename under `docs/internal/templates/` returns nothing.
- **The reference-entry template is derived from the shape `check:reference` and
  `check:reference:signatures` already fix**, and its header states which script fixes which part,
  so the template is not a second copy that drifts.
- Every heading carries G1-1's marker.

### Task G1-4: Templates for the two front-door types

**Chain:** G1. **Depends on:** G1-3. **Deliverables:** 2.

**Files:** Create `docs/internal/templates/front-door-evaluator.md`, `front-door-track-index.md`.

**Acceptance criteria:**
- `front-door-evaluator.md` carries the spec's eight-section front-door order and is the template
  for `docs/why-cairn.md` and the root `README.md`.
- `front-door-track-index.md` carries a routing order satisfying the register's
  five-routes-in-the-first-screenful requirement, and its header names the register rule it answers.
  It is the template for `docs/README.md` and the four track READMEs.
- **No `proposal.md` template is written.** Owner decision 2 dropped the internal proposal type,
  because internal planning documents are not graded, and a `grep` for `proposal` under
  `docs/internal/templates/` returns nothing.
- Nine templates now exist, one per canonical type id, and the registry table's nine rows resolve to
  nine files.

### Task G1-5: Adopt markdownlint-cli2 and its config

**Chain:** G1. **Depends on:** G1-4. **Deliverables:** 4.

**Files:**
- Modify: `.markdownlint-cli2.yaml` (P4's stub, filled), `package.json` (`devDependencies` gains
  `markdownlint-cli2`; `"lint:markdown"`), `.github/workflows/test.yml` (a step block inside P4's
  `docs-gates` job)
- Create: `scripts/checks/check-docs-standard-globs.mjs` (the named-remover assertion),
  `scripts/checks/check-docs-standard-globs.test.ts`

**Acceptance criteria:**
- The config takes **GitLab's shape**: `default: true` then per-rule overrides, glob-keyed
  `overrides` for per-path relaxations, and a `customRules` entry loading the local rule file G1-6
  writes.
- `MD024 no-duplicate-heading` is configured `siblings_only: true`. At the stock setting it fires
  hard across cairn's reference pages, which repeat `## Types` and similar headings by design, and
  it is the single most likely source of unbounded clearing work.
- `MD013 line-length` is configured with `code_blocks: false`, `tables: false`, `headings: true`,
  `heading_line_length: 100`, `line_length: 800`, and its comment states plainly that **MD013
  measures characters per line, not sentence length**, so it is not a back door to the length rules
  decision 1 settled at warning.
- `MD045 no-alt-text` is enabled and carries the missing-alt hole. `check:visuals` already fails an
  empty markdown alt and an over-long alt; the real hole is narrower than revision 1 stated: an
  `<img>` carrying **no `alt` attribute at all** matches neither `HTML_IMG_ALT_RE` nor
  `MD_IMAGE_RE`, is never counted in `imageCount`, and is never flagged. MD045 covers exactly that
  case off the shelf, and the extend stage's `check:figures` task therefore spends nothing on it.
- `MD044 proper-names` carries cairn's product-name allowlist, and the config's comment states which
  of `MD044` and `.vale.ini`'s `Vocab = Cairn` owns a name, so the two lists are not maintained
  twice.
- **Reflowing rules are disabled on the published pages** through glob overrides, each naming the
  stage that removes it. The disable's comment states the reason: a reflow moves a page's lines and
  the ledgers record a `line`.
- **In-scope paths at the end of this task are `docs/internal/**` only.** The demonstration page,
  `docs/extend/add-a-custom-admin-screen.md`, carries its own glob override naming **D1** as the
  remover, not a stage: the page has no brief yet at G1-5's merge, so leaving it in scope would fail
  `CAIRN002 brief-present` and every anatomy check red on `main` from the G merges until D1 lands.
  Every other published path carries a glob override relaxing the new rules, each naming **the stage
  that removes it**, by track name rather than by a plan filename, since no stage plan exists yet.
  This task clears nothing beyond that scope; each stage widens it as its track is rebuilt.
  Revision 1's "clear or scope every existing violation" over 76 pages was the largest unsized item
  in the plan.
- `check:docs-standard-globs` fails an override with no named remover, and both fixtures run in the
  unit test. This is the named-remover discipline `docs-standard-scope.json` carried, on the file
  that now holds the scoping.
- `npm run lint:markdown` is green, and `test.yml`'s `docs-gates` job runs it as its own named step.

### Task G1-6: The cairn markdownlint custom rules

**Chain:** G1. **Depends on:** G1-5. **Deliverables:** 4.

**Files:**
- Create: `.markdownlint/rules/cairn-rules.mjs`,
  `scripts/checks/fixtures/docs-standard/markdownlint/` (a pass and a fail fixture per rule),
  `scripts/checks/cairn-markdownlint-rules.test.ts`
- Modify: `.markdownlint-cli2.yaml` (register the rules with their severities)

**Interfaces:**
- Produces: five custom rules registered inside the markdownlint run, in the shape `github/docs`
  uses: a plain object with `names`, `description`, `tags`, `severity`, and `function`.
- Consumes: `scripts/checks/brief.mjs` (P3), `docs/internal/templates/` (G1-1 through G1-4),
  `docs/internal/corpus/manifest.md` when present.

**Acceptance criteria:**
- **`CAIRN001 page-anatomy`** dispatches on the page's brief `type` and asserts the template's
  required headings are present and in order, naming the heading and the position it expected. It
  reads section orders **only** from `docs/internal/templates/`; a `grep` for any heading string
  from the spec inside the rule file returns nothing. Where a type maps cleanly to a path glob (the
  reference entries, the track indexes), stock **MD043 `required-headings`** carries it through a
  glob override instead, and the rule's header says which types MD043 covers and which need the
  dispatch. MD043 takes an ordered array with wildcards and enforces order today; it cannot dispatch
  on a brief field, which is the residue this rule exists for.
- **`CAIRN002 brief-present`** fails a page in scope whose brief is missing or unparseable, **before
  any heading check**, naming the expected brief path. It reaches the root `README.md` by resolving
  `README.brief.yml`, and states that special case in one comment. It refuses a brief whose
  `corpus_entry` names a manifest row whose `approved` column is empty, and treats `provisional` as
  empty except for the page a glob override names (C5's note).
- **`CAIRN003 front-door-shape`** and **`CAIRN004 index-shape`** hold the two shapes the register
  fixes: five routes in the first screenful for a track index, the evaluator's eight-section order
  for a front door.
- **`CAIRN005 list-grouping`** fails a section-level list of more than nine items that is not
  grouped, at warning. Template orders are exempt by glob. This is the spec's general nine-item
  rule, which revision 1 landed only as an index-page sentence.
- **Heading rule 6, sibling parallelism, is not here.** It ships as a Vale `extends: script` rule in
  G2-2. G1 merges before G2 by default, so a rule whose home depended on G2-2's outcome could not be
  written in this task; the home is fixed in advance rather than made conditional.
- Every rule has a fixture that fires and a fixture that passes, all running in the unit test.
- No `check:anatomy` or `check:headings` npm script is created. A `grep` for either in
  `package.json` returns nothing.

### Task G1-7: The per-type anatomy report

**Chain:** G1. **Depends on:** G1-6. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/report-anatomy.mjs`, `scripts/checks/report-anatomy.test.ts`
- Modify: `package.json` (`"report:anatomy"`), `docs/internal/page-types.md` (the two finding
  columns)

**Interfaces:**
- Produces: `npm run report:anatomy [--json]`, the registry lifecycle's measurement instrument.
- Consumes: `markdownlint-cli2`'s JSON output, `docs/internal/record/docs-rebuild/page-types.md`,
  and `docs/internal/page-types.md`'s column set.

**Acceptance criteria:**
- The script runs `markdownlint-cli2` over the published set in JSON output mode, groups every
  `CAIRN001 page-anatomy` finding by the page's type from
  `docs/internal/record/docs-rebuild/page-types.md`, and prints one line per type: the pages
  assigned and the outline-review failure count.
- **A page whose `type` is empty is grouped as `untyped` and counted separately**, never assigned to
  a nearest type and never dropped. At this pass exactly one page is typed, so the report is almost
  entirely `untyped`, and the script's header says so plainly with the reason: each stage types its
  own track at its harvest, and each stage's tuning checkpoint re-runs this report as the typed share
  grows. A report that hid the untyped share would read as a measurement of a registry nobody has
  populated.
- **It reports, per type, the failure count and the page count, and nothing that ranks one type
  against another.** No median, no registry-wide rate, no ordering. The spec's registry lifecycle
  compares a type against its own prior record, because a threshold set at the registry median
  retires half the registry by construction and a documentation metric is goal-specific per type.
- It reads the previous run's counts from `docs/internal/page-types.md` and prints the change against
  them per type, flagging a type only when it clears both bounds the lifecycle sets: at least three
  outline-review failures in the window, and at least three pages of that type. Below either bound
  the type is printed as below sample, never as flagged.
- **It gates nothing.** It exits 0 whatever it finds, it is wired into `package.json` only, and a
  `grep` proves it appears in no `test.yml` step. The script's header states that and the reason: a
  measurement that decides whether a type survives must not also decide whether a build passes.
- The spec's `check:anatomy` is this repository's `CAIRN001` rule, and the header records that the
  reported fields the spec asks `check:anatomy` to carry live here rather than inside a per-page
  markdownlint rule, which sees one page at a time and cannot roll a type's window up.
- The task writes the current values into `docs/internal/page-types.md`'s two finding columns and
  records the run date in `last reviewed`, leaving the reader-test and cost columns to D3.
- A fixture with a known finding distribution proves the grouping, the per-type counts, and both
  bounds, including a type that clears the failure floor but not the page floor. The unit test runs
  it.

---

## Chain G2: the prose, provenance, and receipt spine (unit 3b)

Nine tasks. **The figures task is not here.** Revision 2 carried `check:figures`' seven assertions
as G2-10; it moves to the extend stage, the first stage with a figure to grade, per the spec's staged
Implementation section. If the seven assertions land on `main` before this pass's second invocation
for any other reason, this pass takes them as a tenth G2 task and the extend stage drops the item;
the conductor records which happened in `preflight.md`.

### Task G2-1: The register's prose standard section

**Chain:** G2. **Depends on:** P4. **Deliverables:** 2.

**Files:** Modify `docs/internal/docs-register.md`.

**Acceptance criteria:**
- The section names the Federal Plain Language Guidelines, 2011 revision, as the prose standard,
  with its revision date, its fetch date, and the note that plainlanguage.gov now redirects to
  digital.gov with the live guides re-cut. **The PDF is not vendored.** No script parses it, nothing
  tests against it, and a citation carrying the revision, the fetch date, and the redirect note
  carries the same information as a binary in git history.
- It names the adopted parts: audience, organization, words, sentences, paragraphs, and test.
- Its table of the four numbers carries, for each, its target, its source, and its status, and every
  length row's status reads that it warns and never gates.
- It states the severity contract: an error fails the build, a warning shows in the review, a
  suggestion stays local, and a rule moves to error only after every existing violation in the
  tracks it covers is cleared.
- It states the review chain's ten steps in order and its two-round revision cap: one round is steps
  3 through 7 run once, a fix verdict buys one redraft and one second run, and a second fix verdict
  goes to the owner. One cap on the whole chain, not one per step.
- **It carries the citation correction:** `errata-ai/Google` is a community port under MIT
  ("Copyright (c) 2018 - 2019 Joseph Kato"), not Google's own gate, and Google publishes no linting
  of its own documentation repositories. No other task touches that description.
- It records that `check:fact-coverage` is deliberately not a CI gate, with the reason.

### Task G2-2: The Vale heading rules and the golden fixture harness

**Chain:** G2. **Depends on:** G2-1. **Deliverables:** 4.

**Files:**
- Create: `.vale/styles/Cairn/HeadingGerund.yml` (rule 4), `.vale/styles/Cairn/HeadingVerbFirst.yml`
  (rule 5), `.vale/styles/Cairn/HeadingSiblingForm.yml` (rule 6, `extends: script`),
  `.vale/styles/Cairn/HeadingQuestion.yml` (rule 7), `.vale/styles/Cairn/SelfNaming.yml`,
  `scripts/checks/vale-fixtures/<Rule>/{.vale.ini,test.md,expected.txt}` per Cairn rule,
  `scripts/checks/check-vale-fixtures.mjs`, `scripts/checks/check-vale-fixtures.test.ts`
- Modify: `.vale.ini` (section levels only; the vendored packages stay unedited), `package.json`
  (`"check:vale-fixtures"`)

**Acceptance criteria:**
- **The harness uses the errata-ai golden form**: each fixture directory carries its own minimal
  one-rule `.vale.ini` plus `test.md`, and the runner invokes
  `vale --output=line --sort --normalize --relative --no-global --no-exit .` inside it, comparing
  the output byte for byte against committed `expected.txt`.
- **Rules 4, 5, 6, and 7 ship as Vale rules with `scope: heading`.** Rule 4 (no leading `-ing` form)
  and rule 7 (question headings only under `docs/editors/`) are `extends: existence`, rule 7 scoped
  by a `.vale.ini` section on the same mechanism that already gives `docs/editors/**` Microsoft
  instead of Google. Rule 5 (verb-first for task sections) is `extends: existence` whose imperative
  word list lives **inside the rule file**. **No `verb-lexicon.json` and no `heading-grammar.md` are
  created.** Revision 1 spent two tasks, a JSON lexicon, an explainer page, and fourteen fixtures on
  output that warns and never gates; the word list is data a rule reads and belongs in the rule.
- Rule 6 (siblings in one form) ships as `extends: script`, Vale's Tengo extension point, which is
  what reaches whole-document state. Its golden fixture on the pinned 3.15.1 binary is the proof.
  **If the fixture cannot be made to fire on 3.15.1, the task reports that as an escalation to the
  conductor rather than relocating the rule**, since G1 has already merged and cannot take it.
- `Cairn.SelfNaming` fails a page that names its own page type or its own track in body prose, at
  warning. This is the spec's normative "no page names its own type or track", which revision 1 left
  with no gate, no template note, and no task.
- `check:vale-fixtures` fails when any Cairn rule's output does not match its golden, and the unit
  test proves it by perturbing one rule and asserting the runner fails.
- The fixture suite runs on every CI run, unconditionally, on the pinned 3.15.1 binary. **The local
  run is advisory and the report says so.**
- Both vendored packages, `Google` and `Microsoft`, are unedited: `git diff` over
  `.vale/styles/Google/` and `.vale/styles/Microsoft/` is empty.

### Task G2-3: Clear the seventeen headings, promote `Google.Headings`, and fixture the five shipping rules

**Chain:** G2. **Depends on:** G2-2. **Deliverables:** 3.

**Files:** Modify `.vale.ini` (the `Google.Headings` level), and the published pages carrying the
findings. Create `scripts/checks/vale-fixtures/<Rule>/{.vale.ini,test.md,expected.txt}` for the five
Cairn rules that already ship (Announcement, ContrastFrame, Marketing, TwoHeadedHeading,
VirtueClaims), in the same golden form G2-2's harness reads.

**Acceptance criteria:**
- `vale --minAlertLevel=warning --output=line docs README.md` reports **zero** `Google.Headings`
  findings across the published set. It reports 17 today.
- `.vale.ini` sets `Google.Headings` to error, and the severity contract's clearing precondition is
  satisfied and stated in the task report.
- **Heading rule 1, sentence case, is now carried entirely by `Google.Headings`**, which already
  ships in `.vale/styles/Google/Headings.yml` as `extends: capitalization, scope: heading,
  match: $sentence` and already runs on `docs/**` at warning. No cairn rule reimplements it.
- Rules 2 and 3, single level-one heading and no skipped levels, are markdownlint's `MD025` and
  `MD001`, already carried by G1-5. No cairn rule reimplements either, and a `grep` for a
  level-count check across `.vale/styles/Cairn/` and `.markdownlint/rules/` returns nothing.
- The clearing edits change heading capitalization only. Every changed slug is listed in the task
  report, and each stage harvests against the post-clearing state, since every stage branches after
  this pass merges.
- Fixtures exist for the five Cairn rules that already ship (Announcement, ContrastFrame, Marketing,
  TwoHeadedHeading, VirtueClaims), in the errata-ai golden form, and `check:vale-fixtures` covers all
  five alongside G2-2's new rules.

### Task G2-4: The length and paragraph rules, and the warning report

**Chain:** G2. **Depends on:** G2-3. **Deliverables:** 4.

**Files:**
- Create: `.vale/styles/Cairn/LongSentence.yml` (40 words, every published track, warning),
  `.vale/styles/Cairn/ParagraphBounds.yml` (`extends: occurrence`, `scope: paragraph`, warning),
  their fixtures in the golden form
- Modify: `.vale.ini` (the admin and editors sections), `.github/workflows/test.yml` (the
  warning-report step inside `docs-gates`), `package.json` if the report step needs a script

**Acceptance criteria:**
- **The 25-word ceiling on admin and editors is `Microsoft.SentenceLength` with its `max` overridden
  to 25 in those `.vale.ini` sections, not a second rule.** `Microsoft.SentenceLength` already runs
  on `docs/editors/**` as `extends: occurrence, scope: sentence, max: 30`, so a parallel
  `Cairn.SentenceCeiling` would produce two findings on the same sentence in two vocabularies. The
  level is warning, per decision 1.
- `Cairn.LongSentence` holds the 40-word ceiling across every published path at warning, and its
  comment states that decision 1 settles the level permanently with no promotion path.
- **`Cairn.ParagraphBounds` ships at warning, not error.** It is a Vale rule, not a script: the
  hedge in revision 1's file list ("or the equivalent script check if Vale cannot hold a paragraph
  measure") is resolved, because `extends: occurrence` with `scope: paragraph` counts sentence
  terminators per paragraph exactly as `Microsoft.SentenceLength` counts words per sentence. Warning
  is the level for two recorded reasons: the spec's own compatibility rule says a new rule ships at
  warning and moves to error only after every existing violation is cleared, and no task in this
  plan clears paragraph violations across 76 pages; and the rejected front-door draft failed on
  invented facts and a hinged-pair rate, never on paragraph length.
- The rule holds three to eight sentences and 150 words with 250 as the hard limit, and a list
  lead-in is exempt.
- The sentence ceiling travels with its two companion rules from ASD-STE100: complex text goes into
  a list, and no part of a sentence is dropped to make it shorter. Both appear in the rule file's
  message or in G2-1's register section.
- **`test.yml`'s `docs-gates` job gains a second, non-blocking Vale step** running
  `vale --minAlertLevel=warning --no-exit` over the published set and writing the output to a CI
  artifact. Without it, "warns permanently" ships as "is silent permanently": `check:vale` runs at
  `--minAlertLevel=error`, so today's 558 `Google.WordListCase`, 178 `Google.Colons`, and 46
  `Google.OxfordComma` findings reach nobody, and the two rules this task authors would reach nobody
  either. The step's name says it is non-blocking.
- Two fixtures record the exemplar failures the spec's receipt names: KEP-2400's 44-word sentence
  against the 40-word ceiling, and both exemplars' paragraphs under the three-sentence floor.
- `npm run check:vale` is green on the published set, since every new rule warns.

### Task G2-5: `check:provenance`, the deny-by-default core

**Chain:** G2. **Depends on:** G2-4. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-provenance.mjs`,
  `scripts/checks/fixtures/docs-standard/provenance-pass/`,
  `scripts/checks/fixtures/docs-standard/provenance-fail-unclassified/`,
  `scripts/checks/fixtures/docs-standard/provenance-fail-unresolved/`,
  `scripts/checks/check-provenance.test.ts`
- Modify: `package.json` (`"check:provenance"`)

**Acceptance criteria:**
- Every sentence in the page must appear in the brief's `sentences` list, in order and in count. A
  sentence the drafter did not classify fails the build, naming the sentence and its index.
- Every non-`no-claim` element must resolve to an entry in the ledger the brief's `track` names. An
  unresolved id fails, naming the id.
- An entry whose tier is `unverified` or `retired` fails when a brief cites it.
- **The sentence splitter is imported from `measure-prose.mjs`**, which P4 made importable. A `grep`
  for a second splitting regex in `check-provenance.mjs` returns nothing. Revision 1 asserted this
  against a script that exported nothing and exited the process on import, and did not list that
  script in the task's Files list.
- The brief is parsed through `scripts/checks/brief.mjs` (P3), which exists on `main` before this
  chain branches.
- All three fixtures run in the unit test with the expected exit codes and messages.
- The script never reads the published page for ids; a `grep` proves no id syntax is matched against
  page text.
- The script reads its in-scope path set from `.markdownlint-cli2.yaml`'s globs, from one place, so
  the two gates cannot disagree about what is in scope.

### Task G2-6: `check:provenance`, the fact matcher and the front-door fixture

**Chain:** G2. **Depends on:** G2-5, H1 (merged). **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/fixtures/docs-standard/provenance-front-door/`,
  `scripts/checks/fixtures/docs-standard/provenance-fail-uncited-fact/`
- Modify: `scripts/checks/check-provenance.mjs`, `scripts/checks/check-provenance.test.ts`

**Steps:**
- [ ] **Step 0:** rebase this worktree on merged `main`, so `check-fact-coverage.mjs` is present.
- [ ] **Step 1:** add the fact matcher.
- [ ] **Step 2:** build the front-door fixture and assert both of its outcomes; commit.

**Acceptance criteria:**
- The matcher covers the classes the spec names: numerals, version strings, file paths, commands and
  flags, export and config names, and the product claims the ledger's `owner` tier lists.
- **The token classes are imported from `scripts/checks/check-fact-coverage.mjs`**, and a `grep`
  proves the extractor is defined once. In revision 1 this was a hard cross-chain blocker: the file
  lived in chain H's worktree and did not exist in G2's. Step 0's rebase is the fix. If
  `check-fact-coverage.mjs` is not present after the rebase, the task reports BLOCKED rather than
  duplicating the extractor.
- The front-door fixture reproduces both outcomes the spec describes: leaving the
  editors-emailing-the-owner sentence unclassified fails the build outright, and marking it
  `no-claim` passes the script. The unit test asserts both, and the second case's assertion carries
  a comment stating that the reviewer, not the script, catches a narrative assertion recorded as
  claiming nothing.
- An uncited machine-extractable fact fails, naming the token and the sentence.
- Everything the extractor cannot reach is documented in the script's header as the fresh reviewer's
  job at chain step 7.

### Task G2-7: `check:prose-read`, the receipt ledger, and the quality checklist

**Chain:** G2. **Depends on:** G2-5. **Deliverables:** 4.

**Files:**
- Create: `scripts/checks/check-prose-read.mjs`,
  `scripts/checks/fixtures/docs-standard/receipts-pass.md`,
  `scripts/checks/fixtures/docs-standard/receipts-fail-missing-row.md`,
  `scripts/checks/check-prose-read.test.ts`, `docs/internal/templates/quality-checklist.md`
- Modify: `package.json` (`"check:prose-read"`),
  `docs/internal/record/docs-rebuild/receipts.md` (P4 created it; this task fixes its columns)

**Acceptance criteria:**
- `receipts.md` is a markdown table with these columns, in this order: `page`, `type`,
  `corpus entry`, `reviewer verdict`, `dispatch id`, `reader test`, `date`, `pull request`.
- `reader test` carries a result or the literal `n-a`; the header states that a reference entry never
  gets one.
- `check:prose-read` fails a published page in scope with no row, naming the page; fails a row whose
  `page` resolves to no file; passes otherwise.
- The script computes no hash and reads no per-page receipt file. A `grep` for `createHash` returns
  nothing, and the header states that decision 3 settles the mechanism as the pull-request artifact
  plus this ledger, and the consequence it buys: a typo fix does not re-enter the review chain,
  because nothing here is content-addressed. **The header also records what the narrowing costs:**
  the spec's "stale receipt" clause is satisfied only as a missing row or a dead page path.
- **`quality-checklist.md` commits the spec's twelve rows**, each naming the gate or the person that
  answers it, and its header states that every page walks it before its receipt is written.
  `brief-schema.md` names its path. The spec makes the checklist normative and revision 1 committed
  it nowhere, so a stage's reviewers would have cited a document that did not exist.
- `receipts.md` and the checklist are under `docs/internal/`, so neither ships;
  `npm run check:package` proves it.
- Both fixtures run in the unit test.

### Task G2-8: `check:ledger`

**Chain:** G2. **Depends on:** G2-5. **Deliverables:** 3.

**Files:**
- Create: `scripts/checks/check-ledger.mjs`,
  `scripts/checks/fixtures/docs-standard/ledger-pass.md`,
  `scripts/checks/fixtures/docs-standard/ledger-fail-duplicate-id.md`,
  `scripts/checks/fixtures/docs-standard/ledger-fail-dead-anchor.md`,
  `scripts/checks/check-ledger.test.ts`
- Modify: `package.json` (`"check:ledger"`)

**Interfaces:**
- Produces: `npm run check:ledger [-- --json]`. The `--json` mode emits every entry as structured
  data, which is what each stage's unverified sitting extracts its rows with rather than reading a
  ledger end to end.
- Consumes: `docs/internal/record/docs-rebuild/ledger-schema.md` (P2), on `main` before this chain
  branches. Revision 1 made this the one declared cross-chain edge and told the task to "wait",
  which is not a thing an implementer in a sequential chain can do.

**Acceptance criteria:**
- Every id matches the format and is unique within its file; a duplicate fails, naming both rows.
- Every entry carries one of the five tiers, and every entry outside `unverified` and `retired`
  carries a proving source in the shape its tier requires.
- **Every `read`-tier entry re-resolves by `anchor` plus `claim`, not by `line`.** A page whose
  anchor is gone fails, naming the id and the anchor; a line that moved does not. This is what
  converts "the harvest went stale" from prose into a failing test without making an ordinary reflow
  falsify the ledger.
- A `gate`-tier entry whose named gate is not a script in `package.json` fails.
- The validator reads its column names from `ledger-schema.md`'s stated set and fails when a
  ledger's header row does not match, so the schema and the gate cannot drift apart.
- The script tolerates a missing ledger file with a clear message naming which track has not been
  harvested yet. **Four tracks are unharvested when this pass ends and each is harvested a stage
  later**, so this tolerance is permanent behavior rather than a temporary accommodation, and the
  script's header says so.
- `--json` emits every entry with its tier, which every stage's unverified sitting depends on.
- All three fixtures run in the unit test.

### Task G2-9: The G2 CI wiring and the weekly link check

**Chain:** G2. **Depends on:** G2-6, G2-7, G2-8. **Deliverables:** 3.

**Files:**
- Modify: `.github/workflows/test.yml` (the `docs-gates` job gains the G2 steps),
  `docs/internal/docs-register.md` (the gate estate section)
- Create: `.github/workflows/link-check-external.yml`

**Acceptance criteria:**
- `test.yml`'s `docs-gates` job runs `check:provenance`, `check:prose-read`, `check:ledger`, and
  `check:vale-fixtures` as separately named steps, so a failure is readable in the run log.
- **`check:fact-coverage` is deliberately not among them**, and the register records the non-wiring
  with its reason.
- **No tell-scanner step is added.** The tell scanner is `tellgrader`, a machine-local workstation
  binary that is never available on a GitHub Actions runner, so revision 1's non-blocking "where it
  is available" step would have been a permanently inert line whose only function is to look like
  coverage.
- The external link check is **a weekly `lychee` GitHub Action in this repository**
  (`lycheeverse/lychee-action`, Apache-2.0 or MIT, version pinned), scheduled rather than
  per-pull-request, reporting rather than failing, and filing and refreshing **one rolling issue** so
  a persistent dead link does not ping weekly forever. Internal links and anchors stay in
  `check:docs` per pull request, which is the field's split. It is in-repo rather than a
  `schedule`-skill cloud routine, because the implementer has no `Skill` tool and because a workflow
  file is a `git diff` the chain can grade.
- No `check:cadence` script exists; a `grep` for `check:cadence` in `package.json` returns nothing.
- The register's gate estate section lists every gate this plan adds, its runner, and its scope.

---

## Chain D: the demonstration page (unit 4)

Three tasks, all **conductor tasks** in the main loop, because each dispatches a subagent or stops
for the owner and `cairn-implementer` has no `Agent` tool. D1 and D2 close invocation one; D3 opens
invocation two. **The chain starts after polish-C merges** (amended 2026-09-08 evening), because
polish-C's task 1 rewrites the same page to drop `OfficeList`.

### Task D1: The brief, the outline, and the quarantined draft

**Conductor task.** **Depends on:** H2, H3, C4, G1-6, G2-9. **Deliverables:** 3.

**Files:**
- Create: `docs/extend/add-a-custom-admin-screen.brief.yml`
- Modify: `docs/extend/add-a-custom-admin-screen.md` (rebuilt, not edited),
  `docs/internal/corpus/manifest.md` (the provisional mark), `.markdownlint-cli2.yaml` (remove
  G1-5's D1-named exclusion for the demonstration page)

**Steps:**
- [ ] **Step 1:** write the brief from the ledger; the `needs` and `keep` lists cite ids. Mark the
  chosen `task-guide` corpus entry `provisional <date>` and record it in `preflight.md`.
- [ ] **Step 2:** review the outline against the brief, by a reviewer and by `lint:markdown`'s
  `CAIRN001`, **before any sentence is drafted**. A page whose type, title, or section order is
  wrong goes back here.
- [ ] **Step 3:** **move `docs/extend/add-a-custom-admin-screen.md` to a scratchpad path outside
  `docs/` for the duration**, dispatch the drafter with `drafting-dispatch.md`'s fragment verbatim,
  and draft one section per read, recording the dispatch id. The old page is restored by D2's
  coverage-diff step. This is the mechanical half of the quarantine: revision 1 asked one implementer
  to produce a diff replacing a page it must never open, which one dispatch cannot do.
- [ ] **Step 4:** commit.

**Gate:** `npm run lint:markdown && npm run check:docs`.

**Acceptance criteria:**
- Writing the brief removes G1-5's `.markdownlint-cli2.yaml` exclusion for the demonstration page in
  the same commit, so the page returns to `docs/internal/**`'s in-scope treatment the moment it has
  a brief to satisfy `CAIRN002`, and CI on `main` is never red between the G merges and D1.
- The brief parses and carries all eight fields, with `type: task-guide`, `track: extend`, a named
  `exemplar`, a `corpus_entry` list of one or two manifest ids, `needs` and `keep` lists of
  resolving ids, and a `sentences` list covering every drafted sentence.
- The drafting dispatch's readable-file list excludes the page it replaces, and the dispatch record
  proves it: the page's `docs/` path did not exist during the drafting dispatch.
- The outline review happened before any prose: the commit history shows an outline-only commit, or
  the task report carries the reviewer's outline verdict timestamped before the draft.
- The page follows the `task-guide` template's section order, with every required heading present and
  in order.
- Every `keep`-class item the ledger records for this page is carried: the anchor map's slugs survive
  or are repaired, the gated blocks match their entries byte for byte, and every Vale suppression is
  carried with its comment or its removal is recorded in `deviations`.
- No sentence in the page appears in the old page. The conductor checks this against the scratchpad
  copy, which is why the quarantine is mechanical rather than an instruction.

### Task D2: The gates, the fresh reviewer, and the coverage diff

**Conductor task.** **Depends on:** D1. **Deliverables:** 3.

**Files:**
- Modify: `docs/extend/add-a-custom-admin-screen.brief.yml` (the `deviations` the review produces),
  `docs/extend/add-a-custom-admin-screen.md` (one redraft round at most)
- Create: `docs/internal/record/docs-rebuild/demonstration-review.md`

**Steps:**
- [ ] **Step 1:** run the chain's steps 3 through 6: `lint:markdown`, `check:docs`, `check:visuals`,
  then `check:vale` and the warning report, then `check:provenance`.
- [ ] **Step 2:** dispatch the fresh reviewer, a different context and a different model family from
  the drafter, with the corpus entry or entries.
- [ ] **Step 3:** restore the quarantined page copy, then dispatch a separate agent, never the
  drafter, for the coverage diff against the extend ledger, and record its report as a
  `## Coverage diff` section of `demonstration-review.md`, not a separate file. One redraft round at
  most; a second fix verdict goes to the owner.
- [ ] **Step 4:** dispatch the `figure-verifier` agent (`~/.claude/agents/figure-verifier.md`) if the
  drafted page carries any figure, and record its per-figure verdicts in a `## Figure verification`
  section of `demonstration-review.md`. The demonstration page carries no figure, so this step
  records "no figure" and instead runs `figure-verifier` once on `docs/extend/architecture.md`'s two
  mermaid figures (lines 5 and 90), recording those verdicts in the same section, so the hand-off's
  figure-verifier artifact is exercised at least once in this pass.
- [ ] **Step 5:** run `check:ledger` over every ledger that exists, its first real run; commit.

**Gate:** `npm run check && npx vitest run scripts/checks && npm run check:docs &&
npm run check:vale && npm run lint:markdown && npm run check:provenance && npm run check:ledger`.

**Acceptance criteria:**
- Every named gate exits 0 on the page. **`check:figures`' seven assertions are not among them**,
  since that work is the extend stage's; **the extend stage re-runs this page's full gate
  set after the seven assertions land**, which its plan carries as a criterion.
- `check:provenance` passes with every sentence classified and every cited id resolving; no sentence
  carries `no-claim` while stating a checkable proposition, which the reviewer's report addresses
  explicitly.
- The reviewer's report names the corpus entry it graded against and carries the measurement table:
  sentence count, average length, longest sentence, short-sentence share, and paragraph counts, each
  beside the corpus entry's number. **Where the brief names two entries, the report grades against
  the closer of the two and names both**, which is the spec's rule and P3's schema field. The
  hinged-pair share is reported here and is not a manifest column.
- The coverage diff's report lives in `demonstration-review.md`'s `## Coverage diff` section, listed
  in this task's Files, and lists every ledger entry for this page the drafted page dropped, each
  restored or recorded in the brief's `deviations` with a reason. This is the path T1's "sourced by
  path" criterion cites for the coverage-diff figures.
- `demonstration-review.md` carries a `## Figure verification` section. The demonstration page
  carries no figure, so the section states "no figure" for it and carries `figure-verifier`'s two
  verdicts, one per mermaid figure, for `docs/extend/architecture.md`, each with a `file:line` and
  one of the five verdict values from the agent's own table (earns its place, decoration, should be
  a table, should be a numbered list, missing figure). This is the hand-off's sixth artifact, proven
  once against a real page in this pass rather than left unexercised for a stage to discover.
- The revision cap held: at most one redraft, and the report says how many rounds ran.
- The type ids in `docs/internal/record/docs-rebuild/page-types.md`, the template filenames, and the
  brief's `type` agree exactly.

### Task D3: The reader test, the receipt, the measured cost, and the first registry review

**Conductor task**, invocation two. **Depends on:** D2, C5. **Deliverables:** 4.
**Owner-blocked**: the reader test, the demonstration read, and the page's unverified rulings are the
closing sitting.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/receipts.md` (the first row),
  `docs/internal/page-types.md` (the rows the review fills),
  `docs/internal/page-type-rulings.md` (the first ruling),
  `docs/internal/record/docs-rebuild/extend-facts.md` (the tier changes the owner rules on this
  page's own `unverified` entries)
- Create: `docs/internal/record/docs-rebuild/demonstration-cost.md`

The registry review is one deliverable, counted as the artifact it is: the review with its outcome
rows and its ruling. The task stays at four.

**Steps:**
- [ ] **Step 1:** re-run the page's full gate set on merged `main`.
- [ ] **Step 2:** run the reader test: someone who is not the author does the task from the page, one
  sitting. Record every place the page was unclear.
- [ ] **Step 3:** write the receipt row and the comparison artifact, with the conductor supplying the
  token spend per step, which an implementer cannot observe.
- [ ] **Step 4:** run the registry lifecycle's first review against the measured template cost, and
  record its ruling.
- [ ] **Step 5:** present the rebuilt page beside the original to the owner, batched with the
  demonstration page's own `unverified` entries, each carrying what would prove it and the
  conductor's recommendation of true, aspirational, or comes out. Apply each ruling: a claim ruled
  true gets its tier and proving source, and a claim ruled aspirational or out keeps `unverified`
  with the ruling in its note. **The owner's read and approval to proceed is the pass's closing gate,
  not this task's criterion.**

**Gate:** `npm run check:prose-read && npm run check && npx vitest run scripts/checks &&
npm run check:ledger && npm run check:fact-coverage -- --track extend`.

**Acceptance criteria:**
- `receipts.md` carries one row for `docs/extend/add-a-custom-admin-screen.md` with every column
  filled.
- `check:prose-read` exits 0 with the page in scope.
- `demonstration-cost.md` carries the rebuilt page beside the original, the token spend end to end
  broken down by step (brief, outline review, draft, gates, fresh reviewer, coverage diff, reader
  test), and the attended sitting count.
- The cost document states the per-page figure a stage multiplies to set its ceiling, and names the
  pages it does not apply to: the reference entries, which are edited in place. **It states plainly
  that this is one page of one type on one track**, so stage one sizes from it and stage two sizes
  from stage one's measured cost instead.
- The reader test's result is in the receipt row and its findings are listed in the cost document,
  whether or not they were folded. **This is one of the nine reader-test sittings decision 4 funds**,
  and the cost document records that eight remain, allocated across the five stages per "Stages that
  follow".
- **Every `unverified` entry on this page carries an owner ruling**, and every entry ruled true has
  moved to `gate`, `read`, or `owner` with its proving source recorded. No entry ruled aspirational
  or out has changed tier. `check:ledger` and `check:fact-coverage -- --track extend` exit 0
  afterwards.
- **The registry lifecycle's first review runs here, and it is a review rather than an owner
  question.** Decision 2 is settled: the registry is nine types. The review's input is what a
  template cost on the demonstration page, and it fills the demonstration page's type row in
  `docs/internal/page-types.md`: the reader-test result, the measured drafting cost, the questions
  anyone had to ask about the page, and the reviewer misses D2's fresh reviewer and coverage diff
  produced, each attributed to the template, the subject, or register. `helpful votes` stays empty.
- **The review's ruling is written to `docs/internal/page-type-rulings.md`**, in the shape
  `docs/internal/engine-rulings.md` uses: the ruling, the evidence, and what would reopen it. A
  review that changes nothing still writes a ruling saying so, with the cost figure as its evidence.
  Neither of the two count-changing rulings can fire on one page, so the ruling is either "no change"
  or a template revision on a section the findings cluster on, and the task says which.
- The review records the two bounds it could not test on one page: the failure-count trigger needs
  three failures and three pages of a type, so no type is flagged here, and the row is a baseline for
  the next review rather than a comparison. T1, T2, and R2 record the outcome.
- The document does not assert the owner's approval. It states that the read is pending or records
  the date it happened.

---

## Chain R: the tuning checkpoint, the records, and the hand-off

Five tasks, last, in order: R1, T1, T2, R2, R3. **Gate:** `npm run check:docs && npm run check:vale &&
npm run check:rulings-format && npm run check:arm-indexes`.

**T1 and T2 sit between R1 and R2 deliberately.** T1 records the baseline every stage measures
against, and T2 amends the ledger schema, the brief schema, the templates, and the gate thresholds
against it. R2 and R3 then record and hand forward what T2 amended. A checkpoint run after the
hand-off would hand stage one the unamended tooling.

### Task R1: The roadmap absorption

**Chain:** R. **Depends on:** D3. **Deliverables:** 3.

**Files:** Modify `ROADMAP.md` (the claims-verification row and the registry-review standing item),
`docs/internal/engine-rulings.md` (one row).

**Interfaces:**
- Consumes: owner decision 5.
- Produces: the absorption and the recorded overrule.

**Notes:** **the polish-spec amendment is no longer R1's.** It is a precondition of the whole
initiative and lands as a dated amendment section in
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` before polish-B's plan is authored.
Revision 1 had the last task of this plan writing instructions to passes that, by its own stated
ordering (A, B, D, C, then this plan), had already finished; polish-B would have folded its thirty
prose findings into the pages as edits and polish-D would have authored the front door, which is
exactly what the amendment exists to prevent, and which would have falsified the front-door stage's
premise as well.

**Acceptance criteria:**
- `ROADMAP.md`'s docs claims-verification row is marked absorbed, names the five ledger paths as
  where the sweep's output lives, and states plainly that **this pass builds the ledger schema and
  the tools and proves them on one page, each stage extracts and verifies its own track, and each
  stage's rewrite folds the corrections**, since "absorbed by this harvest" overstates what merges
  here. The row names the stage order, so a reader can tell when the sweep is complete: it is
  complete when the fifth stage merges, not when this pass does.
- The row **records the overrule of its ratified after-`beta.1` sequencing, and the recorded reason
  answers the row's own stated rationale.** That rationale is that the audit runs after `beta.1` "so
  its inputs exist": stranger issues, the friction log, and Topo's docs-effectiveness signal. The
  reason recorded is therefore that those inputs are corrections to individual claims, which a
  maintained ledger absorbs one row at a time as they arrive, whereas an unbuilt ledger leaves every
  claim unverified until then and leaves the rewrite unable to start at all; and that a
  post-`beta.1` harvest would in any case have its `read`-tier sources invalidated wholesale by
  polish-C's renames. The recorded reason must engage the inputs argument, not merely restate the
  polish-C ordering, which is what revision 1 did.
- The row's status as a blocking gate before `1.0.0` is restated, not dropped.
- The overrule is filed as a row in `docs/internal/engine-rulings.md`, which is where this repository
  records a ruling that reverses a ratified position, and `check:rulings-format` is green.
- **`ROADMAP.md` carries the registry lifecycle's stage-close trigger as a standing item**, in the
  tier where it bites, which is the tier the five stages sit in. The item states the trigger, not the
  action: **the close of every stage runs a tuning checkpoint, whose registry review is its first
  part**, recorded in `docs/internal/page-types.md` with its rulings in
  `docs/internal/page-type-rulings.md` and its one-page record at
  `docs/internal/record/docs-rebuild/stage-<n>-tuning.md`. It names the other three triggers and
  points at the spec's registry lifecycle for their bounds and at the spec's Implementation section
  for the checkpoint's definition. It is a standing item, so it is not marked done by this pass.
- **`ROADMAP.md` carries the five stages as the initiative's live work**, in order, each with the
  single line naming what makes that track hard to write well, and states that **a stage's plan is
  authored only after the previous stage's tuning checkpoint**. No stage carries a ceiling in the
  roadmap, since a ceiling for an unauthored plan is a phantom.
- No item this plan shipped is still listed in a live ROADMAP tier.

### Task T1: The baseline record

**Conductor task.** **Chain:** R. **Depends on:** R1. **Deliverables:** 1.

**Files:** Create `docs/internal/record/docs-rebuild/baseline.md`. Modify
`docs/internal/record/docs-rebuild/README.md` (tick its row).

**Interfaces:**
- Produces: the baseline every stage measures its pages against, and the instantiated measure set and
  lever map the spec's "Gauging and iterating" subsection defines.
- Consumes: `demonstration-cost.md`, `demonstration-review.md`, the coverage-diff report, D3's
  reader-test findings, and `preflight.md`'s `## Questions` section. The conductor supplies the token
  and sitting figures, which an implementer cannot observe.

**Steps:**
- [ ] **Step 1:** fill the per-page measure set for `docs/extend/add-a-custom-admin-screen.md` from
  the artifacts above, one row. The `questions asked` figure is the count of `preflight.md`'s
  `## Questions` lines that concern this page or its chain, rolled up rather than re-derived.
- [ ] **Step 2:** copy the lever map from the spec's subsection into the file as the standing table,
  and record which lever, if any, this one page's numbers would have pulled.
- [ ] **Step 3:** `check:docs`, `check:arm-indexes`; commit.

**Acceptance criteria:**
- The file carries one row for the demonstration page with **every measure the spec's subsection
  names**: loops to first accept, reviewer misses by cause (template, subject, register),
  coverage-diff misses against the ledger, questions anyone had to ask about the page, the
  reader-test outcome, and the tokens and owner sittings the page cost.
- Every number is sourced to the artifact it came from, named by path. A number that could not be
  measured is recorded as not measured with the reason, never estimated.
- The lever map is present in full, and the file states that a stage record confirms or refutes the
  prediction attached to each pull.
- The file states the stop rules verbatim from the spec: **the tooling counts as tuned when a stage's
  pages accept in one loop at or under this baseline's miss rate**, and **a stage is re-run rather
  than tuned when its coverage diff shows the harvest lost facts**, the stated threshold being any
  `unverified` claim that reached a published page.
- It states plainly that a baseline of one page of one type on one track is thin, and that stage one
  replaces it as the comparison for stage two.

**Notes:** this is the pass's only measurement artifact, and every stage's record is read against it.
Write the numbers even where they look bad; the trend is the signal.

### Task T2: The tuning checkpoint

**Conductor task.** **Chain:** R. **Depends on:** T1. **Deliverables:** 4.

**Files:** Create `docs/internal/record/docs-rebuild/stage-0-tuning.md`. Modify
`docs/internal/record/docs-rebuild/ledger-schema.md`, `docs/internal/templates/brief-schema.md` and
`scripts/checks/brief.schema.json`, `docs/internal/templates/` (the templates the evidence revises),
`docs/internal/page-types.md`, `docs/internal/page-type-rulings.md`, and `.vale.ini` or
`.markdownlint-cli2.yaml` where a threshold changes.

**Interfaces:**
- Produces: the amended tooling stage one is authored against, and the record that says what changed
  and why.
- Consumes: `baseline.md`; the spec's "The tuning checkpoint" and "Gauging and iterating"
  subsections, which are the definition this task executes.

**Steps:**
- [ ] **Step 1:** run the checkpoint's seven parts in the order the spec states them.
- [ ] **Step 2:** write `stage-0-tuning.md` in the stage-record format, with the per-page table
  beside the baseline, the lever pulled with its reason, and the prediction stage one's record
  confirms or refutes.
- [ ] **Step 3:** re-run the `check:fact-coverage` calibration over the demonstration page and record
  whether the token classes held.
- [ ] **Step 4:** run the full gate; commit.

**Gate:** `npm run check && npx vitest run scripts/checks && npm run check:docs &&
npm run check:vale && npm run lint:markdown && npm run check:ledger && npm run check:provenance &&
npm run check:rulings-format`.

**Acceptance criteria:**
- **Every one of the checkpoint's seven parts is addressed in the record**, and a part with nothing
  to change says so with its evidence, never by omission.
- Each schema amendment carries a **migration note** stating what earlier ledgers or briefs now lack
  and whether they are backfilled or left as they are. The only earlier ledger is
  `extend-facts.md`, so the note says which of its entries need re-derivation at the extend stage.
- Each revised template names the finding that revised it, and each unrevised template is recorded as
  unrevised with the count that left it alone.
- Each threshold or Vale rule change carries the count that justified it: a rule that fired only on
  true findings may tighten, and a rule whose findings were overridden every time loosens or comes
  out.
- The record is named `stage-0-tuning.md`, since this pass is the stage-zero baseline in the same
  series the five stages continue, and its header says so.
- Every gate above exits 0 after the amendments, so the amended tooling is proved before stage one
  inherits it.
- The record carries the prediction explicitly, in the form "if this pull was right, stage one's
  record shows X".

**Notes:** the deliverable count is four because two schemas, the templates, and the record are four
artifacts; the registry review's rows are D3's deliverable, not this task's. The reconciliation
table's rollup writes to `docs/internal/page-types.md` and `docs/internal/page-type-rulings.md`
(the questions log and the reviewer misses, rolled up from T1's baseline) are part of the record
artifact, not a fifth: they land in the same commit as `stage-0-tuning.md` and record the same
checkpoint. If the evidence would pull more than four levers, the conductor pulls the two with the
strongest counts and records the rest as candidates for stage one's checkpoint.

### Task R2: STATUS, HISTORY, ROADMAP, CHANGELOG, the friction log, and the register

**Chain:** R. **Depends on:** T2. **Deliverables:** 4.

**Files:** Modify `docs/STATUS.md`, `docs/HISTORY.md`, `ROADMAP.md`, `CHANGELOG.md`,
`docs/internal/docs-friction-log.md`, `docs/internal/docs-register.md`.

**Acceptance criteria:**
- `docs/internal/docs-register.md` records the standard, points at the spec, and names the gate
  estate: `markdownlint-cli2` with its five cairn custom rules, the Vale rule set, and the four
  scripts `check:provenance`, `check:prose-read`, `check:ledger`, and `check:fact-coverage`. It
  records that `check:fact-coverage` is a harvest tool and not a CI gate, with the reason, and that
  the spec's five-script table is superseded by this shape with its reason.
- It records that the registry is nine types, that decision 2 settled it on 2026-09-08, and that the
  registry is maintained on outcome from here. It names the two lifecycle records,
  `docs/internal/page-types.md` and `docs/internal/page-type-rulings.md`, and the **four** review
  triggers, and it records D3's first review and its ruling.
- **The register records the measurement system in one paragraph**: the baseline at
  `docs/internal/record/docs-rebuild/baseline.md`, the per-stage records at
  `stage-<n>-tuning.md`, and the rule that the registry's per-type numbers are drawn from those stage
  records rather than counted a second time. It points at the spec's "Gauging and iterating"
  subsection for the measure set, the lever map, and the stop rules, and restates none of them.
- `ROADMAP.md` carries the docs standard as an Active initiative with **the five stages named in
  order**, and states that each stage's plan is authored after the previous stage's checkpoint.
- `CHANGELOG.md` gains one entry under `## Unreleased` with no `Consumers must:` line for the
  engine's public surface, **and one line noting that `docs/extend/add-a-custom-admin-screen.md` was
  rebuilt with a changed anchor set**, since that page ships in the tarball and cairn.pub renders it
  from its installed engine version. `package.json`'s version is untouched and `check:version` is
  green.
- `docs/internal/docs-friction-log.md` is triaged for entries this standard resolves: each is fixed
  and deleted, promoted to the ROADMAP tier where it bites, or deleted as no longer true. No entry is
  left with an unchanged status.
- `docs/STATUS.md` is present tense only, at most 60 lines, and **its next action is authoring stage
  one, the reference rewrite**, against the tooling T2 amended. It names the four remaining stages in
  order and carries no ceiling for any of them. Anything historical this pass produced is in
  `docs/HISTORY.md`.
- `docs/HISTORY.md` gains one entry naming what landed, what the gate caught, and what a stage would
  be wrong to rediscover from scratch, **including the baseline's numbers**, which are the thing a
  later stage most needs and would otherwise re-measure.

### Task R3: The hand-off manifest

**Chain:** R. **Depends on:** R2. **Deliverables:** 2.

**Files:** Create `docs/internal/record/docs-rebuild/hand-off.md`. Modify
`docs/internal/record/docs-rebuild/README.md` (tick the last rows).

**Acceptance criteria:**
- `hand-off.md` lists the artifacts stage one is authored against, with a verified path each. **The
  five ledgers and the page-type assignment for un-harvested tracks are not on this list**, because
  this pass does not produce them; each stage harvests its own track. The list is:
  1. `docs/internal/corpus/` and its manifest, approval column filled, every one of the nine types
     covered.
  2. `docs/internal/templates/`, nine templates, each heading marked required or optional, **as T2
     amended them**, plus the registry's two lifecycle records with the first review's rows and
     ruling in them.
  3. The brief schema, `scripts/checks/brief.mjs`, and one worked brief, **as T2 amended them**.
  4. The ledger schema at `docs/internal/record/docs-rebuild/ledger-schema.md`, **as T2 amended it**,
     with its migration note, plus `check:fact-coverage` and the extend ledger's one page as the
     worked example a stage's harvest copies.
  5. The gate estate: `markdownlint-cli2` with its cairn rules, the Vale rule set, and the four
     scripts, wired into `package.json` and CI, **each with its scope and the named stage that
     removes each override**. `check:fact-coverage` is listed with its scope recorded as "harvest
     tool, not wired to CI, run per track inside each stage's harvest gate", so the hand-off does not
     assert a scope it does not have.
  6. The Vale rules with their golden fixtures, verified on 3.15.1 in CI.
  7. The drafting-dispatch fragment.
  8. The demonstration page's measured cost at
     `docs/internal/record/docs-rebuild/demonstration-cost.md`.
  9. The baseline at `docs/internal/record/docs-rebuild/baseline.md` and the tuning record at
     `docs/internal/record/docs-rebuild/stage-0-tuning.md`, which carry the measure set, the lever
     map, the stop rules, and the prediction stage one's record confirms or refutes.
- Each item is verified by a command whose output the task pastes, not asserted.
- **The file states what each stage hands the next**, in one line: its track's ledger, its tuning
  record, and the amended ledger and brief schemas. A stage's plan is authored against those three
  and against this hand-off, never against this hand-off alone.
- **The page-type assignment is listed as partial**, with the count of assigned and unassigned rows,
  so no stage plan reads it as complete.
- **The cairn.pub consultation is recorded as owed now, not at the first stage's merge.** This
  pass rebuilds a published page whose anchor set changed, and cairn.pub renders the doc arms from
  its installed engine version, so a rename or removal breaks its navigation at the next pin bump.

## Pass-end ritual (cairn-pass; not a numbered task)

Code-simplifier over the four new scripts, the five markdownlint rules, and the parser; the reviewer
fan-out: `prose-voice-reviewer` over the rebuilt demonstration page and the register section,
`cairn-register-editor` over the register section, `diff-reviewer` per task inside the chains as
usual. The gates by name: `lint:markdown`, `check:docs-standard-globs`, `check:vale`,
`check:vale-fixtures`, `check:provenance`, `check:prose-read`, `check:ledger`, `check:fact-coverage`,
plus the repository's own `check:docs`, `check:reference`, `check:reference:signatures`,
`check:snippets`, `check:transcripts`, `check:symbols`, `check:editor-quotes`, `check:arm-indexes`,
`check:visuals`, `check:package`, `check:readiness`, `npm run check`
(`check:figures` lands with the extend stage, not this pass),
`npx vitest run scripts/checks`, and the full `npm test`. Both budgets scored: tokens against the
**4.75M** ceiling, and attended time as planning misses plus execution sittings, the two owner
sittings counting as two. **The scored numbers go into `baseline.md` as well as into the
post-mortem**, since the initiative's measurement system reads them. STATUS, HISTORY, ROADMAP,
CHANGELOG per R2. The post-mortem lives here beside the plan. The `cairn-*` memories refreshed. Push,
one pull request per chain, merge on green CI. **Stage one's plan is authored only after the owner's
demonstration read and T2's checkpoint**, against the tooling T2 amended.

## What this pass hands forward

- **The five stages** (unit 5 plus unit 1's four remaining track harvests), listed below.
- **The glob overrides**, each naming the stage that removes it. The fifth stage's closing criterion
  is that `.markdownlint-cli2.yaml` and `.vale.ini` carry no relaxation override for a published
  path.
- **The cairn.pub consultation**, owed now (R3).
- **The registry gaps** P2 opened under "types the registry may lack": a glossary, a migration
  guide, a release-notes page, or an FAQ may have no type. The escape is a brief-recorded deviation
  naming the nearest type, pending an owner-approved registry addition with its exemplar. Each such
  brief is a review trigger under the registry lifecycle, and every stage closes with a registry
  review inside its tuning checkpoint.
- **Plan one's own follow-ups**, if the Claude infrastructure pass left any.
- **Release:** the window holds. This pass does not bump or publish.

---

## Stages that follow

Five stages, each **one pass** with its own plan document, worktree, pull request, and ceiling.
**A stage's plan is authored only after the previous stage's tuning checkpoint**, against the tooling
that checkpoint amended. The order is by **difficulty of writing the track well**, easiest first,
because the system is tuned as it is used and a wrong ledger field or a bad template should surface on
the track that can absorb it.

| Stage | Track | Pages | Why it sits here |
|---|---|---|---|
| 1 | reference | 24 (`docs/reference/` less its `README.md`) | Easiest to write: the shape is fixed by `check:reference` and `check:reference:signatures`, the prose is a sentence or two per entry, and the pages are edited in place, so the stage proves the harvest and the brief on real pages with the writing risk at its lowest. |
| 2 | extend | 30 (`docs/extend/` less its `README.md`) | The developer register the drafter is most fluent in, and the facts are heavily gated by `check:snippets` and `check:reference:signatures`, so a claim that drifts fails a test rather than reaching a reader. |
| 3 | admin | 8 (`docs/admin/` less its `README.md`) | An operator reader sits between the developer and the editor, so the register shifts without leaving familiar ground, and the transcripts are fixture-gated by `check:transcripts`. |
| 4 | editors | 7 (`docs/editors/` less its `README.md`) | Hardest to write: a non-technical reader, the Microsoft register, and plain-language demands the gates see only partly, so the reader test is the real judge rather than a check. |
| 5 | front door | 7 (`docs/README.md`, `docs/why-cairn.md`, the root `README.md`, and the four track `README.md` files) | Last: this is the page set whose rejection produced the initiative, under the strictest register ruling, with every claim traced to the owner brief. It meets the system after four stages of tuning. |

The five partition the 76 published pages with no page in two stages and none in none. `docs/extend/add-a-custom-admin-screen.md` is rebuilt in this pass and re-derived at stage 2.

**Every stage runs the same seven steps, in this order:**

1. **Harvest the track** into `docs/internal/record/docs-rebuild/<track>-facts.md`, against the
   ledger schema as the previous stage's checkpoint amended it. Task shape: one task per page group,
   **bounded at roughly 12,000 source words**, each group named page by page in the plan so the
   partition is reproducible. Each task's criteria are the ones this plan's harvest tasks carried:
   every page in the group has entries, an anchor map, and the six keep classes; no `claim` value
   appears as a substring of its source page; every sweep finding `preflight.md` maps to the track is
   recorded with its proving source and the superseded note; every fenced block a repository gate
   replays has a `kind: block` entry; `check:fact-coverage -- --track <track>` exits 0 over the whole
   track at the last task. The harvest also **fills the track's rows in
   `docs/internal/record/docs-rebuild/page-types.md`** and appends to its "types the registry may
   lack" section. **A page any pass edited since 2a is harvested as it now stands**, at the stage's
   own sha, which is how the identity-seam and chassis passes' edits and polish-C's renames are
   re-derived rather than tracked.
2. **The owner's unverified-claim rulings for that track**, one sitting, batched with that stage's
   other owner items. The rows are extracted with `check:ledger -- --json`, never by reading the
   ledger end to end, each carrying what would prove it and the conductor's recommendation of true,
   aspirational, or comes out.
3. **Rewrite the track's pages from briefs against the ledger**, under the quarantine, one section
   per read, with the outline reviewed before any prose. Reference entries are edited in place, the
   one exception, and each reference brief records the exception with its reason.
4. **The coverage diff per page**, run by a separate agent, never the drafter, against the track's
   ledger, with every reported miss restored or recorded in the brief's `deviations`.
5. **The fresh review**, a different context and a different model family from the drafter, naming
   the corpus entry it graded against and carrying the measurement table.
6. **The reader test for that stage's pages**, per the allocation below.
7. **The tuning checkpoint**, defined once in the spec's Implementation section
   (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`, "The tuning checkpoint" and
   "Gauging and iterating"). Its record is
   `docs/internal/record/docs-rebuild/stage-<n>-tuning.md`. This plan does not restate the
   definition, so there is one copy to amend.

**The nine reader-test sittings (decision 4), allocated.** One is spent here, on the demonstration
page. The remaining eight go where the reader is furthest from the writer and where a gate sees least:
**editors 3, front door 3, extend 1, admin 1, reference 0.** Reference gets none because its entries
are edited in place under a shape the signature gate already fixes, and decision 9 names the front
door and the task guides as what the reader test is for. A stage that wants a sitting it was not
allocated takes it from a later stage's allocation and records the trade in its tuning record; the
total stays nine.

**What each stage hands the next:** its track's ledger, its tuning record, and the amended ledger and
brief schemas. Plus this pass's hand-off manifest, which every stage reads.

---

## Review disposition

What each of the six reviews' findings became. A finding not applied is listed with its reason.

**Applied.** Benchmark: the gate consolidation onto `markdownlint-cli2` and Vale (1, 2, 7, 14, 15);
the golden-form fixture harness (4); the `Microsoft.SentenceLength` override and the resolved
paragraph hedge (3); the `yaml` package plus a schema check (5); the `files` negation and the `check:package`
assertion (6); the corpus reference-only default and every licensing rule (9, 10); the hinged-pair
column dropped (11); decision 2's review scheduled in D3, now the registry lifecycle's first review (12); the warning report step (13); the
lychee weekly action with a rolling issue (16); the errata-ai citation correction (17); the "no
change needed" items kept as written (18). Sequencing: the amendment as a precondition (1); `npm run
check` is not a composite (2); anchor-plus-claim re-resolution and the reflow disables (3); the
substrate commit before P1 (4); P1 demoted to one stop (5); chain H split (6); the Reconciliation
table corrected and the stubs (7); the half-landed-state scoping and the cairn.pub consultation owed
here (8); the named cut point and one ceiling (9); the ROADMAP overrule's reason and the
engine-rulings row (10); re-derivation as a P1 criterion (11); every smaller correction (12).
Charter: the tell-scanner step cut and the routine moved in-repo (1); `ParagraphBounds` to warning
(2); `check:fact-coverage` unwired and token-matched (3); the verb lexicon dropped (4); the
eleven-to-twelve straddle cut (6, and the registry cut to nine by owner decision 2 on 2026-09-08);
G2-7's block folded into P1's stop and the task moved last (8);
the PDF vendoring cut (9); the plan-lint cut (11); markdownlint scoped rather than cleared (12);
C5 batched into a single sitting with the other mid-sitting items (13); R2's hand-off split into R3.
Coverage: the spec amendment (1, and the companion edit); the quality checklist (2); paragraph
variance as a reported measure (3); the two-entry comparison (4); the hand-off scope wording (5); the
plan-lint cut (6); the no-self-naming and nine-item rules (7); every reconciled number, the six keep
classes, the five tiers, the 1a/1b supersession, and the page-types disclosure (8). Plannability and
executor: the per-chain gate and the conductor pre-tasks; the two-run split for owner blocks; the
conductor's pre-fetch; the `measure-prose.mjs` export; the fact-coverage calibration and `--page`
flag; named harvest partitions, which the stages now carry; the C1 link repair; the scope file deleted; conductor tasks for subagent
dispatch and token accounting; the worktree install step; the sweep id mapping; the sha rule; the
deliverable-counting rule; the G2-6 rebase step; every pointer and wording correction.

**Not applied:**

- **Charter 5, twelve page types collapsed to eight. Superseded 2026-09-08, and now applied in
  part.** Owner decision 2 cut the registry to nine: the internal proposal type is dropped, since
  internal planning documents are not graded, and the condition entry and the symptom row fold into
  the reference entry as section shapes. The finding's direction was right and its number was not
  the lever; the count follows from the test that a registry entry is a whole-page shape with a
  published exemplar. The field comparison the charter and benchmark reviews supplied is recorded in
  the spec's resolution. From here the count is maintained on outcome rather than argued, and D3 runs
  the first review.
- **Charter 7, merge G1 and G2 into one chain.** The two chains stay separate. The five contended
  file groups the merge would remove are already removed another way: P creates every shared stub,
  the scope file is gone, and `.markdownlint-cli2.yaml` and `.vale.ini` are each written by one chain
  only. What remains is `package.json` and one CI job, both stubbed and both positional.
- **Charter 10, harvest reference at reduced granularity.** Reference stays at full granularity. The
  bound applied instead is source words per task, which is what made revision 1's reference tasks
  unexecutable. Reduced granularity would also weaken `check:provenance` on the track whose in-place
  edits the reference stage still has to prove.
- **Charter 14, defer `check:prose-read` to the rewrite.** It stays here, in the decided
  pull-request-artifact-plus-ledger-row form. D3 needs the row and the shape, and a gate whose first
  real assertion is one row is still the gate the stages' 76 rows accumulate into.
- **Benchmark 8's second half, rewriting the markdown substrate onto `Intl.Segmenter` and an mdast
  AST.** Only the first half is applied: `measure-prose.mjs` exports one splitter and every consumer
  imports it. Replacing the splitter would move every measured corpus number mid-initiative, and the
  five regex strippers the finding objects to are now three, since two of the scripts became linter
  rules that parse the markdown once inside the runner.
- **Plannability's suggestion to renumber `docs-sweep.md`.** P1 records the mapping once instead,
  since renumbering a committed sweep would invalidate every citation of it in the other review
  records.
- **Ruling E's "one owner sitting".** Two sittings, because the corpus approval must precede the
  demonstration draft and the demonstration read must follow it. Everything that can batch does.

## What the 2026-09-08 restructure changed

The owner's direction dissolved pass 2b and moved the harvest into the per-track stages, so the docs
system is tuned as it is used: a wrong ledger field or a bad template is found after one small track
rather than after all five. What moved, and where:

- **H-A's three tasks and H-B's eleven** become each stage's harvest, task-shaped the same way and
  bounded the same way, against the schema the previous checkpoint amended.
- **H12, the unverified list and its sitting**, becomes one owner sitting inside each stage, batched
  with that stage's other owner items. **What is genuinely lost is the cross-track ordering**: H12
  ranked every unverified claim across all five ledgers by how much a reader would act on its
  falseness, and five per-track lists cannot reproduce that ranking. The mitigation is that the
  ordering was a convenience for one sitting, not an artifact anything downstream reads.
- **G2-10, `check:figures`' seven assertions**, moves to the extend stage, the first stage with a
  figure to grade, unless the assertions land on `main` earlier for another reason.
- **Chain R's records tasks** run at this pass's close for its own records, and again at every stage
  close.
- **P1's finding map** now maps each sweep finding to its page and track rather than to a harvest
  task, since the harvest tasks live in plans nobody has authored.
- **P2 assigns a type only to the demonstration page**, and each stage assigns its own track's, so
  no type is fixed before the registry it comes from has been tuned.
- **The hand-off list drops the five ledgers and the full page-type assignment**, and gains the
  demonstration page's measured cost, the baseline, the tuning record, and the amended schemas.
- **The registry lifecycle gains a fourth trigger**, the close of every stage.
