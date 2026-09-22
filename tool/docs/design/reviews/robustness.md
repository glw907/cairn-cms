# B2 mockups — adversarial review, lens: degradation and robustness

Method: copied to `/tmp/b2copy`, added a `-hostile <kind>` flag, measured every line's display
width in Python independently of `ansi.StringWidth`, swept 11 widths x 3 directions x 5 scenarios,
read the ASCII and ANSI-16 PNGs.

## Severity 1: corrupts meaning or is exploitable

**1. Terminal injection. No dynamic string is sanitized.** `Detail`, `Remedy`, `Site`, and log
`Field.Value` print raw.

```
./cairnmock -direction ledger -scenario 2 -width 100 -hostile newline -profile none | sed -n '12,13p'
▲ deploy       failing  build failed
CRITICAL 907.life  0 failing · 9 ok          <- forged verdict, injected from a Detail
```
`-hostile ansi` survives at truecolor: `ESC[2J ESC[H ESC[42;30m OK: everything is fine` clears the
screen and repaints a green OK. `-hostile cr` repaints the line from column 0. `-hostile osc`
retitles the window and hyperlinks text to `evil.example`. `-hostile tab` shifts every downstream
column. These strings come from HTTP bodies, build logs, and GitHub errors. `-profile none` strips
CSI/OSC but not `\n`, `\r`, `\t`, so the forged verdict survives into cron mail.
**Rule:** sanitize at the seam: strip C0/C1, expand `\t`, never let data create a line.

**2. Panic on zero reports.** `dir_ledger.go:82` (`in.Reports[0]`), same in brief and board.
`./cairnmock -direction ledger -scenario 2 -hostile zerosites -width 80` -> `panic: index out of
range [0] with length 0`. **Rule:** zero sites is a rendered state.

**3. A site with zero checks renders a false green.** `-hostile zerochecks` gives
`907.life  OK  0 ok` and `▌ EVERY CHECK PASSES`, beside the degraded notice. `Report.Verdict()`
folds an empty slice to OK. **Rule:** no checks is UNKNOWN.

**4. An expired acknowledgement still suppresses the verdict.** `-hostile ackpast` (expiry 40 days
past) prints `◌ https  HSTS off at the edge · acknowledged until Aug 11`, verdict unchanged, no
year, no past tense. **Rule:** compare `AckExpires` to the render clock.

**5. Every Unicode glyph but one is East Asian Ambiguous.** `● ▲ ▌ ─ ├ └ → · … ▁-█` are all EAW=A;
`◌` U+25CC is EAW=N and `?` is ASCII. With Ambiguous=wide (CJK locale, iTerm2/tmux/Windows
Terminal option) the board's verdict column lands per row at 48, 45, or 42 cells depending on how
many `?`/`◌` the row holds — the grid shears. Every rule doubles to 200 cells at width 100 and
wraps, in all three directions. `width_test.go` tests only the default narrow table, so it cannot
see this. **Rule:** pin an explicit Ambiguous=narrow table, and test both.

**6. ANSI-16 ignores `-light`.** `palette.go:85` has no dark/light branch; the two renders are
byte-identical. `RoleFg`=7 is illegible on a light terminal. `RoleMuted`/`RoleAck`/`RoleBorder`=8
is base03 on Solarized Dark, i.e. the background: the credential line, the legend, the
abbreviation key and every acknowledged row vanish. **Rule:** branch on background; never put
meaning in slot 8.

**7. Hardcoded `Z`.** `layout.go:95` uses `Format("2006-01-02 15:04Z")`. A bare `Z` is a literal,
so a local-time `UpdatedAt` prints `14:32Z` and claims UTC (verified with `FixedZone("AKDT",-8h)`).
**Rule:** `Z07:00`.

## Severity 2: ugly, loses information

**8. 196 lines overflow the requested width** (`python3 /tmp/b2copy/measure.py`, widths
20/40/60/72/79/80/81/100/120/200/400). Ledger scenario 4 overflows at 60, 40 and 20 — the sites
table is a fixed 68 columns with no fallback. Board scenario 4 overflows at **72**, so it breaks
on 80 columns minus a quote prefix. Ledger rows have a 24-cell floor (`pad(ID,13)+pad(word,9)`).
The degraded notice (`layout.go:109`) is never clipped: 60 cells at any width. **Board's header is
never clipped at all** (`dir_board.go:163`): `-hostile longdomain -width 80` yields a 126-cell
line; punycode 111, IDN 97. **Rule:** a declared minimum width (60) with a single-column fallback
below it, and clip every line last, headers and notices included.

**9. ZWJ emoji overflow.** `-hostile emoji -width 100` yields 108 cells: a family sequence
measures 2 and renders 8.

**10. Wide rungs.** Ledger and brief cap at 110/96 and centre (`place`). Board does not: its rules
run the full 400 columns around 60 columns of content.

**11. Truncation eats the remedy's object; the ASCII ellipsis is ambiguous.** At width 20:
`→ bump the d…`. In ASCII the ellipsis is `~`, so `push a~` reads as literal text
(`board-2-dark-100-nocolor-ascii.png`). **Rule:** reserve verb plus object, and use `...` in ASCII.

**12. Hardcoded counts and names.** `"7 entries"` (`dir_ledger.go:235`, `dir_brief.go:281`),
`"ecxc.ski logs"` and `"14:14 to 14:28"` (`dir_board.go:321,325`). Mockup-only, but must not
survive.

## Severity 3: cosmetic and reader-facing

**13. Non-terminal readers.** Stripped of escapes in a proportional cron-mail font, or with a CI
timestamp per line, every aligned surface collapses: the ledger's four columns, the board's strip,
and above all the board's stacked two-letter header (`c s d h e d p e e` / `r v l t m p b n r`),
which is meaningless off a monospace grid and which a screen reader announces as fourteen letters.
Nine glyphs read as "black circle black circle dotted circle question mark black up-pointing
triangle", with no check names and no states. **Rule:** the non-TTY render is plain text, one fact
per line, `name: state — detail`, no stacked header, no box drawing.

**14. For the record.** No faint (`ESC[2m`) anywhere; bold is the only attribute, correctly. No
panic at width 0, 1, or negative. Output is byte-identical across runs and under `TERM`, `LANG`,
`TZ`, `NO_COLOR` (`boardStrip` builds a map but iterates the ordered `checkCols`). Every state word
survives `-profile none` in all three directions. `NO_COLOR=1` does not change output only because
the mockup forces the writer profile; the detection path is untested here.

## Verdict

**Most graceful: brief.** A left gutter plus flowed lines has almost no column budget to break. It
caps at 96, centres, overflowed 14 lines in the whole sweep (all at 20 or 40), and is the only
direction that reads correctly in a proportional font and to a screen reader, because each fact is
a sentence rather than a cell.

**Most fragile: board.** Its premise is a fixed grid and the grid is what breaks: it shears under
Ambiguous=wide, floors at ~50 cells with no fallback, breaks its sites table at 72 columns, never
clips its header, never caps at wide rungs, and carries the least accessible artifact in the set.
Its information is concentrated in glyphs, which is exactly what cron mail, CI logs and screen
readers discard. Ledger sits between: solid at 80+, worst of the three narrow because of its
fixed-column sites table.

## Acceptance tests Task 20 should carry

1. No line exceeds the requested width at 20, 40, 60, 72, 79, 80, 81, 100, 120, 200, 400 (today's
   test starts at 80).
2. The same assertion under an Ambiguous=wide table, and glyph parity proved under both.
3. A control-character corpus (`\n`, `\r`, `\t`, `ESC[2J`, `ESC[31m`, OSC 0, OSC 8, a lone `ESC`,
   invalid UTF-8) in every dynamic field: line count unchanged, no C0/C1 byte in the output.
4. Degenerate inputs render and never panic: zero sites, zero checks, empty Detail, empty Remedy,
   a 300-character remedy, a 60-character domain, an IDN, punycode, CJK, a ZWJ emoji, counts of 0
   and 100000, 50 sites, a 2 KB log field.
5. An expired acknowledgement does not suppress a failing verdict, asserted on the verdict.
6. A minimum supported width with a named fallback, asserted at 20 and 40, verb and object intact.
7. Every state word present at `-profile none`, and every role's ANSI-16 slot distinct from the
   background slot in both branches.
8. A golden plain-text non-TTY render: no box drawing, no stacked header, no line whose meaning
   depends on a column position.
9. Byte-identical output across two runs and across `TZ`/`LANG`/`LC_CTYPE`/`TERM`/`NO_COLOR`, plus
   `NO_COLOR` alone forcing the no-color profile.
10. Timestamps carry a real zone offset, asserted with a non-UTC location.
