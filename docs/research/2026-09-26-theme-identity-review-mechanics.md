# Theme identity spec review: mechanics and feasibility

**Target:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` at `2776dfa3`.
**Lens:** does each mechanism behave as stated. Taste decisions are not re-litigated.
**Method:** scratch builds through the real `buildAdminCss` pipeline (plus a probe page added as an
extra `@source`), candidate rules appended in four placements (none, `@layer components`,
`@layer utilities`, unlayered, and a named sublayer `@layer utilities { @layer cairn-theme }`), and
computed styles read in headless Chromium through the repo's Playwright. Transitions were disabled
for the state reads. Scratch files: the session scratchpad (`v-*.css`, `p-*.html`, `probe*.mjs`).
Pinned versions: daisyUI 5.7.44, Tailwind 4.3.2, @lucide/svelte 1.47.0.

**Counts:** 1 blocker, 6 major, 8 minor. Owner forks are marked inline.

## The one fact behind most findings

daisyUI 5 does not emit component rules into `@layer components`. Every component rule compiles
into sublayers of `@layer utilities` (`node_modules/daisyui/components/button.css` opens with
`@layer utilities{@layer daisyui.l1.l2.l3{... .btn{...}`; the scratch sheet shows
`@layer utilities { @layer daisyui.l1.l2 {` at line 344 onward). Cascade layers resolve before
specificity, so a cairn rule in `@layer components` loses to every daisyUI declaration it competes
with, whatever its selector. The partial's own comments already say this for rules 1 to 14; the spec
does not carry it into its lever model.

Probe result, same rules in each placement (light theme, `btn-sm` at the new size step):

| Rule the spec needs | `@layer components` | named sublayer / `@layer utilities` / unlayered |
|---|---|---|
| `--btn-p: 0.875rem` on `.btn-sm` | 12px (daisyUI's .75rem wins) | 14px |
| Hairline plain `btn` (`--btn-bg`, `--btn-border`) | base-200 fill, no edge | base-100, 22% edge |
| `btn-soft btn-primary` tint, no border | stock 8% + 10% border | 10% tint, transparent edge |
| Button label weight 500 | 600 | 500 |
| Switch checked: track neutral, knob base-100 | track base-100, knob ink | track neutral, knob base-100 |
| Alert error panel + ink | solid `oklch(0.56 0.2 25)` slab | tinted panel, `oklch(45% 0.17 25)` ink |
| Concentric menu item radius (declaration on the item) | 6px | 4px |
| Lucide `stroke-width: 1.75` | 1.75 (works) | 1.75 |
| `font-[550]` utility | 550 (works) | 550 |

Only the two rows with no daisyUI competitor work in `@layer components`.

## Blocker

### B1. Levers 2 and 3 as specified cannot reach daisyUI

- **Location:** spec lines 45-57 (the three levers), 102-150 (buttons, alerts, switch), 258-263
  ("Open for the plan" treats the layer question as a two-rule execution call).
- **Defect:** the spec homes component-variable overrides and scoped overrides in the
  `@layer components` block. Every button, join, switch, alert, and padding rule loses there (table
  above). The open item names only the Lucide rule and the switch; Lucide is the one rule that does
  not need it, and every button and alert rule does.
- **Evidence:** the probe table. The design doc repeats the premise:
  `docs/internal/admin-design-system.md:76-80` ("a rule must sit in `components` to lose to Tailwind
  utilities").
- **Proposed fold (OWNER FORK on the mechanism, since it amends a load-bearing rule):**
  - **Option A (recommended): a named sublayer inside utilities.** Author the theme rules in
    `@layer utilities { @layer cairn-theme { ... } }` in the partial. Verified end to end: Tailwind
    4.3.2 passes the block through unchanged (scratch `tw-out2.css:8131`), and in Chromium it beats
    every daisyUI sublayer while still losing to a markup utility. A `btn btn-sm px-2 font-semibold`
    kept 8px and weight 600 against a sublayer rule setting weight 500 and `--btn-p`. That preserves
    the design system's "a utility still wins" promise, which unlayered rules break. Pin the
    sublayer order in `build-admin-css.mjs`'s `layerOrder` (`@layer utilities.daisyui,
    utilities.cairn-theme;` after the top-level statement) so it never rides emission order, the
    same reason that statement already exists for `properties`.
  - **Option B: more pinned unlayered rules** (roughly eight to ten). Works for the variables, but
    any rule that sets a real property (label weight, switch fill, alert color) then outranks every
    utility. The two plain-button sites that mark their active state with `font-semibold`
    (`class="btn btn-sm {value === '' ? '... font-semibold' : ''}"`) would lose that cue to an
    unlayered `font-weight: 500`.
  - Either way: amend the load-bearing rule at `admin-design-system.md:76-86`, and state in the
    spec which rules go in which layer. Prefer overriding daisyUI's variables (`--btn-bg`,
    `--btn-border`, `--btn-fg`, `--btn-p`, `--alert-color`) over properties. A variable override
    leaves a markup utility that sets the property directly still winning, even from a high layer.

## Major

### M1. The `.btn-primary` lift rule the spec names as home has never painted

- **Location:** spec line 67-69; `src/lib/components/cairn-admin.css:675-684`.
- **Defect:** the existing lift rule sets `box-shadow` in `@layer components`. daisyUI's `.btn`
  sets `box-shadow: var(--btn-inset) inset, var(--btn-shadow)` in `utilities`, so the cairn lift
  loses today. Placing the warm lift there ships nothing, and with `--depth: 0` the primary button
  ends with no shadow at all.
- **Evidence:** the shipped sheet as built today (no theme change), primary at rest:
  `oklch(1 0 0 / 0.06) 0px 0.5px 0px 0.5px inset, oklab(0.52 … / 0.3) 0px 3px 2px -2px, …`. That is
  daisyUI's depth shadow; neither of cairn's two violet layers is present. The design doc also claims
  the lift works (`admin-design-system.md:80`).
- **Fold:** move the lift into the winning layer (B1), either as `box-shadow` or as `--btn-shadow`.
  Decide whether it still grows on hover. A resting rule in a winning layer also beats daisyUI's
  `:hover` reset, so hover must be written out. Correct the design doc's claim. Note in the arc log
  that the round 1 render could not have come from the shipped rule.

### M2. A resting override freezes daisyUI's state machine; soft hover and focus become illegible

- **Location:** spec lines 104-111 (ladder, hairline), 169-172 (sweep mappings).
- **Defect:** daisyUI drives hover, `:active`, `:focus-visible`, `:checked`, and disabled by
  re-setting `--btn-bg`/`--btn-border`/`color` in lower sublayers (`daisyui.l1`, `daisyui`). A
  resting override in any layer that wins (B1) also wins in those states. The spec gives no value
  for any of them.
- **Evidence (transitions off):**
  - `btn-soft btn-primary`, keyboard focus and hover, with the override: background
    `primary / 0.1`, color `oklch(0.98 0.012 293)`. That is `--btn-fg` (primary-content), which
    daisyUI's `.btn:hover` and `:focus-visible` apply. The result is near-white text on a pale tint,
    about 1.1:1.
  - Stock `btn-soft btn-primary` with no override goes to a solid violet fill on hover and focus
    (`oklab(0.4836 …)`). The old recipe's `hover:bg-primary/15` is lost either way, so the sweep
    mapping at line 171-172 changes hover behavior, which line 178-179 forbids silently.
  - Plain hairline `btn` on hover with the override: stays `oklch(0.99 0.004 75)` with the 22% edge.
    It gives no hover feedback, the same trap pinned rule 12 exists to undo.
  - `btn-neutral`'s `--cairn-ink-hover` has to beat `.btn:hover` in `daisyui.l1`, so it needs the
    winning layer too.
- **Fold:** specify each override as a full state set, the way rules 10 to 12 do: rest, hover,
  `:focus-visible`, `:active`, and the four disabled forms excluded. For soft primary, also pin
  `--btn-fg: var(--color-primary)` so no state can swap in primary-content, and give hover the
  `primary 15%` step the old recipe had. **OWNER FORK:** keep daisyUI's stock soft behavior (solid on
  hover, the daisyUI idiom) or the tinted hover (continuity with today). Recommend the tinted hover;
  it is what Geoff saw and what the accent reservation implies.

### M3. The active join segment collides with pinned rules 10 to 12, and the proof drops the 3:1 state cue

- **Location:** spec lines 112-116 and 203-206; `cairn-admin.css:1020-1139` (rules 10, 11, 12).
- **Defect:** rules 10 and 12 already restyle every dark `.btn-active` (a white-ward fill, the
  `--btn-border: var(--btn-color, oklch(57% 0.012 75))` hairline, and a hover step), unlayered and
  pinned. The spec's both-theme neutral wash does not say whether it replaces, narrows, or sits on
  top of them. Rule 10's comment and the design doc
  (`admin-design-system.md:652-672`) record that on dark the fill alone cannot reach 3:1, so the
  **3:1 state cue rides on `--btn-border`**. The spec's proof asks only for the text at 4.5:1 and
  never re-measures that cue. The new hairline sibling (base-100 fill, 22% edge) also changes rule
  10's locked margins, which were measured against a base-200 sibling.
- **Evidence:** `ListToolbar.svelte:289-290` carries both `btn-active` and `aria-checked`;
  `Pagination.svelte:102` carries `btn-active`. daisyUI treats `[aria-checked=true]`,
  `[aria-pressed=true]`, and `[aria-current]` as active too (`button.css`, `daisyui.l1.l2`).
- **Fold:** state that the active-segment rule supersedes rules 10 and 12 (or narrows them to
  non-join `.btn-active`). Key it on `.btn-active` plus the three ARIA forms. Keep a state border
  and add it to the proof: the active segment's edge at 3:1 against the resting sibling and the
  ground, in both themes.

### M4. Every mechanism trips the custom-surface ratchet, and the spec does not authorize it

- **Location:** spec lines 218-220 (existing gates stay green); `cairn-admin.css:19-28` (the Tier-2
  floor "may only SHRINK ... never extended ad hoc"); `scripts/checks/custom-surface-budget.json`.
- **Defect:** `check:custom-surface` pins the unlayered set by exact selector (18 today) and caps
  `@layer components` selectors at 19. The current count is exactly 19
  (`componentsLayerSelectorCount` = 19). Even the Lucide rule alone breaks the cap. The gate counts
  every `[data-theme=`-anchored rule outside the components block as unlayered, so option A's
  sublayer also registers there. The spec's gate list omits `check:custom-surface`, the pinned set
  in `admin-css-build.test.ts`, and the custom-surface ledger update the floor requires.
- **Fold:** the spec should authorize the ratchet change explicitly as a deliberate act: a new
  category for the theme sublayer (or new allowlist entries), a raised components cap if any rule
  stays there, and the ledger entry. Add `check:custom-surface` to the Proof list.

### M5. The shipped sheet only carries scanned classes, so the switch and the info alert have no delivery

- **Location:** spec lines 17-19, 129-137, 142-150, 235-238 (the facts bullet's inheritance claim).
- **Defect:** the admin sheet is tree-shaken to classes found under `src/lib/components` and
  `src/lib/admin-toolkit`, and a consumer's custom screen rides only that sheet. The admin uses no
  daisyUI `.toggle` (`admin-design-system.md:1051`: "It adds no DaisyUI `.toggle`"). `.toggle`
  compiles today only because the bare word "toggle" appears in scanned source text (identifiers
  and comments in `editor-preferences.svelte.ts`, `ManageEditors.svelte`, and others). No size or
  color modifier compiles. `alert-info` does not compile at all.
- **Evidence:** `grep -c` on `dist/components/cairn-admin.css`: `.toggle:checked` 3, `.alert-info` 0,
  `.btn-soft` 0, `.btn-neutral` 0. The last two compile once the sweep uses them.
- **Fold:** add every class the spec promises to developers (`toggle`, `alert-info`, and any others
  the facts bullet names) to a safelist block with the compatibility-safelist discipline, and have
  `admin-sheet-inventory.test.ts` hold them. The switch has no in-tree call site, so its proof needs
  a fixture (the showcase or a probe page), which the Proof section should name.

### M6. The switch rule as sketched misses two of daisyUI's three checked forms, the round shape, and color variants

- **Location:** spec lines 142-150.
- **Defect and evidence:**
  - daisyUI's checked selector is `.toggle:checked, .toggle[aria-checked=true],
    .toggle:has(>input:checked)`. A rule on `:checked` alone changed only the native input. The
    `aria-checked` and label-wrapped forms stayed on base-100 with an ink knob (probe `togaria`,
    `toghas`).
  - "Fully round" needs its own override. daisyUI derives the track radius from `--radius-selector`
    (the `.toggle` rule's `border-radius: calc(var(--radius-selector) + …)`, and the knob's
    `border-radius: var(--radius-selector)`). At the new ladder it measures 8.375px on a 27px
    track, so it will not read round.
  - A blanket `--input-color: var(--color-neutral)` in a winning layer also overrides
    `toggle-primary`, `toggle-success`, and the other color variants (`daisyui.l1.l2`), so a
    developer's colored switch silently turns neutral.
- **Fold:** state the selector set (three checked forms, with `:disabled` left to daisyUI). Add
  `border-radius: 9999px` for the track and `::before`. Scope the neutral fill to a toggle with no
  color modifier (enumerate the eight), or write the fill as `var(--input-color)` and default only
  `--input-color`.

## Minor

### m1. The hairline selector has to enumerate, and one shortcut is a trap

- **Location:** spec line 109-111.
- "No color or style modifier" is expressible only by enumeration:
  `:not(.btn-primary, .btn-secondary, .btn-accent, .btn-neutral, .btn-info, .btn-success,
  .btn-warning, .btn-error, .btn-ghost, .btn-soft, .btn-outline, .btn-dash, .btn-link)`. It also
  needs to exclude the disabled forms and the active or ARIA-pressed forms (M3). `join-item` needs
  no exclusion: the probe's plain join item took the hairline as intended.
- The tempting shortcut, `.btn { --btn-bg: var(--btn-color, base-100) }`, pulls every colored
  button into a winning rule and freezes their hover (M2). Do not take it.
- Blast radius: 84 class strings carry `btn` with no color or style modifier, including the
  Pagination ellipsis (`join-item btn btn-sm btn-disabled`), which gains a hairline unless disabled
  is excluded.

### m2. Lucide: the mechanism works; tighten the selector

- **Location:** spec lines 160-163.
- A CSS `stroke-width` beats the `stroke-width` presentation attribute @lucide/svelte writes on the
  `<svg>`: measured 1.75 on the svg and inherited by its `<path>`, even from `@layer components`.
  Lucide puts the attribute on the root only (`buildLucideIconNode.js`), so inheritance is enough.
- `Icon.svelte:25` carries `// @TODO: maybe drop the extra lucide-icon class altogether.` The
  default `lucide` class is the stabler hook.
- The rule also flattens any explicit `strokeWidth` prop and any `absoluteStrokeWidth` icon. None
  exists in `src/lib` today; a developer's could. Fold: `.lucide[stroke-width="2"] { stroke-width:
  1.75 }` retunes only default-stroke icons and leaves deliberate ones alone.
- It still counts against the components cap (M4).

### m3. OWNER FORK: hand-authored icons at stroke 2 will sit beside Lucide at 1.75

- **Location:** spec lines 160-163.
- The heavier hand-authored glyphs (2.5 and 3) are a minority. The inline attributes break down as
  16 at `2`, 2 at `2.2`, 2 at `2.4`, 10 at `2.5`, and 3 at `3`. On top of that, the
  `EditorToolbar.svelte` `strokeIcon` snippet renders the toolbar's path icons at a hard `2` (about
  24 icons). Most of the `2` sites are Lucide transcriptions, so the chrome would mix 1.75 and 2.
- Options:
  - (a) Leave them. This is cheapest, and the mix is visible side by side in the toolbar and nav.
  - (b) The sweep maps the default-`2` transcriptions to 1.75 and keeps the deliberate heavies.
    This is a markup edit onto the token, which the sweep's rule allows.
  - (c) A CSS rule on `svg[stroke-width="2"]`. Too broad, since it reaches the editor canvas and
    the host page.
- Recommend (b).

### m4. The page-heading recipe the spec quotes does not exist in the tree; the mechanism is sound

- **Location:** spec lines 154-159.
- `src/lib` has no `text-2xl`. The page heading is `PageHeader.svelte:59`,
  `type-title font-bold font-[family-name:var(--font-display)]`, and it is the only site. The spec
  copied the stale recipe at `admin-design-system.md:264`. The change is one class on one public
  component, which is what makes developers inherit it.
- `font-[550]` compiles (`--tw-font-weight: 550; font-weight: 550`). The shipped Bricolage woff2's
  `wght` axis is 200-800, the `@font-face` declares `400 800`, and 550 renders as a true
  interpolation (canvas advance at 120px: 500 → 1429, 550 → 1440, 600 → 1444).
- **OWNER FORK:** the editor's `cairn-doc-title` (`text-3xl font-bold` display, 30px) is a larger
  display heading than the page title and the spec is silent on it. Recommend naming it as an input
  to the felt-refinement audit alongside the dialog headings.

### m5. The starter's hairline outlines need the same layer decision, and a home

- **Location:** spec lines 189-191.
- `.btn-outline`'s `--btn-border` is set in `daisyui.l1.l2.l3` and `.badge-outline`'s
  `border-color: currentColor` in `daisyui.l1.l2`, both inside the site's own `@layer utilities`.
  B1 applies unchanged.
- `theme.css`'s header defines it as values only ("nothing below duplicates chassis machinery, only
  chassis VALUES"), and today it holds only variable blocks. The spec names no file or layer for
  these rules.
- Use `--btn-border: var(--btn-color, <hairline>)`, so `btn-outline btn-primary` keeps its colored
  edge and only neutral outlines turn hairline. The spec's "in place of DaisyUI's full-strength ink
  edge" reads that way already.

### m6. Tailwind splits every `color-mix` into a solid fallback

- Evidence: the scratch compile emitted `--btn-bg: var(--color-primary); @supports (color:
  color-mix(in lab, red, red)) { --btn-bg: color-mix(… 10%, transparent) }` for the soft tint. The
  alert panels split the same way.
- On an engine without `color-mix` the soft button renders violet text on solid violet, and the
  alert renders dark ink on a saturated slab. Rule 10's comment already documents this splitter.
- Low consequence given current support. Fold: note it in the doc, or write the fallback
  deliberately, the way rule 10 keeps its cue on a non-mixed border.

### m7. The sweep mapping and inventory details

- The ink-opener patch carries `tracking-small-semibold` (3 of the 4 sites). The mapping at line
  169-170 drops it, which changes tracking. Keep it, or move E3 tracking into the button rule.
- `alert-success` exists (5 sites). The spec says "if one exists", so give its values in the table.
- The radius inventory misses `rounded-t-2xl` (`CairnMediaLibrary.svelte:974`, the mobile sheet)
  and two `rounded-[var(--radius-field)]` arbitrary forms, which should become `rounded-field`.
  `PreviewBanner.svelte:95` carries a literal `0.5rem` fallback.

### m8. Concentric corners: declare the variable on the container

- A `border-radius` declaration on the menu items loses in `@layer components` (6px measured).
- daisyUI's `.menu` never declares `--radius-field`; the item rule reads it
  (`menu.css`: `border-radius: var(--radius-field)`). So `--radius-field: calc(var(--radius-box) -
  0.25rem)` on the padded dropdown container would reach the items from `@layer components`. This
  is inferred from source, not probed. It also shrinks any field or button inside that menu, which
  is concentric too.
- This is the one component-variable (lever 2) case the components layer can carry.

## Checked and sound

- `rounded-selector`, `rounded-field`, and `rounded-box` are real utilities: daisyUI registers them
  in `utilities/radius.css`, and all three compiled in the scratch build. They sit directly in
  `utilities`, so they beat daisyUI's own component radius.
- The size step works: a `btn-sm` measured 36px with the border inside, since the box-sizing reset
  keeps it border-box. Omitting Preflight has no interaction with the theme-variable path.
- The `btn-soft` family needs `--btn-border` in its override as well as `--btn-bg`. Stock daisyUI
  already draws a 10% edge.
