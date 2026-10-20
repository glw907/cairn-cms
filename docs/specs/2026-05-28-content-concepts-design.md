# Content model design: fixed first-class concepts, no generic collections

**Date:** 2026-05-28
**Initiative:** cairn-cms (see `docs/PLAN.md`)
**Covers:** the content-model question raised before the fragments design round. Replaces the
generic "collections" abstraction (and deletes R8) with a curated set of named, first-class
content concepts.
**Parent spec:** `docs/superpowers/specs/2026-05-26-admin-ui-design.md` (R3, R4, R8 collection CRUD).

## The question

Cairn's adapter currently exposes `collections: CairnCollection[]`, an open-ended array a site
declares. Two planned items lean on it: R8 (a runtime UI to create custom collections) and the
upcoming fragments feature (modeled as a collection with `kind: 'fragment'`). The question was
whether Pages, Posts, and Fragments should be three canonical types, and whether the generic
"collection" idea earns its place at all when those three behave differently and want different
management surfaces.

The answer this spec locks: drop the generic collection abstraction. Cairn ships a fixed,
curated set of first-class content concepts. Each is distinct by nature, each is singular (one
of each per site), and each holds a list of entries. New concepts arrive through deliberate
engine design, never through site config. There is no user-creatable or duplicable collection.

## Why

The real-site evidence shows no demand. Across both consumers there is no case of two same-kind
groupings. ecnordic has one `posts` stream and five static `pages`. 907-life has one `posts`
stream and no CMS-managed pages. The only candidate for a second stream is ecnordic's events idea,
which has no directory, no module, no route, and no schema, sits under "out of scope" in PLAN.md,
and would be calendar-shaped rather than a second blog stream if it ever landed. Neither site's
backlog asks for a "News vs Blog" split, so the capability to declare arbitrary same-kind
collections has nothing to serve.

The landscape draws the line elsewhere too. Keystatic splits content into collections (repeatable
sets of same-schema entries) and singletons (one-off unique content), and its organizing axis is
repeatable-set versus one-off, not "let the user invent collection types." Astro ships no singleton
primitive at all and models a one-off as a single-entry collection. Neither treats arbitrary
user-defined collection proliferation as a core capability.

There are two multiplicities at play, and only one is worth cutting. Multiple *concepts* of the
same kind, such as two posts streams, has no demand, so it goes. Multiple *entries* inside one
concept, such as many pages or many posts, is unavoidable and correct, because "Pages" is
inherently a list a site adds to. The entry-level list-ness stays; the concept-level array does not.

That gives the organizing principle Geoff set on 2026-05-28: multiplicity in Cairn is always by
distinct concept, never by duplicate. A site never gets two of the same thing. It gets more named
things, each distinct by nature. Photos are not videos are not icons are not posts. This is the
rule the whole model follows, and it is the inverse of user-defined collections. It also matches
the lean-core north star and the earlier retirement of "theme": a generic extensibility surface
nobody needs is the WordPress-style bloat Cairn avoids.

## The model

Cairn ships a curated, fixed set of first-class content concepts. Today that set is three markdown
concepts, each opt-in and configurable per site, none invent-able or duplicable.

- Pages are site structure: navigable, a plain slug, minimal frontmatter (a title).
- Posts are a dated stream with feeds and a sitemap, carrying tags, a draft flag, and a dated slug.
- Fragments are non-routable reusable markdown, pulled into other content via `:::include`, with
  no frontmatter beyond a name. Its own design round follows; this spec only fixes its place in
  the model.

A site enables and configures concepts from this set. It cannot add to the set or duplicate an
entry in it. 907-life enables Posts only. ecnordic enables Pages, Posts, and Fragments. Per-concept
configuration still varies per site: ecnordic's Posts use a controlled tag vocabulary, 907's use
free-form tags, and each site sets its own content directory and validator.

The `kind` enum from Pass K (`page` / `story`, with `fragment` planned) is absorbed into the
concept identity. Posts carry story behavior (a dated slug, a date-led editor header), Pages carry
page behavior (a plain slug), and Fragments carry fragment behavior (a name only, non-routable).
The behavior that `kind` selected now follows from which concept it is, so the separate `kind`
field on the contract goes away.

### Two families: markdown content and assets

The concepts split by storage shape, and that split is the one structural line inside the model.

The markdown-in-git concepts (Pages, Posts, Fragments) share the existing edit-and-commit engine.
They read raw markdown, edit in Carta, and commit to `main` via the GitHub App with the editor as
author, keeping the 409 fail-safe and the role gate. Only the adapter surface and the
no-arbitrary-array rule change; the internal list, edit, and save engine keeps a shared
representation and barely moves.

The asset concepts (a single Gallery, and later possibly distinct Photos, Videos, Icons) are
binary files rather than markdown entries. They need upload, storage, and a picker, and they carry
the storage decision already open in the plan: commit binaries to the repo versus R2/Images, plus
R9's reuse of site assets in the editor. This is a separate subsystem.

Media is the foreseen next family of first-class concepts and follows the same rule: a single
Gallery, or several distinct asset concepts, never multiples of one. It is out of scope for this
design round. The principle covers it; the implementation waits for its own pass and its storage
decision.

## Adapter contract change

The contract moves from an open-ended array to named, optional concept configs. Proposed shape, to
be finalized in the implementation plan:

```ts
interface CairnAdapter {
  siteName: string;
  content: {
    posts?: PostsConfig;
    pages?: PagesConfig;
    fragments?: FragmentsConfig;
  };
  sender: ...;
  backend: ...;
  preview: ...;
  registry?: ...;
  navMenu?: ...;
}
```

Each `*Config` holds the per-site bits that vary today (`dir`, `fields`, `validate`, an optional
`label`) and omits anything fixed by the concept (its kind, its routability, whether it feeds the
sitemap). A site enables a concept by providing its config and omits the key to leave it off.

Routing and nav derive from the set of enabled concepts, the way they derive from the array today,
so the collections-first nav from Pass J keeps working with the enabled set in place of the array.
Whether the admin routes stay a constrained `[concept]` param or become explicit `posts`, `pages`,
and `fragments` routes is an implementation-plan detail.

## What this deletes

R8 (collection CRUD) is removed from the roadmap. With no generic collection, there is nothing for
a user to create at runtime, so the manage-collections UI, the committed-config-versus-D1 storage
fork, and the config-defined-versus-code-defined collection contract tension all disappear. The
relevant PLAN.md and admin-ui-design references get updated to record the removal and the reason.

## Open questions left to the plan

- The exact `*Config` field layout and where the `label` default lives.
- Whether admin routes become explicit per concept or stay a constrained dynamic segment.
- The internal normalization that maps the three concept configs onto the engine's existing list
  representation, so the list, edit, and save path changes as little as possible.
- The fragments specifics (the `:::include` directive, build-time resolution, the preview strategy)
  stay in the separate fragments design round. This spec only fixes that fragments is one of the
  three markdown concepts.

## Migration impact

The engine reshapes the adapter type, drops the `collections` array and the `kind` field, adds the
`content` concept configs, and adjusts the loaders, nav, and routing to read enabled concepts. The
adapter and sveltekit tests update with it.

Each site rewrites its `cairn.config.ts` from `collections: [...]` to the `content: { ... }` shape.
ecnordic enables Pages, Posts, and Fragments; 907 enables Posts, and Fragments once that ships.
Per-site field and validator wiring carries over unchanged in substance.

The change ships as a cairn-cms patch bump in the 0.5.x series plus a both-site repoint, following
the established publish-before-push order.
