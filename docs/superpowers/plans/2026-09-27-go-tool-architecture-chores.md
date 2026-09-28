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

**Review:** single-lens fold, `docs/superpowers/research/2026-09-27-go-chores-plan-review.md`.

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
   its first sentence carries four commas before its first period. Section 2.5 governs fix lines;
   the script's comma rule treats any entry line ending in a period as one, and it reads only each
   entry's first line, so `longHealth`'s four-comma "Precedence is ..." continuation line passes
   unseen. The trip is the heuristic reaching a help `Long`, not a fix-line violation.
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
   (ROADMAP `:26`); `health.go`'s Degraded derivation is `report.Degraded = true` at `:131`, its
   Acknowledged derivation is `report.Acknowledged = activeAckIDs(acks, o.Now())` at `:140`
   (Task 0 correction, 2026-09-27: this plan's own pre-flight had said `:124-136`; the record said
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
3. **`spine.CombineState`, `spine.ExitCodeFor`, and `spine.ParkCodes` are deleted, the first
   two with their tests.** Neither function has a caller (finding 5); unexporting a callerless
   function only trips the `unused` linter. `ParkCodes`'s one caller is `outcome.go`, in the same
   package, which reads the backing slice `parkCodes` directly instead; an unexported
   `parkCodes()` would collide with that slice's name and have no reader. The property test at `exit_test.go:76` keeps
   its coverage expressed through `ExitCode` or a local table.
4. **"Derive from the source" means one production list per vocabulary, proven complete by an AST
   read of its own const block, and no second copy anywhere.** Go cannot enumerate a const block
   at run time, so a string-typed vocabulary keeps one backing slice; the derivation is a test
   that parses the declaring file, as `cmd/copylist` does, and fails naming any const missing from
   the slice or out of declaration order. That applies to `spine`'s four string vocabularies
   (`Code`, `ParkCode`, `ReasonCode`, `Condition`) and `health`'s `Catalogue`. An int-typed
   vocabulary collapses to one list: `providers.Reason` becomes one index-keyed name table from
   which both `String` and `Reasons` read, and its completeness test must also catch a constant
   appended after `ReasonUnknown` (an unexported end-of-block count constant or the same AST
   read). A test-side copy (`park_test.go`'s `allParkCodes`,
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
   command sets either, so no operator output moves. This supersedes the 1.0 pass's segment 5
   ruling 7 (conductor, 2026-09-21, `2026-09-14-cairn-tool-1-0-pass.md:4408`), which kept
   `FailingOnly` when `--quiet` stopped setting it; retire-1's close then filed the field as
   test-only, and nothing has written it since.
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
   `cmd/copylist` folds concatenations, the copy gate reaches `longDoctor` and its comma heuristic
   fires (finding 3). Splitting a four-comma sentence is cheaper than teaching the gate to tell a
   help `Long` from a fix line, and the gate stays as it is. The fix splits the first sentence so at most one comma precedes the first period, keeping
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
    anchor, except `f:cwtfs7`'s stale clause, which Task 13 corrects. **`check-facts` alone cannot
    prove a repoint:** of about 137 line pointers into `tool/`, three carry an anchor, and an
    unanchored pointer fails only when it runs past the end of its file. So Task 0 records, for
    every pointer into `tool/`, the symbol or first line it names, and each task's report lists
    every pointer into a file it edited with its old and new lines and the code it names after the
    edit.

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
- A removed or renamed symbol is grepped across the whole repository (`tool/`, `docs/`,
  `scripts/`, `.github/`, and `README.md`) before the task reports, and every hit is repointed or
  recorded.
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
- The facts defect set equals the baseline, and every facts pointer into a file the task edited
  still names the code Task 0 recorded for it (Decision 13).

---

## Task 0: pre-flight (S1, read-only, no gate)

**Outcome:** every factual claim Tasks 1 to 13 make is re-checked at the execution HEAD, and the
plan is amended before the first dispatch where one drifted.

**Constraints:** read-only; `sonnet`; no gate (the conductor's one lane-launch `cairn-run-gate`
call is the baseline). Runs once, at S1. The branch never takes `main`'s commits mid-pass, so a
later segment re-checks nothing Task 0 already read; each implementer confirms its own task's
line references in its report.

**Acceptance:**
- Every path, symbol, line reference, and count in this plan's pre-flight findings and task
  criteria is confirmed or reported drifted, one line each.
- The `check-facts` baseline defect set is recorded verbatim.
- Every facts pointer into `tool/` is recorded with the symbol or first line it names, grouped by
  file, so each task knows which of its files carry citations and what each must still name
  (Decision 13).
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
- `ParkCodes` is removed; `outcome.go`'s `ReasonCodes` reads `parkCodes` and still builds the
  same vocabulary, proven by the existing tests.
- `park_test.go`'s `allParkCodes` is gone; `park_test.go` and `condition_test.go` read the
  package's backing list.
- A test parses the package's own source and fails, naming the const, when any `Code`,
  `ParkCode`, `ReasonCode`, or `Condition` constant is missing from its backing list or out of
  declaration order. `CodeNone` and `ConditionNone` are the named exemptions, and the test fails
  when it finds no constant of a vocabulary's type, so a misspelled type name cannot pass it
  empty. The report shows it red against a deliberately dropped entry, then green.
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
- Expected values are literals from the Workers Observability query contract, never read from
  `logs.go`'s own constants or `buildQuery`, so a wrong constant cannot agree with itself.
- The report shows one new assertion red against a deliberately wrong filter type introduced in
  `logs.go` (not in the test), then green.
- Gate green; `check-facts` at baseline.

**Files:** `tool/internal/logs/logs_test.go`.

## Task 3: `store`, the unwired walk and the perm ruling (S1)

**Outcome:** `store` carries no unwired deliverable, and the byte-identical perm pair says why it
is two files.

**Constraints:** Decision 1. The two perm files stay byte-identical.

**Acceptance:**
- `discover.go` and `discover_test.go` are deleted; nothing under `tool/`, `docs/`, or
  `README.md` names `store.Discover` or `store.Site`.
- `perm_linux.go` and `perm_darwin.go` carry the same header, after the `package` clause so it
  is never a second package doc comment (`paths.go` holds that), stating the ruling: the module
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

**Constraints:** Decisions 4 and 11. `copy.golden.md` unchanged. The seams table's
condition-to-fix-map row (HUD detail view) is carried by `FixFor` and `FixForReason`, which stay
exported; `FixForCondition` and `FixForCode` are its internals.

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
  constant has no name, including one appended after `ReasonUnknown`, or the table outgrows the
  constants.
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
   `docs/superpowers/` (this plan and its review record), the friction log, and the ledgers
   changed. No engine npm gate runs: the pass touches nothing under `src/`,
   `packages/`, `examples/`, or `scripts/`. Push the branch and open the PR; `tool.yml`'s
   Linux, macOS, and Windows legs and every other workflow must be green before merge.
3. **Architecture reads.** One `go-architecture-reader` per package whose non-test source
   changed: `spine`, `store`, `health`, `providers`, `render`, `render/fixtures`, `internal/exe`,
   `cmd/mangen`, `cmd/copylist`, `cmd/cairn`. The reader grades non-test source, so `logs` and
   `doctor` (test-only edits) and `hygiene` (test files only) get none. A structural finding is
   fixed in the pass or filed; a nit is filed.
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
     be wrong to rediscover. That list includes the three hidden `Long` strings, the
     `longDoctor` comma trip and `check-copy`'s first-line-only, period-means-fix-line reach
     (finding 3), the seams-table rulings, the facts-gate coupling, and the ~150
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

### Task 0 (2026-09-27)

**HEAD:** this worktree's HEAD (`fe145608`) carries only two docs-only commits over `main`
(`c9beafb3`, this plan's pre-flight-verified commit): `9220f6bb` (author the plan) and `fe145608`
(fold the review). `git diff c9beafb3..fe145608 --stat -- tool/` is empty, so every path, symbol,
line, and count below is verified at the same `tool/` tree the header names.

**1. Pre-flight findings and task criteria, confirmed or drifted (one line each):**

- Finding 1 (`probe_token.go` names no retired command; `main.go:44,133-137` stale rationale;
  `f:cwtfs7`): confirmed. `main.go:44` still reads "`auth probe` both print it on purpose";
  `main.go:133-141`'s `codedError` comment still says "typed error rather than a call into
  spine.ExitCode" while `probe_token.go:131` computes the verdict with `spine.ExitCode`.
  `f:cwtfs7` (`docs/internal/facts/reference.md:408-411`) still carries the same stale framing
  (settles provider states, holds no site verdicts) without the ExitCode contradiction spelled
  out; Task 13's planned correction still applies. No amendment needed.
- Finding 2 (doctor `Result.ID` never reaches the JSON payload): confirmed exact.
  `internal/doctor/json.go:107` reads `cr.Check.ID`; `report.go:50` sets `result.ID = c.ID`;
  `status.go:65,67,69` build `spine.CheckVerdict{ID: r.ID, ...}` from `Result.ID`. No amendment.
- Finding 3 (`cmd/copylist` misses `longRoot`, `longHealth`, `longDoctor`): confirmed. All three
  are `*ast.BinaryExpr` string concatenations (`messages.go:77`, `:265`, `:312`) absent from
  `tool/testdata/copy.golden.md` (`grep` for the three names returns nothing in the golden). No
  amendment.
- Finding 4 (`spine.FromKind`/`Kind` pre-adjudicated 2.0 seams): confirmed. The 1.0 plan's seams
  table names `FromKind` with the HUD's detail view at
  `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md:303`; `kind.go:18` states the same
  seam. No amendment.
- Finding 5 (`CombineState` not open-coded in `check_creds.go`): confirmed exact.
  `worseCredentialOutcome` spans `check_creds.go:115-126` exactly; `credentialRank` breaks the
  Unknown/Unknown tie at line 124; `CombineState` (`spine/exit.go:180`, tested at
  `exit_test.go:107-124`) has no caller anywhere in `tool/`. No amendment.
- Finding 6 (`render`'s eighteen callerless exports): confirmed exact. `Sanitize`, `WidthFloor`,
  `WidthNarrow`, `Width100`, `WidthCap`, and the seven Theme methods (`Strong`, `SizedStrong`,
  `SizedLink`, `Link`, `Clamp`, `Rule`, `Width`) have zero callers anywhere under `tool/` outside
  `internal/render`; the six `*SchemaVersion` constants besides `DoctorSchemaVersion` (which has
  its one caller at `doctor/json.go:90`) are equally uncalled. No amendment.
- Finding 7 (`RenderInput.FailingOnly` unwritten, `Height` unread): confirmed. `body_single.go:36`
  and `body_plain.go:42` read `FailingOnly`; no writer exists under `tool/`. `Height`
  (`render.go:84`) has no reader; `golden_test.go:349` sets `tall.height = 24` for the one case
  whose golden the plan names. No amendment.
- Finding 8 (process-citation counts): `messages.go` "editorial gate" count is exactly 22
  (confirmed exact, `grep -c`). `root.go:37-53,98-115` and `health_sweep.go:3,34,209` and
  `ack.go:177` all still carry a citation (confirmed). `render`'s count is 21 distinct sites by
  the broadest matching pattern (`Task N`, `criterion`, `editorial gate`, `reviewed at`,
  `1.0 pass/plan`, `retire-1`, `B2`, `20a/20b/20c`) across `body_many.go`(2), `palette.go`(7),
  `profile.go`(7), `profile_windows.go`(1), `render.go`(2), `status.go`(2); the plan's "about 20"
  holds against the ROADMAP's 23. `health/fixes.go` carries exactly 7 distinct citation sites
  (`fixes.go:30,36,57-58,73,85-86,106,189`, two of which each span two comment lines), matching
  the plan exactly; `health/messages.go` carries exactly 11 (`messages.go:18-19` is a citation the
  first grep pass missed, plus `:69,112,118-119,129,138,147,155,200,234,300`), also matching the
  plan exactly. No amendment; Task 5's acceptance already names files, not a fixed count.
- Finding 9 (line drift): `logs_test.go`'s `fixtureRoundTripper` confirmed exact at `:19-33`.
  `usage_test.go`'s `builtBinary` confirmed exact at `:29-44`. `health`'s message `Catalogue`
  (`messages.go:356-378`) confirmed exact at 38 entries. **Drifted and amended in place above:**
  `health.go`'s Degraded derivation is `report.Degraded = true` at line 131 (not in `:124-136`,
  whose range never reaches the Acknowledged line at all); its Acknowledged derivation is
  `report.Acknowledged = activeAckIDs(acks, o.Now())` at line 140, outside the plan's own stated
  `:124-136`. The finding's text is corrected in place to name lines 131 and 140 directly.
- Finding 10 (`outcome.go`'s fixed constants already read "nine"): confirmed.
  `outcome.go:95` reads "the nine fixed constants". No amendment.
- Finding 11 (facts gate baseline defect): confirmed and recorded verbatim in item 2 below.
- Finding 12 (no chore touches `check:tool-conditions`/`check:tool-heuristics` inputs): confirmed.
  Neither `tool/internal/spine/conditions.json` nor
  `tool/internal/doctor/site-config-path.json` nor anything under `src/lib` is in any task's
  Files list. No amendment.
- Finding 13 (`store`'s perm pair byte-identical and pinned): confirmed.
  `perm_linux.go`/`perm_darwin.go` diff empty; `identicalfiles_test.go:15` asserts the pair. No
  amendment.
- Finding 14 (concurrent branches): confirmed both. `origin/draft-docs-0` vs `main` touches only
  `tool/cmd/cairn/flags_test.go` (+74/-2 net) and `tool/testdata/flags.json` (+238/-0 net), no
  file this pass edits. `origin/theme-identity-a` vs `main` touches only
  `docs/internal/facts/admin.md` (1 line), a repoint this pass may also touch; the plan already
  calls this mechanical. No amendment.
- Decision-cited facts spot-checked and confirmed: `probe_token.go:84` (`st.Load(args[0])`,
  Decision 1's "loads one record by id"), `root.go:280-290` (Decision 1's shell-completion listing
  every id via `st.List()`), `identicalfiles_test.go:15` (Decision 3's byte-identical assertion,
  inside the `identicalPairs` block whose header comment is at `:10-14`), `exit_test.go:71-80`
  (Decision 3's property test, `TestVerdictSeverityAgreesWithStateSeverity`, line 76 falls inside
  its loop body), `messages_test.go:31-34` (Decision 10's `probeDumpFiles` allowlist naming
  `probe_token.go`), `purity_test.go:227,254` (Decision 5's `exportedSurface` and
  `exportedThemeMethods` lists). No amendment.

**2. Baseline gate:**

```
gate exit: 0 (log: /tmp/cairn-gate-1000/c82f19ff4c4f347d/gate.log, 37 lines)
```

Full suite green on the first issue: `go vet`, `golangci-lint run` (0 issues), `govulncheck` (no
vulnerabilities), `vale-comments.sh` (clean), `check-copy.sh` (vocabulary clean, Vale 0/0/0), and
`go test -count=1 ./...` (every package ok, `internal/exe` has no test files).

**3. `check-facts` baseline defect set (verbatim):**

```
check-facts: 1 defect(s)

  docs/internal/facts/admin.md:53: anchor for "package.json:197-198" names ["sveltejs","kit","svelte"], not found within 10 lines of the cited range
```

This is finding 11's pre-existing defect, outside `tool/` and outside this pass's scope. Every
task's acceptance is that its own `check-facts` run reproduces exactly this one defect, no more
and no fewer.

**4. Facts pointers into `tool/`, by file (137 pointers, 50 files):**

137 `tool/` path:line citations were found across `docs/internal/facts/{admin,editors,extend,
front-door,reference}.md` (all but three in `reference.md`; `extend.md` carries the other two).
Every citation resolved inside its file's current length; none is out of range. Grouped by file,
each line gives the fact id, the arm it lives in, the cited path:range, and the first line of
code or comment that range names today:


### tool/cmd/cairn/ack.go
- f:igjau7 (reference) tool/cmd/cairn/ack.go:17-36 -> `// field accept: a bare calendar date, since an acknowledgement is granted for whole days.`

### tool/cmd/cairn/adopt.go
- f:by9zcg (reference) tool/cmd/cairn/adopt.go:98 -> `Adoptable: c.Domain != "",`

### tool/cmd/cairn/auth.go
- f:ka0ngc (reference) tool/cmd/cairn/auth.go:145 -> `Use:     "set <name>",`
- f:9x1w7n (reference) tool/cmd/cairn/auth.go:73-109 -> `// non-terminal stdin, the fallback below reads one line from stdin instead, so `printf %s "$v"`

### tool/cmd/cairn/doctor.go
- f:rrwp1r (reference) tool/cmd/cairn/doctor.go:24-37,50-53 -> `Use:     "doctor [<dir>]",`
- f:plng3z (reference) tool/cmd/cairn/doctor.go:60-61,113-129 -> `if !doctor.IsCairnSite(snap.Dir) {`
- f:ee48yi (reference) tool/cmd/cairn/doctor.go:42,88-97 -> `cmd.Flags().BoolVar(&f.asJSON, "json", false, flagDoctorJSONHelp)`
- f:s960z6 (reference) tool/cmd/cairn/doctor.go:88-97 -> `func writeDoctor(cmd *cobra.Command, d deps, rf *rootFlags, f doctorFlags, snap doctor.Snapshot, checked []doctor.CheckedResult, verdict spine.Verdict) error {`
- f:mcjbpm (reference) tool/cmd/cairn/doctor.go:88-97 -> `func writeDoctor(cmd *cobra.Command, d deps, rf *rootFlags, f doctorFlags, snap doctor.Snapshot, checked []doctor.CheckedResult, verdict spine.Verdict) error {`

### tool/cmd/cairn/doctor_json_test.go
- f:s960z6 (reference) tool/cmd/cairn/doctor_json_test.go:26-55 -> `// TestDoctorJSONOutsideACairnSitePayload covers the case a caller is most likely to hit`

### tool/cmd/cairn/doctor_test.go
- f:re7sn7 (reference) tool/cmd/cairn/doctor_test.go:76-159 -> `func TestDoctorExitCodes(t *testing.T) {`
- f:zb3izw (reference) tool/cmd/cairn/doctor_test.go:161-270 -> `// TestDoctorOutsideACairnSitePrintsOneLineAndExitsUnknown is the fifth test: a directory`

### tool/cmd/cairn/env.go
- f:ka0ngc (reference) tool/cmd/cairn/env.go:36-38,199-212 -> `varCFAccountID = "CAIRN_CF_ACCOUNT_ID" // secret-guard-allow: a variable name, not a value`
- f:9x1w7n (reference) tool/cmd/cairn/env.go:36-38,199-212 -> `varCFAccountID = "CAIRN_CF_ACCOUNT_ID" // secret-guard-allow: a variable name, not a value`

### tool/cmd/cairn/health.go
- f:igjau7 (reference) tool/cmd/cairn/health.go:58 -> `cmd.Flags().StringVar(&f.since, "since", defaultSince, flagHealthSinceHelp)`
- f:h1x1i5 (reference) tool/cmd/cairn/health.go:44 -> `Use:               "health [<site>]",`

### tool/cmd/cairn/health_json.go
- f:dzsdcf (reference) tool/cmd/cairn/health_json.go:16-69 -> `// writeSiteJSON writes the single-site payload, which carries the run's own exit code: for a`
- f:khcwri (reference) tool/cmd/cairn/health_json.go:51-53 -> `// writeSweepSummaryJSON writes the stream's final line. A stream that carries none is UNKNOWN,`

### tool/cmd/cairn/health_sweep.go
- f:tchzio (reference) tool/cmd/cairn/health_sweep.go:39-44 -> `// An empty registry reuses spine.ErrExpectSites, sites list's own sentinel for the same`
- f:mcjbpm (reference) tool/cmd/cairn/health_sweep.go:49-53 -> `// A sweep's verdict is only known once every site has settled, and --quiet turns on that`
- f:g4arh0 (reference) tool/cmd/cairn/health_sweep.go:20-26,215-253 -> `// maxSweepTimeout bounds a multi-site sweep's default whole-run budget, so a large registry`
- f:qgeq2i (reference) tool/cmd/cairn/health_sweep.go:28-36 -> `// runHealthSweep runs health.Run over every registered site, in store.List order, printing each`
- f:i8y825 (reference) tool/cmd/cairn/health_sweep.go:49-53 -> `// A sweep's verdict is only known once every site has settled, and --quiet turns on that`

### tool/cmd/cairn/logs.go
- f:oegghv (reference) tool/cmd/cairn/logs.go:70-74 -> ``
- f:r5pqhd (reference) tool/cmd/cairn/logs.go:70-74 -> ``
- f:fyosog (reference) tool/cmd/cairn/logs.go:44,66 -> `cmd.Flags().StringVar(&f.since, "since", defaultSince, flagLogsSinceHelp)`

### tool/cmd/cairn/main.go
- f:50ifoh (reference) tool/cmd/cairn/main.go:133-167 -> `// codedError is an error carrying its own process verdict, returned by a command that measured`
- f:cwtfs7 (reference) tool/cmd/cairn/main.go:133-141 -> `// codedError is an error carrying its own process verdict, returned by a command that measured`
- f:hi5cw3 (reference) tool/cmd/cairn/main.go:153-167 -> `// exitVerdict maps an error that produced no report onto the code the process exits with.`
- f:i8y825 (reference) tool/cmd/cairn/main.go:153-167 -> `// exitVerdict maps an error that produced no report onto the code the process exits with.`

### tool/cmd/cairn/messages.go
- f:e1s8kh (reference) tool/cmd/cairn/messages.go:299-306 -> `const tmplHealthTooManyArgs = "cairn: cairn health takes at most one site.\nRun `cairn health --help` for usage"`
- f:plng3z (reference) tool/cmd/cairn/messages.go:322-330 -> `)`
- f:ee48yi (reference) tool/cmd/cairn/messages.go:309 -> `// than copied, since the catalogue carries no row for a credential-less directory preflight.`
- f:zlqdbn (reference) tool/cmd/cairn/messages.go:557,562 -> ``
- f:zlqdbn (reference) tool/cmd/cairn/messages.go:570-573 -> `tmplAckFileMalformed      = "cairn: %s is not a valid hold file.\n%v\nWrite the file as a JSON array of entries, each carrying checkId and expires"`
- f:oegghv (reference) tool/cmd/cairn/messages.go:152 -> `}`
- f:r5pqhd (reference) tool/cmd/cairn/messages.go:152 -> `}`

### tool/cmd/cairn/probe_token.go
- f:cwtfs7 (reference) tool/cmd/cairn/probe_token.go:20-29 -> `func newAuthCheckCmd(d deps) *cobra.Command {`

### tool/cmd/cairn/root.go
- f:zrgny4 (reference) tool/cmd/cairn/root.go:35 -> `const defaultTimeout = 480 * time.Second`
- f:8our2s (reference) tool/cmd/cairn/root.go:229-235 -> `p.DurationVarP(&f.timeout, "timeout", "t", defaultTimeout, flagTimeoutHelp)`
- f:igjau7 (reference) tool/cmd/cairn/root.go:235 -> `p.StringVar(&f.ackFile, "ack-file", "", flagAckFileHelp)`
- f:8ow43o (reference) tool/cmd/cairn/root.go:37-53,98-115 -> `// The three --color values. Task 20a reads the chosen value to pick a colour profile; until it`
- f:dbwe2j (reference) tool/cmd/cairn/root.go:213-226 -> `// cmd.Version, rather than a hand-rolled flag, is what makes cobra register and serve`
- f:u9fpq8 (reference) tool/cmd/cairn/root.go:29-35 -> `// docs/reference/cli-cairn-exit-codes.md, and TestTheSingleSiteBudgetFitsTheRequestArithmetic`
- f:yxdrdh (reference) tool/cmd/cairn/root.go:29-35 -> `// docs/reference/cli-cairn-exit-codes.md, and TestTheSingleSiteBudgetFitsTheRequestArithmetic`
- f:i8y825 (reference) tool/cmd/cairn/root.go:231,236 -> `p.BoolVarP(&f.quiet, "quiet", "q", false, flagQuietHelp)`

### tool/cmd/cairn/sites.go
- f:tchzio (reference) tool/cmd/cairn/sites.go:46 -> `p.IntVar(&f.expectSites, "expect-sites", 0, flagExpectSitesHelp)`
- f:3pxhb9 (reference) tool/cmd/cairn/sites.go:143 -> `lines = append(lines, render.SiteListEntry{ID: e.ID, Name: e.Record.Name, Domain: e.Record.Domain, Step: e.Record.Step})`

### tool/cmd/cairn/usage_test.go
- f:hi5cw3 (reference) tool/cmd/cairn/usage_test.go:133-146 -> `// TestAUsageErrorExitsUnknownWithEmptyStdout runs the falsification table against the built`
- f:v2mrvq (reference) tool/cmd/cairn/usage_test.go:507-564 -> `// requestsPerCheck reads the "Requests per check" table out of the published exit-codes page. The`
- f:p8ie34 (reference) tool/cmd/cairn/usage_test.go:507-527 -> `// requestsPerCheck reads the "Requests per check" table out of the published exit-codes page. The`
- f:6tm5nr (reference) tool/cmd/cairn/usage_test.go:566-576 -> `// TestTheSweepCapIsThePublishedOne pins the two numbers the multi-site formula on the`

### tool/internal/doctor/check_bindings.go
- f:m0ouh8 (extend) tool/internal/doctor/check_bindings.go:17-28 -> `bindingEmailMissing = "EMAIL (send_email)"`
- f:kjp61u (reference) tool/internal/doctor/check_bindings.go:31 -> `Condition: spine.ConditionConfigBindingsMissing,`

### tool/internal/doctor/check_csrf.go
- f:01iu5z (reference) tool/internal/doctor/check_csrf.go:72,79 -> `svelteConfig, svelteFound, err := s.ReadFile("svelte.config.js")`
- f:v2isa4 (reference) tool/internal/doctor/check_csrf.go:71-84 -> `Run: func(s Snapshot) Result {`

### tool/internal/doctor/check_floors.go
- f:01iu5z (reference) tool/internal/doctor/check_floors.go:328,376,384,392 -> `body, ok, err := s.ReadFile(enginePackageJSONPath)`
- f:a71nbo (reference) tool/internal/doctor/check_floors.go:358-401 -> `}`

### tool/internal/doctor/check_mount.go
- f:q01lkt (reference) tool/internal/doctor/check_mount.go:14-21 -> `var adminMountPaths = []string{`

### tool/internal/doctor/check_posture.go
- f:b94uhy (reference) tool/internal/doctor/check_posture.go:292-305 -> `Run: func(s Snapshot) Result {`

### tool/internal/doctor/check_referrer.go
- f:01iu5z (reference) tool/internal/doctor/check_referrer.go:191-234 -> `missing = append(missing, "src/hooks.server.ts (or .js)")`

### tool/internal/doctor/check_siteconfig.go
- f:3sxgcl (reference) tool/internal/doctor/check_siteconfig.go:12-13 -> `// scope note: the per-concept URL policy is not checkable from a directory preflight.`
- f:xejl4n (reference) tool/internal/doctor/check_siteconfig.go:23-38 -> `// candidate paths is unchecked, never a fail, since there was nothing to judge.`

### tool/internal/doctor/facts.go
- f:01iu5z (reference) tool/internal/doctor/facts.go:11 -> `const siteFactsRelPath = "src/content/.cairn/site-facts.json"`
- f:6oopkt (reference) tool/internal/doctor/facts.go:8-19 -> `// siteFactsRelPath is the committed engine-facts file every facts-dependent check reads,`

### tool/internal/doctor/fetchrobots.go
- f:8fhjud (reference) tool/internal/doctor/fetchrobots.go:28-35 -> `// FetchRobots performs ai.posture-effective's one network request, the single GET this whole`
- f:zrgny4 (reference) tool/internal/doctor/fetchrobots.go:14-21,33-34 -> `// robotsClient is the one HTTP client ai.posture-effective's fetch uses. It does not use`
- f:b94uhy (reference) tool/internal/doctor/fetchrobots.go:35-62 -> `func FetchRobots(ctx context.Context, origin PublicOrigin) Robots {`

### tool/internal/doctor/fileread.go
- f:plng3z (reference) tool/internal/doctor/fileread.go:89-104 -> `func IsCairnSite(dir string) bool {`

### tool/internal/doctor/json.go
- f:gilykt (reference) tool/internal/doctor/json.go:41-54,99-126 -> `type checkPayload struct {`
- f:i9rv5i (reference) tool/internal/doctor/json.go:11-13 -> `// kindDoctor is what this payload declares in its kind field, so a consumer reading a mixed`
- f:iasib1 (reference) tool/internal/doctor/json.go:28-38 -> `type payload struct {`
- f:wzavtn (reference) tool/internal/doctor/json.go:25-38,65-98 -> `// payload is one directory preflight on the wire. It is its own kind rather than a health`
- f:lkbuxg (reference) tool/internal/doctor/json.go:15-23,44-55,100-129 -> `// The wire state words this payload writes. They are five of the frozen vocabulary`
- f:5hswlx (reference) tool/internal/doctor/json.go:57-63 -> `// fixPayload is what clears a failure. It carries no actor and no outward flag, which the health`

### tool/internal/doctor/report.go
- f:um228q (reference) tool/internal/doctor/report.go:10-31 -> `// checks is the complete doctor check set cairn doctor runs, in report order: the eight`
- f:b7o2xd (reference) tool/internal/doctor/report.go:19-31 -> `var checks = []Check{`
- f:svxuiv (reference) tool/internal/doctor/report.go:66-80 -> `// docsBaseAdmin is the admin docs directory a failure's docs URL resolves against, the same`

### tool/internal/doctor/siteconfig.go
- f:xejl4n (reference) tool/internal/doctor/siteconfig.go:40-46 -> `// siteConfigPaths returns the four candidate paths a site's site.config.yaml can live at, in`

### tool/internal/doctor/snapshot.go
- f:dg0xqg (reference) tool/internal/doctor/snapshot.go:75-87 -> ``

### tool/internal/doctor/status.go
- f:re7sn7 (reference) tool/internal/doctor/status.go:58-82 -> `// checkVerdict converts r to the spine.CheckVerdict its exit code arithmetic reads. Pass, skip,`

### tool/internal/doctor/wrangler.go
- f:01iu5z (reference) tool/internal/doctor/wrangler.go:36,48 -> `jsonc, ok, err := s.ReadFile("wrangler.jsonc")`

### tool/internal/health/check_errors.go
- f:xk7j2v (reference) tool/internal/health/check_errors.go:31-57 -> `// errorsDetail is errorsCheck's own internal measurement, flattened into Fields as a`

### tool/internal/health/check_serving.go
- f:b7o2xd (reference) tool/internal/health/check_serving.go:25 -> `func (servingCheck) ID() string { return "serving" }`

### tool/internal/health/health.go
- f:wulqee (reference) tool/internal/health/health.go:151,173 -> `result.Outcome = spine.Outcome{State: spine.Unknown, Reason: spine.ReasonNotRun, Detail: ctx.Err().Error()}`
- f:4wq7zj (reference) tool/internal/health/health.go:130-132 -> `if result.Outcome.Reason == spine.ReasonCredMissing {`

### tool/internal/health/severity.go
- f:oo8qdz (reference) tool/internal/health/severity.go:16-30 -> `var failSeverity = map[string]spine.FailSeverity{`

### tool/internal/logs/events.go
- f:ulw0xh (reference) tool/internal/logs/events.go:3-7,92 -> `// eventVocabulary is the engine's diagnostic event vocabulary, kept in step with`

### tool/internal/logs/events_test.go
- f:v35jst (reference) tool/internal/logs/events_test.go:33-58 -> `// TestEventVocabularyMatchesEngine reads src/lib/log/events.ts through providers.RepoRoot and`

### tool/internal/logs/logs.go
- f:fyosog (reference) tool/internal/logs/logs.go:88-97 -> `// sinceGrammar is the message every ParseSince rejection names, so an operator sees the accepted`

### tool/internal/providers/errors.go
- f:1aej7q (reference) tool/internal/providers/errors.go:17-58 -> `const (`
- f:oqkzuq (reference) tool/internal/providers/errors.go:32-37 -> `// ReasonRequestRejected is an HTTP 400: the provider parsed the request and refused its`

### tool/internal/providers/probe.go
- f:u9fpq8 (reference) tool/internal/providers/probe.go:31-35 -> `// RequestTimeout is the same per-request budget every Probe method applies below, exported so a`

### tool/internal/providers/transport.go
- f:zrgny4 (reference) tool/internal/providers/transport.go:12-16 -> `// requestTimeout bounds every request this package makes. The Node CLI this ports from`
- f:u9fpq8 (reference) tool/internal/providers/transport.go:12-16 -> `// requestTimeout bounds every request this package makes. The Node CLI this ports from`

### tool/internal/render/json.go
- f:qgeq2i (reference) tool/internal/render/json.go:369-371 -> `if missing := in.Sites - len(in.Verdicts); missing > 0 {`
- f:i9rv5i (reference) tool/internal/render/json.go:41-50 -> `// The kind each payload declares, so a consumer reading a mixed stream keys off a field rather`
- f:p5qhgy (reference) tool/internal/render/json.go:14-39 -> `// The schema version of each published payload, one integer per payload type rather than one`
- f:iasib1 (reference) tool/internal/render/json.go:55-70,116-126,130-137,149-159,172-179 -> `type sitePayload struct {`
- f:dzsdcf (reference) tool/internal/render/json.go:61-64,216-229 -> `// ExitCode is the run's code, never the site's, and is therefore absent from a per-site`
- f:khcwri (reference) tool/internal/render/json.go:114-116 -> `// summaryPayload is the NDJSON stream's final line. A stream that carries none is UNKNOWN: a`
- f:dm3u5v (reference) tool/internal/render/json.go:350-352,369-371 -> `// Sites is how many sites the run was meant to cover, which exceeds len(Reports) when a`
- f:0yfm91 (reference) tool/internal/render/json.go:264-271 -> `// checkObject builds one check's wire shape. The state word is computed here rather than`
- f:nv00ik (reference) tool/internal/render/json.go:99-106,317-339 -> `// fixPayload is the structured fix a consumer switches on rather than a sentence it parses.`
- f:bd0ubx (reference) tool/internal/render/json.go:108-112,288-290 -> `// holdPayload is one acknowledgement on the wire.`
- f:bn4bii (reference) tool/internal/render/json.go:82-97,294-315 -> `// Fields holds the values cairn derived itself, as an object so a consumer indexes a key`
- f:3pxhb9 (reference) tool/internal/render/json.go:128-146,391-405 -> `// sitesListPayload is cairn sites list's own payload. Every listed site carries enough for a`
- f:oegghv (reference) tool/internal/render/json.go:148-169,407-431 -> `// logsPayload is cairn logs's own payload.`
- f:by9zcg (reference) tool/internal/render/json.go:181-195 -> `// AdoptCandidate is one discovered Worker in the adopt candidate list payload. Adoptable splits`
- f:0typfn (reference) tool/internal/render/json.go:232-244 -> `func siteObject(in SiteJSON) sitePayload {`
- f:junfdz (reference) tool/internal/render/json.go:501-508 -> `// string for the zero time. Nothing on the wire is relative: "3 minutes ago" is a fact about`
- f:xvdk04 (reference) tool/internal/render/json.go:448-499 -> `// authCheckPayload is cairn auth check's own payload.`
- f:ycj7pq (reference) tool/internal/render/json.go:209-211 -> `// Elapsed is the wall time this site's sweep took. It is reported and excluded from any`
- f:9aa96j (reference) tool/internal/render/json.go:407-431 -> `// MarshalLogs writes cairn logs's payload. Every record it carries is the site's own, which is`
- f:r5pqhd (reference) tool/internal/render/json.go:155-157 -> `// ContainsPersonalData carries the notice a non-JSON run prints to stderr. Under --json`

### tool/internal/render/json_schema_test.go
- f:lxemp0 (reference) tool/internal/render/json_schema_test.go:502-564 -> `func isInteger(value any) bool {`

### tool/internal/render/rank.go
- f:8137ac (reference) tool/internal/render/rank.go:99-122 -> `// worstClass returns the severity class of r's worst live failure, or noFailureClass when r`

### tool/internal/spine/condition.go
- f:iaqcq6 (extend) tool/internal/spine/condition.go:44 -> `ConditionAdminLoginProbeFailed       Condition = "admin.login-probe-failed"`
- f:y0ocr0 (reference) tool/internal/spine/condition.go:19-45 -> `const (`

### tool/internal/spine/exit.go
- f:re7sn7 (reference) tool/internal/spine/exit.go:133-167 -> `// Verdict folds every check into the code this one site reports. A site with no checks is`
- f:olm8xt (reference) tool/internal/spine/exit.go:14-36 -> `// The four monitoring-plugin verdicts. Each constant's value is its exit code.`
- f:2i8uqy (reference) tool/internal/spine/exit.go:38-55,147-167 -> `// Severity ranks v for combining several verdicts into one: CRITICAL outranks UNKNOWN outranks`
- f:ncrqaw (reference) tool/internal/spine/exit.go:89-92,98-128 -> `// Acknowledged reports whether an unexpired hold covers this check. A hold that has already`
- f:zy25ex (reference) tool/internal/spine/exit.go:104-128 -> `// A check that could not run is UNKNOWN, with one exclusion. An Unknown whose Reason answers`
- f:v8c3ws (reference) tool/internal/spine/exit.go:202-216 -> `// StateWord returns the wire word one check's result carries: "pass", "fail", "held", "skip", or`
- f:xolnw0 (reference) tool/internal/spine/exit.go:104-128 -> `// A check that could not run is UNKNOWN, with one exclusion. An Unknown whose Reason answers`
- f:l20z8y (reference) tool/internal/spine/exit.go:133-145 -> `// Verdict folds every check into the code this one site reports. A site with no checks is`
- f:tchzio (reference) tool/internal/spine/exit.go:57-59,147-167 -> `// ErrExpectSites is the sentinel a registry listing returns when the operator named a site count`
- f:50ifoh (reference) tool/internal/spine/exit.go:147-167 -> `// ExitCode returns the verdict a whole run reports, folding every site's checks by the`
- f:0yfm91 (reference) tool/internal/spine/exit.go:202-216 -> `// StateWord returns the wire word one check's result carries: "pass", "fail", "held", "skip", or`
- f:bd0ubx (reference) tool/internal/spine/exit.go:89-92 -> `// Acknowledged reports whether an unexpired hold covers this check. A hold that has already`

### tool/internal/spine/outcome.go
- f:zy25ex (reference) tool/internal/spine/outcome.go:78-93 -> `// notAttemptedReasons is every ReasonCode NotAttempted answers true for.`
- f:wulqee (reference) tool/internal/spine/outcome.go:64 -> `ReasonNotRun        ReasonCode = "reason.not-run"`
- f:bn4bii (reference) tool/internal/spine/outcome.go:144-178 -> `// OutcomeField is one ordered, named value a Check reports beyond its one-line Detail: a`
- f:1aej7q (reference) tool/internal/spine/outcome.go:56-76,95-119 -> `// The fixed ReasonCode values, ported from the spec's reason catalogue.`
- f:oqkzuq (reference) tool/internal/spine/outcome.go:121-142 -> `// ReasonToOutcome is the one translation from a classified provider Reason to a check's Outcome.`

### tool/internal/spine/park.go
- f:1aej7q (reference) tool/internal/spine/park.go:13-25,45-47 -> `ParkDelegationPropagating   ParkCode = "delegation-propagating"`

**5. `git log c9beafb3..main -- tool/`:**

Empty: `main` has taken no commits since `c9beafb3`, so this worktree's HEAD (`fe145608`, two
docs-only commits ahead of `main` authoring and folding this plan) still measures against exactly
the pre-flight-verified tree. Nothing to name.

**Stop-the-pass check:** nothing found here should stop the pass. The one drift (health.go's
Degraded/Acknowledged lines) is a line-number correction with no scope effect, amended in place
above. The one pre-existing `check-facts` defect is out of scope and already excluded from every
task's acceptance. No task's Files list, decision, or acceptance criterion needed a correction.

### S1 (2026-09-27, conductor)

- **Task 1** accepted after one fix round (`3e6aebd9`, `d121fd46`): `CombineState` and `ExitCodeFor`
  deleted, `ParkCodes` removed, an AST test proves the four vocabularies against their const
  blocks and names the offending constant. Notes: the AST test parses one named file per
  vocabulary and sees only type-annotated constants (every current block qualifies).
- **Task 2** accepted (`64503afc`, `d6c6f1e8`): the fixture captures method, path, and body; the
  assertions read the wire body against contract literals. Notes: `RoundTrip` keeps the last
  non-empty body; `queryId`, `view`, and `datasets` are not asserted.
- **Task 3** accepted (`355695b6`): `store.Discover` and `store.Site` deleted, the perm pair
  carries the ruling header. The ROADMAP bullet naming them retires at the close.
- **Spend:** S1 workflow about 1.0M, plus the plan, its review, and Task 0 about 0.8M. Pass total
  about 1.8M of 8.5M.

### S2 (2026-09-27, conductor)

- **Task 4** accepted by conductor ruling (`39074399`): the test goes red with the stamp removed
  and green with it. The review escalated only on a gate-string mismatch between the absolute
  and relative forms of `make -C tool check`; the runner now normalizes both (dotfiles
  `fafa4f6`). Note: the per-pair loop would pass on an empty check list.
- **Task 5** accepted (`9975d489`): four internals unexported, an AST test proves every
  operator-facing message reaches `Catalogue` or a reasoned exemption, the zero-argument
  restatements gone, about 18 citations rewritten as reasons. Notes: `messageExemptions` is not
  checked for stale keys; an exemption's backing template is not itself verified.
- **Task 6** accepted (`9a6ba169`, `41e3d185`): `RepoOwnership` deleted, one index-keyed `Reason`
  name table. Note: a constant added after the `reasonCount` sentinel escapes the test.
- **Spend:** S2 about 1.9M (0.25M of it the escalated first launch). Pass total about 3.7M of 8.5M.

### S3 (2026-09-27, conductor)

- **Tasks 7 to 10** accepted, no fix rounds (`69b3fb92`, `183ecab2`, `b486c45c`, `95de343e`): the
  fixture ids and `Degraded` derive from `health`; one `exe` build helper serves `mangen` and the
  usage tests; `render` exports only the seams-table surface and h024 is gone; `render`'s comments
  carry reasons. Notes: the fixtures' stubs cover only settled cred-missing results; `exe`'s
  package doc still reads as history; `render.go` keeps one citation of a design brief as a
  design-fact source. Task 8's computed gate chained `check:facts` ahead of `make -C tool check`,
  so the baseline facts defect stopped the chain; its implementer ran the legs separately.
- **Spend:** S3 about 1.2M. Pass total about 4.9M of 8.5M.

### S4 (2026-09-27, conductor)

- **Task 11** accepted, no fix rounds (`a75179e0`, `137e7ee3`, `1ca19e9e`): `cairnCatalogue` folds
  `+`-concatenated string-literal consts and fails loudly on any other non-literal const;
  `copy.golden.md` regenerated with `longRoot`, `longHealth`, and `longDoctor`; `longDoctor`'s
  first sentence split so `check-copy`'s comma heuristic passes, every clause kept.
  `tool/CHANGELOG.md` carries the `## Unreleased` bullet.
- **Task 12** accepted, no fix round (`13b6841c`): one JSON-writing helper replaces the eight
  `fmt.Fprintf(w, "%s\n", data)` sites; `deps.checks` is an ordinary field `newDeps` fills from
  `health.All`, `healthChecks`'s nil-means-default method gone.
- **Task 13** accepted after one fix round (`bc8eca9b`, `e8d840a4`): `root.go`'s `--color`/
  `--width` comments, `probe_cloudflare.go`, `main.go`, and `f:cwtfs7` all name `cairn auth check`
  as live and state `codedError`'s current reason; every remaining process citation in non-test
  `cmd/cairn` files removed. The first draft made four false claims (`NO_COLOR` precedence, a
  misattributed copy-standard section, which commands print the account id, a leftover task
  citation), caught by `diff-reviewer` and corrected in the fix round.
- **Spend:** S4 about 1.3M. Pass total about 6.2M of 8.5M.

### Close (2026-09-27, conductor)

- **Simplify.** One `code-simplifier:code-simplifier` dispatch over `git diff main...HEAD -- tool`
  (`010f10e6`): three edits, all accepted by an independent `diff-reviewer` read; none changed
  output bytes or unexported a seams-table name.
- **Full gate.** `make -C tool check` green on the light lane; `check-facts` reproduces exactly
  Task 0's one baseline defect (`docs/internal/facts/admin.md:53`); `git diff --name-only
  main...HEAD` touches only `tool/`, `docs/internal/facts/`, `docs/superpowers/`, and this pass's
  ledgers. PR #94 opened against `main`.
- **Architecture reads.** Ten `go-architecture-reader` reads, one per package whose non-test
  source changed (`spine`, `store`, `health`, `providers`, `render`, `render/fixtures`,
  `internal/exe`, `cmd/mangen`, `cmd/copylist`, `cmd/cairn`): nine "sound with nits," `cmd/cairn`
  "needs work," 58 structural findings and 96 nits total, most predating this pass. Full text and
  the ROADMAP filings: `docs/superpowers/research/2026-09-27-go-chores-architecture-reads.md`.
- **Docs.** No facts bullet filed and no reference page changed (the pass's one public-behavior
  change, `cairn doctor --help`'s first sentence, needed neither). `docs/internal/docs-friction-log.md`
  read against this pass's scope; nothing to triage or add, since the pass touched no public docs.
- **Ledgers.** `ROADMAP.md`: both source entries' shipped items deleted; the survivors folded into
  one "Go tool architecture, declined and unplanned (2026-09-27)" entry (Decisions 2, 5, 7, 10,
  plus the B2-record pointer for Decision 12's nits); one new Next-tier entry, "Go tool
  architecture, round 2 (2026-09-27)," names `cmd/cairn` first and points at the new research
  record. `docs/HISTORY.md` gained the "Go tool architecture chores, thirteen tasks, 2026-09-27"
  entry. `tool/CHANGELOG.md` already carried Task 11's bullet; nothing else added; the engine
  `CHANGELOG.md` untouched. `docs/STATUS.md` is left for the conductor to update on `main` after
  the merge, per this fold's own instructions.
- **Fold review.** This fold agent authored the close's docs and ledgers (steps 4 and 5); one
  independent `diff-reviewer` read the committed fold and returned `fix` with five doc-text
  findings (`b66b6718`), all folded in the one round that followed.
- **Spend:** close (simplify, reviews, fold, this ledger) about 0.2M beyond the S1-S4 total, plus
  the ten architecture reads at about 0.7M. Pass total about 7.1M of 8.5M.

## Post-mortem

**Budgets scored.**

- **Tokens:** about 7.1M of the 8.5M ceiling (83%). Breakdown: Task 0 plus plan authoring and
  review about 0.8M, S1 about 1.0M, S2 about 1.9M (0.25M of it an escalated first launch on Task
  4's gate-string mismatch), S3 about 1.2M, S4 about 1.3M, the close's simplifier and reviews
  about 0.2M, the ten architecture reads about 0.7M. The ceiling held; no segment approached the
  80% finish-in-flight trigger until the close's own reads pushed the running total past it, by
  which point every task had already landed.
- **Attended time:** Planning misses: 0. Geoff approved the plan in one line at the gate before
  execution, with no question reaching him about scope, method, or design during planning.
  Execution sittings: 1. Geoff ruled the merge on green close in one line at the pass's end; no
  other sitting reached him during execution. Task 4's `diff-reviewer` escalation over an
  absolute-versus-relative gate-string mismatch was ruled by the conductor, not Geoff, per the
  plan's one-re-dispatch-then-conductor-decides rule; the conductor accepted Task 4 and had the
  runner normalize both gate-string forms. S1 through S4 and the close otherwise ran to completion
  on the conductor's own rulings.

**What a later pass would be wrong to conclude from this pass's smoothness.** Eleven of thirteen
tasks cleared on a single dispatch and review with no fix round and no escalation. Two (Task 1 and
Task 13) each needed one fix round, a second implementer dispatch after a `diff-reviewer` `fix`
verdict. Task 4 needed no fix round: its `diff-reviewer` escalation was resolved by conductor
ruling alone, without re-dispatching the implementer. No task was split and no scope changed,
which is not the norm for a `tool`-class pass; it reflects
Task 0's unusually thorough pre-flight (fourteen findings, all but one confirmed exact) and the
plan's thirteen decisions closing every judgment call before dispatch. A future Go architecture
pass with a thinner pre-flight should expect more fix rounds, not assume this pass's ratio.
