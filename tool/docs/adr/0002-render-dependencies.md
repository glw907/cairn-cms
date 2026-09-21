# ADR-0002: The render package's dependencies, and the four declined

## Status

Accepted, 2026-09-21 (Task 20a).

## Context

`internal/render` is the module's first package that paints. Every earlier
package (`store`, `health`, `logs`, `spine`) is plain data and control flow; this
one has to answer colour, glyph width, and terminal capability, none of which the
standard library or the module's existing dependencies cover.
`docs/design/charm-v2-capabilities.md` section B.1 surveyed the Charm v2 stack for
this exact purpose and named three libraries to take and four to decline. This
record carries that decision forward into the module.

## Decision

### Three dependencies, pinned exactly

`charm.land/lipgloss/v2 v2.0.6`, `github.com/charmbracelet/colorprofile v0.4.3`,
and `github.com/charmbracelet/x/ansi v0.11.8`. They bring `ultraviolet`,
`go-colorful`, `displaywidth`, `uax29`, `go-runewidth`, `uniseg`, and `terminfo`
as indirect requires: seven transitive modules, no cgo, all pure Go, all already
vetted on this workstation by poplar. The versions are exact in `go.mod`, taken at
the survey's measured values; a later bump goes through the workstation's
`dependency-upgrade` skill like every other dependency in this module, never an
ad hoc `go get` inside an unrelated task.

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

### The Ambiguous=Wide width table is a known gap, deferred to Task 20b-ii

Criterion 12 of Task 20a asks for two width tables on `Theme`, chosen by glyph
tier: East Asian Width=Ambiguous read narrow for the Unicode tier (nearly every
terminal), and read wide for the ASCII tier, so a terminal configured the other
way still renders exactly within budget. `width.go`'s `Theme.Width` supplies only
the narrow table, built from `x/ansi.StringWidth`.

The reason is the same one criterion 7 states for the contrast test's luminance
function: a general-purpose Ambiguous=Wide measure over arbitrary site content
(a CJK domain, a site name with combining marks) needs the East Asian Width
table `github.com/mattn/go-runewidth` or `github.com/clipperhouse/displaywidth`
carries, and both are indirect dependencies of the three taken above. Importing
either directly to reach that table would promote it to a fourth direct require,
which the pin policy above forbids. `x/ansi` itself carries no per-call toggle
for this (only a package-init `RUNEWIDTH_EASTASIAN` environment read inside the
library's own `method.go`, which this package does not touch and does not rely
on).

Every glyph render's own glyph set carries, Unicode or ASCII, is already exactly
one cell wide under the narrow table (`glyph_test.go`'s parity test), so nothing
in this task's own scope needs the wide table for render's own marks. What the
wide table protects against is arbitrary DATA overflowing a fixed column on a
wide-configured terminal running the ASCII tier, and that is exactly the case
`docs/design/render-reference/measurements.txt` records as the one unsupported
combination (Unicode tier on an Ambiguous=Wide terminal, 2980 over-width lines).
Task 20b-ii owns the golden sweep across real frames and real site content; it
is the task in a position to weigh the fourth dependency against a hand-rolled
alternative, not this one.

## Consequences

- Every downstream task in this plan (20b-i, 20b-ii, 20c, and 2.0's HUD) reaches
  colour and glyph tiers only through `Theme.Style`, `Theme.Sized`,
  `Theme.GlyphSet`, and the `RenderInput.ASCII`/`Profile` fields `profile.go`
  fills. No file outside `palette.go` names a hex or ANSI value, and no file
  outside `profile.go` queries a terminal.
- A future task that needs the wide width table for arbitrary content
  (Task 20b-ii, per the deferral above) must either accept the fourth direct
  dependency and record the decision here, or hand-author a narrow lookup table
  scoped to what the sweep actually needs.
