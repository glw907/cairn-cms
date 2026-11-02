# small-api plan review: mechanics and feasibility

Reviewed `docs/internal/plans/2026-11-01-small-api-plan.md` at `90f3f3c8e`, with its design note. Saved by the
planning session from the `standards:plan-reviewer` reply. Probes ran on a scratch copy of `dist`, `scripts/checks`,
and `package.json` in `/tmp/sa-probe`. Nothing was written in the repo.

**Verdict:** not launch-ready as written. The order is sound and the `./internal` design holds. Four serial tasks fail
or break their own gates as listed, and three T-level claims are false against the source. All the folds are small.

## What held (no action)

- **Order:** T3 before T6 and T7, and T4/T5 before T6, are real dependencies. No task needs a later task's name or file, apart from the findings below.
- **`./internal`:** with all eight names on one entry, Node imported it from a `node_modules` tree with no `@sveltejs` and no `svelte`.
- **`/delivery` free of kit:** with the two dynamic-import rewrites, `dist/delivery/index.js` loaded on the same kit-less tree, with `createPublicRoutes` a function. `public-routes.js` is the only static kit importer under `dist/delivery`. This is stronger than the design's probe, which its own `## Tooling` seed says kit's resolution from the repo's `node_modules` could not fail.
- **Readers of the exports map:** `surfaceSubpaths()` feeds `check-surface`, `check-surface-leaks`, `check-tiers`, `check-options`, `check-snippets`, and so `check-self-use`, so skipping `./internal` there covers all of them. The other readers don't care: `check-package-files.mjs:456` only inspects `browser` entries; `gate-tier.mjs:305` only adds a source path to the export-surface set; `dist-sveltekit-app-import-boundary.test.ts:85` is a survey; `admin-barrel-prune.test.ts:68` checks named keys only; `workers-env-reach.test.ts:49` reads one key. The Go tool and `create-cairn-site` don't read the map.
- **Template and showcase reach:** the entry reaches both through the generated module. `CAIRN_NO_EXTERNAL` carries `@glw907/cairn-cms`, the same route `/delivery/data` uses today.
- **T6 end state:** simulating T3 to T6 on the `.d.ts` files gave zero names on two subpaths and 279 entries. The type-checker model reports no new leak, so the design's global-leak claim holds.
- **T6 consumers:** `chassis/feed-items.ts` is the only live consumer that needs a change (template copy included). The only other hit is the `newly-published.md` recipe T5 deletes.
- **T7's relative imports:** `assemble.ts:4-5` and `run.ts:7` are the only imports leaving `media-seed`.
- **Quotes:** spot-checked lines in `compose.ts`, `public-routes.ts`, `preview.ts`, `health.ts`, `section-action.ts`, `admin-nav.ts`, `frontmatter.ts`, `substitute.mjs`, and `conditions.json` match. Exceptions are in the findings.
- **Acceptance greps:** the T1, T2, T5, T7, T9, T10, and T11 greps all hit today, so none passes on the unchanged tree.
- **Estimates:** the path sums to 460 and the ceiling is safe. The live smoke needs no owner step.

## Blockers

### 1. T3 leaves `check:surface` red, and `--update` can't get past it

- **Tag:** correctness. **Location:** plan:150 ("rows naming a removed subpath, and `layeredBarrels`").
- **Defect:** removing those rows and the layered pair as written, `check-surface.mjs --update` refused with 37 "duplicate ... publishes from ., /delivery" lines. The home rule at `check-surface.mjs:458` runs before the write.
- **Fold:** T3 rewrites each `/delivery/data` row's `subpath` to `/delivery` rather than deleting it, and deletes only the `/render` row and `layeredBarrels`. T5 must then delete the `/delivery` `parseManifest` row, or `stale` fails; add `check-surface-reexports.json` to T5's Files (plan:176).

### 2. `check-surface-leaks.json` is missing from T3 and T4, and `npm run check:surface` runs the leak gate first

- **Tag:** correctness. **Location:** plan:150, plan:164, plan:185.
- **Defect, probe output:** T3 goes stale on `SlotKind` and `StandardResult` at `/delivery/data`. T4 goes stale on `Change` at `/admin`, because `TidyApi` leaves. T6 also goes stale on `SlotKind` at `/sveltekit`, a type-checker row, so plan:185's "rows it alone justified" misses it. `DatePrefix` at `/sveltekit`, `EngineScreenId` at `.`, and `NavIcon` at `.` are the renderer rows. Because the script chains `leaks && surface`, a stale row blocks `-- --update` too.
- **Fold:** add a line beside plan:98-99: every surface task reconciles `check-surface-leaks.json` to the derivation, and runs `node scripts/checks/check-surface-leaks.mjs` before `--update`. Name the three rows above in T3, T4, T6.

### 3. T4 breaks the admin build: `CairnHistory.svelte` imports `formatTimestamp` from the barrel

- **Tag:** correctness. **Location:** plan:160, plan:164.
- **Defect:** `src/lib/admin/CairnHistory.svelte:23` imports it from `../admin-toolkit/index.js`. It's the only barrel import of a hidden name found in `src/lib`.
- **Fold:** add the file to T4, importing from `../admin-toolkit/format.js`. Also say `src/lib/admin-toolkit/index.ts` is one of "the barrels"; `FormatTimestampOptions` is then an orphan (see 13).

### 4. T9 removes an option the engine itself uses

- **Tag:** correctness. **Location:** plan:216-220.
- **Defect:** `CairnMediaLibrary.svelte:888,1122` pass `formatCivilDate(asset.createdAt, { intlOptions: { month: 'short', day: 'month' } })`-style calls (month and day, no year). "No site sets it" is true, but the admin does. T9's Files omit the component, so `check` fails, and any fold changes the media library's date display.
- **Fold:** this isn't a set-aside the sheet lists, so give it an explicit answer. Keep the short form in an unexported internal formatter in `format.ts`, used by the library. That removes the public option with no visible change. Also add `admin-toolkit-format.test.ts:30`, and note `FormatCivilDateOptions`'s allowlist reason (`check-self-use-allowlist.json:28`) goes false. T9's Files should also carry `admin-rest`'s shared `CairnMediaLibrary.svelte`, as a merge chore.

## Major

### 5. Content-rest collides with T3/T4 in ways the standing answers don't cover

- **Tag:** correctness. **Location:** plan:78-82.
- **Defect:** content-rest T4 adds `verifyEntries` to `src/lib/index.ts` as `@public` "beside `verifyManifest`" and calls it from `virtualSource` (content-rest plan:317, :326-329). It edits `data.ts` for `EntryRef` and `ManifestProblem` (:262, :333), and T3 deletes that file. If the merge takes both sides naively, `verifyEntries` stays on the public root while `internal.ts` lacks it. The generated module then imports it from a name the design hides, so the hide set quietly grows or the build fails. `buildSiteManifest` also changes return shape.
- **Fold:** add one standing answer: `data.ts` stays deleted, its additions move to `delivery/index.ts`; `verifyEntries` joins `internal.ts` and leaves the root; the generated module keeps one `/internal` import; `ManifestProblem` gets one home.

### 6. T10 and T14 rewrite the same test lines as content-rest

- **Tag:** correctness. **Location:** plan:223, plan:261, plan:299.
- **Defect:** content-rest's `defineFieldset` and `concept.fields` reshape sits in 69 test files (content-rest plan:169), and `routing: 'feed'` sits on those same `defineConcept` calls. That's a real overlap, not "distant hunks", and shape 12 isn't on the may-set-aside list. The prompt's answer, "a real overlap is set aside", therefore can't apply.
- **Fold:** say T10's and T14's renames are mechanical and re-runnable: on a conflict, take `main`'s side and re-run the rename. Write the exact `sed` or script into each task. Have the conductor name the merge order for these two before launch.

### 7. T8 ergonomics 21 breaks far more tests than it lists

- **Tag:** correctness. **Location:** plan:209-211.
- **Defect:** unit tests run in Node, so `sinkByLevel` goes to strings. Unit tests read records as objects: `log-emit.test.ts:11-95`, `guard.test.ts:114,139`, `admin-action.test.ts:434`, `log/create.test.ts`. A grep for those record reads finds 43 hits, and 57 test files spy console or read `mock.calls`. T8 is a Sonnet pair task at 20 minutes listing three tests.
- **Fold:** either stub `navigator.userAgent = 'Cloudflare-Workers'` in the unit project's existing setup file so only the logger test sees the string path, or set ergonomics 21 aside, which the plan allows and which is first in the cut order. The reviewer prefers the stub. `cairn-error.test.ts:15` also pins the exact title, which the remediation append breaks; add it to T8's list.

### 8. T4's E4 line has no workable answer for `access` and `isDev`

- **Tag:** correctness. **Location:** plan:161.
- **Defect:** the plan says the options go, but "a test double that does [set them] keeps them". Tests do set them: `admin-action.test.ts:279,398` (`access`), `:423-454` (`isDev`), and `one-map-five-readers.test.ts:98-99`. Read literally, the options stay as test-only code; `AdminActionOptions` then has no public reader either.
- **Fold:** pick one and write it down. Remove the branch and move the `access` tests onto `createSectionAction`, keeping `one-map-five-readers` at five readers through it. Or hide `createAdminAction` and `AdminActionOptions` from the barrel and leave `deps` as an internal test seam. The design says the options go, so the first matches the ruling. T4's Files should name these tests, since both options sit on `check-self-use`'s auth-only list.

### 9. Three tasks hit `gate-table.json`, a protected path, and the plan never says how `ciWait` runs

- **Tag:** correctness. **Location:** plan:150, plan:185, plan:198.
- **Defect:** `pass-gate-tiers.md:180` says the runner reads `--protected` "to decide a task waits for CI green on its own commit". T3, T6, and T7 all touch the table. The plan names no draft PR, no wait, and no minutes, and T7 is inside a pair. T3 has no stated reason to touch the table.
- **Fold:** drop `gate-table.json` from T3. Move T6's and T7's edits to one commit, or state that a draft PR opens after T1 and each named task waits, adding the clock to the path.

### 10. The base is stale, and the plan calls merged work unmerged

- **Tag:** correctness. **Location:** plan:6, plan:77.
- **Defect:** `origin/main` is `16a081668`, with PR #180 merged. It adds `check:consumers-must` and edits `durable-gotchas.md`, `CONTRIBUTING.md`, `docs/architecture.md`, `check_posture.go`, and `gate-table.json`, all of which this plan cites. The prompt said to plan against `main`.
- **Fold:** merge `main` before T1, with the conductor's word written into the launch step, and re-check T7's and T11's line cites after. Plan:77's "once merged" goes.

### 11. T14 cites docs that don't exist

- **Tag:** correctness. **Location:** plan:266-267.
- **Defect:** `docs/admin/write-a-markdown-component.md`, `add-an-island.md`, and "the reference" aren't in the tree. `git ls-files docs` has no component, island, or reference page. The only docs hit across the removed names is `docs/why-cairn.md`. "82 by count" is about right from the rest (81 by grep). Plan:264 places every string at `ComponentInsertDialog.svelte` and `EditPage.svelte`, but "Fold this section" is `editor-folding.ts:450`, "Layout marker." is `editor-highlight.ts:57`, and "layout blocks" is `MarkdownHelpDialog.svelte:4,45`. "Unfold this section" is the sibling string, and ROADMAP's rename doesn't list it.
- **Fold:** correct the list. Rename "Unfold" alongside, as a recorded `## Decisions` call.

### 12. The auto-mode list is short of the real writes, and every refusal is a stop with no cheap answer

- **Tag:** correctness. **Location:** plan:50-60.
- **Defect:** writes under `.claude/skills/` not listed: T2's two `IdentityRefusal` hits; T3's `docs-register.md:290` and the S06 eval; T10's `s08-public-routes.mjs` and `s15-adopt-and-migrate-bad.mjs`; T11's `S08-public-routes.json`, `s12-tidy-and-posture.json`, and the `s12-*` setups; T12's `cairn-following-admin-design/references/daisy-absorption-ritual.md`. The allow line covers edits "to files under" those trees, and T5 *deletes* five eval files, which is the case most likely to be refused.
- **Fold:** list them. Give the deletion a standing answer: on a refusal, leave S05 and S06 in place, file a backlog item for pass 8, and go on. They aren't a gate this pass needs, and `run-site.test.mjs` doesn't pin them.

## Minor

### 13. Orphaned public types after hiding

- **Tag:** optional. **Location:** plan:172.
- **Defect:** "the leak gate decides" only says what must stay. Nothing removes `AuthRoutes`, `AuthRoutesConfig`, `EditorRoutes`, `EditorRoutesConfig`, `ContentRoutes`, `PreviewMintOutcome`, `PreviewRevokeOutcome`, `FormatTimestampOptions`, or `AdminActionOptions`. Their allowlist reasons say "hand-mounting", which is now false.
- **Fold:** T5 tries removing each and keeps what the leak gate demands, or states they stay and fixes the reasons. No OWNER FORK: the ruling names exports, so a keep is reversible.

### 14. T3 omits `vitest.config.ts`

- **Tag:** correctness. **Location:** plan:150-151.
- **Defect:** `delivery-data-dist-spawn.test.ts` is named at `vitest.config.ts:103,128`. Renamed, it falls into the concurrent `unit` project the single-fork project exists to avoid. It also won't fail; it just flakes.
- **Fold:** add the file.

### 15. T6 omits `check-surface-leaks.test.ts`, and retiring the renderer model may not be needed

- **Tag:** optional. **Location:** plan:185.
- **Defect:** the test imports `deriveRendererLeaks`, `extractLiteralUnionSet`, and `shapeContainsLiteralUnion` (`:11-13`, `:186-268`). The simulation kept the renderer model on, and it produced no new leak across T3 to T6, so the design's "would flag every type that loses a re-export" (design:42-43) overstates it.
- **Fold:** either keep the model, which cuts T6's scope and test churn, or retire it on the argument that an inlined union is now legal, and list the test file. Correct the design's sentence either way.

### 16. T4's and T5's test lists miss prune tests

- **Tag:** correctness. **Location:** plan:164, plan:176.
- **Defect:** `delivery-media-vite-barrel-prune`, `delivery-exports`, and `delivery-data-split` keep E8 names; T5 needs `root-barrel-prune` and `sveltekit-barrel-prune`. The standing answer covers the fix, but T5 is `auth-data` and the sheet folds nothing outside a task's listed files.
- **Fold:** list them in T5.

### 17. Template guidance is wrong

- **Tag:** correctness. **Location:** plan:100, plan:106-193.
- **Defect:** plan:100 ties `emit:template` to `skills/` edits. `check:template` diffs a wholesale bake of the showcase, so every showcase edit needs it (T3, T4, T5, T6, T9, T10, T11, T13, T14). "Showcase and template" in Files reads as a hand edit that "survives at most one run". Design:87 says `check:template` installs a scaffold from the tarball; it's a tree diff, so that end-to-end proof actually lives in CI.
- **Fold:** reword plan:100 and design:86-87.

### 18. T4's acceptance can't run

- **Tag:** correctness. **Location:** plan:166.
- **Defect:** `Object.keys` of `dist/admin/index.js` under Node gives `ERR_UNKNOWN_FILE_EXTENSION` (probed).
- **Fold:** use `enumerateExports('dist/admin/index.d.ts')`, as `admin-barrel-prune` already does.

### 19. Pairs share `CHANGELOG.md`

- **Tag:** correctness. **Location:** plan:102, plan:193.
- **Defect:** T7 and T8 both add entries under the "as it goes" rule, and T7 also adds a migration step. The pair claim "disjoint files" fails. T11 and T12 are probably fine, since T12 is internal.
- **Fold:** the conductor folds the pair's changelog lines after the merge, or T7 and T8 run serially, costing 20 minutes.

### 20. T12 contradicts the set-aside list

- **Tag:** correctness. **Location:** plan:68, plan:250.
- **Defect:** T12 sets `markFirstList` aside if the snapshot needs it. Only `ADMIN_CSS_SAFELIST` and `fenceDepths` may be set aside. The snapshot's use at `:208` is a fixture directive. `render-exports.test.ts:26` and `component-exports.test.ts` also pin names.
- **Fold:** move the helper into the test, which avoids the conflict, and list those two tests.

### 21. T11's cites are off

- **Tag:** optional. **Location:** plan:244.
- **Defect:** `check_posture.go:24,39` names `buildRobots`, not a `*Response`, so nothing there changes. The real extra hits are `.vale/styles/Cairn/ProseProcedure.test.yml` and `packages/create-cairn-site/README.md`, plus the evals in finding 12.
- **Fold:** swap them.

### 22. T7 leaves stale pointers and an unversioned peer

- **Tag:** optional. **Location:** plan:198.
- **Defect:** `tool/internal/doctor/fileread.go:23,65` cite `src/lib/media-seed/bin.ts`. `media-seed.test.ts:538` hardcodes `dist/media-seed/bin.js` and is skip-gated, so a missed path silently skips the bin proof. The dev package's peer `"*"` allows an engine with no `./internal`.
- **Fold:** retarget the test first and assert the BIN exists. Update the Go comments, which means loading `standards:go-conventions`. Leave the peer, since versions move in lockstep.

### 23. T6 and T15 both claim the moved-name table

- **Tag:** optional. **Location:** plan:189, plan:273.
- **Defect:** T6 generates it, T15 adds it, and T14 renames names in it after T6.
- **Fold:** T15 only, generated from the JSON at `git show <T5 head>`.

### 24. The close doesn't rerun the docs gate after review folds

- **Tag:** correctness. **Location:** plan:277.
- **Fold:** add `npm run check:docs-gate` after the last fold in T16.

### 25. No executor prompt exists at this commit

- **Tag:** correctness. **Location:** plan:12.
- **Defect:** the reviewer couldn't check that each accepted-task report names the CI verdict on that head, or that it names `cairn-cms-9b`. The planner's prompt also requires a `<plan>-conductor-prompt.txt`.
- **Fold:** write it with those lines before approval.

### 26. Over-ceremony: T15's sweep

- **Tag:** optional. **Location:** plan:273.
- **Defect:** the published docs carry one hit, so the "fix `docs/admin/**` pages" sweep is close to empty. Most of T15's 45 minutes is the rulings entries and `BACKLOG.md`. `docs-fact-checker` on so few changed lines costs little, so keep it.
- **Fold:** T15 at 25 minutes, naming the rulings work. About 20 minutes saved. T16's 40 is thin for four reviewers, CI, a baseline regenerate, and the smoke, so move those minutes there.

## Lens items with no gap

- **Stops and caps:** plan:83-84 and :94 give a traced-cause answer, and only the "may not" items escalate. The only stop with no cheap answer is finding 12.
- **Pre-flight:** nothing there needs Geoff, and the smoke is local (`admin-smoke-test.md`).
- **Credentials:** no task reads one.
- **`auth-data` paths:** T1 and T5 are right. T13's "page routes' `data` types" could reach `(site)/preview/[token]`, which is `auth-data`. If it does, the close's security read covers it, so it needs only a note.
- **Consumers grammar:** plan:76-77 matches `check-consumers-must.mjs`.

No finding here is an OWNER FORK. Each resolves as a method call.
