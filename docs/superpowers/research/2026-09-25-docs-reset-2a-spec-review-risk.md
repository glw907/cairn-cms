# Docs reset pass 2a spec review: data integrity and failure risk

**Target:** `docs/superpowers/specs/2026-09-25-docs-reset-pass-2a-design.md` at `598902f3`.
**Lens:** data integrity and failure risk (crash, concurrency, CLI drift, partial writes,
overwritten evidence, silently wrong pilot results, teardown, shared-workflow edits, no-go
coherence). Every finding was checked against source at `598902f3` and the live workstation
state on 2026-09-25.

**Counts:** 0 blocker, 5 major, 7 minor. One major carries an OWNER FORK.

## Major

### M1. `wrong[]` never reaches the adjudicator, so the precision condition can pass silently

- **Location:** spec lines 53-55 and 62-65; `scripts/docs-readers/judge-packets.ts:699-700`.
- **Defect:** Section 1 names only the catch judge's packet. False findings on control runs are
  ruled by the adjudicator, whose builder spreads an explicit field list:
  `const all = [...fields.stalls, ...fields.assumed, ...fields.diverged, ...(fields.checks ?? [])]`.
  The item-location union is also closed (`judge-packets.ts:404`, `:448`:
  `'stalls' | 'assumed' | 'diverged' | 'checks'`). If `wrong[]` is added to `buildCatchFields`
  but not to this spread, or if the adjudicator prompt does not name it, every `wrong[]` entry on
  a control run skips adjudication. Precision (pass-mark condition 3) then under-counts exactly
  the over-filing it exists to catch, and the pilot can report a go on a false precision figure.
  The acceptance tests only the catch side ("reaches the catch judge's packet", "the scorer
  counts a `wrong[]`-only catch").
- **Fold:** Section 1 names the adjudicator packet and `prompts/adjudicator.md` beside the catch
  judge. Add two acceptance items. First, a control fixture with a `wrong[]`-only entry reaches
  the adjudicator packet and `findingCountsForRun` (`lib/score-precision.ts`) counts it when it
  is ruled false. Second, for every pilot packet, the key's `wrong` item count equals the source
  report's `wrong[]` length. Run that as a precondition before each judge batch starts.

### M2. The pilot can return a wrong verdict when `wrong[]` quotes fail verification

- **Location:** spec lines 49-50 and 90; `lib/runner.ts:249-253` (`rerunCause`);
  `score.ts:342-344`.
- **Defect:** A `wrong[]` quote that fails verification fails the whole report. The field asks
  for more quotes, so it widens the failure surface. An unverified planted run gets one rerun,
  then counts as a miss (R9). That pushes recall down. An unverified control run is dropped from
  both the numerator and the denominator of development precision. That pushes precision up. A
  quote-sloppy reader therefore moves the two conditions in opposite directions, and the
  verdict can reflect the verifier rather than the reader change. Round 1 verified all 12 runs,
  so no baseline exists for this effect.
- **Fold:** The pilot record reports the verification outcome for every run, including reruns
  and the problem strings, and flags each run that failed on a `wrong[]` quote alone. The pass
  mark adds one line: when two or more planted runs are unverified only because of `wrong[]`
  quotes, the verdict is reported as inconclusive rather than no-go. If the conductor prefers,
  it can instead reverify those runs with `reverify.ts` after fixing any verifier defect. This is
  the conductor's B2 call, not an owner fork.

### M3. The precision baseline is misquoted, and one scripter run decides condition 3

- **Location:** spec lines 87-88.
- **Defect:** "Round 1 pooled about 1.2" includes the evaluator's control run (0 findings). On
  the pilot's five jobs, round 1's figure is 7 false findings over 5 verified control runs, or
  **1.4**, and all 7 come from the scripter's single control run
  (`tuning/round1/score.json`, `byJob.scripter.totalFalseFindings: 7`). Round 0's figure on the
  same five jobs is 7 over 10, or 0.7. With one control run per job, the bar of 1.5 allows 7.5
  findings in total, so the pre-change baseline already sits at the bar. Condition 3 tests the
  scripter run's variance, not whether `wrong[]` invites over-filing. Also, dev mode emits no
  pooled precision field (`score.ts:396-419` writes per-job figures only), so the pooled number
  would be hand-summed.
- **Fold:** Restate the baseline as 1.4 on these five jobs (0.7 in round 0). Test what the change
  adds: count false findings whose adjudicated item came from `wrong[]` separately, and set the
  bar on that count (for example, at most 0.5 per verified control run), with total precision
  reported beside it. Name the exact computation: the sum of `totalFalseFindings` over the sum of
  `verifiedControlRunCount`. Alternatively, add a pooled field to dev mode in the build task.
  This is B2 methodology, so the conductor decides it.

### M4. Section 3 misdescribes the chain, and the no-go branch leaves reader findings blocking

- **Location:** spec lines 106-113 and 208; `~/.claude/workflows/docs-page-chain-v2.js:66-103`,
  `:375-397`, `:806-821`.
- **Defect:** v2 already has a reader stage. Stage 1 hands off, the conductor runs `run.ts`, and
  stage 2 loads `report.json`. Stage 2 also already gates on readers: every stall and every
  assumption of a verified job becomes a **blocking** reader defect (`rd-<jobId>-stall-<k>`,
  `rd-<jobId>-assumed-<k>`), and the page escalates unless each one is applied. So "on a go: the
  chain gains its reader stage" is already true, and "on a no-go: reader reports reach the drafter
  as advisory input with no gate" is a semantic change to the blocking flags, not a no-op. The
  budget row "types only on a no-go" (line 208) under-scopes that branch. If the no-go branch
  ships types only, the chain keeps gating on readers, which is the outcome the no-go rejected.
  The pass would end with the ruling and the chain disagreeing.
- **Fold:** Rewrite section 3 against the file's current behavior. On a go, add `wrong[]` and
  `diverged[]` as blocking reader-defect kinds beside the existing two, and fix the types. On a
  no-go, fix the types and flip every `rd-*` defect to advisory (applied-findings still reports
  it, and escalation ignores it). Give each branch its own acceptance: a fixture job with one of
  each field yields the expected ids with the expected `blocking` flag. Budget the no-go row as a
  behavior change.

### M5. Tearing down the scratch site at 2a's close breaks the operator reader class in both branches

- **Location:** spec lines 175-176; `scripts/docs-readers/classes/docs-and-binary.json:3`;
  `run.ts:56-69` and `:140-156`; `lib/prepare-class.ts:1245-1246`;
  `docs-page-chain-v2.js:520-523`.
- **Defect:** The `docs-and-binary` class (the site operator's reader) mints its GitHub token for
  `cairn-scratch-b`, clones that repository, and maps `CAIRN_CF_READ_TOKEN` onto
  `CAIRN_SCRATCH_CF_TOKEN`. The chain's `READER_CLASS_RULE` still tells the register editor to
  propose `docs-and-binary` jobs. Under a go, readers gate the drafting passes. Under a no-go,
  they still run as advisory input. Either way, an operator-track page in the first drafting pass
  proposes an operator reader job, and after teardown that job fails at token mint or clone. The
  parent's "torn down at pass 2a's close" (parent spec line 218) was written when the design
  stage ended the reader work. O12 moved readers into the drafting passes, and the teardown date
  did not move with them. The teardown is idempotent (record line 251), but it cannot be reversed:
  reprovisioning means a new owner sitting for the token and the App installation.
- **OWNER FORK:** (a) Defer the teardown to the close of the last drafting pass that can run
  operator readers, and leave the rest of close item 8 unchanged. (b) Tear down at 2a's close,
  remove `docs-and-binary` from `READER_CLASS_RULE` in the same dotfiles commit, and have operator
  pages rely on the fact read. **Recommendation: (a).** The site costs nothing to keep, and (b)
  removes the one reader that runs the real binary. Pass A's defect evidence came from real use.
  Under either option, the teardown step also marks `scratch-site.json` and the class retired, so
  a later batch refuses cleanly instead of failing mid-mint.

## Minor

### m1. The floor rescore has no output location, and the packet builder deletes its `--out` directory

- **Location:** spec lines 75-77; `judge-packets.ts:695` and `:820` (`rmSync(outDir, { recursive:
  true, force: true })`); `score.ts:128` (unconditional `writeFileSync`).
- **Defect:** Round 1's packets live at `~/.cache/docs-readers/packets/round1/catch/<job>/`.
  Rebuilding at those paths erases the packets whose hashes the committed
  `tuning/round1/catch-keys/*` record. Writing `--out tuning/round{0,1}/score.json` would replace
  pass 1b's development evidence. Git can recover the file, but only if someone notices before a
  commit folds it in, and commit `d7ef74dd` already set a precedent of rescoring in place.
- **Fold:** The floor writes packets under `packets/floor-2a/...` and records under
  `scripts/docs-readers/tuning/floor-2a/{round0,round1}/`. The pilot writes under
  `tuning/pilot-2a/`. The plan states that no 2a task writes under `tuning/round0/` or
  `tuning/round1/`.

### m2. The floor needs a builder path that breaks the packet allow-list, and nothing scopes it

- **Location:** spec line 75; `judge-packets.ts:12-13` and `:453-455` (the allow-list guarantee
  that `ruleCandidates[]` "can never reach a packet").
- **Defect:** Showing `ruleCandidates[]` to a judge requires a new builder option and a new field
  value in the item-location union. That work is missing from section 1's deliverables. The
  option is a third deliverable on a two-deliverable build task, and a production-reachable flag
  that later reaches a gated or chain packet would silently widen what judges see.
- **Fold:** Make the option dev-only. It stamps the key (for example `builtFrom: 'fixture'` or a
  `floor: true` marker), and a gated batch already refuses non-`sources` keys. Put it in its own
  small build task or in the pilot task. The plan should also fix the order: run the floor after
  the judge prompt edit, so the floor and the pilot rule under the same catch-judge prompt.
  Record that prompt file's sha256 in both records.

### m3. The CLI hold is released, and the spec's re-pin trigger is wrong

- **Location:** spec lines 59-60; `lib/transcript.ts:114-123`; dotfiles `75f3d96` (hold
  released after 1b).
- **Defect:** `checkInit` keys the baseline on `claude_code_version` and compares only skills and
  plugins. A prompt change never requires a re-pin, but a CLI version change does. The host is at
  2.1.282 with the autoupdater re-enabled. Each batch builds its image from the host version at
  batch start (`run.ts:247-248`), so a mid-batch update is harmless. An update between the reader
  batch and a judge batch, however, fails every judge's init check ("no pinned init baseline").
  An update before the reader batch fails every reader, and R9 turns those failures into misses.
- **Fold:** Reword the trigger as "the host CLI version". Set the hold (`DISABLE_AUTOUPDATER=1`,
  as `4265aea` did) before the build task, pin that version with `--probe-init`, and release the
  hold after the last pilot judge batch. An unverified run whose only problem is an init-baseline
  mismatch is an infrastructure failure. It is re-pinned and resumed, never counted under R9.

### m4. A crash or signal mid-batch loses every finished run

- **Location:** `run.ts:519-535`. The report is written only after `runBatch` returns, and the
  signal path calls `process.exit(130)` in `finally` before any write.
- **Defect:** A killed background runner, a session end, or a suspend leaves no `report.json`, so
  `--resume` has nothing to resume. Round 1's 12 reader runs counted 0.42M
  (`tuning/round1/reader-report.json` usage), so a lost 15-run batch costs about 0.5M. That is most
  of the 0.6M pilot row, and the estimate already sits above the 5.6M flag (line 210).
- **Fold:** Run the pilot as five per-job batches of three runs, each with its own `--out`. A
  crash then costs one job. Arm the sleep inhibitor per the unattended-work guards. Copy
  `report.json` before any `--resume`, since the merge rewrites it in place with a non-atomic
  `writeFileSync`.

### m5. Nothing checks that the pilot runs on round 1's trees

- **Location:** spec line 71; `~/.cache/docs-readers/prepared/round1/*` (cache only, not in git);
  `tuning/round1/catch-keys/*-key.json` `inputs` (planted-page sha256 values).
- **Defect:** The trees are unversioned cache. A cache clear or a re-prepare (a scaffold `npm
  install` drift in `docs-and-site`) silently changes the stimulus. The pilot would then compare
  against round 1 on different pages.
- **Fold:** Add a precondition: each planted page's sha256 equals the value its round 1 catch key
  records, and the batch refuses on a mismatch. The pilot's job ids reuse
  `<job>-planted-1` and add `-2`, which collide with round 1's ids. Score the pilot in its own
  `score.ts dev` invocation, never alongside round 1 keys.

### m6. The floor's round 0 input exists only in the cache

- **Location:** `tuning/round0/catch-keys/*` `report.path` =
  `~/.cache/docs-readers/results/validation-20260924/report.json`. There is no reader report under
  `tuning/round0/`, unlike round 1.
- **Defect:** Round 0's reader reports and transcripts are pass 1b development evidence held only
  in cache. The floor rescore depends on them, and a cache loss makes the rescore impossible and
  the evidence unrecoverable.
- **Fold:** Before the floor runs, commit the scrubbed round 0 reader report beside round 1's
  (`tuning/round0/reader-report.json`). Verify its hash against the round 0 key `inputs`, and
  build the floor packets from the committed copy. The same rule covers the pilot: it scores only
  from reports copied into `tuning/pilot-2a/`, never from a cache path, and when `reverify.ts`
  has run it names which of `report.json` and `report.reverified.json` it scored.

### m7. Chain gating can pass vacuously, and exemplar edits cannot be undone

- **Location:** `docs-page-chain-v2.js:806-821`; spec lines 124-127 and 163-165.
- **Defect (chain):** Stage 2 drops unverified reader jobs with only a note. On a go, a page
  whose readers all fail verification (M2 makes that more likely) passes the reader gate with no
  reader evidence.
- **Defect (exemplars):** The store at `~/.local/share/cairn/exemplars/` is not in git, and a
  recapture from the URL is not a restore, since the page may have changed. Profile frontmatter
  (section 4) cites exemplar ids before the section 6 review may drop some.
- **Fold:** On a go, a page with reader jobs but zero verified runs escalates. For exemplars,
  section 6 marks a rejected capture in the manifest instead of deleting its directory, and its
  fold re-checks every profile's exemplar ids against the manifest.

## Checked and sound

- Concurrency on the shared runner cache. `lib/sweep.ts` reaps only directories and containers
  whose owner process is dead, with a pid and start-time marker, so a second session's runner
  does not kill the pilot. Per-run output directories carry a `runId`
  (`run.ts:495`), and the chain's handoff files carry a UTC stamp.
- Prepared trees are copied per run (`lib/podman.ts:445`), so `docs-and-site` readers with Write
  access cannot mutate round 1's trees.
- The 1b judge-prompt defect. `f618743a`'s `checkJudgeJobField` refuses a batch whose job text
  is neither the placeholder nor byte-identical to the frozen prompt (`lib/runner.ts:731-742`).
  An edited `catch-judge.md` is read once per batch. The remaining exposure is M1: a prompt or
  packet that omits `wrong[]` is not a prompt-delivery failure, and nothing checks for it.
- Editing `docs-page-chain-v2.js`. Every reference is in cairn-cms docs-reset plans and specs.
  Pass 2a drafts no page, so no in-flight invocation shares the file. Keep stage 1 and stage 2
  of any one batch on the same file version, since a handoff written by the old stage 1 would
  reach a new stage 2's schema.
