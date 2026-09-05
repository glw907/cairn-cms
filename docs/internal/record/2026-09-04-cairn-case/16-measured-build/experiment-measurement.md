# Measured build: volunteer roster screen (result)

Spec: experiment-spec.md (this directory). Engine: branched from cairn-cms `main` at 3485b0bb (`git merge-base experiment-screen main`); source identical to 9bf7fcd3, which differs by four docs-only commits.
Worktree: `.claude/worktrees/experiment-screen`, fresh install, showcase installed from scratch.
Implementer: `cairn-implementer` (claude-sonnet-5), one dispatch, no fix round yet (diff-review pending).

| Measure | Value |
| --- | --- |
| Dispatch (UTC) | 2026-09-05T06:05:43Z |
| Last command (UTC) | 2026-09-05T06:40:34Z |
| Wall-clock | 34 min 51 s |
| Tokens (dispatch usage record) | 198,039 |
| Tool calls | 113 |
| Commit | 27a9e1f5 on `experiment-screen` (stat in experiment-commit-stat.txt) |
| Gates | showcase check 0/0; targeted e2e 2 passed; full showcase e2e 157 passed (13 admin-visual baselines regenerated for the new sidebar link); root check 0/0; chassis-boundary PASS; public-tokens PASS; template OK |
| Not run | `check:idioms` (named in the dispatch by conductor error; it does not exist on `main`, it lands with internals-C) |

What the skill and the exemplar supplied (implementer's report): the guard-then-action pattern
(requireEditor substituted for requireOwner), the OfficeList/AdminTable/FieldLabel composition,
the migrations-per-database convention, the dev-wiring merge ordering. What it worked out
itself: a screen-scoped `node:sqlite` dev double, because the dev package's fake DB lives
outside the showcase and the spec forbade engine changes.

Unspecified decisions: a new `VOLUNTEER_DB` binding rather than reusing `APP_DB`; an inline add
form rather than a dialog; native `required`/`type=email` removed so the e2e exercises
server-side validation; `joined` set server-side.

A first attempt at 2026-09-05T05:13:12Z was killed by the session's API rate limit mid-edit and
discarded; this is the clean re-run on a reset worktree.
