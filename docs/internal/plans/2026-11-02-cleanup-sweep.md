# Scoped sweep: cairn-cms slice `cleanup` (run sheet pass 8)

Read at `9ea74f78a` (`main`). Date 2026-11-02. Read-only on the repo.

**Counts (55 items):** fold 43, keep 7, reword 1, done 2, drop 2, duplicate 0.

**Line numbers are `main`'s.** Pass 7 is not merged. It rewrites parts of these files, so the planner re-quotes each after it merges: `src/lib/admin/EditPage.svelte` (`flash` moves from :1277 to :1308 on `worktree-p2-p4-run`), `src/lib/sveltekit/content-routes-entry-write.ts`, `src/lib/sveltekit/auth-routes.ts`, `src/lib/auth/roles.ts`, `src/lib/content/fields.ts`, `src/lib/sveltekit/nav-routes.ts`, `scripts/checks/api-surface.md`, `src/lib/admin/FieldInput.svelte`, `skills/cairn-extending-a-site/references/log-events.md`, `docs/editors/when-something-goes-wrong.md`.

**Overlap with pass 7.** #276 is its own (T8, commit `35ac4a8e3`, closes in T11). #180, #182, #238, #255, #256 are its folds and are out of this sweep. File-only overlap, no shared lines: #263, #268, #289 (`EditPage.svelte`), #199, #200 (`content-routes-entry-write.ts`), #280, #243 (`auth-routes.ts`, `roles.ts`), #239 (`fields.ts` doc comments), #277 (`nav-routes.ts`), #277, #279 (`api-surface.md`), #232 (`log-events.md`). Pass 7's branch also adds #290 (Orca walk, Placement: site work), which is not on `main`; its number is taken, so this round files from #291.

**Stale Placement, unnamed items:** none. Every open item outside the scope names a later or open placement (Pass 7, After the release, Release, The one release). #249, in scope, names `tool-gates`, a closed pass. Side note: #185 and #195 say "The one release", which the rebuild-driven-releases memory supersedes; that is not a closed pass.

**Full sweep:** pass 7's plan places it at this pass's close, 39 of 67 unstamped then.

---

## Group A: `EditPage.svelte` and editor forms (ordinary)

#263, #289, #268 share `src/lib/admin/EditPage.svelte`. #275's sibling list is there too. #268 also takes `RenameDialog.svelte`. #269 stands alone beside them.

### #263 Show one saved notice when a save carries a reference warning: **fold**
- Mechanism: `src/lib/admin/EditPage.svelte:1277`: `if (data.flash === 'saved' && !draftWarning)`. `:1291`: ``if (draftWarning) return `Saved. This entry links to entries that visitors can't reach yet: ${draftWarning}.`;``
- Reason: both gaps hold and pass 7's rewrite keeps both lines.
- Fix: add `&& !referenceWarning` at :1277, and have `politeMessage` join both notices when both flags are set. Tests in `src/tests/component/EditPage.test.ts`.
- Class ordinary. Files: `src/lib/admin/EditPage.svelte`, `src/tests/component/EditPage.test.ts`. 15 min.

### #289 Keep the admin's accessible names honest: **fold**
- Mechanism: `src/lib/admin/EditPage.svelte:942`: `? 'Switch to Write to edit this block'`. `:946`: `: 'Place the cursor in an editable block to edit it',`. `src/lib/admin/ComponentInsertDialog.svelte:429`: `{filtered.length} {filtered.length === 1 ? 'block matches' : 'blocks match'}`. `src/lib/admin/editor-highlight.ts:57`: `const MACHINERY_HINT = 'Block marker. Edit the text between these lines and leave this line as it is.';`, used on the leaf at `:66`: `const leafLine = Decoration.line({ class: 'cm-cairn-directive-leaf', attributes: { title: MACHINERY_HINT } });`
- Reason: all four hold, and each is a one-string change.
- Fix: a stable name "Edit block" with the reason in the tooltip, and an honest Preview reason at :946; announce the count only with a non-empty query and a non-zero result; give the leaf its own hint. Renamed labels trip `check:editor-quotes`, so grep the editors pages and specs for the old strings.
- Class ordinary. Files: `src/lib/admin/EditPage.svelte`, `src/lib/admin/ComponentInsertDialog.svelte`, `src/lib/admin/editor-highlight.ts`, their component tests. 35 min.

### #268 Stop a double submit on the Discard and Rename forms: **fold**
- Mechanism: `src/lib/admin/EditPage.svelte:2787`: `<form method="POST" action="?/discard" class="flex justify-end gap-2" onsubmit={() => (leaving = true)}>`. `src/lib/admin/RenameDialog.svelte:81`: `<form method="POST" action="?/rename" class="flex flex-col gap-3" onsubmit={() => onsubmitting?.()}>`. The shape to copy: `src/lib/admin/DeleteDialog.svelte:138`: `<button type="submit" class="btn btn-sm btn-error" disabled={deleting}>`.
- Reason: neither form has a guard, and pass 7 did not add one (`RenameDialog.svelte` is outside its diff).
- Fix: a `$state` flag set on submit, a disabled button, and DeleteDialog's `onpageshow` reset (`:81`), so a back navigation doesn't strand it.
- Class ordinary. Files: `src/lib/admin/EditPage.svelte`, `src/lib/admin/RenameDialog.svelte`, component tests. 25 min.

### #275 Remove the list bullets beside repeatable rows: **fold**
- Mechanism: `src/lib/admin/RepeatableField.svelte:211`: `<ul class="flex flex-col gap-2">`. The admin omits Preflight's list reset on purpose: `src/lib/admin/cairn-admin.css:633-634` warns that `list-style: none` removes list semantics in WebKit/VoiceOver (WCAG 1.3.1).
- Reason: holds, but the item's bare `list-none` breaks that rule.
- Fix: `role="list"` with `list-none p-0`, the shape `CairnTidySettings.svelte:581` and `ReferenceField.svelte:80` already use for `role="list"`. `EditPage.svelte:2500`'s `<ul class="flex flex-col gap-1">` has the same defect; take it in the same line.
- Class ordinary. Files: `src/lib/admin/RepeatableField.svelte`, optionally `src/lib/admin/EditPage.svelte`. Check the Details-pane baselines. 10 min.

### #269 Render a block attribute's help text: **fold**
- Mechanism: `src/lib/render/registry.ts:118`: `attributes?: Record<string, FieldDescriptor>;`. `src/lib/admin/ComponentForm.svelte:362`: ``{#if slot.help}<p id={`hint-${slot.name}`} class="type-body text-muted mt-1">{slot.help}</p>{/if}``. The attribute loop at `:263` (`{#each attributes as [name, field] (name)}`) reads no `field.help`.
- Reason: holds across every branch of the attribute loop.
- Fix: a hint paragraph after each attribute control, with `aria-describedby` from the `slotDescribedBy` shape at `:127`.
- Class ordinary. Files: `src/lib/admin/ComponentForm.svelte`, `src/tests/component/ComponentForm.test.ts`. 20 min.

---

## Group B: `gate-tier.mjs` and the fast lane (runner)

#260, #265, #266, #267, #285 all touch `scripts/checks/gate-tier.mjs` and `src/tests/unit/gate-tier.test.ts`. Run them as one task, not a pair.

### #260 Stop a stale `dist` hiding a red test in the fast lane: **reword**
- Mechanism: `scripts/checks/gate-tier.mjs:720`: `chain.push(...staticLeg(closeLabels, context));`, with `:451`: ``else if (closeSelected.length > 0) commands.push(`npm run check:close -- ${closeSelected.map(shellQuote).join(' ')}`);``. `close-prebuilt.mjs` builds `dist` once, ahead of the unit leg in the same chain. A classifier run on `4d9522b18~1..4d9522b18` printed `check:close` first and the unit leg after it.
- Reason: the lane already builds `dist` for a `src/lib` range, so the item's first fix exists; what's left is a hand `vitest run` on an old `dist`, which is how both cited incidents happened. I confirmed the order for one range, not for every path set.
- Cut text: "**#260** Warn when a unit run reads a `dist` older than `src/lib`. `delivery-media-vite-barrel-prune.test.ts` and 34 other unit files read `dist`. The fast lane rebuilds it first, but a hand `vitest run` does not: in `content-rest` an implementer's hand run passed on a pre-rename `dist` and CI found the miss on `b6477b0d0`, and `vite-bin.test.ts` failed the other way until a rebuild. Compare the newest `src/lib` mtime to `dist` in the unit project's global setup and print one line. Related to #258."
- Shape if the planner folds the cut: a `globalSetup` warning in `vitest.config.ts`. It must warn, not throw, or it fails runs that read no `dist`. Class ordinary (`vitest.config.ts` is outside the map). 25 min.

### #265 Make the fast lane see run-time file reads: **fold**
- Mechanism: `scripts/checks/gate-tier.mjs`, unit selection: ``unit = `npx vitest related --run --passWithNoTests --project unit ${unitInputs.map(shellQuote).join(' ')}`;``
- Reason: holds; 68 unit files call `readFile`, against the item's 38 that read `src/`, so don't reuse the number.
- Fix: at classify time, for each changed `src/` path, find unit tests whose text names that repo-relative path and add them to `unitInputs`. A test that walks the tree stays with CI.
- Class runner. Files: `scripts/checks/gate-tier.mjs`, `src/tests/unit/gate-tier.test.ts`. 35 min.

### #266 Stop `componentPlan` running the whole project: **fold**
- Mechanism: `scripts/checks/gate-tier.mjs:488`: `if (reach.length === 0) return { mode: 'full', reason: 'nothing under src/ to select from', reach: [] };`. Item says :480, now the trigger check.
- Reason: holds; `src/tests/unit/gate-tier.test.ts:295-297` pins the behavior.
- Fix: return `mode: 'skip'`, and flip the test. First confirm `package.json`, the lockfile, and the vitest config are in `scripts/test/component-rerun-triggers.mjs`, since those trigger above this line and must stay full.
- Class runner. Files: `scripts/checks/gate-tier.mjs`, `src/tests/unit/gate-tier.test.ts`. 10 min.

### #267 Run the npm checks that read `tool/testdata/`: **fold**
- Mechanism: `scripts/checks/gate-tier.mjs:672`: ``const npmPaths = paths.filter((path) => !path.startsWith('tool/'));`` (again at `:580`). `scripts/checks/check-symbols.mjs:412`: `const path = join(root, 'tool/testdata/flags.json');` (again at `:430`).
- Reason: holds.
- Fix: keep `tool/testdata/flags.json` in `npmPaths` at both lines and map it to `check:symbols` in `scripts/checks/gate-table.json`.
- Class runner. Files: `scripts/checks/gate-tier.mjs`, `scripts/checks/gate-table.json`, `src/tests/unit/gate-tier.test.ts`. 20 min.

### #285 Run `unit-dist-spawn` when `src/lib/internal.ts` changes: **fold**
- Mechanism: `vitest.config.ts:124`: `name: 'unit-dist-spawn',`, with `src/tests/unit/delivery-dist-spawn.test.ts:18`: `const INTERNAL = resolve(ROOT, 'dist/internal.js');`. `gate-tier.mjs` names neither the project nor `internal.ts`.
- Reason: holds.
- Fix: when `src/lib/internal.ts` is in the range, push `npx vitest run --project unit-dist-spawn` onto `chain` after the unit leg, so it follows the `dist` build.
- Class runner. Files: `scripts/checks/gate-tier.mjs`, `src/tests/unit/gate-tier.test.ts`. 20 min.

---

## Group C: the engine skills (runner)

#286 and #273 share `durable-gotchas.md`. #272 is separate but should land first, since it changes the class of later work.

### #286 Add the `small-api` traps to the durable gotchas: **fold**
- Mechanism: `.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`, 630 lines, has no hit for `mount-contract-reshape`, `emit:template` as a `guidance/bin.test.ts` trap, or the wrapped-phrase grep. Its one `emit:template` section at `:204` is `## A probe site from `emit:template` sees no shipped guidance`.
- Reason: absent and concrete.
- Fix: six short entries plus the file's index at the top.
- Class runner. Files: that file. 12 min (with #273: one task).

### #273 Add this pass's traps to the durable gotchas: **fold**
- Mechanism: same file. `:318` already holds: `` `emit-tool-conditions.mjs` and `check-readiness.mjs` read `dist` rather than the TypeScript source.``
- Reason: three of the four are absent; the `emit-tool-conditions.mjs` trap is already there, so skip it.
- Fix: three entries: the `viewAction` delegate, the empty range before a commit, the renamed label.
- Class runner. Files: that file. 8 min.

### #272 Add `guard.ts` and `preview.ts` to the `auth-data` map: **fold**
- Mechanism: `.claude/skills/cairn-running-passes/SKILL.md:30`: `` - `auth-data`: `src/lib/{auth,auth-crypto,github}/**`, `src/lib/sveltekit/{csrf*,auth-*,commit-log}.ts`, `src/lib/admin/{csrf-context.ts,CsrfField.svelte}`, `migrations*/**`, ...``
- Reason: holds.
- Fix: add `src/lib/sveltekit/{guard,preview}.ts`. The map also lives in this pass's prompts and maybe in the workstation's `cairn-pass` adapter, which I did not check; a copy there belongs to `workstation`.
- Class runner. Files: `.claude/skills/cairn-running-passes/SKILL.md`. 5 min.
- Sequencing: once this lands, #282's `preview.ts` edit is `auth-data`. Either run #282 first or class it `auth-data`.

---

## Group D: public surface and its checks

#277 and #279 share `scripts/checks/api-surface.md`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, and the ledger. #279, #198 share `check-self-use-allowlist.json`. #281 shares `api-surface.md` by report only. #234 sits in a barrel-prune test #279 may also touch.

### #277 Decide whether `createNavRoutes` stays public: **fold**
- Mechanism: `src/lib/sveltekit/index.ts:40`: `export { createNavRoutes, type NavRoutes, type NavRoutesConfig } from './nav-routes.js';`. Its only caller: `src/lib/sveltekit/cairn-admin.ts:109`: `const nav = runtime.navMenu ? createNavRoutes({ runtime }) : null;`
- Reason: the `cleanup-hide-internals` ruling already sets the rule and its reopen condition, and no site's `src/` names it (907-life, ecxc-ski, aksailingclub-org, cairn-pub grepped), so this is an application of the ruling, not a new one. Recommend hide.
- Fix: drop the barrel line, update `api-surface.md:265`, `src/tests/unit/nav-exports.test.ts`, the allowlist if listed, `CHANGELOG.md`, `MIGRATION-NOTES.md`, and name it in the ruling's record.
- Class runner (`api-surface.md` is under `scripts/checks/`). Files as above. 20 min.

### #279 Decide whether `FormatTimestampOptions` and `EntryDataOverrides` stay public: **fold**
- Mechanism: `src/lib/admin-toolkit/index.ts:20`: `type FormatTimestampOptions,`. `src/lib/delivery/index.ts:35`: `export type { PublicRoutesConfig, PublicRoutes, EntryData, EntryDataOverrides } from './public-routes.js';`
- Reason: no public function takes either, and no site's `src/` names either. Same ruling as #277.
- Fix: drop both from the barrels, `api-surface.md:120,180`, `scripts/checks/check-self-use-allowlist.json:19,23`, then `CHANGELOG.md`, `MIGRATION-NOTES.md`.
- Class runner. Files as above. 20 min.

### #280 Drop the tier tags from hidden functions: **fold**
- Mechanism: `src/lib/delivery/public-routes.ts:170`: ` * @beta` above `export async function composeEntryData(`. `src/lib/sveltekit/auth-routes.ts:486`: ` * @beta` above `export interface AuthRoutes {` at `:488`.
- Reason: holds; `composeEntryData` is a one-line ordinary edit, but `auth-routes.ts` is on the `auth-data` map.
- Fix: delete both tags. Split it: the `public-routes.ts` line goes with this group, and the `AuthRoutes` line goes in the #243 task, which has the same defect.
- Class ordinary, and `auth-data` for the second line. Files: `src/lib/delivery/public-routes.ts`; `src/lib/sveltekit/auth-routes.ts`. 5 min.

### #281 Walk a conditional type's arms, and give `ConceptEntryData` a verdict: **fold**
- Mechanism: `scripts/checks/check-surface-leaks.mjs:164`: `if (type.isUnion?.() || type.isIntersection?.()) {`, with no conditional case in `visit`. `scripts/checks/api-surface.md:178`: `` - `EntryData`: S extends TypedSiteResolver<infer A extends CairnAdapter> ? { [K in keyof A["content"] & string]: ConceptEntryData<K, ConceptFrontmatter<A, K>> }[keyof A["content"] & string] : ConceptEntryData<string, Record<string, unknown>>``. `src/lib/delivery/public-routes.ts:91`: `type ConceptFrontmatter<A extends CairnAdapter, K extends keyof A['content']> =` (unexported).
- Reason: holds; the verdict is Claude's. Recommend `ConceptEntryData` stays unexported, since the JSON's own text gives the reason: a site names one arm through `Extract` on `concept`.
- Fix: visit a deferred conditional's true and false arms through its `root.node`, record `ConceptFrontmatter` as a leak, and turn the `standing-unverdicted` entry at `check-surface-leaks.json:19` into a sanction.
- Class runner. Files: `scripts/checks/check-surface-leaks.mjs`, `scripts/checks/check-surface-leaks.json`, `src/tests/unit/check-surface-leaks.test.ts`. 45 min.

### #278 Retire the `R4` exemption from `check-idioms`: **fold**
- Mechanism: `scripts/checks/check-idioms.mjs:27`: ``//      none of these patterns fire on them. `R4 re-export`/`R4 closure` are exempted BY NAME: they``, `:252`, and the branch at `:265`: `if (token === 'R4') {`. `src/tests/unit/check-idioms.test.ts:140`: `expect(findProcessReferenceLines('// a recorded R4 re-export names it\n')).toEqual([]);`. `scripts/checks/fixtures/idioms/process-reference.ts:6`: `// A recorded R4 re-export names durable rulings vocabulary, not a pass.`
- Reason: no comment in `src/lib` uses the phrase (the one `R4` hit there is base64 in `reproductions/fixtures.ts:296`).
- Fix: remove the branch, the comment text, the test lines, the fixture line. A new test that `R4 re-export` now flags.
- Class runner. Files: those three plus the test. 10 min.

### #198 Refresh the stale `buildSitemapView` allowlist entry: **fold**
- Mechanism: `scripts/checks/check-self-use-allowlist.json:69`: `{ "name": "buildSitemapView", "ledger": "audit-delivery-sitemapview", "reason": "keep, renamed from sitemapView (conventions pass, Task 3): a sitemap mus...`. Item says :75. The showcase calls it at `examples/showcase/src/routes/sitemap.xml/+server.ts:15`.
- Reason: holds.
- Fix: delete the row.
- Class runner. Files: that JSON. 5 min.

### #234 Drop `variantUrl` from `MEDIA_DEMOTED`: **fold**
- Mechanism: `src/tests/unit/delivery-media-vite-barrel-prune.test.ts:80`: `'variantUrl',`
- Reason: the name exists nowhere else in `src`, `skills`, `docs`, or `scripts`.
- Fix: delete the line, and change "thirteen" at `:86` to match.
- Class ordinary. Files: that test. 3 min.

### #235 Add `npm` to `CLI_INVOCATION_PREFIXES`: **fold**
- Mechanism: `src/tests/unit/skill-references-compile.test.ts:91`: `const CLI_INVOCATION_PREFIXES = new Set(['npx', 'cairn-audit']);`
- Reason: holds.
- Fix: add `'npm'`, with a test line.
- Class ordinary. Files: that test. 5 min.

### #249 Have `check:symbols` flag a removed name in `## Unreleased` prose: **fold**
- Mechanism: `scripts/checks/check-symbols.mjs:68`: `{ path: 'MIGRATION-NOTES.md' },` is the only hit for either release file in that script, and it has no Unreleased logic. The surface diff lives in `scripts/checks/check-surface.mjs`.
- Reason: holds. Its Placement, `tool-gates`, is a closed pass, so correct it. The check can't catch plain-word mentions ("the auth channel"), one of the two rounds the item cites.
- Fix: names removed from `api-surface.md` against the last tag, flagged in `## Unreleased` text on a line with no removal word. Run it against the current Unreleased first: `small-api` removed about 40 names, so expect false positives to tune.
- Class runner. Files: `scripts/checks/check-symbols.mjs`, `src/tests/unit/check-symbols.test.ts`. 50 min.

### #284 Repoint the `cairn-writing-engine-code` idiom examples: **drop**
- Mechanism: `.claude/skills/cairn-writing-engine-code/references/code-idioms.md:188`: `` `createContentRoutes` whose public return is byte-identical (`check:surface` proves it).`` `.claude/skills/cairn-writing-docs/evals/site-cases/e3-seam-bug-fix.json`: `"seam": "createSectionAction's authorization sequence (authorizeAdminTarget, ownerOnly, the refusal audit and log)",`
- Reason: both name engine internals to a reader working in the engine, where those names import fine.
- Strongest case for keeping: `createContentRoutes` and `authorizeAdminTarget` are off every barrel, so an implementer copying the example reaches for a name a site can't import. Answer: this is a repo skill, not a packaged one, so no site reads it, and its implementers edit `src/lib`, where both exist. E3's fixture edits `section-action.ts:295` itself, so naming the internal is accurate. The e3 edit would also trigger `.claude/rules/evals-docs-process.md`'s two-suite run, a poor trade for a comment. `code-idioms.md:188` is a stale pass narrative, and if it bothers anyone it could be cut, but that isn't this item.
- The engine half of the file also says nothing false. Needs Geoff's approval to land in `## Won't do`.

---

## Group E: content and manifest (ordinary)

No shared files, except #232 and #261 both near the manifest build (`src/lib/delivery/manifest.ts` vs `src/lib/vite/internal.ts`). All safe to pair.

### #261 Keep a publish stamp when a dev start drops an invalid entry's row: **fold**
- Mechanism: `src/lib/vite/internal.ts:389`: `report = await applyManifest(root, await buildManifestFromVite(opts, root, server));`, then `:438`: `const next = carryPublishStamps(built.manifest, committed);`. `carryPublishStamps` at `:495` applies stamps only to `built.entries`, and `src/lib/delivery/manifest.ts:73` skips the row with `continue;`.
- Reason: holds, and the item names the fix.
- Fix: take the item's second reading. `applyManifest` gains an option the dev path sets: hold the write when a `built.problems` entry names a committed row with `publishedAt`. The report says so. `cairn-manifest` is unchanged.
- Class ordinary. Files: `src/lib/vite/internal.ts`, `src/tests/unit/vite-manifest-dev-server.test.ts`. 30 min.

### #264 Walk attributes when `scanBody` reads raw HTML: **fold**
- Mechanism: `src/lib/content/body-scan.ts:20`: `const HTML_CAIRN_HREF = /<[a-z][^>]*[\s"'](?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi;`
- Reason: `[^>]*` stops at a `>` in a quoted value, and `[\s"']` matches inside one, so both misses hold.
- Fix: a tag walker that consumes each attribute as a whole, quoted values included, and tests `href` and `src` by name. No new dependency.
- Class ordinary. Files: `src/lib/content/body-scan.ts` and the test that covers `scanBody`. 30 min.

### #240 Handle a BOM in the media rewriters: **fold**
- Mechanism: `src/lib/content/media-rewrite.ts:321` and `:572`: `const { fmBlock, body } = splitFrontmatter(markdown);`. The other callers strip first, as `src/lib/content/references.ts:124` does: `const text = hasBom ? source.slice(BOM.length) : source;`
- Reason: holds.
- Fix: hold the BOM as a prefix in both functions, as `references.ts:121-168` does. Their offsets index `markdown`, so strip before the split and restore on return.
- Class ordinary. Files: `src/lib/content/media-rewrite.ts`, `src/tests/unit/content-media-rewrite.test.ts`. 20 min.

### #239 Refuse contradictory bounds at declaration: **fold**
- Mechanism: `src/lib/content/field-rules.ts:21-23`: `if (min != null && value.length < min) return ...`, `if (max != null && value.length > max) return ...`, `if (length != null && value.length !== length) return ...`. `src/lib/content/concepts.ts:95`: `defineFieldset(concept.fields, { refine: concept.refine, behavior: concept.behavior });` Nothing in `src/lib/content/fieldset.ts` checks bounds.
- Reason: holds; a declaration throw matches `checkSeoImageFields` and `checkTaxonomyMarker`.
- Fix: a `checkBounds` beside them at `fieldset.ts:367`, run from `defineFieldset` (`:444`), throwing a `cairn:`-prefixed error for `min > max`, a `length` that conflicts with either, and a non-calendar date bound. `defineBlock` gets it through the fieldset.
- Class ordinary. Files: `src/lib/content/fieldset.ts`, its unit test. 30 min.

### #232 Narrow `content.entry_invalid`'s `scope` field: **fold**
- Mechanism: `src/lib/delivery/manifest.ts:65`: `scope: 'manifest',`
- Reason: one value, and the item offers drop or justify; drop, since nothing reads it (`tool/internal/logs/events.go:25` holds only the event name).
- Fix: delete the field, then `src/tests/unit/delivery-manifest.test.ts:131`, `skills/cairn-extending-a-site/references/log-events.md:63`, `skills/cairn-extending-a-site/references/content-model.md:24`, and re-emit the template's copy.
- Class ordinary. Files as above. 10 min.

---

## Group F: the save path (ordinary)

#199 and #200 share `src/lib/sveltekit/content-routes-entry-write.ts` and its lines. Make them one task.

### #199 Decide a save's "new" on the server: **fold**
- Mechanism: `src/lib/sveltekit/content-routes-entry-write.ts:152`: `const isNew = form.get('new') === '1';`, `:166`: `if (!isNew) {`
- Reason: holds. Those are `isNew`'s only two uses in the file, so the item's "keep `isNew` for the create-only checks" has nothing to keep.
- Fix: remove `isNew` and read the prior file always. A create pays one branch-head read and one file read, and a null read leaves `priorData` empty. `EditPage.svelte:304`, `:305`, `:1987` still send `new`, which `editLoad` needs on a reload (`content-routes-entry-read.ts:294`), so leave those.
- Class ordinary. Files: `src/lib/sveltekit/content-routes-entry-write.ts`, `src/tests/integration/content-routes-entry-write.test.ts`. 15 min.

### #200 Log a failed prior read, and align rename and delete statuses: **fold**
- Mechanism: `content-routes-entry-write.ts:173`: `return fail(503, saveRefusal("Couldn't read the current version of this entry. Try saving again.", body));` under a bare `} catch {`. `src/lib/sveltekit/content-routes-entry-destructive.ts:363`: `return fail(409, { error: 'Could not verify references. Try again.' } satisfies RenameFailure);`, `:391`: `return fail(409, { error: 'Could not verify includes. Try again.' } satisfies RenameFailure);`, against delete at `:212-213`: `return fail(503, {` / `error: 'Could not verify where this entry is referenced. Try again.',`. `branchHead` twice: `content-routes-entry-write.ts:169` and `:316`: `if ((await backend.branchHead(branch)) === null) {`. Item's :357 and :331 are stale.
- Reason: all hold; the head reuse is optional.
- Fix: catch the error and log a new event; set both rename refusals to 503; reuse the :169 head at :316. That reuse skips one read between two steps, so if a concurrent create makes it a worse failure, drop that half. Leave the two-indexes half for the implementer to judge by size.
- Class ordinary. Files: `content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`, `src/lib/log/events.ts`, `src/lib/log/events-list.ts`, `tool/internal/logs/events.go`, `skills/cairn-extending-a-site/references/log-events.md`, tests. 45 min.

---

## Group G: media UI (ordinary)

### #259 Decide whether the browser upload takes AVIF: **fold**
- Mechanism: `src/lib/media/config.ts:18`: `export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];`. `src/lib/admin/client-ingest.ts` in `ingestFile`: `if (sniffed === 'image/jpeg' || sniffed === 'image/png' || sniffed === 'image/webp') {`, ending `throw new IngestError('decode-unsupported');`. All four inputs say `accept="image/*"`, so the picker offers AVIF and refuses it after.
- Reason: a method call, not a product ruling. Recommend the passthrough: the store and the sniff already take it, and `createImageBitmap` decodes AVIF in current browsers, with `decode-unsupported` catching any that can't.
- Fix: add `|| sniffed === 'image/avif'`, and update `docs/editors/manage-the-media-library.md:38,46` and `skills/cairn-extending-a-site/references/media.md:21-22`.
- Class ordinary. Files as above, plus the ingest test. 20 min.

### #262 Stop nesting the media tile's checkbox inside `role="option"`: **fold**
- Mechanism: `src/lib/admin/CairnMediaLibrary.svelte:736`: `role="option"`, and `:751`: `type="checkbox"` nested inside it.
- Reason: holds. Moving it outside the option isn't valid either, since a listbox owns only options and groups.
- Fix: keep the input as a pointer target with `tabindex="-1"` and `aria-hidden="true"`. The option's `aria-selected` and Space (`:552-555`) already carry the state for keyboards and assistive tech. The list density's checkbox at `:841` stays.
- Class ordinary. Files: `src/lib/admin/CairnMediaLibrary.svelte`, `examples/showcase/e2e/media-pass-c.spec.ts` (`:54-55` use `getByRole('checkbox')`, which won't find a hidden input), `examples/showcase/e2e/admin-visual.spec.ts` if its checkbox query is this one. 35 min.

---

## Group H: `auth-data` tasks

Each stands alone. Nothing else folds into them, apart from #280's one tag.

### #271 Refuse a prototype-named target in `canReach`: **fold**
- Mechanism: `src/lib/auth/access.ts:198-199`: `const admitted = access[target];` / `return admitted === undefined ? true : admitted.includes(editor.role);`. Beside it, `:215`: `return Object.hasOwn(access, target);`
- Reason: holds; `constructor` resolves to a function, and `.includes` throws.
- Fix: `const admitted = Object.hasOwn(access, target) ? access[target] : undefined;`, with tests for `constructor` and `__proto__`.
- Class `auth-data`, its own change. Files: `src/lib/auth/access.ts`, `src/tests/unit/auth-access.test.ts`. 10 min.

### #243 Drop the owner-guard helpers: **fold**
- Mechanism: `src/lib/auth/store.ts:503`: `export async function removeOwnerIfNotLast(`, `:609`: `export async function demoteOwnerIfNotLast(`, `:353`: `export type OwnerGuardOutcome =`.
- Reason: only `src/tests/integration/auth-store.test.ts` and `packages/cairn-cms-dev/src/fake-auth-db*.ts` reach them.
- Fix: remove all three with their tests, the doc links at `store.ts:123,346,360,422,425,539,543,593`, and the fake's matching SQL branches (keep any statement `deleteEditor` shares; `fake-auth-db.ts:222,268` name both). Drop the leftover `@public` tags in `store.ts` and `src/lib/auth/roles.ts:126`, plus #280's `AuthRoutes` tag. `check-tiers.mjs` reads exports only, so nothing enforces those.
- Class `auth-data`. Files: `src/lib/auth/store.ts`, `src/lib/auth/roles.ts`, `src/lib/sveltekit/auth-routes.ts`, `packages/cairn-cms-dev/src/fake-auth-db.ts`, `packages/cairn-cms-dev/src/fake-auth-db.test.ts`, `src/tests/integration/auth-store.test.ts`. 30 min.

---

## Group I: preview and headers

#282 and #288 share the preview subject but no file. #287 stands alone.

### #282 Make `loadPreview` generic: **fold**
- Mechanism: `src/lib/sveltekit/preview.ts:387-390`: `export async function loadPreview(` / `event: CairnEvent,` / `{ runtime, publicRoutes }: { runtime: CairnRuntime; publicRoutes: PublicRoutesConfig },` / `): Promise<PreviewData> {`. `:179`: `export type PreviewData = EntryData & {`. `examples/showcase/src/theme/components/ArticleView.svelte:28`: ``* Untyped on purpose: `loadPreview` returns the default `EntryData`, so this template takes the``
- Reason: holds.
- Fix: `loadPreview<S extends SiteResolver>` over `PublicRoutesConfig<S>` and `PreviewData<S>`, one boundary cast, then narrow both `ArticleView.svelte` copies and `chassis/entry-data.ts`. Inference should leave `(site)/preview/[token]/+page.server.ts` untouched. That path is `auth-data`, so if it has to change, the task's class changes. See #272's sequencing note.
- Class ordinary, if run before #272 and the `[token]` file stays put. Files: `src/lib/sveltekit/preview.ts`, `examples/showcase/src/theme/components/ArticleView.svelte`, `templates/waymark/src/theme/components/ArticleView.svelte`, `examples/showcase/src/chassis/entry-data.ts`, `templates/waymark/src/chassis/entry-data.ts`, `scripts/checks/api-surface.md`, `skills/cairn-extending-a-site/references/public-routes.md`. 45 min.

### #288 Say that a preview link follows the entry: **fold**
- Mechanism: `src/lib/sveltekit/preview.ts:441`: `const branch = pendingBranch(concept.id, row.entryId);`, `:446`: `const draftRaw = await backend.readFile(path, branch);`. `content-routes-entry-write.ts:444`: `// Deliberately no clearPreviewTokens call here, unlike discard/rename/delete: the ended page`
- Reason: holds, and the item's docs half is the concrete fix. Binding a row to a branch head needs a migration and would break the ended page's deliberate rows, so leave that out.
- Fix: add a sentence to the Share preview row at `docs/editors/write-in-the-editor.md:250-252`: the link shows the entry's latest saved draft, later drafts included, until it expires or you revoke it. Load `cairn-writing-docs`.
- Class ordinary. Files: `docs/editors/write-in-the-editor.md`. 10 min.

### #287 Find out whether a zone HSTS setting survives the admin's header: **fold**
- Mechanism: `src/lib/sveltekit/admin-response.ts:40`: `headers.set('Strict-Transport-Security', 'max-age=63072000');`, applied at `src/lib/sveltekit/guard.ts:413`: `applySecurityHeaders(response.headers);`
- Reason: the test could run from here, and it points one way: the edge wins. Read today, `https://ecxc.ski/`, `/admin`, and `/admin/login` all answer one header, `max-age=63072000; includeSubDomains`, and `907.life` does the same on `/` and `/admin/login`. `/admin` is the guard's 303, which sets no HSTS at all per `docs/architecture.md:52`, so the edge adds it there. Neither site's `src/` or `static/` sets the header. `cairn.pub`, with no header on `/`, shows the engine's plain `max-age=63072000` on `/admin/login`.
- Limits: the sites run older engines (`^0.84.4`, `^0.95.0`), and the zone setting itself is unread because the worktree guard refused the token read. A guarded signed-in response is untested, though it uses the same call.
- Fix: state the result where the item asks: the zone's setting overrides the admin's header, so a pin holds. Update `admin-response.ts:27`'s doc comment.
- Class ordinary. Files: `src/lib/sveltekit/admin-response.ts`, `skills/cairn-extending-a-site/references/admin-access.md`, `MIGRATION-NOTES.md`. 15 min.

---

## Group J: scaffold and tool, one file each

### #203 Tell an owner to narrow the App's installation: **fold**
- Mechanism: `packages/create-cairn-site/src/github/install.mjs:237`: `'choose "All repositories" so the repository this run creates is covered, and approve.',`. The closing block is `packages/create-cairn-site/bin.mjs:83`: `function closingInfoLines(state) {`.
- Reason: holds, and the fix needs no `auth-data` file: `bin.mjs` is outside `packages/create-cairn-site/src/{github,cloudflare}/**`. Leave `install.mjs` and `catalogue.mjs` alone, per the ruling #246 cites.
- Fix: add a line to `closingInfoLines`'s `repoLines` naming `https://github.com/settings/installations`. Its five callers get it. `01-create-cairn-site.txt` is never edited, so it goes stale until #185's recapture.
- Class ordinary. Files: `packages/create-cairn-site/bin.mjs`, its test. 15 min.

### #270 Stop reading `createAuthGuard({ roles })` as wired: **fold**
- Mechanism: `tool/internal/doctor/check_roles.go:61`: ``var wiringWordPattern = regexp.MustCompile(`\b(?:runtime|roles)\b`)``
- Reason: holds; `check_roles_test.go:190` pins the wrong answer.
- Fix: match `\bruntime\b`, update the comments at `:58-60` and the two `guardWiring` comments, and flip `check_roles_test.go:68,190`.
- Class ordinary (load `standards:go-conventions`). Files: `tool/internal/doctor/check_roles.go`, `tool/internal/doctor/check_roles_test.go`. 15 min.

### #283 Finish the block wording in the engine's messages: **fold**
- Mechanism: `src/lib/render/registry.ts:220`: `` `cairn: component "${c.name}" uses "${c.name}", a reserved directive name handled by the engine render step: ...``, `:225`: `` `cairn: component "${c.name}" sets defaultIconByRole but declares no type:'icon' attribute, ...``, `:298`: `` `cairn: component "${name}" attribute "${key}" is type "${field.type}"; ...``. `src/lib/content/adapter.ts:17`: ``throw new Error(`cairn: component '${name}' declares hydrate but rendering.islands has no entry for it.`);``. `examples/showcase/src/routes/(site)/styleguide/+page.svelte:257`: `<h2 id="sg-directives" class="sg-h2">Directive components</h2>`. `src/lib/admin/MarkdownEditor.svelte:18`: `interface ComponentAtCaret {`, `:1065`: `function reportComponentAtCaret(state: ...`.
- Reason: holds, with two parts gone: the `add-components-and-fragments` anchor no longer appears in `docs/`, and the item itself says the TypeError isn't a refusal to add.
- Fix: "block" in the four messages, `src/tests/unit/render-registry.test.ts:146`, the styleguide's lines 257-261, and the `MarkdownEditor.svelte` names at `:18,136,915,974,1060,1065,1071`. Styleguide baselines regenerate on CI.
- Class ordinary. Files: `src/lib/render/registry.ts`, `src/lib/content/adapter.ts`, `src/lib/admin/MarkdownEditor.svelte`, `src/tests/unit/render-registry.test.ts`, `examples/showcase/src/routes/(site)/styleguide/+page.svelte`. 40 min.

---

## Group K: evals and packaged guidance

#188, #191 share `.claude/skills/cairn-writing-docs/evals/`. Each triggers `.claude/rules/evals-docs-process.md`: both suites on `main` and the branch, as a background run, which "takes far longer than ten minutes", with the table in the PR. That wait isn't in these minutes. Run the two in one eval cycle. #70, #196 share `skills/`.

### #188 Re-add the cairn-writing-docs eval cases on editor pages: **fold**
- Mechanism: `.claude/skills/cairn-writing-docs/evals/evals.json` holds ten cases, `near-miss-01` to `near-miss-10`, all trigger checks. `docs/editors/` holds eight files, and PR #159 merged (`db53ca04a`).
- Reason: the trigger is met; the suite grades nothing on the track it covers.
- Fix: one regression and one capability case against an editor page, with the setup the suite expects.
- Class runner. Files: `.claude/skills/cairn-writing-docs/evals/evals.json`, `setups/` as needed. 40 min, plus the eval run.

### #191 Harden the eval harness's session sandbox: **fold**
- Mechanism: `.claude/skills/cairn-writing-docs/evals/run.mjs:45`: `'Bash(tail *)', 'Bash(head *)', 'Bash(echo *)', 'Bash(sed -n *)', 'Bash(wc *)', 'Bash...`, `:46`: `'Bash(ls*)', 'Bash(grep *)', 'Bash(sort*)', ...`, `:41`: `'Bash(git -C * diff *)', 'Bash(git -C * grep *)', 'Bash(git -C * show *)',`. `judgeTrial` at `:1020`.
- Reason: holds; its Placement, "Final engine batch", is this round.
- Fix: deny `sed -n` scripts with `w`, `git diff --output`, `git grep -O`, `sort -o`, `git difftool`; fence the reply in the judge prompt; copy `node_modules` per trial, or make it read-only. A tighter allow list can change scores, so compare before merging.
- Class runner. Files: `.claude/skills/cairn-writing-docs/evals/run.mjs`, `run.test.mjs`. 45 min, plus the eval run.

### #70 Audit the shipped guidance's routes: **fold**
- Mechanism: `skills/cairn-extending-a-site/SKILL.md` routes 16 of its 16 references, and `skills/cairn-building-admin-screens/SKILL.md` 11 of 11. `skills/cairn-styling-public-pages/SKILL.md` names 6 of the 36 files under its `references/`, which may be routed by pattern. No `cairn.pub/docs/` URL appears in `skills/` or `claude/`.
- Reason: the arms are landed, and two of three skills already pass, so the work is the third skill and the agent-first check.
- Fix: read each route, confirm the target, reach or cut the rest. Stale line: the item's `:24` link note.
- Class runner. Files: `skills/cairn-styling-public-pages/SKILL.md`, `claude/CLAUDE.md`, and whatever the audit finds. 30 min.

### #196 Close the practices review's open findings: **fold**
- Mechanism: `claude/CLAUDE.md:42`: `## The Stop hook`, snippet to `:64`, `"command": "npm run check:cairn --if-present"`. `skills/cairn-extending-a-site/SKILL.md:21`: `dated ruling in cairn's rulings ledger. ...` against `claude/agents/cairn-extension-reviewer.md:21-23`: `component is a finding unless a comment or commit message in the diff names the DaisyUI defect`. `skills/cairn-extending-a-site/SKILL.md:39`: `| Mount the admin, gate a custom screen or action, roles and access map, refusal shape, audit table | `references/admin-access.md` |` against `skills/cairn-building-admin-screens/SKILL.md:15-17`. `skills/cairn-building-admin-screens/SKILL.md:37`: `**Static, advisory tier:** `radius-scale` (promoted to error at 0.99.0), and three rules that`. `claude/agents/cairn-extension-reviewer.md:4`: `tools: Read, Grep, Glob`.
- Reason: all still hold, and each has a stated fix.
- Fix: the item's list. One owner per job, with `admin-access.md` staying in `cairn-building-admin-screens`' router; move the hook and DaisyUI text to `adopt-cairn.md`; wrap the hook to exit 2 with a `stop_hook_active` guard, and check `references/preflight.md:44`, which inspects that hook; align the ruling text. Budget, packaging, and `templates/waymark/.claude/skills` copies regenerate through `emit:template`.
- Class runner (shipped text, so read `check:public-skill` and `check:skill-budget` output). Files: `claude/CLAUDE.md`, `claude/agents/cairn-extension-reviewer.md`, `skills/cairn-extending-a-site/SKILL.md`, `skills/cairn-extending-a-site/references/adopt-cairn.md`, `skills/cairn-extending-a-site/references/preflight.md`, `skills/cairn-building-admin-screens/SKILL.md`, `skills/cairn-styling-public-pages/SKILL.md`, `skills/cairn-consulting-the-engine/SKILL.md`. 90 min.

### #211 Measure tidy's latency on real entries: **fold**
- Mechanism: `src/lib/sveltekit/content-routes-context.ts:299`: `const DEFAULT_TIDY_TIMEOUT_MS = 30_000;`, `src/lib/sveltekit/content-routes-tidy.ts:52`: `const MAX_TIDY_CHARS = 24_000;`
- Reason: real entries are in reach, despite the item's history: `~/Projects/aksailingclub-org/src/content/pages/bylaws.md` and five other files over 12 KB sit on this host.
- Fix: run tidy's real prompt over a spread of sizes up to the cap on each model, then keep or change the numbers and rewrite both doc comments. Needs an Anthropic key, which I did not confirm (the store read was refused), and a few dollars of calls. The latency is the workstation's, not a Worker's.
- Class ordinary. Files: `src/lib/sveltekit/content-routes-context.ts`, `src/lib/sveltekit/content-routes-tidy.ts`. 40 min.

### #190 Require draft-preview links to be minted from a POST action: **drop**
- Mechanism: `skills/cairn-extending-a-site/references/draft-preview.md:5`: ``draft ends. The editor's **Share preview** group and its mint and revoke actions ship with``. `mintPreview` is absent from `src/lib/sveltekit/index.ts`. `S05` appears nowhere in `skills/`, `packages/cairn-cms-dev/src`, the docs evals, `.claude/rules`, `ROADMAP.md`, or `docs/STATUS.md`.
- Reason: a site can no longer mint, so there's nothing to tell it.
- Strongest case for keeping: a site's agent could still hand-roll a mint in a `load`, and the reference should warn it. Answer: `cleanup-custom-recipes` retired the preview token verbs, and `## Won't do` #115 records it, so the only mint is the engine's own action. The item's other half, the `unknown-concept` limit, is its stated known limit, not work.
- Needs Geoff's approval to land in `## Won't do`.

### #236 Say that a fresh worktree needs `prepack`: **done**
- Proof: `.claude/skills/cairn-running-passes/SKILL.md:17`: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync) && npm --prefix packages/create-cairn-site run prepack`, and `:20`: `The prepack bakes the gitignored template that most `packages/create-cairn-site` tests read.`

### #276 Show that the list filter row scrolls at 320: **done** (pending pass 7's merge)
- Proof: `35ac4a8e3` on `worktree-p2-p4-run`, `src/lib/admin-toolkit/ListToolbar.svelte`. Pass 7's T11 closes it under S2. If its ruling flips, this reads keep.

---

## Group L: keep

### #274 Recapture the `cairn doctor` report transcript: **keep** (bar c)
- Mechanism: `packages/create-cairn-site/test/fixtures/transcripts/04-doctor-report.txt` ends `10 passed, 0 failed, 1 skipped, 0 info, 0 unchecked` with no `config.migrations` line, and `tool/internal/doctor/check_migrations.go` defines one.
- Reason: the directory's README rules out editing a fixture and requires real stdout from a live site, and the capture site was torn down. It belongs with #185's recapture at the real install, so set its Placement to match.

### #250 Let a worktree-isolated session run compound commands: **keep** (bar b)
- Mechanism: this sweep met it five times. It refused a `for` loop, `$(...)`, and `source`, with "cannot be shown not to be git", on commands that never ran git.
- Reason: not this repo. The text isn't in `workstation/{hooks,bin,scripts}`, `~/.dotfiles/bin`, or `~/.claude/hooks`, so the home is still to find: `workstation` if it's a hook, or Claude Code itself if it's the harness.

### #208 Trace the `createDialog` e2e flake: **keep**
- Mechanism: `examples/showcase/e2e/editor-helpers.ts:34`: ``console.log(`[create-dialog-trace] attempt=${attempt} handler=${handler} opened=${opened}`);``, `:24`: `// create-dialog-trace: drop once the cause is recorded.`
- Reason: no concrete fix exists; it needs a failing run. New evidence: e2e run `41451242959` logged 23 trace lines, none `opened=false`, `handler=false`, or `attempt=2`, and no retry.
- Not a blocker: the palette (7 of 15 heads) and `container-fields.spec.ts` (5) retries are the live part, and they want their own item with a real investigation. I did not read those.

### #207 Re-cut the Evaluate bar: **keep** (cannot settle)
- Mechanism: the item points at `e2e/out/evaluate/trial-*.jsonl`. There's no `e2e/` here or in the main checkout, no `trial-*.jsonl` under `~/Projects/cairn-cms`, `cairn-pub`, or `cairn-scratch`, and `git log` has no history for it. `docs/STATUS.md:27`: `and editor sittings, and the docs review of the human pages), and Evaluate is unmet until its re-cut`. `04c6036ac` confirms the trials happened.
- Reason: a blind grade needs logs I can't find, and the "rubric sentence" isn't locatable. Ask where pass 4 left them, maybe the other workstation. Without them, it means re-running the trials.

### #246 Decide whether a long-lived Worker key should keep admin permissions: **keep** (bar a)
- Mechanism: `packages/create-cairn-site/src/github/manifest.mjs:59-61`: `contents: 'write',` / `administration: 'write',` / `workflows: 'write',`
- Ruling needed: one App or two, a security ruling. Recommend one App, and have the closing block (#203's line) also tell the owner to reduce the App to Contents after setup. `skills/cairn-extending-a-site/references/adopt-cairn.md:90` already teaches a Contents-only App, and `administration` and `workflows` serve setup, not publishing. A second App doubles the setup steps, and #245 proves the Contents-only publish. If the ruling lands first, this is a one-line add to #203.

### #248 Rate limit the sign-in endpoints: **keep** (bar a)
- Mechanism: `src/lib/sveltekit/auth-routes.ts:206`: `if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {`, under the comment `than a second email. This reveals editor membership, the deliberate relaxed-non-leak posture.`
- Ruling needed: does the `throttled` oracle stay accepted, and does the engine carry a limiter? Recommend keep the oracle, since the comment's posture is deliberate and the limit doesn't close it, and add the optional `RateLimitLike` binding, which already has the seam at `src/lib/sveltekit/section-action.ts:64`. No ledger entry covers either. Once ruled: `auth-data`, a new arm, about 60 min, in `auth-routes.ts`, `cairn-admin.ts`, `refusal-codes.ts`, and the login page. Nothing here folds it into another `auth-data` task.

### #247 Weigh the session residuals: **keep** (bar a)
- Mechanism: `src/lib/auth/store.ts:241`: `.prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')`. `src/lib/sveltekit/auth-routes.ts:360`: `await createSession(db, id, email, now + SESSION_TTL_MS, now);`, `:288`: `token: event.url.searchParams.get('token') ?? '',`
- Ruling needed: which of four residuals are accepted. Recommend: hash session ids, since `magic_token` already stores only `token_hash` and that's the same exposure; delete the prior row on re-login when the cookie is present; accept the token in the confirm page, which must post it; accept the CSP gap, since a `script-src` is the site's call across its whole app. The first two are then an `auth-data` change of about 45 min, and hashing signs everyone out once.

---

## Fold table

| Item | Group | Files | Class | Min |
|---|---|---|---|---|
| #263 | A | `EditPage.svelte`, `EditPage.test.ts` | ordinary | 15 |
| #289 | A | `EditPage.svelte`, `ComponentInsertDialog.svelte`, `editor-highlight.ts`, tests | ordinary | 35 |
| #268 | A | `EditPage.svelte`, `RenameDialog.svelte`, tests | ordinary | 25 |
| #275 | A | `RepeatableField.svelte`, `EditPage.svelte` | ordinary | 10 |
| #269 | A | `ComponentForm.svelte`, `ComponentForm.test.ts` | ordinary | 20 |
| #265 | B | `gate-tier.mjs`, `gate-tier.test.ts` | runner | 35 |
| #266 | B | `gate-tier.mjs`, `gate-tier.test.ts` | runner | 10 |
| #267 | B | `gate-tier.mjs`, `gate-table.json`, `gate-tier.test.ts` | runner | 20 |
| #285 | B | `gate-tier.mjs`, `gate-tier.test.ts` | runner | 20 |
| #286 | C | `durable-gotchas.md` | runner | 12 |
| #273 | C | `durable-gotchas.md` | runner | 8 |
| #272 | C | `cairn-running-passes/SKILL.md` | runner | 5 |
| #277 | D | `sveltekit/index.ts`, `api-surface.md`, `nav-exports.test.ts`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, `engine-rulings.md` | runner | 20 |
| #279 | D | `admin-toolkit/index.ts`, `delivery/index.ts`, `api-surface.md`, `check-self-use-allowlist.json`, `CHANGELOG.md`, `MIGRATION-NOTES.md` | runner | 20 |
| #280 | D, H | `public-routes.ts`; `auth-routes.ts` with #243 | ordinary; `auth-data` | 5 |
| #281 | D | `check-surface-leaks.mjs`, `check-surface-leaks.json`, test | runner | 45 |
| #278 | D | `check-idioms.mjs`, `check-idioms.test.ts`, `fixtures/idioms/process-reference.ts` | runner | 10 |
| #198 | D | `check-self-use-allowlist.json` | runner | 5 |
| #234 | D | `delivery-media-vite-barrel-prune.test.ts` | ordinary | 3 |
| #235 | D | `skill-references-compile.test.ts` | ordinary | 5 |
| #249 | D | `check-symbols.mjs`, test | runner | 50 |
| #261 | E | `vite/internal.ts`, `vite-manifest-dev-server.test.ts` | ordinary | 30 |
| #264 | E | `body-scan.ts`, test | ordinary | 30 |
| #240 | E | `media-rewrite.ts`, `content-media-rewrite.test.ts` | ordinary | 20 |
| #239 | E | `fieldset.ts`, test | ordinary | 30 |
| #232 | E | `delivery/manifest.ts`, `delivery-manifest.test.ts`, `log-events.md`, `content-model.md` | ordinary | 10 |
| #199 | F | `content-routes-entry-write.ts`, test | ordinary | 15 |
| #200 | F | `content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`, `log/events.ts`, `log/events-list.ts`, `tool/internal/logs/events.go`, `log-events.md`, tests | ordinary | 45 |
| #259 | G | `client-ingest.ts`, `manage-the-media-library.md`, `media.md`, test | ordinary | 20 |
| #262 | G | `CairnMediaLibrary.svelte`, `media-pass-c.spec.ts`, `admin-visual.spec.ts` | ordinary | 35 |
| #271 | H | `auth/access.ts`, `auth-access.test.ts` | `auth-data` | 10 |
| #243 | H | `auth/store.ts`, `auth/roles.ts`, `auth-routes.ts`, `fake-auth-db.ts`, `fake-auth-db.test.ts`, `auth-store.test.ts` | `auth-data` | 30 |
| #282 | I | `preview.ts`, both `ArticleView.svelte`, both `entry-data.ts`, `api-surface.md`, `public-routes.md` | ordinary (before #272) | 45 |
| #288 | I | `write-in-the-editor.md` | ordinary | 10 |
| #287 | I | `admin-response.ts`, `admin-access.md`, `MIGRATION-NOTES.md` | ordinary | 15 |
| #203 | J | `packages/create-cairn-site/bin.mjs`, test | ordinary | 15 |
| #270 | J | `check_roles.go`, `check_roles_test.go` | ordinary | 15 |
| #283 | J | `registry.ts`, `adapter.ts`, `MarkdownEditor.svelte`, `render-registry.test.ts`, styleguide `+page.svelte` | ordinary | 40 |
| #188 | K | `evals/evals.json`, `setups/` | runner | 40 |
| #191 | K | `evals/run.mjs`, `run.test.mjs` | runner | 45 |
| #70 | K | `cairn-styling-public-pages/SKILL.md`, `claude/CLAUDE.md`, as found | runner | 30 |
| #196 | K | `claude/CLAUDE.md`, reviewer agent, four `SKILL.md`, `adopt-cairn.md`, `preflight.md` | runner | 90 |
| #211 | K | `content-routes-context.ts`, `content-routes-tidy.ts` | ordinary | 40 |

**Total: 1,038 min** at plan size, before the two-suite eval run and the 0.2 to 0.7 ratio. #260's cut adds 25 if folded.

**Pairs to avoid:** Group B runs as one task. #199 with #200, #286 with #273, and #243 with #280's second line go together. #263, #268, #289, #275 all edit `EditPage.svelte`, so serialize them. #277, #279, #282 all edit `api-surface.md`; regenerate it last or serialize.

**Order:** run #282 before #272, or class it `auth-data`. Land the `auth-data` tasks (#271, #243) with one security read each.

## Could not settle

1. **#207:** the trial logs and the rubric sentence are not on this host.
2. **#246, #247, #248:** each waits on the ruling recommended above.
3. **#250:** the guard's source wasn't found, so its home repo is open.
4. **#287:** folded on observed headers from two zones on older engines. The zone setting and a signed-in response are unread. Reading the setting needs `$CLOUDFLARE_API_TOKEN` from a session the guard allows.
5. **#211:** an Anthropic key's presence is unconfirmed, since the store read was refused.
6. **#70:** the 30 of 36 `cairn-styling-public-pages` references with no literal route may be routed by pattern; the audit decides.
7. **#266:** whether `package.json` and the lockfile are in `component-rerun-triggers.mjs` was not read.
8. **#272:** whether the `workstation` `cairn-pass` adapter carries a copy of the path map was not checked.
9. **#260:** the lane's build-before-unit order was confirmed on one range, not across path sets.
10. **#284, #190:** the two drops need Geoff's approval before they land in `## Won't do`.
