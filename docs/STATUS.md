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

**NEXT (fresh session): docs+help rendered on-site with TOCs, likely starting the TOPO
theme, then the scaffolder (step 6; Opus conducts per the post-Fable doctrine). PREP IS
DONE: read `docs/internal/2026-07-18-docs-on-site-topo-brief.md` first — it holds the
binding rulings, the source-read facts (the anchor-slug compatibility constraint, the
no-TOC-API gap, the flat-concept limitation), and the ordered decision list; open the pass
by brainstorming that decision list with Geoff. Resume prompt: "Run the docs-on-site/Topo
pass: read cairn-cms docs/internal/2026-07-18-docs-on-site-topo-brief.md and brainstorm
its decision list with Geoff before any design." Launch in ~/Projects/cairn-cms (the
initiative spans the engine and cairn-pub; the brief says which decisions move it).**


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
