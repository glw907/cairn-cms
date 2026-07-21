import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import ListToolbar from '../../lib/admin-toolkit/ListToolbar.svelte';
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

describe('ListToolbar', () => {
  it('renders the search box with its accessible name and no autofocus by default', () => {
    const screen = render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'households' });
    const input = screen.container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Search');
    expect(input.hasAttribute('autofocus')).toBe(false);
  });

  it('renders a promoted filter as a select in the band, not behind the overflow disclosure', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter()],
      count: 149,
      itemLabel: 'households',
    });
    expect(screen.container.querySelector('[aria-label="Standing"]')).not.toBeNull();
    expect(screen.container.querySelector('.dropdown-content')).toBeNull();
  });

  it('renders a non-promoted filter behind the overflow disclosure only', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ promoted: false })],
      count: 149,
      itemLabel: 'households',
    });
    expect(screen.container.textContent).toContain('More filters');
    expect(screen.container.querySelector('.dropdown-content')).not.toBeNull();
    expect(screen.container.querySelector('[aria-label="Standing"]')).not.toBeNull();
  });

  it('gives the overflow disclosure real toggle semantics that open on a click', async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ promoted: false })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders exactly one primary action, right-aligned in its own toolbar-primary class', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      primaryAction: { label: 'Add household', onClick: () => {} },
      count: 149,
      itemLabel: 'households',
    });
    expect(screen.container.querySelectorAll('.toolkit-toolbar-primary')).toHaveLength(1);
    expect(screen.container.textContent).toContain('Add household');
  });

  it('renders no primary action markup when none is given', () => {
    const screen = render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'households' });
    expect(screen.container.querySelector('.toolkit-toolbar-primary')).toBeNull();
  });

  it('renders an applied-filter pill in the neutral badge tone with a labeled remove control', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue' })],
      count: 12,
      itemLabel: 'households',
    });
    const pill = screen.container.querySelector('.toolkit-toolbar-pill')!;
    expect(pill.className).toContain('badge-neutral');
    expect(pill.className).not.toContain('badge-error');
    expect(pill.className).not.toContain('badge-warning');
    expect(pill.textContent).toContain('Overdue');
    expect(screen.container.querySelector('[aria-label="Remove Overdue filter"]')).not.toBeNull();
  });

  it('calls onChange with the default value when a pill is removed', async () => {
    const onChange = vi.fn();
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', onChange })],
      count: 12,
      itemLabel: 'households',
    });
    await screen.getByRole('button', { name: 'Remove Overdue filter' }).click();
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('renders no pills row when every filter is at its default', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter()],
      count: 149,
      itemLabel: 'households',
    });
    expect(screen.container.querySelector('.toolkit-toolbar-pills')).toBeNull();
  });

  it('states the applied scope in the count line, matching computeCountLine', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue' })],
      count: 12,
      itemLabel: 'households',
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('12 households · Overdue');
  });

  it('renders a segmented filter as a group of toggle buttons, one active at a time', async () => {
    const onChange = vi.fn();
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [
            { value: 'all', label: 'All' },
            { value: 'draft', label: 'Draft' },
          ],
          value: 'all',
          onChange,
        },
      ],
      count: 149,
      itemLabel: 'entries',
    });
    const active = screen.getByRole('button', { name: 'All' });
    await expect.element(active).toHaveAttribute('aria-pressed', 'true');
    await screen.getByRole('button', { name: 'Draft' }).click();
    expect(onChange).toHaveBeenCalledWith('draft');
  });

  it('renders per-option counts on a segmented filter when given', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [
            { value: 'all', label: 'All', count: 149 },
            { value: 'draft', label: 'Draft', count: 4 },
          ],
          value: 'all',
          onChange: () => {},
        },
      ],
      count: 149,
      itemLabel: 'entries',
    });
    expect(screen.container.textContent).toContain('149');
    expect(screen.container.textContent).toContain('4');
  });

  it('renders the trailing snippet after the toolbar band', () => {
    const trailing = createRawSnippet(() => ({ render: () => '<button type="button">Grid view</button>' }));
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 149,
      itemLabel: 'entries',
      trailing,
    });
    expect(screen.container.textContent).toContain('Grid view');
  });
});
