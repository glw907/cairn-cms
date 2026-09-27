# Go tool architecture chores

> **For agentic workers:** thirteen implementation tasks plus a read-only Task 0, four segments,
> in the one `go-chores-plan` worktree. Execution is the workflow runner `pass-execute`, invoked by
> name once per segment, tasks sequential, with `cairn-implementer` on `sonnet` at effort `high`,
> `diff-reviewer` on `claude-opus-5-5`, and the gate run inside the chain on the light lane. **The
> conductor never reads a diff, a test log, or a gate transcript**; it consumes the runner's
> per-task records and decides accept, re-dispatch, split, or stop. One re-dispatch on a `fix`
> verdict; a second `fix` is the conductor's decision. `go-architecture-reader` runs once per
> touched package at the close, never inside the per-task chain.

**Date:** 2026-09-27. **Goal:** clear every defect and nit the two ROADMAP Next-tier Go entries
name, "The B2 architecture reads, what retire-1 left" and "Go tool architecture chores filed at
retire-1's close", as a behavior-preserving refactor of the `tool/` module.

**Pass class:** `tool`. Per-task gate `make -C tool check` on the light lane, Opus
`diff-reviewer`, test mandate `go-conventions`, and at the close one `code-simplifier` plus one
`go-architecture-reader` per touched package. No task changes painted terminal output, so no
`tui-visual-verify` step applies; a task that finds it must is a stop.

**Token ceiling:** 8.5M. **Checkpoint interval:** four tasks (STATUS written after Tasks 3, 6,
10, and 13, at any split, and before any question). At 80% of the ceiling (6.8M) the conductor
finishes the task in flight, writes STATUS, and asks one combined question at the next segment
boundary.

**Execution mode:** `pass-execute`, one invocation per segment, tasks sequential. The tasks are
file-disjoint by package except four named crossings, each owned by exactly one task: Task 1
edits one comment in `internal/hygiene/severity_test.go`, Task 5 edits one call in
`internal/render/body_test.go`, Task 8 edits `cmd/cairn/usage_test.go`, and Tasks 11 and 13 both
edit `cmd/cairn/messages.go` (Task 11 one string value, Task 13 comments only). Sequential order
makes every crossing safe.

**Branch:** execution continues on `go-chores-plan` in `.claude/worktrees/go-chores-plan`; this
plan's commit is its first. It merges to `main` by PR at the close. **No tool release, no tag, no
npm version.**

**Models:** Task 0 `sonnet`; implementer `cairn-implementer` (`sonnet`, effort `high`); reviewer
`diff-reviewer` (`claude-opus-5-5`); close reads `go-architecture-reader` (`claude-opus-5-5`),
`code-simplifier:code-simplifier` (its own pin); conductor `claude-opus-5-5` at effort `medium`.

**Segments:**

| Segment | Tasks | Packages |
| --- | --- | --- |
| S1 | 0, 1, 2, 3 | pre-flight, `spine`, `logs`, `store` |
| S2 | 4, 5, 6 | `doctor`, `health`, `providers` |
| S3 | 7, 8, 9, 10 | `render/fixtures`, `cmd/mangen` and `internal/exe`, `render` twice |
| S4 | 11, 12, 13 | `cmd/copylist`, `cmd/cairn` twice |

Every boundary lands on a green commit.

---

## Pre-flight findings (verified 2026-09-27 at `main` `c9beafb3`)

`make -C tool check` is green at `c9beafb3` on the light lane. Every path, symbol, count, and
line reference in the two ROADMAP entries and the B2 record
(`docs/internal/record/2026-09-21-go-tool-b2-architecture-reads.md`) was checked against that
tree. What holds is folded into the tasks. What drifted or is false:

1. **`probe_token.go` names no retired command.** The retired-name wording lives in
   `cmd/cairn/probe_cloudflare.go:56` ("the retired auth probe command"), and `cairn auth probe`
   is not retired: it is a hidden alias of `cairn auth check`. `cmd/cairn/main.go:44` and `:134`
   name `auth probe` as though it were the live command, and `main.go:133-137` also carries a
   stale rationale: it says the command's verdict is a typed error "rather than a call into
   spine.ExitCode", yet `probe_token.go:131` computes that verdict with `spine.ExitCode`.
   `docs/internal/facts/reference.md`'s `f:cwtfs7` restates the same stale rationale.
2. **The doctor's `Result.ID` never reaches the JSON payload.** `internal/doctor/json.go:107`
   reads `cr.Check.ID`. The stamp at `internal/doctor/report.go:50` flows into
   `spine.CheckVerdict.ID` through `status.go:65-69`, and so into the exit-code fold. The
   assertion is still owed; the ROADMAP's stated consequence is wrong.
3. **`cmd/copylist` misses three concatenated consts, not one.** `longRoot`
   (`cmd/cairn/messages.go:77`), `longHealth` (`:265`), and `longDoctor` (`:312`) are all
   `*ast.BinaryExpr` values absent from `tool/testdata/copy.golden.md`. A dry run of
   `scripts/check-copy.sh` over a golden carrying the three folded strings fails on `longDoctor`:
   its first sentence carries four commas before its first period (copy-standard section 2.5).
   The gap the ROADMAP names has been hiding a real copy-rule violation.
4. **`spine.FromKind` and `spine.Kind` are pre-adjudicated 2.0 seams.** The 1.0 plan's seams
   table (`docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md:282-305`) names `FromKind`
   with its 2.0 caller, the HUD's detail view, and `kind.go:18` says so. `Kind` is its parameter
   type. Decision 2 keeps both.
5. **`CombineState` is not open-coded in `check_creds.go`.** `worseCredentialOutcome`
   (`internal/health/check_creds.go:115-126`) breaks a tie between two Unknowns by
   `credentialRank`, which `CombineState` cannot express. `CombineState` has no caller anywhere.
6. **`render`'s "roughly thirty" callerless exports are eighteen after the seams table.** The
   seams table pre-adjudicates `Render`, `RenderInput`, `Frame`, `NewTheme` with `Style` and
   `Sized`, the glyph set, and `Profile`. What remains callerless outside the package is
   `Sanitize`, `WidthFloor`, `WidthNarrow`, `Width100`, `WidthCap`, six `*SchemaVersion`
   constants (`DoctorSchemaVersion` has a caller in `internal/doctor/json.go`), and seven `Theme`
   methods (`Strong`, `SizedStrong`, `SizedLink`, `Link`, `Clamp`, `Rule`, `Width`). Decision 5
   rules on `Role`, the `Profile` constants, and the rest.
7. **`RenderInput.FailingOnly` has no writer at all, not even a test.** `body_single.go:36` and
   `body_plain.go:42` read it; nothing under `tool/` sets it, so both branches are untested.
   `Height` (`render.go:84`) has no reader; `golden_test.go:349` sets it for one case whose
   golden, `testdata/golden/single/one-sick_w100_truecolor_dark_narrow_h024.txt`, is
   byte-identical to its base.
8. **Process citations: counts moved, and two sites the ROADMAP names are gone.** Shipped
   (non-test) files at HEAD: `cmd/cairn/messages.go` 22 "editorial gate" notes (ROADMAP "about
   thirty"); `cmd/cairn/root.go:37,77-78`, `health_sweep.go:3,34,209`, `ack.go:177`; `render` about
   20 (ROADMAP 23), with `render.go:1-13` stale (names two of four bodies); `health/fixes.go` 7
   (ROADMAP three) plus 11 in `health/messages.go` the ROADMAP never named; `spine/catalogue.go:4`.
   The B2 record's `env.go:41` and `deps.go:61` citations are already gone. Test files carry about
   150 more (Decision 11).
9. **Line drift, no substance change:** `logs_test.go`'s `fixtureRoundTripper` sits at `:19-33`
   (ROADMAP `:26`); `health.go`'s Degraded and Acknowledged derivation at `:124-136` (record
   `:127-135`); `usage_test.go`'s `builtBinary` at `:29-44` (record `:26-44`); `health`'s
   `Catalogue` holds 38 entries (ROADMAP "about 35").
10. **`outcome.go`'s "eight fixed constants" is already fixed** (it reads "nine").
11. **The facts gate reads this module.** `docs/internal/facts/{admin,reference,extend}.md` cite
    `tool/` files by line range and quoted anchor, and `node scripts/checks/check-facts.mjs` checks
    each anchor within ten lines of its citation. It is a Node script with no browser, so it is
    light. At `c9beafb3` it already reports one defect this pass does not own
    (`docs/internal/facts/admin.md:53`, an anchor into `package.json:197-198`).
12. **No chore touches a file `check:tool-conditions` or `check:tool-heuristics` reads.** The
    first compares `tool/internal/spine/conditions.json` and
    `tool/internal/doctor/site-config-path.json` against their generator; the second greps
    engine literals under `src/lib`. No task edits either JSON file or anything under `src/lib`,
    so neither light check joins a task gate. **No task needs the engine's npm gate**; nothing
    moved out of scope for that reason.
13. **`store`'s perm pair is byte-identical and pinned.**
    `internal/hygiene/identicalfiles_test.go:15` asserts it, so the header ruling must land
    byte-identical in both files.
14. **Concurrent branches touch files near this pass.** `draft-docs-0` (paused) edits
    `tool/cmd/cairn/flags_test.go` and `tool/testdata/flags.json`; `theme-identity-a` edits
    `docs/internal/facts/admin.md`. This pass edits neither tool file, and its facts edits are
    line repoints only, so any merge conflict is mechanical.

---

## Decisions this plan makes

1. **`store.Discover` and `store.Site` are deleted, not wired.** No caller's semantics match.
   `cairn auth check <site>` loads one record by id (`probe_token.go:84`). Shell completion
   (`root.go:285`) must list every id, including a site with no repository yet, and must not fail
   wholesale on one malformed record, and `Discover` does both. The sweep needs whole records.
   `Discover` is not in the seams table, and the HUD's registry seam is `store.List`. Wiring it
   would bend a caller to fit an unwanted function.
2. **`spine.FromKind` and `spine.Kind` stay exported**, the seams table's pre-adjudication
   (finding 4). Both ROADMAP entries' callerless-export lines are closed for these two by that
   ruling, recorded as declined.
3. **`spine.CombineState` and `spine.ExitCodeFor` are deleted with their tests; `ParkCodes`
   goes unexported.** Neither function has a caller (finding 5); unexporting a callerless
   function only trips the `unused` linter. `ParkCodes`'s one caller is `outcome.go`, in the same
   package, which reads the backing slice directly. The property test at `exit_test.go:76` keeps
   its coverage expressed through `ExitCode` or a local table.
4. **"Derive from the source" means one production list per vocabulary, proven complete by an AST
   read of its own const block, and no second copy anywhere.** Go cannot enumerate a const block
   at run time, so a string-typed vocabulary keeps one backing slice; the derivation is a test
   that parses the declaring file, as `cmd/copylist` does, and fails naming any const missing from
   the slice or out of declaration order. That applies to `spine`'s four string vocabularies
   (`Code`, `ParkCode`, `ReasonCode`, `Condition`) and `health`'s `Catalogue`. An int-typed
   vocabulary derives outright: `providers.Reason` becomes one index-keyed name table from which
   both `String` and `Reasons` read. A test-side copy (`park_test.go`'s `allParkCodes`,
   `fixtures.nineCheckIDs`, `messages_test.go`'s restated function list) reads the source instead.
   The ROADMAP's "five-copy vocabulary" is read as the five hand-kept enumerations in `spine` at
   HEAD: `codes`, `parkCodes`, `fixedReasonCodes`, `conditions`, and the test's `allParkCodes`.
   The existing `conditions` mirror test against `conditions.json` stays; the AST check is
   additive and does not collapse the gate retire-1 kept deliberately.
5. **The `render` cut unexports the eighteen names in finding 6 and keeps every seams-table
   name.** Kept: `Render`, `RenderInput`, `Frame`, `Body`, `View`, `Verdict`, `SelectBody`,
   `NewTheme`, `Theme` with `Style`, `Sized`, and `Wrap` (`Wrap` has a caller at `root.go`),
   `Role` and its eight constants (the `Style(role)` seam cannot be called without them),
   `Profile` and its four constants (the `NewTheme(dark, p Profile)` seam and `DetectProfile`'s
   return), `Glyphs` and `GlyphSet` (the glyph set row), and every name with an outside caller.
   The seven `Theme` methods go unexported although `purity_test.go`'s comment calls the whole
   method set a HUD seam: the approved seams table names only `Style` and `Sized`, the rest are
   constrained forms of those two, and inside `internal/` re-exporting later costs one rename
   with no compatibility promise. A name whose only readers after the cut are tests moves into
   the test file that reads it or is deleted, so no production file carries test-only data.
6. **`RenderInput.Height` and `RenderInput.FailingOnly` are deleted**, with the `tall` golden case
   and its h024 golden. `Height` has no reader; `FailingOnly` has no writer and its two branches
   are untested (finding 7). The HUD re-adds either with its own caller and its own test. No
   command sets either, so no operator output moves.
7. **`fixtures`' `Acknowledged` stays scenario data; its `Degraded` is proven against the real
   rule.** `health.Run` derives `Acknowledged` from the acknowledgement file (`activeAckIDs`), which
   a fixture does not have, so the fixture's own list is the scenario's statement, and a comment
   says so. `Degraded` is a restated rule, so a fixtures test drives each fixture's check results
   through `health.Run` with stub checks and asserts the same `Degraded`. No health export is added
   for a test-support package, since that would be a test-only seam of its own.
8. **`cmd/cairn`'s `checks` seam becomes an ordinary `deps` field.** `newDeps` fills it with
   `health.All`, every test builder that reaches a health run sets it, and the nil-means-default
   method `healthChecks` is deleted. The B2 record's alternative, a package variable a test swaps,
   is rejected: it is mutable global state that breaks `t.Parallel`, against `deps`' own
   documented design.
9. **`longDoctor`'s first sentence is split, and that is the one operator-visible change.** Once
   `cmd/copylist` folds concatenations, the copy gate reaches `longDoctor` and fails it (finding
   3). The fix splits the first sentence so at most one comma precedes the first period, keeping
   every clause and fact. It changes `cairn doctor --help` only; no golden, transcript, or doc
   quotes the sentence. It earns one `## Unreleased` bullet in `tool/CHANGELOG.md` and nothing in
   the engine's `CHANGELOG.md`. A `copylist` const value that is neither a string literal nor a
   fold of string literals (and not a non-string literal) fails the generator loudly, so this gap
   cannot reopen silently.
10. **`probe_token.go` keeps its file name.** The rename the B2 record suggested (to
    `auth_check.go`) would break two facts citations and the test-file allowlist in
    `messages_test.go:34`, and the ROADMAP's defect is the stale wording, which Task 13 fixes where
    it lives (finding 1). The rename and the probe-files fold stay with the record's unplanned
    nits.
11. **The process-citation rule, and its reach.** A shipped comment may cite a durable standard
    (`copy-standard.md` section 2.5), a durable evidence record (`docs/internal/record/...`), a spec
    as the source of a design fact, or a dated live measurement ("a live check on 2026-09-21
    found ..."). It never cites a task, a plan, a criterion number, a pass, a review gate, or
    "this task's report". Where a citation was a comment's whole content, the comment states the
    reason instead or goes, per `go-conventions`. The pass covers every non-test `.go` file under
    `tool/`; the roughly 150 citations in `_test.go` files are not shipped and stay out, recorded in
    HISTORY so a later pass does not rediscover them as new.
12. **The B2 record's nits outside the two ROADMAP entries stay unplanned.** The entries'
    bullets are this pass's scope. The close keeps one residual ROADMAP entry listing the declined
    items with reasons and pointing at the record for the rest, each triggered by the next pass
    touching that package.
13. **`check-facts` is a per-task acceptance check, not part of the gate string.** It exits
    non-zero at HEAD on a defect this pass does not own (finding 11), so a task's criterion is
    that its defect set equals Task 0's baseline. A task whose edit moves a cited line or renames
    an anchored symbol repoints that fact in the same task, changing only the `Source:` pointer or
    anchor, except `f:cwtfs7`'s stale clause, which Task 13 corrects.

---

## Global constraints

- Work only in `.claude/worktrees/go-chores-plan`. Never touch another worktree. Commit specific
  files, never `git add -A`. Every commit ends with `Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>`.
- `go-conventions` is mandatory for every Go file (`~/.claude/skills/go-conventions/SKILL.md`),
  `golang-spf13-cobra` for `tool/cmd/cairn` (`~/.claude/skills/golang-spf13-cobra/SKILL.md`). The
  architecture is ADR-0001 (`tool/docs/adr/0001-the-spine-is-the-product.md`): no logic moves into
  a view, and the three 1.0 seams keep their tests.
- **Behavior-preserving.** Every golden stays byte-identical except the two this plan names:
  `tool/testdata/copy.golden.md` gains `longRoot`, `longHealth`, and `longDoctor` (Task 11), and
  the h024 render golden is deleted (Task 9). Any other change under `tool/testdata/` or
  `internal/render/testdata/` is a stop-and-report, never a regenerate.
- Never edit `tool/internal/spine/conditions.json`, `tool/internal/doctor/site-config-path.json`,
  `tool/cmd/cairn/flags_test.go`, `tool/testdata/flags.json`, or anything outside `tool/` except
  `docs/internal/facts/*.md` line repoints (Decision 13) and the close's ledgers.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C
  /var/home/glw907/Projects/cairn-cms/.claude/worktrees/go-chores-plan/tool check'`, re-issued on
  exit 75 until it prints `gate exit:`. Then `node scripts/checks/check-facts.mjs` from the
  worktree root, whose defect set must equal Task 0's baseline. No browser gate runs in this pass,
  since an engine pass runs concurrently.
- `unused` and `unparam` are enabled (`tool/.golangci.yml`): a name with no reader is deleted, not
  unexported.
- A removed or renamed symbol is grepped across `tool/`, `docs/`, and `README.md` before the task
  reports, and every hit is repointed or recorded.
- Each implementer runs the gate-economy pre-flight in its notes: no comment claims what its
  assertion does not prove, no process citation in a shipped comment, counts found and changed.

## Review focus

The `diff-reviewer` checks, beyond each task's criteria:

- Output bytes are unchanged: goldens green, no golden regenerated outside the two named.
- No seams-table name (Decisions 2 and 5) lost its export.
- A new test proves what its comment claims, and where the task asks for a red-first
  demonstration, the report carries it.
- The process-citation rule (Decision 11) is applied as written: dated evidence and standard
  pointers survive, and task, criterion, plan, and gate citations do not.
- The facts defect set equals the baseline.

---

## Task 0: pre-flight (S1, read-only, no gate)

**Outcome:** every factual claim Tasks 1 to 13 make is re-checked at the execution HEAD, and the
plan is amended before the first dispatch where one drifted.

**Constraints:** read-only; `sonnet`; no gate (the conductor's one lane-launch `cairn-run-gate`
call is the baseline). Re-run at each later segment start for that segment's tasks.

**Acceptance:**
- Every path, symbol, line reference, and count in this plan's pre-flight findings and task
  criteria is confirmed or reported drifted, one line each.
- The `check-facts` baseline defect set is recorded verbatim.
- The list of every `tool/` file the facts container cites is recorded, so each task knows which
  of its files carry citations.
- `git log main -- tool/` since `c9beafb3` is empty, or each new commit is named with the tasks
  it affects.

**Files:** none.

## Task 1: `spine`, the callerless exports and the vocabulary lists (S1)

**Outcome:** `spine` exports only what a caller or the seams table needs, and each of its four
string vocabularies lives in exactly one hand-written list proven complete against its const
block.

**Constraints:** Decisions 2, 3, 4, and 11. `FromKind` and `Kind` untouched.

**Acceptance:**
- `CombineState` and `ExitCodeFor` and their tests are gone; `exit_test.go`'s severity-agreement
  property keeps equivalent coverage without them.
- `ParkCodes` is unexported or removed; `outcome.go`'s `ReasonCodes` still builds the same
  vocabulary, proven by the existing tests.
- `park_test.go`'s `allParkCodes` is gone; `park_test.go` and `condition_test.go` read the
  package's backing list.
- A test parses the package's own source and fails, naming the const, when any `Code`,
  `ParkCode`, `ReasonCode`, or `Condition` constant is missing from its backing list or out of
  declaration order. The report shows it red against a deliberately dropped entry, then green.
- `catalogue.go`'s task citation is gone (Decision 11).
- `internal/hygiene/severity_test.go`'s comment naming `ExitCodeFor` names what now exists.
- Gate green; `check-facts` at baseline, with `f:` citations into `spine/exit.go`,
  `outcome.go`, and `park.go` repointed where lines moved.

**Files:** `tool/internal/spine/{exit.go,exit_test.go,park.go,park_test.go,condition_test.go,outcome.go,catalogue.go}`,
one new or existing `spine` test file for the AST check, `tool/internal/hygiene/severity_test.go`
(comment only), `docs/internal/facts/{admin,reference}.md` (repoints only).

## Task 2: `logs`, the fixture that sees the request (S1)

**Outcome:** the test transport records what `Fetch` and `FetchRecords` actually send, and the
query assertions read that record, so a wrong outgoing body fails a test. This is the seam that
let the live 400 through.

**Constraints:** test-only change; `logs.go` changes only if a test cannot otherwise reach the
sent body, and then without behavior change.

**Acceptance:**
- `fixtureRoundTripper` captures each request's method, path, and decoded JSON body.
- `Fetch` and `FetchRecords` each have a test asserting from the captured body: the worker, every
  filter with its `type`, the `exists` filter carrying no value, the timeframe computed from
  `queryNow`, and the limit where one applies.
- The filter assertions no longer restate `buildQuery`'s arguments by hand; they read the body
  the call sent.
- The report shows one new assertion red against a deliberately wrong filter type, then green.
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/logs/logs_test.go`.

## Task 3: `store`, the unwired walk and the perm ruling (S1)

**Outcome:** `store` carries no unwired deliverable, and the byte-identical perm pair says why it
is two files.

**Constraints:** Decision 1. The two perm files stay byte-identical.

**Acceptance:**
- `discover.go` and `discover_test.go` are deleted; nothing under `tool/`, `docs/`, or
  `README.md` names `store.Discover` or `store.Site`.
- `perm_linux.go` and `perm_darwin.go` open with the same header stating the ruling: the module
  forbids build tags (`internal/hygiene`'s `TestNoBuildTags`), so the pair stays two
  byte-identical files, and `identicalfiles_test.go` asserts the identity instead.
- `internal/hygiene`'s identical-files test and the Windows build still pass (`GOOS=windows go vet
  ./internal/store` green in the report).
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/store/{discover.go,discover_test.go,perm_linux.go,perm_darwin.go}`.

## Task 4: `doctor`, the `Result.ID` stamp observed (S2)

**Outcome:** a wrong id stamped by `doctor.Run` fails a test.

**Constraints:** test-only change.

**Acceptance:**
- A test runs `doctor.Run` over an existing snapshot fixture and asserts every pair's
  `Result.ID` equals its `Check.ID`, and that `Verdicts(Results(...))` carries the same ids in
  report order.
- The report shows the test red with the stamp at `report.go:50` removed, then green.
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/doctor/report_test.go`.

## Task 5: `health`, the exports, the `Catalogue` list, and the citations (S2)

**Outcome:** `health` exports only what an outside caller uses, its `Catalogue` cannot silently
drop a message, and its shipped comments carry reasons, not provenance.

**Constraints:** Decisions 4 and 11. `copy.golden.md` unchanged.

**Acceptance:**
- `FailSeverityOf`, `HasRepo`, `FixForCondition`, and `FixForCode` are unexported;
  `render/body_test.go` reaches the fix line through `health.FixFor` instead.
- A test reads `messages.go` by AST and fails, naming the symbol, when an operator-facing
  message it declares is reachable from neither `Catalogue` nor a named exemption carrying its
  reason. The report shows it red against one deliberately dropped `Catalogue` entry.
- `messages_test.go` no longer restates the zero-argument message functions; it reaches them
  through `Catalogue` or the AST list, keeping only argument-carrying calls as explicit cases.
- `fixes.go`'s and `messages.go`'s process citations are gone (Decision 11), about 18 sites.
- Gate green (`copy.golden.md` unchanged); `check-facts` at baseline, with `severity.go` and
  `health.go` citations repointed where lines moved.

**Files:** `tool/internal/health/{severity.go,check_deploy.go,check_publish.go,check_engine.go,fixes.go,messages.go,messages_test.go}`,
their tests as needed, `tool/internal/render/body_test.go` (one call),
`docs/internal/facts/reference.md` (repoints only).

## Task 6: `providers`, the dead method and the `Reason` lists (S2)

**Outcome:** `providers` carries no method with no caller, and `Reason`'s ten values are named in
one place.

**Constraints:** Decision 4. Every `Reason.String` value unchanged.

**Acceptance:**
- `GitHub.RepoOwnership` and its four tests are deleted. Its corpus fixtures under
  `packages/create-cairn-site/fixtures/` are not touched, since they live outside `tool/`.
- `String` and `Reasons` both read one index-keyed name table; a test fails when a `Reason`
  constant has no name or the table outgrows the constants.
- The existing `String` and `Reasons` tests pass unchanged in their expected values.
- Gate green; `check-facts` at baseline, with `providers/errors.go` citations repointed.

**Files:** `tool/internal/providers/{github.go,github_test.go,errors.go,errors_test.go}`,
`docs/internal/facts/reference.md` (repoints only).

## Task 7: `render/fixtures`, the ids and `Degraded` from their source (S3)

**Outcome:** the fixtures cannot drift from `health`'s check set or its `Degraded` rule.

**Constraints:** Decision 7. Every render golden byte-identical.

**Acceptance:**
- `nineCheckIDs` is derived from `health.All`'s `ID()` values in order.
- A fixtures test drives every exported fixture's check results through `health.Run` with stub
  checks and asserts each report's `Degraded` matches the fixture's.
- `report`'s `Acknowledged` derivation carries a comment giving Decision 7's reason.
- Gate green with every render golden unchanged; `check-facts` at baseline.

**Files:** `tool/internal/render/fixtures/{fixtures.go,fixtures_test.go}`.

## Task 8: one build helper for `cmd/mangen` and `usage_test.go` (S3)

**Outcome:** the cairn build that `cmd/mangen` and `cmd/cairn`'s usage tests both run lives once.

**Constraints:** `usage_test.go` keeps its once-per-run caching; `make man` still works from
`tool/`, and `go test ./cmd/mangen` works from its own directory.

**Acceptance:**
- One helper in `internal/exe` builds the `cairn` binary into a given directory from a given
  module root; `cmd/mangen/main.go`'s `buildCairn` and `usage_test.go`'s `builtBinary` both call it.
- `make -C tool man` succeeds in the report, and its output is not committed.
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/exe/exe.go` (or a new `internal/exe` file), `tool/cmd/mangen/main.go`,
`tool/cmd/cairn/usage_test.go`.

## Task 9: `render`, the surface and the test-only fields (S3)

**Outcome:** `render` exports exactly the seams-table names and the names an outside caller uses.

**Constraints:** Decisions 5 and 6. Every render golden byte-identical except the deleted h024.

**Acceptance:**
- The eighteen names in finding 6 are unexported, or moved into the tests that alone read them.
- `RenderInput.Height`, `RenderInput.FailingOnly`, their reads, the `tall` golden case, and the
  h024 golden are gone.
- `purity_test.go`'s `exportedSurface` and `exportedThemeMethods` list the new surface, and their
  comments state the seams-table rule rather than calling every method a HUD seam.
- `palette.go`'s `groundHex` and `glyph.go`'s `ambiguousRunes` are left alone (a record-only nit,
  Decision 12).
- Gate green; `check-facts` at baseline, with `render/json.go` citations and any anchor naming a
  renamed constant repointed.

**Files:** `tool/internal/render/*.go` as the cut needs, `tool/internal/render/golden_test.go`,
`tool/internal/render/purity_test.go`,
`tool/internal/render/testdata/golden/single/one-sick_w100_truecolor_dark_narrow_h024.txt`
(deleted), `docs/internal/facts/reference.md` (repoints only).

## Task 10: `render`, the shipped comments (S3)

**Outcome:** `render`'s comments carry the reason for each rule and no provenance, and the
package comment names the package as it stands.

**Constraints:** Decision 11; comment-only, so a fix round takes the reduced gate.

**Acceptance:**
- No non-test `render` file cites a task, criterion number, plan, or review gate; each rule a
  citation stood for is stated as its reason.
- `render.go`'s package comment names all four bodies.
- Dated owner rulings and measurements (`glyph.go`'s 2026-09-20 pick, `json.go:185`'s schema
  note) stay.
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/render/{render.go,profile.go,profile_windows.go,palette.go,glyph.go,status.go,layout.go,body_many.go}`.

## Task 11: `cmd/copylist` folds concatenated consts (S4)

**Outcome:** every string const `cmd/cairn/messages.go` declares reaches the copy golden, and the
copy gate passes on what it newly sees.

**Constraints:** Decision 9. The only string value changed anywhere is `longDoctor`'s first
sentence.

**Acceptance:**
- `cairnCatalogue` folds a const built by `+` over string literals, parenthesized or not, and
  fails with a named error on any other non-literal string-valued const.
- A `copylist` test covers a folded concatenation and the loud failure.
- `make -C tool copy-list` regenerates `copy.golden.md`, which gains exactly `longRoot`,
  `longHealth`, and `longDoctor`, committed in its own commit.
- `longDoctor`'s first sentence is split so `check-copy` passes, every clause kept;
  `make -C tool check-copy` green, Vale included.
- `tool/CHANGELOG.md` gains `## Unreleased` with one `### Changed` bullet naming the reworded
  `cairn doctor --help` sentence.
- Gate green; `check-facts` at baseline, with `messages.go` citations repointed.

**Files:** `tool/cmd/copylist/{main.go,main_test.go}`, `tool/cmd/cairn/messages.go`
(`longDoctor` only), `tool/testdata/copy.golden.md`, `tool/CHANGELOG.md`,
`docs/internal/facts/*.md` (repoints only).

## Task 12: `cmd/cairn`, one JSON writer and an ordinary `checks` field (S4)

**Outcome:** the command package writes a JSON payload one way, and no `deps` field has a
nil-means-default branch that only tests reach.

**Constraints:** Decision 8; `golang-spf13-cobra`; every payload byte unchanged.

**Acceptance:**
- One helper writes a marshaled payload and its trailing newline; the eight
  `fmt.Fprintf(w, "%s\n", data)` sites (`adopt.go:129`, `doctor.go:105`, `health_json.go:30,47,67`,
  `logs.go:117`, `probe_token.go:141`, `sites.go:153`) call it, and none remain.
- `deps.checks` is set by `newDeps` to `health.All`; `healthChecks` is gone; every test builder
  that reaches a health run sets the field.
- The JSON golden and schema tests pass unchanged.
- Gate green; `check-facts` at baseline.

**Files:** `tool/cmd/cairn/{adopt.go,doctor.go,health_json.go,logs.go,probe_token.go,sites.go,deps.go,health.go,health_sweep.go}`,
their tests as needed (never `flags_test.go`), `docs/internal/facts/*.md` (repoints only).

## Task 13: `cmd/cairn`, the stale and process comments (S4)

**Outcome:** every `cmd/cairn` comment describes the code as it runs, names live commands, and
carries no provenance.

**Constraints:** Decisions 10 and 11; comment-only except the one fact correction, so a fix round
takes the reduced gate.

**Acceptance:**
- `root.go`'s `--color` and `--width` comments state what `cairn health` does with each value
  instead of calling them inert.
- `probe_cloudflare.go:56`, `main.go:44`, and `main.go:133-137` name `cairn auth check`, call
  `auth probe` a hidden alias where they mention it at all, and state the current reason
  `codedError` exists: the command computes its verdict with `spine.ExitCode` and hands it to
  `main` through `codedExit`.
- `f:cwtfs7` in `docs/internal/facts/reference.md` is corrected to the same reason and stays
  `[verified]`.
- No non-test `cmd/cairn` file cites a task, plan, criterion, or review gate: `messages.go`'s 22
  "editorial gate" notes, `root.go`, `health_sweep.go:3,34,209`, and `ack.go:177`.
- `copy.golden.md` unchanged; gate green; `check-facts` at baseline.

**Files:** `tool/cmd/cairn/{root.go,main.go,probe_cloudflare.go,messages.go,health_sweep.go,ack.go}`,
`docs/internal/facts/reference.md`.

---

## Close

Run by the conductor per `cairn-pass` and `pass-core`, after S4 lands green.

1. **Simplify once.** One `code-simplifier:code-simplifier` dispatch over the pass's changed Go
   code (`git diff main...HEAD -- tool`). Its edits run the per-task gate and `check-facts`, and
   one `diff-reviewer` reads them. A finding that would change output or unexport a seams-table
   name is declined with its reason.
2. **Full gate.** `make -C tool check` on the light lane, `check-facts` at baseline, and a
   `git diff --name-only main...HEAD` proving nothing outside `tool/`, `docs/internal/facts/`,
   and the ledgers changed. No engine npm gate runs: the pass touches nothing under `src/`,
   `packages/`, `examples/`, or `scripts/`. Push the branch and open the PR; `tool.yml`'s
   Linux, macOS, and Windows legs and every other workflow must be green before merge.
3. **Architecture reads.** One `go-architecture-reader` per touched package: `spine`, `logs`,
   `store`, `doctor`, `health`, `providers`, `render`, `render/fixtures`, `internal/exe`,
   `hygiene`, `cmd/mangen`, `cmd/copylist`, `cmd/cairn`. A structural finding is fixed in the
   pass or filed; a nit is filed.
4. **Docs.** No public behavior changed except `cairn doctor --help`'s first sentence, so no
   facts bullet is filed and no reference page changes. Triage `docs/internal/docs-friction-log.md`
   complete-or-move per `cairn-pass`.
5. **Ledgers.**
   - `ROADMAP.md`: delete both entries' shipped items. The survivors become one entry, "Go tool
     architecture, declined and unplanned (2026-09-27)", carrying each declined item with its
     reason (Decisions 2, 5 on `Role`, the `Profile` constants, and the glyph set, 7 on
     `Acknowledged`, 10 on the rename) and one line pointing at the B2 record for its nits
     outside the entries (Decision 12), triggered by the next pass touching that package. The
     architecture reads' new filings join it.
   - `docs/HISTORY.md`: a newest-first entry, "Go tool architecture chores, thirteen tasks,
     <date>": what landed with commit SHAs, what the gates caught, and what a later pass would
     be wrong to rediscover. That list includes the three hidden `Long` strings and the
     `longDoctor` violation, the seams-table rulings, the facts-gate coupling, and the ~150
     test-file citations left in place.
   - `tool/CHANGELOG.md` carries Task 11's bullet; the engine's `CHANGELOG.md` gets nothing.
   - `docs/STATUS.md` on `main`, present tense, pointing at the next action.
   - This plan: the ledger filled and a post-mortem appended, with both budgets scored (tokens
     against the 8.5M ceiling, attended time as planning misses and sittings).
6. **Fold review.** One fold agent authors steps 4 and 5; one independent `diff-reviewer` reads
   its diff.
7. **Merge** by PR, untagged, then pre-bake the handoff per `pass-core`.

---

## Ledger

