// cairn-cms: the `/admin-toolkit` public barrel. General-purpose primitives a site building its own
// `/admin/` screen (or cairn's own admin screens) composes instead of hand-rolling a bespoke
// parallel. Two tiers share this one charter: the FIELD primitive (`FieldLabel`, merged here from
// the retired `admin-fields` subpath) renders one labeled
// control's wrapping label in the admin's label rhythm, and the SCREEN-SCAFFOLD primitives
// (`PageHeader`, `OfficeList`, `AdminTable`, `ListToolbar`, `ToolbarDisclosure`, `Pagination`,
// `StatusChip`, `EmptyState`, `ExpandableRow`, `MediaPicker`) plus the formatters compose a whole
// screen's chrome. Born in a consumer site's theme layer and graduated here by re-expression, not
// a file copy: each export's contract stays general-purpose, never a domain assumption from its
// first consumer. `ToolbarDisclosure` itself graduated a level deeper, out of `ListToolbar`'s own
// two duplicated disclosure mechanics (`audit-admin-listtoolbar`'s reshape), rather than out of a
// site. `TextInput`/`SelectInput`/`FieldRow` retired from this subpath: zero consumers anywhere in
// the engine, and their underlying markup composes directly out of
// `FieldLabel` plus a bare control, which stays the documented recipe.
export {
  formatCivilDate,
  formatTimestamp,
  type FormatCivilDateOptions,
  type FormatTimestampOptions,
  type ItemLabel,
} from './format.js';
export {
  default as StatusChip,
  type StatusChipRegister,
  type StatusChipSize,
} from './StatusChip.svelte';
export { default as Pagination } from './Pagination.svelte';
export { default as AdminTable, type AdminTableDensity } from './AdminTable.svelte';
export {
  default as ListToolbar,
  type ListToolbarAction,
  type ListToolbarFilter,
  type ListToolbarFilterOption,
} from './ListToolbar.svelte';
export {
  default as ToolbarDisclosure,
  type ToolbarDisclosureAriaHaspopup,
  type ToolbarDisclosurePanelAttrs,
  type ToolbarDisclosureTriggerAttrs,
} from './ToolbarDisclosure.svelte';
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
