# The extension grammar

Use this when no toolkit primitive, exemplar, or recipe covers what a screen needs, and
`npx cairn-audit norms <term>` resolves nothing for it. It derives the new piece from the grammar
already in place, so a real gap gets built in cairn's vocabulary.

## The ladder

1. **Confirm the gap.** Query the norms for the closest terms and read the toolkit's exports. A
   term that exists under another name is not a gap.
2. **Decompose by role family.** Name each piece as a control, container, text, or icon before
   drawing anything.
3. **Reach for the existing recipe per piece.** A stock daisyUI default is the false friend:
   check `stock-default-hazards` (`audit-rules.md`) before drafting a disclosure, a badge, or a
   card.
4. **Apply the tokens by relationship**: a type role for every text, a gap role for every
   relationship (`form-anatomy.md`), and `cairn-audit norms <role>` for each control's height,
   padding, and radius.
5. **Apply the register rules** in `../SKILL.md`: one fill per surface, chip passivity, facet
   quietness, the primary action in the header slot.
6. **Clear the static and rendered audit**, both themes.
7. **Run the grader prompt** (`grader-prompt.md`) against your captures and fix what it finds.
8. **Record the derivation** in your project's backlog with its call site. cairn absorbs a
   pattern only when a second, independent build needs the same shape.

## Worked example: a destination picker

A screen needs to move a record between collections; no toolkit export or norms role covers it.

- **Trigger** (control): a row verb, `btn btn-ghost btn-xs`, ghost because it opens a second
  surface.
- **Panel** (container): the stock focus-driven `dropdown` is a named hazard. A destination list
  is content, not a menu, so use an explicit `dropdown-open` state toggle, compose the panel from
  `card-shell card-shadow`, and give it `role="dialog"`. That role is what makes it its own
  surface for `one-filled-action`; without it the panel shares its trigger's surface.
- **Choices** (text): `type-body` labels, stacked at `gap-group`; an archived destination gets a
  quiet `StatusChip`. A panel heading ("Move to") takes the eyebrow recipe.
- **Commit** (control): the panel's one fill, `btn btn-primary btn-sm`, enabled once a
  destination is chosen. Query `cairn-audit norms button-primary` rather than eyeballing it.
- **Audit**: static `no-uncompiled-class`, `type-scale`, `gap-scale`, `stock-default-hazards`
  (and `focus-parity` if a scoped style writes `:hover`); rendered `one-filled-action` with the
  panel open, `focus-renders` through the panel, `touch-targets` on every row,
  `viewport-overflow` at 390 and 320.
- **Grader**: capture the trigger at rest, the panel open, and a destination chosen, at 390 and
  1440, both themes.
