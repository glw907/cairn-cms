// cairn-cms: public route loaders (public-delivery design, decision 6). A factory closes over
// a concept's index, the runtime render, and the origin, and returns thin load functions plus
// entries() for prerender. A site route file stays a one-line shim. The index is built in site
// code from a glob, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentIndex, ContentSummary, ContentEntry } from '../delivery/content-index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  index: ContentIndex;
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

/** Build the public loaders for one concept's index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { index, render, origin } = deps;

  /** The chronological archive: every non-draft summary, newest-first. */
  function archiveLoad(): ListData {
    return { entries: index.all() };
  }

  /** All tags with counts, for a tag index page. */
  function tagIndexLoad(): TagIndexData {
    return { tags: index.allTags() };
  }

  /** One tag's entries, or a 404 when the tag has none. */
  function tagLoad(event: { params: { tag: string } }): TagData {
    const tag = event.params.tag;
    const entries = index.byTag(tag);
    if (entries.length === 0) throw error(404, `No entries tagged "${tag}"`);
    return { tag, entries };
  }

  /** One entry by slug, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { params: { slug: string } }): Promise<EntryData> {
    const entry = index.byId(event.params.slug);
    if (!entry) throw error(404, `Not found: ${event.params.slug}`);
    const { newer, older } = index.adjacent(entry.id);
    return {
      entry,
      html: await render(entry.body, { stagger: true }),
      canonicalUrl: origin + entry.permalink,
      newer,
      older,
    };
  }

  /** Prerender enumeration: one `{ slug }` per non-draft entry. */
  function entries(): { slug: string }[] {
    return index.all().map((entry) => ({ slug: entry.id }));
  }

  return { archiveLoad, tagIndexLoad, tagLoad, entryLoad, entries };
}
