import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EditPage from '../../lib/components/EditPage.svelte';
import type { FrontmatterField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';

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
      renamed: false,
      error: null,
      slug: 'hello',
      linkTargets: [] as LinkTarget[],
      inboundLinks: [],
      pending: false,
      published: true,
      publishedFlash: false,
      discardedFlash: false,
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

  it('carries a CSRF field in every POST form', async () => {
    const screen = render(EditPage, postProps());
    const postForms = screen.container.querySelectorAll('form[method="POST"]');
    const csrfFields = screen.container.querySelectorAll('form[method="POST"] input[name="csrf"]');
    expect(postForms.length).toBeGreaterThan(0);
    expect(csrfFields.length).toBe(postForms.length);
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
    const banner = screen.container.querySelector('.alert-success');
    expect(banner?.textContent ?? '').toMatch(/saved/i);
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

  it('renders the change-url control', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByRole('button', { name: /change url/i })).toBeInTheDocument();
  });

  it('surfaces a rename collision error', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = { renameError: 'An entry with that slug already exists.' };
    const screen = render(EditPage, props);
    const banner = Array.from(screen.container.querySelectorAll('[role="alert"], .alert')).find((el) =>
      (el.textContent ?? '').includes('already exists'),
    );
    expect(banner).toBeTruthy();
  });

  it('announces a rename success naming the new slug through the polite live region', async () => {
    const screen = render(EditPage, postProps({ renamed: true, slug: 'new-slug' }));
    const region = screen.container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent ?? '').toMatch(/new-slug/);
  });

  it('shows a rename success banner', async () => {
    const screen = render(EditPage, postProps({ renamed: true, slug: 'new-slug' }));
    const banner = screen.container.querySelector('.alert-success');
    expect(banner?.textContent ?? '').toMatch(/new-slug/);
  });

  it('announces a saved message through a persistent live region', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    const region = screen.container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent ?? '').toMatch(/saved/i);
  });

  it('announces an error through a persistent assertive region', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = { renameError: 'An entry with that slug already exists.' };
    const screen = render(EditPage, props);
    const region = screen.container.querySelector('[aria-live="assertive"]');
    expect(region).not.toBeNull();
    expect(region!.textContent ?? '').toMatch(/already exists/i);
  });

  it('shows the broken-links banner and unwraps a link with the fix', async () => {
    const props = postProps();
    props.data.body = 'see [gone](cairn:pages/gone) here';
    // The action result the page receives after a blocked save.
    (props as Record<string, unknown>).form = { brokenLinks: ['cairn:pages/gone'], body: props.data.body };
    const screen = render(EditPage, props);
    const banner = screen.container.querySelector('.alert');
    expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
    await screen.getByRole('button', { name: /remove link/i }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('see gone here');
  });

  it('seeds the editor from the returned form body after a blocked save', async () => {
    const props = postProps({ body: 'old committed text' });
    (props as Record<string, unknown>).form = {
      brokenLinks: ['cairn:pages/gone'],
      body: 'edited [gone](cairn:pages/gone) text',
    };
    const screen = render(EditPage, props);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('edited [gone](cairn:pages/gone) text');
  });

  it('surfaces a refused delete naming the new linkers', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = {
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
    };
    const screen = render(EditPage, props);
    const banner = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('could not be deleted'),
    );
    expect(banner).toBeTruthy();
    expect(banner!.textContent ?? '').toContain('Post B');
    expect(banner!.textContent ?? '').not.toContain('dialog');
    expect(banner!.querySelector('a[href="/admin/posts/b"]')).toBeTruthy();
  });

  it('clears a fixed broken-link row after Remove link', async () => {
    const props = postProps();
    props.data.body = 'see [gone](cairn:pages/gone) here';
    (props as Record<string, unknown>).form = { brokenLinks: ['cairn:pages/gone'], body: props.data.body };
    const screen = render(EditPage, props);
    const banner = screen.container.querySelector('.alert');
    expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
    await screen.getByRole('button', { name: /remove link/i }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('see gone here');
    await expect
      .poll(() => screen.container.textContent ?? '')
      .not.toContain('cairn:pages/gone');
  });

  it('shows the pending banner when the live site lags the edits', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    const banner = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('Unpublished changes'),
    );
    expect(banner).toBeTruthy();
    expect(banner!.textContent ?? '').toContain('The live site still shows the last published version.');
  });

  it('shows the not-yet-published banner for a pending new entry', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: false }));
    const banner = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('Not yet published.'),
    );
    expect(banner).toBeTruthy();
  });

  it('hides the pending banner when nothing is pending', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.textContent ?? '').not.toContain('Unpublished changes');
    expect(screen.container.textContent ?? '').not.toContain('Not yet published');
  });

  it('offers a Publish button riding the edit form when edits are pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const publish = screen.container.querySelector('form[action="?/save"] button[formaction="?/publish"]');
    expect(publish).not.toBeNull();
    expect(publish!.classList.contains('btn-primary')).toBe(true);
  });

  it('hides the Publish and Discard controls when nothing is pending', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('button[formaction="?/publish"]')).toBeNull();
    await expect.element(screen.getByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();
  });

  it('confirms a discard by naming the live version it restores', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    await screen.getByRole('button', { name: 'Discard changes' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-discard-dialog-title"]') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent ?? '').toContain('restores the live version');
    const form = dialog.querySelector('form[action="?/discard"]');
    expect(form).not.toBeNull();
    expect(form!.querySelector('input[name="csrf"]')).not.toBeNull();
  });

  it('confirms a discard of a never-published entry by naming the delete', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: false }));
    await screen.getByRole('button', { name: 'Discard changes' }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-discard-dialog-title"]') as HTMLDialogElement;
    expect(dialog.textContent ?? '').toContain('never been published');
    expect(dialog.querySelector('form[action="?/discard"]')).not.toBeNull();
  });

  it('shows a published confirmation strip', async () => {
    const screen = render(EditPage, postProps({ publishedFlash: true }));
    const banner = screen.container.querySelector('.alert-success');
    expect(banner?.textContent ?? '').toMatch(/published/i);
  });

  it('shows a discarded confirmation strip', async () => {
    const screen = render(EditPage, postProps({ discardedFlash: true }));
    const banner = screen.container.querySelector('.alert-success');
    expect(banner?.textContent ?? '').toMatch(/discarded/i);
  });

  it('adds the pending-edits sentence to the delete confirm when edits are pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    await screen.getByRole('button', { name: /^delete$/i }).click();
    const dialog = screen.container.querySelector('dialog[aria-labelledby="cairn-delete-dialog-title"]') as HTMLDialogElement;
    expect(dialog.textContent ?? '').toContain('Unpublished edits to this entry are discarded too.');
  });

  it('flips only the Publish button to its working state and disables both on publish', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    // The edit form posts for real; cancel the default navigation (which would replace the test
    // page) while letting the component's own onsubmit handler still run and read the submitter.
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('submit', stop, true);
    try {
      await screen.getByRole('button', { name: 'Publish' }).click();
      const publish = () =>
        screen.container.querySelector<HTMLButtonElement>('button[formaction="?/publish"]')!;
      const save = () =>
        screen.container.querySelector<HTMLButtonElement>(
          'form[action="?/save"] button[type="submit"]:not([formaction])',
        )!;
      await expect.poll(() => publish().textContent ?? '').toContain('Publishing');
      expect(save().textContent ?? '').not.toContain('Saving');
      expect(publish().disabled).toBe(true);
      expect(save().disabled).toBe(true);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('flips only the Save button to its working state and disables both on save', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('submit', stop, true);
    try {
      await screen.getByRole('button', { name: 'Save' }).click();
      const publish = () =>
        screen.container.querySelector<HTMLButtonElement>('button[formaction="?/publish"]')!;
      const save = () =>
        screen.container.querySelector<HTMLButtonElement>(
          'form[action="?/save"] button[type="submit"]:not([formaction])',
        )!;
      await expect.poll(() => save().textContent ?? '').toContain('Saving');
      expect(publish().textContent ?? '').not.toContain('Publishing');
      expect(publish().disabled).toBe(true);
      expect(save().disabled).toBe(true);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('renders Publish as the outline variant beside the solid Save', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const publish = screen.container.querySelector('button[formaction="?/publish"]')!;
    expect(publish.classList.contains('btn-outline')).toBe(true);
    expect(publish.classList.contains('btn-primary')).toBe(true);
    const save = screen.container.querySelector(
      'form[action="?/save"] button[type="submit"]:not([formaction])',
    )!;
    expect(save.classList.contains('btn-outline')).toBe(false);
  });

  it('preview toggle button exposes aria-expanded reflecting preview state', async () => {
    const screen = render(EditPage, postProps());
    const btn = screen.getByRole('button', { name: /show preview/i });
    await expect.element(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    const btnAfter = screen.getByRole('button', { name: /hide preview/i });
    await expect.element(btnAfter).toHaveAttribute('aria-expanded', 'true');
  });

  it('hosts the toolbar inside the editor card with the editor surface', async () => {
    const screen = render(EditPage, postProps());
    const toolbar = screen.container.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    const card = toolbar!.closest('.rounded-box');
    expect(card).not.toBeNull();
    expect(card!.querySelector('input[name="body"]')).not.toBeNull();
  });

  it('offers a disabled Image placeholder in the toolbar', async () => {
    const screen = render(EditPage, postProps());
    const image = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Image (coming soon)"]');
    expect(image).not.toBeNull();
    expect(image!.disabled).toBe(true);
    expect(image!.closest('[role="toolbar"]')).not.toBeNull();
  });

  it('moves the link and component-insert triggers into the toolbar', async () => {
    const registry = defineRegistry({
      components: [
        {
          name: 'rule',
          label: 'Rule',
          description: 'A divider.',
          insertTemplate: ':::rule\n:::',
          build: (n: unknown) => n,
        } as unknown as ComponentDef,
      ],
    });
    const screen = render(EditPage, { ...postProps(), registry });
    const toolbar = screen.container.querySelector('[role="toolbar"]')!;
    const link = screen.container.querySelector('button[aria-label="Link to page"]');
    const insert = screen.container.querySelector('button[aria-label="Insert component"]');
    expect(link).not.toBeNull();
    expect(insert).not.toBeNull();
    expect(toolbar.contains(link)).toBe(true);
    expect(toolbar.contains(insert)).toBe(true);
    const header = screen.container.querySelector('header')!;
    expect(header.querySelector('button[aria-label="Link to page"]')).toBeNull();
    expect(header.querySelector('button[aria-label="Insert component"]')).toBeNull();
  });

  it('switching the toolbar tab to Preview shows the preview pane', async () => {
    const props = { ...postProps({ body: 'Tab body' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect
      .poll(() => screen.container.querySelector('section[aria-label="Preview"]')?.innerHTML ?? '')
      .toContain('Tab body');
    await expect.element(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('wraps bold through the registered format on Ctrl+B inside the editor card', async () => {
    // The keydown is dispatched on the editor card with an empty selection at the doc start, so the
    // registered bold transform inserts an empty `****` wrap there. Asserting that marker in the
    // hidden body input proves the whole seam (card keydown -> format state -> applyFormat ->
    // CodeMirror dispatch -> hidden-input mirror) without simulating a CodeMirror selection.
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true });
    card.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('****');
  });

  it('opens the link picker on Ctrl+K inside the editor card', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    card.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const dialog = screen.container.querySelector<HTMLDialogElement>('dialog[aria-labelledby="cairn-link-dialog-title"]')!;
    await expect.poll(() => dialog.open).toBe(true);
  });
});
