// The showcase's one delivery content layer: it globs the markdown and hands the adapter to the
// full-auto createSiteIndexes, which builds the typed per-concept indexes and the site resolver.
import { createSiteIndexes, buildSiteManifest } from '@glw907/cairn-cms/delivery';
import { verifyManifest } from '@glw907/cairn-cms';
import { cairn, siteConfig } from './cairn.config.js';
import manifestRaw from '/src/content/.cairn/index.json?raw';

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

const indexes = createSiteIndexes(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw });

// The build regenerates the manifest from the corpus and fails if the committed file drifted, so a
// raw-git content edit cannot ship a stale manifest. Regenerate with `npm run cairn:manifest`.
verifyManifest(buildSiteManifest(cairn, siteConfig, { posts: postsRaw, pages: pagesRaw }), manifestRaw);

export const site = indexes.site;
export const posts = indexes.posts;
export const pages = indexes.pages;

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
