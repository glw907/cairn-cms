import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Pagination from '../../lib/admin-toolkit/Pagination.svelte';

describe('Pagination', () => {
  it('renders the range line when totalItems and pageSize are both given', () => {
    const screen = render(Pagination, {
      page: 1,
      pageCount: 8,
      onPageChange: () => {},
      totalItems: 149,
      pageSize: 20,
      itemLabel: 'households',
    });
    const text = screen.container.textContent ?? '';
    expect(text).toContain('Showing 1');
    expect(text).toContain('149');
    expect(text).toContain('households');
  });

  it('omits the range line when totalItems is not given', () => {
    const screen = render(Pagination, { page: 1, pageCount: 8, onPageChange: () => {} });
    expect(screen.container.textContent ?? '').not.toContain('Showing');
  });

  it('renders no page nav at all for a single page', () => {
    const screen = render(Pagination, { page: 1, pageCount: 1, onPageChange: () => {} });
    expect(screen.container.querySelector('.join')).toBeNull();
  });

  it('marks the current page with aria-current and disables Previous at the first page', () => {
    const screen = render(Pagination, { page: 1, pageCount: 5, onPageChange: () => {} });
    expect(screen.container.querySelector('[aria-current="page"]')).not.toBeNull();
    const prev = screen.container.querySelector('[aria-label="Previous page"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('disables Next at the last page', () => {
    const screen = render(Pagination, { page: 5, pageCount: 5, onPageChange: () => {} });
    const next = screen.container.querySelector('[aria-label="Next page"]') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('calls onPageChange with the target page when a page button is activated', async () => {
    const onPageChange = vi.fn();
    const screen = render(Pagination, { page: 1, pageCount: 5, onPageChange });
    await screen.getByRole('button', { name: 'Page 2' }).click();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('omits the page-size selector by default, an additive extension no existing consumer opts into', () => {
    const screen = render(Pagination, { page: 1, pageCount: 8, onPageChange: () => {} });
    expect(screen.container.querySelector('select')).toBeNull();
  });

  it('offers a page-size selector when pageSizeOptions and onPageSizeChange are given', async () => {
    const onPageSizeChange = vi.fn();
    const screen = render(Pagination, {
      page: 1,
      pageCount: 8,
      onPageChange: () => {},
      totalItems: 149,
      pageSize: 20,
      pageSizeOptions: [10, 20, 50],
      onPageSizeChange,
    });
    const select = screen.container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('20');
    select.value = '50';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
