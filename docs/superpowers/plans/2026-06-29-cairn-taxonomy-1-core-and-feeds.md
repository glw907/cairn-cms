# Taxonomy Plan 1: Core and Feeds (data layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the reserved `taxonomy` marker to the existing tag surface (read the marked field, not the hardcoded `tags` key) and make the `inFeeds`/`routable` routing flags load-bearing in engine feed and sitemap views with taxonomy-driven feed categories.

**Architecture:** A pure `resolveTaxonomyField` resolves the one top-level multiselect field a concept marks `taxonomy: true`; the content index reads that field's validated value for `ContentSummary.tags`. `fieldset()` enforces at most one marker and no nested marker, the mirror of the single-`seo`-image rule. New `feedView`/`sitemapView` projections filter concepts by their routing flags so a site stops re-deriving membership, and `feedView` populates `FeedItem.tags` from the taxonomy field.

**Tech Stack:** TypeScript, the existing `src/lib/content` and `src/lib/delivery` modules, Vitest.

## Global Constraints

- **Charter, premise-checked.** This is content-delivery work over the committed markdown, build-time, no runtime store, no new actor. Source: the spec's "Premise check".
- **Spec is canonical.** `docs/superpowers/specs/2026-06-28-cairn-taxonomy-tag-delivery-design.md`. This plan implements Components 1 and 3 and the reference-prose friction fix.
- **Glossary fixed.** A *taxonomy* is a concept's single multiselect field marked `taxonomy: true`; its values are *tags*. No "category" or "term" as cairn concepts; "category" appears only as feed output (RSS `<category>`, JSON Feed `tags`).
- **Read the VALIDATED value, never raw frontmatter** for the marked field, so a scalar coerces to an array.
- **No implicit `tags` fallback**, but a build advisory when an unmarked `tags`-named multiselect exists.
- **Gate before done (each task):** the task's targeted test, then `npm run check` (svelte-check 0/0), then `npm test` (exit 0), then the relevant doc/surface gate. Run `npm run package` before `check:surface`, `check:reference`, or `check:reference:signatures`. New public exports drift `check:surface` (regenerate with `--update`) and need a reference page with a `Stability tier:` marker.

---

## Task 1: `resolveTaxonomyField` and the `fieldset()` enforcement

A pure resolver for the marked field, plus the one-per-concept and no-nested-marker enforcement at fieldset construction (the mirror of `checkSeoImageFields`).

**Files:**
- Create: `src/lib/content/taxonomy.ts` (the pure `resolveTaxonomyField`; Plan 2 adds `tagSlug` here).
- Modify: `src/lib/content/fieldset.ts` (add `checkTaxonomyMarker`, called from `fieldset()` beside `checkSeoImageFields`; confirm the call site at the existing `fieldset()` constructor).
- Test: `src/tests/unit/content-taxonomy.test.ts` (the resolver), and extend `src/tests/unit/content-fieldset.test.ts` (the enforcement throw).

**Interfaces:**
- Produces: `resolveTaxonomyField(fields: NamedField[]): string | null` (imported by `NamedField` from `./types.js`), returning the `name` of the single top-level field whose descriptor has `taxonomy === true`, else `null`.
- Produces: `checkTaxonomyMarker(fields: Record<string, FieldDescriptor>): void` in `fieldset.ts`, throwing on more than one top-level marker or any nested marker (called inside `fieldset()`).

**Steps:**

- [ ] **Step 1: Write the failing resolver test.** In `content-taxonomy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTaxonomyField } from '../../lib/content/taxonomy.js';

describe('resolveTaxonomyField', () => {
  it('returns the name of the single marked top-level field', () => {
    const fields = [
      { name: 'title', type: 'text' as const },
      { name: 'topics', type: 'multiselect' as const, taxonomy: true },
    ];
    expect(resolveTaxonomyField(fields)).toBe('topics');
  });
  it('returns null when no field is marked', () => {
    expect(resolveTaxonomyField([{ name: 'tags', type: 'multiselect' as const }])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it; confirm it fails** (`resolveTaxonomyField` not defined). Run: `npx vitest run src/tests/unit/content-taxonomy.test.ts`.

- [ ] **Step 3: Implement `resolveTaxonomyField`.** In `taxonomy.ts`:

```ts
// cairn-cms: taxonomy resolution. A concept's taxonomy is the single top-level multiselect field
// it marks `taxonomy: true`; its values are the tags that drive the tag index, tag archives, and
// feed categories. resolveTaxonomyField names that field for the content index to read.
import type { NamedField } from './types.js';

/** The name of the single top-level field marked `taxonomy: true`, or null when none is. */
export function resolveTaxonomyField(fields: NamedField[]): string | null {
  const marked = fields.find((f) => f.type === 'multiselect' && f.taxonomy === true);
  return marked ? marked.name : null;
}
```

- [ ] **Step 4: Run the resolver test; confirm it passes.**

- [ ] **Step 5: Write the failing enforcement test.** In `content-fieldset.test.ts`, mirroring the existing `checkSeoImageFields` throw test: a fieldset with two `taxonomy: true` multiselects throws; one inside an `object`/`array` throws; one marked top-level passes. Use the real `fieldset({...})` constructor. Assert `expect(() => fieldset({ a: fields.multiselect({ taxonomy: true }), b: fields.multiselect({ taxonomy: true }) })).toThrow(/taxonomy/)`.

- [ ] **Step 6: Run it; confirm it fails.**

- [ ] **Step 7: Implement `checkTaxonomyMarker` and call it in `fieldset()`.** Mirror `checkSeoImageFields` exactly: recurse into `object`/`array` items; throw if any nested field carries `taxonomy: true` (naming the field and that the marker is top-level only), and throw if more than one top-level multiselect is marked (naming both). Call it in the `fieldset()` constructor next to `checkSeoImageFields`.

- [ ] **Step 8: Run the enforcement test; confirm it passes.**

- [ ] **Step 9: Full gate** (`npm run check` 0/0, `npm test` exit 0). Commit `src/lib/content/taxonomy.ts`, `src/lib/content/fieldset.ts`, the two test files.

---

## Task 2: The content index reads the marked field's validated value

Replace the hardcoded `asTags(raw.tags)` with the taxonomy-marked field's validated value, and emit a build advisory when a `tags`-named multiselect is unmarked.

**Files:**
- Modify: `src/lib/delivery/content-index.ts` (the `tags:` line at ~113; resolve the field once per index build off `descriptor.fields`; read `result.data[name]`; the advisory).
- Test: extend `src/tests/unit/delivery-content-index.test.ts`.

**Interfaces:**
- Consumes: `resolveTaxonomyField` (Task 1).
- Produces: unchanged `ContentSummary.tags` shape; its source is now the marked field. When unmarked, `tags` is `[]`.

**Steps:**

- [ ] **Step 1: Write the failing tests.** In `delivery-content-index.test.ts`, building a descriptor whose fieldset marks `topics` as the taxonomy:
  - a file with `topics: ['svelte','kit']` produces `tags: ['svelte','kit']`;
  - a file with a scalar `topics: svelte` produces `tags: ['svelte']` (the validator coerces; proves the validated read);
  - **a file with `topics: ['a']` AND a legacy `tags: ['b']` key produces `tags: ['a']`, never `['b']`** (proves the hardcoded read is gone, not supplemented);
  - a descriptor with no marked field produces `tags: []` even when the file has a `tags:` key.

- [ ] **Step 2: Run; confirm failures** (today's code reads `raw.tags`, so the legacy-key and unmarked cases fail). Run: `npx vitest run src/tests/unit/delivery-content-index.test.ts`.

- [ ] **Step 3: Implement the read.** In `createContentIndex`, before the entry loop, resolve once: `const taxonomyField = resolveTaxonomyField(descriptor.fields);`. Change the `tags:` line to read the validated value:

```ts
tags: taxonomyField ? asTags(result.data[taxonomyField]) : [],
```

(Note `result.data` is the validator's normalized output, in scope at content-index.ts:95-118; the multiselect validator already coerces a scalar to a one-element array, so `asTags` keeps the array.)

- [ ] **Step 4: Run; confirm passes.**

- [ ] **Step 5: Write the failing advisory test.** A descriptor with no `taxonomy: true` marker but a multiselect field literally named `tags` records a `ContentProblem`-style advisory (or a `log.warn`) at index build naming the concept and field. Decide the surface: prefer routing through the existing `ContentProblem`/aggregator path if a non-fatal channel exists; else `log.warn('taxonomy.unmarked_field', { concept, field })` once per index build. Pin the chosen channel in this step.

- [ ] **Step 6: Run; confirm it fails.**

- [ ] **Step 7: Implement the advisory.** When `taxonomyField === null`, scan `descriptor.fields` for a multiselect named `tags`, `freetags`, or `categories`; if found, emit the advisory once (not per entry, not a throw, since a deliberate non-taxonomy field of that name is legal).

- [ ] **Step 8: Run; confirm passes.**

- [ ] **Step 9: Full gate.** Commit `content-index.ts` and the test.

---

## Task 3: Engine feed and sitemap views with taxonomy categories

Add `feedView`/`sitemapView` projections that filter concepts by `inFeeds`/`routable`, populate `FeedItem.tags` from the taxonomy field, and emit RSS `<category>`.

**Files:**
- Modify: `src/lib/delivery/feeds.ts` (add `<category>` emission to `buildRssFeed` from `item.tags`).
- Create: `src/lib/delivery/views.ts` (the `feedView`/`sitemapView` projections over a `SiteResolver` + descriptors), OR add to `public-routes.ts` if it fits the factory; prefer a focused new module exported from `/delivery` and `/delivery/data`.
- Modify: `src/lib/delivery/index.ts` and `data.ts` (export the new views).
- Test: `src/tests/unit/delivery-feeds.test.ts` (the `<category>` emission), `src/tests/unit/delivery-views.test.ts` (the filtering).

**Interfaces:**
- Consumes: `SiteResolver` (`concept`, `all`), `ConceptDescriptor.routing` (`inFeeds`, `routable`), `resolveTaxonomyField`, `FeedItem`, `FeedChannel`, `buildRssFeed`/`buildJsonFeed`, `buildSitemap`.
- Produces: `feedView(site, descriptors): FeedItem[]` (items for the `inFeeds` concepts, each with `tags` from its taxonomy field) and `sitemapView(site, descriptors, origin): SitemapUrl[]` (URLs for the `routable` concepts). Confirm `SitemapUrl`'s shape in `sitemap.ts` and reuse it.

**Steps:**

- [ ] **Step 1: Write the failing RSS `<category>` test.** In `delivery-feeds.test.ts`: `buildRssFeed(channel, [{ ...item, tags: ['svelte','kit'] }])` emits `<category>svelte</category>` and `<category>kit</category>`; an item with no `tags` (or empty) emits no `<category>`.

- [ ] **Step 2: Run; confirm it fails.**

- [ ] **Step 3: Implement `<category>` in `buildRssFeed`.** In the item template, after `<description>`, add one `<category>${escapeXml(tag)}</category>` line per tag, filtered out when `item.tags` is absent or empty (mirroring the JSON builder's `item.tags && item.tags.length` guard at feeds.ts:115).

- [ ] **Step 4: Run; confirm passes.**

- [ ] **Step 5: Write the failing views test.** In `delivery-views.test.ts`, with a fixture site of three concepts (a `feed` concept with a `topics` taxonomy and a tagged entry, a `page` concept, an `embedded` concept):
  - `feedView` returns only the feed concept's items, and each item's `tags` are the entry's taxonomy values;
  - `sitemapView` returns the feed and page URLs but NOT the embedded concept's.

- [ ] **Step 6: Run; confirm it fails.**

- [ ] **Step 7: Implement `feedView`/`sitemapView`.** In `views.ts`: `feedView` iterates descriptors where `routing.inFeeds`, maps each concept's `index.all()` summaries to `FeedItem` (title, url = origin + permalink, date, summary = excerpt, `tags` = `summary.tags` when the concept has a taxonomy field), in date order. `sitemapView` iterates descriptors where `routing.routable`, maps `index.all()` to `SitemapUrl` (loc = origin + permalink, lastmod = updated ?? date). Both are pure over the resolver.

- [ ] **Step 8: Run; confirm passes. Export from `index.ts` and `data.ts`.**

- [ ] **Step 9: Full gate + `npm run package` + `node scripts/check-surface.mjs -- --update`** (the new exports drift the snapshot; the diff is the disclosure). Commit `feeds.ts`, `views.ts`, the barrels, the regenerated snapshot, the tests.

---

## Task 4: Reference docs, the `mintToken` prose fix, and gates

Document the new exports with stability tiers, fix the stale `mintToken` reference prose (the folded friction item), and clear the doc gates.

**Files:**
- Modify: `docs/reference/delivery.md` and `docs/reference/delivery-data.md` (document `feedView`/`sitemapView` with `Stability tier: Extension API`, since a public page calls them, and the `Stability` table column per the Plan 2 enforcement already in place).
- Modify: `docs/reference/sveltekit.md` and `docs/reference/admin-routes.md` (remove the stale `mintToken` dep prose on `createCairnAdmin`/`createContentRoutes`; the dev backend rides `event.locals.backend`, and `CairnAdminDeps` no longer carries `mintToken`).
- Modify: `CHANGELOG.md`, `docs/guides/upgrade-cairn.md` (the per-version entry; see the spec's Breaking change section for the version rule — the first free minor after `0.77.0` publishes, verified with `npm view`).

**Steps:**

- [ ] **Step 1: `git grep mintToken docs/`** to enumerate the stale prose. Reword each so it describes the current `CairnAdminDeps`/`ContentRoutesDeps` (the dev backend rides `event.locals.backend`), not a `mintToken` dep.

- [ ] **Step 2: Document `feedView`/`sitemapView`** in the delivery reference pages with their signatures and a `Stability tier: Extension API` marker (the form the enforcement gate checks).

- [ ] **Step 3: Add the CHANGELOG and upgrade-guide entries** for the taxonomy-marker breaking change (mark the field; the default tag base is the field name). Do NOT set the version number until release; leave a clear placeholder per the spec's version rule, or align with the held-release process at cut time.

- [ ] **Step 4: Run all doc gates** (`npm run package` first): `check:reference`, `check:reference:signatures`, `check:docs`, `check:surface`. All green.

- [ ] **Step 5: Commit** the docs.

---

## Self-review

- **Spec coverage.** Component 1 (`resolveTaxonomyField`, validated read, `fieldset()` enforcement, advisory) → Tasks 1-2; Component 3 (feed categories, `inFeeds`/`routable` views) → Task 3; the `mintToken` reference-prose friction item → Task 4. Plan 2 covers Component 2 (routing).
- **Premise check.** Every task is content-delivery data work over the committed markdown; no new actor, store, or runtime surface.
- **Risk.** Task 2's validated-read change is the correctness-critical piece (the breaking-change guarantee); its discriminating test (a `topics`-marked field beside a legacy `tags:` key yields only `topics`) is the lock. Task 3's `feedView` mapping must read the taxonomy field per concept, not a hardcoded key.
- **Interfaces consistent.** `resolveTaxonomyField(fields: NamedField[]): string | null` is produced in Task 1 and consumed in Tasks 2-3; `feedView`/`sitemapView` are produced in Task 3 and documented in Task 4.
