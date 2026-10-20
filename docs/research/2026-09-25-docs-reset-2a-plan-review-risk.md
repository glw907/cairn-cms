# Docs reset pass 2a plan review: domain risk lens

**Target:** `docs/superpowers/plans/2026-09-25-docs-reset-pass-2a.md` at `9f112c92`.
**Lens:** what is most likely to cost a re-run, a false pilot verdict, lost evidence, or an owner
sitting. **Reviewer:** `claude-opus-5-5`, one of three disjoint lenses. Read-only except this file.

**Counts:** 0 blocker, 6 major, 14 minor (one minor is an OWNER FORK).

The plan is sound in shape. It carries pass 1b's lessons forward: two deliverables per build task,
fix rounds budgeted, runner batches in the background, the smoke fixture, the Review focus tests,
and one close fold with one `diff-reviewer` read. It also avoids the `pass-execute` gate-tier
trap, and every dispatch names a model and an effort. The findings below are what I verified
against the repo and the workstation. They are not a checklist of everything a reviewer could ask
for. Each major is either an unpinned cross-stage input (pass 1b misses 4 and 5) or a hold that
does not hold (miss 9).

## Major

### M1. The CLI hold does not cover the path that actually updates the CLI

**Where:** plan :166-167, :197-200 (Task 0.3), :252 (Task 2.2), :324-325 (Task 5.1), :494-495
(stop rule).

**Defect:** the host `claude` is the Homebrew cask `claude-code@latest`
(`/home/linuxbrew/.linuxbrew/Caskroom/claude-code@latest/2.1.282`). Its receipt says it was
installed on 2026-09-25 at 04:30 AKDT. That is about 25 minutes after `uupd.timer` fired at 04:05,
and before dotfiles `4265aea` set `DISABLE_AUTOUPDATER` at 05:54. `uupd` runs `brew` daily (next
fire: 2026-09-26 04:14). `DISABLE_AUTOUPDATER` stops only Claude Code's own updater, not
`brew upgrade`. So pass 1b's mid-pass move to 2.1.282 most likely came through uupd, and
restoring the setting does not stop the next one.

**Consequence:** any pilot segment that spans a morning can change CLI version between the smoke
run and a pilot batch, or between batches. That leads to init-mismatch reruns and a mixed-version
pilot. The plan's own stop rule then fires ("a host CLI version outside the pinned set after the
hold"), which costs an owner sitting.

**Fold:** Task 0 also blocks the brew path for the window from the smoke run to the last judge
batch. Two options: stop `uupd.timer` (`sudo -A systemctl stop uupd.timer`, restarted at Task 5's
release step), or set uupd's brew module off for the window. Record the mechanism in the Ledger.
Before every runner batch, add a `claude --version` check against the version the smoke run
recorded. Reword the stop rule so that a drift before the first pilot reader batch is re-pinned
with `--probe-init` and the smoke run is redone, with no stop. Only a drift during the pilot's
reader or judge batches stops the pass. Stopping a system timer for a few hours is a method call
under B2. The conductor tells Geoff in the approval message.

### M2. Task 5's adjudicator packets skip the harness filter that round 1 ran

**Where:** plan :329-334 (Task 5.3).

**Defect:** round 0 and round 1 ran `harness-filter.ts` over every adjudicator packet as its own
step. The tuning record says so at :59-65, and the log is committed at
`tuning/round1/harness-filter-log.json`. In round 1 it excluded 1 to 2 items per control run
(denied commands and absent paths). Task 5.3 says only "builds ... an adjudicator packet for every
control run". It does not name the filter, the absent lists (`tuning/round0/absent-lists.json`),
the packet spec shape, or where packets land (`~/.cache/docs-readers/packets/round1/` must not be
reused). A `sonnet` agent at `medium` will rebuild this from the script header.

**Consequence:** a false no-go. Precision's total bar is 8 false findings over 5 control runs.
Round 1's excluded items alone would add about 5 to 7 items to the adjudicated set. Some would be
ruled false if the adjudicator does not label them `harness`, which could trip the total bar. This
is pass 1b miss 4 again: an unpinned cross-stage input.

**Fold:** pin Task 5.3's inputs. Use round 1's packet build as the template: the same spec shape,
`harness-filter.ts` over every pilot adjudicator packet with the same absent-list source, packets
under `~/.cache/docs-readers/packets/pilot-2a/`, and the filter log committed as
`tuning/pilot-2a/harness-filter-log.json`. The same rule applies to Task 3's live adjudicator check
(:284-286). Add one validity precondition to Task 5.5: the pilot's filter log exists and covers all
five control runs.

### M3. Task 4's round 1 rescore cannot match unless it points at pass 1b's worktree

**Where:** plan :128-130 (Review focus 2), :307-309 (Task 4 acceptance).

**Defect:** every round 1 key records `report.path` as an absolute path into
`.claude/worktrees/docs-reset-1b/scripts/docs-readers/tuning/round1/reader-report.json`.
`keyTraceMatches` (`lib/score-assemble.ts`) compares `resolve(key.path)` with the indexed
report's resolved path. If the rescore passes the `docs-reset-2a` copy of that report, every key
trace mismatches and every catch and adjudication drops into `notes`. The `byJob` figures then
cannot match `score.json`. The rescore matches only while the 1b worktree exists (it does today,
at `598230b8`) and only if the implementer thinks to point there. A committed unit test built that
way hard-codes another worktree's path.

**Consequence:** a likely `fix` or `escalate` on Task 4, or a test that goes red when someone
prunes the 1b worktree. The pilot's own keys will carry `docs-reset-2a` worktree paths too, so the
committed pilot cannot be rescored from `main` after that worktree is removed.

**Fold:** Task 4 pins the method. The rehearsal is a documented live check (not a gated unit test)
with `--report` set to the key's recorded path. Task 0 confirms that the `docs-reset-1b` worktree
exists and leaves it until the close. Alternatively, as a scorer change inside 1c's deliverable
(1), key traces compare repository-relative paths. That is cleaner and makes the pilot rescorable
from `main`, but it is a third concern in a two-deliverable task. The conductor picks one and pins
it in the dispatch. Either way, Task 5's record names the absolute paths its keys carry.

### M4. No audit of the judges' rulings before the verdict

**Where:** plan :99-101 (Judges), :337-346 (Task 5.5-5.6), :359-360 (the fork).

**Defect:** the plan says a judge defect found in the pilot is fixed, and every batch of that kind
re-runs. It does not say how one gets found. No stage reads the catch rulings or adjudications.
The scoring agent returns figures, and the record author writes the verdict. In pass 1b, the
real cause came from a read-only audit of every catch ruling, at 0.15M. The catch judge is the
stage most exposed to the change: its prompt gains a field rule, `missing[]` quotes sit "nearest"
the plant by design, and P05 accepts either field. Task 3 live-checks only the adjudicator (:284).

**Consequence:** a false verdict in either direction that nobody sees. A catch judge that
over-credits a nearby `missing[]` quote gives a false go and gating classes that block pages. A
judge that ignores new-field items gives a false no-go and a no-go report to Geoff (attended).

**Fold:** add Task 5 step 5a before the record. One cold `claude-opus-5-5` agent at `high` audits
every catch ruling (catches and misses) and all five adjudications against their packets and the
plant criteria. It returns misrulings with evidence, as pass 1b's audit did. A misruling is a judge
defect under :100-101. Budget it at about 0.15M, inside the pilot row's slack. This also fixes
minor m12 below, since the auditor can name the field that carried each catch.

### M5. The human-read sheets reach Geoff after segment 2, which leaves no lead time

**Where:** plan :201-202 (Task 0.4 writes them), :363-364 (sent at the segment 2 boundary),
:428-434 (Task 8, "an open read does not hold the fold").

**Defect:** the sheets exist at Task 0, but Geoff first sees them after the pilot. Geoff has to
arrange a club-site editor, which can take days. Tasks 7 to 8 can run in a few hours after that
boundary. So the reads almost certainly miss the fold and show up at owner stop 1 as "open". The
human reads are the only non-model evidence in the audience review. Pass 1b's program-budget note
says only the editor slice rests on user-testing evidence.

**Consequence:** the review folds without its only human evidence. A read that lands after the
close has no destination.

**Fold:** send the sheets with the plan-approval message. Task 0 writes them before the conductor
reports the worktrees ready, and they ride on the approval sitting, which is not an execution
sitting. A read that arrives after Task 8's fold goes to pass 2b as an input: Task 11's ROADMAP
line names it, and owner stop 1 lists it as routed, not dropped.

### M6. Task 7's inputs name site-round evidence that does not exist

**Where:** plan :402-404 (Task 7.1), :405-409; spec §4 "the site round's evidence".

**Defect:** `docs/internal/record/2026-09-23-docs-reset-baseline.md:214-215` says that no site
round has produced an extender source-read log or per-page reports, and the site round has not
run. Task 7's pre-extractor is told to collect them anyway. That leaves six profiles resting on
the 2026-08-14 profiles record, the charter, and the guidance layer. The spec also requires each
profile's body to name "the people or evidence the profile rests on" and marks only the designer
provisional "unless a profile carries an evidence note". This is pass 1b miss 3 again: an
undefined input.

**Consequence:** the author either writes confident profiles on thin evidence, which Task 8's
`users` and `open` lenses will flag (fold churn inside the 2.0M row, and unresolved findings
pushed to owner stop 1), or marks several profiles provisional without a stated rule.

**Fold:** Task 7.1 states that no site-round evidence exists and cites the baseline record. It
returns a per-profile evidence inventory: what exists for each of the six, and where. The author
applies the spec's evidence-note rule against that inventory, and the README states the gap. How
many profiles end up provisional is the author's call under the spec. Owner stop 1's brief names
it.

## Minor

- **m1. The spec and the plan disagree on the plants file.** Plan :250-251 and :339 use
  `tuning/pilot-2a/plants.json`. Spec §2 "Scoring" names `fixtures/dev-plants.json`, and plan :21
  says "the spec wins; stop and report". A literal executor stops. **Fold:** record the filtered
  file as a conductor ruling under B2 in the plan header, with the reason (`loadPlants` throws on
  the evaluator's plants), so no task reads it as a conflict.
- **m2. Task 4 can overwrite the file it is compared against.** The rescore (:307-309) can
  trivially "match" if it writes `--out tuning/round1/score.json`. **Fold:** write the output to
  the scratch directory. Task 4's `diff-reviewer` also checks that `git diff --name-only` shows no
  change under `tuning/round0/` or `tuning/round1/`, as Task 5 already does (:357).
- **m3. Echo risk in the new prompt lines.** Every executor reads the spec in full (:20), and the
  spec quotes plant content (P05 `AUTH_DB`, P06 `/style-guide`, P09 `section.ts`). The Task 1 and
  Task 3 implementers write reader and judge prompt lines. In pass 1b, two paraphrase echoes got
  past `ban-grep.ts`. **Fold:** the dispatches for Tasks 1 and 3 say "field definitions only, no
  examples" for new prompt lines. The `diff-reviewer` also gets the spec's quoted plant wordings.
- **m4. The smoke run does not prove the new request reached the reader.** Task 2.3 (:254-257)
  lets the agent add entries when none were filed. That hides the case where the reader never got
  the new `REPORT_REQUEST`. **Fold:** acceptance adds two checks. The smoke transcript's prompt
  carries the new request lines, and the raw report carries both keys (possibly empty) before any
  entry is added. This is the reader-side twin of pass 1b miss 5.
- **m5. The CLI release comes before scoring.** Task 5.4 (:335-336) lifts the hold before step
  5's preconditions can call for a reader or judge rerun. **Fold:** release after step 5's
  preconditions pass.
- **m6. Task 0 hard-codes 2.1.282.** Acceptance (:209) says `claude --version` prints 2.1.282, but
  the spec re-pins any unpinned version before the smoke run. **Fold:** accept "a pinned version,
  or re-pinned with `--probe-init` before Task 2".
- **m7. The one-executor check will fire on known dotfiles changes.** Plan :69-71 stops a task on
  changes this pass did not author, and `~/.dotfiles` already carries two
  (`skills/spec-plan-review/SKILL.md`, `skills/synced/`), listed at :171-172. `/effort` also
  writes to `settings.json`, the file Task 0 commits. **Fold:** name that set as the known
  baseline. Stop only on a new change to a file this pass commits (`settings.json`,
  `cairn-docs-drafter.md`), and commit by path.
- **m8. STATUS keeps growing, and its pointer goes to a branch.** Checkpoints commit "one STATUS
  line to `main`" (:43) into a 62-line file, and the Ledger they point at is on the branch.
  **Fold:** each checkpoint replaces the pass's one live STATUS line instead of adding one, and
  names the worktree path of the Ledger.
- **m9. The render test's name may miss the gate filter.** The merged gate filters
  `src/tests/unit/docs-audiences` (:362, :394), but Task 6 does not name the render test's file.
  **Fold:** pin `src/tests/unit/docs-audiences-render.test.ts`.
- **m10. The review lenses have no named inputs or tools.** Task 8 (:424-427) does not say what
  each lens gets. The `users` and `open` lenses need web access for comparable CMSs and peer docs.
  Pre-extracted inputs shared with Task 7's author would give correlated blind spots. **Fold:**
  name the agent type (web-capable) and each lens's inputs. Lenses read the profiles and the raw
  sources, not Task 7's scratch extraction.
- **m11. The exemplar lens's read set is unpinned.** Task 9 (:439-446) does not name it. The store
  is 24 MB (`page.html`), and the 68 `page.md` files total about 0.87 MB (about 220k tokens), which
  fits. Method sources such as `mozilla-kb-writing-guide/` sit beside the exemplars. **Fold:**
  the lens reads `page.md` and `meta.json` only. The count check says whether method sources are
  inside the 68.
- **m12. "The field that carried each catch" has no structured source.** The record requires it
  (spec "Record"), but catch rulings are `{ itemId: plant-N, ruling, reason }`. The catching item
  appears only in the free-text `reason`, and the key maps items to fields. This is pass 1b miss 7
  again: a measure with no data behind it. **Fold:** M4's auditor, or the Task 5.5 agent, derives
  it from the `item-N` ids cited in `reason` through the key. The record labels it as a reading.
- **m13. Breadth needs on-map tallies.** Task 4 names `plantTallies: [{ plantId, job, runsCaught
  }]` (:298) without an on-map flag, so an off-map catch could count toward "6 of 8". **Fold:**
  add `onMap` to each tally, or restrict the tallies to on-map plants.
- **m14 (OWNER FORK). The flag sitting is nearly certain.** The plan says 1b's mean per build task
  crosses the 12M flag (:34-36), so the flag sitting is predictable. **Fold, if Geoff wants it:**
  pre-answer at approval, for example "continue past 12M without asking unless the projection to
  the close exceeds 15M". Otherwise the plan stands as B4 set it.

Smaller notes that need no task: add a credential precondition (the scratch token mint or one
`cairn auth check`) beside `/healthz` for the operator batch (:325-326). Name who reports each
unverified run's cause, which the verifier-check trigger (:354-356) needs, as Task 5.3's reading
agent. Every runner command starts with `cd <worktree> &&`, as gate calls do (:88-89). Most
runner commands already fail loudly from `main`, because the batch files live only on the branch.

## Checked and clean

- **Contamination between fixtures and the pilot:** runs copy the prepared tree per run
  (`lib/podman.ts:384-445`), so planted runs 1 and 2 cannot see each other's edits. Result
  directories are suffixed with run IDs. Pilot artifacts sit under `tuning/pilot-2a/`, and Task 5
  checks round 0 and round 1 paths.
- **Judge prompt delivery:** `loadJudgePrompt` reads `prompts/*.md` fresh from the running
  checkout, once per batch. Task 3's live check covers delivery for the adjudicator. M4 covers the
  catch judge's behavior.
- **Global rules:** models and efforts are named per dispatch; the token ceiling, flag, counting
  rule, and checkpoints are present; one close fold agent with one `diff-reviewer` read;
  STATUS at 60 lines or fewer with history moved at the close; segment boundaries on commits with
  a green gate; the lane merge is gated.
- **Pass 1b misses 1, 2, 6, 8, and 10** are handled, or stated openly (10: the budget).
