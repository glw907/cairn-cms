// The showcase's one delivery content layer: it globs the markdown and hands the adapter to the
// full-auto createSiteIndexes, which builds the typed per-concept indexes and the site resolver.
// The cairnManifest() Vite plugin owns the build-time manifest verify (it runs outside the prerender
// lifecycle, so a stale manifest fails the build red regardless of the handleHttpError policy).
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from '$theme/cairn.config.js';

const postsRaw = import.meta.glob('/src/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fragmentsRaw = import.meta.glob('/src/content/fragments/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, {
  posts: postsRaw,
  pages: pagesRaw,
  fragments: fragmentsRaw,
});

export const site = indexes.site;
export const posts = indexes.posts;

// The public origin as a literal: it is read at build time by the feed and sitemap, and
// `PUBLIC_ORIGIN` in `wrangler.jsonc` is the Worker's runtime value for the same host.
const ORIGIN = 'https://showcase.test';

// Read through `siteMeta` below, the one composed identity every caller imports.
const SITE_DESCRIPTION = 'The cairn showcase site.';

/**
 * The site's identity, composed once. `PublicRoutesConfig`'s `siteName`/`description` fields,
 *  robots.txt, the sitemap, and the feed all read this rather than each composing
 *  `siteConfig.siteName`, `SITE_DESCRIPTION`, and `ORIGIN` on their own.
 */
export const siteMeta = {
  title: siteConfig.siteName,
  description: SITE_DESCRIPTION,
  origin: ORIGIN,
};
