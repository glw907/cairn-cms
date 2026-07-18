// The one flag the root layout needs from the server: whether the site registers any island at
// all. SvelteKit never ships a `+layout.server.ts` module (or anything it imports) to the client,
// so this reads the theme's island registry directly with no client-bundle cost, and the root
// layout's own client script imports only the returned boolean, never the registry module itself
// (see `$theme/islands/registry.js` for why importing the registry client-side stays gated behind
// this flag rather than happening unconditionally).
import type { LayoutServerLoad } from './$types';
import { siteIslands } from '$theme/islands/registry.js';

export const load: LayoutServerLoad = () => {
  return { hasIslands: Object.keys(siteIslands).length > 0 };
};
