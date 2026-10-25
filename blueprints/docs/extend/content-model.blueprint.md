---
page: Content model
type: concept
---

# Content model

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn's seams, who is about to declare content in the site's adapter or has inherited a site whose adapter already declares it. They want the model before they write against it: what a concept is, how its fieldset drives the editor's form, the save's checks, and the site's types, how an entry gets its id and its address, and what the committed content manifest records. :fact[5eum60] :fact[phdgof] :fact[t5ebsr]

**Why they arrive:**
- They are about to declare a concept and want to predict what the declaration produces and what the engine refuses, at module load and at an editor's save, before writing it. :fact[68fh1k] :fact[8fv57g] :fact[hdrzxd]
- They took over a scaffolded site and want to know what its posts and pages concepts are, whether they can rename or remove them, and what a dated filename such as `2026-08-14-my-post.md` means. :fact[5eum60] :fact[46edxb]
- They are weighing whether cairn's model fits an organization's content, and want its limits: a closed set of field builders with no seam for another type, and containers nested one level deep. :fact[2hxm4t] :fact[im6x7r] :fact[68fh1k]
- They are moving existing markdown into cairn, or chasing a symptom such as a frontmatter key gone after an editor's save, and want the id, date, and frontmatter rules behind it. :fact[ggzzur] :fact[69j91g] :fact[zce3pt]

**What they already know.** TypeScript literal types and inference, YAML frontmatter at the head of a markdown file, JavaScript regular expressions, and HTML form input attributes. The page explains none of these. A reader new to the adapter reads Architecture first to see where the content map sits among the seams.

**Background.** An entry an editor opens in the admin is a markdown file in the site's repository, and it belongs to a concept: one entry in the adapter's `content` map, declaring a directory of such files and a fieldset that describes their frontmatter. The scaffold's posts and pages are declarations of this kind, not concepts the engine builds in. :fact[5eum60] :fact[8zdux6]
The fieldset is the one place a field is declared, and an admin save writes frontmatter back from the validator's output, so a key the fieldset does not declare is dropped at the first save. :fact[phdgof] :fact[ggzzur]
The files in git stay the source of truth, and the committed manifest summarizes them so admin code reads the content graph without reading GitHub entry by entry. :fact[z5boz6]

**What the page does for them.** The introduction opens on the entry and the concept it belongs to, then says what one declaration decides: the form editors fill in, the checks a save runs before anything is committed, the TypeScript type of entries in the site's SvelteKit code, whether an entry gets a public address, and what the manifest records about it. :fact[phdgof] :fact[hdrzxd] :fact[s2zbzm] :fact[t5ebsr]
It names each reader's reason in turn, including that several builder options share a name with an HTML input attribute but behave differently. For example, `pattern` matches anywhere in the value, but the HTML attribute must match the whole value. :fact[7l7y5l] :fact[n26z3j] :fact[t7cr8o]
It then lists the subjects in body order, the prior knowledge above, and what the page leaves to other pages.

**What it leaves to other pages:**
- Define an adapter and schema covers writing the adapter and a concept's declaration, including permalinks, `datePrefix`, tags, `refine`, and `behavior.validate`.
- Link content with references covers reference fields and internal links between entries in use.
- Reuse content across entries covers fragments and the include directive.
- Write a markdown component covers rendering an entry's body.
:::

:::constraints
- Say that posts and pages are not reserved names, and never that a concept may take any name: the engine refuses some ids, and the page states neither that set nor the `fragments` rule. :fact[5eum60]
- Name the adapter file as the scaffolded site's `src/theme/cairn.config.ts`. :fact[7ym1ep]
- State each builder's plain options by linking the "Fields" table in the core reference, never by restating its rows.
- Claim nothing about a hand-written file whose name breaks the id shape.
:::

## Concepts

*Defines a concept, shows one declaration beside an entry it governs, and lists what the declaration gives the site.*

- Declaring a concept in the adapter's `content` map gives a site one kind of content: a repository directory of markdown entries, described by a fieldset, with optional routing and URL policy. :fact[5eum60]
- On a scaffolded site the adapter is `src/theme/cairn.config.ts`. The scaffold wraps each concept in `defineConcept`, which keeps the fieldset's type for typed reads and checks the URL policy when the module loads. :fact[7ym1ep] :fact[5eum60] :fact[lkgubp]
- Code: an `events` concept declared with `defineConcept`, with a `dir`, `routing: 'page'`, and a fieldset of a required `title` text field and a `date` field, captioned by the scaffolded adapter's path. :source[/templates/waymark/src/theme/cairn.config.ts] :fact[5eum60] :fact[7ym1ep]

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

- Code: one entry file in that directory, captioned by its path `src/content/events/spring-open-house.md`. Its frontmatter keys match the fieldset, and its filename stem `spring-open-house` is the entry's id. :fact[46edxb] :fact[8zdux6]

```markdown
---
title: Spring open house
date: 2026-05-02
---

Visitors are welcome to tour the space.
```

- The posts and pages concepts a scaffolded site starts with are declarations like this one in its adapter. Neither name is reserved, and a site may rename them, remove them, or declare other concepts beside them. :fact[5eum60]
- Some scaffold code reads a concept by its id; the scaffold's feed reads `posts`, for example. A site that renames a scaffolded concept updates that code too. :fact[uf5ahv]
- Some engine conveniences also key on the literal ids: a concept with the id `pages` defaults to the permalink `/:slug` where another concept defaults to `/<id>/:slug`, the admin's getting-started checklist looks for `posts` and `pages` entries, and the entry picker and the editor's `[[` link autocomplete list `pages` entries first and `posts` second. :fact[r03vis] :fact[g39nkp]
- One concept declaration gives a site the following:
- An admin list and an editor for the concept's entries. :fact[vs77a6]
- A form, a save-time validator, and a TypeScript type, each derived from the fieldset. :fact[phdgof]
- A public page for each non-draft entry, unless the concept's routing is `'embedded'`. :fact[s2zbzm]
- A row for each entry in the committed content manifest. :fact[t5ebsr]
- See [`defineConcept`](../reference/core.md#defineconcept).

## The fieldset

*Explains the fieldset as the single source for the form, the validator, and the type, and names the closed set of builders.*

- A concept's fieldset is the one place its fields are declared: the engine derives the editor's form, the save-time validator, and the TypeScript type of the site's entries from it, with no separate schema language. The three cannot drift apart. :fact[phdgof]
- The `fields` namespace has fifteen builders: thirteen leaves (`text`, `textarea`, `number`, `select`, `multiselect`, `url`, `email`, `date`, `datetime`, `boolean`, `icon`, `image`, `reference`) and two containers (`object`, `array`). :fact[2hxm4t] :fact[68fh1k]
- `FieldDescriptor` is a closed union of those fifteen. The engine exposes no seam to register another field type. A shape outside them is modeled with the existing builders. :fact[im6x7r]
- Using the `reference` builder is covered in Link content with references.
- See [Fields](../reference/core.md#fields).
- See [Link content with references](link-content-with-references.md).

## Field options

*Names the base options and the edges a developer would not predict from an option's name, and leaves each option's plain behavior to the reference.*

- Each builder takes four base options: `label`, `help`, `required`, and `default`. `label` is optional on an `object`. The "Fields" table in the core reference gives each builder's specific options and what each does. :fact[u9rvl3]
- The following options behave in ways their names alone do not predict:
- `pattern` on `text` and `textarea` is compiled when `defineFieldset` runs, so a malformed pattern throws at declaration. :fact[8fv57g]
- `pattern` is tested unanchored and with no flags, unlike the HTML attribute of that name. A pattern that must match the whole value includes `^` and `$`. :fact[7l7y5l] :fact[n26z3j]
- `default` prefills only a new entry's create form, never an existing or hand-written file, and a `date` field's `'today'` resolves to the current UTC date. :fact[7lo8fe]
- `creatable` on a `multiselect` that sets `options` swaps the checkbox group for a tag input, and a value outside `options` still fails the save. :fact[8b21y6]
- `min` and `max` on a `date` field are enforced at the save but not rendered on the date input, and on a `datetime` field neither the save nor the form enforces them. :fact[t7cr8o] :fact[8igohk]
- The `text` and `textarea` constraints (`min`, `max`, `length`, and `pattern`) and the `date` bounds never render as input attributes. The form therefore accepts a value the save then refuses. :fact[8fv57g] :fact[t7cr8o]
- The `url` and `datetime` builders also restrict or convert a value. A `url` field accepts only an absolute `http://` or `https://` URL with no whitespace. A root-relative path or a `mailto:` value fails the save. :fact[7ci1fm]
- A `datetime` field keeps a quoted string as written. YAML parses an unquoted full ISO timestamp into a `Date`, and the field converts it to a zoneless `YYYY-MM-DDTHH:mm` string read in UTC, dropping seconds and offset. :fact[8igohk]
- See [Fields](../reference/core.md#fields).

## Containers

*Explains the two container builders and the one-level nesting limit, ending on the declaration that throws.*

- `object` and `array` are the two container builders, and each nests one level: an `object` holds leaf fields, and an `array` holds one leaf or a flat `object` of leaves. :fact[68fh1k]
- An `object`'s `fields` is the record of leaf fields keyed by frontmatter sub-key and stored as one nested object, and an optional object whose leaves are all empty omits its key. :fact[loqocz]
- An `object`'s `label` is optional: a top-level object's group legend falls back to the humanized key, so `social_card` reads "Social card", and an object inside an array is labeled by the array. :fact[loqocz]
- An `array`'s `item` is the descriptor every element conforms to, and the array's value is a list. An optional empty list omits its key, and a required empty list fails the save. An `array` of `reference` items stores a list of entry ids. :fact[brs2v9]
- `defineFieldset` throws at declaration for an array of arrays, for a container inside an `object`, and for a `reference` inside an `object`. That last error advises modeling the reference as the parent's own concept or using a top-level `array` of references. :fact[68fh1k]
- `defineFieldset` throws on a field key that contains a dot, top-level or nested, because the engine addresses a nested field by a dotted path. :fact[t4hh8w]
- Code: a `defineFieldset` call whose `array` item is another `array`, with a comment that the call throws when the module loads. :source[/src/lib/content/fieldset.ts#checkContainerNesting] :fact[68fh1k]

<!-- snippet-check-skip: illustrates a declaration that throws by design -->
```ts
import { defineFieldset, fields } from '@glw907/cairn-cms';

// Throws when the module loads: an array's item must be a leaf or a flat object.
const schedule = defineFieldset({
  sessions: fields.array(fields.array(fields.text({ label: 'Room' })), { label: 'Sessions' }),
});
```

- See [`fields`](../reference/core.md#fields-1).

## Save-time validation

*Sets declaration-time refusals apart from save-time ones and says what an editor sees when a save is refused.*

- A malformed `pattern`, a container nested too deep, or a dotted key throws when the adapter module loads, while a value that breaks a declared rule is refused at the save. :fact[8fv57g] :fact[68fh1k] :fact[t4hh8w] :fact[hdrzxd]
- An admin save runs the concept's validator on the submitted values before any commit, and an invalid save stops there: the editor sees the first failing message in one banner, and nothing is committed. :fact[hdrzxd]
- A save writes the entry's frontmatter from the validator's output, so a key the fieldset does not declare is dropped from the file at its first admin save. :fact[ggzzur]
- The validator also runs when the site builds its content indexes. A non-draft entry whose frontmatter fails it fails the build, and that check catches a file edited outside the admin. :fact[yvz3mm]
- The cross-field `refine` hook and `behavior.validate`, including what happens when `behavior.validate` throws, belong to Define an adapter and schema.
- See [Define an adapter and schema](define-an-adapter-and-schema.md).

## Frontmatter keys the engine reads

*Names the keys the engine reads by literal name and why each must be declared to survive a save.*

- The engine reads several frontmatter keys by literal name, so a site that wants one to survive an admin save declares it as a field. :fact[69j91g] :fact[becf0c] :fact[ggzzur]
- The engine uses the following keys:
- `title` is the entry's title, and an entry without one falls back to its id. :fact[69j91g]
- `date` is the entry's date, which a dated permalink's tokens resolve from. :fact[69j91g] :fact[zce3pt]
- `updated` is the sitemap's `lastmod` and the entry page's modified time in its SEO head. Only the JSON Feed carries a modified date, as `date_modified`, and only when the site's feed route passes an item's `updated`, which the scaffold's feed doesn't. The RSS feed carries none. :fact[69j91g]
- `description` is the entry's excerpt. :fact[69j91g]
- `draft` set to `true` leaves the entry out of a concept index's listings and the sitemap, and a boolean field named `draft` is the edit page's **Hidden** toggle. :fact[69j91g] :fact[xcqr2v]
- `description`, `image`, `robots`, and `author`, each read as a string, are the SEO head fields the public route factory reads. An undeclared `image`, `robots`, or `author` never reaches the head; an undeclared `description` still becomes the entry's excerpt, which the head uses, until an admin save drops the key. :fact[becf0c]
- An entry's date is the one part of its identity that comes from frontmatter rather than from its filename. :fact[zce3pt] :fact[46edxb]

## Entry identity

*Explains how the filename fixes an entry's id and slug, where its date comes from, and what an id may contain.*

- An entry's id is its markdown filename without `.md`, and the file sits directly in the concept's `dir` at `<dir>/<id>.md`. :fact[46edxb] :fact[8zdux6]
- The engine uses `dir` verbatim and never validates it. A `dir` stays repo-relative with no leading or trailing slash, and entries never sit in subfolders. :fact[8zdux6]
- In a dated concept the filename also carries a leading date, and the URL slug strips only that prefix. :fact[46edxb]
- The following example shows one dated entry's file, id, and slug:
- The file is `src/content/posts/2026-08-14-my-post.md`. :fact[46edxb]
- The id is `2026-08-14-my-post`. :fact[46edxb]
- The slug is `my-post`. :fact[46edxb]
- The filename's date prefix only feeds the slug. The entry's date comes from its `date` field, and that is why a dated permalink makes `date` a required field. :fact[zce3pt]
- An entry created in the admin takes its filename prefix from the date picked in the create dialog, cut to the concept's `datePrefix`, and the form is seeded with that date. The two therefore agree to the prefix's granularity. Because neither a save nor a rename changes the prefix afterward, the two can come to differ. :fact[ilcgl4]
- Ids are lowercase ASCII letters, digits, and single hyphens. As a result, `slugify` turns a title in a non-Latin script into an empty address that the create action refuses, and treats an accented letter as a separator: `résumé` becomes `r-sum`. :fact[7m8nd4]
- See [Define an adapter and schema](define-an-adapter-and-schema.md).

## Routing

*Says what each routing shorthand does with an entry's identity on the public site.*

- A concept's `routing` shorthand decides whether its entries get public pages and whether they are dated. Its values are `'page'` (the default), `'feed'`, and `'embedded'`. :fact[s2zbzm]
- The following table gives one row per shorthand, with what it turns on and what it suits:
- `'page'`: routable and undated, with each entry in the sitemap, for standalone pages. :fact[s2zbzm] :fact[6e06p2]
- `'feed'`: routable and dated, so its permalink may use the date tokens and its index sorts newest first, for chronological content. :fact[s2zbzm] :fact[6e06p2]
- `'embedded'`: not routable, with no public page and no sitemap entry, for a concept whose entries other entries read rather than readers browse, such as fragments. :fact[s2zbzm] :fact[6e06p2]
- Which entries reach an RSS or JSON feed is the site's choice in its feed route: the engine serializes the items a site passes it, and the scaffold's feed reads the `posts` concept by its id. :fact[uf5ahv]
- An `'embedded'` concept keeps a directory, fields, and an admin list and editor. The admin labels its entries' identifier Name rather than Address. :fact[vs77a6]
- See [`defineConcept`](../reference/core.md#defineconcept).

## Address collisions

*Explains what happens when two entries resolve to the same permalink, from the edit page to the build.*

- When another entry on `main` already resolves to the same permalink, the edit page shows a warn-only `address-collision` advisory. :fact[9270mo]
- A publish rechecks against `main` and every open `cairn/*` branch, and when a collision remains it logs `publish.address_collided` after the publish lands. :fact[9270mo]
- Neither check blocks a save or a publish, and both fail open, so a check that cannot run lets the save or publish go ahead. :fact[9270mo]
- Once both entries are on `main`, neither is a draft, and both concepts are routable, the next build fails, because building the site's content indexes throws on the duplicate permalink. :fact[yvz3mm]
- See [Log events](../reference/log-events.md).

## The content manifest

*Says what the committed manifest records for each entry, when it changes, and why it exists beside git.*

- The files in git stay the source of truth for content, and the committed content manifest summarizes them, one row per entry, so admin code reads the content graph without reading GitHub entry by entry. :fact[z5boz6] :fact[t5ebsr]
- A row records the following about its entry:
- Its id, concept, title, date, and permalink. :fact[t5ebsr]
- Its summary and its draft flag. :fact[t5ebsr]
- Its outbound `cairn:` links, the internal links its body makes to other entries. :fact[t5ebsr]
- Its media refs, reference-field edges, tags, included fragments, and first-publish stamp, when it has them. :fact[t5ebsr]
- A save to the entry's holding branch commits no manifest change, and a publish patches the entry's row in the same commit as the content change. :fact[t5ebsr]
- The `cairnManifest` Vite plugin rebuilds the manifest from the files when a build starts and fails the build when the committed file has drifted, and the `cairn-manifest` command writes a regenerated file. :fact[6e8kwx]
- A `reference` field holds a typed `{ concept, id }` pointer. The manifest records each entry's outbound reference edges, and the engine reads which entries point at an entry from them. :fact[a8ecm0]
- See [Content and manifest](../reference/core.md#content-and-manifest).
- See [Link content with references](link-content-with-references.md).

## Renames

*Explains a rename as one commit that moves the file and rewrites what points at it.*

- A rename gives the entry a new slug in one atomic commit on `main`. The commit moves its file to the new id and rewrites the inbound `cairn:` tokens that `main`'s manifest records. :fact[z4j689]
- In a dated concept the rename keeps the filename's date prefix and swaps only the slug. :fact[ilcgl4]
- The same commit repoints the published reference fields that point at the entry. :fact[a8ecm0]
- The rename is refused with a 409 when the new id collides with an existing entry or while the entry has unpublished edits. :fact[z4j689]
- It is also refused while another editor's open branch holds a reference to the entry. :fact[a8ecm0]

## Related resources

*Points the reader to the guides that put the model to work and the pages that place it in the wider system.*

- The following guides put the model to work:
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [Link content with references](link-content-with-references.md).
- See [Reuse content across entries](reuse-content-across-entries.md).
- See [Write a markdown component](write-a-markdown-component.md).
- The following pages place the content model in the wider system:
- See [Architecture](architecture.md).
- See [Scaffolded site files](scaffolded-site-files.md).
- The following external pages document the platform behavior the model builds on:
- See [TypeScript Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html).
- See [MDN RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
- See [MDN pattern attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/pattern).
- See [YAML timestamp type](https://yaml.org/type/timestamp.html).
