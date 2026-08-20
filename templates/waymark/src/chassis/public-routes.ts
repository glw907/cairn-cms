// The showcase's one PublicRoutesConfig literal: the injected dependencies createPublicRoutes and
// previewLoad both compose entries through (site/render/origin plus the SEO and media defaults).
// Both `(site)/[...path]/+page.server.ts` (the build's prerendered entry route) and
// `(site)/preview/[token]/+page.server.ts` (the preview pass's runtime route) import this ONE
// binding, so a site can never drift the two routes' rendering config apart by editing one copy and
// forgetting the other.
import type { PublicRoutesConfig } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from './content.js';
import { cairn, publicMediaResolver, mediaEnabled, siteConfig } from '$theme/cairn.config.js';

export const publicRoutesConfig: PublicRoutesConfig = {
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
  // The same resolver the body render path uses, injected so the read path resolves the frontmatter
  // `image` hero into the `heroImage` projection the template and the SEO head read.
  resolveMedia: publicMediaResolver,
  // Arms the engine's media.resolver_absent diagnostic: with media on, dropping resolveMedia above
  // logs a warning instead of silently shipping broken hero images.
  assetsEnabled: mediaEnabled,
};
