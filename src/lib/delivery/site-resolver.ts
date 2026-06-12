// cairn-cms: the cross-concept site resolver (dated-slug design). It unions every concept's
// per-concept index into one resolver: a single byPermalink map a catch-all route matches a
// request path against, one entries() list the prerenderer walks, and the per-concept indexes
// for concept-scoped archive, tag, and feed loaders. A duplicate permalink throws at build.
// buildLinkResolver lives here too, since it closes over the resolver.
import type { ConceptDescriptor } from '../content/types.js';
import type { ContentEntry, ContentIndex, ContentSummary } from './content-index.js';
import type { LinkResolve } from '../content/links.js';

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
  /** Every entry's path across concepts, leading slash stripped, for SvelteKit `[...path]` prerender. */
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
      return concepts.flatMap(({ index }) => index.all());
    },
  };
}

/** A resolver backed by the site resolver, for the build. A miss throws, so a dangling cairn: token
 *  fails the prerender (the build backstop). The preview uses manifestLinkResolver, which marks. */
export function buildLinkResolver(site: SiteResolver): LinkResolve {
  return (ref) => {
    const url = site.concept(ref.concept)?.byId(ref.id)?.permalink;
    if (!url) throw new Error(`cairn link target not found: cairn:${ref.concept}/${ref.id}`);
    return url;
  };
}
