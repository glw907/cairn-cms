# Form anatomy

Load this when laying out a form's rows and labels: which of the three label levels a given
label is, how a row spaces against its neighbors, and the one composition failure that no
mechanical check in this engine catches.

These are normative rules, stated as what to do, not a survey of what exists. The
three-level register is cairn's own ratified ruling, and the composition rule below was
learned from defects in real production admin builds. The records behind both live in
cairn's internal design docs, which the published package does not ship, so this page
states the rules in full on its own authority.

## The three label levels

A form label is always exactly one of these three. Pick by what the label groups, never by
habit or by copying the nearest existing field.

1. **Group or section legend**: a `<legend>` (or a heading standing in for one) that names
   several controls under it: "Membership tier," "Your details," a sidebar panel's own
   heading. Compose it in the Eyebrow recipe: `type-label font-semibold uppercase
   tracking-[0.08em] text-muted`. This is the same register a table column header and a
   detail-screen section heading use (`exemplar-list.md`, `exemplar-detail.md`); a group
   legend is not a smaller form title, it's the same eyebrow role wherever it appears.
2. **Individual field label**: one control's own label, on its own line above the control.
   Compose it sentence case, `font-medium`, base-content ink, no tracking, no uppercase, no
   display face: `type-body font-medium` (or `type-meta font-medium` inside an
   already-compact panel running its whole scale at the meta role). Never reuse the group
   legend's eyebrow recipe here: a field label at the same weight as the group title above it
   reads as a second, redundant title, not a label, which is exactly why the group legend and
   the field label stay two distinct levels rather than one shared recipe.
3. **Inline control-adjacent label**: a label on the same line as its control rather than
   above it, for a control the group legend already-scoped enough that a full stacked label
   would be excess (`FieldLabel`'s own recipe: `flex items-center gap-1.5 type-body`, muted
   ink on the label span, plain weight). `SelectField` and `TextField` both wrap this
   internally; compose a bare custom control the same way when no bundled primitive matches.

A checkbox's own trailing text (`<input type="checkbox" ... /> Visible on the public
calendar`) is a fourth informal case of the inline register, not a fourth level: the same
`flex items-center gap-1.5` shape, muted-to-plain ink depending on emphasis, never the
group-legend eyebrow.

## Row and group spacing

Four `--cairn-gap-*` roles exist precisely so a form's own spacing never falls back to an
arbitrary Tailwind number (`docs/reference/admin-grammar-tokens.md`):

| Relationship | Utility | Value |
|---|---|---|
| A label to the control it labels | `gap-label` | `0.25rem` |
| One control to the next control beside it (e.g. Cancel/Save) | `gap-control` | `0.5rem` |
| One field to the next field within a group | `gap-group` | `1rem` |
| One section to the next section | `gap-section` | `1.5rem` |

Apply them by relationship, not by eyeballing a value that happens to render close:

- A field grid's own row-to-row gap is `gap-group`'s relationship (1rem); the gap *between*
  two field columns in that same grid is `gap-section`'s relationship (1.5rem), wide enough
  that a reader never mistakes the right column's first label as continuing the left column's
  last row. `ClassForm`'s two-column attribute grid (`grid gap-x-6 gap-y-4 sm:grid-cols-2`)
  already resolves both axes to the correct values.
  This one cannot become a cairn-native rewrite by swapping in the named utilities, though:
  `gap-group` and `gap-section` both set the single `gap` shorthand property (`@utility
  gap-group { gap: var(--cairn-gap-group) }`), so writing `grid gap-group sm:grid-cols-2`
  would set BOTH axes to 1rem and silently drop the 1.5rem column gap the row above states.
  No `gap-x-*`/`gap-y-*` variant of the role utilities is safelisted, so this two-axis
  relationship cannot be expressed as named classes with the grammar this build currently
  ships. Until an axis-scoped role utility exists, a two-column grid like this one keeps the
  literal `gap-x-6 gap-y-4` values; the row and column gaps still name the `gap-group`/
  `gap-section` relationships this table states, they just can't compile through the named
  utilities yet.
- A modal's own footer row (`Cancel` beside `Save`) is `gap-control`: two controls acting on
  the same submission, not two fields.
- A block that is visually a distinct group from the fields above it (`ClassForm`'s
  free-text block: Description, Instructor notes, Reminder note override) still wants
  `gap-section`-scale separation from the grid above it, expressed as a `border-t` plus its
  own padding rather than a bare gap, since the boundary needs to read even when the two
  blocks sit inside the same unbroken card.

## The composition-width rule

**A row using the inline control-adjacent register must be verified at the actual widths the
form renders at, not assumed safe once it clears its own mobile breakpoint.**

The traced defect: `ClassForm`'s `sm:grid-cols-2` grid holds every field in the inline
register (`FieldLabel`, label beside control on one flex row). At 1440 the form's own card
caps its width well below the viewport, so each grid column is a fixed, narrow track, and a
longer label ("Reminder note override") paired with a full-width control has nowhere to give:
the label span wraps to two lines inside its own flex row, since a `<span>`'s own text is the
more shrinkable of the row's two children and the control (`textarea textarea-sm w-full`)
holds its width. The row still "works" at 390, where the grid has already collapsed to one
column and the track is the full card width; the defect is desktop-only, and specifically
mid-desktop, where the grid has gone multi-column but the card hasn't grown to compensate.

This is not a gap `viewport-overflow` closes: that rule proves nothing renders wider than a
390/320 viewport, which says nothing about a label wrapping inside a track that is plenty
wide at those widths and too narrow only once the grid opens a second column at `sm` and
stays open through 1440 and beyond. No rule in this engine samples a mid-desktop width against
a multi-column form grid, which is exactly why this is a written rule here and not a query
against `cairn-audit`.

Apply one of these, and verify the choice against the form's own rendered width, not the
mobile breakpoint alone:

- **Prefer the stacked individual-field-label register** (label above control) for any field
  inside a multi-column form grid. A stacked label never competes with its own control for
  the row's width, because it isn't sharing a row.
- **If the inline register is kept**, give the label span a floor it can't donate away:
  either `white-space: nowrap` on the label (the row itself may still wrap as a whole, which
  is a layout choice, not a mid-word label break), or size the grid track to comfortably fit
  the form's own longest label plus the control's minimum usable width, checked at every
  width the form actually renders at (`sm`'s breakpoint, and the card's own capped max-width,
  not only 390).
- **Never assume a form is safe past `sm` just because it renders correctly at 390 and at the
  breakpoint's own first pixel.** A grid that opens a second column keeps that column open
  through every wider width up to the next breakpoint (or forever, with no next one); check
  the composition at the actual card width the form settles into, which for a `card-shell`
  form is well short of the full viewport.

## The submission row

Every dialog and every standalone form ends its own fields with exactly the pair
`exemplar-detail.md` shows repeated four times: a plain `Cancel`/`btn btn-sm` beside a filled
`btn btn-primary btn-sm` submit, `gap-control` apart, right-aligned (`modal-action`, or a
`flex justify-end` footer for a non-dialog form). This is the form's own `one-filled-action`
surface: the submit is the one deliberate accent fill this surface earns, and nothing else on
the same surface competes with it, whether that surface is the whole page (a standalone form)
or one open dialog layer (a modal form, which the rule reads as its own surface,
independent of whatever fills or doesn't fill the page underneath it).

## Cross-references

- `exemplar-list.md`, `exemplar-detail.md`: the group-legend register in table-header and
  section-heading form, and the inline register in its two bundled call sites (`TextField`,
  `SelectField`).
- `docs/reference/cairn-audit.md`'s `relational-spacing` rule mechanically checks that a
  rendered gap matches the relationship the markup claims (nested rhythm never wider than its
  container, a label the `gap-label` distance from its control); this file states which
  relationship a given row *is*, which the rule can't infer on its own.
