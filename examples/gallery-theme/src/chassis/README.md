# The chassis (this theme's copy)

This is the canonical chassis, copied verbatim from `examples/showcase/src/chassis` at port
time (the "one chassis, N themes" ontology: each site's chassis files come from the showcase's
canonical copy verbatim, per `docs/superpowers/plans/2026-07-05-chassis-restructure.md`). Read
the canonical README there for the full boundary rule, every override seam, and the
subtraction table; this file only notes what differs in this copy.

## What this port does not carry

This theme demonstrates the media/gallery capability test (theme-ports-1-3, port 3), so it never
mounts an editor-facing admin, has no blog concept at all, and registers zero components (every
page's body is plain prose or has no body). Four chassis files the canonical copy documents are
intentionally not carried over:

| File | Why it is absent here |
| --- | --- |
| `cairn.server.ts` | Only needed by the `/admin` mount and `/media` serving; this theme ships no admin route, so nothing imports it. |
| `dev-gate.ts` | Only needed by the dev-backend feature flag `cairn.server.ts` reads; with no admin, nothing reads it either. |
| `feed.ts` | Maps a `posts` index into the RSS/JSON Feed shape; this theme declares no `posts` concept (it has no blog), so nothing builds a feed. |
| `render.ts` | Wires a theme's icon set into a `defineComponent()` build function; this theme's registry is empty (`defineRegistry({ components: [] })` in `cairn.config.ts`), so nothing calls `makeIconRenderer`. Chrome icons are plain `@lucide/svelte` components, outside the render-seam entirely. |

All four removals follow the canonical README's own subtraction notes exactly (each names its
real dependents; dropping the dependent along with the file leaves nothing dangling). This theme
does keep `theme-toggle.ts`: the light/dark switch is cheap chassis machinery and the family's
usual default, even though the upstream Hugo demo hardcodes a single dark theme. Every other file
here (`content.ts`, `tokens.css`, `prose.css`, `composition.css`) is unmodified from the canonical
copy.
