# ADR-0002: The render package's dependencies, and the four declined

## Status

Accepted, 2026-09-21 (Task 20a); amended the same day at the segment 3 review,
which took the fourth dependency and built the second width table; amended
again by Task 22a (segment 4 conductor ruling, 2026-09-21) to record the man
generator's own indirect requires below, in this file rather than a third ADR,
per that ruling; amended a third time on 2026-09-22 to record `go.yaml.in/yaml/v3`'s
own promotion to direct, below.

## Addendum: YAML promoted to a direct require

`internal/doctor/siteconfig.go` parses `site.config.yaml` for `config.site-config`, and needs a
YAML decoder. `go.yaml.in/yaml/v3` was already an indirect require at `v3.0.4`, pulled in by
`github.com/spf13/cobra/doc` per the addendum below, so promoting it to direct adds no module to
the build graph: the same shape `displaywidth`'s own promotion took at the segment 3 review. It
belongs to the module rather than to `internal/render`, since `render` never imports it; this is
why `internal/render/purity_test.go`'s `otherDirectRequires` carries it, and not
`renderDirectRequires`.

## Addendum: the man generator's indirect requires (Task 22a)

`tool/cmd/mangen` imports `github.com/spf13/cobra/doc`, a subpackage of the
already-direct `github.com/spf13/cobra` requirement, so it adds no fifth entry
to this ADR's own four render dependencies above; the direct-require count
those four describe is unchanged. `cobra/doc` itself pulls three modules in as
indirect requires: `github.com/cpuguy83/go-md2man/v2` and
`github.com/russross/blackfriday/v2` for its man-page renderer, and
`go.yaml.in/yaml/v3` for its (unused here) YAML doc generator. `go mod tidy`
added all three as `// indirect` in `go.mod`; none is imported by `cmd/cairn`
or any `internal/` package (`cmd/mangen/main_test.go`'s
`TestCmdCairnImportsNoCobraDoc` holds the first half of that), which is the
whole reason `mangen` is a second command: linking `go-md2man` and
`blackfriday` into the operator binary for a file it never reads would cost
every install a dependency it has no use for.

## Context

`internal/render` is the module's first package that paints. Every earlier
package (`store`, `health`, `logs`, `spine`) is plain data and control flow; this
one has to answer colour, glyph width, and terminal capability, none of which the
standard library or the module's existing dependencies cover.
`docs/design/charm-v2-capabilities.md` section B.1 surveyed the Charm v2 stack for
this exact purpose and named three libraries to take and four to decline. This
record carries that decision forward into the module, and the amendment below
records the fourth library the width tables needed.

## Decision

### Four dependencies, pinned exactly

`charm.land/lipgloss/v2 v2.0.6`, `github.com/charmbracelet/colorprofile v0.4.3`,
`github.com/charmbracelet/x/ansi v0.11.8`, and
`github.com/clipperhouse/displaywidth v0.11.0`. The first three bring
`ultraviolet`, `go-colorful`, `uax29`, `go-runewidth`, `uniseg`, and `terminfo` as
indirect requires: no cgo, all pure Go, all already vetted on this workstation by
poplar. The versions are exact in `go.mod`, taken at the survey's measured values;
a later bump goes through the workstation's `dependency-upgrade` skill like every
other dependency in this module, never an ad hoc `go get` inside an unrelated task.
`internal/render/purity_test.go` pins both the list and the module's total count,
so a fifth library fails a test rather than arriving in a diff nobody read.

The fourth was promoted from indirect rather than chosen: `x/ansi`'s own
grapheme-aware width measure already rests on `displaywidth`, so taking it
directly adds no module to the build graph and makes both width tables read the
same data. The section below records why a second table was needed at all.

The alternative, hand-rolled `fmt.Sprintf` padding, fails this package's first
job: padding a column holding `●` or `─` to a fixed width, where `len` and rune
count are both wrong for a multi-byte glyph.

### Four libraries declined for 1.0

- **`charm.land/fang/v2`**: it brings its own colour detection and its own
  `charmtone` palette, which would fight the one profile file (`profile.go`) and
  the Warm Stone table (`palette.go`). Filed as a 2.0-window spike.
- **`github.com/lrstanley/bubblezone/v2`**: mouse zones. Its own author advises
  against it under bubbletea v2, whose `tea.View.OnMouse` covers the case, and
  1.0 has no bubbletea view at all (`render` carries no bubbletea type,
  criterion 25).
- **`ntcharts`**: no reviewed frame used a chart.
- **Any sparkline**: appeared in no reviewed frame, the one purely decorative
  element three design reviews named, and a chart with no axis, scale, or label
  is a debug print (`docs/design/reviews/family.md` §(d)).

### The purity seam

`profile.go` is the package's one impure file: the one TTY check
(`golang.org/x/term.IsTerminal`), the one caller of `os.File`, and the one
caller of colorprofile's detection entry points (`colorprofile.Env`,
`colorprofile.Terminfo`). Every other file is a pure function of its arguments.
`purity_test.go` enforces this by naming the forbidden imports and selectors
rather than banning a package outright, which is what lets a pure
`lipgloss.Complete` and `lipgloss.LightDark` call land in `palette.go` without
tripping the test.

`colorprofile.Terminfo` was tried first for the auto-detected colour rung and
rejected: it only ever distinguishes `NoTTY`, `ANSI`, or `TrueColor` (it checks
the terminfo `Tc`/`RGB` capabilities alone, verified against
`colorprofile@v0.4.3/env.go`), so criterion 6's named ANSI-256 rung is
unreachable through it. `colorprofile.Env` reads `TERM`'s own `-256color`
convention instead, which is the signal a 256-colour terminal actually
advertises, and is what `profile.go` calls.

### Both width tables, chosen by glyph tier

Criterion 12 asks for two width tables on `Theme`, chosen by glyph tier: East
Asian Width=Ambiguous read narrow for the Unicode tier (nearly every terminal),
and read wide for the ASCII tier, so a terminal configured the other way still
renders exactly within budget. Both exist. `widthTable` is a field on `Theme`,
never a package-level setting, and `Render` sets it once from `RenderInput.ASCII`.

The table has to be a value a `Theme` carries. `x/ansi` is the counter-example:
its own two width options are package globals set once at init from
`RUNEWIDTH_EASTASIAN`, shared by every caller in the binary, so a process
composing one frame at each tier would have the second move the first's
arithmetic. That is the shape criterion 12 rules out by name.

`displaywidth` supplies both readings through one `Options` value, and `x/ansi`'s
own grapheme measure already calls it, so the library was promoted from indirect
rather than chosen: no module joined the build graph, and both tables read the
same Unicode data. Escape sequences are discounted by `ansi.Strip` before the
measure rather than by `displaywidth`'s own control-sequence options, since
`x/ansi`'s parser is the one this package composes its escapes with. The narrow
table measures every committed frame identically to the `ansi.StringWidth` call it
replaced: the 146-frame corpus was unchanged by the swap.

Criterion 19's sweep runs on both: every fixture, every terminal body, widths 20
through 400, at both tiers, each frame measured under the table its own tier chose
(`body_test.go`'s `TestNoLineExceedsTheRequestedWidth`). The pairing is per tier
rather than every frame against both, because a terminal never presents the other
combination: one reading Ambiguous wide takes the ASCII tier, whose glyphs are
plain ASCII and exact under both tables. The Unicode tier on such a terminal
remains what `docs/design/render-reference/measurements.txt` records as the one
unsupported combination (2980 over-width lines under it).

### The Windows console branch is unverified on real hardware

`profile_windows.go`'s `enableVirtualTerminal` is compile-checked and vet-clean on
a `GOOS=windows` build, and no test drives it against a real console. `go test` on
the Windows CI leg writes to a pipe, where `DetectProfile` short-circuits before
calling it at all, and a pipe handle only ever produces its `GetConsoleMode`
failure path. A test cannot allocate a conhost from CI, so the branch stands
unverified until an operator runs the binary at a Windows terminal. Stated here
rather than papered over with a test that proves the pipe case twice.

## Consequences

- Every downstream task in this plan (20b-i, 20b-ii, 20c, and 2.0's HUD) reaches
  colour and glyph tiers only through `Theme.Style`, `Theme.Sized`,
  `Theme.GlyphSet`, and the `RenderInput.ASCII`/`Profile` fields `profile.go`
  fills. No file outside `palette.go` names a hex or ANSI value, and no file
  outside `profile.go` queries a terminal.
- A task that needs a third width reading reaches it through `widthTable`, never
  through a package variable and never through a second library.
- The Windows console path is the one behaviour in this package no gate can
  assert. A regression there surfaces from an operator, not from CI.
