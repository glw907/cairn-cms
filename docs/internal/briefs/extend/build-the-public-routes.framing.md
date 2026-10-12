# Framing record: Build the public routes

Agent-facing; drives the introduction of `docs/extend/build-the-public-routes.md` only; the body
follows the page plan (`docs/internal/briefs/extend/build-the-public-routes.plan.md`).

Written 2026-10-12 by the intro framing step of the docs page chain (stage 2b part 1, run 3), from
the stage outline `docs/internal/outlines/extend.json`, the arm index `docs/extend/README.md`, the
page plan, the register's "The introduction" and "The page anatomies", and the fact bullets named
below. `docs/README.md` does not exist yet, so no front-door page links here.

## Who arrives, from where, and why

1. **The scaffolded site's developer (the main reader).**
   - From: `docs/extend/scaffolded-site-files.md` (its out-of-scope list, "The wiring of each
     delivery route", and the routes section, "covers each route's wiring");
     `docs/extend/theme-your-public-site.md` (introduction and See also, "wires the delivery routes
     the chassis feeds"); the extend index's "Public site" group.
   - Came for: what each public route already in the tree does, which engine builder it calls, and
     where to change it, most urgently before the first production build.
   - Knows: SvelteKit; the tree, from the scaffolded-files page; the adapter at
     `src/theme/cairn.config.ts`.
   - Lacks: the dependency chain (index, origin, one shared config) that ties the route files
     together. They do not know that the origin literal ships as the placeholder
     `'https://showcase.test'` and is baked into every prerendered file (`f:ioh6uj`, `f:k16chc`).
     They do not know where the engine's head stops (`f:k7nln3`, `f:k5uws5`), or that the scaffold's
     `defaultImage` file does not exist (`f:nnup2g`).
2. **The add-cairn tutorial's graduate.**
   - From: `docs/extend/add-cairn-to-a-sveltekit-app.md`, "Render the entry" ("covers the routes
     beyond this one"), its introduction's scope list, and its Next steps.
   - Came for: everything past the one entry route: the head, the twin, the feeds, the sitemap,
     robots.txt, and the archive.
   - Knows: `createSiteIndexes` with one literal glob, the `origin` export holding the local dev
     value in `src/lib/content.ts`, an entry catch-all at `src/routes/[...path]/` whose page renders
     only `html`, and the adapter at `src/lib/cairn.config.ts`.
   - Lacks: `CairnHead`, a shared `PublicRoutesConfig` module, `defaultImage`, and the `(site)`
     group and `src/chassis/` that the page's examples use. They translate the scaffold's paths to
     their own once, where "Lay out the route files" says how.
3. **The tag-page builder.**
   - From: `docs/extend/define-an-adapter-and-schema.md`, "Mark the tag field" ("To list a concept's
     entries by tag on public pages") and its See also.
   - Came for: a page that lists one tag's entries.
   - Knows: the `taxonomy: true` field and the vocabulary.
   - Lacks: `allTags()` and `byTag()`, the drafts rule, the head a non-entry page must build itself,
     the sitemap rows, and the unseen-route exemption. Their section, "Add a tag page", leans on
     "Give other pages a head", so the intro names both.
4. **The public-menu builder.**
   - From: `docs/extend/arrange-the-admin-sidebar.md` ("For the public site's own menu", "covers the
     menu editor", and its See also, "turns on the public menu editor behind the `nav` screen").
   - Came for: turning on the `nav` screen and reading the menu in the public layout.
   - Knows: `navLayout`, and that a `navLayout` naming `nav` without `editor.nav` throws.
   - Lacks: `editor.nav`'s members (`f:f9aayq`), `editor.siteConfigPath`, the node rules, and
     `readMenu`.
   - Wrong-place variant: a reader who searched "nav" for the admin's own sidebar belongs on
     `docs/extend/arrange-the-admin-sidebar.md`.
5. **The search reader with a symptom.**
   - From: a search on an SEO or share-card symptom (a home or archive page with no description or
     Open Graph tags, an `og:image` that answers 404, or a hero that never shows in a share card) or
     on a build message (`expected input to be a string or buffer`, a permalink collision, a list
     of invalid fields).
   - Came for: one fix.
   - Knows: their own site.
   - Lacks: the model, and early word that this page answers their symptom and which section does.
     The intro names these reasons in one paragraph (`f:k7nln3`, `f:k5uws5`, `f:kv3qen`,
     `f:n07oiu`).
6. **Readers arriving from neighbors with a narrow ask.**
   - From: `docs/extend/act-on-newly-published-entries.md` (feeds, "for subscribers who pull new
     posts"), `docs/extend/share-a-draft-preview.md` (the entry route the preview mirrors), and
     `docs/extend/link-content-with-references.md` ("public routes beyond the entry route").
   - They want one route, and readers 1 and 2's contract covers each.
7. **Wrong place.** Each of these readers is named in the bounds list with the page they belong on.
   - An AI-crawler stance: `docs/extend/choose-an-ai-posture.md`.
   - The draft preview route: `docs/extend/share-a-draft-preview.md`.
   - Pushing new posts to subscribers rather than serving a feed they pull:
     `docs/extend/act-on-newly-published-entries.md`.
   - `media:` images on public pages: `docs/extend/configure-media.md`, "Resolve media on public
     pages".
   - The pages' look: `docs/extend/theme-your-public-site.md`.
   - The admin's own sidebar: `docs/extend/arrange-the-admin-sidebar.md`.

## Background the page rests on

1. **The routes are the site's, and the data is the engine's.** A cairn site's public pages are
   route files in the site's own SvelteKit app, whose load functions come from the engine's route
   factories, and the app builds with `@sveltejs/adapter-cloudflare` into one Worker (`f:j0ut9n`).
   Each route is a few lines around an engine builder (`f:pkt8i6`, `f:pvk6h5`). Why the engine
   ships builders and not pages is that public output is design-agnostic (`f:8n6qc8`). That point is
   left out of this intro on purpose: `docs/extend/theme-your-public-site.md` opens on it.
2. **Where GitHub fits: the routes prerender from the deployed commit.** The public pages are built
   from the markdown in the deployed commit and never read the GitHub repository per request. The
   index and resolver stay in the prerender graph, out of the runtime Worker. A publish therefore
   reaches readers through the build its deploy runs (`f:1mkckz`). The feeds, sitemap, and
   robots.txt are static files that build writes (`f:8k9xwm`, `f:70uh8b`). Two neighbors already
   state the deploy rule in their own words: act-on-newly-published-entries ("reaches its public
   address only through the build that deploy runs") and share-a-draft-preview ("built from the
   published commit when the site deploys"). This intro states it from the route author's side:
   the build runs these routes and writes what the site serves.
3. **Two shared inputs.** Every route reads one typed index from `createSiteIndexes`, built from
   one literal glob per concept (`f:yef4lo`, `f:hv8qs9`), and one origin literal (`f:niuzzg`). The
   literal is a site-authoring recommendation, never an engine rule, and the page must not call it
   one. Because the build runs the routes, the origin is written into every canonical URL,
   `og:url`, feed, and sitemap row, and it must name the deployed origin before a production build
   (`f:k16chc`). On a scaffolded site it ships as a placeholder (`f:ioh6uj`).
4. **Where Cloudflare fits.** It is the build target (`f:j0ut9n`), one clause in the intro. The
   twin's Content-Type caveat (`f:gwpffe`) and `PUBLIC_ORIGIN` (`f:ioh6uj`) are single-route
   details. They stay in "Serve the markdown twin" and "Name the origin once" and do not enter the
   intro.
5. **Where the engine stops.**
   - The head covers entry pages only. A home, archive, or tag page gets one only when the site
     calls `buildSeoMeta` and renders `CairnHead` (`f:k7nln3`).
   - The hero and the share image come only from the frontmatter key `image`, whatever image field
     a concept marks `seo: true` (`f:k5uws5`, `[verified]`). The source is
     `src/lib/delivery/public-routes.ts#deriveHeroImage`; `:99` reads `frontmatter.image`, and
     this run re-read `:93-112`. This is ROADMAP D7, carried as a stated limitation.
   - The scaffold's `defaultImage` file is missing (`f:nnup2g`).
   - These limits give reader 5 their reason, so the intro names the first two in one sentence and
     leaves the third to "Declare the fields the head reads". Wording rule, from the plan: never say
     the hero or share image reads the field `seo: true` marks.
6. **The same render as the preview.** The entry's `html` is the body already run through the
   site's own `render` (`f:fvi8rk`), the same function the editor preview calls (`f:my6ci3`). The
   body rests on this. The intro does not need it.
7. **Adapter path.** The intro names no adapter path. A sentence that names the adapter module says
   which site it means: `src/theme/cairn.config.ts` on a scaffolded site, `src/lib/cairn.config.ts`
   on the add-cairn tutorial's site (`f:q07rd5`). "Before you begin" carries that rule.

## Place in the doc set

- **Group and neighbors.** "Public site", in outline order: theme-your-public-site, this page,
  share-a-draft-preview, act-on-newly-published-entries, add-an-island. The kept
  choose-an-ai-posture sits first in the index. The index does not list this page yet; the
  drafter's index-link step adds it.
- **Links in, and why.**
  - add-cairn-to-a-sveltekit-app: the routes beyond the entry catch-all.
  - scaffolded-site-files: each `(site)` route's wiring.
  - theme-your-public-site: the routes the chassis feeds.
  - define-an-adapter-and-schema: listing entries by tag.
  - arrange-the-admin-sidebar: the public menu editor.
  - link-content-with-references: the routes beyond the entry route.
  - act-on-newly-published-entries and share-a-draft-preview name this page in plain text.
  - Pending: migrate-existing-content (build validation) and turn-on-tidy (`editor.siteConfigPath`)
    are not on disk. choose-an-ai-posture does not link back yet (relink 93).
- **What siblings own, and the opening this intro must not repeat.**
  - theme-your-public-site opens on design-agnostic public output.
  - define-an-adapter-and-schema frames its two readers as "On a scaffolded site … On a site built
    by hand". This intro words the two starting states by what is already on disk instead.
  - scaffolded-site-files inventories the route tree. This page wires it.
  - architecture owns the read and write paths. This intro gives only the build-time slice the
    routes live in.
  - configure-media owns the media resolver. share-a-draft-preview owns the preview route.
    act-on-newly-published-entries owns announcing.
- **Naming.** The outline's terms table defines "delivery surface" on this page, but no published
  page uses the term, and the inbound links say "delivery routes" or "public routes". The intro
  names the set as the title does, "public routes", by listing what it holds. It does not coin
  "delivery surface".

## Intro plan

Two or three paragraphs, then the plan's bounds: the prior-knowledge sentence and the leaves-out
list. Second person.

1. **The model, from above.**
   - Open on a statement about the subject, from where the reader stands. Every page and file a
     visitor or a crawler fetches from the public side is a route in the site's own SvelteKit app,
     and an engine builder supplies its data: entry pages, their raw-markdown twins, the archive,
     the RSS and JSON feeds, the sitemap, and robots.txt (`f:j0ut9n`, `f:70uh8b`). The app builds
     into the site's one Worker on the Cloudflare adapter, which is the only place Cloudflare enters
     the intro (`f:j0ut9n`).
   - The routes prerender. The build reads the markdown in the commit being deployed and writes
     each page and file, and no public request reads GitHub (`f:1mkckz`, `f:8k9xwm`).
   - Every route reads the same two inputs: one typed index of the content (`f:yef4lo`) and one
     origin literal (`f:niuzzg`). Because the build runs the routes, the origin is written into
     every canonical URL, feed, and sitemap row, so it has to name the deployed origin before a
     production build (`f:k16chc`).
   - Do not reuse a neighbor's deploy sentence. Do not open on design-agnostic output, on an
     imperative, or on the page.
2. **Two starting states, and the contract.**
   - A scaffolded site already has every route the page covers except a tag page (`f:qtm9y2`,
     `f:8k9xwm`, `f:70uh8b`, `f:f9aayq`, `f:ri06xw`). Its developer comes to learn what each route
     does and where to change it, starting with an origin that ships as a placeholder (`f:ioh6uj`).
   - A site built through the add-cairn tutorial has the index and the entry route that the
     tutorial's "Render the entry" builds, and gains the rest here. This clause is a cross-reference
     to that section, linked by heading, with no fact id (see couldNotDo).
   - Then the anatomy's one-line contract, kept from the plan. You build the index and the origin,
     compose one `PublicRoutesConfig` (`f:pkt8i6`), and wire the entry pages and their twins, the
     feeds, the sitemap, robots.txt, the archive, a tag page, and an editable menu. Then you read
     the prerendered files after a build.
3. **The narrower reasons, each with its section by heading.** A reader landing mid-task learns
   early that the page answers them.
   - A tag page: "Add a tag page".
   - The public menu behind the admin's `nav` screen: "Add an editable menu" (`f:f9aayq`).
   - A gap in a page's head. The engine builds a head for entry pages only (`f:k7nln3`), and it
     takes the hero and share image only from a frontmatter field named `image`, whatever image a
     concept marks for SEO (`f:k5uws5`). Sections: "Give other pages a head" and "Declare the fields
     the head reads".
   - A build that stops on content: "Diagnose a failed build" (`f:kv3qen`, `f:n07oiu`).
   - Keep it to one or two sentences. Fold it into paragraph 2 if the drafter's intro reads long.

Bounds, after the paragraphs, kept from the plan's items 3 and 4.

- **Prior knowledge (no fact).** SvelteKit routing (rest parameters, param matchers, route groups,
  `+server.ts` endpoints, `+layout.server.ts` loads), its `prerender` and `entries` exports, and
  Vite's `import.meta.glob`. No cairn knowledge is needed beyond the adapter that declares the
  site's concepts.
- **Leaves out, with the page that covers it.** The scope sentence may name the page.
  - The AI-crawler stance in robots.txt: `docs/extend/choose-an-ai-posture.md`.
  - The draft preview route: `docs/extend/share-a-draft-preview.md`.
  - Announcing newly published entries, as opposed to the feeds subscribers pull:
    `docs/extend/act-on-newly-published-entries.md`.
  - Resolving `media:` images: `docs/extend/configure-media.md#resolve-media-on-public-pages`.
  - Styling the pages: `docs/extend/theme-your-public-site.md`.
  - Arranging the admin's own sidebar, which shares the word "nav":
    `docs/extend/arrange-the-admin-sidebar.md`.

## Departures from the plan's introduction

- **Item 1 gains GitHub and Cloudflare placement.** "From the committed content" now rests on
  `f:1mkckz`, with no GitHub read per request and a publish reaching readers through its deploy's
  build. The build target rests on `f:j0ut9n`. Both are new intro facts, and the register asks the
  intro to place GitHub and Cloudflare.
- **Item 2 widens from two readers to the narrower reasons.** It adds a tag page, the public menu,
  the head's limits, and a failed build (`f:k7nln3`, `f:k5uws5`, `f:kv3qen`, `f:n07oiu`), per "A
  page may serve several readers". The map shows readers arriving for each: from
  define-an-adapter-and-schema, from arrange-the-admin-sidebar, and by search. The plan's two
  readers and its contract stand.
- **Item 2's scaffold clause gains its facts.** "Every route but the tag page already exists" now
  cites `f:qtm9y2`, `f:8k9xwm`, `f:70uh8b`, `f:f9aayq`, and `f:ri06xw`. The origin placeholder is
  added (`f:ioh6uj`).
- **Item 4 gains one wrong-place entry.** It adds the admin sidebar
  (`docs/extend/arrange-the-admin-sidebar.md`), whose outline entry names the shared word "nav" as
  the confusion. "Announcing" is worded against the feeds so a pull reader and a push reader
  separate.
