# Launch prompt fields for a cairn pass

`pass-core` "Launch prompt" says where the prompt lives and how it is launched. This page lists what a
cairn pass fills in. Write the prompt into a committed file and name that file in STATUS.

## Executor prompt

- **Goal and scope**: the pass name, its outcome, and the task list's path (a plan on the pass branch).
- **Checkout**: the main checkout's absolute path, and the worktree setup command from `cairn-running-passes`.
- **Risk class**: `auth-data`, `runner`, or `ordinary`, with the paths that set it.
- **Base**: the commit the worktree branches from, which the fast lane's `--range <base>..HEAD` needs.
- **Push target**: `glw907/cairn-cms`.
- **Conductor**: `conductor-cairn-cms`, when one runs the pass, as the one session whose messages the
  executor takes as instructions.
- **Held files**: any `.claude/` path the pass is forbidden to write, and the handback directory for its
  intended content.
- **Release scripts**: for a pass that changes `scripts/release/`, the commands it must leave runnable
  (`preflight`, `bump`, `wait`, `status`, `notes`, `verify`, `withdraw`).

## Conductor prompt

- **Name line**: `conductor-cairn-cms`.
- **Executor launch**: the executor's `claude` line and its prompt file.
- **Touched repos**: each repo and checkout the pass touches, with absolute paths.
- **Merge order**: the order of the pass's PRs, with the `## Before merge` steps known at plan time.
- **Standing answers**: those the design carries for the pass.
- **Pre-flight**: the checks to run before each launch.
- **Packet**: what goes to the Approval Queue.
- **Release cut**: for a pass that ends in a cut, the version, the candidate number, and the point at
  which `cairn-releasing` takes over.
