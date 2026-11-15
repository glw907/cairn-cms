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

One mark is still moving: NotStarted's ASCII mark is `o`, the same character as Held's. It becomes
`.` in the installer round, since `internal/ui/newview` owns that mark today. A held row in
`render` draws the Held mark.

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
both terminals, `CI` is unset, and none of `--json`, `--quiet`, and `--verbose` is set. It appears after about
200 ms and is erased when the report prints or the run is interrupted. Pass 1 builds the block as
one static line, and pass 2 animates it. Each frame sends the line erase `ESC[2K` even under
`NO_COLOR`, because the erase is cursor control and not styling, and the line is off under
`TERM=dumb`, where that erase would print as literal text.

An error carries a fix only when its type holds a separate fix field. No message is parsed for one,
so an error with no fix shows no arrow. Off a terminal, an error prints the same bytes it always
has.

A full-screen command adds four more blocks: the stage rail, the panel, the cursor row, and the
key hint line. They stay in `internal/ui/newview` until the installer round. A command that prints
and exits never takes the alternate screen.

## Grading checklist

A grader scores a screenshot of a report command against these rows, from the PNG alone. Each
row is a pass or a fail, and a frame passes only when every row passes. Count cells from the
left edge, starting at zero, with one character to a cell. Each row quotes the rule it checks,
from this page or from the layout grid (`cairn-setup/research/layout-grid.md` in the initiatives
record).

| Row | Pass when | Fail when | Source |
| --- | --- | --- | --- |
| Margin | Every line that holds ink starts at cell 2 or later, and every state mark sits at exactly cell 2. A Fix arrow sits two cells before its fix text, so at cell 2 or cell 18. Cells 0 and 1 are blank on every line. | Any ink sits in cell 0 or 1, a state mark starts anywhere but cell 2, or a Fix arrow sits anywhere but two cells before its fix text. | "A frame keeps a two-cell margin, so the mark sits at column 2" (The grid). "Margin: all content starts at column 2." (layout grid, Horizontal) |
| Mark column | Each mark is one cell wide, is followed by exactly one space, and the row's name starts at cell 4. A Fix arrow's text starts at cell 4 or cell 20. No row carries both a mark and a state word such as `PASS`, `FAIL`, or `SKIP`, and every mark in the frame comes from one glyph tier. | A mark spans two cells, two spaces follow a mark, a name starts at any cell but 4, a row shows a mark beside a state word, or Unicode and ASCII marks appear in one frame. | "A mark list ... puts a one-cell mark at column 2, one space, text at 4." (layout grid, Horizontal). "Every mark is one cell wide and is followed by exactly one space." (layout grid, Glyphs). "A frame uses one tier throughout and never mixes the two." (Marks) |
| Title weight | Each section title is bold, lowercase, starts at cell 2, and carries no mark. No rule runs beside or under a title, and no title has a filled background. Two blank lines never sit together. | A title is regular weight, carries a capital letter or a mark, has a rule or a coloured fill, or two blank lines sit anywhere in the frame. | "A section title: a bold lowercase noun" (Blocks). "Title is a section title: bold, lowercased, at the margin, with no rule beside it." (`internal/style/blocks.go`). "One blank line, then the title. Titles carry no mark." and "there is never more than one blank line" (layout grid, Vertical). "nothing is drawn in a box" (The grid) |
| Colour use | No green (OK) cell appears below the first failing row. Every coloured mark also has a mark shape and a word that say the same thing, so the frame reads the same in grey. Accent appears only on a fix arrow or a next step. | A green pass mark sits under a failing row, a state is told by colour alone, or Accent paints anything other than a fix or a next step. | "The pass mark is green only when the whole run passed. Below a failure it is Muted, so no green cell sits under the last failing row." (Roles). "Color never carries meaning alone." (Roles). "A cursor or a next step, and nothing else" (Roles, Accent) |
| Density | At 80 columns, a name of 15 cells or fewer has its detail on the same line, starting at cell 20; a longer name takes a line to itself with its detail under it at cell 4. At 59 columns the frame is one column: every detail sits under its name at cell 4. A wrapped detail continues at the column its first line started on. | At 80 columns a short name's detail starts at any cell but 20, or a long name shares its line with its detail. At 59 columns any detail sits beside its name. A detail ends in an ellipsis or runs off the right edge. | "a name at column 4, and a value or detail at column 20" and "A name longer than 15 cells takes a line to itself, and its detail sits under it at column 4." (The grid). "Below this, a report drops to one column" (The grid, width 60). "The detail wraps on its column and is never truncated." (`internal/style/blocks.go`, `MarkRow`) |

The checklist grades the report frames: `health` for one site and for every site, `doctor`,
`logs`, and the status block of `sites`. It does not grade the `sites` listing table, whose name
column follows the table rule in The grid instead.

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

## Plain mode and the ground

`CAIRN_PLAIN=1` makes every styled path except `cairn new`'s terminal view treat standard output and standard error as not terminals.
A run prints the bytes a pipe receives, with the progress line off and help as plain cobra output.
Only the exact value `1` counts. A screen reader needs this linear form, and `cairn --help` names the
variable in one sentence.

The ground, dark or light, is the first of these that names one:

1. The `--theme` flag. An explicit `--theme dark` counts, so it beats `CAIRN_THEME=light`.
2. `CAIRN_THEME`, when its value is `dark` or `light`.
3. `COLORFGBG`, read for its last semicolon field: `7` or `15` is light and any other number is dark.
4. Dark.

`CAIRN_THEME` and `COLORFGBG` apply at a terminal only. A run that paints a pipe, as `--color always`
does, takes `--theme` or else dark.

A variable cairn cannot read is ignored and the next source decides, never an error. An unknown
`--theme` value keeps its error. cairn never queries the terminal for its background, since a
terminal that does not answer would leave the run waiting.

Body text is the terminal's own foreground. The Text role emits no color code at any profile, so
body text reads on any ground and the ground choice moves only the roles that paint.

These rulings are made and land in later passes:

- Pass 2 adds a locale check: a locale that is not UTF-8 takes the ASCII marks.
