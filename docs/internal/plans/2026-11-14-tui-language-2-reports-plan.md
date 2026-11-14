Initiative: cairn-setup
Round: tui-language
Pass: 2 reports

# Pass 2 `reports`: health, logs, sites, and doctor in the new shape

Design: `~/Projects/initiatives/cairn-setup/specs/2026-11-13-tui-language-design.md`, approved by
Geoff through design packet `20261113-224909-04cfc7` on 2026-11-13. Debt read:
`~/Projects/initiatives/cairn-setup/research/tool-debt-read-2026-11-13.md` (items D1 to D8).
Mockups: `~/Projects/initiatives/cairn-setup/research/command-mockups/commands.html`; every word in
them is placeholder (standing answer 5). Worktree
`/var/home/glw907/Projects/cairn-cms/.claude/worktrees/tui-language-2`, branch `tui-language-2`,
base `e5f4a4e6e` (pass 1's merge, PR #245). PR base `main`. Class `ordinary`. Planned path 345
minutes against the design's 200. The park line and the retry ceiling are both 400, twice the
approved 200.

## Stop at planning: two acceptance items cannot be met as written

This plan parks before any code is written, under `round.md` "Parking at planning": two
acceptance items cannot be planned for as written. The advisor was asked first on each. For
item 2 it set the deciding probe (M3), and the probe settled that the condition holds. For item
4 it confirmed the plan reviewer's finding against the code (M21). Every other item is planned
below, and the pass launches as soon as both questions have answers.

### Question 1: item 2 and the clock line

Item 2 asks a harness test to run the `main` and branch binaries against the same fakes and find
`cairn health | cat` byte-identical. The pipe body of `cairn health` prints
`checked: <age> ago (<minute stamp> UTC), in <elapsed>`, from the real clock, and `main`'s binary
has no clock hook to fix it. Two runs of one binary differ whenever the elapsed time crosses a
0.1 second boundary. How should the test treat that line?

**What was tried.** Five pairs of concurrent runs of one `cairne2e` binary against the live
proxy, the fake site host delayed a fixed 1.25 s (M3). Pairs 2, 3, and 4 matched. Pairs 1 and 5
differed on elapsed alone (`in 12.5s` against `in 12.6s`). Most of the 12 seconds is the real
DNS lookup of the delegation and email checks, which the `cairne2e` hook cannot fake (M6), so
the gap moves with the network the test runs on. The doctor half of item 2 has no clock field
and is planned as written (T8).

**The choices.**

1. Mask the clock spans (recommended). The test compares every byte except each `checked:`
   line's age, minute stamp, and elapsed, replaced by a fixed token in both outputs. A control
   run of `main` against `main` shows the mask is what two runs of one binary need, and no more.
   Every other byte of `cairn health | cat` is compared across the two binaries, for one site
   and for the every-site sweep.
2. Doctor only through both binaries. `cairn doctor | cat` is compared byte for byte, and
   `cairn health`'s pipe output rests on its fixed-clock pipe goldens (the item's first clause).
3. A bounded retry. Compare the whole output and retry up to five times. The probe matched 3 of
   5, so a false red stays possible, and its rate depends on the CI network.

Pass 3's item 4 (`CAIRN_PLAIN=1 cairn health` equals the pipe bytes) meets the same clock line,
so one answer covers both passes.

### Question 2: item 4 under `LC_ALL=C`

Item 4 asks that with `LC_ALL=C` the goldens "hold no `ESC` byte and only bytes from 0x20 to
0x7E, plus newline". The design's tier rule (line 105) names three tiers: colour on a terminal,
one ink under `NO_COLOR` or `--color never`, and "ASCII marks where `TERM=dumb`, the stream is
not a terminal, or the locale is not UTF-8". Only the one-ink tier promises no escape bytes. The
code keeps colour and the ASCII tier on separate axes (M21): the truecolor ASCII golden
`single/*_truecolor_dark_ascii.txt` holds 21 `ESC` bytes. A C locale on a colour terminal would
paint ASCII marks in colour and fail the item. Which should hold?

**What was tried.** The plan reviewer found it; the advisor and the code confirmed it. A
golden built at a hand-picked no-colour profile would pass the item without testing the locale,
so the plan offers no such choice.

**The choices.**

1. A non-UTF-8 locale behaves as `TERM=dumb` does: ASCII marks and no colour under
   `--color auto`. `--color always` still paints, as it does under `TERM=dumb`, and `NO_COLOR`
   is unchanged. Item 4 holds as written. The tier rule names the locale in one clause with
   `TERM=dumb` and a non-terminal stream, and both of those already drop colour, which supports
   this reading. The cost: a POSIX shell with `LANG`, `LC_CTYPE`, and `LC_ALL` all unset is the C
   locale, so it loses colour as well as the Unicode marks.
2. Amend item 4 for `LC_ALL=C` alone to "no byte at or above 0x80", with colour escapes allowed.
   `TERM=dumb` keeps the item's wording, which today's code already meets. The locale then
   decides the marks and never the colour.

The plan recommends choice 2. A locale names a character set, and a C-locale shell on a colour
terminal still shows colour. Either way the test drives the environment through the `cmd/cairn`
read to a profile and a tier (T5), never a golden with a chosen profile.

### Budget line

The path re-totals at 345 minutes after the review fold, against the approved 200. Standing
answer 1's retry ceiling is 400, which leaves 55 minutes of retry. The plan keeps 400 and parks
past it as standing answer 1 says. Geoff may raise it in the same answer.

## Pre-flight

Owner steps: the two questions above, sent by the conductor as a `decide` document. Nothing else
in this pass needs a sign-in, a secret, a dialog, or a permission rule. The `gh pr status`
capture uses the host's existing `gh` sign-in (M22).

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 66 rows, 2026-11-01 00:55 to 2026-11-14 06:15). Classes
  and row counts: Self-Modification 10, unexplained classifier 10, Interfere With Workloads 9,
  Classifier unavailable 6, Merge Without Review 3, Auto-Mode Bypass 3, Destructive or Unwanted
  Actions 3, Irreversible Local Destruction 2, Git Destructive 2, Create Public Surface 2,
  Unverifiable Deletion Scope 2, Sensitive-Source Provenance 2, Security Weaken 2, Production
  Deploy 1, Secret-Store Writes 1, DNS/Domain/Cert 1, Bot Check Circumvention 1, Code from
  External 1, Shared Scratch Sweep 1, Safety Bypass Flag 1, Out-of-Place Publication 1, PII Data
  Handling 1, Undermining Oversight 1. The pass writes only repo files under `tool/`, `docs/`,
  `CHANGELOG.md`, `MIGRATION-NOTES.md`, and one line of `.github/workflows/tool.yml`, no
  `.claude/` path and no credential. The routes for the refused classes its commands could meet
  are below.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), folded under "Plan review fold".
- Evidence: the mechanism table and the recorded searches below. Every row is a probe run at
  `e5f4a4e6e` on 2026-11-14 or a quoted source line.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process. A hung command runs under `timeout`. A busy port 49152 is waited out. The pty interrupt test signals only the child its own test started. |
| Irreversible Local Destruction (`git reset --hard`) | Never. The base binary for T8 is built from a `git worktree add --detach` checkout in `$CLAUDE_JOB_DIR/tmp`, removed with `git worktree remove`. |
| Code from External (`go run ...@latest`) | Tools come from the Makefile and `go.mod` only. The pty and emulator modules enter through `standards:dependency-upgrade` and `go get <module>@<exact version>`. |
| Safety Bypass Flag (`--no-verify`) | Never. A failing hook is a defect to fix. |
| Destructive (setup command compounded and piped to `tail`) | The setup command runs bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Shared Scratch Sweep | Scratch goes under `$CLAUDE_JOB_DIR/tmp/<task>`, never a glob delete over `/tmp`. |
| Create Public Surface (`gh release create`, a spike's public write) | The pass opens one draft PR against `main` on its own branch, as every pass does, and creates no release, tag, gist, or repo. |
| Merge Without Review (`gh pr merge`) | Merge only through `approval-queue` after Geoff's approve. |
| Auto-Mode Bypass (`gh workflow run`) | CI runs from the push. Never trigger a workflow by hand. |
| Classifier unavailable | Retry the same call once after a pause. |

### Port 49152

`make -C tool check` binds `127.0.0.1:49152` in the loopback tests, and a live `cairn new` proving
run holds the same port. Before every `make -C tool check` and every `go test ./...`, run:

```sh
ss -ltnH 'sport = :49152'
```

Empty output means the port is free. Any line means a proving run is live: wait with a `Monitor`
until-loop on the same command, never kill the holder.

## Mechanism table

| # | Mechanism | Probe or source | Result |
| --- | --- | --- | --- |
| M1 | Pass 1's held-mark result | PR #245 body; `internal/render/body_single.go:86-88` | `◌` drew whole in Kitty in both fonts, so standing answer 4 did not fire. Render still returns `g.NotStarted` for a held row, under `// WATCH: the held mark switches to Held here; every golden with a held row changes then.` PR #245 carries no `[advisor]` lines. |
| M2 | Health pipe body's clock fields | `internal/render/body_plain.go:43`, `layout.go:121` `checkedPhrase` | `checked: <relative> ago (<stamp, UTC minute>), in <elapsed>`; elapsed is ms under 1 s, else one decimal of seconds. Every field comes from `RenderInput.Now` and `StatusState.Elapsed`, which `cmd/cairn/health.go:100,112,203` read off `d.now()`. |
| M3 | Two runs of one binary through the fixture | `go build -tags cairne2e`; live `testharness.NewProxy` with `alpineclub.example` delayed 1.25 s; five pairs of concurrent `cairn health alpine-club-a1b2c3` runs, `cmp` per pair | Pairs 2 to 4 identical; pairs 1 and 5 differ on line 2 only: `checked: 12s ago (2026-11-14 23:30 UTC), in 12.5s` against `in 12.6s`. Question 1. |
| M4 | Doctor pipe body | `internal/doctor/report.go:28` `Format`; `internal/doctor/fetchrobots.go:40-45` | No clock. One network call: the posture check fetches `/robots.txt` when a public origin resolves. With no `PUBLIC_ORIGIN` in the site directory that check is unchecked and the output is a function of the directory alone. |
| M5 | Screenshot through the fixture | Throwaway `cmd/cairn/zz_probe_test.go` (removed; `git status` clean): `NewProxy`, CA and proxy URL written to a scratch dir, then `kitty-headless-shot -o <dir> -t dark -s 80x50 -c 'env -i PATH=/usr/bin TERM=xterm-kitty LANG=C.UTF-8 HTTPS_PROXY=<url> SSL_CERT_FILE=<dir>/ca.pem CAIRN_STATE_DIR=<dir>/state CAIRN_E2E_KEYRING_DIR=<dir>/kr HOME=<dir> <bin> health alpine-club-a1b2c3' shot:health80` | Painted today's layout, with serving failing through the proxy. The proxy and HOME must be set only inside the child's `env -i`: exported in the outer shell, kitty's own update check went through the proxy and was refused. The CA must be copied out of `/tmp` into the shot directory. |
| M6 | Which health rows the fixture can fix | `internal/health/check_email.go:90,117,136` `probe.LookupTXT`; `internal/providers/probe.go:13-18`; `cmd/cairn/new_e2e_hook.go` (sets `siteAuthority` and `gitConfigPairs`); `internal/secrets/keyring_e2e.go:31` (the keyring dir) | DNS goes through `deps.resolver` (`*net.Resolver`), which no `cairne2e` hook replaces. Delegation and email reach real DNS and settle as could not run. Creds, serving, https-forced, deploy, publish-path, engine, and errors go over HTTPS and are fixed by the proxy's fakes. A held row is `--ack serving=<date>` on a failing serving check. |
| M7 | Stderr is not an `*os.File` | `cmd/cairn/main.go:57-66` `scrubbedWriters`, `:118-119` `SetErr(errOut)`; `internal/logx/logx.go:90-122` | `cmd.ErrOrStderr()` is a `*logx.Writer`, which holds every byte up to a newline. A progress line drawn with `\r` and no newline never reaches the terminal unless the writer flushes. `cmd/cairn/auth.go:58-65` already asserts `interface{ Flush() error }` for its prompt. |
| M8 | Who may name the process streams | `cmd/cairn/root_test.go:319-337` `TestOnlyMainNamesTheProcessStreams`; `main.go:24` `processStdout()`; `deps.go:60-64` `stdout *os.File` | Only `main.go` may spell `os.Stdout` or `os.Stderr`. Stdout reaches the commands as `d.stdout`. The stderr terminal check needs a new `deps` field set in `main.go` (Decision 7). |
| M9 | Terminal detection today | `cmd/cairn/health.go:207-215` `detectTerminal`, called from `health.go:188`, `health_sweep.go:76`, `fang.go:69`, `root.go:140`, `new_terminal.go:84`; `internal/style/detect.go:53` | `Terminal{Profile, Columns, ASCII, TTY}`. The installer (`new_terminal.go:84`, `newview.GlyphsFor(term.ASCII)`) shares the call, so a locale read inside `detectTerminal` would change the installer, which is outside the round (Decision 3). |
| M10 | Env reads in `cmd/cairn` | `cmd/cairn/env_test.go:202` `TestOSGetenvOnlyInEnvGo`, `:271` the credential-name test; `env.go:223-233` `loadEnv` | Only `os.Getenv` is confined to `env.go`; reading `d.env("LC_ALL")` elsewhere passes both tests. |
| M11 | Command-file line bound | `cmd/cairn/root_test.go:469-479` | 300 lines, `messages.go` exempt. Today `health.go` 292, `health_sweep.go` 254, `sites.go` 164, `logs.go` 163, `doctor.go` 145. Locale and progress code cannot fit in `health.go`. |
| M12 | `style` blocks available | `internal/style/blocks.go:47,68,76,92,108,116,136,181` | `VerdictLine`, `Title` (bold, lowercased, no rule), `MarkRow` (name over the value column, or under 60 columns, takes its own line), `LabelRow`, `ContinuationLine`, `FixLine`, `Table` (name column up to 32 cells), `ProgressLine(t, frame, text, width)`. Today only `cmd/specimen` calls them. |
| M13 | Render's ruled titles | `internal/render/layout.go:298-300` `insetRule`; callers `body_single.go:41`, `body_many.go:149`, `body_logs.go:48` | Three callers, each becomes `style.Title`. |
| M14 | Golden corpus | `internal/render/testdata/golden/{logs,many,plain,single}` 10, 45, 45, 50 files; `golden_test.go:377` env `LANG: C, LC_CTYPE: C, TERM: dumb`; `TestGoldenCorpusIsSized` `golden_test.go:512`; `Makefile` `golden:` = `go test ./internal/render -run TestGolden -update` | Plain goldens never change (standing answer 3). Terminal goldens are regenerated once per task that changes them, and the diff is read before commit. |
| M15 | Doctor's shape today | `internal/doctor/report.go:28` `Format`, sole caller `cmd/cairn/doctor.go:94`; five goldens in `internal/doctor/testdata/golden/` incl. `every-status.txt`; `result.go:104` `Verdicts`; `spine/exit.go:67-75` the severity constants | `Format` prints `PASS`/`FAIL`/`SKIP`/`INFO`/`UNCHECKED` rows. It stays as the pipe body (Decision 4). |
| M16 | `DoctorSchemaVersion` | `render/json.go:33,37`; readers `doctor/json.go:90`, `render/json_schema_test.go:449` | One export, one non-test reader, in `doctor`. `go list -deps ./internal/doctor \| grep -c internal/render` prints 1 today. D8 moves it, which frees `render` to import `doctor`. |
| M17 | Pty modules and the require pin | `go list -m -versions`; `internal/render/purity_test.go:132` `otherDirectRequires = 12`, `:137-166` `TestRenderDirectRequiresArePinned` | `github.com/creack/pty` v1.1.24; `github.com/charmbracelet/x/xpty` v0.1.4; `github.com/charmbracelet/x/vt` v0.1.0. `x/vt` and `xpty` require only versions older than `go.mod`'s, so minimal version selection moves nothing. Two new direct requires fail the pin until the count becomes 14 and its comment names them. |
| M18 | CI's verbose legs and time limit | `.github/workflows/tool.yml:83` `timeout-minutes: 15`, `:150-159` | Only `go test -count=1 -v ./internal/testharness/...` and `go test -count=1 -v -run 'TestNewE2E' ./cmd/cairn/` run with `-v`, Linux only. A new pty test shows a `-v` line only if the second pattern names it (Decision 9). Each fixture health run takes about 12 s of real DNS (M3). |
| M19 | Harness | `internal/testharness`: `Binary(t, pkg)` builds with `cairne2e`; `NewProxy(t, hosts)` returns `URL`, `CAFile`; `NewCase` skips off Linux; `Case.Env` sets no `LANG` | A terminal test through the harness sets `LANG=C.UTF-8` itself, or it lands on the ASCII tier once T5 lands. |
| M20 | Registry for the fixture | `internal/store`; `internal/record/testdata/v1-adopted.json` | `CAIRN_STATE_DIR` must be mode 0700 with 0600 files. A site id must pass validation (`my-site-a1b2c3` passes, `my-site` fails). |
| M21 | Colour and the ASCII tier are separate | `internal/style/detect.go:85-108` `detect`; `grep -c $'\x1b'` over `internal/render/testdata/golden/single/*ascii*` | `ascii = !isTTY \|\| env.Term == "dumb" \|\| !vtOK`; colour is a separate switch where `NO_COLOR` and `--color never` give none, `--color always` gives TrueColor even under `TERM=dumb`, and `TERM=dumb` or a pipe gives none. The truecolor ASCII golden holds 21 `ESC` bytes. Question 2. |
| M22 | Exemplar captures | `gh auth status`; `command -v brew` | `gh` is signed in on the host (account `glw907`, keyring). `brew` is at `/home/linuxbrew/.linuxbrew/bin/brew`. Both frames can be shot on the host. |
| M23 | Doctor's comment on stderr | `cmd/cairn/doctor.go:85-86` | "Nothing reaches stderr on either path": it stays true, since the progress line is health's alone (Decision 6). |
| M24 | `cairn sites` today | `cmd/cairn/sites.go:110-122` `writeSitesStatus` (renders `render.ViewStatus`), `:155-162` `writeSites` (tab-separated listing); design pass table row 3 ("the list and receipt commands"), pass 3 item 1 (screenshots `cairn sites`) | Pass 2 owns the status block and pass 3 owns the listing (Decision 8). |
| M25 | Logs with no entries | `internal/render/body_logs.go:41-43` | An empty window paints one muted line and no title, so the logs fixture needs entries. |

## Recorded searches

Each from `tool/` at `e5f4a4e6e`, non-test `.go` unless noted.

| # | Search | Hits | Disposition |
| --- | --- | --- | --- |
| S1 | `doctor\.Format\|func Format` | 2 | `doctor/report.go:28`, `cmd/cairn/doctor.go:94`. Both stay; `doctor.go` gains the terminal branch (T4). |
| S2 | `DoctorSchemaVersion` (all files) | 4 | M16. Moved in T2. |
| S3 | `render.Render(` | 3 files | `cmd/cairn/{health,logs,sites}.go`, all in row. `health_sweep.go` reaches it through `writeHealthBody`. |
| S4 | `checkProgress` (all files) | 7 | `health.go:105,129`, `health_sweep.go:109`, `messages.go:133` (`checkProgressLine`), tests in `health_test.go`. All in row; T6. |
| S5 | `LC_ALL\|LC_CTYPE\|"LANG"` | 2 | Both in tests (`render/golden_test.go:377`, `testharness`). No product read; T5 adds the first. |
| S6 | importers of `internal/doctor"` | 3 | `cmd/cairn/doctor.go`, `cmd/cairn/help_contract_test.go`, `cmd/copylist/main.go`. `copylist` reads catalogue strings only; T2's D5 surface change re-runs `check-copy`. `internal/render` becomes the fourth (T4). |
| S7 | `Held\|NotStarted` | 23 | Render's mark table, `body_single.go:48,86-88`, `style/marks.go`, newview (out of row, untouched). T3 changes `body_single.go:88` alone. |
| S8 | `WATCH` | 2 files | `render/body_single.go:87` (T3 removes it), `cmd/cairn/new.go` (out of row). |
| S9 | `insetRule` | 4 | M13. T3. |
| S10 | `detectTerminal` | 6 | M9. Only `health.go:188` (through `renderInput`) and `doctor.go` take the locale (T5). |
| S11 | `os.Stdout\|os.Stderr` in `cmd/cairn` | `main.go` only | M8. |
| S12 | `Flush()` in `cmd/cairn` | 1 | `auth.go:61-65`, the pattern T6 follows. |
| S13 | docs naming the health or doctor screen (`grep -rln 'cairn health\|cairn doctor' docs/admin docs/editors skills`) | `docs/admin/is-it-working.md` and the skill references it links | `is-it-working.md` changes (T10). The skills cite pipe and `--json` output, which does not change; T10 reads each hit. |

## Scope

The design's row for pass 2: `internal/render/**` and goldens, `internal/doctor/**`,
`cmd/cairn/{health,health_sweep,doctor,logs,sites,messages}.go`, `docs/admin/is-it-working.md`,
`tool/go.{mod,sum}`, `CHANGELOG.md`.

The plan adds these, each recorded under "Planning misses":

- `cmd/cairn/report_terminal.go` (new): the locale read and the progress line. `health.go` is at
  292 of 300 lines (M11).
- `cmd/cairn/deps.go` and `cmd/cairn/main.go`: one `stderr *os.File` field, set in `main.go`
  beside `d.stdout` (M8).
- New test files in `cmd/cairn`: `report_terminal_test.go`, `report_pty_e2e_test.go` (the pty
  tests), `report_diff_e2e_test.go` (T8), `report_shots_e2e_test.go` (T9, env-gated).
- `.github/workflows/tool.yml:159`: the `-run` pattern widens to `'TestNewE2E|TestReportE2E'` so
  the Linux job prints the pty tests' `-v` lines (Decision 9). One pattern.
- `tool/docs/adr/0002-render-dependencies.md`: an addendum naming the two test-only modules,
  which the pin's comment points to (M17).
- `tool/docs/design/terminal-standard.md`: the grading checklist, which item 9 names.
- `tool/docs/design/copy-standard.md`: any new string, under standing answer 5.
- `MIGRATION-NOTES.md`: the pass's note, which every pass maintains.

The pass touches none of `tool/internal/setup/{loopback,signin,runner}*`, `tool/internal/secrets/**`, or `tool/internal/providers/**`; a task that needs one parks the pass, because that would change the class to `auth-data`.

Out of the pass: `--json` output, exit codes, agent events, help, errors, the `cairn sites`
listing, and the other list commands (pass 3). `env.go` and `new_*.go` are read, never edited.
Smallest thing that meets acceptance. No abstraction, export, flag, or fallback the design does
not name. Cleanup beyond D1 to D8 is filed through `standards:log-issue` and listed in the PR,
never done.

## Decisions made at planning

Each is a reading of the design the executor builds on. A reviewer who disagrees raises it in the
PR; the executor does not re-argue it.

1. **Item 2's clock line** waits on question 1. T8 builds whichever choice comes back; the
   doctor half is the same under all three.
2. **Held draws `◌`** (M1). `body_single.go:88` returns `g.Held`, the WATCH comment goes, and
   every terminal golden with a held row changes once, in T3. The PR says which mark held checks
   use, quoting PR #245's result.
3. **The locale check** is one pure function in `cmd/cairn/report_terminal.go`,
   `localeIsUTF8(env func(string) string, goos string) bool`. It reads `LC_ALL`, then
   `LC_CTYPE`, then `LANG`, takes the first non-empty value, and answers true when it names
   `UTF-8` or `utf8` in any case. With all three unset, it answers true on Windows and false
   elsewhere. A wrapper, `reportTerminal(d, rf)`, calls `detectTerminal` and applies the answer
   by question 2's choice: under choice 2 a false answer sets `Terminal.ASCII`; under choice 1 it
   also drops the profile to no colour unless `--color always` is set. Only `renderInput` and
   doctor's terminal branch call `reportTerminal`. `detectTerminal` itself is unchanged, so the
   installer, help, and `--width` keep today's behaviour. Pass 3 reuses `reportTerminal` for its
   commands. The read goes through `d.env` (M10).
4. **Doctor's pipe body is `doctor.Format`, unchanged**, with its five goldens. The terminal body
   is a new render view, `ViewDoctor`, which takes `[]doctor.CheckedResult` and the verdict from
   `doctor.Verdicts`. D8's note that `label`, `lineTitle`, and the counts line die once `Format`
   goes does not apply, because `Format` stays as the pipe body (design "Claude's calls": doctor
   "keeps today's lines on a pipe"). The architecture reader's hand-off says so.
5. **Doctor's terminal shape**, from "Command by command" and the mockup: verdict line; a failing
   check takes `■` (RoleFailing) when its condition's severity is the one `spine/exit.go:67-75`
   ranks critical and `□` (RoleUnknown) otherwise; an unchecked check takes `?` under a "could
   not run" title; passes fold to one `●` count line (OK ink only in an OK run, Muted otherwise);
   skips fold to one muted "does not apply" line naming the checks; info results form a muted
   notes group. Doctor's names are sentences over 15 cells, so each row's name takes its own line
   with detail and `→` fix at column 4 (`style.MarkRow`, `style.FixLine`).
6. **The progress line belongs to `cairn health`**, single and every-site. `doctor` reads the disk
   in milliseconds and keeps `doctor.go:85`'s comment true (M23). `logs` is out of the design's
   progress rule.
7. **The progress line's writer.** `deps` gains `stderr *os.File`, set in `main.go` to the
   process's stderr beside `d.stdout = processStdout()` (M8). The line shows only when
   `style.IsTerminal(d.stdout)` and `style.IsTerminal(d.stderr)`, `CI` is empty, and neither
   `--json`, `--quiet`, nor `--verbose` is set (`--verbose` keeps `checkProgress`). It writes
   through `cmd.ErrOrStderr()` and flushes with the `auth.go:61` assertion, so the `logx`
   scrubber still sees every byte. It starts after 200 ms and redraws every 120 ms with `\r` and
   an erase-line. The drawing goroutine is stopped and joined before the erase, so no late frame
   lands after it. The erase runs before the report, before an error, and on cancellation.
8. **`cairn sites` in pass 2 is the status block alone** (M24). The credential rows after the
   listing take `style.Title` and `style.MarkRow`s on a terminal. The listing (title, count, and
   table) belongs to pass 3's list commands, and its bytes stay as they are. Item 1's `cairn
   sites` shots are graded on the credentials block, and the grader is told the listing above it
   is pass 3's (`[ambiguous]`).
9. **CI's `-v` line.** The pty tests are named `TestReportE2E...`, and `tool.yml:159`'s pattern
   widens to name them, so the Linux job's log shows each ran. One line outside the row, recorded.
   The pty tests run with `t.Parallel()`, a per-test timeout, and a site host whose delay is the
   only wait, so the Linux leg stays inside its 15 minutes (M18). The first pty test written is
   timed, and the timing goes in the task report. The T8 differential test is gated on
   `CAIRN_E2E_BASE_BIN` (a `main` binary built by the session) and skips visibly on CI; its
   evidence is the session's local `-v` run.
10. **Pty dependency.** `standards:dependency-upgrade` chooses one pty module and one emulator
    from M17 (or better ones it finds), with `GOOS=windows go vet ./...` and `GOOS=darwin go vet
    ./...` clean, and the PR names both. They are test-only: `go mod why` shows only `_test.go`
    importers. The pin in `purity_test.go` moves to 14 with its comment, and ADR-0002 gains the
    addendum.
11. **Standing answer 3's "two named exceptions".** The design never names them. The plan reads
    them as none in pass 2: no pipe golden changes (`[ambiguous]`).
12. **The screenshot fixture** is a `cmd/cairn` test gated on `CAIRN_SHOTS_DIR`. It starts the
    proxy with fakes for the Cloudflare and GitHub hosts and the site host, writes a registry of
    two sites (`my-site-a1b2c3` and one more valid id, M20), a logs fake holding at least three
    entries (M25), a doctor site directory, and the CA into that directory, then waits for a
    `done` file, as M5 did. The fakes give at least one failing, one held (`--ack`), one
    could-not-run (delegation or email, M6), and one passing row. The kitty commands pass the
    proxy and `HOME` only inside `env -i`.
13. **`terminal-standard.md` grows a grading checklist** (item 9), its rows margin, mark column,
    title weight, colour use, and density, each phrased as a pass or fail a grader can score from
    a PNG. Recorded as `[conflict]`, since pass 1's row held that file and pass 2's does not.
14. **A DNS-dependent row is the one flaky input.** A pty or differential case that fails only on
    the delegation or email row reruns once. A second failure is a defect.

## Standing answers

From the round design. A stop with none parks the pass.

1. Retry up to twice the approved path minutes (400) while each retry fixes a traced cause. The
   round stops new launches past 1,160.
2. Applies to pass 1 only.
3. A pipe golden changes: a defect. Fix the code, never the golden.
4. Did not fire in pass 1 (M1). Held draws `◌`.
5. A missing copy string (the doctor group titles, the progress text): draft it into
   `tool/docs/design/copy-standard.md`, run `cairn-register-editor`, and list it in the PR.
   Mockup wording never ships.
6. A debt item that changes output or needs an out-of-row file: leave it, file it through
   `standards:log-issue`, list it in the PR.
7. Setup-tooling pass 3 has not closed, or the busy check exits 1: nothing launches.

The twelve in `round-run.md` hold. The plan adds these run rules:

- Each accepted task's report names the CI verdict on that head, or says CI has not run on it.
- After the whole-branch review, a Low finding from a delta read is folded once, checked by the
  session's own diff read and CI, or filed. It never starts another review round.
- If an acceptance item becomes unreachable mid-run (the kitty container gone, say), every other
  item still runs; the PR reports that item unmet with its cause, and the packet says so first.
- A terminal golden diff that touches a plain golden stops the task: standing answer 3.
- T9 runs one regrade round. A row the exemplar still wins after it is filed and listed in the PR.

## Tasks

Every task goes to `cairn-implementer` in its own worktree off the pass branch. Each implementer
loads `standards:go-conventions` for every file under `tool/`, `standards:golang-spf13-cobra`
before opening a file in `tool/cmd/cairn`, `standards:elm-conventions` before touching Bubble Tea
code (none is planned), `standards:tui-visual-verify` before any claim about what a terminal
paints, `cairn-writing-docs` for `is-it-working.md`, and `writing-voice` for prose. Code comments
follow Go Doc Comments; the em dash is banned in them.

After each task commits, from the pass worktree, after the port check:

```sh
npm run lane:fast -- --range e5f4a4e6e..HEAD
```

Its tool leg is `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`. After every task,
`git diff --stat e5f4a4e6e -- tool/internal/render/testdata/golden/plain tool/internal/doctor/testdata/golden`
prints nothing.

Path: T2 → T3 → T5 → T4 → T6 → T7 → T8 → T9 → T10 → Close.
45 + 60 + 10 + 35 + 75 + 15 + 25 + 45 + 15 + 20 = 345 minutes.

### T2. D1 to D8 in `doctor` (45 min)

D8 lands first, so `render` may import `doctor` from T4 on. One commit per item, each verified
first against the code (see "Debt items"):

- D8: move `DoctorSchemaVersion` and its doc comment from `render/json.go:33-37` to
  `doctor/json.go`, repoint `doctor/json.go:90`, and move the assertion at
  `render/json_schema_test.go:449` to `doctor`'s tests. Then
  `go list -deps ./internal/doctor | grep -c internal/render` prints 0. No output changes.
- D1: one status table read by `wireCheck` (`json.go:106`) and `checkVerdict` (`result.go:90`).
- D2: `Result.ID` and `Severity` stop copying the check's values; readers take them from `Check`.
- D3: one wrapper for the wrangler opening (`check_bindings.go:33`, `check_observability.go:20`,
  `check_migrations.go:47`, `check_media.go:43`) and one for the site-facts opening
  (`check_media.go:33`, `check_roles.go:109`, `check_posture.go:288`). The media check's
  facts-then-wrangler order is kept.
- D4: one opening for `readUnder` and `listUnder` (`fileread.go:25,52`).
- D5: unexport what has no outside reader, after the S6 search re-run, leaving every name
  `cmd/cairn`, `cmd/copylist`, and (after T4) `render` read.
- D6: fix the false comments (`report.go:8-11` cites a render constant doctor no longer mirrors;
  `check.go:143` says the facts checks follow the file checks, but `configMediaBucket` is second;
  `check_siteconfig.go:21`; `check_mount.go:10`) and drop the process citations
  (`siteconfigpath.go:17,33` "retired wizard", `fileread.go:23,94-95` the TypeScript path).
- D7: `joinOr` moves to the checks that call it, `siteconfigpath.go` into `siteconfig.go`,
  `jsonc.go` into `wrangler.go`, `robotsURL` (`check_posture.go:269`) into `fetchrobots.go`.

Keep the passages the debt read names worth keeping (`jsonc.go:26-35`, `fetchrobots.go:14-30`,
`jssource.go:11`). The five doctor goldens and `make -C tool check-copy` stay unchanged.

### T3. Render on the grid: single, many, logs, status, held `◌` (60 min)

- Replace `insetRule` at its three callers with `style.Title`, and delete `insetRule` (M13).
- Single-site body: verdict line at the margin per the mockup (`  CRITICAL  my-site  <tally>`),
  `Checked <age> ago (...)` line, then sections. Rows go through `style.MarkRow` at margin 2,
  mark column 2, name column 4, detail column 20; a name over 15 cells takes its own line; under
  60 columns every row is one column. Fixes go through `style.FixLine`. The pass count line uses
  `●` in OK ink only when the verdict is OK, Muted otherwise.
- Every-site body: keeps its columns and every site; titles and rows move to the grid.
- Logs body: the `Logs  <site>  <date> <zone>` title.
- Status view (`ViewStatus`, the `cairn sites` credentials block): `style.Title` and
  `style.MarkRow`s (Decision 8).
- Held: `body_single.go:88` returns `g.Held`, the WATCH comment goes (Decision 2).
- Regenerate the terminal goldens once with `make -C tool golden`, read the whole diff, and
  confirm with the plain check above that no plain golden moved. Update `TestGoldenCorpusIsSized`
  only if a file was added.
- Item 6's check: over every terminal golden of a run with a failing check, no line below the
  first failing row carries the OK role's SGR at that golden's profile. At a no-colour profile,
  where no SGR exists, the test instead asserts the pass count line below the failing row is
  present and carries no OK mark ink, so it cannot pass on an empty search.
- Item 1's grid check, on the no-colour terminal goldens: each mark sits at column 2, each short
  name at column 4, and each detail at column 20, and no line at 59 columns holds two columns.

### T5. The locale check (10 min)

Before T4, since T4's `LC_ALL=C` golden needs it. `localeIsUTF8` and `reportTerminal` in
`cmd/cairn/report_terminal.go` (Decision 3), with question 2's choice applied. A table test in
`report_terminal_test.go` calls `localeIsUTF8` directly: `LC_ALL=C` over `LANG=en_US.UTF-8`
gives false; `LC_ALL` unset with `LC_CTYPE=C.UTF-8` gives true; `LANG=en_US.utf8` gives true; all
unset gives false for `linux` and `darwin` and true for `windows`. A second table drives
`reportTerminal`'s env through to its (profile, ASCII) answer for a terminal stdout, under
question 2's choice. One pty case in T6 confirms `LC_ALL=C` on a pty paints ASCII marks.

### T4. Doctor's terminal body (35 min)

- `render` gains `ViewDoctor` and its body (Decision 5), importing `doctor` (free after T2).
- `cmd/cairn/doctor.go` picks the terminal body when `reportTerminal` reports a TTY, and keeps
  `doctor.Format` for a pipe. `--json` and `--quiet` keep today's paths.
- Goldens, built with a fixed `Options.Now` where a clock appears: one run holding a failing, a
  warning-level failing, an unchecked, a skipped, an info, and a passing check (item 5), at
  truecolor, `NO_COLOR` (no colour profile), and the profile and tier `reportTerminal` returns for
  `TERM=dumb` and for `LC_ALL=C`, at 80 and 59 columns. Add `health` goldens for `TERM=dumb` and
  `LC_ALL=C` the same way if T3 left none.
- Tests: no `ESC` byte in the no-colour goldens, and the item 4 byte check on the `TERM=dumb`
  and `LC_ALL=C` ones as question 2 settles it (items 3, 4); each verdict word, section name, and
  mark present under no colour (item 3).
- Item 5's grep runs over `tool/internal/render/testdata/golden` with SGR sequences stripped
  first, and prints nothing. The same command run against
  `tool/internal/doctor/testdata/golden/every-status.txt` prints its rows, which shows it can
  fail.

### T6. The progress line (75 min)

- `standards:dependency-upgrade` picks the pty and emulator modules (Decision 10); `go get` each
  at an exact version; `GOOS=windows go vet ./...` and `GOOS=darwin go vet ./...` pass; the pin
  moves to 14 and ADR-0002 gains its addendum.
- `deps.stderr` and the `main.go` line (Decision 7).
- `report_terminal.go` gains the progress line (Decision 7), wired into `runHealthSingle` and the
  sweep beside `checkProgress`, which keeps the `--verbose` path.
- Pty tests in `report_pty_e2e_test.go`, named `TestReportE2E...`, through `testharness.Binary`
  and a proxy whose site host sleeps long enough to pass 200 ms. Every child gets
  `LANG=C.UTF-8` (M19).
  - "Appears on stderr": stdout on pty A and stderr on pty B. The line shows on B during the run,
    and A's final screen holds the report and no progress line.
  - Final-screen cases share one pty and its emulator. The line is absent from the final screen,
    and after an interrupt mid-run (the test signals its own child) no progress line remains.
  - Absent when stdout is a pipe; absent when stderr is a file, and that file holds no `ESC`
    byte; absent with `CI=1`, `--quiet`, `--json`, and `--verbose`.
  - `LC_ALL=C` on a pty paints ASCII marks (T5).
- `tool.yml:159` gets the widened pattern (Decision 9).

### T7. `cairn sites` status block (15 min)

Decision 8. `writeSitesStatus` already renders `ViewStatus`, which T3 moved to the grid; this
task checks the terminal path and leaves `writeSites` alone. A test asserts the pipe output of
`cairn sites` matches today's bytes for the listing and for the status block. New strings go
through standing answer 5.

### T8. Pipe differential through both binaries (25 min)

`report_diff_e2e_test.go`, gated on `CAIRN_E2E_BASE_BIN`. The session builds the base from the
merge base, never a moving `origin/main`:
`git worktree add --detach $CLAUDE_JOB_DIR/tmp/base "$(git merge-base HEAD origin/main)"`, then
`go build -tags cairne2e -o $CLAUDE_JOB_DIR/tmp/base-bin/cairn ./cmd/cairn` from its `tool/`,
then `git worktree remove $CLAUDE_JOB_DIR/tmp/base`. The test builds the branch binary through
`testharness.Binary`, runs both against one proxy and one registry with stdout a pipe, and
compares:

- `cairn doctor` over a fixture site directory with no `PUBLIC_ORIGIN` (M4), byte for byte;
- `cairn health <site>` and the every-site `cairn health`, as question 1's answer sets out.

The PR shows the local `-v` run.

### T9. Screenshots, the checklist, the grade (45 min)

1. Write the checklist into `terminal-standard.md` (Decision 13) before any capture.
2. Capture `gh pr status` (in the cairn-cms checkout, with the host's sign-in) and `brew doctor`
   frames in kitty at 80 columns (M22). These run outside `env -i`, since neither goes through
   the fixture.
3. Start the fixture (Decision 12), then shoot `cairn health my-site-a1b2c3`, `cairn health`,
   `cairn doctor`, `cairn logs my-site-a1b2c3`, and `cairn sites` at 80 and 59 columns with
   `kitty-headless-shot -o <dir> -t dark -s <cols>x50 -c 'env -i ... <bin> <cmd>' shot:<name>`
   (M5). Never set `HOME` outside the child.
4. A fresh `standards:visual-verifier` scores the ten shots against `commands.html`'s frames on
   item 1's points and beside the exemplar frames on the checklist, told that the `cairn sites`
   listing is pass 3's. Every row an exemplar wins ends in a fix, then one re-shot and re-grade.

### T10. Docs and changelog (15 min)

Load `cairn-writing-docs`. `docs/admin/is-it-working.md` keeps its pipe transcripts (`:23`,
`:48`) byte for byte, and gains one sentence that a terminal shows the same checks grouped by
state. Read each S13 hit. `CHANGELOG.md` `## Unreleased` gains the entry, and
`MIGRATION-NOTES.md` gains the pass's note (nothing to migrate: pipe and `--json` output are
unchanged). `npm run check:docs-gate` passes, and a fresh `docs-fact-checker` reads the changed
lines.

## Acceptance

Copied verbatim from the design, each mapped to its task and its evidence.

Every pass:

- `make -C tool check` passes, the tool's CI passes on Linux, macOS, and Windows (`.github/workflows/tool.yml`), and a fresh `standards:go-architecture-reader`, handed the text of the pass's debt items, reports none of them still open in the packages the pass cleaned. A pty test that skips on an OS counts only where it ran: the PR shows its `-v` line from the Linux job.
  - Close. Evidence: the gate's last line, `ci-green <sha> --pr <n> --wait` exit 0, the reader's
    verdict over `internal/doctor` with D1 to D8's text and Decision 4's note, and the Linux
    job's `-v` lines for `TestReportE2E...` (Decision 9).
- The fixture is the test harness (`tool/internal/testharness`): the binary built with the `cairne2e` tag, a proxy that fakes the Cloudflare and GitHub hosts, and a site registry in a scratch home. Screenshots run through it. Goldens come from tests that build a report with a fixed `Options.Now`, since the binary reads the real clock.
  - T9 (Decision 12), T3, T4. Evidence: the shot test's file and run line; the goldens' tests.

Pass 2:

1. Kitty screenshots of `cairn health my-site`, `cairn health`, `cairn doctor`, `cairn logs`, and `cairn sites`, each run through the fixture at 80 and 59 columns, match their frames in `commands.html` on these points: margin 2, marks at column 2, short names at column 4 with details at column 20, long names on their own line, bold lowercase titles with no rule, one column at 59.
   - T3, T4, T7, T9. Evidence: ten PNGs in the PR, the fresh grader's per-point verdict, and T3's
     column test. `my-site` runs as `my-site-a1b2c3` (M20); `cairn sites` is graded on its
     status block (Decision 8).
2. The pipe goldens are unchanged, and a harness test runs the `main` and branch binaries against the same fakes and finds `cairn health | cat` and `cairn doctor | cat` byte-identical.
   - Question 1. T8 and every task's plain check. Evidence: `git diff --stat main...HEAD --
     tool/internal/render/testdata/golden/plain tool/internal/doctor/testdata/golden` empty, and
     T8's local `-v` run.
3. With `NO_COLOR=1`, the terminal `health` and `doctor` goldens hold no `ESC` byte, and each verdict word, section name, and mark is present.
   - T3, T4. Evidence: the tests' `-v` lines.
4. With `TERM=dumb`, and separately with `LC_ALL=C`, the goldens hold no `ESC` byte and only bytes from 0x20 to 0x7E, plus newline.
   - Question 2. T5, T4. Evidence: the tests' `-v` lines and T5's env-to-profile table.
5. A `doctor` golden covers one run holding a failing, a warning, an unchecked, a skipped, an info, and a passing check, and each state renders as "Command by command" says. `grep -rnE '^ *(PASS|FAIL|SKIP|INFO|UNCHECKED)  ' ` over the terminal goldens prints nothing.
   - T4. Evidence: the golden's path and text, the grep with its empty output, and the same grep
     printing rows from `every-status.txt`.
6. A terminal golden of a failing run holds no OK-coloured cell below the first failing row.
   - T3. Evidence: the test's `-v` line.
7. A pty test shows the progress line on stderr during a slow fixture run and absent from the final screen. It is absent when stdout is a pipe, when stderr is redirected to a file (the file holds no `ESC` byte), with `CI=1`, and under `--quiet`, `--json`, and `--verbose`. An interrupt mid-run leaves no progress line on the screen.
   - T6. Evidence: the Linux job's `-v` lines.
8. A held check renders `◌` if pass 1's screenshot showed it one cell wide, or `○` if standing answer 4 fired. The PR says which.
   - T3 (Decision 2). Evidence: a held row in a golden and in a screenshot, and the PR's line.
9. Before it captures a screenshot, pass 2 writes the grading checklist into `terminal-standard.md` from the standard's rules: margin, mark column, title weight, colour use, and density. A fresh `standards:visual-verifier` scores the screenshots beside `gh pr status` and `brew doctor` frames on that checklist. Every row an exemplar wins ends in a fix in the PR.
   - T9. Evidence: the checklist's commit before the shots' commit, the grader's table, and each
     fix commit.
10. `docs/admin/is-it-working.md` still embeds the pipe transcript unchanged, and says in one sentence that a terminal shows the same checks grouped by state. `npm run check:docs-gate` passes.
    - T10. Evidence: the diff of the page and the gate's output.

Added checks:

- `go list -deps ./internal/doctor | grep -c internal/render` prints 0 (T2).
- `go mod why` for each new module names only test importers (T6).
- `TestNoCommandFileExceedsItsBound` and `TestOnlyMainNamesTheProcessStreams` pass; `health.go`
  stays at or under 292 lines.
- `make -C tool check-copy` passes with every new string in `copy-standard.md`.

## Debt items, verified at `e5f4a4e6e`

| Id | Verified | Disposition |
| --- | --- | --- |
| D1 | `doctor/json.go:106` `wireCheck` and `result.go:90` `checkVerdict` each switch on `Status` | T2 |
| D2 | `Result.ID`, `Result.Severity` copied from the check | T2 |
| D3 | wrangler opening at `check_bindings.go:33`, `check_observability.go:20`, `check_migrations.go:47`, `check_media.go:43`; facts opening at `check_media.go:33`, `check_roles.go:109`, `check_posture.go:288` | T2 |
| D4 | `fileread.go:25,52` share the containment opening | T2 |
| D5 | `Status`, `Result`, `Check` fields, `OriginSource`, `OriginAbsent` with no outside reader | T2, after S6 |
| D6 | `report.go:8-11`; `check.go:143` (12 checks, `configMediaBucket` second); `check_siteconfig.go:21`; `check_mount.go:10`; `siteconfigpath.go:17,33`; `fileread.go:23,94-95` | T2 |
| D7 | `report.go:61` `joinOr`; `siteconfigpath.go`; `jsonc.go`; `check_posture.go:269` `robotsURL` | T2 |
| D8 | `render/json.go:33,37` (M16). "Dead once Format goes" does not apply (Decision 4) | T2 |

## Close

1. Whole-branch `standards:diff-reviewer` against this plan and the design; fold its findings.
2. Fresh `standards:go-architecture-reader` (Opus, `medium`) on `internal/doctor`, handed D1 to
   D8's text and Decision 4's note; none may be reported open.
3. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` after the port check.
4. Push; `ci-green <sha> --pr <n> --wait` as a background task from the pass worktree.
5. The PR body opens with a paragraph written per `~/.claude/docs/voice/written-for-people.md`,
   then what landed, the acceptance evidence, the held-mark line, the two dependencies, every
   standing-answer-5 string and standing-answer-6 filing, `## Decisions`, `## Planning misses`,
   and the score. Backlog #274 (recapture `04-doctor-report.txt`) becomes placeable after merge.
6. Hand the PR to the conductor; merge only through the queue.

## Planning misses

- `[design-gap]` Item 2 asks byte-identity of `cairn health | cat` across two binaries, but its
  `checked:` line reads the real clock and `main`'s binary has no clock hook (M2, M3). Question 1.
  `[advisor]` The advisor set the deciding probe (pairs of one binary) and said to park if the
  pairs did not match reliably; two of five differed.
- `[design-gap]` Item 4 asks no `ESC` byte under `LC_ALL=C`, but the design's tier rule gives a
  non-UTF-8 locale ASCII marks only, and colour is a separate axis (M21). Question 2. Found by
  the plan reviewer. `[advisor]` The advisor confirmed it holds, put the as-written reading first, and asked
  that its cost be stated. The recommendation is the planner's.
- `[file-list]` The row has no room for the locale and progress code: `health.go` is at 292 of
  300 lines (M11). New `cmd/cairn/report_terminal.go` and four test files.
- `[file-list]` Only `main.go` may name `os.Stderr` (M8), so `deps.go` and `main.go` change for
  the stderr terminal check. Found by the plan reviewer.
- `[file-list]` The pty tests' `-v` line needs `tool.yml:159`'s pattern widened (M18,
  Decision 9).
- `[file-list]` Two test-only requires move the pin in `purity_test.go` and add an ADR-0002
  addendum, which is out of row (M17). Found by the plan reviewer.
- `[file-list]` `copy-standard.md` (standing answer 5) and `MIGRATION-NOTES.md` (every pass) sit
  outside the row.
- `[conflict]` Item 9 writes `terminal-standard.md`, which pass 2's row omits (Decision 13).
- `[conflict]` A locale read inside the shared `detectTerminal` would change the installer, which
  is outside the round (M9). It lives in `reportTerminal` instead (Decision 3). Found by the plan
  reviewer.
- `[ambiguous]` "The `sites` status block" against item 1's `cairn sites` screenshot (Decision 8).
- `[ambiguous]` Standing answer 3's "two named exceptions" are named nowhere (Decision 11).
- `[mechanism]` Stderr is a line-buffering scrubber, not a file (M7): a `\r` progress line needs
  a flush.
- `[estimate]` The first path came out at 305 minutes; the review fold re-totals it at 345,
  against the approved 200. Under the 400 park line, so it goes to Geoff as the budget line.

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) on 2026-11-14 returned sixteen findings. Its
spot-checks of the citations held, except those in F11.

| Finding | Disposition |
| --- | --- |
| F1 High: `report_terminal.go` cannot name `os.Stderr` or `os.Stdout` (`TestOnlyMainNamesTheProcessStreams`) | Folded: `deps.stderr` set in `main.go`, `d.stdout` used (M8, Decision 7, misses). |
| F2 High, design-changing: item 4's no-`ESC` under `LC_ALL=C` against the tier rule | Question 2 in the park. |
| F3 Medium: the locale in `detectTerminal` reaches the installer | Folded: `reportTerminal`, called only by `renderInput` and doctor (Decision 3). |
| F4 Medium: the require pin fails on two new requires | Folded into T6 and Decision 10, with the ADR addendum. |
| F5 Medium: T5's test could pass with the read missing | Folded: pure-function table, env-to-profile table, and a pty case (T5). |
| F6 Medium: item 2 names the every-site sweep | Folded into T8. |
| F7 Medium: one pty cannot tell stderr from stdout | Folded: two ptys for the "appears" case (T6). |
| F8 Medium: DNS-bound run time and no rerun rule | Folded: `t.Parallel()`, per-test timeout, a timing in the task report (Decision 9), and one rerun rule (Decision 14). |
| F9 Low: the progress goroutine must be joined before the erase | Folded into Decision 7. |
| F10 Medium: doctor fetches `/robots.txt` | Folded: M4 corrected; T8's site directory has no `PUBLIC_ORIGIN`. |
| F11 Low: four citations wrong | Folded: `purity_test.go:243` dropped, M6 and Decision 5 corrected, the fold filled in. |
| F12 Medium: the sites listing is pass 3's | Folded after reading the frame and pass 3's row: pass 2 owns the status block, and item 1's `cairn sites` shots are graded on it (Decision 8). |
| F13 Low: `copy-standard.md` and `MIGRATION-NOTES.md` | Folded into Scope, T10, and misses. |
| F14 Low: checks that could pass without the change | Folded: item 5's grep path, SGR strip, and negative control (T4); item 6's no-colour assertion and item 1's column test (T3); `my-site-a1b2c3` (T9); `gh` and `brew` probed (M22); logs entries (Decision 12). |
| F15 Medium: estimate near 370 | Folded: tasks re-estimated to 345, one regrade round in T9, and the budget line in the park. |
| F16 Low: task order, base pin, standing answer 7 | Folded: T1 into T2, T5 ahead of T4, base built from `git merge-base`, standing answer 7 listed. |
