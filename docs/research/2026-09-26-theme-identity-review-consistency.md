# Theme identity spec review: consistency lens

Target: `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `2776dfa3`.
Question: does the draft contradict a ratified document, and are its citations and counts right?
Taste is not re-litigated. The owner's rulings in the arc log stand.

Counts: 1 blocker, 6 major, 10 minor, 1 owner fork. Five pre-existing drifts are noted at the end.
None of them is owed by this spec.

Method note: one finding (B1) was verified by rendering the compiled `dist/components/cairn-admin.css`
in headless Chromium and reading computed styles. The probe script briefly lived at the repo root
as `.tmp-review-probe.mjs` so it could resolve `playwright`. It was deleted in the same command, so
the tree is unchanged.

## Blocker

### B1. The lever model puts button rules in a layer that cannot win

- **Spec:** lines 49-53 (levers 2 and 3 are "set by scoped rules" and "in the `@layer components`
  block"), line 67-69 ("The existing `.btn-primary` lift rule is the home for it"), and lines 261-263
  (only the Lucide and switch rules are considered for unlayered placement).
- **Contradicted:** `docs/internal/admin-design-system.md:75-86` (the load-bearing layer rule) and
  pinned unlayered rule 10's own comment in `src/lib/components/cairn-admin.css` (around line 1060).
  That comment says `--btn-bg` "is itself a utilities-layer declaration (`@layer daisyui.l1.l2`),
  which a components-layer rule cannot outrank regardless of specificity".
- **Defect:** the compiled sheet nests every daisyUI component rule inside `@layer utilities`
  (`.btn` sits in `utilities > daisyui.l1.l2.l3`, and `.btn-sm { --btn-p: .75rem }` in
  `utilities > daisyui.l1.l2`). A `@layer components` rule that sets `--btn-p`, `--btn-bg`,
  `--btn-border`, `font-weight`, or `box-shadow` on a `.btn` loses to daisyUI's own declaration on
  the same element. That covers most of the button section: the hairline plain `btn`, the
  `btn-neutral` hover, the `btn-soft btn-primary` tint, the `btn-sm` padding, the 500/600 label
  weights, the join wash, and the switch. The existing lift proves it. Measured on the current dist
  sheet, `.btn.btn-primary.btn-sm` computes `box-shadow` as daisyUI's depth-1 stock shadow
  (`0 3px 2px -2px` primary at 30%), not the components-layer lift (`0 1px 2px … , 0 6px 16px -5px …`).
  The lift has never rendered. At `--depth: 0` daisyUI's shadow goes transparent, so the ratified
  "faint warm lift" would render as no lift at all if it lands in that rule.
- **Fold:** replace "in the `@layer components` block" with the layer that actually outranks
  daisyUI. There are two candidates. Unlayered pinned rules raise the fourteen-rule set by several,
  each one needing a gate entry. The alternative is a single admin block placed directly in
  `@layer utilities`, which outranks daisyUI's nested sublayers and ties Tailwind utilities on
  specificity and source order. That second option is a new load-bearing rule, so the
  design-system doc must record it. Widen "Open for the plan" from Lucide-and-switch to every
  daisyUI-component override. Add `check:custom-surface` to the Proof gate list, since it caps
  `@layer components` selectors and pins the unlayered set by whole-selector equality. Also say
  explicitly that the motion ruling's "no unlayered override of … `.btn`"
  (`engine-rulings.md:6039-6055`, decision 4) is timing-scoped, because unlayered rule 10 already
  overrides `.btn-active` fill and border.
- **Erratum owed:** `admin-design-system.md:80` and `:394` ("It gets a soft violet lift from a
  scoped rule") describe a lift that does not render today.

## Major

### M1. `btn-soft btn-primary` goes solid violet on hover and press

- **Spec:** lines 104-108 and 171-172 (the Publish-site tint becomes `btn btn-soft btn-primary`).
- **Contradicted:** the July ladder, `record/2026-07-15-design-arc-log.md:135-139`: rung 3 is
  "violet tint = pending act-on states (Edited, Publish site)" and rung 2 is "violet solid = flow
  commits". The accent reservation says the same.
- **Defect:** daisyUI 5.7.44's `.btn:hover` sets
  `--btn-bg: color-mix(var(--btn-color) , #000 7%)` and `color: var(--btn-fg)`, and `.btn:active`
  does the same at 5%. On `btn-soft btn-primary` the hover therefore paints a solid violet fill with
  `primary-content` text, which is the commit rung. The removed patch carried
  `hover:bg-primary/15`. The spec states the rest tint only. Line 177-179 says the sweep changes no
  behavior, yet this swap would change the hover.
- **Fold:** state the hover (`primary` 15% over transparent, per the removed patch) and the
  `:active` state as part of the theme rule. Add both to the contrast proof.

### M2. The active join segment drops the ruled state hairline and collides with pinned rule 10

- **Spec:** lines 112-116 (a neutral 7% wash at 600 in both themes). Proof line 205 measures only
  the segment's text.
- **Contradicted:**
  - `admin-design-system.md:658-677`. The invisible-craft rule (2026-07-17) says "Every
    active/pressed state also carries a 1px inset hairline in its family's own ink". The
    `.btn-active` join family gets the same two cues, and on dark "the hairline is the whole 3:1
    cue".
  - `segmentTintClass` (`src/lib/components/segmented-control.ts:24`), which is the July
    "neutral wash + semibold" carrier the spec quotes, pairs the 7% wash with
    `ring-1 ring-inset ring-base-content/55`.
  - Pinned unlayered rule 10 in `cairn-admin.css` (dark `.btn-active`: an 8% white mix, plus the
    locked hairline `oklch(57% 0.012 75)` measured at 4.37:1 "against an unselected sibling's
    base-200 fill").
- **Defect:** the spec quotes the July ruling's wash and weight but omits its hairline. It also
  never mentions rule 10, which will still fire on dark and override or compete with the new wash.
  Rule 10's locked margins were measured against a `base-200` sibling. The hairline plain `btn`
  moves that sibling to `base-100`, so they go stale.
- **Fold:** state that the active segment keeps the inset hairline in both themes. Say whether
  rule 10 is retired or re-tuned. Add the 3:1 non-text measurement of the hairline against the
  new resting sibling (both themes) to the Proof list.

### M3. Alert inks duplicate an existing locked error family and skip success

- **Spec:** lines 125-137 (the table), line 35-36 ("except the new alert inks").
- **Contradicted:** `cairn-admin.css:233-241` and `:437-439` already define a measured, locked
  quiet-danger triple: `--cairn-error-ink` (50% 0.19 25, which measures ~5.2:1 on base-100 and
  ~4.9:1 on its tint), `--cairn-error-tint`, and `--cairn-error-border`. It carries a "Do not lighten
  the ink or darken the tint without re-checking" lock. The Tokens section
  (`admin-design-system.md:174-176`) defines tokens per theme root, and the warning row already
  follows that by using `--cairn-warning-ink`.
- **Defect:** the error row introduces a second error ink, `oklch(45% 0.17 25)`, as a literal
  beside an existing token for the same job. The info row specifies an alert that the tree never
  renders: `alert-info` has 0 sites. Success is hedged ("if one exists"), but `alert-success` has
  5 sites and a token (`--color-positive-ink`) already exists for its ink.
- **Fold:** build the error row from `--cairn-error-ink`, `--cairn-error-tint`, and
  `--cairn-error-border`, or re-tune that triple, but keep one vocabulary. Add a success row on
  `--color-positive-ink`. Keep info for developer screens, as a named per-root token pair rather
  than literals.

### M4. The shipped audit encodes the values this pass changes

- **Spec:** lines 201-220 (Proof) and 222-247 (Documentation) name none of this.
- **Contradicted:**
  - `src/lib/audit/norms.ts:208-275` (`RATIFIED_NORMS`): button, input, and select radius 10px and
    card radius 16px, each citing `admin-design-system.md`.
  - `src/lib/audit/norms-manifest.json`, shipped in the package and CI-gated by
    `.github/workflows/norms.yml` (`npm run norms:check`). It also records button and input heights
    (32/40), padding (12/16), and page-title weight 700.
  - `docs/reference/cairn-audit.md:455-468`, whose worked example prints `border-radius 16px`.
  - `src/lib/audit/rules/rendered/chip-ground-collision.ts:160-189`, which detects an unclassed
    chip by pill shape (every corner at least half the height). Its header says this is what
    reaches "the seven filled `rounded-full` pills the admin ships with no badge class".
- **Defect:** after the pass the ratified norms cite values the render no longer has, so
  `norms:check` fails in CI. Chips moved from `rounded-full` to `rounded-selector` fall out of
  `chip-ground-collision`'s detection, silently in the admin and in every consumer running
  `cairn-audit`.
- **Fold:** add these to Proof and Documentation:
  - update `RATIFIED_NORMS` to the new ladder;
  - regenerate the manifest (`norms:generate`) and re-read the page-title weight entry;
  - update the `cairn-audit.md` example;
  - re-key chip detection so a `--radius-selector` chip still reads as a chip (a small-radius,
    chip-height, filled, text-carrying element), with a fixture.

### M5. The pass trips a ROADMAP trigger it says does not apply

- **Spec:** lines 195-196 (the re-skin recipe in `theme.css` gains a line) and 246-247 ("nothing
  ships off it unless an item names this work").
- **Contradicted:** `ROADMAP.md:880-885`: "The Waymark template's theme files cite cairn-internal
  documents a scaffolded site does not carry … Trigger: the next pass that edits the template's
  CSS." Also the CLAUDE.md rule that ROADMAP is a pass dimension.
- **Fold:** take the item, which means repointing or inlining the three `theme.css` cites the
  pass is already editing (`site.css` and `prose.css` cites can be scoped out explicitly), or defer
  it in the spec by name. Either way, the new re-skin line must not cite an internal doc.

### M6. The Documentation list misses errata the pass makes true

- **Spec:** lines 222-247.
- **Owed, each contradicted by the ratified decisions:**
  - `docs/internal/public-design-system.md:257-261`: "the admin's values (Warm Stone, the violet,
    its component recipes) never cross over". The starter now takes the admin's hairline outline
    recipe and its exact radius values. Lines 26-29 and 75-76 also describe the starter geometry.
    This doc is absent from the list entirely. See the owner fork below.
  - `admin-design-system.md:36-42`: the charter calibration lists "the pill family" among the
    grammars a developer inherits.
  - `admin-design-system.md:368-378`: the Active nav recipe says "`--depth` (set to `1` on both
    theme roots) is the stock lever … do not write a cancel rule". The spec places the depth
    language in the Tokens section, but this text lives in the Component recipes.
  - `admin-design-system.md:391`: the brand mark recipe is `rounded-xl`, and the spec moves the
    brand tile to `rounded-box`.
  - `admin-design-system.md:394`: "soft violet lift". The spec's lift is warm-neutral.
  - `admin-design-system.md:1278-1282` (the versioned seam): geometry lists only `--radius-field`
    and `--radius-box`. The facts bullet tells developers to use `rounded-selector`, so
    `--radius-selector` joins the contract.
  - `admin-design-system.md:1320-1348` (the starter template's design section).
  - `docs/reference/components.md:25-26`: "a status-pill family". This is on the reference arm,
    which is maintained every pass.
- **Fold:** add each item to the Documentation list.

## Minor

### m1. The page-heading recipe is stale

Spec lines 154-156 give `text-2xl font-bold …` and apply the change to "the `text-2xl` display page
headings". The tree has no such heading. The one page `h1` is
`src/lib/admin-toolkit/PageHeader.svelte:59`,
`page-h1 m-0 type-title font-bold font-[family-name:var(--font-display)]`. The spec copied a stale
line from `admin-design-system.md:272`.
**Fold:** cite `type-title` and `PageHeader.svelte:59`. Erratum owed at `admin-design-system.md:272`.

### m2. The radius and patch counts need small corrections

Spec lines 75-78 and 176:
- Bare `rounded` counts about 33 class uses in `src/lib`, not 38. The other counts check out:
  `rounded-lg` 14, `-xl` 10, `-md` 9, `-sm` 10, one `rounded-[0.55rem]`, `shadow-none` 5,
  `border-transparent` 7, and 4 ink-hover brackets.
- The inventory misses `rounded-t-2xl` (the `CairnMediaLibrary.svelte:974` bottom sheet) and the
  `0.75rem` fallbacks in `MediaInsertPopover.svelte:426,446`.
- 2 of the 7 `border-transparent` sites are badges (`CairnAdminShell.svelte:1074,1099`), which the
  sweep's two recipes do not cover.

**Fold:** correct 38 to ~33, add the missed sites, and give the two badge sites a rule. The plan
re-counts anyway.

### m3. The spec narrows the arc log's `--btn-p` to `btn-sm`

The arc log's R4 line (`record/2026-09-26-theme-identity-arc-log.md:25-26`) says "--btn-p
0.875rem" without qualification. Spec line 119 scopes it "at `btn-sm`" and leaves other sizes at
defaults. That reading is defensible: a global 0.875rem would shrink the default `btn` from 1rem.
It is still an interpretation.
**Fold:** add one line to the arc log recording the reading, so the record and the spec agree.

### m4. The density step does not answer the font-size grade

Spec lines 97-98 say the density step "answers the charter's standing grade that the base size
'might be a little too small'". That grade is about the base font size
(`admin-design-system.md:62-64`), and the spec keeps type size unchanged.
**Fold:** say the step addresses control density and that the font-size grade stays open.

### m5. The "warm rules out zero" citation stretches the charter

Spec lines 91-92 say "the charter's 'warm' rules it out". The charter
(`admin-design-system.md:33-35`) places warmth in "the Warm Stone palette, the type pairing, and
the voice, never in decoration".
**Fold:** cite Geoff's R4 "never zero" and the starter's "not zero broadsheet" comment
(`theme.css:130`) instead.

### m6. The depth-shadow claim overreaches the shadow rule

Spec lines 64-66 say depth-1 shadows break the rule that "shadows are warm-tinted and never
achromatic". That rule governs cairn's `--cairn-shadow` tokens (`admin-design-system.md:196-201`).
The doc explicitly accepts daisyUI's depth shadow under the active nav item.
**Fold:** frame depth 0 as pulling "the stock lever" the doc already names.

### m7. The pill-family grammar survives the retirement

Spec line 83 says the July "pill family" recipe is superseded. The July grammar is "one pill family
(shared geometry + ink; one differing attribute per state)" (`July arc log:156-157`). Only the pill
geometry is retired.
**Fold:** say the one-family grammar holds at the new radius, so the rule is not lost with the word.

### m8. The E3 tracking rule follows the weight change

Buttons moving from 600 to 500 (spec lines 117-118) leave the E3 small-semibold tracking band
(`July arc log:72-79`, `tracking-small-semibold`). The sweep recipe at spec line 169 elides the
current `tracking-small-semibold` with "...".
**Fold:** state which tracking utility each button weight takes, and whether the sweep keeps
`tracking-small-semibold` on `btn-neutral`.

### m9. The facts bullet points developers at classes nothing guarantees will ship

Spec lines 235-238 tell developers to write `rounded-selector`, `rounded-field`, and `rounded-box`.
`scripts/build/admin-css.input.css` states the principle that "a role a consumer is told to write
must ship whether or not cairn's own screens happen to use it". These three are not in the
safelist.
**Fold:** add them to the safelist. Also name the facts file (`docs/internal/facts/extend.md`).

### m10. The Lucide stroke rule hangs on a class the vendor may drop

Spec lines 160-163 key the stroke rule on the `lucide-icon` class. `@lucide/svelte`'s own
`Icon.svelte:19` reads "@TODO: maybe drop the extra `lucide-icon` class altogether". The
conform-to-conventions ruling prefers the vendor's lever: Lucide's global props (`strokeWidth` via
its context).
**Fold:** list this as an execution call under "Open for the plan". Also note that the norms `icon`
role selects `svg.lucide`.

## Owner fork

### F1. Does the starter's hairline outline cross the public-design-system line?

The arc log records the starter approval as inferred ("taken as approval of the design and the
starter plan", arc log line 29). `public-design-system.md:259-261` says the admin's component
recipes never cross over to the starter. Sharing geometry is consistent with that doc's "token
grammar matches; only the palette differs" (lines 26-29). Sharing the hairline outline recipe is
not.

- **(a)** Confirm the hairline `btn-outline` and `badge-outline` as a family trait, and amend
  `public-design-system.md` to name geometry and edge grammar as shared.
- **(b)** The starter takes only the radius ladder and keeps daisyUI's outline.

Recommendation: (a). Geoff saw the starter in the final render, so a one-word confirmation at spec
approval closes the inference, and the erratum lands with M6.

## Pre-existing drift, noted and not owed by this spec

- `admin-design-system.md:659-660` gives the neutral pick-one ring as `ring-base-content/20`. The
  code is `/55` (`segmented-control.ts:24`).
- `admin-design-system.md:1301-1303` (the seam section) says "the two unlayered forced
  workarounds". The load-bearing rule and the CSS say fourteen.
- `admin-design-system.md:1327` gives the starter theme path as `examples/showcase/src/lib/theme.css`.
  The real path is `src/theme/theme.css`, which the spec cites correctly. The two copies were
  verified byte-identical at `2776dfa3`.
- The `.btn-primary` violet lift has never rendered (B1).
- Checked and correct:
  - the spec's starter radii (0.28 / 0.4 / 0.625rem, depth and noise 0);
  - the admin's current values (0.5 / 0.625 / 1rem, depth 1);
  - the `btn-sm` 32px to 36px arithmetic;
  - the July quotes ("neutral wash + semibold", A3, the ladder rungs);
  - the charter quote ("one visually coherent system");
  - the arc log verdicts for R1-R4 and the switch (C), including R3's correction of R2's `base-200`
    join segment;
  - the fourteen-rule count;
  - the phone band (48px) and toolbar (44px) heights;
  - the Bricolage `wght` range (400-800 in the `@font-face`, so 550 is a real instance).
