# The content model

Cairn fixes the content model in three places: the set of concepts a site declares, how cairn
derives an entry's URL, and the schema behind each concept.
[Define an adapter and schema](../guides/define-an-adapter-and-schema.md) and
[Declare structured fields](../guides/structured-fields.md) cover the mechanics.

## A concept is not a collection

A concept is a first-class content kind: a directory of markdown files that all share one
frontmatter schema. Posts and Pages ship with cairn, and a site adds its own by declaring another
key under the adapter's `content`, the way [Add authors to your
site](../guides/add-authors.md) adds an `authors` concept. A site can't declare an open-ended,
user-defined collection the way a generic headless content-management system would, where
"collection" is just a name and the shape of its entries is whatever the last person who edited
the config typed in.

I made concepts fixed and declared, not open, because a generic collection builder can't protect
an editor from a mistake the way a system with an opinion about what a Post is can. Declare
`posts` with a `title`, a `date`, and a `description`, and that shape holds at every save, in the
editor's form and in the validator that runs before a commit, for the life of the concept. An
open collection can't offer that. Its whole appeal is that editing a record can add or drop a
field, so nothing in the system can promise the record still looks like the last one.

If your content genuinely wants a shape your editors define as they go,
cairn's concepts feel rigid, and a generic collection builder is the better tool. Cairn is for
the sites where a Post is always a Post: a developer decides what belongs in the schema once, in
code, and every editor after that just fills it in.

```ts
import { defineConcept, fieldset, fields } from '@glw907/cairn-cms';

const content = {
  posts: defineConcept({
    dir: 'src/content/posts',
    routing: 'feed',
    fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
  }),
  pages: defineConcept({
    dir: 'src/content/pages',
    fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
  }),
};
```

`defineConcept` also validates a concept's URL policy the moment the module loads, which the next
section covers. A site that needs more than one Post-shaped thing declares two concepts. A type
field inside one concept would push the distinction into data the schema can't hold steady, so
cairn keeps each Post-shaped thing its own concept.

## Where a URL comes from

Cairn assembles an entry's URL at build time from three things the entry already carries for
other reasons. Its filename gives the id, its frontmatter date gives any date tokens, and its
concept's declared pattern gives the shape.

The **id** is the entry's filename stem, the part before `.md`. That filename is what the editor
addresses that entry by internally, and it's also how a [`cairn:`
link](../reference/authoring-syntax.md) names it. A concept whose entries carry a date (the
`feed` routing shorthand, the only routing that makes a concept dated) gives the filename a leading date
prefix, `2026-05-01-first-trail.md`, and the concept's `datePrefix` says how much of the date is
in that prefix, `year`, `month`, or `day`. Day is the default. The **slug** is the id with that
prefix stripped, so `2026-05-01-first-trail` slugs to `first-trail`. A concept with no date
carries no prefix, and its slug is just its id.

The date itself is never re-derived from the filename prefix. The engine reads it from the
entry's own `date` frontmatter field, which is why a permalink pattern that uses a date token
requires the entry to actually have a valid date, and fails the build loudly if it doesn't.

The **permalink** is the concept's own pattern, resolved against the id, the slug, and the date.
Left undeclared, a concept defaults to `/:slug` if it's named `pages`, or `/<concept-id>/:slug`
otherwise: a page called `about` renders at `/about`, a post called `first-trail` renders at
`/posts/first-trail`. A concept overrides the default with its own `permalink`, built from
`:slug`, `:year`, `:month`, and `:day`:

```ts
defineConcept({
  dir: 'src/content/posts',
  routing: 'feed',
  permalink: '/:year/:month/:slug',
  datePrefix: 'month',
  fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
});
```

The module load checks every one of these rules, not the first save attempt against it: a
permalink that doesn't start with `/`, one that uses a date token on a concept with no date, or a
`datePrefix` outside `year`/`month`/`day` all throw immediately. A typo in a permalink pattern is
a much smaller problem caught at import time than a wrong or silently defaulted URL discovered
after publishing.

Spreading one URL across a filename, a frontmatter field, and a declared pattern is more moving
parts than a single stored "slug" field would be, and that's a deliberate trade. A stored slug is
one more value that can drift from the file it's supposed to name. Deriving the URL from the
filename and the date the entry already carries means there's nothing to keep in sync by hand.

## One schema, three consumers

A concept's `fields` is a `fieldset` built from `fields.*` constructors, [Declare structured
fields](../guides/structured-fields.md)'s full vocabulary of types like `text`, `date`,
`multiselect`, and `reference`. The editor builds its Details panel from that one declaration, the
save path validates a raw frontmatter object against it, and a site's own code gets the resulting
frontmatter as a real TypeScript type through `InferFieldset`.

```ts
import { fieldset, fields, type InferFieldset } from '@glw907/cairn-cms';

const postFields = fieldset({
  title: fields.text({ label: 'Title', required: true }),
  status: fields.select({ label: 'Status', options: ['draft', 'published'] }),
});

type PostFrontmatter = InferFieldset<typeof postFields>;
// { title: string; status?: 'draft' | 'published' }
```

The reason each `fields.*` constructor names a specific type instead of a schema accepting any
JSON value is that the type is what keeps form, validator, and inferred type in lockstep. A
`select` field's options are a closed, literal list, so the inferred type is that exact union, not
`string`, and a value outside the list fails validation rather than saving. A `date` field's
stored value is always a `YYYY-MM-DD` string, so code reading it never has to guard against an
editor having typed something else into a free-text box. Each guarantee holds because the
vocabulary of field types stays fixed and each one carries its own rules, a guarantee a schema
built from open key-value pairs has no way to keep.

The editor form makes the same case from the other direction. `fields.*` is a fixed vocabulary
deliberately, so the admin can render one input per type without a developer ever writing UI code
for it: `FieldInput`, the component behind every entry's Details panel, picks its widget from
`field.type` alone, a text input for `text`, a checkbox for `boolean`, a picker over another
concept's entries for `reference`, and so on. A schema that instead accepted arbitrary shapes would
need a developer to hand-build a widget for each one, and the editor's form would fall out of sync
with the validator the moment someone changed one and not the other. Because the widget, the
validator, and the type all read the same descriptor, adding a field to a concept means adding one
line to its `fieldset`.

## Why containers nest one level

`fields.object` groups several leaf fields under a single frontmatter key. `fields.array` is the
list container, repeating one item shape down as many rows as the editor adds. Both
stop after one level: an `object`'s leaves are always non-container fields, and an `array`'s item is a scalar or
a flat `object`, never another `array` or an `object` of objects. Nest deeper and `fieldset()`
throws immediately, at declaration, the same fail-loud posture as an invalid permalink.

The cap exists because `FieldInput`, the dispatcher that renders each field's widget, recurses
into a container exactly once to render its leaves, and that one level of recursion is what lets
it stop without reasoning about arbitrarily deep shapes. A form built from a schema that allowed
unbounded nesting would need a genuinely recursive editor, rows inside rows inside rows, which is
a harder interface for an editor to use well and a harder one to build correctly. One level of
grouping covers what a real site needs: an FAQ list, a gallery, a labeled group of related fields,
without asking the editor to navigate a tree.

Two more constraints follow the same reasoning. A concept may mark at most one field `seo: true`,
the image the social card falls back to, and at most one `taxonomy: true`, the tag field that
pools across entries. Both markers are top-level only. Nesting either inside an `object` or an
`array` throws at declaration, because the code that resolves a social-card image or builds the
tag index reads the concept's top-level descriptors directly. Keeping both markers unique and
top-level means the lookup never has to search a nested shape.

## What's next

[Define an adapter and schema](../guides/define-an-adapter-and-schema.md) walks declaring a
concept end to end, and [Declare structured fields](../guides/structured-fields.md) is the full
field-type vocabulary this page only sampled. [The core reference](../reference/core.md#adapter-and-schema)
carries the exact signatures for `defineConcept`, `fieldset`, and `fields`.
