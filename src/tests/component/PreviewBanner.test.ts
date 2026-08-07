import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PreviewBanner from '../../lib/components/PreviewBanner.svelte';
import type { PreviewData } from '../../lib/sveltekit/preview.js';

describe('PreviewBanner', () => {
  it('renders the draft state with a human-readable expiry', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = render(PreviewBanner, { preview });
    await expect.element(screen.getByText(/draft preview/i)).toBeInTheDocument();
    await expect.element(screen.getByText(/expires/i)).toBeInTheDocument();
    expect(screen.container.textContent).toMatch(/2026/);
  });

  it('renders the ended state with a link to the live permalink when published', async () => {
    const preview: PreviewData['preview'] = {
      state: 'published',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: { permalink: '/blog/my-post' },
    };
    const screen = render(PreviewBanner, { preview });
    await expect.element(screen.getByText(/this preview has ended/i)).toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: /view the published page/i }))
      .toHaveAttribute('href', '/blog/my-post');
  });

  it('renders the ended state with no link when the entry never went live (a discarded new entry)', async () => {
    const preview: PreviewData['preview'] = {
      state: 'published',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = render(PreviewBanner, { preview });
    await expect.element(screen.getByText(/this preview has ended/i)).toBeInTheDocument();
    expect(screen.container.querySelector('a')).toBeNull();
    // The claim is only that the preview ended, never that the draft went live.
    expect(screen.container.textContent ?? '').not.toMatch(/went live/i);
  });

  it('is presentational only: no buttons, forms, or inputs', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = render(PreviewBanner, { preview });
    expect(screen.container.querySelectorAll('button, form, input').length).toBe(0);
  });

  it('marks itself as a labelled landmark rather than a live region', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = render(PreviewBanner, { preview });
    await expect.element(screen.getByRole('complementary', { name: /preview/i })).toBeInTheDocument();
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
  });
});
