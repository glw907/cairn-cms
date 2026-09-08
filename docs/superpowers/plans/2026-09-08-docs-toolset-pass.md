# Docs Standard, Plan Two of Three: the toolset and the harvest

> **Plan two of three; plan one is the Claude infrastructure pass, which lands first.** Plan one
> is the owner's dotfiles and poplar pass carrying spec unit 3c: the workstation setup and the
> tellgrader docs-register profile. Unit 3c and its chain are removed from this plan entirely.
> Plan three is the docs rewrite, spec unit 5.
>
> **REVISION 2, authored 2026-09-08** against spec revision 3
> (`docs/superpowers/specs/2026-09-08-docs-standard-design.md`) and the six adversarial reviews of
> revision 1 under `docs/internal/record/2026-09-08-polish-inputs/` (`plan2-review-coverage.md`,
> `-plannability.md`, `-executor.md`, `-sequencing.md`, `-charter.md`, `-benchmark.md`). What each
> finding became is recorded in "Review disposition" at the end of this document.
>
> **For agentic workers:** execute through the `cairn-pass` skill's implementer chain
> (`cairn-implementer` -> `diff-reviewer` -> gate), workflow mode via
> `~/.claude/workflows/pass-execute-chains.js`. The plan runs as **two workflow invocations** with
> one owner sitting between them, because the workflow has no wait primitive. Chain P and every
> task marked **conductor task** run in the main loop, not under the workflow. Steps use checkbox
> syntax for tracking.

**Goal:** hand plan three, the docs rewrite, the nine artifacts it cannot be authored without: five
fact ledgers, a page type for every published page, an approved corpus, twelve templates, a brief
schema with a parser, the gate estate with its path scopes, Vale rules with must-fire fixtures, a
drafting-dispatch fragment, and one page rebuilt end to end with its measured cost.

**Architecture:** one preflight that builds every shared substrate before any fork, then four
concurrent producers, one consumer, and a records chain. P verifies the sequencing preconditions,
re-derives the published-page set, and commits every file two chains would otherwise both create.
H harvests every published page's checkable claims into five ledgers under
`docs/internal/record/docs-rebuild/`; after its third task it splits into H-A (admin, editors,
front door) and H-B (extend, reference). C assembles the corpus the reviews grade against. G1
builds the structure spine: the twelve templates and the markdownlint-cli2 runner that carries
anatomy, heading order, the front-door and index shapes, brief presence, and the alt-text hole. G2
builds the prose and receipt spine: the Vale rule set with its golden fixtures, `check:provenance`,
`check:prose-read`, `check:ledger`, the quality checklist, and the figure assertions. D rebuilds
`docs/extend/add-a-custom-admin-screen.md` through the whole chain and measures what one page
costs. Unit 3c is plan one's and is not built here; unit 5, the rewrite, is plan three.

**Tech stack:** `markdownlint-cli2` (MIT) with cairn custom rules as the docs linter runner; Vale
3.15.1 (the CI pin) for prose and heading rules; Node ESM scripts under `scripts/checks/` with
co-located vitest specs for the four gates no linter can carry; the `yaml` package already in `dependencies` for the brief parser.

**Spec:** `docs/superpowers/specs/2026-09-08-docs-standard-design.md` (revision 3, units 1, 2,
3a, 3b, and 4; unit 3c belongs to plan one). Inputs: `docs/internal/record/2026-09-08-polish-inputs/`,
above all `docs-spec-review-plannability.md`, `front-door-author-brief.md`,
`front-door-net-failure.md`, `docs-sweep.md`, and `exports-sweep.md`.

**Token ceiling: 6.5M**, recomputed from the revised chains. The consolidation onto
`markdownlint-cli2` and Vale removes two bespoke scripts, a verb lexicon, an explainer page, and
roughly forty fixtures; the corpus defaults to reference-only, which removes most of the licensing
work; the reference and extend harvests are split by source-word budget rather than by halves,
which raises the task count and lowers the per-task waste. Per chain: P 0.30M, H run one 0.35M,
C 0.45M, G1 1.00M, G2 1.50M, D 0.45M, H-A 0.45M, H-B 1.60M, H12 0.10M, R 0.20M. That sums to
6.40M against the 6.5M ceiling, leaving 0.10M slack. **The cut point is named: run one is plan 2a,
run two is plan 2b.** If the ceiling binds, 2b is the half that leaves, because 2a already produces
every gate, the corpus, the templates, and the measured per-page cost.

**Checkpoint interval:** four tasks per chain, three in H-B. At each checkpoint the conductor
writes STATUS (task ledger, decisions taken, spend against the ceiling, next task). At 80 percent
of 6.5M the conductor finishes the running task in every chain, writes STATUS, and asks one
combined question.

## The two runs

The workflow has no wait primitive, so a task that stops for the owner ends its chain for that
invocation. The plan therefore runs as two invocations with one owner sitting between them.

**Run one (plan 2a, about 3.8M):** P (main loop), then chains C (C1 through C4), G1 (all six), G2
(G2-1 through G2-9), and H (H1 through H3) concurrently, then D1 and D2 as conductor tasks after
those chains merge.

**The mid sitting (owner).** One batched sitting carrying C5's corpus approval, the CLAUDE.md line
displacement owed from plan one, and ratification of the provisional corpus approval D1 ran against
(C5's notes).

**Run two (plan 2b, about 2.6M):** chains H-A and H-B concurrently, then H12 (conductor task),
G2-10 once the figures substrate is committed, then D3 and chain R.

**The closing sitting (owner).** H12's unverified rulings, D3's reader test, and the demonstration
read, presented together.

Two owner sittings, not one. The ruling asked for one; H12's input is the whole harvest and the
whole harvest is run two, so H12 cannot be presented at the mid sitting. The plan records that
rather than pretending otherwise. Everything that can batch does: C5 and the CLAUDE.md displacement
at the mid sitting, H12 and D3 at the closing one.

## Ruled inputs (recorded; no task re-derives them)

- **Owner decisions 1 through 7 are accepted as the spec's recommendations state them.** Length
  rules warn permanently with no promotion path (decision 1). **The registry is twelve page types
  from task P2 onward**; the eleven-then-twelve straddle is deleted, because a plan-internal split
  guarded only by prose is the weakest form of a watch item and nothing detects a violation. The
  receipt is a pull-request artifact plus one ledger row per page, never a per-page committed file
  with a content hash (decision 3). The reader test runs on nine pages in plan three, one of which
  is the demonstration page here (decision 4). The `ROADMAP.md` claims-verification row is absorbed
  and its after-`beta.1` sequencing overruled, with the overrule recorded (decision 5). No rendered
  docs preview is added (decision 6). The new scanner measures live in the workstation's tellgrader
  behind a docs-register profile, so they are plan one's work (decision 7). **Decision 2's own
  review, "review after the demonstration page shows what a template costs", is scheduled as an
  explicit owner question in D3's report.**
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
  which matters here (markdownlint) and matters more in plan three, where every page moves.
  **Markdownlint's reflowing rules are disabled on the harvested published pages until plan
  three**, per glob, each disable naming the track plan that removes it.
- **Unit 3c is plan one's, and this plan consumes it rather than building it.** cairn's chain grades
  a task by `git diff` plus `npm test` and neither reaches `~/.claude/`, `~/.dotfiles/`, or
  `~/Projects/poplar/`. **P1 records what plan one landed and what it did not; a missing plan-one
  output degrades a named criterion and never stops the pass.** Nothing in this plan mechanically
  consumes the Vale hook or the two skills, and the tell scanner is not invoked from CI at all in
  this revision.
- **Polish-C gates chain H alone.** Its renames invalidate ledger entries in exactly the class the
  ledger exists to guarantee. That is true of the harvest and false of the corpus, the templates,
  the linter config, and the prose rules, all of which work against fixtures. P1 records the
  polish-C state; **H1 stops chain H if polish-C has not merged**, and C, G1, and G2 branch either
  way.
- **The one true pass stop is the figures substrate.** `check:figures`, `scripts/figures/`,
  `docs/internal/site-figures.*`, and `docs/extend/assets/` are uncommitted working-tree state
  today, and `docs/extend` is in `package.json`'s `files` array, so that commit changes the
  published-page count every chain derives from and the `package.json` and `test.yml` baseline every
  G task edits. **The owner commits it before P1**, with the two writer-facing `assets/*.md` files
  moved to `docs/internal/figures/` per polish-D's pre-dispatch. P1 verifies and stops the pass if
  it has not happened.
- **Polish-B's prose findings are authoritative ledger input, not edits to run.** The findings in
  `docs/internal/record/2026-09-08-polish-inputs/docs-sweep.md` are numbered **1 through 30 with no
  prefix**; `F7` through `F10` live in **`exports-sweep.md`**, not the docs sweep. P1 re-resolves
  every finding number against merged `main`, records which polish-B already applied as edits, and
  writes the finding-to-harvest-task map that H-A and H-B read. A finding that no longer resolves is
  reported, never silently dropped.
- **A published page is never a proving source.** That circularity is what let the front door assert
  a workflow that never happened. The verdict tiers are **five**: `gate`, `read`, `owner`,
  `unverified`, and `retired`. Revision 1 said four in eight places and then used a fifth;
  `retired` is a tombstone tier for an entry whose claim left the corpus. An `unverified` entry must
  not enter any brief.
- **Ids never appear in published markdown.** The brief file carries them.
- **Six keep classes, not the spec's "five".** The spec's unit 1 says "five further entry classes"
  and then lists six bullets. This plan resolves the arithmetic upward to six and records the
  correction here rather than leaving it undisclosed.
- **The page-type assignment lives in `page-types.md`, not in the ledger.** The spec's unit 1
  acceptance criterion 5 says the ledger records it. The ledger is per track and the assignment is
  one table over all 76 pages, so the assignment is one file. Recorded as a deliberate change.
- **The published-page set is defined once, in P1, and is 76 today.** Nine admin, eight editors,
  thirty-one extend, twenty-five reference, and three front door (`docs/README.md`,
  `docs/why-cairn.md`, and the root `README.md`). `CHANGELOG.md` and `skills/*.md` ship in the
  tarball and are **not** published documentation pages; P1 states that exclusion. Every later task
  reads P1's number and no task re-derives it.
- **The spec's own 1a/1b split is superseded.** The spec's Implementation section shapes plan one as
  two concurrently launched documents. This is one document with several chains, which is the shape
  `pass-execute-chains` takes. The companion edit to the spec records that.
- **Release:** no version bump, no publish. The window holds and `CHANGELOG.md` gains one entry
  under `## Unreleased`.

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
  | H, H-A, H-B | `npm run check:ledger && npx vitest run scripts/checks` |
  | C | `npm run check:docs` |
  | G1, G2 | `npm run check && npx vitest run scripts/checks && npm run check:docs && npm run check:vale` |

  Chain H's gate is real in run two, where `check:ledger` has merged. In run one, H1 through H3 run
  concurrently with G2-8, so their gate is `npm run check:docs`, and the conductor runs
  `check:ledger` over their output at the run-one join, where D2 performs the first real run anyway.
  D and R run in the main loop and name their own gates on the task.
- **Every new unit test is co-located at `scripts/checks/<name>.test.ts`**, and P4 adds
  `scripts/checks/**/*.test.ts` to the vitest `unit` project's `include`. That is what makes
  `npx vitest run scripts/checks` resolve to anything.
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

## Conductor pre-tasks (before P1 dispatches)

None of these is a numbered task; all run in the main loop and are recorded in `preflight.md`.

1. **The owner commits the figures substrate** (`package.json`, `.github/workflows/test.yml`,
   `scripts/figures/`, `docs/internal/site-figures.{md,svg}`, `docs/extend/assets/` with the two
   writer-facing `.md` files moved to `docs/internal/figures/`). This is the pass's one hard stop.
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
5. **Calibrate `check:fact-coverage`** after H1 merges and before H-A dispatches: run its `--report`
   mode over one admin page and one reference page and record the token count per page in
   `preflight.md`. If a reference page yields more than roughly 200 tokens, the token classes or the
   granularity rule change before fourteen harvest tasks build on them.
6. **Confirm the local `vale --version`** and record the disposition beside the CI pin.
7. **Pre-extract the spec's twelve section orders and its brief field table** into the scratchpad,
   so G1-2 through G1-4 and P3 do not each scan a 1,065-line spec to find them.

## Reconciliation (contended resources)

Corrected from the tasks' own Files lists. Whichever chain merges second rebases, and the conductor
performs the reconciliation after the first merge lands, never a task. **P creates a stub of every
file two chains would otherwise both create**, which converts each add/add conflict into an
ordinary line merge.

| File | Chains that write it | Reconciliation |
|---|---|---|
| `package.json` (`scripts` only) | H1, G1-5, G2-2, G2-4, G2-5, G2-7, G2-8, G2-10 | Three-way with the owner's figures line, which lands before P1. Each chain appends its own script lines adjacent to its own block; the conductor reconciles at each merge. |
| `package.json` (`files`, `devDependencies`) | P3, P4, G1-5 | P3 adds the `!docs/**/*.brief.yml` negation; G1-5 adds `markdownlint-cli2`. Positional. |
| `.github/workflows/test.yml` | G1-5, G2-4, G2-9 | P4 creates the empty `docs-gates` job with a named anchor comment; each task appends its own step block inside it. |
| `.markdownlint-cli2.yaml` | G1-5, G1-6 | Same chain, sequential. P4 stubs it. |
| `.vale.ini` | G2-2, G2-3, G2-4 | Same chain, sequential. |
| `docs/internal/record/docs-rebuild/README.md` | P, H, H-A, H-B, D, R, G2-7 | P1 creates it with one pre-written unchecked row per artifact. A task ticks its own row rather than appending, so several worktrees do not append to one table. |
| `docs/internal/docs-register.md` | G2-1, G2-9, G2-10, R2 | R2 runs after every chain merges and writes the standard's section whole. |
| `docs/STATUS.md` | R2 only, plus the conductor's checkpoint writes on `main` | The conductor never edits STATUS from inside a worktree. |
| `ROADMAP.md`, `CHANGELOG.md`, `docs/HISTORY.md` | R1 (the ROADMAP row), R2 (the rest) | No contention. |
| `docs/internal/record/docs-rebuild/*-facts.md` | H, H-A, H-B | Each ledger file is chain-private. `extend-facts.md` is appended by H2 then H-B1 through H-B4 in sequence; `reference-facts.md` by H-B5 through H-B11 in sequence. Positional. |
| `docs/internal/corpus/manifest.md` | C1 through C5 | One chain, sequential. |

Merge order: **P, then C, G1, G2, H in any order, then D, then R.** G1 merges before G2 by default,
since G1-5 creates the `.markdownlint-cli2.yaml` that G1-6 and the register both cite. **G2-6 and
G2-8 take a rebase on merged `main` as their step 0**, since both consume a file chain H or chain P
produced.

---

## Chain P: the preflight and the shared substrate

Four tasks, in the main loop on `main`, before any chain branches. Every cross-chain edge revision 1
carried is resolved here by moving the shared file into P, so all four producers branch from common
ground.

**Gate for every P task:** `npm run check:docs && npm run check:arm-indexes`, plus
`npx vitest run scripts/checks` from P3 onward.

### Task P1: Verify the preconditions and re-derive the baseline

**Chain:** P. **Depends on:** nothing. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/record/docs-rebuild/README.md` (the directory's arm index, one pre-written
  row per artifact this plan produces, each unchecked),
  `docs/internal/record/docs-rebuild/preflight.md`
- Modify: `docs/internal/README.md` (the record arm's index line, if `check:arm-indexes` requires
  one)

**Interfaces:**
- Produces: `preflight.md`, the verified baseline every chain's `read`-tier citation resolves
  against: the `main` sha, the published-page set and its count, the polish-C result, the plan-one
  result, and the sweep finding map.
- Consumes: the polish spec's rename table; `docs-sweep.md`; `exports-sweep.md`.

**Steps:**
- [ ] **Step 1:** verify the figures substrate is committed to `main`. **If it is not, stop the pass
  and report the block.** This is the plan's one hard stop.
- [ ] **Step 2:** record the polish-C state: whether its `Consumers must:` list is in `CHANGELOG.md`
  and whether the ten renames in the polish spec's table resolve to their new names in `src/lib/`.
  Record the result; do not stop the pass. H1 carries the block for chain H.
- [ ] **Step 3:** record plan one's three consumed outputs as present or absent, each with the
  command or path that proved it, and name the criterion each absence degrades. Do not stop the
  pass.
- [ ] **Step 4:** re-derive the published-page set and count; re-resolve every `docs-sweep.md`
  finding number and every `exports-sweep.md` `F` number this plan cites, and write the
  finding-to-harvest-task map; record the `main` sha; commit.

**Acceptance criteria:**
- `preflight.md` states the published-page definition once, as the four track directories plus
  `docs/README.md`, `docs/why-cairn.md`, and the root `README.md`, and states plainly that
  `CHANGELOG.md` and `skills/*.md` ship in the tarball and are not published documentation pages. It
  records the per-track counts and the total. The total is 76 today; a different number is reported,
  not corrected to match this plan.
- It records the `main` sha. Every later `read`-tier `source` in every ledger cites that sha, not a
  worktree HEAD, and `preflight.md` says so in those words.
- It records the polish-C verification result and the plan-one verification result, each with the
  command run and its output pasted, since a verification recorded as prose is one `diff-reviewer`
  cannot confirm. A verification recorded as assumed rather than run fails this task.
- It carries a table mapping every `docs-sweep.md` finding (1 through 30, no prefix) and every
  `exports-sweep.md` finding (F7 through F10) to the harvest task that consumes it, with **every
  finding assigned**. Revision 1 left findings 16 and 21 unassigned. A finding polish-B already
  applied as an edit is marked applied, with its page.
- It records the current value of `package.json`'s `check` script verbatim, so no later task assumes
  a composite, and records the four plan-one outputs P1 does not verify (the output style, the voice
  files, the review agents, and the global `CLAUDE.md`) as plan one's own record's to carry.
- `docs/internal/record/docs-rebuild/README.md` carries one unchecked row per artifact, so later
  tasks tick rather than append.
- No file outside this repository is modified, and the report says so.

**Notes:** this is the one task that can stop the whole pass, and it stops on one thing only. It is
cheap and it runs alone.

### Task P2: The ledger schema and the page-type assignment

**Chain:** P. **Depends on:** P1. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/ledger-schema.md`,
  `docs/internal/record/docs-rebuild/page-types.md`
- Modify: `docs/internal/record/docs-rebuild/README.md` (tick two rows)

**Interfaces:**
- Produces: `ledger-schema.md`, read by every harvest task, by `check:fact-coverage` (H1), and by
  `check:ledger` (G2-8). Revision 1 left this in chain H and made it the one declared cross-chain
  edge; in P it is not a cross-chain edge at all. `page-types.md`, hand-off artifact 2, read by
  G1-1's registry table and by plan three's brief authoring.
- Consumes: the spec's unit 1 section and its registry table; `docs-sweep.md`.

**Steps:**
- [ ] **Step 1:** write `ledger-schema.md` with an example row for each shape it fixes.
- [ ] **Step 2:** enumerate the published set from `preflight.md`'s definition and assign a type to
  each page from the twelve canonical ids, with a one-line reason naming the reader's job.
- [ ] **Step 3:** `check:docs`, `check:arm-indexes`; commit.

**Acceptance criteria (schema):**
- The entry shape is a markdown table with these columns, in this order: `id`, `claim` (a normalized
  proposition under fifteen words, never a lifted sentence), `tokens` (the literal fact tokens the
  entry covers, comma separated), `page` (the published path), `anchor` (the heading slug the claim
  sits under), `line` (advisory, at the preflight sha), `tier` (one of `gate`, `read`, `owner`,
  `unverified`, `retired`), `source` (for `gate`, the gate or fixture name; for `read`, a
  `file:line` plus the preflight sha; for `owner`, the brief file and its line; for `unverified` and
  `retired`, empty), and `note`.
- **The schema states that re-resolution is by `anchor` plus `claim`, and that `line` is advisory.**
  A reflow of the page must not invalidate an entry. The schema states the reason: this plan reflows
  pages and plan three moves every page.
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
  `retired`, and named as the artifact plan three repairs inbound links from.
- The five ledger paths are `docs/internal/record/docs-rebuild/<track>-facts.md` and carry no date.

**Acceptance criteria (page types):**
- One row per published page: `path`, `track`, `type`, `reason`. The count is stated in the first
  line and equals `preflight.md`'s number.
- Every `type` is one of the twelve canonical ids: `task-guide`, `tutorial-milestone`, `concept`,
  `architecture-overview`, `reference-entry`, `reference-table`, `condition-entry`, `symptom-row`,
  `index`, `front-door-evaluator`, `front-door-track-index`, `proposal`.
- `docs/why-cairn.md` and the root `README.md` are `front-door-evaluator`; `docs/README.md` and the
  four track `README.md` files are `front-door-track-index`.
- Every `track` is one of `admin`, `editors`, `extend`, `reference`, `front-door`, and `front-door`
  is exactly `docs/README.md`, `docs/why-cairn.md`, and the root `README.md`. A track README stays
  in its own track.
- A closing section, "types the registry may lack", lists every page whose type has no exemplar in
  the spec's registry, with the nearest type named. That section is input to R2 and to decision 2's
  review in D3, not a blocker.

**Notes:** the type ids here and G1-1's registry table are one interface. G1-1 grades against this
file, which exists on `main` before G1 branches.

### Task P3: The brief schema, the parser, and the packaging negation

**Chain:** P. **Depends on:** P2. **Deliverables:** 4.

**Files:**
- Create: `docs/internal/templates/brief-schema.md`, `scripts/checks/brief.mjs`,
  `scripts/checks/brief.schema.json`,
  `scripts/checks/fixtures/docs-standard/brief-valid.yml`,
  `scripts/checks/fixtures/docs-standard/brief-invalid.yml`,
  `scripts/checks/brief.test.ts`, `.tellgrader.json`
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
- [ ] **Step 3:** write `brief-schema.md` and cairn's `.tellgrader.json`; commit.

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
- `type` is one of the twelve canonical ids; `track` one of the five; `exemplar` a path or URL;
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
- `.tellgrader.json` is committed at the repository root with exactly
  `{"profile":"docs-register","include":["docs/**"],"exclude":["docs/internal/**","docs/superpowers/**"]}`.
- `npx vitest run scripts/checks` and `npm run check:package` are green.

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

## Chain H: the harvest spine (unit 1, run one)

Three tasks. Produces the harvest tool, the demonstration page's ledger, and the drafting-dispatch
fragment.

### Task H1: `check:fact-coverage`, the harvest-time tool

**Chain:** H. **Depends on:** P4. **Deliverables:** 3. **Chain-stopping:** polish-C.

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
- [ ] **Step 1:** re-verify polish-C has merged. **If it has not, stop the chain and report the
  block.** Record the branch-point `main` sha beside `preflight.md`'s.
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
- A missing ledger file for a requested track is an error, not a pass.
- **The script's header states that it is not a CI gate and why**: it is a completeness instrument
  for a harvest task working the uncovered-token list, and standing it up over 76 pages would push
  entries toward satisfying the extractor. `grep` proves it appears in no `test.yml` step.
- The script asserts the ledger's header row against `ledger-schema.md`'s stated column set and
  fails on a mismatch, so the chain that mutates the schema is the chain that detects the mutation.

### Task H2: Harvest the demonstration page

**Chain:** H. **Depends on:** H1. **Deliverables:** 2.

**Files:**
- Create: `docs/internal/record/docs-rebuild/extend-facts.md` (this page's entries only; H-B1
  through H-B4 append)
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
  H-A and H-B use the corrected schema.
- Every `read`-tier `source` cites `preflight.md`'s sha, not a worktree HEAD.

**Notes:** this task exists to break the schema before fourteen more harvest tasks build on it. An
implementer that finds nothing to correct says so explicitly in its report.

### Task H3: The drafting-dispatch fragment

**Chain:** H. **Depends on:** H2. **Deliverables:** 1.

**Files:**
- Create: `docs/internal/record/docs-rebuild/drafting-dispatch.md`

**Interfaces:**
- Produces: the checked-in prompt block plan three's drafting dispatches inherit verbatim. Hand-off
  artifact 8. Consumed by D1 in run one, which is why this task sits in run one rather than after
  the full harvest.
- Consumes: `ledger-schema.md`; the spec's quarantine rule.

**Steps:**
- [ ] **Step 1:** write the fragment: the quarantine sentence, the readable-file list, the
  one-section-per-read protocol, and the dispatch-id recording rule; commit.

**Acceptance criteria:**
- The fragment states, as an instruction to a drafting agent: do not open the page you replace; read
  only the track ledger, `page-types.md`, the page type's template, the named corpus entry, and the
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

## Chain H-A: the harvest, admin and editors and the front door (run two)

Three tasks, one ledger file each, each bounded well inside the roughly 12,000-word budget. Each
harvests one page per read, ids continuing monotonically, closing every uncovered token with
`check:fact-coverage`.

### Task H-A1: Harvest the admin track

**Chain:** H-A. **Depends on:** H2. **Deliverables:** 1.

**Files:** Create `docs/internal/record/docs-rebuild/admin-facts.md`.

**Source:** the nine pages under `docs/admin/`, 11,448 words.

**Acceptance criteria:**
- `check:fact-coverage -- --track admin` exits 0.
- Every one of the nine pages has entries, an anchor map, and the six keep classes.
- `docs/admin/create-your-site.md` and `docs/admin/is-it-working.md` each carry a `kind: block`
  entry for every transcript block `check:transcripts`' `PAGE_FLOORS` map requires, with the fixture
  path under `packages/create-cairn-site/test/fixtures/transcripts/` named.
- Every sweep finding `preflight.md` maps to this track is recorded as the true claim with its
  proving source, and the old page's claim carries `superseded by <id>` in its `note`. A finding
  `preflight.md` marks already applied by polish-B is recorded as applied, not re-recorded as
  superseded.
- No `unverified` entry lacks a one-line statement of what would prove it.

### Task H-A2: Harvest the editors track

**Chain:** H-A. **Depends on:** H-A1. **Deliverables:** 1.

**Files:** Create `docs/internal/record/docs-rebuild/editors-facts.md`.

**Source:** the eight pages under `docs/editors/`, 6,767 words.

**Acceptance criteria:**
- `check:fact-coverage -- --track editors` exits 0.
- The reader-tested editor glosses keep class is populated for this track specifically: every
  banned-vocabulary substitution the track carries is an entry, since the substitution is the thing
  a fresh drafter would lose.
- Every `check:editor-quotes` assertion that keys off a page has a `kind: block` entry.
- Every one of the eight pages has entries, an anchor map, and the six keep classes.

### Task H-A3: Harvest the front door

**Chain:** H-A. **Depends on:** H-A2. **Deliverables:** 1.

**Files:** Create `docs/internal/record/docs-rebuild/front-door-facts.md`.

**Source:** `docs/README.md`, `docs/why-cairn.md`, and the root `README.md`, 1,965 words.

**Acceptance criteria:**
- `check:fact-coverage -- --track front-door` exits 0.
- Every claim about the owner or about cairn's stance carries the `owner` tier and cites a line in
  `front-door-author-brief.md`, or carries `unverified`. No such claim carries `read` or `gate`.
- The ratified specimens keep class carries the why-cairn opener verbatim, since the owner approved
  that sentence.
- The deliberate omissions keep class carries the vendor-link rule.
- The rejected draft's editors-emailing-the-owner story is recorded as an `unverified` entry whose
  note states that it resolves to no line in the author brief. **That entry is the fixture G2-6
  reproduces.** Revision 1 pointed at G2-5.

**Notes:** the two current front-door pages are the pages whose rejection produced this initiative.
Harvest what is true, not what reads well.

---

## Chain H-B: the harvest, extend and reference (run two)

Eleven tasks, split by source-word budget rather than by halves, so no task exceeds one context
window. Revision 1's reference harvest asked one dispatch to read 51,403 words, hold the schema,
hold seven sweep findings, and drive a gate to zero, at "Deliverables: 1". Every group below is
named page by page, so the partition is reproducible and "every page in this group has entries" is
checkable; revision 1's "the first half of the track, in path order" fixed no boundary.

Each task appends to its track's ledger in sequence, so the append is positional and no
reconciliation is needed. Ids continue monotonically with no gap and no reuse. Each task closes
every uncovered token with `check:fact-coverage -- --track <track>` scoped to its own pages, and
each track's final task runs it over the whole track.

**Every task in this chain carries the same four criteria**, plus its own below: every page in the
group has entries, an anchor map, and the six keep classes; no `claim` value appears as a substring
of its source page; every sweep finding `preflight.md` maps to a page in the group is recorded with
its proving source and the superseded note; every fenced block a repository gate replays has a
`kind: block` entry. **Deliverables: 1** each.

| Task | Pages | Words |
|---|---|---|
| H-B1 | `add-an-island`, `add-a-second-audience`, `add-cairn-to-a-sveltekit-app`, `announce-on-publish`, `architecture`, `auth-channel-security-model`, `build-a-site-by-hand`, `choose-an-ai-posture`, `configure-rendering`, `content-model` | 12,237 |
| H-B2 | `data-tiers`, `debug-your-site`, `declare-your-own-concept`, `define-an-adapter-and-schema`, `design-your-site`, `enable-tidy`, `link-content-with-references`, `migrate-existing-content`, `migration-notes` | 10,858 |
| H-B3 | `organize-your-admin-nav`, `README`, `render-safety`, `restrict-admin-access`, `reuse-content-across-entries`, `rotate-the-github-app-key`, `share-a-draft-preview` | 7,292 |
| H-B4 | `security-model`, `upgrade-cairn`, `what-the-scaffold-wrote`, `wire-the-delivery-surface` | 7,471 |
| H-B5 | `admin-grammar-tokens`, `admin-routes`, `admin-toolkit` | 11,062 |
| H-B6 | `ambient`, `auth-channel`, `auth-crypto`, `auth-store`, `cli-cairn-manifest`, `cli-cairn-media-seed`, `cloudflare` | 8,743 |
| H-B7 | `cairn-audit`, `islands`, `media`, `README`, `render`, `vite` | 11,081 |
| H-B8 | `components`, `delivery`, `delivery-data` | 12,624 |
| H-B9 | `core`, `doctor` | 12,868 |
| H-B10 | `log-events`, `reproductions`, `supported-toolchain` | 8,035 |
| H-B11 | `sveltekit` | 20,865 |

H-B1 through H-B4 are `docs/extend/` and append to `extend-facts.md`, which H2 created;
`add-a-custom-admin-screen.md` is H2's and appears in no group. H-B5 through H-B11 are
`docs/reference/` and append to `reference-facts.md`, which H-B5 creates. Task dependencies are
strictly sequential within the chain: H-B1 depends on H2, and each later task on the one before.

**Task-specific criteria:**

- **H-B1:** `docs/extend/architecture.md`'s figure, its alt text, its caption, and its text
  alternative are recorded as keep-class entries, since the ownership map moves onto this page in
  plan three. Every recipe page's code fences that `check:snippets` compiles have `kind: block`
  entries. The Vale suppression keep class carries, for each suppression, the comment that states
  why it is right.
- **H-B4:** `check:fact-coverage -- --track extend` exits 0 over the whole track, and every page
  under `docs/extend/` appears in `page-types.md` and carries at least one entry.
- **H-B5:** creates `reference-facts.md`. Every signature block `check:reference:signatures` asserts
  is a `kind: block` entry carrying the signature verbatim.
- **H-B7:** every export name in `docs/internal/api-surface.md` that this group's pages document
  resolves to at least one `gate`-tier entry naming `check:reference` or
  `check:reference:signatures`.
- **H-B10:** every `## Types` section the `check:reference` change in polish-B's task 5 asserts is
  recorded as a keep-class deviation or a structural entry, so plan three's in-place edits do not
  drop it. The `exports-sweep.md` findings F7 through F10 are consumed here.
- **H-B11:** `docs/reference/sveltekit.md` alone is 20,865 words and is the one group over the
  12,000-word budget, because it is one file. If the implementer's report says the page exceeded its
  context, the conductor splits it at its top-level headings and re-dispatches; that escalation is
  expected and is not a failure. `check:fact-coverage -- --track reference` exits 0 over the whole
  track at the end of this task, and every page under `docs/reference/` appears in `page-types.md`
  and carries at least one entry.

**Notes:** reference pages are edited in place in plan three rather than rebuilt, so their ledgers
serve `check:provenance` and the coverage diff rather than a fresh draft. Harvest them at the same
granularity anyway; the provenance gate reads the same ledger either way.

---

## Task H12: The unverified list and the closing owner sitting

**Conductor task**, run in the main loop after H-A and H-B merge. **Depends on:** H-A3, H-B4,
H-B11. **Deliverables:** 2. **Owner-blocked** at step 3.

**Files:**
- Create: `docs/internal/record/docs-rebuild/unverified.md`
- Modify: the five `*-facts.md` files (tier changes the owner rules; nothing else)

**Interfaces:**
- Produces: `unverified.md`, one row per `unverified` entry: `id`, `claim`, `page`, `what would
  prove it`, `recommendation`, `owner ruling`.
- Consumes: all five ledgers, read through `check:ledger --json` rather than by reading the files.

**Steps:**
- [ ] **Step 1:** extract every `unverified` row across the five ledgers with
  `npm run check:ledger -- --json`, grouped by track and ordered by how much a reader would act on
  the claim's falseness. **Extract with the script, never by reading five ledgers covering 76
  pages**, which does not fit one context.
- [ ] **Step 2:** for each, state in one line what would prove it and what the conductor recommends:
  true, aspirational, or comes out.
- [ ] **Step 3:** **present the list to the owner as one combined question, batched with D3's reader
  test and the demonstration read.** Do not guess a ruling.
- [ ] **Step 4:** apply each ruling: a claim ruled true gets its tier and proving source; a claim
  ruled aspirational or out keeps `unverified` with the ruling in its note.
- [ ] **Step 5:** `check:fact-coverage` over every track; `check:ledger`; commit.

**Gate:** `npm run check:ledger && npm run check:fact-coverage && npm run check:docs`.

**Acceptance criteria:**
- Every `unverified` entry in every ledger appears exactly once in `unverified.md`.
- Every row carries a "what would prove it" line and the conductor's recommendation before the
  sitting.
- After the sitting, every row carries an owner ruling, and every entry the owner ruled true has
  moved to `gate`, `read`, or `owner` with its proving source recorded.
- No entry the owner ruled aspirational or out has changed tier.
- `check:fact-coverage` exits 0 over all five tracks and `check:ledger` exits 0.

**Notes:** this is the front-door failure generalized to 76 pages, and it is the highest-value
attended sitting in the initiative. Batch it whole; do not ask about entries one at a time.

---

## Chain C: the corpus (unit 2, run one)

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
  `docs/internal/corpus/proposal-go-monotonic-time.md`,
  `docs/internal/corpus/proposal-kep-node-swap.md`
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
  reports, never a recorded manifest figure plan three drafts against.
- `mode` is one of `reference-only`, `excerpt`, or `structure-only`, and the manifest states what
  each means in a line above the table. **`reference-only` is the default and `excerpt` is the
  exception**, taken only where the license permits redistribution and where a side-by-side read
  genuinely needs the text. The manifest states the reason and cites the Google style guide, the
  standard every published page is graded under, which says to paraphrase and link rather than copy.
- The entry id format holds for all three migrated samples: the SQLite entry's type is
  `front-door-evaluator` and its file is therefore `front-door-evaluator-sqlite-scope.md`. Revision
  1 fixed the id as `<type-id>-<source-slug>` and then named the file `concept-sqlite-scope.md`, and
  `corpus_entry` is a brief field, so the format is load-bearing.
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

### Task C2: Corpus entries for the first six page types

**Chain:** C. **Depends on:** C1. **Deliverables:** 1.

**Files:**
- Create: one or two entries under `docs/internal/corpus/` for each of `task-guide`,
  `tutorial-milestone`, `concept`, `architecture-overview`, `reference-entry`, `reference-table`
- Modify: `docs/internal/corpus/manifest.md`

**Steps:**
- [ ] **Step 1:** for each candidate, read the conductor's local capture and its license capture;
  write a `reference-only` entry by default.
- [ ] **Step 2:** commit an excerpt only where the license permits redistribution and a side-by-side
  read needs the text, with the reason stated in the entry's `## Source`; add the manifest rows;
  `check:docs`; commit.

**Acceptance criteria:**
- Each of the six types has at least one entry and at most two.
- Every entry's `mode` is `reference-only` unless its `## Source` states both the permitting license
  and the reason a side-by-side read needs the text.
- **No Stripe excerpt is committed.** Stripe is the `reference-table` exemplar and its Services
  Agreement reserves all rights in the documentation, so the entry is `reference-only` and the
  manifest names Stripe as the worked case, so no later implementer reaches for fair use.
- **DigitalOcean is `reference-only` unless the license is verified from the page itself.**
  Secondary sources report CC BY-NC-SA 4.0; if the non-commercial term is correct it bars the use
  outright.
- Every share-alike source (GitLab docs, CC BY-SA 4.0; Mozilla SUMO, version unverified) carries a
  `note` flagging it and is quoted byte for byte or is `reference-only`.
- Every `reference-table` entry is `structure-only`, and the manifest's legend states that a review
  of such a page compares column order, row completeness, and the lead sentence rather than cadence.
- Every entry's `license` cell names a specific license or the words "no redistribution grant"; none
  is empty. Verified clean for a 400-word attributed excerpt: SQLite (public domain), Kubernetes and
  Cloudflare docs and GitHub Docs content (CC BY 4.0), Go proposals (BSD-3-Clause), Kubernetes KEPs
  (Apache-2.0).
- No committed excerpt exceeds 400 words before `## Source`.

### Task C3: Corpus entries for the remaining six page types

**Chain:** C. **Depends on:** C2. **Deliverables:** 1.

**Files:**
- Create: entries for `condition-entry`, `symptom-row`, `index`, `front-door-evaluator` (the SQLite
  entry already serves; a second is optional), `front-door-track-index`, `proposal` (the two design
  documents already serve), plus the hand-picked second editors entry
- Modify: `docs/internal/corpus/manifest.md`

**Steps:**
- [ ] **Step 1:** write each entry from the conductor's local captures; the second editors entry is
  the one the conductor selected by hand, and its selection reasoning goes in its `## Source`.
- [ ] **Step 2:** manifest rows; `check:docs`; commit.

**Acceptance criteria:**
- All twelve type ids appear in the manifest's `page type` column, each with at least one row.
- The editors track has two entries, one of them the hand-picked one, and its `## Source` states why
  an automated fetch was not used (the Mozilla support articles block automated reads).
- `condition-entry` and `symptom-row` have distinct entries; a single Cloudflare error table serving
  both is recorded as two rows with different scopes or one row plus a `structure-only` row, and the
  choice is stated.
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
- Every one of the twelve type ids still has at least one approved or `reference-only` entry after
  the deletions. If a deletion leaves a type uncovered, the task reports the gap rather than
  substituting a replacement without approval.
- **The `task-guide` entry D1 drafted against is either ratified or replaced.** If replaced, D2's
  one redraft round re-runs against the ratified entry and the report says so.

**Notes:** D1 and D2 run at the end of run one, before this sitting, so the one `task-guide` entry
they need carries `provisional <date>` in the `approved` column, written by the conductor at D1's
dispatch and recorded in `preflight.md`. G1-6's brief-presence rule treats `provisional` as
unapproved for every page except the demonstration page, which is named in a glob override with this
task as its remover. The spec suggests a time-boxed default-to-accept window, since an unapproved
entry blocks work rather than protecting anything. Offer it in the same question; do not assume it.

---

## Chain G1: the structure spine (unit 3a, run one)

Six tasks.

### Task G1-1: The marker syntax, the registry table, and the index template

**Chain:** G1. **Depends on:** P4. **Deliverables:** 3.

**Files:**
- Create: `docs/internal/templates/index.md`
- Modify: `docs/internal/templates/README.md` (the marker syntax and the twelve-row registry table;
  P4 created the file)

**Acceptance criteria:**
- The registry table has twelve rows, one per canonical type id, each naming the reader's job it
  serves and its exemplars. **The type ids match `docs/internal/record/docs-rebuild/page-types.md`
  exactly, checked by name.** That file is on `main` before this chain branches, so the check is
  runnable here; revision 1 asked a G1 task to grade against a chain-H file its worktree did not
  contain.
- The marker syntax for required-or-optional headings is stated once, in one fixed form, and is
  identical across all twelve templates.
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
  the spec's twelve section orders is the task's input**, so the implementer does not scan a
  1,065-line spec to find them.
- Every heading line carries G1-1's required-or-optional marker.
- A word ceiling appears where the spec states one: task guide under 800 words, concept under 1,500,
  recorded as advisory, since length rules warn and never gate.

### Task G1-3: Templates for the four reference and condition types

**Chain:** G1. **Depends on:** G1-2. **Deliverables:** 4.

**Files:** Create `docs/internal/templates/reference-entry.md`, `reference-table.md`,
`condition-entry.md`, `symptom-row.md`.

**Acceptance criteria:**
- Reference entry carries its ten sections, reference table its three; condition entry and symptom
  row carry the spec's orders.
- **The reference-entry template is derived from the shape `check:reference` and
  `check:reference:signatures` already fix**, and its header states which script fixes which part,
  so the template is not a second copy that drifts.
- Every heading carries G1-1's marker.

### Task G1-4: Templates for the front door and the proposal

**Chain:** G1. **Depends on:** G1-3. **Deliverables:** 3.

**Files:** Create `docs/internal/templates/front-door-evaluator.md`, `front-door-track-index.md`,
`proposal.md`.

**Acceptance criteria:**
- `front-door-evaluator.md` carries the spec's eight-section front-door order and is the template
  for `docs/why-cairn.md` and the root `README.md`.
- `front-door-track-index.md` carries a routing order satisfying the register's
  five-routes-in-the-first-screenful requirement, and its header names the register rule it answers.
  It is the template for `docs/README.md` and the four track READMEs.
- `proposal.md` carries the eleven-section proposal order and is marked internal: the type stays
  outside the Vale gates and its template governs shape rather than prose.
- Twelve templates now exist, one per canonical type id, and the registry table's twelve rows
  resolve to twelve files.

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
  case off the shelf, one chain earlier than G2-10, and G2-10 therefore spends nothing on it.
- `MD044 proper-names` carries cairn's product-name allowlist, and the config's comment states which
  of `MD044` and `.vale.ini`'s `Vocab = Cairn` owns a name, so the two lists are not maintained
  twice.
- **Reflowing rules are disabled on the harvested published pages** through glob overrides, each
  naming the plan-three track plan that removes it. The disable's comment states the reason: a
  reflow moves a page's lines and the ledgers record a `line`.
- **In-scope paths at the end of this task are `docs/internal/**` and the demonstration page only.**
  Every other published path carries a glob override relaxing the new rules, each naming its
  plan-three track plan as remover. This task clears nothing beyond that scope; plan three's track
  plans widen it as each track is rebuilt. Revision 1's "clear or scope every existing violation"
  over 76 pages was the largest unsized item in the plan.
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

---

## Chain G2: the prose, provenance, and receipt spine (unit 3b)

Ten tasks. G2-1 through G2-9 run in run one; **G2-10 is run two and is last in the chain**, so an
owner block on the figures substrate defers nothing. Revision 1 placed the figures task seventh of
eight, which deferred the CI wiring and transitively stopped chain D.

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
- Fixtures also exist for the five Cairn rules that already ship (Announcement, ContrastFrame,
  Marketing, TwoHeadedHeading, VirtueClaims), in the same golden form.

### Task G2-3: Clear the seventeen headings and promote `Google.Headings`

**Chain:** G2. **Depends on:** G2-2. **Deliverables:** 2.

**Files:** Modify `.vale.ini` (the `Google.Headings` level), and the published pages carrying the
findings.

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
  report so H-A and H-B harvest against the post-clearing state. This task runs in run one, before
  H-A and H-B branch, which is why the ordering holds.

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
  it nowhere, so plan three's reviewers would have cited a document that did not exist.
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
  data, which is what H12 extracts the unverified rows with rather than reading five ledgers.
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
  harvested yet, so it is green in run one before H-A and H-B exist.
- `--json` emits every entry with its tier, which H12's extraction depends on.
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

### Task G2-10: `check:figures`, the seven assertions

**Chain:** G2, **run two**, last in the chain. **Depends on:** G2-9. **Deliverables:** 3.

**Files:**
- Modify: `scripts/figures/` (the seven assertions), `docs/internal/docs-register.md` (the figure
  section), `package.json` if the figure script's flags change
- Create: `scripts/checks/fixtures/docs-standard/figures/` (one fixture per assertion, pass and
  fail), `scripts/checks/check-figures.test.ts`

**Acceptance criteria:**
- `check:figures` runs seven mechanical assertions, each named in the script's header and each with a
  fixture that fires and a fixture that passes: every figure has a committed source; every figure has
  a committed generating script; the rendered output is not stale against its source; every figure
  has alt text; every figure has a caption paragraph; every figure has a text alternative reachable
  from the page; and no third figure tool is used beyond mermaid in the page and hand-authored SVG.
- **The `check:visuals` alt hole is not touched here.** MD045 closed it in G1-5, one chain earlier.
- The register gains the two figure tests as a person's checks beside the seven mechanical
  assertions: the test for a figure that should not be there (remove it; if the text still makes the
  point without a new sentence, it was decoration) and the test for a figure that is missing (a
  paragraph carrying containment words, direction words, or a branch is the text alternative of a
  diagram nobody drew). The register also states the two-lane routing rule, mermaid in the page by
  default and hand-authored SVG as the exception, with no third tool.
- The re-verification of spec decisions 5, 5a, and 6 against merged `main` is recorded in the task's
  report, and any decision that changed is recorded in R2.
- Every fixture runs in the unit test.

---

## Chain D: the demonstration page (unit 4)

Three tasks, all **conductor tasks** in the main loop, because each dispatches a subagent or stops
for the owner and `cairn-implementer` has no `Agent` tool. D1 and D2 close run one; D3 is run two.

### Task D1: The brief, the outline, and the quarantined draft

**Conductor task.** **Depends on:** H2, H3, C4, G1-6, G2-9. **Deliverables:** 3.

**Files:**
- Create: `docs/extend/add-a-custom-admin-screen.brief.yml`
- Modify: `docs/extend/add-a-custom-admin-screen.md` (rebuilt, not edited),
  `docs/internal/corpus/manifest.md` (the provisional mark)

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
  drafter, for the coverage diff against the extend ledger. One redraft round at most; a second fix
  verdict goes to the owner.
- [ ] **Step 4:** run `check:ledger` over every ledger that exists, its first real run; commit.

**Gate:** `npm run check && npx vitest run scripts/checks && npm run check:docs &&
npm run check:vale && npm run lint:markdown && npm run check:provenance && npm run check:ledger`.

**Acceptance criteria:**
- Every named gate exits 0 on the page. **`check:figures` is not among them**, since G2-10 is run
  two; D3 re-runs the page's gates after it merges.
- `check:provenance` passes with every sentence classified and every cited id resolving; no sentence
  carries `no-claim` while stating a checkable proposition, which the reviewer's report addresses
  explicitly.
- The reviewer's report names the corpus entry it graded against and carries the measurement table:
  sentence count, average length, longest sentence, short-sentence share, and paragraph counts, each
  beside the corpus entry's number. **Where the brief names two entries, the report grades against
  the closer of the two and names both**, which is the spec's rule and P3's schema field. The
  hinged-pair share is reported here and is not a manifest column.
- The coverage diff's report lists every ledger entry for this page the drafted page dropped, and
  each is restored or recorded in the brief's `deviations` with a reason.
- The revision cap held: at most one redraft, and the report says how many rounds ran.
- The type ids in `page-types.md`, the template filenames, and the brief's `type` agree exactly.

### Task D3: The reader test, the receipt, the measured cost, and decision 2's review

**Conductor task**, run two. **Depends on:** D2, G2-10, H12. **Deliverables:** 4.
**Owner-blocked**: the reader test and the demonstration read are part of the closing sitting.

**Files:**
- Modify: `docs/internal/record/docs-rebuild/receipts.md` (the first row)
- Create: `docs/internal/record/docs-rebuild/demonstration-cost.md`

**Steps:**
- [ ] **Step 1:** re-run the page's full gate set now that `check:figures` has merged.
- [ ] **Step 2:** run the reader test: someone who is not the author does the task from the page, one
  sitting. Record every place the page was unclear.
- [ ] **Step 3:** write the receipt row and the comparison artifact, with the conductor supplying the
  token spend per step, which an implementer cannot observe.
- [ ] **Step 4:** present the rebuilt page beside the original to the owner, batched with H12's
  rulings. **The owner's read and approval to proceed is the plan's closing gate, not this task's
  criterion.**

**Gate:** `npm run check:prose-read && npm run check && npx vitest run scripts/checks &&
npm run check:figures`.

**Acceptance criteria:**
- `receipts.md` carries one row for `docs/extend/add-a-custom-admin-screen.md` with every column
  filled.
- `check:prose-read` exits 0 with the page in scope.
- `demonstration-cost.md` carries the rebuilt page beside the original, the token spend end to end
  broken down by step (brief, outline review, draft, gates, fresh reviewer, coverage diff, reader
  test), and the attended sitting count.
- The cost document states the per-page figure plan three multiplies, and names the pages it does not
  apply to: the reference entries, which are edited in place.
- The reader test's result is in the receipt row and its findings are listed in the cost document,
  whether or not they were folded.
- **The report carries decision 2's scheduled review as an explicit owner question**: the spec's
  decision row says "review after the demonstration page shows what a template costs", and the owner
  accepted the recommendations as written. The question states what twelve types cost, what eight
  would cost, and the field comparison: Kubernetes runs four content types over more than a thousand
  pages with no validator, and GitLab runs no page-type registry at all. R2 records the answer.
- The document does not assert the owner's approval. It states that the read is pending or records
  the date it happened.

---

## Chain R: records and the hand-off (run two)

Three tasks, last. **Gate:** `npm run check:docs && npm run check:vale &&
npm run check:rulings-format && npm run check:arm-indexes`.

### Task R1: The roadmap absorption

**Chain:** R. **Depends on:** D3. **Deliverables:** 2.

**Files:** Modify `ROADMAP.md` (the claims-verification row), `docs/internal/engine-rulings.md` (one
row).

**Interfaces:**
- Consumes: owner decision 5.
- Produces: the absorption and the recorded overrule.

**Notes:** **the polish-spec amendment is no longer R1's.** It is a precondition of the whole
initiative and lands as a dated amendment section in
`docs/superpowers/specs/2026-09-08-polish-passes-design.md` before polish-B's plan is authored.
Revision 1 had the last task of this plan writing instructions to passes that, by its own stated
ordering (A, B, D, C, then this plan), had already finished; polish-B would have folded its thirty
prose findings into the pages as edits and polish-D would have authored the front door, which is
exactly what the amendment exists to prevent, and which would have falsified H-A3's premise as well.

**Acceptance criteria:**
- `ROADMAP.md`'s docs claims-verification row is marked absorbed, names the five ledger files as
  where the sweep's output lives, and states plainly that **this harvest absorbs the
  extract-and-verify half and plan three absorbs the fold half**, since "absorbed by this harvest"
  overstates what merges here.
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
- No item this plan shipped is still listed in a live ROADMAP tier.

### Task R2: STATUS, HISTORY, ROADMAP, CHANGELOG, the friction log, and the register

**Chain:** R. **Depends on:** R1. **Deliverables:** 4.

**Files:** Modify `docs/STATUS.md`, `docs/HISTORY.md`, `ROADMAP.md`, `CHANGELOG.md`,
`docs/internal/docs-friction-log.md`, `docs/internal/docs-register.md`.

**Acceptance criteria:**
- `docs/internal/docs-register.md` records the standard, points at the spec, and names the gate
  estate: `markdownlint-cli2` with its five cairn custom rules, the Vale rule set, and the four
  scripts `check:provenance`, `check:prose-read`, `check:ledger`, and `check:fact-coverage`. It
  records that `check:fact-coverage` is a harvest tool and not a CI gate, with the reason, and that
  the spec's five-script table is superseded by this shape with its reason.
- It records decision 2's answer from D3's owner question, whether the registry stays at twelve or
  reduces.
- `ROADMAP.md` carries the docs standard as an Active initiative with plan three named.
- `CHANGELOG.md` gains one entry under `## Unreleased` with no `Consumers must:` line for the
  engine's public surface, **and one line noting that `docs/extend/add-a-custom-admin-screen.md` was
  rebuilt with a changed anchor set**, since that page ships in the tarball and cairn.pub renders it
  from its installed engine version. `package.json`'s version is untouched and `check:version` is
  green.
- `docs/internal/docs-friction-log.md` is triaged for entries this standard resolves: each is fixed
  and deleted, promoted to the ROADMAP tier where it bites, or deleted as no longer true. No entry is
  left with an unchanged status.
- `docs/STATUS.md` is present tense only, at most 60 lines, and **its next action is authoring plan
  three**. Revision 1 said plan two, which is this plan. Anything historical this plan produced is in
  `docs/HISTORY.md`.
- `docs/HISTORY.md` gains one entry naming what landed, what the gate caught, and what plan three
  would be wrong to rediscover from scratch.

### Task R3: The hand-off manifest

**Chain:** R. **Depends on:** R2. **Deliverables:** 2.

**Files:** Create `docs/internal/record/docs-rebuild/hand-off.md`. Modify
`docs/internal/record/docs-rebuild/README.md` (tick the last rows).

**Acceptance criteria:**
- `hand-off.md` lists all nine artifacts with a verified path each:
  1. The five ledgers at `docs/internal/record/docs-rebuild/<track>-facts.md`.
  2. The page-type assignment at `docs/internal/record/docs-rebuild/page-types.md`, covering every
     published page.
  3. `docs/internal/corpus/` and its manifest, approval column filled, every one of the twelve types
     covered.
  4. `docs/internal/templates/`, twelve templates, each heading marked required or optional.
  5. The brief schema, `scripts/checks/brief.mjs`, and one worked brief.
  6. The gate estate: `markdownlint-cli2` with its cairn rules, the Vale rule set, and the four
     scripts, wired into `package.json` and CI, **each with its scope and the named plan-three track
     plan that removes each override**. `check:fact-coverage` is listed with its scope recorded as
     "harvest tool, not wired to CI", so the hand-off does not assert a scope it does not have.
  7. The Vale rules with their golden fixtures, verified on 3.15.1 in CI.
  8. The drafting-dispatch fragment.
  9. The demonstration page's measured cost.
- Each of the nine is verified by a command whose output the task pastes, not asserted.
- **The cairn.pub consultation is recorded as owed now, not at plan three's first track merge.** This
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
`check:visuals`, `check:figures`, `check:package`, `check:readiness`, `npm run check`,
`npx vitest run scripts/checks`, and the full `npm test`. Both budgets scored: tokens against the
**6.5M** ceiling, and attended time as planning misses plus execution sittings, the two owner
sittings counting as two. STATUS, HISTORY, ROADMAP, CHANGELOG per R2. The post-mortem lives here
beside the plan. The `cairn-*` memories refreshed. Push, one pull request per chain, merge on green
CI. Plan three is authored only after the owner's demonstration read.

## What this pass hands forward

- **Plan three, the rewrite** (unit 5): four to five plan documents, one per track plus the front
  door, each with its own worktree, its own pull request, and its own ceiling, **re-sized from
  `demonstration-cost.md` rather than from the spec's estimate**. `docs/why-cairn.md` is its first
  page. Reference entries are edited in place, the one exception to the rebuild rule, and each
  reference brief records the exception with its reason.
- **The glob overrides**, each naming the plan-three track plan that removes it. Plan three's closing
  criterion is that `.markdownlint-cli2.yaml` and `.vale.ini` carry no relaxation override for a
  published path.
- **The cairn.pub consultation**, owed now (R3).
- **The registry gaps** P2 recorded under "types the registry may lack": a glossary, a migration
  guide, a release-notes page, or an FAQ has no type. The escape is a brief-recorded deviation naming
  the nearest type, pending an owner-approved registry addition with its exemplar. Decision 2's
  answer from D3 sits beside it.
- **Plan one's own follow-ups**, if the Claude infrastructure pass left any.
- **Release:** the window holds. This pass does not bump or publish.

---

## Review disposition

What each of the six reviews' findings became. A finding not applied is listed with its reason.

**Applied.** Benchmark: the gate consolidation onto `markdownlint-cli2` and Vale (1, 2, 7, 14, 15);
the golden-form fixture harness (4); the `Microsoft.SentenceLength` override and the resolved
paragraph hedge (3); the `yaml` package plus a schema check (5); the `files` negation and the `check:package`
assertion (6); the corpus reference-only default and every licensing rule (9, 10); the hinged-pair
column dropped (11); decision 2's review scheduled in D3 (12); the warning report step (13); the
lychee weekly action with a rolling issue (16); the errata-ai citation correction (17); the "no
change needed" items kept as written (18). Sequencing: the amendment as a precondition (1); `npm run
check` is not a composite (2); anchor-plus-claim re-resolution and the reflow disables (3); the
substrate commit before P1 (4); P1 demoted to one stop (5); chain H split (6); the Reconciliation
table corrected and the stubs (7); the half-landed-state scoping and the cairn.pub consultation owed
here (8); the named cut point and one ceiling (9); the ROADMAP overrule's reason and the
engine-rulings row (10); re-derivation as a P1 criterion (11); every smaller correction (12).
Charter: the tell-scanner step cut and the routine moved in-repo (1); `ParagraphBounds` to warning
(2); `check:fact-coverage` unwired and token-matched (3); the verb lexicon dropped (4); the
eleven-to-twelve straddle cut (6); G2-7's block folded into P1's stop and the task moved last (8);
the PDF vendoring cut (9); the plan-lint cut (11); markdownlint scoped rather than cleared (12);
C5 batched into a single sitting with the other mid-sitting items (13); R2's hand-off split into R3.
Coverage: the spec amendment (1, and the companion edit); the quality checklist (2); paragraph
variance as a reported measure (3); the two-entry comparison (4); the hand-off scope wording (5); the
plan-lint cut (6); the no-self-naming and nine-item rules (7); every reconciled number, the six keep
classes, the five tiers, the 1a/1b supersession, and the page-types disclosure (8). Plannability and
executor: the per-chain gate and the conductor pre-tasks; the two-run split for owner blocks; the
conductor's pre-fetch; the `measure-prose.mjs` export; the fact-coverage calibration and `--page`
flag; named H-B partitions; the C1 link repair; the scope file deleted; conductor tasks for subagent
dispatch and token accounting; the worktree install step; the sweep id mapping; the sha rule; the
deliverable-counting rule; the G2-6 rebase step; every pointer and wording correction.

**Not applied:**

- **Charter 5, twelve page types collapsed to eight.** The registry stays at twelve, fixed from P2
  onward. Decision 2's own scheduled review is the mechanism for answering this, and it is now
  scheduled (D3) with the field comparison the charter and benchmark reviews both supply. Deciding it
  here would pre-empt an owner decision the spec already reserves.
- **Charter 7, merge G1 and G2 into one chain.** The two chains stay separate. The five contended
  file groups the merge would remove are already removed another way: P creates every shared stub,
  the scope file is gone, and `.markdownlint-cli2.yaml` and `.vale.ini` are each written by one chain
  only. What remains is `package.json` and one CI job, both stubbed and both positional.
- **Charter 10, harvest reference at reduced granularity.** Reference stays at full granularity. The
  bound applied instead is source words per task, which is what made revision 1's reference tasks
  unexecutable. Reduced granularity would also weaken `check:provenance` on the track whose in-place
  edits plan three still has to prove.
- **Charter 14, defer `check:prose-read` to plan three.** It stays here, in the decided
  pull-request-artifact-plus-ledger-row form. D3 needs the row and the shape, and a gate whose first
  real assertion is one row is still the gate plan three's 76 rows accumulate into.
- **Benchmark 8's second half, rewriting the markdown substrate onto `Intl.Segmenter` and an mdast
  AST.** Only the first half is applied: `measure-prose.mjs` exports one splitter and every consumer
  imports it. Replacing the splitter would move every measured corpus number mid-initiative, and the
  five regex strippers the finding objects to are now three, since two of the scripts became linter
  rules that parse the markdown once inside the runner.
- **Plannability's suggestion to renumber `docs-sweep.md`.** P1 records the mapping once instead,
  since renumbering a committed sweep would invalidate every citation of it in the other review
  records.
- **Ruling E's "one owner sitting".** Two sittings, because H12's input is the whole harvest and the
  whole harvest is run two. Everything that can batch does.
