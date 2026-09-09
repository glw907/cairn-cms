// The four things the root layout needs from the server: whether the site registers any island
// at all, the primary nav SiteHeader renders, the footer nav SiteFooter renders, and the site
// name SiteHeader/SiteFooter's wordmark and every public `<title>` read (all three mounts of it:
// the (site) group's layout, the root +error.svelte, and the members routes, which sit above,
// beside, and outside that layout respectively, so only a root-level load reaches all of them).
// SvelteKit never ships a `+layout.server.ts` module (or anything it imports) to the client, so
// this reads the theme's island registry and its lean site-config reader directly with no
// client-bundle cost; the root layout's own client script imports only the returned boolean,
// never the registry module itself (see `$theme/islands/registry.js` for why importing the
// registry client-side stays gated behind that flag rather than happening unconditionally).
// `site-config.ts`, not `$theme/cairn.config.js`, is the import for the nav and the site name on
// purpose: the full adapter also builds the renderer, the icon set, and the registered
// components, none of which this load needs, and every non-prerendered request (`/admin/**`,
// `/members/**`, the runtime 404 path) pays this load's cost on every request.
// `$chassis/content.js`'s `siteMeta.title` reads the same `site-config.ts` export, so the name
// still has exactly one source no matter which module reads it.
import type { LayoutServerLoad } from './$types';
import { siteIslands } from '$theme/islands/registry.js';
import { primaryNav, footerNav, siteName } from '$theme/site-config.js';

export const load: LayoutServerLoad = () => {
  return {
    hasIslands: Object.keys(siteIslands).length > 0,
    nav: primaryNav,
    footerNav,
    siteName,
  };
};
