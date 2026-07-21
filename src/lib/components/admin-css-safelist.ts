// This module carries no runtime logic. It exists so scripts/admin-css.input.css's `@source
// "../src/lib/components/**/*.{svelte,ts,js}"` glob scans it: Tailwind only compiles a class it can
// find as literal text somewhere in the scanned tree, so a daisyUI class with no shipped admin
// component reference (a "dead daisy class") never reaches the compiled cairn-admin.css and silently
// fails to style anything a consumer site tries to use it on. The pass-B "admin CSS class-inventory
// gap" harvest finding named this trap: it hid a dead `stats` band in cairn's own admin overview strip
// (fixed with scoped CSS instead), which is what motivated a standing, documented safelist rather than
// a one-off fix.
//
// The blessed set is curated, not exhaustive: it carries only the families the ASC admin-toolkit
// design survey (aksailingclub-org's docs/2026-07-20-admin-toolkit-research-survey.md, "Assembly
// doctrine: daisyUI-first") names as needed for a general-purpose admin toolkit built on cairn's admin
// CSS, so a site-authored screen can reach for the vocabulary before cairn's own components adopt it.
// It is never "add all of daisyUI"; extending it is a deliberate, documented act, the same as any
// other change to the admin's compiled surface.

/**
 * The blessed daisyUI 5 classes the admin CSS build compiles even though no shipped cairn admin
 * component references them yet, so a site-authored admin screen can use the vocabulary immediately.
 * Grouped by family; each family's comment notes which member classes the admin already compiles from
 * its own usage (kept here anyway, for one documented, audit-complete list) and which were newly added.
 */
export const ADMIN_CSS_SAFELIST = [
  // table: the AdminTable toolkit component's two named density tiers (compact/comfortable) plus
  // zebra striping. `table` and `table-sm` already compile from the admin's own usage; `table-zebra`
  // and `table-xs` are new.
  'table',
  'table-sm',
  'table-xs',
  'table-zebra',

  // stats: the StatBand/StatTile toolkit component. None of this family compiles from the admin's
  // own usage today; all seven are new.
  'stats',
  'stat',
  'stat-title',
  'stat-value',
  'stat-desc',
  'stat-figure',
  'stat-actions',

  // toast: the feedback-tier toolkit component (distinct from `alert`, which the admin already
  // compiles). The base class and every placement modifier are new.
  'toast',
  'toast-start',
  'toast-center',
  'toast-end',
  'toast-top',
  'toast-middle',
  'toast-bottom',

  // indicator: the CountBadge/AttentionMark toolkit component. `indicator` and `indicator-item`
  // already compile from the admin's own usage; the placement modifiers are new.
  'indicator',
  'indicator-item',
  'indicator-start',
  'indicator-center',
  'indicator-end',
  'indicator-top',
  'indicator-middle',
  'indicator-bottom',

  // status: the StatusChip toolkit component's status dot. The base class already compiles from the
  // admin's own usage; every color and size variant is new.
  'status',
  'status-primary',
  'status-secondary',
  'status-accent',
  'status-neutral',
  'status-info',
  'status-success',
  'status-warning',
  'status-error',
  'status-xs',
  'status-sm',
  'status-md',
  'status-lg',
  'status-xl',

  // join: the Pagination and ListToolbar toolkit components (the segmented filter's own wrapping
  // div). `join` itself compiles from the admin-toolkit's own literal `class="join"` usage now
  // that the CSS build's `@source` scans src/lib/admin-toolkit (the visual-regression repair this
  // safelist entry documents: admin-toolkit was never added to the scan root when it graduated out
  // of src/lib/components, so its own usage alone did not compile the class, and the segmented
  // filter rendered as a plain block div with no compiled `.join` rule at all). Blessed here
  // anyway, deliberately rather than incidentally, so a future admin-toolkit refactor away from a
  // literal `class="join"` string can never silently drop the rule again. Verified against the
  // built sheet that every `btn` variant the join-pagination idiom needs (`btn`, `btn-active`,
  // `btn-sm`, ...) already compiles from the admin's own usage, so no `btn` addition belongs in
  // this safelist.
  'join',
  'join-item',
  'join-horizontal',
  'join-vertical',

  // badge: the TagChip toolkit component's category badges (StatusChip reuses `badge` plus the
  // `status` family above for system-set state, per the survey's Polaris/Atlassian/Spectrum
  // convergence). `badge`, `badge-ghost`, and every color and size variant already compile from the
  // admin's own usage; `badge-soft`, `badge-outline`, and `badge-dash` are new.
  'badge-soft',
  'badge-outline',
  'badge-dash',
] as const;
