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
| Gates | showcase check 0/0 (603 files); root check 0/0; check:template reported OK by the implementer but FAILS on the committed tree (the second review reproduced a fresh bake: templates/waymark/src/hooks.server.ts drifted, the emitted tree was hand-assembled, and migrations/0002_audit.sql reached the scaffold); chassis-boundary PASS; public-tokens PASS; targeted e2e 2 passed; full showcase e2e 142 passed with the 13 admin-visual baselines failing at 747 to 849 px each against the 120 px allowance (held canonical; a CI update run is owed if the nav link stays); `cairn-audit` static: one pre-existing error shared with the exemplar; `cairn-audit --rendered`: not run (no session cookie reachable without a live magic-link session) |
| Defects the round uncovered | the dev backend never attached `locals.cairnAccess` (closed with a site-owned dev-fixture write); a Rollup facade-chunk artifact from mixed static and dynamic imports of `@glw907/cairn-cms/sveltekit` broke the build (fixed by making the import static); `adapter-cloudflare` throws on a `platform.env` read from a prerenderable route (the audit wiring scoped to `/admin`) |

Two-pass total: 79 min 57 s wall-clock, 470,720 tokens, 326 tool calls, two commits, one Opus review
between them. Second review pending.

## Second review (on bd4a0385)

Verdict `fix`: eleven of twelve first-round findings folded at the published standard; two
mechanical blockers (the audit-sink import outside the exclude markers and the audit migration
reaching the scaffold, both re-emit-and-exclude fixes) and the corrected gate line above. Four
defects the two rounds surfaced belong to the ENGINE, not the experiment, and are filed:
1. `@glw907/cairn-cms-dev` mints `locals.cairnEditor` but never `locals.cairnAccess`, so the
   engine's documented authorization path (requireAccess in a load, createSectionAction in an
   action) is unusable under the dev backend without a site-owned shim; no doc warns of it.
2. `docs/extend/add-a-custom-admin-screen.md`'s `platform.ctx` example does not typecheck
   against the `App.Platform` shape the scaffold ships (`context` only).
3. The showcase declares no `sheet` key, so `cairn-audit` reports a false `no-uncompiled-class`
   on ordinary utility classes (the exemplar's own `my-4`).
4. Mixing a static and a dynamic import of the engine's `sveltekit` barrel emits an invalid extra
   export on the page chunk (a Rollup facade artifact); no doc mentions the trap.
A third timed round closes the two blockers; its numbers are appended below when it lands.

## Third round (the two blockers, on bd4a0385)

| Item | Value |
| --- | --- |
| Dispatch (UTC) | 2026-09-05T07:46:54Z |
| Last command (UTC) | 2026-09-05T08:23:12Z |
| Wall-clock | 36 min 18 s |
| Tokens (dispatch usage record) | 132,982 |
| Tool calls | 99 |
| Commit | a05fb6d3 on `experiment-screen`, on top of bd4a0385; 5 files, 20 insertions, 43 deletions |
| Applied | the audit-sink import moved into its own exclude block as a static import (the facade artifact needs static plus dynamic of one module, which this is not); the exclude entry corrected to the exact path `migrations/0002_audit.sql` (the previous entry named a path that matched nothing, which is how the migration leaked); `waitUntil` read from `platform.ctx` with the one-line `ctx: ExecutionContext` added to the showcase's `app.d.ts`, matching the adapter's own ambient types; the stale downstream comment corrected |
| Gates | check:template OK (templates/waymark matches a fresh bake); showcase check 0/0 (603 files); root check 0/0 (1825 files); chassis-boundary PASS; public-tokens PASS; targeted e2e 2 passed; root `npm test` 374 files, 4927 tests, then 78 component files, 1354 tests, exit 0; `templates/waymark/migrations/` holds only 0000, 0003, 0004; no `volunteer` token in `templates/` beyond a pre-existing prose comment |
| Not fixed, stated | the e2e spec exercises the dev-backend branch only, so `createAuthGuard({ access })`, the real `requireAccess` gate, and the D1 audit sink are proven by reading, not by a run |
| Measurement caveat | the implementer started a duplicate concurrent `npm test` against its own worktree, saw flakes, killed the stray process, and re-ran clean; the wall-clock and token figures include that self-inflicted detour |

Three-round total: 116 min 15 s wall-clock, 603,702 tokens, 425 tool calls, three commits, two Opus
reviews. The third round's diff is small (20 insertions, 43 deletions) against a round cost near a
third of the first pass, most of it the full gate run; the cost of a fix round is the gate, not the edit.
