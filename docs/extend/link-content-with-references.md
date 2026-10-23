# Link content with references

A post that names its author or lists related posts holds each of those connections in its
frontmatter, apart from its body. A `reference` field stores the target entry's id, typed to the one
concept its declaration names, and `fields.array(fields.reference(...))` stores a list of them. The
engine takes the edge's concept from that declaration, so the file holds the id alone. Editors choose
the target from a picker scoped to that concept. On the public site, a route resolves the id and
renders a link whose text and address come from the target entry's `title` and `permalink`. The
running example here is a post with an `author` field that names one `pages` entry and a `related`
field that lists other posts.

The site writes the two ends of a reference. Its adapter declares the field, and a Svelte component
renders the link from the page data that the public entry route's server `load` returns. Everything
between those ends belongs to the engine. It supplies the picker, records each reference as an edge
in the content manifest, and resolves the id to its target for the route. Because an editor can
save a reference to a missing entry, the engine checks it too. The route drops an id whose target is
gone, so the build's reference check is what fails when a published entry references a missing one.
Before a change
reaches the build, the admin refuses to delete an entry that other entries reference, and it counts a
reference held in a draft on its edit branch.

On a scaffolded site, whose adapter is `src/theme/cairn.config.ts`, the example is already wired from
the declaration to the template. You follow it through the files that carry it and add another
reference the same way. On the site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md)
builds, whose adapter is `src/lib/cairn.config.ts`, you add each piece. Either way, you declare the
fields, pick a target, resolve the targets on the public entry route, render each one as a link, and
check the link on the published page. A developer whose startup, build, or admin action failed on a
reference can start at [Diagnose a failed check](#diagnose-a-failed-check), or at
[The admin's reference guards](#the-admins-reference-guards) for a refused delete or rename. A link
inside an entry's body is a `cairn:` link instead, and
[`cairn:` body links and reference fields](#cairn-body-links-and-reference-fields) compares the two.

The page assumes you know TypeScript object literals, a SvelteKit server `load` function, Svelte
runes and `{#each}` blocks, and YAML frontmatter. From cairn, it assumes the concept and fieldset
model that [Concepts](content-model.md#concepts) in Content model sets out. The page leaves the
following topics to other pages:

- [The content manifest](content-model.md#the-content-manifest) and
  [Renames](content-model.md#renames) in Content model cover `cairn:` body links as a model and how
  the manifest records each edge.
- [Reuse content across entries](reuse-content-across-entries.md) covers fragments and the include
  directive.
- [Define an adapter and schema](define-an-adapter-and-schema.md) covers declaring a concept, such as
  the `pages` concept that `author` targets.
- [Build the public routes](build-the-public-routes.md) covers public routes beyond the entry route.

## Before you begin

References need the adapter file of the site you are changing, a declared target concept, and a
build that runs the `cairnManifest` plugin.

Before you start, check that your site has the following:

- The adapter file, which is `src/theme/cairn.config.ts` on a scaffolded site and
  `src/lib/cairn.config.ts` on the add-cairn tutorial's site. The tutorial writes it in
  [Write the site config and a minimal adapter](add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter).
- The target concept, declared under the adapter's `content`.
  [Define an adapter and schema](define-an-adapter-and-schema.md) covers declaring one.
- The `cairnManifest` plugin in the site's Vite config. The tutorial adds it in
  [Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest).
- On the tutorial's site, the public entry route from
  [Render the entry](add-cairn-to-a-sveltekit-app.md#render-the-entry).

A scaffolded site already declares `author` and `related`, resolves them for every entry, and renders
them in `ArticleView.svelte`. Each task section notes where the scaffold already does its work.

With those in place, declare the fields.

## Declare a reference field

A `reference` field stores one entry's id, typed to the concept its `concept` option names, and
`fields.array(fields.reference(...))` stores a list.

The frontmatter holds only the id, because the engine takes the target's concept from the field's
declaration. `fields.reference` takes every `ReferenceField` member except `type`, which it sets
itself. Beyond the base options in the [`fields`](../reference/core.md#fields-1) entry, a reference
needs only `concept`.

To declare the fields, follow these steps:

1. In the adapter file, in the posts concept's fieldset, add
   `author: fields.reference({ concept: 'pages', label: 'Author' })`.
2. In the same fieldset, add
   `related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), { label: 'Related posts' })`.

On a scaffolded site, the posts concept already carries both lines:

<!-- snippet-check-skip: an excerpt of the posts concept inside the adapter's content group -->
```ts
// src/theme/cairn.config.ts
posts: defineConcept({
  // dir, label, routing, and the other fields stay as the scaffold wrote them
  fields: defineFieldset({
    author: fields.reference({ concept: 'pages', label: 'Author' }),
    related: fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), {
      label: 'Related posts',
    }),
  }),
}),
```

A `concept` that names no concept declared under `content` makes `normalizeConcepts` throw when the
engine composes the site's content runtime. The error names the concept, the field, and the
undeclared target, so a typo fails before the build's reference check runs. On the tutorial's site,
which declares only `posts`, `related` works as written and `author` throws this error until the site
declares a `pages` concept. [Define an adapter and schema](define-an-adapter-and-schema.md) covers
declaring a concept.

After a save, a post's frontmatter holds the target ids alone:

```yaml
# <post>.md, frontmatter excerpt
author: <page-id>
related:
  - <post-id>
  - <post-id>
```

Next, open an entry in the admin to see the fields an editor fills in.

## Pick a target in the editor

A `reference` field renders as a button showing its target's title, and an `array(reference)` field
renders as a removable chip list.

Opening the button shows an entry picker scoped to the field's declared concept, and picking an entry
sets the stored id. Each chip shows its target's resolved title.

To set the targets, follow these steps:

1. In the admin, open a post.
2. In the **Author** field, pick a published page.
3. In the **Related posts** field, pick at least one published post.
4. Save the post.

[Verify the rendered link](#verify-the-rendered-link) checks these targets on the public page.
Picking a target from an editor's seat belongs to the editor documentation.

With a target picked, resolve it on the public route.

## Resolve the targets on the entry route

`resolveReferences` returns an entry's references keyed by field name: one `ResolvedReference` for a
`reference` field, and a list in edge order for an `array(reference)`.

It takes the site resolver, the entry's concept descriptor, and the entry's frontmatter. The
descriptor comes from `buildSiteDescriptors`. The
[`resolveReferences`](../reference/delivery-data.md#resolvereferences) and
[`buildSiteDescriptors`](../reference/delivery-data.md#buildsitedescriptors) entries document both
calls.

On a scaffolded site, `withReferences` in `src/chassis/entry-data.ts` already makes this call for
every entry and adds the result as `data.references`. The public entry route and the preview route
both apply it, and a concept with no reference fields gets an empty map. A reference field added to
any concept therefore reaches the template with no route change.

- In `src/routes/[...path]/+page.server.ts` on the tutorial's site, return the entry data with a
  `references` map that `resolveReferences` builds:

  ```ts
  // src/routes/[...path]/+page.server.ts
  import type { EntryGenerator, PageServerLoad } from './$types';
  import {
    buildSiteDescriptors,
    createPublicRoutes,
    resolveReferences,
  } from '@glw907/cairn-cms/delivery';
  import { cairn, siteConfig } from '#lib/cairn.config.js';
  import { origin, site } from '#lib/content.js';

  export const prerender = true;

  const routes = createPublicRoutes({
    site,
    render: cairn.rendering.render,
    origin,
    siteName: siteConfig.siteName,
    description: siteConfig.description ?? '',
  });

  const descriptors = new Map(buildSiteDescriptors(cairn, siteConfig).map((d) => [d.id, d]));

  export const entries: EntryGenerator = () => routes.entries();

  export const load: PageServerLoad = async ({ url }) => {
    const data = await routes.entryLoad({ url });
    const descriptor = descriptors.get(data.concept);
    const references = descriptor ? resolveReferences(site, descriptor, data.entry.frontmatter) : {};
    return { ...data, references };
  };
  ```

Like the scaffold's `withReferences`, the route builds the descriptor map once and returns an empty
map for a concept with no descriptor.

`resolveReferences` drops an id with no live target rather than throwing. A single reference's key
can then be absent, and a list can hold fewer targets than the stored ids, so the template guards
both. [The build's reference check](#the-builds-reference-check) explains why the drop is safe.

Next, render each resolved target in the page's template.

## Render each target as a link

A `ResolvedReference` carries the target's `id`, `concept`, `title`, `permalink`, and an optional
`summary`, so a template links `permalink` with `title` as the text.

On a scaffolded site, `src/theme/components/ArticleView.svelte` already renders both.

- In the entry's page component, read `data.references.author` as one `ResolvedReference` and
  `data.references.related` as a list, and render each as a link:

  ```svelte
  <!-- modeled on src/theme/components/ArticleView.svelte -->
  <script lang="ts">
    import type { EntryData, ResolvedReference } from '@glw907/cairn-cms/delivery';

    let { data }: {
      data: EntryData & { references: Record<string, ResolvedReference | ResolvedReference[]> };
    } = $props();

    const author = $derived(data.references.author as ResolvedReference | undefined);
    const related = $derived((data.references.related as ResolvedReference[] | undefined) ?? []);
  </script>

  {#if author}
    <p>By <a href={author.permalink}>{author.title}</a></p>
  {/if}
  {@html data.html}
  {#if related.length}
    <ul>
      {#each related as ref (ref.concept + '/' + ref.id)}
        <li><a href={ref.permalink}>{ref.title}</a></li>
      {/each}
    </ul>
  {/if}
  ```

On the tutorial's site, the same script lines and markup go in `src/routes/[...path]/+page.svelte`,
beside `{@html data.html}`. The `summary` member is optional, so a template that shows it checks for
it first. The [Types](../reference/delivery-data.md#types) table lists every `ResolvedReference`
member.

Next, check the rendered link on the published page.

## Verify the rendered link

On the published page of a post with references set, each resolved target renders as a link to its
permalink.

To verify the link, follow these steps:

1. In the admin, open the post you set references on in
   [Pick a target in the editor](#pick-a-target-in-the-editor).
2. Publish the post.
3. After the deploy, open the post's public page, and confirm that the author's title is a link.
4. On the same page, confirm that each related post's title is a link.
5. On the same page, select the author link, and confirm that the author's page opens at its
   permalink.

If a check fails, see [Diagnose a failed check](#diagnose-a-failed-check).

The next two sections cover what keeps each link pointing at a real entry.

## The build's reference check

Once a post is published, the build stops on a reference to a missing entry: the `cairnManifest`
plugin runs `verifyReferences`, which fails the build and names the source entry, the field, and the
missing target.

Each manifest entry records its outbound references in `references`, one `{ field, concept, id }`
edge for each, and `verifyReferences` checks that every edge's target exists. The plugin runs it
right after `verifyManifest`, and a site that builds with the plugin makes no separate call. A
dangling reference that reaches the build fails it. The route in
[Resolve the targets on the entry route](#resolve-the-targets-on-the-entry-route) can therefore drop
an unresolved id instead of throwing. The
[Manifest format, parse, and verify](../reference/core.md#manifest-format-parse-and-verify) entry
documents `verifyReferences`.

Before a change reaches the build, the admin checks it too.

## The admin's reference guards

The admin checks references at three points in an entry's life. A save with a bad target only warns,
while a delete or rename that would strand a reference refuses.

A save whose `reference` field names a missing or still-draft target commits with a warning. A body
`cairn:` link to a missing target refuses the save outright. A reference target still missing when
the post publishes then fails the build.

A delete reads inbound `cairn:` body links from the published manifest. It reads inbound reference
edges from a cross-branch index built over that manifest and every open `cairn/*` branch. A delete
runs its checks in this order:

1. Inbound body links, which refuse the delete with status 409 and
   `Cannot delete <id>: N pages link to it.`
2. The strict cross-branch reference index, which refuses with status 503 when it cannot be built,
   rather than counting the references as absent.
3. Inbound reference edges, which refuse with status 409 and
   `Cannot delete <id>: N entries reference it.`, listing each referencing entry's concept, id,
   title, and permalink.

Deleting a fragment runs the same action with one more check, for includes.
[Reuse content across entries](reuse-content-across-entries.md) covers that check.

A reference held in an unpublished draft still counts. It blocks the delete or rename of its target
even though nothing about the reference is live yet.

A rename refuses, naming the blocking entries, when an open branch other than the one the entry is on
holds an inbound reference. Otherwise, it rewrites each referencing entry's stored id by splicing in the
new id, and no other byte of the frontmatter changes.
[Renames](content-model.md#renames) in Content model covers the rest of what a rename refuses and
rewrites.

Next, compare a reference with a link written in an entry's body.

## `cairn:` body links and reference fields

A link from a frontmatter field takes a reference, because a `cairn:` token is live only as an inline
link in an entry's body.

As an inline markdown link in an entry's body, a `cairn:` token is resolved, counted in the
manifest's link graph, and checked by the build. Elsewhere the token stays inert, and none of the
following places fails the build:

- A raw HTML anchor, where it survives as a literal `cairn:` href.
- A reference-style link definition, where it survives as a literal `cairn:` href.
- A component attribute, where the engine never rewrites it.
- Frontmatter, where the engine never rewrites it.

A body link to a draft entry resolves to that entry's permalink, so the build succeeds and the
published link points at a 404 until the target publishes. A body link whose target is missing
renders marked broken in the editor preview, with the class `cairn-broken-link` and its text kept,
and it fails the build's render. A missing reference target is instead dropped from the resolved map
with no mark. [The content manifest](content-model.md#the-content-manifest) in Content model
describes how the manifest records both kinds of edge.

## Diagnose a failed check

A failed check traces to the field's declared concept, to the reference's target, or to the route and
template that resolve and render it.

If startup, the build, or a check in [Verify the rendered link](#verify-the-rendered-link) fails,
work through the following causes in order:

1. Composing the site's content runtime fails with an error naming a concept, a field, and an
   undeclared target. The field's `concept` names no concept under `content`. Fix the name or
   declare the concept, as [Declare a reference field](#declare-a-reference-field) shows.
2. The build fails with an error naming a source entry, a field, and a missing target. A published
   reference points at an entry that no longer exists or never did. In the admin, pick an existing
   target for that field, or restore the target entry.
   [The build's reference check](#the-builds-reference-check) describes the check.
3. The published page shows no link where a reference is set. The route returns no `references` map,
   the template reads another key, or the target has no live entry and was dropped. Compare your code
   with [Resolve the targets on the entry route](#resolve-the-targets-on-the-entry-route) and
   [Render each target as a link](#render-each-target-as-a-link).

## See also

The following pages and reference entries cover the pieces this page links to:

- [Content model](content-model.md) covers concepts, the content manifest, and renames.
- [Reuse content across entries](reuse-content-across-entries.md) covers fragments, the include
  directive, and the delete guard a fragment shares with a reference target.
- [Define an adapter and schema](define-an-adapter-and-schema.md) covers declaring the concept a
  reference targets.
- [`resolveReferences`](../reference/delivery-data.md#resolvereferences) documents the resolver and
  `ResolvedReference`.
- [Manifest format, parse, and verify](../reference/core.md#manifest-format-parse-and-verify)
  documents `verifyReferences`.
- [`cairnManifest`](../reference/vite.md#cairnmanifest) documents the build plugin.
