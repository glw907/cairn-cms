# Theme identity: cairn's own look through the daisyUI levers

**Status:** approved design (Geoff, 2026-09-26), revised by the four-lens review fold
(`docs/superpowers/research/2026-09-26-theme-identity-fold.md`). One owner fork is open: R1.
**Arc record:** `docs/internal/record/2026-09-26-theme-identity-arc-log.md` (every round, candidate,
verdict, and the six rulings after review).
**Evidence:** the architecture spike, `docs/superpowers/research/2026-09-26-theme-identity-spike.md`
(measured on daisyUI 5.7.44, Tailwind 4.3.3).
**Reference:** the ratified probe pages and their captures are committed in
`docs/internal/record/2026-09-26-theme-identity/`: `final-1440.png` and `final-390.png` (each
shows light above dark) and `switch-1440.png`, beside the probe sources `final-1.html` and
`switch-1.html`. The probe CSS used unlayered rules, so the captures show intent; the mechanism
is this spec's Architecture section. Every fidelity check grades against those captures.

## Goals

Geoff, verbatim: "my goal is not to be dramatic, but rather to make cairn more coheriently
follow it's own design ideology and not appear 100% default DasiyUI."

Two acceptance goals, added during review (Geoff, verbatim):

- **G1:** "anybody extending the cairn admin interface should get a consistant look by default."
- **G2:** "It should also be maximally easy for agents extending cairn to create the same look and
  feel."

The admin already had its own color (Warm Stone, the violet primary) and type (Bricolage Grotesque,
IBM Plex Sans, iA Writer Mono). Everything else ran on daisyUI's stock settings or on per-element
patches that fight them. This pass moves cairn's identity into the theme layer. A developer's or an
agent's admin screen written in plain daisyUI classes then inherits it with no work.

The model an agent is given, in one sentence, everywhere cairn ships guidance:

> cairn's admin is the daisyUI theme `cairn-admin` (dark: `cairn-admin-dark`) with every daisyUI
> component available; write plain daisyUI plus cairn's role utilities.

Two stated limits qualify "every component": `calendar` is excluded (it skins third-party date
pickers and costs 243 KB raw), and responsive variants of daisyUI classes (`md:btn-lg`) compile only
where cairn's own markup uses them. `no-uncompiled-class` already reports the second case in a
consumer's tree.

## Scope

In scope:

- The admin theme roots (`cairn-admin`, `cairn-admin-dark`), the admin sheet build, and the rules in
  `src/lib/components/cairn-admin.css`.
- The markup sweep in `src/lib/components` and `src/lib/admin-toolkit`.
- The starter theme as a sibling identity, edited in `examples/showcase/src/theme/theme.css` and
  re-emitted to `templates/waymark` by `npm run emit:template`. It shares geometry and edge grammar
  with the admin and keeps its own palette, faces, and weights.
- The G1 and G2 deliverables: a fixture screen, `cairn-audit` rules, and the shipped agent guidance.

Out of scope:

- Color. The violet primary is fixed (July arc). No palette value changes; the alert inks below
  are new per-root tokens or reuse existing ones.
- The emphasis ladder and the accent reservation (July arc, A3). This pass encodes them in the
  theme and does not change them.
- Motion (ruled 2026-09-15). The editor canvas (`.cm-*`) and the public reading surface
  (`prose.css`, callouts). The preview iframe's own styles are out of scope, but it renders the
  starter theme, so the starter's radius change reaches it (see Proof).
- Font assets. No Bricolage re-cut.
- Pinned unlayered rules 1 to 9. They keep their home in this pass (see the Architecture section).

## Architecture

This section is settled by ruling 1 and proven by the spike, except the authoring form of the theme
roots, which is fork R1.

### One compiler, every component

The engine stays the single compiler of admin component CSS. A consumer's `src/admin.css` is
unchanged, so the changelog carries no `Consumers must:` line for CSS setup. The spike rebuilt the
showcase with its `admin.css` untouched; the consumer's own compiled sheet carried zero `.btn` or
`timeline` rules, and every rule came from the engine sheet.

Every daisyUI component compiles in. A build step walks
`node_modules/daisyui/{components,utilities}/*/object.js`, extracts every class selector, and feeds
the list to one `@source inline(...)` in `scripts/build/admin-css.input.css`. The plugin line becomes
`@plugin "daisyui" { themes: false; exclude: calendar; }`. The list is generated at build time, so it
tracks daisyUI upgrades with no hand-kept safelist. The spike measured 580 of 649 classes compiled,
the only missing ones being calendar's.

The measured cost: the minified, gzipped admin sheet grows from 31.8 KB to 53.2 KB (25.0 KB to
39.3 KB brotli), about 1.7x. It loads only on `/admin/**`. Accepted.

`admin-sheet-inventory.test.ts` is regenerated deliberately (217 to 580 daisyUI classes), carried in
the changelog. A new presence test asserts a representative set of classes cairn's own markup never
uses: `timeline`, `rating`, `radial-progress`, `countdown`, `alert-info`, `toggle-primary`,
`toggle-sm`, `rounded-selector`, `rounded-field`, and `rounded-box`. It fails if the generator drifts
or daisyUI renames a module.

### The cairn-theme sublayer

daisyUI 5 compiles every component rule into sublayers of `@layer utilities` (`daisyui.l1.l2...`).
Cascade layers resolve before specificity, so a rule in `@layer components` cannot override a
daisyUI declaration. The existing `.btn-primary` lift and `.modal-box` repair have never rendered for
this reason. An unlayered rule wins but also beats every markup utility, which breaks the "a utility
still wins" promise and is how pinned rule 10 once ate `text-error`.

The dominant answer is a named sublayer placed after daisyUI's: every rule that overrides a daisyUI
declaration lives in `@layer utilities { @layer cairn-theme { ... } }` in `cairn-admin.css`.
`build-admin-css.mjs` pins the order by adding `@layer utilities.daisyui, utilities.cairn-theme;`
after its existing `@layer properties, theme, base, components, utilities;` line. The spike showed
the pin is load-bearing: reversed, every override renders stock. A rule in the sublayer beats every
daisyUI sublayer and still loses to a markup utility (measured: `btn btn-sm px-2 font-semibold`
kept 8px and 600).

Every cairn-theme rule meets three conditions:

- **Full state set.** A resting override in a winning layer also wins over daisyUI's `:hover`,
  `:active`, `:focus-visible`, `:checked`, and disabled restatements. Each rule states rest, hover,
  focus-visible, active, and disabled, plus the `[aria-checked='true']` and `[aria-pressed='true']`
  forms where daisyUI keys on them. A state it leaves to daisyUI is excluded by `:not(...)`, never
  left to chance.
- **Narrow selector.** It excludes the daisyUI color, style, and size variants it is not meant to
  restyle.
- **Variables first.** It sets daisyUI's component variables (`--btn-bg`, `--btn-border`, `--btn-fg`,
  `--btn-p`, `--btn-shadow`, `--input-color`, `--alert-color`) before a property, so a markup utility
  that sets the property still wins.

Each rule gets a computed-style test in both themes that proves two things: it renders, and a markup
utility beats it. This is the test the dead lift never had. `admin-css-build.test.ts` asserts the
pin statement.

`admin-design-system.md`'s load-bearing rule "Scoped overrides go in `@layer components`" is amended
to three homes:

- `@layer components`: rules on cairn's own classes that compete with nothing in daisyUI.
- `@layer utilities { @layer cairn-theme }`: every rule that overrides a daisyUI declaration.
- Unlayered: the theme roots, the box-sizing and reduced-motion resets, and pinned rules 1 to 9.

### Gates and the pinned rules

`check:custom-surface` gains a third category: the cairn-theme block, parsed by brace matching the
way the components block is, with its own selector cap in `custom-surface-budget.json` and a ledger
entry in `docs/internal/design/2026-06-29-custom-surface-ledger.md`. Its `SCOPED_RULE` count of
"unlayered" rules then excludes that block. Without this, every sublayer rule written in house style
reads as an unsanctioned unlayered rule.

Pinned rules 10 to 14 each exist only because `@layer components` could not win. They move:

- Rules 10 and 12 (dark `.btn-active` fill, its hover step) are superseded by the active-segment rule
  below.
- Rule 11 (outline and dash ink on a selected control) moves into cairn-theme unchanged.
- Rules 13 and 14 (the 55% checkbox, radio, and field edges) move into cairn-theme with their
  selectors and exclusions unchanged. The `:not(:focus)` and disabled exclusions stay, since a
  sublayer rule still beats daisyUI's own focus rule. After the move a markup border utility on a
  field wins. The plan greps for border utilities on `.input`, `.select`, `.textarea`, `.checkbox`,
  and `.radio` call sites, and `interactive-control-edge-contrast.test.ts` must stay green.

The unlayered allowlist shrinks from 18 entries to 13, which the Tier-2 floor permits. The
`.btn-primary` lift and the `.modal-box` repair move from `@layer components` into cairn-theme. The
modal repair has been in the design system but never rendered, so its render is a visible change the
before-and-after shows. Moving rules 1 to 9 is a later ratchet shrink; the plan files it and does not
take it.

These moves also retire every unlayered `.btn` override, which resolves the tension with the motion
ruling's decision 4 ("no unlayered override of `.btn`").

## Admin decisions

### Material (round 1, verdict B)

- `--depth: 0` and `--noise: 0` on both roots. This pulls the stock lever the design system already
  names. Depth 1 is daisyUI's signature bevel: the button and input insets, the lifted active menu
  item, the toggle and checkbox shading.
- The one exception: `btn-primary` keeps a faint warm lift, set as `--btn-shadow` in cairn-theme:
  `0 1px 2px -1px oklch(35% 0.04 75 / .35)` in light, the equivalent at the dark shadow tint in dark.
  The lift is the same in every state; a test asserts the computed `box-shadow` at rest and hover in
  both themes. It replaces the dead violet-pair lift.
- The modal's shadow comes from the `.modal-box` repair, not from `--depth`. daisyUI's modal shadow
  is theme-invariant black. The repair's warm shadow gets the same computed `box-shadow` test.

### Corners (round 4, verdict B tight)

- The ladder is `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`, `--radius-box: 0.5rem`.
- **Every framed element resolves to one of the three tokens,** mapped by role:
  - chip, tag, count, small inline marker: `rounded-selector`;
  - control, button-like element, small thumbnail: `rounded-field`;
  - panel, card, tile, popover, sheet, the brand tile: `rounded-box` (side forms such as
    `rounded-t-box` for the mobile bottom sheet).
- The inventory at `2776dfa3`: bare `rounded` about 33, `rounded-lg` 14, `rounded-xl` 10,
  `rounded-md` 9, `rounded-sm` 10, one `rounded-[0.55rem]`, two `rounded-[var(--radius-field)]` (these
  become `rounded-field`), one `rounded-t-2xl` (`CairnMediaLibrary.svelte:974`), and literal radii or
  fallbacks in `HelpHome.svelte`, `admin-toolkit/Tooltip.svelte:409`,
  `MediaInsertPopover.svelte:426,446`, and `PreviewBanner.svelte:95`. The plan re-counts.
- A literal in a toolkit component takes the token with a literal fallback equal to the new value,
  for example `var(--radius-field, 0.375rem)`. Toolkit components ship on a public subpath and may
  mount outside the admin root.
- **Chips leave the pill geometry.** A `rounded-full` chip, tag, or count moves to
  `rounded-selector`. The July one-family grammar (shared geometry and ink, one differing attribute
  per state) holds at the new radius.
- **True circles stay round,** judged by shape. An element with equal width and height that is a dot,
  disc, medallion, spinner, avatar, or switch keeps `rounded-full`. A padded text chip does not.
- **Structural zeros stay.** Edge-zeroing on a fused or joined edge (`rounded-l-none`,
  `rounded-r-none`, `rounded-t-none`) is structure, not a radius choice.
- **Concentric corners.** An item inside a padded rounded panel takes the panel's radius minus the
  inset. daisyUI's `.menu` items read `--radius-field` and `.menu` never declares it, so one
  cairn-theme rule sets `--radius-field: calc(var(--radius-box) - 0.25rem)` on the padded dropdown
  panel. It keys on the daisyUI `dropdown-content menu` pair, so a developer's dropdown inherits it.
  This is inferred from daisyUI's source; the computed-style test proves it.
- Nothing else reaches zero (Geoff, round 4: "never zero").

### Density (round 2)

- `--size-field: 0.28125rem` and `--size-selector: 0.28125rem`, one daisyUI step up. Every field-sized
  component grows one step (`btn`, `input`, `select`, `fileinput`, `label`, `tab`), and so does every
  selector-sized one (`badge`, `checkbox`, `radio`, `toggle`, `kbd`, `loading`, `status`, `range`,
  `rating`). A `btn-sm` goes from 32px to 36px, a default `btn` from 40px to 45px, and a `badge-sm`
  from 20px to 22.5px. Type size is unchanged.
- This addresses control density. The charter's standing grade on the base font size stays open.
- The half-pixel selector sizes, the checkbox hit-slop rule, and the EditPage bottom-bar note restate
  numbers that change; the plan re-reads each comment.

### Buttons (rounds 2 and 4)

All button rules live in cairn-theme and meet the three conditions above.

- **The emphasis ladder on plain classes.** `btn-neutral` is the ink opener, with hover at
  `var(--cairn-ink-hover)`. `btn-primary` is the violet commit. `btn-soft btn-primary` is the tinted
  act-on state. A developer writes those three classes and gets the ruled ladder.
- **Soft primary states** (ruling 4): rest `color-mix(in oklab, var(--color-primary) 10%, transparent)`
  with a transparent edge, hover and focus-visible at 15%, active one step deeper (the plan measures
  it; the spike used 22%). `--btn-fg` is pinned to `var(--color-primary)` so no state swaps in
  `primary-content`. Disabled is left to daisyUI.
- **The plain `btn` is a hairline.** Rest: `--btn-bg: var(--color-base-100)`, `--btn-border:
  color-mix(in oklab, var(--color-base-content) 22%, transparent)`. Hover states an explicit fill
  step, proposed as `color-mix(in oklab, var(--color-base-content) 5%, var(--color-base-100))`, graded
  at the before-and-after. The selector enumerates what it excludes:
  `.btn:not(.btn-primary, .btn-secondary, .btn-accent, .btn-neutral, .btn-info, .btn-success,
  .btn-warning, .btn-error, .btn-ghost, .btn-soft, .btn-outline, .btn-dash, .btn-link, .btn-active,
  [aria-pressed='true'], [aria-checked='true'], .btn-disabled, :disabled, [disabled],
  [aria-disabled='true'])`. `join-item` segments are included. The rule never sets `--btn-color`,
  because daisyUI draws the focus ring in `--btn-color` and a base-100 ring vanishes on a base-100
  card.
- **The selected segment** (a join or segmented control: `.btn-active` plus daisyUI's
  `[aria-pressed='true']` and `[aria-checked='true']` forms, disabled excluded). `--btn-bg` is the
  neutral wash `color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))` in both
  themes, at weight 600. It keeps an inset state hairline on `--btn-border` in both themes, because a
  7% fill step against a base-100 sibling measures about 1.16:1 and cannot carry the state alone. Dark
  starts from rule 10's locked `oklch(57% 0.012 75)`; light's value is measured. This is the July
  segment ruling, "neutral wash + semibold," with the invisible-craft hairline it already required.
  The EditorToolbar mode switch is the same device. `BtnActiveDarkGround.test.ts` is rewritten for
  the new rule.
- **Button type.** Labels are weight 500 on plain and ghost buttons and 600 on `btn-primary`,
  `btn-neutral`, `btn-soft btn-primary`, `btn-error`, and the selected segment. The two plain-button
  sites that mark state with `font-semibold` keep it, since a utility beats the sublayer. Tracking
  follows weight (E3): a plain or ghost button carrying `tracking-small-semibold` moves to
  `tracking-small-medium`, and `btn-neutral` keeps `tracking-small-semibold`.
- **Padding.** `--btn-p: 0.875rem` on `btn-sm` only, 2px wider per side than daisyUI's default. A
  global 0.875rem would shrink the default `btn` from 1rem, so other sizes keep daisyUI's defaults
  unless the settle audit grades them off.

### Alerts (round 2)

Alerts become a tinted panel with a hairline edge and a dark on-surface ink, in place of daisyUI's
solid slab. Every ink is a per-root token, so a site that re-tunes a status color re-tunes its alert.

| Alert | Panel | Edge | Ink |
|---|---|---|---|
| error | `--cairn-error-tint` | `--cairn-error-border` | `--cairn-error-ink` |
| warning | warning 12% over base-100 | warning 45% | `--cairn-warning-ink` |
| success | success 7% over base-100 (dark 12%) | success 30% | `--color-positive-ink` |
| info | info 7% over base-100 (dark 12%) | info 30% | new `--cairn-info-ink`: `oklch(44% 0.12 240)`, dark `oklch(82% 0.08 240)` |

The error row reuses the existing locked quiet-danger triple, so the admin has one error-panel look
shared with the three hand-built danger panels. If the existing ink measures under 4.5:1 on the
panel, the triple is re-tuned with its lock re-checked; no second error ink is added. Each ink must
measure at least 4.5:1 against its panel in its theme, and an ink that fails moves in lightness only.
A bare `.alert` with no variant is unchanged. `btn-error` stays a solid fill (Geoff kept it in the
final render).

### The switch (verdict C)

- The switch is exempt from the corner ladder: track and knob are fully round. daisyUI derives both
  radii from `--radius-selector`, so the rule sets `border-radius: 9999px` on `.toggle` and its
  `::before`.
- Checked fills the track with `--color-neutral` and turns the knob `--color-base-100`, on all three
  daisyUI checked forms: `:checked`, `[aria-checked='true']`, and `:has(> input:checked)`. The rule
  applies only to a toggle with none of the eight color modifiers, so `toggle-primary` and its
  siblings keep daisyUI's colors. Disabled is left to daisyUI.
- Off keeps daisyUI's construction: the 50% `base-content` edge and knob, which clears 3:1.

### Type and icons (round 4)

- **The page heading drops to weight 550.** `admin-toolkit/PageHeader.svelte:59` changes from
  `type-title font-bold` to `type-title font-[550]`. After the pass no `type-title font-bold` remains
  under `src/lib`. The 18px `type-heading` dialog headings and the editor's 30px document title stay
  at 700 (ruling 6); the settle audit grades both.
- **Lucide strokes go to 1.75px** through one cairn-theme rule, `svg.lucide[stroke-width='2'] {
  stroke-width: 1.75 }`. `lucide` is the stable class; `lucide-icon` carries an upstream removal TODO.
  The attribute match retunes only default-stroke icons and leaves an explicit `strokeWidth` or
  `absoluteStrokeWidth` icon alone. A `// WATCH:` comment notes that the rule keys on Lucide's default
  attribute value.
- **Hand-authored inline SVGs at the default 2px stroke move to 1.75** (ruling 5), including the
  `EditorToolbar.svelte` `strokeIcon` snippet. Deliberately heavier strokes (2.2, 2.4, 2.5, 3) keep
  their values.

### The markup sweep

- `btn ... border-transparent bg-neutral text-neutral-content shadow-none
  hover:bg-[var(--cairn-ink-hover)]` becomes `btn btn-neutral`.
- The Publish-site tint recipe (`border-transparent bg-primary/10 text-primary shadow-none
  hover:bg-primary/15`) becomes `btn btn-soft btn-primary`.
- A `shadow-none` that only cancelled depth goes. A `border-transparent` outside those two recipes
  (the two badges at `CairnAdminShell.svelte:1074,1099`) goes only if it cancelled a stock edge the
  theme now removes; the diff review rules on each.
- The fixed radii map onto the tokens.

The sweep changes no layout, copy, or behavior. A site where removing a patch changes the render
beyond the intended theme change is a finding, not a silent fix.

**Post-condition,** over `.svelte` files in `src/lib/components` and `src/lib/admin-toolkit`:

- zero matches for `hover:bg-\[var\(--cairn-ink-hover\)\]` and for `bg-primary/10 text-primary
  shadow-none`;
- zero matches for `\brounded(-sm|-md|-lg|-xl|-2xl|-3xl|-\[[^\]]*\])?\b` and their side forms,
  outside `rounded-full` on a true circle and the structural zeros;
- zero `border-radius:` literals in component `<style>` blocks other than a `var(--radius-*)` form
  or a `calc` over one.

Pass B turns this post-condition into shipped `cairn-audit` rules.

## Starter theme decisions

Edit `examples/showcase/src/theme/theme.css`, then run `npm run emit:template`.
`npm run check:template` is the byte-identity gate.

- **The same corner ladder:** `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`,
  `--radius-box: 0.5rem`, down from 0.28 / 0.4 / 0.625rem.
- **Hairline outlines** (ruling 2, a shared family trait): an uncolored `btn-outline` and
  `badge-outline` take the hairline edge. The rule writes `--btn-border: var(--btn-color,
  color-mix(in oklab, var(--color-base-content) 22%, transparent))`, so `btn-outline btn-primary`
  keeps its colored edge. It lives in `theme.css` (the one file a re-skin edits, so a site can drop
  it) in `@layer utilities { @layer site-theme { ... } }`, pinned after daisyUI. The file header's
  "only chassis VALUES" sentence gains this one declared rule.
- **Unchanged:** the starter's palette, faces, heading weights, size step, depth and noise (already
  0), callouts, and alerts.
- The re-skin recipe gains one line naming the ladder as the family geometry that a site may change
  freely. The line cites no internal document.
- The pass edits `theme.css`, which trips the ROADMAP item on the template citing internal documents.
  Pass A repoints or inlines the `theme.css` cites; the `site.css` and `prose.css` cites stay filed.

## Acceptance

### G1: a consistent look by default

- **The fixture screen.** `examples/showcase/src/routes/admin/theme-kit/+page.svelte` is a custom
  admin route written only in plain daisyUI classes and cairn's role utilities (`type-*`, `gap-*`,
  `card-shell`, `rounded-*`). It renders the button ladder (plain, ghost, neutral, primary,
  `btn-soft btn-primary`, error, a join with a selected segment, one disabled), every alert variant
  including a bare `.alert`, a checked and an unchecked switch, a colored toggle, a chip, a field, a
  card, and a padded dropdown. It stays out of the showcase nav. `admin-visual` captures it in both
  themes.
- **The fixture spec** (`examples/showcase/e2e/theme-kit.spec.ts`) asserts computed styles on the
  fixture in both themes: radii 4, 6, and 8px by role; `btn-sm` height 36px and padding 14px; the
  plain button's fill and edge; label weights; the soft primary's rest and hover fills; the switch's
  checked track and round knob; the colored toggle keeping its color; each alert's panel and ink. It
  fails if a rule lands in a losing layer, the pin reverses, or a class is not compiled.
- **The loses-to-a-utility tests** fail if a rule is moved unlayered.
- **The presence test** fails if the generated class list drifts.

### G2: easy for agents

Pass B carries these; they depend on A's final vocabulary.

- **`cairn-audit` rules**, which run in cairn's own tree (`src/lib/components`,
  `src/lib/admin-toolkit`) and in a consumer's (`src/routes/admin`) through the existing static scope:
  - A new `radius-scale` rule, a sibling of `type-scale` and `gap-scale`. It reads `utilityBase()`, so
    a variant-prefixed radius is caught. It flags a fixed Tailwind radius and names the replacement
    role class. It passes `rounded-full`, `rounded-none`, and side zeros, and flags `rounded-full`
    together with `badge`.
  - New arms on `stock-default-hazards` for the retired patches: the ink-opener recipe (names
    `btn btn-neutral`), the Publish tint recipe (names `btn btn-soft btn-primary`), and `shadow-none`
    on a `btn` (names nothing to add). This follows the `cairn-btn-guarded` retirement-arm precedent,
    and the rule already exists to catch a regression toward a replaced pattern.
  - Both land at advisory tier, with promotion to error named in the changelog for the next minor, as
    the guarded arm did.
  - Fixtures prove each finding names its replacement. Cairn's own tree reports zero after the sweep.
    The fixture fails if the sweep missed a site or a guidance file still teaches a patch.
- **Shipped guidance.** Each of these carries the one-sentence model and a short "write this plain
  class, get this look" table:
  - `skills/cairn-admin-screens/SKILL.md`, with its tier-map counts updated, plus a new exemplar
    reference built from the fixture screen's markup;
  - `skills/cairn-extend/references/daisyui-first.md`;
  - `claude/agents/cairn-extension-reviewer.md`, which also checks for a fixed radius or a retired
    patch;
  - what `cairn-audit norms <role>` prints: each ratified role gains its recipe line.

  The table's rows have one source, a recipe field beside `RATIFIED_NORMS`. A test asserts that each
  guidance table carries the same rows and that the exemplar's markup matches the fixture route. It
  fails when one copy is edited alone. `check:skill-budget` stays green.
- **One agent-build probe at pass B's close.** A fresh Sonnet agent given only the shipped skills and
  a one-line brief builds one admin screen in the showcase. Static and rendered `cairn-audit` must
  report zero error findings and zero `radius-scale` or retired-patch findings. A failure names the
  guidance gap. This is a single acceptance run, not a standing gate.

### The design-system rule

`admin-design-system.md` gains a load-bearing rule: **identity lives in the theme layer.** A new
idiom is a theme variable or a cairn-theme rule. A per-element idiom is a defect.

## Proof

- **Contrast, measured in the browser on the fixture, both themes** (paint to canvas and read back,
  as the audit engine does): every alert ink against its panel and the nested link in the refusal
  alert (`ConceptList.svelte:325`), 4.5:1; the switch's checked track against `base-100` and the knob
  against the track, 3:1; the selected segment's text, 4.5:1, and its state hairline against the
  resting sibling and the ground, 3:1; the focus ring on the plain, neutral, soft-primary, and
  selected buttons, 3:1; each restyled family's hover step, recorded. The numbers go in the design
  system beside the tokens.
- **The five-viewport bar** (320, 390, 768, 1440, 2560) in light and dark. After the size step, check
  explicitly at 320 and 390: the phone desk band, the toolbar row, the `ListToolbar` filter join,
  `Pagination`, and a chip-beside-heading row. Run the `viewport-overflow` and `panel-width` rendered
  rules there, and re-run `vertical-alignment-recipes.test.ts`.
- **Baselines** for `admin-visual` and `site-visual` regenerate on CI, the canonical renderer.
  `admin-visual` changes for two reasons at once: the admin theme and the starter radii in the preview
  pane.
- **The audit's own data.** Update `RATIFIED_NORMS` to the new ladder (6px field, 8px box), run
  `npm run norms:generate`, and keep `norms:check` green. Re-key `chip-ground-collision`'s chip
  detection so a `rounded-selector` chip still reads as a chip, with a fixture. Record a before-and-
  after `cairn-audit --rendered` run over the showcase admin, with the `weight-budget` and
  `norms-bands` counts.
- **A fresh-context `visual-verifier` read** of the built showcase, the fixture screen included,
  against the committed probe captures.
- **The felt-refinement audit, once, at settle:** a typography-and-rhythm lens and a
  color-surface-depth lens. Named inputs: the dialog-heading and document-title weights, the non-`sm`
  button padding, the plain button's hover step, and an outline chip (55% edge) beside a plain button
  (22% edge).
- **Geoff's before and after,** light and dark, at 1440 and 390, the success alert and the modal
  shadow included.
- **Gates that stay green:** `npm run check`, `npm test`, `check:custom-surface` (with its new
  category), `check:admin-css-classes`, `check:invisible-craft`, `check:touch-targets` and
  `check:interactive-contrast` against the showcase preview, `check:public-tokens`, `test:reskin`,
  `check:template`, `norms:check`, and the showcase e2e.

## Documentation

- `docs/internal/admin-design-system.md`: the Tokens section (theme values, alert inks with measured
  contrast, the switch, the depth language); a corner-system subsection (ladder, role mapping, true
  circles by shape, structural zeros, concentric corners); the type recipes (page heading
  `type-title font-[550]`, Lucide at 1.75); the chip rule in place of the pill geometry; the amended
  layer rule; the new identity rule; and the errata the fold record lists.
- `docs/internal/public-design-system.md`: the never-cross-over line amended to name geometry and
  edge grammar as shared (ruling 2).
- Facts bullets in `docs/internal/facts/extend.md`: a custom screen's plain daisyUI classes now render
  cairn's ladder; every daisyUI component except calendar is available; a bare `btn` is a hairline;
  fixed Tailwind radii do not follow the ladder, so use `rounded-selector`, `rounded-field`, or
  `rounded-box`; the norms manifest's radius and height bands moved. Pass B adds the new audit rules.
  `check:facts` gates them.
- The reference arm: `admin-grammar-tokens.md`, `cairn-audit.md` (the radius example, and in pass B
  the new rules), `components.md` (the status-pill wording). `check:reference` stays green.
- The narrative arms: the plan re-reads the freeze rule at plan time, since draft docs pass 0+1
  changes it. Any sentence this pass makes wrong is fixed under whatever rule is then in force.
- `CHANGELOG.md` under `## Unreleased`: the visible admin change and the inventory growth.
  `Consumers must:` nothing. A site with custom admin screens should re-check them, and the entry says
  why.
- `ROADMAP.md`: the Waymark citation item narrowed to what remains; the rules 1 to 9 shrink filed.

## Rulings

Rulings 2 to 6 in the arc log are settled and folded above. Ruling 1 is settled except its authoring
detail, which the spike reopened.

### R1 (owner fork): how the two theme roots are authored

Ruling 1 said to author them as `@plugin "daisyui/theme"` blocks. The spike proved that form works
only under four conditions:

- Tailwind's `@plugin` parser splits every value at a top-level comma and keeps the last part, with
  no error. 20 of 78 values came out wrong (the font stacks, the multi-layer shadow) until each was
  quote-wrapped.
- The plugin emits the theme rule into `@layer base`, where today's roots are unlayered. A hostile
  unlayered host rule then beats the admin's `font-family`, smoothing, scrollbar settings, and
  `color-scheme`.
- A browser drops the unknown `@plugin` at-rule, so the raw partial loses its palette.
  `ReproContext.svelte`, `EditorToolbar.test.ts`, and the `src` imports in `CairnAdminShell`,
  `LoginPage`, and `ConfirmPage` render from the raw partial.
- It adds no capability under scoping. The theme-controller half of its selector is inert, and the
  `default` and `prefersdark` flags only add dead CSS.

**Recommendation: keep the hand-written `[data-theme]` roots.** Add a test asserting that each root
defines every daisyUI theme variable, with the list read from daisyUI's own theme object so it tracks
upgrades. Document the roots as daisyUI themes in the design system and the shipped guidance.

What each answer changes (the rest of this spec builds either way):

- **Keep the roots:** the completeness test and the documentation above. Nothing else changes. The
  admin and the starter then author their themes in different forms; the starter already uses plugin
  blocks.
- **Plugin blocks:** quote-wrap every value with a top-level comma or a leading quote, and add a build
  assertion that compares the theme's computed values or lints unquoted commas. Keep the nested motion
  rules and every non-custom declaration (`font-family`, smoothing, `font-synthesis`, `scrollbar-*`,
  `-webkit-tap-highlight-color`, and a restated `color-scheme`) in a plain unlayered root rule. Leave
  the `default` and `prefersdark` flags off. Fix `motion-vocabulary`'s companion assertion, which
  compares the whole selector with `===`, to match any comma-separated part; it ships in `cairn-audit`,
  so consumers' audits fail until it changes. Move the raw-partial imports to the compiled sheet or
  declare the partial compile-only. Keep the oklch literals free of single quotes so the source-text
  token tests still read them.

## Delivery

The pass branches from `main` after draft docs pass 0+1 merges (ruling 3).

**Recommendation for plan approval: two passes.**

- **Pass A, the theme:** the build (full compile, the sublayer and pin, the custom-surface category,
  the inventory and presence tests), R1's answer, the theme values, every cairn-theme rule and its
  tests, rules 10 to 14, the markup sweep with its post-condition, the starter and its re-emit, the
  fixture screen and its spec, the norms data and `chip-ground-collision` re-key, the design-system
  and public-design-system docs, the facts, the reference pages, and the changelog.
- **Pass B, the agent path:** the `radius-scale` rule and the retired-patch arms, the shipped
  guidance and its exemplar, the recipe source and its sync test, the norms print, the pass B facts
  and reference entries, and the agent-build probe.

The cut falls there for three reasons. Pass A changes the render and must land whole with its gates
green: the norms data and the chip re-key stay in A because `norms:check` and the chip audit break the
moment the radii change. Pass B changes only what ships to agents, touches files disjoint from A's
(`src/lib/audit/rules`, `skills/`, `claude/`), and depends on A's final class vocabulary and fixture.
Pass B cannot go first, because its rules would flag cairn's unswept tree.

## Release

No version bump and no publish. The admin change is visible in every consumer's admin, so it batches
with the next consumer-facing release. The starter half goes live on merge: the Deploy button and the
setup command read `templates/waymark` from `main`.

## Open for the plan

Execution calls, not design calls:

- The exact dark value of the `btn-primary` warm lift, and the soft primary's active step.
- The light value of the selected segment's state hairline, and whether dark's locked value still
  clears 3:1 against the new base-100 sibling.
- The per-site radius role for an element the role rules do not settle. The implementer lists these,
  and the diff review rules on each.
- The site-theme pin mechanism in the showcase's own Tailwind build, proven by a computed-style test.
