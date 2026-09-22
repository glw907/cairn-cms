ADVERSARIAL REVIEW — LENS: CLI BEAUTY. All 27 PNGs read.

## 1. Defects per direction

### LEDGER
1. **FATAL — the verdict column is dead weight and it breaks the grid.** `ledger-2-dark-100-truecolor.png`, rows 1–9: every row carries both a colored glyph (●/▲/?/◌) AND a colored word (`ok`/`failing`/`unknown`/`ack`) that say the same thing, then a detail column. Nine rows × redundant `ok` is visual noise, and because the words differ in length the detail column silently collapses on the `unknown` rows: `? email  unknown cred-missing` starts detail at col 30 while `● creds  ok  1 of 2 tiers` starts it at col 33. Three columns pretending to be four. **Fix:** drop the word column entirely; glyph + name + detail, detail hard-set at col 25. Keep the word only on non-ok rows, right-aligned in its own 8-cell field.
2. **SERIOUS — zero gutter after the longest label.** Same PNG, `publish-path ok` — one space. Every other row has 4–5. **Fix:** name field = max(len)+3 = 15 cells.
3. **SERIOUS — the sparkline is a debug print.** `ledger-3`, aksailingclub `errors  7 in 24h ▁▂▃▄▅▆▇█` renders as an orange stair-step blob sitting on the descender line, mid-sentence, with no axis, scale or label. It is the only chart in 27 frames. **Fix:** delete it, or move it to the right margin at `RoleMuted` #a8a49e, never `RoleUnknown` #f7ac4d.
4. **SERIOUS — 80 cols is not a design.** `ledger-2-dark-80` is byte-identical content to the 100-col frame. Nothing reflowed, nothing dropped. The direction has no narrow behaviour at all.
5. **POLISH — `ack` is the only abbreviated verdict** among `ok/unknown/failing`. Spell it `held` or `waived`.
6. **POLISH — ◌ (U+25CC) is a hairline.** `ledger-2-light`: it vanishes at #615d57 on #f0efec. Optically it is 1/4 the ink of ●. Use ○ (U+25CB) or ◉.

### BRIEF
1. **FATAL — `FIX THIS` / `COULD NOT RUN` / `EVERY CHECK PASSES` in caps.** `brief-1`, `brief-2`, `brief-4` headings. Shouting imperatives is the dashboard cliché this lens exists to kill; nothing in gh, delta, hyperfine or rg ever shouts at you (from memory). It also forces `ACKNOWLEDGED` — a 12-letter all-caps block — to be the visually loudest word on a screen about a *deprioritised* item. **Fix:** lowercase inset labels on a rule, ledger-style: `── to fix ────`, `── could not run ──`, `── acknowledged ──`.
2. **FATAL — uppercased domains.** `brief-3`: `907.LIFE`, `AKSAILINGCLUB.ORG`, `TOPO.907.LIFE`. Domain names are lowercase by convention and by shape; uppercasing destroys the ascender/descender silhouette that makes `aksailingclub.org` scannable. **Fix:** lowercase, bold `RoleFg` #eae7e3.
3. **SERIOUS — the gutter is a full-saturation bar.** `brief-2`, x≈90px: `▌` at #ff8e86 / #f7ac4d runs 8–10 rows tall. That is more saturated ink than the failing glyphs it frames, so the eye lands on decoration. Charm's own tools use a *dim* border for this (from memory). **Fix:** gutter at 45% toward ground — #8d4f4b dark / #d9a9a5 light — and reserve full #ff8e86 for the ▲ and the verdict word.
4. **SERIOUS — blank row inside each group.** `brief-2`: a full empty line between the heading and the first item, and between `deploy` and `engine`. Scenario 2 spends 27 rows on 9 checks. Density is worse than ledger's while carrying less.
5. **POLISH — `brief-4`'s two-line-per-site form** (`907.life …` then `engine 0.71.0`) makes a 6-row list into 12 and puts the version on an unaligned orphan line.

### BOARD
1. **FATAL — the failing glyph is optically weaker than the ok glyph.** `board-3`, the strip: ▲ (U+25B2) has roughly 60% the ink area of ● at the same cell, so a row of nine greens out-shouts two reds. The whole frame reads *green*; four CRITICAL sites do not. This inverts the tool's entire purpose. **Fix:** ● for ok at #5f8a68 (desaturated, receding) and ■ (U+25A0) or ▮ at full #ff8e86 for failing. Saturation belongs only on the failures.
2. **FATAL — the stacked two-letter header is a spreadsheet cliché and unreadable.** `board-1`/`board-2`/`board-3`, rows `c s d h e d p e e` / `r v l t m p b n r`. Three of nine start with `e`. It then needs a 2-line legend spelling all nine names out — 4 legend lines under a 6-line payload in `board-3`, 3 lines under a *1-row* table in `board-2`. **Fix:** kill the stacked header; label the strip once with a single dim line `creds serving delegation https email deploy publish engine errors` compressed to the cell pitch, or accept a wider 3-char header.
3. **SERIOUS — `board-1` and `board-2` show a table header for one data row,** then repeat the same nine states as a labelled list immediately below. The strip is pure duplication at n=1.
4. **SERIOUS — the remedy is printed twice.** `board-3`: `deploy: read the build log, fix the build, push a…` in the row *and* `907.life · deploy  read the build log, fix the build, push again` in the worklist. Once truncated, once whole.
5. **SERIOUS — `board-4`: `0.71.0▲` with no space**, glyph welded to the digit; and `2▲ 2?` is a private notation the legend below only half explains.
6. **POLISH — `board-1`'s legend under a healthy site** is 4 lines of explanation for a screen whose answer is "fine".

## 2. Common to all three
- **ASCII truncation mark is `~`.** `board-2-nocolor-ascii`: `push a~`, `main is 2 ~`. A trailing tilde reads as vi filler, not elision. It also collides with `Running: "~"` in the same GlyphSet (`palette.go:135,142`). Use `...`.
- **Light mode loses the green.** `board-2-light`, `ledger-2-light`: `RoleOK` #197037 on #f0efec is near-black at 8px stroke; the ok state stops being *a colour* and becomes ink. Lift to ~#1f7d3e and desaturate the ground to #f4f2ef, or switch ok to a hue-shifted #2f7d5a.
- **The header block is three different things.** `OK  ecxc.ski  9 ok` (ledger/board) vs `ecxc.ski   OK   9 ok` (brief, with an arbitrary 20-cell pad) vs `6 sites  4▲ critical`. Pick one: verdict-first, bold site, muted counts.
- **Nobody owns the rule.** Ledger uses an inset labelled rule `── checks ───`; board uses one bare full-width #4a443b rule above the legend; brief uses none. Same program.
- **`·` middot separator does double duty** as both a field separator and a sentence separator on the same line (`read the build log, fix the build, push again · no remedy page yet`). Use `·` for fields, `  ` (2 spaces) for the trailing parenthetical.
- **Mixed baselines in one row:** ● sits at x-height centre, ▲ sits on the baseline, `?` has a descender-less cap. Visible in every strip and every gutter. Pick glyphs that share an optical centre.
- **`checked 2026-09-20 14:32Z · cf:keyring · gh:keyring expires 2027-01-01`** is a debug line: an absolute UTC stamp, two keyring names and an unrelated expiry crammed into one row, second position, at full muted weight. `4m ago` appears elsewhere in the same tool.

## 3. What is excellent and must survive
- The **Warm Stone ground** (#17150f dark / #f0efec light) with #eae7e3 ink. Warm, low-glare, unmistakably not a default terminal theme. Better ground than gh or lazygit run on.
- The **inset labelled rule** `── checks ──────` (ledger). This is the single most elegant device in the set — bat and delta use exactly this idiom (from memory) and it beats any box.
- The **named ANSI-16 slot per role** rather than a nearest-match downsample (`palette.go:54`). `ledger-2-ansi16` still distinguishes failing from unknown. Most tools fail this.
- **`→` remedy lines at #9d84ec**, indented under the row they repair. The purple is the one non-status hue and it earns its place: it is the only colour that means *action*.
- **`4 other checks ok` / `4 healthy  creds · serving · delegation`** — folding the boring into one line is right, and the muted treatment is right.

## 4. Verdict
**Ledger's chassis + Brief's grouping, rendered with Board's one-line-per-site strip reserved for `cairn status` across sites.** Board loses as a primary: its cell glyph carries no word, it needs a 4-line legend, and its ▲/● weight inversion is structural. Brief loses as a primary: caps headings and uppercase domains are a whole register I would have to undo. Ledger has the highest ceiling because its rule, its fixed row order and its remedy indent are already right; it only has a redundant column and no ranking.

Five changes, most lift first:
1. **Delete ledger's verdict-word column**; glyph + 15-cell name + detail at a hard column. Recovers ~10 cells and fixes the only alignment break.
2. **Rank the rows**: failing, then unknown, then acknowledged, then a single folded `5 others ok · creds · serving · …` line. Brief's insight without Brief's headings.
3. **Replace every all-caps heading with a lowercase inset rule** (`── to fix ──`, `── could not run ──`), and lowercase every domain.
4. **Re-weight the palette**: ok recedes to #5f8a68 dark / #2f7d5a light; #ff8e86 appears only on ▲, the CRITICAL word and nothing else; gutters, if kept, at 45% toward ground.
5. **Fix the glyph set**: ▲→■ for failing (equal ink to ●), ◌→○ for acknowledged, ASCII ellipsis `~`→`...`, and give every glyph a shared optical centre.

## 5. The render I would ship
A warm near-black #17150f field. Line one, left: `CRITICAL` at #ff8e86, two spaces, `907.life` bold #eae7e3, two spaces, `2 failing · 2 could not run · 1 held · 4 ok` at #a8a49e. Line two, muted: `checked 4m ago` and nothing else; the keyring and expiry detail move to `cairn doctor`. One blank. Then `── to fix ─────────────────────────────` — the label inset two cells, the rule at #4a443b running to the right edge — and under it two rows only: `■ deploy` at 15 cells, detail at #c1bdb8 from column 25, and beneath each, indented four, `→ read the build log, fix the build, push again` with `→` at #9d84ec and a trailing `  (no remedy page yet)` at #a8a49e. Blank. `── could not run ──` with two rows, `○` at #f7ac4d. Blank. `── held ──` with one dimmed row. Blank. A final muted line: `● 4 ok  creds · serving · delegation · publish-path`. No caps, no gutters, no legend, no sparkline, nineteen lines, and the only saturated ink on the screen is the two red squares and the two purple arrows — which is exactly the four things you are meant to look at.
