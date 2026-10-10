# Pass clock time: prior art

Written 2026-10-10 for the clock-time design (`docs/superpowers/specs/2026-10-10-pass-clock-time-design.md`).
Two Sonnet research agents (effort `high`) produced these reports; the conductor condensed them and kept every
citation. "(tested)" marks a check the agent ran on this workstation; "(inference)" marks its own reading.

## Part 1: tiered gates, pipelined CI, selective tests

**a. Presubmit and postsubmit.** Google's presubmit runs "only fast, reliable" tests; post-submit TAP runs all
affected tests, including slow ones, asynchronously, and 95%+ of presubmit-green changes pass the rest
(https://abseil.io/resources/swe-book/html/ch23.html). A red post-submit goes to a Build Cop; rollback is "often
the fastest and safest route," and TAP auto-rolls back a confident culprit (same source). Chromium keeps some tests
CI-only and offers an `Include-Ci-Only-Tests` footer to force them before submit
(https://chromium.googlesource.com/chromium/src/+/main/docs/infra/cq.md); its sheriffs revert suspected culprits
(https://chromium.googlesource.com/chromium/src/+/964c9cae4c0c55c015e366bd901b885a5aa1007c/docs/sheriff.md). Fowler
splits a fast commit build from a slower secondary build, reverts by default, fixes forward only when the cause is
"immediately obvious," and adds a fast test when the slow build catches a bug
(https://martinfowler.com/articles/continuousIntegration.html). Meta's predictive selection runs about a third of
dependent tests and catches over 99.9% of regressions
(https://engineering.fb.com/2018/11/21/developer-tools/predictive-test-selection/). Verdict: the lane split matches;
always-fix-forward does not.

**b. Merge queues.** Zuul's gate tests each change with every change ahead of it in parallel and, on a failure,
re-tests the changes behind it without the failed one; its window starts at 20, grows by one per merge, and halves
on failure (https://zuul-ci.org/docs/zuul/latest/gating.html). GitHub's merge queue builds a temporary branch of base
plus the PRs ahead and rebuilds without a failing PR
(https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue).
Bors merges into a staging branch and promotes only green (https://bors.tech/). Uber's SubmitQueue
(https://blog.acolyer.org/2019/04/18/keeping-master-green-at-scale/, https://arxiv.org/html/2501.03440v2) and
Shopify's queue (https://shopify.engineering/introducing-the-merge-queue) keep trunk green the same way. Verdict:
pushing straight to the pass branch and starting N+1 on top is speculation without the gate; every queue tests the
speculative state on a staging ref before trunk receives it.

**c. Test selection.** Vitest `--changed [since]` and `vitest related <files>` select by the module graph
(https://vitest.dev/guide/cli.html); `forceRerunTriggers` (default `package.json`, `vitest.config.*`,
`vite.config.*`) runs everything when matched (https://main.vitest.dev/config/forcereruntriggers). Playwright
`--only-changed` (1.46) selects changed spec files and their imports
(https://playwright.dev/docs/test-cli); an e2e spec reaches app source through a browser, so app edits select
nothing (inference). Nx `affected` uses a project graph (https://nx.dev/docs/features/ci-features/affected). A
path-to-test map needs a run-everything fallback for unmapped paths
(https://qaskills.sh/blog/ci-detect-tests-affected-by-changed-files). Verdict: Vitest's own selection can replace a
hand map for unit and component files; the e2e map has no standard replacement.

**d. Fail-fast ordering.** Failure history predicts failures better than duration (https://arxiv.org/pdf/1809.00143,
https://research.chalmers.se/publication/547138). Playwright has `-x`/`--max-failures` and `--last-failed`
(https://playwright.dev/docs/test-cli). Verdict: matches; add bail flags.

**e. Playwright sharding.** `--shard=x/y` per job, `blob` reporter, artifact upload with `if: ${{ !cancelled() }}`,
then a `merge-reports` job; sharding is per file unless `fullyParallel` (https://playwright.dev/docs/test-sharding).
Each shard runs on its own runner, so a module-level singleton backend is isolated per shard (inference). Verdict:
copy the documented matrix.

**f. Timeboxes.** GitHub Actions `timeout-minutes` defaults to 360
(https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions); Chromium requires a trybot
median under 40 minutes to join the CQ (cq.md above); Fowler's commit build targets ten minutes. The Claude Agent
SDK has `max_turns` and `max_budget_usd`, and no wall-clock limit
(https://platform.claude.com/docs/en/agent-sdk/agent-loop). Verdict: no published number for an agent clock budget.

**g. Risks.** Building on an unverified commit (Fowler; the SWE book). Flaky reds stall a pipeline; Google reports
about 1.5% of results flaky (https://testing.googleblog.com/2016/05/), and Meta retries to separate flake from
regression. Zuul warns speculation wastes resources when failures are frequent; a shallow window bounds it.

## Part 2: shared gate capacity on one host

**a. Counting semaphores.** flock(2) releases a lock "when all such file descriptors have been closed," and locks
survive `execve` (https://man.archlinux.org/man/flock.2.en; flock(1) at https://man.archlinux.org/man/flock.1.en).
(tested) The kernel frees the lock when the holder dies; a `setsid` child that inherited the fd held it after its
parent exited and freed it on `kill -9`, on tmpfs. A leaked grandchild that inherits the fd keeps the slot held
(inference). POSIX named semaphores are not freed on holder death. Verdict: heartbeat expiry reinvents flock.

**b. Make jobserver.** The `fifo:` jobserver (make 4.4) loses tokens when a client is killed; the system-wide
jobserver attempts surveyed at https://blogs.gentoo.org/mgorny/?p=2439 exist to fix exactly that. Verdict: skip.

**c. Fair share.** `CPUWeight` splits CPU "among all units within one slice relative to their CPU time weight"
(https://man.archlinux.org/man/systemd.resource-control.5.en). (tested) Fedora 44 delegates `cpu` to the user
manager, and `systemd-run --user -p CPUWeight=50` works. Equal weights per project slice give an even split under
contention and the whole machine to a lone project. Verdict: replaces a hand-rolled fair-share formula.

**d. Leases.** Chubby, etcd, and Consul leases exist because a remote service cannot see a client die
(https://etcd.io/docs/v3.5/learning/api/,
https://developer.hashicorp.com/consul/docs/v1.12.x/dynamic-app-config/sessions). On one host the kernel sees it
(inference). Verdict: no heartbeat needed.

**e. Admission.** make `-l` and GNU parallel `--load` gate on load average (https://man.archlinux.org/man/make.1.en,
https://man.archlinux.org/man/parallel.1.en). PSI `/proc/pressure/cpu` and `/proc/pressure/memory` measure stall time
directly (https://docs.kernel.org/accounting/psi.html); load average mixes in I/O wait
(https://lkml.iu.edu/hypermail/linux/kernel/1805.1/05379.html). (tested) PSI is available here. Verdict: PSI over
load average.

**f. Proving an agent ran a command.** Published direction is a receipt the wrapper writes and the orchestrator
checks against the system of record, not the model's echo (https://arxiv.org/html/2603.10060,
https://arxiv.org/pdf/2512.17259, https://arkforge.tech/en/blog/mcp-execution-attestation/). Nothing published covers
a model emitting its answer before its tool result returns. Verdict: check the record, not the echo.

**g. Detached jobs.** pueue 4.0.4 (Homebrew bottle) offers groups with static parallelism, `status --json`, and
`wait --status success` (https://github.com/Nukesor/pueue); task-spooler has slots
(https://www.mankier.com/1/tsp); nq is flock-based with no slot count
(https://sources.debian.org/src/nq/1.0-0.2/README.md). Verdict: keep the existing wrapper; pueue adds a daemon and no
fair share.
