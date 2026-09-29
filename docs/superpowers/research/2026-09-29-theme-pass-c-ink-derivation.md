# Status-ink and muted derivation: the measurement

The record for the derived defaults in `src/lib/public/cairn-public.css`. Rerun it with
`node scripts/lab/measure-status-inks.mjs` from the repository root; the script reads Chromium's
computed colors, so the browser evaluates every `color-mix`, and it exits nonzero when no value meets
the hard constraint. The tables below are its output, unedited.

## Result

| Default | Value |
| --- | --- |
| `--cairn-success-ink` | `color-mix(in oklab, var(--color-success) 50%, var(--color-base-content))` |
| `--cairn-warning-ink` | `color-mix(in oklab, var(--color-warning) 50%, var(--color-base-content))` |
| `--cairn-error-ink` | `color-mix(in oklab, var(--color-error) 50%, var(--color-base-content))` |
| `--cairn-info-ink` | `color-mix(in oklab, var(--color-info) 50%, var(--color-base-content))` |
| `--color-muted` | `color-mix(in oklab, var(--color-base-content) 80%, var(--color-base-100))` |
| `--cairn-shadow` | `0 1px 2px color-mix(in oklab, black 6%, transparent), 0 6px 20px -8px color-mix(in oklab, black 12%, transparent)` |

Every status lands on `N` = 50 and muted on `M` = 80. The shadow is a stated default, not a measured one.

## Method

- **Population, 39 themes.** The 35 stock daisyUI themes read from the installed package
  (daisyUI 5.7.46), Waymark's two daisyUI blocks with its ink overrides ignored (only its fills and
  base ladder are read, so "stripped" holds before and after Waymark's inks moved into those
  blocks), and the fixture theme's two blocks (`scripts/lab/theme-fixture/theme.css`).
- **The fixture palette was fixed first.** It is dark-first (`cairn-dark` carries `default: true`),
  keeps the names `cairn` and `cairn-dark`, and each block declares its `color-scheme`. Its values
  were written before the script first ran and have not changed since.
- **Grounds.** `base-100`, `base-200`, and the status's callout tint as `prose.css` paints it: the
  status fill at the highest tint percentage the file uses, mixed over `base-100`. Info 10%,
  success 7%, warning 9%. Error has no tint, so it has two grounds.
- **A pair passes** at 4.5:1 in both sRGB and display-p3, measured by `check:public-tokens`'s own
  `dualGamutRatio` (oklch gamut clamp, then WCAG luminance). The computed colors come from Chromium
  as `oklab()` strings and are parsed with culori at full precision.
- **Shares.** `N` and `M` run 0 to 100 in steps of 5.
- **Selection, per status.** Keep the shares where Waymark (both schemes) and the fixture palette
  (both schemes) pass every pair on every ground: the hard constraint, applied first. Keep those
  where the median ink-to-fill chroma ratio, over themes whose fill has OKLCH chroma of at least
  0.05, is at least 0.5 (tolerance 0.005). Take the highest pass count, and break ties toward the
  higher `N`. A pass count is the number of themes passing on every ground; the pair count beside it
  never disagrees with the choice.
- **Muted** is measured on `base-100` and `base-200`, with no chroma floor, and is selected by its
  own rule (conductor ruling of 2026-09-29): the lowest `M` that meets the hard constraint and whose
  themes-passing count is at least the highest count among the four chosen inks. The floor is
  success's 34/39 at `N` = 50.

## Decisions the measurement forced

- **The hard constraint is met at every chosen value.** No status and not muted needed the
  stop-and-report path. The last table shows the margin: the lowest ratio in either gamut, over the
  worst ground, for each of the four themes the constraint names. The narrowest is Waymark light's
  warning ink on `base-200`, 4.89, and it fails from `N` = 55, as the plan review found.
- **The chroma floor decides `N`.** Pass counts fall as `N` rises for every status, so the rule
  lands on the smallest `N` that reaches a median chroma ratio of 0.5, which is 50 for all four.
  The ratio at `N` = 50 is 0.500 to three places, so the tolerance is not what admits it.
- **Muted needs its own selection rule.** With no chroma floor its pass count rises with `M` and
  reaches 39/39 at `M` = 95 and again at `M` = 100, which is `base-content` itself and not a muted
  ink, so "highest pass count" cannot choose it. At `M` = 95 Waymark's muted measures 12.86:1
  against its ground, indistinguishable from the body ink. The conductor ruling of 2026-09-29 sets
  the rule: the floor is the highest themes-passing count among the four chosen inks (success's
  34/39), so muted never fails more stock themes than the least-failing ink does. The inks accept
  their failures only because the chroma floor forces them to; muted has no such force, and it is
  body-size text, so its default stays as conservative as the best ink. It takes the lowest `M`
  that meets the hard constraint and clears that floor. `M` = 75 passes 33/39, below the floor,
  and `M` = 80 passes 37/39, so the script chooses 80. A designer who wants a quieter or a
  stronger muted overrides `--color-muted`, as Waymark does.
- **The stock themes that fail at the chosen values** are named in the last section, by ground and
  ratio, for the inks and for muted at `M` = 80. None is hidden; the trade the chroma floor buys is
  the difference between the pass counts at `N` = 50 and the smaller `N` rows above it, and the
  trade muted's rule buys is the difference between 37/39 at `M` = 80 and the 39/39 at `M` = 95.

## Output

Population: 35 stock themes, Waymark light and dark (inks stripped), fixture light and dark.

#### success ink

| N | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |
| --- | --- | --- | --- | --- | --- |
| 0 | 39/39 | 117/117 | met | 0.078 | below |
| 5 | 39/39 | 117/117 | met | 0.092 | below |
| 10 | 38/39 | 116/117 | met | 0.119 | below |
| 15 | 38/39 | 114/117 | met | 0.166 | below |
| 20 | 38/39 | 114/117 | met | 0.200 | below |
| 25 | 38/39 | 114/117 | met | 0.250 | below |
| 30 | 37/39 | 113/117 | met | 0.300 | below |
| 35 | 36/39 | 110/117 | met | 0.350 | below |
| 40 | 36/39 | 108/117 | met | 0.400 | below |
| 45 | 35/39 | 106/117 | met | 0.450 | below |
| 50 **(chosen)** | 34/39 | 104/117 | met | 0.500 | met |
| 55 | 32/39 | 98/117 | met | 0.550 | met |
| 60 | 28/39 | 94/117 | met | 0.600 | met |
| 65 | 24/39 | 80/117 | met | 0.650 | met |
| 70 | 22/39 | 74/117 | met | 0.700 | met |
| 75 | 21/39 | 69/117 | met | 0.750 | met |
| 80 | 20/39 | 64/117 | met | 0.800 | met |
| 85 | 19/39 | 61/117 | met | 0.850 | met |
| 90 | 19/39 | 60/117 | met | 0.900 | met |
| 95 | 18/39 | 57/117 | fails | 0.950 | met |
| 100 | 18/39 | 55/117 | fails | 1.000 | met |

Chroma check at the chosen N: median ratio 0.500 across 38 chromatic-fill themes (0.500 over stock plus Waymark only).

#### warning ink

| N | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |
| --- | --- | --- | --- | --- | --- |
| 0 | 39/39 | 117/117 | met | 0.071 | below |
| 5 | 39/39 | 117/117 | met | 0.086 | below |
| 10 | 39/39 | 117/117 | met | 0.100 | below |
| 15 | 38/39 | 116/117 | met | 0.150 | below |
| 20 | 38/39 | 115/117 | met | 0.200 | below |
| 25 | 38/39 | 114/117 | met | 0.250 | below |
| 30 | 37/39 | 113/117 | met | 0.300 | below |
| 35 | 34/39 | 106/117 | met | 0.350 | below |
| 40 | 32/39 | 100/117 | met | 0.400 | below |
| 45 | 30/39 | 95/117 | met | 0.450 | below |
| 50 **(chosen)** | 28/39 | 92/117 | met | 0.500 | met |
| 55 | 25/39 | 81/117 | fails | 0.550 | met |
| 60 | 20/39 | 64/117 | fails | 0.600 | met |
| 65 | 17/39 | 55/117 | fails | 0.650 | met |
| 70 | 16/39 | 52/117 | fails | 0.700 | met |
| 75 | 16/39 | 49/117 | fails | 0.750 | met |
| 80 | 16/39 | 49/117 | fails | 0.800 | met |
| 85 | 16/39 | 49/117 | fails | 0.850 | met |
| 90 | 16/39 | 49/117 | fails | 0.900 | met |
| 95 | 16/39 | 49/117 | fails | 0.950 | met |
| 100 | 16/39 | 49/117 | fails | 1.000 | met |

Chroma check at the chosen N: median ratio 0.500 across 37 chromatic-fill themes (0.500 over stock plus Waymark only).

#### error ink

| N | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |
| --- | --- | --- | --- | --- | --- |
| 0 | 39/39 | 78/78 | met | 0.049 | below |
| 5 | 39/39 | 78/78 | met | 0.073 | below |
| 10 | 39/39 | 78/78 | met | 0.105 | below |
| 15 | 39/39 | 78/78 | met | 0.150 | below |
| 20 | 39/39 | 78/78 | met | 0.200 | below |
| 25 | 39/39 | 78/78 | met | 0.250 | below |
| 30 | 38/39 | 77/78 | met | 0.300 | below |
| 35 | 37/39 | 76/78 | met | 0.350 | below |
| 40 | 37/39 | 75/78 | met | 0.400 | below |
| 45 | 35/39 | 72/78 | met | 0.450 | below |
| 50 **(chosen)** | 33/39 | 68/78 | met | 0.500 | met |
| 55 | 32/39 | 67/78 | met | 0.550 | met |
| 60 | 30/39 | 63/78 | met | 0.600 | met |
| 65 | 29/39 | 60/78 | met | 0.650 | met |
| 70 | 27/39 | 56/78 | met | 0.700 | met |
| 75 | 22/39 | 49/78 | met | 0.750 | met |
| 80 | 21/39 | 43/78 | met | 0.800 | met |
| 85 | 19/39 | 41/78 | met | 0.850 | met |
| 90 | 18/39 | 38/78 | met | 0.900 | met |
| 95 | 17/39 | 36/78 | met | 0.950 | met |
| 100 | 16/39 | 34/78 | fails | 1.000 | met |

Chroma check at the chosen N: median ratio 0.500 across 38 chromatic-fill themes (0.500 over stock plus Waymark only).

#### info ink

| N | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |
| --- | --- | --- | --- | --- | --- |
| 0 | 39/39 | 117/117 | met | 0.079 | below |
| 5 | 39/39 | 117/117 | met | 0.110 | below |
| 10 | 38/39 | 116/117 | met | 0.157 | below |
| 15 | 38/39 | 114/117 | met | 0.203 | below |
| 20 | 38/39 | 114/117 | met | 0.227 | below |
| 25 | 38/39 | 114/117 | met | 0.275 | below |
| 30 | 37/39 | 113/117 | met | 0.308 | below |
| 35 | 36/39 | 109/117 | met | 0.350 | below |
| 40 | 36/39 | 108/117 | met | 0.400 | below |
| 45 | 34/39 | 106/117 | met | 0.450 | below |
| 50 **(chosen)** | 32/39 | 102/117 | met | 0.500 | met |
| 55 | 28/39 | 92/117 | met | 0.550 | met |
| 60 | 27/39 | 86/117 | met | 0.600 | met |
| 65 | 25/39 | 79/117 | met | 0.650 | met |
| 70 | 20/39 | 68/117 | met | 0.700 | met |
| 75 | 19/39 | 59/117 | met | 0.750 | met |
| 80 | 18/39 | 58/117 | met | 0.800 | met |
| 85 | 18/39 | 56/117 | met | 0.850 | met |
| 90 | 17/39 | 52/117 | met | 0.900 | met |
| 95 | 15/39 | 49/117 | fails | 0.950 | met |
| 100 | 15/39 | 48/117 | fails | 1.000 | met |

Chroma check at the chosen N: median ratio 0.500 across 38 chromatic-fill themes (0.500 over stock plus Waymark only).

#### muted

| M | themes passing | pairs passing | hard constraint | median chroma ratio | chroma floor |
| --- | --- | --- | --- | --- | --- |
| 0 | 0/39 | 0/78 | fails | exempt | exempt |
| 5 | 0/39 | 0/78 | fails | exempt | exempt |
| 10 | 0/39 | 0/78 | fails | exempt | exempt |
| 15 | 0/39 | 0/78 | fails | exempt | exempt |
| 20 | 0/39 | 0/78 | fails | exempt | exempt |
| 25 | 0/39 | 0/78 | fails | exempt | exempt |
| 30 | 0/39 | 0/78 | fails | exempt | exempt |
| 35 | 0/39 | 0/78 | fails | exempt | exempt |
| 40 | 0/39 | 0/78 | fails | exempt | exempt |
| 45 | 0/39 | 3/78 | fails | exempt | exempt |
| 50 | 3/39 | 7/78 | fails | exempt | exempt |
| 55 | 6/39 | 23/78 | fails | exempt | exempt |
| 60 | 14/39 | 37/78 | fails | exempt | exempt |
| 65 | 24/39 | 51/78 | met | exempt | exempt |
| 70 | 30/39 | 62/78 | met | exempt | exempt |
| 75 | 33/39 | 70/78 | met | exempt | exempt |
| 80 **(chosen)** | 37/39 | 75/78 | met | exempt | exempt |
| 85 | 38/39 | 76/78 | met | exempt | exempt |
| 90 | 38/39 | 77/78 | met | exempt | exempt |
| 95 | 39/39 | 78/78 | met | exempt | exempt |
| 100 | 39/39 | 78/78 | met | exempt | exempt |

#### Chosen values

- success ink: N=50
- warning ink: N=50
- error ink: N=50
- info ink: N=50
- muted: M=80

#### Failing themes and grounds at the chosen values

##### success ink at N=50: failing themes and grounds

- lemonade (stock): base-200 4.113
- nord (stock): base-100 4.215, base-200 3.990, tint-7 4.062
- silk (stock): base-100 3.288, base-200 3.096, tint-7 3.207
- valentine (stock): base-100 2.680, base-200 2.439, tint-7 2.620
- winter (stock): base-100 3.692, base-200 3.432, tint-7 3.556

##### warning ink at N=50: failing themes and grounds

- caramellatte (stock): base-100 3.693, base-200 3.377, tint-9 3.540
- corporate (stock): base-200 4.175
- emerald (stock): base-100 3.950, base-200 3.214, tint-9 3.787
- fantasy (stock): base-200 3.766, tint-9 4.437
- garden (stock): base-200 3.871
- lemonade (stock): base-200 4.149
- nord (stock): base-100 3.576, base-200 3.385, tint-9 3.484
- retro (stock): base-200 4.076, tint-9 4.163
- silk (stock): base-100 3.361, base-200 3.165, tint-9 3.245
- valentine (stock): base-100 3.409, base-200 3.101, tint-9 3.207
- winter (stock): base-100 3.170, base-200 2.947, tint-9 3.082

##### error ink at N=50: failing themes and grounds

- emerald (stock): base-200 4.415
- lemonade (stock): base-200 4.209
- retro (stock): base-100 3.985, base-200 3.590
- silk (stock): base-100 4.184, base-200 3.941
- valentine (stock): base-100 4.499, base-200 4.093
- winter (stock): base-100 4.483, base-200 4.167

##### info ink at N=50: failing themes and grounds

- aqua (stock): base-100 4.393, tint-10 4.092
- emerald (stock): base-200 4.075
- lemonade (stock): base-200 4.130
- retro (stock): base-200 4.330, tint-10 4.339
- silk (stock): base-100 3.558, base-200 3.351, tint-10 3.393
- valentine (stock): base-100 2.602, base-200 2.367, tint-10 2.530
- winter (stock): base-100 3.182, base-200 2.958, tint-10 3.083

##### muted at M=80: failing themes and grounds

- retro (stock): base-200 4.169
- valentine (stock): base-100 3.804, base-200 3.461

#### The hard constraint at the chosen values

The lowest ratio (either gamut, worst ground) for each pair set; every cell must be at least 4.5.

| theme | success ink | warning ink | error ink | info ink | muted |
| --- | --- | --- | --- | --- | --- |
| waymark-light | 8.00 (tint-7) | 4.89 (base-200) | 8.16 (base-200) | 7.67 (tint-10) | 8.41 (base-200) |
| waymark-dark | 7.97 (tint-7) | 9.42 (tint-9) | 8.23 (base-100) | 7.98 (tint-10) | 8.33 (base-100) |
| fixture-light | 8.59 (tint-7) | 4.92 (base-200) | 8.76 (base-200) | 8.47 (tint-10) | 8.55 (base-200) |
| fixture-dark | 9.68 (tint-7) | 10.20 (tint-9) | 9.30 (base-100) | 9.06 (tint-10) | 9.04 (base-100) |

