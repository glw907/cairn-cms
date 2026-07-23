import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, type RenderResult } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';
import ExpandableRow from '../../lib/admin-toolkit/ExpandableRow.svelte';

/** A snippet with no render-time params, e.g. a header row or a fixed body. */
function staticSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}

// A single-cell root: `createRawSnippet` requires HTML for a single element per render (a caller's
// real Svelte template renders as many `<td>` siblings as it likes, since production markup
// compiles through Svelte's own template handling, not a raw-string snippet -- the same constraint
// AdminTable's own suite documents).
const summary = staticSnippet('<td>Alvarez</td>');
// Svelte's generated type for a generic component (`generics="T"`) resolves T to `unknown` when
// the component is referenced from a .ts test file rather than a .svelte template (the compiler
// infers T from bound props only inside a template); the datum shape is cast back at the one
// point this test needs it, mirroring how the component's own consumer narrows it.
const panel = createRawSnippet<[unknown]>((getDatum) => ({
  render: () => `<p>Panel for ${(getDatum() as { name: string }).name}</p>`,
}));

describe('ExpandableRow', () => {
  it('renders the collapsed state with aria-expanded=false and no panel row', () => {
    const screen = render(ExpandableRow, {
      expanded: false,
      onToggle: () => {},
      datum: { name: 'Alvarez' },
      colspan: 3,
      summary,
      panel,
      triggerLabel: 'Expand the Alvarez household',
    });
    const button = screen.container.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Expand the Alvarez household');
    expect(screen.container.textContent).not.toContain('Panel for Alvarez');
    expect(screen.container.textContent).toContain('▸');
  });

  it('renders the expanded state with aria-expanded=true and the panel row carrying the datum and colspan', () => {
    const screen = render(ExpandableRow, {
      expanded: true,
      onToggle: () => {},
      datum: { name: 'Alvarez' },
      colspan: 3,
      summary,
      panel,
      triggerLabel: 'Collapse the Alvarez household',
    });
    const button = screen.container.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const panelCell = screen.container.querySelector('.toolkit-expandable-row-panel td')!;
    expect(panelCell.getAttribute('colspan')).toBe('3');
    expect(screen.container.textContent).toContain('Panel for Alvarez');
    expect(screen.container.textContent).toContain('▾');
  });

  it('renders the summary cells inside the summary row regardless of expanded state', () => {
    const screen = render(ExpandableRow, {
      expanded: false,
      onToggle: () => {},
      datum: { name: 'Alvarez' },
      colspan: 3,
      summary,
      panel,
      triggerLabel: 'Expand the Alvarez household',
    });
    const summaryRow = screen.container.querySelector('.toolkit-expandable-row-summary')!;
    expect(summaryRow.querySelector('td')?.textContent).toBe('Alvarez');
  });

  it('uses a real button as the trigger control, so Enter/Space activation is native rather than reimplemented', () => {
    const screen = render(ExpandableRow, {
      expanded: false,
      onToggle: () => {},
      datum: { name: 'Alvarez' },
      colspan: 3,
      summary,
      panel,
      triggerLabel: 'Expand the Alvarez household',
    });
    const button = screen.container.querySelector('button')!;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});

// The three visual fixes assert against real computed style, which needs the compiled daisyUI
// tokens (--color-base-*, --cairn-card-border) actually defined -- Svelte's own scoped CSS mounts
// automatically, but a var() referencing a daisyUI theme token resolves to nothing without the
// packaged admin sheet loaded and a data-theme in effect (the same seam ListToolbar's and
// ConceptList's own compiled-CSS suites use).
describe('ExpandableRow visual fixes (compiled CSS)', () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = compiledAdminCss;
    document.head.appendChild(styleEl);
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    styleEl.remove();
  });

  const tables: HTMLTableElement[] = [];
  afterEach(() => {
    for (const table of tables.splice(0)) table.remove();
  });

  /** Mounts one or more rows directly into a real `<tbody>` (optionally zebra-striped), the
   *  ancestor context the sticky trigger cell's zebra-parity rule and the row-hover wash both key
   *  off of. Returns each row's own render result alongside the summary `<tr>` element itself. */
  function mountRows(count: number, { zebra = false }: { zebra?: boolean } = {}) {
    const table = document.createElement('table');
    table.className = zebra ? 'table table-zebra' : 'table';
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    document.body.appendChild(table);
    tables.push(table);

    const rows: { screen: RenderResult<typeof ExpandableRow>; tr: Element }[] = [];
    for (let i = 0; i < count; i++) {
      const screen = render(
        ExpandableRow,
        {
          props: {
            expanded: false,
            onToggle: () => {},
            datum: { name: `Row ${i}` },
            colspan: 3,
            summary,
            panel,
            triggerLabel: `Expand row ${i}`,
          },
          target: tbody,
        } as never,
      );
      const trs = tbody.querySelectorAll('.toolkit-expandable-row-summary');
      rows.push({ screen, tr: trs[trs.length - 1]! });
    }
    return { table, rows };
  }

  /** Resolves a CSS color/value against the current document (theme tokens included) through a
   *  throwaway probe element, so a resolved computed style can be compared directly against the
   *  same token a production rule references (`var(--color-base-200)`, etc.) rather than a
   *  hand-copied literal that could drift from the theme. */
  function resolve(cssValue: string): string {
    const probe = document.createElement('div');
    probe.style.setProperty('background-color', cssValue);
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return resolved;
  }

  it('defaults the sticky trigger cell to base-100 outside a zebra table', () => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    const { rows } = mountRows(1);
    const triggerCell = rows[0]!.tr.querySelector('.toolkit-expandable-row-trigger-cell')!;
    expect(getComputedStyle(triggerCell).backgroundColor).toBe(resolve('var(--color-base-100)'));
  });

  it('follows zebra parity on a striped table: the sticky trigger cell matches base-200 on the even row, base-100 on the odd row', () => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    const { rows } = mountRows(2, { zebra: true });
    const oddTrigger = rows[0]!.tr.querySelector('.toolkit-expandable-row-trigger-cell')!;
    const evenTrigger = rows[1]!.tr.querySelector('.toolkit-expandable-row-trigger-cell')!;
    expect(getComputedStyle(oddTrigger).backgroundColor).toBe(resolve('var(--color-base-100)'));
    expect(getComputedStyle(evenTrigger).backgroundColor).toBe(resolve('var(--color-base-200)'));
  });

  it('follows zebra parity in the dark theme too', () => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin-dark');
    const { rows } = mountRows(2, { zebra: true });
    const evenTrigger = rows[1]!.tr.querySelector('.toolkit-expandable-row-trigger-cell')!;
    expect(getComputedStyle(evenTrigger).backgroundColor).toBe(resolve('var(--color-base-200)'));
  });

  it('washes the whole summary row on hover with a base-content 5% tint, including the sticky trigger cell', async () => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    const { rows } = mountRows(1);
    const regularCell = rows[0]!.tr.querySelector('td:not(.toolkit-expandable-row-trigger-cell)')!;
    const triggerCell = rows[0]!.tr.querySelector('.toolkit-expandable-row-trigger-cell')!;
    const washed = resolve('color-mix(in oklab, var(--color-base-content) 5%, transparent)');

    expect(getComputedStyle(regularCell).backgroundColor).not.toBe(washed);
    expect(getComputedStyle(triggerCell).backgroundColor).not.toBe(washed);

    await userEvent.hover(rows[0]!.tr as HTMLElement);

    expect(getComputedStyle(regularCell).backgroundColor).toBe(washed);
    expect(getComputedStyle(triggerCell).backgroundColor).toBe(washed);
  });

  it('recesses the panel cell with a base-300 background and an inset top hairline, in both themes', () => {
    for (const theme of ['cairn-admin', 'cairn-admin-dark']) {
      document.documentElement.setAttribute('data-theme', theme);
      const screen = render(ExpandableRow, {
        expanded: true,
        onToggle: () => {},
        datum: { name: 'Alvarez' },
        colspan: 3,
        summary,
        panel,
        triggerLabel: 'Collapse the Alvarez household',
      });
      const panelCell = screen.container.querySelector('.toolkit-expandable-row-panel td')!;
      const style = getComputedStyle(panelCell);
      expect(style.backgroundColor).toBe(resolve('var(--color-base-300)'));
      // Not the zebra stripe's own color (base-200 was refuted: the drawer merged with a striped
      // row).
      expect(style.backgroundColor).not.toBe(resolve('var(--color-base-200)'));
      expect(style.boxShadow).toContain('inset');
      expect(style.boxShadow).toMatch(/0px 1px 0px/);
    }
  });
});
