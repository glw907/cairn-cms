# Reuse content across entries

**Contract:** write one piece of markdown once, and include it verbatim inside as many other
entries as you like.

**Precondition:** an adapter with at least one concept declared, from [Define an adapter and
schema](./define-an-adapter-and-schema.md).

A safety notice repeated at the bottom of every trail post. A pricing table that has to match
across three different program pages. Any block of markdown that belongs in more than one place
at once, and should update everywhere the moment it changes, is a fragment.

## Declare the fragments concept

`fragments` is a reserved concept key. Declaring it turns on the `::include` directive:

```ts
import { defineConcept, fieldset } from '@glw907/cairn-cms';

const fragments = defineConcept({
  dir: 'src/content/fragments',
  label: 'Fragments',
  singular: 'fragment',
  routing: 'embedded',
  fields: fieldset({}),
});
```

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) and continues the posts/fragments concepts declared above -->
```ts
export const cairn = defineAdapter({
  content: { posts, fragments },
  // ...
});
```

It must use `routing: 'embedded'`; `defineConcept` throws otherwise. A fragment has no public
page of its own, by design: the whole point is that its content only ever appears inside another
entry, and an embedded entry that also published its own live page would make the same words
reachable two different ways.

`fragments` needs a glob at [the content index](./wire-the-delivery-surface.md#the-content-index)
the same as any other declared concept, added to the same `src/lib/content.ts` file that already
declares `postsRaw`. `createSiteIndexes` throws at build time otherwise:

```ts
// src/lib/content.ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const fragmentsRaw = import.meta.glob('/src/content/fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, fragments: fragmentsRaw });
```

If your site also builds the committed content manifest with the [`cairnManifest`](../reference/vite.md)
Vite plugin, add `fragments` to that plugin's own `content` option in `vite.config.ts` too; a
concept missing there fails silently rather than throwing, so an entry that includes a fragment
would find it missing from the manifest with no build error to explain why.

Fragments need no fields of their own beyond a title; the admin gives every concept one for free.
Write one like any other entry:

```md
<!-- src/content/fragments/trail-safety.md -->
---
title: Trail safety notice
---
Conditions change fast above treeline. Check the forecast before you go, and tell someone your
route.
```

## Include it

In any other entry's body, write the include directive naming the fragment's id:

```md
Some ordinary markdown here.

::include{fragment="a1b2c3d4"}

More markdown after it.
```

In the editor, the "Include a fragment" control in the insert palette writes this directive for
you, so an author never has to know or type a raw id by hand.

At render time, the fragment's raw markdown splices into the including entry's tree in place of
the directive, and flows through the exact same downstream pipeline a native entry's own markup
does: a registered component, a `cairn:` link, or a `media:` reference inside the fragment
resolves and renders exactly as if it had been typed directly into the including entry. The
resolver is `FragmentResolve`, the type `SiteRender`'s `resolveFragment` option takes; a build
supplies one backed by [`buildFragmentResolver`](../reference/delivery-data.md#buildfragmentresolver),
and a dangling `::include` (an id naming no real fragment) fails the build the same way a
dangling `cairn:` link does.

Your own adapter's `rendering.render` function has to forward that resolver, the same way it
already forwards `resolve` and `resolveMedia`: `({ body, resolve, resolveMedia, resolveFragment })
=> renderMarkdown(body, { resolve, resolveMedia, resolveFragment })`. Drop `resolveFragment` from
that destructure and forward, and `::include` directives never resolve; they publish as literal
directive text instead of the fragment's content, with no error to flag it.

## The one nesting rule

A fragment can't include another fragment. Resolution runs exactly one pass deep: if a fragment's
own body contained an `::include`, it would never be revisited, so the engine refuses the save
outright rather than silently ship a directive that can never resolve. Write shared content flat;
if two fragments would otherwise want to share a piece of a third, that third piece becomes its
own fragment, included separately wherever it's needed, rather than nested inside another one.

## The delete guard

Deleting a fragment that's still included somewhere is refused, the same shape [Link content with
references](./link-content-with-references.md#the-delete-guard) uses for a `reference` field: the
delete action checks every other entry's recorded `includes` edges against the fragment's id, and
if any entry still includes it, the delete is blocked with that entry named. A fragment's own edit
screen shows the same "where used" list, so you can see what includes it before you ever try to
delete it.

**You know it worked when:** `npm run build` succeeds with the `fragments` glob wired in, the
fragment's content appears verbatim inside the including entry's rendered output, and editing the
fragment changes every entry that includes it on the next render.
