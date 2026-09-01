# Content model

What a concept is, how an entry's frontmatter maps to it, and how routing and ids work. [Core](../reference/core.md)
is the dry contract for every function and type named here; this page is the mental model behind it.

## Concepts are fixed, not open-ended collections

A site declares a small, named set of content concepts, typically Posts and Pages, through the
adapter's `content` map. Each concept is a directory of markdown files plus a `fieldset`: a typed
declaration of every frontmatter field the concept carries, built with `defineFieldset` and the fifteen
field builders `fields` exposes (text, textarea, number, select, multiselect, url, email, date,
datetime, boolean, icon, image, object, reference, array). The fieldset is the single source of
truth for three things at once: the editor's form, the server-side validator, and the inferred
TypeScript type a site reads its own entries as. There is no separate schema language and no second
place a field gets declared.

A concept is not a generic collection type. cairn does not offer an escape hatch for content shaped
outside the fieldset system; a field type the fifteen builders don't cover is a gap to raise, not a
workaround to invent locally. [Declare your own concept](./declare-your-own-concept.md) covers
adding a new one.

`object` and `array` are the two container builders, and both cap at one level of nesting: an
`object`'s sub-fields, or an `array`'s item shape, must all be leaves (any builder except `object`
or `array` itself). A container inside a container throws at declaration, "containers nest one
level only," the same way a `reference` field inside an `object` throws, since a reference inside
an object isn't supported this phase; model that relationship as the parent's own concept instead,
or use a top-level `array(reference)`. A field key never contains a dot either, in a container or
at the top level, since a dotted path is how the engine addresses a nested field internally.

## An entry's id is its filename

There is no separate slug codec. An entry's id is its markdown filename with `.md` stripped, and
the on-disk filename is always exactly the id plus `.md`. A dated concept (one with a `datePrefix`
of `year`, `month`, or `day`) additionally carries a leading date on the filename itself
(`2026-08-14-my-post.md`). The URL slug strips only that leading prefix, so a title that happens to
start with a year-like number keeps it. Renaming an entry changes the filename, which is a real git
operation on the holding branch, not a metadata field flip.

The filename's date prefix only ever feeds the slug. An entry's actual date, the one a dated
permalink resolves against and a template reads, always comes from the entry's own `date`
frontmatter field, never from the filename. That's why a dated permalink pattern makes `date` a
structurally required field: nothing else supplies it.

## Routing is a declared shorthand, not a convention

A concept's `routing` option is one of three shorthands: `feed` (routable, dated, appears in
feeds and the sitemap), `page` (routable, undated, off feeds), or `embedded` (not routable at
all, no permalink, never listed or prerendered). `page` is the default when a concept declares
none. `embedded` is how a concept like Fragments or a reference-only "Authors" list stays entirely
out of public URLs while its entries are still editable and referenceable from other content.

## Validation happens once, server-side, before anything reaches git

A concept's fieldset produces a validator. The admin's save action runs it against the submitted
form data before any commit; invalid input bounces back to the form with field-keyed error
messages and never reaches the Backend. A field can additionally carry its own `behavior.validate`,
for a rule the generic fieldset validation can't express; a validator that throws is caught and the
field is treated as valid rather than failing the whole save; see [Debug your
site](./debug-your-site.md) for that failure mode.

## The manifest is the corpus's own index

Individual entries are read directly from the repository when a request needs one entry's full
body. Everything else, an index page, a tag filter, a sitemap, a reference-integrity check, reads
the committed content manifest instead: one JSON file with one entry per content file, carrying its
identity, its routing facts, its outbound `cairn:` links, its reference-field edges, its tags, and
the fragments it includes. A build regenerates and verifies the manifest; a save patches its one
changed entry in the same commit as the content change, so the manifest never drifts from the files
it describes by more than one uncommitted edit. [Data tiers](./data-tiers.md) covers where the
manifest sits relative to cairn's other stored state.

## Cross-entry structure: reference fields and fragments

A `reference` field holds a typed pointer to another concept's entry (`{ concept, id }`), the
mechanism behind [linking content across entries](./link-content-with-references.md); the manifest
carries both sides of that edge, so a rename or a delete can warn about what still points at the
entry in question. Fragments are a distinct mechanism: one piece of markdown, declared under the
reserved `fragments` concept key, spliced verbatim into any entry that includes it with
`::include{fragment="<id>"}`. A fragment has no permalink of its own; it only ever reaches a reader
through whatever entry includes it. See [Reuse content across entries](./reuse-content-across-entries.md).
