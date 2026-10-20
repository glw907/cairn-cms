# Pass clock time: contract and criteria review

Lens: contract and criteria. Target: `docs/superpowers/specs/2026-10-10-pass-clock-time-design.md` at `449f5d69`
("Spec" below; line numbers are that file's). Context read: the evidence doc, the prior-art record, `ci-green`
and `ci-green-lib.mjs`, `cairn-run-gate`'s header, `pass-core` (the class table and "CI shadows the pass"), the
chains runner's header, `.github/workflows/*.yml`, `.github/ci-green.json`, `scripts/checks/gate-tier.mjs`, and
Plan B's `Files:` lines. One measurement was run: `npx playwright test --list` in `examples/showcase`.

Scope: only gaps that affect correctness or the stated requirements, then over-ceremony by its clock and token
cost. Polish is omitted.

Counts: 1 blocker, 11 major, 6 minor, plus 2 over-ceremony items. One OWNER FORK (M1).

## Blocker

### B1. The acceptance gate cannot confirm the target it gates

Location: Spec:19-21, :219-221, :229-243.

Defect. Section 1 says the design "is accepted only when the replay in section 8 confirms the projection on
measured inputs." The replay as written fails that contract four ways:

1. **Circular inputs.** The replay can measure only the lane rows: fast and targeted minutes per range, priced
   from the gate-economy replay's fitted leg prices. Every other row in section 9 is an assumption. The 20-minute
   work-and-review figure is pass A's (Evidence :301-302, "Not established"). The fix rounds and the four
   dependent waits are guesses. The contention row of 0 to 30 is a guess. The close row is 90, which is the
   target itself. Most of the total is fixed before the replay runs. The gate passes or fails on assumptions,
   not on the measurement.
2. **"Under load" is not in a replay.** The replay prices historical ranges offline. It cannot observe slot
   waits, the targeted-lane defer rate, PSI admission waits, or a peer project's lock hold. Those are the
   load-dependent terms, so a replay "under load" (Spec:220) is not a defined quantity.
3. **The threshold contradicts the model.** The gate is "at or under 6.5 hours" (Spec:220). The model it is
   meant to confirm says 6.5 to 7.6 (Spec:240). Section 1 calls the target "about" 6.5. So the gate fails
   across most of the model's own range, and no tolerance or decision rule covers the expected case. Section 9's
   two levers are named, but nothing says who decides or when.
4. **It runs after the irreversible work.** The replay is pass C's first proof, but pass W ships first: the
   merged runner, the retired chains runner, `pass-core`'s new rules, and the global `CLAUDE.md` line. When the
   gate fails, "return to design" leaves a workstation already rebuilt around the design it rejected.

Proposed fold.
- Split the gate in two. **(a) The replay gate** prices only what it can measure. Its output is the
  fast-plus-targeted lane minutes per replayed range and the count of ranges whose classifier selects a whole
  suite. State a threshold on that row, for example a mean fast-plus-targeted of 9 minutes or less with no
  range over 15. Those numbers are this design's own policy and should be marked as such. **(b) The 6.5-hour
  target** is scored on pass B's real clock ledger at its close, under whatever load the machine had (see M1).
  The replay then decides whether to build, and the ledger decides whether the target was met.
- Move the replay ahead of pass W. It needs only `gate-tier.mjs --lanes`, the price table, and the 19 ranges.
  Pass W can then ship its design-independent fixes (the reprint, the unknown-flag rejection, the wait cap, the
  slot files) whatever the replay shows. The staging queue and the runner merge wait on the replay.
- Write the decision rule for a replay that lands high: name which lever applies, and say whether a miss
  stops the build or only re-plans pass B's order.

## Major

### M1. The target has two incompatible definitions, and "under load" is not operational (OWNER FORK)

Location: Spec:13-19, :27, :179-189.

Defect. Spec:16 defines the budget as per-task latency, "from dispatch to an accepted, CI-proven task." Spec:19
turns it into pass throughput: 10 x 30 + 90 = 6.5 hours. These are different clocks. Section 9's own per-task
model is 20 minutes of work, 5 of fast lane, up to 4 of targeted lane, and about 12 of CI before promotion. That
is about 41 minutes of latency per task. So the per-task criterion fails on every task even when the pass meets
6.5 hours through pairing. Section 7.1's over-budget check is a third clock: the implementer's own elapsed time,
which stops at the implementer's return. "Measured under realistic load" (Spec:14, :27) names no observable
quantity. A pass on an idle machine would meet it and claim the target. A pass that overlaps one anomalous
36-minute peer gate would miss it with no way to say why.

Options.
- **A. Throughput.** The target is pass wall clock of at most 30 x N + 90 minutes, scored at close from the
  ledger. The per-task 30 minutes becomes only a planning unit.
- **B. Latency.** Each task's dispatch-to-promotion time is at most 30 minutes. That needs CI under about 5
  minutes or a budget near 45, and it contradicts section 9.
- **C. Both, named apart.** The pass target is A. The per-task budget is active time, from dispatch to the
  reviewer's accept with CI excluded, at 30 minutes, enforced at 2x as section 7 says.

Recommendation: C. It matches the 6.5-hour arithmetic Geoff approved and keeps a per-task stop rule that an agent
can see. For load, the ledger records peer-project gate minutes overlapping the pass (from `runs.jsonl`, any
`toplevel` but this one) and this pass's own slot, lock, and defer waits. The score is reported with that overlap
figure and with no idle-machine exclusion. A pass with zero overlap is labeled "unloaded" and does not count as
confirming the target.

### M2. Stage-ref CI and the pass PR's CI run twice on every promoted SHA, so the boundary read is not "the last promotion"

Location: Spec:103-106, :117-118, :196; `pass-core` "CI shadows the pass"; `~/.local/bin/ci-green:6,11-12`.

Defect. Today a pass branch gets CI only through its draft PR. The workflows fire on `push` for `main` and
`rebuild` only, and `pass-core` requires the draft PR. Promotion fast-forwards the pass branch, which is that
PR's head. That fires a `pull_request` synchronize run of all five `expected` workflows on the same head SHA,
which the `stage/**` push already proved. `ci-green` reads every run for a `head_sha` regardless of event
(`ci-green-lib.mjs:468`). So after each promotion the head reads as pending for about 12 more minutes, and a
boundary read waits for it. That contradicts Spec:118's "the boundary read is the last promotion, not a separate
wait." The PR run also tests the merge commit with `main`, a different tree, so the two verdicts can disagree.
`ci-green` also requires `--pr <n>` (line 6), and no stage ref has one. Pass W's deliverables do not list a
`ci-green` change.

Proposed fold. Pick one CI source per SHA and state it. The leanest choice is to open the pass PR at close rather
than at the first commit. Staging then replaces "CI shadows the pass," the close runs the PR's merge-commit CI
once, and that run is the merge proof. Add to pass W: `ci-green` accepts a stage ref without `--pr`, with no
other change to its exit contract. Update `pass-core`'s draft-PR rule in the same pass.

### M3. The shard criterion names the wrong total and could push CI toward dropping tests

Location: Spec:222.

Defect. "Three green shards whose test count sums to 337." 337 is the local count under
`--grep-invert "site home|archive page 2"` (`gate-tier.mjs:142`), which keeps the CI-canonical visual baselines
off this workstation. CI runs `test:e2e` with no invert (`e2e.yml:144`). Measured today, `playwright test --list`
reports **357 tests in 43 files**, and 337 with the invert. A correct sharded job therefore fails the criterion.
The cheapest way to "pass" it would add the invert to CI, which would delete the 20 canonical visual tests from
every run. The fixed number also goes stale the moment any pass adds a spec.

Proposed fold. The merged report's test count equals `playwright test --list`'s total at the same SHA with CI's
own arguments. Assert this in the `merge-reports` job, so it fails on a dropped shard rather than on a number
copied into a spec.

### M4. The e2e map coverage test can never fail

Location: Spec:89-91; relied on at Spec:247-248.

Defect. "A test asserts every path under `src/` and `examples/showcase/src/` matches a map entry or the
fallback." The fallback is run-everything for any unmapped path, so every path matches by definition. Under
the new lanes, run-everything means the whole e2e suite, which moves to CI. An unmapped path therefore silently
gets no targeted lane and no early red. That is the selection-unsoundness risk that section 10 says this test
"shrinks."

Proposed fold. Assert that every path matches an explicit map entry or a committed allowlist of paths that
intentionally fall through to run-everything. A new file that reaches the fallback without an allowlist entry
fails the test, naming the path. The allowlist is the reviewable record of where the targeted lane is blind.

### M5. `pass-stage`'s proof by record is still the same agent's echo

Location: Spec:122-124, :166-170.

Defect. The runner cannot run shell, so a haiku agent runs `pass-stage` and reports "the remote ref's SHA" and
"the script's JSONL record." The runner reads both through that same agent's structured output. That is the
failure class Evidence section 2 measured: a haiku agent submitted `{"exists": false}` 228 ms before its own
`test -f` returned. A fabricated SHA or record line has the same shape as a real one. Section 6 closes this gap
for gates, where a different agent reads `--receipt`, but leaves it open for promotion, the step that writes the
pass branch.

Proposed fold. The runner passes a fresh nonce to each `pass-stage` call. The script prints
`sha256(nonce + remoteSHA)`, computing `remoteSHA` from `git ls-remote` after the push. The runner verifies the
digest in JavaScript against the reported SHA, and a mismatch reruns the step. An agent cannot produce a matching
digest without the script running. Pass W's test suite covers a forged report being rejected.

### M6. Nothing independently checks that the reported lanes are the classifier's lanes

Location: Spec:166-170.

Defect. The probe is deleted and "the implementer runs the classifier itself and reports its stdout." The
diff-reviewer then checks the receipt "for the reported gate string." A receipt proves that string ran on that
tree. It does not prove the string is what `--lanes` selects. An implementer that reports a narrower fast lane,
whether misread or truncated, passes the check. This is the silent-selection failure the pass exists to fix, in a
new place. The spec also does not say whether the runner still resolves a gate itself, since `resolveGate`
depended on the deleted probe.

Proposed fold. The diff-reviewer runs `gate-tier.mjs --lanes --range <base>..<task SHA>` itself. It is
deterministic and takes seconds. The reviewer requires the receipt's gate string to equal that output's `fast`
string, and a mismatch is a blocking finding. State that the runner's own `resolveGate` path is removed.

### M7. Fixture proof 2 lists scenes, not assertions, and skips most queue invariants

Location: Spec:210-213; existing suites `~/.dotfiles/tests/pass-execute-runners.test.mjs` (1,338 lines) and
`cairn-run-gate.test.sh`.

Defect. "It must show a pair dispatching, a staged ref promoting, a red leaving the queue..." Each item can be
satisfied by seeing the event happen once, without checking what the queue guarantees. Section 4 promises six
things this proof never exercises:
- the window bound (a third ref does not stage);
- no staging after a red until the queue is green;
- in-order promotion (a later green ref waits for an earlier pending one);
- the `Files:` overlap refusal;
- a rebase conflict dropping a ref;
- `maxFix` exhaustion on a CI red.

The spec also does not say whether the implementer and reviewer are real agents or stubs. Real agents make the
proof expensive and nondeterministic. The existing stub harness, with `agent` replaced, already runs both runner
bodies, and the spec never names it as the regression floor for the merge.

Proposed fold. Run the proof in the existing stub harness, with an agent stub that executes `pass-stage` for real
against a local bare remote, plus deterministic implementer and reviewer stubs. Each promise becomes one
assertion on the remote's refs. For example: after the red on ref 1, `stage/<pass>/2`'s parent is the pass tip,
and no commit on the pass branch carries ref 1's patch-id. Both existing suites stay green through the merge.

### M8. Disjoint `Files:` lists do not bound the diffs, and pass B's tasks share append files

Location: Spec:114-116, :253-254.

Defect. Independence is checked on the plan's declared `Files:` lists. The real diffs are not checked against
them. Plan B's tasks also write shared append files: `CHANGELOG.md`, `docs/extend/migration-notes.md`, and
`docs/internal/facts/*.md` (Plan B :303, :553, :1037, :1108, :1131-1174). Two independent tasks adding a
CHANGELOG bullet conflict on rebase, and section 10's rule turns each conflict into a re-dispatch, about 30
minutes each. "Rare" is unsupported for a docs-heavy pass.

Proposed fold.
- The diff-reviewer flags any touched path outside the task's `Files:` as a blocking finding when the task is
  marked independent.
- Mark the shared append files `merge=union` in `.gitattributes`, git's built-in union merge driver, or route
  every CHANGELOG, facts, and migration-notes line to the close.
- Count queue conflicts in the clock ledger, so "rare" becomes a measured claim.

### M9. PSI admission can throttle a lone project's own pair

Location: Spec:139-141.

Defect. Admission reads system-wide `some avg10` and waits above a threshold. A lone pass running a pair raises
CPU pressure itself: one fast lane's Vitest and type check saturate cores. Its second slot then waits on pressure
that nobody else causes. That undoes the pairs default (ruling, Spec:28) and section 9's "about half running in
pairs" row. Equal-weight slices already split the CPU across projects (Spec:136-138), so CPU admission adds no
fairness. The thresholds have no source (Spec:140-141) and no test (Spec:208-209). This is the most expensive
ceremony in the design per unit of assurance.

Proposed fold. Drop CPU admission. Keep memory admission only, since memory is the OOM risk that `MemoryMax`
does not prevent across two scopes. Record its threshold in the tool, and test it with a fake
`/proc/pressure/memory` path through an env override. Revisit CPU admission only if the records show slot waits
failing to protect a peer.

### M10. The projection leaves out each segment's last promotion wait

Location: Spec:117-118, :229-240.

Defect. A boundary needs every task in its segment promoted (Spec:117). The last task's CI, about 12 minutes,
therefore sits on the critical path once per segment, in addition to the dependent waits. Pass B segments at
three to four tasks per the global rule, so it has three or four boundaries plus the close. That is about 36 to
48 minutes the table does not carry. With M2's duplicate PR run, it doubles. The table also assumes "about half"
in pairs and 4 dependent waits. Both are knowable now from Plan B's independence marks and order, and both
should be computed rather than assumed.

Proposed fold. Add a "segment-boundary promotion" row of segments x CI median. Derive the pair count and the
dependent-wait count from Plan B's marks in the replay. Restate the total, which runs about 7.1 to 8.4 hours
before M2's fold.

### M11. The reprint contract is incomplete: reds, flake reruns, and the no-receipt case

Location: Spec:159-160.

Defect. "A finished result for the same tree and gate string prints again on the next call, from the receipt."
Three readings are open:
- **Reds.** Today only a passing run's receipt counts for matching. If reds are not reprinted, a lost red line
  still starts a fresh run, which is R4's failure on the red path.
- **Flakes.** If reds are reprinted forever, a flaky local red (local e2e runs `--retries=0`) can never be rerun
  on the same tree.
- **No receipt.** A tree that changed mid-run gets no receipt (`cairn-run-gate` header), so a reprint finds
  nothing and starts a fresh run.

Proposed fold. Reprint applies to any exit code, keyed by the receipt fingerprint. A `--fresh` flag forces a
rerun. A run that ended with no receipt prints its recorded exit and the reason it has no receipt, and it does
not rerun. The test suite covers green reprint, red reprint, `--fresh`, and the no-receipt case.

## Minor

### m1. The Vitest `--changed` comparison is superset-only

Location: Spec:86-88. "Selects at least what the hand map selects" passes trivially when `--changed` selects
everything. `forceRerunTriggers`, which defaults to `package.json` and `vite.config.*`, does exactly that on many
of pass A's ranges. Add a ceiling: summed selected component files, or priced minutes, across the replayed ranges
must not exceed the hand map's. Name the method, for example `vitest list --changed <base> --project component`
at each range's head, so the comparison is reproducible.

### m2. The wait-cap test should time the call, not check the default

Location: Spec:162-163, :208-209. Evidence :307-308 records that the cause of the cap firing was not
established. A test that asserts a lower default passes without fixing the defect. Assert the call's wall clock:
with a scaled wait and cap, a call that queues behind a held lock and then runs a never-ending gate returns 75
within the cap minus the margin.

### m3. `timeout-minutes` "near 1.5 times its median" names no median source

Location: Spec:190. Name the source, for example the last 20 green runs from `gh run list` per job, recorded in
the workflow comment. Keep each job timeout above its steps' timeouts: the `bounded-install` steps carry 22
minutes, which already exceeds a sharded e2e job's likely 1.5x median.

### m4. The close's local-full fallback covers exit 3 only

Location: Spec:196. `ci-green` exit 2 (a required workflow missing 5 minutes after the push) is also not a proof
of green. Say what it triggers, and say whether close commits, such as the fold's CHANGELOG and STATUS, go
through the queue.

### m5. A missing `classifier:` header silently reproduces the original failure

Location: Spec:166-167. A plan in a classifier repo that omits the header gets no classifier, with no signal.
That is Evidence section 2's outcome from a different cause. Have the implementer report `test -f` of the
classifier path, and treat a mismatch with the header as an escalation.

### m6. The sharding criterion does not test the clock it was adopted for

Location: Spec:93-95, :222. Each shard repeats the installs, the package build, and the `norms` reusable
workflow. The criterion proves correctness only. Add the e2e workflow's wall clock from `gh run view` against
the unsharded median, so a matrix that saves no time is visible.

## Over-ceremony (by cost)

### o1. The runner merge's direction and cost are unstated

Location: Spec:172-175. "Merged into `pass-execute.js`" ports about 930 lines of chains scheduling into a
1,265-line file. Extending the chains runner and retiring the sequential one may be the smaller diff. Choose by
diff size, and keep both existing test suites as the floor (M7). This is pass W's largest token cost, and the
spec carries no estimate for it.

### o2. The `check-drift` probe for plans that bypass `run-gate` has no criterion

Location: Spec:205-206. It is a new detector with no stated input, output, or test, guarding a rule that
`pass-core` and the runner prompts already carry. Cut it, or give it one fixture: a plan with a bare
`npm run` gate is flagged, and a `run-gate` gate is not.
