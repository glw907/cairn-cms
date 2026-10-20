# Taxonomy Plan 2: First-class Tag Routing (read path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve tag index and tag archive URLs through the same catch-all that resolves entry permalinks, with one discriminated `resolveRoute`, a slugified tag URL codec, and a build-time prefix-aware collision check.

**Architecture:** A `url-policy` module becomes the single home for entry permalink interpolation, date-prefix slug shaping, and the new `tagSlug`/`parseTagPath`. `SiteResolver` gains `resolveRoute(path)` returning a discriminated `ResolvedRoute` (entry, tagIndex, tagArchive); it matches an exact entry permalink first, then the longest taxonomy-base prefix, with a build-time throw on any prefix overlap across the full concrete route set. `createPublicRoutes` collapses its four loaders into one `resolveRoute`, and the showcase catch-all renders by kind.

**Tech Stack:** TypeScript, `src/lib/content` and `src/lib/delivery`, SvelteKit catch-all routes, Playwright, Vitest.

## Global Constraints

- **Depends on Plan 1.** The tag index it routes to comes from Plan 1's marker wiring. Land Plan 1 first.
- **Spec is canonical.** `docs/superpowers/specs/2026-06-28-cairn-taxonomy-tag-delivery-design.md`, Component 2 and the Breaking change section.
- **One door.** `resolveRoute` replaces `entryLoad`/`tagLoad`/`tagIndexLoad`/`archiveLoad`; the removal is a documented `Consumers must` and drifts `check:surface`.
- **Tag URLs are slugified** with a build-time slug-collision throw; the stored canonical tag value is recovered through a per-concept slug→value index.
- **Entry permalinks win.** An exact entry permalink takes precedence; the build throws on any entry-vs-tag-route overlap so precedence never has to resolve a real collision at runtime.
- **Behavior-preserving consolidation.** Moving `permalink()` and the slug logic into `url-policy` must keep the existing permalink/parity tests green with no assertion changes beyond import paths.
- **Gate before done (each task):** the task's targeted test, `npm run check` 0/0, `npm test` exit 0, then the surface/doc gate. `npm run package` before `check:surface`/`check:reference`. **Worktree note:** before any showcase e2e, run a from-scratch `npm install` in `examples/showcase` so its `file:` deps point at the worktree engine, not main.

---

## Task 1: The `url-policy` module — consolidate URL shaping and add `tagSlug`

One home for all URL shaping: move `permalink()` and the date-prefix slug logic in, add the tag codec.

**Files:**
- Create: `src/lib/content/url-policy.ts` (re-export/move `permalink`; add `tagSlug`, `tagArchivePath`, `parseTagPath`).
- Modify: `src/lib/content/permalink.ts`, `src/lib/content/identity.ts` (re-home the functions behind re-exports so call sites and the existing parity tests are unaffected), `src/lib/content/taxonomy.ts` (Plan 1's file; `tagSlug` may live here or in `url-policy` — keep all URL shaping in `url-policy`).
- Test: `src/tests/unit/content-url-policy.test.ts`; the existing `content-permalink*.test.ts` stay green (import-path edits only).

**Interfaces:**
- Produces: `tagSlug(value: string): string` (lowercase, hyphenated, URL-safe segment); `tagArchivePath(base: string, value: string): string` (`base + '/' + tagSlug(value)`); `parseTagPath(base, path): { tag: string } | 'index' | null` (returns `'index'` for an exact base match, `{ tag }` for one slug segment under the base, `null` otherwise — `tag` is the slug, resolved to the canonical value by the caller).
- Produces: the relocated `permalink(descriptor, identity)` with an identical signature and behavior.

**Steps:**

- [ ] **Step 1: Write the failing `tagSlug`/`parseTagPath` tests.** `tagSlug('Web Design') === 'web-design'`; `tagSlug('C++')` is stable and non-empty; `parseTagPath('/topics', '/topics') === 'index'`; `parseTagPath('/topics', '/topics/web-design')` is `{ tag: 'web-design' }`; `parseTagPath('/topics', '/topics/a/b') === null`; `parseTagPath('/topics', '/other') === null`.
- [ ] **Step 2: Run; confirm it fails.**
- [ ] **Step 3: Implement `url-policy.ts`** with `tagSlug` (lowercase, trim, replace runs of non-alphanumerics with a single hyphen, strip leading/trailing hyphens — adapt the existing `slugify` in `ids.ts` rather than reuse it verbatim if its filename rules differ), `tagArchivePath`, `parseTagPath`. Move `permalink()` here and re-export it from `permalink.ts` (`export { permalink } from './url-policy.js'`) so no call site changes.
- [ ] **Step 4: Run the new tests + the existing `content-permalink*.test.ts`; confirm all pass** (parity preserved).
- [ ] **Step 5: Full gate.** Commit.

---

## Task 2: `taxonomyBase` on `ConceptUrlPolicy`

Name the tag-base override the design promises and validate it.

**Files:**
- Modify: `src/lib/content/types.ts` (`ConceptUrlPolicy` gains `taxonomyBase?: string`; `ConceptDescriptor` carries the resolved base).
- Modify: `src/lib/content/concepts.ts` (`validateUrlPolicy` validates `taxonomyBase` is root-relative and URL-safe; `normalizeConcepts` resolves the base, defaulting to `/<taxonomyFieldName>` when a taxonomy exists).
- Test: `src/tests/unit/content-concepts.test.ts` / `define-concept.test.ts`.

**Interfaces:**
- Consumes: `resolveTaxonomyField` (Plan 1).
- Produces: `ConceptDescriptor.taxonomyBase?: string` (the resolved archive base, present only when the concept has a taxonomy field), defaulting to `/${taxonomyFieldName}`.

**Steps:**

- [ ] **Step 1: Write failing tests.** A concept with a `topics` taxonomy and no override resolves `taxonomyBase` to `/topics`; an explicit `taxonomyBase: '/tags'` wins; a non-root-relative or non-URL-safe base throws in `validateUrlPolicy`; a concept with no taxonomy field has no `taxonomyBase`.
- [ ] **Step 2: Run; confirm failures.**
- [ ] **Step 3: Implement.** Add the field to `ConceptUrlPolicy` and `ConceptDescriptor`. In `validateUrlPolicy`, validate `taxonomyBase` (starts with `/`, matches a URL-safe charset). In `normalizeConcepts`, after resolving fields, set `taxonomyBase = config.taxonomyBase ?? (resolveTaxonomyField(namedFields(fs)) ? '/' + resolveTaxonomyField(...)! : undefined)`.
- [ ] **Step 4: Run; confirm passes.**
- [ ] **Step 5: Full gate + `npm run package` + `check:surface --update`** (the descriptor/type change may drift the snapshot). Commit.

---

## Task 3: `resolveRoute` discriminated resolver, collision throw, and tag-path enumeration

`SiteResolver` resolves all three route kinds through one method, throws on prefix overlaps at build, and enumerates tag paths for prerender.

**Files:**
- Modify: `src/lib/delivery/site-resolver.ts` (the `ResolvedRoute` type, `resolveRoute`, the prefix-aware collision check in `createSiteResolver`, the per-concept slug→value index, `entries()` extension).
- Test: `src/tests/unit/delivery-site-resolver.test.ts`, `delivery-site-resolver-validation.test.ts`.

**Interfaces:**
- Produces: `type ResolvedRoute = { kind: 'entry'; entry: ContentEntry } | { kind: 'tagIndex'; concept: string; tags: { tag: string; count: number }[] } | { kind: 'tagArchive'; concept: string; tag: string; entries: ContentSummary[] }` and `SiteResolver.resolveRoute(path: string): ResolvedRoute | undefined`. `entries()` now includes each taxonomy index base and each `tagArchivePath(base, tag)`.

**Steps:**

- [ ] **Step 1: Write failing resolution tests.** With a fixture site (a `posts` concept with a `topics` taxonomy and tagged entries, plus a `pages` concept): `resolveRoute('/posts/hello')` is `{ kind: 'entry' }`; `resolveRoute('/topics')` is `{ kind: 'tagIndex', tags }`; `resolveRoute('/topics/svelte')` is `{ kind: 'tagArchive', tag: 'svelte', entries }` (the slug resolves to the canonical value); an unknown tag or a tag with no non-draft entries returns `undefined` (the route layer 404s); `/topics/a/b` returns `undefined`. Note: do NOT write an "entry permalink that also looks like a tag path wins" runtime-precedence test, it is unobservable — such a configuration is a build-time collision (Step 2) and `createSiteResolver` throws before `resolveRoute` is callable. Entry-first matching is still implemented (an exact `byPath` hit short-circuits before the prefix scan), but the build throw is the actual guarantee, so assert it there, not at runtime.
- [ ] **Step 2: Write the failing collision tests.** A `pages` entry whose permalink is `/topics` or `/topics/x` while `posts` declares a `/topics` taxonomy base throws at `createSiteResolver`; two concepts whose taxonomy bases both resolve to `/topics` throws.
- [ ] **Step 3: Run; confirm failures.**
- [ ] **Step 4: Implement.** In `createSiteResolver`: after building the entry `byPath` map, for each concept with a `taxonomyBase`, build a per-concept `slug -> value` map from `index.allTags()` (throw on a slug collision, naming both values), register the index base and each concrete `tagArchivePath(base, tag)` into the shared path namespace, and throw on any overlap with an entry permalink or another base (exact or prefix). `resolveRoute(path)`: normalize; exact `byPath` hit -> `{ kind: 'entry' }`; else longest `taxonomyBase` prefix match -> `parseTagPath` -> `'index'` returns the `tagIndex`, `{ tag }` resolves the slug via the per-concept map and returns the `tagArchive` (or `undefined` if the slug is unknown or `byTag(value)` is empty), `null`/no-match -> `undefined`. Extend `entries()` to append each taxonomy index base and each `tagArchivePath(base, tag)`, each with the same leading-slash strip the existing `entries()` applies (`p.replace(/^\//, '')`), so the appended tag paths match the shape of the existing entry paths the prerender `EntryGenerator` consumes (`topics/svelte`, not `/topics/svelte`).
- [ ] **Step 5: Run; confirm passes.**
- [ ] **Step 6: Full gate + `check:surface --update`.** Commit.

---

## Task 4: Collapse `createPublicRoutes` onto `resolveRoute`

Remove the four per-concept loaders; the catch-all calls one resolver.

**Files:**
- Modify: `src/lib/delivery/public-routes.ts` (remove `entryLoad`, `archiveLoad`, `tagIndexLoad`, `tagLoad`; add `resolveRoute(event)` returning the discriminated payload with the entry kind carrying the rendered html/seo/hero exactly as `entryLoad` did today; keep `entries()`).
- Test: `src/tests/unit/public-routes.test.ts` (rewrite to the new surface).

**Interfaces:**
- Consumes: `SiteResolver.resolveRoute` (Task 3).
- Produces: `createPublicRoutes(deps)` returns `{ resolveRoute, entries }`. `resolveRoute(event: { url: URL })` returns `Promise<ResolvedRouteData | undefined>` where the entry kind is today's `EntryData` shape under `{ kind: 'entry', ...EntryData }`, and the tag kinds carry `TagIndexData`/`TagData` under their kind. The 404 (undefined) is the route layer's to throw.

**Steps:**

- [ ] **Step 1: Write the failing test.** `resolveRoute({ url })` for an entry path returns `{ kind: 'entry', entry, html, seo, ... }`; for the tag base returns `{ kind: 'tagIndex', tags }`; for a tag archive returns `{ kind: 'tagArchive', tag, entries }`; for a miss returns `undefined`. Assert the old loaders are no longer exported.
- [ ] **Step 2: Run; confirm it fails.**
- [ ] **Step 3: Implement.** Fold `entryLoad`'s render/seo/hero body into the entry branch of `resolveRoute`; the tag branches read `site.resolveRoute(path)`'s `tagIndex`/`tagArchive` directly. Delete the four loader functions and the `indexOf` helper if now unused. Update the returned object.
- [ ] **Step 4: Run; confirm passes.**
- [ ] **Step 5: Full gate + `check:surface --update`** (the removed exports drift the snapshot, the disclosure). Commit.

---

## Task 5: Showcase catch-all wiring and e2e

Prove the whole read path against a consumer.

**Files:**
- Modify: `examples/showcase/src/lib/cairn.config.ts` (mark the Posts concept's taxonomy field, e.g. a `topics` multiselect with `taxonomy: true`), `examples/showcase/src/routes/(site)/[...path]/+page.server.ts` (call `resolveRoute`, 404 on undefined), `examples/showcase/src/routes/(site)/[...path]/+page.svelte` (branch by `data.kind`), and seed a couple of tagged posts.
- Create: `examples/showcase/e2e/tags.spec.ts` (a tag archive renders its entries).

**Steps:**

- [ ] **Step 1: From-scratch showcase install** so the `file:` deps point at the worktree engine: `rm -rf examples/showcase/{node_modules,package-lock.json}` then `npm install` in `examples/showcase`.
- [ ] **Step 2: Mark the taxonomy field and seed tagged posts.** Add `topics: fields.multiselect({ label: 'Topics', creatable: true, taxonomy: true })` to the Posts concept; give two seed posts overlapping `topics`.
- [ ] **Step 3: Wire the catch-all, preserving reference resolution.** `+page.server.ts` calls `routes.resolveRoute({ url })`, throws `error(404)` on undefined, and branches on the resolved `kind`. **Preserve the existing `resolveReferences` glue**: today this load runs `resolveReferences(site, descriptor, data.entry.frontmatter)` (keyed on `data.concept`) after `entryLoad` and returns `{ ...data, references }`, and `+page.svelte` renders `data.references.author`/`.related`. After the rewire, that block moves INSIDE the `kind === 'entry'` branch (only the entry payload has `entry.frontmatter`); the `tagIndex`/`tagArchive` branches return their data unchanged. `+page.svelte` switches on `data.kind` to render the entry (with its references), the tag index (links via the engine-built paths), or the tag archive. Without this, the rewire silently drops author/related links (`golden-path.spec.ts` exercises them).
- [ ] **Step 4: Write the e2e.** `tags.spec.ts`: visit the tag archive URL for a seeded tag, assert the page lists the tagged posts. Make it retry-safe and sidebar/section-scoped per the existing e2e conventions.
- [ ] **Step 5: Run the e2e** (`CI=1 npm --prefix examples/showcase run test:e2e`). Confirm green. Confirm the prerender enumerates the tag paths (Task 3's `entries()`). Confirm the existing `golden-path.spec.ts` (which renders an entry's author/related references) stays green, which proves the `resolveReferences` rewire preserved entry-kind references through the new discriminated load.
- [ ] **Step 6: Commit** the showcase changes and the e2e.

---

## Task 6: Test-infra riders, docs, and the consumer migration

Fold the two delivery-surface friction items, document the reshape, and clear the gates.

**Files:**
- Modify: `vitest.config` / the test project config (serialize the `delivery-data-dist-spawn` cold-import specs into their own non-concurrent project), `examples/showcase/e2e/spellcheck.spec.ts` (settle-aware assertion).
- Modify: `docs/reference/delivery.md`/`delivery-data.md` (remove the four loaders, document `resolveRoute` and `ResolvedRoute` with `Stability tier: Extension API`), `CHANGELOG.md`, `docs/guides/upgrade-cairn.md` (the second `Consumers must`: branch the catch-all by `data.kind`).

**Steps:**

- [ ] **Step 1: Serialize the cold-import specs.** Give the `delivery-data-dist-spawn` cold-import tests their own non-concurrent Vitest project (or raise the spawn timeout) so they stop flaking under full-suite IO load. Run the suite to confirm stability.
- [ ] **Step 2: Fix the spellcheck e2e flake.** Replace the single `toHaveCount(2)` with a settle-aware assertion (`expect.poll`/`toPass`, or await the editor's spellcheck-settle cue) so it stops reading `0` before the lint decorations settle.
- [ ] **Step 3: Reference docs.** Remove the four loaders from the delivery reference; document `resolveRoute`/`ResolvedRoute` with an Extension-API tier. Run `check:reference`, `check:reference:signatures`, `check:docs`.
- [ ] **Step 4: Migration.** Add the second `Consumers must` (call `resolveRoute` from the catch-all `+page.server.ts`, branch `+page.svelte` on `data.kind`) to the CHANGELOG and upgrade guide.
- [ ] **Step 5: Full gate** including `check:surface` and the from-scratch consumer build + e2e. Commit.

---

## Self-review

- **Spec coverage.** The `tagSlug` codec + URL single home → Task 1; `taxonomyBase` → Task 2; the `resolveRoute` discriminated resolver + prefix-aware collision throw + slug→value index + tag-path enumeration → Task 3; the loader reshape → Task 4; showcase + e2e → Task 5; the two test-infra riders + the migration `Consumers must` → Task 6.
- **Premise check.** Routing resolution is the engine's job (it already owns entry-permalink resolution); rendering stays in the site's hands. No new actor or store.
- **Risk.** Task 3 is the correctness-critical piece: the exact-then-prefix algorithm, the prefix-aware collision throw, and the slug→value round-trip. Its collision and precedence tests are the locks. Task 1's consolidation must preserve permalink behavior (the parity tests are the guard). Task 4 removes public exports; the `check:surface` snapshot is the disclosure.
- **Interfaces consistent.** `tagSlug`/`tagArchivePath`/`parseTagPath` (Task 1) feed Task 3; `taxonomyBase` (Task 2) feeds Task 3's base registration; `resolveRoute`/`ResolvedRoute` (Task 3) feed Task 4 and the showcase (Task 5).
- **Adversarial plan review folded (2026-06-29).** The same six-lens workflow's confirmed findings, folded into Plan 2: the catch-all rewire (Task 5) must preserve the existing `resolveReferences` glue inside the `kind === 'entry'` branch (else author/related links silently regress, which `golden-path.spec.ts` guards); the "entry-permalink-that-looks-like-a-tag-path wins" runtime-precedence test is dropped as unobservable (the build-time collision throw is the guarantee, since `createSiteResolver` throws on that configuration before `resolveRoute` is callable); and the `entries()` tag-path enumeration applies the same leading-slash strip the existing `entries()` uses so the prerender paths match shape.

## Post-mortem (2026-06-29, COMPLETE)

All six tasks landed on `worktree-taxonomy-1`, each dispatched to `cairn-implementer` (Sonnet), test-first, with
the main loop reviewing every diff and clearing the full gate between dispatches. Commits: `f08819e` (Task 1),
`7d0b555` (Task 2), `84c4abf` (Task 3), `0792f43` (Task 4), `9fdf796` (Task 5), `f18f6b4` (Task 6).

**Built and verified:**
- **Task 1** `src/lib/content/url-policy.ts`: the one home for URL shaping. `permalink()` moved here behind a
  re-export shim (zero call-site churn, parity tests green). Added the `tagSlug`/`tagArchivePath`/`parseTagPath`
  codec.
- **Task 2** `taxonomyBase?: string` on `ConceptConfig`/`ConceptUrlPolicy`/`ConceptDescriptor`, validated
  root-relative + URL-safe, defaulting to `/<taxonomyFieldName>`.
- **Task 3 (correctness-critical)** `SiteResolver.resolveRoute(path): ResolvedRoute | undefined`: exact entry
  permalink wins, then the longest taxonomy-base prefix yields a tag index or a tag archive whose slug
  round-trips to its canonical value. Build-time: a per-concept slug→value index (throws on a slug collision)
  and a prefix-aware collision check over the full concrete route set (entry permalinks, bases, concrete archive
  paths). `entries()` enumerates the tag paths for prerender. Discriminating resolution + collision tests.
- **Task 4** collapsed `createPublicRoutes` onto one `resolveRoute(event)` returning the discriminated
  `ResolvedRouteData`; the entry kind folds the old `entryLoad` render/seo/hero body in byte-identical. Removed
  `entryLoad`/`archiveLoad`/`tagIndexLoad`/`tagLoad`.
- **Task 5** the showcase catch-all rewired to `resolveRoute`, branching by `data.kind`; the `resolveReferences`
  glue preserved inside the entry branch (`golden-path.spec.ts` stayed green, proving no reference regression).
  New `tags.spec.ts` e2e. From-scratch showcase install so its `file:` deps point at the worktree engine.
- **Task 6** test-infra riders (the `delivery-data-dist-spawn` cold-import spec serialized into its own
  non-concurrent `unit-dist-spawn` Vitest project; the spellcheck e2e made settle-aware with `toPass`), the
  loader-reshape reference docs, the promoted `ResolvedRoute`/`ResolvedRouteData` exports, and the second
  `Consumers must` migration block.

**Verified:** full gate green at each task; final-tree `npm run check` 0/0, `npm test` exit 0 (2809 tests); all
doc/surface gates; from-scratch showcase e2e `CI=1` 46 passed (including `golden-path` and the new `tags.spec`,
and the now-settled `spellcheck.spec`). `code-simplifier` found nothing to refine. The pass-end adversarial
review workflow (six dimensions, every finding verified) returned **zero confirmed findings**.

**Decisions locked:**
- **`tagSlug` + `tagArchivePath` are public exports.** The spec states "the tag-index page links via tagSlug",
  so the slug codec is consumer-facing for link construction; `parseTagPath` stays internal (resolution is the
  engine's job). The review's charter finder questioned this as possible surface creep; the verifier refuted it
  (spec-mandated, the leanest seam for a consumer to build tag links). Considered and justified.
- **`slugFromId` was NOT relocated into `url-policy`** (Task 1 deviation, ratified). It is tightly coupled to the
  id/filename cluster (`composeDatedId`/`renameId`) in `ids.ts`; extracting just the date-prefix stripping would
  force `ids.ts` to import back from `url-policy` and create worse coupling than it removes. `permalink()` was the
  genuinely standalone URL-assembly piece, and moving it satisfies the "one home" intent at zero risk.
- **`archiveLoad` removed, not relocated.** A consumer needing a concept's chronological archive calls
  `site.concept(id).all()`; the showcase catch-all only ever used `entryLoad`, so no showcase use dropped.
- The runtime-precedence test stays dropped as unobservable; the build-time collision throw is the guarantee.

**Breaking surface (both plans, one minor):** two `Consumers must` changes under the `## Unreleased` window —
mark the taxonomy field with `taxonomy: true` (default tag base is the field name), and branch the catch-all by
`data.kind`. Public exports added: `feedView`, `sitemapView`, `tagSlug`, `tagArchivePath`, `ResolvedRoute`,
`ResolvedRouteData`. Removed: `entryLoad`, `archiveLoad`, `tagIndexLoad`, `tagLoad`.
