# Gate economy pass: brainstorm inputs

Agent-facing input for the brainstorm that plans the gate economy pass. Read it in full, then the
evidence it cites. Written 2026-10-09 at the close of engine pass pre-2b, pass A.

## Why this pass exists

Engine pass pre-2b, pass A ran 12 tasks in about 12 hours of clock time on about 4.5M subagent tokens.
Almost all of the clock went to gates, not work. Geoff (2026-10-09): "We should be targeting and
thoughtful with test, and avoid the brute-force approach, unless it's best-practice." He approved a
dedicated small pass, run after pass A merges and before pass B, in its own fresh session.

Measured clock for pass A's run (this session, from Task 3 on):

| Item | Clock |
|---|---|
| 8 task chains (implement, gate, review) | about 8 h, about 60 min each |
| Task 11's fix round and re-review | about 1 h |
| Segment boundary full gates | about 3.3 h, about 1 h of it two static-check reds at S2 |

Per-task gates ran the whole engine tier plus the static check list and plan-named e2e specs: 30 to
50 minutes each. Boundary full gates ran about 45 minutes each. CI's test job runs in about 8.5
minutes; this workstation runs the same suite about 3x slower.

## The adversarial review (Opus, 2026-10-09)

Verdict: adopt targeted gating with amendments. Findings, most severe first.

1. **Critical: the time sink is repeated package builds, not tests.** Gate logs under
   `/tmp/cairn-gate-1000/*/gate.log` show Vitest at about 8 minutes of a 30 to 50 minute gate (node
   projects 233 to 290 s, serialized component project 224 to 249 s). `check:close`
   (`package.json:85`) runs `npm run package` about 17 times, once per subscript (check:package,
   audit-pack, reference, reference:signatures, options, surface, self-use, custom-surface,
   invisible-craft, admin-css-classes, readiness, tool-conditions, visuals, snippets, consumers,
   public-skill, public-tokens), at 60 to 115 s each: one `check:close` log shows 16 builds over about
   1,119 s. `docs-gate.mjs` already builds once for the whole docs gate; reuse that pattern. Measure
   before and after.
2. **High: `vitest related` misses about 21% of the suite.** Vitest 4.1.11's implementation
   (`node_modules/vitest/dist/chunks/cli-api.*.js`, `filterTestsBySource`/`getTestDependencies`) walks
   only `transformResult.deps` and `dynamicDeps` in the SSR environment, drops deps that fail
   `existsSync` (so `?raw`/`?inline` imports vanish), skips `node_modules`, and reruns everything only on
   `forceRerunTriggers` (defaults: package.json, vitest/vite configs, plus setupFiles; globalSetup is not
   a trigger). Docs: https://vitest.dev/guide/cli ("works with static imports"). In this repo, 111 of
   525 test files depend on inputs outside the import graph: fs reads (67), spawn/exec (15 strict),
   `dist/` paths (49), the package imported by name to dist (6), tree walkers (16), `?raw` (4). Missed
   triggers, worst first: `migrations/**` and `wrangler.test.jsonc` (read in config context at
   `vitest.config.ts:12`; all 35 integration files depend on them); the compiled admin sheet (component
   tests import `dist/admin/cairn-admin.css?inline`, rebuilt by globalSetup `_global-setup.ts:8`); any
   change that alters `dist`; docs and allowlists tests read; new, renamed, or deleted files; fixtures and
   the showcase. Recommendation: always run the full node projects (about 4 minutes, home to every guard
   test); use `related` only to narrow the serialized component project; full component project on
   admin-CSS, migration, config, and helper triggers, enforced as `forceRerunTriggers` in
   `vitest.config.ts`; fail on an empty selection for a src/lib diff; never `passWithNoTests`. Validate by
   replaying pass A's task ranges and measuring the miss rate.
3. **High: `auth-data` loses its full-suite backstop** if per-task selection replaces the boundary full
   gate (`pass-core` table; mutation proofs show only that the targeted test fails). Recommendation:
   `auth-data` per task always runs the full node projects (unit, integration, unit-dist-spawn) and never
   a reduced gate.
4. **Medium-high: CI needs hardening before it is the boundary gate.** No workflow sets
   `timeout-minutes` (one run hung about six hours on `npx playwright install`); the boundary must read
   every workflow on the commit (e2e lives in `e2e.yml`, not `test.yml`; also create-site, scaffold,
   norms, design, tsgo, tool, tool-conditions); `pull_request` runs test the merge ref; CI's component
   project retries twice, so surface retry counts; push after every task so a red pins to one commit, with
   a stop-the-line rule. CI history: 56 of 60 runs green; all four non-greens were pass A's branch
   (`check:template`, showcase `format:check`, `check:self-use`, the hang).
5. **Medium: the local full gate at the close duplicates CI** (canonical, and it runs visual baselines
   this workstation cannot reproduce, `durable-gotchas.md`). Recommendation: the close takes CI green on
   the final commit plus the class settle steps; the local full gate is the fallback when CI is down.
6. **Medium: parallel worktrees gain less than expected.** Heavy gates serialize on one machine lock;
   each worktree needs a fresh showcase install (the worktree-e2e gotcha), its own `E2E_PORT`
   (`src/tests/unit/audit/rendered.test.ts` assumes 4173), and no `git stash`; disjoint files are not
   disjoint behavior, so the cross-lane review stays.
7. **Low-medium:** e2e selection should come from a diff-to-spec map, not the plan's forecast (keep the
   admin-visual floor for `src/lib/admin/**`, `gate-tier.mjs:150`).
8. **Low:** the create-cairn-site suite's inputs are `packages/create-cairn-site/**`,
   `examples/showcase/**`, `scripts/build/emit-template*`, and the root `package.json`.

Published practice the review compared: Google TAP (https://research.google/pubs/taming-google-scale-continuous-testing/),
flake handling (https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html), Bazel
affected targets (https://bazel.build/query/guide), Meta predictive test selection
(https://arxiv.org/abs/1810.05286), Fowler's deployment pipeline
(https://martinfowler.com/bliki/DeploymentPipeline.html), Jest `--findRelatedTests`. TAP and Bazel
select from a declared, hermetic graph, so selection is complete by construction; here the graph is
inferred and incomplete, which is why the full node projects and per-task CI stay.

## Draft work in hand

Branch `gate-related` (worktree `.claude/worktrees/gate-related`, off `main` at `eab480a9`): a
dispatched implementer is building `gate-tier.mjs --related` and, after a mid-flight redirect, the
build-once check variant, with before-and-after timing and the pass A replay. Treat it as a draft input:
the brainstorm reads its report and decides what to keep. It is not merged.

## Already landed tonight (do not redo)

- dotfiles `492f584`: both pass runners run a pinned task's own gate string unchanged.
- `main` `8f2fe6da`: the tool workflow's `setup-go` sets `check-latest: true` (a runner's preinstalled
  go1.26.8 failed govulncheck on advisories go1.26.9 fixes).
- Pass A's per-task gates ended with the static check list from S3 on; S3 and S4 had no boundary
  surprises.
- Launching `pass-execute` by name served a stale copy after a same-session edit; the documented fallback
  (a `cmp`-verified scratchpad copy) worked.

## Open decisions for the brainstorm

Method calls are Claude's (pass-core); bring one design for approval. Product or budget questions for
Geoff: the pass ceiling, and whether the close drops the local full gate for CI green on the final commit
(the review recommends it; the conductor agrees, with the local gate as the CI-down fallback).

## Where the rules live

`~/.claude/skills/pass-core/SKILL.md` (the pass-class table and the per-task gate paragraph),
`~/.claude/docs/pass-gate-economy.md`, `~/.claude/workflows/pass-execute.js` and
`pass-execute-chains.js`, `scripts/checks/gate-tier.mjs`, `vitest.config.ts`, `.github/workflows/*.yml`,
and pass B's plan (`docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`, its gate section, already
amended once on `ee62f982`).

## The draft build's results (branch `gate-related`, commit `075bc174`, 2026-10-09)

Built to the amended scope: `check:close:prebuilt` (`scripts/checks/close-prebuilt.mjs`, packages once,
reads check:close's component list from `package.json` at run time, runs every component and reports all
failures), the shared trigger list `scripts/test/component-rerun-triggers.mjs` (fed to Vitest as
`forceRerunTriggers` only under `related`/`--changed`, and to the classifier), and `gate-tier.mjs
--related` (static list via the prebuilt close, full node projects, `vitest related` over the component
project or the whole project on a trigger, create-cairn-site on its inputs). Default output is
byte-identical; 124 tests, every mutation killed.

**Measured (wall time inside the gate, lock waits excluded):**

| Gate leg | Before | After |
|---|---|---|
| `check:close` | 1,044 s (17 builds) | 679 s prebuilt (about 35% less) |
| Component project, range 5549fda8..f655f877 | about 1,800 tests, about 4 min | 6 of 89 files, 129 tests, 26 s (42 s wall) |

The review's build estimate was high: each removed build saved about 22 s on this workstation, not 60
to 115 s. **Most of the remaining 679 s is in the checks themselves, and no per-step timing exists yet**,
so the next measurement is a per-check timing of `check:close:prebuilt`. A per-task gate under
`--related` is now roughly 11 min static + 4 min node + under 1 min component (plus create-cairn-site and
e2e when reached), against 30 to 50 min before.

**Open concerns from the build (decisions for the brainstorm):**

1. The empty-selection failure (`--no-passWithNoTests`, as the conductor asked) turns a correct
   server-only change red: `src/lib/cloudflare/turnstile.ts` or `src/lib/auth-channel/store.ts` alone
   selects 0 of 89 component files. Safer: run the whole component project on an empty selection (a small
   wrapper).
2. The `src/tests/**/_*.ts` trigger is wider than needed (a unit-tree helper forced range 666aff41..df8857d9
   to the full component project); narrowing to `src/tests/_*.ts` and `src/tests/component/**/_*.ts` would
   keep it a related run.
3. Bare double-star globs never cross a dot directory in Vitest's matcher, and pass worktrees live under
   `.claude/`, so Vitest's own default `**/package.json/**` trigger silently matches nothing in a worktree.
   The draft anchors its triggers at the absolute repo root (probed: each selects all 89 files).
4. `check:package`'s `attw --pack .` may still trigger a build through npm pack; the new `scripts/` files
   are outside `lint` and `check:comments`.
5. Replay of pass A ranges: ranges 1 and 2 ran related component selections; range 3 fell back on the
   helper trigger; range 4 (an admin diff) kept the admin-visual tier, which `--related` leaves untouched.
   None of the replayed ranges touched a component test that the selection would have missed.

## Pass A's clock as the motivating case (Geoff, 2026-10-09)

Geoff asked that this pass's clock time be used as the brainstorm's evidence: it is part of why the
gate economy pass exists. Clock time is now a scored metric at every close (dotfiles `2cbb4ec`:
`~/.claude/docs/model-economy.md`, "The pass-end score"; `pass-core` plans carry a clock estimate),
beside tokens and attended time, with output quality first. This pass is the first scored.

Pass A's clock, from its first commit (2026-10-08 07:49) to the close's fix rounds (2026-10-09 about
11:30), is about 28 hours of wall time. Netting out the daytime pauses (Geoff's Task 0 pause and the
stop to rebuild the gate machinery after S1), the executing session from Task 3's relaunch (about
18:45) runs about 17 hours:

| Stretch | Clock | What the clock bought |
|---|---|---|
| Tasks 3 to 12 with four boundaries | about 13 h | 11 code tasks plus docs, each gated 30 to 50 min; boundaries about 45 min each |
| S2 boundary reds | about 1 h | two static checks the per-task gate skipped (a process miss) |
| Task 11's fix round | about 1 h | a real defect (dialog labels) |
| Close: simplifier, four reviewers, smoke and key probe | about 1.5 h | real findings: two blockers (publish-all revert, double POST) |
| Close fix rounds (two chains, item B reworked twice) | about 3.5 h | real defects, but each round paid a 30 to 100 min gate plus lock waits of 14 to 33 min |

Most of the clock went to running the same broad gates many times, not to work. The reviewers and the
smoke earned their clock: they caught two blockers no gate did. The fix rounds show the cost most
plainly: a two-line test fix waited behind a 30-minute gate and up to 33 minutes of lock queue.

**A measurement gap the pass must close first:** `cairn-run-gate` reuses one log directory per gate
string (the full gate's `98b67494cb7ba49b/gate.log` spans the whole night), so file times cannot give
a run's duration, and lock waits appear only as NOTE lines an agent may or may not relay. The clock
metric needs `cairn-run-gate` (or its receipts) to record each run's start, end, lock wait, gate
string, and result in a machine-readable line, so a close can sum gate time and lock wait directly.

## For the brainstorm: is the suite bloated? (Geoff, 2026-10-09)

Geoff asked whether the test suite has grown bloated, and asked that the brainstorm take it up. The
answer should come from measurement, not judgment, and no test is deleted without evidence.

**Snapshot (`main`, 2026-10-09):** `src/lib` about 74,800 lines; tests about 115,600 lines (unit,
integration, component, e2e), a 1.5:1 ratio, ordinary for a library with this much auth and commit-path
logic; 512 test files; 42 `check:*` scripts. Since 2026-08-01, about 73,800 test lines added and about
29,000 deleted: net growth of about 45,000 lines in ten weeks. Each task adds tests its mutation proofs
pin, and nothing retires a test whose behavior is covered elsewhere.

**Suspected sources of cost, to test:** the 42 static checks (about 11 minutes even prebuilt; several
assert doc text, comment wording, or line pointers, which cost mostly when code moves, the class that
turned S2's boundary red twice); the same behavior likely covered by a unit, an integration, and an e2e
test, unmeasured; about 1,800 component tests serialized in a real browser, some possibly testing logic a
node test could cover.

**A measured audit, proposed as a task after the timing instrumentation:**
1. Per-test and per-check timing (where the minutes go; needs the gate-run records above first).
2. Mutation-based redundancy: which tests kill only mutants that other tests already kill (Stryker's
   per-test kill reports, https://stryker-mutator.io/docs/).
3. Failure history: which tests and checks have never failed on CI or in the gate logs over the window
   the history covers.
Output: a ranked list with a recommendation per item (keep, merge, move to a cheaper layer, retire), with
every guard test (fs, spawn, tree-walk, and auth or data-loss tests) kept by default. Retirement waits
for Geoff's read of the list.
