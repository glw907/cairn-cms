// cairn-cms: the field descriptor union (Contract v2's fieldset primitive). Each interface below is a
// leaf or container's plain-data shape (label, constraints, a type discriminant); `fieldset()` reads
// this record to derive the validator, and the editor form reads it to render inputs. The `fields`
// constructor namespace captures each call site's literal options with a `const` type parameter, so a
// concept's own literals (a `select`'s option union, `required: true`) survive into the descriptor
// type for `Infer` to read; the runtime value is unchanged.
/** The stored value of an image field; re-exported so this module owns the image shape too. */
export type { ImageValue } from './types.js';

/** Common to every field descriptor: the form label and the universal options. */
interface FieldBase {
  /** Form label. */
  label: string;
  /** One author-facing sentence shown under the field. */
  help?: string;
  /** A required field fails validation when empty. */
  required?: boolean;
  /** Form-render-time initial value; a sentinel like "today" resolves at render (Task 9). */
  default?: string | boolean;
}
/** A single-line text input. */
export interface TextField extends FieldBase {
  type: 'text';
  min?: number; max?: number; length?: number;
  /** A regular-expression source string the value must match. */
  pattern?: string;
}
/** A multi-line text input. */
export interface TextareaField extends FieldBase {
  type: 'textarea';
  rows?: number; min?: number; max?: number; length?: number; pattern?: string;
}
/** A numeric input. */
export interface NumberField extends FieldBase {
  type: 'number';
  min?: number; max?: number;
  /** Constrain the value to whole numbers. */
  integer?: boolean;
}
/** A single-choice input over a closed option list. */
export interface SelectField extends FieldBase {
  type: 'select';
  /** The closed set of allowed values. */
  options: readonly string[];
}
/** A multiple-choice input. */
export interface MultiselectField extends FieldBase {
  type: 'multiselect';
  /** The allowed values; omitted leaves the set open. */
  options?: readonly string[];
  /** Allow the author to add values not in the list. */
  creatable?: boolean;
  /** Placeholder text for the open/creatable comma-separated input (freetags parity). */
  placeholder?: string;
  /** Mark the field as a site-wide taxonomy whose values pool across entries. */
  taxonomy?: boolean;
}
/** A URL input whose format the validator enforces. */
export interface UrlField extends FieldBase {
  type: 'url';
}
/** An email-address input whose format the validator enforces. */
export interface EmailField extends FieldBase {
  type: 'email';
}
/** A calendar-date input. */
export interface DateField extends FieldBase {
  type: 'date';
  /** Earliest allowed date as YYYY-MM-DD. */
  min?: string;
  /** Latest allowed date as YYYY-MM-DD. */
  max?: string;
}
/** A date-and-time input. */
export interface DatetimeField extends FieldBase {
  type: 'datetime';
  /** Earliest allowed moment as an ISO string. */
  min?: string;
  /** Latest allowed moment as an ISO string. */
  max?: string;
}
/** A checkbox; absent means false. */
export interface BooleanField extends FieldBase {
  type: 'boolean';
}
/** A glyph chosen from the adapter's icon set; the stored value is the glyph's name. */
export interface IconField extends FieldBase {
  type: 'icon';
}
/** A hero image whose stored value is the nested ImageValue object. */
export interface ImageField extends FieldBase {
  type: 'image';
  /** Whether this field feeds the social-card image. */
  seo?: boolean;
}
/** A group of leaf fields, stored as a nested object. Holds only leaves (no nested container). */
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
/** A single edge to one entry of a named concept, stored as that target's permanent id. */
export interface ReferenceField extends FieldBase {
  type: 'reference';
  /** The concept whose entries this field references. */
  concept: string;
}
/** A repeatable field whose stored value is a list of its item's values. */
export interface ArrayField extends FieldBase {
  type: 'array';
  /** The descriptor each list element conforms to: a leaf, or a flat object of leaves. */
  item: FieldDescriptor;
  /** A label for one row, shown beside the add and remove controls. */
  itemLabel?: string;
}
/** The plain-data descriptor union the form, validator, and inference all read. Grows per task. */
export type FieldDescriptor =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | MultiselectField
  | UrlField
  | EmailField
  | DateField
  | DatetimeField
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
  /** An email-address field. */
  email: <const O extends Omit<EmailField, 'type'>>(o: O): EmailField & O => ({ type: 'email', ...o }),
  /** A calendar-date field. */
  date: <const O extends Omit<DateField, 'type'>>(o: O): DateField & O => ({ type: 'date', ...o }),
  /** A date-and-time field. */
  datetime: <const O extends Omit<DatetimeField, 'type'>>(o: O): DatetimeField & O => ({ type: 'datetime', ...o }),
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
  /** A single reference field storing one target entry's permanent id. */
  reference: <const O extends Omit<ReferenceField, 'type'>>(o: O): ReferenceField & O => ({ type: 'reference', ...o }),
  /**
   * A repeatable field over one item descriptor, preserving the item type for inference. The item is
   *  a leaf, or a flat object of leaves; `fieldset` rejects deeper nesting at declaration.
   */
  array: <const I extends FieldDescriptor, const O extends Omit<ArrayField, 'type' | 'item'>>(
    item: I,
    o?: O,
  ): ArrayField & { item: I } & O => ({ type: 'array', item, ...(o as O) }),
};
