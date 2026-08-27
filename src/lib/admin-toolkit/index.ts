// cairn-cms: the `/admin-toolkit` public barrel. General-purpose primitives a site building its own
// `/admin/` screen (or cairn's own admin screens) composes instead of hand-rolling a bespoke
// parallel. Two tiers share this one charter: the FIELD primitives (`FieldLabel`, `FieldRow`,
// `TextInput`, `SelectInput`, most merged here from the retired `admin-fields` subpath in the C2
// breaking-window pass, R3) render one labeled control, or a row of them, in the admin's label and
// control rhythm, and the SCREEN-SCAFFOLD primitives (`PageHeader`, `OfficeList`, `AdminTable`,
// `ListToolbar`, `Pagination`, `StatusChip`, `EmptyState`, `ExpandableRow`, `MediaPicker`) plus
// the formatters compose a whole screen's chrome. Born in aksailingclub-org's theme layer and graduated here by
// re-expression, not a file copy: each export's contract stays general-purpose, never a domain
// assumption from its first consumer.
// `TextInput`/`SelectInput` are named for the element they wrap, not `TextField`/`SelectField`,
// because the root barrel's field *descriptor* arms already own those names; two subpaths exporting
// different things under one name is the agent trap this pass exists to remove.
export {
  ageFromBirthdate,
  formatCivilDate,
  formatMoney,
  formatPhone,
  formatTimestamp,
  itemNoun,
  type FormatCivilDateOptions,
  type FormatMoneyOptions,
  type FormatPhoneOptions,
  type FormatTimestampOptions,
  type ItemLabel,
} from './format.js';
export {
  default as StatusChip,
  STATUS_CHIP_DOT_CLASS,
  type StatusChipRegister,
  type StatusChipSize,
  type StatusChipTone,
} from './StatusChip.svelte';
export {
  default as Pagination,
  computeItemRange,
  computePageWindow,
  type ItemRange,
  type PageWindowItem,
} from './Pagination.svelte';
export { default as AdminTable, type AdminTableDensity } from './AdminTable.svelte';
export {
  default as ListToolbar,
  computeAppliedFilters,
  computeCountLine,
  type AppliedFilterPill,
  type ListToolbarAction,
  type ListToolbarFilter,
  type ListToolbarFilterOption,
} from './ListToolbar.svelte';
export { default as PageHeader } from './PageHeader.svelte';
export { default as OfficeList } from './OfficeList.svelte';
export { default as EmptyState, type EmptyStateHeadingLevel } from './EmptyState.svelte';
export { default as ExpandableRow } from './ExpandableRow.svelte';
// The media picker files under `components/` because it composes cairn's own media vocabulary
// (`media/reference`, `media/naming`, the shell's media-base context), and it publishes from here
// because this is the barrel a site building its own admin screen reads. `MediaLibraryEntry`
// publishes beside it for the same reason `ItemLabel` publishes beside `Pagination`: it sits in the
// component's own prop signature, so a consumer typing that prop needs the name. `/sveltekit` keeps
// its own re-export of the type as R4 closure over `MediaLibraryData.assets`.
export {
  default as MediaPicker,
  type MediaLibraryEntry,
  type MediaSelection,
} from '../components/MediaPicker.svelte';
export { default as FieldLabel } from './FieldLabel.svelte';
export { default as FieldRow } from './FieldRow.svelte';
export { default as SelectInput, type SelectInputOption } from './SelectInput.svelte';
export { default as TextInput } from './TextInput.svelte';
