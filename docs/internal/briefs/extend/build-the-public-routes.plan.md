# Page plan: Build the public routes

Page: `docs/extend/build-the-public-routes.md`. Page type: task guide. Status: new page, no prior
version on disk. Written 2026-10-12 by the plan step of the docs page chain (stage 2b part 1). The
drafter drafts from this plan: it is the source of the page's order, each section's claim, and
each fact's placement. The structural edit seat reads it before any prose exists. The plan is
Google's outline written down (Google Technical Writing Two, "Organizing large documents",
https://developers.google.com/tech-writing/two/large-docs): the outline is the document's
narrative, and information arrives where it is most relevant to the reader.

Inputs read: the outline entry in `docs/internal/outlines/extend.json` (slug
`build-the-public-routes`: job, covers, out-of-scope list, exemplars); "The page anatomies" and "The
introduction" in `docs/internal/docs-register.md`; every fact bullet named below in
`docs/internal/facts/extend.md` and `docs/internal/facts/reference.md`; the two exemplars
(`extenders/directus-create-extension`, `extenders/django-custom-management-commands`); the
reference entries each link names (`docs/reference/delivery.md`: the ordering contract,
`createPublicRoutes`, `PublicRoutesConfig`, `EntryData`, `CairnHead`;
`docs/reference/delivery-data.md`: `createSiteIndexes`, the feed, sitemap, and robots builders and
responders, `buildSeoMeta`, `createLinkResolver`, `buildExcerpt`, `readSeoFields`,
`renderJsonLdScript`, `buildSiteDescriptors`, the Types table; `docs/reference/core.md`: `nav`
and `siteConfigPath` (adapter `editor` members), `parseSiteConfig`, `readMenu`); the sibling pages
`docs/extend/add-cairn-to-a-sveltekit-app.md` ("Index the content and commit its manifest", "Render
the entry", "Resolve a content build failure"), `docs/extend/scaffolded-site-files.md` ("Routes and
the server hook", "Settings outside the admin", "Crawl rules"), `docs/extend/configure-media.md`
("Resolve media on public pages"), `docs/extend/define-an-adapter-and-schema.md` ("Mark the tag
field"), `docs/extend/choose-an-ai-posture.md` ("Pass the posture to the robots route"),
`docs/extend/link-content-with-references.md` ("Resolve the targets on the entry route"),
`docs/extend/arrange-the-admin-sidebar.md`, and `docs/extend/debug-your-site.md`; and the scaffold
code the facts cite (`templates/waymark/src/chassis/content.ts`, `public-routes.ts`, `feed.ts`,
`feed-items.ts`, `archive.ts`; `templates/waymark/src/routes/` and `src/params.ts`;
`templates/waymark/src/theme/site-config.ts` and `site.config.yaml`;
`templates/waymark/vite.config.ts`, `wrangler.jsonc`, and `package.json`;
`src/lib/delivery/content-index.ts` for the tag methods).

Headings in this plan's section list are the page's headings, verbatim. A claim inventory `section`
names one of them. The introduction is the untitled text under the H1 and is named `Introduction`.
No page links an anchor on this page today (a search of `docs/` for `build-the-public-routes.md#`
returns nothing; eleven links name the page itself), so every heading is free.

## What the page argues

A cairn site's public side is a set of prerendered SvelteKit routes the site owns, each a few lines
that call an engine builder. Every route reads the same two inputs: one typed index of the
committed content and one origin literal. The page's spine is that dependency chain: build the
index, name the origin, compose the one shared `PublicRoutesConfig`, and then add each route that
reads them, so a reader never writes a route before the thing it reads exists. The page's one
running site is the scaffold: its file tree comes first (the Django exemplar's take), and every
route section shows the scaffold's file, so a scaffolded reader recognizes what is already there
and a reader who finished the add-cairn tutorial sees the shape to add.

### The order, argued

Each section holds what the next one depends on.

1. **The introduction carries the model** (the index and the origin as the two shared inputs,
   prerendering as the delivery mode) and names the page's two readers: a scaffolded site's
   developer, whose routes exist and who comes to understand or change one, and a reader of the
   add-cairn tutorial, whose site has the index and the entry catch-all and nothing else.
2. **Before you begin** names what the routes read: an adapter, a parsed site config, and a
   SvelteKit site on the Cloudflare adapter. The tag page's taxonomy field is a precondition of that
   section only and is named there, not here, so a reader who never adds a tag page is not asked
   for it.
3. **Lay out the route files** is the Django exemplar's file tree, before any code (cover 1's
   setting, `f:qtm9y2`). It gives the reader the map every later section points into, and it is
   where the two sites' different paths are reconciled once instead of in every section.
4. **Build one typed index** (cover 1, cover 7's glob form, and cover 7's drafts clause) comes first
   among the steps, because every route, the entry config included, reads the index. The draft
   rules sit here, beside the `all()` clause, because this is where the reader first meets the
   index methods that leave drafts out.
5. **Name the origin once** (cover 2, cover 12's trailing-slash clause) precedes the entry pages,
   because the shared config takes the origin and the canonical URL is built from it.
6. **Wire the entry pages** (cover 3, cover 6's `CairnHead` half) composes the shared
   `PublicRoutesConfig` from the index and the origin, then the catch-all and its page. Every
   later route that takes the config (the twin, the feeds' head links) depends on it.
7. **Declare the fields the head reads** (cover 8) follows the catch-all directly. The reader has
   just rendered `CairnHead`; this section makes its output complete, and every item in it is an
   action on the adapter or on `static/`, so it is a task section, not an explanation.
8. **Serve the markdown twin** (cover 4) reuses the same config and pairs with the entry page's
   `markdownUrl`, so it closes the entry-page group.
9. **Serve the feeds** (cover 5's feed half, cover 6's `createLinkResolver` half) comes next. Its
   last step sets `PublicRoutesConfig.feeds`, which only makes sense once the feed routes exist.
10. **Serve the sitemap** (cover 12, cover 13's two sitemap builders) precedes robots.txt, whose
    file points at the sitemap's URL.
11. **Serve robots.txt** (cover 5's robots half) closes the machine-readable files.
12. **Keep noindex entries out of the sitemap and feeds** (cover 12's noindex clause) follows the
    three files it filters. A reader can decide only after seeing which routes read the `robots`
    field and which do not, and the step edits the routes just written. Its first sentence
    contrasts noindex with drafts and refers back, by heading, to the draft rules in "Build one
    typed index".
13. **Build the archive** opens the group of pages the site owns. It reads the index's ordering
    (cover 1's `all()` clause, placed where the reader relies on it).
14. **Give other pages a head** (cover 9) follows the archive, the first page the reader builds
    that `createPublicRoutes` gives no head.
15. **Add a tag page** (cover 10) is the worked case of the previous section: it uses the head
    step and adds the two tag queries.
16. **Add an editable menu** (cover 11) is last among the steps: it is independent of the index
    and the origin and touches the adapter and the root layout, so it sits after the route chain
    instead of interrupting it.
17. **Verify the built routes** is the Directus exemplar's "Using Your Extension" close, the
    anatomy's item 4: build, serve, and read `/sitemap.xml`, `/feed.xml`, `/feed.json`,
    `/robots.txt`, a twin, and an entry's head.
18. **Diagnose a failed build** (cover 7's failure half) is the anatomy's item 5.
19. **See also** closes the page, per the anatomy.

### Departures from the outline's covers order, with the reason for each

- Cover 1's `all()` ordering moves from the index section to "Build the archive", where the reader
  first relies on it; the index section names it in one clause.
- Cover 5 splits into "Serve the feeds" and "Serve robots.txt", with "Serve the sitemap" between
  them, since robots.txt names the sitemap's URL.
- Cover 6 splits: `CairnHead` and `titleTemplate` join the entry pages (where the head is first
  rendered), and `createLinkResolver` joins the feeds (the one route whose bodies leave the site).
- Cover 7 splits two ways: the glob form and the draft rules join "Build one typed index" (the
  drafts beside the `all()` clause, where the index methods first appear, with a one-clause
  back-reference in "Keep noindex entries out of the sitemap and feeds"); the validation,
  collision, and dangling-link throws become "Diagnose a failed build".
- Cover 8 moves ahead of the twin, feeds, and sitemap, directly after the entry pages, as item 7
  argues.
- Cover 12's sitemap content stays in "Serve the sitemap"; its noindex clause moves to item 12 and
  its trailing-slash clause to "Name the origin once".
- Cover 13 (the `/delivery/data` builders) is not a section: each builder lands where the reader
  calls it (`buildSitemapView` and `buildSiteDescriptors` in the sitemap, `renderJsonLdScript` and
  `buildExcerpt` in "Give other pages a head", `buildExcerpt` again in the head fields).

### Exemplar takes, and where each lands

- **Django, custom management commands.** The file tree before code lands as "Lay out the route
  files": one `text` tree of the scaffold's route and chassis files, then one sentence per file.
  "One running site through every route" lands as the scaffold's files shown in every route
  section. Left behind: the class reference.
- **Directus, create an extension.** The verb-per-heading steps land as the task headings ("Build",
  "Name", "Wire", "Declare", "Serve", "Keep", "Give", "Add"). The "Using Your Extension" close lands
  as "Verify the built routes", where the reader reads the prerendered `/sitemap.xml`, `/feed.xml`,
  `/feed.json`, and `/robots.txt`. Left behind: the Docker volume steps.

### Heading policy

Task headings start with a bare infinitive; "Before you begin" and "See also" are the anatomy's
fixed headings. No section on this page is pure explanation: each explanation the job needs (the
load data, the SEO fallbacks, draft and noindex handling) sits inside the task section where the
reader acts on it, after a lead-in that ties it to the task.

## The introduction, in Google's three parts

No heading. It opens on a statement, never an imperative, and frames the page from above before the
contract (register, "The introduction"). Two or three paragraphs. The intro-framing step reasons
the final wording. Content items, in order:

1. **The model (what the document covers, framed from above).** A cairn site's public pages and
   machine-readable files are SvelteKit routes the site owns, each prerendered at build time from
   the committed content. The engine supplies the builders, and every route reads two shared
   inputs: one typed index from `createSiteIndexes` and one origin literal (`f:yef4lo`,
   `f:niuzzg`, each scoped to that clause). Because the routes prerender, what a build writes is
   what the site serves, and the origin is written into every file (`f:k16chc`, scoped).
2. **Who and why, with the contract.** The reader is a Svelte-fluent developer building an
   organization's site on cairn's seams. The contract sentence, inside the framing: build the
   index and the origin, compose one `PublicRoutesConfig`, and wire the entry pages, their markdown
   twins, the feeds, the sitemap, robots.txt, the archive, a tag page, and an editable menu, then
   read the prerendered files after a build. Name both readers (register, "A page may serve several
   readers"): on a scaffolded site every route but the tag page already exists, and the page
   explains what each one does and where to change it; a site built through the add-cairn tutorial
   has the index and the entry catch-all, and the page adds the rest.
3. **Prior knowledge.** SvelteKit routing (rest parameters, param matchers, route groups, `+server.ts`
   endpoints, `+layout.server.ts` loads), its prerendering (`prerender` and `entries` exports), and
   Vite's `import.meta.glob`. No cairn knowledge beyond the adapter that declares the site's
   concepts.
4. **What the page does not cover, with the page that does (wrong-place routing).** The AI-crawler
   stance in robots.txt: `docs/extend/choose-an-ai-posture.md`. The draft preview route:
   `docs/extend/share-a-draft-preview.md`. Announcing newly published entries:
   `docs/extend/act-on-newly-published-entries.md`. Resolving `media:` images on public pages:
   `docs/extend/configure-media.md#resolve-media-on-public-pages`. Styling the pages:
   `docs/extend/theme-your-public-site.md`. This sentence may name the pages, since scope has no
   subject-first form.

## Sections, in order

Each entry carries the page heading. **First sentence** is the one sentence a reader takes from the
section and the section's first sentence on the page (its claim is fixed here, its wording may move
to the register's voice, and a task-section sentence stays under 26 words). Then come **Facts**, the
ids it draws on ("cited again" marks a fact whose primary home is another section); the content and
steps; and **Hand-off**, quoted where the plan fixes its wording (each quoted hand-off and lead-in
passed the provenance extractor with no row).

### Before you begin

**First sentence:** The public routes read your adapter and your parsed site config, and they
prerender on a SvelteKit site built with the Cloudflare adapter.

**Facts:** `f:q07rd5` (scoped: the adapter module's path on each site). Cited again: `f:yef4lo`.

A bulleted list of preconditions, each with a link to what produces it (anatomy item 2):

- An adapter that declares the site's concepts, at `src/theme/cairn.config.ts` on a scaffolded site
  and `src/lib/cairn.config.ts` on the add-cairn tutorial's site (`f:q07rd5`). Link
  `docs/extend/define-an-adapter-and-schema.md`.
- The parsed site config the adapter module exports as `siteConfig`. Link
  `docs/reference/core.md#parsesiteconfig`.
- A SvelteKit site on `@sveltejs/adapter-cloudflare`. A scaffolded site has one; otherwise link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#deploy-a-bare-sveltekit-site`.
- Optional, for hero images: a media resolver, as
  `docs/extend/configure-media.md#resolve-media-on-public-pages` sets up.

**Hand-off (no-claim):** "With those in place, start from a map of the files."

### Lay out the route files

**First sentence:** Every public route is a file under `src/routes/`, and on a scaffolded site the
modules they share sit in `src/chassis/`.

**Facts:** `f:qtm9y2`, `f:s4prb0` (added, scoped: `content.ts` indexes the content, `feed.ts` maps
posts to feed items, `public-routes.ts` holds the shared public-route config).

Content:

- One `text` tree of the scaffold's public files, trimmed to this page's routes (`f:qtm9y2`):
  `src/params.ts`; under `src/routes/`: `(site)/[...path]/`, `(site)/[...path=md]/`,
  `(site)/archive/[page]/`, `(site)/+page.svelte`, `feed.json/`, `feed.xml/`, `robots.txt/`,
  `sitemap.xml/`, and the root `+layout.server.ts`; under `src/chassis/`: `content.ts`,
  `public-routes.ts`, `feed.ts` (`f:s4prb0`). Leave out `admin/`, `healthz/`, `media/`,
  `preview/[token]/`, and `styleguide/`; one sentence after the tree names `preview/[token]/` as
  the route `docs/extend/share-a-draft-preview.md` covers.
- A short bulleted list, one item per file, naming the section that writes it (by heading).
- One sentence for the tutorial's reader: that site keeps its routes directly under `src/routes/`,
  with no `(site)` group, and its content module at `src/lib/content.ts`; link
  `docs/extend/add-cairn-to-a-sveltekit-app.md#index-the-content-and-commit-its-manifest` and
  `#render-the-entry` (opened and confirmed: the tree shows `src/lib/content.ts` and
  `src/routes/[...path]/`). Where a later section names a scaffold path, the tutorial reader uses
  the matching path in their own tree; the page says so once, here.
- One sentence: `docs/extend/scaffolded-site-files.md#routes-and-the-server-hook` lists every
  scaffold route, the admin's included.

**Hand-off (no-claim):** "Start with the content module."

### Build one typed index

**First sentence:** `createSiteIndexes` builds one typed index per concept from one literal
`import.meta.glob` per concept, and every public route reads through it.

**Facts:** `f:yef4lo`, `f:n07oiu`, `f:hv8qs9`, `f:n33lwb`, `f:m9z6sr`. Cited again: `f:upec9v`
(one clause).

Content:

- One sentence (`f:yef4lo`): Vite needs each glob pattern written literally at the call site, so the
  globs cannot be generated in a loop over the concept list.
- One step, a single bulleted item: in the content module (`src/chassis/content.ts` on a scaffolded
  site), pass `createSiteIndexes` the adapter, the site config, and one glob per concept, keyed by
  concept id, each with `query: '?raw'`, `import: 'default'`, and `eager: true` (`f:yef4lo`,
  `f:n07oiu`).
- The scaffold's indexing lines as one `ts` block (`templates/waymark/src/chassis/content.ts:5-31`,
  the imports, three globs, the call, and the two exports), marked `snippet-check-skip` because it
  imports the scaffold's `#theme` aliases.
- One sentence (`f:hv8qs9`): the result carries one index per concept plus `site`, the
  cross-concept resolver, so no concept may be named `site`.
- One sentence (`f:n07oiu`): a lazy glob, or one without `?raw` and `import: 'default'`, fails the
  build; "Diagnose a failed build" names the message (by heading).
- One sentence (`f:n33lwb`): the site-config argument does not change the indexes; pass the parsed
  config anyway. State it flatly; no rationale.
- One clause (`f:upec9v`, cited): each index's `all()` already returns entries in the engine's
  order, which "Build the archive" relies on.
- Two sentences on drafts, directly after that clause (`f:m9z6sr`): `all()` and `byTag()` leave out
  an entry marked `draft: true` unless called with `{ includeDrafts: true }`, `allTags()` and
  `adjacent()` always leave it out, and the resolver's permalink lookup is built from `all()`, so a
  draft never resolves or prerenders. `byId` still returns a draft, so a route that looks an entry
  up by id checks its `draft` field.

**Hand-off (no-claim):** "Next, name the origin every absolute URL starts from."

### Name the origin once

**First sentence:** Keep the site's origin in one string literal with no trailing slash, and set it
to the deployed origin before a production build.

**Facts:** `f:niuzzg`, `f:mtltw7`, `f:k16chc`, `f:ioh6uj`.

Content:

- One or two sentences on why a literal (`f:niuzzg`): every route reads the same constant, and a
  literal keeps the origin identical in every build, locally and in CI, where an environment
  read can differ. A site with several environments commits a config per environment rather than
  branching the literal on an environment variable. State this as the site-authoring
  recommendation the fact says it is, not an engine rule.
- One sentence (`f:mtltw7`): the engine joins the origin and a leading-slash path with no
  normalization, so a trailing slash doubles the slash in every canonical URL and sitemap `loc`.
- One sentence (`f:k16chc`): the prerendered routes run at build time, so the literal is written
  into every canonical URL, `og:url`, feed, and sitemap.
- A numbered list of two steps, the location first:
  1. In the content module, define the origin as a literal. On a scaffolded site, replace the
     placeholder `'https://showcase.test'` in `src/chassis/content.ts` (`f:ioh6uj`).
  2. In `wrangler.jsonc`, set `PUBLIC_ORIGIN` to the same host, since the Worker reads it at
     runtime (`f:ioh6uj`). The scaffold ships `http://localhost:4173` there.
- One sentence (`f:ioh6uj`): the scaffold composes `siteMeta` (`title`, `description`, `origin`)
  once from the literal, and its feeds, sitemap, and robots route read that object.
- One `ts` block of the scaffold's lines (`templates/waymark/src/chassis/content.ts:34-53`, the
  literal and `siteMeta`), marked `snippet-check-skip`.

**Hand-off (no-claim):** "With the index and the origin defined, wire the entry pages."

### Wire the entry pages

**First sentence:** `createPublicRoutes` turns the index and the origin into the entry catch-all's
`entries`, which lists every routable entry for the prerenderer, and `entryLoad`, which loads one.

**Facts:** `f:pkt8i6`, `f:fvi8rk`, `f:k16chc` (cited, the canonical clause), `f:83gbov`,
`f:bnt2wh`, `f:dvg5gn`, `f:s4prb0` (cited: `public-routes.ts`).

Content, in order:

- A numbered list of steps, one action each, the location first:
  1. In a module of its own (`src/chassis/public-routes.ts` on a scaffolded site), export one
     `PublicRoutesConfig` with `site`, `render`, `origin`, `siteName`, and `description`
     (`f:pkt8i6`, `f:s4prb0`). One clause: the twin route reads the same object, so the two
     cannot drift.
  2. In `src/routes/(site)/[...path]/+page.server.ts`, export `prerender = true`, `entries` from
     `routes.entries()`, and a `load` that returns `routes.entryLoad({ url })` (`f:pkt8i6`).
  3. In the same directory's `+page.svelte`, render `CairnHead` with `seo={data.seo}`, then the
     entry's `html` (`f:fvi8rk`).
- One `ts` block for the config module: the five required members, with `defaultImage` and `feeds`
  left out. `defaultImage` arrives in "Declare the fields the head reads" step 3, and `feeds` in
  "Serve the feeds" step 5. Marked `snippet-check-skip` (scaffold aliases).
- One `ts` block for the route module, in the minimal form the reference's `createPublicRoutes`
  example shows without `withReferences`. One sentence after it: a scaffolded site's catch-all
  also resolves reference fields, which
  `docs/extend/link-content-with-references.md#resolve-the-targets-on-the-entry-route` covers
  (named by heading; the sentence claims nothing about the scaffold's code, since `f:g030q0` is
  cut).
- One `svelte` block: `CairnHead` from `@glw907/cairn-cms/delivery/head` with `seo` and a
  `titleTemplate`, then `{@html data.html}` in an `<article>`.
- The lead-in, then the load data (explanation tied to the task: "what your page receives"):
  `entryLoad` answers 404 for a path no entry claims (`f:pkt8i6`); the data carries `entry` (its
  frontmatter, body, and title), `html` (the body already run through the site's `render`),
  `canonicalUrl`, and `seo` (`f:fvi8rk`). The canonical URL is the origin plus the permalink, and
  the origin also anchors `og:url` (`f:k16chc`). Link `docs/reference/delivery.md#entrydata` for the
  full shape.
- The hero, two or three sentences: `heroImage` is undefined when no hero is set, media is off, or
  the `media:` reference does not resolve, and `entry.frontmatter.image.src` stays the raw token
  (`f:83gbov`). `resolveMedia` alone turns hero resolution on; `assetsEnabled` only makes the
  engine log `media.resolver_absent` once if `resolveMedia` is missing (`f:bnt2wh`). Link
  `docs/extend/configure-media.md#resolve-media-on-public-pages` for the resolver.
- One sentence (`f:dvg5gn`): `titleTemplate` applies only when `title` is left undefined, so an
  explicit `title`, or `title={false}`, wins.

**Hand-off (no-claim):** "Next, make sure each entry's fields reach that head."

### Declare the fields the head reads

**First sentence:** The head reads `description`, `image`, `robots`, and `author` from an entry's
frontmatter, and it reads `image`, `robots`, and `author` only when the concept's fieldset declares
them.

**Facts:** `f:jsh6ae`, `f:k5uws5`, `f:u41mw4`, `f:nnup2g`, `f:j2rndg`, `f:nbn6j0`, `f:jguiox`,
`f:j81xye`, `f:kdo96n`. Cited again: `f:q07rd5` (the adapter's path).

Content:

- A numbered list of steps, one action each, the location first:
  1. In the adapter, declare the hero as an image field named `image` with `seo: true`, as the
     scaffold's `image: fields.image({ label: 'Hero image', seo: true })` does (`f:u41mw4`,
     `f:k5uws5`).
  2. In the same fieldset, declare `robots` and `author` as text fields if entries set them
     (`f:jsh6ae`).
  3. In the shared `PublicRoutesConfig`, set `defaultImage` to an image the site serves; a
     scaffolded site already names `/og/default.png`, so add that file under `static/og/`
     (`f:nnup2g`, `f:jguiox`). This step applies to both readers: the add-cairn tutorial's site has
     no `defaultImage` until this step sets it, and it is the social image's last fallback below.
- One sentence after step 1 (`f:k5uws5`, `f:u41mw4`): delivery reads the hero and the social image
  only from the frontmatter key `image`, so an `seo` image under another name validates and shows
  in the editor but never reaches the head. One clause: a concept may mark one top-level image
  `seo: true`, and a second or a nested one throws at `defineFieldset()` (`f:u41mw4`).
- One sentence after step 3 (`f:nnup2g`): the scaffold ships no `static/` directory, so its
  fallback `og:image` answers 404 until the file exists.
- The lead-in, quoted: "The head falls back in a fixed order when an entry leaves a field empty."
  Then a bulleted list:
  - Description: the frontmatter `description`, else the entry's excerpt, else the config's
    `description` (`f:j2rndg`). The excerpt is the body's stripped text cut near 200 characters at
    a word boundary (`f:nbn6j0`).
  - Social image: the resolved hero's absolute URL, else a string `image`, else `defaultImage`,
    each anchored to the origin; `twitter:card` is `summary_large_image` only when an image exists,
    and `twitter:image:alt` is the hero's alt when it has one (`f:jguiox`).
  - Page type: a dated entry is an `article` with `article:published_time`, `article:modified_time`
    when `updated` is set, `article:author`, and the feed alternate links; an undated entry is a
    `website` (`f:j81xye`).
  - JSON-LD: one `Article` or `WebSite` object, never carrying the author (`f:kdo96n`).
- One sentence (`f:kdo96n`): to add a richer schema.org type, replace `seo.jsonLd` before
  `CairnHead` renders it.

**Hand-off (no-claim):** "With the entry pages complete, give each one its raw-markdown twin."

### Serve the markdown twin

**First sentence:** The markdown twin serves each entry's stored markdown, unrendered, at the
entry's permalink followed by `.md`, from a prerendered route beside the catch-all.

**Facts:** `f:03lbjg`, `f:3r08v1`, `f:gwpffe`. Cited again: `f:dvg5gn` (`markdownUrl`),
`f:qtm9y2` (`src/params.ts`).

Content:

- A numbered list of steps, one action each, the location first:
  1. In `src/params.ts`, define an `md` matcher that accepts a segment ending in `.md`, through
     SvelteKit's `defineParams` (`f:03lbjg`, `f:qtm9y2`).
  2. In `src/routes/(site)/[...path=md]/+server.ts`, export `prerender = true`, `entries` from
     `routes.markdownEntries()`, and a `GET` that returns `markdownResponse({ body })` from
     `routes.markdownLoad({ url })` (`f:03lbjg`).
  3. In the entry page, pass `CairnHead` a `markdownUrl` of the canonical URL plus `.md`, for an
     entry that has a twin (`f:dvg5gn`).
- Two code blocks, `ts` (the scaffold's `params.ts` and the twin route), marked `snippet-check-skip`
  for the scaffold alias.
- One sentence (`f:03lbjg`): SvelteKit prefers the matched route, so `[...path=md]` takes the `.md`
  paths and `[...path]` keeps every other one. Attribute the precedence to SvelteKit and link its
  "Advanced routing" page (https://svelte.dev/docs/kit/advanced-routing#Sorting).
- One sentence (`f:3r08v1`, `f:dvg5gn`): an entry whose `robots` carries `noindex` has no twin:
  `markdownEntries` skips it and `markdownLoad` answers 404, so the entry page passes no
  `markdownUrl` for it.
- One Note notice (`f:gwpffe`), the Content-Type caveat, in this order: `markdownResponse` sets
  `text/markdown; charset=utf-8`; `@sveltejs/adapter-cloudflare` does not carry a prerendered
  route's response headers into the build; under `wrangler dev` the file still arrives as
  `text/markdown; charset=utf-8`, apparently from the `.md` extension; this was measured locally,
  not on a deployed zone. The notice holds no procedural step.

**Hand-off (no-claim):** "Next, publish the posts as feeds."

### Serve the feeds

**First sentence:** Each feed route maps a concept's entries to `FeedItem`s and passes them, with a
`FeedChannel`, to `rssResponse` or `jsonFeedResponse`.

**Facts:** `f:pvk6h5`, `f:70uh8b`, `f:d7v5cg`, `f:2dqwmu`, `f:9xy8j9`. Cited again: `f:8k9xwm`
(`feed.xml` prerenders), `f:k16chc` (absolute URLs from the site's origin), `f:s4prb0` (`feed.ts`).

Content:

- A numbered list of steps, one action each, the location first:
  1. In a shared module (`src/chassis/feed.ts` on a scaffolded site), map the posts index's
     `all()` to `FeedItem`s with origin-anchored URLs, the excerpt as `summary`, and the rendered
     body as `contentHtml` (`f:70uh8b`, `f:s4prb0`).
  2. In that mapping, render each body with a `resolve` built from `createLinkResolver(site)`, so a
     `cairn:` link becomes an absolute URL (`f:d7v5cg`, `f:70uh8b`).
  3. In `src/routes/feed.xml/+server.ts`, export `prerender = true` and return `rssResponse` with
     the channel and the items (`f:8k9xwm`, `f:pvk6h5`).
  4. In `src/routes/feed.json/+server.ts`, do the same with `jsonFeedResponse` (`f:70uh8b`).
  5. In the shared `PublicRoutesConfig`, set `feeds` to the two feed URLs (`f:9xy8j9`).
- One `ts` block: the scaffold's `feed.xml/+server.ts` (`templates/waymark/src/routes/feed.xml/+server.ts`),
  marked `snippet-check-skip`.
- One sentence on the shapes (`f:pvk6h5`): a `FeedChannel` is `title`, `description`, `siteUrl`,
  and `feedUrl`, with optional `language` and `author`; a `FeedItem` needs `title`, `url`, and
  `summary`, with optional `date`, `updated`, `contentHtml`, and `tags`. Link
  `docs/reference/delivery-data.md#feeds-sitemap-and-robots`.
- One sentence (`f:2dqwmu`, scoped to the scaffold): the scaffold's mapping also resolves
  `::include` fragments and makes image URLs absolute, so a feed reader sees the fragment's text and
  a working image.
- One sentence (`f:d7v5cg`): the resolver throws on a missing target or one of a non-routable
  concept, so a dangling `cairn:` link fails the build.
- One sentence after step 5 (`f:9xy8j9`): `feeds` only adds `rel="alternate"` links to a dated
  entry's head; it serves no feed, so the two routes above are what readers fetch.

**Hand-off (no-claim):** "Next, list every entry page in the sitemap."

### Serve the sitemap

**First sentence:** The sitemap route passes `sitemapResponse` one `SitemapUrl` per page, each a
`loc` built from the origin and an optional `lastmod`.

**Facts:** `f:mt7qcl`, `f:mc3n4w`, `f:nibegw`. Cited again: `f:pvk6h5` (`SitemapUrl`, the
`application/xml` type), `f:8k9xwm`, `f:mtltw7`, `f:ms7l5u` (one clause), `f:n33lwb` (not
restated).

Content:

- One sentence (`f:mt7qcl`): the scaffold builds its rows by hand from `site.all()` plus the site
  root, with `lastmod` taken from `date` alone.
- One `ts` block: the scaffold's `sitemap.xml/+server.ts`, marked `snippet-check-skip`.
- A numbered list of steps, the location first:
  1. In `src/routes/sitemap.xml/+server.ts`, export `prerender = true` (`f:8k9xwm`).
  2. If the sitemap should take `lastmod` from `updated` or list pages that are not entries, build
     the rows with `buildSitemapView` (`f:mc3n4w`).
  3. Pass it `buildSiteDescriptors(cairn, siteConfig)`, the origin, and your non-entry paths as
     `extraRoutes` (`f:mc3n4w`, `f:nibegw`).
  4. Return `sitemapResponse` with the rows (`f:pvk6h5`).
- One `ts` block for the `buildSitemapView` form, with `extraRoutes` of `['/']` plus a local
  example path. Marked `snippet-check-skip`.
- One sentence (`f:mc3n4w`): `extraRoutes` come first, with no `lastmod`, and an entry's `lastmod` is
  its `updated` date, else its `date`; a page that is not an entry, such as an about page or a tag
  index, appears only through `extraRoutes`.
- One sentence (`f:nibegw`): both builders, with `renderJsonLdScript` and `buildExcerpt`, are pure
  functions on `@glw907/cairn-cms/delivery/data`, which `/delivery` re-exports. Link
  `docs/reference/delivery-data.md#buildsitemapview`.
- One clause (`f:ms7l5u`): an entry marked `noindex` still gets a row, which "Keep noindex entries
  out of the sitemap and feeds" handles (by heading).

**Hand-off (no-claim):** "Next, point crawlers at the sitemap and keep them out of the admin."

### Serve robots.txt

**First sentence:** The robots route returns `robotsResponse` with the sitemap's URL and
`disallow: ['/admin']`, since nothing in the admin route itself keeps a crawler out.

**Facts:** `f:0elmiu`, `f:xafwcw`. Cited again: `f:8k9xwm`.

Content:

- One step, a single bulleted item: in `src/routes/robots.txt/+server.ts`, export
  `prerender = true` and return `robotsResponse({ sitemapUrl, disallow: ['/admin'] })`
  (`f:8k9xwm`, `f:0elmiu`).
- One `ts` block of the call without `posture` (the scaffold's file minus the posture line and its
  cast), marked `snippet-check-skip`.
- One sentence (`f:0elmiu`): a site that leaves out `/admin` lets a crawler index its sign-in page.
- One sentence (`f:xafwcw`): `robotsResponse` also takes a `posture` option for a stance toward
  AI-training crawlers; link `docs/extend/choose-an-ai-posture.md#pass-the-posture-to-the-robots-route`.

**Hand-off (no-claim):** "Next, decide whether noindex entries belong in the sitemap and feeds."

### Keep noindex entries out of the sitemap and feeds

**First sentence:** A draft never reaches a public route, but an entry whose `robots` field carries
`noindex` still appears in the sitemap and both feeds.

**Facts:** `f:ms7l5u`. Cited again: `f:m9z6sr` (the first sentence's draft clause), `f:3r08v1`,
`f:jsh6ae` (`readSeoFields`, and `robots` needs declaring).

Content:

- One clause after the first sentence, a back-reference by heading: the draft rules are in "Build
  one typed index". It restates none of them.
- One sentence (`f:ms7l5u`, `f:3r08v1`): only the head's robots meta tag and the markdown twin read
  the `robots` field, so the sitemap and the feeds list a `noindex` entry.
- One step, a single bulleted item, condition first: if `noindex` entries should stay out, in the
  sitemap route and the feed mapping, drop each entry whose frontmatter `robots` includes
  `noindex`, read with `readSeoFields` (`f:ms7l5u`, `f:jsh6ae`).
- One short `ts` fragment: an `isNoindex` helper over `readSeoFields(entry.frontmatter).robots`,
  reaching the entry through the concept index's `byId`. Marked `snippet-check-skip`.
- One clause (`f:jsh6ae`, cited): the field reaches the frontmatter only when the fieldset declares
  `robots`, as "Declare the fields the head reads" shows (by heading).

**Hand-off (no-claim):** "The remaining pages are the site's own: the archive, other pages that are
not entries, and a tag page."

### Build the archive

**First sentence:** An archive reads a dated concept's `all()`, which already returns entries newest
first, so the route paginates the list without sorting it.

**Facts:** `f:upec9v`, `f:38pjqy`, `f:2zl3qz`. Cited again: `f:k7nln3` (one clause).

Content:

- One sentence (`f:upec9v`): a dated concept sorts newest first by `date`, with an undated entry
  last, and an undated concept sorts by `title`.
- One sentence (`f:38pjqy`, scoped to the scaffold): the scaffold's `src/chassis/archive.ts` sets
  `ARCHIVE_PAGE_SIZE`, 13, for both the home page and `/archive/[page]`, and both paginate every
  post after the newest, which the home page shows as its lead, so `/archive/2` exists only once
  more than 14 posts are published.
- A numbered list of steps, the location first:
  1. In `src/routes/(site)/archive/[page]/+page.server.ts`, export `prerender = true` and an
     `entries` generator that lists the real page numbers. (A local procedure; cite `f:upec9v` for
     the list it slices.)
  2. In `vite.config.ts`, in the `prerender` option's `handleUnseenRoutes` handler, exempt the
     archive route by id, since a corpus that fits on one page gives it no entries (`f:2zl3qz`).
- One sentence (`f:2zl3qz`): the scaffold exempts `/(site)/archive/[page]` and nothing else, and any
  other unseen prerenderable route still fails the build. Link
  `docs/extend/scaffolded-site-files.md#crawl-rules` and SvelteKit's Vite plugin reference
  (https://svelte.dev/docs/kit/@sveltejs-kit-vite).
- One clause (`f:k7nln3`, cited): the archive gets no SEO head from the engine.

**Hand-off (no-claim):** "Next, give pages like the archive a head."

### Give other pages a head

**First sentence:** `createPublicRoutes` builds a head only for entry pages, so a home, archive, or
tag page gets a description, canonical link, or Open Graph tags only when your route builds one.

**Facts:** `f:k7nln3`. Cited again: `f:fvi8rk` (`CairnHead` takes `seo`), `f:dvg5gn`
(`titleTemplate`), `f:nibegw` (`renderJsonLdScript`, `buildExcerpt`), `f:nbn6j0`.

Content:

- One sentence (`f:k7nln3`): the scaffold's home page sets only a `<title>`.
- A numbered list of steps, the location first:
  1. In the page's `+page.server.ts` load, return the result of `buildSeoMeta` with the page's
     title, a description, its canonical URL (the origin plus its path), and the site name
     (`f:k7nln3`).
  2. In its `+page.svelte`, render `CairnHead` with that `seo` (`f:fvi8rk`).
- One `ts` and one `svelte` block, for a hypothetical about-style page; the paths are local.
  Marked `snippet-check-skip`. Link `docs/reference/delivery-data.md#buildseometa` for every input.
- One sentence (`f:nibegw`, `f:nbn6j0`): a page that writes its own `<script>` instead of
  `CairnHead` serializes its JSON-LD with `renderJsonLdScript`, and `buildExcerpt` cuts a
  description from a markdown body.
- One clause (`f:dvg5gn`, cited): the same `titleTemplate` rule applies.

**Hand-off (no-claim):** "A tag page is one such page."

### Add a tag page

**First sentence:** A tag page lists one tag's entries with `byTag()` and enumerates its paths with
`allTags()`, and both leave drafts out.

**Facts:** `f:m9z6sr` (scoped: the two tag methods and drafts). Cited again: `f:k7nln3`,
`f:mc3n4w` (`extraRoutes`), `f:mt7qcl` (the scaffold's hand-built rows), `f:pvk6h5` (a
`SitemapUrl` row), `f:2zl3qz` (an unseen route fails the build).

Content:

- One precondition sentence: the concept marks its tag field `taxonomy: true`; link
  `docs/extend/define-an-adapter-and-schema.md#mark-the-tag-field` (opened and confirmed: that
  section marks the field and says the index reads it as each entry's tags).
- A numbered list of steps, the location first:
  1. In `src/routes/(site)/tags/[tag]/+page.server.ts`, export `prerender = true` and an `entries`
     that maps the concept index's `allTags()` to `{ tag }` (`f:m9z6sr`).
  2. In the same file's `load`, return `byTag(params.tag)` and a head from `buildSeoMeta`
     (`f:m9z6sr`, `f:k7nln3`).
  3. In `+page.svelte`, render `CairnHead` and the list of entries.
  4. If the sitemap route uses `buildSitemapView`, add each tag page's path to `extraRoutes`
     (`f:mc3n4w`).
  5. If the sitemap route builds its rows by hand, as the scaffold's does, add one row per tag
     page with the origin plus its path as `loc` (`f:mt7qcl`, `f:pvk6h5`).
  6. If the site may have no tags yet, in `vite.config.ts`, exempt the tag route in
     `handleUnseenRoutes` as the archive is (`f:2zl3qz`).
- One `ts` block for the server module, marked `snippet-check-skip`. Its `entries` reads
  `allTags().map(({ tag }) => ({ tag }))`, which rests on `src/lib/delivery/content-index.ts:75`
  (`allTags(): { tag: string; count: number }[]`) until a fact states the shape (friction filed);
  the prose names no return shape.
- One sentence (`f:m9z6sr`): `allTags()` always leaves drafts out, so a tag that only a draft
  carries gets no page.

**Hand-off (no-claim):** "Last, let editors change the site's menu."

### Add an editable menu

**First sentence:** Declaring `editor.nav` on the adapter turns on the menu editor at `/admin/nav`,
and the public layout reads the same menu with `readMenu`.

**Facts:** `f:rnwver` (scoped: not its `configPath` clause), `f:f9aayq`, `f:shv6wv`, `f:t895qz`,
`f:rzfdqw`, `f:ri06xw`, `f:2s8u70`.

Content:

- A numbered list of steps, one action each, the location first:
  1. In the adapter's `editor` group, declare `nav` with `menuName`, `label`, and an optional
     `maxDepth` (2 when unset), as the scaffold's `nav: { menuName: 'primary', label: 'Navigation',
     maxDepth: 2 }` does (`f:f9aayq`).
  2. If your site config is not at `src/theme/site.config.yaml`, set `editor.siteConfigPath` to its
     path, since the menu editor reads and commits that file (`f:shv6wv`).
  3. In the site config, under `menus`, add the menu named by `menuName` as a list of nodes
     (`f:t895qz`, `f:rzfdqw`).
  4. In a server-only module, read the menu with `readMenu(siteConfig, name, maxDepth)`, at the same
     depth as `maxDepth` (`f:rnwver`, `f:ri06xw`).
  5. In the root `src/routes/+layout.server.ts`, return the menu from the `load` (`f:ri06xw`).
- One sentence after step 2 (`f:shv6wv`): the file `editor.siteConfigPath` names is also where
  the Settings screen saves tidy's conventions; link
  `docs/extend/turn-on-tidy.md#let-editors-change-the-conventions` (the outline's crossLink to
  turn-on-tidy, re-reasoned on `editor.siteConfigPath`, since `editor.nav` names no file). The
  link is conditional: `docs/extend/turn-on-tidy.md` has a plan in this branch but no page on disk
  yet. If that page has not landed when this one is drafted, the drafter links
  `docs/reference/core.md#siteconfigpath-adapter-editor-member` instead (opened and confirmed: it
  states that the nav editor, Settings, and the tag vocabulary read and write the one file, and
  its default) and leaves turn-on-tidy out of See also.
- One sentence after step 1 (`f:f9aayq`): `label` names the nav screen in the admin sidebar.
- One sentence after step 1 (`f:rnwver`): without `editor.nav`, `/admin/nav` answers 404, and a
  `navLayout` that references the `nav` screen throws at server start; link
  `docs/extend/arrange-the-admin-sidebar.md` for the sidebar.
- One sentence after step 5 (`f:ri06xw`): the scaffold reads its menus once in
  `src/theme/site-config.ts` and imports that lean module, not the full adapter, so the layout load
  skips the renderer's cost on every request.
- One `yaml` block: a short `menus.primary` with a group header and one child, written as local
  example labels and paths.
- A bulleted list of the node rules (`f:rzfdqw`): a node is `{ label, url?, children? }`, and a node
  with no `url` is a group header; a label must be non-empty and at most 500 characters; a URL is
  at most 2048 characters and starts with `/`, `#`, `http://`, `https://`, `mailto:`, or `tel:`; the
  tree holds at most 200 nodes and nests no deeper than `maxDepth`; any other key is dropped.
- One sentence (`f:rzfdqw`): `readMenu` returns an empty list for an absent menu and throws a
  `NavValidationError` on any violation.
- One sentence on the second menu (`f:2s8u70`, `f:t895qz`): only the menu `menuName` names is
  editable at `/admin/nav`; the scaffold's `menus.footer` is a flat list the developer edits in
  `site.config.yaml`, read with `readMenu(siteConfig, 'footer', 1)`. Link
  `docs/reference/core.md#readmenu`.

**Hand-off (no-claim):** "With every route in place, build the site and read what it serves."

### Verify the built routes

**First sentence:** Build the site, serve the build, and check that each prerendered file carries
your origin.

**Facts:** `f:8k9xwm`, `f:70uh8b` (`/feed.json` prerenders), `f:0elmiu`, `f:k16chc`, `f:gwpffe`
(the served type under `wrangler dev`; `vite preview` cannot serve adapter 8 output), `f:ioh6uj`
(the scaffold's placeholder), `f:pvk6h5` (the sitemap's `application/xml` type).

The lead-in (no-claim): "To check the build, follow these steps:" Then a numbered list, one action
each, the location first, with the observable result beneath each step that produces one:

1. In the project directory, run `npm run build`. Result: the build finishes; if it stops, see
   "Diagnose a failed build" (by heading).
2. In the project directory, run `npm run preview`, which serves the build on a scaffolded site
   (`f:8k9xwm`). On another site, serve it with `wrangler dev`, since `vite preview` cannot serve
   `@sveltejs/adapter-cloudflare` 8 output (`f:gwpffe`).
3. In a terminal, fetch `/sitemap.xml` from the preview address. Result: every `loc` starts with
   your origin literal, not the preview's address (`f:k16chc`). On an unedited scaffold, that is
   `https://showcase.test` (`f:ioh6uj`).
4. Fetch `/feed.xml` and `/feed.json`. Result: each lists the published posts with absolute URLs
   (`f:70uh8b`).
5. Fetch `/robots.txt`. Result: a `Disallow: /admin` line and a `Sitemap:` line naming your
   origin's `/sitemap.xml` (`f:0elmiu`).
6. Print the headers of an entry's twin with `curl -s -D - -o /dev/null '<preview>/<permalink>.md'`.
   Result: `content-type: text/markdown; charset=utf-8` (`f:gwpffe`).
7. Open an entry in a browser and view its source. Result: the canonical link and `og:url` are your
   origin plus the permalink (`f:k16chc`).

Use `<preview>` and `<permalink>` placeholders; give no port number (no fact states the preview
port).

**Hand-off (no-claim):** "If the build stops instead, its message names the cause."

### Diagnose a failed build

**First sentence:** The public routes fail the build on content they cannot serve, and each failure
names its cause in the error.

**Facts:** `f:n07oiu`, `f:kv3qen`, `f:ky39tz`, `f:d7v5cg`, `f:2zl3qz`, `f:rzfdqw`. Cited again:
`f:m9z6sr`.

Content, the anatomy's failure path (item 5):

- One sentence linking `docs/extend/add-cairn-to-a-sveltekit-app.md#resolve-a-content-build-failure`
  for a concept with no glob and a drifted manifest (opened and confirmed: it lists both), and
  `docs/extend/debug-your-site.md` for the logs. That page has no row for these failures (friction
  filed), so the table stays on this page. This is an argued departure from the anatomy's item 5:
  when friction 6 lands, the rows move to `docs/extend/debug-your-site.md` and this section reduces
  to a pointer.
- The lead-in (no-claim): "Find the message in the following table."
- A three-column table (what the build prints, what it means, fix), rows in the order a build meets
  them:
  - `expected input to be a string or buffer`: a glob is lazy or lacks `?raw` and
    `import: 'default'` (`f:n07oiu`); fix the glob as "Build one typed index" shows.
  - One line per invalid field, each `<dir>/<id>: <field>: <message>`: a published entry's
    frontmatter fails its concept's validation (`f:kv3qen`); fix the field, or mark the entry
    `draft: true`, since an invalid draft never fails the build.
  - `permalink "<p>" resolves to both "<a>" and "<b>"`: two published entries share a permalink
    (`f:ky39tz`); change one entry's slug or permalink.
  - A thrown error from the link resolver: a `cairn:` link in a rendered body points at a missing
    entry or a non-routable concept (`f:d7v5cg`); fix or remove the link. Quote no message (no fact
    states one).
  - An unseen-route error naming a prerenderable route: the route's `entries` returned nothing
    (`f:2zl3qz`); exempt it as "Build the archive" shows.
  - `NavValidationError`: a menu in the site config breaks a node rule (`f:rzfdqw`); fix the node as
    "Add an editable menu" lists.
- One sentence (`f:kv3qen`): `createSiteIndexes` accepts `{ validate: false }` to skip the check,
  and every invalid entry, draft or not, is left out of the index and listed by the index's
  `problems()`.

**Hand-off:** none; See also follows.

## Ending

### See also

The anatomy's item 6: related how-to guides, concept pages, and the limitations the page leaves out,
with the recovery links (`docs/extend/debug-your-site.md`, the tutorial's failure section) not
repeated. The introducing sentence (no-claim): "The following pages cover the pieces this page links
to." Then a bulleted list, each item's link text naming its destination:

- `docs/reference/delivery.md`, `createPublicRoutes`, `PublicRoutesConfig`, `EntryData`, and
  `CairnHead`.
- `docs/reference/delivery-data.md`, the index, feed, sitemap, robots, and SEO builders.
- `docs/extend/choose-an-ai-posture.md`, the robots route's `posture`.
- `docs/extend/share-a-draft-preview.md`, the preview route that reuses the entry config.
- `docs/extend/act-on-newly-published-entries.md`, acting on newly published entries, for example
  announcing them after a deploy.
- `docs/extend/turn-on-tidy.md`, the tidy conventions saved to the same site-config file as the
  menu. Conditional: listed only if that page has landed when this one is drafted (see "Add an
  editable menu").
- `docs/extend/configure-media.md`, hero and body images on public pages.
- `docs/extend/theme-your-public-site.md`, styling the routes this page wires.
- `docs/extend/scaffolded-site-files.md`, every scaffold file, the admin's included.

### The outline's cross-links, ruled

The stage outline's `crossLinks` name four links from this page (every row whose `from` is
build-the-public-routes); each is placed in See also and, where the reader needs it mid-task, in a
section.

- **To choose-an-ai-posture** ("The robots posture option."): carried, in "Serve robots.txt" at
  `docs/extend/choose-an-ai-posture.md#pass-the-posture-to-the-robots-route`, in the introduction's
  scope routing, and in See also.
- **To share-a-draft-preview** ("The preview route shares the entry composition."): carried, in "Lay
  out the route files" (the `preview/[token]/` sentence), in the introduction's scope routing, and in
  See also.
- **To act-on-newly-published-entries** ("Acting on newly published entries."): carried, in the
  introduction's scope routing and in See also. No section acts on it, since announcing is out of
  scope.
- **To turn-on-tidy** ("Declaring editor.nav also names the site-config file tidy conventions are
  saved to."): carried, re-reasoned. `f:shv6wv` says `editor.siteConfigPath`, not `editor.nav`,
  names the file, so the link sits after the `editor.siteConfigPath` step in "Add an editable menu"
  and in See also. It is conditional on `docs/extend/turn-on-tidy.md` landing, as that section
  records; the outline's stale reason is already filed as friction (the stale `crossLinks` pair
  entry in `docs/internal/docs-friction-log.md`), and this placement is the re-reasoning that entry
  proposes.

## Dispositions, every fact id

`carried` names the section that holds the fact's primary placement. Of the 54 ids this plan was
handed, 53 are carried (some scoped, as noted) and one, `f:em69ru`, is subordinated and recorded as
cut. The table also restates the page inputs' two cuts, `f:qzcpzc` and `f:g030q0`, and adds one
container fact, `f:s4prb0`, scoped where it lands.

| Fact | Disposition | Section, or reference and reason |
| --- | --- | --- |
| f:fvi8rk | carried | Wire the entry pages (the load data, `CairnHead` takes `seo`); cited again in Give other pages a head |
| f:k16chc | carried | Name the origin once (written into prerendered output, deployed origin before the production build); cited again in Introduction, Wire the entry pages (canonical, `og:url`), Serve the feeds, Verify the built routes |
| f:yef4lo | carried | Build one typed index (one literal glob per concept); cited again in Introduction, Before you begin |
| f:niuzzg | carried | Name the origin once (one literal, not an env read; per-environment config); cited again in Introduction |
| f:pkt8i6 | carried | Wire the entry pages (`createPublicRoutes`' config, `entryLoad` with its 404, `entries`) |
| f:03lbjg | carried | Serve the markdown twin (`.md` twin, `[...path=md]` matcher, precedence) |
| f:gwpffe | carried | Serve the markdown twin (the Content-Type Note); cited again in Verify the built routes (served type; `vite preview` and adapter 8) |
| f:0elmiu | carried | Serve robots.txt (`disallow: ['/admin']`); cited again in Verify the built routes |
| f:xafwcw | carried | Serve robots.txt (the `posture` option, linked) |
| f:hv8qs9 | carried | Build one typed index (one index per concept plus `site`; reserved id) |
| f:pvk6h5 | carried | Serve the feeds (builders and responders, the `FeedChannel` and `FeedItem` shapes); cited again in Serve the sitemap (`SitemapUrl`), Add a tag page (step 5), and Verify the built routes |
| f:d7v5cg | carried | Serve the feeds (`createLinkResolver`, the build fails on a dangling link); cited again in Diagnose a failed build |
| f:8k9xwm | carried | Verify the built routes (prerendered `/sitemap.xml`, `/feed.xml`, `/robots.txt`, `npm run preview`); cited again in Serve the feeds, Serve the sitemap, Serve robots.txt |
| f:upec9v | carried | Build the archive (the engine's order); cited again in Build one typed index |
| f:3r08v1 | carried | Serve the markdown twin (`markdownEntries` skips noindex, `markdownLoad` 404s); cited again in Keep noindex entries out of the sitemap and feeds |
| f:bnt2wh | carried | Wire the entry pages (`assetsEnabled` only diagnoses) |
| f:dvg5gn | carried | Wire the entry pages (`titleTemplate` rule); its `markdownUrl` clause in Serve the markdown twin; cited again in Give other pages a head |
| f:j2rndg | carried | Declare the fields the head reads (description fallback) |
| f:j81xye | carried | Declare the fields the head reads (article versus website) |
| f:jguiox | carried | Declare the fields the head reads (social image fallback, card and alt rules) |
| f:jsh6ae | carried | Declare the fields the head reads (the four fields, three need declaring); cited again in Keep noindex entries out of the sitemap and feeds |
| f:k5uws5 | carried | Declare the fields the head reads (hero read only from `image`) |
| f:k7nln3 | carried | Give other pages a head (no head beyond entries; the scaffold's home sets only a `<title>`); cited again in Build the archive, Add a tag page |
| f:kdo96n | carried | Declare the fields the head reads (JSON-LD shape, no author, replace `seo.jsonLd`) |
| f:kv3qen | carried | Diagnose a failed build (the invalid-field list, `validate: false`, `problems()`, drafts never fail it) |
| f:ky39tz | carried | Diagnose a failed build (the permalink collision) |
| f:m9z6sr | carried | Build one typed index (drafts excluded from `all`, `byTag`, `allTags`, `adjacent`, and the resolver; `byId` still returns them); scoped in Add a tag page (`byTag`, `allTags`); cited again in Keep noindex entries out of the sitemap and feeds (the first sentence's contrast) and Diagnose a failed build |
| f:mc3n4w | carried | Serve the sitemap (`buildSitemapView`, `extraRoutes` first, `lastmod` from `updated` else `date`); cited again in Add a tag page (step 4) |
| f:ms7l5u | carried | Keep noindex entries out of the sitemap and feeds; cited again in Serve the sitemap |
| f:mt7qcl | carried | Serve the sitemap (the scaffold's hand-built rows, `lastmod` from `date` alone); cited again in Add a tag page (step 5) |
| f:mtltw7 | carried | Name the origin once (no trailing slash); cited again in Serve the sitemap |
| f:n07oiu | carried | Build one typed index (the glob form); cited again in Diagnose a failed build (the message) |
| f:n33lwb | carried | Build one typed index (the config argument does not change the indexes) |
| f:nbn6j0 | carried | Declare the fields the head reads (the excerpt behind the description fallback); cited again in Give other pages a head |
| f:nibegw | carried | Serve the sitemap (the four pure builders on `/delivery/data`); cited again in Give other pages a head |
| f:nnup2g | carried | Declare the fields the head reads (the scaffold's `defaultImage` 404s until the file exists) |
| f:rnwver | carried (scoped) | Add an editable menu (`editor.nav` turns on `/admin/nav`, the 404 and the `navLayout` throw, `readMenu`). Its `configPath` clause is not used: `NavMenuConfig` has no such member (`f:f9aayq`, `f:shv6wv`; friction filed by the page inputs) |
| f:rzfdqw | carried | Add an editable menu (node shape and limits, `[]` for an absent menu, `NavValidationError`); cited again in Diagnose a failed build |
| f:2s8u70 | carried | Add an editable menu (the footer menu, edited by hand, depth 1) |
| f:q07rd5 | carried (scoped) | Before you begin (the adapter's path on each site); cited again in Declare the fields the head reads. Its clauses on `src/access.ts` and the tutorial's `hooks.server.ts` are not used |
| f:shv6wv | carried (scoped) | Add an editable menu (the menu editor reads and commits the file `editor.siteConfigPath` names, default `src/theme/site.config.yaml`; the Settings screen saves tidy's conventions to the same file, carrying the turn-on-tidy link) |
| f:em69ru | cut | Subordinated: that `menus` is one of the site config's allowed top-level keys is stated by `docs/reference/core.md#parsesiteconfig` (opened and confirmed: it lists `siteName`, `description`, `author`, `locale`, `menus`, `spellcheck`, `tidy`, `vocabulary`). Its doctor search-path clause is not needed for this page's job |
| f:83gbov | carried | Wire the entry pages (`heroImage` undefined cases; the raw token kept) |
| f:qtm9y2 | carried | Lay out the route files (the scaffold's `src/routes/` and `src/params.ts`); cited again in Serve the markdown twin |
| f:38pjqy | carried (scoped) | Build the archive (`ARCHIVE_PAGE_SIZE` 13, shared with the home page, `/archive/2` after 14 posts) |
| f:2zl3qz | carried | Build the archive (the `handleUnseenRoutes` exemption); cited again in Add a tag page, Diagnose a failed build |
| f:2dqwmu | carried (scoped) | Serve the feeds (the scaffold's mapping resolves fragments and makes image URLs absolute) |
| f:9xy8j9 | carried | Serve the feeds (step 5, `feeds` adds head alternates only and serves no feed) |
| f:70uh8b | carried | Serve the feeds (`/feed.json` through `jsonFeedResponse`, both feeds from one mapping over posts); cited again in Verify the built routes |
| f:ioh6uj | carried | Name the origin once (the scaffold's `'https://showcase.test'` placeholder, `PUBLIC_ORIGIN` for the same host, `siteMeta`); cited again in Verify the built routes |
| f:u41mw4 | carried | Declare the fields the head reads (`seo: true` on one top-level image; nested or duplicate throws; works only named `image`) |
| f:f9aayq | carried | Add an editable menu (`menuName`, `label`, `maxDepth`; the scaffold's values) |
| f:t895qz | carried | Add an editable menu (`menus` holds several menus; only `menuName`'s is editable) |
| f:ri06xw | carried | Add an editable menu (menus read in `site-config.ts`, returned from the root layout's load) |
| f:qzcpzc | cut | As the page inputs disposed it: showcase internals; the scaffold's routes, sourced by `f:8k9xwm`, `f:70uh8b`, and `f:0elmiu`, show the same builders |
| f:g030q0 | cut | As the page inputs disposed it: showcase wiring. The page shows the minimal catch-all and names the reference-resolution step by heading on `docs/extend/link-content-with-references.md` |
| f:s4prb0 | carried (added, scoped) | Lay out the route files (`content.ts`, `feed.ts`, `public-routes.ts` in `src/chassis/`); cited again in Wire the entry pages and Serve the feeds |

The page-inputs claim inventory carried two more rows, disposed as it recorded them: the absent
prior page (no claims) and the `configPath` clause of `f:rnwver` (above). Its "filed" rows are
carried here: `f:70uh8b`, `f:ri06xw`, `f:ioh6uj`, `f:9xy8j9`, `f:u41mw4`, `f:f9aayq`, and
`f:t895qz`, each placed above.

## Friction filed

The page-inputs step filed four entries on 2026-10-12 (the scaffold's sitemap against
`buildSitemapView`; the two comments on the SEO image's field name; the scaffold's missing
`defaultImage` file; `f:rnwver`'s `configPath`), and this plan does not refile them. The
`siteConfigPath` entry filed by the define-an-adapter-and-schema page inputs already covers the
tutorial's site-config path. This plan filed eight entries in `docs/internal/docs-friction-log.md`
on 2026-10-12, none blocking the page:

1. Engine: the origin has two homes, the `ORIGIN` literal and `PUBLIC_ORIGIN`, and the scaffold
   ships them different with nothing comparing them.
2. Engine: `markdownResponse`'s Content-Type never reaches production from a prerendered route on
   adapter-cloudflare.
3. Engine: `PublicRoutesConfig.feeds` reads as turning feeds on but only adds head links.
4. Engine: `createSiteIndexes` requires a site-config argument it ignores.
5. Engine: the scaffold's home and archive carry no SEO head.
6. Docs content: `docs/extend/debug-your-site.md` has no row for the public routes' build failures.
7. Docs content: facts-container hole for `allTags()` and `byTag()` return shapes.
8. Docs content: `docs/reference/delivery-data.md`'s responder examples import modules neither
   taught site has.

The structural-edit revision filed nothing new. The turn-on-tidy cross-link's stale outline reason
is already in the log (the stale `crossLinks` pair entry, filed by the turn-on-tidy plan's
structural-edit revision), and this plan's placement on `editor.siteConfigPath` is the fix that
entry proposes for this direction.

## Drafting constraints

- **The brief's `local` array** takes the names the page has the reader create or supply: the tag
  route `src/routes/(site)/tags/[tag]/` and its files, the about-style page's path in "Give other
  pages a head", the `isNoindex` helper, the example menu labels and paths, the `extraRoutes`
  example path, and the placeholders `<preview>` and `<permalink>`.
- Never say `PublicRoutesConfig.feeds` serves, builds, or turns on a feed.
- Never name a `configPath` member on `editor.nav`; the path is `editor.siteConfigPath`.
- Never say the hero or social image reads the field `seo: true` marks; delivery reads the
  frontmatter key `image` only.
- Never say the twin's Content-Type header is guaranteed in production; state what was measured
  and where (`f:gwpffe`).
- Never say `ORIGIN` must be a literal because the engine requires it; it is a site-authoring
  recommendation (`f:niuzzg`).
- Never say the sitemap or the feeds leave out `noindex` entries.
- Never say `entryLoad` builds a head for a home, archive, or tag page.
- Never claim the scaffold's catch-all code beyond what `f:pkt8i6` and `f:qtm9y2` source; do not
  name `withReferences` (`f:g030q0` is cut).
- Never state `allTags()`'s return shape in prose; the code block alone uses it (friction 7).
- Never state the preview server's port.
- Never say declaring `editor.nav` names the site-config file; the turn-on-tidy link rests on
  `editor.siteConfigPath` (`f:shv6wv`). Link `docs/extend/turn-on-tidy.md` only if it is on disk at
  drafting time; otherwise link the `siteConfigPath` reference entry and leave it out of See also.
- `createSiteIndexes`, `createPublicRoutes`, `entryLoad`, `entries`, `markdownEntries`,
  `markdownLoad`, `markdownResponse`, `rssResponse`, `jsonFeedResponse`, `sitemapResponse`,
  `robotsResponse`, `buildSitemapView`, `buildSiteDescriptors`, `buildSeoMeta`,
  `renderJsonLdScript`, `buildExcerpt`, `readSeoFields`, `createLinkResolver`, `CairnHead`,
  `PublicRoutesConfig`, `readMenu`, `NavValidationError`, every route path, and every frontmatter
  key in code spans.
- Vendor specifics get a link, never a copy: SvelteKit's route sorting, prerendering, and Vite
  plugin options; Vite's `import.meta.glob`.
- Every section opens on the first sentence decided above. Each step names its location before its
  action and holds one action, a conditional step states its condition first, and a procedure of
  one step is a single bulleted item. A reference names its target by heading, never by position.
