# DaisyUI first

Cairn's admin skeleton is built in DaisyUI, and the default stance is to reach for a stock
DaisyUI component before building one. Every place the engine's own admin diverges from stock
DaisyUI is a deliberate, documented exception, never inertia; this page states the current one
for each, with the ruling that is the why. A home-grown component in a site's own admin that
this page cannot explain is a finding, not something to copy.

## Write this, get this

Write the plain daisyUI or cairn role class a screen needs; the theme layer, not the markup, carries the ratified look.

| Write | Get |
|---|---|
| `type-title font-[550] font-[family-name:var(--font-display)]` | the page heading, 24px at weight 550, no bold, in the display face. |
| `type-label font-semibold uppercase tracking-[0.08em] text-muted` | an eyebrow: quiet, uppercase, tracked out. |
| `font-medium text-subtle` | a resting sidebar item; CairnAdminShell renders the nav itself, no screen writes one directly. |
| `btn btn-primary` | the one accent-filled commit action on a surface. |
| `btn btn-ghost` | a quiet button for chrome actions, toolbar controls, and row affordances. |
| `input` | a single-line text field. |
| `select` | a native select control. |
| `card-shell card-shadow` | a floating card surface: the box radius, a hairline edge, and elevation. |
| `btn` | the plain button: a hairline edge, no fill accent. |
| `btn btn-neutral` | the ink opener: a solid neutral fill, the first commit-adjacent step up from plain. |
| `btn btn-soft btn-primary` | the soft primary: a tinted act-on state, softer than the solid commit. |
| `join-item btn btn-active` | the selected segment in a join or segmented control: a neutral wash plus a state hairline. |
| `rounded-selector` | the corner for a chip, tag, count, or other small inline marker. |
| `rounded-field` | the corner for a control, button-like element, or small thumbnail. |
| `rounded-box` | the corner for a panel, card, tile, popover, sheet, or the brand tile. |

Put a custom admin component under `src/routes/admin` or `src/lib/admin`. Those are the two roots the site's admin sheet compiles (`@source` in `src/admin.css`), and both sit inside `cairn-audit`'s default static scope. A component anywhere else, such as `src/lib/components`, is outside the default audit scope, and a utility only it uses is missing from the compiled admin sheet, so it renders unstyled.

## Tooltip

Native `title` no longer carries the engine's own tooltip content on an action control:
`Tooltip` in `/admin-toolkit` does, wrapping the trigger unchanged and adding the three
behaviors DaisyUI's own CSS-only `.tooltip` cannot supply, dismissible on Escape, hoverable (a
pointer can travel from the trigger into the bubble without losing it), and persistent (nothing
hides it on a timer). Ruling: `tooltip-primitive`. `StatusChip` is the one exception left: its
native `title` carries the register's own legend beside an already-present `sr-only` copy, so it
stays. Ruling: `status-chip-title-legend`.

## Guarded buttons (`cairn-btn-guarded`)

DaisyUI adds `pointer-events: none` to `.btn[aria-disabled="true"]`, which kills a tooltip on a
control that must stay perceivable but refused (Publish with nothing to publish, a disabled
Figure button). `cairn-btn-guarded` restores `pointer-events` and supplies the ghost button's
resting fill. The class stays compiled and stays on every existing call site. Ruling:
`polish-busy-idiom`.

## Toast

DaisyUI's toast mounts and unmounts a fixed-position stack per message, which risks a screen
reader missing the announcement on unmount. Cairn keeps status regions always mounted and swaps
their text in place instead. Ruling: `polish-busy-idiom`.

## Popover menus

DaisyUI's `.dropdown` is focus-driven: it opens on focus passing through the trigger and ignores
Escape. Cairn's menus are built on the Popover API instead (`popovertarget`/`anchor-name`),
reusing `dropdown menu` classes for styling only, never for the interaction. No ruling slug names
the base decision on its own. Its motion
treatment specifically, `display` and `overlay` passing the motion allowlist under
`allow-discrete`, is its own ruling: `motion-discrete-popover`.

## `StatusChip` versus raw badge classes

Stock DaisyUI badges (`badge-error`, `badge-success`, `badge-soft`, `badge-outline`,
`badge-dash`) are safelisted and fine for a plain surface. `StatusChip` exists for the chip
register grammar specifically, because a raw `badge-outline`/`badge-ghost` compiles to a
background and border color that can match one of `AdminTable`'s own zebra-stripe colors and
disappear into the row. Ruling: `audit-admin-statuschip`.

## Segmented-control contrast

For the join-style pickers (a facet, `Pagination`, the editor's Write/Preview capsule), write
`join-item btn btn-active` on the selected segment and add nothing else. The rule renders the
selected segment as a neutral wash (a 7% mix of `base-content` over `base-100`) at weight 600,
with a state hairline on the segment's own border in both themes. It keys on all five selected
forms: `.btn-active`, `aria-pressed="true"`, `aria-checked="true"`, `aria-current` (unless
`false` or empty), and a checked radio. A color variant, `btn-outline`, and `btn-dash` keep their
own fill and ink, so a `join-item btn btn-primary` selected segment stays primary. The check
glyph, where the control shows one, is the screen's own job. `npx cairn-audit norms <role>`
prints the measured values.

## Open opportunity, not yet built

Cairn's documented nav-group recipe is a raw `<details>` element with a custom rotate-on-open
chevron, functionally identical to DaisyUI's own `collapse`/`collapse-arrow` (also
`<details>`-backed). This is the one real "should already be DaisyUI" gap found so far: cosmetic
value only, not yet adopted, and worth checking before adding a second hand-rolled collapsible
group rather than reaching for the stock class.
