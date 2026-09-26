# Docs reset pass 2a: the reader fields, the pilot, and the audience record

> **For agentic workers:** twelve tasks (0 to 11) in four segments. Tasks 1, 3, 4, and 6 are
> implementer chains: `cairn-implementer` (`sonnet`, `high`) implements test-first,
> `code-simplifier` refines, the task's gate runs inside the chain through `cairn-run-gate`, and
> `diff-reviewer` (`claude-opus-5-5`, `high`) reads the diff against the task's acceptance
> criteria. Tasks 0, 2, 5, and 7 to 11 are conductor-run: the conductor dispatches the named agents
> and the reader runner, and reads their structured reports, never diffs, pages, transcripts, or
> logs. **Execution mode:** per-task Agent chains; no workflow (see "Execution mode" below).
>
> **Plan author:** `claude-opus-5-5` at `high`. The close counts this plan's planning misses.
> Revised by the plan-review fold
> (`docs/superpowers/research/2026-09-25-docs-reset-2a-plan-fold.md`).

**Date:** 2026-09-25.

**Goal:** give reader reports scored `wrong[]` and `missing[]` fields, run the pre-registered
go/no-go pilot that sets which reader classes gate the page chain, then write, review, and put to
Geoff the audience record and the exemplar corpus review.

**Spec:** [`2026-09-25-docs-reset-pass-2a-design.md`](../specs/2026-09-25-docs-reset-pass-2a-design.md),
read in full by every executor before its task. The spec is the contract: its fields, pass mark,
per-class rule, and order are fixed. Where this plan and the spec disagree, the spec wins; stop
and report, **except for four errata**, which are sanctioned deviations, not conflicts: E1 (R-f,
the plants file), E2 (R-h, the CLI hold), E3 (Task 9 runs three lenses split by audience where
§6 names one, because one lens cannot read the corpus; plan fold record, M m8 and R m11), and E4
(Task 9's deferral to pass 2b, an erratum only if Geoff rules F2(a)). The rulings behind the
spec: its "Rulings" section and the fold record
`docs/superpowers/research/2026-09-25-docs-reset-2a-spec-fold.md`.

**Approved:** pending Geoff's read, with the two owner decisions below.

## Owner decisions at approval

**Ruled (Geoff, 2026-09-25, plan approval): F1 approved (pause `uupd.timer` for the pilot window); F2 (a) (continue past the 12M flag; at a projected 15M breach, Task 9 defers to pass 2b under E4; stop and ask if it still breaches).** The texts below are kept as the record of what was ruled.

**F1. Pause the system updater for the pilot window (recommended: approve).** The host `claude` is
the Homebrew cask `claude-code@latest`. Homebrew installs do not update themselves, so
`DISABLE_AUTOUPDATER` holds nothing on this machine. What moves the CLI is `uupd.timer`, which runs
`brew` daily at 04:00 (plus up to 15 minutes) and most likely moved pass 1b to 2.1.282 mid-pass.
The plan stops `uupd.timer` from just before the smoke run (Task 2) until the last pilot judge
batch and every scoring rerun are done (Task 5 step 7). This pauses all of uupd's modules,
including the system image, for that window. Stopping the timer is a runtime change: the unit stays
enabled, nothing under `/etc` changes, and one start reverses it. The alternative, setting uupd's
`brew` module to `"disable": true` in `/etc/uupd/config.json`, is an `/etc` edit routed through
`~/.dotfiles/bluefin/etc/`, survives reboots, and takes a second commit to undo, so it is not
chosen. One caveat: a reboot inside the window re-arms the timer, and because the timer is
`Persistent=true` it may fire at boot. The session-start check below catches that.

The pause runs from the smoke run through the pilot's scoring, likely one or two sessions, and it
stays in force while the pass is idle between them, so the host takes no system update in that
window. The risk of declining: the pilot's reader batches can run on different CLI versions, and
each drift costs a rerun of the batches already run in that stage.

- Status first (the dry run): `systemctl status uupd.timer uupd.service --no-pager; systemctl list-timers uupd.timer --no-pager; claude --version`.
  Proceed only when `uupd.service` is not `active` or `activating` (no update mid-run; `failed` and
  `inactive` both proceed, and the service was `failed` on 2026-09-25 after its power-saver
  hardware check) and the version is in the pinned set.
- Pause: `sudo -A systemctl stop uupd.timer && systemctl is-active uupd.timer` prints `inactive`.
  The Ledger records the instant.
- Resume: `sudo -A systemctl start uupd.timer && systemctl list-timers uupd.timer --no-pager` shows
  a next run. If a 04:00 run was missed while paused, uupd catches up within about 15 minutes of
  the start. That is intended, and it lands after the hold.
- `claude --version` runs before every runner batch (the smoke run, Task 3's live check, the five
  reader batches, both judge batches, and any rerun) and must be in the pinned set: 2.1.280 to
  2.1.282, plus any version re-pinned before the first pilot reader batch. A drift before that
  batch is re-pinned with `--probe-init`, recorded, and the pass continues. A drift from the first
  pilot reader batch through the last scoring rerun stops the pass for Geoff.

**If Geoff declines F1:** no pause. The version check still runs before every batch. On a drift,
the conductor re-pins the init baseline with `--probe-init` and reruns every batch of the same
stage already run on the earlier version (the five reader batches are one stage, the two judge
batches another). The pilot record names each batch's CLI version, and the pass does not stop for
the drift.

**F2. One pre-ruling for the flag and the ceiling (recommended: (a)).** The evidence:
- The estimate is about 12.65M, above the 12M flag, so the flag sitting is close to certain.
- At pass 1b's mean build cost (2.0M against lines of 1.3M and 1.0M), the pass reaches about
  15.75M, over the 15M ceiling with no conditional chain firing (see "Cost lines").
- Deferring Task 9 (0.8M) brings that mean case to about 14.95M.
- Nothing yet rules what gives at the ceiling. Tasks 8 to 10 (the audience review, the exemplar
  review, owner stop 1) are the tasks left when it lands.

**The projection**, under either option, is `session-ledger.ts` counted spend at the reading plus
the cost lines of every task still open. The ledger counts sessions, not tasks, so no per-task
figure enters it. The conductor takes the reading at every task boundary from Task 0.

- **(a) Continue past the flag, with a pre-ruled cut (recommended).** At the 12M flag the conductor
  records the reading and the projection in the Ledger and continues. When the projection first
  breaches 15M, Task 9 (the exemplar review) defers whole to pass 2b (E4), which already takes the
  exemplar gap fills (B4). If the projection still breaches after the deferral, or Task 9 has
  already started, the conductor stops and asks. No Task 8 lens is ever cut (parent spec, "no
  review lens is cut"), and a deferral moves Task 9's lenses to pass 2b whole, cutting none. This
  builds a pass that likely runs to owner stop 1 without a mid-pass sitting, with the audience
  record reviewed in full and, at worst, an exemplar review that lands in pass 2b against its 8M.
- **(b) Stop and ask at the 12M flag, as B4 set it.** The conductor stops at the flag, and Geoff
  rules the next step, including what gives at the ceiling. This builds the same pass with the cut
  ruled in person, at the price of a likely mid-pass sitting for an outcome (a) already names.

Under either option, a runner batch that is running when a stop lands finishes, and the pass
still stops at the ceiling itself.

## Conductor rulings at plan review (B2)

Method calls under B2, recorded with their reasons. The fold record gives every review finding its
disposition.

- **R-a. Key paths.** `keyTraceMatches` (`lib/score-assemble.ts:231-233`) is never loosened. It is
  the only guard that a judge ruled the report being scored. Every committed round 1 key traces to
  the `docs-reset-1b` worktree's `tuning/round1/reader-report.json`, so Task 4's round 1 regression
  passes `--report` at that path, and Task 0 confirms the worktree and file exist and are
  byte-identical to the committed copy (recreating the worktree at that path from the pass 1b merge
  commit `1e4a7c31` if it is gone). The pilot builds every packet from the exact absolute path it
  scores. A scoring run counts only when `notes` is `[]` (no expected note is listed today) and the
  pinned totals hold: 16 on-map plant-runs, per-job `onMapPlantCount` 2, 2, 2, 1, 1, and five
  control runs. A trace note is fixed by rebuilding keys against the scored path, never by
  rerunning a judge. Any report substitution (a `reverify.ts` output, a resumed batch) rebuilds its
  keys.
- **R-b. Working directory.** Every command in this plan starts with `cd` into the named worktree.
  Run from `main`, the runner uses the old report request and verifies cleanly. The smoke run's
  report must carry `wrong` and `missing` keys on every job (empty or not) as proof that the new
  request reached the reader.
- **R-c. Harness filter and packets.** The pilot builds packets exactly as round 1 did: per control
  run, `harness-filter.ts` over the run's catch-field items, with the job's `absent` list from the
  pilot batch file (copied from `batches/round1.json`'s job entries, round 1's source) and the
  run's own denial record; its exclusions go to the adjudicator packet as `excludedKeys`. Packets
  land under `~/.cache/docs-readers/packets/pilot-2a/{catch,adjudicator}/<id>/` with `key.json`
  beside each packet. Keys are copied to `tuning/pilot-2a/{catch,adjudicator}-keys/<id>-key.json`.
  The filter log is committed as `tuning/pilot-2a/harness-filter-log.json` and checked as a
  scoring precondition. Reason: round 1's baseline of 7 false findings, the base of the precision
  bar, was measured after the filter.
- **R-d. Judge audit.** Before the pilot record, one cold `claude-opus-5-5` agent at `high` audits
  every catch ruling (catches and misses) and all five adjudications against their packets, keys,
  and plant criteria, about 0.15M (Task 5 step 6). A defect finding is a judge defect: it is fixed,
  the batches of that kind rerun, and the pilot rescores. It is never itself a verdict. Reason:
  pass 1b's real cause came from exactly this audit, and the catch judge is the stage the new
  fields change most.
- **R-e. Exemplar ids.** The resolver maps each manifest `##` heading to its store directory by the
  explicit table in Task 6 and accepts every slug form present in the manifest (verified against
  `docs/internal/record/docs-exemplars.md` at `2eb96b74`). Task 6's test fixture manifest is copied
  from the real manifest's shapes, not written synthetically.
- **R-f. Erratum E1, the plants file.** The pilot scores with `tuning/pilot-2a/plants.json`
  (`fixtures/dev-plants.json` minus the evaluator's P01 and P02), not the spec's
  `fixtures/dev-plants.json`. Reason: `loadPlants` (`score.ts:202-209`) throws on a plant whose job
  has no indexed report, and the evaluator sits out. The filtered file changes no on-map plant or
  denominator. The close files this against the spec as an erratum.
- **R-g. Evidence.** No site-round evidence exists
  (`docs/internal/record/2026-09-23-docs-reset-baseline.md`, "Site-round evidence"). Task 7 returns
  a per-profile evidence inventory first and states that gap. The spec's evidence-note rule applies
  to that inventory.
- **R-h. Erratum E2, the CLI hold.** The spec's parenthetical names `DISABLE_AUTOUPDATER=1` as the
  hold. That setting does not hold a Homebrew install, and a settings `env` entry never reaches a
  fresh shell, so the plan drops it. The hold is F1's `uupd.timer` pause, held through the last
  judge batch and every scoring rerun. If Geoff declines F1, the spec's hold is dropped, not
  replaced: F1's fallback reruns batches after a drift but holds nothing, and E2 records that.
  The release comes after Task 5's scoring preconditions and the judge audit settle, since either
  can call for a rerun. The close files this against the spec as an erratum.
- **R-i. The flag.** Put to Geoff as F2.

## Budget and rhythm

**Token ceiling:** 15M, flag 12M (B4). **Counting rule:** input, output, and cache-creation tokens
count; cache reads are reported apart. At Task 0 the conductor records the pass's start instant
`T0` in the Ledger. Spend is, per session that works this pass,
`npx tsx scripts/docs-readers/session-ledger.ts --session <session id> --since <T0>` (run from the
`docs-reset-2a` worktree), summed across sessions with the runner ledger counted once (pass 1b's
method: subtract each extra session's runner figure). The conductor runs it at every checkpoint and
every task boundary from Task 0 on, and each reading feeds F2's projection.

**Budget:** about 12.65M (range 11.6M to 15.75M, the top of it over the 15M ceiling, which F2
rules; plus about 1.0M for each conditional chain that fires, the verifier-fix chain and the
judge-defect fix chain); see "Cost lines". Fix rounds are budgeted as the norm: every build task
in passes 1 and 1b drew at least one `fix`. **At the flag and at a projected ceiling breach** the
conductor finishes the running task and writes the Ledger with a projection to the close (F2
defines it), then follows F2's answer. A runner batch that is running when spend reaches the
ceiling finishes; no batch runs half.

**Checkpoints:** every segment boundary (at most four tasks apart), any split, the flag, and before
any question to Geoff. At each, the conductor writes the Ledger at the foot of this plan (task
states, decisions, counted spend, next task) and commits to `main` a replacement of the pass's one
live STATUS line, naming the Ledger's worktree path. It never adds a second line.

**Segments.**

| Segment | Tasks | Boundary |
| --- | --- | --- |
| 1 | 0 pre-flight, 1 report fields (1a), 2 smoke run | Gate-green commit carrying the smoke fixture. |
| 2 | 3 judge side (1b), 4 scorer (1c), 5 pilot | **Mandatory:** the pilot record committed, lane `docs-reset-2a-audiences` merged, the merged gate green. A fresh session may start here. |
| 3 | 7 audience record (4b), 8 audience review, 9 exemplar review, 10 owner stop 1 brief | Owner stop 1 (attended). |
| 4 | 11 close | PR opened. |

**Independent task:** Task 6 (4a, the audience format) shares no file with Tasks 1 to 5. It runs in
its own lane beside segments 1 and 2, starting after Task 0, and merges at segment 2's boundary. It
never overlaps a runner batch (see "Gates").

**Execution mode:** per-task Agent chains, fewer than six tasks per segment, the lane run as its own
Agent chain in its own worktree. Neither `pass-execute` workflow can run these tasks: both run
`scripts/checks/gate-tier.mjs`, which classifies `scripts/**` and `src/tests/**` into the scripts
tier and substitutes its browser `npm test`, and both prefix only `CAIRN_GATE_LANE=light`, never
the memory override this repository's `svelte-check` needs under the light lane (pass 1b planning
miss 2 and its R1 gate note). Do not run the `writing-plans` "which execution method" question.

**Branches:** cairn-cms `docs-reset-2a` in `.claude/worktrees/docs-reset-2a`, off `main` at the
commit carrying this plan. Lane `docs-reset-2a-audiences` in `.claude/worktrees/docs-reset-2a-audiences`,
off `docs-reset-2a`, carrying Task 6 only, merged by the conductor at segment 2's boundary. The
worktree e2e gotcha does not apply: no task runs the showcase e2e or touches `src/lib`. Dotfiles
edits (the registry erratum, `cairn-docs-drafter.md`) commit in `~/.dotfiles` on its `main`,
specific files only. **One-executor check** before every task: `pgrep -f` on the worktree path,
`git status` for changes this pass did not author (in the worktree, and in `~/.dotfiles` before a
dotfiles commit), and STATUS on `main` for a live session on this branch. In `~/.dotfiles` the known
baseline is tolerated by name: `claude/.claude/skills/spec-plan-review/SKILL.md` modified and
`claude/.claude/skills/synced/` untracked. Only a change to a file this pass commits
(`secrets/registry.md`, `claude/.claude/agents/cairn-docs-drafter.md`) stops the task. A live
executor stops the task.

**Models:** conductor `claude-opus-5-5` at `medium`. Implementers `cairn-implementer` on `sonnet` at
`high`; no task names an `opus` upshift, since every build task here is specified by the spec and
its fixtures. Per-task `diff-reviewer` on `claude-opus-5-5` at `high`. The audience record's
author, the pilot record's author, the judge auditor, every fold, and every review lens on
`claude-opus-5-5` at `high`. Mechanical agents (batch files, copies, packet builds, hash checks) on
`sonnet` at `medium`. A hedged verdict on a correctness point is re-run on `claude-opus-5-5` at
`xhigh`, then goes to one `fable` dispatch; this never applies to a judge ruling.

**Gates:** every gate here launches no browser. The reader chain gate (Tasks 1, 3, 4) is pass 1b's:

```
cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers && npm run check:comments && npm run check'
```

The light lane's 3G cap runs `svelte-check` out of memory, so the memory override is required. On
exit 75, re-issue the same command until it prints `gate exit:`; never poll a log. No gate runs
while a runner batch is running (the 6G cap beside another session's heavy gate and a batch nears
the machine's memory). The rule covers Task 6's lane too: its gate carries the same 6G override,
and the light lane's own lock serializes it against this pass's gates but not against a batch,
which is not a gate. The conductor enforces it at dispatch, since it cannot pause a chain
mid-gate: it starts no runner batch (the smoke run, Task 3's live check, any Task 5 batch) while
the lane's chain is in flight, and it dispatches no lane work, a fix round included, while a batch
runs. The lane starts right after Task 0, well before the first batch. Task 6's and the merged
gates are named in their tasks.

## Global constraints

- The spec's pass mark, per-class rule, pilot sample, and order are fixed. No task moves a bar, a
  denominator, a counting rule, or the sequence. A task that finds the spec unbuildable stops and
  reports.
- **Bans:** no prompt line, judge prompt, or rubric this pass writes names a development item
  (`scripts/docs-readers/fixtures/dev-items.json`). `ban-grep.ts` is the floor on every such text;
  the `diff-reviewer`, given the development-item list and the spec's quoted plant wordings (P05
  `AUTH_DB`, P06 `/style-guide`, P09 `section.ts`), is the check. The Task 1 and Task 3 dispatches
  say: field definitions only, no examples, in every new prompt line.
- **Judges** run only through the runner as judge classes over packets that `judge-packets.ts`
  builds. None is dispatched as an Agent. A judge defect found in the pilot is fixed by a
  `cairn-implementer` chain on the reader chain gate, logged in the Ledger with the misruling it
  fixes, and every pilot judge batch of that kind re-runs.
- The conductor has read the development set, so it never writes a prompt line, a rubric, or a job
  text; it dispatches the agent that does.
- No published doc arm (`docs/admin`, `docs/editors`, `docs/extend`, `docs/reference`,
  `docs/README.md`, `docs/why-cairn.md`) changes. **Facts container:** this pass changes no public
  behavior. Everything it writes sits under `scripts/`, `src/tests/`, `docs/internal/`, and
  `docs/superpowers/`, none of it in `package.json` `files`, so no bullet goes under
  `docs/internal/facts/`. A task that finds otherwise files the bullet and says so.
- Every new script carries TSDoc per the comment gate and a unit test under `src/tests/unit/`.
  New fixtures go under `scripts/docs-readers/fixtures/` (or the task's named fixture directory),
  never under `src/`. A committed fixture never embeds a worktree's absolute path; a test that needs
  one rewrites key traces at test time.
- **Execution rules from pass 1b's post-mortem** (spec, "Execution rules"): a fix round goes to the
  warm agent by `SendMessage` only while its prompt cache is warm (it returned within the last few
  minutes); after any gap, a fresh agent gets the finding list and the diff range. Runner batches
  run as background commands under `awake --`, and a fresh agent reads the result; `report.json`
  is copied before any `--resume`. A second `fix` is the conductor's call; a third stops the pass
  for Geoff.

## Review focus

Five failure modes no spec acceptance line tests, each with its test placed in the owning task:

1. **The pilot's scoring command throws or joins nothing.** `loadPlants` throws on the evaluator's
   plants (E1), and a key traced to a different path than the scored report joins nothing while
   `ok` stays true. Test: Task 4's rehearsal runs the literal scoring command and asserts the
   totals and empty `notes`; Task 5 builds and scores from one absolute path (R-a).
2. **Rounds 0 and 1 drift under the scorer change.** Test: Task 4's recorded regression command
   rescores round 1's committed inputs at the path the keys record and matches
   `tuning/round1/score.json`'s `byJob`, `onMapRecall`, and `onMapPlantRunRecall` field for field,
   with `notes` empty.
3. **A new-field quote escapes the verifier's page-read rule, or `reverify.ts` skips new fields.**
   Test: Task 1's acceptance cases for an unread page and for `reverify.ts` on a transcript fixture.
4. **The operator class stalls on a dead scratch site and scores as reader misses.** Test: Task 5's
   preconditions, `GET /healthz` on the scratch Worker and `CAIRN_SCRATCH_CF_TOKEN` present in
   `~/.local/secrets` (by name), before the operator batch.
5. **The rendered profile drifts between the synthetic fixture and the authored profiles.** Test:
   Task 7 renders every authored profile through `render-profile.ts` and checks the first against
   the fixture's section order.

## Pre-flight findings (2026-09-25, plan author; corrected by the review fold)

Verified against `main` at `3bc3647f`, rechecked by the fold at `2eb96b74`, and the workstation.

- **Report schema:** `REPORT_SCHEMA` is `scripts/docs-readers/lib/runner.ts:94-125`,
  `REPORT_REQUEST` `:128-137` (the wish slot is `:136`). The job report copies report fields at
  `runner.ts:194` and `:283`; both need the new fields. `readerReport`
  (`lib/transcript.ts:705-720`) requires every list and returns `undefined` for a report missing
  one; that is the in-repo schema check (the CLI enforces `REPORT_SCHEMA`). `loadSavedBatchReport`
  is `:786`, `toBlockedEntries` `:739`. `verifyReport` is `lib/verify.ts:192-250`; `diverged[]`'s
  handling (`:167`, `:239-246`, problems prefixed `diverged quote`) is the pattern for the new
  fields, including the unread-page check. `verifyQuoteAgainst` accepts a quote spanning forward up
  to five lines to its cited line (`:81-84`; `:85-91` is a separate one-line off-by-one fallback); `citesUnreadPage` excuses a page outside `docsSet` or
  a Grep-displayed line (`:143-145`).
- **Comment carries confirmed:** `runner.ts:731-734` and `lib/class-schema.ts:68-69` read as the
  spec says.
- **Judge side:** the field union is `judge-packets.ts:401-417`, the raw fields `:435-449`,
  `buildCatchFields` `:453-489`, the run's allow-listed fields `:159-162`, and the item spreads
  `:700` and `:783` (spans within about seven lines). The builder does not filter by verification.
  `buildAdjudicatorPacket` takes `absentList` and `excludedKeys` (`:672-686`). `itemCount` is
  `lib/score-assemble.ts:418`. Catch rulings are per plant (`{ itemId: <plant id>, ruling, reason }`,
  `lib/types.ts:316-320`); only the reason's free text names the catching item.
- **Scorer:** `DEVELOPMENT_BATCH_NAMES` lives in `lib/score-integrity.ts:16`. Development precision
  keeps only verified Opus control runs (`score.ts:400`), asserted at
  `docs-readers-score.test.ts:187`; that measure stays, and 1c's pooled block is additive.
  `PrecisionItem` (`lib/score-types.ts:66-70`) carries no field and `PrecisionRunRecord` (`:79-87`)
  one `itemCount`. `PlantCatchTally.runsCaught` is `boolean[]` with `caughtCount` beside it
  (`lib/score-catch.ts:53-63`); `onMapTallies` is `score.ts:391`. The scorer emits Clopper-Pearson
  only (`clopperPearson`, `lib/score-catch.ts:214`); no Wilson function exists. `runDev` returns
  `ok: true` past loading and turns every join problem into a `notes` entry.
- **Key traces:** every committed round 1 key records `report.path` as
  `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-1b/scripts/docs-readers/tuning/round1/reader-report.json`.
  That worktree exists at `598230b8` and its file is byte-identical to `main`'s copy. The review's
  probe: rescoring with `--report` at that path matches `score.json` (whose `notes` is `[]`); at
  any other path it yields 24 notes and 0 of 8.
- **Pilot inputs:** round 1's batch (`batches/round1.json`) uses job ids `<job>-planted-1` and
  `<job>-control-1`, each job entry carrying its own `absent` list; its prepared trees exist under
  `~/.cache/docs-readers/prepared/round1/`, and all eight planted-page sha256 values match their
  catch keys today. Round 1's harness filter excluded 1 to 3 items per control run
  (`tuning/round1/harness-filter-log.json`). Judge jobs take the id of the reader job whose packet
  they rule (`score.ts` header).
- **CLI:** the host `claude` is the Homebrew cask `claude-code@latest` at 2.1.282;
  `init-baseline.json` pins 2.1.280 to 2.1.282. `uupd.timer` (`OnCalendar` 04:00,
  `RandomizedDelaySec=15m`, `Persistent=true`) runs uupd's `brew` module (enabled). See F1.
- **Tooling:** `claude-tooling-sync verify` exits 0 today. `~/.dotfiles` is 13 commits ahead of
  `origin` and carries the known baseline named under "Branches". `secrets/registry.md`'s
  `CAIRN_SCRATCH_CF_TOKEN` entry says the token is deleted at pass 2a's close (CR7 moved that).
- **Task 6 surroundings:** `scripts/docs-audiences/` is outside the comment gate's globs
  (`eslint.config.js:34-41`) and `check-comments.sh`'s eslint path list. `gray-matter` and `yaml`
  are direct dependencies; `ajv` is not, so the schema check takes no new dependency.
- **Exemplar manifest:** six `##` sections (Editors, Operators, Designers, Extenders, Core,
  Evaluators), 68 capture directories (15, 11, 8, 12, 11, 11). Only three sections open with
  `Root:`; Designers says "Captures live under", Extenders "Base path:", Evaluators "Local root:".
  Slug forms on top-level entry lines (`- ` at column 0): `` Local path: `<slug>/` ``,
  `` Local paths: `<a>/` and `<b>/` `` (one entry, two captures: `substack-log-in/`,
  `substack-app-login-link/`), `` Local copy: `<slug>/` ``, a bare `` `<slug>/` `` after the URL,
  and `` `<dir>/<slug>/` `` (Designers, Core). Matching backticked slugs on top-level entry lines
  only resolves exactly 67 captures; the 68th, `editors/mozilla-kb-writing-guide/`, is a method
  source named in the Editors opening paragraph. Indented lines carry prose false positives
  (`tool/`, `templates/`). No line carries `Verdict` today.
- **Human reads:** the editor pages ship in the tarball and read on GitHub
  (`github.com/glw907/cairn-cms`, public); cairn.pub serves the evaluator's front door. The sheets
  are written (see Task 0).
- **Docs gates:** `docs/internal/` is outside the tarball and outside Vale's styles
  (`.vale.ini`), and `check:docs` walks it for dead links.
- **Ledgers:** STATUS is 62 lines, over the 60 cap. STATUS and ROADMAP already carry B4's 15M and
  12M. ROADMAP's pass 2a bullet still carries the designer theme-guide input and the scratch
  site's "Teardown for pass 2a's close" pointer.
- **Tools:** `cairn-run-gate` has no `--help` (it runs the argument as a gate); its header is the
  spec: per-call `CAIRN_GATE_MEMORY_*` values override the lane's caps.

### Task 0: Pre-flight (conductor-run; 0.2M)

**Outcome.**
1. The one-executor check, then the worktree `docs-reset-2a` and lane `docs-reset-2a-audiences`
   created, `npm ci` run in each, and `T0` recorded.
2. The `docs-reset-1b` worktree confirmed: `cmp` of its `scripts/docs-readers/tuning/round1/reader-report.json`
   against the `docs-reset-2a` worktree's copy exits 0. If the worktree is gone, it is recreated at
   the same path from `1e4a7c31` (detached), and the `cmp` rerun. It stays until the close.
3. One `sonnet` agent at `medium` lists every checkable claim in Tasks 1 to 7 (paths, line numbers,
   function names, current behaviors) and checks each against the worktree, returning the ones
   that fail and every open choice a task leaves its implementer. The conductor amends the plan and
   pins each open choice in the dispatch.
4. The owed errata: the scratch-site record's heading "Teardown for pass 2a's close" and its first
   line name the close of the last drafting pass that runs `docs-and-binary` readers (CR7);
   `~/.dotfiles/secrets/registry.md`'s `CAIRN_SCRATCH_CF_TOKEN` rotation line says the same,
   committed by path; `claude-tooling-sync verify` run and its exit recorded.
5. The human-read sheets (`docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md`,
   written by the plan-review fold) confirmed sent to Geoff with the plan-approval message, and
   the send recorded in the Ledger. Nothing is written here.

**Files.** `docs/internal/record/2026-09-23-scratch-site.md`, the Ledger;
`~/.dotfiles/secrets/registry.md`.

**Acceptance.** The pre-flight report is attached to the Ledger, each failed claim amended or
recorded as moot. The `cmp` exits 0. `claude --version` prints a pinned version (2.1.280 to
2.1.282), or the conductor re-pins with `--probe-init` before Task 2. `claude-tooling-sync verify`
exits 0. `npm run check:docs` passes after the record edit. Reviewer: none (docs only); the
conductor reads the agents' reports.

### Task 1: Report fields (1a; 2 deliverables; 1.3M)

**Outcome.** The spec's §1 "Shapes" and 1a:
1. `wrong[]` `{ quote, pageSays, actual, evidence }` and `missing[]` `{ quote, needed, evidence }`
   through `REPORT_SCHEMA` (both in `required`), `REPORT_REQUEST` (both fields explained in neutral
   terms, filed even when the reader worked around the gap, and `ruleCandidates` narrowed to wishes
   the job did not need), `readerReport` (both required, each entry's fields checked, as
   `diverged[]` is), the job-report copies at `runner.ts:194` and `:283`, `loadSavedBatchReport`
   (both optional on read, defaulting to `[]`), `lib/types.ts`, and `verifyReport` (every new-field
   quote verified by the existing rule, including the unread-page check).
2. The three comment-only carries the spec lists.

**Interfaces.** Produces the report shape every later stage reads:
`ReaderReport.wrong: WrongEntry[]`, `ReaderReport.missing: MissingEntry[]`, with `quote` in the
existing `QUOTE_SCHEMA` shape and no `blockedBy`; `VerifiedReport` gains verified `wrong` and
`missing` quote lists beside `diverged`. Verification problems for the new fields start with
`wrong quote ` and `missing quote ` (as `diverged[]`'s start with `diverged quote `), so Task 5
can tell a new-field failure apart. `reverify.ts` over a pre-2a transcript reports no structured
report, as it already does for a pre-`diverged` transcript; that is accepted on record, since
saved reports (not transcripts) are what rounds 0 and 1 rescore from.

**Files.** `scripts/docs-readers/lib/runner.ts`, `lib/transcript.ts`, `lib/verify.ts`,
`lib/types.ts`, `lib/class-schema.ts` (comment), the development catch test (note), their tests.

**Acceptance.** The spec's 1a lines, plus:
- A `missing[]` entry whose quote cites a page in `docsSet` that the transcript never shows read,
  with no Grep hit on it, fails verification with a `missing quote` problem.
- `reverify.ts` over a transcript fixture carrying a single-line `wrong[]` quote cited two lines
  before its real line reports the run unverified with a `wrong quote` problem naming it.
- `readerReport` returns `undefined` for structured output missing `wrong`, and for a `wrong` entry
  missing `pageSays`; `REPORT_SCHEMA.required` contains both fields; `pass1-trimmed.json` still
  loads with both read as `[]`.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`, given the development-item list and
the spec's quoted plant wordings.

### Task 2: The smoke run (conductor-run; 0.2M)

**Outcome.** One unscored control run on the new prompt, whose report becomes the pinned fixture
for every cross-stage shape (spec §2, "Preconditions").
1. A `sonnet` agent at `medium` writes `batches/pilot-2a-smoke.json` (batch name `pilot-2a-smoke`,
   one job `scripter-control-1` copied from `batches/round1.json`, the round 1 control tree; the
   scripter filed the most items in round 1) and `scripts/docs-readers/tuning/pilot-2a/plants.json`
   (E1), with the source's sha256 in the Ledger.
2. The conductor runs F1's status step and pause (or, if F1 was declined, the version check), then
   runs the batch as a background command:
   `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && awake -- npx tsx scripts/docs-readers/run.ts scripts/docs-readers/batches/pilot-2a-smoke.json --out ~/.cache/docs-readers/results/pilot-2a-smoke`.
3. A fresh `sonnet` agent at `medium` reads the result, confirms init and verification, confirms the
   raw report carries `wrong` and `missing` keys (R-b), and only then writes
   `scripts/docs-readers/fixtures/saved-reports/smoke-2a.json` (a trimmed copy). If the run filed
   no `wrong[]` or `missing[]` entry, it adds one of each in the real entry shape, and the Ledger
   and the consuming test's comment name them as synthetic.

**Interfaces.** Produces `fixtures/saved-reports/smoke-2a.json` (consumed by Tasks 3 and 4) and
`tuning/pilot-2a/plants.json` (consumed by Tasks 4 and 5).

**Acceptance.** The raw report carries `wrong` and `missing` keys; a report without them means the
run used the old code, and it is rerun from the worktree, never patched. The run verifies with its
init matching a pinned baseline, or it is rerun as infrastructure. The fixture parses through
`loadSavedBatchReport`, and its saved job's recorded `verified.ok` is `true` ("verifies" means that
recorded flag; any synthetic entry is excluded from the claim). The segment 1 boundary commit's
reader chain gate is green.

### Task 3: Judge side (1b; 2 deliverables; 1.3M)

**Outcome.** The spec's 1b deliverables: both fields through the three packet builders, the field
union, the raw-field allow-list, and `itemCount`; and the field rule in `catch-judge.md`,
`adjudicator.md`, and `agreement.md`.

**Interfaces.** Consumes `smoke-2a.json`. Produces packet items with
`field: 'stalls' | 'assumed' | 'diverged' | 'checks' | 'wrong' | 'missing'`, keys whose items
carry that field name, and `itemCount` summing all six lists.

**Files.** `scripts/docs-readers/judge-packets.ts`, `lib/score-assemble.ts`, `lib/types.ts` (only
if the item field type lives there), `prompts/catch-judge.md`, `prompts/adjudicator.md`,
`prompts/agreement.md`, their tests, `batches/pilot-2a-live-adjudicator.json`,
`fixtures/pilot-2a-judge/`.

**Acceptance.** The spec's 1b lines, plus:
- An adjudicator packet built from `smoke-2a.json` carries its `wrong[]` and `missing[]` items
  under their field names and no `ruleCandidates[]` entry.
- `ban-grep.ts` passes all three edited prompts.
- Live check, run once after the gate is green: a `sonnet` agent at `medium` builds the smoke run's
  adjudicator packet through R-c's filter step and writes `batches/pilot-2a-live-adjudicator.json`
  (one job, `scripter-control-1`). The conductor checks `claude --version`, then runs it from the
  worktree under `awake --`; every item is ruled. Its key and rulings are committed as
  `scripts/docs-readers/fixtures/pilot-2a-judge/`. Before the commit, every absolute path in the
  key (`report.path` and each `inputs` key, which round 1's keys show are absolute) is rewritten
  repository-relative; no scorer path reads `inputs` (only `run.ts` and `judge-packets.ts` write
  it). Any test that joins the key rewrites `report.path` to the fixture report's absolute path at
  test time.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`, given the development-item list and
the spec's quoted plant wordings.

### Task 4: Scorer (1c; 2 deliverables; 1.3M)

**Outcome.** The spec's 1c deliverables: (1) the five pilot batch names and `--control-ids`; (2) the
output additions below.

**Interfaces.** Consumes `smoke-2a.json`, the Task 3 judge fixture, and `tuning/pilot-2a/plants.json`.
- Development mode accepts the batch names `pilot-2a-operator`, `pilot-2a-designer`,
  `pilot-2a-extender`, `pilot-2a-core-developer`, and `pilot-2a-scripter` (explicit names in
  `DEVELOPMENT_BATCH_NAMES`), and refuses `pilot-2a-smoke`.
- `--control-ids ID,ID,...`: absent means `pooledPrecision` is omitted (round 1's rescore passes
  none). An empty value, a duplicate id, an id absent from the reports, or an id whose role parses
  as other than `control` is refused, naming the id. When any report carries a `pilot-2a-*` batch
  name, a `control` job that is not listed is refused.
- `PrecisionItem.field` (the source field, set in `joinAdjudications` from the adjudicator key's
  `items[itemId].field`) and `PrecisionRunRecord.newFieldItemCount` (the run's `wrong` plus
  `missing` lengths, set in `buildPrecisionRunRecords`) feed the split. A false subject group is
  new-field when any of its items has `field` `wrong` or `missing`; an unverified run adds
  `itemCount` to `falseFindings` and `newFieldItemCount` to `newFieldFalseFindings`.
- Output adds `plantTallies: [{ plantId, job, runsCaught: boolean[] }]`, computed from
  `onMapTallies` only (exactly the 8 on-map plants in the pilot), `runsCaught` being the existing
  per-run outcomes in run order; "caught at least once" is `runsCaught.some(Boolean)`, never the
  array's truthiness. Output adds
  `pooledPrecision: { controlRunIds, falseFindings, newFieldFalseFindings, otherFalseFindings, perRun: [{ runId, verified, falseFindings, newFieldFalseFindings }] }`
  and `onMapPlantRunWilson: { lower, upper }` from an exported `wilsonInterval(k, n)` (z = 1.96)
  beside `clopperPearson` in `lib/score-catch.ts`. Task 5 reads these names.
- **The pilot scoring command**, written once here and cited by Task 5 and the rehearsal. `P` is
  the directory holding the five `<job>/reader-report.json` copies, both judge reports, and both
  key directories; `OUT` is the output file:

```
cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && W=$PWD/scripts/docs-readers && JOBS="operator designer extender core-developer scripter" && npx tsx $W/score.ts dev \
  $(for j in $JOBS; do printf -- '--report %s ' "$P/$j/reader-report.json"; done) \
  --catch-rulings $P/pilot-2a-catch-report.json --adjudicator-rulings $P/pilot-2a-adjudicator-report.json \
  $(for f in $P/catch-keys/*-key.json; do printf -- '--catch-key %s ' "$f"; done) \
  $(for f in $P/adjudicator-keys/*-key.json; do printf -- '--adjudicator-key %s ' "$f"; done) \
  --plants $W/tuning/pilot-2a/plants.json \
  $(for j in $JOBS; do printf -- '--map %s=%s ' "$j" "$W/tuning/round0/maps/$j.json"; done) \
  --control-ids operator-control-1,designer-control-1,extender-control-1,core-developer-control-1,scripter-control-1 \
  --out $OUT
```

**Files.** `scripts/docs-readers/score.ts`, `lib/score-integrity.ts`, `lib/score-precision.ts`,
`lib/score-types.ts`, `lib/score-assemble.ts`, `lib/score-catch.ts`, their tests, fixtures.

**Acceptance.** The spec's 1c lines, plus:
- `pilot-2a-smoke` refuses in development mode; one test per `--control-ids` state above.
- `wilsonInterval(12, 16)` gives 0.505 to 0.898 and `wilsonInterval(11, 16)` 0.444 to 0.858, to
  three places.
- A fixture with one off-map plant caught shows no `plantTallies` entry for it; a plant with
  `runsCaught` `[false, false]` counts as not caught.
- A fixture unverified control run with three items, one from `wrong[]`, adds three to
  `falseFindings` and one to `newFieldFalseFindings`; a verified run's false group holding a
  `missing[]` item counts as new-field.
- **Round 1 regression (a recorded command, not a unit test):** `score.ts dev` over round 1's
  committed inputs, with `--report` set to the `docs-reset-1b` worktree's
  `tuning/round1/reader-report.json` (R-a), round 1's six catch and six adjudicator keys and both
  judge reports, `fixtures/dev-plants.json`, the six `tuning/round0/maps/`, and no `--control-ids`,
  writing to the scratchpad. Its `byJob`, `onMapRecall`, and `onMapPlantRunRecall` match
  `tuning/round1/score.json` field for field, and `notes` is `[]`. The implementer's report carries
  the command and the comparison. `keyTraceMatches` is unchanged.
- **Rehearsal (a recorded command):** the pilot scoring command with `P` at a scratch directory
  holding five fixture reports named `pilot-2a-<job>` built from `smoke-2a.json`'s shape (two
  planted runs and one control run per job), synthetic catch keys and rulings for the ten planted
  runs whose traces match those reports' paths, `runId`, and `attempt`, five synthetic adjudicator
  keys (one per control run, each built from the Task 3 fixture key with `report.path`, `jobId`
  `<job>-control-1`, `runId`, and `attempt` rewritten to match its fixture report, and `items`
  matching that run's report), an adjudicator rulings report with a ruling for every item of all
  five control jobs, and `OUT` in the scratchpad. Without all five, `buildPrecisionRunRecords`
  notes a control run with no key and rulings joined, and `notes` is not empty. It asserts `ok: true`,
  `notes: []`, `onMapPlantRunRecall.total` 16, per-job `onMapPlantCount` 2, 2, 2, 1, 1,
  `pooledPrecision.controlRunIds.length` 5, and a nonzero caught count.
- A catch key copied from a round 1 key with one item moved into `wrong[]` loads and joins, and
  with a `caught` ruling whose reason cites that item, the plant's `plantTallies` entry holds
  `true` in `runsCaught` for that run (spec 1c: a catch through a new-field item shows in its
  plant's `runsCaught`). A catch ruling is per plant, so the field never changes the outcome.
- `git diff --name-only` shows no path under `tuning/round0/` or `tuning/round1/`.

**Gate:** the reader chain gate. **Reviewer:** `diff-reviewer`.

### Task 5: The pilot (conductor-run; 1.45M)

**Outcome.** The spec's §2, run in this order. Every command starts with
`cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a &&`. `P` below is
`<worktree>/scripts/docs-readers/tuning/pilot-2a`, as an absolute path.
1. **Preconditions.** A `sonnet` agent at `medium` writes the five batch files
   `batches/pilot-2a-<job>.json`, each copying its round 1 planted job twice (`<job>-planted-1`,
   `<job>-planted-2`) and its control job once (`<job>-control-1`) with each job's `absent` list,
   all `claude-opus-5-5`, and checks each planted page's sha256 against its round 1 catch key's
   `inputs`. The conductor confirms the hold (F1) and that the scratch Worker's `GET /healthz`
   returns `ok: true` and `CAIRN_SCRATCH_CF_TOKEN` is present in `~/.local/secrets` (by name).
2. **Readers.** Five background batches under `awake --`, one at a time, each to
   `~/.cache/docs-readers/results/pilot-2a-<job>`, each preceded by `claude --version`. A crash
   costs one job's batch.
3. **Packets.** A fresh `sonnet` agent at `medium` copies each `report.json` to
   `$P/<job>/reader-report.json` and builds every packet from that absolute path (R-a): a catch
   packet for every planted run and, after R-c's filter step, an adjudicator packet for every
   control run, verified or not, under `~/.cache/docs-readers/packets/pilot-2a/`, keys copied to
   `$P/catch-keys/` and `$P/adjudicator-keys/`, the filter log to `$P/harness-filter-log.json`. It
   writes `batches/pilot-2a-catch.json` (10 jobs) and `batches/pilot-2a-adjudicator.json`
   (5 jobs), and returns each unverified run's `verified.problems`, grouped by prefix.
4. **Judges.** The conductor runs both batches in the background, each preceded by
   `claude --version`. A fresh agent copies both reports to `$P/pilot-2a-catch-report.json` and
   `$P/pilot-2a-adjudicator-report.json`.
5. **Scoring.** A fresh `sonnet` agent at `medium` runs Task 4's pilot scoring command with `P` as
   above and `OUT=$P/score.json`. It checks, before returning figures: `notes` is `[]`;
   `onMapPlantRunRecall.total` is 16; per-job `onMapPlantCount` is 2, 2, 2, 1, 1;
   `pooledPrecision.controlRunIds` lists five runs; the filter log covers all five control runs.
   It returns the figures, never a verdict. A trace note means rebuilding keys, not rerunning a
   judge (R-a).
6. **Judge audit (R-d).** One cold `claude-opus-5-5` agent at `high` reads every catch ruling and
   all five adjudications against their packets, keys, and the plant criteria, and returns
   misrulings with evidence. It also reports, for each caught plant-run, the item id the ruling's
   reason cites and that item's field through the catch key, or "unmapped"; this is the record's
   "field that carried each catch", a reported, unscored annotation labeled as the audit's reading.
   A misruling is a judge defect: fixed, the batches of that kind rerun (under the hold), and step 5
   rerun.
7. **CLI release.** Once step 5's checks hold and step 6's findings are settled, the conductor
   resumes `uupd.timer` (F1) and records the instant.
8. **Record.** A `claude-opus-5-5` author at `high` writes
   `docs/internal/record/2026-09-25-docs-reset-2a-pilot.md` with every item the spec's "Record"
   lists (both intervals from `score.json`, the field annotation from step 6, each run's CLI
   version, and the absolute key paths the pilot's keys carry), the spec's "Labels" on every figure,
   the verdict under the pre-registered mark, and the gating-class list.

**Interfaces.** Consumes Task 4's command and output names. Produces the gating-class list in the
record, which the first drafting pass's chain build reads (§3).

**Acceptance.**
- Every precondition holds or its rerun is recorded; a failed precondition reruns the missing
  reader or judge job (or rebuilds keys, for a trace note), never yields a verdict. An init-only
  failure is re-pinned and rerun.
- The verifier-check branch in §2 ("Runs and verification") is applied when its trigger holds,
  judged from step 3's problem prefixes: a verifier defect goes to a fresh `cairn-implementer`
  chain on the reader chain gate, then `reverify.ts`; the substituted report's keys are rebuilt
  against its path, and the record names which report it scored.
- `git diff --name-only` for this task shows no path under `tuning/round0/` or `tuning/round1/`.
- A `diff-reviewer` read checks every figure in the record against `$P/score.json`.
- **The fork:** on a pooled go, the pass continues. On a no-go, the conductor sends Geoff the
  spec's short report (attended) and continues with every class advisory unless he redirects.
- Segment 2 boundary: lane `docs-reset-2a-audiences` merged, then the merged gate green:
  `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-readers src/tests/unit/docs-audiences && npm run check:comments && npm run check'`.
  The Ledger, and STATUS's live line with a resume prompt for a fresh session.

### Task 6: The audience format (4a; lane; 2 deliverables; 1.0M)

**Outcome.** The spec's 4a deliverables, on a synthetic fixture profile under
`scripts/docs-audiences/fixtures/`, never in `docs/internal/audiences/`.
1. `docs/internal/audiences/profile.schema.json` and `src/tests/unit/docs-audiences-schema.test.ts`,
   which checks the synthetic fixture and every `docs/internal/audiences/*.md` except `README.md`
   (none exist yet) against the schema, with no new dependency. The test reads `required`,
   `properties`, and `additionalProperties: false` from the schema file, never a hand copy.
2. `scripts/docs-audiences/render-profile.ts <profile>` and
   `src/tests/unit/docs-audiences-render.test.ts`, with `scripts/docs-audiences/` added to the
   comment gate (`eslint.config.js` `COMMENT_GLOBS` and `check-comments.sh`).

**Interfaces.** Pins the frontmatter keys Task 7 writes: `id` (the file's basename), `persona`
(one sentence), `vocabulary` (`use` and `avoid` lists), `ceiling` (the knowledge and tool
ceiling, stated positively), `arrivalStates` (list), `success` (the success criterion),
`exemplars` (list of `<dir>/<slug>` ids), `provisional` (boolean), and `provisionalReason`
(required exactly when `provisional` is true). The six profile ids are `evaluator`, `editor`,
`site-operator`, `site-designer`, `admin-extender`, and `core-developer`.

**Exemplar-id resolution (R-e).** The test takes the manifest path. A manifest section is a
`## <Heading>`, mapped to `<dir>` by this table:

| Heading | `<dir>` |
| --- | --- |
| Editors | `editors` |
| Operators | `operators` |
| Designers | `designers` |
| Extenders | `extenders` |
| Core | `core` |
| Evaluators | `evaluators` |

**The verdict line form, pinned here and written by Task 9.** Every verdict line is exactly
`` - **Verdict (`<slug>/`):** kept `` or `` - **Verdict (`<slug>/`):** rejected (<reason>) ``,
indented two spaces, with the bare slug (never `<dir>/<slug>/`) and the bold marks as shown.

An id `<dir>/<slug>` resolves when both hold:
1. A top-level entry line (starting `- ` at column 0) in that section holds a backticked
   `` `<slug>/` `` or `` `<dir>/<slug>/` ``, in any of the forms the pre-flight lists. A line
   containing `**Verdict (` is never an entry line, whatever its indentation, so a verdict line
   never makes an id resolve.
2. No line in the section contains the literal `` **Verdict (`<slug>/`):** rejected ``.

The section's opening line is not read, so its wording does not matter. This excludes the method
source (named only in an opening paragraph, and its verdict line skipped by rule 1) and indented
prose. The method source `editors/mozilla-kb-writing-guide` never resolves.

The rendered `profile` string is plain text: a first line naming the profile id and persona, then
one labeled block per key in the schema's key order, lists as hyphen bullets, exemplar ids as ids
only (the chain carries exemplar pages separately).

**Files.** The schema, the two tests, `scripts/docs-audiences/render-profile.ts`, its fixtures (a
fixture profile and a fixture manifest), `eslint.config.js`, `scripts/checks/check-comments.sh`.

**Acceptance.** The spec's 4a line, plus:
- The fixture manifest is cut from the real manifest's lines: all four opening-line variants
  (`Root:`, "Captures live under", "Base path:", "Local root:"), every slug form (including the
  two-slug `Local paths:` entry and `<dir>/<slug>/`), the method-source paragraph, an indented
  prose `` `tool/` ``, and verdict lines in the pinned form copied byte for byte: one
  `` - **Verdict (`<slug>/`):** rejected (<reason>) `` and one `` - **Verdict (`<slug>/`):** kept ``,
  both indented two spaces under their entries, plus the method source's
  `` - **Verdict (`mozilla-kb-writing-guide/`):** kept `` at column 0.
- Cases: a missing key, an extra key, missing frontmatter, and broken YAML each fail naming the
  file; `provisional: true` with no `provisionalReason` fails; a method-source id, an indented-prose
  id, and a rejected id (its line in the exact pinned form, bold marks included) each fail; the
  method source still fails with its column-0 verdict line present; an id whose verdict line says
  `kept` resolves; each slug form resolves.
- The real `docs/internal/record/docs-exemplars.md` resolves one known id per directory.
- `npm run check:comments` lints `scripts/docs-audiences/`.

**Gate:** `cd /var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-2a-audiences && CAIRN_GATE_LANE=light CAIRN_GATE_MEMORY_MAX=6G CAIRN_GATE_MEMORY_HIGH=5G cairn-run-gate 'npx vitest run --project unit src/tests/unit/docs-audiences && npm run check:comments && npm run check'`.
**Reviewer:** `diff-reviewer`.

### Task 7: The audience record (4b; conductor-run; 1.5M)

**Outcome.** The spec's 4b.
1. A `sonnet` agent at `medium` pre-extracts the inputs into a scratch directory: the parent spec's
   rulings and its pass 2a amendment, `docs/internal/what-cairn-is-and-is-not.md`, the shipped
   guidance layer (`claude/`, `skills/`), the earlier
   `docs/internal/record/2026-08-14-audience-profiles.md`, and the exemplar manifest. It returns,
   first, a per-profile evidence inventory (for each of the six: what evidence exists, and where),
   and states that no site-round evidence exists, citing the baseline record's "Site-round
   evidence" section (R-g).
2. A `claude-opus-5-5` author at `high` writes the six profiles and `README.md` under
   `docs/internal/audiences/` to Task 6's keys and ids, applying the spec's evidence-note rule
   against the inventory; the README states the site-round gap. It updates
   `~/.dotfiles/claude/.claude/agents/cairn-docs-drafter.md` to name the format and how the
   rendered profile reaches its prompt (the chain's `profile` argument, one invocation per
   profile).
3. The step 2 author adds an assertion to the schema test that exactly the six pinned profile ids
   exist.

**Files.** `docs/internal/audiences/*.md`, `src/tests/unit/docs-audiences-schema.test.ts` (the
id assertion), the drafter agent file in dotfiles.

**Acceptance.** The spec's 4b line, plus: every profile renders through `render-profile.ts`, and
the first authored profile's output keeps the fixture's section order (Review focus 5); every
exemplar id's capture directory exists under `~/.local/share/cairn/exemplars/` (a local check,
listed in the report); the evidence inventory is attached to the report; `npm run check:docs`
passes. **Gate:** Task 6's gate string run in the `docs-reset-2a` worktree. **Reviewer:**
`diff-reviewer` against the spec's §4 and the charter.

### Task 8: The audience review (conductor-run; 2.0M)

**Outcome.** The spec's §5.
1. Four cold `claude-opus-5-5` lenses at `high` (`general-purpose`, web-capable), run in parallel,
   each writing `docs/superpowers/research/2026-09-25-docs-reset-2a-audience-review-<lens>.md`
   (`users`, `boundaries`, `agents`, `open`), each finding with quoted evidence, a testability
   ruling per profile, and a proposed fix. Every lens reads the six profiles, the README, and the
   raw sources, never Task 7's scratch extraction. `users` also reads comparable CMSs' public
   evidence (web); `boundaries` the charter and the hat map; `agents` the shipped guidance layer;
   `open` peer docs' audience divisions (web).
2. The human reads' stall logs, as they arrive, copied verbatim under "Logs" in
   `docs/superpowers/research/2026-09-25-docs-reset-2a-human-reads.md` in the worktree by a
   `sonnet` agent at `medium`, so the conductor never reads a log. A log reaches the pass one of
   two ways: Geoff saves it in the main checkout at
   `/var/home/glw907/Projects/cairn-cms/docs/superpowers/research/human-reads-2a/sheet-1-editor.md`
   or `/var/home/glw907/Projects/cairn-cms/docs/superpowers/research/human-reads-2a/sheet-2-evaluator.md`
   (untracked), or he pastes it into the session running the pass, and the conductor saves it
   verbatim at the matching path without acting on it. The conductor dispatches the copier at this
   step and again before Task 10; the copier checks both paths and returns only which logs it
   recorded.
3. One fold by `claude-opus-5-5` at `high`: the profiles revised and
   `docs/superpowers/research/2026-09-25-docs-reset-2a-audience-fold.md` written.

**Acceptance.** The spec's §5 line. Each human read is recorded or listed open (an open read does
not hold the fold; a read that arrives after the fold is routed to pass 2b as an input). The schema
test passes after the fold. **Gate:** Task 7's. **Reviewer:** one `diff-reviewer` read of the fold
against the four reviews.

### Task 9: The exemplar review (conductor-run; 0.8M)

**Outcome.** The spec's §6 review and fold. Three cold `claude-opus-5-5` lenses at `high`, split by
audience (editors and evaluators; operators and core; designers and extenders), each reading every
capture's `page.md` and `meta.json` in its two directories (about 75k tokens of page text each,
never `page.html`) against the manifest entry and the matching profile, write one shared review,
`docs/superpowers/research/2026-09-25-docs-reset-2a-exemplar-review.md`, one section per lens. One
fold marks the manifest: each of the 68 captures gains one verdict line under its entry, in the
form Task 6 pins (indented two spaces, bare slug, bold marks as shown):
`` - **Verdict (`<slug>/`):** kept `` or `` - **Verdict (`<slug>/`):** rejected (<reason>) ``. The
two-slug Substack entry carries two lines; the method source `mozilla-kb-writing-guide/` carries
its line, indented the same way, under the Editors opening paragraph. Nothing is deleted from the
store.

**Acceptance.** The spec's §6 line for this pass; a count check shows 68 capture directories and
68 verdict lines, and the set of slugs in verdict lines equals the directory listing; the schema
test passes, and a profile citing a rejected capture fails it (the fold then revises that profile's
list); a grep for lines containing `**Verdict (` that do not match the pinned form exactly returns
nothing. The gap fills are pass 2b's. **Gate:** Task 7's. **Reviewer:** `diff-reviewer`.

**Deferral (F2(a) only; erratum E4).** When the projection first breaches 15M before this task
starts, it defers whole to pass 2b: no lens runs here, Task 10's brief names the deferral, and
Task 11 files the exemplar review under pass 2b beside the gap fills. Once a lens has started, the
task is not deferred.

### Task 10: Owner stop 1 (conductor-run; 0.2M; attended)

**Outcome.** A `claude-opus-5-5` author at `high` writes the one-page brief the spec's §7 names, at
`docs/superpowers/research/2026-09-25-docs-reset-2a-owner-stop-1.md`, and the conductor puts it to
Geoff with the Ledger current. Geoff's rulings go in the Ledger. An edit he asks for to the record
or the manifest goes to one `claude-opus-5-5` fold dispatch before the close; a larger change is
filed to pass 2b.

**Acceptance.** The brief fits one page and names every unresolved lens finding, each human read's
outcome or open state (an open read listed as routed to pass 2b), how many profiles are
provisional and why, and Task 9's deferral if F2(a) triggered it.

### Task 11: Close (conductor-run; one fold agent; 0.6M)

**Outcome.** One fold agent (`claude-opus-5-5`, `high`) commits its draft, then folds; one
independent `diff-reviewer` read over the fold's diff.
- The post-mortem at the foot of this plan: built and verified, decisions, planning misses and
  execution sittings, and both budgets scored (tokens against the 15M ceiling from
  `session-ledger.ts`; attended time as those two counts).
- `docs/HISTORY.md`: the pass 2a entry, plus STATUS's history-shaped lines moved there. The entry
  records that committed judge keys trace to a worktree's absolute path, so a later rescore on
  `main` rewrites the traces or scores at that path.
- `docs/STATUS.md`: present tense, 60 lines or fewer, naming pass 2b with its resume prompt.
- `ROADMAP.md`: pass 2a marked done and out of the live tier; the chain build (§3, with CR9, its
  precondition, and the pilot's gating-class list), the designer theme-guide input, the parent's
  three trial pages, and pass 1b's rule that measuring jobs stay disjoint from the chain's
  reader-stage jobs, all under the first drafting pass's entry; the exemplar gap fills, the exemplar review if
  F2(a) deferred it, and any human read still open under pass 2b; the scratch-site line pointing at the renamed teardown
  section (CR7).
- Errata E1 to E4 filed against the spec, E4 only if F2(a) deferred Task 9 (a dated "Errata"
  note appended to the spec, the only spec edit this pass makes).
- Once the Logs section carries them verbatim, the untracked raw logs under
  `docs/superpowers/research/human-reads-2a/` in the main checkout are removed.
- The conductor runs the scratch site's dry-run listing (the record's teardown section, step 1) as
  a health check, deleting nothing, and records the result; confirms `uupd.timer` is active again;
  updates the `docs-reset-initiative` memory; opens the PR.

**Acceptance.** Gates: `npm run check:docs && npm run check:arm-indexes`, and the reader chain
gate if any code changed after the last green commit. The PR merges only on Geoff's word.

## Unattended execution

After approval, the pass runs unattended except at the attended points: the no-go report (Task 5,
only on a no-go), the two human reads (Geoff arranges the club-site editor; the sheets go with the
approval), and owner stop 1 (Task 10). Every other decision is the conductor's.

**At each session start:** read this plan and the spec; run the one-executor check; confirm
`systemd-inhibit --list` shows `claude-awake`; hold the lid switch
(`systemd-inhibit --what=handle-lid-switch --who=docs-reset-2a sleep 28800` in the background);
while the F1 window is open, confirm `systemctl is-active uupd.timer` prints `inactive` (after a
reboot, stop it again and check `claude --version` before anything else); arm a self-paced wake-up
as the fallback on every wait.

**Stop and ask Geoff** (write the Ledger and STATUS first, one combined question): the 12M flag
(only under F2(b)); under F2(a), a projection that still breaches 15M after Task 9's deferral, or
once Task 9 has started; the ceiling itself; a third `fix` on any task; a task that finds the spec
unbuildable; a correctness point still hedged after an `xhigh` read and one `fable` dispatch; a CLI
version drift inside the F1 window from the first pilot reader batch on (under F1's fallback, the
conductor re-pins and reruns the stage's earlier batches instead).

**Never:** merge the PR; push to `main` anything but the STATUS line; move a bar, a denominator, or
a counting rule; loosen `keyTraceMatches`.

**Battery.** On battery at 11 percent: stop the agents, WIP-commit on the branch, write STATUS
with the exact resume prompt.

## Cost lines

Re-examined against pass 1b's unit costs (reader run about 35k, catch judge about 3k, adjudication
about 15k, agent startup 25k to 60k, build task 0.96M to 3.82M).

| Task | Row (spec "Budget") | Estimate | Change from the draft |
| --- | --- | --- | --- |
| 0 | Conductor and close | 0.2M | Sheets written at the fold; 1b worktree check added. |
| 1 | 1a | 1.3M | |
| 2 | The pilot (smoke run) | 0.2M | Key check and fixture marking (+0.05M). |
| 3 | 1b | 1.3M | |
| 4 | 1c | 1.3M | Precision split across two more files, Wilson, flag states, keyed rehearsal (+0.3M). |
| 5 | The pilot (runs, packets, judges, audit, record) | 1.45M | 15 runs about 0.65M with reruns, about eight dispatches about 0.4M, audit 0.15M, record and read 0.25M (+0.4M). |
| 6 | The audience format (4a) | 1.0M | |
| 7 | The audience record (4b) | 1.5M | |
| 8 | The audience review and fold | 2.0M | |
| 9 | The exemplar review and fold | 0.8M | Three lenses by audience (+0.1M). |
| 10 | Owner stop 1 brief | 0.2M | |
| 11 | Conductor and close (the close) | 0.6M | |
| conductor | Conductor and close (dispatch and reads across segments) | 0.8M | |
| **Total** | | **12.65M** | +0.85M; above the 12M flag (F2), under the 15M ceiling. |

**Range:** 11.6M with the four build tasks at 1b's floor (0.96M each), 15.75M at 1b's mean (2.0M
each), which is over the 15M ceiling with no conditional chain firing; F2 rules what gives.
**Conditional:** the verifier-fix chain (Task 5 acceptance) and a judge-defect fix chain (step 6)
each cost about 1.0M (1b's floor) plus the reruns, and fire only on their triggers. Deferring
Task 9 under F2(a) saves its 0.8M, which brings the mean case to about 14.95M; the mean case with a
conditional chain still breaches after the deferral, which stops the pass for Geoff.

## Ledger

| Task | State | Commit | Spend | Notes |
| --- | --- | --- | --- | --- |
| spec | approved | `598902f3`..`e66bbb21` | brainstorm session | Four lenses, fold, verification, second fold, prose fold. Owner rulings O12, B1 to B4; conductor rulings CR1 to CR10. |
| plan | reviewed | `9f112c92`, fold `f3d1e4f6`, second fold `2c47bc92`, prose fold uncommitted | plan session | Three lenses (contract, mechanics, risk); fold record `2026-09-25-docs-reset-2a-plan-fold.md` (with its "Second fold" section after the fold verification and its "Prose fold" section after the prose review); rulings R-a to R-i; owner decisions F1, F2 pending. |
| 0 | done | `12fa7f34`; dotfiles `aa552a2e` | ~0.2M | `T0` 2026-09-25T22:56:11Z; conductor session `0d9876f8-fbf6-4c66-856b-a818fab60e55`. Worktrees `docs-reset-2a`, `docs-reset-2a-audiences` off `0ac8b457`, `npm ci` both. 1b `cmp` exit 0. CLI 2.1.282. `claude-tooling-sync verify` exit 0. Scratch-site teardown heading renamed (CR7), registry line moved; `check:docs` green. Pre-flight: ~55 claims, 4 failed, all moot or amended (verify.ts span cite corrected to `:81-84`; dotfiles 14 ahead; STATUS 61 lines; teardown heading already renamed by step 4). Pins: T1 `ruleCandidates` narrowing is prompt wording only, no filter; T3 new fields append after `checks`; T4 `wilsonInterval` rounds like `clopperPearson`, `--control-ids` checks absent before duplicate; T6 render blocks as `Key:` then hyphen bullets. Human-read sheets went with the approval message (STATUS 0ac8b457); Sheet 1's two blanks are Geoff's. |
| 1 | accepted | `3d2443d2`, `0b21f802`, simplify `bac10b2f`, fix `ee21fd5b` | in segment 1 | One `fix` (saved `attempts[]` not normalized, so round 1 rescoring would throw; `missing` line narrower than the spec; four comments). Re-review accept. Gate 747 tests, 0/0. |
| 6 | accepted (lane) | `59b54384`, `ea063319`, simplify `411bddc3`, fix `a615c2a7`, fix `bedfc4a3` | in segment 1 | Two `fix` rounds, the second a conductor call: fixture manifest not byte-for-byte, errors not naming the file, broken YAML crashing the CLI; then the conductor-added id rule failing the valid fixture. gray-matter caches a throwing parse (bypassed with an options object). Re-review accept. Gate 45 tests, 0/0. Merges at segment 2's boundary. |
| 2 | done | batch `2588bea6`, fixture `d3438e31` | runner ~0.23M | Plants file: 17 to 15 (P01, P02 removed), `dev-plants.json` sha256 `f166fb31526a5918966f4c96f2368c76a6523283b5664ab56fa7f44fdba1aac3`. Run 1 (`20260926t000351-d4704f`, kept at `results/pilot-2a-smoke-run1`) unverified on a reader miscitation (cited the unread second schema copy), verifier correct. Run 2 `20260926t001504-6744dd`, CLI 2.1.282, init pinned, verified; `wrong` and `missing` keys present (R-b). Fixture counts: stalls 1, assumed 5, diverged 3, checks 0, wrong 5, missing 4, ruleCandidates 4; nothing synthetic. |
| F1 | blocked on Geoff | | | `sudo -A` fails ("no password was provided"; `claude-sudo-setup` the same, 1Password likely locked), so `uupd.timer` is not paused. The smoke run went ahead (a drift before the first pilot reader batch is re-pinnable); timer next fires Sat 2026-09-26 04:14 AKDT. No pilot reader batch starts until `systemctl is-active uupd.timer` prints `inactive`. |
| seg 1 | boundary | `d3438e31` | 2.22M counted (session 0.13M, subagents 1.87M, runner 0.23M) | Reader chain gate green at `d3438e31` (747 tests, check:comments OK, svelte-check 0/0). Projection to close ~12.0M (open task lines 9.15M plus ~0.6M conductor); under the 15M ceiling, at the 12M flag. Next: Task 3. |

## Post-mortem
