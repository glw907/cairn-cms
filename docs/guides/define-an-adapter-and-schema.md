# Define an adapter and schema

Every cairn site has exactly one seam the engine consumes: a single module, conventionally
`src/lib/cairn.config.ts`, that declares a site's content concepts, its GitHub backend, and its
renderer. This guide builds one from nothing, in the same shape as the real, running adapter at
[`examples/showcase/src/theme/cairn.config.ts`](../../examples/showcase/src/theme/cairn.config.ts).
Keep that file open alongside this guide; each step below builds a smaller version of what that
file already does.

## Declare your first concept

A concept is a first-class content kind, a directory of markdown files with a typed frontmatter
schema. `defineConcept` declares one and validates it as you write it, not later at a build or a
save.

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  routing: 'feed',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
    description: fields.textarea({ label: 'Description' }),
  }),
});
```

`dir` is the repo-relative directory the concept reads and writes. `label` names it in the admin
sidebar; leave it out and cairn title-cases the concept's key instead. `fields` is a `fieldset`
built from the `fields` constructors, the single source of truth for the editor form and the save
validator, and the type your own code reads the frontmatter through.

`routing` is the one property with real consequences beyond the schema: it is a shorthand for
three independent facts about a concept, resolved once at declaration.

| Shorthand | Routable as a URL | Carries a date | Appears in feeds |
| --- | --- | --- | --- |
| `feed` | yes | yes | yes |
| `page` (default) | yes | no | no |
| `embedded` | no | no | no |

Posts want `feed`. Leave `routing` off entirely for a plain page, and reach for `embedded` only for
a concept nothing links to directly, content another concept pulls in rather than a URL of its own.

## Add more fields to the schema

Each new field is one more key on the `fieldset` record. The block below adds an image field, a
reference to another concept, and a tag field, each declared like the preceding `title` or `date`.

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  routing: 'feed',
  summaryFields: ['description'],
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
    description: fields.textarea({ label: 'Description' }),
    image: fields.image({ label: 'Hero image', seo: true }),
    author: fields.reference({ concept: 'pages', label: 'Author' }),
    topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
  }),
});
```

`image` stores a `media:` reference plus alt text; `seo: true` also makes it the field the social
card reads when a post doesn't set one explicitly. `reference` stores an edge to one entry of
another concept, here `pages`, and the editor renders it as a picker over that concept's entries.
`multiselect` with `taxonomy: true` marks a field as the concept's tag field: its values pool
across entries and show up on every list card. `creatable: true` lets an editor add a value that
isn't in the list yet; a site that curates a fixed tag vocabulary in `site.config.yaml` narrows
this same field to a closed picker without changing the schema.

`summaryFields` names frontmatter keys a list card shows without a full per-entry read, useful for
anything a card wants to display, an excerpt, a status, a price, that doesn't already drive the
title or the date. Every key it names must also be a declared field.

`object` and `array` build repeatable and grouped fields (an FAQ list, a gallery, a nested address)
over the same descriptors. They nest one level deep and no further; the full field vocabulary,
including the container rules, is in the [core reference](../reference/core.md#fields).

## Declare a second concept

Content is a fixed set of concepts you declare, not an open-ended collection, so a site names each
one it needs. A plain page looks like this:

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const pages = defineConcept({
  dir: 'src/content/pages',
  label: 'Pages',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    robots: fields.text({ label: 'Robots' }),
  }),
});
```

No `routing` here, so it defaults to `page`. Permalinks default by concept id too: Pages resolve
to `/:slug` at the site root, and any other concept resolves under its own id, `/posts/:slug` for a
concept named `posts`. Override either with `permalink` (a root-relative pattern using `:slug`,
`:year`, `:month`, `:day`) or `datePrefix` (the filename date-prefix granularity for a dated
concept, `year`, `month`, or `day`, defaulting to `day`) when the defaults don't fit your site. A
permalink that uses `:year`, `:month`, or `:day` needs a `date` field of that name and type
declared on the same concept; `defineConcept` enforces this and makes the field required, since
the permalink cannot resolve without it.

## Point the adapter at your GitHub repo

The backend is where cairn commits and reads content. `githubApp` builds the default one, a
GitHub App scoped to a single repository and the branch it publishes to.

```ts
import { githubApp } from '@glw907/cairn-cms';

const backend = githubApp({
  owner: 'your-org',
  repo: 'your-site',
  branch: 'main',
  appId: '123456',
  installationId: '987654',
});
```

These four strings are the App's non-secret identity: `owner` and `repo` name the target
repository, `branch` is the one the backend reads from and, through a per-entry holding branch,
commits to. `appId` and `installationId` come from the GitHub App's own settings page and the
organization's installation of it. The private key never appears here: it lives as the Worker
secret `GITHUB_APP_PRIVATE_KEY_B64`, which the engine reads at request time to mint a short-lived
installation token, never from the adapter source you commit.

## Add the email sender

Cairn's default auth sends a magic link by email, so the adapter also names the address it sends
from.

```ts
const email = { from: 'cms@your-site.com' };
```

`from` is the only required key. An optional `replyTo` gives editors a real address to write back
to instead of the sending one.

## Wire up render

`rendering.render` is the site's one renderer: the editor preview and every public page call it.
`createRenderer` builds the default markdown pipeline,
GFM tables and footnotes, cairn's own figures and link resolution included, and returns a
`renderMarkdown` function your `render` delegates to.

```ts
import { createRenderer } from '@glw907/cairn-cms';
import type { SiteRender } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer();

const render: SiteRender = ({ body, resolve, resolveMedia }) =>
  renderMarkdown(body, { resolve, resolveMedia });
```

Called with no arguments, `createRenderer` renders plain markdown and nothing else. Pass it a
component registry once your site declares its own directive-based components (callouts, pull
quotes, a video embed), which is a step of its own and not this guide's job; the
[render section](../reference/core.md#render) of the core reference covers `SiteRender`,
`createRenderer`'s options, and the registry it optionally takes.

## Assemble the adapter

`defineAdapter` takes the four groups covered so far, plus the `media` and `editor` groups a site
adds when it needs them (six in all), and returns the same object, narrowed so every concept's
concrete field types survive for your own code to read.

```ts
import { defineAdapter, defineConcept, fieldset, fields, githubApp, createRenderer } from '@glw907/cairn-cms';

const { renderMarkdown } = createRenderer();

export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
      }),
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
      }),
    }),
  },
  backend: githubApp({ owner: 'your-org', repo: 'your-site', branch: 'main', appId: '123456', installationId: '987654' }),
  email: { from: 'cms@your-site.com' },
  rendering: {
    render: ({ body, resolve, resolveMedia }) => renderMarkdown(body, { resolve, resolveMedia }),
  },
});
```

This is a complete, working adapter. A site with more concepts, richer schemas, R2-backed media,
or custom admin screens grows this same object: you add another key under `content`, or one of
the `media` and `editor` groups the next section covers.

## Let a bad adapter fail loudly

`defineConcept` checks its concept's URL policy the moment the module loads, so a typo fails at
import—in your editor or dev server—rather than as a silently wrong URL later. The identifier
in the error is the concept's `label`:

```
cairn: concept "Posts" permalink "blog/:slug" must start with "/"
cairn: concept "Pages" is not dated, so permalink "/:year/:slug" cannot use the date token ":year"
```

`defineAdapter` checks that the island wiring is consistent at the same load-time moment: every
component that declares client hydration is listed in `rendering.islands`, and no `islands` entry
names a component that doesn't. A wiring mistake between the two fails at load rather than as a
component that silently never hydrates.

One check happens later, not at either declaration: `composeRuntime` catches a `reference` field
naming a concept you haven't declared under `content` when it folds your adapter into the runtime
the admin actually serves from, since that is the first point where it knows the full set of
declared concepts.

## Reference another concept

The `author` field in the earlier schema pointed a `posts` entry at one `pages` entry.
`array(fields.reference(...))` does the same for a many-edge, a post's list of related posts:

```ts
import { fields } from '@glw907/cairn-cms';

const related = fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), {
  label: 'Related posts',
});
```

The editor renders either as a picker over the target concept's entries, and a build-time check
verifies every stored edge still resolves, failing loudly if an entry gets deleted out from under
a reference. Piggybacking the author field on `pages`, the way the earlier example does, works,
but a dedicated concept reads better once a site has more than one or two authors. [Add authors to
your site](./add-authors.md) walks that dedicated-concept version of the same pattern end to end.

## What's next

The adapter also has two smaller groups this guide didn't need: `media`, which turns on R2-backed
uploads, and `editor`, which carries the preview frame's stylesheets, the nav-editing menu, and
your own admin screens' sidebar entries. The [core reference](../reference/core.md#media-adapter-member)
documents both alongside everything covered here. If you're bringing content in from another
system rather than starting from an empty directory, [Migrate existing
content](./migrate-existing-content.md) covers mapping it onto concepts like these. And if an
adapter that used to load stops loading, or a save fails in a way this guide didn't predict,
[Troubleshooting](./troubleshooting.md) is built to start from the symptom.
