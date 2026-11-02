# The extension grammar

Use this when no toolkit primitive, exemplar, or recipe covers what a screen needs, and
the "Write this, get this" table in `../SKILL.md` and `exemplar-kit.md` name nothing for it. It derives the new piece from the grammar
already in place, so a real gap gets built in cairn's vocabulary.

## The ladder

1. **Confirm the gap.** Read the "Write this, get this" table, `exemplar-kit.md`, and the toolkit's exports for the closest terms. A
   term that exists under another name is not a gap.
2. **Decompose by role family.** Name each piece as a control, container, text, or icon before
   drawing anything.
3. **Reach for the existing recipe per piece.** A stock daisyUI default is the false friend:
   check `stock-default-hazards` (`audit-rules.md`) before drafting a disclosure, a badge, or a
   card.
4. **Apply the tokens by relationship**: a type role for every text, a gap role for every
   relationship (`form-anatomy.md`), and `exemplar-kit.md` for each control's height, padding,
   and radius.
5. **Apply the register rules** in `../SKILL.md`: one fill per surface, chip passivity, facet
   quietness, the primary action in the header slot.
6. **Clear the static audit.**
7. **Run the grader prompt** (`grader-prompt.md`) against your captures and fix what it finds.
8. **Record the derivation** in your project's backlog with its call site. cairn absorbs a
   pattern only when a second, independent build needs the same shape.

## Worked example: a destination picker

A screen needs to move a record between collections; no toolkit export or recipe row covers it.

- **Trigger** (control): a row verb, `btn btn-ghost btn-xs`, ghost because it opens a second
  surface.
- **Panel** (container): the stock focus-driven `dropdown` is a named hazard. A destination list
  is content, not a menu, so use an explicit `dropdown-open` state toggle, compose the panel from
  `card-shell card-shadow`, and give it `role="dialog"`. That role is what makes it its own
  surface; without it the panel shares its trigger's surface and the one-fill rule.
- **Choices** (text): `type-body` labels, stacked at `gap-group`; an archived destination gets a
  quiet `StatusChip`. A panel heading ("Move to") takes the eyebrow recipe.
- **Commit** (control): the panel's one fill, `btn btn-primary btn-sm`, enabled once a
  destination is chosen. Take its classes from `exemplar-kit.md` rather than eyeballing them.
- **Audit**: static `no-uncompiled-class`, `type-scale`, `gap-scale`, `stock-default-hazards`
  (and `focus-parity` if a scoped style writes `:hover`). By eye: one fill with the panel open,
  a focus ring through the panel, a 24px target on every row, nothing wider than the viewport at
  390 and 320.
- **Grader**: capture the trigger at rest, the panel open, and a destination chosen, at 390 and
  1440, both themes.
