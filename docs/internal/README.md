# Internal docs

Maintainer-facing documents. Nothing here is part of the adopter docs; the public arms live one
level up.

Every top-level `.md` file here is listed below.

- [`engine-rulings.md`](engine-rulings.md): the rulings ledger. `grep '^## '` is the index. A ruling
  stays only while a session could re-argue it and the code does not state it; everything dropped is
  at the `pre-agent-first` tag.
- `consultations/`: briefs from consuming sites, each needing a verdict before a pass builds on it.
  Its [README](consultations/README.md) has the protocol.
- `credentials.md`: machine-local credential locations. Gitignored; it exists only on the
  maintainer's workstation.

Plans, specs, and research no longer live in the repository. A plan lives in its initiative's
`plans/` directory or on its pass branch. The planning record up to 2026-10-31 is at the
`pre-agent-first` tag (`https://github.com/glw907/cairn-cms/tree/pre-agent-first/docs`).
