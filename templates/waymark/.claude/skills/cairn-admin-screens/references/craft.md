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
  `cairn-audit`'s `type-scale` is the backstop. `type-label` names one specific level, the
  eyebrow that titles a *group*: a section heading, a table column header, a fieldset's own
  `<legend>`. An individual field's own label, the text naming one control rather than several,
  is never this role; it takes `type-body font-medium` instead, sentence case, no tracking, no
  uppercase. Stack a group's own title directly above one field's label set in the same eyebrow
  role and the two collapse into a single repeated line with no readable subject; that collapse
  is the tell that the wrong role was reused. The group title also wants the wider
  `gap-section` gap beneath it, not the tighter `gap-label` distance a field keeps to its own
  control, so the two levels stay legible even before a reader parses either line's words.
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
- **A multi-element row declares its own narrow-width breakpoint; it never relies on
  flex-shrink alone.** A header row (a heading beside a secondary link and a primary action) or
  a toolbar row (a search field beside a filter) holds three or more elements at a wide
  viewport, but a flex item's default `min-width` is `auto`, which refuses to shrink an item
  below its own content width. Once the row's combined content no longer fits the narrow
  viewport, the elements either collide with no gap between them, or a text child wraps
  mid-phrase inside its own squeezed box, never a clean reflow. State a breakpoint (Tailwind's
  `sm`, 640px, is the usual admin threshold) below which the row switches from a horizontal
  `justify-between` arrangement to a stacked column, each element taking the row's own full
  width with a `gap-group`-scale gap between them, and confirm the change by rendering the row
  itself at the narrow width, not by reading the classes in isolation.
- **A table wider than its narrow viewport stays inside its own card, never the page.** A
  horizontal-scroll wrapper (`overflow-x-auto` on the table's immediate container) is necessary
  but not sufficient: if anything between that wrapper and the surface's outer edge is itself a
  flex or grid item, that ancestor's own default `min-width: auto` lets the wrapper's unshrunk
  content push it, and the page along with it, wider than the viewport, defeating the scroll
  container entirely. Render the surface at the narrow width and confirm the card's own border
  closes inside the frame, with a scrollbar doing the work instead, before calling a table
  handled. This wrapper is the fallback that catches whatever the column-demotion recipe below
  cannot fold, never the primary answer for a table with room to demote: reach for the
  Before/after "Table composition at narrow width" entry first, and treat a scrollbar that
  appears on a table which still had columns left to fold as the same kind of miss as an
  unstated breakpoint.

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
- **Narrow-width row collision.** *Assembled:* a header holding a heading, a secondary link,
  and a primary button, or a toolbar holding a search field and a filter, kept in the same
  single-row arrangement it uses at a wide viewport; at a narrow one the elements crowd
  together with no gap, and a link's own text wraps mid-phrase onto a second line that drops
  beside the heading's baseline, reading as one collided mass rather than three separate
  controls. *Resolved:* the same row, stacked into a column below its own breakpoint, each
  element at full width with a section-scale gap between them. The difference: a row is either
  verified at the narrow width it will actually render at, or it is not; a class that merely
  lets text wrap is not the same as a layout that reflows.
- **Table composition at narrow width.** A multi-column data table cannot satisfy a
  breakpoint by stacking the way a header row can; it needs a column-priority decision. Keep
  one column, the one a reader identifies the row by, always visible, hide every other column's
  own `<th>`/`<td>` below the breakpoint, and fold each hidden column's value into the visible
  column as one `type-meta` line, so no information disappears, it moves.

  *Assembled:* every column stays rendered at every width.

  ```html
  <table class="table w-full">
    <thead>
      <tr>
        <th>Name</th>
        <th>Standing</th>
        <th>Joined</th>
        <th>Balance</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Priya Natarajan</td>
        <td><span class="badge">Current</span></td>
        <td>2024-03-11</td>
        <td>$85.00</td>
        <td><button aria-label="Edit Priya Natarajan">...</button></td>
      </tr>
    </tbody>
  </table>
  ```

  At a wide viewport this is correct. At the narrow one, the row's combined content exceeds the
  card, and (per the containment rule above) the whole card, not just the table, runs off the
  edge unless something changes which columns render at all.

  *Resolved:* the secondary columns hide below the breakpoint and their values fold into the
  Name cell as one meta line; the action column, already narrow, stays put.

  ```html
  <table class="table w-full">
    <thead>
      <tr>
        <th>Name</th>
        <th class="hidden sm:table-cell">Standing</th>
        <th class="hidden sm:table-cell">Joined</th>
        <th class="hidden sm:table-cell">Balance</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Priya Natarajan
          <div class="type-meta sm:hidden">
            <span class="badge">Current</span> · Joined 2024-03-11 · $85.00
          </div>
        </td>
        <td class="hidden sm:table-cell"><span class="badge">Current</span></td>
        <td class="hidden sm:table-cell">2024-03-11</td>
        <td class="hidden sm:table-cell">$85.00</td>
        <td><button aria-label="Edit Priya Natarajan">...</button></td>
      </tr>
    </tbody>
  </table>
  ```

  The difference: `hidden sm:table-cell` removes each secondary column's cell from the layout
  below `sm`, and the same value reappears once, inside the always-visible column's own
  `sm:hidden` block, so the table's rendered width at 390 is one identifying column plus the
  action column, never four columns fighting for the same card.

  **Where horizontal scroll belongs and where it does not.** The containment wrapper
  (`overflow-x-auto`, the rule above) stays on the table regardless; it is not a defect by
  itself. It becomes one only when a scrollbar is doing the work that column demotion should
  have done, a table whose columns could fold into a meta line but instead runs wide and lets
  the browser scroll it. A scrollbar earns its place only after every foldable column is
  already folded and the table still does not fit, for example a table with two or three
  columns a reader must compare side by side, none of which is safe to hide. Check which case
  applies before reaching for the wrapper as the whole answer.

  **Interaction with the Chip register rule.** These two rules govern different things and
  never compete. Chip register (above) governs how one chip renders: its own border, its own
  padding. This recipe governs whether that chip's column exists in the table at all at a given
  width. Once Standing's value moves into the folded meta line, its chip sits in a stacked block
  next to plain text, not inline inside a table column with three siblings bidding for the same
  row width, so giving it real pill padding and a border never costs another column space; there
  is no column budget left at that point for it to compete over. Apply chip register to how the
  chip looks, apply this recipe to where the chip lives, and check the second before the first,
  since a chip rendered correctly inside a column that should not exist at 390 is still a miss.

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
| Nothing renders wider than its own viewport | `viewport-overflow` (for a row, the narrow-width numeric rule above is what to apply directly when the tool isn't run; for a multi-column table, the "Table composition at narrow width" before/after recipe is) |
| A chip legible against its own row | `chip-ground-collision` (advisory) |
| A boundary's contrast against what it separates | `border-contrast` (advisory; cairn's own hairline is itself still an open design question, so this one reports without gating today) |
| A component's measured shape against precedent | `norms-bands` (advisory; query `cairn-audit norms <role>` rather than guessing a height or a padding value) |
| No stray filled action outside the header or card region | `screen-anatomy` |
