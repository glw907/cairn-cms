import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConceptList from '../../lib/components/ConceptList.svelte';

function data(over = {}) {
  const entries = Array.from({ length: 12 }, (_, i) => ({
    id: `2026-05-${String(i + 1).padStart(2, '0')}-post-${i + 1}`,
    title: `Post ${String(i + 1).padStart(2, '0')}`,
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    draft: i === 1,
  }));
  return { conceptId: 'posts', label: 'Posts', dated: true, entries, error: null, formError: null, ...over };
}

describe('ConceptList', () => {
  it('renders entries as table rows linking to their editor', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByRole('link', { name: 'Post 01' })).toHaveAttribute('href', '/admin/posts/2026-05-01-post-1');
  });

  it('flags a draft row with a status badge', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument();
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
    await expect.element(screen.getByText(/no entries match/i)).toBeInTheDocument();
  });

  it('shows a first-run empty state when the concept has no entries', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    await expect.element(screen.getByText(/no entries yet/i)).toBeInTheDocument();
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

  it('auto-derives the slug from the title until edited', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    const slug = screen.getByLabelText(/slug/i);
    await expect.element(slug).toHaveValue('my-new-post');
  });

  it('shows a date input defaulted to today for a dated concept', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    const date = screen.getByLabelText('Date');
    await expect.element(date).toBeVisible();
    // The default lands after mount, so poll the value rather than reading it synchronously.
    await expect.poll(() => (date.element() as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('omits the date input for a non-dated concept', () => {
    const screen = render(ConceptList, {
      data: data({ conceptId: 'pages', label: 'Pages', dated: false, entries: [] }),
    });
    expect(screen.container.querySelector('input[name="date"]')).toBeNull();
  });

  it('uses a date-free slug placeholder for a dated concept', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    const slug = screen.getByLabelText('Slug');
    await expect.element(slug).toHaveAttribute('placeholder', 'my-entry');
  });
});
