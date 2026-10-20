# Gate economy spec review: consistency lens

Target: `docs/superpowers/specs/2026-10-09-gate-economy-design.md` at `f2fa2a25`. Lens: does the
draft contradict a ratified document, and does each number and citation say what the spec claims.
Findings are limited to correctness and stated-requirement gaps. Line numbers are the spec's
unless a file is named.

Counts: 0 blocker, 8 major, 7 minor, 3 over-ceremony items, 1 owner fork.

## Numbers and citations spot-checked

Verified with `gh api repos/glw907/cairn-cms/actions/runs/<id>/jobs` over the 20 most recent green
`test.yml` runs and 17 each of `e2e.yml` and `scaffold.yml` (medians):

| Spec claim | Source says | Verdict |
|---|---|---|
| CI test job 663 s (:42) | 664 s median | holds |
| `npm test` 208 s (:23, :42) | 209.5 s | holds |
| e2e job 413 s, e2e suite 291 s (:23, :43) | 413 s job, 291 s "Run the e2e suite" | holds |
| checks about 367 s (:42) | about 305 s for `check*` steps; about 358 s with the create-cairn-site suite (41 s), `package`, and showcase `test:unit` | holds only if "checks" includes the create-cairn-site suite |
| `docs-gate` 65, `surface` 44, `audit-pack` 29, `package` 27, `self-use` 24, `consumers` 23, `check` 18 (:46-47) | 65.5, 44, 28.5, 27, 24, 23, 18 | holds |
| "Every other check takes 12 s or less" (:47-48) | true of `check:*` steps; the create-cairn-site suite step is 41 s | holds for checks |
| `npm ci` plus `playwright install` about 60 s (:44) | test job 34 + 29 (+14 showcase `npm ci`); e2e 35 + 21 | holds |
| `docs-gate` "builds the package again" (:46) | `scripts/checks/docs-gate.mjs:110-111` runs `npm run package` | holds |
| 3 of 90 component files render nothing (:24) | `src/tests/component` holds 90 `*.test.ts` files; `admin-barrel`, `admin-icons`, `admin-nav-icons` import modules and render nothing | holds |
| `check:close` 1,044 s / 679 s (:40-41) | inputs file :131 | holds (the review's own log showed 16 builds over 1,119 s, inputs :35-36) |
| 111 test files outside the import graph (:64) | inputs :44 "111 of 525"; includes component files (`?inline`/`?raw`, inputs :45, :47-48) | see minor m5 |
| Pass A about 17 executing hours (:9) | inputs :168, STATUS :22 say 17; `model-economy.md:94-95` says about 20; inputs :8 and `ROADMAP.md:312` say about 12 | see minor m5 |
| "about 25 times" (:10) | no source in the inputs file | see minor m5 |
| One run hung about six hours on `npx playwright install` (:83) | inputs :60 | holds, and a second hang is live now (major M6) |
| Path filters: "`tool.yml` and `tool-conditions.yml` filter in, the rest filter out `tool/**`" (:87-88) | see major M6 | does not hold |
| "CI caches `npm ci` ... (`actions/setup-node` cache ...)" (:90-91) | every workflow already sets `cache: npm` | see over-ceremony O1 |
| "CI and local gates both build the package once" (:77-78) | `test.yml` never runs `check:close` | does not hold (major M2) |

## Major

### M1. pass-core is shared, but the spec rewrites it with cairn-only machinery

Location: spec :101-105, :95-99; `~/.claude/skills/pass-core/SKILL.md:16-18`.

The defect: the spec lands the boundary-and-close-read-`ci-green` rule and the pipelining rule in
`pass-core`. `pass-core` is the shared machinery `site-pass` also loads. A site repo has no
`ci-green`, may have no `pull_request` CI, and has no path-filter map. Written generically, the rule
silently removes the local full gate from every site pass's boundary and close.

Quoted source: pass-core :16-18, "This skill holds what every repo's pass shares. The repo's pass
skill (`cairn-pass`, `site-pass`) supplies the paths, the gate commands, the implementer agent".

Proposed fold: state the rule in `pass-core` conditionally ("where the repo skill names a CI-green
command, the boundary and the close read it; otherwise the local full gate runs"). Put the command,
the draft-PR mechanics, and the fallback in `cairn-pass`. Add `cairn-pass` to :101-108 (it is
missing; see the errata list) and name `site-pass` as unchanged.

### M2. CI does not run `check:close`, so "both build once" is false as written

Location: spec :77-79; `.github/workflows/test.yml:64-118`; draft
`075bc174:scripts/checks/close-prebuilt.mjs:9`.

The defect: `test.yml` runs each check as its own step (`check:package`, `check:audit-pack`,
`check:surface`, `check:self-use`, `check:consumers`, each starting `npm run package`) and never
calls `check:close`. Making `check:close` build-once changes only local gates. The draft's header
comment repeats the error: "check:close itself is unchanged, and CI keeps running it." The two
lists also differ. `check:close` lacks `test:emit`, the create-cairn-site suite, showcase
`test:unit`, and `check:tool-heuristics`. It also needs Vale and the showcase install, which
`test.yml` provides mid-job. Collapsing CI into one step also loses CI's per-step timings, the
measurement this spec's baseline came from.

Quoted source: `pass-gate-economy.md:103-106`, "The script runs CI's check list in CI order, minus
the unit and e2e suites, so a check added to CI is added to the script in the same change".

Proposed fold: pick one sentence. Recommended: "CI keeps its steps. Local `check:close` builds
once." CI's builds cost about 10 s each on the runner (the `npm run package` step median), so the
CI saving is about 1 minute of 11. Fix the draft's header comment in Task 2. If CI is rewired
instead, Task 4 depends on Task 2, and `pass-gate-economy.md:103-106` owes an erratum.

### M3. Task independence and the "dotfiles only" claims contradict the task list

Location: spec :28-29, :122, :127, :133.

The defect: Task 1 is "Run records and per-check timing (dotfiles `cairn-run-gate`,
`close-prebuilt`)". `close-prebuilt.mjs` is a cairn-cms script that exists only on the draft
branch, which Task 2 lands. :55 also has `check:close` printing per-check seconds, and `check:close`
becomes build-once only in Task 2. So Task 1 depends on Task 2 and is not dotfiles only. Task 6
edits pass B's plan, a cairn-cms file. :133 ("Tasks 1, 3, and 4 are independent") and :28 ("Tasks
1, 5, and 6 are dotfiles only and run no npm gate") both feed the 3.5-hour critical path.

Quoted source: the spec itself, :122 against :28 and :133.

Proposed fold: split Task 1 into 1a (dotfiles: `cairn-run-gate` run records), independent, and
1b (per-check timing in `close-prebuilt`), folded into Task 2. Task 6 becomes "dotfiles plus one
cairn-cms plan edit, docs-only, no npm gate". Restate the dependency line as "1a, 2, 4 independent;
3 after 2; 5 after 4; 7 last."

### M4. The ROADMAP's filed inputs to this pass go undispositioned

Location: spec :147-150 (Out of scope) and the whole Tasks list; `ROADMAP.md:311-338`, `:1055-1062`.

The defect: the ROADMAP's gate economy entry carries five tooling items moved from the friction log
"each an input to the same pass". The spec covers the fifth (run records) and, implicitly, the
second (the local `--grep-invert` full variant, mooted by CI boundaries except in the fallback). It
says nothing on three:

- a fresh worktree fails the full gate on setup alone (`svelte-kit sync`, the baked template);
- the light lane's 3G cap OOM-kills `npm run check` without `NODE_OPTIONS`;
- a re-issue after a backgrounded call starts a second full gate.

Separately, the 2026-10-08 follow-up (a) at `ROADMAP.md:1057-1060` sets the trigger for per-task
`vitest` selection: "`forceRerunTriggers` covers fs-read inputs ... and a committed canary proves a
broken fs-read fixture turns a selected run red." The spec adopts `vitest related` without the
canary. Follow-up (b), auth-data test-only fix rounds, "lands with (a)", and the spec is silent on
it.

Quoted source: repo `CLAUDE.md`, "a pass that ships an item marks it done and removes it from the
live tiers ... a pass that removes or renames a backlog item is not done until the roadmap stops
listing it."

Proposed fold: add a "ROADMAP dispositions" line. Recommended: the canary joins Task 3, a few
lines of test. The light-lane `NODE_OPTIONS` default joins Task 1a: one env default, and per-task
static checks will now run light. The worktree-setup and re-issue items move to Out of scope with
a named tier. Follow-up (b) is marked won't-do while `auth-data` keeps its full node projects.

### M5. The fix-round and pipelined-red rules contradict three ratified gate rules

Location: spec :20-22, :95-98.

The defect: :96-97 sets "The fix round's gate is the targeted gate plus a fresh CI push" for every
class. Three ratified rules say otherwise:

- the reduced comment-only gate (`pass-gate-economy.md:13-15`, `pass-execute.js:87-89`);
- pass B's "`auth-data` fix rounds always run the full gate" (`2026-10-08-engine-pass-pre-2b-b.md:115`);
- the runner's auth-data exception (`pass-core` :117-121).

The spec does not say which survives. Pipelining also leaves the in-flight task undefined. Task N's
CI goes red after task N+1 is dispatched, and N+1 then builds and gates on a red base. Nothing says
whether N+1's acceptance stands, which task owns the fix, or whether a CI red counts as the chain's
one `fix` re-dispatch.

Quoted source: pass-core :135, "One re-dispatch on `fix`; a second `fix` is the conductor's
decision"; pass B :379-396, the unattended stop list.

Proposed fold: one paragraph in the spec, carried by the runners. A CI red on task N lets N+1
finish its chain. The fix lands as its own commit on top, gated by the reduced gate for a
comment-only finding and the targeted gate otherwise. Under `auth-data`, the fix commit waits for
CI green before any dispatch. N+1's review stands unless the fix touches its Files, in which case
N+1's diff-reviewer reruns. A CI red is a `fix` verdict for task N's chain under the one-re-dispatch
rule.

### M6. `ci-green`'s expected set is wrong, and pending has no bound

Location: spec :86-89, :141-142; `.github/workflows/*.yml` `on:` blocks.

The defect: the path-filter description does not match the workflows.

- `tool-conditions.yml` filters seven named files, not `tool/**`.
- `tool.yml`'s filter includes non-tool paths (`packages/create-cairn-site/src/**`,
  `src/lib/log/events.ts`, five docs files).
- `norms.yml` has no trigger of its own. It runs as jobs inside `e2e.yml` (`e2e.yml:23`) and
  `publish.yml`.
- `tsgo.yml` is schedule-only and `publish.yml` release-only, so neither belongs in a commit's
  expected set.
- On `pull_request`, GitHub evaluates `paths` against the whole PR's diff, not the pushed commit's.
  The expected set for task N's commit depends on every earlier task's files.

Separately, a design run on `main` (run `37988147542`, commit `32855c12`) has sat `in_progress` on
`npm ci` since 2026-10-09 20:36 UTC, over five hours at review time. So hangs are not confined to
`playwright install`, and "pending" can last up to GitHub's 360-minute default. The spec does not
say whether the runner waits on pending or halts.

Quoted source: the `on:` blocks of `create-site`, `design`, `e2e`, `scaffold`, and `test`
(`paths-ignore: ['tool/**']`), `tool.yml`, `tool-conditions.yml`, `norms.yml`
(`workflow_call`/`workflow_dispatch`), `tsgo.yml` (`schedule`), and `publish.yml` (`release`).

Proposed fold: `ci-green` derives the expected set from the parsed `on.pull_request` filters
applied to `git diff --name-only <merge-base>..<sha>`. It excludes workflows with no
`pull_request` trigger and counts `norms` as e2e's jobs. Pending means wait until the largest
`timeout-minutes` elapses, then red. Add "a hung run past its timeout" to the acceptance cases at
:141-142.

### M7. Acceptance reads a projection "from the run records" that pass A never produced

Location: spec :143-144; inputs :182-186.

The defect: run records arrive in Task 1 of this pass. Pass A's gates left only shared log
directories, and the inputs file states their durations cannot be recovered. So the projection
cannot come "from the run records".

Quoted source: inputs :183-184, "`cairn-run-gate` reuses one log directory per gate string ... so
file times cannot give a run's duration".

Proposed fold: "A recorded projection of pass A's clock under the new rules, built from the two
timed replay ranges, the classifier dry runs, and CI's median job times, near half of 17 hours."

### M8. The miss-rate acceptance is vacuous unless it names pass A's known misses

Location: spec :139-140, :128-130; inputs :154-156, :173.

The defect: pass A's only measured gate misses were the two static checks that turned S2's boundary
red ("two static checks the per-task gate skipped (a process miss)"). The draft replay found no
component miss on ranges that had none to find. "Miss rate zero" over ranges with no recorded
failures proves nothing, and the static-check input map is the new selector most likely to miss.

Quoted source: inputs :173, "S2 boundary reds | about 1 h | two static checks the per-task gate
skipped (a process miss)".

Proposed fold: the acceptance names S2's two checks and their task ranges as required positive
cases. The input map's selection for each range must include the check that went red.

## Minor

### m1. `model-economy.md`'s pass-end score is changed but not listed for an erratum

Location: spec :54-56; `~/.claude/docs/model-economy.md:87-90`.

The score reads "Gate time: the summed run time of every gate, from the `cairn-run-gate` logs" and
"Lock wait: ... (`cairn-run-gate` prints it as a NOTE)". Under the spec both come from run records.
The CI wait on the critical path (`auth-data` waits, boundary and close `ci-green`) is not a
`cairn-run-gate` run, so the score would under-count gate time. Fold: add `model-economy.md` to
:101-108. Gate time becomes run records plus CI wait on the critical path, the latter named
separately.

### m2. "`auth-data` never takes a reduced gate" collides with a term of art

Location: spec :72-73, :22, :97.

"Reduced gate" already means the comment-only fix-round gate (`pass-gate-economy.md:13-15`). Pass B
and the runner let `auth-data` reduce on a comment-only round, which contradicts
`pass-gate-economy.md:20-22`; that conflict predates this spec. The spec does not say whether
`auth-data`'s per-task gate takes static-check selection and `vitest related`. STATUS :54-55
settled only "`auth-data` keeps them [the full node projects] per task." Fold: "`auth-data` per
task runs every static check, the full node projects, and the whole component project; its CI wait
replaces the boundary backstop." Say the comment-only reduction rule once in `pass-gate-economy.md`.

### m3. tellgrader is blind on CI, so CI boundaries drop it

Location: spec :17-19; `test.yml:109`, "check:tellgrader, which skips itself in CI because the
binary is absent".

The global `CLAUDE.md` names tellgrader part of the deterministic net. With the local full gate
gone, tellgrader runs only when the per-task input map selects the docs gate. Fold: the input map
declares tellgrader's inputs (the doc arms), and the spec states that it is local-only.

### m4. `attw --pack .` rebuilds; the repo already knows why

Location: spec :78-79.

`check-audit-pack.mjs:179` says "`--ignore-scripts` skips `prepare`, which would rebuild dist", and
`package.json:83` sets `"prepare": "npm run package"`. `attw --pack .` packs without that flag, so
it rebuilds. Fold: drop "verifies whether". Task 2 points `attw` at a tarball from
`npm pack --ignore-scripts`.

### m5. Source drift in the motivating numbers

Location: spec :9-10, :64.

Pass A's clock is 17 hours here and in STATUS, 20 in `model-economy.md:94-95`, and 12 in the
inputs (:8) and `ROADMAP.md:312`. "About 25 times" has no source. The 111 files include component
files (the `?inline` admin sheet, inputs :47-48), so they argue for the component triggers as much
as for the full node projects. Fold: cite "17 executing hours (inputs, the netted figure)". Source
or drop "25". Reword :63-64 as "because the node projects hold most of the 111 test files whose
inputs sit outside the import graph."

### m6. The coverage probe needs a dependency the repo lacks

Location: spec :25, :130-131.

`node_modules/@vitest` has no `coverage-v8`, and `package.json` declares no coverage provider. The
global `CLAUDE.md` routes a brand-new dependency as a design question. Fold: "a one-off
`npx`/`--no-save` run of `@vitest/coverage-v8` at the installed Vitest version, nothing saved to
`package.json`."

### m7. `docs/internal/pass-gate-tiers.md` is changed but unlisted

Location: spec :71-73, :112-114.

The page carries the tier table and each tier's static-check string. The draft branch already edits
it (`075bc174`, 26 lines). Fold: list it in "Rules where they execute" and in "What the draft
contributes".

## Over-ceremony, ranked by cost

### O1. Playwright browser caching and npm caching (Task 4)

Spec :90-91. `actions/setup-node` with `cache: npm` is already on every workflow. Playwright's CI
guide advises against caching browsers: restore time is comparable to download, and `--with-deps`
apt packages are not cacheable. The live hang was on `npm ci`, which caching would not fix;
timeouts do. Cut the bullet. That saves a Task 4 sub-item and a diff-review round.

### O2. Rewiring CI to build once

Covered under M2. About 1 minute of an 11-minute CI job. Keep CI's steps.

### O3. Probing what a doc already answers

The `attw` rebuild (m4) and the `--ignore-scripts` precedent are in-repo facts. A Task 2 probe adds
a gate run for nothing.

## OWNER FORK

### F1. The suite audit Geoff asked for

Location: spec :23-26; inputs :188-213; STATUS :49-50 (the resume prompt's scope lists "the measured
suite audit").

The spec records "No suite audit" among Geoff's settled decisions. The evidence offered (timing,
3 of 90 component files render nothing) answers the cost question. It does not answer the
redundancy question Geoff asked: inputs :191, "The answer should come from measurement, not
judgment".

Options:

- (a) Keep the spec: no audit, the coverage probe as the reopen trigger.
- (b) Add a failure-history pass, inputs :209-210: zero-cost data already in `gh run list`, about one
  dispatch.
- (c) The full Stryker audit.

Recommendation: (a) if the line is Geoff's verbatim ruling. Otherwise (b): it measures redundancy
cheaply. Either way, STATUS's resume scope is superseded and the close says so.

## Owed errata (Task 6 must cover each)

1. `~/.claude/skills/pass-core/SKILL.md`:
   - table cells :96-98 (the boundary and before-merge full gate; paint's "or on CI");
   - the per-task paragraph :103-106 (the boundary full gate);
   - :117-121 (the runner's fix-round reduction);
   - "CI shadows the pass" :137-141 (add pipelining);
   - Execution discipline :156-161 (the boundary receipt skip);
   - Closing step 2 :216-220 (the full gate, the simplifier revert and re-gate);
   - step 6 :238-241 (gate time and lock wait).

   All of it scoped per M1.
2. `~/.claude/skills/cairn-pass/SKILL.md` (not in the spec's list): Gate notes :47-51 (paint's full
   suite at boundaries); Closing step 2 :73-81 (`npm test` then `check:close`, the consumer-build
   proof, now satisfied by `ci-green` including `e2e`).
3. `~/.claude/skills/site-pass/SKILL.md`: confirm it is unchanged under M1's scoping.
4. `~/.claude/docs/pass-gate-economy.md`:
   - :10 ("Full gate" means the 45-minute tier);
   - :13-15 and :20-22 (reduced fix rounds, per M5 and m2);
   - :31-39 (the boundary receipt);
   - :77-78 (rule 2, the boundary skip);
   - :103-106 (the `check:close` description, per M2);
   - the measured baseline.
5. `~/.claude/docs/model-economy.md` "The pass-end score" :87-90 (not in the spec's list; per m1).
6. `~/.claude/agents/cairn-implementer.md`: :21-24 (the fallback gate when the classifier fails),
   :110-111 (the reduced gate naming), and the new lowest-layer rule.
7. `~/.claude/workflows/pass-execute.js` and `pass-execute-chains.js` header comments: the spec
   for each runner, per pass-core :117-121, including `PASS_CLASSES` and the fix-round gate.
8. `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md` (wider than "its gate section"):
   - the Segments table :60-66;
   - Execution mode :94 (`gate` the F string);
   - :115 (auth-data fix rounds);
   - :117-126 (the amended paragraph);
   - :128-132 (the local boundary F);
   - the Gates section :146-163;
   - Task 0's baseline :456-457;
   - the boundary lines :666, :799, :928, and S4's;
   - the close budget row :48 if the close no longer runs a local full gate.
9. `docs/internal/pass-gate-tiers.md` (per m7).
10. `ROADMAP.md` :311-338 and :1055-1062 (per M4), and the 12-against-17-hour figure at :312.
11. `docs/STATUS.md` resume prompt :47-59 (the audit scope, per F1), rewritten at the close anyway.
12. The global `~/.claude/CLAUDE.md` "Conducting a pass" ("the pass class's gate runs inside the
    chain") needs no change if `ci-green` is defined as part of the chain's gate. Say so in Task 6
    rather than leave it implicit.
13. The draft's `close-prebuilt.mjs:9` header comment (per M2).

No change owed: `docs/internal/durable-gotchas.md` (the CI-baselines rule still governs the local
fallback; the worktree-e2e reinstall still governs the per-task e2e).
