import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConceptList from '../../lib/components/ConceptList.svelte';

function data(over = {}) {
  return {
    conceptId: 'posts',
    label: 'Posts',
    dated: true,
    entries: [
      { id: '2026-05-hello', title: 'Hello', date: '2026-05-01', draft: false },
      { id: '2026-04-draft', title: 'Draft Post', date: '2026-04-01', draft: true },
    ],
    error: null,
    formError: null,
    ...over,
  };
}

describe('ConceptList', () => {
  it('lists entries linking to their editor and flags drafts', async () => {
    const screen = render(ConceptList, { data: data() });
    await expect.element(screen.getByRole('link', { name: /Hello/ })).toHaveAttribute('href', '/admin/posts/2026-05-hello');
    await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument();
  });

  it('auto-derives the slug from the title until edited', async () => {
    const screen = render(ConceptList, { data: data({ entries: [] }) });
    const title = screen.getByLabelText(/title/i);
    await title.fill('My New Post');
    const slug = screen.getByLabelText(/slug/i);
    await expect.element(slug).toHaveValue('my-new-post');
  });

  it('shows an inline error when listing failed', async () => {
    const screen = render(ConceptList, { data: data({ error: 'Could not load this content type from GitHub.', entries: [] }) });
    await expect.element(screen.getByText(/could not load/i)).toBeInTheDocument();
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
