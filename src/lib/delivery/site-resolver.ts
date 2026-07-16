// cairn-cms: the cross-concept site resolver (dated-slug design). It unions every concept's
// per-concept index into one resolver: a single byPermalink map a catch-all route matches a
// request path against, one entries() list the prerenderer walks, and the per-concept indexes
// for concept-scoped feed loaders. A duplicate permalink throws at build.
// buildLinkResolver lives here too, since it closes over the resolver.
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentEntry, ContentIndex, ContentSummary } from './content-index.js';
import type { LinkResolve } from '../content/links.js';
import type { FragmentResolve } from '../render/resolve-include.js';
import { extractReferenceEdges, type ReferenceEdge } from '../content/references.js';
import { FRAGMENTS_CONCEPT_ID } from '../content/concepts.js';

/** One concept's descriptor paired with its built index. */
export interface ConceptIndex {
  descriptor: ConceptDescriptor;
  index: ContentIndex;
}

/** The cross-concept query surface a catch-all route and the sitemap read. */
export interface SiteResolver {
  /** Resolve a request path (with or without a trailing slash) to its entry, or undefined. */
  byPermalink(path: string): ContentEntry | undefined;
  /** Newer/older neighbors within the entry's own concept, for prev/next links. */
  adjacent(entry: ContentSummary): { newer?: ContentSummary; older?: ContentSummary };
  /** Every entry permalink across concepts, leading slash stripped, for SvelteKit `[...path]`. */
  entries(): { path: string }[];
  /** One concept's index, for its archive and feed loaders. */
  concept(id: string): ContentIndex | undefined;
  /**
   * Every non-draft summary across ROUTABLE concepts, for the site-wide sitemap. Non-routable is
   *  excluded here for the same reason it is excluded from `byPermalink`: listing an entry that
   *  refuses to resolve hands a crawler a 404. Reach a non-routable concept through `concept(id)`.
   */
  all(): ContentSummary[];
  /**
   * Whether a concept id is publicly routable, so a link resolver can refuse a non-routable target
   *  (a fragment) instead of pointing at a permalink that never serves. An unknown concept id reads
   *  true; the downstream `byId` lookup already misses it.
   */
  routable(id: string): boolean;
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
      throw new Error(`cairn: ${problems.length} invalid frontmatter field(s):\n  ${problems.join('\n  ')}`);
    }
  }
  const byPath = new Map<string, { index: ContentIndex; id: string }>();
  const byId = new Map<string, ContentIndex>();
  const routableById = new Map<string, boolean>();
  for (const { descriptor, index } of concepts) {
    byId.set(descriptor.id, index);
    routableById.set(descriptor.id, descriptor.routing.routable);
    // The routable gate: a non-routable concept (e.g. Fragments' 'embedded' routing) stays
    // reachable through concept() for in-process body reads, but never enters the public
    // union, so it cannot be requested, prerendered, or enumerated.
    if (!descriptor.routing.routable) continue;
    for (const summary of index.all()) {
      const existing = byPath.get(summary.permalink);
      if (existing) {
        throw new Error(
          `cairn: permalink "${summary.permalink}" resolves to both "${existing.id}" and "${summary.id}"`,
        );
      }
      byPath.set(summary.permalink, { index, id: summary.id });
    }
  }

  return {
    byPermalink(path) {
      const hit = byPath.get(normalizePath(path));
      return hit ? hit.index.byId(hit.id) : undefined;
    },
    adjacent(entry) {
      const hit = byPath.get(entry.permalink);
      return hit ? hit.index.adjacent(entry.id) : {};
    },
    entries() {
      return [...byPath.keys()].map((p) => ({ path: p.replace(/^\//, '') }));
    },
    concept(id) {
      return byId.get(id);
    },
    all() {
      // The routable gate applies to enumeration too, not just byPath resolution. all() feeds the
      // site-wide sitemap, so a non-routable concept's entries here would advertise permalinks that
      // byPermalink refuses and the build never prerenders, handing crawlers a list of 404s.
      return concepts.filter(({ descriptor }) => descriptor.routing.routable).flatMap(({ index }) => index.all());
    },
    routable(id) {
      return routableById.get(id) ?? true;
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
 *  fails the prerender (the build backstop). The preview uses manifestLinkResolver, which marks. A
 *  ref whose target concept is non-routable (a fragment) is treated as a miss too: a fragment is
 *  included, never linked, and its gated permalink would 404.
 */
export function buildLinkResolver(site: SiteResolver): LinkResolve {
  return (ref) => {
    const url = site.routable(ref.concept) ? site.concept(ref.concept)?.byId(ref.id)?.permalink : undefined;
    if (!url) throw new Error(`cairn: link target "cairn:${ref.concept}/${ref.id}" not found`);
    return url;
  };
}

/**
 * A fragment-body resolver backed by the site resolver, for the build. A miss (an unknown id, or no
 *  fragments concept declared) throws, so a dangling `::include` fails the prerender the same way a
 *  dangling `cairn:` link does. The preview uses a manifest-backed resolver built from the edit
 *  screen's fragment targets instead.
 */
export function buildFragmentResolver(site: SiteResolver): FragmentResolve {
  return (id) => {
    const body = site.concept(FRAGMENTS_CONCEPT_ID)?.byId(id)?.body;
    if (body == null) throw new Error(`cairn: fragment "${id}" not found`);
    return body;
  };
}
