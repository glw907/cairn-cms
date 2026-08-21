import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CairnHistory from '../../lib/components/CairnHistory.svelte';
import type { HistoryData, HistoryEntry, RevertFailure } from '../../lib/sveltekit/types.js';

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
    await render(CairnHistory, { data: data({ entries: [entry(1), entry(2)] }) });
    await expect.element(page.getByRole('heading', { name: 'Recent versions' })).toBeInTheDocument();
    await expect.element(page.getByText('Editor 1')).toBeInTheDocument();
    await expect.element(page.getByText('Editor 2')).toBeInTheDocument();
  });

  it('pins the synthetic draft row on top when data.draft is non-null', async () => {
    const screen = await render(CairnHistory, {
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
    const screen = await render(CairnHistory, {
      data: data({
        entries: [entry(1)],
        draft: { editor: 'Drafting Editor', startedAt: '2026-02-01T00:00:00Z' },
      }),
    });
    const rows = screen.container.querySelectorAll('tbody tr');
    expect(rows[0].querySelector('form[action="?/revert"]')).toBeNull();
    expect(rows[1].querySelector('form[action="?/revert"]')).not.toBeNull();
  });

  it('shows the truncation note only when truncated, sized to the actual entry count rather than a hardcoded 25', async () => {
    // truncated is only ever true when entries is exactly the HISTORY_LIMIT bound (25); the note
    // derives its number from data.entries.length so it can never drift from that bound.
    const many = Array.from({ length: 25 }, (_, i) => entry(i + 1, { date: '2026-01-01T12:00:00Z' }));
    const truncated = await render(CairnHistory, { data: data({ entries: many, truncated: true }) });
    await expect.element(page.getByText('Showing the most recent 25 versions.')).toBeInTheDocument();

    const untruncated = await render(CairnHistory, { data: data({ entries: [entry(1)], truncated: false }) });
    expect(untruncated.container.textContent).not.toMatch(/showing the most recent/i);
    await truncated.unmount();
    await untruncated.unmount();
  });

  it('renders the design system empty state when the commit read comes back empty for an entry that exists', async () => {
    // historyLoad 404s outright when the entry has neither a main file nor a branch, so this
    // empty-array-and-no-draft state renders only for an entry that DOES exist but whose commit
    // read came back empty (a degraded GitHub read, or a dev-backend seed).
    const screen = await render(CairnHistory, { data: data({ entries: [], draft: null }) });
    await expect.element(page.getByText('No versions found')).toBeInTheDocument();
    await expect.element(page.getByText('No published versions were found for this entry.')).toBeInTheDocument();
    expect(screen.container.querySelector('table')).toBeNull();
  });

  it('still renders the draft row, not the empty state, for a never-published entry with an open draft', async () => {
    const screen = await render(CairnHistory, {
      data: data({ entries: [], draft: { editor: 'Ed Editor', startedAt: '2026-02-01T00:00:00Z' } }),
    });
    await expect.element(page.getByText('Ed Editor')).toBeInTheDocument();
    expect(screen.container.textContent).not.toContain('No versions yet');
  });

  it('posts the row\'s full sha and the rendered-against head sha as hidden fields on the revert form', async () => {
    const screen = await render(CairnHistory, { data: data({ entries: [entry(1), entry(2)], head: sha(9) }) });
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
    const screen = await render(CairnHistory, {
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

  it('gives every Revert button a distinct accessible name naming its own row', async () => {
    const screen = await render(CairnHistory, {
      data: data({
        entries: [
          entry(1, { editor: 'Editor One', date: '2026-01-01T12:00:00Z' }),
          entry(2, { editor: 'Editor Two', date: '2026-01-02T12:00:00Z' }),
        ],
      }),
    });
    const buttons = Array.from(screen.container.querySelectorAll('button[type="submit"]')).filter(
      (b) => b.textContent?.trim() === 'Revert',
    );
    expect(buttons).toHaveLength(2);
    const names = buttons.map((b) => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(2);
    expect(names[0]).toContain('Editor One');
    expect(names[1]).toContain('Editor Two');
    for (const name of names) expect(name).toMatch(/^Revert to the version from/);
  });

  it('stacks the date under the editor name below sm, keeping the separate Date column at sm and up', async () => {
    const screen = await render(CairnHistory, {
      data: data({
        entries: [entry(1, { editor: 'Editor One', date: '2026-01-01T12:00:00Z' })],
        draft: { editor: 'Drafting Editor', startedAt: '2026-02-01T00:00:00Z' },
      }),
    });
    const rows = screen.container.querySelectorAll('tbody tr');
    for (const row of rows) {
      const editorCell = row.querySelector('td:nth-child(2)')!;
      const stacked = editorCell.querySelector('span.sm\\:hidden');
      expect(stacked).not.toBeNull();
      expect(stacked?.classList.contains('block')).toBe(true);
      const dateColumn = row.querySelector('td:nth-child(3)')!;
      expect(dateColumn.classList.contains('sm:table-cell')).toBe(true);
      expect(dateColumn.classList.contains('hidden')).toBe(true);
    }
  });

  describe('a refused revert renders in place', () => {
    it('names the blocking draft\'s author and last-save date for draft_exists', async () => {
      const form: RevertFailure = {
        reason: 'draft_exists',
        draftEditor: 'Blocking Editor',
        draftStartedAt: '2026-02-01T12:00:00Z',
      };
      const screen = await render(CairnHistory, { data: data({ entries: [entry(1)] }), form });
      const banner = screen.container.querySelector('.alert-error');
      expect(banner?.textContent ?? '').toContain('Blocking Editor');
      expect(banner?.textContent ?? '').toMatch(/publish or discard/i);
      expect(banner?.textContent ?? '').toMatch(/last saved/i);
    });

    it('says the history changed for history_stale', async () => {
      const form: RevertFailure = { reason: 'history_stale' };
      const screen = await render(CairnHistory, { data: data({ entries: [entry(1)] }), form });
      const banner = screen.container.querySelector('.alert-error');
      expect(banner?.textContent ?? '').toMatch(/history changed/i);
    });

    it('says the version is no longer listed for ref_unknown', async () => {
      const form: RevertFailure = { reason: 'ref_unknown' };
      const screen = await render(CairnHistory, { data: data({ entries: [entry(1)] }), form });
      const banner = screen.container.querySelector('.alert-error');
      expect(banner?.textContent ?? '').toMatch(/no longer in the recent list/i);
    });

    it('renders the bare message for viewAction\'s generic catch-all', async () => {
      const screen = await render(CairnHistory, {
        data: data({ entries: [entry(1)] }),
        form: { error: 'Something went wrong. Try again.' },
      });
      const banner = screen.container.querySelector('.alert-error');
      expect(banner?.textContent ?? '').toContain('Something went wrong. Try again.');
    });
  });
});
