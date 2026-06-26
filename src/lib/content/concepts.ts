// cairn-cms: concept normalization (seam 1). The adapter declares concepts as
// `content: { posts?, pages? }`; this turns each declared key into a uniform descriptor
// (id, label, directory, concept-fixed routing, fields, validator) the admin reads. A
// future Fragments concept attaches by adding one key under `content` and one routing
// entry, with no reshape here.
import type { ConceptConfig, ConceptDescriptor, ConceptUrlPolicy, NamedField, RoutingRule } from './types.js';
import type { Fieldset } from './fieldset.js';
import { urlPolicyFrom, type SiteConfig } from '../nav/site-config.js';

/** Re-attach each fieldset record key to its descriptor as `name`, the normalized `NamedField[]`. */
function namedFields(schema: Fieldset): NamedField[] {
  return Object.entries(schema.fields).map(([name, descriptor]) => ({ name, ...descriptor }));
}

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

/** Permalink tokens the resolver understands. */
const KNOWN_TOKENS = new Set(['slug', 'year', 'month', 'day']);
/** The date-bearing tokens; valid only for a dated concept. */
const DATE_TOKENS = new Set(['year', 'month', 'day']);
/** The valid date-prefix granularities. A runtime check, since the YAML is untyped. */
const DATE_PREFIXES = new Set<string>(['year', 'month', 'day']);

/**
 * Validate one concept's URL policy at build, so a misconfigured permalink or datePrefix fails loudly
 * here rather than emitting a wrong or defaulted URL at render. The permalink must be root-relative and
 * use only known tokens, a date token requires a dated concept, and the datePrefix must be in range.
 */
function validateUrlPolicy(id: string, policy: ConceptUrlPolicy, dated: boolean): void {
  if (policy.permalink !== undefined) {
    const pattern = policy.permalink;
    if (!pattern.startsWith('/')) {
      throw new Error(`cairn: concept "${id}" permalink "${pattern}" must start with "/"`);
    }
    for (const match of pattern.matchAll(/:(\w+)/g)) {
      const token = match[1];
      if (!KNOWN_TOKENS.has(token)) {
        throw new Error(`cairn: concept "${id}" permalink "${pattern}" uses unknown token ":${token}"`);
      }
      if (DATE_TOKENS.has(token) && !dated) {
        throw new Error(
          `cairn: concept "${id}" is not dated, so permalink "${pattern}" cannot use the date token ":${token}"`,
        );
      }
    }
  }
  if (policy.datePrefix !== undefined && !DATE_PREFIXES.has(policy.datePrefix)) {
    throw new Error(
      `cairn: concept "${id}" datePrefix "${policy.datePrefix}" must be one of year, month, day`,
    );
  }
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
  const declaredConcepts = new Set(
    Object.keys(content).filter((key) => content[key] !== undefined),
  );
  for (const key of Object.keys(urlPolicy)) {
    if (!declaredConcepts.has(key)) {
      throw new Error(`cairn: URL policy names concept "${key}", which is not declared under content`);
    }
  }
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const summaryFields = config.summaryFields ?? [];
    const declared = new Set(Object.keys(config.schema.fields));
    const undeclared = summaryFields.find((key) => !declared.has(key));
    if (undeclared !== undefined) {
      throw new Error(
        `cairn: concept "${id}" summaryFields key "${undeclared}" is not a declared field`,
      );
    }
    const conceptRouting = routing[id] ?? DEFAULT_ROUTING;
    const policy = urlPolicy[id] ?? {};
    validateUrlPolicy(id, policy, conceptRouting.dated);
    const label = config.label ?? defaultLabel(id);
    descriptors.push({
      id,
      label,
      singular: config.singular ?? label,
      dir: config.dir,
      routing: conceptRouting,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields: namedFields(config.schema),
      schema: config.schema,
      summaryFields,
      validate: config.schema.validate,
    });
  }
  return descriptors;
}

/**
 * Resolve a site's concept descriptors from its content map and parsed site config. The admin runtime
 * (composeRuntime) and the delivery layer (siteDescriptors) both call this, so the per-concept URL
 * policy is derived once from the YAML and the runtime and delivery permalinks cannot diverge.
 */
export function resolveConcepts(
  content: Record<string, ConceptConfig | undefined>,
  siteConfig: SiteConfig,
): ConceptDescriptor[] {
  return normalizeConcepts(content, urlPolicyFrom(siteConfig));
}

/** Look up a normalized concept by id, or undefined when the site does not enable it. */
export function findConcept(
  concepts: ConceptDescriptor[],
  id: string,
): ConceptDescriptor | undefined {
  return concepts.find((concept) => concept.id === id);
}
