// cairn-cms: the fieldset primitive (Contract v2), the one live field system. A key-to-descriptor
// record becomes a schema carrying the descriptors as plain data, a server-derived validator, and the
// Standard Schema conformance property. The validator coerces per type, drops an empty optional field,
// and returns field-keyed errors or normalized data. The adapter contract, the editor form, the
// delivery inference, and the media extractor all read this.
import type { FieldDescriptor, ImageValue } from './fields.js';
import type { ValidationIssue, ValidationResult } from './types.js';
import type { StandardInput, StandardSchemaV1 } from './standard-schema.js';
import { datetimeInputValue, dateInputValue, isCalendarDate, referenceIdsFromValue } from './frontmatter.js';
import { compilePattern, dateBoundsError, patternError, stringLengthError } from './field-rules.js';
import { isValidId } from './ids.js';

/** Accept any URL using http or https with a non-empty rest, mirroring the conservative form check. */
const URL_RE = /^https?:\/\/\S+$/;
/** Accept a single address conservatively: exactly one at-sign and a dotted domain, nothing more. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * The behavior table co-bundled with a fieldset, keyed by field name. It holds function-valued
 *  behavior a descriptor cannot carry as plain data (a cross-field validator, an array itemLabel).
 *  Scalars have no behavior, so the table is empty for now and reserved for later co-bundled functions.
 */
export type BehaviorTable = Record<string, never>;

/**
 * Options for `fieldset`. `refine` runs after the per-field coercion and constraints pass, for
 *  cross-field and body-dependent checks. It is validation-only: it returns field-keyed errors to
 *  merge, or nothing, and never transforms the data. Server-only, since it may carry closures.
 */
export interface FieldsetOptions {
  refine?: (data: Record<string, unknown>, body: string) => Record<string, string> | undefined;
}

/**
 * A concept's fieldset: the plain-data descriptors, the co-bundled behavior table, the server-derived
 *  validator, and the Standard Schema conformance property.
 */
export interface Fieldset<R extends Record<string, FieldDescriptor> = Record<string, FieldDescriptor>> {
  /** The declared descriptors as plain serializable data, for the editor form. */
  readonly fields: R;
  /** Function-valued behavior keyed by field name; empty for a scalar-only fieldset. */
  readonly behavior: BehaviorTable;
  /** Validate raw frontmatter, returning field-keyed errors or the normalized data. */
  validate(frontmatter: Record<string, unknown>, body: string): ValidationResult;
  /** Standard Schema v1 conformance, for ecosystem interop. A thin adapter over `validate`. */
  readonly '~standard': StandardSchemaV1<StandardInput, Record<string, unknown>>['~standard'];
}

/**
 * Map one field descriptor to the TS type of its normalized value. number is number, boolean is
 *  boolean, image is the nested ImageValue object; a select with a literal option list is that
 *  option union, a multiselect with one is that union array (else string[]); everything else is a
 *  string.
 */
type ValueOf<D extends FieldDescriptor> = D extends { type: 'number' }
  ? number
  : D extends { type: 'boolean' }
    ? boolean
    : D extends { type: 'image' }
      ? ImageValue
      : D extends { type: 'object'; fields: infer F extends Record<string, FieldDescriptor> }
        ? InferRecord<F>
        : D extends { type: 'array'; item: infer I extends FieldDescriptor }
        ? ValueOf<I>[]
        : D extends { type: 'select'; options: readonly (infer O extends string)[] }
          ? O
          : D extends { type: 'multiselect'; options: readonly (infer O extends string)[] }
            ? O[]
            : D extends { type: 'multiselect' }
              ? string[]
              : string;

/** Flatten an intersection into a single readable object type. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Drop an index signature so a captured literal record infers its own keys only, not `[x: string]`. */
type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * The normalized frontmatter type inferred from a fieldset's descriptor record. A descriptor
 *  declared `required: true` is a required key; every other descriptor is optional. The captured
 *  literal record carries an index signature (the constructor's `Record<string, FieldDescriptor>`
 *  intersected with the literal), so strip it first or every nested key would also infer `[x: string]`.
 */
type InferRecord<RR extends Record<string, FieldDescriptor>, R = RemoveIndex<RR>> = Prettify<
  { -readonly [K in keyof R as R[K] extends { required: true } ? K : never]: ValueOf<R[K] extends FieldDescriptor ? R[K] : never> } & {
    -readonly [K in keyof R as R[K] extends { required: true } ? never : K]?: ValueOf<R[K] extends FieldDescriptor ? R[K] : never>;
  }
>;

/** Extract the inferred frontmatter type from a `Fieldset`. */
export type InferFieldset<S> = S extends Fieldset<infer R> ? InferRecord<R> : never;

// Coerce a raw value to the trimmed string the empty check and constraints run on. A parsed value may
// arrive from parseMarkdown, not only a form string: a Date on a date or datetime field, a JS number on
// a number field. A finite 0 coerces to '0', never read as empty, since 0 is a real number a YAML scalar
// carries; a NaN or non-finite number stays '' and routes to the number error in validateField.
function coerceToText(type: FieldDescriptor['type'], value: unknown): string {
  if (type === 'date' && value instanceof Date) return dateInputValue(value);
  if (type === 'datetime' && value instanceof Date) return datetimeInputValue(value);
  if (type === 'number' && typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return '';
}

/** The outcome of validating one field: the stored value when present, plus any located issues. */
interface FieldOutcome {
  value?: unknown;
  issues: ValidationIssue[];
}

// Build the structural key for a path by dropping numeric (row-index) segments, so a nested text
// field's compiled pattern is found regardless of which row it sits in: ['faq', 2, 'code'] -> 'faq.code'.
function structuralKey(path: (string | number)[]): string {
  return path.filter((seg) => typeof seg === 'string').join('.');
}

// Validate one descriptor against its raw value and return its outcome. Empty or absent is
// "not provided" and is read BEFORE type coercion, uniformly: a required field returns an issue, an
// optional field drops (no value, no issue). Only a non-empty value is coerced. boolean is the
// exception: true stores true, anything else omits the value. number relies on the empty-first drop so
// an empty optional number never becomes Number('') === 0. A container (object, array) recurses one
// level, appending the leaf key or element index to `path` for each nested issue.
function validateField(
  path: (string | number)[],
  field: FieldDescriptor,
  value: unknown,
  patterns: Map<string, RegExp>,
): FieldOutcome {
  const label = field.label ?? '';

  // object: validate each leaf one level down, assembling a nested object value and concatenating
  // issues with the leaf key appended to the path. An empty (all-leaves-dropped) object omits the
  // value; a required empty object is an error on the object's own path.
  if (field.type === 'object') {
    const obj: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    const raw = value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    for (const [leafKey, leaf] of Object.entries(field.fields)) {
      const outcome = validateField([...path, leafKey], leaf, raw[leafKey], patterns);
      issues.push(...outcome.issues);
      if ('value' in outcome) obj[leafKey] = outcome.value;
    }
    if (issues.length > 0) return { issues };
    if (Object.keys(obj).length === 0) {
      return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
    }
    return { value: obj, issues };
  }

  // array: a reference item keeps the shipped id-list path; any other item recurses per element with
  // the element index appended to the path. A required empty list errors on the array's own path.
  if (field.type === 'array') {
    if (field.item.type === 'reference') {
      // array(reference): coerceToText returns '' for an array, so the empty-first drop below would
      // silently lose an optional list or falsely error a required one. The canonicalizer coerces a
      // lone scalar to one element and a Date element to its id. Each element must pass isValidId (the
      // item's reference rule this phase); a required empty list errors; the value is set only when the
      // list is non-empty.
      const list = referenceIdsFromValue(value);
      if (field.required && list.length === 0) return { issues: [{ path, message: `${label} is required` }] };
      const invalid = list.find((id) => !isValidId(id));
      if (invalid !== undefined) return { issues: [{ path, message: `${label} is not a valid reference` }] };
      return list.length > 0 ? { value: list, issues: [] } : { issues: [] };
    }
    const elements = Array.isArray(value) ? value : [];
    const out: unknown[] = [];
    const issues: ValidationIssue[] = [];
    elements.forEach((element, i) => {
      const outcome = validateField([...path, i], field.item, element, patterns);
      issues.push(...outcome.issues);
      if ('value' in outcome) out.push(outcome.value);
    });
    if (issues.length > 0) return { issues };
    if (out.length === 0) {
      return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
    }
    return { value: out, issues };
  }

  // boolean: presence is the value; an unchecked or absent box omits the value (no draft: false noise).
  if (field.type === 'boolean') {
    return value === true ? { value: true, issues: [] } : { issues: [] };
  }

  // multiselect: a string array; drop empties, reject an unknown value when options is closed. An empty
  // list omits the value (a required empty errors); the array path is the one non-string coercion. A
  // lone non-empty scalar (a single tag a YAML scalar carries) coerces to a single-element list, rather
  // than dropping to [] and reading as "required" while present. An empty string or a
  // non-string-non-array stays the empty list.
  if (field.type === 'multiselect') {
    let raw: string[];
    if (Array.isArray(value)) raw = value.map(String);
    else if (typeof value === 'string' && value.trim() !== '') raw = [value.trim()];
    else raw = [];
    const list = raw.map((v) => v.trim()).filter((v) => v !== '');
    if (field.required && list.length === 0) {
      return { issues: [{ path, message: `${label} is required` }] };
    }
    const { options } = field;
    if (options) {
      const unknown = list.find((v) => !options.includes(v));
      if (unknown !== undefined) {
        return { issues: [{ path, message: `${label} contains an unknown value: ${unknown}` }] };
      }
    }
    return list.length > 0 ? { value: list, issues: [] } : { issues: [] };
  }

  // image: the nested object arm, dropping the value on empty src. Default a missing alt to empty (alt
  // is debt, never a save block), trim and drop a blank caption, keep decorative only when an explicit
  // true. A required image with an empty src is the one error this arm raises.
  if (field.type === 'image') {
    let src = '';
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      src = typeof obj.src === 'string' ? obj.src.trim() : '';
      if (src !== '') {
        const normalized: ImageValue = {
          src,
          alt: typeof obj.alt === 'string' ? obj.alt : '',
        };
        const caption = typeof obj.caption === 'string' ? obj.caption.trim() : '';
        if (caption !== '') normalized.caption = caption;
        if (obj.decorative === true) normalized.decorative = true;
        return { value: normalized, issues: [] };
      }
    }
    return field.required && src === '' ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
  }

  // Every other type is "not provided when empty" first, then coerced. `coerceToText` turns a parsed
  // value into its string form BEFORE the empty check, so a real parsed value (a Date on a date or
  // datetime field, a number on a number field) is not read as empty.
  const text = coerceToText(field.type, value);
  if (text === '') {
    return field.required ? { issues: [{ path, message: `${label} is required` }] } : { issues: [] };
  }

  const key = structuralKey(path);
  switch (field.type) {
    case 'number': {
      const n = Number(text);
      // Reject NaN and the non-finite values Number() yields for "Infinity"/"1e400", which an
      // isNaN check alone would pass through and commit as a YAML .inf scalar.
      if (!Number.isFinite(n)) return { issues: [{ path, message: `${label} must be a number` }] };
      if (field.integer && !Number.isInteger(n)) return { issues: [{ path, message: `${label} must be a whole number` }] };
      if (field.min != null && n < field.min) return { issues: [{ path, message: `${label} must be at least ${field.min}` }] };
      if (field.max != null && n > field.max) return { issues: [{ path, message: `${label} must be at most ${field.max}` }] };
      return { value: n, issues: [] };
    }
    case 'select': {
      if (!field.options.includes(text)) return { issues: [{ path, message: `${label} contains an unknown value: ${text}` }] };
      return { value: text, issues: [] };
    }
    case 'url': {
      if (!URL_RE.test(text)) return { issues: [{ path, message: `${label} is not a valid URL` }] };
      return { value: text, issues: [] };
    }
    case 'email': {
      if (!EMAIL_RE.test(text)) return { issues: [{ path, message: `${label} is not a valid email address` }] };
      return { value: text, issues: [] };
    }
    case 'date': {
      if (!isCalendarDate(text)) return { issues: [{ path, message: `${label} must be a valid date (YYYY-MM-DD)` }] };
      const boundsError = dateBoundsError(text, field, label);
      if (boundsError != null) return { issues: [{ path, message: boundsError }] };
      return { value: text, issues: [] };
    }
    case 'reference': {
      // A scalar edge: the empty-first drop above already handled an absent optional, so a non-empty
      // value must be a valid id. An invalid token is a corrupted edge, not a coercible value.
      if (!isValidId(text)) return { issues: [{ path, message: `${label} is not a valid reference` }] };
      return { value: text, issues: [] };
    }
    default: {
      // text, textarea, datetime: a trimmed non-empty string. text and textarea also enforce the
      // string-length and pattern constraints (v1 parity); datetime stays a plain string for now,
      // since its bounds are out of scope this pass and v1 has no datetime equivalent to match.
      if (field.type === 'text' || field.type === 'textarea') {
        const lengthError = stringLengthError(text, field, label);
        if (lengthError != null) return { issues: [{ path, message: lengthError }] };
        const formatError = patternError(text, patterns.get(key), label);
        if (formatError != null) return { issues: [{ path, message: formatError }] };
      }
      return { value: text, issues: [] };
    }
  }
}

// At most one image field may feed the social card, so the og:image is unambiguous. A v2 fieldset
// marks that field with an explicit `seo: true`; there is no field-name default, since the record key
// is arbitrary. Two seo images is a site config error, so fail loudly at declaration (v1 parity).
// The delivery seo reader resolves the social card off a hardcoded top-level key list, so a nested
// seo image cannot resolve at delivery; this phase forbids seo: true inside any container and defers
// nested seo to the pass that generalizes delivery seo resolution.
function checkSeoImageFields(record: Record<string, FieldDescriptor>): void {
  const seo: string[] = [];
  for (const [key, field] of Object.entries(record)) {
    if (field.type === 'image' && field.seo === true) seo.push(`"${key}"`);
    else if (field.type === 'object') {
      for (const [leafKey, leaf] of Object.entries(field.fields)) {
        if (leaf.type === 'image' && leaf.seo === true) {
          throw new Error(`cairn: the image "${key}.${leafKey}" sets seo: true, but a nested seo image is not supported this phase. Put the social-card image at the top level.`);
        }
      }
    } else if (field.type === 'array') {
      const item = field.item;
      const nested = (item.type === 'image' && item.seo === true)
        || (item.type === 'object' && Object.values(item.fields).some((l) => l.type === 'image' && l.seo === true));
      if (nested) {
        throw new Error(`cairn: the array field "${key}" declares an seo image, but an array would mean one social card per row. Put seo: true on a top-level image.`);
      }
    }
  }
  if (seo.length > 1) {
    throw new Error(`cairn: a concept declares at most one SEO image field, but found ${seo.length} (${seo.join(', ')}). Set seo: false on all but one.`);
  }
}

// A leaf is any non-container descriptor. A container (object, array) may hold leaves one level deep only.
function isLeaf(field: FieldDescriptor): boolean {
  return field.type !== 'object' && field.type !== 'array';
}

// Enforce the one-level nesting cap, the no-reference-in-object deferral, and the no-dot-in-key rule, all
// loudly at declaration. A deeper nesting, a nested reference, or a dotted key would otherwise mis-save or
// mis-decode at the edge, so fail here.
function checkContainerNesting(record: Record<string, FieldDescriptor>): void {
  const checkKey = (k: string, where: string): void => {
    if (k.includes('.')) throw new Error(`cairn: ${where} "${k}" must not contain a dot; field keys address the nested form by dotted path.`);
  };
  const checkObjectLeaves = (fieldsRecord: Record<string, FieldDescriptor>, where: string): void => {
    for (const [k, leaf] of Object.entries(fieldsRecord)) {
      checkKey(k, where);
      if (!isLeaf(leaf)) {
        throw new Error(`cairn: ${where} "${k}" must be a leaf field; containers nest one level only.`);
      }
      if (leaf.type === 'reference') {
        throw new Error(`cairn: ${where} "${k}" is a reference; a reference inside an object is not supported this phase. Model it as the parent's own concept, or use a top-level array(reference).`);
      }
    }
  };
  for (const [key, field] of Object.entries(record)) {
    checkKey(key, 'the field');
    if (field.type === 'object') {
      checkObjectLeaves(field.fields, `the object field "${key}" sub-field`);
    } else if (field.type === 'array') {
      const item = field.item;
      if (item.type === 'object') {
        checkObjectLeaves(item.fields, `the array field "${key}" row sub-field`);
      } else if (!isLeaf(item)) {
        throw new Error(`cairn: the array field "${key}" item must be a leaf or a flat object; an array of arrays is not allowed.`);
      }
    }
  }
}

/**
 * Build a fieldset from a key-to-descriptor record. The returned schema carries the descriptors, a
 *  server-derived validator that coerces per type and returns field-keyed errors or normalized data,
 *  and the Standard Schema conformance property whose issues map each error to a single-segment path.
 */
export function fieldset<const R extends Record<string, FieldDescriptor>>(
  record: R,
  options: FieldsetOptions = {},
): Fieldset<R> {
  checkSeoImageFields(record);
  checkContainerNesting(record);
  // Compile each text/textarea pattern once at construction, so a malformed pattern fails loudly here
  // (mirroring v1's compilePatterns) rather than on every save. Keyed by the structural path
  // ('faq.code', 'address.zip') so a nested leaf's compiled pattern is found regardless of row index,
  // recursing one level into an object and an array(object).
  const patterns = new Map<string, RegExp>();
  const compilePatternsIn = (rec: Record<string, FieldDescriptor>, prefix: string[]): void => {
    for (const [k, f] of Object.entries(rec)) {
      if ((f.type === 'text' || f.type === 'textarea') && f.pattern != null) {
        patterns.set([...prefix, k].join('.'), compilePattern(f.pattern, f.label));
      } else if (f.type === 'object') {
        compilePatternsIn(f.fields, [...prefix, k]);
      } else if (f.type === 'array' && f.item.type === 'object') {
        compilePatternsIn(f.item.fields, [...prefix, k]);
      } else if (f.type === 'array' && (f.item.type === 'text' || f.item.type === 'textarea') && f.item.pattern != null) {
        patterns.set([...prefix, k].join('.'), compilePattern(f.item.pattern, f.item.label));
      }
    }
  };
  compilePatternsIn(record, []);
  const validate = (frontmatter: Record<string, unknown>, body: string): ValidationResult => {
    const data: Record<string, unknown> = {};
    const issues: ValidationIssue[] = [];
    for (const [key, field] of Object.entries(record)) {
      const outcome = validateField([key], field, frontmatter[key], patterns);
      issues.push(...outcome.issues);
      if ('value' in outcome) data[key] = outcome.value;
    }
    if (issues.length > 0) {
      // Back-compat: derive the flat errors map from the located issues, keying each top-level field by
      // the first message that mentions it, so a consumer reading `errors[fieldName]` still works.
      const errors: Record<string, string> = {};
      for (const issue of issues) {
        const top = String(issue.path[0]);
        if (!(top in errors)) errors[top] = issue.message;
      }
      return { ok: false, errors, issues };
    }
    const refined = options.refine?.(data, body);
    if (refined && Object.keys(refined).length > 0) {
      return { ok: false, errors: refined, issues: Object.entries(refined).map(([k, m]) => ({ path: [k], message: m })) };
    }
    return { ok: true, data };
  };
  const standard: StandardSchemaV1<StandardInput, Record<string, unknown>>['~standard'] = {
    version: 1,
    vendor: 'cairn',
    validate: (value) => {
      const { frontmatter = {}, body = '' } = (value ?? {}) as Partial<StandardInput>;
      const result = validate(frontmatter ?? {}, body ?? '');
      return result.ok
        ? { value: result.data }
        : { issues: result.issues ?? Object.entries(result.errors).map(([key, message]) => ({ message, path: [key] })) };
    },
  };
  return { fields: record, behavior: {}, validate, '~standard': standard };
}

/**
 * Resolve each descriptor's `default` to a form-initial value, so a fresh entry opens prefilled. The
 *  `'today'` sentinel on a date field resolves through the passed `now` to its `YYYY-MM-DD` form; an
 *  empty-string or `false` default is omitted, so an untouched field commits no key (the
 *  minimal-frontmatter invariant). With no `now`, a `'today'` default is omitted rather than read off
 *  a real clock, since library code must stay deterministic and Workers-safe.
 */
export function initialValues(fieldset: Fieldset, now?: Date): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fieldset.fields)) {
    const value = field.default;
    if (value === undefined || value === '' || value === false) continue;
    if (field.type === 'date' && value === 'today') {
      if (now) values[key] = now.toISOString().slice(0, 10);
      continue;
    }
    values[key] = value;
  }
  return values;
}
