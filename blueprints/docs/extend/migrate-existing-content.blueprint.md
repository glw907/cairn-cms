---
page: Migrate existing content
type: task guide
exemplar: extenders/astro-v5-upgrade
---

# Migrate existing content

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn, who has an existing site's markdown, from a static site generator such as Jekyll, Hugo, or Eleventy or from a hand-built markdown site, and wants it in the site's concepts. :fact[ht7tdd]

**Why they arrive:**
- They have the old site's files and need each one moved into a concept so that it keeps a stable id, validates against the concept's fields, and can be the target of a `cairn:` link. :fact[46edxb] :fact[kv3qen] :fact[nhjraz]
- They copied old files in by hand, and the build stopped or an entry went missing from the site. The page's failure section maps each symptom to its cause. :fact[kv3qen] :fact[fdtgh5]
- They want to know what happens to the old site's images and shortcodes. The body section answers both. :fact[xl7d9s] :fact[tg9e0z]

**What they already know.** Node.js ES-module scripts that read and write files, regular expressions, YAML frontmatter, and the old site's conventions, such as its shortcodes and how it spells drafts and dates. The page doesn't explain these.

**What the page does for them.** The introduction opens on the reader's situation. An old site's markdown file already has a cairn entry's shape: a frontmatter block over a markdown body. The differences sit in the filename, the frontmatter, and the body. The filename becomes the entry's id. The frontmatter is read against the concept's fields. The body's old shortcodes and image URLs each need a decision. :fact[46edxb] :fact[ggzzur] :fact[tg9e0z]
It gives the model next. cairn ships no importer, and the conversion is a short script the developer writes. The build and the admin both read a committed file with `parseMarkdown`. A script that reads old files with it sees each value typed the way they will. The build then checks every migrated entry against its concept. :fact[7mq2xa] :fact[qd7iat] :fact[g8rbmt] :fact[kv3qen]
The contract sentence follows, as a statement: this page builds one script that converts each old file so that its entry keeps a stable id, validates, and can be linked, and then uses the build to find each entry that still fails. :fact[46edxb] :fact[kv3qen] :fact[nhjraz]
One sentence warns a Hugo reader that `parseMarkdown` reads only YAML between `---` lines, so a TOML block between `+++` lines is converted to YAML first. :fact[p4tg0n] :fact[ht7tdd]

**What it leaves to other pages, each named in the introduction:**
- Declaring the target concepts and their fields belongs to Define an adapter and schema.
- Writing and registering the component that replaces a shortcode belongs to Configure rendering.
- What the save-time validation checks belongs to Content model.
- Turning media on belongs to Configure media.
- Rewriting the old site's internal links as `cairn:` links belongs to Link content with references.
- Redirects from the old site's addresses are named as left out, without a link or a claim about how a site serves them.
:::

:::constraints
- Name the adapter module and the module that calls `createSiteIndexes` by their roles. Give `src/theme/cairn.config.ts` and `src/chassis/content.ts` as where a scaffolded site keeps them, and give no path for any other site. :fact[jfuzxf] :fact[k8vd2e]
- Teach neither concept declaration, component registration, nor save-time validation. Each gets one sentence and a link at the step that needs it.
- Frame the script as an example the reader adapts. It targets a dated `posts` concept that declares `title`, `date`, `description`, `draft`, and `tags`.
- Say nothing about how a site redirects an old address.
- Claim nothing about a log or the build reporting a `draft` value that isn't the boolean `true`.
- Describe the Library upload by what it does, not as a walkthrough from the editor's seat.
:::

## Before you begin

*Name what the site needs before the script can write into it.*

- Before you write the script, the site needs the following:
- Each target concept declared in the adapter module, which a scaffolded site keeps at `src/theme/cairn.config.ts`, with a field for each frontmatter key the migration keeps. An admin save deletes a key the concept doesn't declare. :fact[jfuzxf] :fact[ggzzur]
- See [Add a concept](define-an-adapter-and-schema.md#add-a-concept).
- If the old site has drafts, a `boolean` field named `draft` on that concept, which the edit page renders as its **Hidden** toggle. :fact[69j91g] :fact[ggzzur]
- See [Frontmatter keys the engine reads](content-model.md#frontmatter-keys-the-engine-reads).
- Each concept's glob passed to `createSiteIndexes` and listed in the `cairnManifest` plugin's `content` option. A scaffolded site calls `createSiteIndexes` in `src/chassis/content.ts`. :fact[pdgkex] :fact[n0laoh] :fact[k8vd2e]
- If the old bodies use shortcodes, a registered component for each one. :fact[tg9e0z]
- See [Register the component](configure-rendering.md#register-the-component).
- The old site's markdown files copied into a directory of the project outside `src/content`, such as `old-content/posts`.

## Write the migration script

*Give the reader one working script first, so every later section is a change to one of its helpers.*

- cairn ships no importer. You move the old files with a short script that reads each one through `parseMarkdown`. :fact[7mq2xa] :fact[qd7iat]
- `parseMarkdown` returns `frontmatter` with the YAML values already typed: an unquoted date or timestamp arrives as a `Date`. It returns `body` starting on the line after the closing `---`. :fact[w77gj8]
- The function an admin save writes an entry file with isn't exported. The script writes the `---` block itself. :fact[3r6rqn]
- The script writes each value with `JSON.stringify`, and `parseMarkdown` reads the result back as the same string, list, or boolean. :fact[j6yq1s]
- When `parseMarkdown` can't parse a frontmatter block, it throws. The script catches the error and skips the file with its message. :fact[p4tg0n]
- To write the script, follow these steps:
1. In the project directory, create `scripts/migrate-content.mjs` with the following script.
- Code: the whole script, which ran against sample old files. It reads each `.md` file in `FROM`, builds the id and the frontmatter, rewrites one shortcode, and writes the entry to `TO`. :fact[qd7iat] :fact[w77gj8] :fact[3r6rqn] :fact[ilcgl4] :source[/src/lib/content/frontmatter.ts#parseMarkdown]

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

2. In the script, set `FROM` to the old files' directory, `TO` to the concept's `dir`, and `DATE_PREFIX` to the concept's `datePrefix`. :fact[d27z58]
- The script builds a dated id the way the admin's create dialog does: the date cut to the concept's `datePrefix`, a hyphen, then the slug. :fact[ilcgl4]
- The script targets a dated concept. For a concept that isn't dated, such as one with `routing: 'page'`, set the id to the stem, drop the date check, and leave `date` out of `toFrontmatter`. :fact[s2zbzm]
- The following sections each adapt one part of the script:
- [Name each file by its id](#name-each-file-by-its-id) adapts `toSlug`, `DATE_PREFIX`, and the `id` line.
- [Convert the frontmatter](#convert-the-frontmatter) adapts `toFrontmatter` and `toDay`.
- [Convert the body markup](#convert-the-body-markup) adapts `toBody`.
- The script converts one concept per run. A second concept takes a second run with that concept's `FROM`, `TO`, `DATE_PREFIX`, and key mapping.

## Name each file by its id

*Settle each entry's filename first, since the id is fixed before the script writes anything.*

- An entry's id is its filename stem, verbatim, and the file on disk is the id plus `.md`. A dated concept's filename starts with a date, which the URL slug strips. :fact[z68na4] :fact[46edxb]
- See [Entry identity](content-model.md#entry-identity).

### Match the date prefix to the concept

*Show how an old date prefix of another length leaks into the URL, and the setting that prevents it.*

- cairn strips a leading date from the slug only at the concept's `datePrefix` granularity. :fact[grhib4]
- Old filenames can carry a full day, another granularity, or no date. Under `datePrefix: 'month'`, `2024-03-15-my-trip.md` strips only `2024-03-`, so the slug is `15-my-trip`. Nothing throws, and the build doesn't fail. :fact[grhib4]
- In the script, set `DATE_PREFIX` to the concept's `datePrefix`, and the `id` line cuts the entry's date to that length. :fact[ilcgl4] :fact[d27z58]
- See [Set the permalink and date prefix](define-an-adapter-and-schema.md#set-the-permalink-and-date-prefix).

### Reduce each stem to the id shape

*Show which stems a link can't reach, and how the script repairs them.*

- An id is lowercase letters and digits, joined by single hyphens. A stem outside that shape still serves its page, but a `cairn:` link can't target it, and the admin's rename and delete actions refuse it. :fact[nhjraz]
- Old filenames can carry capital letters, spaces, or other characters, such as `My_Trip.md`. :fact[nhjraz]
- In the script, keep `toSlug` and the `ID_SHAPE` check. They lowercase and hyphenate each stem, and skip a file whose id is still off shape or already written. :fact[nhjraz]

## Convert the frontmatter

*Explain the rule every frontmatter change follows, then give each change as an old form and its fix.*

- An admin save keeps a frontmatter key only when the concept declares it, and each declared field reads its value in one form. :fact[ggzzur] :fact[gh4ckg]
- Each subsection names the line of `toFrontmatter` it changes.

### Declare or drop every old key

*Have the reader decide each old key before anything else, since an undeclared key is lost on the first save.*

- The first time an editor saves an entry, the admin writes its frontmatter from the validated fields and deletes each key the concept doesn't declare. :fact[ggzzur]
- Old frontmatter often carries keys the old site's templates read, such as `layout`, `aliases`, or `summary`.
- To decide each old key, follow these steps:
1. In the adapter module, declare a field for each old key the site still needs. :fact[ggzzur]
2. In the script's `toFrontmatter`, map each kept key onto its field, and leave out the rest.
- The script's `description` line shows the pattern: it takes the old `summary` when the file has no `description`.
- See [Add a concept](define-an-adapter-and-schema.md#add-a-concept).
- Building the manifest logs a `content.field_undeclared` warning that names each concept's undeclared keys. [Verify the migrated entries](#verify-the-migrated-entries) checks for this warning. :fact[3ikjaa] :fact[r5wm3c]

### Write dates as `YYYY-MM-DD`

*Show the date form a date field accepts and the time-zone shift an old timestamp causes.*

- A `date` field accepts a calendar date in `YYYY-MM-DD` form. A string with a time part fails with the field's label followed by `must be a valid date (YYYY-MM-DD)`. :fact[ivhuyc]
- Old dates often carry a time and an offset, such as `2024-03-15 20:00:00 -08:00`. :fact[ivhuyc]
- An unquoted timestamp arrives as a `Date`, and the field takes the `Date`'s UTC day. An evening time west of UTC therefore lands on the next day. :fact[w77gj8] :fact[ivhuyc]
- The script's `toDay` writes the day as a quoted `YYYY-MM-DD` string. It takes a `Date`'s UTC day, as the field does, and reproduces the shift. :fact[ivhuyc]
- If the old filenames carry the intended day, change the `date` line to `fm.date = toDay(filename) ?? toDay(old.date);`. An offset timestamp then can't move the entry.
- A `datetime` field takes the trimmed string as written, with no format check. :fact[ivhuyc]
- The script has no `datetime` handling. An unquoted timestamp arrives as a `Date`, and `JSON.stringify` writes it as a UTC string that loses the offset. :fact[w77gj8]
- For a `datetime` field, take the timestamp from the old file's raw text or rebuild it with its offset. Write it as a quoted string.

### Mark drafts with `draft: true`

*Show the one draft form cairn reads, and why the concept must declare it.*

- An entry is a draft only when its frontmatter holds the boolean `draft: true`. Any other value, or no key, reads as published. :fact[0nw43j]
- An old site can mark a draft as `draft: "true"`, `draft: yes`, or, in Jekyll, `published: false`. Each of those reads as published. :fact[0nw43j] :fact[p4tg0n]
- In the script's `toFrontmatter`, write `draft: true` for each draft marker the old site uses. The script already writes it for Jekyll's `published: false`. :fact[0nw43j]
- The concept must declare `draft` as a `boolean` field. Otherwise the first admin save deletes the key, and the entry reads as published. For more information, see [Declare or drop every old key](#declare-or-drop-every-old-key). :fact[ggzzur] :fact[0nw43j]

### Map tags to the vocabulary

*Show how old free-text tags meet a configured tag vocabulary.*

- A tag vocabulary's values are lowercase hyphenated slugs. Once the site configures one, an admin save adds only vocabulary values to the concept's taxonomy field. :fact[2p519o]
- Old tags are often free text, such as `Travel Notes`. An entry's existing tag outside the vocabulary is kept as an orphan, not refused. :fact[2p519o]
- In the script's `toFrontmatter`, convert each tag with `toSlug` and write the list under the name of the concept's taxonomy field. The script's field is `tags`, and a concept may name its taxonomy field differently.
- See [Mark the tag field](define-an-adapter-and-schema.md#mark-the-tag-field).

### Quote values for text fields

*Show which old values a text field reads as empty, and the conversion that keeps them.*

- A text, textarea, select, url, or email field reads an unquoted number, date, or boolean as empty. :fact[gh4ckg]
- Old frontmatter such as `year: 1984` parses as a number. A required field then fails validation, and an optional one is dropped on the next save. :fact[gh4ckg]
- In the script's `toFrontmatter`, pass each number or boolean through `String()`, and each date through `toDay`. `frontmatterBlock` then writes the value quoted. :fact[gh4ckg]
- The `title` and `description` lines already pass their values through `String()`.

## Convert the body markup

*Explain that the body arrives as written, so its images and shortcodes each need a decision.*

- The script copies each body as `parseMarkdown` returns it, apart from the one shortcode `toBody` rewrites. Old image addresses and every other shortcode reach the entry as written. :fact[w77gj8]

### Keep or move old images

*Show what an old image address does after migration and what moving it into the Library takes.*

- The render pipeline rewrites an image's address only when it's a `media:` reference. An old image address left in a body keeps pointing where it did. :fact[xl7d9s]
- While the old address still serves the image, leave it in place. :fact[xl7d9s]
- To move an image into the Library instead, follow these steps:
1. In the admin's Library, upload the image. :fact[xjdhau]
2. In the entry's body, replace the old address with the image's `media:` reference. :fact[xjdhau]
- The Library takes one file per upload. :fact[xjdhau]
- See [Configure media](configure-media.md).

### Replace shortcodes with components

*Show the one directive form a registered component answers to, and the script helper that writes it.*

- A site's reusable body block is a registered component, invoked as a container directive such as `:::note`. A leaf directive (`::note`) or a text directive (`:note`) renders as its literal source text. :fact[tg9e0z]
- Old bodies carry the old site's block syntax, such as Hugo's `{{< note >}}` or a Jekyll `{% include %}`.
- In the script's `toBody`, rewrite each shortcode as a container directive that names its registered component. :fact[tg9e0z]
- The script's one rule turns `{{< note >}}` into `:::note`.
- See [Register the component](configure-rendering.md#register-the-component).

## Run the build as the migration check

*Walk the reader through running the script and reading the build's verdict on what it wrote.*

- After the manifest is regenerated, the build validates every entry not marked as a draft. If any has an invalid field, the build fails with one error that lists each one. :fact[kv3qen] :fact[6e8kwx]
- To run the migration and check it, follow these steps:
1. In the project directory, run `node scripts/migrate-content.mjs`. The script prints each `.md` file it writes and each `.md` file it skips, with the reason. It passes over any other file silently.
2. In the project directory, run `npx cairn-manifest` to regenerate the manifest. :fact[r5wm3c]
- The committed manifest no longer matches the new files, and a build on a stale manifest fails with an error that names this command. :fact[fdtgh5] :fact[6e8kwx]
- See [`cairn-manifest`](../reference/cli-cairn-manifest.md).
3. In the project directory, run `npm run build`.
4. If the build lists invalid frontmatter, fix each listed field in the script, not in the written file. :fact[kv3qen]
- Code: the build error for one invalid date, with its count line and one indented line per invalid field in the form `<dir>/<id>: <field>: <message>`. :fact[kv3qen] :fact[ivhuyc] :source[/src/lib/delivery/site-resolver.ts#createSiteResolver]

```text
cairn: 1 invalid frontmatter field(s):
  src/content/posts/2024-02-30-my-trip: date: Date must be a valid date (YYYY-MM-DD)
```

5. Delete each file the last run printed as written to `TO`.
- The script overwrites a file only when the new id matches. A fix that changes an id would leave the earlier file beside the new one.
6. Repeat these steps from step 1.

- [Diagnose a failed check](#diagnose-a-failed-check) gives the migration's causes for a listed field. :fact[kv3qen]
- An invalid draft never fails the build, though the index still leaves it out. [Verify the migrated entries](#verify-the-migrated-entries) shows how to find it. :fact[kv3qen]
- To let the build pass while entries still fail, pass `{ validate: false }` as the fourth argument of `createSiteIndexes`. :fact[kv3qen]
- With validation off, each invalid entry drops from the site with no error. Remove the option once the list is empty. :fact[kv3qen]
- See [`createSiteIndexes`](../reference/delivery-data.md#createsiteindexes).
- See [Build one typed index](build-the-public-routes.md#build-one-typed-index).

## Verify the migrated entries

*Have the reader confirm what the build lets through: invalid drafts, dropped keys, and the rendered body.*

- The content index records each entry that fails its validator as a content problem, with its field errors, and leaves it out of the site. :fact[4ikssa] :fact[c3pr9b]
- To verify the migration, follow these steps:
1. In the module that calls `createSiteIndexes`, add a temporary line that logs each migrated concept's problems, such as `console.log(indexes.posts.problems());`. :fact[k8vd2e] :fact[kv3qen]
2. In the project directory, run `npm run build`.
3. In the build output, confirm that each logged list is empty. :fact[c3pr9b]
- A listed entry with `draft: true` passed the build but still fails its validator. :fact[c3pr9b] :fact[kv3qen]
- See [Types](../reference/delivery-data.md#types).
4. In the same module, remove the logging line.
5. In the project directory, run `npx cairn-manifest`. :fact[r5wm3c]
6. In its output, confirm that no `content.field_undeclared` warning names a key you meant to keep. :fact[3ikjaa]
- See [Log events](../reference/log-events.md).
7. In the project directory, run `npm run dev`.
8. In a browser, open a migrated entry at its permalink.
9. On the page, confirm that its images load and that no shortcode shows as literal text. :fact[xl7d9s] :fact[tg9e0z]

## Diagnose a failed check

*Trace each failed check to the part of the file that caused it: its name, a frontmatter value, or a body block.*

- Work through the following checks in order:
1. If the script prints `Skipped` for a file, fix the old file or the helper the reason names. The script skips a file that has no date, an off-shape or duplicate id, or frontmatter that `parseMarkdown` can't parse. :fact[p4tg0n]
2. If a migrated entry's body starts with a `+++` block, convert the old file's TOML frontmatter to YAML, and run the script again. :fact[p4tg0n]
- `parseMarkdown` reads a TOML block as empty frontmatter and leaves it in the body. An old file with a dated filename is still written. :fact[p4tg0n]
3. If the build fails on a stale content manifest, run `npx cairn-manifest` again. :fact[fdtgh5]
4. If the build stops with a list of invalid fields, fix each one in the script. :fact[kv3qen]
- A listed `date` field means the date the script took, from an old value that YAML kept as a string or from the filename, isn't a real calendar date, such as `2024-02-30`, or falls outside the field's bounds. An unquoted impossible date such as `2024-13-45` parses as a rolled-over `Date` (here `2025-02-14`), so the script writes that real day and the field never reports it as an invalid date. See [Write dates as `YYYY-MM-DD`](#write-dates-as-yyyy-mm-dd). :fact[ivhuyc]
- A text field listed as required, though the old file had a value, means the value was an unquoted number, date, or boolean. See [Quote values for text fields](#quote-values-for-text-fields). :fact[gh4ckg]
- See [Diagnose a failed build](build-the-public-routes.md#diagnose-a-failed-build).
5. If the build fails because a permalink resolves to two entries, rename one of them. Two dated files with one slug and different dates collide under a permalink without a date token, such as the default `/posts/:slug` for a `posts` concept. :fact[ky39tz] :fact[grhib4] :fact[d27z58]
6. If an entry is missing from the site while the build passes, check whether it's an invalid draft or `validate: false` is still set. See [Verify the migrated entries](#verify-the-migrated-entries). :fact[kv3qen]
7. If a `cairn:` link to a migrated entry finds no target, check the entry's stem against the id shape. See [Reduce each stem to the id shape](#reduce-each-stem-to-the-id-shape). :fact[nhjraz]
8. If a shortcode renders as literal text, rewrite it as a container directive. See [Replace shortcodes with components](#replace-shortcodes-with-components). :fact[tg9e0z]
- For render failures, see the rendering checks in [Configure rendering](configure-rendering.md#diagnose-a-failed-check).
- For the engine's structured log records, see [Debug your site](debug-your-site.md).

## See also

*Point the reader to the pages that cover what this migration depends on.*

- The following pages cover the concepts, rendering, media, and routes this migration depends on:
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [Content model](content-model.md).
- See [Configure rendering](configure-rendering.md).
- See [Configure media](configure-media.md).
- See [Link content with references](link-content-with-references.md).
- See [Build the public routes](build-the-public-routes.md).
- See [`parseMarkdown`](../reference/core.md#parsemarkdown).
