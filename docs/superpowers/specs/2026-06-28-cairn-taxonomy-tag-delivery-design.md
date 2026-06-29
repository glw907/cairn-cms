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
- **Tag URLs are slugified** (`tagSlug`), the Hugo/Jekyll norm, with a build-time slug-collision throw, so
  an arbitrary author value maps to a clean, stable `/topics/web-design` segment that round-trips back to
  the canonical value.
- **No implicit `tags` fallback.** If a concept marks no taxonomy field, it has no tags, even if a `tags`
  frontmatter key exists. The marker is required; this is breaking (see "Breaking change").

## Component 1 — taxonomy resolution (wire the marker to the field)

The defect: `src/lib/delivery/content-index.ts` reads a hardcoded `raw.tags`, so a field named `topics`
marked `taxonomy: true` produces no tags.

- **`resolveTaxonomyField(fieldset)`** returns the name of the **top-level** field marked `taxonomy: true`,
  or `null`. A small pure unit, testable in isolation. It scans top-level fieldset keys only, because that
  is the only level a content-index `raw[name]` read reaches.
- **The content index reads the VALIDATED value, not raw frontmatter.** It reads `result.data[resolvedName]`
  (the value the multiselect validator already coerced to an array, so a hand-authored scalar
  `topics: svelte` yields `["svelte"]`), not `raw[resolvedName]` (which `asTags` would drop on the floor for
  a non-array). `ContentSummary.tags`, `byTag`, and `allTags` are otherwise unchanged: they still operate
  over `ContentSummary.tags`, only its source changes. When `resolveTaxonomyField` returns `null`,
  `ContentSummary.tags` is `[]` for every entry and no tag base or route registers for that concept.
- **One taxonomy per concept, plus no-nested-marker, enforced in `fieldset()`.** The enforcement runs where
  `checkSeoImageFields` runs (the single-`seo`-image rule the Contract v2 spec cites as the model), not in
  `defineConcept` — because `defineConcept` does not iterate fields and a YAML-declared or hand-built
  concept reaches the engine through `normalizeConcepts`/`fieldset()`, never `defineConcept`. `fieldset()`
  fails loud if a concept marks more than one field `taxonomy: true`, and rejects a `taxonomy: true` on a
  field nested inside an `object` or `array` (the single-`seo`-image check already recurses to forbid
  nesting; mirror it). Zero or one top-level marker is legal; zero means that concept has no tag surface.
- **No implicit `tags` fallback, but a build advisory on a likely miss.** If a concept marks no taxonomy
  field, it has no tags, even if a `tags` frontmatter key exists (the marker is required so the delivery
  layer knows which field is the taxonomy). But silent loss violates cairn's fail-loud grain (the phase-3b
  `parseSiteConfig` hard-errors a missing `datePrefix` rather than silently shifting URLs), so when
  `resolveTaxonomyField` returns `null` AND the concept declares a `multiselect` field literally named
  `tags`, `freetags`, or `categories`, the build emits an advisory through the existing `ContentProblem`
  surface (a warning, not a hard throw, since a deliberate non-taxonomy field of that name stays legal),
  naming the concept and the unmarked field.

## Component 2 — first-class tag routing (resolve tag URLs through the catch-all)

Today entries resolve through one catch-all (`SiteResolver.byPermalink`); tags are bolt-on loaders the
site hand-wires at a path the engine cannot validate. This unifies them.

- **One resolution door: `resolveRoute(path)` returns a discriminated `ResolvedRoute`.** The kinds are
  `{ kind: 'entry', … }` (today's `byPermalink` payload), `{ kind: 'tagIndex', concept, tags }` where `tags`
  is the existing `{ tag, count }[]` shape `allTags` returns, or `{ kind: 'tagArchive', concept, tag, entries }`.
  The site's one catch-all `+page` renders by `kind`; rendering stays in the site's hands (design-agnostic
  output), the engine owns only URL-to-data resolution. **This replaces the per-concept loaders**: the old
  `entryLoad`, `tagLoad`, `tagIndexLoad`, and `archiveLoad` on `createPublicRoutes` are removed and folded
  into `resolveRoute`, so there is one door, not two parallel ones with different keys. That removal is a
  public-surface change (see "Breaking change").
- **The tag-value to URL-segment codec (`tagSlug`).** A tag value is arbitrary author text (`Web Design`,
  `C++`, a non-ASCII string), so it cannot be a URL segment verbatim. A named pure `tagSlug(value)` in the
  `url-policy` module produces a lowercase, hyphenated, URL-safe segment (the Hugo/Jekyll norm, giving
  `/topics/web-design`). The resolver builds a per-concept `slug -> value` index from `allTags()`; a tag
  archive resolves its segment back to the canonical tag value through that index, then calls `byTag(value)`.
  Because `tagSlug` is lossy (two values can map to one slug), **the build fails loud if two distinct tag
  values within one concept's taxonomy collide on the same slug**, naming both values. The tag-index page
  links via `tagSlug`.
- **Tag URL policy, zero-config default.** A concept's taxonomy archive base defaults to `/<fieldName>`
  (a `topics` taxonomy serves the index at `/topics` and an archive at `/topics/:slug`), overridable through
  a new `taxonomyBase` field on `ConceptUrlPolicy` (which today carries only `permalink` and `datePrefix`;
  this names the override the design promises). The base derives from the concept's resolved URL policy and
  is itself validated URL-safe at `defineConcept`.
- **Resolution algorithm and prefix-aware collision check.** `resolveRoute` matches an exact entry permalink
  first (the existing `byPath` Map lookup wins; an entry permalink always takes precedence). On a miss, it
  attempts the longest taxonomy-base prefix match, then splits the remainder: no remainder is the `tagIndex`;
  exactly one segment is a `tagArchive` (resolve the slug, 404 if it matches no tag or the tag has no
  non-draft entries, preserving today's `tagLoad` 404); more than one segment is no route (404). The
  build-time collision check is **prefix-aware over the full concrete route set**, not exact-key base-only:
  it registers every entry permalink, every tag-index base, and (so a data-derived archive cannot silently
  shadow an entry) every concrete tag-archive path (`base + '/' + tagSlug(tag)` for each live tag) into one
  path namespace and throws on any overlap — an entry permalink equal to or falling under a tag base, two
  bases that are equal or one prefixing the other, or a concrete archive path equal to an entry permalink.
  This extends `createSiteResolver`'s duplicate-permalink throw to the prefix case it does not cover today.
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

Two breaking changes ship here, each with a `Consumers must` line:

1. **Mark the taxonomy field.** Reading the marked field instead of the hardcoded `tags` key is breaking.
   *Consumers must:* mark the taxonomy field with `taxonomy: true`, or the field's values stop producing
   tags. The default tag base is the field *name*, so a site that wants to keep its current tag URLs (for
   example ecxc-ski serves `/tags` and `/tags/:tag` today through hand-wired routes) must either name the
   taxonomy field `tags` or set an explicit `taxonomyBase`. This only bites a site once it is on the v2
   adapter and uses tags, and it dovetails with the existing watch to transcribe site URL policies into
   `defineConcept` at the v2 cutover; fold the tag-base transcription into that watch, and delete the site's
   hand-wired tag routes in favor of the catch-all kind at cutover (the engine collision check is blind to a
   consumer's hand-wired SvelteKit routes, so two resolvers for one path is otherwise undetected).
2. **Branch the catch-all by kind.** Removing the per-concept loaders and returning a discriminated
   `ResolvedRoute` from `resolveRoute` reshapes the public-routes contract. *Consumers must:* call
   `resolveRoute` from the catch-all `+page.server.ts` and branch the `+page.svelte` on `data.kind` (entry,
   tagIndex, tagArchive) instead of destructuring an entry payload directly. The removed `entryLoad`,
   `tagLoad`, `tagIndexLoad`, and `archiveLoad` exports drift the `check:surface` snapshot, which is the
   disclosure, and their reference pages and signatures update with them.

Both ship under one minor. The version is **the first free minor after the held `0.77.0` publishes** (the
extensibility redesign holds `0.77.0`; verify the chosen number is free with
`npm view @glw907/cairn-cms versions` before promising it). Each breaking change gets its `Consumers must`
CHANGELOG block and a per-version `## <version>: <title>` section in `docs/guides/upgrade-cairn.md`.

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

- **Unit — taxonomy resolution.** `resolveTaxonomyField` returns the top-level marked field; the
  one-per-concept enforcement throws (`expect().toThrow`) on two markers and on a nested marker, and passes
  on zero or one; the content index reads the marked field's validated value, so a scalar `topics: svelte`
  produces one tag and an unmarked field produces none even with a `tags` key present; **and a `topics`-marked
  field beside a legacy `tags:` key produces only the `topics` values** (proving the hardcoded read is gone,
  not merely supplemented); the unmarked-but-`tags`-named-field build advisory fires.
- **Unit — routing.** `resolveRoute` resolves each `ResolvedRoute` kind; an exact entry permalink wins over a
  tag-base prefix; a `/base/:slug` for an unknown tag or a tag with no non-draft entries 404s rather than
  rendering an empty archive; a `>1`-segment path under a base is no route; `tagSlug` round-trips and the
  per-concept slug→value lookup resolves; the **slug-collision build throw** fires on two values mapping to
  one slug; the **prefix-aware collision throw** fires on an entry permalink falling under a tag base.
- **Unit — feeds.** Feed categories populated from the marked field (and omitted, not emitted empty, when an
  entry has none); the `inFeeds`/`routable` views over a mixed fixture (a `feed` concept, a `page` concept, an
  `embedded` concept): `feedView` returns only the feed concept's items, `sitemapView` returns the feed and
  page URLs but not the embedded concept's.
- **Showcase.** Mark a concept's taxonomy field (the showcase Posts concept gains a `topics` taxonomy),
  prove the tag index and a tag archive render through the catch-all (`resolveRoute` + render-by-kind), and the
  feed carries categories. The prerender enumeration must include the tag paths (see Gates).
- **e2e.** One spec: a tag archive page renders with its entries.
- **Gates.** The new exports drift the `check:surface` snapshot (regenerate-to-disclose) and need reference
  pages with stability tiers (Extension API for the delivery types a public page calls). `check:reference`,
  `check:reference:signatures`, and `check:docs` stay green.

## Plan split (two plans, along verification surfaces)

- **Plan 1 — taxonomy core and feeds (data layer).** Components 1 and 3: `resolveTaxonomyField`
  (top-level, validated-value read), the one-per-concept and no-nested enforcement in `fieldset()`, the
  unmarked-`tags`-field build advisory, feed categories, and the `inFeeds`/`routable` views. Build-time and
  data, cleanly unit-testable, additive and contained. Includes the reference-prose doc fix.
- **Plan 2 — first-class tag routing (read path).** Component 2: the `tagSlug` codec and per-concept
  slug→value index with the slug-collision throw, the `taxonomyBase` `ConceptUrlPolicy` field, the
  `resolveRoute` discriminated resolver with the exact-then-prefix algorithm and the prefix-aware collision
  throw, the URL single-home consolidation, the removal of the per-concept loaders, the prerender
  enumeration (extend `SiteResolver.entries()` to include each taxonomy index base plus each concrete
  `base + '/' + tagSlug(tag)` archive path so the catch-all prerenders the tag pages), the showcase
  catch-all wiring, and the e2e. Higher blast radius (the public-routes contract). Includes the two
  test-infra riders (the `delivery-*` cold-import flake and the spellcheck e2e flake) since the pass is in
  that surface.

Plan 2 depends on Plan 1 (the tag index it routes to). The release is one minor covering both, cut after
Plan 2 lands.

## Adversarial review folded (2026-06-28)

A five-lens workflow (charter, architecture, routing, breaking-change, tests) raised 30 findings;
per-finding refutation confirmed 18 and refuted 12 (documentation-completeness nits and one misread that
sites call `byPermalink` directly — they call the loaders). The confirmed findings, folded above:

- **The tag value to URL-segment mapping was undefined** (the central gap): now the `tagSlug` codec, the
  per-concept slug→value index, and the slug-collision build throw (Component 2).
- **The collision check was exact-key base-only**, which misses an entry permalink shadowed by a
  data-derived archive path: now prefix-aware over the full concrete route set, with a defined
  exact-then-prefix resolution algorithm and entry precedence (Component 2).
- **The index read raw frontmatter**, dropping a scalar taxonomy value: now reads the validated value
  (Component 1).
- **`resolveTaxonomyField`/enforcement layer**: now top-level only, rejects a nested marker, and runs in
  `fieldset()` (the true mirror of the single-`seo` rule, covering YAML/hand-built concepts), not
  `defineConcept` (Component 1).
- **Silent tag loss** on an unmarked field: now a build advisory (Component 1).
- **The discriminated resolver reshaped the loader contract** and left two doors: now `resolveRoute`
  replaces the per-concept loaders, documented as a `Consumers must` (Breaking change).
- **The prerender enumeration omitted tag paths**: now `entries()` includes them (Plan 2).
- **`ConceptUrlPolicy` had no override field** for the promised tag-base override: now `taxonomyBase`
  (Component 2).
- **Test gaps**: the discriminating breaking-change case, the empty/unknown-tag 404, draft exclusion, the
  mixed-concept view fixture, and the slug/prefix collision throws are now named (Testing).
- **Version and live-site migration**: the target is the first free minor after `0.77.0`, the tag base is
  the field name (live-site URL implication noted), and hand-wired tag routes are deleted at cutover
  (Breaking change).

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
