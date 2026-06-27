# Link content with references

A reference field stores a typed edge from one entry to another in frontmatter: a post's author, a page's
related posts. The stored value is the target's permanent id, not its title or its URL, so a target rename
or a slug change never breaks the link. This guide walks you through declaring a reference field, picking a
target in the editor, and rendering the resolved target on the public site.

## Prerequisites

- A running cairn site with an adapter (see [Define an adapter and schema](./define-an-adapter-and-schema.md)).
- At least two concepts, so one can reference the other. The showcase references its `pages` concept from
  `posts`.

## Declare the field

A reference is a `fields.*` descriptor like any other, with one required option: the `concept` it points at.
Add it to a concept's `fieldset`. Use `fields.reference` for a single edge and `fields.array(fields.reference(...))`
for many.

```ts
// src/lib/cairn.config.ts
import { defineAdapter, fieldset, fields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      schema: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        author: fields.reference({ concept: 'pages', label: 'Author' }),
        related: fields.array(fields.reference({ concept: 'posts' }), { label: 'Related posts' }),
      }),
    },
    pages: {
      dir: 'src/content/pages',
      label: 'Pages',
      schema: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
    },
    // ...backend, sender, render...
  },
});
```

The `concept` value must be a key under `content`. The build fails at the adapter declaration when it names a
concept your site doesn't enable, so a typo surfaces at build, not at a save. This phase accepts only a
reference item inside `fields.array`; an array of any other item type throws at the `fieldset()` call. For the
full signatures, see [`fields.reference` and `fields.array`](../reference/core.md#field-types).

## Pick a target in the editor

A reference field renders in the Details panel of the edit page, beside the other frontmatter fields. Open
Details, and a single reference shows a picker over every entry of the target concept; an array shows a
removable chip per selected entry plus the picker. The picker searches by title and groups by concept, so an
editor names the target rather than typing an id. The field stores the chosen entry's id.

A reference to a target that is still a draft, or absent on `main`, saves with a non-blocking warning rather
than a hard error. The save holds the edit on its branch as usual. The integrity guarantee comes from the
build, not the save: `verifyReferences` fails the deploy on a frontmatter edge whose target is missing from
the corpus, naming the source entry, the field, and the missing target. References carry no prerender
backstop, so this build gate is their only integrity authority.

## Render the resolved target

On the public site, resolve a reference edge to its target's identity with
[`resolveReferences`](../reference/delivery-data.md#resolvereferences). It lives on the cross-concept site
resolver, the only layer that reaches another concept's entries, so a post's `author` edge resolves to the
`pages` entry it points at.

```ts
// src/routes/(site)/[...path]/+page.server.ts
import { resolveReferences } from '@glw907/cairn-cms/delivery';
import { site } from '$lib/content';
import { cairn } from '$lib/cairn.config';

export const load = ({ url }) => {
  const data = routes.entryLoad({ url }); // your existing catch-all load
  const descriptor = cairn.content[data.concept];
  const refs = resolveReferences(site, descriptor, data.entry.frontmatter);
  return { ...data, refs };
};
```

Each resolved value is a [`ResolvedReference`](../reference/delivery-data.md#types) for a single
field, or a `ResolvedReference[]` for an array field, in edge order. It carries the target's `title` and
`permalink`, so the template renders a link without a second lookup.

```svelte
<script lang="ts">
  let { data } = $props();
  const author = data.refs.author;
</script>

{#if author}
  <p>By <a href={author.permalink}>{author.title}</a></p>
{/if}
```

The resolver drops an id with no live target rather than throwing, since the build gate already failed a true
dangling edge. An unresolved id at request time is a mid-flight or draft target, so the template guards the
field before it reads.

## Rename and delete safety

Once a reference points at a target, cairn protects the edge across every open editing branch.

- **Rename repoints inbound references.** Renaming a target rewrites every reference on `main` that points at
  it, in one commit, so the link survives the new id. A rename refuses when a third-party open branch holds an
  inbound reference, the same way a pending edit blocks a rename.
- **Delete refuses when referenced.** Deleting a target refuses when any entry on `main` or any open branch
  references it, so an author can't strand a live link. The refusal fails closed: a branch read error refuses
  the delete rather than allowing it.

For the integrity model behind both, see [Reference integrity](../explanation/reference-integrity.md).
