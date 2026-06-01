// The showcase's one delivery content layer: it globs the markdown, derives the descriptors
// with siteDescriptors, builds a validated per-concept index, and unions them into the site
// index every public route reads.
import {
  createContentIndex,
  createSiteIndex,
  fromGlob,
  siteDescriptors,
  type SiteIndex,
} from '@glw907/cairn-cms/delivery';
import { parseSiteConfig } from '@glw907/cairn-cms';
import { cairn } from './cairn.config.js';
import siteYaml from './site.config.yaml?raw';

const descriptors = siteDescriptors(cairn, parseSiteConfig(siteYaml));
const byId = Object.fromEntries(descriptors.map((d) => [d.id, d]));

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

export const site: SiteIndex = createSiteIndex([
  { descriptor: byId.posts, index: createContentIndex(fromGlob(postsRaw), byId.posts) },
  { descriptor: byId.pages, index: createContentIndex(fromGlob(pagesRaw), byId.pages) },
]);

export const ORIGIN = 'https://showcase.test';
export const SITE_DESCRIPTION = 'The cairn showcase site.';
