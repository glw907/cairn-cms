# Vertical-alignment inventory (measured, both corpora)

Emitted by `scripts/probe-vertical-alignment.mjs` against a running showcase preview. Re-run the probe to regenerate this file; it is a measurement record, not a hand-maintained doc.

## The three measurement traps

Verbatim from the ratified design spec, and binding on every artifact that measures vertical alignment (this probe, the shared module, the rendered rule, and every fixture assertion). Each one is a wrong answer a real probe already produced against a real screen.

1. **Pair with the line, not the block.** An icon beside a multi-line text block aligns with the block's FIRST LINE BOX, not the block. Comparing against the whole block reported 29 to 68px of phantom delta on rows that were correctly composed.
2. **Read type metrics off the element that renders the line.** Reading font metrics from the text CONTAINER rather than the rendering element returned -0.4px ("this row is fine") on the row whose icons visibly ride high. Resolve the metrics from the computed style of the element that owns the line box.
3. **Measure ink, not element boxes.** An SVG's element box centres while its drawn ink rides high. Icon geometry is the ink bounds: `getBBox()` mapped through the screen CTM. Text geometry is the glyph box: `getClientRects()` on a `Range`, with cap-centre for title-class comparisons. Element boxes are acceptable ONLY for controls whose border box is the visual object.

The metric follows the pair's class: text-beside-text compares BASELINES (a mixed-size pair sharing a baseline is correct typography whose glyph centres diverge by design, and this class must not report such a pair as a defect); icon-beside-text and control-beside-text compare visible-content (ink) centres; the optical suspects compare glyph centre against padding-box centre. Reporting bar: 2px.

## Calibration (synthetic, and why)

NEITHER CORPUS STILL EXHIBITS THE CALIBRATION DEFECTS. The stacked-register field components have no call sites in the engine's admin components or the showcase routes, and the one consumer that composed the icon-card shape has already fixed its instances. There is therefore no live screen to calibrate against, which is why both calibration cases are SYNTHETIC fixtures reproducing the measured defects. The probe renders both before it touches either corpus and refuses to emit if it misses either one on sign or magnitude.

- `season-row` (control-beside-control): expected sign +, magnitude 11.5 to 13.5px; measured 12.5px. PASS.
- `icon-card` (icon-beside-text): expected sign -, magnitude 2.8 to 5.1px; measured -3.5px. PASS.

## The run

- Admin corpus: 14 screens at 1440, 768, 390px, both themes.
- Public corpus: 3 screens at 320, 390, 768, 1440, 2560px, both themes.
- Renders measured: 106. Pairs measured: 5028.
- Visual rows walked: 2800.
- Rows above the 2px bar: 37 (admin 33, public 4).
- Crops and the full per-pair record: `/tmp/cairn-vertical-alignment`.

A ROW HERE IS ONE DISTINCT COMPOSITION above the bar, not one render: the same pair seen at several widths or in both themes is one row carrying every width and theme it was seen at. The full per-pair record, all 5028 readings including the sub-bar population, is written to `/tmp/cairn-vertical-alignment/measured-pairs.json` rather than printed here.

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

Delta sign: NEGATIVE means the left-hand member rides HIGH against the right-hand member; on an optical row, negative means the glyph rides high inside its own padding box. Every row carries a disposition: a recipe task, or an explicit decline with its reason. No row reads "unknown".

| # | Id | Surface | Screens / routes | Viewport | Theme | Component file | Pair class | Delta (px) | Crop | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `3cf1e40a` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -71.69 | `/tmp/cairn-vertical-alignment/crops/3cf1e40a-admin-settings-fixes-1440.png` | DECLINE: the row declares `items-end` and bottom-aligns a trailing action against a multi-line heading block on purpose. Measured against the block first line by convention. |
| 2 | `ce3328e0` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 9.44 to 27.31 | `/tmp/cairn-vertical-alignment/crops/ce3328e0-admin-settings-advanced-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 3 | `1a77b8c1` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -73.75 to -24.18 | `/tmp/cairn-vertical-alignment/crops/1a77b8c1-admin-settings-spelling-grammar-doubled-words-spacin-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 4 | `0fcf96df` | admin | admin-dialog-open, admin-edit-details-open, admin-editors, admin-media, admin-media-detail, admin-pages, admin-palette-open, admin-posts, admin-posts-2026-06-hello, admin-settings, admin-vocabulary (`/admin/posts`) | 1440 | dark, light | `src/lib/components/CairnAdminShell.svelte` | text-beside-text | 15.5 | `/tmp/cairn-vertical-alignment/crops/0fcf96df-admin-posts-de-1440.png` | DECLINE: a monogram avatar centred against the identity block beside it. The monogram is a glyph inside a decorative circle, not a run of copy sharing the name line baseline. |
| 5 | `bee9c85f` | admin | admin-edit-details-open (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | `src/lib/components/MediaHeroField.svelte` | icon-beside-text | 14.5 | `/tmp/cairn-vertical-alignment/crops/bee9c85f-admin-edit-details-open-add-hero-image-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 6 | `5c379421` | admin | admin-settings (`/admin/settings`) | 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -13.28 | `/tmp/cairn-vertical-alignment/crops/5c379421-admin-settings-style-conventions-390.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 7 | `8d2ca62d` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -24.18 to -12.25 | `/tmp/cairn-vertical-alignment/crops/8d2ca62d-admin-settings-em-dash-style-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 8 | `925d0196` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -12.25 | `/tmp/cairn-vertical-alignment/crops/925d0196-admin-settings-en-dash-in-number-ranges-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 9 | `edee3887` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -12.25 | `/tmp/cairn-vertical-alignment/crops/edee3887-admin-settings-ellipsis-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 10 | `4fa6315e` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -24.19 to -12.25 | `/tmp/cairn-vertical-alignment/crops/4fa6315e-admin-settings-time-format-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 11 | `e4b61409` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -24.18 to -12.25 | `/tmp/cairn-vertical-alignment/crops/e4b61409-admin-settings-number-style-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 12 | `81f6d9a1` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -24.19 to -12.25 | `/tmp/cairn-vertical-alignment/crops/81f6d9a1-admin-settings-measurements-and-units-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 13 | `f0c5cd3b` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -12.25 | `/tmp/cairn-vertical-alignment/crops/f0c5cd3b-admin-settings-percent-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 14 | `fb82873f` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -12.25 | `/tmp/cairn-vertical-alignment/crops/fb82873f-admin-settings-curly-quotes-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 15 | `59c31af6` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -12.25 | `/tmp/cairn-vertical-alignment/crops/59c31af6-admin-settings-brand-and-proper-noun-capitals-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 16 | `51ff3d19` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 11.5 | `/tmp/cairn-vertical-alignment/crops/51ff3d19-admin-settings-tidy-is-set-up-for-this-site-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 17 | `d302f1be` | admin | admin-vocabulary (`/admin/vocabulary`) | 390 | dark, light | `src/lib/components/VocabularyAdmin.svelte` | control-beside-control | -10 | `/tmp/cairn-vertical-alignment/crops/d302f1be-admin-vocabulary-input-input-input-sm-col-start-1-row-start-1-390.png` | DECLINE: the delete control spans both grid rows of the tag entry and centres on the pair, which is why it reads high against the input on the first row alone. |
| 18 | `3bc77a75` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | -27.31 to -9.44 | `/tmp/cairn-vertical-alignment/crops/3bc77a75-admin-settings-advanced-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 19 | `d3c42eb8` | admin | admin-settings (`/admin/settings`) | 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -9.38 | `/tmp/cairn-vertical-alignment/crops/d3c42eb8-admin-settings-saving-applies-your-choices-for-every-ed-390.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 20 | `25223aec` | admin | admin-settings (`/admin/settings`) | 390 | dark, light | `src/lib/components/CairnMediaLibrary.svelte` | icon-beside-text | 9.38 | `/tmp/cairn-vertical-alignment/crops/25223aec-admin-settings-saving-applies-your-choices-for-every-ed-390.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 21 | `cd9aaff2` | admin | admin-vocabulary (`/admin/vocabulary`) | 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | control-beside-text | -9.37 | `/tmp/cairn-vertical-alignment/crops/cd9aaff2-admin-vocabulary-saving-commits-your-tag-list-to-the-site-390.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 22 | `21db619c` | admin | admin-media, admin-media-detail (`/admin/media`) | 1440, 768 | dark, light | `src/lib/admin-toolkit/OfficeList.svelte` | control-beside-text | -9 | `/tmp/cairn-vertical-alignment/crops/21db619c-admin-media-media-1440.png` | DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. |
| 23 | `87d0cd4a` | admin | admin-edit-details-open (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | `src/lib/components/CairnMediaLibrary.svelte` | optical-suspect | -8.13 | `/tmp/cairn-vertical-alignment/crops/87d0cd4a-admin-edit-details-open-this-image-leads-the-page-and-it-is-the-1440.png` | DECLINE: the optical reading is taken on a MULTI-LINE paragraph, so the glyph is the first line's cap centre while the padding box spans every line. Half a line of offset is arithmetic, not an optical defect. Input to task 4: scope the optical metric to a single-line glyph. |
| 24 | `48eafe60` | admin | admin-settings (`/admin/settings`) | 390 | dark, light | utility classes only, unattributed | optical-suspect | -7.5 | `/tmp/cairn-vertical-alignment/crops/48eafe60-admin-settings-as-written-following-your-site-s-englis-390.png` | DECLINE: the optical reading is taken on a MULTI-LINE paragraph, so the glyph is the first line's cap centre while the padding box spans every line. Half a line of offset is arithmetic, not an optical defect. Input to task 4: scope the optical metric to a single-line glyph. |
| 25 | `17caed5b` | admin | admin-edit-details-open (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | utility classes only, unattributed | optical-suspect | -7 | `/tmp/cairn-vertical-alignment/crops/17caed5b-admin-edit-details-open-drop-an-image-here-or-pick-from-the-lib-1440.png` | DECLINE: the optical reading is taken on a MULTI-LINE paragraph, so the glyph is the first line's cap centre while the padding box spans every line. Half a line of offset is arithmetic, not an optical defect. Input to task 4: scope the optical metric to a single-line glyph. |
| 26 | `8f8728e8` | admin | admin-settings (`/admin/settings`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | icon-beside-text | 5.5 | `/tmp/cairn-vertical-alignment/crops/8f8728e8-admin-settings-tidy-will-fix-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 27 | `23aa82ac` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -4 | `/tmp/cairn-vertical-alignment/crops/23aa82ac-admin-settings-tidy-is-set-up-for-this-site-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 28 | `169c7ca8` | admin | admin-dialog-open, admin-edit-details-open, admin-editors, admin-media, admin-media-detail, admin-pages, admin-palette-open, admin-posts, admin-posts-2026-06-hello, admin-settings, admin-vocabulary (`/admin/posts`) | 1440 | dark, light | `src/lib/components/CairnAdminShell.svelte` | text-beside-text | 3.5 | `/tmp/cairn-vertical-alignment/crops/169c7ca8-admin-posts-cairn-1440.png` | DECLINE: the right-hand member is a CHIP, a padded box optically centred against the line, not a run of copy sharing its baseline, so the baseline metric is the wrong reading for it. Input to task 4: a chip beside a run of text is not a text-beside-text pair. |
| 29 | `d166b4bf` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | `/tmp/cairn-vertical-alignment/crops/d166b4bf-admin-settings-tidy-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 30 | `90305f30` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | `/tmp/cairn-vertical-alignment/crops/90305f30-admin-settings-api-key-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 31 | `f8cf9149` | admin | admin-settings (`/admin/settings`) | 1440, 768 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | -2.5 | `/tmp/cairn-vertical-alignment/crops/f8cf9149-admin-settings-model-1440.png` | task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. |
| 32 | `dcd99e37` | admin | admin-vocabulary (`/admin/vocabulary`) | 1440, 768, 390 | dark, light | `src/lib/components/CairnTidySettings.svelte` | text-beside-text | 2.5 | `/tmp/cairn-vertical-alignment/crops/dcd99e37-admin-vocabulary-your-tags-1440.png` | DECLINE: the right-hand member is a CHIP, a padded box optically centred against the line, not a run of copy sharing its baseline, so the baseline metric is the wrong reading for it. Input to task 4: a chip beside a run of text is not a text-beside-text pair. |
| 33 | `e756ff3e` | admin | admin-edit-details-open, admin-posts-2026-06-hello (`/admin/posts/2026-06-hello`) | 1440, 768 | dark, light | utility classes only, unattributed | icon-beside-text | -2.33 | `/tmp/cairn-vertical-alignment/crops/e756ff3e-admin-posts-2026-06-hello-write-1440.png` | task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 34 | `fe8b661b` | public | site-article, styleguide (`/posts/the-reading-surface`) | 390, 320 | dark, light | utility classes only, unattributed | icon-beside-text | -25.14 to -13.13 | `/tmp/cairn-vertical-alignment/crops/fe8b661b-site-article-does-the-faq-component-support-formattin-320.png` | task 3 (Waymark chassis): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 35 | `e2613ac1` | public | site-article, styleguide (`/posts/the-reading-surface`) | 320 | dark, light | utility classes only, unattributed | icon-beside-text | -12.5 | `/tmp/cairn-vertical-alignment/crops/e2613ac1-site-article-read-the-getting-started-guide-320.png` | task 3 (Waymark chassis): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 36 | `046631e7` | public | site-article, styleguide (`/posts/the-reading-surface`) | 390, 320 | dark, light | utility classes only, unattributed | icon-beside-text | 10.97 to 10.98 | `/tmp/cairn-vertical-alignment/crops/046631e7-site-article-check-the-date-before-you-publish-320.png` | task 3 (Waymark chassis): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). |
| 37 | `3c615478` | public | site-article, site-home, styleguide (`/`) | 2560, 1440, 768, 390 | dark, light | `examples/showcase/src/theme/components/SiteFooter.svelte` | text-beside-text | 2.78 to 4.39 | `/tmp/cairn-vertical-alignment/crops/3c615478-site-home-waymark-390.png` | task 3 (Waymark chassis): the two runs share a row but not a baseline; set them on one baseline. |

### What each row is

| # | Id | Row container | Left member | Right member | Shape | `align-items` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `3cf1e40a` | `div.mb-3.flex.items-end.gap-3` | text/glyph `h2.flex.items-center.gap-2.type-heading` "Fixes" | control/element-box `button.px-0\.5.py-1.type-meta.text-muted` | control beside text | flex-end |
| 2 | `ce3328e0` | `summary.flex.cursor-pointer.list-none.items-center` | icon/ink `svg.lucide-icon.lucide.lucide-settings.h-4` | text/glyph `span.flex.items-center.gap-2.type-subtitle` "Advanced" | icon beside text | center |
| 3 | `1a77b8c1` | `div.flex.items-center.gap-4.p-3\.5` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Spelling, grammar, doubled words, spacin" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 4 | `0fcf96df` | `div.flex.items-center.gap-3` | text/glyph `span.type-body` "DE" | text/glyph `div.truncate.type-body.font-medium` "Demo Editor" | text beside text | center |
| 5 | `bee9c85f` | `button.flex.w-full.items-center.gap-2\.5` | icon/ink `svg.h-4.w-4` | text/glyph `span.type-meta.font-medium` "Add hero image" | icon beside text | center |
| 6 | `5c379421` | `h2.flex.items-center.gap-2.type-heading` | text/glyph `h2.flex.items-center.gap-2.type-heading` "Style conventions" | text/glyph `span.status-chip-label.svelte-ifolru` "2 on" | text beside text | center |
| 7 | `8d2ca62d` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Em-dash style" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 8 | `925d0196` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "En-dash in number ranges" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 9 | `edee3887` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Ellipsis" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 10 | `4fa6315e` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Time format" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 11 | `e4b61409` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Number style" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 12 | `81f6d9a1` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Measurements and units" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 13 | `f0c5cd3b` | `div.flex.gap-4.p-3\.5.border-t` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Percent" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 14 | `fb82873f` | `div.flex.items-center.gap-4.p-3\.5` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Curly quotes" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 15 | `59c31af6` | `div.flex.items-center.gap-4.p-3\.5` | text/glyph `div.type-subtitle.font-semibold.leading-snug` "Brand and proper-noun capitals" | control/element-box `button.inline-flex.h-\[30px\].items-center.gap-1\.5` | control beside text | center |
| 16 | `51ff3d19` | `div.mt-6.flex.items-start.gap-3` | icon/ink `svg.lucide-icon.lucide.lucide-code-xml.h-5` | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" | icon beside text | flex-start |
| 17 | `d302f1be` | `div.grid.grid-cols-\[1fr_auto\].items-center.gap-x-4` | control/element-box `input.input.input-sm.col-start-1.row-start-1` | control/element-box `button.col-start-2.row-start-1.row-span-2.inline-flex` | control beside text | center |
| 18 | `3bc77a75` | `summary.flex.cursor-pointer.list-none.items-center` | text/glyph `span.flex.items-center.gap-2.type-subtitle` "Advanced" | icon/ink `svg.lucide-icon.lucide.lucide-arrow-right.h-4` | icon beside text | center |
| 19 | `d3c42eb8` | `div.flex.items-center.gap-3.pt-4` | text/glyph `span.flex.min-w-0.flex-1.items-center` "Saving applies your choices for every ed" | control/element-box `button.btn.btn-primary.btn-sm` | control beside text | center |
| 20 | `25223aec` | `span.flex.min-w-0.flex-1.items-center` | icon/ink `svg.lucide-icon.lucide.lucide-arrow-right.h-3\.5` | text/glyph `span.flex.min-w-0.flex-1.items-center` "Saving applies your choices for every ed" | icon beside text | center |
| 21 | `cd9aaff2` | `form.mt-6.flex.items-center.gap-3` | text/glyph `span.flex.min-w-0.flex-1.items-center` "Saving commits your tag list to the site" | control/element-box `button.btn.btn-primary.btn-sm` | control beside text | center |
| 22 | `21db619c` | `header.mb-10.flex.flex-col.gap-3` | text/glyph `span.type-label.font-semibold.uppercase.tracking-\[0\.08em\]` "Media" | control/element-box `button.btn.btn-sm.shrink-0.border-transparent` | control beside text | flex-start |
| 23 | `87d0cd4a` | `p.type-label.leading-snug.text-muted` | text/glyph `p.type-label.leading-snug.text-muted` "This image leads the page, and it is the" | box/element-box `p.type-label.leading-snug.text-muted` | optical-suspect | normal |
| 24 | `48eafe60` | `span.type-label.text-muted` | text/glyph `span.type-label.text-muted` "as written, following your site's Englis" | box/element-box `span.type-label.text-muted` | optical-suspect | normal |
| 25 | `17caed5b` | `span.type-label.text-muted` | text/glyph `span.type-label.text-muted` "Drop an image here, or pick from the lib" | box/element-box `span.type-label.text-muted` | optical-suspect | normal |
| 26 | `8f8728e8` | `div.mb-6.mt-6.flex.items-start` | icon/ink `svg.lucide-icon.lucide.lucide-list.h-4` | text/glyph `span.font-semibold` "Tidy will fix" | icon beside text | flex-start |
| 27 | `23aa82ac` | `div.mt-6.flex.items-start.gap-3` | text/glyph `div.type-meta.font-semibold` "Tidy is set up for this site" | text/glyph `span.mt-0\.5.hidden.flex-none.items-center` "Set by your developer" | text beside text | flex-start |
| 28 | `169c7ca8` | `a.flex.items-center.gap-2\.5.rounded-field` | text/glyph `span.text-\[1\.375rem\].font-semibold.font-\[family-name\:var\(--font-display\)\]` "Cairn" | text/glyph `span.cairn-chip-quiet.rounded-md.px-1\.5.py-px` "CMS" | text beside text | center |
| 29 | `d166b4bf` | `div.flex.flex-col.gap-1.type-meta` | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Tidy" | text/glyph `span` "On for this site" | text beside text | baseline |
| 30 | `90305f30` | `div.flex.flex-col.gap-1.type-meta` | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "API key" | text/glyph `span` "Set, and kept on the server" | text beside text | baseline |
| 31 | `f8cf9149` | `div.flex.flex-col.gap-1.type-meta` | text/glyph `span.inline-flex.items-center.gap-1\.5.text-muted` "Model" | text/glyph `span` "Claude Sonnet" | text beside text | baseline |
| 32 | `dcd99e37` | `h2.flex.items-center.gap-2.type-heading` | text/glyph `h2.flex.items-center.gap-2.type-heading` "Your tags" | text/glyph `span.rounded-full.bg-base-content\/\[0\.06\].px-2.py-0\.5` "3" | text beside text | center |
| 33 | `e756ff3e` | `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` | icon/ink `svg.h-4.w-4` | text/glyph `button#cairn-tab-write.btn.btn-sm.btn-active.rounded-r-none` "Write" | icon beside text | center |
| 34 | `fe8b661b` | `summary.faq-question` | text/glyph `span.faq-question-text` "Does the FAQ component support formattin" | icon/ink `svg.ec-glyph` | icon beside text | center |
| 35 | `e2613ac1` | `a.cta-link.cta-primary` | text/glyph `a.cta-link.cta-primary` "Read the getting-started guide" | icon/ink `svg.ec-glyph` | icon beside text | center |
| 36 | `046631e7` | `div.ec-head` | icon/ink `svg.ec-glyph` | text/glyph `h2#check-the-date-before-you-publish.card-title` "Check the date before you publish" | icon beside text | center |
| 37 | `3c615478` | `div.mx-auto.flex.max-w-measure.flex-wrap` | text/glyph `span.font-display.text-step-1.font-semibold.tracking-tight` "Waymark" | text/glyph `a.inline-flex.min-h-11.items-center.px-xs` "Writing" | text beside text | center |

## Disposition summary

| Disposition | Rows |
| --- | --- |
| DECLINE: a trailing action centred on the whole block it acts on, which is the correct composition for this row. The reading is trap 1 doing its job (the control is paired with the block's first line); no recipe should move it. | 13 |
| task 2 (admin toolkit): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). | 7 |
| task 2 (admin toolkit): the two runs share a row but not a baseline; set them on one baseline. | 5 |
| DECLINE: the optical reading is taken on a MULTI-LINE paragraph, so the glyph is the first line's cap centre while the padding box spans every line. Half a line of offset is arithmetic, not an optical defect. Input to task 4: scope the optical metric to a single-line glyph. | 3 |
| task 3 (Waymark chassis): the icon-beside-text row mechanic (pair the ink centre to the line's cap centre). | 3 |
| DECLINE: the right-hand member is a CHIP, a padded box optically centred against the line, not a run of copy sharing its baseline, so the baseline metric is the wrong reading for it. Input to task 4: a chip beside a run of text is not a text-beside-text pair. | 2 |
| DECLINE: the row declares `items-end` and bottom-aligns a trailing action against a multi-line heading block on purpose. Measured against the block first line by convention. | 1 |
| DECLINE: a monogram avatar centred against the identity block beside it. The monogram is a glyph inside a decorative circle, not a run of copy sharing the name line baseline. | 1 |
| DECLINE: the delete control spans both grid rows of the tag entry and centres on the pair, which is why it reads high against the input on the first row alone. | 1 |
| task 3 (Waymark chassis): the two runs share a row but not a baseline; set them on one baseline. | 1 |

Rows owned by task 2 (admin): 12. Rows owned by task 3 (chassis): 4. Explicit declines: 21.

A decline is a REVIEWED ruling: someone read that row's crop and decided no recipe should move it. The rulings live in the probe (`REVIEWED_DISPOSITIONS`), keyed by the Id column, because a re-run overwrites this file and a ruling kept only here would be erased by the run that is supposed to verify it. A row whose Id has no ruling takes its shape's default, so a composition that appears later is dispositioned rather than reported unknown.

## Optical readings, by recipe

Glyph cap centre against the padding box the glyph sits in, over every optical reading in the run rather than only the ones above the bar. NEGATIVE means the glyph rides high in its own box. This is the evidence a `text-box: trim-both` default rests on, so the sub-bar distribution matters as much as the outliers.

| Recipe | Readings | Median offset (px) | Max magnitude (px) |
| --- | --- | --- | --- |
| `type-label leading-snug text-muted` | 4 | -8.13 | -8.13 |
| `badge badge-outline` | 20 | -1.5 | -1.5 |
| `btn btn-outline` | 10 | -1.5 | -1.5 |
| `btn btn-ghost` | 10 | -1.5 | -1.5 |
| `badge badge-primary` | 16 | -1.31 | -1.5 |
| `ml-auto hidden rounded` | 36 | -1 | -1 |
| `join-item btn btn-sm` | 156 | 0.5 | 0.5 |
| `type-label text-muted` | 76 | -0.5 | -7.5 |
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

The rendered rule sets its firing threshold from THESE numbers, not from the placeholder 4px. Two independent readings: run-to-run jitter (the same page measured twice in one session), and the distribution of the sub-bar population.

- Repeatability: 82 pairs measured twice on one page, max delta-of-deltas 0px.
- Sub-bar population: 4784 pairs at or under 2px, 1982 of them non-zero.
- Sub-bar distribution (non-zero): p50 0.5px, p90 1.5px, p99 2px, max 2px.

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
