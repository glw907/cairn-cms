# Go tool architecture chores plan: review and fold

**Target:** `docs/superpowers/plans/2026-09-27-go-tool-architecture-chores.md` at `9220f6bb`
(branch `go-chores-plan`). **Lens:** one combined reviewer covering contract, mechanics, and
domain risk for a `tool`-class refactor that must not change behavior. The same agent folded the
findings. **Scope source:** ROADMAP Next-tier entries "The B2 architecture reads, what retire-1
left" and "Go tool architecture chores filed at retire-1's close", plus
`docs/internal/record/2026-09-21-go-tool-b2-architecture-reads.md`.

**Counts:** 0 blocker, 2 major, 11 minor. Folded 12, refused 1. No blocker is open, and there are
no owner forks.

## Verified sound (no finding)

- **Caller sweep.** I grepped every deleted or unexported name across the whole repo:
  `CombineState`, `ExitCodeFor`, `ParkCodes`, `Discover`/`Site`, `FailSeverityOf`, `HasRepo`,
  `FixForCondition`, `FixForCode`, `RepoOwnership`, `healthChecks`, `FailingOnly`, `Height`,
  and render's 18 names. The only hits outside their own package are the ones the plan already
  names: `render/body_test.go:305`, the `hygiene/severity_test.go:90` comment, and history docs.
  The hygiene needles are lowercase `exitCodeFor`/`combineState` and are scoped to
  `cmd/cairn`, so deleting the functions does not trip them. No `scripts/checks` gate reads a
  touched file, except `check-facts`, which G1 covers.
- **Finding 3 (AST probe).** `cmd/cairn/messages.go` has exactly three non-`BasicLit` const
  values: `longRoot`, `longHealth`, and `longDoctor`, all `*ast.BinaryExpr`. The file has no
  non-string literal consts.
- **Finding 6.** Render's outside callers match the kept list. `Wrap` is called at
  `cmd/cairn/root.go:144`. The 18 names have no outside caller, and no unexported name collides
  with an existing one.
- **Decision 8** matches go-conventions: "Defensive nil checks everywhere. Trust internal code."
  Only `testDeps` (`root_test.go:65`) reaches a health run, so the migration is one field.
- **Task 7 has no import cycle.** `render/fixtures` already imports `health`. `health.Check`'s
  methods are exported, so an outside stub can implement them.
- **Task 11.** `tool/v1.1.0` is tagged, so an `## Unreleased` bullet is correct. No doc or golden
  quotes `longDoctor`.
- **Decisions 1, 2, 5, 7, 10, 11, and 12 hold** against the seams table
  (`2026-09-14-cairn-tool-1-0-pass.md:282-305`) and the code.

## Findings

### G1 (major): the facts-repoint criterion passes vacuously

- **Where:** Decision 13 (plan `:210-214`), each task's "`check-facts` at baseline" criterion,
  Task 0 (`:272`).
- **Defect:** the plan relies on `check-facts` to prove that a moved citation was repointed.
  There are about 137 line pointers into `tool/`, and only 3 carry an anchor. For a pointer with
  no anchor, `check-facts` fails only when the pointer runs past the end of the file
  (`scripts/checks/check-facts.mjs:683-709`).
- **Evidence:** Task 1 deletes about 22 lines above `spine/exit.go:202-216`. That pointer is
  `f:v8c3ws`, which cites `StateWord`. After the deletion it stays in range and silently names
  other code. Task 13 removes 22 comment notes from `messages.go`, which has seven cited ranges,
  and they drift the same way.
- **Disposition:** folded. Decision 13 now states the limit. Task 0 records the symbol or first
  line that each `tool/` pointer names. Each task reports every pointer into the files it edited,
  with old and new lines. The review focus checks the reported pointers.

### G2 (major): Task 2's new assertions can agree with themselves

- **Where:** Task 2 acceptance (`:316-322`).
- **Defect:** the criterion says the assertions "read the body the call sent", but it never says
  what they compare against. Suppose the test compares against `logs.go`'s own `filterType`, or
  against `buildQuery`'s output. Then a wrong constant, the live-400 class this task exists to
  close, passes. The red demonstration can also be produced by changing the test's own
  expectation.
- **Evidence:** `buildQuery` (`logs.go:150-175`) writes `"type": filterType` for every filter.
  go-conventions, Assertion Discipline, rejects this pattern: "tests that a function equals
  itself".
- **Disposition:** folded. Expected values are literals from the query contract. The red demo
  changes `logs.go`, not the test.

### G3 (minor): `ParkCodes` cannot be unexported

- **Where:** Decision 3 (`:141-145`), Task 1 (`:290`).
- **Defect:** an unexported `parkCodes()` collides with the existing `var parkCodes`
  (`spine/park.go:29`). If `outcome.go` reads the slice directly, the function also has no
  reader, and `unused` flags it.
- **Disposition:** folded. The function is removed.

### G4 (minor): the spine AST completeness test has two gaps

- **Where:** Task 1 (`:294-296`).
- **Defect:** the test cannot run as specified. `CodeNone` and `ConditionNone` are constants of
  their types that are deliberately absent from `codes` and `conditions`. The test can also pass
  vacuously: a vocabulary whose type name is matched wrongly finds zero constants and passes. The
  red demo exercises only one vocabulary.
- **Disposition:** folded. The two exemptions are named, and the test fails on zero constants
  found for any type.

### G5 (minor): the `providers.Reason` test misses an appended constant

- **Where:** Decision 4 (`:151-153`), Task 6 (`:394-395`).
- **Defect:** `Reason` is an `iota` int type. A table check keyed on `ReasonUnknown` misses a
  constant appended after it. The phrase "derives outright" overclaims, because the table is
  still hand-kept, now as one list instead of three.
- **Disposition:** folded. The criterion now names the appended case, and the wording is
  corrected.

### G6 (minor): the perm-file header could become a second package doc comment

- **Where:** Task 3 (`:337-339`).
- **Defect:** "open with the same header" invites a comment directly above `package store`. That
  makes a second package doc, and `paths.go` already carries one.
- **Disposition:** folded. The header goes after the `package` clause.

### G7 (minor): three architecture reads have nothing to read

- **Where:** Close step 3 (`:554-557`).
- **Defect:** `go-architecture-reader` grades non-test source. `hygiene` has no non-test files.
  `logs` and `doctor` change tests only, so their source is unchanged since B2's reads. That
  makes three Opus dispatches with nothing new to grade.
- **Disposition:** folded. Reads run for the 10 packages whose non-test source changed.

### G8 (minor): Task 0 re-runs at every segment

- **Where:** Task 0 constraints (`:265-266`).
- **Defect:** the branch never takes `main`'s commits mid-pass, so a later segment re-checks
  nothing new. The line references each implementer needs are already confirmed in its own
  report. That makes three redundant dispatches.
- **Disposition:** folded. Task 0 runs once, at S1.

### G9 (minor): `longDoctor` is mislabeled a fix-line violation

- **Where:** finding 3 (`:72-77`), Decision 9 (`:185-187`).
- **Defect:** copy-standard section 2.5 is "The grammar of a fix line". `check-copy.sh` treats
  any entry line ending in a period as a fix line, and it reads only each entry's first line. So
  `longHealth`'s four-comma "Precedence is CRITICAL, then UNKNOWN, ..." continuation line passes
  unseen.
- **Disposition:** folded. The wording is corrected, and splitting the sentence is kept as the
  cheaper fix. The heuristic's reach joins HISTORY's "wrong to rediscover" list, and the gate is
  not changed.

### G10 (minor): Task 4 pins a value that no output reads

- **Where:** Task 4 (`:346-359`).
- **Defect:** `doctor.Result.ID` reaches only `spine.CheckVerdict.ID` (`status.go:65-69`).
  Nothing in production or tests reads `CheckVerdict.ID`: `ExitCode` ignores it, and the JSON
  reads `Check.ID`. The ROADMAP trigger, "the next check added to `internal/doctor`", has not
  tripped.
- **Disposition:** refused. The test is one small function, it closes the ROADMAP entry, and it
  guards `CheckVerdict.ID` for the HUD's future reader. Pre-flight finding 2 already records
  that the consequence was misstated.

### G11 (minor): Decision 6 overturns a recorded ruling without citing it

- **Where:** Decision 6 (`:170-173`).
- **Defect:** the 1.0 pass's segment 5 ruling 7 (`2026-09-14-cairn-tool-1-0-pass.md:4408`)
  kept `FailingOnly` and its branches. Without a citation, a reviewer may re-litigate it.
- **Disposition:** folded. Decision 6 now cites the ruling and states what superseded it.

### G12 (minor): the seams-table row is unnamed in Task 5

- **Where:** Task 5 (`:366-370`).
- **Defect:** the seams table keeps "the condition-to-fix map" for the HUD detail view. Task 5
  unexports `FixForCondition` and `FixForCode` without saying which exports carry the row, so
  the review focus "No seams-table name lost its export" is ambiguous.
- **Disposition:** folded. `FixFor` and `FixForReason` carry the row.

### G13 (minor): the grep and scope lists are too narrow

- **Where:** Global constraints (`:241-242`), Close step 2 (`:550-551`).
- **Defect:** the removed-symbol grep omits `scripts/` and `.github/`, and those directories hold
  gates that read tool files. The Close diff-scope proof omits `docs/superpowers/` (the plan and
  this record) and the friction log, so it would fail on the pass's own files.
- **Disposition:** folded.
