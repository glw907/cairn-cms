# cairn CLI render, iteration 2 brief (conductor's consolidation, 2026-09-20)

Five adversarial reviews of iteration 1 (`mockups/`) are in `reviews/`: `beauty.md`,
`charm-stack.md`, `usability.md`, `family.md`, `robustness.md` (repro harness in
`reviews/robustness-harness/`). Read all five in full. This brief settles where they conflict.
Where it is silent, the reviews' own fixes stand.

## The shape: one design system, three bodies

Shared layer (identical everywhere): the header block, the vocabulary, the severity ranking, the
remedy format, the section grammar (the ledger's inset labelled rule), the palette and glyphs.
The body switches on scope and on whether output is a terminal:

- **One site** (`cairn health <site>`): rows grouped by what the operator must do, in this
  order: failing, could-not-run, acknowledged, then one folded line for everything passing.
  Section labels are lowercase inset rules. No all-caps headings, no stacked coloured rails.
  Draw TWO variants of the grouping so the owner can choose: (A) inset rules only, no rail;
  (B) inset rules plus one dim rail on the failing group alone.
- **Many sites** (`cairn health`, `cairn sites list`): draw TWO variants: (A) a status strip
  per site with REAL column labels (no two-letter cipher, no foot legend needed to read it) and
  a ranked remedy list beneath; (B) a plain ruleless table, one row per site (verdict, counts by
  state, engine version, data age), with the ranked remedy list beneath. One site never shows a
  strip. No remedy is printed twice.
- **Non-terminal** (piped, cron mail, CI log): plain text, one fact per line,
  `name: state - detail`, remedy on its own following line, no box drawing, no strip, no
  column-dependent meaning, verdict line first AND last. Must read correctly in a proportional
  font.

## Rulings on the conflicts

1. **Status words.** Verdict line: monitoring capitals `OK`, `WARNING`, `CRITICAL`, `UNKNOWN`.
   Per check: the family's existing doctor words `pass`, `fail`, `skip`, plus `held` for an
   acknowledged failure. Section labels: `failing`, `could not run`, `held`. The header counts
   use the same words. One word per state everywhere; `degraded`, `unknown`, `cred-missing`,
   `ack`, and `tiers resolved` never appear. A skip says why in plain English
   (`skip  no Cloudflare token`). `?` means skip and nothing else; log levels get no glyph.
2. **Severity is real.** Rank remedies and sites by: site unreachable or not serving, then
   publish path or deploy broken, then email or errors, then credentials expiring, then version
   drift. A site whose only problem is version drift or an expiring credential is `WARNING`, not
   `CRITICAL`. A site where nothing could run is `UNKNOWN`. Zero checks is `UNKNOWN`, never OK.
   "worst first" may only head a list that is actually ranked.
3. **Remedy format.** A remedy is never truncated; it wraps with a hanging indent. It is a
   command or a full URL where one exists (use `https://cairn.pub/docs/admin/is-it-working#<anchor>`
   as the URL shape, and make it an OSC 8 hyperlink at truecolor and ANSI-16 that degrades to
   the printed URL). Drop "no remedy page yet". Print the condition id, muted, on the failing
   row when the check has one (`edge.https-not-forced`).
4. **The last line.** Every run ends on the verdict line repeated, never on a green line. A
   failing run has no green anywhere below its last failure.
5. **Held (acknowledged) failures.** Visible, not the quietest thing on screen: its own glyph
   `○` (U+25CB), the word `held`, `until 2026-09-25 (5 days left)`, and inside 48 hours of
   expiry it renders in the skip/attention colour. An expired acknowledgement holds nothing:
   the check shows as failing with `hold expired 2026-08-11`.
6. **Palette.** Keep the exact admin ink tokens from `family.md`'s table. Re-weight per
   `beauty.md`: pass recedes (draw it muted green: try `#5f8a68` dark, `#2f7d5a` light, and
   check contrast is at least 4.5:1); full-saturation failing colour only on the fail glyph, the
   `fail` word, and the `CRITICAL` verdict; the accent only on the remedy arrow. Add the rule
   colour as its own named token. ANSI-16: named slot per role, with BOTH a dark and a light
   branch; muted text is the terminal's default foreground with no attribute (never slot 8,
   which is the background on Solarized, and never faint); only the rule may use slot 8.
7. **Glyphs.** pass `●`, fail `■` (equal ink to the dot), skip `?`, held `○`, remedy `→`.
   ASCII tier: `+`, `!`, `?`, `o`, `>`, and the ellipsis is `...`, never `~`. Every Unicode glyph
   chosen is checked for East Asian Width; state in the index which are Ambiguous, and make the
   layout survive Ambiguous=wide by never depending on a glyph's width for column position
   (pad after the glyph with a width-measured field) or by offering the ASCII tier. Rules made
   of `─` must not double; build them to measured width.
8. **Header block.** One form everywhere: verdict first, site bold, counts muted. Second line
   is `checked 4m ago (2026-09-20 14:32 UTC) in 3.2s`. Credential and keyring detail leave the
   header. Non-TTY output adds an `exit 2` style line. Timestamps carry a real zone; logs show a
   date and zone once per block.
9. **Dates.** ISO for instants, relative for recency, never `Sep 25`.
10. **Widths.** Left-aligned at every width, never centred. Named rungs: floor 40 (single-column
    fallback below 60), 60, 80, 100, 120, and a wide cap (content stops growing at 120; the
    rest is empty, not stretched rules). No line ever exceeds the requested width, at any width
    from 20 to 400.
11. **Hostile data.** Every dynamic string is sanitized at the render seam: C0 and C1 controls
    stripped, tabs expanded, newlines never create a line, escapes never reach the terminal.
    Zero sites, zero checks, empty detail, a 300-character remedy, a 60-character domain, an
    IDN, CJK, and a ZWJ emoji all render without panic and within width.
12. **Domains** are never case-folded. **No brand mark.** **No sparkline** in this round.
13. **Construction** (`charm-stack.md`): cells are `Style.Width(n).MaxWidth(n)` joined with
    `lipgloss.JoinHorizontal` under one row style, so a row can take a full-width background
    later; use `lipgloss/v2/table` with `StyleFunc` for the site tables and `tree` for log
    fields where they fit; colours through `lipgloss.LightDark` and `Complete`-style per-profile
    values with an ANSI-256 rung named; the frame is returned as `Header`, `Body`, `Footer`
    sections and joined for the CLI; named rung constants; the width test sweeps 20 to 400 and
    an Ambiguous=wide table. The check id `engine` stays as it is in this round.

## Deliverable

A new directory `~/.cache/cairn-tool-b2/mockups-2/` (copy iteration 1's program as the start;
never modify `mockups/`). Same capture method as iteration 1 (the kitty harness copy in
`mockups/`), same scenarios 1 to 5 plus: 6 a WARNING-only site (version drift), 7 twelve sites
with the unreachable one ranked first, 8 the non-terminal plain-text render of scenario 2 shown
in a proportional font (render it into the HTML as text in a sans-serif block, not a terminal
capture), 9 hostile data (long domain, CJK detail, injected newline and escape in a detail,
expired hold). Captures: dark 100 truecolor for every scenario and variant; scenario 2 also
light, 80 columns, 60 columns, ANSI-16 dark, ANSI-16 light, colour off with ASCII glyphs.
`index.html` leads with a side-by-side of iteration 1 and iteration 2 for scenario 2 and
scenario 3, then the variants (single-site A and B; many-sites A and B) with a two-sentence
statement of each tradeoff, then the rest. Run the robustness harness's measurements against
the new program and print the result in the index (lines over width, by width).
