# The extension grammar

Load this when a screen or component needs something the toolkit doesn't ship yet: no
primitive covers it, no documented recipe covers it, and `cairn-audit norms` returns
nothing for the shape you're building. This is the ladder that derives a new
composition from the grammar already in place, so a genuine gap gets built in cairn's
own vocabulary instead of a borrowed one, plus the coherence-read gate
(`grader-prompt.md`) that catches what the ladder alone can't guarantee.

## When you need this file

Reach for a documented primitive or recipe first, always: `admin-toolkit`'s own export
list, the annotated exemplars (`exemplar-list.md`, `exemplar-detail.md`), the
form-anatomy contract, and `cairn-audit norms <role>` for anything with a measured
shape already. This file is for the remainder, a composition none of those cover.

## The ladder

Each rung derives from something legible at build time, never from inventing a value
or copying a rendered screen by eye.

1. **Confirm the gap is real.** Query the norms manifest for the closest term
   (`cairn-audit norms <term>`) and check the toolkit's own component list. A term that
   exists under a different name is not a gap; a role the manifest has never measured
   is.
2. **Decompose the need into roles the manifest already names.** The manifest's four
   families, control, container, text, icon (`docs/reference/cairn-audit.md`, "The
   roles"), are the vocabulary. Name each piece of the new composition by family before
   drawing anything, the same way a builder reaches for `btn-ghost` rather than
   inventing a button.
3. **For each named role, reach for the existing recipe before writing a bespoke one.**
   A stock DaisyUI default is the false friend here: it is in-distribution for an agent
   to reach for, and cairn deliberately replaces several of them
   (`stock-default-hazards`'s four hazards are the standing list). Check that rule's own
   guidance before drafting a disclosure, a badge, or a card shell from scratch.
4. **Apply the token grammar by relationship, not by eyeballing a value.** A type role
   for every piece of text, a gap role for every relationship between them
   (`form-anatomy.md`'s table), and `cairn-audit norms <role>` for every control's
   height, padding, and radius once you've picked its closest family.
5. **Apply the register rules the audit can't check.** One filled action per surface,
   chip passivity if the composition carries state, facet quietness if it carries a
   filter, the screen-anatomy affirmative half if it opens a surface with its own
   primary action.
6. **Clear the mechanical net.** Static and rendered `cairn-audit`, both themes, over
   whatever you built. This is where a derivation earns the same floor a shipped
   primitive already holds.
7. **Run the grader prompt.** `grader-prompt.md` carries the compositional judgment
   nothing above can: whether the pieces read as one coherent thing, not just whether
   each piece used the right class. Fix what it finds before calling the derivation
   done, the same done-gate order the standard doc states.
8. **Feed the graduation loop.** Record what you derived and why. See below for what
   that record is for.

## Worked derivation: a destination-picker

An Assets-managing admin screen often needs to move a record between collections, and
cairn's toolkit has no primitive for it: no exported component answers to it, and the
norms manifest has never measured one, because it only measures roles it has actually
rendered. Working the gap through all eight rungs:

**Rung 1, confirm the gap.** `cairn-audit norms destination` and `cairn-audit norms
picker` both exit 2 and print the role list; neither term resolves. `admin-toolkit`'s
own exports carry `AdminTable`, `ExpandableRow`, `ListToolbar`, `PageHeader`,
`Pagination`, `StatusChip`, and `EmptyState`, none of them a chooser. The gap is real,
not a naming miss.

**Rung 2, decompose by role family.** The pattern needs four pieces, each namable in
the manifest's own families: a **control** that opens the picker (a row's own trigger),
a **container** that holds the choices once opened, a **text** role for each choice's
own label, and a second **control** for the action that commits the pick.

**Rung 3, reach for the existing recipe per piece, not a bespoke one.**

- The trigger is a row-level verb, the same register `exemplar-detail.md` states for
  every other row action: `btn btn-ghost btn-xs`, ghost because opening a picker is a
  second-surface action, not an immediate one.
- The container that holds the choices is a small disclosure, and the stock DaisyUI
  `.dropdown` wrapper is exactly one of `stock-default-hazards`'s four named hazards: it
  opens on focus-in-transit and ignores Escape. cairn's own recipe is either a DaisyUI
  v5 popover dropdown (`popovertarget`/`popover`/`anchor-name`) for a short, fixed
  action list, or an explicit `class:dropdown-open` state toggle for a panel that needs
  to hold real content, list markup a menu can't. A destination list is content, not a
  menu, so the state-toggle form is the closer match; the panel itself still composes
  from `card-shell card-shadow`, the same container recipe `exemplar-detail.md` uses for
  every other floating surface, and carries `role="dialog"`, which is what actually
  earns it a layer of its own under `one-filled-action`'s own partition
  (`dialog[open], [role="dialog"], [role="alertdialog"]` wins the layer; everything else
  falls to whichever `main`/`nav`/`aside`/`header`/`footer` landmark encloses it). A
  state-toggled panel that skipped this role would be judged against its enclosing
  landmark instead, the same surface its trigger already sits on.
- Each destination's own label uses `type-body`, the row-subject register
  `exemplar-list.md`'s name cell states; a destination that also carries a settled state
  (an archived collection, say) gets a `StatusChip` in its `quiet` register, the same
  per-state judgment `exemplar-list.md` walks through, never bounded by default just
  because it's a chip.
- The commit action is the panel's own filled button, `btn btn-primary btn-sm`, enabled
  once a destination is selected.

**Rung 4, apply the token grammar.** The trigger and the commit button both resolve
their height and padding by querying `cairn-audit norms button-ghost` and
`cairn-audit norms button-primary`, rather than eyeballing either against the row. The
panel's own choices stack at `gap-group` (one field to the next within one group,
`form-anatomy.md`'s table), and the panel's heading, if it has one ("Move to"), takes
the same eyebrow recipe as every other section heading in this vocabulary, `type-label
font-semibold uppercase tracking-[0.08em] text-muted`.

**Rung 5, apply the register rules.** The panel is its own surface once open, the same
reading `exemplar-detail.md` gives an open dialog: the trigger stays ghost, the panel's
own commit button is the one accent fill this surface earns, and nothing else inside it
competes. If the row this trigger sits on already carries a `StatusChip` at the
`bounded` register for its own state, the picker's destination chips inherit the same
per-state judgment independently; the two chip vocabularies don't need to agree just
because they share a screen.

**Rung 6, clear the mechanical net.** Static: `no-uncompiled-class`, `type-scale`,
`gap-scale`, and `stock-default-hazards` all run clean, because every piece above named
a sanctioned recipe rather than a stock default; `focus-parity` joins this static line
only if the panel picks up a scoped `<style>` block with hand-authored `:hover`
selectors, since it is deliberately scoped to hand-authored CSS and says nothing about a
panel composed entirely from Tailwind utility classes. Rendered, both themes:
`one-filled-action` on the open panel, `focus-renders` walking the whole tab order into
and through the panel (the check that actually covers this panel's keyboard behavior),
`touch-targets` on the trigger and every destination row, `viewport-overflow` at 390 and
320 for the panel's own width against whichever row it opens from.

**Rung 7, run the grader prompt.** Capture the trigger at rest, the panel open, and a
destination selected, at 390 and 1440, both themes, and run `grader-prompt.md` against
the set. This is where the composition earns the coherence read no mechanical rule
carries: does the panel read as belonging to the row it opened from, does the commit
button read as the surface's one deliberate action, does the whole thing look
considered rather than assembled.

**Rung 8, feed the graduation loop.** File the derivation with its call site. See
below for what happens to a filed derivation.

## The graduation feedback loop

A derivation that works is not automatically cairn's problem to maintain. The ladder's
last rung stays deliberately conservative: file the derivation in your own project's
own backlog with which rungs it exercised and where it lives, and treat "does this
recur" as an open question, not a settled one. cairn's own toolkit absorbs a pattern
only once a second, independent build reaches for the same shape without coordinating
with the first: a single consumer's destination-picker is production code, not a
request. If it does recur, a filed candidate with its concrete call sites is exactly
the signal cairn's own extension work waits for, the same graduation bar
`ExpandableRow` cleared: nobody could have specified its overflow contract in advance,
two separate builders hit it independently, and only then did it generalize into a
rule. Cairn adds to its shared surface only when demand is demonstrated, never
speculatively.
