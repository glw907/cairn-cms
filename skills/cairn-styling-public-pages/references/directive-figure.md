# The figure directive

An engine built-in. It wraps a media image and a caption in a `figure` and marks a placement. A site cannot register a component under the name.

Authoring:

```md
:::figure{.wide}
![A ridge at dawn](media:ridge.abc123)
A caption.
:::
```

Rendered markup:

```html
<figure class="cairn-place-wide">
  <img src="/media/ridge.abc123.jpg" alt="A ridge at dawn">
  <figcaption>A caption.</figcaption>
</figure>
```

Reads:

- `cairn-place-center`, `cairn-place-wide`, and `cairn-place-full` name the placement, and the class is absent when the author names none. The sheet styles none of them, since a placement is a layout choice.
- The showcase's `site.css` styles the three under `.site-main`: a centered small image, a wider breakout to `--container-measure-wide`, and a full-bleed strip. The image height cap is `--site-figure-max-height`.
- Caption text reads `--color-muted` at `--text-step--1`.

Override seams:

- A theme styles every placement it wants to honor. An unstyled placement renders as a plain figure.
- A figure with no media image renders as a `figure` around its children and invents no image.
