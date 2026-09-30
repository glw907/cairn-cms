import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PreviewBanner from '../../lib/public/PreviewBanner.svelte';
import bannerSource from '../../lib/public/PreviewBanner.svelte?raw';
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

  it('gives the ended-page link a solid focus outline, not the UA auto ring', async () => {
    const preview: PreviewData['preview'] = {
      state: 'published',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: { permalink: '/blog/my-post' },
    };
    const screen = await render(PreviewBanner, { preview });
    const link = screen.getByRole('link', { name: /view the published page/i }).element() as HTMLElement;
    link.focus();
    const style = getComputedStyle(link);
    expect(link.matches(':focus-visible')).toBe(true);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
    expect(style.outlineOffset).toBe('2px');
  });

  it('renders the expiry as a <time> element with a fixed UTC string, independent of the host timezone', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:34:00.000Z',
      published: null,
    };
    // A spy, not a locale swap: jsdom/Playwright cannot cheaply re-run a test under a second
    // timezone, but the default formatter (../../lib/public/PreviewBanner.svelte) reads only
    // the UTC getters (getUTCFullYear and friends), never Intl.DateTimeFormat. Asserting the
    // constructor is never called proves the rendered string cannot vary with the host's locale
    // or timezone, which is what "TZ independence" means for a fixed-offset formatter: there is
    // no locale-sensitive code path left to vary.
    const ctorSpy = vi.spyOn(globalThis.Intl, 'DateTimeFormat');
    try {
      const screen = await render(PreviewBanner, { preview });
      const time = screen.container.querySelector('time');
      expect(time).not.toBeNull();
      expect(time?.getAttribute('datetime')).toBe('2026-08-20T12:34:00.000Z');
      expect(time?.textContent).toBe('2026-08-20 12:34 UTC');
      expect(ctorSpy).not.toHaveBeenCalled();
    } finally {
      ctorSpy.mockRestore();
    }
  });

  it('lets a site pass its own formatExpiry to render the expiry in its own date vocabulary', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:34:00.000Z',
      published: null,
    };
    const formatExpiry = (iso: string) => `custom:${iso}`;
    const screen = await render(PreviewBanner, { preview, formatExpiry });
    const time = screen.container.querySelector('time');
    // The datetime attribute stays the raw, machine-readable ISO string regardless of the
    // display formatter, per the HTML <time> element's own contract.
    expect(time?.getAttribute('datetime')).toBe('2026-08-20T12:34:00.000Z');
    expect(time?.textContent).toBe('custom:2026-08-20T12:34:00.000Z');
  });

  it('falls back to 8px (the radius-box default) with no daisyUI and no site override', async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    const screen = await render(PreviewBanner, { preview });
    const banner = screen.container.querySelector('.cairn-preview-banner') as HTMLElement;
    expect(getComputedStyle(banner).borderTopLeftRadius).toBe('8px');
  });

  it("lets a site's --cairn-preview-radius win over the radius-box fallback, since the seam is public", async () => {
    const preview: PreviewData['preview'] = {
      state: 'draft',
      expiresAt: '2026-08-20T12:00:00.000Z',
      published: null,
    };
    document.documentElement.style.setProperty('--cairn-preview-radius', '2px');
    try {
      const screen = await render(PreviewBanner, { preview });
      const banner = screen.container.querySelector('.cairn-preview-banner') as HTMLElement;
      expect(getComputedStyle(banner).borderTopLeftRadius).toBe('2px');
    } finally {
      document.documentElement.style.removeProperty('--cairn-preview-radius');
    }
  });

  // Each row sets one of the five override properties on :root and reads the computed style the
  // property drives. `state` picks the banner state that renders the element the property styles.
  const overrides: {
    property: string;
    value: string;
    state: 'draft' | 'published';
    selector: string;
    read: keyof CSSStyleDeclaration;
    expected: string;
  }[] = [
    { property: '--cairn-preview-bg', value: 'rgb(10, 20, 30)', state: 'draft', selector: '.cairn-preview-banner', read: 'backgroundColor', expected: 'rgb(10, 20, 30)' },
    { property: '--cairn-preview-bg', value: 'rgb(10, 20, 30)', state: 'published', selector: '.cairn-preview-banner', read: 'backgroundColor', expected: 'rgb(10, 20, 30)' },
    { property: '--cairn-preview-fg', value: 'rgb(1, 2, 3)', state: 'draft', selector: '.cairn-preview-banner', read: 'color', expected: 'rgb(1, 2, 3)' },
    { property: '--cairn-preview-border', value: 'rgb(4, 5, 6)', state: 'draft', selector: '.cairn-preview-banner', read: 'borderTopColor', expected: 'rgb(4, 5, 6)' },
    { property: '--cairn-preview-border', value: 'rgb(4, 5, 6)', state: 'published', selector: '.cairn-preview-banner', read: 'borderTopColor', expected: 'rgb(4, 5, 6)' },
    { property: '--cairn-preview-link', value: 'rgb(7, 8, 9)', state: 'published', selector: 'a', read: 'color', expected: 'rgb(7, 8, 9)' },
    { property: '--cairn-preview-radius', value: '2px', state: 'draft', selector: '.cairn-preview-banner', read: 'borderTopLeftRadius', expected: '2px' },
  ];

  it.each(overrides)(
    "lets a site's $property win in the $state state, since the scoped element never declares it",
    async ({ property, value, state, selector, read, expected }) => {
      const preview: PreviewData['preview'] =
        state === 'draft'
          ? { state, expiresAt: '2026-08-20T12:00:00.000Z', published: null }
          : { state, expiresAt: '2026-08-20T12:00:00.000Z', published: { permalink: '/blog/my-post' } };
      document.documentElement.style.setProperty(property, value);
      try {
        const screen = await render(PreviewBanner, { preview });
        const el = screen.container.querySelector(selector) as HTMLElement;
        // A property Svelte's scoping class declared directly on this element would win over any
        // ancestor no matter its specificity (a directly declared value always beats an inherited
        // one); only reading the property through var() lets the site's :root override reach here.
        expect(getComputedStyle(el)[read]).toBe(expected);
      } finally {
        document.documentElement.style.removeProperty(property);
      }
    },
  );

  it('holds no color literal anywhere in its source, var() fallbacks included', () => {
    const literals = bannerSource.match(
      /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g,
    );
    expect(literals).toBeNull();
  });
});
