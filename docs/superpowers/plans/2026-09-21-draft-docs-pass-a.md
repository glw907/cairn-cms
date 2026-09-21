# Draft docs pass A: the tool's contract pages

**Goal:** Put the Go `cairn` tool's exit-code and JSON contracts under `docs/reference/`, graded
against a scripter-or-agent profile, with the `tool/` side moved in the same merge, so the
`0.97.0` tarball carries them.

**Spec:** `docs/superpowers/specs/2026-09-21-draft-docs-design.md`. Executors read both. Where
this plan and the spec disagree, stop and report.

**Approach:** Mine the three `tool/docs/reference/` originals into manifests, dispositions, and
sourced bullets. Draft two pages from those, never from the originals. Fold the tool's log-event
content into the engine's page. Move the schemas and repoint the Go side last, on the same
branch, so one PR carries the deletion and every reader of the deleted paths.

**Execution mode:** workflow, through `~/.claude/workflows/pass-execute.js` copied to the session
scratchpad. Tasks 4, 5, and 6 are independent of each other. All other tasks are serial.

**Token ceiling:** 2.5M, flag at 2.0M. **Checkpoint interval:** four tasks. Segments: tasks 1 to
3, tasks 4 to 6, tasks 7 to 9. At each boundary the conductor writes the ledger section at the
foot of this file, never `docs/STATUS.md`.

**Worktree:** `.claude/worktrees/draft-docs-a`, branch `draft-docs-a`, off `main`. One executor.
Merged by one PR.

**Models:** Sonnet implements and drafts at `medium` effort. `claude-opus-5` runs every review,
the dispositions read, the profile grader, the fact read, and task 7. Task 7 is
correctness-critical Go against frozen contracts.

## Preconditions, checked by task 1 before anything else

1. The doctor retirement is merged on `origin/main`: `src/lib/doctor` is gone, `package.json` has
   no `cairn-doctor` bin, and STATUS carries "the `0.97.0` cut is unblocked" or a line saying pass
   A is the last thing before it. If the retirement's close wrote "unblocked" without knowing of
   pass A, the conductor tells the cut's session to wait for this PR before anything else runs.
2. B2's harvest is on `main`: `docs/internal/facts/admin.md` carries tool bullets.
3. The tool's conductor, or STATUS if no tool session is live, confirms `tool/` is quiet. Check
   `ListAgents`, `pgrep -f cairn-cms`, and `git status` in every worktree that touches `tool/`.
4. No session has asked for a quiet `main`.

If any fails, stop with one combined report.

## Global constraints

- A drafter never opens `tool/docs/reference/exit-codes.md`, `json-output.md`, or
  `log-events.md`. Only the mining read (task 3) does.
- A drafter copies commands and JSON examples from the task 3 manifests and never composes them.
- The two new pages are `docs/reference/cli-cairn-exit-codes.md` and
  `docs/reference/cli-cairn-json-output.md`. No other new page.
- `tool/docs/credentials.md`, `tool/docs/tripwire.md`, `tool/docs/release-candidate-notes.md`,
  `tool/docs/adr/`, and `tool/docs/design/` are not touched.
- The exit codes, the JSON schemas' content, and the wire words are frozen at `tool/v1.0.0`. No
  task changes a schema's content, a `$id`, a code, or a word. Moving a file is not a change.
- `go-conventions` is mandatory for every edit under `tool/`, and `golang-spf13-cobra` for
  `tool/cmd/cairn`.
- The register is `docs/internal/docs-register.md`: the universal contract and "The reference"
  section. Third person, dry contract, a narrative lede ahead of any table, no pitch.
- Links run from admin pages to these pages and never back into narrative.
- No edit to `CLAUDE.md`, `ROADMAP.md`, or `docs/STATUS.md` before task 9.
- The docs gate for a docs task, run as
  `CAIRN_GATE_LANE=light cairn-run-gate '<string>'` and re-issued on exit 75:
  `npm run check:docs && npm run check:vale && npm run check:arm-indexes && npm run check:snippets && npm run check:symbols && npm run check:facts && npm run check:transcripts`.
- The tool gate, same runner and lane, by absolute worktree path: `make -C <worktree>/tool check`.
- The full gate before the PR: `npm run check && npm test`, heavy lane, once, in task 9.

## File map

| Path | Task | Change |
| --- | --- | --- |
| `docs/internal/docs-register.md` | 2 | the scripter-or-agent profile; the reference section's one-profile sentence amended |
| `docs/internal/record/2026-08-14-audience-profiles.md` | 2 | one dated note appended, body untouched |
| `docs/internal/docs-friction-log.md` | 2, 9 | the perspectives list; triage |
| `scripts/checks/check-symbols.mjs`, its allowlist, its test | 2b | Go tool flags resolve |
| `docs/internal/facts/reference.md` | 3 | two new `##` sections, one addition to the log-events section |
| `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.mining.md` | 3 | manifests and dispositions, deleted in task 9 |
| `docs/reference/cli-cairn-exit-codes.md` | 4 | new |
| `docs/reference/cli-cairn-json-output.md` | 5 | new |
| `docs/reference/log-events.md` | 6 | the tool's content folded in |
| `docs/reference/README.md` | 4, 5 | one index line each |
| `tool/schema/*.schema.json` | 7 | moved from `tool/docs/reference/` |
| `tool/docs/reference/` | 7 | emptied and removed |
| `tool/internal/render/layout.go`, `tool/cmd/cairn/messages.go`, `help_agents.go`, the four test files, help goldens, `tool/README.md` | 7 | repointed |
| `scripts/checks/docs-links.mjs` | 7 | no row: `tool/docs/` was never a published path; confirm and record |
| `CHANGELOG.md`, `docs/HISTORY.md`, `docs/STATUS.md` | 9 | close |

---

### Task 1: Pre-flight and the current-state record

One read-only `claude-opus-5` agent. No file changes except the ledger at the foot of this plan.

**Outcome:** the preconditions above are verified, and the ledger records the facts later tasks
depend on, each with a `file:line` on `main` as it stands that day:

- every file under `tool/docs/reference/`, with the schema count;
- every reader of those paths under `tool/` (tests, `go:embed`, the Makefile, help text, the
  README) and under `.github/workflows/`;
- how `usage_test.go` parses `exit-codes.md`, stated precisely enough that task 4 can keep the
  parsed form or task 7 can re-anchor the test;
- what the retirement added to the contracts: any new payload kind, schema, or reason code;
- the complete flag set of the `cairn` binary, from its cobra tree;
- the goldens under `tool/internal/render/testdata/`, one line each.

**Acceptance:** every list is complete against `git grep`, and any disagreement with this plan's
file map is named. A disagreement stops the pass for a plan amendment.

### Task 2: The scripter-or-agent profile

**Files:** `docs/internal/docs-register.md`, the 2026-08-14 profiles record, the friction log.

**Outcome:** the register's reference section names the profile for the tool's contract pages and
says the 2026-08-14 one-profile-per-track ruling is overturned for them (Geoff, 2026-09-21). The
profile has the five elements every track summary has: the reader, the vocabulary contract, the
arrival, the success criterion, and the counterpart question. Content, from the spec: anyone
automating against `cairn`, a person writing a script or an agent; arrives from `cairn help
agents`, a `--json` help line, or an admin page's link; full technical vocabulary, nothing
banned, imprecision is the defect; succeeds when they can branch on every exit code and parse
every payload without running the tool. The counterpart question: could a reader write a correct
wrapper and parser from this page alone, and does any behaviour require running the tool to
learn? The dated record gains one appended note pointing at the register. The friction log's list
of perspectives gains the fifth.

**Acceptance:** the engine reference pages keep no profile; only pages named `cli-cairn-*` for
the Go tool are claimed. The docs gate is green. `diff-reviewer` accepts.

### Task 2b: `check:symbols` resolves the Go tool's flags

`cairn-implementer`, test-first. Runs after task 1, in the first segment.

**Outcome:** a `--flag` inside a shell fence whose command is `cairn` resolves against the Go
tool's flag set. The set comes from one maintained source the gate reads, with a test that fails
when a flag in the cobra tree is missing from it, so the list cannot drift silently. Flags of
`create-cairn-site` and the allowlist behave as before.

**Acceptance:** a fixture page with `cairn health --json --quiet` passes; a fixture with
`cairn health --no-such-flag` fails naming the flag; the existing `check:symbols` tests pass
unchanged; `npm run check:symbols` is green on `main`'s docs. `diff-reviewer` accepts.

### Task 3: Mining

One Sonnet read per original, then one `claude-opus-5` dispositions read over all three.

**Outcome, in `...pass-a.mining.md`, one section per destination page:**

- an ordered outline of the contract as the original presents it: for exit codes, each code, its
  word, its meaning, the precedence rule, the timeout arithmetic; for JSON, each payload kind,
  its schema file, the stdout and stderr rule, and the `--json` beats `--quiet` rule;
- a command manifest: every fenced command verbatim, each with its source in the cobra tree;
- an example manifest: every JSON example, each mapped to a golden file it is copied from; an
  example with no golden is a disposition, never an invented payload;
- a dispositions diff: every claim the container lacks, each with one disposition: file as a
  sourced bullet, or cut with a reason. The Opus read ratifies or overturns each.

**Outcome, in `docs/internal/facts/reference.md`:** two new `##` sections for the two pages, and
additions to the log-events section, every bullet `[verified]` against code on `main` with a
`path:line` source, including whatever task 1 found the retirement added.

**Acceptance:** `npm run check:facts` is green. No bullet's source is a `tool/docs/` page. The
Opus read confirms the outline loses no contract statement from the originals, by listing each
statement and the bullet or disposition that carries it.

### Task 4: `docs/reference/cli-cairn-exit-codes.md`

Independent of tasks 5 and 6. The chain: Sonnet drafter; the docs gate; `cairn-register-editor`
on `claude-opus-5` with a required profile section; a fresh `claude-opus-5` profile grader with
the task 2 profile printed in its prompt, one verdict per element; a `claude-opus-5` fact read
tracing every claim to a task 3 bullet or ratified disposition; one redraft round.

**The brief.** Reader's job: decide what a script or a monitor does on each exit. Anatomy: the
register's reference entry, a narrative lede, then the contract. Arrival: from `cairn help
agents`, from a scheduler page's link, or from a failed run with a code in hand, so the code
table is reachable without reading the lede. It states every code and word, the precedence rule,
what a held or acknowledged check contributes, what `unknown` means against `skip`, and the
timeout arithmetic, all from the task 3 outline. It must not cover credentials, scheduling, or
how to fix a failing check; it links to nothing in the admin arm. Exemplar:
`docs/reference/cli-cairn-manifest.md`. The drafter receives the task 3 section, the manifests,
the bullets re-keyed to this page, the profile, the register sections, and the error-tier Vale
rule list.

**Constraint from task 1:** if `usage_test.go` parses figures from this page, the page carries
them in the form the ledger records, so task 7 can point the test here unchanged. If that form
would damage the page, say so in the report and task 7 re-anchors the test.

**Acceptance:** the docs gate is green; the page is linked from `docs/reference/README.md`; all
three reads accept, or the second `fix` verdict is in the conductor's hands with findings.

### Task 5: `docs/reference/cli-cairn-json-output.md`

Independent of tasks 4 and 6. The same chain as task 4, restated: Sonnet drafter; the docs gate;
`cairn-register-editor` with a profile section; a fresh profile grader; a fact read; one redraft.

**The brief.** Reader's job: parse every payload `cairn` writes under `--json`. Anatomy:
reference entry, a lede, then one section per payload kind. Arrival: from a `--json` help line or
from a parser that just failed. It states the stream rules, each payload kind with its required
fields and its `schemaVersion`, the schema file's name and its `$id`, and that a `$id` under
`https://cairn.pub/schema/` is an identifier that need not resolve, with the file's home in the
repository named as `tool/schema/`. Every JSON example is copied from the golden the example
manifest names. It must not restate a schema field by field where the schema is normative; it
says which is normative. Exemplar, inputs, and constraint on parsed forms: as in task 4, with
`json_schema_test.go`'s `docPath` in place of `usage_test.go`.

**Acceptance:** as task 4, plus every example byte-matches its golden.

### Task 6: Fold the tool's log-event content into `docs/reference/log-events.md`

Independent of tasks 4 and 5. `cairn-implementer` on Sonnet; this page is maintained in place,
not rebuilt.

**Outcome:** the engine's page says what `cairn` does with the vocabulary: it carries a
completion-list copy kept in sync by a test, what it does and does not do to a record, and where
that test lives. The addition is one section in the page's existing register. The vocabulary
table is untouched.

**Acceptance:** the docs gate is green; a `claude-opus-5` fact read finds every sentence of the
addition in a task 3 bullet and finds no contract statement of the original lost; `diff-reviewer`
accepts.

### Task 7: The tool-side move

After tasks 4, 5, and 6 are accepted. One implementer, `model: opus`, `go-conventions` and
`golang-spf13-cobra` loaded. Same branch, so the PR carries both halves.

**Outcome:**

- every `*.schema.json` under `tool/docs/reference/` lives in `tool/schema/`, content and `$id`
  byte-identical;
- `tool/docs/reference/exit-codes.md`, `json-output.md`, and `log-events.md` are deleted and the
  directory is gone;
- one docs base URL constant serves every operator-visible docs link, reusing `docsBase` in
  `tool/internal/render/layout.go`; the `--json` long help and `cairn help agents` name the
  cairn.pub pages and `tool/schema/`;
- `usage_test.go`, `json_schema_test.go`, and `help_agents_test.go` read the new paths;
  `messages_test.go`'s budget-docs test is split so its `tripwire.md` half passes unchanged and
  its exit-codes half reads the new page;
- `tool/README.md`'s exit-codes link points at the cairn.pub page; its credentials and
  scheduling links still point into `tool/docs/`;
- help goldens are recut, and the diff of each golden is only the repointed lines.

**Acceptance:** the tool gate is green by absolute worktree path; `git grep -n
"docs/reference" -- tool/` returns only paths under `docs/reference/` at the repository root or
under `tool/docs/design/`; no schema's bytes changed (`git diff -M --stat` shows pure renames);
the docs gate is still green; `diff-reviewer` accepts against this list.

### Task 8: The scripter test

One fresh `claude-opus-5` agent, given only the rendered text of the two new pages, with no
repository access. A second agent runs what it wrote.

**Outcome:** from the pages alone, the first agent writes a shell wrapper that branches on every
exit code, applying the precedence rule, and a parser that asserts every documented field of
every payload kind. The second agent runs the parser against every golden under
`tool/internal/render/testdata/` and validates the wrapper's branches against the code table in
`tool/internal/spine`. Every divergence, and every place the first agent reports it had to guess,
is a finding against a page.

**Acceptance:** no divergence and no guess remains. A finding goes back through one redraft of
the page concerned and one re-run of this task. A second failing run goes to the conductor.
Scratch artifacts stay in the session scratchpad and are not committed.

### Task 9: Close

One fold agent drafts and commits; one independent `diff-reviewer` reads the fold.

**Outcome:**

- `CHANGELOG.md`, under `## Unreleased`: the tool's contract pages now live under
  `docs/reference/`, the schemas under `tool/schema/`, and a plain statement of what a tool user
  who linked to the old paths does;
- the friction log triaged, complete-or-move;
- `docs/HISTORY.md` gains the pass entry, with what a later pass would be wrong to rediscover:
  the transcript gate's fixture root, the drift tests that read docs, the mining measurements;
- `docs/STATUS.md` says pass A is merged and names what the cut waits on, if anything; the
  conductor tells every live session before this edit;
- the mining file is deleted;
- the handoffs are filed: to the tool's conductor, that the next tool tag carries the repointed
  links, superseding the `v1.1.0` line in
  `docs/internal/record/2026-09-21-doctor-retirement-tool-sizing.md`, which gains a one-line
  note; to `cairn-pub`, the `/schema/` route, the two new reference pages in its nav, and the
  pin problem STATUS records, written as a consultation-ready note under
  `docs/internal/record/`;
- the full gate is green, the PR is open with the `tool` workflow green on its head, and the
  pass is scored: tokens against 2.5M, planning misses, execution sittings.

**Acceptance:** `diff-reviewer` accepts the fold; the PR's checks are green; no file outside the
file map changed, or each extra file is named with its reason.

---

## Ledger

Written by the conductor at each segment boundary: tasks done, decisions taken, spend, next task.
