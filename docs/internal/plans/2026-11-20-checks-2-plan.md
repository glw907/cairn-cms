# Pass `checks-2`: every check script in one form

Initiative: theme-garden
Round: checks
Pass: checks-2

This pass gives every check script one shape. A new module, `scripts/checks/shared.mjs`, exports
the repo root and `runCheck(name, body)`. `runCheck` runs a check's body and prints the problems it
returns. It ends the output with one line, `<name>: OK` or `<name>: FAIL`, and sets the exit code to
0 or 1. Each check script a registry row runs then takes its root and its verdict from that module.
The mutual import between `check-version.mjs` and `check-consumers-must.mjs` goes. No check changes
which input passes and which fails.

Two scripts a later round deletes are skipped. The template drift checks (`check:template`, and
`pack-engine-template.mjs` inside `check:package`) go in `stock-1`, round 5. `check-chassis-boundary.mjs`
goes in `made-site-3`, round 8.

The route is `~/Projects/initiatives/theme-garden/specs/2026-11-17-route-rounds.md`, round 1 item 7
(line 377) and "What every pass holds" (lines 315 to 336). The stopped structure design's `checks-2`
items bind this pass under rule 4: `2026-11-17-structure-round-design.md`, "### `checks-2`" (lines
613 to 627), with its row at line 481. The stopped-work table marks the pass "Change: it skips
scripts the route deletes". No backlog item names `checks-2`; #485, #370, #540, and #489 folded into
`checks-1`.

Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/checks-2`, branch `checks-2`, cut
from `main` at `66aa3352d` (the merge of #261, `checks-1`). Class `runner`. Base `BASE=66aa3352d`.
Every command runs from the worktree root, and every diff is `git diff 66aa3352d...HEAD`.

Planned work is 355 minutes and the planned path is 532 (work times 1.3 plus 70, the figure the
`checks-1` plan used at its line 26 under `planner.md:27`). The design figure is 180 and the
estimate 288, so the path is under the 576 that would park the plan. T3a and T3b run as a pair, so
the wall clock is about 60 minutes shorter than the path. A run whose path passes 576
minutes stops through `advisor.md`.

## Pre-flight

Owner steps: none. The pass needs no secret, no sign-in, no dialog, and no change on Cloudflare,
GitHub, or npm.

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 52 cairn rows from 2026-10-21 to 2026-11-20). Seven
  touch this pass's commands: `pkill` of a lane run (three), `git push --delete`, and a backlog
  commit made in the main checkout. The routes are in "Auto-mode routes" below.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), saved beside this plan as
  `2026-11-20-checks-2-plan-review.md` and folded. "Plan review fold" says where.
- Evidence: the mechanism table below. Every row is a probe run in this worktree at `66aa3352d` on
  2026-11-20, or a quoted source line.
- Held files: one. `scripts/release/preflight.mjs:15` changes its import path, and nothing else in
  it changes (M9, Decisions). The conductor was told on 2026-11-20. Standing answer 24 doesn't
  cover the edit, since the route's `checks-2` row lists only `scripts/checks/*.mjs`
  (`route-rounds.md:348`). The edit is disclosed in, and approved through, the pass's own `merge`
  document, which standing answer 25 has it send when its PR is ready in place of landing by
  `approval-packet` step 1. No workflow file
  and no `.github/ci-green.json` is edited. No setting, hook, or skill outside the repo is edited
  (standing answer 19).

### Auto-mode routes

| Refused class | Route this pass takes |
| --- | --- |
| Classifier unavailable | Retry the same call once after a short wait. |
| Destructive or Unwanted, Interfere With Workloads: `pkill -f lane:fast`, `kill`, `git push --delete` | Never stop a process or a session, and never delete a remote ref. Wait for another session's heavy run with a Monitor until-loop on `pgrep -f 'vite build\|vitest'`. |
| Modify Shared Resources: a backlog commit in the main checkout | Commit only in the pass worktree, by named path, never `-a` or `git add -A`. |
| Undermining Oversight, Self-Modification: a loop that edits many files | Edit each file with the Edit tool, one file per call. The 35 conversions are 35 Edit sessions, never a `sed`, `python`, or `node` loop. `.claude/settings*` is never edited. |
| Merge Without Review | The executor merges nothing. The conductor lands the PR. |

## Mechanism table

| # | Fact | Source |
| --- | --- | --- |
| M1 | `registry.mjs` holds 44 rows, and `node scripts/checks/run.mjs --list` prints 44 names. Every `package.json` `check:*` script is `node scripts/checks/run.mjs <row>`. | probe; `package.json:37-99` |
| M2 | After every step, `run.mjs` prints `${step.name}: OK` or `: FAIL` on stdout. A group ends `${script}: OK (N check(s))` or `N check(s) failed: ...`. `check:close` ends `check:close: OK (34 check(s))`. | `run.mjs`; PR #261 |
| M3 | The registry rows run 37 repo scripts (M4). The rest run tools only: `check`, the four `check:showcase-*`, `check:vale`, `check:vale-rules`, `test:emit`, `test:theme`, `test:catalog`. | probe over `CHECKS[].command` |
| M4 | Scripts the rows run: 32 under `scripts/checks/*.mjs`, `check-comments.sh` (bash), `scripts/theme/check.mjs`, `scripts/catalog/version-rise.mjs`, and `scripts/build/pack-engine-template.mjs` and `scripts/build/emit-template-dir.mjs`. `check-chassis-boundary.mjs` is one of the 32. With `check-stable-source.mjs` (M5) the conversions are 32 `.mjs` files under `scripts/checks`, then the theme check, version-rise, and the `.sh`: 35 edits. | probe; review 12 |
| M5 | `check-stable-source.mjs` has no row. The release hook `.claude/hooks/release-cut-guard.mjs:430-440` runs it, needs exit 0, and reads `/^sha: ([0-9a-f]{40})$/m` from its stdout. `scripts/release/{verify,wait,status,withdraw,preflight}.mjs` import its `PACKAGES` and `RULES`. | source |
| M6 | Item 1's grep matches 19 files at base, not 22: `check-admin-prose`, `-audit-pack`, `-consumers`, `-consumers-must`, `-definitions`, `-dev-package`, `-options`, `-package-files`, `-readiness`, `-rulings-format`, `-site-record-page`, `-stable-source`, `-surface`, `-symbols`, `-tellgrader`, `-tiers`, `-version`, `-visuals`, and `docs-links`. `check-chassis-boundary.mjs` isn't among them. | probe |
| M7 | 17 files in `scripts/checks` call `repoRoot(` from `scripts/repo-root.mjs`. 14 are check scripts; `run.mjs`, `close-prebuilt.mjs`, and `gate-tier.mjs` aren't. `repo-root.mjs`'s header calls it "the target for that convergence, not yet the sole source of it". | probe; `scripts/repo-root.mjs:1-5` |
| M8 | Item 2's grep matches 25 files at base, not 28, `check-chassis-boundary.mjs` and `check-stable-source.mjs` among them. `run.mjs` isn't, since it prints through `out(...)` (`run.mjs:188`). Four success verdicts span lines, with `OK` on the line after `console.log(`, so the grep misses them: `check-idioms.mjs:499-501`, `check-readiness.mjs:287-289`, `check-snippets.mjs:549-551`, `check-package-files.mjs:497-499`. Some 19 success lines read `<name>: OK (<count>)` (`check-options.mjs:393`, `check-leaks.mjs:574`, `docs-links.mjs:270`, `check-tiers.mjs:91`), and two scripts print per-item verdicts (`check-custom-surface.mjs:216-218`, `check-skill-budget.mjs:298`). `PASS` is printed by `check-audit-pack`, `-chassis-boundary`, `-cm-internals`, `-custom-surface`, and `-public-scope`; `FAILED` by `check-consumers` and `check-dev-package`, and by `check-comments.sh` (`check:comments FAILED`). | probe |
| M9 | `check-consumers-must.mjs:10` imports `unreleasedWindow` from `./check-version.mjs`, and `check-version.mjs:11` imports `isActionable` from `./check-consumers-must.mjs`. Outside the pair, `scripts/release/preflight.mjs:15` imports `unreleasedWindow` from `check-version.mjs`, `notes.mjs:12` imports `LINE` from `check-consumers-must.mjs`, and `bump.mjs:14` imports `checkVersion`. No test imports `unreleasedWindow`. | probe |
| M10 | 43 test files import from `scripts/checks/`, by `grep -rlE "^import .*scripts/checks/\|await import\(.*scripts/checks/\|from '.*scripts/checks/" src/tests \| wc -l`. 49 mention the path. | probe |
| M11 | Three tests spawn a check or the runner. `check-run.test.ts:79-83` reads `middle: FAIL` and `last: OK` from stdout. `check-stable-source.test.ts` stubs its runner, and `release-cut-guard.test.ts:17,34` writes a stub `check-stable-source.mjs`, so neither runs the real script. `check-leaks.test.ts` imports the module and runs `git ls-files`. `check-editor-quotes.test.ts:230` pins `check-editor-quotes: OK (1 quotes grounded)`, a line the exported `editorQuotesReport` returns (`check-editor-quotes.mjs:273`). | source; review 7, 12 |
| M12 | `check-idioms` rule 2 bans `process.exit` in `scripts/checks/*.mjs`. Rule 3 bans two self-names in one file, matched on a string literal's leader (`SELF_IDENTITY_LEADER`, `check-idioms.mjs:152`). A template literal such as `` `${name}: OK` `` has no literal leader. | `check-idioms.mjs:6-13`, `:150-171` |
| M13 | `check-admin-css-classes.mjs` and `check-invisible-craft.mjs` exit 2 on an error, and `scripts/theme/check.mjs` returns 2 on a usage error or a throw. No test asserts a check's exit 2; `audit/config.test.ts:351` asserts the `cairn-audit` bin's, which is out of scope. | probe |
| M14 | `scripts/theme/check.mjs --json` prints one JSON document. `scripts/theme/viewer/interactive.mjs:132-141` runs it with `--json` and `JSON.parse`s stdout. No registry row passes `--json`. | source |
| M15 | `skills/cairn-styling-public-pages/references/checking-a-theme.md:21-22` documents the theme check's output: "`check:theme: <id> pass` or `fail`, then one line per failure". It ships in the package. | source |
| M16 | `scripts/catalog/version-rise.mjs:69-79` ends with `process.exit(1)` on a problem; `version-rise.test.mjs:48-70` asserts exit status 1 and 0 only. | source |
| M17 | `check-comments.sh` (15 lines) runs eslint and echoes `check:comments OK` or `check:comments FAILED`. Its eslint list names `scripts/checks/{close-prebuilt,gate-tier,registry,run}.mjs`. | source |
| M19 | `templates/waymark/.claude/skills/cairn-styling-public-pages/references/checking-a-theme.md` is a byte-identical copy of the skill page (M15). `bake-template.mjs:189-208` copies it, and `check:template`, in `close`, fails on drift until `npm run emit:template` is run. | probe; review 1 |
| M20 | `check-audit-pack.mjs` ends with a bare `main();`, and `check-consumers.mjs` is top-level code from line 33 with no `main` and no guard. No test imports either. | review 6 |
| M18 | `CHANGELOG.md` opens `## Unreleased` with a `release-size: minor` marker, and every entry carries a `Consumers must:` line. | source |

## Searches

| Search | Hits | Use |
| --- | --- | --- |
| `grep -rn "check-stable-source\|checks/" scripts/release/*.mjs .claude/hooks/release-cut-guard.mjs` | 9 import or run lines | M5, M9 |
| `grep -rn "unreleasedWindow\|isActionable" --include=*.mjs --include=*.ts .` outside the pair | 3 (`preflight.mjs` twice, one test) | M9 |
| `grep -rn "theme/check.mjs\|check:theme"` | 20 | M14, M15 |
| `grep -rlE "toContain\(['\"\`][a-z:-]+: (OK\|PASS\|FAIL)" src/tests/unit` | 2, neither a check's verdict | M11 |
| `grep -rn "exitCodeFor" scripts src/tests` outside the two scripts | 9, all the audit library's own | M13 |
| Retired-form search (T4 step 3), command in T4 | run at T4 | `ready.md` "A retired form" |

## Skills the executor loads

- `pass-core` with `references/executor.md`, `round-run.md`, and `advisor.md`; then `cairn-pass`
  and the repo's `cairn-running-passes`.
- `cairn-writing-engine-code` before T2, T3a, and T3b.
- `standards:ts-conventions` for every doc comment written or reworded.
- `register-check` on the helper's output, the CHANGELOG entry, and the skill page edit.
- `writing-voice` for the PR body and STATUS.
- `standards:log-issue` for anything found beyond the pass.

## The helper

`scripts/checks/shared.mjs` has two exports and nothing else.

```js
/** The repo root, for every check script under scripts/checks. */
export const ROOT = repoRoot(import.meta.url);

/**
 * Runs one check and prints its verdict. ...
 * @param {string} name the check's name, which starts the verdict line
 * @param {() => string[] | Promise<string[]>} body returns the problems found; none is a pass
 * @returns {Promise<void>}
 */
export async function runCheck(name, body) { ... }
```

- `ROOT` comes from `repoRoot` in `scripts/repo-root.mjs`. The helper computes nothing itself, so
  there is one resolver.
- `runCheck` awaits `body`. A throw becomes one problem, the error's message.
- It prints each problem on stderr as the body wrote it, then prints exactly one line on stdout:
  `${name}: OK` when there are no problems, `${name}: FAIL` otherwise. The line has no detail.
  A check that reports a count prints it from its body, before the verdict. The verdict print is
  one source line holding both words, so item 2's grep counts `shared.mjs`.
- An info line a check prints on success keeps its detail, takes the `runCheck` name as its prefix,
  and drops the verdict word: `check:options: OK (412 option paths)` becomes
  `check-options: 412 option paths`, then the helper prints `check-options: OK`. A per-item line that passes takes a neutral phrase the check's
  meaning gives: `check-skill-budget: <path> OK (n/m estimated tokens)` becomes
  `check-skill-budget: <path> within budget (n/m estimated tokens)`, and
  `custom-surface [x]: PASS` becomes `custom-surface [x]: clean`. A per-item failure becomes a
  returned problem.
- A problem keeps its text byte for byte, any prefix included: the body returns the string it
  printed before. Text an exported function returns keeps every word too, apart from a verdict word
  in a success line (`editorQuotesReport`, M11, which keeps its signature and
  `ok`; its line becomes `check-editor-quotes: 1 quotes grounded`, and the assertion at
  `check-editor-quotes.test.ts:230` changes those words only).
- It sets `process.exitCode` to 0 or 1. It never calls `process.exit`. Exit 2 is gone from the
  checks (M13).
- `name` is the script's file name without `.mjs` (`check-idioms`, `docs-links`,
  `check-public-scope`). Two scripts outside `scripts/checks` keep the name they print today:
  `scripts/theme/check.mjs` prints `check:theme`, since its file name names nothing and M15 documents
  that name; `version-rise.mjs` prints `version-rise`.

In a direct run, `node scripts/checks/<x>.mjs` ends with `<x>: OK` or `<x>: FAIL`. In an `npm run`
or group run, the helper's line comes first and the runner's `check:<row>: OK|FAIL` line follows
(M2), so a group's last line is the runner's total. Both lines use the same form.

## Tasks

### T1. The base record (15 minutes; Sonnet at `medium`)

Record at `66aa3352d`, in the PR body's `## Base`, each command and its output:

1. `git rev-parse HEAD` prints `66aa3352d84c6a1251245bfd03da3ccb79e464af`.
2. Item 1's grep, `| wc -l`: 19. Item 2's grep: 25. Item 3: `grep -c 'check-version'
   scripts/checks/check-consumers-must.mjs` 1, and `grep -c 'check-consumers-must'
   scripts/checks/check-version.mjs` 1.
3. M10's import grep: 43. That command is the count for item 4.
4. `node scripts/checks/run.mjs --list | wc -l`: 44, and the list itself, saved in the PR body.
5. `npm run check:close`, run bare: ends `check:close: OK (34 check(s))`.
6. `npx vitest run` over the 43 files from step 3: all pass, with the case count.

### T2. The helper, its fixture test, and the import cycle (60 minutes; Opus at `medium`)

1. Write `scripts/checks/shared.mjs` as "The helper" says.
2. Add it to `check-comments.sh`'s eslint list, beside `run.mjs`.
3. Add `scripts/checks/fixtures/shared-pass.mjs`, `shared-fail.mjs`, and `shared-throw.mjs`: each
   calls `runCheck` with its own name and a body that returns no problem, returns one, or throws.
4. Write `src/tests/unit/check-shared.test.ts`. It spawns each fixture and expects stdout's last
   line `shared-pass: OK` with status 0, and `shared-fail: FAIL` with status 1 and the problem on
   stderr, and `shared-throw: FAIL` with status 1 and the error's message on stderr. Through `runSteps` from `run.mjs`, one step
   whose command is `true` and one whose command is `false` end their output `<name>: OK` and
   `<name>: FAIL` (structure item 2's "a registry entry that names a command").
5. Move `unreleasedWindow` from `check-version.mjs` into `check-consumers-must.mjs`, beside `LINE`
   and `isActionable`, with its doc comment. `check-version.mjs` imports `isActionable` and
   `unreleasedWindow` from `./check-consumers-must.mjs`. `check-consumers-must.mjs` no longer names
   `check-version` anywhere, comments included.
6. Change `scripts/release/preflight.mjs:15` to import `unreleasedWindow` from
   `'../checks/check-consumers-must.mjs'`. That one line is the only edit to the file.
7. Rewrite `scripts/repo-root.mjs`'s header: every check script now takes its root through
   `shared.mjs`, and the other `scripts/` trees import `repoRoot` directly.

### T3a and T3b. The conversions (T3a 60 minutes, T3b 90; Sonnet at `medium`; a pair)

Each check script below takes `ROOT` from `./shared.mjs` (or `runCheck` from
`../checks/shared.mjs` outside `scripts/checks`), and ends through one `runCheck` call. In each
script:

- Its own root computation goes: the inline `resolve(dirname(fileURLToPath(...)), '../..')`, the
  `new URL('..', ...)` form, or its own `repoRoot(import.meta.url)` call. Unused imports go with it.
- Its main body returns its problem lines in place of printing a verdict and setting
  `process.exitCode`. A line it printed on success, such as a count, stays as an info line in the
  form "The helper" gives, and a problem keeps its text as it says.
- The `runCheck` call sits where the script's main runs today, inside its existing entry guard, so a
  test that imports the script's functions runs nothing. Two scripts have no guard (M20):
  `check-audit-pack.mjs` takes `runCheck` in place of its bare `main();`, and `check-consumers.mjs`
  wraps its top-level body in one body function that `runCheck` calls.
- A mode that isn't a check prints and returns with no verdict line: `check-admin-prose --list`
  (`:295`). `check-surface --update` (`:346`) writes the baseline and does end through `runCheck`.
- Its exports, its problem text, and which input fails stay as they are. Its tests change only where
  they pin a verdict word or an exit 2 (structure item 4).
- `check-idioms` passes on the file (M12).

T3a takes the first 16, T3b the rest. They edit disjoint files, and each commits its own tests.

T3a: `check-admin-css-classes`, `check-admin-prose`, `check-audit-pack`, `check-cm-internals`,
`check-consumers`, `check-consumers-must`, `check-custom-surface`, `check-definitions`,
`check-dev-package`, `check-editor-quotes`, `check-idioms`, `check-invisible-craft`, `check-leaks`,
`check-options`, `check-package-files`, `check-public-scope`.

T3b: `check-public-skill`, `check-readiness`, `check-rulings-format`, `check-self-use`,
`check-site-record-page`, `check-skill-budget`, `check-snippets`, `check-surface`,
`check-surface-leaks`, `check-symbols`, `check-tellgrader`, `check-tiers`, `check-version`,
`check-visuals`, `docs-links`, and `check-stable-source`; then `scripts/theme/check.mjs`,
`scripts/catalog/version-rise.mjs`, and `check-comments.sh`.

Three need more than the pattern:

- `check-stable-source.mjs`: on success the body prints `check-stable-source: HEAD is a stable cut
  of v<next>` and `sha: <sha>` through `console.log`, on stdout, so the release hook's regex still
  finds it (M5). `PACKAGES`, `RULES`, and `checkStableSource` stay exported. The hook's tests stub the
  script (M11), so T4's test carries the proof against the real file.
- `scripts/theme/check.mjs`: the text paths (a theme directory, `--catalog`) run through `runCheck`
  named `check:theme`. The body prints the per-theme lines on stdout as today, failure lines
  included, and returns one problem per failed theme, `<id> failed`. A usage error becomes a problem
  and goes through `runCheck` even when `--json` is present, `--catalog --json` among them. A valid
  `--json` run prints the document alone and sets the exit code from its verdict, with no verdict
  line, so stdout stays one JSON document for the viewer (M14). Its `node --test` suites still pass.
- `check-comments.sh`: bash can't import the helper. Its two echo lines become `check-comments: OK`
  and `check-comments: FAIL`, and its exit code stays.

T3b also lands the outside edits these change. `checking-a-theme.md:21-22` says the text output
ends with one `check:theme: OK` or `check:theme: FAIL` line after the per-theme lines. Then
`npm run emit:template` re-bakes its twin in `templates/waymark/.claude/` (M19), and the changed
`templates/waymark/**` files are committed by path; `node scripts/build/emit-template-dir.mjs
--check` exits 0. A CHANGELOG entry under `## Unreleased` says the same of the theme check, notes
that a usage error now exits 1, and ends `Consumers must: nothing.` The page edit and the entry go
through `register-check`.

### T4. The registry test and the records (40 minutes; Sonnet at `medium`)

1. Write `src/tests/unit/check-form.test.ts`. It reads `CHECKS` from `registry.mjs` and pulls each
   script out of every row's command with `/\bnode (scripts\/\S+\.mjs)/g`, which leaves out
   `node --test` rows by construction; `check-stable-source.mjs` is added to the list by hand. For
   each script not in `SKIP`, the file imports from `shared.mjs`, calls `runCheck(` once, and matches
   neither a `process.exit` call (`/\bprocess\.exit\s*\(/`, so `process.exitCode` doesn't trip it)
   nor a verdict print. The test also asserts that the extraction yields 36 paths (M4's 32, the
   theme check, version-rise, and the two build scripts), so an empty or short set can't pass. The verdict match runs over the whole file's text, so
   a call that spans lines is caught (M8):
   `/(console\.(log|error)|process\.std(out|err)\.write)\([^;]*?\b(PASS|FAILED|OK|FAIL)\b/`. Run
   over `scripts/checks/*.mjs` at base it flags 28 files: M8's 25 and three whose only verdict
   spans lines (planner probe, 2026-11-20). A narrower form that stops at a quote misses
   `check-public-scope.mjs:123`, whose verdict word sits in a quoted ternary. The implementer shows
   the 28 before trusting the test. Every match at base is a verdict print the conversion removes,
   none in a comment or rule text, and none spans more than two lines (planner probe). For `check-stable-source.mjs` the test also finds a
   `console.log` whose text holds `sha: ${`. A row with no `node` script needs nothing of its own, since the runner's line ends
   it. `SKIP` is a frozen map of path to the round that deletes it:
   `scripts/checks/check-chassis-boundary.mjs` to `made-site-3` (round 8), and
   `scripts/build/pack-engine-template.mjs` and `scripts/build/emit-template-dir.mjs` to `stock-1`
   (round 5). A `SKIP` path whose file is gone fails the test, so the round that deletes the script
   also drops its entry.
2. The same test asserts that no file in `scripts/checks/*.mjs` but `shared.mjs` and the skipped
   script matches item 1's grep or calls `repoRoot(` itself, apart from `run.mjs`,
   `close-prebuilt.mjs`, and `gate-tier.mjs`, which aren't check scripts (M7).
3. Run the retired-form search:
   `grep -rnE "(check[-:][a-z-]+|custom-surface[^:]*): .*\b(PASS|FAILED)\b|check:comments (OK|FAILED)|check:theme: <id> pass|exits? 2" ~/.dotfiles/claude ~/Projects/*/.claude ~/Projects/*/skills --include=*.md --include=*.txt`, then the same pattern over
   `~/Projects/initiatives` with `--include='*prompt*'`.
   List every hit in the PR. A hit in this repo is fixed in the pass. A hit outside it can't be
   edited (standing answer 19), so it is filed through `standards:log-issue` against its repo and
   listed, and the filing closes it.
4. Update `docs/STATUS.md` on the branch with the pass's state.

### T5. Acceptance run (30 minutes; the executor)

Run every command in `## Acceptance` at the head, bare, and paste each output into the PR body.
After the last docs edit, run `npm run check:docs-gate` bare as well.

### Lane runs (60 minutes)

`npm run lane:fast -- --range 66aa3352d..HEAD` after T2, after the pair merges, and after T4. If
`origin/main` moves before close, merge it, run the lane over
`"$(git merge-base HEAD origin/main)"..HEAD`, and keep `66aa3352d` as the base of every acceptance
diff.

## Acceptance

Route round item 7, this pass's:

> `checks-2`: a unit test reads the registry and, for every row not on the skip list, finds that the
> script imports the shared helper and ends its output with a line starting `OK` or `FAIL`. The skip
> list names only scripts a later round deletes, each with that round.

Ruled form `[advisor]`, a conflict: the line is `<name>: OK` or `<name>: FAIL`, the verdict word
after the name. Structure item 2 and the merged runner (M2) both use that form, so "starting `OK`"
can't hold beside them. The skip list is keyed by script, since `check:package` runs a skipped
script beside two that stay. A row that runs no repo script is ended by the runner's line.
Task T4 steps 1 and 2, with T2 step 4 for the line itself. Check: `npx vitest run
src/tests/unit/check-form.test.ts src/tests/unit/check-shared.test.ts` passes.

The structure design's `checks-2` items, verbatim (rule 4). None names a skipped script, so none is
dropped:

1. A check script doesn't work out the repo root itself. Check:
   `grep -lE "fileURLToPath\(new URL\('\.\.|resolve\(.*import\.meta\.dirname|dirname\(fileURLToPath" scripts/checks/*.mjs | wc -l`
   prints 1, the helper module. Today: 22.

   Amended check `[advisor]`: the same grep prints 0 (base 19, M6). The helper takes the root from
   `scripts/repo-root.mjs` rather than computing it, so it doesn't match either. A second resolver
   would be an old form kept beside the new. The test in T4 step 2 shows the rest: no check script
   calls `repoRoot(` itself. Tasks T2, T3a, T3b, T4.
2. One verdict form, printed in one place. Check:
   `grep -lE "(console\.(log|error)|process\.std(out|err)\.write)\(.*\b(PASS|FAILED|OK|FAIL)\b" scripts/checks/*.mjs | wc -l`
   prints 2 or fewer, the helper and the runner. A new unit test runs one passing and one
   failing fixture through the helper and through a registry entry that names a command, as
   `check:comments` does, and expects a last line of the form `<name>: OK` or `<name>: FAIL`.
   Today: 28 files print a verdict, with `PASS` in 5 and `FAILED` in 2.

   The check holds as written: the grep prints 2, `shared.mjs` and the skipped
   `check-chassis-boundary.mjs` (base 25, M8). The runner prints through `out(...)`, which the grep
   doesn't match; it uses the same form. The grep is line-based and misses a call that spans lines,
   so T4's whole-file match is the stronger proof. The new test is `check-shared.test.ts`. Tasks
   T2, T3a, T3b, T4.
3. The mutual import is gone. Check: `grep -c 'check-version' scripts/checks/check-consumers-must.mjs`
   prints 0. Today: 1, with 1 the other way.

   Task T2 step 5. Also `grep -c 'check-consumers-must' scripts/checks/check-version.mjs` prints 1,
   the one import left.
4. Behavior is unchanged. Check: `npm run check:close` ends `OK` with the same count as after
   `checks-1`. In the 42 tests that import from `scripts/checks/`, a changed assertion may
   change a verdict's word, as from `PASS` to `OK`, and never which fixture passes or fails.
   The reviewer reads each changed assertion. Today: all 42 pass.

   The count is 34 and the importing tests are 43 by M10's command, plus the two new ones. An
   assertion of exit 2 changing to exit 1 is a verdict's word, not a changed fixture. Task T5:
   `npm run check:close` ends `check:close: OK (34 check(s))`, the M10 files all pass, and
   `node --test scripts/theme/check.test.mjs scripts/catalog/version-rise.test.mjs` passes.

The four "What every pass holds" rules, verbatim:

1. "No test is deleted to make a change pass. `git diff --diff-filter=D --name-only <base>...HEAD -- src/tests | wc -l` prints `0`, apart from tests of code the pass's row deletes. The plan lists those by path."

   The row deletes no code, so the command prints 0. Task T5.
2. "No check is lost. From round 1 on, `node scripts/checks/run.mjs --list` names every check it named at the base, apart from a check the pass's row deletes."

   `registry.mjs` doesn't change: `git diff 66aa3352d...HEAD --stat -- scripts/checks/registry.mjs`
   prints nothing, and `--list` prints the 44 names T1 saved. Task T5.
3. "The words follow the standard. A pass that writes words a person reads, such as an error message, a command's output, a docs page, or a changelog entry, runs the repo's four-gate prose review (`register-check`) on them for their audience."

   On the verdict form, the `checking-a-theme.md` edit, and the CHANGELOG entry. Task T3b, checked
   in T5.
4. "A kept pass keeps its design's items. Where the table under "What happens to the stopped work" says Keep or Change, the stopped design's acceptance items for that pass bind the route's pass under its new name. The planner reads them in `specs/2026-11-17-structure-round-design.md`, or the routing design for `stock-2`, and copies each into the plan. It drops an item only when the item names a file the route has deleted by then or a rule this design changes, and the plan says which."

   Items 1 to 4 above, none dropped.

Added checks:

5. `git diff 66aa3352d...HEAD --name-only -- scripts/release .github` prints only
   `scripts/release/preflight.mjs`, and its diff is the one import line.
6. `node .claude/hooks/release-cut-guard.mjs` keeps its tests: `npx vitest run
   src/tests/unit/release-cut-guard.test.ts src/tests/unit/release-bump.test.ts` passes.
7. `node scripts/theme/check.mjs themes/waymark --json --rules manifest-schema,tokens-schema | node -e
   "JSON.parse(require('fs').readFileSync(0,'utf8'))"` exits 0. The two rules build no site.
8. The retired-form search lists no open hit.
9. `grep -cE "check-comments: (OK|FAIL)" scripts/checks/check-comments.sh` prints 2.
10. `node scripts/build/emit-template-dir.mjs --check` exits 0.

## Standing answers

- A file the design didn't list (standing answer 16): `scripts/release/preflight.mjs` (held, M9),
  `scripts/theme/check.mjs`, `scripts/catalog/version-rise.mjs`, `check-comments.sh`,
  `checking-a-theme.md` and its baked twin under `templates/waymark/.claude/`, `CHANGELOG.md`,
  `docs/STATUS.md`, and the fixtures and tests the tasks name. Any other goes under `## Decisions`.
- A verdict that changes after a task is fixed in the script, and the fixture stays as it was
  (structure design standing answer 21).
- A check removed with its code (standing answer 23): none.
- A test that pins a verdict word or exit 2 changes that word only. A test that can't keep its
  fixture's outcome stops the task for the advisor.

## Close

1. One whole-branch `standards:diff-reviewer` read from `66aa3352d`, and the closing
   `standards:plan-reviewer` read the `runner` class takes. Fold what they find.
2. `ci-green <sha> --pr <n> --wait` green on the head.
3. The PR body: the opening paragraph per `~/.claude/docs/voice/written-for-people.md`; the lines
   `Round: checks`, `Pass: checks-2`, `Review: <verdict>, open findings <n>`, and
   `Calls: <n>`; `## Base`; `## Acceptance` with every item verbatim and its evidence;
   `## Decisions`; `## Calls for Geoff`; `## Planning misses`; the held-file edit and its line; the
   retired-form hits; "Found, not done".
4. Mark the PR ready and send the `merge` document through `approval-packet`, as standing answer
   25 says. The conductor lands it.

### Found, not done

Filed through `standards:log-issue` and listed in the PR:

- `scripts/theme/`, `scripts/catalog/`, and `scripts/build/` scripts still work out their root
  inline. They aren't check scripts, so this pass leaves them.
- Some problem lines carry an old self-name (`check:options: ...`) beside the new verdict name
  (`check-options: FAIL`). Problems keep their text in this pass, so the names converge in a later one.

## Decisions

- **The helper imports `repoRoot`** `[advisor]`. Passed over: the helper computing the root, which
  would meet item 1's "prints 1" literally but keep two resolvers. Reversing it adds four lines to
  `shared.mjs` and changes item 1's count to 1.
- **The verdict line is `<name>: OK` or `<name>: FAIL`** `[advisor]`, a conflict between route item
  7 and structure item 2. Passed over: a line that starts with the word. Reversing it rewrites one
  line in `shared.mjs`, one in `run.mjs`, and the tests that read them.
- **`unreleasedWindow` moves into `check-consumers-must.mjs`** `[advisor]`, which edits one line of
  the held `preflight.mjs`. Passed over: a re-export from `check-version.mjs` (banned) and a new
  changelog module, which would also move `LINE` and edit the held `notes.mjs`.
- **The helper's name is the file name**, and the runner's row line follows it in a run. Passed over:
  the row name, which would print the same line twice in every `npm run`.
- **The theme check's `--json` mode prints no verdict line** `[advisor]`, so the viewer's parse
  holds. Passed over: the verdict on stderr in that mode, an option the design doesn't name.
- **`check-stable-source.mjs` converts** though it has no row: item 2's grep counts it.
- **`check-comments.sh` stays bash**, with its lines in the new form. Porting it to `.mjs` is more
  than the outcome needs.
- **The helper has no subprocess or file-walk export.** The structure row (`:481`) names both; the
  route's row and the binding items don't, and none of the 35 conversions needs one. Reversing it
  adds two exports and moves the scripts that would use them.
- **Info lines keep the name and drop the verdict word**, and a problem keeps its text. Passed over:
  dropping the name from every info line, which loses the line's owner in a group run.
- **A CHANGELOG entry for the theme check only.** No check script ships (`package.json` `files`
  holds no `scripts/theme`, `scripts/catalog`, or check script), so the `shared.mjs` import breaks no
  consumer. The shipped page `checking-a-theme.md` documents the theme check's output, so that
  change is one a site developer can see. The other checks reach no one outside this repo.

## Calls for Geoff

- `[advisor]` The verdict form, as above. Option taken: `<name>: OK`. Passed over: a line starting
  `OK`. The route item says "starting `OK` or `FAIL`"; structure item 2 says "`<name>: OK`".
- `[advisor]` Item 1's amended count, 0 in place of 1, as above.
- `[advisor]` The held `preflight.mjs` import line, as above.

## Plan review fold

The review is `2026-11-20-checks-2-plan-review.md`: not ready, three blocking findings. Each is
folded here.

| # | Fold |
| --- | --- |
| 1 | M19; T3b re-emits the template; acceptance 10; standing answers list the twin. |
| 2 | Item 2's check holds unamended at 2; M8 notes `run.mjs` prints through `out`. |
| 3 | "The helper" gives the info-line and per-item rule with examples. |
| 4 | M8 names the four multi-line verdicts; T4 step 1 matches whole-file text and shows it fails at base. |
| 5 | "The helper" names `editorQuotesReport` and the `:230` assertion. |
| 6 | M20; T3a/T3b name `check-audit-pack` and `check-consumers`. |
| 7 | T3b and T4 step 1 prove the `sha:` line against the real script. |
| 8 | Pre-flight: the held edit's authority is the pass's `merge` document, not standing answer 24. |
| 9 | T3b states the theme check's failure path and `--catalog --json`. |
| 10 | T5 runs `npm run check:docs-gate`. |
| 11 | T3b at 90; work 355, path 532; the formula's source cited. |
| 12 | M4 at 32 and 35 edits; M11 corrected. |
| 13 | Decisions: no subprocess or file-walk export. |
| 14 | `shared-throw.mjs`; `--list` and `--update` placed; the extraction regex with a 36-path count; problems keep their text byte for byte (an advisor read chose this over dropping prefixes), the name mismatch filed under "Found, not done". |
| 15 | T4 step 3 writes the command and says how an outside hit closes. |
| 16 | Acceptance 7 runs two rules that build no site. |
| 17 | Declined. `advisor.md` sends a conflict and an unmeetable check to `## Calls for Geoff` with an `[advisor]` line, so both stay. |
| 18 | The executor prompt names the same three lane runs. |
