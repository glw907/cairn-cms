# Pass 3 `commands`: help, errors, lists, and the light-terminal variables

Initiative: cairn-setup
Round: tui-language
Pass: 3 commands

This pass moves `cairn --help`, the error printer, `cairn sites`, `cairn auth list`,
`cairn auth check`, `cairn adopt list`, and the `auth` and `adopt` receipts onto the shared
terminal language. It adds the two approved Decides: body text in the terminal's own foreground,
with `--theme`, `CAIRN_THEME`, and `COLORFGBG` choosing the ground, and `CAIRN_PLAIN=1`. It closes
debt items C1 to C11, less the `new_*.go` items. No pipe output changes, except one sentence
naming `CAIRN_PLAIN` in `cairn --help`, by ruling (Decision 7a). The design is
`~/Projects/initiatives/cairn-setup/specs/2026-11-13-tui-language-design.md`, approved through
design packet `20261113-224909-04cfc7`. The debt read is
`~/Projects/initiatives/cairn-setup/research/tool-debt-read-2026-11-13.md`. The frames are
`~/Projects/initiatives/cairn-setup/research/command-mockups/commands.html`. Worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/tui-language-3`, branch `tui-language-3`,
cut from `origin/tui-language-2` at `a81a69096` (pass 2's PR-ready head, PR #247, review accept,
`Calls: 12`). Class `ordinary`. Planned path 210 minutes against the design's 150 (see
"Planning misses").

The pull request targets `main`. Until #247 merges, its diff carries pass 2's commits too; the
fast lane and every `git diff` in this plan use the base `a81a69096`, never `main`. The
differentials of items 5 and 6 are the one exception: their items name `main`, so their base
binary is built from `main` itself, `git merge-base HEAD origin/main` (`ef9e37206` today, before
pass 2). Pass 2 proved its pipe bytes equal to `main`, so the two bases agree on every pipe.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a permission
rule. The `gh --help` and `gh repo list` frames for item 10 use the host's existing `gh` sign-in.

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 68 rows, 2026-11-01 to 2026-11-15). Classes and row
  counts: Self-Modification 10, unexplained classifier 10, Interfere With Workloads 9, Classifier
  unavailable 7, Merge Without Review 3, Auto-Mode Bypass 3, Destructive or Unwanted Actions 3,
  Irreversible Local Destruction 2, Git Destructive 2, Create Public Surface 2, Unverifiable
  Deletion Scope 2, Sensitive-Source Provenance 2, Security Weaken 2, Undermining Oversight 2,
  Production Deploy 1, Secret-Store Writes 1, DNS/Domain/Cert 1, Bot Check Circumvention 1, Code
  from External 1, Shared Scratch Sweep 1, Safety Bypass Flag 1, Out-of-Place Publication 1, PII
  Data Handling 1. The pass writes only repo files under `tool/`, `docs/`, `CHANGELOG.md`, and
  `MIGRATION-NOTES.md`, no `.github/` or `.claude/` path, and no credential.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), folded under "Plan review fold".
  The class needs none; the round asks for one.
- Evidence: the mechanism table below. Every row is a probe run at `a81a69096` on 2026-11-14 or a
  quoted source line. `git diff --stat a81a69096...origin/main -- tool` prints nothing, so the
  merge of `origin/main` before review moves no file this plan cites.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process. A hung command runs under `timeout`. A busy port 49152 is waited out. A pty test signals only the child it started. |
| Irreversible Local Destruction (`git reset --hard`) | Never. The base binary for T6 comes from a `git worktree add --detach` checkout under `$CLAUDE_JOB_DIR/tmp`, removed with `git worktree remove`. |
| Code from External (`go run ...@latest`) | Tools come from the Makefile and `go.mod` only. This pass adds no module. |
| Safety Bypass Flag (`--no-verify`) | Never. A failing hook is a defect to fix. |
| Destructive (setup command compounded and piped to `tail`) | The setup command runs bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Shared Scratch Sweep | Scratch goes under `$CLAUDE_JOB_DIR/tmp/<task>`, never a glob delete over `/tmp`. |
| Create Public Surface | The pass opens one draft PR against `main` on its own branch and creates no release, tag, gist, or repo. |
| Merge Without Review (`gh pr merge`) | The executor never merges. The conductor lands the pass or holds it for the round's close packet. |
| Auto-Mode Bypass (`gh workflow run`) | CI runs from the push. Never trigger a workflow by hand. |
| Classifier unavailable | Retry the same call once after a pause. |

### Port 49152

`make -C tool check` binds `127.0.0.1:49152` in the loopback tests, and a live `cairn new` proving
run holds the same port. Before every `make -C tool check` and every `go test ./...`, run:

```sh
ss -ltnH 'sport = :49152'
```

Empty output means the port is free. Any line means a proving run is live: wait with a `Monitor`
until-loop on the same command, never stop the holder.

## Mechanism table

| Mechanism | Evidence at `a81a69096` |
| --- | --- |
| Fang passes its scheme function `lipgloss.LightDark(HasDarkBackground)` | Fang v2.0.1 `mustColorscheme`. cairn's scheme function ignores the `pick` argument and closes over cairn's own resolved ground. |
| Fang's help and error writers detect the profile from the environment | `colorprofile.NewWriter(out, os.Environ())` in Fang. A scratch test (deleted) with `CLICOLOR_FORCE=1` got `38;2;...` under `COLORTERM=truecolor`, `38;5;...` under `TERM=xterm-256color`, and ANSI16 under `TERM=xterm`, all into a `bytes.Buffer`. Probed on Linux only. |
| A `lipgloss.NoColor{}` field paints no SGR for that cell | Same probe: Base, Description, Argument, and Program at `NoColor{}` left no colour code. |
| Fang's own downsample differs from the theme's named rungs | Fang took Accent `#9d84ec` to 141 and to ANSI16 94, Muted to 248 and 37. The theme names Accent 141 and slot 5, Muted 246 and no slot. The new scheme takes each colour from `style.Theme.Color` at the detected profile. |
| Today's help scheme | `cmd/cairn/fang.go:19-39` maps Title, Flag, and Command to `RoleAccent` through `style.Pair` (its one caller, `fang.go:20`). `executeThemed` (68-75) runs plain cobra when stdout is not a terminal or colour is off (the branch at 69-71). `colorArg` (80-90) pre-parses `--color`. `fangExecute` 98-105. Fang's `mustColorscheme` reads the ground only when stdout is a terminal (`theme.go:116-121` in Fang), so under `go test` today's scheme always picks light. |
| cairn's own detection ignores Fang's variables | `style.Detect` (`detect.go:53-58`) gives ASCII and no colour when stdout is nil; `detect` (`detect.go:85-106`) reads `TERM` and `--color`, never `COLORTERM` or `CLICOLOR_FORCE`. A help test that forces only Fang's writer gets a scheme of `NoColor{}`. |
| Accent's downsample through colorprofile v0.4.3 | Probe: dark `#9d84ec` gives `38;5;141` and ANSI16 `94`; light `#7246cf` gives `38;5;62` and `94`. The theme's own rungs are `38;5;141` and `38;5;97`, ANSI16 slot 5 (`35`). |
| No help golden exists | `ls cmd/cairn/testdata` finds no directory. |
| The Text role today | `internal/style/palette.go`: RoleText `{"#28231d","#eae7e3","235","255",""}`. `noInk` (palette.go:111) gives `NoColor{}` only at no colour or at ANSI16 with no slot. |
| What the Text change moves | Files holding `38;2;234;231;227`: `cmd/specimen/testdata/specimen.golden` 1, `internal/render/testdata/golden/` doctor 2, logs 10, many 45, single 41, `internal/ui/newview/testdata/frame.golden` 1. `38;5;255`: doctor 2, single 3. Light `38;2;40;35;29`: single 1. |
| `newview` paints Text outside `theme.go` | `g.Para(RoleText, ...)` in `stop.go:10`, `browser.go:144-157`, `welcome.go:15-27`, `done.go:19-49`, `summary.go:170-248`; `theme.go:49` builds `style.NewTheme(dark, p, false)`, `:50` `s.Text = s.Style(RoleText)`, `:58` `s.Title = s.Strong(RoleText)`, `:118` `f.TextInput.Text = p.Text`. A pin at the call sites would leak, so the pin goes where `theme.go` resolves a role. |
| Golden regeneration | `make -C tool golden` runs `go test ./internal/render -run TestGolden -update`. The specimen golden regenerates with `go test ./cmd/specimen -run TestSpecimenGolden -update`. `make -C tool copy-list` rewrites `testdata/copy.golden.md`. |
| The error block exists | `style.ErrorBlock(t, what, why, fix, width)` (`blocks.go:195`): the Failing mark at the margin, `what` in bold Text, `why` muted, then `FixLine`. `FixLine` with empty text returns nil, so an error with no fix draws no arrow. |
| A panicking transport reaches `runTree` | `RoundTrip` runs synchronously with no recover (`net/http/client.go:266`; none in `providers/transport.go`), and `runTree`'s recover is at `main.go:108-113`. |
| The fixtures cannot draw `adopt list` | The differential fixture holds no credential (`reporte2e/fixture_test.go:26-28`), so `adopt list` returns at `adopt.go:74-76` with empty stdout. The shot fixture's `cloudflareFake` (`shots_linux_test.go:193-240`) has no `/accounts/{id}/workers/domains` route, so `adopt.Discover` errors on its second call. |
| A fifth styled path | `writePasteNotice` (`report_terminal.go:69`) checks terminals directly. `showsProgress` is `report_terminal.go:98`. |
| Tests that pin Text and the exports | `style/palette_test.go:237-238` pin Text's light and dark hex; `TestContrastAgainstGround` (`:83`) walks the roles; loops run `for role := RoleText; role <= RoleRule` (`:169`); `TestEveryExportHasACaller` (`callers_test.go:63`) fails on an export with no caller. The purity test skips `internal/style` (`purity_test.go:104-112`). Every newview paint goes through `Styles.Style`, `Strong`, `Fg`, and `Link` (`theme.go:69-79`, `grid.go:97`). |
| Errors print in one place | `runTree` (`main.go:107-133`) prints `translateError(err)` to `errOut`, the scrubbed writer, and the recovered panic prints `commandCrashedMessage(...)` the same way. `d.stderr` is the raw `*os.File` (`deps.go:69`) for terminal detection only. |
| The translated-error seam | `translatedError struct{ error }` (`messages.go:38`); `translateError` (707) returns one as it is, else `fallbackError` (`"cairn: %v"`, 695). |
| Errors holding a Run line | `grep -n '\\nRun `' cmd/cairn/messages.go` finds 22, and misses lines built by concatenation such as `messages.go:343`: tmplFlagError 87, tmplUnknownCommand 98, tmplAuthNoSubcommand 108, tmplUnknownSite 291, tmplHealthTooManyArgs 310, tmplDoctorTooManyArgs 352, tmplAdoptListRouteOnly 401 (a notice), tmplAdoptNoDomain 412, tmplAdoptNoWorker 420, tmplAdoptUnknownWorker 429, tmplNoCloudflareCredential 449, tmplNoCredentials 647 (C1, deleted), tmplNewRequires 765, tmplNewConflict 773, tmplNewBadPosture 802, tmplNewUsage 843, tmplNewUnfinished 859, tmplNewSeveralUnfinished 867, tmplNewNoSetup 875, tmplNewNoRunForPlan 883, tmplNewPlanUnreadable 891, tmplNewBadEmail 910. This is a floor (see T4). |
| The three error frames | `commands.html` "A refusal, and a crash": `cairn healt` (tmplUnknownCommand), `cairn logs my-site --since tuesday` (tmplInvalidSince, whose second line opens `Use`, so no arrow), and a crash in `cairn health` (tmplCommandCrashed, whose second line opens `This is a bug`, so no arrow). The frames' wording and the arrows on the last two are placeholders. |
| No crash trigger in a release build | The only `cairne2e` files are `internal/secrets/keyring_e2e.go` and `cmd/cairn/new_e2e_hook.go`. A tagged hook needs a seam in release code, the fault C9 names. |
| The differential harness | `internal/testharness/reporte2e/diff_test.go`: gated on `CAIRN_E2E_BASE_BIN`, `runPipe`, `runAll`, `maskClock` (`checked: ` spans to `<clock>`). Skips on CI. |
| The pty harness | `internal/testharness/reporte2e/pty_linux_test.go`: `openTerminal`, `screenOf` through `vt.NewEmulator`, `start(t, f, stdout, stderr, overrides, args...)` (137) wires stdout and stderr separately, `showsProgress`, `TestReportE2EProgressLineAbsent` (283). |
| The file bound | `TestNoCommandFileExceedsItsBound` (`root_test.go`) bounds every non-test file at 300 and exempts `messages.go` only. Today: `root.go` 298, `new_terminal.go` 298, `health.go` 273, `env.go` 266, `probe_token.go` 263, `health_sweep.go` 256, `adopt.go` 233, `auth.go` 231. |
| None of the three variables is read | `grep -rn 'CAIRN_THEME\|COLORFGBG\|CAIRN_PLAIN' tool --include='*.go'` prints nothing. |
| Docs that list flags and variables | `docs/admin/credentials.md` and `docs/admin/tripwire.md` list `CAIRN_CF_READ_TOKEN`, `--width`, `--quiet`. No admin page lists `--theme` or `NO_COLOR`. `make -C tool reference` writes `docs/admin/setup-reference.md` from the cobra tree. |

## Scope

The pass row is `tool/cmd/cairn/**` except `new_*.go`, `tool/internal/style/**` and
`tool/internal/ui/newview/theme.go` for the Text role only, `tool/testdata/copy.golden.md`,
`docs/admin/**` where a flag or variable is listed, and `CHANGELOG.md`.

Out-of-row paths this pass writes, one `[file-list]` call (Decision 1):

- Regenerated goldens only: `internal/render/testdata/golden/**`, `cmd/specimen/testdata/specimen.golden`. Never `internal/render/testdata/json/**` and never a plain golden.
- `internal/testharness/reporte2e/*_test.go`: the item 4 pty test and the item 5 and 6 differentials.
- `tool/docs/design/terminal-standard.md` (the `CAIRN_PLAIN` ruling names "the standard") and `tool/docs/design/copy-standard.md` (standing answer 5).
- `MIGRATION-NOTES.md`.

The pass touches none of `tool/internal/setup/{loopback,signin,runner}*`, `tool/internal/secrets/**`,
or `tool/internal/providers/**`; a task that needs one parks the pass, because that would change the
class to `auth-data`. It touches no `.github/**` path. No file named `new_*.go` is edited, and
`new.go` is left alone as an installer command file (C9).

New files, named up front so item 9 holds: `cmd/cairn/auth_check.go` (renamed from
`probe_token.go`), `cmd/cairn/auth_check_terminal.go`, `cmd/cairn/errors_terminal.go`,
`cmd/cairn/lists_terminal.go` (sites, auth list, adopt list, and the receipts), and the help
goldens under `cmd/cairn/testdata/help/`.

## Decisions made at planning

1. `[advisor]` `Call:` `[file-list]` The out-of-row paths under "Scope". Render and specimen goldens move only because the Text role loses its ink; each regenerated golden equals the base golden after stripping `\x1b\[[0-9;]*m`, which T2 checks. The harness tests live where the harness is. The two standards and `MIGRATION-NOTES.md` are the docs the rulings and standing answer 5 name. Passed over: park the pass for a wider row. Reversing it drops the Text change, the item 4 and 5 and 6 tests, and the docs.
2. `[advisor]` C10 against item 9. A full fold of permissions and probes into `auth_check.go` runs to about 408 lines. The pass renames `probe_token.go` to `auth_check.go`, folds `probe_cloudflare.go` and `probe_github.go` into `permissions.go` with the probe in each row (which is C2), moves `completeSiteIDs` to `args.go`, merges `agent_page.go` into `help_agents.go`, and writes the terminal view in `auth_check_terminal.go`. The bound test becomes 280 for every non-test file, exempting `messages.go`, with `new_*.go` kept at 300. Passed over: one 408-line file over the bound. Method call.
3. `[advisor]` `Call:` The arrow's scope is literal. Only an error whose message holds a `Run` line moves onto the fix type. A `Use ...`, `Set ...`, `Pipe ...`, `Report it at ...`, or `The names are ...` line stays in the message and draws no arrow. The crash and `--since` frames show arrows, and those arrows are placeholders under design line 111 ("moves each `cmd/cairn` error whose message holds a 'Run' line onto it ... The arrow appears only on an error of that type"). Passed over: widen the type to every next-step line. Reversing it moves five or six more templates onto the type, splits their copy-list entries, and adds arrows to their shots.
4. `[advisor]` An untyped error on a terminal still prints as an error block: the `cairn: ` prefix is stripped, the first line is the bold headline, and the rest is muted. No message is parsed for a fix. Method call under design line 111.
5. `[advisor]` Constructor signatures stay, so no `new_*.go` call site changes. The ten `tmplNew*` templates move onto the fix type inside their `messages.go` constructors.
6. `[advisor]` `tmplAdoptListRouteOnly` is a notice written to stderr, never a returned error, so it stays text, unchanged on every stream. Method call; design line 111 covers errors.
7. `[advisor]` `CAIRN_PLAIN=1` means "not a terminal" for styling, through one predicate that every styled path reads: the report detector (`detectTerminal`), the progress line (`showsProgress`, `report_terminal.go:98`), the paste notice (`writePasteNotice`, `report_terminal.go:69`), help (`executeThemed`), and the error printer. Under plain, each passes nil streams to `style.Detect` and `IsTerminal`, so plain is the pipe path byte for byte, never a terminal with its TTY bit cleared. Under it help is plain cobra output and errors print today's bytes. This refines the ruling's "plain body on terminal, progress line off, no new renderer" to every styled surface, since a screen-reader user meets help and errors too.
7a. `[advisor]` `Call:` The one pipe output that changes is `cairn --help`, by ruling: "add `CAIRN_PLAIN=1`, documented in the standard and in `cairn --help`" (design line 63). `longRoot` (`messages.go:75`) gains one sentence naming `CAIRN_PLAIN` alone; `CAIRN_THEME` and `COLORFGBG` go in the docs only, since no ruling puts them in help. Passed over: the docs only, with no `longRoot` edit, which keeps every pipe byte but departs from the ruling. Reversing it drops one sentence and its copy-golden entry.
8. `[advisor]` `Call:` Ground precedence: `--theme` > `CAIRN_THEME` > `COLORFGBG` > dark. `COLORFGBG` reads its last field; `7` or `15` means light, any other number dark. An unknown `CAIRN_THEME` value or an unparseable `COLORFGBG` is ignored, never an error, while an unknown `--theme` keeps its error. Passed over: error on a bad variable. Reversing it adds two error templates and their copy entries.
9. `[advisor]` One function resolves the ground and the plain flag, in `report_terminal.go`, since `root.go` has no room under the bound. Reports, help, and errors call it.
10. `[advisor]` The Text pin. `style` gains one exported role, `RoleInstallerText`, carrying today's Text pair, with `newview/theme.go` its one caller, through the function where `theme.go` resolves a newview role. A `// WATCH:` comment on the constant says the installer round removes it. Design line 123 names the pin. Passed over: a colour literal in `newview`, which the purity test forbids.
11. `[advisor]` `cairn auth set` keeps its prompt on `term.ReadPassword`; only the label lines around it take the language. Receipts are the mark plus today's text, with no new strings: `● CAIRN_GH_READ_TOKEN stored in the keyring`. The adopt receipt keeps today's wording. Method call; the frames' receipt wording is placeholder (standing answer 5).
12. `[advisor]` The crash case. Item 1's crash shot comes from the compiled test binary (`go test -c -tags cairne2e -o $CLAUDE_JOB_DIR/tmp/cairn.test ./cmd/cairn`) running one test gated on `CAIRN_CRASH_SHOT=1` in kitty. The test calls `runTree` with `d.stderr = os.Stderr`, `errOut = os.Stderr`, and a `d.transport` whose `RoundTrip` panics, under `cairn adopt list`, which reaches `adopt.Discover` (`adopt.go:79`) outside `health.Run`'s recover. `RoundTrip` runs with no recover, so the panic reaches `runTree`'s recover (`main.go:108-113`). The test sets a Cloudflare token and account id in `d.env` and a one-site registry, or `adopt list` returns before any transport call (`adopt.go:74-76`). If the panic does not reach `runTree`'s recover, the executor picks another deps field the command calls outside a recover and says which. The grader is told the trailing `PASS` line is the test runner's, and the crash line names `cairn adopt list` where the frame says `cairn health`. Passed over: a `cairne2e` hidden command, which needs a seam in release code. `Call:` because it amends item 1's check.
13. `[advisor]` The help golden sets the profile in two places, since they detect apart. cairn's scheme takes its colours from a `style.Theme` built at an explicit profile and ground, which the golden test passes to `fangExecute` (cairn's `detect` reads `TERM` and `--color` only, and a nil stdout gives ASCII). Fang's writer gets the same profile through `CLICOLOR_FORCE=1` with `COLORTERM=truecolor`, `TERM=xterm-256color`, or `TERM=xterm`, probed on Linux only. If the Windows leg resolves a different profile, the test skips there with `runtime.GOOS` and the PR says so; macOS and Linux carry the item. This adds a parameter to an unexported function, no export.
14. `[advisor]` C1's four errors are deleted, so item 6's table lists them as removed. An error that stays live but that no fixture reaches (the broken-keyring ones) gets its `Error()` bytes captured in a table test before T4 changes it, and the same test asserts them after.

Pass 2's `[advisor]` lines this plan builds on: "Underline colour dropped from the doc link" (the
render goldens T2 regenerates already carry it) and "`sites` puts a credential's detail under the
name" (T5 keeps that credential block as pass 2 built it). If Geoff overturns either at the close,
T2's golden regeneration and T5's sites shot rerun.

## Standing answers

The twelve in `round-run.md` hold, with the round's seven:

1. A pass may run to twice its path minutes while each retry fixes a traced cause: 300 minutes on the design's 150. The plan's path is 210, which leaves 90.
2. (Pass 1 only.)
3. A pipe golden changes. Fix the code.
4. (Settled by pass 1: `◌` drew whole in both fonts.)
5. A string the copy catalogue lacks. Draft it to `copy-standard.md`, run `cairn-register-editor`, and list it in the PR. Placeholder wording from the mockups never ships.
6. A debt item turns out to change output, or to need a file outside its pass. Leave it, file it through `standards:log-issue`, and list it in the PR.
7. The busy check exits 1. Nothing launches.

## Tasks

Every task goes to a `cairn-implementer` in its own worktree off `tui-language-3`, Sonnet at
`medium` unless the task says otherwise. After each accepted task, run
`npm run lane:fast -- --range a81a69096..HEAD` and the tool gate
`CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` after the port check. Skills: `standards:go-conventions` for every file under `tool/`,
`standards:golang-spf13-cobra` for `tool/cmd/cairn`, `standards:elm-conventions` before
`newview/theme.go`, `standards:tui-visual-verify` before any terminal-paint claim.

Run order: T1 (three pairs), then T2, then T3, T4, and T5 together, then T6, T7, T8.

### T1. C1 to C11, less the installer items (30 min)

Three pairs, run together, each one commit. Line numbers are at `a81a69096`; each pair re-reads
its sites first. The split keeps each file in one pair: T1a owns `messages.go` (bar the adopt
notice), `env.go`, `registry.go`, `main.go`, `doctor.go`, and `ack.go`; T1b owns `probe_*.go`,
`auth_check.go`, `permissions.go`, `adopt.go`, `root.go`, `args.go`, `agent_page.go`,
`help_agents.go`, and `root_test.go`; T1c owns `health.go`, `health_sweep.go`, `health_json.go`,
`logs.go`, `sites.go`, and `auth.go`. After the three merge, one commit deletes `noColorValue`
and its neighbours (`env.go`, from 129), which T1c's `detectTerminal` edit leaves with no caller.
Then rerun `make -C tool copy-list` once and read the golden diff.

- T1a: C1, C4's `doctor.go` and `env.go` parts, C7, C8 less two, C11 less three.
  - C1: delete `noCredentialsError`, `networkDownError`, `rateLimitedError`, `crashedCheckError`, their constants (`messages.go:640-690`, the block commented "The remaining four rows..."), and the test that calls them. Run `make -C tool copy-list`; the golden diff is exactly those entries. The PR lists it.
  - C4: `resolvePublicOrigin` (`doctor.go:167`) reads `d.env` directly. The `noColorValue` deletion is the post-merge commit above.
  - C7: inline the one-member `nonSecretVar` enum (`env.go:148`), `credentialNames` (`env.go:93`), and `defaultRegistrySource` (`registry.go:28`).
  - C8: inline `fallbackError` (`messages.go:695`) and `processStdout` (`main.go:24`). `newExitFor` and `new_dryrun.go:37` are installer items.
  - C11: the orphan comments at `env.go` (above `noCloudflareCredentialError`) and `ack.go:174-177`; the dated provenance at `messages.go` ("owed to the 2026-09-21 live verification", and the block near the adopt templates); every "New to this table" tag in T1a's files.
- T1b: C2, C3, C10, and C8's and C11's sites in T1b's files.
  - C2 and C10: rename `probe_token.go` to `auth_check.go` with `git mv`; fold `probe_cloudflare.go` and `probe_github.go` into `permissions.go`, the probe a field of each `permissionTable` row, deleting the label switches; move `completeSiteIDs` (`root.go:280`) to `args.go`; merge `agent_page.go` into `help_agents.go`. The bound in `TestNoCommandFileExceedsItsBound` becomes 280, exempting `messages.go`, with `new_*.go` at 300 (Decision 2).
  - C3: one helper builds the clients, checks the credential, runs `loadEnv`, and calls `adopt.Discover` for both `adopt.go:72-79` and `177-183`; `auth_check.go`'s gating stops restating it.
  - C8: inline `adoptListRouteOnlyNotice` and `isMissing` (`probe_token.go:247`).
  - C11: `root_test.go:465` "(Task 19c-ii, ratified 2026-09-21)" and the tags in T1b's files.
- T1c: C4's `detectTerminal`, C5, C6, C9, and C11's two headers.
  - C4: `detectTerminal` (`health.go:189`) reads `d.env` directly.
  - C11: the "split out" headers of `health_json.go:1-3` and `health_sweep.go:1-3`.
  - C5: one render loop for `health.go:153`, `logs.go:123`, `sites.go:118`; one list-error loop for `sites.go:94` and `health_sweep.go:189`. The width fallback is already one (`reportWidth`, `report_terminal.go:53`); record it as done if the read confirms.
  - C6: one `quietSuppressesFrame` for `sites.go:113,160`; one `health.Options` builder for `health.go:102` and `health_sweep.go:106`. The `environMap` calls are all in `new_*.go`: installer round.
  - C9: the nil-guard at `auth.go:224` and `commandContext`'s guard (`root.go`, ten callers) go, with their tests passing a real value. `d.checks` stays: removing it rewrites `health_quiet_test.go:64,91,122` and `root_test.go:88` against the harness, a file outside the row, so standing answer 6 files it. `new.go:187`, `terminalLane.run`, and `gitConfigPairs` are installer items.

Accept: `make -C tool check` passes; `git diff --stat a81a69096 -- tool | grep testdata` lists only `testdata/copy.golden.md`; the reports' goldens and every pipe output are unchanged.

### T2. Ground, plain, and the Text role (35 min, Opus `medium`)

- In `report_terminal.go`, one function returns the ground and the plain flag from `rootFlags` and `d.env` (Decisions 7, 8, 9). `detectTerminal`, `showsProgress`, and later T3 and T4 read it. Under plain, styled paths behave as if stdout and stderr are not terminals.
- `style`: RoleText has no ink at any profile, so `Style(RoleText)` emits no foreground code and `Strong(RoleText)` emits bold only. The mechanism is `noInk` (`palette.go:111`) returning true for `RoleText` at every profile. Add `RoleInstallerText` with today's Text pair (Decision 10), declared after `RoleRule` so the `for role := RoleText; role <= RoleRule` loops (`palette_test.go:169`) skip it. In `newview/theme.go`, `Styles.Style`, `Strong`, `Fg`, and `Link` (`theme.go:69-79`) map `RoleText` to `RoleInstallerText`, so every newview paint keeps today's ink with no call site changed.
- Test edits in `style`: `palette_test.go:237-238` move today's Text hex to `RoleInstallerText`; `TestContrastAgainstGround` (`:83`) checks `RoleInstallerText` against both grounds and skips `RoleText`, which has no ink.
- Regenerate: `make -C tool golden`, then `go test ./cmd/specimen -run TestSpecimenGolden -update`. Read the whole diff.

Accept:

- `git diff --exit-code a81a69096 -- tool/internal/ui/newview/testdata tool/internal/render/testdata/json` and every plain golden pass unchanged.
- For each changed `*.golden` file, `diff <(git show a81a69096:<f> | sed -E 's/\x1b\[[0-9;]*m//g') <(sed -E 's/\x1b\[[0-9;]*m//g' <f>)` prints nothing. Record the loop and its empty output in the task report.
- A unit test in `style` asserts no `38;` code from `Style(RoleText)` at TrueColor, ANSI256, and ANSI16, on both grounds.
- A table test covers the precedence: flag, `CAIRN_THEME=light`, `COLORFGBG=0;15`, `COLORFGBG=15;0`, a junk value of each, none set.

### T3. Help (30 min)

- `fang.go`: the scheme closes over the resolved ground (Decision 9) and takes each colour from a `style.Theme` built at the profile `fangExecute` is given (Decision 13): Title in bold Text, Flag and Command in Text, descriptions, defaults, and dashes in Muted, the error header in Failing. No field takes Accent. `executeThemed` reads the plain flag.
- `style.Pair` loses its one caller (`fang.go:20`), so `TestEveryExportHasACaller` (`callers_test.go:63`) fails until `Pair` and its test row are deleted. Delete them in this task; the `style` edit is forced by the caller test, not new scope.
- `--theme` reaches help through `colorArg`'s pre-parse.
- `longRoot` (`messages.go:75`) gains one sentence naming `CAIRN_PLAIN` (Decision 7a), drafted to `copy-standard.md` and run past `cairn-register-editor` (standing answer 5). The only committed file that quotes `longRoot` is `testdata/copy.golden.md` (`git grep -F 'machine-readable payload on stdout'`); man pages are not committed, and `flags`, `reference`, and `agent-guide` read no root help text. So `make -C tool copy-list` is the one regeneration.
- A golden test writes `cmd/cairn/testdata/help/<profile>-<ground>.golden` for TrueColor, ANSI256, and ANSI16 on dark and light (Decision 13).
- T3, T4, and T5 each touch `messages.go` and `copy.golden.md`. Append new constants at the end of `messages.go`, and rerun `make -C tool copy-list` after each merge rather than merging the golden by hand.

Accept: item 2's check (below) passes; `cairn --help | cat` equals the base binary's bytes apart from the one sentence.

### T4. The fix type and the error block (40 min, Opus `medium`)

- A broader grep sets the list: every template where a line, after `\n`, opens `Run ` or "run `", including lines built by concatenation such as `messages.go:343`. The 22 the mechanism table names are a floor. Write the final list into the task report.
- A fix error type in `messages.go` holds the message and the fix as two fields. `Error()` returns today's bytes exactly, and `translateError`'s direct type check (`messages.go:708`) accepts the type as translated, so no second `cairn: ` prefix appears.
- The error block reads its terminal from stderr: `style.Detect(d.stderr, ...)` for profile and width, never `detectTerminal`, which measures `d.stdout`. Each listed error moves onto it, splitting its template into a what const and a fix const. The split fragments are not new strings for item 8.
- `errors_terminal.go`: when stderr is a terminal and the plain flag is off, `runTree` prints `style.ErrorBlock` (the fix type supplies the fix; an untyped error none, Decision 4), and so does the recovered panic. Off a terminal, the bytes are today's.
- Decision 14's capture runs before the split.
- `make -C tool copy-list`; read the golden diff, then `make -C tool check-copy`.

Accept: item 6's table test passes; item 7's test passes; the copy golden diff is only C1's removals and the splits.

### T5. Lists and receipts (50 min)

- `lists_terminal.go`, by the frames: `cairn sites` (a title with the count, `style.Table`, then pass 2's credential block as built), `cairn auth list` (a `credentials` title and a mark row per variable), `cairn adopt list` (two titled tables), and the `auth set`, `auth unset`, and `adopt` receipts (the mark beside today's text, Decision 11).
- `auth_check_terminal.go`: `cairn auth check` as a report. The verdict line comes from the `spine.ExitCode` verdict the command already computes, failing rows lead under `failing` with the fix on the arrow, passing rows under `passing`, and the verdict line closes.
- Section titles are bold lowercase nouns, per `copy-standard.md` section 2.3. A title the catalogue lacks, such as the count beside `sites`, goes through standing answer 5.
- Off a terminal each command prints today's bytes.

Accept: item 5's differential passes; `wc -l` keeps every new file under 280.

### T6. Plain mode and the differentials (35 min)

- Fixtures first. The differential fixture gains a Cloudflare token and account id (`reporte2e/fixture_test.go:26-28`), and both fakes gain a `/accounts/{id}/workers/domains` route (`shots_linux_test.go:193-240` for the shot fixture), so `adopt list` reaches both titled tables. Each differential asserts its stdout is non-empty before it compares.
- Build the base binary: `git worktree add --detach $CLAUDE_JOB_DIR/tmp/base "$(git merge-base HEAD origin/main)"` (`ef9e37206` today; record the SHA used in the task report), then from its `tool/`, `go build -tags cairne2e -o $CLAUDE_JOB_DIR/tmp/base-bin/cairn ./cmd/cairn`. Remove it with `git worktree remove` at the end.
- Item 4, in `pty_linux_test.go`: run `CAIRN_PLAIN=1 cairn health` with stdout on a pty and stderr on a second pty, against the slow fixture. Read the stdout master's raw bytes (never `screenOf`), map `\r\n` to `\n`, apply `maskClock`, require no remaining `\r` or `ESC`, and compare with `runPipe`'s `cairn health | cat` under the same mask. Stderr's pty shows no progress line. A control run without `CAIRN_PLAIN` shows it. The same test runs `cairn --help` and one error under `CAIRN_PLAIN=1` and finds the off-terminal bytes.
- Items 5 and 6, in `diff_test.go`, base against branch: `sites`, `auth list`, `adopt list` piped; each `messages.go` error the fixture reaches, with stderr to a file, from a table of command lines; and the exit codes 0, 1, 2, and 3. A control run compares the base binary with itself.

Accept: the three tests pass locally with `CAIRN_E2E_BASE_BIN` set and print their `-v` lines in the task report. CI's Linux leg runs the pty test.

### T7. Screenshots and the grade (45 min)

Load `standards:tui-visual-verify`. Build the branch binary with `-tags cairne2e` and shoot each
item 1 command through the fixture at 80 columns in kitty (`kitty-headless-shot`), on dark and on
light, into `~/Projects/initiatives/cairn-setup/research/tui-language-3-shots/` (untracked). The crash shot
follows Decision 12. Shoot `gh --help` and `gh repo list` at 80 columns as exemplars.

Dispatch a fresh `standards:visual-verifier` with the shots, the frames from `commands.html`, the
exemplars, and pass 2's checklist in `terminal-standard.md`. Its brief lists the expected
differences: the frames' wording, the arrows on the `--since` and crash frames (Decision 3), the
receipt wording (Decision 11), and the test runner's `PASS` line on the crash shot. Every row an
exemplar wins ends in a fix commit, or a filed issue if the fix is out of row. One regrade round
on the fixed shots.

### T8. Docs and changelog (15 min)

- `docs/admin/credentials.md` gains the three variables where it lists environment variables, through the `cairn-writing-docs` skill; `npm run check:docs-gate` passes.
- `terminal-standard.md` records `CAIRN_PLAIN` and the ground precedence. Load `writing-voice` for developer docs (Google).
- `CHANGELOG.md` under `## Unreleased`: help without Accent, the error block, the list views, the three variables, and the Text role. `MIGRATION-NOTES.md`: nothing to do for a pipe or `--json` reader; a terminal now reads the ground from the variables.

## Acceptance

Every pass:

E1. `make -C tool check` passes, the tool's CI passes on Linux, macOS, and Windows (`.github/workflows/tool.yml`). A pty test that skips on an OS counts only where it ran: the PR shows its `-v` line from the Linux job.
- Task: all. Check: the gate's last line and `ci-green <sha> --pr <n> --wait` exit 0, and the Linux job's `-v` line for the item 4 test.

E2. A fresh `standards:go-architecture-reader`, handed the text of the pass's debt items, reports none of them still open in the packages the pass cleaned.
- Amended check (Decision 2, standing answer 6): the reader gets the debt text for C1 to C11 and the "Debt items" table's dispositions, and reports no item open that the table marks done. An item marked left or installer-round is checked for its reason, not its fix.
- Task: T1. Check: the reader's verdict in the PR.

Pass 3, `commands`, verbatim:

1. Kitty screenshots of `cairn --help`, `cairn sites`, `cairn auth list`, `cairn auth check`, `cairn adopt list`, and the three error cases, run through the fixture, match their frames in `commands.html` on margin, mark column, and title weight.
   - Amended check for the crash case (Decision 12): the crash shot comes from the compiled test binary run in kitty, since no release-build input panics a command outside a recover.
   - Task: T7. Check: the shots in `research/tui-language-3-shots/` and the grader's verdict.
2. The help golden, rendered at the TrueColor, ANSI256, and ANSI16 profiles on a dark and a light ground, holds no cell in the Accent colour or its downsample at that profile. Off a terminal, help is plain cobra output (`fang.go:85-88`), so the golden forces a profile.
   - Amended check (plan review B1, B2): the cite `fang.go:85-88` is `colorArg` at `a81a69096`; the plain branch is `fang.go:69-71`. The outcome stands.
   - Task: T3. Check: a test parses each SGR sequence in the six goldens into its parameters, skipping the arguments of `38;5;N` and `38;2;r;g;b`, and fails on any Accent code at that golden's profile: TrueColor `38;2;157;132;236` and `38;2;114;70;207`; ANSI256 the theme rungs `38;5;141` and `38;5;97` and colorprofile's downsample `38;5;141` and `38;5;62`; ANSI16 the whole parameters `35`, `94`, and `95`. A presence assert fails on a golden with no colour: each golden holds bold, holds Muted's code at its rung except ANSI16, and dark differs from light at TrueColor and ANSI256. Both asserts fail first on every golden built with today's scheme, run once before T3's change and recorded in the task report.
3. If the light-terminal Decide is approved: `cairn --help --theme light` and `CAIRN_THEME=light cairn health` paint the light palette, `COLORFGBG=0;15` with no flag does too, and the Text role emits no foreground colour code at any profile. If declined, none of the three variables is read.
   - Approved. Task: T2 and T3. Check: T2's precedence and Text tests, a help golden at `light`, and light shots of `cairn --help --theme light`, `CAIRN_THEME=light cairn health`, and `COLORFGBG=0;15 cairn health`.
4. If the plain-mode Decide is approved: `CAIRN_PLAIN=1 cairn health` on a pty prints the bytes `cairn health | cat` prints and no progress line.
   - Approved. Task: T6. Check: the pty test, with the `\r\n` normalisation and `checked:` mask (Geoff's ruling on pass 2), and its control run.
5. Each list command piped to `cat` produces the bytes it produces on `main`, compared through both binaries.
   - Task: T5 and T6. Check: the differential's `-v` lines for `sites`, `auth list`, `adopt list`, each over a non-empty stdout (T6's fixture adds the credential and domains route `adopt list` needs). The base is `git merge-base HEAD origin/main`. The check runs locally; CI has no base binary.
6. Each error in `messages.go`, printed with stderr redirected to a file, produces the bytes it produces on `main`. Exit codes are unchanged: 0, 1, 2, and 3.
   - Task: T4 and T6. Check: the differential's error table and exit codes, C1's four listed as removed, and Decision 14's capture for errors no fixture reaches.
7. An error with no typed fix shows no arrow on a terminal.
   - Task: T4. Check: a unit test renders `--since tuesday`'s error and an untyped error at TrueColor and finds no `→` and no `>` fix line. The same test renders a typed-fix error and finds `→`, so it fails if the block never draws an arrow. The `--since` shot.
8. `make -C tool check-copy` passes, and the PR lists the register editor's verdict for each new string.
   - Task: T3, T4, T5. Check: the target's output and the verdict list in the PR.
9. No non-test file in `cmd/cairn` outside `new_*.go` and `messages.go` is over 280 lines. `messages.go` stays exempt by ruling (`root_test.go:465-468`), and test files are out of the bound.
   - Task: T1b. Check: `TestNoCommandFileExceedsItsBound` at 280, and `wc -l tool/cmd/cairn/*.go | grep -v _test` in the PR.
10. Pass 2's checklist and grader, for help against `gh --help` and for the lists against `gh repo list`.
    - Task: T7. Check: the grader's per-row verdict and the fix commits.

## Debt items, verified at `a81a69096`

| Id | Site now | Disposition |
| --- | --- | --- |
| C1 | `messages.go:640-690` | T1a |
| C2 | `probe_cloudflare.go:15`, `probe_github.go:17`, `permissions.go:31` | T1b |
| C3 | `adopt.go:72-79,177-183`, `probe_token.go` gating | T1b |
| C4 | `health.go:189-190`, `doctor.go:167`, `env.go:129` | T1a |
| C5 | `health.go:153`, `logs.go:123`, `sites.go:118`; `sites.go:94`, `health_sweep.go:189` | T1c; width fallback already one in `reportWidth` |
| C6 | `sites.go:113,160`; `health.go:102`, `health_sweep.go:106` | T1c; `environMap` is in `new_*.go` only: installer round |
| C7 | `env.go:93,148`, `registry.go:28` | T1a |
| C8 | `adoptListRouteOnlyNotice`, `messages.go:695`, `main.go:24`, `probe_token.go:247` | T1a; `newExitFor`, `new_dryrun.go`: installer round |
| C9 | `auth.go:224`, `commandContext` | T1c; `d.checks` left under standing answer 6; `new.go:187`, `new_terminal.go`, `new_wire.go`: installer round |
| C10 | `root.go` 298, `probe_token.go` 263, `agent_page.go` 10 | T1b, partial by Decision 2; `new_terminal.go`: installer round |
| C11 | `env.go`, `ack.go:174-177`, `messages.go`, `root_test.go:465`, tags, `health_json.go:1-3`, `health_sweep.go:1-3` | T1a |

## Close

1. Merge `origin/main` into the branch; rerun the gate and `npm run check:docs-gate`.
2. Dispatch `standards:diff-reviewer` (whole-branch) and fold its findings first.
3. The PR body opens with a paragraph per `~/.claude/docs/voice/written-for-people.md`, then `Round: tui-language`, what landed, the copy-golden diff, the out-of-row file list, `## Decisions` (each `[advisor]` line here and every one the executor adds), `## Calls for Geoff` (each `Call:` line), `## Planning misses`, the score, `## Acceptance` with each item's evidence, and the filed issues.
4. STATUS for the conductor. Mark the PR ready with `Review:` and `Calls:` lines.

## Planning misses

- `[estimate]` The design gave pass 3 150 path minutes. The plan's path is 210: the help golden at six profiles, the base-binary differentials, and the shot round each cost more than the design counted.
- `[check]` Item 1's crash case has no release-build trigger, so its check is amended (Decision 12). The design's acceptance run should have tried it.
- `[check]` Item 2's check needed a profile set in two places, a fuller banned list, and a presence assert (plan review B1, B2), and its cite `fang.go:85-88` had drifted. The design's acceptance run should have rendered the golden once.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`), 2026-11-14. Every finding is folded.

- B1, item 2 could pass with no colour: Decision 13 and T3 set the profile for cairn's scheme and Fang's writer apart, and item 2's check gains a presence assert.
- B2, light Accent's ANSI256 downsample `38;5;62` was missing: added, with whole-parameter matching and a first failure required on every golden.
- B3, the fixtures could not draw `adopt list`: T6 adds the credential and the domains route, and asserts non-empty stdout.
- S1, parallel tasks shared files: T1's pairs are split by file, `longRoot` is cited at `messages.go:75`, and `copy-list` reruns after each merge.
- S2, `style.Pair` loses its caller: deleted in T3.
- S3, the Text tests and the `noInk` mechanism: named in T2.
- S4, plain must be the pipe path: Decision 7 adds `writePasteNotice` and nil streams.
- S5, the error block's terminal: T4 names `style.Detect(d.stderr, ...)` and the type check at `messages.go:708`.
- S6, item 7's positive control: added.
- S7, the crash test's setup: Decision 12 names the token, account id, registry, and the `adopt list` crash line.
- S8, the help sentence changes pipe output: the reviewer recommended docs only. The design rules "documented in the standard and in `cairn --help`" (line 63), so Decision 7a keeps one sentence naming `CAIRN_PLAIN` alone, as a `Call:`.
- N1 to N4: the base SHA is named, the cites are corrected, the Close reruns `check:docs-gate`, and T4 calls the 22 a floor. The executor prompt already carries the CI-verdict and delta-review lines.

## Rulings

Geoff answered the close packet `20261115-180213-6f0b69` on 2026-11-15. Calls 1 to 5, 7 to 10 and the Calls 8 to 9 words stand as built. These change the PR:

1. **Call 6, the 256-colour contrast: fix it in this pass.** Change the palette so every ink at the 256-colour rung meets the 4.5:1 body floor against kitty's ground and the reference ground, light and dark (light Muted to xterm 241 is the proposal, #506; check each of Muted, OK, Unknown, Failing and Accent). Add a test over the 256-colour values beside `TestContrastAgainstGround`. The palette and colour detection are in pass 1's package `tool/internal/style`, and this ruling puts them in this pass's row. Regenerate the goldens the change moves and say which.
2. **Call 11, the `auth set` receipt: add the newline now.** `readPipedValue` (`auth.go:108`) writes a newline after the `NAME: ` prompt on a piped stdin. This is the one stderr byte on a pipe Geoff has approved to differ from `main`; update the differential row and note the difference in `CHANGELOG.md` and `MIGRATION-NOTES.md` next to the `cairn --help` sentence. Close #512 and cite it.
3. **Call 14 and Call 15: take the two light `cairn health` shots and one more fix round for C7 and C11.** Shoot `CAIRN_THEME=light cairn health` and `COLORFGBG=0;15 cairn health` in kitty and grade them with a fresh context. Fix C7 and C11 (filed in #508), then run a fresh `standards:go-architecture-reader` at the closing head and report the verdict. Update the PR's `## Acceptance` and `## Calls for Geoff` to match.
4. The relaunched executor merges `origin/main` and `origin/tui-language-2` first (backlog ids, highest is #522 on tui-language-4; number from the highest at filing time). Pass 4 is cut from this branch, so conductor-cairn-cms relaunches it after this fix lands.
