# cleanup (pass 8) non-backlog state read

Read at `9ea74f78a` (worktree `cleanup`, clean). Read-only on the repo. "Sheet" is `design-audit/run-sheet.md`; "ledger" is `ledger.md`; both under `~/.local/state/cairn-agent-first/`. Every quote below was read from the file named. Go behavior marked "not run" is from Go's module rules, not a test. No install, build, or gate ran.

## Contradictions and traps first

1. **Ergonomics 8's pinned `check.yml` step has no usable tag.** `tool/v1.1.0` is the newest tag, and `tool/CHANGELOG.md:74-75` says `v1.1.0`'s doctor fails a site that dropped `checkOrigin`. `tool/v2.0.0` doesn't exist until the sheet's step 17. See item 8.
2. **`tool/go.mod:1` is `module github.com/glw907/cairn-cms/tool`, with no `/v2`.** Sheet step 17's `tool/v2.0.0` tag is then invalid to `go install`/`go run` (not run), so `@latest` stays on v1 and every printed `go install ...@latest` stays old. Release concern, but it blocks item 8.
3. **`src/tests/unit/github-slug-contract.test.ts` fails on the reset.** It requires the line `## 0.94.0` in `MIGRATION-NOTES.md` (`:82-86`, enforced `:141-153`). Not on the sheet's reader list or slim's.
4. **`check:docs` needs `## Unreleased` in both files and `check:version` needs `## 0.98.0` in the changelog.** The reset cannot leave Unreleased alone. See item 1.
5. **The `--yes` ruling is a code change, not only a doc.** The ledger's short form reads like a doc item; `chapter3.mjs:938-943` still consents. See item 11.
6. **`docs/STATUS.md` holds no "the one release".** The ruled sequence is already there (`:14-18`), so only `ROADMAP.md` needs that edit. STATUS is stale on another point: `:22` says #184 is PR-ready, and it merged at `9ea74f78a`.
7. **R9's "up to 2,000 lines of past-pass detail" is not section-shaped.** `Now`/`Next`/`Later` are 214 bullets, mostly open filed items. See item 6.
8. **The rubric sentence is named nowhere.** Identified by inference at `docs/architecture.md:48`. See item 7.
9. **`template-repo/README.md` is at `packages/create-cairn-site/template-repo/README.md`,** and `cairn-releasing` plus `ROADMAP.md:423` both order retiring the notice at publish, which the sheet's reword replaces. See item 10.
10. **`CONTRIBUTING.md:98-120` describes a `LEGACY_PATH_MAP` that no longer exists** (`git grep` finds it only in `CONTRIBUTING.md`). Published-page deficiency.
11. **The `/styleguide` exclude also breaks the `template` arm of `test:theme-fixture`** in `design.yml`, and needs a nav strip or the prerender crawl fails. See item 9.
12. **Ergonomics 20's premise changed.** #45 is closed by throwing, not by "take the concept id". See item 8.

## 1. R1, changelog and migration-notes reset

**Done:** nothing. **Remains:** all. Runs last.

### Current shape

- `CHANGELOG.md`: 9,111 lines, 690,795 bytes, 90 `## ` sections. No `# ` title; `## Unreleased` is line 1.
- `## Unreleased` is lines 1 to 1552 (`## 0.98.0` at 1553). Subsections: Added 3, Changed 206, Removed 1137, Security 1298, Fixed 1329, Documentation 1446, Dependencies 1523, a second Fixed 1544. No `release-size` marker in it (first is `:1555`, inside 0.98.0).
- `Consumers must:` lines in Unreleased: 156 grammar-shaped, 32 exactly `nothing.`, so 124 actionable (the sheet's 38 is stale). p2-p4 and this pass add more.
- `MIGRATION-NOTES.md`: 1,048 lines, 96,248 bytes, 13 `## ` sections: Upgrade cairn 9 (with `###` Precondition 13, Steps 19, four "When your range crosses" at 68, 95, 127, 156, "You know it worked when" 178, "If something goes wrong" 183), Per-version notes 191, Unreleased 197 to 418, 0.98.0 419, 0.97.0 528, 0.96.0 919, 0.95.0 959, 0.95.0-rc.1 986, 0.94.0 993, 0.92.0 1004, 0.91.0 1015, 0.87.0 1026, 0.86.0 1036.
- `scripts/checks/consumers-must-baseline.json`: 59 entries.
- `package.json`: `"version": "0.98.0"`; `:186-187` ship both files. Tags `pre-agent-first` (`73a1ab9ca`) and `v0.98.0` hold history; only `v0.98.0`'s tree is a clean pointer for the released file.

### What each reader requires

| Reader | Requires | Reset must leave |
|---|---|---|
| `scripts/checks/check-version.mjs:152-153` | "`CHANGELOG.md has no version heading matching "## X.Y.Z"`" | at least one version heading |
| `check-version.mjs:161-165` | top heading equals `package.json` | **`## 0.98.0` kept as the top numbered heading** until the cut |
| `check-version.mjs:167-169` | "`if (headings.length === 1) { return { ok: true, bump: 'initial' };`" | a lone stub is green, no marker needed |
| `check-version.mjs:99-138` | Unreleased: at most one `<!-- release-size: (\w+) -->`; none means a simulated patch `0.98.1` | Leave none. `cairn-releasing` step 4: "**Derive the size here, at the cut**"; sheet step 5 derives it at the cut. A minor marker would also pass, simulating `0.99.0` |
| `docs-links.mjs:171-178` `unreleasedParityMismatch` | both or neither carry `## Unreleased` | keep `## Unreleased` in both |
| `src/tests/unit/docs-links.test.ts:165-168` | same parity on the real files | same |
| `docs-links.mjs` link walk | `isDatedRecord` tolerates only `docs/` retired targets in the changelog; any other dead link fails | check links in what survives; notes get no tolerance |
| `check-consumers-must.mjs:109-117` | reads only Unreleased; any off-grammar line not in baseline fails, and any baseline line not found fails as stale | run `node scripts/checks/check-consumers-must.mjs --update`, expect `[]` if the new text is on grammar. A hand-empty baseline with an off-grammar line fails |
| `check-leaks.mjs:200,209,485-486,566` | Unreleased hits are errors, released are warnings; notes are T1, whole file C1 to C4 | no site names or owner names in the new text |
| `check-package-files.mjs:38,83` | `MIGRATION-NOTES.md` packed (`required`); no shape | file exists |
| `check-snippets.mjs:72,385-386` | "`check-snippets: ${MIGRATION_NOTES} does not exist`"; fences are compiled | file exists, fences compile |
| `check-symbols.mjs:68` | required scope entry (`SCOPE` has no `optional` on it) | file exists; any token in it resolves or is allowlisted |
| `check-symbols-allowlist.mjs` | `ALLOWLIST.has` at `check-symbols.mjs:677,724`; no staleness check, so a stale entry never fails | pruning is optional hygiene; drop entries by hand |
| `github-slug-contract.test.ts:82-86,141-153` | `expect(lines, ...).toContain(markdown)` for `## 0.94.0` in `MIGRATION-NOTES.md` | **Repoint the case to `## 0.98.0`, id `0980`, if notes keep that heading, or mark it `synthetic: true`** |
| `tool/internal/health/check_engine.go:188-205` | see below | nothing structural |
| `gate-tier.mjs:696`, `gate-table.json:51,53,...` | path lists only | nothing |
| `.claude/skills/cairn-writing-docs/evals/site-cases/e1-add-public-option.json:16,29,55` and `e2-add-audit-rule.json:32` | cite `CHANGELOG.md:1` as `## Unreleased` | keep it on line 1 |
| Tests on fixtures (`check-version`, `check-leaks`, `check-package-files`, `check-snippets`, `check-symbols`, `check-consumers-must`, `check_engine_test.go`) | synthetic strings | nothing |
| `cairn-releasing/SKILL.md:128-138` | renames `## Unreleased` to `## <x.y.z>`; "Add the matching per-version entry to `MIGRATION-NOTES.md`" | still works; the sheet's "gate at the commit" must rename both headings |

Sheet line "`check-version`, `check-leaks`, `check-package-files`, and `check-snippets` follow the reset": none needs a code edit. The ones that do need action are `consumers-must-baseline.json` and `github-slug-contract.test.ts`.

No workflow reads either file; `git grep` over `.github` finds only a comment at `dependabot.yml:6`.

### Prose readers

- `claude/CLAUDE.md:79` (slim's `:82` moved): "`node_modules/@glw907/cairn-cms/MIGRATION-NOTES.md` carries the upgrade procedure and the\nper-version record." True only if the notes keep both. An edit here changes `templates/waymark/.claude/...` and `guidance-hashes.json` (regenerate; see `check:template`).
- `docs/admin/before-you-start.md:68`: "Taking a new cairn release. The package's `MIGRATION-NOTES.md` lists each version's upgrade steps, so hand a developer that file."
- `docs/admin/own-your-domain.md:124`: "A build deploys code and doesn't apply database migrations. A cairn update that ships a migration still needs a developer to run it. The package's `MIGRATION-NOTES.md` says which versions do."
- `docs/architecture.md:44` ("listed in the changelog's `Consumers must:` lines and in the [migration") and `:74`: stay true.
- `README.md:69-70`: stay true.
- `CONTRIBUTING.md:98-120` "CHANGELOG.md and the legacy-path map": stale. Quote: "The script carries a `LEGACY_PATH_MAP`, a table from each retired path to the page that". Replace with the `isDatedRecord` rule from `docs-links.mjs:14-16`. `CONTRIBUTING.md:169-171` (the grammar) stays.
- `MIGRATION-NOTES.md:3-7,193-195` (intro, "This record starts at `0.84.4`") must be rewritten by the reset.
- `tool/docs/release-candidate-notes.md:109,119`: "`CHANGELOG.md` lists each one." Goes stale; low value.
- `migrations/0000_auth.sql:29`, `src/lib/auth/store.ts:235`: comment "(MIGRATION-NOTES.md)" on a hand-applied migration. Check that the surviving notes still say it, or repoint.
- `check-symbols-allowlist.mjs:38`: "`'env-var:CAIRN_AUDIT_COOKIES', // MIGRATION-NOTES.md history; the reader was removed in 1b; R1's reset drops this line`". Entries that name the notes: lines 37-38, 44-55, 62-63, 76, 82, 84, 93, 96-102 (slim's "38-91" is close). Some survive if Unreleased still names retired ids; prune by running `check:symbols` after the reset.

### P9's grammar

`check-consumers-must.mjs:22`: `export const LINE = /^(?:  )?Consumers must: ([^\t\n\f\r ].*)$/s;`

`:58-68`: mentions inside a code span are skipped; a mention off-grammar fails. "the line is not a paragraph of its own (blank line before and after)"; "a body opening with "nothing" must be exactly "nothing.""; "the body must end in a period". The Go reader (`check_engine.go:36`) is `(?m)^(?:  )?Consumers must: (\S.*?)\r?$`; `scripts/checks/fixtures/consumers-must/cases.json` pins both.

So the reset's section is `## Unreleased`, consolidated prose, and one paragraph of its own at column 0:

```
Consumers must: rebuild the site from `create-cairn-site`; this release has no upgrade path from an earlier version.
```

Wording is the planner's. It must be the only actionable line, per the Brief's "P9 contract only with one rebuild line". No heading change, no marker.

### The sheet's `cairn health` line

Confirmed. `check_engine.go:188-205`: `sections := changelogSections(changelog)`; `sectionHasActionableConsumersMust(sections[version])`. A missing key returns `""`, so no match and `actionable` stays false, ending at `detail.outcome(spine.OK, "", detailEngineBehind(...))`. It reads `main`, so it holds from the merge. Two notes:

- Between merge and `0.99.0`, a site behind reads `OK` where it read `Failing`.
- After `0.99.0` publishes, any site below it skips `0.99.0`, whose section holds the rebuild line, so it reads `Failing` with `CodeEngineBehind`. That is the intended signal.

`changelogHeading` (`:29`) is `(?m)^##\s+([0-9][^\s]*)\s*$`, so the `## 0.98.0` stub keys an empty section. Fine.

**File set:** `CHANGELOG.md`, `MIGRATION-NOTES.md`, `scripts/checks/consumers-must-baseline.json`, `scripts/checks/check-symbols-allowlist.mjs`, `src/tests/unit/github-slug-contract.test.ts`, `CONTRIBUTING.md`, `docs/admin/before-you-start.md`, `docs/admin/own-your-domain.md`, `tool/docs/release-candidate-notes.md`, possibly `claude/CLAUDE.md` plus regenerated `templates/waymark` and `guidance-hashes.json`.

**Size:** 90 minutes (the merge of 1,552 lines into one section is the cost). `docs/admin` edits load `cairn-writing-docs` and take the fact-checker.

## 2. R2, orphan lab scripts

**Done:** `check-interactive-contrast.mjs`, `check-touch-targets.mjs`, `live-probe-support.mjs` deleted by `dd18b1a05` ("Remove the rendered audit half and the norms query").

**Remains:**

| File | Lines | References |
|---|---|---|
| `scripts/lab/probe-vertical-alignment.mjs` | 1,754 | none outside itself and `vertical-metrics.ts:3`. Writes `docs/internal/2026-08-vertical-alignment-inventory.md` (`:77`), which isn't in the tree |
| `src/tests/lab/vertical-metrics.ts` | 1,620 | `vertical-metrics.test.ts:33`; `admin-design-system.md:1335`; comment at `src/tests/component/vertical-alignment-recipes.test.ts:6` |
| `src/tests/lab/vertical-metrics.test.ts` | not in `wc`; slim said 1,201 | run by `vitest.config.ts:95` `'src/tests/lab/**/*.test.ts',` |
| `scripts/lab/measure-status-inks.mjs` | 524 | none outside itself |
| `scripts/checks/measure-prose.mjs` | 132 | none outside itself |
| `tsx` | `package.json:278` `"tsx": "^4.23.15",` | only `probe-vertical-alignment.mjs:1,50,52`. `package-lock.json:9047`; `examples/showcase/package-lock.json:119` (the file-link's devDependencies), `:4543,:4577` (a peer of something else) |

Not references, leave: `check-package-files.mjs:233` and `check-package-files.test.ts:319,333,338` (`vertical-metrics` as a worked example, and a fixture path under `dist/audit`); `check-symbols.mjs:83` and `src/lib/render/highlight.ts:44` (`tsx` the language tag).

`admin-design-system.md:1335-1337` must be rewritten: "`src/tests/lab/vertical-metrics.ts` is the executable form of this table. It is lab apparatus\nrather than shipped engine code, and it stays the single definition: a test that measures alignment\nrestates these rules rather than inventing its own." It's in `.claude/skills`, so name it in pre-flight. `vitest.config.ts:95` loses a line and `src/tests/lab/` goes empty.

**File set:** the six paths, `vitest.config.ts`, `package.json`, `package-lock.json`, `examples/showcase/package-lock.json`, `.claude/skills/cairn-following-admin-design/references/admin-design-system.md`, `src/tests/component/vertical-alignment-recipes.test.ts` (comment).

**Size:** 25 minutes. Removing `tsx` needs a lockfile regen, so an install; collides with nothing but must precede pass 9's sweep.

## 3. R3

**Done:** `9f7db77d4` ("Print neutral SKIP titles and drop the render reference frames"). `git ls-files tool/docs/design/render-reference` lists exactly `tool/docs/design/render-reference/measurements.txt`, and `tool/docs` holds 15 tracked files. Readers intact: `tool/internal/render/glyph.go:44,73`, `glyph_test.go:54`, `width.go:8`, `tool/docs/adr/0002-render-dependencies.md:146`, `tool/docs/design/README.md:22`.

**Remains:** nothing. **Size:** 0.

## 4. R7, gate consolidation

| Gate | Lines | `package.json` | `gate-table.json` | `test.yml` | `close-prebuilt.mjs` | `gate-tier.mjs` | Test |
|---|---|---|---|---|---|---|---|
| `check-invisible-craft` | 116 | `:66` with package prefix | `:89` `["engine", "showcase"]` | `:97` | `:46` | `:107` | `check-invisible-craft.test.ts` imports `CSS_FILES, SCAN_SCOPE`; `audit-gate.test.ts:6` imports `ADMIN_SCOPE, CSS_FILES, SCAN_SCOPE`; `own-tree-and-guidance.test.ts:4` |
| `check-admin-css-classes` | 50 | `:67` with prefix | **absent from the table** (`:86-112` has no row) | `:98` | `:47` | `:108` | `audit-gate.test.ts:54` comment; `no-uncompiled-class.test.ts:32` comment |
| `check-tool-release` | 93 | `:46`, no prefix | none | none | none | none | `check-tool-release.test.ts` |
| `check-chassis-boundary` | 149 | `:63` | `:86` | `:94` | `:43` | `:104` | `check-chassis-boundary.test.ts`, `check-idioms.test.ts:57-59` (a string example) |
| `check-visuals` | 381 | `:55` with prefix | `:97` | via docs-gate | `:55` | | `check-visuals.test.ts`, `docs-gate.test.ts:26` |
| `check-admin-prose` | 302 | `:59` `check:prose` | `:101` | `:101` of the workflow | `:59`-ish in list | `:111` | `check-admin-prose.test.ts` |

Prose references to keep or repoint if a name goes: `admin-design-system.md:302,510`, `scripts/build/admin-css.input.css:20`, `scripts/checks/audit-gate.mjs:2`, `src/lib/audit/markup.ts:117`, `src/lib/audit/rules/static/motion-band.ts:1`, `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`.

### Each item

- **Fold invisible-craft and admin-css-classes.** Both already call `scopeReport` from `audit-gate.mjs`. They differ in config: invisible-craft uses `resolveConfig` with `SCAN_SCOPE`, `ADMIN_SCOPE`, `CSS_FILES`, palette files (`check-invisible-craft.mjs:89-99`), while admin-css-classes uses `loadConfig(ROOT)` (`:37`) because "This gate runs against the engine's tree with no cairn-audit.config.json". So "one `cairn-audit` call" needs one config that yields both; the invisible-craft config scans a wider scope for `no-uncompiled-class` than today. It's a behavior change, so prove identical findings. A folded script saves about 40 lines, not "wrappers" worth of 166; 80 of invisible-craft's 116 lines are the rationale comment and exported constants tests read. Set aside if the proof runs long.
- **Delete `check-tool-release`.** Its head says "Not wired into `check` or CI". `tool/v1.1.0` exists. Remove `package.json:46`, the script, its test. Cheap.
- **Narrow `check-chassis-boundary`.** `findChassisRoots` (`:32-39`) walks `examples/*`; `examples/` holds `cairn-theme` (only `cairn.css`, `README.md`) and `showcase`. `CANONICAL_SRC` already names it. Replace the walk with `[CANONICAL_SRC]`; check whether the test imports `findChassisRoots` before removing the export.
- **`INDEX_FILES`.** `check-visuals.mjs:33`: `const INDEX_FILES = ['docs/README.md', 'docs/why-cairn.md', 'docs/architecture.md'];`. `docs/README.md` is absent, confirmed. The same dead entry is at `transcript-blocks.mjs:30`, `check-leaks.mjs:194,490` and comment `:14`. Guarded by `existsSync` (`check-visuals.mjs:324`), so harmless. Slim's "repro half goes with E3" is void: the design keeps reproductions.
- **`check-admin-prose` yield.** CI: 0 failures of `check:prose` in the 120 retained failed `test.yml` runs (2026-08-01 on, see item 13). Local: not in the 6 labels of the one named close failure retained. It has a real job: it is the only guard on shipped admin copy. Keep it, per the sheet's "May set aside: R7's `check-admin-prose` question". Its test is more than 30 lines' worth of question only if a planner wants it; no change is the recommended default.

**File set:** `scripts/checks/check-tool-release.mjs`, `src/tests/unit/check-tool-release.test.ts`, `scripts/checks/check-chassis-boundary.mjs`, its test, `scripts/checks/check-visuals.mjs`, `scripts/checks/transcript-blocks.mjs`, `scripts/checks/check-leaks.mjs`, `package.json`; for the fold: `check-invisible-craft.mjs`, `check-admin-css-classes.mjs`, `audit-gate.mjs`, `close-prebuilt.mjs`, `gate-tier.mjs`, `gate-table.json`, `test.yml`, the three tests, `pass-gate-tiers.md`.

**Size:** 25 minutes without the fold, 50 with it.

## 5. R8, CI legs

### e2e shards

Exactly one shard exists. `e2e.yml:32`: `shardIndex: [1]`; `:34`: `SHARD_TOTAL: 1`. So #208's "Every retry was in e2e shard 1" carries no signal: there's no other shard. Report job `e2e-report` at `:214-255`, about 40 lines; `name: e2e report`.

To remove: the matrix and `strategy` block, `SHARD_TOTAL`, `--shard=...` on `:151`, `blob` from `--reporter=dot,blob,json`, the blob upload (`:201-208`), the `e2e-report` job, the comment `:17-24`, the `-${{ matrix.shardIndex }}` suffix on `:193`. Keep an HTML report by switching to `--reporter=dot,html,json`, which the regen step already does (`:163`); the existing failure upload carries `examples/showcase/playwright-report`. `name: e2e (shard ${{ matrix.shardIndex }})` becomes `e2e`.

Nothing outside `e2e.yml` reads job names: `git grep` finds no `e2e report` or `SHARD_TOTAL` elsewhere, and `.github/ci-green.json` keys on workflow files. `examples/showcase/.gitignore:12` and `emit-template.mjs:217` name `blob-report`; leave them. The sheet's "`test` and `e2e report` pending" wording changes in any watcher that greps; check `cairn-pass`'s CI watch. This is `.github/workflows`, so `runner`.

### Repeated `npm run package` in `test.yml`

Explicit: `:55` `- run: npm run package`, whose comment `:48-54` says later steps "each call it themselves". Plus `npm ci` runs `prepare`. Nine more steps with the `npm run package && ` prefix in `package.json`:

- `:87` `- run: npm run check:package`
- `:90` `- run: npm run check:audit-pack`
- `:91` `- run: npm run check:surface`
- `:92` `- run: npm run check:self-use`
- `:93` `- run: npm run check:custom-surface`
- `:97` `- run: npm run check:invisible-craft`
- `:98` `- run: npm run check:admin-css-classes`
- `:115` `- run: npm run check:consumers`
- `:127` `- run: npm run check:public-skill`

Slim's count holds. Fix: `close-prebuilt.mjs` already strips the prefix (`PACKAGE_PREFIX`, `:26`) and takes a label subset via `selectSteps(closeSteps(scripts), process.argv.slice(2))` (`:197`), but it reruns `buildDist` itself and runs to the end. Simplest for one workflow: replace the eight single-node scripts with `run: node scripts/checks/<name>.mjs` (`check-surface` is two: `check-surface-leaks.mjs` and `check-surface.mjs`), and leave `check:package` (a long shell chain at `package.json:37`) with its rebuild, so one rebuild remains, or inline it. `check:consumers` and `check:public-skill` run after the showcase install, unaffected. Any dist-mutating step between would matter; none exists: `:81-85` bakes under `packages/`.

### `scaffold.yml` beside `create-site.yml`

Sheet's dependency, #173's T6, is landed: `create-site.yml` at 404 lines has the install, dev probe, and console steps.

`scaffold.yml` (78 lines) does three things:

1. Packs both packages, the same as `create-site.yml:39-49`.
2. Emits via `scripts/build/emit-template.mjs` and runs install, check, build (`create-site.yml:207-214` already covers this on the baked tree, plus `check:cairn`, format, and unit).
3. Unique: the two dev-fold steps, "Assert the dev backend is eliminated from the emitted Worker's deployable bundle" and "Gate self-test: the markers ARE present in a flagged emitted build's deployable bundle". `create-site.yml` has no `dev-fold` step.

Folding means moving those two steps into `create-site.yml` with `working-directory: /tmp/ci-site`, after its build step, then deleting `scaffold.yml`. `emit-template.mjs` stays covered, since `bake-template.mjs:10` calls `emitTemplate`. Both run the build, so the flagged rebuild leaves `/tmp/ci-site` flagged; put it last or before the dev step with care, since `writePublicOrigin` and the rebuild at `:216-226` run on the same tree.

Readers of the name: `.github/ci-green.json:6` (`expected`), `src/tests/unit/workflow-yaml.test.ts:9,134`, `src/tests/unit/dev-fold-markers.test.ts:1`, `.github/workflows/create-site.yml:4,82`, `.claude/skills/cairn-writing-docs/evals/site-fixture.mjs:2`.

**File set:** `.github/workflows/{e2e,test,scaffold,create-site}.yml`, `.github/ci-green.json`, `src/tests/unit/workflow-yaml.test.ts`, `src/tests/unit/dev-fold-markers.test.ts`, `.claude/skills/cairn-writing-docs/evals/site-fixture.mjs`.

**Size:** 55 minutes: shards 15, package 15, scaffold 25. The sheet's first cut takes "R8's shard work", 15 minutes.

## 6. R9, ROADMAP

**Done:** nothing. Note `ROADMAP.md:213` already marks the item: "`migrate` wording is left to pass 8's R9."

### Index (2,644 lines, 223,094 bytes)

| Lines | Section | Size | Kind |
|---|---|---|---|
| 1-14 | Title and intro | 14 | Keep. `:3` "the latest published\nrelease is `0.98.0`"; `:12-13` states "this file stays a forward view" |
| 15-181 | `## Toward 1.0` | 167 | Forward plus standing rulings. `:61` etc. are the checklist |
| 182-222 | `### The pre-beta pass series, now the one-release path` | 41 | History; rewrite. Holds the wording fixes |
| 223-255 | `### The beta gate — DECIDED` | 33 | Rulings kept; from "The original decision framing, for the record:" on is history (`[x]` items) |
| 256-656 | `## Now` | 401 | Mostly open items, not "now". Stale title |
| 657-1994 | `## Next` | 1,338 | Open items with provenance |
| 1995-2452 | `## Later` | 458 | Same |
| 2453-2522 | `### Platform watch: Cloudflare` | 70 | Forward watch |
| 2523-2644 | `## Considering` | 122 | Forward |

Across 256-2644 there are 214 top-level bullets, largest 46 lines. Only 3 `- [x]` and 8 `- [ ]` exist in the whole file, so done-ness isn't marked. **Headings can't split history from forward.** Past-pass carry-overs by title include: `:263` "Docs content carried from the 2b close", `:299` "Theme identity pass A's carried items", `:432` "Four first-run defects in `create-cairn-site`", `:579` "The ambient-defaults audit: RUN 2026-08-03", `:682` "Repo tooling and docs-gate friction", `:1058` "The window after the cut", `:1174` "Items filed at Pass B1's close", `:1407`, `:1444`, `:1481`, `:1526`. Most state open items, so deletion loses filed work unless BACKLOG or code covers each. The design says "roadmap history", ruled "Reset all three". Reasonable task shape: one per-bullet sweep (keep, delete as done, or delete as covered by BACKLOG), with the 2,000 as a ceiling and not a target. R9 may not be set aside.

### `migrate` hits

Site-migration wording, to change:

- `:163` "A site rebuilt from the\ntemplate carries no migration burden" (true; keep).
- `:166` "are live, each break costs one migration per site again, so re-check this with Geoff when the first" (after rebuild, an upgrade; reword).
- `:188` "ruling ("Toward 1.0"), and no site migrates before the release, so the sites reach the release first"
- `:189` "and the beta follows their migrations."
- `:213` "`migrate` wording is left to pass 8's R9." (delete with the fix)
- `:220` "- **After the release and the site migrations:** the widened go-public pass, the dress rehearsal, and"
- `:1638`, `:1641` "aksailingclub migration" (history; reword if the bullet stays)
- `:1807` "the `cairn-pub` migration" (provenance)

Not site migration, leave: `:38`, `:40`, `:61` (migration notes), `:83`, `:648`, `:703`, `:711-713`, `:753`, `:1372-1379` (D1), `:1791`, `:1971` (code), `:2539`.

### `:190`, the dangling reference

`ROADMAP.md:189-191`: "Engine passes land on `main` and never release. The path, with\neach pass in its slot, is the sequence in `docs/STATUS.md`. "Release one" elsewhere in this file\nmeans the one release."

It dangles on `docs/STATUS.md`: STATUS no longer lists passes, only a pointer to the sheet at `:16-18`. The sheet lives in `~/.local/state`, outside the repo, so the fix states the sequence here or drops the claim.

"Release one" is used at `:98`, `:105`, `:110`, `:145`, `:184`, `:186`, `:190`, `:433` (8 lines), and all hinge on `:190`. These need rewording to "the release" or the first release, with `:96-111` also moved by the button ruling.

### Other wording

- xcathletes: `:161` "consumer site (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub) is to be" (drop it, it's retired; "all five sites" recurs near `:172`: "all five sites (the four consumer sites and cairn.pub)", check the count); `:1374` "The 2026-08-01 xcathletes seams pass closed this at the store" (history).
- "one release": `:182` heading "now the one-release path"; `:186` "**One release follows docs stage 5, and it is a `0.x` minor, the old "release one".**"; `:191`; `:652` "**After the one release:**".
- STATUS: no "the one release" hit. `docs/STATUS.md:14-16` already reads "then\nthe release, which is the first of several: 907.life's rebuild drives the next, and each later\nsite rebuild may drive its own. Every site rebuilds; none migrates." Only the ROADMAP needs the ledger's sequence. `BACKLOG.md:206` still says "the one release", outside this item. `:22` is stale.

The ledger ruling, `ledger.md:92`: "run the whole sheet first, that release is the first, 907.life's rebuild drives the next, each later rebuild may drive its own release. "The one release" wording changes in pass 8's ROADMAP and STATUS edit."

Also: `:97-111`, `:423-430` promise the button and template repo with the release; see item 10. `:152` onward carries P9 text; `:209-213` says the contract makes it readable by "the `cairn` tool's cross-site upgrade verb", and `:213` "ruled contract only, forward-only, and no verb"; fine.

**File set:** `ROADMAP.md`, `docs/STATUS.md` (`:22`, Evaluate line).

**Size:** 90 minutes with the sweep; 30 for wording alone. Not reorderable with R1 in any way that matters; do before R1 only because the sheet says R1 is last.

## 7. #207, the Evaluate re-cut

**Done:** filed at `BACKLOG.md:146-148`. **Remains:** all.

### The bar

`shared-standards` plan, deleted at `initiatives` `164b27c`; read at `164b27c~1:shared-standards/plans/2026-10-31-agent-first-plan.md`.

- Table, `:19`: "After the docs merge, a fresh session answers the fixed brief in task 4.13, and the judge sources every good-answer item to an allowed page on all three trials".
- Task 4.13 acceptance, `:834`: "Evaluate states all nine items on all trials, and the blind judge sources each to `README.md`, `docs/why-cairn.md`, `docs/architecture.md`, `CONTRIBUTING.md`, `docs/editors/**`, or `docs/admin/**`. No transcript fetches a `pre-agent-first` URL. Other reads are reported, not failing, since a fresh reader may open `package.json` or `CLAUDE.md`."
- Stop, `:192`: "After one structural fix, Evaluate reads unmet".
- Live spec: `~/Projects/initiatives/shared-standards/specs/2026-10-31-agent-first-pattern-design.md:107`: "**Evaluate.** A fresh session pointed at the public repo answers a fixed evaluation brief from the README and evaluator set without opening a removed path."

The ruling: `ledger.md:114`: "Cleanup round owes: state each item's core claim, grade `e2e/out/evaluate/trial-*.jsonl` blind, record the result, remove the rubric sentence; #196 stays there." The choice approved (`packet-pass-4-close.md`): "Re-cut it: a later round states core claims, grades these transcripts blind, and records the result".

### Items

The brief, `~/.local/state/cairn-agent-first/e2e/evaluate.sh`: "tell me: what it is and what it refuses to be; what an editor's day looks like; who owns what and how to leave; what it costs; how it handles sign-in and secrets; how a developer extends it and what stability they can count on; how it works with Claude Code and whether it follows Anthropic's practices; and how to contribute. Then say whether you would adopt it, and why."

`brief-map.md` numbers nine: 1 what it is, 2 editor's day, 3 ownership and leaving, 4 cost, 5 sign-in and secrets, 6 extending, tiers, stability, 7 Claude Code, the eval, no MCP, 8 contribute, 9 adopt or not, each with page and "Fact check". That column plus the "What is missing" column in `next-pass-design.md:110-124` is the raw material for core claims, but must not reach the judge: see below.

### The transcripts

`e2e/out/evaluate/trial-{1,2,3}.jsonl` under `~/.local/state/cairn-agent-first/`, not the repo (`git grep` and `.gitignore` have no `e2e/out`; the repo has no such directory). The relative path in BACKLOG and the ledger is state-dir-relative. Sizes 238,783, 252,444, 234,907 bytes; readable by all, owned by the container uid. `.err` files empty; `tags-*.txt` beside them. Each has one `result` event, `subtype: success`, with 1,246, 1,350, 1,354 words and 7, 7, 6 tool calls. They read commit `04c6036ac`.

The first run's transcripts were overwritten, per `next-pass-design.md:176`, so only this set grades. They read the docs of that commit, and later passes changed the pages; the bar's "source" half must grade against `04c6036ac`, not `main`.

### Grade blind needs

1. Core claims written first, without looking at per-trial answers, and committed or held before grading. One short testable claim per nine items.
2. A fresh agent (no state dir, no `next-pass-design.md`, `packet-pass-4-close.md`, ledger, or PR #170) given only the claims, each trial's final `result` text, and for sourcing the trial's tool output. Trial order shuffled and labeled neutrally.
3. It returns met or unmet per item per trial, with the quote, and the source page from the allowed list.
4. The `pre-agent-first` check, `grep pre-agent-first` over the tool uses. PR #170 reports none.
5. The prior non-blind result, which isn't evidence: "core claims are nine of nine, by the agent's own line" (`next-pass-design.md`).

The judge's original prompt wasn't found in the state dir, repo, or initiatives; write a new one.

Where it's recorded: the design says PR #170, which is merged. Use the cleanup PR's body, plus `docs/STATUS.md:26-28` ("Evaluate is unmet until its re-cut (`BACKLOG.md` #207)") and #207's closure.

### The rubric sentence

Inferred, not stated: no document quotes it. `next-pass-design.md:165` "Pass 4's close: the Evaluate bar, the plugin sentence, and removing the rubric sentence." `git grep -i rubric` hits only BACKLOG and the dictionary.

`docs/architecture.md:48`: "This section is where the security model is documented. The design assumes the likeliest attacker holds an editor's account, through a stolen or phished sign-in link."

Evidence: PR #170's review note, "Left as wording or placement, with no change: the meta sentence at the head of the architecture page's security section (it answers an Evaluate item)", and `next-pass-design.md` quoting that sentence among the rubric phrases. Commit `04c6036ac` added it. It serves the rubric and no reader. **Remove that one sentence.** `git show 04c6036ac -- docs/architecture.md README.md docs/why-cairn.md CONTRIBUTING.md` shows the other 04c6036 additions, which are content.

Grade first, or at least don't reference the current page: the trials predate it either way.

**File set:** `docs/architecture.md`, `BACKLOG.md`, `docs/STATUS.md`; one prompt under the job's own scratch space (no repo file).

**Size:** 45 minutes (dispatch of one blind judge on Sonnet or better). The owner of the claims should be the planner or implementer, the judge separate.

## 8. Ergonomics

### 1. `TEMPLATE_CLAUDE_MD`: remains

`packages/create-cairn-site/scripts/bake-template.mjs:149-154`:

```
const TEMPLATE_CLAUDE_MD = `@.claude/cairn/CLAUDE.md

# Your site

Add your project-specific guidance here; \`cairn-guidance install\` only ever refreshes the imported fragment above, never this file.
`;
```

Written at `:215`. Aliases in the fragment: `claude/CLAUDE.md` has no `#lib`, `#theme`, `#chassis`, or `$lib` hit. Real aliases at `examples/showcase/package.json:5-8`. Test: `bake-template.test.mjs:263` `assert.match(claudeMd, /# Your site/);` keep that heading. `templates/waymark/CLAUDE.md` is generated. Commands to name: `npm run check`, `npm run build`, `npm run check:cairn`, `npx cairn-manifest`.

**Files:** `bake-template.mjs`, `bake-template.test.mjs`, `templates/waymark/CLAUDE.md` (emit). **15 minutes.**

### 3. Engine narration: remains, with shifted lines

`examples/showcase/src/theme/cairn.config.ts` is now 269 lines (was 233). Marked with `cairn-template:exclude` at `:12-14`, `:155-185`, `:224-227`, `:247-249`, and `src/hooks.server.ts:22-27`. Unmarked and still emitted:

- `:73` "fallback, exercised deliberately without one in the engine's component tests)."
- `:86` "resolved page title linked to its permalink (the reference e2e pins the round-trip and the"
- `:89` "A many reference to other posts: array(reference) exercising the chip-list editor arm and"
- `:99-100` "A closed select exercising a brand-new v2 scalar arm end to end: the editor renders a\n<select>, the value round-trips through save and reload (the golden-path e2e pins it)."
- `:106-108` "A repeatable flat object: array(object) exercising the v2 container editor end to end. ... and the container e2e pins the add/reorder/remove and the save-and-reload round-trip."
- `:119` "A repeatable image: array(image) exercising the leaf-array editor arm, each row a hero-style"
- `:152` "finalize.mjs matches this line character for character (TEMPLATE_GITHUB_APP_LITERAL)" Keep the literal at `:154` byte-exact: `finalize.mjs:20,72`, `bake-template.test.mjs:57`. The comment can go in the emit, since a marker line above is safe, but `// prettier-ignore` at `:153` must stay adjacent.

`examples/showcase/vite.config.ts` (58 lines): `:40` "exists yet. This showcase's corpus now crosses that boundary and produces /archive/2,"; `:53-55` "The showcase consumes the engine through a file:../.. dist symlink. dedupe keeps Vite from\nresolving a second @sveltejs/kit instance (which breaks the engine's `instanceof Redirect`\ncheck), and fs.allow lets the dev server read the engine's dist client assets one level up."; `:56-57` the two settings.

`examples/showcase/tsconfig.json:9-13`: the "Two kit copies" comment; `:14` `"skipLibCheck": true`.

Demo fields, still emitted: `related`, `status`, `faq`, `gallery` (`:90`, `:101`, `:109`, `:121`). Fields are a light taste call per the audit; the e2e suite reaches them on the showcase. A marked block removes a field from the template while the showcase keeps it, but seed posts that set them, the emitted manifest, and any `create-site.yml` assertion must agree. Check before stripping; comments alone are the safe half.

Marker: `scripts/build/emit-template.mjs:38`, `stripMarkedBlocks`, line-based, works in any text file. `tsconfig.json` allows comments, so the marker works there. Dropping `resolve.dedupe` and `fs.allow` from the emit is unverified (ergonomics "Unverified"; a scaffold has no symlink). Run `create-site` CI to prove it.

**Files:** the three showcase files, `templates/waymark` (emit). **40 minutes.** Showcase edits trigger `check:template`.

### 7. Make-it-yours: remains

`SITE_README`, `bake-template.mjs:24-53`: sections "Run it locally" and "Build it" only. Home copy, `examples/showcase/src/routes/(site)/+page.svelte:53-55`: "The cairn showcase. You write in markdown and publish a static page that reads the way a\npublication should. Every entry below is the markdown you type, rendered by the surface your\nreaders see." `site.config.yaml:2`: `description: Trail reports and gear notes from the field.` `docs/admin/create-your-site.md:169` "Open the `Your site is live at` address. The starter site loads."

Dependencies to name: `the-trail-crew.md` page is an `author` reference target (`posts/2026-04-05-the-reading-surface.md`, `index.json`). After deletion, `npx cairn-manifest`. Router: `skills/cairn-extending-a-site/SKILL.md:30-46` table; `references/preflight.md` is a fit or a new reference.

Moving the home copy into `site.config.yaml`'s `description` changes the showcase home render, so `site-visual` baselines for home change unless the visible text is kept. Options: move the string to `description` with the showcase's value set to the current text (which then reads in feeds and SEO), or emit-only replacement. **Decide in plan; sheet says baselines stay as chosen, and a baseline regen uses the dispatch.** Also check e2e for the string: `grep "The cairn showcase"` before changing.

**Files:** `bake-template.mjs`, `bake-template.test.mjs`, `+page.svelte`, `site.config.yaml`, a skills reference, `SKILL.md`, `templates/waymark`. **30 minutes.**

### 8. `cairn doctor`: remains, and blocked as written

Scaffold's `templates/waymark/.github/workflows/check.yml` (source `examples/showcase/.github/workflows/check.yml`) has `npm run check`, `npm run check:cairn`, `npx cairn-guidance check` with `continue-on-error: true`. No doctor. Done-gate has none: `skills/cairn-building-admin-screens/SKILL.md:92-99`.

The audit's step: "`go run github.com/glw907/cairn-cms/tool/cmd/cairn@<tag> doctor .`, pinned at bake."

Tags: `tool/v1.0.0`, `tool/v1.0.1`, `tool/v1.1.0`. `tool/CHANGELOG.md:7`: "No `tool/v2.0.0` tag exists yet." `:74-75`: "`Consumers must:` upgrade to `v2` before running `cairn doctor` against a site that dropped\n`csrf: { checkOrigin: false }`, because `v1.1.0`'s doctor reports that site as failing and\nrecommends the line back." `examples/showcase/vite.config.ts` has no `checkOrigin` or `csrf` hit, so a scaffold is such a site and the only reachable tag fails it. `tool/go.mod:1` has no `/v2`, so the v2 tag itself needs a module-path change first (not run; this also stales `scaffold.mjs:249`, `bin.mjs:90`, `chapter2.mjs:950`'s `go install ...@latest`).

Options: a pseudo-version pin of `main` baked by hand; hold the `check.yml` step to after step 17; or add only the done-gate line. Recommendation: land only the done-gate line ("if `cairn` is on `PATH`, run `cairn doctor`") in pass 8, file the workflow step, and file the module path as a pass 9 item before step 17. Ergonomics 8 isn't on the sheet's may-set-aside list; this needs a line in `## Decisions`.

**Files:** `skills/cairn-building-admin-screens/SKILL.md`, `skills/cairn-extending-a-site/references/preflight.md`. **10 minutes** (25 with a workflow step).

### 10. Dev-backend smoke: remains

Done-gate at `SKILL.md:92-99` has two steps, no run-time check; insert a third. `create-site.yml:228-254` proves the shape: a healthy admin 307s, so `curl -sL` and check not `/admin/login`. Note `npm run dev` sets `CAIRN_DEV_BACKEND=1` (`scripts/dev.mjs` shim); a custom route under `/admin/...` answers 200 only with an access rule. Unverified: session permission rules for a background server.

**Files:** `skills/cairn-building-admin-screens/SKILL.md`, `guidance-hashes.json`, `templates/waymark/.claude/...` (emit). **10 minutes.**

### 11. Build output: remains

`examples/showcase/package.json:14`: `"build": "vite build",`. No `logLevel`, no `chunkSizeWarningLimit` in `vite.config.ts`. `gray-matter` is gone from `package.json`, so the `eval` warning should be too. Other consumers of build output: `create-site.yml` prints, transcripts frozen in `packages/create-cairn-site/test/fixtures/transcripts/01-create-cairn-site.txt:283,293` (leave; "Stale transcript block" answer). `--logLevel warn` hides "built in"; the audit's "print a one-line success" would be a `postbuild` echo.

**Files:** `examples/showcase/package.json`, `templates/waymark/package.json` (emit). **15 minutes.** May set aside.

### 12. `wrangler types --check`: remains, with a placement trap

`examples/showcase/package.json:20`: `"precheck": "npm run build:admin-css",`. Showcase has **no** `cf-typegen`: it's added at emit, `scripts/build/emit-template.mjs:185-199`, from the second line of `worker-configuration.d.ts`: `pkg.scripts = { ...pkg.scripts, 'cf-typegen': command };`. Result: `templates/waymark/package.json:25`: `"cf-typegen": "wrangler types --env-file=.dev.vars.example --include-runtime=false"`.

So `precheck` must be set at emit too, beside `:199`, not in the showcase, whose header names `--env-file=../../packages/create-cairn-site/template-repo/.dev.vars.example`. Unverified: whether `--check` catches a hand edit (audit), whether `--check` accepts `--env-file` that way. It needs `wrangler` on a fresh `npm install`; `create-site.yml`'s `npm run check` proves it. Note #173's `chapter` rewrites of `wrangler.jsonc` (`writePublicOrigin`, sender) may stale the hash: a scaffolded site's `npm run check` after setup would fail unless the setup reruns types. **Check before landing.**

**Files:** `scripts/build/emit-template.mjs`, its test, `templates/waymark/package.json`. **15 to 25 minutes.** May set aside.

### 14. `custom-screen.md` viewer: remains

`skills/cairn-building-admin-screens/references/custom-screen.md:59`: `  requireAccess(event);`, in the load at `:55-67`. `src/lib/sveltekit/guard.ts:533`: `export function requireAccess(event: CairnEvent, target?: string): Editor {`. Change to `const editor = requireAccess(event);`, return a field, show the owner-only control. Snippet is `snippet-check-skip` (`:50`), so not compiled. `Editor.role` per `requireAccess` is the shape; `#196` edits the same skill.

**Files:** `custom-screen.md`, `guidance-hashes.json`, emit. **10 minutes.** May set aside.

### 20's worked case: remains, premise moved

`#45` closed `[x]` (`BACKLOG.md:634-636`): "Done: `feedItemsFrom` throws when the `posts` concept is absent". It took the throw, not "take the concept id". `examples/showcase/src/chassis/feed-items.ts:30`: `const posts = site.concept('posts');`, `:44` `posts.all().map`, `:50` `posts.byId(p.id)!.body`. `FeedSource` (`:13-18`) has no concept id. `skills/cairn-extending-a-site/references/public-routes.md:76-78`: "Feeds: map `posts.all()` to `FeedItem`s (render bodies with an origin-prefixing link resolver from\n`createLinkResolver(site)`), return `buildRssResponse(channel, items)` or `buildJsonFeedResponse`, and set\n`feeds` in the config so entry heads link them."

A worked case in the reference can show merging `feedItemsFrom` calls only if the helper takes a concept id. Adding `concept = 'posts'` to `FeedSource` is one optional field; `feed-items.test.ts` covers it. Sheet scope says "20's worked case", so the doc half; the option is the small helper change the audit asks for.

**Files:** `feed-items.ts`, `feed-items.test.ts`, `public-routes.md`, emit. **15 minutes.**

### 22: done

`src/lib/guidance/check.ts:2`: "each judged PASS or FIX, plus a recommendation block that never gates."; `:269` "True when `--strict` should exit 1: any line reports FIX."; `:284-289` renders `${line.ok ? 'PASS' : 'FIX '}`; `bin.ts:156` `if (args.strict && hasFixes(report)) {`. Landed by `b9ea4e3dd`. **0.**

## 9. `/styleguide`

**Today.** Route `examples/showcase/src/routes/(site)/styleguide/` with `+page.server.ts`, `+page.svelte`, `load.test.ts`. `+page.server.ts:9`: `export const prerender = true;`. `.cairn-template.json` has no styleguide entry and no `cairn-template:exclude` touches it, so `templates/waymark/src/routes/(site)/styleguide/` and every scaffold carry all three. Linked from `examples/showcase/src/theme/site.config.yaml:7-8`:

```
    - label: Styleguide
      url: /styleguide
```

Prerendered by the crawl, published as static HTML. Sitemap: `routes/sitemap.xml/+server.ts:14` passes `['/']` as the only extra path, so `/styleguide` isn't in the sitemap. `robots` not relevant.

**Readers.**

- Tests on the showcase: `site-visual.spec.ts:61-67,165-170` (10 baselines `styleguide-*`, `VIEWPORT_WIDTHS` at `:23`), `styleguide.spec.ts`, `islands.spec.ts:13,22,33,42`, `public-theme-equivalence.spec.ts:52,243,264`, `starter-outline-pin.spec.ts:40`, `masthead-responsive.spec.ts:5`, `e2e/fixtures/public-theme-computed.json`. `gate-table.json:166,177,182,215,272`. `design.yml:72`. All keep working: the showcase keeps it.
- **On the emitted template: `scripts/lab/theme-fixture.mjs:16,81` `const PAGES = ['/', '/posts/the-reading-surface', '/styleguide'];`, plus `theme-fixture-e2e/theme-fixture.spec.ts:15,45`.** The `template` arm builds an emit (`:332`) and loads `PAGES`, and `design.yml:68` runs it on CI. It must skip `/styleguide` on that arm.
- `create-site.yml:96-200` leftover checks list `e2e`, `playwright.config.ts`, `src/routes/probe-craft`. Add the styleguide path to prove the exclusion.
- Docs: `skills/cairn-styling-public-pages/references/checking-a-theme.md:113` "`/styleguide` on a scaffolded site renders the\ntype scale and each directive against the current `theme.css`."; `references/directive-alert.md:3` and likely sibling directive pages ("the editor palette and the style..."; grep them); `examples/showcase/src/chassis/README.md:62,191,196,261` (emitted; "`sg-*` is the styleguide route's demo classes"); `prose.css:149,681,683`, `composition.css:75`, `markdown-blocks.ts:92,234` comments (emitted). `.claude/skills/cairn-following-public-design/references/public-design-system.md` is about the engine; leave.
- Fixture: `test/fixtures/transcripts/01-create-cairn-site.txt:283,293`: leave for the recapture, listed.

**Smallest change.**

1. Add `"src/routes/(site)/styleguide"` to `examples/showcase/.cairn-template.json`'s `exclude` (`isExcluded` matches the directory, `emit-template.mjs:103-106`). Exclusion takes it out of dev as well as production. The design says "take `/styleguide` out of production", and a developer on a fresh site would lose `checking-a-theme.md`'s check; the alternative, a `+page.server.ts` guard, is more code and worse. Say so in `## Decisions`, and repoint that skill line at the showcase or drop it.
2. Strip the two nav lines with a `# cairn-template:exclude-start/-end` pair in `site.config.yaml`. `stripMarkedBlocks` works on any text file by `line.includes`. Without this, the crawler hits a 404 and `handleHttpError` throws (`vite.config.ts:33-35`), which fails every scaffold build. **Confirm no bake or `/admin/nav` code rejects a comment in the YAML; the file already has `#` comments at `:10-11`.**
3. `theme-fixture.mjs`: arm-specific `PAGES`.
4. `npm run emit:template`, which deletes the three template files.
5. Add the path to `create-site.yml`'s leftover list.

**Files:** `examples/showcase/.cairn-template.json`, `examples/showcase/src/theme/site.config.yaml`, `scripts/lab/theme-fixture.mjs`, `scripts/lab/theme-fixture-e2e/theme-fixture.spec.ts` (if it runs on the template arm), `.github/workflows/create-site.yml`, `skills/cairn-styling-public-pages/references/checking-a-theme.md` and directive pages, `templates/waymark` (emit), `guidance-hashes.json`.

**Size:** 30 minutes. Baselines: showcase unchanged, so none regenerate.

## 10. Template-repo notice

Path: `packages/create-cairn-site/template-repo/README.md`, the overlay (`emit-template-dir.mjs:29`), emitted to `templates/waymark/README.md`.

`:1`: `# cairn Waymark template (generated, pre-release)`

`:7-10`: "It lives at `templates/waymark/` rather than in a separate repository because Cloudflare's\nDeploy button and C3's `--template` both accept a subdirectory. Cloudflare treats that\nsubdirectory as the root of the repository it creates for a user, and requires the application be\nfully isolated within it, which is why this directory sits outside the root `package.json`'s"

`:14-15`: "This template is pre-release. The Deploy button, the completion checklist, and the rest of\nthis file's user-facing content land once the button flow has been verified live."

`:17-24`: `<!-- WATCH: this notice comes off when `create-cairn-site` publishes, not at the next engine release. ... Retire it in the same change that publishes the tool. The button URL this file will carry points at the subdirectory, ...`

The promise is `:14-15`, and the WATCH at `:17-21` ties it to publish. The button moved after the release (Brief, "Tag the tool at the stable cut, and move the button and template repo to after the release (recommended)"; `ledger.md:96` approved all but one). So `:14-15` becomes a statement with no promise; `:1` "pre-release" stops being true at stable; the WATCH retargets.

Others that order the old retirement, and must agree:

- `.claude/skills/cairn-releasing/SKILL.md:191-193`: "Once the package publishes, retire the template repository's pre-release\nnotice in the same change: the opening of `packages/create-cairn-site/template-repo/README.md` and the\n`WATCH` comment on it."
- `ROADMAP.md:423-430`: "**The template repo's pre-release notice comes off when `create-cairn-site` publishes.** ... Retire both in the change that publishes the tool."
- `ROADMAP.md:97-111`.

Pass 9's steps have no notice step, so the skill's order would be missed or fight the reword. `git grep` finds no test on the text.

**Files:** `packages/create-cairn-site/template-repo/README.md`, `templates/waymark/README.md` (emit), `.claude/skills/cairn-releasing/SKILL.md`, `ROADMAP.md`. **10 minutes.**

## 11. Ledger rulings

**`--yes`.** `ledger.md:92`: "`--yes` skips Builds after an email decline, a doc names the manual path (pass 8)". Source, `packet-scaffold-setup.md:42-51`: "A `--yes` run shouldn't end a choice its owner never made."; "A `--yes` run that declines email still connects Builds in the same run, which ends the email offer for good. There is no path back to turning email on after Builds connects." Choice: "`--yes` skips Builds after an email decline, and a doc names the manual path: pass 8 does it". So code and doc.

Code today, `packages/create-cairn-site/src/cloudflare/chapter3.mjs:938-943`:

```js
    await runStep(frame, 'Connect to Workers Builds', ADMISSION_DETAIL, async () => {
      log(ADMISSION_DETAIL);
      if (args.yes) {
        consented = true;
        return;
      }
```

Decline path, `chapter2.mjs:436-441`: logs "Skipping email sign-in: --yes was given with no --email. Re-run with --email to turn ' + 'it on unattended, or without --yes to be asked." The decline's record: `chapter2.mjs:827-834`, `cloudflare: { emailDeclinedAt: new Date().toISOString() }`. Predicate exists: `chapter2.mjs:144-148` `hasOpenEmailDecline(record)`, already imported by `bin.mjs:15`.

The change: in chapter 3's admission, `args.yes` with `hasOpenEmailDecline(record)` and no `args.connect` skips Builds without consenting, logging the same way. `--connect` is an explicit opt-in, so it should still connect; confirm against `alreadyAdmitted` (`:930-933`) and the `CHAPTER3` module doc (`:682`, `:722`). Don't write `builds-connect-declined` for a skip that was never answered unless a resume needs it: `hasOpenEmailDecline` and `bin.mjs:276,291` read that step, and `buildsDeclinedAt` restores it. Tests: `test/email-reoffer.test.mjs:208-349`, `chapter3` tests. `bin.mjs:227-232`'s "it will not ask again" line stays for interactive.

Docs that state the old behavior and name no manual path:

- `packages/create-cairn-site/README.md:269-271`: "it, so turn sign-in email on first. `--yes` consents to the Builds chapter, so a `--yes` run\nwithout `--email` declines email and connects Builds in the same run."
- `packages/create-cairn-site/README.md:307-311`: "`--yes` alone consents to this one rather than skipping it,".
- `docs/admin/own-your-domain.md:87`: "A later run from a terminal asks again, until you connect Workers Builds. Once Builds is connected, the command no longer offers sign-in email, so turn it on before you connect Builds. A run that can't ask, such as `--yes` wi..." (read the rest).
- `docs/admin/setup-recovery.md:72`: "**Wait:** nothing needs fixing. A later run from a terminal asks again, until you connect Workers Builds. After that, the command no longer offers it. For an unattended run, pass `--email` and `--yes`."
- `docs/admin/setup-recovery.md:83`: "| You declined Workers Builds | Nothing is wrong. Deploys still go through the setup command. | **Act when you're ready:** run the command again with `--connect`. |"

**Which doc:** `docs/admin/setup-recovery.md:72` (the stop table) carries the manual path: once `--yes` skipped Builds, a run with `--connect` connects it, and a terminal run or `--email --yes` turns on email first. `own-your-domain.md:87` takes the sentence on what `--yes` does. "Manual path" means turning email on before Builds, since after Builds no path exists; the planner should say so. `check:transcripts` may quote the skip line.

**File set:** `chapter3.mjs`, its test, `test/email-reoffer.test.mjs`, `README.md` (package), `docs/admin/setup-recovery.md`, `docs/admin/own-your-domain.md`. Load `cairn-writing-docs`; fact-check. **Size:** 40 minutes.

**"The one release" wording:** item 6.

## 12. R6's measure

All eight exist, all under `src/tests/unit/`, all in vitest project `unit` (`vitest.config.ts:93-96`, not in the `unit-dist-spawn` include list). Line counts drifted from slim:

| File | Lines (slim) |
|---|---|
| `root-barrel-prune.test.ts` | 223 (220) |
| `delivery-media-vite-barrel-prune.test.ts` | 183 (192) |
| `sveltekit-barrel-prune.test.ts` | 163 (138) |
| `admin-barrel-prune.test.ts` | 75 (72) |
| `retires-task2-sanctioned-leak-replacements.test.ts` | 140 |
| `sveltekit-mount-contract-reshape.test.ts` | 117 (119) |
| `status-chip-register-tuning.test.ts` | 203 (204) |
| `status-chip-register-parity.test.ts` | 71 |

Total 1,175 (slim 1,156).

**Provider.** `vitest` is pinned `4.1.11` in the lockfile (`package.json:282` `^4.1.11`). `@vitest/coverage-v8@4.1.11` exists; `npm view` gives peers `vitest: 4.1.11`, `@vitest/browser: 4.1.11`, both matched in the lock. Not yet a dependency; no `coverage` config or script.

**Throwaway install.** Run in a scratch clone, not the worktree. `npm ci`, then `npm install --no-save --no-package-lock @vitest/coverage-v8@4.1.11`. `--no-save` leaves `package.json` and the lockfile alone; `--no-package-lock` guards the lockfile. Confirm with `git status`. This worktree has no `node_modules`.

**Invocation** (not run; flags from Vitest's CLI):

```
npx vitest run --project unit --coverage.enabled --coverage.provider=v8 \
  --coverage.include='src/lib/**' --coverage.reporter=json-summary --coverage.reportsDirectory=<out> \
  --reporter=json --outputFile=<times>.json [--exclude src/tests/unit/<file>]
```

Coverage options must sit at the root of a multi-project run, so CLI flags fit; `--project unit` limits it. `dist`-reading unit tests need `npm run package` first (`prepare` runs on `npm ci`).

**Projects each file needs.** `unit` only, for all eight. A delta of zero in `unit` proves nothing lost only among `unit`; since excluding a file can't lose coverage from another project, and adding projects can only shrink a delta, zero under `unit` means zero overall. A non-zero delta needs a rerun that also counts `component` and `integration` to see if another project covers those branches.

**Browser and workers.**

- `component` (Vitest browser mode, Playwright, Chromium, `vitest.config.ts:196-211`): V8 coverage is supported in Chromium through CDP, and the install's `@vitest/browser` peer is met. It's the same flags. Heavier, and it has `retry: 2`.
- `integration` (`@cloudflare/vitest-plugin`, workerd): V8 coverage doesn't work inside workerd per Cloudflare's docs from memory; unverified here. Only needed if a delta names a branch reachable there; use `@vitest/coverage-istanbul@4.1.11` in that case.

**Run shape.** Nine runs: baseline, and one without each. Cost per file comes from the `--reporter=json` times, not coverage overhead (run a clean timing, since instrumentation inflates). `unit` was about 151 s for node projects at the audit; expect more with coverage. **Clock:** 9 × 4 to 5 minutes, about 45 minutes unattended, serialize through `cairn-run-gate`. Plus 15 to write the table. Redundancy check: `status-chip-register-*` are design tests and `retires-task2` is compile-only `expect(true).toBe(true)` per slim; coverage alone won't see a type-level check. Note `check:surface` as the barrel tests' duplicate.

The table is the output: file, lines, seconds, branch delta, uniquely covered branches, recommendation. Retirements aren't in this PR (sheet). Geoff reads it at the release sitting.

**File set:** none in the repo. Table in the PR and release packet. **Size:** 60 minutes, mostly waiting.

## 13. Gates that never fired

| Gate | Lines | `package.json` | `test.yml` | `gate-table.json` | Test |
|---|---|---|---|---|---|
| `check-custom-surface` | 226 | `:62` prefix | `:93` | `:85` | `check-custom-surface.test.ts` |
| `check-cm-internals` | 76 | `:64` | `:95` | `:87` | `check-cm-internals.test.ts` |
| `check-idioms` | 525 | `:65` | `:96` | `:88` | `check-idioms.test.ts`, `scripts/checks/fixtures/idioms/` |
| `check-rulings-format` | 89 | `:48` | `:99` | `:93` | `check-rulings-format.test.ts` |
| `check-tool-heuristics` | 91 | `:45` | `:144` | `:112`, extra `:119` | `check-tool-heuristics.test.ts` |
| `check-public-skill` | 542 | `:61` prefix | `:127` | `:108` | `check-public-skill.test.ts` |
| `check-audit-pack` | 260 | `:38` prefix | `:90` | `:79` | **no test file** |
| `check-consumers` | 70 | `:74` prefix | `:115` | `:83` | **no test file** |

All eight are in `CLOSE_COMPONENTS` (`close-prebuilt.mjs:37-67`) and `gate-tier.mjs:101-121`.

### What exists to measure

1. **CI failures.** `gh run list --workflow test.yml --status failure --limit 120` then per-run `gh run view --json jobs`. Measured now, 120 runs reaching back to 2026-08-01, 0 errors. Failing steps:

   27 node test projects; 25 `npm test`; 9 `check:docs-gate`; 8 create-cairn-site test; 8 `check:template`; 7 bounded-install; 4 `check:surface`; 4 showcase `format:check`; 3 `check:self-use`; 3 `check:dev-package`; 3 `check:facts`; 2 `check`; 2 `check:target-stack`; 2 `check:arm-indexes`; 1 `check:package`; 1 Vale install; 1 `npm ci`; 1 `check:snippets`.

   **None of the eight appears.** But the first failing step stops the job, so a later gate doesn't run on that run; the eight sit after many others. A zero is weak for gates at `:115`, `:127`, `:144`. Retention is short for older runs' logs; step conclusions survive.

2. **Local close failures.** Per-run logs at `${TMPDIR:-/tmp}/cairn-gate-<uid>/<key>/gate.log` (152 keys, dated 2026-11-01 and 2026-11-02; overwritten per key and gone on reboot, so **no history**). `close-prebuilt.mjs` prints "`check:close: N check(s) failed: <labels>`". 73 logs carry a `check:close:` line; one names failures: `check:idioms, check:consumers, npm --prefix examples/showcase run check, npm --prefix examples/showcase run check:cairn, npm --prefix examples/showcase run format:check, check:public-skill`. That cluster is a missing showcase install, not a defect, plus `check:idioms`, which may be real. Read that log before it's lost.

3. **Run records.** `~/.local/state/cairn-run-gate/runs.jsonl`, 3,394 lines since 2026-10-13. `kind: "gate"` rows carry `gate` (the string), `exit`, `outcome`, `head`, `tree`, `toplevel`, `branch`; 1,396 for cairn-cms (944 ok, 452 not). `cairn-run-gate --records <toplevel> <branch>` prints only sums of time and waits (see `gate-records.txt`), not per-gate failures. Rows that name a gate: public-skill 59/21 failed, rulings-format 54/19, idioms 49/16, cm-internals 48/16, custom-surface 47/15, consumers 46/15, tool-heuristics 46/14, audit-pack 42/15. **These don't measure the named gate:** the strings are whole lanes that merely include the name, and the 30 percent failure rate is the lane's. No per-component record exists, and the row has no log pointer. Worth a `## Tooling` line: record the failed labels in the run record, which would make the next read real.

4. **What can't be measured:** a pre-push fix. The fast lane catches a failure, the agent fixes it, and only the lane's exit remains; and a gate that deters by being known never fires. So a zero never proves zero yield, as slim said.

**So what measures keep-or-go is the cheapest honest pair: (a) can it still fire, by fault injection, and (b) has it fired at all in the three sources above.** A gate that can fire and has fired stays with no argument. One that can fire and never fired gets a cost column (seconds per close from "`== seconds per check ==`", lines of script and test) and goes to the sitting. One that can't fire is a defect.

### Fault injection

In a scratch clone with an install and `npm run package`. Each is one edit, one run, one revert; a non-zero exit and a named finding is the pass.

| Gate | Cheapest injection | Run |
|---|---|---|
| `check-custom-surface` | add one unlayered rule to `src/lib/admin/cairn-admin.css` | `node scripts/checks/check-custom-surface.mjs` |
| `check-cm-internals` | add `'.cm-panels': {}` to the editor's `EditorView.theme` keys | `npm run check:cm-internals` |
| `check-idioms` | a tab-indented line in a `scripts/checks/*.mjs`, or `process.exit(1)` there | `npm run check:idioms` |
| `check-rulings-format` | delete one reopen line in `docs/internal/engine-rulings.md` | `npm run check:rulings-format` |
| `check-tool-heuristics` | rename one watched literal at a `// WATCH: check:tool-heuristics` site in `src/lib` | `npm run check:tool-heuristics` |
| `check-public-skill` | delete one page of `skills/cairn-styling-public-pages`, or add a nonsense class to a snippet | `npm run check:public-skill` (needs the showcase install) |
| `check-audit-pack` | move `culori` from `dependencies` to `devDependencies`, per its header | `npm run check:audit-pack` (needs the registry) |
| `check-consumers` | rename an export the showcase imports | `npm run check:consumers` |

Existing tests prove six can fire against fixtures already (`check-idioms.test.ts` with `fixtures/idioms`, and the rest by name), which is a cheaper "(a)" with no run at all: read each test for a red case against the real input path. Audit-pack and consumers have no test, so they're the two that need a real injection.

**File set:** none in the repo. Table in the PR and packet; no gate is removed here (sheet: read at the sitting). **Size:** 45 minutes, about 8 minutes per injected gate where a run is needed, mostly `check-audit-pack` and `check-consumers`.

## Sizes

| Item | Minutes |
|---|---|
| R1 | 90 |
| R2 | 25 |
| R3 | 0 |
| R7 | 25 (50 with the fold) |
| R8 | 55 |
| R9 | 90 (30 wording only) |
| #207 | 45 |
| Ergonomics 1, 3, 7 | 15, 40, 30 |
| Ergonomics 8, 10, 11, 12, 14, 20, 22 | 10, 10, 15, 20, 10, 15, 0 |
| `/styleguide` | 30 |
| Template notice | 10 |
| `--yes` | 40 |
| R6 measure | 60 |
| Gates read | 45 |
| **Total** | **about 690** (715 with the fold), before the BACKLOG items, the sweep, and fix rounds |

Overlap with `p2-p4` wasn't read: its plan is on `worktree-p2-p4`. `create-site.yml`, `CHANGELOG.md`, `MIGRATION-NOTES.md`, and showcase files are the likely collisions.
