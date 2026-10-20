# Gate economy spec fold: fresh-context verification

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `ad7bf497` (cited as
`spec:N`), against the fold record `2026-10-09-gate-economy-spec-fold.md`, the five reviews, and
the pre-fold spec at `f2fa2a25`. Read with no part in the fold. Findings are limited to correctness
and the stated requirements (Anthropic's reviewer guidance); everything else is left out.
Probes were run on 2026-10-09 in the shared checkout, read-only.

Counts: 0 blockers, 3 majors, 9 minors.

## 1. Did each blocker and major close at its cited location?

All four blockers closed:

| Finding | Where it closed | Verdict |
|---|---|---|
| C-B1 (runner state machine, push point, pending, missing, unreachable) | spec:171-183, 185-210, 325-328 | Closed. The runner's handling of Unavailable is still open (m4). |
| C-B2 (chain branches, `main` pushes, conflict) | spec:187-191, 173-175, 326-327 | Closed. |
| C-B3 (`auth-data` per-task gate) | spec:119-124 | Closed. |
| R-B1 (chains have no PR) | spec:189-191 | Closed by scoping. |

Every major closed in text at its cited location. Three closed with a mechanism that does not
work as written, and two closed only in part:

- **Expected set** (C-M4, X-M1, R-M1, S-M6), spec:165-170. The shape is right, but the named
  command fails on large PRs. See M1.
- **Empty selection and the trigger canary** (X-m2, S-M4), spec:94, 126-128. They are built on a
  Vitest flag that does not exist. See M2.
- **Coverage fork** (X-M5), spec:34-44. The ruling's deciding evidence is overstated. See M3.
- **R-M3** (`auth-data` wait has no fallback), partial. The runner states no behavior on
  Unavailable. See m4.
- **R-m2** (fold record root 4), partial. The clause "a fix round's commit pushes again" did not
  carry into spec:196-197. See m5.

## 2. Contradictions and build order

- **The dist-surface bucket rule contradicts itself** (m1).
- **Chains drop the settled `auth-data` CI wait** (m7). spec:190-191 removes the wait that the
  settled decision at spec:25 requires.
- **Build order holds.** 2 before 3, 4 before 5, and 5 before 6 are coherent. The only step that
  cannot build as written is Task 3's `vitest list --related` (M2).

## 3. Mechanisms checked by probe or source

Two mechanisms were stated from memory and fail (M1, M2). One is unproven (m2). The rest hold:

| Mechanism | Verdict | Evidence |
|---|---|---|
| The runner waits on CI through a probe agent that re-issues on 75 | Holds | Precedent at `~/.claude/workflows/pass-execute.js:643`: "On exit 75, re-issue the same call until it prints `gate exit:`". The runtime has no exec (`:65-66`). |
| `gh pr diff --name-only` | Fails on large PRs | See M1. |
| `vitest list --related` | Does not exist | See M2. |
| `gh run rerun --failed` on a timeout red | Unproven | See m2. |
| `npm pack --ignore-scripts --pack-destination`, then `attw <tgz>` | Holds | `check-audit-pack.mjs:179-182`. `attw --help` takes "the packed .tgz". |
| S2's `check:self-use` row is selected by the export-surface bucket | Holds | The red came from `bad014c0`, which edits `src/lib/auth-channel/index.ts:20` (`export type { ... ChannelStatementLike }`). The replay's required row is reachable. |
| Pass A's gate-log archive | Holds | `~/.local/state/cairn-gate-archive/2026-10-09-pass-a` holds 336 dirs. |
| Pass B runs sequential | Holds | Pass B plan:92 says sequential, so the chains carve-out (m7) does not touch pass B. |

## 4. Can Geoff rule on the evidence?

- **Ruling 1:** not yet. Its deciding sentence overstates the mutation evidence (M3).
- **Ruling 2:** yes, with one missing number (m8).

## 5. Proportionality

Most of the growth from 150 to 352 lines is the definitions the reviews found missing: the
`ci-green` verdicts, the state machine, and the errata list. Each is cheap to build, so none is
flagged as over-ceremony. The real proportionality risk runs the other way. The 4-hour estimate has
about 10 minutes of slack on its side path (m9).

## Findings

### M1 (major). `gh pr diff --name-only` fails on PRs of more than 300 files or 20,000 lines

- **Location:** spec:166.
- **Defect:** gh 2.102.0 implements `--name-only` by fetching the whole diff
  (`GH_DEBUG=api` shows `GET /pulls/108` with `Accept: application/vnd.github.v3.diff`).
  - The probe ran it on the last eight PRs. Three exit 1: #102 ("the diff exceeded the maximum
    number of lines (20000)"), and #103 and #107 ("exceeded the maximum number of files (300)").
  - Under spec:176 an API failure is Unavailable. On any large pass, every `ci-green` call
    therefore falls back to the local full gate, which silently cancels the pass's goal.
  - It also reads the PR's current head, not `<sha>`. After N+1 pushes, N's expected set comes from
    N+1's file list.
- **Fold:** derive the file list locally with `git diff --name-only $(git merge-base origin/main
  <sha>)...<sha>`. That is the same three-dot basis, exact to the SHA, and has no size cap. Add a
  fixture case for a PR over 300 files.

### M2 (major). `vitest list --related` does not exist, so empty-selection detection and the canary cannot build as written

- **Location:** spec:94, 127, 271-272.
- **Defect:** in Vitest 4.1.11, `npx vitest list --related <path> --project component --filesOnly`
  throws `CACError: Unknown option '--related'`. `related` is a subcommand (`cac.uFydS1Z4.js:2262`),
  not a `list` flag. `vitest list` does take `--changed [since]`, but that reads git, so a canary
  cannot feed it a path.
- **Fold:** name the source-proven route. Use the Node API: `createVitest` with
  `{ related: [paths], project: 'component' }`, then `vitest.getRelevantTestSpecifications()`
  (`cli-api.CnMVyzaz.js:13487`, which calls `filterTestsBySource` at `:11551`). That yields the
  selection without running it, for both the empty check and the canary. The fallback is
  mechanics m2's JSON reporter `numTotalTestSuites === 0` on the run itself. Task 3 should time one
  call against the browser project before the canary joins the per-task node projects.

### M3 (major). Ruling 1's deciding evidence overstates the mutation proof

- **Location:** spec:37-39.
- **Defect:** the ruling says the `auth-data` mutation ledger "already proves a failing test per
  auth and commit-path branch". The proof is narrower.
  - The proof is per task. It covers only the mutations each task names for its own change: pass A
    plan:592, 700, 756, 924, 970, and pass-core's class table, "test-first, a mutation proof".
  - It says nothing about auth or commit-path modules no pass has touched. That is the blind spot a
    coverage run would see.
  - The "yes" answer's replacement reopen signal, the selection-miss count, measures test
    selection, not coverage.
  - As written, Geoff would rule "yes" on a comparison that does not hold.
- **Fold:** restate the evidence in one sentence: "the mutation proof covers the branches each
  `auth-data` task changed, not untouched modules; 'yes' leaves no coverage signal on untouched
  auth code, which the settled 'nothing points at a coverage problem' accepts." The recommendation
  can stand.

### m1 (minor). The dist-surface bucket rule contradicts itself

- **Location:** spec:106-108.
- **Defect:** `package`, `audit-pack`, `surface`, `self-use`, `public-skill`, and `consumers` all
  start with `npm run package` (checked in `package.json`). By the mechanical rule they inherit the
  engine bucket. The next sentence says they "select on the export-surface bucket only". Which
  reading wins sets whether the 10-minute bar is in reach.
- **Fold:** "Every other check whose script starts with `npm run package` inherits the engine
  bucket."

### m2 (minor). The infra rerun is unproven for timeout reds and has no stated attempt counter

- **Location:** spec:161-162, 176-177.
- **Defect:** this has three parts.
  - A job-level timeout ends `cancelled` (mechanics probe, runs 37893646318 and others). GitHub's
    re-run docs describe `--failed` only as "failed jobs" and never say whether it covers cancelled
    ones.
  - Statelessness across exit-75 re-issues needs a counter. The spec prints `run_attempt` but never
    says it is the "once" check.
  - A 25-minute timeout, plus a rerun, plus queue can pass the 60-minute Unavailable deadline.
- **Fold:** on a cancelled or timed-out job, rerun with `gh run rerun <run> --job <databaseId>`
  (help: "Rerun a specific job ID"). Use `--failed` only for a `failure` conclusion. "Once" means
  `run_attempt == 1`. Measure the deadline from the rerun's creation.

### m3 (minor). "N minutes after the push" has no input

- **Location:** spec:173, 176.
- **Defect:** `ci-green` takes `<sha>` and is stateless, so it cannot know when the push happened.
- **Fold:** take `--pushed-at <iso>` from the runner's push record (the runner already writes one).
  If the flag is absent, use the SHA's committer date.

### m4 (minor). The runner does nothing defined on Unavailable

- **Location:** spec:176-178, 199-202, 325-328.
- **Defect:** steps 2 to 4 handle only red and missing. Exit 3 during an `auth-data` wait or before
  N+2 has no behavior, and the runner acceptance has no case for it.
- **Fold:** on exit 3 the runner stops with a `ciUnavailable` record, and the conductor runs the
  fallback. Add one harness case.

### m5 (minor). Fix-round commits must push separately

- **Location:** spec:196-197, 200.
- **Defect:** step 3 waits on "N's accepted SHA". After a review fix round, that is a later commit.
  If it rides in N+1's push, `pull_request` runs only for the new head. N's SHA then never gets runs,
  reads Missing, and stops the line. Pass A had review fixes on 4 of 12 tasks.
- **Fold:** "the runner pushes after every implementer commit, fix rounds included" (R-m2's
  wording).

### m6 (minor). The per-task gate's static leg can still rebuild per check

- **Location:** spec:91, 130-134.
- **Defect:** the build-once runner is defined for `check:close`. Leg 2 runs "the static checks the
  buckets select" with no statement that it goes through the runner with the build stripped. Run as
  `npm run check:x`, each check rebuilds `dist`.
- **Fold:** the runner takes a check subset, and leg 2 runs through it.

### m7 (minor). Chains silently drop a settled rule

- **Location:** spec:189-191 against spec:25.
- **Defect:** the settled decision has every `auth-data` task wait for CI. The chains carve-out
  drops that wait. "As pass A did" is also inaccurate, since pass A ran sequential (pass A
  plan:79).
- **Fold:** name it an exception to the settled rule, accepted because pass B is sequential, or add
  it to the rulings. Strike "as pass A did".

### m8 (minor). Ruling 2's "no" has no cost figure

- **Location:** spec:50-52.
- **Defect:** Ruling 1 prices its "no" at about 20 minutes. Ruling 2's "no" adds per-test parsing
  and a cross-repo e2e map lookup from a dotfiles script into cairn-cms's `gate-tier.mjs`, with no
  estimate.
- **Fold:** give the minutes, and say where the map lookup runs.

### m9 (minor). The 4-hour estimate has about 10 minutes of slack, and the workflow pin needs a home

- **Location:** spec:293-312, 169-170.
- **Defect:** this has two parts.
  - Before the close, the side path 4, 5, 6 runs 135 minutes, against 145 minutes for 2, 3, 7.
    Task 4 (about 10 workflow edits, the timeout test, `ci-green` with five verdicts, nine fixture
    cases, a live call, and a CI cycle in 50 minutes) and Task 6 (13 errata over about 10 files in
    30 minutes) are tight. An overrun on either moves the critical path.
  - Separately, the workflow-shape pin guards a classification hard-coded in dotfiles. It only
    catches drift if it runs in cairn-cms's gate, where workflows change.
- **Fold:** name the side path co-critical in the estimate, or re-cost at about 4.5 hours. Put the
  pin in cairn-cms's unit suite, reading the classification `ci-green` exports.

## Sources

- [GitHub, re-run workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
  ("re-run failed jobs"; the page never defines whether cancelled counts).
- Probes: `gh pr diff <n> --name-only` on PRs #100 to #108; `npx vitest list --related`;
  `GH_DEBUG=api gh pr diff 108 --name-only`; `package.json` script prefixes; `git log -S
  ChannelStatementLike`.
