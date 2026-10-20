# Surface-Pruning Pass Implementation Plan

> **For agentic workers:** Execute task-by-task via `cairn-implementer` dispatches (the repo
> default); the main loop reviews each diff and confirms the full gate between dispatches. Steps
> use checkbox (`- [ ]`) syntax for tracking. Per the workstation doctrine, tasks specify
> outcomes, constraints, and acceptance criteria; the implementer owns the code.

**Goal:** Shrink and firm the public contract of `@glw907/cairn-cms` to exactly the surface the
beta freeze will promise: demote the ~106 exports the adversarial audit convicted, apply the five
reshape rulings and the shape fixes, and land the three-tier stability vocabulary with gates that
enforce it.

**Architecture:** The pass is one breaking window batched under a single `## Unreleased`
changelog entry. Demoting means removing a name from a public barrel or the `exports` map while
the symbol stays in the codebase for the engine's own relative imports; nothing is deleted unless
stated. The evidence base is the audit verdict tables in
`2026-07-01-surface-pruning-audit-verdicts.md` (same directory): every demotion below is a
post-defense final verdict, and grep over the showcase, ecxc-ski, and 907-life confirmed the only
consumer import touching any demoted surface is the showcase spellcheck spike route.

**Tech stack:** TypeScript barrels under `src/lib/*/index.ts`, `svelte-package` packaging,
the gate scripts under `scripts/` (`check-surface.mjs`, `reference-coverage.mjs`,
`check-package.mjs`), Vitest, the Playwright e2e suite in CI.

## Global constraints

- Work on a feature worktree off `main` (suggested branch: `surface-pruning-1`); all edits
  target the worktree path, never the main checkout.
- In the worktree, run `npm run package` before `npm test` (dist-import tests flake otherwise).
- Per-task gate: targeted tests, `npm run check` 0/0, `npm test` exit 0. Any task that changes
  exports regenerates `docs/internal/api-surface.md` (`npm run check:surface -- --update`) and
  commits the snapshot in the same commit. `npm run check:reference` passes after every
  reference-page edit.
- The CI-only gates are in-pass gates here: this pass is entirely public surface, so
  `check:surface` and the e2e suite must be green before the pass ends (the 0.78.2 cut caught
  both failing; do not repeat that).
- No version bump, no publish. The changelog entry stays under `## Unreleased`.
- Comments follow TSDoc (`npm run check:comments`); reference pages follow the Google style
  (Vale advisory). The em dash is banned in comments.
- Each task's docs update is part of the task, not a follow-up: a demoted name leaves its
  reference page in the same commit that removes the export.
- Run the `code-simplifier` agent over changed code before each commit (docs-only commits
  exempt).

## Locked decisions (do not relitigate during execution)

1. **Three-tier stability vocabulary.** `Extension API` and `Scaffold API` (both existing)
   are the frozen contract: after beta, breaking them is a major-version event. A new third
   tier, **`Unstable API`**, marks exports that stay importable with no stability promise
   across minors. Every export on every reference page carries exactly one tier, gate-enforced
   (Task 8).
2. **The recomposition tier is kept but tiered `Unstable API`, not demoted:** the eleven
   page-level components and the four piecewise route factories (with their satellite types).
   The facade (`createCairnAdmin` + `CairnAdminShell`/`CairnAdmin`/`CsrfField`) is the frozen
   mount path.
3. **`MarkdownEditor` stays frozen as the charter-named seam, narrowed by documentation.** Its
   stable prop contract is exactly: `value`, `name`, `registerInsert`, `registerFormat`,
   `completionSources`, `focusMode`, `typewriter`, `surface`, `spellcheck`,
   `spellcheckDictionary`, `siteDictionary`. Every other prop (`registerInsertLink`,
   `registerInsertImage`, `onImageIngest`, `mediaLibrary`, `registerCaretCoords`,
   `registerFocusEditor`, `registerImagePlaceholders`, `registerGetSelection`,
   `registerGetSelectionRange`, `registerTidy`, `registerUndo`, `onComponentAtCaret`,
   `onMediaImageAtCaret`, `registerReplaceRange`, `registerSelectRange`, `pendingAdditions`,
   `tidyMode`, `spellcheckTest`) is `EditPage` wiring, documented as `Unstable API` on the
   components page. No code refactor of the props (the 3a multi-instance focus hazard makes
   that a deliberate later pass).
4. **`feedView` stays exported, tiered `Unstable API`** (summary-only by construction while
   every real feed is full-content; the future engine feed-view work must not be constrained
   by it). `sitemapView` is frozen.
5. **Out of scope for this pass, filed to ROADMAP in Task 9:** the `checkOrigin` pre-beta
   mitigation (deploy-guide Transform-Rule recipe + `cairn-doctor --probe` Origin assertion),
   the `AssetConfig.transformations` doctor corroboration check, the doc-snippet
   extract-and-typecheck gate, and all tutorial/guide prose fixes (the docs rewrite follows
   this pass; the code is the guide until then). `CairnAdapter.editor` grouping and
   `fields.array`'s positional argument stay as they are (audited nice-to-haves, not worth the
   break).

---

### Task 1: Root barrel prune

**Files:**
- Modify: `src/lib/index.ts`
- Modify: `docs/reference/core.md`
- Modify: `docs/guides/upgrade-cairn.md` (the `ReferenceEdge` barrel-addition note)
- Regenerate: `docs/internal/api-surface.md`

**Outcome:** The root subpath exports only the earned construction surface. These 72 names
leave the barrel (71 demotions plus the `ResolvedReference` re-export, whose home is
`/delivery`):

`initialValues`, `normalizeConcepts`, `findConcept`, `frontmatterFromForm`, `dateInputValue`,
`serializeMarkdown`, `isValidId`, `idFromFilename`, `filenameFromId`, `slugify`, `slugFromId`,
`composeDatedId`, `parseCairnToken`, `formatCairnToken`, `extractCairnLinks`, `escapeLinkText`,
`parseManifest`, `emptyManifest`, `diffManifests`, `upsertEntry`, `removeEntry`, `inboundLinks`,
`manifestEntryFromFile`, `manifestLinkResolver`, `emptyValues`, `serializeComponent`,
`parseComponent`, `validateComponent`, `buildComponentInsert`, `generateComponentReference`,
`remarkDirectiveStamp`, `requireOrigin`, `buildMagicLinkMessage`, `cloudflareSend`, `setMenu`,
`validateNavTree`, `validateVocabulary`, `setVocabulary`, `MAX_NAV_NODES`, `NavValidationError`,
`ResolvedPreview`, `TextField`, `TextareaField`, `NumberField`, `SelectField`,
`MultiselectField`, `UrlField`, `EmailField`, `DateField`, `DatetimeField`, `BooleanField`,
`IconField`, `ImageField`, `ObjectField`, `ReferenceField`, `ArrayField`, `BehaviorTable`,
`FieldBehavior`, `DatePrefix`, `ManifestEntry`, `ManifestDiff`, `ManifestEntryDiff`,
`LinkTarget`, `InboundLink`, `InboundReference`, `ReferenceEdge`, `SlotKind`, `SlotDef`,
`ComponentValues`, `ComponentValidation`, `ComponentInsert`, `ReferenceOptions`,
`ResolvedReference`.

**Constraints:**
- Demotion only: the symbols keep living in their modules; engine code keeps importing them by
  relative path. Fix any engine module that imported a demoted name through the barrel.
- Kept types whose declarations reference demoted types (`FieldDescriptor`'s arms, `Manifest`
  and `ManifestEntry`, `ComponentDef` and `SlotDef`) must remain portable: the published
  `.d.ts` for every kept export must still typecheck for a consumer (same-module inlining
  covers this; verify in the packaged output, not just the source).
- `docs/reference/core.md` loses every demoted name in the same commit.

**Acceptance criteria:**
- A test (or the packaged `.d.ts`, checked mechanically) demonstrates the demoted names no
  longer resolve from `@glw907/cairn-cms` while every name on the keep list (audit verdicts
  doc, `## .` section) still does.
- `npm run package` succeeds and the showcase builds (`npm run build` in
  `examples/showcase`), proving no kept declaration broke.
- Full per-task gate; regenerated `api-surface.md` committed.

- [ ] Write the failing surface assertion (demoted names absent, keeps present)
- [ ] Prune the barrel, fix internal imports, prune `core.md` and the upgrade-guide note
- [ ] Gate: package + showcase build + `check` + `test` + `check:reference` + surface regen
- [ ] Commit

### Task 2: `/sveltekit` prune and the `ContentRoutesDeps` reshape

**Files:**
- Modify: `src/lib/sveltekit/index.ts`, `src/lib/sveltekit/content-routes.ts`,
  `src/lib/sveltekit/nav-routes.ts`
- Modify: `docs/reference/sveltekit.md`, `docs/reference/admin-routes.md` (if they mention the
  demoted names)
- Regenerate: `docs/internal/api-surface.md`

**Outcome:** `isPublicAdminPath`, `parseAdminPath`, `AdminView`, and `NavRoutesDeps` leave the
public barrel. The public `ContentRoutesDeps` type loses its `backend` member (a documented
test-injection seam); `createContentRoutes` still accepts the injection internally so the
existing tests keep working, but the published `.d.ts` no longer advertises it. The `anthropic`
and `tidyTimeoutMs` members stay (the showcase types against `ContentRoutesDeps['anthropic']`);
Task 6 regroups the admin-facade deps separately.

**Constraints:**
- `shellLoad` and the guard keep using `isPublicAdminPath`/`parseAdminPath` module-internally.
- The test-injection mechanism must not weaken: the suites that inject a `Backend` today must
  pass unchanged or with a mechanical import swap only.

**Acceptance criteria:**
- Packaged `.d.ts` for `/sveltekit` carries no `parseAdminPath`, `AdminView`,
  `isPublicAdminPath`, `NavRoutesDeps`, and `ContentRoutesDeps` has no `backend` member.
- Showcase typecheck still passes (it imports `ContentRoutesDeps` for the `anthropic` knob).
- Full per-task gate; surface snapshot regenerated.

- [ ] Write the failing surface assertion for the four demotions and the `backend` removal
- [ ] Implement, keep test injection internal, prune the reference pages
- [ ] Gate and commit

### Task 3: `/components` prune, spellcheck export keys, spike route

**Files:**
- Modify: `src/lib/components/index.ts`, `package.json` (exports map)
- Delete: `examples/showcase/src/routes/spike/spellcheck/` (the whole route)
- Modify: `docs/reference/components.md`
- Regenerate: `docs/internal/api-surface.md`

**Outcome:** `ComponentInsertDialog`, `ComponentForm`, `IconPicker`, and `LinkPicker` leave the
components barrel (each has exactly one internal caller). The three export-map keys
`./components/spellcheck-worker`, `./components/spellcheck-assets/spellchecker-wasm.wasm`, and
`./components/spellcheck-assets/dictionary-en-us.txt` are removed: `MarkdownEditor` resolves
the worker and both assets itself via module-relative `new URL(..., import.meta.url)`, so no
consumer needs them. The showcase spike route, their only importer, is deleted.

**Constraints:**
- Do not touch the module-relative asset resolution inside `src/lib/components/spellcheck.ts`;
  the literal relative paths are load-bearing (they keep Vite/Rolldown from globbing dist
  `.svelte` files).
- The dist files themselves still ship (the package resolves them internally); only the
  export-map keys go.
- Check `scripts/check-package.mjs` and `scripts/check-surface.mjs` for enumerations of the
  removed keys and update them.

**Acceptance criteria:**
- Spellcheck still works end-to-end: the e2e spellcheck spec passes against the packaged build
  (this is the editor-DOM surface the 0.78.2 lesson is about; run it, do not assume).
- Packaged exports map carries none of the three keys; the four components no longer resolve
  from `/components`.
- Full per-task gate; surface snapshot regenerated.

- [ ] Write the failing assertions (barrel and exports-map)
- [ ] Prune, delete the spike route, update the gate scripts' key lists, prune `components.md`
- [ ] Gate including the e2e spellcheck spec, commit

### Task 4: `/delivery`, `/media`, `/vite` prunes

**Files:**
- Modify: `src/lib/delivery/index.ts`, `src/lib/delivery/data.ts` (its export list),
  `src/lib/media/index.ts`, `src/lib/vite/index.ts`
- Modify: `docs/reference/delivery.md`, `docs/reference/delivery-data.md`,
  `docs/reference/media.md`, `docs/reference/vite.md`
- Regenerate: `docs/internal/api-surface.md`

**Outcome:** Three subpaths shrink to their proven surfaces.
- `/delivery` and `/delivery/data` lose: `createSiteResolver`, `ConceptIndex`,
  `createContentIndex`, `RawFile`, `fromGlob`, `wordCount`, `permalink`. (`feedView` stays,
  tiered in Task 8.)
- `/media` loses: `parseMediaManifest`, `findByHash`, `upsertMediaEntry`, `removeMediaEntry`,
  `serializeMediaManifest`, `parseMediaEntries`, `hashBytes`, `shortHash`, `slugifyFilename`,
  `r2Key`, `publicPath`, `presetUrl`, `variantUrl`, `manifestMediaResolver`.
- `/vite` loses: `writeManifest`, `readAdapterFacts`, `AdapterFacts`, `verifyManifestFromVite`,
  `buildManifestFromVite`, `stripCairnManifest`. Only `cairnManifest` and
  `CairnManifestOptions` remain.

**Constraints:**
- The two bins (`src/lib/vite/bin.ts`, `src/lib/doctor/bin.ts`) already import these via
  relative paths; verify, don't assume. The unit tests that exercise the demoted vite
  functions keep doing so via relative imports.
- `createSiteIndexes` and the whole kept delivery golden path must remain fully functional;
  the demoted delivery names are its internals.

**Acceptance criteria:**
- All three consumers' import lists (audit usage tables) still resolve; the showcase builds.
- Demoted names absent from the packaged `.d.ts` per subpath; keeps present.
- Full per-task gate; surface snapshot regenerated.

- [ ] Failing surface assertions per subpath
- [ ] Prune the three barrels, verify bin/test relative imports, prune the four pages
- [ ] Gate and commit

### Task 5: Adapter contract shape (routing union, loud site-config boundary)

**Files:**
- Modify: `src/lib/content/types.ts`, `src/lib/nav/site-config.ts`,
  `src/lib/content/compose.ts`
- Modify: `docs/reference/core.md`
- Test: the existing content-contract and site-config suites (extend in place)

**Outcome:**
- `ConceptConfig.routing` publicly accepts only `'feed' | 'page' | 'embedded'`. The
  `RoutingRule` object becomes the internal normalization target and leaves the public barrel
  (it is on Task 1's keep list only until this task lands; remove it here with the union
  change so both moves share one commit).
- `parseSiteConfig` gets loud about the config boundary: an unrecognized top-level YAML key
  produces an actionable error or warning, and a small closed set of known misplacements
  (settings that belong in `cairn.config.ts`) names the right home in the message.

**Constraints:**
- Verify first: grep the showcase and both site repos for object-form `routing` values. The
  audit found none, but if a real combination exists that the three shorthands cannot express,
  stop and surface it (the fallback is keeping `RoutingRule` exported at the `Unstable API`
  tier, but that is a scope decision for the main loop, not the implementer).
- The phase-3b hard-error behavior of `parseSiteConfig` (missed URL-policy transcription fails
  loud) must not weaken.
- Error copy follows the repo's existing error-message conventions; the boundary message
  teaches ("`siteName` belongs in site.config.yaml; `content` concepts belong in
  cairn.config.ts"), it does not just reject.

**Acceptance criteria:**
- Tests: a string shorthand still normalizes exactly as before; an object-form `routing` value
  is a type error (compile-level assertion) and normalization of the three shorthands is
  unchanged at runtime; an unknown top-level YAML key produces the actionable message; a known
  misplacement names its correct home.
- Full per-task gate; surface snapshot regenerated (RoutingRule leaves the root `.d.ts`).

- [ ] Verify-first grep for object-form routing across the three consumers
- [ ] Failing tests for the closed union and the loud boundary
- [ ] Implement, update `core.md`
- [ ] Gate and commit

### Task 6: Mount contract shape (`createMediaRoute`, `CairnAdminDeps`, the bindings type)

**Files:**
- Modify: `src/lib/sveltekit/media-route.ts`, `src/lib/sveltekit/cairn-admin.ts`,
  `src/lib/sveltekit/index.ts`
- Modify: `examples/showcase/src/routes/media/[...path]/+server.ts`,
  `examples/showcase/src/lib/cairn.server.ts`, `examples/showcase/src/app.d.ts`
- Modify: `docs/reference/sveltekit.md`, `docs/reference/admin-routes.md`
- Regenerate: `docs/internal/api-surface.md`

**Outcome:**
- `createMediaRoute(runtime: CairnRuntime)`: the factory reads `runtime.resolvedAssets`
  itself, matching every other factory's convention. `ResolvedAssetConfig` stops being
  load-bearing public surface on `/sveltekit` (it remains exported from `/media`, where the
  audit kept it).
- `CairnAdminDeps` regroups into two cohesive optional bags: `auth?: { branding?, send? }` and
  `tidy?: { client?, timeoutMs? }` (today's flat `branding`/`send`/`anthropic`/
  `tidyTimeoutMs`). The forwarding into the route factories updates to match.
- A new exported interface on `/sveltekit`, `CairnPlatformBindings`, declares every binding
  the engine reads (`AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, `MEDIA_BUCKET`, `GITHUB_APP_ID`,
  `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_B64`) with required (non-optional)
  members. `/ambient` does NOT declare `Platform.env` (interface-merge collisions with the
  site's own declaration); instead the documented `app.d.ts` idiom becomes
  `env: CairnPlatformBindings & { /* the site's own bindings */ }`, and the showcase adopts it.

**Constraints:**
- `MEDIA_BUCKET` is only present on media-enabled sites; reconcile the required-members rule
  with that reality (a documented split shape or a media-conditional intersection is
  acceptable; silent-optional-everything is not, since the whole point is that a missing
  binding fails at compile time).
- The `tidy` regrouping must keep the showcase's typed access to the anthropic client factory
  working (it currently types `ContentRoutesDeps['anthropic']`; give it an equivalently
  nameable type).
- `AuthEnv` stays exported from both `.` and `/sveltekit` (audit keeps); the reference pages
  name `/sveltekit` as the canonical home for binding-shaped types from now on.

**Acceptance criteria:**
- Tests: the media route works when built from the runtime; the regrouped deps reach the same
  behavior the flat bag did (branding applied, tidy client injected, timeout honored); a
  compile-level assertion that an `app.d.ts`-style intersection with a missing engine binding
  fails to typecheck.
- Showcase builds and its e2e-relevant flows still pass; `app.d.ts` uses the new idiom.
- Full per-task gate; surface snapshot regenerated.

- [ ] Failing tests for the three reshapes
- [ ] Implement engine-side, then update the showcase wiring
- [ ] Gate (including showcase build) and commit

### Task 7: Packaging boundary (`files` prune, deep-import lock)

**Files:**
- Modify: `package.json` (`files` array)
- Test: a new packaging boundary test (suggested home: alongside the existing
  `check:package` script's coverage, or a Vitest suite that runs against `npm pack` output)

**Outcome:** `src/lib` leaves the `files` array (`["dist", "CHANGELOG.md"]` remains; npm adds
README/LICENSE/package.json itself). A boundary test locks encapsulation: a representative
deep import (`@glw907/cairn-cms/src/lib/...` and a `dist/` path not in the exports map) fails
with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

**Constraints:**
- Verify empirically (the locked-packaging lesson): build the tarball (`npm pack --dry-run`)
  and confirm no `src/lib` entries ship, then confirm the showcase still installs and builds
  from the packaged form the e2e uses. The repo ships no `.map` files referencing `src/lib`
  today (audited); if the implementer finds otherwise, stop and surface it.

**Acceptance criteria:**
- Tarball manifest carries no `src/lib` paths; deep-import test fails closed as specified;
  e2e-consumed packaging still works.
- Full per-task gate.

- [ ] Failing deep-import/tarball tests
- [ ] Prune `files`, verify pack output and showcase build
- [ ] Gate and commit

### Task 8: Stability tiers and the reference gates

**Files:**
- Modify: `scripts/reference-coverage.mjs`
- Modify: every `docs/reference/*.md` export page (tier sweep), especially
  `components.md` (the `MarkdownEditor` narrowed contract)
- Modify: `docs/reference/README.md` (the tier vocabulary definition)

**Outcome:**
- The gate recognizes three tiers: `Extension API`, `Scaffold API`, `Unstable API`, defined in
  the reference README (`Unstable API`: importable today, no stability promise across minors,
  may change or leave in any release).
- The gate becomes prescriptive both ways: (a) every enumerated export on every covered
  subpath must carry exactly one tier somewhere on its page (fail on untiered), and (b) a
  reverse check fails on any backticked name in a page's export tables/headings that no longer
  exists in that subpath's exports (stale-prose lock).
- The tier sweep assigns, per locked decision 2: `Unstable API` for the eleven page-level
  components (`LoginPage`, `ConfirmPage`, `ConceptList`, `CairnMediaLibrary`,
  `CairnTidySettings`, `HelpHome`, `EditPage`, `ManageEditors`, `NavTree`, `DeleteDialog`,
  `RenameDialog`), the four piecewise factories (`createAuthRoutes`, `createEditorRoutes`,
  `createContentRoutes`, `createNavRoutes`) and their config/deps/result satellite types, and
  `feedView`. Everything else kept by the audit lands in a frozen tier (keep existing
  `Extension API`/`Scaffold API` assignments where already marked; assign the closest fit
  where unmarked — the main loop reviews the full assignment table in the diff).
- `components.md` documents `MarkdownEditor`'s narrowed contract per locked decision 3: the
  eleven stable props in the frozen tier, the wiring props listed under an explicit
  `Unstable API` subsection.

**Constraints:**
- Land the gate change and the sweep in one task so CI never sits red between them.
- The tier marker syntax should extend the existing `TIER_CELL`/`TIER_LINE` recognition, not
  invent a parallel convention.

**Acceptance criteria:**
- `npm run check:reference` fails on a fixture-style probe of each new rule (untiered export;
  stale name) and passes on the swept pages.
- Every reference page's export table carries a tier for every name; `MarkdownEditor`'s two
  prop groups read as specified.
- Full per-task gate.

- [ ] Extend the gate (fail-first probes for both new rules)
- [ ] Sweep the pages, define the vocabulary in the README
- [ ] Gate and commit

### Task 9: Pass consolidation (changelog, roadmap, final gates)

**Files:**
- Modify: `CHANGELOG.md` (`## Unreleased`), `ROADMAP.md`
- Verify: full gate + CI-only gates

**Outcome:** One changelog entry describes the whole window: the demotions (summarized by
subpath with the full lists reproduced or linked), the reshapes, and every `Consumers must:`
line, at minimum:
- Import `ResolvedReference` from `@glw907/cairn-cms/delivery` (no known consumer imports it
  from root).
- Pass the runtime to `createMediaRoute(runtime)` instead of `runtime.resolvedAssets`.
- Regroup `createCairnAdmin` deps: `anthropic` → `tidy.client`, `tidyTimeoutMs` →
  `tidy.timeoutMs`, `branding`/`send` → `auth.*`.
- Declare `Platform.env` via `CairnPlatformBindings & { ...site bindings }` (recommended, not
  strictly required).
- Sites importing any demoted name must stop (none known; the surface snapshot diff is the
  authoritative list).
- The spellcheck worker/asset export keys are gone (only the deleted showcase spike route
  imported them).
- `src/lib` no longer ships in the tarball.

ROADMAP updates in the same commit: add the `checkOrigin` pre-beta mitigation (deploy-guide
recipe + doctor probe) to `## Now` or `## Next`; add the `transformations` doctor
corroboration check and the doc-snippet typecheck gate to `## Later`; note under "Toward 1.0"
that the enforced-boundary checklist line now includes the tier-complete and reverse-check
gates; keep the site cutovers as the step after this pass.

**Acceptance criteria:**
- `npm run check` 0/0, `npm test` exit 0, `npm run check:surface`, `check:reference`,
  `check:package` all green; e2e suite green (run it, per the 0.78.2 lesson).
- Changelog entry complete under `## Unreleased`; no version number assigned.
- ROADMAP reflects the filings above and nothing stale about this pass remains in its tiers.

- [ ] Write the changelog entry and roadmap updates
- [ ] Run the full gate including e2e
- [ ] Commit; then run the `cairn-pass` pass-end ritual (STATUS, post-mortem with both
  budget numbers, merge decision)

---

## Self-review notes

- Every demoted name above is a post-defense final verdict from the companion verdicts doc;
  counts per subpath: root 71 (+1 reshape), sveltekit 4 (+1 reshape), components 4 (+3 export
  keys, +1 reshape), delivery 7 (+1 tier-hold), media 14, vite 6, packaging 1 reshape.
- `RoutingRule` appears on Task 1's keep list and is then removed in Task 5; this is
  deliberate (the union change and the type's demotion belong in one commit) and called out in
  both tasks.
- The audit's two tutorial blockers (`mintToken`, the three-file admin claim) are deliberately
  NOT in this plan: the docs rewrite follows the freeze, per the pass decision that code is
  the guide until the contract is solid.

---

## Post-mortem (2026-07-01)

**Built.** All nine tasks landed on `surface-pruning-1` plus three review-gate fixes:
`5d21d65` (root prune), `eacf3f2` (/sveltekit prune, backend seam deleted), `10e9406`
(/components prune, spellcheck keys, spike route), `5454140` (/delivery /media /vite),
`5b38271` (routing union closed + runtime guard, loud site-config), `b66b989` (mount reshape,
bindings), `43982d9` (src/lib out of the tarball), `870e444` (three-tier vocabulary + both
gate rules + sweep), `0c91877` (changelog/roadmap consolidation after merging main),
`46af986` (bindings fidelity fix from review), `42d2346` (dev-package retype). ~106 names
demoted; the surface snapshot diff is the authoritative list.

**Verified.** At close: `npm run check` 0/0 (1264 files), `npm test` exit 0 (284 files, 2965
tests), `check:comments`, `check:reference`, `check:reference:signatures`, `check:package`,
`check:docs`, `check:surface` all green; showcase build and showcase `check` 0/0; full e2e 64
passed with only the two known pre-existing `admin-visual` pixel flakes (reproduced on
unmodified `main` during Task 3). Review gate: `code-simplifier` returned no changes
warranted; three reviewers (workers, auth-security, svelte) returned zero blockers, one
warning (fixed in `46af986`), two suggestions (applied), two deliberate no-actions (below).

**Decisions locked during execution** (beyond the plan's locked list):
- The `ContentRoutesDeps.backend` test seam was **deleted**, not hidden: typing the public
  factory param with an unexported wider type leaks the name into the published signature,
  keeps the member structurally accepted and IDE-visible, and fails
  `check:reference:signatures`. Tests inject via `event.locals.backend`, the same path the
  dev double rides. The intersection-hiding technique is disproven; do not reuse it.
- `NavLoadData`/`NavPageOption` are **frozen**, overriding the plan's illustrative Unstable
  list: `AdminData.nav` carries `NavLoadData`, and tier-by-frozen-owner governs.
- `resolveRouting` gained a runtime guard (typo'd or cast object routing values throw with
  the concept named); compile-only enforcement was judged insufficient given the pass's
  loud-boundary posture.
- `CairnPlatformBindings` carries only what the engine reads from `platform.env`:
  `AUTH_DB`, `EMAIL`, `PUBLIC_ORIGIN`, `GITHUB_APP_PRIVATE_KEY_B64`, optional
  `ANTHROPIC_API_KEY` (tidy). The GitHub App id/installation id are compile-time adapter
  config, and four guides that taught them as Worker secrets were corrected.

**What the process caught** (evidence the gate stack earns its keep):
- Task 2's first solution passed every locally-run gate and failed the CI-only
  `check:reference:signatures`; every later dispatch carried that gate by name.
- The new reverse-check gate found real drift on its first run (a `VocabularyLoadData` row
  for a never-exported type).
- The reviewer fan-out caught the bindings-fidelity warning after all mechanical gates were
  green; type-accuracy of documentation-bearing interfaces is invisible to the snapshot.
- Task 6's regroup silently broke `packages/cairn-cms-dev` and nothing failed until a manual
  showcase `svelte-check`; the friction log's owed `check:dev-package` gate now has its
  incident.

**Deliberate no-actions.** The site-config allowlist stays strict (`$schema` would be
rejected; add to `KNOWN_TOP_LEVEL_KEYS` only when a real tool wants it). The pre-existing
unguarded `SiteConfigError` on the settings/vocabulary save paths (bare 500) is logged, not
drive-by-fixed.

**Budgets.** Subagent tokens ≈ 5.9M total: the 19-agent adversarial audit workflow ≈ 1.9M
(including evidence agents), eleven implementer dispatches ≈ 3.0M, simplifier + three
reviewers ≈ 0.4M, review fixes ≈ 0.4M (main-loop tokens additional; see `/cost`). Human
interaction points during execution: one plan approval and two lightweight confirmations,
zero corrections; the concurrent strategy threads (mission review, polish, templates,
project sites) were Geoff-initiated and never blocked the pass.

**Carried follow-ups.** The owed `check:dev-package`/showcase-check gate (friction log, now
with evidence); the settings/vocabulary save 500 (friction log); `VocabularyLoadData`/
`SettingsData` barrel-export inconsistency (additive, decide post-freeze if a consumer needs
to name them); push the branch for a CI e2e run at merge per the ritual.
