// cairn-cms: the concept schema primitive (schema-source-of-truth design). One field
// declaration yields a plain-data field projection for the editor form, a generated validator,
// and an inferred frontmatter type. Plan 1 builds the additive primitive; the adapter-contract
// cutover and the typed reads are Plan 2.
import type { FrontmatterField, ValidationResult } from './types.js';
import { validateFields } from './validate.js';

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

/** A concept's schema: the plain-data field projection plus the generated validator. The
 *  `~standard` Standard Schema property lands in Task 4. */
export interface ConceptSchema<F extends readonly FrontmatterField[] = readonly FrontmatterField[]> {
  /** The declared fields as plain serializable data, for the editor form. */
  readonly fields: FrontmatterField[];
  /** Validate raw frontmatter, returning field-keyed errors or the normalized data. */
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
}

/** Extract the inferred frontmatter type from a `ConceptSchema`. */
export type Infer<S> = S extends ConceptSchema<infer F> ? InferFields<F> : never;

/** Declare a concept's fields once. Returns the schema's faces derived from that one declaration. */
export function defineFields<const F extends readonly FrontmatterField[]>(fields: F): ConceptSchema<F> {
  const list = [...fields] as FrontmatterField[];
  const validate = (frontmatter: Record<string, unknown>, _body: string): ValidationResult =>
    validateFields(list, frontmatter);
  return { fields: list, validate };
}
