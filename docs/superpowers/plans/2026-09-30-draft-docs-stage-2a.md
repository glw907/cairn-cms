# Draft docs stage 2a: docs-code sync, the extend pilot, and the rest of 2a

**Goal:** Land the docs-code sync mechanisms in the page chain, then rebuild the first 11 of the
extend arm's 25 outline pages through that chain, starting with a six-page pilot that measures
the chain at its costliest, and merge them to `main` with every re-armed gate green.

**Spec:** `docs/superpowers/specs/2026-09-30-docs-code-sync-design.md` (approved, rulings S1 to
S9; it governs from stage 2a on where it and the parent disagree), its parent
`docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` (stages, the page chain, the
pilot checkpoint, "Edits after the chain"), and
`docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md` ("Outline format", the arm
states, `relink.json`). Executors read the named sections. Where this plan and a spec disagree,
stop and report. Review records: `docs/superpowers/research/2026-09-30-docs-code-sync-fold.md`
(owed items FV-10, FV-11, and the owed errata) and the plan review's record, when it lands.

**Outline:** `docs/internal/outlines/extend.json` (committed, 25 pages; reviewed by Geoff on the
R10 page with this plan, per the parent's flow step 1). It carries the whole arm, 2b's pages
included, and is deleted at the 2b merge. The R10 page marks the sweep's two added pages,
`configure-media` and `gate-your-site-with-cairn-audit` (both batch `2b`), keep-or-cut (S5). A
cut page's `factIds` and `covers` move to the page Geoff names, in the outline fold commit,
before task 2 assigns map slugs.

**Approach:** Task 1 (done) taught the page chain to read the outline and link each page into
the arm index. Before any page drafts, build option coverage (the walker, the committed map, and
its gate), teach the chain to carry map rows and design friction, and land the release sweep in
`cairn-release` with the owed errata, so the pilot measures the mechanisms with the pages. Then
re-arm extend, run the six pilot pages with both reviewers re-reading, take the pilot checkpoint
to Geoff with his owner read of three pages, and run the other five 2a pages on the chain he
picks. A consistency read, the relink restorations, and the close follow. Plans specify outcomes
and acceptance, never implementation code.

**Pass class:** mixed. Tasks 1, 2, and 3 are `engine-logic`. Task 4 is `docs`. Task 5 is `docs`,
with `engine-logic`'s gate for its test edits. Tasks 6, 8, and 9 are `docs` (the register chain
is their review). Task 7 is conductor-led. `code-simplifier:code-simplifier` runs once at the
close (task 10) over the pass's changed JavaScript and TypeScript in this repo; the dotfiles
runner and helper are outside its scope (spec, "What stage 2a inherits").

## Code-first gap sweep (planning phase, done)

The harvest proved the old pages' claims against the code, so the container held what the
August-era docs said and nothing they omitted. Five surface finders, five module deep readers,
and three independent verifiers swept the extend reader's surface; one filer deduped, filed, and
placed the results. The sweep produced 140 raw findings (167 verifier records after splits, none
refuted), 148 verified gap claims (131 filed as `[verified]` facts in
`docs/internal/facts/extend.md` after dedupe), 4 corrected facts, 2 added outline pages, and 12
code defects, which went to the friction log on `main` (`bd8ab1fe`), never into a fact. It cost
3.31M (measured). Record: `docs/superpowers/research/2026-09-30-extend-gap-sweep.md`. The
page-inputs step still traces any further fact a page's job needs.

The sweep becomes a standing step in stages 3 to 5 through the parent's stage flow step 1 (task
4's erratum), so each later stage plan budgets it from the measured 3.3M, scaled to its arm's
surface.

## Owner rulings (Geoff, 2026-09-30)

- **Ceiling:** 25M, flag at 20M (Geoff, 2026-09-30, after the plan review and second spec fold
  were priced at 19.58M; supersedes S9's 24M, which superseded S6's 18M).
- **New pages:** the sweep's pages are 2b pages; Geoff keeps or cuts each on the R10 page (S5).
  The pilot and 2a's page list do not change.
- **Pilot:** the pilot of six holds (S4).
- **Sequencing:** task 1 ran before outline approval, since it does not depend on the outline's
  content. Tasks 2 onward wait for his R10 approval of the outline and this plan.
- **Build while drafting** (S1), under the lean guard (S2); drafting is a design review of cairn
  (S7); the release sweep runs on capability releases only, capped at 1M per cut, never blocking
  the cut (S8).

## Page set (Geoff, 2026-09-30)

The brainstorm drew 23 pages from the extend reader's jobs, down from the old arm's 29; the sweep
added two (S5). Five merges: `build-a-site-by-hand` into `add-cairn-to-a-sveltekit-app`,
`declare-your-own-concept` into `define-an-adapter-and-schema`, `animate-a-custom-screen` into
`add-a-custom-admin-screen`, `auth-channel-security-model` and `render-safety` into
`security-model`, and `data-tiers` into `architecture`. Every surviving page keeps its old slug.
The outline's `groups` give the reading order.

| Batch | Pages |
| --- | --- |
| Pilot (task 6) | `security-model`, `add-cairn-to-a-sveltekit-app`, `add-a-custom-admin-screen`, `sign-in-through-your-organization`, `architecture`, `design-your-site` |
| Rest of 2a (task 8) | `what-the-scaffold-wrote`, `restrict-admin-access`, `add-a-second-audience`, `rotate-the-github-app-key`, `debug-your-site` |
| 2b (next pass) | the other 14, the two sweep pages included if kept |

The pilot takes the hardest pages on purpose: the largest concept page, the merged tutorial with
the most commands, the primary seam page, the auth seam with no exemplar, the architecture map,
and the page that carries the designer theme guide. Three of the outline's four figures fall in
the pilot (`architecture`, `add-a-custom-admin-screen`, `sign-in-through-your-organization`). The
owner read at the pilot checkpoint is `security-model`, `add-cairn-to-a-sveltekit-app`, and
`sign-in-through-your-organization`.

## Execution mode

- Before task 2, the conductor runs `npm ci` in this worktree (root and `examples/showcase`).
- Tasks 2 to 5: one Agent-tool chain each (`cairn-implementer` on `sonnet`, then `diff-reviewer`
  on `claude-opus-5-5`). Task 3 upshifts the implementer to `model: opus`, as task 1 did: it
  changes the runner every later page runs through.
- **Independent tasks:** task 4 is independent of tasks 2, 3, and 5. Task 3 depends on task 2
  (the map's format). Task 5 is independent of tasks 3 and 4 and runs after task 2, so a fact
  retag it makes follows the map rule. Task 6 depends on tasks 2, 3, and 5.
- **At the S1 boundary**, before task 5: one Sonnet agent drafts friction entries for DAD-1,
  EXB-4, and EXB-5 (the sweep filed them as facts, so the triage stream never saw them; spec,
  "What stage 2a inherits"), each re-checked at HEAD and citing its fact ids, into `main`'s
  friction log; the conductor commits them on `main`, staging only its own hunks, and a Sonnet
  agent merges `main` into this branch, so the chain's friction writes land on the current log.
- Tasks 6 and 8: the `docs-page-chain` workflow by name, `inFlight: 3`, `outline:
  "docs/internal/outlines/extend.json"`, pages as `{id, path, track}`, the gate `npm run
  check:docs-gate -- --page {page} --brief {brief}`, `gateLane: "light"`, `track: "extend"`.
  Task 6 sets `bothReviewers: true`. Task 8 sets it per Geoff's answer at task 7.
- Task 7: conductor-led, with one Sonnet agent for the relink batch and the R10 page publish.
- Task 9: one Opus 5.5 consistency agent, then one `cairn-implementer` and `diff-reviewer` chain
  applying its batch and the relink restorations.
- Task 10: the close, authored by one fold agent with one independent `diff-reviewer` read.

**Token ceiling:** 25M, flag at 20M (Geoff, 2026-09-30). Shares follow the spec's Budget table; the planning
lines are measured where the spec measured them.

| Share | Planned | At pass A's rate |
| --- | --- | --- |
| Subagents through the spec's first fold, the sweep's 3.31M and task 1 included (measured) | 5.20M | 5.20M |
| Spec fold verification (measured) | 0.13M | 0.13M |
| Conductor through handoff (estimated) | 1.50M | 1.50M |
| Second spec fold and this plan revision (estimated) | 0.20M | 0.20M |
| Plan review and its fold (estimated, the harvest's recorded cap) | 0.60M | 0.60M |
| Tasks 2 to 4, the mechanisms and friction route | 1.20M | 1.20M |
| Tasks 6 and 8, the pilot at 0.75M and five pages at 0.65M | 7.75M | 9.90M |
| Tasks 5, 7, 9, 10 and the conductor from here | 3.00M | 3.00M |
| **Projected total** | **19.58M** | **21.73M** |

The planned total sits at 78 percent of the ceiling. The pilot measures which
rate holds, and task 7 re-derives task 8's share and the mechanisms' 1.2M estimate before task 8
dispatches.

**Counting rule:** the conductor session's `/cost`, plus each Agent dispatch's usage block, plus
each workflow run's `spent`. `/cost` replaces the estimated conductor lines. The pilot's
per-page cost is task 6's `spent` divided by six.

**Checkpoints and segments:** S1 is tasks 1 to 4 (task 1 done); S2 is tasks 5 to 7; S3 is tasks
8 to 10. The S2 boundary is the pilot checkpoint: STATUS is written and Geoff is asked the
parent spec's one combined question before task 8 dispatches. Every boundary is a gate-green
commit.

## Global constraints

- **The lean guard** (spec, S2), verbatim: every mechanism in this spec meets all three
  conditions, and a later fold or plan review that adds one must meet them too:
  1. **A named prior-art source** that runs it (the prior-art record's methods table or its
     addendum).
  2. **A failure today's sweep found** that it would have caught, named by finding id or fact id.
  3. **It rides a step that already runs** (the fact read, page inputs, the docs gate, or the
     release skill), or states why no existing step can carry it.

  A mechanism that fails a condition is deferred with a trigger, not built. The spec's deferred
  table stays deferred; no task builds any of it.
- Drafting reads only the facts, the page's job and outline entry, its map rows, the register,
  and the exemplars. No old page exists to read; no agent restores one from git history.
- Facts follow `docs/internal/facts/README.md` exactly: a minted id from
  `node scripts/checks/check-facts.mjs --mint`, one tag, a `Source:` that resolves, filed with the
  Edit tool, and no em dash in the container. The page-inputs agent files new facts `[verified]`
  or `[external]`; the drafter files none.
- A map row is rewritten only by the agent disposing it, with the Edit tool, re-reading on a
  stale-read failure. A disposal lowers the pending-count constant in the same edit; a retag that
  takes a mapped fact off `[verified]` rewrites its row to `pending <slug>` and raises the
  constant by one in the same edit (FV-10). No other change raises the constant.
- A friction entry never blocks or pauses a page; the page documents the code as it is (spec,
  "Docs as a design review"). An engine fix lands in an engine pass, never in this stage.
- Every page follows the developer-docs drafting brief in `docs/internal/docs-register.md` and the
  extend track profile. Every sentence on a page with a brief is in that brief.
- An edit after the chain (consistency read, owner fold, relink) follows the parent spec's
  "Edits after the chain": the brief changes in the same commit, and changed sentences get both
  reviews scoped to them unless the change is a pure term or link substitution.
- `choose-an-ai-posture.md` changes only with its brief, in the same commit.
  `migration-notes.md` and `upgrade-cairn.md` change only for link restoration and this pass's
  own per-version entry.
- Shipped contracts never change: `https://cairn.pub/docs/...` URLs in `tool/`,
  `tool/internal/spine/conditions.json`, and `scripts/checks/shipped-anchors.json`.
- `templates/waymark/` is emitted from `examples/showcase` (`npm run emit:template`), never
  hand-edited.
- No task edits this branch's `docs/STATUS.md` except task 10; checkpoint writes go to `main`'s,
  staging only the conductor's own hunks.
- Commit specific files, never `git add -A`. Commit messages carry the attribution trailer.
- The conductor reads per-page records and reports only, never a page, a diff, or a gate log.

## Review focus

1. **The lean guard, as an explicit lens.** The plan review records one verdict per mechanism
   (option coverage, the release sweep, the friction route) with its three citations, and holds
   any finding that proposes new machinery to the guard.
2. **The walk stops early or runs wide.** A walk that stops at the first named type misses the
   nested options the sweep found; one that walks outputs and props buries the map. Task 2's
   planted nested member and the recorded counts pin both.
3. **Shared map writes under three pages in flight.** Rows and the constant change from up to
   three page-inputs agents and three fact reads at once. The one-agent-per-row rule and the
   stale-read re-read are the guard; a gate red on a row naming another in-flight page's slug
   does not count against this page (the parent's whole-tree rule).
4. **A page lands without an index link.** Extend is `rebuilt` once any page outside the kept set
   exists (`scripts/checks/arm-state.mjs`), so `check:arm-indexes` fails a page the index does not
   link. Task 1's link-in keeps each page's own gate green.
5. **A `LEGACY_PATH_MAP` target that does not exist.** Re-arming makes `docs-links` fail any
   extend target not on disk. Task 5 points every extend value at the interim index; tasks 7 and 9
   repoint each landed page's entries, and 2b's entries stay on the index.
6. **A merged page drops an absorbed page's facts.** The outline's `factIds` carry every source
   section's citable ids; the fact read checks the claim inventory against them and the absorbed
   topics, and task 9's consistency read names any absorbed topic no page covers.
7. **Two pages cover one topic.** The merges put `security-model` beside
   `sign-in-through-your-organization` and `add-a-second-audience`, and `architecture` beside
   `add-cairn-to-a-sveltekit-app`. The outline's `outOfScope` lines split them, and the
   consistency read's `overlap` class catches what slips.
8. **The slug contract loses its case.** `github-slug-contract.test.ts` pins
   `## Milestone 1: a bare SvelteKit site, deployed` on the deleted `build-a-site-by-hand.md`;
   task 5 moves the case to a live source so re-arming does not fail it.

## Tasks

### Task 1: the page chain reads the outline and links each page into the index (done)

**Pass class:** `engine-logic`. Accepted. The runner reads `args.outline`, resolves each page's
entry through the `cairn-docs-outline` helper with checksums, and the drafter links each page into
the index; take lines, `figureNote`, and `absorbs` pass through; the fact read checks the
outline's `factIds` and absorbed topics (dotfiles `8497a08`, `de040f4`). `requiredDocsPaths`
requires every kept page unconditionally (cairn `8755099e`). The helper's lock handles more races
than it needs, an S2 instance: the post-mortem records it, and any simplification is a separate
dotfiles change with a `diff-reviewer` read, outside this pass (spec, "What stage 2a inherits").

### Task 2: option coverage

**Pass class:** `engine-logic`. **Gate:** the new check's unit tests (test-first), `npm run
check`, and `npm run check:docs-gate`, through `cairn-run-gate`, light lane.

**Files:** a new walker and gate under `scripts/checks/` with its unit test under
`src/tests/unit/`; `scripts/checks/docs-gate.mjs` and `src/tests/unit/docs-gate.test.ts`; the
committed map beside the fact container (`docs/internal/option-map.json` unless the implementer
records a reason for another name).

**Outcomes:**
- **The walker** enumerates option-bearing member paths from the `dist` declarations, reusing the
  export enumeration `check:surface` and `check:reference` share (`surfaceSubpaths`,
  `moduleExports`) and adding a member walk. Option-bearing means a member of a named type a
  developer passes in, reached from `defineAdapter`, the `define*` helpers, and the route-factory
  config types. A path is keyed by its declaring type (`AssetConfig.maxUploadBytes`), so a type
  reached from several roots is listed once. The walk stops at a named type already listed and
  excludes `*Data` and runtime outputs, descriptors, registries, and engine component props.
- **The map** holds one sorted row per generated path: a citable fact id, `exclude` with a
  reason, or `pending` with the outline slug that should dispose it. Matching is exact equality
  of the declaring-type key. Initial rows: a fact id only where an existing `[verified]` fact
  states that exact option; an exclusion with its reason; otherwise `pending` with the extend
  page whose job covers the option, assigned over the declaring types and the outline, never an
  invented slug. The committed pending-count constant equals the pending count at creation.
- **The gate** joins `docs-gate.mjs` on the same footing as `check:reference`. It fails a
  generated path with no row (naming the path, its export, and the two ways out: file the fact,
  or add an `exclude` row whose reason the diff-reviewer accepts); a row whose path is no longer
  generated; a row naming a fact id that does not exist or is not `[verified]` (naming the FV-10
  rewrite as the way out); an `exclude` with no reason; a `pending` row whose slug names no page
  in any committed outline; and a pending count above the constant.
- **FV-10 settled:** a retag that takes a mapped fact off `[verified]` rewrites its row to
  `pending <slug>` (the page doing the retag) and raises the constant by one in the same edit,
  and the gate passes that edit.
- **Counts reported** for the ledger: generated paths, pending at creation, and, per pilot page,
  the pending rows naming its slug and the rows whose fact id is in its `factIds` (FV-11).

**Acceptance** (fixtures from the spec's Acceptance): the gate fails a planted new member on
`CairnAdapter.editor` with no row, naming the path and its export, with the member inside a
nested named type so a walk that stops early fails the fixture; it fails a row for a removed
path, a row naming a missing fact id, an `exclude` with no reason, a pending count above the
constant, and a `pending` row whose slug names no page in a committed outline; a retag fixture
fails with the row unchanged and passes with the row rewritten and the constant raised; the gate
passes on the committed map; the counts are in the ledger.

### Task 3: the page chain carries map rows and design friction

**Pass class:** `engine-logic`. **Gate:** the runner's dry-run proof below, plus `npm run
check:docs-gate` in this worktree, light lane.

**Files:** `~/.dotfiles/claude/.claude/workflows/docs-page-chain.js`, the `cairn-docs-outline`
helper in `~/.dotfiles` if it resolves the rows, and the `cairn-docs-drafter` agent definition in
`~/.dotfiles` if it carries the friction instruction (committed in `~/.dotfiles`).

**Outcomes:**
- **Map rows reach page inputs.** The runner resolves each page's rows through the outline and
  helper route task 1 built: the `pending` rows naming its slug and the rows whose fact id is in
  its outline entry's `factIds`. Page inputs disposes each pending row in its claim inventory
  (carried, filed, or cut with a reason) and rewrites the row to the fact id or the exclusion,
  under the map rule in Global constraints. The fact read's existing rule blocks an inventory
  item the page dropped without a `cut`.
- **FV-10 reaches the agents that retag.** Page inputs (a retag to `[candidate]`) and the fact
  read (a retag to `[docs-drift]`) each rewrite a mapped fact's row and raise the constant in the
  same edit.
- **FV-11:** the per-page record carries the rows received and the rows disposed.
- **Design friction (S7).** Page inputs and the fact read get the drafter's instruction to write
  a design gap into `docs/internal/docs-friction-log.md` and name it in `frictionFiled`. The
  drafter's instruction widens from "a genuine design gap" to the spec's smells: a hedge, a
  caveat, an exception, a workaround, a surprising default, or two seams naming or behaving the
  same thing differently. Each entry names the fact ids or `file:line` involved. Page inputs'
  schema and the read schema gain the drafter's `frictionFiled`; the runner copies it into the
  page record only from page inputs, the drafter, and the fact read. The register editor and the
  figure verifier do not report. No new agent and no parallel field.
- The header comment documents the rows and the friction route.

**Acceptance:** a dry run on one pilot page with stubbed agents shows its rows in the page-inputs
prompt and in the record; stubbed `frictionFiled` values from page inputs, the drafter, and the
fact read reach the record, and one from the register editor does not; the docs gate stays
green.

### Task 4: the release sweep and the owed errata

**Pass class:** `docs`. **Gate:** the dotfiles repo gate (`scripts/check.sh`) for the skill edit;
the diff-reviewer checks the errata against the fold record's "Owed errata".

**Files:** `~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md` (committed in
`~/.dotfiles`); `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`;
`docs/superpowers/research/2026-09-30-docs-code-sync-prior-art.md`.

**Outcomes:**
- **`cairn-release` carries the release sweep** (spec, "Mechanism 2"), before the version is set,
  for capability releases only (S8): the window from the last engine tag whose sweep
  `docs/HISTORY.md` records, matched as `v[0-9]*` with prerelease tags excluded; finders working
  from the `api-surface.md` diff, the emitted-template diff, and the changelog's `Consumers must:`
  and behavior lines, one module per context; an independent verifier before anything is filed;
  the filing rule (before an arm merges, placed on its outline page; after, filed as a fact
  naming the rebuilt page, with the page fix in the next pass; no page home, a friction entry);
  the 1M cap, stopping at the cap and reporting the unswept modules; never blocking the cut; a
  trigger-1 cut keeping its fast path and rolling its window forward; the yield recorded in
  HISTORY beside the modules swept; and the retire rule (two consecutive capability releases with
  zero verified gaps move the sweep to on-demand, run when a site round finds a doc gap in a
  surface changed since the last sweep).
- **The parent's owed errata** (spec, "Amends the parent"), applied in place with a status-line
  note as the harvest fold's were: the Brief's "No new check is built" gains the option-coverage
  gate and "The budget goes to pages" gains the non-page shares; the stage flow's step 1 opens with
  the planning-phase sweep, the carrier that makes stages 3 to 5 plan it; the Budget's per-stage
  "about 1M for planning" names the measured 3.3M sweep and the up to about 7M more across stages
  3 to 5; stage 2's extend page count grows by the two sweep pages Geoff keeps.
- **The prior-art record's erratum** (fold record, "Owed errata"): its lines 38 to 41 stop reading
  the sweep's corrected facts as resolved-but-stale drift; they were wrong when filed. Its
  missing-sources item is already closed by the addendum (FV-6).

**Acceptance:** the skill carries every item in the spec's `cairn-release` acceptance line; each
erratum lands and the stage flow names the planning-phase sweep; the dotfiles gate is green.

### Task 5: re-arm extend

**Pass class:** `docs`, with `engine-logic`'s gate for the test edits. **Gate:** `npm run
check:docs-gate`, `npm run check:facts`, and the unit tests for `docs-links` and
`github-slug-contract`, through `cairn-run-gate`, light lane.

**Files:** `docs/extend/README.md` (create), `scripts/checks/docs-links.mjs`,
`src/tests/unit/github-slug-contract.test.ts`, `docs/internal/record/harvest/relink.json`,
`docs/internal/facts/*.md` (the shifted `MarkdownEditor.svelte` cites only), and the option map
if a fact retag touches a mapped fact.

**Outcomes:**
- `docs/extend/README.md` is an interim index: a one-sentence statement that the arm is being
  rebuilt, one heading per outline group whose text is the group's `title` exactly (the
  `cairn-docs-outline link` helper locates a group by that heading and fails naming a missing
  one), and links to the three kept pages under Operate. Stage 5 rebuilds its prose; it takes no
  brief now.
- Every `LEGACY_PATH_MAP` value under `docs/extend/` that names a page not on disk points at the
  interim index, and each changed entry is recorded in `relink.json`.
- The slug-contract case for `Milestone 1: a bare SvelteKit site, deployed` keeps its markdown
  and expected id and moves to a source that exists and carries that heading shape, or to a
  synthetic source the test marks as synthetic; the test still fails if its source page vanishes.
- `relink.json` entries whose restoring page is in 2b (per the outline's `rearms`) are retagged
  `"2b"`.
- Fact `f:dzmj90` (the slug-contract case) is updated to the case's new source, and `f:e5hqn3`
  (a scaffold comment naming a section the harvest dropped) is checked against the template and
  fixed or retagged `[docs-drift]`, under the map rule if it is mapped.
- The `MarkdownEditor.svelte` fact cites the ROADMAP flags as shifted resolve to the current
  lines (ROADMAP Next, "before stage 2a drafts from these"), and that entry leaves ROADMAP.
- With the interim index in place, `check:arm-indexes`, `docs-links`, and `check-package-files`
  are green with extend `rebuilt`.

**Acceptance:** the gate is green; `arm-state` reports extend `rebuilt`; the diff-reviewer greps
`LEGACY_PATH_MAP` and finds no extend value off disk.

### Task 6: the pilot

**Pass class:** `docs`. **Gate:** the chain's per-page gate (above). **Depends on:** tasks 2, 3,
and 5.

**Pages:** the six pilot pages, from the outline, `bothReviewers: true`.

**Outcomes:** each page accepted by the chain or escalated to the conductor with its record; each
page's brief at `docs/internal/briefs/extend/<slug>.json`; new facts filed by page inputs; each
page's pending map rows disposed; each record carrying its cross-regression flag, its rows
received and disposed, and its `frictionFiled`. A figure page gets its `figure-verifier` read
and a figure made through the `cairn-figure` skill.

**Acceptance:** all six records returned; `check:provenance` green on each brief; the option gate
green with no pending row naming a pilot slug; the run's `spent` recorded in the ledger.

### Task 7: the pilot checkpoint

**Conductor-led.**

- A Sonnet agent repoints the pilot pages' `LEGACY_PATH_MAP` entries and applies the relink
  restorations the outline keys to pilot pages, each recorded in `relink.json`, under the edit
  rule above; gate as task 5.
- The conductor re-derives every share per the parent spec's "Pilot checkpoint": the per-page
  cost, the cross-regression rate over qualifying pages (exactly one reviewer returned `fix` in
  round 1), the full-scope total, and the mechanisms' measured cost against their 1.2M.
- The checkpoint reports, per pilot page, the map rows received and disposed and the page-inputs
  cost beside the page's total, so disposal cost reads apart from the page rate (FV-11), and the
  `frictionFiled` entries per page. Zero entries across all six is read as a prompt failure and
  fixed in the runner before task 8.
- A Sonnet agent publishes the three owner-read pages on one R10 page (`scripts/docs-review/`).
- STATUS is written; Geoff reads the three pages and answers one combined question: the chain for
  task 8 (lean or both-reviewer, with the rate and its measured cost), the scope that plans within
  the ceiling if the full scope does not, and the initiative ceiling with the planning-phase
  sweeps of stages 3 to 5 priced at the measured 3.3M each, scaled to their surfaces (up to about
  7M more against R8's 30M). The same question asks whether the task 10 merge is pre-authorized.
- The conductor folds his saved version (diff against the repo, briefs updated) and turns any
  note that generalizes into a rule where it runs (register, drafter prompt, or runner).

**Acceptance:** his answer and the fold's commit recorded in the ledger; no task 8 dispatch before
the answer.

### Task 8: the rest of 2a

**Pass class:** `docs`. **Gate:** the chain's per-page gate.

**Pages:** `what-the-scaffold-wrote`, `restrict-admin-access`, `add-a-second-audience`,
`rotate-the-github-app-key`, `debug-your-site`, on the chain task 7 chose, with Geoff's fold
notes applied to the drafter's inputs.

**Acceptance:** as task 6.

### Task 9: consistency read and relink

**Pass class:** `docs`, with `engine-logic`'s gate for any script edit. **Gate:** `npm run
check:docs-gate`, `npm run check:facts`, `npm run check:provenance`, light lane.

- One Opus 5.5 agent reads the 11 new pages, the interim index, and the three kept pages for
  terms (against the outline's term list), cross-links (against its `crossLinks`), overlap, and
  uneven depth. It returns the parent spec's record: every page read and each finding with
  `file:line`, class, and proposed edit. It also sweeps alt text, figure labels, and nav-label
  strings for the register's tells (ROADMAP Next, "the first rebuild stage that writes those
  strings").
- The implementer applies the batch under the edit rule, repoints the rest-of-2a pages'
  `LEGACY_PATH_MAP` entries, restores every relink entry the outline keys to a 2a page or to
  `close` (including `skills/cairn-extend/SKILL.md`'s per-pattern lines and the register and
  briefs README lines), with any kept-page pointer changed together with that page's brief, and
  prunes `check-symbols-allowlist.mjs` entries no 2a page carries.

**Acceptance:** the record committed under `docs/superpowers/research/`; the gate green; every
`relink.json` entry tagged `2a` shows its restoring commit, and the diff-reviewer confirms none is
left open.

### Task 10: close

Run `cairn-pass`'s close:
- `code-simplifier:code-simplifier` over the pass's changed `.mjs` and `.ts` in this repo; the
  full gate (`npm test`, `npm run check:close`, `make -C tool check`).
- The 11 rebuilt paths appended to `docs/internal/briefs-rebuilt.json`.
- `CHANGELOG.md` under `## Unreleased`: the 11 pages added, the five absorbed paths and their
  successors, and a `Consumers must:` line to re-run `npx cairn-guidance install` if task 9
  changed the shipped `cairn-extend` skill.
- The outline's `redirects` written as redirect rows into
  `docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md`.
- **Design friction (S7):** the fold agent, never the conductor, reconciles every `frictionFiled`
  entry in the page records against the log, verifies each against the code, and triages
  complete-or-move under the log's rules: routed to an engine pass through the `ROADMAP.md` tier
  where it bites (tagged as simplifying a named page), or deleted with a reason. Before promoting
  an engine change it reads `docs/internal/engine-rulings.md` and runs the charter's premise test
  (EXB-5 sits against the ruling `audit-adapter-imagefield`).
- The rest of the friction log triaged complete-or-move; ROADMAP updated (the kept-page fix and
  the `MarkdownEditor` cites leave Next; the docs-code sync initiative marks option coverage, the
  friction route, and the release sweep shipped).
- STATUS rewritten with stage 2b as the next action (its pages come from the outline; no new
  brainstorm unless the pilot answer cut scope); HISTORY entry with the pilot's measured per-page
  cost, the cross-regression rate, the map's generated and pending counts at creation and at
  close with the disposal cost, the `frictionFiled` count and each entry's triage outcome, the
  mechanisms' measured cost, what the gates caught, and whether any refused plan-review finding
  turned out real; this plan's post-mortem with both budgets scored and task 1's lock recorded as
  an S2 instance.
- Push, open the PR, and merge on Geoff's go (or under the pre-authorization task 7 asked for).

## Ledger

| Task | Commit | Verdict | Tokens |
| --- | --- | --- | --- |
| Planning: harvest fold errata | `91d12cdf`, `55e79837`, `059563dd`; dotfiles `f5eac2e`, `846c1a0` | done | in the measured planning lines |
| Planning: gap sweep, outline, prior art | `86fd134c` | done | 3.31M (measured) |
| Planning: sweep defects in the friction log (`main`) | `bd8ab1fe` | done | in the measured planning lines |
| Planning: ROADMAP initiative | `13fa8195` | done | in the measured planning lines |
| Planning: sync spec, review, folds | `21898c5f` to `9ac777b2` | approved (S1 to S9) | in the measured planning lines |
| 1 | cairn `8755099e`; dotfiles `8497a08`, `de040f4` | accept | in the measured planning lines |

## Post-mortem
