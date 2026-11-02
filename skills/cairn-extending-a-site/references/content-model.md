# Concepts, fields, and content integrity

Contents:

- [Add a concept](#add-a-concept)
- [Fields](#fields)
- [Cross-field rules](#cross-field-rules)
- [Address, dates, ids](#address-dates-ids)
- [Tags, summaries, rows](#tags-summaries-rows)
- [The manifest](#the-manifest)
- [References, body links, includes](#references-body-links-includes)
- [Integrity guards](#integrity-guards)
- [Resolve a failed check](#resolve-a-failed-check)

## Add a concept

A concept is its adapter entry, plus a manifest run when its directory already holds files.

1. **Adapter** (`src/theme/cairn.config.ts`): a `defineConcept` under `content`, keyed by the concept
   id, with `dir` and `fields`. Set `singular`: it falls back to `label`, so an omitted singular
   reads **New Events**. `dir` sits under `src/content`, and each entry sits directly in it.
2. **Manifest**: if the directory already holds entries, run `npx cairn-manifest` (scaffold script
   `cairn:manifest`) and commit `src/content/.cairn/index.json`. Never hand-write manifest rows. An
   entry that fails validation is skipped (logs `content.entry_invalid`), and the
   bin exits 1 unless the entry is a draft.

The content module's one glob and the `cairnManifest` plugin both read `/src/content/**/*.md`, so
neither takes an edit. The content module holds the glob in the absolute form, since Vite resolves
only a literal pattern at the call site and a relative glob's `../content/...` keys are refused:

<!-- snippet-check-skip: continues the scaffold's content module, which imports createSiteResolver and cairn -->
```ts
const files = import.meta.glob<string>('/src/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const site = createSiteResolver(cairn, files);
export const events = site.concept('events');
```

A lazy glob or one without `import: 'default'` throws `expected input to be a string or buffer`.
A concept with no files is an empty index. `site.concept('events')` is typed from the concept's
fieldset, refuses an undeclared id, and is never undefined.

A file that no concept owns fails the build, naming the path and the declared dirs:

```text
cairn: content file "<path>" sits under no concept's dir
```

A `dir` outside `src/content` fails the same way:

```text
cairn: concept "<id>" dir "<dir>" is outside src/content
```

Write the schema to fit existing files; do not edit seeded content to fit the schema. Then run
`npm run check` and `npm run build`. A scaffold's `navLayout` lists the new concept in a trailing
group until placed.

Ids the engine refuses: `login`, `auth`, `editors`, `help`, `media`, `vocabulary`, `nav`, and
`settings`. A `fragments` concept must set `routing: 'embedded'`.

## Fields

Every field is optional unless it sets `required: true`. Mark only the fields the task requires
(usually the title and the start date); leave the rest bare. An empty optional field is dropped from
the saved frontmatter and typed optional, so code reading it under strict settings checks it is set.
A key the fieldset does not declare (a hand-written `draft: true`) is not shown in the form and
survives every save and publish; a declared field the form leaves empty is removed.

`fields.text`, `textarea`, `number`, `url`, `date` (`YYYY-MM-DD`), `boolean`,
`select`, `multiselect`, `image`, `reference`, `object`, `array`. `number` is the whole-number field
for a capacity or count; `url` for a link. A `boolean` takes `true` or `false` (an empty value reads
as unset), and any other value, such as the string `'true'`, is refused. A text-type field reads a non-string value (an unquoted
number or boolean) as empty. A `multiselect` with `options` refuses a value outside them; add
`creatable: true` and it keeps one, renders as an open tag input, and infers as `string[]` instead of
the option union.

## Cross-field rules

`defineConcept` takes two hooks beside `fields`:

- **`refine(data, body)`**: the default for a rule that compares fields (an end date before a start
  date). It runs only after every field check passes, receives the coerced data, and returns a map
  of field key to message (empty or `undefined` passes). A throw is not caught: it fails the save
  with a server error and fails the build. Guard absent optional values.
- **`behavior.<field>.validate(value, siblings)`**: a per-field check; `siblings` is the raw
  frontmatter. Runs for an empty optional field with `undefined`. A throw is logged as
  `content.field_behavior_failed` and the field counts as valid. A key naming an undeclared field
  throws.

A refused save shows one banner with the first message. The form also moves focus to the field
that message names, when the form holds one visible control for it, and marks it `aria-invalid`.
Otherwise focus lands on the banner, so write each message as a complete sentence an editor can
act on.

```ts
import { defineConcept, fields } from '@glw907/cairn-cms';

export const events = defineConcept({
  dir: 'src/content/events',
  label: 'Events',
  singular: 'event',
  fields: {
    title: fields.text({ label: 'Title', required: true }),
    date: fields.date({ label: 'Start date', required: true }),
    endDate: fields.date({ label: 'End date' }),
    location: fields.text({ label: 'Location' }),
    capacity: fields.number({ label: 'Capacity' }),
    signupUrl: fields.url({ label: 'Signup link' }),
  },
  refine: (data) =>
    typeof data.date === 'string' && typeof data.endDate === 'string' && data.endDate < data.date
      ? { endDate: "The end date can't be before the start date." }
      : undefined,
});
```

## Address, dates, ids

- `routing` defaults to `'page'`; `permalink` to `/<id>/:slug` (`/:slug` for `pages`). Tokens are
  `:slug`, `:year`, `:month`, `:day`. A date token needs `routing: 'dated'` and makes a `date` field
  required. Invalid values throw when the adapter module loads.
- `datePrefix` (`'year'`, `'month'`, `'day'`, default `'day'`) sets how much of the create-dialog
  date prefixes a feed entry's id; the slug drops that prefix. The entry's date comes from its
  `date` field, not the filename.
- An id is the filename stem: lowercase ASCII letters, digits, single hyphens. `slugify` strips
  accents (`résumé` → `resume`); a non-Latin title yields an empty id, which the create action
  refuses.
- A rename keeps a dated filename's prefix and swaps only the slug, in one atomic commit that moves
  the file and rewrites inbound `cairn:` tokens and published reference fields.

## Tags, summaries, rows

- Tags come from the one top-level `multiselect` marked `taxonomy: true` (a second, or one nested,
  throws). There is no fallback to a field named `tags` (logs `content.field_unmarked`). Once the
  site config's `vocabulary` holds items, a save adds only vocabulary values (lowercase hyphenated);
  existing outside tags stay as orphans.
- `summaryFields` copies named keys onto `ContentSummary.summaryFields`; an undeclared key fails
  `npm run check`, and compose throws on one that reaches it from an untyped caller.
- `itemLabel` on an `array` of objects names the sub-field that labels a collapsed row.

## The manifest

`src/content/.cairn/index.json` holds one row per entry (id, concept, title, date, permalink, draft,
links, media refs, reference edges, tags, includes, `publishedAt`). The `cairnManifest` plugin
regenerates it once at dev start, warning `cairn-manifest: regenerated` and a summary, and fails a
build on drift (`content manifest is stale`).
After any content edit outside the admin, run `npx cairn-manifest` and commit the result; it also
writes `site-facts.json` and keeps first-publish stamps.

## References, body links, includes

- A `cairn:<concept>/<id>` token is live only as an inline markdown link in an entry body. The
  engine resolves, counts, and build-checks only that form. In raw HTML, a reference-style
  definition, a component attribute, or frontmatter it stays inert and fails nothing; components and
  frontmatter are never rewritten. A link from a frontmatter field takes a `reference` field.
- A save refuses a body link to a target missing from `main`; a link to a draft resolves, and the
  published link 404s until the target publishes. At render a missing target is marked
  `cairn-broken-link` (text kept) in the preview and fails the build's render. A missing or draft
  reference target is instead dropped from the resolved map with no mark.
- On the entry route, return `references` from `resolveReferences(site, descriptor, frontmatter)`
  with the descriptor from `buildSiteDescriptors` (`references/public-routes.md`).
- `::include{fragment="<id>"}` needs a `fragments` concept. The admin's **Include a fragment**
  control appears only when one is declared and never while editing a fragment. A fragment cannot
  include another. A save refuses (400) an include that names no fragment row in the manifest or has
  no id; a draft fragment passes. A site with no `fragments` concept therefore refuses every include.

## Integrity guards

A save with a bad reference target warns (commits); a build, delete, or rename that would strand an
edge refuses. A reference held in an unpublished draft still counts.

Delete checks, in order:

1. Inbound body links: 409 `Cannot delete <id>: N pages link to it.`
2. Fragment includes: 409 `Cannot delete <id>: N entries include it. Remove the include first.`
   (includes count once the including entry is published), also 409 while an open branch includes
   it, and 503 when a branch cannot be read.
3. Cross-branch reference index cannot be built: 503.
4. Inbound reference edges: 409 `Cannot delete <id>: N entries reference it.`, listing each
   referencing entry's concept, id, title, and permalink.

A rename refuses with 409 when the new id collides, the entry has unpublished edits, another open
branch holds an inbound reference (naming the blockers), or the reference index cannot be built. A
fragment rename also refuses while an open branch includes it, or when the branches cannot be read.
Otherwise it rewrites each referencing entry's stored id and no other frontmatter byte. These
refusals leave no log record; the editor's banner is the trace.

Address collisions: two published routable entries on one permalink fail the build, so a publish
onto an address a live entry holds is refused. The edit page shows an `address-collision` advisory
under the same rule beforehand. A draft, a fragment, or another entry's pending branch holds no
address. A single publish answers 409 with the edits kept on the branch and nothing on `main`; a
batch publish commits nothing and redirects with `?error=address_collision`. Each refusal logs
`publish.address_collided`. Change the address of one entry, then publish again. A rename onto
an address a live entry holds in any concept refuses the same way, with a 409, nothing committed,
and a `rename.address_collided` record.

## Resolve a failed check

| Symptom | Fix |
|---|---|
| `expected input to be a string or buffer` | Glob options (registration 2) |
| `cairn: concept` ... no glob passed | Pass the glob in the content module |
| `cairn: concept` error on permalink, date prefix, or routing at load | Fix the member named |
| `cairn: concept` error about an `/admin` view or `site` | Rename the key in all three files |
| `cairn: <n> invalid entries:` then `<concept>/<id>: <field>: <message>` | Fix each line: the field, the filename, or the `cairn:` link. A draft is exempt |
| `content link is dangling` | Fix or remove the body link, or restore its target |
| `content manifest is stale` | The content is valid and the manifest is behind: `npx cairn-manifest`, commit |
| Manifest has no rows for the concept | Add an entry file directly in its `dir`, or fix invalid entries, then regenerate |
| `cairn: <n> invalid frontmatter field(s):` | Fix the field or mark the entry `draft: true` |
| Server error or build failure from `refine` | Make `refine` return a map instead of throwing |
