# Mechanics review: tool-fixes plan at 25efc8e81

Target: `docs/internal/plans/2026-11-01-tool-fixes-plan.md`. The verdict is fold before launch: no
blockers, 6 majors. Plan line numbers below are `plan:N`. The `standards:plan-reviewer` agent's reply,
saved by the planning session.

**Probes that ran:**
- The whole unit project under an fs-read logger: 376 files, 5,257 passed, 76.6 s.
- `decideFastGate` on this pass's own diffs.
- A bash probe of the serial join.
- A read of the Playwright 1.64.0 tarball (the showcase lockfile's version; the worktree has no showcase install), Svelte 5.57.2 source, and the Tailwind and RE2 docs.
- `gh` run and PR reads.

**Probes that did not run:** The worktree guard refused the regex probes, so T2's base-reader results below come from reading and from the RE2 doc, not from a run. The Svelte compile probe was refused too. Delegation is shown by `DELEGATED_EVENTS` in `svelte/src/utils.js:112` and the `$.delegated` branch in the compiler's `shared/events.js:79`.

## Major

**1. major, correctness: `toolInputs` misses a Go reader. `plan:107-114`**
- `tool/internal/health/fixes_test.go:255` reads `scripts/checks/shipped-anchors.json`, which is not on the list.
- A change to that file runs no tool gate, which is #241's own failure.
- `package.json` is also read (`corpus_test.go:23`, and `corpus.go:36` during the root walk). That one matters only for the name field.
- Every other listed entry matched a grep of `tool/**/*.go`. `tool/scripts/vale-comments.sh` uses a `cd` into `tool/` and reads nothing outside it by path, though I did not read the Vale config it picks up.
- Fold: add `scripts/checks/shipped-anchors.json` with its citation, and add `package.json` or state why it is left off. Add one acceptance row for the JSON file.

**2. major, correctness, OWNER FORK: `src/` on `unitSelectable` lets run-time readers through. `plan:98-106`, `plan:84`**
- T1's title says run-time readers are seen. The logger found 38 unit test files reading non-test `src/` files at run time, including `server-only-deps`, `check-idioms`, `editor-boundary`, `engine-isolation`, `cairn-public-surface`, and the admin CSS suites. An import graph sees none of those reads.
- There is a worse sub-case. `unitInputs` (`gate-tier.mjs:671-672`) admits only `.ts|.js|.mjs|.svelte`. A `.css`, `.txt`, or font path under `src/` is selectable and not a unit input, so `decideFastGate(['src/lib/admin/fonts.css'])` prints `unit tests: none` (run here).
- Options:
  - (a) Keep `related` for the four code extensions, send any other `src/` path to whole, and record that a code edit still misses fs readers.
  - (b) Run whole on every `src/` path: at most 77 s per lane, on the commonest path.
  - (c) Leave as written.
- Recommendation: (a). It closes the free hole, keeps the speed, and states the rest. Add `src/lib/admin/fonts.css` (or any real CSS path) to acceptance, expecting `npx vitest run --project unit`.

**3. major, correctness: `docs/` and `MIGRATION-NOTES.md` as selectable leave one unit reader with no static twin. `plan:98-100`, `plan:130`**
- `github-slug-contract.test.ts:141-152` reads `MIGRATION-NOTES.md` and `docs/admin/own-your-domain.md` and requires exact heading lines. Rewording either reds CI only.
- Other readers have twins on the docs bucket:
  - `docs-links.test.ts` has `scripts/checks/docs-links.mjs`.
  - `check-editor-quotes`, `check-rulings-format`, and `check-symbols` each have a check of the same name.
- `packaging-guidance.test.ts` also reads `MIGRATION-NOTES.md`. I did not read what it asserts.
- Fold: pick one and write it down.
  - Have a docs path also run `npx vitest run --project unit src/tests/unit/github-slug-contract.test.ts`, which changes the `:911` pin and acceptance at `plan:130`.
  - Or state the exception by name under `unitSelectable` and file it.
- I recommend naming the exception or running the one file. Nothing here warrants a new table key.
- The answer to "does the list leave a common path needlessly whole": no. `scripts/`, `.claude/`, `examples/`, `skills/`, `.github/`, and `package.json` all have real readers in the log. `SECURITY.md` is the only trivial miss, and `docs-links` reads it.
- Consequence to record: `scripts/` is off the list, so the `scripts` half of `unitInputs` at `gate-tier.mjs:671` and the wording at `:681` become dead. T1's Files should say to remove it.

**4. major, correctness: the plan runs the whole component project locally on nearly every lane. `plan:48`**
- The row says "Local browser run | none planned", and the context says the heavy lane is contested.
- `componentPlan` returns `full` when nothing reaches `src/` (`gate-tier.mjs:480`). Run here, these diffs all print line 2 `npm run test:component -- --no-file-parallelism`, the "nothing under src/ to select from" case:
  - T1's paths
  - `.github/workflows/test.yml`
  - `examples/showcase/e2e/editor-helpers.ts`
- The range is cumulative from base, so later lanes depend on what the range has reached by then. T2's own paths reach `src/lib/guidance` and print no line 2.
- Whole component takes the longest local browser time in the lane, and it is not on the path. I did not measure it.
- Fold: state this in Pre-flight and name the answer. Either the lane runs and defers under `RUN_GATE_IF_BUSY=defer`, or T1, T3, T4, and T5 stop at line 1 with line 2 left to CI, recorded as a decision. Changing `componentPlan` is scope growth; file it.

**5. major, correctness: T5 stage 2's helper shape can hang, and `toPass` has no timeout of its own. `plan:244-246`, `plan:254-255`**
- `plan:254` says "`toPass` keeps its own timeout". The Playwright 1.64 types say otherwise: `timeout: 60_000 // Defaults to 0` (`types/test.d.ts:8920`). Every existing `toPass` in `examples/showcase/e2e` passes one.
- A click-first loop re-clicks a background button if an earlier pass opened the dialog but its short check failed. A modal covers the page, so I expect that click to time out on every retry. Not probed.
- Fold: name the shape. Inside `toPass({ timeout: 15_000 })`:
  1. If the dialog is not open (`evaluate(d => d.open)`), click with a short timeout.
  2. Then `expect(dialog).toBeVisible({ timeout: 500 })`.

**6. major, correctness: T1 undercounts the tests its join breaks, and its replacement can go vacuous. `plan:65-66`, `plan:135-139`**
- A serial non-short-circuit join removes ` && ` between legs, so `gate-tier.test.ts:950` (`expect(line1.slice(marks[0], marks[2])).toContain(' && ')`) also fails. The plan names only `:960-961`.
- The comment at `:916`-area and the title at `:946` also read as chain language. The test at `:938` survives.
- The ` && ` was the only proof that the legs share one serial group. An order-only replacement would still pass if a leg moved to `parallel`.
- Fold: name `:950`. Replace both pins with "no `& pids=` between the first and last mark". The ordering check at `:949` stays.
- The join itself works. `rc=0; { false; } || rc=1; touch f || rc=1; [ $rc = 0 ]` exits 1 and the file exists (run here). The `rc` name is safe inside `concurrently`'s background group.
- The `gate-tier.test.ts:958` regex still works, since `[^&;]+` stops at `;`. A form without braces lets `|| rc=1` into `subset`, which is harmless.

## Minor

**7. minor, correctness: T2's guidance claim rests on a doc that doesn't say it. `plan:154-157`**
- The Tailwind page does not state what `source()` is relative to. The page gives "relative to the stylesheet" only for `@source`. The plan reads that page as saying so. Both acceptance cases at `plan:169-170` depend on it.
- Fold: quote the Tailwind source (the compiler's base resolution) or run one probe before coding, and cite it in the code comment.

**8. minor, correctness: "repo root or an ancestor" has a prefix trap. `plan:155`**
- From `src/app.css`, the resolved values are `../src` → `src`, `..` → `.`, `../..` → `..`, `../../x` → `../x` (run here).
- A `startsWith('..')` test calls `../x` an ancestor. The test must accept `.` or only repeated `..` segments.
- Also add a `source('../src')` single-quote case, since `ENTRY_IMPORT` admits both quote forms, and update `judgeSourceExclusion`'s doc comment.

**9. minor, correctness: T2 corpus details. `plan:166-168`**
- Each new case needs `valid`: `check-consumers-must.test.ts:19` compares it with `toBe`, and `plan:166` names only actionable.
- From reading, "Each case fails on the base readers" holds per reader, not for each reader:
  - CRLF nothing fails only Go (body `nothing.\r`).
  - CRLF action and NBSP fail only JS.
- Fold: write that table and require each case red on its named reader, so a green JS run on CRLF nothing doesn't read as a dead case.
- "Go strips the carriage return" is unspecified. A `\r\n` replace misses a final `\r` with no newline, which JS's `/\r$/` strips. Use `(\S.*?)\r?$` or a per-line trim, and add that case.
- The regex claims otherwise hold. RE2 doc: "not whitespace (≡ `[^\t\n\f\r ]`)". `LINE` is used only at `:30` and `:55`, on single lines, so the `s` flag cannot cross lines.

**10. minor, correctness: T2's task class is wrong. `plan:141`**
`.claude/skills/cairn-running-passes/SKILL.md:31` puts `scripts/checks/**` in `runner`, and T2 edits two such paths while declaring `ordinary`. T3 declares `runner` for `.claude/**`, which that skill maps to `ordinary`. Swap both labels. The merge path doesn't change.

**11. minor, correctness: T3's acceptance grep passes with the edit missing. `plan:189`**
- `git grep '/tmp/'` on `cairn-implementer.md` prints nothing today (checked with grep). "Shows only the warning" reads as satisfied by empty output.
- Fold: require exactly the warning line, and a separate positive grep for `.lane.log` and "exit code".

**12. minor, correctness: T1 is protected and the plan doesn't say so. `plan:84`, `plan:213`**
- `gate-tier.mjs` and `gate-table.json` are on the `protected` list, and `pass-gate-tiers.md:180` says the task then waits for CI green on its commit. The plan marks only T4 `ciWait`.
- Fold: add the wait to T1, off the path, and say the draft PR opens first, since the workflows fire on `pull_request`.

**13. minor, correctness: "every leg runs" is true of line 1 only. `plan:84`, `plan:121`**
- `fast-lane.mjs:67-70` still returns on a red line, so a line 1 red hides line 2.
- `fast-lane.mjs:2` and `:57` say "the first leg that fails", and T1's Files omit that file.
- Fold: add its header comment and make the `SKILL.md:24` wording line-accurate.

**14. minor, correctness: T4's arithmetic and stub. `plan:200-201`, `plan:209-210`**
- `timeout -k 30s 10m` makes the worst case 10.5 + 1 + 10.5 = 22 minutes, equal to `timeout-minutes: 22`. "Stay under" holds only without the `-k` grace. The outcome is a failure either way, so a comment fix is enough.
- A `sleep` stub on `PATH` also catches `sleep 570` in the watchdog at `action.yml`. A stub exiting 0 fires the snapshot branch with an empty `DUMP_SCRIPT`. The stub should exit non-zero on anything but `60`. The acceptance should also say how the block is extracted, and run it with `bash -eo pipefail` as Actions does.

**15. minor, correctness: T5's `opened` is undefined. `plan:230-231`**
- Fold: `dialog.evaluate(d => d.open)` directly after the click, with no auto-waiting assertion, then keep `toBeVisible` so the run still fails as it does today.

**16. minor, correctness: the plan states no CI verdict in task reports. `plan:9-12`**
Neither the plan nor the sheet's "Standing answers" makes each accepted-task report name the CI verdict on that head. Fold: add it to the executor prompt.

**17. minor, correctness: a tool-only diff still misses an npm reader. `plan:116`**
- `check-symbols.test.ts` and `check-symbols.mjs:412`, `:430` read `tool/testdata/flags.json`. A tool-only diff has no `npmPaths`, so neither runs. This is #241 in reverse.
- Keeping that out of scope is reasonable. File it as a found item.

**18. minor, correctness: T1 makes Go a docs prerequisite. `plan:131`**
- Any `docs/admin/**` edit now runs `make -C tool check`, while `fast-lane.mjs:3` says anyone with a clone can run the lane.
- Fold: one line in `pass-gate-tiers.md` naming the Go and Vale requirement.

**19. minor, optional: the worktree has no showcase install. `plan:36-49`**
`examples/showcase/node_modules` is absent here and in the main checkout. The showcase legs that T5 selects need the `cairn-running-passes` setup command. Add it as a pre-flight line.

**20. minor, optional: a pre-flight row names the wrong task. `plan:42`**
It names T1 for the `cairn-implementer.md` edit; only T3 edits it.

**21. minor, optional: the T5 clock. `plan:63-64`**
- The hook fires on wall clock. e2e runs took about 7-10 minutes in the recent list, so 90 minutes fits two or three rounds.
- A stop during acceptance would still trigger "set #208 aside" on a working fix. Add: past stage 2, finish acceptance, then decide.

**22. minor, optional, over-ceremony: stage 1's separate trace round. `plan:223-243`**
- The re-click helper can log `handler`, `open`, and an attempt count itself. A first-attempt `handler=false` that opens on a retry proves the cause in the same five runs that serve as acceptance.
- That drops one commit, one revert path, and three CI runs. The cost is that the five runs are read for two questions.
- The set-aside branch still works: an unexplained count sets #208 aside.

## Checked and held

**T5 probe**
- `delegated()` writes `element[event_symbol]` as an own symbol property (`events.js:147-149`).
- `click` is delegated.
- The other symbol caches also land only when hydration touches the node, and nothing sets one on server markup, so `getOwnPropertySymbols(el).length > 0` distinguishes hydrated from not.
- `replay_events` covers only `onload` and `onerror`, so a pre-hydration click is dropped, never replayed.
- The handler is set on the button, and `bind:this` is an effect, not an interleaving point for a click. That last part I read and did not probe.
- `events.js:287` is cited correctly.

**CI**
- The trace reaches the log. e2e uses `--reporter=dot,blob,json` (`e2e.yml`), and `DotReporter.onStdOut` writes stdout chunks unless `quiet`.
- Flaky failures print in the summary (`failuresToPrint = [...unexpected, ...flaky, ...]`), so the grep at `plan:252` sees a retried hit.
- There is no `concurrency` key in the part of `e2e.yml` I read, and `workflow_dispatch` is present.

**T5 numbers:** (6/13)^5 ≈ 2 percent. Eight specs and 14 sites are correct, 13 with `New post` and one with `New fragment`, all shaped as quoted.

**Close:** `test.yml:143` runs `check:docs-gate`, so green CI on the head after the final commit covers the docs gate.

**Quotes:** Spot-checked quotes match at their citations: `gate-tier.mjs:655,669,674-675,714,717`, `check-consumers-must.mjs:17`, `check_engine.go:35`, `check.ts:65` region (the actual line is `:69`, `:68` for `isEntry`), `:104`, `action.yml`, `test.yml:80-81`, `create-site.yml:54-55`, `cairn-implementer.md:24`, and `check-skill-budget.mjs:118`.
- `gate-tier.mjs:185` for the typedef is correct.
- `plan:157` says `check.ts:65`; correct it to `:69`.
- `plan:113` `park_test.go:49` has the slice at `:49`, the join at `:50`. That one is fine.
- `plan:72`: PR #183 is still open, so the standing answer stays live.
