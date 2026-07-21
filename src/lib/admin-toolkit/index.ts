// cairn-cms: the `/admin-toolkit` public barrel. The toolkit's own general-purpose components and
// formatters, born in aksailingclub-org's theme layer and graduated here so a site building its own
// admin screens (or cairn's own admin screens) reaches for one shared vocabulary instead of a
// bespoke parallel. Re-expression, not a file copy: each export's contract stays general-purpose,
// never a domain assumption from its first consumer.
export {
  ageFromBirthdate,
  formatCivilDate,
  formatMoney,
  formatTimestamp,
  type FormatCivilDateOptions,
  type FormatMoneyOptions,
  type FormatTimestampOptions,
} from './format.js';
export { default as StatusChip, STATUS_CHIP_DOT_CLASS, type StatusChipSize, type StatusChipTone } from './StatusChip.svelte';
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
export { default as EmptyState, type EmptyStateHeadingLevel } from './EmptyState.svelte';
