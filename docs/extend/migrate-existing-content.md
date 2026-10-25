# Migrate existing content

A site built with Jekyll, Hugo, or Eleventy keeps each page in a file that opens with a frontmatter block, and a hand-built markdown site may keep its pages the same way. A cairn entry has that shape too: a markdown file whose frontmatter sits over a markdown body. Moving an old file into one of the site's concepts changes three parts of it. Its filename becomes the entry's id. Its frontmatter is read against the concept's declared fields, and the first admin save deletes any key the concept doesn't declare. In its body, each old shortcode becomes a registered component, and each old image address needs a decision about where the image lives.

No importer ships with cairn, and none of the package's bins or the `cairn` CLI's commands converts another site's files into entries. The conversion is a short script you write. The build's content index, the content manifest's builder, and the admin's edit page each read a committed file with [`parseMarkdown`](../reference/core.md#parsemarkdown). `@glw907/cairn-cms` exports the same function from its root, and a script that reads the old files with it gets each frontmatter value typed as the build and the admin read it. The build then checks every migrated entry against its concept and fails on any entry not marked as a draft whose frontmatter fails validation.

This page builds one script that converts each old file so that its entry keeps a stable id, validates against its concept's fields, and can be the target of a `cairn:` link. It then uses the build to find each entry that still fails. `parseMarkdown` reads the block between `---` lines as YAML by default and treats a TOML block between `+++` lines as no frontmatter, so a Hugo site's TOML files need converting to YAML before the script reads them.

A developer who copied old files in by hand and then found the build stopped, or an entry missing from the site, can start at [Diagnose a failed check](#diagnose-a-failed-check). A developer who wants to know what becomes of the old images and shortcodes finds both answers in [Convert the body markup](#convert-the-body-markup). The steps assume familiarity with Node.js ES-module scripts that read and write files, regular expressions, YAML frontmatter, and the old site's conventions, such as its shortcodes and how it spells drafts and dates.

The following tasks belong to other pages:

- Declaring the target concepts and their fields: [Define an adapter and schema](define-an-adapter-and-schema.md).
- Writing and registering the component that replaces a shortcode: [Write a markdown component](write-a-markdown-component.md).
- Looking up what the save-time validation checks: [Content model](content-model.md).
- Turning media on: [Configure media](configure-media.md).
- Rewriting the old site's internal links as `cairn:` links: [Link content with references](link-content-with-references.md).

This page leaves out redirects from the old site's addresses.

## Before you begin

Before you write the script, the site needs the following:

- Each target concept is declared in the adapter module, with a field for each frontmatter key the migration keeps. A scaffolded site keeps the adapter in `src/theme/cairn.config.ts` and imports it as `cairn` from `#theme/cairn.config.js`, through the `#theme/*` import that [`package.json`](scaffolded-site-files.md#packagejson) maps to `src/theme/*`. An admin save deletes a key the concept doesn't declare. For more information, see [Add a concept](define-an-adapter-and-schema.md#add-a-concept).
- If the old site has drafts, the concept declares a `boolean` field named `draft`. The edit page renders that field as its **Hidden** toggle. For more information, see [Frontmatter keys the engine reads](content-model.md#frontmatter-keys-the-engine-reads).
- Each concept's glob is passed to [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes) and listed in the [`cairnManifest`](../reference/vite.md#cairnmanifest) plugin's `content` option. `createSiteIndexes` throws on a concept with no glob, and the plugin's manifest carries no rows for a concept its `content` option leaves out. A scaffolded site calls `createSiteIndexes` in its content module, `src/chassis/content.ts`. For more information, see [Build one typed index](build-the-public-routes.md#build-one-typed-index).
- If the old bodies use shortcodes, each shortcode has a registered component to replace it. For more information, see [Register the component](write-a-markdown-component.md#register-the-component).
- The old site's markdown files are copied into a project directory outside the concepts' content directories, such as `old-content/posts`.

## Write the migration script

No importer ships with cairn, so you move the old files with a short script that reads each one through `parseMarkdown`. `parseMarkdown` returns `frontmatter` with the YAML values already typed, and an unquoted date or timestamp arrives as a `Date`. Its `body` starts on the line after the closing `---`.

The admin's save writes an entry file with a function that `@glw907/cairn-cms` doesn't export. The script writes the `---` block itself. Its `frontmatterBlock` helper writes each value with `JSON.stringify`, and `parseMarkdown` reads the result back as the same string, list, or boolean. When a frontmatter block fails to parse, `parseMarkdown` throws. The script catches the error and skips that file with the error's message.

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
     fm.date = toDay(old.date) ?? toDay(filename);
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

   The script reads each `.md` file in `FROM`, builds its id and frontmatter, rewrites one shortcode, and writes the entry to `TO`.

2. In the script, set `FROM` to the old files' directory, `TO` to the concept's `dir`, and `DATE_PREFIX` to the concept's `datePrefix`.

   A concept that sets no `datePrefix` uses `'day'`. The `id` line builds a dated id the way the admin's create dialog does. It joins the date, cut to the concept's `datePrefix`, to the slug with a hyphen.

3. If the concept isn't dated, such as one with `routing: 'page'`, make the following edits to the script:

   1. In the `id` line, set `id` to `stem`.
   2. In the skip test, remove `!fm.date ||`.
   3. In `toFrontmatter`, remove the `fm.date` line.

The following sections each adapt one part of the script:

- [Name each file by its id](#name-each-file-by-its-id) adapts `toSlug`, `DATE_PREFIX`, and the `id` line.
- [Convert the frontmatter](#convert-the-frontmatter) adapts `toFrontmatter` and `toDay`.
- [Convert the body markup](#convert-the-body-markup) adapts `toBody`.

The script converts one concept per run. A second concept takes a second run with that concept's `FROM`, `TO`, `DATE_PREFIX`, and key mapping.

## Name each file by its id

An entry's id is its filename stem, verbatim. The script therefore writes each entry to `<id>.md`. The URL slug of a dated concept's entry drops the date that starts its filename. For more information, see [Entry identity](content-model.md#entry-identity).

### Match the date prefix to the concept

The slug loses a leading date only at the concept's `datePrefix` granularity. Old filenames can carry a full day, another granularity, or no date. Under `datePrefix: 'month'`, `2024-03-15-my-trip.md` loses only `2024-03-`, and its slug is `15-my-trip`. The mismatch throws no error and doesn't fail the build.

- In the script, set `DATE_PREFIX` to the concept's `datePrefix`, and the `id` line cuts the entry's date to that length.

For the values `datePrefix` takes, see [Set the permalink and date prefix](define-an-adapter-and-schema.md#set-the-permalink-and-date-prefix).

### Reduce each stem to the id shape

An id is lowercase letters and digits joined by single hyphens. A stem outside that shape still serves its page, but a `cairn:` link can't target it. The admin refuses the id as well. Its edit page doesn't open the entry, and its save, publish, discard, rename, and delete actions each reject the id as invalid. Old filenames can carry capital letters, spaces, or other characters, such as `My_Trip.md`.

- In the script, keep `toSlug` and the `ID_SHAPE` check.

`toSlug` lowercases and hyphenates each stem, and the check skips a file whose id is still off shape or already written.

## Convert the frontmatter

Each field type accepts its value in set forms, such as a `YYYY-MM-DD` string or a `Date` for a `date` field. The following sections each change `toFrontmatter`.

### Declare or drop every old key

The first time an editor saves an entry, the admin writes its frontmatter from the validated fields and deletes each key the concept doesn't declare. Old frontmatter often carries keys that the old site's templates read, such as `layout`, `aliases`, or `summary`.

To decide each old key, follow these steps:

1. In the adapter module, declare a field for each old key the site still needs.

   For more information, see [Add a concept](define-an-adapter-and-schema.md#add-a-concept).

2. In the script's `toFrontmatter`, map each kept key onto its field, and leave out the rest.

   The script's `description` line shows the pattern: it takes the old `summary` when the file has no `description`.

Building the manifest logs a [`content.field_undeclared`](../reference/log-events.md) warning that names each concept's undeclared keys. [Verify the migrated entries](#verify-the-migrated-entries) checks for this warning.

### Write dates as `YYYY-MM-DD`

A `date` field accepts a calendar date in `YYYY-MM-DD` form. A string with a time part fails with the field's label followed by `must be a valid date (YYYY-MM-DD)`. Old dates often carry a time and an offset, such as `2024-03-15 20:00:00 -08:00`. An unquoted timestamp arrives as a `Date`, and the field takes the `Date`'s UTC day. An evening time west of UTC therefore lands on the next day.

The script's `toDay` returns the day as a `YYYY-MM-DD` string, and `frontmatterBlock` writes it quoted. For a `Date`, `toDay` takes the UTC day, as the field does, and reproduces the shift.

- If the old filenames carry the intended day, in `toFrontmatter`, change the `date` line to `fm.date = toDay(filename) ?? toDay(old.date);`.

An offset timestamp then can't move the entry's date.

A `datetime` field takes the trimmed string as written, with no format check. The script has no `datetime` handling. Because `parseMarkdown` hands an unquoted timestamp over as a `Date`, `frontmatterBlock` writes it as a UTC string that loses the offset.

- For a `datetime` field, in `toFrontmatter`, write the timestamp as a quoted string, rebuilt with its offset or taken from the old file's raw text.

Taking it from the raw text means passing the file's text into `toFrontmatter` beside the parsed values.

### Mark drafts with `draft: true`

An entry is a draft only when its frontmatter holds the boolean `draft: true`. Any other value, or no key, reads as published. An old site can mark a draft as `draft: 'true'`, `draft: yes`, or `published: false`, and each of those reads as published.

- In the script's `toFrontmatter`, write `draft: true` for each draft marker the old site uses.

The script already writes it for `published: false`. The concept must declare `draft` as a `boolean` field. Otherwise the first admin save deletes the key, and the entry reads as published. For more information, see [Declare or drop every old key](#declare-or-drop-every-old-key).

### Map tags to the vocabulary

A tag vocabulary's values are lowercase hyphenated slugs. Once the site configures one, an admin save adds only vocabulary values to the concept's taxonomy field. Old tags are often free text, such as `Travel Notes`. An admin save keeps an entry's existing tag that sits outside the vocabulary as an orphan and doesn't refuse it.

- In the script's `toFrontmatter`, write the tags, each converted with `toSlug`, under the name of the concept's taxonomy field.

The script writes them under `tags`. For how a concept marks its taxonomy field, see [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field).

### Quote values for text fields

A `text`, `textarea`, `select`, `url`, or `email` field reads a value that isn't a string, such as an unquoted number, date, or boolean, as empty. Old frontmatter such as `year: 1984` parses as a number. A required field then fails validation, and an optional one is left out of the validated frontmatter the site reads. The admin's edit page fills a `text` or `textarea` field with the value converted to a string, and a save writes that string back. A date written back this way becomes JavaScript's long date string.

- In the script's `toFrontmatter`, convert each number or boolean bound for one of these fields to a string, and each such date with `toDay`.

`frontmatterBlock` then writes each string value quoted. The `title` and `description` lines already convert their values to strings. The `draft` value stays a boolean, which [Mark drafts with `draft: true`](#mark-drafts-with-draft-true) requires.

## Convert the body markup

The script copies each body as `parseMarkdown` returns it, apart from the one shortcode `toBody` rewrites. Old image addresses and every other shortcode reach the entry as written.

### Keep or move old images

The render pipeline rewrites an image's address only when the address is a `media:` reference. An old image address left in a body keeps pointing where it did. An image whose old address still serves it can stay as it is.

Moving an image into the media library needs media turned on. For more information, see [Configure media](configure-media.md).

To move an image into the media library instead, follow these steps:

1. In the admin's **Media library** screen, upload the image.
2. In the entry's body, replace the old address with the image's `media:` reference.

The media library takes one file per upload, and it stores and commits each file in one step.

### Replace shortcodes with components

A site's reusable body block is a registered component, invoked as a container directive such as `:::note`. Apart from `::include`, which embeds a fragment, a leaf directive (`::note`) or a text directive (`:note`) renders as its literal source text. Old bodies carry the old site's block syntax, such as a Hugo `{{< note >}}` shortcode or a Jekyll `{% include %}` tag.

- In the script's `toBody`, rewrite each shortcode as a container directive that names its registered component.

The script's one rule turns `{{< note >}}` into `:::note`. For registering the component, see [Register the component](write-a-markdown-component.md#register-the-component).

## Run the build as the migration check

After the manifest is regenerated, the build validates every entry not marked as a draft. If any entry has an invalid field, the build fails with one error that lists each invalid field.

To run the migration and check it, follow these steps:

1. In the project directory, run the script:

   ```sh
   node scripts/migrate-content.mjs
   ```

   The script prints each markdown file it writes and each one it skips, with the reason. It passes over any other file silently.

2. In the project directory, regenerate the manifest:

   ```sh
   npx cairn-manifest
   ```

   The committed manifest no longer matches the new files, and a build on a stale manifest fails with an error that names this command. For more information, see [`cairn-manifest`](../reference/cli-cairn-manifest.md).

3. In the project directory, build the site:

   ```sh
   npm run build
   ```

4. If the build lists invalid frontmatter, fix each listed field in the script, not in the written file.

   The error opens with a count line and then lists each invalid field in the form `<dir>/<id>: <field>: <message>`:

   ```text
   cairn: 1 invalid frontmatter field(s):
     src/content/posts/2024-02-30-my-trip: date: Date must be a valid date (YYYY-MM-DD)
   ```

5. If you changed the script, delete each file that the last run printed as written to `TO`.

   The script overwrites a file only when the new id matches. A fix that changes an id would otherwise leave the earlier file beside the new one.

6. If you changed the script, repeat these steps from the first step.

For the migration's causes of a listed field, see [Diagnose a failed check](#diagnose-a-failed-check). An invalid draft never fails the build, though the index still leaves it out. To find one, see [Verify the migrated entries](#verify-the-migrated-entries).

- To let the build pass while entries still fail, in the module that calls `createSiteIndexes`, pass `{ validate: false }` as the call's fourth argument.

With validation off, each invalid entry drops from the site with no error.

- Once every migrated entry validates, remove `{ validate: false }` from the `createSiteIndexes` call.

For the signature, see [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes). For the module that calls it, see [Build one typed index](build-the-public-routes.md#build-one-typed-index).

## Verify the migrated entries

The content index records each entry that fails its validator as a content problem, with its field errors, and leaves it out of the site.

To verify the migration, follow these steps:

1. In the module that calls `createSiteIndexes`, add a temporary line that logs each migrated concept's problems, such as `console.log(indexes.posts.problems());`.

   On a scaffolded site, that module is `src/chassis/content.ts`, which holds the result as `indexes`.

2. In the project directory, run `npm run build`.
3. In the build output, confirm that each logged list is empty.

   Each listed problem names the entry's `id`, its `draft` flag, and its field `errors`. A listed entry with `draft: true` passed the build but still fails its validator. For the problem's shape, see the [delivery data types](../reference/delivery-data.md#types).

4. In the same module, remove the logging line.
5. In the project directory, run `npx cairn-manifest`.
6. In its output, confirm that no `content.field_undeclared` warning names a key you meant to keep.

   For the warning's fields, see [Log events](../reference/log-events.md).

7. In the project directory, run `npm run dev`.
8. In a browser, open a migrated entry at its permalink.
9. On the page, confirm that its images load and that no shortcode shows as literal text.

## Diagnose a failed check

A failed check usually traces to a migrated file's name, one of its frontmatter values, or a block in its body. Work through the following checks in order:

1. If the script prints `Skipped` for a file, fix the old file or the helper that the reason names.

   The script skips a file that has no date, an off-shape or duplicate id, or frontmatter that `parseMarkdown` can't parse.

2. If a migrated entry's body starts with a `+++` block, convert the old file's TOML frontmatter to YAML before the next run.

   `parseMarkdown` reads a TOML block as empty frontmatter and leaves the block in the body. The script still writes such a file when its filename carries a date.

3. If the build fails on a stale content manifest, run `npx cairn-manifest` again.
4. If the build stops with a list of invalid fields, fix each one in the script.

   The following causes are specific to a migration:

   - A listed `date` field means the date the script took isn't a real calendar date, or falls outside the field's `min` or `max`. A date that isn't real came from an old value that YAML kept as a string, or from the filename. An unquoted impossible date such as `2024-13-45` parses as a rolled-over `Date`, here `2025-02-14`. The script writes that real day, and it passes the field's calendar-date check. For more information, see [Write dates as `YYYY-MM-DD`](#write-dates-as-yyyy-mm-dd).
   - A text field listed as required, though the old file had a value, means that value wasn't a string or never reached the field. A value that isn't a string may have been a list, or an unquoted number, date, or boolean. A value that never reached the field sat under a key `toFrontmatter` doesn't map, since the script writes only `title`, `date`, `description`, `draft`, and `tags`. For more information, see [Quote values for text fields](#quote-values-for-text-fields).

   For the other causes, see [Diagnose a failed build](build-the-public-routes.md#diagnose-a-failed-build).

5. If the build fails because a permalink resolves to two entries, rename one of the two files.

   Two dated files with one slug collide under a permalink without a date token, such as the default `/posts/:slug` for a `posts` concept.

6. If an entry is missing from the site while the build passes, check whether it's an invalid draft or `validate: false` is still set.

   For more information, see [Verify the migrated entries](#verify-the-migrated-entries).

7. If a `cairn:` link to a migrated entry finds no target, check the entry's stem against the id shape.

   For more information, see [Reduce each stem to the id shape](#reduce-each-stem-to-the-id-shape).

8. If a shortcode renders as literal text, rewrite it in `toBody` as a container directive.

   For more information, see [Replace shortcodes with components](#replace-shortcodes-with-components).

For render failures, see the rendering checks in [Write a markdown component](write-a-markdown-component.md#diagnose-a-failed-check). For the engine's structured log records, see [Debug your site](debug-your-site.md).

## See also

The following pages cover what this migration depends on and the links between migrated entries:

- [Define an adapter and schema](define-an-adapter-and-schema.md): declaring the target concepts and their fields.
- [Content model](content-model.md): entry identity and the frontmatter keys the engine reads.
- [Write a markdown component](write-a-markdown-component.md): the components that replace shortcodes.
- [Configure media](configure-media.md): turning media on before moving images.
- [Link content with references](link-content-with-references.md): linking migrated entries with `cairn:` links.
- [Build the public routes](build-the-public-routes.md): the index and routes that read migrated entries.
- [`parseMarkdown`](../reference/core.md#parsemarkdown): the parser the script reads each old file with.
