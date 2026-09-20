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
> `cmd/cairn` file. Invoke `vps-conventions` only for the one systemd unit in Task 24's
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
| `cairn-tool-B2` | 9 (18, 19a, 19b, 20 to 25) | 10M | every four tasks |

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
tasks and touches about five packages at its close, so 8M. B2 runs eight build tasks, of which the
cobra tree is the largest in the plan, plus release work, and B1's merge is already behind it, so
10M. The original plan priced all of Pass B at 10M for fourteen tasks; the split prices the same
work at 18M across eighteen, plus the audit amendments folded in below. That increase is real and
is stated rather than absorbed.

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
- Pass B2 segments after Task 19b, after Task 21, and after Task 24, with Task 25 as its own
  closing segment. Two tasks in the second segment rather than three, because Task 22 pushes the
  `tool/v1.0.0` tag and an irreversible task opens a segment rather than sitting inside one. The
  checkpoints land after Task 20 and after Task 24.

**Task independence.** No two tasks in either B1 or B2 are independent of each other, so
`pass-execute.js` runs in its sequential default and nothing is marked parallel. The contended
resources, named so a later reader does not re-derive them: in B1, Tasks 11b-i and 11b-ii share
`tool/cmd/cairn/probe_token.go` and every check task appends to the literal slice in
`tool/internal/health/health.go`, which Task 12 creates; in B2 Tasks 19a, 19b,
20, and 21 all edit `tool/cmd/cairn/root.go` and `tool/cmd/cairn/main.go`. The cross-pass
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
| ADR-0002, design language and input (poplar's palette, ADR-0012's key model, `HealthGlyphs` at two tiers) | Old Task 2 | Same reason. 1.0's own glyph and no-color needs are smaller and live in Task 20. |
| The cairn fork of `elm-conventions` | Old Task 3 | It scopes to `tool/internal/ui`, a package 1.0 does not create. |
| `CLAUDE.md` lines making `bubbletea-design` and the `elm-conventions` fork mandatory | Old Task 2 | Both name TUI work. Task 2 wires the Go and cobra skills instead. |
| The `gallery` Makefile target as a TUI sweep, and the `analyzers` target with `screenregistry` | Old Tasks 1, 23, 24 | `screenregistry` checks screen registration. Task 20 keeps a golden sweep for the text renderer under its own target. |
| `shouldLaunchTUI(isTTY, env)` and the TTY gate on bare `cairn` | Old Task 19 | 1.0's bare `cairn` prints help unconditionally. The predicate is three lines, not a seam, so 2.0 adds it rather than 1.0 shipping it dead. Task 19a asserts its absence. Distinct from the one color-profile TTY check Task 20 ships in `render/profile.go` (Geoff, 2026-09-20). |
| The interactive adopt path | Old Tasks 19, 27 | 1.0's adopt is flag-driven and non-interactive. |
| The multi-site concurrent sweep, the `errgroup` fan-out, and the connectivity probe that gates it | Old Task 28 | 1.0's commands take one site at a time, per the ruling. The scheduled run loops over the site ids in whatever the operator's scheduler runs, which Task 24 documents for three platforms. |
| `remedy.go` in `ui` as the detail view's remedy source | Old Task 26 | The screen is 2.0. The mapping itself is kept and re-homed, see below. |
| `tool/tools/analyzers/cairncheck/main.go` | Old Task 24 | **Ruled 2.0** (conductor, 2026-09-14). 1.0's gates are the Makefile's `vet`, `test`, `govulncheck`, and the lint `go-conventions` names. A custom analyzer joins only when a rule the spec names needs one, and it is listed under the 2.0 hand-forward with that condition. |
| `Chapter` and the step-to-chapter mapping | Spec decision 2 | **Ruled 2.0** (conductor, 2026-09-14). 1.0's checks key off condition and reason, never chapter, so the type would ship with no caller. The mapping arrives with 2.0's detail view, which groups an onboarding site's state by chapter. |
| A cloud tripwire routine through the `schedule` skill | Task 24's alternative | A cloud agent reaches no operator's environment, keyring, registry, or installed binary. It becomes correct only once a hosted spine exists, so it is a 2.0 hand-forward conditional on that spine. |
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
| `health.Run` pure over its inputs, including an injected clock, options, and acknowledgements | 12 | 2.0's generation-counted refresh | The same record, clients, options, and acknowledgements with a fixed `now` produce a byte-identical report across two calls in one process. |
| `Options.OnCheck`, the per-check callback `health.Run` fires as each check settles | 12 | The HUD's per-site refresh, which paints a check's result the moment it lands rather than at the end of a sweep | A three-check run fires the callback three times, once per check id, in completion order, and a nil callback runs the sweep unchanged. |
| `ExitCode` over a slice of reports | 21 | The multi-site sweep's exit | The table covers a one-element slice, which is 1.0's only health caller, a zero-report call with `expectSites` mismatched, which is `sites`' only caller, and a three-element slice with mixed outcomes, which is 2.0's. |
| The pure render seam: `Render(RenderInput) Frame`, no I/O, no program | 20 | The HUD's screen render | A golden sweep over fixture, width, and profile, plus a test asserting the package imports none of `os`, `golang.org/x/term`, or a color-profile detection package, each forbidden by name as Task 20 states them, outside its profile-detection file. |
| The condition-to-remedy anchor map, re-homed out of `ui` | 20 | The HUD's detail view | Every anchor `Anchor` returns resolves to an actual heading in `docs/admin/is-it-working.md`, read at test time, and a second test covers the no-anchor branch. |
| `logs.Query`, `logs.Entry`, `logs.Fetch` shaped for both a printed list and a scrolling view | 17 | The HUD's scrolling log screen | `Fetch` returns entries newest-first, with `Entry.Fields` an ordered slice (never a map, whose iteration order would make any golden over it nondeterministic) whose values are unparsed `json.RawMessage`, so no renderer choice is baked into the fetch. |
| `spine.Discover`, `spine.Adopt`, `spine.AlreadyAdopted` as plain functions | 18 | The HUD's adopt dialog | `Discover` never writes, and adopting the same candidate twice yields one record. |
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
  the exit-code contract and stopped. Task 24 writes `tool/docs/tripwire.md` with a working
  example for a systemd user timer, a launchd LaunchAgent, and a Windows Task Scheduler task,
  each supplying the three credentials the way its own platform does and each capped in
  wall-clock time. Geoff's own timer is one installation of the systemd example, and its first
  unattended green run is that task's acceptance evidence.
- **Every action reachable from the shell.** Tasks 19a, 19b, and 20 own this. Task 22's acceptance
  includes a coverage assertion: the cobra tree carries exactly the 1.0 command and flag set, and
  the assertion is a test over the tree rather than a prose claim.
- **The 1.0 release, installable by anyone.** Task 22 tags `tool/v1.0.0`. Task 23 publishes a
  GitHub release carrying prebuilt binaries for linux, darwin, and windows on amd64 and arm64
  with a `SHA256SUMS` file, and proves `go install
  github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` from a clean machine. `make -C tool install`
  stays as the local convenience path, which is how Geoff's own binary lands at
  `~/.local/bin/cairn`.

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
- The spec's `--expect-sites N` sits on `health`. In 1.0 `health` takes one site, so the flag
  moves to `cairn sites --expect-sites N`, which is where a registry-level count belongs.
  `ExitCode` keeps the parameter.
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
  output width allows one.
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
- Each pass ends with the `cairn-pass` ritual and no release, except Task 22, which is the
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
| 13 | `src/lib/diagnostics/conditions.ts` | 262 lines; the condition id vocabulary the checks declare against. It carries no id for Serving, Delegation, Deploy, Behind, Engine, or an error count, which is why those checks declare `ConditionNone`. **It carries exactly one `edge.` id, `edge.https-not-forced`; there is no `edge.hsts-off`** (re-verified 2026-09-20 at HEAD), which is why Task 14's HSTS half declares `ConditionNone` too | Tasks 8, 12, 13, 20 | Verified 2026-09-14 post-polish-C |
| 14 | `src/lib/log/events.ts` | 98 lines; polish-C Tasks 10 and 11 renamed eight event strings in this union | Tasks 17, 21 | Verified 2026-09-14 post-polish-C (changed) |
| 15 | `docs/reference/log-events.md` | 111 lines; the engine's event table, which `logs --event` completion and the tool's own event reference both read. Fourteen or more events carry an editor email, which is why Task 17's fixture is synthesized rather than captured | Tasks 17, 21 | Verified 2026-09-14 post-polish-C |
| 16 | `docs/admin/is-it-working.md` | Headings present today include `## Force HTTPS at the edge` (`:164`), `## Turn on observability` (`:256`), `## Onboard the sending domain` (`:216`), `## Install the GitHub App` (`:413`). No heading covers Serving, Delegation, Deploy, Behind, Engine, or an error count | Task 20 remedy map | Verified 2026-09-14 post-polish-C |
| 17 | `docs/admin/troubleshooting.md` | Exists; polish-C Tasks 10 and 11 edited it wherever it names a renamed event | Task 24 | Verified 2026-09-14 post-polish-C |
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
| 28 | `packages/create-cairn-site/src/cloudflare/records.mjs:36-47` | The DMARC-is-TXT expectation and the named DKIM selector set Task 14's Email check ports | Task 14 | Verified 2026-09-14 post-polish-C |
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

**Outside the brief, recorded for the owner rather than taken here.** One item, and it is not a task
in this plan; it is a question for Geoff at a checkpoint or after the pass.

- **An `edge.hsts-off` condition id in the engine's conditions vocabulary.** Task 14's HSTS half
  wants one and `src/lib/diagnostics/conditions.ts` has none (re-verified 2026-09-20 at HEAD: the
  file carries `edge.https-not-forced` and no other `edge.` id). B1 does not add a condition id to
  the engine; the HSTS half declares `spine.ConditionNone` instead.

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
    provider; the Cloudflare-only pieces (`APIError`, `classifyReason`, `v4Error`, `resultInfo`,
    `v4Envelope`) move beside the Cloudflare envelope they describe. A test asserts `errors.go`
    names no Cloudflare-specific type.
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

**Produces:** `type Clients struct{ CF *providers.Cloudflare; GH *providers.GitHub; NPM
*providers.NPM; Probe *providers.Probe; HaveCF, HaveGH, HaveBuilds bool; CFFrom, GHFrom string }`,
where the two `From` fields name the provider each credential resolved through. `type Check
interface{ ID() string; Condition() spine.Condition; Needs() Tier; Run(ctx, record.Record,
Clients, Options) spine.Outcome }` with `Tier` one of `TierNone`, `TierCF`, `TierGH`,
`TierBoth`. `type Options struct{ ErrorThreshold int; LogWindow time.Duration; OnCheck func(CheckResult) }`,
the tunables the CLI exposes as flags plus one optional per-check callback, passed to every run so no
threshold is a literal inside a check.
`Condition()` may return `spine.ConditionNone`; `Run` records it and the remedy line is omitted.
`type Report struct{ SchemaVersion int; Site string; Domain string; Checks []CheckResult;
Degraded bool; Acknowledged []string }`. `type CheckResult struct{ ID string; Condition
spine.Condition; Outcome spine.Outcome; CheckedAt time.Time; Tier Tier; Acknowledged bool;
AckExpires time.Time }`. `type Ack struct{ CheckID string; Expires time.Time }` and `type Acks
[]Ack` with `func (a Acks) Match(id string, now time.Time) (Ack, bool)`. `func (r Report)
JSON(verbose bool) ([]byte, error)`. `func Run(ctx, r record.Record, c Clients, checks []Check,
now func() time.Time, o Options, acks Acks) (Report, error)`. `var All []Check`, a literal slice whose
first member is the `creds` check and which Tasks 13 through 17 append to.

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
- **2.0 seam kept on purpose: `health.Run` pure over its inputs.** The injected `now` makes the
  report reproducible; a test asserts two calls with a fixed clock, the same options, and the
  same acknowledgements are byte-identical.
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
  filter runs over the whole `Report`, `Outcome.Detail` and every `Outcome.Fields` entry included,
  against an enumerated
  non-verbose allowlist: check id, condition, reason, counts, ages, states, and 7-character SHAs.
  Account ids, zone ids, worker names, repository slugs, build UUIDs, and full SHAs are
  verbose-only. A test marshals a fixture report whose detail carries a build UUID and a
  repository slug and asserts a non-verbose render contains neither.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 13: Serving and Delegation checks, the two ports

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/health/check_serving.go`, `check_serving_test.go`,
  `check_delegation.go`, `check_delegation_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

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
  its `p=` must not be `none`, with the policy quoted in the detail on a Failing; the SPF TXT on
  the sending subdomain must include Cloudflare's Email Sending include; the DKIM selector TXTs
  must resolve. Then, with a Cloudflare client, the zone's sending subdomain must be verified.
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
LastBuild BuildState; LastBuildSHA, MainSHA string; LastBuildAt time.Time; Behind bool }`, the
check's own internal value, **flattened into named entries on the outcome's ordered `Fields` rather
than carried as one struct**: `Fields` holds a key and a `json.RawMessage` per value, so a struct
placed in one entry would render as one opaque blob and Task 12's per-field non-verbose filter could
not reach inside it. The keys are enumerated here so the filter and the goldens have a fixed set:
`workerExists`, `buildsConnected`, `pushToDeploy`, `lastBuild`, `lastBuildSHA`, `mainSHA`,
`lastBuildAt`, and `behind`, in that order. `BuildState` is one of `BuildOK`, `BuildFailed`,
`BuildRunning`, `BuildNone`.

**Acceptance:**
- Worker absent is Failing. Builds not connected is Failing with
  `reason.api.builds-not-connected`, the 907-life outage shape: `BuildsConnections` returning an
  empty trigger list with no error, not a distinct API error code (a live probe on 2026-09-19
  found no such code; conductor ruling 2026-09-19). Tested with a handcrafted empty-list
  response, since the fixture corpus carries no captured body for this condition (conductor
  ruling 2026-09-19), not against the corpus body.
  A failed last build is Failing with the build id in the fields. Running is Unknown with
  `reason.park.builds-running`. OK with `MainSHA == LastBuildSHA` is OK. OK with differing SHAs
  is OK with `Behind: true`, because Behind is a state of this cell and not a separate check.
- The check declares `spine.ConditionNone`, per the spec's table marking it new.
- The build id, the repository slug, and the full SHAs are verbose-only, which
  Task 12's filter enforces per field. A test asserts a non-verbose render of a Failing deploy
  carries the build state and the 7-character SHAs and none of the eight entries' verbose-only
  values, and a second test asserts the eight keys appear in the order the Produces block lists.
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
  otherwise. The fields carry the branch count and ages.
- Engine parses the site's `package.json` on `main`, reads the `@glw907/cairn-cms` range, and
  compares it to the latest published version. The fields carry releases-behind and whether any
  skipped version's changelog section has a `Consumers must:` line, read from this repo's
  `CHANGELOG.md` through GitHub with the same token. Behind by one or more with a `Consumers
  must:` line is Failing; behind without one is OK with a detail; current is OK.
- Both checks read the repository of the site under test plus this engine's repository, which is
  the scope Task 10 states for the GitHub token and the scope its probe verifies against the
  operator's own registry. A test asserts a 403 maps to Unknown rather than OK, so a mis-scoped
  token is visible rather than silent. Geoff's five repositories in reconciliation row 30 are
  this pass's verification set.
- Both declare `spine.ConditionNone`.
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

**Produces:** `type Query struct{ Worker string; Since time.Duration; Event string; Limit int }`.
`type Entry struct{ At time.Time; Level string; Event string; Fields []Field }`, where `Field` is
`struct{ Key string; Value json.RawMessage }`. `func Fetch(ctx, cf *providers.Cloudflare, q
Query) ([]Entry, error)`. `func CountErrors(ctx, cf, worker, since) (int, error)`. A sentinel
`ErrObservabilityOff` mapped from the API's response when the Worker has no observability
dataset.

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
  `ErrObservabilityOff` is Unknown with condition `config.observability-off`.
- `--since` is clamped to the Workers Logs retention window Task 10's probe observed and
  `tool/docs/credentials.md` records. A request past retention would return a short window that
  reads clean, so the clamp is what keeps the count honest. The default window is 24 hours and
  reaches the check through `Options.LogWindow`. The clamp value is a named constant with the
  observed window in its doc comment, and the comment says an operator on a plan with a longer
  retention can raise it, which is the honest form of a measurement taken on one account.
- **`cairn logs` output carries editor emails, so `logs` is implicitly verbose and says so.**
  Fourteen or more engine events carry an editor's email per reconciliation row 15, and
  `Entry.Fields` is verbatim JSON, so the printed output holds personal data whatever the operator
  passed. `logs` therefore prints **the same not-safe-to-paste stderr notice `adopt list` gets** and
  is named in the global constraint beside it, rather than hiding fields behind `--verbose` and
  shipping a log reader that omits the field an operator opened it for. A test asserts the stderr
  notice on a `logs` run and that it goes to stderr, so `--json` on stdout stays machine-readable.
  Task 20's `tool/docs/reference/json-output.md` marks the log payload as carrying personal data.
- Event names are read against the engine's union per reconciliation row 14, after polish-C's
  renames, not before.
- Re-run Task 12's purity assertion over the now-complete `All` and record the run in the task
  report.
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

---

## Pass `cairn-tool-B2`: the CLI surface, the 1.0 cut, the release, and the tripwire

Nine tasks: 18, 19a, 19b, and 20 through 25. The pass ends with `cairn health --json` honest
against every site in a registry, `cairn` 1.0 released as a tag with six prebuilt binaries and a
working `go install`, and a documented scheduled run that alerts on a non-zero exit. The pass's own
verification is Geoff's four production sites, his installed binary, and his systemd timer's first
unattended firing.

**Ceiling 10M, checkpoint every four tasks** (after Task 20 and after Task 24). Both numbers are
the conductor's sizing of 2026-09-20. **Ceilings accepted by Geoff, 2026-09-20.** Splitting Task 19
into 19a and 19b redistributes that task's work rather
than adding any, so the ceiling is unchanged by the split.

**Segments.** Tasks 18, 19a, 19b | Tasks 20, 21 | Tasks 22, 23, 24 | Task 25. Every boundary sits
on a commit the gate proved green. The second segment carries two tasks rather than three because
Task 22 pushes the `tool/v1.0.0` tag, and an irreversible task opens a segment rather than sitting
inside one.

**Execution mode.** `pass-execute.js` with `cairn-implementer`, sequential, with the conductor's args
as the plan header states them (`gate: "make -C tool check"`, `gateLane: "light"`, `maxFix: 1`, no
`parallel`, and per task `gateTier: "docs"` plus the classifier-skip `notes` line). No task in this
pass is
independent of another: Tasks 19a, 19b, 20, and 21 all edit `tool/cmd/cairn/root.go` and
`tool/cmd/cairn/main.go`, which are the contended files; Task 18's functions are what 19a's
`adopt` command calls; and Tasks 22, 23, and 24 are a strict chain, since the release fires on the
tag and the scheduled run is proved against an installed binary.

**CI-leg confirmation belongs to the conductor at a segment boundary, never to a task's own gate**,
the same rule B1 runs. The exceptions are the two tasks whose deliverable *is* a CI result: Task 22's
tag push, which waits on green by its own criterion, and Task 23's release job, which fires on that
tag. Everywhere else a task's gate is the local string and the conductor confirms the three `tool`
legs at the segment's final commit.

**Branch.** Its own feature worktree off `main`, after Task 17b's merge has landed. This is the
ordinary case.

**Gate.** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` for every task. Skip
`scripts/checks/gate-tier.mjs` by pinning `gateTier`, per the header's blockquote.

**Geoff's ruling 3 of 2026-09-20, the full grammar cleanup, governs this pass** and is restated in
the tasks that implement it: `cairn sites list` with bare `cairn sites` as an alias; `adopt list`
as a distinct non-writing subcommand replacing the `adopt --list` mode flag; the hidden
`probe-token` becomes `auth probe`; and `auth unset` is added so a rotated token's stale keyring
entry can be cleared. `health <site>` and `adopt` keep their shape.

### Task 18: `adopt`

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/spine/adopt.go`, `adopt_test.go`

**Produces:** `type Candidate struct{ Worker, Repo, Zone, AccountID string; Connected bool }`.
`func Discover(ctx, cf *providers.Cloudflare, gh *providers.GitHub, accountID string)
([]Candidate, error)`. `func Adopt(st *store.Store, c Candidate, name string, resolve
providers.Resolver) (record.Record, error)` writing step `live`, `adopted: true`, no secrets, and
a fresh id in the Node shape. `func AlreadyAdopted(st *store.Store, c Candidate) bool` by worker
name. `func List(ctx, cf, gh, accountID string) ([]Candidate, error)`, or `Discover` called
directly by the command: either way **`adopt list` is a plain non-writing function over
`Discover`**, not a mode flag threaded through the adopt path (Geoff, 2026-09-20, ruling 3).

**Acceptance:**
- **2.0 seam kept on purpose: adopt as plain functions.** `Discover`, `Adopt`, and
  `AlreadyAdopted` are plain functions with no prompting and no printing, so 2.0's dialog calls
  exactly what 1.0's flags call. A test asserts `Discover` performs no write.
- **The listing path performs no write at all,** and a test proves it against a store whose
  directory is read-only: `adopt list`'s function returns candidates and the directory's mtime is
  unchanged. The old `adopt --list` mode flag is not implemented here, because `adopt list` in
  Task 19a replaces it.
- `Discover` lists every Worker on the account and marks `Connected` from Builds. `Adopt` is
  refused for a candidate whose domain fails `record.ValidateDomain`.
- `Adopt` also refuses a candidate whose domain resolves into a private, link-local, or loopback
  range, using the injected `Resolver`. This is the spec's resolution check, and it lives here
  because `record.ValidateDomain` stays resolution-free. A table covers `10.0.0.0/8`,
  `169.254.0.0/16`, `127.0.0.0/8`, and a public address.
- Adopting the same candidate twice yields one record.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19a: The cobra tree, the grammar, and the signal path

**Task 19 was split into 19a and 19b in this re-cut, and here is the count that forced it.** The
original Task 19 carried about five deliverables (the subcommand set, the root's persistent
`--timeout`, the acknowledgement merge, the two grep tests, and the `ErrExpectSites` wiring). The
2026-09-20 CLI audit added eleven more: the grammar cleanup, shell completions in three forms, the
four reserved short flags, `-q/--quiet`, `signal.NotifyContext`, the stdin path for `auth set`, the
injectable prompt stream, `--ack-file`, an `Example:` on every command, `discoverSites` moving into
`store`, and a dependencies struct for the probe command's five constructor parameters. Sixteen
deliverables in one task is four times this workstation's rough ceiling of four, so the plan splits
it rather than leaving the split to a dispatch. 19a is the tree, its grammar, and the process-level
behavior; 19b is the acknowledgement surface, the credential input paths, and the completions.
**19a's own deliverable count is nine.** Invoke `go-conventions` before writing any Go file and
`golang-spf13-cobra` before any `cmd/cairn` file.

**Files:**
- Create: `tool/cmd/cairn/sites.go`, `health.go`, `logs.go`, `adopt.go`, `root_test.go`,
  `sites_test.go`, `health_test.go`, `logs_test.go`, `adopt_test.go`
- Create: `tool/internal/store/discover.go`, `discover_test.go`
- Modify: `tool/cmd/cairn/root.go` (attach the subcommands, the persistent flags, the signal
  context), `tool/cmd/cairn/main.go` (build the root, print the error, call `os.Exit`),
  `tool/cmd/cairn/auth.go` and `auth_test.go` (the renamed `auth probe`, the new `auth unset`),
  `tool/cmd/cairn/probe_token.go` and `probe_token_test.go` (re-homed under `auth probe`, and the
  dependencies struct), `tool/cmd/cairn/env.go` and `env_test.go`

**Produces:** the command tree under the 2026-09-20 grammar: `sites list [--json]
[--expect-sites N]` with bare `sites` as an alias for it; `health <site> [--json] [--verbose]
[--error-threshold N] [--since]`; `logs <site> [--event] [--since] [--json]`; `adopt [--worker
NAME [--repo SLUG]]` and `adopt list [--json]`; and `auth set <name>`, `auth list`, `auth unset
<name>`, and `auth probe`. Persistent flags on the root: `--timeout`, setting the whole run's
wall-clock deadline at a default of 120 seconds, from which every command derives its context;
`--verbose`; `--quiet`; and `--color=auto|always|never`. `sites list` returns a sentinel
`ErrExpectSites` on a count mismatch, which Task 21's `ExitCode` maps to UNKNOWN; the mapping is
defined once, in `ExitCode`.

**Acceptance:**
1. **The grammar is the 2026-09-20 ruling's, exactly** (Geoff, ruling 3). `cairn sites list` is
   the command and bare `cairn sites` is an alias for it, so a registry-level noun carries a verb
   like every other. `adopt list` is its own non-writing subcommand over Task 18's `Discover`, and
   no `--list` mode flag exists on `adopt`; a test asserts `adopt --list` is rejected as an unknown
   flag rather than silently accepted. `health <site>` and `adopt` keep the shape they had. Tests
   assert each command and alias resolves, and that the old `probe-token` top-level name no longer
   resolves.
2. **`probe-token` becomes `auth probe`,** keeping its behavior and its hidden status decision
   restated: it stays hidden, because it is a credential-minting aid rather than an operator verb.
   Its existing tests move with it and pass unchanged but for the command path.
3. **`auth unset <name>` is added,** deleting the keyring entry for one of the three variable
   names so a rotated token's stale entry can be cleared. It accepts only the three names, it
   never prints a value, and unsetting a name the keyring does not hold is success with a message
   saying so rather than an error.
   - **The keyring write and delete share the read path's deadline.** A keyring backend can hang, on
     a locked login keyring or an unresponsive D-Bus service, and a `set` or `unset` that hangs
     forever is worse than one that fails: the operator has no output and no exit code. So the write
     and the delete derive their context from the same deadline `secrets`' read path already uses,
     and a test with a stub backend that blocks asserts each returns by the deadline with a non-zero
     exit rather than hanging.
   - **A backend that cannot be reached is a distinct non-zero outcome, separate from not-found, and
     it names the environment-variable fallback.** Not-found is success with a message, per above;
     unavailable is a failure whose message says the keyring could not be reached and that the
     variable can be set in the environment instead, because that is the one thing the operator can
     do next. Conflating the two would tell an operator with a locked keyring that their credential
     was already gone.
   - A table covers four rows: a present entry, an absent entry, an unavailable backend, and a name
     outside the known set.
4. The cobra shape follows `go-conventions` and `golang-spf13-cobra`: `SilenceUsage: true`, flags
   in a struct rather than loose variables, `RunE` returning an error, and `main` as the only
   place that prints an error and calls `os.Exit`. Every write to standard output and standard
   error goes through one writer obtained from a single helper in `main.go`, so Task 21 can wrap
   it in the scrubber in one place.
5. **The four reserved short flags are reserved and not bound to anything else:** `-v`, `-t`,
   `-V`, and `-q`. The Monitoring Plugins development guidelines reserve them, and this tool
   adopts that convention because its exit codes already follow the same family. In 1.0 `-v` is
   `--verbose`, `-t` is `--timeout`, `-V` is `--version`, and `-q` is `--quiet`. A test walks
   every command's flag set and asserts no other long flag claims any of the four shorthands, so a
   later command cannot take one.
6. **`-q/--quiet` prints only on a non-OK result.** On a run whose verdict is OK it writes nothing
   at all to stdout or stderr and still exits 0; on WARNING, CRITICAL, or UNKNOWN it prints the
   verdict line and the failing detail. A test asserts byte-empty output on the OK path, which is
   what makes a cron-driven green run silent and mail-free. `--quiet` and `--verbose` together is
   a usage error naming both.
7. **`signal.NotifyContext` covers SIGINT and SIGTERM on the root context,** and a cancelled run
   exits UNKNOWN. A test sends the signal to a command blocked on a stub client and asserts the
   exit code and that the command returns rather than being killed. **That test guards on
   `runtime.GOOS` rather than on a build tag**, because `go-conventions` forbids build tags and the
   GOOS-suffix mechanism would put one assertion in three files. Windows has no SIGTERM and delivers
   SIGINT differently, so on Windows the same behavior is proved by **cancelling the root context
   directly** and asserting the command returns with the same code. Exit 3 is asserted on both
   paths, so no platform is left proving the behavior only by omission. This also fixes Ctrl-C during
   an echo-off credential prompt leaving the terminal's echo off, because the prompt's restore now
   runs on the cancellation path; a test asserts the restore function is called when the context
   cancels mid-prompt.
8. **Every command carries an `Example:`.** A test walks the tree and asserts each command,
   including each `auth` subcommand and each alias's target, has a non-empty `Example` whose first
   line begins with `cairn `. No example puts a credential value on a command line.
9. **`discoverSites` moves into `store`** as the one registry query every command shares. Today it
   is a private function in `tool/cmd/cairn/probe_token.go` (at `:256` on the branch as this was
   written), so the one command that needed it owns it and `health`, `logs`, and the completions
   would each grow their own copy. After this task it lives in `tool/internal/store/discover.go`
   and `cmd/cairn` holds no registry walk of its own. A grep test asserts no file under
   `cmd/cairn` calls `store.Open` followed by `List` directly. `auth probe`'s repository discovery
   reads through the moved function and its existing registry tests pass unchanged.
10. **The probe command's five constructor parameters become one dependencies struct.**
    `buildProbeTokenCmd(envFn, p, rt, registryDir, exit)` becomes one struct parameter, so a sixth
    dependency is a field rather than a signature break across every test. Its existing tests pass
    with the struct substituted.
11. Bare `cairn` prints help and exits OK, unconditionally, on a pipe and on a terminal alike. A
    test asserts the help text on a pipe. **There is no TTY launch predicate**: `shouldLaunchTUI`
    is 2.0's, and a test asserts no file under `tool/` defines or calls it.
12. **The one permitted TTY check** (Geoff, 2026-09-20, ruling 1). The module-wide ban on
    `term.IsTerminal` and `os.Stdout.Stat()` was written to keep a dead TUI launch gate out of
    1.0, and that reason does not reach color. Exactly one TTY check is allowed, in the `render`
    package's profile-detection file (Task 20) and nowhere else. This task's grep test therefore
    forbids `term.IsTerminal` and `os.Stdout.Stat()` everywhere under `tool/` **except** that one
    file, and allows `term.ReadPassword` in `auth.go` alone. Reading a secret with echo off is not
    a TTY predicate. **Note for the executor: this grep test does not exist yet.** Pass A's Task 9
    acceptance text claimed "the grep test Task 19 carries", and Pass A shipped no such test; the
    only chokepoint grep on the branch today is `TestOSGetenvOnlyInEnvGo`
    (`tool/cmd/cairn/env_test.go:182`). So this task creates the test, narrowed from the start
    rather than narrowing an existing one. Falsify it: add `term.IsTerminal` to a second file,
    confirm the failure names that file, remove it.
13. `sites list --json` carries each site's id from `store.Entry.ID`, and `health <id>` resolves
    by id. A record that failed to parse is reported by id on standard error and counted toward
    the exit code, never dropped silently.
14. `sites list` computes its exit code through `ExitCode(nil, listErrs, expectSites)`: UNKNOWN
    when the registry is empty, when any record failed to parse, or when `--expect-sites N` does
    not match the count, and OK otherwise. Each of the three is a case where the tool cannot say
    whether the sites are healthy, which is what UNKNOWN means. A test covers all three.
15. `sites list --verbose` prints the registry directory it read and the `store.Source` that chose
    it. This is `Source`'s 1.0 caller, which is why `Source` stays exported.
16. **`sites list` ignores the resolved acknowledgement-file path when it lists the registry
    directory.** Task 19b's `--ack-file` default puts `acknowledgements.json` inside that same
    directory, so the listing walks past it. `store.List` already skips a filename stem that fails
    `record.ValidateSiteID`, which covers the default name, but the check is on the **resolved
    path** rather than on that name, so an operator who passes `--ack-file` pointing at a
    differently named file inside the registry directory does not see it reported as a malformed
    record and counted toward UNKNOWN. A test puts an ack file with a site-id-shaped stem in the
    registry directory, passes it as `--ack-file`, and asserts the listing reports the real sites
    only and exits OK.
17. A report carrying `degraded: true` exits WARNING, which is 1, with no flag to ask for it. The
    spec's `--require-credentials` is dropped: a scheduled routine alerts on any non-zero exit, and
    WARNING is what a human reads at a prompt. Task 21 holds the mapping.
18. `--timeout` caps the whole run. A test with a stub client that blocks asserts the command
    returns by the deadline with UNKNOWN rather than hanging. This is the cap every scheduler
    example in Task 24 inherits, which is why it lives in the binary rather than in one platform's
    unit file.
19. `health` requires a site argument and errors with a usage-free message naming `cairn sites
    list` when the argument is missing. The multi-site sweep is 2.0.
20. `adopt list` prints candidates as JSON, preceded by a stderr line saying the output is not
    safe to paste. It is one of the **two** implicitly verbose commands, per the global constraint;
    `logs` is the other, because its entries carry editor emails, and Task 17 gives it the same
    notice. A test asserts both commands emit that line and that no other command does.
    `adopt --worker X` adopts without a prompt.
21. No command reads an environment variable except through `loadEnv`, and no command reads the
    keyring except through `secrets`. `TestOSGetenvOnlyInEnvGo` still passes over the grown
    package. This holds because Task 9 created the chokepoint before any command needed it.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 19b: Acknowledgements, the non-interactive credential path, and completions

The second half of the split Task 19. **Deliverable count: three groups**, seven items. Invoke
`go-conventions` before writing any Go file and `golang-spf13-cobra` before any `cmd/cairn` file.

**Files:**
- Create: `tool/cmd/cairn/ack.go`, `ack_test.go`, `tool/cmd/cairn/completion_test.go`
- Modify: `tool/cmd/cairn/health.go`, `logs.go`, `root.go`, `auth.go`, `auth_test.go`
- Modify: `tool/docs/credentials.md` (the stdin form for `auth set`)

**Acceptance, the acknowledgement surface:**
1. **The acknowledgement list is a documented product feature, not a wrapper's array.** `--ack
   <check-id>=<YYYY-MM-DD>` is repeatable on `health`, and the same entries can live in a JSON file
   the registry directory holds, which needs no new path resolution: `store.Dir` already names the
   directory, and `store.List` already skips a filename stem that fails `record.ValidateSiteID`,
   so the file cannot be read as a site. Flag entries and file entries merge, with the flag winning
   on the same check id. A malformed date is an error naming the entry, never a silently ignored
   acknowledgement. An entry with no expiry date is refused, so no acknowledgement outlives its
   author's attention. A test covers a merge, a conflict, an expired entry, and a malformed one.
2. **`--ack-file` names that file, and its default path is documented.** The default is
   `acknowledgements.json` inside the registry directory `store.Dir` resolves, and the default is
   stated in the flag's own help text, in `tool/docs/reference/exit-codes.md`, and in
   `tool/docs/tripwire.md` at Task 24. A missing file at the default path is not an error, since
   most operators have none; a missing file at an explicitly passed `--ack-file` path is an error,
   since the operator named it. A test covers both.
3. An acknowledged check reads as acknowledged in the report and in the exit code, through Task
   12's `Acks` and Task 21's `ExitCode`. This task wires the flags to those; it re-implements
   neither.

**Acceptance, the non-interactive credential path:**
4. **`auth set <name>` reads from stdin when stdin is not a terminal.** The detection is an error
   fallback on the echo-off read, not a TTY query: the command attempts the echo-off prompt, and on
   the error a non-terminal stdin produces it reads one line from stdin instead. This keeps ruling
   1's one-TTY-check promise, since no second predicate is introduced. The documented form is
   `printf %s "$v" | cairn auth set NAME`, stated in `tool/docs/credentials.md` beside the caution
   that a value typed at an interactive prompt can reach shell history and a value in a pipeline
   can reach a process listing. **A trailing `\r\n` is stripped as well as a trailing `\n`**, since
   Windows is a product platform and a value piped from a PowerShell or `cmd` pipeline arrives with
   the carriage return; a credential stored with a stray `\r` fails every request with no visible
   cause. A test proves it on a CRLF fixture as well as an LF one. An empty value is an error; the
   value never appears in output. A test drives both paths with a fake prompt that returns the
   no-terminal error and a stdin buffer.
5. **The prompt reads from an injectable stream,** so the echo-off path is testable without a pty
   and the stdin path is testable without a pipe. The injection is a field on the command's
   dependencies, not a package-level variable. A test asserts the default wiring reads the
   process's own stdin.

**Acceptance, shell completions:**
6. **Cobra's default `completion` command is kept, not suppressed.** Cobra generates bash, zsh,
   fish, and PowerShell scripts for free, which is the whole reason to keep it: hand-rolling four
   is exactly the bespoke mechanism the conventions rule out. A test asserts the `completion`
   command is present and not hidden, and Task 22's command-set assertion expects it.
7. **Three completions are wired:** a `ValidArgsFunction` over the registry's site ids for
   `health`'s and `logs`'s positional argument, reading through the `store` function Task 19a
   moved; and a flag completion for `logs --event` over the engine's event vocabulary.
   Reconciliation row 15 already assumes the `--event` completion exists and no task produced it,
   which is the hole this closes. **The vocabulary is a Go literal slice in the tool**, not a value
   read from the engine's TypeScript at build time: `go-conventions` forbids code generation, the
   module builds with no repository present (Task 1's criterion), and a `go install` build reaches no
   `src/lib` tree at all. The existing drift test from reconciliation row 14 is what keeps the slice
   honest: **it asserts at test time that the literal matches the union in
   `src/lib/log/events.ts`**, so an engine-side rename fails the Go suite and the completion cannot
   list an event the engine does not emit. Tests
   call each completion function directly against a fixture registry and a fixture vocabulary and
   assert the candidate lists, with the no-registry and no-match cases covered.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 20: The `render` package, the pure seam, the profile enum, and the remedy map

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/render/render.go`, `render_test.go`, `profile.go`, `profile_test.go`,
  `glyph.go`, `glyph_test.go`, `remedy.go`, `remedy_test.go`, `testdata/golden/`, `fixtures/`
- Create: `tool/docs/reference/json-output.md`
- Modify: `tool/Makefile` (a `golden` target), `tool/cmd/cairn/health.go`,
  `tool/cmd/cairn/sites.go`, `tool/cmd/cairn/logs.go` (print through the seam),
  `tool/cmd/cairn/root.go` (the `--width` flag)

**Produces:** `type RenderInput struct{ View ViewID; Width int; Height int; Dark bool; Profile
Profile; Reports []health.Report; Entries []logs.Entry; Status StatusState; Verdict Verdict; Now
time.Time }`, where `Verdict` is a typed int whose constants are the four exit codes themselves
(`VerdictOK` 0, `VerdictWarning` 1, `VerdictCritical` 2, `VerdictUnknown` 3) with a `String`
returning the monitoring word. `cmd/cairn` builds it from `ExitCode`'s return value, so the word
cannot drift from the code. `type Profile int` with the full enum `ProfileTrueColor`,
`ProfileANSI16`, and `ProfileNoColor`. `type Frame struct{ Lines []string }`. `func Render(in
RenderInput) Frame` with no I/O. `type StatusState struct{ UpdatedAt time.Time; Missing
[]providers.Missing; CFOK, GHOK bool; CFFrom, GHFrom string; GHExpiry time.Time }`. `func
Anchor(spine.Condition) (string, bool)` mapping a condition to its `docs/admin/is-it-working.md`
heading anchor. A glyph set for ok, failing, unknown, and running at a Unicode and an ASCII tier,
with the ASCII tier `+ ! ? ~`.

**Acceptance, the profile and the one TTY check:**
1. **The profile-detection file holds the module's one TTY check** (Geoff, 2026-09-20, ruling 1).
   `profile.go` is that file and nowhere else is. Detection order: `NO_COLOR`, present and
   non-empty, means no color; `--color=never` means no color and `--color=always` means color
   regardless of the terminal; `--color=auto`, the default, falls through to the terminal check;
   `TERM=dumb` means no color; a non-TTY stdout means no color. A table covers every combination
   of the three inputs. Task 19a's grep test allows `term.IsTerminal` in this file alone, and a
   test asserts the file is the only one that names it.
2. **`loadEnv` carries `NO_COLOR` and `TERM`,** because `loadEnv` is the only code in the module
   that reads the environment and `TestOSGetenvOnlyInEnvGo` enforces that. They are not
   credentials, so they are not resolved through a `secrets.Provider` and they carry no `Missing`
   entry; `loadEnv` returns them as plain values beside the credential resolutions. A test asserts
   the two names are read and that neither appears in any credential path.
3. **`Profile` is the full three-value enum,** truecolor, ANSI-16, and no-color, not a boolean.
   The cost of the third value is golden-corpus files, and this is the task that creates the
   corpus, so taking it now is cheaper than adding a profile after the corpus exists.
4. **`RenderInput` gains `Height` and `Dark`.** `Height` is what a scrolling 2.0 view needs and
   what a log view already wants for a page size; `Dark` is what a light-terminal operator needs.
   Both are inputs, never detected inside `Render`, which is what keeps the seam pure. A golden
   covers one non-default `Height` and both `Dark` values.
5. **The default render width is 80 when none is passed,** and `--width` on the root overrides it.
   A test asserts `Render` with a zero `Width` renders identically to `Width: 80`. `--width` joins
   Task 22's flag assertion.
6. **The glyph tier is ruled here, not guessed.** The Unicode tier is the default; the ASCII tier
   `+ ! ? ~` is selected when the profile is no-color or when `TERM` is `dumb`, on the reading that
   a terminal that cannot color is the terminal least likely to render the glyphs. A table covers
   the selection. No task in this plan widens the glyph set: the full poplar `theme` port is 2.0
   (conductor ruling, 2026-09-14).
7. **Windows virtual-terminal handling is ruled here.** On Windows the detection additionally
   requires that virtual-terminal processing be enabled, since a console without it renders an
   escape sequence literally, which is worse than no color. The mechanism is the same
   `x/sys/windows` dependency Task 5 already took, so no new dependency is added. The Windows CI
   leg asserts the detection's result rather than skipping, and the task report records which
   branch that leg took.

**Acceptance, the seam and the goldens:**
8. **2.0 seam kept on purpose: the pure render seam.** `Render` runs no program, performs no I/O,
   and reads no environment. **The purity test names its forbidden imports** rather than the
   category "any terminal package": `os`, `golang.org/x/term`, and any color-profile detection
   package, each named, outside `profile.go`. Naming them is what lets a later pure lipgloss v2
   import land without tripping the test, which a category match would have blocked. The golden
   sweep runs with no process spawned. 2.0's HUD mounts on this function rather than replacing it.
9. The golden sweep covers widths 80, 120, and 160, all three profiles, and the
   fixtures empty, all-unknown, degraded, offline, one-sick, and healthy, for the site list, the
   single-site health view, and the log view. `go test` fails on drift and on an orphan file.
   `make -C tool golden` regenerates. Line endings normalize to `\n` before comparison.
10. Never-color-alone gate: a test strips ANSI from each no-color render and asserts every state
    word appearing in the color render at the same width also appears here, scoped to widths at or
    above 120. At width 80 the states render glyph-only, which satisfies the rule because the three
    glyphs are distinct rather than one glyph in three colors. Falsify by rendering one state as
    color-only and confirming the failure.
11. `health` and `sites list` print a status line from `StatusState` above their output: the render
    time, each missing credential by variable name with the check ids it disables, the provider
    each present credential resolved through, the GitHub token expiry date, and `degraded` when
    set. An acknowledged check renders with its expiry date beside it, so an acknowledgement is
    visible in the output and not only in the exit code. This is where the spec's
    missing-credential disclosure lands, so a `StatusState` field is never produced without a
    printed consumer. A golden covers the degraded fixture at all three widths, and a test asserts
    an absent `CAIRN_GH_READ_TOKEN` names the check ids it disables.
12. The health view leads with a verdict line whose first word is the run's status, `OK`,
    `WARNING`, `CRITICAL`, or `UNKNOWN`, the way a monitoring plugin's output reads, followed by
    the site and the counts. The word comes from `Verdict.String()`, and `Verdict` is `ExitCode`'s
    own return value widened to a type, so an operator reading the line and a routine reading the
    code cannot disagree. A test in `cmd/cairn` renders a report and asserts the printed first word
    against the exit code for all four values.
13. The view then carries a "do this next" line with the worst failing check's id, its condition
    id when it has one, and its remedy anchor when `Anchor` returns one. "Worst" is
    `spine.State.Severity()` from Task 11b-ii, the module's one severity order, not a local
    comparison. When `Anchor` returns false the line names the check and says no remedy page
    covers it yet. A test asserts that branch for the Deploy check, which is one of the six check
    families `docs/admin/is-it-working.md` has no heading for per reconciliation row 16.
14. **2.0 seam kept on purpose: the remedy map, re-homed out of `ui`.** Every anchor `Anchor`
    returns resolves to an actual heading in `docs/admin/is-it-working.md`, read at test time
    through `providers.RepoRoot`, so the map cannot drift from the page. The old plan put this map
    in the TUI's `remedy.go`; 1.0 needs it because `cairn health` prints the line, and 2.0's detail
    view reads the same function.

**Acceptance, the JSON contract:**
15. **`--json` output gets a documented shape, a `schemaVersion`, and a golden.**
    `tool/docs/reference/json-output.md` documents the shape of each `--json` payload, one section
    per command (`sites list`, `health`, `logs`, `adopt list`), with every field named and every
    field marked verbose-only or always-present. Each payload carries a `schemaVersion` integer,
    and the doc states that a field is only ever added within a version, never removed or retyped.
    A golden covers each payload from a fixture, so a shape change is a visible diff rather than a
    silent break for whatever script reads it. A test asserts the doc names every field the golden
    contains, so the doc cannot drift from the output. **The `logs` section marks the log payload as
    carrying personal data**, naming the editor email the engine's events write, so a reader piping
    it somewhere knows what they are moving; Task 17 carries the matching stderr notice on the
    command itself.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 21: The monitoring exit codes, the error surface, and the scrubbing chokepoint

Invoke `go-conventions` before writing any Go file.

**Files:**
- Create: `tool/internal/logx/logx.go`, `logx_test.go`, `tool/cmd/cairn/exit.go`, `exit_test.go`
- Create: `tool/docs/reference/log-events.md`, `tool/docs/reference/exit-codes.md`
- Modify: `tool/cmd/cairn/main.go` (wrap the output writers, map the exit code),
  `tool/cmd/cairn/root.go` (the flag error function), `tool/cmd/cairn/auth.go` (the typed coded
  error)

**Produces:** `func ExitCode(reports []health.Report, listErrs []error, expectSites int) int`
returning a monitoring-plugin code. `logx.New(w io.Writer, scrub []providers.Credential)` whose
every write runs the scrub last.

**Acceptance:**
- **2.0 seam kept on purpose: `ExitCode` over a slice.** The signature takes a slice of reports,
  which 1.0 always calls with one element and 2.0 calls with many. The table covers a
  one-element slice, a zero-report call with `expectSites` mismatched, which is `sites list`'s only
  caller, and a three-report row with mixed outcomes, which asserts the precedence rule holds
  across sites.
- **The codes are the monitoring-plugin convention** (Geoff, 2026-09-14), which Nagios and every
  alerting tool compatible with it already reads, so an operator wires `cairn health` into what
  they already run rather than teaching it a private table. 0 is OK: every check is ok. 1 is
  WARNING: the run is degraded by a credential the operator has not configured, or a failing
  check carries an unexpired acknowledgement, with `degraded: true` or the acknowledged ids in
  the report either way. 2 is CRITICAL: any check is failing and unacknowledged. 3 is UNKNOWN:
  any check is unknown for a transport reason, a revoked or expired token, an empty site set, a
  record that failed to parse, an `--expect-sites` mismatch, or a tool fault.
- **Precedence, stated because a run mixes states.** CRITICAL beats UNKNOWN, UNKNOWN beats
  WARNING, and WARNING beats OK. A failing check is a known fault and must not be masked by an
  unrelated transport unknown. An unknown outranks a warning because an unknown hides a possible
  fault while a warning is a disclosed and accepted one. The table covers one row per pairing.
  The ordering agrees with `spine.State.Severity()` where the two overlap, and a test asserts that
  agreement, so the module still holds one severity order per Task 11b-ii's hygiene test.
- **A usage error exits UNKNOWN, which is 3.** An unknown flag, a missing required argument, a
  malformed flag value, and an unknown subcommand all exit 3. This is stated in the task and in
  `exit-codes.md` as the monitoring convention chosen over `sysexits.h` on purpose: an operator's
  alerting already reads 3 as "the check could not run", which is exactly what a usage error
  means, and teaching a routine `sysexits.h`'s 64 alongside would be a second table for one case.
  **`--json` is a script's discriminator**: a usage error emits no JSON at all, so a script that
  parses stdout can tell a usage error from a check result without reading the exit code twice.
  Stated in `exit-codes.md` and asserted by a test that a usage error's stdout is empty.
- **`--help` and `--version` exit 0,** recorded in `exit-codes.md` as a deliberate deviation from
  the monitoring guidelines, which would have them exit 3. A human running `cairn --help` in a
  shell that reports `$?` should not see a failure, and no scheduled routine invokes either.
- **Errors print with a `cairn: ` prefix** on stderr, one line, never a Go stack and never a
  wrapped chain's full text where the outer message already says it. A test asserts the prefix on
  each of a usage error, a command error, and a tool fault.
- **`SetFlagErrorFunc` appends a hint** naming the command's own help: "run 'cairn X --help'",
  with X the command path the error came from. A test asserts the hint names the subcommand rather
  than the root for a subcommand's flag error.
- **There are exactly two ways a process exit code is decided, and they cannot collide.**
  `ExitCode(reports, listErrs, expectSites)` decides the code for a run that produced a report.
  Everything that produced no report is a **typed error that `main` maps to a code**: a cancelled
  run, a usage error, `auth probe`'s typed coded error, and a tool fault. The two paths cannot
  disagree because `ExitCode` has no notion of any of them: its inputs are reports, list errors, and
  an expected count, and none of the four can be expressed in those. A test asserts each of the four
  typed errors reaches its code through `main` without `ExitCode` being called, and the table in
  `exit-codes.md` states the split so a reader does not go looking for cancellation in `ExitCode`'s
  table.
- **`auth probe` returns a typed coded error that `main` maps,** which is one of those four. Today
  the probe command takes an `exit func(int)` and calls it itself, which is a third path. After
  this task `main` is the only caller of `os.Exit`, and **the writer grep extends to `os.Exit`**:
  the test that allows `os.Stdout` and `os.Stderr` only in `main.go` also allows `os.Exit` only
  there. Falsify by adding an `os.Exit` to another file, confirm the failure names it, remove it.
- **The per-request versus whole-run timeout arithmetic is stated** in `exit-codes.md`, so an
  operator can size a scheduler's own cap: each request is bounded at 15 seconds, a check makes at
  most a named number of requests, the run's `--timeout` default of 120 seconds bounds the whole
  command, and a scheduler's cap (systemd's `RuntimeMaxSec`, Task Scheduler's `/ET`) should sit
  above `--timeout` with headroom rather than below it, since a scheduler that kills the process
  first produces no exit code the routine can read. The doc states the arithmetic with the numbers
  rather than the rule alone. **A test asserts the arithmetic closes**: the sum over the checks of
  each check's published maximum request count, times the 15 s per-request timeout, fits within the
  default `--timeout`. The per-check counts the test reads are the ones `exit-codes.md` publishes, so
  the doc and the test cannot drift, and a later check that adds requests fails the test rather than
  silently making the default unreachable. **If the arithmetic does not fit at the default of 120
  seconds, this task states the default it chooses instead and why**, rather than shipping a default
  a full sweep cannot finish inside.
- **Under `--verbose` only, one stderr line per check as it completes,** naming the check id and
  its outcome, so a run that takes a while is visibly progressing rather than apparently hung. **It
  reads through Task 12's `Options.OnCheck` callback**, which is why that callback is a parameter of
  the pure `health.Run` rather than a print inside it; without `--verbose` the callback is nil. It
  is stderr so it never mixes into `--json` on stdout. A test asserts the lines appear under
  `--verbose`, that there are none without it, and that stdout is unaffected either way.
- `render.Verdict` is this function's return value widened to a type, and Task 20's verdict line
  prints its word. A test asserts the four codes and the four words correspond, so the printed
  status and the exit code are one decision.
- `ErrExpectSites` is mapped here and nowhere else. Task 19a returns the sentinel; this function
  is the one definition of the code it becomes.
- **The two kinds of Unknown are disambiguated, and the report carries the discriminator.** An
  Unknown whose reason is a missing, unconfigured credential maps to **WARNING through `Degraded`**
  and is **excluded from the UNKNOWN trigger**: the operator has not configured a credential, which
  is a disclosed and accepted gap, and paging them with UNKNOWN every morning for it is what makes a
  routine ignorable. A **transport or any other Unknown still triggers UNKNOWN**, because that one
  hides a possible fault. `Degraded` is the discriminator and Task 12 sets it on exactly the
  cred-missing skip, so this function reads the report rather than re-deriving reasons. **A table
  covers three rows: a cred-missing Unknown alone, which is WARNING; a transport Unknown alone,
  which is UNKNOWN; and both together, which is UNKNOWN**, since precedence puts UNKNOWN above
  WARNING. This is the same intent as the `degraded: true` WARNING rule above and as Task 19a's
  criterion 17, and the wording in all three says `Degraded` rather than "an absent credential", so
  no reader has to decide whether the two sentences describe one rule or two.
- **An acknowledgement softens Failing only, never Unknown.** An unexpired acknowledgement on a
  Failing check moves that check from CRITICAL to WARNING. It has no effect on an Unknown: an
  acknowledgement is an operator saying "I know this is broken and I accept it for now", which they
  cannot say about a check that did not run. A table row covers an acknowledgement naming a check
  that came back Unknown and asserts the code is unchanged.
- A table test covers each code including every precedence pairing, the empty-state-directory
  case, an acknowledged failing check and the same check with an expired acknowledgement, and a
  report whose `creds` check is Failing on `reason.cred-expiring`, which is CRITICAL rather than
  WARNING or UNKNOWN: an expiring token is a fault the operator can fix before it lands.
- `main` wraps `os.Stdout` and `os.Stderr` in the scrubbing writer before any command runs, and
  registers all three credentials including the absent ones. `logx` is imported by `cmd/cairn`
  alone, per the architecture's downward order.
- **`main` recovers a panic, prints one scrubbed line through the same chokepoint, and exits 3.** A
  Go panic's default output is a stack trace written straight to the real `os.Stderr`, bypassing the
  scrubbing writer entirely, so a panic in a credential-carrying frame could print a token in a
  scheduler's log. Task 12 already recovers a panicking check; this covers everything outside a
  check. The printed line names the panic value's type and the command, never the value verbatim.
  A test panics with a sentinel-bearing value from a stub command and asserts exit 3, the sentinel
  absent from both streams, and no stack trace.
- **The scrubber ignores an empty credential and any credential shorter than a stated minimum
  length.** An empty registered value would make every write match everywhere, and a very short one
  would redact unrelated text: a two-character credential turns ordinary output into
  `<redacted>`-riddled noise, which is a worse failure than a missed redaction because it destroys
  the output an operator is reading. The minimum is a named constant with its reason in its doc
  comment, and a value below it is registered but never matched, with that skip recorded once on
  stderr under `--verbose` so it is not silent. Two tests: **an absent-credential run's output is
  byte-identical to a no-credential run**, and **a short sentinel does not redact unrelated text**
  that happens to contain it.
- Scrub test: a log line embedding a credential's plaintext is emitted with `<redacted>` in its
  place.
- The sentinel byte-level test: a record fixture with sentinel secrets passes through `sites list
  --json`, `health --json`, the logger, an error wrap, and `store.Save`. The sentinel appears only
  in the store file.
- `exit-codes.md` documents the contract for a routine: the four codes by name, the precedence
  rule, the acknowledgement flag's effect on the code, the usage-error and `--help` rulings above,
  and the fact that a scheduler starts with no shell profile, so the three credentials reach it
  the way Task 24's examples show for each platform. It states that the convention is the
  monitoring-plugin one and names it, so a reader can point an existing check plugin at the
  command with no translation. **It also records the positional-argument decision**: `health
  <site>` takes its site as an operand rather than as a flag, against the monitoring guidelines'
  preference for flags, because POSIX, clig.dev, `gh`, and `kubectl` all accept a primary operand
  and an operator's muscle memory is the stronger signal here.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit.

### Task 22: The 1.0 cut

Irreversible: this task pushes the `tool/v1.0.0` tag, which is why it opens a segment. Invoke
`go-conventions` before writing any Go file.

**Files:**
- Create: `tool/CHANGELOG.md`, `tool/README.md`
- Modify: `docs/STATUS.md` (the tool's installed version line)
- Modify: `tool/cmd/cairn/root_test.go` (the every-action coverage assertion, created in Task 19a)
- Modify: `tool/cmd/cairn/root.go` (cobra's `Version` field)

The cut comes before the release and the scheduled run. Task 23's release job fires on this
task's tag, and Task 24's documented run needs an installed binary and a populated registry to
verify against. A scheduled run written first could not be proved.

**Acceptance:**
- **Every action coverage assertion, under the renamed grammar.** A test over the cobra tree
  asserts the command set is exactly `sites list` (with bare `sites` as its alias), `health`,
  `logs`, `adopt`, `adopt list`, `auth set`, `auth list`, `auth unset`, the hidden `auth probe`,
  **plus cobra's own `completion` and `help`**, which the tree carries because Task 19b keeps them
  and which an assertion listing only the tool's own commands would fail on. Flags:
  the root's persistent `--timeout`, `--verbose`, `--quiet`, `--color`, and `--width`;
  `sites list{--json,--expect-sites}`; `health{--json,--verbose,--ack,--ack-file,--error-threshold,--since}`;
  `logs{--event,--since,--json}`; `adopt{--worker,--repo}`; and `adopt list{--json}`. A second
  assertion lists the verbs deliberately absent in 1.0: the TUI launch, the interactive adopt
  dialog, and any multi-site sweep. The 2026-08-20 spec names no machine-readable verb list, so the
  set is enumerated here rather than derived, which is what makes the gate a gate.
- **`--version` uses cobra's `Version` field** rather than a hand-rolled flag, and its output
  carries the tool version, the commit, the Go version it was built with, and `GOOS/GOARCH`. An
  operator filing a bug and an operator checking a binary's provenance both read that one line. A
  test asserts all four parts are present and that the version and commit come from
  `internal/version` rather than from a literal.
- **A man page is either added or declined on the record.** Cobra's `doc` generator produces one
  from the tree at no authoring cost, so the decision is whether to ship and install it. Decide in
  this task, implement or record the decision in `tool/CHANGELOG.md` and the task report, and if
  declined state the condition that would reopen it (a packager asking for one). **The task report
  names the decision and, where the man page was taken, the diff line that adds it**, so the
  decision is readable without inferring it from the absence of a change.
- `make -C tool install` builds and installs to `~/.local/bin/cairn` with mode 0755, matching
  poplar's Makefile, and `cairn --version` on the installed binary prints `1.0.0` plus the
  commit. That is the local path, and it is how this pass's own verification binary lands. The
  product's install paths are `go install` and the release binaries, which Task 23 proves.
- The installed binary prints a **`-dirty`** suffix when built from a modified tree. The suffix is
  `git describe`'s own, and `tool/Makefile` calls `git describe --tags --match 'tool/v*' --dirty
  --always` (verified 2026-09-20 at HEAD), which appends `-dirty` with a hyphen. Earlier drafts of
  this plan wrote `+dirty`, which no command produces. Falsify once:
  touch a source file, run `make -C tool install`, confirm the suffix, restore, reinstall,
  confirm it is gone. The task report records `go version` and the `GOOS/GOARCH` it built for.
- The tag is `tool/v1.0.0` on this task's commit, pushed after CI is green on all three legs. The
  tag prefix is the spec's. **The tag push is irreversible, and it makes B2's merge mode a hard
  constraint.** A published tag is what `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0`
  resolves, so the commit it names must stay reachable from `main` forever; a squash or a rebase at
  Task 25 would rewrite that commit and leave the tag pointing at an object no branch contains, which
  breaks `go install` for every operator and cannot be fixed without moving a published tag. So
  **Task 25 merges B2's PR as a true merge commit, never a squash and never a rebase**, and carries
  the assertion that proves it. No npm publish happens, and `package.json` is untouched. If Task 23,
  Task 24, or Task 25 changes code under `tool/`, the close records that the binary was
  reinstalled, and a `tool/v1.0.1` tag is cut only if the change is behavioral.
- `tool/CHANGELOG.md` opens with the `1.0.0` entry, listing the registry, the checks, the
  subcommands, the credential providers, the exit-code contract, and an explicit "not in 1.0"
  line naming the HUD and multi-site management.
- `tool/README.md` is written for an operator who has never seen this repository. It states the
  two install paths, `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` and a release
  binary; the three credentials with a pointer to `tool/docs/credentials.md` for each platform;
  the four exit codes by name; a pointer to `tool/docs/tripwire.md` for a scheduled run; and one
  sentence that 1.0 is the complete CLI and 2.0 adds the HUD. No sentence says the module is for
  one machine, and no example tells a reader to source a file only this workstation has. It
  additionally states three things a first-run operator otherwise discovers the hard way:
  **the registry precedence** (`CAIRN_STATE_DIR`, then the Node CLI's `~/.config/cairn/sites`
  when that directory exists, then `os.UserConfigDir` plus `cairn/sites`), first match wins and
  paths are never merged; **that removing the legacy directory is how an operator migrates** to
  the `UserConfigDir` path, which is optional in 1.0; and **that the tool makes no update check**
  and never contacts a release feed, so an operator upgrades deliberately.
- Brew, a Windows package channel, and the npm shim stay 2.0. A tag, a `go install` path, and
  release binaries are 1.0, per the 2026-09-14 ruling.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` plus a clean-clone CI run.
  Commit, then tag.

### Task 23: Release artifacts, attestation, and `go install` from a clean machine

The tag Task 22 pushed is the trigger. This task is split out of the cut because the cut's own
deliverable list was already at four, and because a release nobody can install is not a release.

**Files:**
- Modify: `.github/workflows/tool.yml` (the release job Task 1 wired, corrected against its
  first real run, plus the attestation step)
- Create: `tool/internal/providers/corpus_importer_test.go` (the assertion that the corpus
  resolver's file has no non-test importer)
- Modify: `tool/README.md` (the release table, the checksum verification line, and the attestation
  verification line)
- Modify: `tool/CHANGELOG.md` (the artifact list under `1.0.0`)

**Acceptance:**
- The release job fires on the `tool/v1.0.0` tag and attaches six binaries, linux, darwin, and
  windows on amd64 and arm64, each built with `-trimpath` and the same `-ldflags -X` stamping the
  `build` target uses, plus a `SHA256SUMS` file covering all six. The task report pastes the
  release's file list and the checksum file.
- **Build-provenance attestation covers the release artifacts,** through GitHub's own attestation
  action on the release job, and `tool/README.md` carries the one command that verifies it.
  **The release job's `permissions` block gains `id-token: write` and `attestations: write` beside
  the `contents: write` it already carries** (verified 2026-09-20: `.github/workflows/tool.yml`'s
  `release` job declares `contents: write` alone). Attestation mints a Sigstore identity token and
  writes an attestation to the repository's attestations store, so both are required and the step
  fails with a permissions error without them. Falsify the block once: remove one of the two,
  confirm the step fails naming the permission, restore it. The
  reason is stated in the README: a `SHA256SUMS` file published in the same release as the
  binaries it covers proves integrity, not authenticity, because whoever could replace a binary
  could replace the checksum beside it. Attestation binds the artifact to the workflow and the
  commit that built it, which is the claim an operator actually wants. A test of the claim is the
  verification command run against a real artifact, pasted in the task report.
- Each binary is named `cairn_<version>_<goos>_<goarch>`, with `.exe` on windows. The release
  job runs the artifact native to its own runner and asserts `--version` prints `1.0.0` and the
  commit, so each of the three operating systems has one binary that was actually executed rather
  than only linked.
- `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` succeeds in a container with no
  repository checkout and no module cache, and the installed binary prints `1.0.0`. The
  fixture-corpus resolver cannot break this: it is test-only, reached from `_test.go` files
  through `providers.RepoRoot`, so no non-test package imports it and `go install`
  builds none of it. A test asserts the resolver's file carries no non-test importer.
- The version a `go install` build stamps is the module version, not a `git describe` output,
  because `go install` runs no Makefile. The version package therefore reads its value from
  `runtime/debug.ReadBuildInfo` when the ldflags default is still `dev`, and a test covers both
  paths. `vcs.revision` is absent from a `go install module@version` build, so `version.Commit`
  reads `none` there by design (Pass A finding, 2026-09-20), and the README says so rather than
  leaving an operator to read it as a fault.
- The checksum line in `tool/README.md` shows how to verify a downloaded binary on each platform,
  with `sha256sum -c` on Linux, `shasum -a 256 -c` on macOS, and `Get-FileHash` on Windows.
- Falsify the release gate once: push a throwaway tag `tool/v0.0.0-test` on a branch, confirm the
  job builds six binaries and attests them, then delete the tag and its release. The report
  records that run.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`, the tag's own CI run green on
  all three legs, and the release visible with its files. Commit.

### Task 24: The scheduled run, documented for three schedulers

**The tripwire is `cairn health` on a schedule, not a new subcommand.** The spec names the
subcommand as the tripwire and gives it the exit-code contract (spec, "Credentials, safety, and
the tripwire": "The tripwire is the subcommand", and "A scheduled routine sources the secrets
file itself, runs the command, and alerts on non-zero"). The spec's `cmd/cairn` section lists the
1.0 subcommands and carries no `tripwire` verb. So 1.0 adds no command here: it documents the
scheduled run for each platform, and every capability the run needs is already a flag on `health`
by Tasks 19a, 19b, and 21.

**Files:**
- Create: `tool/docs/tripwire.md`
- Create: `~/.dotfiles/systemd/.config/systemd/user/cairn-tripwire.service`,
  `cairn-tripwire.timer`, and `~/.dotfiles/bin/.local/bin/cairn-tripwire` (the wrapper), all
  installed by `stow`, which is the verification installation and not a product artifact

**Acceptance:**
- `tripwire.md` carries a working example for each of the three schedulers, each complete enough
  to copy:
  - **systemd**, a user service plus timer with `OnCalendar=daily`, `Persistent=true` so a run
    missed during a suspend fires on resume, and `RuntimeMaxSec` as a second wall-clock cap
    behind the binary's own `--timeout`, sized above it per Task 21's stated arithmetic. The
    example reads the three credentials from an `EnvironmentFile` the operator owns, and says why
    a scheduler cannot inherit a shell profile.
  - **launchd**, a LaunchAgent plist with `StartCalendarInterval`, `EnvironmentVariables` for the
    three values or a wrapper that reads them from the keyring, and `StandardOutPath` and
    `StandardErrorPath` so a failed run leaves a readable trace. launchd has no execution cap, so
    the example leans on `--timeout` and says so.
  - **Windows Task Scheduler**, a `schtasks /create` command with a daily trigger, run under the
    operator's own account so the Credential Manager entry is reachable, with `/ET` naming the
    execution cap. The example sets the three values as user environment variables with `setx`
    beforehand, or relies on `cairn auth set` having written them to the Credential Manager.
- **All three examples pass `--quiet`,** so a green run really is silent, cron sends no mail, and
  launchd's and Task Scheduler's log paths stay empty until something is wrong. A green run that
  still prints trains an operator to ignore the output, which is the failure mode this closes. The
  doc states that `--quiet` suppresses output on OK only and that every non-OK verdict still
  prints.
- Every example loops over the site ids, because 1.0's `health` takes one site at a time: `cairn
  sites list --json --expect-sites N` first, then `cairn health <id> --json --quiet` per id. The
  loop is the scheduler's, not the binary's, and the doc says the multi-site sweep is 2.0.
- Every example alerts on any non-zero exit and names the four codes it may see, so an operator
  can route WARNING and CRITICAL differently if they want to. It alerts on a single run rather
  than after two consecutive ones. A day's delay on a real failure is worse than a false alarm.
- An alert names the failing site, the failing check ids, and each check's remedy anchor, and it
  never prints a credential or a verbose field.
- **Keeping the first run green is the acknowledgement feature's job, not a script's array.** The
  doc shows `--ack <check-id>=<YYYY-MM-DD>` and the `--ack-file` default path from Task 19b,
  states that an acknowledged failing check exits WARNING rather than CRITICAL, and states that
  an expiry date is required so no acknowledgement outlives its author's attention. It shows the
  same for `--error-threshold` on a noisy site. A routine that alerts every morning from creation
  is functionally the same as silent green, and turning a check off is the wrong fix.
- `tripwire.md` states that a scheduled unit is the machine-detectable form of this watch and
  that no ROADMAP line duplicates it. It states why a cloud routine through the `schedule` skill
  is not the answer: a cloud agent reaches no operator's environment, keyring, registry, or
  installed binary, so it becomes correct only once a hosted spine exists, which is a 2.0
  hand-forward.
- **Verification on Geoff's workstation, which is this task's acceptance evidence.** His units
  are one installation of the systemd example, authored under `~/.dotfiles` and installed by
  `stow` per the workstation rule, with `vps-conventions` governing that unit's shape, file
  placement, and lock and state paths, and nothing written into `/etc`. `vps-conventions` governs
  that unit alone and not the doc's other two examples. Before arming: run `source
  ~/.local/secrets` in one non-interactive shell, never an inline `export`, so no value reaches
  argv or shell history; run `cairn adopt list`; adopt the four production sites; and confirm
  `cairn sites list --json` lists four ids. The wrapper sources `~/.local/secrets` itself and
  asserts the three values are non-empty. Two of the four sites carry `p=none` DMARC records
  today, so the run carries a dated acknowledgement for each, naming the check id, the site, and
  the expiry.
- Falsify the guard on that installation: empty one credential in the service environment for one
  manual run, confirm the alert fires, restore it.
- `systemctl --user list-timers` shows the timer armed, and the task report shows it has fired
  unattended at least once with the real output pasted in, `--verbose` off. That first unattended
  green run is the acceptance evidence for the documented unit.
- Gate: `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. Commit the doc, and the
  dotfiles units in their own repository.

### Task 25: Pass B2 close

- The pass's verification run, against the four production sites Task 24's preamble adopted:
  `source ~/.local/secrets`, run `cairn health <site> --json` for each, and paste the non-verbose
  output into the pass report. It should show the two `p=none` sites acknowledged and WARNING on
  Email, and everything else honest. This is one operator's data proving the product, and the
  report says so.
- Run `code-simplifier` over `tool/`.
- Dispatch `go-architecture-reader` once per touched Go package: `render`, `logx`, `spine`,
  `store`, and `cmd/cairn`. Five dispatches, never batched. B2 touches no file in `secrets`,
  `record`, `providers`, `health`, or `logs`, which Task 11's and Task 17b's closes already read.
  The seams table pre-adjudicates every callerless export, so a finding naming one of those is
  answered by the table.
- Edit `docs/internal/what-cairn-is-and-is-not.md`: one paragraph naming the tool as the
  operator cockpit, which is spec decision 6. Acceptance: the paragraph names the tool, names its
  one job, and states that the tool holds no logic a view cannot call through the spine. This is
  a deliverable of this close task, ruled by the conductor on 2026-09-14, and not deferred to the
  docs rewrite.
- Run the reviewer fan-out: `web-auth-security-reviewer` over the credential handling and the
  scrub chokepoint, and `cloudflare-workers-reviewer` over the `providers` Cloudflare surface and
  the observability query. `svelte-reviewer` and `daisyui-a11y-reviewer` are not relevant here.
- Run the `cairn-pass` end ritual: the `docs/STATUS.md` entry, the `CHANGELOG.md` line under `##
  Unreleased`, the ROADMAP entry for the Go tool marked at its 1.0 boundary with 2.0's scope
  named, and the sub-project 2 handoff line pointing at the spec's "Inputs for sub-project 2"
  plus this plan's cut list and the 2026-09-20 spec addendum.
- **Amend the spec for whatever Geoff confirmed at his read.** Two contracts changed under the
  2026-09-14 ruling and were marked in the header as awaiting him: the exit codes, now the
  monitoring-plugin convention with the spec's exit 4 dropped, and the registry path, now
  `os.UserConfigDir` with the Node CLI's path as a fallback read. For each one he confirmed, edit
  `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md` in place, and record the
  amendment in `docs/internal/engine-rulings.md` if the ruling reaches beyond the tool. Also
  amend the spec's credential section, which says the tool never writes a credential: `cairn auth
  set` writes one to the OS keyring by the same ruling, and `cairn auth unset` removes one. Do
  not amend anything he declined; report it as an open item instead. The 2026-09-20 addendum at
  the spec's end is append-only and is not rewritten by this task.
- **Merge this pass by PR off `main` as a true merge commit: no squash, no rebase.** Task 22 pushed
  `tool/v1.0.0` on a commit of this branch, and `go install ...@v1.0.0` resolves that tag, so the
  commit has to stay reachable from `main`. A squash or rebase merge would rewrite it and orphan the
  tag. Use `gh pr merge --merge`, and **assert afterwards that `git merge-base --is-ancestor
  tool/v1.0.0 origin/main` succeeds**, recording the command and its exit status in the pass report.
  A failure here is a stop, not a note: it means the published install path is broken. Otherwise the
  merge follows Task 17b's, with the same never-merge-over-red rule, the same measure-then-resolve
  step for the conflict set, and the same coordination check against any other pass mid close on
  `CHANGELOG.md`, `docs/STATUS.md`, or `ROADMAP.md`.
- If the simplifier changed code under `tool/`, reinstall the binary and record whether a
  `tool/v1.0.1` tag was warranted. If a `tool/v1.0.1` tag is cut, the release job fires again and
  its artifacts are checked the way Task 23 checked the first set.
- Record both budgets: tokens against the 10M ceiling, and attended time as a planning-miss
  count plus an execution-sitting count. Task 10 was one planned sitting in Pass A and is not an
  execution sitting.

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
  Compatibility with the Node CLI's own location is the reason and it stands. Task 22's README
  states the precedence and the migration rule.
- **`store.Dir` keeps its injected `config` parameter.** It is what makes the three-platform
  resolution table testable on one platform.
- **`store.Source` stays exported.** It gains its 1.0 caller in Task 19a's `sites list --verbose`.
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
  would read the environment directly and there would be no chokepoint for Task 19a to extend.
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
  lands `State.Severity()`, which Task 20's "worst failing check" line and Task 21's precedence table
  both read.
- **Task 17b before every task in B2.** B2 runs on a worktree off `main`, and `main` carries no
  `tool/` tree until Task 17b merges PR #60. B2 dispatched first would have nothing to branch from.

State at each halt point, so a resuming session knows what it has. After Task 3 the corpus
exists and the Node suite still passes. After Task 5 the registry reads and writes records. After
Task 8 the vocabulary is complete and no check exists. After Task 9 a credential resolves
through either provider and `cairn auth set` writes one. After Task 11 Pass A is closed and the
module is green on three platforms, unmerged. After Task 11b-i `providers` carries a threaded
context and one copy of each shared helper. After Task 11b-ii the four accepted packages also carry
one severity order, one reason-to-outcome translation, and a single-source `record`, with no check
yet written.
After Task 17 every check exists with no CLI over them. After Task 17b Pass A and Pass B1 are on
`main` and `main` carries `tool/`. After Task 19b every action is reachable from the shell with raw
output. After Task 21 the exit-code contract holds and every output path is scrubbed. After Task 22
the tool is tagged and installed. After Task 23 the release carries six attested binaries and `go
install` works from a clean machine. After Task 24 a scheduled run is documented for three
platforms and Geoff's own timer has fired once.

A halt inside B2 before Task 21 leaves a usable binary with no exit-code contract, so no
scheduled run may be armed early: a unit reading an exit code the binary does not yet promise
would alert on noise. A halt after Task 21 and before Task 22 leaves the tool running
from a working copy rather than a tag, which is honest and is reported that way rather than
described as 1.0. A halt after Task 22 and before Task 23 leaves a tag nobody outside this
checkout can install, so STATUS says 1.0 is tagged and not yet released. A halt after Task 23 and
before Task 24 leaves 1.0 released with no scheduled watch, which is the state to name explicitly
in STATUS, because a watch that exists only as prose is the weakest form.

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
`logs`: Task 17. Adopt: Tasks 18 and 19a. `cmd` and exit codes: Tasks 19a, 19b, and 21. The render
seam and the missing-credential disclosure: Task 20. The doctor relationship: Task 8's condition
test and Task 20's remedy map. The 1.0 cut: Task 22. Distribution, which the spec put out of scope
and the 2026-09-14 ruling pulled in: Tasks 1 and 23. The scheduled run: Task 24. Pass closes:
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
Tasks 19a and 20, and `store.Source` by Task 19a. `render.StatusState` is produced by Task 20 and
populated by Task 19a's
`loadEnv` result. `render.Verdict` is produced by Task 20 and set from Task 21's `ExitCode`.
`render.Profile` is produced by Task 20 and set from the profile detection in that same task's
`profile.go`, the module's one TTY check. `health.Options` and `health.Acks` are produced by Task
12, read by Tasks 17 and 21, and populated by Tasks 19a's and 19b's flags. `internal/version` is
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
   render seam (Task 20), the full poplar `theme` port in 2.0.
4. The scheduled run's form. **Ruled documented units for three schedulers, with no new
   subcommand.** The spec names `cairn health` as the tripwire and lists no `tripwire` verb, so
   Task 24 ships `tool/docs/tripwire.md` with a systemd, a launchd, and a Task Scheduler example.
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
   Read by Task 11b-ii (its carried-nits criteria are unaffected), Task 19a (criterion 12, the
   narrowed grep test), and Task 20 (criteria 1 and 2).
15. **Pass B splits into B1 and B2,** each with its own ceiling, checkpoint interval, segments, and
   close, both through `pass-execute.js` with the header as the opt-in. Read by the two pass
   headers above.
16. **Grammar: the full cleanup.** `cairn sites list` with bare `cairn sites` as an alias;
   `adopt list` as a distinct non-writing subcommand replacing the `adopt --list` mode flag; the
   hidden `probe-token` becomes `auth probe`; and `auth unset` is added so a rotated token's stale
   keyring entry can be cleared. `health <site>` and `adopt` keep their shape. Read by Task 18
   (the non-writing listing function), Task 19a (criteria 1 through 3), and Task 22 (the command-set
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
- `~/.claude/skills/vps-conventions/`, which governs the one systemd unit in Task 24's
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
