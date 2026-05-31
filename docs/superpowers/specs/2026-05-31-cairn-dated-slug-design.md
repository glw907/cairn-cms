# Cairn rebuild: dated-slug identity (design)

Status: approved design, pre-plan. Authored 2026-05-31.

This design gives dated content concepts a split identity so recurring titles get clean,
unique URLs, and it moves a site's URL policy into the admin-editable YAML config under a
static-site-generator model. It supplements the functional spec at
`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`, which holds the locked
architecture, and the public-delivery design at
`docs/superpowers/specs/2026-05-30-cairn-public-delivery-design.md`, which landed the read
side. It ships as engine version `0.8.0`. The numbered plan derived from this design lands
under `docs/superpowers/plans/`; its number is settled at planning time.

## Why this design exists

The public-delivery layer decoupled id, date, and URL by intent. The id is the filename stem,
the date is frontmatter-canonical, and the URL is pattern-driven through a per-concept
`permalink`. One asymmetry survived that decoupling, and it breaks dated URLs.

Today the `:slug` permalink token resolves to the full id. For a dated concept whose file is
`2026-05-31-snowball-race-report.md`, a dated pattern such as `/:year/:month/:day/:slug`
produces `/2026/05/31/2026-05-31-snowball-race-report`. The date appears twice. The router
makes it worse: `entryLoad` resolves only a flat `:slug` through `index.byId()`, so a dated
pattern never resolves at all. URL generation and URL resolution disagree about shape.

The date prefix on a filename is not optional decoration. Recurring titles are common on a real
site. 907 publishes a yearly "Service Snowball Race Report", and two posts that share a title in
different years collide on a date-free filename. The prefix keeps filenames unique and sortable.
So the fix derives the URL slug from the filename rather than reusing the whole stem, and
resolves a public URL by matching the pattern it was generated from.

## The identity model

A dated content entry carries three related values, each with one canonical home.

- **id** is the full filename stem, including any leading date prefix. Example:
  `2026-05-31-snowball-race-report`. The id is the permanent identity. Admin edit routes and the
  storage path key on it. This is unchanged from 0.7.0.
- **slug** is the id with its leading date prefix stripped, for a dated concept only. Example:
  `snowball-race-report`. The `:slug` permalink token resolves to the slug, not the id. For a
  non-dated concept such as Pages, the slug equals the id.
- **date** is read from frontmatter and is canonical. The filename date is a disambiguator and
  the admin sort key. It is never the source of truth for the URL or the displayed date.

### The date-prefix granularity knob

The two reference sites use different filename date formats, so the prefix length is a
per-concept setting rather than a fixed `YYYY-MM-DD`. 907 names files `2025-01-10-winter.md` and
serves `/2025/01/10/winter`. ecnordic names files `2026-05-welcome.md` and serves
`/2026/05/welcome`. The setting is `datePrefix`, with values `year`, `month`, or `day`,
defaulting to `day`.

`datePrefix` drives both halves of the identity:

- **Read.** Slug derivation strips exactly the configured number of leading date segments. A
  `month` concept strips `^\d{4}-\d{2}-`; a `day` concept strips `^\d{4}-\d{2}-\d{2}-`. The strip
  applies only to a dated concept, and only when the prefix is present, so a dated concept whose
  files carry no prefix yields `slug === id` and keeps working.
- **Write.** Create composes the filename by truncating the chosen date to the configured
  granularity and prepending it. A `month` concept composes `2026-06-summer.md`; a `day` concept
  composes `2026-06-15-summer.md`. The frontmatter `date` keeps full precision regardless, so the
  filename is a coarser view of the canonical date.

### Why no auto-rename on a date edit

Editing a post's frontmatter date does not rename its file. The filename date and the frontmatter
date may drift, and that drift is harmless by construction. The reasoning, so the decision carries
it:

- A rename buys no URL correctness. The URL slug segment is the title part of the stem, which a
  date-only rename leaves untouched, and the URL date segments read frontmatter either way. So
  syncing the filename to an edited date changes nothing a reader sees.
- A rename changes the id. The id keys the admin edit route the author is editing and the open
  edit session. Renaming mid-edit 404s the author's own route on reload and breaks any deep link
  to the old id.
- A rename fights the commit pipeline. `commitFile` is a single-file PUT against a known blob SHA
  with a 409 fail-safe. A move is not a git primitive over the contents API, and the safe form
  needs a different write path (see the deferred lifecycle pass).
- A rename muddies history. A date typo fix should read as a one-line frontmatter diff, not a file
  move that scatters a post's history across names.

The only thing the filename date drives is admin directory sort order, and date corrections are
rare. If true-date admin ordering ever matters, the cheap fix sorts the admin list by the
frontmatter date from the index rather than by the filename id.

## Where URL policy lives

cairn compiles a site the way a static-site generator does. The markdown files in git are inputs.
The served URL for an entry is computed at build time from a permalink pattern plus the entry's
frontmatter. Changing the pattern and rebuilding moves the served URLs while the source files sit
unchanged. This is the Hugo `permalinks` model.

That model puts URL policy in the admin-editable YAML site-config, not the code adapter. A
concept's URL policy is `permalink` and `datePrefix`, and both move into a per-concept section of
the YAML file that already holds `siteName` and the nav menus, read at build time.

```yaml
siteName: ecnordic
menus:
  primary: [...]
content:
  posts:
    permalink: /:year/:month/:slug
    datePrefix: month
  pages:
    permalink: /:slug
```

The split between the code adapter and the YAML config follows what each value is.

- The **adapter** keeps the structural, type-bearing, behavioral half of a concept: `dir`, the
  `fields` union, `validate`, and `render`. These need TypeScript and cannot be expressed as
  plain data an admin edits.
- The **YAML** holds the URL policy, which is safe data a site owner controls. An admin edit
  commits through the same pipeline as nav and triggers a rebuild that recomputes the URLs.

A concept therefore reads as "what it is" in code and "how it is served" in config. The engine's
concept normalization merges the two into one `ConceptDescriptor` at build time. When the YAML
omits a concept's URL policy, the engine applies a documented default: `/:slug` for Pages and
`/<concept>/:slug` otherwise. A dated concept that relies on the default and has recurring titles
trips the collision guard below, which is the signal to set an explicit dated pattern.

The web UI to edit these settings is deferred to a later settings-editor pass, the way nav editing
was its own pass. For 0.8.0 the values are authored in the YAML directly at scaffold and migration
time. The config already lives in its final home, so adding the editor later needs no contract
change.

## Public routing as a compile step, unified across concepts

The router stops resolving a single `:slug` param and starts matching the request path against
precomputed permalinks, across every concept at once. This is what lets a site prerender to static
HTML through one catch-all route.

The engine's public delivery is per-concept today: `createContentIndex(files, descriptor)` builds
one concept's index, and the 0.7.0 routes factory closes over one concept's index. A catch-all that
resolves any URL across Posts, Pages, and future concepts needs a site-level resolver over all of
them, and that resolver does not exist yet. This pass adds it. The change is low-risk because the
per-concept public layer has no consumer; only tests call it.

The per-concept index stays the building block. It keeps its own dated sort, drafts, tags, and
adjacency. A new site-level content index aggregates the per-concept indexes and adds the
cross-concept surface the catch-all needs. It attaches at the runtime aggregation point,
`CairnRuntime`, which already folds every concept into one `concepts` list and holds the one shared
`render`. So the unified resolver lives where the site is already composed.

The site-level index adds two things:

- `byPermalink(path)`, an O(1) lookup over a permalink-to-entry map unioned across all concepts. Each
  entry's baked `permalink` is its key, so a Pages URL and a Posts URL resolve through one map.
- A prerender enumeration that returns the full path of every entry across every concept, so the
  prerenderer emits each static page from one list.

`entryLoad` resolves by the normalized request path, `event.url.pathname`, through the site index's
`byPermalink`, rather than by `event.params.slug` against one concept. Normalization strips a
trailing slash so the match is stable under SvelteKit's `trailingSlash` setting. Because resolution
keys on the whole path against the unified map, a site needs only one catch-all public route,
`src/routes/[...path]/+page.ts`. That single route serves Posts, Pages, and any future concept. The
per-token route folders both sites run today (`[year]/[month]/[day]/[slug]`) are an artifact of how
they were hand-built; each site replaces its folder tree with the one catch-all shim when it
migrates, and the scaffolder generates that shim.

The per-concept list surfaces stay per-concept, because they are concept-scoped: a Posts archive, a
Posts tag page, and a Posts feed each read one concept's index. Only entry resolution and the sitemap
go site-wide, since a single URL can land on any concept and the sitemap lists every URL.

The slug derivation and the router are the two halves that must agree. `permalink()` writes the
date-stripped slug into the `:slug` token, and `byPermalink()` reads the same generated string back.
No separate reverse parser exists to drift out of sync.

## Collision safety

At index build, if two entries compute the same permalink, the build throws with an error naming
both ids and the shared permalink. The check is site-wide, since the unified `byPermalink` map keys
on permalink across every concept and cannot hold two entries at one key. This matches `permalink()`'s
existing fail-loud behavior on an unknown token or a missing date. It catches a dated concept on a
flat `/:slug` pattern with two same-titled posts, and it catches a page and a post that resolve to
the same URL. A loud build failure beats a silent 404 when someone later hits the shadowed URL.

## Admin create for dated concepts

Creating a dated entry composes the filename from a date and a date-free slug.

- The create form shows a date input for a dated concept, pre-filled with today and editable. The
  author picks a date-free slug as before, for example `snowball-race-report`.
- The engine composes the id by truncating the chosen date to the concept's `datePrefix` and
  prepending it, then writes the frontmatter `date` at full precision. A `month` concept yields
  `2026-06-snowball-race-report`; a `day` concept yields `2026-06-15-snowball-race-report`. The
  composed id passes `isValidId`, which already accepts digits and hyphens.
- The typed slug is validated as date-free. A slug that carries its own leading date-like prefix
  bounces with a hint to use the date field, so the date is not doubled into the stem.
- A non-dated concept such as Pages is unchanged: the slug is the id, and no date is composed.

The existing clobber guard still runs. The composed path is read before the create redirect, and an
existing file at that path bounces with a duplicate-slug error.

## Contract and type changes

- `ConceptConfig` loses `permalink`. URL policy moves to the YAML config. The adapter keeps `dir`,
  `fields`, `validate`, and the site `render`.
- The YAML site-config gains a `content` section keyed by concept id, each carrying `permalink` and
  an optional `datePrefix`.
- `ConceptDescriptor`, the normalized engine view, carries the resolved `permalink` and
  `datePrefix`, merged from the adapter structure and the YAML policy.
- `ContentSummary` and `ContentEntry` gain a `slug` field, computed at index build, so a template
  can build a canonical or Open Graph URL from the slug without re-deriving it.
- The slug-derivation helper lives in the content layer beside the id helpers, parameterized by
  `datePrefix`. The index computes `slug` once per entry and passes it to `permalink()`, which reads
  the slug rather than re-deriving it.
- A site-level content index aggregates the per-concept indexes and exposes `byPermalink(path)`, the
  cross-concept prerender enumeration, and the site-wide sitemap source. It is built from the
  `CairnRuntime` concepts and the per-concept globs. `createContentIndex` stays the per-concept
  building block.
- The public routes factory moves from per-concept to site-level. It closes over the site index and
  returns the catch-all `entryLoad` and prerender `entries`, plus the per-concept archive, tag, and
  feed loaders keyed by concept. The 0.7.0 per-concept `createPublicRoutes` shape is replaced, and it
  has no consumer to migrate.

## Backward compatibility and site impact

Neither live site runs the 0.7.0 delivery surface yet, so no deployed cairn permalink behavior
constrains this change. Each site adopts the delivery surface, this identity model, and the catch-all
route together when it migrates to `^0.8.0`.

- **907** keeps its `YYYY-MM-DD` filenames and its `/:year/:month/:day/:slug` URLs with zero
  redirects. Its YAML sets `datePrefix: day`, and the date-stripped slug removes the doubling that
  0.7.0 would have produced.
- **ecnordic** keeps its `YYYY-MM` filenames and its `/:year/:month/:slug` URLs. Its YAML sets
  `datePrefix: month`, and the month-length strip yields the right slug.

Both sites replace their per-token route folders with a single `[...path]` shim during the migration.
The migrations are not part of this pass. Each is its own `site-pass`, run from the site repo,
consuming `^0.8.0`.

## Out of scope, and two deferred passes

**Content lifecycle.** Renaming and deleting an existing entry stay out of 0.8.0. The leading
comparable confirms the shape: Sveltia CMS, the modern Decap successor, derives the filename from a
field at creation and treats it as the identity, exactly as cairn does, and renaming an existing
entry's file is an open, unimplemented request there (`github.com/sveltia/sveltia-cms/issues/248`,
filed November 2024, still open after v1). A fixed post-creation filename is the normal state of the
art. The deferred lifecycle pass carries:

- An atomic multi-file commit primitive over the Git Data API: read the base tree, build a tree that
  removes the old path and adds the new, create one commit, update the ref, and handle the
  non-fast-forward race. The engine has only the single-file PUT today. A non-atomic delete-plus-create
  move is unsafe here, because a partial failure leaves the file at both paths, which is a duplicate
  entry and, under the collision rule above, a build-breaking permalink collision.
- Delete and rename, built on that primitive.
- Internal-link rewriting, which cairn owns. On a rename, cairn holds the whole content corpus in git,
  so it finds references to the old permalink across the corpus and rewrites them to the new one inside
  the same atomic commit. This is why the move primitive must commit many files at once.
- External redirects, which cairn does not own. An inbound link from outside the site needs a redirect,
  and cairn does not manage redirects. The CMS is explicit when it renames so the site can write a
  redirect if it wants, while redirect management stays the site owner's responsibility. This matches
  the Sveltia maintainer thread.

**Settings editor.** The admin web UI to edit `permalink`, `datePrefix`, and other YAML settings is a
later pass. 0.8.0 reads the values from YAML; editing them through the admin interface comes when the
settings editor lands.

## Test plan

The suite is the acceptance contract, as for every rebuild pass. New and changed coverage:

- **Unit, slug derivation.** A `day` concept strips a full-date prefix; a `month` concept strips a
  year-month prefix; a dated id without a prefix is unchanged; a non-dated id is unchanged. Boundary
  inputs around each granularity.
- **Unit, permalink.** `:slug` resolves to the derived slug, so a dated pattern no longer doubles the
  date. The existing throw-on-missing-date and throw-on-unknown-token cases still hold.
- **Unit, site index.** The site-level index unions the per-concept indexes. A Pages URL and a Posts
  URL both resolve through one `byPermalink`, an unmatched path resolves to nothing, and the per-concept
  archive, tag, and feed loaders read only their own concept.
- **Unit, permalink matching.** `byPermalink` resolves a flat, a prefixed, and a dated path to the
  right entry, and a date-prefixed path on a `month` concept and a `day` concept each land correctly.
- **Unit, collision.** Two entries that compute the same permalink throw at index build with both ids
  named, including a collision across two different concepts.
- **Unit, prerender enumeration.** `entries()` returns the full path of every entry across concepts.
- **Unit, config merge.** The normalizer merges adapter structure with YAML URL policy, applies the
  documented default when the YAML omits a concept, and resolves `datePrefix`.
- **Unit, create.** A `day` and a `month` concept each compose the right filename, seed the
  full-precision frontmatter date, and bounce a slug that carries its own date prefix. A non-dated
  create is unchanged.
- **Integration.** The one catch-all entry route resolves a dated Posts URL and a flat Pages URL end
  to end through the site index, and a 404 path returns 404.
- **Component.** The create form renders a date input for a dated concept, defaulted to today, and
  omits it for a non-dated concept.

## Sequencing

This is a cairn-cms engine pass, shipped as `0.8.0`, run from `~/Projects/cairn/cairn-cms` in a
feature worktree off `main`. It lands before the 907 migration, so 907 then consumes `^0.8.0` and
adopts the delivery surface, this identity model, the YAML URL policy, and the catch-all route in one
site-pass. The content-lifecycle pass and the settings-editor pass follow, before or alongside the
remaining site migrations.
