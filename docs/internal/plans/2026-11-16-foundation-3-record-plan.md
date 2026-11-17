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

Planned path: 190 minutes against the design's 110 (parking ceiling 220, standing answer 20). See
"Path".

Scope premise (`cairn-judging-scope`): the record holds facts that have no other home, and it
moves values the tool already writes out of TypeScript source into one file the developer owns.
It adds no engine export, no actor, and no runtime surface. The build-time check is the site's
own code (Decisions 4). `grep -n "^## " docs/internal/engine-rulings.md | grep -i "record\|site-json\|cairn-site"`
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
| `gh pr merge` chained with `gh pr view` (Merge Without Review) | Never `gh pr merge`. `conductor-foundation` lands the PR (`approval-packet` step 1) |
| Edits to `settings.json` (Self-Modification) | The pass writes no Claude settings file |
| A write to the secret store (Secret-Store Writes, 2026-11) | The pass writes no secret. The record test reads the fake keyring the e2e already uses |
| Classifier unavailable (transient) | Retry the same command once, bare and alone |

Reviewed: one `standards:plan-reviewer` read on 2026-11-16 (Opus, medium), with `planner.md`
"Stops" and "Pre-flight" added to its prompt; findings folded below (see "Review folded"). The
`auth-data` close adds one `standards:web-auth-security-reviewer` read (Task 9).

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
| What each pass can write | `scaffold.go:64-104`: `Write` runs `firstPass` after `Site.validate(false)`, `Finalize` runs `secondPass` after `validate(true)`. `validate` (`substitute.go:58-93`) skips only `DatabaseID` when `needDB` is false, so the address, sender, posture, and all five GitHub values are checked and real at the first pass. `engineVersion` reaches only the first pass (`scaffold.go:210`, `:233-236`) | The first pass writes the whole record, since it alone has the engine version. The second pass writes the record's `deploy` again through the same writer, which leaves the file byte-identical unless the App changed between the passes (Decisions 3) |
| The App identity's later rewrite | `scaffold.go:111` `SettingsFile()` returns `targets.CairnConfig`; `:115-121` `NamesApp` checks `strings.Contains` on `git show <commit>:src/site/cairn.config.ts`; `:129-155` `UpdateInstallation` runs `editInstallation` and `commitFile(targets.CairnConfig)`. Callers: `deploy.go:130-140` (`followInstallation`, `installationCommit`) and `:244` | `SettingsFile()` returns `cairn-site.json`. `NamesApp` decodes the record at the commit and compares the five GitHub fields. `UpdateInstallation` writes `deploy.github.installationId` through the writer and commits the record alone |
| The fakes that model the settings file | `tool/internal/setup/runner_fakes_test.go:1325-1360` (`const siteConfig = "src/site/cairn.config.ts"`, `appLiteral`, a finalize fake that writes `export const github = ...`); `runner_test.go:2150-2158` (`configAt`, `namesInstall` on `"installationId: '"+id+"' })"`, used at `:2174` and `:2209`) | Both are `runner*` files, which the path map classes `auth-data`. They move to the record (Task 2). This is the class rise (Decisions 1) |
| The site description | `substitute.go:185` `descriptionLineRE`, `:197` replaces the line with `"description: " + quote(neutralDescription)`, then a duplicate-key check through `topDescriptionRE`. A probe on 2026-11-16 round-tripped `templates/waymark/src/site/site.config.yaml` through `go.yaml.in/yaml/v3` (`tool/go.mod:20`, a direct require): the encoder re-indented 16 comment lines | The description is set by structure without re-encoding: decode to a `yaml.Node`, find the top-level `description` key's value node, and replace that scalar's text at its `Line` and `Column` (the probe printed line 2, column 14, plain style). The site name keeps its exact `siteName: Waymark` swap, which is a key edit already |
| `PUBLIC_ORIGIN` | `substitute.go:259` `publicOriginJSONRE`, applied at `:278`; the template's line is `templates/waymark/wrangler.jsonc:43` `"PUBLIC_ORIGIN": "http://localhost:4173"`. The tool has a JSONC reader, `tool/internal/doctor/wrangler.go` (`stripJsonc`, `factsFromJsonc`) | `replaceExact` on the template's whole key-value text, then parse the edited file back with the doctor's reader and fail unless `vars.PUBLIC_ORIGIN` equals the new value. "By structure" without a JSONC encoder in `go.mod` (Decisions 6) |
| The posture's second home | `editSiteFacts` (`substitute.go`, first pass) writes `aiPosture` into `src/content/.cairn/site-facts.json`. The engine's build compares that file byte for byte with the adapter's facts: `src/lib/vite/internal.ts:601-610` builds the facts from `cairn?.aiPosture`, and `:346-347` fails the build when stale | `editSiteFacts` stays. With `cairn.config.ts` reading `aiPosture` from the record, the record and `site-facts.json` must agree, so any test that changes the posture in the record also rewrites the facts with the `cairn-manifest` bin (`package.json:179`). The first pass now writes both in one commit, where today's first commit already carries the facts without the config |
| The record import's types | `node_modules/$app/tsconfig.json:21` sets `resolveJsonModule: true`, `:23` `moduleResolution: "bundler"`. A probe on 2026-11-16 compiled a `.ts` file that imports a JSON record and narrows it to `aiPosture?: 'invite' \| 'decline'` through an `as` cast, exit 0 | The import resolves. The cast proves resolution, not that the types line up: TypeScript widens a JSON string to `string`, so `cairn.config.ts` declares the record's interface and casts once, and the build-time schema check is what makes the cast true (Task 3) |
| The build-time check | `ajv` is a root devDependency (`package.json:269`, `^8.20.0`), absent from the showcase. The schemas are draft 2020-12 (`schema/cairn-theme-1.schema.json:2`). The package ships `schema/` (`package.json:186`) and exports `./package.json` | A small plugin in the site's `vite.config.ts` resolves `@glw907/cairn-cms/package.json`, reads `schema/cairn-site-1.schema.json` beside it, validates `cairn-site.json` with `ajv/dist/2020`, and fails `buildStart` with one line naming the first failing field. It never enters the Worker bundle, where Ajv's generated code (`new Function`) is refused. The showcase adds `ajv` to its devDependencies, and the template inherits it (Decisions 4) |
| The generator pass 1 left | `scripts/build/emit-definitions.mjs`: `TARGETS` lists three schemas, each given generated `$defs` entries (`kindId`, `featureId`) that properties reach by `$ref`. `scripts/checks/check-definitions.mjs` regenerates in memory and fails on a differing byte. `definitions/kinds.json` lists `blog`, `portfolio`, `docs`, and more; `definitions/features.json` is `{ "features": [] }`, which the generator writes as `{ not: {} }` | The record schema joins `TARGETS` with `['kindId', 'featureId']`. The generator also writes the Go copy (`tool/internal/cairnsite/definitions/kinds.json` and `features.json`, byte copies), and `check-definitions.mjs` compares those too. A Go `embed` can't reach `definitions/` above the module, hence the copy |
| Where `check:definitions` runs | `scripts/checks/gate-table.json:117` runs it for the `showcase`, `exportSurface`, and `scripts` classes; `:24` puts `definitions/` in `showcase`. No workflow names it (`git grep -n "check:definitions" -- .github` prints nothing) | A change under `tool/internal/cairnsite/definitions/` must start it in the fast lane, so `gate-table.json` adds that path to a class that runs it (Task 1). CI coverage is a held-path note (see "Held paths") |
| The Go tests' schema validator | `tool/cmd/cairn/new_e2e_test.go:77-180` `validateAgainstSchema` and `schemaProblems`: a hand subset handling `type`, `const`, `enum`, `properties`, `items`, `required`, `additionalProperties: false`, and `allOf` with `if`/`then`. No `$ref`, no `pattern`, no `format` | The record schema uses only those keywords plus `$ref` to `#/$defs/<name>`. Task 6 teaches `schemaProblems` the local `$ref`, about ten lines of test code. The schema states the origin's shape in `description` and leaves the `https://` rule to the tool's `hostRE` and the doctor, so no keyword passes silently |
| The doctor's labels | `tool/internal/doctor/check.go:117-128`: `label()` returns `conditionText(c.Condition).Title`, and `conditionText` panics when `spine.TextFor` has no entry. No check in the `checks` slice (`:147-160`) uses `spine.ConditionNone`. `json.go:128-142` already writes a `ConditionNone` check with no condition key and no fix. A new condition needs `src/lib/diagnostics/conditions.ts`, outside the row | Two doctor changes (Task 4). The origin mismatch folds into `config.public-origin` (condition `config.public-origin-invalid`, whose remediation already says to set `PUBLIC_ORIGIN`) as a new fail detail naming both origins. The record check is a new check, `config.site-record`, with `ConditionNone` and a `FailTitle`, which `Title` returns on a FAIL when the check has no condition (Decisions 5) |
| The doctor's catalogue | `catalogue_test.go` requires every string const in `check_*.go` in `Catalogue()`, which writes `tool/testdata/copy.golden.md`. `check_labels_test.go:60-62` requires a registry entry for each check's condition. `scripts/checks/tool-check-ids.mjs` holds the twelve `TOOL_CHECK_IDS` that `check-symbols` reads | The new check and details regenerate `copy.golden.md` (outside the row, Decisions 2), add `config.site-record` to `TOOL_CHECK_IDS`, and skip the registry assertion for a `ConditionNone` check, asserting its `FailTitle` instead |
| The template's origin rewrite for demos | `scripts/catalog/demo.mjs:33-47` `writeOrigin` replaces `'https://showcase.test'` in `src/site/cairn.config.ts` and throws when it isn't there; `scripts/catalog/demo.test.mjs` tests it | With the origin in the record, `writeOrigin` sets `deploy.publicOrigin` in `cairn-site.json` by key instead. `scripts/catalog/**` is outside the row and outside `src/lib`, so it doesn't park (Decisions 2) |
| What the template carries | `examples/showcase/.cairn-template.json` excludes 19 paths, none at the root but `README.md` and `playwright.config.ts`. `examples/showcase/src/site/cairn.config.ts:37` `publicOrigin = 'https://showcase.test'`, `:162` `createGithubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })`, `:197` `email: { from: 'cms@showcase.test' }`, `:202` the `aiPosture` comment block, with no posture set | `examples/showcase/cairn-site.json` is emitted to `templates/waymark/cairn-site.json` with no exclude change. It holds exactly today's values, so the public output doesn't move: `kind: "blog"`, `features: []`, `themeOptions: {}`, no `aiPosture`, and those deploy values |
| The literal gates that go stale | `scripts/build/bake-template.test.mjs:19` `TEMPLATE_GITHUB_APP_LITERAL` and `:61` the test that the baked config contains it; the showcase comment at `cairn.config.ts:159` naming `finalize.mjs`; `tool/internal/setup/scaffold/scaffold_test.go` anchor table at `:415` and the anchors at `:59-80` | Each moves to the record: the bake test asserts the baked `cairn-site.json` deploy values, the comment goes, and the scaffold tests read the record |
| Where the rebuild tests run | CI's test workflow runs `npm --prefix examples/showcase run test:unit`, and `examples/showcase/vitest.config.ts` includes `scripts/**/*.test.mjs` inside the template exclude markers. `examples/showcase/scripts/starter-build.test.mjs` already emits the template plus the starter overlay into a temp folder and builds it | A new `examples/showcase/scripts/record-build.test.mjs` follows the same pattern and runs in CI. The template's own `test:unit` doesn't run in CI |
| The written site's own test | `scripts/build/setup-overlay/` holds `.mcp.json`, `README.md`, `.claude/`, and `.github/workflows/{check.yml,deploy.yml}`. Its `check.yml` runs `npm run check`, `npm run check:cairn`, and `npx cairn-guidance check`. `tool/cmd/cairn/new_e2e_fakes_test.go:482-511` `engineTarball` lays the overlay over the template under `waymark/` | The origin test is `scripts/build/setup-overlay/src/site/record.test.ts`, so only a written site carries it: the template's two origins differ by design (`https://showcase.test` and `http://localhost:4173`). A written site's CI runs it once `check.yml` runs `test:unit`; that line is held for the merge packet (Decisions 7) |
| The package name for the Go code | `tool/internal/record` exists: "the site record type the Node CLI writes and the Go tool reads", the setup run's own state | The new package is `tool/internal/cairnsite`, so two "record" packages never meet in one import list |
| The docs brief | `.claude/skills/cairn-writing-docs/SKILL.md` case C sends a new page through `references/new-page.md` (premise, track, page type, outline, intro, draft). `docs/admin/setup-reference.md` is the model reference page, generated by `make reference`. The admin vocabulary in `references/docs-register.md` "Names" bans "schema", "adapter", and "TypeScript" | `docs/admin/site-record.md`, a reference page with one row per field. The page says "the record's rules" where a developer page would say schema, and links the schema file by path. `docs/admin/README.md` lists it under "Also in this track" |
| The field-list check | `scripts/checks/docs-gate.mjs:70-96` runs each docs component by script | `scripts/checks/check-site-record-page.mjs` walks the schema's properties (dotted paths, `deploy.github.appId`) and the page's field table, and fails naming each field one has and the other lacks. It joins `docs-gate.mjs`'s list |

### Recorded searches

| Search at `604b4596d` | Hits | Use |
| --- | --- | --- |
| `git grep -n "cairn.config.ts" -- tool --include=*.go ':!*_test.go'` | `targets.go:23`, `scaffold.go`, `substitute.go`, and `deploy.go` via `SettingsFile()` | Every non-test reader moves to the record (Task 2) |
| `git grep -ln "cairn.config.ts\|appLiteral\|installationId: '" -- 'tool/**/*_test.go'` | `scaffold_test.go`, `runner_fakes_test.go`, `runner_test.go`, `deploy_test.go`, `new_e2e_test.go` | Each test that reads the App identity from `cairn.config.ts` reads the record (Tasks 2 and 6) |
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
- 20: over 220 path minutes at planning parks (twice the design's 110). 190 planned.

The run's ceilings are the ones the design names: the round stops new launches past 1,380 path
minutes, and the usage ceiling is 85 percent of the weekly allowance. Retries go on while each
fixes a traced cause, as `planner.md` "Stops" says, until one of those is reached.

The class is `auth-data`, so this pass doesn't land unattended: the conductor sends it in the
round's close packet. Every other stop the run meets goes through `advisor.md`. The ones foreseen:

| Stop | Answer |
| --- | --- |
| A task needs a file under `src/lib/**` (a new condition, an engine record reader) | Park the pass (standing answer 14). Write `## Stop` to STATUS and end |
| A task needs another `auth-data` path than the two runner test files (`loopback*`, `signin*`, `runner.go`, `cloudflare_oauth*`, `github_app*`) | Stop that edit and ask the advisor. A change to non-test runner code is a scope change and parks the pass |
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
    copy, and a case that edits the copy in a temp root fails naming it; `go test
    ./internal/cairnsite/` asserts the writer refuses `kind: "nope"`.
- `tool/internal/setup/scaffold/substitute.go` holds none of `descriptionLineRE`, `emailFromRE`, `publicOriginTSRE`, `githubAppRE`, and `publicOriginJSONRE`, and no regular expression that matches a `.ts` file. Today: `git grep -c` finds those names on 11 lines, and three of the five rewrite `cairn.config.ts`.
  - Task 2: `git grep -c "descriptionLineRE\|emailFromRE\|publicOriginTSRE\|githubAppRE\|publicOriginJSONRE" HEAD -- tool/internal/setup/scaffold/substitute.go`
    prints nothing, and `git grep -n "\.ts\b" HEAD -- tool/internal/setup/scaffold/substitute.go tool/internal/setup/scaffold/targets.go`
    prints no target; both pasted in the PR.
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
    alone, runs `record.test.ts`, and asserts a failure naming both origins.
- A test records every value the run hands to the tool's secret store, through the fake store the tool's tests already use, and finds none of them in the record.
  - Task 6: the e2e reads `r.c.KeyringEntries()` after the run and asserts no entry's value
    appears in the bytes of `cairn-site.json`, with at least one entry present.
- Each row of "How it fails" that names `cairn-site.json` has a test.
  - Missing, not JSON, or failing its schema: Task 3's `examples/showcase/src/site/record-check.test.ts`
    runs the plugin's check on each and asserts the one line naming the field; Task 4's
    `check_siterecord_test.go` asserts the doctor's line for each. (`cairn add` is pass 6.)
  - The origin mismatch: Task 5 (the site's test) and Task 4's `check_origin_test.go` case naming
    both values.
  - A schema or the Go copy differs from `definitions/`: Task 1's `emit-definitions.test.mjs` case.
- `docs/admin/` holds one reference page for the record that lists every field, and a check fails when the page's field list differs from the schema's. `npm run check:docs-gate` and `vale` pass, and a fresh `docs-fact-checker` returns no finding on it.
  - Task 7: `docs/admin/site-record.md`; `check-site-record-page.mjs` in the docs gate, with a
    test case that drops one row and fails; `npm run check:docs-gate` exit 0; the fact-checker's
    JSON with no finding, quoted in the PR.
- `make -C tool check` passes.
  - Tasks 2, 4, and 6 run it on the light lane; CI's `tool` workflow on the head.

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
pays its own setup. Push once Task 1 lands, which opens the draft PR, and push after each task
after it.

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

`aiPosture` is optional, `invite` or `decline`. `scaffold.composer` is optional and absent until
pass 4 writes a composer (Decisions 8). The showcase's and the template's `scaffold.engine` is the
root `package.json` version at the base; the tool writes the engine version it installs. The keys
are written in this order, two-space indented, with a final newline, by both the emitter and the
Go writer, so a written record diffs cleanly against the template's.

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

### Task 1: the schema, the generator, and the Go copy (30 min)

1. `schema/cairn-site-1.schema.json`, draft 2020-12, `$id` `https://cairn.pub/schemas/cairn-site/1.json`,
   `additionalProperties: false` at every object, `required` `["kind", "features", "themeOptions", "scaffold", "deploy"]`,
   `deploy` requiring `publicOrigin`, `emailFrom`, and `github`, and `github` requiring all five
   strings. `kind` is `{ "$ref": "#/$defs/kindId" }`, `features` an array of `featureId` refs,
   `themeOptions` an object of strings, numbers, and booleans, `aiPosture` the two-value enum.
   Each property carries a `description` the reference page draws on. Use only the keywords the
   mechanism table lists.
2. `scripts/build/emit-definitions.mjs`: append the schema to `TARGETS` with
   `['kindId', 'featureId']`, and add the byte copies of `definitions/kinds.json` and
   `definitions/features.json` to `tool/internal/cairnsite/definitions/`, written by
   `writeSchemas` and returned by `buildSchemas` under their repo paths, so
   `check-definitions.mjs` compares them with no other change. Fix its OK line's count. Run
   `node scripts/build/emit-definitions.mjs` and commit the outputs.
3. `scripts/checks/gate-table.json`: put `tool/internal/cairnsite/definitions/` in a class whose
   checks include `check:definitions`.
4. `scripts/build/emit-definitions.test.mjs`: Ajv 2020 rejects an unknown top-level key, `kind:
   "nope"`, and a record with no `deploy.publicOrigin`, and accepts the showcase's record; a temp
   root whose Go copy differs fails `checkDefinitions` naming `tool/internal/cairnsite/definitions/kinds.json`.
5. `tool/internal/cairnsite` (new package): `//go:embed definitions/*.json`; a `Record` struct in
   the key order above with `omitempty` on `aiPosture` and `scaffold.composer`; `Decode(data)`
   with `DisallowUnknownFields` that returns an error naming the field (`cairn-site.json:
   deploy.publicOrigin is required`, `cairn-site.json: kind "nope" is not one of blog, portfolio,
   ...`); `Encode(r)` that refuses a kind outside the embedded list and returns the bytes with a
   final newline. Table tests for each refusal and a round trip of the showcase's record byte for
   byte.

### Task 2: the scaffold writes the record (pair with Task 3, 30 min)

1. `substitute.go`: delete the five expressions, `editCairnConfig`, `editInstallation`,
   `aiPostureComment`, `githubAppTemplate`, and `githubApp`. Add `editSiteRecord` to `firstPass`:
   decode the template's `cairn-site.json`, set `aiPosture`, `scaffold.engine`, and the whole
   `deploy` from `Site`, encode. Add `editRecordDeploy` to `secondPass`, which sets `deploy` again
   through the same writer.
2. `editSiteConfig`: the description by node position (mechanism table), keeping the site-name
   swap and the duplicate-key check.
3. `editWrangler`: the exact swap of the template's `PUBLIC_ORIGIN` key-value text, then the parse
   back through `doctor.ReadWranglerConfig`'s reader. If importing `internal/doctor` from the
   scaffold makes a cycle, move `stripJsonc` and `factsFromJsonc` to a small file both can import
   inside `tool/internal`, with no behavior change.
4. `targets.go`: `SiteRecord: "cairn-site.json"` replaces `CairnConfig`. `scaffold.go`:
   `SettingsFile()` returns it, `NamesApp` decodes the record at the commit and compares the five
   GitHub fields, `UpdateInstallation` writes `installationId` through the writer and commits the
   record alone. Doc comments say the record, not the config.
5. Tests: `scaffold_test.go` moves its anchors to the record and asserts the description edit
   leaves every other line of `site.config.yaml` byte-identical; `runner_fakes_test.go` and
   `runner_test.go` model the record (`const siteRecord = "cairn-site.json"`, the fake finalize
   writes the record's `deploy.github`, `namesInstall` decodes it); `deploy_test.go` follows. No
   non-test runner code changes.
6. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 3: the showcase, the template, and the build check (pair with Task 2, 30 min)

1. `examples/showcase/cairn-site.json` with today's values (the shape above).
2. `examples/showcase/src/site/cairn.config.ts`: import the record (`../../cairn-site.json`),
   declare its interface, cast once, and read `publicOrigin`, `email.from`, the five
   `createGithubApp` values, and `aiPosture` from it. Delete the `finalize.mjs` comment and the
   `aiPosture` comment block, and say in one comment that the tool writes the record and the
   developer may edit it.
3. `examples/showcase/vite.config.ts`: the record check plugin (mechanism table), before
   `cairnManifest()`, exported from a new `examples/showcase/src/site/record-check.ts` so its test
   can call it. `ajv` joins the showcase's devDependencies at `^8.20.0`; refresh the lockfile with
   `npm install --prefix examples/showcase`, bare.
4. `examples/showcase/src/site/record-check.test.ts`: missing file, invalid JSON, an unknown key,
   and a missing `deploy.publicOrigin` each give one line naming the field.
5. `npm run emit:template`, then `npm run check:template`. `scripts/build/bake-template.test.mjs`
   drops `TEMPLATE_GITHUB_APP_LITERAL` and asserts the baked record's `deploy.github`.
6. `scripts/catalog/demo.mjs` `writeOrigin` sets `deploy.publicOrigin` in `cairn-site.json` by
   key, and throws when the record lacks it; `demo.test.mjs` follows.
7. `npm --prefix examples/showcase run build` and `npm --prefix examples/showcase run test:unit`.

### Task 4: the doctor (pair with Task 5, 20 min)

1. `check_origin.go`: when `wrangler.jsonc` sets `vars.PUBLIC_ORIGIN` and `cairn-site.json` sets
   `deploy.publicOrigin` and the two differ, the check fails with the detail
   `PUBLIC_ORIGIN in wrangler.jsonc is <a>, but deploy.publicOrigin in cairn-site.json is <b>`.
   Compare the wrangler var only, never the environment fallback. A site with no record keeps
   today's behavior.
2. `check_siterecord.go`: `config.site-record`, `ConditionNone`, `PassTitle` `Site record
   validates`, `SkipTitle` `Site record`, `FailTitle` `Site record does not validate`. It fails
   with `cairnsite.Decode`'s line for a bad record, and skips when no record exists, so a site
   from before this pass isn't told it's broken. `check.go`: `Check` gains `FailTitle`, and
   `Title` returns it on a FAIL when `Condition` is `ConditionNone`.
3. Add `config.site-record` to `checks` after `configSiteConfig`, and to
   `scripts/checks/tool-check-ids.mjs`. Update the "twelve checks" comments.
4. Tests: `check_siterecord_test.go` (missing, not JSON, unknown key, bad kind, no origin, valid);
   `check_origin_test.go` (mismatch, match, no record); `check_labels_test.go` asserts a
   `ConditionNone` check's `FailTitle`. Regenerate `tool/testdata/copy.golden.md` with the
   catalogue's update flag.
5. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 5: the rebuild tests and the site's origin test (pair with Task 4, 25 min)

1. `scripts/build/setup-overlay/src/site/record.test.ts`: read `cairn-site.json` and
   `wrangler.jsonc` (comments stripped), and fail with
   `deploy.publicOrigin in cairn-site.json is <b>, but PUBLIC_ORIGIN in wrangler.jsonc is <a>` when
   they differ. Check the starter-overlay test and `pack-engine-template` lay `src/` from the
   overlay; widen them in `scripts/build/` if not.
2. `examples/showcase/scripts/record-build.test.mjs`, built on `starter-build.test.mjs`'s emit:
   1. Three builds with the record's `aiPosture` set to `invite`, to `decline`, and removed, each
      after `npx cairn-manifest` rewrites the facts. Assert each `robots.txt` carries the posture's
      directive, and the unset one equals the base template's.
   2. One build with every `deploy` value changed in the record alone. Find the new origin in a
      prerendered page's canonical link and the feed, and the new sender and each GitHub value in
      the built server output under `.svelte-kit/cloudflare`.
   3. Lay the overlay, set `PUBLIC_ORIGIN` to the record's origin, run `record.test.ts` with
      `vitest run` and expect a pass, then change the record's origin alone, run again, and expect
      a failure whose output names both origins.
   Fold builds where one build can carry two assertions; the test's timeout follows
   `starter-build.test.mjs`.
3. `npm --prefix examples/showcase run test:unit`.

### Task 6: the end-to-end proof (pair with Task 7, 20 min)

1. `new_e2e_test.go`: `schemaProblems` resolves a local `$ref` to `#/$defs/<name>`. 
2. `TestNewE2EApplyCreatesTheSiteFromTheEditedPlan`: after the run, read
   `example-site/cairn-site.json`, validate it against `schema/cairn-site-1.schema.json`, assert
   `aiPosture` equals the run's posture answer and `deploy` equals the run's values; walk every
   `.ts` file under the written site and compare it byte for byte with the same path in the
   tarball tree (template plus overlay); read `r.c.KeyringEntries()`, assert at least one, and
   assert no value appears in the record's bytes.
3. `CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check'`.

### Task 7: the reference page and the corrections (pair with Task 6, 25 min)

1. Load `cairn-writing-docs`, case C. `docs/admin/site-record.md`, a reference page: what the
   record is and who writes it, one table row per field (dotted path, what it holds, who sets it,
   whether it's required), what it leaves out (the theme, the Cloudflare names, the site name,
   any secret), and that the public origin is stated twice and the site's test and `cairn doctor`
   catch a mismatch. List it in `docs/admin/README.md`.
2. `scripts/checks/check-site-record-page.mjs` (mechanism table), in `docs-gate.mjs`'s list, with
   a test case in `scripts/build/emit-definitions.test.mjs` or its own `node --test` file run by
   the docs gate (root `package.json` is outside the row).
3. Correct what the change makes wrong, from the recorded searches: the setup pages and
   `is-it-working.md` sentences about `cairn.config.ts` holding the origin, sender, App identity,
   or posture; `skills/cairn-extending-a-site` references the same; the doctor section for
   `config.site-record` if `check:readiness` asks for one.
4. `MIGRATION-NOTES.md`: an existing site keeps working with no record until it adds one, and the
   steps to add one. `CHANGELOG.md` under `## Unreleased`: the record, the schema, the doctor
   check, and a `Consumers must:` line only if a step is required (none is: the record check
   skips with no record, and the engine reads nothing new).
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
   `NamesApp`, and the record's no-secret test. Fold every finding, then run the fast lane again.

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
  `npm run check:definitions`, so the Go copy and the schemas are checked on CI and not only in the
  fast lane.
- `.github/workflows/tool.yml`: add `definitions/**` to its path triggers, so a definitions edit
  runs the Go tests that read the copy.
- `scripts/build/setup-overlay/.github/workflows/check.yml` is not a held path, but it is every
  written site's CI. Per the advisor, it stays as it is, and the merge packet proposes adding
  `npm run test:unit` so a written site's CI runs `record.test.ts` (Decisions 7).

## Decisions

1. `[advisor]` The class rises from `ordinary` to `auth-data`. Moving the settings file from
   `cairn.config.ts` to the record changes `tool/internal/setup/runner_fakes_test.go` and
   `runner_test.go`, which the path map classes `auth-data` under `setup/runner*`. The design
   foresaw this for passes 4 to 6 ("how the tool writes a site's deploy details"). No non-test
   runner code changes. `conductor-foundation` was told on 2026-11-16. The pass lands only through
   the round's close packet.
2. `[file-list]` The row leaves out files the change needs: `scripts/catalog/demo.mjs` and
   `demo.test.mjs` (the demo's origin write), `tool/testdata/copy.golden.md` (regenerated from the
   doctor's catalogue), `tool/internal/doctor/**` (inside `tool/internal/**`, named here because
   the design's note says "the scaffold and the embedded copy"), `MIGRATION-NOTES.md`,
   `CHANGELOG.md`, and `BACKLOG.md`. None is under `src/lib/**`, so none parks the pass.
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
   needs `src/lib/diagnostics/conditions.ts` (standing answer 14). `json.go` already writes a
   `ConditionNone` check, so the one change is a `FailTitle` that `Title` reads for such a check,
   where `label()` would panic today. The record check skips when no record exists, so it never
   tells a pre-record site that it's broken.
6. `[advisor]` `PUBLIC_ORIGIN` is written by an exact swap of the template's key-value text and
   checked by parsing the file back, since `go.mod` (outside the row) has no JSONC encoder and the
   template's comments must survive. The description is set at its YAML node's line and column,
   since a `yaml.v3` round trip re-indents the comments.
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
11. An existing site with no record keeps working: the engine reads nothing new, the site's
    `cairn.config.ts` is the site's own, and the doctor skips. So `CHANGELOG.md` carries no
    `Consumers must:` line.

## Path

| Task | Minutes |
| --- | --- |
| 0 base builds, scripts, screenshots, hash | 25 |
| 1 schema, generator, Go copy, `cairnsite` | 30 |
| 2 and 3, as a pair | 30 |
| 4 and 5, as a pair | 25 |
| 6 and 7, as a pair | 25 |
| 8 head build, parity, three verifiers | 35 |
| 9 whole-branch and security reviews and their folds | 10 |
| 10 delete, hand over (CI off the path) | 10 |
| Path (pairs overlap) | 190 |

Each `cairn-implementer` worktree pays its own setup (two `npm ci` runs and a package), which the
task minutes carry.

## Planning misses

- `[file-list]` `scripts/catalog/demo.mjs`, the doctor, and the catalogue golden (Decisions 2).
- `[mechanism]` The runner test fakes that make the class `auth-data` (Decisions 1).
- `[mechanism]` The doctor's `ConditionNone` panic (Decisions 5).
- `[design-gap]` The composer version and the record's nesting (Decisions 8 and 9).
- `[estimate]` 190 against 110: the parity builds every pass owes, the rebuild tests, and the doctor.

## Review folded

Filled after the `standards:plan-reviewer` read.
