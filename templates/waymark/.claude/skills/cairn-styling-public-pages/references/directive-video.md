# The video directive

A link out to a YouTube or Vimeo video. cairn ships no embedded player, so no request reaches the platform until the reader follows the link.

Authoring:

```md
:::video{url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="A short walkthrough"}
:::
```

Rendered markup:

```html
<figure class="video-facade">
  <a class="video-facade-link" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noopener noreferrer" aria-label="Watch “A short walkthrough” on YouTube (opens in a new tab)">
    <span class="video-facade-thumb"><span class="cairn-icon"><svg class="cairn-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="..." /></svg></span></span>
    <span class="video-facade-platform">YouTube</span>
  </a>
  <figcaption class="video-facade-caption">A short walkthrough</figcaption>
</figure>
```

Reads:

- The link box is a 16 by 9 card on `--color-base-200` with a `--color-card-border` hairline and the corner `--radius-box`.
- The play disc paints `--color-primary` with `--color-primary-content`. The platform label reads `--tracking-eyebrow` and `--color-muted`.
- Focus reads the focus-ring roles `--cairn-focus-ring-outline` and `--cairn-focus-ring-offset`.

Override seams:

- Hover and pressed states mix `--color-primary` into the card ground, so a new accent recolors them.
- A reduced-motion preference removes the transition in `prose.css`.
