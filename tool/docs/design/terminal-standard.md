# The `cairn` terminal standard

Every `cairn` command that paints a terminal speaks one language. This page states it so the next
command can follow it without reading the others. The language is five things: eight color roles,
one set of marks, one grid, a short list of blocks, and three output tiers. The package
`tool/internal/style` holds all five, and no other package defines a copy.

Output on a pipe is outside this standard. A pipe gets each command's plain output, byte for byte
the same as before the language existed.

## Roles

A role names what a piece of text is, and the theme turns it into a color. No non-test Go file
outside `internal/style` writes a color value, and a test fails on one. Color never carries
meaning alone.

The eight roles are the Warm Stone table. The hex values are from `internal/style/palette.go`,
which also carries each role's xterm-256 value and its ANSI-16 slot.

| Role | Light ground | Dark ground | What it paints |
| --- | --- | --- | --- |
| Text | `#28231d` | `#eae7e3` | Body text |
| Muted | `#615d57` | `#a8a49e` | The not-started mark, the spinner, and the pass mark below a failure |
| Subtle | `#504c47` | `#c1bdb8` | Labels, and the details beside a name |
| OK | `#197037` | `#7ccd8e` | The pass mark, in a run whose verdict is OK |
| Failing | `#b71824` | `#ff8e86` | The failing mark |
| Unknown | `#915200` | `#f7ac4d` | The warning-level, could-not-run, held, and caution marks |
| Accent | `#7246cf` | `#9d84ec` | A cursor or a next step, and nothing else |
| Rule | `#c9c3bb` | `#4a443b` | A horizontal rule |

Accent is narrow on purpose. A fix arrow points at the next step, so it takes Accent. The spinner
is neither a cursor nor a step, so it takes Muted. Help text is neither either, but it still paints
Title, Flag and Command in Accent today and loses that in a later pass.

The pass mark is green only when the whole run passed. Below a failure it is Muted, so no green
cell sits under the last failing row.

## Marks

Each state has one mark at each glyph tier. A frame uses one tier throughout and never mixes
the two. The glyphs are from `internal/style/marks.go`, and
`render-reference/measurements.txt` records each one's East Asian Width class.

| Mark | Unicode | ASCII | Meaning | Role |
| --- | --- | --- | --- | --- |
| Pass | `●` | `+` | Passed, done | OK in a run whose verdict is OK, Muted otherwise |
| Failing | `■` | `!` | Failing | Failing |
| FailingWarn | `□` | `*` | Failing at warning level | Unknown |
| CouldNotRun | `?` | `?` | Could not run | Unknown |
| Held | `◌` | `o` | Held: a failure the operator acknowledged | Unknown |
| NotStarted | `○` | `o` | Not started | Muted |
| Warning | `▲` | `^` | A warning before a commitment | Unknown |
| Fix | `→` | `>` | The fix, or the next step | Accent |
| Spinner | `⣾⣽⣻⢿⡿⣟⣯⣷` | `...`, not animated | Working, 120 ms a frame | Muted |

The same table carries three marks that are not states. Rule is `─` or `-`, the rune a horizontal
rule repeats. Sep is `·` or `-`, which separates two facts on one line. Ellipsis is `…` or `...`,
which marks text a wrap or a cut shortened.

Every single-character mark measures one cell under the narrow width table, and so does each
spinner frame taken by itself. A test in `internal/style/marks_test.go` checks this through the same width
function `render` uses. The ASCII ellipsis and spinner are three cells.

Two marks are still moving:

- NotStarted's ASCII mark is `o`, the same character as Held's. It becomes `.` in the installer
  round, since `internal/ui/newview` owns that mark today.
- A held row in `render` still draws the NotStarted mark, `○`, so no report changes in pass 1.
  Pass 2 switches it to Held.

The Held glyph was checked in Kitty, in JetBrains Mono and Adwaita Mono on a dark and a light
ground. It is drawn whole, one cell wide, in all four, so it stays `◌` and no fallback to `○`
applies.

## The grid

Columns count from zero. A frame keeps a two-cell margin, so the mark sits at column 2, a name at
column 4, and a value or detail at column 20. One blank line separates two blocks, and nothing is
drawn in a box. The block functions in `internal/style/blocks.go` place every row on these columns.

A name longer than 15 cells takes a line to itself, and its detail sits under it at column 4.
That is how `doctor` checks render, since their names are sentences of 40 cells and more. The
15-cell rule is for report rows. A table sizes its name column to its longest name, up to 32
cells.

Three widths bound a frame:

| Width | Rule | Where it is set |
| --- | --- | --- |
| 60 | Below this, a report drops to one column | `widthNarrow` in `internal/render/width.go` and `oneColumnBelow` in `internal/style/blocks.go` |
| 80 | A command composes at this width when the terminal reports none | `DefaultWidth`, `internal/style/width.go` |
| 120 | Content stops growing here, and a wider terminal keeps the rest empty | `widthCap`, `internal/style/width.go` |

Text is left-aligned at every width. A value longer than its cell wraps to a continuation line in a
report. In a table, the name column truncates with the Ellipsis mark, and the other columns
drop from the right when the table runs out of width. The name column always stays.

## Blocks

A command that prints and exits builds its frame from these nine blocks. Each block is one
exported function in `internal/style/blocks.go`. A test in `internal/style` reads the `Function`
column of the table below and fails when a name in it has no function in `blocks.go`, or the
reverse.

| Block | Function | Use it for |
| --- | --- | --- |
| Verdict line | `VerdictLine` | The run's verdict word, which closes a report |
| Title | `Title` | A section title: a bold lowercase noun such as `failing`, `could not run`, or `held` |
| Mark row | `MarkRow` | A mark at column 2, a name at column 4, and its detail at column 20 |
| Label row | `LabelRow` | A label at the margin and its value at column 20 |
| Continuation line | `ContinuationLine` | More of a row's value, starting at column 20 |
| Fix line | `FixLine` | A fix: the Fix mark, then the fix itself at column 20 |
| Table | `Table` | Rows of named things compared across columns, with the name column up to 32 cells |
| Progress line | `ProgressLine` | One line that shows a run is working: the spinner and what is under way |
| Error block | `ErrorBlock` | An error: the Failing mark, the message, and a fix line when the error carries a fix |

Section titles follow section 2.3 of `copy-standard.md`, which also says when a section takes no
title at all.

The progress line is drawn on standard error, and only when standard output and standard error are
both terminals, `CI` is unset, and neither `--json` nor `--quiet` is set. It appears after about
200 ms and is erased when the report prints or the run is interrupted. Pass 1 builds the block as
one static line, and pass 2 animates it.

An error carries a fix only when its type holds a separate fix field. No message is parsed for one,
so an error with no fix shows no arrow. Off a terminal, an error prints the same bytes it always
has.

A full-screen command adds four more blocks: the stage rail, the panel, the cursor row, and the
key hint line. They stay in `internal/ui/newview` until the installer round. A command that prints
and exits never takes the alternate screen.

## Tiers

Each frame renders at one of three tiers. `Detect` in `internal/style/detect.go` picks the color
profile and the glyph tier for a stream.

| Tier | When | What changes |
| --- | --- | --- |
| Color | Standard output is a terminal and nothing turns color off | The roles paint in their colors |
| One ink | `NO_COLOR` is set and not empty, `--color never` is set, `TERM=dumb`, or standard output is not a terminal | No escape bytes at all, bold included |
| ASCII marks | Standard output is not a terminal, `TERM=dumb`, or a Windows console refuses virtual-terminal mode | Each mark takes its ASCII form |

`NO_COLOR` wins over `--color always`, per <https://no-color.org>. `--color always` otherwise
forces TrueColor. Color and the glyph tier are separate choices, so forcing color into a pipe
still gives the ASCII marks there.

These rulings are made and land in later passes:

- Pass 2 adds a locale check: a locale that is not UTF-8 takes the ASCII marks.
- Pass 3 adds `CAIRN_PLAIN=1`. On a terminal it selects the plain output a pipe gets and turns off
  the progress line, for a reader such as a screen reader that needs a linear form. The standard
  and `cairn --help` both document it.
- Pass 3 makes body text use the terminal's foreground color, which is readable on any
  ground. It reads `COLORFGBG` and a new `CAIRN_THEME` variable to choose the light or dark
  palette, and makes help follow `--theme` instead of asking the terminal.
