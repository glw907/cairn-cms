# Add authors to your site

cairn has no authors feature to turn on. An author is a concept like any other: a directory of
markdown files with a schema, referenced from wherever a post needs one. The showcase's `posts`
concept already reaches for an author by pointing its `author` field at the `pages` concept, a
shortcut that works but reads oddly once a site has more than one or two authors, as [Define an
adapter and schema](./define-an-adapter-and-schema.md#reference-another-concept) says outright.
This guide builds the dedicated version: an `authors` concept of its own, referenced from `posts`
the same way, rendered as a byline. The same pattern answers most "does cairn support X?"
questions: the thing you want is usually a concept and a reference to it.

## Declare the concept

An author needs nothing a post doesn't already have: a directory, and a schema built from
`fieldset`. Every concept identifies its entries through a `title` field, the way posts and pages
both do, and an author is no exception, even though "Name" reads better than "Title" as its
editor-facing label.

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const authors = defineConcept({
  dir: 'src/content/authors',
  label: 'Authors',
  routing: 'embedded',
  fields: fieldset({
    title: fields.text({ label: 'Name', required: true }),
    photo: fields.image({ label: 'Photo' }),
  }),
});
```

`routing: 'embedded'` is the third shorthand [Define an adapter and
schema](./define-an-adapter-and-schema.md#declare-your-first-concept) already lists: a concept
that isn't routable or dated, stays out of feeds, and that nothing links to directly, because
another concept pulls its content in. An author's bio goes in the body of the markdown file, the
same as a post's body. Add `authors` to your adapter's `content` map the way you already added
`posts` and `pages`, one more key beside the two you have.

## Reference it

A `posts` entry points at one author the same way it already points at one page: a `reference`
field naming the target concept.

```ts
import { fields } from '@glw907/cairn-cms';

const author = fields.reference({ concept: 'authors', label: 'Author' });
```

Add that key to the `posts` fieldset in place of a field that pointed at `pages`, and an editor's
author picker now offers every entry under `authors` instead of every page on the site. Everything
else about a reference field, the picker widget, what a rename or a delete does to it, how a build
catches a dangling edge, [Link content with references](./link-content-with-references.md) already
covers in full. Nothing about referencing an `authors` concept is special.

## Render it

Marking `authors` embedded keeps it off the sitemap and out of feeds, but it still needs a place
in your site's own indexes, the same way `posts` and `pages` do, or there's nothing for a
reference to resolve against:

```ts
const authorsRaw = import.meta.glob('/src/content/authors/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
```

Add that glob to the `createSiteIndexes` call beside the other two, keyed `authors`. Embedded keeps
the concept out of the site's URLs, but your own code can still resolve it. [Query a reference at
render time](./link-content-with-references.md#query-a-reference-at-render-time) resolves whatever
concept the site knows about, routable or not, so a post's `author` field resolves exactly the way
the showcase's already does against `pages`.

What that resolution gives back, [a `title`, a `permalink`, and an optional
`summary`](../reference/delivery-data.md#types), is enough for a byline, with the `title` holding
the author's name. The `summary`, when the entry has one, is the excerpt cairn already
[derives](../reference/delivery-data.md#deriveexcerpt) from its own markdown body, which is why the
bio belongs in the body and not a field. A `permalink` resolves too, computed the same way every
concept's is, but embedded means nothing serves it, so the byline below leaves it alone.

```svelte
<script lang="ts">
  import type { ResolvedReference } from '@glw907/cairn-cms/delivery';

  let { author }: { author?: ResolvedReference } = $props();
</script>

{#if author}
  <p class="byline">
    By {author.title}
    {#if author.summary}<span class="byline-bio">{author.summary}</span>{/if}
  </p>
{/if}
```

## The pattern generalized

The same shape covers other content that has no page of its own. A `projects` concept referenced
from a portfolio page works the way `authors` does here, and so do events referenced from a
schedule or testimonials referenced from a pricing page (one reference, or a many-edge where a
page needs several). Each is a directory, a `fieldset`, and a `fields.reference` pointing at it.
