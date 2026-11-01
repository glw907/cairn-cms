# Form anatomy

## Contents

- [The three label levels](#the-three-label-levels)
- [Spacing by relationship](#spacing-by-relationship)
- [The composition-width rule](#the-composition-width-rule)
- [The submission row](#the-submission-row)

## The three label levels

Every form label is exactly one of these. Pick by what the label groups, never by copying the
nearest field.

1. **Group legend**: a `<legend>` or heading over several controls. The eyebrow recipe,
   `type-label font-semibold uppercase tracking-[0.08em] text-muted`, the same role as a table
   column header.
2. **Field label**: one control's label, above it. `type-body font-medium` (or
   `type-meta font-medium` in a compact panel), sentence case, no tracking. This is `FieldLabel`'s
   default `register="stacked"`. Never reuse the legend recipe here: a field label at the legend's
   weight reads as a second title.
3. **Inline label**: on the control's line, for a control the legend already scopes.
   `flex items-center gap-1.5 type-body`, muted ink on the label span. `FieldLabel`'s
   `register="inline"`. A checkbox's trailing text is this register.

## Spacing by relationship

| Relationship | Utility | Value |
|---|---|---|
| A label to its control | `gap-label` | `0.25rem` |
| One control to the next beside it (Cancel, Save) | `gap-control` | `0.5rem` |
| One field to the next in a group | `gap-group` | `1rem` |
| One section to the next | `gap-section` | `1.5rem` |

- A two-column field grid needs the group gap between rows and the section gap between columns.
  The role utilities set the single `gap` shorthand and no axis form exists, so write the
  literals `grid gap-x-6 gap-y-4 sm:grid-cols-2`; `gap-group` there would set both axes to 1rem.
- A free-text block below a field grid takes section-scale separation as a `border-t` plus its
  own padding, so the boundary reads inside one card.
- `relational-spacing` checks the rendered gaps; this table says which relationship a row is.

## The composition-width rule

An inline-register row must be checked at every width the form renders at, not only at its
mobile breakpoint. In a `sm:grid-cols-2` grid inside a width-capped card, each column is a narrow
track at 1440, and a long label beside a full-width control wraps mid-label. At 390 the grid is
one column and the defect hides. No audit rule samples this width.

- In a multi-column grid, use the stacked register. It never shares a row with its control, and
  it fills the control to its grid cell. `FieldLabel` renders one `<label>` with no `for`, which
  names only its first control: give each later control in a compact row its own label or
  `aria-label`.
- If you keep the inline register, give the label `white-space: nowrap`, or size the track for
  the longest label plus the control's minimum width, checked at the card's capped width.

## The submission row

Every dialog and standalone form ends with a plain `btn btn-sm` Cancel beside a filled
`btn btn-primary btn-sm` submit, `gap-control` apart, right-aligned (`modal-action`, or
`flex justify-end` outside a dialog). The submit is that surface's one fill.
