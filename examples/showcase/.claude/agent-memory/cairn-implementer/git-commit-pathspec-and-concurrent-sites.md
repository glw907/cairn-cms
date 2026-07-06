---
name: git-commit-pathspec-and-concurrent-sites
description: git commit -- <path> commits unstaged hunks too; the two consumer sites can carry a live concurrent session on a non-main branch mid-task.
metadata:
  type: feedback
---

`git commit -m "..." -- <pathspec>` does NOT commit only what you staged with
`git apply --cached`/`git add -p`; it commits the pathspec's full current
working-tree state, staged or not, exactly like running `git add <pathspec>`
first. To land an isolated hunk from a file another process is still editing,
`git apply --cached <patch>` then `git commit` with NO pathspec (the index
already holds only the intended hunk); adding a trailing `-- <file>` silently
pulls in every unstaged change to that file too. Verify with `git status`
right after commit, and `git reset --soft HEAD~1` immediately if the diff
looks too large.

**Why:** caught mid-task on ecxc-ski: a concurrent session (different branch,
`rebuild-waymark-2`, not `main`) had unrelated WIP hunks sitting unstaged in
the very file a plan task needed one line changed in. `git apply --cached`
isolated the intended hunk correctly, but the immediately-following `git
commit -m "..." -- <file>` swept the WIP hunks into the commit anyway. A
`git reset --soft HEAD~1` undid it before it caused damage.

**How to apply:** on a harvest-style pass touching consumer-site repos
(`907-life`, `ecxc-ski`), always check `git branch --show-current` and `git
status` on the site repo BEFORE editing, not just at commit time; the plan
brief's "both on main" is a snapshot, not a guarantee, and a concurrent human
or agent session can be mid-edit on either site at any time. If the target
repo is not on the branch the dispatch named, or already carries unrelated
uncommitted changes in the exact file you need, treat committing there as
unsafe: make and verify your edit, but leave it uncommitted and report the
branch/concurrency mismatch as a concern rather than guessing which hunks are
safe to bundle.
