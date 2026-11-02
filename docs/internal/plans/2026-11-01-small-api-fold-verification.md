# small-api fold verification

Read at `7954cba13` against `origin/main` (`16a081668`). "Plan" means `2026-11-01-small-api-plan.md`.

**Verdict:** no blocker, so no second read. 0 blockers, 4 major, 9 minor, no owner fork. Every review blocker and major closed at its cited location. The four majors are new or left by the fold: two dead-name rows that can't print nothing on a correct tree, a re-run claim that stops being true once T14's own tests exist, and a T5 fallback that can't build.

**How it was checked:** both script modes ran on a clean extract of `origin/main` (routing 55 files, block 78, matching the record), and every table row ran over the result. The overloads and the `esm-env` mock were re-probed in scratch. `lane:fast`, `tsc` over the repo, and the suites were not run.

## Findings

### 1. major, `correctness`: T14's script can undo T14's own refusal tests on a re-run

- **Location:** plan:75, plan:311, plan:318; `2026-11-01-small-api-renames.mjs:24-25`.
- **Defect:** the plan calls block mode re-runnable after a merge, and plan:75 runs it when a conflict lands, which can be after T14 commits. T14's test is `createRenderer({ components: registry } as never)`. Regex `:25` rewrites that to `{ blocks: registry }`, so the test stops proving the refusal and fails. Regex `:24` also rewrites any `rendering.components` in the refusal's source or message, which turns "names the old key" into "names the new key", and the T14 row flags the same text with no listed false match. The failure is loud, but a merge chore then reads as a broken refusal. Routing mode has no such case: T10's `'feed' as never` and `'feed' as const` match none of its regexes.
- **Fold:** in T14, write the test as `const stale = { components: registry }; createRenderer(stale as never)`. Read the key with `'components' in rendering`, and word the message as "the `components` key under `rendering`". No script change, and no regex then matches either line.

### 2. major, `correctness`: the T7 row hits on a correct tree, the `ttlMs` failure again

- **Location:** plan:118, plan:237-240.
- **Defect:** `dist/media-seed` also matches the new home. T7 itself writes `packages/cairn-cms-dev/dist/media-seed/bin.js` into root `package.json:36`, both test files' `BIN`, and the dev package's `bin`, and both lockfiles record that `bin` as `dist/media-seed/bin.js`. So at least six lines hit whatever the executor does.
- **Fold:** the row becomes `src/lib/media-seed`. Add to T7's acceptance: `git grep -n "cairn-media-seed" -- package.json` prints nothing, which is the promise the second term was reaching for.

### 3. major, `correctness`: the narrowed T4 row reaches `docs/internal`

- **Location:** plan:115.
- **Defect:** `-- skills docs` replaces the shared pathspec, so it loses `:!docs/internal`. `docs/internal/engine-rulings.md` has one hit today, and the plan and design files sit there on this branch. Those hits are correct, and T15's rulings text can add more.
- **Fold:** the row's pathspec becomes `-- skills docs ':!docs/internal'`.

### 4. major, `correctness`: T5's `ContentRoutesConfig` fallback can't build and misses a reader

- **Location:** plan:202, plan:207; `packages/cairn-cms-dev/src/fake-anthropic.ts:10`; `packages/cairn-cms-dev/tsconfig.build.json` (`rootDir: src`); `examples/showcase/src/chassis/cairn.server.ts:6`.
- **Defect:** no "internal path it uses for the runtime" exists. `handle.ts:15` imports `CairnRuntime` from the public root, and only test files, which the build excludes, reach `../../../src`. A non-test source import outside `rootDir` fails the `tsc` step inside `npm run package`. `chassis/cairn.server.ts:6` imports the same type, along with its template copy, and isn't in T5's Files. "The leak gate decides" leaves the branch open: `CairnAdminConfig` reads the type by indexed access, which renders inline, so the gate may not hold it.
- **Fold:** decide it. Both readers use `CairnAdminConfig['tidy']`, which is the same type and stays public, whatever the barrel does with `ContentRoutesConfig`. Add `chassis/cairn.server.ts` to T5's Files and delete the sentence about the internal path.

### 5. minor, `correctness`: T3's own lane goes red on `newly-published.md`

- **Location:** plan:47, plan:169; `skills/cairn-extending-a-site/references/newly-published.md:37`.
- **Defect:** the file has a checked `ts` block importing from `/delivery/data`, with no skip comment. `check:snippets` typechecks `skills/*/references`, so T3's docs leg fails until T5 deletes the page. Plan:93's general rule tells the executor to fix it, but plan:47 names only the S06 eval as waiting for T5.
- **Fold:** add the file to T3's Files: line 37 and the prose at `:11` read `/delivery`. T5 still deletes it.

### 6. minor, `correctness`: the quoted `resolveDb` line contradicts the sentence around it

- **Location:** plan:185, plan:195.
- **Defect:** the plan quotes `const db = config.resolveDb(siteEnv<Env>());` and says a present undefined value refuses with `db_not_bound`. On that value the quoted line throws `TypeError`, with no audit and no log. The test at plan:195 catches it, so the cost is a red run.
- **Fold:** quote `config.resolveDb?.(siteEnv<Env>())`.

### 7. minor, `correctness`: two gates read T4's new surface and the plan names neither

- **Location:** plan:183, plan:188.
- **Defect:** the exported wrapper type needs a showcase use or a `check-self-use-allowlist.json` row, and T4 cites only `:4-5`, the rows that go. `check:options` walks every overload's parameters (`check-options.mjs:318-325`), so the inline `resolveDb?: undefined` is a public option member needing a doc comment. Neither reads as a design problem.
- **Fold:** T4 adds the allowlist row and gives that member a one-line doc comment.

### 8. minor, `correctness`: two `rendering` shorthands are missing from T14's hand edits

- **Location:** plan:312; `src/tests/unit/content-adapter-islands.test.ts:12`; `src/tests/component/CairnAdmin.test.ts:209`.
- **Defect:** both pass `components` by shorthand on a `rendering` object. After the script they trip the new `defineAdapter` refusal, and the T14 row can't see them. The earlier list is otherwise complete: `rendering: { render, components` occurs nowhere else.
- **Fold:** add both to the hand edits.

### 9. minor, `correctness`: T4 leaves false claims in a published doc comment

- **Location:** plan:180, plan:186; `src/lib/sveltekit/section-action.ts` (the header, steps 4 and 5, and "Posture"); `src/lib/sveltekit/admin-action.ts` (the closing paragraphs).
- **Defect:** `createSectionAction`'s `@public` comment still cites `createAdminAction`'s opt-in `access` option and says the factory requires `resolveDb`. The T4 row catches `deps.access`, not this prose.
- **Fold:** T4's doc comment bullet names those passages. The step list gains the no-resolver path.

### 10. minor, `correctness`: the T3 row has an unlisted false match

- **Location:** plan:125; `src/tests/unit/github-slug-contract.test.ts:55`.
- **Defect:** the test's fixture is a heading string that contains `/delivery/data`. The string needn't change, and it isn't in T3's Files.
- **Fold:** add it to "Known false matches".

### 11. minor, `correctness`: the branch the setup merges isn't on origin, and its name can't be the executor's

- **Location:** plan:5.
- **Defect:** `git ls-remote origin worktree-small-api` prints nothing, so `git merge origin/worktree-small-api` fails until it's pushed. Plan:5 also names that branch as the pass branch, though this worktree holds it and sibling runs use a `-run` name.
- **Fold:** the planning session pushes the folded head before launch. Plan:5 names the executor's own branch, or states the refspec T6 pushes.

### 12. minor, `correctness`: one script write is missing from the pre-flight list

- **Location:** plan:53; `.claude/skills/cairn-following-admin-design/references/cm-editing-surface-alignment.md`.
- **Defect:** block mode rewrites that file, and plan:42 makes a refusal a stop. Its one hit is a history note that quotes the retired label "Fold this section", which the rewrite makes false.
- **Fold:** list the file under T14, and restore the quoted label in the hand edits.

### 13. minor, `optional`: the header's design figure doesn't match the sheet

- **Location:** plan:6; run sheet "Ceilings".
- **Defect:** the plan says design 330 beside ceiling 840, and the sheet's 840 is twice its 420. Nothing turns on it, since 540 clears either ceiling.
- **Fold:** write "sheet 420, ceiling 840, plan path 540", or say what took the 90.

## What held

- **Closure:** blockers F1 to F3 and mechanics 1 to 4, and every major, closed where the record says. T1's second grep, T5's narrowed `ttlMs` term, and the T6 row can all print nothing on a correct tree.
- **Overloads against the sheet:** plan:66 keeps the sentence, and T4's fallback applies it. The probe confirms the record's forms and adds three: `ReturnType<typeof createSectionAction<Env, Db>>` at `factory-contracts.test.ts:126` still resolves, a one-type-argument call with a resolver is refused, and a possibly-undefined resolver is refused.
- **`AdminActionOptions` and `deps`:** the only `access` and `isDev` callers are `admin-action.test.ts` and `one-map-five-readers.test.ts`, both planned. Every remaining test in `admin-action.test.ts` that reaches the handler audits, so the mock's `DEV: true` default changes no outcome.
- **`esm-env` mock:** proven again with a live getter over `vi.hoisted`. It depends on T4's `if (DEV)` reading at call time, and the plan says so.
- **Workers stub:** the component project is unaffected. Its four console spies read strings or use `String(...)`, none reads a record's fields, and the `document` guard keeps Chromium's agent. In the showcase, `actions.test.ts:66` is the only test reading a record, and its project has no shared setup, so T5's stub is the right fix. The integration project runs at a 2026 compatibility date on workerd.
- **Script reach:** no Svelte-sense `component`, kept file name, or anchor changed. Neither mode touches a `CHANGELOG`, `consumers-must-baseline.json`, a snapshot, or any `auth-data` path. After both modes, the only T10 and T14 row hits are generated files (`api-surface.md`, `templates/waymark`) and the listed hand edits.
- **T6 wait:** `gate-table.json` is protected, nothing in another task's files is, and draft PRs fire `test.yml`. Recent runs took 10 to 11 minutes, inside the 15.
- **T5 and the `auth-data` map:** `actions.test.ts:66` exists as cited, and `admin/signups`, `hooks.server.ts`, and `preview/[token]` are edited only in T5, with T13's note. Their engine imports touch none of T4's or T6's moved names.
- **Pairs:** T7 with T8, and T11 with T12, share no file. T12's names aren't on the surface, so only T11 regenerates it. `fenceDepths` has no internal caller, so its row can clear.
- **Path:** the table sums to 540, with pairs at their longer task.
- **Owner decisions:** `dialect` has its evidence: the design records it, and both sites set the only value it takes. No other removed option is set in the four sites. `intlOptions` and "Unfold" are reversible calls correctly left out of the forks.
- **Over-ceremony:** nothing costing more than a few minutes.
