// cairn-cms: public route loaders (dated-slug design). The factory closes over the site-level
// index, the runtime render, and the origin. entryLoad and entries are site-wide: one catch-all
// `[...path]` route resolves any concept by request path through `byPermalink`. The archive, tag,
// and tag-index loaders stay concept-scoped, keyed by concept id. The index is built in site code
// from globs, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentSummary, ContentEntry } from '../delivery/content-index.js';
import type { SiteIndex } from '../delivery/site-index.js';
import { buildSeoMeta } from '../delivery/seo.js';
import type { SeoMeta } from '../delivery/seo.js';
import { readSeoFields, resolveImageUrl } from '../delivery/seo-fields.js';
import { buildLinkResolver } from '../delivery/manifest.js';
import type { LinkResolve } from '../content/links.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  site: SiteIndex;
  render: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
  origin: string;
  /** Site name for og:site_name and the SEO head. */
  siteName: string;
  /** Default description used when an entry has none. */
  description: string;
  /** Absolute feed URLs for the head's autodiscovery links. */
  feeds?: { rss?: string; json?: string };
  /** A site-wide default OG image, used when an entry declares none. Resolved to absolute like the
   *  canonical URL, so a relative path such as "/og/default.png" works. */
  defaultImage?: string;
}

/** The archive and tag list data: summaries the template renders. */
export interface ListData {
  entries: ContentSummary[];
}

/** A single tag's data plus the tag it filtered on. */
export interface TagData extends ListData {
  tag: string;
}

/** The tag-index data: every tag with its count. */
export interface TagIndexData {
  tags: { tag: string; count: number }[];
}

/** One entry's data: the detail entry, its rendered html, and its canonical URL. */
export interface EntryData {
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
}

/** Build the public loaders for a site's unified index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { site, render, origin, siteName, description, feeds, defaultImage } = deps;

  /** Resolve one concept's index by id, or a 404 (the route names an unconfigured concept). */
  function indexOf(conceptId: string) {
    const index = site.concept(conceptId);
    if (!index) throw error(404, `Unknown content type: ${conceptId}`);
    return index;
  }

  /** One entry by request path, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    const { newer, older } = site.adjacent(entry);
    const canonicalUrl = origin + entry.permalink;
    const fields = readSeoFields(entry.frontmatter);
    const rawImage = fields.image ?? defaultImage;
    const image = rawImage ? resolveImageUrl(rawImage, origin) : undefined;
    // A dated entry is an article; an undated one (a page) is a website.
    const seo = buildSeoMeta({
      title: entry.title,
      description: fields.description || entry.excerpt || description,
      canonicalUrl,
      siteName,
      type: entry.date ? 'article' : 'website',
      ...(entry.date ? { published: entry.date } : {}),
      ...(entry.updated ? { modified: entry.updated } : {}),
      ...(image ? { image } : {}),
      ...(fields.robots ? { robots: fields.robots } : {}),
      ...(fields.author ? { author: fields.author } : {}),
      ...(entry.date ? { feeds } : {}),
    });
    return { entry, html: await render(entry.body, { stagger: true, resolve: buildLinkResolver(site) }), canonicalUrl, seo, newer, older };
  }

  /** The chronological archive for one concept: every non-draft summary, newest-first. */
  function archiveLoad(conceptId: string): ListData {
    return { entries: indexOf(conceptId).all() };
  }

  /** All tags with counts for one concept, for a tag index page. */
  function tagIndexLoad(conceptId: string): TagIndexData {
    return { tags: indexOf(conceptId).allTags() };
  }

  /** One tag's entries for one concept, or a 404 when the tag has none. */
  function tagLoad(conceptId: string, event: { params: { tag: string } }): TagData {
    const entries = indexOf(conceptId).byTag(event.params.tag);
    if (entries.length === 0) throw error(404, `No entries tagged "${event.params.tag}"`);
    return { tag: event.params.tag, entries };
  }

  /** Prerender enumeration: one `{ path }` per entry across every concept. */
  function entries(): { path: string }[] {
    return site.entries();
  }

  return { entryLoad, archiveLoad, tagIndexLoad, tagLoad, entries };
}
