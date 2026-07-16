# Reuse content across entries

A fragment is a piece of markdown you author once and include in any number of posts and pages.
Edit the fragment, publish it, and every entry that includes it shows the new text. Nothing is
copied, so nothing drifts out of sync.

Fragments are a content concept you declare, the same way you declare Posts and Pages, under the
reserved `fragments` key. An editor writes one in the admin like any other entry. The concept has
no public URL of its own. A fragment reaches a reader only through an entry that includes it.

Reach for a fragment when the same words belong in several places and must stay identical, such as
a safety notice or a season's schedule. For a piece of content readers navigate to, declare an
ordinary page instead.

The running example is the showcase's trail safety notice, included by a post and by the about
page. Every snippet below comes from
[`examples/showcase/src/theme/cairn.config.ts`](../../examples/showcase/src/theme/cairn.config.ts).

## Declare the concept

Declare the concept and add it to your adapter's `content` block under the `fragments` key, after
`pages`:

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const fragments = defineConcept({
  dir: 'src/content/fragments',
  label: 'Fragments',
  singular: 'fragment',
  routing: 'embedded',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
  }),
});
```

`routing: 'embedded'` makes the concept non-routable, and the `fragments` key requires it. Declare
the key with any other routing and your config fails to load:

```
cairn: concept "fragments" requires routing: 'embedded' (the include directive resolves against it)
```

A routable fragment would publish its own bare permalink, and a reader following it would land on a
notice with no context around it.

Keep the fieldset small. A fragment is a body plus a name the picker can show. The `title` never
renders inside a consuming entry; it labels the fragment in the admin.

## Wire the content

A declared concept needs its markdown globbed in two places. First, the delivery indexes:

```ts
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from './cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fragmentsRaw = import.meta.glob('/src/content/fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, {
  posts: postsRaw,
  pages: pagesRaw,
  fragments: fragmentsRaw,
});
```

`createSiteIndexes` throws if a declared concept has no glob key, so a missing entry here fails the
build rather than serving a site whose fragments never resolve.

Second, the manifest plugin in `vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cairnManifest } from '@glw907/cairn-cms/vite';

export default defineConfig({
  plugins: [
    sveltekit(),
    cairnManifest({
      configModule: '/src/theme/cairn.config.ts',
      content: {
        posts: '/src/content/posts/*.md',
        pages: '/src/content/pages/*.md',
        fragments: '/src/content/fragments/*.md',
      },
      manifestPath: '/src/content/.cairn/index.json',
    }),
  ],
});
```

If your adapter declares a `navLayout`, add `{ screen: 'fragments' }` to the group where you want
it. A declared nav is exhaustive, so a screen you leave out lands in the fallback foot group rather
than beside Posts and Pages.

## Forward the fragment resolver

Your render wrapper receives a `resolveFragment` alongside `resolve` and `resolveMedia`. Forward it
the same way:

<!-- snippet-check-skip: illustrates the rendering member's render function in isolation, calling the site's own renderMarkdown and media resolver -->
```ts
render: ({ body, resolve, resolveMedia, resolveFragment }) =>
  renderMarkdown(body, { resolve, resolveMedia: resolveMedia ?? publicMediaResolver, resolveFragment }),
```

The engine can't infer this wiring, and it's the first thing to check when an include doesn't
render. cairn builds the resolver on both sides already: the public route passes a
[`buildFragmentResolver`](../reference/delivery-data.md#buildfragmentresolver) backed by the site
resolver, and the editor's preview passes one backed by the published fragments it loaded. Your
`render` is the single function both call, so a wrapper that drops `resolveFragment` leaves every
include unresolved, and the directive falls through to the page as literal text.

## Author a fragment and include it

An editor creates a fragment from the Fragments screen, writes the body, and publishes it. A
fragment must be published before another entry can include it, because an include resolves against
the default branch.

To include one, put the directive on its own line in any post or page:

```md
Before you head out, read this.

::include{fragment="trail-safety-notice"}
```

The editor's **Include a fragment** toolbar control inserts that directive for you and lists every
published fragment by title. The `fragment` attribute names the fragment's id, which is its
filename without the extension.

An include is a block. It stands on its own line and splices the fragment's blocks in place, so a
fragment can carry headings, lists, links, images, and your registered components, and each renders
exactly as it would in a native entry. You can't include a fragment inside a sentence. The
directive resolves only at the start of a line. [Content authoring
syntax](../reference/authoring-syntax.md#include-a-fragment) covers the grammar.

## Check include integrity

Editing a fragment and publishing it updates every entry that includes it. The consuming entries
need no action.

Renaming a fragment rewrites the `::include` directive in every entry that includes it, in the same
commit as the rename.

Deleting a fragment that's still included is refused. The admin names the entries that include it
and links to each one, so an editor removes the includes first. A fragment's own edit screen shows
the same list.

Saving a fragment whose own body carries an `::include` is refused:

```
A fragment can't include another fragment.
```

Resolution runs one pass deep, so no chain of includes can cycle.

An include that names a fragment that doesn't exist behaves differently in the two places it can
render. The editor's preview shows a short notice in place of the directive and logs an
[`include.missing`](../reference/log-events.md) event with the id, so an editor sees the problem
without losing the rest of the preview. A build refuses outright: the resolver throws, and the
dangling include fails the build the same way a dangling `cairn:` link does.

## See also

- [Define an adapter and schema](./define-an-adapter-and-schema.md) covers the rest of the adapter
  the fragments concept lives inside.
- [Wire the delivery surface](./wire-the-delivery-surface.md) covers the public routes that pass
  `resolveFragment` to your render.
- [Organize your admin nav](./organize-your-admin-nav.md) covers the declared `navLayout` the
  Fragments screen slots into.
- [Content authoring syntax](../reference/authoring-syntax.md) covers the `::include` directive
  alongside the rest of the body grammar.
