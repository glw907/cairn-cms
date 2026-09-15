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

**Overnight run 2 WOUND DOWN, 2026-09-15 00:3x (Geoff: 75% of the weekly token budget used).**
Nothing is running; guards and inhibitors released. State on `admin-motion` (clean, pushed): tasks 1
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
the commit footer is the single co-author line. Task 11 records all three in the plan. Spend tonight:
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
