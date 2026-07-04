# Declare structured fields

[Define an adapter and schema](./define-an-adapter-and-schema.md) builds a `fieldset` from a
handful of `fields.*` constructors. Each `fields.*` constructor declares one frontmatter field: its
editor widget, its stored shape, and the constraints `fieldset` enforces on save. The `help`,
`default`, `seo`, and `taxonomy` options are covered below. For why concepts are fixed and why
containers nest only one level, see [the content model](../explanation/content-model.md).

## Choose a field type

`fields` is a constructor per type. Each one takes the field's options and returns a plain-data
descriptor. `fieldset` builds its validator from that descriptor, and the editor form uses the
same descriptor to choose a widget.

```ts
import { fieldset, fields } from '@glw907/cairn-cms';

const set = fieldset({
  title: fields.text({ label: 'Title', required: true, max: 120 }),
  summary: fields.textarea({ label: 'Summary', rows: 4 }),
  price: fields.number({ label: 'Price', min: 0 }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'], default: 'draft' }),
  topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
  website: fields.url({ label: 'Website' }),
  contact: fields.email({ label: 'Contact email' }),
  published: fields.date({ label: 'Published' }),
  reminder: fields.datetime({ label: 'Reminder' }),
  featured: fields.boolean({ label: 'Featured' }),
  icon: fields.icon({ label: 'Icon' }),
});
```

| Type | Editor widget | Stored value |
| --- | --- | --- |
| `text` | Single-line input | Trimmed string |
| `textarea` | Multi-line input (`rows` sets its height) | Trimmed string |
| `number` | Number input | `number` |
| `select` | Dropdown over a closed `options` list | One of `options` |
| `multiselect` | Checkboxes when `options` is set without `creatable`; a comma-separated tag input otherwise | `string[]` |
| `url` | Text input (`type="url"`) | String matching `http(s)://…` |
| `email` | Text input (`type="email"`) | String matching `local@domain.tld` |
| `date` | Date picker | `YYYY-MM-DD` string |
| `datetime` | Datetime-local picker | ISO-ish datetime string |
| `boolean` | Checkbox | `true`, or the key is omitted |
| `icon` | A radiogroup over the adapter's glyph set | Glyph name string |
| `image` | The hero-image field (upload, alt, caption, decorative) | `{ src, alt, caption?, decorative? }` |
| `reference` | A picker over another concept's entries | That entry's id |

A closed `multiselect` (`options` with no `creatable`) renders checkboxes; add `creatable: true` and
it becomes an open tag input the editor can add values to. Marking one top-level `multiselect`
`taxonomy: true` makes it the concept's tag field. If a site also configures a tag vocabulary in
`site.config.yaml`, that same field narrows to a closed, vocabulary-sourced picker, with no change
to the schema. The core reference covers the mechanics (linked at the end of this page).

An `icon` field reads its choices from the adapter's `rendering.icons` map
([`defineAdapter`](../reference/core.md#defineadapter)). Leave `rendering.icons` unset and an
`icon` field falls back to a plain text input in the editor, so the glyph name has to be typed by
hand.

## Group and repeat fields

`object` groups several leaves under one frontmatter key. `array` repeats a single item any number
of times. Neither container nests more than one level. An `object`'s leaves are never containers
themselves, and an `array`'s item is a leaf or a flat `object`, never another `array` or an
`object` of objects. `fieldset` checks this at
declaration and throws immediately on a violation, rather than failing later at a save.

```ts
import { fieldset, fields } from '@glw907/cairn-cms';

const set = fieldset({
  faq: fields.array(
    fields.object({
      fields: {
        question: fields.text({ label: 'Question', required: true }),
        answer: fields.textarea({ label: 'Answer' }),
      },
    }),
    { label: 'FAQ', itemLabel: 'question' },
  ),
  gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
  meta: fields.object({ label: 'Meta', fields: { note: fields.text({ label: 'Note' }) } }),
});
```

`array`'s `itemLabel` names the sub-field that labels a collapsed row in the editor (`faq` above
collapses each row to its question). Skip `itemLabel` on an `array` of scalars and the editor falls
back to a positional label (`Gallery 1`, `Gallery 2`). An `object`'s own `label` is optional too,
since an `object` inside an `array` is already labeled by the array; a top-level `object` without a
`label` gets a legend derived from its field key. An `object` never accepts a `reference` leaf
(including inside an `array` of objects), and neither container accepts an `seo` image; a
top-level `array(reference)` is the one place a reference nests, as the preceding many-edge shows. No field
key, top-level or nested, may contain a dot, since the editor addresses a nested value by dotted
path.

## Reference another concept

`fields.reference` stores one entry's id as an edge to another concept; wrap it in `fields.array`
for a many-edge.

```ts
import { fields } from '@glw907/cairn-cms';

const author = fields.reference({ concept: 'pages', label: 'Author' });
const related = fields.array(fields.reference({ concept: 'posts', label: 'Related post' }), {
  label: 'Related posts',
});
```

Both render as a picker over the target concept's entries in the editor. A single `reference`
renders as one combobox button. Wrapped in `array`, it becomes a chip list with an add button.
[Link content with references](./link-content-with-references.md) covers wiring the picker's
targets and resolving a reference at render; [Add authors to your site](./add-authors.md) walks
the `author` example above end to end as a dedicated concept.

## Constrain and validate a value

`fieldset`'s validator runs these constraints on save, in addition to `required`.

| Type | What's checked |
| --- | --- |
| `text`, `textarea` | `min`, `max`, `length` (character counts) and `pattern` (a regular-expression source) |
| `number` | `min`, `max`, and `integer` |
| `date` | `min` and `max` as `YYYY-MM-DD` bounds |
| `select` | The value is one of `options` |
| `multiselect` | Each value is in `options`, when `options` is set |
| `url` | Matches a conservative `http(s)://` pattern |
| `email` | Matches a conservative single-address pattern |
| `reference` | Each stored id is a well-formed id; whether it still resolves to a real entry is a build-time check, not a save-time one |

```ts
import { fields } from '@glw907/cairn-cms';

const slug = fields.text({ label: 'Slug', pattern: '^[a-z0-9-]+$', max: 60 });
const rating = fields.number({ label: 'Rating', min: 1, max: 5, integer: true });
const embargo = fields.date({ label: 'Embargo until', min: '2026-01-01' });
```

An empty value on any type is read as "not provided" before any other check, so a `required` field
fails there and an optional field drops the key; a malformed `pattern` throws at
`fieldset()`, not on a later save. `datetime` and `boolean` are the two exceptions. A `datetime`
field's `min` and `max` are typed but not yet enforced, so they document intent for your own code
rather than gating a save. And `required` has no effect on a `boolean`: an unchecked
box and a required-but-missing one both omit the key, so there's no way to force a checkbox
to `true`.

## Add a hint or an initial value

Every constructor takes an optional `help`, one sentence the editor shows under the field, wired to
the input through `aria-describedby`. `help` never affects validation; it only labels the field
for the editor.

```ts
import { fields } from '@glw907/cairn-cms';

const status = fields.select({
  label: 'Status',
  options: ['draft', 'published'],
  default: 'draft',
  help: 'Published posts appear in feeds; draft posts stay hidden.',
});
```

`default` seeds a fresh entry's form. It's a plain value for every type except `date`, where the
sentinel `'today'` resolves to the current date at render time rather than baking in a fixed one.
Leaving `help` unset on a `date` field doesn't leave it hint-free: a built-in note explains that the
date is metadata and publishing is a separate step, so the field never reads as if it schedules a
post. Set `help` on a `date` field and it replaces that default note; there's no way to suppress the
hint entirely.

## Mark a field for the social image or the tag vocabulary

`seo: true` on an `image` field makes it the one the social card reads when an entry doesn't set
one explicitly.

```ts
import { fields } from '@glw907/cairn-cms';

const image = fields.image({ label: 'Hero image', seo: true });
const topics = fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true });
```

`seo` and `taxonomy` are both single-field markers. A concept may declare at most one of each, and
`fieldset()` throws at declaration if it finds two. Both markers are also top-level-only, so an
`image` inside an `object` or an `array` can't carry `seo: true`, and the same restriction applies
to `taxonomy` on a nested `multiselect`.

## What's next

[The core reference](../reference/core.md#fields) is the definitive signature list, with each
constructor's stability tier. If a save rejects a value you expected to pass, or an adapter throws
at load with a message this guide didn't predict, [Troubleshooting](./troubleshooting.md) is
organized by symptom.
