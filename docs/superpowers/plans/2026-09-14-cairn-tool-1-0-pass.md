# The `cairn` Go tool, 1.0: the complete single-site CLI

**Date: 2026-09-14, Pass B re-cut into B1 and B2 on 2026-09-20.** Three passes, `cairn-tool-A`,
`cairn-tool-B1`, and `cairn-tool-B2`, re-cut from
`docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md` at the CLI-versus-HUD
boundary per Geoff's versioning ruling of 2026-09-13. Pass A closed on 2026-09-20, unmerged; the
B1/B2 re-cut is authored from
`docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md`, which Geoff pre-approved,
and the three-lens plan review runs on it.

> **For agentic workers:** dispatch each task through `cairn-implementer` (Sonnet), review the
> diff with `diff-reviewer`, and confirm the gate before the next dispatch. The gate for every
> task in this plan is `make check` inside `tool/`, issued as
> `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` (the light lane: this gate launches
> no browser, so it takes its own lock and never queues behind another session's browser gate;
> set `gateLane: "light"` in the runner's args; corrected 2026-09-20 after pass A queued for
> hours without it). On exit 75, re-issue the same command unchanged until it prints
> `gate exit:`; never poll a log file. Tasks 3 and 17 are the two tasks that also run a Node suite.
> Task 3 ran in Pass A. **Task 17's gate is one string in the light lane**, Go half and Node half
> together, because the Node half is one package's own suite and launches no browser.
> **Do not run `scripts/checks/gate-tier.mjs` for a `tool/`-only diff, and pin `gateTier` on every
> task, which is the only thing that stops it.** The classifier carries no `tool/**` rule:
> `classifyPath` returns `null` for every path under `tool/`, and an unclassified path is
> conservative-defaulted to the `full` tier, whose gate string is this repo's whole npm gate. Left
> unpinned, `~/.claude/workflows/pass-execute.js` sends its own probe agent to run the classifier
> over the task's diff, resolves that npm string, and then flags the implementer's `make -C tool
> check` as a **blocking MISMATCH** to the reviewer. A pin short-circuits that: `resolveGate`
> returns the task's own declared gate string unchanged as soon as `t.gateTier` is set, and never
> runs the classifier. So every B1 and B2 task is dispatched with **`gateTier: "docs"`**, a pin used
> only to stop the classifier and never as a claim about what the diff contains, together with a
> `notes` line: "this repo's gate-tier classifier carries no `tool/**` rule; do not run it; run the
> Gate command unchanged and report gateTier: pin". That `notes` line is load-bearing, because the
> implementer's own prompt still tells it to run the classifier with `--pin docs`, which would print
> the npm docs gate string. Adding a `tool/**` rule to the classifier is filed as a chore, not a
> task in this plan.
> Invoke `go-conventions` before writing any Go file and `golang-spf13-cobra` before any
> `cmd/cairn` file. Invoke `vps-conventions` only for the one systemd unit in Task 24b's
> verification paragraph, which is Geoff's own installation of that task's documented unit; the
> product's own scheduler examples are prose in `tool/docs/tripwire.md` and are not governed by
> it. Do not invoke `bubbletea-design` or `elm-conventions` in this plan: 1.0 has no TUI.

**Goal:** a Go binary `cairn` that is the complete single-site operator CLI. It adopts
production sites into a local registry, runs read-only health checks over one site at a time,
prints and serves them as JSON, queries the site's logs, and answers a scheduled tripwire with
a documented exit code. Every action is reachable from a shell. Nothing in 1.0 needs a terminal
UI.

**Who the tool is for (Geoff, 2026-09-14).** `cairn` is a product for any cairn operator, on
Linux, macOS, and Windows. Every mechanism it ships has a portable form and a documented setup.
Geoff's own installation is this pass's verification data and never the design. The workstation
rules still govern that installation: the age store is the origin of his own credential values,
and his scheduled run is a systemd unit authored in his dotfiles. Each of those appears in one
place only, the verification paragraph of the task whose mechanism it proves.

**What 2.0 adds, and why 1.0's shape must carry it:** the bubbletea HUD and multi-site
management. The spine's API is the product, and every front end is a view over it with no logic
held in a view (Geoff, 2026-09-13). So 1.0 keeps three seams intact even where 1.0 itself does
not exercise them: the registry's shape and site record, checks as pure functions over a site
record, and the pure render seam the HUD mounts on. Each of the three carries a named acceptance
test in the task that builds it.

**Architecture:** `tool/` is a separate Go module in this repo. Ten internal packages in a
strict downward order, with `cmd/cairn` on top:

- `cmd/cairn` depends on `health`, `logs`, `store`, `render`, `logx`, `secrets`, `version`,
  `providers`, and `record`.
- `render` depends on `health`, `logs`, `record`.
- `health` and `logs` depend on `spine`, `providers`, `record`.
- `spine` depends on `providers`, `record`.
- `store` depends on `record`.
- `logx` depends on `providers` only, and `cmd/cairn` is its only importer.
- `providers` and `record` depend on nothing internal.
- `secrets` depends on nothing internal, and `cmd/cairn` is its only importer.
- `version` depends on nothing at all.

The 2026-08-20 spec listed eight packages including `ui` and `theme`. Those two are the ones this
plan drops, `render` is the pure seam that carries their replacement for 1.0, and `logx`,
`version`, and `secrets` are the three this plan adds.

**Tech stack:** Go at the toolchain this pass builds with, `github.com/spf13/cobra`,
`github.com/zalando/go-keyring`, `golang.org/x/term`, `golang.org/x/sys/windows`, golangci-lint
and `govulncheck` pinned in `tool/tools/go.mod`, Vale pinned at 3.15.1 with the `glw907` comment
overlay vendored under `tool/.vale/styles/`. Node 22 for the fixture-extraction task only. `go
env GOVERSION` reads `go1.27.1` on the machine this pass runs on today, so Task 1 sets the `go`
directive from the installed toolchain rather than from the 2026-08-20 plan's `1.26` line, and
records the value it chose. CI installs Go from `tool/go.mod` on all three legs, so no leg
depends on one machine's toolchain. `golang.org/x/sync/errgroup` is not a dependency: the fan-out
that needed it is 2.0 work.

**The three dependencies beyond cobra, each by a named decision.** `go-keyring` carries the OS
keyring provider on macOS, Windows, and Linux, and is the library the `gh` CLI uses for the same
job (Geoff, 2026-09-14: portable secret storage on three platforms is not something to
hand-roll). `x/term` reads a secret from a prompt with echo off, which no standard-library call
does portably. `x/sys/windows` opens a file without following a reparse point, which
`syscall.O_NOFOLLOW` cannot do on Windows. `go-conventions` asks for minimal dependencies and
assumes cobra alone, so each of the three is a documented exception rather than a default, and
Task 2's ADR records all three with these reasons. Task 9 is the last task to add one, so it
carries the end-state assertion: `go mod tidy` leaves exactly these four direct requires, every
other line in `require` is marked `// indirect`, and the task report lists the indirect set it
saw.

**Spec:** `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, with the
predecessor `docs/superpowers/specs/2026-08-13-go-successor-tool-design.md` for the why.
Executors read the spec section a task names. This plan argues from the spec and does not
restate it. Where this plan contradicts the spec, this plan wins, and the contradiction is
listed under "Knowing corrections to the spec" below.

**Status: the three-lens review is folded, and the 2026-09-14 portability ruling is applied.**
**Approved:** Geoff, 2026-09-14, after the three-lens review, the fold, the independent fold read, the product revision, and its scoped read. The two header items below (the exit-code convention and the registry path) are confirmed by that approval. The plan-approval gate is closed.
Two changes to the spec's own contracts await Geoff's confirmation at that read, and each is
marked where it lands. The exit-code contract now follows the monitoring-plugin convention
instead of the spec's four codes (Task 21). The registry path now resolves through
`os.UserConfigDir` instead of the spec's hand-built POSIX path (Task 5). Task 25 amends the spec
for whichever of the two he confirms. The reconciliation table below is re-verified in one pass
after polish-C merges, before Task 1 dispatches, and corrected in this file in place.

## Ceilings, checkpoints, and execution mode

| Pass | Tasks | Token ceiling | Checkpoint interval |
|---|---|---|---|
| `cairn-tool-A` | 11 | 8M | every four tasks |
| `cairn-tool-B1` | 9 (11b-i, 11b-ii, 12 to 17, 17b) | 8M | every four tasks |
| `cairn-tool-B2` | 17 (19c-i, 18, 19a-i, 19a-ii, 19b, 19c-ii, 20a, 20b-i, 20b-ii, 20c, 21, 22a, 24a, 22b, 23, 24b, 25) | 14M | at every segment boundary |

**B2 was amended on 2026-09-20 (evening), within bounds Geoff pre-approved**, after a render
design track produced a capability survey, three mockup iterations, six adversarial reviews, and a
copy standard. The amendment took the render work from one task to four, added the messages-table
task the copy standard requires, split the cut at the tag so an unattended run stops before an
irreversible act, and brought the multi-site sweep into 1.0. Nine tasks became thirteen and the
ceiling went from 10M to 14M, **accepted by Geoff, 2026-09-20**. The added work and the reason for
each addition are listed under "What the 2026-09-20 design amendment changed" below. Its inputs
live at `tool/docs/design/`.

**The three-lens review of 2026-09-20 (night) then re-cut B2 from thirteen tasks to seventeen, and
added no scope.** Every one of the four is a sizing split of work the thirteen-task shape already
carried: 19a into 19a-i and 19a-ii, 19c into 19c-i and 19c-ii, 20b into 20b-i and 20b-ii, and 24
into 24a and 24b. The exit-code arithmetic moved from Task 21 into Task 18 rather than being added
anywhere. The ceiling stays 14M, because the same work is being dispatched in more pieces rather
than more work being dispatched. **If the 80% flag trips at a segment boundary, the cut point for a
pass split is after the render segment**, that is after Task 20b-ii: B2 keeps 19c-i through 20b-ii
and a Pass B3 takes 20c, 21, 22a, 24a, 22b, 23, 24b, and 25, which is the tail that the owner gate
already divides from the rest.

**Pass B was split into B1 and B2 (Geoff, 2026-09-20, ruling 2 of three taken that day).** B1 is
the opening refactor task plus the checks and the logs; B2 is the CLI surface, the cut, the
release, the scheduled run, and the close. Each carries its own ceiling, checkpoint interval,
segments, and close. The `cairn-tool-B` row above is retired; its fourteen tasks are the
eighteen items of the two rows that replace it, Task 19 having split into 19a and 19b, Task 11b
into 11b-i and 11b-ii at the three-lens review of 2026-09-20, and each pass having gained a close
task.

**How the B1 and B2 ceilings were sized, and what Geoff accepted.** The two numbers are the
conductor's sizing of 2026-09-20. **Ceilings accepted by Geoff, 2026-09-20**: B1 8M, B2 10M. Pass A
measured about 0.6M subagent tokens per task including its fix round, and about 2.4M for its close
(the simplifier, seven architecture reads, a four-task fold, and the ritual). B1 runs eight build
tasks and touches about five packages at its close, so 8M. B2's own sizing is the 14M the table
carries, set at the 2026-09-20 design amendment and unchanged by that night's re-cut: it runs
twelve build tasks, of which the cobra tree and the render bodies are the largest in the plan, plus
release work, the scheduler documentation, and the close, and B1's merge is already behind it. The
original plan priced all of Pass B at 10M for fourteen tasks; the split prices the same work at 22M
across twenty-six, plus the audit amendments folded in below. That increase is real and is stated
rather than absorbed.

**Retired history, kept only so the two numbers can be traced.** The pre-split sizing paragraph
priced Pass B as one fourteen-task pass at roughly 650k per task, comparing against polish-C's 15
tasks at a 9M ceiling and arriving at 9.1M for fourteen. It is superseded by the table's two rows
and by the paragraph above. Do not size a task or a pass against it.

**What the 2026-09-14 ruling added to the counts.** Pass A gained Task 9, the secret provider
seam and the `cairn auth set` command. Pass B gained Task 23, the release artifacts and the
`go install` proof, split out of the cut rather than piled onto it. Pass B's Task 19, Task 21, and
Task 24 each grew: the acknowledgement list and the error threshold became documented flags, the
exit codes changed convention, and the tripwire doc now carries three schedulers. The counts are
stated here rather than absorbed, so a conductor can see the accumulation. Pass B at fourteen
tasks was the pass to watch, and its fallback cut after Task 17 has now been taken: that cut is
the B1/B2 boundary, and it is a pass split rather than a task split, so work could leave.

At 80% of a pass ceiling, finish the task in flight, write STATUS, and ask one combined
question. Check that flag only at a segment boundary.

**Execution mode.** All three passes are at or above six tasks, so all three run through
`pass-execute.js` with `cairn-implementer` as the executor. This header is the opt-in. The
Workflow tool refuses a `~/.claude/workflows` scriptPath, so **copy
`~/.claude/workflows/pass-execute.js` into the session scratchpad first** and run it from there. The
Go gate is `make check` inside `tool/`, not the repo's npm gate, and `cairn-implementer` has the npm
gate baked in, so every task below states its gate explicitly.

**The conductor's runner args, stated so a launch does not derive them.**

- `repo`: the worktree the pass runs in, `.claude/worktrees/cairn-tool-a` for B1 and B2's own
  worktree off `main` for B2.
- `gate`: `"make -C tool check"`. Task 17 overrides it with its own two-command string.
- `gateLane`: `"light"`, at the args level, so every task inherits it.
- `implementer`: `"cairn-implementer"`.
- `maxFix`: `1`. A second `fix` verdict is the conductor's decision, not another round.
- No `parallel`: no task in either pass is independent of another, so the runner stays sequential.
- Per task: `gateTier: "docs"` and the `notes` line, both per the blockquote at the top of this
  file. The pin exists only to stop the classifier; it describes nothing about the diff.

**Arm `/loop` at launch.** Start `/loop` with no interval as soon as the first workflow is
running, in both B1 and B2 (`~/.claude/docs/unattended-work-guards.md`). A network drop left Pass
A's conductor unwoken for five hours, which is the loss this closes.

**A factual pre-flight runs before each segment launches.** One cheap agent lists every checkable
claim the segment's tasks make about existing code, checks each at HEAD, and reports the false
ones before any implementer dispatches. Pass A paid a full fix round for five such claims across
seven tasks, which is what this step exists to stop.

**Segments.** Every boundary sits on a commit the gate proved green.

- Pass A segments after Task 3, Task 6, and Task 9.
- Pass B1 segments after Task 13 and after Task 17, and its close (Task 17b) is its own segment.
  Four tasks in each of the first two segments, since splitting Task 11b into 11b-i and 11b-ii at
  the three-lens review made the first segment four. Task 17b stands alone because the merge inside
  it is irreversible. The checkpoints land after Task 13 and after Task 17, on the same two
  boundaries.
- Pass B2 runs six segments after the 2026-09-20 night re-cut: 19c-i, 18, 19a-i | 19a-ii, 19b,
  19c-ii | 20a, 20b-i, 20b-ii | 20c, 21, 22a, 24a | 22b, 23 | 24b, 25. The last two are under the
  sizing rule's own override, since an irreversible task opens a segment rather than sitting inside
  one and the owner gate cuts the pass in two. Task 22b pushes the `tool/v1.0.0` tag, Task 23
  publishes the release on it, Task 24b installs and arms the owner's own timer, and Task 25
  merges. Task 24a sits before the gate because it is not owner-gated and it verifies against Task
  22a's release-candidate binary rather than against the tag. **Checkpoints land at every segment
  boundary.** Each segment is two to four tasks, so the four-task interval is never exceeded, and a
  checkpoint always falls on a commit the gate proved green rather than in the middle of one.

**Task independence.** No two tasks in either B1 or B2 are independent of each other, so
`pass-execute.js` runs in its sequential default and nothing is marked parallel. The contended
resources, named so a later reader does not re-derive them: in B1, Tasks 11b-i and 11b-ii share
`tool/cmd/cairn/probe_token.go` and every check task appends to the literal slice in
`tool/internal/health/health.go`, which Task 12 creates; in B2 Tasks 19a-i, 19a-ii, 19b, 19c-ii,
20b-i, 20b-ii, 20c, and 21 all edit `tool/cmd/cairn/root.go` and `tool/cmd/cairn/main.go`, Tasks
20a, 20b-i, 20b-ii, and 20c all edit `tool/internal/render/`, and Tasks 20b-i and 20b-ii share
`tool/internal/render/golden_test.go` and `testdata/golden/`. The cross-pass
ordering constraints are in "Rollback and halt semantics" below and hold unchanged.

**Sequencing and branch topology.** Pass A ran on the worktree
`.claude/worktrees/cairn-tool-a`, branch `cairn-tool-a`, and closed there on 2026-09-20 without a
merge (Geoff, 2026-09-20: "extend-2 will be running for a while. You can add the merge to the
next pass").

- **B1 runs in that same worktree, on that same branch.** It does NOT branch from `main`: `main`
  carries no `tool/` tree until the merge, which was verified on 2026-09-20. PR #60 stays a draft
  and accumulates B1's commits. One executor per worktree still holds, so verify the worktree is
  idle before dispatching anything into it.
- **B1's close task carries the merge of PR #60.** The procedure is Task 17b's own acceptance
  criteria.
- **B2 then runs on its own worktree off `main`**, the ordinary case, after that merge has landed.

The tool lives under its own module, so running in parallel with an engine pass is real
parallelism. Neither pass touches `src/lib`, so the branches contend over six files only:
`CHANGELOG.md`, `docs/STATUS.md`, and `ROADMAP.md`, all written at a pass close; `CLAUDE.md` and
`docs/superpowers/2026-08-18-tui-skills-setup-brief.md`, written by Task 2; and
`docs/internal/what-cairn-is-and-is-not.md`, written by Task 25.

## What the re-cut changed

### HUD-only work cut to 2.0

Every task under the old plan's Pass C is dropped from this plan: old Task 22 (`theme` port), old Task
23 (render seam and gallery, partially kept, see below), Task 24 (root model, registry, status
line, field bound), Task 25 (sites table screen), Task 26 (detail and log screens), Task 27
(adopt dialog), Task 28 (generation-counted refresh), and Task 29 (Pass C close). In addition,
these parts of the old Pass A and Pass B tasks are cut:

| Cut part | Where it was | Why it is 2.0 |
|---|---|---|
| ADR-0001, component architecture (root `App`, `Screen`, the package-level screen registry) | Old Task 2 | It records a decision about the TUI's internals, and 1.0 has no TUI. It lands with the HUD, re-read against poplar at that time rather than against poplar today. |
| ADR-0002, design language and input (poplar's palette, ADR-0012's key model, `HealthGlyphs` at two tiers) | Old Task 2 | Same reason. 1.0's own glyph and no-color needs are smaller and live in Task 20a. |
| The cairn fork of `elm-conventions` | Old Task 3 | It scopes to `tool/internal/ui`, a package 1.0 does not create. |
| `CLAUDE.md` lines making `bubbletea-design` and the `elm-conventions` fork mandatory | Old Task 2 | Both name TUI work. Task 2 wires the Go and cobra skills instead. |
| The `gallery` Makefile target as a TUI sweep, and the `analyzers` target with `screenregistry` | Old Tasks 1, 23, 24 | `screenregistry` checks screen registration. Task 20b-ii keeps a golden sweep for the text renderer under its own target. |
| `shouldLaunchTUI(isTTY, env)` and the TTY gate on bare `cairn` | Old Task 19 | 1.0's bare `cairn` prints help unconditionally. The predicate is three lines, not a seam, so 2.0 adds it rather than 1.0 shipping it dead. Task 19a-i asserts its absence. Distinct from the one color-profile TTY check Task 20a ships in `render/profile.go`, which the 2026-09-20 amendment also made the body selector (Geoff, 2026-09-20). |
| The interactive adopt path | Old Tasks 19, 27 | 1.0's adopt is flag-driven and non-interactive. |
| The `errgroup` fan-out and the connectivity probe that gates it | Old Task 28 | The 2026-09-20 amendment brought the multi-site SWEEP into 1.0 (bare `cairn health`), but sequentially, over the same `health.Run` one site at a time. The concurrency, the connectivity probe, and the generation counting stay 2.0. Task 24a's scheduler examples call bare `cairn health` rather than looping, and say the loop remains available. |
| `remedy.go` in `ui` as the detail view's remedy source | Old Task 26 | The screen is 2.0. The mapping itself is kept and re-homed into Task 19c-i's `fixes` table, see below. |
| `tool/tools/analyzers/cairncheck/main.go` | Old Task 24 | **Ruled 2.0** (conductor, 2026-09-14). 1.0's gates are the Makefile's `vet`, `test`, `govulncheck`, and the lint `go-conventions` names. A custom analyzer joins only when a rule the spec names needs one, and it is listed under the 2.0 hand-forward with that condition. |
| `Chapter` and the step-to-chapter mapping | Spec decision 2 | **Ruled 2.0** (conductor, 2026-09-14). 1.0's checks key off condition and reason, never chapter, so the type would ship with no caller. The mapping arrives with 2.0's detail view, which groups an onboarding site's state by chapter. |
| A cloud tripwire routine through the `schedule` skill | Task 24a's alternative | A cloud agent reaches no operator's environment, keyring, registry, or installed binary. It becomes correct only once a hosted spine exists, so it is a 2.0 hand-forward conditional on that spine. |
| A third secret backend (a file backend, `pass`, 1Password through its CLI) | Task 9 | The seam takes one implementation each, so a backend can arrive without reshaping anything. Shipping three at 1.0 would buy surface nobody has asked for. Task 9 states the interface and ships the two providers every platform can use. |

### 2.0 seams kept on purpose

Each row is a seam or an export 2.0 needs. The task that builds it states in its own acceptance
criteria that the seam is kept for 2.0 and carries the named test, so a later reader does not
read the seam as over-building. The named 2.0 caller pre-adjudicates the callerless-export
finding `go-architecture-reader` would otherwise file at both closes.

| Seam or export | Task | Named 2.0 caller | Acceptance test that protects it |
|---|---|---|---|
| The registry's shape: a directory of many records, listed, loaded, and saved by id | 5 | The HUD's sites table screen | `List` over a directory of three live records returns three entries with their ids in `Name` order, and returns a skip error naming the malformed fourth's id rather than failing the list. |
| The site record: typed non-secret fields plus the opaque ordered tail | 4 | The HUD's adopt dialog and detail view | The version 0 fixture round-trips byte-equal including key order after trailing-whitespace normalization, secrets included, and the typed struct has no field for any secret. |
| Checks as pure functions over a site record | 12 | The HUD's per-site refresh | Every `Check` satisfies `Run(ctx, record.Record, Clients, Options) spine.Outcome`; a test runs a slice holding the whole `All` set plus a deliberately stateful stub twice against a recorded `RoundTripper` and asserts identical reports, which goes red on the stub. |
| `health.Run` pure over its inputs, with the sweep's clock carried on `Options.Now` rather than a separate parameter | 12 | 2.0's generation-counted refresh | The same record, clients, options (with a fixed `Options.Now`), and acknowledgements produce a byte-identical `(Report, error)` across two calls in one process. |
| `Options.OnCheck`, the per-check callback `health.Run` fires as each check settles | 12 | The HUD's per-site refresh, which paints a check's result the moment it lands rather than at the end of a sweep | A three-check run fires the callback three times, once per check id, in completion order, and a nil callback runs the sweep unchanged. |
| `ExitCode` over a slice of site verdicts (converted from `health.Report` at the call site, ratified 2026-09-21) | 18 | The multi-site sweep's exit | The table covers a one-element slice, a zero-report call with `expectSites` mismatched, which is `sites list`'s only caller, and a three-element slice with mixed outcomes, which is bare `cairn health`'s. The 2026-09-20 amendment gave the many-element case a 1.0 caller, so this row is no longer a callerless seam. |
| The pure render seam: `Render(RenderInput) Frame`, no I/O, no program, the frame sectioned as Header, Body, Footer | 20a, 20b-i, 20b-ii | The HUD's screen render, which pins the header and scrolls the body in a `viewport` | A golden sweep over fixture, width, and profile, plus a test asserting the package imports none of `os`, `golang.org/x/term`, `colorprofile`'s detection entry points, `lipgloss.Writer`, or the `lipgloss.Print*` family, each forbidden by name as Task 20a states them, outside its profile-detection file. A second test asserts `Frame` carries no bubbletea type. |
| `render.NewTheme(dark bool, p Profile) Theme` with `Style(role)`, `Sized(role, w)`, and the glyph set, the one palette file | 20a | The HUD's theme, widened rather than replaced | A contrast table over every role in both grounds, a named ANSI-16 slot per role in both branches, and a test asserting no caller chains a raw lipgloss setter off a returned style. |
| The condition-to-fix map, re-homed out of `ui` | 19c-i | The HUD's detail view | Every anchor the map returns resolves to an actual heading in `docs/admin/is-it-working.md`, read at test time, and a second test covers the no-anchor branch. |
| `logs.Query`, `logs.Entry`, `logs.Fetch` shaped for both a printed list and a scrolling view | 17 | The HUD's scrolling log screen | `Fetch` returns entries newest-first, with `Entry.Fields` an ordered slice (never a map, whose iteration order would make any golden over it nondeterministic) whose values are unparsed `json.RawMessage`, so no renderer choice is baked into the fetch. |
| `adopt.Discover`, `adopt.Adopt`, `adopt.AlreadyAdopted` as plain functions (package `tool/internal/adopt`, ratified 2026-09-21; not `spine`, which cannot import `record` or `store`) | 18 | The HUD's adopt dialog | `Discover` never writes, and adopting the same candidate twice yields one record. |
| `spine.TerminalSteps()`, `spine.Chapter3TerminalSteps()`, `spine.Chapter3ResumableSteps()` (Task 11 fold, 2026-09-20: functions returning a clone of an unexported backing slice, not vars) | 8 | The HUD's detail view, which shows an onboarding site's hold state | The step-literal drift test reads the Node constants at test time, so a Node-side edit fails the Go suite even with no 1.0 caller. |
| `spine.FromKind` | 8 | The HUD's detail view, which renders a park state from the doctor's own kind | A table over every `Kind` asserts the spec's mapping, so the function is covered before 2.0 calls it. |
| `spine.Conditions()` (Task 11 fold, 2026-09-20: a function returning a clone of an unexported backing slice, not a var) | 8 | The HUD's condition filter on the sites table | The drift test against `src/lib/diagnostics/conditions.ts` is the function's only 1.0 reader, and the task states that. |
| `providers.NPM.Versions` | 7 | 2.0's engine detail view, which lists the skipped versions | A corpus-backed test over a packument asserts the ordering the detail view will read. |
| The secret provider seam: `secrets.Provider` with the environment and keyring implementations | 9 | 2.0's third backend behind the same interface | A table runs the resolver over both providers with a fake keyring: environment wins when both hold a value, the keyring answers when the variable is absent, and a keyring that cannot be reached is a miss rather than an error. |
| `spine.State.Severity()`, the one severity order under `tool/` | 11b | The HUD's worst-first summary line and its status glyph precedence | A table over all three states asserts Failing above Unknown above OK, and a second test asserts exactly one severity table exists anywhere under `tool/`. |
| `context.Context` threaded through every exported `providers` method | 11b | The HUD's per-site refresh, which has no other cancellation lever: bubbletea gives a `Cmd` no per-Cmd cancellation, so a stale generation's in-flight requests can only be stopped through a context the sweep owns | A test cancels the context mid-request and asserts the call returns the context error rather than the response, for one method on each of the four clients. |

`providers.Cloudflare.VerifyToken` and `providers.GitHub.TokenExpiry` are not in this table.
Both gain a 1.0 caller in Task 12's `creds` check, which is the first member of `All`.

### What 1.0 owes that the old plan put in Pass C or nowhere

- **The scheduled tripwire, as documented units for three schedulers.** The old plan documented
  the exit-code contract and stopped. Task 24a writes `tool/docs/tripwire.md` with a working
  example for a systemd user timer, a launchd LaunchAgent, and a Windows Task Scheduler task,
  each supplying the three credentials the way its own platform does and each capped in
  wall-clock time. Geoff's own timer is one installation of the systemd example, and its first
  unattended green run is that task's acceptance evidence.
- **Every action reachable from the shell.** Tasks 19a-i, 19a-ii, 19b, 20b-i, 20b-ii, and 20c own this. Task 22a's acceptance
  includes a coverage assertion: the cobra tree carries exactly the 1.0 command and flag set, and
  the assertion is a test over the tree rather than a prose claim.
- **The 1.0 release, installable by anyone.** Task 22a cuts 1.0 and Task 22b tags `tool/v1.0.0`,
  the first of the pass's three owner-gated tasks. Task 23 publishes a
  GitHub release carrying prebuilt binaries for linux, darwin, and windows on amd64 and arm64
  with a `SHA256SUMS` file, and proves `go install
  github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` from a clean machine. `make -C tool install`
  stays as the local convenience path, which is how Geoff's own binary lands at
  `~/.local/bin/cairn`.

### What the 2026-09-20 design amendment changed

Geoff pre-approved this amendment on the evening of 2026-09-20, inside stated bounds, on the
standing position that best-quality CLI UI is a top priority and that agent usability and
production-grade language are part of it. Every addition below is named with its reason, so the
accumulation is visible rather than absorbed.

| Change | Where | Why |
|---|---|---|
| Task 20 split into 20a, 20b (later 20b-i and 20b-ii), 20c | render | The design track turned one task's five deliverables into roughly twenty: a palette with two grounds and three profiles, a glyph set with a width-parity rule, five width rungs, a sanitizer, a theme constructor, three bodies, a golden corpus, and a frozen JSON contract. Three dispatches, each under four deliverable groups, instead of one at five times the workstation ceiling. |
| Task 19c added, later split into 19c-i and 19c-ii | copy | `tool/docs/design/copy-standard.md` requires one reviewable messages table per package, `Detail` as prose with the machine token on `Condition`, a committed copy golden, and a `check-copy` gate. None of that fits inside a render task, and every later task's strings depend on it. |
| Task 22 split into 22a and 22b | the cut | An unattended overnight run must stop before an irreversible act. 22a is everything up to the tag, ending in a release candidate the owner can run. 22b is the tag push alone and is owner-gated. |
| Multi-site `health` brought into 1.0 | 19a, 21, 20b, 20c | An agent's actual prompt is "check my sites". Without a sweep it pays N spawns and must re-derive the precedence rule from prose, and its natural guess (highest code wins) ranks UNKNOWN above CRITICAL. The seam was already built and tested; 1.0 was paying for it and not exposing it. |
| `cairn help agents` added | 21 | `go install` reaches no `tool/docs` tree, so `--help` is the only in-band contract surface an agent has. |
| A real WARNING tier | 21 | Every non-OK site read as CRITICAL in the mockups. A version bump that pages someone at 2am trains them to ignore the tool. |
| The `actor` and `outward` fields | 19c, 20c | Nothing in the output said who can perform a fix, so an agent must guess between a command it may run and a dashboard click it must escalate. |
| Ceiling 10M to 14M, nine tasks to thirteen | header | Stated rather than absorbed. Four of the four added tasks are splits of work the pass already carried; the genuinely new work is the copy system, the multi-site sweep, and the agent contract. |
| Thirteen tasks to seventeen, ceiling unchanged (the 2026-09-20 night three-lens review) | header, 18, 19a, 19c, 20b, 24 | Four sizing splits and one move, no scope. 19a carried 33 criteria across eleven groups and splits at the seam between the cobra tree and the registry-and-secrets work; 19c's messages tables are what every other task's strings come from, so its `health` and `spine` half runs first and its `cmd/cairn` half stays in place; 20b carried 35 criteria over four bodies; Task 24's last three criteria are the owner's own live machine, which an unattended executor cannot drive. The exit-code arithmetic moved from Task 21 into Task 18, because three of Task 19a's criteria call `spine.ExitCode`, which does not exist until Task 21 under the old order. |

### Knowing corrections to the spec

- The spec puts distribution beyond `go build` out of scope for sub-project 1. 1.0 now ships a
  tag, a `go install` path, and a GitHub release with prebuilt binaries for three operating
  systems on two architectures. The 2026-09-14 ruling is why: a tool for any operator has to be
  installable without this repository checked out. Brew, a Windows channel, and the npm shim
  stay 2.0.
- The old plan's Task 29 says "the tool's first tag is a sub-project 2 decision with
  distribution". The versioning ruling supersedes that line.
- The old plan's Task 15 compiles the Builds half out behind a build tag if no read-level Builds
  permission group exists. `go-conventions` forbids build tags. Task 15 uses a runtime
  capability value on `Clients` instead, which also gives the check an honest unknown reason
  rather than a silently missing check.
- The spec's `--expect-sites N` sits on `health`. The flag moves to `cairn sites list
  --expect-sites N`, which is where a registry-level count belongs, and stays there after the
  2026-09-20 amendment gave `health` a multi-site form. `ExitCode` keeps the parameter.
- **`cairn health` with no argument sweeps every registered site (2026-09-20 amendment).** The
  2026-09-14 plan deferred the multi-site sweep to 2.0 and Task 19a's criterion 19 said so. The
  sweep is now 1.0, sequential and over the same `health.Run`; the concurrency and the
  generation-counted refresh stay 2.0. Task 19a-ii holds the command, the whole-run timeout
  arithmetic, and the partial-result rule; Task 18 holds the cross-site exit-code precedence and
  Task 21 holds the WARNING tier that feeds it.
- **`render.Frame` carries no bubbletea type, and the spec addendum's line to the contrary is
  wrong.** The 2026-09-20 addendum says `Frame` gains `Cursor *tea.Cursor` at the HUD pass. A
  bubbletea type inside `render` breaks the package's own purity test and the seam the HUD mounts
  on. `Frame` returns Header, Body, and Footer sections; the HUD composes a `tea.View` from a
  `Frame` plus its own cursor state. Task 25 appends a dated correction to the addendum rather
  than rewriting it, and Task 20a states the ruling.
- **The exit codes change convention (confirmed by Geoff's approval, 2026-09-14).**
  The spec sets its own four codes, with 0 for a run degraded by an absent credential and 4 for a
  tool fault. 1.0 adopts the monitoring-plugin convention instead, which Nagios and every
  alerting tool compatible with it already read: 0 OK, 1 WARNING, 2 CRITICAL, 3 UNKNOWN. A
  degraded run is WARNING rather than a silent OK, so the spec's `--require-credentials` flag is
  dropped: a scheduled routine alerts on any non-zero exit, and WARNING is what a human reads at
  a prompt. The spec's exit 4 is dropped, because a tool fault is what UNKNOWN means. Task 21
  holds the mapping and Task 25 amends the spec if Geoff confirms.
- **The registry path resolves through `os.UserConfigDir` (confirmed by Geoff's approval, 2026-09-14),
  too.** The spec rules `os.UserConfigDir` out and hand-builds `~/.config/cairn/sites` on Linux
  and macOS so the Go tool matches the Node CLI. The 2026-09-14 ruling names `os.UserConfigDir`
  on every platform. Task 5 measures the divergence and keeps the Node CLI's path as a documented
  fallback read, so no operator's existing records go missing.
- The spec reads the three credentials from the environment and says the tool never writes one.
  1.0 adds a second read provider, the OS keyring, and one command that writes into it, `cairn
  auth set` (Geoff, 2026-09-14). The environment stays first in the resolution order, so the
  spec's own path is unchanged for an operator who wants nothing else. Task 9 builds the seam.
- The spec gives the GitHub token no repositories by default, on the reading that three of the
  four sites it had in mind are public. 1.0 states the scope as the operator's own: the
  repositories of the sites in their registry, plus this engine's repository for the Engine
  check's changelog read, each with Contents and Metadata read. Task 10's probe verifies every
  repository the registry names rather than a list written into the plan.

## Global constraints

Carried from the 2026-08-20 plan, edited for the two-pass shape.

- The module is `github.com/glw907/cairn-cms/tool`, rooted at `tool/`, with its own `go.mod`,
  Makefile, and workflow. Nothing under `tool/` is reachable from `npm test` or the npm tarball.
- Structure follows `go-conventions`: `cmd/cairn` holds CLI wiring only, `internal/` holds every
  package of logic, there is no `pkg/`, one concern per file, and `foo_test.go` sits beside
  `foo.go`. Tests are table-driven, in the same package, with no third-party assertion library.
  Tool versions are pinned in `tool/tools/go.mod` and invoked with `go run -C tools`.
- The documented install paths are two, and both work from a clean machine: `go install
  github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0`, and a prebuilt binary from the GitHub
  release. The `install` Makefile target is a third, local path for whoever has the repository
  checked out. It deliberately deviates from the `go-conventions` skeleton and is poplar's
  `install -m 0755 $(BINARY) "$(HOME)/.local/bin/$(BINARY)"`, which puts the binary where this
  workstation keeps its own binaries rather than in GOBIN. Do not replace that target with `go
  install`, and do not present it as the product's install path.
- Every gate is falsified before it is trusted. The task that adds a gate breaks the code
  deliberately, shows the gate failing, restores it, and records both runs in its report.
- No build tags, no code generation, no CGO. Platform-specific code uses GOOS filename suffixes,
  the mechanism the Go toolchain provides and `go-conventions` does not forbid, and a test asserts no file under `tool/` carries a
  `//go:build` line.
- No shell-out to an installed CLI (`wrangler`, `npm`, `gh`) anywhere in `tool/`. REST only.
- Credentials are never bare `string`s past startup, never on argv, never in a child
  environment, never in a log or error string. The chokepoint scrubs known values last. A value
  reaches the tool through one of two providers only, the environment or the OS keyring, and
  `cairn auth set` is the only command that writes one. The docs state the hygiene for each
  platform, and no document tells an operator to type a value on a command line.
- 1.0 decodes no per-site secret, and no 1.0 check reads one. Unknown record keys round-trip as
  an opaque ordered tail, a `secretRefs` object included. The `keyring://` reference form the
  spec reserves is this plan's secret provider seam written as a reference, and resolving one is
  a 2.0 hand-forward.
- `health.All` is a literal slice in `tool/internal/health/health.go`. Registration is never by
  `init()`, so every task that adds a check modifies that file.
- Every check returns `Outcome` (ok, failing, unknown with a reason). There is no ok without
  having run. 401 and 403 are unknown with distinct reasons, never failing, except in the `creds`
  check, where a revoked or invalid credential is the thing being measured.
- Account ids, zone ids, worker names, repository slugs, build UUIDs, and full commit SHAs are
  verbose-only everywhere. `adopt list` and `logs` are each implicitly verbose and each
  says so on stderr. Nothing else prints them without `--verbose`.
- Status is never color alone. Every state carries a distinct glyph, and a word wherever the
  output width allows one. From the 2026-09-20 amendment this is sharpened by the owner's second
  pick: rows may drop the state word in the colour Unicode tier, and the ASCII tier and the plain
  body keep it unconditionally, enforced in code rather than by a flag.
- **An implementer never invents operator-facing copy** (2026-09-20 amendment). Every
  operator-facing string comes from the messages tables Tasks 19c-i and 19c-ii build, written to
  `tool/docs/design/copy-standard.md`. A task that needs a string the catalogue lacks adds the key
  with the plainest fragment that satisfies the standard's sections 2.4 to 2.7 and **lists it in
  the task report under "New operator-facing strings"**, which the conductor batches into one
  editorial dispatch. No operator prose sits at a call site, in a check body, or in a format
  string. Every B2 task below restates this line in its own notes; it is not left to this section
  alone, because a subagent starts with zero context.
- **Captures never open one terminal window per frame on the owner's desktop** (Pass B1's close,
  2026-09-20). Iterate with offscreen renders, the program's own ANSI converted to HTML and
  screenshot by headless Chromium, as `tool/docs/design/render-reference/src/offscreen.py` does.
  Real-terminal evidence is ONE reused kitty window per session, each frame captured only after
  its own command has finished and verified to carry that scenario's own first line before it is
  saved, as `real-frames.sh` does. Iteration 2's real frames each showed the previous command's
  output, which is the failure this closes.
- Comment prose follows Go Doc Comments through `go-conventions`. No em dash in comments, gated
  by Vale.
- The `Step` enum is exactly the strings the Node CLI writes to a record's `step` (see the
  reconciliation table, which corrects the old plan's count method). Park codes are a separate
  type.
- Windows, macOS, and Linux are all product platforms, not merely CI legs. All three are legs
  from the first commit, with `defaults.run.shell: bash`. Every mechanism the tool ships works on
  all three. A behavior that cannot work on all three is not shipped in 1.0.
- Commit messages are imperative mood, name specific files, and carry the standard co-author
  footer.
- Each pass ends with the `cairn-pass` ritual and no release, except Task 22b, which is the
  tool's own tag and is not an npm publish.
- At each pass merge, dispatch `go-architecture-reader` once per touched Go package, one
  dispatch per package, never batched.

## Reconciliation block

Every anchor below is a dependency of this plan on a tree that `polish-C` is rewriting. Each
row carries today's measured value and is marked **re-verify after polish-C merges**. Verify the
whole table in one pass before Task 1 dispatches, and correct this file in place. Anchors
measured 2026-09-14 against `main` at `f1c72dbf`, re-verified 2026-09-14 against `main` at
`55fc7762` after polish-C merged.

| # | Anchor | Value today (2026-09-14) | Used by | Re-verify |
|---|---|---|---|---|
| 1 | `packages/create-cairn-site/test/fake-cloudflare.mjs` | Exists, response bodies inline with provenance comments | Task 3 | Verified 2026-09-14 post-polish-C |
| 2 | `packages/create-cairn-site/test/fake-github.mjs` | Exists, same shape | Task 3 | Verified 2026-09-14 post-polish-C |
| 3 | `packages/create-cairn-site/test/fixtures/transcripts` | Exists, and Task 3 must leave it untouched | Task 3 | Verified 2026-09-14 post-polish-C |
| 4 | `packages/create-cairn-site/src/state.mjs:20` | `const SITE_ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/;` | Tasks 4, 5 | Verified 2026-09-14 post-polish-C |
| 5 | `packages/create-cairn-site/src/state.mjs:27` | The state directory: `CAIRN_STATE_DIR` else `path.join(homedir(), '.config', 'cairn', 'sites')`. Measured against `os.UserConfigDir` on 2026-09-14: the two agree on Windows (`%AppData%`) and on Linux with `XDG_CONFIG_HOME` unset, and diverge on Linux with it set and on darwin, where `UserConfigDir` returns `~/Library/Application Support`. So Task 5 resolves through `UserConfigDir` and keeps this path as a fallback read | Task 5 | Verified 2026-09-14 post-polish-C |
| 6 | `packages/create-cairn-site/src/cloudflare/chapter2.mjs:84` | `export const TERMINAL_STEPS = ['email-live', 'paid-plan-declined'];` | Task 8 | Verified 2026-09-14 post-polish-C |
| 7 | `packages/create-cairn-site/src/cloudflare/chapter3.mjs:70` | `export const CHAPTER3_TERMINAL_STEPS = ['builds-live', 'builds-connect-declined'];` | Task 8 | Verified 2026-09-14 post-polish-C |
| 8 | `packages/create-cairn-site/src/cloudflare/chapter3.mjs:82` | `export const CHAPTER3_RESUMABLE_STEPS = ['builds-connected', 'config-reconciled'];` | Task 8 | Verified 2026-09-14 post-polish-C |
| 9 | The `step: '...'` literal set | A naive grep over `packages/create-cairn-site/src` yields **25** distinct literals across eight non-test files, not the old plan's 18 (corrected by conductor ruling 2026-09-20: 'installed' is written through a computed local at `github/chapter.mjs:330`). **19** are record steps; six are not (`install`, `manifest`, `one`, `two`, `domain-account`, `domain-zone`). Task 8's grep must scope to the record write sites | Task 8 | Verified 2026-09-14 post-polish-C |
| 10 | `packages/create-cairn-site/src/cloudflare/api.mjs` | `throwIfTokenInvalid` at `:247`, `throwMapped` at `:268`, `throwBuildsMapped` at `:350`, `OPERATION_CODES` at `:54`, `EMAIL_OPERATION_CODES` at `:63`. **The old plan's `buildsError` does not exist under that name**; the function is `throwBuildsMapped`. The file sets no client timeout and retries a GET once on `Retry-After` at `:30-34`, `:112`, `:217` | Tasks 6, 15 | Verified 2026-09-14 post-polish-C |
| 11 | `packages/create-cairn-site/src/cloudflare/hostname.mjs` | `confirmHostname` exported at `:185`; the DNS diagnosis returning `hostname-records-absent` or `hostname-resolver-lagging` at `:148-160` | Task 13 | Verified 2026-09-14 post-polish-C |
| 12 | `packages/create-cairn-site/src/cloudflare/zone.mjs:193` | `export async function checkDelegation({ record, api, resolveNs = systemResolveNs })`, four states at `:209` and `:213` | Task 13 | Re-verified 2026-09-20 at HEAD: all three anchors still correct |
| 13 | `src/lib/diagnostics/conditions.ts` | 262 lines; the condition id vocabulary the checks declare against. It carries no id for Serving, Delegation, Deploy, Behind, Engine, or an error count, which is why those checks declare `ConditionNone`. **It carries exactly one `edge.` id, `edge.https-not-forced`; there is no `edge.hsts-off`** (re-verified 2026-09-20 at HEAD), which is why Task 14's HSTS half declares `ConditionNone` too | Tasks 8, 12, 13, 19c-i | Verified 2026-09-14 post-polish-C |
| 14 | `src/lib/log/events.ts` | 98 lines; polish-C Tasks 10 and 11 renamed eight event strings in this union | Tasks 17, 21 | Verified 2026-09-14 post-polish-C (changed) |
| 15 | `docs/reference/log-events.md` | 111 lines; the engine's event table, which `logs --event` completion and the tool's own event reference both read. Fourteen or more events carry an editor email, which is why Task 17's fixture is synthesized rather than captured | Tasks 17, 21 | Verified 2026-09-14 post-polish-C |
| 16 | `docs/admin/is-it-working.md` | Headings present today include `## Force HTTPS at the edge` (`:164`), `## Turn on observability` (`:256`), `## Onboard the sending domain` (`:216`), `## Install the GitHub App` (`:413`). No heading covers Serving, Delegation, Deploy, Behind, Engine, or an error count | Task 19c-i fix map | Verified 2026-09-14 post-polish-C |
| 17 | `docs/admin/troubleshooting.md` | Exists; polish-C Tasks 10 and 11 edited it wherever it names a renamed event | Task 24a | Verified 2026-09-14 post-polish-C |
| 18 | `scripts/checks/check-package-files.mjs` | 445 lines, measured at HEAD on 2026-09-20 (it read 421 before Pass A's Task 1 added the `tool/` assertion); asserts nothing about top-level paths today, which is why Task 1 adds the `tool/` assertion | Task 1 | Verified 2026-09-14 post-polish-C |
| 19 | `package.json` `files` allowlist | Task 1 changes nothing in it; the new assertion proves that | Task 1 | Verified 2026-09-14 post-polish-C |
| 20 | The Node workflows needing `paths-ignore: ['tool/**']` | **Eight workflows exist today**, not the old plan's five. `publish.yml` is release-triggered (`on: release: types: [published]` plus `workflow_dispatch`), `tsgo.yml` is scheduled, and `norms.yml` is `workflow_call` and `workflow_dispatch` only, so none of the three needs `paths-ignore`. The five `push` and `pull_request` workflows do: `create-site.yml`, `design.yml`, `e2e.yml`, `scaffold.yml`, `test.yml` | Task 1 | Verified 2026-09-14 post-polish-C |
| 21 | `CHANGELOG.md` `## Unreleased` and its `Consumers must:` lines | The engine check reads these through GitHub. The `0.97.0` cut moves the whole window into a version section, and polish-C Task 14 rewrites the consumer list | Task 16 | Verified 2026-09-14 post-polish-C |
| 22 | The repo root `.vale.ini` | Globs every `docs/**/*.md` and pins Vale 3.15.1 in CI; Task 1 leaves it alone unless it would otherwise lint `tool/`, and asserts `npm run check:vale` output is byte-identical before and after | Task 1 | Verified 2026-09-14 post-polish-C |
| 23 | `src/lib/sveltekit/health.ts:28` `loadHealth` | polish-C Task 7 renamed it from `healthLoad`, with `previewMint`, `previewRevoke`, and `previewLoad` becoming `mintPreview`, `revokePreview`, and `loadPreview` (all now in effect) | Task 16, and any doc a task cites | Verified 2026-09-14 post-polish-C (changed) |
| 24 | `packages/cairn-cms-dev/src/handle.ts` and `fake-auth-db.ts` | `createFakeAuthDb` imported at `handle.ts:21`, called at `:93`; `DevBackendOptions` at `:26`. No tool code depends on these today. Recorded so a later task does not build against the pre-polish-C names | None yet | Verified 2026-09-14 post-polish-C |
| 25 | `docs/superpowers/2026-08-18-tui-skills-setup-brief.md` | Its Tasks 1, 2, and 4 are the ones Task 2 marks done. Task 3 of that brief concerns TUI skills and stays open for 2.0 | Task 2 | Verified 2026-09-14 post-polish-C |
| 26 | `~/.claude/docs/cloudflare-estate-inventory.md` | The values-free record Task 10 writes the permission-group names into during Geoff's own mint. It is a workstation record and not a product artifact; the product's own record of which permission groups a token needs is `tool/docs/credentials.md`. Outside this repo, so polish-C does not move it, but re-verify the section names | Task 10 | No |
| 27 | `packages/create-cairn-site/src/state.mjs:55` `saveSite` | Writes `JSON.stringify(data, null, 2) + '\n'`, which preserves insertion order, at file mode `0o600` under a `0o700` directory. This is the byte and permission contract Tasks 4 and 5 port | Tasks 4, 5 | Verified 2026-09-14 post-polish-C |
| 28 | `packages/create-cairn-site/src/cloudflare/records.mjs:41-54` (`PROBE_PLAN`) | The DMARC-is-TXT expectation and the named DKIM selector set Task 14's Email check ports | Task 14 | Re-verified 2026-09-20, anchor corrected |
| 29 | `packages/create-cairn-site/package.json` `files` | `["bin.mjs","src","template","README.md"]`, so a sibling `fixtures/` directory is not packed. Task 3's tarball assertion proves it | Task 3 | Verified 2026-09-14 post-polish-C |
| 30 | The repositories this pass's own verification run must reach | The product rule is that the token reaches the repositories of the sites in the operator's registry plus `glw907/cairn-cms` for the Engine check's changelog read, and Task 10's probe reports each. Geoff's verification set is `glw907/ecxc-ski`, `glw907/907-life`, `glw907/aksailingclub-org`, `glw907/xcathletes-org`, and `glw907/cairn-cms`. The four site slugs were read from `git remote get-url origin` in each `~/Projects` checkout on 2026-09-14; `~/.claude/docs/cloudflare-estate-inventory.md:28` names the same four sites by their repo stems. `glw907/cairn-pub` is out of the verification set, because Geoff has adopted no site there | Tasks 10, 16 | Verified 2026-09-14 post-polish-C |

Thirty rows. Rows 9, 10, and 20 already correct the old plan's measurement, so treat the
re-verification as a measurement pass and not a formality.

---

## Pass `cairn-tool-A`: foundation

Eleven tasks. The pass ends with a module whose `make check` is green on three platforms, whose
fakes serve the real captured bodies, whose credentials resolve through a documented provider
seam, and whose read credentials are minted and probed.

### Task 1: Module, Makefile, CI matrix, version stamping, and the tarball guard

**Files:**
- Create: `tool/go.mod`, `tool/cmd/cairn/main.go`, `tool/cmd/cairn/root.go`,
  `tool/internal/version/version.go`, `tool/internal/version/version_test.go`, `tool/Makefile`,
  `tool/.golangci.yml`, `tool/tools/go.mod`,
  `tool/scripts/vale-comments.sh`, `tool/.vale.ini`, `tool/.vale/styles/glw907/**`
- Create: `.github/workflows/tool.yml` (the three-platform check matrix, plus the tag-triggered
  release job Task 23 fires)
- Modify: the five `push` and `pull_request` Node workflows from reconciliation row 20, adding
  `paths-ignore: ['tool/**']`
- Modify: `scripts/checks/check-package-files.mjs` (the new assertion)
- Modify: the repo root `.vale.ini` only if it would otherwise lint `tool/`

**Produces:** `make -C tool check` as the single gate, running `tidy-check fmt-check vet lint
vulncheck vale-comments test`, and the `tool.yml` matrix over `ubuntu-latest`, `macos-latest`,
and `windows-latest`. `tool/cmd/cairn/root.go` holds the cobra root with `SilenceUsage: true`, a
`--version` flag, and no subcommands; later tasks attach to this tree.
`tool/internal/version/version.go` holds `var Version = "dev"` and `var Commit = "none"`.

**Acceptance:**
- `make -C tool check` passes with a root command that only prints help. `make -C tool install`
  places the binary at `~/.local/bin/cairn` using `install -m 0755`, matching poplar's Makefile,
  which is the local path and not the product's install path. Task 22 is the first task that runs
  `install` for real; Task 1 only has to make the target correct.
- `go build ./...` inside a copy of `tool/` with no parent repository present succeeds, which is
  what makes `go install` of the tagged module work later. The fixture-corpus resolver is
  test-only, so it cannot break this; the assertion is a build of the non-test packages in a
  directory copied outside the checkout, recorded in the task report.
- The `go` directive matches the installed toolchain, and the task report names the version it
  read from `go env GOVERSION`.
- Version stamping has one mechanism for a repository build: the `build` target passes
  `-trimpath` and `-ldflags '-X .../internal/version.Version=$(shell git describe --tags --dirty
  --always) -X .../internal/version.Commit=$(shell git rev-parse --short HEAD)'`. A test asserts
  the in-source defaults are the literals `dev` and `none`. `make -C tool build && ./cairn
  --version` prints the describe output and the short SHA. Task 22 falsifies the `+dirty` half.
- A `go install` build runs no Makefile, so `version.Version` falls back to the module version
  from `runtime/debug.ReadBuildInfo` when the ldflags default is still `dev`, and reports `dev`
  only when there is no build info either. The precedence is stated once, in the version
  package's doc comment: ldflags, then build info, then `dev`. A table covers all three. This
  extends ruling 7 rather than adding a second competing mechanism, because without it every
  `go install` build would report `dev` and no operator could say what they were running. Task 23
  proves the build-info path against the published tag.
- `tool.yml` triggers on `push` and `pull_request` with `paths: ['tool/**',
  '.github/workflows/tool.yml', 'packages/create-cairn-site/src/**',
  'packages/create-cairn-site/fixtures/**', 'src/lib/diagnostics/conditions.ts',
  'src/lib/log/events.ts', 'docs/admin/is-it-working.md']`, so the four cross-tree drift gates
  can fire on the PR that breaks them. It sets `defaults.run.shell: bash`, installs Go from
  `tool/go.mod` and Vale 3.15.1 by direct release download (the same pin as `test.yml`), and
  runs `make -C tool check` on all three legs. A draft PR touching only `tool/` shows three green
  `tool` legs and no Node workflow runs. A second draft PR touching only
  `src/lib/diagnostics/conditions.ts` shows the three `tool` legs running.
- `tool.yml` also carries `push: tags: ['tool/v*']` and a `release` job gated on
  `startsWith(github.ref, 'refs/tags/tool/v')`. GitHub does not evaluate a `paths` filter for a
  tag push, so the tag trigger is stated separately in the same file rather than folded into the
  branch trigger. The job cross-compiles six binaries with `-trimpath` and the same ldflags the
  `build` target uses, writes `SHA256SUMS`, and attaches all seven files to the release for the
  tag. Task 1 wires and dry-runs the job with `workflow_dispatch`; Task 23 is where it fires for
  real. No release tooling is added: `go-conventions` asks for minimal dependencies and assumes
  cobra alone, and `go build` with a matrix does this job, so goreleaser is not taken.
- `check-package-files.mjs` fails if any packed path begins with `tool/`. Falsify by adding
  `"tool"` to `files`, run `npm run check:package`, confirm the failure names the path, revert.
- The `glw907` comment overlay is vendored under `tool/.vale/styles/glw907/` (copied from
  `~/Projects/poplar/.vale/styles/glw907`), and `tool/.vale.ini` sets `StylesPath =
  .vale/styles`, `[formats] go = md`, and `[*.go] BasedOnStyles = glw907`. A fresh clone and CI
  need no workstation dotfiles. Falsify with an em dash in a comment, confirm `make -C tool
  vale-comments` exits 1, remove it.
- `govulncheck` is pinned in `tool/tools/go.mod`, invoked with `go run -C tools`, and wired into
  `make check` as the `vulncheck` step. Falsify once by pinning a dependency version with a known
  advisory, confirm the step fails, revert.
- `go mod tidy` leaves `github.com/spf13/cobra` as the only direct require at this task, because
  nothing imports the other three yet. `x/sys` arrives with Task 5's Windows file open, and
  `go-keyring` and `x/term` arrive with Task 9. Task 9 carries the end-state assertion: exactly
  four direct requires, with every other line in `require` marked `// indirect`. Keeping the
  assertion where the last dependency lands is what stops a `tidy-check` from failing in
  between.
- `npm run check:vale` output is byte-identical before and after.
- No `make` step is guarded with `command -v`. A missing tool fails loudly.
- Gate: `make -C tool check` plus `npm run check:package`. Commit.

### Task 2: The one ADR 1.0 needs, and `CLAUDE.md` wiring

**Files:**
- Create: `tool/docs/adr/0001-the-spine-is-the-product.md`
- Modify: `CLAUDE.md` (at most four lines in the existing tooling section)
- Modify: `docs/superpowers/2026-08-18-tui-skills-setup-brief.md` (mark its Tasks 1, 2, and 4
  done with the commit)

**Acceptance:**
- ADR-0001 records Geoff's 2026-09-13 ruling as the tool's governing decision: the spine's API is
  the product, every front end is a view over it, the CLI is first and the HUD second, and no
  logic lives in a view. It names the three seams 1.0 keeps for 2.0 (registry shape and site
  record, checks as pure functions over a site record, the pure render seam) and, for each, the
  test in this plan that protects it. It names the two ADRs deferred to 2.0 (component
  architecture, design language and input) and says why deferring them is correct: both describe
  a TUI's internals and should be written against poplar as it stands when the HUD is built.
- ADR-0001 also records the 2026-09-14 portability ruling and what follows from it: the tool is a
  product for any cairn operator on Linux, macOS, and Windows, every mechanism has a portable
  form and a documented setup, and one operator's own installation is verification and never
  design. It records the three dependencies beyond cobra with the reason for each, since
  `go-conventions` assumes cobra alone and each of the three is therefore an exception on the
  record: `go-keyring` for portable secret storage on three platforms, which is not something to
  hand-roll and is the library the `gh` CLI uses for the same job; `x/term` for reading a secret
  from a prompt with echo off; and `x/sys/windows` for opening a file without following a reparse
  point.
- `CLAUDE.md` grows by no more than four lines, wiring `go-conventions` as mandatory for `tool/`
  and `golang-spf13-cobra` for `tool/cmd/cairn`. It does not name `bubbletea-design` or an
  `elm-conventions` fork; both arrive with 2.0.
- The setup brief's Task 3 stays open, annotated as 2.0 work.
- Gate: `make -C tool check` plus `npm run check:vale`. Commit, docs only, no simplifier.

### Task 3: Extract the fixture corpus from the Node fakes

**Files:**
- Create: `packages/create-cairn-site/fixtures/cloudflare/**/*.json`,
  `packages/create-cairn-site/fixtures/github/**/*.json`,
  `packages/create-cairn-site/fixtures/README.md`
- Create: `packages/create-cairn-site/test/fixtures-hygiene.test.mjs`
- Modify: `packages/create-cairn-site/test/fake-cloudflare.mjs`,
  `packages/create-cairn-site/test/fake-github.mjs` (load bodies from the corpus; the documented
  fake devices, randomized nameservers and `failNext`, stay in code)

**Produces:** one JSON file per captured body, named `<endpoint-slug>.<variant>.json`, each a
top-level object `{ "provenance": { "captured": "YYYY-MM-DD", "source": "<doc path>", "status":
<int> }, "body": { ... } }`. Go tests read only `body` and `status`.

**Acceptance:**
- Every literal response body inline in either fake is in the corpus. The falsifiable grep is
  `grep -nE '(success|errors|messages):' packages/create-cairn-site/test/fake-{cloudflare,github}.mjs`,
  because the bodies are JS object literals with unquoted keys and a `"success":` grep already
  returns zero today. Record the pre-count before the task and zero hits outside the corpus
  loader and the `sendJson` helper after it.
- Provenance is copied from the fake's own comment where one exists for that body. Where a body
  carries only a helper-level or module-level comment, such as the repeated zone-not-found 404s
  at `fake-cloudflare.mjs:426`, `:443`, and `:477`, `provenance.source` names that comment's file
  and line and `provenance.note` says "no per-body capture comment". Provenance is never
  invented. A body the fake marks unobserved keeps that note in `provenance.note`.
- `fixtures-hygiene.test.mjs` walks every file under `fixtures/` and fails if any matches an
  email address pattern or the account id `120c269ad6d3dfbe6d63a0bb53758ca0`. Falsify by planting
  an address in one fixture, confirm the failure names the file, revert. Task 17 re-runs this
  test over the fixture it adds.
- `npm pack -w packages/create-cairn-site --dry-run` lists no `fixtures/` path, since that
  package's `files` allowlist is `bin.mjs`, `src`, `template`, `README.md` per reconciliation row
  29. The task report records the run.
- `npm test -w packages/create-cairn-site` passes unchanged, and
  `packages/create-cairn-site/test/fixtures/transcripts` is untouched.
- `fixtures/README.md` states the language-neutral rule, says the Go tool reads these files by
  path, states that no fixture may carry a real editor email, ray id, account id, zone id, or
  worker name, and names the extraction trigger: the day the tool leaves this repo, the corpus
  moves with it.
- Gate: `npm test -w packages/create-cairn-site` plus `npm run check`. This is one of the two
  tasks whose gate is the Node gate. Run `code-simplifier` over the two fakes. Commit.

### Task 4: `record` package

**Files:**
- Create: `tool/internal/record/record.go`, `record_test.go`, `validate.go`, `validate_test.go`,
  `testdata/` (three records: a Node-written version 0 with secrets, a version 1 adopted record,
  a malformed one)

**Produces:** `type Record struct` with typed fields `Name`, `Step`, `Domain`, `SchemaVersion`,
`Adopted`, `GitHub GitHub` (`Repo`, `InstallationID`, identifiers only), `Cloudflare
Cloudflare` (`AccountID`, `ZoneID`, `WorkerName`), and an
ordered tail `Extra []ExtraField` where `ExtraField struct{ Key string; Value json.RawMessage }`.
(Renamed from `RecordGitHub`/`RecordCloudflare` to `GitHub`/`Cloudflare` to drop the stutter with
the `record` package name; Task 11 fold, 2026-09-20.)
`GitHub` and `Cloudflare` each carry the same ordered tail, so a nested object
round-trips too. `func Parse([]byte) (Record, error)` recording the key order it observed at each
level. `func (r Record) Marshal() ([]byte, error)` emitting two-space indent, no HTML escaping, a
trailing newline, and top-level and nested keys in the order `Parse` observed them, appending any
key absent at parse time after them, typed keys first and then new `Extra` fields. `func
ValidateSiteID(string) error` against the Node `SITE_ID_SHAPE`. `func ValidateDomain(string)
error` for a bare LDH name with no scheme, userinfo, port, path, query, or IP literal.

**Acceptance:**
- **2.0 seam kept on purpose: the site record.** `Parse` then `Marshal` of the version 0 fixture
  reproduces every key and value, `github.clientSecret` and `cloudflare.apiToken` included,
  byte-equal including key order after trailing-whitespace normalization. A reflection test
  asserts the typed struct, at every level, has no field whose name or JSON tag matches a secret
  key. 2.0 adds fields to this struct and must not have to reshape the tail.
- The byte contract is reconciliation row 27's: `JSON.stringify(data, null, 2) + '\n'`, which
  preserves insertion order. A map-typed tail cannot hold that order, which is why the tail is a
  slice.
- **`secretRefs` is not a typed field in 1.0, by decision.** The spec reserves a `secretRefs`
  object holding `keyring://` references, and no 1.0 check reads a per-site secret: the spec's own
  check table gives every check a machine-level credential or none, and the spec states that
  sub-project 1 decodes no per-site secret at all. A typed field would therefore ship with no
  reader. A record carrying `secretRefs` round-trips byte-equal through the ordered tail like
  every other key the tool does not type, which one fixture in this task's `testdata/` proves.
  Resolving a `keyring://` reference through Task 9's provider seam is a 2.0 hand-forward, named
  in the hand-forward list with the spec section it comes from.
- A sentinel test: a fixture with `clientSecret: "SENTINEL-7f3a"` passes through `Parse`,
  `fmt.Sprintf("%+v")`, `%#v`, and `Marshal`. Only `Marshal` output contains the sentinel, and
  that is asserted as the one permitted path.
- `ValidateDomain` rejects `site.example@evil.example`, `evil.example#`, `localhost:8787`,
  `169.254.169.254`, and `_dmarc.site.example`, and accepts `site.example` and
  `www.site.example`. The vectors are neutral names rather than any operator's own domains, so
  the table reads as a contract and not as one deployment. Its doc comment states that
  the function is resolution-free by design and names Task 18's `Adopt` as the place the
  private-range resolution check lives.
- Gate: `make -C tool check`. Commit.

### Task 5: `store` package

**Files:**
- Create: `tool/internal/store/store.go`, `paths.go`, `paths_test.go`, `perm_linux.go`,
  `perm_darwin.go`, `perm_windows.go`, `perm_windows_test.go`, `store_test.go`

**Produces:** `func Dir(env func(string) string, config func() (string, error), home string)
(string, Source, error)` (error return added by the 2026-09-19 conductor ruling, for the case
where `config` fails and no legacy directory exists) with `Source` one of `SourceEnv`,
`SourceUserConfig`, `SourceLegacyPOSIX`. The
`config` parameter is `os.UserConfigDir` in production and a stub in tests, which is what keeps
the resolution table testable on one platform. `type Store struct`.
`type Entry struct{ ID string; Record record.Record }`, where `ID` is the filename stem and never
a record key. `func Open(dir string) (*Store, error)` refusing a symlinked or non-owner
directory. `func (s *Store) List() ([]Entry, []error)`, each error an `ErrMalformed` or
`ErrUnsafePerms` carrying the id it skipped. `func (s *Store) Load(id string) (record.Record,
error)`. `func (s *Store) Save(id string, r record.Record) error` using temp-in-dir plus rename,
setting version 1 when absent. `var ErrUnsafePerms` and `var ErrMalformed`, each carrying the id.
The three `perm_*.go` files each define the same unexported set, including `openNoFollow(path
string) (*os.File, error)`; the Windows implementation uses `FILE_FLAG_OPEN_REPARSE_POINT` via
`x/sys/windows`, because `syscall.O_NOFOLLOW` does not exist there.

**Acceptance:**
- **2.0 seam kept on purpose: the registry's shape.** `List` returns every listable record as an
  `Entry` carrying its id, and skips a malformed one by id through the returned error slice
  rather than failing the whole list. 1.0's commands read one record at a time, and 2.0's HUD
  reads the list; the store serves both without reshaping. The test directory carries three live
  records, one malformed, and one retired, and the assertion is three entries with their ids plus
  one skip error naming the malformed file's id.
- `List` skips any filename stem that fails `record.ValidateSiteID`, so a
  `<id>.retired-<epoch>.json` file is never listed, matching the Node listing's own behavior.
  Entries are sorted by `Name`, with the id as tiebreak.
- **The registry path resolves through `os.UserConfigDir` on every platform** (Geoff,
  2026-09-14), which is a change to the spec and is listed under the knowing corrections.
  Precedence is `$CAIRN_STATE_DIR`, then the Node CLI's own `~/.config/cairn/sites` when that
  directory exists, then `os.UserConfigDir()` plus `cairn/sites` (order corrected by conductor
  ruling 2026-09-19: the literal order left the legacy branch unreachable). First match wins,
  paths are never merged, and the store records which source it used. The fallback is what keeps
  an operator's existing records readable: measured on 2026-09-14, `UserConfigDir` agrees with
  the Node CLI on
  Windows and on Linux with `XDG_CONFIG_HOME` unset, and diverges on darwin, where it returns
  `~/Library/Application Support`, and on Linux with `XDG_CONFIG_HOME` set. A table covers all
  three platforms, with and without `CAIRN_STATE_DIR`, with and without `XDG_CONFIG_HOME`, and
  with the legacy directory present and absent.
- The divergence is a documented migration note, not a silent move: `tool/README.md` and
  `tool/docs/credentials.md` state where the registry lives per platform, and `cairn sites`
  prints the directory it read under `--verbose`. A darwin operator whose records sit in
  `~/.config/cairn/sites` keeps working through the fallback, and a note says a move to the
  `UserConfigDir` path is optional in 1.0.
- `Save` creates the temp file through `openNoFollow` at mode `0o600` explicitly, fsyncs the file
  and then the directory, and creates a missing directory at `0o700`. A Save-then-Load round trip
  passes under umask `022` and umask `002` on POSIX, which is the failure the explicit mode
  prevents.
- POSIX: `Load` returns `ErrUnsafePerms` for a `0644` record or a `0775` directory, and never
  chmods. Windows: `Load` returns `ErrUnsafePerms` when a non-owner ACE is present. The ACL test
  lives in `perm_windows_test.go`, so it compiles only on the Windows leg and skips nowhere.
  Mode-bit assertions skip on Windows with a stated reason.
- No file under `tool/` carries a `//go:build` line, asserted by a test in this package, which is
  the task that introduces platform files. Falsify by adding `//go:build !windows` to one file,
  confirm the test fails, remove it.
- A version 0 record loads with `SchemaVersion == 0`; `Save` writes `schemaVersion: 1` and
  preserves the ordered tail byte for byte; a second `Load` sees 1.
- Gate: `make -C tool check`, and the Windows leg green in CI. Commit.

### Task 6: `providers`: transport policy and the Cloudflare client

**Files:**
- Create: `tool/internal/providers/transport.go`, `transport_test.go`, `cred.go`,
  `cloudflare.go`, `cloudflare_test.go`, `corpus.go`, `corpus_test.go`, `errors.go`

**Produces:** `type Credential struct{ v string }` with `NewCredential`, a `String` returning
`"<redacted>"`, and redacting `GoString`, `MarshalJSON`, and `MarshalText`, plus an unexported
`apply(*http.Request)`. `func newClient(host string, cred Credential) *client` whose `Do`
asserts `req.URL.Host == host`, sets the header per request, sets an explicit
`http.Client.Timeout`, and sets `CheckRedirect` to return `http.ErrUseLastResponse`. `type
Cloudflare struct` with `NewCloudflare(accountID string, cred Credential, rt
http.RoundTripper)`, where the `RoundTripper` is the only test seam and no base-URL variable
exists, and methods `VerifyToken`, `ListWorkers`, `WorkerDomains`, `BuildsConnections`,
`BuildsLatest`, `ZoneByName`, `ZoneSettings`, `EmailSendingSubdomains`, `ObservabilityQuery`.
`type APIError struct{ Status int; Code int; Reason Reason }` with `Reason` an enum
(`ReasonUnauthorized`, `ReasonForbidden`, `ReasonNotFound`, `ReasonBuildsNotConnected`,
`ReasonBuildsRepoNotSelected`, `ReasonBuildsAppNotAuthorized`, `ReasonSenderNotConfigured`,
`ReasonRateLimited`, `ReasonUnknown`) mapped from the v4 envelope the way `throwMapped` and
`throwBuildsMapped` do. `ReasonBuildsNotConnected` is never produced by `classifyReason`: a live
probe on 2026-09-19 confirmed the Builds triggers route answers 200 with an empty list for an
unconnected worker, not a distinct error code, so the Deploy check (Task 15) assigns this Reason
itself when `BuildsConnections` returns an empty list (conductor ruling 2026-09-19). `func
RepoRoot() (string, error)`, the walk-up to the directory holding `package.json` with `"name":
"@glw907/cairn-cms"`, used by `Corpus` and by every cross-tree drift test; it takes no
`testing.TB` and this file imports no `testing`, so `corpus.go` never links `testing` into the
shipped binary (conductor ruling 2026-09-19). `func Corpus(provider, name string) (status int,
body []byte, err error)` resolving the fixture path through `RepoRoot`, with callers in tests
handling the error themselves.

**Acceptance:**
- Every client sets an explicit `http.Client.Timeout`, and every request carries a context
  deadline. The Node client this ports from sets neither, so porting its behavior would leave one
  hung TLS dial able to hang an entire unattended run. A test uses an `httptest` handler that
  sleeps past the deadline and asserts the call returns rather than blocking.
- A 429 or 503 on a GET waits out `Retry-After` once and retries once. A second such response is
  `ReasonRateLimited` with no further wait. Tests cover 429 with and without a `Retry-After`
  header, and assert exactly one retry. Only GETs retry, matching the Node policy at
  reconciliation row 10.
- Redirect test: an `httptest` server 302s to a second server; the client returns the 302
  unfollowed and the second server records zero requests.
- Host-pin test: a request built for `evil.api.cloudflare.com` is refused before send.
- A Retry-After longer than a request's own remaining context deadline is not waited out: `Do`
  returns the rate-limited response unretried at once instead of sleeping past the deadline.
- Every `Reason` `classifyReason` can produce has a corpus-backed test mapping a real captured
  body to it, except `ReasonUnauthorized` (plain 401), `ReasonForbidden` (generic 403),
  `ReasonRateLimited`, and the 400/6003 token-invalid shape, which the fixture corpus carries no
  body for; those are covered instead by a direct `classifyReason` unit table, since the corpus
  forbids invented bodies (accepted as satisfying this criterion, conductor ruling 2026-09-19).
  `ReasonBuildsNotConnected` is covered by neither table, since `classifyReason` never produces
  it (conductor ruling 2026-09-19; see its own Produces entry above). The 403 with code 10000
  maps to `ReasonForbidden`, and a 401 to `ReasonUnauthorized`. The two Builds authorization
  refusals and the two Email Sending sender-readiness codes classify from any position in the
  envelope's `errors` array, not just the first, matching the Node client's `errors.some(...)`
  (api.mjs:335-349); a test proves each from a non-zero position, behind an unrelated warning
  entry.
- `ListWorkers`, `WorkerDomains`, `ZoneSettings`, and `EmailSendingSubdomains` follow every page
  of a list route's `result_info`, through one shared paginating GET helper; a test drives a
  two-page response. `ZoneByName` stays single-page, since it filters by name.
- Credential leak test: `fmt.Sprintf("%v %+v %#v %s", c, c, c, c)` and `json.Marshal(c)` contain
  no plaintext.
- `Corpus` names the extraction trigger in its failure message when the repo root is not found.
- Gate: `make -C tool check`. Commit.

### Task 7: `providers`: GitHub, npm, and probe clients

**Files:**
- Create: `tool/internal/providers/github.go`, `github_test.go`, `npm.go`, `npm_test.go`,
  `probe.go`, `probe_test.go`

**Produces:** `type GitHub struct` with `NewGitHub(cred Credential, rt http.RoundTripper)`,
where a zero `Credential` means unauthenticated, and methods `HeadSHA`, `FileAtRef`, `Branches`
(name plus last commit date and author login), `LatestBotCommit`, and `TokenExpiry` reading the
`github-authentication-token-expiration` header. `type NPM struct` with `Latest` and `Versions`.
`type Probe struct` with `NewProbe(rt http.RoundTripper, resolver Resolver)` and no credential
field, plus `Get` (following redirects, `User-Agent: cairn-tool/<version>` read from
`internal/version`), `GetNoFollow`, `LookupTXT`, `LookupNS`, and `LookupA`. `Resolver` is an
interface over `net.Resolver`.

**Acceptance:**
- GitHub reason mapping has corpus-backed tests for 401, 403, 404, and 200 on `commits/main` and
  `contents/package.json`.
- `TokenExpiry` returns a zero time with no error when the header is absent, which is what an
  unauthenticated call returns, and Task 12's `creds` check reads that as unknown rather than
  expiring.
- **2.0 seam kept on purpose: `NPM.Versions`.** 1.0's Engine check needs only `Latest`, and
  2.0's engine detail view lists the skipped versions. A corpus-backed test over a packument
  asserts the ordering that view will read.
- A reflection test asserts `Probe` has no field of type `Credential` and sends no
  `Authorization` header.
- `Probe.Get` follows an `httptest` 302 chain; `GetNoFollow` returns the 303 itself with its
  `Location`.
- The same timeout and single-retry policy from Task 6 applies to all three clients, asserted by
  one shared table test.
- Gate: `make -C tool check`. Commit.

### Task 8: `spine` vocabulary

**Files:**
- Create: `tool/internal/spine/step.go`, `step_test.go`, `park.go`, `park_test.go`,
  `outcome.go`, `outcome_test.go`, `condition.go`, `condition_test.go`

**Produces:** `type Step string` with the record-step constants and `ParseStep`. `func
TerminalSteps()`, `Chapter3TerminalSteps()`, and `Chapter3ResumableSteps()` (Task 11 fold,
2026-09-20: functions returning `slices.Clone` of an unexported backing slice, not vars) ported
from the Node constants named in reconciliation rows 6 through 8. `type ParkCode string` with the
codes the hold loop and park pages use. `type State int` (`OK`, `Failing`, `Unknown`). `type
Outcome struct{ State State; Reason ReasonCode; Detail string }` with `Validate` rejecting a
non-Unknown state carrying a reason and an `Unknown` carrying none. `type ReasonCode string` with
the catalogued set (`reason.cred-missing`, `reason.cred-forbidden`, `reason.cred-revoked`,
`reason.cred-expiring`, `reason.timeout`, `reason.offline`, `reason.not-run`,
`reason.not-observable`, `reason.park.<ParkCode>`, `reason.api.<Reason>`). `func FromKind(kind
Kind, code string) Outcome` implementing the spec table: `wait` becomes Unknown with a park
reason, `act` and `ask-someone` become Failing, `declined` becomes OK with a detail. `type
Condition string`, the constant `ConditionNone` whose value is the empty string, and `func
Conditions()` (Task 11 fold, 2026-09-20: same functions-over-vars shape) copied from
`src/lib/diagnostics/conditions.ts`.

**Acceptance:**
- A test reads `packages/create-cairn-site/src` through `providers.RepoRoot` at test time and
  asserts the set of record-step literals equals the `Step` constants, so a Node-side addition
  fails this test. The grep is scoped to record write sites, per reconciliation row 9 (corrected
  by conductor ruling 2026-09-20: 'installed' is written through a computed local at
  `github/chapter.mjs:330`): a naive `step: '` grep yields 25 literals today, six of which are
  not record steps, and the task report states the scoping rule it used.
- A test reads `src/lib/diagnostics/conditions.ts` through `providers.RepoRoot` and asserts every
  `Condition` constant whose id contains a dot exists there. The same test asserts
  `ConditionNone` is the only undotted value in the package. Checks the spec's table marks new,
  which are Deploy, Behind, Engine, the error count, and the credential check, declare
  `ConditionNone`, so the two criteria can both hold.
- Reason codes are not conditions. `hostname-not-serving`, `certificate-pending`, and the park
  codes are `ReasonCode` and `ParkCode` values, never `Condition` values, asserted by a test that
  no `Condition` constant collides with a `ReasonCode` constant.
- **2.0 seams kept on purpose: `TerminalSteps()`, `Chapter3TerminalSteps()`,
  `Chapter3ResumableSteps()`, `FromKind`, and `Conditions()`.** None has a 1.0 caller outside a test.
  Each is named in the seams table with its 2.0 caller, and each carries its own test here, so
  the surface is covered before 2.0 calls it. A table over every `Kind` asserts `FromKind`
  against the spec's mapping.
- `Outcome{State: OK}` carrying a reason fails `Validate`, and `Outcome{State: Unknown}` with no
  reason fails.
- Gate: `make -C tool check`. Commit.

### Task 9: The secret provider seam and `cairn auth set`

Credentials arrive from the environment on every platform, and from the OS keyring where an
operator prefers not to keep them in a shell profile. Both providers ship in 1.0 (Geoff,
2026-09-14). This task is the whole credential input path, so Task 10 can mint against it and
Task 19 has one chokepoint to extend.

**Files:**
- Create: `tool/internal/secrets/secrets.go`, `secrets_test.go`, `env.go`, `env_test.go`,
  `keyring.go`, `keyring_test.go`
- Create: `tool/internal/providers/missing.go`, `missing_test.go` (the `Missing` type, one concern
  per file)
- Create: `tool/cmd/cairn/auth.go`, `auth_test.go`, `tool/cmd/cairn/env.go`,
  `tool/cmd/cairn/env_test.go`
- Create: `tool/docs/credentials.md`
- Modify: `tool/cmd/cairn/root.go` (attach `auth`), `tool/go.mod` (the two new requires)

**Produces:** `type Provider interface { Name() string; Get(name string) (string, bool, error) }`
in `secrets`, with two implementations. `Env` reads the process environment. `Keyring` reads the
OS keyring through `github.com/zalando/go-keyring` under the service name `cairn`, with the
variable name as the key. `func Resolve(name string, providers ...Provider) (value string, from
string, err error)` walking the providers in order and reporting which one answered.
`type Writer interface { Set(name, value string) error }`, implemented by `Keyring` alone, which
is why the environment provider cannot be written to by mistake. In `providers`, `type Missing
struct { Var string; Disables []string }` (`render` and `cmd/cairn` both import it). In
`cmd/cairn`, `func loadEnv(env func(string) string, p ...secrets.Provider) (Env,
[]providers.Missing)` returning `CAIRN_CF_ACCOUNT_ID`, `CAIRN_CF_READ_TOKEN`, and
`CAIRN_GH_READ_TOKEN` as `providers.Credential` plus the account id, the provider name each came
from, and a list of which are absent, never their values. Subcommand `cairn auth set <name>`,
and `cairn auth list` printing each variable name with the provider that answers for it and no
value.

(`secrets.Env` gained an unexported `lookup func(string) (string, bool)` field and the exported
`NewEnvFromLookup` constructor, so a set-but-empty variable is a miss the same way an unset one
is; `cmd/cairn`'s separate `envProvider` adapter, which disagreed with `Env` on that point, is
deleted, and `loadEnv` builds a `secrets.Env` directly. `Keyring`'s test-only backend seam
(`keyringBackend`, `realBackend`, `newKeyringWithBackend`) collapsed to package-level vars
(`keyringGet`, `keyringSet`, `keyringDeadline`) a test swaps. `cmd/cairn`'s exported `Env` type
and its six flat fields are gone; `loadEnv` now walks one `credentialVars` table of `{name,
secret bool}` and returns an unexported `env` holding a `[]resolution`, with `sourceLines`
shared by `cairn auth list` and `probe-token` for the provider-name-or-"not set" text each
prints. A `Resolve` failure is recorded rather than discarded: the source line reads
"<provider>: error", the provider name only. Task 11 fold, 2026-09-20.)

**Acceptance:**
- **2.0 seam kept on purpose: the secret provider seam.** The interface takes one method to
  read and one to write, so a third backend is one implementation and no caller changes. A table
  runs `Resolve` over both providers with a fake keyring: the environment wins when both hold a
  value, the keyring answers when the variable is absent, and a keyring that cannot be reached is
  a miss rather than an error. The last row is the load-bearing one: a Linux box with no Secret
  Service running, and a CI leg with no session keyring, must both behave exactly like an
  operator who has only set the variables. A bus that is present with a locked collection is the
  one path the library does not bound: it waits on an unlock prompt with no timeout. Every
  keyring read runs under a context deadline of two seconds and a deadline miss is the same miss
  as an absent bus, asserted with a fake provider that blocks.
- The resolution order is environment first, then keyring, and it is stated in
  `tool/docs/credentials.md` in those words. Environment first is what keeps a scheduled run, a
  container, and a CI job working with no keyring at all.
- `cairn auth set <name>` accepts one of the three variable names, reads the value from a prompt
  with echo off through `golang.org/x/term`, and writes it to the keyring. It never reads a value
  from argv, and a test asserts the command declares no value flag and no positional value
  argument. A second test asserts the command refuses a name outside the three.
- Every keyring call goes through `keyring.go` and nowhere else, asserted by a grep test over the
  module. Unit tests use the library's own mock rather than the live keyring, so the suite passes
  on a headless CI leg. The live path is exercised once on this pass's own Linux machine, against
  the running Secret Service, and the task report records that run. macOS and Windows are covered
  by the library's own support and by the mock-backed table, and the task report names them as
  untested on real hardware, which is the honest state and needs no attended sitting.
- `tool/docs/credentials.md` carries one section per platform. Linux and macOS: the three
  variables in a shell profile or a secrets file the operator sources, with the caution that a
  value typed at a prompt lands in shell history. Windows: user environment variables through the
  System settings pane or `setx`. Every platform: `cairn auth set` as the alternative that keeps
  the value out of any file the operator manages. The doc names where the keyring stores it:
  macOS Keychain, Windows Credential Manager, and the Linux Secret Service over D-Bus, which
  needs a running keyring daemon and an unlocked collection. The doc names no operator's own
  secret store as the product's source.
- **Verification on Geoff's workstation.** His three values come from the age store, which
  regenerates `~/.local/secrets`, and his shell sources that file, so his own setup uses the
  environment provider. Storing a value uses
  `~/.dotfiles/scripts/secrets/secret-set.sh` with scope and rotation recorded in
  `~/.dotfiles/secrets/registry.md`, and Claude runs `secret-receive` if a value has to come
  from Geoff directly, never a paste into chat. That is one operator's arrangement and is
  recorded here as this task's verification, not in the product docs.
- `go mod tidy` leaves exactly four direct requires, `github.com/spf13/cobra`,
  `github.com/zalando/go-keyring`, `golang.org/x/term`, and `golang.org/x/sys`, with every other
  line in `require` marked `// indirect`. The task report lists the indirect set, which includes
  the D-Bus library `go-keyring` pulls on Linux. This is the end-state assertion Task 1 deferred
  here.
- `x/term` is used for `term.ReadPassword` and nothing else. The grep test Task 19 carries
  forbids `term.IsTerminal` and `os.Stdout.Stat()` everywhere under `tool/`, this file included,
  because 1.0 has no TTY predicate.
- No command reads an environment variable except through `loadEnv`. A test greps `cmd/cairn` for
  `os.Getenv` and allows only `env.go`. Creating the chokepoint here rather than in Task 19 is
  what lets Task 10's probe command read nothing directly.
- Gate: `make -C tool check`. Commit.

### Task 10: Credential mint-and-probe. **This is Geoff's task.**

One sitting, attended. It is the only task in either pass that needs Geoff, and it is scheduled
here so Pass B never waits on him.

**Files:**
- Create: `tool/cmd/cairn/probe_token.go` (hidden subcommand `cairn probe-token` on Task 1's
  root)
- Modify: `tool/docs/credentials.md` (the permission groups a token needs, the endpoints the
  probe reached, and the retention window it observed)
- Modify: `~/.claude/docs/cloudflare-estate-inventory.md` (permission-group names and resource
  scoping, and the probe results, values-free; permission-group ids are not recorded, since
  listing them needs token-management scope neither token carries, added by conductor ruling
  2026-09-20). This one is Geoff's own workstation record and is not a product artifact.

**Produces:** the `probe-token` command, reading its three values through Task 9's `loadEnv` and
reporting which provider answered for each. It reads no environment variable directly, which
Task 9's grep test already enforces.

**Acceptance:**
- `cairn probe-token` reads its three values through `loadEnv`, prints the provider each came
  from by name and never its value, and for each endpoint the checks use prints the endpoint, the
  HTTP status, and the `Reason`. For each 200 it also
  prints the response body's top-level key set, names only and no values, which is what Task 17
  synthesizes its query fixture's shape from. It follows the same exit codes as `health`, so a
  rejected credential is CRITICAL and an endpoint it could not reach is UNKNOWN, and any non-200
  is therefore non-zero. No response body is written to a file or to a doc.
- **The product's token scope, stated once and documented.** The Cloudflare token carries read
  permissions for Workers Scripts, Workers Builds, Workers Observability, Zone, DNS, and Email
  Sending (corrected to seven groups, adding Zone Settings, by conductor ruling 2026-09-19: the
  HTTPS-forced check's own endpoints answer 403 without it), scoped to the account the operator
  pins with `CAIRN_CF_ACCOUNT_ID` plus all zones of that account. The GitHub token is
  fine-grained, with Contents and Metadata read on the
  repository of every site in the operator's registry, plus `glw907/cairn-cms` for the Engine
  check's changelog read, at the shortest expiry the operator can live with.
  `tool/docs/credentials.md` states both, with the reason a narrower GitHub scope is a silent
  failure: a check that cannot read a repository returns unknown on 403 forever.
- **The repository scope is discovered, never hardcoded.** `probe-token` reads the registry,
  verifies a contents read against every repository its records name plus the engine repository,
  and prints one line per repository with the status and reason. It exits non-zero if any of them
  is not 200. A test covers a registry of two records and asserts two repository lines plus the
  engine line, with no list of repositories compiled into the binary.
- **Public repositories prove nothing about scope.** A GitHub fine-grained token reads any
  public repository with no permissions at all, so `probe-token` marks each repository line
  public or private (the repos endpoint's own `private` field) and warns on stderr when every
  probed repository comes back public, since that run has confirmed nothing about the token's
  own scope (added by conductor ruling 2026-09-19).
- **Verification data.** Geoff mints both tokens for his own five repositories, which
  reconciliation row 30 names, and the probe prints a 200 for `commits/main` and
  `contents/package.json` on the four site repositories and for `contents/CHANGELOG.md` on
  `cairn-cms`. He stores the values through `~/.dotfiles/scripts/secrets/secret-set.sh` with
  scope and rotation recorded in `~/.dotfiles/secrets/registry.md`, which is the workstation rule
  for his own deployment and not the product's storage path. Claude runs `secret-receive` if a
  value has to come from Geoff directly, never a paste into chat.
- The probe run is recorded in `tool/docs/credentials.md` (which endpoints answered, with
  statuses and reasons only) and in the estate inventory (which permission groups exist under
  which names). The doc also records the Workers Logs retention window the probe observed, which
  Task 17 clamps `--since` to, and it states that the window is the account plan's and that an
  operator on another plan reads their own.
- If no read-level Builds group exists, the task report says so and Task 15's Builds half
  degrades per its own acceptance criteria, which is a runtime capability value and not a build
  tag.
- Gate: `make -C tool check`. Commit the probe command and the docs.

### Task 11: Pass A close

- Run `make -C tool check` on a clean clone in CI, all three legs green.
- Run `code-simplifier` over `tool/`.
- Dispatch `go-architecture-reader` once per touched Go package: `record`, `store`, `providers`,
  `spine`, `secrets`, `version`, and `cmd/cairn`. Seven dispatches, never batched. Fold the
  findings or record why not. The seams table pre-adjudicates every callerless export, so a finding naming one of
  those is answered by the table rather than by a code change.
- Run the `cairn-pass` end ritual: the STATUS entry, a `CHANGELOG.md` line under `## Unreleased`
  noting the `fixtures/` move in `create-cairn-site`, the setup brief marked, `ROADMAP.md`
  updated where this pass changed a tier. No release.
- Record both budgets: tokens against the 8M ceiling, and attended time as a planning-miss count
  plus an execution-sitting count.

---

## Pass `cairn-tool-B1`: the opening refactor, the checks, and the logs

Nine tasks: the opening refactor in two halves (Tasks 11b-i and 11b-ii), the six check-and-logs
tasks (Tasks 12 to 17), and the close (Task 17b). The pass ends with every 1.0 check written and
tested, no CLI over them, and Pass A plus B1 merged to `main` through PR #60.

**Ceiling 8M, checkpoint every four tasks** (after Task 13 and after Task 17). **Ceilings accepted
by Geoff, 2026-09-20.** The mechanics review of 2026-09-20 estimates B1's real spend at 9 to 9.5M
against that 8M ceiling, so **the 80 percent flag at 6.4M is the expected decision point rather
than an unlikely one**; the conductor plans for it landing at a segment boundary and writes STATUS
with a combined question there instead of treating it as an overrun surprise.

**Segments.** Tasks 11b-i, 11b-ii, 12, 13 | Tasks 14, 15, 16, 17 | Task 17b. Every boundary sits on
a commit the gate proved green. The two checkpoints fall on the first two boundaries. Task 17b
stands alone because the merge inside it is irreversible.

**Execution mode.** `pass-execute.js` with `cairn-implementer`, sequential, with the conductor's args
as the plan header states them (`gate: "make -C tool check"`, `gateLane: "light"`, `maxFix: 1`, no
`parallel`, and per task `gateTier: "docs"` plus the classifier-skip `notes` line). No task in this
pass is independent of another: Tasks 11b-i and 11b-ii share `tool/cmd/cairn/probe_token.go`, and
Tasks 13 through 17 all append to the literal slice in `tool/internal/health/health.go`, which is
the other contended file and which Task 12 creates.

**CI-leg confirmation belongs to the conductor at a segment boundary, never to a task's own gate.**
No task in this pass waits on a CI leg: a task's gate is the local `make -C tool check` string and
nothing else, because a task that blocks on a three-platform matrix turns every dispatch into a
poll. The conductor confirms the three `tool` legs green at the segment's final commit, before it
launches the next segment, and Task 17b's merge criteria carry the only never-merge-over-red rule.

**Branch.** The existing worktree `.claude/worktrees/cairn-tool-a` on branch `cairn-tool-a`. Not a
fresh branch off `main`, because `main` carries no `tool/` tree until Task 17b merges it.

**Gate.** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` for every task; Task 17 also
runs the Node gate, as one string in the same light lane, since the Node half it runs launches no
browser. Skip `scripts/checks/gate-tier.mjs` by pinning `gateTier`, per the header's blockquote.

**Geoff's three rulings of 2026-09-20 apply across both B1 and B2** and are recorded in the tasks
that read them rather than only here. Ruling 1, one TTY predicate, lands entirely in B2: Task 19a's
narrowed grep test and Task 20's profile-detection file, which is also where `loadEnv` gains
`NO_COLOR` and `TERM`. Nothing in B1 needs it, since B1 writes no output path. Ruling 2 is this
split. Ruling 3, the grammar cleanup, lands in B2's Tasks 18, 19a, and 22. The full text of all
three is in the "Conductor rulings recorded here" list under Self-review.

**Outside the brief, recorded for the owner rather than taken here.** Two items, and neither is a
task in this plan; each is a question for Geoff at a checkpoint or after the pass.

- **An `edge.hsts-off` condition id in the engine's conditions vocabulary.** Task 14's HSTS half
  wants one and `src/lib/diagnostics/conditions.ts` has none (re-verified 2026-09-20 at HEAD: the
  file carries `edge.https-not-forced` and no other `edge.` id). B1 does not add a condition id to
  the engine; the HSTS half declares `spine.ConditionNone` instead.
- **A publish-path condition id in the engine registry for a stale unpublished edit branch.** Task
  16's publish-path check declares `spine.ConditionNone` on its stale-branch Failing rather than
  `github.app-unreachable`, since a stale `cairn/*` branch usually means an unpublished draft, not
  a broken App (conductor ruling 2026-09-20). An engine-side condition id naming the unpublished-
  draft case, if the owner wants one, is not this pass's to add.

### Task 11b-i: the opening refactor, `providers` half

**Task 11b was split into 11b-i and 11b-ii at the three-lens review of 2026-09-20, along disjoint
Files.** 11b-i owns `tool/internal/providers` and the two `cmd/cairn` files that call it; 11b-ii
owns `spine`, `record`, `store`, `secrets`, `hygiene`, and the verdict-algebra deletion. **11b-i
lands first**, because 11b-ii's one reason-to-outcome translation reads the `reasonForStatus` this
half consolidates. The two halves keep the original task's criterion numbers, 1 to 14 here and 15 to
31 in 11b-ii, so a cross-reference elsewhere in this plan still resolves.

**The contended file is `tool/cmd/cairn/probe_token.go`**, which 11b-i edits for the context
parameter and 11b-ii edits to delete the verdict algebra. `tool/cmd/cairn/env.go` is touched by both
too, by 11b-i for the context parameter and by 11b-ii for the accessor split. Neither half is
independent of the other and the runner stays sequential.

Every item here came out of Pass A's seven `go-architecture-reader` reads. No behavior changes
except where a criterion says so. Invoke `go-conventions` before writing any Go file.

**Deliverable count: two groups** (the threaded context and the `providers` deduplication).

**Files:**
- Modify: `tool/internal/providers/transport.go`, `cloudflare.go`, `github.go`, `npm.go`,
  `probe.go`, `errors.go`, `cred.go`, and every `_test.go` beside them
- Delete or empty: `tool/internal/providers/missing_test.go`, whose only two tests
  (`TestMissing` and `TestMissingZeroValue`) criterion 12 deletes. `missing.go` itself stays.
- Modify: `tool/cmd/cairn/probe_token.go`, `probe_token_test.go`, `env.go`, `env_test.go`

**Acceptance, the threaded context:**
1. Every exported method on `providers.Cloudflare`, `providers.GitHub`, `providers.NPM`, and
   `providers.Probe` takes a `context.Context` as its first parameter. A test asserts this by
   reflection over each of the four types' method sets, so a method added later cannot omit it.
2. Every request is built with `http.NewRequestWithContext` from that context, and the 15 s
   per-request budget derives from `context.WithTimeout(ctx, requestTimeout)` rather than from a
   context the package invented. No non-test file under `tool/internal/providers` calls
   `context.Background()`, asserted by a grep test over the package.
3. `Probe`'s four `context.Background()` sites are gone; `Probe.Get`, `GetNoFollow`, `LookupTXT`,
   `LookupNS`, and `LookupA` each take the caller's context.
4. **2.0 seam kept on purpose: the threaded context.** A test cancels the context mid-request and
   asserts the call returns the context's error rather than the response, for one method on each
   of the four clients. The reason the seam is worth a signature break now: bubbletea gives a
   `Cmd` no per-Cmd cancellation, so a threaded context is the 2.0 HUD's only lever for stopping a
   stale generation's in-flight work, and after Pass B this break would cross every check.
5. Every caller in `cmd/cairn` passes the context it already holds. `cairn probe-token` still
   exits with its current codes on the same inputs, asserted by its existing tests passing
   unchanged except for the added parameter.

**Acceptance, the `providers` deduplication:**
6. There is one retry implementation, it lives in `transport.go`, and `client.Do` calls it rather
   than carrying its own copy. `probe.go`'s `doRetrying` is deleted in favor of it. A test asserts
   the single-retry-on-429-or-503 policy through both a credentialed client and the `Probe`, and
   `parseRetryAfter`'s and `isRetryableStatus`'s existing tables pass unchanged.
7. One raw GET helper replaces the three request preambles that duplicate today
   (`GitHub.get`, `NPM.get`, and `GitHub.TokenExpiry`), and its form returns the response headers,
   which is what `TokenExpiry` needs: it reads
   `github-authentication-token-expiration` off the response rather than building its own request.
   `TokenExpiry`'s behavior is unchanged, including the zero-time-no-error case for an absent
   header, proven by its existing table.
8. **One `reasonForStatus` function replaces the two hand-synced status switches** that exist
   today: the status arm of `classifyReason` (`errors.go`) and the whole of `classifyGitHubReason`
   (`github.go`). Both call sites read the same function, so a status the two disagreed about
   becomes impossible.
   - **`reasonForStatus` takes the response headers, not the status alone.** A 403 is ambiguous on
     its status: GitHub returns 403 both for a rate limit and for a missing permission, and the
     headers are the only discriminator. A 403 carrying `x-ratelimit-remaining: 0`, or a
     `retry-after` header, classifies as rate-limited and **never as a revoked or unauthorized
     credential**, because misreading a rate limit as a revoked token would make the `creds` check
     in Task 12 report a fault the operator cannot fix. A 403 carrying neither header classifies as
     a permission or credential reason as it does today.
   - A table test covers GitHub's two 403 shapes as **separate rows**, one rate-limit response with
     `x-ratelimit-remaining: 0` and one permission response with no rate-limit headers, and asserts
     the two classify differently. A `retry-after`-bearing 403 is a third row.
   - Every existing corpus-backed and direct classification test passes unchanged.
   - One new test asserts that **for a status whose classification depends on the status alone**
     (that is, every status but the header-discriminated 403), the Cloudflare and GitHub paths
     return the same `Reason`. The criterion is stated this way rather than as "classifies
     identically through both paths" because the 403 rows deliberately differ by header, and a
     blanket identity claim would be false the moment the header discrimination lands.
9. `NPMError` gains a `Reason` field populated through the same function, so a registry failure
   classifies like the other two providers rather than carrying a bare status.
10. `newClient` takes its `http.RoundTripper` as a parameter. The four constructors stop reaching
    into `c.httpClient.Transport` after the fact. A nil `RoundTripper` still means
    `http.DefaultTransport`, asserted by a test.
11. `errors.go` keeps `Reason`, its `String`, and `reasonForStatus`, which are shared by every
    provider; the Cloudflare-only pieces still in it (`APIError` and `classifyReason`) move into
    `cloudflare.go`, beside `v4Error`, `resultInfo`, and `v4Envelope`, which already live there
    (pre-flight, 2026-09-20). A test asserts `errors.go` names no Cloudflare-specific type.
12. The two dead wire fields go: `resultInfo.Page`, which `getPaginated` never reads because it
    appends `page=N` itself, and `v4Error.Message`, which no code path reads. The two vacuous
    `Missing` tests (`TestMissing` and `TestMissingZeroValue`, which assert only that a struct
    literal holds what was just assigned to it) are deleted rather than rewritten, which empties
    `missing_test.go`; delete the file rather than leave a package-clause-only file behind.
13. `APIError` and `GitHubError` satisfy one small interface exposing the classified `Reason` and
    the HTTP status, so `cmd/cairn` has one verdict function instead of `cloudflareVerdict` and
    `githubVerdict`. A test asserts both error types satisfy it and that the one verdict function
    produces the same level for each of the two today, which is what keeps `probe-token`'s output
    unchanged. The private severity algebra behind that level (`reasonLevel`, `precedenceRank`,
    `combineLevel`) is 11b-ii's to delete, not this half's: here the two verdict functions become
    one and the algebra it calls is untouched.
14. A nil `Resolver` passed to `NewProbe` means `net.DefaultResolver` rather than a nil-pointer
    panic on first lookup. A test covers the nil case.

**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit. The three CI legs are
the conductor's to confirm at the segment boundary, not this task's to wait on.

### Task 11b-ii: the opening refactor, `spine`, `record`, and the carried nits

The second half of the split Task 11b, over the packages 11b-i does not touch plus the two
`cmd/cairn` files it shares with 11b-i. It runs after 11b-i, because criterion 16's one
reason-to-outcome translation reads the `reasonForStatus` 11b-i consolidated. Invoke
`go-conventions` before writing any Go file.

**Deliverable count: three groups** (severity in `spine`, `record`'s single-source rewrite, and the
carried nits), plus one decision to record.

**Files:**
- Modify: `tool/internal/spine/outcome.go`, `outcome_test.go`
- Create: `tool/internal/record/parse.go`, `marshal.go`
- Modify: `tool/internal/record/record.go`, `record_test.go`
- Modify: `tool/internal/store/store.go`, `store_test.go`, `perm_windows_test.go`
- Modify: `tool/internal/secrets/secrets.go`, `keyring.go`
- Create: `tool/internal/hygiene/severity_test.go` (the one-severity-table assertion and the
  one-reason-to-outcome-translation assertion, beside the existing `buildtags_test.go` and
  `identicalfiles_test.go`)
- Modify: `tool/cmd/cairn/env.go`, `env_test.go`, `probe_token.go`, `probe_token_test.go`
- Modify: `.github/workflows/tool.yml` or `tool/Makefile`, for the Windows-leg decision below

**Acceptance, severity in `spine`:**
15. `spine.State`'s iota is `Unknown=0`, `OK=1`, `Failing=2`, which is not severity order, so
    ranking on the raw value is wrong. `State.Severity()` returns a rank in which Failing outranks
    Unknown and Unknown outranks OK, with a table test over all three states and over every
    pairing.
16. **One translation from `providers.Reason` to `spine.Outcome` exists, in `spine`, and it has a
    name.** Today `spine` has `APIReason` and `cmd/cairn` has `reasonLevel`, which is the second
    translation; after this task there is one, and it is a named exported function rather than a
    switch inlined at a call site, so the assertion in criterion 17 has something to name.
    - **A rate-limited reason maps to `Unknown`, never to `Failing`.** A rate limit is the tool
      being throttled, not the site being broken: a check that reported Failing on a 429 would page
      an operator for a condition on this side of the wire. A table row covers it, beside the
      revoked, expired, unauthorized, not-found, and timeout reasons.
17. **Two hygiene assertions, both in `tool/internal/hygiene`,** beside `TestNoBuildTags` and
    `TestGOOSPairsAreByteIdentical`, because no single package's own tests can see the whole
    module.
    - **Exactly one severity table exists anywhere under `tool/`.** It goes red if a second
      ordering of the three states, or of the exit levels, appears in any package.
    - **Exactly one reason-to-outcome translation exists anywhere under `tool/`,** and it is the
      function criterion 16 names. Enforce it the same way the severity table is enforced: either
      extend the one-table test in `hygiene` to cover it, or add a grep assertion there that no
      file outside `spine` switches on a `providers.Reason` value. The mechanism is the
      implementer's choice; the assertion existing is not, because a translation with no enforcing
      test is the exact shape of the duplicate this criterion removes.
18. `probe-token`'s private `verdict`, `reasonLevel`, `precedenceRank`, and `combineLevel`
    (`tool/cmd/cairn/probe_token.go`) are deleted in favor of the `spine` function. `probe-token`
    exits with the same code on the same inputs, proven by its existing exit-code tests passing
    unchanged.
19. `ExitCode`'s own mapping stays in `cmd/cairn` and is Task 21's, not this task's:
    acknowledgements and the `Degraded` flag enter at report level, which `spine` cannot see.

**Acceptance, `record`'s single-source rewrite:**
20. One table per typed object (`Record`, `GitHub`, `GitHubRepo`, `Cloudflare`) is the single
    source from which the parse path, the marshal path, and the key order all derive. It absorbs
    the eight slices that exist today, the four `typed*Keys` and the four `parsed*Keys` mirrors the
    Pass A drift guard added.
21. **The guard's one residual gap is closed.** Today a key added to `Parse`'s switch alone, and
    to no slice, passes the guard undetected. After this task a key that the parse path recognizes
    and the table does not cannot exist, because the parse path reads the table. A test proves the
    closure: adding a recognized key in only one place fails the suite. Write that test first and
    watch it go red against the pre-rewrite code, and record both runs in the task report.
22. `record.go` splits into `record.go` (the package doc and the types), `parse.go` (`Parse` and
    its helpers), and `marshal.go` (`Marshal`, `orderedFields`, and `writeObject`). One concern per
    file, per `go-conventions`. The current file is 540 lines carrying all three concerns.
23. Every existing test passes unchanged: each byte-equal round-trip, the reflection test that no
    typed field matches a secret key, and the sentinel test in which only `Marshal` output carries
    the sentinel. `order := []string{}` stays load-bearing in the object decoder, where `nil` is
    `Marshal`'s never-parsed sentinel; a test asserts a never-parsed object and an
    empty-but-parsed object still marshal differently.

**Acceptance, the carried nits from Pass A's fold reviews** (all non-blocking, all small, taken
here because this task already opens each file):
24. `store.Open`'s doc comment names the reparse point it now also refuses, not only a symlink and
    ownership.
25. `Open`'s inline `os.ModeSymlink` test is removed as redundant: `checkNotReparsePoint` refuses a
    symlink on every platform, so one of the two checks is dead weight. Whichever check survives
    runs first, and the symlink-refusal test in `store_test.go` still passes.
26. `perm_windows_test.go` stops shadowing the builtins `print` (its UTF-16 print-name buffer) and
    `real` (its junction target directory, twice), and replaces the pre-generics fixed-array cast
    `(*[1 << 15]uint16)(unsafe.Pointer(...))` with `unsafe.Slice`, which says the same thing
    without the magic bound. The Windows leg stays green; the junction test still fails by name
    when the reparse-point refusal is broken.
27. The `providers` package doc (in `cred.go`) drops "as later tasks add them", a process citation
    the Pass A comment sweep's four patterns did not match, and describes the package as it stands.
    This is the one `providers` file 11b-ii touches, and it is a comment-only edit, so it cannot
    collide with 11b-i's code changes in that package.
28. `secrets.ResolveError.Error()` stops formatting the wrapped provider error with `%v`. A
    backend that tainted its own error text would otherwise reach any caller that prints the
    error. The display path is already safe; this makes the error string safe too. A test with a
    provider whose error text carries a sentinel asserts the sentinel is absent from
    `Error()` and reachable only through `errors.As` and `Unwrap`.
29. `env.value(name)` in `cmd/cairn` is split so a secret variable read through the non-secret
    accessor is a compile error rather than a silent empty string.
30. `secrets.Provider.Get`'s doc comment stops saying `Resolve` wraps with `%w`; `Resolve` returns
    a `*ResolveError` carrying `Unwrap`, which is what the comment must describe.

**Acceptance, the Windows-leg decision to record:**
31. `make test` runs `go test ./...` with no `-v`, so a skipped test is invisible in the log and
    the junction test's proof rests on an unreferenced CI job log. Decide here whether the Windows
    leg runs the `store` package verbosely. **The task report names the decision and, where the
    change was taken, the diff line that carries it**, so a reader does not have to infer the
    decision from the absence of a change. If it does run verbosely, the change is one line in the
    Makefile or the workflow and the task report pastes the Windows leg's per-test output for
    `store`.

**Gate:** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit. The three CI legs,
including the Windows leg this task's decision concerns, are the conductor's to confirm at the
segment boundary, not this task's to wait on.

### Task 12: `health` skeleton, the check contract, and the `creds` check

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/health.go`, `report.go`, `report_test.go`, `clients.go`,
  `options.go`, `options_test.go`, `ack.go`, `ack_test.go`, `check_creds.go`,
  `check_creds_test.go`, `health_test.go`
- Modify: `tool/internal/spine/outcome.go`, `outcome_test.go` (the ordered `Fields` beside
  `Detail`; Task 11b-ii already opens this file, so 11b-ii runs first)

**Produces, as landed (the verdict's condition moved onto the Outcome; see this task's acceptance
below for why):** `type Clients struct{ CF *providers.Cloudflare; GH *providers.GitHub; NPM
*providers.NPM; Probe *providers.Probe; HaveCF, HaveGH, HaveBuilds bool; CFFrom, GHFrom string }`,
where the two `From` fields name the provider each credential resolved through. `type Check
interface{ ID() string; Needs() Tier; Run(ctx, record.Record, Clients, Options) spine.Outcome }`
with `Tier` one of `TierNone`, `TierCF`, `TierGH`, `TierBoth`. There is no `Check.Condition()`
method: a check's Outcome names its own condition per verdict (see below). `type Options
struct{ ErrorThreshold int; LogWindow time.Duration; Now func() time.Time; OnCheck
func(CheckResult) }`, the tunables the CLI exposes as flags, the sweep's own clock, and one
optional per-check callback, passed to every run so no threshold and no clock read is a literal
inside a check. `Options.Now` is validated: a zero `Options` (including a nil `Now`) is `Run`'s
own rejection error, per the acceptance below.
A verdict may declare `spine.ConditionNone`; `Run` records it and the remedy line is omitted.
`type Report struct{ SchemaVersion int; Site string; Domain string; Checks []CheckResult;
Degraded bool; Acknowledged []string }`. `type CheckResult struct{ ID string; Outcome
spine.Outcome; CheckedAt time.Time; Tier Tier; Acknowledged bool; AckExpires time.Time }`, with
no `Condition` field of its own: a result's condition is `Outcome.Condition`. `type Ack struct{
CheckID string; Expires time.Time }` and `type Acks []Ack` with `func (a Acks) Match(id string,
now time.Time) (Ack, bool)`. `func (r Report) JSON(verbose bool) ([]byte, error)`. `func
Run(ctx context.Context, r record.Record, c Clients, checks []Check, o Options, acks Acks)
(Report, error)`, with no separate `now` parameter: the sweep's clock is `Options.Now` alone.
`var All []Check`, a literal slice whose first member is the `creds` check and which Tasks 13
through 17 append to.

**A seam the HUD depends on: no non-test file under `tool/internal/health` or `tool/internal/logs`
may call `time.Now`, `time.Since`, or `time.Until`.** Both packages promise that a replay through
the same `Options.Now` (or the same `now` argument, for `logs`) produces a byte-identical result, and
a system-clock read inside either would break that promise silently, on any single run looking
correct. `internal/hygiene/wallclock_test.go`'s `TestNoWallClockReadsInClockFreePackages` parses
every non-test file in both packages and fails on a `time.Now`, `time.Since`, or `time.Until`
selector anywhere outside a doc comment.

**Acceptance:**
- **`spine.Outcome` gains an ordered `Fields`, and `Detail` stays.** `Fields` is a slice of a **new
  type declared in `spine`**, with the same shape as `record.ExtraField` (an ordered key plus a
  `json.RawMessage` value) and **not `record.ExtraField` itself**: `spine` imports `providers` and
  nothing else internal today (verified 2026-09-20 at HEAD), and the architecture's downward order
  gives it no `record` dependency, so reusing that type would add one for a two-field struct. A test
  asserts no file under `tool/internal/spine` imports `tool/internal/record`.
  **A renderer never prints one of these fields through a redacting `String()`.**
  `record.ExtraField.String()` deliberately prints `<N byte(s), redacted>` because a record's
  opaque tail can hold a secret; an outcome field is check output that Task 12's non-verbose filter
  already governs, so the new type carries no such method and a test asserts a rendered field shows
  its value. Copying `ExtraField` wholesale would have imported the redaction with it. So a renderer
  or the 2.0 HUD's detail view
  reads named fields rather than re-parsing a pre-formatted string, and a golden over it is
  deterministic in a way a map could not be. Every check in Tasks 13 to 17 that carries structured
  data puts it in `Fields`; `Detail` keeps the one-line human note. A test asserts the field order
  survives a round trip through `Report.JSON`. This was ruled here rather than deferred because
  the type is a slice beside an existing string field and the cost is one type plus its test; the
  alternative, recording `Detail`-as-a-string as a known 2.0 reshape in the hand-forward, is the
  fallback only if the ordered `Fields` cannot be landed inside this task.
- **2.0 seam kept on purpose: checks as pure functions over a site record.** The `Check`
  signature takes a record, injected clients, and the run's options, and returns an `Outcome`,
  with no store access,
  no globals, and no I/O beyond the clients. A test runs a slice holding the whole `All` set plus
  a deliberately stateful stub check twice against a recorded `RoundTripper` and asserts
  byte-identical reports. The stub makes the assertion go red at this task, where `All` is still
  nearly empty, so the test is proved rather than vacuous. Task 17 re-runs it over the complete
  `All`. 2.0's HUD calls the same functions per site with no wrapper.
- **2.0 seam kept on purpose: `health.Run` pure over its inputs.** The injected `Options.Now`
  makes the report reproducible; a test asserts two calls with a fixed clock, the same options,
  and the same acknowledgements are byte-identical.
- **Acknowledgements are data, applied after a check runs.** `Run` marks a `CheckResult`
  acknowledged when `acks.Match` finds an unexpired entry for its id, records the expiry, and
  lists the ids in `Report.Acknowledged`. A check never sees an acknowledgement, so the report
  stays honest about what it measured and only the exit mapping in Task 21 softens. An expired
  entry has no effect and the report names it as expired. A table covers an unexpired ack over a
  Failing check, an expired one, and an ack for a check id that does not exist, which is
  reported rather than dropped.
- **`Run` returns `(Report, error)`, and the zero `Options` rejection is that error.** `Options`
  carries no default inside a check. A test asserts `Run` called with a zero `Options` returns a
  non-nil error naming the field and a zero `Report`, so a caller cannot silently get a threshold of
  zero. Every other mention of `Run`'s signature in this plan, the seams table included, states the
  same two results; a criterion elsewhere that reads `Run` as returning a bare `Report` is stale and
  this one governs.
- **`Options` carries an optional per-check callback, `OnCheck`.** It is called once per check as
  that check settles, in completion order, with the settled `CheckResult`. `nil` means no callback
  and is the default every non-interactive caller passes. A test with a three-check slice asserts
  the callback fires exactly three times, once per check, with each id appearing once, and a second
  test asserts a nil callback runs the sweep unchanged. Task 21's `--verbose` one-line-per-check
  stderr output reads through this callback rather than wrapping `Run`, which is why the callback is
  a parameter of the pure function rather than a printing decision inside it.
- **Partial results survive a cancelled or expired context.** When the run's context expires or is
  cancelled mid-sweep, `Run` still returns a `Report` carrying every check that had already
  settled, with its real outcome, and marks every remaining check Unknown with a not-run reason
  rather than dropping it from the report. A test cancels the context after the first of three
  checks settles and asserts the report holds one settled result and two Unknowns with that reason.
  An operator whose run hit the deadline needs to know which checks answered before it did.
- The `creds` check is the first member of `All`, declares `TierNone`, and always runs. It calls
  `providers.Cloudflare.VerifyToken` and `providers.GitHub.TokenExpiry`, which are its 1.0
  callers. An invalid or revoked credential on either side is Failing with
  `reason.cred-revoked`. A GitHub expiry within 14 days is Failing with `ConditionNone` and
  `reason.cred-expiring`, the detail carrying the expiry date. An absent credential is Unknown
  with `reason.cred-missing`. An unreachable endpoint is Unknown with `reason.timeout`. The
  detail also names the provider each credential resolved through, `environment` or `keyring`,
  read from `Clients.CFFrom` and `Clients.GHFrom` and never the value itself. A test asserts the
  provider name appears in a non-verbose render and the value appears nowhere. An operator
  debugging a stale credential needs to know which store answered. Without
  this check, nothing fails before a token minted at the shortest acceptable expiry lapses, and
  the lapse then surfaces only as a scattering of per-tier unknowns.
- `Run` skips a check whose tier's client is absent, records Unknown with `reason.cred-missing`,
  sets `Degraded`, and never calls `Run` on it. **That is the whole of the exit-state disambiguation
  at report level:** an Unknown whose reason is a missing, unconfigured credential is exactly the
  Unknown that sets `Degraded`, and Task 21 reads `Degraded` to route it to WARNING while excluding
  it from the UNKNOWN trigger. A transport or other Unknown never sets `Degraded`. A test asserts
  `Degraded` is set for a cred-missing skip and clear for a report whose only Unknown is a timeout,
  which is what makes Task 21's table decidable from the report alone.
- A panicking check is recovered into Unknown with `reason.not-run`. The recovered value is never
  placed in the report or in an error string verbatim: the report records the check id and the
  panic value's type only. A test panics with a sentinel-bearing value and asserts the sentinel
  appears nowhere in `Report.JSON(true)`. `health` writes nothing itself, so `logx` stays
  `cmd/cairn`'s alone and the architecture's downward order holds.
- `Report.JSON(verbose bool)` is the only marshal path, and `Report` and every type it contains
  declare no `MarshalJSON`, asserted by a test, so a bare `json.Marshal(r)` cannot leak. The
  non-verbose filter is a key allowlist over every `Outcome.Fields` entry (`nonVerboseFieldKeys`
  in `report.go`): an entry whose key is outside the set is dropped, key and value. `Outcome.State`,
  `Outcome.Condition`, and `Outcome.Reason` are typed fields on the outcome itself, never filtered.
  Account ids, zone ids, worker names, repository slugs, build UUIDs, and full SHAs are
  verbose-only. `Outcome.Detail` is free text, passes through both renders unchanged, and must
  never carry a verbose-only value; a check puts such a value in `Fields` under a named key
  (conductor ruling 2026-09-20, replacing a regex filter over `Detail`). **As landed, `report.go`
  names every non-verbose-safe key by what it measures rather than by a category; the set grew as
  Tasks 13 through 17 each added their own fields.** The final `nonVerboseFieldKeys` set, verbatim:
  `errorCount` (errors), `openBranchCount` and `branchAgeDays` (publish-path), `releasesBehind` and
  `consumersMust` (engine), and `workerExists`, `buildsConnected`, `pushToDeploy`, `lastBuild`,
  `lastBuildAt`, `behind`, `lastBuildShortSHA`, `mainShortSHA` (deploy, per Task 15's Produces
  block, which also lists deploy's three verbose-only siblings: `lastBuildSHA`, `mainSHA`, and
  `buildId`). `errorsCheck`'s own `topEvents` field is verbose-only, carrying event names rather
  than a count. A check that emits a new non-verbose-safe field adds its key to the set in the
  same commit, with a test, and a key filter cannot shorten a value, so a check that wants a short
  SHA non-verbose emits it as its own field beside the full one.
- Conductor rulings of 2026-09-20 on this task, which govern over any earlier wording. A zero
  `TokenExpiry` means GitHub reported no expiry for the token (a classic PAT, an OAuth token, a
  non-expiring fine-grained PAT): the `creds` check is OK and its Detail says so, never Unknown,
  since Unknown would turn every scheduled run with such a token into exit UNKNOWN. Pass A's
  Task 7 line that says the check "reads that as unknown" is superseded, and the provider doc
  comment now agrees. An acknowledgement that matches a check in the sweep but has expired
  leaves `Acknowledged` false and records its expiry in `CheckResult.AckExpires`, which is how
  the report names it as expired; an expired acknowledgement for an id absent from the sweep
  follows the absent-id path and appears nowhere. `Report`'s shape is unchanged.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 13: Serving and Delegation checks, the two ports

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/check_serving.go`, `check_serving_test.go`,
  `check_delegation.go`, `check_delegation_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`), `tool/internal/providers/probe.go`
  and `probe_test.go` (the authoritative-nameserver lookup seam Serving's DNS diagnosis needs)

**Produces, as landed:** on `providers.Probe`: `type AuthorityLookup func(ctx context.Context,
nameserver, host string) ([]net.IP, error)`, the seam that asks a nameserver directly for a
host's own address records, bypassing the ordinary recursive resolver and its negative cache.
`func NewProbeWithAuthority(rt http.RoundTripper, resolver Resolver, authority AuthorityLookup)
*Probe`, `NewProbe`'s own constructor with the lookup given explicitly, the seam a test fakes to
exercise the propagation split with no network; `NewProbe` itself now calls it with a real dial.
`func (p *Probe) LookupAuthoritative(ctx context.Context, nameserver, host string) ([]net.IP,
error)`, bounded by the package's shared request timeout. `const RequestTimeout = requestTimeout`,
exported so a caller composing several lookups into one operation can derive a single shared
deadline from the same policy every other `Probe` method uses.

**Acceptance:**
- Serving ports `confirmHostname` exactly: `GET https://<domain>/` must be 200, and `GET
  https://<domain>/admin` with no redirect-follow must be 303 with a `Location` ending
  `/admin/login`. Any other pair is Failing with the ported vocabulary
  (`hostname-not-serving`, and `certificate-pending` on a TLS error), and the DNS diagnosis
  distinguishes `hostname-records-absent` from `hostname-resolver-lagging` the way the Node
  source at reconciliation row 11 does. Tests cover all five outcomes with an `httptest` server
  and an injected resolver. A bare 200 on `/admin` is Failing.
- Serving declares `spine.ConditionNone`, because `src/lib/diagnostics/conditions.ts` carries no
  id for it. `hostname-not-serving`, `hostname-records-absent`, `hostname-resolver-lagging`, and
  `certificate-pending` are `ReasonCode` values, not conditions.
- **The unreachable diagnosis discovers nameservers live first and falls back to the record's own
  saved pair only when that discovery answers with none,** because the record's saved
  nameservers can still hold a negative NS answer while Cloudflare's own nameservers already
  serve the apex record, and only the saved pair catches that case as resolver-lagging rather
  than records-absent. One deadline bounds the whole sweep across every nameserver tried, not a
  per-nameserver allowance, so a domain whose nameservers are all unreachable cannot hold the
  check for the deadline times the nameserver count. When neither source yields a nameserver, or
  every authoritative query fails outright, the outcome defaults to records-absent, the
  conservative default.
- Delegation ports `checkDelegation`'s four states, mapping `active` to OK, `propagating` and
  `pending` to Unknown with a park reason, and `wrong-nameservers` to Failing. It declares
  `spine.ConditionNone` for the same reason.
- Both declare their tier correctly, `TierNone` and `TierCF`.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 14: HTTPS-forced and Email checks

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/check_https.go`, `check_https_test.go`, `check_email.go`,
  `check_email_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Acceptance:**
- HTTPS-forced reads the zone's `always_use_https` and HSTS settings. Either one off is Failing.
  **The two halves declare different conditions, because the engine's vocabulary has an id for only
  one of them.** `always_use_https` off declares `edge.https-not-forced`, which
  `src/lib/diagnostics/conditions.ts` carries. **HSTS off declares `spine.ConditionNone`: there is no
  `edge.hsts-off` id, re-verified 2026-09-20 at HEAD, where `edge.https-not-forced` is the file's
  only `edge.` id.** Do not add a condition id to the engine in this task or this pass: a condition
  id is engine surface with a drift test and a remedy anchor behind it, and adding one from a tool
  pass would land it with neither. The HSTS half carries a `ReasonCode` and a detail line instead.
  An `edge.hsts-off` id in the engine is recorded under this pass's "outside the brief" notes as a
  question for the owner. A test asserts each half's declared condition, so the asymmetry is
  deliberate rather than a later reader's puzzle.
- Email runs two halves in order. Credential-free first: `_dmarc.<domain>` TXT must exist and
  its `p=` must not be `none`, with the policy quoted in the detail on a Failing; the SPF TXT at
  the domain's apex must include Cloudflare's Email Sending include; the DKIM selector TXTs
  must resolve. Then, with a Cloudflare client, the zone's sending subdomain must be verified.
  **As landed:** DMARC and SPF matching is case-insensitive, since DNS TXT values carry no case
  convention. A DNS transport-level failure is Unknown; only a `*net.DNSError` with `IsNotFound`
  true is treated as the record's absence. The DNS-hygiene half needs no Cloudflare credential
  and always runs regardless of tier; `emailCheck` declares `TierNone` and inspects
  `Clients.HaveCF` itself for the second half. When DNS is clean but no Cloudflare credential is
  available, the check reports Unknown `reason.cred-missing`, which sets `Degraded` by Task 12's
  one existing cred-missing rule. DKIM passes on any one of the six selectors it probes (Google's,
  Fastmail's rotation, and Microsoft 365's default pair). A sending subdomain Cloudflare has not
  yet onboarded declares `spine.ConditionEmailSenderNotOnboarded`, the only verdict this check
  names a condition for; a subdomain onboarded but not yet enabled parks as Unknown rather than
  Failing.
- The DMARC-is-TXT expectation and the DKIM selector names are ported from reconciliation row
  28, not invented.
- The test suite includes both live shapes: a `p=none` record is Failing and a `p=reject` one
  passes. Two of Geoff's four production sites carry `p=none` today, which is this task's
  verification data and the reason the acknowledgement feature exists: an operator with a known
  failing check acknowledges it with an expiry date rather than turning the check off. Task 19b
  carries the flags and Task 24 documents the workflow.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 15: Deploy check, with Builds state and the Behind state

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/check_deploy.go`, `check_deploy_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Produces:** `type DeployDetail struct{ WorkerExists, BuildsConnected, PushToDeploy bool;
LastBuild BuildState; BuildID, LastBuildSHA, MainSHA string; LastBuildAt time.Time; Behind bool }`, the
check's own internal value, **flattened into named entries on the outcome's ordered `Fields` rather
than carried as one struct**: `Fields` holds a key and a `json.RawMessage` per value, so a struct
placed in one entry would render as one opaque blob and Task 12's per-field non-verbose filter could
not reach inside it. The keys are enumerated here so the filter and the goldens have a fixed set,
**eleven in order**: `workerExists`, `buildsConnected`, `pushToDeploy`, `lastBuild`, `lastBuildSHA`,
`mainSHA`, `lastBuildAt`, and `behind`, then two short-SHA entries, `lastBuildShortSHA` and
`mainShortSHA` (the first seven characters), because Task 12's filter selects by key and cannot
shorten a full SHA, and finally `buildId` last, verbose-only like `lastBuildSHA` and `mainSHA`. This
task adds `workerExists`, `buildsConnected`, `pushToDeploy`, `lastBuild`, `lastBuildAt`, `behind`,
`lastBuildShortSHA`, and `mainShortSHA` to `nonVerboseFieldKeys`; `lastBuildSHA`, `mainSHA`, and
`buildId` stay verbose-only (conductor amendment 2026-09-20, from the Task 12 fix review): the two
full commit SHAs and the build id are each enough to look a build up on their own. `BuildState` is
one of `BuildOK`, `BuildFailed`, `BuildRunning`, `BuildNone`.

**Acceptance:**
- Worker absent is Failing. Builds not connected is Failing with
  `reason.api.builds-not-connected`, the 907-life outage shape: `BuildsConnections` returning an
  empty trigger list with no error, not a distinct API error code (a live probe on 2026-09-19
  found no such code; conductor ruling 2026-09-19). Tested with a handcrafted empty-list
  response, since the fixture corpus carries no captured body for this condition (conductor
  ruling 2026-09-19), not against the corpus body.
  **A failed last build is Failing before, and regardless of, the GitHub read:** the check settles
  the last-build verdict on the Cloudflare-side outcome alone and never measures `MainSHA` or
  `Behind` for a failed build, since a failed build is no more or less broken depending on whether
  GitHub answers. A failed last build is Failing with the build id in the fields. Running is Unknown with
  `reason.park.builds-running`. OK with `MainSHA == LastBuildSHA` is OK. OK with differing SHAs
  is OK with `Behind: true`, because Behind is a state of this cell and not a separate check.
- The check declares `spine.ConditionNone`, per the spec's table marking it new.
- The build id, the repository slug, and the full SHAs are verbose-only, which
  Task 12's filter enforces per field. A test asserts a non-verbose render of a Failing deploy
  carries the build state and the two short-SHA entries and none of the verbose-only values
  (the full SHAs, the build id, the repository slug), and a second test asserts all eleven keys
  appear in the order the Produces block lists.
- If Task 10 found no read-level Builds permission group, the Builds half is gated at runtime on
  `Clients.HaveBuilds`, which is false in that case, and the check degrades to worker-exists plus
  Behind with an Unknown carrying `reason.cred-missing` for the Builds half. No build tag is
  used, per `go-conventions`. The task report and the spec both record which path shipped. Task
  10's own report is the input: it found seven Cloudflare read groups available, Zone Settings
  included, so the expected path is the full check.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 16: Publish-path and Engine checks

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/check_publish.go`, `check_publish_test.go`,
  `check_engine.go`, `check_engine_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Acceptance:**
- Publish-path lists `cairn/` branches and the newest `cairn-cms[bot]` commit on `main`. It is
  Failing when any `cairn/*` branch is older than 14 days with no later bot commit, Unknown with
  `reason.not-observable` when there are no branches and no bot commits at all, and OK
  otherwise. The fields carry `openBranchCount` and one array-valued `branchAgeDays` field
  (oldest first).
- Publish-path declares `spine.ConditionNone` on every verdict, including the stale-branch
  Failing: a stale `cairn/*` branch usually means an unpublished draft an editor has not returned
  to, not a broken GitHub App, so declaring `github.app-unreachable` would misdiagnose the common
  case (conductor ruling 2026-09-20). A publish-path condition id for a stale unpublished edit
  branch is recorded under this pass's "outside the brief" notes as a question for the owner.
- Engine parses the site's `package.json` on `main`, reads the `@glw907/cairn-cms` range, and
  compares its declared range's base version to the latest published version. The fields carry
  `releasesBehind` and `consumersMust`, whether any skipped version's changelog section has an
  actionable `Consumers must:` line, read from this repo's `CHANGELOG.md` through GitHub with the
  same token. Behind by one or more with an actionable line is Failing; behind without one is OK
  with a detail; current is OK.
  **A `Consumers must:` clause counts as actionable unless its own text begins with the whole
  word "nothing"** (case-insensitively, followed by end of text or a non-letter, so "nothing."
  and "nothing else" are non-actionable but "nothingness" is not caught by the rule and is judged
  on its own words), **per every lead-in the changelog section carries** (a lead-in wrapped in
  backticks is a prose mention, not a real clause, and is skipped). Each clause is bounded at the
  next lead-in or the section's end, so two clauses sharing one paragraph are judged separately
  and any single actionable one makes the version actionable.
- Engine declares `spine.ConditionNone` on every verdict.
- Both checks read the repository of the site under test plus this engine's repository, which is
  the scope Task 10 states for the GitHub token and the scope its probe verifies against the
  operator's own registry. A test asserts a 403 maps to Unknown rather than OK, so a mis-scoped
  token is visible rather than silent. Geoff's five repositories in reconciliation row 30 are
  this pass's verification set.
- The changelog parse is tested against the post-`0.97.0` shape, per reconciliation row 21, and
  not against `## Unreleased` as it stands today.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 17: `logs` package and the Errors check

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/logs/logs.go`, `logs_test.go`,
  `tool/internal/health/check_errors.go`, `check_errors_test.go`
- Create: `packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.ok.json`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Produces, as landed:** `type Query struct{ Worker string; Since time.Duration; Event string;
Limit int }`. `type Entry struct{ At time.Time; Level string; Event string; Fields []Field }`,
where `Field` is `struct{ Key string; Value json.RawMessage }`. `func Fetch(ctx, cf
*providers.Cloudflare, q Query, now time.Time) ([]Entry, error)`. `func FetchLevel(ctx, cf,
worker, level string, since time.Duration, now time.Time) ([]Entry, error)`, `Fetch`'s own
level-filtered sibling and the health errors check's read path: it filters to `level` in Go
after the query returns, since the request's own filter grammar is unverified against the live
API. `func CountErrors(ctx, cf, worker string, since time.Duration, now time.Time) (int,
error)`, built on `FetchLevel`. Every one of these three takes `now time.Time` explicitly rather
than reading the system clock, per this pass's clock-free-package hygiene test. A sentinel
`ErrObservabilityOff` mapped from the API's response when the Worker has no observability
dataset: `fetch` classifies the underlying error as a `*providers.APIError` first, and only a
not-found or unclassified reason maps to `ErrObservabilityOff`; every other classified reason
(unauthorized, forbidden, rate-limited, and the like) passes through unchanged, since it is a
credential or transport problem rather than a sign about the dataset itself.

**Acceptance:**
- **`Entry.Fields` is an ordered slice, not a map.** Values stay unparsed as `json.RawMessage`.
  Go's map iteration order is unspecified, so any golden or JSON render over a map-typed field set
  would be nondeterministic; the ordered slice is what makes Task 20's log-view goldens stable. A
  test asserts a fetched entry's field order matches the order the response carried, and a second
  asserts no field is stringified during fetch.
- **The `--since` value grammar is stated once and shared with `health`.** A value is a positive
  integer followed by one of `m`, `h`, or `d`, meaning minutes, hours, or days, parsed by one
  function both commands call. `90m`, `24h`, and `7d` parse; a bare integer, a negative value, a
  zero, a float, and a unit outside the three are each an error naming the accepted grammar. A
  table covers every case, and a test asserts `health --since` and `logs --since` resolve through
  the same function. The grammar is Go's `time.ParseDuration` narrowed rather than widened,
  because `ns` through `s` are noise at a log window's scale and `d` is what an operator wants.
- **2.0 seam kept on purpose: the log query and entry shape.** `Fetch` returns entries
  newest-first with fields left as `json.RawMessage`, so no rendering choice is baked into the
  fetch, and 2.0's scrolling view consumes the same function as 1.0's printed list. A test
  asserts ordering and that no field is stringified during fetch.
- `Fetch` builds the telemetry query body with a filter on the JSON `event` key when set, and on
  `level` when counting. The corpus fixture this is tested against is **synthesized from the
  response shape** Task 10's probe printed, never captured: every editor email, ray id, account
  id, zone id, and worker name is a documented placeholder, and `provenance.note` records
  "synthesized from a live response's key set, no body captured". Engine log records carry an
  editor email on fourteen or more events per reconciliation row 15, `Entry.Fields` is verbatim
  JSON, and this repository is public, so a captured body would be in git history forever.
- `packages/create-cairn-site/test/fixtures-hygiene.test.mjs` from Task 3 passes over the new
  file, which is why this task runs the Node gate too.
- Errors counts `level: error` records over the window. Zero is OK. One through
  `Options.ErrorThreshold` is OK with the count and the top three event names in the fields,
  which is the advisory band: a single `auth.link.send_failed` or `config.invalid` record is a
  real signal and not a site-down signal. Above the threshold is Failing with the same fields.
  Without a threshold, a routine that alerts on Failing would alert most mornings, which is
  functionally the same as silent green. The threshold is a documented flag with a default of
  five, `--error-threshold`, carried on `Options` rather than as a literal in the check, so an
  operator with a noisier or quieter site sets their own. A table covers zero, the threshold
  exactly, and one above it, with the threshold read from `Options` and not from a constant.
  The `errorCount` field is present on every verdict that measured a count (zero, within the
  advisory band, and above the threshold alike); `topEvents` rides beside it but is verbose-only,
  since it carries event names rather than a count.
  Only the dataset-absent Unknown declares a condition: `ErrObservabilityOff` is Unknown with
  `spine.ConditionConfigObservabilityOff`. Every other verdict (zero, within the advisory band, or
  above the threshold) declares `spine.ConditionNone`, since the site is logging real errors and a
  remedy pointed at "turn observability on" would be wrong for the one verdict that means
  something is actually broken.
- `--since` is clamped to the Workers Logs retention window Task 10's probe observed and
  `tool/docs/credentials.md` records. A request past retention would return a short window that
  reads clean, so the clamp is what keeps the count honest. The default window is 24 hours and
  reaches the check through `Options.LogWindow`. The clamp value is a named constant with the
  observed window in its doc comment, and the comment says an operator on a plan with a longer
  retention can raise it, which is the honest form of a measurement taken on one account.
- **`cairn logs` output carries editor emails, so `logs` is implicitly verbose and says so.**
  Fourteen or more engine events carry an editor's email per reconciliation row 15, and
  `Entry.Fields` is verbatim JSON, so the printed output holds personal data whatever the operator
  passed. `logs` is one of the two implicitly verbose commands named in the global constraint
  beside `adopt list`, rather than hiding fields behind `--verbose` and shipping a log reader that
  omits the field an operator opened it for. **The stderr notice itself and its test move to Task
  19a's acceptance criterion 20**, which needs the `cmd/cairn logs` command this task does not yet
  build: that criterion covers both `adopt list` and `logs` together and is where the notice and
  its test now live. Task 20's `tool/docs/reference/json-output.md` marks the log payload as
  carrying personal data.
- Event names are read against the engine's union per reconciliation row 14, after polish-C's
  renames, not before.
- Re-run Task 12's purity assertion over the now-complete `All` and record the run in the task
  report. **`All` is now the complete 1.0 set, nine checks in report order:** `creds`, `serving`,
  `delegation`, `https-forced`, `email`, `deploy`, `publish-path`, `engine`, `errors`, the literal
  order `health.go`'s own `All` slice carries.
- Gate: one string in the light lane,
  `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check && npm test -w packages/create-cairn-site'`.
  The Node half is this one package's suite and launches no browser, so it belongs in the light lane
  with the Go half rather than queueing behind another session's browser gate. This is the second of
  the two tasks whose gate includes a Node suite. Commit.

### Task 17b: Pass B1 close, and the merge of PR #60

The close carries the merge Pass A deferred (Geoff, 2026-09-20: "extend-2 will be running for a
while. You can add the merge to the next pass"). Nothing else in B1 is irreversible, which is why
this task is its own segment.

**The close:**
- Run `make -C tool check` on a clean clone in CI, all three legs green.
- Run `code-simplifier` over `tool/`.
- Confirm the three `tool` CI legs green at the pass's final commit before anything below runs.
  This is the conductor's confirmation, the one no task's own gate waits on.
- Dispatch `go-architecture-reader` once per touched Go package: `health`, `logs`, `spine`,
  `record`, `providers`, and `store`. Six dispatches, never batched. The seams table
  pre-adjudicates every callerless export, so a finding naming one of those is answered by the
  table rather than by a code change.
- Run the `cairn-pass` end ritual: the `docs/STATUS.md` entry, a `CHANGELOG.md` line under
  `## Unreleased`, and `ROADMAP.md` updated where this pass changed a tier. No release, and no
  version bump.
- Record both budgets: tokens against the 8M ceiling, and attended time as a planning-miss count
  plus an execution-sitting count.

**The merge, as acceptance criteria:**
1. Merge `main` into `cairn-tool-a` before touching the PR. **The conflict set is measured, not
   predicted** (2026-09-20, at 59 commits of `main` ahead of the merge base): the files both sides
   have touched are `CHANGELOG.md`, `ROADMAP.md`, `CLAUDE.md`,
   `.github/workflows/create-site.yml`, and `.github/workflows/test.yml`, and `git merge-tree`
   reports a content conflict in `CHANGELOG.md` today. **`docs/STATUS.md` is not in the set: this
   branch has never touched it** (`git diff --name-only $(git merge-base HEAD origin/main) HEAD`),
   so a resolution there would be inventing one. Re-measure with that command and `git merge-tree`
   before merging, since `main` moves under extend-2. **Keep every pass's entries.** A
   resolution that drops another pass's changelog line or roadmap item is a failed
   resolution, not a merge preference. Read the merged result of each conflicted file and
   confirm each pass's entries are present before proceeding.
2. Retitle PR #60 so its title covers Pass A and Pass B1, not only Pass A's module skeleton.
3. Take PR #60 out of draft.
4. **Wait for the real green set at the final SHA, enumerated rather than counted.** Eight checks
   are expected, and the reason is the branch's own diff: PR #60 touches
   `packages/create-cairn-site/**`, `scripts/checks/**`, `src/tests/**`, and `.github/workflows/**`
   beside `tool/**`, and every Node workflow filters on `paths-ignore: ['tool/**']` rather than on a
   `tool/`-only allowlist, so each one fires on those non-`tool/` paths. Verified 2026-09-20 in
   `.github/workflows/`:
   - `tool`, three legs (`make check (ubuntu-latest)`, `(macos-latest)`, `(windows-latest)`)
   - `test`
   - `create-site`
   - `design`
   - `scaffold`
   - `e2e`

   The three workflows that do not fire, also verified: `publish.yml` (release-triggered),
   `tsgo.yml` (scheduled), and `norms.yml` (`workflow_call` and `workflow_dispatch` only).
   Re-read the run list at the final SHA rather than trusting this enumeration, since `main` may add
   a workflow; the enumeration is what tells you whether a check is missing rather than merely slow.
   **Never merge over a red check.** A red leg is a stop, and the fix
   is a commit on the branch followed by another wait, not an override.
5. Merge the PR.
6. Confirm `main` carries `tool/` after the merge, by reading the merged tree rather than assuming
   the merge implies it. `main` carried no `tool/` tree before this task, verified 2026-09-20.
7. **Coordinate with the extend-2 conductor.** Two conductors never both run a close, a merge, or
   a release on one branch, and a merge into `main` while another pass is merging into `main` is
   the contended moment. If extend-2 is mid close on any file in the measured conflict set, wait for
   its commit, verify it, then merge. One sentence to Geoff beats a race.
8. The task report records the final SHA, every check's name and result at that SHA, the merge
   commit, and each conflicted file's resolution with the entries it kept from each pass.

**Recorded for the close (17b).** Observations from B1's own work that belong to no task here, kept
so the close and a later pass do not rediscover them from scratch.

- Go's resolver consults `/etc/hosts` before the authoritative dial
  `providers.Probe.LookupAuthoritative` performs, so a machine with a local hosts-file override
  for the probed domain would see a diagnosis that does not reflect the live DNS.
- A DNS transport failure (a down resolver, an offline machine) reports Unknown under
  `reason.timeout` in the checks that read `providers.Probe`, which misdescribes a resolver that
  is merely refusing rather than timing out; the two failure modes share one reason today.
- A `Consumers must:` changelog clause whose own text opens with "nothing" (and the variants Task
  16 states) reads as non-actionable by a fixed rule; a clause that says "nothing" but means
  something an operator should still read would be missed by that rule.
- `tool/docs/*.md` files (`credentials.md` at least) cite task numbers from this plan directly,
  which will read as stale once the plan itself is archived history.
- `check_engine.go`'s releases-behind count reads the declared dependency range's base version
  from `package.json` rather than the resolved version a lockfile would carry, so a site pinned
  loosely reports behind-ness relative to its floor, not its installed version.
- `logs.CountErrors` and `logs.Fetch` have no non-test caller as of B1's close: `health`'s errors
  check reads `logs.FetchLevel` directly. Both remain 2.0 seams, per the seams table, exercised
  only by their own package tests until a HUD or a `cairn logs --event` caller lands.

## Pass B1 post-mortem (2026-09-20)

**What was built.** Nine tasks (11b-i, 11b-ii, 12 to 17, 17b), on the `cairn-tool-a` worktree.
The commit range from Pass A's close (`4d4728d7`) to Pass B1's close carries 49 commits and
touches 82 files (9,966 insertions, 1,469 deletions). The `health` package's nine checks
(`creds`, `serving`, `delegation`, `https-forced`, `email`, `deploy`, `publish-path`, `engine`,
`errors`), the `logs` package, `context.Context` threaded through every `providers` call, an
authoritative DNS lookup in `providers`, and the `spine`/`record` refactors carried over from
Pass A's known residual.

**Process.** The pass ran from the 2026-09-20 recut brief, with a three-lens plan review folded
into one revision. Each segment opened with a factual pre-flight against the code: segment 1
checked 34 claims and found one false, segment 2 checked 19 claims and found one stale anchor,
and the close checked five claims and made five corrections. Two `pass-execute` runs drove the
segments on the light gate lane, with `gateTier: "docs"` pinned on every task.

**What the gate and reviews caught.** Segment 1's Tasks 12 and 13, and all four of segment 2's
tasks, passed the gate and were escalated by the diff reviewer for a conductor decision. The
gate itself caught none of the pass's real defects; the diff reviewer did, on every escalated
task. The defects found: a DMARC `p=None` read as OK; a DNS outage reported as Failing; a GitHub
outage masking a failed build; the build id dropped entirely; every telemetry API error read as
"observability off"; an error count that trusted an unverified server filter; `credsCheck`
reading the wall clock through `time.Until` while a hygiene test only banned `time.Now`; a
changelog clause parser that found one clause per paragraph; a test row that passed whichever
nameserver source the code used; the non-verbose allowlist silently dropping `topEvents`; and
`Keyring.Set` unbounded by the deadline `Get` had.

**Rulings taken during execution (the conductor's).**

- A verdict's condition lives on `spine.Outcome.Condition`.
- `https-forced` is one check with two halves.
- The sweep's clock is `Options.Now`, and a hygiene test bans `time.Now`, `time.Since`, and
  `time.Until` in `health` and `logs`.
- Field visibility is set where a field is produced (`verboseField`).
- `Detail` never carries a verbose-only value.
- A zero GitHub `TokenExpiry` is OK.
- An expired matching acknowledgement records `AckExpires` and softens nothing.
- The unreachable diagnosis discovers nameservers first and falls back to the saved pair.
- Email's DNS half needs no credential.
- The `Consumers must:` rule: a leading whole word "nothing", a clause bounded at the next
  lead-in, and a backticked lead-in counts as a mention.
- Publish-path declares no condition.

**A conductor error worth recording.** The first `Consumers must:` ruling, an exact match on the
text "nothing" alone, was too strict: it would have reported a false Failing for most sites a
few releases behind. The implementer's check against the real `CHANGELOG.md` exposed the
mismatch, and the ruling was corrected the same session.

**What a later pass would be wrong to rediscover.**

- A sonnet implementer's first pass cleared the gate every time and still needed a
  reviewer-driven fix round on every task but one, so the diff review, not the gate, is where
  this module's defects surface.
- A plan criterion that names an engine condition should be checked against that condition's
  remedy text.
- The root `npm test` launches a browser and must not take the light gate lane; only `make -C
  tool check`, lint-only runs, and a Node-only workspace suite may.
- One kitty window per screenshot is not acceptable on the owner's desktop.
- The health checks are wired only from their own tests until Pass B2 adds `cmd/cairn`'s
  `health` command: `NewProbe` and `NewNPM` have no non-test caller.

**Both budgets.** The ceiling was raised from 8M to 10M by Geoff on 2026-09-20. Spend: about 8.9M
of the 10M ceiling (1.1M plan work, 2.03M segment 1, 0.8M its fixes, 1.54M segment 2, 1.3M its
fixes and reviews, 2.1M the close). Attended-time score: planning misses 3 (the `Consumers must:`
ruling, the app-unreachable condition, the stale-cache gate); execution sittings 2 (the ceiling
raise, the merge word).

**Carried to Pass B2.**

- The render design track (a capability survey at `tool/docs/design/charm-v2-capabilities.md`,
  three mockup iterations, six reviews, and a copy standard) fed the 2026-09-20 amendment, which
  Geoff pre-approved. Everything it produced now lives under `tool/docs/design/`.
- `State` marshals to JSON as a bare integer that inverts against exit codes.
- Usage errors do not exit 3 today. **Measured at HEAD on 2026-09-20 against a fresh `go build`,
  which corrects the carried claim that they exit 0**: `cairn --nope` exits 1, `cairn frobnicate`
  exits 1, `cairn auth set` with no argument exits 1, and `cairn health` (no such command yet)
  exits 1, because `main.go:14` exits 1 on every error. The one zero is `cairn auth` alone, a
  command group with no `RunE`, which prints help and exits 0. The 2026-09-20 agent review
  measured exit 0 for `cairn frobnicate` against the Pass A binary built 2026-09-14, which
  predates B1's `Args: cobra.NoArgs` on the root.
- `Detail` strings are machine tokens, to be replaced by catalogue prose with the token carried
  on `Condition`.
- A typed code slot for a Failing verdict is still owed.
- `cmd/cairn` should return a typed exit error from `RunE` rather than calling `os.Exit` inside
  it, split its files by concern, and move `combineState` and `exitCodeFor` into `spine`.
- `secrets` now has the deadline helper and the not-found-versus-unavailable classification that
  `auth unset` needs.

---

## Pass `cairn-tool-B2`: the CLI surface, the render, the 1.0 cut, the release, and the tripwire

Twenty-one tasks, the last three added with segment 5 on 2026-09-21. The pass ends with `cairn
health` honest against every site in a registry at a
terminal, in a pipe, and as JSON, `cairn` 1.0 released as a tag with six prebuilt binaries and a
working `go install`, and a documented scheduled run that alerts on a non-zero exit. The pass's own
verification is Geoff's four production sites, his installed binary, and his systemd timer's first
unattended firing.

**Ceiling 14M**, accepted by Geoff on 2026-09-20 (evening) with the design amendment, since raised
to 18M and then to 20M (see below). **The
2026-09-20 night three-lens review grew the task count from thirteen to seventeen through four
sizing splits and one move, and added no scope**; the header states each split and its reason. The
2026-09-21 overnight fix round then added Task 20b-iii as an eighteenth, itself a sizing split of
carried-forward render fixes rather than new scope; see the overnight run record below. If the 80%
flag trips at a segment boundary, the cut point for a pass split is after the render segment, that
is after Task 20b-ii.

**Overnight run record (2026-09-21).** Segments 1 to 3 landed and were accepted: 19c-i `5a04ae69`;
18 `b536d4bf`; 19a-i `de94c682`; 19a-ii `d3877903`; 19b `8e89353a`; 19c-ii `718dad50`; residual
tests `fb2c164c`; 20a `82d88969`; 20b-i `d0f011f8`; 20b-ii `37a8b57d`; the segment 3 fix round
`280e61f6`, `5ee0966a`, `c373a3fe`, accepted by an independent diff review with the build and tests
re-run green. The run stopped at the named pass-split cut after 20b-ii, at about 10.5M of the 14M
ceiling, because segment 4 (20c, 21, 22a, 24a) would cross the 80 percent flag. Segment 4 runs in a
fresh session with both pre-flights first.

**Ratified in the fix round**, and carried into every later criterion that touches these surfaces:
`github.com/clipperhouse/displaywidth` is a fourth direct require (ADR-0002); `DetectProfile`
returns a `Terminal` struct whose `TTY` field alone selects the plain body; `RenderInput.FailingOnly`
filters rows after the tally; the engine outcome carries the installed version as a field and the
creds outcome the GitHub token expiry. Task 20a's criterion 1 is corrected below to say four direct
requires, naming the module.

**Carried into segment 4.**
1. **Task 21** recuts every many-sites and single-site golden where a site's only failures are
   WARNING-class, because the WARNING tier changes site verdicts (in the twelve-site fixture,
   `cairn.pub` and `xcathletes.org` show only the amber mark yet read CRITICAL today, which is
   correct only until the per-check severity table lands).
2. **Task 20b-iii**, a new task and the first of the segment so it lands before Task 21 recuts
   goldens, carries the many-sites fix-list, fixture-completeness, credential-expiry-test, and
   `--width`-validation fixes the segment 3 fix round surfaced. It is a sizing split from the
   render carry-ins rather than folding them into Task 20c, because they touch `body_many.go` and
   `root.go`, not the JSON contract Task 20c ships; its criterion count (five) against Task 20c's
   existing seventeen is why the split rather than the fold. See its own section below.
3. **Task 22a's editorial gate** owes the strings its own criterion 8 note lists.
4. **Task 22a's try-it note** owes the owner both the real terminal and, if still present, three
   offscreen frames from the overnight run.

**Ceiling raised to 20M** by Geoff on 2026-09-21; the 80 percent flag is 16M. **The flag has
already been passed**, and Geoff's grant of the same day is what the pass runs on: proceed up to,
never including, the tag push. The owner gate before Task 22b is still where the pass stops.

**Segment 4 run record (2026-09-21).** Five tasks landed: 20b-iii, 20c, 21, 22a, 24a. Task 20c was
accepted on its first review. The other four were closed by one consolidated Opus fix round,
`d7b56664`, `b2e87031`, `ae76c1ab`, `6e8d38e8`, reviewed by an independent `diff-reviewer` dispatch
over the fix round's own diff, with the gate re-run green against the worktree by absolute path.
The segment cost about 3.9M.

**The task table.**

| # | Task | Title | Segment | Owner-gated | Status |
|---|---|---|---|---|---|
| 1 | 19c-i | The `health` and `spine` messages tables, the fix table, and the copy gate | 1 | no | done |
| 2 | 18 | `adopt`, and the exit-code arithmetic | 1 | no | done |
| 3 | 19a-i | The cobra tree, the grammar, the file split, and the signal path | 1 | no | done |
| 4 | 19a-ii | `auth unset`, the registry query, and the multi-site sweep | 2 | no | done |
| 5 | 19b | Acknowledgements, the non-interactive credential path, and completions | 2 | no | done |
| 6 | 19c-ii | The `cmd/cairn` messages table and the error boundary | 2 | no | done |
| 7 | 20a | `render` foundations: palette, glyphs, rungs, sanitizer, theme | 3 | no | done |
| 8 | 20b-i | The single-site body, the plain body, the ranking, and the fixtures | 3 | no | done |
| 9 | 20b-ii | The status strip, the log body, the status line, and the golden corpus | 3 | no | done |
| 10 | 20b-iii | The many-sites fix list, fixture completeness, credential expiry test, and `--width` validation | 4 | no | done |
| 11 | 20c | The `--json` contract and the published schema | 4 | no | done |
| 12 | 21 | The WARNING tier, usage errors, the error surface, `cairn help agents`, the scrub | 4 | no | done |
| 13 | 22a | The 1.0 cut up to the tag, and the release candidate | 4 | no | done |
| 14 | 24a | The scheduled run, documented for three schedulers | 4 | no | done |
| 15 | 22a-ii | The editorial fixes and fixture truth | 5 | no | done |
| 16 | 21b | The fifth wire word, hold expiry, the quiet sweep, and `--theme` | 5 | no | done |
| 17 | 21c | `cairn auth check`, and the release candidate rebuilt | 5 | no | done |
| 18 | 22b | The `tool/v1.0.0` tag | 6 | **yes** | |
| 19 | 23 | Release artifacts, attestation, the man page, `go install` from a clean machine | 6 | **yes** | |
| 20 | 24b | The owner's own timer, installed and fired | 7 | **yes** | |
| 21 | 25 | Pass B2 close | 7 | **yes** | |

**Segment 5 was cut on 2026-09-21** from Geoff's rulings on the owner list below, which changed
three surfaces the 1.0 freeze would otherwise have locked. It is three tasks and no more, and it
ends where segment 4 ended: a release candidate in the owner's hands and no tag.

**Segment 5 run record (2026-09-21).** Task 22a-ii landed as `4e519d4e`. Task 21b's first
implementer died on a network failure, and the runner then ran Task 21c out of order, as
`4e0bd5cd`, `fccd0562`, and `48212894`; 21c's implementer found that dead run's uncommitted,
non-compiling partial 21b work in the worktree and reverted it to HEAD rather than finish work
outside its own task. Task 21b was then re-run alone, from HEAD, as `a7f6cba3`. One consolidated
fix round followed, as `bb4773b0`, `0867ec8f`, and `08114b81`, carrying the reviewer findings on 22a-ii and
21c plus the three fragments 21c could not write before 21b existed (the CHANGELOG's `--theme`
and quiet-sweep lines, the regenerated man pages, and the verification checklist's `--theme
light` item). All three tasks are done.

**Task 19c-i runs first although its number sorts last among the 19s.** Every other task's
operator-facing strings come from the tables it builds, and a task that ships a string before the
table exists writes prose at a call site, which is the one thing the copy standard forbids.

**Segments.** 19c-i, 18, 19a-i | 19a-ii, 19b, 19c-ii | 20a, 20b-i, 20b-ii | 20b-iii, 20c, 21, 22a,
24a | 22a-ii, 21b, 21c | 22b, 23 | 24b, 25. Every boundary sits on a commit the gate proved green. **A checkpoint is
written at every segment boundary**, which lands every two to four tasks and so never exceeds the
four-task interval. The last two segments are short under the sizing rule's own override, which an
irreversible task and a human gate both trigger.

**The owner gate, which is where an unattended run stops.** Tasks 22b, 23, 24b, and 25 are
**OWNER-GATED**. They run only after Geoff has built Task 22a's release candidate, run it in his
own terminal against his own sites, and said go. Task 22b pushes `tool/v1.0.0`, which is published
and permanent; Task 23 publishes a release on it; Task 24b installs and arms a timer on his own
machine against his own credentials; Task 25 merges the branch that tag lives on. Each of the four
opens with the same first criterion, stated in the task itself rather than here alone, because the
runner has no owner-gate concept and a rule reaches an executor only through its own dispatch.

**The owner's go.** Geoff gave the go on 2026-09-21 at about 11:50 AKDT for Tasks 22b, 23, 24b,
and 25, and ruled that release candidate verification is the conductor's work. The conductor's own
conditions before the tag: segment 5 accepted with the gate green by absolute worktree path; the
`tool` workflow green on the pushed branch head across its platform legs; the real-terminal run
against his four sites graded by a fresh-context verifier with no structural finding. Any failure,
or a finding that is taste and not defect, stops the tag and goes to Geoff.

**The overnight launch task list, stated explicitly so a launch does not derive it**: `19c-i`,
`18`, `19a-i`, `19a-ii`, `19b`, `19c-ii`, `20a`, `20b-i`, `20b-ii`, `20c`, `21`, `22a`, `24a`.
Thirteen tasks, ending at 24a. Tasks 22b, 23, 24b, and 25 are not in the launch list and are
dispatched only after the owner's recorded go.

**Execution mode.** `pass-execute.js` with `cairn-implementer`, sequential, with the conductor's
args as the plan header states them (`repo`: `.claude/worktrees/cairn-tool-b2`, `gate`: `"make -C
tool check"`, `gateLane`: `"light"`, `maxFix`: `1`, no `parallel`). No task in this pass is
independent of another: Tasks 19a-i, 19a-ii, 19b, 19c-ii, 20b-i, 20b-ii, 20b-iii, 20c, and 21 all
edit `tool/cmd/cairn/root.go` and `tool/cmd/cairn/main.go`; Tasks 20a, 20b-i, 20b-ii, and 20c all edit
`tool/internal/render/`; Tasks 20b-i and 20b-ii share `golden_test.go` and `testdata/golden/`;
Task 18's functions are what 19a-i's `adopt` command calls and its `ExitCode` is what 19a-ii and 21
call; Task 19c-i's tables are what every later task's strings come from; and Tasks 22a, 22b, 23,
24b, and 25 are a strict chain. **Every gate string a dispatch carries names the worktree by
absolute path**, restated below because it is the one gate failure a report cannot show.

**Every gate string in a dispatch names the worktree by absolute path**: `make -C <absolute
worktree path>/tool check`, never the relative `make -C tool check`. An agent thread's working
directory resets between shell calls, so a relative `-C tool` resolves against the main checkout
and proves the wrong tree. It happened once in segment 4, and a green gate over the wrong module
is the one gate failure a report cannot show.

**Suggested model per task**, passed explicitly at dispatch. `opus` for the cobra tree and its
grammar (19a-i), the render bodies (20b-i, 20b-ii), the JSON contract (20c), and the exit-code
arithmetic (18); `sonnet` for every other task. A dispatch that names no model falls to the
settings default, which is why each is named.

**Gate tier.** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` is every task's gate.
**PR #68 (`chore/gate-tier-tool-rule`, "give gate-tier a tool tier for the Go module") merged
2026-09-20**, so `scripts/checks/gate-tier.mjs` now carries a `tool` tier and no B2 task pins
`gateTier`. The classifier prints `make -C tool check` for a tool-only diff, and for a mixed diff
the npm tier's own string plus ` && make -C tool check`. A mixed diff whose npm half includes the
root `npm test` must NOT take the light lane, because that suite launches a browser; run it
unlaned. Tasks 23, 24b, and 25 are the three whose diffs reach outside `tool/`; each states its own
lane.

**Note for reviewers, 2026-09-21: the resolved gate string is not a bare command.** The runner's
resolved gate string carries the classifier's preamble and file list before the command itself, so
a string that merely ends in the same `make -C tool check` command is no mismatch and never a
blocking `diff-reviewer` finding.

**The note every B2 dispatch carries, verbatim.** One line, restated in each task below because a
subagent starts with zero context:

"Never invent operator-facing copy. Every operator-facing string comes from the messages table and
`tool/docs/design/copy-standard.md`. A string the catalogue lacks goes in your report under 'New
operator-facing strings' for an editor; do not write prose at a call site."

**A factual pre-flight runs before each segment launches**, as in B1: one cheap agent lists every
checkable claim the segment's tasks make about existing code, checks each at HEAD, and reports the
false ones before any implementer dispatches.

**CI-leg confirmation belongs to the conductor at a segment boundary, never to a task's own gate.**
The exceptions are the two tasks whose deliverable is a CI result: Task 22b's tag push, which waits
on green by its own criterion, and Task 23's release job, which fires on that tag.

**Branch.** `.claude/worktrees/cairn-tool-b2` on branch `cairn-tool-b2`, off `main`, after Task
17b's merge landed. `tool/Makefile`'s `test` target runs `go test -count=1 ./...` (verified
2026-09-20 at HEAD), because the drift tests read files outside the module and the test cache does
not track those as inputs.

**Geoff's ruling 3 of 2026-09-20, the full grammar cleanup, governs this pass**: `cairn sites
list` with bare `cairn sites` as an alias; `adopt list` as a distinct non-writing subcommand
replacing the `adopt --list` mode flag; the hidden `probe-token` becomes `auth probe`; and `auth
unset` is added so a rotated token's stale keyring entry can be cleared. `adopt` keeps its shape,
and the 2026-09-20 amendment gave `health` a second shape, bare, which sweeps every site.

**The fixed vocabulary this pass ships**, ruled by Geoff on 2026-09-20 and enforced by Task 19c-i's
gate. The verdict words are `OK`, `WARNING`, `CRITICAL`, `UNKNOWN`, capitals, from the monitoring
convention. A check result is `pass`, `fail`, `skip`, `unknown`, or `held`, **five words**, by
Geoff's ruling of 2026-09-21, which reverses his 2026-09-20 "four words and no fifth". `skip` means
a check was not attempted, by configuration: a credential the operator has not set. `unknown` means
a check was attempted and observed nothing: a timeout, a transport failure, or a rate limit. Task
21b ships the fifth word, and every surface carrying the vocabulary is its deliverable. Section
labels are `failing`, `could not run`, and `held`. The action that clears a failure is a `fix`,
never a remedy; the plain body's key is `fix:`. The many-sites list is labelled `what to fix`. The
thing checked is a `site`. The check id stays `engine`, and `engine` alone never means the
installed version. The command stays `adopt`, which overrides the copy standard's own `add` row in
section 2.9: the standard graded the word, and the owner ruled the command name. The three
environment variables are `CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, and `CAIRN_GH_READ_TOKEN`;
every mockup that wrote `CAIRN_CF_TOKEN` was naming a variable the tool does not read.

**Where the catalogue and this plan disagree, the plan wins.** `tool/docs/design/copy-standard.md`
is binding on grammar and register, and this plan's ruled vocabulary is binding over it on three
rows, each of which the catalogue still carries in its own text: the command is `adopt` and never
`add` (its section 3.8 unknown-site row); the variable is `CAIRN_GH_READ_TOKEN` and never
`CAIRN_GH_TOKEN` (its sections 3.6 and 3.8); and a rate-limited run's verdict is UNKNOWN, not the
WARNING its section 3.8 rate-limited row asserts. A short dated note at the head of the catalogue
records the three. Task 19c-i carries the tests that keep an implementer from copying a
superseded row.

**The render design inputs, all landed under `tool/docs/design/`** and read by Tasks 19c-i, 20a,
20b-i, 20b-ii, 20c, and 21: the capability survey `charm-v2-capabilities.md`, the copy standard
`copy-standard.md`, the six adversarial reviews and the iteration 2 brief under `reviews/`, and
the chosen design under `render-reference/`. **The rules for that directory live in
`tool/docs/design/README.md`**, not in a `render-reference/README` (there is none): the Go sources
carry a `.go.txt` suffix so no gate compiles, vets, lints, or Vale-scans them, the frame files sit
flat in `render-reference/` rather than in a `frames/` subdirectory, **the thirty-four `.ansi`
files are the canonical comparison**, and only thirteen `.png` files are in git, so a cited frame
with no `.png` is reviewed from its `.ansi`.

### Task 19c-i: The `health` and `spine` messages tables, the fix table, and the copy gate

**The pass's first task.** Every later task's operator-facing strings come from what this task
builds, which is why it runs before the cobra tree rather than after it.
`tool/docs/design/copy-standard.md` is the contract; read it in full before writing anything.
Invoke `go-conventions` before writing any Go file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above. This is one of the two tasks
that MAY add operator-facing strings, because its whole deliverable is the table; every string it
adds comes from the catalogue in `copy-standard.md` section 3, and any string the catalogue does
not cover is listed in the report for the editorial gate at Task 22a.

**Conductor rulings (pre-flight, 2026-09-20):**
- `cmd/copylist` is an accepted second binary in this module. The release still builds only
  `./cmd/cairn`; the lister exists for the golden and is proven to have no non-shipped-binary
  importer by criterion 13.

**Files:**
- Create: `tool/internal/health/messages.go`, `messages_test.go`, `fixes.go`, `fixes_test.go`
- Create: `tool/internal/spine/code.go`, `code_test.go`
- Create: `tool/cmd/copylist/main.go`, `main_test.go` (the lister), `tool/testdata/copy.golden.md`
- Create: `tool/scripts/check-copy.sh`
- Modify: `tool/Makefile` (a `copy-list` target, a `check-copy` step in `check`, and a local-only
  `copy-review` target)
- Modify: every `tool/internal/health/check_*.go` (prose out of the check bodies)
- Modify: `tool/internal/spine/outcome.go` (the typed code slot)
- Create: `tool/.vale/copy.ini` (`StylesPath = ../../.vale/styles`, globbing
  `testdata/copy.golden.md` alone; see criterion 10). `tool/.vale.ini` is not modified.

**Acceptance, one reviewable place:**
1. **Every operator-facing string this package prints lives in a messages table, and no operator
   prose sits at a call site.** `internal/health/messages.go` holds the nine checks' detail and
   skip fragments; `internal/health/fixes.go` holds the fix lines. A check returns a condition and
   its measured values, and the table renders the line. A test asserts no `check_*.go` file
   contains a string literal longer than **40 characters**, excluding `_test.go` files, struct
   tags, and the arguments to `errors.New` and `fmt.Errorf`, outside a table entry. The exceptions
   are restated in the test's own comment so a later reader does not have to recover them from this
   plan. The `cmd/cairn` table is Task 19c-ii's and is not built here.
2. **The fix table is keyed by the failure's identity**, which is `spine.Condition` where the
   engine declares one and the tool-owned `spine.Code` of criterion 6 otherwise. Criterion 6
   establishes that most Failing outcomes carry `ConditionNone`, so a table keyed on `Condition`
   alone would collapse them onto one entry. **The key domain is the conditions the checks
   actually declare, not the engine's full registry**: `spine.Conditions()` carries 24 ids but this
   tool can print only three (criterion 7), so the table is keyed on the conditions enumerated by a
   test walking `health.All` plus every declared `spine.Code`. **Two invariants a test holds:**
   there is exactly one fix line per declared `Condition` and per declared `Code`, and every fix
   line's key exists. The test asserts coverage of what the checks declare, not parity with the
   engine's registry. A third test asserts every Failing or held outcome the tool can produce
   resolves to exactly one fix line. This is the shape `check:readiness` already enforces on the
   TypeScript side.
3. **Every fix line's anchor resolves to an actual heading in `docs/admin/is-it-working.md`,** read
   at test time through `providers.RepoRoot`, so the table cannot drift from the page. A second
   test covers the no-anchor branch: **no-anchor is legal, and this task does not edit the frozen
   page to manufacture headings.** Verified 2026-09-20: six checks have no heading in that page
   today (reconciliation row 16); the implementer's report lists which six. This is the re-homed
   remedy map the seams table names.
4. **Each fix carries an `actor` and an `outward` flag,** held in this table. `actor` is one of
   `operator`, `developer`, `provider-console`, or `registrar`; `outward` is true when carrying
   the fix out changes what the public sees. An agent applies one rule with these: run a fix whose
   actor is `operator` and whose `outward` is false and that carries a command; report everything
   else. A test asserts every fix line declares both, and that a `command` is non-empty only when
   the actor is `operator`. **The engine's `src/lib/diagnostics/conditions.ts` is not changed by
   this task**: four production sites read that registry, and widening it is filed under "outside
   the amendment, for the owner" at the end of this pass.

**Acceptance, `Detail` as prose and the token's new home:**
5. **`Detail` becomes prose from the catalogue, and the stable machine token leaves it.** Verified
   2026-09-20 at HEAD, these `Detail` values are machine tokens reaching an operator:
   `always-use-https-off` and `hsts-off` (`check_https.go:72,79`), `wrong-nameservers`
   (`check_delegation.go:39`), `hostname-not-serving` (`check_serving.go:45,52`), `error count
   exceeds the threshold` and `error count is within the advisory band` (`check_errors.go:92,94`,
   both judgments that withhold the number the check measured), and `unauthorized`/`forbidden`
   from `spine.ReasonToOutcome` (`outcome.go`). Each becomes the catalogue's sentence, carrying
   its measured number where the check measured one. **`spine.ReasonToOutcome` is the one case
   this task cannot render from `health`'s table**, because `spine` cannot import `health` (the
   reverse import already exists) and the Files list carries no spine-side messages file. Rule:
   `ReasonToOutcome` sets the new `spine.Code` from criterion 6 and leaves `Detail` empty; the
   rendering stays in `health`'s one table, keyed on the `Code`. One prose table per package, no
   import cycle. A test over every check's Outcome asserts `Detail` is either empty or
   prose-shaped (a lowercase opener, containing a space), and a second assertion keeps the
   `^[a-z0-9]+(-[a-z0-9]+)+$` hyphen-token check for the cases still worth ruling out directly; the
   hyphen regex alone cannot prove the prose list, since it never matches `unauthorized` or
   `forbidden` in the first place.
6. **A Failing verdict's machine token lives on a typed code slot, not in `Detail`.**
   `spine.Condition` already carries the engine's dotted id when the verdict declares one, and at
   HEAD most Failing verdicts declare `ConditionNone` because the engine's registry has no id for
   them (reconciliation row 13). So this task adds a typed `spine.Code` slot on `Outcome` for a
   tool-owned failure code, distinct from the engine's `Condition`, with a closed set of values
   and a `String`. A test asserts every Failing outcome carries either a `Condition` or a `Code`,
   and that the two never both name the same failure. **No tool-owned code is ever printed in a
   place a reader would take for an engine condition id**, and a test asserts the rendered
   condition id is drawn from `Condition` alone.
7. **Only a condition the check actually declared is ever printed.** Iteration 2 of the mockups
   printed `email.sender-not-onboarded` beside a skipped email check, telling an operator the
   sender was not onboarded when the check had never run, and invented `deploy.build-failed`,
   `creds.token-not-found`, and `engine.behind-latest`, none of which exist. Verified 2026-09-20
   against `src/lib/diagnostics/conditions.ts`: the three ids this tool can print are
   `edge.https-not-forced`, `email.sender-not-onboarded`, and `config.observability-off`, and the
   third is declared on a skip and carries its own fix, so the rule is "an id appears exactly
   where the check declared it", not "skips never carry an id". A test asserts every id the tool
   can print exists in the engine's registry, read at test time.

**Acceptance, the catalogue's superseded rows:**
8. **Where the catalogue and this plan's ruled vocabulary disagree, the plan wins,** on the three
   rows the pass preamble names: `adopt` not `add`, `CAIRN_GH_READ_TOKEN` not `CAIRN_GH_TOKEN`,
   and a rate-limited run's verdict UNKNOWN not WARNING. Three tests hold the line: every
   `CAIRN_`-prefixed literal in any messages table is a member of `credentialVars` (which Task
   19a-ii makes the single spelling); no message names a command that the cobra tree does not
   carry, checked against the tree once Task 19a-i exists and by a literal allow-list until then;
   and no message asserts a verdict word that the exit-code table does not give that condition. The
   task also adds the short dated "plan rulings that override this catalogue" note at the head of
   `tool/docs/design/copy-standard.md` if it is not already there, and rewrites none of its rows.

**Acceptance, the gate:**
9. **`make -C tool copy-list` writes every string in every table, grouped by package and sorted,
   with no run required,** and its output is committed as `tool/testdata/copy.golden.md`. The `.md`
   suffix is deliberate: `tool/.vale.ini` maps formats by extension and has no mapping for
   `.golden`, so a bare `copy.golden` would be skipped silently by the very linter the gate exists
   to run. A test asserts the committed file and a fresh run match, so a new string cannot land
   invisibly: it shows up as a one-line diff in review, which is where an editorial eye belongs.
10. **`make -C tool check` gains a `check-copy` step** running two checks over the golden and none
    over the Go source. The first is a local vocabulary check: a literal deny-list of the banned
    column of `copy-standard.md` section 2.9 and the list in section 2.10, plus three structural
    rules a word list cannot express, namely a string matching `^[a-z0-9]+(-[a-z0-9]+)+$`, a fix
    line with more than one comma before its first period, and any `!`. The second is Vale against
    **the repository's own vendored Microsoft style, which lives at the repo root
    (`.vale/styles/Microsoft`), never under `tool/`**: `tool/.vale/styles/` holds only `glw907`.
    Rule: a separate `tool/.vale/copy.ini` with `StylesPath = ../../.vale/styles`, globbing
    `testdata/copy.golden.md` alone; `tool/.vale.ini` stays untouched, so Microsoft never grades
    the ADR or the design docs `tool/.vale.ini` already covers. Never `vale sync`, which would
    drift from the 3.15.1 pin CI carries. `tellgrader` is deliberately NOT in this step: it is a
    Linux-only binary at `~/.local/bin`, and `.github/workflows/tool.yml` runs `make -C tool check`
    on ubuntu, macos, and windows, where the step would hard-fail rather than skip. The step runs
    in the light lane; it launches no browser. **Its failure message names
    `tool/docs/design/copy-standard.md`**, which is how the rule reaches the next implementer.
    Verified 2026-09-20: the workflow's `actions/checkout@v7` step takes no sparse-checkout
    filter, so the full repository lands at the runner's working directory and the relative
    `../../.vale/styles` path from `tool/.vale/copy.ini` resolves to the checked-out repo root's
    `.vale/styles`, which carries `Microsoft`. The relative path is valid as written.
11. **`tellgrader` lives in a local-only `make -C tool copy-review` target**, not in `check`. The
    target runs `tellgrader --register editor` over the golden, is documented in the Makefile's own
    help as a local editorial aid, and is what Task 22a's editorial gate runs before the 1.0 tag.
    A test asserts `check` does not depend on `copy-review`, so CI cannot acquire the dependency by
    accident.
12. **Falsify the gate:** add one banned word to a table entry, run `check-copy`, confirm it fails
    naming the entry and the document, remove it. Record both runs in the report.
13. **The lister is a Go command, not a shell script**, so it reads the tables as Go values rather
    than grepping source. `go install` builds it only if asked; a test asserts it has no non-test
    importer in `cmd/cairn` and therefore does not enter the shipped binary.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 18: `adopt`, and the exit-code arithmetic

**The exit-code arithmetic moved here from Task 21 at the 2026-09-20 night review.** Three of Task
19a-ii's criteria call `spine.ExitCode`, and Task 21 sits two segments later, so under the old
order 19a-ii could not go green. Verified 2026-09-20 at HEAD: no `ExitCode` exists anywhere under
`tool/`, `internal/spine/exit.go` does not exist, and `combineState` and `exitCodeFor` are private
functions in `tool/cmd/cairn/probe_token.go` at `:110` and `:120`. Invoke `go-conventions` before
writing any Go file. Suggested model: `opus`, for the precedence arithmetic, which is frozen at
1.0 and which an agent reads wrong by default.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Conductor rulings (pre-flight, 2026-09-20):**
- The new record's id is generated inside `Adopt` with `crypto/rand`, to reconciliation row 4's
  shape. A test proves the shape and uniqueness; the signature stays as stated below, unwidened.
- `Discover`'s `gh *providers.GitHub` parameter is dropped: no criterion in this task uses it, and
  an unused constructor parameter is a signature nobody can test. If a later task needs a GitHub
  lookup inside `Discover`, that task states the use and adds the parameter back.

**Conductor ratification (2026-09-21).** `diff-reviewer` escalated three deviations from this
task's original signatures; the conductor accepts all three, and every B2 reference to them is
corrected to match:
- **`Candidate`, `Discover`, `Adopt`, and `AlreadyAdopted` live in a new package,
  `tool/internal/adopt`, not `spine`.** `TestSpineImportsOnlyProviders` forbids `spine` importing
  `record` or `store`, and `Adopt`'s store write and `record.Record` return type need both.
- **`ExitCode`'s signature is `spine.ExitCode(sites []SiteVerdicts, listErrs []error, expectSites
  int) Verdict`, not a slice of `health.Report`.** `health` imports `spine`, so `spine` cannot
  import `health` back; a caller converts its `[]health.Report` to `[]SiteVerdicts` at the call
  site. `ExitCode(nil, nil, 0)` returns `VerdictOK`.
- **`adopt.Adopt` takes a leading `ctx` parameter**, so the live DNS check in criterion 4 honors the
  operator's `--timeout`.

**Files:**
- Create: `tool/internal/adopt/adopt.go`, `adopt_test.go`
- Create: `tool/internal/spine/exit.go`, `exit_test.go`
- Modify: `tool/cmd/cairn/probe_token.go`, `probe_token_test.go` (the two moved functions)

**Produces:** in the new package `tool/internal/adopt` (ratified above, not `spine`):
`type Candidate struct{ Worker, Repo, Zone, Domain, AccountID string; Connected
bool}`, `Domain` filled from `cf.WorkerDomains` and `Zone` the zone name. `func Discover(ctx, cf
*providers.Cloudflare, accountID string) ([]Candidate, error)`. `func Adopt(ctx context.Context, st
*store.Store, c Candidate, name string, resolve providers.Resolver) (record.Record, error)`
writing step `live`,
`adopted: true`, no secrets, and a fresh id in the Node shape. `func AlreadyAdopted(st
*store.Store, c Candidate) bool` by worker name. `adopt list` is a plain non-writing function over
`Discover`, not a mode flag threaded through the adopt path (Geoff, 2026-09-20, ruling 3). In
`internal/spine`: `func ExitCode(sites []SiteVerdicts, listErrs []error, expectSites int) Verdict`
returning a monitoring-plugin verdict (`ExitCode(nil, nil, 0)` is `VerdictOK`), where
`SiteVerdicts` is spine's own small per-site type so a caller converts a `[]health.Report` at the
call site rather than `spine` importing `health`. Also `var ErrExpectSites error` mapped to
UNKNOWN, and `type Verdict int` with
the four constants `VerdictOK`, `VerdictWarning`, `VerdictCritical`, `VerdictUnknown` (the exit
codes themselves) and a `String` returning the monitoring word. Task 20b-i re-exports this type as
`render.Verdict` rather than declaring its own. Beside `Verdict`, `func StateWord(s
State, reason ReasonCode, ack bool) string` (or equivalent) returns the pass/fail/skip/held wire
word from the `State`, `Reason`, and `Acknowledged` inputs; Task 20b-i's plain body and Task 20c's
JSON boundary both consume it rather than each computing the mapping.

**Acceptance, `adopt`:**
1. **2.0 seam kept on purpose: adopt as plain functions.** `Discover`, `Adopt`, and
   `AlreadyAdopted` are plain functions with no prompting and no printing, so 2.0's dialog calls
   exactly what 1.0's flags call. A test asserts `Discover` performs no write.
2. **The listing path performs no write at all,** proved against a store whose directory is
   read-only: the function returns candidates and the directory's mtime is unchanged. No `adopt
   --list` mode flag is implemented, because `adopt list` in Task 19a-i replaces it.
3. `Discover` lists every Worker on the account, marks `Connected` from Builds, and fills each
   candidate's `Domain` from `cf.WorkerDomains` (`Zone` is the zone name, not the domain). `Adopt`
   is refused for a candidate whose `Domain` fails `record.ValidateDomain`.
4. `Adopt` also refuses a candidate whose `Domain` resolves into a private, link-local, or loopback
   range, using the injected `Resolver`. This is the spec's resolution check, and it lives here
   because `record.ValidateDomain` stays resolution-free. A table covers `10.0.0.0/8`,
   `169.254.0.0/16`, `127.0.0.0/8`, and a public address.
5. Adopting the same candidate twice yields one record.
6. **No operator-facing string is written here.** Every error this package returns is a Go error
   value under `go-conventions` grammar, lowercase and package-prefixed; Task 19c-ii's boundary is
   what renders one for an operator. A test asserts no exported symbol in this file returns a
   capitalised sentence.

**Acceptance, the codes and their precedence:**
7. **The codes are the monitoring-plugin convention** (Geoff, 2026-09-14), which Nagios and every
   alerting tool compatible with it already reads. 0 is OK: every check is pass. 1 is WARNING. 2 is
   CRITICAL: a check is failing, unacknowledged, and its failure warrants CRITICAL. 3 is UNKNOWN.
   **A held (acknowledged) failing check contributes WARNING, and an expired hold contributes
   CRITICAL** (conductor's ruling, 2026-09-20, Nagios-style: an acknowledgement silences
   notification, never status). OK would reprint the false green criterion 11 forbids. One table
   row each; this is confirmed with the owner before the 1.0 freeze, filed under "outside the
   amendment, for the owner."
8. **Precedence, stated because a run mixes states and an agent will guess wrong.** CRITICAL beats
   UNKNOWN, UNKNOWN beats WARNING, WARNING beats OK. **This is not numeric order: 3 does not beat
   2.** A failing check is a known fault and must not be masked by an unrelated transport unknown;
   an unknown outranks a warning because an unknown hides a possible fault while a warning is a
   disclosed and accepted one. The table covers one row per pairing. The ordering agrees with
   `spine.State.Severity()` where the two overlap, and a test asserts that agreement so the module
   still holds one severity order.
9. **The same precedence holds across sites in a sweep,** applied to the combined slice, and the
   table's three-report row asserts it. Task 21's `exit-codes.md` carries the worked example.
10. **`combineState` and `exitCodeFor` move into `spine`.** Verified 2026-09-20 at HEAD: both are
    private functions in `tool/cmd/cairn/probe_token.go` (`:110` and `:120`), called from four
    places in that one file, so the command owns a rule the whole module needs. After this task
    they are `spine` exports with their own tests and `cmd/cairn` holds no exit arithmetic. A grep
    test asserts no file under `cmd/cairn` maps a state to an integer. `probe_token.go`'s existing
    tests pass unchanged but for the call path.
11. **`Report` with zero checks is UNKNOWN**, never OK. Folding an empty check slice to OK prints a
    false green, which the reference program did. A test asserts the code and the verdict word.
12. **`spine.ErrExpectSites` is mapped here and nowhere else, and `spine.Verdict` (the four
    constants and `String`) is this function's return value widened to a type.** Neither exists at
    HEAD. Task 20b-i re-exports `spine.Verdict` as `render.Verdict` rather than redeclaring it: the
    spine computes the verdict, and a view must not own the vocabulary (ADR). A test asserts the
    four codes and the four words correspond.
13. **The per-check CRITICAL-or-WARNING severity is an input, not a judgment made here, with one
    named exception.** Task 21 builds the table that says which check's failure warrants which,
    and until it lands `ExitCode` treats every unacknowledged failing check as CRITICAL, **except**
    a held failing check, which criterion 7 fixes at WARNING (or CRITICAL once its hold has
    expired) rather than leaving to Task 21. The seam is stated so Task 21 widens this function
    rather than forking it, and a test pins today's behaviour so Task 21's change shows up as a
    diff rather than as a silent reinterpretation.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19a-i: The cobra tree, the grammar, the file split, and the signal path

**The first half of the split Task 19a** (the 2026-09-20 night review split it; 33 criteria across
eleven groups was not one dispatch). The seam is the command surface against the registry and
secrets work: this task owns `root.go`, `main.go`, and the shape of the tree, and 19a-ii owns
`internal/secrets`, `internal/store`, and the sweep. **Deliverable count: six groups.** Invoke
`go-conventions` before writing any Go file and `golang-spf13-cobra` before any `cmd/cairn` file.
Suggested model: `opus`, the largest command surface in the plan.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Conductor ratification (2026-09-21), accepted decisions:** `main` exits 3 on an error out of
`RunE` (interim, ahead of Task 21's typed exit-error mechanism); `adopt list --json` defaults to
`true`.

**Files:**
- Create: `tool/cmd/cairn/sites.go`, `health.go`, `logs.go`, `adopt.go`, `deps.go`,
  `root_test.go`, `sites_test.go`, `health_test.go`, `logs_test.go`, `adopt_test.go`
- Modify: `tool/cmd/cairn/root.go`, `main.go`, `auth.go`, `auth_test.go`, `probe_token.go`,
  `probe_token_test.go`

**Produces:** the command tree under the 2026-09-20 grammar: `sites list [--json]
[--expect-sites N]` with bare `sites` as an alias for it; `health [<site>] [--json]
[--error-threshold N] [--since]`; `logs <site> [--event] [--since] [--json]`; `adopt [--worker
NAME [--repo SLUG]]` and `adopt list [--json]`; and `auth set <name>`, `auth list`, and `auth
probe` (`auth unset` is 19a-ii's). Persistent flags on the root: `--timeout`, setting the whole
run's wall-clock deadline; `--verbose`; `--quiet`; and `--color=auto|always|never`.

**Acceptance, the tree and its grammar:**
1. **The grammar is the 2026-09-20 ruling's, exactly** (Geoff, ruling 3). `cairn sites list` is
   the command and bare `cairn sites` is an alias for it. `adopt list` is its own non-writing
   subcommand over Task 18's `Discover`, and no `--list` mode flag exists on `adopt`; a test
   asserts `adopt --list` is rejected as an unknown flag rather than silently accepted. Tests
   assert each command and alias resolves, and that the old `probe-token` top-level name no
   longer resolves.
2. **`probe-token` becomes `auth probe`,** keeping its behavior and its hidden status: it stays
   hidden, because it is a credential-minting aid rather than an operator verb. Its existing
   tests move with it and pass unchanged but for the command path.
3. **Commands are grouped on the root** with cobra's `AddGroup` and `GroupID`, so `cairn --help`
   reads as three groups rather than one alphabetical list: the site verbs (`sites`, `health`,
   `logs`, `adopt`), the credential verbs (`auth`), and cobra's own `completion` and `help`. A
   test asserts every non-hidden command declares a `GroupID` and that every declared group has at
   least one member.
4. The cobra shape follows `go-conventions` and `golang-spf13-cobra`: flags in a struct rather
   than loose variables, `RunE` returning an error, and `main` as the only place that prints an
   error and calls `os.Exit`. **`SilenceUsage` and `SilenceErrors` are set once, on the root, and
   nowhere else.** Verified 2026-09-20 at HEAD: both are set on `root.go:24-25` and repeated on
   `auth.go:56-57`, `auth.go:83-84`, and `probe_token.go:68-69`. Cobra inherits both from the
   nearest ancestor when the command's own field is false, so the repeats are dead weight that
   will drift. This task removes the three repeats and a test asserts exactly one file under
   `cmd/cairn` names each field.
5. Every write to standard output and standard error goes through one writer obtained from a
   single helper in `main.go`, so Task 21 can wrap it in the scrubber in one place.
6. **The four reserved short flags are reserved and not bound to anything else:** `-v`, `-t`,
   `-V`, and `-q`, per the Monitoring Plugins development guidelines, whose exit codes this tool
   already follows. In 1.0 `-v` is `--verbose`, `-t` is `--timeout`, `-V` is `--version`, and `-q`
   is `--quiet`. A test walks every command's flag set and asserts no other long flag claims any
   of the four shorthands.
7. **`-q/--quiet` prints only on a non-OK result.** On a run whose verdict is OK it writes nothing
   at all to stdout or stderr and still exits 0; on WARNING, CRITICAL, or UNKNOWN it prints the
   verdict line and the failing detail. **`internal/render` does not exist yet in this segment**
   (Task 20 lands two segments later), so this task's non-OK body is the verdict line from
   `spine.Verdict.String()` plus each failing check's line from 19c-i's `health` messages table,
   and nothing else: no ad-hoc human-body prose composed at this call site, which is exactly the
   call-site prose the standing note bans. A test asserts byte-empty output on the OK path, which
   is what makes a cron-driven green run silent and mail-free. `--quiet` and `--verbose` together
   is a usage error naming both.
8. **`--json` wins over `--quiet`, and the payload always prints** (conductor, 2026-09-20). The
   combination is not a usage error and is not silent: `--quiet` suppresses the human body on an OK
   run, and under `--json` the payload IS the output, so suppressing it would give an agent an
   empty stdout that Task 21 freezes as meaning "your invocation was wrong". **Before Task 20c
   lands, the payload this task prints is `Report.JSON`**, the health package's existing
   redaction-safe marshal, not a hand-built shape; Task 20c later replaces the call site, not this
   task's contract. A test asserts `cairn health --json --quiet` on an OK run writes the whole
   payload to stdout and nothing to stderr, and the rule is stated in `cairn help agents` and in
   `tool/docs/reference/exit-codes.md` by Task 21 and frozen by Task 20c's freeze list.
9. **Every command carries an `Example:`.** A test walks the tree and asserts each command,
   including each `auth` subcommand and each alias's target, has a non-empty `Example` whose first
   line begins with `cairn `. No example puts a credential value on a command line.
10. Bare `cairn` prints help and exits OK, unconditionally, on a pipe and on a terminal alike. A
    test asserts the help text on a pipe. **There is no TTY launch predicate**: `shouldLaunchTUI`
    is 2.0's, and a test asserts no file under `tool/` defines or calls it.
11. **The one permitted TTY check** (Geoff, 2026-09-20, ruling 1). This task's grep test forbids
    `term.IsTerminal` and `os.Stdout.Stat()` everywhere under `tool/` **except**
    `internal/render/profile.go` (Task 20a), and allows `term.ReadPassword` in `auth.go` alone.
    **`internal/render/profile.go` does not exist yet at this task's segment**, so the exception
    path is hard-coded by name now rather than left for 20a to invent: the test asserts that path
    is the sole match when a file at it exists, and until then the grep simply finds no match
    there, which is not the same as the exception being unproven. **Verified 2026-09-20 at HEAD: no
    file under `tool/` names `term.IsTerminal` today, and this grep test does not exist.** The only
    chokepoint grep on the branch is `TestOSGetenvOnlyInEnvGo` (`tool/cmd/cairn/env_test.go:182`).
    So this task creates the test, narrowed from the start. Falsify it: add `term.IsTerminal` to a
    second file, confirm the failure names that file, remove it.
12. No command reads an environment variable except through `loadEnv`, and no command reads the
    keyring except through `secrets`. `TestOSGetenvOnlyInEnvGo` still passes over the grown
    package.

**Acceptance, the file split and the signal path:**
13. **One package-level dependencies struct, built once in `main.go` and passed to every
    `newXCmd(d deps)`,** in a new `tool/cmd/cairn/deps.go`. The probe command's five constructor
    parameters fold into it first: `buildProbeTokenCmd(envFn, p, rt, registryDir, exit)` becomes
    one struct parameter, so a sixth dependency is a field rather than a signature break across
    every test. The same single struct is also what criterion 5's single writer and criterion 12's
    single env path need, so every command built in this task takes `deps` rather than its own
    constructor shape. Its existing tests pass with the struct substituted. **`cmd/cairn` splits by
    concern**:
    `probe_token.go` is 475 lines at HEAD, the largest file in the package, and its command body,
    its Cloudflare probe, its GitHub probe, and its registry walk are four concerns. After this
    task no file under `cmd/cairn` except a test exceeds 300 lines, asserted by a test. The
    registry walk moves out of the package entirely in Task 19a-ii; until then it keeps its own
    file.
14. **`signal.NotifyContext` covers SIGINT and SIGTERM on the root context,** and a cancelled run
    exits UNKNOWN. A test sends the signal to a command blocked on a stub client and asserts the
    exit code and that the command returns rather than being killed. **That test guards on
    `runtime.GOOS` rather than on a build tag**, because `go-conventions` forbids build tags and
    the GOOS-suffix mechanism would put one assertion in three files. Windows has no SIGTERM and
    delivers SIGINT differently, so on Windows the same behavior is proved by cancelling the root
    context directly and asserting the same code. Exit 3 is asserted on both paths. This also
    fixes Ctrl-C during an echo-off credential prompt leaving the terminal's echo off: a test
    asserts the restore function is called when the context cancels mid-prompt.
15. `adopt list` prints candidates as JSON, preceded by a stderr line saying the output is not
    safe to paste. It is one of the **two** implicitly verbose commands; `logs` is the other,
    because its entries carry editor emails per Task 17, and this task is where `logs` gains the
    same notice. A test asserts both commands emit that line and that no other command does.
    `adopt --worker X` adopts without a prompt. Both strings come from Task 19c-i's catalogue.
16. **`health --since` and `logs --since` both resolve through `logs.ParseSince`** (verified at
    HEAD, `internal/logs/logs.go:93`). A test builds the value table Task 17 states (`90m`, `24h`,
    `7d` accepted; a bare integer, a negative value, a zero, a float, and a unit outside the three
    each rejected) and asserts both flags accept and reject the same rows.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19a-ii: `auth unset`, the registry query, and the multi-site sweep

**The second half of the split Task 19a.** It touches `root.go` only to register `auth unset`,
which is the one contended edit and is named here so the implementer expects it. **Deliverable
count: four groups.** Invoke `go-conventions` before writing any Go file and `golang-spf13-cobra`
before any `cmd/cairn` file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Conductor rulings (pre-flight, 2026-09-21):**
- **Cancellation is one path (criteria 6 and 8).** A budget miss and SIGINT both cancel the same
  run context, and `TestSignalCancelsTheRunAndExitsUnknown` already exists: settled sites print,
  unsettled sites are reported by id as UNKNOWN with `reason.timeout`, and the process exits
  `spine.ExitCode` over the whole slice for both causes, never two separate mappings.
- **The many-sites output before `render` lands** (Task 20 is two segments later): reuse
  `writeHealthBody` per site in `store.List` order, separated by a blank line, with one final
  `ExitCode` verdict line; no ranking and no new labels here (Task 20b-i owns both).
- **An operator-facing string the catalogue lacks** (this task is likely to need one for an `auth
  unset` outcome): the implementer drafts it to `tool/docs/design/copy-standard.md`'s rules, marks
  it in the messages table's comment as not in the catalogue and owed to Task 22a's editorial gate,
  and lists it in the task report. This is the sanctioned route and does not breach the standing
  never-invent-copy note above.

**Files:**
- Create: `tool/internal/store/discover.go`, `discover_test.go`
- Modify: `tool/cmd/cairn/root.go`, `auth.go`, `auth_test.go`, `health.go`, `sites.go`,
  `registry.go` (no `registry_test.go` exists yet), `probe_token.go`, `probe_token_test.go`,
  `env.go`, `env_test.go`
- Modify: `tool/internal/secrets/secrets.go`, `keyring.go`, `keyring_test.go`, `env.go` (the
  `Deleter` seam)

**Produces:** `auth unset <name>`; `secrets.Deleter`; `store.Discover` and the moved registry
types; bare `cairn health` as a sweep over every registered site. `sites list` compares the
registered count itself and appends a sentinel `spine.ErrExpectSites` to its list errors on a
mismatch, then calls `spine.ExitCode(nil, listErrs, 0)`, which maps that sentinel to UNKNOWN; the
mapping is defined once, in `ExitCode`.

**Acceptance, `auth unset` and the `secrets.Deleter` seam:**
1. **`auth unset <name>` deletes the keyring entry for one of the three variable names** so a
   rotated token's stale entry can be cleared. It accepts only the three names, it never prints a
   value, and unsetting a name the keyring does not hold is success with a message saying so
   rather than an error.
2. **The delete arrives as a separate `secrets.Deleter` interface, never a widened `Writer`.**
   Verified 2026-09-20 at HEAD: `secrets.Writer` is `interface{ Set(name, value string) error }`
   and no `Delete` exists anywhere in the package. Widening `Writer` would force every future
   write-only backend to implement a delete it may not support; a second one-method interface
   costs nothing and keeps `Writer`'s contract. A test asserts `Keyring` satisfies both and that
   `Deleter` declares exactly one method.
3. **The delete shares the read path's deadline.** `secrets.withDeadline` already bounds `Get`
   at `keyringDeadline` (verified at HEAD, `keyring.go`), and `Set` and `Delete` derive their
   bound from the same value. A keyring backend can hang on a locked collection or an
   unresponsive D-Bus service, and a command that hangs forever is worse than one that fails. A
   test with a stub backend that blocks asserts each returns by the deadline with a non-zero exit
   rather than hanging.
4. **A backend that cannot be reached is a distinct non-zero outcome, separate from not-found,
   and it names the environment-variable fallback, on all three `auth` commands.**
   **Ratified 2026-09-21**: `Keyring.Get` deliberately flattens `errKeyringUnavailable` to a miss
   (`keyring.go`), so `auth list` cannot currently distinguish the four rows from `Get` alone; this
   task exports `secrets.ErrKeyringUnavailable` and adds one `Keyring.Status()`-style direct read
   that the three `auth` commands call for the distinction, and leaves `Get`'s flattening untouched
   so credential-resolution behavior is unchanged. Not-found
   is success with a message; unavailable is a failure whose message says the keyring could not be
   reached and that the variable can be set in the environment instead. Conflating them would tell
   an operator with a locked keyring that their credential was already gone. A table covers four
   rows per command: a present entry, an absent entry, an unavailable backend, and a name outside
   the known set.
5. **`credentialVars` is the only place a `CAIRN_CF_`/`CAIRN_GH_` variable name is spelled.**
   Verified 2026-09-20 at HEAD: `credentialVars` exists at `cmd/cairn/env.go:31` and
   `authVariables` derives from it at `:39`. **Ratified 2026-09-21, narrowing the grep's original
   scope**: a bare `CAIRN_` grep also matches `store/paths.go`'s `CAIRN_STATE_DIR` and
   `providers/cloudflare.go`'s `CAIRN_CLOUDFLARE_API_BASE`, neither a credential and neither this
   task's concern, plus ten `_test.go` files and comments elsewhere. The grep test is scoped to
   non-test `.go` files under `cmd/cairn`, to the `CAIRN_CF_`/`CAIRN_GH_` prefixes only, in code
   rather than comments, allowing only `env.go` and `messages.go`. This task routes `deps.go`,
   `probe_token.go`, `adopt.go`, and `logs.go` through `credentialVars` so the narrowed grep passes.
   `auth set`, `auth list`, `auth unset`, the completions, and every message that names a variable
   read through it. Task 19c-i's membership test is what covers the tables the grep exempts.

**Acceptance, the multi-site sweep (2026-09-20 amendment):**
6. **Bare `cairn health` sweeps every registered site; `cairn health <site>` is the single-site
   form.** The sweep is **sequential** over `health.Run`, one site at a time, **in the order
   `store.List` returns**, which is by the record's `Name` with the id as tiebreak (verified
   2026-09-20 at HEAD, `internal/store/store.go:68,104`). No `errgroup`, no concurrency, no
   connectivity probe: those stay 2.0. **Ranking is the render's, never the sweep's**: severity is
   known only after a site has run, so Task 20b-i ranks for display and Task 20c's NDJSON summary
   carries `worstFirst`. A test over a three-site fixture registry asserts three reports in
   `store.List` order.
7. **The whole-run timeout is sized for the registry, and it is only divided when the operator
   names it** (conductor, 2026-09-20, correcting the amendment's divide-always rule). Three
   sentences, all tested: each site gets the full single-site budget by default; the default
   whole-run budget is that single-site budget times the number of sites in the registry, under a
   600-second cap, which `exit-codes.md` publishes; and an **explicit** `--timeout` is the
   whole-run budget, divided by the sites still to run and recomputed after each site, so one slow
   site cannot eat the rest and a fast sweep gives its slack back. The old divide-always rule made
   the headline invocation broken by default: at the 120-second single-site default a four-site
   registry gave each site 30 seconds and a ten-site registry 12 seconds, below one request's own
   15-second timeout, so bare `cairn health` (what `cairn help agents` tells every agent to run)
   returned all-UNKNOWN. **A test over a 4-site fixture and a 10-site fixture asserts each sweep
   completes at the default with no `reason.timeout` on any check**, and a second test with an
   explicit `--timeout` and one blocking stub asserts the command returns by that deadline with
   every non-blocked site reported. **Ratified 2026-09-21, on detecting "explicit":** `--timeout`
   is a persistent root flag defaulting to 120 seconds, so a value equal to the default cannot be
   told apart from an unset default by value alone; `PersistentPreRunE` reads
   `cmd.Flags().Lookup("timeout").Changed` into a `timeoutSet` field on `rootFlags`, and the
   divide-only-when-explicit rule above tests `timeoutSet` rather than comparing against the
   default.
8. **A sweep that runs out of budget reports partial results, never nothing.** Every site that
   settled is printed with its verdict; every site that did not is reported by id as UNKNOWN with
   the reason `reason.timeout`, and counted toward the run's exit code. A test asserts a run cut
   short by the deadline prints the settled sites and names the unsettled ones.
9. **A record that fails to parse is reported by id and counted, never dropped.** Same rule as
   `sites list`. A test puts one malformed record in a three-record registry and asserts two
   reports, one named parse failure, and the exit code Task 18's table gives that combination.
10. **The cross-site exit code is `spine.ExitCode` over the whole slice,** computed once, in Task
    18, and never re-derived here. A test asserts the process code for a mixed sweep equals
    `ExitCode(reports, listErrs, 0)`.
11. `health` with a site argument that names no record is an error naming `cairn sites list`, and
    exits 3 per Task 18's mapping. The empty registry under bare `cairn health` is also UNKNOWN,
    because the tool cannot say whether any site is healthy.

**Acceptance, the registry query and the remaining carry-ins:**
12. **`discoverSites` and `registrySite` move into `store`** as the one registry query every
    command shares. **Corrected 2026-09-21 against HEAD**: segment 1 already extracted both out of
    `probe_token.go` into `tool/cmd/cairn/registry.go`, at `:33` and `:40`, and `registry.go`'s
    `openRegistry` is the current single call path into `store.Open`; the one command that needed
    them no longer owns them alone, and `health`, `logs`, and the completions would each grow a
    copy. After this task the two symbols live in `tool/internal/store/discover.go`, `openRegistry`
    keeps calling `store.Open`, and `cmd/cairn` holds no registry walk of its own beyond that one
    call. A grep test asserts no file under `cmd/cairn` other than `registry.go` names
    `store.Open`. `auth probe`'s repository discovery reads through the moved function and its
    existing registry tests pass unchanged.
13. **`NewProbe` and `NewNPM` already have a production caller; this task verifies that, rather
    than adding the first one.** **Corrected 2026-09-21**: at HEAD, segment 1's
    `cmd/cairn/deps.go` (`buildClients`, `:65-66`) already calls both `providers.NewNPM` and
    `providers.NewProbe` from production code, so the criterion as first drafted here is already
    satisfied. A test asserts each constructor is named from at least one non-test file under
    `cmd/cairn`, which this task keeps green.
14. `sites list --json` carries each site's id from `store.Entry.ID`, and `health <id>` resolves
    by id.
15. **`sites list` compares the registered count itself and calls `spine.ExitCode(nil, listErrs,
    0)`.** **Corrected 2026-09-21** against the ratified Task 18 deviation and current `sites.go`
    (already a first cut from segment 1/19a-i): `runSitesList` appends `spine.ErrExpectSites` to
    `listErrs` itself on a `--expect-sites` mismatch, rather than passing `expectSites` through to
    `ExitCode` for it to decide. UNKNOWN follows when the registry is empty, when any record failed
    to parse, or when the count mismatches, and OK otherwise. **An empty registry with no
    `--expect-sites` flag currently exits OK; this task must close that gap so it exits UNKNOWN
    too**, since all three are cases where the tool cannot say whether the sites are healthy. A
    test covers all three.
16. `sites list --verbose` prints the registry directory it read and the `store.Source` that chose
    it. This is `Source`'s 1.0 caller, which is why `Source` stays exported.
17. A report carrying `degraded: true` exits WARNING, which is 1, with no flag to ask for it. The
    spec's `--require-credentials` is dropped. Task 21 holds the WARNING tier that decides it.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19b: Acknowledgements, the non-interactive credential path, and completions

**Deliverable count: three groups**, eight items. Invoke `go-conventions` before writing any Go
file and `golang-spf13-cobra` before any `cmd/cairn` file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Conductor rulings (pre-flight, 2026-09-21):**
- **Who validates expiry (criterion 1).** `cmd/cairn/ack.go` parses each entry, merges flag and
  file entries, and refuses a missing or malformed expiry date; the expiry comparison itself stays
  in `health.Run` against `Options.Now` (the ratified segment-1 fact), so an already-expired entry
  parses successfully here and contributes CRITICAL there, never a parse failure.
- **An operator-facing string the catalogue lacks** (this task is likely to need one for the ack
  file's malformed-date, missing-expiry, or missing-explicit-file errors): the implementer drafts
  it to `tool/docs/design/copy-standard.md`'s rules, marks it in the messages table's comment as
  not in the catalogue and owed to Task 22a's editorial gate, and lists it in the task report. This
  is the sanctioned route and does not breach the standing never-invent-copy note above.

**Files:**
- Create: `tool/cmd/cairn/ack.go`, `ack_test.go`, `tool/cmd/cairn/completion_test.go`
- Modify: `tool/cmd/cairn/health.go`, `sites.go`, `logs.go`, `root.go`, `auth.go`, `auth_test.go`
- Modify: `tool/docs/credentials.md` (the stdin form for `auth set`)

**Acceptance, the acknowledgement surface:**
1. **The acknowledgement list is a documented product feature, not a wrapper's array.** `--ack
   <check-id>=<YYYY-MM-DD>` is repeatable on `health`, and the same entries can live in a JSON file
   the registry directory holds, which needs no new path resolution: `store.Dir` already names the
   directory and `store.List` already skips a filename stem that fails `record.ValidateSiteID`, so
   the file cannot be read as a site. Flag entries and file entries merge, with the flag winning on
   the same check id. A malformed date is an error naming the entry. An entry with no expiry date
   is refused, so no acknowledgement outlives its author's attention. A test covers a merge, a
   conflict, an expired entry, and a malformed one.
2. **`--ack-file` names that file, and its default path is documented.** The default is
   `acknowledgements.json` inside the registry directory `store.Dir` resolves, stated in the flag's
   own help text, in `tool/docs/reference/exit-codes.md`, and in `tool/docs/tripwire.md` at Task
   24a. A missing file at the default path is not an error, since most operators have none; a
   missing file at an explicitly passed `--ack-file` path is an error, since the operator named it.
   A test covers both.
3. **`sites list` ignores the resolved acknowledgement-file path when it lists the registry
   directory.** This criterion moved here from Task 19a at the 2026-09-20 night review, because it
   tests `--ack-file`, a flag this task creates. **Ratified 2026-09-21, on ownership**: `--ack-file`
   is a root persistent flag, resolved through one `ackFilePath(d, flags)` helper that both
   `health` and `sites list` call, so `sites list` can skip it without owning a copy of the flag;
   `--ack` itself stays on `health` alone, since only `health` accepts acknowledgement entries.
   `store.List` already skips a filename stem that fails `record.ValidateSiteID`, which covers the
   default name, but the check is on the **resolved path** rather than on that name, so an operator
   who passes `--ack-file` pointing at a differently named file inside the registry directory does
   not see it reported as a malformed record; `sites list` skips the resolved path by comparison,
   never by name. A test puts an ack file with a site-id-shaped stem in the registry directory,
   passes it as `--ack-file`, and asserts the listing reports the real sites only and exits OK.
4. An acknowledged check reads as acknowledged in the report and in the exit code, through Task
   12's `Acks` and Task 18's `ExitCode`. This task wires the flags to those; it re-implements
   neither. **The acknowledgement carries no author field.** Verified 2026-09-20 at HEAD:
   `health.Ack` is `{CheckID string; Expires time.Time}` with no author. The copy standard's
   attribution row (its section 3.6, "held by kari@ecxc.ski") is therefore declined for 1.0 rather
   than implemented, and that row's own caveat says to drop it rather than add a field to carry a
   string.
5. **An acknowledgement over a multi-site sweep applies per check id across every site,** because
   a check id is not site-scoped. The doc states this plainly, and a test over a two-site sweep
   asserts one `--ack deploy=...` softens the deploy failure on both. A site-scoped acknowledgement
   is recorded as 2.0 work in the roadmap, not implemented here.

**Acceptance, the non-interactive credential path:**
6. **`auth set <name>` reads from stdin when stdin is not a terminal.** The detection is an error
   fallback on the echo-off read, not a TTY query: the command attempts the echo-off prompt, and on
   the error a non-terminal stdin produces it reads one line from stdin instead. This keeps ruling
   1's one-TTY-check promise. The documented form is `printf %s "$v" | cairn auth set NAME`, stated
   in `tool/docs/credentials.md` beside the caution that a value typed at an interactive prompt can
   reach shell history and a value in a pipeline can reach a process listing. **A trailing `\r\n` is
   stripped as well as a trailing `\n`**, since Windows is a product platform and a value piped from
   a PowerShell or `cmd` pipeline arrives with the carriage return; a credential stored with a stray
   `\r` fails every request with no visible cause. A test proves it on a CRLF fixture as well as an
   LF one. An empty value is an error; the value never appears in output. **Ratified 2026-09-21**:
   the fallback triggers on any non-nil error `term.ReadPassword` returns, with no errno
   inspection, since errno is not portable across the three target platforms; the injected stdin
   reader supplies the one `bufio` line the fallback reads.
7. **The prompt reads from an injectable stream,** so the echo-off path is testable without a pty
   and the stdin path without a pipe. The injection is a field on the command's dependencies struct
   from Task 19a-i, not a package-level variable. A test asserts the default wiring reads the
   process's own stdin.
8. **No command waits on stdin when stdin is not a terminal and no value is piped.** This is on
   the 1.0 freeze list: a blocked unattended run produces no output and no exit code, and there is
   no recovery. A test drives every command with stdin closed and asserts each returns.

**Acceptance, shell completions:**
9. **Cobra's default `completion` command is kept, not suppressed.** Cobra generates bash, zsh,
   fish, and PowerShell scripts for free, which is the whole reason to keep it: hand-rolling four
   is exactly the bespoke mechanism the conventions rule out. A test asserts the `completion`
   command is present and not hidden, and Task 22a's command-set assertion expects it.
10. **Three completions are wired:** a `ValidArgsFunction` over the registry's site ids for
    `health`'s and `logs`'s positional argument, reading through the `store` function Task 19a-ii
    moved; and a flag completion for `logs --event` over the engine's event vocabulary.
    Reconciliation row 15 already assumes the `--event` completion exists and no task produced it.
    **The vocabulary is a Go literal slice in the tool**, not a value read from the engine's
    TypeScript at build time: `go-conventions` forbids code generation, the module builds with no
    repository present, and a `go install` build reaches no `src/lib` tree at all. **Corrected
    2026-09-21: no drift test for this literal exists yet.** "The existing drift test from
    reconciliation row 14" was stale; only `conditions.ts` drift tests exist today
    (`spine/condition_test.go:52`, `health/fixes_test.go`). This task writes the missing test: an
    `Events()` function in `internal/logs` returning a clone of the package's literal slice, and a
    new drift test modelled on `condition_test.go` that reads `src/lib/log/events.ts` through
    `providers.RepoRoot()` and **fails, rather than skips, when the repository is absent**, so the
    slice cannot silently drift. **Ratified 2026-09-21, on I/O**: site-id completion reads the
    registry only, never the network; any error it hits returns an empty candidate list with
    `cobra.ShellCompDirectiveNoFileComp`, never a printed error. Tests call each completion function
    directly against a fixture registry and a fixture vocabulary and assert the candidate lists,
    with the no-registry and no-match cases covered.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19c-ii: The `cmd/cairn` messages table and the error boundary

**The second half of the split Task 19c.** Its `health` and `spine` half ran first, as Task 19c-i;
this half is the command-layer table and the error boundary, and it runs after the tree exists so
it can edit the real command files rather than inventing them. `tool/docs/design/copy-standard.md`
is the contract. Invoke `go-conventions` before writing any Go file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above. This is the second of the
two tasks that MAY add operator-facing strings, on the same terms as 19c-i.

**Conductor rulings (pre-flight, 2026-09-21):**
- **An operator-facing string the catalogue lacks**: the implementer drafts it to
  `tool/docs/design/copy-standard.md`'s rules, marks it in the messages table's comment as not in
  the catalogue and owed to Task 22a's editorial gate, and lists it in the task report. This is the
  sanctioned route and does not breach the standing never-invent-copy note above.

**Files:**
- Create: `tool/cmd/cairn/messages.go`, `messages_test.go`
- Modify: `tool/cmd/cairn/main.go`, `root.go`, `auth.go`, `sites.go`, `health.go`, `logs.go`,
  `adopt.go`, `ack.go`, `probe_token.go`
- Modify: `tool/testdata/copy.golden.md` (the regenerated golden)

**Acceptance:**
1. **Every operator-facing string `cmd/cairn` prints lives in `cmd/cairn/messages.go`**: every
   error message, every command's `Short`, `Long`, and `Example`, the two not-safe-to-paste
   notices, the `auth` outcome messages, and the usage hints. No operator prose sits at a call
   site or in a format string. **Ratified 2026-09-21, resolving the escalation against
   `root_test.go:358`'s `TestNoCommandFileExceedsItsBound`** (every `cmd/cairn/*.go` capped at 300
   lines): `messages.go` is exempted from that bound by name, since holding every `Short`/`Long`/
   `Example` plus section 3.8's eight errors is one concern by construction; the literal-length
   threshold this criterion's grep enforces is **30 characters**, skipping struct tags, flag names,
   and `cobra.Command` field keys. A test asserts no file under `cmd/cairn` outside `messages.go`
   contains a string literal longer than 30 characters outside those exemptions.
   The five command files Task 19a-i and Task 19b created are in scope and are named in Files
   above, which is what the first cut of this task missed.
2. **`main` translates an error rather than printing it.** **Corrected 2026-09-21**: at HEAD the
   raw-error print is `cmd/cairn/main.go:42`, `fmt.Fprintln(errOut, err)` through the
   `processWriters()`-derived `errOut` rather than `os.Stderr` directly (segment 1's
   signal-handling refactor moved and changed this line since it was last verified). It still
   prints a Go error chain such as `store: open /home/geoff/.config/cairn/sites: permission denied`
   to an operator, untranslated, so the criterion's substance is unchanged. One translation
   function maps a sentinel or wrapped error onto a message from the table, falling
   back to `cairn: <err>` only for an error the table does not know. Go error values keep the
   `go-conventions` grammar, lowercase and package-prefixed; the boundary renders them. A table
   covers the eight cases in `copy-standard.md` section 3.8 plus the fallback, with the plan's
   ruled vocabulary winning on that section's `add` and `CAIRN_GH_TOKEN` rows.
3. Every error message follows the standard's three-part shape: what happened, prefixed `cairn: `;
   why, when it adds something; and what to do next, an imperative naming a command or a URL. No
   stack, no doubled `Error: `, no exit-code number in prose. A test asserts the prefix and that
   no message contains a newline-joined Go error chain.
4. **The two conflict tests from Task 19c-i extend over this table**: every `CAIRN_`-prefixed
   literal in it is a member of `credentialVars`, and no message names a command absent from the
   cobra tree, now checked against the real tree rather than an allow-list.
5. **The golden is regenerated and covers both packages.** `make -C tool copy-list` now lists
   `internal/health`, `internal/spine`, and `cmd/cairn`, and `tool/testdata/copy.golden.md` is
   updated in this commit. **Ratified 2026-09-21**: at HEAD `catalogues()`
   (`cmd/copylist/main.go:31`) lists `health` alone, and `spine` exports no `Catalogue` or
   `FixLines`; its only strings today are `Verdict.String` and `StateWord`'s wire words. This task
   adds `spine.Catalogue()`, returning the four verdict words and the four state words, and lists
   it alongside `health` and `cmd/cairn`, since the golden is where that fixed vocabulary becomes
   reviewable. `check-copy` passes over the grown golden.
6. **Prose outside the tables is named as outside the golden.** `tool/README.md`,
   `tool/docs/credentials.md`, `tool/docs/tripwire.md`, and the reference pages are documentation
   rather than program strings: they are not listed by `copy-list`, they are linted by the
   repository's own Vale configuration, and they are read at Task 22a's editorial gate. The
   distinction is stated in `messages.go`'s package comment so the next implementer does not try to
   route a doc sentence through the table.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.
### Task 20a: `render` foundations: the palette, the glyphs, the rungs, the sanitizer, and the theme

**Task 20 was split into 20a, 20b, and 20c in the 2026-09-20 amendment, and 20b was split again
into 20b-i and 20b-ii that night. Here is the count that forced the first split.** The 2026-09-14
Task 20 carried five deliverables (the profile enum, the pure seam and its goldens, the status
line, the remedy map, the JSON shape). The design track added the Warm Stone palette with two
grounds and three profiles and named ANSI-16 slots, a glyph set with a width-parity rule and an
East Asian width rule, five named width rungs, a sanitizer with a hostile corpus, a theme
constructor the HUD imports unchanged, three bodies chosen by scope and TTY, a severity ranking, a
fix format that never truncates, hold expiry and escalation, determinism across five environment
variables, and a frozen JSON contract with a published schema. Roughly twenty deliverables in one
task is five times this workstation's rough ceiling of four. 20a is everything a body is built out
of, 20b is the bodies and the corpus, and 20c is the machine contract. The split is on clean seams:
20a's output is a `Theme` and a set of primitives with their own tests, 20b consumes them, and 20c
marshals the same inputs without touching either.

Invoke `go-conventions` before writing any Go file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above, plus: "Captures never open
one terminal window per frame. Iterate with offscreen renders (ANSI to HTML to headless Chromium);
real-terminal evidence is ONE reused kitty window per session, each frame verified to show its own
content before it is saved. See `tool/docs/design/render-reference/src/offscreen.py` and
`real-frames.sh`." Plus, on `go-conventions`: criterion 15's mandated construction (`Style.Width(n).MaxWidth(n)`
cells, `lipgloss/v2/table` with `StyleFunc`, carried into 20b-i and 20b-ii) and the grep and purity
meta-tests (criterion 3, and Task 20b-i and 20b-ii's own grep tests) are deliberate plan overrides
of "simplest thing that works" and are never a reviewer finding.

**Conductor rulings (pre-flight, 2026-09-21):** see the amended criteria below (5, 7, 9, 12, 13,
14, 18, 19, 24); each states its own ruling inline rather than as a separate list, because each
changes what the criterion proves.

**Files:**
- Create: `tool/internal/render/render.go`, `profile.go`, `profile_test.go`, `palette.go`,
  `palette_test.go`, `glyph.go`, `glyph_test.go`, `width.go`, `width_test.go`, `sanitize.go`,
  `sanitize_test.go`, `purity_test.go`, `testdata/hostile/`
- Create: `tool/docs/adr/0002-render-dependencies.md` (the one ADR, named here so two dispatches
  cannot create two)
- Modify: `tool/go.mod`, `go.sum` (four new direct requires, per criterion 1's 2026-09-21
  amendment)
- Modify: `tool/cmd/cairn/env.go`, `env_test.go` (`NO_COLOR` and `TERM` through `loadEnv`)
- Modify: `tool/cmd/cairn/root.go` (the `--width` flag)

**Produces:** `type Profile int` with `ProfileTrueColor`, `ProfileANSI256`, `ProfileANSI16`, and
`ProfileNoColor`. `type Theme` with `Style(role)`, `Sized(role, w)`, and its `GlyphSet`, built by
`func NewTheme(dark bool, p Profile) Theme`. `type Frame struct{ Header, Body, Footer []string }`
with a `Lines()` join for the CLI. `func Sanitize(string) string`. Named width-rung constants.

**Acceptance, the dependencies:**
1. **Four dependencies are taken, by name and by version, from the capability survey**
   (`tool/docs/design/charm-v2-capabilities.md`, section B.1), plus one ratified in the segment 3
   fix round: `charm.land/lipgloss/v2` at v2.0.6, `github.com/charmbracelet/colorprofile` at
   v0.4.3, `github.com/charmbracelet/x/ansi` at v0.11.8, and `github.com/clipperhouse/displaywidth`
   as a fourth direct require, promoted out of the transitive set below because the width and
   East Asian Ambiguous work (criteria 11 and 12) calls it directly rather than only through
   lipgloss; the promotion and its reason are recorded in ADR-0002. They bring `ultraviolet`,
   `go-colorful`, `uax29`, `go-runewidth`, `uniseg`, and `terminfo` as indirects: six transitive
   modules, no cgo, all pure Go, all already vetted on this workstation by poplar. **Pin policy:
   exact versions in `go.mod`, taken at the survey's measured values, and no upgrade inside this
   pass**; a later bump goes through the workstation's `dependency-upgrade` skill like every other.
   The alternative is hand-rolled `fmt.Sprintf` padding, which fails on this package's first job,
   padding a column holding `●` or `─` to a fixed width, where `len` and rune count are both wrong.
2. **Four libraries are declined for 1.0, each recorded as a decision** in the ADR: `charm.land/fang/v2`
   (it brings its own colour detection and its own `charmtone` palette, which would fight the one
   profile file and the Warm Stone table; filed as a 2.0-window spike),
   `github.com/lrstanley/bubblezone/v2` (mouse zones, and its own author advises against it under
   bubbletea v2, whose `tea.View.OnMouse` covers the case), `ntcharts`, and **any sparkline**. The
   sparkline is declined on the design record: it appeared in no reviewed frame, it is the one
   purely decorative element three reviews named, and a chart with no axis, scale, or label is a
   debug print.
3. **The purity test names its forbidden imports rather than a category:** `os`,
   `golang.org/x/term`, `colorprofile`'s detection entry points, `lipgloss.Writer`, and the
   `lipgloss.Print*`/`Sprint*`/`Fprint*` family, each forbidden by name, everywhere in the package
   outside `profile.go`. Naming them is what lets a pure lipgloss import land without tripping the
   test, which a category match would have blocked. `lipgloss.Writer` in particular is a
   package-level `colorprofile.NewWriter(os.Stdout, os.Environ())` that reads the environment at
   init, which is why it is named. A second test asserts the package imports no bubbletea package
   at all. Falsify each by adding the import, confirming the named failure, removing it.

**Acceptance, the palette:**
4. **One palette file holds the Warm Stone token table from `reviews/family.md`,** and no other
   file in the module writes a hex value. The roles and their derivations are that document's
   table: ground (reference only, `#221f1a` dark, `#fdfbf9` light, from `--color-base-100`), text
   (`#eae7e3` / `#28231d`, `--color-base-content`), muted (`#a8a49e` / `#615d57`,
   `--color-muted`), subtle (`#c1bdb8` / `#504c47`, `--color-subtle`), ok (`#7ccd8e` / `#197037`,
   `--color-positive-ink`), failing (`#ff8e86` / `#b71824`, `--cairn-error-ink`), unknown
   (`#f7ac4d` / `#915200`, `--cairn-warning-ink`), accent (`#9d84ec` / `#7246cf`,
   `--color-primary`), and rule (`#4a443b` / `#c9c3bb`, a new `--cairn-cli-rule`). `RoleAck` folds
   into muted and `RoleStale` folds into unknown; neither survives as its own role. Whether
   `--cairn-cli-rule` should also be added to the engine's `cairn-admin.css` is filed under
   "outside the amendment, for the owner"; this task writes it in the Go palette only.
5. **Named ANSI-16 slots per role, in a dark AND a light branch.** A nearest-match downsample
   collapses distinct roles onto one slot, which is why the slot is named per role. The slots are
   `family.md`'s: ok 2, failing 1, unknown 3, accent 5, subtle 7, rule 8. **Named deviation from
   `family.md`'s token table (`reviews/family.md` lines 124-135), in the same way criterion 4 names
   its own deviations: the table gives both `muted` and `acknowledged` (which folds into muted per
   criterion 4) the ANSI-16 value `default + SGR 2`. The owner's bound overrides it. Muted text,
   and by inheritance the folded acknowledged role, is the terminal's own default foreground with
   no attribute: never slot 8, never SGR 2 (faint).** Slot 8 is the background on Solarized Dark,
   so meaning placed there vanishes, and faint is unreadable on several common themes. **Only the
   rule may use slot 8, and it is exempt from the test.** The test asserts every role's slot other
   than the rule's differs from slot 0 in both branches, and that no role, including the folded
   acknowledged role, emits SGR 2. The rule's own risk on a Solarized Dark terminal is recorded in
   the ADR: a rule that vanishes costs a separator, not a state.
6. **An ANSI-256 rung is named, not left to a downsample.** `Profile` is a four-value enum and
   `lipgloss.Complete(p)(ansiColor, ansi256Color, trueColor)` selects per profile at the palette.
   Without it a 256-colour terminal receives 24-bit SGR and the writer converts nothing. A golden
   covers the rung.
7. **Contrast is measured, not asserted.** A test computes each role's contrast ratio against its
   own branch's reference ground and requires at least 4.5:1. `family.md` measured all eight roles
   clear on both grounds; this test is what keeps a later edit from breaking one. **The WCAG
   relative-luminance formula is computed by hand in `palette_test.go`, not sourced from
   `go-colorful`**: `go-colorful` is an indirect dependency here (criterion 1), and promoting it to
   a direct require to borrow its luminance function would falsify criterion 1's "three new direct
   requires."
8. **Colour is reached through `lipgloss.LightDark(dark)` and per-profile values,** never a
   hand-rolled map plus a switch, and no caller chains a raw lipgloss setter off a style the theme
   returned. `Style(role)` and `Sized(role, w)` are the only two ways to get one. A test asserts
   no file outside `palette.go` names a lipgloss setter.
9. **`NewTheme(dark bool, p Profile) Theme` is the constructor the 2.0 HUD imports unchanged, and
   stays at exactly two inputs.** This is a seam kept on purpose: the HUD's theme is this file
   widened, not a second palette beside it. **`Profile` alone does not encode the glyph tier**
   (`ProfileNoColor` is not the same axis as ASCII, per criterion 13), so the tier is never a third
   `NewTheme` parameter; any dispatch that adds one is a reviewer escalation. Instead `Theme` carries
   both glyph tiers on its `GlyphSet`, and the caller, `render.Render` reading `RenderInput.ASCII`
   (criterion 13, filled by `profile.go`'s detector), selects which tier a body draws from. A test
   asserts `NewTheme` takes exactly those two inputs and reads nothing else, and a second asserts
   `Theme.GlyphSet` exposes both tiers.

**Acceptance, the glyphs:**
10. **The glyph set is the owner's pick of 2026-09-20:** pass `●` U+25CF, fail `■` U+25A0, fail at
    warning severity `□` U+25A1, skip `?`, held `○` U+25CB, fix `→` U+2192, rule `─` U+2500,
    separator `·` U+00B7. The ASCII tier is `+`, `!`, `*`, `?`, `o`, `>`, `-`, `-`, and **the
    ellipsis is `...`, never `~`**, which reads as vi filler and collides with a glyph.
11. **A width-parity test asserts every ASCII glyph is exactly as wide, in cells, as its Unicode
    counterpart**, so a degrade substitution never shifts a column budget. Without it the column
    arithmetic is correct at one tier only.
12. **The East Asian Ambiguous rule is stated and tested.** Every Unicode glyph in the set except
    `?` is EAW=Ambiguous (measured in
    `tool/docs/design/render-reference/measurements.txt`). **The width table is a field on `Theme`,
    chosen by tier (narrow for Unicode, wide for ASCII) at construction, never a package-level
    variable**: the reference program's package-global `ambiguousWide` breaks determinism under
    parallel tests, which this package's own determinism criterion (24) forbids. The sweep in
    20b-ii runs both tables. A terminal configured the other way takes the ASCII tier, which is
    exact on both, and the rule is that no column position ever depends on a glyph's width: a field
    is padded after the glyph, measured. **The Unicode-tier-on-an-Ambiguous=wide-terminal
    combination is documented as unsupported in ADR-0002**, recording the reference program's own
    measurement of 2980 over-width lines under that combination.
13. **The glyph tier is Unicode by default and ASCII when output is not a TTY, when `TERM` is
    `dumb`, or when the Windows console refuses virtual-terminal mode** (Geoff, 2026-09-20). A
    table covers the selection. **This is carried as `ASCII bool` on `RenderInput`, filled by
    `profile.go`'s detector alone** (criterion 14): purity forbids OS access outside that file, so
    `render.Render` itself never re-derives the tier, it reads the field. `Theme.GlyphSet` exposes
    both tiers (criterion 9) and the body selects by this field, never by re-testing the terminal.
    **Unicode is kept at ANSI-16**, against poplar's own choice, because cairn's glyph count is four
    rather than seventeen and the parity test makes either choice safe. No task in this plan widens
    the glyph set; the full poplar `theme` port is 2.0.

**Acceptance, the profile and the one TTY check:**
14. **`profile.go` holds the module's one TTY check** (Geoff, 2026-09-20, ruling 1) and nowhere
    else does. Detection order: `NO_COLOR`, present and non-empty, means no colour;
    `--color=never` means no colour and `--color=always` means colour regardless of the terminal;
    `--color=auto`, the default, falls through; `TERM=dumb` means no colour; a non-TTY stdout means
    no colour. A table covers every combination. Task 19a-i's grep test allows `term.IsTerminal` in
    this file alone. **The same detector also reports the terminal's column count when stdout is a
    terminal** (conductor, 2026-09-21), read beside the one TTY predicate so no second TTY predicate
    exists anywhere in the package; the grep test still names `profile.go` as its sole match.
    `cmd/cairn` is the one impure caller: it builds `RenderInput` and calls `render.DetectProfile(stdout,
    env)`; `render` itself reads nothing. This column count is what Task 20b-i's criterion 18 uses
    for `Width` when the operator passes no `--width`.
15. **The same predicate selects the body, not only the colour** (2026-09-20 amendment). `--color`
    and `NO_COLOR` affect colour alone and never the body: an operator who forces colour into a
    pipe still gets the plain body. A test asserts `--color=always` into a non-TTY renders the
    plain body in colour.
16. **`loadEnv` carries `NO_COLOR` and `TERM`,** because `loadEnv` is the only code in the module
    that reads the environment and `TestOSGetenvOnlyInEnvGo` enforces that. They are not
    credentials, so they are not resolved through a `secrets.Provider` and carry no `Missing`
    entry. A test asserts the two names are read and that neither appears in any credential path.
17. **Windows virtual-terminal handling is ruled here, and the tool enables it rather than only
    asking.** On Windows the detection first attempts to enable `ENABLE_VIRTUAL_TERMINAL_PROCESSING`
    on the stdout handle, and only a console that refuses takes the no-colour ASCII path; a
    query-only implementation would ship ASCII and no colour to every conhost operator whose
    console supports the mode but has not had it turned on. The mechanism is the `x/sys/windows`
    dependency Task 5 already took, so no new dependency is added. The Windows CI leg asserts the
    detection's result rather than skipping, and the task report records which branch it took and
    whether the enable succeeded.

**Acceptance, the width rungs:**
18. **Named rung constants, with a floor and a numbered cap.** A floor of 40, with a single-column
    fallback below 60, then 60, 80, 100, and **a wide cap of 120**, at which content stops growing
    and the remainder of a wider terminal is left empty rather than stretched. The cap is a number
    rather than a word because Task 20b-ii cuts goldens at it. Left alignment at every width, never
    centred: a centred block floats away from the prompt on a maximized terminal and bakes its
    padding into a piped file. **The requested width is honoured exactly; the rungs are behavioural
    thresholds only, never a snap** (conductor, 2026-09-21): a single-column fallback below 60, the
    condition id trailing the fix URL line at 100 and above (Task 20b-i criterion 11), and no growth
    above 120. A test asserts a render at width 90 is not byte-identical to one at width 80.
19. **No line exceeds the requested width, from 20 to 400, on both width tables.** The sweep runs
    the widths 20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400 under Ambiguous=narrow for the
    Unicode tier and Ambiguous=wide for the ASCII tier, and asserts zero lines over width. Rules
    built from `─` are built to measured width so they cannot double. This is measured against the
    reference program's own result of zero findings across 1024 renders per tier.
20. **Degenerate widths never panic**: 0, 1, 2, 5, 19, and a negative value each render.

**Acceptance, the sanitizer:**
21. **Every dynamic string is sanitized at the render seam,** and no caller may skip it: `Detail`,
    a fix line, a site name, a domain, a log field value, and an adopt candidate's worker name all
    pass through `Sanitize` before any style is applied. C0 and C1 controls are stripped, tabs are
    expanded, a newline never creates a line, and no escape sequence reaches the terminal. A
    control that separated two words becomes a space rather than joining them.
22. **The hostile corpus from `reviews/robustness.md` is the test:** `\n`, `\r`, `\t`, `ESC[2J`,
    `ESC[31m`, `ESC[42;30m` with a forged `OK` verdict, OSC 0, OSC 8, a lone `ESC`, and invalid
    UTF-8, each placed in every dynamic field. **The corpus also carries a hostile URL row**: a
    `javascript:` scheme, a URL carrying a control byte, and a URL whose text and target differ,
    which is what criterion 10 of Task 20b-i keys its hyperlink rule on. Assertions: the line count
    is unchanged, no C0 or C1 byte appears in the output, and a forged verdict line injected
    through a `Detail` stays inside its own field rather than becoming a line. Falsify by removing
    the sanitizer from one field and confirming the corpus fails naming it.
23. **Degenerate inputs render without panic:** zero sites, zero checks, an empty detail, an empty
    fix, a 300-character fix, a 60-character domain, an IDN, punycode, CJK, a ZWJ emoji, counts of
    0 and 100000, fifty sites, and a 2 KB log field.
24. **Determinism is asserted across the environment.** Two runs of the same input are
    byte-identical, and the output is byte-identical across `TZ`, `LANG`, `LC_CTYPE`, `TERM`, and
    `NO_COLOR`, with `NO_COLOR` alone forcing the no-colour profile. Timestamps carry a real zone
    offset, asserted with a non-UTC location: the reference program's `Format("2006-01-02 15:04Z")`
    printed a literal `Z` on a local-time value and claimed UTC, which `Z07:00` fixes. **This
    resolves the conflict between "byte-identical across `TZ`" and "a real zone offset" (conductor,
    2026-09-21): render never calls `time.Now`, `.Local()`, or `time.LoadLocation`. It formats
    `in.Now` in the location that value already carries, with `Z07:00`.** A test passes a non-UTC
    `Now` and asserts identical output bytes under three different `TZ` values.
25. **`Frame` is sectioned, and it carries no bubbletea type.** `Frame` returns `Header`, `Body`,
    and `Footer`, joined by `Lines()` for the CLI, because the HUD pins a header, scrolls the body
    in a `viewport`, and pins a `bubbles/help` footer; a flat frame would make the HUD re-layer
    what `render` already laid out. **The 2026-09-20 spec addendum's `Cursor *tea.Cursor` on
    `Frame` is wrong** and Task 25 appends a dated correction: a bubbletea type here breaks the
    purity test and the seam. The HUD composes a `tea.View` from a `Frame` plus its own cursor
    state. A test asserts `Frame`'s fields.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 20b-i: The single-site body, the plain body, the ranking, and the fixtures

**The first half of the split Task 20b** (the 2026-09-20 night review split it; 35 criteria over
four bodies, a rank, a golden corpus, a construction standard, and a real-terminal capture was not
one dispatch). This half owns the shared layer, the ranking, the single-site body, the plain body,
and the fixture set. **Named contention with 20b-ii: `golden_test.go` and `testdata/golden/`.**
This task creates both and pins the single-site and plain views; 20b-ii extends the same files
rather than replacing them.

The acceptance reference is `tool/docs/design/render-reference/`: its `index.html` names the
owner's four picks and what iteration 3 changed; its `.ansi` files, flat in that directory, are the
captures to review each body against and are the canonical comparison; only thirteen `.png` files
are in git, so a cited frame with no `.png` is reviewed from its `.ansi`. Its `.go.txt` sources are
the reference program, suffixed so no gate compiles them. **The goldens are cut from the real
`render` package and reviewed against those frames.** A golden copied from the reference program is
not acceptance. Invoke `go-conventions` before writing any Go file. Suggested model: `opus`.

**Notes (verbatim in the dispatch):** the standing B2 note above, plus the capture rule from
Task 20a's notes. Plus, on `go-conventions`: criterion 15's mandated construction (Task 20b-ii,
carried into this task's own cells and rows) and the grep and purity meta-tests are deliberate plan
overrides of "simplest thing that works" and are never a reviewer finding.

**Conductor rulings (pre-flight, 2026-09-20; amendments 2026-09-21 folded into the numbered
criteria below, at 5, 11, and 12):**
- `Verdict` is `spine.Verdict` (Task 18), re-exported here (`type Verdict = spine.Verdict` or the
  package's own re-export idiom), never a second, independently declared type. The spine computes
  the verdict; this package must not own the vocabulary (ADR).
- The plain body's `pass`/`fail`/`skip`/`held` words (criterion 13 below) come from `spine`'s
  `State`/`Reason`/`Acknowledged` mapping (Task 18), not from logic reimplemented in this package.
- A styled-span assertion (criterion 4's one-pass rule, and Task 20b-ii's never-colour-alone and
  row-padding tests) reads spans through one shared, test-only ANSI span parser
  (`ansi_spans_test.go`), not a second sanitizer and not three independent parsers.

**Files:**
- Create: `tool/internal/render/body_single.go`, `body_plain.go`, `rank.go`, `rank_test.go`,
  `body_test.go`, `golden_test.go`, `testdata/golden/`, `fixtures/`
- Modify: `tool/Makefile` (a `golden` target)
- Modify: `tool/cmd/cairn/health.go` (print through the seam)

**Produces:** `func Render(in RenderInput) Frame` with no I/O, where `RenderInput` carries `View`,
`Width`, `Height`, `Dark`, `Profile`, `Body` (the scope-and-TTY selection), `Reports
[]health.Report`, `Entries []logs.Entry`, `Status StatusState`, `Verdict Verdict`, and `Now`.
`Verdict` is `spine.Verdict` (Task 18): a typed int whose constants are the four exit codes
themselves (`VerdictOK` 0, `VerdictWarning` 1, `VerdictCritical` 2, `VerdictUnknown` 3) with a
`String` returning the monitoring word, re-exported from `spine` rather than redeclared here.

**Acceptance, one design system and the shared layer:**
1. **Three bodies, chosen by scope and by whether stdout is a terminal.** Single site when one
   report and stdout is a terminal; many sites when more than one and stdout is a terminal; **plain
   text whenever stdout is not a terminal**, at any scope, decided by Task 20a's one TTY predicate.
   Plain is not a variant, it is the default for a pipe, exactly as `--json` is not. **The
   selection table has six rows, not nine**: two scopes times three TTY-and-colour states (a
   terminal with colour, a terminal with `ProfileNoColor`, and a pipe). Profile beyond
   `ProfileNoColor` never changes the body, only the ink, which the table states in a footnote
   rather than by multiplying rows. A test covers all six.
2. **The shared layer is identical across all three:** the header block, the vocabulary, the
   severity ranking, the fix format, the section grammar, the palette, and the glyphs. A test
   renders the same fixture through all three bodies and asserts the same set of facts appears in
   each.
3. **The verdict line is first and last, and never a green line below a failure.** The last line of
   any run is the verdict repeated. A test asserts the first and last non-blank lines carry the
   verdict word, for all four verdicts.
4. **One pass rule: green means this run is OK.** In a frame whose verdict is anything else, every
   passing mark is muted, including the folded passing line's dot, the strip's pass dots, and an
   individual site's `OK` word inside a failing sweep. The only saturated ink on a failing screen
   belongs to what failed. A test strips the render to its styled spans, through the one shared
   test-only ANSI span parser (`ansi_spans_test.go`, conductor ruling above), and asserts no span
   carries the ok role's saturated colour in a non-OK run.
5. **Severity ranking is real, and it ranks rows, sites, and the fix list by one key**
   (`iteration-2-brief.md` ruling 2): site unreachable or not serving, then publish path or deploy
   broken, then email or errors, then credentials expiring, then version drift. It agrees with
   `spine.State.Severity()` where the two overlap, and a test asserts that agreement, so the module
   still holds one severity order per Task 11b-ii's hygiene test. **The ranking is the render's
   alone**: the sweep in Task 19a-ii runs and returns in `store.List` order, and nothing upstream
   of `Render` re-orders. **No label ever states its own ordering**: a ranked list reads as ranked,
   and the moment the ranking is stated it becomes a promise. The many-sites list is labelled `what
   to fix` and nothing more. **Tie-breaks are stated, not left to sort stability** (conductor,
   2026-09-21): rows and fixes tie-break on (severity class 1 through 5, then `spine.State.Severity()`
   descending, then check id lexical); sites tie-break on (worst severity class, then `store.List`
   index). The sort is stable, and a test asserts the exact order on a fixture built with a
   deliberate tie.

**Acceptance, the single-site body (owner's picks 1 and 2, and one correction):**
6. **No rail.** The failing group is always first and always under its own inset rule, so its edge
   is never in question; a rail buys an edge the reader already has and spends a fourth ink on it.
7. **Glyph-only rows in the colour Unicode tier**, with the check id moved left to sit as close to
   the margin as the glyph allows, because the check id is the row's subject. **The state word is
   kept unconditionally wherever there is no hue to carry it**: at the ASCII tier, in the plain
   body, and **at any profile equal to `ProfileNoColor` even on a Unicode terminal**, which is the
   `NO_COLOR` and `--color=never` case the first cut of this criterion left undefined. **This is
   enforced in code, not left to a flag**: a test asserts the word is present in all three
   conditions even when the glyph-only setting is on, and that the setting has no flag an operator
   can use to remove it.
8. **The single-site body uses the same two-severity mark as the strip.** This corrects a known
   fault in iteration 3: its single-site frames render all three failing rows with the filled mark,
   including the engine version drift, which the strip's own row for the same site marks outlined.
   The mark comes from the same predicate the verdict uses, so it can never disagree with the row's
   own severity. A golden over the WARNING-only fixture pins it, and a test asserts that a failure
   whose severity alone would carry the run to WARNING renders outlined in both bodies.
9. **Section labels are lowercase inset rules**, `failing`, `could not run`, `held`, and
   `passing`, never an all-caps heading and never an invented imperative. Everything passing folds
   to one line. Domains are never case-folded.
10. **A fix is never truncated.** It wraps with a hanging indent, and it carries a command or a
    full URL where one exists. The URL is an OSC 8 hyperlink where colour is on and the printed URL
    otherwise, using `Style.Hyperlink`. **The hyperlink's target is constrained**: it comes from
    Task 19c-i's static fix table and never from a site's own response, it is `https` only, it
    carries no control byte after `Sanitize`, and **the link text is the URL itself**, so a
    terminal that renders the hyperlink and one that prints the text show the same destination. A
    test drives Task 20a's hostile-URL corpus rows through the fix field and asserts no OSC 8
    sequence is emitted for any of them. `no remedy page yet` is never printed: a fix line with no
    URL is a fix line with no URL, and the tool's own bookkeeping does not go in the operator's
    column.
11. **The condition id never occupies a line of its own.** The rule is by width band, not by rung
    name (conductor, 2026-09-21, resolving the below-60 gap): **at 100 columns and above** it
    trails the fix block's URL line, muted, so the greppable handle and the page that documents it
    share a line; **from 60 to 99 columns** it trails the check row's own detail line instead,
    wrapping with the detail; **below 60 columns** it trails the detail line in that band's
    single-column form. This corrects iteration 3's 80-column frame, where the id fell to a bare
    line under the URL. **The "never alone on a line" test runs the full 40-to-400 sweep
    regardless of band**, and goldens at 60, 80, 100, and 120 pin the placement.
12. **Held failures are visible, expiring, and escalating.** A held row carries the `○` glyph, the
    word `held`, and a trailing field reading `held until <ISO date>, <n> days left`; the hold is
    never comma-spliced into the detail. **Inside 48 hours of expiry it renders in the attention
    ink.** **An expired hold holds nothing**: the check renders as failing and says when the hold
    expired, and the verdict is unchanged by it. A test asserts each of the three on the verdict,
    not only on the row. **`○` wins everywhere over the two-severity fill, including in Task
    20b-ii's strip cell** (conductor, 2026-09-21, resolving the conflict between this criterion and
    Task 20b-ii criterion 3): a held failure is always `○`, never the filled or outlined mark, and
    the filled/outlined distinction applies to unheld failures only. An expired hold is unheld and
    takes the filled/outlined rule like any other failure.

**Acceptance, the plain body:**
13. **One fact per line behind a stable lowercase `key: ` prefix, with no continuations.** The
    keys are `verdict:`, `checked:`, `<check-id>:`, `condition:`, `reason:`, `fix:`, `fix actor:`,
    `docs:`, `fix for:`, and `exit:`. **The state words are the four the pass ships**, `pass`,
    `fail`, `skip`, and `held`, and **a `skip` line is always followed by its `reason:` line**,
    which is what carries the difference between a missing credential and a timeout that the four
    words alone do not. A test asserts every non-blank line matches `^[a-z][a-z0-9 .,-]*: `, that
    no fix wraps, and that no `skip` appears without a `reason`.
14. **It reads correctly in a proportional font and to a screen reader**: no box drawing, no
    stacked header, no strip, no glyph carrying meaning, and no line whose meaning depends on a
    column position. A test asserts each of those at widths 40 through 400.
15. **The verdict is first and last, and `exit <n>` follows the last verdict line,** so a truncated
    cron mail still carries the verdict.
16. **Where one missing input caused several skips, the group carries one fix under its own `fix
    for: <ids>` line**, naming the checks it covers, rather than letting the last skipped row
    appear to own a fix that covers two. Ambiguity costs more than duplication.
17. **Blank lines between per-check blocks are the one piece of layout this body pays for**,
    because they make a block one greppable unit for both readers.

**Acceptance, the width default and the verdict:**
18. **`Width` is `--width` when the operator set it, else the detected terminal column count when
    stdout is a terminal, else 80** (conductor, 2026-09-21, superseding the 2026-09-20 pre-flight's
    "never from `term.GetSize`"; the owner ranks render-quality first, and a fixed 80 on a
    140-column or a 60-column terminal is a visible defect). The column count comes from Task 20a
    criterion 14's detector alone, never a second predicate in this package. `Height` is 0 from the
    CLI, meaning unbounded, and exists for the 2.0 HUD's viewport. A test asserts `Render` with a
    zero `Width` and a non-terminal stdout renders identically to `Width: 80`, and a second asserts
    a `RenderInput.Width` sourced from a detected column count is honoured exactly (criterion 18 of
    Task 20a).
19. **The verdict word comes from `Verdict.String()`,** and `Verdict` is `spine.ExitCode`'s own
    return value widened to a type, so an operator reading the line and a routine reading the code
    cannot disagree. A test in `cmd/cairn` renders a report and asserts the printed first word
    against the exit code for all four values.
20. **The fixture set is created here and is the corpus both halves of Task 20b use**: empty,
    all-unknown, degraded, offline, one-sick, healthy, WARNING-only, twelve-site, and hostile. Each
    is a named Go constructor under `fixtures/`, not a JSON file, so a type change fails the build
    rather than a golden. A test asserts every fixture renders in every body without panic. Task
    20b-ii adds no fixture and extends no fixture's shape; if it needs one, that is a report item,
    not a quiet edit.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 20b-ii: The status strip, the log body, the status line, and the golden corpus

**The second half of the split Task 20b.** It owns the many-sites body and its fallback, the log
body, the status line, the construction standard, and the full golden sweep. **Its real-terminal
capture is deferred to the owner's morning** (conductor, 2026-09-21; see the note below). It
extends `golden_test.go` and `testdata/golden/`, which Task 20b-i created; that is the named
contention and the reason the two are sequential rather than parallel. The acceptance reference is
the same `render-reference/` directory, on the same terms. Invoke `go-conventions` before writing
any Go file. Suggested model: `opus`.

**Notes (verbatim in the dispatch):** the standing B2 note above, plus the capture rule from
Task 20a's notes, restated for this task's own scope: **this task ships offscreen ANSI-to-HTML-to-
headless-Chromium evidence only, rendered with no window on the desktop.** No real-terminal kitty
capture runs unattended (conductor, 2026-09-21; see the removal note after criterion 15, and the
carry-forward at Task 22b criterion 1 and Task 22a criterion 9). Plus, on `go-conventions`:
criterion 15's mandated
construction (`Style.Width(n).MaxWidth(n)` cells, `lipgloss/v2/table` with `StyleFunc`) is a
deliberate plan override of "simplest thing that works," and the grep and purity meta-tests are
deliberate meta-tests; neither is a reviewer finding.

**Conductor ruling on dispatch sizing (pre-flight, 2026-09-21):** with the real-terminal criterion
deferred (below), this task's remaining deliverables are five, not six, and still dispatch as one.
**If the task's first report shows the golden corpus incomplete, the conductor splits a 20b-iii for
the corpus rather than spending a fix round on it.**

**Files:**
- Create: `tool/internal/render/body_many.go`, `body_logs.go`, `status.go`, `status_test.go`
- Modify: `tool/internal/render/golden_test.go`, `body_test.go`, `testdata/golden/`
- Modify: `tool/cmd/cairn/sites.go`, `logs.go`, `health.go` (print through the seam)

**Acceptance, the many-sites body (owner's picks 3 and 4):**
1. **The labelled status strip is the many-sites body, with the plain table as its narrow
   fallback.** Every column heading is a check id spelled out, so the strip answers "which check"
   as well as "how many", with no legend and no two-letter cipher. **The fallback rule is a
   computed threshold, not a magic number**: the strip renders when the sum of the ten headings,
   their separators, and the site and verdict columns fits the requested width, and falls back to
   the plain table when it does not. **The formula is exact** (conductor, 2026-09-21): `StripWidth(
   headings, siteCol, verdictCol)` is an exported-in-package function computing `siteCol + 1 +
   sum(len(heading)) + (n-1)*sepWidth + 1 + verdictCol`, where `siteCol` is the widest sanitized
   site name capped at 28. **A test pins the exact integer this formula produces for the nine-check
   fixture**, so a heading change moves the threshold visibly rather than silently, and a second
   asserts the fallback fires at that value minus one. The fallback is counts by state, the engine
   version, and the data age in worded columns, with a state a site does not have left blank rather
   than zero. The table is not a rival direction, it is the strip's own fallback, which is why
   choosing the strip ships both. Neither form prints a legend.
2. **The strip abbreviates `https-forced` to `https` in its heading and nowhere else**, because
   twelve cells of heading over a one-cell mark does not fit beside the other eight columns plus
   the site and verdict columns, and that truncation is one a reader can undo. The check id is
   `https-forced` everywhere else. A test asserts the heading set and the id set.
3. **Two fail severities** (Geoff, 2026-09-20): a filled mark for a failure that warrants
   CRITICAL, an outlined mark in the attention ink for one that warrants only WARNING, from the
   same predicate the verdict uses. Colour never carries it alone: filled against outlined in
   Unicode, `!` against `*` in the ASCII tier. **A held failure is always `○`, never filled or
   outlined, including in the strip cell** (conductor, 2026-09-21; the governing statement is Task
   20b-i criterion 12, which this criterion's mark applies to unheld failures only). A test asserts
   the mark and the row's own verdict word agree on every row of a mixed fixture, and a no-colour
   golden asserts the two marks are distinguishable with every escape stripped.
4. **The strip's marks are centred in their columns**, so they form a grid under their headings
   rather than hugging each column's left edge.
5. **Every fix is printed, and no count of hidden repairs is.** A count of repairs the screen
   declined to show is a fact an operator cannot act on, and the list is already ranked. A
   twelve-site fixture producing eleven fixes renders whole. If a cap is ever needed the honest
   form is a named cap with a sentence, never a cipher.
6. **A site whose checks were all skipped for one missing credential still produces exactly one
   entry in the fix list.** This corrects a known fault in iteration 3, where a site with nothing
   but skips was invisible on the fleet screen although a missing token is precisely what an
   operator can fix. The entry names the site, the missing credential, and the one fix that
   unblocks every skipped check on it, once rather than per check. A test builds a twelve-site
   fixture in which one site has nine skips and zero failures and asserts exactly one entry for
   that site.
7. **Fixes for checks that could not run are listed after the failures**, in the same list, for
   the same reason.
8. **The fleet's fix list gives the sentence its own width**: the site and the check name the fix
   on one line, the sentence sits beneath them with a hanging indent, and at 80 columns the
   sentence wraps into a second full line rather than a stray verb. A test asserts no line in the
   fix list is a single orphan word.
9. **No remedy is printed twice** in one frame.

**Acceptance, the log body and the status line:**
10. The date and the zone are stated once on the section rule; a log level is a word and never a
    glyph, because `?` already means skip; and the field that matters wraps into its own column
    rather than being cut. A `reason` is never truncated.
11. `health` and `sites list` print a status line from `StatusState`: the render time, each missing
    credential by variable name with the check ids it disables, the provider each present
    credential resolved through, the GitHub token expiry date, and the degraded state when set. **The
    credential and keyring detail leave the header block** and sit on the `creds` row instead, per
    the design brief's ruling 8. A test asserts an absent `CAIRN_GH_READ_TOKEN` names the check ids
    it disables.
12. **The "do this next" line is gone as a separate device.** The single-site body's fix sits on
    the line below its own failing row and needs no heading, so the 2026-09-14 plan's `do this
    next` block is not implemented. Its content is Task 20b-i's criterion 10 fix line.

**Acceptance, the corpus and the construction:**
13. **The golden sweep is sized, not exhaustive** (conductor, 2026-09-21: the full cross product of
    4 rungs x 4 profiles x 2 grounds x 2 width tables x 9 fixtures x 4 views is roughly 4600 files).
    **One base axis, TrueColor / dark / narrow table, sweeps every fixture x view x rung, plus one
    targeted golden per non-default value of each other axis (profile, ground, width table) on the
    `one-sick` fixture alone.** The matrix itself is a table in `golden_test.go`, and target 120 to
    200 files total. `go test` fails on drift and on an orphan file; the orphan check walks the same
    matrix table. `make -C tool golden` regenerates. **Golden naming and the sweep's determinism are
    one mechanism**: a single `goldenName(view, fixture, width, profile, ground, table)` helper is
    the sole source for both writing a golden and scanning for an orphan, producing paths like
    `testdata/golden/<view>/<fixture>_w080_truecolor_dark_narrow.txt`. Line endings normalize to
    `\n` before comparison, and the test sets `TZ`, `LANG`, `LC_CTYPE`, `TERM`, and `NO_COLOR`
    explicitly via `t.Setenv` so an inherited environment can never move a golden. A golden covers
    one non-default `Height` and both `Dark` values.
14. **Never-colour-alone gate**: a test strips ANSI from each no-colour render and asserts every
    state word appearing in the colour render at the same width also appears here, read through the
    one shared test-only ANSI span parser (`ansi_spans_test.go`, Task 20b-i's conductor ruling).
    Falsify by rendering one state as colour-only and confirming the failure.
15. **Construction follows `reviews/charm-stack.md`:** a cell is
    `Style.Width(n).MaxWidth(n).Render(text)`, so the padding carries the style and a 2.0 selected
    row can paint a full-width background rather than striped gaps; a row is
    `lipgloss.JoinHorizontal(lipgloss.Top, cells...)` wrapped in one row style; the site tables use
    `lipgloss/v2/table` with `StyleFunc(row, col)`, fixed `Width`, `Wrap(false)`, and
    `BorderRow(false)` rather than a hand-rolled wrap loop. A test asserts a styled row's padding
    carries the row style, through the same shared span parser.
**Real-terminal evidence is removed from this task's scope** (conductor, 2026-09-21). `real-frames.sh`
opens a visible kitty window, steals focus, and captures via X11, which an unattended overnight run
cannot do safely against a locked or idle desktop session. This task ships the offscreen
ANSI-to-HTML-to-headless-Chromium evidence only (this task's notes, above). The named carry-forward,
**"real-terminal evidence, owner's morning,"** is a precondition of Task 22b (its criterion 1) and is
called out in Task 22a's own "try it" note (criterion 9), not a criterion of this task. The
diff-reviewer's stated gate for this task is the goldens against the `.ansi` files in
`tool/docs/design/render-reference/`, which needs no terminal.

**Acceptance, the exported surface (conductor, 2026-09-21, item 15 of the pre-flight):**
16. **The package's whole exported surface is pinned, so 20c's later additions are deliberate.**
    `Theme`, `NewTheme`, `Profile` plus its four constants, `DetectProfile`, `Role` plus its role
    constants, `GlyphSet`, the rung constants, `Frame`, `Sanitize`, `Render`, `RenderInput`,
    `Verdict` (the `spine.Verdict` alias), `StatusState`, and `Body` plus its constants are
    exported; everything else in the package is unexported. A surface test lists the set by name and
    fails on any addition or removal the list does not carry, so this task's own exports, and
    20a's, are pinned together at the point the render segment closes; Task 20c may not widen this
    list without updating the test.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 20b-iii: The many-sites fix list, fixture completeness, credential expiry, and `--width` validation

**New task, added in the 2026-09-21 fix round.** It is the first task of segment 4, so it lands
before Task 21 recuts goldens against the WARNING tier. It carries five carry-forward fixes the
segment 3 fix round surfaced against `body_many.go`, the credential-expiry field, and the `--width`
flag, none of which is the JSON contract Task 20c ships; that is why it is its own task rather than
a Task 20c criterion. Invoke `go-conventions` before writing any Go file and `golang-spf13-cobra`
before touching `root.go`. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Modify: `tool/internal/render/body_many.go`, `body_many_test.go`
- Modify: `tool/internal/render/fixtures/fixtures.go` (the `TwelveSites` and `AllUnknown`
  fixtures) and `tool/internal/render/testdata/golden/` (their strip goldens)
- Modify: `tool/internal/health/check_creds.go`, `check_creds_test.go`
- Modify: `tool/cmd/cairn/root.go`, `root_test.go`

**Segment 4 rulings (conductor, 2026-09-21).**
1. Fixtures are Go source at `tool/internal/render/fixtures/fixtures.go` (`AllUnknown`,
   `TwelveSites`); goldens live under `tool/internal/render/testdata/golden/`, not
   `tool/testdata/golden/`. Correct the Files list above accordingly.
2. For criterion 1's blocked-group head: set `f.check` to the blocking variable, and keep
   `severityClass(g.ids[0])` as the class key. The multi-variable collective word comes from the
   messages table; if no row fits, add a key, and report it under "New operator-facing strings"
   for Task 22a's editorial gate. No prose at the call site.
3. For criterion 2's merged covered-ids: take the intersection, and return nil below two ids,
   which is the existing no-covered-line shape. Rewrite `mergeCoveredIDs`'s doc comment in the
   same diff, since it currently calls the union deliberate.

**Acceptance:**
1. **The many-sites fix list's head for a group blocked by a missing credential names the blocking
   variable, or a collective word when the group covers more than one variable, never the first
   covered check id.** `body_many.go` near lines 495 to 515 currently heads a blocked group with
   `g.ids[0]`, the first check the group covers, which reads as a single failing check rather than
   as a credential gap. A test asserts a group blocked by one variable heads with that variable's
   name and a group blocked by more than one heads with the collective word, never with a check id.
2. **A merged same-text entry never shows a check id that belongs to only one of its sites.** When
   `mergeCoveredIDs` folds two sites' fixes into one printed line, the line's covered-checks list is
   the intersection the two sites actually share, never the union padded with an id one of them
   lacks. A test covers two sites whose blocked groups differ by one check and asserts the merged
   line names only the shared ones.
3. **The twelve-site and all-unknown fixtures carry all nine checks for every site**, with `?` in
   the columns a missing credential disables and the collective `Disables` line covering them, so
   the strip goldens show what a real run shows and no cell falls back to the separator glyph for a
   check the fixture simply omits. A test asserts each fixture's site records enumerate all nine
   check ids.
4. **A test in `check_creds_test.go` asserts the healthy-token path attaches the GitHub token
   expiry field** to the `creds` check's outcome, matching the ratified fix-round behavior (the
   overnight run record above) that the creds outcome carries the token's expiry alongside the
   engine outcome's installed-version field.
5. **`--width` is validated at the flag, not left to the renderer.** A non-positive or absurd value
   is a usage error at parse time, in `tool/cmd/cairn/root.go` near line 63's `validate` method,
   rather than a silently clamped or panicking render. A test asserts `--width 0`, a negative
   value, and an absurdly large value each exit 3 with a usage message naming `--width`.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 20c: The `--json` contract and the published schema

The machine half of the render. It is separate from 20b because it marshals the same inputs
without touching a body, and because what it ships freezes at 1.0 while the bodies' layout
explicitly does not. Invoke `go-conventions` before writing any Go file. Suggested model: `opus`,
because this is the surface that freezes.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Create: `tool/internal/render/json.go`, `json_test.go`, `testdata/json/`
- Create: `tool/docs/reference/json-output.md`
- Create: five schemas under `tool/docs/reference/`: `cairn-health.schema.json`,
  `cairn-health-summary.schema.json` (the NDJSON summary line), `cairn-sites-list.schema.json`,
  `cairn-logs.schema.json`, and `cairn-adopt-list.schema.json`
- Modify: `tool/internal/health/health.go` (a `MarshalJSON` on `Tier`), `report.go`,
  `logs/logs.go` (struct tags)
- Modify: `tool/cmd/cairn/health.go`, `sites.go`, `logs.go`, `adopt.go`

**Segment 4 rulings (conductor, 2026-09-21).**
1. No JSON Schema library and no new module for criterion 15's schema validation. A hand-rolled
   structural test: every `required` key present, each value's JSON type matches the schema's
   `type`, and no golden key is absent from the schema. Global constraints ban third-party
   assertion libraries and ADR-0002 changes the dependency graph only by amendment. Do not `go
   get` a schema library.
2. For criterion 11's provider-sourced fields: add an explicit `Source` on `spine.OutcomeField`,
   set by each producing check; the marshal boundary reads it and never infers. A test proves the
   rule.
3. For criterion 6's `schemaVersion`: one integer per payload type, each starting at
   `health.Report.SchemaVersion`'s current value, documented per schema; never one global number
   across the five schemas.
4. `spine.StateWord(s, ack)` already exists in `tool/internal/spine/exit.go` and yields the four
   wire words; criterion 1 reuses it rather than re-deriving the mapping.
5. `TestReportDeclaresNoMarshalJSON` is at `internal/health/report_test.go:16`, not line 15;
   correct the file:line if this task's diff touches that comment.

**Acceptance, the shape:**
1. **No enum reaches JSON as an integer, and the wire word is computed at the report boundary, not
   on `spine.State`** (conductor, 2026-09-20). Verified at HEAD: `spine.State` is `type State int`
   with exactly three values, `Unknown = iota`, `OK`, `Failing`
   (`internal/spine/outcome.go:12-20`), and `health.Report` declares no JSON struct tags, so
   today's payload emits `"State":0` for Unknown while exit code 0 means OK. The integers invert
   against the exit codes, and `"State":2` agrees with exit 2, which is worse, because agreement on
   one value teaches the wrong rule. **A `MarshalJSON` on `State` cannot be the fix**: the wire
   vocabulary has four words and the type has three values, and `held` is not a state at all but a
   Failing check carrying an unexpired `Ack`. So the mapping lives where the report is marshalled:
   OK is `pass`; Failing with an unexpired acknowledgement is `held`; Failing otherwise is `fail`;
   Unknown is `skip`. A test pins all four, and a second asserts `spine.State` itself implements no
   `json.Marshaler`. `health.Tier` does marshal as `none`, `cloudflare`, `github`, or `both`, since
   its values and its words are one to one.
2. **Every `skip` carries a mandatory `reason` code from a closed, frozen enum.** The four words
   alone cannot tell a missing credential from a timeout, and an agent reading `skip` as benign
   when the tool could not reach Cloudflare is the failure this closes. The enum is the
   `spine.ReasonCode` vocabulary that exists at HEAD, which already separates the cases:
   `reason.cred-missing`, `reason.cred-forbidden`, `reason.cred-revoked`, `reason.cred-expiring`,
   `reason.timeout`, `reason.offline`, `reason.not-run`, `reason.not-observable`, plus the two
   constructed families `reason.park.<code>` over the closed `ParkCode` set and `reason.api.<r>`
   over the nine closed `providers.Reason` values, `reason.api.rate-limited` among them. **A test
   asserts no check marshals `"state":"skip"` without a `reason`**, and a second asserts every
   `reason` a run can emit is a member of that enumerated set, read from the code rather than from
   a literal list in the test. `json-output.md` publishes the whole set and states that it is
   frozen at 1.0.
3. **Every exported field in a payload carries an explicit camelCase `json:` tag.** A reflection
   test walks `health.Report`, `health.CheckResult`, `spine.Outcome`, `spine.OutcomeField`, and
   `logs.Entry` and fails on any exported field without one. Falsify by removing one tag.
4. **`report_test.go`'s no-marshaller assertion is narrowed rather than deleted.** Verified at
   HEAD: `TestReportDeclaresNoMarshalJSON` (`internal/health/report_test.go:16`) asserts `Report`,
   `CheckResult`, and `spine.Outcome` implement no `json.Marshaler`, and its stated intent is that
   `Report.JSON` stays the only path bytes leave through so no bare `json.Marshal` silently
   re-implements the redaction filter. That intent is preserved: all three still declare none, the
   one new marshaller sits on `Tier`, which carries no redaction, and the state word is computed
   rather than marshalled. The test keeps its three assertions and gains a comment naming the one
   type that now has a marshaller and why.
5. **`Fields` is emitted as an object, not an array of key-value pairs.** At HEAD
   `spine.OutcomeField` is `{Key string; Value json.RawMessage}` and `Outcome.Fields` is a slice,
   which renders as `[{"Key":"errorCount","Value":3}]`: the strings `Key` and `Value` repeat per
   field and a consumer must scan the array instead of indexing it. The ordered slice stays as the
   in-process type, because the text bodies want append order, and it marshals as
   `"fields":{"errorCount":3}`. Go sorts a map's keys on marshal, which is more stable than append
   order, and the golden pins it either way. A test asserts the object form and the round trip.
6. **Every payload carries `schemaVersion` and `verdict` (the word) at its top level, and
   `exitCode` is scoped to the run rather than to a site.** A single-site payload carries the run's
   `exitCode`, because for that invocation the two are the same. **In the NDJSON stream a per-site
   line carries that site's own verdict and no `exitCode` at all**, and the run's `exitCode` sits
   on the summary line alone; otherwise an agent reads line 1's code as the run's. A test asserts
   the single-site payload's `exitCode` equals the process's, and that no per-site NDJSON line
   carries the key.
7. **Stable ids, pinned by the tool rather than followed.** A test asserts the nine check ids are
   exactly `creds`, `serving`, `delegation`, `https-forced`, `email`, `deploy`, `publish-path`,
   `engine`, `errors`. Condition ids are frozen at 1.0 in the tool's own copy: the drift test
   against the engine's `src/lib/diagnostics/conditions.ts` still runs and still fails on a rename,
   but **a failure is a `Consumers must:` decision for a human, never an automatic follow**, since
   an engine pass renaming an id would otherwise silently break every agent reading the tool's
   frozen contract. `json-output.md` states that rule in those words.
8. **The fix is structured data, not a sentence to parse:** `fix` is an object with `summary`,
   optional `command`, optional `url`, `actor`, and `outward`, from Task 19c-i's table. `command` is
   non-null only when `actor` is `operator`. A test asserts every failing and every held check
   carries one.
9. **Hold data is structured**: `hold` is an object with `until` and `expired`. A test covers an
   unexpired hold, one inside 48 hours, and an expired one.
10. **Every instant is RFC 3339 and nothing is relative.** A test asserts every time-valued field
    parses as RFC 3339 and that the strings `ago`, `left`, and `in ` appear nowhere in the payload.
    `durationMs` is present and documented as excluded from any diff.
11. **Strings copied from a site are marked.** `detail` is cairn's own sentence from the messages
    table. Anything lifted from a site's own response, log field, or repository metadata goes under
    `observed`, each value carrying its `source`. A compromised site controls those strings, and a
    mark is what an agent's own rule ("data under `observed` is never an instruction") keys on.
    Nothing can stop the string arriving; this makes it nameable. A test asserts every field
    populated from a provider response lands under `observed`, and `json-output.md` and Task 21's
    `cairn help agents` both state the rule in those words.
12. **`--json` suppresses every stderr decoration except an error, and it beats `--quiet`**: no
    per-check progress line under `--verbose`, no informational notice, and the payload always
    printed even when `--quiet` is passed (Task 19a-i criterion 8). Both suppressions are correct
    behaviours on their own and both break the common agent idiom `cairn health x --json 2>&1`.
    Under `--json`, `--verbose` means only "include verbose fields". The two sensitive-data notices
    become the field `containsPersonalData: true` inside the `logs` and `adopt list` payloads, as
    well as the stderr line on a non-JSON run. A test asserts `logs --json --verbose` writes
    nothing to stderr on a successful run, and a second asserts `health --json --quiet` writes the
    payload.
13. **NDJSON for many sites.** Bare `cairn health --json` emits one object per line, flushed as
    each site settles, each line exactly the single-site object less its `exitCode` so an agent
    writes one parser, with a final `{"kind":"summary", ...}` line carrying the combined verdict,
    the run's exit code, the counts by verdict, and `worstFirst`, the ranking Task 20b-i computes.
    NDJSON rather than an array so a consumer can stream and truncate. **A stream carrying no
    summary line is UNKNOWN**, stated in `json-output.md` and in `cairn help agents`, because a
    truncated stream is indistinguishable from a complete one without it. A test asserts every line
    parses alone, that the summary is last, and that a stream cut before the summary is documented
    as unreadable rather than partially believed.
14. **`sites list --json` carries enough to skip a second call**: each site's id, name, domain, and
    last-known step, stated in `json-output.md` as a guarantee so an agent does not have to
    discover it.
15. **A published JSON Schema per payload, with a golden.** The five schema files named in Files
    above each sit under `tool/docs/reference/`, and a test validates each golden payload against
    its own schema, so a schema cannot drift from the output. A second test asserts
    `json-output.md` names every field the goldens contain.
16. **`json-output.md` states what freezes at 1.0 and what does not,** from `reviews/agent-usability.md`'s
    freeze list. Frozen, meaning a change is a major-version event with a `Consumers must:` line:
    the four exit codes and their words; the precedence rule; usage error means exit 3 with empty
    stdout; `--json` beating `--quiet`; every check id; every condition id, the reason enum, and the
    four `actor` values; the state vocabulary `pass`, `fail`, `skip`, `held`; the `--json` key names
    and their types under the schema-version promise, added within a version and never removed or
    retyped; stdout is the payload and stderr is diagnostics; the credential variable names and the
    environment-before-keyring resolution order; and no command waiting on stdin when stdin is not
    a terminal. Explicitly not frozen, and said so: the text bodies' layout, the glyph set, the
    ordering within `checks` in the text body, `durationMs`, and the relative time strings. A test
    asserts the doc carries a frozen list and a not-frozen list and that every frozen check id and
    verdict word in it matches the code.
17. **Determinism is pinned rather than left to survive by accident:** `checks` in declaration
    order in the text bodies and sorted by id in `--json`; `Acknowledged` sorted. Then two runs of
    an unchanged site differ only in the time fields, and `json-output.md` publishes the diffable
    projection (`checkId`, `state`, `reason`, `condition`, `fix.summary`) with the `jq` expression
    for it.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 21: The WARNING tier, the usage-error contract, the error surface, `cairn help agents`, and the scrubbing chokepoint

**The exit-code arithmetic is not here.** It moved to Task 18 at the 2026-09-20 night review, so
this task widens `spine.ExitCode` with the per-check severity table rather than creating it.
Invoke `go-conventions` before writing any Go file and `golang-spf13-cobra` before any `cmd/cairn`
file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Create: `tool/internal/logx/logx.go`, `logx_test.go`
- Create: `tool/cmd/cairn/help_agents.go`, `help_agents_test.go`, `usage_test.go`
- Create: `tool/docs/reference/log-events.md`, `tool/docs/reference/exit-codes.md`
- Create: `tool/internal/health/severity.go`, `severity_test.go` (the per-check fail severity table)
- Modify: `tool/internal/spine/exit.go`, `exit_test.go` (the severity input Task 18 left open)
- Modify: `tool/cmd/cairn/main.go`, `root.go`, `auth.go`, `probe_token.go`, `health.go`

**Segment 4 rulings (conductor, 2026-09-21).**
1. For criterion 7's severity plumbing: add a `Severity` field on `spine.CheckVerdict`, populated
   by health's report-to-verdict conversion. `spine` never imports `health` and never learns a
   check id.
2. For criterion 2's `Degraded` handling: the cred-missing exclusion from the UNKNOWN trigger is
   per check, on `Reason == cred-missing`. `Report.Degraded` is only the reported discriminator
   and suppresses nothing wholesale; a site with both a cred-missing skip and a transport Unknown
   is UNKNOWN.
3. For criterion 5's byte-empty-stdout requirement: usage and help text for an error go to
   stderr; stdout stays for payloads (`SilenceUsage` plus an explicit stderr print, or the cobra
   equivalent). Pin it with the falsification table run against the built binary.
4. Add to the Files list above: `tool/internal/render/testdata/golden/` (the recut) and
   `tool/internal/render/golden_test.go`, which the carried golden recut requires.
5. Criterion 6's "measured at HEAD" line is stale. At HEAD `76364ca2` `cairn --nope`, `cairn
   frobnicate`, `cairn auth set` with no argument, and `cairn health` with no registry all exit 3,
   since `tool/cmd/cairn/main.go:55` exits `int(spine.VerdictUnknown)`; Task 18 shipped that. The
   exit-3 requirement already holds for these cases, so this task owes the falsification-table
   test and whatever rows still fail, not a behavior change here. The criterion text below is
   corrected to match.
6. Criterion 11's premise is stale. `os.Exit` appears at `main.go:55` and as the field default
   `exit: os.Exit` at `tool/cmd/cairn/deps.go:128`. `probe_token.go` calls `d.exit(...)` (line
   214), as do `health.go:119`, `sites.go:105`, `health_sweep.go:161`. The writer-grep allows
   exactly those two `os.Exit` occurrences (`main.go` and `deps.go`'s field default). The
   criterion text below is corrected to match.

**Produces:** `logx.New(w io.Writer, scrub []providers.Credential)` whose every write runs the
scrub last, over line boundaries.

**Acceptance, a real WARNING tier:**
1. **Each check declares whether its own failure warrants CRITICAL or WARNING, in one table,** in
   `health`, beside `All`. A site whose only failures are version drift or an expiring credential
   is WARNING; a site where nothing could run is UNKNOWN; **zero checks is UNKNOWN, never OK**,
   which Task 18 already ships and this table must not contradict. A table covers every check id,
   and a test asserts the table names every member of `All` and nothing else, so a tenth check
   cannot land without a severity. `spine.ExitCode` reads this table through the input Task 18
   left open, and a test asserts Task 18's pinned pre-table behaviour changes exactly where the
   table says WARNING.
2. **The two kinds of Unknown are disambiguated, and the report carries the discriminator.** An
   Unknown whose reason is a missing, unconfigured credential maps to **WARNING through
   `Degraded`** and is excluded from the UNKNOWN trigger: the operator has not configured a
   credential, which is a disclosed gap, and paging them for it every morning is what makes a
   routine ignorable. **Every other Unknown triggers UNKNOWN, a rate limit included.** The
   catalogue's own rate-limited row (`copy-standard.md` section 3.8) asserts `WARNING, never
   CRITICAL`; **that line is overruled** (conductor, 2026-09-20): a rate-limited run did not
   observe the site, so the honest verdict is "could not run", and WARNING would tell an operator
   the site was checked and found merely imperfect. The catalogue's note at its head records the
   override, and whether the owner prefers the catalogue's reading is one of the two questions
   under "outside the amendment, for the owner". `Degraded` is the discriminator and Task 12 sets
   it on exactly the cred-missing skip. **A table covers four rows**: a cred-missing Unknown
   alone, which is WARNING; a transport Unknown alone, which is UNKNOWN; both together, which is
   UNKNOWN; and a rate-limit Unknown alone, which is UNKNOWN.
3. **An acknowledgement softens Failing only, never Unknown.** An unexpired acknowledgement on a
   failing check moves it from CRITICAL to WARNING. It has no effect on an Unknown: an
   acknowledgement is an operator saying "I know this is broken and I accept it", which they cannot
   say about a check that did not run. A row covers an acknowledgement naming a check that came
   back Unknown and asserts the code is unchanged.
4. A table test covers the empty-registry case, an acknowledged failing check and the same check
   with an expired acknowledgement, and a report whose `creds` check is Failing on
   `reason.cred-expiring`, which is CRITICAL rather than WARNING or UNKNOWN: an expiring token is
   a fault the operator can fix before it lands. Task 18's own table covers the precedence
   pairings and is not duplicated here.

**Carried from segment 3 (2026-09-21).** The WARNING tier this task ships changes site verdicts, so
this task recuts every many-sites and single-site golden where a site's only failures are
WARNING-class. In the twelve-site fixture, `cairn.pub` and `xcathletes.org` show only the amber
mark yet read CRITICAL today, which is correct only until this task's per-check severity table
lands; the recut runs after Task 20b-iii's fixture-completeness fixes so the goldens it produces
show the corrected fixtures.

**Acceptance, the usage-error contract:**
5. **A usage error exits UNKNOWN, which is 3, with byte-empty stdout.** An unknown flag, a missing
   required argument, a malformed flag value, and an unknown subcommand all exit 3. An operator's
   alerting already reads 3 as "the check could not run", which is exactly what a usage error
   means, and teaching a routine `sysexits.h`'s 64 alongside would be a second table for one case.
   **`--json` is a script's discriminator**: a usage error emits no JSON at all, so empty stdout
   means the invocation was wrong, not that the site is healthy. **This is exactly why `--json`
   beats `--quiet`** rather than the two combining into a silent success, and `exit-codes.md`
   states the pair together.
6. **The falsification table, named once and used twice.** It is the six invocations `cairn
   --nope`, `cairn frobnicate`, `cairn health --error-threshold abc`, `cairn health no-such-site`,
   `cairn auth set NOT_A_VAR`, and `cairn auth` alone. Each must exit 3 with byte-empty stdout,
   **run against the built binary**, not against a `cobra.Command` in memory. The same six rows are
   run against the pre-task binary and the report records that result. **Bare `cairn health` is not
   a row**: after Task 19a-ii it is a valid sweep. **Measured at HEAD `76364ca2` against a fresh
   `go build`**: `cairn --nope`, `cairn frobnicate`, `cairn auth set` with no argument, and `cairn
   health` with no registry all already exit 3, since `tool/cmd/cairn/main.go:55` exits
   `int(spine.VerdictUnknown)` (Task 18 shipped this); `cairn auth` alone still exits 0, because a
   command group with no `RunE` prints help. This task owes the falsification-table test itself
   and a fix for whatever rows still fail, not a behavior change to the already-passing cases.
7. **`--help` and `--version` exit 0,** recorded in `exit-codes.md` as a deliberate deviation from
   the monitoring guidelines, which would have them exit 3. A human running `cairn --help` should
   not see a failure, and no scheduled routine invokes either.

**Acceptance, the error surface:**
8. **Errors print with a `cairn: ` prefix** on stderr, one line, never a Go stack and never a
   wrapped chain's full text where the outer message already says it, through Task 19c-ii's
   translation boundary. A test asserts the prefix on each of a usage error, a command error, and
   a tool fault.
9. **`SetFlagErrorFunc` appends a hint** naming the command's own help: "run 'cairn X --help'",
   with X the command path the error came from. A test asserts the hint names the subcommand
   rather than the root.
10. **There are exactly two ways a process exit code is decided, and they cannot collide.**
    `spine.ExitCode` decides the code for a run that produced reports. Everything that produced no
    report is a **typed error that `main` maps**: a cancelled run, a usage error, `auth probe`'s
    typed coded error, and a tool fault. The two cannot disagree, because `ExitCode`'s inputs are
    site verdicts converted from reports (ratified 2026-09-21: `[]SiteVerdicts`, not
    `[]health.Report`, directly), list errors, and an expected count, and none of the four can be
    expressed in those. A
    test asserts each of the four reaches its code through `main` without `ExitCode` being called,
    and `exit-codes.md` states the split.
11. **`cmd/cairn` returns a typed exit error from `RunE` and `main` is the only `os.Exit` caller.**
    Verified 2026-09-21 at HEAD `76364ca2`: `os.Exit` appears at `main.go:55` and as the field
    default `exit: os.Exit` at `tool/cmd/cairn/deps.go:128`; `probe_token.go` calls `d.exit(...)`
    (line 214), as do `health.go:119`, `sites.go:105`, and `health_sweep.go:161`, so the probe
    command and the health/sites/sweep paths already call through the injected field rather than
    `os.Exit` directly. After this task the writer grep extends to `os.Exit`, allowing exactly the
    two occurrences in `main.go` and `deps.go`'s field default: the test that allows `os.Stdout`
    and `os.Stderr` only in `main.go` also allows `os.Exit` only there (plus that one field
    default). Falsify by adding one elsewhere, confirm the failure names it, remove it.
12. **`main` recovers a panic, prints one scrubbed line through the same chokepoint, and exits 3.**
    A Go panic's default output goes straight to the real `os.Stderr`, bypassing the scrubbing
    writer, so a panic in a credential-carrying frame could print a token into a scheduler's log.
    Task 12 already recovers a panicking check; this covers everything outside one. The printed
    line names the panic value's type and the command, never the value verbatim, and the operator
    sentence comes from the messages table. A test panics with a sentinel-bearing value and asserts
    exit 3, the sentinel absent from both streams, and no stack trace.
13. **Under `--verbose` only, and never under `--json`, one stderr line per check as it
    completes**, naming the check id and its outcome, so a run that takes a while is visibly
    progressing rather than apparently hung. It reads through Task 12's `Options.OnCheck` callback,
    which is why that callback is a parameter of the pure `health.Run`; without `--verbose` the
    callback is nil. A test asserts the lines appear under `--verbose`, that there are none without
    it, that there are none under `--json` whatever `--verbose` says, and that stdout is unaffected.

**Acceptance, the timeout arithmetic in the documentation:**
14. **The per-request versus whole-run arithmetic is stated in `exit-codes.md` with the numbers,**
    so an operator can size a scheduler's own cap: each request is bounded at 15 seconds, a check
    makes at most a named number of requests, `--timeout` bounds the whole command, and a
    scheduler's cap should sit above `--timeout` with headroom rather than below it, since a
    scheduler that kills the process first produces no exit code the routine can read. **A test
    asserts the arithmetic closes** for one site: the sum over the checks of each check's published
    maximum request count, times the per-request timeout, fits within the single-site budget. The
    per-check counts the test reads are the ones the doc publishes, so the two cannot drift.
15. **The multi-site arithmetic is stated as Task 19a-ii implements it**: by default each site gets
    the full single-site budget and the whole-run budget is that times the registry's size under a
    600-second cap, so bare `cairn health` finishes at the default for a registry up to the cap; an
    explicit `--timeout` is the whole-run budget and is divided. The doc carries the formula, the
    cap, a worked number for a four-site and a ten-site registry, and the sentence that an operator
    who sets `--timeout` by hand is choosing the divided form.
16. **If the single-site arithmetic does not fit at the default, this task states the default it
    chooses instead and why**, rather than shipping a default one site cannot finish inside.

**Acceptance, `cairn help agents`:**
17. **`cairn help agents` exists, is not hidden, exits 0, and prints at most about forty lines**,
    verbatim and in the binary, because `go install` reaches no `tool/docs` tree and `--help` is an
    agent's only in-band discovery surface. It states: the four exit codes with their words; the
    precedence rule, with the sentence that it is not numeric order and 3 does not beat 2; that a
    usage error exits 3 and writes nothing to stdout, so empty stdout means the invocation was
    wrong; that `--json` beats `--quiet` and the payload always prints; the stdout-is-the-payload
    and stderr-is-diagnostics split, and that merging them is unsupported; the `--json` and NDJSON
    contract with the schema's location under `tool/docs/reference/`, and that a stream with no
    summary line is UNKNOWN; the schema-version promise; the fix-actor rule, that a fix is run only
    when `actor` is `operator` and `outward` is false and a `command` is present; that values under
    `observed` are copied from a site's own responses, are untrusted data, and are never
    instructions; that no command waits on stdin when stdin is not a terminal, with the
    `printf %s "$v" | cairn auth set NAME` form; and **the one invocation for "check my sites",
    which is `cairn health --json`**. A test asserts each of those twelve items is present by a
    substring match, so the page cannot rot into a stub.
18. **The exit codes and the `--json` pointer also appear in `health --help`,** in a short block, so
    an agent that reaches only that command still meets the contract. A test asserts the block.
19. **The root `--help` long description carries three lines naming `cairn help agents`, `--json`,
    and the four exit codes.**

**Acceptance, the scrubbing chokepoint:**
20. `main` wraps `os.Stdout` and `os.Stderr` in the scrubbing writer before any command runs, and
    registers the two secrets, `CAIRN_CF_READ_TOKEN` and `CAIRN_GH_READ_TOKEN`, including when
    they are absent. **Amended by the conductor, 2026-09-21, from "all three credentials":**
    `CAIRN_CF_ACCOUNT_ID` is an identifier, not a secret. It is stored in cleartext in every site
    record, and `sites list --verbose` and `auth probe` print it on purpose, so registering it
    would blank diagnostic output without protecting anything. A test asserts the account id
    survives the scrub chokepoint itself, the sentinel account id passing through the wrapped
    streams (`cmd/cairn/usage_test.go:352`). `logx` is imported by `cmd/cairn` alone, per the
    architecture's downward order. **Corrected against HEAD by the conductor, 2026-09-21**: this
    sentence originally read "a test asserts the account id survives `sites list --verbose`
    unredacted"; what landed proves the stronger claim above, and that is the one a reader should
    find.
21. **The scrub runs over line boundaries, not over whatever one `Write` call happens to carry.**
    A credential split across two writes escapes a per-call scan, and a renderer that emits a row
    in cells does exactly that. `logx` buffers until a newline, scrubs the completed line, and
    flushes; it also flushes any partial tail at close, scrubbed. A test writes one credential one
    byte per `Write` and asserts the assembled output carries `<redacted>`.
22. **The scrubber ignores an empty credential and any credential shorter than a stated minimum
    length.** An empty registered value would match everywhere, and a very short one would redact
    unrelated text: a two-character credential turns ordinary output into `<redacted>`-riddled
    noise, which is worse than a missed redaction because it destroys what the operator is reading.
    The minimum is a named constant with its reason in its doc comment, and a value below it is
    registered but never matched, with the skip recorded once on stderr under `--verbose`. Two
    tests: an absent-credential run's output is byte-identical to a no-credential run, and a short
    sentinel does not redact unrelated text containing it.
23. Scrub test: a log line embedding a credential's plaintext is emitted with `<redacted>` in its
    place. The sentinel byte-level test: a record fixture with sentinel secrets passes through
    `sites list --json`, `health --json`, the logger, an error wrap, and `store.Save`, and the
    sentinel appears only in the store file.
24. `exit-codes.md` documents the contract for a routine: the four codes by name, the precedence
    rule, the acknowledgement flag's effect, the usage-error and `--help` rulings, the
    `--json`-beats-`--quiet` rule, the `--ack-file` default path, and the fact that a scheduler
    starts with no shell profile, so the three credentials reach it the way Task 24a's examples
    show per platform. It names the convention as the monitoring-plugin one. **It also records the
    positional-argument decision**: `health <site>` takes its site as an operand rather than as a
    flag, against the monitoring guidelines' preference for flags, because POSIX, clig.dev, `gh`,
    and `kubectl` all accept a primary operand and an operator's muscle memory is the stronger
    signal.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.
### Task 22a: The 1.0 cut up to the tag, and the release candidate

Everything the cut needs except the tag itself. It ends with a binary the owner can run and a short
note telling him how, which is the owner gate this pass stops at. Invoke `go-conventions` before
writing any Go file and `golang-spf13-cobra` before any `cmd/cairn` file. Suggested model:
`sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Create: `tool/CHANGELOG.md`, `tool/README.md`
- Create: `tool/cmd/mangen/main.go`, `main_test.go` (the man-page generator, in its own command)
- Create: `tool/docs/release-candidate-notes.md` (the owner's "try it" note)
- Modify: `tool/cmd/cairn/root_test.go` (the every-action coverage assertion), `root.go` (cobra's
  `Version` field), `tool/Makefile` (a `man` target)

**Segment 4 rulings (conductor, 2026-09-21).**
1. This task does not touch `docs/STATUS.md`; it is removed from the Files list above. The
   conductor writes STATUS at the segment boundary, and Task 25 carries the version line. This
   keeps this task's diff tool-only and its gate on the light lane.
2. For criterion 3's man pages: proceed with `cmd/mangen` on `cobra/doc`. `go-md2man` and
   `blackfriday` arrive as indirect requires; record both in `tool/docs/adr/0002-render-dependencies.md`
   in the same commit. The direct-require count stays four.
3. Criterion 8's carry-forward list is short one item: seven ack refusals, not six, since the
   list omits `ackFileUnreadableError`. The "owed to Task 22a's editorial gate" comment is one
   block comment above all seven `tmplAck*` constants at `tool/cmd/cairn/messages.go:276`, not one
   per function. The criterion text below is corrected to match.

**Acceptance:**
1. **Every action coverage assertion, under the renamed grammar.** A test over the cobra tree
   asserts the command set is exactly `sites list` (with bare `sites` as its alias), `health`,
   `logs`, `adopt`, `adopt list`, `auth set`, `auth list`, `auth unset`, the hidden `auth probe`,
   **plus cobra's own `completion` and `help`**, which the tree carries because Task
   19b keeps them. Flags: the root's persistent `--timeout`, `--verbose`, `--quiet`, `--color`,
   `--width`, `--version`, `--help`, and `--ack-file`; `sites{--json,--expect-sites}`;
   `health{--json,--ack,--error-threshold,--since}`; `logs{--event,--since,--json}`;
   `adopt{--worker,--repo}`; and `adopt list{--json}`. **`--verbose` is a root persistent flag and
   is asserted there, not under `health`**, which is where the 2026-09-14 draft listed it and
   where the assertion would have disagreed with the tree Task 19a-i builds. A second assertion
   lists the verbs deliberately absent in 1.0: the TUI launch, the interactive adopt dialog, and
   the concurrent sweep. The 2026-08-20 spec names no machine-readable verb list, so the set is
   enumerated here rather than derived, which is what makes the gate a gate. **Corrected against
   HEAD by the conductor, 2026-09-21**: the landed tree (`cmd/cairn/coverage_test.go:55` onward)
   carries `cairn agents` as a cobra help topic that `cairn help agents` reaches, not a `help
   agents` command in the command set above; `--ack-file` is a root persistent flag, not a
   `health` flag; and `--json` and `--expect-sites` sit on the `sites` parent, not on
   `sites list`.
2. **`--version` uses cobra's `Version` field** rather than a hand-rolled flag, and its output
   carries the tool version, the commit, the Go version it was built with, and `GOOS/GOARCH`. A
   test asserts all four parts and that the version and commit come from `internal/version` rather
   than from a literal.
3. **A man page is generated with cobra's doc generator and shipped** (Geoff, 2026-09-20), **from
   `tool/cmd/mangen`, not from inside `cmd/cairn`.** `github.com/spf13/cobra/doc` pulls
   `cpuguy83/go-md2man/v2` and `russross/blackfriday/v2`, measured, and a generator living in
   `cmd/cairn` would link both into every operator's binary for a file the binary never reads. A
   second command costs nothing and also makes Task 23 criterion 5's "a second `cmd` in the module"
   true of two commands rather than one. `make -C tool man` writes it, `make -C tool install`
   installs it beside the binary, and Task 23 puts it in every release archive. A test asserts the
   generated page names every non-hidden command, so a new command cannot ship without a man entry,
   and a second asserts `cmd/cairn` imports no `cobra/doc` package. The generated file is not
   committed: it is a build artifact, and a test asserts it is git-ignored.
4. `make -C tool install` builds and installs to `~/.local/bin/cairn` with mode 0755, matching
   poplar's Makefile, and `cairn --version` on the installed binary prints the version plus the
   commit. That is the local path; the product's install paths are `go install` and the release
   binaries, which Task 23 proves.
5. The installed binary prints a **`-dirty`** suffix when built from a modified tree. The suffix is
   `git describe`'s own, and `tool/Makefile` calls `git describe --tags --match 'tool/v*' --dirty
   --always` (verified 2026-09-20 at HEAD), which appends `-dirty` with a hyphen. Earlier drafts
   wrote `+dirty`, which no command produces. Falsify once: touch a source file, run `make -C tool
   install`, confirm the suffix, restore, reinstall, confirm it is gone. The task report records
   `go version` and the `GOOS/GOARCH` it built for.
6. `tool/CHANGELOG.md` opens with the `1.0.0` entry, listing the registry, the checks, the
   subcommands, the credential providers, the exit-code contract, the render and its JSON contract,
   and an explicit "not in 1.0" line naming the HUD, the concurrent sweep, and multi-site
   management.
7. `tool/README.md` is written for an operator who has never seen this repository. It states the
   two install paths; the three credentials with a pointer to `tool/docs/credentials.md` per
   platform; the four exit codes by name; a pointer to `tool/docs/tripwire.md`; a pointer to
   `cairn help agents` for an agent; and one sentence that 1.0 is the complete CLI and 2.0 adds the
   HUD. No sentence says the module is for one machine, and no example tells a reader to source a
   file only this workstation has. It additionally states three things a first-run operator
   otherwise discovers the hard way: **the registry precedence** (`CAIRN_STATE_DIR`, then the Node
   CLI's `~/.config/cairn/sites` when that directory exists, then `os.UserConfigDir` plus
   `cairn/sites`), first match wins and paths are never merged; **that removing the legacy directory
   is how an operator migrates**, which is optional in 1.0; and **that the tool makes no update
   check** and never contacts a release feed. The README is documentation rather than a program
   string, so it is not routed through the messages table; it is graded at criterion 8's editorial
   gate along with the golden.
8. **The editorial gate runs here, once, before the tag** (`copy-standard.md` section 4.5). Three
   steps, in order: `make -C tool copy-review`, the local-only target Task 19c-i built, which runs
   `tellgrader --register editor` over `tool/testdata/copy.golden.md` and is the reason that tool
   is not in CI's `check`; one `cairn-register-editor` dispatch over the same golden plus
   `tool/README.md`, with `copy-standard.md` as its contract, returning ranked findings with
   proposed rewrites, which this task folds; and the owner's own read of the golden. The report
   names the dispatch, pastes the `copy-review` output, and says what it changed. After 1.0 the
   golden's diff in review is the standing gate and no separate ritual is needed.
   **Carried from segment 3 (2026-09-21), the strings owed so far**: `flagWidthHelp`
   (`tool/cmd/cairn/messages.go:57`); the observability fix line "Turn on observability for the
   Worker in wrangler.jsonc, then deploy again." (`tool/internal/health/fixes.go`); "CAIRN_CF_READ_TOKEN
   is not set, so creds, email and errors cannot run"; "also on:"; and the `engine` fallback table
   heading, all four of the last group already carried in `copy-standard.md` section 4.7 (checked
   2026-09-21: it holds ten rows, all from Task 20b-i and 20b-ii's render strings). **Section 4.7
   does not carry the segment 2 strings**, against an earlier report's claim that it did: `auth
   unset`'s seven ack refusals (`ackFlagError`, `ackFileNotFoundError`, `ackFileMalformedError`,
   `ackFileMissingCheckIDError`, `ackFileMissingExpiryError`, `ackFileMalformedDateError`,
   `ackFileUnreadableError`, all in `tool/cmd/cairn/messages.go`, covered by one block comment
   reading "owed to Task 22a's editorial gate" above all seven, at `messages.go:276`) and the
   sweep's partial-result line (`writeSweepTimeout` in
   `tool/cmd/cairn/health_sweep.go`, its three columns "new to `cmd/cairn`'s operator-facing
   strings" by the function's own comment) are owed but uncaptured in the catalogue. This task's
   editorial gate reads them from the code comments marking them, not from section 4.7 alone, and
   files the gap as a correction to 4.7's own header the same pass.
9. **A release candidate the owner can run.** `make -C tool install` from this task's commit puts a
   binary at `~/.local/bin/cairn`, and `tool/docs/release-candidate-notes.md` is a short note for
   Geoff: how to build it, how to point it at his own registry (`source ~/.local/secrets` in one
   non-interactive shell, `cairn adopt list`, adopt the four production sites, `cairn sites list
   --json`), the six things to look at (the single-site body at his own terminal width, the sweep's
   strip, the ASCII tier through a pipe, `cairn health --json | jq`, an error message, and `cairn
   help agents`), and what a "no" would mean for each. **The note also tells him to look at the
   single-site body and the strip in his own real terminal**, not only the offscreen renders Task
   20b-i and 20b-ii shipped (conductor, 2026-09-21): the carry-forward "real-terminal evidence,
   owner's morning" is settled here, by his own eyes, rather than by a captured frame. **Carried
   from segment 3 (2026-09-21): the note also points him at the three offscreen frames the
   overnight run produced, if they are still present in the session scratchpad**, as a quick
   before-he-builds preview alongside the real terminal read, never a substitute for it. **It is a
   note, not a runbook**: one page. The report pastes the note.
10. **No tag is pushed by this task, and no npm publish happens.** `package.json` is untouched. The
    tag is Task 22b's and is owner-gated. **This task is the last one an unattended run may execute
    before Task 24a**, and the pass report says so in the words the conductor will read at the
    checkpoint.
11. Brew, a Windows package channel, and the npm shim stay 2.0. A tag, a `go install` path, and
    release binaries are 1.0, per the 2026-09-14 ruling.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` plus a clean-clone CI run.
  Commit.

### Task 24a: The scheduled run, documented for three schedulers

Segment 4 decision pre-flight, 2026-09-21: fully specified; no rulings.

**Not owner-gated, and it is the last task of the overnight launch list.** It verifies against Task
22a's release-candidate binary, not against the tag, which is why it runs before the gate rather
than after it. **Task 24 was split at the 2026-09-20 night review**: this half is the documentation
and every check an unattended executor can actually perform, and Task 24b is the owner's own
machine, which an unattended executor cannot drive and would otherwise stall on or fabricate.

**The tripwire is `cairn health` on a schedule, not a new subcommand.** The spec names the
subcommand as the tripwire and gives it the exit-code contract, and its `cmd/cairn` section carries
no `tripwire` verb. So 1.0 adds no command here: it documents the scheduled run for each platform,
and every capability the run needs is already a flag by Tasks 19a-i, 19a-ii, 19b, and 21. Suggested
model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Create: `tool/docs/tripwire.md`

**Acceptance:**
1. `tripwire.md` carries a working example for each of the three schedulers, each complete enough
   to copy:
   - **systemd**, a user service plus timer with `OnCalendar=daily`, `Persistent=true` so a run
     missed during a suspend fires on resume, and `RuntimeMaxSec` as a second wall-clock cap behind
     the binary's own `--timeout`, sized above it per Task 21's stated arithmetic. The example reads
     the three credentials from an `EnvironmentFile` the operator owns, **at mode 0600 and stated as
     such in the example itself**, and says why a scheduler cannot inherit a shell profile.
   - **launchd**, a LaunchAgent plist with `StartCalendarInterval`, `EnvironmentVariables` for the
     three values or a wrapper that reads them from the keyring, and `StandardOutPath` and
     `StandardErrorPath` so a failed run leaves a readable trace. launchd has no execution cap, so
     the example leans on `--timeout` and says so.
   - **Windows Task Scheduler**, a `schtasks /create` command with a daily trigger, run under the
     operator's own account so the Credential Manager entry is reachable, with `/ET` naming the
     execution cap. **`cairn auth set`, which writes to the Credential Manager, is the primary form
     the example shows.** `setx` is named only as the fallback, with its two caveats stated: it
     writes the value as plaintext into `HKCU\Environment`, and it truncates a value at 1024
     characters, which silently corrupts a long token. No example puts a credential on `schtasks`'s
     own argv, where every process on the machine can read it.
2. **Every example calls bare `cairn health --quiet`, one command for the whole registry**, because
   the 2026-09-20 amendment brought the sweep into 1.0. The doc also shows the per-site loop
   (`cairn sites list --json --expect-sites N`, then `cairn health <id>` per id) as the form an
   operator uses when they want a per-site exit code, and says which to prefer and why. The
   concurrent sweep is named as 2.0.
3. **All three examples pass `--quiet`,** so a green run really is silent, cron sends no mail, and
   launchd's and Task Scheduler's log paths stay empty until something is wrong. A green run that
   still prints trains an operator to ignore the output. The doc states that `--quiet` suppresses
   output on OK only, that every non-OK verdict still prints, and that `--json` beats `--quiet` so
   a JSON-logging routine still gets its payload.
4. **`--timeout` is discussed per Task 21's arithmetic.** The doc states that the default already
   scales with the registry up to the stated cap, so most operators pass no `--timeout` at all, and
   that an operator who passes one is choosing the divided form and should size it as the formula
   says for their own registry.
5. Every example alerts on any non-zero exit and names the four codes it may see, so an operator
   can route WARNING and CRITICAL differently. It alerts on a single run rather than after two
   consecutive ones: a day's delay on a real failure is worse than a false alarm.
6. An alert names the failing site, the failing check ids, and each check's fix, and it never prints
   a credential or a verbose field.
7. **Keeping the first run green is the acknowledgement feature's job, not a script's array.** The
   doc shows `--ack <check-id>=<YYYY-MM-DD>` and the `--ack-file` default path from Task 19b, states
   that an acknowledged failing check exits WARNING rather than CRITICAL, that an expiry date is
   required so no acknowledgement outlives its author's attention, and that an acknowledgement
   applies per check id across every site in a sweep. It shows the same for `--error-threshold` on a
   noisy site. A routine that alerts every morning from creation is functionally the same as silent
   green, and turning a check off is the wrong fix.
8. `tripwire.md` states that a scheduled unit is the machine-detectable form of this watch and that
   no ROADMAP line duplicates it. It states why a cloud routine through the `schedule` skill is not
   the answer: a cloud agent reaches no operator's environment, keyring, registry, or installed
   binary, so it becomes correct only once a hosted spine exists, which is a 2.0 hand-forward.
9. **Every command the doc prints is run against Task 22a's release-candidate binary and its
   output pasted in the task report**, so no example is written from the plan rather than from the
   tool. That includes `cairn health --quiet` on an OK path proving byte-empty output, and one
   non-OK path proving the verdict still prints. Where a command needs credentials the executor
   does not have, the report says so and the example is marked as owner-verified at Task 24b rather
   than claimed.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 22a-ii: The editorial fixes and fixture truth

**The first task of segment 5.** It folds the `cairn-register-editor` findings Task 22a's own
editorial gate produced, and it corrects two fixture defects that read surfaced: a golden frame
showing a state `health.Run` cannot produce is a frame pinning fiction, and the owner is asked to
grade those frames. The findings live at `~/.cache/cairn-tool-b2/copy-editor-findings.md` and
their contract is `tool/docs/design/copy-standard.md`; read both in full first. **Geoff's
editorial rulings of 2026-09-21 moved the file's five "taste" items into Apply**, so all
twenty-one are applied here and the try-it note carries no copy questions. Invoke `go-conventions`
before writing any Go file. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above. The twenty-one strings below are
already edited and ruled by the owner; they are not new prose, and nothing beyond them is
rewritten at a call site.

**Files:**
- Modify: `tool/internal/render/status.go`, `status_test.go`
- Modify: `tool/cmd/cairn/messages.go`, `messages_test.go`, `ack.go`, `ack_test.go`,
  `probe_token.go`, `root.go`
- Modify: `tool/internal/render/golden_test.go` and `tool/internal/render/testdata/golden/`
  (the recut)
- Modify: `tool/internal/render/fixtures/fixtures.go`, `fixtures_test.go`
- Modify: `tool/README.md`, `tool/testdata/copy.golden.md`
- Modify: `tool/docs/reference/exit-codes.md`, `tool/docs/tripwire.md`
- Modify: `tool/cmd/cairn/version_test.go`

**Segment 5 rulings (conductor, 2026-09-21).**
1. The per-fixture Status lives in `tool/internal/render/golden_test.go` as a map keyed by
   fixture name, never in package `fixtures`: `golden_test.go` is package `render` and imports
   `fixtures`, so `fixtures` importing `render.StatusState` is an import cycle. The shared
   `goldenStatus` goes away. The assertion that a fixture's run state agrees with its creds row is
   proved in `golden_test.go`; add a neutral credential description to `fixtures.Named` only if
   that assertion needs it. A many-sites fixture carries one Status per run.
2. The recut covers about 146 files under `testdata/golden/{single,many,plain,logs}`. Regenerate
   with `make -C <abs worktree>/tool golden`. The report groups the diff by cause, states how many
   files moved per cause, and pastes one full before and after frame per cause, never per file.
3. The "acknowledgement" prose test greps the string literals of `tool/cmd/cairn/messages.go`
   only. The wire key `acknowledged`, the Go field, the `--ack` and `--ack-file` flag names, and
   the default filename `acknowledgements.json` are contract and stay.
4. The plan-correction criterion (formerly criterion 27) is removed: the conductor made Task 21
   criterion 20's and Task 22a criterion 1's corrections directly in this file rather than as a
   task deliverable, so this task no longer edits the plan and no longer lists it under Files.
   Task 21 criterion 20's amendment claims what the landed test proves: the account id survives
   the scrub chokepoint (`tool/cmd/cairn/usage_test.go`, the test writes through logx with
   scrubTargets), not that `sites list --verbose` is invoked.
5. This task runs before 21b, as the table has it.

**Acceptance, the twenty-one ruled copy fixes.** Each is provable by a test asserting the exact
string, and the committed `tool/testdata/copy.golden.md` is recut by `make -C tool copy-list` so
`check-copy` reads the new text.

1. **`joinWords` takes the serial comma.** At `tool/internal/render/status.go:151` the
   three-or-more branch joins `a, b and c`; it becomes `a, b, and c`. Microsoft governs
   (`copy-standard.md` section 2.1). A unit test covers zero, one, two, and three words, and the
   render goldens are recut by `make -C tool golden`.
2. **The two raw-error ack templates move `%v` to its own second line** (sections 2.7 and 1.5):
   `tmplAckFileMalformed` reads `cairn: %s is not a valid acknowledgement file.\n%v\n…` and
   `tmplAckFileUnreadable` reads `cairn: could not read %s.\n%v\n…`.
3. **`tmplAckFileMalformed`'s instruction line is imperative** (section 2.7 part 3): `Write the
   file as a JSON array of entries, each carrying checkId and expires`.
4. **`tmplAckFileUnreadable` drops the verb "Check"** (section 3.5): `Give the file read
   permission, or drop --ack-file to use the registry's default`. **`tmplAckFileNotFound` names
   `--ack-file` in its instruction line too**, never "the flag" (section 1.6); at HEAD
   (`messages.go:409`) its head names the flag and its tail says "drop the flag".
5. **`authProbeCFSkipped` and `authProbeGHSkipped` use the word `skip` and name the missing
   input** (sections 2.9 and 2.6): `Cloudflare: skip, CAIRN_CF_READ_TOKEN is not set`, and its
   GitHub sibling in the same shape. Task 21c reworks this command's rows and keeps this wording
   rule.
6. **`keyringUnavailableDisplay` is a list cell and ends there** (sections 2.4 and 1.5): `the OS
   keyring did not open`, with nothing after it.
7. **`tmplScrubSkipped` goes active** (section 2.2): `cairn: %d stored credential values are
   shorter than %d characters, so this output does not scrub them`.
8. **Prose says "hold", never "acknowledgement"** (section 2.9), while the flag and file names
   stay as they are. `--ack`'s help reads `hold one check until an expiry date:
   <check-id>=<YYYY-MM-DD>. Repeatable, and applies to that check on every site in a sweep.`
   `--ack-file`'s help reads `path to a JSON file of holds (default: acknowledgements.json in the
   registry directory)`. The four ack messages follow the same rule. A test greps the messages
   table for "acknowledgement" outside a flag or file name and fails on a hit.
9. **`tmplAckFileMissingExpiry`'s tail** reads `Add an expires date to the entry`.
10. **`%s's %q entry` becomes `the %q entry in %s`** wherever the two-string form appears, so a
    possessive on a path never has to be read.
11. **The collective `tokens` head and its fix line agree.** When more than one token is missing,
    the fix line reads ``Run `cairn auth set` naming each missing token, then run the command
    again.``
12. **`tool/README.md`'s update sentence** becomes `Check the releases page when you want a newer
    version.`
13. **The README's two-paths sentence** becomes `Both paths put a cairn binary on your PATH.`
14. **Every README link carries descriptive text**, never a bare file path: "the credentials
    reference", "the exit-code contract", "running cairn on a schedule". A test asserts no link
    label in the README is a `tool/docs/` path.
15. **The README's 2.0 sentence is replaced.** "Version 2.0 adds a terminal HUD and multi-site
    management; neither ships here" is wrong twice (Geoff, 2026-09-21: the HUD is a 1.x minor
    under `cairn hud`, and 1.0 already sweeps every site). One plain sentence replaces it: a
    terminal HUD is planned for a later 1.x release, and `cairn health` already checks every site
    it knows. Task 22a criterion 7's own "2.0 adds the HUD" clause is corrected in the same diff.

**The five items Geoff ruled from "taste" into "Apply" on 2026-09-21.**

16. **`tmplWidthInvalid`** reads `cairn: --width %d is not a width cairn can render.\nUse a whole
    number from %d to %d`, replacing the hedge at `messages.go:151`.
17. **One verb opens the instruction line of every bad-flag-value error: `Use`.** The messages
    table is swept for `Name a …` instruction lines on flag values and each is changed; a test
    asserts no bad-flag-value message's second line opens with "Name". The auth fix line's
    `naming the missing token` (criterion 11) is a different move and stays.
18. **`tmplAckFileMalformedDate`** reads `cairn: the %q entry in %s has an expires date cairn
    cannot read: %q.\nUse YYYY-MM-DD, for example 2026-10-01`. **The word "malformed" leaves
    operator copy**, and a test asserts it appears in no operator-facing string.
19. **The collective head `tokens` is approved as it stands**, with criterion 11's fix line. No
    change beyond that line, and the criterion exists so a later reader does not re-open it.
20. **`tmplAckFileMissingCheckID` names which entry**, by its index, since the parser knows it:
    `tool/cmd/cairn/ack.go:56` ranges over the entries and discards the index today. A test
    covers a file whose second entry carries no `checkId` and asserts the message names that
    entry.
21. **`tool/README.md`'s opener and its legacy-directory sentence are split.** The opener's setup
    colon over a triad becomes plain sentences, and the 51-word legacy-directory sentence becomes
    more than one. Both are graded by the register gate, not by a length assertion.

**Acceptance, fixture truth.**
22. **Every golden renders its fixture against that fixture's own run state, never one shared
    `goldenStatus`.** At HEAD `golden_test.go:123` cuts every frame against a single `StatusState`
    saying `CAIRN_CF_READ_TOKEN` is not set and the GitHub token was read from the keyring, while
    `fixtures.Healthy()` and `fixtures.WarningOnly()` pass `creds` with "Cloudflare and GitHub
    tokens read from the keyring" (`fixtures.go:229` and `:250`) and `fixtures.Degraded()` fails
    `creds` with "the token was rejected" (`fixtures.go:180`). Each of those three frames shows a
    state `health.Run` cannot produce. After this task each fixture carries its own run state
    beside its reports, and the harness reads it.
23. **The fixtures test extends to a failing creds row and to Status agreement.**
    `fixtures_test.go`'s `TestEveryFixtureCredsRowAgreesWithItsOwnCredentialStory` covers a
    passing and a cred-missing creds row today; it gains a case asserting that a **failing** creds
    row is consistent with the rest of its report, and a second assertion that each fixture's own
    run state agrees with its creds row: a state naming a variable as unset requires a creds row
    that skipped or failed on that variable, and a state naming both tokens as read from the
    keyring requires a creds row that did not skip for a missing credential.
24. **The golden corpus is recut** with `make -C tool golden`, and the task report names how many
    files the recut rewrote and why each moved (criterion 1's comma, criterion 22's per-fixture
    state, or both). `TestGolden` passes against the committed files.

**Acceptance, the budget documentation.**
25. **`tool/docs/reference/exit-codes.md` and `tool/docs/tripwire.md` both state that a site's
    share can fall below the single-site budget in a large sweep, what a cut-short site prints,
    and the remedy.** `exit-codes.md` already carries the formula and the cap (`per-site budget =
    min(480 seconds, remaining budget / sites still to run)`); what neither page says is that past
    four sites the cap divides, so a twelve-site registry gives each site 160 seconds rather than
    480. Both pages state: a site the budget cuts short reports its unfinished checks `Unknown`
    with reason `reason.not-run` (`internal/health/health.go:151`), the site's own verdict is
    `UNKNOWN`, and the run exits 3; and the remedy is an explicit `--timeout` raising the
    whole-run budget, or fewer sites per run. A test asserts both pages name `reason.not-run` and
    the cap, so the prose cannot drift from the arithmetic.

**Acceptance, the version template.**
26. **A test pins that `cairn --version` prints the version template alone.**
    `cmd/cairn/version_test.go` asserts the four parts by substring today; it gains an assertion
    that stdout equals `tmplVersion` rendered plus one newline and nothing else, so a banner, a
    usage block, or a trailing hint cannot appear beside it.

- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C <absolute worktree path>/tool check'`.
  Commit.

### Task 21b: The fifth wire word, hold expiry, the quiet sweep, and `--theme`

**It changes a frozen surface**, which is why it runs before the tag and not after it, and why it
is upshifted. Four deliverables, each from one of Geoff's rulings of 2026-09-21
(`~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md`, items 5, 7, 9, and 8). Nothing else joins
this task; `cairn auth check` is Task 21c's, deliberately. Invoke `go-conventions` before writing
any Go file and `golang-spf13-cobra` before touching `root.go`. **Suggested model: `opus`.**

**Notes (verbatim in the dispatch):** the standing B2 note above.

**A factual pre-flight runs first**, as every segment's does: check each claim these criteria make
about existing code at HEAD and report the false ones before writing anything.

**Files:**
- Modify: `tool/internal/spine/exit.go`, `exit_test.go`, `catalogue.go`, `catalogue_test.go`
- Modify: `tool/internal/render/json.go`, `json_test.go`, `json_schema_test.go`, `body_test.go`
- Modify: `tool/docs/reference/cairn-health.schema.json` and its four sibling schemas under
  `tool/docs/reference/`
- Modify: `tool/docs/reference/json-output.md`, `tool/docs/reference/exit-codes.md`
- Modify: `tool/cmd/cairn/help_agents.go`, `help_agents_test.go`, `messages.go`
- Modify: `tool/cmd/cairn/root.go`, `root_test.go`, `health.go`, `health_sweep.go`,
  `health_sweep_test.go`, `coverage_test.go`
- Modify: `tool/internal/render/render.go` (the `--theme` input path)
- Modify: `tool/internal/render/layout.go` (the four section labels, ruling 6)
- Modify: `tool/internal/render/testdata/golden/` and `golden_test.go` (the recut)
- Modify: `tool/docs/design/copy-standard.md` (its dated head note)

**Segment 5 rulings (conductor, 2026-09-21).**
6. `unknown` is a word-only change in the render: no new glyph and no new section. `skip` and
   `unknown` both land in `could not run` with the existing mark; `tool/internal/render/layout.go`
   fixes the four section labels and they stay four.
7. `RenderInput.FailingOnly` and its two body branches stay; remove only the `rf.quiet` wiring
   that set it.
8. For `--quiet`, a WARNING site is not OK and prints; the gate stays `verdict ==
   spine.VerdictOK`. `--json` wins over `--quiet` in both paths and this task changes neither.
   State both so no implementer "fixes" them.
9. `--theme` is a root persistent flag, pure, default `dark`, values `dark` and `light` only,
   independent of `--color` and `NO_COLOR` (those select the colour profile), applied in every
   body including the non-TTY plain one, with no environment override. `--theme auto` is deferred
   to 1.1.
10. The criterion about the scheduler page's alert threshold is verification-only: it is
    satisfied by a quoted excerpt of `tool/docs/tripwire.md`'s alerting section in the report, not
    by a new test.
11. `schemaVersion` stays 1 across the schemas: no consumer exists before the tag, so the pre-tag
    window is one schema. The conductor confirms the author's call.

**Acceptance, the fifth wire word.**
1. **`spine.StateWord` returns a fifth word.** At HEAD (`internal/spine/exit.go:205`) it returns
   `pass`, `fail`, `held`, and `skip`, with `skip` covering every non-OK, non-Failing state
   whatever its reason. After this task, an `Unknown` whose reason is `spine.ReasonCredMissing`
   returns `skip` and every other `Unknown` returns `unknown`. The doc comment states the
   division in the owner's own terms: `skip` is not attempted, by configuration; `unknown` is
   attempted with nothing observed.
2. **`spine.Catalogue` names five state words, not four.** `catalogue.go:12` returns eight fixed
   words today; it returns nine, and `catalogue_test.go` asserts the count and the members. The
   copy gate's own vocabulary assertions follow: `internal/render/json_test.go`'s
   `TestStateMarshalsAsOneOfFourWords` and `internal/render/body_test.go`'s `TestNeverColourAlone`
   (`body_test.go:1104`) both carry the four-word list as a literal and gain the fifth, each
   renamed where its name states a count.
3. **The five published JSON schemas carry the word and every `schemaVersion` stays at 1.** Only
   `tool/docs/reference/cairn-health.schema.json` declares the `state` enum (line 40); it gains
   `"unknown"`. **No `schemaVersion` increments**, and the rule is stated in
   `tool/docs/reference/json-output.md` with its reason: a schema version counts a change a
   consumer has to re-read, no consumer exists before `tool/v1.0.0` is pushed, so the whole
   pre-tag window is one schema and the first published version is 1. A test asserts every payload
   constant from `internal/render/json.go:22` onward is 1 and that each schema file's own `const`
   matches it.
4. **The boundary matches Task 21's ruling R8, unchanged.** A cred-missing skip never triggers a
   site `UNKNOWN`; every `unknown` does. `spine.ExitCode`'s per-check exclusion is already keyed
   on `Reason == cred-missing` (Task 21's segment-4 ruling 2), so the word changes and the
   arithmetic does not. A table test covers the four rows Task 21's criterion 2 named and asserts
   each row's **word** alongside its verdict, so the two cannot drift apart.
5. **`cairn help agents`, `tool/docs/`, and the goldens all say five.** The agents page's state
   list names all five words and states the `skip`-versus-`unknown` division in one sentence, and
   `help_agents_test.go`'s substring table gains a row for it. `json-output.md` and
   `exit-codes.md` name five. `copy-standard.md`'s dated head note records that the 2026-09-20
   four-word ruling was reversed on 2026-09-21. The render goldens are recut with `make -C tool
   golden`, and the report names which frames moved.

**Acceptance, hold expiry.**
6. **A held failing check contributes `WARNING`, and an expired hold returns the check to its own
   severity from Task 21's per-check table.** Verified at HEAD: `spine.ExitCode` already warns on
   `c.Acknowledged || c.Severity == WarningFailure` (`exit.go:117`) and an expired hold already
   arrives with `Acknowledged` false (`exit.go:89`), so the behaviour is shipped and this
   criterion pins it rather than changing it. **The exit-code table test is extended** to cover,
   per check id, a held failure and the same failure under a lapsed hold, asserting the lapsed one
   lands on `failSeverity[id]` (`internal/health/severity.go:16`) rather than on a flat
   `CRITICAL`: the `engine` row therefore lapses to `WARNING`, and every other row to `CRITICAL`.
7. **Task 24a's scheduler docs already present the alert threshold as the operator's choice**, so
   no docs fix is folded here. Checked 2026-09-21 at HEAD: `tool/docs/tripwire.md`'s "Alerting:
   choose the threshold, alert once, never a credential" section states both settings, exit 2 and
   above to page and any non-zero to notify, and says a held failing check exits 1 by design. This
   criterion verifies that text still reads that way after criterion 6's work and says so in the
   report; if it has regressed to "any non-zero" alone, it is fixed here.

**Acceptance, the quiet sweep.**
8. **`--quiet` on a many-sites sweep prints nothing when every site is OK and the normal strip
   otherwise.** The first half is shipped (`cmd/cairn/health_sweep.go:145`). The second half is
   not: the non-OK branch passes `rf.quiet` as `FailingOnly` (`health_sweep.go:148`), which
   filters rows after the tally, so a non-OK quiet sweep prints a reduced strip rather than the
   normal one. After this task a non-OK sweep under `--quiet` prints the same body a non-quiet run
   prints. **No new render body is added.** A test covers an all-OK sweep, byte-empty, and a sweep
   with one failing site, byte-identical to the same sweep without `--quiet`.
9. **Single-site `--quiet` follows the same rule.** The report states what it does today
   (`cmd/cairn/health.go:152` returns before writing on OK, and `:155` passes `rf.quiet` as
   `FailingOnly` otherwise) and, where it differs, makes it match: nothing on OK, the normal body
   on anything else. A test covers both.
10. **Exit codes are unchanged by `--quiet` in either shape.** A test asserts the code from a
    quiet run equals the code from the same run without the flag, for an OK, a WARNING, a
    CRITICAL, and an UNKNOWN sweep.

**Acceptance, `--theme`.**
11. **`--theme dark|light` is a root persistent flag selecting `RenderInput.Dark`.** `Dark` is
    hardcoded true at its call site today (`cmd/cairn/health.go:195`); the flag replaces the
    literal and defaults to `dark`. It is a pure flag: nothing queries the terminal. **Any other
    value is a usage error**, exit 3 with byte-empty stdout, through Task 21's own usage-error
    contract, and the message names the two accepted values and opens its instruction line with
    `Use` (Task 22a-ii criterion 17). A test covers `--theme light` reaching the light branch,
    `--theme dark` the dark one, and `--theme auto` and `--theme purple` each exiting 3.
12. **`--theme` is documented, and the man page and completions carry it.** The root flag joins
    `coverage_test.go`'s `assertOwnFlags` list, so the grammar assertion covers it; `make -C tool
    man` regenerates the page; the shell completion for the flag offers `dark` and `light` through
    `RegisterFlagCompletionFunc`; and `tool/README.md` plus `tool/docs/reference/exit-codes.md`
    name it. **`--theme auto` with OSC 11 detection is not in 1.0** and is named as a later minor,
    per Geoff's ruling.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C <absolute worktree path>/tool check'`.
  Commit.

### Task 21c: `cairn auth check`, and the release candidate rebuilt

**The last task before the owner gate.** It promotes the hidden `cairn auth probe` to a visible
`cairn auth check` over the tool's own three credentials, and then rebuilds the release candidate
so what Geoff runs is what segment 5 shipped. Its own task by Geoff's ruling, never folded into
21b, which already carries four deliverables. Invoke `go-conventions` before writing any Go file
and `golang-spf13-cobra` before touching the cobra tree. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above. Item 5 of
`~/.cache/cairn-tool-b2/copy-editor-findings.md` is the wording rule for this command's skip rows,
and Task 22a-ii's criterion 5 landed it first; keep it.

**An open item for the decision pre-flight:** whether `probe` survives as a hidden alias of
`check`. The executor does not decide it; the pre-flight puts it to the conductor, and the task
implements whichever answer comes back. **The operator's write-scoped token check is not this
task**; it heads 1.1
(`docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md` on `main`).

**Files:**
- Modify: `tool/cmd/cairn/probe_token.go`, `probe_token_test.go`, `probe_cloudflare.go`,
  `probe_github.go`, `auth.go`, `coverage_test.go`, `messages.go`, `messages_test.go`
- Create: `tool/cmd/cairn/permissions.go`, `permissions_test.go` (the single permission source and
  its drift test against `docs/credentials.md`)
- Modify: `tool/cmd/cairn/help_agents.go`, `help_agents_test.go`
- Create: `tool/docs/reference/cairn-auth-check.schema.json`
- Modify: `tool/internal/render/json.go`, `json_schema_test.go` (the `auth check` payload, its
  `kind`, and `AuthCheckSchemaVersion`)
- Modify: `tool/docs/credentials.md`
- Modify: `tool/README.md`, `tool/docs/release-candidate-notes.md`, `tool/CHANGELOG.md`
- Modify: `tool/testdata/copy.golden.md` (recut)

**Segment 5 rulings (conductor, 2026-09-21).**
12. `probe` survives as a `Hidden: true` alias of `auth check`.
13. The `auth check` payload, its `kind`, and `AuthCheckSchemaVersion = 1` live in
    `tool/internal/render/json.go` with the other payloads, and its case joins
    `json_schema_test.go`.
14. The single permission source is a table in `tool/cmd/cairn/permissions.go`. A drift test in
    `cmd/cairn` reads `../../docs/credentials.md` and fails when the page's permission labels and
    the table disagree. The labels are the seven Cloudflare ones the page lists plus GitHub's
    Contents and Metadata.
15. Zone-scoped and repo-scoped permissions (Cloudflare Zone Settings, DNS, Email Sending;
    GitHub Contents) have no credential-only probe. `cairn auth check` takes an OPTIONAL
    positional site id. Without it those rows are `skip`, excluded from the exit code, each with a
    reason that names `cairn auth check <site>` as the way to confirm it. With it, the command
    loads that site's record from the registry and probes those permissions against the site's own
    zone and repository, read-only. An unknown site id is a usage error, exit 3. This serves the
    owner's stated purpose for the command (getting token permissions right was the hard part) and
    adds no write and no new credential. New strings go through the messages table and are
    reported.
16. Nothing built is committed: `tool/.gitignore` already ignores `/man/` and `/cairn`. The commit
    carries source, docs, `copy.golden.md`, and the schema. The release candidate binary installs
    to `~/.local/bin/cairn`.
17. The try-it note becomes a VERIFICATION CHECKLIST FOR THE CONDUCTOR, not for the owner (Geoff,
    2026-09-21: release candidate verification is the conductor's work). It lists what to run in
    the real terminal against his four sites and what each should show. It carries no copy
    questions.

**Acceptance, the command.**
1. **`cairn auth check` exists, is not hidden, and covers the tool's own three credentials**:
   `CAIRN_CF_READ_TOKEN`, `CAIRN_CF_ACCOUNT_ID`, and `CAIRN_GH_READ_TOKEN`. The tree assertion in
   `coverage_test.go` names it, and a test asserts it is not hidden.
2. **One row per required permission.** A row names the permission, the credential it belongs to,
   and whether the run confirmed it. A missing permission is named **by the label the provider's
   own token page uses**: the seven Cloudflare dashboard-named groups (Workers Scripts, Workers
   Builds Configuration, Workers Observability, Zone, Zone Settings, DNS, Email Sending) and
   GitHub's Contents and Metadata. A test asserts every row's label matches the source list
   exactly. **Per ruling 15, the zone-scoped and repo-scoped rows (Zone Settings, DNS, Email
   Sending, and GitHub Contents) are `skip` when the command runs with no positional site id**,
   each naming `cairn auth check <site>` as the way to confirm it; with a site id, the command
   loads that site's record from the registry and probes those permissions against its own zone
   and repository, read-only, and an unknown site id is a usage error, exit 3.
3. **The permission list has one source, and both the rows and the doc read it.** Today it exists
   only as prose in `tool/docs/credentials.md`'s "Token scopes" section (its Cloudflare list at
   lines 122 to 130 and its GitHub paragraph below). After this task the list is a table in Go
   that `auth check` renders its rows from, and a test asserts `credentials.md` names exactly the
   same labels, so the doc and the command cannot drift. A permission added to the table without a
   doc line fails the gate.
4. **A skipped credential says `skip` and names the missing variable**, per copy-editor item 5:
   `Cloudflare: skip, CAIRN_CF_READ_TOKEN is not set`, and its GitHub sibling in the same shape.
5. **`--json` with its own schema and `schemaVersion`, under Task 20c's contract.**
   `tool/docs/reference/cairn-auth-check.schema.json` is published beside the five existing
   schemas, carries `schemaVersion`, `kind`, `verdict`, and `exitCode` at its top level like every
   sibling, and declares the per-permission row shape. Its `schemaVersion` is 1, for the reason
   Task 21b criterion 3 gives. The schema test that reads the committed schema files covers it.
6. **`cairn help agents` gains a section for it**, naming the command, its `--json` payload, and
   the schema's location, with a row in `help_agents_test.go`'s substring table.
7. **The exit code is the worst row's**, through the existing arithmetic rather than a second
   table: an all-confirmed run exits 0, a skipped credential exits by Task 21b's `skip` rule, and
   a rejected token or a missing permission exits by its row's own state. **Per ruling 15, a
   zone-scoped or repo-scoped row's `skip` (no positional site id given) is excluded from the exit
   code the same way a cred-missing skip is.** A table test covers an all-confirmed run, a skipped
   run, and a run with one missing permission.

**Acceptance, the release candidate rebuilt.**
8. **The man pages and completions are regenerated** with `make -C tool man` and the completion
   targets, so `auth check` and Task 21b's `--theme` both appear. The test asserting the generated
   page names every non-hidden command (Task 22a criterion 3) covers the new command by
   construction, and the report says so.
9. **The local release candidate is rebuilt exactly as Task 22a's criteria define it**: `make -C
   tool install` from this task's commit, a binary at `~/.local/bin/cairn` at mode 0755, and
   `cairn --version` on the installed binary printing the version plus the commit, with the
   `-dirty` suffix absent from a clean tree (Task 22a criteria 4 and 5). `tool/CHANGELOG.md`'s
   `1.0.0` entry gains the two segment-5 surfaces, the fifth wire word and `auth check`, and drops
   nothing.
10. **Task 22a's try-it note is rewritten as a verification checklist for the conductor, not for
    the owner** (ruling 17: Geoff, 2026-09-21, release candidate verification is the conductor's
    work). `tool/docs/release-candidate-notes.md` stays one page, and it lists exactly these, in
    this order, as what the conductor runs in the real terminal against his four sites and what
    each should show:
    - the real-terminal run against his own sites, the single-site body and the sweep's strip at
      his own terminal width, which settles the standing "real-terminal evidence" item by his own
      eyes rather than by a captured frame;
    - `cairn auth check`, the new command, against his own credentials;
    - `--theme light` on a light terminal, the one surface no golden can grade for him;
    - a held check and the exit code it produces, so the hold rule is read rather than described;
    - `--quiet` on the sweep, silent on green and the normal strip otherwise;
    - **the launchd and Windows Task Scheduler wrappers as reasoned, not executed**: Task 24a's
      criterion 9 marked every example the executor could not run as owner-verified, and the note
      names those two and what a "no" would mean for each.
    **The note carries no copy questions.** Geoff's editorial rulings of 2026-09-21 answered the
    five items that would have gone to him, and Task 22a-ii applies all of them (its criteria 16
    to 21), so the 1.0 editorial gate has had the owner's read and nothing on copy is owed him
    here. The report pastes the rewritten note.
11. **The same hard stops as Task 22a.** No tag is pushed, no release is created, no branch is
    merged, and `docs/STATUS.md` is not edited: the conductor writes STATUS at the segment
    boundary and Task 25 carries the version line. `package.json` is untouched. **This task is the
    last one an unattended run may execute**, and the pass report says so in the words the
    conductor reads at the checkpoint.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C <absolute worktree path>/tool check'`.
  Commit.

### Task 22b: The `tool/v1.0.0` tag. **OWNER-GATED.**

**Geoff gave the go on 2026-09-21 at about 11:50 AKDT for Tasks 22b, 23, 24b, and 25, and ruled
that release candidate verification is the conductor's work. The conductor's own conditions before
the tag: segment 5 accepted with the gate green by absolute worktree path; the `tool` workflow
green on the pushed branch head across its platform legs; the real-terminal run against his four
sites graded by a fresh-context verifier with no structural finding. Any failure, or a finding that
is taste and not defect, stops the tag and goes to Geoff.**

**This task does not run until Geoff has built Task 22a's release candidate, run it in his own
terminal against his own sites, and said go.** An unattended run stops before it. The tag is
published and permanent, which is why it opens a segment and why it is the gate. Suggested model:
`sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:** none but `tool/README.md`, for criterion 5's retraction sentence. This task tags a
commit.

**Acceptance:**
1. **The executor verifies the owner's recorded go before doing anything else**: the pass report
   carries the date, what he ran, and his word. **Without it, the task halts and reports that it
   halted.** It does not ask, it does not assume, and it does not proceed on a conductor's
   instruction alone. `pass-execute.js` has no owner-gate concept, so this criterion is where the
   gate actually executes. **The recorded go carries the named carry-forward "real-terminal
   evidence, owner's morning"** (conductor, 2026-09-21): Task 20b-i and 20b-ii shipped only offscreen
   ANSI-to-HTML-to-headless-Chromium evidence, so the owner's own look at the single-site body and
   the strip in his real terminal, per Task 22a criterion 9's note, is part of what "his word"
   covers here, not a separate step.
2. The tag is `tool/v1.0.0` on Task 22a's commit, pushed after CI is green on all three legs. The
   tag prefix is the spec's.
3. **The tag push makes B2's merge mode a hard constraint.** A published tag is what `go install
   github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` resolves, so the commit it names must stay
   reachable from `main` forever. A squash or a rebase at Task 25 would rewrite that commit and
   leave the tag pointing at an object no branch contains, which breaks `go install` for every
   operator and cannot be fixed without moving a published tag. **Task 25 merges as a true merge
   commit, never a squash and never a rebase**, and carries the assertion that proves it.
4. The version number is verified free before it is promised: `git ls-remote --tags origin
   'tool/v*'` shows no `tool/v1.0.0`, recorded in the report. Published tags are immutable.
5. **The retraction path is stated before it is needed.** A published tag cannot be moved or
   deleted once anyone has fetched it, so the only correction for a broken `tool/v1.0.0` is a
   `retract tool/v1.0.0` directive in the next version's `go.mod` plus a `tool/v1.0.1` tag. The
   task writes that sentence into `tool/README.md`'s release section and the report names it, so a
   later session does not go looking for a delete.
6. If Task 23, 24b, or 25 changes code under `tool/`, the close records that the binary was
   reinstalled, and a `tool/v1.0.1` tag is cut only if the change is behavioral.
- Gate: the tag's own CI run green on all three legs.

### Task 23: Release artifacts, attestation, the man page, and `go install` from a clean machine. **OWNER-GATED.**

**Geoff gave the go on 2026-09-21 at about 11:50 AKDT for Tasks 22b, 23, 24b, and 25, and ruled
that release candidate verification is the conductor's work. The conductor's own conditions before
the tag: segment 5 accepted with the gate green by absolute worktree path; the `tool` workflow
green on the pushed branch head across its platform legs; the real-terminal run against his four
sites graded by a fresh-context verifier with no structural finding. Any failure, or a finding that
is taste and not defect, stops the tag and goes to Geoff.**

Task 22b's tag is the trigger, so this task inherits the owner gate. It is split out of the cut
because a release nobody can install is not a release. Suggested model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Modify: `.github/workflows/tool.yml` (the release job Task 1 wired, corrected against its first
  real run, plus the attestation step and the man page)
- Create: `tool/internal/providers/corpus_importer_test.go`
- Modify: `tool/go.mod` (the `go` directive's minimum)
- Modify: `tool/README.md` (the release table, the checksum line, the attestation line)
- Modify: `tool/CHANGELOG.md` (the artifact list under `1.0.0`)

**Acceptance:**
1. **The executor verifies the owner's recorded go before doing anything else**, exactly as Task
   22b's criterion 1 states, and halts without it.
2. The release job fires on the `tool/v1.0.0` tag and attaches six archives, linux, darwin, and
   windows on amd64 and arm64, each built with `-trimpath` and the same `-ldflags -X` stamping the
   `build` target uses, plus a `SHA256SUMS` file covering all six. The task report pastes the
   release's file list and the checksum file.
3. **Each archive carries the generated man page beside the binary** (Geoff, 2026-09-20), so a
   packager and an operator both get it without the repository. A test in the workflow asserts each
   archive's file list.
4. Each binary is named `cairn_<version>_<goos>_<goarch>`, with `.exe` on windows. The release job
   runs the artifact native to its own runner and asserts `--version` prints `1.0.0` and the
   commit, so each of the three operating systems has one binary that was actually executed rather
   than only linked.
5. **Build-provenance attestation covers the release artifacts,** through GitHub's own attestation
   action, and `tool/README.md` carries the one command that verifies it. **The release job's
   `permissions` block gains `id-token: write` and `attestations: write` beside the `contents:
   write` it already carries.** Verified 2026-09-20 at HEAD: `.github/workflows/tool.yml`'s
   `release` job declares `contents: write` alone (`:109-110`). Attestation mints a Sigstore
   identity token and writes to the repository's attestations store, so both are required and the
   step fails with a permissions error without them. Falsify once: remove one of the two, confirm
   the step fails naming the permission, restore it. The reason is stated in the README: a
   `SHA256SUMS` file published in the same release as the binaries it covers proves integrity, not
   authenticity, because whoever could replace a binary could replace the checksum beside it.
   Attestation binds the artifact to the workflow and the commit that built it. The verification
   command run against a real artifact is pasted in the task report.
6. **The `go` directive is the true minimum the code and its dependencies need, stated as
   major.minor with no patch.** Verified 2026-09-20 at HEAD: `tool/go.mod` says `go 1.27.1`, which
   is the toolchain that happened to be installed, and a tag freezes it, so every operator below
   that version must download a toolchain and `GOTOOLCHAIN=local` hard-fails outright, for a tool
   whose whole premise is "any operator". The measured floors on 2026-09-20 are `golang.org/x/sys`
   and `golang.org/x/term` at `go 1.26.0`, `charm.land/lipgloss/v2` and `colorprofile` at
   `go 1.25.0`, `x/ansi` at `go 1.24.2`, and cobra, go-keyring, wincred, dbus, mousetrap, and pflag
   all at `go 1.20` or below, so the true minimum today is **`go 1.26`**. The task re-measures
   rather than copying that number, since a dependency may have moved, sets the directive to the
   measured maximum of the dependency floors and of what the source itself needs, and states the
   number it chose and why in the report.
7. **`go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` succeeds in a container with no
   repository checkout and no module cache**, and the installed binary prints `1.0.0`. **A second
   container, pinned at exactly the `go` directive's minimum and running with
   `GOTOOLCHAIN=local`, runs the same install and the same assertion**, which is what proves the
   directive is honest rather than merely lower. The fixture-corpus resolver cannot break either
   run: it is test-only, reached from `_test.go` files through `providers.RepoRoot`, so no non-test
   package imports it and `go install` builds none of it. A test asserts the resolver's file carries
   no non-test importer. **The copy lister from Task 19c-i and the man generator from Task 22a are
   checked the same way**, since they are the module's second and third commands.
8. The version a `go install` build stamps is the module version, not a `git describe` output,
   because `go install` runs no Makefile. The version package reads its value from
   `runtime/debug.ReadBuildInfo` when the ldflags default is still `dev`, and a test covers both
   paths. `vcs.revision` is absent from a `go install module@version` build, so `version.Commit`
   reads `none` there by design (Pass A finding, 2026-09-20), and the README says so rather than
   leaving an operator to read it as a fault.
9. The checksum line in `tool/README.md` shows how to verify a downloaded binary on each platform,
   with `sha256sum -c` on Linux, `shasum -a 256 -c` on macOS, and `Get-FileHash` on Windows.
10. **Every operator-facing sentence this task adds to `tool/README.md` and `tool/CHANGELOG.md`
    follows `copy-standard.md`'s section 2**, the same standard the messages table is written to,
    even though neither file is in the copy golden. A doc sentence is not a program string, so it
    is not listed by `copy-list`; it is still read by an operator, so it is not exempt from the
    register. Any sentence the task is unsure of goes in the report under "New operator-facing
    strings" like any other.
11. Falsify the release gate once: push a throwaway tag `tool/v0.0.0-test` on a branch, confirm the
    job builds six archives and attests them, then delete the tag and its release. The report
    records that run.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`, the tag's own CI run green on
  all three legs, and the release visible with its files. **The diff reaches `.github/workflows/`,
  which is outside `tool/`; the light lane still applies, because nothing in this task's gate runs
  the root `npm test`.** Commit.

### Task 24b: The owner's own timer, installed and fired. **OWNER-GATED.**

**Geoff gave the go on 2026-09-21 at about 11:50 AKDT for Tasks 22b, 23, 24b, and 25, and ruled
that release candidate verification is the conductor's work. The conductor's own conditions before
the tag: segment 5 accepted with the gate green by absolute worktree path; the `tool` workflow
green on the pushed branch head across its platform legs; the real-terminal run against his four
sites graded by a fresh-context verifier with no structural finding. Any failure, or a finding that
is taste and not defect, stops the tag and goes to Geoff.**

**The systemd user unit lands in `~/.dotfiles` first (stow, its manifest) and is installed from
there, never written straight into `~/.config/systemd/user`.**

**The half of Task 24 that only the owner's machine can satisfy.** Its criteria adopt four
production sites into a real registry, source real credentials, install stow units, empty a live
credential, and observe a timer fire unattended. An unattended executor can do none of those and
would stall or fabricate, which is why the 2026-09-20 night review cut them out of Task 24a.

Invoke `vps-conventions` for the systemd unit, which is Geoff's own installation. The product's own
scheduler examples are prose in `tool/docs/tripwire.md` and are not governed by it. Suggested
model: `sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Create: `~/.dotfiles/systemd/.config/systemd/user/cairn-tripwire.service`,
  `cairn-tripwire.timer`, and `~/.dotfiles/bin/.local/bin/cairn-tripwire` (the wrapper), all
  installed by `stow`, which is the verification installation and not a product artifact
- Modify: `tool/docs/tripwire.md` only if the installation falsifies a line in it

**Acceptance:**
1. **The executor verifies the owner's recorded go before doing anything else**, exactly as Task
   22b's criterion 1 states, and halts without it.
2. **The preparation, in one non-interactive shell:** `source ~/.local/secrets`, never an inline
   `export`, so no value reaches argv or shell history; `cairn adopt list`; adopt the four
   production sites; and confirm `cairn sites list --json` lists four ids. The report pastes the
   four ids and nothing else from that output.
3. His units are one installation of Task 24a's systemd example, authored under `~/.dotfiles` and
   installed by `stow` per the workstation rule, with `vps-conventions` governing the unit's shape,
   file placement, and lock and state paths, and nothing written into `/etc`. The wrapper sources
   `~/.local/secrets` itself and asserts the three values are non-empty. The `EnvironmentFile`, if
   the installation uses one, is mode 0600.
4. **The dotfiles repository is a second repository with its own gate.** The units and the wrapper
   are committed there, not here, `~/.dotfiles/scripts/check.sh` runs green over that commit, and
   `stow -R systemd` and `stow -R bin` install them. The report records the dotfiles commit SHA and
   the `check.sh` result. Nothing in this repository's own gate covers that repository, which is
   why it is a criterion rather than an assumption.
5. Two of the four sites carry `p=none` DMARC records today, so the run carries a dated
   acknowledgement for each, naming the check id, the site, and the expiry.
6. Falsify the guard on that installation: empty one credential in the service environment for one
   manual run, confirm the alert fires, restore it.
7. **The first unattended firing is proved with a temporary drop-in, not by waiting a day.**
   `OnCalendar=daily` cannot be observed inside one session, so the acceptance mechanism is
   explicit: install the daily timer, add a temporary `OnActiveSec=2min` drop-in under
   `~/.config/systemd/user/cairn-tripwire.timer.d/`, `systemctl --user daemon-reload`, let it fire
   once unattended, capture the journal with `journalctl --user -u cairn-tripwire`, then remove the
   drop-in and reload again. The report pastes `systemctl --user list-timers` showing the daily
   timer armed after the drop-in is gone, and the captured run's real output with `--verbose` off.
   That captured firing is the acceptance evidence for the documented unit.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` in this repository, plus
  `~/.dotfiles/scripts/check.sh` green in the dotfiles repository. Commit the tripwire doc change,
  if any, here, and the units in their own repository.

### Task 25: Pass B2 close. **OWNER-GATED.**

**Geoff gave the go on 2026-09-21 at about 11:50 AKDT for Tasks 22b, 23, 24b, and 25, and ruled
that release candidate verification is the conductor's work. The conductor's own conditions before
the tag: segment 5 accepted with the gate green by absolute worktree path; the `tool` workflow
green on the pushed branch head across its platform legs; the real-terminal run against his four
sites graded by a fresh-context verifier with no structural finding. Any failure, or a finding that
is taste and not defect, stops the tag and goes to Geoff.**

Owner-gated because it merges the branch Task 22b's published tag lives on. Suggested model:
`sonnet`.

**Notes (verbatim in the dispatch):** the standing B2 note above.

**Files:**
- Modify: `docs/STATUS.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `docs/internal/what-cairn-is-and-is-not.md`,
  `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`,
  `docs/internal/engine-rulings.md` (only if a ruling reaches beyond the tool),
  `tool/docs/design/README.md`, and this plan file's own post-mortem
- Modify: `docs/internal/record/2026-09-21-site-upgrade-brief.md` (criterion 16),
  `docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md` (criterion 22), and
  `tool/README.md` (criterion 24)
- Create: `docs/internal/facts/admin.md` (criterion 25, gated by `check:facts`)
- Modify, outside this repo: the user-scoped `site-pass` skill, for criterion 22's "Tool friction"
  section. It is named here because a rule reaches an executor only through its own dispatch.
- Modify: whatever `code-simplifier` changes under `tool/`

**Acceptance:**
1. **The executor verifies the owner's recorded go before doing anything else**, exactly as Task
   22b's criterion 1 states, and halts without it.
2. The pass's verification run, against the four production sites Task 24b adopted:
   `source ~/.local/secrets`, run `cairn health --json` once and `cairn health <site>` for each,
   and paste the non-verbose output into the pass report. It should show the two `p=none` sites
   acknowledged and WARNING on Email, and everything else honest. This is one operator's data
   proving the product, and the report says so.
3. Run `code-simplifier` over `tool/`.
4. Dispatch `go-architecture-reader` once per touched Go package: `render`, `logx`, `spine`,
   `store`, `secrets`, `health`, `logs`, and `cmd/cairn`. **Eight dispatches, never batched.** The
   amendment added `secrets` (the `Deleter`) and `health` (the messages and severity tables) to the
   2026-09-14 list of five, and the night review added `logs`, because Task 20c edits
   `internal/logs/logs.go` for its struct tags. B2 touches no file in `record` or `providers`
   except `providers/corpus_importer_test.go`, which is a test-only assertion Task 11's close
   already read the package for, so those two get no dispatch. The seams table pre-adjudicates
   every callerless export.
5. Edit `docs/internal/what-cairn-is-and-is-not.md`: one paragraph naming the tool as the operator
   cockpit, which is spec decision 6. Acceptance: the paragraph names the tool, names its one job,
   and states that the tool holds no logic a view cannot call through the spine.
6. Run the reviewer fan-out: `web-auth-security-reviewer` over the credential handling and the
   scrub chokepoint, and `cloudflare-workers-reviewer` over the `providers` Cloudflare surface and
   the observability query. `svelte-reviewer` and `daisyui-a11y-reviewer` are not relevant here.
7. Run the `cairn-pass` end ritual: the `docs/STATUS.md` entry, the `CHANGELOG.md` line under `##
   Unreleased`, the ROADMAP entry for the Go tool marked at its 1.0 boundary with 2.0's scope
   named, and the sub-project 2 handoff line.
8. **The 2.0 hand-forward is stated in the ROADMAP entry and in `tool/docs/design/README.md`**, so
   a HUD plan reads it rather than re-deriving it. The HUD imports the render package's theme
   (`NewTheme(dark, profile)`), its glyph set, its named width rungs, and its sectioned `Frame`
   **unchanged**; it does not fork or re-implement any of the four. The HUD's own additions are the
   cursor, the selection channel, the `viewport`, and the generation-counted refresh, none of which
   enters `render`. The named 2.0 items the amendment added: `charm.land/fang/v2` as a spike, a
   site-scoped acknowledgement, the concurrent sweep with its `errgroup` and connectivity probe,
   and the `cairncheck` analyzer.
9. **Amend the spec for whatever Geoff confirmed at his read.** Two contracts changed under the
   2026-09-14 ruling and were marked in the header as awaiting him: the exit codes, now the
   monitoring-plugin convention with the spec's exit 4 dropped, and the registry path, now
   `os.UserConfigDir` with the Node CLI's path as a fallback read. For each one he confirmed, edit
   `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md` in place, and record the
   amendment in `docs/internal/engine-rulings.md` if the ruling reaches beyond the tool. Also amend
   the spec's credential section, which says the tool never writes a credential: `cairn auth set`
   writes one to the OS keyring by the same ruling, and `cairn auth unset` removes one. Do not
   amend anything he declined; report it as an open item instead.
10. **The 2026-09-20 addendum at the spec's end is append-only.** This task appends one dated
    correction to it and rewrites nothing: `Frame` carries no bubbletea type, so the addendum's
    `Cursor *tea.Cursor` on `Frame` is wrong, and the HUD composes a `tea.View` from a `Frame` plus
    its own cursor state. The correction was drafted with this amendment on 2026-09-20 and is
    already in the file; this task verifies it is present and reads correctly against what shipped.
11. **Merge this pass by PR off `main` as a true merge commit: no squash, no rebase.** Task 22b
    pushed `tool/v1.0.0` on a commit of this branch, and `go install ...@v1.0.0` resolves that tag,
    so the commit has to stay reachable from `main`. Use `gh pr merge --merge`, and **assert
    afterwards that `git merge-base --is-ancestor tool/v1.0.0 origin/main` succeeds**, recording the
    command and its exit status in the pass report. A failure here is a stop, not a note: it means
    the published install path is broken. Otherwise the merge follows Task 17b's, with the same
    never-merge-over-red rule, the same measure-then-resolve step for the conflict set, and the
    same coordination check against any other pass mid close on `CHANGELOG.md`, `docs/STATUS.md`,
    or `ROADMAP.md`.
12. If the simplifier changed code under `tool/`, reinstall the binary and record whether a
    `tool/v1.0.1` tag was warranted. If one is cut, the release job fires again and its artifacts
    are checked the way Task 23 checked the first set, and the `retract` directive Task 22b
    documented is used if the first tag is the one being corrected.
13. **Carry the twelve items of "outside the amendment, for the owner" forward** rather than
    letting them die with the pass. Geoff ruled all twelve on 2026-09-21 and each carries its
    ruling line, so this step routes a ruled item rather than re-deciding it: each one lands in
    the ROADMAP tier where it bites, in `docs/STATUS.md`'s carried list if it blocks the next
    action, or in `docs/internal/facts/` if it is a fact about shipped behaviour. The four items
    segment 5 executed (5, 7, 8, 9) are recorded as shipped rather than carried. Item 1's decline
    is recorded in `docs/internal/engine-rulings.md` with the evidence that reopens it, a second
    renderer needing the same vocabulary; item 2 goes to ROADMAP "Someday" carrying its trigger;
    item 11 is landed and carries nothing. The close records which destination each took.
14. Record both budgets: tokens against the 20M ceiling, and attended time as a planning-miss count
    plus an execution-sitting count. **The owner gate before Task 22b is a planned sitting and is
    not an execution sitting**, the same way Task 10 was in Pass A.

**Acceptance, the duties this task gained on 2026-09-21.** They were agreed with the pre-cut
conductor (session `cairn-cms-f5`, PR #69) so both sessions carry Geoff's directions the same way.
Items 15 to 18 are the release handshake the `0.97.0` cut reads; that cut runs as Task 6 of
`docs/superpowers/plans/2026-09-21-pre-cut-pass.md` in a fresh session starting from STATUS alone,
so what it needs has to be on `main` and not in a conversation.

15. **A `CHANGELOG.md` entry under `## Unreleased` for the Go tool's 1.0**, carrying the `go
    install` path with **the exact install line**, the tag's artifacts, and a plain statement that
    the binary is **not in the npm tarball**. The release body is rolled from that window. If the
    tool needs no consumer action, the entry says so **without** the phrase `Consumers must:`; if
    it needs one, it carries the line.
16. **The site upgrade brief gains a tools section.**
    `docs/internal/record/2026-09-21-site-upgrade-brief.md` arrives on `main` with PR #69 carrying
    one line that calls the Go tool out of scope. That line becomes a tools section presenting
    `cairn` 1.0 with the exact install line. **B2 owns that text**, and the acceptance is that the
    out-of-scope line is gone and the section names the install path.
17. **The `tool` workflow reads `success` on the exact merge SHA.** The cut pins its tag to one
    SHA green across `test`, `e2e`, `create-site`, `scaffold`, `design`, and `tool`, and counts an
    absent run as red, so this task confirms a run exists on that SHA rather than on the branch.
    The report records the SHA and the conclusion.
18. **One `docs/STATUS.md` line under "Immediate next action"**: the tool's 1.0 is merged, tagged,
    and released, naming the tag and the merge SHA, and stating that **the `0.97.0` cut waits on
    the doctor-retirement pass and draft-docs pass A**. This close never writes that the cut is
    unblocked: Geoff ruled after segment 5 that the cut carries those two predecessors, so the
    tool's merge removes one of the cut's conditions rather than all of them. STATUS's line is
    the real handoff, because the orchestrator session will likely be closed by then.
19. **Message the engine orchestrator after the merge**, that `main` carries the tool, that the
    cut's remaining predecessors are the doctor retirement and draft-docs pass A, and that the
    cut resumes from Task 6 of `docs/superpowers/plans/2026-09-21-pre-cut-pass.md`. The message
    is a courtesy on top of criterion 18, never a substitute for it.
20. **`main` stays quiet during the cut.** When the cut session asks, hold every edit on `main`
    until its publish verifies: a push between its CI verify and its tag forces a re-verify.
21. **ROADMAP's "window after the cut" entry is rewritten and its MCP front end removed.** The
    order after the tag, ruled by Geoff through the pre-cut conductor: the one cut, a docs chore
    lifting the narrative-arm freeze and the site-pass no-edit rule, docs-infra currency, draft
    docs, the site round, the improvement release.
22. **Site agents may edit docs directly after that chore, so two documents are amended to match.**
    The after-1.0 framing brief
    (`docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md`) has its tool-friction
    route amended, since it assumes a site agent cannot edit the cairn-cms checkout, and the
    `site-pass` skill gains a "Tool friction" section. Acceptance: the brief's route names the
    direct-edit path and the skill's section exists.
23. **The known drawer-overlay flake and its mechanism are recorded**, so the merge's `e2e` run is
    read correctly. `examples/showcase/e2e/admin-visual.spec.ts`, "admin drawer overlay, light",
    at 390 px and 320 px, about 1,025 px of difference, seen on a docs-only head. The mechanism:
    daisyUI's `drawer.css` leaves the open panel compositor-promoted (`will-change: transform`,
    its reset losing inside `:where()`), so Chromium picks LCD or grayscale text raster per run.
    PR #69 fixes it with one scoped `will-change: auto` rule in `cairn-admin.css` and a regen of
    the six drawer-overlay baselines. **B2's merge brings `main` in first, so it inherits the
    fix**; a drawer-overlay failure at 320 or 390 px before that is this defect and not the tool.
    It lands in `docs/internal/facts/` or the engine rulings ledger, whichever the fact fits.
24. **The README-facing facts state the HUD's real home.** `tool/README.md` and the ROADMAP entry
    say that **a terminal HUD is a 1.x minor under `cairn hud`**, and that **2.0 is reserved for a
    break** rather than for the HUD. The framing brief
    (`docs/superpowers/specs/2026-09-21-cairn-tool-after-1-0-framing.md`, on `main`) is the
    record. Criterion 8's 2.0 hand-forward is rewritten to match: the render surfaces the HUD
    imports unchanged are still the hand-forward, but the version it hands forward to is a minor.
    Task 22a-ii criterion 15 already corrected the README sentence; this criterion is what keeps
    the ROADMAP and the hand-forward from contradicting it.
25. **One more duty: harvest the tool's operator facts into `docs/internal/facts/admin.md`**
    (install, credentials and `cairn auth check`, `health` and its four verdicts and five result
    words, holds, the scheduled run and the alert threshold, exit codes, `--json`), gated by `npm
    run check:facts`, because the container holds nothing about the tool today and the draft docs
    are written from it. **Record this ruling (Geoff, 2026-09-21), not a recommendation pending
    confirmation:** the cairn CLI is an assumed part of the system; it is packaged separately only
    because its installation targets vary. All docs live on cairn.pub from a single source, so the
    tool's public pages live under `docs/` with every other page: the exit-code and JSON contracts
    in `docs/reference/`, credentials with `cairn auth check` and the scheduled run in
    `docs/admin/`. 1.0 ships with `tool/docs/` as the one interim copy. The draft-docs pass after
    the cut writes the pages into `docs/` from the facts container, deletes the four public
    `tool/docs/` originals (the ADRs and design inputs stay in `tool/`), and a small
    `tool/v1.0.1` repoints the README, `cairn help`, and fix-line links at cairn.pub.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`, plus the repository's own npm
  gate over the non-`tool/` files this task edits (`docs/STATUS.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `docs/internal/`, the spec). **That npm half includes the root `npm test`, which launches a
  browser, so the npm gate runs UNLANED and only the Go gate takes the light lane.** Run them as
  two commands, never one lane-tagged string. Commit.

### Outside the amendment, for the owner

Twelve items the pass surfaced that sit outside the bounds Geoff pre-approved (eight from the
design amendment, three from the 2026-09-21 overnight run, one from the segment 4 pre-flight).
None is a task, none is executed by this pass, and each names what would settle it. Task 25
carries them forward to the ROADMAP, STATUS, or the facts container.

**Geoff ruled all twelve on 2026-09-21** (`~/.cache/cairn-tool-b2/owner-rulings-2026-09-21.md`),
taken one at a time while segment 4 ran. Each item keeps its original text, and its ruling is the
line that closes it. Four of the rulings changed code, which is what segment 5 is.

1. **A version of the engine's condition registry carrying `actor` and `outward`.** 1.0 holds both
   fields in the Go tool's own messages table, because `src/lib/diagnostics/conditions.ts` is read
   by four production sites and its ids are a published contract. Widening it is an engine pass
   with its own consultation. The question for the owner: whether the engine should own the actor
   vocabulary at all, or whether it stays a property of whoever renders a diagnosis.
   **Ruled 2026-09-21: declined.** Record it in `docs/internal/engine-rulings.md` at Task 25; a
   second renderer needing the same vocabulary reopens it.
2. **A shipped `cairn-health` skill fragment in the npm package.** Deferred rather than declined.
   The family pattern exists, but the skill would duplicate `cairn help agents` and need a drift
   test between them, and the binary's own page is the surface a `go install` operator actually
   reaches. The trigger that would settle it: an agent harness that reads the npm package but
   cannot run the binary.
   **Ruled 2026-09-21: deferred to ROADMAP "Someday", carrying that trigger.**
3. **`--cairn-cli-rule` in `cairn-admin.css`.** Task 20a's palette introduces one new Warm Stone
   role, the rule colour, which exists only in the Go palette today. Whether the admin's own
   stylesheet should carry the same token is a design-system question for the admin, not a tool
   question, and the tool does not wait on it.
   **Ruled 2026-09-21: declined.** There is no admin consumer of the token.
4. **The local e2e Chromium pin.** Unrelated to the tool and recorded because this pass's own gate
   work surfaced it again: the visual baselines are CI-canonical and this workstation cannot
   reproduce a few of them, so a local run is green only by inspection. The lasting fix is to pin
   the local e2e to the runner's Chromium build and fonts, or run it in a matching container.
   **Ruled 2026-09-21: already a ROADMAP chore**, and nothing new is filed for it.
5. **A fifth wire word, `unknown`, for a non-credential skip.** The pass ships the owner's four
   per-check words, `pass fail skip held`, with a mandatory `reason` code separating a missing
   credential from a timeout, a transport failure, and a rate limit. The domain-risk review argued
   that an agent reads `skip` as benign whatever the reason beside it says, and that a transport
   failure deserves its own word. The four words plus the reason enum are what 1.0 freezes unless
   the owner rules otherwise, **and the decision has to be made before the 1.0 freeze**, because
   adding a fifth state word afterwards is a major-version event.
   **Ruled 2026-09-21: the fifth word ships**, reversing the 2026-09-20 four-word ruling. `skip`
   is not attempted, by configuration; `unknown` is attempted with nothing observed. Task 21b.
6. **Whether a rate-limited run is UNKNOWN or WARNING.** The plan rules UNKNOWN and overrules the
   copy catalogue's `WARNING, never CRITICAL` line, on the reading that a throttled run did not
   observe the site. The catalogue's reading is that an operator who sees UNKNOWN goes looking for
   a fault that is not there. Both are defensible; the plan's is what ships unless the owner rules
   otherwise, and this one also freezes at 1.0.
   **Ruled 2026-09-21: the plan's reading stands.** A rate-limited run is UNKNOWN, and the
   catalogue's WARNING row stays overruled.
7. **Whether a held failing check contributes WARNING and an expired hold contributes CRITICAL.**
   Task 18 ships this as the conductor's ruling, Nagios-style: an acknowledgement silences
   notification, never the underlying status. Confirm before the 1.0 freeze, because the exit-code
   table is one of the surfaces this pass freezes.
   **Ruled 2026-09-21: a held failing check contributes WARNING, and an expired hold returns the
   check to its own severity from Task 21's per-check table, never a flat CRITICAL.** Task 21b
   criterion 6 pins it, and criterion 7 checks Task 24a's threshold text against it.
8. **Background detection for `RenderInput.Dark`.** Nothing in this pass detects a terminal's
   background: `Dark` defaults true, and the light branch (Task 20a) is proven by goldens only,
   never by a live query. An OSC 11 query in `profile.go` is impure and stray bytes-prone;
   `COLORFGBG` is a third environment variable outside Task 20a's own list; 1.0 performs neither. A
   `--theme` flag or an OSC 11 query, and whether either lands before or after 1.0, is the owner's
   call.
   **Ruled 2026-09-21: `--theme dark|light` ships in 1.0**, a pure flag selecting
   `RenderInput.Dark`. OSC 11 detection arrives later as `--theme auto` in a minor. Task 21b.
9. **`cairn health --quiet` on a many-sites sweep prints the whole strip.** `--quiet` was designed
   to suppress per-check progress, not the sweep's own summary output, but filtering it against the
   strip's own verdict logic would leave the strip as bare separator glyphs with nothing to show:
   the strip is the sweep's one output. Confirm the quiet fleet form before the 1.0 freeze, or
   choose one: the current whole-strip behaviour, a one-line summary, or no output at all on a
   fully OK sweep.
   **Ruled 2026-09-21: nothing at all on a fully OK sweep, and the normal strip otherwise.** No
   new render body. Single-site `--quiet` follows the same rule. Task 21b criteria 8 to 10.
10. **Windows console behaviour is unverified on a real conhost.** Task 20a's criterion 17 rules
    that the tool attempts `ENABLE_VIRTUAL_TERMINAL_PROCESSING` before falling back to the ASCII,
    no-colour path, and the Windows CI leg asserts the branch taken, but no task in this pass runs
    the built binary in an operator's own Windows terminal. Confirm on real hardware before the
    1.0 freeze, or accept the CI leg alone as sufficient evidence.
    **Ruled 2026-09-21: the Windows CI leg suffices for the tag.** The release notes say Windows
    is CI-tested and not yet verified by a human in a terminal, which Task 23 carries.
11. **`~/.claude/workflows/pass-execute.js` owes a gate-string comparison fix.** The overnight
    scratchpad copy of the runner compared a task's resolved gate string against the bare gate
    command, so the classifier's own preamble and file list (see the note on gate tier above, "the
    resolved gate string is not a bare command") read as a mismatch and falsely escalated three
    accepted tasks during the overnight run. The fix compares the command line alone, never the
    classifier's preamble, and belongs in the dotfiles runner rather than in this repo; it is
    recorded here because this pass is what surfaced it.
    **Ruled 2026-09-21: LANDED**, in the dotfiles runner at `75caf88`. Nothing is carried forward.
12. **The collective-word copy for a multi-variable blocked group is new operator prose.** Task
    20b-iii's fix-list head needs a word covering more than one missing-credential variable at
    once, and the messages table may gain a key for it. Whether that word reads right wants
    Geoff's own read at Task 22a's editorial gate, the same gate that carries the segment 2 and
    segment 3 carry-forward strings.
    **Ruled 2026-09-21 at that gate: the collective head `tokens` is approved as it stands**,
    paired with the corrected fix line for more than one missing token. Task 22a-ii criteria 11
    and 19.

---

## Declined or recorded on 2026-09-20, so nobody re-argues them

Each item below was argued at Pass A's close, by Geoff's rulings or by the two research audits of
2026-09-20 (CLI practice; bubbletea v2 readiness), and settled. An executor or reviewer that
reaches one of these has reached a closed question.

- **Positional `health <site>` stays,** against the Monitoring Plugins guidelines' preference for
  flags. POSIX, clig.dev, `gh`, and `kubectl` all accept a primary operand, and that is the
  stronger convention for a noun a human types every time. Recorded in
  `tool/docs/reference/exit-codes.md` by Task 21.
- **No environment equivalents for the common flags,** so there is no `CAIRN_TIMEOUT`,
  `CAIRN_SINCE`, or the like. Leanness: every flag already has a documented scheduler form, and a
  second input path per flag doubles the precedence surface for nothing. Recorded as a decision.
- **The registry lives under the config directory although XDG would call it state.**
  Compatibility with the Node CLI's own location is the reason and it stands. Task 22a's README
  states the precedence and the migration rule.
- **`store.Dir` keeps its injected `config` parameter.** It is what makes the three-platform
  resolution table testable on one platform.
- **`store.Source` stays exported.** It gains its 1.0 caller in Task 19a-ii's `sites list --verbose`.
- **`store.List` keeps its `[]error` return.** A malformed record must be reported by id without
  failing the whole list, which one error cannot express.
- **`spine` keeps its dependency on `providers`.** The reason-code vocabulary is built from
  `providers.Reason`, and breaking the dependency would mean duplicating that enum.
- **`providers.Missing` stays in `providers`.** Both `render` and `cmd/cairn` import it, and it
  describes a provider-resolution outcome.
- **`providers.Corpus` and `providers.NPM.Versions` stay exported.** `Corpus` is read from tests in
  other packages, and `Versions` is a named 2.0 seam in the table above.
- **A custom analyzer (`cairncheck`) stays 2.0.** 1.0's gates are the Makefile's `vet`, `test`,
  `vulncheck`, and the lint `go-conventions` names. An analyzer joins when a rule the spec names
  needs one.

Added by the 2026-09-20 design amendment:

- **`charm.land/fang/v2` is declined for 1.0** and filed as a 2.0-window spike. It brings its own
  `colorprofile` detection and its own `charmtone` palette, both of which would fight the one
  profile-detection file ruling 1 permits and the Warm Stone table the family owns.
- **`github.com/lrstanley/bubblezone/v2` is declined,** on its own author's advice under bubbletea
  v2: `tea.View.OnMouse` at the content level covers what it exists to solve.
- **`ntcharts` and any sparkline are declined for 1.0.** The sparkline appeared in no reviewed
  frame across three mockup iterations, three reviews named it the one purely decorative element,
  and a chart with no axis, scale, or label is a debug print. The condition that would reopen it
  is a reviewed frame in which it carries a fact no other line carries.
- **MCP is never an engine feature, not in 1.0 and not in 2.0.** An operations agent's transport
  is not cairn's core job, and the tool is already the thin seam the charter prescribes. The
  practical half: a skill on disk reaches every agent while an MCP server reaches only the main
  loop, so the same budget spent on `cairn help agents` covers strictly more agents. An MCP server
  would also be a second public surface with its own versioning, freezing a duplicate of the
  contract 1.0 is about to freeze. The named trigger that would reopen it: an operator arrives
  whose harness is MCP-only AND `cairn help agents` measurably did not get an agent to a correct
  first invocation.
- **A shipped npm skill fragment (`skills/cairn-health/SKILL.md`) is deferred**, not declined. The
  family pattern exists, but the skill would duplicate `cairn help agents` and need a drift test
  between them, and the binary's own page is the surface a `go install` operator actually reaches.
  Filed as item 2 of "Outside the amendment, for the owner" at the end of Pass B2.
- **The engine's `src/lib/diagnostics/conditions.ts` is not changed by this pass.** The `actor` and
  `outward` fields live in the Go tool's own messages table for 1.0. Four production sites read
  that registry and its ids are a published contract; widening it is an engine pass with its own
  consultation, filed as item 1 of "Outside the amendment, for the owner" at the end of Pass B2.
- **A site-scoped acknowledgement is 2.0.** In 1.0 an acknowledgement is keyed by check id and
  applies across every site in a sweep, which Task 19b documents and tests.
- **The concurrent multi-site sweep stays 2.0.** 1.0's sweep is sequential over the same
  `health.Run`; the `errgroup` fan-out, the connectivity probe that gates it, and the
  generation-counted refresh arrive with the HUD.
- **The acknowledgement carries no author.** `health.Ack` is `{CheckID, Expires}` and the copy
  standard's attribution row is declined rather than implemented, on that row's own advice: drop
  it rather than add a field to carry a string.
- **The `do this next` block is not implemented.** The single-site body's fix sits on the line
  below its own failing row and needs no heading.
- **The command stays `adopt`,** which overrides the copy standard's own section 2.9 row
  preferring `add`. The standard graded the word; the owner ruled the command name.

---

## Rollback and halt semantics

The 2026-08-20 plan carried no rollback section. This one does, modeled on the polish-C plan's
own, because a Go module's halt states are cheaper to reason about than an engine branch's and
should be written down.

Every task ends with the full gate green, so the branch is mergeable at each commit in all three
passes. The tool ships from its own module and its own tag, so a halt costs no npm release
promise and blocks no consumer site. That is the difference from the engine's own passes, and it
is why no pass here needs a held cut.

Five orderings are load-bearing, and a resume must respect them:

- **Task 1 before Task 9 before Task 10.** Task 9 builds the credential input path on the cobra
  root Task 1 creates, and Task 10 mints and probes through that path. Task 10 dispatched first
  would read the environment directly and there would be no chokepoint for Task 19a-i to extend.
- **Task 3 before Task 6.** The corpus resolver in Task 6 reads files Task 3 creates. Task 6
  dispatched first would have nothing to resolve and would invent fixtures, which is the parity
  contract's whole failure mode.
- **Task 10 before Task 15 and Task 17.** The Builds permission question and the observability
  response shape both come out of the probe run. Task 15 dispatched first would guess at the
  Builds capability, and Task 17 would synthesize its fixture from documentation rather than from
  a real response's key set.
- **Task 11b-i, then Task 11b-ii, then every other task in B1 and B2.** 11b-i threads
  `context.Context` through every exported `providers` method, which is a signature break across
  every check and every command. Taken after the checks exist, the same break costs six more files
  and six more fix rounds. 11b-ii reads 11b-i's consolidated `reasonForStatus` for its one
  reason-to-outcome translation, so the order between the two halves is load-bearing too, and it
  lands `State.Severity()`, which Task 20b-i's severity ranking and Task 18's precedence table
  both read.
- **Task 17b before every task in B2.** B2 runs on a worktree off `main`, and `main` carries no
  `tool/` tree until Task 17b merges PR #60. B2 dispatched first would have nothing to branch from.

Six more orderings the 2026-09-20 amendment and its night re-cut add inside B2:

- **Task 19c-i before every other B2 task.** Every task's operator-facing strings come from the
  tables it builds. Taken the other way, each task invents operator copy, which is the one thing
  the amendment's standing rule forbids, and every golden would be rewritten when the tables
  landed. Task 19c-ii can only run after the command files exist, which is why the task is split
  rather than merely moved.
- **Task 18 before Task 19a-ii and before Task 21.** Task 18 creates `spine.ExitCode`, which
  19a-ii's sweep calls for its cross-site code and which Task 21 widens with the per-check severity
  table. Under the 2026-09-14 ordering the arithmetic sat in Task 21, two segments after the first
  criterion that calls it.
- **Task 19a-i before Task 19a-ii.** 19a-i owns `root.go`, `main.go`, and the shape of the tree;
  19a-ii registers one command on that root and otherwise works in `internal/store` and
  `internal/secrets`. The reverse order makes the tree a moving target under the sweep.
- **Task 20a before Task 20b-i before Task 20b-ii before Task 20c.** 20a produces the theme, the
  glyphs, the rungs, and the sanitizer the bodies are built out of; 20b-i creates the fixtures, the
  ranking, and the golden harness that 20b-ii extends; 20c marshals the same inputs and reads
  20b-i's ranking for `worstFirst`. The corpus is created in 20b-i, so a rung or a profile added
  after it exists multiplies the regeneration.
- **Task 21 after Task 20c.** `cairn help agents` states the JSON and NDJSON contract and points at
  the schema's location, so the contract has to exist before the page can name it honestly.
- **Task 22a before Task 24a before the owner gate before Task 22b before Task 23 before Task 24b
  before Task 25.** 22a produces the release candidate that 24a's examples are run against and that
  the gate is taken on; 22b's tag is what 23's release job fires on; 24b installs the owner's own
  timer against the released tool; and 25 merges the branch that published tag lives on, which is
  why 25's merge mode is a hard constraint rather than a preference.

**The halt state this pass is designed around.** An unattended run that reaches the owner gate and
stops has left `main` untouched, no tag pushed, and no release published. Everything before the
gate is a branch with a green gate at every commit. That is the cheapest halt in the three passes
and it is deliberate: the irreversible acts are all on the far side of one human sentence.

State at each halt point, so a resuming session knows what it has. After Task 3 the corpus
exists and the Node suite still passes. After Task 5 the registry reads and writes records. After
Task 8 the vocabulary is complete and no check exists. After Task 9 a credential resolves
through either provider and `cairn auth set` writes one. After Task 11 Pass A is closed and the
module is green on three platforms, unmerged. After Task 11b-i `providers` carries a threaded
context and one copy of each shared helper. After Task 11b-ii the four accepted packages also carry
one severity order, one reason-to-outcome translation, and a single-source `record`, with no check
yet written.
After Task 17 every check exists with no CLI over them. After Task 17b Pass A and Pass B1 are on
`main` and `main` carries `tool/`. After Task 19c-i every operator-facing string has one home.
After Task 19c-ii every action is reachable from the shell with translated errors and raw output.
After Task 20b-ii the three bodies render and the goldens pin them. After Task 21 the exit-code
contract holds and every output path is scrubbed. After Task 22a a release candidate is installed
and the owner gate is where the run stops. After Task 24a the scheduled run is documented for three
platforms. After Task 22b the tool is tagged; after Task 23 the release carries six attested
binaries and `go install` works from a clean machine; after Task 24b Geoff's own timer has fired
once.

A halt inside B2 before Task 21 leaves a usable binary with no full exit-code contract, so no
scheduled run may be armed early: a unit reading an exit code the binary does not yet promise
would alert on noise. A halt after Task 21 and before Task 22b leaves the tool running
from a working copy rather than a tag, which is honest and is reported that way rather than
described as 1.0. **The halt at the owner gate, after Task 24a, is the designed one.** A halt after
Task 22b and before Task 23 leaves a tag nobody outside this checkout can install, so STATUS says
1.0 is tagged and not yet released. A halt after Task 23 and before Task 24b leaves 1.0 released
with the run documented but no timer armed anywhere, which is the state to name explicitly in
STATUS, because a watch that exists only as prose is the weakest form.

A halt inside B1 before Task 17b leaves PR #60 a draft with Pass A and part of B1 on it, which is
a safe state: `main` is untouched and releasable. Say so in STATUS rather than describing the tool
as landed.

If a second `fix` verdict lands on one task, that is the conductor's decision point and also the
signal to re-check the pass boundary. Pass B's fallback cut after Task 17 has been taken: it is the
B1/B2 boundary, so there is no further fallback cut held in reserve. A pass that overruns from here
splits at a segment boundary and the new pass takes the next number.

## Self-review

**Spec coverage.** Repo home, gates, and version stamping: Task 1. The 1.0 ADR and conventions
wiring: Task 2. The corpus: Task 3. `record`: Tasks 4 and 11b-ii. `store`: Tasks 5 and 11b-ii.
`providers`: Tasks 6, 7, and 11b-i. `spine`: Tasks 8, 11b-ii, and 18. Credentials: Tasks 9, 10, 12,
19a, 19b, and 21. `health` and every check in
the spec's table, plus the `creds` check the spec's table does not name: Tasks 12 through 17.
`logs`: Task 17. Adopt: Tasks 18 and 19a-i. `cmd` and exit codes: Tasks 19a-i, 19a-ii, 19b, 18, and 21. The render
seam and the missing-credential disclosure: Tasks 20a, 20b-i, 20b-ii, and 20c. The doctor relationship: Task 8's condition
test and Task 19c-i's fix map. The 1.0 cut: Tasks 22a and 22b. Distribution, which the spec put out of scope
and the 2026-09-14 ruling pulled in: Tasks 1 and 23. The scheduled run: Tasks 24a and 24b. Pass closes:
Tasks 11, 17b, and 25. The spec's `ui` and `theme` sections and its `Chapter` type are
deliberately uncovered and are listed in the cut table. The spec's `secretRefs` reservation is
covered as a round-trip in Task 4 and as a 2.0 hand-forward, because no 1.0 check reads a per-site
secret. The spec's own corrections a HUD plan must make before planning from it are the dated
addendum at the spec's end, written 2026-09-20.

**Type consistency.** `providers.Credential` is the only credential type, consumed by Tasks 6, 7,
9, 10, 19a, and 21. `secrets.Provider` is the only credential source, consumed by Task 9's
`loadEnv` and by nothing else. `spine.Outcome`, `spine.ReasonCode`, `spine.State`, and
`spine.Condition` are
consumed by Tasks 12 through 17, 20, and 21; `spine.State.Severity()` is produced by Task 11b-ii and
is the module's one severity order, enforced by a `hygiene` test. `context.Context` is threaded
through every `providers` method by Task 11b-i and is a parameter of every call in Tasks 12 through
21. `health.Report`, `health.Clients`, and `health.Tier` are consumed by Tasks
19a, 20, and 21. `record.Record` is consumed by Tasks 5, 12, and 18. `store.Entry` is consumed by
Tasks 19a-ii and 20b-ii, and `store.Source` by Task 19a-ii. `render.StatusState` is produced by Task 20b-ii and
populated by Task 19a-ii's
`loadEnv` result. `render.Verdict` is produced by Task 20b-i and set from Task 18's `ExitCode`.
`render.Profile` is produced by Task 20a and set from the profile detection in that same task's
`profile.go`, the module's one TTY check. `health.Options` and `health.Acks` are produced by Task
12, read by Tasks 17 and 21, and populated by Tasks 19a-i's, 19a-ii's, and 19b's flags. `internal/version` is
consumed by Tasks 7, 22, and 23.

**Pass sizing.** Pass B's fourteen tasks were split into B1's nine and B2's nine on 2026-09-20
(Geoff, ruling 2), which is the pass split this section's earlier draft proposed and held in
reserve; the three-lens review then split Task 11b along disjoint Files, making B1 nine. The proposal's own trigger fired: the 2026-09-20 CLI audit added eleven deliverables to
Task 19 alone, so Task 19 became 19a and 19b, and that was the third task split, one past the
point at which this workstation's rule says to split the pass rather than the tasks. B1 and B2 each
sit at nine tasks against segments of one to four, which is the shape the segment rule
wants. The accumulation is stated rather than absorbed: B1 gained Task 11b, split at the three-lens review into 11b-i and 11b-ii along disjoint Files, entirely from Pass A's
architecture reads and fold reviews, and B2 gained a task from the 19a/19b split plus amendments to
six of its eight existing tasks. Nothing here was added by adjacency; every item traces to a
2026-09-20 ruling, audit, or architecture read, and the "Declined or recorded" section holds what
was argued and refused.

**Conductor rulings recorded here, so no executor re-argues one.**

1. `tool/tools/analyzers/cairncheck/main.go`, old plan Task 24's Files block. **Ruled 2.0.**
   1.0's gates are the Makefile's `vet`, `test`, `vulncheck`, and the lint `go-conventions`
   names. A custom analyzer joins only when a rule the spec names needs one. Recorded in the cut
   table and in the 2.0 hand-forward with that condition.
2. Spec decision 6, "The tool is an operator cockpit, and says so", spec lines 61 through 68.
   **Ruled into Pass B's close.** Task 25 carries a one-paragraph edit to
   `docs/internal/what-cairn-is-and-is-not.md` as a deliverable, with the acceptance stated
   there. It does not wait for the docs rewrite.
3. The `theme` split. **Ruled as the draft had it:** a minimal glyph and profile set in 1.0's
   render seam (Tasks 20a and 20b-i), the full poplar `theme` port in 2.0.
4. The scheduled run's form. **Ruled documented units for three schedulers, with no new
   subcommand.** The spec names `cairn health` as the tripwire and lists no `tripwire` verb, so
   Task 24a ships `tool/docs/tripwire.md` with a systemd, a launchd, and a Task Scheduler example.
   Geoff's own systemd user timer, authored under `~/.dotfiles` and installed by `stow` under
   `vps-conventions`, is one installation of the systemd example and is that task's verification
   evidence. A cloud routine through the `schedule` skill is a 2.0 hand-forward conditional on a
   hosted spine.
5. The pass order. **Ruled cut, release, scheduled run, close**, so the release fires on a tag
   that exists and the run is documented against an installed binary and a populated registry.
6. The `Chapter` type. **Ruled 2.0**, with a cut-table row, because 1.0's checks key off
   condition and reason.
7. Version provenance. **Ruled one mechanism for a repository build:** `-ldflags -X` fed by `git
   describe --tags --dirty --always`, plus `-trimpath`, with `dev` and `none` as the in-source
   defaults. **Extended 2026-09-14** for the `go install` path, which runs no Makefile: the
   version falls back to `runtime/debug.ReadBuildInfo`'s module version, and to `dev` only when
   there is no build info. The precedence lives in one doc comment, so this is one ordered
   mechanism and not two competing ones.
8. The Errors threshold. **Ruled five error records in the window as the default:** more is
   Failing, one through the threshold is OK with the count in the detail, zero is OK. Under the
   2026-09-14 ruling the number is a documented flag, `--error-threshold`, carried on
   `health.Options` rather than written into the check.
9. Credentials. **Ruled two providers in 1.0** (Geoff, 2026-09-14): environment first, then the
   OS keyring through `go-keyring`, written by `cairn auth set` and read by `loadEnv`. A third
   backend is a 2.0 hand-forward, and the seam's interface is stated in Task 9 so it costs one
   implementation. The spec's `keyring://` reference form belongs to this seam.
10. Per-site secrets. **Ruled out of 1.0 entirely.** No 1.0 check reads one: the spec's own check
   table gives every check a machine-level credential or none, and the spec says sub-project 1
   decodes no per-site secret. So `secretRefs` is not a typed field, it round-trips through the
   ordered tail, and resolving a reference is 2.0.
11. Exit codes. **Ruled the monitoring-plugin convention** (Geoff, 2026-09-14): 0 OK, 1 WARNING,
   2 CRITICAL, 3 UNKNOWN, with `--require-credentials` and the spec's exit 4 both dropped, and
   CRITICAL over UNKNOWN over WARNING over OK as the precedence. This one is marked in the header
   as awaiting Geoff's confirmation, and Task 25 amends the spec if he confirms.
12. The registry path. **Ruled `os.UserConfigDir` on every platform** (Geoff, 2026-09-14), with
   the Node CLI's `~/.config/cairn/sites` kept as a fallback read so no operator's records go
   missing. Also marked in the header as awaiting his confirmation.
13. Distribution. **Ruled into 1.0:** a tag, `go install`, and a GitHub release with six prebuilt
   binaries and a checksum file, built by `tool.yml`'s own matrix. No release tooling is taken,
   because `go-conventions` asks for minimal dependencies and `go build` with a matrix does the
   job. `make install` stays as the local path. **Extended 2026-09-20:** the artifacts also carry
   build-provenance attestation (Task 23), because checksums published in the same release as the
   binaries they cover prove integrity and not authenticity.

**Geoff's three rulings of 2026-09-20.** These are his, not the conductor's, and they are recorded
here as well as in the tasks that read them, so a reader who starts at either end finds both.

14. **Color and the TTY predicate: exactly one predicate.** The module-wide ban on
   `term.IsTerminal` and `os.Stdout.Stat()` was written to keep a dead TUI launch gate
   (`shouldLaunchTUI`) out of 1.0, and that reason does not reach color. One TTY check is allowed,
   in the `render` package's profile-detection file and nowhere else. `NO_COLOR` (present and
   non-empty) and `--color=auto|always|never` override it; `TERM=dumb` and a non-TTY mean no color.
   The ban on a TUI launch gate stays, and bare `cairn` still prints help unconditionally.
   `loadEnv` is the only code that reads the environment, so it carries `NO_COLOR` and `TERM`.
   Read by Task 11b-ii (its carried-nits criteria are unaffected), Task 19a-i (criterion 12, the
   narrowed grep test), and Task 20a (criteria 1 and 2).
15. **Pass B splits into B1 and B2,** each with its own ceiling, checkpoint interval, segments, and
   close, both through `pass-execute.js` with the header as the opt-in. Read by the two pass
   headers above.
16. **Grammar: the full cleanup.** `cairn sites list` with bare `cairn sites` as an alias;
   `adopt list` as a distinct non-writing subcommand replacing the `adopt --list` mode flag; the
   hidden `probe-token` becomes `auth probe`; and `auth unset` is added so a rotated token's stale
   keyring entry can be cleared. `health <site>` and `adopt` keep their shape. Read by Task 18
   (the non-writing listing function), Task 19a-i (criteria 1 through 3), and Task 22a (the command-set
   assertion).

**The 2.0 hand-forward.** Task 25's handoff line names, as 2.0's own scope: the HUD (`ui` and
the full `theme` port), multi-site management with its concurrent sweep and the `errgroup`
dependency it will add, the two deferred ADRs, the `elm-conventions` fork, the TUI launch
predicate (`shouldLaunchTUI`, which is a different thing from the one color-profile TTY check 1.0
ships in `render/profile.go`), the
interactive adopt dialog, the `Chapter` type and its step mapping, a third secret backend behind
Task 9's seam (a file backend, `pass`, or 1Password through its CLI), resolution of the spec's
`keyring://` `secretRefs` references once a check needs a per-site secret, brew and a Windows
package channel and the npm shim, a cloud routine once a hosted spine exists, and `cairncheck`,
which joins only when a rule the spec names needs a custom analyzer.

**Three seams 1.0 ships that 2.0 depends on, named in the hand-forward as dependencies rather than
as scope.** `spine.State.Severity()` (Task 11b-ii) is the one severity order the HUD's worst-first
summary line and its status-glyph precedence both read; a second ordering appearing anywhere under
`tool/` fails a `hygiene` test, which is what keeps that promise. The `context.Context` threaded
through every exported `providers` method (Task 11b-i) is the HUD's only cancellation lever, because
bubbletea gives a `Cmd` no per-Cmd cancellation, so a stale generation's in-flight requests can be
stopped only through a context the sweep owns. `health.Options.OnCheck` (Task 12), the optional
callback `health.Run` fires as each check settles, is how the HUD paints a per-site refresh
incrementally instead of waiting for the whole sweep; 1.0's own reader is Task 21's `--verbose`
one-line-per-check output, so the seam ships exercised rather than dead. A HUD plan reads all three
as given, not as work.

**The spec's own corrections a HUD plan must make first** are the dated 2026-09-20 addendum at the
end of `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`. It is append-only
and no task in this plan rewrites it.

## Sources

- `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`
- `docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md`, the binding, pre-approved
  brief this file's B1 and B2 sections are authored from: Geoff's three rulings of 2026-09-20, the
  seven `go-architecture-reader` reads at Pass A's close, and the two research audits of the same
  day (CLI practice; bubbletea v2 readiness)
- `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, including its dated
  2026-09-20 addendum
- The Monitoring Plugins development guidelines, the source of the reserved short flags `-v`, `-t`,
  `-V`, and `-q` and of the exit-code convention, with the positional-operand and
  `--help`-exits-0 deviations recorded as deliberate
- `clig.dev`, and the `gh` and `kubectl` command grammars, the sources for keeping `health <site>`
  a positional operand
- `docs/superpowers/specs/2026-08-13-go-successor-tool-design.md`
- `docs/superpowers/plans/2026-09-08-polish-c-pass.md` (the renames this plan reconciles against,
  and the model for the reconciliation and rollback sections)
- `docs/STATUS.md`
- `ROADMAP.md`, the entries "The window after the cut, sequenced" and "The Go successor tool"
- `CLAUDE.md`
- `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/cairn-go-tool-versions.md`
- `~/.claude/skills/go-conventions/SKILL.md`, whose GOOS-suffix rule is why `perm_linux.go`,
  `perm_darwin.go`, and `perm_windows.go` replace a tagged `perm_posix.go`
- `~/.claude/skills/golang-spf13-cobra/`
- `~/.claude/skills/vps-conventions/`, which governs the one systemd unit in Task 24b's
  verification paragraph and none of the doc's other examples
- `~/.claude/projects/-var-home-glw907-Projects-cairn-cms/memory/cairn-go-tool-is-a-product.md`,
  the 2026-09-14 ruling this revision applies
- The monitoring-plugin exit-code convention (0 OK, 1 WARNING, 2 CRITICAL, 3 UNKNOWN), which
  Nagios and its compatible tools read
- `github.com/zalando/go-keyring`, the keyring library Task 9 takes, and `golang.org/x/term` for
  the echo-off prompt
- `~/.claude/docs/cloudflare-estate-inventory.md`, and `git remote get-url origin` in each of
  `~/Projects/{ecxc-ski,907-life,aksailingclub-org,xcathletes-org}`, the two sources for
  reconciliation row 30
- `~/Projects/poplar/Makefile`, the `install` target this plan's install convention matches, and
  `~/Projects/poplar/.vale/styles/glw907`, the overlay Task 1 vendors
- `packages/create-cairn-site/src/state.mjs`,
  `packages/create-cairn-site/src/cloudflare/{api,chapter2,chapter3,hostname,records,zone}.mjs`,
  `packages/create-cairn-site/test/{fake-cloudflare,fake-github}.mjs`,
  `packages/create-cairn-site/package.json`
- `src/lib/diagnostics/conditions.ts`, `src/lib/log/events.ts`,
  `docs/reference/log-events.md`, `docs/admin/is-it-working.md`

## Pass cairn-tool-A post-mortem (2026-09-20)

**What was built.** Tasks 1 to 10, on the `cairn-tool-a` worktree:

1. The `tool/` Go module, its Makefile-driven build gate, and the three-leg CI matrix.
2. ADR-0001 (the spine is the product, the portability ruling, the three dependency exceptions)
   and the `CLAUDE.md` wiring for `go-conventions` and `golang-spf13-cobra`.
3. The Cloudflare and GitHub fake fixture corpus, extracted from
   `packages/create-cairn-site`'s test fakes into JSON files outside that package's `files`
   allowlist.
4. The `record` package: `Record`, `Parse`, `Marshal` with key-order preservation, and the
   site-ID and domain validators.
5. The `store` package: registry paths, atomic saves, and file permissions.
6. The `providers` package: transport policy and the Cloudflare client.
7. The `providers` package's GitHub, npm, and probe clients.
8. The `spine` package: chapter vocabulary and outcome types.
9. The `secrets` provider seam and the `cairn auth set`/`auth list` commands.
10. `cairn probe-token`, Geoff's own credential mint-and-probe run.

**What was verified.** PR #60 is green on all three `make check` legs (ubuntu, macos, windows)
and on the Node checks, at `81e4d9fa`. A live `probe-token` run against Geoff's five repositories
and the Cloudflare account answered 200 on every endpoint, with private `xcathletes-org`
correctly reported private. The Windows reparse-point rejection is proven by CI, not merely
written: the junction tests failed by name on windows-latest on two earlier pushes, and the
final SHA's `store` package prints ok on that leg, so the test cannot silently skip.

**Rulings taken during execution (the conductor's).**

- `make -C tool check` is the gate; `scripts/checks/gate-tier.mjs` is skipped for `tool/`-only
  diffs because it carries no `tool/` rule.
- `record.Marshal` appends a non-zero typed key that was absent at parse time.
- `store.Dir` resolves `CAIRN_STATE_DIR`, then the legacy `~/.config/cairn/sites` path when it
  exists, then `os.UserConfigDir`, because the Node CLI still writes the legacy path.
- An unconnected Cloudflare Workers Builds trigger reads as an empty trigger list, never as
  error 12000.
- A direct `classifyReason` table stands in for corpus bodies the corpus does not carry.
- The `Step` enum is nineteen strings, because the Node GitHub chapter writes `installed`
  through a computed local.
- The Cloudflare read token needs seven read groups; Zone Settings: Read was missing from the
  plan's original six.
- A public repository proves nothing about a GitHub fine-grained token's scope, so
  `probe-token` marks each repository public or private rather than inferring scope from
  reachability.
- `probe-token` records key names from the real HTTP body through a recording
  `RoundTripper`, not from a re-marshaled shape.
- A security test that can silently skip on the only platform it guards proves nothing, so the
  Windows test creates a junction, which needs no elevated privilege.

**The close.** `code-simplifier` ran at `85c2acac`. Seven `go-architecture-reader` dispatches
ran, one per touched package (`record`, `store`, `providers`, `spine`, `secrets`, `version`,
`cmd/cairn`): six came back "sound with nits" and `cmd/cairn` came back "workmanlike," with no
path found on which a credential reaches argv, a log, an error string, or stdout. Four fold
tasks followed. The first, `7beb2014`, is the record renames and a key-set drift guard. The
second, `8ea19e9b`, is the store path checks, the spine slices exposed as functions rather than
vars, and the version constant. The third, `8dd326d9`, is the junction proof of the Windows
reparse-point rejection, which took three pushes against the Windows CI leg. The fourth,
`a7a709de` with its review fix `81e4d9fa`, is the single `secrets.Env`, the surfaced `Resolve`
errors, one credential table, and a module-wide sweep of process citations out of Go comments.

**Known residual from the fold.** The drift guard `7beb2014` added has a known gap: its parse
side is four hand-maintained mirror slices, so a key added only to `Parse`'s switch still passes
the guard undetected. The single-source rewrite that closes this gap is filed to Pass B1's
opening task.

**What left the pass, and its destination.** The `providers` package's remaining duplication,
threading `context.Context` through every `providers` method, `State.Severity()` in `spine`
with the deletion of `probe-token`'s private verdict algebra in its favor, and `record`'s
single-source rewrite and three-file split all move to Pass B1's opening task.
`discoverSites` moving into `store`, a typed exit error, and a dependencies struct for the
command constructors move to Tasks 19 and 21 of the re-cut. The decision record for all of this is
`docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md` on `main`: the re-cut of
Pass B into B1 and B2 is authored by the B1 session from that brief, pre-approved by Geoff
within the brief's bounds, and PR #60's merge belongs to B1's close.

**What a later pass would be wrong to rediscover.**

- A fine-grained GitHub token reads any public repository with no permissions granted, so
  verifying a re-mint needs a check against a private repository (`xcathletes-org`), not a
  public one.
- Cloudflare's `accounts/{id}/tokens/verify` answers error 1000 for a user-owned token; use
  `user/tokens/verify` instead.
- Go 1.27 aliases `json.RawMessage` to a type whose Stringer prints raw bytes, which is why
  `record.ExtraField` redacts in `String`/`GoString`.
- `order := []string{}` in `record`'s `decodeObject` is load-bearing: `nil` is `Marshal`'s
  never-parsed sentinel, and losing that distinction breaks round-tripping.
- `os.Symlink` needs a privilege Windows CI runners lack, so a Windows reparse-point test has
  to build a junction with `FSCTL_SET_REPARSE_POINT` instead.
- `vcs.revision` is absent from a `go install module@version` build, so `version.Commit` reads
  "none" there by design.
- `cairn-run-gate` has a light lane (`CAIRN_GATE_LANE=light`) for a gate that launches no
  browser, and this pass queued its own one-minute Go gate behind other sessions' browser gates
  for two to three hours before anyone used it.

**Both budgets.**

Tokens: about 6.7M subagent tokens against the 8M ceiling (84 percent), the conductor's own
turns uncounted. Of that: about 4.2M on Tasks 4 to 10 (Tasks 4 and 5 each took a
conductor-ruled fix round and then one further reviewer fix inside it; Tasks 6, 8, and 10 took
one ruled round each; Task 7 took one ordinary reviewer fix; Task 9 took none); about 0.2M the simplifier; about 0.55M the seven architecture
reads; about 1.4M the fold; and about 0.3M on two research audits (CLI practice; bubbletea v2
readiness) that are planning for Pass B rather than close work. The 80 percent checkpoint was
crossed during the close, and the conductor said so and recommended finishing.

Clock: about 15.5 hours, of which about 5 were lost to a network drop (`EAI_AGAIN`) at about
04:00 that killed a fold implementer and left the conductor unwoken until Geoff's 09:16 message,
and an estimated 2 to 3 to the gate lock.

Attended time. Planning misses, six, each an error or contradiction in the plan that surfaced
after approval and that a pre-flight check against the code would have caught: the `store.Dir`
precedence whose legacy branch was unreachable as written; error 12000 read as "builds not
connected"; a corpus-coverage criterion no fixture could satisfy; a step count of eighteen that
was actually nineteen; six Cloudflare permission groups where seven are needed; and a
module-wide ban on `term.IsTerminal`, written to stop a TUI launch gate, that also banned color
detection. Execution sittings, two: Task 10's token mint, which the plan scheduled as Geoff's
attended sitting (it ran longer than planned because of the missing seventh permission group and
the public-repository gotcha), and one combined question of three decisions on 2026-09-20 (the
color ruling, the B1/B2 split, the command grammar). Recorded also, as context and not as
sittings: Geoff checked in several times on the morning of 2026-09-20 because the pass was
running long, and redirected the close once (stop after the ritual; hand the re-cut to B1).

**Three process changes the pass produced,** already landed in the workstation dotfiles on
2026-09-20: the light gate lane in `cairn-run-gate`, with a note it prints when a heavy gate
waits on the lock, and `gateLane` support in both `pass-execute` runners; a rule that any
unattended run arms `/loop` at launch so a wake-up does not depend on the API link; a rule that
a conductor runs a factual pre-flight over a segment's tasks before dispatch.

**The friction log.** This pass touched no published docs arm and is a Go-module pass, so it did
not run the friction log's whole-log triage; the extend-1 pass closed on 2026-09-20 and ran that
triage hours earlier.
