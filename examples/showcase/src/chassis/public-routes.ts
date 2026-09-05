// The showcase's one PublicRoutesConfig literal, carrying site/render/origin plus the SEO
// (siteName, description, defaultImage, feeds) and media (resolveMedia, assetsEnabled) fields.
// `(site)/[...path]/+page.server.ts` (the build's prerendered entry route, via createPublicRoutes)
// and `(site)/preview/[token]/+page.server.ts` (the runtime preview route, via previewLoad) both
// import this ONE binding, so those two routes can never drift their rendering config apart by
// editing one copy and forgetting the other. `(site)/[...path=md]/+server.ts`, the raw-markdown
// route, is a third createPublicRoutes caller that does NOT import this binding: it hand-rolls its
// own object with seven of these nine fields, dropping defaultImage and feeds, since markdownLoad
// serves the raw body with no SEO head to feed them into.
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
