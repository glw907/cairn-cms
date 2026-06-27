# Contract v2 phase 3b: adapter restructure + concept model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (main-loop orchestrate-and-verify, the cairn default) to implement this plan. Steps use checkbox (`- [ ]`) syntax. **Read the "Execution model" section first: Task 1 gates green on its own; Tasks 2-8 are ONE atomic compile unit and do NOT gate green individually; Task 9 is the single full gate.**

**Goal:** Restructure the author-facing `CairnAdapter` into six subsystem groups and open the concept model (`defineConcept`, an open `content` record, declared routing replacing the hardcoded `CONCEPT_ROUTING` table, URL policy moving from the YAML site-config into the concept, and `siteName` de-duplication).

**Architecture:** The change has an additive half and a breaking half. The additive half adds `defineConcept` (a typed authoring factory that also validates its URL policy at declaration time), a `resolveRouting` shorthand resolver, and inert optional `routing`/`permalink`/`datePrefix` fields on `ConceptConfig`. The breaking half retypes `CairnAdapter` from 17 flat keys into six groups (`content`, `backend`, `email`, `rendering`, `media`, `editor`), renames the concept's `schema:` member to `fields:`, switches `normalizeConcepts` to read routing and URL policy off the concept, drops `siteName` from the adapter (the YAML becomes canonical), and removes the now-dead `SiteConfig.url`. `CairnRuntime` stays flat; `composeRuntime` is the one place that maps adapter groups onto the flat runtime.

**Tech Stack:** TypeScript, Svelte 5 (runes), SvelteKit 2, Vitest (unit + integration in workerd/miniflare + component in a real browser), Playwright (showcase e2e), `svelte-package` + the dist-`.svelte` transpile step.

## Global Constraints

- **Breaking within the 0.x window. Version bump: `0.72.0`** (minor; the held-unpublished window becomes `0.69.0`-`0.72.0`). Consumers migrate; the two production sites (ecxc-ski, 907-life) stay pinned to the prior published range until they cut over. Do not publish; the v2 series stays held until render + islands land.
- **`CairnRuntime` stays FLAT. Regroup the adapter ONLY.** The runtime is the engine-internal seam-2 output; regrouping it would touch ~80 `runtime.*` readers (`runtime.backend` alone has ~40 reads in `content-routes.ts`) and ~20 runtime test fixtures for no author-facing benefit. `composeRuntime` maps adapter groups onto the unchanged flat runtime. Correct STATUS.md's "CairnAdapter/CairnRuntime" wording at pre-bake.
- **No back-compat shim.** Held unpublished, so the showcase migrates in lockstep and the old shape is removed outright.
- **The gate (run once at the end, Task 9):** `npm run check` 0 errors AND 0 warnings; `npm test` EXIT 0 (a passing assertion count is not enough; an unhandled rejection can exit 1 with all tests green); `npm run check:comments` (the ESLint TSDoc + em-dash gate, CI-only and not covered by `check`); the four doc gates `check:reference`, `check:reference:signatures` (CI-only; run by name), `check:package`, `check:docs`; `check:version` (minor → `0.72.0`); and the showcase e2e proven against a **from-scratch consumer build** (`rm -rf examples/showcase/{node_modules,package-lock.json}`, fresh install, `npm run build`), or a pushed CI `e2e` run.
- **`check` is svelte-check with 0 warnings.** An unused exported interface left mid-migration is a TS6133 warning that fails the gate. Couple each interface-body delete with its barrel-export prune.
- **`.svelte` is not type-checked by ESLint** (the Svelte sub-parser is unwired). A missed `.svelte` adapter-key read fails silently at runtime; the component tests and the e2e are the only net.
- **The Vite plugin reads the adapter through a string-templated virtual module that the type checker cannot parse** (`src/lib/vite/index.ts` `adapterFactsSource`). `npm run check` stays green even when it breaks. The from-scratch e2e is the load-bearing gate for that file specifically.
- **A version bump must also sync the ROOT lockfile self-version** (`check:version` misses it; CI `npm ci` needs it). Run `npm install --package-lock-only` after the bump.
- TSDoc on every exported symbol; no em dash in code comments (`house/no-em-dash-in-comments`); document the contract, never the type the signature already states.

---

## Execution model (read before dispatching)

The change splits into an additive task, one atomic unit, and a final gate, mirroring the proven field-migration cutover (`docs/superpowers/plans/2026-06-26-cairn-contract-v2-cutover.md`).

- **Task 1 is pure-additive groundwork.** It gates green on its own and is a normal gated `cairn-implementer` dispatch.
- **Tasks 2-8 are ONE atomic compile unit.** The instant `CairnAdapter` retypes to six groups and `ConceptConfig.schema` renames to `fields`, every adapter consumer across `src/lib`, the showcase, and the adapter-shaped test fixtures breaks at once; `npm run check` (0 warnings) cannot pass at any mid-migration point. Execute 2-8 as a single coherent effort in the **main loop** (the cross-file lockstep coordination and the type-invisible Vite-string change make this unsuitable for an unmonitored single Sonnet dispatch). Write all new v2 tests, migrate every consumer and fixture in lockstep, and gate once at the end of Task 8. The task split below is for review legibility and ordering, not for independent green gates.
- **Task 9 gates green again** (dist rebuild + from-scratch e2e + the single full gate).

The one legitimate intermediate `npm run check` is at the end of Task 1 (additive, still green).

**Key simplifying principle:** because `CairnRuntime` stays flat, a test fixture is *runtime-shaped* (passed to `createContentRoutes`/`createNavRoutes`/`cairn-admin`/`createHealthRoutes`, carrying `manifestPath`/`mediaManifestPath` flat) and is **unchanged**, or it is *adapter-shaped* (passed to `composeRuntime`/`defineAdapter`/`resolveConcepts`/`siteDescriptors`, or a `ConceptConfig` literal with `schema:`) and **migrates**. Distinguish by what the fixture is passed to. Only adapter-shaped fixtures and `ConceptConfig`/`schema:` literals migrate.

---

## File map

**Created:**
- `src/tests/unit/routing.test.ts` — `resolveRouting` golden-value equality tests (Task 1, additive).
- `src/tests/unit/define-concept.test.ts` — `defineConcept` factory and its declaration-time URL-policy validation (Task 2, atomic unit).

**Modified (engine):**
- `src/lib/content/concepts.ts` — add `resolveRouting` + `ROUTING_SHORTHANDS`; export `validateUrlPolicy`; add `defineConcept`; switch `normalizeConcepts` to read `config.routing`/`config.permalink`/`config.datePrefix` and drop its `routing`/`urlPolicy` params; `schema`→`fields` reads; drop `CONCEPT_ROUTING`/`DEFAULT_ROUTING`; `resolveConcepts(content)` drops `siteConfig`.
- `src/lib/content/types.ts` — retype `CairnAdapter` (six groups, drop `siteName`/path knobs); open `content` to `Record<string, ConceptConfig>`; rename `ConceptConfig.schema`→`fields`; add `ConceptConfig.routing?`/`permalink?`/`datePrefix?`; leave `ConceptDescriptor` (both its `fields: NamedField[]` and `schema: Fieldset`) unchanged.
- `src/lib/content/compose.ts` — map adapter groups onto the flat runtime; `siteName: siteConfig.siteName`; default the three path knobs (no longer read from the adapter); `resolveConcepts(content)`.
- `src/lib/index.ts` (the barrel; there is no `src/lib/content/index.ts`) — export `defineConcept`; drop the `CONCEPT_ROUTING` export.
- `src/lib/nav/site-config.ts` — remove `SiteConfig.url` and `SiteConfig.content` (the URL-policy map); remove `urlPolicyFrom`; add the hard-error in `parseSiteConfig` on a stale `content:` block.
- `src/lib/vite/index.ts` — `adapterFactsSource` reads `cairn.email`/`cairn.media` (was `sender`/`assets`); update the `AdapterFacts` doc comments.
- `src/lib/doctor/checks-local.ts` — retire the `configSiteConfig` synthetic-concept check (replaced by `defineConcept`'s declaration-time validation + the parse hard-error).
- `src/lib/delivery/site-descriptors.ts` — `resolveConcepts(adapter.content)` (drop `siteConfig`).

**Deleted:** none (symbols removed in place).

**Migrated (tests + fixtures):** see addendum **R1** for the COMPLETE grep-derived set (this list is incomplete). It covers `_content-fixture.ts` (with `routing: 'feed'` on posts) plus `content-concepts`, `content-compose`, `compose`, `compose-icons`, `content-adapter`, `delivery-site-indexes`, `delivery-site-descriptors`, `delivery-generic-frontmatter`, `delivery-concept-generic`, `delivery-content-index`, `delivery-site-resolver`, `delivery-site-resolver-validation`, `delivery-manifest`, `public-routes`, `public-routes-seo`, `content-permalink-parity`, `doctor-checks-local`, `vite-verify-references`, `nav-site-config`, `delivery-exports`.

**Migrated (consumer + docs):** `examples/showcase/src/lib/cairn.config.ts`; the three showcase `cairn.siteName` readers (`(site)/[...path]/+page.server.ts:12`, `feed.xml/+server.ts:23`, `feed.json/+server.ts:23`); `CHANGELOG.md`; `docs/guides/upgrade-cairn.md`; and the COMPLETE published-docs set in addendum **R5** (`core.md`, `define-an-adapter-and-schema.md`, the tutorial, `structured-fields.md`, `link-content-with-references.md`, `wire-the-delivery-surface.md`, `admin-routes.md`, `components.md`, `delivery.md`, `delivery-data.md`, `sveltekit.md`, `vite.md`, `doctor.md`, `content-model.md`).

---

## Locked decisions (the residual forks, resolved)

Settled in the brainstorm and the three-lens pre-plan adversarial sweep (`scratchpad/3b-sweep-triage.md`). Defaults below are what the tasks implement.

1. **Adapter-only restructure; `CairnRuntime` stays flat.** (sweep B1) `composeRuntime` is the one mapping site.
2. **Spec-aligned group + key names.** `content`, `backend` (unchanged key), `email` (was `sender`), `rendering: { render, components (was registry), icons }`, `media` (was `assets`), `editor: { preview, nav (was navMenu), supportContact }`. Inner config types are unchanged; only keys and nesting move. `islands` is deferred to the render phase. The internal path knobs (`manifestPath`, `mediaManifestPath`, `dictionaryPath`) leave the public adapter and default by convention in `composeRuntime`; they return as a `paths` group only if a real need appears.
3. **`defineConcept` does work: declaration-time URL-policy validation.** (sweep B-urlgate) `defineConcept<const C extends ConceptConfig>(concept: C): C` mirrors `defineAdapter`, and additionally calls `validateUrlPolicy` so a bad permalink fails at module-eval, for every concept, before any content loads. This replaces the zero-entry coverage the retired doctor check provided.
4. **`schema:`→`fields:` is an atomic rename, not an additive alias.** (sweep M2) Excess-property under 0-warnings forbids an alias. Rename ONLY `ConceptConfig.schema`. Leave `ConceptDescriptor.schema: Fieldset` and `ConceptDescriptor.fields: NamedField[]` exactly as they are. In `concepts.ts`, use a local alias `const fs = config.fields` to avoid the awkward `config.fields.fields`.
5. **Single shorthand resolution point.** (sweep M3) `resolveRouting(routing): RoutingRule` is the sole expander. `normalizeConcepts` is the sole setter of `ConceptDescriptor.routing`, always the concrete `RoutingRule` (never the union). `defineConcept` calls `resolveRouting` only ephemerally, to get the `dated` flag for validation; it does not store the expanded form. `ConceptConfig.routing` stays the union.
6. **Omitted `routing` defaults to `'page'` = `{routable:true, dated:false, inFeeds:false}`** (today's `DEFAULT_ROUTING`). Omitted `datePrefix` defaults to `'day'` (preserving `concepts.ts:134`). `defineConcept` resolves the shorthand BEFORE validating, so the `dated` flag is correct.
7. **`inFeeds` is a consumer-read hint, not an engine filter, in 3b.** (sweep #2) No engine code reads `routing.inFeeds`; the consumer's feed and sitemap routes decide membership. Document the precise semantics: `routable` drives the sitemap, `inFeeds` the RSS/Atom feeds, `dated` the date handling. ROADMAP "engine-provided inFeeds/routable feed + sitemap views" for the render/delivery phase. Do not widen 3b's engine surface.
8. **Hard-error on stale YAML URL policy.** (sweep B3) After 3b, a `content:` block in the YAML site-config is a parse error pointing to `defineConcept`, so a site cutover cannot half-migrate and silently default-corrupt its permalinks (ecxc-ski carries `datePrefix: month`; the silent fallback to `day` rewrites every post URL). The per-site transcription is a ROADMAP watch on the site cutover.
9. **`siteName` is YAML-canonical.** Drop `CairnAdapter.siteName`; `composeRuntime` reads `siteConfig.siteName`. Repoint the showcase's three direct `cairn.siteName` reads to `siteConfig.siteName`.
10. **`SiteConfig.url` is removed** (zero readers; origin stays `PUBLIC_ORIGIN`-only, and the delivery layer is already parameterized on `origin`). A stray `url:` in a site YAML is swallowed by the index signature and becomes harmless dead data; not a breaking parse change.

---

## Review addendum (folded from the pre-implementation adversarial workflow)

A find-then-verify workflow over this plan confirmed 18 findings (9 blocker, 6 major). The dominant gap: the hand-enumerated test and doc migration lists were incomplete, and two "if it becomes unused" hand-waves hid a signature-gate break and a stale-dist gate failure. These amendments **supersede** the affected task enumerations; where this addendum and a task disagree, the addendum wins.

**R1. The complete test-migration set (supersedes Task 6 Step 5 and the File-map test list).** Derive it mechanically, then migrate each: `grep -rln 'normalizeConcepts(\|composeRuntime(\|resolveConcepts(' src/tests` UNION `grep -rln 'schema:' src/tests`, keeping only adapter-shaped / `ConceptConfig`-shaped occurrences (the "distinguish by what the fixture is passed to" rule). The confirmed set and its per-file work:
- `src/tests/**/_content-fixture.ts` — the shared fixture. Its `posts` concept MUST declare `routing: 'feed'` (and `pages` `routing: 'page'` or omit). Otherwise every dated-behavior test riding the fixture silently breaks, because an omitted `routing` defaults to non-dated `'page'`.
- `content-concepts.test.ts` — rewrite the routing contract (Task 6 Step 2); and the `describe('normalizeConcepts URL policy')` block (~lines 62, 84, 182-223) passes the removed 2nd/3rd args. MOVE the still-valid throw cases (leading-slash, unknown token `:category`, date-token-on-non-dated, out-of-range `datePrefix`, valid-policy acceptance) into `define-concept.test.ts` rephrased as `defineConcept` calls; DELETE the two "URL policy names an undeclared concept" cases (no v2 counterpart).
- `content-compose.test.ts` — the Step 4 siteName fixup AND rewrite the `describe('composeRuntime URL policy')` block (~40-51): it builds a `SiteConfig.content` literal and asserts the permalink derives from it. Rewrite to the concept-declared-permalink path. (This fails only `npm test` at runtime; `check` passes because the index signature absorbs the stray `content` key.)
- `compose.test.ts` — adapter-shaped, distinct from `content-compose.test.ts`. Migrate its `adapter` helper (siteName→siteConfig, `sender`→`email`, `render`→`rendering.render`, `assets`→`media`, `supportContact`→`editor.supportContact`, `preview`→`editor.preview`, `schema:`→`fields:`). DELETE the two "honors an adapter override" subtests (`manifestPath` ~60, `mediaManifestPath` ~110): the override knobs leave the public adapter. KEEP the "defaults the path" subtests (~56-58, ~105-107) asserting the now-hardcoded defaults.
- `compose-icons.test.ts` — adapter literal (siteName/sender/render/content `schema:`). Migrate.
- `content-adapter.test.ts`, `delivery-site-indexes.test.ts`, `delivery-site-descriptors.test.ts`, `delivery-generic-frontmatter.test.ts`, `delivery-concept-generic.test.ts` — migrate; keep the `expectTypeOf` assertions.
- `delivery-content-index.test.ts`, `delivery-site-resolver.test.ts`, `delivery-site-resolver-validation.test.ts`, `public-routes.test.ts`, `public-routes-seo.test.ts`, `delivery-manifest.test.ts` — `schema:` literals and/or positional `urlPolicy` args; apply R2.
- `content-permalink-parity.test.ts` — its premise (content-index vs manifest permalink parity driven by the YAML url-policy 2nd arg) is obsolete. Re-express against concept-declared URL policy, or retire if `define-concept` + `normalizeConcepts` coverage subsumes it.
- `doctor-checks-local.test.ts` — drop the synthetic-concept permalink/date-token cases (they move to `define-concept.test.ts`).
- `vite-verify-references.test.ts` — migrate its inline adapter literal (Task 4).
- `nav-site-config.test.ts` — delete the `describe('urlPolicyFrom')` block (~218-227) and its import (line 10); ADD a positive case that `parseSiteConfig` throws (pointing to `defineConcept`) on a stale `content:` block, plus a companion that a content-free config parses (R3, decision 8).
- `delivery-exports.test.ts` — remove the `urlPolicyFrom` export assertion (~line 25); keep the `parseSiteConfig` one.
- NOT `admin-dispatch.test.ts` (it calls `normalizeConcepts(testAdapter.content)` and rides the `_content-fixture.ts` migration).

**R2. Positional-argument fold-in rule (new Task 6 sub-step).** For every `normalizeConcepts(content, urlPolicy, routing)` call passing the 2nd/3rd positional args, delete those args and fold `permalink`/`datePrefix`/routing onto the concept literal. Before: `normalizeConcepts({ posts: { dir, schema: fieldset({...}) } }, { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } })`. After: `normalizeConcepts({ posts: { dir, fields: fieldset({...}), permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } })`. These are logic rewrites, not mechanical renames. Any concept asserting dated behavior must also declare `routing: 'feed'` (or an explicit dated rule).

**R3. Complete the `urlPolicyFrom` removal (amends Task 5).** It is a PUBLIC barrel export, not an internal helper. Prune `urlPolicyFrom` from `src/lib/index.ts` (~line 129) in lockstep with deleting the symbol (re-exporting a deleted symbol is a TS error). Its tests are in R1; its docs are in R5.

**R4. Keep the public delivery signatures (decision; amends Task 3 Step 5).** `siteDescriptors(adapter, siteConfig)`, `createSiteIndexes`, and `buildSiteManifest` KEEP their `siteConfig` parameter. Pruning it breaks the `docs/reference/delivery-data.md` signature gate and forces repoints in `site-indexes.ts`, `manifest.ts`, and the showcase. Internally they call `resolveConcepts(adapter.content)` (no `siteConfig` for URL policy). Only the internal `resolveConcepts` drops the `siteConfig` parameter; the delivery entry points retain it for API stability and the menus/siteName it still carries. Confirm `resolveConcepts` is not separately reference-documented; if it is, update that entry.

**R5. The complete docs-migration set (supersedes Task 8 Step 1 and the File-map docs list).** No doc gate parses these snippets, so a final manual grep is the only net.
- TUTORIAL (highest priority, also runtime-breaking): `docs/tutorial/build-your-first-cairn-site.md` — drop adapter `siteName:`; `sender:`→`email:`; `schema:`→`fields:`; `navMenu`→`editor.nav`; `cairn.render/registry/icons`→`cairn.rendering.render/.components/.icons`; `cairn.siteName`→`siteConfig.siteName`; and CRITICAL: rewrite the YAML `content:` URL-policy blocks (milestones 6 and 7, and the dev-backend seed) into `defineConcept`, because Task 5's hard-error makes that YAML throw for a 3b reader.
- GUIDES: `structured-fields.md` and `link-content-with-references.md` (`schema:`→`fields:`); `wire-the-delivery-surface.md` (`cairn.render`→`cairn.rendering.render`, `cairn.siteName`→`siteConfig.siteName`).
- REFERENCE: `core.md` (the `normalizeConcepts` block → the 1-arg signature and fix its `urlPolicyFrom(siteConfig)` example; DELETE the `CONCEPT_ROUTING` section and the `urlPolicyFrom` section, both documenting removed exports and both invisible to the coverage gate; the `ConceptConfig` prose `schema`→`fields` plus routing/permalink/datePrefix; the new `defineConcept` entry); `admin-routes.md`, `components.md`, `delivery.md`, `delivery-data.md`, `sveltekit.md` (render/registry/icons reads); `vite.md` and `doctor.md` (`cairn.sender.from`→`cairn.email.from`).
- EXPLANATION: `content-model.md` — rewrite the "three places for one address" framing; `defineConcept` is the URL-policy home.
- DO NOT touch `createAuthRoutes({ branding: { siteName } })` (sveltekit.md:188, components.md); that `siteName` is the auth-branding prop, unaffected by dropping `CairnAdapter.siteName`.
- ACCEPTANCE (new Task 8 step): grep `docs/{reference,guides,explanation,tutorial}` for `schema: fieldset`, adapter-context `sender:`, `cairn.siteName`, `cairn.sender`, `cairn.assets`, `cairn.registry`, `cairn.icons`, `cairn.render`, `navMenu`, and a YAML `content:` URL-policy block; confirm zero hits outside the auth-branding exception.

**R6. Rebuild dist before the atomic-unit gate (new Task 8 Step 0).** `vite-verify-references.test.ts` is a dist-spawn test: its nested Vite build imports `buildSiteManifest` from `@glw907/cairn-cms/delivery/data` (the dist, via the `node_modules/@glw907/cairn-cms` self-symlink), which calls the dist's `normalizeConcepts`. The atomic unit changes that dist source (`schema`→`fields`), `npm test` has no pretest rebuild, and `npm run check` does not package. Run `npm run package` before the Task 8 gate, or the migrated `fields:` literal feeds the stale dist's `config.schema.fields` read and throws (the `worktree-needs-dist-build` discipline).

**R7. The barrel lines (precise).** `src/lib/index.ts:30` exports `CONCEPT_ROUTING, normalizeConcepts, findConcept` from `./content/concepts.js` — drop only `CONCEPT_ROUTING`. Add `defineConcept` from `./content/concepts.js` beside `defineAdapter` (`:39`). Prune `urlPolicyFrom` (`:129`).

---

### Task 1: `resolveRouting`, inert `ConceptConfig` URL-policy fields, `SiteConfig.url` removal

**Additive. Gates green on its own.** `defineConcept` is NOT here: it is typed `<const C extends ConceptConfig>` and its test passes `fields:`, so it cannot compile until the `schema`→`fields` rename lands. It moves to the atomic unit (Task 2). Everything in this task is genuinely additive and independent of that rename.

**Files:**
- Modify: `src/lib/content/types.ts` (add optional `routing?`/`permalink?`/`datePrefix?` to `ConceptConfig`; additive and inert until Task 3 reads them)
- Modify: `src/lib/content/concepts.ts` (add `ROUTING_SHORTHANDS`, `resolveRouting`; export `validateUrlPolicy`)
- Modify: `src/lib/nav/site-config.ts` (remove the dead `SiteConfig.url` field)
- Create: `src/tests/unit/routing.test.ts`

**Interfaces:**
- Produces: `resolveRouting(routing: 'feed' | 'page' | 'embedded' | RoutingRule | undefined): RoutingRule`; `validateUrlPolicy(id: string, policy: ConceptUrlPolicy, dated: boolean): void` (now exported, consumed by `defineConcept` in Task 2).

- [ ] **Step 1: Add the inert optional fields to `ConceptConfig`.** In `src/lib/content/types.ts`, in `ConceptConfig` (the interface at ~63-77, still carrying `schema:` at this task), add:

```ts
  /**
   * This concept's routing. A named shorthand (`'feed'` dated and in feeds, `'page'` a routable
   *  static page, `'embedded'` not routable) or an explicit rule. Omitted means `'page'`.
   */
  routing?: 'feed' | 'page' | 'embedded' | RoutingRule;
  /** The permalink pattern, root-relative, e.g. `/blog/:year/:slug`. Defaults by concept id. */
  permalink?: string;
  /** Date-prefix granularity for a dated concept's id-to-slug stripping. Defaults to `day`. */
  datePrefix?: DatePrefix;
```

Ensure `RoutingRule` and `DatePrefix` are in scope in the file (both are defined in `types.ts`).

- [ ] **Step 2: Write the failing test** `src/tests/unit/routing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveRouting } from '../../lib/content/concepts.js';

describe('resolveRouting', () => {
  it('expands the named shorthands to the exact rules and defaults to page', () => {
    expect(resolveRouting('feed')).toEqual({ routable: true, dated: true, inFeeds: true });
    expect(resolveRouting('page')).toEqual({ routable: true, dated: false, inFeeds: false });
    expect(resolveRouting('embedded')).toEqual({ routable: false, dated: false, inFeeds: false });
    expect(resolveRouting(undefined)).toEqual({ routable: true, dated: false, inFeeds: false });
  });
  it('passes an explicit rule through unchanged', () => {
    const rule = { routable: true, dated: true, inFeeds: false };
    expect(resolveRouting(rule)).toEqual(rule);
  });
});
```

The `'page'` and omitted cases must equal the current `DEFAULT_ROUTING` (`{routable:true, dated:false, inFeeds:false}`), and `'feed'`/`'page'` must equal today's `CONCEPT_ROUTING.posts`/`.pages`, so no concept's routing silently changes.

- [ ] **Step 3: Run it to verify it fails.** Run: `npm test -- src/tests/unit/routing.test.ts`. Expected: FAIL (`resolveRouting` not exported).

- [ ] **Step 4: Implement in `src/lib/content/concepts.ts`.** Add after the existing `DEFAULT_ROUTING` (keep `CONCEPT_ROUTING`/`DEFAULT_ROUTING` for now; Task 3 removes them):

```ts
/** The named routing shorthands, each expanding to a concrete rule. */
const ROUTING_SHORTHANDS: Readonly<Record<'feed' | 'page' | 'embedded', RoutingRule>> = {
  feed: { routable: true, dated: true, inFeeds: true },
  page: { routable: true, dated: false, inFeeds: false },
  embedded: { routable: false, dated: false, inFeeds: false },
};

/** Expand a concept's routing shorthand to a concrete rule. The single resolution point: omitted is `page`. */
export function resolveRouting(routing: ConceptConfig['routing']): RoutingRule {
  if (routing === undefined) return ROUTING_SHORTHANDS.page;
  return typeof routing === 'string' ? ROUTING_SHORTHANDS[routing] : routing;
}
```

Change `validateUrlPolicy`'s declaration to `export function validateUrlPolicy(...)` (Task 2's `defineConcept` calls it; `normalizeConcepts` still calls it too).

- [ ] **Step 5: Remove the dead `SiteConfig.url`.** In `src/lib/nav/site-config.ts`, delete the `url?: string;` member (~line 78). The index signature keeps a stray YAML `url:` harmless; no reader exists.

- [ ] **Step 6: Run the test to verify it passes.** Run: `npm test -- src/tests/unit/routing.test.ts`. Expected: PASS.

- [ ] **Step 7: Gate.** Run `npm run check` (expect 0/0), `npm test` (expect exit 0), `npm run check:comments`. All green; this task is additive. (`resolveRouting` is module-exported but not barrel-exported, so no reference-doc gate applies; its TSDoc satisfies `check:comments`.)

- [ ] **Step 8: Commit** `feat(content): add routing shorthands and inert concept URL-policy fields`.

---

## Tasks 2-8: the atomic unit (gate ONCE at the end of Task 8)

Execute as a single coherent effort in the main loop. Write the new v2 tests and KEEP them red; migrate every consumer and fixture in lockstep; run no gate until Task 8's end.

### Task 2: Retype `CairnAdapter` into six groups, open `content`, rename `schema`→`fields`, add `defineConcept`

**Files:** `src/lib/content/types.ts`, `src/lib/content/concepts.ts`, `src/lib/content/index.ts`, `src/lib/index.ts`, `src/tests/unit/define-concept.test.ts` (create)

- [ ] **Step 1:** Replace the `CairnAdapter` interface (types.ts:181-242) with the six-group shape. Keep the inner config types (`BackendConfig`, `SenderConfig`, `AssetConfig`, `ComponentRegistry`, `IconSet`, `NavMenuConfig`, `PreviewConfig`) and the current `render` signature unchanged:

```ts
/** The single seam the engine consumes. A site implements this at `src/lib/cairn.config.ts`. */
export interface CairnAdapter {
  /** The site's concepts, keyed by id. Posts and pages are the documented defaults; a site may add more. */
  content: Record<string, ConceptConfig>;
  /** The commit backend (the GitHub App today). */
  backend: BackendConfig;
  /** The magic-link sender. */
  email: SenderConfig;
  /** The render subsystem: the one renderer, its directive vocabulary, and its icons. */
  rendering: {
    /** The one renderer the editor preview and every public page call. */
    render(
      md: string,
      opts?: {
        stagger?: boolean;
        resolve?: LinkResolve;
        resolveMedia?: import('../render/resolve-media.js').MediaResolve;
      },
    ): string | Promise<string>;
    /** The directive component registry (feeds the render and the insert palette). */
    components?: ComponentRegistry;
    /** The icon set the registry and admin chrome draw from. */
    icons?: IconSet;
  };
  /** R2 media: the bucket binding and image variants. Absent means media is off. */
  media?: AssetConfig;
  /** Admin-experience knobs. */
  editor?: {
    /** Preview-frame styling. */
    preview?: PreviewConfig;
    /** Which YAML menu the nav editor manages. */
    nav?: NavMenuConfig;
    /** A support contact surfaced in the admin. */
    supportContact?: string;
  };
}
```

`siteName`, `manifestPath`, `mediaManifestPath`, and `dictionaryPath` are gone from the adapter. Confirm `LinkResolve` is imported/in scope (it was used by the old `render` signature).

- [ ] **Step 2:** In `ConceptConfig` (types.ts:63-77), rename the `schema: S` member to `fields: S`. Leave the generic `<S extends Fieldset = Fieldset>`. The `routing?`/`permalink?`/`datePrefix?` added in Task 1 stay.

- [ ] **Step 3:** Leave `ConceptDescriptor` (types.ts:261-293) UNCHANGED: it keeps both `fields: NamedField[]` and `schema: Fieldset`. The runtime/descriptor layer does not rename.

- [ ] **Step 4:** Add `defineConcept` to `src/lib/content/concepts.ts` (now that `ConceptConfig.fields` exists). It mirrors `defineAdapter` and validates its URL policy at declaration, the replacement net for the doctor check Task 5 retires:

```ts
/**
 * Declare a concept while preserving its fieldset type for typed reads, and validate its URL policy at
 * declaration so a bad permalink or datePrefix fails at module load rather than at a defaulted render.
 * Mirrors {@link defineAdapter}; the validation is the build-independent net for a concept with no entries.
 */
export function defineConcept<const C extends ConceptConfig>(concept: C): C {
  validateUrlPolicy(
    concept.label ?? concept.dir,
    { permalink: concept.permalink, datePrefix: concept.datePrefix },
    resolveRouting(concept.routing).dated,
  );
  return concept;
}
```

Export `defineConcept` from `src/lib/index.ts` (the barrel; there is no `src/lib/content/index.ts`) beside `defineAdapter`.

- [ ] **Step 5:** Write the `defineConcept` tests RED in `src/tests/unit/define-concept.test.ts` (they stay red until the Task 8 gate):

```ts
import { describe, it, expect } from 'vitest';
import { defineConcept } from '../../lib/content/concepts.js';
import { fieldset, fields } from '../../lib/index.js';

describe('defineConcept', () => {
  const base = { dir: 'src/content/posts', fields: fieldset({ title: fields.text({ label: 'Title' }) }) };

  it('returns the concept unchanged and preserves the fieldset type', () => {
    const c = defineConcept({ ...base, routing: 'feed', permalink: '/blog/:year/:slug', datePrefix: 'day' });
    expect(c.permalink).toBe('/blog/:year/:slug');
  });
  it('throws at declaration on a permalink missing the leading slash', () => {
    expect(() => defineConcept({ ...base, permalink: 'blog/:slug' })).toThrow(/must start with/);
  });
  it('throws when a non-dated concept uses a date token', () => {
    expect(() => defineConcept({ ...base, routing: 'page', permalink: '/:year/:slug' })).toThrow(/date token/);
  });
  it('throws on an out-of-range datePrefix', () => {
    expect(() => defineConcept({ ...base, datePrefix: 'week' as never })).toThrow(/year, month, day/);
  });
});
```

(No gate here; the suite does not compile until Task 8.)

### Task 3: Switch `normalizeConcepts`/`resolveConcepts`/`compose` to read routing and URL policy off the concept

**Files:** `src/lib/content/concepts.ts`, `src/lib/content/compose.ts`, `src/lib/delivery/site-descriptors.ts`, `src/lib/content/index.ts`, `src/lib/index.ts`

- [ ] **Step 1:** In `concepts.ts` `normalizeConcepts`, drop the `urlPolicy` and `routing` parameters (signature becomes `normalizeConcepts(content: Record<string, ConceptConfig | undefined>): ConceptDescriptor[]`). Keep the param typed with `| undefined` so the `if (!config) continue` guard stays type-justified. Delete the URL-policy-key-naming loop (91-95). Inside the loop, replace:
  - `const declared = new Set(Object.keys(config.schema.fields));` → `const fs = config.fields;` then `Object.keys(fs.fields)`.
  - The reference-field loop's `Object.entries(config.schema.fields)` → `Object.entries(fs.fields)`.
  - `const conceptRouting = routing[id] ?? DEFAULT_ROUTING;` → `const conceptRouting = resolveRouting(config.routing);`.
  - `const policy = urlPolicy[id] ?? {};` → `const policy: ConceptUrlPolicy = { permalink: config.permalink, datePrefix: config.datePrefix };`.
  - `validateUrlPolicy(id, policy, conceptRouting.dated);` stays (build-time authority, id-keyed messages; defense-in-depth beside `defineConcept`).
  - `fields: namedFields(config.schema)` → `fields: namedFields(fs)`.
  - `schema: config.schema` → `schema: fs` (the descriptor keeps its `schema` member; it now reads the renamed config member).
  - `validate: config.schema.validate` → `validate: fs.validate`.
- [ ] **Step 2:** Delete `CONCEPT_ROUTING` and `DEFAULT_ROUTING` from `concepts.ts`. Remove the `CONCEPT_ROUTING` export from `src/lib/index.ts` (the barrel; there is no `src/lib/content/index.ts`).
- [ ] **Step 3:** Change `resolveConcepts` to `resolveConcepts(content: Record<string, ConceptConfig | undefined>): ConceptDescriptor[]` returning `normalizeConcepts(content)` (drop `siteConfig` and the `urlPolicyFrom` call).
- [ ] **Step 4:** In `compose.ts`, rewrite the returned runtime object to map the groups and source `siteName` from the config:

```ts
  return {
    siteName: siteConfig.siteName,
    concepts: resolveConcepts(content),
    backend: adapter.backend,
    sender: adapter.email,
    supportContact: adapter.editor?.supportContact,
    render: adapter.rendering.render,
    manifestPath: 'src/content/.cairn/index.json',
    registry: adapter.rendering.components,
    icons: adapter.rendering.icons,
    navMenu: adapter.editor?.nav,
    preview: adapter.editor?.preview,
    assets: adapter.media,
    resolvedAssets: normalizeAssets(adapter.media),
    mediaManifestPath: 'src/content/.cairn/media.json',
    dictionaryPath: 'src/content/.cairn/dictionary.txt',
    spellcheckDictionary: dictionaryFileForDialect(siteConfig.spellcheck?.dialect),
    tidy: siteConfig.tidy,
    adminPanels,
    fieldTypes,
  };
```

The `content` spread at the top stays `{ ...adapter.content }` (now an open `Record`). `normalizeAssets(adapter.media)` replaces `normalizeAssets(adapter.assets)`.

- [ ] **Step 5:** In `delivery/site-descriptors.ts:10`, change the body to `return resolveConcepts(adapter.content)` but KEEP the public `siteDescriptors(adapter, siteConfig)` signature (and `createSiteIndexes`/`buildSiteManifest`). See addendum **R4**: pruning the `siteConfig` param breaks the `delivery-data.md` signature gate and forces consumer repoints, so only the internal `resolveConcepts` drops it.

### Task 4: Migrate the Vite plugin's string-templated adapter reader (the type-invisible break)

**Files:** `src/lib/vite/index.ts`

- [ ] **Step 1:** In `adapterFactsSource` (vite/index.ts:266-279), change the reads:

```js
const backend = cairn?.backend ?? {};
const email = cairn?.email ?? {};
const media = cairn?.media ?? {};
const facts = {};
if (typeof backend.owner === 'string') facts.owner = backend.owner;
if (typeof backend.repo === 'string') facts.repo = backend.repo;
if (typeof email.from === 'string') facts.from = email.from;
if (typeof media.bucketBinding === 'string') facts.mediaBucketBinding = media.bucketBinding;
```

- [ ] **Step 2:** Update the `AdapterFacts` doc comments (vite/index.ts:251, 254) from `cairn.sender.from`/`cairn.assets.bucketBinding` to `cairn.email.from`/`cairn.media.bucketBinding`.
- [ ] **Step 3:** Add a unit assertion in `src/tests/unit/vite-verify-references.test.ts` (or a new `vite-adapter-facts.test.ts`) that `adapterFactsSource`'s emitted module, run against a v2-shaped adapter (`{ email: { from }, media: { bucketBinding } }`), yields `from` and `mediaBucketBinding`. The type checker cannot catch this file; this test plus the e2e are the net.

### Task 5: Retire the doctor synthetic-concept check; hard-error on stale YAML URL policy

**Files:** `src/lib/doctor/checks-local.ts`, `src/lib/nav/site-config.ts`

- [ ] **Step 1:** Remove `urlPolicyFrom` from `src/lib/nav/site-config.ts` (no longer called; Task 3 dropped its use) and remove `SiteConfig.content` (the `Record<string, ConceptUrlPolicy>` map at ~line 95). Per addendum **R3**, `urlPolicyFrom` is a PUBLIC barrel export: also prune it from `src/lib/index.ts` (~line 129) in the same step, or the re-export of a deleted symbol is a TS error. Its test deletions are in R1 (`nav-site-config.test.ts`, `delivery-exports.test.ts`); its reference-doc deletion is in R5.
- [ ] **Step 2:** In `parseSiteConfig`, after the `siteName` check, add the hard-error: if the parsed YAML carries a `content` key, throw `cairn: site config no longer carries per-concept URL policy; move permalink/datePrefix into defineConcept (Contract v2)`. This is the tripwire so a site cutover cannot half-migrate.
- [ ] **Step 3:** Retire `configSiteConfig`'s synthetic-concept body in `doctor/checks-local.ts:151-173`. It breaks on the `schema`→`fields` rename (line 165 `schema: fieldset({})`) and its reason to exist is gone. Replace the check body with a parse-only check (parse the YAML, surface a parse error), or repoint it to assert no stale `content:` block (the same condition the parse hard-error now enforces). Keep one `configSiteConfig` check that still validates the YAML parses.

### Task 6: Migrate `src/lib` and test consumers, fixtures, and write the v2 tests

> **Read addendum R1 and R2 first.** R1 is the COMPLETE, grep-derived migration set (it supersedes Step 5's file list, which is incomplete) with per-file work. R2 is the positional-argument fold-in rule for `normalizeConcepts` callers. The `_content-fixture.ts` `posts` concept must declare `routing: 'feed'` or dated behavior silently breaks across the suite.

**Files:** the adapter-shaped fixtures and `ConceptConfig`/`schema:` literals; the full test set in addendum R1.

- [ ] **Step 1:** Migrate `src/tests/**/_content-fixture.ts` and every adapter-shaped fixture: `siteName`→YAML/config, `sender`→`email`, `assets`→`media`, `registry`/`icons`/`render`→`rendering`, `navMenu`/`preview`/`supportContact`→`editor`, and every `ConceptConfig` literal `schema:`→`fields:`. Leave runtime-shaped fixtures (those passed to `createContentRoutes`/`createNavRoutes`/`cairn-admin`/`createHealthRoutes`, carrying flat `manifestPath`) UNCHANGED.
- [ ] **Step 2:** Rewrite the routing contract test (`content-concepts.test.ts`): instead of injecting a `routing` table, assert that a concept declaring `routing: 'feed'` (or an explicit rule, or omitting it) resolves to the exact rule, and that `composeRuntime(...).concepts` and `siteDescriptors(...)` produce byte-identical `routing` for the same shorthand-declared concept.
- [ ] **Step 3:** Add an integration assertion that a concept declaring a CUSTOM `permalink` (e.g. `/articles/:slug`) and `datePrefix` flows through `normalizeConcepts` to the descriptor and the delivered permalink (the read-path-from-concept proof, kept off the showcase so e2e URLs stay stable).
- [ ] **Step 4:** Fix `content-compose.test.ts`: make the fixture's `siteConfig.siteName` DIFFER from any adapter value so the test actually proves `runtime.siteName` sources from the site config.
- [ ] **Step 5:** Migrate `content-adapter.test.ts`, `delivery-site-indexes.test.ts` (the `as CairnAdapter['content']` cast at :83), `delivery-site-descriptors.test.ts`, `delivery-generic-frontmatter.test.ts`, `delivery-concept-generic.test.ts`, `doctor-checks-local.test.ts` (drop the synthetic-concept permalink/date-token cases here; they move to `define-concept.test.ts`), `vite-verify-references.test.ts` (its inline adapter literal). Keep the per-concept `expectTypeOf` inference assertions; they pass through `defineAdapter`'s `const` capture (proven sound in the sweep).

### Task 7: Migrate the showcase adapter and its direct `siteName` reads

**Files:** `examples/showcase/src/lib/cairn.config.ts`, `examples/showcase/src/routes/(site)/[...path]/+page.server.ts`, `examples/showcase/src/routes/feed.xml/+server.ts`, `examples/showcase/src/routes/feed.json/+server.ts`

- [ ] **Step 1:** Rewrite the showcase `defineAdapter(...)` (cairn.config.ts:112-177) to the six-group shape, using `defineConcept` for each concept. `siteName` is dropped (it stays in `site.config.yaml`). Concepts declare routing; URL policy is omitted to keep the e2e URLs stable (the read path is proven by the Task 6 integration test):

```ts
export const cairn = defineAdapter({
  content: {
    posts: defineConcept({
      dir: 'src/content/posts',
      label: 'Posts',
      summaryFields: ['description'],
      routing: 'feed',
      fields: fieldset({
        /* the existing post fieldset, verbatim */
      }),
    }),
    pages: defineConcept({
      dir: 'src/content/pages',
      label: 'Pages',
      routing: 'page',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        robots: fields.text({ label: 'Robots' }),
      }),
    }),
  },
  backend: { owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' },
  email: { from: 'cms@showcase.test' },
  media: { bucketBinding: 'MEDIA_BUCKET' },
  rendering: {
    render: (md, opts) => renderMarkdown(md, { ...opts, resolveMedia: opts?.resolveMedia ?? publicMediaResolver }),
    components: registry,
    icons,
  },
  editor: {
    nav: { configPath: 'src/lib/site.config.yaml', menuName: 'primary', label: 'Navigation', maxDepth: 2 },
    preview: { stylesheets: [themeCss, siteCss], containerClass: 'site-main' },
  },
});
```

- [ ] **Step 2:** Repoint the three direct reads from `cairn.siteName` to `siteConfig.siteName` (the file already imports/exports `siteConfig`): `(site)/[...path]/+page.server.ts:12`, `feed.xml/+server.ts:23`, `feed.json/+server.ts:23`.
- [ ] **Step 3:** Grep the showcase for any other `cairn.` group read that moved (`cairn.sender`, `cairn.assets`, `cairn.registry`, `cairn.icons`, `cairn.render`, `cairn.navMenu`, `cairn.preview`) and repoint each. svelte-check flags these on the showcase build, but the e2e is the runtime net.

### Task 8: Docs migration, then GATE the atomic unit

> **Read addendum R5 first** for the COMPLETE docs-migration set (it supersedes Step 1's two-file scope; the tutorial and several reference/guide/explanation pages name moved or removed symbols, and the tutorial's YAML `content:` block becomes a runtime error for a 3b reader). **Read R6** for the dist rebuild that must precede the gate.

**Files:** the full published-docs set in addendum R5 (`core.md`, `define-an-adapter-and-schema.md`, the tutorial, `structured-fields.md`, `link-content-with-references.md`, `wire-the-delivery-surface.md`, `admin-routes.md`, `components.md`, `delivery.md`, `delivery-data.md`, `sveltekit.md`, `vite.md`, `doctor.md`, `content-model.md`).

- [ ] **Step 1:** Rewrite the adapter snippet in `core.md` (~43-60) and the guide `define-an-adapter-and-schema.md` (~18-58) to the six-group shape with `defineConcept`. Update the `ConceptConfig` prose at `core.md:724` from `schema` to `fields` and add `routing`/`permalink`/`datePrefix` (this drift is invisible to the coverage and signature gates). Add a `defineConcept` reference entry beside `defineAdapter` (~core.md:31) with a matching `declare function` block so `check:reference` (new export) and `check:reference:signatures` pass:

```ts
declare function defineConcept<const C extends ConceptConfig>(concept: C): C;
```

Document the contract (the routing shorthands, the URL-policy fields, the declaration-time validation). Do not document `resolveRouting` (internal, not barrel-exported).
- [ ] **Step 1b: Docs acceptance grep (R5).** Grep `docs/{reference,guides,explanation,tutorial}` for `schema: fieldset`, adapter-context `sender:`, `cairn.siteName`, `cairn.sender`, `cairn.assets`, `cairn.registry`, `cairn.icons`, `cairn.render`, `navMenu`, and a YAML `content:` URL-policy block. Confirm zero hits outside the `createAuthRoutes({ branding: { siteName } })` exception.

- [ ] **Step 1c: Rebuild dist before gating (R6).** Run `npm run package`. The atomic unit changed the dist's own source (`concepts.ts` `schema`→`fields`), and `vite-verify-references.test.ts` spawns a Vite build that imports the dist via the self-symlink. `npm test` has no pretest rebuild and `npm run check` does not package, so a stale dist throws.

- [ ] **Step 2: GATE the atomic unit.** Run, and fix every failure before proceeding:
  - `npm run check` (expect 0 errors, 0 warnings)
  - `npm test` (expect EXIT 0)
  - `npm run check:comments`
  - `npm run check:reference`, `npm run check:reference:signatures`, `npm run check:package`, `npm run check:docs`
- [ ] **Step 3: Commit** the atomic unit `feat(content)!: restructure the adapter into six groups and open the concept model`. Include the `Consumers must:` lines (see Task 9 changelog).

### Task 9: Version bump, dist rebuild, from-scratch e2e, full gate

**Files:** `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/guides/upgrade-cairn.md`, `ROADMAP.md`

- [ ] **Step 1:** Bump `package.json` to `0.72.0`. Run `npm install --package-lock-only` to sync the root lockfile self-version (`check:version` misses it; CI `npm ci` needs it). Run `npm run check:version` (expect minor → `0.72.0`).
- [ ] **Step 2:** Write the `CHANGELOG.md` `0.72.0` entry with a `Consumers must:` line per breaking change: regroup the adapter into `content`/`backend`/`email`/`rendering`/`media`/`editor`; rename each concept's `schema:` to `fields:` and wrap it in `defineConcept`; move `permalink`/`datePrefix` from the YAML `content:` block into `defineConcept` (a leftover YAML `content:` block now throws); move `siteName` out of the adapter (it stays in the YAML). Add the matching per-version entry to `docs/guides/upgrade-cairn.md`.
- [ ] **Step 3:** Add the ROADMAP entries (decision 7 and the site-cutover watch): "engine-provided `inFeeds`/`routable` feed + sitemap views" (render/delivery tier); and the watch "site cutover: transcribe ecxc-ski (`/:year/:month/:slug`, `month`) and 907-life (`/:year/:month/:day/:slug`, `day`) YAML URL policy into `defineConcept`, delete the YAML `content:` and dead `url:`, verify live permalinks" (tied to each site's v2 cutover pass).
- [ ] **Step 4:** Rebuild dist: `npm run package`.
- [ ] **Step 5:** Prove the consumer build from scratch: `rm -rf examples/showcase/{node_modules,package-lock.json}`, then `npm --prefix examples/showcase install`, then `npm --prefix examples/showcase run build`, then `npm --prefix examples/showcase run test:e2e`. Expected: build succeeds and e2e passes (this is the only gate for the Task 4 Vite-string change). Alternatively push the branch for a CI `e2e` run.
- [ ] **Step 6: Final full gate.** Re-run the Task 8 Step 2 gate set after the dist rebuild. All green.
- [ ] **Step 7: Commit** `chore(release): cairn-cms 0.72.0 (Contract v2 phase 3b)`.

---

## Self-review notes

- **Spec coverage:** the concept model (`defineConcept`, open `content`, declared routing, URL-policy-home) is Tasks 1/2/3; the adapter restructure (six groups, siteName de-dup, path knobs, `SiteConfig.url`) is Tasks 2/3/5/Task1-Step6; the doctor/YAML consistency retirement is Task 5; docs are Task 8; the version + release mechanics are Task 9. The render `islands` group and the `backend`/`rendering` seam redesigns are explicitly out (later phases).
- **Type consistency:** `defineConcept<const C extends ConceptConfig>(concept: C): C`; `resolveRouting(routing): RoutingRule`; `normalizeConcepts(content)`; `resolveConcepts(content)`; `ConceptConfig.fields` (was `schema`); `ConceptDescriptor.fields`/`ConceptDescriptor.schema` unchanged; runtime keys flat and unchanged. The adapter groups: `content`, `backend`, `email`, `rendering.{render,components,icons}`, `media`, `editor.{preview,nav,supportContact}`.
- **No placeholders:** every code step shows the code; every migration step names the files/lines; the atomic-unit boundary and the single gate are explicit.
