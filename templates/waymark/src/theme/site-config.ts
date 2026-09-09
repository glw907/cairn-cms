// The lean site-config reader: the one parseSiteConfig call site. Kept separate from
// cairn.config.ts so the root layout server load (and anything else that needs only the parsed
// config or the primary menu) never pulls in the full adapter (the renderer, the icon set, the
// registered components), which cairn.config.ts also builds. cairn.config.ts re-exports
// `siteConfig` from here rather than parsing it again, so exactly one parseSiteConfig call runs.
import { parseSiteConfig, readMenu } from '@glw907/cairn-cms';
import siteYaml from './site.config.yaml?raw';

/** The parsed site.config.yaml, the single source every reader (feeds, routes, nav) shares. */
export const siteConfig = parseSiteConfig(siteYaml);

/**
 * The site's name, read once here so the root layout server load (nav, footer nav, this) and
 * `$chassis/content.js`'s `siteMeta.title` (feeds, robots, sitemap, SEO) agree without either one
 * reading `siteConfig.siteName` a second time.
 */
export const siteName = siteConfig.siteName;

/**
 * The public header's primary menu, resolved from `menus.primary` at the same depth the admin
 * nav editor declares (`cairn.config.ts`'s `editor.nav.maxDepth`).
 */
export const primaryNav = readMenu(siteConfig, 'primary', 2);

/**
 * The public footer's menu, resolved from `menus.footer`, a flat (depth 1) list. `/admin/nav`
 * edits only `menus.primary` (the one menu `createNavRoutes` is bound to), so this block is
 * developer-edited directly in `site.config.yaml`.
 */
export const footerNav = readMenu(siteConfig, 'footer', 1);
