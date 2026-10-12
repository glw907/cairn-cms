# Framing record: Configure media

Agent-facing; drives the introduction of `docs/extend/configure-media.md` only; the body follows the page plan (`docs/internal/briefs/extend/configure-media.plan.md`).

Written 2026-10-12 by the intro framing step of the docs page chain (stage 2b part 1, hand-run seat).
Inputs: the outline `docs/internal/outlines/extend.json` whole, the arm index `docs/extend/README.md`,
the page plan, "The introduction" and "The page anatomies" in `docs/internal/docs-register.md`, every
fact named below, the inbound link sites on disk, the tutorial's adapter and entry route
(`docs/extend/add-cairn-to-a-sveltekit-app.md:293-337,728-750`), and the scaffold's media wiring
(`templates/waymark/src/theme/cairn.config.ts`, `templates/waymark/src/chassis/public-routes.ts`).

## Who arrives, from where, and why

| Reader | Arrives from | Came for | Knows | Lacks |
| --- | --- | --- | --- | --- |
| 1. The tutorial finisher, on a hand-built site | `docs/extend/add-cairn-to-a-sveltekit-app.md` "Next steps" ("turns on uploads"); the same tutorial's "Theme a hand-built site" list in `docs/extend/theme-your-public-site.md` | Turning media on, every step | SvelteKit routes, `wrangler.jsonc` from milestone 1, the adapter at `src/lib/cairn.config.ts` (`f:q07rd5`), the runtime module, the entry route at `src/routes/[...path]/+page.server.ts` and its `createPublicRoutes` call | An R2 bucket and its binding (the tutorial creates none; its dev backend faked the bucket), the media model, the `media` block, the route, and a resolver handed to the entry route |
| 2. The scaffolded-site owner | `docs/extend/scaffolded-site-files.md` (the `MEDIA_BUCKET` binding bullet, the `media/[...path]/` route paragraph, its out-of-scope list); `docs/extend/architecture.md` (the seams table's `media` row, the data-tiers paragraph); a search on an option name | Changing an option (upload types and size, URL base and form, responsive images), or learning a boundary: what an upload is refused for, what the route serves, what a missing asset does, what the Library counts | The scaffold's files, the adapter at `src/theme/cairn.config.ts` (`f:q07rd5`); the binding, block, route, and resolver wiring are already in place (`f:9hchnv`, `f:qtvesq`, `f:qifl9g`) | What each option does and what it is coupled to: `publicBase` against the route's directory, `maxUploadBytes` against the plan's body cap, `transformations` against a zone setting |
| 3. The custom upload screen builder | `docs/extend/add-a-custom-admin-screen.md` See also ("the media upload protocol"); that page's outline out-of-scope list sends the protocol here | The upload action's request and its refusals | The admin shell, section actions, the admin toolkit including `MediaPicker` | The address, the raw-body protocol, the headers, the CSRF value's source, and the `fail()` envelope (`f:g4cwcw`) |
| 4. The render builder | `docs/extend/configure-rendering.md` (pending, run 3): its outline cross-link sends "the media resolver render forwards, and what a missing asset renders" here, and its out-of-scope list names both | Where the `resolveMedia` their render forwards comes from, and what a miss renders | `render`, `createRenderer`, the resolvers `render` forwards | `createMediaResolver` over the committed manifest with `normalizeAssets`, the broken-image marker, and the fail-the-build wrapper with its caveat (`f:c8c9ji`, `f:frgg7d`, `f:nlkgag`) |
| 5. The theme developer who wants seeded media | `docs/extend/theme-your-public-site.md` "Before you begin" ("a deployed site with a media library, which Configure media sets up") and its intro list | A deployed media library, so `cairn-media-seed` has something to seed from | Theming, local iteration | The setup itself, which is reader 1's or reader 2's path; the seeding steps are not here |
| 6. The symptom searcher | A search on a broken image, a 404 or 503 on an image URL, a refused upload, or a literal `media:` token | The cause and the fix | Their own site | Which piece failed; "Diagnose a failed check" serves them, and the literal-token fix stays on `docs/extend/debug-your-site.md#mediaresolver_absent` |

Readers likely to arrive in the wrong place, and the page each belongs on:

- An editor who wants to upload or place an image belongs in the editor documentation, which has no
  page yet: the intro names it in words, with no link.
- A developer restricting who reaches the Library belongs on `docs/extend/restrict-admin-access.md`.
- An evaluator asking why media bytes sit in R2 rather than git or D1 belongs on
  `docs/extend/architecture.md#data-tiers`, which already says it (`architecture.md:152`).
- A theme developer after the seeding steps (reader 5) belongs on
  `docs/extend/theme-your-public-site.md#iterate-locally`.
- A developer moving an existing site's images in belongs on
  `docs/extend/migrate-existing-content.md` (pending), whose outline owns old image URLs and the
  absence of a bulk import.

## Background the page rests on

- **The model.** An image's bytes sit in an R2 bucket, and its record sits in the media manifest,
  `src/content/.cairn/media.json`, committed JSON beside the content manifest (`f:lu67dk`). The
  bucket is bound by name and resolved at request time, never hard-coded (`f:2hnxsr`). Content
  names an image by a `media:` reference resolved through its content hash (`f:xjdhau`), and the
  resolver writes the URL from the manifest's row rather than the reference, so a rename never
  breaks a reference (`f:c8c9ji`). The outline defines its term "media token" on this page; keep
  the plan's name, `media:` reference, and reserve "token" for the literal-token failure, as
  `debug-your-site.md` words it.
- **Who supplies what.** The engine supplies the upload action (`f:g4cwcw`), the delivery handler
  `createMediaRoute` (`f:qtvesq`), and the resolver `createMediaResolver` (`f:c8c9ji`). The site
  supplies the `r2_buckets` binding and the adapter's `media` block that names it (`f:9hchnv`,
  `f:2zytgf`), the route file at `<publicBase>/[...path]` (`f:ex4hss`), and the resolver handed to
  its public entry route, without which a `media:` reference renders as a literal token
  (`f:twqb0s`). The block is resolved once into one config that the route and the upload both read
  (`f:69rw88`).
- **Off by default.** `media` is an optional adapter member (`f:2zytgf`), and an absent block
  resolves to media off (`f:r8vksa`). No fact gives a reason for the opt-in, so the intro states it
  and gives no why.
- **Two sites, two adapter paths.** The adapter module is `src/lib/cairn.config.ts` on the add-cairn
  tutorial's site and `src/theme/cairn.config.ts` on a scaffolded site (`f:q07rd5`); a sentence
  naming it says which site. A scaffolded site already has the binding (`f:9hchnv`), the block
  (`f:9hchnv`'s source, `cairn.config.ts:50`), the route (`f:qtvesq`), and the resolver wired into
  its public routes (`f:qifl9g`, filed by this step). Nothing in the intro claims the tutorial
  site's state: its reader knows their own adapter (see couldNotDo).
- **Where Cloudflare fits.** R2 is the storage, reached through the Worker's binding (`f:2hnxsr`,
  `f:9hchnv`). Cloudflare also bounds two options, the account plan's request-body cap on uploads
  (`f:9awije`) and Image Transformations as a zone setting a Worker can't flip (`f:kp50li`); both
  stay in "Set the options", linked and never copied. The intro names Cloudflare only through R2
  and the binding.
- **Where SvelteKit fits.** The delivery handler runs in a catch-all `+server.ts` in the site's own
  route tree, and `publicBase` moves every URL the engine writes but not that route (`f:ex4hss`).
  The resolver reaches public pages through the entry route's `createPublicRoutes` (`f:twqb0s`).
  The upload's `fail()` envelope is SvelteKit's, a body-only point (`f:g4cwcw`).
- **GitHub, left unnamed on purpose.** The page asks nothing of GitHub: the media manifest is
  committed JSON in the repository (`f:lu67dk`), committed through the backend the adapter already
  declares (`f:2zytgf`). The intro says "committed" and adds no GitHub step or name.
- **Why R2, left to architecture.** The reason the bytes sit in R2 (`f:lu67dk`'s rationale clause)
  is the outline's out-of-scope item for `architecture`, and `architecture.md:152` states it. The
  intro routes there and does not restate it.

## Place in the doc set

- **Group.** "Model content", after `configure-rendering`, `link-content-with-references`, and
  `reuse-content-across-entries`, and before `migrate-existing-content`. On disk the group lists
  only `content-model`; the drafter's index-link step adds this page.
- **What links in, and why.** `add-cairn-to-a-sveltekit-app.md:1223` ("turns on uploads");
  `scaffolded-site-files.md:66,257,362` (the media configuration behind `MEDIA_BUCKET`, "the R2
  bucket that Configure media sets up", the route paragraph); `architecture.md:75,152` (the `media`
  member as an `AssetConfig`, "the media store's settings"); `theme-your-public-site.md:40,53,508`
  (media storage and the route, the seeding precondition); `add-a-custom-admin-screen.md:570`
  ("media storage and the media upload protocol"); and, once drafted, `configure-rendering.md` (the
  resolver and missing assets).
- **What siblings own, so the intro words a shared idea fresh.** `architecture.md`'s data tiers say
  why R2 holds the bytes and that the delivery route streams them, so the intro neither argues for
  R2 nor describes streaming. `scaffolded-site-files.md` describes the route's content-addressed
  keys and its own security headers, so the intro leaves headers to the body. `content-model.md`
  opens on an entry as a markdown file and owns the content manifest, so the intro opens on an
  image and names the media manifest as the second, separate record. `debug-your-site.md` owns the
  `media.resolver_absent` row. `theme-your-public-site.md` owns seeding.
- **Outbound, from the intro.** `docs/extend/theme-your-public-site.md#iterate-locally`,
  `docs/extend/restrict-admin-access.md`, `docs/extend/architecture.md#data-tiers`,
  `docs/extend/migrate-existing-content.md`, and the editor documentation in words.

## Intro plan

Three paragraphs, then the plan's bounds, kept. The intro opens on a statement about an image in
a cairn site, never an imperative and never a sentence about the page.

1. **The model, from above.** An image in a cairn site lives in two places: its bytes in an R2
   bucket bound to the site's Worker, and its record in the media manifest,
   `src/content/.cairn/media.json`, committed beside the content. Content names the image by a
   `media:` reference through its content hash, and the image's URL comes from the manifest's row,
   so renaming an asset never breaks a reference. The engine supplies the upload, the handler that
   serves the files, and the resolver that turns a reference into a URL; the site supplies the
   bucket's binding in `wrangler.jsonc`, the adapter's `media` block that names it, the SvelteKit
   route file the handler runs in, and the resolver handed to its public entry route. Media stays
   off until the adapter declares that block. Facts: `f:lu67dk`, `f:2hnxsr`, `f:xjdhau`,
   `f:c8c9ji`, `f:9hchnv`, `f:2zytgf`, `f:qtvesq`, `f:ex4hss`, `f:twqb0s`, `f:r8vksa`.
2. **The two main readers, and the contract.** What the work involves depends on the site. On the
   site the add-cairn tutorial builds, whose adapter is `src/lib/cairn.config.ts`, a developer comes
   to turn media on. On a scaffolded site, whose adapter is `src/theme/cairn.config.ts`, the
   binding, the block, the route, and the resolver are already in place, so its developer comes to
   change an option or to learn where the engine draws its lines: what an upload is refused for,
   what the route serves, what a missing asset does (it renders as a broken image while the build
   succeeds), and what the Library counts as a use. The contract sentence sits here: you declare
   the bucket on the adapter, set its options, mount the media route, hand the resolver to a
   hand-built site's public pages, and confirm that an image uploaded through the Library renders
   from your site with the route's headers. Facts: `f:q07rd5`, `f:9hchnv`, `f:qtvesq`,
   `f:qifl9g`, `f:frgg7d`. The four boundaries are named as topics; only the missing-asset clause
   makes a claim.
3. **The single-section readers.** Two readers need one part of the page. A developer building an
   admin screen that uploads finds the raw-body request the upload action takes, and its refusals,
   under "Upload from your own screen". A developer building the site's render finds where the
   resolver it forwards comes from under "Resolve media on public pages", and what a miss renders
   under "Fail the build on a missing asset". Name each section by its heading. Facts: `f:g4cwcw`,
   `f:c8c9ji`, `f:frgg7d`.

The bounds, after the paragraphs, as the plan sets them:

- **Prior knowledge** (the plan's item 3, unchanged): SvelteKit catch-all routes and `+server.ts`
  request handlers, bindings in `wrangler.jsonc`, and creating an R2 bucket; no cairn knowledge
  beyond the adapter file and the site's public entry route.
- **Out of scope, with the page that covers each** (the plan's item 4, plus one): seeding local
  media while theming, `docs/extend/theme-your-public-site.md#iterate-locally`; restricting who
  reaches the Library, `docs/extend/restrict-admin-access.md`; where R2 sits among the site's data
  stores and why, `docs/extend/architecture.md#data-tiers`; moving an existing site's images in,
  `docs/extend/migrate-existing-content.md`; using the Library as an editor, the editor
  documentation, named in words with no link. This sentence may name the page.

After the draft, reread the intro against the page with Google's check: does it give an accurate
overview of what the page covers?

## Departures from the plan's introduction

- **The missing-asset clause moves.** The plan's item 1 closes the model on the missing-asset
  boundary. Here it moves into paragraph 2, inside the scaffolded reader's reason, because it is a
  boundary a reader comes to learn, not part of the model. Paragraph 1 stays the model alone.
- **The scaffold's resolver wiring is stated.** The plan claims nothing about it, since no fact
  stated it. This step traced it to the scaffold and filed `f:qifl9g`, so paragraph 2 says a
  scaffolded site already has the resolver in place, and paragraph 1 drops the plan's "on a
  hand-built site" qualifier from the division of labor. The body stays as the plan fixes it: "Before
  you begin" still routes the scaffolded reader past "Resolve media on public pages", which the
  new fact now backs.
- **A render-builder reader joins paragraph 3.** The plan names only the custom upload screen
  builder as a third reader. The outline's `configure-rendering` cross-link and out-of-scope list
  send a reader here for the resolver and missing assets, so paragraph 3 names that reader's two
  sections by heading.
- **One out-of-scope route is added.** A developer bringing an existing site's images belongs on
  `migrate-existing-content`, which the outline gives old image URLs and the absence of a bulk
  import. The plan's four routes stand.
