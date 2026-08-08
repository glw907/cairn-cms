# Vertical-alignment inventory (measured, both corpora)

Emitted by `scripts/probe-vertical-alignment.mjs` against a running showcase preview. Re-run the probe to regenerate this file; it is a measurement record, not a hand-maintained doc.

## The three measurement traps

Verbatim from the ratified design spec, and binding on every artifact that measures vertical alignment (this probe, the shared module, the rendered rule, and every fixture assertion). Each one is a wrong answer a real probe already produced against a real screen.

1. **Pair with the line, not the block.** An icon beside a multi-line text block aligns with the block's FIRST LINE BOX, not the block. Comparing against the whole block reported 29 to 68px of phantom delta on rows that were correctly composed.
2. **Read type metrics off the element that renders the line.** Reading font metrics from the text CONTAINER rather than the rendering element returned -0.4px ("this row is fine") on the row whose icons visibly ride high. Resolve the metrics from the computed style of the element that owns the line box.
3. **Measure ink, not element boxes.** An SVG's element box centres while its drawn ink rides high. Icon geometry is the ink bounds: `getBBox()` mapped through the screen CTM. Text geometry is the glyph box: `getClientRects()` on a `Range`, with cap-centre for title-class comparisons. Element boxes are acceptable ONLY for controls whose border box is the visual object.

The metric follows the pair's kinds AND what the row declared. icon-beside-text and control-beside-text compare visible-content (ink) centres; the optical suspects compare glyph centre against padding-box centre; two runs of text compare BASELINES, unless the row centred them, in which case they compare centres. Reporting bar: 2px.

### The fourth trap: a padded chip is not a text run

TWO RUNS OF TYPE AT DIFFERENT SIZES CANNOT SHARE BOTH A BASELINE AND A CENTRE. The cap-height ratio sets one apart by exactly as much as the other holds together, so the same reading is a defect under one metric and correct typography under the other, and only the row says which. Trap 3 above states half of it, the half a previous emission got wrong: a mixed-size pair sharing a BASELINE has centres that diverge by design. THE CONVERSE IS ALSO TRUE and this emission is the first to hold it: a mixed-size pair sharing a CENTRE has BASELINES that diverge by design.

The shape that made it visible is a padded chip beside a heading. A CHIP IS A BOX, not a run of type: its background and border draw the outline the row levels and the eye follows, and the type inside it only says where the OPTICAL reading should look. The previous emission classed three such rows as text-beside-text, scored them on baselines, and prescribed "set them on one baseline" for each: applied, that recipe would have dropped the admin shell's CMS chip 3.5px, the vocabulary count pill 2.5px and the public footer's nav links 2.8 to 4.4px off centres they already hit to within a pixel at every width in both themes.

Two rules follow, both in the shared module rather than here:

- A pair of runs is read at CENTRES where the row declared a centre, and at baselines otherwise. A table cell counts: it is placed by `vertical-align`, and Chromium reports `align-self: normal` on every cell whatever the row asked for, which read as "nothing was declared" on middle-aligned rows that had asked for centres.
- A member whose run sits in a PAINTED BOX of its own (a background or a border, plus a padding, a border or a rounded corner) is read at that box, not at its cap band. The row container's own paint never counts: a painted button holding an icon and its label is the ground that row is drawn on, not one member's object. Keeping the two apart is also what stops a glyph riding high INSIDE a chip being counted twice, once here and once in the optical readings below.

A row that top-aligns a chip beside a heading keeps its baseline reading. Under `flex-start` a centre reading collapses into the top-alignment composition term and measures nothing at all (see the coverage note below), so the baseline is the only relative reading two runs of type have there. `22a0e709` is that row, and it survives this correction as a defect.

## How a reading is decomposed, and why the raw delta is not the defect

Trap 1 answers WHICH LINE a member pairs with. It does not answer what the row asked for, and two alignments displace a reading with nothing misconfigured. Reading either displacement as a defect is a phantom, and the first two emissions of this inventory each reported one of them.

A CENTRED row whose text block WRAPS has deliberately centred the other member on the whole block, so a reading taken against the first line is short by half the block's extra height: a number that grows with the line count and swings with the viewport width.

A TOP-ALIGNED row levelled its members' own boxes and asked for nothing else, so a member read at its CENTRE sits half its own box below the line beside it: a 36px icon tile beside a 13px line reads 11.5px apart with its ink dead centre in the tile, and the same recipe in a 28px tile reads 5.5px. A reading that scales with the member box rather than with the ink is the signature.

Every reading is therefore split, with no extra measurement:

```
raw delta = composition + residual
centred row:     composition = b.blockLift - a.blockLift  (the wrapped block it centres on)
top-aligned row: composition = placed(a) - placed(b)      (the boxes it levelled)
blockLift = (text extent centre) - (first line band centre), 0 on a single line
placed(m) = m read whole ? centre of the MEMBER box : the reading itself
```

The member box is the box the row placed, which is not always the box the reading came off: an icon centred in a tile and the one control inside a stacked composite are both read off something smaller. What survives the top-alignment term is therefore a member whose visible content does not sit where its own box puts it, which is the `/join` ink defect this method was built on, and the `icon-card` calibration fixture is the positive control: it top-aligns, it takes a term of half a pixel, and its 4px defect survives whole.

Each term is taken where the row asked for it and nowhere else. The wrapped-block term: on an optical suspect always, since its padding box spans every line by construction, and on a row whose two members both resolve `align-self` to `center`. The top-alignment term: on a row whose two members both resolve to `flex-start`, `start` or `self-start`, and only under the `content-centre` metric, since a baseline pair compares two baselines that no box geometry enters. NOT MODELLED, and left to a reviewed ruling rather than folded in silently: an `end`-aligned row pairs with the block's LAST line, and a grid member spanning several rows centres on its span. NOT REPORTED, and stated rather than implied: under `stretch` (and the `normal` that resolves to it) a member box is the row's own height, so no term is taken; and the top-alignment term absorbs generous leading, since a row that got the tops it asked for is composed as written and choosing `items-center` instead is a design call, not a reading.

THE BAR APPLIES TO THE RESIDUAL, and so does every disposition. The raw delta is kept in its own column because it is what a reader sees on screen, not because it is evidence.

### What the top-alignment branch cannot see

Stated rather than implied, because a residual of zero here is NOT a clean row. Subtract the top-alignment term and the algebra leaves each member's own content-within-its-own-box offset: `residual = inset(a) - inset(b)`. THE TWO MEMBERS' RELATIVE PLACEMENT DROPS OUT ENTIRELY. What survives is a member read off something INSIDE the box the row placed, which is real and is the defect this method was built on, and nothing else.

- Readings this branch JUDGED (an icon's ink in its tile, a stacked composite's control): 18, of which 4 measured anything other than exactly zero. A zero here is a real verdict: the ink sits where its own box puts it.
- Readings where it is blind by construction (every member read exactly where its own box puts it, so the inset is structurally zero): 30, of which 0 measured anything other than exactly zero. By class: control-beside-text 24, control-beside-control 6.

A control is the clearest case: its border box IS its reading, so `control-beside-text` under `flex-start` measures identically zero however the row is composed. The term is still taken there, because without it the raw delta (a 32px button top-aligned with a 17px line reads 9px) is reported as a defect, which is the phantom the previous emission shipped. TASK 4 INHERITS THIS HOLE: the choice is to keep the term and state that a top-aligned pair of boxes is unjudged, or to narrow the branch and give those readings a third disposition that is neither a finding nor a clean bill. This run does the first.

## Calibration (synthetic, and why)

NEITHER CORPUS STILL EXHIBITS THE CALIBRATION DEFECTS. The stacked-register field components have no call sites in the engine's admin components or the showcase routes, and the one consumer that composed the icon-card shape has already fixed its instances. There is therefore no live screen to calibrate against, which is why both calibration cases are SYNTHETIC fixtures reproducing the measured defects. The probe renders both before it touches either corpus and refuses to emit if it misses either one on sign or magnitude.

Each fixture declares the largest composition term its own alignment can honestly ask for, which makes this check the guard on the decomposition as well: a rule that started explaining real defects away as composition fails here rather than quietly emptying the inventory. `season-row` centres and wraps nothing, so its bound is zero. `icon-card` TOP-ALIGNS, so it is the one positive control on the live corpus: the row takes a term and the defect survives it.

- `season-row` (control-beside-control): expected sign +, magnitude 11.5 to 13.5px; measured 12.5px residual, 0px composition (bound 0px). PASS.
- `icon-card` (icon-beside-text): expected sign -, magnitude 2.8 to 5.1px; measured -4px residual, 0.5px composition (bound 1px). PASS.

## The run

- Admin corpus: 14 screens at 1440, 768, 390px, both themes.
- Public corpus: 3 screens at 320, 390, 768, 1440, 2560px, both themes.
- Renders measured: 106. Pairs measured: 5028.
- Visual rows walked: 2800. Distinct compositions: 359.
- Rows above the 2px bar ON THE RESIDUAL: 7 (admin 7, public 0).
- Rows whose RAW delta clears the bar and whose residual does not: 26. Their composition explains them in full, and they are not inventoried.
- Crops and the full per-pair record: `/tmp/cairn-vertical-alignment`.

A ROW HERE IS ONE VISUAL ROW, not one pair and not one render. A three-member row (a leading icon, a run of text, a trailing control) is two READINGS of one row, both listed under one entry: the first emission keyed on the pair and inventoried that row twice, with mirrored signs and identical magnitudes. The same row seen at several widths or in both themes is likewise one entry carrying every width and theme it was seen at.

The full per-pair record, all 5028 readings including every sub-bar one, is written to `/tmp/cairn-vertical-alignment/measured-pairs.json`. It carries each member's whole anchor (top, bottom, content centre, element centre, MEMBER BOX top and bottom, baseline, cap centre, PAINTED BOX centre, line count, block lift, the keyword that placed it) alongside the delta, the composition and the residual, so a disagreement about any reading here is settled by reading that file rather than by re-running the probe against a live preview.

## Screens measured

| Surface | Screen | Route | State | Note |
| --- | --- | --- | --- | --- |
| admin | admin-posts | `/admin/posts` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-vocabulary | `/admin/vocabulary` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-login | `/admin/login` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-auth-confirm-token-preview-token | `/admin/auth/confirm?token=preview-token` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-editors | `/admin/editors` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-posts-2026-06-hello | `/admin/posts/2026-06-hello` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-media | `/admin/media` | rest | derived from examples/showcase/e2e/admin-visual.spec.ts |
| admin | admin-pages | `/admin/pages` | rest | named by the design spec corpus; the visual suite does not navigate here |
| admin | admin-settings | `/admin/settings` | rest | named by the design spec corpus; the visual suite does not navigate here |
| admin | admin-edit-details-open | `/admin/posts/2026-06-hello` | details-open | the edit desk with the Details disclosure expanded |
| admin | admin-media-detail | `/admin/media` | media-detail | the media slide-over detail panel |
| admin | admin-palette-open | `/admin/posts` | palette-open | the command palette, open |
| admin | admin-dialog-open | `/admin/posts` | dialog-open | the first dialog trigger, open |
| admin | admin-menu-open | `/admin/posts` | menu-open | the first menu trigger, open |
| public | site-home | `/` | rest | the (site) chrome: masthead, nav, lead, footer |
| public | site-article | `/posts/the-reading-surface` | rest | the representative article: directives, callouts, figures, a table, and code |
| public | styleguide | `/styleguide` | rest | every public recipe, by design |

## Rows above the reporting bar

Sign: NEGATIVE means the left-hand member rides HIGH against the right-hand member; on an optical row, negative means the glyph rides high inside its own padding box. The RESIDUAL column is the reading each disposition rests on. Every row carries a disposition: a recipe task, or an explicit decline with its reason. No row reads "unknown".

| # | Id | Surface | Screens / routes | Viewport | Theme | Component file | Pair class | Raw delta (px) | Composition (px) | Residual (px) | Crop | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `52225d2e` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | row container `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -71.69 | 0 | -71.69 | `/tmp/cairn-vertical-alignment/crops/52225d2e-admin-settings-fixes-1440.png` | DECLINE (reviewed, a design call): the row declares `items-end` and bottom-aligns its trailing action against a three-line block on purpose, so the reading pairs the control with the block's FIRST line while the composition pairs it with the last. `end` alignment is the case the composition term does not model, stated as a limitation rather than folded in. Crop read: the "Turn off" control sits about 11px BELOW the last line of the card body ("to." has ink rows 97 to 105 and baseline 106; "Turn off" has ink rows 107 to 116 and baseline 117), as a bottom-right card action. It is bottom-flush with the block exactly as `items-end` asks, which is what makes the reading composition rather than a defect. |
| 2 | `a1f335e1` | admin | admin-vocabulary (`/admin/vocabulary`) | 390 | dark, light | row container `src/lib/components/VocabularyAdmin.svelte` | control-beside-control | -10 | 0 | -10 | `/tmp/cairn-vertical-alignment/crops/a1f335e1-admin-vocabulary-input-390.png` | DECLINE (reviewed, a design call): the delete control spans BOTH grid rows of the tag entry and centres on the pair, while the input occupies the first row alone. A multi-row grid span is the other case the composition term does not model. Crop read: the trash control sits between the input and the slug line, which is correct as built. |
| 3 | `22a0e709` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | row container `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -4 | 0 | -4 | `/tmp/cairn-vertical-alignment/crops/22a0e709-admin-settings-tidy-is-set-up-for-this-site-1440.png` | task 2 (admin toolkit): the pill sits low against the heading it labels, and low against every candidate target: its box centre is 5px below the heading's cap centre, 5px below that heading's first line box (249 to 266px at 1440, centre 257.5) and its baseline is 4px below the heading's. LEVEL THE PILL'S BOX ON THE HEADING'S FIRST LINE BOX, which is the target the other chip rows already hit; do NOT set the two on one baseline. The row is `items-start` against a 237px block and the pill carries a deliberate `mt-0.5`, so a baseline fix would move the wrong thing. |
| 4 | `290376a5` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | row container `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/290376a5-admin-settings-tidy-1440.png` | task 2 (admin toolkit), ONE MECHANIC AT THREE CALL SITES: the label is an `inline-flex` span wrapping an icon and its word, and an inline-flex flex item synthesises its baseline from its FIRST item, the svg, rather than from its text. The row does declare `sm:items-baseline`, so it asked for the right thing and misses it by 2.5px, a quarter of the 10px cap height both members measure; this is not a mixed-size artifact. Crop read, one crop per row: the label with its check icon rides visibly high against the value beside it, on all three ("Tidy" against "On for this site", "API key" against "Set, and kept on the server", "Model" against "Claude Sonnet"). FIX IT AT THE RECIPE, not as three row fixes: the same span shape appears at CairnTidySettings.svelte lines 367, 372 and 380, and a repeated local workaround is the signal that the label-with-icon shape belongs in the toolkit. |
| 5 | `24a343fe` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | row container `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/24a343fe-admin-settings-api-key-1440.png` | task 2 (admin toolkit), ONE MECHANIC AT THREE CALL SITES: the label is an `inline-flex` span wrapping an icon and its word, and an inline-flex flex item synthesises its baseline from its FIRST item, the svg, rather than from its text. The row does declare `sm:items-baseline`, so it asked for the right thing and misses it by 2.5px, a quarter of the 10px cap height both members measure; this is not a mixed-size artifact. Crop read, one crop per row: the label with its check icon rides visibly high against the value beside it, on all three ("Tidy" against "On for this site", "API key" against "Set, and kept on the server", "Model" against "Claude Sonnet"). FIX IT AT THE RECIPE, not as three row fixes: the same span shape appears at CairnTidySettings.svelte lines 367, 372 and 380, and a repeated local workaround is the signal that the label-with-icon shape belongs in the toolkit. |
| 6 | `c2ab4dc7` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | row container `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/c2ab4dc7-admin-settings-model-1440.png` | task 2 (admin toolkit), ONE MECHANIC AT THREE CALL SITES: the label is an `inline-flex` span wrapping an icon and its word, and an inline-flex flex item synthesises its baseline from its FIRST item, the svg, rather than from its text. The row does declare `sm:items-baseline`, so it asked for the right thing and misses it by 2.5px, a quarter of the 10px cap height both members measure; this is not a mixed-size artifact. Crop read, one crop per row: the label with its check icon rides visibly high against the value beside it, on all three ("Tidy" against "On for this site", "API key" against "Set, and kept on the server", "Model" against "Claude Sonnet"). FIX IT AT THE RECIPE, not as three row fixes: the same span shape appears at CairnTidySettings.svelte lines 367, 372 and 380, and a repeated local workaround is the signal that the label-with-icon shape belongs in the toolkit. |
| 7 | `76d4cd3e` | admin | admin-edit-details-open, admin-posts-2026-06-hello (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | unattributed (no class run and no rendered text resolves to a file) | icon-beside-text | -2.33 | 0 | -2.33 | `/tmp/cairn-vertical-alignment/crops/76d4cd3e-admin-posts-2026-06-hello-write-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). REAL BUT MARGINAL, and it clears the bar by 0.33px: thirteen sibling icon-in-btn rows across the admin cluster in [-0.75, -0.5], and lucide's check glyph carries about 0.33px of ink-bbox bias of its own, which leaves roughly 1.5px of genuine placement offset. Worth fixing with the mechanic, not worth a bespoke nudge. |

### What each row is

One line per READING. A row with more than one line is one composition measured at more than one pair of members, not more than one row. A row whose member list CHANGES with the viewport (a member hidden below a breakpoint) is two compositions and reports as two rows, which is why the same recipe can appear twice with different widths: the members column shows the difference.

| # | Id | Row container | Members | Reading | Left member | Right member | Shape | `align-items` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `52225d2e` | `div.mb-3.flex.items-end.gap-3` | text:Fixes + control:Turn off | -71.69px residual | text/glyph `h2.flex.items-center.gap-2.type-heading` "Fixes" (3 lines, lift 29.03px) | control/element-box `button.px-0\.5.py-1.type-meta.text-muted` "Turn off" | control beside text | flex-end |
| 2 | `a1f335e1` | `div.grid.grid-cols-\[1fr_auto\].items-center.gap-x-4` | control:input + control:button | -10px residual | control/element-box `input.input.input-sm.col-start-1.row-start-1` | control/element-box `button.col-start-2.row-start-1.row-span-2.inline-flex` | control beside control | center |
| 3 | `22a0e709` | `div.mt-6.flex.items-start.gap-3` | icon:svg + text:Tidy is set up for this site + text:Set by your developer | -4px residual | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" (9 lines, lift 106.94px) | text/glyph `span.mt-0\.5.hidden.flex-none.items-center` "Set by your developer" | text beside text | flex-start |
| 3 | `22a0e709` | `div.mt-6.flex.items-start.gap-3` | icon:svg + text:Tidy is set up for this site + text:Set by your developer | 0px residual | icon/ink `svg.lucide-icon.lucide.lucide-code-xml.h-5` | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" (9 lines, lift 106.94px) | icon beside text | flex-start |
| 4 | `290376a5` | `div.flex.flex-col.gap-1.type-meta` | text:Tidy + text:On for this site | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Tidy" | text/glyph `span` "On for this site" | text beside text | baseline |
| 5 | `24a343fe` | `div.flex.flex-col.gap-1.type-meta` | text:API key + text:Set, and kept on the server | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "API key" | text/glyph `span` "Set, and kept on the server" | text beside text | baseline |
| 6 | `c2ab4dc7` | `div.flex.flex-col.gap-1.type-meta` | text:Model + text:Claude Sonnet | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Model" | text/glyph `span` "Claude Sonnet" | text beside text | baseline |
| 7 | `76d4cd3e` | `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` | icon:svg + text:Write | -2.33px residual | icon/ink `svg.h-4.w-4` | text/glyph `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` "Write" | icon beside text | center |

## Disposition summary

| Disposition | Rows |
| --- | --- |
| task 2 (admin toolkit), ONE MECHANIC AT THREE CALL SITES: the label is an `inline-flex` span wrapping an icon and its word, and an inline-flex flex item synthesises its baseline from its FIRST item, the svg, rather than from its text. The row does declare `sm:items-baseline`, so it asked for the right thing and misses it by 2.5px, a quarter of the 10px cap height both members measure; this is not a mixed-size artifact. Crop read, one crop per row: the label with its check icon rides visibly high against the value beside it, on all three ("Tidy" against "On for this site", "API key" against "Set, and kept on the server", "Model" against "Claude Sonnet"). FIX IT AT THE RECIPE, not as three row fixes: the same span shape appears at CairnTidySettings.svelte lines 367, 372 and 380, and a repeated local workaround is the signal that the label-with-icon shape belongs in the toolkit. | 3 |
| DECLINE (reviewed, a design call): the row declares `items-end` and bottom-aligns its trailing action against a three-line block on purpose, so the reading pairs the control with the block's FIRST line while the composition pairs it with the last. `end` alignment is the case the composition term does not model, stated as a limitation rather than folded in. Crop read: the "Turn off" control sits about 11px BELOW the last line of the card body ("to." has ink rows 97 to 105 and baseline 106; "Turn off" has ink rows 107 to 116 and baseline 117), as a bottom-right card action. It is bottom-flush with the block exactly as `items-end` asks, which is what makes the reading composition rather than a defect. | 1 |
| DECLINE (reviewed, a design call): the delete control spans BOTH grid rows of the tag entry and centres on the pair, while the input occupies the first row alone. A multi-row grid span is the other case the composition term does not model. Crop read: the trash control sits between the input and the slug line, which is correct as built. | 1 |
| task 2 (admin toolkit): the pill sits low against the heading it labels, and low against every candidate target: its box centre is 5px below the heading's cap centre, 5px below that heading's first line box (249 to 266px at 1440, centre 257.5) and its baseline is 4px below the heading's. LEVEL THE PILL'S BOX ON THE HEADING'S FIRST LINE BOX, which is the target the other chip rows already hit; do NOT set the two on one baseline. The row is `items-start` against a 237px block and the pill carries a deliberate `mt-0.5`, so a baseline fix would move the wrong thing. | 1 |
| task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). REAL BUT MARGINAL, and it clears the bar by 0.33px: thirteen sibling icon-in-btn rows across the admin cluster in [-0.75, -0.5], and lucide's check glyph carries about 0.33px of ink-bbox bias of its own, which leaves roughly 1.5px of genuine placement offset. Worth fixing with the mechanic, not worth a bespoke nudge. | 1 |

Rows owned by task 2 (admin): 5. Rows owned by task 3 (chassis): 0. Explicit declines: 2.

NO PUBLIC ROW CLEARS THE BAR, so task 3 (the Waymark chassis) inherits no measured row from this inventory. That is a result rather than an omission, and it is worth saying out loud: the one public row a previous emission carried was the footer masthead (`dabaf490`, the wordmark beside the nav links), and it left because the metric was corrected, not because a recipe landed. Measured at centres it sits within a pixel of true at 390, 768, 1440 and 2560px in both themes.

A decline is one of two things, and each row says which. A MECHANICAL decline is the measurement disqualifying its own reading (an icon with no reachable painting geometry, so the number is a border box rather than ink). A REVIEWED decline is a design call the arithmetic cannot reach, ruled on after reading the crop. The reviewed rulings live in the probe (`REVIEWED_DISPOSITIONS`), keyed by the Id column, because a re-run overwrites this file and a ruling kept only here would be erased by the run that is supposed to verify it.

The Id is built from the row container's TAG and its members' kinds and rendered text, never from classes. Tasks 2 and 3 change classes, so a class-bearing key would silently drop every ruling on the verification re-run and re-report those rows as fresh recipe work. A ruling whose Id no longer resolves is reported below rather than dropped.

### Ruling keys

All 7 reviewed rulings resolved to a row in this run.

### Rows the composition explains in full

26 rows carry a raw delta above the bar and a residual within it: a row that centres its members on a block its text wraps, or one that top-aligns a member taller than the line beside it, which is what the two composition terms are for. The `align-items` column says which. They are listed rather than omitted, because an earlier emission reported each shape as a defect and a reader comparing the documents is owed the reason they left.

| Id | Surface | Members | Component file | Raw delta reach (px) | Worst residual (px) | `align-items` |
| --- | --- | --- | --- | --- | --- | --- |
| `10c7c58e` | admin | text:Spelling, grammar, doubled words, spacin + control:On | row container `src/lib/components/CairnTidySettings.svelte` | 73.75 | 0.43 | center |
| `b1c950e4` | admin | icon:svg + text:Advanced + icon:svg | row container `src/lib/components/CairnTidySettings.svelte` | 27.31 | 0.07 | center |
| `d87b4ff1` | public | text:Does the FAQ component support formattin + icon:svg | unattributed (no class run and no rendered text resolves to a file) | 25.14 | 1.21 | center |
| `1e3e4f0f` | admin | text:Time format + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 24.19 | 0.44 | center |
| `3ae7ac06` | admin | text:Measurements and units + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 24.19 | 0.44 | center |
| `d5ff01bb` | admin | text:Em-dash style + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 24.18 | 0.44 | center |
| `a8ca6454` | admin | text:Number style + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 24.18 | 0.44 | center |
| `31c6aeb2` | admin | text:DE + text:Demo Editor | row container `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/CairnTidySettings.svelte`, `src/lib/components/TidyReview.svelte`, `src/lib/components/VocabularyAdmin.svelte` (UNVERIFIED, matched on the container class run `flex items-center gap-3`, which appears in 5 files) | 15.5 | 0.5 | center |
| `b2adb6a6` | admin | text:Style conventions + text:2 on | row container `src/lib/components/CairnTidySettings.svelte`, `src/lib/components/EditPage.svelte`, `src/lib/components/VocabularyAdmin.svelte` (UNVERIFIED, matched on the container class run `flex items-center gap-2 type-heading font-bold font-[family-name:var(--font-display)]`, which appears in 3 files); text from `src/lib/components/CairnTidySettings.svelte` | 15.28 | 1.28 | center |
| `6fdf76aa` | admin | icon:svg + text:Add hero image | row container `src/lib/components/MediaHeroField.svelte` | 14.5 | 0 | center |
| `92c74389` | public | text:Read the getting-started guide + icon:svg | unattributed (no class run and no rendered text resolves to a file) | 12.5 | 0.5 | center |
| `66bc3216` | admin | text:En-dash in number ranges + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `ff5b1250` | admin | text:Ellipsis + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `d135a865` | admin | text:Percent + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `753f4409` | admin | text:Curly quotes + control:On | row container `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `fd22c19a` | admin | text:Brand and proper-noun capitals + control:Off | row container `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `043ff649` | admin | icon:svg + text:Tidy is set up for this site | row container `src/lib/components/CairnTidySettings.svelte` | 11.5 | 0 | flex-start |
| `b6f2153a` | public | icon:svg + text:Check the date before you publish | unattributed (no class run and no rendered text resolves to a file) | 10.98 | 1.49 | center |
| `90c0864b` | admin | text:Saving applies your choices for every ed + control:Save changes | row container `src/lib/components/CairnTidySettings.svelte`, `src/lib/components/VocabularyAdmin.svelte` (UNVERIFIED, matched on the container class run `flex items-center gap-3 pt-4`, which appears in 2 files); text from `src/lib/components/CairnTidySettings.svelte` | 9.38 | 0.44 | center |
| `fc839e96` | admin | icon:svg + text:Saving applies your choices for every ed | row container `src/lib/components/CairnTidySettings.svelte`, `src/lib/components/VocabularyAdmin.svelte` (UNVERIFIED, matched on the container class run `flex min-w-0 flex-1 items-center gap-1.5 type-meta leading-snug text-muted`, which appears in 2 files); text from `src/lib/components/CairnTidySettings.svelte` | 9.38 | 0.44 | center |
| `a4b8e440` | admin | text:Saving commits your tag list to the site + control:Save changes | row container `src/lib/components/VocabularyAdmin.svelte` | 9.37 | 0.44 | center |
| `c619e469` | admin | text:Media + control:Upload | row container `src/lib/admin-toolkit/PageHeader.svelte` | 9 | 0 | flex-start |
| `8c420e10` | admin | text:This image leads the page, and it is the + box:p | row container `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/MediaHeroField.svelte`, `src/lib/components/TidyReview.svelte` (UNVERIFIED, matched on the container class run `type-label leading-snug text-muted`, which appears in 3 files); text from `src/lib/components/MediaHeroField.svelte` | 8.13 | 0.57 | normal |
| `0256679d` | admin | text:as written, following your site's Englis + box:span | text from `src/lib/components/CairnTidySettings.svelte` | 7.5 | 0.5 | normal |
| `ef917e33` | admin | text:Drop an image here, or pick from the lib + box:span | text from `src/lib/components/MediaHeroField.svelte` | 7 | 0 | normal |
| `94f150f3` | admin | icon:svg + text:Tidy will fix | row container `src/lib/components/CairnTidySettings.svelte` | 5.5 | 0 | flex-start |

## Optical readings, by recipe

Glyph cap centre against the padding box the glyph sits in, over every optical reading in the run rather than only the ones above the bar. NEGATIVE means the glyph rides high in its own box. This is the evidence a `text-box: trim-both` default rests on, so the sub-bar distribution matters as much as the outliers.

Taken on the RESIDUAL. A recipe whose label wraps has a padding box spanning every line and a glyph reading on the first, which reads as half a block of optical offset with nothing misconfigured; that term is composition and is subtracted here.

| Recipe | Readings | Median offset (px) | Max magnitude (px) |
| --- | --- | --- | --- |
| `badge badge-outline` | 20 | -1.5 | -1.5 |
| `btn btn-outline` | 10 | -1.5 | -1.5 |
| `btn btn-ghost` | 10 | -1.5 | -1.5 |
| `badge badge-primary` | 16 | -1.31 | -1.5 |
| `ml-auto hidden rounded` | 36 | -1 | -1 |
| `type-label leading-snug text-muted` | 4 | -0.57 | -0.57 |
| `join-item btn btn-sm` | 156 | 0.5 | 0.5 |
| `type-label text-muted` | 76 | -0.5 | -0.5 |
| `mr-0.5 type-label font-semibold` | 66 | -0.5 | -0.5 |
| `btn btn-sm border-transparent` | 54 | 0.5 | 0.5 |
| `btn btn-ghost btn-sm` | 50 | 0.5 | 0.5 |
| `btn btn-sm btn-ghost` | 34 | 0.5 | 0.5 |
| `btn btn-primary btn-sm` | 30 | 0.5 | -1 |
| `btn btn-sm w-full` | 24 | 0.5 | 0.5 |
| `btn btn-outline btn-primary` | 16 | 0.5 | 0.5 |
| `btn btn-sm shrink-0` | 12 | 0.5 | 0.5 |
| `btn btn-sm border-[var(--cairn-card-border)]` | 12 | 0.5 | 0.5 |
| `btn btn-sm btn-primary` | 12 | 0.5 | 0.5 |
| `badge badge-sm font-medium` | 10 | 0.5 | 0.5 |
| `btn btn-sm btn-active` | 8 | 0.5 | 0.5 |
| ... 26 more recipes | | | |

## Noise floor

The rendered rule sets its firing threshold from THESE numbers, not from the placeholder 4px. The distribution is over the UNCENSORED population: every reading in the run, not the slice at or under the 2px bar. The first emission reported "p99 2px, max 2px" over a slice DEFINED as at or under that bar, which is circular and supports no threshold at all.

- Repeatability: 82 readings measured twice on one page, max delta-of-deltas 0px. Nothing above that is measurement noise.
- Population: all 5028 readings in the run.
- Raw magnitude: p50 0px, p90 0.75px, p99 15.28px, max 73.75px (2290 of 5028 readings non-zero).
- Residual magnitude: p50 0px, p90 0.57px, p99 1.88px, max 71.69px (2258 of 5028 readings non-zero).

| Candidate threshold | Readings above it | Rows above it | Rows above it this run does not disposition |
| --- | --- | --- | --- |
| 1px | 226 | 28 | 18 |
| 1.5px | 100 | 15 | 8 |
| 2px | 36 | 7 | 0 |
| 2.5px | 16 | 3 | 0 |
| 3px | 16 | 3 | 0 |
| 4px | 12 | 2 | 0 |
| 5px | 12 | 2 | 0 |

NEITHER DISTRIBUTION IS A NOISE FLOOR. The full distribution contains the defects, so its own p99 is pulled up by them, and any statistic over "the readings under the bar" is a statistic about the bar. Nor is the residual spread of the composition-explained rows a floor, which is what the previous emission used: that set is defined as raw above the bar AND residual within it, so its maximum is bounded by the bar BY CONSTRUCTION and is a lower bound rather than an estimate of anything. Its largest readings are not method error either; they are constant offsets that the same rows also read at the widths where nothing wraps and no term is taken at all.

The population that does answer the question is a WITHIN-READING one, and it needs no selection at all: any reading this run measured both wrapped (a composition term is taken) and unwrapped (none is). The decomposition claims those two renderings leave the same residual, so how far apart they land IS the method's own error, measured on the corpus rather than assumed.

- 8 readings render both ways in this run. Landing error, wrapped against unwrapped: max 0.1px, median 0px.
  - `b6f2153a` icon:svg>text:Check the date before you publish>content-centre: 1.48px wrapped over 8 readings, 1.39px unwrapped over 12.
  - `d87b4ff1` text:Does the FAQ component support formattin>icon:svg>content-centre: 1.13px wrapped over 8 readings, 1.16px unwrapped over 12.
  - `a4b8e440` text:Saving commits your tag list to the site>control:Save changes>content-centre: 0.43px wrapped over 2 readings, 0.44px unwrapped over 4.

The floor this run supports is 0.1px: the larger of run-to-run jitter (0px) and the decomposition's own landing error (0.1px). Everything above that is a REPRODUCIBLE offset rather than noise, including the 1 to 1.5px readings the previous emission called a floor, which hold to the hundredth across five widths and both themes.

The smallest confirmed defect measures 2.33px, so the window a threshold can sit in is [0.1, 2.33), which is wide. WHAT CONSTRAINS THE CHOICE INSIDE IT IS POLICY, NOT PRECISION: whether an offset of one or two pixels that holds at every width is worth a finding. The cost of each candidate is the last column above, and it is not zero anywhere below the bar: 151 rows in total sit between the floor and the 2px bar that this run neither inventories nor explains away, so a threshold under the bar starts reporting work nobody has sized. Task 4 picks inside the window and records what it gives up at the top and takes on at the bottom.

### Rows between the floor and the bar, unsized

Neither inventoried nor explained: their residual clears the floor and stays within the bar, so no disposition above covers them. They are listed so a threshold below the bar is chosen with them in view rather than discovered by the re-run, and every row reaching 1px carries a crop, so sizing one is a matter of opening it.

ONE FAMILY LEFT THIS TABLE AT THIS EMISSION, and how it left is the warning the next reader needs. Fifteen `ConceptList` rows read EXACTLY 1.55px each, in one shape, which looked like a family of latent work sitting just under the bar. They were the metric defect above: a status chip beside a date cell in a `vertical-align: middle` row, scored on baselines, where the 1.55px was the cap-height ratio between 10px chip type and 13px cell type and nothing else. Read at centres they measure 0.05px, the chip box against the date's cap band, and the crop shows the chip optically centred on the date. THEY ARE NOT THE SAME DEFECT as the three `CairnTidySettings` rows above, which miss a baseline their own row declared. A row sitting under the bar is not evidence of anything until its metric is right.

ONE FAMILY ARRIVED IN THE SAME CORRECTION, and it is the honest cost of it. The eight `CairnMediaLibrary` rows at the top of this table are an outlined status pill beside a media title in a centred row, and reading the pill at its painted box is what made them visible: the outline sits 1.88px below the title's cap band, because the pill is an `inline-flex` on a 16px line box inside a 10px chip. Under the old metric they read as two runs of text on a shared baseline and measured nothing. The crop at 5x shows the pill sitting a touch low, which is what 1.88px looks like. They stay under the bar and stay unsized here, but a threshold at 1.5px adopts all eight and they are one recipe, not eight.

| Id | Surface | Members | Component file | Worst residual (px) | Pair class | `align-items` | Crop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fa343d61` | admin | text:Mountain pass + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/fa343d61-admin-media-mountain-pass-1440.png` |
| `1a9a5d00` | admin | text:Sunset orphan + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/1a9a5d00-admin-media-sunset-orphan-1440.png` |
| `09e6b2e8` | admin | text:Untagged shot + text:Needs alt | row container `src/lib/components/CairnMediaLibrary.svelte`; text from `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/MediaFigureControl.svelte`, `src/lib/components/MediaHeroField.svelte`, `src/lib/components/MediaPicker.svelte` (UNVERIFIED, matched on the rendered text "Needs alt", which appears in 4 files) | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/09e6b2e8-admin-media-untagged-shot-1440.png` |
| `cf308e9d` | admin | text:First light + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/cf308e9d-admin-media-first-light-1440.png` |
| `1e887ca3` | admin | text:Pass C unused + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/1e887ca3-admin-media-pass-c-unused-1440.png` |
| `036a7add` | admin | text:Pass c broken + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/036a7add-admin-media-pass-c-broken-1440.png` |
| `b006e8ce` | admin | text:Hello hero + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/b006e8ce-admin-media-hello-hero-1440.png` |
| `839a5ef1` | admin | text:Draft banner + text:Described | row container `src/lib/components/CairnMediaLibrary.svelte` | 1.88 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/839a5ef1-admin-media-draft-banner-1440.png` |
| `81a8a034` | admin | text:New + box:span | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/81a8a034-styleguide-new-320.png` |
| `58edb6e3` | admin | control:input + text:Describe it | row container `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/MediaCaptureCard.svelte` (UNVERIFIED, matched on the container class run `flex cursor-pointer items-center gap-2`, which appears in 2 files); text from `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/MediaFigureControl.svelte`, `src/lib/components/MediaHeroField.svelte` (UNVERIFIED, matched on the rendered text "Describe it", which appears in 3 files) | 1.5 | control-beside-text | center | `/tmp/cairn-vertical-alignment/crops/58edb6e3-admin-media-detail-describe-it-1440.png` |
| `c2e3de52` | admin | control:input + text:Decorative | row container `src/lib/components/CairnMediaLibrary.svelte`, `src/lib/components/MediaCaptureCard.svelte` (UNVERIFIED, matched on the container class run `flex cursor-pointer items-center gap-2`, which appears in 2 files) | 1.5 | control-beside-text | center | `/tmp/cairn-vertical-alignment/crops/c2e3de52-admin-media-detail-decorative-1440.png` |
| `c5013b94` | public | text:Primary + box:button | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/c5013b94-styleguide-primary-320.png` |
| `fbce50f7` | public | text:Outline + box:button | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/fbce50f7-styleguide-outline-320.png` |
| `f3f8271a` | public | text:Ghost + box:button | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/f3f8271a-styleguide-ghost-320.png` |
| `0d51227d` | public | text:Markdown + box:span | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/0d51227d-styleguide-markdown-320.png` |
| `6dd90b88` | public | text:Cloudflare + box:span | unattributed (no class run and no rendered text resolves to a file) | 1.5 | optical-suspect | center | `/tmp/cairn-vertical-alignment/crops/6dd90b88-styleguide-cloudflare-320.png` |
| `9cd4a6ed` | public | text:Read the guide + text:an example pointer + icon:svg | unattributed (no class run and no rendered text resolves to a file) | 1.35 | icon-beside-text | center | `/tmp/cairn-vertical-alignment/crops/9cd4a6ed-styleguide-an-example-pointer-2560.png` |
| `c4775ffb` | admin | text:Fixes + text:On | row container `src/lib/components/CairnTidySettings.svelte`, `src/lib/components/EditPage.svelte`, `src/lib/components/VocabularyAdmin.svelte` (UNVERIFIED, matched on the container class run `flex items-center gap-2 type-heading font-bold font-[family-name:var(--font-display)]`, which appears in 3 files) | 1.28 | text-beside-text | center | `/tmp/cairn-vertical-alignment/crops/c4775ffb-admin-settings-fixes-1440.png` |
| `26dfe10e` | admin | text:⌘K + box:kbd | row container `src/lib/components/CairnAdminShell.svelte` | 1 | optical-suspect | normal | none |
| `973c560e` | admin | control:input + text:trail-reports + text:2 posts + control:button | row container `src/lib/components/VocabularyAdmin.svelte` | 1 | control-beside-text | center | none |
| `3c6042f4` | admin | control:input + text:gear + text:1 post + control:button | row container `src/lib/components/VocabularyAdmin.svelte` | 1 | control-beside-text | center | none |
| `61c17c56` | admin | control:input + text:archive + text:Unused + control:button | row container `src/lib/components/VocabularyAdmin.svelte` | 1 | control-beside-text | center | none |
| `d81b6f59` | public | text:26 Jun 2026 + text:Late-season notes from the high col | unattributed (no class run and no rendered text resolves to a file) | 1 | text-beside-text | start | none |
| `4655e6c3` | public | text:19 Jun 2026 + text:Catching the storm window | unattributed (no class run and no rendered text resolves to a file) | 1 | text-beside-text | start | none |
| `f6f271e9` | public | text:12 Jun 2026 + text:A pack list that travels light | unattributed (no class run and no rendered text resolves to a file) | 1 | text-beside-text | start | none |
| ... 126 more | | | | | | | |

## Unmeasured

Listed rather than omitted, so the zero-rows claim above stays a claim about what was measured. A state absent here is a state no row was found in because none was rendered.

- **hover**: no pointer is over any element in a headless sweep, so no `:hover` row is composed here
- **focus / focus-visible**: nothing is tabbed to, so a focus ring (which can change a border width and therefore a border-box centre) is never on screen
- **validation / error**: no form is submitted, so no error line renders below a control; this is exactly the shape the FieldRow caveat names, and it is unmeasured here
- **loading / pending**: no in-flight action is held open, so spinner and skeleton rows are unmeasured
- **Row members taller than 96px**: excluded as layout objects rather than row members; 12 pairs fell out this way.
- **Members with no resolvable anchor**: 486.
- **Icons measured by element box** (no reachable painting geometry, so not an ink reading): 0.
- **Icons whose drawn extent a mask or unresolvable clip hides**: 0.
- **Pairs with no reading for their class's metric**: 0.
- **Interaction states not reachable on some renders**:
  - admin-edit-details-open at 390px / light: state "details-open" not reachable
  - admin-edit-details-open at 390px / dark: state "details-open" not reachable
  - admin-menu-open at 1440px / light: state "menu-open" not reachable
  - admin-menu-open at 768px / light: state "menu-open" not reachable
  - admin-menu-open at 390px / light: state "menu-open" not reachable
  - admin-menu-open at 1440px / dark: state "menu-open" not reachable
  - admin-menu-open at 768px / dark: state "menu-open" not reachable
  - admin-menu-open at 390px / dark: state "menu-open" not reachable
