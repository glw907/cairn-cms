Initiative: cairn-setup
Round: tui-language
Pass: 1 style

# Pass 1 `style`: one shared terminal package, no visible change

Design: `~/Projects/initiatives/cairn-setup/specs/2026-11-13-tui-language-design.md`, approved by
Geoff through design packet `20261113-224909-04cfc7` on 2026-11-13. Debt read:
`~/Projects/initiatives/cairn-setup/research/tool-debt-read-2026-11-13.md` (items R1 to R9).
Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/tui-language-1`, branch
`tui-language-1`, base `59a71163d`. PR base `main`. Class `ordinary`. Planned path 205 minutes
against the design's 150. The park line and the retry ceiling are both 300, twice the approved 150.

## Pre-flight

Owner steps: none. Nothing in this pass needs a sign-in, a secret, a dialog, or a permission rule.

- Permissions checked: every task's writes were read against auto mode and the denials log
  (`~/.local/state/claude-denials.jsonl`, 66 rows, 2026-11-01 to 2026-11-14). The pass writes only
  repo files under `tool/` and `docs/internal/plans/`, no `.claude/` path, no credential, no public
  surface. The refused classes it must route around are listed under "Auto-mode routes" below.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), with pass-core `planner.md`
  "Stops" and "Pre-flight" added to its prompt. Findings folded under "Plan review fold".
- Evidence: the mechanism table and the recorded searches below. Every row is a probe run at
  `59a71163d` on 2026-11-14 or a quoted source line.

### Auto-mode routes

| Refused class (denials log) | Route this pass takes |
| --- | --- |
| Interfere With Workloads (`kill`, `pkill`, `claude stop`) | Never stop a process. A hung command runs under `timeout`. A busy port 49152 is waited out. |
| Irreversible Local Destruction (`git reset --hard`) | Throwaway commits for acceptance items 2 and 3 go on a detached HEAD (Task 7), then `git switch tui-language-1`. |
| Code from External (`go run ...@latest`) | Tools come from the Makefile and `go.mod` only. |
| Safety Bypass Flag (`--no-verify`) | Never. A failing hook is a defect to fix. |
| Destructive (setup command compounded and piped to `tail`) | Run the setup command bare, alone in its own call. Gates and CI watches run bare, never piped. |
| Merge Without Review (`gh pr merge`) | Merge only through `approval-queue` after Geoff's approve. |
| Classifier unavailable | Retry the same call once after a pause. |

### Port 49152

`make -C tool check` binds `127.0.0.1:49152` in the loopback tests, and a live `cairn new` proving
run holds the same port. Before every `make -C tool check` (and every `go test ./...`), run:

```sh
ss -ltnH 'sport = :49152'
```

Empty output means the port is free. Any line means a proving run is live: wait with a `Monitor`
until-loop on the same command, never kill the holder.

## Mechanism table

| # | Mechanism | Probe or source | Result |
| --- | --- | --- | --- |
| M1 | Widened purity rule over today's tree | `grep -nE '"#[0-9a-fA-F]{3,8}"'`, `lipgloss\.(Color\|ANSIColor)\(\|color\.RGBA\{`, and the colour-setter names over non-test `.go` outside `internal/render` | Hex literals: `cmd/cairn/fang.go:23-27` (5), `internal/ui/newview/theme.go:39-46` (8 rows). `lipgloss.Color(`: `fang.go:35`, `theme.go:91,94,95`. Colour setter: `theme.go:110` `.Foreground(`. No hit under `internal/setup/**`, `internal/secrets/**`, `internal/providers/**`. The three `.Background(` hits in `main.go:95`, `root.go:161`, `deploy.go:305` are `context.Background()`, so the test matches on a `lipgloss.Style` receiver chain, not the bare name (Task 3). |
| M2 | Lip Gloss v2.1.0 colour setters | `grep -hoE 'func \(s Style\) [A-Za-z]+\([^)]*color\.Color'` over the module | `Foreground Background BorderForeground BorderBackground BorderTop/Right/Bottom/LeftForeground BorderTop/Right/Bottom/LeftBackground BorderForegroundBlend UnderlineColor MarginBackground` |
| M3 | Loopback page colours | hex grep over `internal/setup/loopback/pages/*.html` (8 pages) | Every hex is a role-table value, a ground (`#221f1a` 8, `#fdfbf9` 8), or a tint (`#1b1430` 4, `#2b2537` 1, `#5f4f94` 1, `#b9a3ec` 1, `#f3eefc` 1, `#ffffff` 4). The new test passes on today's pages and fails with any tint removed. |
| M4 | Mark widths | throwaway `cmd/zzprobe` (removed): `displaywidth` narrow, wide, and `ansi.StringWidth` | `● ■ □ ○ ▲ → ─ · …` = 1/2/1 (EAW A). `◌` U+25CC and braille `⣾⣽⣻⢿⡿⣟⣯⣷` = 1/1/1 (EAW N). ASCII single-character marks 1/1/1; the ASCII Ellipsis `...` and Spinner `...` are 3/3/3. |
| M5 | Render's width tables | `internal/render/width.go:35-62` | Unicode tier measures with `displaywidth` `EastAsianWidth:false`; ASCII tier with `true` (`tableWide`). A theme built by `NewTheme` without `forTier` measures narrow (zero value). |
| M6 | `ansi.StringWidth` | `x/ansi@v0.11.9/width.go:66` | `stringWidth(GraphemeWidth, s)`, a different library path from `displaywidth`. It may differ from render's narrow table on emoji and ZWJ sequences, so Task 4's width swap in `newview` is gated. |
| M7 | `colorprofile.Profile` values | `colorprofile@v0.4.3/profile.go` | `Unknown`=0, `NoTTY`, `ASCII`, `ANSI`, `ANSI256`, `TrueColor`. Render's `ProfileNoColor`=0 maps to `Ascii` (`profile.go` `ColorProfile`). `newview.NoColor()` is `NoTTY \|\| Ascii` (`theme.go:84-86`). |
| M8 | Render profile checks | `grep -n 'Profile[A-Z]'` over render | No colour: `palette.go:120,137` (Style, strong), `body_single.go:118` (`keepsWord`), `:254`, `body_many.go:716` (link gate). ANSI-16 slot: `palette.go:123`. Outside: `cmd/cairn/fang.go:86`, `root.go:144`. `golden_test.go:65-76` `profileName` maps each profile to the golden file names `nocolor`, `ansi16`, `ansi256`, `truecolor`; `colorprofile.Profile.String()` would rename every golden. |
| M17 | Render's platform files and their pins | `ls internal/render/profile*`; `cmd/cairn/root_test.go:446-457`; `internal/hygiene/buildtags_test.go` | Four files: `profile.go`, `profile_linux.go`, `profile_darwin.go`, `profile_windows.go`; the Linux and macOS files define `enableVirtualTerminal`, which `profile.go:98` calls. `TestTerminalChecksAreConfinedToTheColourProfile` pins `const profile = "internal/render/profile.go"` as the one file allowed `term.IsTerminal`. The hygiene test forbids `//go:build` lines, so platform splits use file-name suffixes only. |
| M18 | Render's three wraps | `internal/render/layout.go:324-386`, callers | Plain `t.wrap` at `layout.go:291,405,426,443,450`, `body_single.go:214`; `t.wrapNoOrphan` at `body_many.go:728,734,760`; exported `Theme.Wrap` = `wrapNoOrphan(text, content(width))`, so it clamps to `widthCap` 120, with one outside caller, `root.go:144-145`. All three measure with the theme's table, wide at the ASCII tier. |
| M19 | `widthFloor` in tests | `golden_test.go:30` | `goldenRungs = []int{widthFloor, widthNarrow, Width80, width100, widthCap}`; every `w040` golden comes from that rung. |
| M20 | newview's `Fg` | `theme.go:101-106`, `summary.go:115` | `Fg` returns a profile-resolved colour, `NoColor{}` at no colour and at ANSI-16 for a role with no slot; `summary.go:115` (out of row) reads it. |
| M9 | Render's held mark today | `internal/render/glyph.go:46-69`, `newview/theme.go:137-143` | Render Held = `○`/`o`; newview Pending = `○`/`o`. Both equal the design's not-started Unicode mark with today's ASCII `o`. |
| M10 | Command-file line bound | `cmd/cairn/root_test.go:470-480` | Every `cmd/cairn/*.go` except `messages.go` must hold 300 lines or fewer, counted as `\n`. Today `root.go` 298, `new_terminal.go` 298, `health.go` 291. |
| M11 | Outside readers of render's `Frame` fields | `grep -rn '\.Header\b\|\.Footer\b\|Frame{'` over test files outside render | None (every hit is `http.Header` or `tar.Header`). R4 can unexport the fields. |
| M12 | `AuthCheckPermission` | `grep -rn AuthCheckPermission` | Read by `cmd/cairn/probe_token.go:120,124`, out of row. R5 keeps the exported name and deletes the unexported twin. |
| M13 | Kitty screenshots in two fonts | `kitty-headless-shot -t dark -s 80x40 -c 'kitty @ load-config --override font_family="Adwaita Mono" ~/.config/kitty/kitty.conf; clear; <cmd>' shot:adwaita` | rc 0, painted in Adwaita Mono. The default (no override) paints JetBrains Mono from `~/.config/kitty/kitty.conf`. The `term-headless` container's `fc-list` has Adwaita Mono (4 faces) and JetBrains Mono (48). Overriding `HOME` breaks distrobox ("no such container"), so never set it. |
| M14 | Specimen program pattern | `tool/cmd/mangen/` | A `package main` beside a `main_test.go`. CI's `go test ./...` covers any new `cmd/` directory. The release build compiles `./cmd/cairn` only (`.github/workflows/tool.yml:259`). |
| M15 | `check-copy` scope | `tool/scripts/check-copy.sh:13` | Reads `testdata/copy.golden.md` only, built from `cmd/cairn`. The specimen's sample strings do not enter it. |
| M16 | Golden update path | `Makefile` `golden:` | `go test ./internal/render -run TestGolden -update`. Standing answer 2 forbids running it in this pass. |

## Recorded searches

| Search | Hits |
| --- | --- |
| `render\.` callers outside `internal/render` (non-test) | `cmd/cairn/fang.go:86`, `health.go:207-214`, `main.go:31`, `root.go:142,144`, plus `probe_token.go`, `json`-marshal callers in `cmd/cairn` (untouched: JSON stays in render) |
| `render.DetectProfile` named in a comment | `cmd/cairn/env.go:67,117`, `deps.go:60,63`, `root.go:37,77` |
| `render.Profile*` and `Profile[A-Z]` in `.go` | 16 files: 14 under `internal/render` (body_test 64, palette_test 13, profile 22, profile_test 22, golden_test 8, ...), `cmd/cairn/fang.go` 1, `fang_test.go` 1, `root.go` 1 |
| newview `Role*`, `Glyphs`, `GlyphsFor` users outside the row's three files | `done.go` 8, `summary.go` 9, `browser.go` 6, `welcome.go` 6, plus `questions`, `watch`, `prereq`, `stop`; `model.go:189` compares `cfg.Glyphs == GlyphsFor(true)` |
| `ansi.StringWidth` in newview | in row: `grid.go:169`, `footer.go:27`. Out of row: `done.go:22`, `browser.go:212-217`, `watch.go:143-155`, `summary.go:152-154` |
| `newview.NewStyles` signature pins | `cmd/cairn/new_terminal.go:86`, `new_terminal_test.go:62,368` (`NewStyles(true, colorprofile.TrueColor)`) |
| `DoctorSchemaVersion` | `render/json.go:33-37`, `doctor/json.go:7,90`, `render/json_schema_test.go:449`, `render/purity_test.go:243` |
| `testdata` directories in `tool/` | `.`, `internal/{doctor,record,render,setup,store,ui/newview}` |

## Scope

The design's file row for pass 1: `tool/internal/style/**` (new), `internal/render/**`,
`internal/ui/newview/{theme,grid,footer}.go` and their tests, `cmd/cairn/{fang,fang_test,health,root,new_terminal}.go`,
`tool/cmd/specimen/**` (new), `tool/docs/design/**`, `tool/docs/adr/**`.

The plan adds three `cmd/cairn` files, each for a reference to a render name this pass moves
(recorded under "Planning misses" as `[file-list]`):

- `cmd/cairn/main.go:31`: `render.IsTerminal` becomes `style.IsTerminal`. One line.
- `cmd/cairn/env.go:67,117` and `cmd/cairn/deps.go:60,63`: comments naming `render.DetectProfile`
  are repointed to `style.Detect`. Comments only.
- `cmd/cairn/root_test.go:447`: the pinned `const profile` becomes `"internal/style/detect.go"`,
  with its doc comment repointed (M17). One constant.

The pass touches none of `tool/internal/setup/{loopback,signin,runner}*`, `tool/internal/secrets/**`, or `tool/internal/providers/**`; a task that needs one parks the pass, because that would change the class to `auth-data`.

The loopback test reads `internal/setup/loopback/pages/*.html` and never writes them.
`CHANGELOG.md` gains no entry: the pass changes no command's output or behavior, which acceptance
item 1 proves. `go.mod` does not change: every import `style` needs is already a direct dependency.

Smallest thing that meets acceptance. No abstraction, export, flag, or fallback the design does
not name. Cleanup found beyond R1 to R9 is filed through `standards:log-issue` and listed in the
PR, never done.

## Decisions made at planning

Each is a reading of the design the executor builds on. A reviewer who disagrees raises it in the
PR; the executor does not re-argue it.

1. **Marks per tier in pass 1.** `style` carries the design's table: Pass `●`/`+`, Failing
   `■`/`!`, FailingWarn `□`/`*`, CouldNotRun `?`/`?`, Held `◌`/`o`, NotStarted `○`/`o`, Warning
   `▲`/`^`, Fix `→`/`>`, Rule `─`/`-`, Sep `·`/`-`, Ellipsis `…`/`...`, Spinner
   `⣾⣽⣻⢿⡿⣟⣯⣷`/`...`. NotStarted's ASCII stays `o` in this round, because `newview` owns that
   mark and the design moves it to `.` in the installer round. Render's held row draws
   `NotStarted` in both tiers (today's `○`/`o`), so no golden changes. It carries
   `// WATCH: pass 2 item 8 switches this to Held; every golden with a held row changes then.`
   newview's `Pending` reads `NotStarted`. `[ambiguous]`: the design's table gives held `◌` while
   acceptance item 1 forbids a golden change, so the held glyph change belongs to pass 2.
2. **Standing answer 4 lands in `style`.** Pass 2's row has no `internal/style`, so pass 1 settles
   Held. If Task 6's screenshots show `◌` wide, clipped, or boxed in either font, `style`'s Held
   Unicode mark becomes `○`, `terminal-standard.md` records the clash as open, and the pass goes
   on. The PR says which way it went in one line for pass 2 to read.
3. **Profile.** `colorprofile.Profile` replaces `render.Profile` everywhere, per the merge table.
   `style.Detect` returns only `Ascii`, `ANSI`, `ANSI256`, or `TrueColor`: it folds `Unknown` and
   `NoTTY` to `Ascii`, as render's `fromColorprofile` folds them to `ProfileNoColor` today. One
   predicate, `style.NoColor(p colorprofile.Profile) bool` (`p <= colorprofile.ASCII`), replaces
   every `== ProfileNoColor` check and newview's `NoColor()` body. A zero `RenderInput.Profile` is
   `Unknown`, which the predicate reads as no colour, the same as today's zero `ProfileNoColor`.
   One ink means no escape bytes, bold included, as render's `strong` behaves today. newview's
   `NoColor()` today counts `Unknown` as colour; no caller passes `Unknown` (`new_terminal.go:86`
   passes a detected profile), so the change moves no output. The PR's `## Decisions` records it.
   Render's ANSI-16 slot check (`palette.go:123`) becomes `== colorprofile.ANSI` inside `style`.
   `golden_test.go`'s `profileName` keeps its own four names, never `Profile.String()` (M8).
4. **Link at no colour.** The design says newview's plain link wins: `style.Theme.Link` returns
   the zero style at no colour. Render's two link sites already gate on the profile
   (`body_single.go:254`, `body_many.go:716`), so their output is unchanged; leave the gates.
5. **Width measure.** `style` owns render's two `displaywidth` tables and the theme value that
   carries them (worth keeping: `render/width.go:35-40`). The one constructor is
   `style.NewTheme(dark bool, p colorprofile.Profile, ascii bool) Theme`: `ascii` picks the wide
   table and the ASCII marks, as render's `forTier` does today. newview passes `false` for the
   table and reads its marks through `MarksFor`. newview's in-row sites (`grid.go:169`,
   `footer.go:27`) measure under `style`'s narrow table in both tiers, which is what
   `ansi.StringWidth` reads for Ambiguous runes today; newview never takes the wide table, since
   that would move ASCII-tier layout. The swap is gated (Task 4). The four out-of-row
   `ansi.StringWidth` sites stay and are filed for the installer round.
6. **Wrap.** Render's three wraps (M18) move to `style` as two exported `Theme` methods that
   measure with the theme's table, so the ASCII tier keeps the wide measure.
   `Theme.Wrap(text string, width int) []string` is today's exported form (no orphan, clamped to
   120 through `content()`), which keeps `root.go`'s notice bytes. `Theme.WrapGreedy(text string,
   width int) []string` is today's plain `t.wrap` with the same clamp; every render caller already
   passes a width at or under 120, so the clamp moves none of their output. Render's no-orphan
   callers (`body_many.go:728,734,760`) call `Theme.Wrap`. Methods do not appear in `go doc`'s
   package listing, so acceptance item 5 does not count them. `widthCap` moves to `style` with
   the clamp; `widthNarrow` and `width100` stay in render. newview's `grid.go:63-84`
   (non-breaking-hyphen trick over Lip Gloss word wrap) switches to `Theme.Wrap` only if the
   differential test of Task 4 is green. Otherwise newview keeps its wrap, the merge row is
   filed by standing answer 6, and the PR lists it.
7. **Blocks.** `style` implements the nine print-and-exit blocks in one file,
   `internal/style/blocks.go`. A block function is an exported `func` declared at top level in that
   file. `cmd/specimen` is their caller in this pass; `render` and `newview` keep their own
   composition until passes 2 and 3 adopt the blocks, which keeps every golden byte-identical.
   `[ambiguous]`: design line 121 is read as "the blocks exist and are proven by the specimen in
   pass 1; commands adopt them later".
8. **`DoctorSchemaVersion` stays in render this pass.** Moving it needs `internal/doctor/json.go`,
   which is pass 2's row, and pass 2's D8 says "Move the constant first". `[conflict]` between the
   design's shared-package bullet and pass 1's file row; standing answer 6 settles it. The PR lists it
   for pass 2.
9. **Detection moves.** `style.Detect` and `style.IsTerminal` replace `render.DetectProfile` and
   `render.IsTerminal`, and `style/detect.go` becomes the one file in `render` and `style`
   allowed `os`, `x/term`, and colorprofile's detection entry points. All four of render's
   platform files move (M17): `profile.go`, `profile_linux.go`, `profile_darwin.go`, and
   `profile_windows.go` become `detect.go`, `detect_linux.go`, `detect_darwin.go`, and
   `detect_windows.go`, split by file-name suffix only. `render` keeps no `os` import at all.
10. **Help colours.** `fang.go` loses `warmStoneInk` and takes each role's light and dark hex
    from `style` through one package function, `style.Pair(r Role) (light, dark color.Color)`,
    which feeds `fang.go:35`'s `pick` directly. newview's `Styles.Fg` reads
    `Theme.Color(r Role) color.Color`, which keeps today's semantics (M20). Fang still asks
    the terminal for its ground in this pass; the `--theme` change is pass 3's. `TestHelpInksMatchRendersPalette`
    is deleted, since one table cannot drift from itself.
11. **One default width.** `style.DefaultWidth = 80` replaces `render.Width80` and render's
    `defaultWidth` (R2). `widthNarrow` and `width100` stay in render as view policy; `widthCap`
    moves to `style` (Decision 6). `widthFloor` goes (test-only), and `golden_test.go:30`'s rung
    becomes the literal `40` so every `w040` golden keeps its name and bytes (M19). newview's
    `MinWidth`/`MaxMeasure` stay.
12. **render's Theme goes unexported.** With `root.go` on `style.Wrap`, nothing outside render
    names `render.Theme`, `NewTheme`, `Role`, `Glyphs`, or `GlyphSet` (R1). Render keeps an
    unexported `theme` that embeds `style.Theme` and holds the tier's marks (R7).

## Standing answers

From the round design. A stop with none parks the pass.

1. Retry up to twice the approved path minutes (300) while each retry fixes a traced cause. The
   round stops new launches past 1,160.
2. A changed golden is a defect. No session regenerates one (`make -C tool golden` and `-update`
   are never run). The specimen golden is new and is written once, by its own test's update flag.
4. `◌` wide, clipped, or boxed in either font: Held keeps `○` (amber), the standard records the
   clash as open, the pass goes on (Decision 2).
5. A missing copy string: draft it into `tool/docs/design/copy-standard.md`, run
   `cairn-register-editor`, list it in the PR.
6. A debt item or merge row that changes output or needs an out-of-row file: leave it, file it
   through `standards:log-issue`, list it in the PR.
7. Already settled: setup-tooling pass 3 closed and #244 merged at `e17c3c47e`.

The plan adds three run rules the lens requires:

- Each accepted task's report names the CI verdict on that head, or says CI has not run on it.
- After the whole-branch review, a Low finding from a delta read is folded once, checked by the
  session's own diff read and CI, or filed through `standards:log-issue`. It never starts another
  review round.
- If an acceptance item becomes unreachable mid-run (for example, the kitty container is gone),
  every other item still runs; the pass closes, the PR reports that item unmet with its cause,
  and the packet says so first.

## Tasks

Every task goes to `cairn-implementer` in its own worktree off the pass branch, per the repo's
`CLAUDE.md`. Each implementer loads `standards:go-conventions` for every file under `tool/`,
`standards:golang-spf13-cobra` before opening a file in `tool/cmd/cairn`, `standards:elm-conventions`
before touching Bubble Tea code (`internal/ui/newview`), and `standards:tui-visual-verify` before any
claim about terminal painting. Code comments follow Go Doc Comments; the em dash is banned in them.

After each task commits, from the pass worktree:

```sh
npm run lane:fast -- --range 59a71163d..HEAD
```

The tool leg inside it is `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`; run the
port check first. Between merge rows inside a task, the cheap gate is
`go vet ./... && go test ./internal/render/... ./internal/ui/newview/... ./internal/style/... ./cmd/...`
from `tool/`, then `git diff --stat 59a71163d -- tool | grep -E 'testdata|\.golden'` printing nothing.

Each T2 row that removes a render name also repoints every `cmd/cairn` caller of that name in the
same commit, so `./cmd/...` stays green at every row. T3 holds only the edits no T2 row forces.

Path: T1 → T2 → T4 → T5 → T6 → T7, with T3 beside T4 and T8 as a pair beside T2 to T4. T3 and T4
both land before the commit that removes T8's skip. 40 + 60 + 30 + 35 + 25 + 15 = 205 minutes on
the path.

### T1. `style` foundations, moved verbatim (40 min)

Create `tool/internal/style` and move, behavior unchanged:

- `palette.go`: `Role` and its eight constants, the ink table (`render/palette.go:42-54`), `color()`,
  `NewTheme(dark bool, p colorprofile.Profile, ascii bool) Theme` (Decision 5), `Theme` with
  `Style`, `Strong`, `Link`, `Sized`, `SizedStrong`, `SizedLink`, and `Color` (newview's `Fg`
  semantics, M20), and the package function `Pair` (Decision 10). `Link` returns the zero style
  under `NoColor` (Decision 4). Ink values as verified:
  Text `#28231d/#eae7e3/235/255/""`, Muted `#615d57/#a8a49e/243/246/""`, Subtle `#504c47/#c1bdb8/240/250/7`,
  OK `#197037/#7ccd8e/28/114/2`, Failing `#b71824/#ff8e86/160/210/1`, Unknown `#915200/#f7ac4d/130/215/3`,
  Accent `#7246cf/#9d84ec/97/141/5`, Rule `#c9c3bb/#4a443b/251/238/8`.
- `marks.go`: the mark table of Decision 1, as a `Marks` struct and `MarksFor(ascii bool) Marks`.
- `width.go`: `DefaultWidth`, `widthCap`, `content()`, the two width tables, `Theme.Width(s string) int`,
  `Theme.Wrap`, and `Theme.WrapGreedy` (render's `wrapNoOrphan`, `wrap`, and `cutAt`, measured with
  the theme's table and clamped as Decision 6 sets out).
- `NoColor(p colorprofile.Profile) bool` (Decision 3), in `palette.go`.

T1 adds no detection file: the move of render's four platform files is T2 row 1, because
`root_test.go`'s pin allows `term.IsTerminal` in one file only (M17).

Copy render's foundation tests with them (`palette_test`, `glyph_test`, `width_test`, minus the
R8 tests), with `ambiguousRunes` and `groundHex` in test files (R3). Move the ten hexes from
`newview/theme_test.go:24-34,82-83` into `style`'s palette test. Add the mark-width test
(acceptance item 6): every single-character mark in both tiers, each braille frame on its own,
measures one cell through `Theme.Width` under the narrow table, and every single-character ASCII
mark is one cell under both tables. The ASCII Ellipsis and Spinner are `...` and measure 3 under
both tables; the test asserts that.

Render keeps its own copies until T2 deletes them, so the module builds at T1's commit.

Done when: `go test ./internal/style/...` passes, and `! go list -deps ./internal/style | grep -q
bubbletea` exits 0 (`style` imports no Bubble Tea).

### T2. `render` onto `style`, R1 to R9 (60 min)

One merge row per commit, each gated by the cheap gate. Order:

1. Profile and detection: `git mv` render's four platform files to `style/detect.go`,
   `detect_linux.go`, `detect_darwin.go`, and `detect_windows.go` with their test, returning
   `colorprofile.Profile` (Decision 3), with `Detect`, `IsTerminal`, `Env`, and `Terminal`.
   `RenderInput.Profile` becomes `colorprofile.Profile`; every `ProfileNoColor` check becomes
   `style.NoColor(in.Profile)` and `palette.go:123`'s ANSI-16 check becomes
   `== colorprofile.ANSI`; delete `Profile`. Test fixtures that say `ProfileTrueColor` say
   `colorprofile.TrueColor`, and `golden_test.go`'s `profileName` keeps its four file names (M8).
   The same commit repoints `cmd/cairn`: `main.go:31` (`style.IsTerminal`), `health.go:207-214`
   (`style.Detect`, `style.Env`, `style.Terminal`), `fang.go:86` (`style.NoColor(term.Profile)`),
   the comments at `root.go:37,77`, `env.go:67,117`, `deps.go:60,63`, and `root_test.go:447`'s
   pin (Scope). No `testdata` file changes.
2. Palette and styles: delete render's role enum, ink table, `color()`, `Style`/`strong`/`link`/sized
   family; render's unexported `theme` embeds `style.Theme` (Decision 12). The same commit moves
   `root.go`'s `writeNotice` to `style.NewTheme(rf.theme != themeLight, colorprofile.ASCII,
   false).Wrap(msg, style.DefaultWidth)` (net lines zero or fewer) and deletes `fang_test.go`'s
   `TestHelpInksMatchRendersPalette` (Decision 10).
3. Marks (R7): the `theme` stores `style.MarksFor(ascii)` at construction; delete `glyphs(ascii)`
   and `rule(ascii)` threading and `forTier`. Held rows draw `NotStarted` with the `// WATCH:` of
   Decision 1.
4. Width and wrap: render measures through `style.Theme.Width`; plain-wrap callers (M18) call
   `Theme.WrapGreedy` and no-orphan callers call `Theme.Wrap`; delete render's copies, `widthCap`,
   and `content()` (Decision 6). `defaultWidth` and `Width80` become `style.DefaultWidth` (R2).
   `golden_test.go:30`'s `widthFloor` rung becomes the literal `40` (M19).
5. R4: unexport `Frame.Header/Body/Footer` (keep `Lines()`), delete the `Verdict` alias and name
   `spine.Verdict`.
6. R5: delete `authCheckPermission`; `AuthCheckPermission` carries the JSON tags and marshals directly.
   Keep `MarshalAuthCheck`'s nil-to-empty guard, so a nil slice still prints `[]`, never `null`.
   The auth-check JSON golden is unchanged.
7. R6: `groupFixes` returns `[]blockedGroup` and `fixGroup` goes; one `hangingAt` with the orphan
   rule as its argument, or the no-orphan form alone if every caller can take it unchanged; the
   sizing idiom is `style`'s `Sized*` alone.
8. R8: delete `purity_test.go`'s `exportedSurface` test (`:232`), `TestNewThemeSignature`,
   `TestThemeGlyphSetExposesBothTiers`, `TestWidthRungConstants`, `TestFromColorprofileNeverPanics`.
   Render's remaining purity test forbids `os`, `x/term`, colorprofile detection, and Lip Gloss's
   Writer and Print family in every render file, with no file exempt. Its `lipglossSetters`
   confinement to `palette.go` goes: colour setters are `style`'s `TestPurity` (T8) now, and the
   layout setters render still calls (`body_many.go:394` table `StyleFunc`, `layout.go:315`
   `JoinHorizontal`, the `lipgloss.Style` parameters of `hangingAt` and `atColumn`) stay legal.
9. R9: rewrite or delete the process comments at `purity_test.go:226`, `status.go:12,116`,
   `body_many.go:166`, `glyph.go:36`, `profile_windows.go` (moved), `body_single.go:25-27`,
   `render.go:148-150`, `palette.go:75-77` (moved), and anything acceptance item 7's grep finds.

If a merge row changes a golden, revert that row, apply standing answer 6, and go on.

Done when: the cheap gate is green, `git diff --stat 59a71163d -- tool/internal/render/testdata`
prints nothing, and item 7's grep prints nothing for `internal/render`.

### T3. Help colours onto `style` (10 min, after T2, beside T4)

- `fang.go`: delete `warmStoneInk` and its five `ink*` values; `fangColorScheme` reads
  `pick(style.Pair(role))` (Decision 10). Help output is unchanged; the existing help tests and
  the man pages from `cmd/mangen` prove it.
- `new_terminal.go:86-87` keeps `newview.NewStyles(rf.theme != themeLight, term.Profile)`; it
  changes only if T4 forces it, net lines zero or fewer.

Done when: `go test ./cmd/cairn/...` passes (with the port check) and `TestNoCommandFileExceedsItsBound` passes.

### T4. `newview` onto `style`, gated merges (30 min)

- `theme.go`: delete the ink table, `color()`, and the style bodies. `Styles` builds from
  `style.Theme`; `Role` and its constants become aliases of `style`'s (`type Role = style.Role`)
  so the out-of-row screens compile unchanged. `NewStyles(dark bool, p colorprofile.Profile)`
  keeps its signature and builds `style.NewTheme(dark, p, false)`. `Styles.Fg` returns
  `Theme.Color(r)`. `GlyphsFor` fills `Pass`, `Fail`, `Pending` (from `NotStarted`), `Sep`,
  `Ellipsis` from `style.MarksFor`; `Arrows` stays newview's. `HuhTheme` is unchanged in shape.
- Width gate: switch `grid.go:169` and `footer.go:27` to `style`'s narrow measure. If any newview
  test or golden moves, revert and apply standing answer 6.
- Wrap gate: first add a differential test in `newview` that runs `Theme.WrapGreedy` (the form
  without the orphan rule, which newview's wrap does not have) and today's `grid.go` `Wrap` over
  every string the newview goldens wrap, at every width from 1 to that string's golden width, and
  also compares `Balance`'s output, since `Balance` (`grid.go:69-84`) calls `Wrap` at every width
  from `w-1` down. It requires equal lines everywhere. Green: switch `grid.go` to
  `Theme.WrapGreedy`, then delete the test with the old wrap. Red: keep newview's wrap, delete the
  differential test, apply standing answer 6.

Done when: `go test ./internal/ui/newview/... ./cmd/cairn/...` passes and
`git diff --stat 59a71163d -- tool/internal/ui/newview/testdata` prints nothing.

### T5. Blocks, the specimen, and the two tests (35 min)

- `internal/style/blocks.go`: one exported function per block, named exactly as the standard's
  table names it: `VerdictLine`, `Title`, `MarkRow`, `LabelRow`, `ContinuationLine`, `FixLine`,
  `Table`, `ProgressLine`, `ErrorBlock`. Each takes a `Theme`, the content, and a width, and returns
  lines on the design's grid: margin 2, mark at column 2, name at column 4, value at column 20; a
  name over 15 cells on its own line with its detail under it at column 4; a table name column
  up to 32; one column below 60; content capped at 120. `ProgressLine` takes a frame index and
  returns one static line (the animation is pass 2's). Section titles are bold lowercase.
- `tool/cmd/specimen/main.go`: prints, at 80 columns, every role's name in its ink, the full
  mark table with both tiers side by side, and each of the nine blocks with sample content. A
  `-theme dark|light` flag chooses the ink branch; it paints at `TrueColor`. No other flag.
- `tool/cmd/specimen/main_test.go`: compares the dark output to `testdata/specimen.golden`,
  with an `-update` flag in the pattern the render golden test uses. Run `-update` once to create
  the file, then never again.
- `internal/style/standard_test.go` (acceptance item 4): finds the table in
  `tool/docs/design/terminal-standard.md` whose header row has a `Function` column, reads that
  column with backticks stripped, and set-compares it with the exported top-level funcs in
  `blocks.go` (parsed with `go/parser`). It fails on a name in one set and not the other, and
  fails when no such table is found, so a reformatted table cannot pass vacuously. It needs T6's
  standard, so it lands with or after T6's first commit. Show one trial red run (a block removed
  from the table) in the PR.
- `internal/style/callers_test.go` (acceptance item 5): parses every exported top-level name in
  `style`'s non-test files (constants, variables, functions, types; methods excluded, as `go doc`
  lists none) and fails on one with no selector `style.<Name>` in a non-test `.go` file under
  `tool/` outside `internal/style` (`tool/cmd/specimen` counts).

Done when: `go test ./internal/style/... ./cmd/specimen/...` passes and `go run ./cmd/specimen`
prints the specimen.

### T6. The standard and the records (25 min)

Load the `writing-voice` skill for a developer audience (Google Developer Documentation Style
Guide) before drafting; the pages follow `~/.claude/docs/voice/written-for-people.md` where the repo
records nothing more specific.

- `tool/docs/design/terminal-standard.md`: the five things of the language from the design (the
  eight roles, the mark table, the grid, the blocks, the three tiers), with a blocks table whose
  `Function` column names each `style` function. It records `CAIRN_PLAIN=1` and the `--theme`,
  `COLORFGBG`, and `CAIRN_THEME` rulings as arriving in passes 2 and 3, and Held's state from Task 7.
- `tool/docs/design/README.md`: one index line for the standard.
- `tool/docs/adr/0005-shared-style-package.md`: the move, its import rule (no Bubble Tea in
  `style`, so `render` keeps ADR-0002's rule), and the purity widening. ADR-0002 and ADR-0004 each
  gain one line pointing to it.
- `tool/docs/design/render-reference/measurements.txt`: add `warning '▲' U+25B2 EAW=A`,
  `held (new) '◌' U+25CC EAW=N`, and the eight braille frames (U+28FE, U+28FD, U+28FB, U+28BF,
  U+287F, U+28DF, U+28EF, U+28F7, each EAW=N), measured with the M4 probe method.

Done when: Vale and `vale-comments` pass in the gate and the item 4 test passes.

### T7. Screenshots, Held, and the throwaway evidence (15 min plus grading)

1. Build: `go build -o "$CLAUDE_JOB_DIR/tmp/specimen" ./cmd/specimen` (any path under the home
   directory, which the container shares).
2. Shoot four frames at 80 columns, each starting with `clear`:
   - JetBrains Mono dark: `kitty-headless-shot -o <dir> -t dark -s 80x50 -c '<bin> -theme dark' shot:jetbrains-dark`
   - JetBrains Mono light: `-t light`, `-theme light`, `shot:jetbrains-light`
   - Adwaita Mono dark and light: the same, with `-c 'kitty @ load-config --override font_family="Adwaita Mono" ~/.config/kitty/kitty.conf; clear; <bin> -theme dark'`
   Never set `HOME`. If the specimen is taller than 50 rows, raise the row count rather than scroll.
3. Grade fresh-context through `standards:tui-visual-verify` (a context that did not build the
   specimen, given only the four PNGs and acceptance item 6's text): each mark whole, not clipped
   or boxed, the row under it starting on the same column, in both fonts and grounds.
4. Held: if the grade finds `◌` wide, clipped, or boxed in either font, apply standing answer 4
   (Decision 2), rebuild, reshoot, regrade. State the outcome in the PR in one line.
5. Throwaway evidence, on a detached HEAD so nothing touches the branch:
   ```sh
   git switch --detach
   # plant one at a time in a real non-test file of internal/render, commit, run, capture:
   #   lipgloss.Color("#fff")   lipgloss.Color("212")   a "#abc" string literal
   go test -count=1 -run 'TestPurity' ./internal/style/ 2>&1
   # then, with one tint removed from the loopback test's list, committed the same way:
   go test -count=1 -run 'TestLoopbackPages' ./internal/style/ 2>&1
   git switch tui-language-1
   ```
   Each run must fail and name the planted line. Paste each output and its detached commit id in
   the PR.

### T8. The widened tests (pair, 20 min, beside T2 to T4)

In `internal/style`, on its own pair worktree off T1's commit:

- `purity_test.go` (`TestPurity`): walks every non-test `.go` file under `tool/` outside
  `internal/style` and fails on (a) a call of an M2 colour setter whose receiver chain starts at
  `lipgloss.NewStyle()` or a value of type `lipgloss.Style` (with no `go/types`, match the setter
  names of M2, which do not collide with any tool name except `Background` on `context`; exclude
  the `context.Background` selector explicitly), (b) a `lipgloss.Color(...)` or
  `lipgloss.ANSIColor(...)` call, (c) a `color.RGBA{...}` composite literal, (d) a string literal
  matching `^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`.
  It fails red on today's tree until T3 and T4 land, so the pair commits it behind `t.Skip` naming
  T4, and T4's last commit removes the skip.
- `loopback_test.go` (`TestLoopbackPages`): reads `../setup/loopback/pages/*.html`, collects every
  `#[0-9a-fA-F]{3,8}` that is a colour (case-folded), and fails on one outside the role table's hexes,
  the two grounds, and the six tints of M3.

Done when: both tests pass on the branch after T4.

## Acceptance

Copied verbatim from the design, each mapped to its task and its evidence.

1. `git diff --stat main...HEAD -- tool` lists no changed file under any `testdata` directory, and no changed `*.golden*` file, except the new specimen golden.
   - T2, T4, T5. Evidence: the command's output pasted in the PR, showing only `tool/cmd/specimen/testdata/specimen.golden` under those patterns.
2. The purity test fails on a planted `lipgloss.Color("#fff")`, a planted `lipgloss.Color("212")`, and a planted three-digit hex string, each in a real file of `internal/render` in a throwaway commit whose test output is pasted in the PR.
   - T8, T7 step 5. Evidence: three detached commit ids and three failing `TestPurity` outputs in the PR.
3. The loopback test fails when run against the real pages with one tint removed from its list, shown the same way.
   - T8, T7 step 5. Evidence: one detached commit id and the failing `TestLoopbackPages` output.
4. A test fails when a block in `terminal-standard.md`'s table has no exported function of that name in `style`, or the reverse.
   - T5 (`standard_test.go`), T6. Evidence: the test in CI; the PR names the file and the block-function definition (Decision 7).
5. `go doc ./internal/style` lists no exported name without a caller in a non-test file outside `internal/style`. `tool/cmd/specimen` counts as a caller.
   - T5 (`callers_test.go`). Evidence: `go doc -short ./internal/style` output in the PR beside the test's `-v` pass line.
6. Kitty screenshots of the specimen (every mark, role, and block at 80 columns) on a dark ground and a light ground show each mark drawn whole, never clipped or as a box, with the row below it starting on the same column, in Adwaita Mono and JetBrains Mono. Kitty sets a cell's width from the Unicode tables, so a test also checks every mark is one cell wide through the same width function `render` uses.
   - T7, T1 (mark-width test). Evidence: the four PNGs in the PR, the fresh grader's verdict, and the width test's `-v` line.
7. `grep -rnE 'Task [0-9]|iteration-[0-9]|20[0-9]{2}-[0-9]{2}-[0-9]{2}' tool/internal/render tool/internal/style --include='*.go' | grep -v '2006-01-02'` prints nothing. Go's reference date is a time layout, not a citation.
   - T2 step 9, all tasks. Evidence: the command and its empty output in the PR.
8. Every pass: `make -C tool check` passes, the tool's CI passes on Linux, macOS, and Windows (`.github/workflows/tool.yml`), and a fresh `standards:go-architecture-reader`, handed the text of the pass's debt items, reports none of them still open in the packages the pass cleaned.
   - Close. Evidence: the gate's last line, `ci-green <sha> --pr <n> --wait` exit 0, and the reader's verdict over `internal/render` and `internal/style` with R1 to R9's text.
9. Every pass: a pty test that skips on an OS counts only where it ran: the PR shows its `-v` line from the Linux job.
   - Close. Evidence: the Linux job's `-v` lines for `TestNewE2E` and the testharness run, quoted in the PR.

Added checks:

- `! go list -deps ./internal/style | grep -q bubbletea` exits 0 (ADR-0002's rule).
- `TestNoCommandFileExceedsItsBound` passes, and `root.go` and `new_terminal.go` are 298 lines or fewer.
- Both changelogs are unchanged: `git diff --stat main...HEAD -- CHANGELOG.md tool/CHANGELOG.md`,
  run from the repo root, prints nothing.

## Debt items, verified at `59a71163d`

| Id | Verified | Disposition |
| --- | --- | --- |
| R1 | `Role`, `Glyphs`, `GlyphSet`, `Theme.Style`, `Theme.Sized` exported, readers only tests and `root.go:144`, `fang_test.go:40` | T2 rows 2 and 3 |
| R2 | `width.go:20` `Width80`, read at `root.go:142`; `render.go:57` `defaultWidth`; `widthFloor` test-only | T1, T2 rows 2 and 4 |
| R3 | `glyph.go:79` `ambiguousRunes`, `palette.go:59` `groundHex`, test readers only | T1 |
| R4 | `render.go:151-159`, `:27`; no outside reader (M11) | T2 row 5 |
| R5 | `json.go:462,471`; exported twin read by `probe_token.go` (M12) | T2 row 6 |
| R6 | `body_plain.go:156-175`, `body_many.go:593`, `layout.go:404` vs `body_many.go:759`, `palette.go:145,162,170` | T2 row 7 (the sizing idiom moves to `style` in T1) |
| R7 | `palette.go:89` `forTier`; `glyphs(ascii)` callers `body_single.go:33,44,81,96,241,304`, `body_logs.go:47,76`, `body_many.go:130,148,229,251,721`; `rule(ascii)` at `layout.go:300,303`, `width.go:93-99` | T2 row 3 |
| R8 | `purity_test.go:232`, `palette_test.go:141,157`, `width_test.go:10`, `profile_test.go:179` | T2 row 8 |
| R9 | the nine sites in the debt read | T2 row 9 |

## Close

1. Whole-branch `standards:diff-reviewer` against this plan and the design; fold its findings first.
2. Fresh `standards:go-architecture-reader` (Opus, `medium`) on `internal/render` and on
   `internal/style`, each handed R1 to R9's text from the debt read; none may be reported open.
3. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'` after the port check;
   `make -C tool vulncheck` needs `GOTOOLCHAIN=go1.27.4` if the gate's leg asks for it.
4. Push; the first push opens the draft PR against `main`. `ci-green <sha> --pr <n> --wait` as a
   background task from the pass worktree.
5. The PR body opens with a paragraph written per `~/.claude/docs/voice/written-for-people.md`,
   then what landed, the acceptance evidence above, the Held outcome line for pass 2, every
   standing-answer-6 filing, `## Decisions`, `## Planning misses`, and the score.
6. Hand the PR to the conductor through `approval-packet`; merge on Geoff's approve.

## Planning misses

- `[file-list]` The design's row omits `cmd/cairn/main.go`, `env.go`, and `deps.go`, which name
  `render.IsTerminal` or `render.DetectProfile`; the plan adds them for one call and four comments.
- `[file-list]` The design's row omits `cmd/cairn/root_test.go`, whose
  `TestTerminalChecksAreConfinedToTheColourProfile` pins `internal/render/profile.go` (M17); the
  plan adds it for one constant. Found by the plan review.
- `[conflict]` The design's shared-package section moves `DoctorSchemaVersion`, but pass 1's row has
  no `internal/doctor`; deferred to pass 2's D8 (Decision 8).
- `[ambiguous]` The held mark: the design table gives `◌` while acceptance item 1 forbids a golden
  change; held keeps drawing `○` in render until pass 2 (Decision 1).
- `[ambiguous]` Design line 121 on blocks without a command caller; read as specimen-only in pass 1
  (Decision 7).

## Plan review fold

One `standards:plan-reviewer` read (Opus, `medium`) returned 2 blockers, 12 major findings, and 9
minor ones. None changes the approved design. Every finding is folded:

- F1 `root_test.go` pin: Scope, M17, T2 row 1, Planning misses.
- F2 four platform files: M17, Decision 9, T2 row 1 (T1 no longer creates detection files).
- F3 three wraps and the 120 clamp: M18, Decision 6, T1, T2 row 4.
- F4 `cmd/cairn` broken between T2 and T3: each T2 row repoints its callers; T3 shrinks to help colours; path line rewritten.
- F5 width-table constructor: Decision 5, T1 (`style.NewTheme(dark, p, ascii)`).
- F6 newview `Fg`: M20, Decision 10, T1 (`Theme.Color`), T4.
- F7 ASCII `...` marks: M4, T1's width test.
- F8 wrap differential misses `Balance`: T4 wrap gate.
- F9 `widthFloor` rung: M19, Decision 11, T2 row 4.
- F10 ANSI-16 slot and `profileName`: M8, Decision 3, T2 row 1.
- F11 lens run rules: "Standing answers" closing list and the executor prompt.
- F12 uncommitted plan: committed with the prompt before launch.
- F13 `Reviewed:` line: this section.
- F14 ceiling 300 against 380: folded as 300, the approved figure (twice the design's 150).
- F15 T2 estimate: 60 minutes; path 205.
- F16 test dependency note: moved to `standard_test.go`.
- F17 `Pair` form: package function (Decision 10, T1).
- F18 `os` wording: Decision 9.
- F19 R5 nil slice: T2 row 6.
- F20 two changelogs: Added checks.
- F21 `grep -c` exit status: T1 and Added checks.
- F22 `Unknown` as no colour: Decision 3, recorded for `## Decisions`.
- F23 item 4 parser: T5 (`Function` header, backticks stripped, trial red run).
