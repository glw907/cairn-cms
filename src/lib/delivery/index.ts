// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The node-safe data surface
// (re-exported from ./delivery/data) plus the SvelteKit catch-all route loaders. The head component
// lives at ./delivery/head. Importing this pulls @sveltejs/kit through the route loaders, so a
// plain-Node tool imports from ./delivery/data instead. Anything proposed here must be a
// SvelteKit-route-facing reader (a loader, a response helper) or already live on /delivery/data; a
// pure projection with no kit dependency belongs on /delivery/data alone, and the .svelte head
// component stays split onto /delivery/head so neither pulls Svelte into a plain-Node build.
export * from './data.js';
export { createPublicRoutes, composeEntryData } from './public-routes.js';
export type { PublicRoutesConfig, PublicRoutes, EntryData, EntryDataOverrides } from './public-routes.js';
// `PublicRoutesConfig.resolveMedia` and `EntryData`'s render call both name `MediaResolve` and its
// own `MediaRef` parameter; `./data.js` already re-exports both (its own `SiteRender` closure
// names them too), so this barrel needs no separate export.
