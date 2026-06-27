# The one-level nesting cap

Structured fields let a concept declare an `object` group and an `array` list. The schema caps that
nesting at one level: an `object` holds only leaves, and an `array` holds a leaf or a flat `object` of
leaves. There is no array of arrays, no object inside an object, and no object inside an array of
objects. This page explains why the limit is deliberate, and what to reach for when content seems to
want more depth.

## Why one level

Arbitrary nesting reads well in a schema and edits badly. Each layer of depth multiplies the editor's
job, the round-trip's job, and the validator's job. A two-level array of objects of arrays needs a
recursive row editor, a path scheme that survives reorder at every depth, and a merge that never drops a
half-filled inner row. cairn's editor is a form over flat frontmatter, not a tree editor, and the
one-level cap keeps the form, the save round-trip, and the multi-segment validation paths within a depth
the editor renders well and the round-trip proves.

The deeper reason is the content model. cairn's content is a fixed set of first-class concepts, and the
graph between them runs through references, not through nesting. A field that wants its own structure is
usually a concept in disguise. Modeling it as a concept gives it everything a nested object cannot: its
own edit page, its own permalink, rename safety, and delete protection. The cap pushes that decision to
the surface rather than letting depth paper over it.

## The escape hatch: model it as a concept

When a row needs more than a flat record, make it its own concept and link to it with a reference.

A list of authors, each with a name, a bio, and a photo, does not become an `array(object({ ... }))` with
a nested image. It becomes an `authors` concept and a `fields.array(fields.reference({ concept: 'authors'
}))` on the post. Each author is now a real entry. An editor opens it on its own edit page, the photo
gets the full image field with alt text and the media library, renaming an author repoints every post
that references it, and deleting an author refuses while a post still links to it. A nested object would
give none of that.

The rule of thumb: a flat group of a few leaves is an `object`; a repeated flat record is an
`array(object)`; anything that wants its own identity, its own page, or its own lifecycle is a concept
plus a reference.

## What the cap forbids today

Two narrower limits ride the cap this phase, both deferred rather than permanent.

- **A `reference` inside an `object` or `array(object)`** is not supported yet. The reference extractor,
  the rename rewriter, and the cross-branch integrity gates all address a top-level frontmatter key, and
  extending them to a nested path is its own integrity-critical slice. For now, keep references at the top
  level, where their rename and delete safety is proven.
- **An `seo` image inside any container** is not supported yet. Delivery resolves the social-card image
  from a fixed top-level key list, with no schema walk, so a nested `seo` image cannot resolve at render.
  Put the `seo` image at the top level.

Both throw at the `fieldset()` call, so the limit surfaces at build, not at a save. For the field
declarations and the editor, see [Structured fields](../guides/structured-fields.md).
