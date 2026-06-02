// The showcase's one delivery content layer: it globs the markdown and hands the adapter to the
// full-auto createSiteIndexes, which builds the typed per-concept indexes and the site resolver.
import { createSiteIndexes } from '@glw907/cairn-cms/delivery';
import { parseSiteConfig } from '@glw907/cairn-cms';
import { cairn } from './cairn.config.js';
import siteYaml from './site.config.yaml?raw';

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

const indexes = createSiteIndexes(cairn, parseSiteConfig(siteYaml), { posts: postsRaw, pages: pagesRaw });

export const site = indexes.site;
export const posts = indexes.posts;
export const pages = indexes.pages;

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
