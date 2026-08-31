// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The node-safe data surface
// (re-exported from ./delivery/data) plus the SvelteKit catch-all route loaders. The head component
// lives at ./delivery/head. Importing this pulls @sveltejs/kit through the route loaders, so a
// plain-Node tool imports from ./delivery/data instead. Anything proposed here must be a
// SvelteKit-route-facing reader (a loader, a response helper) or already live on /delivery/data; a
// pure projection with no kit dependency belongs on /delivery/data alone, and the .svelte head
// component stays split onto /delivery/head so neither pulls Svelte into a plain-Node build.
// The layered half of the dependency-axis split: `/delivery` is `/delivery/data` plus the route
// loaders, so the two subpaths are ONE canonical home under the canonical-home rule (foundations
// A), never two. `/delivery/data` is the declaring barrel of the pair; this `export *` is the
// recorded R4 re-export of its whole surface, so a route file reaches a projection and a loader
// through one import.
export * from './data.js';
export { createPublicRoutes, composeEntryData } from './public-routes.js';
export type { PublicRoutesConfig, EntryData, EntryDataOverrides } from './public-routes.js';
// R4 closure over this barrel's own signatures, and the one place the pair diverges:
// `PublicRoutesConfig.render` names `SiteRender` (canonical home `.`), and its `resolveMedia`
// names `MediaResolve` (canonical home `.`) and that type's own `MediaRef` parameter (canonical
// home `/media`). Nothing `/delivery/data` publishes names any of the three, so the narrower
// barrel of the pair no longer carries them and this one re-exports them directly.
export type { SiteRender } from '../content/types.js';
export type { MediaResolve } from '../render/resolve-media.js';
export type { MediaRef } from '../media/reference.js';
