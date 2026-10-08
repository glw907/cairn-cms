// This module carries no runtime logic. It exists so scripts/build/admin-css.input.css's `@source
// "../src/lib/admin/**/*.{svelte,ts,js}"` glob scans it, a documented scan source for the
// families below, findable by grep rather than only by their presence in the compiled sheet.
//
// The list no longer decides which daisyUI classes reach the shipped sheet: the admin build
// compiles every daisyUI component and utility class, calendar excluded, from the `@source
// inline(...)` line scripts/build/daisyui-classes.mjs generates. Before that full compile,
// Tailwind compiled only a class it found as literal text in the scanned tree, so a daisyUI class
// with no admin call site silently failed to style anything a consumer site used it on; that trap
// once hid a dead `stats` band in cairn's own overview strip. The list stays, grouped by family,
// as the one place a consumer's admin-toolkit vocabulary is named and explained.

/**
 * The daisyUI 5 classes an admin-toolkit consumer screen most likely reaches for, documented and
 * grouped by family even though the admin's full compile already ships every daisyUI class on its
 * own. Each family's comment notes which member classes the admin already compiled from its own
 * usage before the full compile, and which were newly added to this list at the time.
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

  // status: the base class already compiles from the admin's own usage (a `role="status"` live
  // region on several admin surfaces shares the token, coincidentally, with daisyUI's `status`
  // dot class), so it stays blessed here for one documented, audit-complete list even though the
  // dot itself is gone. The chip register second generation
  // (https://github.com/glw907/cairn-cms/blob/main/docs/internal/probes/2026-08-26-chip-registers-v2.md)
  // retired StatusChip's own `status`-dot rendering: the owner probe ruled the 6px dot illegible
  // toolkit-wide and fused its tone signal into the chip register instead, so every color and size variant this family used to bless, thirteen
  // entries, is removed here. CHANGELOG carries the removal. Naming a member class literally in
  // this comment would defeat the removal: the admin CSS build's `@source` scan is a naive text
  // matcher over this whole file, comments included, so any literal token here compiles into the
  // shipped sheet regardless of whether it appears in the array below.
  'status',

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

  // badge: the TagChip toolkit component's category badges (StatusChip reuses `badge` for
  // system-set state, per the survey's Polaris/Atlassian/Spectrum convergence). `badge` and
  // `badge-outline` already compile from the admin's own usage; `badge-soft` and `badge-dash` are
  // new. The stock ghost badge modifier stays OUT of this toolkit vocabulary: it was
  // retired from cairn's own tree in favor of the three chip registers
  // (`cairn-chip-quiet`/`cairn-chip-warning`/`cairn-chip-outline` in cairn-admin.css, StatusChip's
  // own `register` prop), and a new toolkit screen should reach for those, not the stock modifier.
  // It still ships in the compiled sheet, through the separate compatibility safelist in
  // scripts/build/admin-css.input.css (issue #12, 0.91.1): a consumer's own admin markup may still
  // ride `badge-ghost` even after cairn's own tree moved on, since the shipped sheet's class
  // inventory is a de facto public API.
  'badge-soft',
  'badge-outline',
  'badge-dash',
  // `badge-error`/`badge-success`: these first compiled only as a side effect of StatusChip's own
  // first-generation doc comment naming them in prose (Tailwind's scanner is a naive text match,
  // blind to comment-versus-code context), then stayed blessed here as an incidental side effect
  // of preserving the de facto public sheet once that prose left with the tone/dot retirement. The
  // blessing is now deliberate and covers every blessed badge class, not just these two: each
  // class is measured against the register set's own floors on both packaged themes, the raw
  // daisyUI alternative to `StatusChip` (docs/internal/admin-design-system.md names the
  // when-to-use line). `badge-tier-legibility.test.ts` carries the measured numbers and is the one
  // place they're allowed to live; a comment repeating them here would just be a second copy to
  // fall out of date the next time daisyUI's recipe moves.
  'badge-error',
  'badge-success',
] as const;
