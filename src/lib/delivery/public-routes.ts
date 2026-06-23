// cairn-cms: public route loaders (dated-slug design). The factory closes over the site
// resolver, the runtime render, and the origin. entryLoad and entries are site-wide: one catch-all
// `[...path]` route resolves any concept by request path through `byPermalink`. The archive, tag,
// and tag-index loaders stay concept-scoped, keyed by concept id. The resolver is built in site
// code from globs, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentSummary, ContentEntry } from './content-index.js';
import type { SiteResolver } from './site-resolver.js';
import { buildSeoMeta } from './seo.js';
import type { SeoMeta } from './seo.js';
import { readSeoFields, resolveImageUrl } from './seo-fields.js';
import { buildLinkResolver } from './site-resolver.js';
import type { LinkResolve } from '../content/links.js';
import type { MediaResolve } from '../render/resolve-media.js';
import { parseMediaToken } from '../media/reference.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  site: SiteResolver;
  render: (md: string, opts?: { stagger?: boolean; resolve?: LinkResolve }) => string | Promise<string>;
  origin: string;
  /** Site name for og:site_name and the SEO head. */
  siteName: string;
  /** Default description used when an entry has none. */
  description: string;
  /** Absolute feed URLs for the head's autodiscovery links. */
  feeds?: { rss?: string; json?: string };
  /**
   * A site-wide default OG image, used when an entry declares none. Resolved to absolute like the
   *  canonical URL, so a relative path such as "/og/default.png" works.
   */
  defaultImage?: string;
  /**
   * Resolve a frontmatter `media:` hero reference to its delivery path. The site builds this from its
   *  committed `media.json` exactly as it builds the body resolver (`makeMediaResolver`). When absent,
   *  media is off and no `heroImage` projection is derived.
   */
  resolveMedia?: MediaResolve;
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
  concept: string;
  entry: ContentEntry;
  html: string;
  canonicalUrl: string;
  seo: SeoMeta;
  newer?: ContentSummary;
  older?: ContentSummary;
  /**
   * The resolved hero image, a derived projection of the frontmatter `image` field. `url` is the
   *  root-relative delivery path for an `<img>`, `absoluteUrl` the origin-anchored form for the
   *  og:image, and `alt`/`caption` carry from the stored object. The canonical token is untouched:
   *  `entry.frontmatter.image.src` stays the `media:` token. Undefined when no hero is set, media is
   *  off, the reference does not parse, or the resolver finds no asset.
   */
  heroImage?: { url: string; absoluteUrl?: string; alt: string; caption?: string };
}

/** Build the public loaders for a site's unified index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { site, render, origin, siteName, description, feeds, defaultImage, resolveMedia } = deps;

  /**
   * Derive the hero projection from an entry's frontmatter, without mutating it (locked decision 5).
   *  The hero lives at the conventional `image` key as the validated nested object `{ src, alt, caption }`;
   *  only an image field's validate arm produces an object-with-string-`src` shape, so detecting that
   *  structure is enough (a text field stores a string, a tags field an array). Returns undefined when
   *  media is off, no hero is set, the token does not parse, or the resolver finds no asset.
   *
   *  Scope: this resolves the `image` key, which is the back-compat SEO default the schema's `seo`
   *  flag also defaults to. A concept that renames its hero (e.g. `cover`) with `seo: true` validates
   *  and renders in the editor, but its delivery resolution is not wired here yet, since the field
   *  declarations are not reachable in the delivery read path. Honoring a renamed `seo`-flagged field
   *  (and a second image field per concept) at delivery is a carried follow-up; every consumer today
   *  uses `image`.
   */
  function deriveHeroImage(frontmatter: Record<string, unknown>): EntryData['heroImage'] {
    if (!resolveMedia) return undefined;
    const value = frontmatter.image;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const obj = value as { src?: unknown; alt?: unknown; caption?: unknown };
    if (typeof obj.src !== 'string' || obj.src === '') return undefined;
    const ref = parseMediaToken(obj.src);
    if (!ref) return undefined;
    const path = resolveMedia(ref);
    if (!path) return undefined;
    const hero: NonNullable<EntryData['heroImage']> = {
      url: path,
      absoluteUrl: resolveImageUrl(path, origin),
      alt: typeof obj.alt === 'string' ? obj.alt : '',
    };
    if (typeof obj.caption === 'string' && obj.caption !== '') hero.caption = obj.caption;
    return hero;
  }

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
    const heroImage = deriveHeroImage(entry.frontmatter);
    // The SEO unify (locked decision 3): a resolved structured hero is the social card and wins over
    // the back-compat string `image` field and the site default. A bare-string `image` keeps its
    // origin-anchored behavior. An empty hero alt emits no twitter:image:alt.
    const rawImage = fields.image ?? defaultImage;
    const image = heroImage?.absoluteUrl ?? (rawImage ? resolveImageUrl(rawImage, origin) : undefined);
    const imageAlt = heroImage?.alt && heroImage.alt.trim() !== '' ? heroImage.alt : undefined;
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
      ...(imageAlt ? { imageAlt } : {}),
      ...(fields.robots ? { robots: fields.robots } : {}),
      ...(fields.author ? { author: fields.author } : {}),
      ...(entry.date ? { feeds } : {}),
    });
    return { concept: entry.concept, entry, html: await render(entry.body, { stagger: true, resolve: buildLinkResolver(site) }), canonicalUrl, seo, newer, older, ...(heroImage ? { heroImage } : {}) };
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
