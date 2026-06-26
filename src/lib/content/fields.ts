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
/** The plain-data descriptor union the form, validator, and inference all read. Grows per task. */
export type FieldDescriptor = TextField | TextareaField;

/** The constructor namespace a concept declares its fields with. */
export const fields = {
  /** A single-line text field. */
  text: (o: Omit<TextField, 'type'>): TextField => ({ type: 'text', ...o }),
  /** A multi-line text field. */
  textarea: (o: Omit<TextareaField, 'type'>): TextareaField => ({ type: 'textarea', ...o }),
};
