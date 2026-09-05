// cairn-cms: public route resolution (dated-slug design). The factory closes over the site
// resolver, the runtime render, and the origin. One catch-all `[...path]` route resolves any
// request path through `entryLoad`, which matches the path to a single entry through the engine's
// `SiteResolver.byPermalink`, folding in the rendered html, seo, and hero this layer derives, or
// throws a 404 on a miss. `entries` enumerates the prerender paths. The resolver is built in site
// code from globs, so it stays in the prerender graph and out of the runtime Worker.
import { error } from '@sveltejs/kit';
import type { ContentSummary, ContentEntry } from './content-index.js';
import type { SiteResolver } from './site-resolver.js';
import { buildSeoMeta } from './seo.js';
import type { SeoMeta } from './seo.js';
import { readSeoFields, resolveImageUrl } from './seo-fields.js';
import { createLinkResolver, createFragmentResolver } from './site-resolver.js';
import type { SiteRender } from '../content/types.js';
import type { LinkResolve } from '../content/links.js';
import type { FragmentResolve, MarkedFragmentResolve } from '../render/resolve-include.js';
import type { MediaResolve } from '../render/resolve-media.js';
import { parseMediaToken } from '../media/reference.js';
import { log } from '../log/index.js';

/** Injected dependencies for the public loaders. */
export interface PublicRoutesConfig {
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
   *  committed `media.json` exactly as it builds the body resolver (`createMediaResolver`). When absent,
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
function deriveHeroImage(
  frontmatter: Record<string, unknown>,
  resolveMedia: MediaResolve | undefined,
  origin: string,
): EntryData['heroImage'] {
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
 * Substitutes for {@link composeEntryData}'s three resolvers, each defaulting to the build's own
 *  (throwing) pair drawn from `config.site`, or `config.resolveMedia` for the hero. `previewLoad`
 *  is the first caller to pass these: the marking link and fragment resolvers built from
 *  a pending branch's manifest, and a request-time media resolver built from that branch's
 *  `media.json`. The hero derivation consumes `resolveMedia` from here too, not only the body render.
 */
export interface EntryDataOverrides {
  /** Substitutes `createLinkResolver(config.site)`. */
  resolveLink?: LinkResolve;
  /** Substitutes `createFragmentResolver(config.site)`. */
  resolveFragment?: FragmentResolve;
  /** Substitutes `config.resolveMedia`, consumed by both the hero derivation and the body render. */
  resolveMedia?: MediaResolve;
}

/**
 * Compose one entry's public data shape: the rendered html, its SEO, its adjacent-entry pair, and
 *  its hero projection. `createPublicRoutes`'s `entryLoad` is lookup-then-compose over this
 *  function with no overrides, so its output is unchanged; `previewLoad` is the first
 *  caller to pass `overrides`, substituting the marking resolvers and a request-time media
 *  resolver in place of the build's throwing pair and the site's committed `media.json`.
 */
export async function composeEntryData(
  config: PublicRoutesConfig,
  entry: ContentEntry,
  overrides?: EntryDataOverrides,
): Promise<EntryData> {
  const { site, render, origin, siteName, description, feeds, defaultImage } = config;
  const resolveMedia = overrides?.resolveMedia ?? config.resolveMedia;
  const { newer, older } = site.adjacent(entry);
  const canonicalUrl = origin + entry.permalink;
  const fields = readSeoFields(entry.frontmatter);
  const heroImage = deriveHeroImage(entry.frontmatter, resolveMedia, origin);
  // The SEO unify (locked decision 3): a resolved structured hero is the social card and wins over
  // the back-compat string `image` field and the site default. A bare-string `image` keeps its
  // origin-anchored behavior. An empty hero alt emits no twitter:image:alt.
  const rawImage = fields.image ?? defaultImage;
  const image = heroImage?.absoluteUrl ?? (rawImage ? resolveImageUrl(rawImage, origin) : undefined);
  const imageAlt = heroImage?.alt && heroImage.alt.trim() !== '' ? heroImage.alt : undefined;
  // Stamp the containing entry onto the engine's own fragment resolver, the marker
  // remarkResolveIncludes reads to name the entry in an include.missing record. A caller that
  // substitutes its own resolver (previewLoad) stamps it where it builds it, so nothing here
  // mutates a function it did not create.
  let resolveFragment = overrides?.resolveFragment;
  if (!resolveFragment) {
    const built: MarkedFragmentResolve = createFragmentResolver(site);
    built.entry = `${entry.concept}/${entry.id}`;
    resolveFragment = built;
  }
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
    concept: entry.concept,
    entry,
    html: await render({
      body: entry.body,
      concept: entry.concept,
      frontmatter: entry.frontmatter,
      resolve: overrides?.resolveLink ?? createLinkResolver(site),
      resolveFragment,
      resolveMedia,
    }),
    canonicalUrl,
    seo,
    newer,
    older,
    ...(heroImage ? { heroImage } : {}),
  };
}

/** Build the public route resolver for a site's unified index. */
export function createPublicRoutes(config: PublicRoutesConfig): PublicRoutes {
  const { site, resolveMedia, assetsEnabled } = config;

  // Diagnose a forgotten wire-point: media is configured on but no resolver reached this factory, so
  // every public hero and body `media:` token renders bare (a consuming site's 0.57.0 finding). The condition
  // is a property of the wiring, not of any one load, so it is checked once here at construction
  // rather than per entryLoad or per image, which keeps the warning loud-once and out of the
  // prerender hot path. Resolution is unchanged; resolveMedia alone still gates the hero projection.
  if (assetsEnabled && !resolveMedia) {
    log.warn('media.resolver_absent');
  }

  /** One entry by request path, rendered through the site renderer, or a 404. */
  async function entryLoad(event: { url: URL }): Promise<EntryData> {
    const entry = site.byPermalink(event.url.pathname);
    if (!entry) throw error(404, `Not found: ${event.url.pathname}`);
    return composeEntryData(config, entry);
  }

  /** Prerender enumeration: one `{ path }` per entry across every concept. */
  function entries(): { path: string }[] {
    return site.entries();
  }

  /** Whether an entry's frontmatter `robots` field asks search engines not to index it. */
  function isNoindex(frontmatter: Record<string, unknown>): boolean {
    return readSeoFields(frontmatter).robots?.includes('noindex') ?? false;
  }

  /**
   * Prerender enumeration for the raw-markdown twin, one `.md`-suffixed `{ path }` per entry whose
   *  frontmatter `robots` field does not carry `noindex` (read through {@link readSeoFields}). A page
   *  that asks not to be indexed does not acquire a machine-readable twin either, so the two surfaces
   *  cannot disagree.
   */
  function markdownEntries(): { path: string }[] {
    return entries()
      .filter((e) => {
        const found = site.byPermalink('/' + e.path);
        return !found || !isNoindex(found.frontmatter);
      })
      .map((e) => ({ path: `${e.path}.md` }));
  }

  /**
   * One entry's stored markdown body, unrendered, for the `.md`-suffixed request path. Strips the
   *  suffix and resolves the remainder through the same {@link SiteResolver.byPermalink} entryLoad
   *  uses, so the twin can only ever serve what the resolver itself carries. Throws `error(404)` on a
   *  miss, matching entryLoad.
   *
   *  A `noindex` entry 404s here as well as being absent from {@link markdownEntries}. The
   *  enumerator alone would be enough while the site's route is prerendered, which is the wiring the
   *  guide teaches, but the two surfaces then agree only for as long as nobody switches the route to
   *  runtime SSR. Refusing here makes them agree by construction instead.
   */
  async function markdownLoad(event: { url: URL }): Promise<{ body: string }> {
    const path = event.url.pathname.replace(/\.md$/, '');
    const entry = site.byPermalink(path);
    if (!entry || isNoindex(entry.frontmatter)) throw error(404, `Not found: ${event.url.pathname}`);
    return { body: entry.body };
  }

  return { entryLoad, entries, markdownEntries, markdownLoad };
}

/**
 * What `createPublicRoutes` returns: one entry's public data by request path, the prerender
 *  enumerations, and the raw-markdown twin's own load.
 */
export interface PublicRoutes {
  entryLoad: (event: { url: URL }) => Promise<EntryData>;
  entries: () => { path: string }[];
  markdownEntries: () => { path: string }[];
  markdownLoad: (event: { url: URL }) => Promise<{ body: string }>;
}
