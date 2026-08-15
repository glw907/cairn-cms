# Migrate existing content

**Contract:** turn an existing corpus, Hugo, Jekyll, or anything else that stores markdown with
frontmatter, into files cairn's concepts can read.

**Precondition:** the concept your old content maps onto, declared per [Define an adapter and
schema](./define-an-adapter-and-schema.md).

cairn has no importer, and it doesn't need one: your old content is already markdown files with
frontmatter, the same shape cairn itself stores. Migrating is a mapping problem, one you solve
with a short script, not a tool cairn ships.

## Read the old files

`parseMarkdown` splits a file's frontmatter from its body, the same parser cairn's own save path
uses:

```ts
import { parseMarkdown } from '@glw907/cairn-cms';
import { readFile } from 'node:fs/promises';

const raw = await readFile('old-site/content/posts/my-post.md', 'utf8');
const { frontmatter, body } = parseMarkdown(raw);
```

`frontmatter` is whatever the old file's YAML block held, untouched; `body` is everything after
it, untouched too. Nothing about this step assumes the old file came from any particular
generator, since every frontmatter-plus-markdown tool writes essentially the same shape.

## Map the frontmatter

This is the real work, and it's specific to your old generator and your new concept's fields.
Common gaps to expect:

- **Date formats.** Hugo's `date: 2024-01-15T00:00:00-07:00` needs trimming to the plain
  `YYYY-MM-DD` a `fields.date` value expects; a `fields.datetime` field keeps the full ISO
  string.
- **Tag and category keys.** A `categories: [Trail, Gear]` array maps onto whatever you named the
  matching field, and a taxonomy field wants its values already lowercase and consistent if your
  site configures a tag vocabulary (see [Manage your tag
  vocabulary](../editors/manage-your-tag-vocabulary.md)).
- **Draft flags.** Jekyll's `draft: true` or a `_drafts/` directory convention both need mapping
  onto cairn's own draft state, which the admin controls rather than a frontmatter key you'd
  write by hand; leave a migrated entry as a draft until an editor reviews and publishes it.
- **Body-embedded shortcodes.** Hugo shortcodes and Jekyll includes have no cairn equivalent to
  translate to automatically. Any of these your old content relies on becomes a [registered
  component](./configure-rendering.md#register-a-component) you build once, then a find-and-replace
  pass over the migrated bodies to the new directive syntax.

Write the mapping as plain code against your concept's declared fields, not a generic transform:

```ts
declare const frontmatter: Record<string, unknown>;

const migrated = {
  title: String(frontmatter.title ?? ''),
  date: String(frontmatter.date).slice(0, 10),
  description: String(frontmatter.description ?? frontmatter.summary ?? ''),
  tags: Array.isArray(frontmatter.categories) ? frontmatter.categories.map(String) : [],
};
```

## Choose the filename

An entry's id is its filename stem, verbatim, the only identity cairn gives it. If your old
generator's URLs were slug-based, matching the old slug as the new filename keeps the permalink
stable for anyone linking to it from outside your site; a dated concept additionally wants the
`YYYY-MM-DD-` (or your configured granularity's) prefix your `datePrefix` declares. Get this
right on the first write: a rename after import is a normal editor action once the entry exists
in cairn (and it correctly rewrites every inbound reference), but nothing rewrites an external
link into your old site from anywhere on the internet.

Match the prefix's precision to the concept's `datePrefix` exactly, not just its shape. cairn
strips only a prefix at the declared granularity: a file named `2024-03-15-my-trip.md` under
`datePrefix: 'month'` strips just `2024-03-`, leaving the day digits in the slug as
`15-my-trip`. This never throws or fails a build; it just leaks a stray number into every affected
URL, so check the concept's `datePrefix` before you write the migration script, not after.

Keep the filename itself lowercase letters, digits, and single internal hyphens. An id outside
that shape still serves its own page, but it's invisible to a `cairn:` link, and to the rename and
delete guards that protect against orphaning it, since both treat that id as unparseable rather
than as a target.

## Write the new files

`serializeMarkdown`, the write-side counterpart to `parseMarkdown`, is an internal save-path
detail, not a public export; a migration script writes the target shape directly instead, the
same `---`-delimited frontmatter block `parseMarkdown` reads back:

```ts
import { writeFile } from 'node:fs/promises';
import yaml from 'js-yaml';

declare const migrated: Record<string, unknown>;
declare const body: string;

const content = `---\n${yaml.dump(migrated)}---\n${body}`;
await writeFile('src/content/posts/2024-01-15-my-post.md', content);
```

Any YAML-dumping library works; cairn doesn't care which one produced the file, only that the
result is a well-formed frontmatter block cairn's own `parseMarkdown` can read back.

## Bringing in media

cairn has no bulk media importer either. An old image URL left as-is in a migrated body renders
unchanged; the render pipeline passes through anything that isn't a `media:` token or a recognized
image source rather than rejecting it, so migrated content keeps working against your old image
hosting with no extra step. Adopting a picture into cairn's own media library, so it gets a
`media:` token, content-addressed storage, and the library's alt-text and where-used tooling, is
optional and one asset at a time through the ordinary upload path; there's no path that imports a
whole folder of old images in one pass.

## Validate

Run the migrated files through the concept's own validator before you trust them: start the dev
server against the local double (per [Build a site by hand](./build-a-site-by-hand.md#milestone-2-cairn-running-against-a-local-double))
and open each migrated entry in the admin. A field that doesn't validate shows its error inline,
the same as it would for anything an editor typed by hand.

**You know it worked when:** every migrated entry opens cleanly in the admin editor with no
validation errors, and its rendered public page looks right.
