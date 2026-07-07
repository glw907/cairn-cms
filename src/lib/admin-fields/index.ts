// cairn-cms: the admin field-renderer reuse seam (Part C item 1 of the phase-2 design suite). A
// site building its own `/admin/` screen composes these instead of hand-rolling the admin's label
// and control rhythm. This barrel exports the smallest coherent set proven by the
// aksailingclub-org club-admin scaffold: a select, a text input, and the label wrapper both share.
// It grows the same way the engine's own field vocabulary does, one real consumer at a time.
export { default as FieldLabel } from './FieldLabel.svelte';
export { default as SelectField, type SelectFieldOption } from './SelectField.svelte';
export { default as TextField } from './TextField.svelte';
