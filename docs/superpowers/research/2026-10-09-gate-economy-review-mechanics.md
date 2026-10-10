# Gate economy spec review: mechanics and feasibility

Lens: does every mechanism behave as stated? Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md`
at `f2fa2a25` (cited below as `spec:N`). Draft: `gate-related` at `075bc174`. Every claim below is
quoted from source or docs, or comes from a probe run on 2026-10-09 (probes in the session
scratchpad, not the repo). Settled decisions are not re-argued. Where a finding touches one, it is
marked OWNER FORK.

Counts: 0 blocker, 9 major, 6 minor, 4 over-ceremony items.

## Correctness gaps, ranked by consequence

### M1 (major). `ci-green`'s expected set is keyed to the wrong diff, and a pending result is ambiguous

Location: `spec:86-89`.

**Defect.** The spec says the expected set "follows each workflow's path filters". It does not
say which diff it compares against. On `pull_request`, GitHub filters on the PR's cumulative
three-dot diff, not on the pushed commit's own diff. A `ci-green` that checks the commit's diff
under-expects. If it also reads only the expected workflows, it ignores a red run that is present
on the commit. That is pass A's exact case: `tool.yml` was red on every push from `5549fda8` on
(HISTORY.md:43-44). Three other states also need defining. A run takes a short time to be created
after a push. A PR with a merge conflict gets no runs at all. A job that hits `timeout-minutes`
ends `cancelled`.

**Evidence.**
- Docs (workflow syntax): "GitHub generates the list of changed files using two-dot diffs for pushes
  and three-dot diffs for pull requests". On a skip: "When all the path names match patterns in
  `paths-ignore`, the workflow will not run."
- Probe. PR #108's head `8483ca5b` changes only six files, none under a tool path (`git show
  --stat`). Yet `actions/runs?head_sha=8483ca5b…` lists `tool` and `tool-conditions` runs. Every
  run has `event=pull_request` and `head_sha=8483ca5b`, the head and not the merge commit.
  `git diff main...8483ca5b` does touch `src/lib/log/events.ts`, `tool/**`, and other filtered
  paths.
- Probe. PR #104's head `3ef9a8d9` has five runs and no `tool` run object at all. A skipped
  workflow leaves nothing in the runs API.
- Docs (events): "Workflows will not run on `pull_request` activity if the pull request has a merge
  conflict." Also: "`GITHUB_SHA` for this event is the last merge commit".
- Probe. The six-hour hangs show `conclusion=cancelled` (runs 37893646318, 37726426449, 37711630453,
  37706050674).

**Fold.**
- Rule 1: every workflow run present on the SHA must have a `success` conclusion, regardless of
  filters. This alone closes the false-green.
- Rule 2: the expected set comes from the PR's file list (`gh pr diff <n> --name-only`, the same
  three-dot basis GitHub uses) matched against each workflow's `pull_request` filters. The five
  filter-out workflows are expected whenever any non-`tool/**` path changed.
- Rule 3: missing means pending for a grace window, then red. Before reporting red, read `gh pr view
  --json mergeable` and print the cause.
- Rule 4: `cancelled` is red, labeled as a timeout when the duration meets the job's limit.
- Rule 5: add a `--wait` mode that follows `cairn-run-gate`'s exit-75 convention (M4).

### M2 (major, OWNER FORK). Stop-the-line has no rule for infrastructure reds or flakes, and they are common

Location: `spec:20-22`, `spec:95-97`.

**Defect.** "No new dispatch until a fix commit is green" assumes every red has a code fix. CI's
recent reds are often infrastructure:
- A hang in an install step.
- A flaky e2e spec (pass A's close needed a rerun, HISTORY.md:56-58; `2733881c` filed more).
- An upstream advisory: govulncheck failed for hours with no defect in the pass.

**Evidence.** The runs API since 2026-09-30 holds 631 runs. Five ended `cancelled` after about six
hours. The hung steps were `npm ci` three times and `npx playwright install` once. That is about
0.8% per workflow run. A pass with about 15 pushes of 6 to 7 workflows makes about 90 runs, so
P(at least one hang) is about 1 - 0.992^90, roughly 50%. Run attempts above 1 also appear (`test`
on PR #105 at attempt 2, `e2e` on pass A's branch at attempt 2).

**Options.**
- (a) Keep the rule literal. Every infra red waits on a human.
- (b) **Recommended.** One automatic `gh run rerun --failed` per red. Green on the rerun counts as
  green, is logged as a flake with the spec or step name, and is printed by `ci-green`. A second
  red stops the line. A red in a workflow whose inputs the pass never touched (an external
  advisory) stops the line and routes the fix to `main` first.
- (c) Option (b) plus a step-level `timeout-minutes` of about 10 on the `npm ci` and `playwright
  install` steps, so a hang costs 10 minutes rather than the job limit. Docs: step `timeout-minutes`
  is "The maximum number of minutes to run the step before killing the process."

Recommend (b) plus (c).

### M3 (major). Pipelining cannot work as written in `pass-execute-chains` or in parallel mode

Location: `spec:95`.

**Defect.** CI fires on a push only to `main` or `rebuild` (every workflow's `on.push.branches`).
Otherwise it fires on `pull_request`. Chain branches have no PR, so `ci-green` on a chain commit is
always "missing". A chain the plan runs on `main` would push unproven per-task commits to `main`,
which CLAUDE.md says stays releasable. In `pass-execute`'s `parallel: true` mode, tasks commit
concurrently into one checkout, so "push after each accepted task" cannot pin a red to one commit.

**Evidence.**
- `pass-execute-chains.js:361-362`: each chain runs "on branch ${chain.branch}" or on main.
- `pass-execute.js:978-990`: parallel mode runs every task at once.
- `spec:89` itself says "CI fires on push only for `main` and `rebuild`".

**Fold.** Pipelining applies to sequential `pass-execute` on the pass branch, with the draft PR
opened before the first push. A run whose first push precedes the PR gets no runs for those SHAs.
The default activity types are `opened`, `synchronize`, and `reopened`, and each fires for the head
at event time only. Chains keep the per-task targeted gate and take `ci-green` at each chain's
merge into the pass branch. The alternative, one draft PR per chain branch, multiplies CI load
against the free plan's concurrent-job cap.

### M4 (major). The CI-fix round lands on top of the next task, and the runner has no shape for it

Location: `spec:95-98`.

**Defect.** Take task N, red on CI, discovered while N+1 is accepted or in flight. The fix commit
lands on N+1. `runTask` (`pass-execute.js:845-945`) cannot express this case: its fix rounds are
per task, from that task's `baseSha`, inside the task's own call, and N's call has already
returned. The spec defines none of the following:
- which implementer fixes it, and what input it gets (the failing job's log);
- the diff-reviewer's acceptance criteria;
- whether N+1's acceptance still stands after the fix.

The runtime also cannot wait on CI itself. "The workflow runtime has no filesystem or exec access,
so every git/node call here goes through a small probe agent" (`pass-execute.js:65-66`). A Haiku
probe told to "check `ci-green`" while CI is pending will improvise polling, which the gate rules
forbid.

**Fold.** Specify a CI-fix chain:
- A Haiku probe fetches `gh run view <id> --log-failed`, capped.
- The implementer gets that excerpt, with base = HEAD.
- The gate is the targeted gate for the fix diff, plus a push and `ci-green --wait`.
- `diff-reviewer` acceptance: the red step goes green, and the diff stays in the failing area.
- N+1 is re-reviewed only if the fix touches N+1's files.

`ci-green --wait` blocks up to about 540 s and exits 75 while pending, the same convention as
`cairn-run-gate`, so the probe agent only re-issues.

### M5 (major). The coverage probe cannot measure the auth and commit path with V8

Location: `spec:23-26`, `spec:130-131`, `spec:145`.

**Defect.** The settled trigger is "a thin module on the auth or commit path". Most of those
modules are exercised by the `integration` project, and that project runs in workerd through
`cloudflareTest` (`vitest.config.ts:129-142`). Its 40 files include `auth-channel-*`,
`auth-guard*`, `auth-editors`, and others. Cloudflare's docs say: "Native code coverage via V8 is
not supported. You must use instrumented code coverage via Istanbul instead"
(developers.cloudflare.com/workers/testing/vitest-integration/known-issues). A V8 run would report
those modules as thin, which is a false trigger that reopens the audit. No coverage provider is
installed either: `node_modules/@vitest/` has no `coverage-*` package.

**Fold.** Run `@vitest/coverage-istanbul@4.1.11` (it must match `vitest` 4.1.11) for the probe as
an uncommitted, one-off install, so no new dependency enters the repo. Alternatively, run V8 over
unit and component only and record the integration blind spot by name.

### M6 (major). "One build per gate" is false for CI as designed, and both extra builds are certain

Location: `spec:75-79`, `spec:122-123`.

**Defect.** The claim "so CI and local gates both build the package once" fails because CI never
runs `check:close`. `test.yml:64-99` runs each `check:*` script as its own step, and each starts
with `npm run package &&` (`package.json:37-82`). The two "verify whether" items in Task 2 are
already settled by source:
- `docs-gate.mjs:110-111` always runs `spawnSync('npm', ['run', 'package'], …)`.
- attw's `--pack` runs `execSync("npm pack", …)` (`@arethetypeswrong/cli/dist/index.js:144`, v0.18.5)
  without `--ignore-scripts`. npm pack runs `prepare`, which is `npm run package`
  (`package.json:83`; `create-site.yml:33-34` records the same behavior). The draft's
  `close-prebuilt.mjs` strips only the leading build, so `check:package` still builds a second time.

**Evidence (CI step timings, test job on `8483ca5b`).** `npm run package` takes 11 s. The steps
`custom-surface` (10 s), `invisible-craft` (12), `admin-css-classes` (12), and `public-skill` (12)
are almost all build. About 11 builds at about 11 s each is about 2 minutes of the 11-minute test
job, which is the critical path of every pipelined push.

**Fold.**
- Task 2: `check:package` packs with `npm pack --ignore-scripts --pack-destination <tmp>` and runs
  `attw <tgz>`. `check-audit-pack.mjs:179-182` already does this, and `packaging-boundary.test.ts:30`
  documents the same intent. `docs-gate.mjs` gains a `--prebuilt` flag.
- Task 4: `test.yml` calls the build-once runner. That runner must print per-check seconds, because
  CI loses per-step timing when steps merge.

### M7 (major). The input map could drop the only build, leaving node tests on a stale `dist`

Location: `spec:62-71`, Task 3.

**Defect.** The per-task gate runs the full node projects. `unit-dist-spawn` (`vitest.config.ts:108-115`)
and 35 `src/tests/unit` files read `dist/`. In the draft, the build happens only as the first act
of `check:close:prebuilt` (`gate-tier.mjs:148-149`). Once Task 3 filters static checks by input,
consider a diff whose selected checks read no `dist`, such as a docs or scripts task. Its build
disappears, and the node projects then run against whatever `dist` the last task left. That can
give a false green.

**Fold.** Task 3's acceptance should require `npm run package` as an unconditional first leg of
every npm per-task gate, independent of the check selection.

### M8 (major). The replay's red set is mostly gone from the logs, so "miss rate zero" is vacuous as specified

Location: `spec:128-134`, `spec:139-144`.

**Defect.** `cairn-run-gate` truncates the log on every fresh run of a (cwd, gate string) key
(`: >"$log"`, line 146). Receipts keep only the latest run per key, with an end timestamp and no
start or duration (lines 106-107, 210-220). None of pass A's S2 boundary reds survive.

**Evidence (probe over pass A's receipts).**
- The boundary string's receipts are later greens.
- The only surviving full-gate reds are `check:facts` (15:45Z) and `check:snippets` (16:36Z, and
  again at 01:27Z on the 10th).
- The durable, SHA-attributed red record is GitHub's. The CI runs on PR #108 show `test` red at
  `92325c02` (step `check:template`) and at `c3d2952c` (showcase `format:check`), `create-site` red
  at `c3d2952c`, and `tool` red seven times on govulncheck.
- `c3d2952c` itself only edits an allowlist, so attribution needs a "last green..first red"
  range, not the red commit alone.

The projection acceptance "from the run records" (`spec:143-144`) also cannot use Task 1's records,
since pass A predates them.

**Fold.** Build the replay red set from three sources: the CI runs API on PR #108, HISTORY.md's
"What the gates caught", and the surviving receipts. Attribute each red to its last-green..first-red
range. Report the miss rate with its denominator, about 6 reds. Model the clock projection from
gate counts by kind multiplied by the newly measured durations, and label it a model.

### M9 (major). The 10-minute acceptance likely fails on any `src/lib` range, and range choice is open

Location: `spec:138`, `spec:129-130`.

**Defect.** For a `src/lib` diff, every dist- or source-reading heavy check stays selected:
- `surface` 44 s on CI, `audit-pack` 32, `package` 27, `self-use` 26, `consumers` 24, and
  `docs-gate` 66 (as CI steps);
- the draft measured local at about 1.85 times CI (679 s against about 367 s);
- plus the build, the full node projects (233 to 290 s), and the component leg.

That is roughly 12 to 14 minutes. The input map mostly saves the checks of 12 s or less. "Two
representative ranges" are not named, so a docs range would pass trivially.

**Fold.** Name the two ranges in the plan before any timing: one engine `src/lib` range and one
admin range. Then either set the engine-range target from Task 1's per-check timing, or, as a
method call consistent with the settled pipelining, run the dist-surface checks (surface, self-use,
audit-pack, consumers, public-skill, package) per task only when the diff touches an export
surface (`src/lib/**/index.ts`, `package.json` `exports`, their allowlists). CI backstops the rest
on the same push.

### m1 (minor). The input map fails safe only for undeclared checks

Location: `spec:71-72`.

A declared but incomplete glob fails open. Checks read broadly:
- `check-symbols` reads docs plus `src/lib/log/events.ts`, `src/lib/diagnostics/conditions.ts`,
  and `packages/create-cairn-site/src/args.mjs`;
- `check-idioms` walks `src/lib`, `src/tests`, and `scripts`;
- `check-self-use` scans `src/lib` and `examples/showcase/src`.

Fold: keep each declaration in the check script itself (an exported `INPUTS` next to its reads),
always include the check's own script and allowlist, and declare only narrow checks. CI backstops
the rest.

### m2 (minor). An empty `related` selection exits 0 by default, so the fallback needs detection

Location: `spec:65-66`, `spec:116`.

`vitest related` sets `passWithNoTests ??= true` (`cac.uFydS1Z4.js:2297-2299`). With
`--no-passWithNoTests`, an empty selection throws `FilesNotFoundError` and exits 1, the same code
as a failure (`cli-api.CnMVyzaz.js:13537`). Fold: detect "empty" from the JSON reporter's
`numTotalTestSuites === 0` or from the documented log line "No test files found, exiting with code
0" (`cli-api…:1969`), then run the whole project. A component test that imports a deleted path is
never selected, because the draft drops deleted paths (`gate-tier.mjs:329-333`). Fold: a delete or
rename under `src/` forces the full component project.

### m3 (minor). Retry counts written to the job summary are not readable by `ci-green`

Location: `spec:84-87`.

GitHub has no REST or GraphQL endpoint for `GITHUB_STEP_SUMMARY` content (community discussion
#27649; the jobs endpoint returns step status only). Fold: emit `::notice title=retries::…` as
well. Annotations are readable through `GET /repos/{o}/{r}/check-runs/{id}/annotations`. Take
`run_attempt` from the runs API.

### m4 (minor). Making `check:close` the runner removes the list the runner parses

Location: `spec:77`.

`close-prebuilt.mjs:7-9, 32-35` reads its component list from the `check:close` script string.
If `check:close` becomes `node scripts/checks/close-prebuilt.mjs`, the list needs a new home, in
the runner or a `check:close:components` key. State which.

### m5 (minor). The e2e map does not say what an unmapped path selects

Location: `spec:68-69`.

Fold: an unmapped path selects no e2e spec locally, except the admin floor, and CI's e2e covers
it on the same push. Alternatively it selects all specs. Say which.

### m6 (minor). `ci-green` must read workflow-run conclusions, not raw check runs

Location: `spec:86`.

Probe: on `8483ca5b`, check-run `release` (tool.yml) is `skipped` inside a `success` workflow run.
Reusable `norms` jobs appear as `norms / …` check runs under `e2e`. Fold: judge by workflow-run
conclusion, and treat a job-level `skipped` as non-red.

## Over-ceremony, ranked by clock and token cost

### O1. Task 4's acceptance can use recorded fixtures instead of live red, pending, and missing pushes

Location: `spec:141`.

Each live state costs at least one CI cycle of about 11 minutes. Real SHAs already exist:
- green: `8483ca5b`;
- red: `92325c02`;
- cancelled after a hang: run 37893646318;
- tool workflows absent: PR #104's head `3ef9a8d9`;
- pending: any in-flight push of this pass's own draft PR.

Fold: test `ci-green`'s classifier as a pure function over saved API JSON, plus one live call.
Saves about 25 to 35 minutes.

### O2. Drop the install-caching item

Location: `spec:90-91`, Task 4.

Every workflow already sets `actions/setup-node` `cache: npm`, keyed on both lockfiles where needed
(`test.yml:20-26`, `e2e.yml:36-41`, `design.yml:25-29`, and others). Playwright advises against
caching browsers: "Caching browser binaries is not recommended, since the amount of time it takes
to restore the cache is comparable to the time it takes to download the binaries", and Linux OS
dependencies are "not cacheable" (playwright.dev/docs/ci). The measured install is about 28 s.
Timeouts (M2 c) address the hangs, which is the real install cost.

### O3. Coarsen the 42-check input map

Location: Task 3.

Per M9, the heavy checks run on any `src/lib` diff. The map pays only on docs- and scripts-only
tasks. A few buckets (docs-only, scripts-only, showcase, engine) with an "always" default capture
nearly all the saving at a fraction of the declaration and review tokens, and they reduce m1's
fail-open surface.

### O4 (OWNER FORK). The 3.5-hour critical path looks unreachable as scoped

Location: `spec:27-29`.

| Step | Estimate |
|---|---|
| Task 2, under the old engine gate, since it lands the new one | implement about 20 min, gate 30 to 50, review about 10 |
| Task 3 and Task 4 in parallel | Task 4 needs at least one real CI cycle of about 11 min; heavy gates share one machine lock |
| Task 5 | runner edits plus their tests |
| Task 6 | rules |
| Task 7 | two timed targeted runs of about 13 min each; a coverage run of the full suite under instrumentation |
| Close | simplifier, reviewers, CI green |

A tally of this path comes to about 5 to 5.5 hours with no fix round. Options:
- (a) Keep 3.5 hours and cut scope: defer chains-runner pipelining (M3) and the coverage probe to
  pass B's first task, and adopt O1 and O2.
- (b) Re-estimate at about 5.5 hours.

Recommend (a). It removes the two least certain mechanisms from the critical path.

## Verified as stated

- The trigger anchoring: picomatch's `**/package.json/**` does not match `/…/.claude/worktrees/gate-related/package.json`
  (probe: `false`), and the anchored form matches (`true`). Vitest's defaults are
  `["**/package.json/**", "**/{vitest,vite}.config.*/**"]` (`defaults.9aQKnqFk.js:59`), plus
  `setupFiles` (`coverage.DM_a_rWm.js:354`).
- `filterTestsBySource` returns every spec on any trigger match, and otherwise walks only SSR
  `deps` and `dynamicDeps`, skipping `node_modules` and anything not `existsSync`
  (`cli-api.CnMVyzaz.js:11551-11594`). Related paths are resolved to absolute before matching
  (`coverage.DM_a_rWm.js:408`).
- The `timeout-minutes` default is 360 ("before GitHub automatically cancels it"), which matches the
  six-hour hangs.
- `pull_request` runs report the PR head as `head_sha`, as probed above.
- No workflow sets `concurrency`, so pushes do not cancel each other's runs and per-commit
  attribution holds.

Sources: [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[troubleshooting required status checks](https://docs.github.com/en/enterprise-server@3.8/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks),
[Playwright CI](https://playwright.dev/docs/ci),
[Workers Vitest known issues](https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/),
[job summary API discussion](https://github.com/community/community/discussions/27649).
