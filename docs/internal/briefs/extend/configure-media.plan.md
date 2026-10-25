# Page plan: Configure media

Page: `docs/extend/configure-media.md`. Page type: task guide. Status: new page, no prior version on
disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The drafter
drafts from this plan: it is the source of the page's order, each section's claim, and each fact's
placement. The structural edit seat reads it before any prose exists. The plan is Google's outline
written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug `configure-media`: job,
covers, out-of-scope list, exemplars); "The page anatomies" and "The introduction" in
`docs/internal/docs-register.md`; every fact bullet named below in `docs/internal/facts/extend.md`,
`docs/internal/facts/reference.md`, and `docs/internal/facts/admin.md`; the two exemplars
(`extenders/cf-workers-bindings`, `extenders/django-custom-management-commands`); the reference
entries each link names (`docs/reference/core.md` "`media` (adapter member)";
`docs/reference/media.md` `normalizeAssets`, `createMediaResolver`, and "Types";
`docs/reference/sveltekit.md` `createContentRoutes`, "Writing an admin fetch action", and
`createMediaRoute`; `docs/reference/admin.md` `CairnAdminShell`; `docs/reference/delivery.md`
`PublicRoutesConfig`; `docs/reference/log-events.md`, the `media.*` rows;
`docs/reference/cli-cairn-doctor.md` "The checks"); the sibling pages
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Compose the runtime and the admin", "Render the
entry", "Next steps"), `docs/extend/debug-your-site.md` ("`media.resolver_absent`"),
`docs/extend/theme-your-public-site.md` ("Iterate locally"), `docs/extend/restrict-admin-access.md`,
and `docs/extend/architecture.md` ("Data tiers"); and the code the facts cite
(`src/lib/media/config.ts`, `src/lib/media/sniff.ts`, `src/lib/sveltekit/media-route.ts`,
`src/lib/sveltekit/content-routes-media-ingest.ts`, `src/lib/sveltekit/content-routes-entry-write.ts:226-243`,
`src/lib/sveltekit/cairn-admin.ts:297,332,370-383`, `src/lib/render/resolve-media.ts`,
`templates/waymark/wrangler.jsonc:37`, `templates/waymark/src/theme/cairn.config.ts:40-60`, and
`templates/waymark/src/routes/media/[...path]/+server.ts`). No `docs/editors/` page is on disk.

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.

## What the page argues

Media in cairn is four pieces, and the engine owns only the behavior behind them: an R2 bucket bound
to the Worker, the adapter's `media` block that names it, a delivery route the site mounts, and,
on a hand-built site, the resolver that turns a `media:` reference into a URL on public pages. The
page's spine is those four pieces in the order each depends on the last, with every option decided
before the one file whose location depends on an option. Once the resolver is in place, the page
sets out the boundaries the engine draws where each one bites: what a missing asset does and how to
fail the build on one, what the Library can count as a use, and what a screen of the reader's own
must send. Verification and the failure path close the page, per the task-guide anatomy, so the
reader checks the whole setup once, after every piece and boundary is decided.

The page serves two readers with one spine. The developer who finished the add-cairn tutorial has
no media yet (the tutorial's "Next steps" sends them here, and its entry route passes no
`resolveMedia`), so they run every step. The developer on a scaffolded site already has the
binding, the block, and the route (`f:9hchnv`, `f:qtvesq`), so they come to change an option or to
learn a boundary. The introduction names both, and "Before you begin" tells the scaffolded reader
which sections to skip. A third reader, building an admin screen that uploads, has one optional
task section, placed ahead of the verification so the page keeps one task anatomy.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (`f:lu67dk`, `f:xjdhau`, `f:r8vksa`): bytes in R2,
   records in committed JSON, content naming an asset by a `media:` reference, and media off until
   the adapter declares a block. Without the model, "declare a binding, mount a route, wire a
   resolver" reads as three unrelated chores.
2. **Before you begin** (cover 1, first half) names the bucket binding and the adapter file per
   site, and routes the scaffolded reader past the steps they already have.
3. **Declare the bucket on the adapter** (cover 1, second half) shows the `r2_buckets` entry and the
   `media` block together, the Cloudflare bindings exemplar's take: the declaration and its use
   appear side by side, so the one name both carry is visible. It also states the rule where it
   bites (`cairn doctor` compares the two names), the Django exemplar's take. It ends with what the
   engine resolves the block into, since the next two sections set and consume that resolved value.
4. **Set the options** (cover 2) precedes the route (cover 3) because two options decide the
   route: `publicBase` sets the directory the route must live in (`f:ex4hss`), and `urlForm` sets
   whether a URL carries a fan-out directory under it (`f:s1n77t`). Choosing them first mounts the
   route once. Every default works, so a reader who changes nothing reads one table and moves on.
5. **Mount the media route** (cover 3) follows the options it depends on. The Django exemplar's
   take lands here: the file tree shows the route under its public base before the code, and the
   placement rule sits beside it.
6. **Resolve media on public pages** has no cover of its own but is part of "turn on media" for the
   tutorial's site, whose entry route passes no resolver. It is where the outline's "wrapping the
   resolver" (cover 4) gets the resolver it wraps, and the write-a-markdown-component outline sends "the
   media resolver" here (`docs/internal/outlines/extend.json`, slug `write-a-markdown-component`,
   out-of-scope list). It precedes Verify, which checks a rendered URL.
7. **Fail the build on a missing asset** (cover 4) follows the resolver directly. "Resolve media on
   public pages" ends on the resolver returning `undefined` for a hash with no row, which is where
   the reader decides what a miss does: the section states the default (a broken image and a
   successful build), then the one-step wrapper around the resolver just built, then the wrapper's
   caveat, which sits on the step it qualifies. It is an optional step of the same task, so it sits
   before the verification, not after it.
8. **Asset references the Library counts** (cover 5), the page's one explanation section, follows the
   missing-asset section because it explains the usual way a page gets a missing asset: an asset
   deleted while an uncounted reference still names it. Its first sentence ties it to a task,
   deleting an asset, per the anatomy's lead-in rule. It precedes the verification, since it shapes
   a choice (whether to delete) rather than a check.
9. **Upload from your own screen** (cover 6) is an optional task for a site with its own admin
   screen. It sits ahead of the verification, so the page keeps one task anatomy: steps, then one
   verification, then one failure path. It needs no verification of its own: its refusals are
   "Diagnose a failed check" item 1, and the image it uploads is checked the same way the Library's
   is. Its first sentence states its condition, so the reader without such a screen skips it.
10. **Verify media** (cover 7) exercises the four pieces: an upload through the Library, the
    rendered image URL, and the route's headers. It is the first of the anatomy's two closing body
    sections (item 4).
11. **Diagnose a failed check** is the anatomy's failure-path slot (item 5) and the last body
    section. The extend recovery surface has a row only for `media.resolver_absent`, so the page
    links that row and keeps the other causes itself (friction filed).
12. **See also** closes the page, per the anatomy (item 6).

### Departures from the outline's covers order, with the reason for each

- Cover 1 splits: the binding and the adapter file become "Before you begin"; the block itself
  becomes the first step section, paired with the binding it names; "what the resolved asset config
  holds" closes that section (item 3).
- A section the covers do not list, "Resolve media on public pages", joins between the route and
  the missing-asset section (item 6).
- Covers 4, 5, and 6 keep the outline's order (items 7 to 9). Cover 4 follows "Resolve media on
  public pages" directly, whose last sentence it takes up; cover 6 is marked optional by its first
  sentence.
- Cover 7 stays last among the body sections and splits into the verification section and the
  failure-path section, the anatomy's items 4 and 5 (items 10 and 11). This keeps the anatomy's
  fixed order (steps, verification, failure paths, see-also): every step, the optional ones
  included, comes before the one verification, and nothing but See also follows the failure path.

### Exemplar takes, and where each lands

- **Cloudflare, Bindings (env).** The first example pairs the binding's declaration in the Wrangler
  config with its use in code. It lands as "Declare the bucket on the adapter": one `wrangler.jsonc`
  fragment and one adapter fragment, shown together, sharing the name `MEDIA_BUCKET`. Left behind:
  the four-language tabs.
- **Django, custom management commands.** The file-location tree comes before the code, and a rule
  is stated where it bites. The tree lands in "Mount the media route" (the route under its public
  base) and "Resolve media on public pages" (the adapter file and the entry route); the rules land
  beside the steps they govern (`publicBase` and the route directory, `allowedTypes` narrowing, the
  plan's body limit, the wrapper's caveat). Left behind: the appended API reference, which stays on
  `docs/reference/`.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's fixed
headings; "Asset references the Library counts" is the one explanation section and takes a noun phrase.
`docs/extend/add-cairn-to-a-sveltekit-app.md:1223` and `docs/extend/architecture.md:75` link the page
itself, with no anchor, so every heading is free.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons the
final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** An image an editor uploads is stored
   as bytes in an R2 bucket, while a committed JSON file, `src/content/.cairn/media.json`, records it
   (`f:lu67dk`). Content names the image by a `media:` reference that resolves through its content
   hash (`f:xjdhau`, scoped to that clause). The engine supplies the upload, the delivery, and the
   resolver; the site supplies the bucket binding, the adapter block that names it, and the route
   file, plus, on a hand-built site, the wiring that hands the resolver to its public entry route
   (`f:twqb0s`, scoped: without it a `media:` reference renders as a literal token). Media stays
   off until the adapter declares that block (`f:r8vksa`, `f:2zytgf`). One clause names the
   boundary the page also covers: a `media:` image with no manifest row renders broken while the
   build succeeds, and the page shows how to fail the build instead (`f:frgg7d`, scoped).
2. **Who and why, with the contract.** Two readers. A developer on the site the add-cairn tutorial
   builds turns media on; their adapter is `src/lib/cairn.config.ts` (`f:q07rd5`). A developer on a
   scaffolded site, whose adapter is `src/theme/cairn.config.ts`, already has media on and comes to
   change its options or to learn what the engine refuses, serves, counts, and does with a missing
   asset (`f:q07rd5`, `f:9hchnv`, `f:qtvesq`). The contract sentence, inside the framing: declare
   the bucket on the adapter, set its options, mount the media route, wire the resolver into your
   public pages (a hand-built site), and check that an uploaded image renders from your site with
   the route's headers. A third reader builds an admin screen that uploads; name "Upload from your
   own screen" by heading for that reader (register, "A page may serve several readers").
3. **Prior knowledge.** SvelteKit catch-all routes and `+server.ts` request handlers, bindings in
   `wrangler.jsonc`, and creating an R2 bucket. No cairn knowledge beyond the adapter file and the
   site's public entry route.
4. **What the page does not cover, with the page that does (wrong-place routing).** Seeding local
   media while theming: `docs/extend/theme-your-public-site.md#iterate-locally`. Restricting who
   reaches the Library: `docs/extend/restrict-admin-access.md`. Where R2 sits among the site's data
   stores: `docs/extend/architecture.md#data-tiers`. Using the Library as an editor belongs to the
   editor documentation, which has no page yet: name it in words, with no link. This sentence may
   name the page, since scope has no subject-first form.

## Sections, in order

Each entry carries the page heading; **First sentence**, the one sentence a reader takes from the
section, which is the section's first sentence on the page (its claim is fixed here, its wording may
move to the register's voice, and a task-section sentence stays under 26 words); **Facts**, the ids it
draws on ("cited again" marks a fact whose primary home is another section); the content and steps;
and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in passed
the provenance extractor with no row).

### Before you begin

**First sentence:** Media needs an R2 bucket bound to your Worker and the adapter file of the site
you are changing.

**Facts:** `f:9hchnv` (scoped: an `r2_buckets` entry binds the bucket by `bucket_name`; the scaffold's
binding is `MEDIA_BUCKET`), `f:q07rd5` (scoped: the two adapter paths), `f:qtvesq` (scoped: the
scaffold's route file exists).

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- An R2 bucket and an `r2_buckets` entry in `wrangler.jsonc` that binds it to the Worker. Link
  Cloudflare's R2 Workers API usage page for creating the bucket and the binding (vendor link; the
  drafter confirms the URL resolves, for example
  https://developers.cloudflare.com/r2/api/workers/workers-api-usage/). A scaffolded site binds
  `MEDIA_BUCKET` already (`f:9hchnv`).
- The adapter file: `src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts` on
  the add-cairn tutorial's site (`f:q07rd5`). Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#write-the-site-config-and-a-minimal-adapter` for the
  tutorial's adapter.
- For the hand-built site only: the entry route that tutorial's "Render the entry" creates. Link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#render-the-entry`.

Then one sentence for the scaffolded reader: a scaffolded site already declares the block and mounts
the route (`f:9hchnv`, `f:qtvesq`), so it can go straight to "Set the options", then on to "Fail the
build on a missing asset" and the sections after it. Name the sections by heading. Claim nothing
about the scaffold's resolver wiring: no fact states it.

**Hand-off (no-claim):** "With the bucket bound, declare it on the adapter."

### Declare the bucket on the adapter

**First sentence:** The adapter's `media` block turns media on, and its one required member,
`bucketBinding`, names the binding of an `r2_buckets` entry in `wrangler.jsonc`.

**Facts:** `f:9hchnv`, `f:r8vksa`, `f:2zytgf` (scoped: `media` is an optional member of
`defineAdapter`), `f:2hnxsr` (scoped: the bucket is resolved at request time from the declared
binding name, never a hard-coded one), `f:6e22v1`, `f:69rw88`.

Content:

- One sentence after the first: a declared block with no `bucketBinding` throws `cairn: a media
  assets block must name its R2 bucket binding` when the config is normalized (`f:9hchnv`,
  `f:r8vksa`).
- A numbered list of two steps, one action each, the location first, lead-in "To declare the
  bucket, follow these steps:" (no-claim):
  1. In `wrangler.jsonc`, confirm that `r2_buckets` holds the entry, or add it:
     `{ "binding": "MEDIA_BUCKET", "bucket_name": "<bucket>" }` (`f:9hchnv`).
  2. In the adapter file, declare the block as a constant and pass it to `defineAdapter` as
     `media` (`f:2zytgf`). One clause: the constant lets "Resolve media on public pages" hand the
     same object to `normalizeAssets`; the `normalizeAssets` entry in
     `docs/reference/media.md#normalizeassets` says why (opened and confirmed: it says a site's own
     resolver passes `normalizeAssets` the same object it hands the adapter's `media:` member).
- The two fragments shown together, the Cloudflare exemplar's take: the `r2_buckets` line, then the
  adapter excerpt (`const media = { bucketBinding: 'MEDIA_BUCKET' };` and `media,` inside
  `defineAdapter({ ... })`, other members elided with a comment). Name the file in each block's
  first-line comment, the tutorial's `src/lib/cairn.config.ts` for the adapter.
- The rule where it bites, one sentence: `cairn doctor` reports `config.media-bucket-missing` as a
  warning when no `r2_buckets` entry carries the block's binding name, and a missing binding at
  request time makes the route answer 503 (`f:6e22v1`, `f:9hchnv`). Link
  `docs/reference/cli-cairn-doctor.md#the-checks`.
- The section's closing explanation, one or two sentences: the engine resolves the block once into a
  resolved config holding the binding name, the public base, the URL form, the upload limit, the
  allowed types, and the transformations flag, and the media route and the upload action both read
  that value (`f:69rw88`). So the options the next section sets reach both.

**Hand-off (no-claim):** "Next, choose the options, or keep the defaults."

### Set the options

**First sentence:** The block's five optional members bound uploads (`allowedTypes`,
`maxUploadBytes`), shape image URLs (`publicBase`, `urlForm`), and turn on responsive images
(`transformations`).

**Facts:** `f:fnat1w`, `f:6kdagb`, `f:enuyhg`, `f:ett331` (scoped: the effective ceiling is the
lower of `maxUploadBytes` and the request-body limit), `f:9awije`, `f:ex4hss` (scoped: `publicBase`
sets the prefix but not the route), `f:s1n77t`, `f:f4ulxz` (scoped: the route serves both forms),
`f:kp50li`, `f:2hnxsr` (scoped: srcset only with transformations on and the width known), `f:wdmlys`
(scoped), `f:ckuow3`.

Content:

- One step, a single bulleted item: in the adapter file, add any option to the `media` constant.
- A table of the five options, one row each, columns Option, Default, What it does. Each cell stays
  short; the rule that bites follows the table as a sentence per option, in this order:
  - `allowedTypes`, default `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`
    (`f:fnat1w`). The rule: it can only narrow that list. The engine stores only those five sniffed
    types, so a sniffed HEIC or unrecognized file is refused as `unsupported_type` whatever the list
    says, and so is an upload declared as SVG, HTML, or XML or starting with `<` (`f:enuyhg`).
    Listing another type adds nothing (friction filed; never say it throws).
  - `maxUploadBytes`, default 25 MB (`f:fnat1w`, `f:6kdagb`). The rule: Cloudflare caps a Worker's
    request body by the account plan and answers a larger request with a 413 of its own, so the
    effective ceiling is the lower of this value and that cap, and raising it past the cap does
    nothing (`f:ett331`, `f:9awije`). Link Cloudflare's Workers limits page,
    https://developers.cloudflare.com/workers/platform/limits/#request-and-response-limits, for the cap per plan;
    copy no figure.
  - `publicBase`, default `/media` (`f:fnat1w`). The rule: it moves every URL the engine writes, in
    rendered pages, the editor, and the Library, but not the route; the route's directory must match
    it, as "Mount the media route" says (`f:ex4hss`).
  - `urlForm`, default `'slug'` (`f:s1n77t`). Give both shapes: `<publicBase>/<slug>.<hash>.<ext>`
    and, for `'opaque'`, `<publicBase>/<first two hash characters>/<hash>.<ext>`; any other value
    throws `cairn: media urlForm must be "slug" or "opaque"` (`f:s1n77t`). One clause: the route
    reads only the last segment, so it serves either form (`f:f4ulxz`, scoped).
  - `transformations`, default `false` (`f:kp50li`). The rule: it tells the engine that Cloudflare
    Image Transformations is on for the zone, a zone setting the dashboard or API turns on and a
    Worker can't flip, so set it to `true` only after turning that on. With it `false`, an image
    gets the bare full-size path; with it `true`, an image whose width is known also gets a `srcset`
    built from Cloudflare transform URLs and its intrinsic `width` and `height` (`f:kp50li`,
    `f:2hnxsr`, `f:wdmlys` scoped). Link Cloudflare's Image Transformations page (vendor; the drafter
    confirms the URL). For the width ladder, the `sizes` hint, and when an image gets no `srcset`,
    link `docs/reference/media.md#createmediaresolver` (opened and confirmed: it states the fixed
    width ladder, the `sizes` hint from the `:::figure` role, and that unknown dimensions or a too
    narrow width get none).
- One sentence on presets, after the `transformations` rule: the engine's transform vocabulary is
  four built-in presets, `thumb`, `inline`, `card`, and `hero`, a site can't add one, and a site that
  needs another size builds a `/cdn-cgi/image/<options>/<path>` URL itself (`f:ckuow3`). Link
  Cloudflare's transform-via-URL page (vendor). Never say the presets build the `srcset` (friction
  filed).

**Hand-off (no-claim):** "With the options chosen, mount the route that serves the files."

### Mount the media route

**First sentence:** Mount `createMediaRoute` at `<publicBase>/[...path]`, which is
`src/routes/media/[...path]/+server.ts` under the default base, with the catch-all param named
`path`.

**Facts:** `f:ex4hss`, `f:qtvesq`, `f:f4ulxz`, `f:fjnszk`. Cited again: `f:fnat1w` (the `/media`
default), `f:69rw88` (the route reads the runtime's resolved config).

Content:

- One sentence on the rule: a route anywhere else, or a param under another name, makes every
  generated image URL 404, with no error at startup (`f:ex4hss`; the no-startup-error clause is the
  friction entry's, so keep it to "every generated image URL 404s" unless the fact read confirms).
- The file tree before the code (Django take): `src/routes/media/[...path]/+server.ts` under the
  project root, with a note that a different `publicBase` renames the `media` directory.
- One step, a single bulleted item, location first: in the route directory, create `+server.ts`
  exporting `GET = createMediaRoute({ runtime })`, importing `runtime` from the module that composes
  it (`f:qtvesq`). The code block is the tutorial site's: `import { runtime } from
  '#lib/cairn.server.js';`, the module the tutorial's "Compose the runtime and the admin" creates.
  One clause: a scaffolded site's file imports it from `#chassis/cairn.server.js` (`f:qtvesq`'s
  source; `f:f21bcz` names the same import for the hooks; do not cite `f:f21bcz`, quote only the
  path the scaffold's route file shows).
- Two or three sentences on what the route does, each tying to a later check: it reads only the
  last path segment's hash and extension, so the slug and any fan-out directory are ignored
  (`f:f4ulxz`); it validates a 16-character hex hash and an allow-listed image extension before
  reading the bucket (`f:qtvesq`); and every response other than a 404 carries
  `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Content-Security-Policy:
  default-src 'none'; sandbox`, and `Cache-Control: public, max-age=31536000, immutable`, the
  route's own security headers because it sits outside `/admin` (`f:fjnszk`, `f:qtvesq`). An object
  stored with no content type is served as `application/octet-stream` (`f:fjnszk`).
- Link `docs/reference/sveltekit.md#createmediaroute` for conditional and range requests.

**Hand-off (no-claim):** "On a hand-built site, wire the public pages next."

### Resolve media on public pages

**First sentence:** A hand-built site's public pages resolve `media:` references only once the entry
route receives a resolver built by `createMediaResolver`.

**Facts:** `f:twqb0s`, `f:c8c9ji`, `f:fhnvn8`, `f:bnt2wh`, `f:lu67dk` (scoped: `media.json` sits in
`src/content/.cairn/`). Cited again: `f:2hnxsr` (the resolver returns the bare full-size path).

Content:

- One sentence on the failure the step prevents: without a resolver, every `media:` reference renders
  as a literal token (`f:twqb0s`).
- A numbered list of two steps, lead-in "To wire the public pages, follow these steps:" (no-claim):
  1. In `src/lib/cairn.config.ts`, export a resolver built from the committed manifest and the same
     `media` constant: `createMediaResolver(readCommittedManifest(import.meta.glob('../content/.cairn/media.json',
     { eager: true, import: 'default' })), normalizeAssets(media))`. One sentence after it: the glob
     form lets a site with no `media.json` yet build, where a static import of the absent file fails
     the build (`f:fhnvn8`, `f:lu67dk`).
  2. In `src/routes/[...path]/+page.server.ts`, pass the resolver to `createPublicRoutes` as
     `resolveMedia`, with `assetsEnabled: true` (`f:bnt2wh`). One clause: `assetsEnabled` only makes
     the engine log `media.resolver_absent` if a later edit drops `resolveMedia` (`f:bnt2wh`,
     `f:twqb0s`).
- One sentence after the steps: the resolver builds the URL from the manifest's row, not the token,
  so renaming an asset never breaks a reference, and it returns `undefined` for a hash with no row,
  which "Fail the build on a missing asset" takes up (`f:c8c9ji`).
- The tutorial's `render` already forwards `resolveMedia` to `renderMarkdown` (its "Write the site
  config and a minimal adapter" step); say so in one clause only if the drafter confirms the line on
  `docs/extend/add-cairn-to-a-sveltekit-app.md:333-334` at draft time, and cite no fact for it.
- Link `docs/reference/delivery.md#publicroutesconfig` and `docs/reference/media.md#createmediaresolver`.

**Hand-off (no-claim):** "To catch a missing asset before it ships, make the build fail on one."

### Fail the build on a missing asset

**First sentence:** A `media:` image with no manifest row logs `media.resolve_missing` and renders as
a broken image, and the build still succeeds.

**Facts:** `f:frgg7d`, `f:nlkgag`. Cited again: `f:c8c9ji` (the resolver returns `undefined` on a
miss).

Content:

- One sentence on the marker: the image gets `src="#"`, the class `cairn-broken-media`, and the title
  `Missing media asset`, and keeps its alt (`f:frgg7d`). One clause of contrast: a dangling `cairn:`
  link fails the prerender instead (`f:frgg7d`).
- One step, a single bulleted item, location first, lead-in "To fail the build on a missing asset,
  follow these steps:" only if the drafter makes it a list of more than one; otherwise no lead-in:
  in the adapter file, wrap the resolver in a function that throws when it returns `undefined`, and
  pass the wrapper where the resolver went (`f:frgg7d`).
- The caveat, as a Caution notice directly under the step: the built-in resolver carries an
  `imageDetail` property the render step reads for each image's intrinsic size and `srcset`; a new
  function drops it, so the wrapped resolver's images render with neither, unless the wrapper copies
  `imageDetail` across (`f:nlkgag`). The code block shows the copy:
  `wrapped.imageDetail = resolver.imageDetail;` beside the throwing wrapper. State that the property
  is not on the public `MediaResolve` type (`f:nlkgag`), and no more.

**Hand-off (no-claim):** "Before you delete an asset, know what the Library can see."

### Asset references the Library counts

**First sentence:** The Library counts a `media:` reference only in an image field's `src` and in a
body image, so "no references found" never proves an asset unused.

The first sentence ties the explanation to a task (deleting an asset), per the anatomy's lead-in
rule; it may open with that tie ("Before you delete an asset, ...") if the wording stays one sentence
under 26 words.

**Facts:** `f:fn4zb7`. Not `f:fxit31` (cut).

Content, three to four sentences, no steps:

- What is counted: the `src` of every `image`-typed field, at the top level or nested at any depth in
  `object` and `array` fields, and every body image node, a `:::figure`'s inner image included
  (`f:fn4zb7`).
- Where it looks: the published manifest on `main` and every open `cairn/*` branch (`f:fn4zb7`).
- What is not counted: a token in a text field, a link, a directive or component attribute, a raw
  HTML block, or a code span; so the Library reads "no references found", never "unused", and can
  show it for an asset a page still renders (`f:fn4zb7`).
- One sentence of consequence, tying back to the section before: deleting such an asset leaves that
  page with a missing asset, the case "Fail the build on a missing asset" covers (`f:fn4zb7`,
  `f:frgg7d`). Name the section by heading, never by position.

**Hand-off (no-claim):** "If your site uploads from a screen of its own, build that request next; otherwise, go on to the verification."

### Upload from your own screen

**First sentence:** If you build an upload screen of your own, post the file's raw bytes to the
admin's `mediaUpload` action as a `text/plain` body.

The condition comes first, so a reader with no such screen skips the section (the anatomy's
conditional-step rule, and the optional task the order argues for in item 9). The section has no
verification of its own: an image it uploads is checked by "Verify media" steps 4 and 5 once an
entry references it, and its refusals are "Diagnose a failed check" item 1.

**Facts:** `f:g4cwcw`, `f:1mgfhj` (scoped: `mediaUpload` is on the typed admin contract and wraps the
same upload action, gated to the media view), `f:joo5f2` (scoped: the media view is `/admin/media`),
`f:ett331`, `f:9awije`. Cited again: `f:enuyhg`.

Content:

- One sentence on the address and the required headers: post to `/admin/media?/mediaUpload` with
  `Content-Length` and `X-Cairn-CSRF` (`f:1mgfhj`, `f:joo5f2`, `f:g4cwcw`).
- One sentence on the header's value, claim-free: the `X-Cairn-CSRF` value is the token the admin
  shell's data carries; link `docs/reference/admin.md#cairnadminshell` (opened and confirmed: it says
  an authed `AdminShellData` carries a `csrf` token). No fact states it (friction filed), so the
  sentence names the entry and claims nothing itself.
- A table of the optional headers, each URI-encoded: `X-Cairn-Filename`, `X-Cairn-Alt` (capped at 160
  characters), `X-Cairn-Display-Name`, `X-Cairn-Width`, `X-Cairn-Height` (`f:g4cwcw`).
- One sentence on the envelope, the page's key rule here: every refusal arrives as a `fail()` inside
  SvelteKit's 200 JSON action envelope, so the screen reads `type` and `status` from the body, never
  the HTTP status (`f:g4cwcw`). Link `docs/reference/sveltekit.md#writing-an-admin-fetch-action`
  (opened and confirmed: it states the `text/plain` body, the header, and the 200 envelope).
- A table of the three refusals the screen's own request decides, columns Reason, Envelope status,
  When: `length_required` (411, no positive integer `Content-Length`), `too_large` (413, declared or
  actual size above `maxUploadBytes`), `unsupported_type` (415 is not stated by a fact: give the
  reason and its condition only, no status) (`f:ett331`, `f:g4cwcw`, `f:enuyhg`). One sentence after
  the table: a body over the plan's request limit never reaches the action, because Cloudflare
  answers it with a real 413 first (`f:9awije`, `f:ett331`). Link `docs/reference/log-events.md` for
  the other reasons.
- One sentence on the result, claim-free: for what the action returns and when its record is
  committed, link `docs/reference/sveltekit.md#createcontentroutes` (opened and confirmed: it says
  `uploadAction` returns the `media:` reference and the server-owned record and commits nothing until
  the entry is saved). Do not state the commit behavior on the page (friction filed).

**Hand-off (no-claim):** "With every piece in place, check the result end to end."

### Verify media

**First sentence:** An image uploaded through the Library renders on a published page from a URL
under your `publicBase`, and the route serves it with its security headers.

**Facts:** `f:joo5f2` (scoped: the Library is at `/admin/media`), `f:xjdhau` (scoped: a Library
upload is stored and committed in one step), `f:ex4hss`, `f:s1n77t`, `f:fjnszk`, `f:db0cx6` (scoped:
the stored content type is the one the route serves). Cited again: `f:kp50li` (the `srcset` with
transformations on).

A numbered list, one check to a step, the location first, lead-in "To verify media, follow these
steps:" (no-claim):

1. In the deployed admin, at `/admin/media`, upload a JPEG to the Library (`f:joo5f2`, `f:xjdhau`).
2. In an entry, add the image. No editor walkthrough: name the editor documentation in words, as
   the introduction does.
3. In the same entry, publish it.
4. After the deploy, open the published page and inspect the `<img>`: its `src` starts with your
   `publicBase` and has the `urlForm` shape (`f:ex4hss`, `f:s1n77t`). With `transformations` on, the
   image also carries a `srcset` (`f:kp50li`).
5. In a terminal, request that URL with `curl -s -D - -o /dev/null https://<your-site><src>` and check
   the four headers from "Mount the media route" and a `Content-Type` of `image/jpeg`, the type stored
   at upload (`f:fjnszk`, `f:db0cx6`).

**Hand-off (no-claim):** "When a check fails, work through the following causes in order:"

### Diagnose a failed check

**First sentence:** Each failed check points at one piece: the upload's limits, the public resolver,
the asset's manifest row, the route's location, or the bucket binding.

**Facts:** `f:twqb0s`, `f:ex4hss`, `f:9hchnv`, `f:6e22v1`, `f:ett331`, `f:enuyhg`. Cited again:
`f:frgg7d` (the broken-image marker).

A numbered list of ordered checks (anatomy item 5) in the order of the "Verify media" steps that
reach them, so the reader whose first check fails reads their cause first: item 1 is Verify step 1,
items 2 and 3 are step 4, items 4 and 5 are step 5. Each item names what the reader sees, then the
cause, then the fix or the link:

1. The upload fails and the Worker logs `media.upload_failed`: its `reason` names the refusal.
   `too_large` points at `maxUploadBytes` in "Set the options" and the plan's request-body limit;
   `length_required` points at "Upload from your own screen", the required `Content-Length` header;
   `unsupported_type` points at `allowedTypes` in "Set the options" (`f:ett331`, `f:enuyhg`). Link
   `docs/reference/log-events.md` for the other reasons (opened and confirmed: the
   `media.upload_failed` row lists all nine).
2. The page shows a literal `media:` token: the entry route has no resolver. Link
   `docs/extend/debug-your-site.md#mediaresolver_absent` and do not restate its fix (`f:twqb0s`).
3. The image renders broken, with the class `cairn-broken-media`: the asset has no manifest row. Name
   "Fail the build on a missing asset" by heading (`f:frgg7d`).
4. The `<img>` URL answers 404: the route is not at `<publicBase>/[...path]`, or its param is not
   named `path` (`f:ex4hss`).
5. The URL answers 503 and the Worker logs `media.delivery_failed` with `reason: 'binding_missing'`:
   the Worker has no binding under the block's `bucketBinding` name. `cairn doctor` reports the
   mismatch before a deploy as `config.media-bucket-missing` (`f:9hchnv`, `f:6e22v1`).

**Hand-off:** none; "See also" follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery link (`docs/extend/debug-your-site.md`) not repeated. One introducing sentence,
"The following pages cover the pieces this page links to:" (no-claim), then a bulleted list, each
item's link text naming its destination:

- `docs/reference/core.md#media-adapter-member`, the `media` block's members.
- `docs/reference/media.md`, `normalizeAssets` and `createMediaResolver`.
- `docs/reference/sveltekit.md#createmediaroute`, the delivery route's full behavior.
- `docs/reference/log-events.md`, the `media.*` rows.
- `docs/extend/restrict-admin-access.md`, restricting the Library, which also restricts the image
  picker in every image-bearing editor (`f:iewhzh`, scoped; the outline's stated reason for the
  link).
- `docs/extend/theme-your-public-site.md#iterate-locally`, seeding local media while theming.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. The 25 fact ids this plan was
handed are all carried, eight of them scoped; the plan adds nine container facts, each scoped and
named where it lands. `f:fxit31` is cut, as the page inputs disposed it.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:enuyhg | carried | Set the options (`allowedTypes` narrows; SVG, HTML, XML, `<`, HEIC refused); cited again in Diagnose a failed check and Upload from your own screen |
| f:ett331 | carried | Upload from your own screen (`length_required`, `too_large`); scoped in Set the options (the lower of the two ceilings); cited again in Diagnose a failed check |
| f:ex4hss | carried | Mount the media route (route at `<publicBase>/[...path]`, param `path`, else 404); scoped in Set the options; cited again in Verify media and Diagnose a failed check |
| f:f4ulxz | carried | Mount the media route (last segment only); scoped in Set the options (`urlForm` both served) |
| f:fjnszk | carried | Mount the media route (the four headers, `application/octet-stream`); cited again in Verify media |
| f:frgg7d | carried | Fail the build on a missing asset (marker, log, build succeeds, wrapper); scoped in Introduction (the missing-asset boundary the page covers); cited again in Asset references the Library counts and Diagnose a failed check |
| f:g4cwcw | carried | Upload from your own screen (body, required and optional headers, alt cap, envelope) |
| f:69rw88 | carried | Declare the bucket on the adapter (the resolved config the route and upload read); cited again in Mount the media route |
| f:2hnxsr | carried (scoped) | Declare the bucket on the adapter (binding resolved at request time by name); scoped in Set the options and Resolve media on public pages |
| f:db0cx6 | carried (scoped) | Verify media (the stored content type the route serves); the row's field list is not used |
| f:6kdagb | carried | Set the options (25 MB default, with `f:fnat1w`) |
| f:ckuow3 | carried | Set the options (four presets, none added, `/cdn-cgi/image/` for another size); its `variantUrl`/`presetUrl` clause is not used |
| f:wdmlys | carried (scoped) | Set the options (intrinsic size and `srcset` with transformations on and width known); the ladder and `sizes` detail is linked to `docs/reference/media.md#createmediaresolver`, which states it |
| f:r8vksa | carried | Declare the bucket on the adapter (absent block is off; a declared block's throws); cited again in Introduction |
| f:9awije | carried | Set the options (plan body cap, Cloudflare's 413, link); cited again in Upload from your own screen |
| f:9hchnv | carried | Declare the bucket on the adapter (required member, the throw, 503); scoped in Before you begin and Introduction; cited again in Diagnose a failed check |
| f:s1n77t | carried | Set the options (the two URL shapes, the throw); cited again in Verify media |
| f:fnat1w | carried | Set the options (the three defaults); cited again in Mount the media route |
| f:kp50li | carried | Set the options (`transformations`, the zone setting, `srcset`); cited again in Verify media |
| f:fn4zb7 | carried | Asset references the Library counts (in place of `f:fxit31`) |
| f:nlkgag | carried | Fail the build on a missing asset (the `imageDetail` caveat and its copy) |
| f:q07rd5 | carried (scoped) | Before you begin (the two adapter paths); cited again in Introduction. Its tutorial-hooks clause is not used |
| f:qtvesq | carried (scoped) | Mount the media route (the scaffold's `GET`, hash and extension validation, own headers); scoped in Before you begin and Introduction. Its R2 key clause is not used |
| f:6e22v1 | carried (scoped) | Declare the bucket on the adapter (`config.media-bucket-missing`, the matching name); cited again in Diagnose a failed check. Its UNCHECKED and skip clauses are not used |
| f:2zytgf | carried (scoped) | Declare the bucket on the adapter (`media` is an optional `defineAdapter` member); cited again in Introduction |
| f:fxit31 | cut | Under-states the code: `extractMediaRefs` walks nested image fields (`src/lib/content/media-refs.ts#addFieldImages`). `f:fn4zb7` is cited instead; friction filed by the page inputs |
| f:lu67dk | carried (added, scoped) | Introduction (bytes in R2, records in `src/content/.cairn/`); cited again in Resolve media on public pages (the `media.json` path). Its rationale clause is not used |
| f:xjdhau | carried (added, scoped) | Verify media (a Library upload is stored and committed in one step); scoped in Introduction (`media:` resolves through the hash) |
| f:joo5f2 | carried (added, scoped) | Verify media (`/admin/media`); cited again in Upload from your own screen. Its access-refusal clause is not used |
| f:1mgfhj | carried (added, scoped) | Upload from your own screen (`mediaUpload` on the typed contract, same upload action, media view) |
| f:twqb0s | carried (added) | Resolve media on public pages (literal tokens without a resolver); scoped in Introduction (the hand-built site's resolver wiring); cited again in Diagnose a failed check |
| f:bnt2wh | carried (added) | Resolve media on public pages (`assetsEnabled` only diagnoses) |
| f:fhnvn8 | carried (added) | Resolve media on public pages (the glob form, the static-import failure) |
| f:c8c9ji | carried (added) | Resolve media on public pages (URL from the row, `undefined` on a miss); cited again in Fail the build on a missing asset |
| f:iewhzh | carried (added, scoped) | See also (restricting the Library also restricts the image picker, the gloss on the `restrict-admin-access` link); the access-map mechanics stay on that page |

The page-inputs claim inventory carried ten rows, disposed as it recorded them: the absent prior page
(no claims), `f:fxit31` (cut, above), and the "filed" rows for `f:fn4zb7`, `f:nlkgag`, `f:9hchnv`,
`f:s1n77t`, `f:fnat1w` (three option rows), and `f:kp50li`, each carried in the section the table
names.

## Friction filed

The page-inputs step filed four entries on 2026-10-12 (`publicBase` moves URLs but not the route;
the missing-asset wrapper drops `imageDetail`; the upload action's statuses ride the envelope;
`f:fxit31` under-states the code), and this plan does not refile them. This plan filed five entries
in `docs/internal/docs-friction-log.md` on 2026-10-12, none blocking the page:

1. Engine: `allowedTypes` takes any string at startup, and an entry outside the five sniffable types
   does nothing.
2. Engine: the four built-in presets have no caller; the `srcset` comes from a separate width ladder.
3. Engine: `uploadAction` commits no manifest row, and the one action that does,
   `mediaLibraryUpload`, is off the typed contract, so a site's own upload screen has no typed way to
   land its asset in `media.json`.
4. Docs content: `docs/extend/debug-your-site.md` has no `media.delivery_failed`,
   `media.upload_failed`, or `media.resolve_missing` row.
5. Docs content: `docs/reference/log-events.md:46` misstates `media.uploaded`; the `createMediaRoute`
   entry omits the `publicBase` and `path` rule; no fact states that `uploadAction` commits nothing or
   where a custom screen reads the CSRF token.

## Drafting constraints

- **Which site.** Every code block names its file in a first-line comment, and every adapter
  reference says which site it means: `src/lib/cairn.config.ts` for the tutorial's site,
  `src/theme/cairn.config.ts` for a scaffolded one (`f:q07rd5`). The step code is the tutorial
  site's, since a scaffolded site already has every piece but the options.
- **The brief's `local` array** takes the names the page has the reader create or supply: the
  `media` constant, the wrapper's own function and variable names, `#lib/cairn.server.js` and
  `src/lib/cairn.server.ts` (the tutorial's module, not a fact; see the facts hole the
  arrange-the-admin-sidebar plan filed), and the placeholders `<bucket>`, `<your-site>`, `<src>`,
  `<publicBase>`, `<slug>`, `<hash>`, and `<ext>`.
- Never say `allowedTypes` can add a type, accepts HEIC or SVG, or throws on an unknown entry
  (friction 1).
- Never say the four presets build the `srcset` or that a site can call them; the `srcset` is the
  resolver's width ladder (friction 2).
- Never say `uploadAction` or `mediaUpload` commits the asset or adds it to the Library; link the
  `createContentRoutes` entry (friction 3).
- Never give the upload's refusals as HTTP response statuses: a refusal is a `fail()` in a 200
  envelope, and only Cloudflare's plan-limit 413 is a real response status.
- Never give a Cloudflare plan's body-size figure; link the limits page.
- Never claim the route logs anything on a 404, or that a `publicBase` mismatch is caught at startup.
- Never say "unused" for an asset with no counted references; the Library's words are "no references
  found".
- Never describe the Library's upload or entry editing from the editor's seat beyond Verify steps 1 to
  3; that is the editors arm.
- Restricting the Library through the access map is out of scope: name `restrict-admin-access` in the
  introduction and See also only, even where `access_denied` appears among the linked reasons.
- The header check uses `curl -s -D - -o /dev/null`, a GET, never `curl -I`.
- `createMediaRoute`, `createMediaResolver`, `normalizeAssets`, `readCommittedManifest`,
  `createPublicRoutes`, `resolveMedia`, `assetsEnabled`, `imageDetail`, `MediaResolve`, every option,
  header, log event, and reason name in code spans; "Library" capitalized as the sidebar names it.
- Vendor specifics get a link, never a copy: R2 bucket creation and bindings, Image Transformations
  and its zone setting, the transform-URL options, and the Workers request limits.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of one
  step is a single bulleted item. A reference names its target by heading, never by position.
