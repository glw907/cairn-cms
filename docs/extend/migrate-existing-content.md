# Migrate existing content

A site built with a static site generator such as Jekyll, Hugo, or Eleventy keeps each page as a
markdown file that opens with a frontmatter block. So does a markdown site built by hand whose
files open with that block. A cairn entry has the same shape: a markdown file in one concept's
directory, whose YAML frontmatter the concept's declared fields describe. The differences sit in
three parts of each file. The filename becomes the entry's id, verbatim, and cairn gives the entry
no other identity. The frontmatter is read against the concept's fields, and an old shortcode in
the body becomes a component the site registers. No importer ships with cairn, and only the site
declares the field each old key maps to, so the conversion is a short script you write. The script
reads each old file with `parseMarkdown`, the parser the build and the admin use on every committed
file, and it sees each frontmatter value with the types they see. The site's build then checks the
result. It fails on a committed manifest that no longer matches the content files, and on any entry
not marked as a draft whose frontmatter does not fit its concept, listing each invalid field. A
deploy builds the public pages from the committed files, so an entry that fails the check locally
fails the next deploy as well.

A migrated file outlives the script that wrote it. A `cairn:` link and the admin's rename and
delete guards key on an entry's id, and none of them can resolve a stem outside the id shape. The first time an editor saves the entry, the admin rewrites
its frontmatter from the declared fields and deletes every other key. A developer moving an
organization's existing site onto cairn writes one script that converts each old file, so that
every migrated entry keeps a stable id from its filename, validates against its concept's fields,
and can be the target of a `cairn:` link. The developer then runs the build to find each entry that
still fails. The target concepts are declared in the adapter file, `src/theme/cairn.config.ts` on a
scaffolded site and `src/lib/cairn.config.ts` on the add-cairn tutorial's site, and the steps are
the same on both.

A developer who came to bring an existing site's images into the Library finds the answer in
[Keep or move old images](#keep-or-move-old-images). There is no bulk media importer. An old image
URL left in a body renders unchanged, and moving an image into the Library takes one upload per
file and a `media:` reference in place of its URL. A developer whose build stopped after content
was copied in, or whose migrated entry is missing from the site, can start at
[Diagnose a failed check](#diagnose-a-failed-check).

The steps assume Node.js ES-module scripts that read and write files, JavaScript regular
expressions, YAML frontmatter, and the old site's conventions, such as its shortcodes and its draft
and date spellings. They also assume a declared concept for each kind of old content, and the id
and frontmatter rules that [Content model](content-model.md) sets out.

This page leaves out the following tasks, each with the page that covers it:

- Declaring the target concepts and their fields:
  [Define an adapter and schema](define-an-adapter-and-schema.md).
- Declaring and registering the components that replace shortcodes:
  [Configure rendering](configure-rendering.md).
- Turning media on: [Configure media](configure-media.md).
- Rewriting the old site's internal links as `cairn:` links:
  [Link content with references](link-content-with-references.md#cairn-body-links-and-reference-fields).
- Moving the site to a newer cairn version: [Upgrade cairn](upgrade-cairn.md), with each version's
  actions in [Migration notes](migration-notes.md).

These docs do not cover redirects from the old site's addresses.

## Before you begin

The script writes into concepts that the adapter declares, so each target concept and its fields
come first.

The script needs the following in place:

- Each target concept is declared in the adapter, with a field for every frontmatter key the
  migration keeps, as [Add a concept](define-an-adapter-and-schema.md#add-a-concept) shows. The
  adapter is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the
  add-cairn tutorial's site.
- If the old site has drafts, the concept declares a `boolean` field named `draft`, as
  [Frontmatter keys the engine reads](content-model.md#frontmatter-keys-the-engine-reads)
  describes.
- The site's content is indexed with `createSiteIndexes` and checked by the `cairnManifest`
  plugin, as
  [Index the content and commit its manifest](add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest)
  sets up.
- If the old bodies use shortcodes, each replacement component is declared and registered, as
  [Declare a component](configure-rendering.md#declare-a-component) and
  [Register the component](configure-rendering.md#register-the-component) show.
- The old site's markdown files are copied into a directory of the project outside the content
  directories, such as `old-content/posts`.

With the concepts declared, write the script.

## Write the migration script

The engine ships no importer, so you move the old files with a short script that reads each one
through `parseMarkdown`. The function returns two values. Its `frontmatter` holds the YAML already
typed, and an unquoted date or timestamp arrives as a `Date`. Its `body` holds everything after
the closing `---`. The [`parseMarkdown`](../reference/core.md#parsemarkdown) entry gives the
signature.

The engine's serializer is not public, so the script writes the `---` block itself. Its
`frontmatterBlock` helper writes each value as a JSON literal, and YAML reads a JSON literal back
as the same string, list, or boolean. The YAML specification records that relation in
[YAML History](https://yaml.org/spec/1.2.2/#12-yaml-history).

The script sits in the project beside the old files and the concept's directory:

```text
old-content/
  posts/
scripts/
  migrate-content.mjs
src/
  content/
    posts/
```

The script targets a dated `posts` concept that declares `title`, `date`, `description`, `draft`,
and `tags` fields.

To write the script, follow these steps:

1. In the project directory, create `scripts/migrate-content.mjs` with the following script.

   ```js
   // scripts/migrate-content.mjs
   import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
   import { parseMarkdown } from '@glw907/cairn-cms';

   const FROM = 'old-content/posts';
   const TO = 'src/content/posts';
   const DATE_PREFIX = 'day'; // the concept's datePrefix
   const PREFIX_LENGTH = { year: 4, month: 7, day: 10 };
   const ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

   // YAML hands an unquoted date over as a Date; take the calendar day either way.
   function toDay(value) {
     if (value instanceof Date) return value.toISOString().slice(0, 10);
     return String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
   }

   function toSlug(text) {
     return String(text)
       .toLowerCase()
       .replace(/[^a-z0-9]+/g, '-')
       .replace(/^-+|-+$/g, '');
   }

   // Keep only the keys the concept declares, each in the form its field reads.
   function toFrontmatter(old, filename) {
     const fm = {};
     if (old.title != null) fm.title = String(old.title);
     const day = toDay(old.date) ?? toDay(filename); if (day) fm.date = day;
     const description = old.description ?? old.summary;
     if (description != null) fm.description = String(description);
     if (old.draft === true || old.published === false) fm.draft = true;
     const tags = [...new Set([old.tags ?? []].flat().map(toSlug).filter(Boolean))];
     if (tags.length > 0) fm.tags = tags;
     return fm;
   }

   // JSON.stringify quotes every string, so YAML reads each value back as written.
   function frontmatterBlock(fm) {
     const lines = Object.entries(fm).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
     return `---\n${lines.join('\n')}\n---\n`;
   }

   // Rewrite the old site's note shortcode as a container directive.
   function toBody(body) {
     return body.replace(/\{\{<\s*note\s*>\}\}\n?([\s\S]*?)\{\{<\s*\/note\s*>\}\}/g, ':::note\n$1:::');
   }

   await mkdir(TO, { recursive: true });
   const written = new Set();
   for (const filename of await readdir(FROM)) {
     if (!filename.endsWith('.md')) continue;
     let parsed;
     try {
       parsed = parseMarkdown(await readFile(`${FROM}/${filename}`, 'utf8'));
     } catch (error) {
       console.error(`Skipped ${filename}: ${error.message}`);
       continue;
     }
     const { frontmatter, body } = parsed;
     const fm = toFrontmatter(frontmatter, filename);
     const stem = toSlug(filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
     const id = fm.date ? `${fm.date.slice(0, PREFIX_LENGTH[DATE_PREFIX])}-${stem}` : stem;
     if (!fm.date || !ID_SHAPE.test(id) || written.has(id)) {
       console.error(`Skipped ${filename}: no date, a bad id, or a duplicate id (${id})`);
       continue;
     }
     written.add(id);
     await writeFile(`${TO}/${id}.md`, frontmatterBlock(fm) + toBody(body));
     console.log(`${filename} -> ${TO}/${id}.md`);
   }
   ```

2. In the script, set `FROM` to the old files' directory, `TO` to the concept's `dir`, and
   `DATE_PREFIX` to the concept's `datePrefix`.
3. If the concept is undated, such as `pages`, make the following edits to the script:

   1. In the `id` line, set `id` to `stem`.
   2. In the skip test, remove `!fm.date ||`.
   3. If the concept declares no `date` field, remove the `fm.date` line from `toFrontmatter`.

The following list names the section that adapts each part of the script:

- `toSlug`, `DATE_PREFIX`, and the `id` line: [Name each file by its id](#name-each-file-by-its-id).
- `toFrontmatter` and `toDay`: [Convert the frontmatter](#convert-the-frontmatter).
- `frontmatterBlock`: [Quote values for text fields](#quote-values-for-text-fields).
- `toBody`: [Convert the body markup](#convert-the-body-markup).

The script converts one concept per run. A second concept takes a second run with a separate
`FROM`, `TO`, `DATE_PREFIX`, and field map.

Before you run it, adapt each helper to the old site, starting with the filenames.

## Name each file by its id

An entry's id is its filename stem, verbatim, and cairn gives the entry no other identity. The
filename is exactly the id plus `.md`, and a dated concept's filename starts with a date that the
URL slug strips. [Entry identity](content-model.md#entry-identity) sets out how the id, the slug,
and the entry's date relate.

### Match the date prefix to the concept

Only a leading date at the concept's `datePrefix` granularity is stripped from the slug. An old
site's dated filenames may carry a full day, another granularity, or no date at all. Under
`datePrefix: 'month'`, the file `2024-03-15-my-trip.md` loses only `2024-03-`, and its slug is
`15-my-trip`. Nothing throws or fails the build. The script's `stem` line strips only a full-day
date from an old filename.

To match the prefix, follow these steps:

1. In the script, set `DATE_PREFIX` to the concept's `datePrefix`.

   The `id` line then builds the prefix from the entry's date at that length.

2. If the old filenames carry a year or month date, in the `stem` line, change the date pattern to
   match it.

[Set the permalink and date prefix](define-an-adapter-and-schema.md#set-the-permalink-and-date-prefix)
lists the values `datePrefix` takes.

### Reduce each stem to the id shape

A stem of anything but lowercase letters, digits, and single inner hyphens still serves its page,
but a `cairn:` link cannot target it. Old filenames often carry capital letters, spaces, or other
punctuation, as `My_Trip.md` does. The admin's rename and delete guards cannot see such an entry
either.

- In the script, keep `toSlug` and the `ID_SHAPE` check, which lowercase and hyphenate each stem
  and skip any id still off shape or already written.

With the filenames settled, convert the frontmatter.

## Convert the frontmatter

A frontmatter key survives only if its concept declares it, and each declared field reads its value
in one form. Each of the following sections names the line of `toFrontmatter` it changes.

### Declare or drop every old key

The first time an editor saves an entry in the admin, the admin deletes every frontmatter key the
concept does not declare. Old frontmatter carries keys the old site's templates read, such as
`layout`, `aliases`, or `summary`.

To decide each old key, follow these steps:

1. In the adapter file, declare a field for each old key the site still needs, as
   [Add a concept](define-an-adapter-and-schema.md#add-a-concept) shows.
2. In the script's `toFrontmatter`, map each kept key onto its field, as the script maps `summary`
   to `description`.

A key the function does not map stays out of the written file. When the manifest is regenerated, a
key the function writes but the concept does not declare appears in a `content.field_undeclared`
warning. [Verify the migrated entries](#verify-the-migrated-entries) reads that warning.

### Write dates as `YYYY-MM-DD`

A `date` field accepts only a calendar date in `YYYY-MM-DD` form, and a value with a time part fails
validation. Old dates often carry a time and an offset. A string with a time part fails with the
field's label followed by `must be a valid date (YYYY-MM-DD)`. An unquoted timestamp arrives from
`parseMarkdown` as a `Date`, and the field takes that `Date`'s UTC day. An evening time west of UTC
therefore becomes the next day.

To write each date, follow these steps:

1. In the script's `toFrontmatter`, keep `toDay`, which writes the day as a quoted `YYYY-MM-DD`
   string.
2. If the old filenames carry the intended day, in `toFrontmatter`, call `toDay(filename)` before
   `toDay(old.date)`.

   The entry then takes the filename's day, and an offset timestamp cannot move it.

A `datetime` field differs: it takes the trimmed string as written, with no format check.
`frontmatterBlock` writes every string value quoted, so a timestamp the script maps as a string
reaches such a field as written.

### Mark drafts with `draft: true`

An entry is a draft only when its frontmatter holds `draft: true`; any other value, or no key,
reads as published. Old sites mark a draft in other ways, such as `draft: "true"`, `draft: yes`,
or `published: false`, and each of those reads as published.

- In the script's `toFrontmatter`, write `draft: true` for each draft marker the old site uses, as
  the script does for `published: false`.

The concept must also declare `draft` as a `boolean` field. Without it, the first admin save deletes
the key and the entry reads as published, as
[Declare or drop every old key](#declare-or-drop-every-old-key) explains.

### Map tags to the vocabulary

Once the site config holds a tag vocabulary, a save adds only vocabulary values, which are
lowercase hyphenated slugs. Old tags are often free text, such as `Travel Notes`. A tag outside the
vocabulary that an entry already carries is kept as an orphan, not refused.

- In the script's `toFrontmatter`, convert each tag to the vocabulary's value form with `toSlug`,
  and write the list under the concept's taxonomy field.

The script writes the list under `tags`. A concept may name its taxonomy field differently, as
[Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field) describes.

### Quote values for text fields

A `text`, `textarea`, `select`, `url`, or `email` field reads an unquoted number, date, or boolean as
empty. Old frontmatter such as `year: 1984` parses as a number. A required field then fails
validation, and an optional one is dropped on the next save. Only `number`, `date`, and `datetime`
fields accept a parsed number or `Date`.

- In the script's `toFrontmatter`, convert each text-like value to a string, and
  `frontmatterBlock` then writes it quoted.

The script already does this for `title` and `description`.

With the frontmatter converted, turn to the body.

## Convert the body markup

Apart from the shortcodes `toBody` rewrites, the script writes each body as `parseMarkdown` returns
it. Each old image URL and each other shortcode therefore needs a decision.

### Keep or move old images

An old image URL left in a migrated body renders unchanged, and cairn has no bulk media importer.
The old bodies point at images by the old site's paths or on another host.

Choose one of the following for each image:

- To keep an image where it is, leave its URL in place while the old address still serves it.
- To move an image into the Library, upload it there one file at a time and replace its URL with
  the Library's `media:` reference.

[Configure media](configure-media.md) turns media on. Uploading an image is an editor task in the
admin, and it belongs to the editor documentation.

### Replace shortcodes with components

A custom body block is a registered component, invoked only as a container directive such as
`:::note`. Old bodies carry the old site's block syntax, such as the shortcode `{{< note >}}`. A
leaf directive (`::note`) or a text directive (`:note`) renders as its literal source text.

- In the script's `toBody`, rewrite each shortcode as a container directive naming its registered
  component, as the script rewrites `{{< note >}}` to `:::note`.

[Register the component](configure-rendering.md#register-the-component) covers the registration.

With every part converted, run the script and let the build check the result.

## Run the build as the migration check

After the manifest is regenerated, a build with any invalid non-draft entry fails with one error
that lists each invalid field.

To run the migration and check it, follow these steps:

1. In the project directory, run the script:

   ```sh
   node scripts/migrate-content.mjs
   ```

   The script prints each file it writes, and each file it skips with the reason.

2. In the project directory, regenerate the manifest with `npx cairn-manifest`.

   The committed manifest no longer matches the new files, and a build on a stale manifest fails
   with an error that names this command. The [`cairn-manifest`](../reference/cli-cairn-manifest.md)
   reference covers the command.

3. In the project directory, build the site:

   ```sh
   npm run build
   ```

4. If the build fails on invalid frontmatter, correct the script helper that wrote each listed
   field, not the written file.

   Each line of the error has the form `<dir>/<id>: <field>: <message>`, as in the following
   example:

   ```text
   src/content/posts/2024-03-15-my-trip: date: Date must be a valid date (YYYY-MM-DD)
   ```

   [Diagnose a failed check](#diagnose-a-failed-check) gives the migration's causes for a listed
   field.

5. If you changed the script, repeat these steps from the first step.

An invalid draft never fails the build, but the index still leaves it out.
[Verify the migrated entries](#verify-the-migrated-entries) finds such a draft.

Passing `{ validate: false }` as the fourth argument to `createSiteIndexes` lets the build pass
while entries still fail. The call sits in
[the module that calls `createSiteIndexes`](build-the-public-routes.md#build-one-typed-index). The
option is a temporary escape: with it set, every invalid entry drops from the site with no error.
The [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) entry gives the option's
signature.

Once the build passes, confirm that every migrated entry reached the index.

## Verify the migrated entries

The content index records each entry that fails its validator as a content problem with its field
errors, and leaves it out.

To verify the migration, follow these steps:

1. In the module that calls `createSiteIndexes`, add a temporary line for each migrated concept
   that logs its problems.

   <!-- snippet-check-skip: one line added to the tutorial's content module, which declares indexes -->
   ```ts
   // src/lib/content.ts
   console.log(indexes.posts.problems());
   ```

   On a scaffolded site, the line goes in the content module that
   [Build one typed index](build-the-public-routes.md#build-one-typed-index) shows.

2. In the project directory, build the site.
3. In the build output, confirm that every logged list is empty.

   An entry listed with `draft: true` passed the build but still fails its validator. The
   [delivery data types](../reference/delivery-data.md#types) give the shape of each listed
   problem.

4. In the content module, remove the logging lines.
5. In the project directory, run `npx cairn-manifest` again.
6. In its output, confirm that no `content.field_undeclared` warning names a key you meant to keep.

   The [log events reference](../reference/log-events.md) lists the warning's `concept` and `keys`
   fields.

7. In the dev server, open a migrated entry at its permalink.
8. On that page, confirm that its images load and that no shortcode or directive shows as literal
   text.

When a check fails, [Diagnose a failed check](#diagnose-a-failed-check) traces it to its cause.

## Diagnose a failed check

Most failed checks trace to the name, a frontmatter value, or a body block of one migrated file,
and the rest to the manifest or the build option.

Work through the following causes in order:

1. If the script prints `Skipped` for a file, find its cause in the following list:

   - If the parser rejected the frontmatter, correct it in the old file.
   - If neither the old frontmatter nor the filename holds a date, see
     [Write dates as `YYYY-MM-DD`](#write-dates-as-yyyy-mm-dd).
   - If the id is off shape or already written, see
     [Name each file by its id](#name-each-file-by-its-id).

2. If the build fails on a stale content manifest, rerun `npx cairn-manifest`.
3. If the build stops with one line per invalid field, each `<dir>/<id>: <field>: <message>`,
   follow the matching row of
   [Diagnose a failed build](build-the-public-routes.md#diagnose-a-failed-build). A migration adds
   two causes of its own:

   - If a `date` field is listed, the old date carried a time part. See
     [Write dates as `YYYY-MM-DD`](#write-dates-as-yyyy-mm-dd).
   - If a required text-like field is listed although the old file had a value, that value was an
     unquoted number, date, or boolean. See
     [Quote values for text fields](#quote-values-for-text-fields).

4. If an entry is missing from the site while the build passes, either it is a draft or
   `validate: false` is still set. See [Verify the migrated entries](#verify-the-migrated-entries).
5. If a `cairn:` link to a migrated entry finds no target, the entry's stem is off shape. See
   [Reduce each stem to the id shape](#reduce-each-stem-to-the-id-shape).
6. If a shortcode or directive shows as literal text, `toBody` either missed the shortcode or wrote
   a leaf or text directive. See [Replace shortcodes with components](#replace-shortcodes-with-components).
   For a component that still fails, see
   [Diagnose a failed check in Configure rendering](configure-rendering.md#diagnose-a-failed-check).

## See also

The following pages cover the pieces this page links to:

- [Define an adapter and schema](define-an-adapter-and-schema.md): declaring the target concepts
  and their fields.
- [Entry identity](content-model.md#entry-identity): how the id, the slug, and the entry's date
  relate.
- [Register the component](configure-rendering.md#register-the-component): registering a
  shortcode's replacement.
- [Configure media](configure-media.md): turning media on before moving images into the Library.
- [Link content with references](link-content-with-references.md#cairn-body-links-and-reference-fields):
  linking migrated entries with `cairn:` links.
- [Build the public routes](build-the-public-routes.md): the build validation that checks migrated
  frontmatter.
- [`parseMarkdown`](../reference/core.md#parsemarkdown) and
  [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes): the parser and the index
  builder the migration relies on.
- [`cairn-manifest`](../reference/cli-cairn-manifest.md): when to regenerate the manifest.
