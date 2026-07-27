# Reference: admin grammar tokens

The admin's structural type and spacing vocabulary: ten CSS custom properties declared once in
`cairn-admin.css`, outside the light and dark theme blocks, plus the named utility classes that
are the only supported way to reach them from markup. A grammar token names a relationship rather
than a color: a heading's role, a control-to-control gap. The same value holds in both themes.

## The token inventory

Six `--cairn-type-*` roles, each a `font-size`:

| Token | Value |
|---|---|
| `--cairn-type-title` | `1.5rem` |
| `--cairn-type-subtitle` | `0.9375rem` |
| `--cairn-type-body` | `0.875rem` |
| `--cairn-type-meta` | `0.8125rem` |
| `--cairn-type-label` | `0.6875rem` |
| `--cairn-type-chip` | `0.625rem` |

Four `--cairn-gap-*` roles, each a `gap`:

| Token | Value | Names the relationship |
|---|---|---|
| `--cairn-gap-label` | `0.25rem` | A label to the control it labels. |
| `--cairn-gap-control` | `0.5rem` | One control to the next control beside it. |
| `--cairn-gap-group` | `1rem` | One field to the next field within a group. |
| `--cairn-gap-section` | `1.5rem` | One section to the next section. |

## The role utilities

Markup writes one of these ten named utilities, never a pixel value and never a bracketed
`var()` wrapper. Each sets exactly one CSS property from its token and nothing else:

| Utility | Property | Token |
|---|---|---|
| `type-title` | `font-size` | `--cairn-type-title` |
| `type-subtitle` | `font-size` | `--cairn-type-subtitle` |
| `type-body` | `font-size` | `--cairn-type-body` |
| `type-meta` | `font-size` | `--cairn-type-meta` |
| `type-label` | `font-size` | `--cairn-type-label` |
| `type-chip` | `font-size` | `--cairn-type-chip` |
| `gap-control` | `gap` | `--cairn-gap-control` |
| `gap-label` | `gap` | `--cairn-gap-label` |
| `gap-group` | `gap` | `--cairn-gap-group` |
| `gap-section` | `gap` | `--cairn-gap-section` |

A type role is a size, not a recipe. Weight, case, tracking, and color are never part of a type
role: they belong to the component recipes in the admin design system (the eyebrow, the nav
item, the wordmark), and color is a palette choice, so it stays a separate `text-muted` or
`text-subtle` class on the element.

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
values. The acceptance test for a re-tuned palette is a clean consumer-side rendered audit in
both themes, once `cairn-audit` ships.

## Current state: two roles with no markup call site

`type-title` and `type-body` compile and are ready to use, but no admin markup calls either one
yet. The engine's 24px and 14px text still uses Tailwind's built-in
`text-2xl` and `text-sm`, which set both `font-size` and `line-height`. A role utility sets
`font-size` only, so replacing a named Tailwind step with `type-title` or `type-body` today
would drop that step's `line-height` and change the rendered layout. Those call sites wait on a
line-height ruling for the type roles before they migrate. The other roles are fully in use:
`type-subtitle`, `type-meta`, `type-label`, `type-chip`, and all four gap roles.
