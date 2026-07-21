// cairn-cms: ListToolbar's pure filter arithmetic, graduated from aksailingclub-org's
// `src/admin-club/toolkit/ListToolbar.svelte` module context. Kept in a plain module (rather than
// only inside ListToolbar.svelte's `<script module>`) so the unit test project, which runs in Node
// with no Svelte plugin, can exercise the arithmetic directly; ListToolbar.svelte re-exports both
// from its own module context, preserving the "exported from module context" contract a consumer
// imports against, the same split `pagination-window.ts` already establishes for `Pagination`.

import { itemNoun, type ItemLabel } from './format.js';

/** One option in a `ListToolbarFilter`'s own vocabulary. */
export interface ListToolbarFilterOption {
  value: string;
  label: string;
  /**
   * An optional per-option match count, rendered beside the label in the segmented display
   * (graduation extension: ruling 6's finding-11 "segmented filter group" device). Omit for a
   * filter that carries no count of its own.
   */
  count?: number;
}

/**
 * One filter control. `promoted` (default `true`) chooses whether the control renders directly
 * in the toolbar band or behind the overflow disclosure; either way, a non-default `value`
 * produces an applied-filter pill and counts toward the count line's scope. `defaultValue`
 * (default `'all'`) is the value that means "no filter applied", the value the filter resets
 * to when its pill is removed.
 */
export interface ListToolbarFilter {
  /** Stable identity, used for Svelte keying and to find the filter a pill's remove targets. */
  id: string;
  /**
   * The control's accessible name (e.g. "Standing"). Never rendered as visible chrome for a
   * `'select'` display; a `'segmented'` display renders no separate label either, relying on
   * the options' own labels to carry meaning.
   */
  label: string;
  options: ListToolbarFilterOption[];
  /** The filter's current value, one of `options`' own values. */
  value: string;
  /**
   * Called with the new value on every change, including a pill's own remove control (which
   * calls this with `defaultValue`).
   */
  onChange: (value: string) => void;
  /** The "no filter applied" value. Defaults to `'all'`. */
  defaultValue?: string;
  /**
   * Whether this filter renders in the band directly, or behind the overflow disclosure.
   * Defaults to `true`.
   */
  promoted?: boolean;
  /**
   * The filter's presentation: a `<select>` (the default) or a `'segmented'` group of toggle
   * buttons (graduation extension: ruling 6, finding-11's segmented filter device; ConceptList's
   * publish-state filter and MediaLibrary's triage radiogroup are the first consumers). Defaults
   * `'select'`.
   */
  display?: 'select' | 'segmented';
}

/** The toolbar's one primary action, always right-aligned. */
export interface ListToolbarAction {
  label: string;
  onClick: () => void;
}

/** One rendered applied-filter pill. */
export interface AppliedFilterPill {
  id: string;
  label: string;
}

/**
 * Every filter currently away from its own default value, in the order given, as a pill. A
 * filter's pill label reads from the matching option's own `label` (falling back to the raw
 * `value` if the options list doesn't carry a match, so a stale or externally-set value never
 * renders a blank pill). Exported so the round-trip (a filter applied, then removed) is unit
 * tested against this pure function directly, the same way `Pagination`'s own windowing math is.
 */
export function computeAppliedFilters(filters: ListToolbarFilter[]): AppliedFilterPill[] {
  const pills: AppliedFilterPill[] = [];
  for (const filter of filters) {
    const defaultValue = filter.defaultValue ?? 'all';
    if (filter.value === defaultValue) continue;
    const option = filter.options.find((candidate) => candidate.value === filter.value);
    pills.push({ id: filter.id, label: option?.label ?? filter.value });
  }
  return pills;
}

/**
 * The scope-stating count line's own copy pattern: `"<count> <itemLabel>"`, followed by every
 * applied-filter label joined with a middle dot (`"12 households · Overdue · Holding assets"`).
 * With no applied filters, the line is just the bare count and item label; the count line always
 * renders, but it only ever states a scope beyond "everything" when a filter is actually applied.
 * `itemLabel` accepts a plain string (invariant across every count, the original contract
 * unchanged) or an `{ one, many }` pair, picked by grammatical number through `itemNoun` -- so
 * `computeCountLine(1, { one: 'household', many: 'households' }, [])` reads `"1 household"`,
 * never `"1 households"`.
 */
export function computeCountLine(count: number, itemLabel: string | ItemLabel, appliedLabels: string[]): string {
  return [`${count} ${itemNoun(count, itemLabel)}`, ...appliedLabels].join(' · ');
}
