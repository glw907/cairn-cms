# ADR-0005: One shared style package

## Status

Accepted, 2026-11-14.

## Context

Before this record, the tool painted a terminal from three copies of one palette. `internal/render`
held the Warm Stone role table, its color resolve, its styles, its glyphs, its width measure, and
its wrap. `internal/ui/newview` held a copy of each, and `cmd/cairn/fang.go` typed the help
colors out a third time. The copies drifted apart: the open circle meant "held" in a report and
"not started" in the installer.

The copies existed because `render` pinned its exported surface. It exported most of its theme for
a HUD that was never built, and a test held those names fixed, so `newview` copied the palette
instead of importing it. ADR-0002 also rules that `render` imports no Bubble Tea, and `newview` is
Bubble Tea code, so the shared code could not live in `newview` either.

## Decision

### One package owns the language

`tool/internal/style` owns the terminal language that
`tool/docs/design/terminal-standard.md` states. It holds these parts:

- The eight roles and the one table of color values, in `palette.go`.
- The marks at both glyph tiers, in `marks.go`.
- The two width tables, the width measure, and the wrap, in `width.go`.
- Terminal detection, in `detect.go` and its three platform files.
- The print-and-exit blocks, in `blocks.go`.

`render`, `newview`, and `cmd/cairn` import `style` and delete their copies. `render` keeps an
unexported theme that embeds `style.Theme` and holds the tier's marks. `fang.go` reads each role's
light and dark color through `style.Pair`.

`style` exports only what a caller outside it uses. The names `render` exported for the HUD, and
the tests that pinned them, are gone. A later HUD exports what it needs when it exists.

### The import rule

`style` imports Lip Gloss, colorprofile, `x/ansi`, `displaywidth`, `x/term`, and, on Windows,
`x/sys/windows`. It imports no Bubble Tea. Run this command from `tool/` to confirm the rule:

```sh
go list -deps ./internal/style | grep bubbletea
```

The command prints nothing. Because of that, `render` imports `style` and still keeps ADR-0002's
rule, which `internal/render/purity_test.go` holds through `TestNoBubbleteaImport`.

The move adds no module to `go.mod`. Each import was already a direct require.
`renderDirectRequires` in the same test now names the four libraries that `render` and `style`
draw with.

### One file asks about the terminal

`style/detect.go` holds the module's one `term.IsTerminal` call, through `IsTerminal`, and the
style and render packages' one call into colorprofile's detection. `Detect` reports a
`colorprofile.Profile`, which replaces the profile type `render` once defined. The platform split uses file-name suffixes only:
`detect_linux.go`, `detect_darwin.go`, and `detect_windows.go`. `render` takes no `os` import at
all. `TestTerminalChecksAreConfinedToTheColourProfile` in `cmd/cairn/root_test.go` names
`internal/style/detect.go` as the one file allowed the check.

### The purity rule widens

The purity test moved with the palette and now covers the whole module. `TestPurity`, in
`internal/style/purity_test.go`, walks every non-test `.go` file under `tool/` outside
`internal/style`. It fails on any of these:

- A call to a Lip Gloss color setter, such as `Foreground`, `Background`, or `BorderForeground`.
  The test matches the setter's name without type information, so it excludes
  `context.Background` by its package.
- A `lipgloss.Color(...)` or `lipgloss.ANSIColor(...)` call.
- A `color.RGBA{...}` composite literal.
- A string literal that is a hex color of 3, 4, 6, or 8 digits.

A layout setter such as `Width` or `Bold` stays legal everywhere. `render`'s own purity test
still forbids `os`, `x/term`, colorprofile's detection, and Lip Gloss's writer and `Print` family in
every `render` file, with no file exempt.

A second test, `TestLoopbackPages` in `internal/style/loopback_test.go`, reads the setup loopback
pages under `internal/setup/loopback/pages/`. It fails on a hex color that is not a role value,
one of the two page grounds, or one of six named tints. The test never writes the pages.

## Consequences

- A new command paints through `style` or fails `TestPurity`. A color it needs is a new role or
  a new ink in `palette.go`, never a literal in the command's file.
- `newview` can share the palette and the marks without copying them, because `style` carries no
  Bubble Tea and `render` can import it too.
- `DoctorSchemaVersion` stays in `render` for now. Moving it to `internal/doctor` belongs to the
  pass that opens that package.
- A held row in `render` still draws the not-started mark, so no report changed when the package
  moved. The switch to the held mark changes every golden with a held row, and lands later.
