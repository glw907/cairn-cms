# Reuse content across entries

A passage that several entries share, such as a safety notice, can live in one file instead of a
copy in each entry. On a scaffolded site, the trail safety notice on the about page and in a post is
one such file. That file is a fragment. A fragment is an entry of the reserved `fragments` concept,
and any entry pulls one into its body with `::include{fragment="<id>"}`. Editors keep fragments on a
**Fragments** screen like other content, but a fragment has no public page and reaches a reader only
inside an entry that includes it. The including entry's file keeps only the include line. The engine
splices in the fragment's body each time that entry renders, so one edit to the fragment changes
every entry that includes it. On the public site, that render reads the markdown in the deployed
commit, and a fragment's edit reaches its including pages in the deploy that the fragment's publish
starts.

The engine does the splice and builds the resolver that each public entry page hands to the site's
render, and it gives editors an **Include a fragment** control. It also guards a named include. An
include that names a missing fragment fails the build, as a dangling `cairn:` link does, and the
admin refuses to delete a fragment that a published entry still includes. The site supplies three
wiring points and a render. Its adapter declares the `fragments` concept with
`routing: 'embedded'`. Its content module passes a glob for the fragment files to
`createSiteIndexes`. The `cairnManifest` Vite plugin takes the same glob in its `content` option.
The adapter's `rendering.render` forwards `resolveFragment`. Two of those four pieces fail with no
error. A plugin entry left out gives the fragments no manifest rows, and a render that drops the
resolver prints each include line on the page as literal text. A missing content-module glob stops
the build instead.

On the site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) builds, whose
adapter is `src/lib/cairn.config.ts`, you turn fragments on: you declare the fragments concept, index its files, confirm that your render forwards
`resolveFragment`, write a fragment and include it in an entry, and check that it renders. A
scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already has all four pieces and the
`trail-safety-notice` fragment. Its developer comes to add a fragment, to check a render they
replaced, or to learn what the engine refuses, such as deleting that fragment while the about page
and a post still include it. A developer chasing a build error that names a fragment, an include
line printed on a page, or an `include.missing` record in the logs can start at
[Diagnose an include that does not render](#diagnose-an-include-that-does-not-render).

The page assumes you know markdown with YAML frontmatter, Vite's `import.meta.glob`, and the
`::name{key="value"}` leaf-directive form. It assumes no knowledge of cairn beyond the adapter file,
the content module, and `vite.config.ts`. The page leaves two topics to other documentation:

- Reference fields, in [Link content with references](link-content-with-references.md). A reference
  field points at another entry, such as a scaffolded post's `author`, by storing its id in
  frontmatter for the site's template to render.
- Using the **Include a fragment** control as an editor, which belongs to the editor documentation.

> **Note:** A fragment's text is the same in every entry that includes it, and an include takes the fragment's id and nothing else.
> When a block should differ on each use, register a custom public component instead, because a component declares the attributes each use sets.
> [Configure rendering](configure-rendering.md) covers custom public components.

## Before you begin

Fragments take wiring in three files on your site: the adapter, the content module, and
`vite.config.ts`.

Before you start, check that your site has the following:

- The adapter file, which is `src/lib/cairn.config.ts` on the tutorial's site and
  `src/theme/cairn.config.ts` on a scaffolded one. The tutorial writes it in
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter).
- The content module that calls `createSiteIndexes`, and `vite.config.ts` with the `cairnManifest`
  plugin. The content module is `src/lib/content.ts` on the tutorial's site and
  `src/chassis/content.ts` on a scaffolded one. The tutorial writes both files in
  [Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest).
- A public entry route built on `createPublicRoutes`, which the tutorial writes in
  [Render the entry](add-cairn-to-a-sveltekit-app.md#render-the-entry).

A scaffolded site already declares the concept, globs its files in both places, and forwards the
resolver. Its developer can start at
[Write a fragment and include it](#write-a-fragment-and-include-it) to add a fragment, or at
[How an include resolves](#how-an-include-resolves) for what the engine does with one. A developer
who replaced the scaffold's render starts at
[Forward resolveFragment from your render](#forward-resolvefragment-from-your-render).

## Declare the fragments concept

Declaring a concept under the reserved key `fragments` turns on the `::include` directive, and that
concept must use `routing: 'embedded'`. With that routing, a fragment has no permalink and reaches a
reader only through an entry that includes it. [Routing](content-model.md#routing) in Content model
sets out what each routing shorthand turns on or off.

- In the adapter file, add a `fragments` concept to the `content` group:

  <!-- snippet-check-skip: elides the tutorial's posts concept and the adapter's backend, email, and rendering groups -->
  ```ts
  // src/lib/cairn.config.ts
  import { defineAdapter, defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

  export const cairn = defineAdapter({
    content: {
      // posts stays as the tutorial wrote it
      fragments: defineConcept({
        dir: 'src/content/fragments',
        label: 'Fragments',
        singular: 'fragment',
        routing: 'embedded',
        fields: defineFieldset({
          title: fields.text({ label: 'Title', required: true }),
        }),
      }),
    },
    // backend, email, and rendering stay as the tutorial wrote them
  });
  ```

  A scaffolded site declares the same concept right after `pages`.

Any other `routing` value throws when the engine composes the site's content runtime, not when
`defineConcept` runs, with the message
`cairn: concept "fragments" requires routing: 'embedded' (the include directive resolves against it)`.

With the concept declared, hand its files to the build.

## Index the fragment files

The build reads fragment files through two globs, one passed to `createSiteIndexes` in the content
module and one in the `cairnManifest` plugin's `content` option.

To index the fragment files, follow these steps:

1. In the content module, glob `/src/content/fragments/*.md` and pass the result to
   `createSiteIndexes` as `fragments`:

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

   const indexes = createSiteIndexes(cairn, siteConfig, {
     posts: postsRaw,
     fragments: fragmentsRaw,
   });

   export const site = indexes.site;

   // origin stays as the tutorial wrote it
   ```

   Without this glob, `createSiteIndexes` throws at build with an error that starts
   `cairn: concept "fragments" has no glob passed`.

2. In `vite.config.ts`, add `fragments` to the `cairnManifest` plugin's `content` option, with the
   same glob:

   <!-- snippet-check-skip: shows only the cairnManifest call inside the plugins array -->
   ```ts
   // vite.config.ts, inside plugins
   cairnManifest({
     configModule: '/src/lib/cairn.config.ts',
     content: {
       posts: '/src/content/posts/*.md',
       fragments: '/src/content/fragments/*.md',
     },
   }),
   ```

   A missing entry here fails silently. The plugin builds no manifest rows for the concept and
   neither throws nor warns.

The [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) entry and the
[`CairnManifestOptions`](../reference/vite.md#cairnmanifestoptions) entry document both calls.

Next, check that your render passes the resolver through.

## Forward resolveFragment from your render

The adapter's `rendering.render` must forward `resolveFragment` beside `resolve` and
`resolveMedia`, or every include publishes as literal text with no error. The render never builds
that resolver. For each public entry page, `createPublicRoutes` builds one with
`createFragmentResolver` and hands it to the render, and the admin preview passes a separate one.
`SiteRender`'s `resolveFragment` option takes it as a `FragmentResolve`.

- In the adapter file, confirm that `render` takes `resolveFragment` and passes it to the renderer:

  <!-- snippet-check-skip: shows only the render member of the adapter's rendering group -->
  ```ts
  // src/lib/cairn.config.ts, the rendering group
  render: ({ body, resolve, resolveMedia, resolveFragment }) =>
    renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
  ```

The tutorial's render and the scaffold's already forward it.

A render path that the site writes outside `createPublicRoutes` builds its resolver with
[`createFragmentResolver`](../reference/delivery-data.md#createfragmentresolver), exported from
`@glw907/cairn-cms/delivery/data`. The scaffold's feed resolves its fragments that way. For an
unknown id, or on a site with no fragments concept, that resolver throws
`cairn: fragment "<id>" not found`. The [`SiteRender`](../reference/core.md#siterender) entry lists
the render's full input.

With the wiring in place, write a fragment and include it.

## Write a fragment and include it

A fragment is a markdown file in `src/content/fragments/`, and an include names it by its id, the
filename without `.md`.

On the tutorial's site, the fragment and the entry that includes it sit in sibling directories:

```text
field-notes/
└── src/
    └── content/
        ├── fragments/
        │   └── trail-safety-notice.md
        └── posts/
            └── 2026-08-14-first-light.md
```

On a scaffolded site, the fragment is already in place, and `src/content/pages/about.md` includes it.

To write a fragment and include it, follow these steps:

1. In `src/content/fragments`, create `trail-safety-notice.md` with a `title` and a one-paragraph
   body, as the scaffold's copy has:

   ```md
   ---
   title: Trail safety notice
   ---
   Check current avalanche and trail conditions before you set out, and carry the ten essentials above treeline.
   ```

2. In the entry's body, add `::include{fragment="trail-safety-notice"}` on a line of its own:

   ```md
   ---
   title: First light
   date: 2026-08-14
   description: The first entry on Field Notes.
   ---

   The first post on the site, written in plain markdown.

   ::include{fragment="trail-safety-notice"}
   ```

   On a scaffolded site, the about page carries the same line.

3. In the project directory, rewrite the manifest:

   ```bash
   npx cairn-manifest
   ```

   The manifest records each entry's included fragments, so a new fragment and a new include both
   change it. A build fails on a manifest that has drifted from the markdown, and its error names
   `npx cairn-manifest`.

In the admin, an editor writes the same line with the **Include a fragment** control in the
editor's insert palette. The control appears only when the site declares a fragments concept, and
never while the editor edits a fragment. With no published fragment, its picker says to create one
on the **Fragments** screen and publish it. Using the control belongs to the editor documentation.

Before you put a component, a link, or an image in a fragment, read how an include resolves.

## How an include resolves

A fragment's body takes the same markdown as an entry's, because at render time the engine splices
it into the including entry before it resolves components, `cairn:` links, and `media:` references.
A registered component directive, a `cairn:` link, or a `media:` reference inside a fragment
resolves as if it were typed into the including entry. Because the engine reads the fragment's body
at each render, an edit shows in an including entry at that entry's next render. Resolution runs one
pass deep, so a fragment can't include another fragment, and the engine refuses such a save with
`A fragment can't include another fragment.`

Next, see what keeps each include valid.

## Guards that keep includes valid

An include whose id names no fragment fails the build, the same way a dangling `cairn:` link does.
The resolver the public build uses throws `cairn: fragment "<id>" not found`, and on a prerendered
entry route that throw stops the build. An include with no `fragment` attribute never reaches the resolver, so the build doesn't
catch it. [Diagnose an include that does not render](#diagnose-an-include-that-does-not-render)
covers that case.

The admin refuses to delete a fragment while a published entry still includes it, with a guard
shaped like a reference field's. A fragment's edit screen lists the entries that include it in an
**Included in** group with a count. While any entry includes the fragment, the edit screen also
shows a status line, ahead of a publish, that names how many including entries a publish updates.
On a scaffolded site, `trail-safety-notice` lists two entries, the about page and
a post.

Both the guard and the list read the includes each entry records in the content manifest. A publish
updates that record and a save doesn't, so an include counts once its entry is published.
[The content manifest](content-model.md#the-content-manifest) in Content model describes the rows.

With the fragment included, check the result end to end.

## Verify the include

The including entry renders the fragment's paragraph where the directive was, and the fragment's
edit screen lists that entry under **Included in**.

To verify the include, follow these steps:

1. In the project directory, run the build, and confirm that it completes:

   ```bash
   npm run build
   ```

   A dangling include or a missing content-index glob fails this build.

2. In the project directory, start the dev server. On the tutorial's site, set `CAIRN_DEV_BACKEND` in the form
   that [Verify the dev sign-in](add-cairn-to-a-sveltekit-app.md#verify-the-dev-sign-in) gives for your
   shell.
3. In a browser, open the including entry: `/posts/first-light` on the tutorial's site, or `/about`
   on a scaffolded one. Confirm that the fragment's paragraph appears where the directive was, with
   no `::include` text left.
4. In the admin, open **Fragments**, then **Trail safety notice**. Confirm that the **Included in**
   group lists the including entry, with a count of one on the tutorial's site and two on a
   scaffolded one.

## Diagnose an include that does not render

A failed include either stops the build with a `cairn:` error or leaves text on the page where the
fragment belongs.

When a check fails, work through the following causes in order:

1. The build stops with a setup error. Each one names the piece to fix:

   - `cairn: concept "fragments" requires routing: 'embedded'` points at
     [Declare the fragments concept](#declare-the-fragments-concept).
   - `cairn: concept "fragments" has no glob passed` points at the content-module step of
     [Index the fragment files](#index-the-fragment-files).
   - A stale-manifest error names `npx cairn-manifest`, the last step of
     [Write a fragment and include it](#write-a-fragment-and-include-it).

2. The build stops with `cairn: fragment "<id>" not found`. An include names an id with no file in
   `src/content/fragments`, or the site declares no fragments concept. Set the id to the fragment's
   filename without `.md`, or declare the concept and add the fragment.
3. The page shows the literal `::include{fragment="..."}` text. The render doesn't forward
   `resolveFragment`. Forward it as
   [Forward resolveFragment from your render](#forward-resolvefragment-from-your-render) shows.
4. The page shows a notice in place of the include, and the log carries an `include.missing` record
   with `reason: 'empty_fragment'`. The directive has no `fragment` attribute. Add the fragment's id
   to it. The build passes this case, so the notice can reach the live site.
5. The page shows a `Missing fragment` notice, and the log carries `include.missing` with
   `reason: 'not_found'`. A resolver other than the public build's returned nothing for the id,
   where the public build's resolver would have thrown. Check the id against the fragment's filename.

The [Log events](../reference/log-events.md) reference lists the `include.missing` record's fields,
and [Read the structured logs](debug-your-site.md#read-the-structured-logs) shows how to find the
records.

## See also

The following pages and reference entries cover related topics:

- [Configure rendering](configure-rendering.md) covers custom public components with attributes and
  the render seam.
- [Link content with references](link-content-with-references.md) covers reference fields and their
  delete guard.
- [Content model](content-model.md) covers the routing shorthands and the content manifest.
- [`createFragmentResolver`](../reference/delivery-data.md#createfragmentresolver) documents the
  resolver the build uses.
- [`SiteRender`](../reference/core.md#siterender) documents the input the adapter's render takes.
