# Docs reset pass 2a plan review: fold verification

**Target:** `docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` at `f3d1e4f6` (HEAD), against
the fold record `2026-09-25-docs-reset-2a-plan-fold.md`, the three reviews (contract, mechanics,
risk), the approved spec, and the human-read sheets. **Reader:** `claude-opus-5-5`, cold, no part
in the fold. Read-only apart from this file.

**Counts:** 0 blockers, 2 majors, 9 minors. The fold is sound. Every review major closed at its
cited location. Each new mechanism checked against source or the workstation holds, with one
defect: the Task 6 resolver and the Task 9 verdict line disagree on the line format. The second
major is an owner-evidence gap in F2, not a correctness defect.

## Mechanisms checked against source

| Claim | Result |
| --- | --- |
| `uupd.timer`: `OnCalendar` 04:00, `RandomizedDelaySec=15m`, `Persistent=true`, next run 2026-09-26 04:14 | Holds (`systemctl cat`, `list-timers`). |
| Pause and resume commands; reboot re-arms; `Persistent=true` catch-up on start | Hold. The unit is `WantedBy=timers.target`, so a reboot starts it. The stamp file `/var/lib/systemd/timers/stamp-uupd.timer` exists, so a start after a missed 04:00 fires within the 15-minute random delay. |
| No other updater moves the CLI | Holds. `brew-update.timer` and `brew-upgrade.timer` are disabled. No user timer touches brew. The reader image pins `CLAUDE_CODE_VERSION` from the host's `claude --version` (`Containerfile`, `lib/podman.ts:76`), so the host version is the one that matters. |
| Host CLI is cask `claude-code@latest` 2.1.282; `/etc/uupd/config.json` disables only `distrobox` | Holds. |
| Resolver: top-level `- ` lines, per `##` section, backticked `<slug>/` or `<dir>/<slug>/`, resolves 67 of 68 with no false match | Holds. A simulation of the rule resolves 67, reports no extras, and misses only `editors/mozilla-kb-writing-guide`. Slugs are unique across the six directories. |
| Round 1 regression through the `docs-reset-1b` worktree | Holds. I reran the plan's recorded command into the scratchpad: `byJob`, `onMapRecall`, `onMapPlantRunRecall`, and `notes` (`[]`) equal `tuning/round1/score.json`. The worktree is at `598230b8`. Its `reader-report.json` is byte-identical to `main` and to `1e4a7c31`. |
| Absent lists come from `batches/round1.json` job entries | Holds. All 12 jobs carry `absent` (24 to 217 entries). |
| Harness filter to adjudicator packet | Holds. `buildAdjudicatorPacket` takes `excludedKeys` as `{ field, sourceIndex }` (`judge-packets.ts:672-704`), so the new fields do not shift the exclusion join. |
| `wilsonInterval` figures | Hold: 0.505 to 0.898 (12 of 16) and 0.444 to 0.858 (11 of 16) at z = 1.96. |
| `PrecisionItem.field` from `items[itemId].field`; `newFieldItemCount` in `buildPrecisionRunRecords` | Buildable. The adjudicator key carries `items: Record<id, { field, sourceIndex }>` (`judge-packets.ts:646`). `joinAdjudications` receives the keys (`score-assemble.ts:336`). `itemCount` is `score-assemble.ts:418`. |
| Audit "field that carried each catch" | Workable. Catch rulings cite `item-N (field)` in `reason`, and catch keys carry `items`. |
| Cost lines | Sum to 12.65M. The deltas are +0.05, +0.3, +0.4, and +0.1, which make +0.85M over the spec's 11.8M. The range is 11.59M (four build tasks at 0.96M) to 15.75M (at 2.0M). |
| Pilot totals | Hold. Round 1's per-job `onMapPlantCount` is 2, 2, 2, 1, 1 (evaluator 0), so two planted runs give 16. |

## Did each major close?

Yes. C M1 through C M5, M M1 through M M4, and R M1 through R M6 all land at the fold record's
cited locations. Two partial points:

- C M2/M M3 closed. But the fold's companion minor (M m7, "Task 9's verdict line form feeds the
  resolver") did not close: the two forms differ (Major 1).
- R M1/M M2 closed through F1, with one predicate that misreads the unit's current state
  (Minor 1).

## Findings

### Major

**1. The resolver's rejection pattern does not match Task 9's verdict line.**
Plan:614 and :629 against :695.

- **Defect.** Task 6 marks an id unresolved when a line carries `` Verdict (`<slug>/`): rejected ``.
  Task 9 writes `` - **Verdict (`<slug>/`):** rejected (<reason>) ``. The bold markers put `**`
  between the colon and `rejected`, so the literal pattern never matches Task 9's line.
- **Consequence.** Task 6's fixture will carry the unbolded form, as its acceptance states, and its
  tests will pass. After Task 9, every rejected capture still resolves, so a profile citing one
  passes the schema test silently. Task 9's acceptance ("a profile citing a rejected capture fails
  it") can catch this only when someone builds that case deliberately. Task 9 is conductor-run
  with no implementer chain, so the fix costs an unplanned code dispatch in segment 3.
- **Fix.** Pin one literal form in both places, for example Task 9's bold form. State in Task 6
  that the rejection check matches `` Verdict (`<slug>/`):** rejected ``, or better, a regex
  tolerant of the bold markers. The Task 6 fixture line uses Task 9's exact form.

**2. F2's evidence omits two facts that bear on the ruling.**
Plan:63-69, :137, and :790-793.

- **Defect.**
  - At pass 1b's mean build cost, the estimate is 15.75M. That is over the 15M ceiling with no
    conditional chain at all. Line 793 says the mean case passes the ceiling only "with one of
    them", which is wrong.
  - A build task at 1b's mean (2.0M) overruns its 1.3M line by 54%. That trips "a single task
    overrunning its cost line by more than half", which F2(a) keeps as a stop and line 757 keeps
    as a standing stop.
- **Consequence.** F2 argues that stopping at the flag "costs an attended sitting for a known
  outcome". At 1b's mean, an overrun sitting in segment 1 or 2 and a ceiling stop in segment 3
  are both likely whatever F2 says. The owner is ruling on a partial picture. There is also a
  hidden fork: at the ceiling, the pass stops with Tasks 8 to 10 (the review, the exemplar fold,
  owner stop 1) the likely casualties, and nothing pre-rules what gives.
- **Fix.** Correct line 793 to "at the mean the pass reaches the ceiling". Add two sentences to F2:
  (1) the overrun stop fires at 1b's mean build cost, so a sitting is likely under either option;
  and (2) a pre-ruling for the ceiling, for example "at the ceiling, finish the running task,
  skip to the close, and route Tasks 8 to 10 to pass 2b". Alternatively, raise the overrun
  trigger to 1b's mean (2.0M) for build tasks.

### Minor

1. **Plan:45-47. F1's status gate predicate.** "Proceed only when `uupd.service` is inactive". The
   service is `failed` right now: today's 04:05 run and its restarts exited on the power-saver
   hardware check. A literal conductor stalls. **Fix:** "proceed when `uupd.service` is not
   `active` or `activating`".
2. **Plan:195-197 against :157-158. The fold's new rule contradicts the lane.** "No gate runs while
   a runner batch is running". Task 6's lane runs its own gate beside segments 1 and 2, which
   include the smoke run and Task 3's live check, and nothing coordinates the two. **Fix:** the
   conductor holds the lane's gate dispatch (or the lane agent waits) while a batch runs. Or the
   rule is scoped to gates the conductor launches.
3. **Plan:696-697 against :612-616. Mozilla's verdict line can un-exclude the method source.** The
   method source "carries its line under the Editors opening paragraph". Written at column 0 as
   `` - **Verdict (`mozilla-kb-writing-guide/`):** kept ``, it becomes a top-level entry line
   holding the slug, and `editors/mozilla-kb-writing-guide` then resolves. **Fix:** the resolver
   skips lines containing `**Verdict (`. Or Task 9 indents that line.
4. **Plan:504-510. The rehearsal's adjudicator side is under-specified.** It copies adjudicator
   keys "from the Task 3 fixture", which holds one job (`scripter-control-1`). It needs five
   control keys with `jobId`, `runId`, and `attempt` rewritten, and five jobs of adjudicator
   rulings. Without them, `buildPrecisionRunRecords` notes "no adjudicator key and rulings joined"
   and the `notes: []` assertion fails. **Fix:** name the synthetic adjudicator rulings for all
   five control runs.
5. **Plan:222-223 against :437-439. The committed judge fixture embeds worktree paths.** The live
   check's key has `inputs` keyed by absolute paths, including the worktree's batch file (round 1's
   keys show the pattern). Only `report.path` is said to be rewritten, and only at test time.
   **Fix:** rewrite or relativize `inputs` keys before commit, or scope the constraint to
   `report.path`.
6. **Plan:511-512 against spec:153-154. The new-field catch test is weaker than the spec's line.**
   Spec 1c: "a fixture catch through a new-field item shows in its plant's `runsCaught`". Task 4
   asks only that the key "loads and joins". **Fix:** also assert the plant's `runsCaught` holds
   `true` for that run.
7. **Sheets:27-29. The editor docs may not match the club site's engine version.** The sheet links
   `main`'s editor docs. The club sites pin 0.95.0 (ecxc-ski) and 0.96.0 (aksailingclub-org,
   xcathletes-org), and `docs/editors/` plus the admin components changed since. A stall can be
   version skew, not a doc gap. **Fix:** Geoff notes the site and its version in the log; the
   audience review reads the stall against that version's page (or the sheet links the matching
   tag).
8. **Sheets:13-15 and :21-25. Two sheet wording slips.** "Each sheet below can go to its reader as
   is", yet Sheet 1 carries a "For Geoff" block and a blank title. "Send each finished log back
   into the pass session" is vague for a pass that spans sessions. **Fix:** "remove the For-Geoff
   block and fill the title before sending". For the log: "paste it into whichever Claude session
   is running pass 2a; if none is, leave it at the foot of this file".
9. **Plan:800 and :780. Ledger staleness and a count slip.** The plan Ledger row says "fold
   uncommitted", but the fold is `f3d1e4f6`. Task 5's cost note says "16 runs", while the spec
   and Task 5 run 15. Both are cosmetic.

## Human-read sheets: usable?

Mostly yes.

- **Sheet 1 (editor).** It is in plain language and uses no jargon. It is feasible: the shipped
  editor has History with publisher and date, Revert, and Discard changes
  (`docs/editors/publish-and-history.md`). Geoff's pre-checks (published twice, no pending draft,
  sign-in works) cover the blocking states. The end state is unambiguous. It says where to send the
  notes: to Geoff.
- **Sheet 2 (evaluator).** It is self-contained, bounded (20 minutes, cairn's own pages and their
  GitHub links), and says where to send the notes: to Geoff.
- **Gaps.** Minors 7 and 8 above.

## Can the owner rule F1 and F2?

- **F1: yes.** The mechanism, the reversal, the reboot caveat, and the declined path are all
  stated and correct. The one fix is the status predicate (Minor 1). The hidden cost is stated:
  system image and all uupd modules pause for the window, which may span days. Not a hidden fork,
  but worth one line: under the declined path the pilot may mix CLI versions across batches. The
  plan records each batch's version, and B2 makes validity the conductor's call.
- **F2: only after Major 2's correction.** As written it hides that the overrun stop likely fires
  anyway and that the mean case reaches the ceiling. The ceiling-cut order is an unstated fork.
