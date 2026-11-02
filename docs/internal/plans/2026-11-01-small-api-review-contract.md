# small-api plan review: contract and criteria

Reviewed at `90f3f3c8e`. Plan line numbers cite `2026-11-01-small-api-plan.md`. All evidence came from `git grep`, `git show`, or a file read in this worktree. Nothing was built or run.

**Counts:** 3 blocker, 14 major, 14 minor. One finding is an **OWNER FORK** (F17).

## What holds

- **Scope map.** Every item on the sheet's pass 3 line has a task: E5 T7; E6, E8, E10, E4, ergonomics 13 T4; E9, `buildNewlyPublished`, shape 10 T5; options T9; shape 7 and the leak gate T6; shape 5 T3; shape 12 with #32 T10; shape 14 T11; shape 21 T14; W3 T12; ergonomics 16 and 21 T8; #98, #160, #187 T2; shape 8 T1. P9 went to PR #180.
- **May set aside and may not.** Line 68 matches the sheet, with three deliberate differences. Shape 8 joins may-not, #230 joins may-set-aside (the design's reason at its line 60 holds), and "P9's grammar" leaves may-not because #180 took it. Line 76 still binds the plan to that grammar. One set-aside outside the sheet is F27.
- **Type tests are live.** `@ts-expect-error` in `src/tests/unit/*.test.ts` is checked: root `tsconfig.json` includes `src/tests/**/*.ts`, and `npm run check` is on the fast lane. Twelve test files already rely on it (`routing.test.ts:17`).
- **T1's failing-first test fails first.** `email.ts:60-66` reads `sender.from`, so a runtime holding only `email:` throws on today's `auth-routes.ts:240`.
- **T12 needs no `Consumers must:` line.** None of its names is in `api-surface.md`.
- **`surfaceSubpaths()` skipping `./internal`** also covers `check-tiers`, `check-options`, `check-snippets`, and the leak gate, since all four read that function.

## Findings

### F1. blocker, correctness: T5's proof that the reorder survives can't be true

- **Location:** plan:177.
- **Defect:** "The token flow's refusal tests pass unchanged, which is the proof the reorder survives." Every refusal test calls the old signature. `src/tests/integration/preview-load.test.ts` has 21 `loadPreview(runtime(), publicConfig(), event)` calls, at lines 196 to 537. After T5 each must change, so none passes unchanged. The sheet's stop ("#190's ordering and #122's reorder stay on the built-in path") then has no stated proof on an `auth-data` path. The file name `preview-[token]` also matches no test file.
- **Fold:** Name `preview-load.test.ts`. Rewrite the call shape in one mechanical commit, and state the criterion as: "`git diff` over the file changes only the `loadPreview(` call lines; no `expect` line, fixture, or event builder changes, and the file passes." The test-first step keeps the signature failure.

### F2. blocker, correctness: T6 never proves the gate still fails a duplicate

- **Location:** plan:185-188.
- **Defect:** Shape 7 and the leak gate are may-not items, and the design's end-to-end claim is "`check:surface` fails on a name added to a second subpath". T6 deletes `loadReexportRecord` and the record parameter. `main()` is where those two meet. Removing that block can drop the `findHomeViolations` call while every planned test stays green, because the fixture drives the pure function. Then the gate's only surviving check is the golden diff, which `--update` accepts.
  The leak fixtures have a second problem:
  - `deriveTypeCheckerLeaks` reads the real `dist` through `surfaceSubpaths()` (`check-surface-leaks.mjs:253-256`), so no "fixture signature" can reach it without a seam.
  - Fixture 3 (exported nowhere: a leak) passes on the old code, since `exportedAnywhere` is already global. Fixture 2 passes there too through the type-checker model. It would fail only through `deriveLeaks`, the renderer merge at `:431`, and only for a literal-union type.
  - Fixture 1 "fails" on old code by a `TypeError` on `record.reexports`, not by a verdict.
  - `check-surface-leaks.test.ts:221-268` tests the retired model and isn't in T6's files.
- **Fold:**
  1. Add a mutation criterion: add one duplicate export to a barrel, see `npm run check:surface` exit non-zero naming it, revert. Record the output in the PR.
  2. Extract the filter at `:284-288` as a pure exported function and aim fixtures 2 and 3 at it, labelled as pins that pass on old code.
  3. Add one that fails on old code: `deriveLeaks` output holds no entry with `model: 'renderer'`, using the literal-union case from `check-surface-leaks.test.ts:221`.
  4. Add that test file to T6's files.

### F3. blocker, correctness: T7 turns six packaged-bin tests into silent skips

- **Location:** plan:198-199.
- **Defect:** T7 repoints `media-seed-dist-spawn.test.ts` but moves `media-seed.test.ts` with no such edit. That file's `BIN` is `resolve(process.cwd(), 'dist/media-seed/bin.js')` at `:538`, and six tests hang off `it.skipIf(!built)` at `:542-594`. After T7 the root dist has no such file, so all six skip in CI forever and report green. `media-seed-dist-spawn` "passes" the same way if its path is wrong, so the acceptance "`media-seed-dist-spawn` pass" can be vacuous.
- **Fold:** Repoint `BIN` in both files to `packages/cairn-cms-dev/dist/media-seed/bin.js`. Replace `it.skipIf(!built)` in both with the barrel-prune form, `expect(existsSync(BIN), 'missing ...; run "npm run package" first').toBe(true)`, or leave the skip and add a criterion that the two files report zero skipped after `npm run package`.

### F4. major, correctness: T5's `ttlMs` grep can never print nothing

- **Location:** plan:178.
- **Defect:** `src/lib/github/signing.ts:133,141` holds an unrelated `ttlMs` that stays. The grep fails on a correct tree, and an executor will loosen it by hand. It also misses where the old option lives outside its paths: `src/tests/integration/content-routes-preview.test.ts:157,171`, `scripts/checks/check-options.mjs`, `check-self-use-allowlist.json`, and the emitted template copies of the two skills.
- **Fold:** Use `git grep -nE "PreviewTokenConfig|resolveTtlMs|buildNewlyPublished|\bpreview: \{ ttlMs" -- src skills .claude/skills scripts/checks ':!scripts/checks/api-surface.md' templates/waymark`, which prints nothing.

### F5. major, correctness: T3 and T13's showcase proofs name no install and can prove the wrong engine

- **Location:** plan:152, plan:259; design:86.
- **Defect:** "A `vite build` of the showcase" and "the scaffold type check" name no command and no install. `examples/showcase/node_modules` doesn't exist in this worktree. The durable gotcha "A worktree showcase e2e proves MAIN's engine" says that when it does exist in a worktree it symlinks to main's build. T3's run would then fail confusingly, since main has no `./internal`. T13's could pass against the wrong types.
- **Fold:** State each as a command plus its precondition: "after a from-scratch `npm --prefix examples/showcase install`, `npm --prefix examples/showcase run build`", or say the proof is CI's and name the job. For T13, name `npm --prefix examples/showcase run check`, the leg `gate-tier.mjs:112` already lists.

### F6. major, correctness: T3's dist test is unspecified where it matters

- **Location:** plan:151-152.
- **Defect:** Four gaps:
  - The rename leaves `vitest.config.ts:102,127` naming the old file, and T3's files omit that config. The new test lands in the `unit` project, whose exclusion exists because these spawns flake there.
  - The plan keeps or drops `it.skipIf(!built)` without saying, and doesn't say what builds first. A spawn test has no import edge, so the fast lane's related selection won't pick it. It runs only in CI.
  - The check reads `dist/delivery/*.js` alone. A static kit import in `dist/render/` or `dist/content/` passes it, and the import alone can't fail because kit resolves from the repo.
  - No test imports `dist/internal.js`. The design probed key `./internal/manifest` with four names, while the plan ships `./internal` with eight. A name dropped from `internal.ts` fails only in a showcase build.
- **Fold:** Add `vitest.config.ts` to the files. Have the test walk the emitted import graph from `dist/delivery/index.js`, following relative specifiers, for a static `@sveltejs/kit` or `.svelte` import. Assert in the same spawn that `dist/internal.js` exports all eight names. Replace the skip with the `existsSync` assertion, and run it by name after `npm run package` in T3's acceptance.

### F7. major, correctness: `Object.keys` of `dist/admin/index.js` can't run, and it misses the types

- **Location:** plan:166, plan:178.
- **Defect:** `dist/admin/index.js` re-exports `.svelte` files, which plain Node can't load. `dist/sveltekit/index.js` reaches `$app/env` through `preview.ts`, which the Vitest config aliases for this reason. Neither criterion names a runner. Keys would also miss `EditorApi`, `TidyApi`, `ImagePlaceholderApi`, and `FormatKind`, four of T4's 19 names, because they are types.
- **Fold:** Assert on the `.d.ts`, as `admin-barrel-prune.test.ts:51` and `sveltekit-barrel-prune.test.ts:81` already do. Make "the barrel holds exactly these three names" an assertion in `admin-barrel-prune`, and the seven names in `sveltekit-barrel-prune`.

### F8. major, correctness: T4's type test can pass on the wrong type

- **Location:** plan:165.
- **Defect:** "Proves `ctx.db` is `D1Database`" passes on an `any` if written as an assignment. "Absent without it" has no stated form. The standing answer (line 73) swaps in a different type when the conditional fails, and the criterion then has no meaning. The runtime half doesn't assert `db_not_bound` stays unreturned or that `ctx` has no `db` key.
- **Fold:** Name the file (`factory-contracts.test.ts`, say). Require an exact-type assertion, so `any` fails, on the zero-argument recipe form `createSectionAction({ resolveDb: () => env.APP_DB })`, and an `@ts-expect-error` on `ctx.db` with no `resolveDb`. Give the fallback's own form: `ctx.db` is exactly `Db | undefined`. Add `expect('db' in ctx).toBe(false)` and no `db_not_bound` audit to the runtime test.

### F9. major, correctness: T1's grep tests readers, not the promise

- **Location:** plan:111, plan:127.
- **Defect:** The outcome is that `composeRuntime` stops copying. The grep matches reads of `runtime.x`. Once the tests are edited, it prints nothing even with `compose.ts:55-65` unchanged. Deleting `compose-icons.test.ts` also removes the only test of those members, and shape 8 is a may-not item. `tool/` and `e2e` are outside the pathspec, though neither holds a hit today.
- **Fold:** Add `git grep -nE "^\s+(sender|render|icons|assets):" -- src/lib/content/compose.ts`, which prints nothing, and a type test with `@ts-expect-error` on `runtime.render`, `.icons`, `.assets`, and `.sender`, which fails while the members exist. Widen the pathspec to `src packages tool examples/showcase templates/waymark`. Fix the stale comments at `auth-routes.ts:2`, `:40`, and `cairn-admin.ts:40`.

### F10. major, correctness: T1's `Consumers must:` covers one of four removed members

- **Location:** plan:128.
- **Defect:** `CairnRuntime` is public, and `render`, `icons`, and `assets` go too. The plan's line names `runtime.sender` alone, so a site reading `runtime.render` gets no action line. The "nothing" clause is rightly prose, since `nothing` must stand alone on the grammar's line.
- **Fold:** One line: `Consumers must: read `runtime.email` in place of `runtime.sender`, and read `render`, `icons`, and `media` from the adapter in place of `runtime.render`, `runtime.icons`, and `runtime.assets`.`

### F11. major, correctness: T10's error criterion passes on today's tree, and its grep stops short

- **Location:** plan:226-234.
- **Defect:** `concepts.ts:61` already "names the valid values", so that clause passes at base. It's the line that must change, and T10's list omits it. `routing.test.ts:19,27` pin the old list. The `inFeeds` grep says nothing of `routing: 'feed'`, and its pathspec skips the eval setups `s08-public-routes.mjs` and `s15-adopt-and-migrate-bad.mjs`, which carry one or the other.
- **Fold:** Add `concepts.ts:61,106-114` to the lines. Require a test that `resolveRouting('feed', 'posts')` throws `must be one of dated, page, embedded`. Widen the grep to `git grep -nE "inFeeds|routing: ?['\"]feed" -- src examples/showcase templates/waymark skills .claude/skills docs`, which prints nothing. `routing.test.ts:17`'s existing `@ts-expect-error` is on an object, so the new one must use the string `'feed'`.

### F12. major, correctness: T14's grep and string list miss live places

- **Location:** plan:264, plan:267-268.
- **Defect:** Five gaps:
  - The grep has no term for `markdown-components`, `defineRegistry({ components`, or the destructured `rendering: { components }`. Its pathspec skips `packages`, `tool`, `scripts/checks`, `examples/showcase/e2e/site-visual.spec.ts`, and `.claude/skills` (`docs-register.md`, S09, `s09-*-bad.mjs`).
  - No criterion covers the UI strings, though they're the editor-visible half.
  - The string locations omit `editor-folding.ts:450`, `editor-highlight.ts:57`, `MarkdownHelpDialog.svelte:4,45`, and `reproductions/stories/editor.ts:143`.
  - The strings also live in `examples/showcase/e2e/golden-path.spec.ts:514,521`, `EditPage.test.ts:2296,3125-3162`, `reproductions-stories.test.ts:527`, and `docs/editors/write-in-the-editor.md:179`, a page `check:editor-quotes` reads. The plan's `e2e` and `docs/admin` wording doesn't reach them.
  - Line 264 renames "Fold this section" but leaves its pair, "Unfold this section", at the same `editor-folding.ts:450`. The same applies at `write-in-the-editor.md:179`. ROADMAP names only "Fold" too.
- **Fold:** Extend the regex with `markdown-components|defineRegistry\(\{ components|rendering: \{ components` and the pathspec to `src examples/showcase templates/waymark skills docs packages tool scripts/checks .claude/skills ':!scripts/checks/api-surface.md'`. Add a second grep over the old strings with the same pathspec. Rename both fold strings: the pair reading "Fold this block" and "Unfold this section" is an oversight, not a taste call.

### F13. major, correctness: T15 has no criterion, and nothing owns the evals

- **Location:** plan:273, with T4 and T11's greps at plan:166, plan:245.
- **Defect:** "Grep every removed or renamed name" has no list and no exit test, so it can't fail. Its scope (`docs/`, `skills/`, `claude/`, `README.md`) leaves out:
  - `.claude/skills/cairn-writing-docs/evals/`: `e1-add-public-option.json`, `e3-seam-bug-fix.json`, `s12-tidy-and-posture.json`, and `S08-public-routes.json` cite removed or renamed names, and `s12-tidy-and-posture-bad.mjs:25` imports `robotsResponse`
  - `.claude/skills/cairn-writing-engine-code/references/code-idioms.md`
  - `.vale/styles/Cairn/ProseProcedure.test.yml`

  A name moved by T6 isn't removed, so the grep can't find a skill snippet importing it from the old subpath. `check:snippets` covers `docs/`, not necessarily `skills/`. Line 106's claim that T15 "only proofreads" the rest rests on this step. T5 also says "the S05 and S06 eval files", while the tree holds `s05-draft-preview.json`, `S06-newly-published.json`, and three setups (`s05-draft-preview-bad.mjs`, `s06-newly-published-bad.mjs`, `s06-newly-published.mjs`).
- **Fold:** Replace the per-task pathspecs with one table in the plan: a task, its dead-name regex, and one shared pathspec, `. ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!BACKLOG.md' ':!ROADMAP.md' ':!docs/internal'`. Each task's acceptance is "its row prints nothing, or each hit is listed as a false match". T15's acceptance is the whole table. Add a one-off check for T6: for each name in the moved-name table, no `skills/` import from a non-home subpath. List the five eval files in T5.

### F14. major, correctness: T8's logger change breaks unlisted tests across the unit project

- **Location:** plan:209-211.
- **Defect:** The unit project runs under Node, so `navigator.userAgent` isn't `Cloudflare-Workers`, and the sink turns to a string for every test there. 31 unit files spy on `console`. `log-emit.test.ts` and `log/create.test.ts` alone read `mock.calls[0][0] as Record<string, unknown>` 22 times, and `admin-action.test.ts:434` uses `objectContaining`. T8's files list three other tests, and it's a 20-minute pair task. The failure is loud, so it's a planning miss rather than a vacuous test, but it would set off the set-aside for a cost the plan didn't weigh.
- **Fold:** Stub the Workers user agent in the unit project's `CLOUDFLARE_WORKERS_FAKE_SETUP`, so existing tests keep the object path and only the new logger test takes the Node path. Add that file to T8.

### F15. major, correctness: `check:consumers-must` is merged, and no task runs it

- **Location:** plan:6, plan:77, plan:104.
- **Defect:** "Enforces that once merged" is stale: #180 is on `origin/main` at `16a081668`. The branch's base predates the gate, and line 11 forbids merging `main` until told, so about 15 new lines reach the first merge unchecked. Line 104 gives T15 a proofread where a gate exists. The gate also flags any prose line mentioning `consumers must:` outside a code span, and T1's "say so in the changelog prose" invites that.
- **Fold:** Have T15 run the merged script against the branch's changelog, or ask `cairn-cms-9b` to merge `main` before T1. Add `npm run check:consumers-must` to T16's acceptance. Say to write no bare `Consumers must:` phrase in prose.

### F16. major, correctness: T3 has no grep for the three retired subpaths

- **Location:** plan:152.
- **Defect:** The task removes three import paths, and its acceptance has no search for them. Hits outside its files: `.claude/skills/cairn-writing-docs/references/docs-register.md:290`, `scripts/checks/check-options.mjs:12`, `scripts/checks/check-surface.mjs:26,321`, `scripts/checks/check-surface-leaks.json:221,245`, and `src/lib/index.ts:47`. Template copies regenerate.
- **Fold:** Add `git grep -nE "delivery/(data|head)\b|cairn-cms/render\b" -- . ':!CHANGELOG.md' ':!MIGRATION-NOTES.md' ':!BACKLOG.md' ':!ROADMAP.md' ':!docs/internal' ':!scripts/checks/api-surface.md'`, printing nothing, or put it in F13's table.

### F17. major, correctness, **OWNER FORK**: `intlOptions` has two internal readers that set an editor-visible date

- **Location:** plan:216-217, plan:220.
- **Defect:** T9 treats `intlOptions` as unset. `CairnMediaLibrary.svelte:888,1122` pass `{ month: 'short', day: 'numeric' }`, and neither is in T9's lines. `check-self-use-allowlist.json:28` keeps its parent type for this reader. Removing the option either changes what editors see in the Media Library or forces a decision T9 doesn't state. T9's grep will catch it, so the risk is an unplanned UI change or baseline regenerate.
- **Options:**
  - **A:** Keep the short date through an unexported helper beside `formatCivilDate`. No screen changes, and the public option still goes. *(recommended: the sheet's call removes names, not behavior)*
  - **B:** Use the fixed format with the year. It's the smaller code path, it changes the Media Library's dates, and it regenerates baselines through CI.
  - **C:** Keep `intlOptions`. It's outside the sheet's set-aside list, so this needs Geoff's word.
- **Then:** add the two lines to T9 and correct `check-self-use-allowlist.json:28`.

### F18. minor, correctness: leak-registry rows go stale before T6, and T3, T4, T5 don't list the file

- **Location:** plan:150, plan:164, plan:176, plan:185.
- **Defect:** `check:surface` runs `check-surface-leaks.mjs && check-surface.mjs`, so a stale row stops `--update`. T3 removes `/delivery/data`, so the rows at `check-surface-leaks.json:220,244` go stale. T4 drops `TidyApi`, the only path to the `Change` row at `:16`. T5 hides the route factories that most `/sveltekit` type-checker rows hang from. T6 also says only renderer rows go, while the `SlotKind` and `StandardResult` per-subpath rows will fall too.
- **Fold:** Add `check-surface-leaks.json` to the files of T3, T4, and T5. Word T6 as "rows the derivation no longer produces".

### F19. minor, correctness: T5's test-first names one of its two signatures, and its files omit the tests

- **Location:** plan:176-177.
- **Defect:** "The two bag signatures" then describes `loadPreview` alone. `loadHealth` has 16 call sites in `health.test.ts` and `health-live-check.test.ts`, plus the type-level `env-genericity.test.ts:141`. `content-routes-preview.test.ts` has 11 `mintPreview(runtime(), ...)` calls, two of them `ttlMs` tests that must go. `delivery-newly-published.test.ts` goes with the function. None is in T5's files.
- **Fold:** List the five files. State that `health.test.ts` calls `loadHealth(event, { runtime })` first and fails. Delete the two `ttlMs` tests in `content-routes-preview.test.ts:157,171` and list them.

### F20. minor, correctness: T4's `createAdminAction` criterion is a judgment, and two tests are unlisted

- **Location:** plan:164, plan:166.
- **Defect:** "Shows no teaching of the export" can't fail. `skills/cairn-building-admin-screens/SKILL.md:3` names it in the trigger description, and T4's files omit that file. Dropping `access` also affects `one-map-five-readers.test.ts` (6 hits) and `env-genericity.test.ts` (4 hits), which aren't listed.
- **Fold:** Make the grep print nothing, and add the three files. Log-event rows in `log-events.md:123,126` are reworded, not excused.

### F21. minor, correctness: T9's acceptance covers five of its eight options

- **Location:** plan:219-220.
- **Defect:** The grep omits `bodyClass`, `spellcheck`, `dialect`, and the adapter's `siteConfigPath`, and it skips `src/tests`, showcase, and template. "No opt-out left in the type" has no test.
- **Fold:** Add `bodyClass|dialect` to the grep with F13's pathspec. Add `@ts-expect-error` on `editor: { siteConfigPath }`, `unsafeDisableSanitize`, and `preview: { bodyClass }`.

### F22. minor, correctness: T2's #98 breaks a pruning test, and T2 has no files line

- **Location:** plan:133, plan:137.
- **Defect:** `root-barrel-prune.test.ts:23` lists `serializeMarkdown` among names that must stay off the root, so #98 fails it. The standing answer covers this, but T2 is the only surface task with no files line, and #98 has no positive criterion.
- **Fold:** Add a files line naming that test. Add acceptance: `serializeMarkdown` resolves from `.` in `root-barrel-prune`.

### F23. minor, correctness: T12's acceptance is `npm run package`

- **Location:** plan:252.
- **Defect:** A build passes whether or not any name went. The clause that `media-seed/index.ts` "is already gone by T7" has no basis: T7 moves the directory, and `media-seed.test.ts:13-14` imports that file.
- **Fold:** Use `git grep -nE "generateComponentReference|deriveTagUsage|markFirstList|fenceDepths" -- src`, printing nothing or only a listed set-aside. Add `component-exports.test.ts:10,21`, `render-exports.test.ts:26`, and `root-barrel-prune.test.ts:46` to the task. Delete the media-seed clause, or give T7 the deletion.

### F24. minor, correctness: T8's secret and remediation criteria are a read, not a test

- **Location:** plan:211-212.
- **Defect:** The test line covers the strings and the logger, not `CairnError`. "Read `log-events.md`'s redaction line" can't fail.
- **Fold:** Add a test that `new CairnError('config.bindings-missing').message` holds title and remediation with `conditionId` and `cause` unchanged. Add another that an explicit `options.message` keeps its stated behavior. Decide that behavior in the plan: line 208's quote leaves it open.

### F25. minor, correctness: `Consumers must:` gaps in T10 and T8

- **Location:** plan:235, plan:202-212.
- **Defect:** T10's line omits `RoutingRule.inFeeds`, which is a public field a site can read. T8 has no line, while its default sink changes what a site sees outside Workers, and `CairnError.message` grows.
- **Fold:** Extend T10's line with "stop reading `inFeeds`". For T8, add changelog prose, with a line only if a shipped surface depends on the old shape. If the sweep finds no site that does, record `Consumers must: nothing.`

### F26. minor, correctness: T15 closes items that may be set aside

- **Location:** plan:273.
- **Defect:** #230 and #231 close unconditionally, though #230 and the `/delivery/data` fold are may-set-aside. T14's and T11's items carry the same risk in `engine-rulings.md` updates.
- **Fold:** "Close each unless set aside under `## Decisions`."

### F27. minor, correctness: T12 sets aside a name the sheet doesn't list

- **Location:** plan:250.
- **Defect:** The sheet allows W3's `ADMIN_CSS_SAFELIST` and `fenceDepths`. `markFirstList` isn't on the list, and `render-pipeline-snapshot.test.ts:74` calls it, so this set-aside is likely to fire.
- **Fold:** Move the function into the snapshot test as a local helper, since it's a fixture there. That keeps W3 intact with no set-aside.

### F28. minor, correctness: T6 names a script that doesn't exist

- **Location:** plan:188.
- **Defect:** `package.json` has no `check:surface-leaks`. `check:surface` runs both.
- **Fold:** Drop the name. Also say the gate-table row at `gate-table.json:38` moves.

### F29. minor, correctness: the dev package's peer range doesn't match a no-promise entry

- **Location:** plan:197, plan:200.
- **Defect:** `packages/cairn-cms-dev/package.json:26` declares `"@glw907/cairn-cms": "*"`, while the moved bin imports `./internal`, which carries no semver promise and which older engines lack. `check:dev-package` doesn't read this.
- **Fold:** Add to T7's `Consumers must:` line "at the engine's version". The dev package bumps in lockstep, so the words carry it without a new check.

### F30. minor, correctness: T3 doesn't prove the 404 stays a 404 once bundled

- **Location:** plan:142, plan:152.
- **Defect:** The dynamic `error()` must throw an `HttpError` that kit's own `instanceof` recognizes in the Worker bundle. A unit run from source proves nothing about that, and shape.md lists "bundles cleanly" as unverified.
- **Fold:** Name the existing e2e that hits a missing public page and a noindex markdown twin, or add those two requests to T16's smoke, asserting 404.

### F31. minor, optional: three items cost more than they buy

Ranked by cost:

- **plan:189, plan:273, moved-name table.** The sheet says no migration tooling, every site rebuilds, and R1 resets `MIGRATION-NOTES.md` in pass 8. The JSON is deleted at T6 while T15 owns the table, so it needs `git show` from the pre-T3 commit. `api-surface.md` answers the same question. Keep only if F13's skills check needs it. A one-time list for that check needs no committed table.
- **plan:277, `standards:daisyui-a11y-reviewer` on T14.** T14's markup change is strings and one `aria-label` set. `standards:diff-reviewer` already reads them. Cut, or scope to the changed `aria-label` lines.
- **plan:188, "duplicate count over `api-surface.md` by a one-off read".** The gate already fails that condition once F2's mutation proves it. Cut.
