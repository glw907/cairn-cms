// cairn-cms: the field descriptor union (Contract v2's fieldset primitive). Each interface below is a
// leaf or container's plain-data shape (label, constraints, a type discriminant); `defineFieldset()` reads
// this record to derive the validator, and the editor form reads it to render inputs. The `fields`
// constructor namespace captures each call site's literal options with a `const` type parameter, so a
// concept's literals (a `select`'s option union, `required: true`) survive into the descriptor
// type for `Infer` to read; the runtime value is unchanged.
/** The stored value of an image field; re-exported so this module owns the image shape too. */
export type { ImageValue } from './types.js';

/** Common to every field descriptor: the form label and the universal options. */
interface FieldBase {
  /** Form label. Required on every builder except `object`. */
  label: string;
  /**
   * One author-facing sentence shown under the field and tied to the input with `aria-describedby`.
   *  Not a validation rule. A `date` field shows a built-in publish-clarity hint when `help` is unset,
   *  so the date never reads as if it schedules publishing; setting `help` replaces that hint, and it
   *  cannot be suppressed entirely.
   */
  help?: string;
  /**
   * Sets the HTML `required` attribute on the control (a closed `multiselect` signals it on the
   *  group), makes the inferred key non-optional, and makes an empty value fail the save with
   *  "<label> is required".
   */
  required?: boolean;
  /**
   * The initial value a new entry's create form opens with. Never applied to an existing or
   *  hand-written file, and never overrides a value already in the frontmatter. A `date` field also
   *  accepts `'today'`, which resolves to the request's UTC date as `YYYY-MM-DD`. An empty string or
   *  `false` writes no key.
   */
  default?: string | boolean;
}
/**
 * A single-line text input.
 * @public
 */
export interface TextField extends FieldBase {
  type: 'text';
  /** The fewest characters the trimmed value may hold. Enforced at the save, never rendered as an input attribute. */
  min?: number;
  /** The most characters the trimmed value may hold. Enforced at the save, never rendered as an input attribute. */
  max?: number;
  /** The exact character count the trimmed value must hold. The first failing length rule reports. */
  length?: number;
  /**
   * A regular-expression source string the value must match, tested unanchored and with no flags,
   *  so it needs an explicit `^` and `$` to match the whole value (unlike the HTML `pattern`
   *  attribute). Enforced at the save, never rendered as an input attribute. A malformed source
   *  throws when `defineFieldset` runs.
   */
  pattern?: string;
}
/**
 * A multi-line text input.
 * @public
 */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  /** The input's height in text rows. Defaults to 3. */
  rows?: number;
  /** The fewest characters the trimmed value may hold. Enforced at the save, never rendered as an input attribute. */
  min?: number;
  /** The most characters the trimmed value may hold. Enforced at the save, never rendered as an input attribute. */
  max?: number;
  /** The exact character count the trimmed value must hold. */
  length?: number;
  /** A regular-expression source string; same unanchored, flagless match and declaration-time throw as `TextField.pattern`. */
  pattern?: string;
}
/**
 * A numeric input.
 * @public
 */
export interface NumberField extends FieldBase {
  type: 'number';
  /** The smallest value allowed, also rendered as the input's `min` attribute. */
  min?: number;
  /** The largest value allowed, also rendered as the input's `max` attribute. */
  max?: number;
  /** Constrain the value to whole numbers: a fraction fails the save, and the input gets `step="1"`. */
  integer?: boolean;
}
/**
 * A single-choice input over a closed option list.
 * @public
 */
export interface SelectField extends FieldBase {
  type: 'select';
  /**
   * The closed set of allowed values. The control carries a leading empty choice that stores no
   *  value; a value outside the set fails the save.
   */
  options: readonly string[];
}
/**
 * A multiple-choice input.
 * @public
 */
export interface MultiselectField extends FieldBase {
  type: 'multiselect';
  /**
   * The allowed values; omitted leaves the set open. When set, a value outside it fails the save,
   *  including under `creatable`. Renders as checkboxes unless `creatable` is set.
   */
  options?: readonly string[];
  /** Render an open comma-separated tag input instead of checkboxes. A value outside `options` still fails the save. */
  creatable?: boolean;
  /**
   * Placeholder text for the open comma-separated input. Defaults to "Separate values with commas"
   *  when the field sets no `help`; a closed checkbox group has none.
   */
  placeholder?: string;
  /**
   * Mark the field as a site-wide taxonomy whose values pool across entries. At most one top-level
   *  multiselect per concept may set it; a second, or one inside a container, throws at declaration.
   *  Declare it open and creatable with no literal `options`: once the site configures a
   *  `vocabulary`, the engine sources the options from it, rejects a save of a value that is
   *  neither in the vocabulary nor already on the entry, and keeps an already-present orphan value.
   */
  taxonomy?: boolean;
}
/**
 * A URL input. The validator accepts only an absolute `http://` or `https://` URL with no
 * whitespace: a root-relative path or a `mailto:` value fails the save.
 * @public
 */
export interface UrlField extends FieldBase {
  type: 'url';
}
/**
 * A calendar-date input.
 * @public
 */
export interface DateField extends FieldBase {
  type: 'date';
  /** Earliest allowed date as YYYY-MM-DD. Enforced at the save, never rendered on the input. */
  min?: string;
  /** Latest allowed date as YYYY-MM-DD. Enforced at the save, never rendered on the input. */
  max?: string;
}
/**
 * A checkbox; absent means false.
 * @public
 */
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
/**
 * A glyph chosen from the adapter's icon set; the stored value is the glyph's name. Renders a glyph
 * picker when the adapter supplies an icon set and a plain text input when it does not.
 * @public
 */
export interface IconField extends FieldBase {
  type: 'icon';
}
/**
 * A hero image whose stored value is the nested ImageValue object. A missing `alt` defaults to empty
 * and never blocks a save; a `required` image with no picked source is the one error this type raises.
 * @public
 */
export interface ImageField extends FieldBase {
  type: 'image';
  /** Whether this field feeds the social-card image. */
  seo?: boolean;
}
/**
 * A group of leaf fields, stored as a nested object. Holds only leaves, never another container, a
 * `reference`, or an `seo` image; any of those throws when `defineFieldset` runs. All-empty optional
 * leaves omit the key, and a required empty group fails the save.
 * @public
 */
export interface ObjectField extends Omit<FieldBase, 'label'> {
  type: 'object';
  /**
   * Optional group label. An object inside an array is labeled by the array (and summarized per row by
   *  itemLabel), so it may omit this; a top-level object supplies it for the group legend.
   */
  label?: string;
  /** The leaf fields this group holds, keyed by frontmatter sub-key. */
  fields: Record<string, FieldDescriptor>;
}
/**
 * A single edge to one entry of a named concept, stored as that target's id. Not allowed
 * inside an `object`. A value that is not a well-formed entry id fails the save.
 * @public
 */
export interface ReferenceField extends FieldBase {
  type: 'reference';
  /**
   * The concept whose entries this field references. A name that no concept declared under
   *  `content` makes the engine throw when it composes the runtime, naming the concept, the field,
   *  and the undeclared target.
   */
  concept: string;
}
/**
 * A repeatable field whose stored value is a list of its item's values. An optional empty list omits
 * its key and a required empty list fails the save. An `array` of `reference` items renders the
 * reference picker and stores a list of ids; any other item renders the repeatable-row editor. The item may not itself be an `array`, and a
 * flat `object` item may not hold a container.
 * @public
 */
export interface ArrayField extends FieldBase {
  type: 'array';
  /** The descriptor each list element conforms to: a leaf, or a flat object of leaves. */
  item: FieldDescriptor;
  /**
   * The key of one sub-field of an `object` item, whose value the editor shows as a collapsed row's
   *  summary. It names a key, not display text: a key that matches no sub-field, or a blank value,
   *  falls back to the field's label and the row number, with no error. A leaf item ignores it and
   *  summarizes each row by the row's value.
   */
  itemLabel?: string;
}
/**
 * The plain-data descriptor union the form, validator, and inference all read. Grows per task.
 * @public
 */
export type FieldDescriptor =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | MultiselectField
  | UrlField
  | DateField
  | BooleanField
  | IconField
  | ImageField
  | ObjectField
  | ReferenceField
  | ArrayField;

/**
 * The constructor namespace a concept declares its fields with. Each constructor captures its
 * argument with a `const` type parameter and intersects it onto the descriptor, so the call-site
 * literals (`required: true`, a `select`/`multiselect` `options` union) survive into the descriptor
 * type for `Infer` to read. The runtime value is unchanged: still `{ type, ...o }`.
 * @public
 */
export const fields = {
  /** A single-line text field. */
  text: <const O extends Omit<TextField, 'type'>>(o: O): TextField & O => ({ type: 'text', ...o }),
  /** A multi-line text field. */
  textarea: <const O extends Omit<TextareaField, 'type'>>(o: O): TextareaField & O => ({ type: 'textarea', ...o }),
  /** A numeric field. */
  number: <const O extends Omit<NumberField, 'type'>>(o: O): NumberField & O => ({ type: 'number', ...o }),
  /** A single-choice field over a closed option list, preserving the literal option union. */
  select: <const O extends Omit<SelectField, 'type'>>(o: O): SelectField & O => ({ type: 'select', ...o }),
  /** A multiple-choice field, preserving the literal option union when one is given. */
  multiselect: <const O extends Omit<MultiselectField, 'type'>>(o: O): MultiselectField & O => ({ type: 'multiselect', ...o }),
  /** A URL field. */
  url: <const O extends Omit<UrlField, 'type'>>(o: O): UrlField & O => ({ type: 'url', ...o }),
  /** A calendar-date field. */
  date: <const O extends Omit<DateField, 'type'>>(o: O): DateField & O => ({ type: 'date', ...o }),
  /** A boolean checkbox field. */
  boolean: <const O extends Omit<BooleanField, 'type'>>(o: O): BooleanField & O => ({ type: 'boolean', ...o }),
  /** An icon field whose value is a glyph name from the adapter's icon set. */
  icon: <const O extends Omit<IconField, 'type'>>(o: O): IconField & O => ({ type: 'icon', ...o }),
  /** An image field whose value is the nested ImageValue object. */
  image: <const O extends Omit<ImageField, 'type'>>(o: O): ImageField & O => ({ type: 'image', ...o }),
  /** A group of leaf fields, preserving each leaf's type for inference. Label is optional (the array labels a row group). */
  object: <const F extends Record<string, FieldDescriptor>, const O extends Omit<ObjectField, 'type' | 'fields'>>(
    o: { fields: F } & O,
  ): ObjectField & { fields: F } & O => ({ type: 'object', ...o }),
  /** A single reference field storing one target entry's id. */
  reference: <const O extends Omit<ReferenceField, 'type'>>(o: O): ReferenceField & O => ({ type: 'reference', ...o }),
  /**
   * A repeatable field over one item descriptor, preserving the item type for inference. The item is
   *  a leaf, or a flat object of leaves; `defineFieldset` rejects deeper nesting at declaration.
   */
  array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, 'type' | 'item'>>(
    item: I,
    o?: O,
  ): ArrayField & { item: I } & O => ({ type: 'array', item, ...(o as O) }),
};
