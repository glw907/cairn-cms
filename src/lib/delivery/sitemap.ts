// cairn-cms: sitemap builder (public-delivery design). Pure over a URL list; the caller
// derives the list from the content index and the routable concepts.
import { escapeXml } from './xml.js';

/** One sitemap URL. `lastmod` is a YYYY-MM-DD date. */
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
}

/** Build a sitemap XML document from a list of URLs. */
export function buildSitemap(urls: SitemapUrl[]): string {
  const entries = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

// A dynamic route's instances are enumerated per-entry elsewhere (one per tag, one per content
// permalink), never once by the route id itself, so the unlisted-route check must never demand a
// literal match for one.
function isDynamicRouteId(routeId: string): boolean {
  return /\[.+\]/.test(routeId);
}

// The URL path a SvelteKit route id serves, with every route-group segment (a name in
// parentheses) dropped, since a group contributes no URL segment of its own. The group's own
// root normalizes to the home path.
function routeIdToPath(routeId: string): string {
  const segments = routeId.split('/').filter((segment) => segment !== '' && !/^\(.*\)$/.test(segment));
  return segments.length ? `/${segments.join('/')}` : '/';
}

/**
 * The site's own static route ids missing from `listedPaths`, the flat list of root-relative
 *  paths the sitemap already accounts for (typically the same `extraRoutes` array passed to
 *  `sitemapView`, from `./views.js`). Feed it the route ids under your public route tree, one per
 *  page directory; a route-group segment is stripped before comparing, and a dynamic route id
 *  (one with a `[param]` or `[...rest]` segment) is never flagged, since its instances are
 *  enumerated per-entry rather than per-route. A site wires this into its own test suite so a new
 *  page directory that never joined the sitemap's hand-list fails the build instead of shipping
 *  a silent gap.
 */
export function unlistedRoutes(routeIds: string[], listedPaths: string[]): string[] {
  return routeIds
    .filter((routeId) => !isDynamicRouteId(routeId))
    .map(routeIdToPath)
    .filter((path) => !listedPaths.includes(path));
}
