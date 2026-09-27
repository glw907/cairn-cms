# Theme identity: cairn's own look through the DaisyUI levers

**Status:** approved design (Geoff, 2026-09-26), pending spec review.
**Arc record:** `docs/internal/record/2026-09-26-theme-identity-arc-log.md` (every round, candidate, and verdict).
**Probes:** rendered from the real compiled admin sheet in the brainstorm companion; the final
page is `final-1.html` plus `switch-1.html` in the session's `.superpowers/brainstorm/` folder
(gitignored, reproducible from this spec).

## Goal

Geoff, verbatim: "my goal is not to be dramatic, but rather to make cairn more coheriently
follow it's own design ideology and not appear 100% default DasiyUI."

The admin already had its own color (Warm Stone, the violet primary) and type (Bricolage
Grotesque, IBM Plex Sans, iA Writer Mono). Everything else still ran on DaisyUI's stock
settings or on per-element patches that fight them. This pass moves cairn's identity into the
theme layer, where DaisyUI expects a theme to live. Because it lives in the theme, a
developer's custom admin screen written in plain DaisyUI classes inherits it with no work. That
is the design charter's "an extended cairn should still feel like one visually coherent system."

## Scope

In scope:

- The admin theme: both roots (`cairn-admin`, `cairn-admin-dark`) and the scoped component
  layer in `src/lib/components/cairn-admin.css`, plus the markup sweep the theme change makes
  possible in `src/lib/components` and `src/lib/admin-toolkit`.
- The starter theme as a **sibling identity**: `examples/showcase/src/theme/theme.css` and
  its byte-identical copy `templates/waymark/src/theme/theme.css`. The sibling shares
  geometry and edge grammar with the admin; it keeps its own palette, faces, and type weights,
  so the public output stays design-agnostic by charter.

Out of scope:

- Color. The violet primary is fixed (July arc). No palette value changes, except the new
  alert inks below.
- The emphasis ladder and the accent reservation (July arc, A3). This pass encodes them in
  the theme; it does not change them.
- Motion (ruled separately, 2026-09-15).
- The editor canvas (`.cm-*`), the preview iframe, and the public reading surface
  (`prose.css`, callouts, the site's own directives).
- Font assets. The shipped Bricolage subset carries only the `wght` axis, so optical sizing is
  not available without re-cutting the font; no re-cut in this pass.

## The three levers

Every decision below uses one of three layers, in this order of preference:

1. **DaisyUI theme variables** on the theme roots: `--radius-selector`, `--radius-field`,
   `--radius-box`, `--size-selector`, `--size-field`, `--border`, `--depth`, `--noise`.
2. **DaisyUI component variables** (`--btn-bg`, `--btn-p`, `--input-color`, ...), set by
   scoped rules.
3. **Scoped overrides** in the `@layer components` block, for what no variable reaches.

A decision that could only land as per-element markup is out of bounds, because a developer's
screen would not inherit it. The markup sweep only removes patches and maps hardcoded values
onto tokens; it never adds a new per-element idiom.

## Admin decisions

### Material (round 1, verdict B)

- `--depth: 0` and `--noise: 0` on both roots. Depth 1 is DaisyUI's signature bevel: the
  button and input insets, the lifted active menu item, the toggle and checkbox shading. Its
  shadows are also pure black, which breaks the design system's own rule that shadows are
  warm-tinted and never achromatic.
- The one exception: `btn-primary` keeps a faint warm lift,
  `0 1px 2px -1px oklch(35% 0.04 75 / .35)` (light). The existing `.btn-primary` lift rule is
  the home for it. Dark takes the equivalent at the dark shadow tint.

### Corners (round 4, verdict B tight)

- The ladder is `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`,
  `--radius-box: 0.5rem`, a 2 : 3 : 4 ratio.
- **Every framed element resolves to one of the three tokens.** About 80 markup sites use fixed
  Tailwind radii that ignore the theme (`rounded` ×38, `rounded-lg` ×14, `rounded-xl` ×10,
  `rounded-md` ×9, `rounded-sm` ×10, one `rounded-[0.55rem]`), plus literal radii in
  component `<style>` blocks (`HelpHome.svelte`, `admin-toolkit/Tooltip.svelte`). Each maps by
  the element's role:
  - chip, tag, count, small inline marker: `rounded-selector` (`var(--radius-selector)`);
  - control, button-like element, small thumbnail: `rounded-field`;
  - panel, card, tile, popover, the brand tile: `rounded-box`.
- **Chips leave the pill family** (the July "pill family" recipe is superseded): a
  `rounded-full` chip, tag, or count moves to `rounded-selector`.
- **True circles stay round:** the avatar, the dirty-state dot, spinners, and the switch
  (below). A `rounded-full` on one of these is correct and stays.
- **Concentric corners.** An item inside a padded rounded panel takes the panel's radius
  minus the inset: `.menu` items in a `rounded-box` dropdown with `p-1` get
  `calc(var(--radius-box) - 0.25rem)`. The rule is general; the dropdown menus are the known
  instances.
- Nothing reaches zero. Square corners throughout is the broadsheet template look, and the
  charter's "warm" rules it out.

### Density (round 2)

- `--size-field: 0.28125rem` and `--size-selector: 0.28125rem`, one DaisyUI step up. A
  `-sm` control grows from 32px to 36px. Type size is unchanged. This answers the charter's
  standing grade that the base size "might be a little too small."
- Because the phone desk band (48px) and the toolbar row (44px) are fixed-height compositions,
  the five-viewport check must prove both still compose at 320 and 390.

### Buttons (rounds 2 and 4)

- **The emphasis ladder on plain classes.** `btn-neutral` is the ink opener, with its hover
  at `var(--cairn-ink-hover)`. `btn-primary` is the violet commit. `btn-soft btn-primary`
  is the tinted act-on state, `color-mix(in oklab, var(--color-primary) 10%, transparent)`
  with no border. After this pass a developer writes those three classes and gets the ruled
  ladder.
- **The plain `btn` is a hairline.** Background `var(--color-base-100)`, border
  `color-mix(in oklab, var(--color-base-content) 22%, transparent)`. It applies to a `btn`
  with no color or style modifier; ghost, soft, and colored buttons are untouched.
- **The active join segment** is a neutral wash,
  `color-mix(in oklab, var(--color-base-content) 7%, var(--color-base-100))`, at weight 600,
  in both themes. (Round 3 found that `base-200` reads as a hole in dark mode, since it is
  darker than the segments around it.) This is the July segment ruling, "neutral wash +
  semibold," now carried by the theme.
- **Button type.** Labels are weight 500 on plain and ghost buttons and 600 on
  `btn-primary`, `btn-neutral`, `btn-soft btn-primary`, and `btn-error`.
- **Padding.** `--btn-p: 0.875rem` at `btn-sm`, as approved in the round 4 render. That is
  2px wider per side than DaisyUI's 0.75rem default. Other sizes keep DaisyUI's defaults
  unless the felt-refinement audit grades them off.

### Alerts (round 2)

Alerts become a tinted panel with a hairline edge and a dark on-surface ink, in place of
DaisyUI's solid saturated slab. The standing grade names "too many popping colors" on one
screen.

| Alert | Panel (light) | Edge | Ink (light) | Panel and ink (dark) |
|---|---|---|---|---|
| error | error 7% over base-100 | error 30% | `oklch(45% 0.17 25)` | 12%; `oklch(82% 0.1 25)` |
| warning | warning 12% over base-100 | warning 45% | `var(--cairn-warning-ink)` | 12%; same token |
| info | info 7% over base-100 | info 30% | `oklch(44% 0.12 240)` | 12%; `oklch(82% 0.08 240)` |

The values are the probe's. Each ink must measure at least 4.5:1 against its own panel in its
theme before it lands. An ink that fails moves in lightness only, holding hue and chroma. A
success alert follows the same construction if one exists in the tree.

`btn-error` stays a solid fill: a destructive commit is the one place restraint gives way
(Geoff saw it in the final render and kept it).

### The switch (verdict C)

- The switch is exempt from the corner ladder. Track and knob are fully round, the same
  exemption as the avatar and the dot, because a switch is a physical metaphor.
- On fills the track with the neutral ink (`--color-neutral`) and turns the knob
  `--color-base-100`. State reads by fill as well as position. Ink, not violet, keeps the
  accent reservation, and dark mode inverts cleanly the same way the ink opener does.
- Off keeps DaisyUI's construction: the 50% `base-content` edge and knob, which already
  clears the 3:1 non-text floor.

### Type and icons (round 4)

- **The page heading drops to weight 550.** The recipe changes from
  `text-2xl font-bold font-[family-name:var(--font-display)]` to the same classes with
  `font-[550]` in place of `font-bold`. It applies to the `text-2xl` display page headings.
  The 18px `type-heading` dialog and section headings stay at 700 in this pass; the
  felt-refinement audit grades whether they should follow. The K4 wordmark and the
  display-face tracking rule are untouched.
- **Lucide strokes go to 1.75px**, through one scoped rule on the `lucide-icon` class that
  `@lucide/svelte` puts on every icon. Hand-authored inline SVGs keep their explicit
  `stroke-width`, because several are deliberately heavier at small sizes (2.5 and 3 on the
  check glyphs).

### The markup sweep

With the theme carrying the idiom, the per-element patches go:

- `btn ... border-transparent bg-neutral text-neutral-content shadow-none
  hover:bg-[var(--cairn-ink-hover)]` becomes `btn btn-neutral`.
- The Publish-site tint recipe (`border-transparent bg-primary/10 text-primary shadow-none
  hover:bg-primary/15`) becomes `btn btn-soft btn-primary`.
- Any `shadow-none` that existed only to cancel depth goes.
- The fixed radii map onto the tokens, following the corner rules above.

The counts at spec time are 5 `shadow-none`, 7 `border-transparent`, and 4 ink-hover
brackets. The plan re-counts before the sweep. The sweep changes no layout, copy, or
behavior. A site where removing a patch changes the render beyond the intended theme change is
a finding, not a silent fix.

## Starter theme decisions

Both copies change identically. `examples/showcase` and `templates/waymark` must stay
byte-identical, and the plan checks that.

- **The same corner ladder:** `--radius-selector: 0.25rem`, `--radius-field: 0.375rem`,
  `--radius-box: 0.5rem`. The starter's current 0.28 / 0.4 / 0.625rem is close already, so
  the visual change is small. Geometry becomes the shared family trait.
- **Hairline outlines:** `btn-outline` and `badge-outline` take the admin's hairline edge,
  `color-mix(in oklab, var(--color-base-content) 22%, transparent)`, in place of DaisyUI's
  full-strength ink edge.
- **Unchanged:** the starter's palette, faces, heading weights, size step (public buttons
  follow the documented `btn-lg` touch-target advice), depth and noise (already 0), callouts,
  and alerts. Those are the site's own design.
- The re-skin recipe at the top of `theme.css` gains one line naming the ladder as the family
  geometry and saying that a site may change it freely.
- `check:public-tokens` must stay green. The hairline edge is a non-text boundary on a control
  whose label identifies it, so it is exempt from the 3:1 floor, but the plan records the
  measured value anyway.

## Proof

- **Contrast, measured, in both themes:** every alert ink against its panel (4.5:1); the
  switch's checked track against `base-100`, and its knob against the track (3:1 non-text);
  the active join segment's text (4.5:1). Record the numbers in the design-system doc beside
  the tokens, the way the existing tokens record theirs.
- **The five-viewport bar** (320, 390, 768, 1440, 2560) in light and dark, with the phone desk
  band and the toolbar row checked explicitly after the size step.
- **Baselines** for `admin-visual` and `site-visual` regenerate on CI, the canonical renderer.
  This workstation's Chromium renders them slightly off (durable gotcha).
- **A fresh-context `visual-verifier` read** of the built showcase against the ratified
  probe (`final-1.html` and `switch-1.html`).
- **The felt-refinement audit, once, at settle:** a typography-and-rhythm lens and a
  color-surface-depth lens over the built admin. They return a ledger that is expected to be
  mostly already-right. The dialog-heading weight and the non-`sm` button padding are named
  inputs to it.
- **Geoff's before and after,** light and dark, at 1440 and 390.
- The existing gates stay green: `npm run check`, `npm test`, `check:admin-css-classes`,
  `check:invisible-craft` (the depth-0 change removes achromatic shadows, so it should only
  get easier), and the showcase e2e.

## Documentation

- `docs/internal/admin-design-system.md`:
  - The Tokens section: the new theme values, the alert inks with their measured contrast,
    the switch, and the replacement of the depth and bevel language.
  - A new corner-system subsection: the ladder, the role mapping, the true-circle exemptions,
    concentric corners, and never zero.
  - The type recipes: the page heading at 550, Lucide at 1.75.
  - The pill-family text replaced by the chip rule.
  - A new load-bearing rule: **identity lives in the theme layer**, and a new idiom is a
    theme or component-layer rule, never a per-element patch.
- `docs/internal/record/2026-09-26-theme-identity-arc-log.md`: the arc log, committed as the
  July arc's log was.
- A facts bullet under `docs/internal/facts/` for the public behavior change: a custom admin
  screen's plain DaisyUI classes now render cairn's ladder, a bare `btn` renders as a
  hairline, and fixed Tailwind radii in a developer's own markup do not follow the ladder, so
  use `rounded-selector`, `rounded-field`, or `rounded-box`. `check:facts` gates it.
- The reference arm: update `docs/reference/admin-grammar-tokens.md` or any reference page
  that names a changed value; `check:reference` stays green.
- The extend arm is frozen against rewrites. If the custom-screen guide gives advice this
  pass makes wrong (for example, telling a developer to copy the `shadow-none` patch), fix
  that sentence under the frozen-page deficiency rule.
- `CHANGELOG.md` under `## Unreleased`: the visible admin change. `Consumers must:` nothing;
  a site with custom admin screens should re-check them, and the entry says why.
- `ROADMAP.md`: nothing ships off it unless an item names this work. The component kit entry
  gains no scope from this pass.

## Release

No version bump and no publish. The change is visible in every consumer's admin, so it
batches with the next consumer-facing release, per the release cadence.

## Open for the plan

These are execution calls, not design calls:

- The exact dark value for the `btn-primary` warm lift.
- The per-site radius role for any element the three role rules do not settle cleanly. The
  implementer lists these, and the diff review rules on each.
- Whether the Lucide stroke rule and the switch rule need `@layer components` or one of the
  documented unlayered exceptions. Unlayered needs the same forcing reason as the existing
  fourteen: a daisyUI utilities-layer declaration that nothing else outranks.
