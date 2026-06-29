# Taxonomy and tag delivery — design

**Status:** approved design, queued for implementation as two plans. Supersedes the ROADMAP "Taxonomy and
tag delivery" Next-tier item, which this realizes.

**Goal:** Consume the reserved `taxonomy` marker so a concept's tags drive first-class tag pages, a tag
index, tag-aware delivery resolution, and syndication-feed categories, and close the half-built
`inFeeds`/`routable` feed and sitemap contract along the way. The engine ships the tag *surface* already
(`byTag`, `allTags`, `tagLoad`, `tagIndexLoad`, `FeedItem.tags`); it is wired to a hardcoded `tags`
frontmatter key and the reserved marker is inert. This pass connects the marker to the surface and makes
tag routing first-class.

## Premise check (charter first)

This is cairn's job. Tags are a content-delivery concern over the committed markdown, resolved build-time
over the content index, with no runtime store. The pass adds no actor, no auth, and no domain model. The
`taxonomy` marker, the latent `byTag`/`allTags`/`tagLoad`/`tagIndexLoad`/`FeedItem.tags` surface, and the
Contract v2 spec text were all left in place deliberately for this pass
(`docs/superpowers/plans/2026-06-26-cairn-contract-v2-references.md:57,470`). It also fits the markdown-git
idiom the comparable static generators use: tags are frontmatter strings indexed at build time, not
runtime entities. It passes the premise check.

## Glossary (fixed; used in code, docs, and routes)

- **taxonomy** — the mechanism: a concept's single multiselect field marked `taxonomy: true`. A concept
  has at most one taxonomy. This is the marker name already shipped on `MultiselectField`, so no surface
  churn.
- **tag** — a single value within that field. The value word at every level: a post's tags, `byTag`, the
  tag index (all tags with counts), a tag archive (the page for one tag). Matches every existing `tag*`
  symbol, so nothing is renamed.
- **category** — not a cairn concept. It appears only as an output-format mapping: a tag becomes an RSS
  `<category>` and a JSON Feed `tags` entry. Documented as a format detail, never used as a cairn-level
  term.
- **term** — not used. Hugo's formal word; "tag" is more intuitive for non-technical authors.

A *taxonomy* (the field) holds *tags* (the values); tags drive the tag index, tag archives, and feed
categories. One word per level, no parallel kinds. cairn avoids Hugo's `tags`-vs-`categories` confusion
structurally: at most one taxonomy per concept, and the site names the field itself.

## Decisions settled (no open questions)

- **Source: the multiselect `taxonomy: true` marker only.** The string model the markdown-git generators
  use, and the lean form. A reference-shaped tag (a tag as its own content entry with metadata) is the
  WordPress/headless entity model, heavier and against cairn's fixed-concept grain; it is a possible later
  pass, not this one.
- **Routing: the engine resolves tag URLs first-class**, through the same catch-all that resolves entry
  permalinks. Not consumer-wired loaders.
- **Feeds: categories from the taxonomy field, plus the `inFeeds`/`routable` engine views.** Per-tag RSS
  is deferred.
- **No implicit `tags` fallback.** If a concept marks no taxonomy field, it has no tags, even if a `tags`
  frontmatter key exists. The marker is required; this is breaking (see "Breaking change").

## Component 1 — taxonomy resolution (wire the marker to the field)

The defect: `src/lib/delivery/content-index.ts` reads a hardcoded `raw.tags`, so a field named `topics`
marked `taxonomy: true` produces no tags.

- **`resolveTaxonomyField(fieldset)`** returns the name of the field marked `taxonomy: true`, or `null`.
  A small pure unit, testable in isolation.
- The content index reads `raw[resolvedName]` through the existing `asTags`, instead of the literal
  `tags`. `ContentSummary.tags`, `byTag`, and `allTags` are otherwise unchanged: they still operate over
  `ContentSummary.tags`, only its *source* changes.
- **One taxonomy per concept, enforced at build.** `defineConcept` validation fails loud if a concept
  marks more than one field `taxonomy: true`, mirroring the single-`seo`-image rule the Contract v2 spec
  cites. Zero or one is legal; zero means that concept has no tag surface.
- **No implicit fallback** (see above). The spec already states the marker is required so the delivery
  layer knows which field is the taxonomy.

## Component 2 — first-class tag routing (resolve tag URLs through the catch-all)

Today entries resolve through one catch-all (`SiteResolver.byPermalink`); tags are bolt-on loaders the
site hand-wires at a path the engine cannot validate. This unifies them.

- **`byPermalink(path)` returns a discriminated `ResolvedRoute`:** `{ kind: 'entry', … }` (today's shape),
  `{ kind: 'tagIndex', concept, tags }`, or `{ kind: 'tagArchive', concept, tag, entries }`. The site's one
  catch-all `+page` renders by `kind`. Rendering stays in the site's hands, so public output remains
  design-agnostic; the engine owns only the URL-to-data resolution. This is the "tag-aware delivery
  resolution" the ROADMAP names.
- **Tag URL policy, zero-config default.** A concept's taxonomy archive base defaults to `/<fieldName>`
  (a `topics` taxonomy serves the index at `/topics` and an archive at `/topics/:tag`), overridable in the
  concept's URL policy. The resolver registers each concept's tag base alongside its entry permalinks and
  **fails the build on a collision** (a tag base clashing with an entry permalink or another taxonomy
  base), extending the duplicate-permalink throw `createSiteResolver` already has.
- **URL single home (folded friction item).** All URL shaping — entry permalink interpolation, date-prefix
  slug stripping, and now tag base construction plus tag-path parsing — moves into one `url-policy` module,
  so the friction log's "one URL assembled from three places" becomes one home and the new tag URL does not
  add a fourth. `permalink.ts`, the `datePrefix` slug logic in `identity.ts`, and the new tag-path logic
  consolidate there; their public behavior is unchanged.

## Component 3 — feeds and sitemap

- **Feed categories from the taxonomy field.** `FeedItem.tags` (present, never populated) is filled from
  the marked field's values, emitted as RSS `<category>` and JSON Feed `tags`. That mapping is the only
  appearance of "category", documented as a format detail.
- **Engine feed and sitemap views (folded friction item).** The half-built `inFeeds`/`routable` contract
  becomes load-bearing: a `feedView` returns the items for the `inFeeds` concepts and a `sitemapView`
  returns the URLs for the `routable` concepts, so a site stops re-deriving concept membership by hand. The
  `buildRssFeed`/`buildJsonFeed`/`buildSitemap` builders stay pure; the views are the concept-filtered
  inputs to them.
- **Per-tag RSS deferred.** A tag's own feed (`/topics/svelte/feed`) is a clean later add; the core is tag
  pages, categories, and the concept-filtered views (YAGNI).

## Breaking change and migration

Reading the marked field instead of the hardcoded `tags` key is breaking. **Consumers must:** mark the
taxonomy field with `taxonomy: true`, or the field's values stop producing tags. This only bites a site
once it is on the v2 adapter and uses tags, and it dovetails with the existing watch to transcribe site URL
policies into `defineConcept` at the v2 cutover. It ships under one minor with a CHANGELOG entry and an
upgrade-guide note.

## Friction items folded (confirmed scope)

- **URL single home** — Component 2 (coupled to owning tag routes).
- **Reference prose drift** — `sveltekit.md`/`admin-routes.md` describe a `mintToken` dep on
  `createCairnAdmin`/`createContentRoutes` that the type no longer carries; corrected while in the
  reference arm. `check:surface` deliberately does not gate prose, so this is the right moment.
- **`delivery-*` cold-import spawn flake** — the `delivery-data-dist-spawn` cold-import specs time out under
  full-suite concurrent IO; serialize them into their own non-concurrent Vitest project while in the
  delivery test surface.
- **Spellcheck e2e flake** — `examples/showcase/e2e/spellcheck.spec.ts` asserts `toHaveCount(2)` before the
  CodeMirror lint decorations settle; replace with a settle-aware assertion (poll or `toPass`). A
  release-health rider, orthogonal to taxonomy but high value before the releases this work ships under.

## Testing

- **Unit.** `resolveTaxonomyField` and the one-per-concept build-time enforcement; the content index reading
  the marked field (a `topics` field produces tags; an unmarked field produces none even with a `tags` key
  present); `byPermalink` resolving each `ResolvedRoute` kind; the tag-base collision throw; feed categories
  populated from the marked field; the `inFeeds`/`routable` views returning the right concept sets.
- **Showcase.** Mark a concept's taxonomy field (the showcase Posts concept gains a `topics` taxonomy),
  prove the tag index and a tag archive render through the catch-all, and the feed carries categories.
- **e2e.** One spec: a tag archive page renders with its entries.
- **Gates.** The new exports drift the `check:surface` snapshot (regenerate-to-disclose) and need reference
  pages with stability tiers (Extension API for the delivery types a public page calls). `check:reference`,
  `check:reference:signatures`, and `check:docs` stay green.

## Plan split (two plans, along verification surfaces)

- **Plan 1 — taxonomy core and feeds (data layer).** Components 1 and 3: the marker resolution, the
  one-per-concept enforcement, the content index reading the marked field, feed categories, and the
  `inFeeds`/`routable` views. Build-time and data, cleanly unit-testable, additive and contained. Includes
  the reference-prose doc fix.
- **Plan 2 — first-class tag routing (read path).** Component 2: the discriminated `ResolvedRoute`, the URL
  single-home consolidation, the tag URL policy and collision throw, the showcase catch-all wiring, and the
  e2e. Higher blast radius (the public-routes contract). Includes the two test-infra riders (the
  `delivery-*` cold-import flake and the spellcheck e2e flake) since the pass is in that surface.

Plan 2 depends on Plan 1 (the tag index it routes to). The release is one minor covering both, cut after
Plan 2 lands.

## Out of scope

- Reference-shaped tags (a tag as its own content entry). The heavier entity model; a possible later pass
  if a production site needs tag-level metadata.
- Per-tag RSS/JSON feeds.
- Tag membership in the committed manifest. The tag surface stays content-index-only (glob-built at build
  time), as it is today; no `ManifestEntry` taxonomy field unless an admin "what's tagged X" need appears.
- Multiple taxonomies per concept. At most one, enforced.
- Editor-managed tag lists or a tag-admin screen. Tags are authored in the multiselect field; no new admin
  surface.

## Diagnostic coverage of the ROADMAP item

The ROADMAP item asks for "a tag index, a per-tag archive, and tag-aware delivery resolution," plus
"feeds." Each is answered: the tag index (Component 1 surface + Component 2 `tagIndex` route), the per-tag
archive (Component 2 `tagArchive` route), tag-aware delivery resolution (Component 2's discriminated
`byPermalink`), and feed categories plus the `inFeeds`/`routable` views (Component 3). The "reference-shaped
tag field" phrasing in the ROADMAP is deliberately narrowed to the multiselect marker for this pass, per
the source decision above.
