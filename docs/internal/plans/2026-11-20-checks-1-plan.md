# Pass `checks-1`: one list of checks and one runner

Initiative: theme-garden
Round: checks
Pass: checks-1

This pass gives cairn one list of its checks and one runner for them. `scripts/checks/registry.mjs`
names every check, the command it runs, whether it needs a fresh `dist`, which buckets select it,
and which groups it belongs to. `scripts/checks/run.mjs` builds `dist` once when a check needs it
and runs one check or one group. `package.json`, the close gate, the docs gate, the gate tiers, and
the fast lane all read the registry. No check changes its verdict, and CI isn't touched: the workflow
files belong to `checks-3`.

The route is `~/Projects/initiatives/theme-garden/specs/2026-11-17-route-rounds.md`, round 1
(lines 340 to 381) and "What every pass holds" (lines 315 to 336). The stopped structure design's
`checks-1` items bind this pass under rule 4:
`~/Projects/initiatives/theme-garden/specs/2026-11-17-structure-round-design.md`, "### `checks-1`"
(lines 589 to 616) and its backlog rows (lines 1198 to 1202). The route target "Checks and their
runner" is in `2026-11-17-route-target.md`.

Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/checks-1`, branch `checks-1`, cut
from `main` at `e53d44427` (the merge of #259). Class `runner`. Base `BASE=e53d44427`. Every
command runs from the worktree root. `main` has moved one commit since, to `edd7acbdf`, which
changes `docs/STATUS.md` only.

Planned work is 370 minutes and the planned path is 551 (work times 1.3 plus 70). The tasks below
sum to 370. The design figure is 260 and the brief's estimate 416. A run whose path passes 832
minutes stops through `advisor.md`.

## Pre-flight

Owner steps: none. The pass needs no secret, no sign-in, no dialog, and no change on Cloudflare,
GitHub, or npm.

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 146 rows from 2026-11-01 to 2026-11-20; the file holds
  nothing older). The classes that touch this pass, with the route each takes, are in "Auto-mode
  routes" below.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), saved beside this plan as
  `2026-11-20-checks-1-plan-review.md` and folded under "Plan review fold".
- Evidence: the mechanism table below. Every row is a probe run in this worktree at `e53d44427`
  on 2026-11-20, or a quoted source line.
- Held files: none is edited. `.github/workflows/**`, `.github/ci-green.json`, and
  `scripts/release/**` stay as they are (standing answer 24), so the pass lands by
  `approval-packet` step 1 once the closing review accepts. No setting, hook, or skill outside the
  repo is edited (standing answer 19).

### Auto-mode routes

| Refused class (rows since 2026-10-21) | Route this pass takes |
| --- | --- |
| Classifier unavailable (52) | Retry the same call once after a short wait. |
| Destructive or Unwanted (23): `git stash drop`, `git commit -qam`, `pkill` | No stash. Commit by named path, never `-a` or `git add -A`. Never stop a process. |
| Self-Modification (11), Undermining Oversight (6): a node-heredoc edit of several files | Edit every file with the Edit tool, one file per call, never in a `sed`, `python`, or `node` loop. `.claude/settings*` is never edited. |
| Server-side dangerous (11), Interfere With Workloads (11): `kill`, `claude stop`, `sleep 90` | Never stop a process or a session. Wait for another session's build with a Monitor until-loop on `pgrep -f 'vite build\|vitest'`. |
| Merge Without Review (3) | The executor merges nothing. The conductor lands the PR. |
| Auto-Mode Bypass (3): `gh workflow run` | Never trigger a workflow. CI runs from the push. |

## Mechanism table

| # | Fact | Source |
| --- | --- | --- |
| M1 | `CLOSE_COMPONENTS` is one frozen list of 34 commands: `npm run check`, 30 `npm run check:*`, and three `npm --prefix examples/showcase run ...`. | `scripts/checks/close-prebuilt.mjs:34-69` |
| M2 | `closeSteps` strips `PACKAGE_PREFIX` (`'npm run package && '`) from a script body and refuses a body that builds twice or builds anywhere but its start. | `close-prebuilt.mjs:26`, `:79-102` |
| M3 | `runStep` changes only `PATH`, so `npm run check` under the light lane gets no `NODE_OPTIONS` heap (#370). | `close-prebuilt.mjs:208-212` |
| M4 | `runClose` runs every step past a failure, prints `== <label> ==`, `== seconds per check ==`, then `check:close: OK (N check(s))` or `check:close: N check(s) failed: ...`. | `close-prebuilt.mjs:151-196` |
| M5 | The held `scripts/release/preflight.mjs:14` imports `missingInstalls` from `close-prebuilt.mjs`, so that file and its export stay. | `grep -n missingInstalls scripts/release/preflight.mjs` |
| M6 | `docs-gate.mjs` builds 13 steps. `--page` replaces Vale's targets (`docs README.md examples/showcase/README.md`) with the page and appends the page to `check:tellgrader`'s args; `check:vale-rules` runs in tree mode only. `--prebuilt` skips the build. | `scripts/checks/docs-gate.mjs:27-96` |
| M7 | Nothing outside the package script, its test, `close-ci-coverage.test.ts`, `gate-tier.mjs`, `close-prebuilt.mjs`, `pass-gate-tiers.md`, and a comment in the held `test.yml:154` names `docs-gate.mjs`. No workflow calls it directly; `test.yml:158` runs `npm run check:docs-gate`. | `grep -rln docs-gate.mjs` (9 files) |
| M8 | `gate-tier.mjs` imports `CLOSE_COMPONENTS`, `PACKAGE_PREFIX`, and `closeSteps` (`:62`). It builds each check's script closure from the close bodies and `extraCommands` (`:278-299`), sends a package-prefixed check with no table row to the `engine` bucket (`:394-395`), emits `npm run check:close` or `npm run check:close -- <labels>` (`:452-453`), runs `DIST_FREE_EXTRAS` beside the dist chain (`:164`, `:709`), and always runs `npm run check` after the close runner (`:705`). | `scripts/checks/gate-tier.mjs` |
| M9 | The engine tier string is pinned byte for byte: `'npm run check:docs-gate && npm run check && npm run test:node-projects && npm run test:component -- --no-file-parallelism'`. | `src/tests/unit/gate-tier.test.ts:520-524` |
| M10 | The full tier is `${ADMIN_VISUAL_GATE} && npm run check:comments && npm run check:surface && ${CI_CHECKS} && npm --prefix examples/showcase run test:e2e`, and "the full tier against CI" holds it to `test.yml`'s steps through `CI_EQUIVALENTS`. | `gate-tier.mjs:90-118`, `gate-tier.test.ts:600-640` |
| M11 | `test.yml` runs `npm run check` at `:51` before its one `npm run package` at `:63`, then calls nine dist checks as bare `node scripts/checks/*.mjs` and 13 `npm run check:*` scripts. Of those 13 only `check:package` and `check:docs-gate` build today; `design.yml:52` runs `npm run check:public-tokens`, which builds. `test.yml` also runs `npm run test:emit`, `test:theme`, `check:theme -- --catalog`, and `test:catalog`. | `.github/workflows/test.yml`, `design.yml` |
| M12 | `node scripts/theme/check.mjs` with no argument prints its usage and exits 2. CI and the full tier run it as `npm run check:theme -- --catalog`. | probe; `test.yml:128`, `gate-tier.mjs:113` |
| M13 | The four homes hold 45 distinct names: the `checks` keys of `gate-table.json` (40), its `extraCommands` keys (7), `CLOSE_COMPONENTS` (34), the docs-gate labels (13), and the `check:*` scripts (34). Eight have no root script: the three showcase commands, `showcase:test:unit`, `check:version-rise`, `check:tellgrader`, `check:vale-rules`, and `check:site-record-page`. | node probe over the four homes |
| M14 | `test:theme` is in no home: no `gate-table.json` row selects it (#485). | `gate-table.json`; `gate-tier.mjs:112` |
| M15 | `plugins/cairn` and `scripts/build/setup-overlay/{README.md,src}` exist at the base, so #429 and #406 describe live paths. | `ls` |
| M16 | `gate-mail.test.ts:161` and `:174` rewrite the front server's URL to `localhost`, which needs a name lookup; every other test in the file uses `127.0.0.1`. These are #489's two mail tests. | `grep -n localhost src/tests/unit/gate-mail.test.ts` |
| M17 | `workflow-yaml.test.ts:567` pins `npm run test:theme` and `npm run check:theme -- --catalog` as unconditional steps in `test.yml`. That file is `checks-3`'s, and it still passes because `test.yml` doesn't change. | `src/tests/unit/workflow-yaml.test.ts:567` |
| M18 | The comment lint names `close-prebuilt.mjs` and `gate-tier.mjs` in three places: `eslint.config.js:47-48`, `scripts/checks/check-comments.sh:10`, and the `lint` script. | grep |
| M19 | `fast-lane.mjs` has no `check:` text and reads `gate-tier.mjs`. | `grep -c check: scripts/checks/fast-lane.mjs` prints 0 |

## Searches

Recorded at the base, in this worktree, on 2026-11-20.

| Search | Hits |
| --- | --- |
| `grep -c "check:" scripts/checks/close-prebuilt.mjs scripts/checks/gate-tier.mjs scripts/checks/gate-table.json` | 38, 31, 38 |
| `grep -cE 'check[:-][a-z-]+' scripts/checks/docs-gate.mjs` | 22 |
| `grep -c 'CLOSE_COMPONENTS = Object.freeze(\[' scripts/checks/close-prebuilt.mjs` | 1 |
| `check:*` scripts in `package.json`; of them, bodies holding `npm run package` | 34; 15 |
| `grep -c -E "npm run check:\|scripts/checks/" .github/workflows/test.yml .github/workflows/design.yml` | 23, 1 (`checks-3`'s) |
| Files naming `docs-gate.mjs` | 9: `package.json`, `pass-gate-tiers.md`, `test.yml`, `gate-tier.mjs`, `docs-gate.mjs`, `close-prebuilt.mjs`, and the tests `close-ci-coverage`, `gate-tier`, `docs-gate` |
| Files naming `close-prebuilt` | 11: `package.json`, `eslint.config.js`, `pass-gate-tiers.md`, `BACKLOG.md`, `gate-tier.mjs`, `check-comments.sh`, `close-prebuilt.mjs`, `scripts/release/preflight.mjs`, and the tests `close-ci-coverage`, `gate-tier`, `close-prebuilt` |
| Test cases at the base: `close-prebuilt`, `docs-gate`, `close-ci-coverage`, `gate-tier`, `fast-lane`, `gate-mail` | 21, 10, 2, 113, 6, 25 |
| Retired-form search (`ready.md`): `CLOSE_COMPONENTS`, `extraCommands`, `gate-table`, `close-prebuilt`, `check:close --`, `docs-gate.mjs` over `~/.dotfiles/claude`, every `~/Projects/*/.claude` and `~/Projects/*/skills`, and `~/Projects/initiatives/*/prompts` | `CLOSE_COMPONENTS` and `extraCommands`: 0. `gate-table` and `close-prebuilt`: only `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md` in this repo. The initiative prompts name the `gate-table.json` path only, and the file stays. |

## Skills the executor loads

- `pass-core` with `references/executor.md`, `references/round-run.md`, and
  `references/advisor.md`; then `cairn-pass` and the repo's `cairn-running-passes`.
- `cairn-writing-engine-code` before T2a, T3, and T4, for the idiom charter and the traps.
- `standards:ts-conventions` for every doc comment in `registry.mjs`, `run.mjs`, and the files
  T2b and T4 edit.
- `standards:backlog-sweep` "Landing the verdicts" for T5's `BACKLOG.md` edits.
- `register-check` on the words a person reads: `run.mjs`'s output and errors, and the
  `pass-gate-tiers.md` and `cairn-releasing` edits. `writing-voice` for the PR body, whose opening
  paragraph follows `~/.claude/docs/voice/written-for-people.md`.
- `standards:log-issue` for anything found beyond the pass.

## The registry

`scripts/checks/registry.mjs` exports two frozen values and nothing else.

`CHECKS` is an array of rows in run order. The order is `CLOSE_COMPONENTS`'s order, then the rows
outside the close in the order `CI_CHECKS` names them, then the docs-only rows. Each row has these
fields:

| Field | Meaning | Replaces |
| --- | --- | --- |
| `name` | The npm script that runs the row: `node scripts/checks/run.mjs <name>`. | the labels in all four homes |
| `command` | The shell command the runner runs, with no leading build. | the script bodies, `extraCommands`, the docs-gate `node(...)` calls |
| `build` | `true` when the row reads `dist` and needs it built first. | `PACKAGE_PREFIX` on a script body |
| `buckets` | The `gate-table.json` buckets that select the row in the fast lane. Absent means none, except that a `build: true` row with no buckets falls to `engine`, as M8's package-prefix rule does today. | `gate-table.json` `checks` |
| `groups` | The groups the row belongs to: `close`, `docs-gate`, `full`. | `CLOSE_COMPONENTS`, `buildSteps`, `CI_CHECKS` |
| `groupArgs` | Words a group run appends, by group. Only `check:theme` has one: `{ full: ['--catalog'] }`. | the `-- --catalog` in `CI_CHECKS` |
| `targets` | The default trailing words a `--page` run replaces with the page. Vale has the three default paths, and `check:tellgrader` has none. | `DEFAULT_VALE_PATHS` and the page handling in `buildSteps` |
| `page` | `'narrow'` for a row whose targets the page replaces, `'skip'` for a row that runs in tree mode only (`check:vale-rules`). Absent means the row runs unchanged under `--page`. | the `page ? ... : ...` branches in `buildSteps` |
| `distFree` | `true` for a row outside the close that never reads `dist`, so the fast lane runs it beside the dist chain. | `DIST_FREE_EXTRAS` |

`GROUPS` maps a group name to its npm script: `{ close: 'check:close', 'docs-gate':
'check:docs-gate', full: null }`. The `full` group has no script: only `gate-tier.mjs` reads it.

The rows, 44 in all:

- The 32 existing `check:*` scripts that are checks, under their own names. `check:close` and
  `check:docs-gate` are groups, not rows.
- Four rows under the root script that runs them today: `check`, `test:emit`, `test:catalog`, and
  `test:theme`. Each keeps its name, because the held `test.yml` calls all four and the pinned
  engine string calls `check`. The script becomes `node scripts/checks/run.mjs <name>` and the
  body moves into the row. No name gets a twin.
- Eight rows for the names with no root script (M13), each with a new script of the same name:
  `check:version-rise`, `check:tellgrader`, `check:vale-rules`, `check:site-record-page`, and four
  renamed from a raw command: `check:showcase-types` (`npm --prefix examples/showcase run check`),
  `check:showcase-cairn` (`... run check:cairn`), `check:showcase-format` (`... run format:check`),
  and `check:showcase-unit` (`... run test:unit`, the `showcase:test:unit` label).

After the pass `package.json` has 42 `check:*` scripts: the 34 at the base and the eight new ones.
Every `check:*` script and the four named root scripts are exactly `node scripts/checks/run.mjs
<name>`, and no `check:*` script holds `npm run package`. `test:reskin` and `test:theme-fixture`
are not checks, are in no home, and keep their bodies.

The type check's row gives `svelte-check` the heap #370 asks for:
`NODE_OPTIONS=--max-old-space-size=6144 svelte-check --tsconfig ./tsconfig.json && tsc -p
src/tests/types/tsconfig.json`. The variable lives in the row's command, so every caller of `npm
run check` gets the measured workaround and the release skill's lane note can go.

## The runner

`scripts/checks/run.mjs` takes these forms:

```
node scripts/checks/run.mjs --list
node scripts/checks/run.mjs [--prebuilt] <row> [<word> ...]
node scripts/checks/run.mjs [--prebuilt] <group> [<row> ...] [--page <path>]
```

- `--list` prints one row name per line, in registry order, and exits 0.
- A row run appends the words after the name to the row's command, the way `npm run <script> --
  <words>` appends today. A developer's `npm run check:theme -- themes/x` and
  `npm run check:vale -- docs/x.md` behave as they do now.
- A group run takes row names after the group and runs only those, in registry order, refusing an
  unknown name before the build (today's `selectSteps`). `--page <path>` is accepted by the
  `docs-gate` group only, and applies the rows' `page` and `targets` fields. `groupArgs` for the
  group are appended to the row's command.
- `--prebuilt` skips the build. Without it, the runner runs `npm run package` once before the
  first row when any selected row has `build: true`, and not at all otherwise.
- Before the build it runs `missingInstalls()`, imported from `close-prebuilt.mjs`, as `runClose`
  does today.
- Every selected row runs even after one fails. After each row the runner prints `<name>: OK` or
  `<name>: FAIL`. A group run ends with today's lines, keyed on the group's script:
  `== seconds per check ==`, then `<script>: OK (N check(s))` or
  `<script>: N check(s) failed: <names>`. A row run ends with its one verdict line. The exit
  code is 0 when the build and every row passed, else 1.
- Each row runs through `sh -c` with `node_modules/.bin` on `PATH`, as `runStep` does today.

The module exports its run function, which takes rows and the seams `runClose` takes today
(`build`, `run`, `now`, `out`, `err`, `exists`), so the tests can drive it with fixture rows. It
exports no flag or option beyond the forms above.

`close-prebuilt.mjs` keeps `missingInstalls` and its header comment, rewritten to say what the
file holds and why it stays (the held release preflight imports it). Everything else in it moves
to `run.mjs` or the registry: `PACKAGE_PREFIX`, `CLOSE_COMPONENTS`, `closeSteps`,
`selectSteps`, `runClose`, `buildDist`, `runStep`, and `main`. `docs-gate.mjs` is deleted; its
behavior is the `docs-gate` group.

## Tasks

T1 runs first and alone. T2a and T3 then run together as a pair, since they own disjoint files.
T2b, T4, T5, and T6 run in that order, each after the one before. Every task goes to a
`cairn-implementer` in its own worktree off the pass branch, and each dispatch names its model
and effort. After each task, run `npm run lane:fast -- --range e53d44427..HEAD`.

### T1. The base record (30 minutes; Sonnet at `medium`)

1. At the base, run `npm run check:close` once and record its last line. The structure design
   expected `check:close: OK (36 check(s))`; M1 says 34.
2. Commit `src/tests/unit/fixtures/check-names-base.json`, built by a one-off node read of the four
   homes at the base (the M13 probe), never by hand. It holds:
   - `homes`: the sorted names of each home under the keys `gateTableChecks`,
     `gateTableExtraCommands`, `closeComponents` (each entry with `npm run ` removed),
     `docsGate`, and `checkScripts`;
   - `close`: the 34 close labels in run order, as `check:close` printed them at the base;
   - `renamed`: the four raw-command names and their rows, from "The registry".
3. Record every Today figure from "Searches", plus step 1's line, in the commit message. T6 copies
   them into the PR's `## Acceptance`.

### T2a. The registry and the runner (90 minutes; Opus at `medium`)

1. Write `scripts/checks/registry.mjs` as "The registry" sets out. Each row's `command` is the
   base body of its script with the build removed, the `extraCommands` value, or the docs-gate
   call. Each row's `buckets` is copied from `gate-table.json`'s `checks` map unchanged, except
   the two fold changes in T4.
2. Write `scripts/checks/run.mjs` as "The runner" sets out, moving `runClose`'s loop and
   `runStep`'s env from `close-prebuilt.mjs` and `buildSteps`'s page handling from
   `docs-gate.mjs`. Doc comments follow `standards:ts-conventions`, with no em dash.
3. Add `src/tests/unit/check-registry.test.ts`. Its cases:
   - Every `check:*` script in `package.json`, and each of `check`, `test:emit`, `test:catalog`,
     and `test:theme`, is exactly `node scripts/checks/run.mjs <its name>` and names a row or a
     group. Every row and every group with a script has that script. Prove each direction once
     by adding a stray entry and watching the case fail, then remove the stray and record both
     failures in the task report (structure item 4).
   - Every name in `check-names-base.json`'s `homes`, mapped through `renamed`, is a row name or
     a group script, and every row name is in `homes` or is `test:theme` (structure item 1).
   - The close group's rows, mapped back through `renamed`, equal the fixture's `close` list in
     order (route item 2's second test).
   - No `check:*` script holds `npm run package` (structure item 3).
4. Add `src/tests/unit/check-run.test.ts`. Its cases:
   - A group run over three fixture rows, two of them `build: true`, calls the `build` seam once
     (route item 2's third test). With `--prebuilt` it calls it zero times, and with no
     `build: true` row it calls it zero times.
   - A spawned fixture script calls the exported run function with three rows whose middle row
     runs `node -e "process.exit(1)"`. The process exits non-zero, its output holds
     `<middle row>: FAIL`, and the third row's verdict line follows it (route item 6).
   - A `docs-gate` group run with `--page docs/x.md` gives Vale `docs/x.md` in place of its
     targets, gives `check:tellgrader` the page, and leaves out `check:vale-rules`.
5. Run `npm run lane:fast -- --range e53d44427..HEAD` and commit the two modules and two tests.

### T3. Three folds outside the registry (50 minutes; Sonnet at `medium`; pair with T2a)

1. **#406.** In `scripts/checks/check-symbols.mjs`, make `pathExists` resolve a site path against
   `scripts/build/setup-overlay/` as well as the template. Add a test case beside the existing
   check-symbols tests for a code span that names a path present only in the overlay. Leave
   `deploys.md`'s wording as it is.
2. **#540, part (a).** In `scripts/checks/check-definitions.mjs`, report the definitions'
   problems and the per-file drift in one run, in place of returning after the problems. Add a
   case for a run that has both. Parts (b) to (e) stay open.
3. **#489, the mail half.** First confirm that `gate-mail.test.ts:161` and `:174` are the two
   tests that resolve a name (M16): run them with `NODE_OPTIONS=--dns-result-order=ipv4first`
   absent and the host rewritten to a name that can't resolve, or read the trace. Then keep the
   two hosts different with no lookup: bind the redirecting server to a second loopback literal,
   `127.0.0.2`, which Linux routes to `lo`, and use that literal in place of `localhost`. The
   actionlint half belongs to `checks-3` (its item 5).
4. Run the fast lane and commit the three folds as three commits.

### T2b. Scripts, consumers, and the two old runners (40 minutes; Sonnet at `medium`)

1. Rewrite `package.json`'s scripts as "The registry" sets out: every `check:*` script, the four
   named root scripts, and the eight new scripts. `check:close` becomes `node
   scripts/checks/run.mjs close` and `check:docs-gate` becomes `node scripts/checks/run.mjs
   docs-gate`.
2. Cut `close-prebuilt.mjs` down to `missingInstalls` and its comment. Delete `docs-gate.mjs` with
   `git rm`.
3. Re-point `close-prebuilt.test.ts` and `docs-gate.test.ts` at `run.mjs` and the registry. Each
   case keeps its assertion; a case about a moved function tests it where it now lives, and a case
   on `missingInstalls` stays on `close-prebuilt.mjs`. Neither file is deleted, and each keeps at
   least its base count (21 and 10).
4. Add `scripts/checks/registry.mjs` and `scripts/checks/run.mjs` to the three comment-lint lists
   (M18), beside the two files they replace there.
5. Probe that held CI gains no build. For each `npm run <name>` step in `test.yml` and
   `design.yml`, print the row's `build` field next to whether the base body started with `npm
   run package`. The two columns match for every step. The probe goes in the task report.
6. Run `rm -rf dist && npm run check:surface`, then the fast lane, and commit.

### T4. The gate tiers and the fast lane read the registry (80 minutes; Opus at `medium`)

1. In `gate-tier.mjs`, replace every by-name rule with the row field that carries it:
   - the close universe and each check's command, for the script closures (M8), from
     `CHECKS`, never from `package.json`'s bodies;
   - the `engine` fallback from `build` in place of `PACKAGE_PREFIX`;
   - `DIST_FREE_EXTRAS` from `distFree`;
   - `DOCS_GATE` as `npm run ${GROUPS['docs-gate']}`;
   - the static leg's `npm run check:close [-- <names>]` from `GROUPS.close`, and each selected
     row outside the close as `npm run <name>`;
   - `CI_CHECKS` and the full tier's added checks from the `full` group's rows, in registry
     order, each as `npm run <name>` with `-- <groupArgs.full>` when it has some.
   The `--pin` strings stay what they are today except for the full tier's order and spellings.
   `TIER_GATES.engine` stays byte for byte (M9).
2. Reword the six comments that name a check (`:29`, `:30`, `:73`, `:74`, `:176`, `:259`) so they
   name the registry. No string is split to hide a name from the grep.
3. In `gate-table.json`, delete the `checks` map and `extraCommands`; `buckets`, `noCheck`,
   `unitSelectable`, `scriptsTestOnly`, `e2e`, and `protected` stay. Update the `GateTable`
   typedef to match.
4. **#485.** Add a `theme` bucket for `scripts/theme/**` and give the `test:theme` row
   `buckets: ['theme']`, so a change under `scripts/theme/` selects `test:theme`. A path in that
   bucket skips the "read by no check" fallback. Add a gate-tier case for
   `scripts/theme/viewer/site.mjs`: `test:theme` is selected and `all` is false.
5. **#429.** Add a `plugins` bucket for `plugins/**` and add `plugins` to the `test:emit` row's
   buckets. Add a gate-tier case for `plugins/cairn/skills/x/SKILL.md` selecting `test:emit`.
6. Re-point `gate-tier.test.ts` and `close-ci-coverage.test.ts` at the registry. Each case keeps
   its assertion. `close-ci-coverage` reads the `close` group's rows in place of
   `CLOSE_COMPONENTS` and the `docs-gate` group's rows in place of `buildSteps`. "The full tier
   against CI" gains a `CI_EQUIVALENTS` entry for each raw command `test.yml` runs that the full
   tier now spells as a row's script (the four showcase commands and `version-rise`). The files
   keep at least 113 and 2 cases.
7. Run the fast lane and `node scripts/checks/gate-tier.mjs --fast --range e53d44427..HEAD`, and
   commit.

### T5. The skills, the backlog, and the words (45 minutes; Sonnet at `medium`)

1. **#370.** Confirm the `check` row carries `NODE_OPTIONS=--max-old-space-size=6144`, then delete
   the lane note at `.claude/skills/cairn-releasing/SKILL.md:245-246` with the Edit tool.
2. Rewrite the runner paragraphs of `.claude/skills/cairn-running-passes/references/pass-gate-tiers.md`
   with the Edit tool: the registry is the list, `run.mjs` is the runner, `npm run check:close --
   <name>` still runs a subset, and a new check is a row plus its script. Add the `plugins` and
   `theme` buckets where line 84 describes the table (#429).
3. Land the backlog per `standards:backlog-sweep` "Landing the verdicts":
   - #406 and #429: reword each as the requirement this pass meets, with a `*(swept 2026-11-20)*`
     stamp.
   - #489: reword to its actionlint half alone, placed on `checks-3`, with the stamp.
   - #540: reword to parts (b) to (e), with the stamp.
   - At close, move #370, #406, #429, #485, and the met halves of #489 and #540 to `## Done` as
     `done: <PR and commit>`.
4. Run `register-check` on `run.mjs`'s output and error strings and on the two skill edits for
   their audiences, and fold its findings.
5. Rerun the retired-form search from "Searches" for `CLOSE_COMPONENTS`, `extraCommands`,
   `closeSteps`, `PACKAGE_PREFIX`, `docs-gate.mjs`, `--prebuilt`, the three raw showcase close
   labels, and `npm --prefix examples/showcase run check` as a `check:close --` argument. List
   every hit in the task report. Each is fixed in this pass or is in a held file and goes to
   `checks-3` (the `test.yml:154` comment). The pass doesn't land while one is open.
6. Run the fast lane and commit.

### T6. Acceptance run (35 minutes; the executor)

Run every acceptance check below on the head commit and paste each command with its output into
the PR's `## Acceptance`, beside T1's Today figure. Then run `npm run check:close` once and check
that its output names every name in the fixture's `close` list, mapped through `renamed`.

## Acceptance

Route items 1, 2, and 6 are this pass's; items 3, 4, 5, and 7 belong to `checks-3` and `checks-2`.
Then the structure design's five `checks-1` items, then the four rules every pass holds.

1. `node scripts/checks/run.mjs --list | wc -l` prints the number of `check:*` scripts in
   `package.json`, which is 34 after the deletion. Today: `run.mjs` and `registry.mjs` are
   missing.
   - **Amended check** `[design-gap]`: it prints `44`. The 42 `check:*` scripts are 40 rows and
     the two group scripts `check:close` and `check:docs-gate`; four more rows keep the root
     names `check`, `test:emit`, `test:catalog`, and `test:theme`. The 34 at the base become 42
     because eight names in the four homes had no script (M13), and structure item 1 needs every
     home name in the list. Giving the four root names `check:*` twins would keep an old name
     beside a new one, which the brief forbids. Task: T2a, T2b.
2. A unit test fails when a `check:*` script in `package.json` has no row in the registry, or a
   row has no script. Today: no such test, and `package.json` holds 37 such scripts. The deletion
   leaves 34. The registry is the only list:
   `grep -c "check:" scripts/checks/close-prebuilt.mjs scripts/checks/gate-tier.mjs scripts/checks/gate-table.json`
   prints `0` for each. Today: 40, 33, and 42. A second test compares the checks `check:close`
   runs with the ones it ran at the base, listed in the test, and a third counts the builds in
   one group run and finds one.
   - Today's figures at `e53d44427` are 34 scripts and 38, 31, and 38 `[stale-fact]`. The base
     list lives in `check-names-base.json`, which the test reads. Task: T2a (tests), T2b and T4
     (greps). Check: the three greps, and `npx vitest run --project unit
     src/tests/unit/check-registry.test.ts src/tests/unit/check-run.test.ts`.
3. A deliberately failing fixture check makes `node scripts/checks/run.mjs <group>` exit non-zero
   and print `FAIL` with the check's name. The checks after it in the group still run and
   report. (Route item 6.)
   - **Amended check** `[design-gap]`: the fixture runs through `run.mjs`'s exported run function
     in a spawned process, since the command line reads the real registry and the brief allows no
     added flag. Task: T2a. Check: the `check-run` case named in T2a step 4.
4. The registry holds every check, both ways. Check: a new unit test compares the registry with
   a list the plan's first task commits. That list is every name in the four homes the checks
   have now: the `checks` and `extraCommands` keys of `gate-table.json`, `CLOSE_COMPONENTS`, the
   list in `docs-gate.mjs`, and the `check:*` scripts. The test fails on a name missing from the
   registry and on a registry name missing from the list. Today, against `gate-table.json`
   alone, the `check:*` scripts in no list are
   `check:docs-gate check:admin-css-classes check:close check:theme`, and `check:tellgrader`,
   `check:vale-rules`, and `check:version-rise` are in `gate-table.json` with no script.
   (Structure item 1.)
   - The two group scripts are matched against `GROUPS`, the four raw commands through
     `renamed`, and `test:theme` is the one row outside the list (#485). Task: T1, T2a.
5. The list is written once. Check: `grep -c 'CLOSE_COMPONENTS = Object.freeze(\[' scripts/checks/close-prebuilt.mjs`
   prints 0, `grep -cE 'check[:-][a-z-]+' scripts/checks/docs-gate.mjs` prints 0, and
   `ls scripts/checks/gate-table.json` fails. Today: 1, 23, and the file exists. (Structure
   item 2.)
   - **Amended check** `[conflict]`: the `ls` clause is dropped under rule 4, since route item 2
     greps `gate-table.json` and so keeps it; its `checks` and `extraCommands` keys go. The
     docs-gate grep becomes `test ! -e scripts/checks/docs-gate.mjs`, since the file is deleted
     and a grep on it errors. Today's docs-gate count is 22 `[stale-fact]`. Task: T2b, T4.
6. No check script builds the package itself, and a built-package check still runs alone.
   Check: the count of `check:*` scripts in `package.json` whose command holds `npm run package`
   is 0, and `rm -rf dist && npm run check:surface` passes. Today: 16, and the second command
   passes because the script builds first. (Structure item 3.)
   - Today's count is 15 `[stale-fact]`. Task: T2b.
7. `package.json` can't drift from the registry, in either direction. Check: a new unit test
   fails when a `check:*` script has no registry entry and when a registry entry has no script.
   Not runnable today: the test is new. The plan proves each direction by adding a stray entry
   and watching the test fail. (Structure item 4.)
   - Task: T2a step 3, with both failures in the task report.
8. Behavior is unchanged. Check: `npm run check:close` ends `OK`, and its output names each of
   today's 36 checks. Today: `check:close: OK (36 check(s))`. (Structure item 5.)
   - Today's count is 34 `[stale-fact]`, recorded by T1. Three names change through `renamed`.
     Task: T6.
9. No test is deleted to make a change pass.
   `git diff --diff-filter=D --name-only <base>...HEAD -- src/tests | wc -l` prints `0`, apart
   from tests of code the pass's row deletes. The plan lists those by path.
   - The row deletes no test's code: `docs-gate.test.ts` and `close-prebuilt.test.ts` are
     re-pointed. Check prints `0`.
10. No check is lost. From round 1 on, `node scripts/checks/run.mjs --list` names every check it
    named at the base, apart from a check the pass's row deletes.
    - At this base `run.mjs` doesn't exist, so the base is the fixture: item 4's test covers it.
11. The words follow the standard. A pass that writes words a person reads, such as an error
    message, a command's output, a docs page, or a changelog entry, runs the repo's four-gate
    prose review (`register-check`) on them for their audience.
    - Task: T5 step 4.
12. A kept pass keeps its design's items. Where the table under "What happens to the stopped
    work" says Keep or Change, the stopped design's acceptance items for that pass bind the
    route's pass under its new name. The planner reads them in
    `specs/2026-11-17-structure-round-design.md`, or the routing design for `stock-2`, and copies
    each into the plan. It drops an item only when the item names a file the route has deleted
    by then or a rule this design changes, and the plan says which.
    - Items 4 to 8 above are the five structure items. One clause is dropped, in item 5.

The pass also ends with `npm run check`, the unit suite, and `npm run check:close` green, and the
retired-form search (T5 step 5) with no open hit.

## Standing answers

- A file the row doesn't list is edited where the outcome needs it and listed under `## Decisions`
  (standing answer 16). This plan expects `docs-gate.mjs` (deleted), `check-symbols.mjs`,
  `check-definitions.mjs`, `eslint.config.js`, `check-comments.sh`, the six tests T2a to T4 name,
  the fixture, `gate-mail.test.ts`, the two skills, and `BACKLOG.md`.
- A held file needs an edit: it doesn't, by the M11 probe. If a task finds one, it stops, tells
  the conductor, and the pass sends a `merge` document in place of landing.
- An acceptance check can't be met but its outcome can: keep the item verbatim with the amended
  check and its reason under it, flagged, through the advisor.
- A check's verdict changes after a task: the fault is in the task, and the check's script is
  never edited to match (structure design answer 21).
- A test case can't keep its assertion after a re-point: stop the task and ask the advisor. A
  test is never deleted.
- Another session's build is running: wait with a Monitor until-loop, never stop it.
- Auto mode refuses a command: take the route in "Auto-mode routes" once; after a second refusal,
  flag the task and go on (round-run answer 2).

## Close

1. Dispatch one whole-branch `standards:diff-reviewer` read from `e53d44427`, and fold what it
   finds.
2. CI green on the head commit through `ci-green <sha> --pr <n> --wait`.
3. The PR body: an opening paragraph per `written-for-people.md`; the lines `Round: checks`,
   `Pass: checks-1`, `Review: <verdict>, open findings <n>`, and `Calls: none`; `## Acceptance`
   with all 12 items and their evidence; `## Decisions`; `## Planning misses`; the hand-over
   line for `checks-3`; and "Found, not done".
4. No `CHANGELOG.md` entry: nothing a site developer sees changes. Check:
   `git diff --name-only e53d44427...HEAD -- src/lib skills docs/admin docs/editors` prints
   nothing. `MIGRATION-NOTES.md` gains nothing for the same reason.
5. Mark the PR ready and end. The conductor lands it.

### Hand-over to `checks-3`

- The actionlint half of #489 is `checks-3`'s item 5, reworded in `BACKLOG.md` by T5.
- The held `test.yml:154` comment names `docs-gate.mjs`, which this pass deletes. `checks-3`
  rewrites that step.
- The groups `checks-3` needs for each CI job are new `groups` values on the rows; the runner
  takes any group a row names.

### Found, not done

- `close-prebuilt.mjs` now holds only `missingInstalls`, kept because the held release preflight
  imports it. File through `standards:log-issue`: move it beside the preflight when a release pass
  next touches `scripts/release/`.

## Decisions

- **Root names keep their names** `[advisor]`. `check`, `test:emit`, `test:catalog`, and
  `test:theme` are rows under their current names, since the held `test.yml`, the pinned engine
  string, and `workflow-yaml.test.ts:567` call them. Passed over: `check:*` twins, which keep an
  old form beside a new one. Reversing it renames four scripts and their callers.
- **The heap lives in the `check` row's command** (#370), so every caller gets it, CI included.
  Passed over: an `env` row field, which adds a field for one row.
- **`docs-gate.mjs` is deleted**, its behavior moved into the `docs-gate` group. Passed over: a
  wrapper that calls the runner, which is a stub.
- **The full tier's order follows the registry.** Its spellings change from raw commands to the
  rows' scripts. No test pins either; the engine string, which one does, is unchanged.
- **The new runner files join the comment lint**, beside the two they replace there.
- **No changelog entry**, as Close step 4 says.

## Plan review fold

(Filled after the `standards:plan-reviewer` read.)
