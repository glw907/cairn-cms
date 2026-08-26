# Media subsystem (`/media`) — any-site audit ranking

Repo: `/home/glw907/Projects/cairn-cms` @ `main`. Bucket: `bucket-media.json`, 7 items, all
`"collision": false` — **no item in this bucket collides with a same-named export of a differing
signature elsewhere.**

Scope note: the barrel `src/lib/media/index.ts` also re-exports `AssetConfig`, `MediaEntry`,
`VariantSpec`, `MediaRef`, and `MediaResolve`. None appear in this bucket (deduped to whichever
subpath the item list assigned them), so they are not ranked here. Four of the seven items in this
bucket depend on those five types for their signatures; a verdict on any of them elsewhere has to
account for that.

Common provenance, established once and referenced per item: every name here was born inside the
engine's own **media foundation** plan series (June 2026) and its **media 2a** follow-on, not from an
outside consumer request. `git log -S` puts the codec at `a58847a1 Add the media: reference codec
(media foundation task 1)`, the manifest at `356d2950 Add the media manifest (media foundation task
3)`, the config at `17bab6ff Grow AssetConfig into the media config and add normalizeAssets (media
foundation task 5)`, the resolver at `1a20810f Resolve media: references in the render pipeline
(media foundation task 6)`, and the public subpath itself at `338b701d Add the public /media subpath
and the showcase vertical slice (media 2a task 10)`. The surface was already audited once, at
`54541401 refactor(surface)!: prune /delivery, /media, and /vite to their proven surfaces`, which
demoted "the manifest CRUD, the content-hash naming helpers, the Cloudflare Images transform-URL
builders, and manifestMediaResolver". The seven survivors are that prune's residue, so this audit is
a second pass over an already-narrowed surface and should be expected to convict less than a virgin
one.

Family consumption, measured (grep over the five sibling repos plus the showcase):

| Item | showcase | ecxc-ski | 907-life | aksailingclub-org | xcathletes-org | cairn-pub |
| --- | --- | --- | --- | --- | --- | --- |
| `normalizeAssets` | yes | yes | yes | yes | yes | yes |
| `buildMediaResolver` | yes | yes | yes (as `makeMediaResolver`, stale pin) | yes | yes | yes |
| `readCommittedManifest` | yes | yes | yes | yes | yes | yes |
| `parseMediaToken` | — | yes | — | yes (×3 modules) | — | — |
| `mediaToken` | — | — | — | yes | — | — |
| `MediaManifest` | — | — | — | yes (×2) | — | — |
| `ResolvedAssetConfig` | — | — | — | — | — | — |

No consumer outside the family exists; the package is published, but nothing in the repo, the
briefs, or the feedback log records a non-family importer.

---

## 1. `ResolvedAssetConfig` — weakest case

- **surfacedAt:** `/media`
- **signature:** `{ enabled: false } | { enabled: true; bucketBinding: string; publicBase: string; urlForm: "slug" | "opaque"; maxUploadBytes: number; allowedTypes: string[]; variants: Record<string, VariantSpec>; transformations: boolean }`
- **collision:** false

**Provenance.** Born with `normalizeAssets` in `17bab6ff` (media foundation task 5) as the engine's
own internal shape. Its defining module still says so in the header:

> `src/lib/media/config.ts:6` — "This module is engine-internal; later phases call normalizeAssets, but the contract surface stays AssetConfig."

Zero sites name it. It reaches the public surface only as the return type of `normalizeAssets` and
the second parameter of `buildMediaResolver`, plus the public runtime field
`src/lib/content/types.ts:411` — `resolvedAssets: import('../media/config.js').ResolvedAssetConfig;`.

**Anonymous-consumer argument.** The affirmative case is TypeScript nameability, not utility: a site
that stores the value in a module-level exported const (`export const resolvedAssets =
normalizeAssets(...)`, which ASC and the showcase both do in spirit) or threads it through its own
helper needs an importable name for it, and an exported function whose return type cannot be named
is a defect in any TS library. Against: no site has ever written the name, the type is a fully
structural view of an engine-internal record, and publishing every field invites a site to
hand-construct one and bypass `normalizeAssets`'s validation entirely — the exact validation
(`cairn: media variant "..." has an unknown gravity`) that guards the transform URL.

**Verdict: keep.** The membership test passes on the nameability ground alone, and the shape is
already minimal. But the keep is honest only with the caveat recorded: it rests substantially on
nothing objecting rather than on an observed anonymous need, so `absenceOfObjection: true`. If a
later pass reshapes `normalizeAssets` (see item 4), re-test this one in the same breath rather than
carrying it forward by inertia.

---

## 2. `mediaToken`

- **surfacedAt:** `/media`
- **signature:** `(ref: MediaRef) => string`
- **collision:** false

**Provenance.** The write half of the codec, landed in `a58847a1 Add the media: reference codec
(media foundation task 1)`, engine-originated. Its engine callers are the upload action and the
media picker (`3077c8c8 Add the media upload action`, `2c840f04 Add MediaPicker combobox over the
media library`). One built site consumer:

> `aksailingclub-org/src/routes/admin/club/events/+page.server.ts:85` — `token: mediaToken({ slug: entry.slug, hash: entry.hash }),`

feeding a hero-image picker in the site's own custom admin, whose allowlist then validates a posted
token against that set.

**Anonymous-consumer argument.** The scenario generalizes cleanly and does not depend on knowing
this family: any site that builds its own admin surface over its own data (an events table, a
staff directory, a product row) and wants to point one of its records at an asset in cairn's media
library must write a `media:` reference the engine will later resolve. A migration script importing
legacy content hits the same need. Against it: the hand-roll is one template literal, so this is
close to the "small hand-roll" failure mode. What saves it is ownership, not size — the token
grammar (16-hex prefix, dot separator, slug rules in `SLUG_RE`) is engine-authored and engine-parsed,
and a site that hand-writes it is guessing at a format the engine may tighten. A hand-rolled token
that is subtly wrong fails silently at render as a broken image, not at build.

**Verdict: keep.** Also an evenness argument: `parseMediaToken` is a clear keep (item 6), and
shipping a decoder without its encoder leaves the public codec half-open, with the round-trip
guarantee the docs promise ("the inverse of `parseMediaToken`, so a parse then write round trip is
stable") unverifiable from outside.

---

## 3. `MediaManifest`

- **surfacedAt:** `/media`
- **signature:** `{ [x: string]: MediaEntry }`
- **collision:** false

**Provenance.** `356d2950 Add the media manifest (media foundation task 3)`, engine-originated as
the in-memory shape of the git-committed `media.json`. Two built site consumers, both ASC:

> `aksailingclub-org/src/theme/post-cards.ts:7` — `import { parseMediaToken, type MediaManifest, type MediaResolve } from '@glw907/cairn-cms/media';`

used as a parameter type on the site's own `resolveCardImage(image, manifest, resolveMedia)`.

**Anonymous-consumer argument.** Two affirmative grounds. First, nameability again: it is the return
type of `readCommittedManifest`, which every site calls. Second, and stronger than item 1's version
of the same argument, sites are observed writing their own helper functions that take the manifest
as a parameter, and those signatures need the name. The counter-argument is that it is a one-line
alias over `MediaEntry` (`Record<string, MediaEntry>`), so a site could inline it — true, but that
trades one exported name for forcing every consumer to restate a shape the engine owns and could
key differently.

**Verdict: keep.** Shape is right: an alias, not a class or an interface a site could feel invited
to implement. No reshape available that would be smaller.

---

## 4. `normalizeAssets`

- **surfacedAt:** `/media`
- **signature:** `(assets: AssetConfig | undefined) => ResolvedAssetConfig`
- **collision:** false

**Provenance.** `17bab6ff Grow AssetConfig into the media config and add normalizeAssets (media
foundation task 5)`; then `0769eaaa Resolve assets at compose and grow the render signature (media
2a task 3)` wired it into `composeRuntime`. Engine-originated. Used by all six family consumers.

**The finding.** The engine already normalizes the adapter's block once, at compose:

> `src/lib/content/compose.ts:53-54` — `assets: adapter.media,` / `resolvedAssets: normalizeAssets(adapter.media),`

and `CairnRuntime.resolvedAssets` is public (`src/lib/content/types.ts:411`). Yet every site
normalizes a **second** time, from a re-typed literal rather than from the adapter's own block:

> `examples/showcase/src/theme/cairn.config.ts:368` — `const resolvedAssets = normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' });`
> `examples/showcase/src/theme/cairn.config.ts:457` — `media: { bucketBinding: 'MEDIA_BUCKET' },`

The identical pair appears in `aksailingclub-org` (`:150` and `:345`), `ecxc-ski` (`:86`),
`xcathletes-org`, `cairn-pub`, and `907-life`. The reference page teaches it:

> `docs/reference/media.md:29` — `const resolveMedia = buildMediaResolver(mediaManifest, normalizeAssets({ bucketBinding: 'MEDIA_BUCKET' }));`

So the documented shape hands every site two sources of truth for its media config. A site that sets
`publicBase`, `transformations`, or a custom variant on the adapter and forgets the duplicate gets a
split brain: the engine's upload, delivery, and admin paths read the adapter's resolved block while
the site's own public render resolver reads a different one. Nothing catches it — both halves
validate fine in isolation, and the symptom is wrong (or dead `/cdn-cgi/image`) URLs on the public
site only.

**Anonymous-consumer argument.** Membership is not in question: a site building its own public
render resolver must obtain a resolved config, and `buildMediaResolver` cannot take the runtime
without dragging kit and workers-types into `/media`'s `.d.ts`, which this subpath exists to prevent
(`docs/reference/media.md:7-9`). The form is what fails. The anonymous consumer has no way to know
the engine already did this work, because the only example shows the literal.

**Verdict: reshape.** Right membership, wrong form. See `reshapeNote`. This is the one item in the
bucket where the current shape actively manufactures a defect class rather than merely being larger
than necessary, and migration cost is no argument against fixing it (churn is free until beta).

---

## 5. `readCommittedManifest`

- **surfacedAt:** `/media`
- **signature:** `(globResult: Record<string, unknown>) => MediaManifest`
- **collision:** false

**Provenance.** `ded88322 feat(media): readCommittedManifest helper so a missing media.json degrades
to empty` — engine-originated, and the commit subject states the need. It survived the earlier
surface prune (`54541401`) while its sibling manifest CRUD did not. All six family consumers call
it.

**Anonymous-consumer argument.** The scenario is universal by construction, not by family
recurrence: every cairn site with media on must read a manifest that **the engine's own admin
commits**, and on a fresh site that file does not exist yet. The trap it closes is real and
non-obvious:

> `docs/reference/media.md:67-68` — "A static import of an absent `media.json` fails the Vite build before any runtime degrade can run, so a fresh site can't build. A glob with no match returns `{}` instead of throwing."

A site that reaches for the obvious `import manifest from '.../media.json'` cannot build until an
editor uploads a first image — a first-run failure with a misleading module-not-found message.
Against: the body is two lines (`parseMediaManifest(Object.values(globResult)[0])`), so the hand-roll
is small. But a small body encoding a build-time trap the consumer cannot see is exactly the case
where an export earns its keep, and the `Record<string, unknown>` parameter is the honest shape,
since Vite requires the glob pattern to be a static literal at the call site and the engine can
therefore never own that call.

**Verdict: keep.** Shape is forced by Vite and is right. One caveat worth carrying: this is the item
in the bucket closest to "a discoverability problem an export would not fix"; if a future scaffold or
`cairn-doctor` check made the glob incantation impossible to get wrong, re-test it.

---

## 6. `parseMediaToken`

- **surfacedAt:** `/media`
- **signature:** `(href: string) => MediaRef | null`
- **collision:** false

**Provenance.** `a58847a1 Add the media: reference codec (media foundation task 1)`,
engine-originated; the engine's own render step and delivery route are its first callers
(`1a20810f`, `6ff13feb`). Two built site consumers, four modules:

> `ecxc-ski/src/theme/hero-image.ts:4-6` — "it cannot reach `createPublicRoutes`'s internal `deriveHeroImage`. This module re-derives the same projection by hand from the two already-public pieces (`parseMediaToken`, a site's own media resolver)"

and ASC's `post-cards.ts`, `home-images.ts`, `event-images.ts`.

**Anonymous-consumer argument.** This is the clearest "cannot legally reach the surface" case in the
bucket. A `media:` token is written into content **by cairn's own editor**, and the engine resolves
it automatically only inside the markdown body pipeline. The moment a site renders an image from
anywhere else — a frontmatter hero on a bespoke home layout, a card grid over `posts.all()`
summaries, an OG-image endpoint, an RSS enclosure — it holds an engine-authored string and must
decode it. That is a generic consequence of cairn's design (frontmatter image fields plus a
body-only resolver), reachable by any consumer who ever writes a custom template, and the ecxc
comment above is a site independently arriving at it. Against: the parse is a regex pair a site
could copy — and would then own forever, against a grammar the engine can tighten (the doc already
admits two accepted forms, `media:<slug>.<hash>` and bare `media:<hash>`).

**Verdict: keep.** Shape is right: total function, `null` for anything that is not a token, no
throw, so a site can safely feed it arbitrary hrefs.

---

## 7. `buildMediaResolver` — strongest case

- **surfacedAt:** `/media`
- **signature:** `(manifest: MediaManifest, resolved: ResolvedAssetConfig, opts?: { preset?: string }) => MediaResolve`
- **collision:** false

**Provenance.** Landed as `makeMediaResolver` in `1a20810f Resolve media: references in the render
pipeline (media foundation task 6)`, renamed in the C2 breaking window:

> `docs/superpowers/plans/2026-08-02-c2-breaking-window.md:141` — "`makeMediaResolver`: renamed `buildMediaResolver`; the four-verb system is the recorded rule."

Engine-originated; a real consumer's migration is on record feeling the rename
(`docs/internal/feedback/2026-08-05-cairn-pub-migration.md:24`). All six family consumers call it.

**Anonymous-consumer argument.** It is the required wiring for cairn's central promise: a
`media:` reference in published content becomes a working delivery URL on the public site. A site
threads it through `render` as `resolveMedia`, and without it published content renders broken
images. What it encodes is entirely engine-owned and not honestly hand-rollable: the delivery path
grammar (`publicPath(entry.slug, entry.hash, entry.ext, resolved.urlForm, resolved.publicBase)` —
whose naming helpers were deliberately demoted from the public surface in `54541401`), the
rename-safety rule that the path is built from the manifest entry's slug rather than the token's,
the Cloudflare Images variant URL form, the `transformations: false` fallback that keeps a fresh
zone from serving dead `/cdn-cgi/image` URLs, and the `imageDetail` side channel that emits
intrinsic `width`/`height` and a width-ladder `srcset`. A site hand-rolling this reproduces a
CDN-specific URL grammar it does not own and silently loses the layout-shift and responsive
behavior. Against, in fairness: the third parameter `opts?: { preset? }` is thinner than the rest —
a per-call preset on a resolver built once per site is an odd axis, and no family site passes it.
That is a wart, not a membership failure, and it costs nothing to leave.

**Verdict: keep.** Membership and shape both pass. The one thing worth watching is that its second
parameter's source is the defect described in item 4; fixing that is a reshape of `normalizeAssets`
and the docs example, not of this function.

---

## Cross-item observations

- **Evenness.** Six of seven are the minimum wiring for one coherent story — read the manifest,
  resolve the config, decode a token, build a URL — plus the two type names those signatures need.
  That is a clean, even surface, which is what a second audit over an already-pruned barrel should
  find.
- **The one real defect is not membership, it is a duplicated source of truth** (item 4): the engine
  normalizes the adapter's media block at compose and then documents a call that normalizes a
  re-typed literal a second time. Six of six family consumers copied it, which is the loudest
  possible signal that the documented shape, not the sites, is at fault.
- **No collisions** in this bucket; nothing here shares a name with a differing signature elsewhere.
- **Nothing retires.** Argued in both directions, `mediaToken` and `ResolvedAssetConfig` were the two
  genuine retire candidates: `mediaToken` for a one-line hand-roll, `ResolvedAssetConfig` for having
  no consumer that names it. Both survive on non-size grounds — engine-owned grammar and codec
  symmetry for the first, TypeScript nameability for the second — and the second's keep is flagged as
  resting on the absence of an objection.
