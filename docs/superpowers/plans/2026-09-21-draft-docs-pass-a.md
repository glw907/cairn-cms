# Draft docs pass A: the tool's contract pages

**Goal:** Put the Go `cairn` tool's exit-code and JSON contracts, and their schemas, under
`docs/reference/`, graded against a scripter-or-agent profile, with the `tool/` side moved in the
same merge, so the `0.97.0` tarball carries them.

**Spec:** `docs/superpowers/specs/2026-09-21-draft-docs-design.md`. Executors read both. Where
this plan and the spec disagree, stop and report.

**Approach:** Move the schemas first, since a gate checks that every path a page names exists.
Mine the three `tool/docs/reference/` originals into manifests, dispositions, and sourced
bullets. Draft two pages from those, never from the originals. Fold the tool's log-event content
into the engine's page. Repoint the Go side and delete the originals last, on the same branch, so
one PR carries the deletion and every reader of the deleted paths.

**Execution mode:** conductor-dispatched chains through the Agent tool. `pass-execute.js` runs an
implementer, a reviewer, and a gate, and cannot run the page chain tasks 5 and 6 need. Tasks 5,
6, and 7 are independent and are dispatched together; their files are disjoint. Every other task
is serial. The conductor stays thin: it reads agent reports, never diffs or gate logs.

**Token ceiling:** 3.5M, flag at 2.8M. **Segments and checkpoints:** eleven tasks in three
segments, 1 to 4, 5 to 7, 8 to 11, a checkpoint at each boundary. At each the conductor writes
the ledger at the foot of this file, never `docs/STATUS.md`.

**Worktree:** `.claude/worktrees/draft-docs-a`, branch `draft-docs-a`, off `main`, `npm ci` once
before task 2. One executor. Merged by one PR. A stop at any task leaves `main` untouched.

**Models:** Sonnet implements and drafts at `medium` effort. `claude-opus-5` runs every review,
the dispositions read, the profile grader, the fact read, and tasks 3 and 8, which are Go against
frozen contracts.

## Preconditions, verified by task 1 before anything else

1. `docs/STATUS.md` says the cut holds on the tool's 1.0, the doctor retirement, this pass, and
   the `tool/v1.1.0` tag that follows it, and that only that tag's close writes "the `0.97.0`
   cut is unblocked". The pre-cut plan's cut task carries the matching precondition. If STATUS
   already carries the unblocked sentence, stop: the cut may be running.
2. The doctor retirement is merged on `origin/main`: `src/lib/doctor` is gone, `package.json` has
   no `cairn-doctor` bin, `npm run check:symbols` is green, and no `tool/v1.1.0` tag exists yet.
3. B2's harvest is on `main`: `docs/internal/facts/admin.md` carries tool bullets.
4. `tool/docs/reference/` on `main` carries exactly six `*.schema.json` files and the three
   markdown pages. A different inventory stops the pass for a plan amendment.
5. `tool/` is quiet: `ListAgents`, `pgrep -f cairn-cms`, and `git status` in every worktree that
   touches `tool/` show no live executor, or the tool's conductor confirms it.
6. No session has asked for a quiet `main`.

If any fails, stop with one combined report.

## Global constraints

- A drafter never opens `tool/docs/reference/exit-codes.md`, `json-output.md`, or
  `log-events.md`. Only the mining read (task 4) does.
- A drafter copies commands and JSON examples from the task 4 manifests and never composes them.
- The two new pages are `docs/reference/cli-cairn-exit-codes.md` and
  `docs/reference/cli-cairn-json-output.md`. No other new page.
- These pages ship in every consumer's `node_modules`. No example carries the owner's site names,
  the `glw907/ecxc-ski` repository, or a real Cloudflare account id. The substitutes are
  `example.org`, `example-org/site`, and `<account-id>`, applied by the task 4 manifest.
- A page links only inside the shipped tree (`docs/`) or to an absolute URL. The URL shape for a
  docs page is `https://cairn.pub/docs/<arm>/<page>`, no extension, the shape the 1.0 fix lines
  froze.
- `tool/docs/credentials.md`, `tool/docs/release-candidate-notes.md`, `tool/docs/adr/`, and
  `tool/docs/design/` are not touched. `tool/docs/tripwire.md` is touched in one way only: its
  two links to `reference/exit-codes.md` are repointed in task 8. `tool/CHANGELOG.md`'s released
  entries are history and are not edited.
- The exit codes, the schemas' content, each `$id`, and the wire words froze at `tool/v1.0.0`. No
  task changes one. Moving a file is not a change.
- `go-conventions` is mandatory for every edit under `tool/`, and `golang-spf13-cobra` for
  `tool/cmd/cairn`. A Go test that reads a file at the repository root resolves it through
  `providers.RepoRoot()`, never a relative climb.
- The register is `docs/internal/docs-register.md`: the universal contract and "The reference"
  section. Third person, dry contract, a narrative lede ahead of any table, no pitch. This
  content meets Vale's Google and Cairn set for the first time. A finding is fixed on the page; a
  wrong one gets the scoped suppression the register's "When a Vale finding is wrong" prescribes.
- No edit to `CLAUDE.md`, `ROADMAP.md`, or `docs/STATUS.md` before task 11.
- Gates run as `cairn-run-gate '<string>'`, re-issued on exit 75 until it prints `gate exit:`.
  The docs gate, light lane (`CAIRN_GATE_LANE=light`):
  `npm run check:docs && npm run check:vale && npm run check:arm-indexes && npm run check:symbols && npm run check:facts && npm run check:transcripts && npm run check:readiness`.
  The tool gate, light lane, by absolute worktree path: `make -C <worktree>/tool check`.
  The full gate, heavy lane, once, in task 11: `npm run check && npm test`, which includes
  `check:snippets` and its package build.

## File map

| Path | Task | Change |
| --- | --- | --- |
| `docs/internal/docs-register.md` | 2 | the scripter-or-agent profile; the one-profile sentence amended |
| `docs/internal/record/2026-08-14-audience-profiles.md` | 2 | one dated note appended |
| `docs/internal/docs-friction-log.md` | 2, 11 | the perspectives list; triage |
| `docs/reference/schema/*.schema.json` | 3 | six files moved from `tool/docs/reference/` |
| `tool/internal/render/json_schema_test.go` | 3, 8 | `schemaDir` in 3; `docPath` in 8 |
| `tool/testdata/flags.json`, a Go test beside the cobra root, a `flags` Makefile target | 3 | the committed flag list and its drift test |
| `scripts/checks/check-symbols.mjs`, its tests | 3 | unions `tool/testdata/flags.json` into the known flags |
| `docs/internal/facts/reference.md` | 4 | two new `##` sections; additions to the log-events section |
| `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.mining.md` | 4 | manifests and dispositions; deleted in task 11 |
| `docs/reference/cli-cairn-exit-codes.md` | 5 | new |
| `docs/reference/cli-cairn-json-output.md` | 6 | new |
| `docs/reference/log-events.md` | 7 | the tool's content folded in |
| `docs/reference/README.md` | 8 | two index lines, one writer |
| `tool/docs/reference/` | 8 | three pages deleted; one `README.md` stub left |
| `tool/internal/render/layout.go` | 8 | the anchor prefix renamed; a real docs base added |
| `tool/cmd/cairn/messages.go`, `help_agents.go`, `root.go`, `health_sweep.go` | 8 | help text and doc comments repointed |
| `tool/internal/render/json.go`, `tool/internal/spine/condition_test.go` | 8 | doc comments repointed |
| `tool/cmd/cairn/usage_test.go`, `help_agents_test.go`, `messages_test.go` | 8 | paths moved; the budget-docs test split |
| a new Go test in `tool/cmd/cairn` | 8 | guards the exit-code table and the version line |
| `tool/testdata/copy.golden.md`, the help goldens | 8 | regenerated |
| `tool/docs/tripwire.md`, `tool/README.md` | 8 | the exit-codes links only |
| `.github/workflows/tool.yml` | 8 | both new pages and `docs/reference/schema/**` in both `paths` lists |
| `CHANGELOG.md`, `docs/HISTORY.md`, `docs/STATUS.md` | 11 | close |
| `docs/internal/record/2026-09-21-doctor-retirement-tool-sizing.md` | 11 | one superseding note |
| `docs/internal/record/<date>-cairn-pub-docs-handoff.md` | 11 | new |
| `ROADMAP.md` | 11 | only if the friction triage promotes an item |

---

### Task 1: Pre-flight and the current-state record

One read-only `claude-opus-5` agent. It changes no file; the conductor writes its findings into
the ledger.

**Outcome:** the preconditions are verified, and the ledger records, each with a `file:line` on
`main` as it stands that day:

- every reader of `tool/docs/reference/` under `tool/` and `.github/workflows/`, checked against
  the file map;
- the assertions the drift tests make about page content, verbatim: in `usage_test.go`, the
  request-count row form and the sweep-cap sentence; in `json_schema_test.go`, every golden key
  in backticks, the headings `## What freezes at 1.0` then `## What does not freeze` with what
  each section must contain, and the whole reason vocabulary in backticks;
- what the retirement added to the contracts: any payload kind, schema, reason code, or flag;
- the goldens under `tool/internal/render/testdata/`, one line each, and which payload kind has
  no golden (`cairn-auth-check` at B2);
- every value in the goldens that the substitution rule covers.

**Acceptance:** each list is complete against `git grep`; every disagreement with this plan's
file map or task text is named. A disagreement stops the pass for a plan amendment.

### Task 2: The scripter-or-agent profile

`cairn-implementer`. **Files:** the register, the 2026-08-14 record, the friction log.

**Outcome:** the register's reference section carries the profile and says the 2026-08-14 ruling
that the reference arm has no profile is overturned for two pages (Geoff, 2026-09-21), naming
them literally: `docs/reference/cli-cairn-exit-codes.md` and
`docs/reference/cli-cairn-json-output.md`. The profile has the five elements every track summary
has. The reader: anyone automating against `cairn`, a person writing a script or an agent. The
vocabulary contract: fully technical, nothing banned, imprecision is the defect. The arrival:
from `cairn help agents`, a `--json` help line, an admin page's link, or a failed run with a code
or a parse error in hand. The success criterion: they can branch on every exit code and parse
every payload without running the tool. The counterpart question: could a reader write a correct
wrapper and parser from this page alone, and does any behaviour require running the tool to
learn? The dated record gains one appended note pointing at the register. The friction log's
list of perspectives gains the fifth.

**Acceptance:** exactly those two paths are claimed; `cli-cairn-manifest.md`,
`cli-cairn-media-seed.md`, and every other reference page gain no profile; the record's body is
unchanged above the note; the docs gate is green; `diff-reviewer` accepts.

### Task 3: The schema move and the flag list

One implementer, `model: opus`, test-first. Both gates.

**Outcome:**

- the six schemas live in `docs/reference/schema/`, bytes and `$id` unchanged, and
  `json_schema_test.go` reads them there through `providers.RepoRoot()`;
- `tool/testdata/flags.json` lists every flag in the cobra tree, written by a `make -C tool
  flags` target, and a Go test fails, naming that target, when the tree and the file differ;
- `check-symbols.mjs` unions that file into the flags it accepts in shell fences, and its
  existing behaviour for `create-cairn-site` flags and the allowlist is unchanged.

**Acceptance:** `git diff -M --stat` shows the six schemas as pure renames; a fixture page with
`cairn health --json --quiet` passes `check:symbols` and one with `cairn health --no-such-flag`
fails naming the flag; removing a flag from `flags.json` fails the Go test; `check:package`
passes with the new directory in the tarball; both gates are green; `diff-reviewer` accepts.

### Task 4: Mining

One Sonnet read per original, then one `claude-opus-5` dispositions read over all three.

**Outcome, in `...pass-a.mining.md`, one section per destination page:**

- an ordered outline of the contract as the original presents it: for exit codes, each code, its
  word, its meaning, the precedence rule, what a held check contributes, `unknown` against
  `skip`, the request-count table, and the timeout arithmetic; for JSON, each payload kind, its
  schema file, the stream rules, and the two freeze lists;
- a command manifest: every fenced command verbatim, each with its source in the cobra tree;
- an example manifest: every JSON example mapped to the golden it derives from, with the
  substitutions from task 1 already applied; a payload kind with no golden is a disposition,
  never an invented payload;
- a dispositions diff: every contract statement in the original the container lacks, each with
  one disposition, file as a sourced bullet or cut with a reason.

**Outcome, in `docs/internal/facts/reference.md`:** two new `##` sections and additions to the
log-events section, every bullet `[verified]` against code on `main` with a `path:line` source,
including what task 1 found the retirement added.

**Acceptance:** `npm run check:facts` is green; no bullet's source is a `tool/docs/` page; the
Opus read lists every contract statement in each original and names the bullet or ratified
disposition that carries it, with none unaccounted for and every cut carrying a reason it
ratified. Its ratification is final within the task; an overturn it cannot resolve stops the
pass.

### Task 5: `docs/reference/cli-cairn-exit-codes.md`

Dispatched with tasks 6 and 7. The conductor dispatches this chain in order, each agent with zero
context and the inputs named here: a Sonnet drafter; the docs gate; `cairn-register-editor` on
`claude-opus-5`, its prompt requiring a profile section; a fresh `claude-opus-5` profile grader
with the task 2 profile printed in its prompt, one verdict per element; a `claude-opus-5` fact
read tracing every claim to a task 4 bullet or ratified disposition; one redraft round by the
drafter on the combined findings. A second `fix` verdict goes to the conductor.

**The drafter receives:** this brief, the task 2 profile, the register's universal contract and
reference section, the task 4 section and manifests for this page, the bullets re-keyed to this
page, the exemplar `docs/reference/cli-cairn-manifest.md`, the error-tier Vale rule list, and the
task 1 ledger lines for `usage_test.go`.

**The brief.** The reader's job: decide what a script or a monitor does on each exit. Anatomy:
the register's reference entry, a narrative lede, then the contract. Arrival includes a failed
run with a code in hand, so the code table is reachable without reading the lede. The page
states every code and word, the precedence rule, what a held check contributes, `unknown`
against `skip`, the request-count table in the row form the ledger records, and the sweep-cap
sentence verbatim. It carries one line naming the `cairn` version it describes. It does not
cover credentials, scheduling, or how to fix a failing check, and it links to nothing in the
admin arm. It does not edit `docs/reference/README.md`.

**Acceptance:** the docs gate is green apart from `check:arm-indexes`, which task 8 closes; all
three reads accept, or the second `fix` verdict is with the conductor.

### Task 6: `docs/reference/cli-cairn-json-output.md`

Dispatched with tasks 5 and 7. The conductor dispatches this chain in order, each agent with zero
context and the inputs named here: a Sonnet drafter; the docs gate; `cairn-register-editor` on
`claude-opus-5`, its prompt requiring a profile section; a fresh `claude-opus-5` profile grader
with the task 2 profile printed in its prompt, one verdict per element; a `claude-opus-5` fact
read tracing every claim to a task 4 bullet or ratified disposition; one redraft round by the
drafter on the combined findings. A second `fix` verdict goes to the conductor.

**The drafter receives:** this brief, the task 2 profile, the register's universal contract and
reference section, the task 4 section and manifests for this page, the bullets re-keyed to this
page, the exemplar `docs/reference/cli-cairn-manifest.md`, the error-tier Vale rule list, and the
task 1 ledger lines for `json_schema_test.go`.

**The brief.** The reader's job: parse every payload `cairn` writes under `--json`. Anatomy:
reference entry, a lede, the stream rules, one section per payload kind, then the two freeze
sections. Arrival includes a parser that just failed. The page names every key the goldens carry
in backticks, carries the whole reason vocabulary in backticks, and ends with
`## What freezes at 1.0` followed by `## What does not freeze`, each holding what the ledger says
the test requires. For each payload kind it names the schema by a relative link into
`docs/reference/schema/` and by its `$id`, says the schema is normative where the two differ, and
says a `$id` under `https://cairn.pub/schema/` is an identifier that need not resolve. Every
example comes from the example manifest unchanged. A kind with no golden gets no example and
says its schema is the contract. It carries one line naming the `cairn` version it describes. It
does not edit `docs/reference/README.md`.

**Acceptance:** as task 5, plus every example matches its manifest entry byte for byte and no
substituted value appears in its original form.

### Task 7: Fold the tool's log-event content into `docs/reference/log-events.md`

Dispatched with tasks 5 and 6. `cairn-implementer`; this page is maintained in place.

**Outcome:** one added section, in the page's existing register, saying what `cairn` does with
the vocabulary: it carries a completion-list copy kept in sync by a test, what it does and does
not do to a record, and where that test lives. The vocabulary table is untouched.

**Acceptance:** the docs gate is green; a `claude-opus-5` fact read finds every sentence of the
addition in a task 4 bullet and every contract statement of the original carried or ratified as
cut; `diff-reviewer` accepts.

### Task 8: The tool-side move

After tasks 5, 6, and 7 are accepted. One implementer, `model: opus`. Both gates.

**Outcome:**

- `tool/docs/reference/` holds only a short `README.md` saying the pages moved to
  `docs/reference/` and the schemas to `docs/reference/schema/`, with the cairn.pub URLs;
- in `layout.go`, the constant that holds `https://cairn.pub/docs/admin/is-it-working#` is named
  for what it is, and a separate base, `https://cairn.pub/docs/`, serves every other docs link;
  the three fix-line anchors and their test are unchanged in behaviour;
- the `--json` long help and `cairn help agents` name the cairn.pub pages and the repository
  path `docs/reference/`, so the printed line is never wholly wrong while cairn.pub lacks the
  route;
- every comment, test, and golden the file map lists names the new paths; the budget-docs test
  in `messages_test.go` is split so its `tripwire.md` half is unchanged; `make -C tool copy-list`
  and the help goldens are regenerated, and each golden's diff is only repointed lines;
- a new Go test derives every verdict's exit code and wire word from `internal/spine` and fails
  when the exit-codes page's table omits one, carries an extra, or pairs them differently, and
  fails when either page's version line disagrees with `tool/internal/version`;
- `tool.yml`'s two `paths` lists and its header comment cover both pages and the schema
  directory;
- `docs/reference/README.md` links both pages.

**Acceptance:** both gates are green, the tool gate by absolute worktree path;
`git grep -n "docs/reference" -- tool/` returns only root-relative paths under `docs/reference/`,
files under `tool/docs/design/`, the new stub, and `tool/CHANGELOG.md`'s released entries;
`tool/docs/tripwire.md` differs from `main` in exactly two lines; changing a word in the
exit-codes table fails the new test; `diff-reviewer` accepts against this list.

### Task 9: The scripter test

Two `claude-opus-5` agents. The first receives only the markdown source of the two pages, pasted
into its prompt, and has no repository access. The second reports to the conductor only.

**Outcome:** from the pages alone, the first agent writes a shell wrapper that branches on every
exit code under the precedence rule, and a parser that asserts every documented field of every
payload kind, and lists every point where it had to guess. The second agent runs the parser
against every golden under `tool/internal/render/testdata/json/`, checks the parser's asserted
fields against each schema in `docs/reference/schema/`, and checks the wrapper's branches against
`tool/internal/spine/exit.go`. A field a page documents that no schema declares, a required
schema field a page omits, a branch that disagrees with the spine, and every guess are findings
against a page. The kind with no golden is checked against its schema alone.

**Acceptance:** no finding remains. A finding goes through one redraft of the page concerned, by
the task 5 or 6 chain from the fact read onward, and one re-run of this task. A second failing
run goes to the conductor. Scratch artifacts stay in the session scratchpad.

### Task 10: The pass-end read

One fresh `claude-opus-5` `diff-reviewer` over the whole branch against this plan's global
constraints: the substitution rule, the link rule, the untouched files, and the frozen contracts.

**Acceptance:** accept, or findings fixed by one implementer dispatch and re-read once.

### Task 11: Close

One fold agent drafts and commits; one independent `diff-reviewer` reads the fold.

**Outcome:**

- `CHANGELOG.md`, under `## Unreleased`: the tool's contract pages live under `docs/reference/`
  and the schemas under `docs/reference/schema/`, shipped in the package, with a plain statement
  of what someone who linked to the old paths does;
- the friction log triaged, complete-or-move;
- `docs/HISTORY.md` gains the pass entry, with what a later pass would be wrong to rediscover:
  the drift tests that dictate page structure, the path-existence check in `check:symbols`, the
  goldens' real values, the mining measurements;
- the mining file is deleted;
- the sizing record gains one note that the link repoint ships in the `tool/v1.1.0` cut after
  this pass;
- the cairn-pub handoff record states: the pin problem STATUS records; the two new reference
  pages for its nav; the `/schema/` route serving `docs/reference/schema/` verbatim; and the URL
  shape `https://cairn.pub/docs/<arm>/<page>` as a contract the binary prints;
- the full gate is green, the PR is open, and the `tool` workflow is green on its head;
- after the PR merges, and after the conductor has told every live session, `docs/STATUS.md`
  says pass A is merged, names the merge SHA, and says the cut now waits only on `tool/v1.1.0`,
  which the tool's conductor cuts from that SHA or later. This pass never writes the sentence
  "the `0.97.0` cut is unblocked"; the tag's close does, since it lands last;
- the pass is scored: tokens against 3.5M, planning misses, execution sittings.

**Acceptance:** `diff-reviewer` accepts the fold; the PR's checks are green; no file outside the
file map changed, or each extra file is named with its reason; STATUS is edited only after the
merge.

---

## Ledger

Written by the conductor at each segment boundary: tasks done, decisions taken, spend, next task.
