// cairn-cms: the public delivery entry (@glw907/cairn-cms/delivery). The node-safe data surface
// (re-exported from ./delivery/data) plus the SvelteKit catch-all route loaders. The head component
// lives at ./delivery/head. Importing this pulls @sveltejs/kit through the route loaders, so a
// plain-Node tool imports from ./delivery/data instead.
export * from './data.js';
export { createPublicRoutes } from './public-routes.js';
export type {
  PublicRoutesDeps,
  ListData,
  TagData,
  TagIndexData,
  EntryData,
} from './public-routes.js';
