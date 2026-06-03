// cairn-cms: concept normalization (seam 1). The adapter declares concepts as
// `content: { posts?, pages? }`; this turns each declared key into a uniform descriptor
// (id, label, directory, concept-fixed routing, fields, validator) the admin reads. A
// future Fragments concept attaches by adding one key under `content` and one routing
// entry, with no reshape here.
import type { ConceptConfig, ConceptDescriptor, ConceptUrlPolicy, RoutingRule } from './types.js';

/**
 * Concept-fixed routing, keyed by concept id (spec §7.2). Posts are dated feed entries;
 * pages are plain navigable structure. Not in adapter config. A future Fragments adds one
 * entry here and one key under `content`.
 */
export const CONCEPT_ROUTING: Readonly<Record<string, RoutingRule>> = {
  posts: { routable: true, dated: true, inFeeds: true },
  pages: { routable: true, dated: false, inFeeds: false },
};

/** Routing for a concept with no table entry: a plain, non-feed, routable page. */
const DEFAULT_ROUTING: RoutingRule = { routable: true, dated: false, inFeeds: false };

/** Title-case a concept id for the default sidebar label, e.g. "posts" to "Posts". */
function defaultLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/** The default permalink pattern: Pages live at the root, other concepts under their id. */
function defaultPermalink(id: string): string {
  return id === 'pages' ? '/:slug' : `/${id}/:slug`;
}

/**
 * Normalize an adapter's declared concepts into uniform descriptors (seam 1). URL policy
 * (`permalink`, `datePrefix`) comes from the YAML site-config, passed here as `urlPolicy` keyed by
 * concept id; each value defaults when the YAML omits it (`/:slug` for Pages, `/<id>/:slug`
 * otherwise; `datePrefix` defaults to `day`). `routing` is injectable so a contract test can prove
 * a new concept attaches additively; production passes the default `CONCEPT_ROUTING`.
 */
export function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
  urlPolicy: Record<string, ConceptUrlPolicy | undefined> = {},
  routing: Readonly<Record<string, RoutingRule>> = CONCEPT_ROUTING,
): ConceptDescriptor[] {
  const descriptors: ConceptDescriptor[] = [];
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const summaryFields = config.summaryFields ?? [];
    const declared = new Set(config.schema.fields.map((field) => field.name));
    for (const key of summaryFields) {
      if (!declared.has(key)) {
        throw new Error(
          `cairn: concept "${id}" summaryFields key "${key}" is not a declared field`,
        );
      }
    }
    const policy = urlPolicy[id] ?? {};
    descriptors.push({
      id,
      label: config.label ?? defaultLabel(id),
      dir: config.dir,
      routing: routing[id] ?? DEFAULT_ROUTING,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: config.schema.fields,
      summaryFields,
      validate: config.schema.validate,
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
