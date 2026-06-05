# Surface-narrowing Design: pass 1 of the engine-hardening series

**Status:** approved 2026-06-05, ready to plan.

**Goal.** Narrow the public export surface so the `.` root and `/sveltekit` stop re-exporting another
subpath's symbols and the internal plumbing stops appearing as public API. Each public symbol gets one
canonical home, so the reference documents it once and the `create-cairn-site` scaffolder templates a
deliberate surface rather than the accidental wide one.

## Context

This is pass 1 of a three-pass engine-hardening series the documentation initiative surfaced, gated to
land before the next `0.x` publish (see the `cairn-engine-hardening-release-gate` memory and `ROADMAP.md`).
The series runs just-in-time: surface-narrowing first (it gates P4, the scaffolder), then render
attribute-sink hardening, then URL-identity consolidation. Each pass is brainstormed and planned on its
own. Surface-narrowing is sequenced first because the scaffolder must emit imports against the narrowed
surface.

## The problem

The P1 delivery read-model pass made the `.` root a superset that re-exports the entire `/delivery` read
surface, on the rationale that a wrong guess from root would still resolve. The same era left `/sveltekit`
re-exporting the public route surface that the route loaders define, which forced a `ListData as
PublicListData` alias to dodge a name collision with the admin `ListData`. The root also exports internal
GitHub plumbing, signing helpers, and hast helpers. Three costs follow. The `.` root carries 174 names.
Delivery symbols document on two reference pages. Internal helpers read as public API a consumer might
depend on.

## The key finding (blast radius)

Both production sites (ecnordic-ski, 907-life) were audited import by import. They import from the `.` root
only engine-authoring symbols: `defineAdapter`, `defineFields`, `createRenderer`, `defineRegistry`,
`composeRuntime`, `urlPolicyFrom`, `parseSiteConfig`, `extractMenu`, `glyph`, `parseMarkdown`,
`verifyManifest`, and the `Editor`/`AuthEnv` types. They read the delivery surface from `/delivery` and the
admin routes from `/sveltekit`. Neither site imports the delivery read surface from root, the internal
plumbing from anywhere, or the public route types from `/sveltekit` (the `ListData` they import from
`/sveltekit` is the admin one from `content-routes`). So the narrowing below is zero-impact on both sites.
It is breaking only for a hypothetical external consumer that took the redundant path, which a `Consumers
must:` changelog line covers.

The engine mints GitHub tokens through a built-in default (`content-routes.ts` falls back to
`cachedInstallationToken(appCredentials(runtime.backend, env))` when a consumer passes no `mintToken`), so
no consumer imports the signing or GitHub-REST helpers. They are internal.

## The design: three moves

### 1. Drop the delivery read surface from the `.` root

Remove from `src/lib/index.ts`:

- Data builders: `createContentIndex`, `fromGlob`, `createSiteIndex`, `createSiteIndexes`, `deriveExcerpt`,
  `wordCount`, `buildRssFeed`, `buildJsonFeed`, `buildSitemap`, `buildRobots`, `buildSeoMeta`,
  `readSeoFields`, `resolveImageUrl`, `paginate`, `permalink`, and their types (`RawFile`,
  `ContentSummary`, `ContentEntry`, `ContentIndex`, `ContentProblem`, `SiteIndex`, `ConceptIndex`,
  `SiteIndexes`, `SiteGlobs`, `FeedChannel`, `FeedItem`, `SitemapUrl`, `SeoInput`, `SeoMeta`, `SeoFields`,
  `Page`).
- Route surface: `rssResponse`, `jsonFeedResponse`, `sitemapResponse`, `robotsResponse`,
  `createPublicRoutes`, and the public route types `PublicRoutesDeps`, `ListData`, `TagData`,
  `TagIndexData`, `EntryData`.

Canonical homes after the move: the pure projections resolve from `/delivery/data`, and the route loaders
and response helpers from `/delivery`. Keep on root the manifest operations including `verifyManifest`
(both sites import it from root; it is content-model, not delivery-read).

### 2. Drop the internal plumbing from the `.` root

Remove the GitHub REST helpers (`treeUrl`, `contentsUrl`, `readRaw`, `fileSha`, `listMarkdown`,
`markdownFilesIn`, `commitFile`), the signing helpers (`appJwt`, `installationToken`, `signingSelfTest`,
`appCredentials`, and `GithubKeyEnv` if no public type still references it), and the internal hast helpers
(`isElement`, `strProp`, `markFirstList`). Keep the component-author helpers a site legitimately uses
(`iconSpan`, `cardShell`, `headRow`, `glyph`, `MakeIcon`, `rehypeDispatch`). Keep the GitHub types
(`RepoRef`, `RepoFile`, `CommitAuthor`, `AppCredentials`) and `CommitConflictError`, which are type-only or
a catchable error a custom backend or a save-site may want.

The engine's own internal modules import these helpers through relative paths, not through the public
barrel, so dropping them from `index.ts` does not affect internal use.

### 3. Stop `/sveltekit` re-exporting the public route surface

Remove `createPublicRoutes` and the public route types (`PublicRoutesDeps`, `ListData as PublicListData`,
`TagData`, `TagIndexData`, `EntryData`) from `src/lib/sveltekit/index.ts`. They resolve only from
`/delivery`. The `ListData as PublicListData` alias goes away, and the remaining `/sveltekit` `ListData` is
the admin list type, which is what both sites import. `public-routes.ts` stays physically under
`sveltekit/`, since the reference documents by subpath and `/delivery` already re-exports it from there; no
file move is needed.

## What stays on the `.` root

The engine-authoring and content-model surface: `requireOrigin`; the auth types and the email helpers; the
adapter and concept types; `normalizeConcepts`, `findConcept`, `CONCEPT_ROUTING`; `composeRuntime` and
`ComposeInput`; the frontmatter helpers; `defineFields`, `defineAdapter`, and the schema types; the id
helpers; the `cairn:` link grammar and the manifest operations including `verifyManifest`; the render
registry, component grammar, validation, insert, reference, `glyph`, `remarkDirectiveStamp`, the
component-author hast helpers, and `createRenderer`; the GitHub types and `CommitConflictError`; and the
nav and site-config surface (`parseSiteConfig`, `urlPolicyFrom`, `extractMenu`, `setMenu`,
`validateNavTree`, and the rest).

## Verification

- `npm run check:reference` (the Phase 2 export-coverage gate) enforces that the seven reference pages
  match the narrowed surface; the gate fails on any documented name that no longer exports and on any new
  export with no page. The reference pages update in the same pass per the docs-as-pass-dimension rule.
- `npm run check` is 0 errors and 0 warnings, and `npm test` exits 0 on the engine.
- The acceptance proof is both production sites building green against the narrowed package, checked with
  an `npm pack` tarball install (the method the Phase 5 reproduction used), since the registry-published
  package is what a site consumes. Each site's own `check` and production build run against the tarball.

## Migration

Breaking for external consumers only. `CHANGELOG.md` carries `Consumers must:` lines, one per move:
import the delivery read symbols (the data builders, the feed and sitemap and robots builders, the SEO and
pagination helpers) from `/delivery/data`; import the route loaders, the `*Response` helpers, and the
public route types from `/delivery`, not the `.` root; and import `createPublicRoutes` and the public route
types from `/delivery`, not `/sveltekit`. `docs/upgrading.md` gets the same lines. The version bump is a
minor under the `0.x` breaks-between-minors policy.

## Out of scope

The two other hardening passes (render attribute-sink hardening, URL-identity consolidation), which run as
their own passes next. The Bucket B DX riders: `mintToken` type widening to `string | Promise<string>` is a
trivial standalone handled outside this pass, and the `App.Locals.editor` type is deferred to P4 as a
scaffolder emit rather than a global augmentation shipped from the library, since a library augmenting
`App.Locals` globally is surprising and can conflict. No physical relocation of `public-routes.ts`. No
change to what each subpath's symbols do, only to where they are exported from.

## Acceptance

The `.` root and `/sveltekit` no longer re-export another subpath's symbols, the internal plumbing is off
the public surface, the `PublicListData` alias is gone, the reference coverage gate is green against the
narrowed surface, the engine gate is green, and both production sites build green against the narrowed
package. With this pass landed, the render attribute-sink hardening pass is next, and the surface is ready
for P4 to template.
