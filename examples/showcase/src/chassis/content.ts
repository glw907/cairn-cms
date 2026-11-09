// This site's one delivery content layer: it globs the markdown and hands the adapter to
// createSiteResolver, which buckets the files by each concept's dir and builds the typed resolver.
// The cairnManifest() Vite plugin owns the build-time manifest verify (it runs outside the prerender
// lifecycle, so a stale manifest fails the build red regardless of the handleHttpError policy).
import { createSiteResolver } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig, publicOrigin } from '#site/cairn.config.js';
import { siteName } from '#site/site-config.js';

const files = import.meta.glob<string>('/src/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const site = createSiteResolver(cairn, files);
export const posts = site.concept('posts');

// PublicRoutesConfig.description is required, so a site that sets none in site.config.yaml
// still gets a real value rather than an empty SEO tag.
const DEFAULT_SITE_DESCRIPTION = 'A cairn site.';

/**
 * The site's identity, composed once. `PublicRoutesConfig`'s `siteName`/`description` fields,
 *  robots.txt, the sitemap, and the feed all read this rather than each composing
 *  `site-config.ts`'s `siteName`, `siteConfig.description`, and `publicOrigin` on their own. `title`
 *  reads the same `site-config.ts` export the root layout server load does, so the name has
 *  exactly one source no matter which module reads it.
 */
export const siteMeta = {
  title: siteName,
  description: siteConfig.description ?? DEFAULT_SITE_DESCRIPTION,
  origin: publicOrigin,
};
