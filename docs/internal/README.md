# Internal docs

Maintainer-facing documents. Nothing here is part of the adopter docs; the four public arms
live one level up.

## Live

- `admin-design-system.md`: the agent-facing design system for the `/admin` surface. Read it
  before any admin UI work.
- `admin-smoke-test.md`: the per-pass local smoke test for a site's embedded `/admin`.
- `docs-friction-log.md`: design friction surfaced while writing docs, triaged into ROADMAP
  and STATUS.
- `dx-backlog-ecnordic-migration.md`: the DX backlog from the ecnordic migration.

## feedback/

Developer-experience feedback from real site migrations and incidents, one dated file per
pass: `YYYY-MM-DD-<site>-<topic>.md`.

## history/

Superseded documents kept for the record. They describe designs that were later changed or
reverted; do not read them as current.

- `plan.md`: the original rebuild plan.
- `architecture.md`: the original architecture writeup.
- `architecture-critique.md`: a self-critique of that architecture.
- `forward-compat.md`: early forward-compatibility notes.
- `creating-a-cairn-site.md`: the 0.10-era living draft the tutorial and guides superseded;
  it still holds dated design decisions (the scaffold-copy ruling, the extension seam).
