# Measured build: one custom admin screen on the showcase (experiment spec)

Purpose: first-party, reproducible evidence for the cairn case's cost-and-speed claim. One
Sonnet implementer builds a specified custom admin screen on the showcase against the current
engine, using the shipped `cairn-admin-screens` skill, in a fresh worktree, clearing the full
gate. Recorded: wall-clock from dispatch to report, token spend (from the dispatch's usage
record), files and lines added, gate result, and an Opus diff-review's findings. Anyone can
repeat it from this spec.

## The screen: a volunteer roster

A club admin screen at `/admin/volunteers` in `examples/showcase`, following the showcase's
existing custom screen (`src/routes/admin/signups`) as the exemplar and the skill's guidance.

- A D1 table `volunteer` (id, name, email, role text, joined date, note text) with a
  migration under the showcase's migrations directory in the same shape as the existing ones.
- The screen lists volunteers newest-first in the admin toolkit's table with a count line,
  adds a volunteer through a form (name, email, role, optional note) with server-side
  validation and the engine's CSRF and editor guard, and removes one with a confirmed action.
- The screen mounts in the admin nav beside the existing custom screen, uses the toolkit's
  components and the admin shell, and logs nothing new (no engine change).
- Tests: the showcase's e2e suite gains one spec covering add, list, and remove; the engine
  is untouched.

## Constraints

- No engine change; no change outside `examples/showcase` and `templates/waymark`'s re-emit
  (run `npm run emit:template` and commit the regenerated tree, since `check:template` diffs
  it).
- Gate: the showcase `check`, the showcase e2e for the new spec, the engine's
  `check:chassis-boundary`, `check:public-tokens`, `check:template`, `check:idioms`, and
  `npm run check` at the root.
- Commit as one commit on the `experiment-screen` branch with the repo's conventions.

## What is recorded

- Dispatch and report timestamps (wall-clock).
- Token spend and tool-call count from the dispatch's usage record.
- `git show --stat` of the commit: files, lines added and removed.
- The gate lines as run.
- The diff-review's verdict and findings.
- Anything the implementer could not do or had to decide unspecified.
