# Migrate existing content

Your content already exists as directories of markdown files with YAML frontmatter, the shape
Hugo, Jekyll, Eleventy, and most static-site generators use. Cairn wants exactly that shape too,
so bringing it in is mostly mapping work. The words themselves don't change. You sort the files
into concepts, translate a handful of frontmatter keys, and decide what happens to your theme's
shortcodes. If your source is a database-backed content management system instead of files, export
it to markdown first. The mapping below starts once you have files on disk.

## Map your content to concepts

Cairn's content is a fixed set of concepts, but "fixed" means your site declares them up front, not
that Posts and Pages are all you get. [Define an adapter and schema](./define-an-adapter-and-schema.md)
covers declaring one from nothing. Migrating an existing site is usually the same declaration, with
a directory of real files behind it instead of an empty one. Dated content like blog posts or news
items maps to a concept with `routing: 'feed'`. A standalone page (about, contact, a landing page)
takes the `page` default. When an old type has no obvious analog, an events calendar or a staff
directory, it usually still wants its own concept: nothing stops a site from declaring `events` or
`staff` alongside `posts` and `pages`, each with its own directory and fields.

A couple of things from your old site won't map to a concept at all. Hugo and Jekyll generate taxonomy pages, a page per tag, a page per category, straight from the
theme at build time. Cairn has no equivalent generator: a tag-filtered list is a route your site
writes over the content index, the same way every other list page on a cairn site is a route
someone wrote. [Wire the delivery surface](./wire-the-delivery-surface.md) covers building that
list route, the archive filter included. And anything that was never really content, a contact
form's submission handling, an event sign-up count, a member-only section, was never cairn's job on
the old site either, and it stays your own code on the new one.

## Translate the frontmatter

Most frontmatter keys carry straight across. A handful need a decision, and the table below flags
them.

| Generator key | cairn equivalent | Notes |
| --- | --- | --- |
| `title` | `fields.text` | Same job, no translation. |
| `date` | `fields.date` | Cairn reads only the date's `YYYY-MM-DD` head. A full timestamp value still works, and the time of day is simply dropped. |
| `draft: true` | none | Cairn has no draft flag. An entry that isn't ready for readers just isn't in the batch of files you commit to `main` yet. |
| `tags`, `categories` | `fields.multiselect` with `taxonomy: true` | If your site curates a fixed tag vocabulary, add the old values to it first (the `vocabulary` key in `site.config.yaml`, [core reference](../reference/core.md#fields)), or they'll need reassigning by an editor after the import. |
| `description`, `summary` | `fields.textarea`, usually named in `summaryFields` | |
| `image`, `cover`, `thumbnail` | `fields.image` | Covered on its own below. |
| `slug` | none, derived | Covered below; cairn has no separate slug override key. |
| `aliases`, `redirects` | none | Out of scope. A redirect from an old URL to a new one is your site's own routing concern, not cairn's. |

### The id, the slug, and the permalink

An entry's id is its filename with `.md` removed, lowercase letters, numbers, and single internal
hyphens only. The slug that appears in the URL derives from the id: for an undated concept (a plain
`page`) the slug is the id verbatim, so a page migrates by keeping its old filename as its new one.
For a dated concept, the slug strips the id's leading date prefix, and how much of the id counts as
"the prefix" is exactly the concept's `datePrefix` granularity, `year`, `month`, or `day`.

That granularity has to match how much date your filename actually carries, and getting it wrong
doesn't fail loudly, it just leaves a stray digit in the URL. A `datePrefix: 'month'` concept strips
only `YYYY-MM-` from the front of the id. Keep a day-numbered filename like `2024-03-15-my-trip.md`
under a month concept and the slug comes out `15-my-trip`. The day digit ends up in the part of the
URL meant to read clean. Rename the file to `2024-03-my-trip.md` instead, and the slug is
the clean `my-trip` you wanted. Match the filename's precision to the concept's `datePrefix`.

The permalink itself is a pattern on the concept, `/:slug` by default for Pages and `/<concept
id>/:slug` for anything else, overridable with `:year`, `:month`, and `:day` tokens for a dated
concept. To preserve an old URL shape like `/blog/2024/03/my-trip/`, set the concept's `permalink`
to match and pick the `datePrefix` that produces the right slug underneath it:

```ts
// src/lib/cairn.config.ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const posts = defineConcept({
  dir: 'src/content/posts',
  label: 'Posts',
  routing: 'feed',
  permalink: '/blog/:year/:month/:slug',
  datePrefix: 'month',
  fields: fieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
    description: fields.textarea({ label: 'Description' }),
    tags: fields.multiselect({ label: 'Tags', creatable: true, taxonomy: true }),
    image: fields.image({ label: 'Hero image', seo: true }),
  }),
});
```

One more rename worth doing at the same time: an id outside the lowercase-hyphen shape still
renders fine at its own permalink, but a `cairn:` link, and the rename and delete guards that key on
the id, won't recognize it. Fix an old file's underscores or capitals before you migrate it, not
after.

`slug` as an explicit frontmatter override, common in Jekyll and some Hugo themes, has no cairn
equivalent: the filename is authoritative. When an old entry's frontmatter slug disagrees with its
filename, rename the file to match the slug you want, and drop the frontmatter key.

### Bringing in media

An `image` field's stored `src` is just a string. Cairn doesn't require it to be a managed
reference. The fastest migration keeps your existing images wherever they already are, in your
site's static assets or at their existing external URLs, and points the frontmatter straight at
them unchanged. The render pipeline passes through anything that isn't a `media:` token, so a
plain URL there works exactly as it did on the old site.

You give up what only a stored asset gets: content-hash deduplication, alt-text tracking, safe
delete, and resized variants. An image worth that treatment gets uploaded through the admin's
media library screen like any new upload would be, and
the resulting `media:<slug>.<hash>` reference replaces the old URL in the frontmatter or the
markdown body. There's no bulk-import path. A migration with hundreds of images to fully adopt into
the library is hundreds of individual uploads, so weigh it image by image; a blanket rule for the
whole site rarely fits.

## Shortcodes and embeds

A theme shortcode is presentational logic baked into templates. Cairn's equivalent is a directive,
the same markup the editor's insert menu writes when someone picks a component from the palette. A
shortcode that wraps text in a styled box maps onto an existing directive one-for-one. Hugo's
`notice` shortcode, for example,

```md
{{% notice tip %}}
Bring a life jacket. The club has loaners at the boathouse.
{{% /notice %}}
```

becomes cairn's callout directive:

```md
:::callout[Bring a life jacket]{tone="tip"}
The club has loaners at the boathouse.
:::
```

which the site's adapter already declares:

```ts
import { defineComponent, fields } from '@glw907/cairn-cms';
import { h } from 'hastscript';

const callout = defineComponent({
  name: 'callout',
  label: 'Callout',
  description: 'A highlighted note with an optional icon.',
  build: (ctx) =>
    h('aside', { className: ['callout'] }, [
      h('p', { className: ['callout-title'] }, ctx.slot('title')),
      h('div', { className: ['callout-body'] }, ctx.slot('body')),
    ]),
  attributes: {
    tone: fields.select({ label: 'Tone', required: true, options: ['note', 'tip', 'warning'] }),
  },
  slots: [
    { name: 'title', label: 'Title', kind: 'inline', required: true },
    { name: 'body', label: 'Body', kind: 'markdown' },
  ],
});
```

A shortcode with no existing analog, your theme's particular pull-quote style, a pricing table,
gets declared the same way, with a single `defineComponent` call. Once the directive name exists,
every migrated file that used the old shortcode can use it.
[`defineComponent`](../reference/core.md#definecomponent) is the full signature and stability
tier. A shortcode wrapping a single image, Hugo's `figure`
shortcode among them, usually just becomes a plain markdown image, `![alt](src)`, or the `media:`
form covered earlier if the image gets adopted into the library.

Not every shortcode is presentational. One that queries an API, paginates results, or gates content
behind a check isn't a rendering concern cairn's directives can absorb at all. That logic belongs in
your own render function or a route outside cairn.

## Verify

1. Run `cairn-manifest` (or `npm run cairn:manifest`, if your site wires it as a script) to write
   the committed content manifest from the files you just added. The
   [`cairn-manifest` reference](../reference/cli-cairn-manifest.md) covers the command; the manifest
   is what the build checks the corpus against.
2. Run your normal build. The `cairnManifest` Vite plugin fails the build if the manifest drifts
   from the files on disk, and `verifyReferences` fails it if any `reference` field points at an
   entry that doesn't exist, so a bad migration shows up here rather than shipping.
3. Spot-check permalinks by hand: pick one migrated entry per concept, run the dev server, and
   confirm each one resolves at the URL you expect. This is the step that catches a `datePrefix`
   and filename that don't actually agree, since nothing in step 2 checks what a permalink pattern
   resolves to, only that every reference and manifest entry is internally consistent.
4. If preserving an old URL means changing what it resolves to now, add the redirect in your own
   routing or at the edge; cairn doesn't generate one.

If a build fails in a way this guide didn't predict, or an adapter throws at load,
[Troubleshooting](./troubleshooting.md) is built to start from the symptom.
