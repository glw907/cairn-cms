// cairn-cms: concept normalization (seam 1). The adapter declares concepts as an open `content`
// record; this turns each declared key into a uniform descriptor (id, label, directory, declared
// routing, fields, validator) the admin reads. A new concept attaches by adding one key under
// `content` and declaring its own routing and URL policy, with no reshape here.
import type { ConceptConfig, ConceptDescriptor, ConceptUrlPolicy, NamedField, RoutingRule } from './types.js';
import type { Fieldset } from './fieldset.js';
import type { FieldDescriptor } from './fields.js';
import { permalinkUsesDateToken } from './url-policy.js';

/** Re-attach each fieldset record key to its descriptor as `name`, the normalized `NamedField[]`. */
function namedFields(schema: Fieldset): NamedField[] {
  return Object.entries(schema.fields).map(([name, descriptor]) => ({ name, ...descriptor }));
}

/** The named routing shorthands, each expanding to a concrete rule. */
const ROUTING_SHORTHANDS: Readonly<Record<'feed' | 'page' | 'embedded', RoutingRule>> = {
  feed: { routable: true, dated: true, inFeeds: true },
  page: { routable: true, dated: false, inFeeds: false },
  embedded: { routable: false, dated: false, inFeeds: false },
};

/**
 * The reserved concept key for the site-declared Fragments concept (engine-internal; not a
 *  package export). The include directive (later tasks) resolves a fragment body through
 *  `site.concept(FRAGMENTS_CONCEPT_ID)`, which requires the concept's entries to stay
 *  non-routable, so `normalizeConcepts` enforces `routing: 'embedded'` on this key alone.
 */
export const FRAGMENTS_CONCEPT_ID = 'fragments';

/**
 * Expand a concept's routing shorthand to a concrete rule. The single resolution point, reached
 *  from both `defineConcept` (declaration time) and `normalizeConcepts` (compose time): omitted is
 *  `page`. Throws on a defined-but-unrecognized value, so a typo'd shorthand (from an untyped
 *  caller, or a cast) fails loudly here rather than silently defaulting.
 */
export function resolveRouting(routing: ConceptConfig['routing'], id: string): RoutingRule {
  if (routing === undefined) return ROUTING_SHORTHANDS.page;
  if (!(routing in ROUTING_SHORTHANDS)) {
    throw new Error(`cairn: concept "${id}" routing "${routing}" must be one of feed, page, embedded`);
  }
  return ROUTING_SHORTHANDS[routing];
}

/**
 * Declare a concept while preserving its fieldset type for typed reads, and validate its URL policy at
 * declaration so a bad permalink or datePrefix fails at module load rather than at a defaulted render.
 * Mirrors {@link defineAdapter}; the validation is the build-independent net for a concept with no entries.
 */
export function defineConcept<const C extends ConceptConfig>(concept: C): C {
  const id = concept.label ?? concept.dir;
  validateUrlPolicy(
    id,
    { permalink: concept.permalink, datePrefix: concept.datePrefix },
    resolveRouting(concept.routing, id).dated,
    concept.fields.fields,
  );
  return concept;
}

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
 * A permalink using a date token cannot resolve without a `date` field of type `date` (see
 * `resolvePermalink`), so a dated permalink pattern makes that field structurally required, not
 * merely declared. Throws a declaration-time error naming the concept and the pattern when the
 * field is missing or the wrong type; otherwise normalizes it in place to `required: true`, so both
 * the editor form's native `required` and `concept.validate` enforce it. Fields objects are the same
 * reference the fieldset's validator closes over, so the mutation reaches both.
 */
function requireDateField(id: string, pattern: string, fields: Record<string, FieldDescriptor>): void {
  const date = fields.date;
  if (!date || date.type !== 'date') {
    throw new Error(
      `cairn: concept "${id}" permalink "${pattern}" uses a date token, so it must declare a field named "date" of type "date"`,
    );
  }
  date.required = true;
}

/**
 * Validate one concept's URL policy at build, so a misconfigured permalink or datePrefix fails loudly
 * here rather than emitting a wrong or defaulted URL at render. The permalink must be root-relative and
 * use only known tokens, a date token requires a dated concept and a declared `date` field, and the
 * datePrefix must be in range.
 */
function validateUrlPolicy(id: string, policy: ConceptUrlPolicy, dated: boolean, fields: Record<string, FieldDescriptor>): void {
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
    if (permalinkUsesDateToken(pattern)) {
      requireDateField(id, pattern, fields);
    }
  }
  if (policy.datePrefix !== undefined && !DATE_PREFIXES.has(policy.datePrefix)) {
    throw new Error(
      `cairn: concept "${id}" datePrefix "${policy.datePrefix}" must be one of year, month, day`,
    );
  }
}

/**
 * Normalize an adapter's declared concepts into uniform descriptors (seam 1). Each concept declares its
 * own routing shorthand, resolved by `resolveRouting`, and URL policy (`permalink`, `datePrefix`) on the
 * config; both default when omitted (`/:slug` for Pages, `/<id>/:slug` otherwise; `datePrefix` defaults
 * to `day`). A new concept attaches by adding one key under `content`.
 */
export function normalizeConcepts(
  content: Record<string, ConceptConfig | undefined>,
): ConceptDescriptor[] {
  const descriptors: ConceptDescriptor[] = [];
  const declaredConcepts = new Set(
    Object.keys(content).filter((key) => content[key] !== undefined),
  );
  for (const [id, config] of Object.entries(content)) {
    if (!config) continue;
    const fs = config.fields;
    const summaryFields = config.summaryFields ?? [];
    const declared = new Set(Object.keys(fs.fields));
    const undeclared = summaryFields.find((key) => !declared.has(key));
    if (undeclared !== undefined) {
      throw new Error(
        `cairn: concept "${id}" summaryFields key "${undeclared}" is not a declared field`,
      );
    }
    // A reference (or array of reference) field names the concept it targets. Validate that concept at
    // declaration, so a typo fails loudly here rather than at the build's verifyReferences gate (or, in
    // the editor picker, as a silently empty target list). The check is the field descriptor's concept
    // against the declared content keys.
    for (const [name, descriptor] of Object.entries(fs.fields)) {
      const targetConcept =
        descriptor.type === 'reference'
          ? descriptor.concept
          : descriptor.type === 'array' && descriptor.item.type === 'reference'
            ? descriptor.item.concept
            : undefined;
      if (targetConcept !== undefined && !declaredConcepts.has(targetConcept)) {
        throw new Error(
          `cairn: concept "${id}" reference field "${name}" names concept "${targetConcept}", which is not declared under content`,
        );
      }
    }
    if (id === FRAGMENTS_CONCEPT_ID && config.routing !== 'embedded') {
      throw new Error(
        `cairn: concept "${FRAGMENTS_CONCEPT_ID}" requires routing: 'embedded' (the include directive resolves against it)`,
      );
    }
    const conceptRouting = resolveRouting(config.routing, id);
    const policy: ConceptUrlPolicy = {
      permalink: config.permalink,
      datePrefix: config.datePrefix,
    };
    validateUrlPolicy(id, policy, conceptRouting.dated, fs.fields);
    const fields = namedFields(fs);
    const label = config.label ?? defaultLabel(id);
    descriptors.push({
      id,
      label,
      singular: config.singular ?? label,
      dir: config.dir,
      routing: conceptRouting,
      permalink: policy.permalink ?? defaultPermalink(id),
      datePrefix: policy.datePrefix ?? 'day',
      fields,
      schema: fs,
      summaryFields,
      validate: fs.validate,
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
