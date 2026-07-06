// This theme's one delivery content layer: it globs the markdown and hands the adapter to the
// full-auto createSiteIndexes, which builds the typed per-concept index and the site resolver.
// The cairnManifest() Vite plugin owns the build-time manifest verify (it runs outside the prerender
// lifecycle, so a stale manifest fails the build red regardless of the handleHttpError policy).
// Differs from the canonical chassis copy (examples/showcase/src/chassis/content.ts) in one way:
// this theme declares no `posts` concept (it has no blog, per the capability test's own content-
// model finding; see src/theme/cairn.config.ts), so it globs and passes only `pages`.
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { cairn, siteConfig } from '$theme/cairn.config.js';

const pagesRaw = import.meta.glob('/src/content/pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const indexes = createSiteIndexes(cairn, siteConfig, { pages: pagesRaw });

export const site = indexes.site;
export const pages = indexes.pages;

export const ORIGIN = 'https://gallery-theme.test';
export const SITE_DESCRIPTION = 'A photo-gallery cairn theme, ported from Nico Kaiser\'s hugo-theme-gallery.';
