# Tag-management Plan 1: Reshape — remove the public tag surface, keep tags-as-data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revert the held, unpublished tag-routing layer (the public tag index and per-tag archive URLs) while keeping tags-as-data, the `url-policy` `permalink` consolidation, and the feed-category emission, so the engine ships no public tag pages before it ever publishes.

**Architecture:** The held taxonomy work *added* a discriminated `SiteResolver.resolveRoute` and a tag URL codec *alongside* the pre-existing entry-only `byPermalink`/`entryLoad` path; it never removed the entry path. This reshape removes only the added routing layer (the `resolveRoute` tag kinds, the tag URL codec, `taxonomyBase`, the per-concept slug→value index, the prefix-aware collision throw, the tag-path prerender enumeration, the promoted route types, and the showcase tag pages) and reverts `createPublicRoutes` to its entry-only `{ entryLoad, entries }` shape, whose `entryLoad` body is byte-identical to the pre-taxonomy `entryLoad` while the factory deliberately sheds the published `archiveLoad`/`tagIndexLoad`/`tagLoad` per Component 4. Tags-as-data (the `taxonomy` marker → `ContentSummary.tags`, the validated read, `byTag`/`allTags`), the `permalink` home, and feed categories (`feedView`/`sitemapView`, RSS `<category>`, JSON Feed `tags`) stay untouched.

**Tech Stack:** TypeScript, `src/lib/content` and `src/lib/delivery`, SvelteKit catch-all routes, Vitest, Playwright.

## Global Constraints

- **Spec is canonical.** `docs/superpowers/specs/2026-06-29-cairn-tag-management-design.md`, Component 4 ("Removal of the public tag surface") and "Relationship to the held taxonomy work". This plan is its Plan 1.
- **Pre-publish reshape, no consumer churn.** The taxonomy work is merged to `main` and **held unpublished** above `0.77.0` (npm tops out at `0.76.0`). Nothing tag-routing-related ever shipped to npm, so the only affected consumer is the in-repo `examples/showcase`. The reshape rewrites the held `## Unreleased` CHANGELOG window; it does not add a new published breaking change.
- **Keep tags-as-data.** Do **not** touch the `taxonomy` marker, `resolveTaxonomyField`, `ContentSummary.tags`, `ContentIndex.byTag`/`allTags`, the `taxonomy.unmarked_field` advisory, `feedView`/`sitemapView`, or feed-category emission. These are kept by design; Plan 2 and the size-gated filter (Plan 3) consume them. The files `src/tests/unit/content-taxonomy.test.ts`, `fieldset-taxonomy.test.ts`, `delivery-content-index.test.ts`, `delivery-feeds.test.ts`, and `delivery-views.test.ts` stay green and unmodified except where a task says otherwise.
- **The `createPublicRoutes` decision is locked to entry-only `{ entryLoad, entries }`** (Task 1). Per the spec, the choice was "revert to the prior `entryLoad` shape or keep `resolveRoute` as an entry-only resolver, whichever is the smaller diff that keeps the entry path byte-identical." Reverting to `entryLoad` is chosen on scope and leanness, **not** on a no-op claim. The verified baseline: `v0.76.0` published `{ entryLoad, archiveLoad, tagIndexLoad, tagLoad, entries }` plus the `ListData`/`TagData`/`TagIndexData` types, and the held taxonomy work collapsed those four loaders into one `resolveRoute`. So reverting to entry-only `{ entryLoad, entries }` is a deliberate **published-breaking** removal of three concept-scoped loaders (`archiveLoad`/`tagIndexLoad`/`tagLoad`) and three list types, not a rename no-op; Task 5 Step 4 documents it as breaking. It is justified because Component 4 says cairn ships no public tag pages (a consumer re-renders an archive from `site.concept(id).all()` and tag lists from `ContentSummary.tags`) and because the `entryLoad` **body** is byte-identical to the pre-taxonomy entry path. The net release version is the first free minor after `0.77.0` publishes, set at cut time after verifying it free with `npm view @glw907/cairn-cms versions`; do **not** name a concrete version in this plan or any commit.
- **The engine gate is independent of the showcase.** Tasks 1–3 leave the engine tree green (`npm run check` 0/0, `npm test` exit 0) but leave the showcase temporarily wired to the now-removed `resolveRoute`; the showcase is rewired and proven in Task 4. Do **not** run the showcase e2e during Tasks 1–3.
- **Gate before done (each task):** the task's targeted test, then `npm run check` 0/0, then `npm test` exit 0. Run `npm run package` before any `check:surface`/`check:reference` (Tasks 3 and 5). **Worktree note:** before the Task 4 showcase e2e, run a from-scratch `npm install` in `examples/showcase` so its `file:` deps point at the worktree engine, not `main`.
- **The pre-taxonomy revert targets are exact.** The pre-taxonomy `public-routes.ts` is `git show 0792f43^:src/lib/delivery/public-routes.ts`; the pre-taxonomy showcase catch-all is `git show 9fdf796^:examples/showcase/src/routes/(site)/[...path]/+page.server.ts` and `…/+page.svelte`. Tasks 1 and 4 reproduce these; the literal pre-taxonomy source is the reference.

---

## Task 1: Revert the catch-all loader to entry-only `entryLoad`

`createPublicRoutes` returns `{ entryLoad, entries }` again. `entryLoad` resolves one entry by request path through `site.byPermalink` (which still exists on the resolver) and throws `error(404)` on a miss, folding in the render, seo, and hero exactly as today's entry branch does. The discriminated `ResolvedRouteData` wrapper and the `ListData`/`TagData`/`TagIndexData` list types are removed.

**Files:**
- Modify: `src/lib/delivery/public-routes.ts` (rename `resolveRoute` → `entryLoad`, return `Promise<EntryData>` throwing `error(404)`; delete the `tagIndex`/`tagArchive` branches; delete the `ResolvedRouteData`, `ListData`, `TagData`, `TagIndexData` type declarations; restore `import { error } from '@sveltejs/kit'`; return `{ entryLoad, entries }`; reword the module header to entry-only).
- Modify: `src/lib/delivery/index.ts` (drop `ListData`, `TagData`, `TagIndexData`, `ResolvedRouteData` from the `export type { … } from './public-routes.js'` list; keep `PublicRoutesDeps` and `EntryData`).
- Test: `src/tests/unit/public-routes.test.ts` (rewrite the resolveRoute/tag cases to `entryLoad` entry-only), `src/tests/unit/public-routes-seo.test.ts` (call `entryLoad`, not `resolveRoute`).

**Interfaces:**
- Consumes: `SiteResolver.byPermalink(path): ContentEntry | undefined` and `SiteResolver.adjacent(...)`, both already on the resolver and unchanged by this plan.
- Produces: `createPublicRoutes(deps): { entryLoad, entries }` where `entryLoad(event: { url: URL }): Promise<EntryData>` throws `error(404)` on a miss, and `entries(): { path: string }[]`. `EntryData` is unchanged (its `{ concept, entry, html, canonicalUrl, seo, newer?, older?, heroImage? }` shape). No `ResolvedRouteData`, `ListData`, `TagData`, or `TagIndexData` is exported anymore.

**Steps:**

- [ ] **Step 1: Rewrite the public-routes test to the entry-only surface.** In `src/tests/unit/public-routes.test.ts`, replace every `routes.resolveRoute(...)`/`data.kind` assertion with `routes.entryLoad({ url })`. Assert: an entry path returns `{ concept, entry, html, seo, canonicalUrl }` (the existing entry-render assertions, unchanged in content); a miss throws (a SvelteKit 404 — wrap in `await expect(routes.entryLoad({ url: new URL('https://x/nope') })).rejects.toThrow()` or assert the thrown `status === 404`). Delete any `tagIndex`/`tagArchive` resolution test and any `expect(routes.resolveRoute)` / `expect(...).toHaveProperty('tags')` assertion. The loader-surface assertion already exists (`public-routes.test.ts:81` reads `expect(Object.keys(routes).sort()).toEqual(['entries', 'resolveRoute'])`); **flip its expected value** to `['entries', 'entryLoad']`, and delete the now-stale `expect(surface.entryLoad).toBeUndefined()` at `public-routes.test.ts:77` (the factory now exports `entryLoad`). Leave the `archiveLoad`/`tagIndexLoad`/`tagLoad`-undefined assertions (≈lines 78–80): those loaders stay removed. Finally, **leave the `entries()` test** at `public-routes.test.ts:84–93` asserting its current 6-element tag-inclusive array (`'2026/01/01/b'`, `'2026/02/01/a'`, `'about'`, `'tags'`, `'tags/x'`, `'tags/y'`) **unchanged at this gate.** `routes.entries()` delegates to `site.entries()`, whose tag-path enumeration is removed only in Task 2, so the entry-only expectation cannot pass yet (it would red `npm test`). Add a one-line comment that Task 2 flips it to `['2026/01/01/b', '2026/02/01/a', 'about']` when it removes the resolver loop. (The earlier review prescribed flipping this here; that was a timing error — the flip belongs to Task 2, which removes the enumeration.)
- [ ] **Step 2: Update the SEO test caller.** In `src/tests/unit/public-routes-seo.test.ts`, change every `resolveRoute({ url })` call to `entryLoad({ url })` and drop any `.kind`/discriminated unwrapping; the SEO assertions on the returned `EntryData` stay as-is.
- [ ] **Step 3: Run; confirm both fail** (the factory still returns `{ resolveRoute, entries }`).

Run: `npx vitest run src/tests/unit/public-routes.test.ts src/tests/unit/public-routes-seo.test.ts`
Expected: FAIL (`routes.entryLoad is not a function`).

- [ ] **Step 4: Revert `public-routes.ts` to the entry-only shape.** Restore `import { error } from '@sveltejs/kit';` at the top. Delete the `ListData`, `TagData`, `TagIndexData`, and `ResolvedRouteData` type declarations. Rename the inner `async function resolveRoute(event)` to `async function entryLoad(event: { url: URL }): Promise<EntryData>`, change its body to resolve the entry directly and throw on a miss (drop the `site.resolveRoute` call and the `tagIndex`/`tagArchive` early returns):

```typescript
  /** One entry by request path, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    const canonicalUrl = origin + entry.permalink;
    const fields = readSeoFields(entry.frontmatter);
    const heroImage = deriveHeroImage(entry.frontmatter);
    // The SEO unify (locked decision 3): a resolved structured hero is the social card and wins over
    // the back-compat string `image` field and the site default. A bare-string `image` keeps its
    // origin-anchored behavior. An empty hero alt emits no twitter:image:alt.
    const rawImage = fields.image ?? defaultImage;
    const image = heroImage?.absoluteUrl ?? (rawImage ? resolveImageUrl(rawImage, origin) : undefined);
    const imageAlt = heroImage?.alt && heroImage.alt.trim() !== '' ? heroImage.alt : undefined;
    // A dated entry is an article; an undated one (a page) is a website.
    const seo = buildSeoMeta({
      title: entry.title,
      description: fields.description || entry.excerpt || description,
      canonicalUrl,
      siteName,
      type: entry.date ? 'article' : 'website',
      ...(entry.date ? { published: entry.date } : {}),
      ...(entry.updated ? { modified: entry.updated } : {}),
      ...(image ? { image } : {}),
      ...(imageAlt ? { imageAlt } : {}),
      ...(fields.robots ? { robots: fields.robots } : {}),
      ...(fields.author ? { author: fields.author } : {}),
      ...(entry.date ? { feeds } : {}),
    });
    return {
      concept: entry.concept,
      entry,
      html: await render({
        body: entry.body,
        concept: entry.concept,
        frontmatter: entry.frontmatter,
        resolve: buildLinkResolver(site),
      }),
      canonicalUrl,
      seo,
      newer,
      older,
      ...(heroImage ? { heroImage } : {}),
    };
  }
```

Change the factory's return to `return { entryLoad, entries };`. Reword the module header comment so it describes the entry-only catch-all (drop the "discriminated `resolveRoute` … entry, tag index, or tag archive" language; describe one catch-all resolving any concept by request path through `byPermalink`).

- [ ] **Step 5: Drop the removed type exports from the delivery barrel.** In `src/lib/delivery/index.ts`, the `export type { … } from './public-routes.js'` block keeps only `PublicRoutesDeps` and `EntryData`; remove `ListData`, `TagData`, `TagIndexData`, `ResolvedRouteData`.
- [ ] **Step 6: Run the targeted tests; confirm they pass.**

Run: `npx vitest run src/tests/unit/public-routes.test.ts src/tests/unit/public-routes-seo.test.ts`
Expected: PASS.

- [ ] **Step 7: Full engine gate.** `npm run check` (0/0), `npm test` (exit 0). `site.resolveRoute` is now unused; that is expected and removed in Task 2. Do not run the showcase e2e.
- [ ] **Step 8: Commit.**

```bash
git add src/lib/delivery/public-routes.ts src/lib/delivery/index.ts src/tests/unit/public-routes.test.ts src/tests/unit/public-routes-seo.test.ts
git commit -m "Revert createPublicRoutes to the entry-only entryLoad shape"
```

---

## Task 2: Remove `resolveRoute`, `ResolvedRoute`, and the taxonomy route machinery from the site resolver

The engine resolver loses everything tag-routing: the discriminated `ResolvedRoute` type and `resolveRoute` method, the per-concept `TaxonomyRoute` slug→value index, the prefix-aware collision throw, and the tag-path enumeration in `entries()`. `byPermalink`, `adjacent`, `entries()` (entry-only), `concept`, and `all` stay. The `tagSlug`/`tagArchivePath`/`parseTagPath` import is dropped (those exports are removed in Task 3).

**Files:**
- Modify: `src/lib/delivery/site-resolver.ts` (delete the `import { tagSlug, tagArchivePath, parseTagPath } …` line; delete the `ResolvedRoute` type; delete `resolveRoute` from the `SiteResolver` interface and its implementation; delete the `TaxonomyRoute` interface, the `taxonomyRoutes` build loop, the collision-check block, and the `routesByLongestBase` sort; in `entries()` delete the `for (const route of taxonomyRoutes)` loop so it enumerates entry permalinks only; reword the doc comments on the interface and `entries()` to drop the tag-route language).
- Modify: `src/lib/delivery/data.ts` (drop `ResolvedRoute` from the `export type { SiteResolver, ConceptIndex, ResolvedReference, ResolvedRoute } from './site-resolver.js';` line — it becomes `export type { SiteResolver, ConceptIndex, ResolvedReference } from './site-resolver.js';`).
- Test: `src/tests/unit/delivery-site-resolver.test.ts` (remove the tag-routing resolution tests added by taxonomy; keep `byPermalink`/`adjacent`/`entries`/`concept`/`all` tests), `src/tests/unit/delivery-site-resolver-validation.test.ts` (remove the tag-base / slug-collision throw tests; keep the duplicate-permalink and invalid-frontmatter throw tests), `src/tests/unit/public-routes.test.ts` (flip the `entries()` expectation from the 6-element tag-inclusive array to the entry-only `['2026/01/01/b', '2026/02/01/a', 'about']`, since this task removes the resolver's tag-path enumeration that `routes.entries()` surfaces — the flip Task 1 deferred here).

**Interfaces:**
- Produces: `SiteResolver` with `byPermalink`, `adjacent`, `entries`, `concept`, `all` only. `entries()` returns one `{ path }` per entry permalink, leading slash stripped, exactly as before taxonomy. No `resolveRoute` method, no `ResolvedRoute` export.

**Steps:**

- [ ] **Step 1: Prune the resolver tests to the entry-only surface.** In `src/tests/unit/delivery-site-resolver.test.ts`, delete the entire `describe('SiteResolver.resolveRoute')` block (≈lines 195–267). This block contains not only the `resolveRoute` resolution cases but a `taxonomySite().entries()` **prerender test** (≈lines 257–266) that asserts the tag paths `'topics'`/`'topics/svelte'`/`'topics/web-design'`; that test calls `entries()` rather than `resolveRoute`, so it would otherwise survive the "calls `resolveRoute`" criterion and then fail at this task's gate once `entries()` is entry-only. Also delete the `taxonomySite` fixture (≈lines 149–193) that exists solely to build tag routing. Keep (and confirm present) the entry-only tests in `describe('createSiteResolver')`: `byPermalink` (hit, trailing-slash normalization, miss), `adjacent`, `entries()` (entry permalinks only, leading slash stripped), `concept`, `all`, and the duplicate-permalink throw. In `delivery-site-resolver-validation.test.ts`, delete the tests asserting a throw on a tag-base/entry collision or a within-concept slug collision; keep the invalid-frontmatter and duplicate-permalink throws. In `src/tests/unit/public-routes.test.ts`, flip the `entries()` test's expected array from the 6-element tag-inclusive form to the entry-only `['2026/01/01/b', '2026/02/01/a', 'about']` and remove the "Task 2 flips this" comment Task 1 left — this task's resolver change makes `routes.entries()` entry-only, so the flip lands here.
- [ ] **Step 2: Run; confirm the suite still references `resolveRoute` nowhere it shouldn't.**

Run: `npx vitest run src/tests/unit/delivery-site-resolver.test.ts src/tests/unit/delivery-site-resolver-validation.test.ts`
Expected: the kept tests pass against the *current* resolver (which still has `resolveRoute`); the deleted ones are gone. (This step is a checkpoint, not a red bar — the removal is a deletion, so the guard is that the kept tests stay green through the change.)

- [ ] **Step 3: Remove the routing machinery from `site-resolver.ts`.** Delete the `import { tagSlug, tagArchivePath, parseTagPath } from '../content/url-policy.js';` line. Delete the `ResolvedRoute` type declaration (the `export type ResolvedRoute = …` union and its doc comment). In the `SiteResolver` interface, delete the `resolveRoute(path: string): ResolvedRoute | undefined;` member and its doc comment, and reword the `entries()` doc comment to "Every entry permalink across concepts, leading slash stripped, for SvelteKit `[...path]`." In `createSiteResolver`, delete the entire `TaxonomyRoute` interface, the `const taxonomyRoutes: TaxonomyRoute[] = []` build loop, the prefix-aware collision-check block (the `const permalinks = …` through its three throw loops), and the `const routesByLongestBase = …` sort. In the returned object, delete the `resolveRoute(path) { … }` method. Change `entries()` to:

```typescript
    entries() {
      return [...byPath.keys()].map((p) => ({ path: p.replace(/^\//, '') }));
    },
```

- [ ] **Step 4: Drop the `ResolvedRoute` re-export.** Edit `src/lib/delivery/data.ts` line 7 to `export type { SiteResolver, ConceptIndex, ResolvedReference } from './site-resolver.js';`.
- [ ] **Step 5: Run the targeted tests; confirm they pass.**

Run: `npx vitest run src/tests/unit/delivery-site-resolver.test.ts src/tests/unit/delivery-site-resolver-validation.test.ts`
Expected: PASS.

- [ ] **Step 6: Full engine gate.** `npm run check` (0/0), `npm test` (exit 0). `descriptor.taxonomyBase` is now read nowhere; that is expected and removed in Task 3.
- [ ] **Step 7: Commit.**

```bash
git add src/lib/delivery/site-resolver.ts src/lib/delivery/data.ts src/tests/unit/delivery-site-resolver.test.ts src/tests/unit/delivery-site-resolver-validation.test.ts src/tests/unit/public-routes.test.ts
git commit -m "Remove resolveRoute and the taxonomy route machinery from the site resolver"
```

---

## Task 3: Remove the tag URL codec and `taxonomyBase` from the concept model

The lossy tag URL codec leaves `url-policy.ts` (only `permalink` stays), the `taxonomyBase` field leaves the three type declarations and its validation/resolution in `concepts.ts`, and `data.ts` stops re-exporting `tagSlug`/`tagArchivePath`.

**Files:**
- Modify: `src/lib/content/url-policy.ts` (delete `tagSlug`, `tagArchivePath`, `parseTagPath`; keep `permalink` and its date helpers `pad`/`dateParts`; reword the module header so it is the permalink home only).
- Modify: `src/lib/delivery/data.ts` (delete the `export { tagSlug, tagArchivePath } from '../content/url-policy.js';` line).
- Modify: `src/lib/content/types.ts` (delete the three `taxonomyBase?: string;` members and their doc comments: in `ConceptUrlPolicy` (~line 88–90), in `ConceptConfig` (~line 107–108), and in `ConceptDescriptor` (~line 298–303)).
- Modify: `src/lib/content/concepts.ts` (delete the `taxonomyBase` validation block in `validateUrlPolicy` (~lines 88–95); delete `taxonomyBase: config.taxonomyBase` from the policy assembly (~line 146); delete the `const taxonomyBase = policy.taxonomyBase ?? …` resolution (~line 151) and the `taxonomyBase,` entry in the returned descriptor (~line 161); **and remove the code these orphan**: the `SAFE_TAXONOMY_BASE` regex const and its doc comment (~lines 57–58, read only by the deleted validation block), the now-unused `const taxonomyField = resolveTaxonomyField(fields)` local (~line 150, read only by the deleted resolution line), and the now-unused `import { resolveTaxonomyField } from './taxonomy.js'` (~line 7). Leave `taxonomy.ts` and its `resolveTaxonomyField` export untouched — `views.ts` and `content-index.ts` still import it on the kept tags-as-data path).
- Delete: `src/tests/unit/content-url-policy.test.ts` — its only suites are the three tag-codec `describe` blocks (`tagSlug`/`tagArchivePath`/`parseTagPath`), and it has **no** `permalink` cases (those live in `src/tests/unit/content-permalink.test.ts`, which stays untouched). Removing the codec would leave this file with zero tests, which fails the Vitest run (no `passWithNoTests`), so `git rm` the whole file.
- Test: `src/tests/unit/content-concepts.test.ts` (delete the `taxonomyBase` resolution/validation cases).

**Interfaces:**
- Produces: `url-policy.ts` exports `permalink` only. `ConceptUrlPolicy`/`ConceptConfig`/`ConceptDescriptor` no longer carry `taxonomyBase`. `data.ts` no longer re-exports `tagSlug`/`tagArchivePath`.

**Steps:**

- [ ] **Step 1: Remove the codec test file and prune the concepts tests.** `git rm src/tests/unit/content-url-policy.test.ts` — the entire file is the tag codec (`tagSlug`/`tagArchivePath`/`parseTagPath`); nothing remains once the codec goes, and the `permalink()` parity tests already live in `src/tests/unit/content-permalink.test.ts` (which needs no change). In `src/tests/unit/content-concepts.test.ts`, delete the tests that assert `taxonomyBase` resolves to `/<field>`, that an explicit `taxonomyBase` wins, or that a non-root-relative/non-URL-safe `taxonomyBase` throws.
- [ ] **Step 2: Run; confirm the kept concepts tests still pass against the current source** (checkpoint, as in Task 2 Step 2).

Run: `npx vitest run src/tests/unit/content-concepts.test.ts`
Expected: the kept concept tests pass (the `taxonomyBase` cases are gone; `content-url-policy.test.ts` is removed, so it is not in the run).

- [ ] **Step 3: Remove the codec from `url-policy.ts`.** Delete the `tagSlug`, `tagArchivePath`, and `parseTagPath` functions and their doc comments. Keep `permalink`, `pad`, `dateParts`, and the `ConceptDescriptor` import. Reword the module header to:

```typescript
// cairn-cms: the home for entry-permalink URL shaping. `permalink` resolves an entry's canonical
// path from its concept's pattern. The date is read straight from the YYYY-MM-DD string, so a
// permalink never shifts across a timezone.
```

- [ ] **Step 4: Drop the `data.ts` codec re-export.** Delete the `export { tagSlug, tagArchivePath } from '../content/url-policy.js';` line in `src/lib/delivery/data.ts`.
- [ ] **Step 5: Remove `taxonomyBase` from the types and the concept normalizer, and the code it orphans.** In `types.ts`, delete the three `taxonomyBase?: string;` members and their doc comments. In `concepts.ts`, delete the `taxonomyBase` validation block in `validateUrlPolicy`, the `taxonomyBase: config.taxonomyBase` policy entry, the `const taxonomyBase = …` resolution line, the `taxonomyBase,` field in the returned descriptor object, the `SAFE_TAXONOMY_BASE` regex const and its doc comment, the orphaned `const taxonomyField = resolveTaxonomyField(fields)` local, and the orphaned `import { resolveTaxonomyField } from './taxonomy.js'`. Verify no orphan remains: `grep -nE 'taxonomyField|SAFE_TAXONOMY_BASE|resolveTaxonomyField' src/lib/content/concepts.ts` returns nothing.
- [ ] **Step 6: Run the targeted tests; confirm they pass.**

Run: `npx vitest run src/tests/unit/content-concepts.test.ts`
Expected: PASS.

- [ ] **Step 7: Full engine gate + surface regen.** `npm run check` (0/0), `npm test` (exit 0). Then `npm run package` and regenerate the surface snapshot (see Task 5 for the snapshot doc; the `check:surface` script is `npm run package && node scripts/check-surface.mjs` — run the script's update path, e.g. `node scripts/check-surface.mjs --update`, to rewrite `docs/internal/api-surface.md`). Commit the regenerated snapshot here so the removed exports (`tagSlug`, `tagArchivePath`, `ResolvedRoute`, `ResolvedRouteData`, `ListData`, `TagData`, `TagIndexData`, `taxonomyBase`) leave the recorded surface in the same change that removes them.
- [ ] **Step 8: Commit.**

```bash
git add src/lib/content/url-policy.ts src/lib/delivery/data.ts src/lib/content/types.ts src/lib/content/concepts.ts src/tests/unit/content-concepts.test.ts docs/internal/api-surface.md
git commit -m "Remove the tag URL codec and taxonomyBase from the concept model"
```

The `git rm src/tests/unit/content-url-policy.test.ts` from Step 1 is already staged and rides in this commit.

---

## Task 4: Un-wire the showcase tag pages

Revert the showcase catch-all to its pre-taxonomy entry-only form (it already had no `data.kind` switch), reword the `cairn.config.ts` marker comment to describe tags-as-data (keeping the `taxonomy: true` marker and the seeded `topics` so the data path stays exercised), and delete the tag e2e.

**Files:**
- Modify: `examples/showcase/src/routes/(site)/[...path]/+page.server.ts` (revert to `git show 9fdf796^:…/+page.server.ts`: call `routes.entryLoad({ url })`, resolve references against `data.concept`, drop the `tagArchivePath` import, the `taxonomyBase`-derived tag-index hrefs, and the `data.kind` handling).
- Modify: `examples/showcase/src/routes/(site)/[...path]/+page.svelte` (revert to `git show 9fdf796^:…/+page.svelte`: render the entry directly with its author/related references; drop the `data.kind` branches and any tag-index/tag-archive markup).
- Modify: `examples/showcase/src/lib/cairn.config.ts` (reword the `topics` field comment to describe tags-as-data and the size-gated filter, not routing; keep `topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true })`).
- Delete: `examples/showcase/e2e/tags.spec.ts`.
- Keep unchanged: the seeded `topics` frontmatter in `examples/showcase/src/content/posts/2026-01-15-hello.md` and `2026-02-20-second.md` (tags-as-data; the filter in Plan 3 consumes it).

**Steps:**

- [ ] **Step 1: From-scratch showcase install** so the `file:` deps point at the worktree engine:

```bash
rm -rf examples/showcase/node_modules examples/showcase/package-lock.json
( cd examples/showcase && npm install )
```

- [ ] **Step 2: Revert the catch-all server load.** Replace `examples/showcase/src/routes/(site)/[...path]/+page.server.ts` with the pre-taxonomy form:

```bash
git show 9fdf796^:examples/showcase/src/routes/'(site)'/'[...path]'/+page.server.ts > examples/showcase/src/routes/'(site)'/'[...path]'/+page.server.ts
```

Read the result and confirm it imports `createPublicRoutes, resolveReferences, siteDescriptors, type ResolvedReference` (no `tagArchivePath`), calls `routes.entryLoad({ url })`, and resolves references via `descriptorById.get(data.concept)`.

- [ ] **Step 3: Revert the catch-all page.** Replace `…/+page.svelte` with the pre-taxonomy form:

```bash
git show 9fdf796^:examples/showcase/src/routes/'(site)'/'[...path]'/+page.svelte > examples/showcase/src/routes/'(site)'/'[...path]'/+page.svelte
```

Confirm it renders `data.entry`, `data.heroImage`, `data.html`, and the `author`/`related` references, with no `{#if data.kind === …}` branching.

- [ ] **Step 4: Reword the marker comment in `cairn.config.ts`.** Replace the three-line `topics` comment with one that describes tags-as-data:

```typescript
        // The taxonomy marker: one creatable multiselect per concept whose validated values surface on
        // ContentSummary.tags and feed categories. cairn ships no public tag pages; a site filters its
        // own archive over this data (the size-gated template filter), so the marker carries no routing.
        topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true }),
```

- [ ] **Step 5: Delete the tag e2e.**

```bash
git rm examples/showcase/e2e/tags.spec.ts
```

- [ ] **Step 6: Run the from-scratch consumer build + e2e.**

Run: `CI=1 npm --prefix examples/showcase run test:e2e`
Expected: PASS, including `golden-path.spec.ts` (which exercises the entry author/related references through the reverted load). No `tags.spec.ts` runs. Confirm the build prerenders entry paths only (no `/topics` or `/topics/<slug>` in the prerender output).

- [ ] **Step 7: Commit** the showcase changes, the deleted e2e, and the regenerated showcase lockfile.

```bash
git add examples/showcase/src/routes examples/showcase/src/lib/cairn.config.ts examples/showcase/package-lock.json
git rm --cached examples/showcase/e2e/tags.spec.ts 2>/dev/null; git add -A examples/showcase/e2e
git commit -m "Un-wire the showcase tag pages; keep the taxonomy marker as tags-as-data"
```

---

## Task 5: Docs, the CHANGELOG window rewrite, and the doc gates

Bring the reference docs to the entry-only surface, rewrite the held `## Unreleased` CHANGELOG window and the upgrade guide so they describe the net (tags-as-data + the vocabulary model to come, no public tag pages), and clear every doc and surface gate.

**Files:**
- Modify: `docs/reference/delivery.md`, `docs/reference/delivery-data.md` (remove the `resolveRoute`/`ResolvedRoute`/`ResolvedRouteData` sections and the **delivery-layer** `tagSlug`/`tagArchivePath`/`ListData`/`TagData`/`TagIndexData` entries; revert the worked catch-all example to `entryLoad`; restore the `{ entryLoad, entries }` description on `createPublicRoutes`; keep `feedView`/`sitemapView`). The public catch-all example lives **here in `delivery.md`**, not in `sveltekit.md`.
- Do **not** edit `docs/reference/sveltekit.md`: it is the admin (`@glw907/cairn-cms/sveltekit`) reference and documents only the `/admin/[...path]` and `/media/[...path]` catch-alls — it carries no `resolveRoute`/`entryLoad`/`data.kind`, and its line-480 pointer to `delivery.md` is correct. Its `ListData` mentions are the **admin-layer** `ListData` (from `@glw907/cairn-cms/sveltekit`, `src/lib/sveltekit/content-routes.ts`), a different, **kept** type — leave them.
- Modify: `CHANGELOG.md` (rewrite the `## Unreleased` window per the spec — see Step 4), `docs/guides/upgrade-cairn.md` (mirror the rewrite).
- Verify only (no edit expected): `docs/reference/admin-routes.md` (the held `mintToken` prose reword is unrelated to tags and stays), `docs/reference/log-events.md` (the `taxonomy.unmarked_field` advisory stays — it is tags-as-data).

**Steps:**

- [ ] **Step 1: Hunt drift on the removed symbols.** Run `grep -rn -E "resolveRoute|ResolvedRoute|ResolvedRouteData|tagSlug|tagArchivePath|parseTagPath|taxonomyBase|tagIndexLoad|tagLoad|archiveLoad|TagData|TagIndexData|ListData" docs README.md` and list every hit. Each hit under `docs/reference/` or `README.md` that names a **delivery-layer** removed symbol is repointed or removed in this task; hits under `docs/superpowers/` (plans, specs) and `docs/internal/history/` are history and stay. **`ListData` carve-out:** two distinct types share the name — the delivery `ListData` (`@glw907/cairn-cms/delivery`, removed here, documented in `delivery.md`) and the admin-layer `ListData` (`@glw907/cairn-cms/sveltekit`, `src/lib/sveltekit/content-routes.ts`, **kept**). Remove only the delivery-layer `ListData` hits in `delivery.md`; leave the admin-layer `ListData` in `docs/reference/components.md` (the `ConceptList` prop, ~lines 113–127) and `docs/reference/sveltekit.md` (~lines 13, 263, 590, 612) untouched, or `check:reference` flags the kept export as undocumented. `TagData`/`TagIndexData` have no admin-layer twin, so remove them wherever they appear under `docs/reference/`. A reference anchor like `delivery-data.md#tagslug` must lose its inbound links too.
- [ ] **Step 2: Edit the delivery reference (including the worked catch-all example).** In `docs/reference/delivery.md` and `delivery-data.md`, remove the `resolveRoute`/`ResolvedRoute`/`ResolvedRouteData` sections and the delivery-layer `tagSlug`/`tagArchivePath`/`ListData`/`TagData`/`TagIndexData` entries. Fix the `createPublicRoutes` signature block and prose to describe a factory returning `{ entryLoad, entries }`, with `entryLoad(event)` resolving one entry by request path (throws 404 on a miss) and `entries()` enumerating entry prerender paths; drop the "discriminates a request path into an entry, a tag index, or a tag archive" and "branches on `data.kind`" language. Revert the worked `+page.server.ts` example: change `const data = await routes.resolveRoute({ url })` to `const data = await routes.entryLoad({ url })` with a direct entry render and no `data.kind` switch. Leave `feedView`/`sitemapView` and the feed-category prose intact.
- [ ] **Step 3: Confirm `sveltekit.md` needs no edit.** Verify `grep -niE "resolveRoute|entryLoad|data\.kind" docs/reference/sveltekit.md` returns nothing (the public catch-all reverted in Step 2 is the only one that changes). The admin/media catch-alls and the line-480 pointer to `delivery.md` stay as-is.
- [ ] **Step 4: Rewrite the `## Unreleased` CHANGELOG window.** **Rewrite the marker block's opening sentence** (`CHANGELOG.md` line 11, "The tag index, the tag archives, and the feed categories all read the marked field.") to name only the surviving readers: "The content index and the feed categories both read the marked field." (no tag index, no tag archives ship). Keep the rest of the tags-as-data marker block (a concept marks one multiselect `taxonomy: true`; the index reads that field's validated value; an unmarked `tags`/`freetags`/`categories` draws the `taxonomy.unmarked_field` advisory; feed categories populate). Drop every tag-routing line from the window: the `taxonomyBase` sentence, the "tag index and per-tag archives" routing, and the entire "createPublicRoutes now returns `{ resolveRoute, entries }` … branch the catch-all on `data.kind`" block. Replace the loader story with the net:

> `createPublicRoutes` resolves one entry per request path. It returns `{ entryLoad, entries }`; `entryLoad(event)` returns the entry payload and throws `error(404)` on a miss. The pre-`0.77.0` `archiveLoad`, `tagIndexLoad`, and `tagLoad` loaders are removed: cairn ships no public tag pages, and a site renders an archive from `site.concept(id).all()` and a tag list from the tags-as-data on `ContentSummary.tags`.
>
> This is breaking. Consumers must: drop any call to the removed `archiveLoad`, `tagIndexLoad`, or `tagLoad`; render those surfaces from `site.concept(id).all()` and `ContentSummary.tags` in site code. The catch-all keeps calling `entryLoad`; no `data.kind` branching is needed.

Keep the marker `Consumers must` (mark each concept's tag field `taxonomy: true`). Do **not** mention `resolveRoute`, `ResolvedRoute`, `ResolvedRouteData`, `tagSlug`, `tagArchivePath`, or `taxonomyBase` anywhere in the window — they never shipped, so no consumer ever saw them. Mirror the rewrite in `docs/guides/upgrade-cairn.md`, including the same marker-sentence fix (~lines 819–821, "…and the tag index, the tag archives, and the feed categories all read it" → "…and the content index and the feed categories both read it") and dropping the guide's separate "the public route loaders collapse into one `resolveRoute`" section (~lines 830–848).

- [ ] **Step 5: Run every doc and surface gate.**

Run: `npm run package && npm run check:reference && npm run check:reference:signatures && npm run check:docs && node scripts/check-surface.mjs && npm run check:package && npm run check:comments`
Expected: all pass. (`check:surface` confirms the snapshot regenerated in Task 3 matches the built surface; `check:docs` confirms no doc links a removed name.)

- [ ] **Step 6: Commit.**

```bash
git add docs/reference/delivery.md docs/reference/delivery-data.md CHANGELOG.md docs/guides/upgrade-cairn.md
git commit -m "Reshape the docs and CHANGELOG window to the entry-only, no-tag-pages surface"
```

---

## Self-review

- **Spec coverage (Component 4).** Revert `resolveRoute` tag kinds, the prefix-aware collision throw, the slug→value index, the tag-path prerender enumeration, the promoted route types → Task 2. Remove `taxonomyBase`, `tagSlug`/`tagArchivePath`/`parseTagPath` → Task 3. Showcase tag pages → Task 4. `createPublicRoutes` reverts to entry-only `entryLoad` (the locked smaller-diff choice) → Task 1. `check:surface` regenerate → Task 3 (and verified Task 5). CHANGELOG window rewrite, upgrade guide → Task 5. Keep tags-as-data, `permalink` consolidation, feed categories → enforced by the Global Constraints and untouched files.
- **Premise check (charter).** This removes engine surface that the evidence found unjustified (no public tag pages); it does not add a feature. It is the leanest reshape: the `entryLoad` body is byte-identical, the three dropped loaders (`archiveLoad`/`tagIndexLoad`/`tagLoad`) are surface the spec says cairn should not own (Component 4), and tags-as-data stays for the editor-autonomy work (Plans 2–3).
- **Green tree at each gate.** Task 1 stops the showcase-independent engine from calling `site.resolveRoute`; Task 2 removes `resolveRoute` (now unused) and `descriptor.taxonomyBase`'s only reader; Task 3 removes `taxonomyBase` (now unread) and the codec (now un-imported). Each engine task leaves `npm run check`/`npm test` green; the showcase is rewired in Task 4. The ordering is load-bearing — do not reorder.
- **Type consistency.** `entryLoad(event: { url: URL }): Promise<EntryData>` (Task 1) is the same name/shape the pre-taxonomy `entryLoad` had and the same the showcase reverts to (Task 4). `EntryData` is unchanged throughout. `SiteResolver` after Task 2 has exactly `byPermalink`/`adjacent`/`entries`/`concept`/`all`, the five the showcase and feeds consume.
- **No placeholders.** Every removal names exact files and line ranges; the `entryLoad` body and the showcase reverts are reproduced or pinned to exact pre-taxonomy commits; the CHANGELOG rewrite text is given verbatim.
- **Risk.** Task 1 is the correctness-critical piece (the entry render/seo/hero body must stay byte-identical); the existing entry assertions in `public-routes.test.ts` and the showcase `golden-path.spec.ts` are the guard. Task 2's deletions are mechanical but the `entries()` rewrite must keep the leading-slash strip. Task 5's CHANGELOG window must not name a never-shipped symbol as a consumer action.
