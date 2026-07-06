import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnHead from '../../lib/delivery/CairnHead.svelte';
import type { SeoMeta } from '../../lib/delivery/seo.js';

const seo: SeoMeta = {
  title: 'Welcome',
  meta: [
    { name: 'description', content: 'Hello world' },
    { property: 'og:title', content: 'Welcome' },
  ],
  links: [{ rel: 'canonical', href: 'https://x.test/p' }],
  jsonLd: { '@type': 'Article', headline: '</script><img>' },
};

describe('CairnHead', () => {
  it('renders the title, meta, link, and an escaped JSON-LD script in the head', async () => {
    render(CairnHead, { seo });
    expect(document.title).toBe('Welcome');
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Welcome');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://x.test/p');
    const ld = document.head.querySelector('script[type="application/ld+json"]');
    expect(ld).not.toBeNull();
    expect(ld!.textContent).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(ld!.textContent!.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&')))
      .toEqual(seo.jsonLd);
  });

  it('omits the title when title is false', async () => {
    document.title = 'site-owned';
    render(CairnHead, { seo, title: false });
    expect(document.title).toBe('site-owned');
  });

  it('applies titleTemplate to seo.title when title is left undefined', async () => {
    render(CairnHead, { seo, titleTemplate: (t) => `${t} · 907.life` });
    expect(document.title).toBe('Welcome · 907.life');
  });

  it('lets an explicit title win over titleTemplate', async () => {
    render(CairnHead, { seo, title: 'Custom', titleTemplate: (t) => `${t} · 907.life` });
    expect(document.title).toBe('Custom');
  });

  it('lets title={false} win over titleTemplate', async () => {
    document.title = 'site-owned';
    render(CairnHead, { seo, title: false, titleTemplate: (t) => `${t} · 907.life` });
    expect(document.title).toBe('site-owned');
  });
});
