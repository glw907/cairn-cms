---
name: temporarily-reverting-a-landed-fix-to-prove-a-test
description: How to prove a regression test would have caught an already-landed fix, and the site-visual baseline staleness that follows a prose/layout-height change.
metadata:
  type: feedback
---

When a task asks for a regression test on a bug whose fix already landed in an earlier commit
(no code change of your own to make red first), reproduce the pre-fix file to prove the test fails
for the right reason: `git show <fix-commit>~1:<path/to/file> > /tmp/scratch/pre-fix.css`, `cp` the
current (fixed) file aside as a restore point, overwrite with the pre-fix content, run the test,
confirm the expected failure, then `cp` the restore point back and `git diff --stat` the path to
confirm it is byte-identical to before. Do not `git stash`/`git checkout` for this: the file may
not be the only uncommitted change in the tree, and a plain `cp` round trip is unambiguous.

**Why:** this is the only way to satisfy "watch it fail" TDD discipline when the implementation
already exists on the branch you were handed.

**How to apply:** works for any single-file CSS/behavior fix; for a multi-file fix, copy each
touched file aside before overwriting.

A related gotcha in examples/showcase specifically: a landed prose/layout change that alters
paragraph margins (or any vertical rhythm) changes the rendered page height, which makes
`e2e/site-visual.spec.ts`'s full-page screenshots (styleguide light/dark, reading-surface article
at several widths) fail on `toHaveScreenshot` with an image-size mismatch, even though nothing in
your own task caused it. Check whether the baseline PNG's last commit predates the layout-changing
fix (`git log -1 -- <snapshot-path>`); if so, the staleness is inherited from that earlier commit,
not from your task, and per this repo's convention (CI is the canonical baseline renderer) it is
fixed by the regen dispatch, not a local `--update-snapshots` run. Do not treat it as a red gate
you introduced; report it as a known, already-tracked follow-up (the harvest-pass-1 plan's own
consolidation task explicitly owns "baselines via the regen dispatch").
