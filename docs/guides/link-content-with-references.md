# Link content with references

Two different mechanisms connect one piece of content to another. A `cairn:` link is a token an
author types into the markdown body; the editor's link picker inserts it and the renderer resolves
it to a permalink. [Content authoring syntax](../reference/authoring-syntax.md#cairn-internal-links)
covers that one. A `reference` field is different: your schema declares it, a typed frontmatter
edge from one concept's entry to a specific entry of another concept, and an editor fills it from a
picker in the entry form rather than typing it inline. This guide covers the reference field:
declaring one, resolving it in your render code, and the checks that keep an edge from dangling
when its target is renamed or deleted.

The running example is the showcase's `posts` concept, which carries both shapes of the field:
`author`, a single edge to one `pages` entry, and `related`, a many edge to other `posts` entries.
Both come from
[`examples/showcase/src/theme/cairn.config.ts`](../../examples/showcase/src/theme/cairn.config.ts),
and this guide's snippets restate them.

## Declare a reference between concepts

`fields.reference` declares a single edge. Wrap it in `fields.array` for a many edge.

```ts
import { fields } from '@glw907/cairn-cms';

const author = fields.reference({ concept: 'pages', label: 'Author' });
const related = fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), {
  label: 'Related posts',
});
```

`concept` names which concept's entries populate the editor's picker: `author` offers every
`pages` entry, `related` offers every `posts` entry, including the one an editor is currently
editing. The stored value is the target's permanent id, a single string for `reference` and a list of strings
for `array(reference)`, never the target's title or permalink, so the edge survives a rename or a
permalink change on either side. [Declare structured fields](./structured-fields.md#reference-another-concept)
covers the picker widget itself, a combobox for one edge and a removable chip list for many.

Name a concept you've declared. cairn catches a typo, but not at `defineConcept`: it
surfaces when your adapter composes into the runtime the admin serves from. That is the first point
at which cairn knows the full set of declared concepts.

```
cairn: concept "posts" reference field "author" names concept "author", which is not declared under content
```

## Query a reference at render time

A public route reads a reference the same way it reads any other frontmatter field, except that
resolving it to something to link to, a title and a permalink, means reaching a different
concept's entries. Because that lookup crosses concepts, it lives on the `site` resolver rather
than the per-concept content index, in `resolveReferences`.

```ts
import { resolveReferences, type ResolvedReference } from '@glw907/cairn-cms/delivery';
import type { ConceptDescriptor } from '@glw907/cairn-cms';
import type { SiteResolver } from '@glw907/cairn-cms/delivery';

function resolveAuthor(
  site: SiteResolver,
  descriptor: ConceptDescriptor,
  frontmatter: Record<string, unknown>,
): ResolvedReference | undefined {
  const refs = resolveReferences(site, descriptor, frontmatter);
  return refs.author as ResolvedReference | undefined;
}
```

`resolveReferences` reads every `reference` and `array(reference)` field off the concept's
descriptor and looks each stored id up in `site`, keyed by field name in the result. A single
`reference` resolves to one `ResolvedReference` (`id`, `concept`, `title`, `permalink`, and an
optional `summary` carried from the target's excerpt). An `array(reference)` resolves to a list in
edge order. `resolveReferences` drops an id with no live target rather than throwing, since the
build's `verifyReferences` gate fails a genuinely dangling edge already, so an unresolved id at
request time means the target is mid-flight or still a draft, and your route can render around it.
[Wire the delivery
surface](./wire-the-delivery-surface.md#serve-one-entry-through-the-catch-all-route) shows this
call wired into a real `[...path]` route, and the [delivery data
reference](../reference/delivery-data.md#resolvereferences) documents the full signature and the
`ResolvedReference` shape.

## Check reference integrity

An edge can go stale in either direction: the target gets deleted, or it never existed to begin
with. Four checkpoints catch a stale edge at different moments. Only the build check blocks a
deploy; the earlier three keep a dangling edge from being created in the first place.

| Checkpoint | When it runs | What happens |
| --- | --- | --- |
| Save | Every save | Warns, doesn't block, when a reference targets an entry that's missing or still a draft. The edge is valid; it just doesn't resolve to anything published yet. |
| Delete | Deleting the target entry | Refuses, naming every entry that still references it, published or held on another editor's pending branch. |
| Rename | Renaming the target entry | Repoints every inbound reference on `main` automatically. Refuses if a still-open edit on another branch holds an inbound edge, so you can't rename out from under someone else's unpublished draft. |
| Build | Every production build | Throws if any edge still points at a target that doesn't exist, naming the source entry, the field, and the missing target. |

The build check is `verifyReferences`. References carry no prerender backstop the way a body
`cairn:` link does, so a reference that slips past every earlier guard, a raw git edit outside the
editor, say, still fails here rather than shipping quietly broken.

```
content reference is dangling: posts/first-trail field "author" points at pages/founder, which does not exist.
```

## See also

- [Declare structured fields](./structured-fields.md#reference-another-concept) for the field
  vocabulary the reference type belongs to, and the picker widget it renders.
- [Add authors to your site](./add-authors.md) walks the `author` example end to end as a
  dedicated concept.
- [Define an adapter and schema](./define-an-adapter-and-schema.md) covers the rest of the adapter
  a reference field lives inside.
- [Wire the delivery surface](./wire-the-delivery-surface.md) covers the public routes that call
  `resolveReferences`.
- [Content authoring syntax](../reference/authoring-syntax.md) covers the `cairn:` body link, the
  other way one entry points at another.
