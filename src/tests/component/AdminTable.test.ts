import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import AdminTable from '../../lib/admin-toolkit/AdminTable.svelte';

/** A snippet with no render-time params, e.g. a header row or a fixed body. */
function staticSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

describe('AdminTable', () => {
  it('defaults to the sm density with no zebra stripe', () => {
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>Alvarez</td></tr>'),
      rowCount: 1,
    });
    const table = screen.container.querySelector('table')!;
    expect(table.className).toContain('table-sm');
    expect(table.className).not.toContain('table-zebra');
  });

  it('switches to the xs density and turns on zebra on request', () => {
    const screen = render(AdminTable, {
      density: 'xs',
      zebra: true,
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>Alvarez</td></tr>'),
      rowCount: 1,
    });
    const table = screen.container.querySelector('table')!;
    expect(table.className).toContain('table-xs');
    expect(table.className).toContain('table-zebra');
  });

  it('renders the header snippet inside the thead and the body snippet inside the tbody', () => {
    // createRawSnippet requires a single-element root per render, so the header cell is one <th>
    // here; a caller's real Svelte template renders as many <th>/<td> siblings as it likes, since
    // production markup compiles through Svelte's own template handling, not a raw-string snippet.
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>Alvarez</td><td>Current</td></tr>'),
      rowCount: 1,
    });
    const thead = screen.container.querySelector('thead')!;
    const tbody = screen.container.querySelector('tbody')!;
    expect(thead.querySelector('th')?.textContent).toBe('Household');
    expect(tbody.textContent).toContain('Alvarez');
    expect(tbody.textContent).toContain('Current');
  });

  it('renders the empty-state snippet instead of the body when rowCount is 0', () => {
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>Alvarez</td></tr>'),
      rowCount: 0,
      empty: staticSnippet('<p>No households match.</p>'),
      emptyColspan: 4,
    });
    expect(screen.container.textContent).not.toContain('Alvarez');
    expect(screen.container.textContent).toContain('No households match.');
    const cell = screen.container.querySelector('td')!;
    expect(cell.getAttribute('colspan')).toBe('4');
  });

  it('defaults the empty-state colspan to 100 (HTML clamps it to the real column count)', () => {
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet(''),
      rowCount: 0,
      empty: staticSnippet('<p>Nothing yet.</p>'),
    });
    const cell = screen.container.querySelector('td')!;
    expect(cell.getAttribute('colspan')).toBe('100');
  });

  it('renders the wrapper with the horizontal-scroll fallback', () => {
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>Alvarez</td></tr>'),
      rowCount: 1,
    });
    expect(screen.container.querySelector('.toolkit-admin-table-wrap')).not.toBeNull();
  });

  it('enforces single-line cells: every cell computes white-space: nowrap', () => {
    const screen = render(AdminTable, {
      header: staticSnippet('<th>Household</th>'),
      children: staticSnippet('<tr><td>A very long value that would otherwise wrap</td></tr>'),
      rowCount: 1,
    });
    const cell = screen.container.querySelector('td')!;
    expect(getComputedStyle(cell).whiteSpace).toBe('nowrap');
  });
});
