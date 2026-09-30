# Render authoring (`@glw907/cairn-cms/render`)

This subpath is type-only: `ComponentContext`, the structured input a component's `build(ctx)`
receives. The render pipeline itself stays behind `createRenderer` on the package root, the one
public, safe-by-default render path; see [Core](./core.md). A component's `build(ctx)` constructs
its own hast directly with hastscript's `h()`; the engine ships no hast-building helper toolkit of
its own.

```ts
import type { ComponentContext } from "@glw907/cairn-cms/render";
```

## Types

Stability tier: Extension API.

- `ComponentContext` is the structured input a `build` receives (attributes, slots, the stamped
  node). Its `attr(key)` reads a declared string attribute, returning `undefined` for a boolean or
  absent value.

## Emitted classes

Stability tier: Extension API.

This is the fixed set of class names the render pipeline and a site's own component grammar build
toward, so a site's prose CSS can target them consistently. The engine writes some of them itself,
and a site's own chassis code stamps the others. Each entry says who styles the class. "The sheet"
means [`cairn-public.css`](./public-css.md), which a site imports. "A theme" means the site's own
reading-surface CSS, which must cover the class or leave it unstyled on purpose. A theme that
replaces the chassis `prose.css` reads this list to learn what its sheet must cover.

- `cairn-head` is the icon-plus-heading row of a card or an alert; a site typically builds it in
  its own chassis code (see, for example, `examples/showcase/src/chassis/render.ts`'s `headRow`).
  A theme styles it.
- `cairn-icon` and its `cairn-icon-secondary` modifier wrap a built glyph; the modifier lands when
  a site's own icon-rendering code passes a secondary role. A theme styles both.
- `cairn-glyph` (`renderGlyph`) is the inline SVG glyph itself. A theme styles it.
- `cairn-grid` (`markFirstList`) marks the first `<ul>` inside a component's stamped children.
  `markFirstList` has no public export, but the class it stamps is still a real, emitted name. A
  theme styles it.
- `pre.shiki` is the block the engine's build-time highlighter writes for a fenced code block. The
  sheet styles it from the `--cairn-code-bg`, `--cairn-code-ink`, and `--cairn-code-border` roles.
  A theme that wants a different frame overrides those roles or adds rules of its own.
- `cairn-tok-keyword`, `cairn-tok-string`, `cairn-tok-comment`, `cairn-tok-function`,
  `cairn-tok-number`, and `cairn-tok-punct` (written together as `cairn-tok-*`) are the six token
  classes the highlighter puts on a span inside `pre.shiki`. The engine writes no inline style, so
  an uncolored token inherits the block's ink. The sheet colors each class from its
  `--cairn-code-*` role.
- `cairn-place-center`, `cairn-place-wide`, and `cairn-place-full` (written together as
  `cairn-place-*`) mark a `figure` directive's placement, and the class is absent when the author
  names none of the three. The sheet does not style them, since a placement is a layout decision.
  A theme must style every role it wants to honor.
- `table-scroll` is the wrapper the engine puts around every rendered table so that a wide table
  scrolls instead of squeezing its columns. The sheet styles its structural pair, `display: block`
  and `overflow-x: auto`. A theme adds any design, such as scroll-edge shading or a focus ring.

A site's own component code stamps its own additional classes on top of these. The alert
directive in the example adapter stamps its own inner classes (`cairn-alert-body`,
`cairn-head-title`) as one instance. They are chassis-owned, not engine-emitted, so they are
documented in `examples/showcase/src/chassis/README.md` rather than here.

**Registration.** `cairn-*` is a shared namespace. The admin sheet also owns roughly sixty of its
own `cairn-*` classes (`cairn-type-*`, `cairn-chip-*`, and similar), documented in
[the admin design system](../internal/admin-design-system.md). This page is the emitted-markup
side's registry; a new name on either side should check the other's list before landing, so the
two vocabularies never collide. `cairn-icon-label`, an admin toolkit label class, is an
admin-sheet neighbor, not one of the names above; no render helper emits it.
