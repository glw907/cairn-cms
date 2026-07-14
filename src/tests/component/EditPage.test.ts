import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { BeforeNavigate } from '@sveltejs/kit';
import { stringify as devalueStringify } from 'devalue';
import * as ingest from '../../lib/components/client-ingest.js';
import * as tidyValidateModule from '../../lib/components/tidy-validate.js';
import * as componentGrammar from '../../lib/render/component-grammar.js';
import type { RoundTripSafety } from '../../lib/render/component-grammar.js';
import type { MediaEntry } from '../../lib/media/manifest.js';

// The optimistic upload loop touches createImageBitmap (ingestFile) and a real fetch (sendUpload);
// mock those two so the in-session-upload-renders-in-preview test reaches the success swap
// deterministically, while the pure request builder and failure mappers stay real.
vi.mock('../../lib/components/client-ingest.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/client-ingest.js')>(
    '../../lib/components/client-ingest.js',
  );
  return { ...actual, ingestFile: vi.fn(), sendUpload: vi.fn() };
});
// validateTidy stays real for every existing test; wrapping it in a vi.fn lets one test push a
// single-call throwing override (a parse-time throw in the success path) without touching every
// other tidy test's real validation behavior.
vi.mock('../../lib/components/tidy-validate.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/components/tidy-validate.js')>(
    '../../lib/components/tidy-validate.js',
  );
  return { ...actual, validateTidy: vi.fn(actual.validateTidy) };
});
// componentRoundTripSafety stays real for every existing test; wrapping it in a vi.fn lets one
// test hold its promise open to reproduce the stale-async-result race against a caret that has
// since moved to a different component.
vi.mock('../../lib/render/component-grammar.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/render/component-grammar.js')>(
    '../../lib/render/component-grammar.js',
  );
  return { ...actual, componentRoundTripSafety: vi.fn(actual.componentRoundTripSafety) };
});
// EditPage's lifecycle controls (Save, Publish, the status badge, the overflow) render into the
// one header band through the topbar context portal, not in a header of their own. This harness
// mounts EditPage joined to that band the way CairnAdmin/CairnAdminShell do, so a standalone render
// still exercises the desk controls. The band carries data-testid="cairn-band".
import EditPage from './_EditPageDesk.svelte';
import type { NamedField, SiteRender } from '../../lib/content/types.js';
import type { LinkTarget } from '../../lib/content/manifest.js';
import { createRenderer } from '../../lib/render/pipeline.js';
import { defineComponent, defineRegistry, type ComponentDef } from '../../lib/render/registry.js';
import { fields } from '../../lib/content/fields.js';
import { editorShortcuts } from '../../lib/components/editor-shortcuts.js';
// The same module instance EditPage receives for $app/navigation via the project alias.
import { beforeNavigateCallbacks } from './_app-navigation.js';
// The same module instance EditPage receives for $app/state via the project alias.
import { page as appPage } from './_app-state.js';
import { COLD_START } from './_fake-spell-worker.js';

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
      advisories: [],
      orphanTags: [],
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
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }] satisfies NamedField[],
      frontmatter: { title: 'About' },
    },
  };
}

/** The preview iframe's document, the surface the rendered html and site styles land on. */
function previewSrcdoc(screen: { container: HTMLElement }) {
  return screen.container.querySelector('iframe[title="Page preview"]')?.getAttribute('srcdoc') ?? '';
}

describe('EditPage', () => {
  // The editor preferences persist per browser; clear them so each test starts from the defaults
  // (Desktop preview width, both writing modes off).
  beforeEach(() => {
    localStorage.removeItem('cairn-editor-preview-device');
    localStorage.removeItem('cairn-editor-focus-mode');
    localStorage.removeItem('cairn-editor-typewriter');
  });

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

  it('aligns the title with the manuscript edge and dims it under focus mode', async () => {
    const screen = render(EditPage, postProps());
    const title = screen.container.querySelector('input.cairn-doc-title')!;
    // The surface fills the card, so the title aligns by carrying the surface's inline padding.
    const wrapper = title.parentElement!;
    expect(wrapper.classList.contains('px-5')).toBe(true);
    // Focus mode eases the title back with the rest of the context.
    expect(title.classList.contains('cairn-doc-title-dim')).toBe(false);
    await screen.getByRole('button', { name: 'Focus mode', exact: true }).click();
    expect(title.classList.contains('cairn-doc-title-dim')).toBe(true);
  });

  it('caps the editor column by posture in Write and frees it in Preview', async () => {
    const screen = render(EditPage, postProps());
    const column = screen.container.querySelector('form#cairn-edit-form > div')!;
    // Prose posture (the default) hugs the 72ch measure.
    expect(column.classList.contains('max-w-[49rem]')).toBe(true);
    // Markup posture widens to the working ceiling.
    await screen.getByRole('button', { name: 'Markup', exact: true }).click();
    expect(column.classList.contains('max-w-[56rem]')).toBe(true);
    expect(localStorage.getItem('cairn-editor-surface')).toBe('markup');
    await screen.getByRole('tab', { name: 'Preview' }).click();
    // Preview mode: the device frames need the full column.
    expect(column.classList.contains('max-w-[56rem]')).toBe(false);
    await screen.getByRole('tab', { name: 'Write' }).click();
    expect(column.classList.contains('max-w-[56rem]')).toBe(true);
  });

  it('seeds the surface posture from the persisted choice with a prose default', async () => {
    localStorage.setItem('cairn-editor-surface', 'markup');
    const screen = render(EditPage, postProps());
    await expect
      .element(screen.getByRole('button', { name: 'Markup', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(screen.getByRole('button', { name: 'Prose', exact: true }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  it('dresses the posture pair as one bordered segmented control with the active check glyph', async () => {
    localStorage.removeItem('cairn-editor-surface');
    const screen = render(EditPage, postProps());
    const group = screen.container.querySelector<HTMLElement>('[role="group"][aria-label="Editing surface"]')!;
    // One bordered segmented control: a single border carries the pick-one semantics, so the
    // wrapper is bordered and rounded and the two postures are its only buttons (no group label).
    expect(group.className).toContain('border');
    expect(group.className).toContain('border-[var(--cairn-card-border)]');
    const segButtons = Array.from(group.querySelectorAll<HTMLButtonElement>('button'));
    expect(segButtons.map((b) => b.textContent?.trim())).toEqual(['Prose', 'Markup']);
    // The check glyph rides inside the active segment only (the non-color cue, WCAG 1.4.1).
    const prose = screen.getByRole('button', { name: 'Prose', exact: true });
    const markup = screen.getByRole('button', { name: 'Markup', exact: true });
    await expect.element(prose).toHaveAttribute('aria-pressed', 'true');
    expect(segButtons.find((b) => b.textContent?.trim() === 'Prose')!.querySelector('svg')).not.toBeNull();
    expect(segButtons.find((b) => b.textContent?.trim() === 'Markup')!.querySelector('svg')).toBeNull();
    await markup.click();
    await expect.element(markup).toHaveAttribute('aria-pressed', 'true');
    expect(segButtons.find((b) => b.textContent?.trim() === 'Markup')!.querySelector('svg')).not.toBeNull();
    expect(segButtons.find((b) => b.textContent?.trim() === 'Prose')!.querySelector('svg')).toBeNull();
  });

  it('dresses Focus mode and Typewriter as standalone check-and-tint toggles', async () => {
    const screen = render(EditPage, postProps());
    for (const name of ['Focus mode', 'Typewriter']) {
      const toggle = screen.getByRole('button', { name, exact: true });
      const el = Array.from(screen.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === name,
      )!;
      // Standalone toggles, outside the segmented border, carrying their state on aria-pressed
      // with the check glyph as the non-color cue and a tint when pressed.
      await expect.element(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(el.closest('[role="group"][aria-label="Editing surface"]')).toBeNull();
      expect(el.querySelector('svg')).toBeNull();
      // Idle wears no tint; pressed picks up the primary tint.
      expect(el.className).not.toContain('text-primary');
      await toggle.click();
      await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(el.querySelector('svg')).not.toBeNull();
      expect(el.className).toContain('text-primary');
    }
  });

  it('dresses Markdown help as a borderless underlined link button', async () => {
    const screen = render(EditPage, postProps());
    const help = screen.getByRole('button', { name: 'Markdown help', exact: true });
    const el = Array.from(screen.container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Markdown help',
    )!;
    // A link-styled reference: underlined, no border, no button fill, never aria-pressed (it
    // opens a dialog, it is not a state toggle).
    expect(el.className).toContain('underline');
    expect(el.className).not.toContain('border');
    expect(el.className).not.toContain('btn');
    expect(el.hasAttribute('aria-pressed')).toBe(false);
    expect(el.getAttribute('aria-haspopup')).toBe('dialog');
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
    const props = { ...postProps({ body: 'Hello world' }), render: ({ body }: Parameters<SiteRender>[0]) => Promise.resolve(`<p>${body}</p>`) };
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
      render: ({ body }: Parameters<SiteRender>[0]) => Promise.resolve(`<p>${body}</p>`),
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
      render: ({ body }: Parameters<SiteRender>[0]) => renderMarkdown(body),
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
      render: ({ body, resolve, resolveMedia }: Parameters<SiteRender>[0]) => renderMarkdown(body, { resolve, resolveMedia }),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => previewSrcdoc(screen)).toContain('href="/about"');
    expect(previewSrcdoc(screen)).toContain('cairn-broken-link');
  });

  it('resolves a media reference in the preview to its delivery path', async () => {
    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({
        body: '![shoes](media:blue-running-shoes.a1b2c3d4e5f6a7b8)',
        mediaTargets: {
          a1b2c3d4e5f6a7b8: { slug: 'blue-running-shoes', ext: 'webp', contentType: 'image/webp' },
        },
      }),
      // The stub threads resolveMedia into the real renderMarkdown, so the assertion exercises the
      // live resolve path the way EditPage wires it.
      render: ({ body, resolve, resolveMedia }: Parameters<SiteRender>[0]) => renderMarkdown(body, { resolve, resolveMedia }),
    };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect
      .poll(() => previewSrcdoc(screen))
      .toContain('src="/media/blue-running-shoes.a1b2c3d4e5f6a7b8.webp"');
  });

  it('resolves an in-session uploaded image in the preview before the next save commits it', async () => {
    // The preview resolver merges this session's uploaded records over the committed mediaTargets, so
    // a just-uploaded image renders its thumbnail in the live preview rather than reading as a broken
    // reference. mediaTargets starts empty here: only the optimistic upload feeds the resolver.
    const uploaded: MediaEntry = {
      hash: 'a1b2c3d4e5f6a7b8',
      sha256: 'f'.repeat(64),
      slug: 'seaside',
      displayName: 'Seaside',
      originalFilename: 'seaside.png',
      alt: 'A quiet shore',
      ext: 'png',
      contentType: 'image/png',
      bytes: 256,
      width: 8,
      height: 8,
      createdAt: '2026-06-16T00:00:00.000Z',
    };
    vi.mocked(ingest.ingestFile).mockResolvedValue({
      blob: new Blob([new Uint8Array([1])], { type: 'image/png' }),
      contentType: 'image/png',
      width: 8,
      height: 8,
    });
    vi.mocked(ingest.sendUpload).mockResolvedValue({
      type: 'basic',
      status: 200,
      text: async () =>
        JSON.stringify({
          type: 'success',
          status: 200,
          data: devalueStringify({
            reference: `media:${uploaded.slug}.${uploaded.hash}`,
            record: uploaded,
            reused: false,
            mismatch: false,
          }),
        }),
    } as unknown as Response);

    const { renderMarkdown } = createRenderer(defineRegistry({ components: [] }));
    const props = {
      ...postProps({ body: '', mediaTargets: {} }),
      render: ({ body, resolve, resolveMedia }: Parameters<SiteRender>[0]) => renderMarkdown(body, { resolve, resolveMedia }),
    };
    const screen = render(EditPage, props);

    // Drive the real insert UI: open the popover, choose a file, describe it, and insert. The capture
    // card's submit and the toolbar trigger share the "Insert image" name, so the card submit is
    // scoped to the popover dialog where only the submit lives.
    await screen.getByRole('button', { name: 'Insert image' }).first().click();
    const file = new File([new Uint8Array([1])], 'seaside.png', { type: 'image/png' });
    const fileInput = screen.container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);
    await screen.getByRole('radio', { name: /describ|write/i }).click();
    await screen.getByRole('textbox', { name: /alt|description/i }).fill('A quiet shore');
    const dialog = screen.container.querySelector('[role="dialog"]') as HTMLElement;
    (dialog.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    // The optimistic loop resolves to the committed reference; the preview then resolves that
    // reference to its delivery path from the merged uploaded record (not from mediaTargets).
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect
      .poll(() => previewSrcdoc(screen))
      .toContain('src="/media/seaside.a1b2c3d4e5f6a7b8.png"');
  });

  it('centers the editor column with no two-column grid in either posture', async () => {
    const screen = render(EditPage, postProps());
    // The details column moved behind a slide-over, so the form is no longer a two-column grid.
    // The editor column centers truly in both Write postures and in Preview.
    const form = screen.container.querySelector('#cairn-edit-form')!;
    expect(form.classList.contains('lg:grid')).toBe(false);
    const column = screen.container.querySelector('form#cairn-edit-form > div')!;
    expect(column.classList.contains('mx-auto')).toBe(true);
    await screen.getByRole('button', { name: 'Markup', exact: true }).click();
    expect(form.classList.contains('lg:grid')).toBe(false);
    expect(column.classList.contains('mx-auto')).toBe(true);
  });

  it('switches the frame width from the device menu and persists the choice', async () => {
    const props = { ...postProps({ body: 'sized' }), render: ({ body }: Parameters<SiteRender>[0]) => Promise.resolve(`<p>${body}</p>`) };
    const screen = render(EditPage, props);
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const frame = () => screen.container.querySelector<HTMLElement>('.cairn-preview-frame')!;
    expect(frame().style.width).toBe('100%');
    await screen.getByRole('button', { name: /preview width/i }).click();
    await screen.getByRole('button', { name: 'Tablet · 768 px', exact: true }).click();
    await expect.poll(() => frame().style.width).toBe('768px');
    expect(localStorage.getItem('cairn-editor-preview-device')).toBe('tablet');
  });

  it('toggles focus mode from the card footer and persists the flip', async () => {
    const screen = render(EditPage, postProps({ body: 'one\n\ntwo' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    // The writing modes live visible in the footer strip, not behind the More overflow.
    const focusToggle = () => screen.getByRole('button', { name: 'Focus mode', exact: true });
    await expect.element(focusToggle()).toHaveAttribute('aria-pressed', 'false');
    await focusToggle().click();
    expect(localStorage.getItem('cairn-editor-focus-mode')).toBe('true');
    // The flip reaches the mounted editor: the caret sits at the start, so the second
    // paragraph dims.
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-focus-dim')).not.toBeNull();
    await expect.element(focusToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles typewriter scrolling from the card footer and persists the flip', async () => {
    const screen = render(EditPage, postProps());
    const toggle = () => screen.getByRole('button', { name: 'Typewriter', exact: true });
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'false');
    await toggle().click();
    expect(localStorage.getItem('cairn-editor-typewriter')).toBe('true');
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('seeds the writing modes from the persisted choices', async () => {
    localStorage.setItem('cairn-editor-focus-mode', 'true');
    localStorage.setItem('cairn-editor-typewriter', 'true');
    const screen = render(EditPage, postProps({ body: 'one\n\ntwo' }));
    // Focus mode arrives enabled: the editor dims the paragraph away from the mount caret.
    await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-focus-dim')).not.toBeNull();
    await expect
      .element(screen.getByRole('button', { name: 'Focus mode', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(screen.getByRole('button', { name: 'Typewriter', exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
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
    // The Address group lives in the details slide-over; open it to reach the control.
    await screen.getByRole('button', { name: 'Details' }).click();
    await expect.element(screen.getByRole('button', { name: /change url/i })).toBeInTheDocument();
  });

  it('surfaces a rename collision error', async () => {
    const props = postProps();
    (props as Record<string, unknown>).form = { error: 'An entry with that address already exists.' };
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
    (props as Record<string, unknown>).form = { error: 'An entry with that address already exists.' };
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

  it('surfaces the needs-alt count when a placed image lacks alt text', async () => {
    const hash = '0123456789abcdef';
    const screen = render(EditPage, postProps({ body: `![](media:cat.${hash}) and ![A dog](media:dog.${hash})` }));
    const notice = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('alt text'),
    );
    expect(notice).toBeTruthy();
    // One image lacks alt; the other carries it, so the count is one, not two.
    expect(notice!.textContent ?? '').toContain('1 image needs alt text');
    expect(notice!.classList.contains('alert-warning')).toBe(true);
    // The warning carries a glyph, never hue alone.
    expect(notice!.querySelector('svg')).toBeTruthy();
  });

  it('shows no needs-alt notice when every placed image carries alt text', async () => {
    const hash = '0123456789abcdef';
    const screen = render(EditPage, postProps({ body: `![A cat](media:cat.${hash})` }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    expect(screen.container.textContent ?? '').not.toContain('alt text');
  });

  it('keeps the needs-alt role="status" live region mounted (empty) when the count is zero', async () => {
    const hash = '0123456789abcdef';
    const screen = render(EditPage, postProps({ body: `![A cat](media:cat.${hash})` }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    // The live region is present at load even with no debt, so a later first debt announces (WCAG
    // 4.1.3). It carries no visible notice while empty.
    const region = screen.container.querySelector('div[role="status"]');
    expect(region).not.toBeNull();
    expect(region!.querySelector('.alert-warning')).toBeNull();
    expect(region!.textContent ?? '').not.toContain('alt text');
  });

  it('jumps to the image lacking alt and clears the notice once alt is typed', async () => {
    const hash = '0123456789abcdef';
    const screen = render(EditPage, postProps({ body: `![](media:cat.${hash})` }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const notice = Array.from(screen.container.querySelectorAll('.alert')).find((el) =>
      (el.textContent ?? '').includes('alt text'),
    );
    expect(notice!.textContent ?? '').toContain('1 image needs alt text');
    // The jump control selects the whole image span in the editor and focuses the surface, landing
    // the author on it. Typing the same image with alt over the selection drops the count to zero,
    // so the notice clears. The select-range seam is what places the selection that typing replaces.
    await screen.getByRole('button', { name: /add alt text/i }).click();
    await expect.poll(() => document.activeElement).toBe(screen.container.querySelector('.cm-content'));
    // userEvent.keyboard treats [ as a descriptor opener, so a literal [ is doubled; ] is literal.
    await userEvent.keyboard(`![[A cat](media:cat.${hash})`);
    await expect
      .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
      .toBe(`![A cat](media:cat.${hash})`);
    await expect.poll(() => screen.container.textContent ?? '').not.toContain('image needs alt text');
  });

  it('shows the Edited badge in the header when the live site lags the edits', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: true }));
    const badge = screen.container.querySelector('[data-testid="cairn-band"] .badge-warning');
    expect(badge?.textContent?.trim()).toBe('Edited');
  });

  it('shows the New badge in the header for a pending new entry', async () => {
    const screen = render(EditPage, postProps({ pending: true, published: false }));
    const badge = screen.container.querySelector('[data-testid="cairn-band"] .badge-info');
    expect(badge?.textContent?.trim()).toBe('New');
  });

  it('shows the Published badge when the live site matches', async () => {
    const screen = render(EditPage, postProps());
    const badge = screen.container.querySelector('[data-testid="cairn-band"] .badge-ghost');
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

  it('hides the Discard control when nothing is pending', async () => {
    // Publish itself stays visible in this state now (guarded, not hidden); its guarded posture
    // and click inertness are covered in edit-page-publish-visibility.test.ts.
    const screen = render(EditPage, postProps());
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

  it('renders the site\'s publish-action links alongside a published confirmation', async () => {
    const screen = render(
      EditPage,
      postProps({
        publishedFlash: true,
        publishActions: [{ label: 'Announce', href: '/admin/club/announce?post=2026-05-hello' }],
      }),
    );
    const link = screen.container.querySelector('a[href="/admin/club/announce?post=2026-05-hello"]');
    expect(link?.textContent ?? '').toBe('Announce');
  });

  it('renders no publish-action links when the site declares none (absent-config no-op)', async () => {
    const screen = render(EditPage, postProps({ publishedFlash: true, publishActions: [] }));
    expect(screen.container.querySelector('a.link-primary')).toBeNull();
  });

  it('holds the publish-action links back until the publish-success moment (the render gate)', async () => {
    const screen = render(
      EditPage,
      postProps({
        publishedFlash: false,
        publishActions: [{ label: 'Announce', href: '/admin/club/announce?post=2026-05-hello' }],
      }),
    );
    expect(screen.container.querySelector('a.link-primary')).toBeNull();
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
          '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)',
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
          '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)',
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
      '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)',
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

  it('offers an enabled Insert-media control in the toolbar in Write mode', async () => {
    const screen = render(EditPage, postProps());
    const image = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Insert image"]');
    expect(image).not.toBeNull();
    expect(image!.disabled).toBe(false);
    expect(image!.closest('[role="toolbar"]')).not.toBeNull();
  });

  it('disables the Insert-media control in Preview mode', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('tab', { name: 'Preview' }).click();
    const image = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Insert image"]');
    expect(image).not.toBeNull();
    expect(image!.disabled).toBe(true);
  });

  it('opens the media popover when the Insert-media control is clicked', async () => {
    const screen = render(EditPage, postProps());
    const image = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Insert image"]');
    image!.click();
    await expect.element(screen.getByRole('dialog', { name: 'Insert image' })).toBeInTheDocument();
  });

  it('serializes the empty uploaded-records set in the hidden media field', async () => {
    const screen = render(EditPage, postProps());
    const field = screen.container.querySelector<HTMLInputElement>(
      'form#cairn-edit-form input[name="media"]',
    );
    expect(field).not.toBeNull();
    expect(field!.value).toBe('[]');
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
    const header = screen.container.querySelector('[data-testid="cairn-band"]')!;
    expect(header.querySelector('button[aria-label="Link to page"]')).toBeNull();
    expect(header.querySelector('button[aria-label="Insert block"]')).toBeNull();
  });

  it('switching the toolbar tab to Preview shows the preview pane', async () => {
    const props = { ...postProps({ body: 'Tab body' }), render: ({ body }: Parameters<SiteRender>[0]) => Promise.resolve(`<p>${body}</p>`) };
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
        '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)',
      )!;
    expect(save().disabled).toBe(true);
    await makeDirty(screen);
    await expect.poll(() => save().disabled).toBe(false);
  });

  it('keeps Save enabled for a new entry before any edit', async () => {
    const screen = render(EditPage, postProps({ isNew: true }));
    const save = screen.container.querySelector<HTMLButtonElement>(
      '[data-testid="cairn-band"] button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)',
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

  // The card-scoped format keys: each dispatches its format through the same registered seam the
  // Ctrl+B test proves, so an empty-selection insert at the doc start leaves a recognizable marker
  // in the hidden body input. The shifted-digit trio (Ctrl+Shift+9/8/7) arrives as '('/'*'/'&' for
  // e.key on US layouts, so the handler matches on e.code; the tests dispatch the real code.
  const cardFormatKeys: { name: string; init: KeyboardEventInit; marker: string }[] = [
    { name: 'Ctrl+E inline code', init: { key: 'e', ctrlKey: true }, marker: '``' },
    { name: 'Ctrl+Shift+9 quote', init: { key: '(', code: 'Digit9', ctrlKey: true, shiftKey: true }, marker: '> ' },
    { name: 'Ctrl+Shift+8 bulleted list', init: { key: '*', code: 'Digit8', ctrlKey: true, shiftKey: true }, marker: '- ' },
    { name: 'Ctrl+Shift+7 numbered list', init: { key: '&', code: 'Digit7', ctrlKey: true, shiftKey: true }, marker: '1. ' },
    { name: 'Ctrl+Alt+2 h2', init: { key: '2', ctrlKey: true, altKey: true }, marker: '## ' },
    { name: 'Ctrl+Alt+3 h3', init: { key: '3', ctrlKey: true, altKey: true }, marker: '### ' },
  ];
  for (const { name, init, marker } of cardFormatKeys) {
    it(`dispatches its format on ${name} inside the editor card`, async () => {
      const screen = render(EditPage, postProps({ body: 'plain prose' }));
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
      card.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      await expect
        .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value ?? '')
        .toContain(marker);
    });
  }

  it('requests the publish submit on Ctrl+Shift+S while pending', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    let formaction: string | null = 'unset';
    const stop = (e: SubmitEvent) => {
      e.preventDefault();
      formaction = (e.submitter as HTMLButtonElement | null)?.getAttribute('formaction') ?? null;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      await expect.poll(() => formaction).toBe('?/publish');
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('no-ops Ctrl+Shift+S when nothing is pending', async () => {
    const screen = render(EditPage, postProps({ pending: false }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    let submitted = false;
    const stop = (e: Event) => {
      e.preventDefault();
      submitted = true;
    };
    document.addEventListener('submit', stop, true);
    try {
      const event = new KeyboardEvent('keydown', { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(event);
      expect(submitted).toBe(false);
    } finally {
      document.removeEventListener('submit', stop, true);
    }
  });

  it('toggles Write/Preview on Ctrl+Alt+P', async () => {
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    expect(screen.container.querySelector('#cairn-pane-preview')).toBeNull();
    const toPreview = new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', ctrlKey: true, altKey: true, cancelable: true });
    window.dispatchEvent(toPreview);
    expect(toPreview.defaultPrevented).toBe(true);
    await expect.poll(() => screen.container.querySelector('#cairn-pane-preview')).not.toBeNull();
    const toWrite = new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', ctrlKey: true, altKey: true, cancelable: true });
    window.dispatchEvent(toWrite);
    await expect.poll(() => screen.container.querySelector('#cairn-pane-preview')).toBeNull();
  });

  it('toggles focus mode on Ctrl+Shift+F', async () => {
    const screen = render(EditPage, postProps({ body: 'one\n\ntwo' }));
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    const focusToggle = () => screen.getByRole('button', { name: 'Focus mode', exact: true });
    await expect.element(focusToggle()).toHaveAttribute('aria-pressed', 'false');
    const event = new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', ctrlKey: true, shiftKey: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await expect.element(focusToggle()).toHaveAttribute('aria-pressed', 'true');
  });

  // Every window-scoped key gates on an open dialog exactly the way Ctrl+S does.
  const windowKeysGatingOnDialog: { name: string; init: KeyboardEventInit }[] = [
    { name: 'Ctrl+Shift+S', init: { key: 'S', code: 'KeyS', ctrlKey: true, shiftKey: true } },
    { name: 'Ctrl+Alt+P', init: { key: 'p', code: 'KeyP', ctrlKey: true, altKey: true } },
    { name: 'Ctrl+Shift+F', init: { key: 'F', code: 'KeyF', ctrlKey: true, shiftKey: true } },
  ];
  for (const { name, init } of windowKeysGatingOnDialog) {
    it(`ignores ${name} from inside an open dialog`, async () => {
      const screen = render(EditPage, postProps({ pending: true, body: 'one\n\ntwo' }));
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await screen.getByRole('button', { name: /web link/i }).click();
      const dialog = screen.container.querySelector<HTMLDialogElement>(
        'dialog[aria-labelledby="cairn-web-link-dialog-title"]',
      )!;
      await expect.poll(() => dialog.open).toBe(true);
      const previewBefore = screen.container.querySelector('#cairn-pane-preview');
      const focusBefore = screen.getByRole('button', { name: 'Focus mode', exact: true });
      const pressedBefore = (await focusBefore.element()).getAttribute('aria-pressed');
      let submitted = false;
      const stop = (e: Event) => {
        e.preventDefault();
        submitted = true;
      };
      document.addEventListener('submit', stop, true);
      try {
        const input = dialog.querySelector<HTMLInputElement>('input[type="url"]')!;
        input.dispatchEvent(new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true }));
        // No submit (Ctrl+Shift+S), no pane flip (Ctrl+Alt+P), no focus-mode flip (Ctrl+Shift+F).
        expect(submitted).toBe(false);
        expect(screen.container.querySelector('#cairn-pane-preview')).toBe(previewBefore);
        expect((await focusBefore.element()).getAttribute('aria-pressed')).toBe(pressedBefore);
      } finally {
        document.removeEventListener('submit', stop, true);
      }
    });
  }

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

  it('carries no second breadcrumb in the page body (the band owns the way back)', async () => {
    // The breadcrumb is the shell's, rendered once in the topbar. EditPage's body must not
    // render its own back link or a second breadcrumb under the one band.
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('main a[href="/admin/posts"]')).toBeNull();
    expect(screen.container.querySelector('main nav[aria-label="Breadcrumb"]')).toBeNull();
  });

  it('keeps the page accessible name as the manuscript h1 and drops the id sub-line', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('main h1')?.textContent).toBe('Hello');
    const band = screen.container.querySelector('[data-testid="cairn-band"]')!;
    expect(band.textContent ?? '').not.toContain('2026-05-hello');
  });

  it('stacks the Hidden badge beside the status badge for a hidden entry', async () => {
    const screen = render(
      EditPage,
      postProps({ frontmatter: { title: 'Hello', date: '2026-05-01', draft: true } }),
    );
    const header = screen.container.querySelector('[data-testid="cairn-band"]')!;
    expect(header.querySelector('.badge-neutral')?.textContent?.trim()).toBe('Hidden');
    expect(header.querySelector('.badge-ghost')?.textContent?.trim()).toBe('Published');
  });

  it('hosts the save-state indicator inside the header', async () => {
    const screen = render(EditPage, postProps());
    expect(screen.container.querySelector('[data-testid="cairn-band"] .cairn-save-state')).not.toBeNull();
  });

  it('wires the header Save and Publish to the edit form by id', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    expect(screen.container.querySelector('form[action="?/save"]')?.id).toBe('cairn-edit-form');
    const header = screen.container.querySelector('[data-testid="cairn-band"]')!;
    expect(header.querySelector('button[type="submit"][form="cairn-edit-form"]:not([formaction])')).not.toBeNull();
    expect(header.querySelector('button[formaction="?/publish"][form="cairn-edit-form"]')).not.toBeNull();
  });

  it('lists Delete in the overflow menu and omits Discard changes while clean', async () => {
    const screen = render(EditPage, postProps());
    const menu = screen.container.querySelector('#cairn-edit-actions-menu')!;
    expect(menu.textContent ?? '').toContain('Delete');
    expect(menu.textContent ?? '').not.toContain('Discard changes');
  });

  // Task 6: the desk controls live in the one header band, fed through the topbar context portal.
  it('renders the desk controls inside the one header band', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    const band = screen.container.querySelector('[data-testid="cairn-band"]')!;
    // Save and Publish ride the edit form from the band.
    expect(band.querySelector('button[type="submit"][form="cairn-edit-form"]:not([formaction]):not(.sr-only)')).not.toBeNull();
    expect(band.querySelector('button[formaction="?/publish"][form="cairn-edit-form"]')).not.toBeNull();
    // The status badge, the save-state indicator, the Details trigger, and the overflow menu.
    expect(band.querySelector('.badge')).not.toBeNull();
    expect(band.querySelector('.cairn-save-state')).not.toBeNull();
    expect(band.querySelector('button[aria-label="Details"]')).not.toBeNull();
    expect(band.querySelector('button[aria-label="More actions"]')).not.toBeNull();
  });

  it('renders no second header band in the page body', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    // The sticky glass header is gone: the page body (EditPage's own render) carries no <header>
    // and no second copy of the lifecycle controls.
    const main = screen.container.querySelector('main')!;
    expect(main.querySelector('header')).toBeNull();
    expect(main.querySelector('button[formaction="?/publish"]')).toBeNull();
  });

  it('renders the feedback strip directly under the band', async () => {
    const screen = render(EditPage, postProps({ saved: true }));
    const band = screen.container.querySelector('[data-testid="cairn-band"]')!;
    const flash = screen.container.querySelector('.cairn-feedback')!;
    expect(flash).not.toBeNull();
    // The band precedes the feedback strip in document order, with nothing between but the
    // sr-only live regions.
    expect(band.compareDocumentPosition(flash) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the details slide-over from the band trigger as a labeled region', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    // Closed by default: the hidden attribute keeps the panel out of the a11y tree and tab order.
    expect(aside.hasAttribute('hidden')).toBe(true);
    expect(aside.getAttribute('role')).toBe('region');
    expect(aside.getAttribute('aria-label')).toBe('Entry details');
    await screen.getByRole('button', { name: 'Details' }).click();
    expect(aside.hasAttribute('hidden')).toBe(false);
    // A labeled region with its own close button.
    expect(screen.getByRole('button', { name: 'Close details' })).toBeTruthy();
  });

  it('moves focus to the close button on open and back to the trigger on close', async () => {
    const screen = render(EditPage, postProps());
    const trigger = screen.getByRole('button', { name: 'Details' });
    await trigger.click();
    const close = screen.getByRole('button', { name: 'Close details' });
    await expect.poll(() => document.activeElement).toBe(await close.element());
    await close.click();
    await expect.poll(() => document.activeElement).toBe(await trigger.element());
  });

  it('closes the details slide-over on Escape', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    await screen.getByRole('button', { name: 'Details' }).click();
    expect(aside.hasAttribute('hidden')).toBe(false);
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(event);
    await expect.poll(() => aside.hasAttribute('hidden')).toBe(true);
  });

  it('toggles the details slide-over on Ctrl+.', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    expect(aside.hasAttribute('hidden')).toBe(true);
    const open = new KeyboardEvent('keydown', { key: '.', ctrlKey: true, cancelable: true });
    window.dispatchEvent(open);
    expect(open.defaultPrevented).toBe(true);
    await expect.poll(() => aside.hasAttribute('hidden')).toBe(false);
    const close = new KeyboardEvent('keydown', { key: '.', ctrlKey: true, cancelable: true });
    window.dispatchEvent(close);
    await expect.poll(() => aside.hasAttribute('hidden')).toBe(true);
  });

  it('submits a detail field edited while the panel is closed and hidden', async () => {
    const screen = render(EditPage, postProps());
    const aside = screen.container.querySelector('aside')!;
    // Edit a detail field through the open panel, then close it.
    await screen.getByRole('button', { name: 'Details' }).click();
    const date = screen.container.querySelector<HTMLInputElement>('aside input[name="date"]')!;
    date.value = '2026-07-04';
    date.dispatchEvent(new Event('input', { bubbles: true }));
    await screen.getByRole('button', { name: 'Close details' }).click();
    expect(aside.hasAttribute('hidden')).toBe(true);
    // A display:none field still submits: the posted FormData carries the closed-panel edit.
    const form = screen.container.querySelector<HTMLFormElement>('#cairn-edit-form')!;
    const posted = new FormData(form);
    expect(posted.get('date')).toBe('2026-07-04');
  });

  it('opens the details panel when a hidden required detail field blocks the save', async () => {
    const props = postProps({
      isNew: true,
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'text', name: 'author', label: 'Author', required: true },
      ] satisfies NamedField[],
      frontmatter: { title: 'Hello', author: '' },
    });
    const screen = render(EditPage, { ...props });
    const aside = screen.container.querySelector('aside')!;
    // The required Author field lives in the closed (hidden) panel; the browser cannot report on
    // an invisible control, so the capture-phase invalid handler opens the panel first.
    expect(aside.hasAttribute('hidden')).toBe(true);
    await screen.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => aside.hasAttribute('hidden')).toBe(false);
    const author = screen.container.querySelector<HTMLInputElement>('input[name="author"]')!;
    expect(author.validity.valueMissing).toBe(true);
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

  it('keeps the sidebar groups to the one Change URL action', async () => {
    const screen = render(EditPage, postProps({ pending: true }));
    // The panel header adds a Close button; the field groups themselves still carry only the one
    // Change URL action.
    const close = screen.container.querySelector('aside button[aria-label="Close details"]');
    expect(close).not.toBeNull();
    const groupButtons = Array.from(screen.container.querySelectorAll('aside button')).filter(
      (b) => b.getAttribute('aria-label') !== 'Close details',
    );
    expect(groupButtons.length).toBe(1);
    expect(groupButtons[0].textContent ?? '').toContain('Change URL');
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
      fields: [{ type: 'date', name: 'date', label: 'Date' }] satisfies NamedField[],
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
    // Open the slide-over so the Address group's Change URL control is in the a11y tree.
    await screen.getByRole('button', { name: 'Details' }).click();
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

  it('shows a live, aria-hidden issue count in the footer sourced from the same diagnostics as the announcer', async () => {
    // "the the" is a deterministic objective-error finding (spellcheck.ts's objective source runs
    // without a Worker), so the count settles without a fake spell Worker.
    const screen = render(EditPage, postProps({ body: 'the the cat' }));
    const count = () => screen.container.querySelector('[data-testid="cairn-issue-count"]');
    await expect.element(screen.getByText('3 words')).toBeInTheDocument(); // the editor has mounted
    expect(count()?.textContent).toBe('0 issues');
    expect(count()?.getAttribute('aria-hidden')).toBe('true');
    await expect.poll(() => count()?.textContent, COLD_START).toBe('1 issue');
    // The count sits inside the same footer strip as the word count, not off in its own region.
    const card = screen.container.querySelector('[role="toolbar"]')!.closest('.rounded-box')!;
    expect(card.contains(count()!)).toBe(true);
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

  it('opens the shortcuts sheet on Ctrl+/ and lists every binding', async () => {
    const screen = render(EditPage, postProps());
    const event = new KeyboardEvent('keydown', { key: '/', ctrlKey: true, cancelable: true });
    window.dispatchEvent(event);
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-shortcuts-title"]',
    )!;
    await expect.poll(() => dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    // Spot-check the bindings the task names, plus the closing reassurance and the global palette
    // row that reaches outside the editor.
    expect(text).toContain('Save');
    expect(text).toContain('Ctrl S');
    expect(text).toContain('Publish');
    expect(text).toContain('Ctrl Shift S');
    expect(text).toContain('Undo / redo');
    expect(text).toContain('Ctrl Z / Ctrl Y');
    expect(text).toContain('Fold / unfold');
    expect(text).toContain('Zen');
    expect(text).toContain('This sheet');
    expect(text).toContain('Command palette');
    expect(text).toContain('Ctrl K (global)');
    expect(text).toContain('Typing markdown always works');
    // The sheet renders the single source in full: every row from editor-shortcuts appears.
    for (const row of editorShortcuts) expect(text).toContain(row.label);
  });

  it('dismisses the shortcuts sheet on Escape (native dialog behavior)', async () => {
    const screen = render(EditPage, postProps());
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true, cancelable: true }));
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-shortcuts-title"]',
    )!;
    await expect.poll(() => dialog.open).toBe(true);
    // A native modal <dialog> closes on Escape on its own; the cancel event mirrors that path
    // without depending on the headless harness routing key events into the dialog.
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    dialog.close();
    expect(dialog.open).toBe(false);
  });

  it('lists the same shortcut rows in the Markdown help dialog and documents #### as an H4', async () => {
    const screen = render(EditPage, postProps());
    await screen.getByRole('button', { name: 'Markdown help' }).click();
    const dialog = screen.container.querySelector<HTMLDialogElement>(
      'dialog[aria-labelledby="cairn-markdown-help-title"]',
    )!;
    expect(dialog.open).toBe(true);
    const text = dialog.textContent ?? '';
    // The H4 syntax row Task 1 added.
    expect(text).toContain('#### Heading');
    expect(text).toContain('fourth-level heading');
    // The same single-source shortcut rows render here as in the sheet.
    expect(text).toContain('Keyboard shortcuts');
    for (const row of editorShortcuts) expect(text).toContain(row.label);
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

  it('submits ?/save not ?/publish on Enter in a text field while pending', async () => {
    // Enter in a single-line field triggers the form's implicit submission, which the browser
    // routes through the first associated submit button in tree order. The band precedes the form,
    // so the sr-only default Save submitter (no formaction) is that button, never Publish. A real
    // Enter keypress (not requestSubmit) is the only way to exercise the default-button choice.
    const screen = render(EditPage, postProps({ pending: true, isNew: true }));
    let formaction: string | null = 'unset';
    const stop = (e: SubmitEvent) => {
      e.preventDefault();
      formaction = (e.submitter as HTMLButtonElement | null)?.getAttribute('formaction') ?? null;
    };
    document.addEventListener('submit', stop, true);
    try {
      const titleInput = screen.container.querySelector<HTMLInputElement>('input[name="title"]')!;
      titleInput.focus();
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => formaction).toBeNull();
    } finally {
      document.removeEventListener('submit', stop, true);
    }
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
    const props = { ...postProps({ body: '' }), render: ({ body }: Parameters<SiteRender>[0]) => Promise.resolve(body ? `<p>${body}</p>` : '') };
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
    const slowRender = ({ body }: { body: string }) =>
      new Promise<string>((resolve) => calls.push({ md: body, resolve }));
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

  it('flips Preview back to Write when an invalid control sits in the write pane', async () => {
    // The write pane hides under Preview, so a required control there cannot take the browser's
    // validation report. The capture-phase invalid handler flips back to Write so the report
    // lands on a visible control. The body textarea stands in for that write-pane control: firing
    // a capture-phase invalid from inside #cairn-pane-write must flip the pane.
    const screen = render(EditPage, postProps());
    await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
    await screen.getByRole('tab', { name: 'Preview' }).click();
    await expect.poll(() => screen.container.querySelector('#cairn-pane-preview')).not.toBeNull();
    const body = screen.container.querySelector<HTMLInputElement>('#cairn-pane-write input[name="body"]')!;
    body.dispatchEvent(new Event('invalid', { bubbles: true, cancelable: true }));
    // The aside (the details panel) stays closed; the write-pane arm flips the pane, not the panel.
    await expect.poll(() => screen.container.querySelector('#cairn-pane-preview')).toBeNull();
    expect(screen.container.querySelector('aside')!.hasAttribute('hidden')).toBe(true);
  });

  // Task 9: zen (rung 4). The manuscript alone on the recessed ground. The footer Zen toggle and
  // Ctrl+Shift+. enter and exit; the band, the document title, the toolbar strip, and the footer
  // hide; a floating chip keeps the save state and the way out (the WordPress/Ghost rule).
  describe('zen', () => {
    beforeEach(() => {
      localStorage.removeItem('cairn-editor-zen');
    });

    it('hides the band, title, strip, and footer behind the chip when the footer Zen toggle enters', async () => {
      const screen = render(EditPage, postProps());
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      // Out of zen: the band, the document title, the toolbar strip, and the footer are all up,
      // and there is no chip.
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).not.toBeNull();
      expect(screen.container.querySelector('input.cairn-doc-title')).not.toBeNull();
      expect(screen.container.querySelector('[role="toolbar"]')).not.toBeNull();
      expect(screen.container.querySelector('.cairn-zen-chip')).toBeNull();
      // Enter zen from the footer toggle.
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      // The band element is gone (the harness mirrors the shell's drop, not just an empty band).
      await expect.poll(() => screen.container.querySelector('[data-testid="cairn-band"]')).toBeNull();
      // The document title wrap, the toolbar strip, and the footer strip are hidden; the manuscript
      // (the editing surface) stays.
      expect(screen.container.querySelector('input.cairn-doc-title')).toBeNull();
      expect(screen.container.querySelector('[role="toolbar"]')).toBeNull();
      expect(screen.container.querySelector('.cm-content')).not.toBeNull();
      // The chip carries the save state and an Exit control with the Esc hint.
      const chip = screen.container.querySelector('.cairn-zen-chip')!;
      expect(chip.querySelector('.cairn-save-state')).not.toBeNull();
      const exit = screen.getByRole('button', { name: /exit zen/i });
      await expect.element(exit).toBeInTheDocument();
      expect((await exit.element()).textContent ?? '').toContain('Esc');
    });

    it('enters and exits zen on Ctrl+Shift+.', async () => {
      const screen = render(EditPage, postProps());
      const enter = new KeyboardEvent('keydown', { key: '.', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(true);
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).toBeNull();
      const exit = new KeyboardEvent('keydown', { key: '.', ctrlKey: true, shiftKey: true, cancelable: true });
      window.dispatchEvent(exit);
      expect(exit.defaultPrevented).toBe(true);
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).toBeNull();
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).not.toBeNull();
    });

    it('exits zen on Escape and restores the chrome', async () => {
      const screen = render(EditPage, postProps());
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      const esc = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      window.dispatchEvent(esc);
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).toBeNull();
      // Everything is back: the band, the title, the toolbar strip.
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).not.toBeNull();
      expect(screen.container.querySelector('input.cairn-doc-title')).not.toBeNull();
      expect(screen.container.querySelector('[role="toolbar"]')).not.toBeNull();
    });

    it('exits zen from the chip Exit control', async () => {
      const screen = render(EditPage, postProps());
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      await screen.getByRole('button', { name: /exit zen/i }).click();
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).toBeNull();
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).not.toBeNull();
    });

    it('closes an open details panel before exiting zen (Escape precedence)', async () => {
      const screen = render(EditPage, postProps());
      // Enter zen, then open the details panel; Escape must close the panel first, not exit zen.
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      const aside = screen.container.querySelector('aside')!;
      // Ctrl+. opens the panel even under zen (the panel works inside zen).
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, cancelable: true }));
      await expect.poll(() => aside.hasAttribute('hidden')).toBe(false);
      // First Escape closes the panel; zen stays.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await expect.poll(() => aside.hasAttribute('hidden')).toBe(true);
      expect(screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      // Second Escape exits zen.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).toBeNull();
    });

    it('moves focus into the editor when entering zen hides the focused control', async () => {
      const screen = render(EditPage, postProps());
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      // Focus the footer Markdown help link (a control that hides under zen), then enter zen via
      // the keyboard so focus is on a hiding control at the moment of entry.
      const zen = screen.getByRole('button', { name: 'Zen', exact: true });
      (await zen.element() as HTMLElement).focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, shiftKey: true, cancelable: true }));
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      // Focus is not stranded on a removed node: it lands in the editing surface.
      const content = screen.container.querySelector('.cm-content')!;
      await expect.poll(() => content.contains(document.activeElement)).toBe(true);
    });

    it('relocates focus from a control outside the editor card (the title) into the editor', async () => {
      // The title input is hoisted above the editor card and hides under zen, the same stranding
      // class as a band action (Publish/Save), which lives outside the card too. Entering zen with
      // focus there must move focus into the surface, not leave it on the detached title.
      const screen = render(EditPage, postProps());
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      const title = screen.container.querySelector('input.cairn-doc-title') as HTMLInputElement;
      title.focus();
      expect(document.activeElement).toBe(title);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '.', ctrlKey: true, shiftKey: true, cancelable: true }));
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      const content = screen.container.querySelector('.cm-content')!;
      await expect.poll(() => content.contains(document.activeElement)).toBe(true);
    });

    it('persists the zen preference and re-applies it on mount', async () => {
      const screen = render(EditPage, postProps());
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      expect(localStorage.getItem('cairn-editor-zen')).toBe('true');
      await screen.getByRole('button', { name: /exit zen/i }).click();
      expect(localStorage.getItem('cairn-editor-zen')).toBe('false');
      // A fresh mount with the stored choice arrives in zen.
      localStorage.setItem('cairn-editor-zen', 'true');
      const reborn = render(EditPage, postProps());
      await expect.poll(() => reborn.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      expect(reborn.container.querySelector('[data-testid="cairn-band"]')).toBeNull();
    });

    it('composes with focus mode: both on means chrome gone and machinery dimmed', async () => {
      localStorage.setItem('cairn-editor-focus-mode', 'true');
      const screen = render(EditPage, postProps({ body: 'one\n\ntwo' }));
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      // Focus mode is on: a paragraph away from the mount caret dims.
      await expect.poll(() => screen.container.querySelector('.cm-line.cm-cairn-focus-dim')).not.toBeNull();
      // Enter zen without resetting focus mode: the chrome goes and the dim stays.
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      await expect.poll(() => screen.container.querySelector('.cairn-zen-chip')).not.toBeNull();
      expect(screen.container.querySelector('[data-testid="cairn-band"]')).toBeNull();
      expect(screen.container.querySelector('.cm-line.cm-cairn-focus-dim')).not.toBeNull();
    });

    it('keeps the chip save-state live: dirtying the body flips the dot', async () => {
      const screen = render(EditPage, postProps());
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await screen.getByRole('button', { name: 'Zen', exact: true }).click();
      const chip = () => screen.container.querySelector('.cairn-zen-chip')!;
      await expect.poll(() => chip()).not.toBeNull();
      // Clean: the unsaved warning dot is absent from the chip.
      expect(chip().querySelector('.cairn-save-state .bg-warning')).toBeNull();
      // Type into the editor to dirty the body; the chip's dot appears (the chip reads live dirty).
      const content = screen.container.querySelector<HTMLElement>('.cm-content')!;
      content.focus();
      await userEvent.keyboard('x');
      await expect.poll(() => chip().querySelector('.cairn-save-state .bg-warning')).not.toBeNull();
    });
  });

  describe('the Edit-block round-trip control', () => {
    // A schema-bearing callout: an inline title slot and a required tone select. With no nested
    // slot the grammar uses a three-colon fence. The blocks below are round-trip safe (tone is a
    // declared key) or unsafe (a bogus undeclared attribute key).
    const callout = defineComponent({
      build: () => ({ type: 'element' as const, tagName: 'div', properties: {}, children: [] }),
      name: 'callout',
      label: 'Callout',
      description: 'A note.',
      attributes: { tone: fields.select({ label: 'Tone', required: true, options: ['note'] }) },
      slots: [{ name: 'title', label: 'Title', kind: 'inline', required: true }],
    });
    const calloutRegistry = defineRegistry({ components: [callout] });

    const SAFE_BLOCK = [':::callout[Heads up]{tone="note"}', ':::'].join('\n');
    const UNSAFE_BLOCK = [':::callout[Heads up]{tone="note" bogus="x"}', ':::'].join('\n');

    // The caret reporter fires off the click target's line, so each fixture parks the default
    // mount caret on a leading plain line outside any container.
    function bodyWith(block: string) {
      return ['plain prose', block, 'tail prose'].join('\n');
    }

    function editControl(screen: { container: HTMLElement }) {
      // The Insert and Edit controls share the SquarePen/Blocks glyphs; the Edit control is the
      // one whose aria-label speaks to editing (the label varies by state, so match the verb).
      return screen.container.querySelector<HTMLButtonElement>(
        'button[aria-label*="Edit the component"], button[aria-label*="cursor in a component"], button[aria-label*="edited in the form"]',
      );
    }

    async function clickLine(screen: { container: HTMLElement }, text: string) {
      const line = Array.from(screen.container.querySelectorAll<HTMLElement>('.cm-line')).find((l) =>
        (l.textContent ?? '').includes(text),
      );
      await userEvent.click(line!);
    }

    it('disables Edit block with a plain reason when the caret is not on a component', async () => {
      const screen = render(EditPage, { ...postProps({ body: bodyWith(SAFE_BLOCK) }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await expect.poll(() => editControl(screen)).not.toBeNull();
      const control = editControl(screen)!;
      // Default caret on the leading plain line: outside any container. The control stays focusable
      // and announces its reason through aria-disabled rather than the native disabled attribute, so
      // an assistive-technology user can read why it is unavailable.
      expect(control.getAttribute('aria-disabled')).toBe('true');
      expect(control.disabled).toBe(false);
      expect(control.getAttribute('aria-label')).toBe('Place the cursor in a component to edit it');
      expect(control.getAttribute('title')).toBe('Place the cursor in a component to edit it');
    });

    it('keeps the unavailable Edit block focusable and announced through aria-disabled', async () => {
      const screen = render(EditPage, { ...postProps({ body: bodyWith(SAFE_BLOCK) }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await expect.poll(() => editControl(screen)).not.toBeNull();
      const control = editControl(screen)!;
      // aria-disabled, not the native disabled attribute, so the reason reaches AT and the control
      // is reachable by keyboard. It must take focus.
      expect(control.getAttribute('aria-disabled')).toBe('true');
      expect(control.disabled).toBe(false);
      control.focus();
      expect(document.activeElement).toBe(control);
    });

    it('enables Edit block when the caret sits in a safe component', async () => {
      const screen = render(EditPage, { ...postProps({ body: bodyWith(SAFE_BLOCK) }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await clickLine(screen, ':::callout[Heads up]');
      await expect.poll(() => editControl(screen)?.getAttribute('aria-disabled')).toBe('false');
      expect(editControl(screen)!.getAttribute('aria-label')).toBe('Edit the component at the cursor');
    });

    it('disables Edit block with the unsafe reason on a component the safety check refuses', async () => {
      const screen = render(EditPage, { ...postProps({ body: bodyWith(UNSAFE_BLOCK) }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await clickLine(screen, ':::callout[Heads up]');
      // The block carries an undeclared attribute key, so the gate refuses it. The control stays
      // unavailable (aria-disabled) and the tooltip points the editor at markdown.
      await expect
        .poll(() => editControl(screen)?.getAttribute('aria-label'))
        .toBe("This block can't be edited in the form. Edit it as markdown.");
      expect(editControl(screen)!.getAttribute('aria-disabled')).toBe('true');
      expect(editControl(screen)!.disabled).toBe(false);
    });

    it('resolves editability to whichever component the caret settles on, never a stale in-flight answer', async () => {
      // Two distinct safe blocks with opposite eventual outcomes (A safe, B unsafe), so a wrongly
      // applied answer is unambiguous: if A's slow, stale check ever won, the control would read
      // enabled instead of the unsafe reason. componentRoundTripSafety is mocked so both checks
      // stay pending until the test resolves them out of order (A resolves after B), the worst
      // case for a latest-wins guard that is not keyed to the caret's live identity.
      const SAFE_A = [':::callout[Block A]{tone="note"}', ':::'].join('\n');
      const SAFE_B = [':::callout[Block B]{tone="note" bogus="x"}', ':::'].join('\n');
      const body = ['plain prose', SAFE_A, 'middle prose', SAFE_B, 'tail prose'].join('\n');
      // Two mockImplementationOnce calls, one per expected check; the mock falls back to the real
      // implementation afterward (the same self-restoring shape the tidy-validate mock above
      // uses), so this test never leaves componentRoundTripSafety stubbed for the tests after it.
      const resolvers: Array<(v: RoundTripSafety) => void> = [];
      const pending = () =>
        new Promise<RoundTripSafety>((resolve) => {
          resolvers.push(resolve);
        });
      vi.mocked(componentGrammar.componentRoundTripSafety).mockImplementationOnce(pending).mockImplementationOnce(pending);
      const screen = render(EditPage, { ...postProps({ body }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await clickLine(screen, 'Block A');
      await expect.poll(() => resolvers.length).toBe(1);
      await clickLine(screen, 'Block B');
      await expect.poll(() => resolvers.length).toBe(2);
      // Resolve out of order: B (the caret's real position) first as unsafe, then A (stale) as
      // safe. The stale, later-resolving answer for a block the caret has already left must never
      // override the current position's own outcome.
      resolvers[1]({ safe: false, reason: 'unknown-attribute' });
      await expect
        .poll(() => editControl(screen)?.getAttribute('aria-label'))
        .toBe("This block can't be edited in the form. Edit it as markdown.");
      resolvers[0]({ safe: true });
      expect(editControl(screen)?.getAttribute('aria-label')).toBe(
        "This block can't be edited in the form. Edit it as markdown.",
      );
    });

    it('opens the dialog in edit mode seeded from the parsed block when activated', async () => {
      const screen = render(EditPage, { ...postProps({ body: bodyWith(SAFE_BLOCK) }), registry: calloutRegistry } as never);
      await expect.poll(() => screen.container.querySelector('.cm-content')).not.toBeNull();
      await clickLine(screen, ':::callout[Heads up]');
      await expect.poll(() => editControl(screen)?.getAttribute('aria-disabled')).toBe('false');
      await editControl(screen)!.click();
      // The dialog opens straight to the guided form in edit mode: the primary button reads
      // Update (not Insert) and the Title field is seeded with the parsed label.
      await expect.element(screen.getByRole('button', { name: 'Update', exact: true })).toBeInTheDocument();
      // The inline Title slot, scoped to the dialog (the frontmatter form has its own Title), is
      // seeded with the block's parsed label.
      const titleInput = () => {
        const label = Array.from(
          screen.container.querySelectorAll<HTMLLabelElement>('dialog.modal label'),
        ).find((l) => (l.querySelector('span')?.textContent ?? '').trim().startsWith('Title'));
        return label?.querySelector<HTMLInputElement>('input') ?? null;
      };
      await expect.poll(() => titleInput()?.value).toBe('Heads up');
    });
  });

  describe('tidy (the host action driver)', () => {
    // A tidy-enabled post fixture. The Tidy control renders only when data.tidy.enabled.
    function tidyProps(over = {}) {
      const base = postProps(over);
      base.data.tidy = {
        enabled: true,
        model: 'claude-sonnet-4-6',
        conventions: { fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false },
      };
      return base;
    }
    // Stub globalThis.fetch to return one SvelteKit action-result envelope carrying the corrected text.
    function stubTidyFetch(corrected: string) {
      const spy = vi.fn(async () => ({
        type: 'basic',
        status: 200,
        text: async () =>
          JSON.stringify({
            type: 'success',
            status: 200,
            data: devalueStringify({ corrected, model: 'claude-sonnet-4-6', usage: {} }),
          }),
      }) as unknown as Response);
      vi.stubGlobal('fetch', spy);
      return spy;
    }
    const tidyButton = (screen: { container: Element }) =>
      Array.from(screen.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.getAttribute('aria-label') === 'Tidy',
      );

    it('a no-op (corrected equals the source) shows Nothing to fix and opens no review', async () => {
      const body = 'The body reads clean.';
      stubTidyFetch(body); // the model returned the text unchanged
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      // The quiet no-op confirmation shows; no review dialog ever opens.
      await expect.poll(() => document.querySelector('[data-testid="tidy-noop"]'), { timeout: 8000 }).not.toBeNull();
      expect(document.querySelector('[data-testid="tidy-review"]')).toBeNull();
      // The buffer is unchanged.
      expect(screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value).toBe(body);
      vi.unstubAllGlobals();
    });

    it('a validation rejection shows the honest message and dispatches no transaction', async () => {
      // The corrected result relevels a heading (a restructure), which validateTidy rejects. The host
      // must show the honest message and write nothing.
      const body = '# Title\n\nA paragraph that is fine.';
      stubTidyFetch('## Title\n\nA paragraph that is fine.');
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      await expect.poll(() => document.querySelector('[data-testid="tidy-message"]'), { timeout: 8000 }).not.toBeNull();
      expect(document.querySelector('[data-testid="tidy-message"]')?.textContent).toContain(
        'changed more than the wording',
      );
      // No review opened, and the buffer is byte-identical (no transaction dispatched).
      expect(document.querySelector('[data-testid="tidy-review"]')).toBeNull();
      expect(screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value).toBe(body);
      vi.unstubAllGlobals();
    });

    it('a clean validated result opens the review with the change set', async () => {
      const body = 'We can accomodate the crowd.';
      stubTidyFetch('We can accommodate the crowd.');
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      await expect.poll(() => document.querySelector('[data-testid="tidy-review"]'), { timeout: 8000 }).not.toBeNull();
      expect(document.querySelectorAll('[data-testid="tidy-hunk"]').length).toBeGreaterThan(0);
      // The buffer still holds the original while the review is open (nothing written yet).
      expect(screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value).toBe(body);
      // Close it so the dialog does not leak into the next test.
      const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="tidy-review"] button')).find(
        (b) => b.textContent?.trim() === 'Cancel',
      );
      cancel?.click();
      vi.unstubAllGlobals();
    });

    // Set a native DOM selection over the n-th occurrence of `word` in the editor; CodeMirror's DOM
    // observer reads the selectionchange and syncs it into its own state, which the range seam reports.
    function selectOccurrence(container: Element, word: string, occurrence: number) {
      const content = container.querySelector<HTMLElement>('.cm-content')!;
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      let seen = 0;
      let node: Text | null = null;
      let start = -1;
      while (walker.nextNode()) {
        const text = walker.currentNode as Text;
        let idx = (text.data ?? '').indexOf(word);
        while (idx >= 0) {
          seen += 1;
          if (seen === occurrence) {
            node = text;
            start = idx;
            break;
          }
          idx = text.data.indexOf(word, idx + word.length);
        }
        if (node) break;
      }
      if (!node || start < 0) throw new Error(`occurrence ${occurrence} of ${word} not found`);
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + word.length);
      content.focus();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }

    it('maps a selection tidy onto the selected occurrence, not an identical earlier one', async () => {
      // "colour" repeats; the author selects the SECOND one and tidies it to "color". The corrections
      // must splice over the actually-selected occurrence (the later offset), never the first match.
      const body = 'I like colour. I also like colour very much.';
      stubTidyFetch('color');
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      // CodeMirror renders "colour" verbatim (no syntax markers), so the text node carries both copies.
      await expect.poll(() => screen.container.querySelector('.cm-content')?.textContent ?? '').toContain('colour');
      selectOccurrence(screen.container, 'colour', 2);
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      await expect.poll(() => document.querySelector('[data-testid="tidy-review"]'), { timeout: 8000 }).not.toBeNull();
      // Apply the review's one change in one batched transaction.
      const apply = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="tidy-review"] button')).find(
        (b) => (b.textContent ?? '').trim().startsWith('Apply'),
      );
      apply?.click();
      // Only the SECOND "colour" became "color"; the first is untouched. The wrong-offset bug spliced
      // over the first, producing "I like color. I also like colour very much."
      await expect
        .poll(() => screen.container.querySelector<HTMLInputElement>('input[name="body"]')?.value)
        .toBe('I like colour. I also like color very much.');
      vi.unstubAllGlobals();
    });

    it('opens the no-op status dialog as a true modal (top layer, focus trap)', async () => {
      // A status dialog rendered without showModal() gets no focus trap, no Escape, and leaves the
      // background interactive. Promoting it to the top layer makes it match :modal, the platform cue
      // that the focus trap and Escape are live.
      const body = 'The body reads clean.';
      stubTidyFetch(body);
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      const noop = () => document.querySelector<HTMLDialogElement>('[data-testid="tidy-noop"]');
      await expect.poll(noop, { timeout: 8000 }).not.toBeNull();
      // showModal() puts the dialog in the top layer; it matches :modal only then.
      await expect.poll(() => noop()!.matches(':modal')).toBe(true);
      vi.unstubAllGlobals();
    });

    // Stub globalThis.fetch with a promise the test resolves on its own schedule, so a Cancel click
    // (or the bounded client timeout) can be made to land before the response arrives, modeling the
    // narrow race the abort flag and a fully-received response can hit at the same tick.
    function deferredTidyFetch() {
      let settle!: (value: unknown) => void;
      const pending = new Promise((resolve) => {
        settle = resolve;
      });
      const spy = vi.fn(() => pending as unknown as Promise<Response>);
      vi.stubGlobal('fetch', spy);
      return {
        resolveSuccess(corrected: string) {
          settle({
            type: 'basic',
            status: 200,
            text: async () =>
              JSON.stringify({
                type: 'success',
                status: 200,
                data: devalueStringify({ corrected, model: 'claude-sonnet-4-6', usage: {} }),
              }),
          } as unknown as Response);
        },
      };
    }

    it('opens the review with a response that arrives after Cancel, not silently', async () => {
      // A real fetch would already have rejected once truly aborted; this mock does not honor the
      // AbortSignal, modeling the narrow race the client timeout or a fast Cancel can hit exactly as
      // the body finishes arriving. A response the caller actually received must still be shown,
      // independent of whether the abort flag happened to flip first.
      const body = 'We can accomodate the crowd.';
      const deferred = deferredTidyFetch();
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      const working = () => document.querySelector<HTMLDialogElement>('[data-testid="tidy-working"]');
      await expect.poll(working, { timeout: 8000 }).not.toBeNull();
      const cancel = Array.from(working()!.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.trim() === 'Cancel',
      );
      if (!cancel) throw new Error('cancel button not found');
      cancel.click();
      // <dialog>'s close event fires on a queued task, not synchronously; wait for the dialog to
      // actually leave the DOM (cancelTidy having run and aborted the controller) before letting the
      // response land, so the abort genuinely precedes the response the way a real race would.
      await expect.poll(working, { timeout: 8000 }).toBeNull();
      deferred.resolveSuccess('We can accommodate the crowd.');
      await expect.poll(() => document.querySelector('[data-testid="tidy-review"]'), { timeout: 8000 }).not.toBeNull();
      const cancelReview = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-testid="tidy-review"] button'),
      ).find((b) => b.textContent?.trim() === 'Cancel');
      cancelReview?.click();
      vi.unstubAllGlobals();
    });

    it('a throw while processing a successful result shows the retry message, not a crash', async () => {
      // validateTidy throws once (a parse failure unrelated to the network); the try/finally in
      // runTidy must still catch it and surface the generic retry message rather than letting the
      // rejection propagate unhandled out of the untracked onclick call.
      const body = 'We can accomodate the crowd.';
      stubTidyFetch('We can accommodate the crowd.');
      vi.mocked(tidyValidateModule.validateTidy).mockImplementationOnce(() => {
        throw new Error('boom');
      });
      const screen = render(EditPage, tidyProps({ body }) as never);
      await expect.poll(() => screen.container.querySelector('.cm-content'), { timeout: 20000 }).not.toBeNull();
      await expect.poll(() => tidyButton(screen)).toBeTruthy();
      tidyButton(screen)!.click();
      await expect.poll(() => document.querySelector('[data-testid="tidy-message"]'), { timeout: 8000 }).not.toBeNull();
      expect(document.querySelector('[data-testid="tidy-message"]')?.textContent).toContain(
        'Tidy could not finish. Try again.',
      );
      expect(document.querySelector('[data-testid="tidy-review"]')).toBeNull();
      vi.unstubAllGlobals();
    });
  });
});
