// The two things the root layout needs from the server: whether the site registers any island at
// all, and the primary nav SiteHeader renders (both mounts of it: the (site) group's layout and
// the root +error.svelte, which sit above and beside that layout respectively, so only a
// root-level load reaches both). SvelteKit never ships a `+layout.server.ts` module (or anything
// it imports) to the client, so this reads the theme's island registry and its lean site-config
// reader directly with no client-bundle cost; the root layout's own client script imports only the
// returned boolean, never the registry module itself (see `$theme/islands/registry.js` for why
// importing the registry client-side stays gated behind that flag rather than happening
// unconditionally). `site-config.ts`, not `$theme/cairn.config.js`, is the import here on
// purpose: the full adapter also builds the renderer, the icon set, and the registered
// components, none of which a nav array needs.
import type { LayoutServerLoad } from './$types';
import { siteIslands } from '$theme/islands/registry.js';
import { primaryNav } from '$theme/site-config.js';

export const load: LayoutServerLoad = () => {
  return { hasIslands: Object.keys(siteIslands).length > 0, nav: primaryNav };
};
