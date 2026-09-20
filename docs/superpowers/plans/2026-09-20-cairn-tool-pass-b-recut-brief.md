# Brief: re-cut Pass B of the cairn tool 1.0 plan (2026-09-20)

Plan: `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`. Pass A (Tasks 1 to 11) is
closing. This brief carries every decision the re-cut must fold in. Sources: Geoff's three
rulings of 2026-09-20, the seven `go-architecture-reader` reads at Pass A's close, and two
research audits of the same day (CLI practice; bubbletea v2 readiness). Plans state outcomes,
constraints, and acceptance criteria per task, never implementation code.

## Geoff's rulings (2026-09-20), binding

**Pre-approved (Geoff, 2026-09-20 10:06): "I'm pre-approving the recut."** The re-cut authored
from this brief needs no further plan-approval read before B1 executes, provided it stays inside
this brief. The three-lens plan review still runs on it. Anything the re-cut adds beyond this
brief is outside the pre-approval and goes back to Geoff as one combined question.

1. **Color and the TTY predicate: one predicate.** The module-wide ban on `term.IsTerminal` and
   `os.Stdout.Stat()` was written to keep a dead TUI launch gate (`shouldLaunchTUI`) out of 1.0.
   That reason does not reach color. Exactly one TTY check is allowed, in the render package's
   profile-detection file and nowhere else. `NO_COLOR` (present and non-empty) and
   `--color=auto|always|never` override it; `TERM=dumb` and a non-TTY mean no color. The ban on
   a TUI launch gate stays, and bare `cairn` still prints help unconditionally. The grep tests in
   Tasks 9 and 19 narrow to allow that one file. `loadEnv` is the only code that reads the
   environment, so it carries `NO_COLOR` and `TERM`.
2. **Pass B splits into B1 and B2.** B1: the opening refactor task, then the checks and logs
   (Tasks 12 to 17). B2: the CLI surface (Tasks 18 to 25) with the CLI amendments. Each gets its
   own token ceiling, checkpoint interval, segments, and close. Both run through
   `pass-execute.js`; the header is the opt-in.
3. **Grammar: full cleanup.** `cairn sites list` with bare `cairn sites` as an alias.
   `adopt list` as a distinct non-writing subcommand replacing the `adopt --list` mode flag.
   Hidden `probe-token` becomes `auth probe`, and `auth unset` is added so a rotated token's
   stale keyring entry can be cleared. `health <site>` and `adopt` keep their shape.

## Who authors the re-cut (Geoff, 2026-09-20 12:04)

"Stop after the ritual and hand the re-cut to B1." Pass A's session closes at its ritual and does
NOT author the re-cut. The fresh B1 session's FIRST step is plan authorship, in this order:

1. One agent re-cuts `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md` from this brief
   into Pass B1 and Pass B2 (each with its own ceiling, checkpoint interval, segments, and close),
   and appends the dated addendum to the 2026-08-20 spec. Pre-approved by Geoff, within this
   brief's bounds (above).
2. The three-lens plan review (contract-and-criteria, mechanics-and-feasibility, domain-risk) in
   parallel, then one fold dispatch.
3. **A factual pre-flight before each segment launches** (the `cairn-pass` skill's execution
   discipline, added 2026-09-20): one cheap agent lists every checkable claim the segment's tasks
   make about existing code and checks each at HEAD. Pass A paid a full fix round for five such
   claims in seven tasks.
4. Then execute B1.

Two mechanics changed on 2026-09-20 and both apply to B1 and B2:

- **The Go gate takes the light lane.** Every `tool/`-only gate is
  `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. It has its own lock and a 3G cap,
  so it no longer queues behind another session's browser gate, which cost Pass A roughly two to
  three hours. Tasks that also run the Node gate (Task 17) use the default heavy lane for that
  half. Keep skipping `scripts/checks/gate-tier.mjs` for `tool/`-only diffs until it gains a
  `tool/**` rule (filed at Pass A's close).
- **Arm `/loop` at launch.** A network drop left Pass A's conductor unwoken for five hours. Start
  `/loop` with no interval as soon as the first workflow is running
  (`~/.claude/docs/unattended-work-guards.md`).

## Branch topology and the merge (Geoff, 2026-09-20 10:09)

Geoff first authorized merging PR #60, then moved it: "extend-2 will be running for a while. You
can add the merge to the next pass." So Pass A closes WITHOUT a merge, and the merge belongs to
B1:

- B1 runs in the existing worktree `.claude/worktrees/cairn-tool-a` on branch `cairn-tool-a`.
  It does NOT branch from `main`: `main` carries no `tool/` tree until the merge. PR #60 stays a
  draft and accumulates B1's commits. One executor per worktree still holds; verify it is idle
  before dispatching.
- B1's close task carries the merge: merge `main` into `cairn-tool-a` (extend-1 merged as PR #66
  on 2026-09-20 and extend-2 is in flight, and all three passes write `CHANGELOG.md`,
  `docs/STATUS.md`, and `ROADMAP.md`, so expect conflicts there and keep every pass's entries);
  retitle PR #60 to cover Pass A and B1; take it out of draft; wait for every check green at the
  final SHA, the three `make check` legs and the Node suite; merge; confirm `main` carries
  `tool/`. Never merge over a red check. Coordinate with the extend-2 conductor if it is mid
  close on the same three files: two conductors never both run a close on one branch, and a
  merge into `main` while another pass is merging is the contended moment.
- B2 then runs on its own worktree off `main`, the ordinary case.

## B1 opening task (new; runs before Task 12)

One refactor task over packages Pass A accepted, before any check is built on them. No behavior
change except where stated. Deliverables:

- **`context.Context` through `providers`.** Every exported `providers` method takes `ctx` first;
  requests use `http.NewRequestWithContext`; the 15 s budget derives from
  `context.WithTimeout(ctx, requestTimeout)`; `Probe` stops building its own context from
  `context.Background()`. Reason: bubbletea has no per-Cmd cancellation, so a threaded context
  is the 2.0 HUD's only lever, and after Pass B this is a signature break across every check.
- **The `providers` deduplication** from the architecture read: `client.Do` calls the shared
  retry function rather than carrying a copy (and the function lives in `transport.go`); one raw
  GET helper replaces three request preambles, with a form that returns headers for
  `TokenExpiry`; one `reasonForStatus` replaces two hand-synced status switches; `NPMError`
  gains a `Reason`; `newClient` takes its `RoundTripper` as a parameter; `errors.go` keeps
  `Reason` and `reasonForStatus` while the Cloudflare-only pieces move beside their envelope;
  the dead wire fields (`resultInfo.Page`, `v4Error.Message`) and the two vacuous `Missing` tests
  go; `APIError` and `GitHubError` share one small interface so `cmd/cairn` has one verdict
  function; a nil resolver in `NewProbe` means `net.DefaultResolver`.
- **Severity lives in `spine`.** `spine.State`'s iota is `Unknown=0, OK=1, Failing=2`, which is
  not severity order. Add `State.Severity()` (Failing above Unknown above OK) with a table test,
  and one translation from `providers.Reason` to `spine.Outcome`. A test asserts exactly one
  severity table exists under `tool/`. `probe-token`'s private `verdict`, `reasonLevel`,
  `precedenceRank`, and `combineLevel` are deleted in favor of it. `ExitCode`'s own mapping stays
  in `cmd/cairn` (Task 21), since acknowledgements and `Degraded` enter at report level.
- **`record`'s single-source rewrite.** One table per typed object from which the parse path, the
  marshal path, and the key order all derive. It must absorb the four hand-maintained
  `parsed*Keys` mirror slices the Pass A drift guard added, closing the guard's one residual gap
  (a key added to `Parse`'s switch alone passes today). Then split `record.go` into `record.go`
  (doc and types), `parse.go`, and `marshal.go`. Every byte-equal round-trip test, the
  reflection test, and the sentinel test pass unchanged.

- **Carried nits from Pass A's fold reviews** (all non-blocking, all small; take them in this
  task since it already touches each file): `store.Open`'s doc comment names only a symlink and
  ownership, and it now also refuses a Windows reparse point; `Open`'s inline `ModeSymlink` test
  is redundant now that `checkNotReparsePoint` runs first; `perm_windows_test.go` shadows the
  builtins `print` and `real`, and uses the pre-generics fixed-array cast where `unsafe.Slice`
  says the same thing; the `providers` package doc still says "as later tasks add them", a
  process citation the comment sweep's four patterns missed; `secrets.ResolveError.Error()`
  formats the wrapped provider error with `%v`, so a backend that tainted its error text would
  still expose it to a caller printing the error (the display path is safe; make the error
  string safe too); `env.value(name)` silently returns empty for a secret variable, where a
  split accessor would make a wrong call a compile error; `Provider.Get`'s doc says `Resolve`
  wraps with `%w` while it now returns a `*ResolveError` with `Unwrap`.
- **The Windows leg's per-test proof is not durable.** `go test` runs without `-v`, so a skip is
  invisible and the junction test's proof rests on an unreferenced job log. Decide here whether
  the Windows leg runs the `store` package verbosely.

## Amendments to existing tasks

- **Task 12 (health skeleton):** either add an ordered `Fields` beside `Outcome.Detail` (same
  shape as `record.ExtraField`), or state in the 2.0 hand-forward that `Detail` being a
  pre-formatted string is a known reshape for the HUD's detail view. Prefer the first if cheap.
- **Task 17 (logs):** `logs.Entry.Fields` is an ordered slice, not a map, with values left
  unparsed as `json.RawMessage`. A map makes any golden over it nondeterministic. State the
  `--since` value grammar, shared with `health`.
- **Task 18 (adopt):** `adopt list` is a plain non-writing function over `Discover`.
- **Task 19 (cobra tree), B2's largest task; state its deliverable count plainly:**
  the grammar ruling above; shell completions (keep cobra's default `completion` command; a
  `ValidArgsFunction` over registry ids for `health` and `logs`; a flag completion for
  `logs --event`, which reconciliation row 15 already assumes and no task produces); the reserved
  short flags `-v`, `-t`, `-V`, and `-q` (the Monitoring Plugins guidelines reserve them, and the
  tool adopts that convention); `-q/--quiet`, printing only on a non-OK result;
  `signal.NotifyContext` for SIGINT and SIGTERM on the root context, cancellation exiting UNKNOWN
  (this also fixes Ctrl-C during `auth set` leaving terminal echo off); a stdin path for
  `auth set` when stdin is not a terminal (an error fallback on the no-echo read, not a TTY
  query), documented as `printf %s "$v" | cairn auth set NAME`; the prompt reads from an
  injectable stream; `--ack-file` with the default path documented; an `Example:` on every
  command; `discoverSites` moves into `store` as the one registry query every command shares;
  the five constructor parameters on the probe command become one dependencies struct.
  If this count makes Task 19 unworkable as one task, split it in the plan, not at dispatch.
- **Task 20 (render):** the profile-detection file and its one predicate, per ruling 1;
  `RenderInput` gains `Height` and `Dark`, and `Profile` is the full enum (truecolor, ANSI-16,
  no-color), since the cost is the golden corpus and this is the task that creates it; the
  default render width when none is passed is stated (80 unless `--width`); the glyph tier
  (Unicode or ASCII) and Windows virtual-terminal handling are ruled here, not guessed; the
  purity test names its forbidden imports (`os`, `golang.org/x/term`, color-profile detection)
  rather than the category "any terminal package", so a later pure lipgloss v2 import does not
  trip it; `--json` output gets a documented shape under `tool/docs/reference/`, a
  `schemaVersion` field, and a golden.
- **Task 21 (exit codes and scrubbing):** usage errors exit UNKNOWN (3), stated in the task and
  in `exit-codes.md` as the monitoring convention chosen over `sysexits.h` on purpose, with
  `--json` as a script's discriminator (a usage error emits none); `--help` and `--version` exit
  0, recorded as a deliberate deviation from the monitoring guidelines; errors print with a
  `cairn: ` prefix; a `SetFlagErrorFunc` appends a "run 'cairn X --help'" hint; `auth probe`
  returns a typed coded error that `main` maps, so there is one exit path; the writer grep
  extends to `os.Exit` below `main`; the per-request versus whole-run timeout arithmetic is
  stated so an operator can size `RuntimeMaxSec` and Task Scheduler's limit; under `--verbose`
  only, one stderr line per check as it completes.
- **Task 22 (the 1.0 cut):** the command-set assertion expects `completion` and `help` beside the
  tool's own commands, with the renamed grammar; `--version` uses cobra's `Version` field and
  carries the Go version and GOOS/GOARCH; a man page through cobra's doc generator is either
  added or recorded as a decision not to; README states the registry precedence and the
  "remove the legacy directory to migrate" rule, and that the tool makes no update check.
- **Task 23 (release artifacts):** build-provenance attestation on the release artifacts and a
  verification line in README, since checksums in the same release give integrity, not
  authenticity.
- **Task 24 (scheduled run):** the three scheduler examples use `--quiet`, so a green run really
  is silent and cron sends no mail.
- **Seams table and "2.0 hand-forward":** name `State.Severity()` and the threaded context as
  seams the HUD depends on.

## Declined or recorded, so nobody re-argues them

- Positional `health <site>` stays, against the monitoring guidelines' preference for flags;
  POSIX, clig.dev, `gh`, and `kubectl` all accept a primary operand. Record it in
  `exit-codes.md`.
- No environment equivalents for common flags (`CAIRN_TIMEOUT` and the like). Leanness; recorded
  as a decision.
- The registry lives under the config directory although XDG would call it state. Compatibility
  with the Node CLI's location is the reason and it stands.
- `store.Dir` keeps its injected `config` parameter; `Source` stays (it gains its 1.0 caller in
  `sites list`); `List` keeps `[]error`; `spine` keeps its dependency on `providers`;
  `Missing` stays in `providers`; `Corpus` and `NPM.Versions` stay exported.

## 2.0 spec addendum (append to `docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`; do not rewrite the spec)

A dated addendum listing what a HUD plan must correct before planning from the spec:
`charm.land/{bubbletea,lipgloss,bubbles}/v2` module paths; `App.View()` returns `tea.View`, with
alt-screen and mouse mode declared per frame rather than as program options; `Frame` gains
`Cursor *tea.Cursor` at the HUD pass, hoisted at the root; the sweep is `tea.Batch` of per-site
Cmds or a channel-reader Cmd, because one Cmd yields one Msg, each carrying `gen` and a context;
the HUD handles `tea.KeyPressMsg` only, with `key.Binding` and `key.Matches`; `WindowSizeMsg` is
both acted on and forwarded to children; the teatest sentence is wrong as written (poplar
requires teatest directly and keeps it for one end-to-end flow test; goldens go through the
harness); screen registration by `init()` conflicts with this plan's literal-slice rule, so state
the exception with its analyzer or use a literal slice; a very-wide rung and a too-small floor
for resize; the log screen names bubbles v2 `viewport` and its setter API; the accessibility
contract (the CLI is the screen-reader path, since every HUD action has a subcommand;
`NO_COLOR`, `TERM=dumb`, and non-TTY handling; reduced motion for the refresh spinner); rule the
adopt dialog's component (bubbles `list` preferred over `huh`); the registry is re-listed each
sweep and `store.List`/`Load` are never called from `Update` or `View`. Generation-counted
refresh is a house idiom poplar already runs, not a Charm-documented pattern; say so.
