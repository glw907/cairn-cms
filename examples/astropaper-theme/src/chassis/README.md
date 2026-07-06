# The chassis (this theme's copy)

This is the canonical chassis, copied verbatim from `examples/showcase/src/chassis` at port
time (the "one chassis, N themes" ontology: each site's chassis files come from the showcase's
canonical copy verbatim, per `docs/superpowers/plans/2026-07-05-chassis-restructure.md`). Read
the canonical README there for the full boundary rule, every override seam, and the
subtraction table; this file only notes what differs in this copy.

## What this port does not carry

This theme demonstrates the pure public-content seam, so it never mounts an editor-facing
admin. Two chassis files the canonical copy documents are intentionally not carried over:

| File | Why it is absent here |
| --- | --- |
| `cairn.server.ts` | Only needed by the `/admin` mount and `/media` serving; this theme ships no admin route, so nothing imports it. |
| `dev-gate.ts` | Only needed by the dev-backend feature flag `cairn.server.ts` reads; with no admin, nothing reads it either. |

Both removals follow the canonical README's own subtraction notes exactly (each names its real
dependents; dropping the dependent along with the file leaves nothing dangling). Every other
file here (`content.ts`, `feed.ts`, `render.ts`, `tokens.css`, `prose.css`, `composition.css`)
is unmodified from the canonical copy.
