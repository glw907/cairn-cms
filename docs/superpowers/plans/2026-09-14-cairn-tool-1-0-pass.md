# The `cairn` Go tool, 1.0: the complete single-site CLI

**Date: 2026-09-14.** Two passes, `cairn-tool-A` and `cairn-tool-B`, re-cut from
`docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md` at the CLI-versus-HUD
boundary per Geoff's versioning ruling of 2026-09-13.

> **For agentic workers:** dispatch each task through `cairn-implementer` (Sonnet), review the
> diff with `diff-reviewer`, and confirm the gate before the next dispatch. The gate for every
> task in this plan is `make check` inside `tool/`, issued as
> `cairn-run-gate 'make -C tool check'`. Tasks 3 and 17 are the two tasks that also run the Node
> gate. Invoke `go-conventions` before writing any Go file and `golang-spf13-cobra` before any
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
| `cairn-tool-B` | 14 | 10M | every four tasks |

**How the ceilings were sized.** The repo's comparable is polish-C: 15 tasks, mostly docs and
renames, at a 9M ceiling, which is roughly 600k per task including the implementer, the
`diff-reviewer` read, the gate, and the conductor's own turns. Go tasks buy less prose per task
and more code, so the per-task unit does not fall: each one writes a package plus a table-driven
test suite, and several iterate against a three-platform CI matrix whose red legs cost a
re-dispatch rather than an edit. Pass A additionally carries the fixture-corpus extraction, which
touches the Node tree and runs a second gate. So the unit stays at roughly 650k. Pass A has ten
token-spending tasks, because Task 10 is Geoff's attended sitting, which is 6.5M. Pass B has
fourteen, which is 9.1M. The ceilings are 8M and 10M, the headroom being CI-matrix re-dispatches.

**What the 2026-09-14 ruling added to the counts.** Pass A gained Task 9, the secret provider
seam and the `cairn auth set` command. Pass B gained Task 23, the release artifacts and the
`go install` proof, split out of the cut rather than piled onto it. Pass B's Task 19, Task 21, and
Task 24 each grew: the acknowledgement list and the error threshold became documented flags, the
exit codes changed convention, and the tripwire doc now carries three schedulers. The counts are
stated here rather than absorbed, so a conductor can see the accumulation. Pass B at fourteen
tasks is the pass to watch. Its fallback cut after Task 17 stands, and one further task split
during execution is the prompt to take it.

At 80% of a pass ceiling, finish the task in flight, write STATUS, and ask one combined
question. Check that flag only at a segment boundary.

**Execution mode.** Both passes are at or above six tasks, so both run through `pass-execute.js`
with `cairn-implementer` as the executor. This header is the opt-in. The Workflow tool refuses a
`~/.claude/workflows` scriptPath, so copy `~/.claude/workflows/pass-execute.js` into the session
scratchpad and run it from there. The Go gate is `make check` inside `tool/`, not the repo's npm
gate, and `cairn-implementer` has the npm gate baked in, so every task below states its gate
explicitly and the workflow's gate string is `make -C tool check`.

**Segments.** Pass A segments after Task 3, Task 6, and Task 9. Pass B segments after Task 15,
Task 19, and Task 22. Every boundary sits on a commit the gate proved green.

**Sequencing.** Both passes run after the `0.97.0` cut, in parallel with `extend-1`, and before
the docs rewrite. The tool lives under its own module, so the parallelism is real. Honor the
one-executor-per-worktree rule: these passes run on their own feature worktree off `main`, and
`extend-1` runs on its own. Neither pass touches `src/lib`, so the branches contend over six
files only: `CHANGELOG.md`, `docs/STATUS.md`, and `ROADMAP.md`, all written at a pass close;
`CLAUDE.md` and `docs/superpowers/2026-08-18-tui-skills-setup-brief.md`, written by Task 2; and
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
| `shouldLaunchTUI(isTTY, env)` and the TTY gate on bare `cairn` | Old Task 19 | 1.0's bare `cairn` prints help unconditionally. The predicate is three lines, not a seam, so 2.0 adds it rather than 1.0 shipping it dead. Task 19 asserts its absence. |
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
| `ExitCode` over a slice of reports | 21 | The multi-site sweep's exit | The table covers a one-element slice, which is 1.0's only health caller, a zero-report call with `expectSites` mismatched, which is `sites`' only caller, and a three-element slice with mixed outcomes, which is 2.0's. |
| The pure render seam: `Render(RenderInput) Frame`, no I/O, no program | 20 | The HUD's screen render | A golden sweep over fixture, width, and profile, plus a test asserting the package imports neither `os` nor any terminal package outside its profile detection file. |
| The condition-to-remedy anchor map, re-homed out of `ui` | 20 | The HUD's detail view | Every anchor `Anchor` returns resolves to an actual heading in `docs/admin/is-it-working.md`, read at test time, and a second test covers the no-anchor branch. |
| `logs.Query`, `logs.Entry`, `logs.Fetch` shaped for both a printed list and a scrolling view | 17 | The HUD's scrolling log screen | `Fetch` returns entries newest-first with fields unparsed as `json.RawMessage`, so no renderer choice is baked into the fetch. |
| `spine.Discover`, `spine.Adopt`, `spine.AlreadyAdopted` as plain functions | 18 | The HUD's adopt dialog | `Discover` never writes, and adopting the same candidate twice yields one record. |
| `spine.TerminalSteps()`, `spine.Chapter3TerminalSteps()`, `spine.Chapter3ResumableSteps()` (Task 11 fold, 2026-09-20: functions returning a clone of an unexported backing slice, not vars) | 8 | The HUD's detail view, which shows an onboarding site's hold state | The step-literal drift test reads the Node constants at test time, so a Node-side edit fails the Go suite even with no 1.0 caller. |
| `spine.FromKind` | 8 | The HUD's detail view, which renders a park state from the doctor's own kind | A table over every `Kind` asserts the spec's mapping, so the function is covered before 2.0 calls it. |
| `spine.Conditions()` (Task 11 fold, 2026-09-20: a function returning a clone of an unexported backing slice, not a var) | 8 | The HUD's condition filter on the sites table | The drift test against `src/lib/diagnostics/conditions.ts` is the function's only 1.0 reader, and the task states that. |
| `providers.NPM.Versions` | 7 | 2.0's engine detail view, which lists the skipped versions | A corpus-backed test over a packument asserts the ordering the detail view will read. |
| The secret provider seam: `secrets.Provider` with the environment and keyring implementations | 9 | 2.0's third backend behind the same interface | A table runs the resolver over both providers with a fake keyring: environment wins when both hold a value, the keyring answers when the variable is absent, and a keyring that cannot be reached is a miss rather than an error. |

`providers.Cloudflare.VerifyToken` and `providers.GitHub.TokenExpiry` are not in this table.
Both gain a 1.0 caller in Task 12's `creds` check, which is the first member of `All`.

### What 1.0 owes that the old plan put in Pass C or nowhere

- **The scheduled tripwire, as documented units for three schedulers.** The old plan documented
  the exit-code contract and stopped. Task 24 writes `tool/docs/tripwire.md` with a working
  example for a systemd user timer, a launchd LaunchAgent, and a Windows Task Scheduler task,
  each supplying the three credentials the way its own platform does and each capped in
  wall-clock time. Geoff's own timer is one installation of the systemd example, and its first
  unattended green run is that task's acceptance evidence.
- **Every action reachable from the shell.** Task 19 and Task 20 own this. Task 22's acceptance
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
  verbose-only everywhere. `adopt --list` is implicitly verbose and says so on stderr. Nothing
  else prints them without `--verbose`.
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
| 12 | `packages/create-cairn-site/src/cloudflare/zone.mjs:193` | `export async function checkDelegation({ record, api, resolveNs = systemResolveNs })`, four states at `:209` and `:213` | Task 13 | Verified 2026-09-14 post-polish-C (changed) |
| 13 | `src/lib/diagnostics/conditions.ts` | 262 lines; the condition id vocabulary the checks declare against. It carries no id for Serving, Delegation, Deploy, Behind, Engine, or an error count, which is why those checks declare `ConditionNone` | Tasks 8, 12, 13, 20 | Verified 2026-09-14 post-polish-C |
| 14 | `src/lib/log/events.ts` | 98 lines; polish-C Tasks 10 and 11 renamed eight event strings in this union | Tasks 17, 21 | Verified 2026-09-14 post-polish-C (changed) |
| 15 | `docs/reference/log-events.md` | 111 lines; the engine's event table, which `logs --event` completion and the tool's own event reference both read. Fourteen or more events carry an editor email, which is why Task 17's fixture is synthesized rather than captured | Tasks 17, 21 | Verified 2026-09-14 post-polish-C |
| 16 | `docs/admin/is-it-working.md` | Headings present today include `## Force HTTPS at the edge` (`:164`), `## Turn on observability` (`:256`), `## Onboard the sending domain` (`:216`), `## Install the GitHub App` (`:413`). No heading covers Serving, Delegation, Deploy, Behind, Engine, or an error count | Task 20 remedy map | Verified 2026-09-14 post-polish-C |
| 17 | `docs/admin/troubleshooting.md` | Exists; polish-C Tasks 10 and 11 edited it wherever it names a renamed event | Task 24 | Verified 2026-09-14 post-polish-C |
| 18 | `scripts/checks/check-package-files.mjs` | 421 lines; asserts nothing about top-level paths today, which is why Task 1 adds the `tool/` assertion | Task 1 | Verified 2026-09-14 post-polish-C |
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

## Pass `cairn-tool-B`: checks, the CLI, the 1.0 cut, and the tripwire

Fourteen tasks. The pass ends with `cairn health --json` honest against every site in a
registry, `cairn` 1.0 released as a tag, six prebuilt binaries, and a working `go install`, and a
documented scheduled run that alerts on a non-zero exit. The pass's own verification is Geoff's
four production sites, his installed binary, and his systemd timer's first unattended firing.

### Task 12: `health` skeleton, the check contract, and the `creds` check

**Files:**
- Create: `tool/internal/health/health.go`, `report.go`, `report_test.go`, `clients.go`,
  `options.go`, `options_test.go`, `ack.go`, `ack_test.go`, `check_creds.go`,
  `check_creds_test.go`, `health_test.go`

**Produces:** `type Clients struct{ CF *providers.Cloudflare; GH *providers.GitHub; NPM
*providers.NPM; Probe *providers.Probe; HaveCF, HaveGH, HaveBuilds bool; CFFrom, GHFrom string }`,
where the two `From` fields name the provider each credential resolved through. `type Check
interface{ ID() string; Condition() spine.Condition; Needs() Tier; Run(ctx, record.Record,
Clients, Options) spine.Outcome }` with `Tier` one of `TierNone`, `TierCF`, `TierGH`,
`TierBoth`. `type Options struct{ ErrorThreshold int; LogWindow time.Duration }`, the tunables
the CLI exposes as flags, passed to every check so no threshold is a literal inside a check.
`Condition()` may return `spine.ConditionNone`; `Run` records it and the remedy line is omitted.
`type Report struct{ SchemaVersion int; Site string; Domain string; Checks []CheckResult;
Degraded bool; Acknowledged []string }`. `type CheckResult struct{ ID string; Condition
spine.Condition; Outcome spine.Outcome; CheckedAt time.Time; Tier Tier; Acknowledged bool;
AckExpires time.Time }`. `type Ack struct{ CheckID string; Expires time.Time }` and `type Acks
[]Ack` with `func (a Acks) Match(id string, now time.Time) (Ack, bool)`. `func (r Report)
JSON(verbose bool) ([]byte, error)`. `func Run(ctx, r record.Record, c Clients, checks []Check,
now func() time.Time, o Options, acks Acks) Report`. `var All []Check`, a literal slice whose
first member is the `creds` check and which Tasks 13 through 17 append to.

**Acceptance:**
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
- `Options` carries no default inside a check. A test asserts the zero `Options` is rejected by
  `Run` with an error naming the field, so a caller cannot silently get a threshold of zero.
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
  sets `Degraded`, and never calls `Run` on it.
- A panicking check is recovered into Unknown with `reason.not-run`. The recovered value is never
  placed in the report or in an error string verbatim: the report records the check id and the
  panic value's type only. A test panics with a sentinel-bearing value and asserts the sentinel
  appears nowhere in `Report.JSON(true)`. `health` writes nothing itself, so `logx` stays
  `cmd/cairn`'s alone and the architecture's downward order holds.
- `Report.JSON(verbose bool)` is the only marshal path, and `Report` and every type it contains
  declare no `MarshalJSON`, asserted by a test, so a bare `json.Marshal(r)` cannot leak. The
  filter runs over the whole `Report`, `Outcome.Detail` included, against an enumerated
  non-verbose allowlist: check id, condition, reason, counts, ages, states, and 7-character SHAs.
  Account ids, zone ids, worker names, repository slugs, build UUIDs, and full SHAs are
  verbose-only. A test marshals a fixture report whose detail carries a build UUID and a
  repository slug and asserts a non-verbose render contains neither.
- Gate: `make -C tool check`. Commit.

### Task 13: Serving and Delegation checks, the two ports

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
- Gate: `make -C tool check`. Commit.

### Task 14: HTTPS-forced and Email checks

**Files:**
- Create: `tool/internal/health/check_https.go`, `check_https_test.go`, `check_email.go`,
  `check_email_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Acceptance:**
- HTTPS-forced reads the zone's `always_use_https` and HSTS settings. Either one off is Failing
  with condition `edge.https-not-forced` or `edge.hsts-off`, both of which exist in
  `conditions.ts`.
- Email runs two halves in order. Credential-free first: `_dmarc.<domain>` TXT must exist and
  its `p=` must not be `none`, with the policy quoted in the detail on a Failing; the SPF TXT on
  the sending subdomain must include Cloudflare's Email Sending include; the DKIM selector TXTs
  must resolve. Then, with a Cloudflare client, the zone's sending subdomain must be verified.
- The DMARC-is-TXT expectation and the DKIM selector names are ported from reconciliation row
  28, not invented.
- The test suite includes both live shapes: a `p=none` record is Failing and a `p=reject` one
  passes. Two of Geoff's four production sites carry `p=none` today, which is this task's
  verification data and the reason the acknowledgement feature exists: an operator with a known
  failing check acknowledges it with an expiry date rather than turning the check off. Task 19
  carries the flag and Task 24 documents the workflow.
- Gate: `make -C tool check`. Commit.

### Task 15: Deploy check, with Builds state and the Behind state

**Files:**
- Create: `tool/internal/health/check_deploy.go`, `check_deploy_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Produces:** `type DeployDetail struct{ WorkerExists, BuildsConnected, PushToDeploy bool;
LastBuild BuildState; LastBuildSHA, MainSHA string; LastBuildAt time.Time; Behind bool }`,
carried in `Outcome.Detail` as JSON. `BuildState` is one of `BuildOK`, `BuildFailed`,
`BuildRunning`, `BuildNone`.

**Acceptance:**
- Worker absent is Failing. Builds not connected is Failing with
  `reason.api.builds-not-connected`, the 907-life outage shape: `BuildsConnections` returning an
  empty trigger list with no error, not a distinct API error code (a live probe on 2026-09-19
  found no such code; conductor ruling 2026-09-19). Tested with a handcrafted empty-list
  response, since the fixture corpus carries no captured body for this condition (conductor
  ruling 2026-09-19), not against the corpus body.
  A failed last build is Failing with the build id in the detail. Running is Unknown with
  `reason.park.builds-running`. OK with `MainSHA == LastBuildSHA` is OK. OK with differing SHAs
  is OK with `Behind: true`, because Behind is a state of this cell and not a separate check.
- The check declares `spine.ConditionNone`, per the spec's table marking it new.
- The build id, the repository slug, and the full SHAs in `DeployDetail` are verbose-only, which
  Task 12's filter enforces. A test asserts a non-verbose render of a Failing deploy carries the
  build state and the 7-character SHAs and nothing else from this struct.
- If Task 10 found no read-level Builds permission group, the Builds half is gated at runtime on
  `Clients.HaveBuilds`, which is false in that case, and the check degrades to worker-exists plus
  Behind with an Unknown carrying `reason.cred-missing` for the Builds half. No build tag is
  used, per `go-conventions`. The task report and the spec both record which path shipped.
- Gate: `make -C tool check`. Commit.

### Task 16: Publish-path and Engine checks

**Files:**
- Create: `tool/internal/health/check_publish.go`, `check_publish_test.go`,
  `check_engine.go`, `check_engine_test.go`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Acceptance:**
- Publish-path lists `cairn/` branches and the newest `cairn-cms[bot]` commit on `main`. It is
  Failing when any `cairn/*` branch is older than 14 days with no later bot commit, Unknown with
  `reason.not-observable` when there are no branches and no bot commits at all, and OK
  otherwise. The detail carries the branch count and ages.
- Engine parses the site's `package.json` on `main`, reads the `@glw907/cairn-cms` range, and
  compares it to the latest published version. The detail carries releases-behind and whether any
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
- Gate: `make -C tool check`. Commit.

### Task 17: `logs` package and the Errors check

**Files:**
- Create: `tool/internal/logs/logs.go`, `logs_test.go`,
  `tool/internal/health/check_errors.go`, `check_errors_test.go`
- Create: `packages/create-cairn-site/fixtures/cloudflare/observability-telemetry-query.ok.json`
- Modify: `tool/internal/health/health.go` (append to `All`)

**Produces:** `type Query struct{ Worker string; Since time.Duration; Event string; Limit int }`.
`type Entry struct{ At time.Time; Level string; Event string; Fields map[string]json.RawMessage
}`. `func Fetch(ctx, cf *providers.Cloudflare, q Query) ([]Entry, error)`. `func CountErrors(ctx,
cf, worker, since) (int, error)`. A sentinel `ErrObservabilityOff` mapped from the API's response
when the Worker has no observability dataset.

**Acceptance:**
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
  `Options.ErrorThreshold` is OK with the count and the top three event names in the detail,
  which is the advisory band: a single `auth.link.send_failed` or `config.invalid` record is a
  real signal and not a site-down signal. Above the threshold is Failing with the same detail.
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
- Event names are read against the engine's union per reconciliation row 14, after polish-C's
  renames, not before.
- Re-run Task 12's purity assertion over the now-complete `All` and record the run in the task
  report.
- Gate: `make -C tool check` plus `npm test -w packages/create-cairn-site`. This is the second of
  the two tasks whose gate includes the Node gate. Commit.

### Task 18: `adopt`

**Files:**
- Create: `tool/internal/spine/adopt.go`, `adopt_test.go`

**Produces:** `type Candidate struct{ Worker, Repo, Zone, AccountID string; Connected bool }`.
`func Discover(ctx, cf *providers.Cloudflare, gh *providers.GitHub, accountID string)
([]Candidate, error)`. `func Adopt(st *store.Store, c Candidate, name string, resolve
providers.Resolver) (record.Record, error)` writing step `live`, `adopted: true`, no secrets, and
a fresh id in the Node shape. `func AlreadyAdopted(st *store.Store, c Candidate) bool` by worker
name.

**Acceptance:**
- **2.0 seam kept on purpose: adopt as plain functions.** `Discover`, `Adopt`, and
  `AlreadyAdopted` are plain functions with no prompting and no printing, so 2.0's dialog calls
  exactly what 1.0's flags call. A test asserts `Discover` performs no write.
- `Discover` lists every Worker on the account and marks `Connected` from Builds. `Adopt` is
  refused for a candidate whose domain fails `record.ValidateDomain`.
- `Adopt` also refuses a candidate whose domain resolves into a private, link-local, or loopback
  range, using the injected `Resolver`. This is the spec's resolution check, and it lives here
  because `record.ValidateDomain` stays resolution-free. A table covers `10.0.0.0/8`,
  `169.254.0.0/16`, `127.0.0.0/8`, and a public address.
- Adopting the same candidate twice yields one record.
- Gate: `make -C tool check`. Commit.

### Task 19: The cobra tree

**Files:**
- Create: `tool/cmd/cairn/sites.go`, `health.go`, `logs.go`, `adopt.go`, `ack.go`,
  `ack_test.go`, `root_test.go`
- Modify: `tool/cmd/cairn/root.go` (attach the subcommands and the persistent `--timeout` flag),
  `tool/cmd/cairn/main.go` (build the root, print the error, call `os.Exit`),
  `tool/cmd/cairn/env.go` and `env_test.go` (extend Task 9's chokepoint),
  `tool/cmd/cairn/probe_token.go` (keep it hidden on the assembled tree)

**Produces:** subcommands `sites [--json] [--expect-sites N]`, `health <site> [--json]
[--verbose] [--ack ID=YYYY-MM-DD ...] [--error-threshold N] [--since]`, `logs <site> [--event]
[--since] [--json]`, `adopt [--list] [--worker NAME [--repo SLUG]]`, `auth set <name>` and `auth
list` from Task 9, and the hidden `probe-token`. A persistent `--timeout` flag on the root sets
the whole run's wall-clock deadline, default 120 seconds, and every command derives its context
from it. `sites` returns a sentinel `ErrExpectSites` on a count mismatch, which Task 21's
`ExitCode` maps to UNKNOWN; the mapping is defined once, in `ExitCode`.

**Acceptance:**
- The cobra shape follows `go-conventions` and `golang-spf13-cobra`: `SilenceUsage: true`, flags
  in a struct rather than loose variables, `RunE` returning an error, and `main` as the only
  place that prints an error and calls `os.Exit`. Every write to standard output and standard
  error goes through one writer obtained from a single helper in `main.go`, so Task 21 can wrap
  it in the scrubber in one place.
- Bare `cairn` prints help and exits OK. A test asserts the help text on a pipe. 1.0 has no TTY
  predicate, which is what makes the pty case moot and keeps a pty dependency out of the module.
- `sites --json` carries each site's id from `store.Entry.ID`, and `health <id>` resolves by id.
  A record that failed to parse is reported by id on standard error and counted toward the exit
  code, never dropped silently.
- `sites` computes its exit code through `ExitCode(nil, listErrs, expectSites)`: UNKNOWN when the
  registry is empty, when any record failed to parse, or when `--expect-sites N` does not match
  the count, and OK otherwise. Each of the three is a case where the tool cannot say whether the
  sites are healthy, which is what UNKNOWN means. A test covers all three.
- A report carrying `degraded: true` exits WARNING, which is 1, with no flag to ask for it. The
  spec's `--require-credentials` is dropped: a scheduled routine alerts on any non-zero exit, and
  WARNING is what a human reads at a prompt. Task 21 holds the mapping.
- **The acknowledgement list is a documented product feature, not a wrapper's array.** `--ack
  <check-id>=<YYYY-MM-DD>` is repeatable, and the same entries can live in
  `acknowledgements.json` inside the registry directory, which needs no new path resolution:
  `store.Dir` already names the directory, and `store.List` already skips a filename stem that
  fails `record.ValidateSiteID`, so the file cannot be read as a site. Flag entries and file
  entries merge, with the flag winning on the same check id. A malformed date is an error naming
  the entry, never a silently ignored acknowledgement. An entry with no expiry date is refused,
  so no acknowledgement outlives its author's attention. A test covers a merge, a conflict, an expired entry, and a malformed one.
- `--timeout` caps the whole run. A test with a stub client that blocks asserts the command
  returns by the deadline with UNKNOWN rather than hanging. This is the cap every scheduler
  example in Task 24 inherits, which is why it lives in the binary rather than in one platform's
  unit file.
- `health` requires a site argument and errors with a usage-free message naming `cairn sites`
  when the argument is missing. The multi-site sweep is 2.0.
- `adopt --list` prints candidates as JSON, preceded by a stderr line saying the output is not
  safe to paste. `adopt --list` is the one implicitly verbose command, per the global constraint,
  and the stderr line says so. `adopt --worker X` adopts without a prompt.
- No command reads an environment variable except through `loadEnv`, and no command reads the
  keyring except through `secrets`. A test greps the package for `os.Getenv` and allows only
  `env.go`. This holds because Task 9 created the chokepoint before any command needed it.
- A second grep test forbids `term.IsTerminal` and `os.Stdout.Stat()` in every file under
  `tool/`, while allowing `term.ReadPassword` in `auth.go` alone. Reading a secret with echo off
  is not a TTY predicate.
- Gate: `make -C tool check`. Commit.

### Task 20: The `render` package, the pure seam, and the remedy map

**Files:**
- Create: `tool/internal/render/render.go`, `render_test.go`, `profile.go`, `glyph.go`,
  `glyph_test.go`, `remedy.go`, `remedy_test.go`, `testdata/golden/`, `fixtures/`
- Modify: `tool/Makefile` (a `golden` target), `tool/cmd/cairn/health.go`,
  `tool/cmd/cairn/sites.go`, `tool/cmd/cairn/logs.go` (print through the seam)

**Produces:** `type RenderInput struct{ View ViewID; Width int; Profile Profile; Reports
[]health.Report; Entries []logs.Entry; Status StatusState; Verdict Verdict; Now time.Time }`,
where `Verdict` is a typed int whose constants are the four exit codes themselves (`VerdictOK`
0, `VerdictWarning` 1, `VerdictCritical` 2, `VerdictUnknown` 3) with a `String` returning the
monitoring word. `cmd/cairn` builds it from `ExitCode`'s return value, so the word cannot drift
from the code. `type Frame
struct{ Lines []string }`. `func Render(in RenderInput) Frame` with no I/O. `type StatusState
struct{ UpdatedAt time.Time; Missing []providers.Missing; CFOK, GHOK bool; CFFrom, GHFrom
string; GHExpiry time.Time }`. `func
Anchor(spine.Condition) (string, bool)` mapping a condition to its
`docs/admin/is-it-working.md` heading anchor. A minimal glyph set for ok, failing, unknown, and
running at a Unicode and an ASCII tier, with the ASCII tier `+ ! ? ~`.

**Acceptance:**
- **2.0 seam kept on purpose: the pure render seam.** `Render` runs no program, performs no I/O,
  and reads no environment. A test asserts the package imports neither `os` nor any terminal
  package outside `profile.go`, and the golden sweep runs with no process spawned. 2.0's HUD
  mounts on this function rather than replacing it.
- The golden sweep covers widths 80, 120, and 160, the profiles color and no-color, and the
  fixtures empty, all-unknown, degraded, offline, one-sick, and healthy, for the site list, the
  single-site health view, and the log view. `go test` fails on drift and on an orphan file.
  `make -C tool golden` regenerates. Line endings normalize to `\n` before comparison.
- Never-color-alone gate: a test strips ANSI from each no-color render and asserts every state
  word appearing in the color render at the same width also appears here, scoped to widths at or
  above 120. At width 80 the states render glyph-only, which satisfies the rule because the three
  glyphs are distinct rather than one glyph in three colors. Falsify by rendering one state as
  color-only and confirming the failure.
- `health` and `sites` print a status line from `StatusState` above their output: the render
  time, each missing credential by variable name with the check ids it disables, the provider
  each present credential resolved through, the GitHub token expiry date, and `degraded` when
  set. An acknowledged check renders with its expiry date beside it, so an acknowledgement is
  visible in the output and not only in the exit code. This is where the spec's
  missing-credential disclosure lands, so a `StatusState` field is never produced without a printed consumer. A golden covers
  the degraded fixture at all three widths, and a test asserts an absent `CAIRN_GH_READ_TOKEN`
  names the check ids it disables.
- The health view leads with a verdict line whose first word is the run's status, `OK`,
  `WARNING`, `CRITICAL`, or `UNKNOWN`, the way a monitoring plugin's output reads, followed by
  the site and the counts. The word comes from `Verdict.String()`, and `Verdict` is `ExitCode`'s
  own return value widened to a type, so an operator reading the line and a routine reading the
  code cannot disagree. A test in `cmd/cairn` renders a report and asserts the printed first word
  against the exit code for all four values.
- The view then carries a "do this next" line with the worst failing
  check's id, its condition id when it has one, and its remedy anchor when `Anchor` returns one.
  When `Anchor` returns false the line names the check and says no remedy page covers it yet. A
  test asserts that branch for the Deploy check, which is one of the six check families
  `docs/admin/is-it-working.md` has no heading for per reconciliation row 16.
- **2.0 seam kept on purpose: the remedy map, re-homed out of `ui`.** Every anchor `Anchor`
  returns resolves to an actual heading in `docs/admin/is-it-working.md`, read at test time
  through `providers.RepoRoot`, so the map cannot drift from the page. The old plan put this map
  in the TUI's `remedy.go`; 1.0 needs it because `cairn health` prints the line, and 2.0's detail
  view reads the same function.
- **The theme split is ruled** (conductor, 2026-09-14): a minimal glyph and profile set lives in
  1.0's render seam, and the full poplar `theme` port is 2.0. This task's glyph set is therefore
  the minimum the CLI's own output needs, by ruling rather than by an executor's judgment, and no
  task in this plan widens it.
- Gate: `make -C tool check`. Commit.

### Task 21: The monitoring exit codes and the scrubbing chokepoint

**Files:**
- Create: `tool/internal/logx/logx.go`, `logx_test.go`, `tool/cmd/cairn/exit.go`, `exit_test.go`
- Create: `tool/docs/reference/log-events.md`, `tool/docs/reference/exit-codes.md`
- Modify: `tool/cmd/cairn/main.go` (wrap the output writers, map the exit code)

**Produces:** `func ExitCode(reports []health.Report, listErrs []error, expectSites int) int`
returning a monitoring-plugin code. `logx.New(w io.Writer, scrub []providers.Credential)` whose
every write runs the scrub last.

**Acceptance:**
- **2.0 seam kept on purpose: `ExitCode` over a slice.** The signature takes a slice of reports,
  which 1.0 always calls with one element and 2.0 calls with many. The table covers a
  one-element slice, a zero-report call with `expectSites` mismatched, which is `sites`' only
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
- A tool fault is UNKNOWN, set by `main` on an error return from a command. `ExitCode` has no
  notion of a tool fault, so the two paths cannot collide. The spec's exit 4 is dropped, and this
  change to the spec's contract is confirmed by his approval of 2026-09-14; Task 25 amends the spec
  if he confirms.
- `render.Verdict` is this function's return value widened to a type, and Task 20's verdict line
  prints its word. A test asserts the four codes and the four words correspond, so the printed
  status and the exit code are one decision.
- `ErrExpectSites` is mapped here and nowhere else. Task 19 returns the sentinel; this function
  is the one definition of the code it becomes.
- A table test covers each code including every precedence pairing, the empty-state-directory
  case, an acknowledged failing check and the same check with an expired acknowledgement, and a
  report whose `creds` check is Failing on `reason.cred-expiring`, which is CRITICAL rather than
  WARNING or UNKNOWN: an expiring token is a fault the operator can fix before it lands.
- `main` wraps `os.Stdout` and `os.Stderr` in the scrubbing writer before any command runs, and
  registers all three credentials including the absent ones. A test greps `cmd/cairn` and allows
  `os.Stdout` and `os.Stderr` only in `main.go`, so a later command cannot acquire an unscrubbed
  writer. `logx` is imported by `cmd/cairn` alone, per the architecture's downward order.
- Scrub test: a log line embedding a credential's plaintext is emitted with `<redacted>` in its
  place.
- The sentinel byte-level test: a record fixture with sentinel secrets passes through `sites
  --json`, `health --json`, the logger, an error wrap, and `store.Save`. The sentinel appears only
  in the store file.
- `exit-codes.md` documents the contract for a routine: the four codes by name, the precedence
  rule, the acknowledgement flag's effect on the code, and the fact that a scheduler starts with
  no shell profile, so the three credentials reach it the way Task 24's examples show for each
  platform. It states that the convention is the monitoring-plugin one and names it, so a reader
  can point an existing check plugin at the command with no translation.
- Gate: `make -C tool check`. Commit.

### Task 22: The 1.0 cut

**Files:**
- Create: `tool/CHANGELOG.md`, `tool/README.md`
- Modify: `docs/STATUS.md` (the tool's installed version line)
- Modify: `tool/cmd/cairn/root_test.go` (the every-action coverage assertion, created in Task 19)

The cut comes before the release and the scheduled run. Task 23's release job fires on this
task's tag, and Task 24's documented run needs an installed binary and a populated registry to
verify against. A scheduled run written first could not be proved.

**Acceptance:**
- Every action coverage assertion: a test over the cobra tree asserts the command set is exactly
  `sites`, `health`, `logs`, `adopt`, `auth set`, `auth list`, and the hidden `probe-token`, with
  the root's persistent `--timeout`, and flags `sites{--json,--expect-sites}`,
  `health{--json,--verbose,--ack,--error-threshold,--since}`,
  `logs{--event,--since,--json}`, and `adopt{--list,--worker,--repo}`. A second assertion lists
  the verbs deliberately absent in 1.0: the TUI launch, the interactive adopt dialog, and any
  multi-site sweep. The 2026-08-20 spec names no machine-readable verb list, so the set is
  enumerated here rather than derived, which is what makes the gate a gate.
- `make -C tool install` builds and installs to `~/.local/bin/cairn` with mode 0755, matching
  poplar's Makefile, and `cairn --version` on the installed binary prints `1.0.0` plus the
  commit. That is the local path, and it is how this pass's own verification binary lands. The
  product's install paths are `go install` and the release binaries, which Task 23 proves.
- The installed binary prints a `+dirty` suffix when built from a modified tree. Falsify once:
  touch a source file, run `make -C tool install`, confirm the suffix, restore, reinstall,
  confirm it is gone. The task report records `go version` and the `GOOS/GOARCH` it built for.
- The tag is `tool/v1.0.0` on this task's commit, pushed after CI is green on all three legs. The
  tag prefix is the spec's. No npm publish happens, and `package.json` is untouched. If Task 23,
  Task 24, or Task 25 changes code under `tool/`, the close records that the binary was
  reinstalled, and a `tool/v1.0.1` tag is cut only if the change is behavioral.
- `tool/CHANGELOG.md` opens with the `1.0.0` entry, listing the registry, the checks, the
  subcommands, the credential providers, the exit-code contract, and an explicit "not in 1.0"
  line naming the HUD and multi-site management.
- `tool/README.md` is written for an operator who has never seen this repository. It states the
  two install paths, `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` and a release
  binary; the three credentials with a pointer to `tool/docs/credentials.md` for each platform;
  where the registry lives per platform; the four exit codes by name; a pointer to
  `tool/docs/tripwire.md` for a scheduled run; and one sentence that 1.0 is the complete CLI and
  2.0 adds the HUD. No sentence says the module is for one machine, and no example tells a reader
  to source a file only this workstation has.
- Brew, a Windows package channel, and the npm shim stay 2.0. A tag, a `go install` path, and
  release binaries are 1.0, per the 2026-09-14 ruling.
- Gate: `make -C tool check` plus a clean-clone CI run. Commit, then tag.

### Task 23: Release artifacts and `go install` from a clean machine

The tag Task 22 pushed is the trigger. This task is split out of the cut because the cut's own
deliverable list was already at four, and because a release nobody can install is not a release.

**Files:**
- Modify: `.github/workflows/tool.yml` (the release job Task 1 wired, corrected against its
  first real run)
- Create: `tool/internal/providers/corpus_importer_test.go` (the assertion that the corpus
  resolver's file has no non-test importer)
- Modify: `tool/README.md` (the release table and the checksum verification line)
- Modify: `tool/CHANGELOG.md` (the artifact list under `1.0.0`)

**Acceptance:**
- The release job fires on the `tool/v1.0.0` tag and attaches six binaries, linux, darwin, and
  windows on amd64 and arm64, each built with `-trimpath` and the same `-ldflags -X` stamping the
  `build` target uses, plus a `SHA256SUMS` file covering all six. The task report pastes the
  release's file list and the checksum file.
- Each binary is named `cairn_<version>_<goos>_<goarch>`, with `.exe` on windows. The release
  job runs the artifact native to its own runner and asserts `--version` prints `1.0.0` and the
  commit, so each of the three operating systems has one binary that was actually executed rather
  than only linked.
- `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.0.0` succeeds in a container with no
  repository checkout and no module cache, and the installed binary prints `1.0.0`. The
  fixture-corpus resolver cannot break this: it is test-only, reached from `_test.go` files
  through `providers.RepoRoot(t testing.TB)`, so no non-test package imports it and `go install`
  builds none of it. A test asserts the resolver's file carries no non-test importer.
- The version a `go install` build stamps is the module version, not a `git describe` output,
  because `go install` runs no Makefile. The version package therefore reads its value from
  `runtime/debug.ReadBuildInfo` when the ldflags default is still `dev`, and a test covers both
  paths. Without this, every `go install` build would report `dev` and no operator could say what
  they were running.
- The checksum line in `tool/README.md` shows how to verify a downloaded binary on each platform,
  with `sha256sum -c` on Linux, `shasum -a 256 -c` on macOS, and `Get-FileHash` on Windows.
- Falsify the release gate once: push a throwaway tag `tool/v0.0.0-test` on a branch, confirm the
  job builds six binaries, then delete the tag and its release. The report records that run.
- Gate: `make -C tool check`, the tag's own CI run green on all three legs, and the release
  visible with seven files. Commit.

### Task 24: The scheduled run, documented for three schedulers

**The tripwire is `cairn health` on a schedule, not a new subcommand.** The spec names the
subcommand as the tripwire and gives it the exit-code contract (spec, "Credentials, safety, and
the tripwire": "The tripwire is the subcommand", and "A scheduled routine sources the secrets
file itself, runs the command, and alerts on non-zero"). The spec's `cmd/cairn` section lists the
1.0 subcommands and carries no `tripwire` verb. So 1.0 adds no command here: it documents the
scheduled run for each platform, and every capability the run needs is already a flag on `health`
by Task 19 and Task 21.

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
    behind the binary's own `--timeout`. The example reads the three credentials from an
    `EnvironmentFile` the operator owns, and says why a scheduler cannot inherit a shell
    profile.
  - **launchd**, a LaunchAgent plist with `StartCalendarInterval`, `EnvironmentVariables` for the
    three values or a wrapper that reads them from the keyring, and `StandardOutPath` and
    `StandardErrorPath` so a failed run leaves a readable trace. launchd has no execution cap, so
    the example leans on `--timeout` and says so.
  - **Windows Task Scheduler**, a `schtasks /create` command with a daily trigger, run under the
    operator's own account so the Credential Manager entry is reachable, with `/ET` naming the
    execution cap. The example sets the three values as user environment variables with `setx`
    beforehand, or relies on `cairn auth set` having written them to the Credential Manager.
- Every example loops over the site ids, because 1.0's `health` takes one site at a time: `cairn
  sites --json --expect-sites N` first, then `cairn health <id> --json` per id. The loop is the
  scheduler's, not the binary's, and the doc says the multi-site sweep is 2.0.
- Every example alerts on any non-zero exit and names the four codes it may see, so an operator
  can route WARNING and CRITICAL differently if they want to. It alerts on a single run rather
  than after two consecutive ones. A day's delay on a real failure is worse than a false alarm.
- A green run is silent, per the watch-item rule. An alert names the failing site, the failing
  check ids, and each check's remedy anchor, and it never prints a credential or a verbose field.
- **Keeping the first run green is the acknowledgement feature's job, not a script's array.** The
  doc shows `--ack <check-id>=<YYYY-MM-DD>` and the `acknowledgements.json` file from Task 19,
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
  argv or shell history; run `cairn adopt --list`; adopt the four production sites; and confirm
  `cairn sites --json` lists four ids. The wrapper sources `~/.local/secrets` itself and asserts
  the three values are non-empty. Two of the four sites carry `p=none` DMARC records today, so
  the run carries a dated acknowledgement for each, naming the check id, the site, and the
  expiry.
- Falsify the guard on that installation: empty one credential in the service environment for one
  manual run, confirm the alert fires, restore it.
- `systemctl --user list-timers` shows the timer armed, and the task report shows it has fired
  unattended at least once with the real output pasted in, `--verbose` off. That first unattended
  green run is the acceptance evidence for the documented unit.
- Gate: `make -C tool check`. Commit the doc, and the dotfiles units in their own repository.

### Task 25: Pass B close

- The pass's verification run, against the four production sites Task 24's preamble adopted:
  `source ~/.local/secrets`, run `cairn health <site> --json` for each, and paste the non-verbose
  output into the pass report. It should show the two `p=none` sites acknowledged and WARNING on
  Email, and everything else honest. This is one operator's data proving the product, and the
  report says so.
- Run `code-simplifier` over `tool/`.
- Dispatch `go-architecture-reader` once per touched Go package: `health`, `logs`, `spine`,
  `render`, `logx`, and `cmd/cairn`. Six dispatches, never batched. Pass B touches no file in
  `secrets`, which Task 11 already read. The seams table
  pre-adjudicates every callerless export, so a finding naming one of those is answered by the
  table.
- Edit `docs/internal/what-cairn-is-and-is-not.md`: one paragraph naming the tool as the
  operator cockpit, which is spec decision 6. Acceptance: the paragraph names the tool, names its
  one job, and states that the tool holds no logic a view cannot call through the spine. This is
  a deliverable of this close task, ruled by the conductor on 2026-09-14, and not deferred to the
  docs rewrite.
- Run the reviewer fan-out: `web-auth-security-reviewer` over the credential handling and the
  scrub chokepoint, and `cloudflare-workers-reviewer` over the `providers` Cloudflare surface and
  the observability query. `svelte-reviewer` and `daisyui-a11y-reviewer` are not relevant here.
- Run the `cairn-pass` end ritual: the STATUS entry, the `CHANGELOG.md` line under `##
  Unreleased` for the corpus move if Pass A's line has since shipped, the ROADMAP entry for the
  Go tool marked at its 1.0 boundary with 2.0's scope named, and the sub-project 2 handoff line
  pointing at the spec's "Inputs for sub-project 2" plus this plan's cut list.
- **Amend the spec for whatever Geoff confirmed at his read.** Two contracts changed under the
  2026-09-14 ruling and were marked in the header as awaiting him: the exit codes, now the
  monitoring-plugin convention with the spec's exit 4 dropped, and the registry path, now
  `os.UserConfigDir` with the Node CLI's path as a fallback read. For each one he confirmed, edit
  `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md` in place, and record the
  amendment in `docs/internal/engine-rulings.md` if the ruling reaches beyond the tool. Also
  amend the spec's credential section, which says the tool never writes a credential: `cairn auth
  set` writes one to the OS keyring by the same ruling. Do not amend anything he declined; report
  it as an open item instead.
- If the simplifier changed code under `tool/`, reinstall the binary and record whether a
  `tool/v1.0.1` tag was warranted. If a `tool/v1.0.1` tag is cut, the release job fires again and
  its artifacts are checked the way Task 23 checked the first set.
- Record both budgets: tokens against the 10M ceiling, and attended time as a planning-miss
  count plus an execution-sitting count. Task 10 is one planned sitting and is not an execution
  sitting.

---

## Rollback and halt semantics

The 2026-08-20 plan carried no rollback section. This one does, modeled on the polish-C plan's
own, because a Go module's halt states are cheaper to reason about than an engine branch's and
should be written down.

Every task ends with the full gate green, so the branch is mergeable at each commit in both
passes. The tool ships from its own module and its own tag, so a halt costs no npm release
promise and blocks no consumer site. That is the difference from the engine's own passes, and it
is why neither pass needs a held cut.

Three orderings are load-bearing, and a resume must respect them:

- **Task 1 before Task 9 before Task 10.** Task 9 builds the credential input path on the cobra
  root Task 1 creates, and Task 10 mints and probes through that path. Task 10 dispatched first
  would read the environment directly and there would be no chokepoint for Task 19 to extend.
- **Task 3 before Task 6.** The corpus resolver in Task 6 reads files Task 3 creates. Task 6
  dispatched first would have nothing to resolve and would invent fixtures, which is the parity
  contract's whole failure mode.
- **Task 10 before Task 15 and Task 17.** The Builds permission question and the observability
  response shape both come out of the probe run. Task 15 dispatched first would guess at the
  Builds capability, and Task 17 would synthesize its fixture from documentation rather than from
  a real response's key set.

State at each halt point, so a resuming session knows what it has. After Task 3 the corpus
exists and the Node suite still passes. After Task 5 the registry reads and writes records. After
Task 8 the vocabulary is complete and no check exists. After Task 9 a credential resolves
through either provider and `cairn auth set` writes one. After Task 11 Pass A is closed and the
module is green on three platforms. After Task 17 every check exists with no CLI over them. After
Task 19 every action is reachable from the shell with raw output. After Task 21 the exit-code
contract holds and every output path is scrubbed. After Task 22 the tool is tagged and installed.
After Task 23 the release carries six binaries and `go install` works from a clean machine. After
Task 24 a scheduled run is documented for three platforms and Geoff's own timer has fired once.

A halt inside Pass B before Task 21 leaves a usable binary with no exit-code contract, so no
scheduled run may be armed early: a unit reading an exit code the binary does not yet promise
would alert on noise. A halt after Task 21 and before Task 22 leaves the tool running
from a working copy rather than a tag, which is honest and is reported that way rather than
described as 1.0. A halt after Task 22 and before Task 23 leaves a tag nobody outside this
checkout can install, so STATUS says 1.0 is tagged and not yet released. A halt after Task 23 and
before Task 24 leaves 1.0 released with no scheduled watch, which is the state to name explicitly
in STATUS, because a watch that exists only as prose is the weakest form.

If a second `fix` verdict lands on one task, that is the conductor's decision point and also the
signal to re-check the pass boundary. Pass B's own fallback cut is after Task 17, checks complete
and the CLI not yet written, and the remainder becomes `cairn-tool-B2`.

## Self-review

**Spec coverage.** Repo home, gates, and version stamping: Task 1. The 1.0 ADR and conventions
wiring: Task 2. The corpus: Task 3. `record`: Task 4. `store`: Task 5. `providers`: Tasks 6 and
7. `spine`: Tasks 8 and 18. Credentials: Tasks 9, 10, 12, 19, and 21. `health` and every check in
the spec's table, plus the `creds` check the spec's table does not name: Tasks 12 through 17.
`logs`: Task 17. Adopt: Task 18. `cmd` and exit codes: Tasks 19 and 21. The render seam and the
missing-credential disclosure: Task 20. The doctor relationship: Task 8's condition test and Task
20's remedy map. The 1.0 cut: Task 22. Distribution, which the spec put out of scope and the
2026-09-14 ruling pulled in: Tasks 1 and 23. The scheduled run: Task 24. Pass closes: Tasks 11
and 25. The spec's `ui` and `theme` sections and its `Chapter` type are deliberately uncovered
and are listed in the cut table. The spec's `secretRefs` reservation is covered as a round-trip
in Task 4 and as a 2.0 hand-forward, because no 1.0 check reads a per-site secret.

**Type consistency.** `providers.Credential` is the only credential type, consumed by Tasks 6, 7,
9, 10, 19, and 21. `secrets.Provider` is the only credential source, consumed by Task 9's
`loadEnv` and by nothing else. `spine.Outcome`, `spine.ReasonCode`, and `spine.Condition` are
consumed by Tasks 12 through 17 and 20. `health.Report`, `health.Clients`, and `health.Tier` are consumed by Tasks
19, 20, and 21. `record.Record` is consumed by Tasks 5, 12, and 18. `store.Entry` is consumed by
Tasks 19 and 20. `render.StatusState` is produced by Task 20 and populated by Task 19's
`loadEnv` result. `render.Verdict` is produced by Task 20 and set from Task 21's `ExitCode`.
`health.Options` and `health.Acks` are produced by Task 12, read by Tasks 17 and 21, and
populated by Task 19's flags. `internal/version` is consumed by Tasks 7, 22, and 23.

**Pass sizing.** Pass B carries fourteen tasks against Pass A's eleven, and fourteen is well
above the three-to-four-task segment count this workstation prefers per segment, which is why
Pass B names three segment boundaries and a fallback cut after Task 17. The count is deliberate
rather than accreted: six of the fourteen are check tasks, and four (22, 23, 24, 25) are the 1.0
obligations the old plan did not carry. The 2026-09-14 ruling is what added the fourteenth, Task
23, and it arrived as a split of the cut rather than as scope piled onto it. Pass A's eleventh,
Task 9, arrived the same way. Two splits in one revision is the point at which this workstation's
rule says to propose splitting the pass, so the proposal stands on the record: if a third task
splits during execution, cut Pass B at Task 17 and carry the remainder as `cairn-tool-B2` rather
than continuing.

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
   job. `make install` stays as the local path.

**The 2.0 hand-forward.** Task 25's handoff line names, as 2.0's own scope: the HUD (`ui` and
the full `theme` port), multi-site management with its concurrent sweep and the `errgroup`
dependency it will add, the two deferred ADRs, the `elm-conventions` fork, the TTY predicate, the
interactive adopt dialog, the `Chapter` type and its step mapping, a third secret backend behind
Task 9's seam (a file backend, `pass`, or 1Password through its CLI), resolution of the spec's
`keyring://` `secretRefs` references once a check needs a per-site secret, brew and a Windows
package channel and the npm shim, a cloud routine once a hosted spine exists, and `cairncheck`,
which joins only when a rule the spec names needs a custom analyzer.

## Sources

- `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`
- `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`
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
tasks followed: `7beb2014` (record renames and a key-set drift guard), `8ea19e9b` and
`8dd326d9` (the store path checks, spine slices exposed as functions rather than vars, the
version constant, and the junction proof), and `a7a709de` and `81e4d9fa` (the single
`secrets.Env`, surfaced `Resolve` errors, one credential table, and a module-wide sweep of
process citations out of Go comments).

**Known residual from the fold.** The drift guard `7beb2014` added has a known gap: its parse
side is four hand-maintained mirror slices, so a key added only to `Parse`'s switch still passes
the guard undetected. The single-source rewrite that closes this gap is filed to Pass B1's
opening task.

**What left the pass, and its destination.** The `providers` package's remaining duplication,
threading `context.Context` through every `providers` method, `State.Severity()` in `spine`,
and `record`'s single-source rewrite and three-file split all move to Pass B1's opening task.
`probe-token`'s private-verdict algebra, `discoverSites` moving into `store`, a typed exit
error, and a dependencies struct for the command constructors move to Tasks 19 and 21 of the
re-cut. The decision record for all of this is
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
turns uncounted. Of that: about 4.2M on Tasks 4 to 10 (every task from 4 to 8 and Task 10 took
one fix round; Task 9 took none); about 0.2M the simplifier; about 0.55M the seven architecture
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
