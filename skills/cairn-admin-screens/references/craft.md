# The craft chapter: invisible polish

Load this when refining a component or screen past "it compiles and reads correctly": the pass
that decides whether a screen feels professional or merely assembled. This file states the
catalogue directly, on its own authority, the same discipline the exemplar files use, rather
than pointing at a private audit a builder could not open.

## The one thesis

A screen can be **correct** and still not be **resolved**. Every control works, every value is
legible, every rule taken alone is followed, and the screen still reads as cheap, slow, or
off, a gut judgment a reader makes without being able to name why, because the signal sits
below conscious attention. Closing that gap is this chapter's whole job.

Four ways to close it, in order of how directly cairn can enforce them:

1. **Tokenize** where an existing named token already carries the answer. Write the token, not
   an invented value.
2. **State a numeric rule** where the answer is measurable but has no token of its own. Pick
   the number and hold to it, rather than "eyeball it."
3. **Pair a before and after**, one line naming the difference, where only a render shows the
   phenomenon at all.
4. **Point at the audit rule** where the whole judgment is already mechanical. `npx cairn-audit`
   (or `--rendered`) already checks these; hold the rule's name, not its formula.

## Tokenize

- **Type.** Every font size on an admin surface resolves to a `type-*` role utility
  (`type-title`, `type-heading`, `type-subtitle`, `type-body`, `type-meta`, `type-label`,
  `type-chip`), never a raw Tailwind step or a bracketed pixel value. Each role's own leading
  travels with it, so writing the utility is the complete recipe, not size alone.
  `cairn-audit`'s `type-scale` is the backstop.
- **Spacing.** Every margin, padding, or gap on an admin surface resolves to a `gap-*` role
  utility (`gap-label`, `gap-control`, `gap-group`, `gap-section`) or its matching
  `--cairn-gap-*` custom property inside a scoped style, never an arbitrary literal.
  `gap-scale` is the backstop.
- **Elevation and boundary.** A floating card takes the theme-adaptive shell, never a flat gray
  border or a stock drop shadow: the border and the shadow both come from a token that changes
  with the theme, not a value fixed to one of them. `stock-default-hazards` catches the flat
  border by name.
- **Chip register.** A status or state chip is one of two things, never a third: **bounded**,
  a chip that must read as a discrete object with its own visible edge, or **quiet**, a
  token-tinted ground with no border at all, for a settled state that should recede rather than
  announce itself. Never a chip whose border is present but too faint to register as a real
  edge, the half-claimed boundary that reads as neither. `stock-default-hazards` names the
  common miss.
- **Focus ring.** Every interactive element gets the same visible ring on keyboard focus: a
  2px solid ring in the surface's own accent color, offset 2px outward from the control's own
  edge, never the browser's bare default and never a bespoke color chosen per component.
  `focus-parity` (does every hover have a matching focus-visible) and `focus-renders` (does the
  ring actually compute onscreen) are the backstop pair.

## Numeric rule

- **Neutrals derive from the palette, never from an invented gray.** Reach for the surface's
  own secondary-text roles, or a lightness/opacity step of the same content ink, never a raw
  hex, an `rgba()` literal, or an unrelated gray scale. A neutral that does not derive from the
  palette reads as a different hue family sitting beside the real one, however close the values
  look in isolation. `token-colors` is the backstop.
- **Two font weights, maximum, inside one body-content region.** A region is the prose or data
  itself, the passage a reader actually reads, not the chrome around it: a header band, a nav
  rail, buttons, table furniture, and pagination each carry their own weights and sit outside
  the count. Inside one region, pick one weight for the running text and one for the thing that
  should stand out in that same passage, never three competing at once.
- **Tabular numerals on any digit sequence that sits in a column or updates in place.** A date
  column, a running count, a price, a pagination range: anything where two rows' digits stack
  visually needs a fixed-width numeral form, or the column jitters left and right as the digit
  shapes change width.
- **Record an optical-alignment offset as a number once you make the call.** An icon centered
  by pure box math inside a circular or square control commonly reads very slightly off; once
  you have nudged it to look centered, write the nudge down as an explicit small offset (most
  controls at this admin's sizes need on the order of one to two pixels) rather than leaving
  the correction undocumented for the next editor to rediscover by eye.
- **Padding asymmetry, stated as a ratio.** An accent button reads more resolved with visibly
  more horizontal padding than vertical, roughly one and a half times as much horizontal as
  vertical, not the equal padding a stock default reaches for. A text container whose content
  commonly ends in a descender (a word ending g, j, p, q, or y) wants a little more bottom
  padding than top, so the glyph does not visually sit low in its own box.

## Before/after: only demonstrable

- **Optical vs. mathematical centering.** *Assembled:* an icon centered by equal insets on
  every side inside a circular button reads slightly off, usually low and to one side, because
  most glyphs (a triangle, a chevron, an arrow) carry more visual weight on one part of their
  own bounding box than the geometry admits. *Resolved:* the same icon nudged a small amount
  toward the light side (see the numeric-rule item above for recording the value) reads dead
  center to the eye. The difference: mathematical centering measures the box; optical centering
  measures what a reader's eye actually settles on, and the two agree only by accident.
- **Proximity grouping.** *Assembled:* a form where every gap, label to its own control,
  control to the next field, one section to the next, uses the same value reads as one flat,
  undifferentiated list; nothing tells the eye where one idea ends and the next begins.
  *Resolved:* the same form with a tighter gap between a label and its own control than between
  one field and the next, and a wider gap again between one section and the next, reads as a
  small hierarchy of relationships with no border or box drawn anywhere. The difference:
  unequal, ordered gaps carry structure that equal gaps cannot, no matter how generous the
  equal value is.
- **Assembled vs. resolved, the whole-surface read.** *Assembled:* a screen where every control
  is individually correct, each one legible and functional on its own terms, but the icon set
  mixes two different visual languages, the corner radii disagree between a card and the
  button inside it, and one control still wears an unstyled default beside three that do not.
  *Resolved:* the same screen with one icon language, one radius scale, and no lingering
  unstyled default anywhere. The difference: "correct" is true of each part in isolation;
  "resolved" is true of the whole surface at once, and the whole-surface read is the one a
  reader actually experiences first.

## Audit rule

For each item below, the whole judgment already runs as a `cairn-audit` check; hold the rule's
name in working memory, not its formula.

| Polish item | Rule |
|---|---|
| Motion duration and easing | `motion-band` |
| Reduced-motion coverage on every transition | `reduced-motion` |
| A hover state matched by a keyboard focus state | `focus-parity`, `focus-renders` |
| A tap target's effective size | `touch-targets` |
| Interactive text legible against its own background at rest | `interactive-contrast` |
| One dominant filled action per surface | `one-filled-action` |
| Nothing renders wider than its own viewport | `viewport-overflow` |
| A chip legible against its own row | `chip-ground-collision` (advisory) |
| A boundary's contrast against what it separates | `border-contrast` (advisory; cairn's own hairline is itself still an open design question, so this one reports without gating today) |
| A component's measured shape against precedent | `norms-bands` (advisory; query `cairn-audit norms <role>` rather than guessing a height or a padding value) |
| No stray filled action outside the header or card region | `screen-anatomy` |
