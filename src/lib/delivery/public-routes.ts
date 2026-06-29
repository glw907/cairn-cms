// cairn-cms: public route resolution (dated-slug design). The factory closes over the site
// resolver, the runtime render, and the origin. One catch-all `[...path]` route resolves any
// request path through `resolveRoute`, which the engine's `SiteResolver.resolveRoute` discriminates
// into an entry, a tag index, or a tag archive; the entry kind carries the rendered html, seo, and
// hero this layer derives. `entries` enumerates the prerender paths. The resolver is built in site
// code from globs, so it stays in the prerender graph and out of the runtime Worker.
import type { ContentSummary, ContentEntry } from './content-index.js';
import type { SiteResolver } from './site-resolver.js';
import { buildSeoMeta } from './seo.js';
import type { SeoMeta } from './seo.js';
import { readSeoFields, resolveImageUrl } from './seo-fields.js';
import { buildLinkResolver } from './site-resolver.js';
import type { SiteRender } from '../content/types.js';
import type { MediaResolve } from '../render/resolve-media.js';
import { parseMediaToken } from '../media/reference.js';
import { log } from '../log/index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesDeps {
  site: SiteResolver;
  render: SiteRender;
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
  /**
   * Whether the site configured media on, read from `runtime.resolvedAssets.enabled`. It exists only
   *  to diagnose a forgotten wire-point: media on but no `resolveMedia` reached this factory, which
   *  renders public hero and body images as bare `media:` tokens. When true and `resolveMedia` is
   *  absent, the factory emits `media.resolver_absent` once at construction. It does not change
   *  resolution; `resolveMedia` alone still gates the hero projection.
   */
  assetsEnabled?: boolean;
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

/**
 * The discriminated payload one catch-all route renders by `kind`: an entry (with its rendered html,
 *  seo, and hero), a concept's tag index, or one tag's archive. It is the delivery-layer mirror of the
 *  engine's `ResolvedRoute`: the engine resolves a path to data, this layer folds in the render. A
 *  resolution miss is `undefined`, and the route layer throws the 404.
 */
export type ResolvedRouteData =
  | ({ kind: 'entry' } & EntryData)
  | ({ kind: 'tagIndex'; concept: string } & TagIndexData)
  | ({ kind: 'tagArchive'; concept: string } & TagData);

/** Build the public route resolver for a site's unified index. */
export function createPublicRoutes(deps: PublicRoutesDeps) {
  const { site, render, origin, siteName, description, feeds, defaultImage, resolveMedia, assetsEnabled } = deps;

  // Diagnose a forgotten wire-point: media is configured on but no resolver reached this factory, so
  // every public hero and body `media:` token renders bare (the ecxc 0.57.0 finding). The condition
  // is a property of the wiring, not of any one load, so it is checked once here at construction
  // rather than per entryLoad or per image, which keeps the warning loud-once and out of the
  // prerender hot path. Resolution is unchanged; resolveMedia alone still gates the hero projection.
  if (assetsEnabled && !resolveMedia) {
    log.warn('media.resolver_absent', { enabled: true });
  }

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

  /**
   * Resolve a request path to its discriminated payload, or `undefined` for a miss (the route layer
   *  throws the 404). The entry kind folds in the render, seo, and hero exactly as the old `entryLoad`
   *  did, sourcing the entry from the engine resolution rather than a second `byPermalink` lookup.
   */
  async function resolveRoute(event: { url: URL }): Promise<ResolvedRouteData | undefined> {
    const resolved = site.resolveRoute(event.url.pathname);
    if (!resolved) return undefined;
    if (resolved.kind === 'tagIndex') {
      return { kind: 'tagIndex', concept: resolved.concept, tags: resolved.tags };
    }
    if (resolved.kind === 'tagArchive') {
      return { kind: 'tagArchive', concept: resolved.concept, tag: resolved.tag, entries: resolved.entries };
    }
    const entry = resolved.entry;
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
    return {
      kind: 'entry',
      concept: entry.concept,
      entry,
      html: await render({
        body: entry.body,
        concept: entry.concept,
        frontmatter: entry.frontmatter,
        resolve: buildLinkResolver(site),
      }),
      canonicalUrl,
      seo,
      newer,
      older,
      ...(heroImage ? { heroImage } : {}),
    };
  }

  /** Prerender enumeration: one `{ path }` per route across every concept. */
  function entries(): { path: string }[] {
    return site.entries();
  }

  return { resolveRoute, entries };
}
