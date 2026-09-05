# Measured build: volunteer roster screen (result)

Spec: experiment-spec.md (this directory). Engine: cairn-cms `main` at 9bf7fcd3 (post-internals-B).
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

## Fix round (to the published standard)

| Measure | Value |
| --- | --- |
| Dispatch (UTC) | 2026-09-05T06:50:52Z |
| Last command (UTC) | 2026-09-05T07:35:58Z |
| Wall-clock | 45 min 6 s |
| Tokens | 272,681 |
| Tool calls | 213 |
| Commit | bd4a0385 on `experiment-screen`, on top of 27a9e1f5 |
| Applied | every blocking and non-blocking finding: baselines restored from 27a9e1f5^; the screen excluded from the scaffold (markers plus `.cairn-template.json`), `templates/waymark` carries no trace; actions moved onto `createSectionAction` plus `requireAccess` with a declared access map and an audit sink (`migrations/0002_audit.sql`); the add form rebuilt as the doc's dialog recipe with the alert mounted at load, aria wiring, native validation restored, values preserved on failure; the remove id validated; the dead double method removed |
| Gates | showcase check 0/0 (603 files); root check 0/0; check:template OK; chassis-boundary PASS; public-tokens PASS; targeted e2e 2 passed; full showcase e2e 142 passed with the 13 admin-visual baselines failing at 747 to 849 px each against the 120 px allowance (held canonical; a CI update run is owed if the nav link stays); `cairn-audit` static: one pre-existing error shared with the exemplar; `cairn-audit --rendered`: not run (no session cookie reachable without a live magic-link session) |
| Defects the round uncovered | the dev backend never attached `locals.cairnAccess` (closed with a site-owned dev-fixture write); a Rollup facade-chunk artifact from mixed static and dynamic imports of `@glw907/cairn-cms/sveltekit` broke the build (fixed by making the import static); `adapter-cloudflare` throws on a `platform.env` read from a prerenderable route (the audit wiring scoped to `/admin`) |

Two-pass total: 79 min 57 s wall-clock, 470,720 tokens, 326 tool calls, two commits, one Opus review
between them. Second review pending.
