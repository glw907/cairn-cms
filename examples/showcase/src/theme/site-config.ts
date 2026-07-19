// The lean site-config reader: the one parseSiteConfig call site. Kept separate from
// cairn.config.ts so the root layout server load (and anything else that needs only the parsed
// config or the primary menu) never pulls in the full adapter (the renderer, the icon set, the
// registered components), which cairn.config.ts also builds. cairn.config.ts re-exports
// `siteConfig` from here rather than parsing it again, so exactly one parseSiteConfig call runs.
import { parseSiteConfig, extractMenu } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

/** The parsed site.config.yaml, the single source every reader (feeds, routes, nav) shares. */
export const siteConfig = parseSiteConfig(siteYaml);

/**
 * The public header's primary menu, resolved from `menus.primary` at the same depth the admin
 * nav editor declares (`cairn.config.ts`'s `editor.nav.maxDepth`).
 */
export const primaryNav = extractMenu(siteConfig, 'primary', 2);
