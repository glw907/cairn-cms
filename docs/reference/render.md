# Render authoring (`@glw907/cairn-cms/render`)

The component-authoring toolkit a site reaches for inside a component's `build(ctx)`. These helpers
build hast and read the component context. The render pipeline itself stays behind `createRenderer`
on the package root. That function is the one public, safe-by-default render path. This subpath
carries the helpers a component's own `build(ctx)` calls to construct or read hast; the render
pipeline entry itself lives on [Core](./core.md), not here, since a site calls it once to build
its renderer, never from inside a component.

```ts
import { cardShell, headRow, iconSpan, type ComponentContext } from '@glw907/cairn-cms/render';
```

## Hast builders

Stability tier: Extension API.

- `cardShell(classes, body)` wraps body content in a `<section><div class="card-body">` shell.
- `headRow(title, icon?, level?)` builds the icon-plus-heading head row; the heading level defaults to 2.
- `iconSpan(glyphEl, role?)` wraps a built glyph element in a `cairn-icon` span.

## Emitted classes

Stability tier: Extension API.

These helpers, plus `renderGlyph` (documented on [Core](./core.md)), stamp a fixed set of classes
onto the hast they build. A site's own prose CSS targets these names to style the built-in
directives.

- `cairn-head` (`headRow`) is the icon-plus-heading row of a card or an alert.
- `cairn-icon` and its `cairn-icon-secondary` modifier (`iconSpan`) wrap a built glyph; the
  modifier lands when the caller passes `role: 'secondary'`.
- `cairn-glyph` (`renderGlyph`) is the inline SVG glyph itself.
- `cairn-grid` (`markFirstList`) marks the first `<ul>` inside a component's stamped children.
  `markFirstList` has no public export, but the class it stamps is still a real, emitted name.

**Registration.** `cairn-*` is a shared namespace. The admin sheet also owns roughly sixty of its
own `cairn-*` classes (`cairn-type-*`, `cairn-chip-*`, and similar), documented in
[the admin design system](../internal/admin-design-system.md). This page is the emitted-markup
side's registry; a new name on either side should check the other's list before landing, so the
two vocabularies never collide. `cairn-icon-label`, an admin toolkit label class, is an
admin-sheet neighbor, not one of the five names above; no render helper emits it.

## Types

Stability tier: Extension API.

- `ComponentContext` is the structured input a `build` receives (attributes, slots, the stamped
  node). Its `attr(key)` reads a declared string attribute, returning `undefined` for a boolean or
  absent value.
