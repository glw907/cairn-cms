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
    const screen = await render(PreviewBanner, { preview });
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
    const screen = await render(PreviewBanner, { preview });
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
    const screen = await render(PreviewBanner, { preview });
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
    const screen = await render(PreviewBanner, { preview });
    expect(screen.container.querySelectorAll('button, form, input').length).toBe(0);
  });

  it('marks itself as a labelled landmark rather than a live region', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = await render(PreviewBanner, { preview });
    await expect.element(screen.getByRole('complementary', { name: /preview/i })).toBeInTheDocument();
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
  });

  it('underlines the ended-page link, so it is never distinguished by colour alone', async () => {
    const preview: PreviewData['preview'] = {
      state: 'published',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: { permalink: '/blog/my-post' },
    };
    // Mirrors Tailwind Preflight's own reset (`a { text-decoration: inherit; }`), which strips
    // the UA-default underline a consuming site's own stylesheet would otherwise leave standing;
    // without this reset the UA default alone would pass this assertion regardless of whether
    // the component's own rule declares one.
    const preflight = document.createElement('style');
    preflight.textContent = 'a { text-decoration: inherit; }';
    document.head.appendChild(preflight);
    try {
      const screen = await render(PreviewBanner, { preview });
      const link = screen.getByRole('link', { name: /view the published page/i }).element() as HTMLElement;
      expect(getComputedStyle(link).textDecorationLine).toBe('underline');
    } finally {
      preflight.remove();
    }
  });

  it('lets a site override the default palette from :root, since the scoped element never declares the custom property itself', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    document.documentElement.style.setProperty('--cairn-preview-bg', 'rgb(10, 20, 30)');
    try {
      const screen = await render(PreviewBanner, { preview });
      const banner = screen.container.querySelector('.cairn-preview-banner') as HTMLElement;
      // A property Svelte's scoping class declared directly on this element would win over any
      // ancestor no matter its specificity (a directly declared value always beats an inherited
      // one); only reading the property through var() lets the site's :root override reach here.
      expect(getComputedStyle(banner).backgroundColor).toBe('rgb(10, 20, 30)');
    } finally {
      document.documentElement.style.removeProperty('--cairn-preview-bg');
    }
  });
});
