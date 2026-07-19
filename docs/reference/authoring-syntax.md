# Content authoring syntax

cairn content is plain markdown, with three things an author types that the engine resolves at
render and delivery: `cairn:` internal links, `media:` asset references, and the `::include` fragment
directive. All three are engine-internal, rather than public exports, so none has an export-keyed
reference page. This page is their author-facing home. The editor inserts each (the link
picker writes a `cairn:` href, the image flow writes a `media:` src, the fragment picker writes an
`::include` directive), and any of them can be hand-typed in the markdown source.

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

## Include a fragment

A published Fragments entry can be spliced into another entry's body:

```markdown
::include{fragment="address"}
```

`::include` is a leaf directive: written with a double colon and no closing pair, it stands on its
own line and never wraps other content, so a fragment supplies whole blocks, never a phrase inside a
sentence. The `fragment` attribute names the included entry's id. The directive grammar accepts it
double-quoted, single-quoted, or bare (`fragment=address`). The "Include a fragment" picker always
writes the double-quoted form, and all three forms are equally valid to hand-type.

At render, the engine replaces the directive with the fragment's own parsed content, so a component, a
`cairn:` link, or a `media:` reference inside the fragment's body resolves exactly as it would in the
including entry. Resolution runs one level deep: the engine renders an `::include` inside a fragment's
own body as literal text rather than resolving it, so a fragment can't nest another fragment.

An id the resolver can't find, or a missing or empty `fragment` attribute, replaces the directive with
a notice reading "Missing fragment: `<id>`" rather than failing the render. The production build
resolves fragments against the published content and throws on a miss, so a dangling include fails
the build the same way a dangling `cairn:` link does. Only a preview shows the notice.

`include` is a reserved directive name, alongside `figure`. The engine's own render step owns it, and
declaring a site component under either name throws at construction.

## See also

- [Add an image](../guides/add-an-image.md) for the author's view of inserting media in the editor.
- [Reuse content across entries](../guides/reuse-content-across-entries.md) for declaring a Fragments
  concept and authoring one.
- [The content model](../explanation/content-model.md) for how an id becomes a permalink.
- [Media storage](../explanation/media-storage.md) for the content-addressed storage behind a `media:`
  reference.
