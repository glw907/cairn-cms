# Admin grammar tokens

The admin's structural type and spacing vocabulary: eighteen CSS custom properties declared once
in `cairn-admin.css`, outside the light and dark theme blocks, plus the eleven named grammar role
utilities that are the only supported way to reach them from markup. A grammar token names a
relationship rather than a color: a heading's role, a control-to-control gap. The same value holds
in both themes.

Two further utilities, the container roles, close this page's set at thirteen. They name a card
surface rather than a grammar token, so they read from the palette and DaisyUI layers instead.

## The token inventory

Seven `--cairn-type-*` roles. Each pairs a `font-size` token with a `--leading` token that carries
the role's `line-height`:

| Role | `font-size` token | Value | `line-height` token | Value |
|---|---|---|---|---|
| Title | `--cairn-type-title` | `1.5rem` | `--cairn-type-title--leading` | `2rem` |
| Heading | `--cairn-type-heading` | `1.125rem` | `--cairn-type-heading--leading` | `1.75rem` |
| Subtitle | `--cairn-type-subtitle` | `0.9375rem` | `--cairn-type-subtitle--leading` | `1.1875rem` |
| Body | `--cairn-type-body` | `0.875rem` | `--cairn-type-body--leading` | `1.25rem` |
| Meta | `--cairn-type-meta` | `0.8125rem` | `--cairn-type-meta--leading` | `1.0625rem` |
| Label | `--cairn-type-label` | `0.6875rem` | `--cairn-type-label--leading` | `0.875rem` |
| Chip | `--cairn-type-chip` | `0.625rem` | `--cairn-type-chip--leading` | `0.8125rem` |

Four `--cairn-gap-*` roles, each a `gap`:

| Token | Value | Names the relationship |
|---|---|---|
| `--cairn-gap-label` | `0.25rem` | A label to the control it labels. |
| `--cairn-gap-control` | `0.5rem` | One control to the next control beside it. |
| `--cairn-gap-group` | `1rem` | One field to the next field within a group. |
| `--cairn-gap-section` | `1.5rem` | One section to the next section. |

## The role utilities

Markup writes one of these eleven named utilities, never a pixel value and never a bracketed
`var()` wrapper. Each `type-*` utility sets `font-size` and `line-height` from its paired tokens,
and each `gap-*` utility sets `gap`. Neither sets anything else:

| Utility | Property | Token |
|---|---|---|
| `type-title` | `font-size`, `line-height` | `--cairn-type-title`, `--cairn-type-title--leading` |
| `type-heading` | `font-size`, `line-height` | `--cairn-type-heading`, `--cairn-type-heading--leading` |
| `type-subtitle` | `font-size`, `line-height` | `--cairn-type-subtitle`, `--cairn-type-subtitle--leading` |
| `type-body` | `font-size`, `line-height` | `--cairn-type-body`, `--cairn-type-body--leading` |
| `type-meta` | `font-size`, `line-height` | `--cairn-type-meta`, `--cairn-type-meta--leading` |
| `type-label` | `font-size`, `line-height` | `--cairn-type-label`, `--cairn-type-label--leading` |
| `type-chip` | `font-size`, `line-height` | `--cairn-type-chip`, `--cairn-type-chip--leading` |
| `gap-control` | `gap` | `--cairn-gap-control` |
| `gap-label` | `gap` | `--cairn-gap-label` |
| `gap-group` | `gap` | `--cairn-gap-group` |
| `gap-section` | `gap` | `--cairn-gap-section` |

A `type-*` utility's `line-height` declaration reads `var(--tw-leading, ...)`, the same custom
property that Tailwind's own named `text-*` steps (`text-sm`, `text-2xl`, and so on) read. So an
element that also carries an explicit `leading-*` utility keeps that leading, whichever of the two
rules compiles later in the sheet.

A type role is a size paired with its own leading, not a full recipe. Weight, case, tracking, and
color are never part of a type role: they belong to the component recipes in the admin design
system (the eyebrow, the nav item, the wordmark), and color is a palette choice, so it stays a
separate `text-muted` or `text-subtle` class on the element.

## Container roles

Two utilities cover the repeated card-shell markup string. Unlike a type or gap role, a container
role is not one property: it is the small set of properties that always travel together on a
surface.

| Utility | Property | Token |
|---|---|---|
| `card-shell` | `border-radius`, `border-style`, `border-width`, `border-color`, `background-color` | `--radius-box` (DaisyUI), `--cairn-card-border`, `--color-base-100` |
| `card-shadow` | `box-shadow` | `--cairn-shadow` |

`card-shell` is the universal surface: the shell's radius, its 1px hairline border, and its fill.
`card-shadow` is its elevation, kept as a separate utility because the split is real: a nested
surface inside an already-shadowed container (the media library's picked tiles, its row-link
cards) takes `card-shell` alone, since a shadow on a surface already inside a shadowed one reads
as a stray outline rather than elevation. Markup composes `overflow-*` and its own padding
directly. Neither role sets them, because they differ per call site.

A component writes `card-shell` and, where the surface floats free, `card-shadow`, never the
bracketed `var()` form the roles replace (`border-[var(--cairn-card-border)]`,
`shadow-[var(--cairn-shadow)]`), for the same reason a type role replaces a bracketed font-size.

## Status-text idioms

Two further utilities read the admin's accessible status inks: `cairn-text-warning` and
`cairn-text-success`. They are not grammar tokens (color is a palette choice, not a structural
role), but they exist for the same reason `text-muted`/`text-subtle` do: a name markup can write
instead of a bracketed `var()` wrapper.

| Utility | Property | Token |
|---|---|---|
| `cairn-text-warning` | `color` | `--cairn-warning-ink` |
| `cairn-text-success` | `color` | `--color-positive-ink` |

Both read the on-surface TEXT ink for their tone, never the FILL tone (`--color-warning`,
`--color-success`) a bare `text-warning`/`text-success` would otherwise resolve to if Tailwind's
own core color utilities compiled them. The fills are tuned for a badge or alert background, not
small text: `--color-warning` measures about 2.2:1 as text on `base-100`, well under the 4.5:1
WCAG 1.4.3 floor. `--cairn-warning-ink` and `--color-positive-ink` are the already-locked,
measured, readable-small-text counterparts (`docs/internal/admin-design-system.md`, "The
accessibility text inks"). Write `cairn-text-warning`/`cairn-text-success`, never
`text-[var(--cairn-warning-ink)]` or the bare `text-warning`/`text-success`.

The sheet's shared status-chip vocabulary, `.cairn-chip-quiet`/`.cairn-chip-warning`/
`.cairn-chip-outline` (the hand-composed counterpart to `StatusChip`; see `docs/reference/
admin-toolkit.md`), pins `font-weight: 400` unlayered on each: since none of the three carries a
Tailwind layer, that pin outranks any `font-semibold`/`font-medium` Tailwind weight utility placed
on the same element, so a hand-composed chip renders at 400 regardless of a weight class riding
alongside it.

## Where each form belongs

Markup (a component's template) writes the named utility: `type-meta`, `gap-group`, and so on.
It never writes a pixel value (`text-[0.8125rem]`) and never wraps the token in a bracketed
arbitrary value (`text-[var(--cairn-type-meta)]`).

A component's `<style>` block references the token directly, `font-size: var(--cairn-type-meta)`
or `gap: var(--cairn-gap-group)`, because CSS is not markup and the utility layer exists for
templates, not scoped styles.

## The boundary: grammar holds, palette is the brand layer

A consuming site re-tunes the palette tokens (`--color-*`, the Warm Stone hues and their
derivatives) to its own brand. It never redeclares a grammar token. Grammar names structure: a
heading's size, a gap's relationship. That structure holds across light and dark, and across every
site built on cairn. Palette is the layer a site changes.

Re-tuning the palette is a constrained operation, not a free one. cairn's craft couples to the
specific Warm Stone values in ways that are not visible in the token names alone: warm-tinted
shadows keyed to a particular hue, and several text/surface pairs sitting near the accessible
contrast floor rather than comfortably above it. A site that moves the palette away from Warm
Stone inherits none of those relationships for free and has to re-prove them against its own
values. The acceptance test for a re-tuned palette is a clean consumer-side `npx cairn-audit
--rendered` run, which renders every configured page under both themes.

## A type role is not a full recipe

A `type-*` utility sets a size and its leading. Weight, case, tracking, and font family are not part
of a role, because a role that carried them would match only the sites that want the whole recipe
and strand the rest. Two roles show why:

- `type-label` sets 11px. Of the admin's label-sized sites, fewer than a quarter are uppercase and
  fewer still carry the eyebrow's tracking, so the eyebrow's case and tracking stay a component
  recipe and the role fits every site.
- `type-heading` sets 18px. Its prose sites also write `font-bold` and the display family, which
  together form the ratified heading recipe. The media library's stat numerals take the same role
  for its size while keeping `tabular-nums` and skipping the display family, because a numeral is
  not prose.

Color is a palette choice, so it stays a separate `text-muted` or `text-subtle` class.

## Off-scale values and the exception list

Every font size in the admin resolves to a `--cairn-type-*` role, with five ratified exceptions.
Each one carries a counted, reasoned directive at its call site:

```
<!-- cairn-audit-disable-next-line type-scale -- why this value is ruled, not drift -->
```

| Site | Value | Why it is exempt |
|---|---|---|
| The brand wordmark, three sites | 22px | The keming fix raised the wordmark off the nearest step because the `rn` pair merged and `Cairn` read `Caim`. |
| The editor document title | 30px | The editor canvas sets its own scale, deliberately larger than the admin chrome. |
| The editor prose surface | 18px | The editor's own canvas in the editor face. Its size coincides with `type-heading`, but it is body text, not a heading. |

The count is the contract. `cairn-audit` reports the total, and a total above the exception list
means something was suppressed rather than resolved.

Two cautions if you add a value of your own. A bracketed arbitrary size such as `text-[1.5rem]` sets
`font-size` only, while a named Tailwind step such as `text-2xl` sets `line-height` too, so
converting between the two silently changes leading. And a class used only in a directory the admin
stylesheet does not scan never compiles at all, so it resolves to nothing at runtime rather than
failing a build.
