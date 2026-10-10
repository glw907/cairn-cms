# Gate economy plan review: mechanics and feasibility

Lens: does every mechanism the plan relies on behave as stated. Target:
`docs/superpowers/plans/2026-10-09-gate-economy.md` at `211b1a37`. Every claim below comes from a
probe run outside the repo (throwaway worktrees under `/tmp/claude-1000/gemr/`, since removed) or
from quoted source or docs. Only gaps that affect correctness, the stated requirements, or the
scored clock are listed.

Counts: 0 blocker, 5 major, 7 minor.

## Major

### M1. Neither the trigger canary nor the classifier's Node API call sees the trigger list

- **Plan:** lines 472-475 (leg 4, the Node API selection) and 500-502 (the trigger canary and its
  anchor mutation).
- **Defect:** the draft's `vitest.config.ts` turns on `COMPONENT_RERUN_TRIGGERS` only when
  `process.argv` contains `related` or starts with `--changed`:
  `const RELATED_RUN = process.argv.slice(2).some((arg) => arg === 'related' || arg.startsWith('--changed'))`.
  The classifier calls `createVitest` in-process with `node gate-tier.mjs --range ...` argv, and
  the canary runs inside the unit project, whose argv is the Vitest fork worker. Neither argv
  contains `related`, so `forceRerunTriggers` falls back to Vitest's two defaults. Vitest's
  `filterTestsBySource` returns every spec only when `forceRerunTriggers` matches a related file
  (`cli-api.CnMVyzaz.js:11561-11563`).
- **Evidence:** I ran a `createVitest('test', { related: [<root>/src/lib/admin/admin-icons.ts], project: 'component' })`
  probe on `main` with `075bc174` cherry-picked:

  | Context | Selected | Triggers in config |
  |---|---|---|
  | plain node, no `related` in argv | 37 of 90 | 2 |
  | plain node, `related` pushed onto argv | 90 of 90 | 16 |
  | nested inside `vitest run --project unit` (the canary's home) | 37 of 90 | 2 |
  | plain node, `forceRerunTriggers` passed in the options | 90 of 90 | 1 |

  As specified, the canary goes red on correct code. An implementer who makes it green by
  passing the shared list into `createVitest` makes it tautological. It then tests Vitest's
  matcher against the list instead of the config, and the "drop the absolute-root anchor"
  mutation in `vitest.config.ts` becomes invisible to it.
- **Fold:** in Task 3's Outcome, replace the argv sniff with an explicit switch that both the
  classifier and the canary set, for example an environment variable such as
  `CAIRN_RELATED_RUN=1` that the emitted leg also carries. Keep the watch-mode exemption. The
  canary loads the real config with that switch on and asserts 90 of 90 per entry. Also note
  that the anchor mutation can only go red in a checkout under a dot directory (a
  `.claude/worktrees` worktree), never on CI. The quoted red must come from the worktree.

### M2. The job-timeout test cannot pass on the two reusable-workflow call jobs

- **Plan:** lines 345-346 (pre-flight S1: "every job in every workflow sets `timeout-minutes`"),
  429-430, and 437-438 (Task 4a: "the workflow suite fails on any job without
  `timeout-minutes`").
- **Defect:** `e2e.yml`'s `norms` job and `publish.yml`'s `norms` job are
  `uses: ./.github/workflows/norms.yml` calls with no `timeout-minutes`, and GitHub does not
  allow the key there. If an implementer adds it to satisfy the test, the workflow file becomes
  invalid and `e2e` fails to start on the draft PR.
- **Evidence:** a parse of every workflow prints `norms timeout undefined` for both jobs, and
  every other job sets a timeout. GitHub's reusable-workflows reference lists the supported keys
  for a calling job: `name`, `uses`, `with`, `secrets`, `strategy`, `needs`, `if`,
  `concurrency`, `permissions`, and `cache-mode`. `timeout-minutes` is not among them. Both of
  `norms.yml`'s own jobs set 20.
- **Fold:** the test exempts a job that has `uses:` and instead asserts that each job in the
  called workflow carries a timeout. Correct the S1 pre-flight wording so the pre-flight does not
  "find a moved fact" and amend the plan mid-run.

### M3. "New `scripts/` files join `check:comments`" passes vacuously, or turns red 126 times

- **Plan:** lines 170-171, Task 2's Files at 382, and Task 4a's Files at 419-422 (a new
  `scripts/ci/` script, with no `eslint.config.js` in its Files).
- **Defect:** `eslint.config.js`'s `COMMENT_GLOBS` covers only `*.ts` (`src/lib/**/*.ts`, the
  dev-package, and the showcase). Adding a `.mjs` path to the `lint` or `check:comments` command
  line without a matching config block lints it with zero rules, and eslint exits 0. On the other
  hand, applying the existing TypeScript ruleset to `.mjs` files fails, because those files need
  JSDoc `{type}` annotations.
- **Evidence:** eslint over the draft's three `.mjs` files with the current config exits 0. With
  the files added to `COMMENT_GLOBS` it reports 126 findings: 93 `tsdoc/syntax`, 27
  `jsdoc/no-types`, and 6 `jsdoc/check-tag-names`. With jsdoc's
  `flat/recommended-typescript-flavor-error`, which the installed plugin ships, it reports 27
  findings, all `require-param-description`, `require-returns-description`, or `require-jsdoc`.
- **Fold:** Task 2 adds one config block for new `scripts/**/*.mjs` files: the
  typescript-flavor jsdoc config plus `house/no-em-dash-in-comments`. Tasks 3 and 4a inherit it.
  Add one acceptance mutation: an em dash in a comment in a new script makes `check:comments` go
  red.

### M4. The e2e map selects `site-visual.spec.ts` locally, where 20 tests are known reds

- **Plan:** lines 478-481 (leg 6), 494-495 (every spec must be reachable from the map), and
  732-733 (erratum 11: the `--grep-invert` variant is "mooted except in the fallback").
- **Defect:** the reachability acceptance forces some map entry to select `site-visual.spec.ts`.
  Its `site home` and `archive page 2` tests fail on this workstation's Chromium against the
  CI-canonical baselines (`durable-gotchas.md`, "CI-canonical baselines"). The emitted e2e leg
  carries no `--grep-invert`, so every theme, render, or site-route diff in pass B gets a
  guaranteed local red. The `toHaveScreenshot` calls at `site-visual.spec.ts:32` and `:56` run
  without a CI guard, and `retries` is already 0 locally.
- **Fold:** when the map selects `site-visual.spec.ts`, the emitted leg appends
  `--grep-invert "site home|archive page 2"`. Alternatively, mark that spec CI-only in the map.
  Erratum 11 keeps the variant as live, not mooted. Add a Task 3 acceptance case for it.

### M5. The clock estimate leaves a CI wait on the critical path that a cheap reorder removes

- **Plan:** lines 40-52 (estimate), 73-74 ("its Task 7 starts when S1's boundary is green"), and
  515-517.
- **Defect:** the S1 boundary needs CI green on Task 3's head. That is a second CI cycle beyond
  Task 4a's, and it sits between Task 3 and Task 7 with no row in the table: a 663 s test job
  plus a measured queue of up to 1,232 s. The per-task rows are also tight against measured gate
  times. Task 2's single gate run is about 21 min (package about 1 min, node projects 233-290 s,
  serialized component 224-249 s, and the prebuilt `check:close` 679 s), against 45 min for
  implementing, gating, and review, with no room for a second red-green run. The 45 min close
  holds the simplifier, two Opus `high` reviewers, a CI cycle, and possibly a targeted re-gate
  plus a second CI cycle.
- **Evidence:** the measured numbers come from the pass-inputs file (lines 31 and 132) and the
  spec's baseline table. A realistic critical path is about 4.75 to 5 h against the stated
  4.25 h.
- **Fold (method, no owner input):** start Task 7 at Task 3's acceptance and read S1's CI in the
  background. Task 7 writes one record file, and an S1 red reroutes through Task 3's chain anyway.
  Run the close's two reviewers while the close CI wait runs. Restate the estimate with the CI
  waits as their own rows, so the pass-end score reads them as CI wait rather than rework.
  Optional: Task 4a could run in a second cairn-cms worktree beside Task 2 (disjoint Files, light
  lane). That saves about 25 min, at the cost of one cherry-pick. Take it only if the reorder
  above is not enough.

## Minor

### m1. Task 4b's live call can run before `.github/ci-green.json` exists on the PR head

- **Plan:** lines 555-557, 565, and 584-585.
- **Defect:** the dotfiles track reaches 4b's live call at about Task 1 plus Task 4b, roughly
  70 min. Task 4a pushes the file at about Task 2 plus 4a, roughly 80 min, plus the CI queue.
  `git show <sha>:.github/ci-green.json` fails on a head without it, and the plan does not
  classify that case.
- **Fold:** an absent expected-set file at the SHA exits 3 (unavailable) and names the file. The
  live call either waits for 4a's push or quotes that exit 3 as its acceptable evidence.

### m2. The detached run's record races the caller's state cleanup

- **Plan:** lines 531-535.
- **Defect:** the caller removes `$state/queued`, `acquired`, and `head` as soon as `status`
  appears (`cairn-run-gate`, the `rm -f "$pidfile" "$statusfile" "$state/queued" ...` after
  `write_receipt`). A record appended in the subshell after `echo $? >"$statusfile"` can read
  deleted files. Separately, the `vanished` and `receipt` outcomes cannot come from the detached
  run: the vanish path runs only in the caller, and `--receipt` starts no run. The plan's "written
  by the detached run itself" covers `exit` only.
- **Fold:** append the record before writing the status file. Name the writer per outcome: the
  detached run writes `exit`, and the detecting caller writes `vanished` and `receipt`.

### m3. `ci-green`'s workflow key and its working directory

- **Plan:** lines 195-200 and 203-204.
- **Defect:** the expected set is keyed by workflow file path, but `gh run list --json` exposes
  no path, only `name` and `workflowName`. `ci-green` also depends on its working directory for
  `git show`, the merge-base, and `gh`'s repository inference, and the interface does not say so.
- **Evidence:** `gh api "repos/glw907/cairn-cms/actions/runs?head_sha=8483ca5b..."` returns
  `path` (`.github/workflows/e2e.yml`) and `run_attempt` per run.
- **Fold:** name the REST runs endpoint in Task 4b, and state that `ci-green` runs from inside a
  clone of the repository.

### m4. Task 3's self-range acceptance gives the wrong reason

- **Plan:** lines 506-507.
- **Defect:** "the trigger list is a trigger" assumes Task 3's range touches
  `component-rerun-triggers.mjs`, which is not in its Files. The whole component project still
  runs, but through the empty-selection rule for a diff with no `src/` paths. A reviewer reading
  the classifier's stderr may flag the mismatch.
- **Fold:** reword to "the whole component project (by trigger or empty selection)".

### m5. The close's ledger commits land after its CI read

- **Plan:** lines 765-770 and 781-797.
- **Defect:** steps 6 and 7 commit STATUS, HISTORY, ROADMAP, and the post-mortem after the
  step-2 CI read on the close commit, so no CI read covers the final head. Separately, if the
  conductor's checkpoint STATUS commits on `main` (line 176) are pushed, step 6's STATUS rewrite
  conflicts at the owner's PR merge.
- **Fold:** run one background `ci-green` on the final head before the owner message. State that
  checkpoint commits on `main` stay local until the merge, or make step 6 merge `main` first.

### m6. Port 4392 with `reuseExistingServer` drops pass A's port precheck

- **Plan:** lines 222-223 (Decision 3).
- **Defect:** `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`. A server left
  listening on 4392 by a vanished gate in another worktree would be reused, and the gate would
  silently test the wrong tree. Pass A guarded this with a check that `ss -ltnp 'sport = :4392'`
  shows no listener (`2026-10-08-engine-pass-pre-2b-a.md:193`), and the computed leg drops that
  guard.
- **Fold:** the emitted e2e leg fails closed when 4392 already has a listener. `rendered.test.ts`
  is unaffected: it reads `BASE_URL`, stubs `fetch`, and never reads `E2E_PORT`.

### m7. The canary's cost lands in every node-project run

- **Plan:** line 500.
- **Defect:** each `createVitest` call takes about 4 s (probe). One instance per trigger entry,
  about 14 of them, adds about 1 min to every per-task gate and every CI test job.
- **Fold:** build one instance and reassign `related` per entry, or select all entries in one
  pass and assert per file.

## Verified sound (no finding)

- **Cherry-pick:** `075bc174` applies cleanly onto `211b1a37`. All eight files apply, and
  `gate-tier.test.ts` auto-merges.
- **Timed ranges:** both resolve and are ancestors of `main`. `5549fda8..f655f877` has 9
  `src/lib` files, none under admin, and 23 files in total. `bd614101^..d716ec89` has 8
  `src/lib` files, 2 under `src/lib/admin`, and 17 files in total. Every path in both ranges
  except three added tests still exists at HEAD, so Decision 8's run at the branch head is
  well-defined.
- **Node API selection:** `createVitest` writes nothing to stdout, so the runner's
  exact-stdout capture stays safe. `README.md` and `turnstile.ts` each select 0 of 90 files,
  matching the spec.
- **Callers of the default output:**
  - Only cairn-cms carries `gate-tier.mjs`.
  - The old `parseArgs` ignores an unknown `--class`, so the dotfiles-first merge order is safe.
  - The runners take raw stdout at `pass-execute.js:449` and `:823`, and `pass-execute-chains.js`
    at `:358` and `:741`.
  - A pinned task skips the classifier entirely (`resolveGate`), so `--pin` is reached only by
    F.
- **Run-record tooling:** `flock` exists at `/usr/bin` and in Homebrew, and `jq` and `gh` are
  present. The reattach lifecycle allows a record at completion, subject to m2.
- **Dotfiles worktree:** `scripts/check.sh` runs green in a worktree outside `~/.dotfiles`
  (about 61 s). Its tests resolve every path relative to the worktree, and the relative
  `core.hooksPath` works. One leg makes the plan's location load-bearing: tellgrader's posthook
  tests fail under `/tmp`, because the hook skips `/tmp/` paths. `~/.cache/worktrees`, which does
  not exist yet, is the right home, and `/tmp` would not work.
- **`ci-green` shape:** a Node program at an extensionless `bin/` path runs, and a test can
  import it (Node 24.20).
- **`gh` mechanics:**
  - `gh run rerun --job` takes the job's `databaseId`, per its help.
  - The check-runs annotations API returns `notice` annotations with a `title` field.
  - The fixtures exist with the stated shapes: `8483ca5b` is all green across 7 runs;
    `92325c02` has `test` and `tool` red; `3ef9a8d9` has no tool runs; run `37893646318` is
    `cancelled`; PR #107 has 450 files.
  - `origin/main` is `e8bdb077` with every workflow green, which is Task 0's inherited set.
- **E2E port:** `E2E_PORT` is honored by `playwright.config.ts` and `e2e/csrf-helpers.ts`.
- **Workflow triggers:** the five `pull_request` workflows set only `paths-ignore: ['tool/**']`;
  `tool` and `tool-conditions` filter in with `paths`; `norms` is `workflow_call` only, `tsgo` is
  schedule only, and `publish` is release only.
- **Execution mode:** hand-dispatching keeps the live runner on the stowed main copy while
  Task 5 edits the worktree copy. No stale-copy hazard remains.
