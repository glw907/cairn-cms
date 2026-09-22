# Adversarial review — cairn family design adherence (B2 terminal mockups)

**Verdict: Ledger is the family member. Brief is cairn's substance with a dashboard's manners.
Board spends the family's restraint on a decoder ring.**

## (a) Token fidelity — the strongest part of this work

I converted every oklch token myself. `palette.go` is not an approximation: **seven of eight roles
are bit-exact.** Dark `Fg #eae7e3`=`base-content`, `Muted #a8a49e`=`--color-muted`, `Subtle
#c1bdb8`=`--color-subtle`, `OK #7ccd8e`=`positive-ink`, `Failing #ff8e86`=`cairn-error-ink`,
`Unknown #f7ac4d`=`cairn-warning-ink`, `Accent #9d84ec`=`primary`. Light matches exactly too. The
designer took the *ink* tokens, not the *fill* tokens — the distinction
`admin-design-system.md:208` says people get wrong. Sampled ground from the PNGs: dark `#201d19`
(base-100 is `#221f1a`) — **warm stone, not generic near-black**; light `#f0eeed`. All roles clear
4.5:1 on both grounds (dark: fg 13.3, muted 6.6, ok 8.6, failing 7.4, unknown 8.6, accent 5.4;
light: 15.1 / 6.3 / 6.0 / 6.4 / 6.0 / 5.8).

1. **[breaks] ANSI-16 turns Warm Stone blue.** `Muted`, `Ack`, and `Border` all map to slot 8,
   which renders blue-violet on the captured theme — see the `ACKNOWLEDGED` rail and
   `edge.https-not-forced` in `brief-2-dark-100-ansi16.png`, and the whole detail column in
   `ledger-2-dark-100-ansi16.png`. Slot 8 is the least predictable of the sixteen. Fix:
   muted/subtle/ack emit **no color plus SGR 2 (faint)**; keep slot 8 for the rule alone. The
   explicit-slot decision itself is right and must survive.
2. **[drifts] There is no `RoleGround`.** Correct POSIX behavior, but unstated. Add it as a
   documented *reference* ground (`#221f1a`/`#fdfbf9`) used only by the contrast test.
3. **[polish] `RoleBorder`/`RoleStale` are invented.** `#4a443b`/`#c9c3bb` match no token
   (base-300 dark is `#322d26`) and measure 1.71:1 / 1.69:1, under WCAG 1.4.11. Name them
   `--cairn-cli-rule` in the design system. `RoleStale` is an alias of `Unknown`; delete it.
4. **[polish] `index.html:--bg: #17150f`** is a fourth ground. Use `#0e0c08` / `#221f1a`.

## (b) Status language — three vocabularies where the family has one

5. **[breaks] The CLI invents a third vocabulary.** The engine already ships one: `cairn-doctor`
   prints **PASS/FAIL/SKIP/INFO**, severities **blocker**/**warning**, filed by **condition id**
   (`docs/admin/is-it-working.md:32-90`). Monitoring has a second: **OK/WARNING/CRITICAL/UNKNOWN**.
   The mockups use a third — `ok`/`failing`/`could not run`/`acknowledged` — while the *same line*
   says `OK`/`CRITICAL`. Fix: monitoring capitals for the **verdict** (a convention rightly
   overriding house case), the doctor's `pass`/`fail`/`skip` for the **per-check column**, plain
   English in the detail column. Then print condition ids, which the CLI omits while its remedy
   links already resolve `is-it-working#…` anchors.
6. **[breaks] `?` means two things.** Unknown everywhere; `warn` in the log views (`brief-5`,
   `ledger-5`, `board-5`). Give `warn` its own glyph or drop the glyph on log lines.
7. **[drifts] `ack` / `acknowledged` / `ACKNOWLEDGED`** in one product; and `ledger-2` headers say
   `2 unknown` where `brief-2`/`board-2` say `2 could not run`. One word per state.
8. **[polish] `●` and `◌` are near-identical at 11pt** in `board`'s matrix; the ASCII tier
   (`board-2-dark-100-nocolor-ascii.png`, `+ + + o ? ! + ! ?`) is unreadable without the legend.

## (c) Voice — every off string, with the rewrite

The voice is "professional, restrained, slightly academic", never cute or chatty
(`admin-design-system.md:56`). The admin's uppercase device is the **Eyebrow**, and it is
`text-muted` — quiet by definition (`:259`). Brief takes the eyebrow's shape and paints it in
full-intensity state color: the surface without the substance.

| where | string | rewrite |
|---|---|---|
| `brief-2` | `FIX THIS` | `Failing` |
| `brief-2` | `COULD NOT RUN` | `Could not run`, **muted** ink; the rail keeps the amber |
| `brief-1` | `EVERY CHECK PASSES` | `All checks pass` |
| `brief-4` | `NEEDS ATTENTION` / `HEALTHY` | `Failing` / `Passing` |
| `brief-4` | `6 sites in the registry` | `6 sites` ("registry" is cairn's npm word) |
| `brief-3` | `907.LIFE`, `AKSAILINGCLUB.ORG`, … | lowercase — **a domain is an identifier and must never be case-folded** |
| `brief-3` | `all clear` | `2 passing` |
| `brief-2` | `4 healthy` | `4 passing` |
| `board-3` | `do these, worst first` | `Remedies, worst first` |
| `ledger-2` | `do this next` | `Next` |
| all | `degraded: some checks could not run` | drop `degraded:` — a fourth word for a named state |
| `ledger-2`, `board-2` | `cred-missing` | `no Cloudflare token` (a leaked internal enum) |
| `brief-2` | `ACKNOWLEDGED`, muted | **keep** |
| all | `no remedy page yet` | **keep** — honest absence, in register |

The remedy sentences (`read the build log, fix the build, push again`; `bump the dependency range
and redeploy`) are the best prose in the set: plain, specific, imperative where one is owed.

## (d) The charter

9. **[breaks] `board`'s vertical two-letter headers** (`c s d h e d p e e` over `r v l t m p b n
   r`, `board-1/2/3`) are decodable only through a nine-item legend at the frame's foot. The
   charter's test is "does one job and gets out of the way"; this makes the reader learn a cipher
   before reading a status. Widen to real labels or keep `board-4`'s honest table instead.
10. **[drifts] `board` truncates by design**: `push a…`, `for the …`, `zone DNS …`. A remedy that
    does not fit was not delivered. Ledger and Brief both give it its own line.
11. **[drifts] `brief` stacks three colored rails.** Geoff's standing grade is "too many popping
    colors on one screen" (`:64`); `brief-2` has seven attention-demanding moments. Keep one rail.
12. **[polish] The sparkline** (`errors 7 in 24h ▁▂▃▄▅▆▇█`) is the one purely decorative element.

## (e) Cross-surface consistency

13. **[breaks] No condition ids**, though `brief-2` shows the right pattern once
    (`edge.https-not-forced`) on one row of nine.
14. **[drifts] "engine" means two things**: `ledger-4`'s installed version, and a check. Rename the
    check `engine-version`.
15. **[polish] Dates clash in one frame**: `2026-09-20 14:32Z`, `Sep 25`, `2026-09-25`. The admin
    has `formatCivilDate` (`:385`). ISO for instants, relative for recency; delete `Sep 25`.
16. **[keep] No brand mark.** The admin has a brand tile because it is a room you live in; a CLI is
    not. The deliberate absence is the family's restraint in a terminal.

## (f) Convention, and convention as excuse

Rightly overriding: capitals for the verdict, `?` for unknown, alignment over box-drawing, and the
ASCII glyphs being cell-width-identical — craft. Used as an excuse: `FIX THIS` / `NEEDS ATTENTION`
are dashboard mannerism, not monitoring convention (no monitoring tool shouts a sentence);
`board`'s cipher is htop's density without htop's reason; `cred-missing` is a leaked enum.

## What must survive

The token derivation and the rule that no direction writes a hex value. The explicit ANSI-16 slot
table and its stated reason. The no-color tier returning the zero style, so a color-only design
fails in the mockup. Every remedy sentence. `ledger-4`'s ruleless table — the admin's `ConceptList`
in a terminal. `brief-5`'s tree-indented log record. The warm dark ground.

## Recommended hybrid

**Ledger's frame** (inset-rule sections, fixed columns, muted detail ink, remedy indented beneath
its row) + **Brief's grouping by what the operator must do**, rendered as true muted eyebrows with
one colored rail on the failing group only + **`board-4`'s table** for multi-site, matrix and
legend discarded + **`brief-5`'s tree** for logs. Brief cannot be the base: its headline device is
the shout, and removing it removes the direction. Board cannot: its headline device is the cipher.

## Proposed CLI token table

| role | dark | light | ANSI-16 | derives from |
|---|---|---|---|---|
| ground (reference only) | `#221f1a` | `#fdfbf9` | default bg | `--color-base-100` |
| text | `#eae7e3` | `#28231d` | default fg | `--color-base-content` |
| muted | `#a8a49e` | `#615d57` | default + SGR 2 | `--color-muted` |
| subtle | `#c1bdb8` | `#504c47` | 7 | `--color-subtle` |
| ok | `#7ccd8e` | `#197037` | 2 | `--color-positive-ink` |
| failing | `#ff8e86` | `#b71824` | 1 | `--cairn-error-ink` |
| unknown | `#f7ac4d` | `#915200` | 3 | `--cairn-warning-ink` |
| accent | `#9d84ec` | `#7246cf` | 5 | `--color-primary` |
| rule | `#4a443b` | `#c9c3bb` | 8 | new `--cairn-cli-rule` (oklch 38% 0.012 75 / 81% 0.008 75) |
| acknowledged | = muted | = muted | default + SGR 2 | `--color-muted` (role retires) |

`RoleAck` folds into `RoleMuted`, `RoleStale` into `RoleUnknown`. `--cairn-cli-rule` is the one
value to add to `cairn-admin.css`, so the CLI stops holding a color the family does not know about.
