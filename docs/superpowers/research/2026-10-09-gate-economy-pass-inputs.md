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
