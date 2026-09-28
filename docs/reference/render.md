# Render authoring (`@glw907/cairn-cms/render`)

This subpath is type-only: `ComponentContext`, the structured input a component's `build(ctx)`
receives. The render pipeline itself stays behind `createRenderer` on the package root, the one
public, safe-by-default render path; see [Core](./core.md). A component's `build(ctx)` constructs
its own hast directly with hastscript's `h()`; the engine ships no hast-building helper toolkit of
its own. See [Configure rendering](../extend/configure-rendering.md) for a worked example.

```ts
import type { ComponentContext } from '@glw907/cairn-cms/render';
```

## Types

Stability tier: Extension API.

- `ComponentContext` is the structured input a `build` receives (attributes, slots, the stamped
  node). Its `attr(key)` reads a declared string attribute, returning `undefined` for a boolean or
  absent value.

## Emitted classes

Stability tier: Extension API.

This is the fixed set of class names the render pipeline and a site's own component grammar build
toward, so a site's prose CSS can target them consistently. Only `cairn-glyph` comes directly from
`renderGlyph` (documented on [Core](./core.md)); the others are stamped by a site's own chassis
code, or, for `cairn-grid`, by the engine's internal `markFirstList`.

- `cairn-head` is the icon-plus-heading row of a card or an alert; a site typically builds it in
  its own chassis code (see, for example, `examples/showcase/src/chassis/render.ts`'s `headRow`).
- `cairn-icon` and its `cairn-icon-secondary` modifier wrap a built glyph; the modifier lands when
  a site's own icon-rendering code passes a secondary role.
- `cairn-glyph` (`renderGlyph`) is the inline SVG glyph itself.
- `cairn-grid` (`markFirstList`) marks the first `<ul>` inside a component's stamped children.
  `markFirstList` has no public export, but the class it stamps is still a real, emitted name.

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
