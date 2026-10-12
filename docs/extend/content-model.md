# Content model

Every entry an editor opens in a cairn site's admin is a markdown file in the site's repository. Each entry belongs to a concept. A concept is one kind of content the site declares in its adapter: a directory of markdown files and a fieldset that describes their frontmatter. The engine builds in no kind of content. The posts and pages a scaffolded site starts with are declarations in its adapter, like any concept the site adds, and neither name is reserved. Every concept takes the same shape, and the site chooses which concepts exist, with no open-ended collection model beside them.

A concept's declaration is the only place the engine learns about it. The declaration decides the form editors fill in, the checks a save runs before anything is committed, the TypeScript type the site's SvelteKit code reads entries as, whether an entry gets a public address, and what the committed content manifest records about it. A save writes back only the frontmatter keys the fieldset declares, so an undeclared key in a file disappears the first time an editor saves that entry. The markdown files remain the record of the content. An entry's filename gives it its id, and the manifest is a summary of those files that admin code reads in place of fetching each entry from GitHub.

A developer who knows the model before writing a declaration can predict what the engine refuses when the adapter module loads, such as a container nested too deep or a malformed pattern, what a save refuses, and which options behave unlike the HTML input attributes whose names they share. On a site someone else scaffolded, the model explains what the inherited posts and pages concepts are and what a dated filename means. Markdown moved in from another system has to meet the id, date, and frontmatter-key rules the model sets. For a developer weighing cairn against alternatives, the model also marks its limits: a fixed set of field builders with no seam for another type, and containers that nest one level deep. A reader following internal links between entries finds how the manifest records them and how a rename rewrites them in one commit.

The following subjects make up the content model:

- What a concept is and what declaring one gives a site
- The fieldset, its builders, the options that behave unexpectedly, and the two containers
- How a save validates
- The frontmatter keys the engine reads
- How an entry is identified and routed, and what happens when two entries share an address
- The content manifest
- Renames

Working with the model takes familiarity with TypeScript literal types and inference, YAML frontmatter at the head of a markdown file, JavaScript regular expressions, and HTML form input attributes. If you're new to the adapter, read [Architecture](architecture.md) first for where the content map sits among its seams.

Four neighboring subjects are documented elsewhere:

- Writing the adapter and a concept's declaration, in [Define an adapter and schema](define-an-adapter-and-schema.md)
- Reference fields and internal links between entries in use, in [Link content with references](link-content-with-references.md)
- Fragments and the include directive, in [Reuse content across entries](reuse-content-across-entries.md)
- Rendering an entry's body, in [Configure rendering](configure-rendering.md)

## Concepts

Declaring a concept in the adapter's `content` map grants a site one kind of content: a repository directory of markdown entries, described by a fieldset. Each concept is a `defineConcept` call that names its `dir` and its `fields`, and it may add a routing shorthand and a URL policy. The adapter module is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) builds.

The following declaration adds an `events` concept to a scaffolded site's adapter:

```ts
// src/theme/cairn.config.ts, on a scaffolded site
import { defineConcept, defineFieldset, fields } from '@glw907/cairn-cms';

// The adapter's content map lists this concept beside the scaffold's: content: { posts, pages, fragments, events }
export const events = defineConcept({
  dir: 'src/content/events',
  routing: 'page',
  fields: defineFieldset({
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Date' }),
  }),
});
```

One entry in that concept is a file in its `dir`, with frontmatter that matches the fieldset:

```md
---
# open-house.md, in the events concept's dir
title: Open house
date: 2026-11-07
---
The building is open to visitors all afternoon.
```

The posts and pages concepts a scaffolded site starts with are declared the same way. Neither name is reserved, so a site may rename them, remove them, or declare more concepts beside them.

One declaration gives the site the following:

- An admin list and an edit page for the concept's entries
- A form, a save-time validator, and a TypeScript type, all derived from the fieldset
- A public page for each entry, unless the routing shorthand is `'embedded'`
- A row for each entry in the committed content manifest

The [`defineConcept`](../reference/core.md#defineconcept) entry gives the signature and the checks the engine runs on a URL policy at declaration. The fieldset is the half of a concept that a site writes field by field.

## The fieldset

A concept's fieldset is the only place its fields are declared, and the engine derives the edit page's form, the save-time validator, and the TypeScript type of the concept's entries from it. No separate schema language exists, so the three cannot drift apart.

A fieldset draws on fifteen field builders, in two groups:

- Thirteen leaf builders: `text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`, `image`, and `reference`
- Two container builders that hold other fields: `object` and `array`

`FieldDescriptor` is a closed union of those fifteen types, and the engine exposes no seam to register another. A site models any other shape with the builders that exist. The [Fields](../reference/core.md#fields) table in the reference records what each builder renders as and what it validates. [Link content with references](link-content-with-references.md) covers the `reference` builder in use. Each builder takes options that shape its input and the checks a save runs.

## Field options

Every builder takes four base options, `label`, `help`, `required`, and `default`, and a few options behave in ways their names alone do not predict. For the options specific to each builder and what each one does, see the [Fields](../reference/core.md#fields) table in the reference.

The following options carry those edges:

- `pattern` on `text` and `textarea` compiles when `defineFieldset` runs, and a malformed pattern throws at declaration. The save tests it unanchored and with no flags, so matching a whole value takes an explicit `^` and `$`.
- `default` on any builder prefills only a new entry's create form, never an existing or hand-written file. A `date` field's `'today'` default resolves to the current UTC date.
- `creatable` on a `multiselect` that sets `options` changes the control to a tag input, and a value outside `options` still fails the save.
- `min` and `max` on a `date` field are enforced at save and never rendered on the input. On a `datetime` field, neither the save nor the form enforces them.

The `text`, `textarea`, and `date` constraints never render as input attributes, so the form accepts a value that the save then refuses.

Two builders check a value with no option involved. A `url` field accepts only an absolute `http://` or `https://` URL with no whitespace, and a root-relative path or a `mailto:` value fails the save. A `datetime` field keeps a quoted string as written. When YAML parses an unquoted full ISO timestamp into a `Date`, the field converts it to a zoneless `YYYY-MM-DDTHH:mm` string read in UTC, dropping the seconds and the offset. Unlike the leaf builders, the two containers hold other fields rather than a single value.

## Containers

`object` and `array` are the two container builders, and each nests one level: an `object` holds leaf fields, and an `array` holds one leaf or a flat `object` of leaves.

An `object` stores its `fields` as one nested object under its key, each leaf keyed by its frontmatter sub-key. An optional `object` whose leaves are all empty omits its key. The `label` of an `object` is optional. A top-level `object` with no `label` falls back to the humanized key, so `social_card` reads as **Social card**, and an `object` inside an `array` takes its label from the `array`.

An `array` stores a list, and every element conforms to its `item` descriptor. An optional empty list omits its key, a required empty list fails the save, and an `array` of `reference` items stores a list of entry ids.

Each of the following declarations throws when the adapter module loads:

- An `array` whose item is another `array`
- An `object` that holds an `object` or an `array`
- A `reference` inside an `object`, with an error that advises modeling it as the parent's own concept or using a top-level `array` of references
- A field key with a dot in it, at any level, since the engine addresses a nested field by a dotted path

The following fieldset declares an `array` of arrays and throws when the module loads:

<!-- snippet-check-skip: throws by design at the defineFieldset call, shown to mark the nesting boundary -->
```ts
import { defineFieldset, fields } from '@glw907/cairn-cms';

// Throws when the module loads: an array's item cannot be another array.
export const schedule = defineFieldset({
  slots: fields.array(fields.array(fields.text({ label: 'Time' })), { label: 'Slots' }),
});
```

The [`fields`](../reference/core.md#fields-1) entry in the reference shows a working container declaration. The fieldset's rules meet an editor's values at the save.

## Save-time validation

An admin save runs the concept's validator on the submitted values before any commit, and an invalid save stops there: the editor sees the first failing message in one banner, and nothing reaches the repository. Declaration-time refusals come earlier, when the adapter module loads, and a malformed `pattern` or a container nested too deep never reaches a save. Cross-field checks and per-field behavior hooks are part of the declaration, and [Define an adapter and schema](define-an-adapter-and-schema.md) covers them. Some of the keys a fieldset declares matter to the engine as well as to the form.

## Frontmatter keys the engine reads

The engine reads five frontmatter keys by literal name, and a site that wants one of them to survive an admin save declares it as a field.

Each of the five keys feeds an engine behavior:

- `title` is the entry's title, and the engine falls back to the id when it is absent.
- `date` is the entry's date, which dated permalinks and templates use.
- `updated` sets the sitemap's `lastmod` and the feed's modified date.
- `description` is the entry's excerpt.
- `draft`, declared as a boolean field, is what the edit page renders as its **Hidden** toggle.

An entry's date is the one part of its identity that comes from frontmatter rather than from its filename.

## Entry identity

An entry's id is its markdown filename without `.md`, and the file sits directly in the concept's `dir` at `${dir}/${id}.md`. The engine uses `dir` verbatim and never validates it, so the declaration must give a repo-relative path with no leading or trailing slash. Entries never sit in subfolders. A dated concept's filename also carries a leading date, and the URL slug strips only that prefix.

For example, one post on a scaffolded site resolves as follows:

- The file is `2026-08-14-my-post.md` in the posts concept's `dir`.
- The id is `2026-08-14-my-post`.
- The slug is `my-post`.

The filename's date prefix feeds only the slug. The entry's date always comes from its `date` field, so a dated permalink makes `date` structurally required. Define an adapter and schema covers date-prefix granularity and the permalink tokens.

Entry ids are lowercase ASCII letters, digits, and single hyphens. When the create action derives an id from a title, a title in a non-Latin script yields an empty id, which the action refuses. An accented letter becomes a separator rather than a transliteration: `résumé` becomes `r-sum`. The concept's routing decides what the public site does with the slug.

## Routing

A concept's `routing` shorthand decides whether its entries get public pages and whether they are dated, and `'page'` is the default when a concept omits it.

The following table sets out what each shorthand turns on or off and the content it suits:

| Shorthand | What it turns on or off | What it suits |
| --- | --- | --- |
| `'page'` | Routable and undated, with each entry in the sitemap | Standalone pages |
| `'feed'` | Routable and dated, with entries in feeds, an archive, and the sitemap | Dated, chronological content |
| `'embedded'` | Not routable, with no permalink, and never listed or prerendered | A reference-only concept such as `authors` |

An `'embedded'` concept still has its directory, its fields, and its admin list and edit page. The [`defineConcept`](../reference/core.md#defineconcept) entry gives the default permalink for each concept. A routable entry's permalink can match another entry's.

## Address collisions

When another published entry already resolves to the same permalink, the edit page shows a warn-only `address-collision` advisory, and a publish rechecks and logs the collision without blocking. The edit page checks only published entries on `main`. The publish recheck also covers every open `cairn/*` holding branch, and when a collision remains, it logs `publish.address_collided` after the publish lands. A check that cannot run lets the save or the publish proceed. The [Log events](../reference/log-events.md) reference lists the fields the `publish.address_collided` record carries. An entry's address is one of the routing facts the content manifest keeps for every entry.

## The content manifest

The files in git stay the source of truth for content, and the committed content manifest summarizes them, one row per entry, so request-time admin code reads the content graph without crawling GitHub entry by entry.

Each row records the following about one entry:

- Its identity
- Its routing facts
- Its outbound `cairn:` links, the internal links its body makes to other entries
- Its reference-field edges
- Its tags
- Its included fragments

A build regenerates and verifies the manifest. A publish, not a save, patches the changed entry's row in the same commit as the content change. The manifest's format and verify functions are in [Content and manifest](../reference/core.md#content-and-manifest) in the reference. Inbound links matter most when an entry changes its id.

## Renames

A rename moves the entry's file to a new id, which changes its slug, and rewrites every inbound `cairn:` token in the same atomic commit on `main`. The engine refuses a rename with a 409 in several cases, including a new id that collides with an existing entry and an entry that has pending edits. Link content with references covers how a rename treats the reference fields that point at an entry.

A concept's form, its save-time checks, the type of its entries, their public addresses, and their manifest rows all come from its one declaration in the adapter.

## Related resources

The following guides put the model to work.

- [Define an adapter and schema](define-an-adapter-and-schema.md): writing the declaration
- [Link content with references](link-content-with-references.md): reference fields in use
- [Reuse content across entries](reuse-content-across-entries.md): fragments
- [Configure rendering](configure-rendering.md): rendering an entry's body

The following pages place the content model in the wider system.

- [Architecture](architecture.md): the content map among the adapter's seams
- [Scaffolded site files](scaffolded-site-files.md): where the adapter and the content directories sit on a scaffolded site

The following external pages document the platform behavior the model builds on.

- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) in the TypeScript handbook: literal types and inference
- [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) on MDN: regular expressions in JavaScript
- [The Input element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input) on MDN: the attributes of an input element
- [Timestamp Language-Independent Type](https://yaml.org/type/timestamp.html) in the YAML type repository: how YAML parses an unquoted timestamp
