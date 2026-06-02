// cairn-cms: the concept schema primitive (schema-source-of-truth design). One field
// declaration yields a plain-data field projection for the editor form, a generated validator,
// and an inferred frontmatter type. Plan 1 builds the additive primitive; the adapter-contract
// cutover and the typed reads are Plan 2.
import type { FrontmatterField, ValidationResult } from './types.js';
import { validateFields } from './validate.js';

/** The validate input the cairn adapter takes: the raw frontmatter and the body. */
export interface StandardInput {
  frontmatter: Record<string, unknown>;
  body: string;
}

/** A minimal local copy of the Standard Schema v1 interface (https://standardschema.dev), so the
 *  schema is a drop-in where the ecosystem accepts a validator, with no runtime dependency. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}
type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey> }> };

/** Map one field descriptor to the TS type of its normalized value. text, textarea, and date
 *  normalize to a string; a closed-vocabulary `tags` field to the option-union array. */
type FieldValue<K extends FrontmatterField> = K extends { type: 'boolean' }
  ? boolean
  : K extends { type: 'tags'; options: readonly (infer O extends string)[] }
    ? O[]
    : K extends { type: 'tags' | 'freetags' }
      ? string[]
      : string;

/** Flatten an intersection into a single readable object type. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** The normalized frontmatter type inferred from a field tuple. A field declared
 *  `required: true` is a required key; every other field is optional. */
export type InferFields<F extends readonly FrontmatterField[]> = Prettify<
  { [K in F[number] as K extends { required: true } ? K['name'] : never]: FieldValue<K> } & {
    [K in F[number] as K extends { required: true } ? never : K['name']]?: FieldValue<K>;
  }
>;

/** A concept's schema: the plain-data field projection, the generated validator, and the
 *  Standard Schema conformance property. */
export interface ConceptSchema<F extends readonly FrontmatterField[] = readonly FrontmatterField[]> {
  /** The declared fields as plain serializable data, for the editor form. */
  readonly fields: FrontmatterField[];
  /** Validate raw frontmatter, returning field-keyed errors or the normalized data. */
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
  /** Standard Schema v1 conformance, for ecosystem interop. A thin adapter over `validate`. */
  readonly '~standard': StandardSchemaV1<StandardInput, InferFields<F>>['~standard'];
}

/** Extract the inferred frontmatter type from a `ConceptSchema`. */
export type Infer<S> = S extends ConceptSchema<infer F> ? InferFields<F> : never;

// Enforce the declarative per-field rules on an already-coerced value. Rules run only on a
// present, non-empty string value, so an absent optional field is never flagged. The first
// failing rule per field wins, so the author sees one clear message at a time.
function applyRules(field: FrontmatterField, value: unknown, errors: Record<string, string>, patterns: Map<string, RegExp>): void {
  if (typeof value !== 'string' || value === '') return;
  if (field.type === 'text' || field.type === 'textarea') {
    if (field.min != null && value.length < field.min) errors[field.name] = `${field.label} must be at least ${field.min} characters`;
    else if (field.max != null && value.length > field.max) errors[field.name] = `${field.label} must be at most ${field.max} characters`;
    else if (field.length != null && value.length !== field.length) errors[field.name] = `${field.label} must be exactly ${field.length} characters`;
    else if (field.pattern != null) {
      const re = patterns.get(field.name);
      if (re && !re.test(value)) errors[field.name] = `${field.label} is not in the expected format`;
    }
  } else if (field.type === 'date') {
    if (field.min != null && value < field.min) errors[field.name] = `${field.label} must be on or after ${field.min}`;
    else if (field.max != null && value > field.max) errors[field.name] = `${field.label} must be on or before ${field.max}`;
  }
}

/** Options for `defineFields`. `refine` runs after the per-field rules pass, for cross-field and
 *  body-dependent checks. It is validation-only: it returns field-keyed errors to merge, or
 *  nothing, and never transforms the data. */
export interface DefineFieldsOptions<F extends readonly FrontmatterField[]> {
  refine?: (data: InferFields<F>, body: string) => Record<string, string> | undefined;
}

// Compile each declared text/textarea pattern once, so a malformed pattern fails loudly at
// declaration (a site config error) instead of throwing from inside validate() on every save.
function compilePatterns(fields: FrontmatterField[]): Map<string, RegExp> {
  const compiled = new Map<string, RegExp>();
  for (const field of fields) {
    if ((field.type === 'text' || field.type === 'textarea') && field.pattern != null) {
      try {
        compiled.set(field.name, new RegExp(field.pattern));
      } catch (cause) {
        throw new Error(`cairn: field "${field.name}" has an invalid pattern: ${field.pattern}`, { cause });
      }
    }
  }
  return compiled;
}

/** Declare a concept's fields once. Returns the schema's faces derived from that one declaration. */
export function defineFields<const F extends readonly FrontmatterField[]>(
  fields: F,
  options: DefineFieldsOptions<F> = {},
): ConceptSchema<F> {
  const list = [...fields] as FrontmatterField[];
  const patterns = compilePatterns(list);
  const validate = (frontmatter: Record<string, unknown>, body: string): ValidationResult => {
    const base = validateFields(list, frontmatter);
    if (!base.ok) return base;
    const errors: Record<string, string> = {};
    for (const field of list) applyRules(field, base.data[field.name], errors, patterns);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const refined = options.refine?.(base.data as InferFields<F>, body);
    return refined && Object.keys(refined).length > 0 ? { ok: false, errors: refined } : base;
  };
  const standard: StandardSchemaV1<StandardInput, InferFields<F>>['~standard'] = {
    version: 1,
    vendor: 'cairn',
    validate: (value) => {
      const { frontmatter = {}, body = '' } = (value ?? {}) as Partial<StandardInput>;
      const result = validate(frontmatter ?? {}, body ?? '');
      return result.ok
        ? { value: result.data as InferFields<F> }
        : { issues: Object.entries(result.errors).map(([field, message]) => ({ message, path: [field] })) };
    },
  };
  return { fields: list, validate, '~standard': standard };
}
