import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
// EditPage's lifecycle controls render into the topbar context portal, not a header of its own, so
// this harness mounts it joined to that band the same way EditPage.test.ts does.
import EditPage from './_EditPageDesk.svelte';
import type { NamedField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import type { AdvisoryNotice } from '../../lib/content/advisories.js';

function postProps(over = {}) {
  return {
    data: {
      conceptId: 'posts',
      id: '2026-05-hello',
      label: 'Posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ] satisfies NamedField[],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      mediaTargets: {},
      mediaLibrary: {},
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      publishActions: [],
      discardedFlash: false,
      preview: null,
      spellcheckDictionary: 'dictionary-en-us.txt',
      siteDictionary: [],
      tidy: { enabled: false, model: 'claude-sonnet-4-6', conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false } },
      advisories: [] as AdvisoryNotice[],
      orphanTags: [],
      siteName: 'Test Site',
      ...over,
    },
    registry: undefined,
  };
}

describe('EditPage advisory region', () => {
  it('renders a server address-collision advisory with a link action', async () => {
    const advisories: AdvisoryNotice[] = [
      {
        kind: 'address-collision',
        severity: 'warn',
        message:
          'Another page already uses the address /about. Publish this one and it replaces the other at that address.',
        actions: [{ label: 'Open About', href: '/admin/pages/about' }],
      },
    ];
    const screen = render(EditPage, postProps({ advisories }));
    await expect
      .element(screen.getByText('Another page already uses the address /about', { exact: false }))
      .toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open About' });
    await expect.element(link).toHaveAttribute('href', '/admin/pages/about');
  });

  it('renders the needs-alt notice through the same region', async () => {
    const hash = '0123456789abcdef';
    const screen = render(EditPage, postProps({ body: `![](media:cat.${hash})` }));
    const notice = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('alt text'),
    );
    expect(notice).toBeTruthy();
    expect(notice!.textContent ?? '').toContain('1 image needs alt text');
    await expect
      .element(screen.getByRole('button', { name: /add alt text/i }))
      .toBeInTheDocument();
  });
});
