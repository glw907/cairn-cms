# retire-1: `cairn doctor`, the Go half of the doctor retirement

> **For agentic workers:** eleven tasks, three segments, in the one `doctor-go` worktree.
> Execution is the workflow runner `~/.claude/workflows/pass-execute.js`, named by this plan, with
> `cairn-implementer` on `sonnet`, `diff-reviewer` on `claude-opus-5`, and the gate run inside the
> chain on the light lane. **The conductor never reads a diff, a test log, or a gate transcript**;
> it consumes the runner's per-task records and decides accept, re-dispatch, split, or stop. One
> re-dispatch on a `fix` verdict; a second `fix` is the conductor's decision. A
> `go-architecture-reader` dispatch runs once per touched Go package at the merge, never inside the
> per-task chain.

**Date:** 2026-09-21.

**Spec:** `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, the "retire-1" section
(`:113-217`), "Choreography" (`:342-380`), "Out of scope" (`:382-386`), and the retire-1 half of
"Acceptance" (`:390-404`). This plan covers that scope only. The engine pre-task is
`docs/superpowers/plans/2026-09-21-doctor-pretask.md`; the engine removal is
`docs/superpowers/plans/2026-09-21-doctor-retire-2-engine.md` and
`docs/superpowers/plans/2026-09-21-doctor-retire-2b-records.md`.

**This pass cuts no release and pushes no tag.** No `tool/v1.1.0`, no `gh release create`, no npm
version. It merges to `main` by PR, untagged. The `tool/v1.1.0` tag is a separate session after
draft docs pass A, per the spec's Choreography step 5.

---

## Pre-flight findings

Every claim below was verified on 2026-09-21: engine-side facts against this worktree's tree at
`origin/main` `b0ecff41`, tool-side facts against branch `cairn-tool-b2`'s **committed head
`3dc2520f`**, read only through `git show cairn-tool-b2:<path>` and
`git ls-tree -r --name-only cairn-tool-b2 tool/`. **B2's worktree was never read from disk.** A
later pre-flight re-verifies each tool-side line against merged `main`, since B2 will have moved.

**Six spec claims are wrong or incomplete and the plan is written against the truth**; they are
marked CONTRADICTS.

1. **CONTRADICTS spec ruling 5 (`:50-52`): a usage error exits 3, not 1, and the collision is with
   UNKNOWN, not WARNING.** `cmd/cairn/main.go`'s `exitVerdict` (`:162-167`) returns
   `spine.VerdictUnknown` for every error that is not a `codedError`, and a usage error is never a
   coded error: `codedExit` (`:149-151`) has one caller, `cairn auth probe`.
   `cmd/cairn/usage_test.go:136`'s `TestAUsageErrorExitsUnknownWithEmptyStdout` pins it. The
   behaviour is also **frozen at 1.0 in two published pages**:
   `tool/docs/reference/exit-codes.md:85` ("A usage error exits 3 with byte-empty stdout") and
   `tool/docs/reference/json-output.md:285` (in the `## What freezes at 1.0` list). So the spec's
   "exits 1 as the tool's cobra layer already does" describes behaviour the tool does not have and
   could not take without a major-version event. **The plan is written against exit 3**, and the
   collision the command's docs page states is the real one: exit 3 covers a usage error, a run
   carrying an `unknown` check with no failure, and a directory that is not a cairn site. There is
   no collision with a WARNING failure. The spec's ruling 5 now carries this as an **amendment
   Geoff approved on 2026-09-21**; see "Spec amendments this plan proposes" below.
2. **CONTRADICTS the spec's status mapping (`:168-170`) as it reaches the exit code: neither
   `spine.StateWord` nor `spine.CheckVerdict` can express the doctor's `skip` or `info`.**
   `spine.StateWord` (`internal/spine/exit.go:213-228`) returns `"skip"` only when the reason is
   `ReasonCredMissing`, and a directory preflight holds no credential at all. `CheckVerdict.Verdict`
   (`exit.go:112-127`) has no path from an `Unknown` State to `VerdictOK`, so routing a doctor
   `skip` or `info` through `Unknown` would exit 3 and break the spec's own requirement at `:170`
   that "today's exit-0 runs stay exit 0". **The plan's resolution is in "Decisions this plan
   makes", decision 2**: the `doctor` package owns its own five status words and converts to
   `spine.CheckVerdict` with `skip` and `info` as `State: OK`, which reproduces the spec's table
   (`:168-170`). It does **not** reproduce the doctor's own `exitCodeFor`
   (`src/lib/doctor/run.ts:43-47`), which returns `0 | 1 | 3` and gives **every** failure exit 1
   regardless of severity. The Go table maps a blocker failure to 2, which spec ruling 5's
   four-code convention requires, so a site whose only failure is a blocker exits 2 under
   `cairn doctor` and 1 under `cairn-doctor`. That difference is deliberate, it is the one
   pre-declared expected disagreement in Task 10's agreement study, and Task 9's docs page states
   it.
3. **CONTRADICTS the spec's containment citation (`:133-135`): the cited block is the call site,
   not the containment.** `src/lib/media-seed/bin.ts:102-120` is the `readFileUnderCwd` closure and
   `:105-113` are its two checks, but both checks call helpers defined earlier in the same file:
   `isWithin` (`:18-27`) and `realpathNearestAncestor` (`:29-38`). The symlink half of the
   "stronger form" the spec names lives in `realpathNearestAncestor`, not in the cited range. All
   three port together. The doctor's own weaker form (`src/lib/doctor/bin.ts:41-54`, a textual
   prefix compare with no `realpath`) is **not** what this pass ports.
4. **CONTRADICTS the spec's site-config shape-check citation (`:135`).** `verifySiteConfigPath` in
   `packages/create-cairn-site/src/substitute.mjs` is at `:28-42`, with its doc comment from `:21`;
   the spec's `:27-40` starts inside the doc comment and stops before the function's `return`. The
   four rules are the same four the engine's twin enforces
   (`src/lib/doctor/checks-local.ts:166-180`): non-empty string, no leading `/`, no NUL byte, no
   `..` segment.
5. **CONTRADICTS the spec's `check-floors.ts` citation (`:161`).** The three functions are
   `parseVersion` (`:22-26`), `caretFloor` (`:31-35`), and `compareVersions` (`:37-39`); the spec's
   `:20-37` opens on a comment and stops one line inside `compareVersions`. The true span including
   the comments is `src/lib/doctor/check-floors.ts:20-39`.
6. **CONTRADICTS the spec's "eight file-only checks" list (`:140-142`) by omission: the three
   `check-floors.ts` functions are not the whole port.** `config.dependency-floors` also needs
   `judgePeers` (`:58-95`), the three per-format resolvers `lockedVersion` (`:46-49`),
   `pnpmResolve` (`:148-156`), and `yarnLockedVersion` (`:195-215`), and the optional-peer filter
   in `readEnginePeers` (`:238-248`), which drops every peer marked optional in
   `peerDependenciesMeta` because an absent optional peer would otherwise read as a skip and mask
   the framework verdict. The spec names the plain-`x.y.z` and caret rules; the optional filter is
   the one behaviour a Go port would silently lose. Task 5 carries all of it.

Verified, and not contradictions:

7. **`go:embed` fixes which package carries the conditions text.** `go:embed` cannot name a parent
   or sibling directory. The pre-task writes `tool/internal/spine/conditions.json` and
   `tool/internal/doctor/site-config-path.json` (pre-task plan, task table row 2), so **package
   `spine` carries the conditions embed and its text accessor, and package `doctor` carries only
   its own path file's embed**. There is no `go:embed` anywhere under `tool/` at B2's head
   (pre-task finding 11, re-confirmed: `git grep -n 'go:embed' cairn-tool-b2 -- tool/` is empty).
8. **`spine.ExitCode` is reusable as it stands.** Its signature is
   `ExitCode(sites []spine.SiteVerdicts, listErrs []error, expectSites int) Verdict`
   (`exit.go:154-166`) and `spine.CheckVerdict` (`exit.go:82-96`) carries `ID`, `State`, `Reason`,
   `Acknowledged`, and `Severity` and no record. `render/json_schema_test.go:131-133` shows the
   single-report idiom: `spine.ExitCode([]spine.SiteVerdicts{...}, nil, 0)`. A doctor run passes
   one `SiteVerdicts` built from its eleven checks. A zero-length slice folds to `UNKNOWN`
   (`exit.go:135-138`), which is exactly the verdict the outside-a-cairn-site case wants.
9. **`health.Check.Run` takes a `record.Record`** (`internal/health/health.go:68`), which a
   directory run does not have, and `health.All` (`:73-83`) is a literal slice of nine checks. The
   spec's "its own check contract" is therefore required, not preferred.
10. **The condition severity vocabulary is two words.** `src/lib/diagnostics/conditions.ts:8` is
    `type ConditionSeverity = 'blocker' | 'warning'`, and the mirror carries the field verbatim.
    `blocker` maps to `spine.CriticalFailure` and `warning` to `spine.WarningFailure`
    (`exit.go:70-75`), which is the whole of the spec's "fail at the condition's severity".
11. **All eleven conditions already exist as typed Go constants.** `spine/condition.go:19-44`
    declares 24 and `:47-72` lists them again; the eleven this pass raises are
    `config.bindings-missing`, `config.observability-off`, `config.csrf-disable-missing`,
    `config.public-origin-invalid`, `config.site-config-invalid`, `config.no-referrer-blanket`,
    `config.dependency-floors-unmet`, `admin.mount-incomplete`, `auth.role-wiring-missing`,
    `ai.posture-not-effective`, and `config.media-bucket-missing`, the last added by the pre-task's
    Task 1. **No new Condition constant is added by this pass.**
12. **`TestConditionsMatchRegistry`** is at `tool/internal/spine/condition_test.go:52-85` at B2's
    head (the pre-task's finding 13, re-read on B2): it resolves `providers.RepoRoot()`, scrapes
    `src/lib/diagnostics/conditions.ts`'s `REGISTRY` keys with a regex, and `slices.Equal`s the
    sorted sets. B2 changed seven lines in this file and no other nearby file.
13. **`purity_test.go`'s dependency pin is a list plus an integer.** `renderDirectRequires`
    (`internal/render/purity_test.go:170-175`) names render's four, `otherDirectRequires`
    (`:181`) is the integer `4`, and `TestRenderDirectRequiresArePinned` (`:186-215`) asserts
    go.mod's total direct require count equals `4 + 4`. Promoting YAML makes the integer `5` and
    the total `9`.
14. **YAML is already an indirect require and is promoted, not added.** `tool/go.mod`'s indirect
    block carries `go.yaml.in/yaml/v3 v3.0.4`, pulled in by `github.com/spf13/cobra/doc`
    (ADR-0002's Task 22a addendum, `tool/docs/adr/0002-render-dependencies.md:11-25`). Promoting it
    to direct adds **no module to the build graph**, the same shape `displaywidth` took
    (ADR-0002:53-56). `make check`'s `tidy-check` target runs `go mod tidy` and
    `git diff --exit-code -- go.mod go.sum`, so the promotion must be real (an import in
    non-test code) or tidy moves it back and the gate goes red.
15. **`render`'s exported surface is pinned by name.** `purity_test.go:224-246`'s
    `exportedSurface` and `TestExportedSurfaceIsPinned` (`:258-271`) fail on any addition. A
    `MarshalDoctor` and its schema-version constant are additions and edit that list in the same
    commit.
16. **The six schema files and the naming convention.** `tool/docs/reference/` holds
    `cairn-adopt-list.schema.json`, `cairn-auth-check.schema.json`,
    `cairn-health-summary.schema.json`, `cairn-health.schema.json`, `cairn-logs.schema.json`, and
    `cairn-sites-list.schema.json`. The convention is `cairn-<payload kind, kebab>.schema.json`, so
    the seventh is **`cairn-doctor.schema.json`**. Each declares
    `"$id": "https://cairn.pub/schema/<file>"`, `additionalProperties: false`, and a
    `schemaVersion` `const` the test at `json_schema_test.go:399-425` pins at 1.
17. **`cmd/cairn` carries five structural tests a new command must satisfy**, all in
    `cmd/cairn/root_test.go` unless noted: `TestNoCommandFileExceedsItsBound` (`:433`, bound 300
    lines), `TestEveryNonHiddenRootCommandDeclaresAGroup` (`:240`), `TestEveryCommandCarriesAnExample`
    (`:360`), `TestTerminalChecksAreConfinedToTheColourProfile` (`:410`), and
    `TestEveryActionCoverage` (`coverage_test.go:49`), which pins the exact command set.
18. **The copy golden is generated from Go values, not grepped.** `cmd/copylist/main.go:50-66`'s
    `catalogues()` lists exactly three packages: `health` (its `Catalogue()` plus `FixLines()`),
    `spine` (`Catalogue()`), and `cmd/cairn` (parsed from `messages.go`). `make copy-list` writes
    `tool/testdata/copy.golden.md`, `make check-copy` compares the committed file, and
    `TestRenderMatchesCommittedGolden` inside `make test` is what fails when a new string never
    reached the golden. **A new operator-facing string in `internal/doctor` is invisible to all
    three today**; see decision 5.
19. **The man page needs no committed file.** `make man` runs `cmd/mangen`, which harvests the
    command tree from the real binary's own `--help` text rather than importing `cmd/cairn`
    (`cmd/mangen/main.go:1-12`), and `cmd/mangen/main_test.go` runs it the same way and asserts the
    result. A new command earns a man page by existing. Nothing under `man/` is committed.
20. **`gate-tier.mjs` emits the relative tool gate.** `scripts/checks/gate-tier.mjs:54` sets
    `TOOL_GATE = 'make -C tool check'` and `:150` returns it for a diff whose paths are all under
    `tool/`. The runner runs from `args.repo`, so the relative and the absolute forms name the same
    directory; a reviewer seeing `make -C tool check` in an implementer's report where this plan
    says `make -C <abs worktree>/tool check` is reading the classifier's own string, not a
    deviation. The classifier's header (`:34-37`) also states that it chooses a tier and never a
    lane, so this plan's `gateLane: "light"` is the caller's decision and stands.
21. **Draft docs pass A's precondition 4 pins this pass's docs inventory exactly.**
    `docs/superpowers/plans/2026-09-21-draft-docs-pass-a.md:44-48` expects
    `tool/docs/reference/` on `main` to hold **seven `*.schema.json` files and four markdown
    pages**: `exit-codes.md`, `json-output.md`, `log-events.md`, and `cli-cairn-doctor.md`. "A
    different inventory stops the pass for a plan amendment." This pass therefore adds **exactly
    one schema and exactly one page** under `tool/docs/reference/` and nothing else.
22. **`docs/internal/record/` has no index and no gate over it.** `check-arm-indexes.mjs:28-34`
    walks `docs/internal` with `recursive: false`, and `docs/internal/README.md:99-106`'s
    `## record/` section states outright that it "deliberately does not enumerate every file here".
    So the pass A inventory record this plan ships beside it is linked from this plan and from the
    conductor's handoff, and **no index file is edited**.
23. **The engine-side inventory's own discrepancy is already recorded.**
    `docs/internal/record/2026-09-21-doctor-retirement-inventory.md:100-108` corrects the tool
    sizing doc's "four files" count to five plus two. Nothing in this pass depends on either count.

---

## Spec amendments this plan proposes

Three edits to `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md` ship with this
plan. Two are already applied, since the Choreography is Geoff's own ruling and the spec's prose
contradicted it. The third, ruling 5's exit code, Geoff approved with this plan on 2026-09-21.

| Spec line | The edit | Status |
| --- | --- | --- |
| Ruling 5 (`:50-52`) | A usage error exits **3**, not 1, so the collision is with UNKNOWN rather than WARNING. Pinned by `cmd/cairn/usage_test.go:136` and frozen at 1.0 by `json-output.md:285`; exit 1 could not be taken without a major-version event. The command's docs page states that exit 3 covers a usage error, an all-`unknown` run, and a non-site directory, so a caller tests for a nonzero exit rather than switching on 3. | **Approved (Geoff, 2026-09-21).** The spec carries it as a marked amendment; this plan's decision 1 and Tasks 8 and 9 are written against exit 3. |
| Brief (`:12-13`) | retire-1 ends at an **untagged merge**, not at the `tool/v1.1.0` release. | Applied. It contradicted Choreography `:352-353`, which is already Geoff's ruling. |
| The retire-1 heading (`:113`) | Same correction in the section heading. | Applied, same reason. |

A fourth item, smaller, is named where it bites rather than in the spec: the doctor `skip` and
`info` statuses have no wire word of their own in the frozen five, and decision 8 below settles
how the JSON payload writes them without adding a state word or a reason code.

---

## Pre-flight re-verified against merged `main` (2026-09-21, before Task 1)

Checked at `origin/main` `d041d1bf` (B2 merged as `5cbfbad0`, tool tree through `tool/v1.0.1` at
`9b479e8d`; the pre-task merged as `d041d1bf`). Every precondition holds: `tool/v1.0.0` on origin,
`tool/internal/spine/conditions.json` and `tool/internal/doctor/site-config-path.json` on `main`,
this plan on `main`. No citation is wrong; two drifted: `tool/docs/reference/exit-codes.md:85` is
now `:94`, and `tool/docs/reference/json-output.md:285` (`## What freezes at 1.0`) is `:286`. Three
B2 changes since `3dc2520f` bear on tasks: `render/purity_test.go`'s `exportedThemeMethods` now
includes `"Wrap"` (Task 9 must keep it); `tool/CHANGELOG.md` has a `## 1.0.1` section, so the new
`## Unreleased` goes above it (Task 9); `tool/go.mod`'s `go` directive is `1.26.0` (Task 4 edits
the require blocks only). `tool/Makefile` gained `install-check` and a `VERSION` `patsubst`; its
`check` target is unchanged. The runner args carry these as leading notes per task.

## Verified facts, recorded so no task re-derives them

- **The four regex heuristics are four checks, not four functions.** The tool-sizing record's
  "Four checks carry regexes tuned to SvelteKit source shapes" resolves to `config.csrf-disable`,
  `admin.mount-shape`, `auth.role-wiring`, and `config.no-referrer-blanket`. Their helper
  functions, all in `src/lib/doctor/checks-local.ts`: `hasUncommentedDisable` (`:76-84`),
  `wiresCairnGuard` (`:89-92`), `wiresAdminShell` (`:351-353`), `callsShellLoad` (`:355-357`),
  `guardRoleWiring` (`:421-428`), `parseHeadersFile` (`:487-505`), `isCatchAllHeadersPath`
  (`:509-517`), `isBlanketNoReferrerHeaderLine` (`:524-529`), `headersFileBlanketNoReferrer`
  (`:534-538`), `stripComments` (`:543-572`), and `hooksSetsBlanketNoReferrer` (`:580-589`). The
  four engine symbols they key on, which retire-2's `check:tool-heuristics` will guard, are
  `CairnAdminShell`, `.shellLoad`, `createAuthGuard`'s argument shape, and `checkOrigin: false`.
- **`requireOrigin` is `src/lib/env.ts:43-66`,** three rules: unset throws, an unparseable URL
  throws, and a non-`https://` origin throws unless the hostname is exactly `localhost` or
  `127.0.0.1` (matched exactly so `localhost.example.com` cannot skip https).
- **The wrangler reader's two halves.** `readWranglerConfig`
  (`src/lib/doctor/wrangler-config.ts:56-64`) prefers `wrangler.jsonc` and falls back to
  `wrangler.toml`, silently, returning null when neither exists. `stripJsonc` (`:139-176`) strips
  `//` and `/* */` outside string literals character by character, then removes trailing commas by
  regex. `factsFromJsonc` is `:178-211`; the shallow line-anchored toml read the spec forbids
  replacing with a parser is `factsFromToml`, comment at `:213-216` and body at `:217-282`.
- **The doctor's context fields this pass does and does not need.** `DoctorContext`
  (`src/lib/doctor/types.ts:76-112`) carries `cwd`, `readFile`, `publicOrigin`,
  `mediaBucketBinding`, `roles`, and `aiPosture`, which this pass needs, and `from`, `repo`,
  `cfToken`, `cfAccountId`, `github`, and `fetch`, which it does not: every check that reads one is
  dropped or deferred.
- **The site-config candidate paths are four, in order.** `SITE_CONFIG_PATHS`
  (`checks-local.ts:203-208`): the canonical path from `site-config-path.json`
  (`{"path":"src/theme/site.config.yaml"}` today), then `site.config.yaml`,
  `src/lib/site.config.yaml`, and `src/site.config.yaml`.
- **The engine's `src/content/.cairn/site-facts.json` shape is `version`, `mediaBucketBinding`,
  `roles`, `aiPosture`,** each of the last three omitted when the adapter declares none (pre-task
  plan, Task 3 "Shape"). `roles` is the custom role vocabulary; the doctor's own
  `customRoleNames` (`checks-local.ts:409-412`) filters `DEFAULT_ROLES` out, and the engine writes
  the declaration unfiltered, so the Go check applies the same filter against the default pair.
- **No pixel renders in this pass.** No Svelte component, no admin CSS, no public route, no e2e
  baseline. The CI-canonical-baseline gotcha in `CLAUDE.md` does not apply to any task here.

---

## Header

| Field | Value |
| --- | --- |
| **Goal** | Land `cairn doctor [<dir>]` in the Go `cairn` CLI on `main`, untagged: a record-less, credential-less directory preflight carrying the eleven checks the spec scopes, its own JSON payload kind and published schema, the conditions text embed, and the corpus lifted from the TypeScript doctor's unit tests before retire-2 deletes them. |
| **Spec** | `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md` ("retire-1", `:113-217`; "Choreography"; "Out of scope"; the retire-1 bullets of "Acceptance"). |
| **Place in the order** | Step 3 of the spec's five-step Choreography: B2's `tool/v1.0.0` merges and releases, the engine pre-task merges, **this pass** merges untagged, draft docs pass A merges, one `tool/v1.1.0` is tagged and released from a commit carrying both, retire-2a then retire-2b land last. |
| **Pass precondition** | See "The pass precondition" below. All three must hold before Task 1 is dispatched. |
| **Branch** | `doctor-go`, off `origin/main` **after both `tool/v1.0.0` and the pre-task have merged**. |
| **Worktree** | `.claude/worktrees/doctor-go`, created by the conductor before Task 1. No task touches the main checkout, the `doctor-retirement` worktree, the `doctor-pretask` worktree, `cairn-tool-b2`, or any other worktree. |
| **Token ceiling** | **2.4M.** The 80 percent decision point is **1.92M.** Sized below. |
| **Checkpoint interval** | Checkpoints at **Task 3's accept and Task 7's accept**, which are the first two segment boundaries. One STATUS write at each. A checkpoint lands only at a segment boundary, since that is the only place a decision can land. |
| **Execution mode** | **Workflow mode.** `~/.claude/workflows/pass-execute.js` for Tasks 1 through 9, args block below. Task 10 (the agreement study) and Task 11 (close) run as the conductor's own dispatches, since neither is an implement-review-gate chain. |
| **Segments** | Three: Tasks 1 to 3, Tasks 4 to 7, Tasks 8 to 11. Every task boundary is a commit the light gate proved green, so any of them is a safe stop. |
| **Merge** | By PR, **without a tool tag**. Before the PR, `git merge origin/main` into `doctor-go` and re-gate. No tag task and no release task exists in this plan. |

### Sizing the ceiling

The pre-task took 700K for four tasks, two of them carrying a blocker the spec did not cost. This
pass has eleven tasks, nine of them Go through the full chain. A Go implement-review-gate chain
against a corpus costs roughly what one pre-task task did, about 175K, which is 1.6M over nine.
Task 10 runs two binaries against six trees and costs like a heavy task. The conductor's own
turns, two checkpoints, the merge, and one fix round per segment add the rest. 2.4M, against
pass A's 3.5M for twelve tasks including prose chains, is the consistent number.

### The pass precondition

All three of these are the conductor's check, before the worktree is created and before Task 1 is
dispatched. None is re-run by an implementer.

1. `git ls-remote --tags origin 'tool/v1.0.0'` prints a **non-empty** result. B2's tag is what
   makes `tool/v1.1.0` the next number and what `main` must already carry.
2. `git ls-tree origin/main tool/internal/spine/conditions.json` prints a tree entry. That is the
   pre-task's conditions mirror, and every task in Segment 1 reads it.
3. **`doctor-retire-1-plan` is merged to `main`**, asserted with
   `git ls-tree origin/main docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md
   docs/internal/record/2026-09-21-doctor-retire-1-pass-a-inventory.md` printing **two** tree
   entries. Neither file is on `main` as this plan is written; both live on the
   `doctor-retire-1-plan` branch, and the PR that lands them merges after Geoff's approval and
   before `doctor-go` branches. Without it Task 11 cannot append its post-mortem to this plan
   file, and Task 11's handoff has no inventory record on `main` to refresh with the merge SHA.

Three further dependencies this pass inherits from the pre-task's merge, named so a failure is
diagnosed rather than rediscovered. Each is checked in the same sweep:

- `tool/internal/spine/condition.go` declares `ConditionConfigMediaBucketMissing` in both the
  constant block and the `conditions` slice (pre-task Task 1). Without it the media check has no
  id to raise.
- `tool/internal/doctor/site-config-path.json` exists (pre-task Task 2). Task 2 here embeds it.
- `src/content/.cairn/site-facts.json` is written by the `cairn-manifest` bin and verified at
  `buildStart` (pre-task Task 3), and `examples/showcase/src/content/.cairn/site-facts.json` is
  committed. Task 7 reads the file and Task 10 compares against the showcase's.

A failure on any of the six is a halt: write STATUS, name the check that failed, and stop.

### The gate

Every gate runs through `cairn-run-gate '<command>'`. **On exit 75, re-issue the same command
unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints before
the next dispatch.

**The light lane is this pass's lane, and it is not optional:**

```
CAIRN_GATE_LANE=light cairn-run-gate 'make -C <abs worktree>/tool check'
```

`make -C tool check` is `tidy-check fmt-check vet lint vulncheck vale-comments check-copy test`
(`tool/Makefile`). It launches no browser and reads no npm script, so the light lane is correct
and required: the heavy lane would queue it behind another session's browser gate for nothing.
`pass-execute.js` renders the lane into every implementer prompt from `args.gateLane`.

Three points about that gate every implementer needs:

- **`tidy-check` runs `go mod tidy` and then `git diff --exit-code -- go.mod go.sum`.** A
  dependency promoted in `go.mod` without a real non-test import is moved straight back and the
  gate goes red.
- **`check-copy` compares the committed `tool/testdata/copy.golden.md` only.** The test that fails
  on a string that never reached the golden is `TestRenderMatchesCommittedGolden`, inside
  `make test`. A task adding an operator-facing string runs `make -C <abs worktree>/tool copy-list`
  and commits the regenerated golden **in its own commit**.
- **`vale-comments` runs Vale over Go comments** (`tool/scripts/vale-comments.sh`,
  `tool/.vale.ini`). Every new doc comment meets it; the em dash is banned.

**One heavy gate, once, in Task 11**, after the merge from `main`:
`cairn-run-gate 'npm run check && npm test'`, plus the close's own scoped list
(`check:rulings-format`, `check:docs`, `check:vale`, `check:arm-indexes`, `check:facts`,
`check:tool-conditions`). The close is the only task in this pass that touches a file outside
`tool/`.

### Before each dispatch: the live-executor sweep

1. `git -C <path> status --porcelain` is empty for every entry `git worktree list` reports, except
   `doctor-go` itself.
2. `pgrep -f .claude/worktrees/doctor-go` prints nothing, and `pgrep -f cairn-tool-b2` prints
   nothing. (`pgrep` exits 1 on no match, the same as `grep`; read the output, not the exit
   status.)
3. **No task reads the `cairn-tool-b2` worktree from disk, ever.** Tool-side facts come from
   `git show cairn-tool-b2:<path>` before that branch merges, and from the worktree's own tree
   after. A dispatch that needs a B2 fact before the merge is given it in its prompt.
4. Warm uncommitted code in `doctor-go` this pass did not author is stop-and-investigate, never
   free progress.

### Halts

Stop, write STATUS, and ask one combined question on any of these. Everything else runs to
completion with no check-in.

- Any of the three pass preconditions failing, or any of its three named dependencies absent.
- A second `fix` verdict on any task.
- A red gate that a single fix round does not clear.
- A `diff-reviewer` finding that a task changed a published check id, a condition id, a
  `schemaVersion`, an exit code, a state word, or a reason code the 1.0 freeze names.
- A design that needs `cairn doctor` to hold a credential, read the site registry, or make a
  network request other than `ai.posture-effective`'s single credential-free GET.
- `go mod tidy` wanting a module other than the promoted YAML library.
- Task 10 finding a disagreement between the Go and TypeScript checks that is neither expected nor
  a named defect.

---

## Decisions this plan makes, which the spec does not

1. **A usage error exits 3, and the command's docs page states the real collision.** Finding 1. The
   spec's ruling 5 is written against behaviour the tool does not have and could not take without
   a major-version event. `cli-cairn-doctor.md` states that exit 3 covers three cases, a usage
   error, a run whose only non-passing results are `unknown`, and a directory that is not a cairn
   site, and that a caller therefore tests for a nonzero exit rather than switching on 3 alone.
2. **The `doctor` package owns its own five status words, and converts to `spine.CheckVerdict` for
   the exit code alone.** Finding 2. The conversion table, which reproduces the spec's `:168-170`.
   It does **not** reproduce `run.ts:43-47`: `exitCodeFor` returns `0 | 1 | 3` and gives every
   failure exit 1, while the table below gives a blocker 2, which spec ruling 5's four-code
   convention requires. Task 10 pre-declares that as an expected disagreement, never a defect.

   | doctor status | printed word | `spine.CheckVerdict` | contributes |
   | --- | --- | --- | --- |
   | pass | `PASS` | `State: OK` | 0 |
   | fail | `FAIL` | `State: Failing`, `Severity` from the condition's `severity` | 2 for `blocker`, 1 for `warning` |
   | skip | `SKIP` | `State: OK` | 0 |
   | info | `INFO` | `State: OK`, its note printed | 0 |
   | unchecked | `UNKNOWN` | `State: Unknown`, `Reason: spine.ReasonNotObservable` | 3 |

   `spine.StateWord` is **not** called by this package, and the `Acknowledged` field is never set:
   a hold covers an adopted site's own failing check, which a directory preflight has no concept
   of. The exit code itself comes from `spine.ExitCode([]spine.SiteVerdicts{verdicts}, nil, 0)`,
   the same call `render/json_schema_test.go:131-133` makes.
3. **The text report is plain and does not enter `internal/render`.** `render`'s bodies are built
   on `health.Report` and the whole `Theme`, profile, glyph-tier, and 146-frame golden machinery;
   a directory preflight needs none of it, and taking it would mean a new `View`, a new body file,
   an addition to the pinned `exportedSurface`, and a golden matrix across five widths and four
   colour rungs. So `cairn doctor`'s report is the shape `src/lib/doctor/report.ts:22-40` already
   produces, one line per check then a why/fix/docs block per failure then a count summary,
   written as a pure function in `internal/doctor` with goldens under
   `tool/internal/doctor/testdata/golden/`. **Consequences, stated on the docs page and in the
   command's help:** `--color`, `--theme`, and `--width` have no effect on `cairn doctor`; the
   command queries no terminal, which satisfies
   `root_test.go:410`'s `TestTerminalChecksAreConfinedToTheColourProfile` trivially; `--quiet`
   *is* honoured, suppressing the whole report on an OK run and nothing else, the rule
   `quietSuppressesFrame` (`cmd/cairn/health.go:164-166`) already states. This narrows the spec's
   "the single TTY predicate" (`:122`) to "queries no terminal at all", which is the leaner form
   the charter prefers; the ledger records it.
4. **The command joins `groupSite` and completes directories.** `cairn doctor` is about a site, so
   it sorts under "Site commands:" beside `health` and `logs`
   (`root_test.go:240`'s `TestEveryNonHiddenRootCommandDeclaresAGroup` requires a group). Its
   `ValidArgsFunction` returns `cobra.ShellCompDirectiveFilterDirs` and **never** calls
   `completeSiteIDs` (`root.go:247-265`): the argument is a directory, not a registry id.
5. **`internal/doctor` gains a `Catalogue()` and joins `cmd/copylist`.** Finding 18: the copy
   golden reads three packages' Go values, and a doctor check's `detail` sentence is operator-facing
   copy that today would reach no gate. Task 1 adds the fourth catalogue to
   `cmd/copylist/main.go:61-65`; every later task that adds a string regenerates
   `tool/testdata/copy.golden.md` in its own commit. **This makes `copy.golden.md` a file Tasks 1
   and 5 through 9 all touch**, which is one of the reasons every task here is serial.
6. **The docs URL is built in `internal/doctor`, not borrowed from `render`.** The shape is
   `https://cairn.pub/docs/admin/<basename without .md>#<fragment>` from the mirror's `docsAnchor`
   (every one of the 24 anchors names `is-it-working.md`, engine inventory `(d)`). `render/layout.go`
   holds a constant of the same shape, but a `doctor`-to-`render` import would invert the
   dependency direction for one string. Draft docs pass A renames `layout.go`'s constant
   (pass A plan `:314-316`); this plan deliberately does not couple to it, and the task report
   names where the builder landed so pass A can reconcile the two.
7. **The ledger split follows the spec, not the brief.** The spec puts the ledger under retire-2
   (`:314-324`), and writing the retirement-wide entries twice would be worse than writing them
   late. **retire-1's close writes exactly five entries**, each about something this pass itself
   executed and each needed by a reader of `main` before retire-2 lands: the `config.site-config`
   narrowing (spec `:149-155`), the plain text report and the narrowed TTY reading (decision 3),
   the drift-test replacement (Task 2), the containment carry-forward of the 2026-09-02 ledger
   amendment (spec `:136`), and the payload's wire mapping for `info` and `skip` (decision 8).
   The retirement itself, the dropped and deferred checks,
   and `site-facts.json` as new engine surface stay with retire-2b. `check:rulings-format` joins
   the close's gate.
8. **The JSON payload writes the frozen five state words, and `info` is not one of them.** The
   doctor's own vocabulary is five words (decision 2), but `json-output.md:290` freezes the wire
   `state` set at `pass`, `fail`, `held`, `skip`, `unknown`, and `:225` plus
   `cairn-health.schema.json:38-39` require a `reason` on every `skip` and every `unknown`. So the
   printed report and the payload diverge deliberately:

   | doctor status | printed word | wire `state` | wire `reason` |
   | --- | --- | --- | --- |
   | pass | `PASS` | `pass` | none |
   | fail | `FAIL` | `fail` | none |
   | skip | `SKIP` | `skip` | `reason.not-run` |
   | info | `INFO` | `pass` | none |
   | unchecked | `UNKNOWN` | `unknown` | `reason.not-observable` |

   **No state word and no reason code is added**, which keeps spec `:177` true. Two consequences
   a reviewer must not read as drift. **`info` is written as `state: pass`**, which is the spec's
   own mapping at `:168-170` ("`info` to pass with its note printed"); the note travels in a
   doctor-only key, `note`, declared in the doctor schema and named on `json-output.md`'s doctor
   section, so a reader can still tell an `info` from a bare pass. **A doctor `skip` takes
   `reason.not-run`**, the closest fit in the frozen eight: the code says the check did not run,
   which is exactly what a doctor skip means (the check's precondition did not apply, so there
   was nothing to measure). `reason.not-observable` is wrong here, since it names a check that
   tried and saw nothing. Today `reason.not-run` is emitted only for a budget-cut or panicking
   `cairn health` check (`internal/health/health.go:151,173`), so the doctor's use widens the
   code's meaning without widening the vocabulary; **Task 9 states that widening in one sentence
   on `json-output.md`'s doctor section**, and Task 11 files it as a fourth ledger entry.
   `held` is never written: a hold is an adopted site's operator accepting a known failure, which
   a directory preflight has no concept of.
9. **`internal/doctor` marshals its own payload; `internal/render` keeps only the schema-version
   constant.** The reviewer's alternative, `MarshalDoctor` in `render`, would make `render` import
   `doctor` and transitively `net/http` (the posture check's GET), growing a package whose whole
   contract is purity and whose direct requires are pinned by name
   (`purity_test.go:170-175,186-215`). `render` already imports `health`, `logs`, and `spine`, and
   none of them dials. So the marshaller lands in `internal/doctor`, `render` gains
   `DoctorSchemaVersion` alone, and `exportedSurface` (`purity_test.go:224-246`) gains exactly one
   name rather than three. The schema tests stay in `render`, which is where the other six live
   and where `schemaDir` already resolves.
10. **Eleven tasks, not the spec's "about nine".** The spec's own retire-1 acceptance (`:392-398`)
   demands an agreement study against four production trees plus two facts-bearing sites, which is
   a task of its own and not an implementer chain; and eight file-only checks in one task would put
   eight deliverables behind one review. The eleven are three foundation tasks, four check tasks,
   two surface tasks, the study, and the close. Segments stay at three to four.

---

## Task table

| Task | Runs as | Files | Serial after |
| --- | --- | --- | --- |
| 1, the package contract, the snapshot, and containment | chain, `sonnet` | `tool/internal/doctor/{doc.go,check.go,snapshot.go,fileread.go,status.go}` and their tests, `tool/cmd/copylist/main.go`, `tool/cmd/copylist/main_test.go`, `tool/testdata/copy.golden.md` (regenerated, **in its own commit**, the same clause Tasks 5 through 9 carry) | the pass precondition |
| 2, the conditions embed, its text accessor, and the drift-test replacement | chain, `sonnet` | `tool/internal/spine/{conditions.go,conditions_test.go,condition_test.go}`, `tool/internal/doctor/{siteconfigpath.go,siteconfigpath_test.go}` | 1 |
| 3, the wrangler readers and the lifted corpus | chain, `sonnet` | `tool/internal/doctor/{wrangler.go,jsonc.go}` and their tests, `tool/internal/doctor/testdata/corpus/**` | 2 |
| 4, YAML promoted to a direct require | chain, `sonnet` | `tool/go.mod`, `tool/go.sum`, `tool/docs/adr/0002-render-dependencies.md`, `tool/internal/render/purity_test.go`, `tool/internal/doctor/{siteconfig.go,siteconfig_test.go}` | 3 |
| 5, the five config checks | chain, `sonnet` | `tool/internal/doctor/{check_bindings.go,check_observability.go,check_origin.go,check_siteconfig.go,check_floors.go}` and their tests, `tool/testdata/copy.golden.md` | 4 |
| 6, the three heuristic checks | chain, `sonnet` | `tool/internal/doctor/{check_csrf.go,check_referrer.go,check_mount.go}` and their tests, `tool/testdata/copy.golden.md` | 5 |
| 7, the three facts checks | chain, `sonnet` | `tool/internal/doctor/{facts.go,check_media.go,check_roles.go,check_posture.go}` and their tests, `tool/testdata/copy.golden.md` | 6 |
| 8, the command, the report, the goldens, and the help | chain, `sonnet` | `tool/cmd/cairn/{doctor.go,doctor_test.go,messages.go,help_agents.go,coverage_test.go,root_test.go}`, `tool/internal/doctor/{report.go,report_test.go,testdata/golden/**}`, `tool/testdata/copy.golden.md` | 7 |
| 9, the JSON payload, the seventh schema, and the frozen surfaces | chain, `model: opus` | `tool/internal/doctor/{json.go,json_test.go}`, `tool/internal/render/{json.go,json_schema_test.go,purity_test.go,testdata/json/doctor.json}`, `tool/docs/reference/{cairn-doctor.schema.json,json-output.md,exit-codes.md,cli-cairn-doctor.md}`, `tool/cmd/cairn/doctor.go`, `tool/testdata/copy.golden.md`, `tool/CHANGELOG.md` | 8 |
| 10, the agreement study | conductor dispatch, `model: opus`, read-and-measure | `tool/testdata/doctor-agreement.md` | 9 |
| 11, close | ritual: the conductor's own turns, one `code-simplifier`, one `go-architecture-reader` per touched package, one `diff-reviewer` over the fold | `docs/STATUS.md`, `docs/HISTORY.md`, `ROADMAP.md`, `docs/internal/engine-rulings.md`, this plan file | 10 |

**Ordering. Every task in this pass is serial; none is independent, and none may be split into a
second worktree.** Four reasons, each sufficient:

- The one-executor rule: one worktree, one executor, always.
- Tasks 5 through 9 all rewrite `tool/testdata/copy.golden.md` (decision 5), which is generated
  from the whole module's Go values and cannot be merged by hand.
- Each check task builds on the previous task's `Check` contract and snapshot fields, and Task 9
  marshals whatever Task 8's report shape settled.
- `tool/go.mod` and `tool/go.sum` are rewritten by `go mod tidy` on every gate run, so two
  concurrent chains would fight over them.

### The `pass-execute.js` args block

The conductor invokes this once for Tasks 1 through 9, from the `doctor-go` worktree. Tasks 10 and
11 are dispatched separately.

**This block is a template, not a literal.** `implementPrompt` interpolates `${t.criteria}`
unconditionally (`~/.claude/workflows/pass-execute.js:173`), so a task without it renders the word
`undefined` into the implementer's prompt where its acceptance criteria belong, and a task without
`files` renders "Files: not specified". **Before invoking, the conductor fills `criteria`, `files`,
and `notes` on every one of the nine tasks** from that task's own section below: `criteria` is the
task's "Acceptance criteria" list as one string, `files` is its row in the task table above as an
array of paths, and `notes` is its "Constraints" section plus the sentence naming the mandatory
skills. Task 1, filled, is the worked example:

```json
{
  "id": "1",
  "title": "The doctor package contract, snapshot, and containment",
  "gateTier": "tool",
  "files": [
    "tool/internal/doctor/doc.go",
    "tool/internal/doctor/check.go",
    "tool/internal/doctor/snapshot.go",
    "tool/internal/doctor/fileread.go",
    "tool/internal/doctor/status.go",
    "tool/internal/doctor/*_test.go",
    "tool/cmd/copylist/main.go",
    "tool/cmd/copylist/main_test.go",
    "tool/testdata/copy.golden.md"
  ],
  "criteria": "A read through a symlink leaving the directory is refused, proven on a real temporary tree, with the textual `..` arm proven separately; a read of an absent file under the directory returns absent, not an error; the status conversion is table-driven over all five statuses and asserts pass 0, fail-blocker 2, fail-warning 1, skip 0, info 0, unchecked 3, plus a case asserting a run of only pass, skip, and info folds to spine.VerdictOK; a run with zero checks folds to spine.VerdictUnknown; the not-a-cairn-site predicate is proven on four fixtures; a test asserts spine.StateWord is named nowhere in the package; `make -C <abs worktree>/tool copy-list` produces a golden carrying a doctor section, committed in its own commit, with check-copy and TestRenderMatchesCommittedGolden green; the light gate is green.",
  "notes": "Read the plan's Task 1 section whole: docs/superpowers/plans/2026-09-21-doctor-retire-1-go.md. go-conventions is mandatory for every file. The contract is pure functions over one snapshot and is not health.Check. Containment uses filepath.EvalSymlinks and filepath.Rel, never strings.HasPrefix. Report your commit SHAs and subjects."
}
```

The nine tasks, before that fill:

```json
{
  "repo": "/var/home/glw907/Projects/cairn-cms/.claude/worktrees/doctor-go",
  "gate": "make -C /var/home/glw907/Projects/cairn-cms/.claude/worktrees/doctor-go/tool check",
  "gateLane": "light",
  "implementer": "cairn-implementer",
  "reviewer": "diff-reviewer",
  "maxFix": 1,
  "parallel": false,
  "tasks": [
    { "id": "1", "title": "The doctor package contract, snapshot, and containment", "gateTier": "tool" },
    { "id": "2", "title": "The conditions embed and the drift-test replacement", "gateTier": "tool" },
    { "id": "3", "title": "The wrangler readers and the lifted corpus", "gateTier": "tool" },
    { "id": "4", "title": "YAML promoted to a direct require", "gateTier": "tool" },
    { "id": "5", "title": "The five config checks", "gateTier": "tool" },
    { "id": "6", "title": "The three heuristic checks", "gateTier": "tool" },
    { "id": "7", "title": "The three facts checks", "gateTier": "tool" },
    { "id": "8", "title": "The command, the report, the goldens, and the help", "gateTier": "tool" },
    { "id": "9", "title": "The JSON payload, the seventh schema, and the frozen surfaces", "gateTier": "tool", "model": "opus" }
  ]
}
```

Each task's `criteria`, `files`, and `notes` are this plan's own section for that task, pasted
whole. `gateTier: "tool"` pins the classifier's standalone tool tier (finding 20), so a task whose
diff happens to touch a `tool/**/*.md` page still runs the Go gate and not an npm one. **Every
dispatch names `go-conventions` as mandatory, and Tasks 8 and 9 additionally name
`golang-spf13-cobra` for `tool/cmd/cairn`.**

**Every implementer report, on every task in this pass, lists its commit SHAs and their subject
lines, in order.** Five of the acceptance criteria below require a regenerated
`tool/testdata/copy.golden.md` "in its own commit" (Tasks 1, 5, 6, 7, 8, and 9), and no report
shape names commits otherwise, so a conductor who never reads a diff has no way to confirm the
split happened. The `notes` string for every task carries the sentence, and `diff-reviewer` checks
the listed commits against the task's own "in its own commit" criteria.

---

## Task 1: the doctor package's contract, its snapshot, and containment

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory for every file.**

### Outcome

`tool/internal/doctor` exists as a package with its own check contract, its own snapshot type, its
own five-word status vocabulary and the conversion to `spine.CheckVerdict`, and a file reader that
cannot read outside the resolved directory even through a symlink. No check is implemented yet.

### Constraints

- **The contract is pure functions over one snapshot, and it is not `health.Check`.**
  `health.Check.Run` takes a `record.Record` (`internal/health/health.go:68`), which a directory
  run does not have. A doctor check takes the snapshot and returns a result; it makes no I/O of its
  own, holds no client, and reads no clock.
- **The snapshot is what makes that purity hold for the two checks that are not file reads**, and
  this task declares those fields even though Tasks 7 and 9 fill them. Without them the contract
  is unsatisfiable: `ai.posture-effective` needs a live GET (Task 7) and the JSON payload carries a
  stamped instant (Task 9), and a pure check can do neither. The `Snapshot` therefore carries, in
  addition to the file bodies:
  - **the resolved public origin**, or its absence and which source was consulted, under the
    `vars.PUBLIC_ORIGIN`-then-environment precedence both `config.public-origin` and
    `ai.posture-effective` use;
  - **the fetched `robots.txt` body**, or its absence together with the reason for the absence (no
    origin, an origin that does not parse, a transport failure, a non-200 status), as a typed
    field rather than a bare empty string;
  - **the run instant**, stamped once.

  **The command layer fills all three before any check runs**; the checks read them and stay pure,
  so `internal/doctor`'s check functions still hold no client and read no clock. Task 7 implements
  the fetch in the command layer, not inside the posture check.
- **`spine.ExitCode`, `spine.CheckVerdict`, `spine.Condition`, `spine.FailSeverity`, and
  `spine.ReasonNotObservable` are reused exactly as they are.** No type in `spine` is changed by
  this task, and no `Condition` constant is added (finding 11).
- **The status conversion is decision 2's table and nothing else.** `spine.StateWord` is not
  called from this package; a test asserts the package names it nowhere.
- **Containment is the stronger form and it is ported whole** (finding 3): `isWithin`
  (`src/lib/media-seed/bin.ts:18-27`), `realpathNearestAncestor` (`:29-38`), and the two checks at
  `:105-113`. A path that resolves outside the directory, and a path whose real resolved location
  is outside it, are both refused with an error naming the relative path and never the absolute
  one. An absent file reads as absent, not as an error, matching `:117`.
- **The Go primitives, named so "ported whole" is not left to the implementer.** Node's
  `realpathSync` and `startsWith` have no one-to-one Go twin, and the wrong pick is silently
  wrong rather than red:
  - **`filepath.EvalSymlinks` on `<dir>` once**, at snapshot construction, and the result is the
    boundary every later comparison uses. `<dir>` always exists, so it needs no
    nearest-ancestor handling of its own.
  - **Nearest-existing-ancestor resolution for every candidate path**, the
    `realpathNearestAncestor` shape (`media-seed/bin.ts:29-38`): `filepath.EvalSymlinks` on the
    candidate, and on `fs.ErrNotExist` recurse to the parent and rejoin the unresolved trailing
    segments. A candidate that does not exist yet is the common case (a `wrangler.toml` on a
    jsonc site), so this arm is not an edge case.
  - **Containment by `filepath.Rel`, never `strings.HasPrefix`.** A path is contained when
    `filepath.Rel(boundary, candidate)` succeeds and its result is neither `..` nor prefixed by
    `..` plus a separator. `HasPrefix` is wrong twice over: `/a/bc` prefixes `/a/b`, and the tool
    ships `internal/store/perm_windows.go`, so Windows paths compare case-insensitively while Go
    string comparison does not.
  - **The site-config path is rejected before it is resolved**, on the four shape rules Task 2's
    accessor enforces: absolute, a `..` segment, a NUL byte, or empty.
  - **Acceptance cases for the two error paths**: a **dangling symlink** under `<dir>` (the target
    does not exist, so `EvalSymlinks` fails with something other than a containment violation,
    and the read reports absent rather than refusing), and a **permission-denied** read of a file
    that does exist under `<dir>` (an error, not absent, and not a containment refusal).
- **A containment refusal has a status, and it is `unchecked`.** A refusal is not a failure of the
  site: the check could not observe its input. Every check whose read is refused returns
  `unchecked`, which decision 2 maps to `State: Unknown` with `spine.ReasonNotObservable` and
  exit 3, and its `detail` names the relative path that was refused. This is not hypothetical:
  `node_modules/@glw907/cairn-cms`, which `config.dependency-floors` reads (Task 5), is a symlink
  under pnpm and under an npm workspace, and can resolve outside `<dir>` on a perfectly healthy
  monorepo. **Task 3's corpus carries a symlinked-`node_modules` case** proving that check reports
  `unchecked` with the refused path rather than failing the site or crashing the run.
- **Outside-a-cairn-site is a predicate on the snapshot, not a check.** A directory with no
  `wrangler.jsonc`, no `wrangler.toml`, and no `@glw907/cairn-cms` entry in its `package.json`
  dependencies or devDependencies is not a cairn site (spec `:130-131`).
- **`internal/doctor` gains `Catalogue()`** returning its own operator-facing strings, and
  `cmd/copylist/main.go`'s `catalogues()` (`:50-66`) gains a fourth entry for it, in the same
  fixed package order the function already uses. Decision 5.
- The package's own doc comment follows Go Doc Comments and states what the package is: the
  record-less, credential-less directory preflight `cairn doctor` runs, distinct from `health`,
  which needs a site record.
- **Everything this task declares ahead of its caller is exported or has a test caller.**
  `tool/.golangci.yml` enables `unused` and `unparam`, so an unexported identifier or an unused
  parameter declared for a later task reds `lint` inside the gate on this task's own commit. The
  `Snapshot` fields Task 7 and Task 9 fill are exported, which satisfies `unused`; an unexported
  helper written ahead of its caller gets its test in the same commit or waits for the task that
  calls it.

### What is built

- `doc.go`: the package comment.
- `check.go`: the `Check` contract and the package's check registry (a literal slice, never
  populated by `init()`, the shape `health.All` uses at `internal/health/health.go:73-83`). Each
  entry declares **its id and its condition only**. **No label is written here**: a label is the
  condition's registry `title`, read at run time through Task 2's mirror accessor, and a label
  declared in this file would be the Go literal Tasks 5 through 7 are forbidden to write.
- `status.go`: the five statuses, their printed words, the constructors, and `Verdicts()`, which
  converts a run's results into a `spine.SiteVerdicts`.
- `snapshot.go`: the `Snapshot` type, one per run, carrying the resolved directory, each raw file
  body the checks read, and the three command-layer fields above (the resolved origin, the robots
  body or its typed absence, and the run instant). Fields are filled by later tasks; this task
  declares the type and the reader that fills the file bodies.
- `fileread.go`: the contained reader and the not-a-cairn-site predicate.

### Acceptance criteria

- **A read through a symlink leaving the directory is refused**, the spec's own acceptance bullet
  (`:403`). The test builds a real temporary tree, places a symlink inside it pointing at a file
  outside it, and asserts the read returns the refusal error naming the relative path. A test that
  only covers the textual `..` case does not satisfy this criterion; **both** arms are proven
  separately.
- A read of an absent file under the directory returns "absent", not an error.
- **The two error paths are proven**: a dangling symlink under `<dir>` reads as absent, and a
  permission-denied read of a file that does exist under `<dir>` is an error and not a containment
  refusal.
- **Containment is implemented with `filepath.Rel`**, asserted by a test over a boundary `/a/b`
  and a candidate `/a/bc`, which `strings.HasPrefix` would wrongly contain.
- The `Snapshot` declares the resolved origin, the robots body or its typed absence, and the run
  instant, and a test asserts no check function reads a clock or holds a client.
- **The status conversion is table-driven over all five statuses**, and asserts the contributed
  verdict for each: pass 0, fail-blocker 2, fail-warning 1, skip 0, info 0, unchecked 3. A sixth
  case asserts a run of only pass, skip, and info folds to `spine.VerdictOK`, which is the spec's
  "today's exit-0 runs stay exit 0" (`:170`).
- A run with zero checks folds to `spine.VerdictUnknown`, the outside-a-cairn-site exit.
- **The not-a-cairn-site predicate is proven on four fixtures**: a directory with a
  `wrangler.jsonc` and no `package.json`; one with a `package.json` naming `@glw907/cairn-cms` as a
  dependency and no wrangler file; one with it as a devDependency; and an empty directory, the only
  one of the four that is not a cairn site.
- A test asserts `spine.StateWord` is named nowhere in the package.
- `make -C <abs worktree>/tool copy-list` produces a golden carrying a `doctor` section,
  `tool/testdata/copy.golden.md` is committed **in its own commit**, and `make check`'s
  `check-copy` and `TestRenderMatchesCommittedGolden` are both green on it.
- The light gate is green: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C <abs worktree>/tool check'`.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the refusal
error's exact text for both containment arms; the conversion table as implemented, so the
conductor can compare it against decision 2 without reading the diff; where `Catalogue()` landed
and what it returned on the first run; anything the plan did not cover.

**Halt:** a second fix round; a red gate; a design that needs a check to perform its own I/O.

---

## Task 2: the conditions embed, its text accessor, and the drift-test replacement

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory.**

### Outcome

The condition registry's text reaches the tool from the committed mirror rather than from a regex
over TypeScript source, and a Go test asserts the typed constant set equals the embedded id set,
replacing `TestConditionsMatchRegistry`'s cross-repo read while keeping its ruling.

### Constraints

- **The embed lives in package `spine`, because `go:embed` cannot name a sibling directory**
  (finding 7). `tool/internal/spine/conditions.go` carries
  `//go:embed conditions.json` and the accessor; `tool/internal/doctor/siteconfigpath.go` carries
  `//go:embed site-config-path.json` and its own accessor. Neither package embeds the other's file.
- **The 25 typed `Condition` constants stay hand-written** (spec `:185-187`, which says 24 because
  it was written before its own pre-task added `config.media-bucket-missing`; finding 11). They are
  the frozen ids and compile-time checking is worth keeping. Nothing in this task generates a
  constant, and this task adds none: the count is 25 at HEAD and 25 when this task ends.
- **The replacement test asserts set equality between the constants and the embedded ids**, and
  **keeps the existing ruling verbatim in its comment**: an engine id rename is a human decision
  and a major-version event, never an automatic follow (spec `:187-189`;
  `tool/docs/reference/json-output.md:256-261` states the same rule to consumers).
- **No drift coverage is lost, and the plan says why so a reviewer does not re-derive it.** After
  this task two mechanisms chain: this test asserts constants equal the embedded ids, and the
  engine's `check:tool-conditions` (pre-task Task 2) asserts the embedded file equals what
  regeneration from `REGISTRY` produces. Transitively the constants still equal the registry. The
  pre-task plan's "Drift mechanisms" section names this pass as where the repoint lands.
- **`providers.RepoRoot()` leaves this test.** The old test walked up to the repository root to
  read `conditions.ts`; the new one reads an embedded file and needs no repository at all, which is
  also what lets `go install`ed binaries carry the text. A test asserts `condition_test.go` names
  `providers.RepoRoot` nowhere.
- The text accessor returns the mirror's seven fields for one `Condition`, and reports "not found"
  rather than panicking for an id the mirror does not carry. `logEvent` and `docsAnchor` are
  optional in the registry (`src/lib/diagnostics/conditions.ts:27,29`) and the mirror omits an
  entry's field rather than writing null, so the Go shape uses the zero value for each.
- The site-config path accessor applies **the four shape rules** of finding 4, ported from
  `packages/create-cairn-site/src/substitute.mjs:28-42`: non-empty string, no leading `/`, no NUL
  byte, no `..` segment. A bad shipped file is a build-time defect, so the accessor fails loudly on
  first use rather than degrading one check, the posture
  `src/lib/doctor/checks-local.ts:182-193` takes.

### Acceptance criteria

- The new set-equality test passes at HEAD and **fails on a mirror with a renamed id**, the spec's
  own acceptance bullet (`:402`). The implementer proves it: rename one id in a copy of the
  embedded file, run the test, record the nonzero exit and the message, restore, re-run green.
  Both outputs go in the report.
- The test also fails on a mirror carrying an id the constants do not, and on constants carrying an
  id the mirror does not: set equality, not containment, the same bar
  `TestConditionsMatchRegistry` held.
- `TestConditionsMatchRegistry`'s regex read of `src/lib/diagnostics/conditions.ts` is gone, its
  ruling comment survives in the replacement, and a test asserts the file names
  `providers.RepoRoot` nowhere.
- The text accessor is proven on three cases: a condition carrying every field, one carrying no
  `logEvent`, and an id the mirror does not hold.
- The site-config path accessor is proven on the committed value and on each of the four rejected
  shapes, one test case each.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the renamed-id red-then-green proof verbatim; the exact count of
ids in the embedded mirror and in the constant block, which must be 25 after the pre-task; whether
any registry field the mirror carries has no home in the Go shape; anything the plan did not cover.

**Halt:** a second fix round; a red gate; the mirror's id count disagreeing with the constants at
HEAD, which means the pre-task did not land as its plan describes.

---

## Task 3: the wrangler readers and the lifted corpus

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory.**

### Outcome

The tool reads `wrangler.jsonc` and `wrangler.toml` itself, shallowly, giving the same verdicts the
engine's reader gives, and the cases proving it are lifted from the doctor's own unit tests into a
corpus committed under `tool/` before retire-2 deletes them.

### Constraints

- **The stripped jsonc decodes into `map[string]any`, never into a struct.** `encoding/json`
  matches object keys to struct fields **case-insensitively**, and `JSON.parse` does not, so a
  `wrangler.jsonc` writing `Observability` or `VARS` would decode into a Go struct and be read as
  configuration the engine's reader ignores. Decoding to `map[string]any` and indexing with the
  exact key reproduces the engine's behaviour. **A mis-cased-key negative case joins the corpus**:
  a config whose only `observability` key is spelled `Observability` reads as no observability
  setting at all, the same verdict the engine gives.
- **`wrangler.jsonc` goes through an in-module JSONC stripper and `encoding/json`** (spec ruling 2,
  `:39-44`). The stripper is a port of `stripJsonc`
  (`src/lib/doctor/wrangler-config.ts:139-176`): `//` and `/* */` removed outside string literals,
  character by character so a URL inside a string survives, then trailing commas removed. Its
  accepted gap (a string containing `",}"` is mangled) is ported as-is and named in a comment.
- **`wrangler.toml` goes through a port of the shallow line-anchored read, never a TOML library**
  (spec ruling 2). The source is `factsFromToml`
  (`src/lib/doctor/wrangler-config.ts:213-282`), whose own comment says "not a TOML parser". A TOML
  library gives different verdicts on real sites and adds a direct require, which is why this is a
  halt condition and not a judgement call.
- **jsonc wins when both files exist, silently**, the behaviour `readWranglerConfig`
  (`wrangler-config.ts:56-64`) already has.
- The facts read are the ones the eleven checks need: the `EMAIL` `send_email` binding, the
  `AUTH_DB` `d1_databases` binding, `observability.enabled`, `vars.PUBLIC_ORIGIN`, and the
  `r2_buckets` binding names. **`authDbId`, `accountId`, `name`, and `workersDev` are not ported**:
  every check that reads one is deferred or dropped (spec `:60-64`), and porting a field nothing
  reads is surface with no caller.
- A `wrangler.jsonc` that exists but does not parse is an error carrying the clean message
  `wrangler.jsonc did not parse` and never the parser's own snippet, which would otherwise land
  verbatim in the report (`wrangler-config.ts:81-90`).
- **The corpus is committed under `tool/internal/doctor/testdata/corpus/`**, one case per file or
  one table file, and each case names the TypeScript test it was lifted from by `file:line` so a
  reader of either side can find the other. The sources are
  `src/tests/unit/doctor-checks-local.test.ts` and `src/tests/unit/doctor-checks-admin-mount.test.ts`;
  this task lifts the wrangler-config cases, and Tasks 5 and 6 lift the heuristic and floors cases
  into the same corpus.
- The corpus is data, read by table-driven Go tests. It is not a Go fixture package and it does not
  import anything from `internal/providers`.
- **The corpus gains a symlinked-`node_modules` case**, built by the test as a real temporary tree
  rather than committed (git cannot commit a symlink pointing outside the repository). The case is
  a `<dir>` whose `node_modules` is a symlink resolving outside `<dir>`, the pnpm and npm-workspace
  layout. Task 5's `config.dependency-floors` consumes it; this task commits the case's shape and
  the builder so Task 5 has it.

### Acceptance criteria

- **Every wrangler case in the corpus carries the engine's expected facts as committed data**, and
  the table-driven test asserts the Go reader's output equals that data, case by case. "The same
  facts the engine's reader produces" is not provable from inside the Go gate, which runs no Node:
  the engine's answer has to be lifted at authoring time and committed. Each case therefore carries
  three things, in the case file itself: the input, the `file:line` of the TypeScript test it came
  from, and the expected facts as literal JSON, copied from that test's own assertion. A case whose
  expectation was not lifted from a named TypeScript assertion does not satisfy this criterion.
- The jsonc-wins case is proven: a directory holding both files, where the two disagree, reads the
  jsonc.
- The stripper is proven on four cases: a `//` comment, a `/* */` comment spanning lines, a URL
  inside a string that must survive, and a trailing comma before `}`.
- **A mis-cased key is not read.** `"Observability": { "enabled": true }` produces no
  observability fact, the same as the engine, and a test names `map[string]any` as the reason.
- A present-but-unparseable `wrangler.jsonc` produces the clean message and no parser snippet.
- A directory with neither file reads as "no wrangler config", which the checks will report as a
  skip, not a failure.
- **No TOML library and no YAML library is in `go.mod` after this task.** `go mod tidy` is a no-op
  on the module's require blocks, proven by `tidy-check` inside the gate.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the corpus's case count and the `file:line` of each TypeScript test
it was lifted from; any engine behaviour the port could not reproduce, with the input that shows
it; anything the plan did not cover.

**Halt:** a second fix round; a red gate; a case the shallow reader cannot reproduce without a real
TOML parser, which is a finding for the conductor and never a licence to take one.

---

## Task 4: YAML promoted to a direct require

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory.**

### Outcome

The module takes YAML as a fifth direct require, promoted rather than added, with the ADR and the
dependency test moved in the same commit, and `site.config.yaml` parses through it.

### Constraints

- **The library is `go.yaml.in/yaml/v3`, already an indirect require at `v3.0.4`** (finding 14),
  pulled in by `github.com/spf13/cobra/doc` through `cmd/mangen`. Promoting it adds **no module to
  the build graph**, the same shape `displaywidth` took at ADR-0002's segment-3 amendment
  (`tool/docs/adr/0002-render-dependencies.md:53-56`). **Do not `go get` a different YAML
  library**; a second one is a decision, not an import, and it is a halt.
- **`tool/docs/adr/0002-render-dependencies.md` is amended, not rewritten.** The amendment records
  what was taken, why it was a promotion rather than a choice, and that it belongs to the module
  rather than to `internal/render`, which is why it joins `otherDirectRequires` and not
  `renderDirectRequires`. The ADR's Status line gains this pass's own amendment note beside the
  three already there (`:5-9`).
- **`internal/render/purity_test.go`'s `otherDirectRequires` moves from 4 to 5** (`:181`), and its
  doc comment gains the fifth member by name. `renderDirectRequires` (`:170-175`) is **not**
  touched: YAML is not a render dependency, and adding it there would make
  `TestRenderDirectRequiresArePinned` (`:186-215`) assert something false about `render`.
- **This task owns the site-config parser; Task 5 owns the check.** `config.site-config` is one
  check across two tasks, so the split is stated rather than inferred. **Task 4 builds
  `siteconfig.go`**: candidate-path resolution, the YAML parse, and the found / not-found /
  parses / does-not-parse / mapping-with-a-non-empty-`siteName` predicate, with its own tests.
  **Task 5 builds `check_siteconfig.go`**: the `Check` entry, the condition id, the label, the
  `detail` sentence, and the mapping of the parser's outcomes onto the status words. No status
  word is written in this task and no parsing is written in Task 5.
- **The parse is what `config.site-config` asserts and no more** (spec `:149-155`): the file is
  found at one of the four known paths, it parses as YAML, and its root is a mapping carrying a
  non-empty `siteName`. **No other site-config field is read by any ported check.** This is
  narrower than the engine's `parseSiteConfig`, so it will pass files the doctor failed, a stale
  Contract v2 `content:` block among them. The narrowing is deliberate, it is stated on the
  command's docs page in Task 9, and the close files its ledger entry.
- The candidate path list is the four of "Verified facts", in order, with the first entry read from
  Task 2's embedded `site-config-path.json` rather than written as a literal.

### Acceptance criteria

- `tool/go.mod` carries `go.yaml.in/yaml/v3` in the direct require block and not in the indirect
  block, and `tidy-check` inside the gate is green, which is the proof the import is real.
- **The module's direct require count is nine, proven by `TestRenderDirectRequiresArePinned`
  passing with `otherDirectRequires` at 5.** The implementer falsifies it once: leave the integer
  at 4, confirm the test names the count, restore it. Both outputs go in the report.
- No module joined the build graph: `go.sum` gains no new module path, proven by
  `git diff --stat tool/go.sum` showing only the promotion's own line movement, and the implementer
  pastes the diff summary.
- The parser is proven on five cases: the showcase's own committed `site.config.yaml`; a file at
  each of the three legacy paths; a file that is not YAML; a file whose root is a sequence rather
  than a mapping; and a file with an empty `siteName`. The last three do not satisfy the
  predicate, the first two do. **The parser reports outcomes, not statuses**; Task 5 maps them.
- A directory with no site config at any of the four paths makes the parser report "not found",
  which Task 5 maps to `unchecked` (`checks-local.ts:225-227`).
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the `go.sum` diff summary; the falsification output for the require
count; the ADR amendment's own text; anything the plan did not cover.

**Halt:** a second fix round; a red gate; `go mod tidy` wanting any module other than the promoted
YAML library.

---

## Task 5: the five config checks

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory. Five deliverables.**

### Outcome

Five of the eight file-only checks are implemented as pure functions over the snapshot, each
raising the condition id the engine's own check raises and carrying the label that equals its
registry `title`.

### What is built

| Check id | Condition | Source |
| --- | --- | --- |
| `config.bindings` | `config.bindings-missing` | `src/lib/doctor/checks-local.ts:23-36` |
| `config.observability` | `config.observability-off` | `checks-local.ts:60-72` |
| `config.public-origin` | `config.public-origin-invalid` | `checks-local.ts:129-152` |
| `config.site-config` | `config.site-config-invalid` | `checks-local.ts:219-238`. **The check only**: Task 4 owns the parser (`siteconfig.go`) and this task owns the status arms (`check_siteconfig.go`), per Task 4's ownership constraint. |
| `config.dependency-floors` | `config.dependency-floors-unmet` | `src/lib/doctor/check-floors.ts:250-267` |

### Constraints

- **Each check's printed label equals its condition's registry `title`** (spec `:171-172`), read
  from Task 2's accessor, never written as a Go literal. `docs/admin/is-it-working.md`'s
  label-to-section table relies on it.
- **`config.public-origin` reuses `requireOrigin`'s three rules exactly**
  (`src/lib/env.ts:43-66`): unset, unparseable, and non-https off `localhost` or `127.0.0.1`,
  matched exactly. The precedence is the wrangler vars first, then the environment
  (`checks-local.ts:134-138`), and the pass line names which source it read.
- **`config.dependency-floors` hand-rolls the version arithmetic; no semver library** (spec
  `:159-164`). The port is `parseVersion` (plain `x.y.z` only, a prerelease or build tag returns
  nothing and the dependency skips), `caretFloor` (the `^x`, `^x.y`, `^x.y.z` forms only), and
  `compareVersions` (`check-floors.ts:22-39`, finding 5), plus the three per-format resolvers and
  the optional-peer filter of finding 6.
- **The lockfile order is npm, pnpm, yarn, the doctor's own** (`check-floors.ts:259-265`): the
  first recognized lockfile that exists is the one judged, and only when none of the three exists
  is the result `unchecked`.
- **The engine's peers are read from `node_modules/@glw907/cairn-cms/package.json` as a plain
  file** (spec `:162-164`), with the `peerDependenciesMeta` optional filter of finding 6. A
  hoisted monorepo layout that path misses reports `unknown`, which is `unchecked` in this
  package's vocabulary and exit 3.
- **The pnpm resolver strips the peer-dependency suffix** (`check-floors.ts:130-140`): both the
  bare-string and `{version}` shapes can carry `"5.56.10(vite@6.0.0)"`, and the plain semver is
  everything before the parenthesis. Both lockfile generations are read: `importers['.']` first,
  then the legacy top-level maps.
- **The yarn resolver is the heuristic text read, classic and Berry** (`check-floors.ts:195-215`),
  not a grammar. It returns nothing when no block's specifier list names the dependency.
- Each check's `detail` sentence is ported from the engine's, is an operator-facing string, and
  therefore reaches `Catalogue()` and the regenerated `tool/testdata/copy.golden.md`.
- The floors cases join Task 3's corpus, lifted from
  `src/tests/unit/doctor-check-floors.test.ts` with the `file:line` of each.

### Acceptance criteria

- Each of the five checks is proven on the corpus, one table-driven test per check, with at least
  the pass, the fail, and the skip or unchecked arm each check can produce.
- Each check's label is asserted equal to its condition's registry `title` from the embedded
  mirror, in one test over all five, so a label written as a literal fails.
- **`config.site-config`'s status arms are proven over Task 4's parser**: a found, parsing config
  with a non-empty `siteName` passes; a config that does not parse, has a non-mapping root, or
  carries an empty `siteName` fails with `config.site-config-invalid`; no config at any of the
  four paths is `unchecked`. This task writes no parsing of its own.
- `requireOrigin`'s three rules are proven case by case, including that `localhost.example.com`
  over http fails while `localhost` over http passes.
- `config.dependency-floors` is proven on all three lockfile formats, on a prerelease version
  (skip), on a non-caret engine range (skip), on a below-floor version (fail), on an
  outside-major version (fail), on an absent `node_modules/@glw907/cairn-cms/package.json`
  (unchecked), **on Task 3's symlinked-`node_modules` case, where the containment refusal reports
  `unchecked` naming the refused relative path rather than failing the site or crashing the run**,
  and **on an engine peer marked optional in `peerDependenciesMeta`, which must be
  filtered out rather than skipped**. That last case is finding 6's whole point and a test that
  omits it does not satisfy this criterion.
- `tool/testdata/copy.golden.md` is regenerated with `make -C <abs worktree>/tool copy-list` and
  committed in this task's own commit.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the five labels as resolved from the mirror; every corpus case that
disagrees with the engine's own result, with the input; the optional-peer test's assertion; anything
the plan did not cover.

**Halt:** a second fix round; a red gate; a check needing an input the snapshot does not carry.

---

## Task 6: the three heuristic checks

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory. Three deliverables.**

### Outcome

The three checks that read source text heuristically are implemented against the corpus, with the
four engine symbols they key on named in each check's own doc comment so retire-2's
`check:tool-heuristics` has an anchor.

### What is built

| Check id | Condition | Source |
| --- | --- | --- |
| `config.csrf-disable` | `config.csrf-disable-missing` | `checks-local.ts:94-127` |
| `config.no-referrer-blanket` | `config.no-referrer-blanket` | `checks-local.ts:638-660` |
| `admin.mount-shape` | `admin.mount-incomplete` | `checks-local.ts:376-388` |

### Constraints

- **Every helper of "Verified facts" ports, and each keeps its engine comment's reasoning in Go
  Doc Comment form.** The reasoning is what makes each heuristic's known gap deliberate rather than
  a defect: a commented-out `checkOrigin: false` never green-lights the handoff
  (`checks-local.ts:74-84`); a comment line interleaved inside a `_headers` block must not split it
  (`:480-486`); a `Referrer-Policy` fallback list is judged on its last token
  (`:519-523`); a six-line window above a `no-referrer` write is scanned for route scoping
  (`:574-579`).
- **`admin.mount-shape` never returns a failure.** It returns `info` with guidance when it cannot
  see enough and `pass` when both signals are present, the stance `checks-local.ts:370-375` states:
  a fail is a hard deploy gate, and a warning-severity heuristic that could not see an
  unconventionally wired site must never go falsely red. Under decision 2's table an `info`
  contributes exit 0, so the ported check cannot turn a clean site red either.
- **`config.csrf-disable`'s pair is the check.** A disable found with no cairn guard in the hooks
  is a failure naming the risk, and neither config file existing is `unchecked`, never a silent
  skip (`checks-local.ts:99-122`).
- **The four symbols are named in doc comments, verbatim**: `CairnAdminShell`, `.shellLoad`,
  `createAuthGuard`, and `checkOrigin: false`. retire-2 adds the engine-side tripwire that fails
  when any of them disappears from `src/lib`, and it will look for them here.
- The corpus gains these checks' cases, lifted from
  `src/tests/unit/doctor-checks-local.test.ts` and
  `src/tests/unit/doctor-checks-admin-mount.test.ts` with each `file:line`.
- Go's regexp package is RE2 and rejects some constructs a JavaScript regex accepts. Where a ported
  pattern cannot be written as RE2, the check uses plain string scanning that produces the same
  verdicts on the corpus, and the implementer reports which patterns needed it and why.

### Acceptance criteria

- Each of the three checks is proven on the corpus, one table-driven test per check, covering every
  status that check can return.
- The four named gap cases are each proven by a test that fails without the guard: a commented-out
  disable, an interleaved comment in a `_headers` block, a `no-referrer` that is not the last token
  of a fallback list, and a route-scoped `no-referrer` write within the six-line window.
- `admin.mount-shape` returns no failure on any corpus input, asserted as a property over the whole
  corpus rather than case by case.
- A test asserts each of the four engine symbols appears in the package's doc comments.
- `tool/testdata/copy.golden.md` is regenerated and committed in this task's own commit.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; every pattern that could not be written as RE2 and what replaced
it; every corpus case where the Go verdict differs from the engine's, with the input; anything the
plan did not cover.

**Halt:** a second fix round; a red gate; a heuristic that cannot reach the engine's verdict on a
corpus case without reading a file the snapshot does not carry.

---

## Task 7: the three facts-dependent checks

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory. Three deliverables plus the facts reader.**

### Outcome

The three checks whose deciding input comes from the site's TypeScript adapter read it from the
committed `src/content/.cairn/site-facts.json`, and report `unknown` with a named reason when that
file is absent.

### What is built

| Check id | Condition | Source | Facts field |
| --- | --- | --- | --- |
| `config.media-bucket` | `config.media-bucket-missing` | `checks-local.ts:42-58` | `mediaBucketBinding` |
| `auth.role-wiring` | `auth.role-wiring-missing` | `checks-local.ts:430-462` | `roles` |
| `ai.posture-effective` | `ai.posture-not-effective` | `src/lib/doctor/check-posture.ts:45-73` | `aiPosture` |

### Constraints

- **The facts file is read under the same containment as every other file** and is parsed with
  `encoding/json`, rejecting a `version` other than 1 with a clear message rather than guessing.
- **An absent `site-facts.json` makes all three report `unknown` with
  `spine.ReasonNotObservable` and the message "needs engine 0.97.0 or later, and one build"**
  (spec `:145-147`), which is exit 3. **No new reason code is added**; `json-output.md:225-251`
  freezes the vocabulary and `ReasonNotObservable` already exists
  (`internal/spine/outcome.go:65`).
- **`config.media-bucket` raises `config.media-bucket-missing`, its own id**, and prints that
  condition's own remediation. The borrow the engine still carries
  (`checks-local.ts:38-41,44`) is the defect the pre-task closed; this check must not reproduce it.
- **`auth.role-wiring` filters the default pair before deciding.** `customRoleNames`
  (`checks-local.ts:409-412`) drops every role in `DEFAULT_ROLES`, and a site with no custom role
  skips outright: the guard's fallback already matches the vocabulary. `guardRoleWiring`
  (`:421-428`) has four outcomes and only `unwired` fails; `absent` and `indirect` report `info`,
  so a wrapped or dynamically built guard is never a false red.
- **`ai.posture-effective` makes the one network request in this whole command**, a
  credential-free GET of `/robots.txt` (`check-posture.ts:45-73`). Its origin precedence is the
  wrangler config's `vars.PUBLIC_ORIGIN` first, then the environment, the same precedence
  `config.public-origin` uses (`check-posture.ts:50-52`). **No origin, an origin that does not
  parse, and an origin that does not answer are all `unknown` with `ReasonNotObservable`** (spec
  `:156-158`), which narrows the engine's `skip` so an offline run's exit code says the check did
  not observe rather than that it did not apply.
- The robots parse ports `parseRobots` (`check-posture.ts:93-132`) whole, including that
  consecutive `User-agent` lines share one rule set and that product tokens match
  case-insensitively per RFC 9309 section 2.2.1, and `observedPosture` (`:140-143`),
  `describeOutsideLayer` (`:154-176`), and `evaluate` (`:187-219`). The one failing case is a
  declared posture the served file does not carry; a site declaring nothing passes.
- **The GET happens in the command layer and fills Task 1's snapshot field; the check itself stays
  pure.** The check reads the robots body or its typed absence from the snapshot and never dials.
  That is what keeps Task 1's "no I/O, no client, no clock" contract true of all eleven checks.
- **The request's policy is stated here, not left to the client's defaults.** It does not use
  `internal/providers`: those clients carry credentials and a host pin this command has no use
  for. It is a bare `http.Client` configured with all of:
  - **`CheckRedirect: http.ErrUseLastResponse`**, matching `providers/transport.go:44-47`. A
    redirect is returned unfollowed, so a site redirecting `/robots.txt` to a third party cannot
    make the tool fetch that third party, and the non-200 arm reports `unknown`.
  - **`http`  and `https` schemes only**, checked on the resolved origin before the request is
    built. Any other scheme is `unknown` with `ReasonNotObservable`, the same arm as an origin
    that does not parse.
  - **An `io.LimitReader` body cap** (64 KiB is ample for a `robots.txt`), so a site serving an
    endless body cannot exhaust the process. A body hitting the cap is parsed as far as it read.
  - **No `Authorization` header, no cookie, and no cookie jar.** The request is credential-free by
    construction, which is the spec's own condition on the one network call this command makes.
  - The timeout is the command's context, which the root's `--timeout` already carries
    (`root.go:118-123`), and nothing else.

  **One test each**: a redirect is not followed; a `file://` origin is `unknown`; an oversized body
  is truncated rather than exhausting the read; and the outgoing request carries no `Authorization`
  header and no cookie. The implementer states in its report which HTTP client it used and how the
  timeout reaches it.

### Acceptance criteria

- Each of the three checks is proven on fixtures covering every status it can return.
- **All three report `unknown` with `ReasonNotObservable` and the exact message against a directory
  with no `site-facts.json`,** asserted in one test over all three, and
  `spine.ExitCode([]spine.SiteVerdicts{verdicts}, nil, 0)` over the package's own verdicts for that
  directory returns `spine.VerdictUnknown`. The assertion is over the package's verdicts, not over
  a process exit code: no command exists until Task 8, and Task 8's own criteria prove the process
  code end to end.
- A `site-facts.json` carrying a `version` other than 1 fails with a message naming the file and
  the version found.
- `config.media-bucket` skips when the facts declare no `mediaBucketBinding`, passes when the
  wrangler `r2_buckets` carry the declared binding, and fails with **its own** remediation text
  when they do not. A test asserts the printed remediation is
  `config.media-bucket-missing`'s and not `config.bindings-missing`'s.
- `auth.role-wiring` is proven on all four `guardRoleWiring` outcomes plus the no-custom-roles
  skip, five cases.
- `ai.posture-effective` is proven against a stub HTTP server on: a declared posture the file
  carries (pass), a declared posture it does not (fail), no declared posture and no directives
  (pass), two `User-agent: *` groups (the managed-layer note), a foreign `Content-Signal`, a
  non-200 response, an unreachable origin, and no origin at all. The last three are `unknown`.
- `tool/testdata/copy.golden.md` is regenerated and committed in this task's own commit.
- The light gate is green, and `vulncheck` in particular stays green with the new HTTP call.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the HTTP client and how the timeout reaches it; the absent-facts
message verbatim; the media-bucket remediation text as printed; anything the plan did not cover.

**Halt:** a second fix round; a red gate; a check needing a credential; a design that reaches
`internal/providers`.

---

## Task 8: the command, the report, the goldens, and the help

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **`go-conventions` is
mandatory, and `golang-spf13-cobra` is mandatory for every file under `tool/cmd/cairn`.**

### Outcome

`cairn doctor [<dir>]` exists in the cobra tree, runs the eleven checks against a directory, prints
the plain text report, exits on the Nagios code, and is discoverable through `--help`, the man
page, and `cairn help agents`.

### Constraints

- **The grammar is `cairn doctor [<dir>]`, the directory defaulting to the working directory**
  (spec `:121`). At most one positional argument; two is a usage error, the shape
  `newHealthCmd`'s own `Args` validator uses (`cmd/cairn/health.go:49-54`).
- **`groupSite`, and directory completion, never `completeSiteIDs`** (decision 4).
- **`--json` is a local flag on this command**, as it is on `health`, `sites list`, `logs`, and
  `adopt list`; it is not a root persistent flag (`root.go:200-207` carries no `--json`).
- **`--quiet` is honoured and `--color`, `--theme`, and `--width` are not** (decision 3). The
  command queries no terminal. `--quiet` suppresses the whole report on an OK run and nothing
  else, the rule `quietSuppressesFrame` (`health.go:164-166`) states; `--json` beats `--quiet`,
  which `json-output.md:12-14` freezes.
- **The exit code is `spine.ExitCode([]spine.SiteVerdicts{verdicts}, nil, 0)`** and it reaches the
  process through `d.exit`, the path every reporting command uses
  (`health.go:122`), so the scrubber's flush rides it.
- **Outside a cairn site the command prints one line and exits 3** (spec `:130-131`). Without
  `--json` that line goes to stdout, since it is the run's body. **Under `--json` a payload is
  still written**, carrying `verdict: "UNKNOWN"`, `exitCode: 3`, and an empty `checks` array:
  `json-output.md:12-14` and `exit-codes.md:90-93` freeze "empty stdout means the invocation was
  wrong", so writing nothing would make a valid run indistinguishable from a usage error. Task 9
  builds the payload; this task builds the predicate and the one line.
- **The report is the plain shape of `src/lib/doctor/report.ts:22-40`**, written in
  `internal/doctor`: one `STATUS  Label: detail` line per check, then a block per failure carrying
  the title, the why, the remediation, and the docs URL, then the count summary. No ANSI, so a
  terminal and a CI log read the same.
- **The docs URL is `https://cairn.pub/docs/admin/<basename without .md>#<fragment>`**, built from
  the mirror's `docsAnchor` (decision 6). A condition carrying no `docsAnchor` prints no URL line
  rather than a broken one.
- **`cmd/cairn/doctor.go` stays under 300 lines**, `root_test.go:433`'s
  `TestNoCommandFileExceedsItsBound`. A second file is the answer if it does not, the way
  `health_json.go` was split out (`health_json.go:1-3`).
- **Every operator-facing string this command adds goes in `cmd/cairn/messages.go`**, which
  `cmd/copylist` parses (`cairnCatalogue`, `cmd/copylist/main.go:73`; `:68-72` is its doc
  comment), and the check details stay in
  `internal/doctor`'s own `Catalogue()`.
- **`cairn help agents` gains the command** (spec `:213`): what it does, that it needs no
  credential and no adopted site, what exit 3 covers, and that `cairn health` is what reaches the
  https and email checks after adoption. `agentsPage` is a constant in `messages.go`
  (`help_agents.go:16`), so the addition is copy and is gated by `check-copy`.
- **The man page needs no committed file** (finding 19). `make -C <abs worktree>/tool man` is run
  once and its output inspected; nothing under `man/` is committed.

### Acceptance criteria

- **The four exit codes are proven by test** (spec `:399-400`): a blocker failure exits 2, a
  warning failure 1, an `unchecked` result with no failure 3, a clean run 0. Each runs the real
  command tree over a fixture directory through `cmd.SetArgs`, not a unit call into the package.
- **Outside a cairn site the command prints one line and exits 3**, and a fifth test asserts the
  line's text and that exactly one line reached stdout.
- A usage error (a second positional argument, an unknown flag) exits 3 with byte-empty stdout,
  the frozen rule of finding 1, asserted for this command specifically.
- `--quiet` on a clean run writes nothing at all, and on a failing run writes the whole report.
- **Text-report goldens** (spec `:214`) under `tool/internal/doctor/testdata/golden/`, at least: an
  all-clean run, a run with one blocker failure, a run with one warning failure, a run with an
  `unchecked` result, and a run with every status present. A golden carries the failure block
  including the docs URL.
- `TestEveryActionCoverage` (`coverage_test.go:49`), `TestEveryNonHiddenRootCommandDeclaresAGroup`,
  `TestEveryCommandCarriesAnExample`, `TestNoCommandFileExceedsItsBound`, and
  `TestTerminalChecksAreConfinedToTheColourProfile` are all green with the new command, each
  updated where it pins a list.
- `make -C <abs worktree>/tool man` succeeds and the generated `cairn-doctor.1` names the command,
  its argument, and its flags. The implementer pastes the page's synopsis line.
- `cairn help agents` names the command, and `tool/testdata/copy.golden.md` is regenerated and
  committed in this task's own commit.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the five exit-code test results; the outside-a-cairn-site line
verbatim; the man page's synopsis line; whether `doctor.go` needed a split and what went in the
second file; anything the plan did not cover.

**Halt:** a second fix round; a red gate; a structural test in `cmd/cairn` that cannot be satisfied
without changing a frozen surface.

---

## Task 9: the JSON payload, the seventh schema, and the frozen surfaces

**Runs as:** `cairn-implementer` chain, **`model: opus`**, test-first. This is the task that
touches surfaces frozen at `tool/v1.0.0`, which is why it is upshifted. **`go-conventions` is
mandatory, and `golang-spf13-cobra` for `tool/cmd/cairn`.**

### Outcome

`cairn doctor --json` writes its own payload kind, validated against a seventh published schema,
with `json-output.md` and `exit-codes.md` amended in the one way the freeze allows and the command's
interim docs page written under `tool/docs/reference/`.

### Constraints

- **The payload is its own kind** (spec ruling 9, `:65-66`), not a `site` payload with different
  checks. It carries `schemaVersion`, `kind`, `verdict`, `exitCode`, the resolved directory, the
  stamped instant, and `checks`, each check carrying `checkId`, `state`, `reason` where the state
  is `skip` or `unknown`, `condition`, `detail`, the doctor-only `note` where the status is `info`,
  and the failure's `fix` where one exists. It carries no
  `site`, no `domain`, no `tier`, no `acknowledged`, and no `hold`: a directory preflight has no
  registry record, no credential tier, and no holds.
- **`schemaVersion` is 1.** `json_schema_test.go:399-425`'s
  `TestEverySchemaVersionIsOneBeforeTheTag` gains a seventh row. Its doc comment reasons from the
  pre-tag window; the comment gains one sentence saying a payload published after `tool/v1.0.0`
  also starts at 1, since no consumer read an earlier form of **that** payload.
- **The schema file is `tool/docs/reference/cairn-doctor.schema.json`** (finding 16), in the shape
  the six share: `$schema` 2020-12, `$id` `https://cairn.pub/schema/cairn-doctor.schema.json`,
  `additionalProperties: false` throughout, a `schemaVersion` `const`, the four-word `verdict`
  enum, the `[0,1,2,3]` `exitCode` enum, and a conditional requiring a `reason` on an `unknown`
  state, the shape `cairn-health.schema.json` gained on 2026-09-21
  (`json_schema_test.go:574-608`). **Exactly one schema file is added and no other page under
  `tool/docs/reference/` is created** (finding 21).
- **`json-output.md` is amended in four places and nowhere else.** The lede's schema list
  (`:6-7`) names the seventh. "The six payloads" (`:16`) becomes seven, with a `cairn doctor --json`
  row. **A new section, heading `## The doctor payload`,** describes the kind and its keys. And in
  `## What freezes at 1.0` (`:279-296`), the check-id bullet (`:287-288`) gains a scoped
  sub-bullet naming the eleven `cairn doctor` check ids, **and the freeze sentence is amended**
  (spec `:180-181`): adding a check id to a published list is a minor-version event, and renaming
  or removing one is major. Nothing else on the page is rewritten.
- **`exit-codes.md` gains one short section, `## cairn doctor`,** stating that the command makes at
  most one request (the posture GET) so it has no row in the requests-per-check table, that it
  reads no credential and no registry, and that exit 3 covers a usage error, a run whose only
  non-passing results are `unknown`, and a directory that is not a cairn site. **The four codes,
  the precedence rule, and the usage-error rule are not touched.**
- **The tests that pin those lists move with the pages** (spec `:181`):
  `TestDocNamesEveryFieldTheGoldensCarry` (`json_schema_test.go:472`) picks up the doctor golden's
  keys automatically once the golden joins `jsonGoldens`; `TestDocCarriesBothFreezeLists` (`:514`)
  gains a loop asserting the frozen section names all eleven doctor check ids, read from the
  `doctor` package's own registry rather than a literal list; `TestEveryGoldenValidatesAgainstItsSchema`
  (`:196`) validates the doctor golden against the seventh schema. **That freeze-list loop is
  `render`'s only reach into `doctor`, and it is a test-file import.** A test import does not enter
  the package's production graph and does not touch `renderDirectRequires`, which reads go.mod's
  module-level requires, so decision 9's boundary holds.
- **The marshaller lives in `internal/doctor`, and `internal/render` gains only
  `DoctorSchemaVersion`** (decision 9). `purity_test.go:224-246`'s `exportedSurface` gains that one
  name in the same commit (finding 15). **`render` does not import `internal/doctor`**: the posture
  check pulls `net/http` into that package's transitive graph, and `render`'s whole contract is
  purity with its direct requires pinned by name. The schema test stays in `render`, where
  `schemaDir` already resolves and the other six goldens live; it reads the doctor golden as a
  file, not through a `doctor` import.
- **The wire `state` is decision 8's table, and no state word and no reason code is added** (spec
  `:177-178`). The payload writes only the frozen five (`json-output.md:290`); a doctor `info` is
  written `state: pass` with its text in the doctor-only `note` key; a doctor `skip` is
  `state: skip` with `reason.not-run`; an `unchecked` is `state: unknown` with
  `reason.not-observable`. `held` is never written. **The schema requires a `reason` on every
  `skip` and every `unknown`** (`cairn-health.schema.json:38-39`; `json-output.md:225`), so the
  seventh schema's conditional covers both states and the golden exercises both arms.
  **`json-output.md`'s doctor section states in one sentence that for `cairn doctor`
  `reason.not-run` means the check's precondition did not apply**, which widens that code's
  meaning without widening the vocabulary; `TestDocPublishesTheWholeReasonVocabulary` (`:551`)
  stays green because the set is unchanged.
- **`tool/docs/reference/cli-cairn-doctor.md`** is written as **interim operator copy**, since
  draft docs pass A drafts the public page fresh from a mining read and never renames this one into
  place (spec `:375-378`; pass A plan `:57-59`). It states the synopsis, the flags and which root
  flags have no effect, what the command reads, each of the eleven check ids and what it observes,
  the exit codes with the three-case exit-3 collision of decision 1, the `config.site-config`
  narrowing of Task 4, the engine-version note (the three facts checks need engine `0.97.0` or
  later and one build), and that `cairn adopt` then `cairn health` is what reaches the https and
  email checks.
- **`tool/CHANGELOG.md` gains the entry** (spec `:214-215`). It goes under a new `## Unreleased`
  heading, not under `1.0.0`, which is released history. The number is set at the tag session, not
  here. **The entry carries a `Consumers must:`-style note naming the loosened promise**, since
  this task rewrites a sentence inside `## What freezes at 1.0`: before it, a check-id list was
  frozen outright; after it, an addition to a published id list is a minor-version event and only
  a rename or a removal is major. A consumer who wrote a reader against the stricter promise needs
  that stated in the release's own text, not only on the page whose promise changed. The note also
  names the doctor's use of `reason.not-run` for a precondition that did not apply.
- **The docs URL resolution is a carry-forward, not a task.** Before the `tool/v1.1.0` tag, the
  conductor of that session confirms each distinct `https://cairn.pub/docs/admin/<page>` the
  failure blocks print resolves on the deployed cairn.pub; if one does not, the tool prints the
  anchor text without a URL and a `v1.1.x` patch adds the link after the pin bump (spec
  `:191-195`). Task 11 writes that carry-forward into STATUS.

### Acceptance criteria

- **A golden JSON payload validates against the committed schema** (spec `:401`), asserted by
  `TestEveryGoldenValidatesAgainstItsSchema` over `tool/internal/render/testdata/json/doctor.json`.
- The golden covers every status the payload can carry, so the schema's conditional is exercised in
  both arms.
- **`json-output.md` publishes the eleven ids** (spec `:401`), asserted by the new loop in
  `TestDocCarriesBothFreezeLists` reading the ids from code. The implementer falsifies it once:
  remove one id from the page, confirm the test names it, restore.
- `TestDocNamesEveryFieldTheGoldensCarry` is green, which is the proof every key in the doctor
  payload is documented on the page.
- `TestEverySchemaVersionIsOneBeforeTheTag` passes with seven rows.
- `TestExportedSurfaceIsPinned` passes with the one addition, `DoctorSchemaVersion`, and the
  implementer falsifies it once by omitting it.
- **The command's page names every check id.** A page-coverage test, in `tool/cmd/cairn` or
  `tool/internal/doctor`, reads `tool/docs/reference/cli-cairn-doctor.md` and asserts it names all
  eleven check ids, read from the `doctor` package's own registry rather than a literal list. The
  pass A inventory record (`:74-75`) promises pass A this test exists and names where it landed,
  because it is the one new test whose only input is the interim page, so pass A's task 8 must
  repoint or retire it when the page moves.
- `cairn doctor --json` on a directory that is not a cairn site writes a parseable payload with
  `verdict: "UNKNOWN"`, `exitCode: 3`, and `checks: []`, and exits 3. Stdout is not empty.
- `cairn doctor --json --quiet` writes the payload, and `cairn doctor --json --verbose` writes
  nothing to stderr on a successful run, the two rules `json-output.md:12-14` freezes.
- **`tool/docs/reference/` holds exactly seven `*.schema.json` files and four markdown pages after
  this task** (finding 21), asserted by the implementer with `git ls-tree` and pasted in its
  report. Pass A's precondition 4 reads that inventory.
- The light gate is green.

### The implementer reports

Files touched; **every commit's SHA and subject line, in order**; the gate result; the `git ls-tree`
listing of `tool/docs/reference/`; the two falsification outputs; the exact four edits made to
`json-output.md` and the one to `exit-codes.md`, quoted, so the conductor can confirm no frozen
sentence moved without reading the diff; **where the page-coverage test landed**, which the pass A
inventory record names; **whether the seventh schema's `skip`/`unknown` conditional extended
`TestSkipAndUnknownRequireAReason` (`json_schema_test.go:574`) or was written as a sibling test,
and which**, which the pass A inventory record (`:64`) asks for; anything the plan did not cover.

**Halt:** a second fix round; a red gate; any need to change an exit code, a state word, a reason
code, a `schemaVersion`, or a `$id`; a `diff-reviewer` finding that a frozen sentence was rewritten
rather than extended.

---

## Task 10: the agreement study

**Runs as:** a conductor dispatch, **`model: opus`**, read-and-measure. Not an implementer chain:
it builds two binaries, runs them against six trees, and writes one committed table. One
`diff-reviewer` read over its commit.

### Outcome

The spec's own retire-1 acceptance (`:392-398`) is satisfied by evidence: a committed table saying,
per check and per site tree, what each implementation reported and whether any disagreement is
expected or a defect.

### Constraints

- **The eight file-only checks are compared on each of the four production site trees as they
  stand** (spec `:392-394`). `cairn doctor --json` from this worktree's build, against the doctor
  built from `main`.
- **`config.site-config` compares on found-and-parses only** (spec `:394-395`), since Task 4
  narrowed it deliberately. A Contract v2 disagreement is expected, not a defect.
- **The three facts checks are compared on the showcase and on one production site linked to
  `main` with `npm run link:consumer`, restored afterwards** (spec `:396-398`): a site that
  declares media, custom roles, and an AI posture. **Against a site with no `site-facts.json` they
  report `unknown`**, which is the third arm of this criterion.
- **The linked site is modified, deliberately, and restored before the task ends.** Three steps,
  in order, and none is optional:
  1. `npm run link:consumer -- <site-dir>` points the site at this worktree's engine.
  2. **`npx cairn-manifest` is run in that site.** The pre-task's Task 3 has the `cairn-manifest`
     bin *write* `src/content/.cairn/site-facts.json` and the Vite plugin only *verify* it, so a
     freshly linked site has no facts file and all three checks would report `unknown` for the
     wrong reason, measuring nothing. Without this step the comparison's whole point is lost.
  3. `npm run link:consumer -- <site-dir> --restore` puts the site back on `^<version>` from the
     registry. Mandatory, and its output goes in the report: a `file:` path cannot merge
     (`CLAUDE.md`, "Pointing a consumer at unreleased engine work"). The generated
     `site-facts.json` is left or removed to match that site's own git status before the link,
     which the report states.

  The other five trees (the four production trees for the eight file-only checks, and the
  no-facts tree) are **read and never modified**.
- **One disagreement is pre-declared expected before the study runs**: a blocker-severity failure
  exits 2 under `cairn doctor` and 1 under `cairn-doctor`, because `run.ts:43-47`'s `exitCodeFor`
  gives every failure 1 while spine's four-code convention distinguishes CRITICAL from WARNING
  (finding 2). The table records it as expected wherever it appears, and it is never a defect.
- **The table is committed at `tool/testdata/doctor-agreement.md`** (spec `:394`, "a status
  mapping table committed in `tool/testdata/`"). It is a record, not a gate: no Go test reads it,
  and the table says so in its own header so a later reader does not look for one.
- **Zero disagreements are unexplained.** Each is recorded as expected, with the reason, or as a
  defect, with the input that shows it. A defect goes back to the task that owns the check as one
  re-dispatch; a second defect in the same check is the conductor's decision.

### Acceptance criteria

- The table carries one row per check per tree, eight checks across four production trees plus
  three facts checks across the showcase, the linked site, and one site with no `site-facts.json`.
- Every disagreement is marked expected or defect, and none is unmarked.
- The linked site is restored **before the task ends**: `npm run link:consumer -- <site-dir>
  --restore` output is in the report and `git status` in that site is clean of a `file:`
  dependency and of any generated file that site did not carry before.
- `npx cairn-manifest` ran in the linked site before the facts checks were measured, and the
  report shows the generated `site-facts.json`'s contents.
- The light gate is green on the commit (the table is under `tool/`, so the tool tier applies).

### The agent reports

The table verbatim; every disagreement with its classification and its input; the restore output;
which production site carried the three facts; anything it could not measure and why.

**Halt:** a disagreement that is neither expected nor a named defect; a production tree that cannot
be read without modifying it.

---

## Task 11: close

Runs in the conductor's own turns, plus one `code-simplifier` dispatch, one `go-architecture-reader`
per touched Go package, and one independent `diff-reviewer` read over the fold's own diff.

- [ ] **`go-architecture-reader`, one dispatch per touched Go package**, at the merge and never
      inside a per-task chain. The packages this pass touched: `tool/internal/doctor` (new),
      `tool/internal/spine`, `tool/internal/render`, and `tool/cmd/cairn`. Four dispatches, run in
      parallel; each grades its package with no plan in context.
- [ ] **`code-simplifier`** (plugin agent, pins Opus) over the Go this pass wrote, principally
      `tool/internal/doctor`. Apply its refinements before the merge, then re-run the light gate.
- [ ] **Review fan-out matched to what changed.** `svelte-reviewer`, `daisyui-a11y-reviewer`,
      `cloudflare-workers-reviewer`, and `web-auth-security-reviewer` are **not** dispatched: no
      Svelte component, no admin markup, no Worker code, and no auth, session, or write path
      changed. State this in the post-mortem rather than dispatching for form.
- [ ] **`docs/internal/engine-rulings.md`** gains **exactly five entries**, per decision 7, each in
      the ledger's own format with a `Verdict:`, a `Reopens on:`, and a `Record:` line, and a
      `Shape:` line on the two that are reshapes:
      1. the `config.site-config` narrowing (reshape): what the Go check asserts, why the schema
         does not port, and the two places a bad config still surfaces (the template parses at
         module load, and the admin Settings screen);
      2. the plain text report and the narrowed TTY reading (reshape, decision 3): `cairn doctor`
         enters no render body and queries no terminal, so `--color`, `--theme`, and `--width` have
         no effect on it; reopens on a design that needs a coloured doctor body;
      3. the drift-test replacement (accept): the Go constant set is now checked against the
         embedded mirror rather than a regex over `conditions.ts`, and the engine's
         `check:tool-conditions` closes the other half of the chain;
      4. the containment carry-forward (accept, spec `:136`): the 2026-09-02 amendment to
         `audit-cli-...-site-config` put `SITE_CONFIG_PATH` in a committed data file both the
         checker and the scaffolder read, and gave `doctor/bin.ts` a resolved-path containment
         assert. `cairn doctor` carries both forward into Go: it embeds the same data file
         (Task 2) and takes the *stronger* containment, `media-seed/bin.ts`'s symlink-resolving
         form, rather than the doctor's textual prefix compare (Task 1). Reopens on a Go read
         path that resolves a candidate without `filepath.EvalSymlinks`;
      5. the payload's wire mapping for `info` and `skip` (reshape, decision 8): the doctor's five
         status words do not fit the five frozen wire states, so `info` is written `state: pass`
         with its text in a doctor-only `note` key, and `skip` is written `state: skip` with
         `reason.not-run`, which for `cairn doctor` means the check's precondition did not apply.
         No state word and no reason code was added. Reopens on a consumer reading
         `reason.not-run` as a budget-cut check, or on a second payload needing an `info`.
      **The retirement itself, the dropped and deferred checks, and `site-facts.json` as new engine
      surface are retire-2b's entries and are not written here.**
- [ ] **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate
      caught, and what a later pass would be wrong to rediscover from scratch. The six CONTRADICTS
      findings belong in that last clause, the usage-error one most of all.
- [ ] **`ROADMAP.md`**: a line for anything this pass filed rather than took. Nothing this pass
      shipped is left listed.
- [ ] **`docs/STATUS.md`** rewritten present tense, at or under 60 lines. **It writes that
      `cairn doctor` is merged, names the merge SHA, and says the next step is draft docs pass A.
      It does not write, and does not anticipate, "the `0.97.0` cut is unblocked"**; retire-2b's
      close is that line's only writer (spec `:14-15`, `:371-372`, `:414`). It carries the one
      carry-forward this pass owes: **before the `tool/v1.1.0` tag, confirm each distinct
      `https://cairn.pub/docs/admin/<page>` the failure blocks print resolves on the deployed
      cairn.pub; if one does not, the tool prints the anchor text without a URL and a `v1.1.x`
      patch adds the link after the pin bump.**
- [ ] **A post-mortem** appended to this plan file, with both budget scores: tokens against the
      2.4M ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).
- [ ] **`git merge origin/main`** into `doctor-go`, then re-gate.
- [ ] **The full gate after the merge**, once: `cairn-run-gate 'npm run check && npm test'` on the
      heavy lane, plus `npm run check:rulings-format`, `npm run check:docs`, `npm run check:vale`,
      `npm run check:arm-indexes`, `npm run check:facts`, and `npm run check:tool-conditions` on the
      light lane. Then open the PR and merge on green CI.
- [ ] **Send draft docs pass A's conductor the inventory** before pass A runs (spec `:358-359`):
      `docs/internal/record/2026-09-21-doctor-retire-1-pass-a-inventory.md`, already written beside
      this plan, refreshed with the merge SHA.

### Acceptance criteria

- The PR is merged and CI on `main` is fully green on the exact merge SHA, checked with
  `gh run list --commit "$(git rev-parse origin/main)" --json workflowName,conclusion,status`. An
  absent required run counts as red. The required set for this pass's SHA is `test`, `e2e`,
  `create-site`, `scaffold`, `design`, `tool`, and `tool-conditions`.
- **No `tool/v1.1.0` tag exists after this pass**, asserted with
  `git ls-remote --tags origin 'tool/v1.1.0'` printing nothing. Pass A's precondition 2 checks the
  same thing.
- `tool/docs/reference/` on the merge SHA holds exactly seven `*.schema.json` files and four
  markdown pages, which is pass A's precondition 4.
- `docs/STATUS.md` is at or under 60 lines, carries no past tense, and carries no unblock line.
- `ROADMAP.md` lists no item this pass shipped and lists every item it filed.
- `npm run check:rulings-format` is green over the five new ledger entries.

**Halt:** a red gate after the merge; a merge conflict in anything other than `docs/STATUS.md`,
`docs/HISTORY.md`, or `ROADMAP.md`; a `go-architecture-reader` verdict naming a structural defect a
single dispatch cannot clear.

---

## Spec coverage

Every retire-1 requirement in `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`,
mapped to the task that carries it.

| retire-1 spec requirement | Task |
| --- | --- |
| Worktree `doctor-go` off the pre-task's merge; light-lane gate; `go-conventions` on every file; `golang-spf13-cobra` for `tool/cmd/cairn` (`:115-117`) | Header, "The gate", every task |
| `cairn doctor [<dir>]`, directory defaulting to the working directory (`:121`) | 8 |
| The tool's flag grammar: `--json`, `--theme`, quiet, the single TTY predicate (`:121-122`) | 8 (narrowed by decision 3; ledger entry in 11) |
| Package `tool/internal/doctor` with its own check contract; `spine.ExitCode`, `CheckVerdict`, `Condition`, and the severity types reused as they are (`:122-126`) | 1 |
| One snapshot per run; each check a pure function over it (`:126-128`) | 1, filled by 3 through 7 |
| Outside a cairn site: one line, exit 3 (`:130-131`) | 8 (the payload arm in 9) |
| Containment under `<dir>`, symlinks included, the `media-seed/bin.ts` form (`:133-135`), carrying forward the 2026-09-02 ledger amendment (`:136`) | 1 (finding 3 completes the citation; the Go primitives are named there), 11 (ledger entry 4) |
| The site-config path shape verification from `substitute.mjs` (`:135`) | 2 (finding 4 corrects the citation) |
| The eight file-only checks (`:140-142`) | 5 (five of them), 6 (three of them) |
| The three facts-dependent checks, `unknown` with `ReasonNotObservable` and the engine-version message when `site-facts.json` is absent (`:144-147`) | 7 |
| `config.site-config` asserts found, parses as YAML, root is a mapping with a non-empty `siteName`, and nothing else; the narrowing recorded in the ledger (`:149-155`) | 4 (the parse), 5 (the check), 11 (the ledger) |
| `ai.posture-effective`'s origin precedence, and `unknown` for no origin or no answer (`:156-158`) | 7 |
| `config.dependency-floors` hand-rolls the three functions, no semver library; npm, pnpm, yarn order; the engine's peers read as a plain file (`:159-164`) | 5 (findings 5 and 6 complete it) |
| `config.media-bucket` gets its own remediation, its own condition id from the pre-task (`:165-167`) | 7 |
| The status mapping, all five doctor statuses (`:168-170`) | 1 (decision 2 resolves what `spine` cannot express), 9 (decision 8 resolves what the frozen wire states cannot express) |
| Each check's label equals its condition's registry `title` (`:171-172`) | 5, 6, 7 |
| `wrangler.jsonc` through an in-module JSONC stripper; `wrangler.toml` through the shallow line reader, never a TOML library; jsonc wins silently (ruling 2, `:39-44`) | 3 |
| `json-output.md`: the eleven ids under a `cairn doctor` heading, the freeze sentence amended, the schema tests moved with it (`:176-181`) | 9 |
| The new payload kind's own schema file under the Task 20c contract (`:181`) | 9 |
| The typed constants stay hand-written (25 after the pre-task, not the spec's 24); a Go test asserts the constant set equals the embedded id set, replacing the regex read and keeping its ruling comment (`:185-189`) | 2 |
| A failure prints the title, the why, the remediation, and the `https://cairn.pub/docs/admin/<basename>#<fragment>` URL (`:191-192`) | 8 |
| The conductor confirms each docs page resolves before the tag; the anchor-text fallback (`:192-195`) | 11, as a STATUS carry-forward; the tag session executes it |
| YAML promoted to a direct require, in one task that also amends ADR 0002 and `purity_test.go`'s `otherDirectRequires`; no other new module (`:199-201`) | 4 |
| The four regex heuristics, `requireOrigin`'s cases, and the wrangler reader's cases lifted into a shared corpus under `tool/` before retire-2 deletes those tests (`:205-207`) | 3 (wrangler and the corpus), 5 (`requireOrigin`, floors), 6 (the four heuristics) |
| The heuristics key on `CairnAdminShell`, `.shellLoad`, `createAuthGuard`'s argument shape, and `checkOrigin: false`, which retire-2 tripwires (`:207-209`) | 6 |
| The `cairn agents` help topic, the man page, a `tool/docs` page for the command, text-report goldens, the tool's CHANGELOG entry (`:213-215`) | 8 (agents, man, goldens), 9 (the page, the CHANGELOG) |
| Acceptance: the four exit codes proven by test, and one line plus 3 outside a cairn site (`:399-400`) | 8 |
| Acceptance: a golden payload validates against the committed schema; `json-output.md` publishes the eleven ids; the constant-set test fails on a renamed id (`:401-402`) | 9 (the first two), 2 (the third) |
| Acceptance: a read through a symlink leaving `<dir>` is refused (`:403`) | 1 |
| Acceptance: the eight file-only checks agree with the doctor on the four production trees; the three facts checks compared on the showcase and one linked site; a mapping table committed in `tool/testdata/` (`:392-398`) | 10 |
| Acceptance: the release exists with the `tool` workflow green (`:404`) | **Not this pass.** Choreography step 5 (`:360-367`) moves the tag and the release to their own session after pass A; this plan has no tag task and no release task, and its close says so. |
| Choreography step 3: merged to `main` without a tool tag, no tag task, no release task (`:352-353`) | Header ("Merge"), 11 |
| Choreography step 4: the inventory sent to the docs conductor before pass A runs (`:358-359`) | 11, and the record written beside this plan |
| Out of scope: the `0.97.0` cut, any credentialed check, a Go port of the site-config schema, a TOML parser, scaffolder detection of the binary, narrative-arm rewrites, `cairn health` changes, deleting registry entries (`:382-386`) | Carried by "Halts" and by Tasks 3, 4, and 9's constraints |

---

## Post-mortem (2026-09-22)

### What was built

`cairn doctor [<dir>]`, the Go half of the doctor retirement, on branch `doctor-go` off `main` at
`d041d1bf`, merged without a tool tag. Eleven tasks, each accepted through the
implementer / `diff-reviewer` / light-lane gate chain:

| Task | What landed | Commits |
| --- | --- | --- |
| 1 | the `doctor` check contract, the one-per-run snapshot, the symlink-resolving containment | `56803baa`, `c29cd716`, `5f9713fe` |
| 2 | the conditions embed in `spine`, its text accessor, the drift-test replacement | `8b0f2958` |
| 3 | the wrangler JSONC and line readers, the lifted regex corpus | `0c2e856a`, `5a762721`, `5f3ee04f` |
| 4 | YAML promoted to a direct require, ADR 0002 and `purity_test.go` amended | `fa1cce36` |
| 5 | the five config checks, floors hand-rolled with the optional-peer filter | `ca0635c8`, `fd5f8f8d`, `19e16d9f` |
| 6 | the three heuristic checks | `64a43097`, `5d69c6f8` |
| 7 | the three facts-dependent checks | `ac31f343`, `2da7cf6e`, `fec5a96a`, `1e5e0146`, `79dc4dfd` |
| 8 | the command, the plain report, the goldens, `cairn help agents` | `ba351499`, `481ade6d`, `8c0872ef` |
| 9 | the JSON payload, the seventh schema, the frozen-surface amendments | `884efadb`, `d426017a` |
| 10 | the agreement study, `tool/testdata/doctor-agreement.md` | `818ea8a4` |
| 11 | this close | one commit |

Three runner segments: `wf_b28a7d1b-a03` (Tasks 1 to 3, 1.08M), `wf_d953b20e-cb0` (Tasks 4 to 7,
1.64M), `wf_b2d61f9e-a31` (Tasks 8 and 9, 0.84M). At the merge: four `go-architecture-reader`
reads (`doctor`, `render`, and `cmd/cairn` sound with nits, `spine` workmanlike, none escalated)
and a `code-simplifier` round, `aaa405d8` through `2fe66d1e`, whose own review `fix` cleared in
`fcbf415e`.

### Verified, with the evidence

- **Agreement, the acceptance the spec leans hardest on.** Task 10 compared the eight file-only
  checks against `cairn-doctor` on all four production trees and the three facts checks on the
  showcase, a facts-declaring site, and a tree with no facts file. **Zero defects**, every
  disagreement pre-declared: `config.dependency-floors` reads `UNCHECKED` where the engine reads
  `FAIL` or `PASS` on a tree with no `node_modules`, proven to agree once installed; the three
  facts checks read `UNCHECKED` against `SKIP`/`SKIP`/`PASS` on the no-facts tree;
  `ai.posture-effective` reads `UNCHECKED` against `SKIP` on the offline showcase; and the
  pre-declared exit split, 2 against 1, appeared once, on ecxc-ski. On the facts-declaring site all
  eleven checks agreed.
- **Exit codes, containment, and the payload** are proven by test inside the Go gate: the four
  codes and the outside-a-cairn-site line in `cmd/cairn`, the symlink refusal in
  `fileread_test.go`, the golden payload validated against `cairn-doctor.schema.json` in
  `render/json_schema_test.go`, and the constant-set test failing on a renamed mirror id.
- **The gate** ran light-lane `make -C tool check` at every commit, green each time. On PR #80, CI's
  `windows-latest` leg caught a real gap the local light gate could not: `os.Chmod` cannot deny an
  owner's own read on Windows, so `TestReadUnderPermissionDeniedIsAnError` needed a Windows skip
  beside its existing root skip, since this workstation is Linux and never runs that leg.
- **CI on the branch point.** All seven workflows, `tool-conditions` included, ran green on the
  pre-task's merge SHA `d041d1bf`.

### Decisions locked at the close

- **Two `code-simplifier` findings deliberately skipped.** Building the checks' `conditions` list
  from the embedded map would collapse the const-versus-mirror drift gate Task 2 exists to build.
  Printing `snap.Dir` in plain text would break the `tool.yml` matrix on macOS, whose temp paths
  resolve under `/private`.
- **Task 5's second verdict, a procedural `escalate`, was accepted by the conductor.** The finding
  was the relative-versus-absolute gate string, and the reviewer had itself run that string green
  against the same target.
- **Task 10's forced deviation, accepted.** `npx cairn-manifest` cannot run in a production site
  pinned to a released engine while `main`'s unreleased window renames exports, and the permission
  layer denies edits to a real site tree. The measurement ran on a scratch copy of the checkout at
  its HEAD with the four renamed call sites edited, then deleted; the real tree was restored and
  verified clean. The agreement record labels those rows as the copy.

### Reviewer fan-out

`svelte-reviewer`, `daisyui-a11y-reviewer`, `cloudflare-workers-reviewer`, and
`web-auth-security-reviewer` were **not** dispatched, as the plan directed: no Svelte component,
no admin markup, no Worker code, and no auth, session, or write path changed. The review coverage
this pass took instead is per-task `diff-reviewer`, four architecture reads, the simplifier round
and its own review, and one independent `diff-reviewer` read over this fold's diff.

### Incidents

None beyond Task 10's deviation above. Two gitignored side effects remain, both recorded in the
agreement document: xcathletes-org now carries a `node_modules`, and this worktree's
`examples/showcase` carries a real install rather than the symlink back to the main checkout.

### Both budgets

Ceiling 2.4M subagent tokens; spend about 4.7M at this fold (segments 3.56M; the close about 1.1M,
of which the architecture reads 444K, the simplifier round and its review and fix 383K, and Task 10
and its review 250K). The overrun was raised at the segment 2 boundary and the run continued under
Geoff's overnight grant to the release, logged at each segment boundary.

Attended time: **one planning miss**, Task 10's assumption that `link:consumer` plus
`cairn-manifest` works on a pinned production site, which a pre-flight against a site's pinned
version would have caught. **Zero execution sittings**: nothing was asked of Geoff during the run.
