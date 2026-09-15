# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`; locked architecture decisions live in the functional
spec. Everything past tense lives in [`docs/HISTORY.md`](HISTORY.md); this file carries only
the present.

## Current state

Published version: **`0.96.0`** (2026-08-22, the floors release), on npm `latest` for both
`@glw907/cairn-cms` and `@glw907/cairn-cms-dev`, with provenance attested. `main` carries eleven
engine passes plus chassis-A/B1/B2 and polish-11a/11b-i/11b-ii/C unpublished under `##
Unreleased`; the window holds for one cut after the admin motion pass (below). CI on `main` is
green.

## Immediate next action (2026-09-14)

**Overnight run halted at stage motion:run1 (2026-09-15).** Reason: task 10-fix (Task 10's doc
comment, changelog wording, and the stray capture script): accepted, fixRounds 0; task 11 (Docs
and records (last)): escalated, fixRounds 0. Resume prompt: Read the motion run journal, decide
the non-accepted task per docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md, then
Relaunch the orchestrator with stages ["motion","precut","release","parallel","final"]. Trim
every accepted task out of that pass's args file in ~/.cache/cairn-overnight-2026-09-14/, re-run
`node build.mjs`, and launch the built script again.

**Overnight run halted at stage motion:run1 (2026-09-15).** Reason: task 7-fix (Zen's chrome
fade scoped off first paint, and the chip's exit made real): accepted, fixRounds 1; task 10 (the
engine's tree wired, and the visual suite): escalated, fixRounds 0; task 11 (docs and records
(last)): deferred, fixRounds 0. Resume prompt: Read the motion run journal, decide the
non-accepted task per docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md, then
Relaunch the orchestrator with stages ["motion","precut","release","parallel","final"]. Trim
every accepted task out of that pass's args file in ~/.cache/cairn-overnight-2026-09-14/,
re-run `node build.mjs`, and launch the built script again.

**Overnight run halted at stage motion:run1 (2026-09-15).** Reason: task 6b (the dropzone's
drag-over state): accepted, fixRounds 1; task 7 (zen): escalated, fixRounds 0; task 10 (the
engine's tree wired, and the visual suite): deferred, fixRounds 0; task 11 (docs and records
(last)): deferred, fixRounds 0. Resume prompt: Read the motion run journal, decide the
non-accepted task per docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md, then
Relaunch the orchestrator with stages ["motion","precut","release","parallel","final"]. Trim
every accepted task out of that pass's args file in ~/.cache/cairn-overnight-2026-09-14/,
re-run `node build.mjs`, and launch the built script again.

**Overnight run halted at stage motion:run1 (2026-09-15).** Reason: task 6a-fix (the motion
rules' vendor exemptions widened, and the HelpHome hover halves guarded): escalated, fixRounds 0;
task 6b (the dropzone's drag-over state): deferred, fixRounds 0; task 7 (zen): deferred,
fixRounds 0; task 10 (the engine's tree wired, and the visual suite): deferred, fixRounds 0; task
11 (docs and records (last)): deferred, fixRounds 0. Resume prompt: Read the motion run journal,
decide the non-accepted task per docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md,
then Relaunch the orchestrator with stages ["motion","precut","release","parallel","final"]. Trim
every accepted task out of that pass's args file in ~/.cache/cairn-overnight-2026-09-14/, re-run
`node build.mjs`, and launch the built script again.

**Overnight run halted again at stage motion:run1 (2026-09-15).** Reason: task 6a (the admin
migrated onto the language) escalated, fixRounds 0; task 6b (the dropzone's drag-over state)
deferred, fixRounds 0; task 7 (zen) deferred, fixRounds 0; task 10 (the engine's tree wired, and
the visual suite) deferred, fixRounds 0; task 11 (docs and records, last) deferred, fixRounds 0.
Resume prompt: Read the motion run journal, decide the non-accepted task per
docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md, then Relaunch the orchestrator
with stages ["motion","precut","release","parallel","final"]. Trim every accepted task out of
that pass's args file in ~/.cache/cairn-overnight-2026-09-14/, re-run `node build.mjs`, and
launch the built script again.

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Overnight run 2 RELAUNCHED, 2026-09-15 00:4x (Geoff: "continue to the launch"), as workflow `wf_f43d9c7a-ade`, task run resumed, guards re-armed until 09:00.** The wind-down state it resumes from: State on `admin-motion` (clean, pushed): tasks 1
to 4, 6a, 8 accepted; chain B merged (`5bcc2258`); simplifier fold (`263654d0`); the conductor-inserted
task `6a-fix` IMPLEMENTED in two commits (`fix(audit): exempt DaisyUI vendor motion and the
reduced-motion floor`, `ec203cac fix(admin): guard HelpHome hover paint on hover-capable pointers`)
but NOT yet reviewed or accepted. Remaining: 6b, 7, 10, 11, the close ritual, then precut, the
0.97.0 cut, and extend-1. **The Go tool branch is DROPPED from the run** (Geoff, 2026-09-15); pass A
stays held at its Task 3 boundary on `cairn-tool-a` (draft PR #60) to pick up the week of 2026-09-21,
and the docs rewrite (from pass 2a) moves to that same week (Geoff, 2026-09-15).
Resume prompt: from a fresh session, follow `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md` steps 1
to 7 again (`launch.json` already carries the one-line footer and `toolA: null`; `motion-args.json`
already carries `6a-fix` first with a partial-work note that counts its two commits as landed, so a
relaunch re-verifies and reviews it rather than redoing it); stages
`["motion","precut","release","parallel","final"]`. Rulings behind `6a-fix`: task 6a's
zero-findings criterion was unmet only by DaisyUI vendor CSS (btn, modal, dropdown, toggle) and the
reduced-motion floor, so the two rules' exemption lists widened; the plan's contradiction on HelpHome's
two `:hover` pairs resolved for the rule's side (guarded, superseding task 6a's "no guard" decision);
the commit footer is the single co-author line. Task 11 records all three in the plan, plus the 01:1x ruling that accepted `6a-fix` and ratified
motion-property's `transition: none` parsing (zero properties, the reduced-motion snap idiom), and the
04:5x rulings on task 7 (zen, commit `5c41f061` kept; task `7-fix` inserted): the nested four-rule
frame-offset form and the `data-cairn-frame-open` direction key are ratified; chrome fades are
entrance-only but gated off first paint by a `data-cairn-zen-used` attribute; the chip's exit is keyed
on state so both directions ship. Task 6b accepted after one fix round; 7-fix accepted after one fix
round; task 10 in flight at 08:5x. **Geoff, 2026-09-15 morning:** the per-task gate is LIGHTENED for the
rest of the run (the showcase e2e narrowed to admin-visual.spec.ts per task; the full string runs at each
close ritual and on CI), and **extend-1 is HELD**: the run stops after the 0.97.0 cut (stages
motion, precut, release, final) and extend-1 launches separately. Spend tonight:
about 1.3M subagent tokens over four launches (one escalation halt, one runner-error stop, one
stop to drop the Go tool, one wind-down).

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Overnight run relaunched, 2026-09-14 23:2x (session 4e54c24b), as workflow `wf_f43d9c7a-ade` (a second relaunch, after `wf_5447b584-7b1` was stopped for a runner error: a malformed args entry made the task run return empty, which the orchestrator now treats as a halt).**
The first launch (`wf_085689cc-81b`) halted when the diff-reviewer escalated task 6a: its own work
was verified complete and paint-clean (commit `69c57db2`, ACCEPTED), but its zero-findings criterion
was unmet for reasons outside its Files. Conductor rulings, reversible in the morning: (1) a task
`6a-fix` is inserted before 6b, widening motion-property's and motion-vocabulary's DaisyUI vendor
exemptions (btn, modal, dropdown, toggle) and teaching motion-vocabulary to abstain on the
reduced-motion floor, since the first compiled-sheet class join over `src/lib/components` convicted
vendor CSS across 42 files; (2) the plan's own contradiction on HelpHome's two `:hover` pairs is
resolved for the rule's side, so the `:hover` halves gain the `@media (hover: hover)` guard the
rule's fix message teaches, superseding task 6a's "adds no guard" decision; (3) the commit footer is
the single co-author line, since this session has no URL. Task 11 records all three in the plan.

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Task 10 ruling, 2026-09-15 09:2x.** Task 10 (commit `4d2ed14e`) is ACCEPTED with its 60 new admin-visual
baselines committed from this workstation (precedent `d882921c`); the ritual's CI regen re-canonicalizes
them. A small `10-fix` task (doc comment, changelog root name, the stray capture script deleted) runs
before task 11 under the light gate. Relaunched as the same workflow `wf_f43d9c7a-ade`.

**Overnight run 2 RELAUNCHED, 2026-09-15 00:4x (Geoff: "continue to the launch"), as workflow `wf_f43d9c7a-ade`, task run resumed, guards re-armed until 09:00.** The wind-down state it resumes from: State on `admin-motion` (clean, pushed): tasks 1
to 4, 6a, 8 accepted; chain B merged (`5bcc2258`); simplifier fold (`263654d0`); the conductor-inserted
task `6a-fix` IMPLEMENTED in two commits (`fix(audit): exempt DaisyUI vendor motion and the
reduced-motion floor`, `ec203cac fix(admin): guard HelpHome hover paint on hover-capable pointers`)
but NOT yet reviewed or accepted. Remaining: 6b, 7, 10, 11, the close ritual, then precut, the
0.97.0 cut, and extend-1. **The Go tool branch is DROPPED from the run** (Geoff, 2026-09-15); pass A
stays held at its Task 3 boundary on `cairn-tool-a` (draft PR #60) to pick up the week of 2026-09-21,
and the docs rewrite (from pass 2a) moves to that same week (Geoff, 2026-09-15).
Resume prompt: from a fresh session, follow `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md` steps 1
to 7 again (`launch.json` already carries the one-line footer and `toolA: null`; `motion-args.json`
already carries `6a-fix` first with a partial-work note that counts its two commits as landed, so a
relaunch re-verifies and reviews it rather than redoing it); stages
`["motion","precut","release","parallel","final"]`. Rulings behind `6a-fix`: task 6a's
zero-findings criterion was unmet only by DaisyUI vendor CSS (btn, modal, dropdown, toggle) and the
reduced-motion floor, so the two rules' exemption lists widened; the plan's contradiction on HelpHome's
two `:hover` pairs resolved for the rule's side (guarded, superseding task 6a's "no guard" decision);
the commit footer is the single co-author line. Task 11 records all three in the plan, plus the 01:1x ruling that accepted `6a-fix` and ratified
motion-property's `transition: none` parsing (zero properties, the reduced-motion snap idiom), and the
04:5x rulings on task 7 (zen, commit `5c41f061` kept; task `7-fix` inserted): the nested four-rule
frame-offset form and the `data-cairn-frame-open` direction key are ratified; chrome fades are
entrance-only but gated off first paint by a `data-cairn-zen-used` attribute; the chip's exit is keyed
on state so both directions ship. Task 6b accepted after one fix round; 7-fix accepted after one fix
round; task 10 in flight at 08:5x. **Geoff, 2026-09-15 morning:** the per-task gate is LIGHTENED for the
rest of the run (the showcase e2e narrowed to admin-visual.spec.ts per task; the full string runs at each
close ritual and on CI), and **extend-1 is HELD**: the run stops after the 0.97.0 cut (stages
motion, precut, release, final) and extend-1 launches separately. Spend tonight:
about 1.3M subagent tokens over four launches (one escalation halt, one runner-error stop, one
stop to drop the Go tool, one wind-down).

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Overnight run relaunched, 2026-09-14 23:2x (session 4e54c24b), as workflow `wf_f43d9c7a-ade` (a second relaunch, after `wf_5447b584-7b1` was stopped for a runner error: a malformed args entry made the task run return empty, which the orchestrator now treats as a halt).**
The first launch (`wf_085689cc-81b`) halted when the diff-reviewer escalated task 6a: its own work
was verified complete and paint-clean (commit `69c57db2`, ACCEPTED), but its zero-findings criterion
was unmet for reasons outside its Files. Conductor rulings, reversible in the morning: (1) a task
`6a-fix` is inserted before 6b, widening motion-property's and motion-vocabulary's DaisyUI vendor
exemptions (btn, modal, dropdown, toggle) and teaching motion-vocabulary to abstain on the
reduced-motion floor, since the first compiled-sheet class join over `src/lib/components` convicted
vendor CSS across 42 files; (2) the plan's own contradiction on HelpHome's two `:hover` pairs is
resolved for the rule's side, so the `:hover` halves gain the `@media (hover: hover)` guard the
rule's fix message teaches, superseding task 6a's "adds no guard" decision; (3) the commit footer is
the single co-author line, since this session has no URL. Task 11 records all three in the plan.

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Release plan, Geoff 2026-09-15 10:3x: ONE release, not a series.** Geoff is the only cairn consumer until
the upgrade and extend tools ship, so the window keeps accumulating on `main`: no 0.97.0 cut now, no
pre-cut window pass now (the dependency sweep runs immediately before the eventual cut), extend-1 and
extend-2 land first, then one cut carrying everything (extend-1's "Available since" reads 0.97.0 and its
advisory rules promote at 0.98.0; `launch.json` updated). After that cut Geoff upgrades every site at once,
documents the friction, ships one improvement release from it, then beta. **The site round is an
upgrade AND a rewrite (Geoff, 2026-09-15):** each site is brought onto the new best practices the extend
tools teach and becomes a model cairn site, and the friction it surfaces is the fodder for the docs
rewrite, which therefore follows the site round rather than the week of 2026-09-21. Every consumer pin bump,
cairn.pub's docs pin included, holds until then. The overnight run now stops after the motion pass merges
(stages motion, final).

**Task 11 ruling, 2026-09-15 10:2x.** Task 11 (commit `48fba6fe`, the records) is ACCEPTED with a docs-only
`11-fix` task on top: two Verified lines in the rulings ledger reworded to what `custom-surface-budget.json`
holds, HISTORY's chain A count set to nine plus the four correction tasks, the changelog window settled at
the pre-pass 211 plus six (task 1's merged line counts once; the two unassigned "Consumers must: nothing"
lines from tasks 7 and 10 removed), and three polish items. Then the close ritual. Relaunched as the same
workflow `wf_f43d9c7a-ade`.

**Task 10 ruling, 2026-09-15 09:2x.** Task 10 (commit `4d2ed14e`) is ACCEPTED with its 60 new admin-visual
baselines committed from this workstation (precedent `d882921c`); the ritual's CI regen re-canonicalizes
them. A small `10-fix` task (doc comment, changelog root name, the stray capture script deleted) runs
before task 11 under the light gate. Relaunched as the same workflow `wf_f43d9c7a-ade`.

**Overnight run 2 RELAUNCHED, 2026-09-15 00:4x (Geoff: "continue to the launch"), as workflow `wf_f43d9c7a-ade`, task run resumed, guards re-armed until 09:00.** The wind-down state it resumes from: State on `admin-motion` (clean, pushed): tasks 1
to 4, 6a, 8 accepted; chain B merged (`5bcc2258`); simplifier fold (`263654d0`); the conductor-inserted
task `6a-fix` IMPLEMENTED in two commits (`fix(audit): exempt DaisyUI vendor motion and the
reduced-motion floor`, `ec203cac fix(admin): guard HelpHome hover paint on hover-capable pointers`)
but NOT yet reviewed or accepted. Remaining: 6b, 7, 10, 11, the close ritual, then precut, the
0.97.0 cut, and extend-1. **The Go tool branch is DROPPED from the run** (Geoff, 2026-09-15); pass A
stays held at its Task 3 boundary on `cairn-tool-a` (draft PR #60) to pick up the week of 2026-09-21,
and the docs rewrite (from pass 2a) moves to that same week (Geoff, 2026-09-15).
Resume prompt: from a fresh session, follow `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md` steps 1
to 7 again (`launch.json` already carries the one-line footer and `toolA: null`; `motion-args.json`
already carries `6a-fix` first with a partial-work note that counts its two commits as landed, so a
relaunch re-verifies and reviews it rather than redoing it); stages
`["motion","precut","release","parallel","final"]`. Rulings behind `6a-fix`: task 6a's
zero-findings criterion was unmet only by DaisyUI vendor CSS (btn, modal, dropdown, toggle) and the
reduced-motion floor, so the two rules' exemption lists widened; the plan's contradiction on HelpHome's
two `:hover` pairs resolved for the rule's side (guarded, superseding task 6a's "no guard" decision);
the commit footer is the single co-author line. Task 11 records all three in the plan, plus the 01:1x ruling that accepted `6a-fix` and ratified
motion-property's `transition: none` parsing (zero properties, the reduced-motion snap idiom), and the
04:5x rulings on task 7 (zen, commit `5c41f061` kept; task `7-fix` inserted): the nested four-rule
frame-offset form and the `data-cairn-frame-open` direction key are ratified; chrome fades are
entrance-only but gated off first paint by a `data-cairn-zen-used` attribute; the chip's exit is keyed
on state so both directions ship. Task 6b accepted after one fix round; 7-fix accepted after one fix
round; task 10 in flight at 08:5x. **Geoff, 2026-09-15 morning:** the per-task gate is LIGHTENED for the
rest of the run (the showcase e2e narrowed to admin-visual.spec.ts per task; the full string runs at each
close ritual and on CI), and **extend-1 is HELD**: the run stops after the 0.97.0 cut (stages
motion, precut, release, final) and extend-1 launches separately. Spend tonight:
about 1.3M subagent tokens over four launches (one escalation halt, one runner-error stop, one
stop to drop the Go tool, one wind-down).

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Overnight run relaunched, 2026-09-14 23:2x (session 4e54c24b), as workflow `wf_f43d9c7a-ade` (a second relaunch, after `wf_5447b584-7b1` was stopped for a runner error: a malformed args entry made the task run return empty, which the orchestrator now treats as a halt).**
The first launch (`wf_085689cc-81b`) halted when the diff-reviewer escalated task 6a: its own work
was verified complete and paint-clean (commit `69c57db2`, ACCEPTED), but its zero-findings criterion
was unmet for reasons outside its Files. Conductor rulings, reversible in the morning: (1) a task
`6a-fix` is inserted before 6b, widening motion-property's and motion-vocabulary's DaisyUI vendor
exemptions (btn, modal, dropdown, toggle) and teaching motion-vocabulary to abstain on the
reduced-motion floor, since the first compiled-sheet class join over `src/lib/components` convicted
vendor CSS across 42 files; (2) the plan's own contradiction on HelpHome's two `:hover` pairs is
resolved for the rule's side, so the `:hover` halves gain the `@media (hover: hover)` guard the
rule's fix message teaches, superseding task 6a's "adds no guard" decision; (3) the commit footer is
the single co-author line, since this session has no URL. Task 11 records all three in the plan.

**Overnight launch, 2026-09-14 late (session 7c350980 closes after writing this).** A fresh session
launches ONE run from `~/.cache/cairn-overnight-2026-09-14/LAUNCH.md`, stages in order: `motion`
(admin-motion resumed at task 6a; tasks 1 to 4 and 8 accepted, worktrees clean; close ritual and
merge), `precut` (the pre-cut window pass on main), `release` (the 0.97.0 cut, approved by Geoff
2026-09-14), `parallel` (extend-1 in two new worktrees beside Go tool pass A tasks 4 to 9 in
cairn-tool-a, held at Task 10 for Geoff), `final` (this file). The earlier halt paragraph below is
superseded. Gates queue on one machine-wide lock in an 8G scope (dotfiles 54e3974). Morning items
after the run: cairn.pub's pin bump, Go tool Task 10, the three dependency tripwires,
blueprint-audit, the post-mortem.

**Overnight run halted at stage motion:run1.** Reason: task 2 (the shipped-rule reconciliation)
accepted, fixRounds 1; task 3 (motion-property and motion-hover-gate) escalated, fixRounds 0; task
4 (motion-vocabulary) deferred, fixRounds 0; task 6a (the admin migrated onto the language)
deferred, fixRounds 0; task 6b (the dropzone's drag-over state) deferred, fixRounds 0; task 7
(zen) deferred, fixRounds 0; task 10 (the engine's tree wired, and the visual suite) deferred,
fixRounds 0; task 11 (docs and records, last) deferred, fixRounds 0. Resume prompt: Read the
motion run-1 journal, decide the non-accepted task, then resume the remaining tasks per
docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md.

**Recovery, 2026-09-14 17:xx (session 7c350980).** A desktop crash at 16:03 (two full gates side by
side; systemd-oomd killed GNOME Shell) took both conducting sessions. This session resumed both:
the motion pass runs as workflow `wf_0c5004bd-52c` (tasks 1 and 8 accepted, chain A on task 3 of
its remaining eight; chain B merges at the close), and **Go tool Pass A is at its Task 3 segment
boundary**, held unmerged on branch `cairn-tool-a` (draft PR #60, three green tool legs on every
push; the release job's dispatch dry run waits for main). Tasks 4 through 11 resume in a fresh
session after the cut. Ledger for that resume: the fake's `tokenVerifyId` default and three test
files still carry the real Cloudflare API token id (outside the corpus ban list; scrub as a chore).
Gates now run in an 8G-capped user scope (`cairn-run-gate`); one browser-bearing gate at a time.

**Polish-C is MERGED** (PR #59, CI green, merge commit `ece054b8`; entry and post-mortem in
[`HISTORY.md`](HISTORY.md)). The conducting session closed here by design (2026-09-14 13:2x).
**Next, a fresh session launches the admin motion pass** per
`~/.cache/cairn-overnight-2026-09-12/LAUNCH.md` (its 2026-09-14 handoff section is the step list:
copy `cairn-motion.js` and the chains script to the new scratchpad, rewrite `chainsScript`, arm the
guards and the full inhibitor set, launch). The pass runs UNREAD on its reviewed plan
(`docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md`; Geoff, 2026-09-13). Then, on
`main` with no worktree live, the **pre-cut window pass** on its APPROVED plan
(`docs/superpowers/plans/2026-09-14-pre-cut-window-pass.md`: the dependency sweep through the
`dependency-upgrade` skill, three accepted Carbon defaults, records; four per-task Agent chains,
ceiling 3.30M). Then the cut as **0.97.0** via `cairn-release` (verify the number is free first).
Held for Geoff after the release: cairn.pub's engine pin bump (a production deploy), the three
dependency tripwires, the `blueprint-audit` dotfiles script, the post-mortem.

After the cut, in fresh sessions: the Go tool 1.0 (below) in parallel with the extend
spec's fresh read (cache draft, re-read against post-C `api-surface.md`), then the docs rewrite
from pass 2a. Polish-C's run spent 7.2M subagent tokens (conductor-notes.md has the detail).

## Parallel tracks

- **Audit remediation (ROADMAP Now).** Slices 1-7, chassis-A/B1/B2, and polish-11a/11b-i/11b-ii/C
  all MERGED; the admin motion pass next (above), then ONE release cut. ROADMAP's
  audit-remediation entry is the canonical routing record; the chassis quality bar equals the
  engine's (Geoff, 2026-09-01).
- **The cairn case (front-door argument): DEAD (Geoff, 2026-09-12).** Frozen record only, under
  `docs/internal/record/2026-09-04-cairn-case/`; nothing from it lands.
- **Go `cairn` tool, 1.0.** Re-cut 2026-09-14 as a product for any operator on Linux, macOS, and
  Windows (plan `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md`, APPROVED 2026-09-14).
- **`cairn-pub`, branch `pass-d-docs-tracks`.** Un-pinnable against the registry since `0.95.0`.

## Open decisions

- Node 26 becomes the floor at beta only if it is Active LTS by then (Current until Oct 2026).
- TypeScript 7 stays held until `svelte-check --tsgo` runs green; `tsgo.yml` checks weekly.

## Active watches

- A monthly Cloudflare capability-review routine (`trig_01GnFPkfx7EjrWKAuTBrXVdx`) reads
  `ROADMAP.md`'s "Platform watch: Cloudflare" section and emails a ranked report.
- `install.test.mjs`'s concurrent-poll test flaked once in a 30x local loop (2026-08-29).
  Trigger: its next CI failure gets the same mock-timer deflake as the grace-window tests.
- A consumer `guard.rejected` record with `detail: 'mismatch'`, `witness: 'field'` can be the
  known double-mint residual, not a new mechanism; the discriminator names any genuinely new one.
- Three ASC staging harvest docs are folded into cairn, slated for deletion in the ASC repo.
  Trigger: the ASC `email-announce` branch settles.

Everything else, every prior pass, release, and archived checkpoint, is in
[`docs/HISTORY.md`](HISTORY.md).
