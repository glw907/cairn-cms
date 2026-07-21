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

  it('gives the count line a polite, atomic status role so a filter change is announced', () => {
    const screen = render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'households' });
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(count.getAttribute('role')).toBe('status');
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.getAttribute('aria-atomic')).toBe('true');
  });

  it('gives the pill remove control at least a 24x24 CSS px hit area', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue' })],
      count: 12,
      itemLabel: 'households',
    });
    const remove = screen.container.querySelector('.toolkit-toolbar-pill-remove')!;
    const style = getComputedStyle(remove);
    expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(24);
  });

  it('closes the overflow disclosure on Escape and returns focus to the trigger', async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ promoted: false })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    trigger.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it('closes the overflow disclosure on a pointerdown outside the trigger and panel', async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ promoted: false })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the overflow disclosure open on a pointerdown inside the panel', async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ promoted: false })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    const panel = screen.container.querySelector('.dropdown-content')!;
    panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders a segmented filter as an ARIA radiogroup, one checked at a time', async () => {
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
    expect(screen.container.querySelector('[role="radiogroup"]')).not.toBeNull();
    const active = screen.getByRole('radio', { name: /all/i });
    await expect.element(active).toHaveAttribute('aria-checked', 'true');
    expect(active.element().querySelector('svg')).not.toBeNull();
    await screen.getByRole('radio', { name: 'Draft' }).click();
    expect(onChange).toHaveBeenCalledWith('draft');
  });

  it("moves a segmented filter's focus with its selection on ArrowRight, Home, and End", async () => {
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
            { value: 'published', label: 'Published' },
          ],
          value: 'all',
          onChange,
        },
      ],
      count: 149,
      itemLabel: 'entries',
    });
    const radios = () => [...screen.container.querySelectorAll<HTMLElement>('[role="radio"]')];
    // One tab stop: only the checked radio (All) is tabbable, matching the native radio pattern.
    expect(radios().filter((r) => r.getAttribute('tabindex') === '0').length).toBe(1);

    radios()[0].focus();
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('draft');
    await expect.poll(() => document.activeElement).toBe(radios()[1]);

    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('published');
    await expect.poll(() => document.activeElement).toBe(radios()[2]);

    radios()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('all');
    await expect.poll(() => document.activeElement).toBe(radios()[0]);
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
