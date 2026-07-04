# Internal docs

Maintainer-facing documents. Nothing here is part of the adopter docs; the four public arms
live one level up.

## Conventions

- **Tests live under `src/tests/{unit,integration,component}/`.** The vitest config only globs those
  three directories, so a co-located `src/lib/**/*.test.ts` is silently never run. When a plan names a
  test path, point it inside `src/tests/`, not next to the source.

## Live

- `2026-06-21-e2e-dist-svelte-build-failure.md`: post-mortem for the Vite 8 dist-`.svelte` build
  failure and its fix.
- `2026-06-28-extensibility-competitive-research.md`: how other developer-extensible CMSs handle
  admin extension, session reuse, and upgrade safety.
- `admin-design-system.md`: the agent-facing design system for the `/admin` surface. Read it
  before any admin UI work.
- `admin-smoke-test.md`: the per-pass local smoke test for a site's embedded `/admin`.
- `api-surface.md`: generated; run `npm run check:surface -- --update` to regenerate. The full
  public export surface.
- `cm-editing-surface-alignment.md`: the design framing for bringing the CodeMirror editing
  surface into the Warm Stone language, walled off from the admin idiomatic re-expression sweep.
- `code-idioms.md`: the agent-facing idiom charter, one obvious way per pattern; a standing pass
  dimension.
- `docs-friction-log.md`: design friction surfaced while writing docs, triaged into ROADMAP
  and STATUS.
- `docs-maintenance.md`: the three layers, gates, pass rule, monthly drift routine, that keep the
  docs current.
- `dx-backlog-ecnordic-migration.md`: the DX backlog from the ecnordic migration.
- `extending-developer-lens.md`: the persona, diagnostic questions, and baseline for the lean
  extensibility redesign; subordinate to the charter.
- `public-design-system.md`: Waymark, cairn's public reading theme, the public counterpart to the
  admin's Warm Stone.
- `what-cairn-is-and-is-not.md`: the internal scope charter, the fuller why behind CLAUDE.md's
  `## What cairn is`.

## design/

Frozen per-screen design mockups and references for admin UI work. Its own `design/README.md`
governs; do not duplicate its conventions here.

## feedback/

Developer-experience feedback from real site migrations and incidents, one dated file per
pass: `YYYY-MM-DD-<site>-<topic>.md`.

## history/

The archive: superseded documents kept for the record. They describe designs that were later
changed or reverted; do not read them as current.

- `plan.md`: the original rebuild plan.
- `architecture.md`: the original architecture writeup.
- `architecture-critique.md`: a self-critique of that architecture.
- `forward-compat.md`: early forward-compatibility notes.
- `creating-a-cairn-site.md`: the 0.10-era living draft the tutorial and guides superseded;
  it still holds dated design decisions (the scaffold-copy ruling, the extension seam).
