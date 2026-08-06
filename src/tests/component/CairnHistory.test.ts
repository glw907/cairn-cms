import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CairnHistory from '../../lib/components/CairnHistory.svelte';
import type { HistoryData, HistoryEntry } from '../../lib/sveltekit/types.js';

/** A distinct, full 40-character sha for row `n`, so a test can tell rows apart by ref. */
function sha(n: number): string {
  return String(n).padStart(40, '0');
}

function entry(n: number, over: Partial<HistoryEntry> = {}): HistoryEntry {
  return { ref: sha(n), editor: `Editor ${n}`, date: `2026-01-0${n}T12:00:00Z`, ...over };
}

function data(over: Partial<HistoryData> = {}): HistoryData {
  return { entries: [], draft: null, truncated: false, head: sha(9), ...over };
}

describe('CairnHistory', () => {
  it('renders each publish under the "Recent versions" heading', async () => {
    render(CairnHistory, { data: data({ entries: [entry(1), entry(2)] }) });
    await expect.element(page.getByRole('heading', { name: 'Recent versions' })).toBeInTheDocument();
    await expect.element(page.getByText('Editor 1')).toBeInTheDocument();
    await expect.element(page.getByText('Editor 2')).toBeInTheDocument();
  });

  it('pins the synthetic draft row on top when data.draft is non-null', async () => {
    const screen = render(CairnHistory, {
      data: data({
        entries: [entry(1)],
        draft: { editor: 'Drafting Editor', startedAt: '2026-02-01T00:00:00Z' },
      }),
    });
    await expect.element(page.getByText('Drafting Editor')).toBeInTheDocument();
    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Drafting Editor');
    expect(rows[1].textContent).toContain('Editor 1');
  });

  it('renders no revert form on the draft row', async () => {
    const screen = render(CairnHistory, {
      data: data({
        entries: [entry(1)],
        draft: { editor: 'Drafting Editor', startedAt: '2026-02-01T00:00:00Z' },
      }),
    });
    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows[0].querySelector('form[action="?/revert"]')).toBeNull();
    expect(rows[1].querySelector('form[action="?/revert"]')).not.toBeNull();
  });

  it('shows the "most recent 25" note only when truncated', async () => {
    const truncated = render(CairnHistory, { data: data({ entries: [entry(1)], truncated: true }) });
    await expect.element(page.getByText(/showing the most recent 25/i)).toBeInTheDocument();

    const untruncated = render(CairnHistory, { data: data({ entries: [entry(1)], truncated: false }) });
    expect(untruncated.container.textContent).not.toMatch(/showing the most recent 25/i);
    truncated.unmount();
    untruncated.unmount();
  });

  it('renders the design system empty state for a never-published entry', async () => {
    const screen = render(CairnHistory, { data: data({ entries: [], draft: null }) });
    await expect.element(page.getByText('No versions yet')).toBeInTheDocument();
    expect(screen.container.querySelector('table')).toBeNull();
  });

  it('still renders the draft row, not the empty state, for a never-published entry with an open draft', async () => {
    const screen = render(CairnHistory, {
      data: data({ entries: [], draft: { editor: 'Ed Editor', startedAt: '2026-02-01T00:00:00Z' } }),
    });
    await expect.element(page.getByText('Ed Editor')).toBeInTheDocument();
    expect(screen.container.textContent).not.toContain('No versions yet');
  });

  it('posts the row\'s full sha and the rendered-against head sha as hidden fields on the revert form', async () => {
    const screen = render(CairnHistory, { data: data({ entries: [entry(1), entry(2)], head: sha(9) }) });
    const forms = screen.container.querySelectorAll('form[action="?/revert"]');
    expect(forms).toHaveLength(2);

    const refValues = Array.from(forms).map(
      (f) => f.querySelector<HTMLInputElement>('input[name="ref"]')!.value,
    );
    expect(refValues).toEqual([sha(1), sha(2)]);

    for (const form of forms) {
      const refInput = form.querySelector<HTMLInputElement>('input[name="ref"]')!;
      expect(refInput.value).toHaveLength(40);
      const headInput = form.querySelector<HTMLInputElement>('input[name="head"]')!;
      expect(headInput.value).toBe(sha(9));
      expect(headInput.type).toBe('hidden');
      expect(refInput.type).toBe('hidden');
    }
  });

  it('marks the most recent entry Current, independent of any open draft', async () => {
    const screen = render(CairnHistory, {
      data: data({
        entries: [entry(1), entry(2)],
        draft: { editor: 'Drafting Editor', startedAt: '2026-02-01T00:00:00Z' },
      }),
    });
    const rows = screen.container.querySelectorAll('tbody tr');
    // Row 0 is the draft, row 1 is the current published version, row 2 is older.
    expect(rows[1].textContent).toContain('Current');
    expect(rows[2].textContent).not.toContain('Current');
  });
});
