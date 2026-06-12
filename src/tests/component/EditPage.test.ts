import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { BeforeNavigate } from '@sveltejs/kit';
import EditPage from '../../lib/components/EditPage.svelte';
import type { FrontmatterField } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineRegistry, type ComponentDef } from '../../lib/render/registry.js';
// The same module instance EditPage receives for $app/navigation via the project alias.
import { beforeNavigateCallbacks } from './app-navigation.js';
// The same module instance EditPage receives for $app/state via the project alias.
import { page as appPage } from './app-state.js';

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
      preview: null,
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

/** The preview iframe's document, the surface the rendered html and site styles land on. */
function previewSrcdoc(screen: { container: HTMLElement }) {
  return screen.container.querySelector('iframe[title="Page preview"]')?.getAttribute('srcdoc') ?? '';
}

describe('EditPage', () => {
  // The device choice persists per browser; clear it so each test starts from the Desktop default.
  beforeEach(() => localStorage.removeItem('cairn-editor-preview-device'));

  it('renders the rich frontmatter fields for a post', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByLabelText(/title/i)).toHaveValue('Hello');
    await expect.element(screen.getByLabelText(/date/i)).toBeInTheDocument();
    // The draft boolean renders as the Visibility group's Hidden toggle.
    await expect.element(screen.getByLabelText(/hidden/i)).toBeInTheDocument();
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

  it('shows the preview pane inside the editor card when the Preview tab is selected', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('#cairn-pane-preview')).toBeNull();
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const pane = screen.container.querySelector('#cairn-pane-preview');
    expect(pane).not.toBeNull();
    // The pane sits inside the editor card frame, below the toolbar, not in a stacked card.
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    expect(card.contains(pane)).toBe(true);
  });

  it('keeps the editor mounted but hidden in preview and restores it intact on Write', async () => {
    const screen = render(EditPage, postProps({ body: 'Round trip body' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const surface = screen.container.querySelector('#cairn-pane-write')!;
    expect(surface.classList.contains('hidden')).toBe(true);
    // Hidden, not unmounted: CodeMirror stays in the DOM so caret and undo history survive.
    expect(surface.querySelector('.cm-content')).not.toBeNull();
    await screen.getByRole('tab', { name: 'Write' }).click();
    expect(surface.classList.contains('hidden')).toBe(false);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('Round trip body');
  });

  it('never touches the legacy preview preference key', async () => {
    localStorage.removeItem('cairn-admin:preview');
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await screen.getByRole('tab', { name: 'Write' }).click();
    expect(localStorage.getItem('cairn-admin:preview')).toBeNull();
  });

  it('shows a saved confirmation', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    const banner = screen.container.querySelector('.alert-success');
    expect(banner?.textContent ?? '').toMatch(/saved/i);
  });

  it('derives the draft-link warning from the page URL drafts flag', async () => {
    const originalUrl = appPage.url;
    appPage.url = new URL('http://localhost/admin/posts/2026-05-hello?drafts=pages/about');
    try {
      const screen = render(EditPage, postProps({ saved: true }));
      const warning = screen.container.querySelector('.alert-warning');
      expect(warning?.textContent ?? '').toContain('pages/about');
      // The saved flash yields to the draft warning, so one strip shows.
      expect(screen.container.querySelector('.alert-success')).toBeNull();
    } finally {
      appPage.url = originalUrl;
    }
  });

  it('shows no draft-link warning without the drafts flag', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    expect(screen.container.querySelector('.alert-warning')).toBeNull();
    expect(screen.container.querySelector('.alert-success')).not.toBeNull();
  });

  it('renders the preview into a sandboxed iframe inside the pane', async () => {
    const props = { ...postProps({ body: 'Hello world' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('<p>Hello world</p>');
    const frame = screen.container.querySelector('iframe[title="Page preview"]')!;
    // The empty sandbox: no scripts, and a link click becomes a popup (the frame document's base
    // target) the sandbox blocks, so proofing a link never navigates the admin or the frame.
    expect(frame.getAttribute('sandbox')).toBe('');
    // The scrollable preview document stays keyboard-reachable: an iframe is not a sequential
    // tab stop by itself.
    expect(frame.getAttribute('tabindex')).toBe('0');
    expect(screen.container.querySelector('#cairn-pane-preview')!.contains(frame)).toBe(true);
  });

  it('links the adapter stylesheets and classes into the preview document', async () => {
    const props = {
      ...postProps({
        body: 'Styled body',
        preview: { stylesheets: ['/assets/site.css'], bodyClass: 'site-body', containerClass: 'prose' },
      }),
      render: (md: string) => `<p>${md}</p>`,
    };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('<p>Styled body</p>');
    const doc = previewSrcdoc(screen);
    expect(doc).toContain('<link rel="stylesheet" href="/assets/site.css">');
    expect(doc).toContain('<body class="site-body">');
    expect(doc).toContain('<div class="prose">');
  });

  it('the floored render pipeline strips a dangerous payload in the preview', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({ body: 'safe text\n\n<img src=x onerror="alert(1)">' }),
      render: (md: string) => renderMarkdown(md),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('safe text');
    expect(previewSrcdoc(screen)).not.toContain('onerror');
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
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('href="/about"');
    expect(previewSrcdoc(screen)).toContain('cairn-broken-link');
  });

  it('hides the sidebar while Preview shows and restores it on Write', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    expect(aside.classList.contains('hidden')).toBe(false);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    // Hidden, not unmounted: the uncontrolled field edits survive the round trip. The form
    // drops its two-column grid, so the editor card takes the full content width.
    expect(aside.classList.contains('hidden')).toBe(true);
    const form = screen.container.querySelector('#cairn-edit-form')!;
    expect(form.classList.contains('lg:grid')).toBe(false);
    await screen.getByRole('tab', { name: 'Write' }).click();
    expect(aside.classList.contains('hidden')).toBe(false);
    expect(form.classList.contains('lg:grid')).toBe(true);
  });

  it('switches the frame width from the device menu and persists the choice', async () => {
    const props = { ...postProps({ body: 'sized' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const frame = () => screen.container.querySelector<HTMLElement>('.cairn-preview-frame')!;
    expect(frame().style.width).toBe('100%');
    await screen.getByRole('button', { name: /preview width/i }).click();
    await screen.getByRole('button', { name: 'Tablet · 768 px', exact: true }).click();
    await expect.poll(() => frame().style.width).toBe('768px');
    expect(localStorage.getItem('cairn-editor-preview-device')).toBe('tablet');
  });

  it('seeds the device from the persisted choice with a Desktop default', async () => {
    localStorage.setItem('cairn-editor-preview-device', 'phone');
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLElement>('.cairn-preview-frame')!.style.width)
      .toBe('390px');
  });

  it('captions a non-desktop width above the frame and stays quiet on Desktop', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const pane = () => screen.container.querySelector('#cairn-pane-preview')!;
    expect(pane().textContent ?? '').not.toContain('Desktop');
    await screen.getByRole('button', { name: /preview width/i }).click();
    await screen.getByRole('button', { name: 'Small phone · 320 px', exact: true }).click();
    await expect.poll(() => pane().textContent ?? '').toContain('Small phone · 320 px');
  });

  const previewHint =
    "Preview shows unstyled markup until the adapter's preview option names the site's stylesheets.";

  it('hints at the missing preview knob when the adapter sets none', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    expect(screen.container.querySelector('#cairn-pane-preview')!.textContent ?? '').toContain(previewHint);
  });

  it('drops the hint once the adapter names its stylesheets', async () => {
    const screen = render(EditPage, postProps({ preview: { stylesheets: ['/site.css'] } }));
    await screen.getByRole('tab', { name: 'Preview' }).click();
    expect(screen.container.querySelector('#cairn-pane-preview')!.textContent ?? '').not.toContain(previewHint);
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
    await screen.getByRole('button', { name: 'More actions' }).click();
    await expect.element(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('renders the change-url control', async () => {
    const screen = render(EditPage, postProps());
    await expect.element(screen.getByRole('button', { name: /change url/i })).toBeInTheDocument();
  });

  it('surfaces a rename collision error', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = { error: 'An entry with that slug already exists.' };
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
    (props as Record<string, unknown>).form = { error: 'An entry with that slug already exists.' };
    const screen = render(EditPage, props);
    const region = screen.container.querySelector('[aria-live="assertive"]');
    expect(region).not.toBeNull();
    expect(region!.textContent ?? '').toMatch(/already exists/i);
  });

  it('shows the broken-links banner and unwraps a link with the fix', async () => {
    const props = postProps();
    props.data.body = 'see [gone](cairn:pages/gone) here';
    // The action result the page receives after a blocked save. The shared error summary rides
    // along but the page renders only the richer broken-links banner, never a second alert.
    (props as Record<string, unknown>).form = {
      error: 'This page links to 1 missing page.',
      brokenLinks: ['cairn:pages/gone'],
      body: props.data.body,
    };
    const screen = render(EditPage, props);
    const banner = screen.container.querySelector('.alert');
    expect(banner?.textContent ?? '').toContain('cairn:pages/gone');
    expect(screen.container.querySelectorAll('.alert')).toHaveLength(1);
    await screen.getByRole('button', { name: /remove link/i }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('see gone here');
  });

  it('seeds the editor from the returned form body after a blocked save', async () => {
    const props = postProps({ body: 'old committed text' });
    (props as Record<string, unknown>).form = {
      error: 'This page links to 1 missing page.',
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
      error: 'Cannot delete 2026-05-hi: 1 page links to it.',
      inboundLinks: [{ concept: 'posts', id: 'b', title: 'Post B', permalink: '/b' }],
      id: '2026-05-hi',
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
    (props as Record<string, unknown>).form = {
      error: 'This page links to 1 missing page.',
      brokenLinks: ['cairn:pages/gone'],
      body: props.data.body,
    };
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

  it('shows the Edited badge in the header when the live site lags the edits', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    const badge = screen.container.querySelector('header .badge-warning');
    expect(badge?.textContent?.trim()).toBe('Edited');
  });

  it('shows the New badge in the header for a pending new entry', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: false }));
    const badge = screen.container.querySelector('header .badge-info');
    expect(badge?.textContent?.trim()).toBe('New');
  });

  it('shows the Published badge when the live site matches', async () => {
    const screen = render(EditPage, postProps());
    const badge = screen.container.querySelector('header .badge-ghost');
    expect(badge?.textContent?.trim()).toBe('Published');
  });

  it('drops the standing pending banner in favor of the header badge', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    const banner = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('Unpublished changes'),
    );
    expect(banner).toBeUndefined();
    expect(screen.container.textContent ?? '').not.toContain('Not yet published');
  });

  it('offers a Publish button riding the edit form when edits are pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const publish = screen.container.querySelector('button[formaction="?/publish"][form="cairn-edit-form"]');
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
    await screen.getByRole('button', { name: 'More actions' }).click();
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
    await screen.getByRole('button', { name: 'More actions' }).click();
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
    await screen.getByRole('button', { name: 'More actions' }).click();
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
          'header button[type="submit"][form="cairn-edit-form"]:not([formaction])',
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
    // Save stays disabled while clean, so edit the body before clicking it.
    await makeDirty(screen);
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('submit', stop, true);
    try {
      await screen.getByRole('button', { name: 'Save' }).click();
      const publish = () =>
        screen.container.querySelector<HTMLButtonElement>('button[formaction="?/publish"]')!;
      const save = () =>
        screen.container.querySelector<HTMLButtonElement>(
          'header button[type="submit"][form="cairn-edit-form"]:not([formaction])',
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
      'header button[type="submit"][form="cairn-edit-form"]:not([formaction])',
    )!;
    expect(save.classList.contains('btn-outline')).toBe(false);
  });

  it('wires the tabs to their panes with aria-controls and tabpanel roles', async () => {
    const screen = render(EditPage, postProps());
    const writeTab = screen.getByRole('tab', { name: 'Write' });
    const previewTab = screen.getByRole('tab', { name: 'Preview' });
    await expect.element(writeTab).toHaveAttribute('aria-selected', 'true');
    await expect.element(writeTab).toHaveAttribute('aria-controls', 'cairn-pane-write');
    await expect.element(previewTab).toHaveAttribute('aria-controls', 'cairn-pane-preview');
    const writePane = screen.container.querySelector('#cairn-pane-write')!;
    expect(writePane.getAttribute('role')).toBe('tabpanel');
    expect(writePane.getAttribute('aria-labelledby')).toBe('cairn-tab-write');
    await previewTab.click();
    await expect.element(previewTab).toHaveAttribute('aria-selected', 'true');
    const previewPane = screen.container.querySelector('#cairn-pane-preview')!;
    expect(previewPane.getAttribute('role')).toBe('tabpanel');
    expect(previewPane.getAttribute('aria-labelledby')).toBe('cairn-tab-preview');
    // The preview pane holds no focusable content, so it is itself a tab stop (the tabpanel
    // pattern's completeness requirement).
    expect(previewPane.getAttribute('tabindex')).toBe('0');
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
    const insert = screen.container.querySelector('button[aria-label="Insert block"]');
    expect(link).not.toBeNull();
    expect(insert).not.toBeNull();
    expect(toolbar.contains(link)).toBe(true);
    expect(toolbar.contains(insert)).toBe(true);
    const header = screen.container.querySelector('header')!;
    expect(header.querySelector('button[aria-label="Link to page"]')).toBeNull();
    expect(header.querySelector('button[aria-label="Insert block"]')).toBeNull();
  });

  it('switching the toolbar tab to Preview shows the preview pane', async () => {
    const props = { ...postProps({ body: 'Tab body' }), render: (md: string) => `<p>${md}</p>` };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('Tab body');
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

  // Edits the body through the registered format seam (an empty-selection bold wrap) and waits
  // for the save-state indicator to acknowledge the change.
  async function makeDirty(screen: ReturnType<typeof render>) {
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true }));
    await expect
      .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
      .toBe('Unsaved changes');
  }

  it('disables Save on a clean page and enables it once edited', async () => {
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    const save = () =>
      screen.container.querySelector<HTMLButtonElement>(
        'header button[type="submit"][form="cairn-edit-form"]:not([formaction])',
      )!;
    expect(save().disabled).toBe(true);
    await makeDirty(screen);
    await expect.poll(() => save().disabled).toBe(false);
  });

  it('keeps Save enabled for a new entry before any edit', async () => {
    const screen = render(EditPage, postProps({ isNew: true }));
    const save = screen.container.querySelector<HTMLButtonElement>(
      'header button[type="submit"][form="cairn-edit-form"]:not([formaction])',
    )!;
    expect(save.disabled).toBe(false);
  });

  it('shows no save-state text on a clean mount', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    expect(screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '').toBe('');
  });

  it('flags unsaved changes when the body diverges from the committed text', async () => {
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    await makeDirty(screen);
  });

  it('flags unsaved changes when a sidebar field receives input', async () => {
    const screen = render(EditPage, postProps());
    const date = screen.container.querySelector('input[name="date"]')!;
    date.dispatchEvent(new Event('input', { bubbles: true }));
    await expect
      .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
      .toBe('Unsaved changes');
  });

  it('does not flag dirty from the link picker search box', async () => {
    const props = postProps();
    props.data.linkTargets = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const screen = render(EditPage, props);
    await screen.getByRole('button', { name: /link to page/i }).click();
    const search = screen.container.querySelector('dialog input[type="search"]')!;
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '').toBe('');
  });

  it('shows Saved after a save lands with nothing edited', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    await expect
      .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
      .toBe('Saved');
  });

  it('submits the edit form on Ctrl+S once the page is dirty', async () => {
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    await makeDirty(screen);
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      await expect.poll(() => submitted).toBe(true);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('ignores Ctrl+S while the page is clean', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true });
      window.dispatchEvent(event);
      // The shortcut is still claimed (no browser save dialog), but nothing submits: a clean
      // page has nothing to save, and a no-op save would still cut a pending branch.
      expect(event.defaultPrevented).toBe(true);
      expect(submitted).toBe(false);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('ignores Ctrl+S from inside an open dialog', async () => {
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    await makeDirty(screen);
    await screen.getByRole('button', { name: /web link/i }).click();
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-web-link-dialog-title"]',
    )!;
    await expect.poll(() => dialog.open).toBe(true);
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      const input = dialog.querySelector<HTMLInputElement>('input[type="url"]')!;
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true, bubbles: true });
      input.dispatchEvent(event);
      expect(submitted).toBe(false);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('prevents beforeunload while dirty and leaves it alone when clean', async () => {
    // Dispatching a real beforeunload on window makes the vitest browser orchestrator treat the
    // test page as unloading, so capture the handler the component registers and call it directly.
    const handlers: EventListener[] = [];
    const originalAdd = window.addEventListener;
    // Bound and loosened: the shared tsconfig types window against the workers event map, which
    // has no beforeunload, so the spy calls through a structurally typed reference.
    const callOriginal = originalAdd.bind(window) as (type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => void;
    window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'beforeunload' && typeof fn === 'function') handlers.push(fn);
      callOriginal(type, fn, opts);
    }) as typeof window.addEventListener;
    let screen: ReturnType<typeof render>;
    try {
      screen = render(EditPage, postProps({ body: 'plain prose' }));
      await expect.poll(() => handlers.length).toBe(1);
    } finally {
      window.addEventListener = originalAdd;
    }
    const onBeforeUnload = handlers[0];
    const cleanEvent = new Event('beforeunload', { cancelable: true });
    onBeforeUnload(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
    await makeDirty(screen);
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    onBeforeUnload(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });

  it('registers a navigation guard that cancels a dirty leave the editor declines', async () => {
    const countBefore = beforeNavigateCallbacks.length;
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    expect(beforeNavigateCallbacks.length).toBe(countBefore + 1);
    const guard = beforeNavigateCallbacks[beforeNavigateCallbacks.length - 1];
    const originalConfirm = window.confirm;
    try {
      // Clean: the guard neither prompts nor cancels.
      let confirmCalls = 0;
      let cancelled = false;
      window.confirm = () => {
        confirmCalls += 1;
        return false;
      };
      const navigation = { cancel: () => (cancelled = true) } as unknown as BeforeNavigate;
      guard(navigation);
      expect(confirmCalls).toBe(0);
      expect(cancelled).toBe(false);
      // Dirty plus a declined confirm: the navigation is cancelled.
      await makeDirty(screen);
      guard(navigation);
      expect(confirmCalls).toBe(1);
      expect(cancelled).toBe(true);
      // Dirty plus an accepted confirm: the navigation proceeds.
      window.confirm = () => true;
      cancelled = false;
      guard(navigation);
      expect(cancelled).toBe(false);
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('cancels a dirty full-page unload without a confirm prompt', async () => {
    const countBefore = beforeNavigateCallbacks.length;
    const screen = render(EditPage, postProps({ body: 'plain prose' }));
    expect(beforeNavigateCallbacks.length).toBe(countBefore + 1);
    const guard = beforeNavigateCallbacks[beforeNavigateCallbacks.length - 1];
    const originalConfirm = window.confirm;
    try {
      let confirmCalls = 0;
      window.confirm = () => {
        confirmCalls += 1;
        return false;
      };
      let cancelled = false;
      const navigation = {
        willUnload: true,
        cancel: () => (cancelled = true),
      } as unknown as BeforeNavigate;
      // Clean: a full-page unload passes through untouched.
      guard(navigation);
      expect(cancelled).toBe(false);
      // Dirty: the guard cancels so SvelteKit lets the browser's own beforeunload dialog run,
      // and never stacks confirm() on top of it.
      await makeDirty(screen);
      guard(navigation);
      expect(cancelled).toBe(true);
      expect(confirmCalls).toBe(0);
    } finally {
      window.confirm = originalConfirm;
    }
  });

  it('opens the web link dialog on Ctrl+K inside the editor card', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    card.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const dialog = screen.container.querySelector<HTMLDialogElement>('dialog[aria-labelledby="cairn-web-link-dialog-title"]')!;
    await expect.poll(() => dialog.open).toBe(true);
    // Initial focus lands on the URL field the dialog exists for, not the Close button.
    await expect.poll(() => document.activeElement === dialog.querySelector('input[type="url"]')).toBe(true);
  });

  it('inserts a web link from the toolbar dialog', async () => {
    const screen = render(EditPage, postProps({ body: '' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    await screen.getByRole('button', { name: /web link/i }).click();
    await screen.getByLabelText('Web address').fill('https://example.com/guide');
    await screen.getByLabelText('Text').fill('Read this');
    await screen.getByRole('button', { name: 'Add link' }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toContain('[Read this](https://example.com/guide)');
  });

  it('wraps the editor selection as the link text through the web link dialog', async () => {
    const screen = render(EditPage, postProps({ body: 'me first' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
    content.focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
    await screen.getByRole('button', { name: /web link/i }).click();
    // The selection rides in as the Text field's default.
    await expect.element(screen.getByLabelText('Text')).toHaveValue('me');
    await screen.getByLabelText('Web address').fill('https://example.com/');
    await screen.getByRole('button', { name: 'Add link' }).click();
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('[me](https://example.com/) first');
  });

  it('disables the format and insert controls while Preview shows', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const bold = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Bold (Ctrl+B)"]')!;
    expect(bold.disabled).toBe(true);
    const web = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Web link (Ctrl+K)"]')!;
    expect(web.disabled).toBe(true);
    const page = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Link to page"]')!;
    expect(page.disabled).toBe(true);
    // The tabs stay live so the editor can switch back.
    const write = screen.container.querySelector<HTMLButtonElement>('#cairn-tab-write')!;
    expect(write.disabled).toBe(false);
  });

  it('links back to the concept list from a header breadcrumb', async () => {
    const screen = render(EditPage, postProps());
    const crumb = screen.container.querySelector('header a[href="/admin/posts"]');
    expect(crumb).not.toBeNull();
    expect(crumb!.textContent ?? '').toContain('Posts');
  });

  it('shows the title in the header and drops the id sub-line', async () => {
    const screen = render(EditPage, postProps());
    const header = screen.container.querySelector('header')!;
    expect(header.querySelector('h1')?.textContent).toBe('Hello');
    expect(header.textContent ?? '').not.toContain('2026-05-hello');
  });

  it('stacks the Hidden badge beside the status badge for a hidden entry', async () => {
    const screen = render(
      EditPage,
      postProps({ frontmatter: { title: 'Hello', date: '2026-05-01', draft: true } }),
    );
    const header = screen.container.querySelector('header')!;
    expect(header.querySelector('.badge-neutral')?.textContent?.trim()).toBe('Hidden');
    expect(header.querySelector('.badge-ghost')?.textContent?.trim()).toBe('Published');
  });

  it('hosts the save-state indicator inside the header', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('header .cairn-save-state')).not.toBeNull();
  });

  it('wires the header Save and Publish to the edit form by id', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    expect(screen.container.querySelector('form[action="?/save"]')?.id).toBe('cairn-edit-form');
    const header = screen.container.querySelector('header')!;
    expect(header.querySelector('button[type="submit"][form="cairn-edit-form"]:not([formaction])')).not.toBeNull();
    expect(header.querySelector('button[formaction="?/publish"][form="cairn-edit-form"]')).not.toBeNull();
  });

  it('lists Delete in the overflow menu and omits Discard changes while clean', async () => {
    const screen = render(EditPage, postProps());
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    expect(menu.textContent ?? '').toContain('Delete');
    expect(menu.textContent ?? '').not.toContain('Discard changes');
  });

  it('adds Discard changes to the overflow menu while pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    expect(menu.textContent ?? '').toContain('Delete');
    expect(menu.textContent ?? '').toContain('Discard changes');
  });

  it('opens the delete confirm from the overflow menu and closes the menu', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('button', { name: 'More actions' }).click();
    await screen.getByRole('button', { name: /^delete$/i }).click();
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-delete-dialog-title"]',
    )!;
    expect(dialog.open).toBe(true);
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    await expect.poll(() => menu.matches(':popover-open')).toBe(false);
  });

  it('drives the header overflow as a popover with aria-expanded and Escape', async () => {
    const screen = render(EditPage, postProps());
    const trigger = screen.getByRole('button', { name: 'More actions' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    expect(menu.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(menu.matches(':popover-open')).toBe(false);
  });

  it('keeps the sidebar to the one Change URL action', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const buttons = screen.container.querySelectorAll('aside button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent ?? '').toContain('Change URL');
  });

  it('hoists the title input above the editor card inside the form', async () => {
    const screen = render(EditPage, postProps());
    const form = screen.container.querySelector('#cairn-edit-form')!;
    const title = form.querySelector<HTMLInputElement>('input[name="title"]');
    expect(title).not.toBeNull();
    expect(title!.value).toBe('Hello');
    expect(title!.required).toBe(true);
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    expect(title!.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.container.querySelector('aside input[name="title"]')).toBeNull();
  });

  it('renders no document-title input for an adapter without a title field', async () => {
    const props = postProps({
      fields: [{ type: 'date', name: 'date', label: 'Date' }] satisfies FrontmatterField[],
      frontmatter: { date: '2026-05-01' },
    });
    const screen = render(EditPage, props);
    expect(screen.container.querySelector('input[name="title"]')).toBeNull();
  });

  it('groups the sidebar under the Details, Visibility, and Address eyebrows', async () => {
    const screen = render(EditPage, postProps());
    const legends = Array.from(screen.container.querySelectorAll('aside legend')).map((l) =>
      l.textContent?.trim(),
    );
    expect(legends).toEqual(['Details', 'Visibility', 'Address']);
  });

  it('omits Details without remaining fields and Visibility without a draft boolean', async () => {
    // The page concept carries only the title field, which is hoisted, so Address stands alone.
    const screen = render(EditPage, pageProps());
    const legends = Array.from(screen.container.querySelectorAll('aside legend')).map((l) =>
      l.textContent?.trim(),
    );
    expect(legends).toEqual(['Address']);
  });

  it('renders the draft boolean as the Hidden toggle with its hint', async () => {
    const screen = render(
      EditPage,
      postProps({ frontmatter: { title: 'Hello', date: '2026-05-01', draft: true } }),
    );
    const toggle = screen.container.querySelector<HTMLInputElement>('aside input[name="draft"]');
    expect(toggle).not.toBeNull();
    expect(toggle!.checked).toBe(true);
    expect(toggle!.closest('label')?.textContent ?? '').toContain('Hidden');
    expect(screen.container.querySelector('aside')!.textContent ?? '').toContain(
      "Hidden entries stay off the site's lists and feeds, even when published.",
    );
  });

  it('shows the address and opens the rename dialog from its Change URL button', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    expect(aside.querySelector('code')?.textContent).toBe('/hello');
    await screen.getByRole('button', { name: /change url/i }).click();
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-rename-dialog-title"]',
    )!;
    expect(dialog.open).toBe(true);
  });

  it('drops Change URL from the header overflow menu', async () => {
    const screen = render(EditPage, postProps());
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    expect(menu.textContent ?? '').not.toContain('Change URL');
  });

  it('flags unsaved changes when the hoisted title receives input', async () => {
    const screen = render(EditPage, postProps());
    const title = screen.container.querySelector('#cairn-edit-form input[name="title"]')!;
    title.dispatchEvent(new Event('input', { bubbles: true }));
    await expect
      .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
      .toBe('Unsaved changes');
  });

  // The four transient flashes share one feedback strip under the sticky header. Each case asserts
  // a single strip carrying the message, and that the message reaches the page exactly twice: the
  // visible strip plus the sr-only polite live region (no leftover per-flash alert divs).
  const flashCases = [
    {
      name: 'saved',
      over: { saved: true },
      message: 'Saved. Your site keeps showing the published version until you publish.',
    },
    { name: 'published', over: { publishedFlash: true }, message: 'Published. The live site is rebuilding.' },
    { name: 'discarded', over: { discardedFlash: true }, message: 'Changes discarded.' },
    { name: 'renamed', over: { renamed: true, slug: 'new-slug' }, message: 'The URL is now new-slug.' },
  ];
  for (const { name, over, message } of flashCases) {
    it(`renders the ${name} flash as the one feedback strip`, async () => {
      const screen = render(EditPage, postProps(over));
      const strips = screen.container.querySelectorAll('.cairn-feedback');
      expect(strips.length).toBe(1);
      expect(strips[0].classList.contains('alert-success')).toBe(true);
      expect(strips[0].textContent?.trim()).toBe(message);
      const leaves = Array.from(screen.container.querySelectorAll('*')).filter(
        (el) => el.children.length === 0 && (el.textContent ?? '').trim() === message,
      );
      expect(leaves.length).toBe(2);
      expect(leaves.some((el) => el.closest('[aria-live="polite"]'))).toBe(true);
    });
  }

  it('shows one strip even when several flash flags arrive together', async () => {
    const screen = render(EditPage, postProps({ saved: true, renamed: true }));
    expect(screen.container.querySelectorAll('.alert-success').length).toBe(1);
    expect(screen.container.querySelector('.cairn-feedback')?.textContent?.trim()).toBe(
      'Saved. Your site keeps showing the published version until you publish.',
    );
  });

  it('shows the word count in the editor card footer', async () => {
    const screen = render(EditPage, postProps({ body: '' }));
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    const count = screen.getByText('0 words');
    await expect.element(count).toBeInTheDocument();
    expect(card.contains(count.element())).toBe(true);
  });

  it('uses the singular for a one-word body', async () => {
    const screen = render(EditPage, postProps({ body: 'hello' }));
    await expect.element(screen.getByText('1 word')).toBeInTheDocument();
  });

  it('leaves directive lines and table rows out of the word count', async () => {
    const body = ':::gallery\nthree words here\n:::\n\n| Col | Col |\n| --- | --- |\n';
    const screen = render(EditPage, postProps({ body }));
    await expect.element(screen.getByText('3 words')).toBeInTheDocument();
  });

  it('does not count bold markers as part of a word', async () => {
    const screen = render(EditPage, postProps({ body: '**bold** word' }));
    await expect.element(screen.getByText('2 words')).toBeInTheDocument();
  });

  it('leaves heading markers out of the word count', async () => {
    const screen = render(EditPage, postProps({ body: '## Heading' }));
    await expect.element(screen.getByText('1 word')).toBeInTheDocument();
  });

  it('leaves inline directives out of the word count', async () => {
    const screen = render(EditPage, postProps({ body: ':icon[ski]{s=1} after' }));
    await expect.element(screen.getByText('1 word')).toBeInTheDocument();
  });

  it('counts a link as its text plus its URL, markers spaced out rather than mashed', async () => {
    const screen = render(EditPage, postProps({ body: '[text](https://example.com)' }));
    await expect.element(screen.getByText('2 words')).toBeInTheDocument();
  });

  it('updates the word count as the body changes', async () => {
    const props = postProps({ body: '' });
    props.data.linkTargets = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const screen = render(EditPage, props);
    await expect.element(screen.getByText('0 words')).toBeInTheDocument();
    // Inserting "[About Us](cairn:pages/about)" through the picker adds three words once the
    // link markers space out: the two-word link text plus its destination.
    await screen.getByRole('button', { name: /link to page/i }).click();
    await screen.getByRole('button', { name: /About Us/ }).click();
    await expect.element(screen.getByText('3 words')).toBeInTheDocument();
  });

  it('opens the Markdown help dialog from the editor footer and lists the cheat rows', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('button', { name: 'Markdown help' }).click();
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-markdown-help-title"]',
    )!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    expect(text).toContain('**bold**');
    expect(text).toContain('[[page-name]]');
    expect(text).toContain('~~text~~');
    expect(text).toContain('- [ ] item');
    expect(text).toContain('layout blocks');
  });

  it('makes a hidden save button the form default so Enter never publishes', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    // The default button for implicit submission (Enter in a single-line field) is the first
    // form-owned submit button in tree order, INCLUDING the header's external submitters, which
    // precede the form element. querySelectorAll returns tree order across the comma groups.
    const owned = Array.from(
      screen.container.querySelectorAll<HTMLButtonElement>(
        'button[type="submit"][form="cairn-edit-form"], #cairn-edit-form button[type="submit"]',
      ),
    );
    expect(owned.length).toBeGreaterThan(2);
    const fallback = owned[0];
    expect(fallback.hasAttribute('formaction')).toBe(false);
    expect(fallback.getAttribute('aria-hidden')).toBe('true');
    expect(fallback.tabIndex).toBe(-1);
    // It mirrors Save's disabled state, so Enter on a clean page submits nothing at all.
    expect(fallback.disabled).toBe(true);
    await makeDirty(screen);
    await expect.poll(() => fallback.disabled).toBe(false);
  });

  it('mounts the toolbar dialogs outside the edit form so no form nests', async () => {
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
    const props = { ...postProps({ pending: true }), registry };
    props.data.linkTargets = [
      { concept: 'pages', id: 'about', permalink: '/about', title: 'About Us', draft: false },
    ];
    const screen = render(EditPage, props);
    // The toolbar still offers all three triggers...
    const toolbar = screen.container.querySelector('[role="toolbar"]')!;
    expect(toolbar.querySelector('button[aria-label="Insert block"]')).not.toBeNull();
    expect(toolbar.querySelector('button[aria-label="Web link (Ctrl+K)"]')).not.toBeNull();
    expect(toolbar.querySelector('button[aria-label="Link to page"]')).not.toBeNull();
    // ...but no dialog form renders inside the edit form: a form nested in a form is invalid
    // HTML the parser repairs by dropping the outer tag, which breaks SSR and hydration.
    expect(screen.container.querySelectorAll('#cairn-edit-form form').length).toBe(0);
  });

  it('hides the Insert block trigger when the registry offers nothing insertable', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('button[aria-label="Insert block"]')).toBeNull();
  });

  it('remounts the edit surface when navigation lands on another entry', async () => {
    const screen = render(EditPage, postProps({ body: 'first body' }));
    await makeDirty(screen);
    await screen.rerender(postProps({ body: 'second body', id: '2026-06-other', slug: 'other' }));
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe('second body');
    await expect
      .poll(() => screen.container.querySelector('.cairn-save-state')?.textContent?.trim() ?? '')
      .toBe('');
  });

  it('lets a discard submission through the leave guard', async () => {
    // Capture the beforeunload handler the component registers (a real dispatch on window would
    // unload the test page), the recipe the beforeunload test above uses.
    const handlers: EventListener[] = [];
    const originalAdd = window.addEventListener;
    const callOriginal = originalAdd.bind(window) as (
      type: string,
      fn: EventListenerOrEventListenerObject,
      opts?: unknown,
    ) => void;
    window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'beforeunload' && typeof fn === 'function') handlers.push(fn);
      callOriginal(type, fn, opts);
    }) as typeof window.addEventListener;
    let screen: ReturnType<typeof render>;
    try {
      screen = render(EditPage, postProps({ pending: true, published: true, body: 'plain prose' }));
      await expect.poll(() => handlers.length).toBe(1);
    } finally {
      window.addEventListener = originalAdd;
    }
    await makeDirty(screen);
    // Dirty: the guard holds.
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    handlers[0](dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
    // Submit the discard POST (capture-phase preventDefault keeps the page from navigating).
    // Discarding while dirty is the primary discard scenario, so the guard must stand down.
    await screen.getByRole('button', { name: 'More actions' }).click();
    await screen.getByRole('button', { name: 'Discard changes' }).click();
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('submit', stop, true);
    try {
      await screen.getByRole('button', { name: 'Discard', exact: true }).click();
    } finally {
      document.removeEventListener('submit', stop, true);
    }
    const event = new Event('beforeunload', { cancelable: true });
    handlers[0](event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('shows a quiet line when the preview has nothing to render', async () => {
    const props = { ...postProps({ body: '' }), render: (md: string) => (md ? `<p>${md}</p>` : '') };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.element(screen.getByText('Nothing to preview yet.')).toBeInTheDocument();
  });

  it('names a preview render failure instead of blanking the pane', async () => {
    const props = {
      ...postProps({ body: 'some text' }),
      render: () => {
        throw new Error('boom');
      },
    };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.element(screen.getByText('The preview could not render this content.')).toBeInTheDocument();
  });

  it('discards an in-flight render across the entry remount, so entry B never shows entry A html', async () => {
    // A controllable async render: each call parks until the test resolves it, standing in for a
    // slow site pipeline.
    const calls: { md: string; resolve: (html: string) => void }[] = [];
    const slowRender = (md: string) => new Promise<string>((resolve) => calls.push({ md, resolve }));
    const screen = render(EditPage, { ...postProps({ body: 'first body' }), render: slowRender });
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => calls.length).toBe(1);
    // Navigate to entry B while A's render is still in flight; the entry-key reset remounts the
    // surface back on Write with an empty preview.
    await screen.rerender({
      ...postProps({ body: 'second body', id: '2026-06-other', slug: 'other' }),
      render: slowRender,
    });
    // A's slow render resolves late. Its html must never land on entry B's pane.
    calls[0].resolve('<p>entry A html</p>');
    await new Promise((r) => setTimeout(r, 50));
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.element(screen.getByText('Nothing to preview yet.')).toBeInTheDocument();
    expect(previewSrcdoc(screen)).not.toContain('entry A html');
    // B's own render still lands once it resolves.
    await expect.poll(() => calls.length).toBe(2);
    expect(calls[1].md).toBe('second body');
    calls[1].resolve('<p>entry B html</p>');
    await expect.poll(() => previewSrcdoc(screen)).toContain('entry B html');
  });

  it('flips Preview back to Write when a hidden required field blocks the save', async () => {
    const props = postProps({
      isNew: true,
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'text', name: 'subtitle', label: 'Subtitle', required: true },
      ] satisfies FrontmatterField[],
      frontmatter: { title: 'Hello', subtitle: '' },
    });
    const screen = render(EditPage, { ...props });
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const aside = screen.container.querySelector('aside')!;
    expect(aside.classList.contains('hidden')).toBe(true);
    // Save with the empty required Subtitle hidden by Preview. The browser cannot focus an
    // invisible invalid control, so without the invalid listener the save would cancel silently;
    // instead the page flips to Write and the report lands on the visible field.
    await screen.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => aside.classList.contains('hidden')).toBe(false);
    const subtitle = screen.container.querySelector<HTMLInputElement>('input[name="subtitle"]')!;
    expect(subtitle.validity.valueMissing).toBe(true);
    await expect.poll(() => document.activeElement).toBe(subtitle);
  });
});
