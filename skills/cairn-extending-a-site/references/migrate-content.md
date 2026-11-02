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
- **Dates.** A `date` field takes `YYYY-MM-DD`. An unquoted timestamp parses as a `Date` and the
  field takes its UTC day, so `2024-03-12 20:00:00 -08:00` becomes `2024-03-13`. Take the day from
  the filename when it carries one, and only fall back to the frontmatter.
- **Drafts.** Only boolean `draft: true` is a draft. `draft: 'true'`, `draft: yes`, and
  `published: false` all read as published; map each old marker to `draft: true`.
- **Tags.** Slug each (`Travel Notes` → `travel-notes`) under the taxonomy field's key.
- **Text fields.** Text-type fields read a number, date, or boolean as empty; stringify them.
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

const toDay = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0]);
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

## Check

1. `node scripts/migrate-content.mjs`.
2. `npx cairn-manifest`. Its output must show no `content.entry_invalid` (an invalid entry gets no
   row; an invalid draft is tolerated by the build but missing from the admin list) and no
   `content.field_undeclared` naming a key you meant to keep.
3. `npm run build`. It fails with `cairn: <n> invalid frontmatter field(s):` then
   `<dir>/<id>: <field>: <message>` lines. Fix the script, delete the files the last run wrote (an
   id change leaves the old file behind), and rerun from step 1.
4. Never pass `{ validate: false }` to `createSiteIndexes` to get a green build: invalid entries
   still drop from the site, only with a warning instead of a failure.
5. Open a migrated entry at its permalink: images load, no shortcode shows as text.

| Symptom | Cause |
|---|---|
| `Skipped` line | No date, off-shape or duplicate id, or unparseable frontmatter |
| Body starts with `+++` | TOML frontmatter |
| `date: ... must be a valid date (YYYY-MM-DD)` | Not a real date (an unquoted `2024-13-45` rolls over silently instead) |
| Required text field listed though the old file had it | Value was not a string, or sat under an unmapped key |
| Permalink resolves to two entries | Two dated files with one slug under an undated permalink |
| Entry missing, build passes | Invalid draft, or `validate: false` still set |
| Shortcode prints as text | Not rewritten to a container directive |
