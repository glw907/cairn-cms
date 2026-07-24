import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';
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

  it('never renders a separate applied-filter pills row, applied or not (the pills row retired)', () => {
    const atRest = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter()],
      count: 149,
      itemLabel: 'households',
    });
    expect(atRest.container.querySelector('.toolkit-toolbar-pills')).toBeNull();

    const applied = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu' })],
      count: 12,
      itemLabel: 'households',
    });
    expect(applied.container.querySelector('.toolkit-toolbar-pills')).toBeNull();
    expect(applied.container.querySelector('.toolkit-toolbar-pill')).toBeNull();
  });

  it("renders a 'menu' facet as a quiet bordered button showing the filter's own name at rest", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    expect(trigger.textContent).toContain('Standing');
    expect(screen.container.querySelector('.toolkit-toolbar-facet-clear')).toBeNull();
    expect(screen.container.querySelector('.toolkit-toolbar-facet-applied')).toBeNull();
  });

  it("shows a 'menu' facet's applied value in-control, with a separate inline clear element (not a nested button)", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu' })],
      count: 12,
      itemLabel: 'households',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    expect(trigger.textContent).toContain('Standing: Overdue');
    const facet = screen.container.querySelector('.toolkit-toolbar-facet-applied')!;
    expect(facet).not.toBeNull();
    const clear = screen.container.querySelector('[aria-label="Clear Standing filter"]')!;
    expect(clear).not.toBeNull();
    // The clear control is a sibling of the trigger, never nested inside it (nested interactive
    // controls are invalid markup and unreliable to activate).
    expect(trigger.contains(clear)).toBe(false);
    expect(clear.tagName).toBe('BUTTON');
  });

  it("calls onChange with the default value when a 'menu' facet's inline clear is activated", async () => {
    const onChange = vi.fn();
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu', onChange })],
      count: 12,
      itemLabel: 'households',
    });
    await screen.getByRole('button', { name: 'Clear Standing filter' }).click();
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it("opens a 'menu' facet's option list on a trigger click, with real toggle semantics", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.container.querySelector('.toolkit-toolbar-facet-menu')?.textContent).toContain('Overdue');
  });

  it("moves focus to a 'menu' facet's first option when it opens, the menu-button idiom", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    const firstOption = screen.getByRole('button', { name: 'All' });
    await expect.poll(() => document.activeElement).toBe(firstOption.element());
  });

  it("closes an open 'menu' facet when focus tabs past its last option, without moving focus again", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const lastOption = screen.getByRole('button', { name: 'Former' }).element();
    const nextControl = document.createElement('button');
    document.body.appendChild(nextControl);
    // A Tab out of the last option moves focus to whatever's next in the document and fires a
    // native focusout on the facet container with that element as `relatedTarget`.
    lastOption.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: nextControl }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).not.toBe(trigger.element());
    nextControl.remove();
  });

  it("selects a 'menu' facet's option, calls onChange, closes the menu, and returns focus to the trigger", async () => {
    const onChange = vi.fn();
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu', onChange })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    await screen.getByRole('button', { name: 'Overdue' }).click();
    expect(onChange).toHaveBeenCalledWith('overdue');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it("closes an open 'menu' facet on Escape and returns focus to its own trigger", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it("closes an open 'menu' facet on a pointerdown outside its own trigger and panel", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('only ever shows one facet menu open at a time', async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        standingFilter({ display: 'menu' }),
        standingFilter({ id: 'holdings', label: 'Holdings', display: 'menu' }),
      ],
      count: 149,
      itemLabel: 'households',
    });
    const standingTrigger = screen.getByRole('button', { name: 'Standing' });
    const holdingsTrigger = screen.getByRole('button', { name: 'Holdings' });
    await standingTrigger.click();
    await expect.element(standingTrigger).toHaveAttribute('aria-expanded', 'true');
    await holdingsTrigger.click();
    await expect.element(holdingsTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(standingTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  // Regression: the outside-click dismissal used to key `document.querySelector` on the bare
  // filter id ("standing"), not the component's own `uid`. Two `ListToolbar` instances sharing a
  // filter id then collided: the query always resolved the FIRST toolbar's facet container, so a
  // pointerdown inside the SECOND toolbar's own open menu read as "outside" and wrongly closed it.
  it("scopes a facet's outside-click dismissal by component instance, so a pointerdown inside a second toolbar's own open menu leaves it open", async () => {
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.appendChild(firstTarget);
    document.body.appendChild(secondTarget);

    render(ListToolbar, {
      target: firstTarget,
      props: {
        search: '',
        onSearch: () => {},
        filters: [standingFilter({ display: 'menu' })],
        count: 149,
        itemLabel: 'households',
      },
    } as never);
    const second = render(ListToolbar, {
      target: secondTarget,
      props: {
        search: '',
        onSearch: () => {},
        filters: [standingFilter({ display: 'menu' })],
        count: 149,
        itemLabel: 'households',
      },
    } as never);

    const secondTrigger = second.getByRole('button', { name: 'Standing' });
    await secondTrigger.click();
    await expect.element(secondTrigger).toHaveAttribute('aria-expanded', 'true');

    const secondOption = second.container.querySelector('.toolkit-toolbar-facet-menu button')!;
    secondOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(secondTrigger).toHaveAttribute('aria-expanded', 'true');

    firstTarget.remove();
    secondTarget.remove();
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

  it('picks the singular noun in the count line when itemLabel is an { one, many } pair and count is 1', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 1,
      itemLabel: { one: 'household', many: 'households' },
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('1 household');
  });

  it('picks the plural noun in the count line when itemLabel is an { one, many } pair and count is not 1', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 12,
      itemLabel: { one: 'household', many: 'households' },
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('12 households');
  });

  it('gives the count line a polite, atomic status role so a filter change is announced', () => {
    const screen = render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'households' });
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(count.getAttribute('role')).toBe('status');
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.getAttribute('aria-atomic')).toBe('true');
  });

  it("gives the 'menu' facet's inline clear control at least a 24x24 CSS px hit area", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu' })],
      count: 12,
      itemLabel: 'households',
    });
    const clear = screen.container.querySelector('.toolkit-toolbar-facet-clear')!;
    const style = getComputedStyle(clear);
    expect(parseFloat(style.width)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(style.height)).toBeGreaterThanOrEqual(24);
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

  // Regression: a segment's count used to read "All(6)" (the parenthesized form, with Svelte
  // collapsing the leading whitespace); the shipped device it graduated from read "All 6", the
  // count in its own visually secondary span, never in parentheses.
  it('gives a segmented option\'s count its own span, with no parenthesized reading', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [{ value: 'all', label: 'All', count: 6 }],
          value: 'all',
          onChange: () => {},
        },
      ],
      count: 6,
      itemLabel: 'entries',
    });
    const option = screen.getByRole('radio', { name: /all/i }).element();
    expect(option.textContent).not.toContain('(');
    expect(option.textContent).not.toContain(')');
    expect(option.querySelector('.toolkit-toolbar-segment-count')?.textContent).toBe('6');
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

// The layout contract, not just the markup: a segmented filter's options must actually share one
// row under production sizing. Component tests otherwise load only the source admin partial (no
// compiled daisyUI `.btn`/`.join` sizing), so the fit assertion injects the real compiled sheet
// (component-fit-test-needs-compiled-css) and sets data-theme, the same seam CairnAdminShell's own
// fit suites use. Regression: `.join`'s own base rule never compiled once ListToolbar graduated out
// of the `@source`-scanned src/lib/components tree (admin-toolkit was never added to the scan
// root), and the segmented filter's grid column was too narrow for its own options; both silently
// stacked the triage buttons one per line instead of one row.
describe('ListToolbar layout (compiled CSS)', () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    styleEl = document.createElement('style');
    styleEl.textContent = compiledAdminCss;
    document.head.appendChild(styleEl);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    styleEl.remove();
  });

  it('lays out a three-option segmented filter\'s buttons on one row, not stacked', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [
            { value: 'all', label: 'All', count: 6 },
            { value: 'draft', label: 'Pending edits', count: 2 },
            { value: 'published', label: 'Published', count: 4 },
          ],
          value: 'all',
          onChange: () => {},
        },
      ],
      count: 6,
      itemLabel: 'entries',
    });
    const group = screen.container.querySelector('[role="radiogroup"]')!;
    expect(['flex', 'inline-flex']).toContain(getComputedStyle(group).display);
    const tops = [...group.querySelectorAll('button')].map((b) => b.getBoundingClientRect().top);
    expect(new Set(tops).size).toBe(1);
  });

  // The Members-refinement-round-1 recomposition: the band is a flat flex row (not the prior
  // grid), search/select/facet controls force one shared 30px height rather than trusting
  // input-sm/btn-sm to already agree, and the search/count text land at the ruled 13px.
  it('lays out the band as a wrapped flex row, not a grid', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      primaryAction: { label: 'Add household', onClick: () => {} },
      count: 149,
      itemLabel: 'households',
    });
    const band = screen.container.querySelector('.toolkit-toolbar-band')!;
    const style = getComputedStyle(band);
    expect(style.display).toBe('flex');
    expect(style.flexWrap).toBe('wrap');
  });

  it('forces the search box and the menu facet control to the same 30px height', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const search = screen.container.querySelector('.toolkit-toolbar-search')!;
    const facet = screen.container.querySelector('.toolkit-toolbar-facet')!;
    expect(getComputedStyle(search).height).toBe('30px');
    expect(getComputedStyle(facet).height).toBe('30px');
  });

  it('sets the search input and count line text to the ruled 13px (0.8125rem)', () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 149,
      itemLabel: 'households',
    });
    const input = screen.container.querySelector('.toolkit-toolbar-search input')!;
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(getComputedStyle(input).fontSize).toBe('13px');
    expect(getComputedStyle(count).fontSize).toBe('13px');
  });

  it('gives the count line tabular-nums', () => {
    const screen = render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'households' });
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(getComputedStyle(count).fontVariantNumeric).toBe('tabular-nums');
  });

  it("gives an applied 'menu' facet the ratified border/fill treatment, distinct from its rest state", () => {
    const atRest = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const applied = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu' })],
      count: 12,
      itemLabel: 'households',
    });
    const restFacet = atRest.container.querySelector('.toolkit-toolbar-facet')!;
    const appliedFacet = applied.container.querySelector('.toolkit-toolbar-facet')!;
    const restStyle = getComputedStyle(restFacet);
    const appliedStyle = getComputedStyle(appliedFacet);
    expect(appliedStyle.borderColor).not.toBe(restStyle.borderColor);
    expect(appliedStyle.backgroundColor).not.toBe(restStyle.backgroundColor);
  });

  // Regression: `.toolkit-toolbar-facet` (daisyUI's own `.dropdown`, `position: relative`) used to
  // carry `overflow: hidden` to tidy the trigger/clear corner. daisyUI's `.dropdown-content` is
  // `position: absolute`, so this element is its containing block -- `overflow: hidden` clipped the
  // option list away entirely below the 30px-tall trigger, invisible in jsdom (no layout) and
  // undetected by any markup-only assertion (the list was present in the DOM, just unpainted).
  // This test only fails against real layout, hence the compiled-CSS/real-browser describe block.
  it("does not clip an open 'menu' facet's option list under its own container", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const facet = screen.container.querySelector('.toolkit-toolbar-facet')!;
    expect(getComputedStyle(facet).overflow).not.toBe('hidden');
  });

  it("keeps every option of an open 'menu' facet actually paintable, not clipped away by its container", async () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'households',
    });
    const trigger = screen.getByRole('button', { name: 'Standing' });
    await trigger.click();
    const overdueOption = screen.getByRole('button', { name: 'Overdue' }).element();
    const rect = overdueOption.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    // `elementFromPoint` only finds an element that is actually painted at that point; an
    // ancestor's `overflow: hidden` would clip the option away and this would resolve to
    // something else (or nothing) instead, the exact way the pre-fix bug was invisible to any
    // assertion that only checked the DOM, not what the browser actually paints.
    const paintedAt = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(paintedAt === overdueOption || overdueOption.contains(paintedAt)).toBe(true);
  });

  it("caps an applied 'menu' facet's in-control value at 14rem with an ellipsis", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter({ value: 'overdue', display: 'menu' })],
      count: 12,
      itemLabel: 'households',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    const value = screen.container.querySelector('.toolkit-toolbar-facet-value')!;
    expect(getComputedStyle(trigger).maxWidth).toBe('224px'); // 14rem at the default 16px root
    expect(getComputedStyle(value).textOverflow).toBe('ellipsis');
  });

  it("restyles the 'select' variant to the shared 30px height and 13px text", () => {
    const screen = render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [standingFilter()],
      count: 149,
      itemLabel: 'households',
    });
    const select = screen.container.querySelector('.toolkit-toolbar-select')!;
    const style = getComputedStyle(select);
    expect(style.height).toBe('30px');
    expect(style.fontSize).toBe('13px');
  });
});
