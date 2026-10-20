# Tag-management Plan 3: The admin UI — vocabulary screen, seed/orphan flow, and the size-gated filter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The design task (Task 2) is a main-loop, mockup-first design stage, not a code task.

**Goal:** Give a non-technical editor an admin screen to curate the tag vocabulary (add a tag, rename a label, delete an unused tag, seed from tags already in use), reached through the engine's built-in admin, committing through the GitHub-App pipeline; plus a size-gated, client-side tag filter on the showcase archive so the tags-as-data has a browsing surface.

**Architecture:** The vocabulary screen is an **engine** admin screen, so it mirrors the settings/tidy screen exactly: a `vocabularyLoad`/`vocabularySave` pair inside `createContentRoutes`, dispatched through the admin facade (`cairn-admin.ts`), routed by `admin-dispatch.ts`, rendered by a new `VocabularyAdmin.svelte` in the `CairnAdmin.svelte` view switch, linked from the `CairnAdminShell` sidebar. It does **not** use the `adminNav` custom-screen seam (that is for site-owned routes; `normalizeAdminNav` rejects an href the engine claims). Edits commit through the same head-guarded `backend.commit` + `isConflict` reload path `navSave`/`settingsSave` use, writing the `vocabulary` key via `setVocabulary` at `siteConfigPath()`. Usage is the cross-branch `buildTagUsageIndex` (main ∪ every open `cairn/*` branch): the screen shows a per-tag in-use count, blocks deleting an in-use tag (the gate runs `strict`, failing closed), and surfaces the in-use-but-unlisted set as seed candidates. The showcase filter is template-only: a client-side narrowing of the already-rendered archive over `ContentSummary.tags`, off by default, gated on the list growing past a threshold; cairn ships no public filter component.

**Tech Stack:** TypeScript, `src/lib/sveltekit`, `src/lib/components` (Svelte 5, DaisyUI 5, Tailwind 4, the Warm Stone design system), Vitest (GithubDouble-driven route tests; chromium component tests), Playwright (the showcase e2e), the live admin smoke against `wrangler dev`.

## Global Constraints

- **Spec is canonical.** `docs/superpowers/specs/2026-06-29-cairn-tag-management-design.md`, Component 2 (the editor tag-admin screen), the "Breaking change and migration" section (the seed), the UI/UX directive, and Component 5 (the size-gated filter). This plan is its Plan 3; Plans 1 (reshape) and 2 (data engine) have landed.
- **Builds on Plan 2.** Consumes `extractVocabulary`/`setVocabulary`/`VocabularyEntry` (public), `runtime.vocabulary`, the internal `buildTagUsageIndex` and `tagUsage`, and `ContentIndex.allTags()`. Do not change their contracts. The enforced field (Plan 2) is already live; this plan adds the screen that curates the vocabulary it reads.
- **Engine screen, mirror settings.** The screen mounts through the built-in view switch, not `adminNav`. The 8 insertion points: `content-routes.ts` (the `vocabularyLoad`/`vocabularySave` pair + the return record), `admin-dispatch.ts` (`AdminView`, `RESERVED_SEGMENTS`, the single-segment branch), `cairn-admin.ts` (`AdminData`, the load case, `authedViews`/`anyView`, the `saveVocabulary` action), `CairnAdmin.svelte` (the `{#if data.view === 'vocabulary'}` branch + import), and `CairnAdminShell.svelte` (the sidebar item + icon). Mirror `settingsLoad`/`settingsSave` and `CairnTidySettings.svelte` for the shapes.
- **The seed is a UX affordance, not a safety gate.** Plan 2's per-entry union already prevents any build delist, so this plan does **not** add a "gate enforcement on a superset" hard block. The seed flow is: the screen surfaces tags in use but not in the vocabulary (the unlisted set) and offers to add them, so an editor populates the vocabulary without a screen full of orphan flags. Enforcement is already on whenever the vocabulary is non-empty (Plan 2); there is no separate enable toggle.
- **Delete is gated on cross-branch usage, failing closed.** A `vocabularySave` that removes a vocabulary entry whose `value` is in use is rejected. "In use" is `buildTagUsageIndex(backend, concepts, manifest, { strict: true })` (main ∪ open `cairn/*` branches; `strict` rethrows a branch-read failure so a still-used value never reads free). Rename (label change, same `value`) and add are always allowed.
- **`value` is immutable; rename edits `label` only.** The screen derives a slug `value` from the label once at add (matching `SAFE_TAG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`), rejecting a collision; after that the `value` is frozen and rename touches only `label`, so no post changes.
- **Admin design system.** Before any `/admin` component work read and follow `docs/internal/admin-design-system.md` (Warm Stone tokens, `data-theme` on a bare wrapper, scoped overrides in `@layer components`, the component recipes). The screen must blend seamlessly into the existing admin and hold cairn's gold-standard bar. Reuse `CsrfField`, the hidden-JSON-field post shape, and the `untrack`-seeded `$state` working-copy pattern from `CairnTidySettings.svelte`/`NavTree.svelte`.
- **Gate before done (each code task):** the task's targeted test, then `npm run check` 0/0, then `npm test` exit 0. The component layer runs in chromium; route tests are GithubDouble-driven. Run `npm run package` before `npm test` if a dist import flakes, and before any `check:surface`/`check:reference`. The showcase e2e and the live admin smoke are their own gates (Tasks 4–5).
- **Docs are a pass dimension.** The new admin view/action gets its `docs/reference/sveltekit.md` + `admin-routes.md` rows; a short editor guide; the CHANGELOG. The whole initiative's held release window is reconciled in Task 5.

---

## Task 1: The `vocabularyLoad`/`vocabularySave` route pair and the admin wiring

The headless route: load the vocabulary plus per-tag usage and the unlisted seed set; save validates, gates deletes on cross-branch usage, and commits. Plus the six non-component wiring insertion points. No screen yet.

**Files:**
- Modify: `src/lib/sveltekit/content-routes.ts` (add `vocabularyLoad`/`vocabularySave` and the `VocabularyLoadData` interface, mirroring `settingsLoad`/`settingsSave` ~L2900/L2927; export both in the return record ~L3163).
- Modify: `src/lib/sveltekit/admin-dispatch.ts` (`AdminView` +`| { view: 'vocabulary' }` ~L11; `RESERVED_SEGMENTS` +`'vocabulary'` ~L31; the single-segment branch +`if (head === 'vocabulary') return { view: 'vocabulary' };` after ~L71).
- Modify: `src/lib/sveltekit/cairn-admin.ts` (`AdminData` +`| { view: 'vocabulary'; page: VocabularyLoadData }` ~L69 + import; the load `case 'vocabulary':` after ~L146; `'vocabulary'` into `authedViews` ~L173 and `anyView` ~L175; a `saveVocabulary: viewAction(['vocabulary'], (event) => content.vocabularySave(contentEvent(event, {})))` action after ~L196).
- Test: `src/tests/unit/content-routes-vocabulary.test.ts` (new, GithubDouble-driven, mirroring `content-routes-settings.test.ts`).

**Interfaces:**
- Produces: `interface VocabularyLoadData { vocabulary: VocabularyEntry[]; usage: Record<string, number>; unlisted: { value: string; count: number }[] }`; `vocabularyLoad(event): Promise<VocabularyLoadData>`; `vocabularySave(event): Promise<never>`.
- Consumes: `extractVocabulary`/`setVocabulary` (Plan 2), `buildTagUsageIndex` (Plan 2, internal), `runtime` + `resolveBackend`, `siteConfigPath()`, `requireSession`, `isConflict`.

**Steps:**

- [ ] **Step 1: Write the failing tests** in `content-routes-vocabulary.test.ts` (mirror `content-routes-settings.test.ts` setup; seed the GithubDouble with a `site.config.yaml` carrying `vocabulary` and a manifest with tagged entries). Assert: `vocabularyLoad` returns the committed vocabulary, a `usage` count per value (from `buildTagUsageIndex`), and an `unlisted` set of in-use values absent from the vocabulary; `vocabularySave` with a renamed label commits (no `value` change) via `setVocabulary` with the head-guard; `vocabularySave` adding a new `{value,label}` commits; `vocabularySave` that **removes** an in-use value is **rejected** (no commit, a redirect/error), while removing an unused value commits; a malformed posted vocabulary (`validateVocabulary` throws) is rejected; a stale head (`isConflict`) redirects with the reload message; and a `vocabularyLoad` whose `listBranches`/manifest read throws still returns a 200 load with the committed vocabulary and an empty `usage`/`unlisted` overlay (the best-effort degrade), not the error page.
- [ ] **Step 2: Run; confirm failures.**
- [ ] **Step 3: Implement the route.** `vocabularyLoad`: `requireSession`; resolve backend; read the config on `defaultBranch` → `parseSiteConfig` → `extractVocabulary` (degrade to `[]` on read/parse failure, mirroring `navLoad`). Then compute the usage overlay **best-effort**, mirroring `mediaLibraryLoad` (`content-routes.ts:997-1009`): wrap the manifest read **and** `const usageIndex = await buildTagUsageIndex(backend, runtime.concepts, manifest, {})` in one `try/catch` that degrades `usage` to `{}` and `unlisted` to `[]` on any failure, keeping the committed vocabulary list visible. (`buildTagUsageIndex` non-strict still throws on a `listBranches` failure — `tag-usage-index.ts:98` is outside the per-branch catch — and the manifest read is unguarded, so without this wrap a transient read 500s the whole screen, and the dispatcher has no load-level try/catch.) On success, build `usage` = `value → usageIndex.get(value)?.length ?? 0` for each vocabulary value; build `unlisted` = each key of `usageIndex` not in the vocabulary, with its count, sorted. The config read, the manifest read, and the non-strict `buildTagUsageIndex` are all best-effort on the load; the safety boundary is the **strict** gate on `vocabularySave`, not the load. `vocabularySave`: `requireSession`; parse the posted `vocabulary` JSON; `validateVocabulary` it (reject on throw); read the current committed vocabulary; compute removed values (in current, not in posted); if any removed value is in use per `buildTagUsageIndex(..., { strict: true })`, reject with a 303 error redirect naming the value; else the head-guarded `backend.commit([{ path: siteConfigPath(), content: setVocabulary(raw, posted) }], author, 'Update tag vocabulary', head ?? undefined)` with the `isConflict` catch → reload redirect; success → `redirect(303, '/admin/vocabulary?saved=1')`. Add both to the return record.
- [ ] **Step 4: Wire the dispatch** (admin-dispatch.ts, cairn-admin.ts per the Files list). No screen yet — the `case 'vocabulary'` load returns the data; the action is registered.
- [ ] **Step 5: Run; confirm pass; full suite green.**
- [ ] **Step 6: Full gate + `npm run package` + surface regen** (the new `AdminData` variant / `VocabularyLoadData` may drift the snapshot; `node scripts/check-surface.mjs --update`). Commit the route + wiring + test + `api-surface.md`.

```bash
git add src/lib/sveltekit/content-routes.ts src/lib/sveltekit/admin-dispatch.ts src/lib/sveltekit/cairn-admin.ts src/tests/unit/content-routes-vocabulary.test.ts docs/internal/api-surface.md
git commit -m "Add the vocabulary admin route pair with the cross-branch delete gate"
```

---

## Task 2: Design the vocabulary screen (mockup-first, main loop — no code)

Settle the screen's layout and interaction before building it, per the spec's UI/UX directive. This is a main-loop design stage producing a design note, not a code change.

**Method (the `cairn-ui-design-pass-methodology`: deficiency-driven, mockup-first, render-and-screenshot).** The deliverable is **rendered HTML mockups plus a frozen design-reference markdown**, not a prose note — markup-reading misses spacing, contrast, alignment, and real-font issues, so the design is validated on pixels.

- [ ] **Step 1: Research the surface.** Read `docs/internal/admin-design-system.md` (the recipes: cards, eyebrow groups, empty states, the command palette, the voice), the gold-standard `docs/internal/design/2026-06-12-editor-shell-gold-standard.html` and `docs/internal/design/README.md` (the serve recipe), and the two closest existing screens, `CairnTidySettings.svelte` and `NavTree.svelte`, for the established form/working-copy/CsrfField idiom. Note the data the screen renders (`VocabularyLoadData`: the vocabulary list, per-tag `usage` count, the `unlisted` seed set).
- [ ] **Step 2: Produce 2–3 self-contained HTML prototype mockups** under `docs/internal/design/2026-06-29-vocabulary-admin-<variant>.html`, each extending `2026-06-12-editor-shell-gold-standard.html` and **linking the compiled `cairn-admin.css`** (per the README serve recipe), guided by the `frontend-design` skill with explicit criteria: the Warm Stone system, the gold-standard bar, the three jobs (curate the list, seed from unlisted, delete-unused-only), and the editor voice. Each prototype covers: the list-with-inline-edit layout, the add affordance (label → derived slug preview), the per-tag in-use count and the delete-disabled-when-in-use state, the unlisted/seed section ("tags in use but not in your list" with add), and the empty state.
- [ ] **Step 3: Render and screenshot each prototype in both themes** (serve per the README, screenshot light + dark) before judging — this is where alignment/contrast/font defects surface. Then run an **adversarial critique across the rendered mockups** (a Workflow or a focused review scoring the *screenshots* against the design system, the editor's mental model, WCAG 2.2, and the leanness bar) to surface the strongest, and a `frontend-design` polish pass on the winner (re-rendered and re-screenshotted).
- [ ] **Step 4: Freeze the design** as `docs/internal/design/2026-06-29-vocabulary-admin-design-reference.md` (the established convention): the chosen layout, the recipes used, the add/rename/delete/seed interaction, the slug-preview, the in-use and orphan presentation, the a11y notes, with the winning HTML mockup kept as the design record. Task 3 ports this verbatim.

(No code gate; this task's deliverables are the HTML mockups + the design-reference markdown. Do not write component code here.)

---

## Task 3: Implement `VocabularyAdmin.svelte` and mount it

Build the screen to the Task-2 design, wire it into the view switch and the sidebar, and prove it with a component test.

**Files:**
- Create: `src/lib/components/VocabularyAdmin.svelte` (`Props { data: VocabularyLoadData }`; an `untrack`-seeded `$state` working copy; add / rename-label / delete-unused controls + the seed-from-unlisted affordance; the slug-derive-and-collision-check on add; posts a hidden JSON `vocabulary` field with `<CsrfField />` to `action="?/saveVocabulary"`).
- Modify: `src/lib/components/CairnAdmin.svelte` (import + the `{:else if data.view === 'vocabulary'}` branch after ~L78).
- Modify: `src/lib/components/CairnAdminShell.svelte` (a `{ label: 'Tags', icon: TagIcon, href: '/admin/vocabulary' }` item in `coreItems` ~L69-87 + a Lucide `Tag` icon import ~L26).
- Test: `src/tests/component/vocabulary-admin.test.ts` (chromium).

**Steps:**

- [ ] **Step 1: Write the failing component test.** Render `VocabularyAdmin` with a `VocabularyLoadData` fixture (a couple of tags, one in use with a count, one unused, one unlisted seed candidate). Assert: the list renders each label + its in-use count; the unused tag's delete control is enabled and the in-use tag's is disabled (or guarded); the add control derives a slug preview from a typed label; the unlisted section offers the seed candidate; the form posts the working copy as the hidden `vocabulary` JSON with a CSRF field. Follow the chromium component-test conventions in `src/tests/component/`.
- [ ] **Step 2: Run; confirm failure.**
- [ ] **Step 3: Implement** `VocabularyAdmin.svelte` by porting the Task-2 design verbatim (the `docs/internal/design/2026-06-29-vocabulary-admin-design-reference.md` + the winning HTML mockup — composition, copy, and a11y), then wire `CairnAdmin.svelte` and `CairnAdminShell.svelte`. Honor the design system (the `data-theme`-on-a-bare-wrapper rule, `@layer components` for scoped overrides, the Warm Stone tokens, the warning-ink for any notice).
- [ ] **Step 4: Run; confirm pass; `npm run check` 0/0; `npm test` exit 0** (chromium component layer green).
- [ ] **Step 5: Full gate.** Commit the component + the two wiring files + the test.

```bash
git add src/lib/components/VocabularyAdmin.svelte src/lib/components/CairnAdmin.svelte src/lib/components/CairnAdminShell.svelte src/tests/component/vocabulary-admin.test.ts
git commit -m "Add the VocabularyAdmin screen and mount it in the admin"
```

---

## Task 4: The size-gated showcase tag filter and its e2e

Add a client-side, size-gated tag filter to the showcase archive over `ContentSummary.tags`, off by default, reading the vocabulary for clean options. Template-only; no engine code.

**Files:**
- Modify: `examples/showcase/src/routes/(site)/+page.svelte` (a `$state` selected-tag, the filter control gated on `entries.length > TAG_FILTER_MIN_ENTRIES`; filter `entries` by `post.tags.includes(selected)` before the `{#each}` ~L66; draw the filter options from the vocabulary, falling back to the in-use tag set; an "all" reset).
- Modify: `examples/showcase/src/routes/(site)/+page.server.ts` (pass the vocabulary to the page via `extractVocabulary(siteConfig)` so the filter shows labels; `tags` already ride each `ContentSummary`).
- Create: `examples/showcase/e2e/tag-filter.spec.ts`.

**Steps:**

- [ ] **Step 1: From-scratch showcase install** so its `file:` deps point at the worktree engine: `rm -rf examples/showcase/{node_modules,package-lock.json}` then `npm install` in `examples/showcase` (run `npm run package` at the root first).
- [ ] **Step 2: Seed tagged posts ABOVE the named threshold.** Name a concrete constant `const TAG_FILTER_MIN_ENTRIES = 12;` and seed the showcase archive above it (≈14 posts) with overlapping vocabulary tags, so the showcase proves the filter at the scale the spec intends. Do **not** lower the threshold for the showcase — that defeats the size gate's purpose (the spec: no payoff at small scale).
- [ ] **Step 3: Implement the filter** in `(site)/+page.svelte`: a `$state` `selected`, a derived filtered list, the filter control rendered only when `entries.length > TAG_FILTER_MIN_ENTRIES` (the size gate — guaranteed off below the threshold by this guard), options from the vocabulary (labels) over the in-use values, an "all" reset. Off by default (no tag selected shows all).
- [ ] **Step 4: Write the e2e** `tag-filter.spec.ts`: visit the archive (seeded above the threshold so the control is present), select a tag, assert the list narrows to that tag's posts, reset shows all. Retry-safe and section-scoped per the existing e2e conventions. (The off-state — control absent below the threshold — is the `{#if entries.length > TAG_FILTER_MIN_ENTRIES}` guard; the showcase archive is above it, so the on-state is what the e2e exercises.)
- [ ] **Step 5: Run** `CI=1 npm --prefix examples/showcase run test:e2e`; confirm green (the new spec + the existing `golden-path`).
- [ ] **Step 6: Commit** the showcase filter + the e2e + the regenerated lockfile.

```bash
git add examples/showcase/src/routes examples/showcase/e2e/tag-filter.spec.ts examples/showcase/package-lock.json
git commit -m "Add the size-gated tag filter to the showcase archive"
```

---

## Task 5: Live admin smoke, docs, and the initiative consolidation

Prove the screen against a real Worker, document the new surface, and reconcile the held release window for the whole initiative.

**Files:**
- Modify: `docs/reference/sveltekit.md` (the `vocabulary` view/action rows, the `vocabularyLoad`/`vocabularySave` signatures, the `AdminData` variant), `docs/reference/admin-routes.md` (the `/admin/vocabulary` view + action rows).
- Create: `docs/guides/manage-your-tag-vocabulary.md` (an editor how-to: add, rename, delete-unused, seed from existing tags) and link it from the guides index.
- Modify: `CHANGELOG.md` `## Unreleased` and `docs/guides/upgrade-cairn.md` (the admin screen + the size-gated filter; opt-in, non-breaking).

**Steps:**

- [ ] **Step 1a: Pre-publish proof — a showcase admin e2e.** A live `wrangler dev` + D1-session smoke is not runnable pre-publish for this engine pass (no deployed consumer yet), so the pre-publish proof is a Playwright e2e against the showcase's existing dev-backend harness (mirror `golden-path.spec.ts` / `media-library.spec.ts`: the injected editor session and the fake-GitHub `/test/last-commit` + `/test/branch-file` doubles). Add `examples/showcase/e2e/vocabulary-admin.spec.ts`: open `/admin/vocabulary`, add a tag, rename a label, delete an unused tag, attempt to delete an in-use tag (blocked), seed from the unlisted set, and assert the recorded commit writes the `vocabulary` key at `siteConfigPath()`. Run it in the Task 4 e2e suite.
- [ ] **Step 1b: Deferred post-publish live smoke.** Record (in the post-mortem and STATUS carry-forward) a deferred live admin smoke per `docs/internal/admin-smoke-test.md` against a real consumer Worker (mint a D1 session, the add/rename/delete/seed flow, observe the committed `site.config.yaml`), tied to the held minor publishing and a site cutover. This is not a pre-publish blocker; the showcase e2e (1a) is the pre-publish gate.
- [ ] **Step 2: Reference docs.** Add the `vocabulary` rows/signatures to `sveltekit.md` and `admin-routes.md` with the real signatures and stability tier.
- [ ] **Step 3: Editor guide.** Write `manage-your-tag-vocabulary.md` to the editor voice; link it from the guides index.
- [ ] **Step 4: CHANGELOG + upgrade guide.** Add the admin screen + filter entry; opt-in and non-breaking. Reconcile the whole tag-management initiative's `## Unreleased` window so it reads as one coherent release, preserving the invariant: (1) keep BOTH existing breaking consumer actions, folded into one ordered `Consumers must` list — mark each concept's taxonomy field `taxonomy: true`, AND drop the removed public-route loaders (`archiveLoad`/`tagIndexLoad`/`tagLoad`) and render archive/tag surfaces from `site.concept(id).all()` + `ContentSummary.tags`; (2) append the vocabulary config + enforced field + admin screen + size-gated filter as the opt-in, non-breaking additions; (3) keep the window breaking and a minor (the loader removal is the breaking part; verify the version is the first free minor after `0.77.0` at cut time via `npm view`). The net published surface: tags-as-data + the editor vocabulary + the enforced field + the admin, no public tag pages.
- [ ] **Step 5: Run every gate.** `npm run package && npm run check:reference && npm run check:reference:signatures && npm run check:docs && node scripts/check-surface.mjs && npm run check:package && npm run check:comments`. All pass.
- [ ] **Step 6: Commit.**

```bash
git add docs/reference/sveltekit.md docs/reference/admin-routes.md docs/guides/manage-your-tag-vocabulary.md docs/guides/README.md CHANGELOG.md docs/guides/upgrade-cairn.md docs/internal/api-surface.md
git commit -m "Document the vocabulary admin screen and the size-gated filter"
```

---

## Self-review

- **Spec coverage.** The editor tag-admin screen (Component 2) → Tasks 1–3 (route, design, screen). Add/rename/delete-unused with the cross-branch delete gate → Task 1 + Task 3. The seed/orphan flow → the `unlisted` set on the load + the seed affordance on the screen (a UX affordance, since Plan 2's union already prevents any delist). The size-gated template filter (Component 5) → Task 4. The mockup-first UI/UX directive → Task 2. Admin smoke + e2e → Tasks 4–5. Docs + the held-release reconciliation → Task 5.
- **Premise check (charter).** The editor/admin frame, cairn's core job (the editor self-sufficiency the whole initiative is justified by). The vocabulary stays config; the screen is the leanest curation surface; no new actor or store. The filter is template-only (cairn ships no public filter component).
- **Engine screen, not the custom seam.** The tag-admin mirrors settings/nav through the built-in view switch; the `adminNav` seam is for site-owned routes and cannot host an engine-claimed href. Verified against `normalizeAdminNav`'s collision rule.
- **Delete safety.** The delete gate uses `buildTagUsageIndex(..., { strict: true })` (main ∪ open `cairn/*` branches, failing closed), so a tag used only in an open draft branch blocks deletion. `value` is immutable; rename never rewrites a post.
- **Design quality.** Task 2 is a real mockup-first stage (prototypes → adversarial critique → `frontend-design` polish), recorded as a design note before Task 3 builds. The screen holds the Warm Stone bar and reuses the established admin form idiom.
- **The seed is UX, not a gate.** Plan 2's per-entry union removed the build-delist hazard, so this plan adds no hard "superset" enforcement gate; the seed populates the vocabulary so an editor avoids orphan-flag clutter. Stated so a reader does not re-introduce a gate Plan 2 made unnecessary.
- **Risk.** Task 1's delete gate (the cross-branch usage + the removed-value diff) is the correctness-critical route logic; its GithubDouble tests (in-use blocks, unused commits, draft-branch blocks) are the lock. Task 3 depends on Task 2's settled design; do not implement the screen before the design note exists. Task 4's size gate must be genuinely off below the threshold (the spec: the filter has no payoff at small scale).
