// cairn-cms: a minimal JSON Schema (draft-07 subset) validator for docs audience profile
// frontmatter. The schema and the parsed profile are both already in hand (gray-matter and yaml
// are existing dependencies), so this module checks the parsed object's shape against
// docs/internal/audiences/profile.schema.json without a schema-validation library, per the
// pass's "no new dependency" line. It supports only the keywords that schema uses: type,
// required, properties, items, additionalProperties, and a single-property if/const/then
// conditional.

/** The subset of JSON Schema (draft-07) this validator understands. */
export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'boolean' | 'number';
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean;
  if?: JsonSchema;
  then?: JsonSchema;
  const?: unknown;
}

function typeOf(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/**
 * True when every `const`-carrying property in `condition` matches `data`, the equality check a
 * schema's `if` half needs. `condition` with no properties matches unconditionally, so an `if`
 * naming nothing never blocks its `then`.
 */
function matchesCondition(data: Record<string, unknown>, condition: JsonSchema): boolean {
  const entries = Object.entries(condition.properties ?? {});
  return entries.every(([key, sub]) => !('const' in sub) || data[key] === sub.const);
}

/**
 * Validate `data` against `schema`, returning one human-readable error per violation (an empty
 * array means `data` conforms). `path` names the key under validation, so a nested violation
 * (for example a `vocabulary.use` entry) names its full location, and a missing or unknown
 * top-level key names itself directly.
 */
export function validateAgainstSchema(data: unknown, schema: JsonSchema, path = ''): string[] {
  const label = path === '' ? 'frontmatter' : path;

  if (schema.type && typeOf(data) !== schema.type) {
    return [`${label}: expected ${schema.type}, got ${typeOf(data)}`];
  }

  if (schema.type === 'array') {
    if (!schema.items) return [];
    return (data as unknown[]).flatMap((item, index) =>
      validateAgainstSchema(item, schema.items as JsonSchema, `${label}[${index}]`),
    );
  }

  if (schema.type !== 'object') return [];

  const errors: string[] = [];
  const obj = data as Record<string, unknown>;

  for (const key of schema.required ?? []) {
    if (!(key in obj)) errors.push(`${label}: missing required key "${key}"`);
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!(key in (schema.properties ?? {}))) errors.push(`${label}: unknown key "${key}"`);
    }
  }
  for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
    if (key in obj) errors.push(...validateAgainstSchema(obj[key], subSchema, path === '' ? key : `${path}.${key}`));
  }
  if (schema.if && schema.then && matchesCondition(obj, schema.if)) {
    for (const key of schema.then.required ?? []) {
      if (!(key in obj)) errors.push(`${label}: missing required key "${key}" (conditionally required)`);
    }
  }

  return errors;
}
