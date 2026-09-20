# DaisyUI first

Cairn's admin skeleton is built in DaisyUI, and the default stance is to reach for a stock
DaisyUI component before building one. Every place the engine's own admin diverges from stock
DaisyUI is a deliberate, documented exception, never inertia; this page states the current one
for each, with the ruling that is the why. A home-grown component in a site's own admin that
this page cannot explain is a finding, not something to copy.

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
resting fill. The class stays compiled and stays on every existing call site; no ruling slug
names it on its own, so treat `docs/internal/admin-design-system.md`'s busy-idiom section as the
record until one does.

## Toast

DaisyUI's toast mounts and unmounts a fixed-position stack per message, which risks a screen
reader missing the announcement on unmount. Cairn keeps status regions always mounted and swaps
their text in place instead. Ruling: `polish-busy-idiom`.

## Popover menus

DaisyUI's `.dropdown` is focus-driven: it opens on focus passing through the trigger and ignores
Escape. Cairn's menus are built on the Popover API instead (`popovertarget`/`anchor-name`),
reusing `dropdown menu` classes for styling only, never for the interaction. No ruling slug names
the base decision on its own; `docs/internal/admin-design-system.md` carries it. Its motion
treatment specifically, `display` and `overlay` passing the motion allowlist under
`allow-discrete`, is its own ruling: `motion-discrete-popover`.

## `StatusChip` versus raw badge classes

Stock DaisyUI badges (`badge-error`, `badge-success`, `badge-soft`, `badge-outline`,
`badge-dash`) are safelisted and fine for a plain surface. `StatusChip` exists for the chip
register grammar specifically, because a raw `badge-outline`/`badge-ghost` compiles to a
background and border color that can match one of `AdminTable`'s own zebra-stripe colors and
disappear into the row. Ruling: `audit-admin-statuschip`.

## Segmented-control contrast

For the join-style pickers (a facet, `Pagination`, the editor's Write/Preview capsule), a
lightened `.btn-active` fill on the dark theme measures under 1.5:1 against an unselected
sibling, so cairn pins a hairline ring on top of it. No ruling slug names this one on its own;
`docs/internal/admin-design-system.md` carries the measured number.

## Open opportunity, not yet built

Cairn's documented nav-group recipe is a raw `<details>` element with a custom rotate-on-open
chevron, functionally identical to DaisyUI's own `collapse`/`collapse-arrow` (also
`<details>`-backed). This is the one real "should already be DaisyUI" gap found so far: cosmetic
value only, not yet adopted, and worth checking before adding a second hand-rolled collapsible
group rather than reaching for the stock class.
