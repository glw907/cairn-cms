// cairn-cms: the cross-concept site resolver (dated-slug design). It unions every concept's
// per-concept index into one resolver: a single byPermalink map a catch-all route matches a
// request path against, one entries() list the prerenderer walks, and the per-concept indexes
// for concept-scoped archive, tag, and feed loaders. A duplicate permalink throws at build.
// buildLinkResolver lives here too, since it closes over the resolver.
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentEntry, ContentIndex, ContentSummary } from './content-index.js';
import type { LinkResolve } from '../content/links.js';
import { extractReferenceEdges, type ReferenceEdge } from '../content/references.js';
import { tagSlug, tagArchivePath, parseTagPath } from '../content/url-policy.js';

/** One concept's descriptor paired with its built index. */
export interface ConceptIndex {
  descriptor: ConceptDescriptor;
  index: ContentIndex;
}

/**
 * The discriminated result of resolving a request path: an entry, a concept's tag index, or one
 *  tag's archive. The site's one catch-all renders by `kind`; the engine owns only the URL-to-data
 *  resolution. `tags` on `tagIndex` is the `allTags` shape; `tag` on `tagArchive` is the canonical
 *  tag value the slug resolved back to, not the URL slug.
 */
export type ResolvedRoute =
  | { kind: 'entry'; entry: ContentEntry }
  | { kind: 'tagIndex'; concept: string; tags: { tag: string; count: number }[] }
  | { kind: 'tagArchive'; concept: string; tag: string; entries: ContentSummary[] };

/** The cross-concept query surface a catch-all route and the sitemap read. */
export interface SiteResolver {
  /** Resolve a request path (with or without a trailing slash) to its entry, or undefined. */
  byPermalink(path: string): ContentEntry | undefined;
  /**
   * Resolve a request path to its discriminated route: an exact entry permalink first, then the
   *  longest taxonomy-base prefix (a tag index or a tag archive), or undefined when nothing matches.
   */
  resolveRoute(path: string): ResolvedRoute | undefined;
  /** Newer/older neighbors within the entry's own concept, for prev/next links. */
  adjacent(entry: ContentSummary): { newer?: ContentSummary; older?: ContentSummary };
  /**
   * Every prerenderable path across concepts, leading slash stripped, for SvelteKit `[...path]`:
   *  each entry permalink, each taxonomy index base, and each concrete tag-archive path.
   */
  entries(): { path: string }[];
  /** One concept's index, for its archive, tag, and feed loaders. */
  concept(id: string): ContentIndex | undefined;
  /** Every non-draft summary across concepts, for the site-wide sitemap. */
  all(): ContentSummary[];
}

/** Strip a trailing slash from a path, keeping the root "/" intact. */
function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/** Collect non-draft validation failures across concepts from each index's recorded verdicts. */
function siteProblems(concepts: ConceptIndex[]): string[] {
  const problems: string[] = [];
  for (const { descriptor, index } of concepts) {
    for (const problem of index.problems()) {
      if (problem.draft) continue; // a half-finished draft never ships, so it does not fail the build
      for (const [field, message] of Object.entries(problem.errors)) {
        problems.push(`${descriptor.dir}/${problem.id}: ${field}: ${message}`);
      }
    }
  }
  return problems;
}

/**
 * Union per-concept indexes into a site-level resolver. Throws on a duplicate permalink and,
 * unless `validate` is `false`, on any non-draft entry whose frontmatter fails its concept's
 * validator, so malformed content fails the build instead of shipping.
 */
export function createSiteResolver(concepts: ConceptIndex[], opts: { validate?: boolean } = {}): SiteResolver {
  if (opts.validate !== false) {
    const problems = siteProblems(concepts);
    if (problems.length > 0) {
      throw new Error(`site resolver: ${problems.length} invalid frontmatter field(s):\n  ${problems.join('\n  ')}`);
    }
  }
  const byPath = new Map<string, { index: ContentIndex; id: string }>();
  const byId = new Map<string, ContentIndex>();
  for (const { descriptor, index } of concepts) {
    byId.set(descriptor.id, index);
    for (const summary of index.all()) {
      const existing = byPath.get(summary.permalink);
      if (existing) {
        throw new Error(
          `site resolver: "${existing.id}" and "${summary.id}" both resolve to "${summary.permalink}"`,
        );
      }
      byPath.set(summary.permalink, { index, id: summary.id });
    }
  }

  // One taxonomy route per concept: its base, its index, and the per-concept slug->value index that
  // recovers a canonical tag value from a URL slug. Only concepts that mark a taxonomy field register.
  interface TaxonomyRoute {
    concept: string;
    base: string;
    index: ContentIndex;
    /** Canonical tag value keyed by its slug; the round-trip a tag-archive path needs. */
    slugToValue: Map<string, string>;
  }
  const taxonomyRoutes: TaxonomyRoute[] = [];
  for (const { descriptor, index } of concepts) {
    if (descriptor.taxonomyBase === undefined) continue;
    const base = descriptor.taxonomyBase;
    const slugToValue = new Map<string, string>();
    for (const { tag } of index.allTags()) {
      const slug = tagSlug(tag);
      const clash = slugToValue.get(slug);
      // A lossy slug must round-trip to exactly one value within a concept, so two distinct values
      // colliding on one slug is a build error, naming both so the author can disambiguate.
      if (clash !== undefined && clash !== tag) {
        throw new Error(
          `site resolver: concept "${descriptor.id}" tags "${clash}" and "${tag}" both slug to "${slug}"`,
        );
      }
      slugToValue.set(slug, tag);
    }
    taxonomyRoutes.push({ concept: descriptor.id, base, index, slugToValue });
  }

  // The prefix-aware collision check over the full concrete route set: every entry permalink, every
  // taxonomy base, and every concrete tag-archive path share one namespace, and any overlap throws.
  // This extends the exact-duplicate-permalink throw above to the prefix case it does not cover.
  const permalinks = [...byPath.keys()];
  for (const route of taxonomyRoutes) {
    // An entry permalink may not equal a base, fall under it, or contain it.
    for (const permalink of permalinks) {
      if (
        permalink === route.base ||
        permalink.startsWith(route.base + '/') ||
        route.base.startsWith(permalink + '/')
      ) {
        throw new Error(
          `site resolver: entry permalink "${permalink}" collides with taxonomy base "${route.base}"`,
        );
      }
    }
    // Two taxonomy bases may not be equal or one prefix the other.
    for (const other of taxonomyRoutes) {
      if (other === route) continue;
      if (route.base === other.base || route.base.startsWith(other.base + '/')) {
        throw new Error(
          `site resolver: taxonomy bases "${other.base}" and "${route.base}" collide`,
        );
      }
    }
    // A concrete archive path may not equal an entry permalink.
    for (const { tag } of route.index.allTags()) {
      const archive = tagArchivePath(route.base, tag);
      if (byPath.has(archive)) {
        throw new Error(
          `site resolver: tag archive "${archive}" collides with an entry permalink`,
        );
      }
    }
  }

  // Longest base first so a nested base wins its prefix over a shorter ancestor base.
  const routesByLongestBase = [...taxonomyRoutes].sort((a, b) => b.base.length - a.base.length);

  return {
    byPermalink(path) {
      const hit = byPath.get(normalizePath(path));
      return hit ? hit.index.byId(hit.id) : undefined;
    },
    resolveRoute(path) {
      const normalized = normalizePath(path);
      // An exact entry permalink always wins, short-circuiting before any taxonomy-base scan.
      const entryHit = byPath.get(normalized);
      if (entryHit) {
        const entry = entryHit.index.byId(entryHit.id);
        return entry ? { kind: 'entry', entry } : undefined;
      }
      for (const route of routesByLongestBase) {
        const parsed = parseTagPath(route.base, normalized);
        if (parsed === null) continue;
        if (parsed === 'index') {
          return { kind: 'tagIndex', concept: route.concept, tags: route.index.allTags() };
        }
        const value = route.slugToValue.get(parsed.tag);
        if (value === undefined) return undefined;
        const archiveEntries = route.index.byTag(value);
        if (archiveEntries.length === 0) return undefined;
        return { kind: 'tagArchive', concept: route.concept, tag: value, entries: archiveEntries };
      }
      return undefined;
    },
    adjacent(entry) {
      const hit = byPath.get(entry.permalink);
      return hit ? hit.index.adjacent(entry.id) : {};
    },
    entries() {
      const paths = [...byPath.keys()];
      for (const route of taxonomyRoutes) {
        paths.push(route.base);
        for (const { tag } of route.index.allTags()) paths.push(tagArchivePath(route.base, tag));
      }
      return paths.map((p) => ({ path: p.replace(/^\//, '') }));
    },
    concept(id) {
      return byId.get(id);
    },
    all() {
      return concepts.flatMap(({ index }) => index.all());
    },
  };
}

/**
 * A reference edge resolved to its target's identity, for a public route to render a linked target.
 *  It reuses the target entry's own summary fields rather than re-deriving them, so a linked author
 *  card reads the same title and permalink the target's own page does. `summary` is the target's
 *  excerpt when present.
 */
export interface ResolvedReference {
  id: string;
  concept: string;
  title: string;
  permalink: string;
  summary?: string;
}

/** Project a resolved target entry into the identity a public route renders for a reference. */
function projectReference(edge: ReferenceEdge, target: ContentSummary): ResolvedReference {
  const resolved: ResolvedReference = {
    id: edge.id,
    concept: edge.concept,
    title: target.title,
    permalink: target.permalink,
  };
  if (target.excerpt) resolved.summary = target.excerpt;
  return resolved;
}

/**
 * Resolve a concept's `reference` and `array(reference)` frontmatter edges to their target identities,
 * keyed by the field name, so a public route renders a reference as a link to its target's page. The
 * resolution lives here because only the cross-concept resolver reaches a different concept's entries:
 * a posts entry's `author` edge targets a pages entry, which the posts index alone cannot read. A
 * single `reference` field resolves to one `ResolvedReference`, an `array(reference)` to a
 * `ResolvedReference[]` in edge order. An id with no live target is dropped rather than thrown: the
 * build's `verifyReferences` gate already fails a true dangling edge, so an unresolved id at request
 * time is a mid-flight or draft target, not a hard error. Resolve per call, since the target entries
 * exist only after every per-concept index is unioned into the resolver.
 */
export function resolveReferences(
  site: SiteResolver,
  descriptor: ConceptDescriptor,
  frontmatter: Record<string, unknown>,
): Record<string, ResolvedReference | ResolvedReference[]> {
  const edges = extractReferenceEdges(frontmatter, descriptor.fields);
  const resolved: Record<string, ResolvedReference | ResolvedReference[]> = {};
  for (const field of descriptor.fields) {
    const isSingle = field.type === 'reference';
    const isArray = field.type === 'array' && field.item.type === 'reference';
    if (!isSingle && !isArray) continue;
    const fieldEdges = edges.filter((edge) => edge.field === field.name);
    const hits: ResolvedReference[] = [];
    for (const edge of fieldEdges) {
      const target = site.concept(edge.concept)?.byId(edge.id);
      if (target) hits.push(projectReference(edge, target));
    }
    if (isSingle) {
      if (hits.length > 0) resolved[field.name] = hits[0];
    } else {
      resolved[field.name] = hits;
    }
  }
  return resolved;
}

/**
 * A resolver backed by the site resolver, for the build. A miss throws, so a dangling cairn: token
 *  fails the prerender (the build backstop). The preview uses manifestLinkResolver, which marks.
 */
export function buildLinkResolver(site: SiteResolver): LinkResolve {
  return (ref) => {
    const url = site.concept(ref.concept)?.byId(ref.id)?.permalink;
    if (!url) throw new Error(`cairn link target not found: cairn:${ref.concept}/${ref.id}`);
    return url;
  };
}
