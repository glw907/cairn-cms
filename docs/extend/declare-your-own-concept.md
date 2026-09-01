# Declare your own concept

**Contract:** add a second content type to your site's `content` map, and decide whether it gets
public pages of its own.

**Precondition:** an adapter with at least one concept declared, from [Define an adapter and
schema](./define-an-adapter-and-schema.md).

Posts and pages aren't special names cairn reserves; they're just concepts a site happened to
declare. The concept set is entirely yours: a site declares as many as it needs, each a key in
the adapter's `content` map, and the admin nav, the create affordances, and the delivery layer
follow whatever you name.

## Add a concept

Say your posts want a byline that's more than a plain text field: a shared author identity, with
a name and a short bio, reused across every post the same person wrote. Declare `authors` as its
own concept:

```ts
import { defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

const authors = defineConcept({
  dir: 'src/content/authors',
  label: 'Authors',
  singular: 'author',
  routing: 'page',
  fields: defineFieldset({
    name: fields.text({ label: 'Name', required: true }),
    bio: fields.textarea({ label: 'Bio' }),
  }),
});
```

Add it to the adapter's `content` map beside `posts`:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) and continues the posts/authors concepts declared above -->
```ts
export const cairn = defineAdapter({
  content: { posts, authors },
  // ...backend, email, rendering...
});
```

The admin nav grows an "Authors" entry, editors can create and edit author entries the same way
they edit posts, and nothing about `posts` needs to change yet.

That's the whole adapter declaration, but `createSiteIndexes` needs a matching glob too: it throws
at build time for any declared concept with no glob passed, since Vite needs the literal
`import.meta.glob` pattern at the call site and can't have one added for it programmatically.
Add `authors` to [the content index](./wire-the-delivery-surface.md#the-content-index) your
delivery routes build from, the same `src/lib/content.ts` file that already declares `postsRaw`:

```ts
// src/lib/content.ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const authorsRaw = import.meta.glob('/src/content/authors/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, authors: authorsRaw });
```

If your site also builds the committed content manifest with the [`cairnManifest`](../reference/vite.md)
Vite plugin, add `authors` to that plugin's own `content` option in `vite.config.ts` too. That
option isn't read from this file, and unlike `createSiteIndexes` above, a concept missing from it
fails silently: the manifest simply never gets any `authors` rows, with no throw and no build
warning to catch it.

## Decide whether it gets its own page

`routing` is the decision that matters most for a supporting concept like this one. The shorthand
you choose changes what the concept is for, not just its URL:

- **`'page'`**, what `authors` used above, gives each entry its own routable, undated page (an
  author bio page, reachable at its own permalink) and puts it in the sitemap.
- **`'feed'`** is for dated, chronological content that belongs in feeds and an archive, the
  shape [Define an adapter and schema](./define-an-adapter-and-schema.md#the-url-policy) already
  covered for `posts`.
- **`'embedded'`** declares a concept with no public page of its own at all: not routable, not in
  the sitemap, not in any feed. An `authors` concept that exists only to be referenced, never
  browsed on its own, is a better fit for `'embedded'` than `'page'`. [Reuse content across
  entries](./reuse-content-across-entries.md) covers the one reserved embedded concept,
  `fragments`, which the `::include` directive resolves against.

An embedded concept an entry references still works exactly like the `'page'` example above for
every other purpose: it has its own directory, its own fields, and its own admin list and editor.
The only thing `'embedded'` removes is a public page.

## Connect it with a reference field

A concept on its own is just more content. Connect `authors` to `posts` with a `reference`
field, so a post names which author entry it belongs to:

```ts
import { defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  routing: 'feed',
  fields: defineFieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
    author: fields.reference({ label: 'Author', concept: 'authors', required: true }),
  }),
});
```

In the editor, this renders as a picker scoped to the `authors` concept; on the public side, a
route resolves the id to the author's title and permalink and renders a link. [Link content with
references](./link-content-with-references.md) covers the field's full contract: validation,
resolution at request time, the dangling-reference build gate, and what happens when you try to
delete an author a post still references.

**You know it worked when:** `npm run check` typechecks the new concept's fields, `npm run build`
succeeds with the new glob wired in, and the admin nav shows the new concept's list with your
sample entries.
