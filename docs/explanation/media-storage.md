# Media storage: bytes in R2, a logical reference in git

cairn keeps content as markdown in git, which is the right home for text and the wrong home for
bytes. An image, a PDF, or a short clip would bloat the history, slow every clone, and drag every CI
run. So media takes a different path. The bytes live in Cloudflare R2, and the content commits a small
logical handle that resolves to a real URL at delivery. This page explains why the split is shaped this
way. The exact adapter surface is in the [`AssetConfig` reference](../reference/core.md), and the
diagnostic events are in the [log-events reference](../reference/log-events.md).

## Why the bytes stay out of git

Every git-based CMS that stores binaries in the repo hits the same wall: the history grows without
bound, and a binary never deltas, so each re-save stores a fresh copy. The whole field moved media to
an external store for this reason. cairn is Cloudflare-native, so the external store is R2, a per-site
bucket bound to the Worker. Text stays in git, where diffs and history pay off. Bytes go to R2, where
size and immutability are the norm.

## The `media:` reference resolves at delivery

Content never holds a real media URL. It holds a logical handle, `media:<slug>.<hash>` (or the bare
`media:<hash>`), the same pattern as cairn's `cairn:` internal-link scheme. A render step rewrites the
handle to a delivery URL, so the transform host and the URL grammar never land in committed content. A
site that later changes how it stores or serves bytes keeps its content unchanged. The reference is the
contract; the backend behind it is free to move.

## Identity is a content hash, the display name is a slug

The handle carries two things, and keeping both is deliberate. The hash is a 16-character prefix of the
file's sha256, taken over the normalized bytes. It is the identity: identical bytes always produce the
same hash, so a re-upload of the same image collapses to one stored object rather than sprawling into
`photo-1.jpg`, `photo-2.jpg`. The same name can never overwrite different bytes, which removes a known
data-loss path in other tools. Because the bytes are immutable under their hash, the delivery response
carries a one-year immutable cache.

The slug is the cosmetic display name, derived from the original filename by a strict transform:
lowercase, accents folded to ASCII, runs of other characters collapsed to single hyphens, length
capped, Windows reserved names screened. That one transform neutralizes the web-platform hazards a raw
filename carries, including space-encoding bugs, case-sensitivity 404s, and unicode mismatches across
operating systems, and it keeps a personal filename out of a public repo. The slug rides the URL for
image SEO and a readable library, but the hash is what delivery looks up, so renaming an asset never
breaks a reference.

A small git-committed manifest, beside the content manifest, carries the human layer the bytes cannot:
the display name, the original filename for a document download, the default alt text, the dimensions,
and the full digest. The manifest makes the library browsable and is the dedup lookup.

## Transforms run on demand, not at upload

cairn stores one original and asks Cloudflare Images for a variant per request, through the
`/cdn-cgi/image/<options>/...` URL form. Named presets behind the adapter (a thumbnail, an inline
width, a card, a hero) cover the common sizes, and a smart-crop default frames an image without an
editor control. The alternative, generating a fixed set of derivative files at upload time, is the trap
that turns a few thousand images into tens of thousands of files in the systems that took it. One
original plus on-demand variants keeps storage flat and the size set open.

## Delivery is a Worker route that streams from R2

A Worker route serves the public URL `/media/<slug>.<hash>.<ext>`. It reads the hash out of the path,
maps it to the content-addressed R2 key `media/<aa>/<hash>.<ext>`, and streams the object with the
immutable cache. The route resolves by the hash and ignores the slug, which is what lets the slug
stay cosmetic and a rename stay cheap. Responsive variants then run as Cloudflare Images transforms over
that same route. This shape was chosen over serving the bucket on a custom domain, which would force the
slug into the storage key, and over storing the bytes inside Cloudflare Images directly, which would
reintroduce the host lock-in the logical reference exists to avoid.

## A frontmatter hero resolves like a body image, into a projection

A Post or Page can carry a lead image in frontmatter, the hero, as a nested
`image: { src, alt, caption }` object whose `src` is a `media:` reference like any other. The logical
reference idea carries over: the committed frontmatter holds the content-addressed token, not a path,
so a rename never breaks it.

The body resolver only visits image nodes in the rendered markdown, so a frontmatter reference needs
its own resolution home. The delivery read path takes an injected resolver and computes a derived
`heroImage` projection (`url`, `absoluteUrl`, `alt`, `caption`) on the entry data. The on-disk
`image.src` is never mutated. Resolution is a separate projection, so re-serializing an entry never
writes a resolved URL back to git, and the token keeps its rename-stability. This mirrors the
`ContentSummary.tags` versus `frontmatter.tags` split the codebase already documents: a derived
read-model alongside the canonical stored value.

One image serves two jobs. The template reads `heroImage.url`, the root-relative path, to lay out the
lead picture, and the SEO head reads `heroImage.absoluteUrl` as the `og:image`. A single resolved
value cannot serve both a root-relative `<img>` and an absolute social tag, so the projection carries
both forms. Which field feeds the social card is an explicit choice, the `seo`-flagged image field,
defaulting to the field named `image`, and a concept declares at most one. As a backstop,
`resolveImageUrl` rejects any non-http(s) result, so a still-unresolved `media:` token degrades to no
social image rather than shipping a broken tag.

## Where-used is read from git, by content hash

The admin Media Library answers a question most CMS libraries cannot: where is this image actually
used? cairn answers it because the content is in git and an image's identity is its content hash.
The screen builds one in-memory map from each image's hash to the distinct entries that reference it,
computed once when the screen loads. It keys on the hash, never the cosmetic slug, so a renamed image
and a bare-hash reference both resolve to the same image.

The map reads two halves and unions them. Its `main` half rides the content manifest, which records
each entry's media references the same way it already records its inbound links, so the common case
is a single manifest read with no per-file crawl. Its branch half covers held edits: for every open
`cairn/*` edit branch, cairn parses the one edited entry's markdown and reads both its body image
nodes and its frontmatter hero `image.src`. That hero site is load-bearing, because a hero lives in
frontmatter rather than the body, and an extractor that visited only body images would read every
in-use hero as orphaned. The verdict counts distinct entries, so an image used twice in one entry is
one row.

One caveat shapes the wording. A reference hidden inside a raw-HTML block (an `<img>` tag a writer
dropped in by hand) is invisible to a markdown parse, so absence of a row is not proof of absence of
use. The screen says "found in N entries" or "no references found", never a bare "unused". The
verdict is honest about what it can and cannot see.

## Safe-delete is gated on a fresh read, in a deliberate order

Deleting an image removes its `media.json` row and its R2 object. Two design choices make that safe.

The gate rechecks usage server-side at the moment of the delete, against a fresh index read, never a
count the client passed in. This is the same shape the entry delete uses for its inbound-link check.
A draft that placed the image after the screen loaded is caught, and the delete is refused. The gate
fails closed: if usage cannot be verified (media is off, or the bucket is unbound), the delete does
not proceed.

Order matters in the two-step delete: commit the manifest delete first, then delete the R2 object. If
the process fails between those steps, the failure window leaves bytes in R2 with no row pointing at
them. That is a benign orphan, recoverable by reconcile, and invisible to the site. The reverse order
would leave a row pointing at bytes that no longer exist, which is a broken delivery a visitor would
hit. Designing for the benign failure is the point.

## The asset default alt versus the per-placement alt

An image carries a default alt in its `media.json` row, and each placement of that image carries its
own alt text. These are distinct on purpose, and the Library edits only the first.

A per-placement alt is the text in a specific `![alt](...)` or a specific hero `image.alt`. It
lives in the entry's committed content, and it is what the public site renders for that placement.
The asset default alt is the value that prefills the next time someone inserts the image. Editing the
default in the Library changes what the next placement starts with. It does not reach back and
rewrite the alt already committed in existing placements. So a Library alt change never propagates to
live pages, and the detail panel labels the field as the default to keep that from surprising anyone.
Propagating a fix to every existing use is a cross-branch content rewrite, the same shape as
replace-in-place, and it is deferred with replace.

## What the foundation carries

This phase is the engine substrate: the reference codec, the content-hash and slug naming, the
manifest, the Cloudflare Images URL builder, the grown `AssetConfig`, the R2 store wrapper, and the
render-time resolution of `media:` to a delivery URL. There is no author-facing surface yet; the insert
experience, the placements, and the management screen land in later phases on this base. A site turns
media on by declaring an `AssetConfig`; omitting it leaves media off.
