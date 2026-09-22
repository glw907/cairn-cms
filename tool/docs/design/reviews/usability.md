# Adversarial design review — USABILITY lens

Read: all 27 PNGs, plus re-renders at 60/72/80/120/200 columns.

## Defects common to all three (fix these first)

1. **"Worst first" is a false claim. BLOCKS task 3.** `board-3-dark-100-truecolor.png`: the
   worklist is headed "do these, worst first" and lists `topo.907.life · serving` (connection
   refused — the site is DOWN) **last**, behind two engine bumps. It is registry order grouped by
   site, not severity order. `ledger-3` offers no ordering at all (its single-site "do this next"
   block disappears in the multi-site view). Fix: rank by a real severity key (unreachable >
   publish broken > email/errors > version drift), and if you cannot rank, do not say "worst".
2. **Four words for two states.** Header: `degraded`. Ledger rows: `unknown`. Brief/board rows:
   `could not run`. Evidence: `cred-missing`. Ack row: `ack` while the header counts
   `1 acknowledged`. A first-time reader (walkthrough 7, 8) cannot tell whether `unknown`,
   `degraded` and `cred-missing` are three problems or one. Pick one phrase per state and use it
   in header, row, and footer. `cred-missing` and `tiers resolved` are engine jargon; say
   "no Cloudflare token".
3. **The remedy pointer is unreachable and is the first thing cut.** `is-it-working#upgrade-the-engine`
   names no command, no URL, no file. `no remedy page yet` is internal bookkeeping shown to the
   operator. Both truncate first at every width: `brief-3` (`#onboard-the-sending-dom…`),
   `board-3` (all six worklist rows), `board-2-dark-80` drops the suffix **with no ellipsis** —
   silent information loss. Fix: print a runnable command or a full URL, drop "no remedy page yet",
   and never truncate the remedy — wrap it.
4. **An acknowledged failure is the quietest thing on screen.** `◌` dim gray, lowest contrast in
   every frame; in `ledger-2-light-100-truecolor.png` it is near-invisible, and in
   `brief-2-dark-100-ansi16.png` the ACKNOWLEDGED gutter renders blue, reading as informational.
   At strip density (`board-2`) `◌` is easily read as `●`. Walkthrough 9 fails: it can be
   mistaken for health and it will be forgotten — no who acked it, when, or why, and no escalation
   as `Sep 25` approaches. Fix: give ack its own non-green, non-gray treatment, show
   `acked by <who>, <n> days left`, and escalate inside 48h.
5. **Missing metadata the unattended reader needs (walkthrough 4).** No run duration, no exit
   code, no "changed since last run", no timezone on `14:14:00` log times and no date at all
   (`ledger-5`, `brief-5`, `board-5`). `checked 2026-09-20 14:32Z` in the header while rows say
   `9d ago` (`ledger-4`, `board-4`, `brief-4`) is a direct contradiction — is the data live or
   cached? Fix: state the sweep start, wall duration, and per-row data age with one clock;
   print the exit code line in non-TTY mode.
6. **At >100 columns ledger and brief centre the whole block.** At 120 the output starts in
   column 46, at 200 in column 53. On a maximized terminal it floats away from the prompt; piped
   to a file or a mail body the padding is baked in. Board stays left-aligned; board is right.
7. **`?` carries two meanings.** "could not run" in health, log level "warn" in `brief-5`/`board-5`.
8. **Every non-OK site is CRITICAL.** `board-4`: `topo.907.life` (7 of 9 checks unrunnable,
   unreachable) and `xcathletes.org` (one version behind) both read CRITICAL. WARNING and UNKNOWN
   exist in the exit-code contract and never appear. A version bump paging someone at 2am trains
   them to ignore the tool.
9. **`creds ok — 1 of 2 tiers resolved` is green** while being the cause of the degraded notice
   (`ledger-2`). Green for a known-partial credential is a contradiction; make it the warn state.

## Ledger

- `ledger-3-dark-100-truecolor.png` (49 lines): **blocks task 3.** No ranking, registry order, the
  healthy site `ecxc.ski` occupies the top, and the bottom of the scroll is `topo`'s six
  `cred-missing` rows — no verdict at the prompt (walkthrough 11). Fix: fold healthy sites to one
  line at the **bottom**, sort unhealthy by severity, and repeat a one-line verdict at the foot.
- `ledger-2`: the `ok/failing/unknown` word column repeats the glyph's meaning on every row —
  9 lines of it in `ledger-1`. Keep the word (it is what survives a paste and a mono-less mail
  client), drop the glyph, or vice versa; not both. *Irritates.*
- `ledger-4`: `2▲ 2?` with **no legend anywhere in the direction**. *Slows.* Add a legend, or
  write `2 failing, 2 unknown`.
- `ledger-5`: truncates exactly the field that matters — `reason=branch is behind m…`,
  `reaso…`. *Blocks* the debugging task. Wrap the last field; never clip a `reason`.
- Works: the fixed four-column shape, the word-per-row status, the `-- checks --` inset rule, and
  the nocolor-ascii frame — the best cron-mail render in the whole set.

## Brief

- `brief-3-dark-100-truecolor.png`: the last line of a 46-line, four-sites-critical scroll is
  **`● all clear  ecxc.ski · cairn.pub`** in green. At the prompt after a scroll, that is the one
  line the operator sees. The single most dangerous frame in the set. *Blocks* walkthrough 11.
  `brief-2` has the same shape (`● 4 healthy` last). Fix: healthy summary moves above the
  unhealthy blocks; the last line is always the verdict.
- `brief-3` abandons its own premise: inside a site block, ack and unknown rows print **before**
  the failing rows, so the actionable item is buried mid-block. The FIX THIS grouping that makes
  `brief-2` the best answer to walkthrough 2 exists only in single-site.
- `brief-2-dark-100-nocolor-ascii.png`: grouping lives only in the headings, and the `|` gutter is
  identical for all three groups — pure noise, and it shreds in a proportional font. A single
  pasted row (`! deploy  build failed…`) loses its group and therefore its status word.
- `brief-5`: 7 log records = 35 lines. A real log read is hundreds. Not viable for walkthrough 5's
  `cairn logs`. *Blocks.*
- `edge.https-not-forced` is a bare identifier with no verb (`brief-2`). *Slows.*
- Works: FIX THIS / COULD NOT RUN / ACKNOWLEDGED spelled out in words is the clearest answer to
  "what do I do first" and to "is an Unknown my problem"; the remedy as the next line of the same
  block; `brief-4`'s NEEDS ATTENTION / HEALTHY split.

## Board

- `board-2-dark-100-truecolor.png`: **three truncated copies of the same remedy on one screen** —
  in the strip's trailing cell, and in the detail row, which also truncates the evidence
  (`main is 2 …` *and* `push the build, p…`, two cuts in one row). At 120 and even 200 columns the
  same row still truncates, because the two-column split is fixed. *Blocks* task 2 at every width.
  Note the inversion: `board-2-dark-80-truecolor.png` is **better** than the 100-col frame,
  because below 86 the remedy takes its own line. Adopt the narrow layout everywhere.
- The stacked two-letter header (`c s d h e d p e e / r v l t m p b n r`) is unreadable cold
  (walkthrough 7): you must read downward across a 2-cell gap, and the legend sits three lines
  below the data. Colorblind readers (walkthrough 6) are served by the distinct glyph shapes —
  keep those — but `◌` vs `●` is a shape difference too small at strip density.
- `board-2-dark-100-nocolor-ascii.png`: `+ + + o ? ! + ! ?` in a cron mail, proportional font,
  with a vertical header. Unmappable. *Blocks* walkthrough 4.
- `board-1`: strip + full detail + 3-line legend for **one** site; the strip adds nothing and the
  legend is 3 of 23 lines. *Irritates.*
- `board-4`: `adopted` is undefined jargon; `2▲ 2?` again unexplained in the row but legended
  below. Truncation marker `~` in ASCII can be read as data.
- Works: `board-3` answers walkthrough 3 in six lines with a stable row order — the only frame
  that does; the collected worklist (if it were actually ordered); the left-aligned layout at all
  widths; the per-frame legend.

## Verdict per use

- **One site by hand:** brief. `brief-2` is the only frame where the answer to "what do I do
  first" is the first thing on screen.
- **Many sites at a glance:** board `board-3` strip + worklist. Nothing else answers it in one
  screen.
- **Unattended scheduler output:** ledger, nocolor-ascii. It is the only one that keeps a status
  **word** on every row, needs no legend, and survives a proportional font.

**One design can serve all three, but not one layout.** The shared layer is the header, the
vocabulary, the severity ranking, and the remedy format; the body should switch on scope and on
TTY: single-site → brief blocks; multi-site → board strip; non-TTY → ledger rows. That is one
design system with three bodies, not three products. Do not ship a single compromise layout: the
board's strip is worthless for one site and the brief's blocks are worthless for twelve.

## The five changes that matter most

1. Make "worst first" true: one severity ranking, applied to the worklist, to site order, and to
   the site verdict (introduce WARNING so a version bump is not CRITICAL).
2. Never truncate a remedy or a `reason`; wrap them. Make the remedy a command or a full URL and
   delete `no remedy page yet`.
3. One word per state, everywhere: `could not run` (not unknown/degraded/cred-missing),
   `acknowledged` (not ack), and say plainly whether an Unknown is the operator's problem.
4. Put the verdict on the **last** line, never a green `all clear` at the foot of a failing run;
   and give an acknowledged failure a visible, expiring, attributed treatment.
5. Left-align at all widths, adopt board's narrow (sub-86) detail layout everywhere, and add the
   missing run metadata: duration, exit code, data age on one clock, log dates and timezone.
