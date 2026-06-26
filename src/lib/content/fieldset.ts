// cairn-cms: the fieldset primitive (Contract v2). A key-to-descriptor record becomes a schema
// carrying the descriptors as plain data, a server-derived validator, and the Standard Schema
// conformance property. The validator coerces per type, drops an empty optional field, and returns
// field-keyed errors or normalized data. This is the additive v2 path alongside `defineFields`; the
// inferred-type and default-resolution arms land in later tasks, and the cutover is a later plan.
import type { FieldDescriptor, ImageValue } from './fields.js';
import type { ValidationResult } from './types.js';
import type { StandardInput, StandardSchemaV1 } from './standard-schema.js';
import { dateInputValue, isCalendarDate } from './frontmatter.js';
import { compilePattern, dateBoundsError, patternError, stringLengthError } from './field-rules.js';

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
      : D extends { type: 'select'; options: readonly (infer O extends string)[] }
        ? O
        : D extends { type: 'multiselect'; options: readonly (infer O extends string)[] }
          ? O[]
          : D extends { type: 'multiselect' }
            ? string[]
            : string;

/** Flatten an intersection into a single readable object type. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * The normalized frontmatter type inferred from a fieldset's descriptor record. A descriptor
 *  declared `required: true` is a required key; every other descriptor is optional.
 */
type Infer<R extends Record<string, FieldDescriptor>> = Prettify<
  { -readonly [K in keyof R as R[K] extends { required: true } ? K : never]: ValueOf<R[K]> } & {
    -readonly [K in keyof R as R[K] extends { required: true } ? never : K]?: ValueOf<R[K]>;
  }
>;

/** Extract the inferred frontmatter type from a `Fieldset`. */
export type InferFieldset<S> = S extends Fieldset<infer R> ? Infer<R> : never;

// Coerce one image value to the stored `{ src, alt, caption?, decorative? }` shape, ported from
// validate.ts. Default a missing alt to empty (alt is debt, never a save block), trim and drop a
// blank caption, keep decorative only when an explicit true, and drop the whole key when src is empty.
// A required image with an empty src is the one error this arm raises.
function coerceImage(
  field: Extract<FieldDescriptor, { type: 'image' }>,
  key: string,
  value: unknown,
  data: Record<string, unknown>,
  errors: Record<string, string>,
): void {
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
      data[key] = normalized;
    }
  }
  if (field.required && src === '') errors[key] = `${field.label} is required`;
}

// Coerce a raw value to the trimmed string the empty check and constraints run on. A parsed value may
// arrive from parseMarkdown, not only a form string: a Date on a date or datetime field, a JS number on
// a number field. A finite 0 coerces to '0', never read as empty, since 0 is a real number a YAML scalar
// carries; a NaN or non-finite number stays '' and routes to the number error in validateField.
function coerceToText(type: FieldDescriptor['type'], value: unknown): string {
  if (type === 'date' && value instanceof Date) return dateInputValue(value);
  if (type === 'datetime' && value instanceof Date) return value.toISOString();
  if (type === 'number' && typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return '';
}

// Validate one descriptor against its raw value, writing into `data` or `errors`. Empty or absent is
// "not provided" and is read BEFORE type coercion, uniformly: a required field errors, an optional
// field drops (no key, no error). Only a non-empty value is coerced. boolean is the exception: true
// stores true, anything else omits the key. number relies on the empty-first drop so an empty optional
// number never becomes Number('') === 0.
function validateField(
  key: string,
  field: FieldDescriptor,
  value: unknown,
  data: Record<string, unknown>,
  errors: Record<string, string>,
  patterns: Map<string, RegExp>,
): void {
  // boolean: presence is the value; an unchecked or absent box omits the key (no draft: false noise).
  if (field.type === 'boolean') {
    if (value === true) data[key] = true;
    return;
  }

  // multiselect: a string array; drop empties, reject an unknown value when options is closed. An empty
  // list omits the key (a required empty errors); the array path is the one non-string coercion. A lone
  // non-empty scalar (a single tag a YAML scalar carries) coerces to a single-element list, rather than
  // dropping to [] and reading as "required" while present. An empty string or a non-string-non-array
  // stays the empty list.
  if (field.type === 'multiselect') {
    let raw: string[];
    if (Array.isArray(value)) raw = value.map(String);
    else if (typeof value === 'string' && value.trim() !== '') raw = [value.trim()];
    else raw = [];
    const list = raw.map((v) => v.trim()).filter((v) => v !== '');
    if (field.required && list.length === 0) {
      errors[key] = `${field.label} is required`;
      return;
    }
    const { options } = field;
    if (options) {
      const unknown = list.find((v) => !options.includes(v));
      if (unknown !== undefined) {
        errors[key] = `${field.label} contains an unknown value: ${unknown}`;
        return;
      }
    }
    if (list.length > 0) data[key] = list;
    return;
  }

  // image: the nested object arm, dropping the key on empty src.
  if (field.type === 'image') {
    coerceImage(field, key, value, data, errors);
    return;
  }

  // Every other type is "not provided when empty" first, then coerced. `coerceToText` turns a parsed
  // value into its string form BEFORE the empty check, so a real parsed value (a Date on a date or
  // datetime field, a number on a number field) is not read as empty.
  const text = coerceToText(field.type, value);
  if (text === '') {
    if (field.required) errors[key] = `${field.label} is required`;
    return;
  }

  switch (field.type) {
    case 'number': {
      const n = Number(text);
      // Reject NaN and the non-finite values Number() yields for "Infinity"/"1e400", which an
      // isNaN check alone would pass through and commit as a YAML .inf scalar.
      if (!Number.isFinite(n)) errors[key] = `${field.label} must be a number`;
      else if (field.integer && !Number.isInteger(n)) errors[key] = `${field.label} must be a whole number`;
      else if (field.min != null && n < field.min) errors[key] = `${field.label} must be at least ${field.min}`;
      else if (field.max != null && n > field.max) errors[key] = `${field.label} must be at most ${field.max}`;
      else data[key] = n;
      break;
    }
    case 'select': {
      if (!field.options.includes(text)) errors[key] = `${field.label} contains an unknown value: ${text}`;
      else data[key] = text;
      break;
    }
    case 'url': {
      if (!URL_RE.test(text)) errors[key] = `${field.label} is not a valid URL`;
      else data[key] = text;
      break;
    }
    case 'email': {
      if (!EMAIL_RE.test(text)) errors[key] = `${field.label} is not a valid email address`;
      else data[key] = text;
      break;
    }
    case 'date': {
      if (!isCalendarDate(text)) {
        errors[key] = `${field.label} must be a valid date (YYYY-MM-DD)`;
        break;
      }
      const boundsError = dateBoundsError(text, field, field.label);
      if (boundsError != null) {
        errors[key] = boundsError;
        break;
      }
      data[key] = text;
      break;
    }
    default: {
      // text, textarea, datetime: a trimmed non-empty string. text and textarea also enforce the
      // string-length and pattern constraints (v1 parity); datetime stays a plain string for now,
      // since its bounds are out of scope this pass and v1 has no datetime equivalent to match.
      if (field.type === 'text' || field.type === 'textarea') {
        const lengthError = stringLengthError(text, field, field.label);
        if (lengthError != null) {
          errors[key] = lengthError;
          break;
        }
        const formatError = patternError(text, patterns.get(key), field.label);
        if (formatError != null) {
          errors[key] = formatError;
          break;
        }
      }
      data[key] = text;
    }
  }
}

// At most one image field may feed the social card, so the og:image is unambiguous. A v2 fieldset
// marks that field with an explicit `seo: true`; there is no field-name default, since the record key
// is arbitrary. Two seo images is a site config error, so fail loudly at declaration (v1 parity).
function checkSeoImageFields(record: Record<string, FieldDescriptor>): void {
  const seo = Object.entries(record).filter(([, field]) => field.type === 'image' && field.seo === true);
  if (seo.length > 1) {
    const names = seo.map(([key]) => `"${key}"`).join(', ');
    throw new Error(
      `cairn: a concept declares at most one SEO image field, but found ${seo.length} (${names}). ` +
        'Set seo: false on all but one, or rename the extra image fields so only one feeds the social card.',
    );
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
  // Compile each text/textarea pattern once at construction, so a malformed pattern fails loudly here
  // (mirroring v1's compilePatterns) rather than on every save. Keyed by field name for validateField.
  const patterns = new Map<string, RegExp>();
  for (const [key, field] of Object.entries(record)) {
    if ((field.type === 'text' || field.type === 'textarea') && field.pattern != null) {
      patterns.set(key, compilePattern(field.pattern, field.label));
    }
  }
  const validate = (frontmatter: Record<string, unknown>, body: string): ValidationResult => {
    const data: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    for (const [key, field] of Object.entries(record)) {
      validateField(key, field, frontmatter[key], data, errors, patterns);
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const refined = options.refine?.(data, body);
    return refined && Object.keys(refined).length > 0 ? { ok: false, errors: refined } : { ok: true, data };
  };
  const standard: StandardSchemaV1<StandardInput, Record<string, unknown>>['~standard'] = {
    version: 1,
    vendor: 'cairn',
    validate: (value) => {
      const { frontmatter = {}, body = '' } = (value ?? {}) as Partial<StandardInput>;
      const result = validate(frontmatter ?? {}, body ?? '');
      return result.ok
        ? { value: result.data }
        : { issues: Object.entries(result.errors).map(([key, message]) => ({ message, path: [key] })) };
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
