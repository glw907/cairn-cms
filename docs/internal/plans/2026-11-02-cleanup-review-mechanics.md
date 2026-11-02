# Mechanics and feasibility review: cleanup plan at `4e87a478d`

Target: `docs/internal/plans/2026-11-02-cleanup-plan.md`. Lens: `standards:plan-reviewer`. Saved by the
dispatching session from the agent's reply.

**Verdict:** not ready to launch. Four blockers and one owner fork need folds first. Most other findings are
one-line folds.

## What held

- **Quotes:** about 75 cited lines checked, well over one in three. 73 match. The two wrong ones are finding 20.
- **Path arithmetic:** the Tasks intro sums to 825, and each pair uses the longer task.
- **S1's 0.7:** it holds task by task (T1 105→75, T5 145→105, T9 150→105, T13 105→75). The arithmetic is
  sound. Whether it satisfies the sheet is finding 5.
- **Order constraints:** #282 (T8) comes before #272 (T10), and no later task touches `guard.ts` or
  `preview.ts`. R1 is T17, and only T18's folds follow it. R6's measure follows #234 (T4 before T13). `tsx`
  removal in T10 comes before pass 9's sweep.
- **Disjoint pairs:** T1/T2, T3/T4, T9/T10 and T11/T12 are disjoint. T14/T15 is too, once T15's undeclared
  `docs/STATUS.md` is listed. T7/T8 overlap only in generated output, and a standing answer covers that.
- **T13 conflicts:** no file conflicts. Its lock contention is finding 16.
- **Backlog coverage:** every open `Cleanup round` or `Pass 8` item is in a task, a keep, or a stated decision.
  The only stale cases are finding 18.
- **Auto mode:** the `.claude/skills`, `CLAUDE.md`, `wrangler d1 --local` and merge rows all match
  `autoMode.allow` in `~/.claude/settings.json`.
- **#266:** `component-rerun-triggers.mjs:30,34,35` already holds the vitest config, `package.json` and the
  lockfile.

## Blockers

**1. T0 stops the line at its first step. `blocker`, `correctness`, `plan:227`, `:188`.**
Defect: `git merge-tree --write-tree --name-only origin/worktree-p2-p4-run HEAD` reports `CONFLICT (content):
Merge conflict in BACKLOG.md`. The plan branch's backlog commit and p2-p4's both edit that file. The only row
that applies is "Any other merge conflict: stops the line", and p2-p4 still has BACKLOG edits to come in its T11.
Fold: rebase the plan branch onto `main` after p2-p4 merges, before launch. Or add a row: at T0, keep p2-p4's
closures and this branch's stamps and placements, and take numbers past the highest on `main`.

**2. T5's rate limit rests on a member that doesn't exist. `blocker`, `correctness`, `plan:407-408`.**
Defect: `CairnEvent` (`src/lib/sveltekit/types.ts:55-83`) has no `getClientAddress`. The plan says "Confirm ...
before using it", so the confirm fails, and no stop or answer covers that. `types.ts` isn't in T5's Files either.
Adding a required member to a `@public` type changes the surface and every fake event in the tests.
Fold: decide now. Either add it as an optional member, or read `cf-connecting-ip` from `event.request.headers`.
Name the absent-address report (let the request through, as `no-binding` does). Add `types.ts`, and quote the
adapter's source for the choice.

**3. T5's #247 omits `deleteSession`, and its test claim is false. `blocker`, `correctness`, `plan:397-398`, `:411`.**
Defect: The plan hashes "on insert and lookup". `deleteSession` (`store.ts:274-280`) also keys on `id`. Left raw,
logout deletes nothing and returns null, while the session stays live in the database for anyone holding the
cookie. T5's prior-row delete on re-login would miss too. `getSession` in the acceptance doesn't exist. The
function is `resolveSession`. "Every test reads the same" is wrong: `src/tests/unit/cairn-admin-actions.test.ts:229`
asserts `c.args[0] === 'sid'` on the delete, and it is outside T5's stated test set. The named update to
`auth-cleanup.test.ts:30` isn't needed. That row is swept on expiry and only counted.
Fold: name `createSession`, `resolveSession` and `deleteSession`. Add acceptance that logout removes the row and
the cookie no longer resolves. Add the unit test to T5's Test line.

**4. T17's acceptance names a diff that can't run. `blocker`, `correctness`, `plan:859-861`.**
Defect: `scripts/checks/api-surface.md` isn't in tag `v0.98.0`. `git ls-tree` doesn't list it, and `git diff
--numstat` shows 320 added, 0 removed. "Every breaking name in `api-surface.md`'s diff from `v0.98.0`" therefore
has no removed names and passes vacuously, and it sits on a May-not item.
Fold: build the old surface from the tag (`dist` declarations, or the surface script run on a tag checkout), or
use a stated proxy such as the Unreleased `Removed` section. Name which, and seed one known removed name so the
check can fail.

## Owner fork

**5. S1 asks the conductor to rule on the ceiling. OWNER FORK, `major`, `correctness`, `plan:62-75`.**
Defect: the sheet says a plan over its ceiling takes its cuts "and stops only if still over", and that ceiling was
Geoff's choice. The plan's raw figure is 1,153, and cuts leave it over 840. S1 cites the "What can't be settled"
row, but that row covers product and taste questions, not a budget rule. `CLAUDE.md` lists overspend as a stop.
Options: (a) Geoff accepts calibrated minutes as the ceiling's unit. (b) Recut to 840 raw. (c) Run at raw and take
the stop.
Recommendation: (a), but it must be his word or a ledger ruling. It should also rest on finding 6's real hold,
because the 840 doesn't bind as written.

## Major

**6. The 840 hold can't fire in time. `major`, `correctness`, `plan:71-72`, `:201-207`.**
Defect: tasks run in order and the plan sums to 825, so actual minutes pass 840 only around T17 or T18, the last
tasks. Every set-aside item (T8, T9, T10, T12, T3, T4, T5, T6) has landed by then, and T17 and T18 can't be set
aside. "So 840 binds the run" is false. Set-aside would mean reverting finished work and saves nothing.
Fold: use a pace trigger at each pair's close: spent plus remaining plan exceeds 840. Then set aside only items
not yet started, in order.

**7. The run-limit figure discounts twice. `major`, `correctness`, `plan:77-79`.**
Defect: "At the recent ratio it ends about 2,580" applies about 0.58 to 825, which is already scaled by 0.7. The
0.58 belongs to reader-sized plan path: 1,153 × 0.58 ≈ 670, ending near 2,760. The conductor needs that margin
against 2,900.
Fold: restate it as about 2,760.

**8. T12's bar can't be met. `major`, `correctness`, `plan:697-700`.**
Defect: The rule requires that "its target capability case improves". T12 changes cases and the harness, not the
skill, and one `run.mjs` and one `evals.json` serve both arms. The new case has no process change to improve on.
`evals.json` holds 10 regression cases and no capability case. `main <branch>` also can't measure #191's allow-list
change, because both arms run under the same harness, so the sweep's "compare before merging" isn't met. "A
refused or broken run" would read an unmet bar, or a usage pause, as cause to revert.
Fold: State the bar: no regression drop, and the capability case passes on both arms, with a recorded `## Decisions`
line that nothing was meant to improve. For #191, compare against the last recorded baseline. Answer exit 4 (usage
limit) with `--resume <runId>`, not a set-aside.

**9. T12's proof doesn't reach the permission engine, and the eval questions are unanswered. `major`, `correctness`, `plan:691`, `:694-697`.**
Defect: `run.test.mjs` can show a pattern is in `DENIED_TOOLS`. It can't show Claude Code refuses the command, so
"proves each denied form is refused" can pass vacuously. A glob for `sed -n` with `w` over-matches. `Bash(sed -n
*w*)` hits any path or pattern containing a `w`, so ordinary reads get denied. A denied `sed` isn't a fault under
`NEEDED_COMMAND`, but it silently changes scores. `chmod` on hard-linked `node_modules` changes shared inodes across
trials and the cache. The plan has no measured session length and no estimate. With 12 cases, two arms and three
trials that is 72 sessions at the default four in flight, and "adds no path" is unsupported if the suite outlives
T17. It also doesn't state how a denied compound classifies, or the background-subagent answer, though `Agent` is an
allowed tool.
Fold: name the deny patterns and probe each in one real `claude -p` session. Pick "copy" for `node_modules`. State
one session's length and the suite estimate. Cite `deniedFaults` (`run.mjs:478-499`) for the recovery rule.

**10. T15's #207 can't run in a `cairn-implementer`. `major`, `correctness`, `plan:794-801`, `:215`.**
Defect: the agent's tools are `Read, Write, Edit, Bash, Grep, Glob, Skill`, with no `Agent`. The docs say to stop a
subagent spawning by omitting `Agent` from its `tools` list, and this file does. Step (2)'s judge dispatch can't
happen from inside the pair task. `docs/STATUS.md`, written at step (4), isn't in T15's Files.
Fold: the session dispatches the judge after T15's claims commit. Add STATUS to Files, or move the record to T17,
which already owns the Evaluate line. Name the judge's input as extracted page text, and state that an unmet grade
is recorded and fixes nothing here.

**11. T9 misses the shipped hook snippet and the test that pins it. `major`, `correctness`, `plan:554-557`, `:572`.**
Defect: `src/tests/unit/packaging-guidance.test.ts:114` asserts "settings-hook.json is byte-identical to the
fragment's own hook block". Moving the block out of `claude/CLAUDE.md` breaks that test, and wrapping the command
changes `claude/snippets/settings-hook.json:9`. Neither is in Files, and `cairn-implementer` commits only listed
files. The plan also quotes no docs for its hook mechanics. Exit 1 is non-blocking: "Exit code 1 without valid JSON
output is a non-blocking error". The exit-2 path says Stop continues the conversation. The SubagentStop text says
exit 2 delivers stderr, so a finding printed to stdout may never reach Claude. The wrapper's way of reading
`stop_hook_active` from stdin in a site with no `jq` is unstated.
Fold: add both files. Quote the Stop section. Send findings to stderr and read stdin with `node`.

**12. Every head from T1 to T15 is expected red, and no row says so. `major`, `correctness`, `plan:182`, `:193`.**
Defect: #275, #262, #283 (ten `styleguide-*` baselines) and ergonomics 7 change renders before T16's single dispatch.
`e2e` is red on those heads, and the "CI red" row sends the run to trace, fix, then set aside. Each report must
name a CI verdict, and a real e2e failure hides among expected ones. A T18 fold that moves a baseline has no dispatch
left, since the pre-flight allows a second only for a `main` merge.
Fold: add a row. A failure that is only `toHaveScreenshot` on an image the task listed as intended isn't a red, and
any other failure is. Allow the second dispatch for a T18 fold too.

**13. T8's acceptance grep can't reach zero. `major`, `correctness`, `plan:544`.**
Defect: today `e2e pins|showcase|exercising` hits 16 files under `templates/waymark` outside `.claude`. Many are
outside T8's Files: five sample content files, `index.json`, `wrangler.jsonc`, `vitest.config.ts`, `.prettierignore`,
`(site)/+layout.svelte`, `robots.txt/server.test.ts`. As written, `grep -c` also needs `-r`.
Fold: read every hit now, then widen the Files or scope the grep to the files T8 rewrites, with an allowlist for real
uses.

**14. S5's fallback is another path to a refused credential. `major`, `correctness`, `plan:105-106`.**
Defect: `source ~/.local/secrets` was refused, so the plan rightly says no task reads it. "Fold it instead only if
the conductor can launch the executor with the key already in its environment" then gets the refused effect a
different way. The BACKLOG line carries the same idea forward. The sweep's "Reading the setting needs
`$CLOUDFLARE_API_TOKEN` from a session the guard allows" is in a file dispatches quote from.
Fold: delete S5's fallback. #211 moves after the release, full stop. Don't quote the sweep's "Could not settle" list
into T15's brief.

**15. T5/T6 share four files, and pairs need disjoint files. `major`, `correctness`, `plan:371-373`, `:419-421`.**
Defect: both list `src/lib/log/events.ts`, `events-list.ts`, `tool/internal/logs/events.go`, and `log-events.md`.
Both skill edits also regenerate `templates/waymark` and `guidance-hashes.json`, which neither lists. The "keep both
lines" row manages the conflict but doesn't make the pair disjoint, and T5 is the `auth-data` one.
Fold: T6 reports its event, and the session adds it after T5 merges. Or accept the overlap explicitly, under
`## Decisions`. Add the generated paths to T2, T5, T6 and T15 too, since `cairn-implementer` commits only listed
files.

## Minor

**16. T13's parallelism is overstated. `minor`, `correctness`, `plan:221`, `:709`.**
`cairn-run-gate` uses one machine-wide heavy lock. Nine runs of four to five minutes each, plus a timing run, queue
against T11's e2e runs, the lanes, and `make -C tool check` unless that uses `CAIRN_GATE_LANE=light`. "Adds nothing"
is optimistic, and T11's "idle CPU" base rate needs a line on what else is running.

**17. T13's text is underspecified. `minor`, `correctness`, `plan:704-726`.**
Its command drops `--exclude`, `--coverage.reportsDirectory` and `--outputFile`, all in state read 12. Each run then
overwrites `./coverage`, which isn't gitignored, so the `git status` check also goes dirty. Write the command in full.
"No commit" contradicts "A defect row files a BACKLOG item". Have the session file those. The `--exclude` flag across
a multi-project run is unprobed, and the worktree has no install, so the reviewer couldn't probe it either. Run one
excluded file first and confirm the test count drops. The docs say background subagents "get a smaller built-in tool
set". State a probe that a background `cairn-implementer` under `claude --bg` has Bash, and cover #73453. Its report
shape requires a commit SHA and a lane, so tell it what to return instead.

**18. Stale placements remain. `minor`, `correctness`, `BACKLOG.md:117`, `:104`, `:198`, `:47`.**
#248 still says "Pass 7, sign-in messages", and #250 says "Cleanup round" though the plan keeps it with its home
elsewhere. #190 and #284 keep this round's placement while they wait on triage. T17 should move all that stay open.
#248 is also in neither the Set-aside order nor May-not, though it is T5's riskiest item. Say which.

**19. The Set-aside order goes past the sheet's list. `minor`, `correctness`, `plan:201-207`.**
The sheet's "May set aside" is R7's `check-admin-prose` question, R8, and ergonomics 11, 12, 14. The plan adds R7's
wrapper fold and eight filed items, reading absence from May-not as permission. #188 is named in the sheet's filed
scope. The sheet's event row does say "if the plan allows", so this is defensible. List it in `## Decisions` and in S1
so the conductor sees it, or drop #188.

**20. Two wrong source lines. `minor`, `correctness`.**
`plan:474`: `theme-fixture.mjs:16` is a comment. `PAGES` is at `:81`. `plan:561`: the `check:cairn` command is at
`claude/CLAUDE.md:56`, not `:64`. The state read's `:16,81` caused the first. The plan says every cited line was
quoted.

**21. T15's module change is misclassed and its Files are short. `minor`, `correctness`, `plan:765-767`, `:803-804`.**
`tool/Makefile:7` and `.github/workflows/tool.yml:176` carry the path for `-ldflags -X`, and neither is in Files. The
Go linker ignores an `-X` for a symbol that doesn't exist, so a missed one silently ships an unstamped binary, and the
acceptance grep for `cairn-cms/tool/cmd` can't see either. `tool.yml` makes the commit `runner`, with a `ciWait` line
and a pre-flight entry. The pre-flight lists only T7 and T10 for workflows. Non-import strings also change
(`internalPackagePrefix`, the `const path` and `const cairn` strings). Add a built-binary version check to the
acceptance.

**22. T10's acceptance grep can't pass until T18. `minor`, `correctness`, `plan:629-630`.**
`git grep 'SHARD_TOTAL\|e2e report'` also hits this plan and the state read. Scope it to `.github scripts src
.claude`. It does fail on the unchanged tree, in `e2e.yml`.

**23. T11 cites a line that won't exist. `minor`, `correctness`, `plan:660`, `:673`.**
"The e2e line from `p2-p4`'s plan" is in a plan file that won't be on `main` if p2-p4's close deletes its plan files,
as this one does. Copy the full command here, with `--retries=0`, plus p2-p4's row for a listener on ports 4392 and
4394.

**24. T8's ergonomics 12 can overwrite `precheck`. `minor`, `correctness`, `plan:537`.**
"Set `precheck` at emit" replaces `npm run build:admin-css` unless it's chained. Say so, and quote wrangler's `--check`
flag from its docs.

**25. Small gaps at close and in row coverage. `minor`, `correctness`.**
- `plan:868`: `standards:go-conventions` is a skill, not a dispatchable reviewer.
- `plan:869-871`: T18 doesn't rerun `check:docs-gate` after the last docs edit.
- `plan:188`: `api-surface.md` on a `main` merge falls under "stops the line", though it is regenerated. Add it to the
  generated row.
- `plan:400`: T5's `Consumers must:` line conflicts with `:180` and T17. Drop it.
- `plan:124-137`: the pre-flight omits T10's `evals/site-fixture.mjs`.
- `plan:578-579`: filing ergonomics 8's backlog item isn't in T9's Files.
- `plan:492`: the emitted `src/chassis/README.md` lines and other `/styleguide` comments stay stale. State read 9
  lists them and T7 doesn't.

**26. Sheet items done but unstated. `minor`, `optional`, `plan:26-54`.**
#166, #75, #55, #85, #90, #92, #93, #94 and ergonomics 22 are named nowhere in the plan. All are closed. One line
closes the scope audit.

## Over-ceremony

**27. Unreleased lines written only to be erased. `minor`, `optional`, `plan:216-217`.**
Every pair reports `CHANGELOG` and `MIGRATION-NOTES` lines for the session to write, and T17 then consolidates all of
them. Collect them in the PR body and write once in T17. The saving is a few minutes per pair and one set of
`main`-merge conflicts.

**28. Stale conditionals. `minor`, `optional`, `plan:315-316`, `:405-406`.**
#266's "If one isn't, add it there first" is settled: all three are present. T5's "unless T4 of `p2-p4` changed that
code" is settled too. On `origin/worktree-p2-p4-run`, `/admin/login?error=expired` stays a redirect code. Only
`RefusalCode` loses `expired`. Cut both.

Files read: the four plan files, the run sheet, `ledger.md`, `.claude/agents/cairn-implementer.md`,
`.claude/rules/evals-docs-process.md`, `.claude/skills/cairn-writing-docs/evals/run.mjs`,
`/var/home/glw907/.local/bin/cairn-run-gate`, `/var/home/glw907/.claude/settings.json`. Docs quoted:
`code.claude.com/docs/en/sub-agents` and `/hooks`. The hooks fetch didn't return the Stop input section, so finding 11
asks the plan to quote it.
