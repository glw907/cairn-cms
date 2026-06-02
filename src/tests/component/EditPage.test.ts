import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import type { FrontmatterField } from '../../lib/content/types.js';
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
      linkTargets: [],
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

  it('preview toggle button exposes aria-expanded reflecting preview state', async () => {
    const screen = render(EditPage, postProps());
    const btn = screen.getByRole('button', { name: /show preview/i });
    await expect.element(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    const btnAfter = screen.getByRole('button', { name: /hide preview/i });
    await expect.element(btnAfter).toHaveAttribute('aria-expanded', 'true');
  });
});
