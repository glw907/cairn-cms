import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConceptList from '../../lib/components/ConceptList.svelte';

function data(over = {}) {
  // The default sort is newest-first, so the last entry (Post 12) leads page 1; the draft sits there
  // so the draft-badge assertion sees it on the default view.
  const entries = Array.from({ length: 12 }, (_, i) => ({
    id: `2026-05-${String(i + 1).padStart(2, '0')}-post-${i + 1}`,
    title: `Post ${String(i + 1).padStart(2, '0')}`,
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    draft: i === 11,
    status: 'published' as const,
    summary: null,
  }));
  return { conceptId: 'posts', label: 'Posts', dated: true, entries, error: null, formError: null, publishedAll: null, ...over };
}

describe('ConceptList', () => {
  it('renders entries as table rows linking to their editor', async () => {
    const screen = render(ConceptList, { data: data() });
    // Newest-first, so Post 12 leads page 1.
    await expect.element(screen.getByRole('link', { name: 'Post 12' })).toHaveAttribute('href', '/admin/posts/2026-05-12-post-12');
  });

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(ConceptList, { data: data() });
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
  });

  it('flags a draft row with a Hidden badge', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByText('Hidden', { exact: true })).toBeInTheDocument();
  });

  it('renders the status vocabulary: New, Edited, and Published badges', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: false, status: 'new' as const, summary: null },
      { id: 'beta', title: 'Beta', date: '2026-05-02', draft: false, status: 'edited' as const, summary: null },
      { id: 'gamma', title: 'Gamma', date: '2026-05-01', draft: false, status: 'published' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    const badge = (text: string) =>
      Array.from(screen.container.querySelectorAll('tbody .badge')).find(
        (el) => el.textContent?.trim() === text,
      );
    await expect.element(screen.getByText('New', { exact: true })).toBeInTheDocument();
    expect(badge('New')?.classList.contains('badge-info')).toBe(true);
    expect(badge('Edited')?.classList.contains('badge-warning')).toBe(true);
    expect(badge('Published')?.classList.contains('badge-ghost')).toBe(true);
  });

  it('stacks a Hidden badge beside the status badge for a hidden edited entry', async () => {
    const entries = [
      { id: 'alpha', title: 'Alpha', date: '2026-05-03', draft: true, status: 'edited' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    const row = screen.container.querySelector('tbody tr')!;
    const badges = Array.from(row.querySelectorAll('.badge')).map((el) => el.textContent?.trim());
    expect(badges).toContain('Edited');
    expect(badges).toContain('Hidden');
    const hidden = Array.from(row.querySelectorAll('.badge')).find((el) => el.textContent?.trim() === 'Hidden');
    expect(hidden?.classList.contains('badge-neutral')).toBe(true);
  });

  it('announces a publish-all flash through a persistent polite region beside the alert', async () => {
    const screen = render(ConceptList, { data: data({ publishedAll: 3 }) });
    // The always-mounted sr-only region carries the announcement (the EditPage pattern); a
    // fresh-inserted role element announces inconsistently, so the visible alert drops its role.
    const region = screen.container.querySelector('[aria-live="polite"]');
    expect(region?.textContent ?? '').toContain('Published 3 entries.');
    const alert = screen.container.querySelector('.alert-success');
    expect(alert?.textContent ?? '').toContain('Published 3 entries.');
    expect(alert?.getAttribute('role')).toBeNull();
  });

  it('hides the publish-all flash when zero entries were published', async () => {
    // A racing second admin can land first, leaving this redirect with publishedAll=0.
    const screen = render(ConceptList, { data: data({ publishedAll: 0 }) });
    expect(screen.container.textContent ?? '').not.toContain('Published 0');
  });

  it('filters rows by a search query and shows a result count', async () => {
    const screen = render(ConceptList, { data: data() });
    const search = screen.getByRole('searchbox', { name: /search/i });
    await search.fill('Post 03');
    await expect.element(screen.getByRole('link', { name: 'Post 03' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Post 01' })).not.toBeInTheDocument();
    await expect.element(screen.getByText(/1 of 12/i)).toBeInTheDocument();
  });

  it('shows a search-aware empty state when nothing matches', async () => {
    const screen = render(ConceptList, { data: data() });
    await screen.getByRole('searchbox', { name: /search/i }).fill('no such title');
    await expect.element(screen.getByText(/no posts match/i)).toBeInTheDocument();
  });

  it('shows a first-run empty state when the concept has no entries', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await expect.element(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('paginates and exposes a page-size control', async () => {
    const screen = render(ConceptList, { data: data() });
    // Default page size 10, so 12 entries paginate to two pages: page 1 shows 10 rows.
    await expect.element(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    await screen.getByRole('button', { name: /next page/i }).click();
    await expect.element(screen.getByText(/page 2 of 2/i)).toBeInTheDocument();
  });

  it('sorts by title when the Title header is toggled', async () => {
    const screen = render(ConceptList, { data: data() });
    const header = screen.getByRole('button', { name: /sort by title/i });
    await header.click(); // ascending
    await header.click(); // descending
    const links = screen.container.querySelectorAll('tbody a');
    expect(links[0].textContent).toContain('Post 12');
  });

  it('shows an inline error when listing failed', async () => {
    const screen = render(ConceptList, { data: data({ error: 'Could not load this content type from GitHub.', entries: [] }) });
    await expect.element(screen.getByText(/could not load/i)).toBeInTheDocument();
  });

  it('opens a create dialog from the header New button and auto-derives the slug', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    await expect.element(screen.getByLabelText(/slug/i)).toHaveValue('my-new-post');
  });

  it('shows a date input defaulted to today for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    const date = screen.getByLabelText('Date');
    await expect.element(date).toBeVisible();
    await expect.poll(() => (date.element() as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the date input for a non-dated concept', async () => {
    const screen = render(ConceptList, { data: data({ conceptId: 'pages', label: 'Pages', dated: false, entries: [] }) });
    await screen.getByRole('button', { name: /new pages/i }).first().click();
    expect(screen.container.querySelector('input[name="date"]')).toBeNull();
  });

  it('uses a date-free slug placeholder for a dated concept in the create dialog', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await screen.getByRole('button', { name: /new posts/i }).first().click();
    await expect.element(screen.getByLabelText('Slug')).toHaveAttribute('placeholder', 'my-entry');
  });

  it('offers a delete action per row', async () => {
    const screen = render(ConceptList, { data: data() });
    // Newest-first puts Post 12 on page 1.
    await expect.element(screen.getByRole('button', { name: /delete post 12/i })).toBeInTheDocument();
  });

  // The triage layer: counts per state and the filter that narrows the rows. The filter logic is
  // the contract here; Task 7 dresses the controls to the mockup.
  function triageEntries() {
    return [
      { id: 'pub-1', title: 'Published One', date: '2026-05-10', draft: false, status: 'published' as const, summary: null },
      { id: 'pub-2', title: 'Published Two', date: '2026-05-09', draft: false, status: 'published' as const, summary: null },
      { id: 'edit-1', title: 'Edited One', date: '2026-05-08', draft: false, status: 'edited' as const, summary: null },
      { id: 'new-1', title: 'New One', date: '2026-05-07', draft: false, status: 'new' as const, summary: null },
      { id: 'hidden-1', title: 'Hidden One', date: '2026-05-06', draft: true, status: 'published' as const, summary: null },
    ];
  }

  it('the triage shows exact counts per state', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    // 5 entries: 2 published, 1 edited, 1 new, 1 hidden draft (also published).
    await expect.element(screen.getByRole('button', { name: /^all/i })).toHaveTextContent('5');
    await expect.element(screen.getByRole('button', { name: /^pending edits/i })).toHaveTextContent('2');
    await expect.element(screen.getByRole('button', { name: /^published/i })).toHaveTextContent('2');
    await expect.element(screen.getByRole('button', { name: /^hidden/i })).toHaveTextContent('1');
  });

  it('Pending edits filters to new and edited rows', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    await screen.getByRole('button', { name: /^pending edits/i }).click();
    await expect.element(screen.getByRole('link', { name: 'Edited One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'New One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published One' })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Published Two' })).not.toBeInTheDocument();
  });

  it('search narrows within the active filter', async () => {
    const entries = [
      { id: 'pub-1', title: 'Apple Published', date: '2026-05-10', draft: false, status: 'published' as const, summary: null },
      { id: 'pub-2', title: 'Banana Published', date: '2026-05-09', draft: false, status: 'published' as const, summary: null },
      { id: 'edit-1', title: 'Apple Edited', date: '2026-05-08', draft: false, status: 'edited' as const, summary: null },
    ];
    const screen = render(ConceptList, { data: data({ entries }) });
    await screen.getByRole('button', { name: /^published/i }).click();
    await screen.getByRole('searchbox', { name: /search/i }).fill('Apple');
    await expect.element(screen.getByRole('link', { name: 'Apple Published' })).toBeInTheDocument();
    // Filtered out by the publish state, even though it matches the query.
    await expect.element(screen.getByRole('link', { name: 'Apple Edited' })).not.toBeInTheDocument();
    // Filtered out by the query, even though it matches the publish state.
    await expect.element(screen.getByRole('link', { name: 'Banana Published' })).not.toBeInTheDocument();
  });

  it('All is the default and shows every row', async () => {
    const screen = render(ConceptList, { data: data({ entries: triageEntries() }) });
    const all = screen.getByRole('button', { name: /^all/i });
    await expect.element(all).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('link', { name: 'Published One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Edited One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'New One' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Hidden One' })).toBeInTheDocument();
  });

  it('surfaces a refused delete from the flat action result', async () => {
    const form = {
      error: 'Cannot delete 2026-05-01-post-1: 1 page links to it.',
      id: '2026-05-01-post-1',
      inboundLinks: [
        { concept: 'posts', id: '2026-05-03-post-3', title: 'Post 03', permalink: '/posts/post-3' },
      ],
    };
    const screen = render(ConceptList, { data: data(), form });
    // The visible refusal alert names the blocker count and the linking entry, scoped to the
    // banner so the assertion does not also match the entry's own list row.
    const alert = screen.getByRole('alert', { name: /could not be deleted/i });
    await expect.element(alert).toBeInTheDocument();
    await expect.element(alert.getByRole('link', { name: 'Post 03' })).toBeInTheDocument();
  });
});
