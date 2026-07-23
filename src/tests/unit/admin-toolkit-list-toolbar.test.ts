import { describe, expect, it, vi } from 'vitest';
import { computeAppliedFilters, computeCountLine, computeFacetLabel } from '../../lib/admin-toolkit/list-toolbar.js';
import type { ListToolbarFilter } from '../../lib/admin-toolkit/list-toolbar.js';

function standingFilter(overrides: Partial<ListToolbarFilter> = {}): ListToolbarFilter {
  return {
    id: 'standing',
    label: 'Standing',
    options: [
      { value: 'all', label: 'All' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'former', label: 'Former' },
    ],
    value: 'all',
    onChange: vi.fn(),
    ...overrides,
  };
}

describe('computeAppliedFilters', () => {
  it('omits a filter still at its default value', () => {
    expect(computeAppliedFilters([standingFilter()])).toEqual([]);
  });

  it('produces a pill for a filter away from its default, labeled from the matching option', () => {
    expect(computeAppliedFilters([standingFilter({ value: 'overdue' })])).toEqual([
      { id: 'standing', label: 'Overdue' },
    ]);
  });

  it('the applied/removed round-trip: setting back to the default value clears the pill again', () => {
    const applied = computeAppliedFilters([standingFilter({ value: 'former' })]);
    expect(applied).toEqual([{ id: 'standing', label: 'Former' }]);

    const removed = computeAppliedFilters([standingFilter({ value: 'all' })]);
    expect(removed).toEqual([]);
  });

  it('honors a non-default defaultValue', () => {
    const filter = standingFilter({
      value: 'members',
      defaultValue: 'members',
      options: [
        { value: 'members', label: 'Members only' },
        { value: 'archived', label: 'Archived' },
      ],
    });
    expect(computeAppliedFilters([filter])).toEqual([]);
    expect(computeAppliedFilters([{ ...filter, value: 'archived' }])).toEqual([
      { id: 'standing', label: 'Archived' },
    ]);
  });

  it('falls back to the raw value when no option matches it', () => {
    expect(computeAppliedFilters([standingFilter({ value: 'stale-value' })])).toEqual([
      { id: 'standing', label: 'stale-value' },
    ]);
  });

  it('produces one pill per applied filter, in the filters array order', () => {
    const holdings = standingFilter({
      id: 'holdings',
      label: 'Holdings',
      value: 'holding',
      options: [
        { value: 'all', label: 'All' },
        { value: 'holding', label: 'Holding assets' },
      ],
    });
    expect(computeAppliedFilters([standingFilter({ value: 'overdue' }), holdings])).toEqual([
      { id: 'standing', label: 'Overdue' },
      { id: 'holdings', label: 'Holding assets' },
    ]);
  });
});

describe('computeCountLine', () => {
  it('states the bare count and item label with no applied filters', () => {
    expect(computeCountLine(149, 'households', [])).toBe('149 households');
  });

  it('appends every applied-filter label, in order, joined by a middle dot', () => {
    expect(computeCountLine(12, 'households', ['overdue', 'holding assets'])).toBe(
      '12 households · overdue · holding assets',
    );
  });

  it('states a zero count rather than omitting the line', () => {
    expect(computeCountLine(0, 'households', ['former'])).toBe('0 households · former');
  });

  it('picks the singular noun at exactly 1 when itemLabel is an { one, many } pair', () => {
    expect(computeCountLine(1, { one: 'household', many: 'households' }, [])).toBe('1 household');
  });

  it('picks the plural noun at any other count when itemLabel is an { one, many } pair', () => {
    expect(computeCountLine(6, { one: 'household', many: 'households' }, [])).toBe('6 households');
    expect(computeCountLine(0, { one: 'household', many: 'households' }, [])).toBe('0 households');
  });
});

describe('computeFacetLabel', () => {
  it('renders the bare filter label at rest', () => {
    expect(computeFacetLabel(standingFilter())).toBe('Standing');
  });

  it('renders "<label>: <value>" once the value departs the default', () => {
    expect(computeFacetLabel(standingFilter({ value: 'overdue' }))).toBe('Standing: Overdue');
  });

  it('honors a non-default defaultValue', () => {
    const filter = standingFilter({
      value: 'archived',
      defaultValue: 'members',
      options: [
        { value: 'members', label: 'Members only' },
        { value: 'archived', label: 'Archived' },
      ],
    });
    expect(computeFacetLabel(filter)).toBe('Standing: Archived');
    expect(computeFacetLabel({ ...filter, value: 'members' })).toBe('Standing');
  });

  it('falls back to the raw value when no option matches it', () => {
    expect(computeFacetLabel(standingFilter({ value: 'stale-value' }))).toBe('Standing: stale-value');
  });
});
