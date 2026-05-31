// cairn-cms: public route loaders (dated-slug design). The factory closes over the site-level
// index, the runtime render, and the origin. entryLoad and entries are site-wide: one catch-all
// `[...path]` route resolves any concept by request path through `byPermalink`. The archive, tag,
// and tag-index loaders stay concept-scoped, keyed by concept id. The index is built in site code
// from globs, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentSummary, ContentEntry } from '../delivery/content-index.js';
import type { SiteIndex } from '../delivery/site-index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  site: SiteIndex;
  render: (md: string, opts?: { stagger?: boolean }) => string | Promise<string>;
  origin: string;
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
  newer?: ContentSummary;
  older?: ContentSummary;
}

/** Build the public loaders for a site's unified index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { site, render, origin } = deps;

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
    return { entry, html: await render(entry.body, { stagger: true }), canonicalUrl: origin + entry.permalink, newer, older };
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
