# Structured fields

A concept's frontmatter is flat by default: one key, one scalar value. Structured fields add two
shapes on top of the leaf vocabulary. An `object` groups leaf fields under one key. An `array` repeats
one item: a single leaf, or a flat `object` of leaves. Together they cover a labeled group such as a
meta block, a repeatable list such as a gallery, and a list of small records such as an FAQ. This guide
walks you through declaring each shape and editing it on the edit page.

## Prerequisites

- A running cairn site with an adapter (see [Define an adapter and schema](./define-an-adapter-and-schema.md)).
- A concept whose `schema` you can extend with a new field.

## Declare a repeatable list

An `array` repeats one item. Pass the item descriptor first and the array's own options second. The
array carries the `label`. Use the optional `itemLabel` to name a row from one of its leaf field keys,
so the editor's row header reads the row's content rather than a bare index.

<!-- snippet-check-skip: the content group omits backend/email/rendering on purpose, to keep the focus on the fields -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter, fieldset, fields } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  content: {
    posts: {
      dir: 'src/content/posts',
      label: 'Posts',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        // a list of records: each row is a flat object of leaves
        faq: fields.array(
          fields.object({
            fields: {
              question: fields.text({ label: 'Question', required: true }),
              answer: fields.textarea({ label: 'Answer', required: true }),
            },
          }),
          { label: 'FAQ', itemLabel: 'question' },
        ),
        // a list of a single leaf
        gallery: fields.array(fields.image({ label: 'Image' }), { label: 'Gallery' }),
      }),
      // ...backend, email, rendering...
    },
  },
});
```

The `object` inside the array carries no `label`: the array labels the group, and `itemLabel` names each
row. The array stores a list under its key. The `faq` value serializes as a list of `{ question, answer }`
objects, and `gallery` serializes as a list of `media:` image values.

## Declare a labeled group

An `object` groups leaf fields under one key without repeating. Give it a `label` for the group legend.

<!-- snippet-check-skip: shows only the fieldset addition, continuing the array example above -->
```ts
fields: fieldset({
  title: fields.text({ label: 'Title', required: true }),
  meta: fields.object({
    label: 'Meta',
    fields: {
      note: fields.text({ label: 'Note' }),
      reviewedOn: fields.date({ label: 'Reviewed on' }),
    },
  }),
}),
```

The `meta` value serializes as one nested object, `{ note, reviewedOn }`. An empty group commits no key.

## Edit a structured field

A structured field renders in the Details panel of the edit page, beside the other frontmatter fields.
Open Details to reach it.

- An `object` renders as a labeled group of its leaf inputs.
- An `array` renders as a repeatable-row editor. Each row carries the item's inputs, a reorder handle,
  and a remove control. Add a row, fill it, reorder rows by drag or keyboard, and remove a row. The row
  header reads the `itemLabel` field, falling back to the row index.
- An `array` of references keeps the reference picker (see [Link content with
  references](./link-content-with-references.md)); the repeatable-row editor is for non-reference items.

The save round-trips the whole structure: a clean row persists, an all-empty row is pruned, and the
order you leave the rows in is the order on disk.

## The one-level cap

Containers nest one level only. An `object` holds leaves, and an `array` holds a leaf or a flat
`object`. There is no array of arrays, no object inside an object, and no object inside an array of
objects. A `reference` inside an `object`, and an `seo` image inside any container, are not supported
yet either. A deeper nesting, a nested reference, or a nested `seo` image throws at the `fieldset()`
call, so the limit surfaces at build, not at a save. Put an `seo` image at the top level.

When a row needs its own structure, model it as its own concept and link to it with a reference. A list
of authors, each with a bio and a photo, becomes an `authors` concept and a `fields.array(fields.reference({
concept: 'authors' }))` on the post. The reference field then carries the full editing, rename, and
delete safety a nested object cannot. For the reasoning, see [The one-level nesting
cap](../explanation/structured-fields.md).

## A note on field keys

No field key may contain a dot, top-level or nested. The editor addresses a nested value by a dotted
path (`faq.0.question`), so a dotted key would be ambiguous. A dotted key throws at the `fieldset()`
call. For the full signatures, see [`fields.object` and `fields.array`](../reference/core.md#field-types).
