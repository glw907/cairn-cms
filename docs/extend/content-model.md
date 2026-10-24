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

- Concepts and what one declaration gives a site
- The fieldset and its builders
- Field options with unexpected behavior
- Containers
- Save-time validation
- The frontmatter keys the engine reads
- Entry identity
- Routing
- Address collisions
- The content manifest
- Renames

The page assumes familiarity with TypeScript literal types and inference, YAML frontmatter at the head of a markdown file, JavaScript regular expressions, and HTML form input attributes. If you're new to the adapter, read [Architecture](architecture.md) first to see where the content map sits among its seams.

The following subjects are documented on other pages:

- Writing the adapter and a concept's declaration, including permalinks, date prefixes, tags, and custom validation hooks, in [Define an adapter and schema](define-an-adapter-and-schema.md)
- Reference fields and internal links between entries in use, in [Link content with references](link-content-with-references.md)
- Fragments and the include directive, in [Reuse content across entries](reuse-content-across-entries.md)
- Rendering an entry's body, in [Configure rendering](configure-rendering.md)

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

The posts and pages concepts a scaffolded site starts with are declarations like this one in its adapter. Neither name is reserved, and a site may rename them, remove them, or declare other concepts beside them. Some scaffold code reads a concept by its id. The scaffold's feed, for example, reads the `posts` concept, and a site that renames a scaffolded concept updates that code too.

Two engine conveniences also key on the literal ids. A concept's default permalink is `/<id>/:slug`, except for the concept with the id `pages`, whose default is `/:slug`. The admin's getting-started checklist looks for entries in `posts` and `pages`.

One concept declaration gives a site the following:

- An admin list and an editor for the concept's entries
- A form, a save-time validator, and a TypeScript type, each derived from the fieldset
- A public page for each entry, unless the concept's routing is `'embedded'`
- A row for each entry in the committed content manifest

For the full signature, see [`defineConcept`](../reference/core.md#defineconcept).

## The fieldset

A concept's fieldset is the one place its fields are declared, and the engine derives the editor's form, the save-time validator, and the TypeScript type of the site's entries from it. No separate schema language exists, so the three cannot drift apart.

The `fields` namespace has fifteen builders, in two groups:

- Thirteen leaves: `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`, `image`, and `reference`
- Two containers: `object` and `array`

`FieldDescriptor` is a closed union of those fifteen types. The engine exposes no seam to register another field type, and a shape outside them is modeled with the existing builders.

[Link content with references](link-content-with-references.md) covers the `reference` builder in use. For each builder's options, see the [Fields](../reference/core.md#fields) table in the core reference.

## Field options

Each builder takes the four base options `label`, `help`, `required`, and `default`. Of the four, `label` is optional only on an `object`.

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

An `object`'s `fields` record holds its leaf fields, keyed by frontmatter sub-key, and the object stores them as one nested object. An optional `object` whose leaves are all empty omits its key. An `object`'s `label` is optional. A top-level `object` with no `label` takes its group legend from the humanized key, so `social_card` reads as **Social card**. An `object` inside an `array` is labeled by the `array`.

An `array`'s `item` is the descriptor every element conforms to, and the array stores its value as a list. An optional empty list omits its key, and a required empty list fails the save. An `array` of `reference` items stores a list of entry ids.

Each of the following declarations throws when the adapter module loads:

- An `array` whose item is another `array`
- An `object` that holds an `object` or an `array`
- A `reference` inside an `object`, whose error advises modeling it as the parent's own concept or using a top-level `array` of references
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

## Save-time validation

A malformed `pattern`, a container nested too deep, or a dotted key throws when the adapter module loads. A value that breaks a declared rule passes declaration and is refused at the save.

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
- `description`, `image`, `robots`, and `author` are the SEO head fields the public route factory reads, each as a non-empty string. A key the fieldset does not declare never reaches the head.

An entry's date is the one part of its identity that comes from frontmatter rather than from its filename.

## Entry identity

An entry's id is its markdown filename without `.md`, and the file sits directly in the concept's `dir` at `${dir}/${id}.md`. The engine uses `dir` verbatim and never validates it. A `dir` stays repo-relative with no leading or trailing slash, and entries never sit in subfolders.

In a dated concept, the filename also carries a leading date, and the URL slug strips only that prefix. The following example shows one dated entry's file, id, and slug:

- The file is `2026-08-14-my-post.md` in the posts concept's `dir`.
- The id is `2026-08-14-my-post`.
- The slug is `my-post`.

The filename's date prefix only feeds the slug. The entry's date comes from its `date` field. A dated permalink resolves its date tokens from that field, which makes `date` required.

An entry created in the admin takes its filename prefix from the date picked in the create dialog, cut to the concept's `datePrefix`. The create dialog also seeds that date into the entry's `date` field, so the two agree to the prefix's granularity. Neither a save nor a rename changes the prefix afterward, and a later edit to the `date` field can leave the two different.

Ids are lowercase ASCII letters, digits, and single hyphens. When `slugify` derives an id from a title, a title in a non-Latin script becomes an empty address, which the create action refuses. An accented letter becomes a separator rather than a transliteration: `résumé` becomes `r-sum`.

For date-prefix granularity and the permalink tokens, see [Define an adapter and schema](define-an-adapter-and-schema.md).

## Routing

A concept's `routing` shorthand decides whether its entries get public pages and whether they are dated. The shorthand is `'page'`, `'feed'`, or `'embedded'`, and a concept that omits it gets `'page'`.

The following table sets out what each shorthand does and the content it suits:

| Shorthand | Effect on each entry | What it suits |
| --- | --- | --- |
| `'page'` | A routable, undated permalink and a sitemap entry | Standalone pages |
| `'feed'` | A routable permalink that may use the date tokens, in an index sorted newest first | Chronological content |
| `'embedded'` | No public page and no sitemap entry | A concept whose entries only other entries read, such as fragments |

Which entries reach an RSS or JSON feed is up to the site's feed route. The engine serializes the items a site passes it, and the scaffold's feed reads the `posts` concept by its id.

An `'embedded'` concept keeps a directory, fields, and an admin list and editor. The admin labels its entries' identifier **Name** rather than **Address**, and its editor offers **Rename** rather than **Change URL**.

For more information, see [`defineConcept`](../reference/core.md#defineconcept).

## Address collisions

When another published entry on `main` already resolves to the same permalink, the edit page shows a warn-only `address-collision` advisory. A publish rechecks against `main` and every open `cairn/*` branch, and when a collision remains it logs `publish.address_collided` after the publish lands. Neither check blocks a save or a publish, and both fail open: a check that cannot run lets the save or publish go ahead.

Once both entries are on `main` and neither is a draft, building the site's content indexes throws on the duplicate permalink and fails the build.

For the fields the log record carries, see [Log events](../reference/log-events.md).

## The content manifest

The files in git stay the source of truth for content, and the committed content manifest summarizes them with one row per entry. Admin code reads the content graph from the manifest instead of reading GitHub entry by entry.

A row records the following about its entry:

- Its id, concept, title, date, and permalink
- Its summary and its draft flag
- Its outbound `cairn:` links, the internal links its body makes to other entries
- Its media refs, reference-field edges, tags, included fragments, and first-publish stamp, when it has them

A save to the entry's pending branch commits no manifest change, and a publish patches the entry's row in the same commit as the content change. The `cairnManifest` Vite plugin rebuilds the manifest from the files when a build or the dev server starts, and a committed file that has drifted fails the build. Running `cairn-manifest` writes a regenerated file, and the scaffold wires it as its `cairn:manifest` script.

A `reference` field holds a typed `{ concept, id }` pointer. The manifest records each entry's outbound reference edges, and the engine reads from them which entries point at a given entry.

For the manifest's format and functions, see [Content and manifest](../reference/core.md#content-and-manifest) in the core reference. For reference fields in use, see [Link content with references](link-content-with-references.md).

## Renames

A rename gives the entry a new slug in one atomic commit on `main`. The commit moves the file to the new id and rewrites the inbound `cairn:` tokens that `main`'s committed manifest records. In a dated concept, the rename keeps the filename's date prefix and swaps only the slug. The same commit repoints the published reference fields that point at the entry.

The engine refuses a rename with a 409 when the new id collides with an existing entry or while the entry has unpublished edits. It also refuses with a 409 while another editor's open branch holds a reference to the entry, or when it can't build the reference index.

## Related resources

The following guides put the model to work:

- [Define an adapter and schema](define-an-adapter-and-schema.md): writing the adapter and a concept's declaration
- [Link content with references](link-content-with-references.md): reference fields and internal links in use
- [Reuse content across entries](reuse-content-across-entries.md): fragments and the include directive
- [Configure rendering](configure-rendering.md): rendering an entry's body

The following pages place the content model in the wider system:

- [Architecture](architecture.md): the adapter and its seams
- [Scaffolded site files](scaffolded-site-files.md): the files a scaffolded site starts with

The following external pages document the platform behavior the model builds on:

- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) in the TypeScript handbook
- [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) on MDN
- [The HTML pattern attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern) on MDN
- [Timestamp Language-Independent Type](https://yaml.org/type/timestamp.html) in the YAML type repository
