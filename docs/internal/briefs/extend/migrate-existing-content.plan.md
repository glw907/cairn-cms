# Page plan: Migrate existing content

Page: `docs/extend/migrate-existing-content.md`. Page type: task guide. Status: new page, no prior
version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and each
fact's placement. The structural edit seat reads it before any prose exists. The plan is Google's
outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's narrative,
and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`migrate-existing-content`: job, covers, out-of-scope list, exemplars); "The page anatomies", "The
introduction", and "Structure" in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/extend.md`; the two exemplars (`extenders/astro-v5-upgrade`,
`extenders/django-custom-management-commands`); the reference entries each link names
(`docs/reference/core.md` `parseMarkdown`; `docs/reference/delivery-data.md` `createSiteIndexes` and
"Types"; `docs/reference/cli-cairn-manifest.md`; `docs/reference/log-events.md`, the
`content.field_undeclared` row); the sibling pages `docs/extend/add-cairn-to-a-sveltekit-app.md`
("Add the first entry", "Index the content and commit its manifest", "Resolve a content build
failure"), `docs/extend/define-an-adapter-and-schema.md` ("Add a concept", "Set the permalink and date
prefix", "Mark the tag field"), `docs/extend/content-model.md` ("Frontmatter keys the engine reads",
"Entry identity"), `docs/extend/configure-rendering.md` ("Declare a component", "Register the
component", "Diagnose a failed check"), `docs/extend/configure-media.md`, and
`docs/extend/link-content-with-references.md` ("`cairn:` body links and reference fields"),
`docs/extend/build-the-public-routes.md` ("Build one typed index", "Diagnose a failed build"; read in
the structural-edit revision, for the outline's crossLink); and the
code the facts cite (`src/lib/index.ts:53`, `src/lib/content/frontmatter.ts:206-214,387-398`,
`src/lib/content/ids.ts`, `src/lib/content/fieldset.ts:113-122,197-199,255-315`,
`src/lib/delivery/site-indexes.ts`, `src/lib/delivery/site-resolver.ts:48-72`,
`src/lib/delivery/content-index.ts#createContentIndex`, `src/lib/delivery/manifest.ts#buildSiteManifest`,
`src/lib/content/manifest.ts:399-403`, `src/lib/vite/internal.ts:67-95`,
`templates/waymark/src/chassis/content.ts`, `templates/waymark/src/theme/cairn.config.ts:74-100`).

Evidence this plan ran, so the drafter can rely on it: the script below ran on 2026-10-12 against
three sample old files (a Jekyll-style dated file with a timestamp, tags, an undeclared key, a Hugo
`note` shortcode, and an old image URL; an undated file with `published: false`; a file with
malformed YAML), importing `parseMarkdown` from the built root barrel, and a `defineFieldset`
validator read its output. It wrote `2024-03-16-my-trip.md` and `2023-01-02-hello.md`, skipped the
malformed file with the parser's message, and the validator confirmed `f:ivhuyc` (a time part fails
with `Date must be a valid date (YYYY-MM-DD)` for a field labeled Date) and `f:gh4ckg` (an unquoted
`year: 1984` on a required text field reads `Year is required`). A bare `import { parseMarkdown } from
'@glw907/cairn-cms'` also ran in plain Node from `examples/showcase`.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

A migration is three conversions of one file, its name, its frontmatter, and its body, made by a
script the developer writes, with the build as the check that every converted file fits its concept.
The page's spine follows that file: one working script first, then the incompatibilities in the
order the script meets them (filename, frontmatter, body), then the build that judges the result,
then the verification and the failure path the task-guide anatomy requires.

The reader is a Svelte-fluent developer moving an organization's existing site (Jekyll, Hugo,
Eleventy, or a hand-rolled markdown site) onto cairn, on either a scaffolded site or the add-cairn
tutorial's site. They know their old site's conventions and Node scripting; they do not yet know
which of those conventions cairn reads differently. The page's value is the list of differences, each
paired with its fix, so a reader can scan for the ones their old content has.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (`f:qd7iat`, `f:z68na4`, `f:q07rd5`): cairn ships no
   importer; an entry is a markdown file whose name is its id; the migration is a script of the
   reader's own; and the build checks the result. Without the model, the pair sections read as an
   unrelated list of gotchas rather than the three parts of one file.
2. **Before you begin** names the concepts and the content wiring the script writes into, each with
   a link to the page that produces it, and the old files' location. The script cannot map a key to
   a field the concept has not declared, so the declaration precedes the script.
3. **Write the migration script** (cover 1) comes before any incompatibility, the Django exemplar's
   take: the full working script carried as one example, with its file location first, and every
   later section a variant of one of its helpers. A reader with ordinary content runs it after one
   reading; a reader with unusual content adapts the helper the matching section names. Placing the
   script last, after the pairs, would make the reader assemble it from fragments.
4. **Name each file by its id** (cover 2) is the first pair section because the id is the one
   identity the entry keeps (`f:z68na4`), and the script computes it before it writes anything.
5. **Convert the frontmatter** (covers 3 and 5, merged) follows the filename because the script's
   `toFrontmatter` builds the whole block in one place. Its five pairs run in the order the script
   makes its decisions: which keys survive at all (cover 5's first trap, `f:ggzzur`), then the three
   values with one fixed form (cover 3: dates, drafts, tags), then the rule for every remaining
   text-like value (cover 5's second trap, `f:gh4ckg`). "Declare or drop every old key" comes first
   among them because "Mark drafts with draft: true" depends on it: an undeclared `draft` key is
   deleted on the first save.
6. **Convert the body markup** (cover 4) follows the frontmatter because the body is the second half
   of `parseMarkdown`'s return and the last thing the script writes.
7. **Run the build as the migration check** (cover 6) follows every conversion: it is where the
   reader runs the script, regenerates the manifest, and reads the build's list of invalid fields.
   It carries the steps that run the migration, so no earlier section asks the reader to run it.
8. **Verify the migrated entries** (cover 7) is the anatomy's verification section (item 4). It
   catches what the build lets through: invalid drafts and keys the manifest build names.
9. **Diagnose a failed check** is the anatomy's failure-path slot (item 5), mapping each symptom to the
   section that fixes it, and pointing the build's invalid-field list at its recovery row,
   `docs/extend/build-the-public-routes.md#diagnose-a-failed-build`.
10. **See also** closes the page (item 6).

### Cross-links the outline requires, and where each lands

`docs/internal/outlines/extend.json` gives this page three crossLinks. Each lands at the step that
needs it and again in See also:

- `content-model` ("The id and date rules the migration satisfies"): "Name each file by its id" and
  See also, at `docs/extend/content-model.md#entry-identity`.
- `configure-rendering` ("Replacing old shortcodes with components"): "Replace shortcodes with
  components", "Diagnose a failed check", and See also.
- `build-the-public-routes` ("The build validation that checks migrated frontmatter"): "Run the build
  as the migration check" links `docs/extend/build-the-public-routes.md#build-one-typed-index` where
  it names the module that calls `createSiteIndexes`; "Verify the migrated entries" links the same
  anchor in step 1; "Diagnose a failed check" points the build's invalid-field list at
  `docs/extend/build-the-public-routes.md#diagnose-a-failed-build`; See also links the page with the
  outline's reason.

### Departures from the outline's covers order, with the reason for each

- Cover 5 ("Frontmatter traps") moves up beside cover 3 and merges with it into "Convert the
  frontmatter". Both are decisions inside the script's one frontmatter function, and the first trap
  (undeclared keys deleted) governs cover 3's draft fix, so it must come first, not two sections
  later. The covers order would also split the frontmatter around the body section.
- Cover 4 ("Old body markup") therefore follows the merged frontmatter section instead of sitting
  between its halves.
- Cover 7 splits into the verification section and the failure-path section, the anatomy's items 4
  and 5.

### Exemplar takes, and where each lands

- **Astro, upgrade to v5.** The fixed pair per incompatibility: what differs in the old content, then
  what to do. It lands as every H3 under "Name each file by its id", "Convert the frontmatter", and
  "Convert the body markup": each opens on cairn's rule (its first sentence), states in one or two
  sentences how the old content differs, then gives the fix as a step naming the script helper it
  changes. The register forbids question headings ("No question or teaser headings"), so "What
  should I do?" is not a heading: the fix is the H3's closing step, and each H3 heading names the
  action, a bare infinitive. Left behind: the length and the package-manager tabs.
- **Django, custom management commands.** The file-location tree before the code, the full working
  script carried through as one example, then variants. It lands in "Write the migration script"
  (the tree, then the whole script), and every pair section's fix is a variant of one named helper.
  Left behind: the class reference, which stays on `docs/reference/`.

### Heading policy

H2 and H3 task headings start with a bare infinitive. "Before you begin" and "See also" are the
anatomy's fixed headings. No heading is a question. No page links to this one yet (it is new), so
every heading is free. The H3 "Write dates as YYYY-MM-DD" and "Mark drafts with draft: true" carry
the literal form in code font in the heading if the drafter's renderer allows code in headings, as
other extend pages do; otherwise plain.

## The introduction, in Google's three parts

No heading. It opens on a statement about the reader's situation, never an imperative and never the
page itself, and frames the page from above before the contract (register, "The introduction"). Two
or three paragraphs. The intro-framing step reasons the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** An existing site's markdown already
   holds most of what a cairn entry needs, and the differences sit in three places: the filename,
   the frontmatter, and the body. An entry's id is its filename stem, verbatim, the only identity
   cairn gives it (`f:z68na4`, scoped to that clause here; its home is "Name each file by its id").
   cairn ships no importer: the migration is a short script the developer writes, reading each old
   file with `parseMarkdown`, the parser cairn's own save path uses (`f:qd7iat`). The build then
   checks every migrated entry against its concept's fields (`f:kv3qen`, scoped: the build fails on
   invalid frontmatter).
2. **Who and why, with the contract.** The reader is a developer moving an organization's existing
   site onto cairn, on a scaffolded site, whose adapter is `src/theme/cairn.config.ts`, or on the
   add-cairn tutorial's site, whose adapter is `src/lib/cairn.config.ts` (`f:q07rd5`). The contract
   sentence, inside the framing: write one script that converts each old file so every migrated entry
   keeps a stable id from its filename, validates against its concept's fields, and can be the target
   of a `cairn:` link, then use the build to find each entry that still fails.
3. **Prior knowledge.** Node.js ES-module scripts (`node:fs/promises`), YAML frontmatter, the old
   site's own conventions (its shortcodes, its draft and date spellings), and a declared concept for
   each kind of old content.
4. **What the page does not cover, with the page that does (wrong-place routing).** Declaring the
   target concepts and their fields: `docs/extend/define-an-adapter-and-schema.md`. Declaring and
   registering the components that replace shortcodes: `docs/extend/configure-rendering.md`. Setting up
   media: `docs/extend/configure-media.md`. Rewriting the old site's internal links as `cairn:` links:
   `docs/extend/link-content-with-references.md#cairn-body-links-and-reference-fields`. Redirects from
   the old site's addresses: name it in words as left out, with no link and no claim about how a site
   does it. This sentence may name the page, since scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed the
provenance extractor with no row).

### Before you begin

**First sentence:** The script writes into concepts your adapter already declares, so declare each
target concept and its fields first.

**Facts:** `f:q07rd5` (the two adapter paths). Cited again: `f:ggzzur`, `f:0nw43j` (why `draft`
needs a declared field), without restating them here.

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- Each target concept declared in the adapter file, `src/theme/cairn.config.ts` on a scaffolded site
  or `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`), with a field for every
  frontmatter key the migration keeps. Link `docs/extend/define-an-adapter-and-schema.md#add-a-concept`.
- If the old site has drafts, a `boolean` field named `draft` on that concept. Link
  `docs/extend/content-model.md#frontmatter-keys-the-engine-reads` (opened and confirmed: it says
  `draft`, declared as a boolean field, is the edit page's **Hidden** toggle, and that a key survives
  an admin save only when declared). "Mark drafts with draft: true" says why.
- The site's content indexed with `createSiteIndexes` and checked by the `cairnManifest` plugin. Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest`.
- If the old bodies use shortcodes, each replacement component declared and registered. Link
  `docs/extend/configure-rendering.md#declare-a-component` and
  `docs/extend/configure-rendering.md#register-the-component`.
- The old site's markdown files copied into a directory of the project outside `src/content`, such as
  `old-content/posts`.

**Hand-off (no-claim):** "With the concepts declared, write the script."

### Write the migration script

**First sentence:** cairn ships no importer, so you move the old files with a short script that reads
each one through `parseMarkdown`.

**Facts:** `f:qd7iat`, `f:w77gj8`, `f:3r6rqn`.

Content:

- One or two sentences after the first, on what the script receives: `parseMarkdown` returns
  `frontmatter`, the YAML already typed, so an unquoted date or timestamp arrives as a `Date`, and
  `body`, everything after the closing `---` (`f:w77gj8`). Link `docs/reference/core.md#parsemarkdown`
  (opened and confirmed: it gives the `{ frontmatter, body }` signature and says reassembling a file
  is the engine's own save-path concern). Do not say the body always starts with a newline: it keeps
  the blank line after the closing `---` only when the old file has one (the plan's run).
- One sentence on the write side: the engine's serializer is not public, so the script writes the
  `---` block itself (`f:3r6rqn`). One sentence on how: `frontmatterBlock` writes each value with
  `JSON.stringify`, which YAML reads back as the same string, list, or boolean. Link the YAML 1.2
  specification's relation-to-JSON section for that (vendor link; the drafter confirms the URL,
  for example https://yaml.org/spec/1.2.2/#13-relation-to-json).
- The file tree before the code (Django take): the project root holding `old-content/posts/`,
  `scripts/migrate-content.mjs`, and `src/content/posts/`.
- A numbered list of two steps, lead-in "To write the script, follow these steps:" (no-claim):
  1. In the project directory, create `scripts/migrate-content.mjs` with the script below.
  2. In the script, set `FROM` to the old files' directory, `TO` to the concept's `dir`, and
     `DATE_PREFIX` to the concept's `datePrefix`.
- The script, one code block, its file named in the first-line comment. Use this one, which ran on
  2026-10-12 (the drafter may tighten names, never the behavior, and must rerun it on sample files
  from a directory where the package is installed, such as `examples/showcase`, before the page
  ships):

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

  The script targets a dated `posts` concept that declares `title`, `date`, `description`, `draft`,
  and `tags`. For a concept with no date prefix, such as `pages`, the id line drops the prefix; say so
  in one clause, with no claim beyond `f:46edxb` (the date prefix belongs to a dated concept).
- After the code, the Django "then variants" bridge: a bulleted list, lead-in "The following list
  names the section that adapts each part of the script:" (no-claim), one item per helper:
  `toSlug`, `DATE_PREFIX`, and the `id` line, "Name each file by its id"; `toFrontmatter` and `toDay`,
  "Convert the frontmatter"; `frontmatterBlock`, "Quote values for text fields"; `toBody`, "Convert the
  body markup". Name each section by heading.
- One sentence: the script converts one concept per run, so a second concept takes a second run with
  its own `FROM`, `TO`, `DATE_PREFIX`, and field map (no fact; the script's own shape).

**Hand-off (no-claim):** "Before you run it, adapt each helper to the old site, starting with the
filenames."

### Name each file by its id

**First sentence:** An entry's id is its filename stem, verbatim, and cairn gives the entry no other
identity.

**Facts:** `f:z68na4`, `f:46edxb`. Its H3s carry `f:grhib4` and `f:nhjraz`.

Content: one or two sentences, no steps. The filename is exactly the id plus `.md`, and a dated
concept's filename starts with a date that the URL slug strips (`f:46edxb`). Link
`docs/extend/content-model.md#entry-identity` (opened and confirmed: it states the id, the `${dir}/${id}.md`
path, the stripped prefix, and that the entry's date comes from its `date` field, not the filename).
Then the two pairs.

#### Match the date prefix to the concept

**First sentence:** cairn strips a leading date from the slug only at the concept's `datePrefix`
granularity.

**Facts:** `f:grhib4`.

The pair, in the Astro shape:

- What differs, one or two sentences: an old site's dated filenames carry a full day, another
  granularity, or no date at all. Under `datePrefix: 'month'`, `2024-03-15-my-trip.md` strips only
  `2024-03-`, so the slug is `15-my-trip`, and nothing throws or fails the build (`f:grhib4`).
- What to do, one step as a single bulleted item: in the script, set `DATE_PREFIX` to the concept's
  `datePrefix`, and the `id` line builds the prefix from the entry's date at that length. Link
  `docs/extend/define-an-adapter-and-schema.md#set-the-permalink-and-date-prefix` (opened and
  confirmed: it states the three values and the `'day'` default).

#### Reduce each stem to the id shape

**First sentence:** A stem of anything but lowercase letters, digits, and single inner hyphens still
serves its page, but a `cairn:` link cannot target it.

The sentence is 23 words; if it runs over, split after "page" and keep both halves.

**Facts:** `f:nhjraz`.

The pair:

- What differs, one sentence plus the guard clause: old filenames carry capital letters, the `_`
  character, or spaces, such as `My_Trip.md` (the tellgrader flags the plural noun for that
  character as a slop word, so the page avoids it too). The rename and delete guards cannot see such an entry either
  (`f:nhjraz`).
- What to do, one step as a single bulleted item: in the script, keep `toSlug` and the `ID_SHAPE`
  check, which lowercase and hyphenate each stem and skip, with a message, a stem still off shape or
  an id already written.

**Hand-off (no-claim):** "With the filenames settled, convert the frontmatter."

### Convert the frontmatter

**First sentence:** A frontmatter key survives only if its concept declares it, and each declared field
reads its value in one form.

**Facts:** `f:ggzzur`, `f:gh4ckg` (both scoped to this summary; their homes are the H3s below).

Content: the first sentence, then the five pairs in this order. Each pair names the line of
`toFrontmatter` it changes.

#### Declare or drop every old key

**First sentence:** An admin save deletes every frontmatter key the concept does not declare, the
first time an editor saves that entry.

**Facts:** `f:ggzzur`. Cited again: `f:3ikjaa` (its home is "Verify the migrated entries").

The pair:

- What differs: old frontmatter carries keys the old site's templates read, such as `layout`,
  `aliases`, or `summary`.
- What to do, a numbered list of two steps, lead-in "To decide each old key, follow these steps:"
  (no-claim, passes as the other lead-ins do):
  1. In the adapter file, declare a field for each old key the site still needs. Link
     `docs/extend/define-an-adapter-and-schema.md#add-a-concept`.
  2. In the script's `toFrontmatter`, map each kept key onto its field, as the script maps `summary`
     to `description`, and leave out every other key.
- One sentence: regenerating the manifest names each concept's undeclared keys in a
  `content.field_undeclared` warning, which "Verify the migrated entries" uses (`f:3ikjaa`). Name the
  section by heading.

#### Write dates as YYYY-MM-DD

**First sentence:** A `date` field accepts only a calendar date in `YYYY-MM-DD` form, and a value with
a time part fails validation.

**Facts:** `f:ivhuyc`. Cited again: `f:w77gj8` (an unquoted timestamp arrives as a `Date`).

The pair:

- What differs, two or three sentences: old dates often carry a time and an offset, such as
  `2024-03-15 20:00:00 -08:00`. A string with a time part fails with the field's label followed by
  `must be a valid date (YYYY-MM-DD)` (`f:ivhuyc`; give the message as the fact states it, the label
  as a placeholder). An unquoted timestamp arrives as a `Date`, and the field takes a `Date`'s UTC day
  (`f:w77gj8`, `f:ivhuyc`), so an evening time west of UTC becomes the next day: the plan's run turned
  `2024-03-15 20:00:00 -08:00` into `2024-03-16`. State the shift as a consequence of the two facts,
  in one sentence, no notice box (friction filed).
- What to do, one step as a single bulleted item: in the script's `toFrontmatter`, keep `toDay`, which
  writes the day as a quoted `YYYY-MM-DD` string. One variant sentence: for an old site whose
  filenames carry the intended day, call `toDay(filename)` before `toDay(old.date)`, so an offset
  timestamp cannot move the entry.
- One sentence on the contrast: a `datetime` field takes the trimmed string as written, with no format
  check (`f:ivhuyc`), so the script writes a timestamp for a `datetime` field as a quoted string.

#### Mark drafts with draft: true

**First sentence:** An entry is a draft only when its frontmatter holds `draft: true`; any other value,
or no key, reads as published.

**Facts:** `f:0nw43j`. Cited again: `f:ggzzur`.

The pair:

- What differs: old sites mark a draft as `draft: "true"`, `draft: yes`, or, in Jekyll,
  `published: false`, and each of those reads as published (`f:0nw43j`). Do not claim the validator or
  the build reports it; they do not (friction filed), and no fact states it either way.
- What to do, two sentences, the first a single-item step: in the script's `toFrontmatter`, write
  `draft: true` for each draft marker the old site uses, as the script does for `published: false`.
  Then the dependency on the earlier pair: the concept must declare `draft` as a `boolean` field, or
  the first admin save deletes the key and the entry reads as published (`f:ggzzur`, `f:0nw43j`).
  Name "Declare or drop every old key" by heading.

#### Map tags to the vocabulary

**First sentence:** Once the site config holds a tag vocabulary, a save adds only vocabulary values,
which are lowercase hyphenated slugs.

**Facts:** `f:2p519o`.

The pair:

- What differs: old tags are free text, such as `Travel Notes`. An existing tag outside the
  vocabulary is kept as an orphan, not refused (`f:2p519o`).
- What to do, one step as a single bulleted item: in the script's `toFrontmatter`, convert each tag
  with `toSlug` to the vocabulary's value form, and write the list under the name of the concept's
  taxonomy field. Link `docs/extend/define-an-adapter-and-schema.md#mark-the-tag-field` (opened and
  confirmed: it states the `taxonomy: true` marker, the vocabulary's `value` and `label`, the
  vocabulary-only save, and orphans). Say the script's field is `tags` and a concept may name its
  taxonomy field otherwise; do not name the scaffold's field (no fact here).

#### Quote values for text fields

**First sentence:** A text, textarea, select, url, or email field reads an unquoted number, date, or
boolean as empty.

**Facts:** `f:gh4ckg`.

The pair:

- What differs: old frontmatter like `year: 1984` or `version: 2.0` parses as a number. A required
  field then fails validation, and an optional one is dropped on the next save; only number, date,
  and datetime fields accept a parsed number or `Date` (`f:gh4ckg`).
- What to do, one step as a single bulleted item: in the script's `toFrontmatter`, pass each
  text-like value through `String()`, and `frontmatterBlock` then writes it quoted. Say that the
  script already does so for `title` and `description`.

**Hand-off (no-claim):** "With the frontmatter converted, turn to the body."

### Convert the body markup

**First sentence:** The script copies each body as `parseMarkdown` returns it, so old image URLs and
shortcodes each need a decision.

**Facts:** cited again: `f:w77gj8` (the body is everything after the closing `---`). The H3s carry
`f:xl7d9s`, `f:xjdhau`, and `f:tg9e0z`.

#### Keep or move old images

**First sentence:** An old image URL left in a migrated body renders unchanged, and cairn has no bulk
media importer.

**Facts:** `f:xl7d9s`, `f:xjdhau` (scoped: one file per upload; an asset is referenced by a `media:`
token resolved through its content hash).

The pair:

- What differs: the old bodies point at images by the old site's paths or another host.
- What to do, two sentences: leave each URL in place while it still serves the image (`f:xl7d9s`).
  To move an image into the media Library instead, upload it there, one file per upload, and replace
  its URL with the Library's `media:` reference (`f:xjdhau`). Link `docs/extend/configure-media.md`
  for turning media on. No editor walkthrough of the upload: name the editor documentation in words.

#### Replace shortcodes with components

**First sentence:** A site's own body block is a registered component, invoked only as a container
directive such as `:::note`.

**Facts:** `f:tg9e0z`.

The pair:

- What differs: the old bodies carry the old site's block syntax, such as Hugo's `{{< note >}}` or a
  Jekyll `{% include %}`. A leaf directive (`::note`) or a text directive (`:note`) renders as its
  literal source text (`f:tg9e0z`).
- What to do, one step as a single bulleted item: in the script's `toBody`, rewrite each shortcode as
  a container directive naming its registered component, as the script rewrites `{{< note >}}` to
  `:::note`. Link `docs/extend/configure-rendering.md#register-the-component` for the registration,
  and do not teach it.

**Hand-off (no-claim):** "With every part converted, run the script and let the build check the
result."

### Run the build as the migration check

**First sentence:** After the manifest is regenerated, the build fails with one error that lists each
invalid field of every non-draft entry.

**Facts:** `f:kv3qen`, `f:fdtgh5`.

A numbered list of four steps, one action each, the location first, lead-in "To run the migration and
check it, follow these steps:" (no-claim):

1. In the project directory, run the script: `node scripts/migrate-content.mjs`. It prints each file
   it writes and each it skips, with the reason (the script's own output).
2. In the project directory, regenerate the manifest with `npx cairn-manifest`. One sentence: the
   committed manifest no longer matches the new files, and a build on a stale manifest fails with an
   error naming this command (`f:fdtgh5`). Link `docs/reference/cli-cairn-manifest.md`.
3. In the project directory, run `npm run build`.
4. If the build fails on invalid frontmatter, fix each listed field in the script, not in the written
   file, and repeat from step 1. Show the line form, `<dir>/<id>: <field>: <message>` (`f:kv3qen`),
   with one example line built from the plan's run, such as
   `src/content/posts/2024-03-15-my-trip: date: Date must be a valid date (YYYY-MM-DD)`. Quote no count
   prefix: no fact states it. The page's own fixes for each listed field are in "Diagnose a failed
   check"; name it by heading.

Then two sentences after the steps:

- An invalid draft never fails the build, though the index still leaves it out (`f:kv3qen`); "Verify
  the migrated entries" finds it. Name the section by heading.
- The temporary escape: passing `{ validate: false }` as `createSiteIndexes`'s fourth argument, in the
  module that calls it, lets the build pass while entries still fail; every invalid entry then drops
  from the site with no error, so remove the option once the list is empty (`f:kv3qen`; friction
  filed). Link `docs/reference/delivery-data.md#createsiteindexes` (opened and confirmed: it gives the
  `opts?: { validate?: boolean }` signature and says `validate: false` opts out of the build gate).
  Name the module by its role, never by a path (facts hole filed), and link the role words, "the
  module that calls `createSiteIndexes`", to `docs/extend/build-the-public-routes.md#build-one-typed-index`
  (opened and confirmed: it shows the content module making the `createSiteIndexes` call with one raw,
  eager glob per concept). The link carries the reader to the module; this page states nothing about
  it beyond its role.

**Hand-off (no-claim):** "Once the build passes, confirm that every migrated entry reached the index."

### Verify the migrated entries

**First sentence:** The content index records each entry that fails its validator as a content
problem with its field errors and leaves it out.

**Facts:** `f:4ikssa`, `f:3ikjaa`. Cited again: `f:kv3qen` (an invalid draft passes the build),
`f:xl7d9s`, `f:tg9e0z`.

A numbered list, one check to a step, the location first, lead-in "To verify the migration, follow
these steps:" (no-claim):

1. In the module that calls `createSiteIndexes`, add a temporary line that logs each concept's
   problems, for example `console.log(indexes.posts.problems());`. The code block's first-line comment
   names the tutorial site's module, `src/lib/content.ts`, which that tutorial has the reader create
   (brief's `local` array); add one clause that a scaffolded site's content module holds the same
   `indexes` value, without naming its path (facts hole filed), linking "content module" to
   `docs/extend/build-the-public-routes.md#build-one-typed-index`, which shows it.
2. In the project directory, run `npm run build`, and confirm that every logged list is empty. An
   entry listed with `draft: true` passed the build but still fails its validator (`f:4ikssa`,
   `f:kv3qen`). Link `docs/reference/delivery-data.md#types` for the `ContentProblem` shape (opened and
   confirmed: the row gives `{ id: string; draft: boolean; errors: Record<string, string> }`).
3. In the same module, remove the logging line.
4. In the output of `npx cairn-manifest`, confirm that no `content.field_undeclared` warning names a
   key you meant to keep (`f:3ikjaa`). Link `docs/reference/log-events.md` (opened and confirmed: the
   row names `buildSiteManifest`, the dropped key, and the `concept` and `keys` fields).
5. In the dev server, open a migrated entry at its permalink, and confirm that its images load and no
   shortcode or directive shows as literal text (`f:xl7d9s`, `f:tg9e0z`).

**Hand-off (no-claim):** "When a check fails, the next section traces it to its cause." It ends
on a full stop because the list it points at sits under the next heading, after that heading's own
lead-in.

### Diagnose a failed check

**First sentence:** Each failed check traces to one part of a migrated file: its name, a frontmatter
value, or a body block.

**Facts:** `f:fdtgh5`, `f:kv3qen`, `f:gh4ckg`, `f:ivhuyc`, `f:nhjraz`, `f:tg9e0z` (each cited again;
their homes are the sections named).

Then the lead-in, "Work through the following causes in order:" (no-claim), and a numbered list of
ordered checks (anatomy item 5), in the order the steps of "Run the build as the migration check" and
"Verify the migrated entries" reach them. Each item names what the reader sees, then the cause, then
the section by heading:

1. The script prints `Skipped` for a file: the old file has no date, an id the slug function cannot
   repair, a duplicate id, or frontmatter the parser rejects. Fix the old file or the helper; "Name each
   file by its id". Claim nothing about why the parser rejects a file (facts hole filed).
2. The build fails on a stale content manifest: rerun `npx cairn-manifest` (`f:fdtgh5`).
3. The build stops with one line per invalid field, each `<dir>/<id>: <field>: <message>`: point at
   the build-failure row, `docs/extend/build-the-public-routes.md#diagnose-a-failed-build` (opened
   and confirmed: its table row gives that line form, the cause, a published entry's frontmatter
   failing its concept's validation, and the fix, with the invalid-draft and `{ validate: false }`
   notes below the table), as the anatomy's item 5 asks. Keep inline only the two causes a migration
   adds, as sub-items of this item:
   - A listed `date` field: the old date carried a time part; "Write dates as YYYY-MM-DD"
     (`f:ivhuyc`).
   - A text-like field listed as required though the old file had a value: the value was an unquoted
     number, date, or boolean; "Quote values for text fields" (`f:gh4ckg`).
4. An entry is missing from the site while the build passes: it is an invalid draft, or
   `validate: false` is still set (`f:kv3qen`); "Verify the migrated entries".
5. A `cairn:` link to a migrated entry finds no target: the entry's stem is off shape (`f:nhjraz`);
   "Reduce each stem to the id shape".
6. A shortcode renders as text: it was rewritten as a leaf or text directive, not a container
   (`f:tg9e0z`); "Replace shortcodes with components". For a component that still fails, link
   `docs/extend/configure-rendering.md#diagnose-a-failed-check`.

The recovery row for the build's invalid-field list lives on
`docs/extend/build-the-public-routes.md#diagnose-a-failed-build`, so item 3 points there and keeps
only the migration's own causes. The extend recovery surface, `docs/extend/debug-your-site.md`, has
no such row (already filed in `docs/internal/docs-friction-log.md`, the build-the-public-routes entry
on the public routes' build failures), so the page does not link it for item 3. One clause may link
`docs/extend/debug-your-site.md#read-the-structured-logs` for finding the `content.field_undeclared`
record.

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery link not repeated. One introducing sentence, "The following pages cover the pieces
this page links to:" (no-claim), then a bulleted list, each item's link text naming its destination:

- `docs/extend/define-an-adapter-and-schema.md`, declaring the target concepts and their fields.
- `docs/extend/content-model.md#entry-identity`, how the id, the slug, and the entry's date relate.
- `docs/extend/configure-rendering.md#register-the-component`, registering a shortcode's replacement.
- `docs/extend/configure-media.md`, turning media on before moving images into the Library.
- `docs/extend/link-content-with-references.md#cairn-body-links-and-reference-fields`, linking
  migrated entries with `cairn:` links.
- `docs/extend/build-the-public-routes.md`, the build validation that checks migrated frontmatter (the
  outline's crossLink reason). Link the page, not its `#diagnose-a-failed-build` anchor, which item 3
  of "Diagnose a failed check" already carries.
- `docs/reference/core.md#parsemarkdown` and `docs/reference/delivery-data.md#createsiteindexes`.
- `docs/reference/cli-cairn-manifest.md`, when to regenerate the manifest.

The limitation the page leaves out, redirects from the old site's addresses, is named in the
introduction only; no page covers it, so See also carries no link for it.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. All 19 fact ids this plan was
handed are carried; none is subordinated or cut. The plan adds one container fact, `f:3ikjaa`, scoped
and named where it lands.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:qd7iat | carried | Write the migration script (no importer; `parseMarkdown` splits frontmatter from body); scoped in Introduction |
| f:3r6rqn | carried | Write the migration script (no public serializer; the script writes the `---` block) |
| f:w77gj8 | carried | Write the migration script (typed YAML, `Date` for unquoted dates, body after `---`); cited again in Write dates as YYYY-MM-DD and Convert the body markup |
| f:z68na4 | carried | Name each file by its id (stem verbatim, the only identity); scoped in Introduction |
| f:46edxb | carried | Name each file by its id (filename is id plus `.md`; a dated concept's prefix stripped from the slug) |
| f:grhib4 | carried | Match the date prefix to the concept (granularity, `15-my-trip`, never throws) |
| f:nhjraz | carried | Reduce each stem to the id shape (off-shape stem serves, invisible to `cairn:` links and the guards); cited again in Diagnose a failed check |
| f:ggzzur | carried | Declare or drop every old key (undeclared key deleted on first save); scoped in Convert the frontmatter; cited again in Before you begin and Mark drafts with draft: true |
| f:ivhuyc | carried | Write dates as YYYY-MM-DD (`YYYY-MM-DD` only, the message, UTC day of a `Date`, `datetime` as written); cited again in Diagnose a failed check |
| f:0nw43j | carried | Mark drafts with draft: true (`draft: true` exactly; anything else published); cited again in Before you begin |
| f:2p519o | carried | Map tags to the vocabulary (slug values, vocabulary-only save, orphans kept) |
| f:gh4ckg | carried | Quote values for text fields (unquoted number, date, boolean read as empty); scoped in Convert the frontmatter; cited again in Diagnose a failed check |
| f:xl7d9s | carried | Keep or move old images (old URLs render unchanged; no bulk importer); cited again in Verify the migrated entries |
| f:xjdhau | carried (scoped) | Keep or move old images (one file per upload; `media:` reference through the hash). Its where-used and default-alt clauses are not used |
| f:tg9e0z | carried | Replace shortcodes with components (container directive only; leaf and text stay literal; registration linked out); cited again in Verify the migrated entries and Diagnose a failed check |
| f:fdtgh5 | carried | Run the build as the migration check (stale-manifest error names `npx cairn-manifest`); cited again in Diagnose a failed check |
| f:kv3qen | carried | Run the build as the migration check (one error, `<dir>/<id>: <field>: <message>`, `validate: false`, drafts exempt, invalid entries left out); scoped in Introduction; cited again in Verify the migrated entries and Diagnose a failed check |
| f:4ikssa | carried | Verify the migrated entries (content problem with field errors, left out of the typed read) |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Introduction. Its import-alias, `configModule`, and hooks clauses are not used |
| f:3ikjaa | carried (added, scoped) | Verify the migrated entries (`content.field_undeclared` names undeclared keys per concept); cited again in Declare or drop every old key |

The page-inputs claim inventory carried twenty rows, disposed as it recorded them: the absent prior
page (no claims, cut as a placeholder), and one row per fact id above, each carried in the section
the table names. Three placements differ from the inventory's section labels: the inventory's "Old body
markup (registration itself links to configure-rendering)" is the page's "Convert the body markup",
with `f:tg9e0z` under its H3 "Replace shortcodes with components"; the inventory's "Frontmatter traps"
and "Frontmatter that must change" are the page's merged "Convert the frontmatter", with each fact under
the H3 the table names; and `f:q07rd5`'s "Any sentence naming the adapter file" lands in Before you
begin and the introduction, the page's only sentences that name the adapter file.

## Friction filed

The page-inputs step filed one entry on 2026-10-12 (the root barrel exports `parseMarkdown` but not
`serializeMarkdown`), and this plan does not refile it. This plan filed six entries in
`docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: a `date` field reads a parsed `Date` as its UTC day, so an evening timestamp west of UTC
   validates as the next day.
2. Engine: the draft flag fails open, silently; `draft: "true"`, `draft: yes`, and `published: false`
   publish, and neither the validator nor the build says so.
3. Engine: the content index serves an off-shape stem while `cairn:` links and the guards treat it as
   no entry, with no build warning.
4. Engine: a date prefix of another granularity than `datePrefix` leaves digits in the public URL
   with no warning.
5. Engine: `validate: false` turns a failing build into a site silently missing every invalid entry,
   with no log of `problems()`.
6. Docs content: facts-container hole for migration: no fact names the module that calls
   `createSiteIndexes` on either site, and none states that `parseMarkdown` throws on malformed YAML or
   reads no TOML `+++` block.

The structural-edit revision filed nothing new: the missing debug-your-site row for the build's
invalid-field list was already filed by build-the-public-routes, and the revision points that cause at
build-the-public-routes' own failure table.

## Drafting constraints

- **Which site.** Every adapter reference says which site it means: `src/theme/cairn.config.ts` on a
  scaffolded site, `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`). The module
  that calls `createSiteIndexes` is named by its role; only the tutorial's `src/lib/content.ts`
  appears, in the one code comment of "Verify the migrated entries", from the brief's `local` array.
- **The brief's `local` array** takes the names the page has the reader create or supply:
  `scripts/migrate-content.mjs`, `old-content/posts`, `src/lib/content.ts`, the script's constants and
  helpers (`FROM`, `TO`, `DATE_PREFIX`, `PREFIX_LENGTH`, `ID_SHAPE`, `toDay`, `toSlug`,
  `toFrontmatter`, `frontmatterBlock`, `toBody`, `written`, `fm`, `stem`, `id`), the example
  component name `note`, the example keys `layout`, `aliases`, `summary`, `year`, `version`,
  `published`, the example filenames `2024-03-15-my-trip.md` and `My_Trip.md`, and the placeholders
  `<dir>`, `<id>`, `<field>`, and `<message>`.
- Never say `parseMarkdown` reads TOML, handles a malformed file, or throws a named error; the
  script's `try`/`catch` stands without a reason given (friction 6).
- Never say the validator, the build, or any log reports a non-boolean `draft` (friction 2).
- Never quote the build error's count prefix; quote only the `<dir>/<id>: <field>: <message>` line.
  Give the date message with the field's label in front, as the plan's run showed.
- Never name a scaffolded site's content module path or its taxonomy field name. Where the page
  names the module by its role, link `docs/extend/build-the-public-routes.md#build-one-typed-index`,
  which shows it.
- Never describe redirects from old addresses, or any engine behavior for an old URL other than an
  image URL's (`f:xl7d9s`).
- Never teach concept declaration or component registration beyond the one-line link at the step
  that needs it; both are out of scope.
- Never describe the Library upload from the editor's seat; name the editor documentation in words.
- Vendor specifics get a link, never a copy: the YAML 1.2 relation to JSON.
- `parseMarkdown`, `createSiteIndexes`, `ContentIndex`, `problems()`, `cairnManifest`,
  `content.field_undeclared`, `datePrefix`, every field type, key, helper, and command in code spans;
  "Library" capitalized as the sidebar names it.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
