import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import compiledAdminCss from '../../../dist/admin/cairn-admin.css?inline';
import ListToolbar from '../../lib/admin-toolkit/ListToolbar.svelte';
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

// The exact facet shape a five-facet list screen renders (four `'select'` facets plus
// one `'menu'` facet, C2's own stress case): the C2 972px/326px acceptance measurements below
// render this fixture, not a synthetic short-option stand-in, so a passing measurement actually
// proves the five-facet fixture's own option lengths fit.
function facetScreenFilters(): ListToolbarFilter[] {
  return [
    {
      id: 'status',
      label: 'Status',
      value: 'active',
      defaultValue: 'active',
      options: [
        { value: 'active', label: 'Confirmed + Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'pending', label: 'Pending' },
        { value: 'waitlisted', label: 'Waitlisted' },
      ],
      onChange: vi.fn(),
    },
    {
      id: 'venue',
      label: 'Venue',
      value: 'all',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Any venue' },
        { value: 'main-hall', label: 'Main hall' },
      ],
      onChange: vi.fn(),
    },
    {
      id: 'role',
      label: 'Role',
      value: 'all',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Any role' },
        { value: 'volunteer', label: 'Volunteer' },
      ],
      onChange: vi.fn(),
    },
    {
      id: 'class',
      label: 'Class',
      value: 'all',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Any class' },
        { value: 'beginner', label: 'Beginner Skills Clinic' },
        { value: 'maintenance', label: 'Trail Maintenance Day' },
      ],
      onChange: vi.fn(),
    },
    {
      id: 'archived',
      label: 'Archived',
      value: 'active',
      defaultValue: 'active',
      display: 'menu',
      options: [
        { value: 'active', label: 'Active only' },
        { value: 'include', label: 'Include archived' },
      ],
      onChange: vi.fn(),
    },
  ];
}

describe('ListToolbar', () => {
  it('renders the search box with its accessible name and no autofocus by default', async () => {
    const screen = await render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'signups' });
    const input = screen.container.querySelector('input')!;
    expect(input.getAttribute('aria-label')).toBe('Search');
    expect(input.hasAttribute('autofocus')).toBe(false);
  });

  it('renders a promoted filter as a select in the band, not behind the overflow disclosure', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter()],
      count: 149,
      itemLabel: 'signups',
    });
    expect(screen.container.querySelector('[aria-label="Status"]')).not.toBeNull();
    expect(screen.container.querySelector('.dropdown-content')).toBeNull();
  });

  it('renders a non-promoted filter behind the overflow disclosure only', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    expect(screen.container.textContent).toContain('More filters');
    expect(screen.container.querySelector('.dropdown-content')).not.toBeNull();
    expect(screen.container.querySelector('[aria-label="Status"]')).not.toBeNull();
  });

  it('gives the overflow disclosure real toggle semantics that open on a click', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders exactly one primary action, right-aligned in its own toolbar-primary class', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      primaryAction: { label: 'Add signup', onClick: () => {} },
      count: 149,
      itemLabel: 'signups',
    });
    expect(screen.container.querySelectorAll('.toolkit-toolbar-primary')).toHaveLength(1);
    expect(screen.container.textContent).toContain('Add signup');
  });

  it('renders no primary action markup when none is given', async () => {
    const screen = await render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'signups' });
    expect(screen.container.querySelector('.toolkit-toolbar-primary')).toBeNull();
  });

  it('never renders a separate applied-filter pills row, applied or not (the pills row retired)', async () => {
    const atRest = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter()],
      count: 149,
      itemLabel: 'signups',
    });
    expect(atRest.container.querySelector('.toolkit-toolbar-pills')).toBeNull();

    const applied = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
    });
    expect(applied.container.querySelector('.toolkit-toolbar-pills')).toBeNull();
    expect(applied.container.querySelector('.toolkit-toolbar-pill')).toBeNull();
  });

  it("renders a 'menu' facet as a quiet bordered button showing the filter's own name at rest", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    expect(trigger.textContent).toContain('Status');
    expect(screen.container.querySelector('.toolkit-toolbar-facet-clear')).toBeNull();
    expect(screen.container.querySelector('.toolkit-toolbar-facet-applied')).toBeNull();
  });

  it("shows a 'menu' facet's applied value in-control, with a separate inline clear element (not a nested button)", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    expect(trigger.textContent).toContain('Status: Pending');
    const facet = screen.container.querySelector('.toolkit-toolbar-facet-applied')!;
    expect(facet).not.toBeNull();
    const clear = screen.container.querySelector('[aria-label="Clear Status filter"]')!;
    expect(clear).not.toBeNull();
    // The clear control is a sibling of the trigger, never nested inside it (nested interactive
    // controls are invalid markup and unreliable to activate).
    expect(trigger.contains(clear)).toBe(false);
    expect(clear.tagName).toBe('BUTTON');
  });

  it("calls onChange with the default value when a 'menu' facet's inline clear is activated, returning focus to the trigger once the clear button unmounts", async () => {
    const onChange = vi.fn();
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu', onChange })],
      count: 12,
      itemLabel: 'signups',
    });
    await screen.getByRole('button', { name: 'Clear Status filter' }).click();
    expect(onChange).toHaveBeenCalledWith('all');
    // Mirrors what a real controlled caller does after `onChange`: re-render with the cleared
    // value, which unmounts the clear button this click landed on. Focus must already have moved
    // to the trigger before that unmount (clearFacet moves it first, ahead of the state change),
    // or it drops to `body` once the button holding it is gone.
    await screen.rerender({
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'all', display: 'menu', onChange })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it("opens a 'menu' facet's option list on a trigger click, with real toggle semantics", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.container.querySelector('.toolkit-toolbar-facet-menu')?.textContent).toContain('Pending');
  });

  it("moves focus to a 'menu' facet's first option when it opens, the menu-button idiom", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const firstOption = screen.getByRole('menuitemradio', { name: 'All' });
    await expect.poll(() => document.activeElement).toBe(firstOption.element());
  });

  it("closes an open 'menu' facet when focus tabs past its last option, without moving focus again", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const lastOption = screen.getByRole('menuitemradio', { name: 'Waitlisted' }).element() as HTMLElement;
    const nextControl = document.createElement('button');
    document.body.appendChild(nextControl);
    // A real focus move (not a synthetic `dispatchEvent`): by the time the container's own
    // `focusout` listener runs, the browser has already updated `document.activeElement` to the
    // new target, matching a real Tab keypress out of the panel's last option.
    lastOption.focus();
    await expect.poll(() => document.activeElement).toBe(lastOption);
    nextControl.focus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(nextControl);
    expect(document.activeElement).not.toBe(trigger.element());
    nextControl.remove();
  });

  it("selects a 'menu' facet's option, calls onChange, closes the menu, and returns focus to the trigger", async () => {
    const onChange = vi.fn();
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu', onChange })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    await screen.getByRole('menuitemradio', { name: 'Pending' }).click();
    expect(onChange).toHaveBeenCalledWith('pending');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it("closes an open 'menu' facet on Escape and returns focus to its own trigger", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    trigger.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it("closes an open 'menu' facet on a pointerdown outside its own trigger and panel", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('only ever shows one facet menu open at a time', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        statusFilter({ display: 'menu' }),
        statusFilter({ id: 'venue', label: 'Venue', display: 'menu' }),
      ],
      count: 149,
      itemLabel: 'signups',
    });
    const statusTrigger = screen.getByRole('button', { name: 'Status' });
    const holdingsTrigger = screen.getByRole('button', { name: 'Venue' });
    await statusTrigger.click();
    await expect.element(statusTrigger).toHaveAttribute('aria-expanded', 'true');
    await holdingsTrigger.click();
    await expect.element(holdingsTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(statusTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  // Proper menu semantics (the WAI menu-button pattern), not bare buttons in a plain list: the
  // option list carries `role="menu"` and each option `role="menuitemradio"` (a single-select
  // choice within the menu), so an AT user hears a menu of mutually exclusive options rather than
  // an unordered list of buttons.
  it("gives a 'menu' facet's option list real menu semantics (role=menu, role=menuitemradio)", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    expect(screen.getByRole('menu').element()).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'All' }).element()).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Pending' }).element()).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Waitlisted' }).element()).not.toBeNull();
  });

  // WCAG 1.3.1/4.1.2: a single-select filter's applied choice must be exposed to assistive tech,
  // not carried only by the sighted-only check glyph. Mirrors the segmented filter's own
  // aria-checked assertion above.
  it("exposes a 'menu' facet's applied option via aria-checked, not just the sighted check glyph", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status: Pending' });
    await trigger.click();
    await expect
      .element(screen.getByRole('menuitemradio', { name: 'Pending' }))
      .toHaveAttribute('aria-checked', 'true');
    await expect
      .element(screen.getByRole('menuitemradio', { name: 'All' }))
      .toHaveAttribute('aria-checked', 'false');
    await expect
      .element(screen.getByRole('menuitemradio', { name: 'Waitlisted' }))
      .toHaveAttribute('aria-checked', 'false');
  });

  // Locks the trigger<->menu contract: `aria-haspopup="menu"` names what kind of popup the trigger
  // owns, and `aria-controls` must resolve to that same menu's own id.
  it("gives a 'menu' facet's trigger an aria-haspopup=menu that resolves to its own menu via aria-controls", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    const controlsId = trigger.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    const menu = screen.container.querySelector('[role="menu"]')!;
    expect(menu.getAttribute('id')).toBe(controlsId);
  });

  // Roving tabindex (the standard menu keyboard model): only the currently-focused option is a
  // tab stop, so Tab moves straight out of the menu instead of stopping at every option in turn.
  it("gives a 'menu' facet's option list a roving tabindex, only the focused option tabbable", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    await expect.poll(() => options().filter((o) => o.getAttribute('tabindex') === '0').length).toBe(1);
    expect(options()[0].getAttribute('tabindex')).toBe('0');
    expect(options()[1].getAttribute('tabindex')).toBe('-1');
    expect(options()[2].getAttribute('tabindex')).toBe('-1');
  });

  // Regression: if a menu's own options array shrinks while it is open, a stale stored focus index
  // (pointing past the new end) used to leave every remaining option at tabindex="-1", with no tab
  // stop at all. The accessor clamps to the last valid index instead.
  it("keeps at least one 'menu' facet option tabbable when its options shrink out from under a stale focus index", async () => {
    const onChange = vi.fn();
    const filter: ListToolbarFilter = {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'waitlisted', label: 'Waitlisted' },
      ],
      value: 'all',
      onChange,
    };
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [{ ...filter, display: 'menu' }],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    // Move the roving focus to the last option (index 2), then shrink the options to just one.
    options()[2].focus();
    await expect.poll(() => document.activeElement).toBe(options()[2]);
    await screen.rerender({
      search: '',
      onSearch: () => {},
      filters: [{ ...filter, options: [{ value: 'all', label: 'All' }], display: 'menu' }],
      count: 149,
      itemLabel: 'signups',
    });
    const shrunkOptions = options();
    expect(shrunkOptions).toHaveLength(1);
    expect(shrunkOptions[0].getAttribute('tabindex')).toBe('0');
  });

  it("moves a 'menu' facet's roving focus with ArrowDown/ArrowUp, wrapping at the ends", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    await expect.poll(() => document.activeElement).toBe(options()[0]);

    options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[1]);
    expect(options()[1].getAttribute('tabindex')).toBe('0');
    expect(options()[0].getAttribute('tabindex')).toBe('-1');

    // ArrowUp from the first option wraps to the last, mirroring the segmented filter's own
    // roving keyboard model.
    options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[0]);
    options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[2]);
  });

  // APG menu-button behavior: reopening a menu always starts back at the first option, never a
  // prior arrow-key position (the reset-on-open comment on `facetFocusIndex` documents why this
  // matters: without it, a stale non-zero index is itself the only tabbable option, and
  // `ToolbarDisclosure`'s own focus-into-panel mechanic lands there instead of option 1).
  it("resets a 'menu' facet's roving focus to its first option on reopen, even after a prior arrow-key move", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    await expect.poll(() => document.activeElement).toBe(options()[0]);
    options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[2]);

    // Close, then reopen: focus (and the roving tabindex) must land back on option 1.
    trigger.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => document.activeElement).toBe(options()[0]);
    expect(options()[0].getAttribute('tabindex')).toBe('0');
  });

  it("moves a 'menu' facet's roving focus to the first/last option on Home/End", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const options = () => [...screen.container.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    await expect.poll(() => document.activeElement).toBe(options()[0]);
    options()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[2]);
    options()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await expect.poll(() => document.activeElement).toBe(options()[0]);
  });


  // Regression: the outside-click dismissal used to key `document.querySelector` on the bare
  // filter id ("status"), not the component's own `uid`. Two `ListToolbar` instances sharing a
  // filter id then collided: the query always resolved the FIRST toolbar's facet container, so a
  // pointerdown inside the SECOND toolbar's own open menu read as "outside" and wrongly closed it.
  it("scopes a facet's outside-click dismissal by component instance, so a pointerdown inside a second toolbar's own open menu leaves it open", async () => {
    const firstTarget = document.createElement('div');
    const secondTarget = document.createElement('div');
    document.body.appendChild(firstTarget);
    document.body.appendChild(secondTarget);

    await render(ListToolbar, {
      target: firstTarget,
      props: {
        search: '',
        onSearch: () => {},
        filters: [statusFilter({ display: 'menu' })],
        count: 149,
        itemLabel: 'signups',
      },
    });
    const second = await render(ListToolbar, {
      target: secondTarget,
      props: {
        search: '',
        onSearch: () => {},
        filters: [statusFilter({ display: 'menu' })],
        count: 149,
        itemLabel: 'signups',
      },
    });

    const secondTrigger = second.getByRole('button', { name: 'Status' });
    await secondTrigger.click();
    await expect.element(secondTrigger).toHaveAttribute('aria-expanded', 'true');

    const secondOption = second.container.querySelector('.toolkit-toolbar-facet-menu button')!;
    secondOption.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(secondTrigger).toHaveAttribute('aria-expanded', 'true');

    firstTarget.remove();
    secondTarget.remove();
  });

  it('states the applied scope in the count line, matching computeCountLine', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending' })],
      count: 12,
      itemLabel: 'signups',
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('12 signups · Pending');
  });

  it('picks the singular noun in the count line when itemLabel is an { one, many } pair and count is 1', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 1,
      itemLabel: { one: 'signup', many: 'signups' },
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('1 signup');
  });

  it('picks the plural noun in the count line when itemLabel is an { one, many } pair and count is not 1', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 12,
      itemLabel: { one: 'signup', many: 'signups' },
    });
    expect(screen.container.querySelector('.toolkit-toolbar-count')!.textContent).toBe('12 signups');
  });

  it('gives the count line a polite, atomic status role so a filter change is announced', async () => {
    const screen = await render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'signups' });
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(count.getAttribute('role')).toBe('status');
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.getAttribute('aria-atomic')).toBe('true');
  });

  it("gives the 'menu' facet's inline clear control at least a 24x24 CSS px hit area", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
    });
    const clear = screen.container.querySelector('.toolkit-toolbar-facet-clear')!;
    const style = getComputedStyle(clear);
    expect(parseFloat(style.width)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(style.height)).toBeGreaterThanOrEqual(24);
  });

  it('closes the overflow disclosure on Escape and returns focus to the trigger', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    trigger.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it('closes the overflow disclosure on a pointerdown outside the trigger and panel', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the overflow disclosure open on a pointerdown inside the panel', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' });
    await trigger.click();
    const panel = screen.container.querySelector('.dropdown-content')!;
    panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders a segmented filter as an ARIA radiogroup, one checked at a time', async () => {
    const onChange = vi.fn();
    const screen = await render(ListToolbar, {
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
    const screen = await render(ListToolbar, {
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

  it('renders per-option counts on a segmented filter when given', async () => {
    const screen = await render(ListToolbar, {
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
  it('gives a segmented option\'s count its own span, with no parenthesized reading', async () => {
    const screen = await render(ListToolbar, {
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

  it('renders the trailing snippet after the toolbar band', async () => {
    const trailing = createRawSnippet(() => ({ render: () => '<button type="button">Grid view</button>' }));
    const screen = await render(ListToolbar, {
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
// of the `@source`-scanned src/lib/admin tree (admin-toolkit was never added to the scan
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

  it('lays out a three-option segmented filter\'s buttons on one row, not stacked', async () => {
    const screen = await render(ListToolbar, {
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

  // The band is a flat flex row (not the prior
  // grid), search/select/facet/segmented controls share one row height because they all derive
  // from --size-field, and the search/count text land at the ruled 13px.
  it('lays out the band as a wrapped flex row, not a grid', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      primaryAction: { label: 'Add signup', onClick: () => {} },
      count: 149,
      itemLabel: 'signups',
    });
    const band = screen.container.querySelector('.toolkit-toolbar-band')!;
    const style = getComputedStyle(band);
    expect(style.display).toBe('flex');
    expect(style.flexWrap).toBe('wrap');
  });

  // Was 30px (a hand-pinned height on both elements): `--size-field`'s
  // `0.28125rem` step now makes `input-sm` and `btn-sm` agree on their own, so the search box
  // needs no forced height at all, and the facet container (a plain div) matches them at 36px
  // through the same `calc(var(--size-field) * 8)` formula daisyUI's own `-sm` variants use.
  it('keeps the search box and the menu facet control at the same 36px row height', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const search = screen.container.querySelector('.toolkit-toolbar-search')!;
    const facet = screen.container.querySelector('.toolkit-toolbar-facet')!;
    expect(getComputedStyle(search).height).toBe('36px');
    expect(getComputedStyle(facet).height).toBe('36px');
  });

  // The segmented join's own buttons used to be pinned to 30px, orphaned below
  // the 36px header CTA. `btn-sm` now reads the same `--size-field` step as `input-sm`, so a
  // segmented option needs no forced height either.
  it('keeps a segmented filter option at the same 36px row height', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
          ],
          value: 'all',
          onChange: () => {},
        },
      ],
      count: 6,
      itemLabel: 'entries',
    });
    const option = screen.container.querySelector('[role="radio"]')!;
    expect(getComputedStyle(option).height).toBe('36px');
  });

  // Fix-round finding: `.toolkit-toolbar-segmented`'s `overflow-x: auto` also computes
  // `overflow-y` to `auto`, clipping the page-wide focus-visible ring at the scroll container's
  // own padding edge. Proven the way the finding itself named: the container's own padding on
  // every side must be at least as large as the focused segment's outline-width plus its
  // outline-offset, the exact reach the ring needs to stay inside the scrollport.
  it("pads the segmented join enough that a focused segment's own focus ring is not clipped", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        {
          id: 'publish-state',
          label: 'Publish state',
          display: 'segmented',
          options: [
            { value: 'all', label: 'All' },
            { value: 'published', label: 'Published' },
          ],
          value: 'all',
          onChange: () => {},
        },
      ],
      count: 6,
      itemLabel: 'entries',
    });
    const container = screen.container.querySelector('.toolkit-toolbar-segmented')!;
    const option = screen.getByRole('radio', { name: 'All' }).element() as HTMLElement;
    await userEvent.tab();
    option.focus();
    expect(option.matches(':focus-visible')).toBe(true);
    const outlineStyle = getComputedStyle(option);
    const ringReach = parseFloat(outlineStyle.outlineWidth) + parseFloat(outlineStyle.outlineOffset);
    const containerStyle = getComputedStyle(container);
    for (const side of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) {
      expect(parseFloat(containerStyle[side])).toBeGreaterThanOrEqual(ringReach);
    }
  });

  it('sets the search input and count line text to the ruled 13px (0.8125rem)', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      count: 149,
      itemLabel: 'signups',
    });
    const input = screen.container.querySelector('.toolkit-toolbar-search input')!;
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(getComputedStyle(input).fontSize).toBe('13px');
    expect(getComputedStyle(count).fontSize).toBe('13px');
  });

  it('gives the count line tabular-nums', async () => {
    const screen = await render(ListToolbar, { search: '', onSearch: () => {}, count: 149, itemLabel: 'signups' });
    const count = screen.container.querySelector('.toolkit-toolbar-count')!;
    expect(getComputedStyle(count).fontVariantNumeric).toBe('tabular-nums');
  });

  it("gives an applied 'menu' facet the ratified border/fill treatment, distinct from its rest state", async () => {
    const atRest = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const applied = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
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
  // option list away entirely below the trigger, invisible in jsdom (no layout) and
  // undetected by any markup-only assertion (the list was present in the DOM, just unpainted).
  // This test only fails against real layout, hence the compiled-CSS/real-browser describe block.
  it("does not clip an open 'menu' facet's option list under its own container", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const facet = screen.container.querySelector('.toolkit-toolbar-facet')!;
    expect(getComputedStyle(facet).overflow).not.toBe('hidden');
  });

  it("keeps every option of an open 'menu' facet actually paintable, not clipped away by its container", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' });
    await trigger.click();
    const pendingOption = screen.getByRole('menuitemradio', { name: 'Pending' }).element();
    // `elementFromPoint` answers null for a point outside the viewport, which would read as a
    // clip; bring the option on screen first so the assertion measures only the container's clip.
    pendingOption.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = pendingOption.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    // `elementFromPoint` only finds an element that is actually painted at that point; an
    // ancestor's `overflow: hidden` would clip the option away and this would resolve to
    // something else (or nothing) instead, the exact way the pre-fix bug was invisible to any
    // assertion that only checked the DOM, not what the browser actually paints.
    const paintedAt = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(paintedAt === pendingOption || pendingOption.contains(paintedAt)).toBe(true);
  });

  it("caps an applied 'menu' facet's in-control value at 14rem with an ellipsis", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ value: 'pending', display: 'menu' })],
      count: 12,
      itemLabel: 'signups',
    });
    const trigger = screen.container.querySelector('.toolkit-toolbar-facet-trigger')!;
    const value = screen.container.querySelector('.toolkit-toolbar-facet-value')!;
    expect(getComputedStyle(trigger).maxWidth).toBe('224px'); // 14rem at the default 16px root
    expect(getComputedStyle(value).textOverflow).toBe('ellipsis');
  });

  // Was 30px: `select-sm`'s own `--size-field`-derived height now agrees with
  // `input-sm`/`btn-sm`, so only the font-size still needs restyling to the ruled 13px.
  it("restyles the 'select' variant to the shared 36px row height and 13px text", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter()],
      count: 149,
      itemLabel: 'signups',
    });
    const select = screen.container.querySelector('.toolkit-toolbar-select')!;
    const style = getComputedStyle(select);
    expect(style.height).toBe('36px');
    expect(style.fontSize).toBe('13px');
  });

  // Measured root cause (the coherence-round finding): daisyUI's own `.select` sets
  // `width: clamp(3rem, 20rem, 100%)`, and `20rem` is a fixed length, not a container-relative
  // one, so every select pins to exactly 320px regardless of its own options. A facet with only
  // two short options must render far narrower than that fixed width once it sizes to its own
  // content instead.
  it("sizes a select facet to its own content, not daisyUI's fixed 20rem clamp", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        statusFilter({
          options: [
            { value: 'all', label: 'Any role' },
            { value: 'volunteer', label: 'Volunteer' },
          ],
        }),
      ],
      count: 149,
      itemLabel: 'signups',
    });
    const select = screen.container.querySelector('.toolkit-toolbar-select')!;
    expect(select.getBoundingClientRect().width).toBeLessThan(160);
  });

  it("never lets a select facet exceed its own container, however wide its content", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [
        statusFilter({
          options: [
            { value: 'all', label: 'Any class' },
            { value: 'long', label: 'A very long class title that would otherwise overflow its container' },
          ],
        }),
      ],
      count: 149,
      itemLabel: 'signups',
    });
    screen.container.style.width = '200px';
    screen.container.style.boxSizing = 'border-box';
    const select = screen.container.querySelector('.toolkit-toolbar-select')!;
    expect(select.getBoundingClientRect().width).toBeLessThanOrEqual(200);
  });

  // C2's family-harmony requirement: a select facet and a `'menu'` facet sitting side by side
  // must read as one visual family (the same 36px row height and 13px text already covered above,
  // plus the same border treatment), not two different control vocabularies.
  it("harmonizes a select facet's border with the 'menu' facet's own border treatment", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter(), statusFilter({ id: 'archived', label: 'Archived', display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const select = screen.container.querySelector('.toolkit-toolbar-select')!;
    const facet = screen.container.querySelector('.toolkit-toolbar-facet')!;
    expect(getComputedStyle(select).borderColor).toBe(getComputedStyle(facet).borderColor);
  });

  // C2 acceptance, proven against the five-facet screen's own facet shape rather than a
  // synthetic stand-in: at a 972px container, four select facets plus one menu facet plus search
  // all sit on one line at rest.
  it('fits four select facets, one menu facet, and search on one line at a 972px container (C2 acceptance)', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: facetScreenFilters(),
      count: 149,
      itemLabel: 'signups',
    });
    screen.container.style.width = '972px';
    screen.container.style.boxSizing = 'border-box';
    const controls = [
      screen.container.querySelector('.toolkit-toolbar-search')!,
      ...screen.container.querySelectorAll('.toolkit-toolbar-select'),
      screen.container.querySelector('.toolkit-toolbar-facet')!,
    ];
    expect(controls).toHaveLength(6);
    const tops = controls.map((el) => Math.round(el.getBoundingClientRect().top));
    expect(new Set(tops).size).toBe(1);
    const band = screen.container.querySelector('.toolkit-toolbar-band')!;
    expect(band.getBoundingClientRect().width).toBeLessThanOrEqual(972);
  });

  // C2 acceptance: nothing exceeds the container at a narrow content-column width.
  it('keeps every control within a 326px container, nothing exceeding the container width (C2 acceptance)', async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: facetScreenFilters(),
      count: 149,
      itemLabel: 'signups',
    });
    screen.container.style.width = '326px';
    screen.container.style.boxSizing = 'border-box';
    const containerRight = screen.container.getBoundingClientRect().right;
    const controls = screen.container.querySelectorAll<HTMLElement>(
      '.toolkit-toolbar-search, .toolkit-toolbar-select, .toolkit-toolbar-facet',
    );
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(containerRight + 0.5);
    }
  });

  // Regression guard for the coherence-round finding: daisyUI's own `.dropdown` shows
  // `.dropdown-content` on `:focus-within` for free, so tabbing onto a facet trigger used to open
  // the menu while `aria-expanded` stayed `false` (the component's own toggle state never
  // changed). The menu's visibility must track `aria-expanded` exactly, driven purely by the
  // `dropdown-open` class -- this only fails against real compiled CSS, hence living in this
  // describe block rather than the markup-only suite above.
  it("keeps a 'menu' facet's option list hidden on focus alone, so aria-expanded always matches what's visible", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ display: 'menu' })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'Status' }).element() as HTMLButtonElement;
    trigger.focus();
    await expect.poll(() => document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const menu = screen.container.querySelector('.toolkit-toolbar-facet-menu')!;
    expect(getComputedStyle(menu).display).toBe('none');
  });

  it("keeps the overflow disclosure hidden on focus alone, so aria-expanded always matches what's visible", async () => {
    const screen = await render(ListToolbar, {
      search: '',
      onSearch: () => {},
      filters: [statusFilter({ promoted: false })],
      count: 149,
      itemLabel: 'signups',
    });
    const trigger = screen.getByRole('button', { name: 'More filters' }).element() as HTMLButtonElement;
    trigger.focus();
    await expect.poll(() => document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const panel = screen.container.querySelector('.toolkit-toolbar-overflow')!;
    expect(getComputedStyle(panel).display).toBe('none');
  });
});
