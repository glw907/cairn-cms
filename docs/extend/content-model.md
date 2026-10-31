# Content model

An entry an editor opens in a cairn site's admin is a markdown file in the site's repository, and each entry belongs to a concept. A concept is one entry in the adapter's `content` map, and it declares a directory of those files and a fieldset that describes their frontmatter. The posts and pages concepts a scaffolded site starts with are declarations of this kind, not concepts the engine builds in.

The fieldset is the one place a field is declared. An admin save writes frontmatter back from the validator's output, and a key the fieldset does not declare is dropped at the entry's first save. The files in git stay the source of truth for content. A committed content manifest summarizes them, and admin code reads the content graph from it instead of reading GitHub entry by entry.

One concept declaration decides the form editors fill in, the checks a save runs before anything is committed, and the TypeScript type of entries in the site's SvelteKit code. It also decides whether an entry gets a public address and what the manifest records about it.

Developers come to the model for several reasons:

- A developer about to declare a concept learns what the engine refuses at module load and at an editor's save.
- A developer who inherits a scaffolded site learns what its posts and pages concepts are and what a dated filename such as `2026-08-14-my-post.md` means.
- A developer weighing cairn for an organization's content learns its limits: a closed set of field builders, and containers nested one level deep.
- A developer moving existing markdown into cairn, or tracing a frontmatter key lost at an editor's save, learns the id, date, and frontmatter rules.

Several builder options share a name with an HTML input attribute but behave differently. For example, `pattern` matches anywhere in the value, but the HTML attribute of that name must match the whole value.

This page covers the following subjects, in order:

- Concepts
- The fieldset
- Field options
- Containers
- Reference fields
- Save-time validation
- Frontmatter keys the engine reads
- Entry identity
- Routing
- Fragments
- Address collisions
- The content manifest
- Renames

The page assumes familiarity with TypeScript literal types and inference, YAML frontmatter at the head of a markdown file, JavaScript regular expressions, and HTML form input attributes. If you're new to the adapter, read [Architecture](architecture.md) first to see where the content map sits among its seams.

The following subjects are documented on other pages:

- Writing the adapter and a concept's declaration, including permalinks, date prefixes, tags, and custom validation hooks, in [Define an adapter and schema](define-an-adapter-and-schema.md)
- Rendering an entry's body, in [Write a markdown component](write-a-markdown-component.md)

## Concepts

Declaring a concept in the adapter's `content` map gives a site one kind of content: a repository directory of markdown entries, described by a fieldset, with optional routing and URL policy. On a scaffolded site, the adapter is `src/theme/cairn.config.ts`. The scaffold wraps each concept in `defineConcept`, which keeps the fieldset's type for typed reads and checks the URL policy when the module loads.

The following excerpt declares an `events` concept with a `dir`, `routing: 'page'`, a required `title` text field, and a `date` field:

```ts
// src/theme/cairn.config.ts (excerpt)
import { defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

export const events = defineConcept({
  dir: 'src/content/events',
  label: 'Events',
  singular: 'event',
  routing: 'page',
  fields: defineFieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
  }),
});
```

One entry in that concept is the file `spring-open-house.md` in the concept's `dir`. Its frontmatter keys match the fieldset, and its filename stem `spring-open-house` is the entry's id. The file holds the following:

```markdown
---
title: Spring open house
date: 2026-05-02
---

Visitors are welcome to tour the space.
```

Neither scaffolded concept is reserved: a site may rename `posts` or `pages`, remove them, or declare other concepts beside them. Some scaffold code reads a concept by its id. The scaffold's feed, for example, reads the `posts` concept, and a site that renames a scaffolded concept updates that code too.

Some engine conveniences also key on the literal ids. A concept's default permalink is `/<id>/:slug`, except for the concept with the id `pages`, whose default is `/:slug`. The admin's getting-started checklist looks for entries in `posts` and `pages`. The entry picker and the editor's `[[` link autocomplete list `pages` entries first and `posts` second.

One concept declaration gives a site the following:

- An admin list and an editor for the concept's entries
- A form, a save-time validator, and a TypeScript type, each derived from the fieldset
- A public page for each non-draft entry, unless the concept's routing is `'embedded'`
- A row for each entry in the committed content manifest

For the full signature, see [`defineConcept`](../reference/core.md#defineconcept).

## The fieldset

The engine derives the editor's form, the save-time validator, and the TypeScript type of the site's entries from the concept's fieldset. Because no separate schema language exists, the form, the validator, and the type cannot drift apart.

The `fields` namespace has fifteen builders, in two groups:

- Thirteen leaves: `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`, `image`, and `reference`
- Two containers: `object` and `array`

`FieldDescriptor` is a closed union of those fifteen types. The engine exposes no seam to register another field type, and a shape outside them is modeled with the existing builders.

[Reference fields](#reference-fields) covers the `reference` builder in use. For each builder's options, see the [Fields](../reference/core.md#fields) table in the core reference.

## Field options

Each builder takes the four base options `label`, `help`, `required`, and `default`. Of the four, `label` is optional only on an `object`. An `array` can omit it only by omitting its whole options argument, since `fields.array(item, options)` requires `label` whenever `options` is passed.

The following options behave in ways their names alone do not predict:

- `pattern` on `text` and `textarea` compiles when `defineFieldset` runs. A malformed pattern throws at declaration.
- A save tests `pattern` unanchored and with no flags. Unlike the HTML attribute, it needs an explicit `^` and `$` to match the whole value.
- `default` prefills only a new entry's create form, never an existing or hand-written file. A `date` field's `'today'` default resolves to the current UTC date.
- `creatable` on a `multiselect` that sets `options` changes the control to a tag input. A value outside `options` still fails the save.
- `min` and `max` on a `date` field are enforced at the save but never rendered on the input. On a `datetime` field, neither the save nor the form enforces them.

The `text` and `textarea` constraints (`min`, `max`, `length`, and `pattern`) and the `date` bounds never render as input attributes. The form therefore accepts a value that the save then refuses.

The `url` and `datetime` builders also restrict or convert a value with no option involved. A `url` field accepts only an absolute `http://` or `https://` URL with no whitespace. A root-relative path or a `mailto:` value fails the save.

A `datetime` field keeps a quoted string as written. YAML parses an unquoted full ISO timestamp into a `Date`, and the field converts that `Date` to a zoneless `YYYY-MM-DDTHH:mm` string read in UTC. The conversion drops the seconds and the offset.

For every option each builder takes, see the [Fields](../reference/core.md#fields) table in the core reference.

## Containers

`object` and `array` are the two container builders, and each nests one level: an `object` holds leaf fields, and an `array` holds one leaf or a flat `object` of leaves.

An `object`'s `fields` record holds its leaf fields, keyed by frontmatter sub-key, and the object stores them as one nested object. When an optional `object`'s leaves are all empty, the key is omitted. Without a `label`, a top-level `object` takes its group legend from the humanized key: `social_card` reads as **Social card**. Inside an `array`, the `array`'s label serves.

An `array`'s `item` is the descriptor every element conforms to, and the array stores its value as a list. An optional empty list omits its key, and a required empty list fails the save. An `array` of `reference` items stores a list of entry ids.

Each of the following declarations throws when the adapter module loads:

- An `array` whose item is another `array`
- An `object` that holds an `object` or an `array`
- A `reference` inside an `object`, whose error advises a top-level `array` of references or a separate concept for the parent
- A field key that contains a dot, at the top level or inside a container

The dot rule exists because the engine addresses a nested field by a dotted path.

The following fieldset declares an `array` whose item is another `array`, and the call throws when the module loads:

<!-- snippet-check-skip: illustrates a declaration that throws by design -->
```ts
import { defineFieldset, fields } from '@glw907/cairn-cms';

// Throws when the module loads: an array's item must be a leaf or a flat object.
const schedule = defineFieldset({
  sessions: fields.array(fields.array(fields.text({ label: 'Room' })), { label: 'Sessions' }),
});
```

For more information, see the [`fields`](../reference/core.md#fields-1) entry in the core reference.

## Reference fields

A `reference` field stores the id of one entry, typed to the concept its `concept` option names, and `fields.array(fields.reference(...))` stores a list of ids. The frontmatter holds the id alone, because the engine takes the edge's concept from the declaration. Editors choose the target from a picker scoped to that concept. On the public site, a route resolves each id and a template renders a link whose text and address come from the target's `title` and `permalink`.

The site writes the two ends of a reference: the adapter declares the field, and a Svelte component renders the link. The engine supplies the picker, records each reference as an edge in the content manifest, and resolves the id for the route.

### Declare a reference field

A scaffolded site's posts concept already declares the two fields this section follows, an `author` that names one `pages` entry and a `related` list of other posts:

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

Beyond the base options, a reference needs only `concept`. A `concept` that names no concept declared under `content` makes `normalizeConcepts` throw when the engine composes the site's content runtime. The error names the concept, the field, and the undeclared target. On the site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) builds, which declares only `posts`, `author` throws until the site declares a `pages` concept.

After a save, a post's frontmatter holds the target ids alone:

```yaml
# <post>.md, frontmatter excerpt
author: <page-id>
related:
  - <post-id>
  - <post-id>
```

### Resolve the targets on the entry route

`resolveReferences` returns an entry's references keyed by field name: one `ResolvedReference` for a `reference` field, and a list in edge order for an `array(reference)`. It takes the site resolver, the entry's concept descriptor from `buildSiteDescriptors`, and the entry's frontmatter. The [`resolveReferences`](../reference/delivery-data.md#resolvereferences) and [`buildSiteDescriptors`](../reference/delivery-data.md#buildsitedescriptors) entries document both calls.

On a scaffolded site, `withReferences` in `src/chassis/entry-data.ts` makes this call for every entry and adds the result as `data.references`. The public entry route and the preview route both apply it, and a concept with no reference fields gets an empty map. A reference field added to any concept reaches the template with no route change.

On the tutorial's site, return the entry data with a `references` map that `resolveReferences` builds:

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

`resolveReferences` drops an id with no live target rather than throwing. A single reference's key can then be absent, and a list can hold fewer targets than the stored ids, so the template guards both. A resolved target can also be a draft or an entry of an `'embedded'` concept, and its permalink then serves no public page.

A `ResolvedReference` carries the target's `id`, `concept`, `title`, `permalink`, and an optional `summary`. In the entry's page component, read `data.references.author` as one `ResolvedReference` and `data.references.related` as a list, and render each as a link. The scaffold's `src/theme/components/ArticleView.svelte` does this. The [Types](../reference/delivery-data.md#types) table lists every `ResolvedReference` member.

### Reference guards

The build and the admin check references so that a link points at a real entry. A save with a bad target warns, while a build, a delete, or a rename that would strand a reference refuses.

Once a post is published, the `cairnManifest` plugin runs `verifyReferences` right after `verifyManifest`. It fails the build, naming the source entry, the field, and the missing target. The route can therefore drop an unresolved id instead of throwing. The [Manifest format, parse, and verify](../reference/core.md#manifest-format-parse-and-verify) entry documents `verifyReferences`.

A save whose `reference` field names a missing or still-draft target commits with a warning. A delete reads inbound `cairn:` body links from the published manifest, and it reads inbound reference edges from a cross-branch index built over that manifest and every open `cairn/*` branch. A delete runs its checks in this order:

1. Inbound body links refuse the delete with status 409 and `Cannot delete <id>: N pages link to it.`
2. A cross-branch reference index that cannot be built refuses with status 503, rather than counting the references as absent.
3. Inbound reference edges refuse with status 409 and `Cannot delete <id>: N entries reference it.`, listing each referencing entry's concept, id, title, and permalink.

A reference held in an unpublished draft still counts, and it blocks the delete or rename of its target. A rename refuses, naming the blocking entries, when an open branch other than the entry's branch holds an inbound reference. Otherwise it rewrites each referencing entry's stored id and changes no other byte of the frontmatter. [Renames](#renames) covers the rest of what a rename refuses and rewrites.

### `cairn:` body links and reference fields

A `cairn:` token is live only as an inline markdown link in an entry's body, so a link from a frontmatter field takes a reference. The engine resolves an inline body link, counts it in the manifest's link graph, and checks it at the build. Elsewhere the token stays inert, and none of the following places fails the build:

- A raw HTML anchor, where it survives as a literal `cairn:` href.
- A reference-style link definition, where it survives as a literal `cairn:` href.
- A component attribute, where the engine never rewrites it.
- Frontmatter, where the engine never rewrites it.

A body link to a draft entry resolves to that entry's permalink, so the build succeeds and the published link points at a 404 until the target publishes. A save refuses a body link to a target missing from `main`. At render time, a body link whose target is missing renders marked broken in the editor preview, with the class `cairn-broken-link` and its text kept, and it fails the build's render. A missing reference target is instead dropped from the resolved map with no mark. [The content manifest](#the-content-manifest) describes how the manifest records both kinds of edge.

For a failure on a reference, see [Diagnose a reference or include failure](debug-your-site.md#diagnose-a-reference-or-include-failure).

## Save-time validation

Declaration-time errors, such as a malformed `pattern` or a container nested too deep, surface when the adapter module loads. A value that breaks a declared rule passes declaration, and the save refuses it.

An admin save runs the concept's validator on the submitted values before any commit. An invalid save stops there: the editor sees the first failing message in one banner, and nothing is committed. A save writes the entry's frontmatter from the validator's output alone. A key the fieldset does not declare is therefore dropped from the file at its first admin save.

The validator also runs when the site builds its content indexes. Unless the site turns that check off with `validate: false`, a non-draft entry whose frontmatter fails the validator fails the build. That check catches a file edited outside the admin.

[Define an adapter and schema](define-an-adapter-and-schema.md) covers cross-field checks and per-field validation hooks, including what happens when a hook throws.

## Frontmatter keys the engine reads

The engine reads several frontmatter keys by literal name, and a site that wants one of them to survive an admin save declares it as a field.

The engine uses the following keys:

- `title` is the entry's title, and an entry without one falls back to its id.
- `date` is the entry's date, which a dated permalink's tokens resolve from.
- `updated` sets the sitemap's `lastmod` and the modified time in the entry page's SEO head. Only a JSON Feed item carries it, as `date_modified`, and only when the site's feed route passes it. The scaffold's feed doesn't pass it, and the RSS feed never carries it.
- `description` is the entry's excerpt.
- `draft` set to `true` keeps the entry out of a concept index's default listings and out of the sitemap. A boolean field named `draft` is the edit page's **Hidden** toggle.
- `description`, `image`, `robots`, and `author` are the SEO head fields the public route factory reads, each as a non-empty string. An undeclared `image`, `robots`, or `author` never reaches the head. An undeclared `description` still becomes the entry's excerpt, which the head uses, until an admin save drops the key.

Of the facts that identify an entry, only its date comes from frontmatter rather than from its filename.

## Entry identity

An entry's id is its markdown filename without `.md`, and the file sits directly in the concept's `dir` at `${dir}/${id}.md`. The engine uses `dir` verbatim and never validates it. A `dir` must be repo-relative, with no leading or trailing slash. Entries sit directly in it, never in subfolders.

In a dated concept, the filename also carries a leading date, and the URL slug strips only that prefix. The following example shows one dated entry's file, id, and slug:

- The file is `2026-08-14-my-post.md` in the posts concept's `dir`.
- The id is `2026-08-14-my-post`.
- The slug is `my-post`.

The filename's date prefix affects only the slug, which drops it. The entry's date comes from its `date` field. A dated permalink resolves its date tokens from that field, which makes `date` required.

When an editor creates an entry in the admin, the date picked in the create dialog sets both the filename prefix, cut to the concept's `datePrefix`, and the entry's `date` field. The two start out agreeing to the prefix's granularity. Neither a save nor a rename changes the prefix afterward. A later edit to the `date` field can leave the two different.

Ids are lowercase ASCII letters, digits, and single hyphens. When `slugify` derives an id from a title, a title in a non-Latin script produces an empty id. The create action refuses an empty id. An accented letter becomes a separator rather than a transliteration: `résumé` becomes `r-sum`.

For date-prefix granularity and the permalink tokens, see [Define an adapter and schema](define-an-adapter-and-schema.md).

## Routing

A concept's `routing` shorthand decides whether its entries get public pages and whether they are dated. The shorthand is `'page'`, `'feed'`, or `'embedded'`, and a concept that omits it gets `'page'`.

The following table sets out what each shorthand does and the content it suits:

| Shorthand | Effect on each entry | What it suits |
| --- | --- | --- |
| `'page'` | A routable, undated permalink and a sitemap entry | Standalone pages |
| `'feed'` | A routable permalink that may use the date tokens, in an index sorted newest first | Chronological content |
| `'embedded'` | No public page and no sitemap entry | A concept whose entries only other entries read, such as fragments |

Which entries reach an RSS or JSON feed is up to the site's feed route. The engine serializes whatever items the site's feed route passes it.

An `'embedded'` concept keeps a directory, fields, and an admin list and editor. The admin labels its entries' identifier **Name** rather than **Address**, and its editor offers **Rename** rather than **Change URL**.

For more information, see [`defineConcept`](../reference/core.md#defineconcept).

## Fragments

A passage that several entries share, such as a safety notice, can live in one file instead of a copy in each entry. That file is a fragment, an entry of the reserved `fragments` concept, and any entry pulls one into its body with `::include{fragment="<id>"}`. A fragment has no public page and reaches a reader only inside an entry that includes it. The engine splices in the fragment's body each time that entry renders, so one edit to the fragment changes every entry that includes it.

A fragment's text is the same in every entry that includes it, and an include takes the fragment's id and nothing else. When a block should differ on each use, register a custom public component instead. [Write a markdown component](write-a-markdown-component.md) covers custom public components.

### Wire the fragments concept

A scaffolded site already declares the concept, globs its files in both places, and forwards the resolver. Four pieces make an include work, and the site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) builds adds each by hand:

1. Declare a concept under the reserved key `fragments` with `routing: 'embedded'`. Any other routing throws when the engine composes the site's content runtime: `cairn: concept "fragments" requires routing: 'embedded' (the include directive resolves against it)`.
2. Pass a glob for the fragment files to `createSiteIndexes` in the content module. Without it, the build throws an error that starts `cairn: concept "fragments" has no glob passed`.
3. Add the same glob to the `cairnManifest` plugin's `content` option. A missing entry fails silently: the plugin builds no manifest rows for the concept and neither throws nor warns.
4. Forward `resolveFragment` from the adapter's `rendering.render`, beside `resolve` and `resolveMedia`. A render that drops it publishes each include as literal text, with no error.

The following excerpt shows the declaration and the render:

<!-- snippet-check-skip: elides the tutorial's posts concept and the adapter's backend and email groups -->
```ts
// src/lib/cairn.config.ts
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
  // backend and email stay as the tutorial wrote them
  rendering: {
    render: ({ body, resolve, resolveMedia, resolveFragment }) =>
      renderMarkdown(body, { resolve, resolveMedia, resolveFragment }),
  },
});
```

The render never builds the resolver. For each public entry page, `createPublicRoutes` builds one with `createFragmentResolver` and hands it to the render, and the admin preview passes a separate one. A render path the site writes outside `createPublicRoutes` builds the resolver with [`createFragmentResolver`](../reference/delivery-data.md#createfragmentresolver). For an unknown id, or on a site with no fragments concept, that resolver throws `cairn: fragment "<id>" not found`. The [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes), [`CairnManifestOptions`](../reference/vite.md#cairnmanifestoptions), and [`SiteRender`](../reference/core.md#siterender) entries document the three calls.

### Write a fragment and include it

A fragment is a markdown file in `src/content/fragments/`, and an include names it by its id, the filename without `.md`. A fragment holds a `title` and a body:

```md
---
title: Trail safety notice
---
Check current avalanche and trail conditions before you set out, and carry the ten essentials above treeline.
```

The including entry puts the directive on a line of its own:

```md
::include{fragment="trail-safety-notice"}
```

The manifest records each entry's included fragments, so a new fragment and a new include both change it. A build fails on a manifest that has drifted from the markdown, and its error names `npx cairn-manifest`. In the admin, an editor writes the same line with the **Include a fragment** control, which appears only when the site declares a fragments concept and never while the editor edits a fragment.

### How an include resolves

The engine splices a fragment's body into the including entry before it resolves components, `cairn:` links, and `media:` references. A registered component directive, a `cairn:` link, or a `media:` reference inside a fragment resolves as if it were typed into the including entry. The engine reads the fragment's body at each render, so an edit shows in an including entry at that entry's next render. Resolution runs one pass deep, so a fragment can't include another fragment, and the engine refuses such a save with `A fragment can't include another fragment.`

### Include guards

An include whose id names no fragment fails the build, the same way a dangling `cairn:` link does: the resolver throws `cairn: fragment "<id>" not found`, and on a prerendered entry route that stops the build. An include with no `fragment` attribute never reaches the resolver, so the build doesn't catch it. The page shows a notice, and the log carries an `include.missing` record with `reason: 'empty_fragment'`.

The admin refuses to delete a fragment while a published entry still includes it. A fragment's edit screen lists the entries that include it in an **Included in** group with a count. While any entry includes the fragment, the edit screen shows a status line, ahead of a publish, that names how many including entries a publish updates. Both the guard and the list read the includes that each entry records in the content manifest. A publish updates that record and a save doesn't, so an include counts once its entry is published. A save never checks an include against the manifest, so a dangling include commits and the deploy build is the first thing that fails on it.

For a failure on an include, see [Diagnose a reference or include failure](debug-your-site.md#diagnose-a-reference-or-include-failure).

## Address collisions

When another published entry on `main` already resolves to the same permalink, the edit page shows a warn-only `address-collision` advisory. A publish rechecks against `main` and every open `cairn/*` branch, and when a collision remains it logs `publish.address_collided` after the publish lands. Neither check blocks a save or a publish, and both fail open: a check that cannot run lets the save or publish go ahead.

Once both entries are on `main`, neither is a draft, and both concepts are routable, building the site's content indexes throws on the duplicate permalink and fails the build.

For the fields the log record carries, see [Log events](../reference/log-events.md).

## The content manifest

The committed content manifest holds one row per entry, summarizing the files in git. Admin code reads the content graph from it.

A row records the following about its entry:

- Its id, concept, title, date, and permalink
- Its summary and its draft flag
- Its outbound `cairn:` links, the internal links its body makes to other entries
- Its media refs, reference-field edges, tags, included fragments, and first-publish stamp, when it has them

A save to the entry's holding branch commits no manifest change. A publish patches the entry's row in the same commit as the content change. When a build or the dev server starts, the `cairnManifest` Vite plugin rebuilds the manifest from the files. A committed file that has drifted fails the build. The `cairn-manifest` command writes a regenerated file, and the scaffold runs it as the `cairn:manifest` script.

A `reference` field holds a typed `{ concept, id }` pointer. The manifest records each entry's outbound reference edges. From those edges, the engine finds which entries point at a given entry.

For the manifest's format and functions, see [Content and manifest](../reference/core.md#content-and-manifest) in the core reference. For reference fields in use, see [Reference fields](#reference-fields).

## Renames

A rename gives the entry a new slug in one atomic commit on `main`. The commit moves the file to the new id and rewrites the inbound `cairn:` tokens that `main`'s committed manifest records. The same commit repoints the published reference fields that point at the entry. In a dated concept, the rename keeps the filename's date prefix and swaps only the slug.

The engine refuses a rename with a 409 in any of the following cases:

- The new id collides with an existing entry.
- The entry has unpublished edits.
- Another editor's open branch holds a reference to the entry.
- The engine can't build the reference index.

## Related resources

The following guides put the model to work:

- [Define an adapter and schema](define-an-adapter-and-schema.md): writing the adapter and a concept's declaration
- [Write a markdown component](write-a-markdown-component.md): rendering an entry's body

The following pages place the content model in the wider system:

- [Architecture](architecture.md): the adapter and its seams
- [Scaffolded site files](scaffolded-site-files.md): the files a scaffolded site starts with

The following external pages document the platform behavior the model builds on:

- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) in the TypeScript handbook
- [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) on MDN
- [The HTML pattern attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern) on MDN
- [Timestamp Language-Independent Type](https://yaml.org/type/timestamp.html) in the YAML type repository
