# Craft: invisible polish

## Contents

- [Tokens](#tokens)
- [Numeric rules](#numeric-rules)
- [Narrow-width tables](#narrow-width-tables)
- [Only a render shows it](#only-a-render-shows-it)

A screen can be correct, every rule followed, and still read as assembled rather than resolved.
Close the gap in this order: write the token that already carries the answer, hold a stated
number where no token exists, and check by render what only a render shows. Where a rule already
measures it, hold the rule's name (`audit-rules.md`).

## Tokens

- **Type.** Every size is a `type-*` role; the role carries its leading. `type-label` titles a
  group (section heading, column header, legend); a single field's label is
  `type-body font-medium`. A group title wants `gap-section` beneath it, not `gap-label`.
- **Spacing.** Every gap is a `gap-*` role or its `--cairn-gap-*` property.
- **Elevation and boundary.** A floating card is `card-shell card-shadow`; never a flat gray
  border or a stock shadow, which do not follow the theme.
- **Chips.** A chip is either bounded (a real visible edge) or quiet (a tint, no border), never
  a border too faint to register.
- **Focus.** Every control shows the same 2px accent ring, offset 2px; never the browser default
  or a per-component color.

## Numeric rules

- Neutrals derive from the palette's content ink and its muted roles, never an invented gray.
- At most two font weights inside one content region (chrome excluded): one for running text, one
  for what stands out.
- Tabular numerals (`tabular-nums`) on any digit column or a value that updates in place.
- Once you nudge an icon to look centered, record the offset (usually 1 to 2px) in a comment.
- A filled button carries about 1.5 times as much horizontal padding as vertical. A text box
  whose content often ends in a descender gets slightly more bottom padding than top.
- A row of three or more elements (heading, link, action; search, filter) declares a breakpoint,
  usually `sm`, below which it stacks to full-width elements at `gap-group`. Flex items default to
  `min-width: auto` and refuse to shrink, so without one the row collides or wraps mid-phrase.
- A wide table stays inside its card. If any ancestor between the scroll wrap and the surface is a
  flex or grid item, its `min-width: auto` lets the table push the page wider than the viewport.
  Render at 390 and confirm the card's border closes inside the frame.

## Narrow-width tables

A data table answers a narrow viewport with column priority, not a scrollbar. Keep the column a
reader identifies the row by, hide the others below the breakpoint, and fold their values into
that column as one `type-meta` line:

```html
<table class="table w-full">
  <thead>
    <tr>
      <th>Name</th>
      <th class="hidden sm:table-cell">Standing</th>
      <th class="hidden sm:table-cell">Joined</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        Priya Natarajan
        <div class="type-meta sm:hidden">Current · Joined 2024-03-11</div>
      </td>
      <td class="hidden sm:table-cell">Current</td>
      <td class="hidden sm:table-cell">2024-03-11</td>
      <td><button aria-label="Edit Priya Natarajan">...</button></td>
    </tr>
  </tbody>
</table>
```

A scroll wrapper stays as the fallback, and earns its place only when every foldable column is
already folded and the rest must be compared side by side. A scrollbar on a table that still had
columns to fold is a miss.

## Only a render shows it

- **Optical centering.** A glyph centered by equal insets reads low or off to one side; nudge it
  toward its light side.
- **Proximity.** Equal gaps everywhere read as one flat list. Tighter label-to-control than
  field-to-field, and wider again between sections, carries structure with no border.
- **The whole surface.** Mixed icon languages, disagreeing radii between a card and its button,
  or one unstyled default beside styled controls make a correct screen read as unfinished.
- **Row collision.** A header or toolbar kept on one line at 390 crowds with no gap or wraps a
  link mid-phrase. Only a render at the narrow width proves the row reflows.
