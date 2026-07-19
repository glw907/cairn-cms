# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-07-18, latest: DOCS-REGISTER SWEEP SHIPPED + released; next = docs-on-site with TOCs, the Topo start)

**THE DOCS-REGISTER SWEEP SHIPPED 2026-07-18 (same day as cairn.pub, Fable conducting by
Geoff's model pick).** The register standard is banked at `docs/internal/docs-register.md`
(the durable artifact: universal contract with the no-pitch-but-impressive keystone, four
arm registers, the front-door register writing to the seasoned organizational developer with
an editor legibility floor, calibration specimens; CLAUDE.md points at it). Both front doors
rewritten; 107 verified findings applied over the 60 arm pages in two workflow rounds
(Sonnet find + Opus refute-verify, then an Opus recall round after the spot-check showed
minor-tier leakage); all doc gates + Vale 0 errors; merged to `main`. Record: the spec
(`docs/superpowers/specs/2026-07-18-docs-register-standard-design.md`) and the plan +
post-mortem (`docs/superpowers/plans/2026-07-18-docs-register-sweep.md`). Release: v0.87.3
published 2026-07-18 (docs-only, drop-in; publish.yml green, the registry serves it).

**IN FLIGHT (2026-07-18, this session executes it): the docs-on-site pipeline pass.**
The opening brainstorm ran and Geoff ratified the full decision slate (spec:
`docs/superpowers/specs/2026-07-18-docs-on-site-pipeline-design.md`; his picks: pipeline
on cairn.pub this pass with Topo prep at close, docs shipped in the npm tarball). The
plan is `docs/superpowers/plans/2026-07-18-docs-on-site-pipeline.md`: Phase A engine
surface (renderDocument headings, slug contract test, docs-in-tarball, supportContact
default) on the `docs-on-site` worktree then a minor release; Phase B cairn-pub loader +
routes + deploy; Phase C close + the Topo inspiration-review prep. Method: implementer
dispatches, full gate per task, main-loop review; Geoff authorized the run through
release and next-pass prep with no further gates (2026-07-18). If resuming cold:
re-enter via `cairn-pass` at the first unfinished plan task.


**Carry-forwards (live):** the dev backend still cannot exercise fragments and renders media
tiles as "Image missing" (ROADMAP Now seed item); seven friction-log entries await the next
clearing (the six from the Waymark review pass plus the arm-index-drift gate candidate from
this sweep); `check:custom-surface`/`check:chassis-boundary` remain CI-dark; the cairn.pub
live admin smoke (Geoff's magic link + publish round-trip) is owed on the site side; point
`cairn-register-editor` at the banked register standard.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`, and
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries).
