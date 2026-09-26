# Draft docs pass 0+1: setup and reference

**Goal:** Stand up the lean page chain, the four check extensions, the docs gate, and the R10
review page; lift the narrative-arm freeze where it is enforced; settle the stale owner facts;
and check every reference page's claims in place.

**Spec:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` (commit `0fbbaa13`),
"Stage 0 acceptance" and "Stage 1: reference". Executors read both. Where this plan and the spec
disagree, stop and report.

**Approach:** Land the rules and the checks first, since every later task gates on them. Then
the chain and the review page, proven together on one scratch page in one owner sitting that
also settles the owner facts. Stage 1 runs last, on the finished docs gate. Plans specify
outcomes and acceptance, never implementation code.

**Execution mode:** `pass-execute` (by name) for the cairn-cms tasks 1, 3, 4, 5, 6, and 8, in the
segments below, with `implementer: "cairn-implementer"`, `reviewer: "diff-reviewer"`, and
`commonNotes` carrying the global constraints and the `code-simplifier` step. Tasks 2 and 7 touch
`~/.dotfiles`, which the runner's single `repo` cannot hold, so each runs as an Agent-tool chain
(a Sonnet implementer at `high`, then `diff-reviewer`), task 2 alongside segment A and task 7
after task 6. Task 9 is conductor-led,
because it needs the Artifact tool and one owner sitting. Task 10 is a conductor fan-out of
fact-read agents through the Agent tool. Task 11 is the close, authored by one fold agent with
one independent `diff-reviewer` read.

**Token ceiling:** 6M (stage 0's 2.5M plus stage 1's 3.5M), flag at 4.8M. **Counting rule:** what
`/cost` reports for the conductor session (spec, "Budget"). Task 1's pre-flight records whether
`/cost` includes subagent and workflow agents; if not, the conductor names the counter it uses
instead in the ledger at the foot of this file before task 2.

**Segments and checkpoints:** four segments, each boundary on a gate-green commit:
- Segment A: tasks 1, 3, 4, and 5 (independent; `parallel: true`, disjoint files), with task 2's
  chain alongside.
- Segment B: tasks 6 and 8 through `pass-execute`, then task 7's chain (it needs 6's gate script).
- Segment C: task 9 (conductor-led, the one owner sitting).
- Segment D: tasks 10 and 11.

At each boundary the conductor writes the ledger at the foot of this file (tasks, spend, decisions,
next task), never `docs/STATUS.md` until task 11.

**Worktrees:** cairn-cms work runs in `.claude/worktrees/draft-docs-0`, branch `draft-docs-0`, off
`main`, `npm ci` once before task 1. Workstation files (skills, the workflow, the agent, the global
`CLAUDE.md`) live in `~/.dotfiles` on `main` and commit there, path-limited. Before segment A,
the conductor checks `~/.dotfiles` for warm changes it did not author (at plan time:
`claude/.claude/skills/spec-plan-review/SKILL.md` modified and `claude/.claude/skills/synced/`
untracked); no task touches or commits those paths. Tasks 2 and 7 are the only dotfiles tasks and
never run at the same time.

**Models:** Sonnet implementers at `high`; `claude-opus-5-5` for every `diff-reviewer`, the fact
reads in task 10, and task 11's fold. Tasks 3 and 5 touch Go under `tool/`: `go-conventions`
applies, and `golang-spf13-cobra` for anything under `tool/cmd/cairn`.

**Gates:** cairn-cms: `cairn-run-gate 'npm run check && npm test'` for script tasks, plus
`make -C tool check` with `CAIRN_GATE_LANE=light` for tasks touching `tool/`. Once task 6 lands,
`npm run check:docs-gate` (task 6's script name) joins every docs-touching task. Dotfiles:
`scripts/check.sh`. `code-simplifier` runs over each code task's diff before its commit.

## Global constraints

- The narrative arms (`docs/admin/`, `docs/editors/`, `docs/extend/`, `why-cairn.md`) get no prose
  rewrites in this pass. Task 10 edits `docs/reference/` in place only.
- No release, no version bump, no `package.json` version change. `## Unreleased` gets entries only
  for public behavior changes (none expected; the check extensions are internal).
- Every new or changed check fails loud on its own planted defect in a unit test. No check passes
  on an empty input it is meant to guard (spec, "Brief coverage", "Flag pairing").
- Code comments follow TSDoc (scripts) or Go Doc Comments (tool); no em dash in comments.
- Facts edits pass `check:facts`; facts are written with the Edit tool, never a shell append.
- Memory files under `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/` are edited
  in place; `MEMORY.md` lines stay one per memory.

## Review focus

1. A docs page with a `cairn` line inside a non-shell fence (```` ```text ````, an untagged fence):
   the flag-pairing check must not read it, and must not silently pass a shell-tagged fence it
   failed to parse. Task 3 plants both.
2. A command path that is a prefix of another (`cairn doctor` vs a hypothetical `cairn doctor
   fix`): the longest-match rule must pick the longer path. Task 3 plants it.
3. The brief-coverage list names a path that no longer exists (a page removed after its stage):
   the check reports the stale list entry, not a missing brief. Task 4 plants it.
4. A released tag's anchor removed from `is-it-working.md` in the same change as its
   `conditions.ts` entry: `check:readiness` must still fail. Task 5 plants it.
5. The R10 page saved by a viewer who is not a writer, or a save that conflicts: the page shows a
   read-only view or reloads, and the conductor never applies a partial version. Task 8 covers the
   read-only branch; task 9's round-trip record notes the version it applied.

---

### Task 1: Freeze lift and rule sweep, cairn-cms side

**Files:** `CLAUDE.md`, `docs/internal/facts/README.md`, `docs/internal/docs-register.md`,
`ROADMAP.md`, `docs/STATUS.md`.

**Outcome:** Every cairn-cms file that enforces the narrative-arm freeze or the "a site-pass
agent never edits the cairn-cms checkout" rule states the new rule (spec, "Stage 0 acceptance",
"Freeze lift" and "Site-pass rule"): the freeze lifts per arm at its stage merge (extend's at the
2b merge), and site-pass agents edit on a `site-docs/<site>-<pass>` branch off `main`, merged by PR
under the docs gate; a site edit to an arm whose stage is in flight is filed, never fixed.
`CLAUDE.md` stops citing the missing `docs-is-a-pass-dimension` memory. The ROADMAP "Now" entry
names the spec, drops the retired inputs (the six-audience ruling, the profile format, the reader
harness line), moves the designer theme-guide input into "stage 2 outline, required topic", and
leaves the Toward 1.0 claims audit as its own gate. STATUS's "Immediate next action" points at
this plan.

**Acceptance:**
- `grep -rn` for the old freeze and cross-repo wording ("frozen against rewrites", "never edits the
  cairn-cms checkout", "after the site round") across these five files returns only new text.
- The "Documentation is a pass dimension" section still says the reference arm is maintained
  every pass under `check:reference`.
- `check:docs` and `check:vale` green on the changed files.

### Task 2: Freeze lift and rule sweep, workstation side

**Files (in `~/.dotfiles/claude/.claude/`):** `skills/site-pass/SKILL.md`,
`skills/engine-consult/SKILL.md`, `skills/cairn-pass/SKILL.md`, `skills/writing-voice/SKILL.md`,
`CLAUDE.md`. Memory files: `docs-rebuild-not-edit.md`, `docs-reset-initiative.md`, and their
`MEMORY.md` lines.

**Outcome:** The same freeze and write-path rule as task 1, in the skills that execute it. The
`site-pass` skill also tells a site-pass agent to follow the admin and extend pages exactly as
written during the round, and to fix or file every divergence under the spec's "Edits after the
chain" rule (brief updated in the same change; new facts filed `[candidate]` by the editing
agent). Rule 2 scope (R9): the `writing-voice` skill's "stop after each section" line and the
global `CLAUDE.md` Writing voice summary say section-by-section drafting governs cairn front-door
drafting only, and the `CLAUDE.md` line stops reading as a page-structure rule. The
`docs-reset-initiative` memory drops "the six-audience ruling" as a survivor and points at the
spec; `docs-rebuild-not-edit`'s freeze rule says the freeze lifts per arm.

**Acceptance:**
- The same grep as task 1 across these files returns only new text.
- `~/.dotfiles/scripts/check.sh` green; `claude-tooling-sync verify` green.
- Commit is path-limited and touches none of the warm paths named in the header.

### Task 3: Flag pairing for `check:symbols`

**Files:** the Go test that writes `tool/testdata/flags.json`
(`TestCommittedFlagListMatchesTheCommandTree`, run by `make -C tool flags`), `tool/testdata/flags.json`,
`scripts/checks/check-symbols.mjs`, and its unit tests under `src/tests/unit/`.

**Outcome:** `flags.json` carries, alongside its existing flag list, a map from each command path
to the long flags it accepts, inherited ones included, written by the same Go test and checked by
it against the cobra tree. `check:symbols` resolves each `cairn` line in a shell-tagged fence: the
command path is the longest run of leading words that matches the map; the line fails when its
first word is not a command (with or without flags) and when a flag is not accepted on the matched
path. Non-shell fences are not read. `npx create-cairn-site` flag handling is unchanged.

**Acceptance:**
- Unit tests plant, each failing with a message naming file and line: an unknown subcommand with no
  flags; a real flag on the wrong command; a prefix path where the longer match is correct (Review
  focus 2); a `cairn` line in a `text` fence that must be ignored and one in a `sh` fence that must
  be read (Review focus 1).
- `make -C tool flags` regenerates the file byte-identically on a clean tree; `make -C tool check`
  green (light lane).
- `npm run check:symbols` green over today's docs, or each failure it finds is a real doc defect
  listed in the report (fixed in `docs/reference/` only; narrative-arm defects are filed as facts
  `[docs-drift]`).

### Task 4: Brief coverage for `check:provenance`

**Files:** `scripts/checks/check-provenance.mjs`, a new committed list (for example
`docs/internal/briefs/rebuilt.json`), `docs/internal/briefs/README.md`, unit tests.

**Outcome:** `check:provenance` reads a committed list of rebuilt page paths and fails any listed
path with no brief. The list starts empty. The README documents the list, that each stage merge
appends its rebuilt paths, and the brief naming rule: arm READMEs brief under their own arm's
track (`briefs/admin/README.json`), and only `why-cairn.md` and `docs/README.md` use
`front-door`.

**Acceptance:**
- Unit tests plant: a listed path with no brief (fails); a listed path whose page no longer exists
  (fails, reported as a stale list entry, Review focus 3); an empty list with no briefs (passes and
  prints that nothing is rebuilt yet).
- Per-brief mode (`npm run check:provenance -- <brief>`) behaves as before.

### Task 5: Shipped-anchor list for `check:readiness`

**Files:** `scripts/checks/check-readiness.mjs`, a new committed append-only anchor list, unit
tests. Read, not changed: `tool/internal/health/fixes_test.go`, `tool/internal/doctor/check_referrer.go`,
tag `tool/v1.1.0`'s `conditions.json`.

**Outcome:** A committed append-only list snapshots the `is-it-working` fragments released binaries
print: the `docsAnchor` values in `tool/v1.1.0`'s `conditions.json` (from `git show`), plus
`check_referrer.go`'s one. `check:readiness` also fails when any listed anchor does not resolve as
a heading slug in `docs/admin/is-it-working.md`. A header comment in the list says a new tool tag
appends its anchors and nothing is ever removed.

**Acceptance:**
- A unit test renames a heading and its `conditions.ts` entry together and `check:readiness` fails
  (Review focus 4).
- The list's entries equal the set extracted from the tag at plan time (the spec records it equal
  to today's `conditions.ts` set); the task report states the count.
- `npm run check:readiness` green on today's tree.

### Task 6: The docs gate script, and the editor-quotes floor

**Files:** `package.json`, `.github/workflows/test.yml`, `scripts/checks/check-editor-quotes.mjs`,
its unit test.

**Outcome:** One script, `check:docs-gate`, runs the checks the spec lists under "Docs gate":
`check:docs`, `check:vale`, `check:facts`, `check:provenance`, `check:symbols`, `check:snippets`,
`check:transcripts`, `check:visuals`, `check:arm-indexes`, `check:editor-quotes`,
`check:readiness`, `check:tool-conditions`, `check:target-stack`, `check:reference`, and
`check:reference:signatures`. `test.yml` calls it in place of those separate steps; `check:package`
keeps its own step. `check:editor-quotes` fails when the page it pins carries zero quotes.

**Acceptance:**
- `npm run check:docs-gate` green on the worktree after tasks 3 to 5 merge in.
- Every check that `test.yml` ran before still runs in CI (the task report lists the before and
  after step names).
- A unit test for the zero-quote floor fails on a page stripped of its quotes.

### Task 7: The lean page chain and the drafter

**Files:** `~/.dotfiles/claude/.claude/workflows/docs-page-chain.js`,
`~/.dotfiles/claude/.claude/agents/cairn-docs-drafter.md`; in cairn-cms,
`docs/internal/briefs/README.md` and `docs/internal/facts/README.md` ("New facts from the page
chain").

**Outcome:** The runner matches the spec's "The page chain" and "Scoped re-review": no
`args.profile` and no profile grader; a page-inputs step (job, type, two trimmed exemplar excerpts,
fact ids, a claim inventory with a disposition per claim, new facts filed `[verified]` or
`[external]` with the Edit tool); `cairn-docs-drafter` as the drafter, filing no facts; the gate
string from `args.gate` (the conductor passes `check:docs-gate` with Vale and provenance scoped to
the page); the two reviews in parallel, the fact read also checking every inventory claim marked
carried or filed; one redraft; by default only the reviewer that returned `fix` re-reads, with an
`args.bothReviewers` switch; when both re-read, a per-page cross-regression flag derived from
`record.rounds[].reads`; a per-page record carrying the brief path and the page-inputs output. The
drafter definition drops the audience-profile input and files no facts. Both READMEs stop naming
`docs-page-chain-v2.js`; the facts README says the page-inputs agent files new facts and the
drafter never does, and the fact read is independent of the drafter.

**Acceptance:**
- The runner's header comment documents every arg it reads; `grep` finds no `profile` arg or
  grader stage.
- `~/.dotfiles/scripts/check.sh` green; cairn-cms docs gate green on the two READMEs.
- The live proof is task 9's scratch-page run; this task's report names what that run must show.

### Task 8: The R10 review page template

**Files:** a new directory `scripts/docs-review/` in cairn-cms: one HTML template and one small Node
script that embeds a batch of markdown files (paths and contents) into a copy of the template for
publishing. Unit test for the embed script.

**Outcome:** The implementer has no Skill tool, so the conductor pre-extracts into the task notes
the page contract from the `artifact-design` skill and the `artifact` and `comments` sections of
the `artifact-capabilities` skill, with the paths of its `artifact.d.ts` and `comments.d.ts` type
definitions for the implementer to read. The page shows each file in the batch rendered, with an edit mode per file; a save regenerates the
whole document from its embedded state and publishes it through the `artifact` capability; it
declares `comments` with `composer_only` for passage comments. It follows the Artifact page
contract (title, `:root` tokens with dark mode, phone-width layout). A viewer who cannot write sees
a read-only view (Review focus 5). The embedded state keeps each file's path and exact markdown,
so a read-back yields the files byte for byte.

**Acceptance:**
- The embed script's test round-trips three markdown files carrying a code fence, a table, and a
  backtick span through embed then extract, byte-identical.
- The template passes the Artifact contract checklist in `artifact-design` (the report lists it).

### Task 9: Chain proof, review-page round trip, and owner facts (conductor-led)

**Outcome:** Three things, one owner sitting.
1. **Owner facts, verified first.** A Sonnet implementer checks each of the four STATUS items
   against its source and reports the fact and a proposed edit: the rule count in
   `docs/internal/what-cairn-is-and-is-not.md:49` against the audit's rule modules; `f:ab9kzr`
   against the registry (`npm view @glw907/cairn-cms version`); `f:75hawi` against Cloudflare's
   published free-tier limits; `docs/why-cairn.md:41` against its line 84. Items whose fix is a
   plain fact are applied; only owner wording goes to Geoff.
2. **Chain proof.** The conductor runs `docs-page-chain` (by name) on one scratch page on a
   throwaway branch off `draft-docs-0`: one extend page chosen by the conductor, drafted to its
   real path, never merged. The per-page record shows the brief path, the page-inputs output with
   its claim inventory, both reviews, and no grader read.
3. **Review-page round trip.** The conductor publishes the scratch page through task 8's template,
   Geoff edits one sentence and leaves one comment, and the conductor reads back the saved
   version, diffs it against the branch, applies the diff with the brief updated, and runs
   `check:provenance` on that brief.

The sitting is one combined message to Geoff: the review page link, with the owner-wording
question for the facts on the same page or alongside it.

**Acceptance:**
- A record at `docs/superpowers/research/2026-09-26-draft-docs-pass-0-1-proof.md` with the chain
  record's summary, the chain's measured cost, the published and saved version ids, the applied
  diff, and `check:provenance` green. If the round trip was clumsy, the record says how, and the
  conductor asks Geoff before switching to PR review.
- The four owner-fact items are edited and retagged, `check:facts` green, and their STATUS line is
  gone (applied on `draft-docs-0`, not the throwaway branch).
- The throwaway branch is deleted after the record is committed.

### Task 10: Stage 1, reference claim check

**Outcome:** One `claude-opus-5-5` fact-read agent per page for the 29 pages in `docs/reference/`
other than its README, dispatched by the conductor in parallel batches of up to six. Each agent
checks every prose claim on its page against the facts container, the export surface
(`npm run package` output), and the code; fixes each discrepancy in place on `draft-docs-0`; files
or retags facts where the container is stale; and returns a per-page record: claims checked,
discrepancies found, fixes made, anything it could not settle. The three CLI contract pages
(`cli-cairn-*.md`) also gate on `make -C tool check`.

**Acceptance:**
- A stage record at `docs/superpowers/research/2026-09-26-draft-docs-stage-1-record.md` lists all
  29 pages; a page missing from it fails the task.
- `npm run check:docs-gate` and `make -C tool check` green after the fixes.
- Any structural problem found (a page that needs a rebuild, not a fix) is listed for Geoff in the
  close, not fixed.

### Task 11: Close

**Outcome:** One fold agent authors the close and one independent `diff-reviewer` reads its diff.
`docs/HISTORY.md` gets the pass entry (what landed, what the gates caught, measured cost against
the 6M ceiling, the chain proof's per-page cost, and what a later pass would be wrong to
rediscover). `docs/STATUS.md` carries the current shares, reset from the measured cost, and the
next action: the stage 2a plan, with its extend outline, to be written and reviewed on an R10
page. `CHANGELOG.md` `## Unreleased` gets entries only if a public behavior changed. The PR merges
`draft-docs-0` to `main` after the docs gate and `make -C tool check` pass in CI.

**Acceptance:** STATUS at or under 60 lines; the memory index points at the spec; the pass score
records tokens against the ceiling, planning misses, and execution sittings (task 9's sitting
counts as one).

## Ledger

(written by the conductor at each segment boundary)
