# Pass foundation-3: record

Initiative: theme-garden
Round: foundation
Pass: 3 of 6, `foundation-3` (record), class `auth-data` (raised from `ordinary`, Decisions 1),
base `604b4596d`, branch `foundation-3`

Design: `~/Projects/initiatives/theme-garden/specs/2026-11-15-foundation-design.md` ("Calls made
here", "The site record", "The public origin is stated twice", "How it fails", "Passes" row 3,
"Acceptance", "Standing answers"). Approved by Geoff in queue document `20261115-223648-1d48b9`
(2026-11-15). Earlier passes in this round: pass 1 (PR #256) and pass 2 (PR #257). Neither body
carries an `[advisor]` line, so this plan builds on no flagged choice.

Outcome: A site has `cairn-site.json` at its root, checked by `schema/cairn-site-1.schema.json`.
`cairn.config.ts` imports it, the Go tool writes it once, and the tool rewrites no TypeScript
source. `docs/admin/` has one reference page for the record.

Planned path: 215 minutes against the design's 110 (parking ceiling 220, standing answer 20). See
"Path".

Scope premise (`cairn-judging-scope`): the record holds facts that have no other home, and it
moves values the tool already writes out of TypeScript source into one file the developer owns.
It adds no engine export, no actor, and no runtime surface. The build-time check is the site's
own code (Decisions 4). `grep -n "^## " docs/internal/engine-rulings.md | grep -i "record\|cairn-site"`
prints nothing. The premise holds.

## Pre-flight

Permissions checked: read `~/.local/state/claude-denials.jsonl` on 2026-11-16. The log holds 114
rows, from 2026-11-01T00:55:05Z to 2026-11-17T02:59:42Z, all inside the 30-day window, 43 of them
in cairn-cms. Two rows are new since foundation-2's plan: an Unauthorized Access grep of another
project's transcripts (2026-11-16, not this repo), and `claude --bg ... --name conductor-foundation`
refused as "Classifier unavailable" (2026-11-17, transient). Rows that touch this pass's commands,
with the form to use instead:

| Refused form (date, class) | This pass uses |
| --- | --- |
| The setup command piped to `tail` and chained with `ls` (2026-11-14, Destructive or Unwanted Actions) | The setup command alone and bare: `npm ci && npm ci --prefix examples/showcase && (cd examples/showcase && npx svelte-kit sync)` |
| `pkill -f 'lane:fast'`, `kill <pid>` of test runs (Interfere With Workloads, 2026-11-01 and 2026-11-15) | Never kill a process. A server a script starts is stopped by that script, or by `TaskStop` |
| `claude stop` chained with other commands (2026-11-10, 2026-11-13, 2026-11-16) | `claude stop <id>` alone, only for a job this session launched |
| `git push origin HEAD:main` (Modify Shared Resources) | Push only `foundation-3`: `git push -u origin foundation-3` |
| `git push origin --delete <branch>`, `git reset --hard` in a shared checkout (Git Destructive) | No remote branch is deleted. No `git reset --hard` outside the scaffold's own Go code under test. Set work aside with a WIP commit, never a bare `git stash` |
| `gh pr merge` chained with `gh pr view` (Merge Without Review) | Never `gh pr merge`. `conductor-foundation` lands the PR through the round's close packet |
| Edits to `settings.json` (Self-Modification) | The pass writes no Claude settings file |
| A write to the secret store (Secret-Store Writes, 2026-11) | The pass writes no secret. The no-secret test reads the e2e build's file keyring under a temp folder |
| Classifier unavailable (transient) | Retry the same command once, bare and alone |

Reviewed: one `standards:plan-reviewer` read on 2026-11-16 (Opus, medium), with `planner.md`
"Stops" and "Pre-flight" added to its prompt. It returned 1 blocker, 8 majors, and 8 minors, all
folded (see "Review folded"). The `auth-data` close adds one `standards:web-auth-security-reviewer`
read (Task 9).

Evidence: the mechanism table and the recorded searches below.

Geoff steps: none. The pass needs no credential, no secret, no sign-in, and no permission rule.
Values the run needs: none from any store. Writes read against auto mode: files in the pass
worktree, commits and a push to `foundation-3`, and one draft PR. No write to Claude's settings, a
credential file, or new public surface (no publish, no deploy, no version bump, no workflow
dispatch). The launch runs from the main checkout, which sessions have opened before, so no
workspace trust prompt.

## Mechanism table

Read at `604b4596d`.

| Mechanism | Probe or source | Result |
| --- | --- | --- |
| The five expressions | `git grep -c "descriptionLineRE\|emailFromRE\|publicOriginTSRE\|githubAppRE\|publicOriginJSONRE" -- tool/internal/setup/scaffold/substitute.go` prints `11`. Declared at `substitute.go:185`, `:217`, `:218`, `:220`, `:259` | All five go (Task 2). The acceptance's "no regular expression that matches a `.ts` file" also retires the `aiPostureComment` and `githubAppTemplate` exact swaps in `editCairnConfig` (`:232-250`), since the tool stops opening `cairn.config.ts` at all |
| What each pass can write | `substitute.go:99` `firstPass`, `:100` `secondPass` (`editCairnConfig`, `editWrangler`). `scaffold.go:64-104`: `Write` runs `firstPass` after `Site.validate(false)`, `Finalize` runs `secondPass` after `validate(true)`. `validate` (`substitute.go:58-93`) skips only `DatabaseID` when `needDB` is false, so the address, sender, posture, and all five GitHub values are checked and real at the first pass. `engineVersion` reaches only the first pass (`scaffold.go:210`, `:233-236`) | The record edit lands in `firstPass`, a move from the second pass, since the first pass alone has the engine version. The second pass writes the record's `deploy` again through the same writer, which leaves the file byte-identical unless the App changed between the passes (Decisions 3) |
| When the App ids exist | `approvals.go:185` sets `IDs.AppID` in the approvals, before the watch's scaffold step (`watch.go:35`, `:104`). `InstallationID` can be 0 at the first write | As today, `UpdateInstallation` brings the installation id current later |
| The App identity's later rewrite | `scaffold.go:111` `SettingsFile()` returns `targets.CairnConfig`; `:115-121` `NamesApp` checks `strings.Contains` on `git show <commit>:src/site/cairn.config.ts`; `:129-154` `UpdateInstallation` runs `editInstallation`, then `commitFile(targets.CairnConfig)` at `:147`, restoring the file at `:150` on failure. Callers in `deploy.go`: `pendingCommit` at `:133` (requires `changed == file`), `followInstallation` at `:177` (`NamesApp` at `:181`), `installationCommit` at `:234` (`NamesApp` and `UpdateInstallation` at `:238-244`) | `SettingsFile()` returns `cairn-site.json`. `NamesApp` decodes the record at the commit and compares the five GitHub fields. `UpdateInstallation` writes `deploy.github.installationId` through the writer and commits `cairn-site.json` alone, so `pendingCommit`'s `changed == file` rule holds |
| The fakes that model the settings file | `tool/internal/setup/runner_fakes_test.go:1325-1360` (`const siteConfig = "src/site/cairn.config.ts"`, `appLiteral`, a finalize fake that writes `export const github = ...`); `runner_test.go:2150-2158` (`configAt`, `namesInstall` on `"installationId: '"+id+"' })"`, used at `:2174` and `:2209`) | Both are `runner*` files, which the path map classes `auth-data`. They move to the record (Task 2). This is the class rise (Decisions 1) |
| The site description | `substitute.go:185` `descriptionLineRE`, `:197` replaces the line with `"description: " + quote(neutralDescription)`, then a duplicate-key check through `topDescriptionRE`. A probe on 2026-11-16 round-tripped `templates/waymark/src/site/site.config.yaml` through `go.yaml.in/yaml/v3` (`tool/go.mod:20`, a direct require): the encoder re-indented 16 comment lines | The description is set by structure without re-encoding: decode to a `yaml.Node`, find the top-level `description` key's value node, and replace that scalar's text at its `Line` and `Column` (the probe printed line 2, column 14, plain style). The site name keeps its exact `siteName: Waymark` swap, which is a key edit already |
| `PUBLIC_ORIGIN` | `substitute.go:259` `publicOriginJSONRE`, applied at `:278`; the template's line is `templates/waymark/wrangler.jsonc:43` `"PUBLIC_ORIGIN": "http://localhost:4173"`. The doctor's JSONC reader is `doctor.NewSnapshot` with the exported `ReadWranglerConfig`; `stripJsonc` and `factsFromJsonc` are unexported | `replaceExact` on the template's whole key-value text, which fails when that text is absent. No JSONC encoder is in `go.mod` (outside the row) and the template's comments must survive (Decisions 6). The scaffold imports nothing from the doctor; Task 6's e2e reads the written `wrangler.jsonc` back through `ReadWranglerConfig` and asserts the var equals the record |
| The posture's second home | `editSiteFacts` (first pass) writes `aiPosture` into `src/content/.cairn/site-facts.json`. The engine's build compares that file byte for byte with the adapter's facts: `src/lib/vite/internal.ts:601-610` builds the facts from `cairn?.aiPosture`, and `:336-348` fails `buildStart` when stale | `editSiteFacts` stays. With `cairn.config.ts` reading `aiPosture` from the record, the record and `site-facts.json` must agree, so any test that changes the posture in the record also rewrites the facts with the `cairn-manifest` bin (`package.json:179`). The first pass writes both in one commit |
| The record import's types | `node_modules/$app/tsconfig.json:21` sets `resolveJsonModule: true`, `:23` `moduleResolution: "bundler"`. A probe on 2026-11-16 compiled a `.ts` file that imports a JSON record and narrows it to `aiPosture?: 'invite' \| 'decline'` through an `as` cast, exit 0 | The import resolves. The cast proves resolution, not that the types line up: TypeScript widens a JSON string to `string`, so `cairn.config.ts` declares the record's interface and casts once, and the build-time check is what makes the cast true (Task 3) |
| The build-time check | `ajv` is a root devDependency (`package.json:269`, `^8.20.0`), absent from the showcase. The schemas are draft 2020-12 (`schema/cairn-theme-1.schema.json:2`). The package ships `schema/` (`package.json:186`) and exports `./package.json`; in the showcase that resolves through the `file:../..` link to the repo root. Rollup runs an async `buildStart` from several plugins in parallel unless a hook sets `sequential: true` (rollupjs.org, "Plugin development", hook flags). The engine's `cairnManifest()` `buildStart` (`internal.ts:336-348`) loads `cairn.config.ts`, which imports the record. The engine's nested verify server (`internal.ts:172-183`) strips only its own plugin and the adapter's, so a site plugin runs there too | A plugin in the site's `vite.config.ts`, first in `plugins`, with `buildStart: { order: 'pre', sequential: true, handler }`. It resolves `@glw907/cairn-cms/package.json`, reads `schema/cairn-site-1.schema.json` beside it, validates `cairn-site.json` with `ajv/dist/2020`, and throws one line naming the first failing field before the config module loads. It never enters the Worker bundle, where Ajv's generated code (`new Function`) is refused. The showcase adds `ajv` to its devDependencies, and the template inherits it (Decisions 4). The line can print twice when the verify server also runs, so its test matches the line, never a line count |
| The generator pass 1 left | `scripts/build/emit-definitions.mjs:16-20` `TARGETS` lists three schemas, each given generated `$defs` entries (`kindId`, `featureId`) that properties reach by `$ref`. `scripts/checks/check-definitions.mjs` regenerates in memory, reads each target with `readFileSync`, and prints `OK (3 schemas match definitions/)`. `scripts/build/emit-definitions.test.mjs:14-19` `scratchRoot` copies only `definitions/` and `schema/`. `definitions/features.json` is `{ "features": [] }`, which the generator writes as `{ not: {} }` | The record schema joins `TARGETS` with `['kindId', 'featureId']`. The generator also writes the Go copy (`tool/internal/cairnsite/definitions/kinds.json` and `features.json`, byte copies), and `check-definitions.mjs` compares those too. `scratchRoot` copies the Go copy's folder, and the OK line's count changes. A Go `embed` can't reach `definitions/` above the module, hence the copy |
| Where the copy is checked | `scripts/checks/gate-table.json:117` runs `check:definitions` for the `showcase`, `exportSurface`, and `scripts` classes; `:24` puts `definitions/` in `showcase`. `scripts/checks/gate-tier.mjs:443-445` `isToolPath` drops every `tool/` path but `tool/testdata/flags.json` before class selection, so a gate-table entry under `tool/` changes nothing. `gate-table.json:61-69` `toolInputs` holds neither `definitions/`, `templates/`, nor `scripts/build/setup-overlay/`. No workflow names `check:definitions` | A Go test in `cairnsite` compares each embedded file byte for byte with `<repo>/definitions/*.json` through `providers.RepoRoot()`, so `make -C tool check` and the `tool` workflow catch a stale copy. `toolInputs` gains `definitions/`, `templates/`, and `scripts/build/setup-overlay/`, so the fast lane runs the Go gate when the template or the overlay changes (Task 1). The workflow gaps are held-path notes |
| The Go tests' schema validator | `tool/cmd/cairn/new_e2e_test.go:77-180` `validateAgainstSchema` and `schemaProblems`: a hand subset handling `type` as a string, `const`, `enum`, `properties`, `items`, `required`, `additionalProperties` as `false`, and `allOf` with `if`/`then`. No `$ref`, `not`, `anyOf`, `pattern`, or `format`; each is skipped silently | The record schema uses those keywords plus `$ref` to `#/$defs/<name>`, which Task 6 teaches `schemaProblems` (about ten lines of test code). `themeOptions` uses `additionalProperties: { "type": ["string", "number", "boolean"] }`, which the Go validator skips: the e2e's record has `themeOptions: {}` and `features: []`, so neither subtree carries a value to check, and Ajv covers both in the Node tests. The origin's `https://` rule stays in the tool's `hostRE` and the doctor |
| The doctor's text lookups | `tool/internal/doctor/check.go:117-123` `conditionText` panics when `spine.TextFor` has no entry. It's called by `label()` and `Title` (`check.go:125-135`), by `report.go:36-38` for every failure's Why, Fix, and Docs lines, and by `result.go:111` `checkVerdict` for a failure's severity. No check in the `checks` slice (`:147-160`) uses `spine.ConditionNone`. `json.go:127-143` already writes a `ConditionNone` check with no condition key and no fix, and `schema/cairn-doctor.schema.json` doesn't require a fix on a failure. A new condition needs `src/lib/diagnostics/conditions.ts`, outside the row | Two doctor changes (Task 4). The origin mismatch folds into `config.public-origin` (condition `config.public-origin-invalid`, whose remediation already says to set `PUBLIC_ORIGIN`) as a new fail detail naming both origins. The record check is a new check, `config.site-record`, with `ConditionNone` and its own `Text spine.ConditionText` on the `Check`. One method, `(c Check) text()`, returns `c.Text` for a `ConditionNone` check and the registry entry otherwise; `label`, `Title`, `report.go`, and `checkVerdict` call it, and `conditionText` keeps its panic for a raised condition with no entry (Decisions 5) |
| The doctor's goldens and catalogue | `catalogue_test.go` requires every string const in `check_*.go` in `Catalogue()`, which writes `tool/testdata/copy.golden.md`. `check_labels_test.go:60-62` requires a registry entry for each check's condition. `report_test.go` (`:121`, `:179`, `:218`) runs every check over `cleanSiteFiles()` into five goldens under `tool/internal/doctor/testdata/golden/` (`all-clean`, `every-status`, `one-blocker-failure`, `one-warning-failure`, `unchecked-result`). `scripts/checks/tool-check-ids.mjs:12` says twelve checks. `docs-gate.mjs:91-92` runs `check:readiness` and `check:tool-conditions` over `docs/admin/is-it-working.md`. `tool/testdata/transcripts/README.md` says "A fixture is never edited", and no test compares `04-doctor-report.txt` with the current checks | The new check regenerates `copy.golden.md` (outside the row, Decisions 2) and the five report goldens, and `cleanSiteFiles()` gains a valid record so `all-clean` stays clean. `config.site-record` joins `TOOL_CHECK_IDS`, the count comment, and `is-it-working.md`. `check_labels_test.go` asserts a `ConditionNone` check's own text instead of a registry entry. The recorded transcript stays one check short, and its `is-it-working.md` blocks at `:25` and `:52` with it, filed to `BACKLOG.md` (Decisions 16) |
| The template's origin rewrite for demos | `scripts/catalog/demo.mjs:33-47` `writeOrigin` replaces `'https://showcase.test'` in `src/site/cairn.config.ts` and throws when it isn't there; `scripts/catalog/demo.test.mjs` tests it. The demo and viewer copies carry the root files (`site.mjs:135`, `theme-fixture-copy.mjs:79`) | With the origin in the record, `writeOrigin` sets `deploy.publicOrigin` in `cairn-site.json` by key instead. `scripts/catalog/**` is outside the row and outside `src/lib`, so it doesn't park (Decisions 2) |
| What the template carries | `examples/showcase/.cairn-template.json` excludes 19 paths; none is `cairn-site.json`. `examples/showcase/src/site/cairn.config.ts:37` `publicOrigin = 'https://showcase.test'`, `:162` `createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })`, `:197` `email: { from: 'cms@showcase.test' }`, `:202` the `aiPosture` comment block, with no posture set | `examples/showcase/cairn-site.json` is emitted to `templates/waymark/cairn-site.json` with no exclude change. It holds exactly today's values, so the public output doesn't move: `kind: "blog"`, `features: []`, `themeOptions: {}`, no `aiPosture`, and those deploy values |
| The literal gates that go stale | `scripts/build/bake-template.test.mjs:19` `TEMPLATE_GITHUB_APP_LITERAL` and `:61` the test that the baked config contains it; the showcase comment at `cairn.config.ts:159` naming `finalize.mjs`; `tool/internal/setup/scaffold/scaffold_test.go` anchor table at `:415-421` and the anchors at `:59-80`. The scaffold tests read the real `templates/waymark` plus the overlay (`scaffold/helpers_test.go:102-103`), as does the e2e (`new_e2e_fakes_test.go:481-520`) | Each moves to the record: the bake test asserts the baked `cairn-site.json` deploy values, the comment goes, and the scaffold tests read the record. Because the Go tests read the real template, the template's record lands in Task 1, before either pair task |
| The no-secret proof's store | The e2e asserts the keyring is empty after the run (`new_e2e_test.go:496`), and `testharness.Case.KeyringEntries` (`case.go:198`) reads only the store's current files, so it keeps no history. The `cairne2e` build's file store is `tool/internal/secrets/keyring_e2e.go` (`fileSet` at `:55`), in the folder `CAIRN_E2E_KEYRING_DIR` names. `KeyringEntries` skips any file whose name isn't hex | `fileSet` also appends each value it stores to `.writes` in the same folder, as JSON lines; the dot name keeps it out of `KeyringEntries`. `testharness.Case.KeyringWrites()` reads it back. The file exists only in the `cairne2e` build (Decisions 14) |
| Where the rebuild tests run | CI's test workflow runs `npm --prefix examples/showcase run test:unit`, and `examples/showcase/vitest.config.ts` includes `scripts/**/*.test.mjs`. `examples/showcase/scripts/starter-build.test.mjs` emits the template plus the starter overlay into a temp folder and builds it, with a 10-minute timeout; one build took 11.6 s on CI run 44015425882 | A new `examples/showcase/scripts/record-build.test.mjs` follows the same pattern and runs in CI. Seven or eight builds fit the timeout |
| The written site's own test | `scripts/build/setup-overlay/` holds `.mcp.json`, `README.md`, `.claude/`, and `.github/workflows/{check.yml,deploy.yml}`. `scripts/build/pack-engine-template.mjs:37-40` copies the whole overlay but `README.md`, and `engineTarball` (`new_e2e_fakes_test.go:482-511`) lays it under `waymark/`. Its `check.yml` runs `npm run check`, `npm run check:cairn`, and `npx cairn-guidance check` | The origin test is `scripts/build/setup-overlay/src/site/record.test.ts`, so only a written site carries it: the template's two origins differ by design (`https://showcase.test` and `http://localhost:4173`). A written site's CI runs it once `check.yml` runs `test:unit`, which the merge packet proposes (Decisions 7) |
| A setup resumed across the upgrade | The tool's last release is `tool/v1.1.0`; 13 scaffold commits have landed since. A setup an older `cairn` began and a newer one resumes past the scaffold step reaches `NamesApp` (`deploy.go:181`) at a commit with no `cairn-site.json` | `NamesApp` returns a wrapped error naming the missing record, and the run stops as for any unreadable site folder. A half-finished setup across the upgrade starts again (Decisions 13) |
| The package name for the Go code | `tool/internal/record` exists: "the site record type the Node CLI writes and the Go tool reads", the setup run's own state | The new package is `tool/internal/cairnsite`, so two "record" packages never meet in one import list |
| The docs brief | `.claude/skills/cairn-writing-docs/SKILL.md` case C sends a new page through `references/new-page.md` (premise, track, page type, outline, intro, draft). `docs/admin/setup-reference.md` is the model reference page. The admin vocabulary in `references/docs-register.md` "Names" bans "schema", "adapter", and "TypeScript" | `docs/admin/site-record.md`, a reference page with one row per field. The page says "the record's rules" where a developer page would say schema, and links the schema file by path. `docs/admin/README.md` lists it |
| The field-list check | `scripts/checks/docs-gate.mjs:70-96` runs each docs component by script | `scripts/checks/check-site-record-page.mjs` walks the schema's properties (dotted paths, `deploy.github.appId`) and the page's field table, and fails naming each field one has and the other lacks. It joins `docs-gate.mjs`'s list |

### Recorded searches

| Search at `604b4596d` | Hits | Use |
| --- | --- | --- |
| `git grep -n "cairn.config.ts" -- tool --include=*.go ':!*_test.go'` | `targets.go:23`, `scaffold.go`, `substitute.go`, and `deploy.go` via `SettingsFile()` | Every non-test reader moves to the record (Task 2) |
| `git grep -ln "cairn.config.ts\|appLiteral\|installationId: '" -- 'tool/**/*_test.go'` | `scaffold_test.go`, `runner_fakes_test.go`, `runner_test.go` | Each test that reads the App identity from `cairn.config.ts` reads the record (Task 2) |
| `git grep -nE '"[^"]*\.ts"' -- tool/internal/setup/scaffold/targets.go` | `targets.go:23` `CairnConfig: "src/site/cairn.config.ts"` | The acceptance's `.ts` check: empty at the head |
| `git grep -n "showcase.test\|cms@showcase.test" -- scripts examples/showcase/src templates/waymark/src ':!*.png'` | the showcase and template `cairn.config.ts`, `scripts/catalog/demo.mjs:33`, `demo.test.mjs` | The literals move to the record; `demo.mjs` follows (Task 3) |
| `git grep -n "cairn.config.ts" -- docs/admin skills` | the setup pages and the extending-a-site skill's config references | Every sentence that says the tool edits `cairn.config.ts`, or that the App identity or origin live there, is corrected (Task 7) |
| `git grep -n "aiPosture" -- skills docs/admin` | `cairn-extending-a-site` references, `is-it-working.md` | Where a page tells the developer to set `aiPosture` in `cairn.config.ts`, it now says the record (Task 7) |
| `grep -n "^## " docs/internal/engine-rulings.md \| grep -i "record\|cairn-site"` | 0 | No ruling to read |

## Rulings and standing answers

The twelve standing answers in `round-run.md` hold, with the design's 13 to 20. The ones this
pass can meet:

- 14: a needed `src/lib/**` file outside the row parks the pass. This plan changes no file under
  `src/lib/**`. The doctor's record check avoids a new engine condition (Decisions 5).
- 15: a pixel or public-output difference is fixed at its cause, never by a new baseline. The
  showcase's record carries today's literals, so its public output is unchanged.
- 18: plan against the files as merged. Done at `604b4596d`, main after PR #257.
- 19: a needed change under `.github/**`, `scripts/release/**`, or `.claude/settings*` is left
  alone and recorded for the round's `merge` document. See "Held paths".
- 20: over 220 path minutes at planning parks (twice the design's 110). 215 planned.

The run's ceilings are the ones the design names: the round stops new launches past 1,380 path
minutes, and the usage ceiling is 85 percent of the weekly allowance. Retries go on while each
fixes a traced cause, as `planner.md` "Stops" says, until one of those is reached. Past the
220-minute plan, the run goes on: the ceiling parks a plan, never a run in progress.

The class is `auth-data`, so this pass doesn't land unattended: the conductor sends it in the
round's close packet. Every other stop the run meets goes through `advisor.md`. The ones foreseen:

| Stop | Answer |
| --- | --- |
| A task needs a file under `src/lib/**` (a new condition, an engine record reader) | Park the pass (standing answer 14). Write `## Stop` to STATUS and end |
| A task needs another `auth-data` path than the two runner test files (`loopback*`, `signin*`, non-test `runner*`, `cloudflare_oauth*`, `github_app*`) | Stop that edit and ask the advisor. A change to non-test runner code is a scope change and parks the pass |
| The showcase's public output differs from the base | Trace it to its cause and fix it (standing answer 15). The record's values are today's literals, so a difference is a bug in the import |
| A visual baseline fails in CI | The same: the public pages can't move. Never regenerate a baseline in this pass |
| The `catalog` workflow's proving job fails | Read its log. A failure in `demo.mjs`'s origin write is fixed; a Cloudflare 403 parks the pass. Never widen a token or try another credential |
| A CI job this pass didn't touch fails | Re-run once; a repeat goes to the advisor, and a real regression is fixed at cause |
| The whole-branch review asks for work outside the row | `standards:log-issue`, listed in the PR body |
| A theme or set file would change | Stop that edit. Pass 3 changes nothing under `themes/` or `sets/<kind>/` |

## Acceptance

Every pass:

- CI is green on the head commit, and the whole-branch review is accepted with no open finding.
  - Task 10: `ci-green <sha> --pr <n> --wait` exit 0 on the head commit; the
    `standards:diff-reviewer` whole-branch verdict `accept` and the
    `standards:web-auth-security-reviewer` verdict quoted in the PR.
- The built showcase, the Waymark demo, and the Pennant demo show no visitor-visible change. A
  fresh `standards:visual-verifier` compares each of the home page, a post, a plain page, and the
  archive at the five widths with the same page built from the pass's base commit, and returns no
  difference.
  - Tasks 0 and 8: 60 base/head screenshot pairs, the pixel compare's count, and the three
    verifiers' verdicts quoted in the PR.
- The showcase's built public output (every prerendered page, the feeds, the sitemap, and
  `robots.txt`) equals the base commit's, file for file, once hashed asset names are replaced
  with a fixed token. The PR lists any file that differs, with the reason.
  - Tasks 0 and 8: the normalized hash list diff, pasted in the PR.

Pass 3:

- `schema/cairn-site-1.schema.json` exists and rejects an unknown key, a kind outside `definitions/kinds.json`, and a record with no `deploy.publicOrigin`. Its kind and feature enums are written by pass 1's generator, and `check:definitions` covers it and the copy the Go tool embeds. The tool's record writer reads that copy and refuses a kind that isn't in it. Today: the file doesn't exist.
  - Task 1: `scripts/build/emit-definitions.test.mjs` cases validate three bad records with Ajv
    2020 and assert each is rejected; `npm run check:definitions` prints 4 schemas and the Go
    copy, and a case that edits the copy in a scratch root fails naming it; `go test
    ./internal/cairnsite/` asserts the writer refuses `kind: "nope"`, and its drift test fails
    when an embedded file differs from `definitions/`.
- `tool/internal/setup/scaffold/substitute.go` holds none of `descriptionLineRE`, `emailFromRE`, `publicOriginTSRE`, `githubAppRE`, and `publicOriginJSONRE`, and no regular expression that matches a `.ts` file. Today: `git grep -c` finds those names on 11 lines, and three of the five rewrite `cairn.config.ts`.
  - Task 2: `git grep -c "descriptionLineRE\|emailFromRE\|publicOriginTSRE\|githubAppRE\|publicOriginJSONRE" HEAD -- tool/internal/setup/scaffold/substitute.go`
    prints nothing (base: `11`); `git grep -nE '"[^"]*\.ts"' HEAD -- tool/internal/setup/scaffold/targets.go`
    prints nothing (base: `targets.go:23`); `git grep -n "regexp.MustCompile" HEAD -- tool/internal/setup/scaffold/substitute.go`
    lists each remaining expression, and the PR names the file each one reads, none a `.ts`
    file. All three pasted in the PR.
- A `cairn new` run in the tool's end-to-end test writes a `cairn-site.json` that passes the schema, and every `.ts` file in the written site is byte-for-byte the template's. The run's AI crawler answer is in the record, and the built `robots.txt` reflects it for each of `invite`, `decline`, and unset.
  - Task 6: `TestNewE2EApplyCreatesTheSiteFromTheEditedPlan` validates the record against the
    schema (with `$ref`), compares every `.ts` file under the written site with the tarball tree,
    and asserts `aiPosture` equals the run's answer. Task 5: `record-build.test.mjs` builds the
    template with the record's `aiPosture` set to `invite`, to `decline`, and unset (facts
    regenerated each time), and asserts each built `robots.txt` carries the matching directive.
- The written site's public origin, sending address, and GitHub App details at run time equal the record's values. A test changes each `deploy` value in the record alone, rebuilds, and finds the new value where the site uses it. With the origin changed in the record alone, the site's test from "How it fails" fails, naming both origins.
  - Task 5: `record-build.test.mjs` changes `publicOrigin`, `emailFrom`, and each of the five
    GitHub values in the record alone, rebuilds, and finds the new origin in the prerendered
    canonical links and feed, and the sender and App values in the built server output. It then
    lays the setup overlay, sets `PUBLIC_ORIGIN` equal to the record, changes the record's origin
    alone, runs `record.test.ts`, and asserts a failure naming both origins. Task 6: the e2e
    asserts the written `wrangler.jsonc`'s `PUBLIC_ORIGIN` equals the record's origin.
- A test records every value the run hands to the tool's secret store, through the fake store the tool's tests already use, and finds none of them in the record.
  - Task 6: the e2e reads `r.c.KeyringWrites()` after the run, asserts it holds at least the
    plan's `setup/` entries, and asserts no written value appears in the bytes of
    `cairn-site.json`.
- Each row of "How it fails" that names `cairn-site.json` has a test.
  - Missing, not JSON, or failing its schema, the build: Task 5's `record-build.test.mjs` builds
    the template three times with each fault and asserts the failed build's output carries the
    one line naming the field. Task 3's `record-check.test.ts` pins each line's text.
  - The same, the doctor: Task 4's `check_siterecord_test.go` asserts the doctor's line for each.
  - The same, `cairn add`: the command arrives in pass 6, whose acceptance carries the row's
    `cairn add` cases (Decisions 15).
  - The origin mismatch: Task 5 (the site's test) and Task 4's `check_origin_test.go` case naming
    both values.
  - A schema or the Go copy differs from `definitions/`: Task 1's `emit-definitions.test.mjs` case
    and the `cairnsite` drift test.
- `docs/admin/` holds one reference page for the record that lists every field, and a check fails when the page's field list differs from the schema's. `npm run check:docs-gate` and `vale` pass, and a fresh `docs-fact-checker` returns no finding on it.
  - Task 7: `docs/admin/site-record.md`; `check-site-record-page.mjs` in the docs gate, with a
    test case that drops one row and fails; `npm run check:docs-gate` exit 0 after the last docs
    edit, run again in Task 9; the fact-checker's JSON with no finding, quoted in the PR.
- `make -C tool check` passes.
  - Tasks 1, 2, 4, and 6 run it on the light lane, and the executor runs it at each pair's join;
    CI's `tool` workflow on the head.

## Skills the executor loads

`cairn-pass`, `pass-core` (`references/executor.md`, `references/round-run.md`,
`references/advisor.md`), `cairn-running-passes`, `cairn-judging-scope`,
`cairn-writing-engine-code`, `standards:go-conventions` (every file under `tool/`),
`standards:golang-spf13-cobra` (the e2e under `tool/cmd/cairn`), `standards:ts-conventions`
(comments in `.ts` and `.mjs`), and `cairn-writing-docs` (Task 7). Voice:
`~/.claude/docs/voice/written-for-people.md`.

## Tasks

The worktree is `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/foundation-3`. After each
task, run the fast lane: the legs `node scripts/checks/gate-tier.mjs --fast --range 604b4596d..HEAD`
prints, each through `cairn-run-gate`, with the `tool` leg as `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.
Task 1 runs first. Tasks 2 and 3 run as a pair once Task 1 lands, then Tasks 4 and 5, then Tasks 6
and 7. Each pair task goes to a `cairn-implementer` (Sonnet, medium) in its own worktree, which
pays its own setup. At each pair's join, the executor merges the first task, then the second, and
runs the fast lane on the joined branch before the next pair starts. Push once Task 1 lands, which
opens the draft PR, and push after each join.

The record's shape, used throughout:

```json
{
  "kind": "blog",
  "features": [],
  "themeOptions": {},
  "scaffold": { "engine": "<version>" },
  "deploy": {
    "publicOrigin": "https://showcase.test",
    "emailFrom": "cms@showcase.test",
    "github": { "owner": "showcase", "repo": "demo", "branch": "main", "appId": "1", "installationId": "2" }
  }
}
```

`aiPosture` is optional, `invite` or `decline`, and sits after `themeOptions` when present.
`scaffold.composer` is optional and absent until pass 4 writes a composer (Decisions 8). The
showcase's and the template's `scaffold.engine` is the root `package.json` version at the base;
the tool writes the engine version it installs. The keys are written in this order, two-space
indented, with a final newline, by both the hand-written showcase record and the Go writer, so a
written record diffs cleanly against the template's.

### Task 0: base build (25 min)

Before any edit, run the setup command bare, then `npm run package`. Build the base outputs into
`$CLAUDE_JOB_DIR/tmp/parity/base/` exactly as foundation-2's Task 0 did (its plan is
`git show f9a53ba30^:docs/internal/plans/2026-11-16-foundation-2-menus-plan.md`, "Task 0"): the
showcase build copied from `examples/showcase/.svelte-kit/cloudflare`, the Waymark demo through
`scripts/catalog/demo.mjs`, and the Pennant demo through a `buildDemo` call over
`sets/organization`; then `serve.mjs`, `pages.txt` (12 URLs), `shoot.mjs` at 320, 390, 768, 1440,
and 2560, `compare.mjs`, and `hash.mjs` over the acceptance item's public set, with its
normalization. Skip `shoot-admin.mjs`: this pass changes no admin screen. Run `hash.mjs` on
`parity/base/showcase` into `parity/base/showcase.hashes`.

### Task 1: the schema, the generator, the Go copy, and the template's record (35 min)

1. `schema/cairn-site-1.schema.json`, draft 2020-12, `$id` `https://cairn.pub/schemas/cairn-site/1.json`,
   `additionalProperties: false` at every fixed-key object, `required` `["kind", "features", "themeOptions", "scaffold", "deploy"]`,
   `deploy` requiring `publicOrigin`, `emailFrom`, and `github`, and `github` requiring all five
   strings. `kind` is `{ "$ref": "#/$defs/kindId" }`, `features` an array of `featureId` refs,
   `themeOptions` an object with `additionalProperties: { "type": ["string", "number", "boolean"] }`,
   `aiPosture` the two-value enum. Each property carries a `description` the reference page
   draws on. Use only the keywords the mechanism table lists.
2. `scripts/build/emit-definitions.mjs`: append the schema to `TARGETS` with
   `['kindId', 'featureId']`, and add the byte copies of `definitions/kinds.json` and
   `definitions/features.json` to `tool/internal/cairnsite/definitions/`, written by
   `writeSchemas` and returned by `buildSchemas` under their repo paths, so
   `check-definitions.mjs` compares them with no other change. Fix its OK line's count. Run
   `node scripts/build/emit-definitions.mjs` and commit the outputs.
3. `scripts/build/emit-definitions.test.mjs`: `scratchRoot` also copies
   `tool/internal/cairnsite/definitions/`, and any test that pins the OK line follows. New cases:
   Ajv 2020 rejects an unknown top-level key, `kind: "nope"`, and a record with no
   `deploy.publicOrigin`, and accepts the showcase's record; a scratch root whose Go copy differs
   fails `checkDefinitions` naming `tool/internal/cairnsite/definitions/kinds.json`.
4. `scripts/checks/gate-table.json`: `toolInputs` gains `definitions/`, `templates/`, and
   `scripts/build/setup-overlay/`.
5. `tool/internal/cairnsite` (new package): `//go:embed definitions/*.json`; a `Record` struct in
   the key order above with `omitempty` on `aiPosture` and `scaffold.composer`; `Decode(data)`
   with `DisallowUnknownFields` that returns an error naming the field (`cairn-site.json:
   deploy.publicOrigin is required`, `cairn-site.json: kind "nope" is not one of blog, portfolio,
   ...`); `Encode(r)` that refuses a kind outside the embedded list and returns the bytes with a
   final newline. Table tests for each refusal, a round trip of the showcase's record byte for
   byte, and the drift test against `<repo>/definitions/` (mechanism table).
6. `examples/showcase/cairn-site.json` with today's values (the shape above), then
   `npm run emit:template` and `npm run check:template`. Data only: `cairn.config.ts` doesn't
   change yet, so the Go tests and the builds see the record before either pair task needs it.
7. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 2: the scaffold writes the record (pair with Task 3, 30 min)

1. `substitute.go`: delete the five expressions, `editCairnConfig`, `editInstallation`,
   `aiPostureComment`, `githubAppTemplate`, and `githubApp`. Add `editSiteRecord` to `firstPass`,
   a move from the second pass: decode the template's `cairn-site.json` with `cairnsite.Decode`,
   set `aiPosture`, `scaffold.engine`, and the whole `deploy` from `Site`, and encode. Add
   `editRecordDeploy` to `secondPass`, which sets `deploy` again through the same writer.
2. `editSiteConfig`: the description by node position (mechanism table), keeping the site-name
   swap and the duplicate-key check.
3. `editWrangler`: the exact swap of the template's `PUBLIC_ORIGIN` key-value text, with
   `replaceExact`. The scaffold imports nothing from the doctor.
4. `targets.go`: `SiteRecord: "cairn-site.json"` replaces `CairnConfig`. `scaffold.go`:
   `SettingsFile()` returns it, `NamesApp` decodes the record at the commit and compares the five
   GitHub fields, returning a wrapped error naming the record when the commit has none, and
   `UpdateInstallation` writes `installationId` through the writer and commits `cairn-site.json`
   alone, restoring it on failure. Doc comments say the record, not the config.
5. Tests: `scaffold_test.go` moves its anchors to the record and asserts the description edit
   leaves every other line of `site.config.yaml` byte-identical; `runner_fakes_test.go` and
   `runner_test.go` model the record (`const siteRecord = "cairn-site.json"`, the fake finalize
   writes the record's `deploy.github`, `namesInstall` decodes it). No non-test runner code
   changes.
6. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 3: the showcase reads the record (pair with Task 2, 30 min)

1. `examples/showcase/src/site/cairn.config.ts`: import the record (`../../cairn-site.json`),
   declare its interface, cast once, and read `publicOrigin`, `email.from`, the five
   `createGithubApp` values, and `aiPosture` from it. Delete the `finalize.mjs` comment and the
   `aiPosture` comment block, and say in one comment that the tool writes the record and the
   developer may edit it.
2. `examples/showcase/src/site/record-check.ts`: the check (mechanism table), exported for its
   test, and a plugin in `examples/showcase/vite.config.ts`, first in `plugins`, with
   `buildStart: { order: 'pre', sequential: true, handler }`. `ajv` joins the showcase's
   devDependencies at `^8.20.0`; refresh the lockfile with `npm install --prefix examples/showcase`,
   bare. The messages: a missing file prints `cairn-site.json: not found at <path>`; invalid JSON
   prints `cairn-site.json: not valid JSON (<parser message>)`; a schema failure prints
   `cairn-site.json: <field path> <ajv message>` for the first error.
3. `examples/showcase/src/site/record-check.test.ts`: missing file, invalid JSON, an unknown key,
   and a missing `deploy.publicOrigin` each give their one line.
4. `npm run emit:template`, then `npm run check:template`. `scripts/build/bake-template.test.mjs`
   drops `TEMPLATE_GITHUB_APP_LITERAL` and asserts the baked record's `deploy.github`.
5. `scripts/catalog/demo.mjs` `writeOrigin` sets `deploy.publicOrigin` in `cairn-site.json` by
   key, and throws when the record lacks it; `demo.test.mjs` follows.
6. `npm --prefix examples/showcase run build` and `npm --prefix examples/showcase run test:unit`.
   The template's `cairn.config.ts` changes here, so the fast lane runs the Go gate (Task 1's
   `toolInputs`). On this branch alone the e2e's byte compare doesn't exist yet and the scaffold
   no longer edits the file once Task 2 joins; if the Go gate fails here on the old scaffold's
   `cairn.config.ts` anchors, the task reports the failing test, and the executor's join run
   after Task 2 merges is the gate that must pass.

### Task 4: the doctor (pair with Task 5, 40 min)

1. `check_origin.go`: when `wrangler.jsonc` sets `vars.PUBLIC_ORIGIN` and `cairn-site.json` sets
   `deploy.publicOrigin` and the two differ, the check fails with the detail
   `PUBLIC_ORIGIN in wrangler.jsonc is <a>, but deploy.publicOrigin in cairn-site.json is <b>`.
   Compare the wrangler var only, never the environment fallback. A site with no record keeps
   today's behavior on this check.
2. `check.go`: `Check` gains `Text spine.ConditionText`, and the method `(c Check) text()`
   returns `c.Text` when `c.Condition` is `spine.ConditionNone`, else the registry entry through
   `conditionText`. `label`, `Title`, `report.go:36-38`, and `result.go:111` call `text()`.
3. `check_siterecord.go`: `config.site-record`, `ConditionNone`, `PassTitle` `Site record
   validates`, and a `Text` with title `Site record does not validate`, severity critical (a bad
   record fails the site's build), a why, a fix that points at `cairn-site.json` and its docs
   page, and the docs anchor of `docs/admin/site-record.md`. It fails with `cairnsite.Decode`'s
   line for a missing, non-JSON, or invalid record (Decisions 12).
4. Add `config.site-record` to `checks` after `configSiteConfig`, to
   `scripts/checks/tool-check-ids.mjs` and its count comment at `:12`, and an entry in
   `docs/admin/is-it-working.md` that `check:readiness` and `check:tool-conditions` accept.
5. Tests: `check_siterecord_test.go` (missing, not JSON, unknown key, bad kind, no origin, valid);
   `check_origin_test.go` (mismatch, match, no record); `check_labels_test.go` asserts a
   `ConditionNone` check carries its own title, why, fix, and severity; `report_test.go`'s
   `cleanSiteFiles()` gains a valid record, and the five report goldens regenerate. Regenerate
   `tool/testdata/copy.golden.md` with the catalogue's update flag. Read each regenerated golden's
   diff: only the new check's lines change.
6. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 5: the rebuild tests and the site's origin test (pair with Task 4, 25 min)

1. `scripts/build/setup-overlay/src/site/record.test.ts`: read `cairn-site.json` and
   `wrangler.jsonc` (comments stripped), and fail with
   `deploy.publicOrigin in cairn-site.json is <b>, but PUBLIC_ORIGIN in wrangler.jsonc is <a>` when
   they differ.
2. `examples/showcase/scripts/record-build.test.mjs`, built on `starter-build.test.mjs`'s emit:
   1. Three builds with the record's `aiPosture` set to `invite`, to `decline`, and removed, each
      after `npx cairn-manifest` rewrites the facts. Assert each `robots.txt` carries the posture's
      directive, and the unset one equals the base template's.
   2. Fold into one of those builds every `deploy` value changed in the record alone. Find the
      new origin in a prerendered page's canonical link and the feed, and the new sender and each
      GitHub value in the built server output under `.svelte-kit/cloudflare`.
   3. Three builds that must fail: the record removed, the record made invalid JSON, and
      `deploy.publicOrigin` removed. Assert each build exits nonzero and its output carries Task
      3's line for that fault.
   4. Lay the overlay, set `PUBLIC_ORIGIN` to the record's origin, run `record.test.ts` with
      `vitest run` and expect a pass, then change the record's origin alone, run again, and expect
      a failure whose output names both origins.
   The test's timeout follows `starter-build.test.mjs`.
3. `npm --prefix examples/showcase run test:unit`.

### Task 6: the end-to-end proof (pair with Task 7, 25 min)

1. `tool/internal/secrets/keyring_e2e.go`: `fileSet` also appends `{"name": ..., "value": ...}`
   as one JSON line to `.writes` in the store's folder. `tool/internal/testharness/case.go`:
   `KeyringWrites()` returns those values, empty when the file is absent.
2. `new_e2e_test.go`: `schemaProblems` resolves a local `$ref` to `#/$defs/<name>`.
3. `TestNewE2EApplyCreatesTheSiteFromTheEditedPlan`: after the run, read
   `example-site/cairn-site.json`, validate it against `schema/cairn-site-1.schema.json`, assert
   `aiPosture` equals the run's posture answer and `deploy` equals the run's values; read the
   written `wrangler.jsonc` through `doctor.ReadWranglerConfig` and assert `PUBLIC_ORIGIN` equals
   `deploy.publicOrigin`; walk every `.ts` file under the written site and compare it byte for
   byte with the same path in the tarball tree (template plus overlay); read
   `r.c.KeyringWrites()`, assert it holds at least one `setup/` entry, and assert no written value
   appears in the record's bytes. The existing empty-keyring assertion at `:496` stays.
4. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 7: the reference page and the corrections (pair with Task 6, 25 min)

1. Load `cairn-writing-docs`, case C. `docs/admin/site-record.md`, a reference page: what the
   record is and who writes it, one table row per field (dotted path, what it holds, who sets it,
   whether it's required), what it leaves out (the theme, the Cloudflare names, the site name,
   any secret), and that the public origin is stated twice and the site's test and `cairn doctor`
   catch a mismatch. List it in `docs/admin/README.md`.
2. `scripts/checks/check-site-record-page.mjs` (mechanism table), in `docs-gate.mjs`'s list, with
   a test case run by the docs gate itself or added to an existing test file the root scripts
   already run (the root `package.json` is outside the row).
3. Correct what the change makes wrong, from the recorded searches: the setup pages' sentences
   about `cairn.config.ts` holding the origin, sender, App identity, or posture;
   `skills/cairn-extending-a-site` references the same. `is-it-working.md`'s new check entry is
   Task 4's; this task reads it for the page's voice.
4. `MIGRATION-NOTES.md`: a site from before this pass has no record, so `cairn doctor` reports
   `config.site-record` failing until the developer adds one; the steps to add one (copy the
   shape, fill the deploy values from `cairn.config.ts` and `wrangler.jsonc`, point
   `cairn.config.ts` at it); and that a `cairn new` begun with an older tool starts again.
   `CHANGELOG.md` under `## Unreleased`: the record, the schema, the doctor check, and the origin
   mismatch detail. No `Consumers must:` line: the engine reads nothing new (Decisions 11).
5. `npm run check:docs-gate`, bare. Dispatch a fresh `docs-fact-checker` on the page and every
   corrected page. Fold each finding.

### Task 8: head build and parity (35 min)

As foundation-2's Task 6 steps 1 to 5: `git diff --stat 604b4596d..HEAD -- themes/ 'sets/*/'`
prints nothing; `npm run package` first; the three head builds; `shoot.mjs` and `hash.mjs` with
the same arguments; the hash diff prints nothing; the pixel compare; three fresh
`standards:visual-verifier` agents, one per site, with 20 labeled base/head pairs each. No admin
shots.

### Task 9: whole-branch review (10 min)

1. `npm run check:template`, `npm run check:docs-gate`, `npm run check:definitions`, each bare.
2. Dispatch `standards:diff-reviewer` at whole-branch scope with this plan and the design, and
   `standards:web-auth-security-reviewer` on the runner test changes, `UpdateInstallation`,
   `NamesApp`, the keyring write log, and the record's no-secret test. Fold every finding, then
   run the fast lane again.

### Task 10: delete and hand over (10 min)

1. Commit the deletion of `docs/internal/plans/2026-11-16-foundation-3-record-plan.md` and
   `docs/internal/plans/2026-11-16-foundation-3-executor-prompt.txt`, then push.
2. Update the draft PR's body: it opens with a paragraph per the voice standard, and carries
   `Round: foundation`, `Pass: record`, `Class: auth-data`, `Review: accept, open findings 0`, each
   `auth-data` verdict, the `Calls:` line, `## Acceptance` with the evidence item by item,
   `## Decisions`, `## Held paths`, `## Planning misses`, the filed issues, and the score. No
   `## Before merge`.
3. `ci-green <sha> --pr <n> --wait` as a background task. Then mark the PR ready and hand over by
   `approval-packet`: the `auth-data` class sends it in the round's close packet, which
   `conductor-foundation` sends. The executor writes STATUS only for a `## Stop`.

## Held paths

- `.github/workflows/test.yml` (or the workflow that runs the gate table's statics): add
  `npm run check:definitions`, so the schemas and the Go copy are checked on CI and not only in
  the fast lane. The `cairnsite` drift test covers the Go copy on CI meanwhile.
- `.github/workflows/tool.yml`: add `definitions/**`, `templates/**`, and
  `scripts/build/setup-overlay/**` to its path triggers, so a change there runs the Go tests that
  read them.
- `scripts/build/setup-overlay/.github/workflows/check.yml` is not a held path, but it is every
  written site's CI. It stays as it is, and the merge packet proposes adding `npm run test:unit`
  so a written site's CI runs `record.test.ts` (Decisions 7).

## Decisions

1. `[advisor]` The class rises from `ordinary` to `auth-data`. Moving the settings file from
   `cairn.config.ts` to the record changes `tool/internal/setup/runner_fakes_test.go` and
   `runner_test.go`, which the path map classes `auth-data` under `setup/runner*`. The design
   foresaw this for passes 4 to 6 ("how the tool writes a site's deploy details"). No non-test
   runner code changes. `conductor-foundation` was told on 2026-11-16. The pass lands only through
   the round's close packet.
2. `[file-list]` The row leaves out files the change needs: `scripts/catalog/demo.mjs` and
   `demo.test.mjs` (the demo's origin write), `tool/testdata/copy.golden.md` (regenerated from the
   doctor's catalogue), and `tool/internal/doctor/**`, `tool/internal/secrets/keyring_e2e.go`, and
   `tool/internal/testharness/**` (inside `tool/internal/**`, named here because the design's note
   says "the scaffold and the embedded copy"). None is under `src/lib/**`, so none parks the pass.
3. `Call:` "The Go tool writes it once" reads as one writer that owns the file: the first pass
   writes the whole record, and the second pass and `UpdateInstallation` change only `deploy`
   through the same encoder. Nothing else in the tool opens the file, and nothing opens a `.ts`
   file. The first pass writes it because only the first pass has the engine version.
4. `[advisor]` The build-time record check lives in the site (`record-check.ts` and a plugin in
   `vite.config.ts`), with `ajv` as a site devDependency. The engine's `cairnManifest()` plugin is
   the natural home, but it sits under `src/lib/vite/`, outside the row. This stands against the
   "no-debt engine" rule, and is filed through `standards:log-issue` for the engine to take the
   check when a pass may touch `src/lib/vite/`. Ajv never enters the Worker bundle.
5. `[advisor]` The doctor reports the origin mismatch through `config.public-origin`, whose
   condition's remediation already fits. The record check has no engine condition: a new one
   needs `src/lib/diagnostics/conditions.ts` (standing answer 14). So a `ConditionNone` check
   carries its own `spine.ConditionText`, read through one `text()` method at the four places
   that read a condition's text today. The registry stays the one source for every raised
   condition, and `json.go` already writes a `ConditionNone` check.
6. `[advisor]` `PUBLIC_ORIGIN` is written by an exact swap of the template's key-value text,
   which fails when the text is absent, since `go.mod` (outside the row) has no JSONC encoder and
   the template's comments must survive. The e2e reads the result back. The description is set
   at its YAML node's line and column, since a `yaml.v3` round trip re-indents the comments.
7. `[advisor]` The site's origin test ships in the setup overlay, so only a written site carries
   it: the template's two origins differ by design. The rebuild test lays the overlay to prove
   it.
8. `[design-gap]` The design's `scaffold` names "the engine and composer versions", and no
   composer exists until pass 4. `scaffold.composer` is optional in the schema and absent until
   pass 4 writes it. Inventing a value now would be a fabrication.
9. `[design-gap]` The design doesn't name the record's nesting. The GitHub values sit under
   `deploy.github`, as `createGithubApp` takes them, so the reference page can say "the GitHub
   App" once.
10. The Go package is `tool/internal/cairnsite`, since `tool/internal/record` is the setup run's
    own record.
11. An existing site with no record still builds and runs: the engine reads nothing new and the
    site's `cairn.config.ts` is the site's own. So `CHANGELOG.md` carries no `Consumers must:`
    line, and `MIGRATION-NOTES.md` carries the steps.
12. A missing record fails `config.site-record`, as the design's "How it fails" row says
    ("`cairn doctor` says the same"). A site from before this pass is reported until it adds a
    record; its fix names the docs page, and `MIGRATION-NOTES.md` carries the steps. Every site
    is rebuilt after the round's release, so no long-lived site carries the failure.
13. A setup an older tool began and this one resumes past the scaffold step stops at `NamesApp`
    with an error naming the missing record, as for any unreadable site folder. No fallback reads
    the old `cairn.config.ts`: the design names none, and the case is a half-finished run across
    an upgrade. `MIGRATION-NOTES.md` says to start such a run again.
14. `[mechanism]` The no-secret proof needs every value the run stores, and the fake store keeps
    only current entries, which the run deletes. The `cairne2e` build's `fileSet` appends a write
    log beside the entries, read by `KeyringWrites()`. It's test-build code under the existing
    build tag, and the security review reads it.
15. `[design-gap]` The "How it fails" row names `cairn add`, which pass 6 adds. Pass 3 tests the
    build and the doctor; the `cairn add` case is pass 6's acceptance.
16. The recorded doctor transcript (`tool/testdata/transcripts/04-doctor-report.txt`) and the
    `is-it-working.md` blocks quoted from it stay one check short: transcripts are never edited,
    and a fresh capture needs a live run. Filed to `BACKLOG.md` for the next live capture.

## Path

| Task | Minutes |
| --- | --- |
| 0 base builds, scripts, screenshots, hash | 25 |
| 1 schema, generator, Go copy, `cairnsite`, the template's record | 35 |
| 2 and 3, as a pair, with the join run | 35 |
| 4 and 5, as a pair (Task 4 sets it) | 40 |
| 6 and 7, as a pair | 25 |
| 8 head build, parity, three verifiers | 35 |
| 9 whole-branch and security reviews and their folds | 10 |
| 10 delete, hand over (CI off the path) | 10 |
| Path (pairs overlap) | 215 |

Each `cairn-implementer` worktree pays its own setup (two `npm ci` runs and a package), which the
task minutes carry.

## Planning misses

- `[file-list]` `scripts/catalog/demo.mjs`, the doctor, the catalogue golden, the keyring store,
  and the harness (Decisions 2).
- `[mechanism]` The runner test fakes that make the class `auth-data` (Decisions 1).
- `[mechanism]` The doctor's four text lookups for a `ConditionNone` check (Decisions 5).
- `[mechanism]` The fake keyring keeps no history (Decisions 14).
- `[design-gap]` The composer version, the record's nesting, and `cairn add` (Decisions 8, 9,
  and 15).
- `[estimate]` 215 against 110: the parity builds every pass owes, the rebuild tests, and the
  doctor.

## Review folded

The `standards:plan-reviewer` read (Opus, medium, 2026-11-16) returned 17 findings. Each is
folded:

- Blocker, the keyring proof read an empty store: Task 6 adds a write log (Decisions 14).
- Tasks 2 and 3 weren't independent: the template's record moves to Task 1, and the executor runs
  the fast lane at each pair's join.
- A `ConditionNone` failure also reaches `report.go:36-38` and `result.go:111`: one `text()`
  method at all four sites, Task 4 raised to 40 minutes (Decisions 5).
- The doctor on a missing record: it fails, as the design's row says (Decisions 12).
- The gate-table entry under `tool/` was dead: a Go drift test, and `toolInputs` gains
  `definitions/`, `templates/`, and `scripts/build/setup-overlay/`.
- `emit-definitions.test.mjs`'s scratch root: Task 1 step 3.
- Which error wins on a missing or broken record: the plugin runs first and sequentially, and
  Task 5 proves each fault through a real build.
- The doctor report goldens, `is-it-working.md`, the count comment, and the transcript: Task 4,
  and Decisions 16.
- Citation errors in `deploy.go` and the recorded searches: corrected; `deploy_test.go` dropped.
- The `.ts` grep that couldn't fail: the acceptance greps `targets.go`'s values and lists each
  remaining expression.
- `themeOptions` and the Go validator: the keyword is named, and the skipped subtree is stated.
- A setup resumed across the upgrade: Decisions 13.
- The scaffold's import of the doctor: dropped; the e2e reads `wrangler.jsonc` back.
- The plugin in the verify server: its test matches the line, never a count.
- The "Reviewed" line: filled.
