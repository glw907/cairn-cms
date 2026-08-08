# Vertical-alignment inventory (measured, both corpora)

Emitted by `scripts/probe-vertical-alignment.mjs` against a running showcase preview. Re-run the probe to regenerate this file; it is a measurement record, not a hand-maintained doc.

## The three measurement traps

Verbatim from the ratified design spec, and binding on every artifact that measures vertical alignment (this probe, the shared module, the rendered rule, and every fixture assertion). Each one is a wrong answer a real probe already produced against a real screen.

1. **Pair with the line, not the block.** An icon beside a multi-line text block aligns with the block's FIRST LINE BOX, not the block. Comparing against the whole block reported 29 to 68px of phantom delta on rows that were correctly composed.
2. **Read type metrics off the element that renders the line.** Reading font metrics from the text CONTAINER rather than the rendering element returned -0.4px ("this row is fine") on the row whose icons visibly ride high. Resolve the metrics from the computed style of the element that owns the line box.
3. **Measure ink, not element boxes.** An SVG's element box centres while its drawn ink rides high. Icon geometry is the ink bounds: `getBBox()` mapped through the screen CTM. Text geometry is the glyph box: `getClientRects()` on a `Range`, with cap-centre for title-class comparisons. Element boxes are acceptable ONLY for controls whose border box is the visual object.

The metric follows the pair's class: text-beside-text compares BASELINES (a mixed-size pair sharing a baseline is correct typography whose glyph centres diverge by design, and this class must not report such a pair as a defect); icon-beside-text and control-beside-text compare visible-content (ink) centres; the optical suspects compare glyph centre against padding-box centre. Reporting bar: 2px.

## How a reading is decomposed, and why the raw delta is not the defect

Trap 1 answers WHICH LINE a member pairs with. It does not answer whether the member should pair with a line at all, and the first emission of this inventory assumed it did. Where a row centres its members and its text block WRAPS, the row has deliberately centred the other member on the whole block, so a reading taken against the first line is short by half the block's extra height: a number that grows with the line count and swings with the viewport width on pixels nobody should touch.

Every reading is therefore split, with no extra measurement:

```
raw delta = composition + residual
composition = b.blockLift - a.blockLift   (the wrapped block the row chose to centre on)
blockLift   = (text extent centre) - (first line band centre), 0 on a single line
```

The composition term is taken where the row asked for it and nowhere else: on an optical suspect always, since its padding box spans every line by construction; on a row whose two members both resolve `align-self` to `center`; on nothing else, because under `flex-start`, `start`, `baseline` and `stretch` the first line IS what the row aligns to, and the raw delta is already the defect. NOT MODELLED, and left to a reviewed ruling rather than folded in silently: an `end`-aligned row pairs with the block's LAST line, and a grid member spanning several rows centres on its span.

THE BAR APPLIES TO THE RESIDUAL, and so does every disposition. The raw delta is kept in its own column because it is what a reader sees on screen, not because it is evidence.

## Calibration (synthetic, and why)

NEITHER CORPUS STILL EXHIBITS THE CALIBRATION DEFECTS. The stacked-register field components have no call sites in the engine's admin components or the showcase routes, and the one consumer that composed the icon-card shape has already fixed its instances. There is therefore no live screen to calibrate against, which is why both calibration cases are SYNTHETIC fixtures reproducing the measured defects. The probe renders both before it touches either corpus and refuses to emit if it misses either one on sign or magnitude.

Both fixtures are composed so their composition term is zero, which makes this check the guard on the decomposition as well: a rule that started explaining real defects away as composition fails here rather than quietly emptying the inventory.

- `season-row` (control-beside-control): expected sign +, magnitude 11.5 to 13.5px; measured 12.5px residual, 0px composition. PASS.
- `icon-card` (icon-beside-text): expected sign -, magnitude 2.8 to 5.1px; measured -3.5px residual, 0px composition. PASS.

## The run

- Admin corpus: 14 screens at 1440, 768, 390px, both themes.
- Public corpus: 3 screens at 320, 390, 768, 1440, 2560px, both themes.
- Renders measured: 106. Pairs measured: 5028.
- Visual rows walked: 2800. Distinct compositions: 359.
- Rows above the 2px bar ON THE RESIDUAL: 13 (admin 12, public 1).
- Rows whose RAW delta clears the bar and whose residual does not: 23. Their composition explains them in full, and they are not inventoried.
- Crops and the full per-pair record: `/tmp/cairn-vertical-alignment`.

A ROW HERE IS ONE VISUAL ROW, not one pair and not one render. A three-member row (a leading icon, a run of text, a trailing control) is two READINGS of one row, both listed under one entry: the first emission keyed on the pair and inventoried that row twice, with mirrored signs and identical magnitudes. The same row seen at several widths or in both themes is likewise one entry carrying every width and theme it was seen at.

The full per-pair record, all 5028 readings including every sub-bar one, is written to `/tmp/cairn-vertical-alignment/measured-pairs.json`. It carries each member's whole anchor (top, bottom, content centre, element centre, baseline, cap centre, line count, block lift, `align-self`) alongside the delta, the composition and the residual, so a disagreement about any reading here is settled by reading that file rather than by re-running the probe against a live preview.

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
| 1 | `52225d2e` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -71.69 | 0 | -71.69 | `/tmp/cairn-vertical-alignment/crops/52225d2e-admin-settings-fixes-1440.png` | DECLINE (reviewed, a design call): the row declares `items-end` and bottom-aligns its trailing action against a three-line block on purpose, so the reading pairs the control with the block's FIRST line while the composition pairs it with the last. `end` alignment is the case the composition term does not model, stated as a limitation rather than folded in. Crop read: the "Turn off" control sits on the last line of the Fixes card, which is correct as built. |
| 2 | `22a0e709` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 11.5 | 0 | 11.5 | `/tmp/cairn-vertical-alignment/crops/22a0e709-admin-settings-tidy-is-set-up-for-this-site-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 3 | `043ff649` | admin | admin-settings (`/admin/settings`) | 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 11.5 | 0 | 11.5 | `/tmp/cairn-vertical-alignment/crops/043ff649-admin-settings-tidy-is-set-up-for-this-site-390.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 4 | `a1f335e1` | admin | admin-vocabulary (`/admin/vocabulary`) | 390 | dark, light | `src/lib/components/VocabularyAdmin.svelte` | control-beside-control | -10 | 0 | -10 | `/tmp/cairn-vertical-alignment/crops/a1f335e1-admin-vocabulary-input-390.png` | DECLINE (reviewed, a design call): the delete control spans BOTH grid rows of the tag entry and centres on the pair, while the input occupies the first row alone. A multi-row grid span is the other case the composition term does not model. Crop read: the trash control sits between the input and the slug line, which is correct as built. |
| 5 | `c619e469` | admin | admin-media, admin-media-detail (`/admin/media`) | 1440, 768 | dark, light | `src/lib/components/CairnMediaLibrary.svelte` | control-beside-text | -9 | 0 | -9 | `/tmp/cairn-vertical-alignment/crops/c619e469-admin-media-media-1440.png` | task 2 (admin toolkit): centre the control against the line it sits beside, not against the block. |
| 6 | `94f150f3` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 5.5 | 0 | 5.5 | `/tmp/cairn-vertical-alignment/crops/94f150f3-admin-settings-tidy-will-fix-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 7 | `1728754a` | admin | admin-dialog-open, admin-edit-details-open, admin-editors, admin-media, admin-media-detail, admin-pages, admin-palette-open, admin-posts, admin-posts-2026-06-hello, admin-settings, admin-vocabulary (`/admin/posts`) | 1440 | dark, light | `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/ConfirmPage.svelte`, `src/lib/components/LoginPage.svelte` (UNVERIFIED, matched on the class run `text-[1.375rem] font-semibold font-[family-name:var(--font-display)]`) | text-beside-text | 3.5 | 0 | 3.5 | `/tmp/cairn-vertical-alignment/crops/1728754a-admin-posts-cairn-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 8 | `290376a5` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/290376a5-admin-settings-tidy-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 9 | `24a343fe` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/24a343fe-admin-settings-api-key-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 10 | `c2ab4dc7` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | 0 | -2.5 | `/tmp/cairn-vertical-alignment/crops/c2ab4dc7-admin-settings-model-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 11 | `689c8adb` | admin | admin-vocabulary (`/admin/vocabulary`) | 1440, 768, 390 | dark, light | `src/lib/components/VocabularyAdmin.svelte` | text-beside-text | 2.5 | 0 | 2.5 | `/tmp/cairn-vertical-alignment/crops/689c8adb-admin-vocabulary-your-tags-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 12 | `76d4cd3e` | admin | admin-edit-details-open, admin-posts-2026-06-hello (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | unattributed (no rendered text and no class run resolves to a file) | icon-beside-text | -2.33 | 0 | -2.33 | `/tmp/cairn-vertical-alignment/crops/76d4cd3e-admin-posts-2026-06-hello-write-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 13 | `dabaf490` | public | site-article, site-home, styleguide (`/`) | 2560, 1440, 768, 390 | dark, light | `examples/showcase/src/theme/components/SiteFooter.svelte` | text-beside-text | 2.78 to 4.39 | 0 | 2.78 to 4.39 | `/tmp/cairn-vertical-alignment/crops/dabaf490-site-home-waymark-390.png` | task 3 (Waymark chassis): the two runs share a row but not a baseline; set them on one baseline. |

### What each row is

One line per READING. A row with more than one line is one composition measured at more than one pair of members, not more than one row. A row whose member list CHANGES with the viewport (a member hidden below a breakpoint) is two compositions and reports as two rows, which is why the same recipe can appear twice with different widths: the members column shows the difference.

| # | Id | Row container | Members | Reading | Left member | Right member | Shape | `align-items` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `52225d2e` | `div.mb-3.flex.items-end.gap-3` | text:Fixes + control:Turn off | -71.69px residual | text/glyph `h2.flex.items-center.gap-2.type-heading` "Fixes" (3 lines, lift 29.03px) | control/element-box `button.px-0\.5.py-1.type-meta.text-muted` "Turn off" | control beside text | flex-end |
| 2 | `22a0e709` | `div.mt-6.flex.items-start.gap-3` | icon:svg + text:Tidy is set up for this site + text:Set by your developer | 11.5px residual | icon/ink `svg.lucide-icon.lucide.lucide-code-xml.h-5` | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" (9 lines, lift 106.94px) | icon beside text | flex-start |
| 2 | `22a0e709` | `div.mt-6.flex.items-start.gap-3` | icon:svg + text:Tidy is set up for this site + text:Set by your developer | -4px residual | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" (9 lines, lift 106.94px) | text/glyph `span.mt-0\.5.hidden.flex-none.items-center` "Set by your developer" | text beside text | flex-start |
| 3 | `043ff649` | `div.mt-6.flex.items-start.gap-3` | icon:svg + text:Tidy is set up for this site | 11.5px residual | icon/ink `svg.lucide-icon.lucide.lucide-code-xml.h-5` | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" (19 lines, lift 210.44px) | icon beside text | flex-start |
| 4 | `a1f335e1` | `div.grid.grid-cols-\[1fr_auto\].items-center.gap-x-4` | control:input + control:button | -10px residual | control/element-box `input.input.input-sm.col-start-1.row-start-1` | control/element-box `button.col-start-2.row-start-1.row-span-2.inline-flex` | control beside control | center |
| 5 | `c619e469` | `header.mb-10.flex.flex-col.gap-3` | text:Media + control:Upload | -9px residual | text/glyph `span.type-label.font-semibold.uppercase.tracking-\[0\.08em\]` "Media" (3 lines, lift 28.5px) | control/element-box `button.btn.btn-sm.shrink-0.border-transparent` "Upload" | control beside text | flex-start |
| 6 | `94f150f3` | `div.mb-6.mt-6.flex.items-start` | icon:svg + text:Tidy will fix | 5.5px residual | icon/ink `svg.lucide-icon.lucide.lucide-list.h-4` | text/glyph `span.font-semibold` "Tidy will fix" (2 lines, lift 10.56px) | icon beside text | flex-start |
| 7 | `1728754a` | `a.flex.items-center.gap-2\.5.rounded-field` | icon:svg + text:Cairn + text:CMS | 3.5px residual | text/glyph `span.text-\[1\.375rem\].font-semibold.font-\[family-name\:var\(--font-display\)\]` "Cairn" | text/glyph `span.cairn-chip-quiet.rounded-md.px-1\.5.py-px` "CMS" | text beside text | center |
| 7 | `1728754a` | `a.flex.items-center.gap-2\.5.rounded-field` | icon:svg + text:Cairn + text:CMS | 0.17px residual | icon/ink `svg.h-5.w-5` | text/glyph `span.text-\[1\.375rem\].font-semibold.font-\[family-name\:var\(--font-display\)\]` "Cairn" | icon beside text | center |
| 8 | `290376a5` | `div.flex.flex-col.gap-1.type-meta` | text:Tidy + text:On for this site | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Tidy" | text/glyph `span` "On for this site" | text beside text | baseline |
| 9 | `24a343fe` | `div.flex.flex-col.gap-1.type-meta` | text:API key + text:Set, and kept on the server | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "API key" | text/glyph `span` "Set, and kept on the server" | text beside text | baseline |
| 10 | `c2ab4dc7` | `div.flex.flex-col.gap-1.type-meta` | text:Model + text:Claude Sonnet | -2.5px residual | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Model" | text/glyph `span` "Claude Sonnet" | text beside text | baseline |
| 11 | `689c8adb` | `h2.flex.items-center.gap-2.type-heading` | text:Your tags + text:3 | 2.5px residual | text/glyph `h2.flex.items-center.gap-2.type-heading` "Your tags" | text/glyph `span.rounded-full.bg-base-content\/\[0\.06\].px-2.py-0\.5` "3" | text beside text | center |
| 12 | `76d4cd3e` | `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` | icon:svg + text:Write | -2.33px residual | icon/ink `svg.h-4.w-4` | text/glyph `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` "Write" | icon beside text | center |
| 13 | `dabaf490` | `div.mx-auto.flex.max-w-measure.flex-wrap` | text:Waymark + text:Writing | 2.78 to 4.39px residual | text/glyph `span.font-display.text-step-1.font-semibold.tracking-tight` "Waymark" | text/glyph `a.inline-flex.min-h-11.items-center.px-xs` "Writing" | text beside text | center |

## Disposition summary

| Disposition | Rows |
| --- | --- |
| task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. | 5 |
| task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). | 4 |
| DECLINE (reviewed, a design call): the row declares `items-end` and bottom-aligns its trailing action against a three-line block on purpose, so the reading pairs the control with the block's FIRST line while the composition pairs it with the last. `end` alignment is the case the composition term does not model, stated as a limitation rather than folded in. Crop read: the "Turn off" control sits on the last line of the Fixes card, which is correct as built. | 1 |
| DECLINE (reviewed, a design call): the delete control spans BOTH grid rows of the tag entry and centres on the pair, while the input occupies the first row alone. A multi-row grid span is the other case the composition term does not model. Crop read: the trash control sits between the input and the slug line, which is correct as built. | 1 |
| task 2 (admin toolkit): centre the control against the line it sits beside, not against the block. | 1 |
| task 3 (Waymark chassis): the two runs share a row but not a baseline; set them on one baseline. | 1 |

Rows owned by task 2 (admin): 10. Rows owned by task 3 (chassis): 1. Explicit declines: 2.

A decline is one of two things, and each row says which. A MECHANICAL decline is the measurement disqualifying its own reading (an icon with no reachable painting geometry, so the number is a border box rather than ink). A REVIEWED decline is a design call the arithmetic cannot reach, ruled on after reading the crop. The reviewed rulings live in the probe (`REVIEWED_DISPOSITIONS`), keyed by the Id column, because a re-run overwrites this file and a ruling kept only here would be erased by the run that is supposed to verify it.

The Id is built from the row container's TAG and its members' kinds and rendered text, never from classes. Tasks 2 and 3 change classes, so a class-bearing key would silently drop every ruling on the verification re-run and re-report those rows as fresh recipe work. A ruling whose Id no longer resolves is reported below rather than dropped.

### Ruling keys

All 2 reviewed rulings resolved to a row in this run.

### Rows the composition explains in full

23 rows carry a raw delta above the bar and a residual within it. Each one is a row that centres its members on a block its text wraps, which is what the composition term is for. They are listed rather than omitted, because the first emission reported them as defects and a reader comparing the two documents is owed the reason they left.

| Id | Surface | Members | Component file | Raw delta reach (px) | Worst residual (px) | `align-items` |
| --- | --- | --- | --- | --- | --- | --- |
| `10c7c58e` | admin | text:Spelling, grammar, doubled words, spacin + control:On | `src/lib/components/CairnTidySettings.svelte` | 73.75 | 0.43 | center |
| `b1c950e4` | admin | icon:svg + text:Advanced + icon:svg | `src/lib/components/CairnTidySettings.svelte` | 27.31 | 0.07 | center |
| `d87b4ff1` | public | text:Does the FAQ component support formattin + icon:svg | unattributed (no rendered text and no class run resolves to a file) | 25.14 | 1.21 | center |
| `1e3e4f0f` | admin | text:Time format + control:Off | `src/lib/components/CairnTidySettings.svelte` | 24.19 | 0.44 | center |
| `3ae7ac06` | admin | text:Measurements and units + control:Off | `src/lib/components/CairnTidySettings.svelte` | 24.19 | 0.44 | center |
| `d5ff01bb` | admin | text:Em-dash style + control:Off | `src/lib/components/CairnTidySettings.svelte` | 24.18 | 0.44 | center |
| `a8ca6454` | admin | text:Number style + control:Off | `src/lib/components/CairnTidySettings.svelte` | 24.18 | 0.44 | center |
| `31c6aeb2` | admin | text:DE + text:Demo Editor | `src/lib/components/CairnAdminShell.svelte`, `src/lib/components/MediaPicker.svelte` (UNVERIFIED, matched on the class run `truncate type-body font-medium`) | 15.5 | 0.5 | center |
| `6fdf76aa` | admin | icon:svg + text:Add hero image | `src/lib/components/MediaHeroField.svelte` | 14.5 | 0 | center |
| `b2adb6a6` | admin | text:Style conventions + text:2 on | `src/lib/components/CairnTidySettings.svelte` | 13.28 | 0.72 | center |
| `92c74389` | public | text:Read the getting-started guide + icon:svg | unattributed (no rendered text and no class run resolves to a file) | 12.5 | 0.5 | center |
| `66bc3216` | admin | text:En-dash in number ranges + control:Off | `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `ff5b1250` | admin | text:Ellipsis + control:Off | `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `d135a865` | admin | text:Percent + control:Off | `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `753f4409` | admin | text:Curly quotes + control:On | `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `fd22c19a` | admin | text:Brand and proper-noun capitals + control:Off | `src/lib/components/CairnTidySettings.svelte` | 12.25 | 0.44 | center |
| `b6f2153a` | public | icon:svg + text:Check the date before you publish | unattributed (no rendered text and no class run resolves to a file) | 10.98 | 1.49 | center |
| `90c0864b` | admin | text:Saving applies your choices for every ed + control:Save changes | `src/lib/components/CairnTidySettings.svelte` | 9.38 | 0.44 | center |
| `fc839e96` | admin | icon:svg + text:Saving applies your choices for every ed | `src/lib/components/CairnTidySettings.svelte` | 9.38 | 0.44 | center |
| `a4b8e440` | admin | text:Saving commits your tag list to the site + control:Save changes | `src/lib/components/VocabularyAdmin.svelte` | 9.37 | 0.44 | center |
| `8c420e10` | admin | text:This image leads the page, and it is the + box:p | `src/lib/components/MediaHeroField.svelte` | 8.13 | 0.57 | normal |
| `0256679d` | admin | text:as written, following your site's Englis + box:span | `src/lib/components/CairnTidySettings.svelte` | 7.5 | 0.5 | normal |
| `ef917e33` | admin | text:Drop an image here, or pick from the lib + box:span | `src/lib/components/MediaHeroField.svelte` | 7 | 0 | normal |

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
- Raw magnitude: p50 0px, p90 1.21px, p99 14.5px, max 73.75px (2226 of 5028 readings non-zero).
- Residual magnitude: p50 0px, p90 1px, p99 3.5px, max 71.69px (2216 of 5028 readings non-zero).

| Candidate threshold | Readings above it | Rows above it |
| --- | --- | --- |
| 1px | 396 | 41 |
| 1.5px | 282 | 30 |
| 2px | 108 | 13 |
| 2.5px | 82 | 8 |
| 3px | 76 | 8 |
| 4px | 38 | 7 |
| 5px | 32 | 6 |

NEITHER OF THOSE IS A NOISE FLOOR ON ITS OWN. The full distribution contains the defects, so its own p99 is pulled up by them; and any statistic taken over "the readings under the bar" is a statistic about the bar. The population that answers the question is the rows the composition explains in full: they were selected by their RAW delta clearing the bar, which is a different variable from the residual, so their residual spread is an estimate of how close to zero this method lands on a row that is correct as built.

- Residual on the 23 composition-explained rows: p50 0.49px, p90 1.21px, p99 1.49px, max 1.49px (186 of 196 readings non-zero).

The floor this run supports is 1.49px: the larger of run-to-run jitter (0px) and the worst residual on any row whose composition explains it in full (1.49px). For reference, the worst residual on a row this inventory declines by review is 71.69px, and those two rows are compositions the term does not model rather than measurement noise.

The smallest confirmed defect measures 2.33px, so any threshold in [1.49, 2.33) fires on every confirmed row and on nothing this run explains away. That window is narrow, and it is narrow because the method lands close to zero rather than because the defects are large: task 4 picks inside it and records what a wider threshold would give up.

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
