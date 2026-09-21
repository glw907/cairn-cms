# Charm stack capability inventory for the `cairn` Go tool

> Capability survey dated 2026-09-20, verified against the module cache on this workstation at that date.
> Task 20's `render` package design reads this document; it is not itself gated by any check.

Compiled 2026-09-20. Audience: the designer-engineer who will write Task 20 (`render`) and later plan the 2.0 HUD.

**Verification basis.** Every API name marked *(verified local)* was read with `go doc` against the module cache on this
workstation, which holds the exact versions poplar builds on: `charm.land/bubbletea/v2 v2.0.9`,
`charm.land/lipgloss/v2 v2.0.6`, `charm.land/bubbles/v2 v2.1.1`, `github.com/charmbracelet/colorprofile v0.4.3`,
`github.com/charmbracelet/x/ansi v0.11.8`. Local `go doc` beats pkg.go.dev and beats every upgrade guide, and where a web
source disagreed with the local source this document takes the local source and says so. Items marked *(web only)* were
read from pkg.go.dev, a repo's `UPGRADE_GUIDE_V2.md`, or a release page, with the URL given.

**Version state, one table.**

| Module | Version | Date | Maturity |
|---|---|---|---|
| `charm.land/bubbletea/v2` | v2.0.9 | 2026-08-19 | stable GA; v2.0.0 was 2026-02-23, the first break in the project's history (<https://github.com/charmbracelet/bubbletea/releases/tag/v2.0.0>) |
| `charm.land/lipgloss/v2` | v2.0.6 | 2026-08-11 | stable GA; v2.0.0 2026-02-24, then .1 through .6 (<https://github.com/charmbracelet/lipgloss/releases>) |
| `charm.land/bubbles/v2` | **v2.2.1** latest; **v2.1.1** is what poplar pins and what I read locally | — | stable GA. v2.2.0 added a `tree` component and textarea text selection, neither of which is in the local copy |
| `github.com/charmbracelet/colorprofile` | v0.4.3 | — | v0, but the API is two types and five functions and has been steady; bubbletea and lipgloss both depend on it |
| `github.com/charmbracelet/x/ansi` | v0.11.8 | — | v0 by version string, de facto stable; every Charm library depends on it |
| `github.com/charmbracelet/ultraviolet` | pseudo-version | — | **pre-release, "API may change"**; it is bubbletea v2's and lipgloss v2's renderer substrate. Do not import it directly. It does leak into lipgloss's own signatures (`Canvas.CellAt` returns `*uv.Cell`), so a direct dependency on it is unavoidable *at the go.sum level* but should never appear in cairn's own code |
| `github.com/charmbracelet/x/exp/teatest/v2` | pseudo-version | — | **explicitly experimental**, in the `x/exp` tree |
| `charm.land/fang/v2` | v2.0.1 | 2026-03-11 | stable v2. The older line is `github.com/charmbracelet/fang v1.0.0`, 2025-12-20 |

Every version in that table and in A.4 was taken from `go list -m -versions` against `proxy.golang.org` on 2026-09-20,
not from a summarized web page. Dates come from pkg.go.dev and are the weakest fact here; the version strings are
authoritative.

The `charm.land` vanity path is the v2-line path, and it now covers more than the three core libraries: `fang/v2`,
`huh/v2`, and `log` all resolve on it *(verified via the proxy; one research pass claimed `charm.land/log` 404s, which
is wrong)*. `github.com/charmbracelet/*` still hosts the repos and still hosts `colorprofile`, `x/*`, `glamour`,
`harmonica`, `vhs`, and `freeze`. Do not write `github.com/charmbracelet/bubbletea/v2`; it is not the module path.

---

# A. Capability inventory

## A.1 `charm.land/bubbletea/v2` — the program loop

### The declarative frame: `tea.View`

`Model` is unchanged in two of three methods: `Init() Cmd`, `Update(Msg) (Model, Cmd)`. The third changed:
**`View() tea.View`**, a struct, not a string and not a `fmt.Stringer`. Constructor `tea.NewView(s string) View`;
mutator `(*View).SetContent(s string)`. *(verified local)*

This is the single most consequential v2 change for a HUD, because everything v1 toggled with an imperative `Cmd` is now
a field re-declared every frame. A frame that forgets a field turns that mode off. The full field set
*(verified local, `go doc charm.land/bubbletea/v2.View`)*:

| Field | Type | Declares |
|---|---|---|
| `Content` | `string` | the frame text, with styles and OSC 8 hyperlinks already encoded as escape sequences |
| `Cursor` | `*Cursor` | cursor position, colour, shape, blink. `nil` hides the cursor |
| `BackgroundColor` | `color.Color` | the terminal's default background; `nil` resets |
| `ForegroundColor` | `color.Color` | same for foreground |
| `WindowTitle` | `string` | OSC 2 window title, "support depends on the terminal" |
| `ProgressBar` | `*ProgressBar` | the terminal taskbar progress indicator (OSC 9;4). `nil` for none |
| `AltScreen` | `bool` | alternate screen buffer. Auto-exited on quit |
| `ReportFocus` | `bool` | enables `FocusMsg` / `BlurMsg` |
| `DisableBracketedPasteMode` | `bool` | inverted sense: zero value leaves bracketed paste **on** |
| `MouseMode` | `MouseMode` | `MouseModeNone`, `MouseModeCellMotion`, `MouseModeAllMotion` |
| `KeyboardEnhancements` | `KeyboardEnhancements` (struct, **not** a bool) | which kitty-protocol enhancements to request |
| `OnMouse` | `func(MouseMsg) Cmd` | a per-frame mouse hit-test hook that sees the content the frame just rendered |

`tea.Cursor` *(verified local)*: embeds `Position`, plus `Color color.Color`, `Shape CursorShape`, `Blink bool`.
`NewCursor(x, y int) *Cursor`. `CursorShape` is an int with `CursorBlock` first.

`tea.KeyboardEnhancements` *(verified local)* is a four-bool struct: `ReportEventTypes` (get `KeyReleaseMsg` and
`Key.IsRepeat`), `ReportAlternateKeys`, `ReportAllKeysAsEscapeCodes`, `ReportAssociatedText`. The terminal answers with
`KeyboardEnhancementsMsg` naming what it actually supports. A web source claimed this field was a `bool`; it is not.

`tea.ProgressBar` *(verified local)*: `State ProgressBarState` (`ProgressBarNone`, `ProgressBarDefault`,
`ProgressBarError`, `ProgressBarIndeterminate`, `ProgressBarWarning`) and `Value int` 0..100. Constructor
`NewProgressBar(state, value)`. The doc comment cites Microsoft's taskbar progress sequences, i.e. OSC 9;4.
**This is a real, free capability for a monitoring tool**: a failing sweep can turn the Windows Terminal / WezTerm
taskbar red without drawing anything.

`OnMouse` is the built-in answer to what `bubblezone` exists to solve in v1. It runs against the content of the last
render, so a view can hit-test its own string without a separate zone registry.

### Message set *(verified local via the package index; names cross-checked against the v2 upgrade guide)*

Keys: `Key` (fields `Text string`, `Code rune`, `Mod KeyMod`, `ShiftedCode`, `BaseCode`, `IsRepeat bool`; method
`Keystroke()`), `KeyMod`, `KeyMsg` (now an **interface**), `KeyPressMsg`, `KeyReleaseMsg`. v1's `Type`→`Code`,
`Runes []rune`→`Text string`, `Alt bool`→`Mod.Contains(ModAlt)`. Space's `String()` returns `"space"`, not `" "`.
A HUD switches on `tea.KeyPressMsg` and ignores `KeyReleaseMsg` unless it asked for it.

Mouse: `Mouse` (v1's `MouseEvent`; `X, Y int`, `Button MouseButton`, `Mod KeyMod`), `MouseMsg` (interface, read via
`msg.Mouse()`), `MouseClickMsg`, `MouseReleaseMsg`, `MouseWheelMsg`, `MouseMotionMsg`, `MouseMode`, `MouseButton`
(`MouseNone`, `MouseLeft`, `MouseMiddle`, `MouseRight`, `MouseWheelUp/Down/Left/Right`, `MouseBackward`,
`MouseForward`, `MouseButton10`, `MouseButton11`).

Window and focus: `WindowSizeMsg`, `FocusMsg`, `BlurMsg`.

Paste: `PasteMsg` (with `.Content`), `PasteStartMsg`, `PasteEndMsg`. No longer folded into a key message.

Terminal queries, each an answer to a matching `Request*` command: `ColorProfileMsg`, `BackgroundColorMsg` (has
`IsDark()`), `ForegroundColorMsg`, `CursorColorMsg`, `CursorPositionMsg`, `TerminalVersionMsg`, `CapabilityMsg`,
`ModeReportMsg`, `EnvMsg`, `KeyboardEnhancementsMsg`, `ClipboardMsg`.

Lifecycle: `SuspendMsg`, `ResumeMsg`, `QuitMsg`, `InterruptMsg`, `BatchMsg`, `RawMsg`.

### Commands *(verified local index)*

`Batch`, `Sequence` (v1's `Sequentially` is deprecated), `Tick`, `Every`, `Exec`, `ExecProcess`, `Println`, `Printf`
(both print **above** an inline program and are unchanged from v1), `Raw`, `ClearScreen`, `Quit`, `Interrupt`,
`Suspend`, `LogToFile`, `LogToFileWith`, `OpenTTY`, `SetClipboard`, `SetPrimaryClipboard`, `ReadClipboard`,
`ReadPrimaryClipboard` (native OSC 52, works over ssh), `RequestBackgroundColor`, `RequestForegroundColor`,
`RequestCursorColor`, `RequestCursorPosition`, `RequestTerminalVersion`, `RequestCapability`, `RequestWindowSize`.

**Gone, folded into `View`** (<https://github.com/charmbracelet/bubbletea/blob/main/UPGRADE_GUIDE_V2.md>):
`EnterAltScreen`/`ExitAltScreen`, `EnableMouseCellMotion`/`EnableMouseAllMotion`/`DisableMouse`,
`HideCursor`/`ShowCursor`, `EnableBracketedPaste`/`DisableBracketedPaste`, `EnableReportFocus`/`DisableReportFocus`,
`SetWindowTitle`.

**One `Cmd` yields at most one `Msg`.** There is no per-`Cmd` cancellation. Both facts are already recorded correctly
in the spec addendum and both constrain the sweep design (see D).

### Program options *(web:* `UPGRADE_GUIDE_V2.md`*, corroborated by poplar's own use of them)*

Present: `WithInput`, `WithOutput`, `WithContext`, `WithFPS`, `WithFilter`, `WithoutSignalHandler`, `WithoutRenderer`,
`WithColorProfile(colorprofile.Profile)`, `WithEnvironment([]string)`, `WithWindowSize(w, h)`.

Removed: `WithAltScreen`, `WithMouseCellMotion`, `WithMouseAllMotion`, `WithReportFocus`, `WithoutBracketedPaste` (all
now `View` fields); `WithInputTTY` (handled automatically); `WithANSICompressor` (the renderer optimizes).
`Program.Start()`/`StartReturningModel()` are gone; use `Run()`. `Program.EnterAltScreen()` and the mouse-control
methods are gone.

**`WithKeyboardEnhancements` does not exist.** Enhancements are a `View` field. A plan that writes it will not compile.

Inline versus full-screen is no longer a construction choice. It is `View.AltScreen`, per frame, so a program can move
between inline and full-screen without restarting: relevant if `cairn` ever wants `cairn health` to print inline and
then escalate into the HUD.

### Renderer

v2's renderer ("the Cursed Renderer") is built on `github.com/charmbracelet/ultraviolet`: cell-based screen buffers, a
diffing renderer, cross-platform input decoding, off-screen buffers
(<https://pkg.go.dev/github.com/charmbracelet/ultraviolet>). It applies **synchronized output (DECSET 2026)
automatically** and **mode 2027** for wide characters
(<https://github.com/charmbracelet/bubbletea/discussions/1374>). For a grid that repaints on a ticker this is the
whole ballgame: only changed cells go over the wire, and the terminal swaps frames atomically, so a 1-second refresh of
a 28-cell status board does not tear and does not flood a slow ssh link. No app-level opt-in, no `WithFPS` tuning
needed as a first move.

### Colour profile, `NO_COLOR`, no TTY, Windows

`colorprofile` is the one library that reads the environment. *(verified local: `NO_COLOR` appears in
`colorprofile/env.go` and `colorprofile/writer.go` and in **neither** bubbletea nor lipgloss.)* This is the fact that
makes Task 20's `render/profile.go` the honest single home for detection: lipgloss will never surprise you by reading
`NO_COLOR` behind your back.

`colorprofile.Profile` is a `byte` with six values *(verified local)*: `Unknown`, `NoTTY`, `ASCII` (aliased
`Ascii`), `ANSI`, `ANSI256`, `TrueColor`. Functions: `Detect(output io.Writer, env []string) Profile`,
`Env(env []string) Profile`, `Terminfo(term string) Profile`, `Tmux(env []string) Profile`,
`(Profile).Convert(color.Color) color.Color`, `(Profile).String() string`.

`NoTTY` strips every escape sequence; `ASCII` drops colour but keeps bold and italic. That distinction matters for
cron: a report piped into a log file wants `NoTTY`, not `ASCII`.

Windows: no v2-specific statement was found either way *(unverified)*. bubbletea has long carried
`github.com/charmbracelet/x/windows` and `x/term`, and ultraviolet advertises "cross-platform input decoding". The
practical Windows lever is lipgloss's `EnableLegacyWindowsANSI(*os.File)` *(verified local)* plus Task 20's own
virtual-terminal-processing check.

### `x/exp/teatest/v2` *(web:* <https://pkg.go.dev/github.com/charmbracelet/x/exp/teatest/v2>*, corroborated by poplar's `cmd/poplar/flow_test.go`)*

`NewTestModel(t testing.TB, m tea.Model, opts ...TestOption) *TestModel`; `WaitFor(r io.Reader, cond func([]byte) bool,
opts ...WaitForOption)`; `RequireEqualOutput(t, out []byte)` (golden via the system `diff`, `-update` regenerates).
Options: `WithInitialTermSize`, `WithProgramOptions`, `WithCheckInterval`, `WithDuration`, `WithFinalTimeout`,
`WithTimeoutFn`. `TestModel` methods: `Send`, `Type`, `WaitFinished`, `FinalModel`, `FinalOutput`, `Output`, `Quit`,
`GetProgram`. Marked experimental.

`github.com/charmbracelet/x/exp/golden` is the separate golden-file helper; it arrives as an indirect dependency of
teatest and of fang.

## A.2 `charm.land/lipgloss/v2` — pure styling

### The pure-styling split, the item that governs Task 20

v1's global renderer is gone. Removed outright *(web:*
<https://raw.githubusercontent.com/charmbracelet/lipgloss/master/UPGRADE_GUIDE_V2.md>*)*: `DefaultRenderer()`,
`SetDefaultRenderer()`, `NewRenderer()`, `Style.Renderer(...)`, `ColorProfile()`, `SetColorProfile()`, the no-argument
`HasDarkBackground()`, and the types `TerminalColor`, `AdaptiveColor`, `CompleteColor` (moved to the `compat`
subpackage, which reads stdin/stdout globally and is marked not recommended for new code).

What replaces them *(all verified local)*:

- `lipgloss.Color(s string) color.Color` — a **function** returning `image/color.Color`. Accepts `"#ff00ff"` and the
  ANSI numeric form `"5"`.
- `Style.Render(...) string` never queries a terminal and never downsamples. It emits full-fidelity SGR sequences
  determined entirely by the `Style`'s field values. **This is what makes a golden test possible.**
- Downsampling is a separate pass over the rendered string:
  `colorprofile.Writer{Forward: w, Profile: p}` with `WriteString`, or `Profile.Convert(c)` for one colour at a time.
- `lipgloss.LightDark(isDark bool) LightDarkFunc` where `LightDarkFunc func(light, dark color.Color) color.Color`.
  The doc comment names the bubbletea workflow explicitly: listen for `tea.BackgroundColorMsg`, read `msg.IsDark()`,
  hold it in the model, call `LightDark` at render time.
- `lipgloss.Complete(p colorprofile.Profile) CompleteFunc` where
  `CompleteFunc func(ansi, ansi256, truecolor color.Color) color.Color` — name a different colour per profile
  explicitly instead of accepting a nearest-match downsample. Replaces v1 `CompleteColor`.
- `lipgloss.HasDarkBackground(in term.File, out term.File) bool` and
  `lipgloss.BackgroundColor(in, out term.File) (color.Color, error)` — explicit-argument terminal queries, for the
  standalone (non-bubbletea) path only. **Note the signature: `term.File`, not `io.Reader`/`io.Writer`.** A web source
  said `io.Reader`/`io.Writer`; the local source says `term.File`.
- `var lipgloss.Writer = colorprofile.NewWriter(os.Stdout, os.Environ())` — a package-level auto-detecting writer, and
  the backing store for `lipgloss.Print`/`Printf`/`Println`/`Sprint`/`Sprintf`/`Sprintln`/`Fprint`/`Fprintf`/`Fprintln`.
  **This is the one impure thing left in the package and Task 20 must not touch it.** It reads `os.Environ()` at
  package init. Use `Style.Render` plus an explicit `colorprofile.Writer`, never `lipgloss.Print*`.

The deterministic recipe, which is exactly the shape Task 20 needs:

```go
// pure: no env read, no TTY query, same bytes for the same inputs
func paint(in RenderInput) string {
    ld := lipgloss.LightDark(in.Dark)
    fg := ld(lipgloss.Color("#3a3a38"), lipgloss.Color("#e8e4dc"))
    s  := lipgloss.NewStyle().Width(in.Width).Foreground(fg)
    raw := s.Render(text)            // full-fidelity SGR, deterministic

    var buf bytes.Buffer             // the downsample is a second, explicit step
    w := colorprofile.Writer{Forward: &buf, Profile: in.Profile}
    _, _ = w.WriteString(raw)
    return buf.String()
}
```

### `Style` setters *(verified local)*

Size: `Width`, `Height`, `MaxWidth`, `MaxHeight`.
Spacing: `Padding(i ...int)` CSS-shorthand plus `PaddingTop/Bottom/Left/Right`, `PaddingChar(rune)`; the same shape for
`Margin*` and `MarginChar`.
Border: `Border(b Border, sides ...bool)`, `BorderStyle(b Border)`, `BorderTop/Bottom/Left/Right(bool)`,
`BorderForeground(c ...color.Color)` and `BorderBackground` (variadic means per-side), per-side variants such as
`BorderTopForeground`, and `BorderForegroundBlend(c ...color.Color)` — a v2 addition that gradients a border edge.
Align: `Align(p ...Position)`, `AlignHorizontal`, `AlignVertical`. `Position` is a `float64`, 0 start, 1 end, 0.5
centre, with consts `Top`, `Bottom`, `Center`, `Left`, `Right`.
Colour: `Foreground(color.Color)`, `Background(color.Color)`.
Text: `Bold`, `Italic`, `Faint`, `Underline(bool)`, `UnderlineStyle(Underline)` with
`UnderlineNone/Single/Double/Curly/Dotted/Dashed` (aliases of `ansi.Underline*`), `UnderlineColor(color.Color)`,
`UnderlineSpaces`, `Strikethrough`, `StrikethroughSpaces`, `Reverse`, `Blink`.
Other: `Inline(bool)`, `Transform(func(string) string)`, `Hyperlink(link string, params ...string)` (v2 addition,
OSC 8), `TabWidth(int)`, `ColorWhitespace(bool)`, `Inherit(Style)`, `SetString`, `String`, `Value`.
Nearly every setter has a `Get*` and an `Unset*`. `Copy()` is deprecated: `Style` is a value.

Curly underline plus `UnderlineColor` is the cheapest "this is the failing thing" cue that costs zero columns; it
degrades to a plain underline, then to nothing.

### Borders *(verified local)*

`NormalBorder()`, `RoundedBorder()`, `ThickBorder()`, `DoubleBorder()`, `BlockBorder()`, `HiddenBorder()`,
`MarkdownBorder()`, `ASCIIBorder()`, plus the v2 additions `InnerHalfBlockBorder()` and `OuterHalfBlockBorder()`.
`Border` is a struct of edge and junction runes, so a custom border is a literal.

### Layout *(verified local)*

`JoinHorizontal(pos Position, strs ...string) string`, `JoinVertical`, `Place(width, height int, hPos, vPos Position,
str string, opts ...WhitespaceOption) string`, `PlaceHorizontal`, `PlaceVertical`, `Width(str) int`, `Height(str) int`,
`Size(str) (w, h int)`, `Wrap(s string, width int, breakpoints string) string`, `StyleRanges(s string, ranges ...Range)`,
`StyleRunes(str string, indices []int, matched, unmatched Style)`, `type WrapWriter`.

**`lipgloss.Width` is the only correct way to measure a cell width.** `len` and rune count are both wrong for the
glyph set a status board uses.

### Canvas, Layer, Compositor — new in v2 *(verified local)*

```go
func NewCanvas(width, height int) *Canvas
func (c *Canvas) Compose(drawer uv.Drawable) *Canvas
func (c *Canvas) Render() string
func (c *Canvas) CellAt(x, y int) *uv.Cell   // and SetCell, Clear, Resize, Bounds, Width, Height

func NewLayer(content string, layers ...*Layer) *Layer
func (l *Layer) X(int) *Layer   // .Y(int), .Z(int), .ID(string), .AddLayers(...), .GetLayer(id), .MaxZ()

func NewCompositor(layers ...*Layer) *Compositor
func (c *Compositor) Hit(x, y int) LayerHit     // hit testing, by layer
func (c *Compositor) Render() string            // and Draw, Bounds, GetLayer, Refresh
```

`Canvas` is a cell buffer; `Layer` is pure data with a z-order and an id; `Compositor` flattens the hierarchy once and
does the drawing and the hit testing. Not labelled experimental, but new in v2.0.0 and less exercised than `Style`.
`Compositor.Hit` plus `Layer.ID` is a **second** built-in answer to mouse hit-testing, at the layer level, which with
`tea.View.OnMouse` at the content level makes `bubblezone` unnecessary for a v2 app.

poplar already wraps this behind its own `theme.Canvas` *(local: `internal/theme/canvas.go`)* precisely so no screen
reaches for `lipgloss.NewCanvas` directly. That is the pattern to copy.

### Colour maths *(verified local)*

`Blend1D(steps int, stops ...color.Color) []color.Color`, `Blend2D(width, height int, angle float64,
stops ...color.Color) []color.Color` (note: a flat slice, **not** `[][]color.Color` as one web source said),
`Darken(c, percent)`, `Lighten(c, percent)`, `Alpha(c, alpha)`, `Complementary(c)`. Types `ANSIColor`
(= `ansi.IndexedColor`), `RGBColor`, `NoColor`. Named consts `Black` through `White` plus bright variants, typed
`ansi.BasicColor`.

`Blend1D` is the honest way to build a sparkline ramp or an age gradient from two ratified stops rather than hand-picking
eight hexes.

### Subpackages: exactly four

`table`, `list`, `tree`, `compat`. *(web:* pkg.go.dev directories; corroborated by the local module directory.)

**`table`** *(web:* <https://pkg.go.dev/charm.land/lipgloss/v2/table>*)*: `table.New() *Table`, chainable:
`Data(Data)`, `Headers(...string)`, `Row(...string)`, `Rows(...[]string)`, `ClearRows()`,
`StyleFunc(func(row, col int) lipgloss.Style)`, `Border(lipgloss.Border)`, `BorderStyle(lipgloss.Style)`,
`BorderTop/Bottom/Left/Right/Row/Column/Header(bool)`, `BaseStyle(lipgloss.Style)`, `Width(int)`, `Height(int)`,
`Wrap(bool)`, `YOffset(int)`, `FirstVisibleRowIndex()`, `LastVisibleRowIndex()`, `VisibleRows()`, `Render()`,
`String()`. The `Data` interface (`At(row, cell int) string`, `Rows() int`, `Columns() int`) is pluggable, with
`StringData` and `Filter` built in; `DataToMatrix`, `DefaultStyles`, and the `HeaderRow` const round it out.
`Width` plus `Wrap(false)` is how a column truncates. v2.0.6 fixed column shrinking.

**This is a pure string-producing table with no bubbletea dependency**, which makes it the right engine for
`cairn sites list` and for the 2.0 grid's row body.

**`list`**: `list.New(items ...any) *List`; enumerators `Bullet`, `Dash`, `Asterisk`, `Arabic`, `Alphabet`, `Roman`
matching `type Enumerator func(items Items, index int) string`; `Enumerator`, `EnumeratorStyle`,
`EnumeratorStyleFunc`, `Indenter`, `ItemStyle`, `ItemStyleFunc`, `Offset(start, end int)`, `Hide(bool)`, `String()`.

**`tree`**: `tree.New()`, `tree.Root(any)`, `.Child(...any)`, `.Enumerator` (`DefaultEnumerator`,
`RoundedEnumerator`), `.Indenter` (`DefaultIndenter`), `.RootStyle`, `.ItemStyleFunc`, `.Offset`, `.Width(int)`,
`.String()`; `Node`, `Leaf`, `NewLeaf`, `NodeChildren`, `Filter`, `NewStringData`.

### `github.com/charmbracelet/x/ansi` — the text helpers live here, not in lipgloss *(web:* <https://pkg.go.dev/github.com/charmbracelet/x/ansi>*; poplar imports it 18 times)*

Measurement and shaping: `StringWidth(s) int` / `StringWidthWc`, `Strip(s) string`,
`Truncate(s string, length int, tail string) string` / `TruncateWc`, `TruncateLeft(s, n, prefix)` / `TruncateLeftWc`,
`Hardwrap(s, limit int, preserveSpace bool)` / `HardwrapWc`, `Wordwrap(s, limit int, breakpoints string)` /
`WordwrapWc`, `Wrap(s, limit, breakpoints)` / `WrapWc`.

Escape emitters a pure renderer can use directly:
- OSC 8 hyperlinks: `SetHyperlink(uri string, params ...string) string`, `ResetHyperlink(params ...string) string`.
- OSC 9 notifications: `Notify(s string) string`, `DesktopNotification(payload string, metadata ...string) string`,
  `NotifyWorkingDirectory(host string, paths ...string) string`.
- OSC 9;4 taskbar progress: `SetProgressBar(percentage int) string`, `SetErrorProgressBar(percentage int) string`,
  `SetWarningProgressBar(percentage int) string`.

`x/cellbuf` *(web:* <https://pkg.go.dev/github.com/charmbracelet/x/cellbuf>*)* is v0.0.15 and flagged unstable; it is
the cell-grid plumbing beneath lipgloss. Nothing in cairn should import it.

## A.3 `charm.land/bubbles/v2` — components

Package list *(verified local, module directory):* `cursor`, `filepicker`, `help`, `key`, `list`, `paginator`,
`progress`, `spinner`, `stopwatch`, `table`, `textarea`, `textinput`, `timer`. **`runeutil` and `memoization` are now
internal and not importable** *(web:* the module's `UPGRADE_GUIDE_V2.md`*)*.

Three global v2 patterns, from that guide:
1. `tea.KeyMsg` → `tea.KeyPressMsg` in every `Update`.
2. Exported `Width`/`Height` fields → `SetWidth`/`SetHeight` and `Width()`/`Height()`. Affects `filepicker`, `help`,
   `progress`, `table`, `textinput`, `viewport`.
3. `DefaultKeyMap` **variables** → **functions**. Affects `paginator`, `textarea`, `textinput`. Also, every `NewModel`
   alias is removed; use `New`.
4. `AdaptiveColor` is gone, so every `DefaultStyles` that used to adapt now takes `isDark bool`.

### `viewport` — the log viewer *(verified local)*

Constructor is now options-based: `New(opts ...Option)`, with `WithWidth(int)` / `WithHeight(int)`; or `New()` then
`SetWidth`/`SetHeight`. Fields: `KeyMap`, `SoftWrap bool`, `FillHeight bool`, `MouseWheelEnabled bool`,
`MouseWheelDelta int`, `YPosition int`, `Style lipgloss.Style`, `LeftGutterFunc GutterFunc`,
`HighlightStyle lipgloss.Style`, `SelectedHighlightStyle lipgloss.Style`, `StyleLineFunc func(int) lipgloss.Style`.

Methods: `SetContent(string)`, **`SetContentLines([]string)`**, `GetContent()`, `SetWidth`/`SetHeight`/`Width()`/
`Height()`, `SetYOffset`/`YOffset()`, `SetXOffset`/`XOffset()`, `SetHorizontalStep(n)`, `ScrollUp/Down/Left/Right(n)`,
`PageUp`/`PageDown`/`HalfPageUp`/`HalfPageDown`, `GotoTop`/`GotoBottom` (both return the newly visible `[]string`),
`AtTop`/`AtBottom`/`PastBottom`, `ScrollPercent()`/`HorizontalScrollPercent()`, `TotalLineCount()`,
`VisibleLineCount()`, **`SetHighlights(matches [][]int)`**, `HighlightNext()`, `HighlightPrevious()`,
`ClearHighlights()`, `EnsureVisible(line, colstart, colend int)`.

`GutterContext` is `{Index, TotalLines int; Soft bool}`, so `LeftGutterFunc` can render line numbers and mark soft-wrap
continuations.

**`HighPerformanceRendering` is removed entirely.** A plan that mentions it is writing v1.

The search-highlight trio (`SetHighlights`, `HighlightNext/Previous`, `EnsureVisible`) is a whole find-in-log feature
for free, and `SetContentLines` avoids a join-then-split round trip when the log is already `[]logs.Entry`.

### `table` *(verified local)*

`New(opts ...Option) Model`; fields `KeyMap KeyMap`, `Help help.Model`; `Column{Title string; Width int}`, `Row []string`.
Methods: `SetColumns([]Column)`, `SetRows([]Row)`, `Rows()`, `Columns()`, `SelectedRow() Row`, `Cursor()`,
`SetCursor(n)`, `MoveUp(n)`/`MoveDown(n)`, `GotoTop`/`GotoBottom`, `Focus`/`Blur`/`Focused`, `SetStyles(Styles)`,
`SetWidth`/`SetHeight`/`Width()`/`Height()`, `UpdateViewport()`, `HelpView()`, `FromValues(value, separator string)`.
`Column.Width` is a fixed int the caller computes; the component does not distribute widths for you.

### The rest *(verified local symbol lists)*

- `spinner`: `New(opts ...Option)`, `Spinner{Frames []string; FPS time.Duration}`, package vars `Line`, `Dot`,
  `MiniDot`, `Jump`, `Pulse`, `Points`, `Globe`, `Moon`, `Monkey`, `Meter`, `Hamburger`, `Ellipsis`; `Model.Tick`,
  `TickMsg`, `Style lipgloss.Style`.
- `progress`: `New(opts ...Option)`; `SetWidth`/`Width()`; `Full`/`Empty rune`, `FullColor`/`EmptyColor color.Color`
  (were strings in v1), `ShowPercentage`, `PercentFormat`, `PercentageStyle`; `SetPercent(p) tea.Cmd`,
  `IncrPercent`/`DecrPercent`, `Percent()`, `IsAnimating()`, `SetSpringOptions(frequency, damping)`,
  **`ViewAs(percent float64) string`** (renders a given percent with no model state, so it is golden-testable),
  `ColorFunc func(total, current float64) color.Color`, `DefaultFullCharHalfBlock = '▌'`.
- `help`: `New()`, `SetWidth`/`Width()`, `ShowAll bool`, `ShortSeparator`, `FullSeparator`, `Ellipsis`, `Styles`,
  `View(k KeyMap) string`, `ShortHelpView([]key.Binding) string`, `FullHelpView([][]key.Binding) string`; new
  `DefaultStyles(isDark bool)`, `DefaultDarkStyles()`, `DefaultLightStyles()`. `KeyMap` is the interface
  (`ShortHelp() []key.Binding`, `FullHelp() [][]key.Binding`).
- `key`: `NewBinding(opts ...BindingOpt)`, `WithKeys`, `WithHelp`, `WithDisabled`; `Binding.Keys()`, `Help()`,
  `Enabled()`, `SetEnabled`, `SetKeys`, `SetHelp`, `Unbind`. **`Matches` is now generic**:
  `func Matches[Key fmt.Stringer](k Key, b ...Binding) bool`.
- `list`: `New(items []Item, delegate ItemDelegate, width, height int) Model` (still positional). `Item` interface,
  `DefaultItem`, `DefaultDelegate`, `ItemDelegate`; filtering built in (`FilterFunc`, `FilterState`,
  `FilterMatchesMsg`, `FilterValue()`, `MatchesForItem(index)`, `IsFiltered()`); `Paginator`, `Help`, `FilterInput`
  embedded; `AdditionalShortHelpKeys`/`AdditionalFullHelpKeys func() []key.Binding`;
  `NewStatusMessage(s) tea.Cmd`, `StatusMessageLifetime`; `DefaultStyles(isDark)`, `NewDefaultItemStyles(isDark)`,
  and `styles.FilterPrompt` is now `styles.Filter.Focused.Prompt` / `.Blurred.Prompt`.
- `paginator`: `New(opts ...Option)`, `Type` (`Arabic`, `Dots`), `DefaultKeyMap()` is a function now.
- `timer` / `stopwatch`: `New(opts ...Option)`, `TickMsg`, `StartStopMsg`, `TimeoutMsg` (timer), `ResetMsg`
  (stopwatch).
- `textinput` / `textarea`: `Blink()`, `Paste()`, `Styles`/`StyleState` (split focused/blurred), `CursorStyle`,
  `EchoMode`, `ValidateFunc`, `DefaultKeyMap()`; `textinput` gained `SetWidth`/`Width()`.
- `cursor`: v1's `model.Blink` field is now `model.IsBlinked`, and v1's `BlinkCmd()` is now `Blink()`. `Mode`,
  `BlinkMsg`.
- `filepicker`: `SetHeight(10)` / `Height()`; `DefaultStylesWithRenderer(r)` became `DefaultStyles()`. Not needed by
  cairn.

### What v2.2.x adds that the local v2.1.1 copy does not have

*(web:* module proxy version list plus <https://github.com/charmbracelet/bubbles/releases>*; the API details below are
from the third research pass and are **unverified** against source, because the local module cache is at v2.1.1)*

- **`bubbles/v2/tree`**, new in v2.2.0: `New(t *Node, width, height int) Model`, `NewNode()`, `Root(any)`,
  `OpenCurrentNode`/`CloseCurrentNode`/`ToggleCurrentNode`, `NodeAtCurrentOffset()`, `SetNodes(*Node)`, plus the usual
  navigation and an embedded `help.Model`. Community-contributed and one minor release old. Distinct from
  `lipgloss/v2/tree`, which renders a static string; this one is an interactive, collapsible `tea.Model`.
- **`textarea` text selection**, v2.2.0: `BeginSelection(x, y)`, `ExtendSelection(x, y)`, `SelectedText()`,
  `CopySelection()`, `DeleteSelection()`, `SelectAll()`. Plus `DynamicHeight` (v2.1.0) and `MaxContentHeight`
  (v2.2.0).
- **`textinput` real terminal cursor**: `VirtualCursor bool` / `SetVirtualCursor(bool)`, and when virtual is off,
  `Cursor()` returns a `*tea.Cursor` for the terminal's own cursor rather than a rendered block. This is the mechanism
  behind the addendum's `Frame.Cursor` note.
- v2.2.1 fixed a textarea freeze on ctrl-word-back at buffer start.

Nothing here is needed by 1.0. The HUD should pin v2.2.x or later from the start, since `tree` is a plausible fit for
the detail view's check hierarchy and pinning late means a second migration.

## A.4 Adjacent libraries

Versions from `go list -m -versions` on the public proxy, 2026-09-20. Dependency claims from the module's own `go.mod`
fetched from the proxy, which is the only way to answer "is this v2-compatible" honestly.

### `charm.land/fang/v2` v2.0.1 — cobra styling. Stable.

Covered in full in B.4. `go.mod` confirms it depends on `lipgloss/v2`, `colorprofile`, `x/ansi`, `x/exp/charmtone`,
`x/term`, `mango-cobra`, `roff`, `cobra v1.9.1`, `pflag`, `testify`, `x/sys`, `x/text` — and **no bubbletea**. So fang
is safe to use in a CLI that never starts a program, which is exactly 1.0's shape.

### `charm.land/huh/v2` v2.0.3 — forms. Stable, and declined.

Fields Input, Text, Select, MultiSelect, Confirm, FilePicker, Note; `huh/spinner` is a blocking one-shot spinner with
`.Title()`, `.Action(func())` or `.Context(ctx)`, `.Run()`. `Form.WithAccessible(bool)` is deprecated in favour of
`RunAccessible(w io.Writer, r io.Reader) error`, which drops the TUI for sequential prompts — a genuinely good
screen-reader story *(web:* <https://pkg.go.dev/charm.land/huh/v2>*)*. Its `go.mod` pulls `xpty`, `conpty`, `creack/pty`,
`catppuccin/go`, `hashstructure`, and its own bubbletea/bubbles/lipgloss pins.

The spec addendum already rules huh out for the adopt dialog. That ruling holds: cairn's one interactive dialog is a
pick list, `bubbles/list` is the pick list, and `RunAccessible` buys nothing cairn does not already get from having a
subcommand for every action. Worth revisiting only if 2.0's multi-site management grows a real multi-field form.

### `github.com/charmbracelet/glamour` v1.0.0 — markdown rendering. Stable.

`WithWordWrap(width int)` (default 80), `WithStylesFromJSONFile(path)`, `WithStylesFromJSONBytes([]byte)`,
`WithStyles(StyleConfig)`. No v2. **Interesting for cairn**: the remedy pages are `docs/admin/is-it-working.md`, and
`glamour` could render the relevant section inline in the detail view instead of only linking to it. That is a real
feature, and it is also scope: it puts a markdown renderer and a docs-fetch path in a monitoring tool. File it, do not
take it.

### `github.com/charmbracelet/harmonica` v0.2.0 — spring physics. Pre-v1, last released 2022.

`NewSpring(deltaTime, angularFrequency, dampingRatio float64) Spring`; `(Spring).Update(pos, vel, target float64)
(newPos, newVel float64)`. Zero dependencies, pure maths, no bubbletea, so its age is not staleness. It is what
`bubbles/progress` uses internally (`bubbles/v2 v2.2.1`'s `go.mod` requires `harmonica v0.2.0`). Only reach for it
directly for a custom animated value; `progress.SetSpringOptions` already exposes it where cairn would want it.

### `charm.land/log` v1.0.0 (also `github.com/charmbracelet/log` v1.0.0) — styled structured logging. Stable.

Implements `slog.Handler`, so it drops into `log/slog`. `log.New(io.Writer)`, `log.Default()`, Debug through Fatal,
`TextFormatter` / `JSONFormatter` / `LogfmtFormatter`, `Helper()`.

**Declined, and the reason is a ruling already in the plan.** Task 21 creates `tool/internal/logx` with one chokepoint
and the credential-scrubbing step as the last thing on every emitted string, proven by a byte-level sentinel test. A
second logging library is a second path out, and the sentinel test does not cover it. If a pretty console format is
wanted later, it is a formatter behind `logx`, not a replacement for it.

### `github.com/charmbracelet/x/exp/teatest/v2` and `x/exp/golden` — experimental.

Covered in A.1. Both live in `x/exp` with no API guarantee. `bubbles/v2` and `fang/v2` both depend on `x/exp/golden`
already, so it arrives whether or not cairn calls it.

### `github.com/charmbracelet/vhs` v0.12.0 — terminal recording. Pre-v1, actively released.

Drives a real pty through a headless terminal and records a scripted `.tape` to GIF, MP4, WebM, or a still. v0.12.0
added rows-and-columns sizing instead of pixels-only, which matters for capturing an exact width rung. The workstation
already has the `vhs-cli-demos` skill, with the determinism rules (pin the clock, lock the theme, `FontSize` 18-22,
omit `Width`/`Height`, `gifsicle -O3` losslessly) and the `Screenshot file.png` versus `Output file.png` trap.

For cairn this is the README and docs capture path, and the rows-and-columns sizing makes it a plausible **second**
golden layer: a per-rung still at 80, 120, 160, 220. Note the `tui-visual-verify` skill's standing rule, which
overrides any temptation to call this verification: VHS renders through xterm.js in Chromium, not the owner's terminal,
so it is a docs medium and a CI medium, never the gate. The gate is a kitty screenshot read by a context that did not
build the change.

### `github.com/charmbracelet/freeze` v0.2.2 — stills of code or ANSI output. Pre-v1.

PNG, SVG, WebP. Useful for one thing cairn might actually want: `cairn health --snapshot out.svg`, an exportable board
image to paste into an incident thread. Low priority, real value, no dependency cost until taken.

### `github.com/lrstanley/bubblezone/v2` v2.0.0 — mouse zones. Stable tag, **and the author advises against it here.**

`go.mod` confirms it is v2-native: it requires `charm.land/bubbletea/v2 v2.0.0` and `charm.land/lipgloss/v2 v2.0.0`
*(verified via the proxy)*. So the compatibility question is answered: it builds.

The caution is stronger than a compatibility question and comes from the author, verbatim in the repo README
(<https://github.com/lrstanley/bubblezone/blob/master/README.md>, "Changes in v2"):

> bubblezone v2 may not work when using the lipgloss v2 canvas/compositor. lipgloss/bubbletea v2 have some more native
> features for mouse event tracking. That said, I do plan to release another library that covers advanced
> layouts/layering/etc with improved mouse event tracking.

The HUD's adopt dialog is exactly a canvas/compositor overlay, so cairn would hit this. **Declined**; use
`tea.View.OnMouse` and `Compositor.Hit`/`Layer.ID` (see D.8).

### Charts and sparklines

**`github.com/NimbleMarkets/ntcharts`** — two lines, and the version numbers mislead.
`github.com/NimbleMarkets/ntcharts v0.5.1` is **bubbletea v1**: its `go.mod` requires
`github.com/charmbracelet/bubbletea v1.2.2`, `bubbles v0.20.0`, `lipgloss v1.0.0`, and the v1 `bubblezone`
*(verified via the proxy)*. The v2-compatible line is a **separate module path**,
`github.com/NimbleMarkets/ntcharts/v2`, currently v2.2.0, which requires `charm.land/bubbles/v2 v2.1.0`,
`bubbletea/v2 v2.0.6`, `lipgloss/v2 v2.0.3`, `bubblezone/v2 v2.0.0`, `ultraviolet`, `go-analyze/charts`,
`NimbleMarkets/pixterm`, `go-booba`, `golang.org/x/image`.

Two disqualifiers for cairn, both from that `go.mod`. It carries `replace charm.land/bubbletea/v2 =>
github.com/neomantra/bubbletea/v2 v2.0.0-...` with the comment "Awaiting upstream merges", i.e. it currently depends on
a fork of bubbletea. A `replace` in a library does not apply to a consumer, so cairn would get upstream bubbletea and
whatever behaviour the fork was patching would be absent. And it depends transitively on `bubblezone/v2`, which the
section above declines. Chart types on offer are Canvas, bar, heat map, line, `timeserieslinechart`, OHLC, scatter,
streamline, time series, waveline, sparkline. **Declined for now; revisit when the fork `replace` is gone.**

**`github.com/guptarohit/asciigraph` v0.10.0 — take this one if cairn wants a sparkline.** Its `go.mod` is three lines:
module, `go 1.11`, and nothing else. **Zero dependencies, no bubbletea, no lipgloss** *(verified via the proxy)*. It
turns a `[]float64` into an ASCII line-chart string, with multi-series, colour, legends, and a streaming stdin mode.
A pure function returning a string is precisely what Task 20's seam admits, so a 24-hour error-count sparkline per row
is available to 1.0, not only to the HUD. Style the returned string with `lipgloss`, measure it with `lipgloss.Width`.

**`github.com/gizak/termui`** runs its own event loop and does not compose into a bubbletea model. Wrong shape;
not evaluated further.

### Mentioned and dismissed

`gum` (Charm components as standalone binaries, for shell scripts), `wish` and `soft-serve` (SSH app framework and
git server; `wish` + bubbletea is the standard "ssh into the dashboard" pattern and is a separate feature, not a
dependency), `charm.land/crush` (Charm's AI coding agent, a product, not a library).

---

# B. What 1.0's pure `render` package can use today

Task 20's rules: no bubbletea, no terminal queries, string out, deterministic goldens, correct at ANSI-16 and with
colour off, correct on a Windows console and under cron. Everything below satisfies all six.

## B.1 The dependency to take, and the one not to

**Take `charm.land/lipgloss/v2` plus `github.com/charmbracelet/colorprofile` plus `github.com/charmbracelet/x/ansi`.**
`tool/go.mod` today has `cobra`, `go-keyring`, `x/sys`, `x/term` and nothing else. The three additions bring
`ultraviolet`, `go-colorful`, `displaywidth`, `uax29`, `go-runewidth`, `uniseg`, `terminfo` as indirects: seven
transitive modules, no cgo, all pure Go, all already vetted on this workstation by poplar.

The alternative is hand-rolled `fmt.Sprintf` padding, and it fails on the first job Task 20 has: pad a column that
contains `●` or `─` to a fixed width. `len` and rune count are both wrong; `lipgloss.Width` / `ansi.StringWidth` is
right. Task 20's purity test already anticipates the import (acceptance 8 names its forbidden imports precisely so
"a later pure lipgloss v2 import [can] land without tripping the test"). Landing it *in* Task 20 rather than later is
the cheaper order, because the golden corpus is created in Task 20 and every golden would otherwise be rewritten.

**Do not take `lipgloss.Print*` / `Sprint*` / `Fprint*`, and do not touch `lipgloss.Writer`.** `lipgloss.Writer` is a
package-level `colorprofile.NewWriter(os.Stdout, os.Environ())`: it reads the process environment at init. Task 20's
purity test should name `lipgloss.Writer` and the `lipgloss.Print*` family as forbidden identifiers outside `profile.go`
and the command layer, the same way it names `os` and `x/term`.

## B.2 The pure seam, concretely

```
render.Render(in RenderInput) Frame
  └── paint with lipgloss Styles built from (in.Dark, in.Profile)   // pure
  └── measure with lipgloss.Width / ansi.StringWidth                // pure
  └── truncate with ansi.Truncate / ansi.TruncateWc                 // pure
  └── downsample once, at the end, with colorprofile.Writer         // pure, explicit
```

Two ways to reach a profile, and the choice matters:

- **`colorprofile.Writer` over the whole frame.** One line of code, nearest-match conversion. Fast to write.
- **Name the colour per profile at the palette.** `lipgloss.Complete(p)(ansiColor, ansi256Color, trueColor)`, or
  poplar's shape: an explicit ANSI-16 slot per semantic role, `lipgloss.Color(strconv.Itoa(slot))`
  *(local: `poplar/internal/theme/theme.go`)*. Poplar's comment records the measured reason:
  "a nearest-match downsample collapses distinct roles onto the same slot, so the palette names one directly per role".

**Recommendation: name the slot per role, and keep `colorprofile.Writer` as the safety net.** A status board's whole
job is distinguishing OK from failing from unknown from acknowledged. If the downsample collapses two of those onto
ANSI slot 3, the board lies at ANSI-16, and the golden corpus will happily record the lie.

Poplar's second measured finding transfers too: at ANSI-16, `Faint` on top of slot 8 renders at 1.29:1 contrast, i.e.
invisible, so the theme uses `Faint` only at no-colour and relies on slot 8 alone at ANSI-16. And `Reverse(true)` is
the one non-colour channel reserved for selection.

## B.3 Making each 1.0 surface attractive and scannable

**`cairn health <site>`.** The monitoring-plugin verdict line Task 20 already specifies is the right lead; what
lipgloss adds is rank made visible without a box. A single `lipgloss.NewStyle().Border(lipgloss.Border{Left: "▌"},
false, false, false, true).BorderForeground(...)` gives a two-cell severity gutter that survives to ANSI-16 as a
coloured bar and to no-colour as the bar alone. The failing check's reason gets `UnderlineStyle(UnderlineCurly)` with
`UnderlineColor`, which costs zero columns and degrades to nothing. The remedy anchor becomes a real clickable link
with `Style.Hyperlink("https://…is-it-working.md#" + anchor)` or `ansi.SetHyperlink` — OSC 8 is inert text in a
terminal that does not support it, so it is free, and `colorprofile.Profile.NoTTY` strips it under cron. Fold the OK
checks into one `list` line with `list.Dash`; expand the failing ones.

**`cairn sites list`.** Use `charm.land/lipgloss/v2/table`, not hand-rolled padding. `StyleFunc(row, col)` is exactly
the seam a per-cell severity colour needs, `HeaderRow` names the header, `Width(n)` plus `Wrap(false)` gives fixed
columns with truncation, and `BorderRow(false)` / `BorderColumn(false)` gives the dense, ruleless board a monitoring
tool wants rather than a grid of boxes. Column widths stay cairn's own computation (the 80/120/160 rungs), fed to
`table` as fixed widths; that keeps the rungs deterministic instead of letting the library reflow.

**A failing run with remedies.** Three devices, all pure: the severity gutter above; `lipgloss.JoinHorizontal` to put
the glyph, state word, and age on one optically aligned row; and `Blend1D` for an age ramp (fresh → stale) so "updated
4m ago" reads as a colour as well as a number. Keep the hue budget at two per row, per the `bubbletea-design` skill's
rule, and spend it on severity.

**`cairn logs`.** `tree` or `list` for the per-record fields under each entry line; `ansi.Wordwrap` at the frame width
for a long message; `StyleRanges` to highlight the matched substring when a filter is active, which is the pure
precursor of 2.0's `viewport.SetHighlights`. A log line's `event` name is the one place a second hue is justified.

**One cross-cutting device worth taking in 1.0**: `ansi.SetProgressBar` / `SetErrorProgressBar` (OSC 9;4). A long
`cairn health` over four sites can drive the terminal's own taskbar progress and finish red on exit 1. It is a single
escape string, inert where unsupported, and stripped at `NoTTY`. Gate it behind the same profile check as colour.

## B.4 `fang` on the cobra surface

**Two lines.** `charm.land/fang/v2 v2.0.1` (2026-03-11) is current; `github.com/charmbracelet/fang v1.0.0`
(2025-12-20) is the older path. *(Both verified via the module proxy.)* The API below was read from the v1 page
(<https://pkg.go.dev/github.com/charmbracelet/fang>); the v2 API is **unverified**, but the two `go.mod` require lists
are identical, so there is no dependency surprise in the newer line.

API: `Execute(ctx context.Context, root *cobra.Command, options ...Option) error`;
`DefaultErrorHandler(w io.Writer, styles Styles, err error)`; options `WithVersion(string)`, `WithCommit(string)`,
`WithoutVersion()`, `WithColorSchemeFunc(ColorSchemeFunc)`, `WithTheme(ColorScheme)` (deprecated),
`WithErrorHandler(ErrorHandler)`, `WithNotifySignal(...os.Signal)`, `WithoutManpage()`, `WithoutCompletions()`;
types `ColorScheme`, `ColorSchemeFunc`, `Codeblock`, `ErrorHandler`, `Option`, `Program`, `Styles`.

**What it gives:** styled help and usage pages, styled errors, an automatic `--version`, man-page generation
(`muesli/mango-cobra` + `muesli/roff`), shell completions, and a signal-notify path. That is four of Task 19a/19b's
concerns arriving as one dependency.

**What it costs.** Direct requires *(verified via the proxy for `charm.land/fang/v2@v2.0.1` and via
<https://raw.githubusercontent.com/charmbracelet/fang/main/go.mod>, identical lists)*:
`charm.land/lipgloss/v2`, `colorprofile`, `x/ansi`, `x/exp/charmtone`, `x/exp/golden`, `x/term`, `mango-cobra`, `roff`,
`cobra`, `pflag`, `testify`, `x/sys`, `x/text`. Given cairn is taking lipgloss anyway, the genuinely new modules are
`mango-cobra`, `mango`, `mango-pflag`, `roff`, `charmtone`, and (test-only) `testify`. Note it pins
`lipgloss v2.0.1` and `cobra v1.9.1`, both older than cairn's current `cobra v1.10.2`; Go's MVS takes the higher, so
this is a compatibility question to verify by building, not a blocker.

**Three real costs beyond dependencies.**

1. **Control over output.** `fang.Execute` owns the error path and the help template. cairn has a ruled error surface
   (Task 21: a usage error exits 3, its stdout is empty, `main` is the only caller of `os.Exit`, and the scrubbing
   chokepoint is the last step on every emitted string). `fang`'s `DefaultErrorHandler` writes an error the way fang
   wants to; a custom `WithErrorHandler` can restore cairn's shape, but that is the integration work, and it must route
   through the scrubbing chokepoint or a credential can reach the terminal by a path Task 21's byte-level sentinel test
   does not cover.
2. **Testability.** `fang.Execute` takes the root command and returns an error; it does not take a writer. cairn's
   `main.go` grep test allows `os.Stdout`/`os.Stderr`/`os.Exit` in `main.go` alone. Whether fang honours
   `cmd.SetOut`/`SetErr` for its styled help is **unverified** and is the thing to test first in a spike.
3. **Colour policy.** fang brings its own `colorprofile` detection and its own `charmtone` palette. Task 20 rules that
   `render/profile.go` is the module's one TTY check and one detection order. fang detecting independently means two
   detectors, which is exactly the drift the ruling exists to prevent. `WithColorSchemeFunc` takes a
   `ColorSchemeFunc`, which is the seam for feeding cairn's own palette in, but the detection itself may not be
   overridable.

**Recommendation: do not take `fang` in Task 20 or 19a. File it as a 2.0-window spike** whose acceptance is the three
items above answered by a build, not an argument. The reason is ordering, not merit: fang's value is concentrated in
help, errors, and man pages, which Tasks 19a/19b and 21 are specifying from scratch with rulings fang would have to be
bent to honour. Adopting it after those rulings exist is a bounded refactor; adopting it during is a contested
authority over the error path. The one piece worth taking early and separately is man-page generation, which is
`mango-cobra` directly, no fang.

---

# C. What the 2.0 HUD should use, per screen

| Screen or concern | Component or technique | Notes |
|---|---|---|
| **Status grid** | `bubbles/v2/table` for cursor, focus, and key handling; feed it `[]Column` with widths cairn computes per rung. Cells rendered by `render`'s own pure painters, with `SetStyles(Styles)` for selection | `Column.Width` is a fixed int the caller supplies, so the rung table stays cairn's, not the library's. `SelectedRow()` drives Enter → detail. **Do not** use `lipgloss/table` here: it has no cursor |
| **Detail view** | `viewport` wrapping a `render.Render` string, plus `lipgloss/list` for folded OK checks and `lipgloss.JoinVertical` for the sections | The detail body can exceed the height at 80 columns, so it needs scrolling from day one. `SetContentLines` takes `Frame.Lines` directly |
| **Log viewer** | `viewport` with `SoftWrap = true`, `LeftGutterFunc` for the line number, `SetContentLines([]string)`, `SetHighlights(matches [][]int)` + `HighlightNext`/`HighlightPrevious` + `EnsureVisible` for find-in-log, `StyleLineFunc` for per-level colour, `MouseWheelEnabled` | The addendum already rules "name bubbles v2's `viewport`". The highlight trio is the part the addendum does not know about and is a whole feature for free |
| **Adopt dialog** | `bubbles/v2/list` with a custom `ItemDelegate`, over `lipgloss.NewLayer(...).X().Y().Z()` composed by a `Compositor` for the modal float | The addendum's ruling (list, not huh) is correct. v2's `Canvas`/`Layer`/`Compositor` is what makes it a real overlay rather than a screen swap. `list`'s built-in filter is the right way to find one Worker among fifty |
| **Refresh indicator** | `spinner` (`spinner.MiniDot` or `Dot`) at full motion; a static glyph plus the countdown when motion is reduced. Plus `tea.View.ProgressBar` for the OS taskbar during a sweep, `ProgressBarError` on a failing verdict | The spinner is the one animation; `Spinner.FPS` is the reduced-motion lever (or drop to a static frame) |
| **Sweep progress** | `bubbles/v2/progress` with `ViewAs(percent)` so the bar is golden-testable without model state; `SetSpringOptions` off or `WithoutPercentageAnimation` under reduced motion | `progress` animates by spring, which is a motion surface a reduced-motion setting must reach |
| **Help** | `bubbles/v2/help` with `Styles = help.DefaultStyles(isDark)`, `SetWidth(w)`, `View(keyMap)`; `ShowAll` toggled by `?`. Bindings are `key.Binding` matched with the generic `key.Matches` | Each screen implements `help.KeyMap` (`ShortHelp`, `FullHelp`), which makes the footer per-screen for free. The addendum already rules `key.Binding` over string comparison |
| **Responsive rungs** | Five rungs, not three: a floor below which the HUD refuses to paint, then 80, 120, 160, and a wide rung. The HUD reads `WindowSizeMsg` at the root, recomputes a layout value, **and forwards the message to children** | The addendum names the two extra rungs. The wide rung's test is "composed, not stretched": at 220 columns a grid that only grew is wrong; use `lipgloss.Place` with a max content width and let the margins breathe |
| **Mouse** | `tea.View.MouseMode = tea.MouseModeCellMotion` declared every frame; `MouseWheelMsg` to the focused viewport or table; `tea.View.OnMouse` for content-level hit tests; `Compositor.Hit(x, y)` + `Layer.ID` for layer-level hits | **`bubblezone` is not needed.** v2 has two native hit-test paths. Declaring `MouseMode` per frame is the trap poplar's `View` comment records: any return path that forgets it silently turns reporting off |
| **Screen reader** | The CLI is the path, and it works because every HUD action has a subcommand, which 1.0 delivers | Already in the addendum. The HUD's own contribution is not fighting it: no HUD-only capability |
| **`NO_COLOR` / `TERM=dumb` / non-TTY** | One detector, `render/profile.go`, whose result is passed into both `render` and `tea.WithColorProfile(...)`. Poplar's `mapColorProfile` is the shape: cairn's `render.Profile` → `colorprofile.Profile` | `colorprofile` is the only library that reads `NO_COLOR` *(verified local)*, so the single-detector ruling is enforceable |
| **Reduced motion** | One `Motion` field in the HUD's theme, read by the spinner's FPS, the progress bar's spring, and any `Blend1D` transition | There is no cross-platform reduced-motion env var. Take `CAIRN_REDUCED_MOTION` plus the profile (no-colour implies reduced motion) and document it |
| **Light and dark** | `lipgloss.LightDark(isDark)` at render time, with `isDark` from `tea.BackgroundColorMsg`'s `IsDark()`, defaulted dark and repainted when the answer arrives. Bound the wait | Poplar's `QueryBackgroundColor` is the exact pattern: `tea.Batch(tea.RequestBackgroundColor, tick(100ms))`, first answer wins, tests prove a never-answering terminal still resolves *(local: `poplar/internal/ui/background.go`)* |

Two HUD-level mechanics worth naming now:

- **The alt-screen and mouse declaration is per frame.** Poplar's `App.View` sets `MouseMode` and `AltScreen` on
  every returned `tea.View` with a comment saying why. Copy that, including the comment, and add a test that asserts
  every screen's `View()` carries both (poplar has one: `compose_guard_internal_test.go`).
- **`tea.Println` prints above an inline program.** If the HUD ever wants "sweep finished, 1 failing" to survive in
  scrollback after quitting, that is the command, and it only works while `AltScreen` is false.

---

# D. Gaps

Each item: what the current text says, what is true, the recommendation, the cost. Items marked **DECIDE IN TASK 20**
are ones the 2.0 HUD inherits, so deferring them means rewriting the golden corpus later.

## D.1 Task 20 ships no styling library at all — **DECIDE IN TASK 20**

Task 20 names `render.go`, `profile.go`, `glyph.go`, `remedy.go`, a three-value `Profile` enum, and a golden corpus,
and never names lipgloss. `tool/go.mod` has no Charm dependency. The purity test is written to *allow* a future
lipgloss import, which means the task anticipates it and declines it.

The consequence is not cosmetic. Column padding without `lipgloss.Width` is wrong the first time a glyph is
double-width, and the golden corpus records the wrong padding as correct. Every golden is then rewritten when lipgloss
lands.

**Recommendation:** add `charm.land/lipgloss/v2`, `github.com/charmbracelet/colorprofile`, and
`github.com/charmbracelet/x/ansi` to Task 20. Build the palette per profile with named ANSI-16 slots per role
(poplar's measured pattern), not a nearest-match downsample. Keep `colorprofile.Writer` as the final downsample pass.
Extend the purity test's named-forbidden list with `lipgloss.Writer` and the `lipgloss.Print*`/`Sprint*`/`Fprint*`
family, which are the only impure identifiers in the package.
**Cost:** one task's worth of palette work, seven transitive modules, and a `check` run. Deferring costs the entire
golden corpus twice.

## D.2 `Frame struct{ Lines []string }` versus poplar's `Frame struct{ Content string; Cursor *tea.Cursor }` — **DECIDE IN TASK 20**

Task 20 produces `type Frame struct{ Lines []string }`. Poplar's is `{Content string; Cursor *tea.Cursor}`. The
addendum says "`Frame` gains `Cursor *tea.Cursor` at the HUD pass".

`Lines []string` is the better 1.0 choice and the addendum's plan is the wrong way to reconcile them: adding a
`*tea.Cursor` field to `render.Frame` puts a bubbletea type in the pure package, which breaks Task 20's own rule and
its purity test. `Lines` is also what `viewport.SetContentLines([]string)` wants, so it composes better than a string
that has to be split.

**Recommendation:** keep `Frame{Lines []string}` in `render`, and let the HUD's own `ui.Frame` carry the cursor,
constructed from a `render.Frame` plus the HUD's own cursor state. State this in Task 20 as a ruling so the HUD plan
does not follow the addendum into a purity violation. Optionally add `Frame.String() string` (a `\n` join) so a caller
that wants one string does not re-implement the join.
**Cost:** one sentence in Task 20 and one struct in the HUD. Following the addendum instead costs the purity test.

## D.3 The glyph tier selection diverges from poplar, and poplar has the measurement — **DECIDE IN TASK 20**

Task 20 acceptance 6: the ASCII tier is selected at no-colour or `TERM=dumb`, on the reading that "a terminal that
cannot color is the terminal least likely to render the glyphs". Poplar selects ASCII at **both** `ProfileANSI16` and
`ProfileNoColor` *(local: `poplar/internal/theme/glyph.go`)*, and it enforces a rule Task 20 does not state:
`TestGlyphWidthParity` asserts every ASCII glyph is exactly as wide, in cells, as its Unicode counterpart, "so a
degrade substitution never shifts a column budget".

The width-parity rule is the load-bearing half and it is missing from Task 20. Without it, the 80-column rung's column
arithmetic is only correct at one tier.

**Recommendation:** take poplar's width-parity test into Task 20 verbatim in intent. Decide the ANSI-16 tier
deliberately rather than by omission; cairn's `+ ! ? ~` set is single-width and so is `● ▲ ? ~`, so either choice is
safe *once parity is tested*, and the argument for ASCII at ANSI-16 is weaker for cairn than for poplar because
cairn's glyph count is four, not seventeen. Recommend Unicode at ANSI-16, ASCII at no-colour and `dumb`, plus the
parity test.
**Cost:** one test. Skipping it costs a silently ragged 80-column board at one tier, which the goldens will bless.

## D.4 The HUD's palette and style definitions have no home — **DECIDE IN TASK 20**

Task 20 creates `glyph.go` but no palette file, and the plan records "the full poplar `theme` port is 2.0". So 1.0's
colours live inline in `render.go` and 2.0 ports a theme beside them, which is two palettes.

**Recommendation:** create `render/palette.go` in Task 20 with the semantic roles the tool actually has (ok, failing,
unknown, acknowledged, degraded, offline, stale, border, muted, accent) resolved per `Profile` and per `Dark`, each
returning a `lipgloss.Style`. The 2.0 theme then *is* this file, widened, not a second file. Follow poplar's seam
discipline: expose `Style(role, ground)` and `Sized`, so no caller chains a raw lipgloss setter off a returned style
(poplar has `EmphasizeRole` and `Sized` for exactly this, with an analyzer note explaining why).
**Cost:** one file and one test in Task 20. Skipping it costs a palette merge in the HUD pass, with the golden corpus
as the blast radius.

## D.5 The width rungs are three; the HUD needs five, and the goldens are created in Task 20 — **DECIDE IN TASK 20**

Task 20 acceptance 9 sweeps 80, 120, 160. The addendum adds a very-wide rung and a too-small floor, and the family-wide
responsive standard is five viewports, composed at the extremes, never merely unbroken.

The rungs are a `render` input, so they are Task 20's, and the corpus is `fixtures × widths × profiles × views`.
Adding two rungs after the corpus exists multiplies the regeneration.

**Recommendation:** rule five rungs in Task 20 and sweep them: a floor (say 60) where the output says it cannot render
the full board and prints a one-line summary instead, then 80, 120, 160, and a wide rung (say 220) where the layout is
`lipgloss.Place`d to a maximum content width rather than stretched. Note the two heights the task already sweeps stay
as they are.
**Cost:** the corpus grows from 3 to 5 widths, roughly +67% golden files, created once. Adding them at the HUD pass
regenerates everything and re-reviews every file.

## D.6 The addendum's "`App.View()` returns a `tea.View`" understates the change

The addendum names the return type and the alt-screen/mouse-per-frame fact. It does not name the other ten fields, and
three of them are capabilities the HUD would otherwise not know it has: `ProgressBar` (OSC 9;4 taskbar state),
`OnMouse` (content-level hit testing, which removes the need for `bubblezone`), and `KeyboardEnhancements` (a struct,
not a bool). It also does not name `WindowTitle`, which is the cheapest possible "1 site failing" indicator for an
operator with the HUD in a background tab.

**Recommendation:** the HUD plan carries the full `View` field table and rules each field's value, including the ones
it deliberately leaves zero. Add a test asserting every screen's `View()` carries `AltScreen` and `MouseMode`
(poplar's `compose_guard_internal_test.go` is the template).
**Cost:** a table in the plan and one test.

## D.7 The addendum's testing correction is right but incomplete

It corrects the false claim that poplar rejected `teatest`. Poplar does require `teatest/v2` and keeps it for one
end-to-end flow test *(local: `poplar/go.mod`, `cmd/poplar/flow_test.go`)*. Two things the addendum should add:
`teatest/v2` is **explicitly experimental**, and poplar's flow test pins
`teatest.WithProgramOptions(tea.WithColorProfile(colorprofile.TrueColor))` with a comment saying why: without it the
comparison depends on environment-dependent downsampling. Any cairn flow test needs the same pin.

**Recommendation:** state both in the HUD plan. **Cost:** two sentences.

## D.8 `bubblezone` should be ruled out, by name, before someone reaches for it

The spec and addendum are silent on mouse hit-testing, and `bubblezone` is the reflex answer anyone who last read this
in the v1 era will reach for. Two facts close it. v2 ships two native paths (`tea.View.OnMouse` for content,
`Compositor.Hit` + `Layer.ID` for layers). And `bubblezone/v2 v2.0.0`, which does build against bubbletea v2 and
lipgloss v2 *(verified via its `go.mod`)*, carries a CAUTION from its own author saying it "may not work when using the
lipgloss v2 canvas/compositor" because "lipgloss/bubbletea v2 have some more native features for mouse event tracking"
(<https://github.com/lrstanley/bubblezone/blob/master/README.md>). The adopt dialog is a compositor overlay, so cairn is
in the failing case.

**Recommendation:** rule it in the HUD plan, citing the author's caution so the ruling does not get re-argued: hit
testing is `tea.View.OnMouse` for content and `Compositor.Hit`/`Layer.ID` for layers; `bubblezone` is declined.
**Cost:** one ruling. Not ruling it costs a debugging session inside a modal.

## D.9 `huh` is ruled out for adopt; the reasoning should extend to `fang`

The addendum rules `list` over `huh` for the adopt dialog on a lean-seam argument. The same argument applies to
`fang`, which brings a framework for the help and error surface that Tasks 19a/19b/21 are specifying with their own
rulings. Section B.4 has the full cost. **Recommendation:** decline in 1.0, file the spike. **Cost:** none now.

## D.10 Two smaller corrections

- The spec's exit-code table (0, 1, 2, 4) is superseded by the plan's Task 21 (0, 1, 2, 3, Nagios convention, usage
  errors exit 3). Task 20's `Verdict` constants match the plan. The spec section is stale; the addendum does not say
  so. **Recommendation:** one addendum line, so a HUD planner reading the spec does not implement exit 4.
- `HighPerformanceRendering` is removed in bubbles v2. Nothing in the current text names it, which is correct; the
  HUD plan should say so explicitly, because it is the single most-copied v1 viewport idiom on the internet.

---

## D.11 A sparkline is available to 1.0 and nobody has noticed

`asciigraph` has zero dependencies and returns a string *(verified via its `go.mod`)*. Task 20 already carries the
24-hour error count as a number. A five-cell sparkline beside it turns "3" into "3, and it was 0 all day until an hour
ago", which is the single highest-value scannable addition available to the pure seam.

**Recommendation:** decide it in Task 20, because the column budget at 80 columns is the constraint and the golden
corpus records the budget. If the answer is no, say no in the task so the HUD pass does not relitigate it in a wider
column budget and end up with two different row grammars.
**Cost:** one dependency with no transitive deps, one column of budget at 120 and 160, and a decision about the 80-column
rung where there is no room.

## D.12 Two library facts the HUD plan should pin now

- **Pin `bubbles/v2` at v2.2.x or later** when the HUD starts, not at poplar's v2.1.1. v2.2.0 added `bubbles/tree`,
  which is a plausible fit for the detail view, and textarea selection. Pinning behind poplar means migrating twice.
- **`ntcharts/v2` currently carries `replace charm.land/bubbletea/v2 => github.com/neomantra/bubbletea/v2`** with the
  comment "Awaiting upstream merges". A `replace` in a library does not apply to a consumer, so cairn would build
  against upstream bubbletea while the library expects a fork. This is a **tripwire, not a note**: if the HUD ever wants
  ntcharts, the gate is that `replace` line disappearing. Per the repo's watch-item rule, that is an external trigger,
  so it belongs to a scheduled agent, not a backlog paragraph.

---

# E. Reference CLIs and TUIs worth borrowing from

Each entry names the one thing to take, not a general endorsement. The first four are the closest in shape to what
cairn is building.

**`k9s`** (<https://github.com/derailed/k9s>, tview not Charm) — the reference for a status grid over many resources.
Borrow three things. The **header block** above the table: a fixed two-column key-value panel of context and a
right-hand keybinding legend, so the grid never has to carry chrome. The **left severity gutter** rather than a coloured
row, which keeps the row readable and survives at ANSI-16. And the discipline that **the grid never re-sorts under the
cursor** while data arrives, which the cairn spec already ruled independently and which k9s is the proof of.

**`btop`** (<https://github.com/aristocratos/btop>) — the reference for composed-at-wide, which is exactly the rung
cairn's spec is missing. btop at 220 columns is not a stretched 120-column layout; it re-tiles into more panels with the
same internal density. Borrow the principle: the wide rung adds panels or breathing margins, never wider cells. Also
borrow its **braille-density sparklines** as the visual target for what a history strip should read like, even though
cairn will use a coarser glyph set.

**`gping`** (<https://github.com/orf/gping>) — the reference for one number plus its history in a tiny space. Borrow
the layout of a live value, a sparkline, and a min/avg/max footer in three rows, which is the shape of a cairn detail
view's per-check history panel.

**`gh dash`** (<https://github.com/dlvhdr/gh-dash>, bubbletea) — the reference for a bubbletea multi-column board with a
detail pane. Borrow its **per-row prefix column of small fixed-width status glyphs** (CI state, review state, checks) as
the pattern for cairn's four status cells at 80 columns, and its **footer that is a `help` view driven by the focused
pane's own keymap**, which is exactly `bubbles/help` + `key.Binding` per screen.

**`glow`** (<https://github.com/charmbracelet/glow>, Charm's own) — the reference for what a Charm-native reading
surface looks like. Borrow the **restraint**: one accent hue, generous left margin, no borders around content, and a
single-line status bar. It is the counter-example to the boxed-everything look that `lipgloss` makes too easy.

**`crush`** (<https://github.com/charmbracelet/crush>, Charm's own, bubbletea v2) — the most current demonstration of
the v2 idioms in a shipped product: per-frame `tea.View`, the compositor for overlays, a real cursor. Read it for
**how Charm itself structures a v2 root model**, which is the closest thing to an upstream answer on the screen-stack
question the spec's `init()` registration item is arguing about.

**`lazygit`** (<https://github.com/jesseduffield/lazygit>, gocui) — borrow one device only: the **numbered panel
affordance**, where each pane shows its own jump key in its border. It solves "how do I get to the log view" without a
help overlay, at the cost of one cell per panel.

**`fzf`** (<https://github.com/junegunn/fzf>) — borrow the **match-highlight grammar**: the matched substring gets a
colour and a bold, the rest of the line stays at base brightness, and the pointer is a single glyph in the gutter. That
is the exact grammar for `viewport.SetHighlights` in the log view and for `lipgloss.StyleRanges` in 1.0's filtered log
output.

**`delta`** (<https://github.com/dandavison/delta>) — borrow its handling of **a very wide terminal for content that is
narrow**: it caps content width and uses the leftover for a line-number gutter and a file header rather than stretching.
The wide-rung answer for cairn's detail view.

**`bat`** (<https://github.com/sharkdp/bat>) — borrow the **one-rule header**: a single horizontal rule with the
filename inset, no box. Cheaper than a border, reads as structure, degrades to ASCII cleanly. The right frame for each
section of `cairn health`.
