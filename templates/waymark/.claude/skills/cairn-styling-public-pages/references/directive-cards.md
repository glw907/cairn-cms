# The cards directive

A grid of short cards, one per list item. Each item is one line of markdown: an optional leading image, then an optional title, then text. A leading link is a linked title. Without one, a leading bold run is a plain title. An item with neither has no title. The chassis lays out and styles the grid in `prose.css`, scoped under `.prose`, so a theme owes no rule for it.

Authoring:

```md
::::cards{columns="3"}
:::items
- ![A trail map](/images/trail-map.webp) [Junior program](/programs/junior) Ages 10 to 16.
- [Map night](/map-night) Second Tuesday.
- **Where we ski** The Kincaid Park chalet.
:::
::::
```

Rendered markup:

```html
<div class="cards cards-cols-3" role="list">
  <div class="cards-item" role="listitem">
    <img src="/images/trail-map.webp" alt="A trail map" class="cards-image">
    <div class="cards-body">
      <p class="cards-title"><a href="/programs/junior">Junior program</a></p>
      <p class="cards-text">Ages 10 to 16.</p>
    </div>
  </div>
  <div class="cards-item" role="listitem">
    <div class="cards-body">
      <p class="cards-title"><a href="/map-night">Map night</a></p>
      <p class="cards-text">Second Tuesday.</p>
    </div>
  </div>
  <div class="cards-item" role="listitem">
    <div class="cards-body">
      <p class="cards-title">Where we ski</p>
      <p class="cards-text">The Kincaid Park chalet.</p>
    </div>
  </div>
</div>
```

Reads:

- The column modifier `cards-cols-2`, `cards-cols-3`, or `cards-cols-4`, from `columns`. A missing value, or any other value, gives `cards-cols-3`. The grid is one column below `40rem` and the modifier's count from there up.
- No element renders for an absent part. A card with no image opens on its `cards-body`, and an image-only card holds the `cards-image` alone.
- The title is a `p`, not a heading, so card titles stay out of the page's outline and its heading ids. The title is a `p` on purpose, so a theme should not change it to an h3. The grid and its items carry `role="list"` and `role="listitem"` because a `ul` would inherit the prose list markers.
- The ground `--color-base-100`, the hairline `--color-card-border` at `--border`, the corner `--radius-box`, and the spacing steps `--spacing-s`, `--spacing-m`, and `--spacing-3xs`.
- The title reads `--font-display` at `--text-step-2` and `--font-weight-heading`. The text reads `--color-muted`.

Override seams:

- The image crops to 3 by 2 with `object-fit: cover`, so a theme that wants another shape sets `aspect-ratio` on `.prose .cards-image`.
- An empty block keeps no margin, so a `cards` block with no items needs no override.
- The classes are `cards-*`, never daisyUI's `card`, `card-body`, or `card-title`, so the daisyUI component rules never restyle a card.
