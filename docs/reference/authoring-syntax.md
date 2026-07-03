<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

# Content authoring syntax

cairn content is plain markdown, with two token schemes an author types that the engine resolves at
render and delivery: `cairn:` internal links and `media:` asset references. Both are engine-internal
codecs rather than public exports, so neither has an export-keyed reference page. This page is their
author-facing home. The editor inserts both for you (the link picker writes a `cairn:` href, the image
flow writes a `media:` src), and you can hand-type either in the markdown source.

## `cairn:` internal links

An internal link to another entry is written `cairn:<concept>/<id>`:

```markdown
See the [first trail](cairn:posts/2026-05-01-first-trail) for the full route.
```

The engine resolves the token to the entry's live permalink when it renders the page, so a link never
hard-codes a URL. The token keys on the entry id, so it keeps resolving across a slug or date change
that moves the permalink. An id the site cannot resolve is left as plain text rather than a dead link.

The codec itself is engine-internal, part of the render pipeline `createRenderer` composes. Feed and
sitemap routes resolve the same tokens through `buildLinkResolver`.

## `media:` asset references

A reference to a stored image is written `media:<slug>.<hash>`, or the bare `media:<hash>`:

```markdown
![A cairn at the summit](media:summit-cairn.a1b2c3d4)
```

The hash is the content identity: it names the exact bytes in R2 and never changes for the same image.
The slug is cosmetic, a human-readable prefix the Media Library can rename without touching the
reference, since the resolver keys on the hash alone. The same token form appears in a frontmatter hero,
as the `src` of the nested `image: { src, alt, caption }` object.

A `media:` token resolves to a `/media` URL through the public resolver the site wires into its render
path and public routes (see [wire the delivery surface](../guides/wire-the-delivery-surface.md)). An
unresolved token degrades to no image rather than shipping the raw `media:` string. The codec is
`parseMediaToken` and `mediaToken` on the `/media` subpath, documented under
[the `media:` reference codec](./media.md#the-media-reference-codec).

## See also

- [Add an image](../guides/add-an-image.md) for the author's view of inserting media in the editor.
- [The content model](../explanation/content-model.md) for how an id becomes a permalink.
- [Media storage](../explanation/media-storage.md) for the content-addressed storage behind a `media:`
  reference.
