# Code polish pass: measurement baseline and triage

Task 1 of `docs/superpowers/plans/2026-07-01-code-polish-pass.md`. Deterministic tool output over
the spec's scope (`src/lib`, `scripts`, `src/tests`, `examples/showcase`,
`packages/cairn-cms-dev`), captured 2026-07-01 on `code-polish-1` at `ac1fa96`, plus the triaged
work-list every finding must resolve into before the sweep starts.

`legacy/` (the frozen pre-rebuild snapshot, `140fca0`) is out of the pass's scope per the spec and
is excluded from every tool run below; it is unreferenced by any config (`tsconfig.json`
`exclude`s `examples`, and never `include`s `legacy`) and produces no other findings once
excluded.

## Reproducing this baseline

```
node --version   # v24.16.0
npm --version    # 11.15.0
npx knip --version    # 6.23.0
npx jscpd --version    # cpd 5.0.11 (the current jscpd CLI, a Rust rewrite of the classic tool)
```

Both tools run as one-shot `npx` invocations; neither is a new standing devDependency.
`knip.jsonc` is committed (it is configuration, not a dependency) with a header comment naming
this pass. Re-run both exactly as below for Task 8's after-pass delta.

## knip: dead exports, dead files, unused dependencies

```
npx knip --no-progress --max-show-issues 200
```

Config: `knip.jsonc` at the repo root. It defines three workspaces: `.` (the engine, scripts, and
tests, with `scripts/*.mjs` and the three vitest test globs added as extra entry points; every
`src/lib` export named in `package.json#exports`/`#bin` is already an entry via knip's built-in
npm plugin, so the config does not restate them — doing so was flagged as a redundant-entry
configuration hint and removed), `packages/cairn-cms-dev` (a real npm workspace, picked up
automatically), and `examples/showcase` (`"sveltekit": true` activates knip's SvelteKit plugin,
which treats every `+page`/`+layout`/`+server` route file and `hooks.server.ts` as an entry by
convention; without it the showcase's ~40 route and component files all showed up as "unused
files", which was configuration noise, not a real finding). `legacy/**` is ignored.
`examples/showcase/svelte-kit sync` was run once first so the plugin can resolve
`./.svelte-kit/tsconfig.json`; a fresh checkout needs that same sync before this command (CI's
`prepare`/`check` steps already run it).

**ignoreDependencies: `["cloudflare"]`** — every `src/tests/integration/*.test.ts` and
`src/lib` file that imports the Workers test env does `import { env } from 'cloudflare:test'`, a
protocol-scheme virtual module `@cloudflare/vitest-pool-workers` provides, not an npm package
named `cloudflare`. Knip's dependency scanner parses the `cloudflare:` prefix as a bare specifier
and flags it as unlisted; there is no real `cloudflare` package to add. Justified exclusion, not a
finding.

### Raw counts (post-config)

| Category | Count |
|---|---|
| Unused files | 0 |
| Unused dependencies | 1 |
| Unused devDependencies | 8 |
| Unlisted dependencies | 11 |
| Unresolved imports | 0 |
| Unused exports | 14 |
| Unused exported types | 27 |
| Configuration hints | 0 |

Zero unused files and zero unresolved imports is itself a result: it means the entry
configuration above is complete enough that every route, script, and barrel is reachable, and the
remaining findings are real dead surface, not scan gaps.

### Triage: dependencies

| Finding | Disposition | Notes |
|---|---|---|
| `codemirror` (root, unused dependency) | fix-in-sweep (cluster: `components/editor`) | Bare `codemirror` meta-package is never imported; only `@codemirror/*` subpackages are. Referenced once, in a comment in `editor-boundary.test.ts` describing the pattern the CM boundary test bans. Safe removal. |
| `daisyui`, `tailwindcss` (root, unused devDependency) | justify | Consumed only via CSS `@import`/`@plugin` directives in `scripts/admin-css.input.css` (`build-admin-css.mjs`'s Tailwind/DaisyUI compile), not a JS/TS import. Knip has no CSS/PostCSS plugin wired for this repo; false positive of the JS-only static scan. |
| `@fontsource-variable/fraunces`, `@fontsource-variable/source-code-pro`, `@fontsource-variable/source-sans-3`, `daisyui`, `tailwindcss` (showcase, unused devDependency) | justify | Same CSS-`@import` pattern, inside `examples/showcase/src/lib/theme.css`. Same false-positive class as above. |
| `@vitest/browser` (root, unused devDependency) | justify | Required peer for Vitest's browser test runner; the component project imports the provider plugin from `@vitest/browser-playwright`, but Vitest's browser mode itself needs `@vitest/browser` present. Not directly imported by any source file; a real, necessary devDependency. |
| `vfile` (unlisted; imported by `src/lib/render/pipeline.ts`, `resolve-links.ts`, `resolve-media.ts`) | fix-in-sweep (cluster: `content` / render) | Runtime value import (`VFile`), currently resolved only because `unified`/`remark-*` hoist it transitively. Add as an explicit `dependencies` entry; a transitive-only resolution is a phantom-dependency risk if the hoist chain ever changes. |
| `@lezer/common` (unlisted; imported by `src/lib/components/spellcheck.ts`, `src/tests/unit/objective-errors.test.ts`, `src/tests/unit/spellcheck-skip.test.ts`) | fix-in-sweep (cluster: `components/editor`) | Type-only import (`import type { Tree }`) today, but still requires the package to resolve at typecheck time; same phantom-dependency risk as `vfile`. Add explicitly. |
| `devalue` (unlisted; imported by `src/tests/component/app-forms.ts`, `CairnMediaLibrary.test.ts`, `EditPage.test.ts`, `MediaInsertPopover.test.ts`, and `examples/showcase/e2e/media-slice.spec.ts`) | fix-in-sweep (cluster: `tests` for the root component tests; `showcase+dev-package` for the e2e spec) | Not declared in either `package.json`; resolves today only because SvelteKit itself depends on `devalue` and hoists it. Add as an explicit devDependency in both `package.json`s. |
| `@playwright/test`, `@axe-core/playwright` (showcase, previously "unlisted") | resolved by config, not a finding | These were only "unlisted" before `examples/showcase` was configured as its own knip workspace; they are real `examples/showcase/package.json` devDependencies. No longer appears once the workspace boundary is correct. |

### Triage: unused exports (value exports, 14)

| Export | Location | Disposition | Notes |
|---|---|---|---|
| `pages` | `examples/showcase/src/lib/content.ts:23` | fix-in-sweep (cluster: `showcase+dev-package`) | Parallel to `posts` (which *is* consumed), but nothing imports `pages` directly; callers read `site.pages` instead. Drop the redundant named export. |
| `diagnosticAtCaret`, `buildPopoverDom` | `src/lib/components/editor-suggestion-popover.ts:20,36` | fix-in-sweep (cluster: `components/editor`) | Used only within their own file; no other module or test imports them by name. Drop `export` (make module-private) or add the direct unit test that justifies keeping the surface. |
| `validateUrlPolicy` | `src/lib/content/concepts.ts:71` | fix-in-sweep (cluster: `content`) | Same pattern: internal-only caller, `export` is vestigial. |
| `CF_API` | `src/lib/doctor/cloudflare-api.ts:8` | fix-in-sweep (cluster: `vite+doctor+bins+scripts`) | `src/tests/unit/doctor-checks-github.test.ts` redeclares the same literal locally instead of importing it — a drift risk as well as a dead export. Either drop the export or have the test import it. |
| `MAX_NAV_NODES`, `MAX_LABEL_LENGTH`, `MAX_URL_LENGTH` | `src/lib/nav/site-config.ts:15,18,21` | fix-in-sweep (cluster: `nav/site-config`) | `MAX_NAV_NODES` is a confirmed surface-pruning demotion (`docs/superpowers/plans/2026-07-01-surface-pruning-audit-verdicts.md:105`, `DEMOTE ... HOLDS`); `root-barrel-prune.test.ts` references it only as a string literal in an exclusion list, not an import, so it reads as unused. `MAX_LABEL_LENGTH`/`MAX_URL_LENGTH` are the same shape (internal-only constants, no test or caller imports them). This is exactly the "dead code the surface prune stranded" category the plan calls out. Demote to non-exported module constants. |
| `parseRawAttributeKeys` | `src/lib/render/component-grammar.ts:155` | fix-in-sweep (cluster: `content`) | Internal-only caller; referenced by name only in a `{@link}` JSDoc comment. |
| `ADMIN_NAV_ICON_NAMES` | `src/lib/sveltekit/admin-nav.ts:10` | fix-in-sweep (cluster: `sveltekit routes`) | Internal-only caller; `admin-nav-icons.ts` mentions it only in a comment ("mirrors ADMIN_NAV_ICON_NAMES"), not an import. |
| `resolveTidyConventions` (the **re-export** in `tidy-prompt.ts:13`) | `src/lib/sveltekit/tidy-prompt.ts:13` | fix-in-sweep (cluster: `nav/site-config`) | The function itself is heavily used (`content-routes.ts`, three test files) — but every caller imports it directly from `../nav/site-config.js`, never from `tidy-prompt.ts`'s barrel re-export. The re-export line is dead. A module-layout/barrel-convention item for the charter. |
| `invalidateAllCalls` | `src/tests/component/app-navigation.ts:15` | fix-in-sweep (cluster: `tests`) | Test-harness state export; no other test file imports it. |
| `postFieldset`, `pageFieldset` | `src/tests/unit/_content-fixture.ts:11,19` | fix-in-sweep (cluster: `tests`) | The derived `postFields`/`pageFields` arrays *are* consumed elsewhere; the raw fieldset objects are not. |

### Triage: unused exported types (27)

All 27 follow one shape: the type is used to type a function's parameter or return value within
its own file (so it is not dead code in the runtime sense), but no *other* file imports it by
name — TypeScript's structural typing means a caller can consume the inferred shape without
importing the type. Knip is correct that the named export itself has no external consumer today.

| Disposition | Count | Notes |
|---|---|---|
| fix-in-sweep (cluster matches the owning file) | 27 | Demote each to a non-exported (module-local) type unless the charter's naming/module-layout rule decides a class of internal detail types should stay exported for documentation purposes; that is a Task 3 charter call, not a Task 1 one. |

| Type | Location |
|---|---|
| `IngestPendingCard`, `IngestReadyCard`, `IngestCard` | `src/lib/components/client-ingest.ts:177,182,190` (cluster: `components/admin-screens`) |
| `ObjectiveErrorKind`, `ObjectiveFix` | `src/lib/components/objective-errors.ts:13,19` (cluster: `components/editor`) |
| `TidyRejectionReason` | `src/lib/components/tidy-validate.ts:32` (cluster: `components/admin-screens`) |
| `FieldBase` | `src/lib/content/fields.ts:5` (cluster: `content`) |
| `ManifestEntryDiff` | `src/lib/content/manifest.ts:215` (cluster: `content`) |
| `AltBucket` | `src/lib/content/media-rewrite.ts:311` (cluster: `content`) |
| `UsageOrigin`, `ReferenceUsageEntry` | `src/lib/content/reference-index.ts:28,31` (cluster: `content`) |
| `TagUsageOrigin`, `TagUsageEntry` | `src/lib/content/tag-usage-index.ts:27,30` (cluster: `content`) |
| `ConditionSeverity` (×2, `diagnostics/conditions.ts` and its `diagnostics/index.ts` re-export) | `src/lib/diagnostics/conditions.ts:9`, `src/lib/diagnostics/index.ts:3` (cluster: `nav/site-config` or a shared `diagnostics` note; same dead-barrel-reexport pattern as `resolveTidyConventions` above) |
| `CheckStatus` | `src/lib/doctor/types.ts:4` (cluster: `vite+doctor+bins+scripts`) |
| `OrphanByteRow`, `BrokenRefRow` | `src/lib/media/orphan-scan.ts:19,30` (cluster: `media`) |
| `PlannedEntry` | `src/lib/media/rewrite-plan.ts:30` (cluster: `media`) |
| `UsageOrigin` | `src/lib/media/usage.ts:31` (cluster: `media`) |
| `TidyConfig` | `src/lib/nav/site-config.ts:120` (cluster: `nav/site-config`) |
| `SlotKind` | `src/lib/render/registry.ts:11` (cluster: `content`) |
| `GuardReason` | `src/lib/sveltekit/condition-response.ts:39` (cluster: `sveltekit routes`) |
| `SettingsSaveFailure`, `TidyFailure`, `MediaAltPreviewEntry` | `src/lib/sveltekit/content-routes.ts:311,416,619` (cluster: `sveltekit routes`) |
| `PlatformContext` | `src/lib/sveltekit/types.ts:21` (cluster: `sveltekit routes`) |

## jscpd: duplication

```
npx jscpd --min-tokens 50 \
  --ignore "**/node_modules/**,**/dist/**,**/.svelte-kit/**,**/legacy/**,**/*.test.ts,**/fixtures/**" \
  --reporters json \
  --output <dir> \
  src/lib scripts src/tests examples/showcase/src packages/cairn-cms-dev/src
```

`--min-tokens 50` is jscpd's own long-standing default; kept rather than tuned tighter, since a
threshold much above 50 starts hiding the small (6-8 line) shared-helper duplications that are
still worth a sweep-cluster's attention. Docs and markdown are structurally excluded: none of the
five scanned roots contain `.md`/`.mdx` files, so no format restriction was needed for that
requirement. `*.test.ts` and `src/tests/fixtures/**` are excluded so fixture data and assertion
boilerplate do not dominate the report with test-authoring noise, which is a different (and
already-charter-governed, per the plan's test-idiom pattern family) concern than production-code
duplication.

The `--format` flag does not filter which regions of a `.svelte` file get analyzed: this cpd build
always decomposes a Svelte file into its `<script>` (reported as `typescript`), markup (reported
as `html`), and `<style>` (reported as `css`) regions regardless of the flag's value, so `--format`
was dropped rather than left in as a no-op. One artifact to note for Task 8's re-run: two `html`
findings report a file matched against **itself at an identical line range**
(`CairnAdminShell.svelte:15-263` against `CairnAdminShell.svelte:15-263`, and
`cairn.config.ts` against itself) — a self-match quirk of this cpd build's chunk hashing, not
real duplication. Both are dispositioned "justify: tool artifact" below and should not be expected
to persist as a real cluster.

### Raw counts

Total: 86 clone pairs across `typescript` (43), `html` (35), `javascript` (6), `css` (2). Grouped
by file pair (the natural triage unit; several file pairs account for many of the 86 raw hits):

| File pair (clone count) | Disposition | Cluster |
|---|---|---|
| `CairnMediaLibrary.svelte` self-duplication (25) | fix-in-sweep, high value | `media` |
| `content-routes.ts` self-duplication (16) + `content-routes.ts` ↔ `nav-routes.ts` (1) | fix-in-sweep, high value, flag for extra care | `sveltekit routes` |
| `fake-app-db.ts` ↔ `fake-auth-db.ts` (3) | fix-in-sweep | `showcase+dev-package` |
| `reference-index.ts` ↔ `tag-usage-index.ts` (3) + ↔ `media/usage.ts` (2) | fix-in-sweep (the "usage index" triplication) | `content` (spans into `media`; the shared indexing shape is the same pattern in both) |
| `check-cm-internals.mjs` ↔ `check-custom-surface.mjs` (2) | fix-in-sweep | `vite+doctor+bins+scripts` |
| `check-reference-signatures.mjs` ↔ `reference-coverage.mjs` (2) + `check-surface.mjs` ↔ `reference-coverage.mjs` (1) | fix-in-sweep | `vite+doctor+bins+scripts` |
| `check-public-tokens.mjs` ↔ `reskin-fixture.mjs` (1) | fix-in-sweep, low priority | `vite+doctor+bins+scripts` |
| `CairnTidySettings.svelte` self-duplication (2) | fix-in-sweep | `components/admin-screens` |
| `ObjectGroupField.svelte` ↔ `RepeatableField.svelte` (2), `FieldInput.svelte` ↔ `ObjectGroupField.svelte` (1), `FieldInput.svelte` ↔ `RepeatableField.svelte` (1) | file-for-decision | See "the form-renderer family" note below |
| `ComponentForm.svelte` self-duplication (html + typescript, 2) | file-for-decision | Same note |
| `editors-routes.ts` self-duplication (2) | fix-in-sweep | `sveltekit routes` |
| `SiteFooter.svelte` ↔ `SiteHeader.svelte` (css + html, 2) | fix-in-sweep, low priority | `showcase+dev-package` |
| `styleguide/+page.svelte` self-duplication (css, 1) | justify (pending charter confirmation) | The styleguide page intentionally repeats markup/token blocks to demonstrate variants side by side; treat as a documentation page, not production duplication, unless Task 3's charter says otherwise. |
| `feed.json/+server.ts` ↔ `feed.xml/+server.ts` (1) | fix-in-sweep, low priority | `showcase+dev-package` |
| `CairnAdminShell.svelte` self-match, identical range (1) | justify: tool artifact | Not real duplication; see note above. |
| `cairn.config.ts` self-match, identical range (1) | justify: tool artifact | Same. |
| `CairnAdminShell.svelte` ↔ `CairnMediaLibrary.svelte` (html, 1) | fix-in-sweep, low priority | `media` / `components/admin-screens` |
| `CairnMediaLibrary.svelte` ↔ `MediaInsertPopover.svelte` (typescript, 1) | fix-in-sweep | `media` |
| `ConceptList.svelte` ↔ `EditPage.svelte` (html, 1) + `ConceptList.svelte` self (html, 1) | fix-in-sweep, low priority | `components/admin-screens` |
| `EditPage.svelte` ↔ `EditorToolbar.svelte` (html, 1) | fix-in-sweep, low priority | `components/editor` |
| `MediaFigureControl.svelte` ↔ `MediaHeroField.svelte` (html, 1) | fix-in-sweep | `media` |
| `editor-folding.ts` self-duplication (1) | fix-in-sweep, low priority | `components/editor` |
| `editor-highlight.ts` ↔ `editor-modes.ts` (1) | fix-in-sweep, low priority | `components/editor` |
| `advisories.ts` ↔ `reference-index.ts` (1) + `advisories.ts` ↔ `tag-usage-index.ts` (1) | justify | Shared eight-line **import block** (both files import the same handful of local content-layer modules); at `min-tokens 50` this is import-statement noise, not logic duplication. |
| `frontmatter.ts` (`multiselectFormValue`) ↔ `taxonomy.ts` (`coerceTags`) (1) | fix-in-sweep | `content`. Two identically-bodied helpers (array to `map(String)`, trimmed single string, else `[]`); real small-helper duplication worth a shared utility. |
| `links.ts` ↔ `pending.ts` (1) | fix-in-sweep | `content`. Both parse a slash-separated `<concept>/<id>` token off a prefix-stripped string with near-identical structure; a shared "parse concept/id token" helper is the natural fix. |
| `resolve-links.ts` ↔ `resolve-media.ts` (1) | fix-in-sweep | `content` (render). |

**The form-renderer family (`ComponentForm`, `FieldInput`, `ObjectGroupField`,
`RepeatableField`):** the plan's Task 1 brief calls out "the `ComponentForm`/`FieldInput`
duplication" as belonging to Task 7's guarded rider, and this measurement confirms that pairing
plus widens it: `FieldInput.svelte` also cross-duplicates with `ObjectGroupField.svelte` and
`RepeatableField.svelte`, and `ObjectGroupField`/`RepeatableField` duplicate each other directly.
All four share the same phase-3a multi-instance-focus hazard the plan's Task 7 constraint names.
Disposition: **file-for-decision**, routed to Task 7's dispatch — that task already carries
the guard-tests-first protocol and the revert-and-record escape hatch this family needs; the sweep
(Task 4) must not touch these four files itself. Task 7's outcome note should state explicitly
whether it widened scope to `ObjectGroupField`/`RepeatableField` or left them for a later ROADMAP
entry.

## File-size and function-length outliers

Both are throwaway one-off scans (recorded here verbatim, not committed as scripts) over
`src/lib` and `examples/showcase/src`.

### File-size (LOC)

```
find src/lib examples/showcase/src -name "*.ts" -o -name "*.svelte" | grep -v node_modules \
  | xargs wc -l | sort -rn | head -30
```

| Lines | File | Disposition |
|---|---|---|
| 3435 | `src/lib/sveltekit/content-routes.ts` | file-for-decision, cross-referenced with the jscpd self-duplication finding below; counted once, there |
| 3198 | `src/lib/components/CairnMediaLibrary.svelte` | file-for-decision, cross-referenced with the jscpd self-duplication finding below; counted once, there |
| 2142 | `src/lib/components/EditPage.svelte` | justify: composes the four edit-page zones (`cairn-edit-page-redesign-initiative`'s own architecture); size tracks a deliberately unified surface, not accidental sprawl. Task 3's charter should confirm this reading against the survey rather than take it on faith here. |
| 1004 | `src/lib/components/MarkdownEditor.svelte` | justify: the CodeMirror integration surface; same reasoning as `EditPage.svelte` |
| 850 | `src/lib/components/HelpHome.svelte` | file-for-decision, low priority (cluster: `components/admin-screens`) |
| 776 | `src/lib/components/spellcheck.ts` | file-for-decision, cross-referenced with the function-length finding below; counted once, there |
| 657 | `examples/showcase/src/routes/(site)/styleguide/+page.svelte` | justify: cross-referenced with the jscpd self-duplication finding above; a demo page enumerating every recipe, where the repetition is the point |
| everything below 600 lines | not flagged | Within the range the survey/charter should judge case by case; no outlier signal on length alone. |

The two clear outliers, `content-routes.ts` and `CairnMediaLibrary.svelte`, are exactly the two
files the jscpd self-duplication clusters above point at (16 and 25 internal clone hits
respectively) and, for `content-routes.ts`, the single largest function-length outlier below. All
three signals converging on the same two files is the strongest finding this measurement
produced.

**Disposition: file-for-decision for both**, not fix-in-sweep outright. A behavior-preserving
split of a 3000+ line file/factory is exactly the kind of structural change the plan's
per-cluster verifiers (behavior-preservation and charter-conformance) exist to catch, but the risk
profile is different in kind from a renamed helper or a demoted export: Task 3's charter should
decide the target module shape for each (for `content-routes.ts`, most likely extracting each
named action handler — `editLoad`, `renameAction`, `saveToBranch`, etc., see the
function-length table below — out of the `createContentRoutes` closure into its own module,
keeping the factory as a thin composer; for `CairnMediaLibrary.svelte`, most likely extracting the
repeated markup fragments the jscpd self-matches point at into child components or snippets), and
whichever cluster owns each file should treat it as the cluster's primary work item rather than a
drive-by fix.

### Function length (heuristic, brace-depth from declaration to matching close, >=60 lines)

```js
// throwaway, not committed: scans src/lib + examples/showcase/src for function/arrow
// declarations, tracks brace depth from the declaration line to its close, and reports every
// span >= 60 lines. Heuristic (regex-detected declarations, not an AST), so it undercounts
// arrow functions assigned inside object literals and may miscount a brace inside a template
// literal or regex; good enough for outlier triage, not for a standing gate.
```

43 spans found at or above 60 lines. The top of the list:

| Lines | Location | Name | Disposition |
|---|---|---|---|
| 2002 | `src/lib/sveltekit/content-routes.ts:693` | `createContentRoutes` | file-for-decision, cross-referenced with the file-size and jscpd findings above; counted once, there. This *is* the file-size outlier, measured as one function. |
| 236 | `src/lib/components/spellcheck.ts:541` | `cairnSpellcheck` | file-for-decision, cross-referenced with the file-size finding above; counted once, there |
| 175 | `src/lib/sveltekit/cairn-admin.ts:79` | `createCairnAdmin` | justify: the single-mount admin composer; this shape is the documented seam (`cairn-single-mount-admin-initiative`) |
| 166 | `src/lib/content/fieldset.ts:136` | `validateField` | justify, pending charter confirmation: a per-field-type validation switch, likely one arm per `FieldDescriptor` variant, which is inherent to the type rather than sprawl |
| 155/153/152 | `content-routes.ts:1059/1779/1294` | `editLoad`/`renameAction`/`saveToBranch` | cross-referenced with the `content-routes.ts` file-for-decision above; counted once, there |
| 147 | `src/lib/components/editor-suggestion-popover.ts:82` | `cairnSuggestionPopover` | justify, pending charter confirmation: a CodeMirror extension factory whose shape the CM6 API sets |
| the remaining 35 entries, 59-127 lines each | various (`auth-routes.ts`, `nav-routes.ts`, `media-route.ts`, `public-routes.ts`, `content-index.ts`, several more `content-routes.ts` handlers, a handful of components) | fix-in-sweep, deferred to each owning cluster's judgment against the eventual charter, one row here rather than 35 | None individually rises to the `content-routes.ts`/`CairnMediaLibrary.svelte` level; listing all 35 with an isolated verdict each would front-run the charter this scan cannot see yet. |

## Disposition tally

Counting methodology: the knip dependency and export findings are counted at their precise raw
count (each is a single named symbol or package); the unused-exported-types share one disposition
rule across all 27 and are counted at that raw count too. The jscpd and outlier findings are
counted at the row/cluster granularity shown in their tables (the natural triage unit for
duplication and size, per the plan's own framing of the `ComponentForm`/`FieldInput` pair as one
work-list entry), not at the level of every raw clone-pair or every one of the 43 function-length
spans. A finding that appears in more than one table (`content-routes.ts`, `CairnMediaLibrary.svelte`,
`spellcheck.ts`, `styleguide/+page.svelte`) is counted once, at its first appearance, and marked
"cross-referenced" everywhere else.

| Disposition | knip deps | knip exports | knip types | jscpd (rows) | file-size (new) | function-length (new) | Total |
|---|---|---|---|---|---|---|---|
| fix-in-sweep | 4 | 14 | 27 | 21 | 0 | 1 | 67 |
| justify | 8 | 0 | 0 | 4 | 2 | 3 | 17 |
| file-for-decision | 0 | 0 | 0 | 2 | 1 | 0 | 3 |
| **Total** | 12 | 14 | 27 | 27 | 3 | 4 | **87** |

## Gate

- `npm run package`: clean (`svelte-package` warns once about `import.meta.env`, pre-existing and
  unrelated to this task; `daisyUI 5.5.23` admin CSS build and the dist `.svelte` transpile both
  completed).
- `npm run check`: `0 ERRORS 0 WARNINGS` (1265 files).
- This task changes no `src/lib`/`src/tests`/`scripts` source, so the full `npm test` run is not
  required by the plan's per-task gate; not run for this task.
- `npm run check:docs`: to be confirmed after this file is committed.

## Deltas (Task 8, post-sweep)

Re-run with the exact invocations above, 2026-07-02 on `code-polish-1` after Tasks 4-7 (the sweep
and the three riders) landed, plus Task 8's own two surface changes. `knip` picked up a patch
bump (6.23.0 to 6.24.0, an unpinned `npx` resolving the latest release, not a repo edit);
`jscpd` held at `cpd 5.0.11`.

### knip

| Category | Before | After | Delta |
|---|---|---|---|
| Unused files | 0 | 0 | 0 |
| Unused dependencies | 1 | 0 | -1 |
| Unused devDependencies | 8 | 8 | 0 |
| Unlisted dependencies | 11 | 0 | -11 |
| Unresolved imports | 0 | 0 | 0 |
| Unused exports | 14 | 2 | -12 |
| Unused exported types | 27 | 5 | -22 |
| Configuration hints | 0 | 0 | 0 |
| **Total findings** | **61** | **15** | **-46** |

The 8 unused devDependencies are the same CSS-`@import`-only false positives justified in the
baseline (`daisyui`/`tailwindcss` root and showcase, the three Fontsource packages,
`@vitest/browser`); knip has no CSS plugin wired, so the finding is stable and expected, not a
regression. The remaining 7 findings are new residuals, not baseline holdovers:

- `expectHttpError`, `ED_EDITOR` (`src/tests/unit/_content-harness.ts`) — new. The `tests`
  cluster's harness convergence (`32c3822`) created this shared harness; both symbols are
  consumed by other test files through their *original* modules
  (`_redirect-assertions.ts`, direct import), not through this barrel re-export, the same
  dead-internal-re-export-shim class the M3 charter rule already names (`resolveTidyConventions`
  in the baseline). Left open; a future pass's `tests` cluster touch is the natural place to close
  it.
- `DoctorArgs` (`src/lib/doctor/index.ts`) — new, from the sweep's own M2 doctor split
  (`f6f2b5f`): `index.ts` became a pure re-export barrel over the new `assemble.ts`. Its sibling
  `DerivationSources` has an external consumer and does not trip the signal; `DoctorArgs` does not
  yet. Same M3 shim class as above.
- `TidyConfig` (`src/lib/nav/site-config.ts`) — survived from the baseline (same finding, line
  120 to 122). It types `CairnRuntime.tidy` in `content/types.ts` only through an inline
  `import('../nav/site-config.js').TidyConfig` type reference, which knip's static import scan
  does not trace as a consumer; a real public-surface type, exported for documentation, per the
  baseline's own "used to type a signature, no named import elsewhere" disposition class.
  Justified, not fixed.
- `AdvisoryNotice`, `AdvisoryAction` (`src/lib/sveltekit/content-routes-core.ts`) — new, from the
  `content-routes.ts` decomposition (`ade6061`/`f79e491`): the middle barrel hop
  (`content-routes-core.ts` re-exporting from `content/advisories.js`) is dead because every
  external caller imports from `content-routes.ts`'s own re-export instead. Same M3 shim class.
- `TidyResult` (`src/lib/sveltekit/content-routes.ts:65`) — new, same decomposition, same M3 shim
  class: the type is admin-internal (per the sveltekit reference doc, not exported on the
  `/sveltekit` subpath) and the internal re-export line has no in-repo named-import consumer.

None of the five is a behavior risk; all read as small, real M3 dead-shim residuals a future
`sveltekit routes` or `tests`-cluster touch can close, not something this consolidation task
should carry a sweep-shaped fix for.

### jscpd

| Format | Before | After | Delta |
|---|---|---|---|
| typescript | 43 | 18 | -25 |
| html | 35 | 35 | 0 |
| javascript | 6 | 0 | -6 |
| css | 2 | 9 | +7 |
| txt | 0 | 2 | +2 |
| **Total clone pairs** | **86** | **64** | **-22** |

The `content-routes.ts` self-duplication (16 hits) and its `nav-routes.ts` cross-hit (1) are gone:
the file dropped from 3,435 to 128 lines (a thin composer), decomposed per the charter's
"Structural decisions" into `content-routes-core.ts`, `-media.ts`, `-tidy.ts`, `-settings.ts`,
`-dictionary.ts`, `-context.ts`. A smaller residual persists inside the new files
(`content-routes-media.ts` self, 7; `content-routes-core.ts` self, 1;
`content-routes-settings.ts` self, 1) — the parallel CSRF-then-session-then-commit-and-retry
shape each action handler follows, structurally inherent to the domain rather than copy-paste,
matching the baseline's own "per-field-type switch" justification class.

**`CairnMediaLibrary.svelte`'s 25-hit `html` self-duplication survived unchanged, by explicit
charter decision** (`docs/internal/code-idioms.md`, "Structural decisions": *"`CairnMediaLibrary.svelte`
is NOT split this pass. Component splits couple template, state, and focus behavior (the phase-3a
lesson); the S3 extractions remove several hundred script lines instead, and a component split is
filed to ROADMAP as its own future pass."*). S3 (the shared check-and-tint class helper, the typed-
confirm gate, the fetch/deserialize/stale-guard round-trip, the origin-refocus lifecycle) closed
the file's *script*-level duplication (part of the typescript delta above); the *markup*-level
duplication jscpd's `html` format measures is untouched on purpose, since a template split risks the
same multi-instance-focus hazard Task 7 guards against. This is the html format's entire unchanged
count (35 before and after is this one file, unchanged; every other `html` pair in the before table
also persisted, none regressed or newly appeared). Filed to ROADMAP in this task (see the ROADMAP
diff), closing the charter's promised filing.

The `javascript` format (6 hits, baseline) reads as 0 now: the `vite+doctor+bins+scripts` cluster's
convergence (`check-cm-internals.mjs`/`check-custom-surface.mjs`,
`check-reference-signatures.mjs`/`reference-coverage.mjs`/`check-surface.mjs`) closed every
baseline `javascript`-format finding; jscpd's per-file format classification otherwise held
stable between the two runs (same 5.0.11 build).

`css` grew from 2 to 9 and a new `txt` category (2, the bundled OFL font-license bodies
cross-matching each other's boilerplate legal text) appeared; neither is a regression this pass
introduced carelessly:

- `SiteFooter.svelte` ↔ `SiteHeader.svelte` (css, 12 lines) — survived from the baseline, still
  `fix-in-sweep, low priority`, not closed.
- `theme.css` self (11 lines, the light/dark `@plugin "daisyui/theme"` geometry blocks) and
  `cairn-admin.css` self (2 hits, the light/dark `[data-theme=...]` font-family preambles) — new,
  but structural: DaisyUI's per-theme-block API requires each theme to restate its own geometry
  and font variables, so light and dark inevitably duplicate the shared subset. The same class as
  the baseline's own "per-field-type switch is inherent to the type" justification.
- `prose.css` ↔ `styleguide/+page.svelte` (4 hits) and the styleguide's own self-duplication (1,
  survived from the baseline) — the styleguide route intentionally demonstrates prose tokens
  live, which duplicates `prose.css`'s rules by design; same "documentation page, not production
  duplication" disposition the baseline already gave the styleguide's self-match.
- The two `txt` hits (bundled OFL font-license files cross-matching each other) are boilerplate
  legal text jscpd's tokenizer now buckets under a `txt` format rather than falling out of scope;
  not source duplication, not actionable.

**Disposition tally.** Of the 87 baseline findings, the sweep closed roughly 68 (the entire knip
dependency/export/type set save the 5 residuals above, the `content-routes.ts` and
`vite+doctor+bins+scripts` jscpd clusters, most of the low-priority single-hit jscpd rows). The
`CairnMediaLibrary.svelte` file-for-decision and the form-renderer family (Task 7's guarded rider;
see its own outcome note) were the two findings the baseline explicitly flagged as out of the
sweep's scope, and both resolved exactly as flagged: the former deferred to ROADMAP, the latter to
Task 7's guard-or-revert protocol.
