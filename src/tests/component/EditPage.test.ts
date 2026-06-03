import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import type { FrontmatterField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry } from '../../lib/render/registry.js';

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
      ] satisfies FrontmatterField[],
      frontmatter: { title: 'Hello', date: '2026-05-01', draft: false },
      body: 'The body.',
      title: 'Hello',
      isNew: false,
      saved: false,
      error: null,
      linkTargets: [] as LinkTarget[],
      inboundLinks: [],
      siteName: 'Test Site',
      ...over,
    },
    registry: undefined,
  };
}

function pageProps() {
  const base = postProps();
  return {
    ...base,
    data: {
      ...base.data,
      conceptId: 'pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies FrontmatterField[],
      frontmatter: { title: 'About' },
    },
  };
}

describe('EditPage', () => {
  beforeEach(() => {
    // Clear the preview preference so each test starts with the pane closed.
    localStorage.removeItem('cairn-admin:preview');
  });

  it('renders the rich frontmatter fields for a post', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByLabelText(/title/i)).toHaveValue('Hello');
    await expect.element(screen.getByLabelText(/date/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/draft/i)).toBeInTheDocument();
  });

  it('renders only the minimal field for a page', async () => {
    const screen = render(EditPage, pageProps());
    await expect.element(screen.getByLabelText(/title/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/date/i)).not.toBeInTheDocument();
  });

  it('toggles the preview pane', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect.element(screen.getByRole('region', { name: /preview/i })).toBeInTheDocument();
  });

  it('shows a saved confirmation', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    await expect.element(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('renders preview HTML when the preview is shown', async () => {
    const props = { ...postProps({ body: 'Hello world' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('Hello world');
  });

  it('the floored render pipeline strips a dangerous payload in the preview', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({ body: 'safe text\n\n<img src=x onerror="alert(1)">' }),
      render: (md: string) => renderMarkdown(md),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('safe text');
    expect(screen.container.querySelector('section[aria-label="Preview"]')!.innerHTML).not.toContain('onerror');
  });

  it('resolves cairn links in the preview, marking a missing target broken', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({
        body: '[about](cairn:pages/about) and [gone](cairn:pages/gone)',
        linkTargets: [{ concept: 'pages', id: 'about', permalink: '/about', title: 'About', draft: false }],
      }),
      render: (md: string, opts?: { resolve?: (ref: { concept: string; id: string }) => string | undefined }) =>
        renderMarkdown(md, opts),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /show preview/i }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('href="/about"');
    expect(screen.container.querySelector('section[aria-label="Preview"]')!.innerHTML).toContain('cairn-broken-link');
  });

  it('inserts a cairn link from the Link to page picker', async () => {
    const props = postProps();
    props.data.linkTargets = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('button', { name: /About Us/ }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('[About Us](cairn:pages/about)');
  });

  it('renders the delete control', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('shows the broken-links banner and unwraps a link with the fix', async () => {
    const props = postProps();
    props.data.body = 'see [gone](cairn:pages/gone) here';
    // The action result the page receives after a blocked save.
    (props as Record<string, unknown>).form = { brokenLinks: ['cairn:pages/gone'], body: props.data.body };
    const screen = render(EditPage, props);
    const banner = screen.container.querySelector('[role="alert"]');
    expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
    await screen.getByRole('button', { name: /remove link/i }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('see gone here');
  });

  it('surfaces a refused delete naming the new linkers', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = {
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    };
    const screen = render(EditPage, props);
    const banner = Array.from(screen.container.querySelectorAll('[role="alert"]')).find((el) =>
      (el.textContent ?? '').includes('could not be deleted'),
    );
    expect(banner).toBeTruthy();
    expect(banner!.textContent ?? '').toContain('Post B');
    expect(banner!.querySelector('a[href="/admin/posts/b"]')).toBeTruthy();
  });

  it('clears a fixed broken-link row after Remove link', async () => {
    const props = postProps();
    props.data.body = 'see [gone](cairn:pages/gone) here';
    (props as Record<string, unknown>).form = { brokenLinks: ['cairn:pages/gone'], body: props.data.body };
    const screen = render(EditPage, props);
    const banner = screen.container.querySelector('[role="alert"]');
    expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
    await screen.getByRole('button', { name: /remove link/i }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('see gone here');
    await expect
      .poll(() => screen.container.textContent ?? '')
      .not.toContain('cairn:pages/gone');
  });

  it('preview toggle button exposes aria-expanded reflecting preview state', async () => {
    const screen = render(EditPage, postProps());
    const btn = screen.getByRole('button', { name: /show preview/i });
    await expect.element(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    const btnAfter = screen.getByRole('button', { name: /hide preview/i });
    await expect.element(btnAfter).toHaveAttribute('aria-expanded', 'true');
  });
});
