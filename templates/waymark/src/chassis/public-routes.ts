// This site's one PublicRoutesConfig literal, carrying site/render/origin plus the SEO
// (siteName, description, defaultImage, feeds) and media (resolveMedia, assetsEnabled) fields.
// `(site)/[...path]/+page.server.ts` (the build's prerendered entry route, via createPublicRoutes),
// `(site)/preview/[token]/+page.server.ts` (the runtime preview route, via previewLoad), and
// `(site)/[...path=md]/+server.ts` (the raw-markdown route, via createPublicRoutes) all import
// this ONE binding, so the three routes can never drift their rendering config apart by editing
// one copy and forgetting the others.
import type { PublicRoutesConfig } from '@glw907/cairn-cms/delivery';
import { site, siteMeta } from './content.js';
import { cairn, publicMediaResolver, mediaEnabled } from '$theme/cairn.config.js';

export const publicRoutesConfig: PublicRoutesConfig = {
  site,
  render: cairn.rendering.render,
  origin: siteMeta.origin,
  siteName: siteMeta.title,
  description: siteMeta.description,
  defaultImage: siteMeta.origin + '/og/default.png',
  feeds: { rss: siteMeta.origin + '/feed.xml', json: siteMeta.origin + '/feed.json' },
  // The same resolver the body render path uses, injected so the read path resolves the frontmatter
  // `image` hero into the `heroImage` projection the template and the SEO head read.
  resolveMedia: publicMediaResolver,
  // Arms the engine's media.resolver_absent diagnostic: with media on, dropping resolveMedia above
  // logs a warning instead of silently shipping broken hero images.
  assetsEnabled: mediaEnabled,
};
