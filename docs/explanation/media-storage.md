<!-- LEGACY TEXT, UNRELIABLE: this page predates the from-zero rewrite and must never be cited as fact. Facts come from src/ and the four ratified pages only. It will be deleted and rewritten. -->

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

A body resolver only visits image nodes in the rendered markdown, so a frontmatter reference needs
its own resolution home. The delivery read path takes an injected resolver and computes a derived
`heroImage` projection (`url`, `absoluteUrl`, `alt`, `caption`) on the entry data, and the on-disk
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

The hero object also persists a decorative choice that a body image cannot. An author can mark a hero
decorative, meaning its empty alt is deliberate rather than missing, and the needs-alt notice then
leaves it alone. The frontmatter hero stores that as a `decorative: true` key on the `image` object,
so the choice survives a reload and a deliberately decorative hero never reads as needs-alt. A
decorative body image (`![](media:...)`) has no such slot: markdown alt text is a single string with
no place to record "deliberately empty," so a decorative body image still reads as needs-alt after a
reload. The asymmetry is inherent to the two storage formats, one an object with room for a flag, the
other a bare alt string, and it is accepted rather than worked around.

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

## Three populations, and only one of them is irreversible

Once a site has stored bytes and committed manifest rows, the two sets drift apart, and the gap
sorts into three populations the cleanup surface treats differently. An unreferenced asset is a
committed row plus its bytes that no content points at any more. Orphaned bytes are stored R2 objects
with no manifest row at all. A broken reference is a manifest row whose bytes are gone. The first is
reversible, the second is the one irreversible media action, and the third is read-only.

An unreferenced asset is removed the way a single safe-delete removes one: the manifest row is
deleted in a git commit, then the R2 object. Bulk delete is that same gate applied per item across a
selection. It builds one strict cross-branch usage index for the whole batch, deletes every asset
the index shows nothing pointing at, and skips any that are still referenced, reporting them rather
than force-deleting. Because the row removals land as one commit, a bulk delete is reversible: a
developer reverts the commit and the rows return, and the bytes follow until a later cleanup
collects them. The dialog is a plain confirm with no typed gate, since nothing in use can be removed
this way.

Orphaned bytes are different in kind, because raw R2 objects carry no git history. A purge of those
bytes cannot be reverted from the repository, so it is the one irreversible action in the whole media
surface. Everything else (a delete, a replace, an alt fill, a bulk delete) edits git-tracked state
and can be walked back from history. A byte purge edits storage that history never recorded. That is
why the purge alone carries a typed-count confirm, where the editor types the number of files: the
weight of the gate matches the weight of the action.

A broken reference is the reverse leak, a row whose bytes went missing, and it gets no delete action
at all. There is nothing to remove and removing the row would only hide a real fault, so the surface
shows it as a read-only data-integrity readout. The fix is a re-upload of the missing bytes or a
removal of the reference, both author actions, not a one-click purge.

## Orphan collection reconciles in two directions, and fails closed

Collection runs on demand. It pairs a storage reconcile (which compares the stored R2 keys against
the manifest hashes) with a strict cross-branch usage read (which gathers every `media:` reference
across `main` and every open `cairn/*` branch). The reconcile alone is not enough to call a key
orphaned, because reconcile sees only `main`. A file uploaded on a branch but not yet committed to
`main`'s manifest looks orphaned to reconcile, while the branch that uploaded it still references it.
Folding the strict usage index over the reconcile result excludes that branch-only upload, so its
bytes are never classed as orphaned and never offered for purge.

That two-direction read is why a key qualifies as an orphaned byte only when it clears both floors:
no manifest row (reconcile) and no reference anywhere across `main` and every open branch (the strict
index). Miss either floor and the key is kept. The same union answers the broken-reference half from
the other side: a manifest hash with no stored object, which reconcile reports as missing.

Detection fails closed. The reconcile and the strict usage read run inside one guarded
read, so if any branch cannot be read the scan produces no result rather than a partial one. A
partial read could omit a reference and call an in-use file orphaned, which is the exact mistake an
irreversible purge must never make. The surface names the unreadable branch generically and offers a
retry instead of a half-answer.

The purge re-checks the strict index at action time, not from the scan. Between a scan and a confirm,
a key can gain a manifest row (someone committed it) or a new reference (someone placed it on a
branch). At purge time the action re-derives the orphan set fresh and re-runs the strict usage read,
then purges only the keys that still clear both floors. A key claimed or newly referenced since the
scan is skipped. So the typed-count confirm gates the editor's intent, and the fresh re-derivation
guards against the world moving underneath it. The irreversible action carries both belts.

## The asset default alt versus the per-placement alt

An image carries a default alt in its `media.json` row, and each placement of that image carries its
own alt text. These are distinct on purpose, and the Library edits only the first.

A per-placement alt is the text in a specific `![alt](...)` or a specific hero `image.alt`. It
lives in the entry's committed content, and it is what the public site renders for that placement.
The asset default alt is the value that prefills the next time someone inserts the image. Editing the
default in the Library changes what the next placement starts with. It does not reach back and
rewrite the alt already committed in existing placements. So saving a new default in the Library never
propagates to live pages on its own, and the detail panel labels the field as the default to keep that
from surprising anyone. Pushing that default out to every existing use is a separate, explicit action,
Push alt, described below alongside replace.

## Replace repoints, it does not mutate in place

A corrected upload is not the same asset with new bytes. Identity is the content hash, so different
bytes are a different asset with a different hash, full stop. Replace works with that grain rather than
against it. cairn ingests the corrected file as a new content-addressed object, then rewrites every
`main` reference from the old hash to the new one in a single `commitFiles`. The slug rides along: a
placement reading `media:first-light.<oldhash>` becomes `media:first-light.<newhash>`, the name kept
and only the hash changed, since the resolver and the delivery route key on the hash alone.

The old asset is kept, not erased. Its `media.json` row and its R2 bytes stay in place, recoverable
from git history, and collecting an orphaned object once nothing points at it is a later pass rather
than a side effect of replace. Open edit branches are reported, never rewritten: the operation reads
`cairn/*` edit branches to tell the author which held edits still point at the old asset, but it leaves
their content alone, so a draft keeps the file its author placed until it republishes. That is the same
report-only branch-delta the where-used list already shows.

Two safety properties match the rest of the media surface. The operation re-derives its rewrite plan
from a fresh read at apply time, never from a count the screen passed in, so a placement added after
the preview opened is included. And it fails closed: if usage cannot be verified across `main` and
every open branch (media off, the bucket unbound), it refuses rather than rewrite a partial set. A
typed-slug confirm gates the apply, because it edits published content and can break a draft, the same
gate the in-use delete uses.

## Alt propagation across placements

Push alt is the cross-content counterpart to the per-placement-versus-default split above. It reads
the asset's default alt from the `media.json` row and writes it into the placements that have none,
filling the gaps in one atomic commit of the rewritten entries. An explicit opt-in widens the target
to placements that already carry a custom alt, overwriting an author's words, so it is off by default.
A frontmatter hero marked `decorative` is never touched, because its empty alt is a recorded choice,
not a missing description.

The media manifest does not change. The default alt is read from the row, never rewritten there, so
the operation only edits content entries. Alt fill is reversible and frequent, so unlike replace it
carries no typed-slug gate. It shares the same fail-closed read and the same report-only branch-delta:
it rewrites `main`, names the open edits that still lack alt, and refuses if it cannot verify the set.

## What the foundation carries

This phase is the engine substrate: the reference codec, the content-hash and slug naming, the
manifest, the Cloudflare Images URL builder, the grown `AssetConfig`, the R2 store wrapper, and the
render-time resolution of `media:` to a delivery URL. There is no author-facing surface yet; the insert
experience, the placements, and the management screen land in later phases on this base. A site turns
media on by declaring an `AssetConfig`; omitting it leaves media off.
