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
(owed items FV-10, FV-11, and the owed errata), the plan review
(`2026-09-30-draft-docs-2a-plan-review-{contract,mechanics,risk}.md`), and its fold
(`2026-09-30-draft-docs-2a-plan-fold.md`, whose two owed items task 4 lands).

**Entry condition (owner ruling):** task 1 ran before outline approval; task 2 waits for Geoff's
approval of the outline and this plan on the R10 page
https://claude.ai/artifact/NCSX7CjAdvCJ5cwQK78kds (the parent's flow step 1), recorded in the ledger
row. **Outline:** `docs/internal/outlines/extend.json` (committed, 25 pages). It carries the whole
arm, 2b's pages included, and is deleted at the 2b merge. The R10 page marks the sweep's two added
pages, `configure-media` and `run-cairn-audit-on-your-site` (both batch `2b`), keep-or-cut (S5).
A cut page's `factIds` and `covers` move to the page Geoff names, in the outline fold commit, before
task 2 assigns map slugs; the ledger records that commit, and task 2 cites it. Where an outline
rearm's `action` text and this plan disagree on a target, this plan governs.

**Approach:** Task 1 (done) taught the page chain to read the outline. Tasks 2 to 4 build option
coverage, teach the chain map rows and design friction, and land the release sweep with the owed
errata, so the pilot measures the mechanisms with the pages. Then re-arm extend, run the pilot, take
the checkpoint to Geoff, run the other five 2a pages on the chain he picks, and close with a
consistency read and the relink. The planning-phase gap sweep is done (record
`docs/superpowers/research/2026-09-30-extend-gap-sweep.md`). Plans specify outcomes, never code.

**Pass class:** mixed. Tasks 1, 2, and 3 are `engine-logic`. Task 4 is `docs`. Task 5 is `docs`,
with `engine-logic`'s gate for its test edits. Tasks 6, 8, and 9 are `docs` (the register chain
is their review). Task 7 is conductor-led. `code-simplifier:code-simplifier` runs once at the
close (task 10) over the pass's changed JavaScript and TypeScript in this repo; the dotfiles
runner and helper are outside its scope (spec, "What stage 2a inherits").

## Owner rulings (Geoff, 2026-09-30)

- **Ceiling:** 25M, flag at 20M (supersedes S9's 24M and S6's 18M).
- **New pages:** the sweep's pages are 2b pages; Geoff keeps or cuts each on the R10 page (S5).
  The pilot of six (S4) and 2a's page list do not change.
- **Build while drafting** (S1), under the lean guard (S2); drafting is a design review of cairn
  (S7); the release sweep runs on capability releases only, capped at 1M per cut, never blocking
  the cut (S8).

- **Initiative budget after the pilot (Geoff, 2026-09-30):** 45 to 60M for the remaining pages
  (task 8, stage 2b, stages 3 to 5) is accepted, at the pilot's measured cost of about 1.3M a page.
  Efficiency is taken only where quality holds. The pilot's cross-regression rate (2 of 6 pages:
  the figure verifier on `add-a-custom-admin-screen`, the fact read on `theme-your-public-site`)
  keeps `bothReviewers: true` for task 8 unless the checkpoint shows otherwise.

## Page set (Geoff, 2026-09-30)

The outline's 25 pages are 23 drawn from the extend reader's jobs plus the sweep's two (S5), with
five old pages merged into survivors that keep their slugs (the outline's `absorbs`).

| Batch | Pages |
| --- | --- |
| Pilot (task 6) | `security-model`, `add-cairn-to-a-sveltekit-app`, `add-a-custom-admin-screen`, `replace-magic-links-with-cloudflare-access`, `architecture`, `theme-your-public-site` |
| Rest of 2a (task 8) | `scaffolded-site-files`, `restrict-admin-access`, `add-a-second-sign-in-group`, `rotate-the-github-app-key`, `debug-your-site` |
| 2b (next pass) | the other 14, the two sweep pages included if kept |

The pilot takes the hardest pages on purpose, three of the outline's four figures among them
(`architecture`, `add-a-custom-admin-screen`, `replace-magic-links-with-cloudflare-access`). The
owner read at the checkpoint is `security-model`, `add-cairn-to-a-sveltekit-app`, and
`replace-magic-links-with-cloudflare-access`.

**Slugs follow titles (owner ruling, 2026-09-30).** A page's slug is its outline `title` in
lowercase kebab case, at `docs/extend/<slug>.md`, and titles follow the register's title rules.
Geoff approved the 25 titles as proposed (2026-09-30).
The R10 outline fold renames the slug of any title Geoff changes, together with its redirect row
and every reference to it in the outline, the container's sweep headings, and this plan.

**Known code defects on 2a pages.** The sweep filed 12 code defects as friction, never as facts,
so page inputs never sees them. Each pair below rides the runner's existing `extraChecks` on that
page's dispatch: "The page claims nothing this defect contradicts; where it describes the
behavior, it states the limitation as a filed `[verified]` fact."

| Defect (friction log, `bd8ab1fe`) | Pages |
| --- | --- |
| The feed ships `::include` as literal text and emits root-relative media URLs (`templates/waymark/src/chassis/feed.ts:13-20`) | `scaffolded-site-files`, `theme-your-public-site` |
| Comments name `GET /admin/healthz`, which no engine view serves | `scaffolded-site-files`, `rotate-the-github-app-key` |
| `cairn-media-seed` ignores `assets.publicBase` | `theme-your-public-site` |

## Execution mode

- Before task 2, the conductor runs `npm ci` in this worktree (root and `examples/showcase`).
- Tasks 2 to 5 run serially, one Agent-tool chain each (`cairn-implementer` on `sonnet`, then
  `diff-reviewer` on `claude-opus-5-5`). No pair is independent: tasks 3 and 4 share
  `~/.dotfiles`, and tasks 2, 4, and 5 share this worktree. Task 3 upshifts the implementer to
  `model: opus`, as task 1 did: it changes the runner every later page runs through.
- **At the S1 boundary**, before task 5: one Sonnet agent merges `main` into this branch (one
  commit, `bd8ab1fe`, touching only the friction log, which this branch has not touched), then
  writes friction entries for DAD-1, EXB-4, and EXB-5 on the branch, each re-checked at HEAD and
  citing its fact ids (the sweep filed them as facts, so the triage stream never saw them; spec,
  "What stage 2a inherits"), and commits them. Task 5's gate covers the merge.
- Tasks 6 and 8: the `docs-page-chain` workflow by name, `worktree` set to this worktree, `inFlight:
  3`, `outline: "docs/internal/outlines/extend.json"`, pages as `{id, path, track}` plus the
  `extraChecks` above, the gate `npm run check:docs-gate -- --page {page} --brief {brief}`,
  `gateLane: "light"`. Task 6 sets `bothReviewers: true`. Task 8 sets it per Geoff's answer at task
  7.
- **After each run** (tasks 6 and 8): the conductor hands the run's records to one
  `cairn-implementer`, which runs the whole-tree `check:docs-gate`, writes them to a stage
  record under `docs/superpowers/research/` (per page: status, round verdicts, cross-regression
  flag, rows received and disposed, `frictionFiled`, and any scoped-review verdicts), and commits
  the files the records name (pages, briefs, fact containers, the map, the friction log, the
  index) with the stage record. One `diff-reviewer` read checks the file set only (the register
  chain reviewed the prose). Tasks 7, 9, and 10 read that record, never the tool result.
- Task 7: conductor-led, with one Sonnet agent for the owner fold and one for the R10 page.
- Task 9: one Opus 5.5 consistency agent, then one `cairn-implementer` and `diff-reviewer` chain
  applying its batch and the relink restorations.
- **Scoped reviews** (the parent's "Edits after the chain"): for task 7's owner fold and task 9's
  batch, any change beyond a pure term or link substitution gets one `cairn-register-editor` and
  one fact-read dispatch scoped to the changed sentences; their verdicts go in the stage record,
  and any `fix` is applied before the task commits.
- Task 10: the close, authored by one fold agent with one independent `diff-reviewer` read.

**Token ceiling:** 25M, flag at 20M (owner rulings). Shares follow the spec's Budget table.

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

The planned total sits at 78 percent of the ceiling. The pilot measures which rate holds, and
task 7 re-derives task 8's share and the mechanisms' 1.2M estimate before task 8 dispatches.

**Counting rule:** the conductor session's `/cost` (`/usage`), read at each boundary, is the only
running total against the ceiling and the flag; it already includes subagent and workflow-agent
tokens (`2026-09-26-draft-docs-pass-0-1.md:504-505`). Agent usage blocks and a run's `/cost` delta
are attribution only, never added to it. The pilot's per-page cost is the `/cost` delta across task
6's run, the conductor idle, divided by six, a re-dispatched page's cost included. No per-agent
split is measured: with three pages in flight, no source isolates one agent.

**Checkpoints and segments:** S1 is tasks 1 to 4 (task 1 done); S2 is tasks 5 to 7; S3 is tasks 8 to
10. The S2 boundary is the pilot checkpoint: STATUS is written and Geoff is asked the parent spec's
one combined question before task 8 dispatches. Every boundary is a gate-green commit; after tasks 6
and 8, that is the post-run commit above, and task 7's owner-fold commit is gated the same way.

## Global constraints

- **The lean guard** (spec, S2): a mechanism needs a named prior-art source, a failure the sweep
  found (by finding or fact id), and a step that already runs to ride, or it is deferred with a
  trigger, never built. The spec's deferred table stays deferred; no task builds any of it.
- Drafting reads only the facts, the page's job and outline entry, its map rows, the register,
  and the exemplars. No old page exists to read; no agent restores one from git history.
- Facts follow `docs/internal/facts/README.md` exactly: a minted id from
  `node scripts/checks/check-facts.mjs --mint`, one tag, a `Source:` that resolves, filed with the
  Edit tool, and no em dash in the container. The page-inputs agent files new facts `[verified]`
  or `[external]`; the drafter files none.
- **The map rule.** The pending-count constant is one line in the map file. A row is rewritten
  only by the agent disposing it, with the Edit tool, re-reading on a stale-read failure. Edits
  run in an order that keeps every intermediate state green: a disposal files the fact, then
  rewrites the row, then lowers the constant; a retag that takes a mapped fact off `[verified]`
  (FV-10) raises the constant, then rewrites the row to `pending <slug>`, then retags the fact.
  A row that belongs to another page not yet drafted may be re-pointed to `pending <that slug>`,
  count-neutral, with the reason in the claim inventory. No other change raises the constant.
- A friction entry never blocks or pauses a page; the page documents the code as it is (spec,
  "Docs as a design review"). An engine fix lands in an engine pass, never in this stage.
- Every page follows the developer-docs drafting brief in `docs/internal/docs-register.md` and the
  extend track profile. Every sentence on a page with a brief is in that brief.
- An edit after the chain (consistency read, owner fold, relink) follows the parent spec's
  "Edits after the chain": the brief changes in the same commit, and changed sentences get the
  scoped reviews above.
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
- The conductor reads per-page records, the stage record, and reports only, never a page, a
  diff, or a gate log.

## Review focus

**Shared map writes under three pages in flight.** The map rule's edit order keeps a sibling's
gate green; a red that still occurs costs a redraft round, which the stage record notes.

## Tasks

### Task 1: the page chain reads the outline and links each page into the index (done)

**Pass class:** `engine-logic`. Accepted (ledger). The helper's lock handles more races than it
needs, an S2 instance the post-mortem records; any simplification is outside this pass.

### Task 2: option coverage

**Pass class:** `engine-logic`. **Entry:** the R10 approval and outline fold row in the ledger.
**Gate:** the new check's unit tests (test-first), `npm run check`, `npm test`, and `npm run
check:docs-gate`, through `cairn-run-gate`, light lane.

**Files:** a new walker and gate under `scripts/checks/` with its unit test under
`src/tests/unit/`; `scripts/checks/docs-gate.mjs` and `src/tests/unit/docs-gate.test.ts`;
`package.json` (a `check:options` script and its `check:close` entry, since `check:close` does
not call the docs gate); the committed map beside the fact container
(`docs/internal/option-map.json` unless the implementer records a reason for another name).

**Outcomes:**
- **The walker** enumerates option-bearing member paths from the `dist` declarations, reusing
  `moduleExports` and `enumerateExports` (`scripts/checks/reference-coverage.mjs`, shared with the
  surface checks) and `surfaceSubpaths` (`scripts/checks/check-surface.mjs:31`; check:reference keeps
  its own `CONFIG` map), and adding a member walk (pre-flight, 2026-09-30). Option-bearing means a member of a type a developer
  passes in, reached from roots the walker's header lists by name: `defineAdapter`, the `define*`
  helpers, and the route-factory config types. A path is keyed by its nearest named declaring
  type, and an inline literal's members by the path from it (`CairnAdapter.editor.nav`), so a
  type reached from several roots is listed once. The walk unwraps arrays, `Record` and index
  signature values, optionality, unions, mapped types, and generic constraints to the types they
  carry; a member whose type it cannot resolve fails the gate, never drops out. It stops at a
  named type already listed and excludes `*Data` and runtime outputs, descriptors, registries,
  and engine component props. A failure names the root export and subpath first reached in
  `surfaceSubpaths` order.
- **The map** holds one sorted row per generated path: a citable fact id, `exclude` with a
  reason, or `pending` with the outline slug that should dispose it. Matching is exact equality
  of the key. A fact id is seeded only on evidence the diff-reviewer can re-run: a `[verified]`
  fact names the member in backticks and its `Source:` cites the declaring type's file. Every
  other non-excluded path is `pending` with the extend page whose job covers it, assigned over
  the declaring types and the outline, never an invented slug. The constant equals the pending
  count at creation.
- **The gate** joins `docs-gate.mjs` on the same footing as `check:reference`. It fails a
  generated path with no row (naming the path, its export, and the two ways out: file the fact,
  or add an `exclude` row whose reason the diff-reviewer accepts); a row whose path is no longer
  generated; a row naming a fact id that does not exist or is not `[verified]` (naming the FV-10
  rewrite as the way out); an `exclude` with no reason; a `pending` row whose slug names no page
  in any committed outline; and a pending count above the constant.
- **Counts reported** before any slug is assigned: the root list and the generated count. At or
  below the crude filter's 1,379 proceeds; above it, the conductor sees the list first. For the
  ledger: generated paths, pending at creation, and, per pilot page, the pending rows naming its
  slug and the rows whose fact id is in its `factIds` (FV-11).

**Acceptance:** fixtures are synthetic declaration files in a temp directory, never the real
`dist` (the real `CairnAdapter` is in `dist/content/types.d.ts`). The gate fails, naming the path and its export: a new member planted directly on the inline
`CairnAdapter.editor` object with no row; one inside a named type nested under `editor`; one reached
only through an array element type; one only through a generic constraint; and one only through
`Partial<Named>` or `Record<string, Named>`. Two inline literals sharing a
member name yield two rows. A `*Data` member and an engine component prop, both reachable, are
absent from the generated set. The gate fails a row for a removed path, a row naming a missing fact
id, an `exclude` with no reason, a pending count above the constant, and a `pending` row whose slug
names no committed page. A retag fixture fails with the row unchanged and passes with the row
rewritten and the constant raised. The gate passes on the committed map; the counts are in the
ledger.

### Task 3: the page chain carries map rows and design friction

**Pass class:** `engine-logic`. **Gate:** `bash ~/.dotfiles/scripts/check.sh`, with this task's
dry-run cases added to the existing `tests/docs-page-chain-outline.test.mjs` harness.

**Files:** `~/.dotfiles/claude/.claude/workflows/docs-page-chain.js` and its outline test
(committed in `~/.dotfiles`), and the `cairn-docs-outline` helper for the title field only. The
drafter definition stays untouched.

**Outcomes:**
- **Map rows reach page inputs.** The runner gives page inputs the map path, the page's slug, its
  `factIds`, and the selection rule (the `pending` rows naming its slug and the rows whose fact
  id is in its `factIds`); page inputs reads its rows live. It disposes each pending row in its
  claim inventory (carried, filed, cut with a reason, or re-pointed) under the map rule. The fact
  read's existing rule blocks an inventory item the page dropped without a `cut`.
  `PAGE_INPUTS_SCHEMA` gains `rowsReceived` and `rowsDisposed` (FV-11).
- **FV-10 reaches the agents that retag.** The page-inputs prompt (a retag to `[candidate]`) and
  the fact-read prompt (a retag to `[docs-drift]`) carry the map rule's retag order. A fact read
  that retags a mapped fact reports its row as a blocking finding, so the page escalates unless
  the round resolves it.
- **Design friction (S7).** The runner's `draftPrompt` widens its friction instruction from "a
  genuine design gap" to the spec's smells: a hedge, a caveat, an exception, a workaround, a
  surprising default, or two seams naming or behaving the same thing differently. Each entry
  names the fact ids or `file:line` involved. Page inputs and the fact read get the same
  instruction and a `frictionFiled` field (the drafter schema already has one, runner `:149`); the drafter's already reaches the record through
  `rounds[].draft`, page inputs' through `record.pageInputs`, and the fact read's gets a copy
  step. The register editor and the figure verifier do not report. No new agent.
- **Title.** The runner passes the outline entry's `title` to the drafter as the page's H1. The
  title joins the entry checksum in both copies, the runner's and the helper's `canonicalEntry`,
  kept identical, and the helper's reduced entry carries it.
- **Voice source (Geoff, 2026-09-30).** The drafter prompt says voice comes only from the register's
  drafting brief and its primary exemplar (`docs/extend/choose-an-ai-posture.md`); the page's two
  exemplars supply structure and detail per step, never voice or wording. The dry run shows the
  line in the rendered drafter prompt. This narrows the parent spec's "Exemplars" wording (take
  "structure, register, and detail per step"), an owed erratum task 4 lands.
- **Figures.** A figure page's drafter prompt names the `cairn-figure` skill file
  (`~/.claude/skills/cairn-figure/SKILL.md`) as a file to read and follow.
- **Cost.** New work: the runner has no `budget` use today. It returns `spent`, the
  `budget.spent()` delta across the run, following `pass-execute-chains.js:622`, guarded for an
  absent `budget`. Its unit is
  "output tokens spent this turn across the main loop and all workflows" (the runtime doc, as
  PC-1 quotes it), so it is a relative measure only, never a count against the ceiling.
- The header comment documents the rows, the friction route, and `spent`.

**Acceptance:** a dry run on one pilot page with stubbed agents shows the map path, the slug, and
the selection rule in the page-inputs prompt; the entry's `title` as the H1 in the drafter prompt
and in both checksums; the retag order in the page-inputs and fact-read
prompts; the `cairn-figure` path in a figure page's drafter prompt; the stubbed `rowsReceived`
and `rowsDisposed` in the record; stubbed `frictionFiled` values from page inputs, the drafter,
and the fact read in the record, and none from the register editor; and `spent` present in the
return with a stubbed `budget`. The dotfiles gate is green.

### Task 4: the release sweep and the owed errata

**Pass class:** `docs`. **Gate:** the dotfiles repo gate (`scripts/check.sh`) for the skill edit;
the diff-reviewer checks the errata against the 2a plan fold's "Owed errata"
(`2026-09-30-draft-docs-2a-plan-fold.md`).

**Files:** `~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md` (committed in
`~/.dotfiles`); `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md`;
`docs/superpowers/research/2026-09-30-docs-code-sync-prior-art.md`;
`docs/superpowers/specs/2026-09-30-docs-code-sync-design.md`;
`docs/superpowers/research/2026-09-30-docs-code-sync-fold.md`.

**Outcomes:**
- **`cairn-release` carries the release sweep** (spec, "Mechanism 2", every item in its
  `cairn-release` acceptance line) as a step before the version is set, for capability releases
  only (S8), with its first window seeded at `v0.98.0` (the planning sweep `86fd134c` ran after
  it).
- Edit by the actual text at each cited line, not this plan's paraphrase (pre-flight: the parent's
  "Each stage adds about 1M for planning" is at `:155-157`; its Exemplars text reads "(structure,
  register, detail per step)"; the prior-art record's `:38-41` is the ReCite/EMSE survey paragraph).
- **The parent's owed errata** (spec, "Amends the parent"), applied in place with a status-line
  note as the harvest fold's were: the Brief's "No new check is built" gains the option-coverage
  gate and "The budget goes to pages" gains the non-page shares; the stage flow's step 1 opens with
  the planning-phase sweep, the carrier that makes stages 3 to 5 plan it; the Budget's per-stage
  "about 1M for planning" names the measured 3.3M sweep and the up to about 7M more across stages
  3 to 5; stage 2's extend page count grows by the two sweep pages Geoff keeps.
- **The parent spec's exemplar erratum:** its "Exemplars" section says the drafter takes voice
  only from the register's brief and primary exemplar, and structure and detail per step from the
  page's two exemplars (task 3's voice-source outcome), with a status-line note.
- **The register's exemplar line** (task 3's implementer, 2026-09-30): `docs/internal/docs-register.md:220`'s "imitates its anatomy and rhythm" follows the same voice ruling as the parent's Exemplars erratum.
- **The prior-art record's erratum** (fold record, "Owed errata"): its lines 38 to 41 stop reading
  the sweep's corrected facts as resolved-but-stale drift; they were wrong when filed. Its
  missing-sources item is already closed by the addendum (FV-6).
- **The 2a plan fold's owed items:** the sync spec's Acceptance clause "and zero across all six
  is read there as a prompt failure" is struck with a status-line note citing PR-12; the sync
  fold record's FV-11 row gains a one-line amendment (rows reported beside each page's total).

**Acceptance:** the skill carries every item in "Mechanism 2" and the `v0.98.0` seed; each
erratum lands and the stage flow names the planning-phase sweep; the dotfiles gate is green.

### Task 4b: the workstation infra carries the system (Geoff, 2026-09-30)

**Pass class:** `docs` for prose edits, `engine-logic`'s gate for any tool or runner edit. **Runs
after task 4** (tasks 3, 4, and 4b all edit `~/.dotfiles`). **Gate:** `bash
~/.dotfiles/scripts/check.sh`, `claude-tooling-sync verify`, and, for any cairn-cms edit, `npm run
check:docs-gate` (light lane).

**Outcomes:**
- **Audit.** One agent inventories every workstation artifact that executes part of the docs-code
  sync system (skills, agent definitions, workflows, runners, the global and cairn-cms `CLAUDE.md`,
  `~/.claude/docs`, the repo's internal docs) and checks each against the shipped mechanisms: the
  facts container and its tags, the option map and `check:options` with the map rule and FV-10 retag
  order, the page chain's rows and friction route, the release sweep, and the S7 design-friction
  triage. It returns each gap with `file:line`, the executing step it belongs to, and the strongest
  form (tool, runner, agent definition or skill, then `CLAUDE.md`), with a checklist the close
  re-runs. Known candidates to confirm or refuse: `cairn-implementer` (an engine change adding a
  public option files its fact and map row in the same change), `cairn-pass`'s close step 5,
  `diff-reviewer`'s docs check, cairn-cms `CLAUDE.md`'s docs section (`check:options`), and whether
  `site-pass` or `engine-consult` need anything.
- **Fixes.** One implementer lands every accepted gap in its strongest form; each rule lands once,
  where it executes, and a side doc is never the only home.

**Acceptance:** the audit record committed under `docs/superpowers/research/`, each gap fixed or
refused with a reason; the gates green; one `diff-reviewer` read over both repos' diffs. Task 10
re-runs the checklist after the friction route's close shape lands.

### Task 5: re-arm extend

**Pass class:** `docs`, with `engine-logic`'s gate for the test edits. **Gate:** `npm run
check:docs-gate`, `npm run check:package`, and `npm test`, through `cairn-run-gate`, light lane.

**Files:** `docs/extend/README.md` (create), `scripts/checks/docs-links.mjs`,
`src/tests/unit/github-slug-contract.test.ts`, `docs/internal/record/harvest/relink.json`,
`docs/internal/facts/*.md` (the shifted `MarkdownEditor.svelte` cites only), and the option map
if a fact retag touches a mapped fact.

**Outcomes:**
- `docs/extend/README.md` is an interim index: a one-sentence statement that the arm is being
  rebuilt, one heading per outline group whose text is the group's `title` exactly (the
  `cairn-docs-outline link` helper locates a group by that heading and fails naming a missing
  one), and links to the kept pages: `choose-an-ai-posture.md` under Public site (it sets the
  robots posture), `upgrade-cairn.md` and `migration-notes.md` under Operate. Stage 5 rebuilds its prose; it takes no
  brief now.
- Every `LEGACY_PATH_MAP` value under `docs/extend/` that names a page not on disk points at the
  interim index, the `setup` rearms included, whatever their `action` text says; `relink.json`
  records each changed entry's interim target and the page that later repoints it.
- The slug-contract case for `Milestone 1: a bare SvelteKit site, deployed` keeps its markdown
  and expected id and moves to a source that exists and carries that heading shape, or to a
  synthetic source the test marks as synthetic; the test itself asserts the source file exists
  unless the case is marked synthetic.
- `relink.json` entries whose restoring page is in 2b are retagged `"2b"`: join the outline's
  `rearms[].relinkIndex` to `relink.json` `entries[]` and retag every entry whose `rearms[].batch`
  is `2b` (32 at pre-flight, the 7 `restoredBy: "close"` included); `pilot` (68) and `2a` (17)
  stay `2a`. `relink.json` itself carries only `stage` (pre-flight, 2026-09-30).
- Fact `f:dzmj90` (the slug-contract case) is updated to the case's new source and its stale cite
  (`:70-74`, now `:78-83` before the move). `f:e5hqn3` is wrong at HEAD (the scaffold comment at
  `svelte.config.js:50-55` no longer names "Wire the dev backend and the CSRF handoff"): rewrite it
  to what the comment says or retag it `[docs-drift]`, and check its outline reference
  (`extend.json:1946`). Neither fact is in the option map (pre-flight).
- The `MarkdownEditor.svelte` fact cites the ROADMAP flags as shifted resolve to the current
  lines (seven bullets: `facts/reference.md:10,24` and five in `facts/editors.md`), and the one
  sentence at `ROADMAP.md:1031` that flags them is edited out with its trigger note; the larger
  pointer-drift item around it stays (pre-flight).

**Acceptance:** the gate is green; `readArmStates` (`scripts/checks/arm-state.mjs`, no CLI; run it
with `node -e`) reports extend `rebuilt`; the diff-reviewer greps
`LEGACY_PATH_MAP` and finds no extend value off disk.

### Task 6: the pilot

**Pass class:** `docs`. **Gate:** the chain's per-page gate (above). **Depends on:** tasks 2, 3,
and 5.

**Pages:** the six pilot pages, from the outline, `bothReviewers: true`, with the defect
`extraChecks` for `theme-your-public-site`.

**Outcomes:** each page's brief at `docs/internal/briefs/extend/<slug>.json`; new facts filed by
page inputs; each page's pending map rows disposed; each record carrying its cross-regression
flag, its rows received and disposed, and its `frictionFiled`. A figure page gets its
`figure-verifier` read. The post-run commit lands with the stage record.

**Acceptance:** each page is `accepted`, or escalated and resolved by a re-dispatch (page inputs
re-run for a stranded row) or a recorded conductor ruling before task 7; `check:provenance` green
on each brief; the option gate green with no pending row naming a pilot slug; each page's
`rowsReceived` matches its selection count, which the post-run implementer computes at the
pre-pilot commit (`git show <sha>:<map>`) and writes beside it, a mismatch noted in the stage
record; the post-run commit and the run's `/cost` delta in the ledger.

### Task 7: the pilot checkpoint

**Conductor-led.**

- The conductor re-derives every share per the parent spec's "Pilot checkpoint", from the stage
  record and task 6's `/cost` delta: the per-page cost; task 8's share scaled from the pilot's
  per-page cost by outline `factIds` (the pilot averages about 57 per page, task 8's pages about
  26), not a flat mean; the cross-regression rate beside its qualifying-page count, where a page
  qualifies when exactly one of the register editor and the fact read returned `fix` in round 1 (the
  figure verifier does not count); the full-scope total against the 20M flag, where at or over the
  flag the combined question carries it; and the mechanisms' measured cost against their 1.2M, the
  release sweep's excluded since the pilot never exercises it.
- The checkpoint reports, per pilot page, the map rows received and disposed beside the page's
  total (FV-11), and the `frictionFiled` entries per page.
- A Sonnet agent publishes the three owner-read pages on one R10 page (`scripts/docs-review/`).
- STATUS is written; Geoff reads the three pages and answers one combined question: the chain for
  task 8 (lean or both-reviewer, with the rate and its measured cost), the scope that plans within
  the ceiling if the full scope does not, and the initiative ceiling with the planning-phase
  sweeps of stages 3 to 5 priced at the measured 3.3M each, scaled to their surfaces (up to about
  7M more against R8's 30M). The same question asks whether the task 10 merge is pre-authorized.
- A Sonnet agent diffs his saved version against the repo, applies it with the briefs, runs the
  scoped reviews and `npm run check:docs-gate` through `cairn-run-gate` (light lane), commits, and
  reports; one `diff-reviewer` reads the fold's file set. The conductor turns any note that
  generalizes into a rule where it runs (register, drafter prompt, or runner); a runner change
  takes task 3's gate and a `diff-reviewer` read.

**Acceptance:** his answer and the fold's gate-green commit recorded in the ledger; the
scoped-review verdicts in the stage record, any `fix` applied before the commit; no task 8
dispatch before the answer.

### Task 8: the rest of 2a

**Pass class:** `docs`. **Gate:** the chain's per-page gate.

**Pages:** `scaffolded-site-files`, `restrict-admin-access`, `add-a-second-sign-in-group`,
`rotate-the-github-app-key`, `debug-your-site`, on the chain task 7 chose, with the defect
`extraChecks` and Geoff's fold notes applied to the drafter's inputs.

**Acceptance:** as task 6.

### Task 9: consistency read and relink

**Pass class:** `docs`, with `engine-logic`'s gate for any script edit. **Gate:** the string `node
scripts/checks/gate-tier.mjs --range <base>..HEAD` prints, `<base>` being task 8's post-run commit
(ledger), since relinks reach `src/lib`, showcase code, and emitted files the docs gate cannot see.

- One Opus 5.5 agent reads the 11 new pages, the interim index, and the three kept pages for
  terms (against the outline's term list), cross-links (against its `crossLinks`), overlap, and
  uneven depth. It returns the parent spec's record: every page read and each finding with
  `file:line`, class, and proposed edit. It also sweeps alt text, figure labels, and nav-label
  strings for the register's tells (ROADMAP Next, "the first rebuild stage that writes those
  strings").
- The implementer applies the batch under the edit rule, runs the scoped reviews, repoints every
  2a page's `LEGACY_PATH_MAP` entries, restores every relink entry the outline keys to a pilot or
  2a page (never a `close` entry), with any kept-page pointer changed together with that page's
  brief, runs `npm run emit:template` when an emitted showcase file changes, and prunes the
  `check-symbols-allowlist.mjs` entries whose rearm the outline keys to a pilot or 2a page.
- The batch fixes the three reference sentences `main`'s friction log names: the `Env`
  "collapses to `{}`" claim at `docs/reference/sveltekit.md:805` and, after probing it,
  `docs/reference/auth-channel.md:38`; and the `vocabularySaveAction` path at
  `docs/reference/sveltekit.md:1207`. The code comments stay in the log for an engine pass.

**Acceptance:** the record committed under `docs/superpowers/research/` with each finding applied or
refused with a reason; the scoped-review verdicts in the stage record, any `fix` applied before the
commit; the gate green; every `relink.json` entry tagged `2a` shows its restoring commit, and the
diff-reviewer confirms none is left open.

### Task 10: close

Run `cairn-pass`'s close:
- Merge `main` into the branch, then `code-simplifier:code-simplifier` over the pass's changed
  `.mjs` and `.ts` in this repo; the full gate (`npm test`, `npm run check:close`, `make -C tool
  check`).
- The 11 rebuilt paths appended to `docs/internal/briefs-rebuilt.json`.
- **`CONTRIBUTING.md` gains a section on how the docs stay true (Geoff, 2026-09-30):** the facts
  container, the option map and `check:options`, `check:facts`, and what a change must file to pass
  the docs gate, written from the shipped mechanisms to the contributor audience's standard; the
  page chain is named only as maintainer tooling. The evaluator's claim waits for stage 5 (ROADMAP,
  "Tell outside developers how the docs stay true").
- `CHANGELOG.md` under `## Unreleased`: the 11 pages and the interim index added, the five
  absorbed paths and their successors, and, if `skills/` changed in this pass, a `Consumers
  must:` line to re-run `npx cairn-guidance install`, which the diff-reviewer checks.
- The outline's `redirects` written as redirect rows into
  `docs/internal/record/2026-09-22-cairn-pub-docs-handoff.md`.
- Re-run task 4b's infra checklist against the close state and fix any gap it finds.
- **Design friction (S7):** the fold agent, never the conductor, reconciles every `frictionFiled`
  entry in the stage records against the log, verifies each against the code, and triages
  complete-or-move under the log's rules: routed to an engine pass through the `ROADMAP.md` tier
  where it bites (tagged as simplifying a named page), or deleted with a reason. Before promoting
  an engine change it reads `docs/internal/engine-rulings.md` and runs the charter's premise test
  (EXB-5 sits against the ruling `audit-adapter-imagefield`).
- The rest of the friction log triaged complete-or-move; ROADMAP updated (the kept-page fix and
  the `MarkdownEditor` cites leave Next; the docs-code sync initiative marks option coverage, the
  friction route, and the release sweep shipped).
- STATUS rewritten with stage 2b as the next action (its pages come from the outline; no new
  brainstorm unless the pilot answer cut scope); HISTORY entry with the pilot's measured per-page
  cost, the cross-regression rate and qualifying count, the map's generated and pending counts at
  creation and at close, the `frictionFiled` count and each entry's triage outcome, the
  mechanisms' measured cost, the release sweep's `v0.98.0` seed, what the gates caught, and
  whether any refused plan-review finding turned out real; this plan's post-mortem with both
  budgets scored and task 1's lock recorded as an S2 instance.
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
| R10 approval (https://claude.ai/artifact/NCSX7CjAdvCJ5cwQK78kds) and outline fold (keep or cut: `configure-media`, `run-cairn-audit-on-your-site`) | outline at `8cc4d328`, no fold (saved version identical) | approved by Geoff 2026-09-30, both sweep pages kept | conductor |
| 2 | `14297445`, `ba57f8e8` (one fix round: header root list) | accept | implementer ~0.45M, reviews ~0.1M (attribution only) |
| 2 counts | 30 roots (27 exports), 264 generated, 156 pending at creation, 152 after the fix round; pilot pending/fact rows: security-model 0/3, add-cairn-to-a-sveltekit-app 14/12, add-a-custom-admin-screen 5/2, replace-magic-links-with-cloudflare-access 1/2, architecture 0/10, theme-your-public-site 6/0 | | |
| 3 | dotfiles `b4cff06`, `7e2a304` (two hardening items from the review: the fact read blocks on any row still pending the page's slug; the multi-row retag order) | accept | implementer ~0.2M, review ~0.07M (attribution only) |
| 4 | cairn `74a3b0dc`, `cd3a1869`; dotfiles `9fc2689`, `865b7dc` (one fix round: the 47-page total, the unrestated stage 2 row, `grep -e` under ugrep) | accept | implementer ~0.1M, review ~0.06M (attribution only) |
| 4b | audit record and fixes cairn `6a6bb54b`; dotfiles `2936c23` (7 gaps landed, 8 refused; gap 4's post-merge pending target and gap 5's voice line are conductor rulings) | accept | audit ~0.12M, implementer ~0.07M, review ~0.05M (attribution only) |
| S1 boundary | merge `3e19de2a`; friction DAD-1, EXB-4, EXB-5, and the unlinted `scripts/` (`39bd5faf`); README slug skip and the verified drift routine (`12b97d1e`) | done | ~0.1M |
| 5 | `f6cee04f`, `98f0c17e`, `1311ebc3` (one fix round: 11 interim relink entries repointed by 2b pages retagged `2b`; relink stages now 2a 74, 2b 43) | accept | implementer ~0.12M, review ~0.07M (attribution only) |
| 6 pre-pilot commit | the ledger commit that adds this row (map selection counts are computed at it) | | |

## Post-mortem
