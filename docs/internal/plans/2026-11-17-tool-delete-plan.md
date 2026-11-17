# Pass `tool-delete`: remove the Go tool

Initiative: theme-garden
Round: tool-delete (one pass, no conductor)
Pass: tool-delete

This pass removes the Go `cairn` tool and everything that exists only to build, test, publish, or
check it: `tool/**`, `packages/create-cairn-site/**`, the workflows `tool.yml`,
`tool-conditions.yml`, and `setup-matrix.yml`, the platform-package script, and the checks whose
only subject is Go. After it, the gate and CI run with no Go lane and the repo has no `cairn`
command. Every page and skill that names a command opens with one fixed note. The pass publishes
nothing and changes no version.

The design is `~/Projects/initiatives/theme-garden/specs/2026-11-17-tool-deletion-design.md`,
queue id `20261117-185742-aee396`, with its review record beside it
(`2026-11-17-tool-deletion-review-mechanics.md`). The design is the source of truth for every
file and every verdict this plan cites by section; this plan adds the order, the commands, and the
answers the design left to the planner. The desk added two first-paragraph requirements for the
`merge` document under ruling `20261117-191047-0ef56b` (see "Close").

Worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/tool-delete`, branch
`tool-delete`, cut from `main` at `79d326bed`. Class `auth-data`, with `runner` paths (the
`.claude/skills/**` and `.claude/rules/**` edits). Base `BASE=79d326bed`. Every command runs from
the worktree root.

Planned work is 300 minutes and the planned path is 460 (work times 1.3 plus 70). The tasks below
sum to 300. A run whose path passes 920 minutes stops through `advisor.md`.

## Pre-flight

Owner steps: none. The pass needs no secret, no sign-in, no dialog, and no change on Cloudflare,
GitHub, or npm.

- Permissions checked: every task's commands were read against the denials log
  (`~/.local/state/claude-denials.jsonl`, 123 rows from 2026-11-01 to 2026-11-17; the file holds
  nothing older, so nothing older was seen). The classes that touch this pass, with the route
  each takes, are in "Auto-mode routes" below. Two probes ran at planning: an Edit-tool change to
  `.claude/skills/cairn-releasing/SKILL.md` and `git rm -q .claude/rules/go.md` both went through
  inside a worktree, and both were reverted.
- Reviewed: one `standards:plan-reviewer` read (Opus, `medium`), saved beside this plan as
  `2026-11-17-tool-delete-plan-review.md` and folded under "Plan review fold".
- Evidence: the mechanism table below. Every row is a probe run in this worktree at `79d326bed` on
  2026-11-17, or a quoted source line. `origin/main` was `79d326bed` at planning.
- Usage: the 85 percent usage stop is lifted until the reset on November 20 (standing answer 23,
  queue document `20261117-055811-900560`). After the reset it applies again.

### Auto-mode routes

| Refused class (rows) | Route this pass takes |
| --- | --- |
| Classifier unavailable (47) | Retry the same call once after a short wait. |
| Destructive or Unwanted (13): `git stash drop`, `git commit -qam`, `pkill`, the setup command piped to `tail` | No stash. Commit by named path, never `-a` or `git add -A`. Never stop a process. Run the setup command bare, alone in its own call. |
| Self-Modification (10) and server-side refusals (10), one of them a python-heredoc edit of `.claude/skills/cairn-releasing/SKILL.md` | Edit each `.claude/**` file singly with the Edit tool, never in a `sed`, `python`, or `node` loop. `.claude/settings*` is never edited. |
| Interfere With Workloads (9): `kill`, `pkill` | Wait for another session's build to end, with a Monitor until-loop on `pgrep -f 'vite build\|vitest'`. |
| Merge Without Review (3): `gh pr merge` | Merge only through `approval-queue merge` after Geoff approves. |
| Auto-Mode Bypass (3): `gh workflow run` | Never trigger a workflow. CI runs from the push. |
| Unverifiable Deletion Scope (2): a deletion script | Delete with one inline `git rm -r -q` naming the paths, after printing `git ls-files <path> \| wc -l` for each. |
| Git Destructive (2): `push --delete` | Nothing is removed on GitHub (standing answer 20). |
| Code from External (1): `go run ...@latest` | No Go command runs in this pass. |

A step refused twice is left undone, recorded under `## Decisions`, and the run goes on.

## Mechanism table

| Mechanism | Probe or source | Result |
| --- | --- | --- |
| The fast lane picks the tool gate for any `tool/` path | `scripts/checks/gate-tier.mjs:709` `let toolRun = paths.some((path) => path.startsWith('tool/'))`, and `:617-620` | So the deletion and the `gate-tier` edits share commit 1 (standing answer 25). |
| The fast lane runs every check over the range and fails closed | `cairn-running-passes` SKILL.md line 24 | Every edit that keeps `main` green after the deletion belongs in commit 1 too. |
| `TIER_GATES.full` is pinned to the `test.yml` steps | `gate-tier.test.ts` `CI_EQUIVALENTS`, `CI_NOT_LOCAL`; `test.yml:87` (`npm test -w packages/create-cairn-site`) and `:163` (`npm run check:tool-heuristics`) | The `test.yml` edit lands in commit 1. |
| `closeSteps` throws on a component with no `package.json` script | `scripts/checks/close-prebuilt.mjs` | Remove a script and its `CLOSE_COMPONENTS` entry in one commit. 36 entries less two is 34, item 12's count. |
| `workflow-yaml.test.ts` pins the old triggers | `:110-114` expects `{'paths-ignore': ['tool/**']}` on each expected workflow; `:129-131` expects `ignorePrefixes` `['tool/']`; `:282-288` reads `tool.yml` | All three cases change in commit 1 with `ci-green.json`, `e2e.yml`, `design.yml`, and `test.yml`. |
| The lockfile regenerates by removal alone | Probe: `git rm -r -q packages/create-cairn-site` then `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | `package-lock.json` 14 deletions, 0 insertions. `ls packages` printed `cairn-cms-dev`. Reverted. |
| `bump.mjs` counts four version lines | `scripts/release/bump.mjs:70` `if (lockCount !== 4)`; lockfile lines 3, 9, 9128, 9145; the `rc3` fixture lockfile lines 3, 7, 14, 18 | Each becomes 3 once the launcher's entry leaves. |
| Six env-var names lose their last source hit | Probe: deleted the trees, dropped `tool` from the search at `check-symbols.mjs:650`, disabled the flag classes, ran `node scripts/checks/check-symbols.mjs` | Unresolved `env-var` only, exactly six names: `CAIRN_PLAIN` (3), `CAIRN_THEME` (4), `CAIRN_STATE_DIR` (1), `CAIRN_CF_ACCOUNT_ID` (7), `CAIRN_CF_READ_TOKEN` (7), `CAIRN_GH_READ_TOKEN` (10). No seventh. Reverted. |
| `check-symbols` throws without `flags.json` | Same probe, before disabling the flag classes | `cairnCommandFlags` throws at `:420`; `createCairnSiteFlags` (`:439`) and `cliFlagNames` (`:556`) call it. The design removes the flag and command-line classes. |
| The note passes every docs check | Probe: the note inserted into all 36 Markdown targets, then `checkSkillForm`, `checkAllSkillBudgets`, `npm run check:docs-gate`, `npm run check:template` | All green: form `[]`, budget ok, docs gate `OK (15 check(s))` with Vale `0 errors, 0 warnings`, template `matches a fresh bake`. The two packaged `SKILL.md` files come to 2042 and 2136 tokens of 3500. Reverted. |
| The changelog edit meets item 14 | Probe: the script in the appendix run on the base text | Item 14 printed `1` and `0`; "Unreleased" went from 38 entries to 24 (15 cut, 3 trimmed, 1 added). Reverted. |
| No ignored file sits under the deleted trees | `git status --ignored --short -- tool packages/create-cairn-site` in this worktree | Prints nothing, so `git rm -r` leaves no directory behind. |

## Searches

Each search ran at `79d326bed` in this worktree. The design's file list ("Files") is the
disposition for every hit; a hit outside it falls under standing answer 15.

| Search | Count | Disposition |
| --- | --- | --- |
| Item 6's narrow pattern with `tool/` and the launcher also left out | 63 files | All in the design's lists. |
| Item 6's wide pattern, same exclusions plus `shipped-anchors.json` | 58 files | All in the design's lists. |
| Union of the two | 72 files | Each is deleted (T1) or edited (T1, T2, T3). The design also names files neither pattern matches: `bump.mjs` and `release-bump.test.ts` (a count), `check-definitions.mjs`, `fast-lane.mjs` and its test, `scripts/ci/assert-scaffold-origin.mjs` (no caller), and the `src/lib` comments in `LoginPage.svelte`, `condition-response.ts`, `diagnostics/conditions.ts`, `vite/internal.ts`, `guidance/bin.ts`. |
| Item 8's `CMD` list over the note paths | 38 files (36 Markdown, two manifests) | 24 Markdown files and the two manifests are T2a's. The seven under `.claude/skills/` are T2b's. Five are baked copies under `templates/waymark/.claude/skills/`, which T2a's `emit:template` writes. |
| Retired forms in `~/.dotfiles/claude` (item 8's `CMD`, `make -C tool`, `tool/internal`, `tool/cmd`, `TOOL_GATE`) | 3 files, 4 lines | Left, and listed under "Found, not done" (standing answer 18). |
| The same in other repos' `.claude/` and `skills/`, worktrees and `node_modules` excluded | 0 | None. |
| The same in `~/Projects/initiatives/*/plans` | 106 files, 43 in `theme-garden/plans` | Prompts of stopped or finished passes, plus this pass's planner prompt. Listed, and they don't hold the landing (standing answer 18). |
| Retired forms inside cairn-cms, worktree copies excluded | 15 files | All in the design's lists. `.claude/settings.json:20` is left (standing answer 18). |

## Skills the executor loads

`pass-core` with `references/executor.md` and `references/advisor.md`, then `cairn-pass` and the
repo's `cairn-running-passes`. `cairn-writing-engine-code` before T1 and for the `src/lib`
comments. `cairn-writing-docs` and `writing-voice` before the note, the changelog entry, and
STATUS. `standards:log-issue` for anything found beyond the pass. `approval-packet` at the
hand-over.

## Tasks

Every task goes to one `cairn-implementer` in its own worktree off `tool-delete`, with the model
and effort named in the dispatch. After each task merges onto the branch, the executor runs
`npm run lane:fast -- --range <T1 commit>..HEAD` through `cairn-run-gate`, one heavy run at a
time, and none while `ps` shows another session's `vite build` or `vitest`. `make -C tool check`
is never run (standing answer 22). Nothing under `tool/` is kept, copied, or stubbed (standing
answer 16). A test that covered engine behavior as well as the tool keeps its engine half as a test
of its own (standing answer 24), and the PR names it.

### T1. The deletion, as one commit (200 minutes; Opus at `medium`)

T1 is one commit. It holds the deletion and every edit that keeps `main` green without the tool,
because the fast lane over `$BASE..T1` runs every check and fails closed. Its scope is the design's
"Deleted whole" list and its table "Edited because they would turn `main` red", which together
cover the estimate's first four rows.

1. Print the counts, then delete in one call:
   `git ls-files tool | wc -l` (877), `git ls-files packages/create-cairn-site | wc -l` (4), then
   `git rm -r -q tool packages/create-cairn-site .github/workflows/tool.yml .github/workflows/tool-conditions.yml .github/workflows/setup-matrix.yml scripts/release/pack-platforms.mjs scripts/build/emit-tool-conditions.mjs scripts/checks/check-tool-conditions.mjs scripts/checks/check-tool-heuristics.mjs scripts/checks/transcript-blocks.mjs scripts/ci/assert-scaffold-origin.mjs src/tests/unit/check-tool-heuristics.test.ts src/tests/unit/transcript-blocks.test.ts src/tests/unit/wizard-retired.test.ts .claude/rules/go.md`.
2. Regenerate the lockfile: `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`.
   Check that the diff only removes: `git diff -- package-lock.json | grep -c '^+[^+]'` prints `0`.
3. `gate-tier.mjs`, `gate-table.json`, `gate-tier.test.ts`: the `tool` pass class, `TOOL_GATE`,
   `TIER_GATES.tool`, the `targeted+tool` tier, `toolInputs`, `TOOL_FLAGS_FIXTURE`, `isToolPath`,
   the launcher leg (`CREATE_CAIRN_SITE` and its globs), the `--pin` value `tool`, and the rows
   for `check:tool-conditions`, `check:tool-heuristics`, and `check:transcripts` go. In
   `gate-table.json` by name: the `toolTestdata` bucket (line 23) goes and its name leaves
   `check:symbols` (line 103); `"packages/create-cairn-site/"` leaves the `showcase` bucket
   (line 24, pinned at `gate-tier.test.ts:64`); and `toolInputs` (lines 61-67) goes with its
   readers, `allPatterns` in `gate-tier.mjs` and `gate-tier.test.ts:1085`. `SCRIPTS_GATE` and `TIER_GATES.engine` lose `&& npm test -w packages/create-cairn-site`.
   The test cases at `gate-tier.test.ts` lines 50, 64, 358 onward (the `create-cairn-site leg`
   block), 428, 483-491, 503-511, 518-519, 529-530, 551, 574, 621-623, 984-990, 1074-1085, and
   1104-1107 go or lose their tool half. Lines 523-526 (`tooling/`, `docs/tool/`) keep their
   engine half (standing answer 24).
4. `test.yml`: `paths-ignore` goes (lines 6 and 8, leaving a bare `pull_request:`), the launcher
   test step (87) and its comment (82-85), the `check:tool-heuristics` step (163) and its comment
   (162), and the two check names in the docs-gate comment (152-156). The `setup-go` step (36-38)
   stays for the workflow linter; its comment (34-35) drops any tool mention. `e2e.yml` (lines 6
   and 8) and `design.yml` (lines 12 and 14) lose `paths-ignore` on both the push and the
   pull-request trigger. `publish.yml`'s four comments are corrected, and no step changes; the
   comment at lines 25-26 loses its `paths-ignore` clause and the sentence that rests on it,
   since every workflow now runs on every push. Item 4 then prints nothing.
5. `.github/ci-green.json` becomes `judgedWhenPresent: ["catalog.yml"]` and
   `"ignorePrefixes": []`. `workflow-yaml.test.ts`: the expected workflows now carry a bare
   `pull_request` trigger (`:110-114`), asserted as `expect(on.pull_request).toBeNull()` so a
   missing key fails (a bare `pull_request:` parses as `null`), `ignorePrefixes` equals `[]` (`:129-131`), and the
   `tool.yml` case (`:282-288`) goes.
6. `package.json`: the scripts `check:tool-conditions`, `check:tool-heuristics`, and
   `check:transcripts` go. In the same commit their entries leave `close-prebuilt.mjs`
   `CLOSE_COMPONENTS` (36 to 34) and `docs-gate.mjs`, and their pins leave
   `close-prebuilt`'s test and `docs-gate.test.ts:25,29`. `fast-lane.mjs` has no tool leg (it
   only spawns `gate-tier.mjs --fast`) and is not edited.
7. `check-symbols.mjs`: the flag and command-line classes go (`cairnToolFlags` at 399,
   `cairnCommandFlags`, `createCairnSiteFlags`, `commandPathsWithChildren` at 455,
   `flagNameFromWord` at 471, `resolveCairnLine` at 519, `cliFlagNames`, `extractCliFlags`,
   `extractCairnLines`, `cairnLineFindings`, and their calls), with the header comment at 16-21
   and the doc comments at 391-441 that name `tool/testdata/flags.json` and `make -C tool flags`. `tool` leaves the search at line 650. The check-id class
   and `tool-check-ids.mjs` stay. `check-symbols-allowlist.mjs` loses its 19 `cli-flag:` entries
   and gains six `env-var:` entries, one per name in the mechanism table, each with a comment that
   the Go tool read it and the rebuilt command keeps the name. `check-symbols.test.ts` loses the
   flag and launcher cases (477-489 among them) and every case that imports a removed function. These six entries are the one planned addition
   (standing answer 15).
8. `plugin-manifests.test.mjs` loses its reads of `flags.json` (line 15) and the launcher README
   (line 62). `emit-definitions.mjs`, its test, and `check-definitions.mjs` lose the leg that
   writes under `tool/internal/cairnsite/definitions/`.
9. `bump.mjs:70` expects 3, with its message. In the `rc3` fixture,
   `src/tests/unit/fixtures/release-bump/rc3/packages/create-cairn-site/package.json` is deleted
   and `rc3/package-lock.json` loses the launcher entries, leaving three version lines.
   `release-bump.test.ts` pins no count and no launcher entry, and is not edited.
10. The release harness (`scripts/gate/record.mjs`, `stand-in.mjs`, `scripted.mjs:119`,
    `README.md`, and the tests `gate-stand-in`, `gate-record`, `gate-verdict`) loses the parts
    that read Go source or name the Go binary, among them `scripts/gate/README.md:60`
    (`make -C tool build`, `--cairn-bin tool/cairn`) and `src/tests/unit/gate-record.test.ts:143-158`;
    the README says the `naive` and `scripted` runs wait for the new command. `check-leaks`
    keeps its `(?:darwin|linux|win32)-(?:x64|arm64)` allowance at line 83 and its three test
    cases, because a released `CHANGELOG.md` entry still names the platform packages. `check-leaks`, `check-package-files` (with `checkNoToolPathPacked`
    at 365-375 and its call at 498), `check-dev-package`, `check-stable-source`, and their tests
    lose the launcher, platform-package, and `tool/` lines. `scripts/walk-files.mjs:5` and
    `admin-sources-css.test.ts:48` lose their `tool/` path. `.vale.ini` and
    `.vale/styles/Cairn/Names.yml` lose the `tool/` scope and names.
11. The six transcript markers in `docs/admin/create-your-site.md`, `is-it-working.md`, and
    `set-up-with-an-agent.md` go with their check.
12. Run, bare: `npm run check`, `npm run test:unit`, and `npm run check:close`. Then commit by
    named path. Then run the fast lane over `$BASE..HEAD` once: a line that still prints the
    tool's gate is skipped and recorded under `## Decisions` (standing answer 25). Item 16's
    amended check passes (see item 16).

The first push comes after T1, and opens the draft PR (`gh pr create --draft --base main`). CI's
`npm ci` needs the regenerated lockfile, which T1 carries.

### T2a. The note (30 minutes; Sonnet at `medium`)

The design's "The note" section is the spec. The fixed sentence goes after the title as its own
paragraph, after any front matter, on the 24 source Markdown files from item 8's search that sit
outside `.claude/skills/` (the seven inside it are T2b's, and the five
`templates/waymark/.claude/skills/` copies are baked, not edited). T2a owns `docs/`, `README.md`,
`skills/`, `plugins/`, `.claude-plugin/`, and the bake, and touches no `.claude/` path. A file under a `skills/` path
says "in this skill", every other file "on this page". The two manifests take the sentence
without backticks at the end of `description`: `plugins/cairn/.claude-plugin/plugin.json` line 3
and the plugin entry in `.claude-plugin/marketplace.json` (line 13, not the marketplace's own
line 7), both in the "in this skill" form, since the plugin is its one skill. The two Go-install
sentences come out: step 1 of `docs/admin/is-it-working.md` (line 13) and the install sentence in
step 4 of `create-your-site.md` (line 135), whose `cairn doctor` sentence stays. No page is
rewritten (standing answer 17). Then `npm run emit:template`, and `npm run check:template` and
`npm run check:docs-gate` end green. Item 9 prints nothing, and item 8 prints none of T2a's files.

### T2b. Skills, rules, CLAUDE.md, and comments (30 minutes; Sonnet at `medium`)

The design's "Edited so no text is wrong" is the spec: `CLAUDE.md`, `.claude/rules/docs-with-code.md`,
the skills `cairn-running-passes` (`SKILL.md` lines 3, 24, 30, 47, and `pass-gate-tiers.md`),
`cairn-releasing` (the tool release section), `cairn-writing-engine-code`
(`durable-gotchas.md`'s Go traps), `cairn-proving-setup`, `cairn-writing-docs` (`docs-register.md`,
including the pointer into `tool/docs` at line 260, and `evals/cycle-prompt.txt`), and
`cairn-judging-scope` (the pointer at `what-cairn-is-and-is-not.md:111`). The `src/lib` comments
and the three outside it (`tool-check-ids.mjs` lines 4, 6, 12, 31; `bake-template.test.mjs:198`;
`site-config-path.test.ts:2`) are reworded so they name no Go file and no deleted check. A
comment that names a command or the launcher by its role stays. The release scripts `preflight`,
`bump`, `wait`, `status`, `notes`, `verify`, and `withdraw` stay runnable. Each `.claude/**` file
is edited singly with the Edit tool. Each section T2b deletes takes its contents line with it:
`durable-gotchas.md:46` (`#editing-tool-the-go-cli`) and `pass-gate-tiers.md:13`
(`#the-tool-tier-and-mixed-diffs`), since `docs-links` checks anchors.

T2b owns the seven `.claude/skills/` files that item 8's search returns
(`cairn-judging-scope/references/what-cairn-is-and-is-not.md`, `cairn-proving-setup/SKILL.md`,
`cairn-releasing/SKILL.md`, `cairn-running-passes/SKILL.md`,
`cairn-running-passes/references/pass-gate-tiers.md`, `cairn-writing-docs/references/docs-register.md`,
and `cairn-writing-engine-code/references/durable-gotchas.md`). After its body edits, it adds the
note in the "in this skill" form, placed as T2a places it, to each of the seven that still matches
item 8's `CMD`. `npm run check:comments`, `npm run check:docs-gate`, and the skill checks end
green, and item 8 prints none of T2b's files.

T2a and T2b own disjoint files and run as a pair. After both merge, item 8 prints nothing.

### T3. Changelog, backlog, and STATUS (40 minutes; Sonnet at `medium`)

1. Changelog. Write this script to `$CLAUDE_JOB_DIR/tmp/changelog-edit.mjs` and run it once with
   `node` on the base text. It matches entries by their opening words, so line drift can't move
   it, and it throws when an opening is missing. It adds the one entry, cuts the design's 15, and
   trims the three mixed entries (lines 5, 47, 215) to their engine sentences. Line 5's title loses
   `cairn doctor` and its body loses the setup sentences; standing answer 26 doesn't apply,
   because the trim removes clauses and rewrites nothing. The line-180 `provider-console` entry is
   cut as the design lists it: its schema stays, and no release ever wrote the value.

   The script is in "Appendix: changelog script" below. Afterwards item 14 prints `1` and `0`,
   and `git diff --stat -- CHANGELOG.md` shows 5 insertions and 144 deletions.
   `npm run check:leaks` and `npm run check:consumers-must` end green on the result.
2. Backlog. The design's "Backlog verdicts" is the spec. Work from the bottom of the file up, and
   find each item by its id and its text at base, never by line number alone: thirteen ids are
   used twice, and the design gives a line for each of those. Done items move under `## Done` as
   `- [x]` with `done: the Go tool is deleted` and the PR number. Reworded items keep their id
   and take the text the design gives. Kept items gain the sweep stamp `*(swept 2026-11-17)*`.
   The duplicate (#493 at line 83) closes as a duplicate of #513. Last, the 26 open items below
   `## Done` (lines 1670 to 1734 at base) move above it, in their order.
3. STATUS. The executor writes `docs/STATUS.md` at close: the line at 40 that bars
   `make -C tool check` goes (item 17), and the current state says the Go tool is gone.

## Acceptance

Copied verbatim from the design (lines 258 to 348). Each item names the task that meets it and the
command that shows it.

1. **No Go source or module file is tracked.**
   `git ls-files 'tool/**' '*.go' 'go.mod' 'go.sum' 'go.work' | wc -l` prints `0`. Today: `877`.
   *T1. That command.*
2. **The launcher package is gone.** `git ls-files packages/create-cairn-site | wc -l` prints `0`,
   and `ls packages` prints `cairn-cms-dev`. Today: `4`, and `cairn-cms-dev create-cairn-site`.
   *T1. Those commands.*
3. **Seven workflows remain.** `ls .github/workflows` prints `catalog-check.yml catalog.yml
   design.yml e2e.yml publish.yml test.yml tsgo.yml`. Today it also prints `setup-matrix.yml
   tool-conditions.yml tool.yml`.
   *T1. That command.*
4. **No CI list names the tool.** `grep -cE 'tool|setup-matrix' .github/ci-green.json` prints `0`,
   and `git grep -c "paths-ignore" -- .github/workflows` prints nothing. Today: `4`, and seven
   hits in four files.
   `node -e 'console.log(JSON.stringify(require("./.github/ci-green.json").ignorePrefixes))'`
   prints `[]`. Today: `["tool/"]`.
   *T1. Those commands.*
5. **One use of the Go toolchain is left, the workflow linter.**
   `git grep -nE "setup-go|go-version|go run |go test |go build |go install |'go'," -- .github src scripts package.json docs README.md skills plugins .claude CLAUDE.md examples templates ':!docs/internal'`
   prints three lines: the `actions/setup-go` step in `test.yml`, its `go-version` line, and the
   `spawnSync('go', ...)` call in `workflow-yaml.test.ts`. Today: 23 lines.
   *T1 and T2b. That command.*
6. **Nothing outside history names a deleted path.** With `RUN` set to
   `make -C tool|check:tool-|check-tool-|tool-conditions|pack-platforms|setup-matrix|tool\.yml|tool/(internal|cmd|testdata|scripts|Makefile|docs|v2)|packages/create-cairn-site|check:transcripts|transcript-blocks|cairn-(linux|darwin|win32)-`,
   the command
   `git grep -lE "$RUN" -- . ':!BACKLOG.md' ':!CHANGELOG.md' ':!ROADMAP.md' ':!MIGRATION-NOTES.md' ':!docs/internal' ':!docs/STATUS.md' ':!.claude/settings.json' ':!scripts/checks/fixtures/stable-source' ':!src/tests/unit/fixtures/gate-pages' ':!src/tests/unit/gate-grade.test.ts'`
   prints nothing. Today, with `tool/` and the launcher also left out: 63 files. The last
   exclusion is the release harness's test, which builds a platform package in a fake cache and
   waits for the route. The same command with the wider pattern
   `(^|[^a-zA-Z0-9_./-])tool/|\bGo (tool|scaffold|doctor|binary|module|program|mirror|side|code|source)\b|\bgo\.mod\b`
   and one more exclusion, `':!scripts/checks/shipped-anchors.json'`, also prints nothing. Today:
   58 files. That file's note names a released tool tag and is append-only.
   *T1, T2a, T2b. Both commands, run after T2.*
7. **No gate script names the tool.**
   `node -e 'const p=require("./package.json");console.log(Object.keys(p.scripts).filter(k=>/tool|transcript/.test(k)).join(" "))'`
   prints an empty line. Today: `check:tool-conditions check:tool-heuristics check:transcripts`.
   *T1. That command.*
8. **Every page and skill that names a command says, at its top, that it is being rebuilt.** With
   `CMD` set to
   `cairn (new|doctor|health|adopt|auth|sites|logs|help|agents|completion)\b|npm create cairn-site|create-cairn-site`,
   this prints nothing:

   ```bash
   git grep -lE "$CMD" -- README.md docs/admin docs/why-cairn.md docs/README.md skills plugins \
     .claude/skills .claude-plugin templates examples | while read -r f; do
     case "$f" in
       *.json) grep -qE 'The cairn command is being rebuilt' "$f" || echo "$f" ;;
       *) awk 'NR==1 && /^---$/ {fm=1; next} fm && /^---$/ {fm=0; next} fm {next}
               /^The `cairn` command is being rebuilt/ {ok=1; exit} ++n>=8 {exit}
               END {exit !ok}' "$f" || echo "$f" ;;
     esac
   done
   ```

   It passes a Markdown file only when the sentence opens a line within the first eight lines
   after any front matter. Today it prints all 38 files that match.
   *T2a. That loop.*
9. **No page tells a reader to install the Go binary.**
   `git grep -cE "go install|cairn-cms/tool|cairn-cms/releases" -- docs README.md skills plugins templates examples ':!docs/internal'`
   prints nothing. Today: one line in each of `docs/admin/create-your-site.md` and
   `is-it-working.md`.
   *T2a. That command.*
10. **No transcript marker is left.** `git grep -c "<!-- transcript"":" -- docs` prints nothing.
    Today: two in each of three pages.
    *T1. That command.* The design writes the pattern as one quoted string. This copy splits it
    into two adjacent quoted strings, which the shell joins, so the plan under `docs/internal`
    doesn't carry the marker and fail its own check.
11. **The lockfile has no launcher.** `grep -c 'create-cairn-site' package-lock.json` prints `0`,
    and `npm ci` succeeds. Today: `4`.
    *T1. That command, and CI's `npm ci`.*
12. **The engine's gate is green.** `npm run check`, the unit suite, and `npm run check:close` end
    green on the head commit. `check:close` ends `OK (34 check(s))`. `CLOSE_COMPONENTS` in
    `close-prebuilt.mjs` holds 36 entries today, and two leave: `check:tool-conditions` (line 49)
    and `check:transcripts` (line 56). Today, by the structure design's read at `604b4596d`:
    `OK (36 check(s))`. I did not run it again in the clone.
    *T1, then the head commit at close. Those three commands.*
13. **CI is green on the head commit.** `ci-green <sha> --pr <n> --wait` exits 0. Item 3 already
    shows that no Go workflow is left to run. Today on `79d326bed`: `catalog`, `setup-matrix`,
    `test`, `e2e`, `tool`, and `design`, each `completed success`.
    *Close. That watch.*
14. **The changelog records the removal and announces nothing that is gone.** With `UNREL` set to
    `awk '/^## Unreleased/{u=1;next} /^## /{u=0} u' CHANGELOG.md`, the command
    `eval "$UNREL" | grep -c '^- \*\*The Go tool is removed'` prints `1`. Today: `0`. The entry
    is one line. The command
    `eval "$UNREL" | grep -v '^- \*\*The Go tool is removed' | grep -cE '\bcairn (new|doctor|health|logs|sites|adopt|auth|help)\b|create-cairn-site|\blauncher\b'`
    prints `0`. Today: `25`.
    *T3. Those commands.*
15. **No test is deleted except one whose only subject is deleted code.**
    `git diff --diff-filter=D --name-only origin/main...HEAD -- ':!tool' ':!packages/create-cairn-site' | grep -E '\.test\.|^e2e/' | grep -v '/fixtures/'`
    prints three paths: `src/tests/unit/check-tool-heuristics.test.ts`,
    `transcript-blocks.test.ts`, and `wizard-retired.test.ts`. The pull request names the deleted
    code each one tested.
    *T1. That command.*
16. **The fast lane names no tool gate.**
    `node scripts/checks/gate-tier.mjs --fast --range origin/main..HEAD | grep -c 'make -C tool'`
    prints `0`. On a branch that deletes `tool/` without the `gate-tier.mjs` edit it prints `1`,
    because line 709 selects the tool's gate for any changed path under `tool/`.
    *T1. Amended at planning through the review (S4):* the classifier prints nothing to stdout
    when it fails on an empty range, a git error, or a table error, and `grep -c` then still prints
    `0`. So the check is: run `node scripts/checks/gate-tier.mjs --fast --range origin/main..HEAD`
    with stdout sent to `$CLAUDE_JOB_DIR/tmp/fast.txt`; it exits 0, `wc -l` on the file prints more
    than 0, and `grep -c 'make -C tool'` on the file prints `0`.
17. **STATUS no longer bars a gate that doesn't exist.** `grep -c 'make -C tool' docs/STATUS.md`
    prints `0`. Today: `1`.
    *T3, at close. That command.*
18. **The writing follows the repo's rules.** The note, the changelog entry, and STATUS follow
    `.claude/skills/cairn-writing-docs/references/docs-register.md`, and the docs gate inside
    `check:close` passes on them.
    *T2a and T3. `npm run check:close`.*

## Standing answers

The twelve in `round-run.md` hold. The design's 13 to 26 hold as written there ("Standing
answers"), and this plan does not restate them; the tasks cite each by number where it applies.
This plan adds:

27. A command in a task's step fails on a mechanism the mechanism table didn't probe: the
    implementer traces the cause and fixes it inside the task's files. A fix that needs a file the
    design doesn't list falls under standing answer 15.
28. The fast lane over `<T1>..HEAD` is red on a check the pass didn't touch: the
    `durable-gotchas.md` rerun rule applies once. A second red on the same check goes through
    `advisor.md`.
29. CI's `npm ci` fails on the first push: the lockfile diff is re-checked for insertions
    (T1 step 2). A lockfile that needs an insertion is a stop through `advisor.md`.
30. A line in an "Unreleased" entry the script doesn't cover still matches item 14's pattern:
    the clause naming the command comes out, and the PR lists it.
31. `check:close` prints a count other than 34: the difference is traced to a component, and a
    third check removed beyond the design's two is a stop through `advisor.md`.

## Close

1. Run item 6, 8, 9, 14, and 17's commands on the head and record each output in the PR.
2. One whole-branch `standards:diff-reviewer` read from `$BASE` (Opus, `medium`), and one
   `standards:web-auth-security-reviewer` read (Opus, `medium`). Fold their findings, then the
   CI watch: `ci-green <sha> --pr <n> --wait` as a background task, re-issued on 75.
3. No live admin smoke (standing answer 19). The PR says so under `## Decisions`: every edit
   under `src/lib` is a comment.
4. The PR body opens with a paragraph per `~/.claude/docs/voice/written-for-people.md`, then what
   landed, the security verdict, `## Acceptance` with evidence for all 18 items, `## Decisions`,
   `## Planning misses`, the three deleted tests and the code each tested, any engine half kept,
   any changelog entry kept whole, and the follow-ups filed through `standards:log-issue`.
5. The executor writes `docs/STATUS.md` (T3 step 3) and closes the pass.
6. The PR goes to Geoff as a `merge` document through `approval-packet`. Its first paragraph says
   plainly whether the closing reviewers accepted; whether every check on the head commit is
   green; whether the page asks anything beyond the approved design; the design's queue id,
   `20261117-185742-aee396`; and whether the PR stays inside that design, naming anything outside
   it. It carries "Found, not done" below.
7. On Geoff's approve, merge through `approval-queue merge`, bring the main checkout up to date as
   `pass-core` "Close" sets out, and leave through `ExitWorktree`.

Pull request #259 stays open and is never rebased, closed, or merged by this pass. Branches,
worktrees, and pull requests of stopped passes are left as they are (standing answer 21).

### Found, not done

For the `merge` document, under that heading:

- `.claude/settings.json:20` in cairn-cms, the permission line for the tool's gate.
- `~/.dotfiles/claude/.claude/settings.json:60`,
  `Bash(CAIRN_GATE_LANE=light cairn-run-gate 'make -C tool check')`.
- `~/.dotfiles/claude/.claude/skills/cairn-pass/SKILL.md:32-33`, the `tool` class gate and the
  launcher suite.
- `~/.dotfiles/claude/.claude/settings.json:432`, an `autoMode` environment entry that names
  `cairn *`, `npm create cairn-site`, and `npx create-cairn-site *`. The design doesn't name this
  one; the planner's search found it.
- The initiatives plans that name a retired form: 106 files, 43 of them in `theme-garden/plans`.
  Each is a prompt of a stopped or finished pass; the route design rules on them.
- Any repository secret or environment the security reader finds that nothing reads after the
  deletion (standing answer 20).

## Decisions

Made at planning, for the PR's `## Decisions`:

1. T1 is wider than standing answer 25's list. The fast lane runs every check over its range and
   fails closed, so every edit that keeps `main` green without `tool/` lands in the first commit:
   the design's "Edited because they would turn `main` red" table in full.
2. The two manifests carry the "in this skill" form of the note, since the plugin is its one skill,
   and the marketplace carries it on the plugin entry, not on its own description.
3. The changelog's line-5 entry is trimmed, not kept whole: the trim removes clauses and rewrites
   nothing, which keeps item 14 at `0` without standing answer 26.
4. No `MIGRATION-NOTES.md` note is added. No consumer of the engine changes anything, and the
   design names none.

5. `check-leaks` keeps its platform-package allowance (line 83) and its test cases: a released
   `CHANGELOG.md` entry still names `@glw907/cairn-<os>-<cpu>`, and history is never edited.

## Plan review fold

One `standards:plan-reviewer` read, saved as `2026-11-17-tool-delete-plan-review.md`. Every
finding was folded; none changes the design.

| Finding | Fold |
| --- | --- |
| B1: T2a and T2b both edit seven `.claude/skills/` files | T2b owns all seven and adds the note to each; T2a keeps 24 Markdown files, the manifests, and the bake. Searches row, T2a, T2b, and the executor prompt restate it. |
| S1: two `gate-table.json` entries unclear | T1 step 3 names the `toolTestdata` bucket, its name in `check:symbols`, the `showcase` entry, and `toolInputs` with its readers. |
| S2: four `check-symbols.mjs` functions and two comment blocks missing | Named in T1 step 7, with the test cases that import them. |
| S3: the `publish.yml:26` comment fails item 4 | T1 step 4 removes the clause and its sentence, and names both triggers in `e2e.yml` and `design.yml`. |
| S4: item 16 passes on a failed classifier | Item 16 carries an amended check under its verbatim text: exit 0, non-empty output, then the grep. |
| S5: `bump.mjs:70`, a no-op test edit, a leftover fixture manifest | Mechanism table and T1 step 9 corrected. |
| S6: contents lines for deleted sections | T2b removes both with their sections. |
| S7: T3 doesn't name `check:leaks` or `check:consumers-must` | Added to T3 step 1. The leaks allowance stays (Decision 5). |
| S8: task reports don't name the CI verdict | One line added to the executor prompt. |
| S9: the bare-trigger assertion could pass vacuously | T1 step 5 names `toBeNull()`. |
| Notes: `scripts/gate/README.md:60`, `gate-record.test.ts:143-158`, `fast-lane.mjs` | Named in T1 step 10; step 6 says `fast-lane.mjs` is not edited. |
| Note: STATUS and the review file must not quote the transcript marker | The executor prompt says so. |

## Appendix: changelog script

```js
import { readFileSync, writeFileSync } from 'node:fs';

const CUT = [
  "- **`cairn new` no longer refuses a domain's bare address",
  '- **`cairn new` no longer times out on a site that is already live',
  '- **`cairn new` tells an agent what to do the first time it runs it.**',
  "- **A provider's refusal now shows its cause.**",
  '- **An agent now makes the bare `cairn` call before it asks about the sandbox.**',
  '- **Setup shows why a request got no answer',
  '- **The sandbox refusal gives the bare retry first.**',
  "- **Setup's instructions name each page's real button and switch.**",
  '- **The setup screens no longer let an Enter accept a domain unread.**',
  '- **`cairn --help`, the error printer, and the list views move onto',
  '- **`cairn health`, `cairn doctor`, `cairn logs`, and the `cairn sites` status block',
  '- **`provider-console` is no longer a fix actor.**',
  '- **A new CI matrix scaffolds the setup answers.**',
  '- **The admin docs describe `cairn new`.**',
  '- **`cairn new` is shown, and `npm create cairn-site` becomes a launcher.**',
];

const TRIM = [
  [
    '- **A site keeps its deploy facts in `cairn-site.json`, and the build and `cairn doctor` check it.**',
    "- **A site keeps its deploy facts in `cairn-site.json`, and the build checks it.** The record sits at the site's root and holds the kind, features, theme options, optional AI posture, the engine version, and the deploy values: public origin, sign-in sender, and the GitHub App's identity. `cairn.config.ts` imports it. The record's rules are `schema/cairn-site-1.schema.json`, and a site's build stops on a missing, unparseable, or rule-breaking record with one line that names the file and, for a broken rule, the field. A new page, `docs/admin/site-record.md`, lists every field.",
  ],
  [
    '- **The release gate is rebuilt around three legs, and the setup docs gain the token option.**',
    '- **The release gate is rebuilt around three legs.** The rulings ledger records the verdict.',
  ],
  [
    '- **The engine package now ships the Waymark site template and a theme catalog.**',
    '- **The engine package now ships the Waymark site template and a theme catalog.** The tarball carries `template/waymark/` (the composed starter plus its deploy and check workflows) and `template/catalog.json`. Nothing in a site changes: the files sit beside `dist`, and no export or entry point moves.',
  ],
];

const ADD =
  '- **The Go tool is removed.** The `cairn` command, the `create-cairn-site` launcher, and the per-platform packages are gone from the repository, and the command is being rebuilt inside the `@glw907/cairn-cms` package.';

const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const end = lines.findIndex((l, i) => i > 0 && l.startsWith('## '));
const head = lines.slice(0, end);
const tail = lines.slice(end);
const first = head.findIndex((l) => l.startsWith('- '));
const preamble = head.slice(0, first);

const entries = [];
for (const l of head.slice(first)) {
  if (l.startsWith('- ')) entries.push([l]);
  else entries.at(-1).push(l);
}

const used = new Set();
const kept = [];
for (const entry of entries) {
  const cut = CUT.find((p) => entry[0].startsWith(p));
  if (cut) {
    used.add(cut);
    continue;
  }
  const trim = TRIM.find(([p]) => entry[0].startsWith(p));
  if (trim) {
    used.add(trim[0]);
    // The opening paragraph is replaced; its trailing blank line and `Consumers must:` stay.
    const blank = entry.indexOf('');
    kept.push([trim[1], ...(blank < 0 ? [] : entry.slice(blank))]);
    continue;
  }
  kept.push(entry);
}
for (const p of [...CUT, ...TRIM.map(([x]) => x)]) {
  if (!used.has(p)) throw new Error(`no entry opens with: ${p}`);
}

writeFileSync('CHANGELOG.md', [...preamble, ADD, '', ...kept.flat(), ...tail].join('\n'));
console.log(`entries: ${entries.length} -> ${kept.length + 1}`);
```
