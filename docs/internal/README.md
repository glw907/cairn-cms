# Internal docs

Maintainer-facing documents. Nothing here is part of the adopter docs; the four public arms
live one level up.

## The filing rule

A dated artifact (a filename carrying a `YYYY-MM` prefix) files to `record/`. A living
standard stays top-level. The test: does a reader need this file to do current work, or only
to understand what was decided once? A design system, a register standard, or a generated
snapshot answers the first question and stays here. A spike write-up, a review round, or a
point-in-time audit answers the second and moves to `record/`, even while a pass is actively
reading it as an input; see "This pass's active inputs" below.

`check:arm-indexes` gates the top level only: every top-level `.md` file here must be linked
from this index, or the gate fails naming it. It does not walk into `record/` or the other
subdirectories, each of which keeps its own filing rule and its own index.

## Conventions

- **Tests live under `src/tests/{unit,integration,component}/`.** The vitest config only globs those
  three directories, so a co-located `src/lib/**/*.test.ts` is silently never run. When a plan names a
  test path, point it inside `src/tests/`, not next to the source.

## Live

- [`admin-design-system.md`](admin-design-system.md): the agent-facing design system for the
  `/admin` surface. Read it before any admin UI work.
- [`admin-smoke-test.md`](admin-smoke-test.md): the per-pass local smoke test for a site's
  embedded `/admin`.
- [`api-surface.md`](api-surface.md): generated; run `npm run check:surface -- --update` to
  regenerate. The full public export surface.
- [`cm-editing-surface-alignment.md`](cm-editing-surface-alignment.md): the design framing for
  bringing the CodeMirror editing surface into the Warm Stone language, walled off from the
  admin idiomatic re-expression sweep.
- [`code-idioms.md`](code-idioms.md): the agent-facing idiom charter, one obvious way per
  pattern; a standing pass dimension.
- [`daisy-absorption-ritual.md`](daisy-absorption-ritual.md): the maintainer's routine check
  against a daisyUI release renaming or dropping a class the admin's blessed set depends on. Run
  it against every daisy release Dependabot opens a PR for.
- [`daisyui-v5-hard-components.md`](daisyui-v5-hard-components.md): researched daisyUI v5
  markup patterns for the hard admin components (timelines, detail two-panes, and the like).
- [`docs-friction-log.md`](docs-friction-log.md): design friction surfaced while writing docs,
  triaged into ROADMAP and STATUS.
- [`docs-maintenance.md`](docs-maintenance.md): the three layers, gates, pass rule, monthly
  drift routine, that keep the docs current.
- [`docs-register.md`](docs-register.md): the register standard for published docs prose (the
  page anatomies, the four track registers with their audience profiles folded in as grading
  rubrics, the front-door register, the calibration specimens). Read it before writing or
  reviewing any published docs page.
- [`dx-backlog-ecnordic-migration.md`](dx-backlog-ecnordic-migration.md): the DX backlog from
  the ecnordic migration.
- [`engine-harvest-candidates.md`](engine-harvest-candidates.md): engine harvest candidates
  evidenced from two consumer sites, an input to the pre-beta harvest triage rather than a
  decision of its own.
- [`extending-developer-lens.md`](extending-developer-lens.md): the persona, diagnostic
  questions, and baseline for the lean extensibility redesign; subordinate to the charter.
- [`pre-beta-harvest.md`](pre-beta-harvest.md): the pre-beta harvest ledger, every engine and
  Waymark improvement surfaced by the rebuild and port efforts, with the status each entry
  carries toward the harvest pass.
- [`public-design-system.md`](public-design-system.md): Waymark, cairn's public reading theme,
  the public counterpart to the admin's Warm Stone.
- [`what-cairn-is-and-is-not.md`](what-cairn-is-and-is-not.md): the internal scope charter, the
  fuller why behind CLAUDE.md's `## What cairn is`.

## This pass's active inputs

Pass D (2026-08-14, the documentation rebuild) reads six documents as live work orders while
Phase 2 writes the new tracks. Each carries a date prefix, so the filing rule above sends it to
`record/` with everything else dated; a document does not earn a top-level exemption just
because a pass is currently reading it.

- [`record/2026-08-14-pass-d-target-manifest.md`](record/2026-08-14-pass-d-target-manifest.md):
  the rebuild's planning document, the target page set, the deletion and redirect map, and the
  cutover gate bill.
- [`record/2026-08-14-docs-track-outlines.md`](record/2026-08-14-docs-track-outlines.md): the
  per-track page list and order Phase 2 writes from.
- [`record/2026-08-14-audience-profiles.md`](record/2026-08-14-audience-profiles.md): the
  grading rubric for the four tracks, the vocabulary contract, arrival state, and success
  criterion each page is reviewed against.
- [`record/2026-08-14-docs-review-methodology.md`](record/2026-08-14-docs-review-methodology.md):
  how Claude-written documentation gets reviewed by Claude before production, the gate sequence
  and the findings pipeline.
- [`record/2026-08-14-cms-docs-competitor-review.md`](record/2026-08-14-cms-docs-competitor-review.md):
  the competitor documentation review that grounds Pass D's rules.
- [`record/2026-08-unagented-setup-baseline.md`](record/2026-08-unagented-setup-baseline.md):
  the setup docs walked cold from five vantages, the friction record and the Pass D work list it
  fed.

## record/

The dated record: spikes, harvests, audits, review rounds, and other point-in-time documents,
one file per artifact, never edited after the fact to describe a later state. Find something by
date (the `YYYY-MM[-DD]` filename prefix orders it against the work it came out of) or by
subject (the filename's own words after the date; `grep -l <subject>` across the directory beats
browsing). This section deliberately does not enumerate every file here: an index that lists
every record recreates the sediment problem the filing rule exists to end.

## design/

Frozen per-screen design mockups and references for admin UI work. Its own `design/README.md`
governs; do not duplicate its conventions here.

## feedback/

Developer-experience feedback from real site migrations and incidents, one dated file per
pass: `YYYY-MM-DD-<site>-<topic>.md`. Its own `feedback/README.md` carries the fixed report
shape every migration fills, so the four sites crossing one window stay comparable, and the
rule that every finding leaves the report.

## history/

The archive: superseded documents kept for the record. They describe designs that were later
changed or reverted; do not read them as current.

- `plan.md`: the original rebuild plan.
- `architecture.md`: the original architecture writeup.
- `architecture-critique.md`: a self-critique of that architecture.
- `forward-compat.md`: early forward-compatibility notes.
- `creating-a-cairn-site.md`: the 0.10-era living draft the tutorial and guides superseded;
  it still holds dated design decisions (the scaffold-copy ruling, the extension seam).
