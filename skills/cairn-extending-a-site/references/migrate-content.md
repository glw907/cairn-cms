# Migrate existing content

No importer ships with cairn. Convert old markdown (Jekyll, Hugo, Eleventy) with a short script that
reads each file through `parseMarkdown` from `@glw907/cairn-cms`, the parser the build and admin use.
Fix failures in the script, never in the written files.

Contents:

- [Before the script](#before-the-script)
- [Rules the script follows](#rules-the-script-follows)
- [Check](#check)

## Before the script

- Declare the concept with a field for every old key the admin should edit (`references/content-model.md`).
  An undeclared key survives each save but never shows in the form.
  Drafts need `draft: fields.boolean(...)`; tags need one
  `multiselect` with `taxonomy: true`.
- Register the glob in the content module and in `cairnManifest`'s `content`.
- Copy the old files outside the content directories (`old-content/posts`). Convert Hugo TOML
  (`+++`) frontmatter to YAML first; `parseMarkdown` reads a TOML block as no frontmatter.

## Rules the script follows

- **Id.** The filename stem is the id: lowercase letters and digits, single hyphens. A dated concept
  prefixes the date cut to its `datePrefix` (`day` default: `2024-03-12-winter-gear-guide`). A
  mismatched prefix silently leaves part of the date in the slug. An off-shape id cannot be a `cairn:`
  target and the admin refuses it.
- **Keys.** Write only declared keys. Map renamed ones (old `summary` → `description`); drop
  template keys (`layout`, `aliases`, `published`).
- **Dates.** A `date` field takes `YYYY-MM-DD`. A value with a time of day fails the build, naming
  the file and the day as written, so write the date alone. Take the day from the filename when it
  carries one, and only fall back to the frontmatter.
- **Drafts.** Only boolean `true` or `false` is valid, whatever field kind declares `draft`.
  `draft: 'true'` and `draft: yes` fail the build, while `published: false` still reads as published,
  so map each old marker to `draft: true`. Every declared `boolean` field follows the same rule.
- **Tags.** Slug each (`Travel Notes` → `travel-notes`) under the taxonomy field's key.
- **Text fields.** Text-type fields read a number or boolean as empty; stringify them.
- **Body.** Rewrite each shortcode as a container directive of a registered component (`:::note`).
  Old image URLs keep working where they still serve; only `media:` references are rewritten.

```js
// scripts/migrate-content.mjs
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseMarkdown } from '@glw907/cairn-cms';

const FROM = 'old-content/posts';
const TO = 'src/content/posts';
const PREFIX = 10; // datePrefix: year 4, month 7, day 10
const ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const toDay = (v) => (String(v ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]);
const toSlug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toFrontmatter(old, filename) {
  const fm = {};
  if (old.title != null) fm.title = String(old.title);
  fm.date = toDay(filename) ?? toDay(old.date); // filename day first: no UTC shift
  const description = old.description ?? old.summary;
  if (description != null) fm.description = String(description);
  if (old.draft === true || old.published === false) fm.draft = true;
  const tags = [...new Set([old.tags ?? []].flat().map(toSlug).filter(Boolean))];
  if (tags.length > 0) fm.tags = tags;
  return fm;
}

const block = (fm) => `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n`;
// serializeMarkdown(frontmatter, body) from '@glw907/cairn-cms' writes the same block the admin
// save writes; use it in place of block() when the quoting matters.
const toBody = (b) => b.replace(/\{\{<\s*note\s*>\}\}\n?([\s\S]*?)\{\{<\s*\/note\s*>\}\}/g, ':::note\n$1:::');

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
  const fm = toFrontmatter(parsed.frontmatter, filename);
  const stem = toSlug(filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''));
  const id = fm.date ? `${fm.date.slice(0, PREFIX)}-${stem}` : stem;
  if (!fm.date || !ID_SHAPE.test(id) || written.has(id)) {
    console.error(`Skipped ${filename}: no date, bad id, or duplicate (${id})`);
    continue;
  }
  written.add(id);
  await writeFile(`${TO}/${id}.md`, block(fm) + toBody(parsed.body));
}
```

For an undated concept, set `id` to `stem` and drop the date line and test. One concept per run.

`parseMarkdown` reads frontmatter as YAML 1.2 (the `yaml` package's core schema): `10:30` stays the
string `'10:30'`, `0755` reads as the number `755`, and a `<<` key stays a literal key instead of
merging. Only a block that opens with a bare `---` line counts as frontmatter, so `---yaml` and
`+++` do not. The first admin save rewrites the block through `serializeMarkdown`: ordinary double
quotes drop, a string that would read as another type is single-quoted (`'123'`), and comments are
lost.

## Check

1. `node scripts/migrate-content.mjs`.
2. `npx cairn-manifest`. Read its summary line and exit code. It exits 1 and the line reads
   `<n> invalid: <concept>/<id>: <field>: <message>` when a non-draft entry is invalid (an invalid
   entry gets no row). `<n> invalid draft` exits 0: the build tolerates an invalid draft, but the
   admin list omits it. Its output must also show no `content.field_undeclared` naming a key you
   meant to keep.
3. `npm run build`. It fails first with `cairn: <n> invalid entries:` then
   `<concept>/<id>: <field>: <message>` lines, and later with
   `cairn: <n> invalid frontmatter field(s):` then `<dir>/<id>: <field>: <message>` lines. Fix the script, delete the files the last run wrote (an
   id change leaves the old file behind), and rerun from step 1.
4. Open a migrated entry at its permalink: images load, no shortcode shows as text.

| Symptom | Cause |
|---|---|
| `Skipped` line | No date, off-shape or duplicate id, or unparseable frontmatter |
| Body starts with `+++` | TOML frontmatter |
| `date: ... must be a valid date (YYYY-MM-DD)` | Not a real date |
| `date: ... has a time of day` | The value carries a time after the day; write the date alone |
| `draft: Draft must be true or false` | `draft` is a string such as `'true'` or `yes`; write boolean `true` |
| Required text field listed though the old file had it | Value was not a string, or sat under an unmapped key |
| Permalink resolves to two entries | Two dated files with one slug under an undated permalink |
| Entry missing, build passes | Invalid draft |
| Shortcode prints as text | Not rewritten to a container directive |
