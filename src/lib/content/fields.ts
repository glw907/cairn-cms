/** Common to every field descriptor: the form label and the universal options. */
export interface FieldBase {
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
/** The plain-data descriptor union the form, validator, and inference all read. Grows per task. */
export type FieldDescriptor =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | MultiselectField
  | UrlField
  | EmailField;

/** The constructor namespace a concept declares its fields with. */
export const fields = {
  /** A single-line text field. */
  text: (o: Omit<TextField, 'type'>): TextField => ({ type: 'text', ...o }),
  /** A multi-line text field. */
  textarea: (o: Omit<TextareaField, 'type'>): TextareaField => ({ type: 'textarea', ...o }),
  /** A numeric field. */
  number: (o: Omit<NumberField, 'type'>): NumberField => ({ type: 'number', ...o }),
  /** A single-choice field over a closed option list. */
  select: (o: Omit<SelectField, 'type'>): SelectField => ({ type: 'select', ...o }),
  /** A multiple-choice field. */
  multiselect: (o: Omit<MultiselectField, 'type'>): MultiselectField => ({ type: 'multiselect', ...o }),
  /** A URL field. */
  url: (o: Omit<UrlField, 'type'>): UrlField => ({ type: 'url', ...o }),
  /** An email-address field. */
  email: (o: Omit<EmailField, 'type'>): EmailField => ({ type: 'email', ...o }),
};
