# Draft docs pass 0+1: setup and reference

**Goal:** Stand up the lean page chain, the four check extensions, the docs gate, and the R10
review page; lift the narrative-arm freeze where it is enforced; settle the stale owner facts;
and check every reference page's claims in place.

**Spec:** `docs/superpowers/specs/2026-09-26-draft-docs-approach-design.md` (commit `0fbbaa13`),
"Stage 0 acceptance" and "Stage 1: reference". Executors read both. Where this plan and the spec
disagree, stop and report, except this plan's intended departures from the spec's page-chain
description: task 10's read-only fact-read agents with per-batch apply commits, the section split
for the five largest reference pages, and reporting (never editing) released tool contract content.
Review record: `docs/superpowers/research/2026-09-26-draft-docs-pass-0-1-fold.md`.

**Approach:** Land the rules and the checks first, since every later task gates on them. Then
the chain and the review page, proven together on one scratch page in one owner sitting that
also settles the owner facts. Stage 1 runs last, on the finished docs gate. Plans specify
outcomes and acceptance, never implementation code.

**Pass class (amended 2026-09-27, Geoff, after segment B's task 6):** `engine-logic` for the
remaining code tasks 7 and 8 (internal checks, scripts, and the workstation runner), `docs` for
task 10, and task 9 stays conductor-led. Under `engine-logic` each task keeps the repo's full gate
it already ran, and the reviewer blocks on behavior defects and unmet outcomes, and on coverage gaps
only where they touch reachable behavior. `code-simplifier` runs once, at the close (task 11), over
the pass's changed code, never per task. Tasks 1 to 6 ran before the amendment under the per-task
simplifier. Task 6's segment B commit also carries one line the ROADMAP owed to the next pass
touching `test.yml`: CI now runs `check:tool-heuristics` beside `check:tool-conditions`.

**Execution mode:** `pass-execute` (by name) for the cairn-cms tasks 1, 3, 4, 5, 6, and 8, in the
segments below, **sequential** (`parallel` unset): the runner does no worktree isolation (`repo`
is "prompt text only", `pass-execute.js:32-33`), so parallel tasks would share one index, one
`base..HEAD` range, and one `cairn-run-gate` key, and every heavy gate queues on one machine-wide
lock anyway. `pass-execute-chains` would isolate them but needs a worktree, an `npm ci`, and a
merge per chain, which costs more than the lock-bound parallelism saves. Args:
`implementer: "cairn-implementer"`, `reviewer: "diff-reviewer"`, `commonNotes` carrying the global
constraints and the `code-simplifier` step, and `gate` as the bare string (the runner wraps it in
`cairn-run-gate` itself). Tasks 2 and 7 touch `~/.dotfiles`, which the runner's single `repo`
cannot hold, so each runs as an Agent-tool chain (a Sonnet implementer at `high`, then
`diff-reviewer`); task 2 runs alongside segment A (separate repo, separate gate), task 7 after
task 6. Task 9 is conductor-led, because it needs the Artifact tool and one owner sitting. Task 10
is a conductor fan-out of read-only fact-read agents plus one apply implementer per batch. Task 11
is the close, authored by one fold agent with one independent `diff-reviewer` read.

**Token ceiling:** about 9.6M, flag at about 7.7M, the planned spend, so the flag then marks an
overrun rather than a predictable midpoint (spec:149-150). Derivation: stage 0's 2.5M share plus
task 9's chain proof (one short extend page on the lean path, about 0.65M, which the spec's 0.2M
review-page line does not cover), so about 3.2M; stage 1 at about 4.5M (below; figure per the fold record's task 10 line,
`docs/superpowers/research/2026-09-26-draft-docs-pass-0-1-fold.md:110`). Planned spend is
about 7.7M; the ceiling adds headroom above it rather than sitting at it. This is a method call
inside R8's 30M initiative ceiling: it moves stages 0 and 1 from 6M to about 7.7M planned, which
narrows the spec's roughly 3M arm-page headroom to about 1.3M. The spec resets every share from
measured cost and puts the scope gap to Geoff at the stage 2 pilot checkpoint, so the close
carries this into STATUS as an input to that question, not a new one. Task 10's first-batch
projection checkpoint (below) stays the pass's one budget question; the 7.7M flag exists only to
catch an overrun past it. **Counting rule:** what `/cost` reports for the conductor session (spec,
"Budget"). Before segment A, the conductor itself records in the ledger whether `/cost` includes
subagent and workflow agents; if not, it names the counter it uses instead.

**Segments and checkpoints:** four segments, each boundary on a gate-green commit:
- Segment A: tasks 1, 3, 4, and 5 through `pass-execute`, sequential, with task 2's chain alongside.
- Segment B: tasks 6 and 8 through `pass-execute`, then task 7's chain (it needs 6's gate script).
  At this boundary the conductor pushes `draft-docs-0`'s head commit to the remote and records
  `gh pr checks` for that head SHA on task 6's draft PR in the ledger before segment C; a red run
  re-dispatches task 6 with the failing step named, and the boundary does not close until the run
  is green.
- Segment C: task 9 (conductor-led, the one owner sitting).
- Segment D: tasks 10 and 11.

At each boundary the conductor writes the ledger at the foot of this file (tasks, spend, decisions,
next task); this governs conductor writes only. It does not reach `docs/STATUS.md` until task 11,
except tasks 1 and 9's own named STATUS edits (the "Immediate next action" line and the four
owner-fact items).

**Worktrees:** cairn-cms work runs in `.claude/worktrees/draft-docs-0`, branch `draft-docs-0`, off
`main`, `npm ci` once before task 1. Task 9's proof runs in its own worktree (below). Workstation
files (skills, the workflow, the agent, the docs, the global `CLAUDE.md`) live in `~/.dotfiles` on
`main` and commit there, path-limited. They are stow symlinks, so an edit reaches every live
session when written: tasks 2 and 7 write each file once, whole, never incrementally. Before
segment A, the conductor checks `~/.dotfiles` for warm changes it did not author (at plan time:
`claude/.claude/skills/spec-plan-review/SKILL.md` modified and `claude/.claude/skills/synced/`
untracked); no task touches or commits those paths. Tasks 2 and 7 are the only dotfiles tasks and
never run at the same time.

**Models:** Sonnet implementers at `high`; `claude-opus-5-5` for every `diff-reviewer`, the fact
reads in task 10, and task 11's fold. Task 3 touches Go under `tool/cmd/cairn`: `go-conventions`
and `golang-spf13-cobra` apply. Task 5 only reads Go.

**Gates:** `pass-execute` runs the string `scripts/checks/gate-tier.mjs` prints for each task's
diff, not the plan's; the plan's `npm run check && npm test` is the fallback when the classifier
prints nothing. Task 6 makes the classifier's docs tier call `check:docs-gate`, so from segment B
on every docs-touching task runs the one docs gate. The light lane (`gateLane: "light"`) applies
only to a gate that is `make -C tool check` alone; a mixed diff (task 3: `tool/` plus scripts,
tier `scripts+tool`) runs the heavy lane, since its `npm test` launches a browser suite. Task 6
touches `package.json` and `.github/` and so runs the `full` tier; that is accepted. Conductor-run
gates (task 9) call `cairn-run-gate` directly. Dotfiles: `scripts/check.sh`.
`code-simplifier` runs once at the close (see "Pass class"), not per task.

## Global constraints

- The narrative arms (`docs/admin/`, `docs/editors/`, `docs/extend/`, `why-cairn.md`) get no prose
  rewrites in this pass. Sanctioned exceptions: a discovered deficiency (a wrong fact, a stale
  command) fixed on the page per `CLAUDE.md`, which includes the `why-cairn.md:41` owner-fact fix
  in task 9. Task 10 edits `docs/reference/` in place only.
- No release, no version bump, no `package.json` version change. `## Unreleased` gets entries only
  for public behavior changes (none expected; the check extensions are internal).
- Every new or changed check fails loud on its own planted defect in a unit test. No check passes
  on an empty or absent input it is meant to guard (spec, "Brief coverage", "Flag pairing").
- No committed check or test reads a git ref or tag: CI checks out at depth 1 with no tags.
- Code comments follow TSDoc (scripts) or Go Doc Comments (tool); no em dash in comments.
- Facts edits pass `check:facts`; facts are written with the Edit tool, never a shell append.
- Memory files under `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/` are edited
  in place; `MEMORY.md` lines stay one per memory. That directory is in no git repo, so the task
  report quotes each memory edit's before and after lines for the reviewer.

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
5. The R10 page saved by a viewer who is not a writer, or a save that conflicts: writability is
   learned only from the first `not_writer` or `not_granted` rejection, after which the page turns
   read-only; on `conflict` the shell reloads, and the page restores unsaved edits it stashed
   before publishing. The conductor never applies a partial version. Task 8 tests both; task 9's
   record notes the version it applied.

---

### Task 1: Freeze lift and rule sweep, cairn-cms side

**Files:** `CLAUDE.md`, `docs/internal/facts/README.md`, `docs/internal/docs-register.md`,
`ROADMAP.md`, `docs/STATUS.md`.

**Outcome:** Every cairn-cms file that enforces the narrative-arm freeze or the "a site-pass
agent never edits the cairn-cms checkout" rule states the new rule (spec, "Stage 0 acceptance",
"Freeze lift" and "Site-pass rule"): the freeze lifts per arm at its stage merge (extend's at the
2b merge), and site-pass agents edit on a `site-docs/<site>-<pass>` branch off `main`, merged by PR
under the docs gate; a site edit to an arm whose stage is in flight is filed, never fixed, and
feeds that stage's page inputs. Known carriers include `docs-register.md:225-226` ("swept at the
docs rebuild, never before"), `facts/README.md:86` (drop only the frozen-prose reason the
`[candidate]` line gives; the `[candidate]` rule itself stays), and `ROADMAP.md:889` and `:1095`. `CLAUDE.md`
stops citing the missing `docs-is-a-pass-dimension` memory. The ROADMAP "Now" entry names the
spec, drops the retired inputs (the six-audience ruling, the profile format, the reader harness
line), moves the designer theme-guide input into "stage 2 outline, required topic", and leaves the
Toward 1.0 claims audit as its own gate. STATUS's "Immediate next action" points at this plan.

**Acceptance:**
- Absence: `grep -rnE 'frozen|freeze|never edits the cairn-cms checkout|after the site round|never before'`
  over these five files; the report lists every remaining hit with a keep reason (for example
  ROADMAP's unrelated "frozen contract").
- Presence: each carrier that stated the freeze now states the per-arm lift and the
  `site-docs/<site>-<pass>` write path (report quotes the new line per file);
  `docs-is-a-pass-dimension` returns nothing in `CLAUDE.md`.
- The "Documentation is a pass dimension" section still says the reference arm is maintained
  every pass under `check:reference`.
- `check:docs` and `check:vale` green on the changed files.

### Task 2: Freeze lift and rule sweep, workstation side

**Files (in `~/.dotfiles/claude/.claude/`):** `skills/site-pass/SKILL.md`,
`skills/engine-consult/SKILL.md`, `skills/cairn-pass/SKILL.md`, `skills/writing-voice/SKILL.md`,
`CLAUDE.md`. Memory files: `docs-rebuild-not-edit.md`, `docs-reset-initiative.md`,
`docs-to-facts-reshape.md` (line 29), `one-release-then-model-sites.md` (line 34), and their
`MEMORY.md` lines.

**Outcome:** The same freeze and write-path rule as task 1, in the skills that execute it. The
`site-pass` skill also tells a site-pass agent to follow the admin and extend pages exactly as
written during the round, and to fix or file every divergence under the spec's "Edits after the
chain" rule (brief updated in the same change; new facts filed `[candidate]` by the editing
agent). Rule 2 scope (R9): the `writing-voice` skill's "stop after each section" line and the
global `CLAUDE.md` Writing voice summary say section-by-section drafting governs cairn front-door
drafting only, and the `CLAUDE.md` line stops reading as a page-structure rule. The
`docs-reset-initiative` memory drops "the six-audience ruling" as a survivor and points at the
spec; the three other memories' freeze lines say the freeze lifts per arm.

**Acceptance:**
- Absence: the same grep as task 1 across these files, remaining hits listed with a keep reason;
  "six-audience" returns nothing in `docs-reset-initiative.md`.
- Presence: `site-pass` carries each clause (follow the pages exactly; fix or file; the
  `site-docs/<site>-<pass>` branch; in-flight arms filed only and feeding page inputs; "Edits after
  the chain"); `writing-voice` and the global `CLAUDE.md` Writing voice line name the front-door
  scope. The report quotes each.
- The report quotes before and after for every memory edit.
- `~/.dotfiles/scripts/check.sh` green; `claude-tooling-sync verify` green.
- Commit is path-limited and touches none of the warm paths named in the header.

### Task 3: Flag pairing for `check:symbols`

**Files:** `tool/cmd/cairn/flags_test.go` (`TestCommittedFlagListMatchesTheCommandTree`, run by
`make -C tool flags`), `tool/testdata/flags.json`, `scripts/checks/check-symbols.mjs`, and its unit
tests under `src/tests/unit/`.

**Outcome:** `flags.json` carries, alongside its existing flag list, a map from each command path
to the long flags it accepts, inherited ones included, written by the same Go test and compared by
it against the cobra tree on every `make -C tool check`. The map includes cobra's lazily added
`help` and `completion` commands (the walk initializes them the same way it already calls
`InitDefaultHelpFlag`, `flags_test.go:47-51`), or the report records that the tree disables them.

A **`cairn` line** is a line in a shell-tagged fence whose first token, after an optional `$ `
prompt, is exactly `cairn`; `\` continuations are joined first. No doc line needs a leading
`NAME=value` assignment, so the grammar does not handle one; a line that opens with one is a miss
that under-reads, not a false pass. `npx cairn-audit`, `npm run cairn:manifest`, and `my-cairn-site` are not `cairn` lines.
`check:symbols` resolves each: the command path is the longest run of leading words that matches
the map; a line with no subcommand word (`cairn`, `cairn --version`, `cairn --help`) resolves to
the root path. **Subcommand position** is the first word after the matched command path, and the
check reads it only when that command has subcommands of its own; `cairn help` takes a command
path (`cairn help agents`) or a root help topic, neither of which is a subcommand-position word.
The line fails when a word in subcommand position is not a command and when a flag is not accepted
on the matched path. Non-shell fences are not read. `npx create-cairn-site` flag handling is
unchanged.

**Acceptance:**
- Go: a planted drift (the committed map with one flag removed from one path, and one path
  renamed) makes `make -C tool check` fail with a message naming the path and the
  `make -C tool flags` fix. `make -C tool flags` regenerates the file byte-identically on a clean
  tree.
- Unit tests, each failing case naming file and line: an unknown subcommand with no flags; a real
  flag on the wrong command; a prefix path where the longer match is correct (Review focus 2); a
  continuation line carrying a wrong flag. Passing: `cairn --version`, `cairn help agents`, an
  inherited flag on a subcommand, `$ cairn doctor`. Ignored: a `cairn` line in a `text` fence,
  `npx cairn-audit --rendered`, `npm run cairn:manifest`. Read: a `cairn` line in a `sh` fence
  (Review focus 1).
- Task 3 is accepted only once `npm run check:symbols` is green over today's docs. Any failure it
  finds is fixed where it lives (a narrative-arm defect is a sanctioned deficiency fix), or the
  check does not land.

### Task 4: Brief coverage for `check:provenance`

**Files:** `scripts/checks/check-provenance.mjs`, a new committed list at
`docs/internal/briefs-rebuilt.json` (outside `briefs/`, since `findBriefs` reads every `.json`
under it as a brief), `docs/internal/briefs/README.md`, unit tests.

**Outcome:** `check:provenance` reads the committed list of rebuilt page paths and fails any listed
path that no brief's `page` field names (coverage matches the `page` field, never a file name, so
`briefs/front-door/README.json` for `docs/README.md` cannot cover `docs/admin/README.md`). The
coverage check runs before the zero-brief early return. The list starts empty. A list that is
absent, not valid JSON, not an array, or holds a path outside `docs/` fails with a message saying
which. The README documents the list, that each stage merge appends its rebuilt paths, and the
brief naming rule: arm READMEs brief under their own arm's track (`briefs/admin/README.json`), and
only `why-cairn.md` and `docs/README.md` use `front-door`.

**Acceptance:**
- Unit tests plant: a listed path with no brief (fails); a listed path whose page no longer exists
  (fails, reported as a stale list entry, Review focus 3); a listed `docs/admin/README.md` whose
  only README brief names `docs/README.md` (fails); an absent list and a malformed list (each
  fails); an empty list with no briefs (passes and prints that nothing is rebuilt yet).
- Per-brief mode (`npm run check:provenance -- <brief>`) behaves as before.

### Task 5: Shipped-anchor list for `check:readiness`

**Files:** `scripts/checks/check-readiness.mjs`, a new committed append-only anchor list, unit
tests. Read, not changed: `tool/internal/health/fixes_test.go`, `tool/internal/doctor/check_referrer.go`,
tag `tool/v1.1.0`'s `tool/internal/spine/conditions.json`.

**Outcome:** A committed append-only list snapshots the `is-it-working` fragments released binaries
print: the `docsAnchor` values in `tool/v1.1.0`'s `conditions.json` plus `check_referrer.go`'s one,
normalized to one form (the two sources spell the prefix differently). That is 20 unique anchors:
the referrer anchor is already among them, and `tool/v1.0.0` and `v1.0.1` print none outside the
set. The implementer reads the tag once, at implementation time; nothing committed reads it.
`check:readiness` also fails when any listed anchor does not resolve as a heading slug in
`docs/admin/is-it-working.md`, and fails when the list is absent, malformed, or empty. A header
comment in the list says a new tool tag appends its anchors and nothing is ever removed.

**Acceptance:**
- A unit test renames a heading and its `conditions.ts` entry together and `check:readiness` fails
  (Review focus 4).
- A test through the script's own loader (not an injected fixture) reads the committed list and
  finds 20 entries; tests plant an absent, a malformed, and an empty list, each failing.
- The report states the one-time comparison against the tag. `npm run check:readiness` green on
  today's tree.

### Task 6: The docs gate script, and the editor-quotes floor

**Files:** `package.json`, `.github/workflows/test.yml`, a gate runner script under
`scripts/checks/`, `scripts/checks/gate-tier.mjs`, `src/tests/unit/gate-tier.test.ts`,
`docs/internal/pass-gate-tiers.md`, `scripts/checks/check-editor-quotes.mjs`, its unit test.

**Outcome:** `check:docs-gate` runs the checks the spec lists under "Docs gate": `check:docs`,
`check:vale`, `check:facts`, `check:provenance`, `check:symbols`, `check:snippets`,
`check:transcripts`, `check:visuals`, `check:arm-indexes`, `check:editor-quotes`,
`check:readiness`, `check:tool-conditions`, `check:target-stack`, `check:reference`, and
`check:reference:signatures`. It is one `node` command, so arguments after `--` reach it (the
precedent is `npm run check:provenance -- <brief>`, which works because that script is one
command reading `process.argv.slice(2)`, `check-provenance.mjs:607`; a chained `a && b` script
hands `--` arguments to its last command only). Scoping interface: `--page <path>` narrows Vale to
that path (today `check:vale` is a fixed path list, `package.json:50`) and `--brief <path>` narrows
provenance to that brief; every other component reads the whole tree. The runner builds `dist`
once per run, not once per component. `gate-tier.mjs`'s docs tier becomes `npm run check:docs-gate`,
and the full tier drops the components the docs gate now carries, so there is one list.
`test.yml` calls `check:docs-gate` in place of those separate steps, placed after the "Install
Vale" step; `check:package` keeps its own step. `check:editor-quotes` fails when the page it pins
carries zero quotes.

**Acceptance:**
- `npm run check:docs-gate` green on the worktree after tasks 3 to 5.
- One scoped run (`-- --page <one page> --brief <one brief>`) whose output shows Vale and
  provenance read only those files.
- `gate-tier.test.ts` asserts the docs tier string is `npm run check:docs-gate` and that no check
  runs twice in the full tier.
- Every check `test.yml` ran before still runs in CI (report lists before and after step names).
  `test.yml` fires on `pull_request` (draft PRs included) and on push to `main`/`rebuild`, so this
  task pushes `draft-docs-0` and opens the pass PR from it as a draft; the green-CI proof itself is
  the segment B boundary's job (below), not this task's, since the `test` job outlasts a chain's
  shell call.
- A unit test for the zero-quote floor fails on a page stripped of its quotes.

### Task 7: The lean page chain and the drafter

**Files:** in `~/.dotfiles/claude/.claude/`: `workflows/docs-page-chain.js`,
`agents/cairn-docs-drafter.md`, `docs/claude-tooling.md` (lines 54-59), `docs/model-economy.md`
(lines 323-324), a new node test under `~/.dotfiles/tests/`, and the `scripts/check.sh` line that
runs it; in cairn-cms, `docs/internal/briefs/README.md` and `docs/internal/facts/README.md` ("New
facts from the page chain"). Deliverables: the runner, the drafter, two workstation docs, the
derivation test, two READMEs.

**Outcome:** The runner matches the spec's "The page chain" and "Scoped re-review": no
`args.profile`, no profile grader, no "Profile" section in the editor prompt; a page-inputs step
(job, type, two trimmed exemplar excerpts, fact ids, a claim inventory with a disposition per
claim, new facts filed `[verified]` or `[external]` with the Edit tool); `cairn-docs-drafter` as
the default drafter, filing no facts. The `cairn-docs-drafter` agent definition drops its own
reset profile-file input and its v2-chain description to match: a register track profile reaches
the drafter only inside the page-inputs step's output, never as a separate arg or file. The drafter
runs the gate as its last act and reports it (step 3): the gate string from `args.gate`, with the
runner substituting `{page}` and `{brief}` per page into the conductor's
`npm run check:docs-gate -- --page {page} --brief {brief}` (task 6), plus the tool gate for a page
with pinned slugs; the drafter definition's "Do not run the page gate" and `[candidate]` lines go.
The two reviews run in parallel, the fact read also checking every inventory claim marked carried
or filed; a page with a figure also gets a `figure-verifier` read. One redraft; by default only the
reviewer that returned `fix` re-reads, with an `args.bothReviewers` switch; a second `fix`
escalates to the conductor with no third round. The per-page record carries the brief path, the
page-inputs output, and a cross-regression flag derived from `record.rounds[].reads`: set when both
re-read and a reviewer that accepted in round 1 returns `fix`, recorded as not measured (never
`false`) in lean mode. The derivation is one pure, self-contained function between named marker
comments, returning `true`, `false`, or `'not-measured'`, because the workflow runtime has no
filesystem access and the script's top-level `return` keeps node from importing it; the node test
extracts that function and runs it. The
header documents every arg and says to invoke the runner by name (drop the "copy this file to the
session scratchpad" line); the `description` meta and both workstation docs stop describing the
grader and the v2 chain. Both READMEs stop naming `docs-page-chain-v2.js`; the facts README says the
page-inputs agent files new facts and the drafter never does, and the fact read is independent of
the drafter.

This task carries seven deliverables, past the four-deliverable guideline, and stays one task
rather than splitting: the drafter's "Do not run the page gate" line and the runner's gate step are
one change, so the runner and drafter edits must land together, and the two workstation docs and
two READMEs are description sweeps of that same change, covered by the one derivation test.

**Acceptance:**
- The derivation test covers synthetic round records, each with its expected output: both accept
  in round 1 (no round 2, flag absent); one `fix`, both re-read, the other flips to `fix` (flag set,
  page qualifies); the same in lean mode (not measured); a second `fix` from a re-reader
  (escalation, no third round). The test fails when the markers are missing.
- `grep` finds no `profile` arg, grader stage, or "Profile" prompt section in the runner or the
  drafter definition, and no grader or v2 description in the drafter definition or the two docs.
- `~/.dotfiles/scripts/check.sh` green; cairn-cms docs gate green on the two READMEs.
- The report names what task 9's live run must show.
- The chain commits in both `~/.dotfiles` and `draft-docs-0`, so the dispatch passes `diff-reviewer`
  both base SHAs (one range per repo); the README edits are reviewed alongside the workstation
  files, not skipped.

### Task 8: The R10 review page template

**Files:** a new directory `scripts/docs-review/` in cairn-cms: one HTML template and one small Node
script that embeds a batch of markdown files (paths and contents) into a copy of the template for
publishing; unit tests.

**Task notes (conductor pre-extract; the implementer has no Skill tool):** the page contract from
the `artifact-design` skill; the `artifact` and `comments` sections of `artifact-capabilities`;
and the full text of its `artifact.d.ts` and `comments.d.ts`, copied into the notes (their path
sits under a versioned bundled-skills directory that a Claude Code update moves). The contract
lines to quote: "Member presence does NOT signal writability ... treat its first `not_writer` or
`not_granted` rejection as the read-only signal"; on `conflict` "the shell is already reloading
every open view"; and a self-publish must match the tool's document skeleton exactly, or the next
publish nests it.

**Outcome:** The page shows each file in the batch rendered, with an edit mode per file. A save
stashes unsaved edits in `sessionStorage`, regenerates the whole document from its embedded state,
and publishes it through the `artifact` capability. A successful publish also reloads the page, so
after any reload the page restores only the stashed entries that differ from the reloaded embedded
state, never an unconditional restore: a successful publish followed by reload shows no restored
edits, and only a `conflict` reload brings back the edits it did not save. The first `not_writer` or
`not_granted` rejection turns the page read-only (write controls disabled, copy says so). It declares `comments` with `composer_only` for passage comments. It
follows the Artifact page contract (title, `:root` tokens with dark mode, phone-width layout). The
embedded state keeps each file's path and exact markdown, so a read-back yields the files byte for
byte, and the Node embed and the page's regenerate share one encode path.

**Acceptance:**
- Round trip: three markdown files carrying a code fence, a table, a backtick span, a `svelte`
  fence containing `<script>...</script>`, an HTML comment, and non-ASCII text (curly quotes)
  survive embed, the page's own regenerate, then extract, byte-identical.
- With the capability stubbed: a `not_writer` rejection leaves the page read-only; a `conflict`
  followed by reload restores the stashed edits; a successful publish followed by reload restores
  none (its stash matches the reloaded state).
- The template passes the Artifact contract checklist in `artifact-design` (the report lists it).

### Task 9: Chain proof, review-page round trip, and owner facts (conductor-led)

**Outcome:** Three things, one owner sitting, in this order.
1. **Owner facts, verified and committed first.** A Sonnet `general-purpose` agent (it needs
   WebFetch, which `cairn-implementer` lacks) checks each of the four STATUS items against its
   source and reports the fact and a proposed edit: the rule count in
   `docs/internal/what-cairn-is-and-is-not.md:49` against the audit's rule modules; `f:ab9kzr`
   against the registry (`npm view @glw907/cairn-cms version`); `f:75hawi`
   (`docs/internal/facts/extend.md:104`) against Cloudflare's published free-tier limits, quoting
   the limit text with its URL; `docs/why-cairn.md:41` against its line 84. Items whose fix is a
   plain fact are applied on `draft-docs-0` by a `cairn-implementer` and committed before step 2;
   only owner wording goes to Geoff. The conductor records this commit's SHA as `<pre-proof>`, the
   base for the no-leak diff below.
2. **Chain proof.** In its own worktree (`.claude/worktrees/draft-docs-0-proof`, a throwaway branch
   off `draft-docs-0`), the conductor runs `npm ci` once before the chain, so the drafter's gate
   (`svelte-package`, Vale) has `node_modules` and does not escalate as a red gate; it then runs
   `docs-page-chain` (by name) on one short extend page it chooses, drafted to its real path, never
   merged. The per-page record shows the brief path, the
   page-inputs output with its claim inventory, both reviews, and no grader read.
3. **Review-page round trip.** The conductor publishes the scratch page through task 8's template
   and asks Geoff to edit one sentence the brief lists as a claim and leave one comment. It reads
   back the saved version, reads the comment with the `ArtifactComments` tool, diffs the saved page
   against the proof branch (`draft-docs-0-proof`), applies the diff to the proof branch with the
   brief updated, and runs `check:provenance` on that brief there; the apply is disposable, since
   the proof worktree and branch are removed once the record is committed.

The sitting is one combined message to Geoff: the review page link, with the owner-wording
question for the facts on the same page or alongside it.

**Acceptance:**
- A record at `docs/superpowers/research/2026-09-26-draft-docs-pass-0-1-proof.md` with the chain
  record's summary, which chain branch the run took and which branches only task 7's synthetic
  test covers, the chain's measured cost, the published and saved version ids, the comment read
  back, the applied diff, and `check:provenance` green. A no-op edit or an edit to a sentence the
  brief does not list fails the proof. If the round trip was clumsy, the record says how, and the
  conductor asks Geoff before switching to PR review.
- The four owner-fact items are edited and retagged, `check:facts` green, and their STATUS line is
  gone (on `draft-docs-0`).
- No leak: `git diff <pre-proof>..draft-docs-0` (the proof's own commits, not the whole branch, so
  an earlier task's sanctioned deficiency fix on `docs/extend/` does not fail this check) touches no
  `docs/extend/` page, no `docs/internal/briefs/extend/`, and no `briefs-rebuilt.json` entry, and
  `facts/extend.md` changes only at `f:75hawi`.
- The proof worktree and throwaway branch are removed after the record is committed.

### Task 10: Stage 1, reference claim check

**Split (Geoff, 2026-09-27):** task 10 runs now on every reference page except the two theme
identity pass B changes: the admin subpath page its `./components` to `./admin` rename moves, and
the `./public` page it creates. Those two run after pass B lands, as a short follow-up batch with
the same acceptance. The reference arm is the most complete and the easiest for an agent to draft,
so it goes first; the editor docs and the front page come last.

**Outcome:** One `claude-opus-5-5` fact-read agent per page for the 29 pages in `docs/reference/`
other than its README; the five largest (`sveltekit.md`, `core.md`, `admin-toolkit.md`,
`cairn-audit.md`, `components.md`) split into chunks of whole H2 sections near 5K words each, one
agent per chunk (about 37 agents total across all 29 pages). Before the fan-out the conductor runs
`npm run package` once. Fact-read agents are read-only: no `package`, no gate, no commit, no file
edit. Each checks every prose claim on its page (or, for a split page, its chunk) against the facts
container, `dist` and `docs/internal/api-surface.md`, and the code, and returns a record: claims
checked, discrepancies found, proposed page edits and fact edits (file or retag), and anything it
could not settle. A batch is up to six pages, with a split page's chunks kept together in the same
batch. Batches run sequentially: after each batch one `cairn-implementer` applies that batch's
proposed edits, runs `check:docs-gate` and `make -C tool check`, and commits; a `diff-reviewer`
reads that apply commit before the next batch dispatches. The conductor projects stage 1's cost
from the first batch; a projection past 4.5M is the checkpoint question.

Released tool contract content is reported, never edited: `docs/reference/schema/**`, and the exit
codes, payloads, and check ids on `cli-cairn-doctor.md`, `cli-cairn-exit-codes.md`, and
`cli-cairn-json-output.md` (the pages `tool.yml` and the Go contract tests read). The other two
`cli-cairn-*` pages (`manifest`, `media-seed`) are checked like any page.

**Acceptance:**
- A stage record at `docs/superpowers/research/2026-09-26-draft-docs-stage-1-record.md` lists all
  29 pages, each with a nonzero claim count or a stated reason; the conductor diffs the list
  against `docs/reference/*.md` less the README, and a missing page fails the task.
- No fact-read agent ran `npm run package`, a gate, or a commit (their records state it; every
  commit on the branch in this task is an apply commit).
- Every apply commit carries a `diff-reviewer` read; `npm run check:docs-gate` and
  `make -C tool check` green after the last batch.
- Any structural problem found (a page that needs a rebuild, not a fix) and any contract
  discrepancy is listed for Geoff in the close, not fixed.

### Task 11: Close

**Outcome:** One fold agent authors the close and one independent `diff-reviewer` reads its diff.
`docs/HISTORY.md` gets the pass entry (what landed, what the gates caught, measured cost against
the about 9.6M ceiling and the about 7.7M planned spend, the chain proof's per-page cost, and what
a later pass would be wrong to rediscover). `docs/STATUS.md` carries the current shares, reset from
the measured cost (including the narrowed arm-page headroom as a pilot-checkpoint input), and the
next action: the stage 2a plan, with its extend outline, to be written and reviewed on an R10 page.
`CHANGELOG.md` `## Unreleased` gets entries only if a public behavior changed. The conductor pushes
the final `draft-docs-0` commit; the draft PR from task 6 leaves draft, and the conductor merges
`draft-docs-0` to `main` after the docs gate and `make -C tool check` pass in CI.

**Acceptance:** STATUS at or under 60 lines; the memory index points at the spec; the pass score
records tokens against the ceiling, planning misses, and execution sittings (task 9's sitting
counts as one).

## Ledger

(written by the conductor at each segment boundary)

### Pre-flight (2026-09-26, before segment A)

- Counter: `/usage` (the command `/cost` now reports as) includes subagent and workflow-agent
  tokens (https://code.claude.com/docs/en/costs.md). Between readings the conductor sums the
  per-agent `subagent_tokens` and each workflow run's reported usage.
- Pre-flight spend: fact check 0.10M, counter question 0.06M.
- Fact check over the header and tasks 1 to 5: 20+ claims, none failed. Caveat: tags
  `tool/v1.0.0` and `v1.0.1` carry no `conditions.json`, so "print none outside the set" holds
  vacuously.
- Worktree `draft-docs-0` off `main` at `2776dfa3` (the theme-identity spec commit, docs-only).
  `npm ci` skipped `workerd`'s postinstall under npm 11.19's script approval; the platform
  binary is present.
- `~/.dotfiles` warm paths match the header exactly; no task touches them.
- Next: segment A (tasks 1, 3, 4, 5 via `pass-execute`), task 2's chain alongside.


### Segment A boundary (2026-09-26): parked on Geoff's hold

Geoff put draft docs on hold until the theme identity pass
(`docs/superpowers/specs/2026-09-26-theme-identity-design.md`) merges: pause at this boundary,
do not merge `draft-docs-0`. Resume at segment B.

| Task | Status | Commits |
|---|---|---|
| 1 | accepted, one fix round | `2427856a`, `57ccd2d2` |
| 2 | accepted (dotfiles), two fix rounds; scope widened to `agents/site-implementer.md` and `agents/cairn-implementer.md`, which also carried the rule | `4b2916fc`, `353cc61e`, `9f2ebe36` |
| 3 | accepted by conductor ruling (reviewer accept; gate red only on port 4173) | `d0639043`, `85efee59` |
| 4 | accepted by conductor ruling (same) | `d17d716c` |
| 5 | accepted by conductor ruling (same) | `0713d110`, `3e452fdc` |
| hardening | three review findings on tasks 3 to 5, accepted | `2d960720` |
| simplifier | segment round, accepted | `be6e13e5` |

- Gate at the boundary (conductor, `cairn-run-gate`): docs checks, `check:symbols`,
  `check:provenance`, `check:readiness`, `npm run check` 0/0, `make -C tool check`, and the
  component project (1429/1429) green; unit plus integration 5193/5195. The two failures are
  `src/tests/unit/audit/rendered.test.ts`'s BASE_URL tests, which assume nothing listens on
  localhost:4173; dubplate's `sirv` held that port all segment. CI on draft PR #91 is the clean
  proof. Every per-task gate this segment also stopped `npm test`'s `&&` chain before the
  component project, so the component suite ran only here.
- Rulings: site-pass agents edit the `site-docs/<site>-<pass>` branch themselves (spec, Stage 0
  "Site-pass rule"); `engine-consult` carries no freeze wording and stays untouched.
- Carried, not fixed: `check:symbols` still reads an attached redirect (`2>&1`, `>out.json`) as
  a word and drops a continuation left pending at a fence close; a duplicate shipped anchor
  hides the heading comparison until removed; `rendered.test.ts` should take a free port rather
  than assume 4173 (friction log at the close). The global `CLAUDE.md` stays over its 6k budget
  (already an open item for Geoff).
- Conductor defect: a `cd` in the conductor shell moved the session's working directory, and a
  dispatched implementer inherited it, running two gates in the wrong worktree before it
  noticed. Conductor shell calls use absolute paths; dispatch prompts pin the worktree.
- Spend (agent-reported `subagent_tokens`): pre-flight 0.16M, task 2 chain 0.28M, workflow run 1
  1.30M, workflow run 2 0.62M, hardening, simplifier, and review 0.32M; about 2.7M plus the
  conductor. `/usage` reading owed at resume. Outside the pass: the TypeScript 7 canary chore
  (PR #90), about 0.41M.
- Next on resume: segment B, tasks 6 and 8 through `pass-execute`, then task 7's chain; the
  dispatch notes carry the port-4173 caveat if it persists and pin the worktree path.

### Close (2026-09-28): tasks 9, 10, and 11

Segment B (tasks 6, 7, 8) and the segment B boundary ran and merged `main` in without a ledger
entry of their own; this record only covers what task 9, task 10, and this closing task (11)
carry. Task 9 (conductor-led, `6ad6dee8`, `0f7ab264`, `82c906e2`, `c634f43c`) landed the four
owner-fact fixes, ran the chain proof on `choose-an-ai-posture.md` for real (not thrown away,
per this closing task's direction), and forced a register amendment mid-pass: Geoff's Firefox
review of the published page found three "AI phrasing" headings and an explanation-before-steps
ordering the register did not yet forbid, fixed in `docs/internal/docs-register.md`
(`07d5c87e`, `fb5238d1`) and the workstation's `cairn-register-editor` agent definition, not in
the page. Task 10 (five batches, `716cd90e` through `11bd4809`, full record
`docs/superpowers/research/2026-09-26-draft-docs-stage-1-record.md`) checked 1204 claims across
28 of 29 reference pages (the two theme identity pass B moves deferred by Geoff's split), fixed
33 of 35 discrepancies, and caught one batch's apply agent landing its commit in the wrong
worktree before the next batch dispatched.

Task 11 merged `main` (PR #96, setup-paid) into `draft-docs-0`, resolving four real conflicts
(the front-door voice bullets in the register, the AI-posture facts and two stale line numbers,
the gate-tier docs string, and `gate-tier.mjs`'s `DOCS_GATE`/`SCRIPTS_GATE` constants) keeping
both sides' intent, then fixed `choose-an-ai-posture.md`'s owed deficiency (fact `f:1ij5h5`): the
"Pass the posture to the robots route" step now states that a site scaffolded by the current
setup command needs no edit there, keeping the step and its snippet only for an older scaffold.
Triaged the whole `docs/internal/docs-friction-log.md`: its two open findings (the
`admin-toolkit.md` contrast-ratio gap, the page-chain claim-inventory disposition gap) and the
segment A boundary's two still-open carried items (`check:symbols`'s attached-redirect and
dropped-continuation gaps, `rendered.test.ts`'s hardcoded port 4173) all promoted to
`ROADMAP.md`'s Next tier; the boundary's third carried item, the duplicate-shipped-anchor gap,
verified already fixed by the 2026-09-26 hardening commit (`2d960720`) and needed no filing.
Read the pass's own non-test code changes since the last simplifier commit (`be6e13e5`):
`docs-gate.mjs`, `check-editor-quotes.mjs`, `gate-tier.mjs`, `scripts/docs-review/embed.mjs`, and
`scripts/docs-review/runtime.mjs`; all five were already clean, so no simplification edit was
made (no Task/Agent tool was available in this closing session to dispatch the
`code-simplifier` subagent itself; this was a manual read against the same discipline).

Gate: `npm run check:docs-gate` green (single-page mode over `choose-an-ai-posture.md` plus the
full run, 15 checks); `npm run check` (0/0), `npm test` (exits 0, 1429/1429 after confirming one
`media-public-base.test.ts` failure was contention from a concurrently running theme-identity
gate, reproduced clean in isolation), and `npm run check:close` all green in one
`npm run check && npm test && npm run check:close` gate; `make -C tool check` green separately.

**Cost:** the plan's ceiling is about 9.6M, flagged at about 7.7M planned spend. Recorded pieces:
segment A (tasks 1-5 plus hardening and simplifier) about 2.7M plus the conductor; task 9's chain
proof about 0.65M against its 0.2M estimate; task 10's stage 1 about 4.9M against its 4.5M
checkpoint (stage-1 record). Those three alone total about 8.25M, already past the 7.7M flag and
within the 9.6M ceiling. Segment B (tasks 6, 7, 8) and this closing task (11) carry no recorded
`subagent_tokens` figure anywhere in this ledger or the stage records; this entry does not
invent one where none was measured.

**Attended time:** one planning miss (the register's academic voice and its "You know it worked
when" heading rule were scoped front-door-only, found at task 9's owner review of the published
proof page); one execution sitting (task 9's owner review, 2026-09-28): Geoff's Firefox read of
the published review page across four versions, approving v4 with no edits, counted as one
sitting regardless of its round count per `pass-core`'s rule.

`code-simplifier` ran after this close, on the closed head, as `bd935c9d`.

**Next:** the merge to `main` waits on Geoff's word (this closing task does not merge PR #91 or
edit `main`); once it lands, the next action is authoring the stage 2a plan (with its extend
outline) from the approach spec's stage 2 outline.
