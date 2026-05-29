// cairn-cms: concept normalization (seam 1). The adapter declares concepts as
// `content: { posts?, pages? }`; this turns each declared key into a uniform descriptor
// (id, label, directory, concept-fixed routing, fields, validator) the admin reads. A
// future Fragments concept attaches by adding one key under `content` and one routing
// entry, with no reshape here.
import type { ConceptConfig, ConceptDescriptor, RoutingRule } from './types.js';

/**
 * Concept-fixed routing, keyed by concept id (spec §7.2). Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config. A future Fragments adds one
 * entry here and one key under `content`.
 */
export const CONCEPT_ROUTING: Record<string, RoutingRule> = {
  posts: { routable: true, dated: true, inFeeds: true },
  pages: { routable: true, dated: false, inFeeds: false },
};

/** Routing for a concept with no table entry: a plain, non-feed, routable page. */
const DEFAULT_ROUTING: RoutingRule = { routable: true, dated: false, inFeeds: false };

/** Title-case a concept id for the default sidebar label, e.g. "posts" to "Posts". */
function defaultLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Normalize an adapter's declared concepts into uniform descriptors (seam 1). Each declared
 * key under `content` becomes one descriptor; an undeclared (`undefined`) concept is
 * skipped. `routing` is injectable so a contract test can prove a new concept attaches
 * additively; production passes the default `CONCEPT_ROUTING`.
 */
export function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
  routing: Record<string, RoutingRule> = CONCEPT_ROUTING,
): ConceptDescriptor[] {
  const descriptors: ConceptDescriptor[] = [];
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      fields: config.fields,
      validate: config.validate,
    });
  }
  return descriptors;
}

/** Look up a normalized concept by id, or undefined when the site does not enable it. */
export function findConcept(
  concepts: ConceptDescriptor[],
  id: string,
): ConceptDescriptor | undefined {
  return concepts.find((concept) => concept.id === id);
}
