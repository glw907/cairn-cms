# Pass clock time design: consistency review

Lens: consistency only. Target: `docs/superpowers/specs/2026-10-10-pass-clock-time-design.md` at `449f5d69`
("spec" below). Checked against the global and cairn `CLAUDE.md`, `pass-core`, `cairn-pass`,
`pass-gate-economy.md`, `model-economy.md`, the gate economy spec and plan, `pass-gate-tiers.md`, STATUS, the two
research inputs, and the live repo (workflows, `cairn-run-gate`, `gh run list`, `playwright test --list`).
Findings are limited to correctness and the stated requirements. Over-ceremony is listed separately.

Counts: 1 blocker, 10 major, 11 minor; 5 over-ceremony items; 2 owner forks.

## Settled-item check (STATUS lines 54-55)

STATUS settles "the targeted gate and CI green as the boundary proof". The spec says it keeps both (spec:33-34).
It keeps the classifier and keeps CI as the boundary read. It weakens both in three places, though, and does not
say so. M2 covers the close proof, M5 the zero-retry premise behind CI green, and M6 which CI run counts as
green. None of these is a deliberate overturn, but each is a silent change of meaning.

## Blocker

### B1. The fast lane runs browser tests on the light lane, with three light slots

- **Location:** spec:61 (Fast lane contents "the selected unit and component files"), spec:132-135 (N=3 light
  slots), spec:150-151 ("contention shows up only as slot waits on light gates").
- **Defect:** the component project is a Vitest browser project that drives Chromium (`vitest.config.ts:211-215`;
  gate economy spec:28, "the component project is browser-bound"). Three ratified rules put any browser gate on
  the heavy lane:
  - `pass-gate-economy.md:88-104`: "a gate that launches no browser takes the light lane... so one light gate
    beside one heavy gate still fits in RAM". This rule came out of the 2026-09-14 OOM incident that killed
    GNOME Shell.
  - `cairn-pass/SKILL.md:58-61`: light is "only for a gate that launches no browser... never light".
  - The `cairn-run-gate` header, lines 29-34.

  The spec never assigns the fast lane to heavy or light, but its contention model only works if the fast lane
  is light. If it is light, the arithmetic breaks: this machine has 15 GB, and one heavy gate (8G max) plus
  three light slots (3G max each) is 17 G. That is the incident's failure shape. `durable-gotchas.md:80-91`
  also records that parallel component pages stall on this workstation ("three files in parallel pass, twelve
  fail"). Two chains, or two projects, each running component files in a light slot recreates that stall.

  If the fast lane is heavy instead, it queues behind e2e. The section 9 projection (5 minutes of fast lane, no
  lock wait) and the "pairs follow from the plan alone" claim then both fail.
- **Proposed fold:**
  - Split the fast lane by lane. Static checks and node projects go light. Selected component files go heavy, or
    to a separate `browser` slot count of 1 that the heavy lane also respects.
  - Size the light slot count against RAM in the spec: N light gates at 3G plus one heavy at 8G must fit in
    15G, so N is at most 1 at today's caps unless the caps change.
  - Reprice section 9's fast-lane row with a heavy-lane wait for component legs.
  - Name the amended `pass-gate-economy.md` light-lane bullet and the `cairn-run-gate` header in the errata.

## Major (ranked by consequence)

### M1. No owed-errata list; the spec silently changes about a dozen ratified texts

- **Location:** whole spec. The precedent is gate economy spec:250-281 ("Owed errata... this spec edits none").
- **Defect:** the spec changes the meaning of the ratified texts below and names only some of them as Pass W or
  Pass C deliverables (spec:204-206, spec:216-217). It names none of the specific clauses. Under the global
  rule "a rule lives where it executes", each clause has to be named or it rots.
- **Proposed fold:** add an "Owed errata" section that lists every clause:
  - `pass-core/SKILL.md`:
    - :96, the `auth-data` cell "waits for CI green before the next task".
    - :103-121, the per-task gate, the probe, and `--protected` through the runner's probe.
    - :137-144, chain step 1, "clears the class's per-task gate".
    - :146-153, "CI shadows the pass", the push point and the N+2 read.
    - :155-165, the runner args, `parallel: true`, and `pass-execute-chains` disabling CI.
    - :174-179, the heavy-lock heads-up rules.
    - :183-193, the `classifier: true` relaunch remedy and `pgrep -af cairn-run-gate`.
    - :245-251, close step 2.
    - :83-85, the clock estimate in the header.
  - `cairn-pass/SKILL.md`:
    - :47-57, the gate notes, the protected paths, and "waits for CI green on its own commit".
    - :79-92, the close gate and the draft PR.
    - :153, `cairn-run-gate --records`.
  - `pass-gate-economy.md`:
    - :7-15, the per-task gate.
    - :59-61, the gate name and the exit-75 rule. Exit 76 needs a "do not re-issue" line.
    - :62-65, parallel chains.
    - :77-87, the four coordination rules.
    - :88-104, the light lane.
  - `model-economy.md`:
    - :24, the gate runner seat.
    - :48-49, both runners.
    - :88, `cairn-run-gate --records`.
  - Global `CLAUDE.md`:
    - "Gate economy on a pass", the `cairn-run-gate` name and exit 75/76.
    - "Conducting a pass", `pass-execute-chains`.
  - cairn `CLAUDE.md`, "Tooling for the rebuild": `cairn-implementer` "clears the task's gate (the tier its diff
    computes...)".
  - The `cairn-implementer` and `diff-reviewer` agent definitions: lane reporting, and the receipt read
    (spec:168).
  - `pass-gate-tiers.md:3-10, :113-120`: the runner calls, `--protected`, and "the runner reads this mode".
  - `ci-green` and its workflow-trigger unit test (see M6).
  - Pass B's plan (`2026-10-08-engine-pass-pre-2b-b.md`): Execution mode, the Gates section, the `ci` args, and
    the segment boundaries.
  - The gate economy spec itself: its settled "auth-data waits" and "never in chains" (M4).

### M2. The close row misreads its evidence and drops the ratified close proof

- **Location:** spec:49-50, spec:196.
- **Defect, part 1:** spec:196 says today's close runs "three local full gates, 67 min". Replay part 4:479
  prices that row as "Close gates (simplify, two fix chains) | 3 | 4,033 s (67 min)". Those are three targeted
  gates on the simplifier commit and the two close fix-chain commits, not local full gates. Under
  `pass-core:245-251`, the ratified close gate is already CI green with a local fallback on exit 3, so the "New"
  cell restates the existing rule.
- **Defect, part 2:** "the last promotion already proved the pass branch head" is false at the close. The
  simplifier commit (`pass-core:240-244`, step 1, before the gate) and every close fix chain create new heads
  after the last task's promotion. `pass-core:251` also requires "on a close-gate failure, revert the
  simplifier commit and re-gate", which needs a gate on the simplifier commit.
- **Defect, part 3:** the ratified close green must be "on a run whose base is `origin/main`'s current head"
  (gate economy spec:230-233). A `push` run on a `stage/**` ref tests the branch commit alone, not the PR merge
  ref, so it cannot satisfy that rule.
- **Consequence:** the close's 90-minute budget leaves out the simplifier and fix-chain gates and their
  promotions.
- **Proposed fold:**
  - Correct spec:50 and spec:196 to "three targeted gates (simplifier, two fix chains)".
  - State that the simplifier commit and each close fix chain stage and promote like a task.
  - State that the close reads `ci-green` on the final head against current `main`, as ratified.
  - Reprice the close row.

### M3. Dependents waiting for promotion tightens ratified pipelining and contradicts the cited Zuul method

- **Location:** spec:114-116, spec:99-100, spec:236.
- **Defect, part 1:** Geoff's settled decision (gate economy spec:23-25, :212-216; `pass-core:146-153`) lets
  task N+1 start right after N is accepted. CI on N overlaps N+1, and CI is read before N+2. Only `auth-data`
  tasks wait. The spec makes every dependent task wait for promotion, about 12 minutes each, which adds clock to
  every `engine-logic` chain the ratified design did not wait on.
- **Defect, part 2:** it also contradicts the spec's own source. Zuul's speculative gating (Prior art 1b) tests
  each change on top of the changes ahead of it before they merge. Spec:103-104 already rebases onto the queue
  tip speculatively.
- **Defect, part 3:** the projection's "assume 4" dependent waits (spec:236) undercounts. With chains as the only
  mode and about half of pass B serial, every successor inside a chain waits.
- **Proposed fold (method, Claude's call):** let a dependent task start from N's staged ref, one deep, matching
  the ratified N+2 read and Zuul. A red on N already rebases the refs behind it (spec:108-110). Reprice
  spec:236.

### M4. Geoff's 2026-10-09 `auth-data` and protected-path rulings are overturned without naming them

- **Location:** spec:119-120, spec:166-175.
- **Defect, part 1:** the gate economy spec's settled decisions (:25, :123-128, :205-208) say an `auth-data`
  task waits for CI green before the next task starts, and that "a plan runs `auth-data` tasks in sequential
  mode, never in chains". The spec makes chains the only mode and lets independent tasks start while an
  `auth-data` task N is staged. Its "loses no assurance" argument is plausible, since nothing lands before
  promotion. It still overturns a ruling Geoff took, and it does so in a sentence that reads as a restatement.
- **Defect, part 2:** the protected-path rule (Plan GE:316-330, ruling 10; `cairn-pass:54-57`;
  `pass-gate-tiers.md:111-120`) is not addressed at all. That rule says a task touching the selection
  machinery waits for CI on its own commit, flagged by `gate-tier.mjs --protected` through the runner's probe.
  The spec deletes "the classifier probe agent" (spec:166) and never says what runs `--protected` or what a
  flagged task waits for. Pass B's Task 4 touches `publish.yml`, a protected path.
- **Proposed fold:**
  - Name both rulings as superseded or kept.
  - State the protected-path disposition. Recommended: a protected task's dependents and pair partner wait for
    its promotion, and the implementer reports `--protected` stdout beside the classifier's.
  - **OWNER FORK (F1):** (a) promotion-before-landing replaces the `auth-data` sequential wait. This is
    recommended: it is the 2026-10-10 "pairs by default" ruling, and CI still proves every commit before trunk.
    (b) `auth-data` tasks keep running sequentially and unpaired. Either way, the spec's ruling table at
    spec:25-31 should record the answer.

### M5. Deferring the targeted lane removes the premise behind Ruling 2

- **Location:** spec:62, spec:74-76, spec:142-144.
- **Defect:** Geoff's Ruling 2 (gate economy spec:49-56) accepted a CI retry-pass as green *because* "the
  per-task gate runs its selected e2e specs locally at zero retries, and an `auth-data` task always runs the
  auth specs, so an intermittent defect in the changed area still meets a no-retry run". Under the spec, the
  targeted lane is deferred to CI whenever the heavy lane is busy, and CI retries twice
  (`playwright.config.ts:30`). An intermittent auth defect can then pass on retry, and nothing ever runs it at
  zero retries.
- **Proposed fold:** `auth-data` tasks never defer the targeted lane. They wait for the heavy lane, which costs a
  few minutes. Alternatively, a CI retry on a diff-selected spec counts as red for an `auth-data` commit.
  State which one, and cite Ruling 2.

### M6. CI on `stage/**` refs conflicts with `ci-green`, the draft PR, and the zero-setup ruling

- **Location:** spec:30, spec:104-107, spec:216.
- **Defects:**
  - `ci-green`'s expected set is "the five workflows with `pull_request`..." (gate economy spec:178-186). Its
    Missing state reads the PR's `mergeable` field, and it is called with `--pr <n>`. A unit test also fails
    "when a workflow's trigger shape leaves this classification". Adding `push: stage/**` changes that shape,
    and staged SHAs carry no PR. The spec never mentions `ci-green` changes.
  - `tool.yml` and `tool-conditions.yml` use path-filtered push triggers, so they need the stage trigger too.
  - Ratified "CI shadows the pass" (`pass-core:146-153`, `cairn-pass:89-92`) pushes the pass branch to a draft
    PR. A promoted SHA pushed there runs every workflow a second time on the same commit. The global
    `CLAUDE.md` ("Conducting a pass") calls "an unchanged-commit rerun" a defect.
  - "A new project gets it with zero setup" (spec:30, a Geoff ruling) contradicts "each repo's CI workflows gain
    a `push` trigger" (spec:105). The gate economy spec:203-204 kept site repos from ever pushing per task.
- **Proposed fold:**
  - Specify `ci-green` against stage refs: SHA-based, no `--pr`, with an expected set for `push`.
  - Say whether the draft PR stays. If it stays, push the pass branch only at boundaries, or accept one
    duplicate run per promotion and say why.
  - State the zero-setup fallback: a repo whose workflows lack the stage trigger runs every lane locally, or
    its boundary-only CI, until it opts in.

### M7. "cairn's selection" misdescribes the ratified selector and would narrow the node projects

- **Location:** spec:86-88.
- **Defect, part 1:** the spec proposes moving "the component and unit selection" to `vitest --changed` if it
  matches "`gate-tier.mjs`'s hand map". There is no hand map for component files. `pass-gate-tiers.md:31-39`
  already selects component files through Vitest's own related API (`createVitest` with `related`,
  `getRelevantTestSpecifications()`, and the shared rerun triggers).
- **Defect, part 2:** the node projects run whole by design. `pass-gate-tiers.md:28-30` and gate economy
  spec:96-97 explain why: they "hold the guard tests that read files, spawn scripts, or walk trees, which no
  import graph sees". Selecting unit files by module graph silently reverses that ratified reasoning.
- **Proposed fold:** drop the component half, since it is already Vitest-native. Keep the node projects whole,
  or cite new evidence and name the reversal.

### M8. The `timeout-minutes` rule cites a source that does not say it and overturns PR #109

- **Location:** spec:190.
- **Defect:** "near 1.5 times its median (Prior art 1f)". Prior art 1f (prior-art:53-57) gives GitHub's default
  of 360, Chromium's 40-minute trybot median, and Fowler's ten minutes. It does not give a multiplier.

  Every job already has a timeout. PR #109 (gate economy spec:153-157) ratified "about 3x its median, minimum
  15", and the live workflows carry 15 to 35. At 1.5x, the e2e job (median 413 s) gets about 10 minutes, and
  its three `bounded-install` steps carry 22-minute step timeouts with an in-step retry. One slow install would
  kill the job, and `ci-green` would read it as an infrastructure red.
- **Proposed fold:** delete the bullet, since timeouts are ratified and enforced by `workflow-yaml.test.ts`.
  Alternatively, mark 1.5x as this design's own policy, give it a floor above the install bound, and name the
  PR #109 rule as amended.

### M9. "Proof by record" still depends on agents relaying the record

- **Location:** spec:122-124, spec:166-170.
- **Defect:** Prior art 2f (prior-art:90-93) says the orchestrator checks the wrapper's record against the system
  of record, "not the model's echo". In the spec, the runner can run no shell (spec:123). So it learns stage
  results from a haiku agent's report of `pass-stage`'s JSONL, and gate results from the diff-reviewer's
  reading of `run-gate --receipt`. Both are model echoes, one hop removed.

  The root failure in Evidence section 2 was a haiku agent submitting its structured answer before its own tool
  result arrived. Nothing in this mechanism prevents that from happening again in the promotion path.
  Spec:170 ("the runner never acts on an agent's unverified claim") overstates what the design delivers.
- **Proposed fold:** have `pass-stage` and `run-gate` emit a nonce-bearing line that the agent must copy
  verbatim (the record's SHA, plus its byte offset or hash). Have the runner reject a report whose fields fail
  a format check or fail to match the previous record. Alternatively, soften spec:168-170 to what is actually
  verified and cite 2f as partial.

### M10. Two different acceptance bars, and the model already misses the stricter one

- **Location:** spec:19-21, spec:219-221, spec:242-243.
- **Defect:** spec:20-21 accepts the design when the replay "confirms the projection", which is 6.5 to 7.6 h.
  Spec:220-221 stops pass C unless the replay lands pass B "at or under 6.5 hours under load". The model's low
  end is 6.47 h, so almost any replay stops pass C. "Under load" is also undefined for a priced replay. The
  ratified precedent (gate economy spec:367-370) records a projection miss rather than blocking on it.
- **Proposed fold:** use one bar, and define "under load" as a stated contention row. **OWNER FORK (F2):** (a)
  a hard stop at 6.5 h; (b) a stop above a tolerance, for example 7.0 h, with a miss below it recorded
  (recommended: the target reads "about 30 minutes", and a hard line at the model's low end is noise); (c)
  record only, as in the gate economy pass.

## Minor

1. **spec:222.** The shard proof's "test count sums to 337" will fail. 337 is the local count after
   `--grep-invert "site home|archive page 2"`. CI runs the suite whole: `playwright test --list` prints 357
   tests in 43 files. Use 357, or derive the number from `--list` at the PR's head.
2. **spec:46.** "29 minutes for two reds" is wrong arithmetic: R1 574 s plus R2 943 s is 1,517 s, or 25.3
   minutes, of which 13 minutes (782 s) is lock wait. The error comes from evidence:133, which also owes an
   erratum.
3. **spec:42.** "Whole suites run locally on four of ten tasks." Per evidence:148-159 and :245-247, four tasks
   run the whole e2e suite and four run the whole component project. Six distinct tasks run at least one whole
   suite: 1+2, 3, 4, 5, 10, and 11.
4. **spec:47 vs spec:160.** "A duplicate 36-minute run" and "R4's 13-minute duplicate" describe the same R4.
   Say "started a duplicate of the 36-minute run, stopped after 13 minutes" (evidence:48, :132).
5. **spec:145-148.** These lines silently drop `pass-gate-economy.md:84-86` rule (4) and `pass-core:177-178`:
   say so when the next heavy gate is more than about 30 minutes away. Those rules were agreed with the dubplate
   session at Geoff's request. Name the removal or keep the rule.
6. **spec:262.** The seat table jumps to "one Fable dispatch (pending)". `model-economy.md:27-29` and
   STATUS:63-65 require `max` before Fable. The design's own projection ("at or just over") is the trigger
   STATUS names. Record whether `max` ran, or why it was skipped.
7. **spec:179.** The header gains a clock *budget*. `pass-core:83-85` and `model-economy.md:82-83` require a
   clock *estimate*, and the close is scored against it. Say whether the budget replaces the estimate or sits
   beside it.
8. **spec:157-158.** The rename moves state to `~/.local/state/run-gate/`. Pass B's Task 0 records and receipts
   live under `~/.local/state/cairn-run-gate/`, and the close scores pass B with `--records`. Also unaddressed:
   the `CAIRN_GATE_*` environment variables, the runners' `gateLane` arg, and the receipt directory. Add a
   migration line.
9. **spec:57.** "Lane" now means two things: fast, targeted, or CI (spec:59-63), and the ratified heavy or light
   lock (`CAIRN_GATE_LANE`, spec:132-142). It is unclear whether `--lanes fast` (spec:164) names a lock. That
   ambiguity is how B1 hid. Rename one of them, for example "fast stage".
10. **spec:112-113 and spec:137-138.** Two citations stretch their source:
    - "Source: Zuul's window, which halves on failure." Zuul starts at 20 and halves. A fixed window of 2 that
      drops to 0 after a red is this design's own policy.
    - "Tested on this machine" for the even split. Prior art 2c marks only "`CPUWeight=50` works" as tested;
      the even split is the agent's reading.
11. **spec:63 and spec:69.** "About 10 minutes" of CI. The measured test job on `1ce14d3b` ran 11.7 minutes
    (`gh run list`: test 11.7, e2e 7.2, design 5.1). The worst measured queue adds 20.5 minutes
    (evidence:188-189). Section 9 uses 12. Also, every chain is now a fresh worktree by default (spec:172-175),
    and `durable-gotchas.md:32-39` records that a worktree showcase e2e proves `main`'s engine until
    reinstalled. A targeted lane in a new worktree silently tests the wrong engine. Give the merged runner's
    worktree setup the reinstall step.

## Over-ceremony (ranked by cost)

1. **The CI e2e shard matrix (spec:93-95, spec:222).** The e2e job is not the CI critical path. On `1ce14d3b`,
   e2e took 7.2 minutes and the `test` job took 11.7. Three shards save no wall clock. Copying the matrix
   "verbatim" also replaces the job's `json` reporter and the `retries-notice.mjs` step that carries Ruling 2's
   retry annotation (`e2e.yml`, reporter `dot,html,json`, retries step). It would also repeat the job's two
   bundle-assertion steps per shard. Drop it, or defer it until e2e becomes the longest job.
2. **Renaming `cairn-run-gate` to `run-gate` (spec:157-158).** The rename touches about eight ratified docs, two
   agent definitions, the state directories, and the environment variables (minor 8). `pass-gate-economy.md:59`
   already ratifies the tool as "generic despite the name". The rename buys nothing for clock. Defer it.
3. **The Vitest `--changed` comparison in the replay (spec:86-88, spec:219-220).** Component selection is already
   Vitest-native, and the node projects stay whole (M7). The comparison has nothing left to decide.
4. **PSI admission thresholds (spec:139-141).** These are tuned from no data, on top of slots and slices that
   already bound contention. Ship slots and slices, and add PSI only when the records show contention the slots
   miss.
5. **The e2e map coverage test (spec:90-91).** "Matches a map entry or the fallback" always passes, because the
   fallback matches everything. Assert instead that no `src/` path reaches the fallback unless it appears on an
   explicit allowlist, or drop the test.

## Verified as stated

- 14.8 to 19.0 h, and the 9-hour miss: replay part 4 and evidence:212-214.
- About 9 minutes saved on chain 1+2: 36.5 minus 27.5, evidence:107-118.
- 36.5 minutes for R3: evidence:47.
- 22 minutes of lock wait: 1,327 s, evidence:127.
- 217-minute close total: 67 plus 90 plus 60, evidence:195-196. Only the "three local full gates" reading is
  wrong (M2).
- 8 to 11.5 of 11.4 to 17.2 h: evidence:287-288.
- 11.7 minutes of CI wall clock: `gh run list --commit 1ce14d3b...`, test job 20:47:23 to 20:59:02.
- About 2,200 lines of runners: 1,265 plus 931 is 2,196.
- 18 replay ranges: replay part 1.
- `workers: 1`: `playwright.config.ts:25`.
- The section 9 sums: 388 to 458 minutes is 6.47 to 7.63 h.
- Prior art 1a, 1b (Bors and GitHub), 1c, 1d, 1e, 2a, 2c (as tested), and 2e say what the spec cites them for,
  apart from minor 10, M8, and M9.
