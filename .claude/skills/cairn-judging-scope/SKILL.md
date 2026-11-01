---
name: cairn-judging-scope
description: Decides whether a change belongs in the cairn engine or in the developer's own site, using the scope charter and the extending-developer lens. Use before adding an abstraction, a subsystem, an actor, an export, or any new surface, and when reviewing a spec or plan for scope.
---

# Judging scope

cairn owns its core job, managing markdown content and the editor and admin frame, and little else. Everything a site needs beyond that, its own functionality, actors, auth, data, and domain logic, belongs to the developer, and cairn serves it with a thin seam, not a built-in feature. Leanness is the point: "out of scope" is often the correct answer.

Run this premise check before correctness checks on any spec: is this cairn's job, and is it the leanest form? Then read `references/what-cairn-is-and-is-not.md`, the full charter.

The seams are the `CairnAdminShell` custom-route seam, `navLayout`, admin-scoped `locals.cairnEditor`, and the boundary `npm run check:surface` enforces. A developer who launches a content-managed site fast, builds their own functionality on top, and keeps pulling engine updates without rework is the persona beneath the charter. `references/extending-developer-lens.md` holds the diagnostic questions; it is a point-in-time brief, so verify its baseline before acting on it.

A settled item lives in `docs/internal/engine-rulings.md`. Read its entry before re-arguing the item, and never in place of the charter's own test.

## References

- `references/what-cairn-is-and-is-not.md`: the scope charter.
- `references/extending-developer-lens.md`: the persona and diagnostic questions.
