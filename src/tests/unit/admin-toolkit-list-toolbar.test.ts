import { describe, expect, it, vi } from 'vitest';
import { computeAppliedFilters, computeCountLine, computeFacetLabel } from '../../lib/admin-toolkit/list-toolbar.js';
import type { ListToolbarFilter } from '../../lib/admin-toolkit/list-toolbar.js';

function statusFilter(overrides: Partial<ListToolbarFilter> = {}): ListToolbarFilter {
  return {
    id: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'waitlisted', label: 'Waitlisted' },
    ],
    value: 'all',
    onChange: vi.fn(),
    ...overrides,
  };
}

describe('computeAppliedFilters', () => {
  it('omits a filter still at its default value', () => {
    expect(computeAppliedFilters([statusFilter()])).toEqual([]);
  });

  it('produces a pill for a filter away from its default, labeled from the matching option', () => {
    expect(computeAppliedFilters([statusFilter({ value: 'pending' })])).toEqual([
      { id: 'status', label: 'Pending' },
    ]);
  });

  it('the applied/removed round-trip: setting back to the default value clears the pill again', () => {
    const applied = computeAppliedFilters([statusFilter({ value: 'waitlisted' })]);
    expect(applied).toEqual([{ id: 'status', label: 'Waitlisted' }]);

    const removed = computeAppliedFilters([statusFilter({ value: 'all' })]);
    expect(removed).toEqual([]);
  });

  it('honors a non-default defaultValue', () => {
    const filter = statusFilter({
      value: 'active',
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Members only' },
        { value: 'archived', label: 'Archived' },
      ],
    });
    expect(computeAppliedFilters([filter])).toEqual([]);
    expect(computeAppliedFilters([{ ...filter, value: 'archived' }])).toEqual([
      { id: 'status', label: 'Archived' },
    ]);
  });

  it('falls back to the raw value when no option matches it', () => {
    expect(computeAppliedFilters([statusFilter({ value: 'stale-value' })])).toEqual([
      { id: 'status', label: 'stale-value' },
    ]);
  });

  it('produces one pill per applied filter, in the filters array order', () => {
    const venue = statusFilter({
      id: 'venue',
      label: 'Venue',
      value: 'main-hall',
      options: [
        { value: 'all', label: 'All' },
        { value: 'main-hall', label: 'Main hall' },
      ],
    });
    expect(computeAppliedFilters([statusFilter({ value: 'pending' }), venue])).toEqual([
      { id: 'status', label: 'Pending' },
      { id: 'venue', label: 'Main hall' },
    ]);
  });
});

describe('computeCountLine', () => {
  it('states the bare count and item label with no applied filters', () => {
    expect(computeCountLine(149, 'signups', [])).toBe('149 signups');
  });

  it('appends every applied-filter label, in order, joined by a middle dot', () => {
    expect(computeCountLine(12, 'signups', ['pending', 'main hall'])).toBe(
      '12 signups · pending · main hall',
    );
  });

  it('states a zero count rather than omitting the line', () => {
    expect(computeCountLine(0, 'signups', ['waitlisted'])).toBe('0 signups · waitlisted');
  });

  it('picks the singular noun at exactly 1 when itemLabel is an { one, many } pair', () => {
    expect(computeCountLine(1, { one: 'signup', many: 'signups' }, [])).toBe('1 signup');
  });

  it('picks the plural noun at any other count when itemLabel is an { one, many } pair', () => {
    expect(computeCountLine(6, { one: 'signup', many: 'signups' }, [])).toBe('6 signups');
    expect(computeCountLine(0, { one: 'signup', many: 'signups' }, [])).toBe('0 signups');
  });
});

describe('computeFacetLabel', () => {
  it('renders the bare filter label at rest', () => {
    expect(computeFacetLabel(statusFilter())).toBe('Status');
  });

  it('renders "<label>: <value>" once the value departs the default', () => {
    expect(computeFacetLabel(statusFilter({ value: 'pending' }))).toBe('Status: Pending');
  });

  it('honors a non-default defaultValue', () => {
    const filter = statusFilter({
      value: 'archived',
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Members only' },
        { value: 'archived', label: 'Archived' },
      ],
    });
    expect(computeFacetLabel(filter)).toBe('Status: Archived');
    expect(computeFacetLabel({ ...filter, value: 'active' })).toBe('Status');
  });

  it('falls back to the raw value when no option matches it', () => {
    expect(computeFacetLabel(statusFilter({ value: 'stale-value' }))).toBe('Status: stale-value');
  });
});
