# Render authoring (`@glw907/cairn-cms/render`)

The component-authoring toolkit a site reaches for inside a component's `build(ctx)`. These helpers
build hast and read the component context; the render pipeline itself stays behind `createRenderer`
(on the package root), which is the one public, safe-by-default render path.

```ts
import { cardShell, headRow, iconSpan, strAttr } from '@glw907/cairn-cms/render';
```

## Hast builders

- `cardShell(classes, body)` wraps body content in a `<section><div class="card-body">` shell.
- `headRow(title, icon?, level?)` builds the icon-plus-heading head row; the heading level defaults to 2.
- `iconSpan(glyphEl, role?)` wraps a built glyph element in an `ec-icon` span.

## Context and tree helpers

- `strAttr(ctx, key)` reads a declared string attribute off the component context, returning
  `undefined` for a boolean or absent value.
- `isElement(node)` narrows a hast node to an `Element`.

## Types

- `ComponentContext` is the structured input a `build` receives (attributes, slots, the stamped node).
- `MakeIcon` is a site's icon factory signature, `(name, role?) => Element`.
